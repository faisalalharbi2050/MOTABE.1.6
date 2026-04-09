import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CalendarX2, Trash2, Plus, AlertCircle, X, CheckCircle2, MousePointerClick, Pen, Eye, ChevronDown, Printer } from 'lucide-react';
import { SemesterInfo } from '../../types';
import DatePicker, { DateObject } from "react-multi-date-picker";
import arabic from "react-date-object/calendars/arabic";
import arabic_ar from "react-date-object/locales/arabic_ar";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_ar from "react-date-object/locales/gregorian_ar";

interface SemesterManagerProps {
  semesters: SemesterInfo[];
  setSemesters: (semesters: SemesterInfo[]) => void;
  currentSemesterId?: string;
  setCurrentSemesterId: (id: string) => void;
  academicYear: string;
  onAcademicYearChange: (year: string) => void;
  onPrintSemester?: (semester: SemesterInfo) => void;
}

const SemesterManager: React.FC<SemesterManagerProps> = ({
  semesters,
  setSemesters,
  currentSemesterId,
  setCurrentSemesterId,
  academicYear,
  onAcademicYearChange,
  onPrintSemester,
}) => {
  const [showForm, setShowForm] = useState(semesters.length === 0);
  const [newSemester, setNewSemester] = useState<Partial<SemesterInfo>>({
    name: 'الفصل الدراسي الأول',
    calendarType: 'hijri',
    weeksCount: 18,
    workDaysStart: 0,
    workDaysEnd: 4,
    holidays: [],
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewingSemester, setPreviewingSemester] = useState<SemesterInfo | null>(null);
  const formRef = React.useRef<HTMLDivElement>(null);
  const [syncAlert, setSyncAlert] = useState<{message: string; key: number} | null>(null);
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

  React.useEffect(() => {
     if (syncAlert) {
         const timer = setTimeout(() => setSyncAlert(null), 5000);
         return () => clearTimeout(timer);
     }
  }, [syncAlert]);

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

  const applyHolidaysUpdate = (newHolidays: string[]) => {
      const oldActiveCount = getActiveWeeksCount(
          newSemester.holidays || [], 
          newSemester.startDate || '', 
          newSemester.endDate || '', 
          newSemester.workDaysStart ?? 0, 
          newSemester.workDaysEnd ?? 4
      );
      const newActiveCount = getActiveWeeksCount(
          newHolidays, 
          newSemester.startDate || '', 
          newSemester.endDate || '', 
          newSemester.workDaysStart ?? 0, 
          newSemester.workDaysEnd ?? 4
      );
      
      let updatedWeeksCount = newSemester.weeksCount || 18;
      if (oldActiveCount !== newActiveCount) {
          const diff = newActiveCount - oldActiveCount;
          updatedWeeksCount = Math.max(1, updatedWeeksCount + diff);
          setSyncAlert({
              message: `تم تحديث عدد الأسابيع إلى ${updatedWeeksCount} ليتوافق مع التقويم والإجازات المحددة`,
              key: Date.now()
          });
      }

      setNewSemester({
         ...newSemester,
         holidays: newHolidays,
         weeksCount: updatedWeeksCount
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

  const activeCalendarWeeks = getActiveWeeksCount(
      newSemester.holidays || [], 
      newSemester.startDate || '', 
      newSemester.endDate || '', 
      newSemester.workDaysStart ?? 0, 
      newSemester.workDaysEnd ?? 4
  );

  React.useEffect(() => {
     if (activeCalendarWeeks > 0 && activeCalendarWeeks !== newSemester.weeksCount) {
         setNewSemester(prev => ({ ...prev, weeksCount: activeCalendarWeeks }));
     }
  }, [activeCalendarWeeks, newSemester.weeksCount]);

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

  const handleCancel = () => {
    setEditingId(null);
    setNewSemester({
        name: 'الفصل الدراسي التالي',
        calendarType: 'hijri',
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

      {/* ── Save success toast ─────────────────────────────────────────────── */}
      {saveSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl animate-in slide-in-from-top-2 duration-300">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <p className="text-sm font-bold text-emerald-800">
            {saveSuccess === 'add' ? 'تمت إضافة الفصل الدراسي بنجاح' : 'تم حفظ التعديلات بنجاح'}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        {!showForm && semesters.length > 0 && (
          <button
            onClick={() => {
              setEditingId(null);
              setNewSemester({
                name: getNextSemesterName(semesters.length),
                calendarType: 'hijri',
                weeksCount: 18,
                workDaysStart: 0,
                workDaysEnd: 4,
                holidays: []
              });
              setShowForm(true);
              setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#655ac1] transition-all hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] hover:-translate-y-0.5"
          >
            <Plus size={16} />
            إضافة فصل دراسي آخر
          </button>
        )}
      </div>

      <div className="space-y-3">
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
              className="rounded-[1.25rem] border border-slate-300 bg-white p-4 transition-all hover:border-slate-400 hover:shadow-sm"
            >
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                  {/* Badge الفصل الحالي — تلقائي */}
                  <div>
                    {semester.id === currentSemesterId && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-black text-[#655ac1]">
                        <CalendarDays size={12} className="text-[#8779fb]" />
                        الفصل الحالي
                      </span>
                    )}
                  </div>
                  {/* أزرار الإجراءات */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewingSemester(semester)}
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

                {/* بطاقة معلومات الفصل — تصميم حديث */}
                <div className="px-4 py-3 space-y-3">
                  <p className="text-base font-black text-[#655ac1]">{formatSemesterNameForCard(semester.name)}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600">
                      يبدأ من {formatDateForDisplay(semester.startDate, semester.calendarType)}
                    </span>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600">
                      ينتهي في {formatDateForDisplay(semester.endDate, semester.calendarType)}
                    </span>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600">
                      {semester.weeksCount} أسبوع
                    </span>
                  </div>
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
                            <CalendarDays size={20} className="text-[#8779fb]" />
                            {semesters.length > 0 ? 'إضافة فصل دراسي' : 'إضافة عام وفصل دراسي'}
                        </>
                    )}
                  </h3>
              </div>

              <div className="space-y-5">

                  {/* الصف الأول: نوع التقويم + العام الدراسي + اسم الفصل */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">نوع التقويم</label>
                      <div className="relative">
                        <select
                          value={newSemester.calendarType}
                          onChange={e => setNewSemester({...newSemester, calendarType: e.target.value as 'hijri' | 'gregorian', startDate: '', endDate: ''})}
                          className="w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none appearance-none bg-white font-bold text-slate-700 focus:border-[#8779fb] focus:ring-2 focus:ring-[#8779fb]/20 transition-all"
                        >
                          <option value="hijri">هجري</option>
                          <option value="gregorian">ميلادي</option>
                        </select>
                        <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">العام الدراسي</label>
                      <input
                        value={academicYear}
                        onChange={(e) => onAcademicYearChange(e.target.value)}
                        className="w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-white font-bold text-slate-700 focus:border-[#8779fb] focus:ring-2 focus:ring-[#8779fb]/20 transition-all"
                        placeholder="مثال: 1447هـ"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">اسم الفصل الدراسي</label>
                      <input
                        value={newSemester.name}
                        onChange={e => setNewSemester({...newSemester, name: e.target.value})}
                        className="w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-white font-bold text-slate-700 focus:border-[#8779fb] focus:ring-2 focus:ring-[#8779fb]/20 transition-all"
                        placeholder="مثال: الفصل الدراسي الأول"
                      />
                    </div>
                  </div>

                  {/* الصف الثاني: تاريخ البداية + تاريخ النهاية + عدد الأسابيع */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">تاريخ البداية</label>
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
                      <label className="text-xs font-bold text-slate-500 block mb-1">تاريخ النهاية</label>
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
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">عدد الأسابيع</label>
                      <div className="relative">
                        <select
                          value={newSemester.weeksCount || 18}
                          onChange={e => setNewSemester({...newSemester, weeksCount: parseInt(e.target.value)})}
                          className="w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none appearance-none bg-white font-bold text-slate-700 focus:border-[#8779fb] focus:ring-2 focus:ring-[#8779fb]/20 transition-all"
                        >
                          {Array.from({length: 40}, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>{num} أسبوع</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* الصف الثالث: أيام الدوام */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">يوم بداية الأسبوع</label>
                      <div className="relative">
                        <select
                          value={newSemester.workDaysStart}
                          onChange={e => setNewSemester({...newSemester, workDaysStart: parseInt(e.target.value)})}
                          className="w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none appearance-none bg-white font-bold text-slate-700 focus:border-[#8779fb] focus:ring-2 focus:ring-[#8779fb]/20 transition-all"
                        >
                          {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">يوم نهاية الأسبوع</label>
                      <div className="relative">
                        <select
                          value={newSemester.workDaysEnd}
                          onChange={e => setNewSemester({...newSemester, workDaysEnd: parseInt(e.target.value)})}
                          className="w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none appearance-none bg-white font-bold text-slate-700 focus:border-[#8779fb] focus:ring-2 focus:ring-[#8779fb]/20 transition-all"
                        >
                          {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      </div>
                    </div>
                  </div>


                  {syncAlert && (
                     <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 mt-4 animate-in slide-in-from-top-2">
                        <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                        <div>
                           <p className="text-sm font-bold text-emerald-800">
                              {syncAlert.message}
                           </p>
                        </div>
                     </div>
                  )}

                  {generatedWeeks.length > 0 && (
                     <div className="bg-white border border-[#8779fb]/20 rounded-2xl overflow-hidden mt-6 shadow-lg">

                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#655ac1]/8 to-[#8779fb]/6 border-b border-[#8779fb]/15 px-5 py-4 flex flex-wrap justify-between items-center gap-3">
                           <div className="flex items-center gap-3">
                              <CalendarDays size={24} className="text-[#655ac1] shrink-0" />
                              <div>
                                 <h4 className="font-bold text-slate-800 text-sm">الأسابيع الدراسية</h4>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="bg-white rounded-xl border border-[#8779fb]/25 px-4 py-2 text-center shadow-sm min-w-[72px]">
                                 <div className="text-[10px] text-slate-400 font-bold mb-0.5">فعّال</div>
                                 <div className="text-xl font-black text-[#655ac1] leading-none">{activeCalendarWeeks}</div>
                              </div>
                              <div className="text-slate-300 text-xl font-light">/</div>
                              <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 text-center shadow-sm min-w-[72px]">
                                 <div className="text-[10px] text-slate-400 font-bold mb-0.5">إجمالي</div>
                                 <div className="text-xl font-black text-slate-500 leading-none">{generatedWeeks.length}</div>
                              </div>
                           </div>
                        </div>

                        {/* Interaction Guide */}
                        <div className="border-b border-slate-100 px-5 py-3 bg-slate-50">
                           <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold">
                                 <MousePointerClick size={12} className="text-slate-400 shrink-0" />
                                 <span>انقر على اليوم لتعيينه إجازة رسمية</span>
                              </div>
                              <div className="w-px h-3.5 bg-slate-200 hidden md:block" />
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold">
                                 <MousePointerClick size={12} className="text-slate-400 shrink-0" />
                                 <span>انقر على رقم الأسبوع لتعيين الأسبوع كاملاً إجازة رسمية</span>
                              </div>
                           </div>
                        </div>

                        {/* Weeks Grid */}
                        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-50/30">
                           {(() => {
                              return generatedWeeks.map((week, idx) => {
                               const weekActiveDays = week.days.filter((d: any) => d.isWorkingDay);
                               if (weekActiveDays.length === 0) return null;

                               const weekActiveCount = weekActiveDays.filter((d: any) => !d.isHoliday).length;
                               const isFullHoliday = weekActiveCount === 0;

                               const firstDay = weekActiveDays[0];
                               const lastDay = weekActiveDays[weekActiveDays.length - 1];

                               return (
                               <div
                                  key={idx}
                                  className={`rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col ${
                                      isFullHoliday
                                         ? 'bg-white border-2 border-rose-400 shadow-sm'
                                         : 'bg-white border border-[#8779fb]/20 shadow-sm hover:border-[#8779fb]/40'
                                  }`}
                               >
                                  {/* Week Header */}
                                  <div
                                     className={`px-3 pt-2.5 pb-2 cursor-pointer select-none transition-all ${
                                         isFullHoliday
                                            ? 'bg-white hover:bg-rose-50'
                                            : 'bg-gradient-to-l from-[#655ac1]/6 to-[#8779fb]/10 hover:from-[#655ac1]/12 hover:to-[#8779fb]/18'
                                     }`}
                                     onClick={() => handleToggleWeekHolidays(week.days)}
                                  >
                                     <div className="flex items-center justify-between mb-1.5">
                                         <span className={`text-lg font-black leading-none ${isFullHoliday ? 'text-rose-500' : 'text-[#655ac1]'}`}>
                                            {week.weekNumber}
                                         </span>
                                         {isFullHoliday && (
                                           <span className="flex items-center gap-1">
                                             <CalendarX2 size={14} className="text-rose-400" />
                                             <span className="text-xs font-bold text-rose-400">إجازة</span>
                                           </span>
                                         )}
                                      </div>
                                      <div className={`text-sm font-black text-right ${isFullHoliday ? 'text-rose-400' : 'text-[#8779fb]'}`}>
                                        <bdi dir="ltr">{firstDay.dateObj.format('M/D')}</bdi>
                                        <span className="opacity-40 mx-1">—</span>
                                        <bdi dir="ltr">{lastDay.dateObj.format('M/D')}</bdi>
                                     </div>
                                  </div>

                                  {/* Days List */}
                                  <div className="p-2 space-y-1.5 flex-1">
                                     {weekActiveDays.map((day: any) => (
                                        <div
                                           key={day.date}
                                           onClick={() => handleToggleHoliday(day.date)}
                                           className={`text-xs px-2.5 py-1.5 rounded-xl flex justify-between items-center cursor-pointer select-none transition-all ${
                                              isFullHoliday
                                                 ? 'bg-white text-rose-500 border border-slate-200 hover:bg-rose-50'
                                                 : day.isHoliday
                                                    ? 'bg-white text-slate-700 border-2 border-rose-400 hover:bg-rose-50'
                                                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
                                           }`}
                                        >
                                           <span className="font-bold flex items-center gap-1.5">
                                             {day.isHoliday && !isFullHoliday && <CalendarX2 size={11} className="text-rose-400 shrink-0" />}
                                             {day.label}
                                           </span>
                                           <span dir="ltr" className="opacity-60 font-medium text-xs">{day.dateObj.format('MM/DD')}</span>
                                        </div>
                                     ))}
                                  </div>

                               </div>
                               );
                              });
                           })()}
                        </div>

                     </div>
                  )}

                  <div className="flex gap-3 pt-6 border-t border-slate-200/50 mt-6">
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
                        {editingId ? 'حفظ التعديلات' : 'إضافة'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {previewingSemester && createPortal(
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                      <div>
                          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                              <CalendarDays size={20} className="text-[#8779fb]" strokeWidth={1.8} />
                              <span>استعراض التقويم الدراسي</span>
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">{previewingSemester.name}</p>
                      </div>
                      <button
                          onClick={() => setPreviewingSemester(null)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                          title="إغلاق"
                      >
                          <X size={18} />
                      </button>
                  </div>

                  <div className="grid grid-cols-1 gap-x-4 gap-y-3 border-b border-slate-200 bg-slate-50/70 px-6 py-4 text-center md:grid-cols-5">
                      <div className="min-w-0 space-y-1 text-center">
                          <div className="text-[11px] font-bold text-slate-500">العام الدراسي</div>
                          <div className="block w-full text-sm font-bold leading-6 text-[#655ac1]">{academicYear || 'غير محدد'}</div>
                      </div>
                      <div className="min-w-0 space-y-1 text-center">
                          <div className="text-[11px] font-bold text-slate-500">الفصل الدراسي</div>
                          <div className="block w-full text-sm font-bold leading-6 text-[#655ac1]">{formatSemesterNameForCard(previewingSemester.name)}</div>
                      </div>
                      <div className="min-w-0 space-y-1 text-center">
                          <div className="text-[11px] font-bold text-slate-500">بداية الفصل الدراسي</div>
                          <div dir="ltr" className="block w-full text-sm font-bold leading-6 text-[#655ac1] text-center">{formatDateForDisplay(previewingSemester.startDate, previewingSemester.calendarType)}</div>
                      </div>
                      <div className="min-w-0 space-y-1 text-center">
                          <div className="text-[11px] font-bold text-slate-500">نهاية الفصل الدراسي</div>
                          <div dir="ltr" className="block w-full text-sm font-bold leading-6 text-[#655ac1] text-center">{formatDateForDisplay(previewingSemester.endDate, previewingSemester.calendarType)}</div>
                      </div>
                      <div className="min-w-0 space-y-1 text-center">
                          <div className="text-[11px] font-bold text-slate-500">عدد الأسابيع الدراسية</div>
                          <div className="block w-full text-sm font-bold leading-6 text-[#655ac1]">{previewingSemester.weeksCount} أسبوع</div>
                      </div>
                  </div>

                  <div className="max-h-[55vh] overflow-y-auto">
                      {previewGeneratedWeeks.length > 0 && (
                        <div className="overflow-hidden">
                          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-50/30">
                            {(() => {
                              return previewGeneratedWeeks.map((week, idx) => {
                                const weekActiveDays = week.days.filter((d: any) => d.isWorkingDay);
                                if (weekActiveDays.length === 0) return null;

                                const weekActiveCount = weekActiveDays.filter((d: any) => !d.isHoliday).length;
                                const isFullHoliday = weekActiveCount === 0;
                                const firstDay = weekActiveDays[0];
                                const lastDay = weekActiveDays[weekActiveDays.length - 1];

                                return (
                                  <div
                                    key={idx}
                                    className={`rounded-2xl overflow-hidden transition-all duration-200 flex flex-col ${
                                      isFullHoliday
                                        ? 'bg-rose-50 border border-rose-200 shadow-sm'
                                        : 'bg-white border border-[#8779fb]/20 shadow-sm'
                                    }`}
                                  >
                                    <div
                                      className={`px-3 pt-2.5 pb-2 transition-all ${
                                        isFullHoliday
                                          ? 'bg-rose-100'
                                          : 'bg-gradient-to-l from-[#655ac1]/6 to-[#8779fb]/10'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className={`text-lg font-black leading-none ${
                                          isFullHoliday ? 'text-rose-700' : 'text-[#655ac1]'
                                        }`}>
                                          {week.weekNumber}
                                        </span>
                                      </div>
                                      <div className={`text-xs font-bold text-right ${
                                        isFullHoliday ? 'text-rose-500' : 'text-[#8779fb]'
                                      }`}>
                                        <bdi dir="ltr">{firstDay.dateObj.format('M/D')}</bdi>
                                        <span className="opacity-50 mx-1">—</span>
                                        <bdi dir="ltr">{lastDay.dateObj.format('M/D')}</bdi>
                                      </div>
                                    </div>

                                    <div className="p-2 space-y-1.5 flex-1">
                                      {weekActiveDays.map((day: any) => (
                                        <div
                                          key={day.date}
                                          className={`text-xs px-2.5 py-1.5 rounded-xl flex justify-between items-center select-none border ${
                                            day.isHoliday
                                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                                              : 'bg-white text-slate-700 border-slate-200'
                                          }`}
                                        >
                                          <span className="font-bold">{day.label}</span>
                                          <span dir="ltr" className="opacity-60 font-medium text-xs">{day.dateObj.format('MM/DD')}</span>
                                        </div>
                                      ))}
                                    </div>

                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                  </div>

                  <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#8779fb] inline-block" />
                          {getActiveWeeksCount(
                            previewingSemester.holidays || [],
                            previewingSemester.startDate,
                            previewingSemester.endDate,
                            previewingSemester.workDaysStart ?? 0,
                            previewingSemester.workDaysEnd ?? 4
                          )} أسبوع فعّال
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                          {previewingSemester.holidays?.length || 0} يوم إجازة
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {onPrintSemester && (
                          <button
                            onClick={() => { onPrintSemester(previewingSemester); setPreviewingSemester(null); }}
                            className="inline-flex items-center gap-2 justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:border-[#8779fb] hover:text-[#8779fb] hover:bg-slate-50"
                          >
                            <Printer size={15} />
                            طباعة
                          </button>
                        )}
                        <button
                            onClick={() => setPreviewingSemester(null)}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                        >
                            إغلاق
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      , document.body)}

      {/* Delete Confirmation Modal */}
      {deletingId && createPortal(
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                      <AlertCircle className="text-rose-500" size={24} />
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-800 mb-2 text-center">تأكيد الحذف</h3>
                  
                  <p className="text-sm text-slate-500 mb-6 text-center leading-relaxed">
                      هل أنت متأكد من حذف هذا الفصل الدراسي؟ لا يمكن التراجع عن هذا الإجراء وسيتم مسح كافة البيانات المرتبطة به.
                  </p>
                  
                  <div className="flex gap-3">
                      <button 
                          onClick={() => setDeletingId(null)}
                          className="flex-1 py-2.5 px-4 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                      >
                          إلغاء
                      </button>
                      <button 
                          onClick={() => {
                              if (deletingId) handleDeleteSemester(deletingId);
                          }}
                          className="flex-1 py-2.5 px-4 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors shadow-sm shadow-rose-500/20"
                      >
                          حذف نهائي
                      </button>
                  </div>
              </div>
          </div>
      , document.body)}
    </div>
  );
};

export default SemesterManager;
