import React from 'react';
import { CalendarDays, CalendarX2, MousePointerClick, Laptop, Ban, Check } from 'lucide-react';
import { DateObject } from 'react-multi-date-picker';
import arabic from 'react-date-object/calendars/arabic';
import arabic_ar from 'react-date-object/locales/arabic_ar';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_ar from 'react-date-object/locales/gregorian_ar';
import { SchoolInfo, DutySettings, SemesterInfo } from '../../types';
import { getDutyDayStatus } from '../../utils/dutyUtils';

// عرض التاريخ بصيغة عربية صحيحة: اليوم على اليمين ثم الشهر (مطابق للتقويم)
const DM: React.FC<{ dateObj: any }> = ({ dateObj }) => {
  if (!dateObj) return <span>—</span>;
  return (
    <span dir="rtl" className="inline-flex items-center">
      <span>{dateObj.format('D')}</span>
      <span className="mx-0.5">/</span>
      <span>{dateObj.format('M')}</span>
    </span>
  );
};

const DateRange: React.FC<{ first: any; last: any }> = ({ first, last }) => (
  <span dir="rtl" className="inline-flex items-center gap-1">
    <DM dateObj={first} />
    <span className="opacity-50">-</span>
    <DM dateObj={last} />
  </span>
);

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS: Record<string, string> = {
  sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء',
  thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت',
};

interface DutyWeekDay {
  date: string;
  dateObj: any;
  isWorkingDay: boolean;
  isHoliday: boolean;
  dayOfWeek: number;
  dayKey: string;
  label: string;
}
interface DutyWeek { weekNumber: number; days: DutyWeekDay[]; }

interface Props {
  settings: DutySettings;
  setSettings: (s: DutySettings | ((prev: DutySettings) => DutySettings)) => void;
  schoolInfo: SchoolInfo;
  currentSemester?: Partial<SemesterInfo>;
}

const DutyWeeksCard: React.FC<Props> = ({ settings, setSettings, schoolInfo, currentSemester }) => {
  // صيغة العرض الموحّدة = مرتكز الرئيسية schoolInfo.calendarType (التواريخ المخزّنة ميلادية، والتبديل عرضٌ فقط)
  const calendarType: 'hijri' | 'gregorian' =
    schoolInfo.calendarType || (currentSemester?.calendarType as any) || 'gregorian';

  // كائن تاريخ بصيغة التقويم المختار — لعرض رقم اليوم/رقم الشهر
  const toDateObj = (s?: string): any => {
    if (!s) return null;
    const d = new Date(s.includes('T') ? s : s + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    return new DateObject({
      date: d,
      calendar: calendarType === 'hijri' ? arabic : gregorian,
      locale: calendarType === 'hijri' ? arabic_ar : gregorian_ar,
    });
  };

  // بناء الأسابيع بكائنات التاريخ والإجازات — بنفس منطق التقويم
  const weeks = React.useMemo<DutyWeek[]>(() => {
    if (!currentSemester?.startDate || !currentSemester?.endDate) return [];
    const start = new Date(currentSemester.startDate.includes('T') ? currentSemester.startDate : currentSemester.startDate + 'T00:00:00');
    const end = new Date(currentSemester.endDate.includes('T') ? currentSemester.endDate : currentSemester.endDate + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

    const workStart = currentSemester.workDaysStart ?? 0;
    const workEnd = currentSemester.workDaysEnd ?? 4;
    const holidays = currentSemester.holidays || [];
    const cal = calendarType === 'hijri' ? arabic : gregorian;
    const loc = calendarType === 'hijri' ? arabic_ar : gregorian_ar;

    const result: DutyWeek[] = [];
    let weekNumber = 1;
    let currentWeekDays: DutyWeekDay[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.getFullYear() + '-' + String(current.getMonth() + 1).padStart(2, '0') + '-' + String(current.getDate()).padStart(2, '0');
      const dateObj = new DateObject({ date: current, calendar: cal, locale: loc });
      const dayOfWeek = current.getDay();
      const isWorkingDay = workStart <= workEnd
        ? dayOfWeek >= workStart && dayOfWeek <= workEnd
        : dayOfWeek >= workStart || dayOfWeek <= workEnd;
      const isHoliday = holidays.includes(dateStr);
      const dayKey = DAY_KEYS[dayOfWeek];

      if (currentWeekDays.length > 0 && dayOfWeek === workStart) {
        result.push({ weekNumber: weekNumber++, days: currentWeekDays });
        currentWeekDays = [];
      }
      currentWeekDays.push({ date: dateStr, dateObj, isWorkingDay, isHoliday, dayOfWeek, dayKey, label: DAY_LABELS[dayKey] || '' });
      current.setDate(current.getDate() + 1);
    }
    if (currentWeekDays.length > 0) result.push({ weekNumber, days: currentWeekDays });
    return result.filter(w => w.days.some(d => d.isWorkingDay));
  }, [currentSemester, calendarType]);

  // أيام العمل الأسبوعية (لمحرّر المدمج)
  const workingDayKeys = React.useMemo<string[]>(() => {
    const seen = new Set<string>();
    const keys: string[] = [];
    weeks.forEach(w => w.days.forEach(d => {
      if (d.isWorkingDay && !seen.has(d.dayKey)) { seen.add(d.dayKey); keys.push(d.dayKey); }
    }));
    keys.sort((a, b) => DAY_KEYS.indexOf(a) - DAY_KEYS.indexOf(b));
    return keys.length ? keys : ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
  }, [weeks]);

  const allWeekNumbers = weeks.map(w => w.weekNumber);
  const selectedWeeks = settings.selectedWeeks ?? allWeekNumbers;
  const isWeekEnabled = (n: number) => selectedWeeks.includes(n);

  // ===== إجراءات =====
  const toggleWeek = (n: number) => {
    setSettings(prev => {
      const cur = prev.selectedWeeks ?? allWeekNumbers;
      const next = cur.includes(n) ? cur.filter(x => x !== n) : [...cur, n].sort((a, b) => a - b);
      return { ...prev, selectedWeeks: next };
    });
  };

  const toggleDay = (day: DutyWeekDay, weekNumber: number) => {
    if (day.isHoliday) return; // الإجازة الرسمية معتمدة ولا تُمَس
    setSettings(prev => {
      const overrides = { ...(prev.dutyDayOverrides || {}) };
      const status = getDutyDayStatus(prev, weekNumber, day.dayKey, day.date, false);
      const base = prev.dutyHybridEnabled
        ? ((weekNumber % 2 === 1 ? prev.dutyHybridWeekARemote : prev.dutyHybridWeekBRemote) || []).includes(day.dayKey)
        : false;
      if (status === 'active') {
        if (base) delete overrides[day.date]; else overrides[day.date] = 'off';
      } else if (status === 'remote') {
        overrides[day.date] = 'duty';
      } else if (status === 'disabled') {
        delete overrides[day.date];
      }
      return { ...prev, dutyDayOverrides: overrides };
    });
  };

  const toggleHybrid = () => {
    setSettings(prev => ({
      ...prev,
      dutyHybridEnabled: !prev.dutyHybridEnabled,
      dutyHybridWeekARemote: prev.dutyHybridWeekARemote ?? [],
      dutyHybridWeekBRemote: prev.dutyHybridWeekBRemote ?? [],
    }));
  };

  const toggleHybridDay = (which: 'A' | 'B', dayKey: string) => {
    setSettings(prev => {
      const key = which === 'A' ? 'dutyHybridWeekARemote' : 'dutyHybridWeekBRemote';
      const cur = (prev[key] as string[] | undefined) || [];
      const next = cur.includes(dayKey) ? cur.filter(d => d !== dayKey) : [...cur, dayKey];
      return { ...prev, [key]: next };
    });
  };

  // ===== إحصاءات =====
  const stats = React.useMemo(() => {
    let holidayDays = 0, offDays = 0, dutyDays = 0;
    weeks.forEach(w => {
      if (!isWeekEnabled(w.weekNumber)) return;
      w.days.forEach(d => {
        if (!d.isWorkingDay) return;
        const st = getDutyDayStatus(settings, w.weekNumber, d.dayKey, d.date, d.isHoliday);
        if (st === 'holiday') holidayDays++;
        else if (st === 'remote' || st === 'disabled') offDays++;
        else dutyDays++;
      });
    });
    return { holidayDays, offDays, dutyDays, totalWeeks: weeks.length, activeWeeks: selectedWeeks.filter(n => allWeekNumbers.includes(n)).length };
  }, [weeks, settings, selectedWeeks]);

  if (weeks.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* ====== محرّر التعليم المدمج ====== */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Laptop size={22} className="text-[#655ac1] shrink-0" strokeWidth={1.9} />
            <div>
              <h4 className="font-black text-slate-800 text-sm">تعليم مدمج (حضوري + عن بُعد)</h4>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">حدّد أيام «عن بُعد» في الأسبوعين، وتُطبّق تبادلياً على الفصل.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleHybrid}
            role="switch"
            aria-checked={!!settings.dutyHybridEnabled}
            className={`relative h-6 w-11 rounded-full transition-colors duration-300 shrink-0 ${settings.dutyHybridEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ${settings.dutyHybridEnabled ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        {settings.dutyHybridEnabled && (
          <div className="border-t border-slate-100 px-4 py-4 space-y-3">
            {([['A', 'الأسبوع الأول'], ['B', 'الأسبوع الثاني']] as const).map(([which, title]) => {
              const remote = (which === 'A' ? settings.dutyHybridWeekARemote : settings.dutyHybridWeekBRemote) || [];
              return (
                <div key={which} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-black text-slate-700 mb-2.5">{title}</p>
                  <div className="flex flex-wrap gap-2">
                    {workingDayKeys.map(dk => {
                      const isRemote = remote.includes(dk);
                      return (
                        <button
                          key={dk}
                          type="button"
                          onClick={() => toggleHybridDay(which, dk)}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black bg-white border transition-all ${
                            isRemote ? 'border-[#655ac1]/50' : 'border-slate-300'
                          }`}
                        >
                          {isRemote ? (
                            <Laptop size={14} className="text-[#655ac1]" />
                          ) : (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white">
                              <Check size={10} strokeWidth={3.5} />
                            </span>
                          )}
                          <span className={isRemote ? 'text-[#655ac1]' : 'text-emerald-600'}>
                            {DAY_LABELS[dk]} - {isRemote ? 'عن بُعد' : 'حضور'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====== بطاقة الأسابيع الدراسية — مطابقة لتصميم التقويم ====== */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* العنوان */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
          <CalendarDays size={20} className="text-[#655ac1] shrink-0" />
          <div>
            <h4 className="font-black text-slate-800 text-sm">عرض الأسابيع الدراسية</h4>
            {currentSemester?.name && (
              <p className="text-xs font-black text-[#655ac1] mt-0.5">{currentSemester.name}</p>
            )}
          </div>
        </div>

        {/* شريط المعلومات: تواريخ الفصل + الإحصاءات */}
        <div className="px-5 pt-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 py-2.5 border border-slate-200 rounded-xl">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />بداية الفصل: <DM dateObj={toDateObj(currentSemester?.startDate)} />
            </span>
            <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />نهاية الفصل: <DM dateObj={toDateObj(currentSemester?.endDate)} />
            </span>
            <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-[#655ac1] inline-block" />{stats.activeWeeks} من {stats.totalWeeks} أسبوع
            </span>
            <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />أيام المناوبة: {stats.dutyDays} يوم
            </span>
            <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-indigo-300 inline-block" />عن بُعد / بدون مناوبة: {stats.offDays}
            </span>
            <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />إجازة رسمية: {stats.holidayDays}
            </span>
          </div>
        </div>

        {/* الدلالات */}
        <div className="px-5 pt-3 pb-1 flex justify-center">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[13px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <span className="flex items-center gap-1.5"><MousePointerClick size={15} className="text-amber-600 shrink-0" /> نقرة على اليوم = تعطيله من المناوبة</span>
            <span className="w-px h-4 bg-amber-200 hidden sm:block" />
            <span className="flex items-center gap-1.5"><CalendarX2 size={15} className="text-amber-600 shrink-0" /> نقرة على الزر = تعطيل الأسبوع</span>
          </div>
        </div>

        {/* الجدول: كل أسبوع في صف، وأيامه بجانبه في سطر واحد */}
        <div className="px-3 pb-3 divide-y divide-slate-100">
          {weeks.map((week, idx) => {
            const weekActiveDays = week.days.filter(d => d.isWorkingDay);
            const firstDay = weekActiveDays[0];
            const lastDay = weekActiveDays[weekActiveDays.length - 1];
            const weekOff = !isWeekEnabled(week.weekNumber);
            if (!firstDay) return null;
            return (
              <div key={idx} className={`flex items-stretch py-3 px-2 -mx-2 rounded-xl ${weekOff ? 'bg-slate-50/70' : ''}`}>
                {/* العمود الأول: الأسبوع + التاريخ + زر تعطيل الأسبوع */}
                <div className="w-[120px] shrink-0 pl-3 flex flex-col justify-center gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-black text-slate-900 leading-tight">الأسبوع {week.weekNumber}</p>
                      {weekOff && <span className="text-[9px] font-black text-slate-500 bg-slate-200 rounded px-1.5 py-0.5 leading-none">معطّل</span>}
                    </div>
                    <p className="text-[13px] font-black text-[#655ac1] leading-tight mt-1">
                      <DateRange first={firstDay.dateObj} last={lastDay.dateObj} />
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleWeek(week.weekNumber)}
                    className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      weekOff
                        ? 'border-[#655ac1]/30 bg-white text-[#655ac1] hover:bg-[#f0edff]'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    <CalendarX2 size={13} className="shrink-0" />
                    {weekOff ? 'تفعيل الأسبوع' : 'تعطيل الأسبوع'}
                  </button>
                </div>
                {/* فاصل */}
                <div className="w-px self-stretch bg-slate-200 mx-3" />
                {/* العمود الثاني: أيام الأسبوع في سطر واحد */}
                <div className="flex-1 flex items-stretch gap-2 min-w-0">
                  {weekActiveDays.map(day => {
                    const status = getDutyDayStatus(settings, week.weekNumber, day.dayKey, day.date, day.isHoliday);
                    const muted = weekOff;
                    const style =
                      status === 'holiday' ? 'border-rose-200 bg-white'
                      : status === 'remote' ? 'border-[#655ac1]/50 bg-white'
                      : status === 'disabled' ? 'border-slate-300 bg-white'
                      : 'border-slate-200 bg-white hover:border-[#655ac1]/40 hover:bg-slate-50';
                    return (
                      <button
                        key={day.date}
                        type="button"
                        disabled={status === 'holiday'}
                        onClick={() => toggleDay(day, week.weekNumber)}
                        className={`relative flex-1 min-w-0 rounded-xl border p-2 min-h-[60px] flex flex-col items-center justify-center gap-1 transition-all select-none ${style} ${muted ? 'opacity-50' : ''} ${status === 'holiday' ? 'cursor-default' : ''}`}
                      >
                        {status === 'holiday' && (
                          <span className="absolute top-1 left-1 text-[10px] font-black text-rose-600 bg-rose-100 rounded-md px-1.5 py-0.5 leading-none">إجازة</span>
                        )}
                        {status === 'remote' && (
                          <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 text-[10px] font-black text-[#655ac1] bg-[#e5e1fe] rounded-md px-1.5 py-0.5 leading-none"><Laptop size={9} /> عن بُعد</span>
                        )}
                        {status === 'disabled' && (
                          <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 text-[10px] font-black text-slate-500 bg-slate-200 rounded-md px-1.5 py-0.5 leading-none"><Ban size={9} /> بدون مناوبة</span>
                        )}
                        <p className="text-[12px] font-black text-slate-700 leading-tight truncate w-full text-center">{day.label}</p>
                        <p className="text-[11px] font-black text-[#655ac1] leading-tight"><DM dateObj={day.dateObj} /></p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DutyWeeksCard;
