import React, { useState, useEffect } from 'react';
import { SchoolInfo, TimingConfig, BreakInfo, PrayerInfo } from '../../types';
import { Clock, Plus, Trash2, Save, Printer, Sun, Cloud, Moon, Settings, Calculator, Calendar, Copy, Link, Split, Check, Sunset, MinusCircle, Utensils, Snowflake, CheckCircle } from 'lucide-react';
import SchoolTabs from '../wizard/SchoolTabs';

interface TimingSettingsProps {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
}

interface ScheduleItem {
  id: string;
  type: 'assembly' | 'period' | 'break' | 'prayer';
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  originalIndex?: number;
  isCustom?: boolean;
  relatedPeriodIndex: number;
}

const DAYS_OF_WEEK = [
  { id: 'sunday', label: 'الأحد', default: true },
  { id: 'monday', label: 'الاثنين', default: true },
  { id: 'tuesday', label: 'الثلاثاء', default: true },
  { id: 'wednesday', label: 'الأربعاء', default: true },
  { id: 'thursday', label: 'الخميس', default: true },
  { id: 'friday', label: 'الجمعة', default: false },
  { id: 'saturday', label: 'السبت', default: false },
];

const TimingSettings: React.FC<TimingSettingsProps> = ({ schoolInfo, setSchoolInfo }) => {
  const [activeTab, setActiveTab] = useState<string>('main');
  const [printOptions, setPrintOptions] = useState({
    showBreaks: true,
    showPrayer: true,
    showNotes: true
  });
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [confirmDeleteBreak, setConfirmDeleteBreak] = useState<number | null>(null);
  const [confirmDeletePrayer, setConfirmDeletePrayer] = useState<number | null>(null);

  // Ensure config exists for main and shared schools
  useEffect(() => {
    setSchoolInfo(prev => {
      const newData = { ...prev };
      
      const defaultConfig: TimingConfig = {
        activeDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        periodCounts: {
          sunday: 7, monday: 7, tuesday: 7, wednesday: 7, thursday: 7
        },
        assemblyTime: '06:45',
        periodDuration: 45,
        breaks: [
          { id: 'b1', name: 'الفسحة الأولى', duration: 25, afterPeriod: 2 }
        ],
        prayers: [
          { id: 'p1', name: 'صلاة الظهر', duration: 20, afterPeriod: 6, isEnabled: true }
        ],
        hasAssembly: true,
        season: 'summer',
        customDurations: {},
        customPeriodNames: {},
        customStartTimes: {},
        sharedSchoolMode: 'unified'
      };

      if (!newData.timing) newData.timing = { ...defaultConfig };
      
      // Initialize shared schools timing if missing
      if (newData.sharedSchools && newData.sharedSchools.length > 0) {
         newData.sharedSchools = newData.sharedSchools.map(school => {
             if (!school.timing) {
                 return { ...school, timing: { ...defaultConfig } };
             }
             return school;
         });
      }

      return newData;
    });
  }, [schoolInfo.sharedSchools?.length, setSchoolInfo]);

  if (!schoolInfo.timing) return <div className="p-10 text-center text-slate-500">جاري تحميل الإعدادات...</div>;

  const getCurrentTiming = (): TimingConfig => {
    if (activeTab === 'main') {
        return schoolInfo.timing!;
    }
    const sharedSchool = schoolInfo.sharedSchools?.find(s => s.id === activeTab);
    return sharedSchool?.timing || schoolInfo.timing!; // Fallback to main if not found (shouldn't happen)
  };

  const currentTiming = getCurrentTiming();

  const getTheme = () => {
      switch(currentTiming.season) {
          case 'winter': return {
              bg: 'bg-[#eaf6fd]', text: 'text-[#1e5777]', border: 'border-[#2a93d5]/30',
              rowHover: 'hover:bg-[#eaf6fd]', icon: 'text-[#2a93d5]',
              inputFocus: 'focus:border-[#2a93d5]', secondary: 'bg-[#eaf6fd]',
              noteTitle: 'text-[#2a93d5]', noteIconBg: 'bg-[#2a93d5]/10', notePlaceholder: 'placeholder:text-[#2a93d5]/50'
          };
          case 'ramadan': return {
              bg: 'bg-[#ebf9f2]', text: 'text-[#1d5b3a]', border: 'border-[#3bb273]/30',
              rowHover: 'hover:bg-[#ebf9f2]', icon: 'text-[#3bb273]',
              inputFocus: 'focus:border-[#3bb273]', secondary: 'bg-[#ebf9f2]',
               noteTitle: 'text-[#3bb273]', noteIconBg: 'bg-[#3bb273]/10', notePlaceholder: 'placeholder:text-[#3bb273]/50'
          };
          default: return { // summer
              bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200',
              rowHover: 'hover:bg-amber-50', icon: 'text-amber-500',
              inputFocus: 'focus:border-amber-400', secondary: 'bg-amber-100',
               noteTitle: 'text-amber-700', noteIconBg: 'bg-amber-200', notePlaceholder: 'placeholder:text-amber-400'
          };
      }
  };
  
  const theme = getTheme();

  const updateTiming = (updates: Partial<TimingConfig>) => {
    setSchoolInfo(prev => {
      const newData = { ...prev };
      
      if (activeTab === 'main') {
          newData.timing = { ...newData.timing!, ...updates };
      } else {
          newData.sharedSchools = newData.sharedSchools.map(school => {
              if (school.id === activeTab) {
                  return { ...school, timing: { ...school.timing!, ...updates } };
              }
              return school;
          });
      }
      return newData;
    });
  };
  
  // --- Interactions --- //
  
  const toggleDay = (dayId: string) => {
    const currentDays = currentTiming.activeDays || [];
    const isActive = currentDays.includes(dayId);
    let newDays;
    
    if (isActive) {
      newDays = currentDays.filter(d => d !== dayId);
    } else {
      const dayOrder = DAYS_OF_WEEK.map(d => d.id);
      newDays = [...currentDays, dayId].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    }
    updateTiming({ activeDays: newDays });
    if (!isActive && !currentTiming.periodCounts?.[dayId]) {
      updateTiming({ periodCounts: { ...currentTiming.periodCounts, [dayId]: 7 } });
    }
  };

  const updatePeriodCount = (dayId: string, count: number) => {
    const newCounts = { ...currentTiming.periodCounts, [dayId]: Math.min(8, Math.max(0, count)) };
    updateTiming({ periodCounts: newCounts });
  };
  
  const handleSharedModeChange = (mode: 'unified' | 'copied' | 'separate') => {
    setSchoolInfo(prev => {
      const newData = { ...prev };
      if (!newData.timing) return prev;
      
      newData.timing = { ...newData.timing, sharedSchoolMode: mode };

      if (mode === 'unified') {
          // In unified mode, clear customized timing for shared schools so they fall back to main
          if (newData.sharedSchools) {
             newData.sharedSchools = newData.sharedSchools.map(s => {
                 const { timing, ...rest } = s; // Remove timing from shared school
                 return rest;
             });
          }
      } else if (mode === 'separate') {
          // Initialize timing for shared schools if missing
          if (newData.sharedSchools) {
              newData.sharedSchools = newData.sharedSchools.map(s => {
                  if (!s.timing) return { ...s, timing: { ...newData.timing! } };
                  return s;
              });
          }
      }
      return newData;
    });
    
    if (mode === 'unified') setActiveTab('main');
  };

  // --- Calculations --- //
  const addMinutes = (time: string, minutes: number): string => {
    if (!time) return '00:00';
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() + minutes);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getOrdinal = (n: number) => {
    const ordinals = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة', 'الحادية عشر', 'الثانية عشر'];
    return ordinals[n - 1] || n.toString();
  };

  const maxPeriods = Math.max(...Object.values(currentTiming.periodCounts || { d: 7 }));

  const calculateSchedule = (): ScheduleItem[] => {
    const items: ScheduleItem[] = [];
    if (!currentTiming) return [];
    
    let currentTime = currentTiming.assemblyTime || '06:45';

    // Helper to get time
    const getStartTime = (id: string, defaultTime: string) => {
        return currentTiming.customStartTimes?.[id] || defaultTime;
    };

    // Assembly
    if (currentTiming.hasAssembly) {
      const id = 'assembly';
      const startTime = getStartTime(id, currentTime);
      const duration = 15;
      const endTime = addMinutes(startTime, duration);
      items.push({ id, type: 'assembly', name: 'الاصطفاف', startTime, endTime, duration, relatedPeriodIndex: 0 });
      currentTime = endTime;
    }

    for (let i = 1; i <= maxPeriods; i++) {
        // Breaks
        const breaksBefore = (currentTiming.breaks || []).filter(b => b.afterPeriod === i - 1);
        breaksBefore.forEach(b => {
             const id = `break-${b.id}`;
             const startTime = getStartTime(id, currentTime);
             const duration = b.duration;
             const endTime = addMinutes(startTime, duration);
             
             items.push({ id, type: 'break', name: b.name, startTime, endTime, duration, originalIndex: currentTiming.breaks.indexOf(b), relatedPeriodIndex: i - 1 });
            currentTime = endTime;
        });

        // Prayers
        const prayersBefore = (currentTiming.prayers || []).filter(p => p.isEnabled && p.afterPeriod === i - 1);
        prayersBefore.forEach(p => {
             const id = `prayer-${p.id}`;
             const startTime = getStartTime(id, currentTime);
             const duration = p.duration;
             const endTime = addMinutes(startTime, duration);
             items.push({ id, type: 'prayer', name: p.name, startTime, endTime, duration, originalIndex: currentTiming.prayers?.indexOf(p), relatedPeriodIndex: i - 1 });
            currentTime = endTime;
        });

        // Period
        const id = `period-${i}`;
        const startTime = getStartTime(id, currentTime);
        const duration = currentTiming.customDurations?.[i] || currentTiming.periodDuration || 45;
        const endTime = addMinutes(startTime, duration);
        const customName = currentTiming.customPeriodNames?.[i];
        
        items.push({ 
            id, 
            type: 'period', 
            name: customName || `الحصة ${getOrdinal(i)}`, 
            startTime, 
            endTime, 
            duration, 
            originalIndex: i,
            relatedPeriodIndex: i
        });
        currentTime = endTime;
    }
    
    // Trailing Breaks/Prayer
    const breaksAfter = (currentTiming.breaks || []).filter(b => b.afterPeriod >= maxPeriods);
    breaksAfter.forEach(b => {
        const id = `break-${b.id}`;
        const startTime = getStartTime(id, currentTime);
         const duration = b.duration;
        const endTime = addMinutes(startTime, duration);
        items.push({ id, type: 'break', name: b.name, startTime, endTime, duration, originalIndex: currentTiming.breaks.indexOf(b), relatedPeriodIndex: maxPeriods });
        currentTime = endTime;
    });
    
     const prayersAfter = (currentTiming.prayers || []).filter(p => p.isEnabled && p.afterPeriod >= maxPeriods);
     prayersAfter.forEach(p => {
        const id = `prayer-${p.id}`;
        const startTime = getStartTime(id, currentTime);
        const duration = p.duration;
        const endTime = addMinutes(startTime, duration);
        items.push({ id, type: 'prayer', name: p.name, startTime, endTime, duration, originalIndex: currentTiming.prayers?.indexOf(p), relatedPeriodIndex: maxPeriods });
        currentTime = endTime;
    });

    return items;
  };

  const schedule = calculateSchedule();

  // --- Edit Handlers --- //
  const handleItemNameChange = (item: ScheduleItem, newName: string) => {
      if (item.type === 'period') {
          updateTiming({ customPeriodNames: { ...currentTiming.customPeriodNames, [item.originalIndex!]: newName } });
      } else if (item.type === 'break') {
          const newBreaks = [...(currentTiming.breaks || [])];
          newBreaks[item.originalIndex!] = { ...newBreaks[item.originalIndex!], name: newName };
          updateTiming({ breaks: newBreaks });
      } else if (item.type === 'prayer') {
          const newPrayers = [...(currentTiming.prayers || [])];
          if (newPrayers[item.originalIndex!]) {
            newPrayers[item.originalIndex!] = { ...newPrayers[item.originalIndex!], name: newName };
            updateTiming({ prayers: newPrayers });
          }
      }
  };

  const calculateDuration = (start: string, end: string): number => {
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      const totalMinutes1 = h1 * 60 + m1;
      const totalMinutes2 = h2 * 60 + m2;
      return totalMinutes2 - totalMinutes1;
  };

  const handleItemStartTimeChange = (item: ScheduleItem, newStart: string) => {
      // If it's assembly, update assemblyTime
       if (item.type === 'assembly') {
           updateTiming({ assemblyTime: newStart });
       } else {
           // For others, set custom start time
           updateTiming({ customStartTimes: { ...currentTiming.customStartTimes, [item.id]: newStart } });
       }
  };

  const handleItemEndTimeChange = (item: ScheduleItem, newEnd: string) => {
      const newDuration = calculateDuration(item.startTime, newEnd);
      if (newDuration > 0) {
          handleItemDurationChange(item, newDuration);
      }
  };

  const handleItemDurationChange = (item: ScheduleItem, newDuration: number) => {
      if (item.type === 'period') {
          updateTiming({ customDurations: { ...currentTiming.customDurations, [item.originalIndex!]: newDuration } });
      } else if (item.type === 'break') {
          const newBreaks = [...(currentTiming.breaks || [])];
          newBreaks[item.originalIndex!] = { ...newBreaks[item.originalIndex!], duration: newDuration };
          updateTiming({ breaks: newBreaks });
      } else if (item.type === 'prayer') {
          const newPrayers = [...(currentTiming.prayers || [])];
          if (newPrayers[item.originalIndex!]) {
              newPrayers[item.originalIndex!] = { ...newPrayers[item.originalIndex!], duration: newDuration };
              updateTiming({ prayers: newPrayers });
          }
      }
  };
  
  const handleAddNewBreak = (afterPeriod: number) => {
      const newBreak: BreakInfo = { 
          id: Math.random().toString(), 
          name: 'فسحة', 
          duration: 25, 
          afterPeriod: 2 
      };
      updateTiming({ breaks: [...(currentTiming.breaks || []), newBreak] });
  };

  /**
   * إضافة صف جديد (فعالية) مباشرةً أسفل الصف الحالي مع إعادة ترتيب التوقيت ذكياً.
   * - يحدد afterPeriod للفعالية الجديدة بناءً على موضع الصف الحالي.
   * - يدرج الفعالية في الموضع الصحيح داخل مصفوفة breaks.
   * - يُزيح أوقات البداية المخصصة للصفوف التالية بمقدار مدة الفعالية الجديدة حتى لا يحدث تداخل.
   */
  const handleAddRowBelow = (item: ScheduleItem, currentIndex: number) => {
      const newBreakId = Math.random().toString();
      const newBreakDuration = 15;
      const newAfterPeriod = item.relatedPeriodIndex;

      const currentBreaks = [...(currentTiming.breaks || [])];

      // تحديد موضع الإدراج في مصفوفة breaks
      let insertIndex: number;

      if (item.type === 'break' && item.originalIndex !== undefined) {
          // أدرج مباشرة بعد هذه الفسحة في المصفوفة
          insertIndex = item.originalIndex + 1;
      } else {
          // ابحث عن آخر فسحة ذات afterPeriod <= newAfterPeriod وأدرج بعدها
          insertIndex = 0;
          for (let i = currentBreaks.length - 1; i >= 0; i--) {
              if (currentBreaks[i].afterPeriod <= newAfterPeriod) {
                  insertIndex = i + 1;
                  break;
              }
          }
      }

      const newBreak: BreakInfo = {
          id: newBreakId,
          name: 'فعالية جديدة',
          duration: newBreakDuration,
          afterPeriod: newAfterPeriod,
      };

      currentBreaks.splice(insertIndex, 0, newBreak);

      // إزاحة أوقات البداية المخصصة للصفوف التي تأتي بعد الصف الحالي
      // حتى يتناسب التوقيت مع الفعالية المضافة
      const newCustomStartTimes = { ...currentTiming.customStartTimes };
      const itemsAfter = schedule.slice(currentIndex + 1);
      itemsAfter.forEach(afterItem => {
          if (newCustomStartTimes[afterItem.id]) {
              newCustomStartTimes[afterItem.id] = addMinutes(
                  newCustomStartTimes[afterItem.id],
                  newBreakDuration
              );
          }
      });

      updateTiming({
          breaks: currentBreaks,
          customStartTimes: newCustomStartTimes,
      });
  };

  const handleAddNewPrayer = (afterPeriod: number) => {
       const newPrayer: PrayerInfo = {
           id: Math.random().toString(),
           name: 'الصلاة',
           duration: 20,
           afterPeriod,
           isEnabled: false
       };
       updateTiming({ prayers: [...(currentTiming.prayers || []), newPrayer] });
  };

  const handleDeleteItem = (item: ScheduleItem) => {
      if (item.type === 'break') {
          const newBreaks = currentTiming.breaks.filter((_, idx) => idx !== item.originalIndex);
          updateTiming({ breaks: newBreaks });
      } else if (item.type === 'prayer') {
           const newPrayers = currentTiming.prayers.filter((_, idx) => idx !== item.originalIndex);
           updateTiming({ prayers: newPrayers });
      } else if (item.type === 'assembly') {
           updateTiming({ hasAssembly: false });
      } else if (item.type === 'period') {
           // Reduce count for all days
           const newCounts: Record<string, number> = {};
           Object.entries(currentTiming.periodCounts || {}).forEach(([day, count]) => {
               newCounts[day] = Math.max(0, count - 1);
           });
           updateTiming({ periodCounts: newCounts });
      }
  };

  // --- Save Handler --- //
  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('schoolInfo', JSON.stringify(schoolInfo));
    
    // Show success notification
    setShowSaveNotification(true);
    setTimeout(() => setShowSaveNotification(false), 3000);
  };

  // --- Print Handler --- //
  const handlePrint = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const title = currentTiming.season === 'summer' ? 'التوقيت الصيفي' : currentTiming.season === 'winter' ? 'التوقيت الشتوي' : 'توقيت رمضان';
      const themeColor = currentTiming.season === 'summer' ? '#f59e0b' : currentTiming.season === 'winter' ? '#2a93d5' : '#3bb273';
      const bgColor = currentTiming.season === 'summer' ? '#fffbeb' : currentTiming.season === 'winter' ? '#eaf6fd' : '#ebf9f2';

      // Current date in Gregorian and Hijri
      const now = new Date();
      const gregDate = now.toLocaleDateString('ar-SA-u-ca-gregory', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const dayName = now.toLocaleDateString('ar-SA', { weekday: 'long' });

      // Semester label
      const currentSemester = (schoolInfo.semesters || []).find(s => s.id === schoolInfo.currentSemesterId);
      const semesterLabel = currentSemester?.name || '';

      // Ministry of Education logo SVG (simplified)
      const moeLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="80" height="80">
        <circle cx="50" cy="50" r="48" fill="none" stroke="#1a5276" stroke-width="3"/>
        <text x="50" y="38" text-anchor="middle" font-size="9" font-weight="bold" fill="#1a5276" font-family="Tajawal,sans-serif">وزارة</text>
        <text x="50" y="52" text-anchor="middle" font-size="9" font-weight="bold" fill="#1a5276" font-family="Tajawal,sans-serif">التعليم</text>
        <text x="50" y="66" text-anchor="middle" font-size="7" fill="#1a5276" font-family="Tajawal,sans-serif">المملكة العربية</text>
        <text x="50" y="78" text-anchor="middle" font-size="7" fill="#1a5276" font-family="Tajawal,sans-serif">السعودية</text>
      </svg>`;

      const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
            * { box-sizing: border-box; }
            @page { size: A4 portrait; margin: 10mm 12mm; }
            html, body { width: 210mm; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; font-size: 11px; }
            .page-wrapper { width: 100%; padding: 0; }
            .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 2px solid ${themeColor}; padding-bottom: 8px; }
            .header-right { text-align: right; }
            .header-right p { margin: 2px 0; font-size: 10px; font-weight: bold; color: #1e293b; }
            .header-right p span { color: #334155; }
            .header-center { text-align: center; flex: 0 0 70px; display: flex; flex-direction: column; align-items: center; }
            .header-left { text-align: left; }
            .header-left p { margin: 2px 0; font-size: 10px; font-weight: bold; color: #1e293b; }
            .header-left p span { color: #334155; }
            .schedule-title { text-align: center; margin: 6px 0 8px; }
            .schedule-title h2 { font-size: 14px; font-weight: 900; color: #1e293b; margin: 0 0 3px; }
            .schedule-title .season-badge { display: inline-block; background: ${bgColor}; color: #1e293b; border: 1px solid ${themeColor}; border-radius: 5px; padding: 1px 10px; font-size: 10px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th { background: ${bgColor}; color: #1e293b; font-weight: 900; padding: 5px 8px; text-align: right; border: 1px solid ${themeColor}; font-size: 10px; }
            td { padding: 4px 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #334155; font-size: 10px; }
            .time-cell { text-align: center; direction: ltr; font-family: sans-serif; }
            .footer { display: flex; justify-content: flex-end; margin-top: 16px; }
            .signature { text-align: center; }
            .signature p { font-weight: bold; margin-bottom: 20px; color: #1e293b; font-size: 10px; }
            .signature .line { width: 140px; border-bottom: 1.5px solid #cbd5e1; margin: 0 auto; }
            .notes { background: ${bgColor}; padding: 6px 10px; border-radius: 5px; border: 1px solid ${themeColor}; margin-top: 8px; font-size: 10px; }
            @media print {
               .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="page-header">
            <!-- Right side -->
            <div class="header-right">
              <p>المملكة العربية السعودية</p>
              <p>وزارة التعليم</p>
              <p>إدارة التعليم بمنطقة <span>${schoolInfo.region || ''}</span></p>
              <p>المدرسة: <span>${schoolInfo.schoolName || ''}</span></p>
            </div>
            <!-- Center: logo -->
            <div class="header-center">
              ${moeLogo}
            </div>
            <!-- Left side -->
            <div class="header-left">
              <p>العام الدراسي: <span>${schoolInfo.academicYear || ''}</span></p>
              ${semesterLabel ? `<p>الفصل الدراسي: <span>${semesterLabel}</span></p>` : ''}
              <p>اليوم: <span>${dayName}</span></p>
              <p>التاريخ: <span>${hijriDate}</span></p>
              <p style="font-size:11px;color:#64748b;">${gregDate}</p>
            </div>
          </div>

          <div class="schedule-title">
            <h2>التوقيت الزمني</h2>
            <span class="season-badge">${title}</span>
          </div>

          <table>
             <thead>
                <tr>
                   <th style="width: 55px;">#</th>
                   <th>الفعالية / الحصة</th>
                   <th style="width: 140px; text-align: center;">بداية الوقت</th>
                   <th style="width: 140px; text-align: center;">نهاية الوقت</th>
                   <th style="width: 100px; text-align: center;">المدة</th>
                </tr>
             </thead>
             <tbody>
                ${schedule.map((item, idx) => `
                   ${!printOptions.showBreaks && item.type === 'break' ? '' :
                     !printOptions.showPrayer && item.type === 'prayer' ? '' :
                    `<tr>
                      <td>${idx + 1}</td>
                      <td>${item.name}</td>
                      <td class="time-cell">${item.startTime}</td>
                      <td class="time-cell">${item.endTime}</td>
                      <td style="text-align: center;">${item.duration} دقيقة</td>
                    </tr>`
                   }
                `).join('')}
             </tbody>
          </table>

          ${currentTiming.notes && printOptions.showNotes ? `
             <div class="notes">
                <strong>ملاحظات:</strong>
                <p>${currentTiming.notes}</p>
             </div>
          ` : ''}

          <div class="footer">
             <div class="signature">
                <p>مدير المدرسة</p>
                <p>${schoolInfo.principal || ''}</p>
                <div class="line"></div>
                <p style="margin-top:8px;font-size:11px;color:#94a3b8;">التوقيع</p>
             </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
  };

  const getSeasonTitle = () => {
      switch(currentTiming.season) {
          case 'summer': return 'التوقيت الصيفي';
          case 'winter': return 'التوقيت الشتوي';
          case 'ramadan': return 'توقيت رمضان';
          default: return 'الجدول الدراسي';
      }
  };

  const getSeasonIcon = () => {
      switch(currentTiming.season) {
          case 'summer': return <Sun size={32} className="text-amber-500" />;
          case 'winter': return <Snowflake size={32} className="text-[#2a93d5]" />;
          case 'ramadan': return <Moon size={32} className="text-[#3bb273]" />;
          default: return <Clock size={32} className="text-slate-500" />;
      }
  };

  const WeeklyTotal = Object.entries(currentTiming.periodCounts || {}).reduce((sum, [day, count]) => {
      return (currentTiming.activeDays || []).includes(day) ? sum + count : sum;
  }, 0);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Save Notification */}
      {showSaveNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <CheckCircle size={20} />
            <span className="font-bold">تم حفظ التوقيت بنجاح</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#8779fb]/10 rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>
          
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <Clock size={36} strokeWidth={1.8} className="text-[#655ac1]" />
             إدارة التوقيت الزمني لليوم الدراسي
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إنشاء التوقيت وتخصيصه</p>
      </div>
      
      {/* 1. Configuration Section */}
      <div className="space-y-6 print:hidden">
         
          <div className="space-y-6">
                  {/* School Tabs - always visible for shared schools */}
                  {schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0 && (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                          <SchoolTabs
                              schoolInfo={schoolInfo}
                              activeSchoolId={activeTab}
                              onTabChange={setActiveTab}
                          />
                      </div>
                  )}

                  {/* Shared School Mode Selection - Separate Card */}
                  {schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0 && (
                      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                              <Split size={20} className="text-[#655ac1]" /> نظام التوقيت للمدارس المشتركة
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Option 1: Unified Timing */}
                              <div
                                  onClick={() => handleSharedModeChange('unified')}
                                  className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-center gap-4 group ${
                                      (currentTiming.sharedSchoolMode || 'unified') === 'unified'
                                      ? 'bg-white border-[#655ac1] shadow-md'
                                      : 'bg-white border-slate-100 hover:border-[#655ac1]/30 hover:bg-slate-50'
                                  }`}
                              >
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                                      (currentTiming.sharedSchoolMode || 'unified') === 'unified'
                                      ? 'bg-[#655ac1] text-white'
                                      : 'bg-slate-100 text-slate-400 group-hover:bg-[#e5e1fe] group-hover:text-[#655ac1]'
                                  }`}>
                                      <Link size={24} />
                                  </div>
                                  <div>
                                      <h4 className={`text-base font-black mb-1 ${
                                          (currentTiming.sharedSchoolMode || 'unified') === 'unified' ? 'text-[#655ac1]' : 'text-slate-700'
                                      }`}>
                                          توقيت موحد للجميع
                                      </h4>
                                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                          جميع المدارس المشتركة تتبع نفس الجدول وتوقيت الحصص.
                                      </p>
                                  </div>
                                  {(currentTiming.sharedSchoolMode || 'unified') === 'unified' && (
                                      <div className="absolute top-4 left-4 bg-[#655ac1] text-white rounded-full p-1">
                                          <Check size={12} />
                                      </div>
                                  )}
                              </div>

                              {/* Option 2: Separate Timing */}
                              <div
                                  onClick={() => handleSharedModeChange('separate')}
                                  className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-center gap-4 group ${
                                      currentTiming.sharedSchoolMode === 'separate'
                                      ? 'bg-white border-[#655ac1] shadow-md'
                                      : 'bg-white border-slate-100 hover:border-[#655ac1]/30 hover:bg-slate-50'
                                  }`}
                              >
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                                      currentTiming.sharedSchoolMode === 'separate'
                                      ? 'bg-[#655ac1] text-white'
                                      : 'bg-slate-100 text-slate-400 group-hover:bg-[#e5e1fe] group-hover:text-[#655ac1]'
                                  }`}>
                                      <Split size={24} />
                                  </div>
                                  <div>
                                      <h4 className={`text-base font-black mb-1 ${
                                          currentTiming.sharedSchoolMode === 'separate' ? 'text-[#655ac1]' : 'text-slate-700'
                                      }`}>
                                          توقيت مستقل لكل مدرسة
                                      </h4>
                                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                          يمكنك تخصيص توقيت الحصص والفسح لكل مدرسة بشكل منفصل.
                                      </p>
                                  </div>
                                  {currentTiming.sharedSchoolMode === 'separate' && (
                                      <div className="absolute top-4 left-4 bg-[#655ac1] text-white rounded-full p-1">
                                          <Check size={12} />
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  )}

                  {/* Days & Periods - Full Width */}
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                 <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                          <Calendar size={20} className="text-[#655ac1]" /> الأيام والحصص
                      </h3>
                  </div>




                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-20">
                      {DAYS_OF_WEEK.map(day => {
                          const isActive = (currentTiming.activeDays || []).includes(day.id);
                          const periodCount = currentTiming.periodCounts?.[day.id] || 0;
                          
                          return (
                              <div 
                                key={day.id} 
                                onClick={() => toggleDay(day.id)}
                                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300 cursor-pointer relative overflow-hidden group ${
                                    isActive 
                                    ? 'bg-white border-slate-200 shadow-md scale-105 z-10' 
                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                                }`}
                              >
                                  {/* Selection Checkmark Background */}
                                  {isActive && (
                                    <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#e5e1fe] rounded-full flex items-center justify-center">
                                       <Check size={14} className="text-[#655ac1] mt-2 ml-2" />
                                    </div>
                                  )}

                                  <div className="mb-2 text-center">
                                      <span className={`block font-black text-sm ${isActive ? 'text-[#655ac1]' : 'text-slate-400'}`}>
                                          {day.label}
                                      </span>
                                  </div>

                                  {isActive ? (
                                      <div className="flex items-center gap-2 w-full justify-center animate-in slide-in-from-bottom-2 duration-300" onClick={(e) => e.stopPropagation()}>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); updatePeriodCount(day.id, periodCount - 1); }}
                                            className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all font-bold"
                                            disabled={periodCount <= 0}
                                          >
                                              -
                                          </button>
                                          
                                          <div className="text-center w-8">
                                              <span className="block text-lg font-black text-slate-800">{periodCount}</span>
                                          </div>

                                          <button 
                                            onClick={(e) => { e.stopPropagation(); updatePeriodCount(day.id, periodCount + 1); }}
                                            className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-[#655ac1] hover:border-[#e5e1fe] transition-all font-bold"
                                            disabled={periodCount >= 12}
                                          >
                                              +
                                          </button>
                                      </div>
                                  ) : (
                                      <div className="text-center text-xs text-slate-300 font-bold py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          اضغط للتفعيل
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>

                   {/* Weekly Total - Bottom Left */}
                   <div className="absolute bottom-4 right-4 bg-white text-[#655ac1] px-4 py-1 rounded-xl text-xs font-black shadow-sm flex items-center gap-2 border border-[#8779fb]">
                      <span className="text-[#655ac1]">الإجمالي الأسبوعي:</span>
                      <span className="text-xl text-[#655ac1]">{WeeklyTotal}</span>
                      <span className="text-[10px] text-[#8779fb] opacity-75">حصة</span>
                   </div>
              </div>
              </div>
              
              {/* Settings Group - Time, Breaks, Prayers */}
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                   <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                       <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                           <Settings size={20} className="text-[#655ac1]" />
                           إعدادات التوقيت
                       </h2>
                   </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-100">
                      
                      {/* Column 1: Time Settings */}
                      <div className="lg:pl-6">
                         <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6">
                             <Clock size={20} className="text-[#655ac1]" /> التوقيت الزمني
                         </h3>
                         <div className="space-y-4">
                             <div className="space-y-2">
                                 <label className="text-xs font-bold text-slate-500">النمط الفصلي</label>
                                 <select value={currentTiming.season || 'summer'} onChange={(e) => updateTiming({ season: e.target.value as any })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[#8779fb] transition-all">
                                     <option value="summer">☀️ التوقيت الصيفي</option>
                                     <option value="winter">☁️ التوقيت الشتوي</option>
                                     <option value="ramadan">🌙 توقيت رمضان</option>
                                 </select>
                             </div>
                              <div className="space-y-2">
                                 <label className="text-xs font-bold text-slate-500">بداية الاصطفاف</label>
                                  <input type="time" value={currentTiming.assemblyTime || '06:45'} onChange={(e) => updateTiming({ assemblyTime: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none text-center dir-ltr focus:border-[#8779fb] transition-all" />
                             </div>
                              <div className="space-y-2">
                                 <label className="text-xs font-bold text-slate-500">مدة الحصة (دقيقة)</label>
                                  <input type="number" value={currentTiming.periodDuration || 45} onChange={(e) => updateTiming({ periodDuration: parseInt(e.target.value) })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none text-center focus:border-[#8779fb] transition-all" />
                             </div>
                         </div>
                      </div>

                      {/* Column 2: Break Settings */}
                      <div className="pt-6 lg:pt-0 lg:px-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <Utensils size={20} className="text-[#655ac1]" /> إعدادات الفسح
                                </h3>
                                <div className="text-[10px] bg-[#e5e1fe] text-[#655ac1] px-2 py-1 rounded-lg font-bold">
                                    {currentTiming.breaks?.length || 0}
                                </div>
                            </div>
                            <button 
                                 onClick={() => handleAddNewBreak(2)} 
                                 className="text-xs flex items-center gap-1 bg-[#e5e1fe] text-[#655ac1] px-3 py-1.5 rounded-lg font-bold hover:bg-[#8779fb] hover:text-white transition-colors"
                            >
                                 <Plus size={14} /> إضافة
                            </button>
                        </div>
                        
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {currentTiming.breaks?.map((b, idx) => (
                                <div key={b.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:border-[#8779fb]/50 transition-all">
                                    {confirmDeleteBreak === idx ? (
                                        <div className="p-3 bg-rose-50 flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold text-rose-600">حذف "{b.name}"؟</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => { const nb = currentTiming.breaks?.filter((_, i) => i !== idx); updateTiming({ breaks: nb }); setConfirmDeleteBreak(null); }} className="text-xs bg-rose-500 text-white px-3 py-1 rounded-lg font-bold hover:bg-rose-600 transition-colors">حذف</button>
                                                <button onClick={() => setConfirmDeleteBreak(null)} className="text-xs bg-white text-slate-600 border border-slate-200 px-3 py-1 rounded-lg font-bold hover:bg-slate-50 transition-colors">إلغاء</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    value={b.name}
                                                    onChange={(e) => { const nb = [...(currentTiming.breaks || [])]; nb[idx] = { ...nb[idx], name: e.target.value }; updateTiming({ breaks: nb }); }}
                                                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 text-xs outline-none focus:border-[#8779fb] focus:bg-white transition-all"
                                                    placeholder="مسمى الفسحة"
                                                />
                                                <button onClick={() => setConfirmDeleteBreak(idx)} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0" title="حذف">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">بعد الحصة</label>
                                                    <select value={b.afterPeriod} onChange={(e) => { const nb = [...(currentTiming.breaks || [])]; nb[idx] = { ...nb[idx], afterPeriod: parseInt(e.target.value) }; updateTiming({ breaks: nb }); }} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 text-xs outline-none focus:border-[#8779fb] transition-all">
                                                        {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">المدة (د)</label>
                                                    <input type="number" value={b.duration} onChange={(e) => { const nb = [...(currentTiming.breaks || [])]; nb[idx] = { ...nb[idx], duration: parseInt(e.target.value) }; updateTiming({ breaks: nb }); }} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 text-xs outline-none focus:border-[#8779fb] transition-all text-center" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {(!currentTiming.breaks || currentTiming.breaks.length === 0) && (
                                <div className="text-center p-4 text-slate-400 text-sm font-bold border-2 border-dashed border-slate-100 rounded-xl">
                                    لا توجد فسح مضافة
                                </div>
                            )}
                        </div>
                      </div>
                      
                      {/* Column 3: Prayer Settings */}
                      <div className="pt-6 lg:pt-0 lg:pr-6">
                          <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                  <Sunset size={20} className="text-[#655ac1]" /> إعدادات الصلاة
                              </h3>
                              <button 
                                 onClick={() => handleAddNewPrayer(6)} 
                                 className="text-xs flex items-center gap-1 bg-[#e5e1fe] text-[#655ac1] px-3 py-1.5 rounded-lg font-bold hover:bg-[#8779fb] hover:text-white transition-colors"
                             >
                                 <Plus size={14} /> إضافة
                             </button>
                          </div>
                          
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {currentTiming.prayers?.map((p, idx) => (
                                  <div key={p.id} className={`rounded-xl border overflow-hidden transition-all ${p.isEnabled ? 'border-[#e5e1fe]' : 'border-slate-200'}`}>
                                      {confirmDeletePrayer === idx ? (
                                          <div className="p-3 bg-rose-50 flex items-center justify-between gap-2">
                                              <span className="text-xs font-bold text-rose-600">حذف "{p.name}"؟</span>
                                              <div className="flex gap-2">
                                                  <button onClick={() => { const np = currentTiming.prayers?.filter((_, i) => i !== idx); updateTiming({ prayers: np }); setConfirmDeletePrayer(null); }} className="text-xs bg-rose-500 text-white px-3 py-1 rounded-lg font-bold hover:bg-rose-600 transition-colors">حذف</button>
                                                  <button onClick={() => setConfirmDeletePrayer(null)} className="text-xs bg-white text-slate-600 border border-slate-200 px-3 py-1 rounded-lg font-bold hover:bg-slate-50 transition-colors">إلغاء</button>
                                              </div>
                                          </div>
                                      ) : (
                                          <div className={`p-3 space-y-2 ${p.isEnabled ? 'bg-[#e5e1fe]/20' : 'bg-slate-50'}`}>
                                              {/* Header row: toggle + name + delete */}
                                              <div className="flex items-center gap-2">
                                                  <button
                                                      onClick={() => { const np = [...(currentTiming.prayers || [])]; np[idx] = { ...np[idx], isEnabled: !np[idx].isEnabled }; updateTiming({ prayers: np }); }}
                                                      className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${p.isEnabled ? 'bg-[#e5e1fe] text-[#655ac1] border-[#8779fb]/30' : 'bg-white text-slate-400 border-slate-200 hover:border-[#8779fb] hover:text-[#655ac1]'}`}
                                                      title={p.isEnabled ? 'إلغاء التفعيل' : 'تفعيل'}
                                                  >
                                                      {p.isEnabled ? <CheckCircle size={12} /> : <div className="w-3 h-3 rounded-full border-2 border-slate-300" />}
                                                      {p.isEnabled ? 'مفعّل' : 'غير مفعّل'}
                                                  </button>
                                                  <input
                                                      type="text"
                                                      value={p.name}
                                                      onChange={(e) => { const np = [...(currentTiming.prayers || [])]; np[idx] = { ...np[idx], name: e.target.value }; updateTiming({ prayers: np }); }}
                                                      className="flex-1 p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-[#8779fb] transition-all text-slate-700"
                                                      placeholder="اسم الصلاة"
                                                  />
                                                  <button onClick={() => setConfirmDeletePrayer(idx)} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0" title="حذف">
                                                      <Trash2 size={15} />
                                                  </button>
                                              </div>
                                              <div className="grid grid-cols-2 gap-2">
                                                  <div>
                                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">بعد الحصة</label>
                                                      <select value={p.afterPeriod} onChange={(e) => { const np = [...(currentTiming.prayers || [])]; np[idx] = { ...np[idx], afterPeriod: parseInt(e.target.value) }; updateTiming({ prayers: np }); }} className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-[#8779fb] transition-all text-slate-700">
                                                          {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                                                      </select>
                                                  </div>
                                                  <div>
                                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">المدة (د)</label>
                                                      <input type="number" value={p.duration} onChange={(e) => { const np = [...(currentTiming.prayers || [])]; np[idx] = { ...np[idx], duration: parseInt(e.target.value) }; updateTiming({ prayers: np }); }} className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-[#8779fb] transition-all text-center text-slate-700" />
                                                  </div>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              ))}
                               {(!currentTiming.prayers || currentTiming.prayers.length === 0) && (
                                  <div className="text-center p-4 text-slate-400 text-sm font-bold border-2 border-dashed border-slate-100 rounded-xl">
                                      لا توجد صلوات مضافة
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>

      {/* 2. Interactive Schedule Table */}
      <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-700">
        <div className="w-full bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 relative">
            
            {/* Header */}
            <div 
                className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4 w-full cursor-pointer group select-none"
                onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
            >
                <div className="flex items-center gap-4">
                    {getSeasonIcon()}
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            {getSeasonTitle()}
                            <span className={`text-xs px-2 py-1 rounded-lg transition-colors ${isScheduleExpanded ? 'bg-rose-100 text-rose-600' : 'bg-[#e5e1fe] text-[#655ac1]'}`}>
                                {isScheduleExpanded ? 'إغلاق الجدول' : 'فتح الجدول'}
                            </span>
                        </h1>
                        <p className="text-sm text-slate-500 font-bold group-hover:text-[#655ac1] transition-colors">
                            الجدول التفاعلي - اضغط هنا {isScheduleExpanded ? 'لإخفاء' : 'لعرض'} التفاصيل
                        </p>
                    </div>
                </div>
                <div className={`transition-transform duration-300 ${isScheduleExpanded ? 'rotate-180' : ''}`}>
                     <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#e5e1fe] group-hover:text-[#655ac1] transition-colors">
                         <Settings size={20} />
                     </div>
                </div>
            </div>

            {/* Collapsible Content */}
            <div className={`transition-all duration-500 overflow-hidden ${isScheduleExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            
             {/* Edit Indicator */}
             <div className="mb-4 flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 p-2 rounded-lg w-fit mx-auto">
                 <Settings size={14} />
                 يمكنك تعديل أوقات البداية والنهاية ومسميات الفعاليات يدوياً من الجدول أدناه
             </div>

            {/* Schedule Table */}
            <div className={`overflow-hidden rounded-2xl border ${theme.border} shadow-sm bg-white w-full transition-colors duration-300`}>
                <table className="w-full">
                    <thead className={`${theme.bg} ${theme.text} border-b ${theme.border}`}>
                        <tr>
                            <th className="px-6 py-4 text-right text-sm font-black w-16">#</th>
                            <th className="px-6 py-4 text-right text-sm font-black">الفعالية</th>
                            <th className="px-6 py-4 text-center text-sm font-black w-32">البداية</th>
                            <th className="px-6 py-4 text-center text-sm font-black w-32">النهاية</th>
                            <th className="px-6 py-4 text-center text-sm font-black w-32">المدة (د)</th>
                            <th className="px-6 py-4 text-center text-sm font-black w-32">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${currentTiming.season === 'winter' ? 'divide-[#2a93d5]/10' : currentTiming.season === 'ramadan' ? 'divide-[#3bb273]/10' : 'divide-amber-100'}`}>
                        {schedule.map((item, index) => (
                            <tr key={item.id} className={`${theme.rowHover} transition-colors group`}>
                                <td className="px-6 py-4 text-sm font-bold text-slate-400">{index + 1}</td>
                                <td className="px-6 py-4">
                                    <input 
                                        value={item.name}
                                        onChange={(e) => handleItemNameChange(item, e.target.value)}
                                        className={`w-full bg-transparent font-bold text-slate-800 text-base outline-none border-b border-transparent ${theme.inputFocus} px-1`}
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <input 
                                        type="time" 
                                        value={item.startTime}
                                        onChange={(e) => handleItemStartTimeChange(item, e.target.value)}
                                        className={`font-bold text-slate-600 dir-ltr bg-transparent outline-none text-center w-full px-2 py-1 text-sm rounded hover:bg-white focus:bg-white transition-colors ${theme.inputFocus}`}
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                      <input 
                                        type="time" 
                                        value={item.endTime}
                                        onChange={(e) => handleItemEndTimeChange(item, e.target.value)}
                                        className={`font-bold text-slate-600 dir-ltr bg-transparent outline-none text-center w-full px-2 py-1 text-sm rounded hover:bg-white focus:bg-white transition-colors ${theme.inputFocus}`}
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <input 
                                        type="number"
                                        value={item.duration}
                                        onChange={(e) => handleItemDurationChange(item, parseInt(e.target.value))}
                                        className={`w-16 mx-auto bg-transparent text-center font-bold text-slate-600 text-sm outline-none border-b border-transparent ${theme.inputFocus}`}
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {/* Add Below Button */}
                                        <div className="relative group/tooltip">
                                          <button
                                            onClick={() => handleAddRowBelow(item, index)}
                                            className="text-[#655ac1] hover:text-[#8779fb] p-1.5 rounded-lg hover:bg-[#e5e1fe] transition-colors"
                                            title="إضافة فعالية"
                                          >
                                            <Plus size={18} />
                                          </button>
                                          <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-44 bg-white text-[#655ac1] text-xs rounded-xl px-3 py-2 font-bold opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-20 text-center leading-relaxed shadow-lg border border-[#8779fb]/30">
                                            أضف فعالية: حصة - فسحة - ...
                                            <div className="absolute top-full right-1/2 translate-x-1/2 border-4 border-transparent border-t-white"></div>
                                          </div>
                                        </div>

                                        {/* Delete Button - ALWAYS visible for all removable items */}
                                        <button 
                                            onClick={() => handleDeleteItem(item)}
                                            className="text-rose-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                            title="حذف"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Notes Section */}
            <div className="mt-8 bg-white border border-slate-300 rounded-2xl p-6 w-full shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-slate-500 font-bold">
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs">i</div>
                    الملاحظات
                </div>
                <textarea
                    value={currentTiming.notes || ''}
                    onChange={(e) => updateTiming({ notes: e.target.value })}
                    placeholder="أضف ملاحظات تعليمية أو إدارية تظهر في الطباعة..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-4 text-sm font-medium text-slate-500 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none min-h-[80px]"
                />
            </div>

             {/* Print Options Footer */}
             <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                   <button onClick={handlePrint} className="flex items-center gap-2 px-8 py-3 bg-[#655ac1] hover:bg-[#52499d] text-white rounded-xl text-md font-bold shadow-md shadow-indigo-200 transition-all">
                       <Printer size={20} />
                       طباعة الجدول
                   </button>
             </div>
              
             </div> {/* End of Collapsible Content */}
        </div>

        <div className="mt-6 w-full self-stretch flex">
            <button onClick={handleSave} className="mr-auto flex items-center gap-2 px-8 py-3 bg-[#655ac1] hover:bg-[#52499d] text-white rounded-xl text-md font-bold shadow-md shadow-indigo-200 transition-all">
                <Save size={20} />
                حفظ التوقيت
            </button>
        </div>
      </div>
    </div>
  );
};

export default TimingSettings;
