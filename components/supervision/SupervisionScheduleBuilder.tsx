import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar, Users, MapPin, Plus, X, Copy, Trash2, RotateCcw,
  ChevronDown, ChevronUp, Zap, RefreshCw, Minus, Check,
  AlertTriangle, UserPlus, Search, Shield, Save, CheckCircle,
  MessageSquare, Send, Bell, Hourglass, PenLine, Clock
} from 'lucide-react';
import {
  SchoolInfo, Teacher, Admin, ScheduleSettingsData,
  SupervisionScheduleData, SupervisionDayAssignment, SupervisionStaffAssignment
} from '../../types';
import { Badge } from '../ui/Badge';
import {
  DAYS, DAY_NAMES, getTimingConfig, getAvailableStaff,
  generateSmartAssignment, getBalanceInfo
} from '../../utils/supervisionUtils';

interface Props {
  supervisionData: SupervisionScheduleData;
  setSupervisionData: React.Dispatch<React.SetStateAction<SupervisionScheduleData>>;
  teachers: Teacher[];
  admins: Admin[];
  scheduleSettings: ScheduleSettingsData;
  schoolInfo: SchoolInfo;
  suggestedCount: number;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const SupervisionScheduleBuilder: React.FC<Props> = ({
  supervisionData, setSupervisionData, teachers, admins,
  scheduleSettings, schoolInfo, suggestedCount, showToast
}) => {
  const [showAddPanel, setShowAddPanel] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState('');
  const [showFollowUpPicker, setShowFollowUpPicker] = useState<string | null>(null);
  const [followUpSearch, setFollowUpSearch] = useState('');
  const [bulkLocationId, setBulkLocationId] = useState('');
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  const [assignmentBannerDismissed, setAssignmentBannerDismissed] = useState(false);
  
  // For manual multi-select within a day
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  const timing = getTimingConfig(schoolInfo);
  const activeDays = timing.activeDays || DAYS.slice();
  const dayAssignments = supervisionData.dayAssignments;
  const activeLocations = supervisionData.locations.filter(l => l.isActive);
  const enabledPeriods = supervisionData.periods.filter(p => p.isEnabled);

  const availableStaff = useMemo(
    () => getAvailableStaff(teachers, admins, supervisionData.exclusions, supervisionData.settings),
    [teachers, admins, supervisionData.exclusions, supervisionData.settings]
  );

  const assignedStaffIds = useMemo(() => {
    const ids = new Set<string>();
    dayAssignments.forEach(da => da.staffAssignments.forEach(sa => ids.add(sa.staffId)));
    return ids;
  }, [dayAssignments]);

  const unassignedStaff = useMemo(() => {
    return availableStaff.filter(s => !assignedStaffIds.has(s.id));
  }, [availableStaff, assignedStaffIds]);

  const getDayAssignment = (day: string): SupervisionDayAssignment => {
    return dayAssignments.find(d => d.day === day) || { day, staffAssignments: [] };
  };

  const updateDayAssignment = (day: string, updater: (da: SupervisionDayAssignment) => SupervisionDayAssignment) => {
    setSupervisionData(prev => {
      const existing = prev.dayAssignments.find(d => d.day === day);
      if (existing) {
        return {
          ...prev,
          dayAssignments: prev.dayAssignments.map(d => d.day === day ? updater(d) : d),
        };
      } else {
        return {
          ...prev,
          dayAssignments: [...prev.dayAssignments, updater({ day, staffAssignments: [] })],
        };
      }
    });
  };

  const saveManualStaffAssignments = (day: string) => {
    if (selectedStaffIds.length === 0) {
       setShowAddPanel(null);
       return;
    }
    
    updateDayAssignment(day, da => {
      const newAssignments = selectedStaffIds.map(staffId => {
         const staff = availableStaff.find(s => s.id === staffId);
         if (!staff) return null;
         return {
            staffId: staff.id,
            staffName: staff.name,
            staffType: staff.type,
            locationIds: [],
            periodIds: enabledPeriods.map(p => p.id),
         };
      }).filter(Boolean) as SupervisionStaffAssignment[];
      
      return {
        ...da,
        staffAssignments: [...da.staffAssignments, ...newAssignments],
      };
    });
    
    setSelectedStaffIds([]);
    setShowAddPanel(null);
    setAddSearch('');
    showToast(`تم إضافة المشرفين بنجاح ليوم ${DAY_NAMES[day]}`, 'success');
  };

  const toggleStaffSelection = (staffId: string) => {
     setSelectedStaffIds(prev => 
       prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
     );
  };

  const removeStaffFromDay = (day: string, staffId: string) => {
    updateDayAssignment(day, da => ({
      ...da,
      staffAssignments: da.staffAssignments.filter(sa => sa.staffId !== staffId),
    }));
  };

  const setLocation = (day: string, staffId: string, locationId: string) => {
    updateDayAssignment(day, da => ({
      ...da,
      staffAssignments: da.staffAssignments.map(sa => {
        if (sa.staffId !== staffId) return sa;
        return { ...sa, locationIds: [locationId] }; // Single location assumed for the table select
      }),
    }));
  };

  const copyLocationToAllInDay = (day: string) => {
    if (!bulkLocationId) {
      showToast('الرجاء اختيار الموقع أولاً من شريط تعيين المواقع', 'warning');
      return;
    }
    updateDayAssignment(day, da => ({
      ...da,
      staffAssignments: da.staffAssignments.map(sa => ({ ...sa, locationIds: [bulkLocationId] }))
    }));
    showToast(`تم توحيد موقع الإشراف لجميع المشرفين في يوم ${DAY_NAMES[day]}`, 'success');
  };

  const copyLocationToAllDays = () => {
     if (!bulkLocationId) {
       showToast('الرجاء اختيار الموقع أولاً من شريط تعيين المواقع', 'warning');
       return;
     }
     setSupervisionData(prev => ({
        ...prev,
        dayAssignments: prev.dayAssignments.map(da => ({
           ...da,
           staffAssignments: da.staffAssignments.map(sa => ({ ...sa, locationIds: [bulkLocationId] }))
        }))
     }));
     showToast(`تم تطبيق موقع الإشراف المختار على جميع المشرفين في جميع الأيام`, 'success');
  };

  const clearLocations = (day?: string) => {
    setSupervisionData(prev => ({
      ...prev,
      dayAssignments: prev.dayAssignments.map(da => {
        if (day && da.day !== day) return da;
        return {
          ...da,
          staffAssignments: da.staffAssignments.map(sa => ({ ...sa, locationIds: [] }))
        };
      })
    }));
    if (day) {
      showToast(`تم استعادة ضبط مواقع الإشراف ليوم ${DAY_NAMES[day]}`, 'success');
    } else {
      showToast('تم استعادة ضبط مواقع الإشراف لجميع الأيام', 'success');
    }
  };

  const setFollowUpSupervisor = (day: string, staffId: string, staffName: string) => {
    updateDayAssignment(day, da => ({
      ...da,
      followUpSupervisorId: staffId,
      followUpSupervisorName: staffName,
    }));
    setShowFollowUpPicker(null);
    setFollowUpSearch('');
    // showToast(`تم تعيين ${staffName} مشرفاً متابعاً ليوم ${DAY_NAMES[day]}`, 'success');
  };

  const removeFollowUpSupervisor = (day: string) => {
    updateDayAssignment(day, da => ({
      ...da,
      followUpSupervisorId: undefined,
      followUpSupervisorName: undefined,
    }));
  };

  // Set this follow-up supervisor to ALL days
  const copyFollowUpToAllDays = (sourceDay: string) => {
    const da = getDayAssignment(sourceDay);
    if (!da.followUpSupervisorId || !da.followUpSupervisorName) return;
    
    setSupervisionData(prev => {
      const newAssignments = activeDays.map(day => {
        const existing = prev.dayAssignments.find(d => d.day === day) || { day, staffAssignments: [] };
        return {
           ...existing,
           followUpSupervisorId: da.followUpSupervisorId,
           followUpSupervisorName: da.followUpSupervisorName
        };
      });
      return { ...prev, dayAssignments: newAssignments };
    });
    showToast('تم تعيين المشرف المتابع لجميع الأيام', 'success');
  };

  const followUpCandidates = useMemo(() => {
    const candidates: { id: string; name: string; role?: string }[] = [];
    admins.forEach(a => candidates.push({ id: a.id, name: a.name, role: a.role }));
    teachers.forEach(t => candidates.push({ id: t.id, name: t.name, role: 'معلم' }));
    return candidates;
  }, [admins, teachers]);

  // Whether any staff has been assigned at all
  const hasAnyAssignments = dayAssignments.some(da => da.staffAssignments.length > 0);

  return (
    <div className="space-y-6">

      {/* ═══ Assignment Notification Banner ═══ */}
      {hasAnyAssignments && !assignmentBannerDismissed && (
        <div className="bg-gradient-to-l from-[#25D366]/10 via-[#e5e1fe]/20 to-[#007AFF]/10 border border-[#655ac1]/20 rounded-2xl p-4 flex items-center gap-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 shrink-0">
            <Bell size={20} className="text-[#655ac1]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-slate-800 flex items-center gap-2 flex-wrap">
              تم إنشاء جدول الإشراف
              <span className="text-slate-500 font-medium">يمكنك إشعار المشرفين بتكليفهم عبر زر</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                إرسال
                <span className="inline-flex items-center gap-1">
                  {/* WhatsApp real logo */}
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-[#25D366]/15 rounded-md">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="#25D366">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </span>
                  {/* SMS icon */}
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-[#007AFF]/15 rounded-md">
                    <Send size={11} className="text-[#007AFF]" />
                  </span>
                </span>
              </span>
            </p>
          </div>
          <button
            onClick={() => setAssignmentBannerDismissed(true)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            title="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

      )}

      {unassignedStaff.length > 0 && dayAssignments.some(da => da.staffAssignments.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start sm:items-center gap-3 animate-in slide-in-from-top-2 mb-6 shadow-sm">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl shrink-0 mt-1 sm:mt-0">
             <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
             <h4 className="text-sm font-bold text-amber-800">تنبيه: يوجد مشرفين غير مسندين</h4>
             <p className="text-xs text-amber-700 font-medium mt-0.5 leading-relaxed">
               يوجد ({unassignedStaff.length}) مشرفين متاحين لم يتم إضافتهم للجدول في أي يوم، ولم يتم استثناؤهم في الإعدادات.
             </p>
          </div>
        </div>
      )}
      
      {/* Bulk Location Assignment Toolbar */}
      {dayAssignments.some(da => da.staffAssignments.length > 0) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#655ac1] flex items-center justify-center">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">تعيين مواقع الإشراف بشكل سريع</h3>
              <p className="text-xs text-slate-500 font-medium">اختر موقعاً لتطبيقه بنقرة واحدة على كل الأيام أو لكل يوم</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <select
              value={bulkLocationId}
              onChange={(e) => setBulkLocationId(e.target.value)}
              className="w-full sm:w-64 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1]"
            >
              <option value="" disabled>1. اختر موقعاً...</option>
              {activeLocations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="hidden sm:block h-8 w-px bg-slate-200 mx-1"></div>
              <button
                onClick={copyLocationToAllDays}
                disabled={!bulkLocationId}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${bulkLocationId ? 'bg-[#e5e1fe] text-[#655ac1] hover:bg-[#c9c2fd] active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                title="تطبيق الموقع على جميع المشرفين في كافة الأيام"
              >
                <Calendar size={16} /> للكل
              </button>

              {/* Apply to a specific day dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDayDropdown(prev => !prev)}
                  disabled={!bulkLocationId}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${bulkLocationId ? 'bg-[#e5e1fe] text-[#655ac1] hover:bg-[#c9c2fd] active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                  title="تطبيق الموقع على يوم محدد"
                >
                  <Users size={16} /> تطبيق لليوم <ChevronDown size={14} />
                </button>
                {showDayDropdown && bulkLocationId && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDayDropdown(false)} />
                    <div className="absolute top-[calc(100%+0.5rem)] right-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] overflow-hidden min-w-[140px]">
                    {activeDays.map(day => (
                      <button
                        key={day}
                        onClick={() => { copyLocationToAllInDay(day); setShowDayDropdown(false); }}
                        className="w-full text-right px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-[#e5e1fe] hover:text-[#655ac1] transition-colors"
                      >
                        {DAY_NAMES[day]}
                      </button>
                    ))}
                    </div>
                  </>
                )}
              </div>

              {dayAssignments.some(da => da.staffAssignments.some(sa => sa.locationIds.length > 0)) && (
                <button
                  onClick={() => clearLocations()}
                  className="flex-none flex items-center justify-center p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all active:scale-95 border border-rose-100/50 hover:border-rose-200"
                  title="استعادة ضبط جميع المواقع"
                >
                  <RotateCcw size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Table Layout */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-black text-slate-700 w-32 border-l border-slate-200/60">اليوم</th>
                <th className="p-4 font-black text-slate-700 w-56 border-l border-slate-200/60">المشرف</th>
                <th className="p-4 font-black text-slate-700 w-52 border-l border-slate-200/60">موقع الإشراف</th>
                <th className="p-4 font-black text-slate-700 w-28 border-l border-slate-200/60 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <PenLine size={14} className="text-[#655ac1]" />
                    التوقيع
                  </div>
                </th>
                <th className="p-4 font-black text-slate-700 w-48 border-l border-slate-200/60">المشرف المتابع</th>
                <th className="p-4 font-black text-slate-700 w-28 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <PenLine size={14} className="text-amber-500" />
                    توقيع المتابع
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {activeDays.map((day, dayIndex) => {
                const da = getDayAssignment(day);
                const staffCount = da.staffAssignments.length;
                const showAdd = showAddPanel === day;
                const isFollowUpOpen = showFollowUpPicker === day;
                
                // All staff in a single column
                const allStaff = da.staffAssignments;
                
                // Rows needed for this day, or 1 if empty
                const rowsPerDay = Math.max(1, allStaff.length);

                return (
                  <React.Fragment key={day}>
                    {/* Render rows for the day */}
                    {Array.from({ length: rowsPerDay }).map((_, rowIndex) => {
                       const staff1 = allStaff[rowIndex];
                       
                       const isFirstRow = rowIndex === 0;
                       
                       return (
                         <tr key={`${day}-${rowIndex}`} className={`border-b border-slate-100 ${rowIndex % 2 === 0 && !isFirstRow ? 'bg-slate-50/30' : ''} hover:bg-slate-50/80 transition-colors`}>
                           
                           {/* Day Cell (Rowspan if first row) */}
                           {isFirstRow && (
                             <td className="p-4 border-l border-slate-200/60 align-top bg-gradient-to-br from-indigo-50/20 to-transparent" rowSpan={rowsPerDay}>
                                <div className="flex flex-col justify-center items-center text-center gap-2">
                                   <div className="flex flex-col items-center justify-center gap-1.5">
                                     <h4 className="font-black text-slate-800 text-lg">{DAY_NAMES[day]}</h4>
                                     <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                                       {staffCount} مشرف
                                     </span>
                                   </div>
                                   {staffCount > 0 && da.staffAssignments.some(sa => sa.locationIds.length > 0) && (
                                     <div className="mt-8 w-full flex flex-col gap-2">
                                        <button onClick={() => clearLocations(day)} className="w-full flex items-center justify-center py-2 text-rose-500 hover:text-rose-600 rounded-xl transition-all hover:bg-slate-50" title="استعادة ضبط المواقع لهذا اليوم">
                                          <RotateCcw size={18} />
                                        </button>
                                     </div>
                                   )}
                                </div>
                             </td>
                           )}
                           
                           {/* Supervisor 1 Cell */}
                           <td className="p-3 border-l border-slate-200/60 align-middle">
                              {staff1 ? (
                                <div className="flex items-center justify-between">
                                   <div className="flex flex-col">
                                     <span className="font-bold text-slate-800 text-sm truncate max-w-[130px]">{staff1.staffName}</span>
                                   </div>
                                   <button onClick={() => removeStaffFromDay(day, staff1.staffId)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all shadow-sm border border-transparent hover:border-rose-100" title="حذف المشرف">
                                     <Trash2 size={14} />
                                   </button>
                                </div>
                              ) : isFirstRow ? (
                                <div className="relative">
                                  <button onClick={() => { setShowAddPanel(day); setSelectedStaffIds([]); setAddSearch(''); }} className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:text-[#655ac1] hover:border-[#655ac1]/50 hover:bg-[#e5e1fe]/30 font-bold text-xs flex items-center justify-center gap-1 transition-all">
                                    <Plus size={14} /> إضافة مشرفين
                                  </button>
                                  
                                  {/* Add Staff Dropdown (Multiselect) */}
                                  {showAdd && (
                                    <div className="absolute top-[calc(100%+0.5rem)] right-0 w-72 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-slate-200 z-[9999] overflow-hidden">
                                       <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                         <span className="text-xs font-black text-slate-700">تحديد المشرفين</span>
                                         <button onClick={() => setShowAddPanel(null)} className="p-1 text-slate-400 hover:text-rose-500"><X size={14}/></button>
                                       </div>
                                       <div className="p-2 border-b border-slate-100">
                                         <div className="relative">
                                           <Search size={14} className="absolute right-2.5 top-2.5 text-slate-400" />
                                           <input type="text" autoFocus value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="بحث عن مشرف متاح..." className="w-full pl-2 pr-8 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1]" />
                                         </div>
                                       </div>
                                       <div className="max-h-56 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                         {unassignedStaff.filter(s => !addSearch.trim() || s.name.includes(addSearch)).map(staff => {
                                            const isSelected = selectedStaffIds.includes(staff.id);
                                            return (
                                              <button key={staff.id} onClick={() => toggleStaffSelection(staff.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-right transition-all outline-none ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                                                 <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${isSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300'}`}>
                                                    {isSelected && <Check size={12} />}
                                                 </div>
                                                 <div className="flex-1 flex flex-col">
                                                   <span className={`text-sm font-bold ${isSelected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{staff.name}</span>
                                                   <span className="text-[10px] text-slate-500">{staff.type === 'teacher' ? '(معلم)' : '(إداري)'}</span>
                                                 </div>
                                              </button>
                                            );
                                         })}
                                         {unassignedStaff.length === 0 && (
                                           <div className="text-center py-6 text-slate-400 text-xs font-bold">
                                             <Shield size={24} className="mx-auto mb-2 opacity-30" />
                                             جميع الموظفين مخصصون
                                           </div>
                                         )}
                                       </div>
                                       <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                                          <button onClick={() => saveManualStaffAssignments(day)} className="bg-[#655ac1] hover:bg-[#8779fb] text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md transition-all">
                                             حفظ المحدد ({selectedStaffIds.length})
                                          </button>
                                       </div>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                           </td>
                           
                           {/* Location 1 Cell */}
                           <td className="p-3 border-l border-slate-200/60 align-middle">
                              {staff1 ? (
                                <div className="flex items-center gap-2 group relative">
                                  <select 
                                    value={staff1.locationIds[0] || ''}
                                    onChange={(e) => setLocation(day, staff1.staffId, e.target.value)}
                                    className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-[#655ac1]/50 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[#655ac1]/20 focus:border-[#655ac1] outline-none transition-all appearance-none cursor-pointer"
                                  >
                                    <option value="" disabled>اختر موقع...</option>
                                    {activeLocations.map(loc => (
                                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                  </select>
                                  <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                              ) : null}
                           </td>

                           {/* Signature Status Cell for Supervisor */}
                           <td className="p-3 border-l border-slate-200/60 align-middle">
                              {staff1 ? (
                                <div className="flex flex-col items-center justify-center gap-1 min-h-[44px]">
                                  {staff1.signatureData ? (
                                    <>
                                      <img
                                        src={staff1.signatureData}
                                        alt="توقيع"
                                        className="h-9 max-w-[80px] object-contain border border-emerald-200 rounded-lg bg-white shadow-sm"
                                      />
                                      <span className="text-[9px] text-emerald-600 font-bold">✅ موقّع</span>
                                    </>
                                  ) : staff1.signatureStatus === 'pending' ? (
                                    <>
                                      <div className="w-8 h-8 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center animate-pulse">
                                        <Hourglass size={14} className="text-amber-500" />
                                      </div>
                                      <span className="text-[9px] text-amber-600 font-bold">بانتظار التوقيع</span>
                                    </>
                                  ) : (
                                    <span className="text-[9px] text-slate-300 font-bold">لم يُرسل بعد</span>
                                  )}
                                </div>
                              ) : null}
                           </td>
                           {isFirstRow && (
                             <td className="p-4 align-top border-l border-slate-200/60" rowSpan={rowsPerDay}>
                                <div className="relative w-full h-full flex flex-col justify-center min-h-[60px]">
                                   {da.followUpSupervisorId ? (
                                     <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 group relative text-center">
                                       <p className="text-[10px] font-bold text-amber-700 mb-1 flex items-center justify-center gap-1">
                                          <Shield size={10} /> المشرف المتابع
                                       </p>
                                       <p className="text-sm font-black text-amber-900 truncate">
                                         {da.followUpSupervisorName}
                                       </p>
                                       <button onClick={(e) => { e.stopPropagation(); removeFollowUpSupervisor(day); }} className="absolute top-1/2 -translate-y-1/2 left-2 p-1 bg-white rounded-md text-slate-400 hover:text-rose-500 transition-all shadow-sm">
                                         <X size={12} />
                                       </button>
                                       <button onClick={(e) => { e.stopPropagation(); copyFollowUpToAllDays(day); }} className="absolute top-1 right-2 p-1 text-amber-500 hover:text-amber-700 opacity-0 group-hover:opacity-100 transition-all" title="نسخ لجميع الأيام">
                                         <Copy size={12} />
                                       </button>
                                     </div>
                                   ) : (
                                     <button onClick={() => setShowFollowUpPicker(isFollowUpOpen ? null : day)} className="w-full flex items-center justify-center gap-1 border border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 text-amber-700 py-3 rounded-xl text-xs font-bold transition-all">
                                       <Plus size={14} /> تعيين مشرف متابع
                                     </button>
                                   )}

                                   {/* Follow up dropdown */}
                                   {isFollowUpOpen && (
                                     <div className="absolute top-[calc(100%+0.5rem)] right-0 w-64 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-slate-200 z-[9999] overflow-hidden">
                                        <div className="p-2 border-b border-slate-100 bg-slate-50">
                                           <div className="relative">
                                             <Search size={14} className="absolute right-2.5 top-2.5 text-slate-400" />
                                             <input type="text" autoFocus value={followUpSearch} onChange={e => setFollowUpSearch(e.target.value)} placeholder="بحث عن مشرف متابع..." className="w-full pl-2 pr-8 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:ring-1 focus:ring-amber-500/30" />
                                           </div>
                                        </div>
                                        <div className="max-h-56 overflow-y-auto custom-scrollbar p-1">
                                          {followUpCandidates.filter(c => !followUpSearch.trim() || c.name.includes(followUpSearch)).slice(0, 15).map(c => (
                                            <button key={c.id} onClick={() => setFollowUpSupervisor(day, c.id, c.name)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-right transition-colors border border-transparent hover:border-amber-100">
                                              <span className="text-xs font-bold text-slate-700 flex-1">{c.name}</span>
                                              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{c.role}</span>
                                            </button>
                                          ))}
                                          {followUpCandidates.length === 0 && (
                                            <div className="text-center text-xs text-slate-500 p-4">لا يوجد مشرفين متاحين</div>
                                          )}
                                        </div>
                                     </div>
                                   )}
                                </div>
                             </td>
                           )}

                           {/* Follow-Up Signature Status Cell (Rowspan if first row) */}
                           {isFirstRow && (
                             <td className="p-3 align-middle" rowSpan={rowsPerDay}>
                               <div className="flex flex-col items-center justify-center gap-1 min-h-[44px]">
                                 {da.followUpSignatureData ? (
                                   <>
                                     <img
                                       src={da.followUpSignatureData}
                                       alt="توقيع المتابع"
                                       className="h-9 max-w-[80px] object-contain border border-amber-200 rounded-lg bg-white shadow-sm"
                                     />
                                     <span className="text-[9px] text-emerald-600 font-bold">✅ موقّع</span>
                                   </>
                                 ) : da.followUpSupervisorId && da.followUpSignatureStatus === 'pending' ? (
                                   <>
                                     <div className="w-8 h-8 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center animate-pulse">
                                       <Hourglass size={14} className="text-amber-500" />
                                     </div>
                                     <span className="text-[9px] text-amber-600 font-bold">بانتظار التوقيع</span>
                                   </>
                                 ) : da.followUpSupervisorId ? (
                                   <span className="text-[9px] text-slate-300 font-bold">لم يُرسل بعد</span>
                                 ) : (
                                   <span className="text-[9px] text-slate-200 font-bold">—</span>
                                 )}
                               </div>
                             </td>
                           )}
                           
                         </tr>
                       );
                    })}
                    
                    {/* Only show 'Add More' row after the staff if we manually assigned some but want to add more, though the dropdown is powerful enough. Included for ease. */}
                    {staffCount > 0 && (
                       <tr className="border-b-2 border-slate-200">
                         <td colSpan={3} className="p-2 border-l border-slate-200/60 bg-slate-50/30 text-center relative">
                            <button onClick={() => { setShowAddPanel(day); setSelectedStaffIds([]); setAddSearch(''); }} className="inline-flex items-center gap-1 text-xs font-bold text-[#655ac1] hover:text-[#8779fb] bg-[#e5e1fe]/50 hover:bg-[#e5e1fe] px-3 py-1.5 rounded-lg transition-colors">
                               <Plus size={12} /> إضافة المزيد من المشرفين ليوم {DAY_NAMES[day]}
                            </button>
                            {/* Re-use dropdown logic for bottom Add button */}
                             {showAdd && (
                                <div className="absolute top-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 w-72 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-slate-200 z-[9999] overflow-hidden text-right">
                                   <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                     <span className="text-xs font-black text-slate-700">تحديد المشرفين</span>
                                     <button onClick={() => setShowAddPanel(null)} className="p-1 text-slate-400 hover:text-rose-500"><X size={14}/></button>
                                   </div>
                                   <div className="p-2 border-b border-slate-100">
                                     <div className="relative">
                                       <Search size={14} className="absolute right-2.5 top-2.5 text-slate-400" />
                                       <input type="text" autoFocus value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="بحث عن مشرف متاح..." className="w-full pl-2 pr-8 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1]" />
                                     </div>
                                   </div>
                                   <div className="max-h-56 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                     {unassignedStaff.filter(s => !addSearch.trim() || s.name.includes(addSearch)).map(staff => {
                                        const isSelected = selectedStaffIds.includes(staff.id);
                                        return (
                                          <button key={staff.id} onClick={() => toggleStaffSelection(staff.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-right transition-all outline-none ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                                             <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${isSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300'}`}>
                                                {isSelected && <Check size={12} />}
                                             </div>
                                             <div className="flex-1 flex flex-col">
                                               <span className={`text-sm font-bold ${isSelected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{staff.name}</span>
                                               <span className="text-[10px] text-slate-500">{staff.type === 'teacher' ? '(معلم)' : '(إداري)'}</span>
                                             </div>
                                          </button>
                                        );
                                     })}
                                     {unassignedStaff.length === 0 && (
                                       <div className="text-center py-6 text-slate-400 text-xs font-bold">
                                         <Shield size={24} className="mx-auto mb-2 opacity-30" />
                                         جميع الموظفين مخصصون
                                       </div>
                                     )}
                                   </div>
                                   <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                                      <button onClick={() => saveManualStaffAssignments(day)} className="bg-[#655ac1] hover:bg-[#8779fb] text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md transition-all">
                                         حفظ المحدد ({selectedStaffIds.length})
                                      </button>
                                   </div>
                                </div>
                              )}
                         </td>
                       </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default SupervisionScheduleBuilder;
