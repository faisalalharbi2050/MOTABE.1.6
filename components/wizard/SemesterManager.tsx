import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Trash2, Check, Plus, AlertCircle, X, CheckCircle2, FileText, MousePointerClick } from 'lucide-react';
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
}

const SemesterManager: React.FC<SemesterManagerProps> = ({ 
  semesters, 
  setSemesters, 
  currentSemesterId, 
  setCurrentSemesterId,
  academicYear,
  onAcademicYearChange
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
  const formRef = React.useRef<HTMLDivElement>(null);
  const [syncAlert, setSyncAlert] = useState<{message: string; key: number} | null>(null);

  React.useEffect(() => {
     if (syncAlert) {
         const timer = setTimeout(() => setSyncAlert(null), 5000);
         return () => clearTimeout(timer);
     }
  }, [syncAlert]);

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

  const DAYS_OF_WEEK = [
    { value: 0, label: 'الأحد' },
    { value: 1, label: 'الإثنين' },
    { value: 2, label: 'الثلاثاء' },
    { value: 3, label: 'الأربعاء' },
    { value: 4, label: 'الخميس' },
    { value: 5, label: 'الجمعة' },
    { value: 6, label: 'السبت' },
  ];

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

  const generatedWeeks = React.useMemo(() => {
    if (!newSemester.startDate || !newSemester.endDate) return [];
    const start = new Date(newSemester.startDate.includes('T') ? newSemester.startDate : newSemester.startDate + 'T00:00:00');
    const end = new Date(newSemester.endDate.includes('T') ? newSemester.endDate : newSemester.endDate + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

    let current = new Date(start);
    const result: { weekNumber: number; days: { date: string; dateObj: DateObject; isWorkingDay: boolean; isHoliday: boolean, dayOfWeek: number, label: string }[] }[] = [];
    let weekNumber = 1;
    let currentWeekDays: any[] = [];
    
    const workStart = newSemester.workDaysStart ?? 0;
    const workEnd = newSemester.workDaysEnd ?? 4;
    const holidays = newSemester.holidays || [];

    while (current <= end) {
       const dateStr = current.getFullYear() + '-' + String(current.getMonth() + 1).padStart(2, '0') + '-' + String(current.getDate()).padStart(2, '0');
       const dateObj = new DateObject({ date: current, calendar: newSemester.calendarType === 'hijri' ? arabic : gregorian, locale: newSemester.calendarType === 'hijri' ? arabic_ar : gregorian_ar });
       const dayOfWeek = current.getDay();
       const isWorkingDay = workStart <= workEnd 
            ? (dayOfWeek >= workStart && dayOfWeek <= workEnd)
            : (dayOfWeek >= workStart || dayOfWeek <= workEnd);
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
        result.push({ weekNumber: weekNumber, days: currentWeekDays });
    }
    return result;
  }, [newSemester.startDate, newSemester.endDate, newSemester.calendarType, newSemester.workDaysStart, newSemester.workDaysEnd, newSemester.holidays]);

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
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-600 block">العام الدراسي وفصوله الدراسية</label>
        
        {!showForm && (
            <button 
              onClick={() => {
                setEditingId(null);
                setNewSemester({
                    name: 'الفصل الدراسي الأول',
                    calendarType: 'hijri',
                    weeksCount: 18,
                    workDaysStart: 0,
                    workDaysEnd: 4,
                    holidays: []
                });
                setShowForm(true);
                setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
              }}
              className="text-xs font-bold text-primary flex items-center gap-1 hover:bg-primary/5 px-2 py-1 rounded-lg transition-colors"
            >
              <Plus size={14} /> إضافة
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {!showForm && semesters.length === 0 ? (
          <div className="col-span-full text-center p-8 bg-white rounded-xl border border-dashed border-slate-300">
            <Calendar className="mx-auto text-slate-400 mb-2" size={32} />
            <p className="text-sm text-slate-500">لم يتم إضافة العام والفصول الدراسية</p>
            <button 
                onClick={() => {
                  setShowForm(true);
                  setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                }}
                className="text-xs font-bold text-primary hover:underline mt-2"
            >
                إضافة
            </button>
          </div>
        ) : (
          semesters.map(semester => (
            <div 
              key={semester.id}
              className={`p-4 rounded-xl border transition-all relative group ${
                currentSemesterId === semester.id 
                  ? 'bg-white border-emerald-200 shadow-sm ring-1 ring-emerald-100' 
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                   <h4 className="font-bold text-sm text-slate-800">{semester.name}</h4>
                   <div className="flex items-center gap-2 mt-1">
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                           semester.calendarType === 'hijri' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                       }`}>
                         {semester.calendarType === 'hijri' ? 'هجري' : 'ميلادي'}
                       </span>
                       {currentSemesterId === semester.id && (
                            <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <CheckCircle2 size={10} /> الحالي
                            </span>
                       )}
                   </div>
                </div>
                
                <div className="flex gap-1 opacity-100 transition-opacity relative z-0">
                   {currentSemesterId !== semester.id && (
                     <button 
                       onClick={() => setCurrentSemesterId(semester.id)}
                       className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                       title="تعيين كفصل حالي"
                     >
                       <Check size={14} />
                     </button>
                   )}
                   <button 
                       onClick={() => handleEditSemester(semester)}
                       className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                       title="تعديل"
                     >
                       <FileText size={14} /> 
                     </button>
                   <button 
                     onClick={() => setDeletingId(semester.id)}
                     className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                     title="حذف"
                   >
                     <Trash2 size={14} />
                   </button>
                </div>
              </div>
              
               <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                 <div>
                    <span className="text-slate-400">البداية: </span> <span dir="ltr" className="font-medium text-slate-700 inline-block">{formatDateForDisplay(semester.startDate, semester.calendarType)}</span>
                 </div>
                 <div>
                    <span className="text-slate-400">النهاية: </span> <span dir="ltr" className="font-medium text-slate-700 inline-block">{formatDateForDisplay(semester.endDate, semester.calendarType)}</span>
                 </div>
                 <div className="col-span-2 pt-1 border-t border-slate-200/50 mt-1">
                    <span className="text-slate-400">المدة: </span> <span className="font-medium text-slate-700">{semester.weeksCount} أسبوع</span>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inline Add/Edit Form */}
      {showForm && (
          <div ref={formRef} className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mt-6 animate-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    {editingId ? (
                        <>
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><FileText size={16} /></div>
                            تعديل فصل دراسي
                        </>
                    ) : (
                        <>
                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Plus size={16} /></div>
                            إضافة عام وفصل دراسي
                        </>
                    )}
                  </h3>
                  <button onClick={handleCancel} className="text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1.5 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
              </div>
              
              <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     
                     {/* Calendar Type - Moved to Dropdown */}
                     <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">نوع التقويم</label>
                      <div className="relative">
                          <select 
                            value={newSemester.calendarType}
                            onChange={e => setNewSemester({...newSemester, calendarType: e.target.value as 'hijri' | 'gregorian', startDate: '', endDate: ''})}
                            className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none appearance-none bg-white font-bold"
                          >
                             <option value="hijri">هجري</option>
                             <option value="gregorian">ميلادي</option>
                          </select>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <span className="text-xs">▼</span>
                          </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">العام الدراسي</label>
                      <input 
                        value={academicYear}
                        onChange={(e) => onAcademicYearChange(e.target.value)}
                        className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-white font-bold text-slate-700"
                        placeholder="مثال: 1447هـ"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">الفصل الدراسي</label>
                      <input 
                        value={newSemester.name}
                        onChange={e => setNewSemester({...newSemester, name: e.target.value})}
                        className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-white font-bold text-slate-700"
                        placeholder="مثال: الفصل الدراسي الأول"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">يوم بداية الأسبوع</label>
                      <div className="relative">
                          <select 
                            value={newSemester.workDaysStart}
                            onChange={e => setNewSemester({...newSemester, workDaysStart: parseInt(e.target.value)})}
                            className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none appearance-none bg-white"
                          >
                             {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                          </select>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <span className="text-xs">▼</span>
                          </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">يوم نهاية الأسبوع</label>
                      <div className="relative">
                          <select 
                            value={newSemester.workDaysEnd}
                            onChange={e => setNewSemester({...newSemester, workDaysEnd: parseInt(e.target.value)})}
                            className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none appearance-none bg-white"
                          >
                             {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                          </select>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <span className="text-xs">▼</span>
                          </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">تاريخ البداية</label>
                        <div className="relative">
                            <DatePicker 
                              value={getValidDate(newSemester.startDate)}
                              onChange={(date) => setNewSemester({...newSemester, startDate: formatDate(date)})}
                              calendar={newSemester.calendarType === 'hijri' ? arabic : gregorian}
                              locale={newSemester.calendarType === 'hijri' ? arabic_ar : gregorian_ar}
                              containerClassName="w-full"
                              inputClass="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                              placeholder="حدد التاريخ"
                              portal
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                padding: "10px",
                                borderRadius: "0.75rem",
                                border: "1px solid #e2e8f0",
                                fontSize: "0.875rem",
                                height: "42px",
                                backgroundColor: "white"
                              }}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">تاريخ النهاية</label>
                        <div className="relative">
                            <DatePicker 
                              value={getValidDate(newSemester.endDate)}
                              onChange={(date) => setNewSemester({...newSemester, endDate: formatDate(date)})}
                              calendar={newSemester.calendarType === 'hijri' ? arabic : gregorian}
                              locale={newSemester.calendarType === 'hijri' ? arabic_ar : gregorian_ar}
                              containerClassName="w-full"
                              inputClass="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                              placeholder="حدد التاريخ"
                              portal
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                padding: "10px",
                                borderRadius: "0.75rem",
                                border: "1px solid #e2e8f0",
                                fontSize: "0.875rem",
                                height: "42px",
                                backgroundColor: "white"
                              }}
                            />
                        </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">عدد الأسابيع</label>
                      <div className="relative">
                          <select 
                            value={newSemester.weeksCount || 18}
                            onChange={e => setNewSemester({...newSemester, weeksCount: parseInt(e.target.value)})}
                            className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none appearance-none bg-white"
                          >
                            {Array.from({length: 40}, (_, i) => i + 1).map(num => (
                              <option key={num} value={num}>{num} أسبوع</option>
                            ))}
                          </select>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <span className="text-xs">▼</span>
                          </div>
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
                              <div className="w-9 h-9 bg-[#655ac1]/10 rounded-xl flex items-center justify-center">
                                 <Calendar size={18} className="text-[#655ac1]" />
                              </div>
                              <div>
                                 <h4 className="font-bold text-slate-800 text-sm">الأسابيع الدراسية</h4>
                                 <p className="text-[11px] text-slate-400">انقر على يوم أو رأس أسبوع لتحديده كإجازة</p>
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
                        <div className="bg-indigo-50/70 border-b border-indigo-100 px-5 py-3">
                           <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                              <div className="flex items-center gap-2 text-[11px] text-indigo-700 font-bold">
                                 <MousePointerClick size={13} className="text-[#655ac1] shrink-0" />
                                 <span>انقر على <span className="underline underline-offset-2">اليوم</span> لتحويله إلى إجازة أو عمل</span>
                              </div>
                              <div className="w-px h-4 bg-indigo-200 hidden md:block" />
                              <div className="flex items-center gap-2 text-[11px] text-indigo-700 font-bold">
                                 <MousePointerClick size={13} className="text-[#655ac1] shrink-0" />
                                 <span>انقر على <span className="underline underline-offset-2">رأس الأسبوع</span> لتحويل الأسبوع كاملاً</span>
                              </div>
                              <div className="w-px h-4 bg-indigo-200 hidden md:block" />
                              <div className="flex items-center gap-3 text-[11px]">
                                 <span className="flex items-center gap-1.5 text-[#655ac1] font-bold">
                                    <span className="w-3 h-3 rounded-sm bg-[#8779fb]/20 border border-[#8779fb]/40 inline-block" />
                                    عمل
                                 </span>
                                 <span className="flex items-center gap-1.5 text-rose-600 font-bold">
                                    <span className="w-3 h-3 rounded-sm bg-rose-200 border border-rose-300 inline-block" />
                                    إجازة
                                 </span>
                              </div>
                           </div>
                        </div>

                        {/* Weeks Grid */}
                        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-50/30">
                           {(() => {
                              let visibleWeekIndex = 0;
                              const totalVisibleWeeks = generatedWeeks.filter((w: any) => w.days.filter((d: any) => d.isWorkingDay).length > 0).length;
                              return generatedWeeks.map((week, idx) => {
                               const weekActiveDays = week.days.filter((d: any) => d.isWorkingDay);
                               if (weekActiveDays.length === 0) return null;

                               const currentVisibleIndex = visibleWeekIndex++;
                               const progressPercent = Math.round(((currentVisibleIndex + 1) / totalVisibleWeeks) * 100);

                               const weekActiveCount = weekActiveDays.filter((d: any) => !d.isHoliday).length;
                               const isFullHoliday = weekActiveCount === 0;
                               const isPartialHoliday = weekActiveCount > 0 && weekActiveCount < weekActiveDays.length;

                               const firstDay = week.days[0];
                               const lastDay = week.days[week.days.length - 1];

                               return (
                               <div
                                  key={idx}
                                  className={`rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col ${
                                     isFullHoliday
                                        ? 'bg-rose-50 border border-rose-200 shadow-sm'
                                        : isPartialHoliday
                                           ? 'bg-white border border-amber-200 shadow-sm'
                                           : 'bg-white border border-[#8779fb]/20 shadow-sm hover:border-[#8779fb]/40'
                                  }`}
                               >
                                  {/* Week Header */}
                                  <div
                                     className={`px-3 pt-2.5 pb-2 cursor-pointer select-none transition-all ${
                                        isFullHoliday
                                           ? 'bg-rose-100 hover:bg-rose-200'
                                           : isPartialHoliday
                                              ? 'bg-amber-50 hover:bg-amber-100'
                                              : 'bg-gradient-to-l from-[#655ac1]/6 to-[#8779fb]/10 hover:from-[#655ac1]/12 hover:to-[#8779fb]/18'
                                     }`}
                                     onClick={() => handleToggleWeekHolidays(week.days)}
                                     title="انقر لتحويل الأسبوع كاملاً إلى إجازة / عمل"
                                  >
                                     <div className="flex items-center justify-between mb-1.5">
                                        <span className={`text-lg font-black leading-none ${
                                           isFullHoliday ? 'text-rose-700' : isPartialHoliday ? 'text-amber-700' : 'text-[#655ac1]'
                                        }`}>
                                           {week.weekNumber}
                                        </span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                           isFullHoliday
                                              ? 'bg-rose-200 text-rose-700'
                                              : isPartialHoliday
                                                 ? 'bg-amber-100 text-amber-700'
                                                 : 'bg-[#655ac1]/10 text-[#655ac1]'
                                        }`}>
                                           {weekActiveCount}/{weekActiveDays.length}
                                        </span>
                                     </div>
                                     {/* Week date range */}
                                     <div className={`text-xs font-bold flex items-center gap-1 ${
                                        isFullHoliday ? 'text-rose-500' : isPartialHoliday ? 'text-amber-500' : 'text-[#8779fb]'
                                     }`}>
                                        <span dir="ltr">{firstDay.dateObj.format('D/M')}</span>
                                        <span className="opacity-50">—</span>
                                        <span dir="ltr">{lastDay.dateObj.format('D/M')}</span>
                                     </div>
                                  </div>

                                  {/* Days List */}
                                  <div className="p-2 space-y-1.5 flex-1">
                                     {weekActiveDays.map((day: any) => (
                                        <div
                                           key={day.date}
                                           onClick={() => handleToggleHoliday(day.date)}
                                           className={`text-xs px-2.5 py-1.5 rounded-xl flex justify-between items-center cursor-pointer select-none transition-all ${
                                              day.isHoliday
                                                 ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'
                                                 : 'bg-white text-[#655ac1] hover:bg-[#8779fb]/6 border border-[#8779fb]/15 hover:border-[#8779fb]/35'
                                           }`}
                                           title="انقر للتبديل بين إجازة وعمل"
                                        >
                                           <span className="font-bold">{day.label}</span>
                                           <span dir="ltr" className="opacity-50 font-medium text-[10px]">{day.dateObj.format('MM/DD')}</span>
                                        </div>
                                     ))}
                                  </div>

                                  {/* Progress Bar */}
                                  <div className="px-2 pb-2 pt-1">
                                     <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                           className={`h-full rounded-full transition-all duration-500 ${
                                              isFullHoliday
                                                 ? 'bg-rose-300'
                                                 : isPartialHoliday
                                                    ? 'bg-amber-300'
                                                    : 'bg-gradient-to-l from-[#655ac1] to-[#8779fb]'
                                           }`}
                                           style={{ width: `${progressPercent}%` }}
                                        />
                                     </div>
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
                        className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-200/50 rounded-xl transition-colors"
                      >
                        إلغاء
                      </button>
                      <button 
                        onClick={handleSaveSemester}
                        disabled={!newSemester.name || !newSemester.startDate || !newSemester.endDate}
                        className="px-10 py-2.5 text-sm font-bold text-white bg-primary hover:bg-secondary rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-primary/20 min-w-[150px]"
                      >
                        {editingId ? 'حفظ التعديلات' : 'إضافة'}
                      </button>
                  </div>
              </div>
          </div>
      )}

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
