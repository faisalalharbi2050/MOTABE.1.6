import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CalendarX2, Trash2, Plus, X, CheckCircle2, MousePointerClick, Pen, Eye, ChevronDown, Printer, Check } from 'lucide-react';
import { SemesterInfo } from '../../types';
import DatePicker, { DateObject } from "react-multi-date-picker";
import arabic from "react-date-object/calendars/arabic";
import arabic_ar from "react-date-object/locales/arabic_ar";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_ar from "react-date-object/locales/gregorian_ar";

// قائمة منسدلة موحّدة بنفس تصميم قائمة "نوع الكيان" مع الشيك‑بوكس الدائري
interface StyledSelectOption { value: string; label: string; }
const StyledSelect: React.FC<{
  value: string | number;
  onChange: (value: string) => void;
  options: StyledSelectOption[];
  placeholder?: string;
}> = ({ value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);
  const selected = options.find(o => o.value === String(value));
  return (
    <div className="relative w-full" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2"
      >
        <span className={`truncate text-[13px] leading-tight ${selected ? 'text-slate-700' : 'text-slate-400'}`}>{selected ? selected.label : (placeholder || 'اختر')}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 animate-in slide-in-from-top-2">
          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                  String(value) === opt.value ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                }`}
              >
                <span>{opt.label}</span>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                  String(value) === opt.value ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                }`}>
                  <Check size={12} strokeWidth={3.5} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// عرض التاريخ بصيغة عربية صحيحة: اليوم على اليمين ثم الشهر
const DM: React.FC<{ dateObj: any }> = ({ dateObj }) => (
  <span dir="rtl" className="inline-flex items-center">
    <span>{dateObj.format('D')}</span>
    <span className="mx-0.5">/</span>
    <span>{dateObj.format('M')}</span>
  </span>
);

// مدى التاريخ: البداية على اليمين ثم النهاية (مع بقاء كل تاريخ يومه على اليمين)
const DateRange: React.FC<{ first: any; last: any }> = ({ first, last }) => (
  <span dir="rtl" className="inline-flex items-center gap-1">
    <DM dateObj={first} />
    <span className="opacity-50">-</span>
    <DM dateObj={last} />
  </span>
);

// خيارات العام الدراسي: من العام الحالي حتى 5 أعوام قادمة، بصيغة العرض المختارة
const buildAcademicYearOptions = (calendarType: 'hijri' | 'gregorian'): StyledSelectOption[] => {
  const suffix = calendarType === 'hijri' ? 'هـ' : 'م';
  const baseYear = parseInt(
    new Intl.DateTimeFormat('en-US-u-ca-' + (calendarType === 'hijri' ? 'islamic-umalqura' : 'gregory'), { year: 'numeric' })
      .format(new Date())
  );
  return Array.from({ length: 6 }, (_, i) => {
    const y = baseYear + i;
    return { value: `${y}${suffix}`, label: `${y}${suffix}` };
  });
};

interface SemesterManagerProps {
  semesters: SemesterInfo[];
  setSemesters: (semesters: SemesterInfo[]) => void;
  currentSemesterId?: string;
  setCurrentSemesterId: (id: string) => void;
  academicYear: string;
  onAcademicYearChange: (year: string) => void;
  onPrintSemester?: (semester: SemesterInfo) => void;
  calendarType?: 'hijri' | 'gregorian';
  canAddSemester?: boolean;
}

const SemesterManager: React.FC<SemesterManagerProps> = ({
  semesters,
  setSemesters,
  currentSemesterId,
  setCurrentSemesterId,
  academicYear,
  onAcademicYearChange,
  onPrintSemester,
  calendarType = 'hijri',
  canAddSemester = true,
}) => {
  const [showForm, setShowForm] = useState(semesters.length === 0);
  const [newSemester, setNewSemester] = useState<Partial<SemesterInfo>>({
    name: 'الفصل الدراسي الأول',
    calendarType: calendarType,
    weeksCount: 18,
    workDaysStart: 0,
    workDaysEnd: 4,
    holidays: [],
  });

  const academicYearOptions = React.useMemo(() => {
    const opts = buildAcademicYearOptions(calendarType);
    if (academicYear && !opts.some(o => o.value === academicYear)) {
      return [{ value: academicYear, label: academicYear }, ...opts];
    }
    return opts;
  }, [calendarType, academicYear]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewingSemester, setPreviewingSemester] = useState<SemesterInfo | null>(null);
  const formRef = React.useRef<HTMLDivElement>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [saveSuccess, setSaveSuccess] = useState<'add' | 'edit' | null>(null);

  // كشف الفصل الحالي تلقائياً بناءً على تاريخ اليوم
  React.useEffect(() => {
    if (semesters.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = semesters.find(s => {
      const start = new Date(s.startDate + 'T00:00:00');
      const end   = new Date(s.endDate   + 'T00:00:00');
      return today >= start && today <= end;
    });

    if (active) {
      setCurrentSemesterId(active.id);
      return;
    }

    // لا يوجد فصل جارٍ — اختر الأقرب قادماً
    const upcoming = [...semesters]
      .filter(s => new Date(s.startDate + 'T00:00:00') > today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

    if (upcoming) {
      setCurrentSemesterId(upcoming.id);
      return;
    }

    // جميع الفصول انتهت — اختر الأخير
    const last = [...semesters].sort((a, b) =>
      new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    )[0];
    if (last) setCurrentSemesterId(last.id);
  }, [semesters]);

  // الفصل يرث صيغة التقويم العامة (لا يوجد اختيار مستقل للتقويم)
  React.useEffect(() => {
     if (!editingId) {
        setNewSemester(prev => prev.calendarType === calendarType ? prev : { ...prev, calendarType, startDate: '', endDate: '' });
     }
  }, [calendarType, editingId]);

  React.useEffect(() => {
     if (saveSuccess) {
         const timer = setTimeout(() => setSaveSuccess(null), 3000);
         return () => clearTimeout(timer);
     }
  }, [saveSuccess]);

  // Helper to dynamically show proper format based on calendar selection in read only card
  const formatDateForDisplay = (dateStr: string, calendarType: 'hijri' | 'gregorian') => {
      if (!dateStr) return '';
      try {
          // JS Date parses standard YYYY-MM-DD
          const d = new Date(dateStr + 'T00:00:00');
          if (isNaN(d.getTime())) return dateStr;
          
          if (calendarType === 'hijri') {
              return new DateObject({ date: d, calendar: arabic, locale: arabic_ar }).format('YYYY/MM/DD');
          } else {
              return dateStr.replace(/-/g, '/');
          }
      } catch (e) {
          return dateStr.replace(/-/g, '/');
      }
  };

  // Helper to safely format DateObject or string to YYYY-MM-DD
  const formatDate = (date: any) => {
    if (!date) return '';
    if (date instanceof DateObject) {
       const jsDate = date.toDate();
       if (isNaN(jsDate.getTime())) return '';
       return jsDate.getFullYear() + '-' + String(jsDate.getMonth() + 1).padStart(2, '0') + '-' + String(jsDate.getDate()).padStart(2, '0');
    }
    return date.toString();
  };

  const getValidDate = (str: string | undefined | null) => {
    if (!str) return undefined;
    const d = new Date(str + 'T00:00:00'); // Ensure basic ISO format parsing
    return isNaN(d.getTime()) ? undefined : d;
  };

  const formatSemesterNameForCard = (name: string) => {
    const normalized = name.trim();
    return normalized.replace(/^الفصل\s+الدراسي\s+/u, '') || normalized;
  };

  const ORDINALS = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
  const getNextSemesterName = (count: number): string => {
    const ordinal = ORDINALS[count] ?? `(${count + 1})`;
    return `الفصل الدراسي ${ordinal}`;
  };

  const DAYS_OF_WEEK = [
    { value: 0, label: 'الأحد' },
    { value: 1, label: 'الإثنين' },
    { value: 2, label: 'الثلاثاء' },
    { value: 3, label: 'الأربعاء' },
    { value: 4, label: 'الخميس' },
    { value: 5, label: 'الجمعة' },
    { value: 6, label: 'السبت' },
  ];

  const buildWeeksForSemester = React.useCallback((semester: Partial<SemesterInfo>) => {
    if (!semester.startDate || !semester.endDate) return [];
    const start = new Date(semester.startDate.includes('T') ? semester.startDate : semester.startDate + 'T00:00:00');
    const end = new Date(semester.endDate.includes('T') ? semester.endDate : semester.endDate + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

    let current = new Date(start);
    const result: { weekNumber: number; days: { date: string; dateObj: DateObject; isWorkingDay: boolean; isHoliday: boolean; dayOfWeek: number; label: string }[] }[] = [];
    let weekNumber = 1;
    let currentWeekDays: { date: string; dateObj: DateObject; isWorkingDay: boolean; isHoliday: boolean; dayOfWeek: number; label: string }[] = [];

    const workStart = semester.workDaysStart ?? 0;
    const workEnd = semester.workDaysEnd ?? 4;
    const holidays = semester.holidays || [];
    const calendarType = semester.calendarType === 'gregorian' ? 'gregorian' : 'hijri';

    while (current <= end) {
      const dateStr = current.getFullYear() + '-' + String(current.getMonth() + 1).padStart(2, '0') + '-' + String(current.getDate()).padStart(2, '0');
      const dateObj = new DateObject({
        date: current,
        calendar: calendarType === 'hijri' ? arabic : gregorian,
        locale: calendarType === 'hijri' ? arabic_ar : gregorian_ar
      });
      const dayOfWeek = current.getDay();
      const isWorkingDay = workStart <= workEnd
        ? dayOfWeek >= workStart && dayOfWeek <= workEnd
        : dayOfWeek >= workStart || dayOfWeek <= workEnd;
      const isHoliday = holidays.includes(dateStr);
      const label = DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || '';

      if (currentWeekDays.length > 0 && dayOfWeek === workStart) {
        result.push({ weekNumber: weekNumber++, days: currentWeekDays });
        currentWeekDays = [];
      }

      currentWeekDays.push({ date: dateStr, dateObj, isWorkingDay, isHoliday, dayOfWeek, label });
      current.setDate(current.getDate() + 1);
    }

    if (currentWeekDays.length > 0) {
      result.push({ weekNumber, days: currentWeekDays });
    }

    return result;
  }, [DAYS_OF_WEEK]);

  const getActiveWeeksCount = React.useCallback((holidaysArr: string[], startStr: string, endStr: string, workStart: number, workEnd: number) => {
        if (!startStr || !endStr) return 0;
        const start = new Date(startStr.includes('T') ? startStr : startStr + 'T00:00:00');
        const end = new Date(endStr.includes('T') ? endStr : endStr + 'T00:00:00');
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

        let current = new Date(start);
        let activeWeeksCount = 0;
        let weekHasWorkingDay = false;

        while (current <= end) {
            const dateStr = current.getFullYear() + '-' + String(current.getMonth() + 1).padStart(2, '0') + '-' + String(current.getDate()).padStart(2, '0');
            const dayOfWeek = current.getDay();
            const isWorkingDay = workStart <= workEnd 
                ? (dayOfWeek >= workStart && dayOfWeek <= workEnd)
                : (dayOfWeek >= workStart || dayOfWeek <= workEnd);
            const isHoliday = holidaysArr.includes(dateStr);

            if (dayOfWeek === workStart && current.getTime() > start.getTime()) {
                if (weekHasWorkingDay) activeWeeksCount++;
                weekHasWorkingDay = false;
            }

            if (isWorkingDay && !isHoliday) {
                weekHasWorkingDay = true;
            }

            current.setDate(current.getDate() + 1);
        }
        if (weekHasWorkingDay) activeWeeksCount++;

        return activeWeeksCount;
  }, []);

  // الإجازات لا تغيّر عدد الأسابيع — عدد الأسابيع يُحسب تلقائياً من التواريخ فقط
  const applyHolidaysUpdate = (newHolidays: string[]) => {
      setNewSemester({
         ...newSemester,
         holidays: newHolidays,
      });
  };

  const handleToggleHoliday = (dateStr: string) => {
      let newHolidays = [...(newSemester.holidays || [])];
      if (newHolidays.includes(dateStr)) {
          newHolidays = newHolidays.filter(d => d !== dateStr);
      } else {
          newHolidays.push(dateStr);
      }
      applyHolidaysUpdate(newHolidays);
  };

  const handleToggleWeekHolidays = (weekDays: any[]) => {
      let newHolidays = [...(newSemester.holidays || [])];
      const workingDaysInWeek = weekDays.filter((d: any) => d.isWorkingDay).map((d: any) => d.date);
      
      const allAreHolidays = workingDaysInWeek.length > 0 && workingDaysInWeek.every((d: any) => newHolidays.includes(d));
      
      if (allAreHolidays) {
          // Remove from holidays
          newHolidays = newHolidays.filter(d => !workingDaysInWeek.includes(d));
      } else {
          // Add to holidays
          workingDaysInWeek.forEach((d: any) => {
              if (!newHolidays.includes(d)) newHolidays.push(d);
          });
      }
      applyHolidaysUpdate(newHolidays);
  };

  const generatedWeeks = React.useMemo(() => buildWeeksForSemester(newSemester), [buildWeeksForSemester, newSemester]);
  const previewGeneratedWeeks = React.useMemo(
    () => (previewingSemester ? buildWeeksForSemester(previewingSemester) : []),
    [buildWeeksForSemester, previewingSemester]
  );

  // الأسابيع القابلة للعرض (تحتوي أيام دوام فعلية)
  const renderableWeeks = React.useMemo(
    () => generatedWeeks.filter(w => w.days.some((d: any) => d.isWorkingDay)),
    [generatedWeeks]
  );
  const renderablePreviewWeeks = React.useMemo(
    () => previewGeneratedWeeks.filter(w => w.days.some((d: any) => d.isWorkingDay)),
    [previewGeneratedWeeks]
  );

  // عدد الأسابيع يُحسب تلقائياً من التواريخ (عدد صفوف الأسابيع الظاهرة)
  React.useEffect(() => {
     const wc = renderableWeeks.length;
     if (wc > 0 && wc !== newSemester.weeksCount) {
         setNewSemester(prev => ({ ...prev, weeksCount: wc }));
     }
  }, [renderableWeeks.length, newSemester.weeksCount]);

  const handleSaveSemester = () => {
    if (newSemester.name && newSemester.startDate && newSemester.endDate) {
      if (editingId) {
        // Update existing
        const updatedSemesters = semesters.map(s => s.id === editingId ? {
          ...s,
          name: newSemester.name!,
          calendarType: newSemester.calendarType as 'hijri' | 'gregorian',
          startDate: formatDate(newSemester.startDate),
          endDate: formatDate(newSemester.endDate),
          weeksCount: newSemester.weeksCount || 18,
          workDaysStart: newSemester.workDaysStart ?? 0,
          workDaysEnd: newSemester.workDaysEnd ?? 4,
          holidays: newSemester.holidays || [],
        } : s);
        setSemesters(updatedSemesters);
        setSaveSuccess('edit');
      } else {
        // Add new
        const semester: SemesterInfo = {
          id: Date.now().toString(),
          name: newSemester.name!,
          calendarType: newSemester.calendarType as 'hijri' | 'gregorian',
          startDate: formatDate(newSemester.startDate),
          endDate: formatDate(newSemester.endDate),
          weeksCount: newSemester.weeksCount || 18,
          workDaysStart: newSemester.workDaysStart ?? 0,
          workDaysEnd: newSemester.workDaysEnd ?? 4,
          holidays: newSemester.holidays || [],
        };

        const updatedSemesters = [...semesters, semester];
        setSemesters(updatedSemesters);

        if (updatedSemesters.length === 1) {
          setCurrentSemesterId(semester.id);
        }
        setSaveSuccess('add');
      }

      handleCancel();
    }
  };

  const handleEditSemester = (semester: SemesterInfo) => {
    setPreviewingSemester(null);
    setNewSemester({
       name: semester.name,
       calendarType: semester.calendarType,
       startDate: semester.startDate,
       endDate: semester.endDate,
       weeksCount: semester.weeksCount,
       workDaysStart: semester.workDaysStart ?? 0,
       workDaysEnd: semester.workDaysEnd ?? 4,
       holidays: semester.holidays || []
    });
    setEditingId(semester.id);
    setShowForm(true);
    // Scroll to form
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  const handlePreviewSemester = (semester: SemesterInfo) => {
    setEditingId(null);
    setShowForm(false);
    setPreviewingSemester(semester);
    setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  const handleCancel = () => {
    setEditingId(null);
    setNewSemester({
        name: 'الفصل الدراسي التالي',
        calendarType: calendarType,
        weeksCount: 18,
        startDate: '',
        endDate: '',
        workDaysStart: 0,
        workDaysEnd: 4,
        holidays: []
    });
    setShowForm(false);
  };

  const handleDeleteSemester = (id: string) => {
      const updated = semesters.filter(s => s.id !== id);
      setSemesters(updated);
      setDeletingId(null);
      if (currentSemesterId === id && updated.length > 0) {
        setCurrentSemesterId(updated[0].id);
      } else if (updated.length === 0) {
        setCurrentSemesterId('');
      }
  };

  return (
    <div className="space-y-6">

      {/* Save success toast */}
      {saveSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl animate-in slide-in-from-top-2 duration-300">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <p className="text-sm font-bold text-emerald-800">
            {saveSuccess === 'add' ? 'تمت إضافة الفصل الدراسي بنجاح' : 'تم حفظ التعديلات بنجاح'}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        {!showForm && semesters.length > 0 && canAddSemester && (
          <button
            onClick={() => {
              setEditingId(null);
              setPreviewingSemester(null);
              setNewSemester({
                name: getNextSemesterName(semesters.length),
                calendarType: calendarType,
                weeksCount: 18,
                workDaysStart: 0,
                workDaysEnd: 4,
                holidays: []
              });
              setShowForm(true);
              setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-[#655ac1]"
          >
            <Plus size={16} />
            إضافة فصل دراسي آخر
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!showForm && semesters.length === 0 ? (
          <div className="col-span-full rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">لم يتم إضافة العام والفصول الدراسية بعد</p>
            <button
              onClick={() => {
                setShowForm(true);
                setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#655ac1] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#5748b4] hover:shadow-sm"
            >
              <Plus size={16} />
              إضافة عام وفصل دراسي
            </button>
          </div>
        ) : (
          semesters.map(semester => (
            <div
              key={semester.id}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 transition-all hover:border-[#8779fb]/40 hover:shadow-md"
            >
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex flex-wrap items-center gap-2">
                    <p className="text-base font-black text-slate-800 truncate">{formatSemesterNameForCard(semester.name)}</p>
                    {semester.id === currentSemesterId && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-black text-emerald-600">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        الفصل الحالي
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <button
                      onClick={() => handlePreviewSemester(semester)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold transition-all hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Eye size={13} />
                      عرض
                    </button>
                    {onPrintSemester && (
                      <button
                        onClick={() => onPrintSemester(semester)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold transition-all hover:border-slate-300 hover:bg-slate-50"
                      >
                        <Printer size={13} />
                        طباعة
                      </button>
                    )}
                    <button
                      onClick={() => handleEditSemester(semester)}
                      disabled={new Date() > new Date(semester.endDate + 'T00:00:00')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-200"
                    >
                      <Pen size={13} />
                      تعديل
                    </button>
                    <button
                      onClick={() => setDeletingId(semester.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-rose-500 text-xs font-bold transition-all hover:border-rose-200 hover:bg-rose-50"
                    >
                      <Trash2 size={13} />
                      حذف
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-400 mb-1">بداية الفصل الدراسي</p>
                    <p className="text-xs font-bold text-slate-700 leading-5">{formatDateForDisplay(semester.startDate, semester.calendarType)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-400 mb-1">نهاية الفصل الدراسي</p>
                    <p className="text-xs font-bold text-slate-700 leading-5">{formatDateForDisplay(semester.endDate, semester.calendarType)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-semibold text-slate-500">مدة الفصل الدراسي</span>
                  <span className="text-sm font-black text-[#655ac1]">{semester.weeksCount} أسبوع</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inline Add/Edit Form */}
      {showForm && (
          <div ref={formRef} className="bg-white rounded-2xl p-6 border border-slate-200 mt-6 animate-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    {editingId ? (
                        <>
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-[#655ac1]">
                              <Pen size={16} />
                            </span>
                            تعديل فصل دراسي
                        </>
                    ) : (
                        <>
                            {semesters.length > 0 ? 'إضافة فصل دراسي' : 'إضافة عام وفصل دراسي'}
                        </>
                    )}
                  </h3>
              </div>

              <div className="space-y-5">

                  {/* الصف الأول: العام الدراسي + اسم الفصل */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5">العام الدراسي</label>
                      <StyledSelect
                        value={academicYear}
                        onChange={(v) => onAcademicYearChange(v)}
                        options={academicYearOptions}
                        placeholder="اختر العام الدراسي"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5">اسم الفصل الدراسي</label>
                      <input
                        value={newSemester.name}
                        onChange={e => setNewSemester({...newSemester, name: e.target.value})}
                        className="w-full px-4 py-2.5 text-[13px] border-2 border-slate-200 rounded-xl outline-none bg-white font-bold text-slate-700 focus:border-[#655ac1]/30 hover:bg-slate-50 transition-all"
                        placeholder="مثال: الفصل الدراسي الأول"
                      />
                    </div>
                  </div>

                  {/* الصف الثاني: تاريخ بداية الفصل + تاريخ نهاية الفصل (عدد الأسابيع يُحسب تلقائياً) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5">تاريخ بداية الفصل</label>
                      <DatePicker
                        value={getValidDate(newSemester.startDate)}
                        onChange={(date) => setNewSemester({...newSemester, startDate: formatDate(date)})}
                        calendar={newSemester.calendarType === 'hijri' ? arabic : gregorian}
                        locale={newSemester.calendarType === 'hijri' ? arabic_ar : gregorian_ar}
                        containerClassName="w-full"
                        inputClass="w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-white font-bold text-slate-700 focus:border-[#8779fb] focus:ring-2 focus:ring-[#8779fb]/20 transition-all cursor-pointer"
                        placeholder="حدد التاريخ"
                        portal
                        portalTarget={document.body}
                        editable={false}
                        zIndex={99999}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5">تاريخ نهاية الفصل</label>
                      <DatePicker
                        value={getValidDate(newSemester.endDate)}
                        onChange={(date) => setNewSemester({...newSemester, endDate: formatDate(date)})}
                        calendar={newSemester.calendarType === 'hijri' ? arabic : gregorian}
                        locale={newSemester.calendarType === 'hijri' ? arabic_ar : gregorian_ar}
                        containerClassName="w-full"
                        inputClass="w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-white font-bold text-slate-700 focus:border-[#8779fb] focus:ring-2 focus:ring-[#8779fb]/20 transition-all cursor-pointer"
                        placeholder="حدد التاريخ"
                        portal
                        portalTarget={document.body}
                        editable={false}
                        zIndex={99999}
                      />
                    </div>
                  </div>

                  {/* الصف الثالث: أيام الدوام */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5">يوم بداية الأسبوع</label>
                      <StyledSelect
                        value={newSemester.workDaysStart ?? 0}
                        onChange={(v) => setNewSemester({...newSemester, workDaysStart: parseInt(v)})}
                        options={DAYS_OF_WEEK.map(d => ({ value: String(d.value), label: d.label }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5">يوم نهاية الأسبوع</label>
                      <StyledSelect
                        value={newSemester.workDaysEnd ?? 4}
                        onChange={(v) => setNewSemester({...newSemester, workDaysEnd: parseInt(v)})}
                        options={DAYS_OF_WEEK.map(d => ({ value: String(d.value), label: d.label }))}
                      />
                    </div>
                  </div>

                  {/* أزرار الإجراء — أعلى الجدول لأن القائمة قد تطول */}
                  <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleCancel}
                        type="button"
                        className="flex items-center gap-2 px-5 py-2 text-sm bg-white text-slate-600 rounded-xl font-bold border border-slate-300 hover:bg-slate-50 transition-all"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleSaveSemester}
                        disabled={!newSemester.name || !newSemester.startDate || !newSemester.endDate}
                        className="flex items-center gap-2 px-5 py-2 text-sm bg-[#655ac1] text-white rounded-xl font-black hover:bg-[#5548b0] transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      >
                        {editingId ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1]">
                            <Check size={13} strokeWidth={3.2} className="text-white" />
                          </span>
                        ) : (
                          <Plus size={16} strokeWidth={3} />
                        )}
                        {editingId ? 'حفظ التعديلات' : 'إضافة'}
                      </button>
                  </div>

                  {generatedWeeks.length > 0 && (() => {
                     const holidaysCount = (newSemester.holidays || []).length;
                     const totalWeeks = renderableWeeks.length;
                     const studyDays = generatedWeeks.reduce((s, w) => s + w.days.filter((d: any) => d.isWorkingDay && !d.isHoliday).length, 0);
                     return (
                     <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mt-2 shadow-sm">

                        {/* العنوان */}
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
                           <CalendarDays size={20} className="text-[#655ac1] shrink-0" />
                           <h4 className="font-black text-slate-800 text-sm">الأسابيع الدراسية</h4>
                        </div>

                        {/* شريط الإحصاءات */}
                        <div className="px-5 pt-4">
                           <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 py-2.5 border border-slate-200 rounded-xl">
                              <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                 <span className="w-2 h-2 rounded-full bg-[#655ac1] inline-block" />{totalWeeks} أسبوع دراسي
                              </span>
                              <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                 <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />{holidaysCount} يوم إجازة
                              </span>
                              <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                 <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />الأيام الدراسية: {studyDays} يوم
                              </span>
                           </div>
                        </div>

                        {/* الدلالات — تنبيه وسط أعلى الجدول */}
                        <div className="px-5 pt-3 pb-1 flex justify-center">
                           <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[13px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                              <span className="flex items-center gap-1.5"><MousePointerClick size={15} className="text-amber-600 shrink-0" /> نقرة على اليوم = إجازة</span>
                              <span className="w-px h-4 bg-amber-200 hidden sm:block" />
                              <span className="flex items-center gap-1.5"><CalendarX2 size={15} className="text-amber-600 shrink-0" /> نقرة على الزر = أسبوع إجازة</span>
                           </div>
                        </div>

                        {/* الجدول: كل أسبوع في صف، وأيامه بجانبه في سطر واحد */}
                        <div className="px-3 pb-3 divide-y divide-slate-100">
                           {renderableWeeks.map((week, idx) => {
                              const weekActiveDays = week.days.filter((d: any) => d.isWorkingDay);
                              const allHoliday = weekActiveDays.length > 0 && weekActiveDays.every((d: any) => d.isHoliday);
                              const firstDay = weekActiveDays[0];
                              const lastDay = weekActiveDays[weekActiveDays.length - 1];
                              return (
                                 <div key={idx} className={`flex items-stretch py-3 px-2 -mx-2 rounded-xl ${allHoliday ? 'bg-rose-50/50' : ''}`}>
                                    {/* العمود الأول: الأسبوع + التاريخ + زر إجازة الأسبوع */}
                                    <div className="w-[120px] shrink-0 pl-3 flex flex-col justify-center gap-2">
                                       <div>
                                          <div className="flex items-center gap-1.5">
                                             <p className="text-sm font-black text-slate-900 leading-tight">الأسبوع {week.weekNumber}</p>
                                             {allHoliday && <span className="text-[9px] font-black text-rose-600 bg-rose-100 rounded px-1.5 py-0.5 leading-none">إجازة</span>}
                                          </div>
                                          <p className="text-[13px] font-black text-[#655ac1] leading-tight mt-1">
                                             <DateRange first={firstDay.dateObj} last={lastDay.dateObj} />
                                          </p>
                                       </div>
                                       <button
                                          type="button"
                                          onClick={() => handleToggleWeekHolidays(week.days)}
                                          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                             allHoliday
                                                ? 'border-rose-300 bg-white text-rose-500 hover:bg-rose-50'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:text-rose-500'
                                          }`}
                                       >
                                          <CalendarX2 size={13} className="shrink-0" />
                                          {allHoliday ? 'إلغاء الإجازة' : 'أسبوع إجازة'}
                                       </button>
                                    </div>
                                    {/* فاصل بين الأسبوع وأيامه */}
                                    <div className="w-px self-stretch bg-slate-200 mx-3" />
                                    {/* العمود الثاني: أيام الأسبوع في سطر واحد */}
                                    <div className="flex-1 flex items-stretch gap-2 min-w-0">
                                       {weekActiveDays.map((day: any) => (
                                          <button
                                             key={day.date}
                                             type="button"
                                             onClick={() => handleToggleHoliday(day.date)}
                                             className={`relative flex-1 min-w-0 rounded-xl border p-2 min-h-[60px] flex flex-col items-center justify-center gap-1 transition-all select-none ${
                                                day.isHoliday
                                                   ? 'border-rose-200 bg-white hover:bg-rose-50'
                                                   : 'border-slate-200 bg-white hover:border-[#655ac1]/40 hover:bg-slate-50'
                                             }`}
                                          >
                                             {day.isHoliday && (
                                                <span className="absolute top-1 left-1 text-[10px] font-black text-rose-600 bg-rose-100 rounded-md px-1.5 py-0.5 leading-none">إجازة</span>
                                             )}
                                             <p className="text-[12px] font-black text-slate-700 leading-tight truncate w-full text-center">{day.label}</p>
                                             <p className="text-[11px] font-black text-[#655ac1] leading-tight"><DM dateObj={day.dateObj} /></p>
                                          </button>
                                       ))}
                                    </div>
                                 </div>
                              );
                           })}
                        </div>

                     </div>
                     );
                  })()}
              </div>
          </div>
      )}

      {previewingSemester && (
          <div ref={previewRef} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                      <div>
                          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                              <CalendarDays size={20} className="text-[#655ac1]" strokeWidth={1.8} />
                              <span>عرض التقويم الدراسي</span>
                          </h3>
                          <p className="mt-1 text-sm font-bold text-[#655ac1] mr-7">{previewingSemester.name}</p>
                      </div>
                      <button
                          onClick={() => setPreviewingSemester(null)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                          title="إغلاق"
                      >
                          <X size={18} />
                      </button>
                  </div>

                  <div className="px-6 pt-5">
                     {(() => {
                        const holidaysCount = previewingSemester.holidays?.length || 0;
                        const totalWeeks = renderablePreviewWeeks.length;
                        const studyDays = previewGeneratedWeeks.reduce((s, w) => s + w.days.filter((d: any) => d.isWorkingDay && !d.isHoliday).length, 0);
                        return (
                           <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 py-2.5 border border-slate-200 rounded-xl">
                              <span className="flex items-center gap-2 text-xs font-bold text-slate-600"><span className="w-2 h-2 rounded-full bg-[#655ac1] inline-block" />{totalWeeks} أسبوع دراسي</span>
                              <span className="flex items-center gap-2 text-xs font-bold text-slate-600"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />{holidaysCount} يوم إجازة</span>
                              <span className="flex items-center gap-2 text-xs font-bold text-slate-600"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />الأيام الدراسية: {studyDays} يوم</span>
                           </div>
                        );
                     })()}
                  </div>

                  <div className="p-4">
                      {renderablePreviewWeeks.length > 0 && (
                        <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 px-3 py-1">
                          {renderablePreviewWeeks.map((week, idx) => {
                            const weekActiveDays = week.days.filter((d: any) => d.isWorkingDay);
                            const allHoliday = weekActiveDays.length > 0 && weekActiveDays.every((d: any) => d.isHoliday);
                            const firstDay = weekActiveDays[0];
                            const lastDay = weekActiveDays[weekActiveDays.length - 1];
                            return (
                              <div key={idx} className={`flex items-stretch py-3 px-2 -mx-2 rounded-xl ${allHoliday ? 'bg-rose-50/50' : ''}`}>
                                {/* العمود الأول: الأسبوع + التاريخ */}
                                <div className="w-[120px] shrink-0 pl-3 flex flex-col justify-center">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-black text-slate-900 leading-tight">الأسبوع {week.weekNumber}</p>
                                    {allHoliday && <span className="text-[9px] font-black text-rose-600 bg-rose-100 rounded px-1.5 py-0.5 leading-none">إجازة</span>}
                                  </div>
                                  <p className="text-[13px] font-black text-[#655ac1] leading-tight mt-1"><DateRange first={firstDay.dateObj} last={lastDay.dateObj} /></p>
                                </div>
                                {/* فاصل */}
                                <div className="w-px self-stretch bg-slate-200 mx-3" />
                                {/* العمود الثاني: أيام الأسبوع */}
                                <div className="flex-1 flex items-stretch gap-2 min-w-0">
                                  {weekActiveDays.map((day: any) => (
                                    <div key={day.date} className={`relative flex-1 min-w-0 rounded-xl border p-2 min-h-[60px] flex flex-col items-center justify-center gap-1 select-none ${day.isHoliday ? 'border-rose-200 bg-white' : 'border-slate-200 bg-white'}`}>
                                      {day.isHoliday && (
                                        <span className="absolute top-1 left-1 text-[10px] font-black text-rose-600 bg-rose-100 rounded-md px-1.5 py-0.5 leading-none">إجازة</span>
                                      )}
                                      <p className="text-[12px] font-black text-slate-700 leading-tight truncate w-full text-center">{day.label}</p>
                                      <p className="text-[11px] font-black text-[#655ac1] leading-tight"><DM dateObj={day.dateObj} /></p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>
              </div>
      )}

      {/* Delete Confirmation Modal — بنفس تصميم نافذة حذف المعلم */}
      {deletingId && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4" dir="rtl">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                          <Trash2 size={24} className="text-rose-500 shrink-0" />
                          <h2 className="text-lg font-black text-slate-800">تأكيد حذف الفصل الدراسي</h2>
                      </div>
                      <p className="text-sm font-medium text-slate-500 leading-relaxed">
                          هل أنت متأكد من رغبتك في حذف هذا الفصل الدراسي؟ لا يمكن التراجع عن هذا الإجراء.
                      </p>
                  </div>
                  <div className="p-6 pt-0 flex gap-3">
                      <button
                          onClick={() => setDeletingId(null)}
                          className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 text-sm font-bold rounded-xl transition-colors"
                      >
                          تراجع
                      </button>
                      <button
                          onClick={() => { if (deletingId) handleDeleteSemester(deletingId); }}
                          className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
                      >
                          نعم، احذف الفصل
                      </button>
                  </div>
              </div>
          </div>
      , document.body)}
    </div>
  );
};

export default SemesterManager;
