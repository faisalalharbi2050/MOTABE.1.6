import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGrid, Search, ChevronDown, Check, School, Building2, Radio, UserX } from 'lucide-react';
import { SchoolInfo, ClassInfo, Teacher, Subject, TimetableData, TimetableSlot } from '../../types';
import { detectCurrentPeriod, getPeriodNumbers, getOrdinal } from '../../utils/timingSchedule';
import { getClassLabel } from '../../utils/classLabels';

interface ClassMonitorNowProps {
  schoolInfo: SchoolInfo;
  classes: ClassInfo[];
  teachers: Teacher[];
  subjects: Subject[];
  timetable: TimetableData;
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAY_LABELS: Record<string, string> = {
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
};

interface DropdownOption {
  value: string;
  label: string;
}

/**
 * قائمة منسدلة بنفس تصميم اختيار الكيان (دائرة + علامة صح معتمدة).
 * تُرسم القائمة عبر بوابة (portal) بموضع ثابت حتى لا تقصّها حدود البطاقة.
 */
const CheckDropdown: React.FC<{
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  minWidthClass?: string;
  accentOptions?: boolean;
}> = ({ value, options, onChange, minWidthClass = 'min-w-[110px]', accentOptions = false }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 150) });
  };

  useEffect(() => {
    if (!open) return;
    updateCoords();
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = () => updateCoords();
    document.addEventListener('mousedown', onClick);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const selected = options.find(o => o.value === value);
  return (
    <div className={`relative ${minWidthClass}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 text-xs"
      >
        <span className="truncate leading-tight">{selected?.label || ''}</span>
        <ChevronDown size={14} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && coords && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width, zIndex: 9999 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 animate-in slide-in-from-top-2"
        >
          <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-right px-2.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-between ${
                  value === opt.value
                    ? 'bg-white text-[#655ac1]'
                    : accentOptions
                      ? 'text-[#655ac1] hover:bg-[#f0edff]'
                      : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full border-2 transition-all shrink-0 ${
                  value === opt.value ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                }`}>
                  <Check size={10} strokeWidth={3.5} />
                </span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const ClassMonitorNow: React.FC<ClassMonitorNowProps> = ({ schoolInfo, classes, teachers, subjects, timetable }) => {
  const hasShared = (schoolInfo.sharedSchools?.length || 0) > 0;
  const [activeSchoolId, setActiveSchoolId] = useState<string>('main');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [followLive, setFollowLive] = useState(true);

  // تحديث كل دقيقة لمتابعة الحصة الحالية حيًّا
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const now = useMemo(() => new Date(), [tick]);
  const todayKey = DAY_KEYS[now.getDay()];

  const [selectedDay, setSelectedDay] = useState<string>(todayKey);

  // توقيت المدرسة الفعّالة (يحترم التوقيت الموحّد/المستقل للمدارس المشتركة)
  const activeTiming = useMemo(() => {
    if (activeSchoolId === 'main') return schoolInfo.timing;
    const shared = schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId);
    return shared?.timing || schoolInfo.timing;
  }, [activeSchoolId, schoolInfo]);

  const activeDays = activeTiming?.activeDays?.length
    ? activeTiming.activeDays
    : ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

  // الحصة الحالية المكتشفة من ساعة الجهاز
  const live = useMemo(() => detectCurrentPeriod(activeTiming, now), [activeTiming, now]);

  // أرقام الحصص المتاحة (من التوقيت، أو من الجدول نفسه إن لم يُضبط التوقيت)
  const maxPeriodInTimetable = useMemo(() => {
    let mx = 0;
    Object.keys(timetable).forEach(key => {
      const m = key.match(/-(\d+)$/);
      if (m) mx = Math.max(mx, Number(m[1]));
    });
    return mx;
  }, [timetable]);

  const periodNumbers = useMemo(() => {
    const fromTiming = getPeriodNumbers(activeTiming);
    if (fromTiming.length) return fromTiming;
    const max = Math.max(maxPeriodInTimetable, 7);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [activeTiming, maxPeriodInTimetable]);

  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);

  // المتابعة الحيّة: تختار الحصة الحالية تلقائيًا ما لم يتدخّل المستخدم
  useEffect(() => {
    if (followLive && selectedDay === todayKey && live.periodIndex) {
      setSelectedPeriod(live.periodIndex);
    }
  }, [followLive, live.periodIndex, selectedDay, todayKey]);

  const jumpToNow = () => {
    setSelectedDay(todayKey);
    setFollowLive(true);
    if (live.periodIndex) setSelectedPeriod(live.periodIndex);
  };

  // فصول المدرسة الفعّالة (فصول فعلية فقط - تُستبعد المرافق)
  const schoolClasses = useMemo(
    () =>
      classes
        .filter(c => !c.type || c.type === 'class')
        .filter(c => c.schoolId === activeSchoolId || (!c.schoolId && activeSchoolId === 'main'))
        .sort((a, b) => (a.grade !== b.grade ? a.grade - b.grade : (a.section || 0) - (b.section || 0))),
    [classes, activeSchoolId]
  );

  // عكس الجدول: من (الفصل + اليوم + الحصة) إلى الحصة الدراسية المسندة
  const slotByClass = useMemo(() => {
    const lessons = new Map<string, TimetableSlot>();
    const covers = new Map<string, TimetableSlot>();
    const suffix = `-${selectedDay}-${selectedPeriod}`;
    Object.entries(timetable).forEach(([key, slot]) => {
      if (!slot.classId || !key.endsWith(suffix)) return;
      if (slot.type === 'waiting' || slot.isSubstitution) {
        covers.set(slot.classId, slot);
      } else {
        lessons.set(slot.classId, slot);
      }
    });
    return { lessons, covers };
  }, [timetable, selectedDay, selectedPeriod]);

  const teacherName = (id?: string) => {
    if (!id) return '';
    const t = teachers.find(x => x.id === id);
    return t ? (t.shortName || t.name) : '';
  };
  const subjectName = (id?: string) => {
    if (!id) return '';
    return subjects.find(x => x.id === id)?.name || '';
  };

  // تسميات الصفوف المخصّصة (نفس مصدر صفحة الفصول)
  const gradeLabelMap = useMemo<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('classSetup_gradeLabelMap') || '{}');
    } catch {
      return {};
    }
  }, []);

  // تجميع حسب الصف + تطبيق البحث
  const groups = useMemo(() => {
    const q = teacherSearch.trim();
    const map = new Map<string, { label: string; items: ClassInfo[] }>();
    schoolClasses.forEach(c => {
      const teacher = teacherName(slotByClass.lessons.get(c.id)?.teacherId || slotByClass.covers.get(c.id)?.teacherId);
      if (selectedClassId && c.id !== selectedClassId) return;
      if (q && !teacher.includes(q)) return;
      const key = `${c.phase}-${c.grade}`;
      const groupLabel = gradeLabelMap[`${c.phase}-${c.grade}`] || `الصف ${c.grade}`;
      if (!map.has(key)) map.set(key, { label: groupLabel, items: [] });
      map.get(key)!.items.push(c);
    });
    return Array.from(map.values());
  }, [schoolClasses, slotByClass, teacherSearch, selectedClassId, gradeLabelMap, teachers]);

  const totalShown = groups.reduce((sum, g) => sum + g.items.length, 0);

  // خيارات القوائم المنسدلة
  const dayOptions = useMemo<DropdownOption[]>(
    () => DAY_KEYS.filter(d => activeDays.includes(d) || d === selectedDay).map(d => ({ value: d, label: DAY_LABELS[d] })),
    [activeDays, selectedDay]
  );
  const periodOptions = useMemo<DropdownOption[]>(
    () => periodNumbers.map(p => ({ value: String(p), label: `الحصة ${getOrdinal(p)}` })),
    [periodNumbers]
  );
  const classOptions = useMemo<DropdownOption[]>(
    () => [{ value: '', label: 'كل الفصول' }, ...schoolClasses.map(c => ({ value: c.id, label: getClassLabel(c) }))],
    [schoolClasses]
  );

  // نص حالة الشريط العلوي
  const liveBanner = (() => {
    if (selectedDay !== todayKey) return { text: `تعرض يوم ${DAY_LABELS[selectedDay]}`, tone: 'muted' as const };
    if (!activeDays.includes(todayKey)) return { text: 'اليوم إجازة نهاية الأسبوع', tone: 'muted' as const };
    switch (live.status) {
      case 'period':
        return { text: `الآن: الحصة ${getOrdinal(live.periodIndex || 0)}`, tone: 'live' as const };
      case 'break':
      case 'prayer':
      case 'assembly':
        return { text: `الآن: ${live.item?.name || ''}`, tone: 'muted' as const };
      case 'before':
        return { text: 'لم يبدأ الدوام بعد', tone: 'muted' as const };
      case 'after':
        return { text: 'انتهى الدوام الدراسي', tone: 'muted' as const };
      default:
        return { text: 'لم يُضبط التوقيت — اختر الحصة يدويًا', tone: 'muted' as const };
    }
  })();

  const isLiveNow = selectedDay === todayKey && followLive && live.status === 'period' && live.periodIndex === selectedPeriod;

  return (
    <div className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col min-h-[360px] lg:h-full text-right hover:shadow-md transition-shadow" dir="rtl">
      {/* رأس البطاقة */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <LayoutGrid size={20} strokeWidth={1.8} className="text-[#8779fb] shrink-0" />
          <h3 className="font-bold text-slate-700 text-lg truncate">الفصول</h3>
        </div>
        <button
          onClick={jumpToNow}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all shrink-0 ${
            isLiveNow
              ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-sm shadow-[#655ac1]/20'
              : 'bg-white text-[#655ac1] border-slate-200 hover:border-[#cfc8ff]'
          }`}
          title="العودة إلى الحصة الحالية"
        >
          <Radio size={13} strokeWidth={2.5} />
          الآن
        </button>
      </div>

      {/* مبدّل المدرسة (للمدارس المشتركة فقط) */}
      {hasShared && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[{ id: 'main', name: schoolInfo.schoolName || 'المدرسة الأساسية', icon: School }, ...(schoolInfo.sharedSchools || []).map(s => ({ id: s.id, name: s.name, icon: Building2 }))].map(s => {
            const Icon = s.icon;
            const active = activeSchoolId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSchoolId(s.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all max-w-[180px] ${
                  active
                    ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-sm shadow-[#655ac1]/20'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-[#655ac1]'
                }`}
              >
                <Icon size={13} className="shrink-0" />
                <span className="truncate">{s.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* شريط الحالة + اختيار اليوم والحصة */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${
            liveBanner.tone === 'live'
              ? 'bg-transparent text-[#655ac1] border-slate-300'
              : 'bg-transparent text-slate-500 border-slate-200'
          }`}
        >
          {liveBanner.tone === 'live' && <span className="w-2 h-2 rounded-full bg-[#655ac1] animate-pulse" />}
          {liveBanner.text}
        </span>

        <div className="flex items-center gap-2 mr-auto">
          <CheckDropdown
            value={selectedDay}
            options={dayOptions}
            onChange={v => { setSelectedDay(v); setFollowLive(false); }}
            minWidthClass="min-w-[96px]"
          />
          <CheckDropdown
            value={String(selectedPeriod)}
            options={periodOptions}
            onChange={v => { setSelectedPeriod(Number(v)); setFollowLive(false); }}
            minWidthClass="min-w-[104px]"
          />
        </div>
      </div>

      {/* اختيار فصل سريع + بحث نصي */}
      <div className="flex items-center gap-2 mb-3">
        <CheckDropdown
          value={selectedClassId}
          options={classOptions}
          onChange={setSelectedClassId}
          minWidthClass="min-w-[120px]"
          accentOptions
        />
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={teacherSearch}
            onChange={e => setTeacherSearch(e.target.value)}
            placeholder="ابحث عن معلم..."
            className="w-full pr-9 pl-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-slate-300 transition-all placeholder:font-normal placeholder:text-slate-300"
          />
        </div>
      </div>

      {/* قائمة الفصول مجمّعة حسب الصف */}
      <div className="flex-1 overflow-visible lg:overflow-y-auto custom-scrollbar lg:pr-1 -mr-1 space-y-4">
        {totalShown === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-300">
            <LayoutGrid size={38} strokeWidth={1.5} className="mb-2 opacity-50" />
            <p className="text-xs font-bold">{schoolClasses.length === 0 ? 'لا توجد فصول لهذه المدرسة' : 'لا توجد نتائج مطابقة'}</p>
          </div>
        ) : (
          groups.map(group => (
            <section key={group.label}>
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm flex items-center gap-2 mb-1.5 py-1">
                <span className="text-sm font-black text-[#655ac1] tracking-wide">{group.label}</span>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 bg-transparent text-slate-400">{group.items.length}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {group.items.map(c => {
                  const lesson = slotByClass.lessons.get(c.id);
                  const cover = slotByClass.covers.get(c.id);
                  const tName = teacherName(lesson?.teacherId || cover?.teacherId);
                  const sName = subjectName(lesson?.subjectId);
                  const free = !lesson && !cover;
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl border transition-all ${
                        free
                          ? 'bg-slate-50/60 border-slate-100'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <span className="shrink-0 min-w-[44px] text-center text-xs font-black text-[#655ac1] bg-transparent border border-slate-200 rounded-lg px-2 py-1">
                        {getClassLabel(c)}
                      </span>
                      {free ? (
                        <span className="flex-1 text-xs font-bold text-slate-400">لا توجد حصة مجدولة</span>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate">{tName || '—'}</p>
                            {sName && <p className="text-[11px] font-medium text-slate-400 truncate">{sName}</p>}
                          </div>
                          {cover && (
                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                              <UserX size={11} />
                              {lesson ? 'بديل' : 'انتظار'}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default ClassMonitorNow;
