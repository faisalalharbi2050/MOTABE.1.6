import React, { useState, useMemo } from 'react';
import { Teacher, Specialization, TeacherConstraint, SpecializedMeeting, ClassInfo } from '../../types';
import { Users, Plus, X, Shield, Calendar, AlertTriangle, Ban, ChevronDown, Check, Copy, Clock, ArrowRightFromLine, ArrowLeftFromLine, Sliders, Repeat, Sparkles, BarChart3, Edit3, Search, Filter } from 'lucide-react';
import { ValidationWarning } from '../../utils/scheduleConstraints';

const DAYS_DEFAULT = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

interface Props {
  teachers: Teacher[];
  specializations: Specialization[];
  constraints: TeacherConstraint[];
  meetings: SpecializedMeeting[];
  activeDays: string[];
  periodsPerDay: number;
  warnings: ValidationWarning[];
  classes: ClassInfo[];
  onChangeConstraints: (c: TeacherConstraint[]) => void;
  onChangeMeetings: (m: SpecializedMeeting[]) => void;
}

export default function TeacherSettingsTab({
  teachers, specializations, constraints, meetings, activeDays, periodsPerDay,
  warnings, classes, onChangeConstraints, onChangeMeetings
}: Props) {
  const getDayName = (d: string) => {
    switch(d?.toLowerCase()) {
        case 'sunday': return 'الأحد';
        case 'monday': return 'الإثنين';
        case 'tuesday': return 'الثلاثاء';
        case 'wednesday': return 'الأربعاء';
        case 'thursday': return 'الخميس';
        case 'friday': return 'الجمعة';
        case 'saturday': return 'السبت';
        default: return d;
    }
  };

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'alphabetical' | 'specialization'>('alphabetical');
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ specId: '', day: DAYS_DEFAULT[0], period: 1 });
  
  // Copy Modal State
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargets, setCopyTargets] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const periods = Array.from({ length: periodsPerDay }, (_, i) => i + 1);
  const days = activeDays.length > 0 ? activeDays : DAYS_DEFAULT;

  const getConstraint = (id: string): TeacherConstraint => {
    return constraints.find(c => c.teacherId === id) || { teacherId: id, maxConsecutive: 4, excludedSlots: {} };
  };

  const updateConstraint = (teacherId: string, updates: Partial<TeacherConstraint>) => {
    const existing = constraints.find(c => c.teacherId === teacherId);
    if (existing) {
      onChangeConstraints(constraints.map(c => c.teacherId === teacherId ? { ...c, ...updates } : c));
    } else {
      onChangeConstraints([...constraints, { teacherId, maxConsecutive: 4, excludedSlots: {}, ...updates }]);
    }
  };

  const handleCopyConstraints = () => {
      if (!selectedId || copyTargets.length === 0) return;
      
      const sourceConstraint = getConstraint(selectedId);
      
      const newConstraints = [...constraints];
      
      copyTargets.forEach(targetId => {
          const targetIndex = newConstraints.findIndex(c => c.teacherId === targetId);
          const newConstraint = {
              ...sourceConstraint,
              teacherId: targetId
          };
          
          if (targetIndex >= 0) {
              newConstraints[targetIndex] = newConstraint;
          } else {
              newConstraints.push(newConstraint);
          }
      });
      
      onChangeConstraints(newConstraints);
      setShowCopyModal(false);
      setCopyTargets([]);
      alert('تم نسخ الإعدادات بنجاح');
  };

  const copyDaySettingsToAll = (teacherId: string, sourceDay: string) => {
      const constraint = getConstraint(teacherId);
      const sourceLimits = constraint.dailyLimits?.[sourceDay];
      
      if (!sourceLimits) return;

      const newLimits = { ...(constraint.dailyLimits || {}) };
      
      days.forEach(day => {
          if (day !== sourceDay) {
              newLimits[day] = { ...sourceLimits };
          }
      });

      updateConstraint(teacherId, { dailyLimits: newLimits });
  };

  const toggleSlot = (teacherId: string, day: string, period: number) => {
    const constraint = getConstraint(teacherId);
    const slots = { ...(constraint.excludedSlots || {}) };
    const daySlots = [...(slots[day] || [])];
    slots[day] = daySlots.includes(period) ? daySlots.filter(p => p !== period) : [...daySlots, period];
    updateConstraint(teacherId, { excludedSlots: slots });
  };

  const toggleEntireDay = (teacherId: string, day: string) => {
    const constraint = getConstraint(teacherId);
    const slots = { ...(constraint.excludedSlots || {}) };
    const daySlots = slots[day] || [];
    // If all periods are excluded, clear them. Otherwise, exclude all.
    slots[day] = daySlots.length === periodsPerDay ? [] : [...periods];
    updateConstraint(teacherId, { excludedSlots: slots });
  };

  const toggleEntirePeriod = (teacherId: string, period: number) => {
    const constraint = getConstraint(teacherId);
    const slots = { ...(constraint.excludedSlots || {}) };
    const allHave = days.every(d => (slots[d] || []).includes(period));
    for (const d of days) {
      const ds = [...(slots[d] || [])];
      slots[d] = allHave ? ds.filter(p => p !== period) : (ds.includes(period) ? ds : [...ds, period]);
    }
    updateConstraint(teacherId, { excludedSlots: slots });
  };

  const updateDailyLimit = (teacherId: string, day: string, field: 'min' | 'max' | 'windowStart' | 'windowEnd', value: string) => {
    const constraint = getConstraint(teacherId);
    const limits = { ...(constraint.dailyLimits || {}) };
    const current = limits[day] || { min: 0, max: periodsPerDay, windowStart: 1, windowEnd: periodsPerDay };
    
    const val = value === '' ? undefined : Number(value);
    
    // Logic to handle defaults if value is cleared
    let newVal = val;
    if (val === undefined) {
         if (field === 'min') newVal = 0;
         if (field === 'max') newVal = periodsPerDay;
         if (field === 'windowStart') newVal = 1;
         if (field === 'windowEnd') newVal = periodsPerDay;
    }

    limits[day] = { ...current, [field]: newVal };
    updateConstraint(teacherId, { dailyLimits: limits });
  };
  
  const setEarlyExitMode = (teacherId: string, mode: 'manual' | 'auto') => {
      const constraint = getConstraint(teacherId);
      updateConstraint(teacherId, { earlyExitMode: mode });
  };

  const setEarlyExitDay = (teacherId: string, day: string | null, period: number | null) => {
      const constraint = getConstraint(teacherId);
      const isAuto = constraint.earlyExitMode === 'auto';
      
      // If day is empty and not auto, clear early exit
      if (!day && !isAuto) {
          updateConstraint(teacherId, { earlyExit: {} });
          return;
      }
      
      // If Auto, we use a placeholder day (first active day usually) just to store the period value
      const targetDay = isAuto ? (days[0] || 'any') : day!;
      
      const newEarlyExit = { [targetDay]: period || periodsPerDay - 1 }; 
      updateConstraint(teacherId, { earlyExit: newEarlyExit });
  };

  const addMeeting = () => {
    if (!meetingForm.specId) return;
    const specTeachers = teachers.filter(t => t.specializationId === meetingForm.specId);
    onChangeMeetings([...meetings, {
      id: `meeting-${Date.now()}`, specializationId: meetingForm.specId,
      day: meetingForm.day, period: meetingForm.period, teacherIds: specTeachers.map(t => t.id)
    }]);
    setShowAddMeeting(false);
    setMeetingForm({ specId: '', day: DAYS_DEFAULT[0], period: 1 });
  };

  // Bulk Edit First/Last State
  const [showBulkModal, setShowBulkModal] = useState<'first' | 'last' | null>(null);
  const [bulkValue, setBulkValue] = useState<number>(5);
  // Re-use copyTargets for bulk selection

  // Statistics & Recommendations
  const stats = useMemo(() => {
     const totalClasses = classes.length;
     const daysCount = days.length;
     const neededSlots = totalClasses * daysCount; // Total specific slots needed per week (e.g. 1st periods)
     
     // Capacity
     const currentCapFirst = constraints.reduce((sum, c) => sum + (c.maxFirstPeriods ?? daysCount), 0) 
                           + teachers.filter(t => !constraints.find(c => c.teacherId === t.id)).length * daysCount;
                           
     const currentCapLast = constraints.reduce((sum, c) => sum + (c.maxLastPeriods ?? daysCount), 0)
                          + teachers.filter(t => !constraints.find(c => c.teacherId === t.id)).length * daysCount;

     const activeTeachersCount = teachers.length || 1;
     const recommendedMin = Math.ceil(neededSlots / activeTeachersCount);
     
     return { neededSlots, currentCapFirst, currentCapLast, recommendedMin, totalClasses };
  }, [classes.length, days.length, constraints, teachers]);

  const handleBulkApply = () => {
      if (!showBulkModal || copyTargets.length === 0) return;
      
      const newConstraints = [...constraints];
      const field = showBulkModal === 'first' ? 'maxFirstPeriods' : 'maxLastPeriods';
      
      copyTargets.forEach(targetId => {
          const index = newConstraints.findIndex(c => c.teacherId === targetId);
          if (index >= 0) {
              newConstraints[index] = { ...newConstraints[index], [field]: bulkValue };
          } else {
              newConstraints.push({ 
                  teacherId: targetId, maxConsecutive: 4, excludedSlots: {}, 
                  [field]: bulkValue 
              });
          }
      });
      
      onChangeConstraints(newConstraints);
      setShowBulkModal(null);
      setCopyTargets([]);
      setBulkValue(5);
  };
  
  const openBulkModal = (type: 'first' | 'last') => {
      setCopyTargets([]); // Clear previous
      setBulkValue(stats.recommendedMin); // Suggest the recommended value
      setShowBulkModal(type);
  };

  const selectedTeacher = teachers.find(t => t.id === selectedId);
  const selectedConstraint = selectedId ? getConstraint(selectedId) : null;
  const selectedWarnings = selectedId ? warnings.filter(w => w.relatedId === selectedId) : [];

  // Filter for Copy Modal
  const teachersForCopy = useMemo(() => {
      return teachers.filter(t => t.id !== selectedId && t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [teachers, selectedId, searchTerm]);

  // Derived state for Early Exit UI (Single Day)
  const currentEarlyExitDay = selectedConstraint?.earlyExit ? Object.keys(selectedConstraint.earlyExit)[0] || '' : '';
  const currentEarlyExitPeriod = currentEarlyExitDay && selectedConstraint?.earlyExit ? selectedConstraint.earlyExit[currentEarlyExitDay] : '';

  return (
    <div className="space-y-6">
      {/* ─── توضيح ─── */}
      <div className="bg-[#f8f7ff] rounded-[1.5rem] p-6 border border-[#e5e1fe] shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#e5e1fe] flex items-center justify-center text-[#655ac1]">
            <Shield size={20} />
          </div>
          <h3 className="font-black text-slate-700 text-sm">ملاحظة عن قيود المعلمون</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
          جميع المعلمين لديهم حد تتابع تلقائي (4 حصص متتالية كحد أقصى). يمكنك تخصيص قيود إضافية لكل معلم من القائمة الجانبية وتحديد أوقات الخروج المبكر.
        </p>
      </div>

      {/* ─── المحتوى الرئيسي: القائمة الجانبية + التخصيص ─── */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-[#655ac1]/5 overflow-hidden min-h-[650px] flex flex-col md:flex-row">
          {/* ─── القائمة الجانبية اليمنى ─── */}
          <div className="w-full md:w-72 border-l border-slate-100 bg-[#f8f7ff]/50 flex flex-col shrink-0">
             <div className="p-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="relative mb-3">
                   <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                       type="text" 
                       placeholder="بحث عن معلم..." 
                       className="w-full text-xs pr-9 pl-3 py-3 rounded-xl border-0 bg-slate-50 font-bold text-slate-600 focus:ring-2 focus:ring-[#655ac1]/20 outline-none transition-all placeholder:text-slate-400"
                       value={searchTerm}
                       onChange={e => setSearchTerm(e.target.value)}
                   />
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setSortBy('alphabetical')}
                        className={`flex-1 text-[10px] py-2 rounded-xl font-bold transition-all border ${sortBy === 'alphabetical' ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-lg shadow-[#655ac1]/20' : 'bg-white text-slate-500 border-slate-200 hover:border-[#655ac1]'}`}
                    >
                        أبجدي
                    </button>
                    <button 
                        onClick={() => setSortBy('specialization')}
                        className={`flex-1 text-[10px] py-2 rounded-xl font-bold transition-all border ${sortBy === 'specialization' ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-lg shadow-[#655ac1]/20' : 'bg-white text-slate-500 border-slate-200 hover:border-[#655ac1]'}`}
                    >
                        التخصص
                    </button>
                </div>
             </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {teachers
                .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .sort((a, b) => {
                    if (sortBy === 'alphabetical') {
                        return a.name.localeCompare(b.name, 'ar');
                    } else {
                        const specA = specializations.find(s => s.id === a.specializationId)?.name || '';
                        const specB = specializations.find(s => s.id === b.specializationId)?.name || '';
                        return specA.localeCompare(specB, 'ar') || a.name.localeCompare(b.name, 'ar');
                    }
                })
                .map(teacher => {
                const isSelected = selectedId === teacher.id;
                const hasConstraint = constraints.some(c => c.teacherId === teacher.id);
                // Simple count of potential complexities
                const constraintObj = hasConstraint ? getConstraint(teacher.id) : null;
                const totalExcluded = constraintObj ? Object.values(constraintObj.excludedSlots).flat().length : 0;
                const hasAdvanced = constraintObj && (
                    Object.keys(constraintObj.earlyExit || {}).length > 0 || 
                    constraintObj.maxFirstPeriods !== undefined || 
                    constraintObj.maxLastPeriods !== undefined
                );

                const hasError = warnings.some(w => w.relatedId === teacher.id && w.level === 'error');
                return (
                  <button key={teacher.id} onClick={() => setSelectedId(teacher.id)}
                    className={`w-full text-right px-4 py-3.5 rounded-xl transition-all duration-200 flex items-center gap-3 group relative overflow-hidden ${
                      isSelected 
                        ? 'bg-white shadow-lg shadow-[#655ac1]/10 ring-1 ring-[#655ac1] z-10' 
                        : 'hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100'
                    }`}>
                    
                    {isSelected && <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#655ac1]"></div>}

                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-black transition-colors ${
                      isSelected ? 'bg-[#e5e1fe] text-[#655ac1]' : 'bg-slate-100 text-slate-400 group-hover:bg-[#f8f7ff] group-hover:text-[#655ac1]'
                    }`}>
                      {teacher.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-xs truncate mb-1 ${isSelected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{teacher.name}</div>
                      <div className="text-[10px] text-slate-400 flex flex-wrap gap-1.5 items-center">
                          <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{teacher.quotaLimit} حصة</span>
                          {totalExcluded > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>}
                          {hasAdvanced && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>}
                      </div>
                    </div>
                    {hasError && <div className="absolute top-2 left-2 text-rose-500 animate-pulse"><AlertTriangle size={12}/></div>}
                  </button>
                );
              })}
              {teachers.length === 0 && <div className="text-center py-12 text-slate-400 text-xs font-bold">لا يوجد معلمون</div>}
            </div>
          </div>

          {/* ─── منطقه التخصيص ─── */}
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            {!selectedTeacher ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300">
                <div className="w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center mb-6 border border-slate-100 transform rotate-3">
                     <Users size={48} className="opacity-20" />
                </div>
                <p className="font-black text-lg text-slate-400">اختر معلماً من القائمة</p>
                <p className="text-sm mt-2 font-medium">لعرض وتعديل إعداداته والقيود المتقدمة</p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-300 slide-in-from-bottom-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-[1.2rem] bg-[#e5e1fe] flex items-center justify-center shadow-sm text-[#655ac1] font-black text-2xl border border-[#655ac1]/10">
                            {selectedTeacher.name.charAt(0)}
                        </div>
                        <div>
                            <h4 className="font-black text-xl text-slate-800">{selectedTeacher.name}</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-[10px] bg-[#f8f7ff] text-[#655ac1] px-3 py-1 rounded-lg font-bold border border-[#e5e1fe]">
                                    النصاب: {selectedTeacher.quotaLimit} حصة
                                </span>
                                <span className="text-[10px] bg-slate-50 text-slate-500 px-3 py-1 rounded-lg font-bold border border-slate-100">
                                    التخصص: {specializations.find(s=>s.id===selectedTeacher.specializationId)?.name || 'عام'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => { setShowCopyModal(true); setCopyTargets([]); }}
                        className="flex items-center gap-2 px-5 py-3 text-xs font-bold text-white bg-[#655ac1] rounded-xl shadow-lg shadow-[#655ac1]/20 hover:shadow-xl hover:scale-105 active:scale-95 transition-all w-fit"
                    >
                        <Copy size={16} />
                        <span>نسخ الإعدادات</span>
                    </button>
                </div>

                {/* Warnings Section */}
                {selectedWarnings.length > 0 && (
                    <div className="space-y-3">
                        {selectedWarnings.map(w => (
                        <div key={w.id} className={`rounded-2xl p-4 flex items-start gap-3 text-xs shadow-sm ${w.level === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold block text-sm mb-1">{w.message}</span>
                                {w.suggestion && <span className="opacity-80 block font-medium">{w.suggestion}</span>}
                            </div>
                        </div>
                        ))}
                    </div>
                )}

                {/* حد التتابع */}
                <div className="bg-[#f8f7ff]/50 rounded-[1.5rem] p-6 border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-white rounded-xl shadow-sm text-[#655ac1]"><Sliders size={18} /></div>
                      <label className="text-sm font-black text-slate-700">أقصى عدد حصص متتالية</label>
                  </div>
                  <div className="flex gap-3">
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <button key={n} onClick={() => updateConstraint(selectedId!, { maxConsecutive: n })}
                        className={`w-12 h-12 rounded-xl text-sm font-black transition-all duration-200 ${
                          selectedConstraint?.maxConsecutive === n
                            ? 'bg-[#655ac1] text-white shadow-lg shadow-[#655ac1]/20 scale-110'
                            : 'bg-white border-2 border-slate-100 text-slate-400 hover:border-[#655ac1] hover:text-[#655ac1]'
                        }`}>{n}</button>
                    ))}
                  </div>
                </div>

                {/* ─── جدول الحصص المستثناة ─── */}
                <div className="bg-white rounded-[1.5rem] p-6 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                      <h5 className="text-sm font-black text-slate-700 flex items-center gap-2">
                        <div className="p-2 bg-rose-50 rounded-xl text-rose-500"><Ban size={18} /></div>
                        الحصص المستثناة
                      </h5>
                      <span className="text-[10px] text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 font-bold">انقر للاستثناء</span>
                  </div>
                  
                  <div className="overflow-x-auto pb-2">
                    <table className="w-full separate-border-spacing">
                      <thead>
                        <tr>
                          <th className="w-24"></th>
                          {periods.map(p => (
                            <th key={p} className="text-center px-1 pb-3">
                              <button onClick={() => toggleEntirePeriod(selectedId!, p)}
                                className="text-[10px] font-black text-slate-400 hover:text-[#655ac1] transition-colors py-1 px-2 rounded hover:bg-slate-50">
                                {p}
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="space-y-2">
                        {days.map(day => {
                          const daySlots = selectedConstraint?.excludedSlots[day] || [];
                          // Check for early exit on this day to visually indicate disabled slots
                          const earlyExitVal = selectedConstraint?.earlyExit?.[day];
                          
                          return (
                            <tr key={day}>
                              <td className="py-2 pl-3">
                                <button onClick={() => toggleEntireDay(selectedId!, day)}
                                  className="text-[11px] font-bold text-slate-600 hover:text-[#655ac1] w-full text-right transition-colors hover:bg-slate-50 py-1 px-2 rounded-lg">
                                  {getDayName(day)}
                                </button>
                              </td>
                              {periods.map(p => {
                                const isExcl = daySlots.includes(p);
                                const isBlockedByEarlyExit = earlyExitVal !== undefined && p > earlyExitVal;
                                
                                return (
                                  <td key={p} className="p-1 text-center">
                                    <button onClick={() => !isBlockedByEarlyExit && toggleSlot(selectedId!, day, p)}
                                      disabled={isBlockedByEarlyExit}
                                      className={`w-9 h-9 rounded-xl text-[10px] font-bold transition-all duration-200 flex items-center justify-center mx-auto ${
                                        isBlockedByEarlyExit 
                                            ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-dashed border-slate-200' 
                                        : isExcl
                                            ? 'bg-rose-500 text-white shadow-md shadow-rose-200 ring-2 ring-white scale-90'
                                            : 'bg-white border border-slate-100 text-slate-300 hover:border-rose-300 hover:text-rose-400 hover:shadow-sm'
                                      }`}>
                                      {isBlockedByEarlyExit ? '—' : isExcl ? <X size={14} strokeWidth={3} /> : ''}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ─── القيود المتقدمة ─── */}
                <div className="bg-white rounded-[2rem] border-2 border-[#f8f7ff] shadow-sm overflow-hidden">
                    <div className="bg-[#f8f7ff] px-6 py-5 border-b border-[#e5e1fe] flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm text-[#655ac1]"><Clock size={20} /></div>
                        <div>
                            <h4 className="font-black text-slate-800 text-sm">قيود متقدمة</h4>
                            <p className="text-[10px] text-slate-500 font-bold mt-0.5">الحدود اليومية، الخروج المبكر، وتوزيع الحصص</p>
                        </div>
                    </div>

                    <div className="p-6 space-y-8">
                       
                       {/* 1. First & Last Periods (Enhanced) */}
                       <div className="grid grid-cols-1 gap-6">
                           <div className="bg-emerald-50/30 p-5 rounded-[1.5rem] border border-emerald-100/60">
                               <h5 className="text-sm font-black text-slate-700 mb-5 flex items-center gap-2">
                                   <div className="p-1.5 bg-white rounded-lg shadow-sm text-emerald-500"><ArrowRightFromLine size={16} /></div>
                                   توزيع الحصص الأولى والأخيرة
                               </h5>
                               
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {/* Max First Periods */}
                           <div className={`p-5 rounded-2xl border-2 transition-colors bg-white ${
                               stats.currentCapFirst < stats.neededSlots ? 'border-amber-100 shadow-sm' : 'border-slate-50'
                           }`}>
                               <div className="flex justify-between items-start mb-3">
                                   <label className="flex items-center gap-2 text-xs font-black text-slate-700">
                                      <ArrowRightFromLine size={16} className="text-emerald-500"/>
                                      الحصص الأولى (الأسبوعية)
                                   </label>
                                   <button onClick={() => openBulkModal('first')} className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-[#655ac1] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:border-[#655ac1]/30 transition-all font-bold">
                                       <Edit3 size={12}/> تعيين لمجموعة
                                   </button>
                               </div>
                               
                               <div className="flex gap-3 items-center">
                                   <input 
                                      type="number" 
                                      min={0} max={days.length}
                                      placeholder={`موصى: ${stats.recommendedMin}`}
                                      value={selectedConstraint?.maxFirstPeriods ?? ''}
                                      onChange={e => updateConstraint(selectedId!, { maxFirstPeriods: e.target.value ? Number(e.target.value) : undefined })}
                                      className="w-20 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-bold focus:ring-2 focus:ring-[#8779fb]/20 outline-none"
                                   />
                                   <div className="flex-1">
                                       <div className="flex justify-between text-[10px] text-slate-400 mb-1.5 font-bold">
                                            <span>سعة المدرسة: {stats.currentCapFirst} / {stats.neededSlots}</span>
                                            {stats.currentCapFirst < stats.neededSlots && <span className="text-amber-500 font-bold flex items-center gap-1"><AlertTriangle size={10}/> عجز</span>}
                                       </div>
                                       <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                           <div 
                                              className={`h-full rounded-full ${stats.currentCapFirst < stats.neededSlots ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                                              style={{ width: `${Math.min(100, (stats.currentCapFirst / stats.neededSlots) * 100)}%` }}
                                           />
                                       </div>
                                   </div>
                               </div>
                           </div>

                           {/* Max Last Periods */}
                           <div className={`p-5 rounded-2xl border-2 transition-colors bg-white ${
                               stats.currentCapLast < stats.neededSlots ? 'border-amber-100 shadow-sm' : 'border-slate-50'
                           }`}>
                               <div className="flex justify-between items-start mb-3">
                                   <label className="flex items-center gap-2 text-xs font-black text-slate-700">
                                      <ArrowLeftFromLine size={16} className="text-rose-500"/>
                                      الحصص الأخيرة (الأسبوعية)
                                   </label>
                                   <button onClick={() => openBulkModal('last')} className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-[#655ac1] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:border-[#655ac1]/30 transition-all font-bold">
                                       <Edit3 size={12}/> تعيين لمجموعة
                                   </button>
                               </div>
                               
                               <div className="flex gap-3 items-center">
                                   <input 
                                      type="number" 
                                      min={0} max={days.length}
                                      placeholder={`موصى: ${stats.recommendedMin}`}
                                      value={selectedConstraint?.maxLastPeriods ?? ''}
                                      onChange={e => updateConstraint(selectedId!, { maxLastPeriods: e.target.value ? Number(e.target.value) : undefined })}
                                      className="w-20 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-bold focus:ring-2 focus:ring-[#8779fb]/20 outline-none"
                                   />
                                   <div className="flex-1">
                                       <div className="flex justify-between text-[10px] text-slate-400 mb-1.5 font-bold">
                                            <span>سعة المدرسة: {stats.currentCapLast} / {stats.neededSlots}</span>
                                            {stats.currentCapLast < stats.neededSlots && <span className="text-amber-500 font-bold flex items-center gap-1"><AlertTriangle size={10}/> عجز</span>}
                                       </div>
                                       <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                           <div 
                                              className={`h-full rounded-full ${stats.currentCapLast < stats.neededSlots ? 'bg-amber-400' : 'bg-rose-400'}`} 
                                              style={{ width: `${Math.min(100, (stats.currentCapLast / stats.neededSlots) * 100)}%` }}
                                           />
                                       </div>
                                   </div>
                               </div>
                           </div>
                               </div>
                           </div>
                       </div>
                       
                       {/* 2. Early Exit (Single Day) */}
                       <div className="bg-rose-50/40 rounded-[1.5rem] p-6 border border-rose-100">
                           <div className="flex items-center justify-between mb-4">
                                <label className="flex items-center gap-2 text-xs font-black text-rose-700">
                                   <div className="p-1 bg-white rounded shadow-sm text-rose-500"><Clock size={14} /></div>
                                   بطاقة الخروج المبكر
                                </label>
                               
                               {/* Mode Toggle */}
                               <div className="flex bg-white rounded-xl p-1 border border-rose-100 shadow-sm">
                                   <button 
                                      onClick={() => setEarlyExitMode(selectedId!, 'manual')}
                                      className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                          (selectedConstraint?.earlyExitMode || 'manual') === 'manual' 
                                          ? 'bg-rose-50 text-rose-600 shadow-sm' 
                                          : 'text-slate-400 hover:text-rose-500'
                                      }`}
                                   >
                                       يدوي
                                   </button>
                                   <button 
                                      onClick={() => setEarlyExitMode(selectedId!, 'auto')}
                                      className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                          selectedConstraint?.earlyExitMode === 'auto' 
                                          ? 'bg-rose-50 text-rose-600 shadow-sm' 
                                          : 'text-slate-400 hover:text-rose-500'
                                      }`}
                                   >
                                       تلقائي
                                   </button>
                               </div>
                           </div>
                           
                           <div className="flex gap-4">
                               {/* Day Selector - Only for Manual */}
                               {(selectedConstraint?.earlyExitMode || 'manual') === 'manual' && (
                                   <div className="flex-1">
                                       <select 
                                          value={currentEarlyExitDay} 
                                          onChange={e => setEarlyExitDay(selectedId!, e.target.value, currentEarlyExitPeriod ? Number(currentEarlyExitPeriod) : null)}
                                           className="w-full p-3 rounded-xl border border-rose-200 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-200 bg-white"
                                        >
                                            <option value="">لا يوجد خروج مبكر</option>
                                            {days.map(d => <option key={d} value={d}>{getDayName(d)}</option>)}
                                        </select>
                                   </div>
                               )}

                               {/* Period Selector - Always Visible (Context changes) */}
                               <div className="flex-1">
                                   <select 
                                      disabled={selectedConstraint?.earlyExitMode === 'manual' && !currentEarlyExitDay}
                                      value={currentEarlyExitPeriod || ''}
                                      onChange={e => setEarlyExitDay(selectedId!, selectedConstraint?.earlyExitMode === 'auto' ? null : currentEarlyExitDay, Number(e.target.value))}
                                      className="w-full p-3 rounded-xl border border-rose-200 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-200 bg-white disabled:opacity-50 disabled:bg-slate-50 disabled:border-slate-200"
                                   >
                                       <option value="">اختر وقت الخروج...</option>
                                       {periods.slice(0, -1).map(p => (
                                           <option key={p} value={p}>بعد الحصة {p}</option>
                                       ))}
                                   </select>
                               </div>
                           </div>
                           
                           <p className="text-[10px] text-rose-500 mt-3 flex items-center gap-1.5 font-bold opacity-80">
                               {selectedConstraint?.earlyExitMode === 'auto' ? (
                                   <>
                                     <Shield size={12} className="shrink-0"/>
                                     سيقوم النظام باختيار اليوم الأنسب للخروج المبكر تلقائياً لتقليل التعارضات.
                                   </>
                               ) : (
                                   "سيتم استبعاد الحصص بعد الوقت المحدد لهذا اليوم فقط."
                               )}
                           </p>
                       </div>

                       <div className="h-px bg-slate-100" />

                        {/* 3. Daily Limits */}
                       <div className="bg-[#f8f7ff] rounded-[1.5rem] p-6 border border-[#e5e1fe]">
                           <h5 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
                               <div className="p-1.5 bg-white rounded-lg shadow-sm text-[#655ac1]"><Sliders size={16} /></div>
                               التوزيع المتقدم
                           </h5>
                           
                           <div className="bg-white p-4 rounded-2xl border border-slate-100 mb-6 shadow-sm">
                               <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                                   تخصيص توزيع الحصص على المعلمين مع إمكانية تحديد أقل عدد حصص أو أكثر عدد حصص لحصة معينة في الأسبوع.
                               </p>
                               <div className="bg-[#f8f7ff] p-3 rounded-xl border border-[#e5e1fe]">
                                   <p className="text-[10px] text-[#655ac1] font-bold mb-1 flex items-center gap-1">
                                       <Sparkles size={10}/> مثال للتوضيح:
                                   </p>
                                   <p className="text-[10px] text-slate-500 leading-relaxed opacity-80">
                                       معلم التربية البدنية تود أن تكون حصصه في كل الأيام من الحصة الأولى إلى الخامسة ولأجل التطبيق بشكل صحيح: اختر يوم ثم اختر الحصص من الأولى إلى الخامسة ثم ضع (أقل عدد حصص: 1، أكثر عدد حصص: 1)، وعليه سيكون جدول المعلم من الأولى إلى الخامسة لكل يوم ويمكنك من نسخ هذا الترتيب لباقي الأيام.
                                   </p>
                               </div>
                           </div>
                           
                           <div className="overflow-x-auto">
                           <table className="w-full text-right">
                               <thead>
                                    <tr className="border-b border-slate-200 text-[10px] text-slate-400">
                                        <th className="pb-3 font-black w-20">اليوم</th>
                                        <th className="pb-3 font-black px-4 text-center">الحصص (من - إلى)</th>
                                        <th className="pb-3 font-black px-2 text-center">أقل عدد حصص</th>
                                        <th className="pb-3 font-black px-2 text-center">أكثر عدد حصص</th>
                                        <th className="pb-3 font-black w-10 text-center">نسخ</th>
                                    </tr>
                               </thead>
                               <tbody>
                                   {days.map(day => {
                                        const limits = selectedConstraint?.dailyLimits?.[day] || { min: 0, max: periodsPerDay, windowStart: 1, windowEnd: periodsPerDay };
                                        
                                       return (
                                        <tr key={day} className="group hover:bg-white transition-colors border-b border-slate-100 last:border-0">
                                            <td className="py-2.5 text-[11px] font-black text-slate-600">{getDayName(day)}</td>
                                            
                                            {/* Window */}
                                            <td className="py-2 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="relative flex-1">
                                                        <select 
                                                            value={limits.windowStart || 1}
                                                            onChange={e => updateDailyLimit(selectedId!, day, 'windowStart', e.target.value)}
                                                            className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs font-black cursor-pointer hover:border-[#655ac1]/50 focus:border-[#655ac1] outline-none"
                                                        >
                                                            {periods.map(p => <option key={p} value={p}>{p}</option>)}
                                                        </select>
                                                        <ChevronDown size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                                                    </div>
                                                    <span className="text-slate-300">-</span>
                                                    <div className="relative flex-1">
                                                        <select 
                                                            value={limits.windowEnd || periodsPerDay}
                                                            onChange={e => updateDailyLimit(selectedId!, day, 'windowEnd', e.target.value)}
                                                            className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs font-black cursor-pointer hover:border-[#655ac1]/50 focus:border-[#655ac1] outline-none"
                                                        >
                                                            {periods.map(p => <option key={p} value={p}>{p}</option>)}
                                                        </select>
                                                        <ChevronDown size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Min/Max */}
                                            <td className="py-2 px-1">
                                                <input 
                                                    type="number" min={0} max={8} 
                                                    value={limits.min || ''} 
                                                    placeholder="0"
                                                    onChange={e => updateDailyLimit(selectedId!, day, 'min', e.target.value)}
                                                    className={`w-14 mx-auto block text-center p-1.5 rounded-lg border text-xs font-black focus:ring-2 outline-none ${
                                                        (limits.min > 0) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'
                                                    }`}
                                                />
                                            </td>
                                            <td className="py-2 px-1">
                                                <input 
                                                    type="number" min={0} max={8} 
                                                    value={limits.max === periodsPerDay ? '' : limits.max}
                                                    placeholder={String(periodsPerDay)}
                                                    onChange={e => updateDailyLimit(selectedId!, day, 'max', e.target.value)}
                                                    className={`w-14 mx-auto block text-center p-1.5 rounded-lg border text-xs font-black focus:ring-2 outline-none ${
                                                        (limits.max < periodsPerDay) ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500'
                                                    }`}
                                                />
                                            </td>
                                            
                                            {/* Actions */}
                                            <td className="py-2 px-1 text-center">
                                                <button 
                                                    onClick={() => copyDaySettingsToAll(selectedId!, day)}
                                                    title="نسخ هذه الإعدادات لباقي الأيام"
                                                    className="p-1.5 text-slate-400 hover:text-[#655ac1] hover:bg-[#e5e1fe] rounded-lg transition-all"
                                                >
                                                    <Repeat size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                       )
                                   })}
                               </tbody>
                           </table>
                           </div>
                       </div>

                       {/* ─── الاجتماعات التخصصية ─── */}
                       <div className="mt-8 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-[#f8f7ff]">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#e5e1fe] flex items-center justify-center text-[#655ac1] shadow-sm">
                                <Calendar size={20} />
                              </div>
                              <div>
                                <h3 className="font-black text-slate-800 text-sm">الاجتماعات التخصصية</h3>
                                <p className="text-[10px] text-slate-500 font-bold">يُرمز بـ "ج" في الجدول</p>
                              </div>
                            </div>
                            {!showAddMeeting && (
                              <button onClick={() => setShowAddMeeting(true)}
                                className="flex items-center gap-2 text-xs font-bold bg-[#655ac1] text-white px-5 py-2.5 rounded-xl shadow-lg shadow-[#655ac1]/20 active:scale-95 transition-all">
                                <Plus size={14} /> اجتماع جديد
                              </button>
                            )}
                          </div>

                          {showAddMeeting && (
                            <div className="px-6 py-5 bg-[#f8f7ff] border-b border-slate-100">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <select value={meetingForm.specId} onChange={e => setMeetingForm(f => ({ ...f, specId: e.target.value }))}
                                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-[#8779fb]/20 font-bold text-slate-600">
                                  <option value="">اختر التخصص...</option>
                                  {specializations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <select value={meetingForm.day} onChange={e => setMeetingForm(f => ({ ...f, day: e.target.value }))}
                                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-[#8779fb]/20 font-bold text-slate-600">
                                  {days.map(d => (
                                    <option key={d} value={d}>
                                        {getDayName(d)}
                                    </option>
                                  ))}
                                </select>
                                <select value={meetingForm.period} onChange={e => setMeetingForm(f => ({ ...f, period: Number(e.target.value) }))}
                                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-[#8779fb]/20 font-bold text-slate-600">
                                  {periods.map(p => <option key={p} value={p}>الحصة {p}</option>)}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={addMeeting} disabled={!meetingForm.specId}
                                  className="px-6 py-2 bg-[#655ac1] text-white rounded-xl text-xs font-bold disabled:opacity-40 shadow-md">إضافة</button>
                                <button onClick={() => setShowAddMeeting(false)} className="px-5 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all">إلغاء</button>
                              </div>
                            </div>
                          )}

                          <div className="p-4">
                            {meetings.length === 0 && !showAddMeeting ? (
                              <div className="text-center py-10 text-slate-300">
                                <Calendar size={40} className="mx-auto mb-3 opacity-20" />
                                <p className="font-bold text-xs">لا توجد اجتماعات تخصصية</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {meetings.map(m => {
                                  const spec = specializations.find(s => s.id === m.specializationId);
                                  
                                  return (
                                    <div key={m.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:shadow-md transition-all group">
                                      <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[#e5e1fe] text-[#655ac1] rounded-xl flex items-center justify-center font-black text-sm shadow-sm">ج</div>
                                        <div>
                                          <span className="font-bold text-slate-700 text-sm block mb-0.5">{spec?.name || 'تخصص'}</span>
                                          <span className="text-xs text-slate-400 font-medium">{getDayName(m.day)} — الحصة {m.period}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-[10px] bg-[#f8f7ff] text-[#655ac1] px-3 py-1 rounded-full font-bold border border-[#e5e1fe]">{m.teacherIds.length} معلم</span>
                                        <button onClick={() => onChangeMeetings(meetings.filter(x => x.id !== m.id))}
                                          className="w-8 h-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl flex items-center justify-center transition-all"><X size={16} /></button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                       </div>
                    </div>
                </div>

              </div>
            )}
          </div>
      </div>


       {/* ─── Copy Modal ─── */}
       {showCopyModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
               <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                   <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                       <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                           <Copy size={20} className="text-[#655ac1]"/> نسخ إعدادات: {selectedTeacher?.name}
                       </h3>
                       <button onClick={() => setShowCopyModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"><X size={20}/></button>
                   </div>
                   
                   <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                        <p className="text-sm font-bold text-slate-500 mb-4">اختر المعلمين الذين تريد تطبيق نفس القيود عليهم:</p>
                        
                        <div className="space-y-2">
                            {teachersForCopy.map(t => (
                                <label key={t.id} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                                    copyTargets.includes(t.id) ? 'bg-[#f8f7ff] border-[#655ac1]' : 'bg-white border-slate-100 hover:bg-slate-50'
                                }`}>
                                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                                        copyTargets.includes(t.id) ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 bg-white'
                                    }`}>
                                        {copyTargets.includes(t.id) && <Check size={12} strokeWidth={4}/>}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={copyTargets.includes(t.id)} 
                                        onChange={() => setCopyTargets(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                                    />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-slate-700">{t.name}</span>
                                            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg font-bold">{t.quotaLimit} حصة</span>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                   </div>

                   <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                       <button onClick={() => setShowCopyModal(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:bg-white rounded-xl transition-all">إلغاء</button>
                       <button 
                            onClick={handleCopyConstraints} 
                            disabled={copyTargets.length === 0}
                            className="px-8 py-3 bg-[#655ac1] text-white text-sm font-black rounded-xl shadow-lg shadow-[#655ac1]/20 disabled:opacity-50 disabled:shadow-none hover:bg-[#5448a8] transition-all"
                       >
                           نسخ الإعدادات ({copyTargets.length})
                       </button>
                   </div>
               </div>
           </div>
       )}

      {/* ─── Bulk Edit First/Last Modal ─── */}
       {showBulkModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
               <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                   <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                       <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                           <Sparkles size={20} className="text-[#655ac1]"/> 
                           {showBulkModal === 'first' ? 'توزيع الحصص الأولى' : 'توزيع الحصص الأخيرة'}
                       </h3>
                       <button onClick={() => setShowBulkModal(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"><X size={20}/></button>
                   </div>

                   <div className="p-6 bg-[#f8f7ff]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white rounded-xl shadow-sm text-[#655ac1]"><BarChart3 size={20}/></div>
                            <div>
                                <h4 className="text-sm font-black text-slate-700">تحليل التوزيع العادل</h4>
                                <p className="text-[11px] text-slate-500 font-bold">لضمان تغطية {stats.neededSlots} حصة أسبوعياً</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-[#e5e1fe] shadow-sm flex items-center gap-6">
                            <div className="flex-1 text-center border-l border-slate-100 pl-6">
                                <span className="block text-[10px] text-slate-400 font-bold mb-1">الموصى به لكل معلم</span>
                                <span className="block text-3xl font-black text-[#655ac1]">{stats.recommendedMin}</span>
                                <span className="text-[10px] text-slate-400 font-medium">حصص/أسبوع</span>
                            </div>
                            <div className="flex-1 text-right">
                                <label className="block text-[11px] text-slate-500 font-bold mb-2">القيمة المراد تطبيقها</label>
                                <input 
                                    type="number" min={0} max={days.length}
                                    value={bulkValue}
                                    onChange={e => setBulkValue(Number(e.target.value))}
                                    className="w-full text-center p-2 rounded-xl border-2 border-[#e5e1fe] focus:border-[#655ac1] outline-none font-bold text-lg text-slate-700"
                                />
                            </div>
                        </div>
                   </div>
                   
                   <div className="p-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-3">
                             <p className="text-xs font-bold text-slate-500">اختر المعلمين لتطبيق هذا الحد عليهم:</p>
                             <div className="flex gap-2">
                                 <button onClick={() => setCopyTargets(teachers.map(t => t.id))} className="text-[10px] text-[#655ac1] font-bold hover:underline">تحديد الكل</button>
                                 <button onClick={() => setCopyTargets([])} className="text-[10px] text-slate-400 font-bold hover:text-slate-600">إلغاء التحديد</button>
                             </div>
                        </div>
                        
                        <div className="space-y-2">
                            {teachers.map(t => (
                                <label key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                    copyTargets.includes(t.id) ? 'bg-[#f8f7ff] border-[#655ac1]' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'
                                }`}>
                                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                                        copyTargets.includes(t.id) ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 bg-white'
                                    }`}>
                                        {copyTargets.includes(t.id) && <Check size={12} strokeWidth={4}/>}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={copyTargets.includes(t.id)} 
                                        onChange={() => setCopyTargets(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                                    />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-slate-700">{t.name}</span>
                                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">
                                                حالي: {
                                                    (constraints.find(c => c.teacherId === t.id)?.[showBulkModal === 'first' ? 'maxFirstPeriods' : 'maxLastPeriods'] ?? 5)
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                   </div>

                   <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                       <button onClick={() => setShowBulkModal(null)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:bg-white rounded-xl transition-all">إلغاء</button>
                       <button 
                            onClick={handleBulkApply} 
                            disabled={copyTargets.length === 0}
                            className="px-8 py-3 bg-[#655ac1] text-white text-sm font-black rounded-xl shadow-lg shadow-[#655ac1]/20 disabled:opacity-50 disabled:shadow-none hover:bg-[#5448a8] transition-all"
                       >
                           تطبيق ({copyTargets.length})
                       </button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
}
