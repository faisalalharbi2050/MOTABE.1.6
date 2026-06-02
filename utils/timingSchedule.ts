import { TimingConfig } from '../types';

/**
 * حساب أوقات اليوم الدراسي (اصطفاف/حصص/فسح/صلوات) من إعدادات التوقيت،
 * واكتشاف الحصة الحالية وفق ساعة الجهاز.
 *
 * منطق الحساب منسوخ بأمانة من TimingSettings.calculateSchedule حتى يبقى
 * مصدرًا موحّدًا لـ"متابعة الفصول الآن" دون المساس بصفحة التوقيت.
 */

export interface TimingScheduleItem {
  id: string;
  type: 'assembly' | 'period' | 'break' | 'prayer';
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  originalIndex?: number;
  relatedPeriodIndex: number;
}

const ORDINALS = [
  'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة',
  'الثامنة', 'التاسعة', 'العاشرة', 'الحادية عشر', 'الثانية عشر',
];

export const getOrdinal = (n: number): string => ORDINALS[n - 1] || n.toString();

export const addMinutes = (time: string, minutes: number): string => {
  if (!time) return '00:00';
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setMinutes(date.getMinutes() + minutes);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/** يبني قائمة عناصر اليوم الدراسي بأوقات بداية/نهاية لكل عنصر. */
export const computeTimingSchedule = (timing?: TimingConfig): TimingScheduleItem[] => {
  if (!timing) return [];
  const items: TimingScheduleItem[] = [];

  let currentTime = timing.assemblyTime || '06:45';
  const getStartTime = (id: string, defaultTime: string) =>
    timing.customStartTimes?.[id] || defaultTime;

  const periodValues = Object.values(timing.periodCounts || {});
  const maxPeriods = periodValues.length ? Math.max(...periodValues) : 7;

  // الاصطفاف
  if (timing.hasAssembly) {
    const id = 'assembly';
    const startTime = getStartTime(id, currentTime);
    const duration = 15;
    const endTime = addMinutes(startTime, duration);
    items.push({ id, type: 'assembly', name: 'الاصطفاف', startTime, endTime, duration, relatedPeriodIndex: 0 });
    currentTime = endTime;
  }

  for (let i = 1; i <= maxPeriods; i++) {
    // الفسح قبل الحصة
    const breaksBefore = (timing.breaks || []).filter(b => b.afterPeriod === i - 1);
    breaksBefore.forEach(b => {
      const id = `break-${b.id}`;
      const startTime = getStartTime(id, currentTime);
      const duration = b.duration;
      const endTime = addMinutes(startTime, duration);
      items.push({ id, type: 'break', name: b.name, startTime, endTime, duration, originalIndex: timing.breaks!.indexOf(b), relatedPeriodIndex: i - 1 });
      currentTime = endTime;
    });

    // الصلوات قبل الحصة
    const prayersBefore = (timing.prayers || []).filter(p => p.isEnabled && p.afterPeriod === i - 1);
    prayersBefore.forEach(p => {
      const id = `prayer-${p.id}`;
      const startTime = getStartTime(id, currentTime);
      const duration = p.duration;
      const endTime = addMinutes(startTime, duration);
      items.push({ id, type: 'prayer', name: p.name, startTime, endTime, duration, originalIndex: timing.prayers?.indexOf(p), relatedPeriodIndex: i - 1 });
      currentTime = endTime;
    });

    // الحصة
    const id = `period-${i}`;
    const startTime = getStartTime(id, currentTime);
    const duration = timing.customDurations?.[i] || timing.periodDuration || 45;
    const endTime = addMinutes(startTime, duration);
    const customName = timing.customPeriodNames?.[i];
    items.push({
      id,
      type: 'period',
      name: customName || `الحصة ${getOrdinal(i)}`,
      startTime,
      endTime,
      duration,
      originalIndex: i,
      relatedPeriodIndex: i,
    });
    currentTime = endTime;
  }

  // الفسح/الصلوات الأخيرة
  const breaksAfter = (timing.breaks || []).filter(b => b.afterPeriod >= maxPeriods);
  breaksAfter.forEach(b => {
    const id = `break-${b.id}`;
    const startTime = getStartTime(id, currentTime);
    const duration = b.duration;
    const endTime = addMinutes(startTime, duration);
    items.push({ id, type: 'break', name: b.name, startTime, endTime, duration, originalIndex: timing.breaks!.indexOf(b), relatedPeriodIndex: maxPeriods });
    currentTime = endTime;
  });

  const prayersAfter = (timing.prayers || []).filter(p => p.isEnabled && p.afterPeriod >= maxPeriods);
  prayersAfter.forEach(p => {
    const id = `prayer-${p.id}`;
    const startTime = getStartTime(id, currentTime);
    const duration = p.duration;
    const endTime = addMinutes(startTime, duration);
    items.push({ id, type: 'prayer', name: p.name, startTime, endTime, duration, originalIndex: timing.prayers?.indexOf(p), relatedPeriodIndex: maxPeriods });
    currentTime = endTime;
  });

  return items;
};

export type CurrentPeriodStatus = 'before' | 'period' | 'break' | 'prayer' | 'assembly' | 'after' | 'none';

export interface CurrentPeriodResult {
  status: CurrentPeriodStatus;
  /** رقم الحصة الحالية إن كنا داخل حصة، وإلا null. */
  periodIndex: number | null;
  /** العنصر الجاري حاليًا (حصة/فسحة/صلاة/اصطفاف) إن وُجد. */
  item: TimingScheduleItem | null;
}

/** يكتشف ما يجري الآن وفق ساعة الجهاز ضمن إعدادات التوقيت المعطاة. */
export const detectCurrentPeriod = (
  timing: TimingConfig | undefined,
  now: Date = new Date(),
): CurrentPeriodResult => {
  const schedule = computeTimingSchedule(timing);
  if (schedule.length === 0) return { status: 'none', periodIndex: null, item: null };

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const first = schedule[0];
  const last = schedule[schedule.length - 1];

  if (nowMin < timeToMinutes(first.startTime)) return { status: 'before', periodIndex: null, item: null };
  if (nowMin >= timeToMinutes(last.endTime)) return { status: 'after', periodIndex: null, item: null };

  for (const item of schedule) {
    if (nowMin >= timeToMinutes(item.startTime) && nowMin < timeToMinutes(item.endTime)) {
      if (item.type === 'period') {
        return { status: 'period', periodIndex: item.originalIndex ?? null, item };
      }
      return { status: item.type, periodIndex: null, item } as CurrentPeriodResult;
    }
  }

  // بين عنصرين (فجوة غير معرّفة) — نعدّها "لا شيء جارٍ"
  return { status: 'none', periodIndex: null, item: null };
};

/** أرقام الحصص المتاحة وفق إعدادات التوقيت (للقائمة اليدوية). */
export const getPeriodNumbers = (timing?: TimingConfig): number[] =>
  computeTimingSchedule(timing)
    .filter(item => item.type === 'period')
    .map(item => item.originalIndex!)
    .sort((a, b) => a - b);
