import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Teacher, Specialization, SchoolInfo, ScheduleSettingsData, ClassInfo } from '../../../types';
import { Briefcase, Plus, X, Upload, Trash2, Edit, Check, ChevronDown, ChevronUp, Search, Printer, List, User, Users, GripVertical, AlertTriangle, CheckCircle2, ArrowUp, ArrowDown, Copy, CheckSquare, Square, Sliders, Info, AlertCircle } from 'lucide-react';
import { INITIAL_SPECIALIZATIONS } from '../../../constants';
import { parseTeachersExcel } from '../../../utils/excelTeachers';
import SchoolTabs from '../SchoolTabs';
import TeacherConstraintsModal from '../../teachers/TeacherConstraintsModal';

interface Step6Props {
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  specializations: Specialization[];
  schoolInfo: SchoolInfo;
  setSchoolInfo?: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  scheduleSettings: ScheduleSettingsData;
  setScheduleSettings: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
  classes: ClassInfo[];
}

const Step6Teachers: React.FC<Step6Props> = ({ teachers = [], setTeachers, specializations = [], schoolInfo, setSchoolInfo, scheduleSettings, setScheduleSettings, classes }) => {
  // State
  const [activeSchoolId, setActiveSchoolId] = useState<string>('main');
  const [searchTerm, setSearchTerm] = useState("");
  
  // Multi-select for Specializations
  const [filterSpecializations, setFilterSpecializations] = useState<string[]>([]);
  const [isSpecDropdownOpen, setIsSpecDropdownOpen] = useState(false);
  const specDropdownRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showConstraintsModal, setShowConstraintsModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentTeacher, setCurrentTeacher] = useState<Partial<Teacher>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  
  // Bulk Edit Logic
  const [isBulkEdit, setIsBulkEdit] = useState(false);
  const teachersSnapshot = useRef<string>("");

  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);
  
  // Custom Specialization Order State
  const [specializationOrder, setSpecializationOrder] = useState<string[]>(INITIAL_SPECIALIZATIONS.map(s => s.id));

  // Drag and Drop State
  const [draggedTeacherId, setDraggedTeacherId] = useState<string | null>(null);

  // Copy Quota Modal State
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [sourceTeacher, setSourceTeacher] = useState<Teacher | null>(null);
  const [copyOptions, setCopyOptions] = useState({ basic: true, waiting: true });
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [copySearchTerm, setCopySearchTerm] = useState("");

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Delete All Confirmation State
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Delete Single Teacher Confirmation State
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- Helpers ---
  const currentSchoolTeachers = useMemo(() => {
    if (schoolInfo.mergeTeachersView) return teachers;
    return teachers.filter(t => (t.schoolId || 'main') === activeSchoolId);
  }, [teachers, activeSchoolId, schoolInfo.mergeTeachersView]);

  const getUsedSpecializationIds = (): string[] => {
    return Array.from(new Set(currentSchoolTeachers.map(t => t.specializationId))) as string[];
  };

  const getSpecializationName = (id: string) => {
      const spec = specializations.find(s => s.id === id);
      return spec ? spec.name : 'أخرى';
  };

  // --- Handlers ---

  const toggleSpecializationFilter = (id: string) => {
      setFilterSpecializations(prev => 
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const handleBulkEditToggle = () => {
      if (!isBulkEdit) {
          // Entering Edit Mode: Snapshot current state
          teachersSnapshot.current = JSON.stringify(teachers);
          setIsBulkEdit(true);
      } else {
          // Exiting Edit Mode: Save and Check changes
          const currentString = JSON.stringify(teachers);
          if (currentString === teachersSnapshot.current) {
              showToast('لم يتم إجراء أي تعديلات', 'warning');
          }
          setIsBulkEdit(false);
      }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      if (isBulkEdit) return; // Disable DnD during edit
      setDraggedTeacherId(id);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, targetId: string, groupSpecId: string) => {
      e.preventDefault();
      if (!draggedTeacherId || draggedTeacherId === targetId) return;

      const draggedTeacher = teachers.find(t => t.id === draggedTeacherId);
      const targetTeacher = teachers.find(t => t.id === targetId);

      if (!draggedTeacher || !targetTeacher) return;

      // Ensure we only drop within the same specialization
      if (draggedTeacher.specializationId !== groupSpecId || targetTeacher.specializationId !== groupSpecId) return;

      // Reorder logic
      const groupTeachers = currentSchoolTeachers
          .filter(t => t.specializationId === groupSpecId)
          .sort((a,b) => (a.sortIndex || 0) - (b.sortIndex || 0));

      const fromIndex = groupTeachers.findIndex(t => t.id === draggedTeacherId);
      const toIndex = groupTeachers.findIndex(t => t.id === targetId);

      if (fromIndex === -1 || toIndex === -1) return;

      const newGroupOrder = [...groupTeachers];
      const [movedItem] = newGroupOrder.splice(fromIndex, 1);
      newGroupOrder.splice(toIndex, 0, movedItem);

      const updatedTeachers = teachers.map(t => {
          if (t.specializationId === groupSpecId && (t.schoolId || 'main') === (activeSchoolId === 'main' || schoolInfo.mergeTeachersView ? (t.schoolId || 'main') : activeSchoolId)) {
               const newIdx = newGroupOrder.findIndex(g => g.id === t.id);
               if (newIdx !== -1) return { ...t, sortIndex: newIdx };
          }
          return t;
      });

      setTeachers(updatedTeachers);
      setDraggedTeacherId(null);
  };

  const handleDeleteAll = () => {
    if (teachers.length === 0) return;
    setShowDeleteAllConfirm(true);
  };

  const confirmDeleteAll = () => {
    setTeachers([]);
    setShowDeleteAllConfirm(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try {
        const newTeachers = await parseTeachersExcel(e.target.files[0]);
        const uniqueNew = newTeachers.filter(nt => !teachers.some(et => et.name === nt.name));
        
        if (uniqueNew.length === 0) {
            showToast('لم يتم إضافة أي معلم - الأسماء موجودة مسبقاً', 'warning');
        } else {
            setTeachers(prev => {
                const maxSort = Math.max(...prev.map(t => t.sortIndex || 0), 0);
                const newWithSort = uniqueNew.map((t, idx) => ({ 
                  id: t.id,
                  name: t.name,
                  specializationId: t.specialization || 'أخرى',
                  assignedSubjectId: '',
                  quotaLimit: t.weeklyQuota || 24,
                  waitingQuota: t.waitingQuota || 0,
                  phone: t.mobile || '',
                  sortIndex: maxSort + 1 + idx,
                  schoolId: activeSchoolId 
                }));
                return [...prev, ...newWithSort];
            });
            showToast(`✅ تم استيراد ${uniqueNew.length} معلماً بنجاح`, 'success');
        }
      } catch (error) {
        console.error(error);
        showToast('حدث خطأ في قراءة الملف', 'error');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    const maxSort = Math.max(...teachers.map(t => t.sortIndex || 0), 0);
    setCurrentTeacher({
        id: `t-${Date.now()}`,
        name: '',
        specializationId: specializations[0]?.id || '99',
        quotaLimit: 24,
        waitingQuota: 0,
        phone: '',
        assignedSubjectId: '',
        sortIndex: maxSort + 1,
        schoolId: activeSchoolId
    });
    setShowModal(true);
  };

  const openEditModal = (t: Teacher) => {
    setModalMode('edit');
    setCurrentTeacher({ ...t });
    setShowModal(true);
  };

  const saveTeacher = () => {
      if (!currentTeacher.name) return alert("يرجى إدخال الاسم");
      
      const teacherToSave = { ...currentTeacher, schoolId: currentTeacher.schoolId || activeSchoolId } as Teacher;
      
      if (modalMode === 'add') {
          setTeachers(prev => [...prev, teacherToSave]);
      } else {
          setTeachers(prev => prev.map(t => t.id === teacherToSave.id ? teacherToSave : t));
      }
      setShowModal(false);
  };

  const removeTeacher = (id: string) => {
      setTeacherToDelete(id);
  };

  const confirmRemoveTeacher = () => {
      if (teacherToDelete) {
          setTeachers(prev => prev.filter(t => t.id !== teacherToDelete));
          setTeacherToDelete(null);
      }
  };

  const openCopyModal = (teacher: Teacher) => {
      setSourceTeacher(teacher);
      setSelectedTargets([]);
      setCopySearchTerm("");
      setShowCopyModal(true);
  };

  const executeCopyQuota = () => {
      if (!sourceTeacher || selectedTargets.length === 0) return;
      
      setTeachers(prev => prev.map(t => {
          if (selectedTargets.includes(t.id)) {
              return {
                  ...t,
                  quotaLimit: copyOptions.basic ? sourceTeacher.quotaLimit : t.quotaLimit,
                  waitingQuota: copyOptions.waiting ? (sourceTeacher.waitingQuota || 0) : t.waitingQuota
              };
          }
          return t;
      }));
      
      alert(`تم تطبيق النصاب على ${selectedTargets.length} معلم`);
      setShowCopyModal(false);
  };

  const handlePrint = () => {
      // Print logic is now simple: print what you see (filtered)
      // Custom CSS handles hiding non-print elements
      setPrintMenuOpen(false);
      setTimeout(() => window.print(), 200);
  };
  
  const moveSection = (specId: string, direction: 'up' | 'down') => {
        const usedSpecs = getUsedSpecializationIds();
        const visibleOrder = specializationOrder.filter(id => usedSpecs.includes(id));
        
        const currentIdx = visibleOrder.indexOf(specId);
        if (currentIdx === -1) return;
        
        const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
        if (targetIdx < 0 || targetIdx >= visibleOrder.length) return;
        
        const targetSpecId = visibleOrder[targetIdx];
        
        const fullCurrentIdx = specializationOrder.indexOf(specId);
        const fullTargetIdx = specializationOrder.indexOf(targetSpecId);
        
        const newOrder = [...specializationOrder];
        newOrder[fullCurrentIdx] = targetSpecId;
        newOrder[fullTargetIdx] = specId;
        setSpecializationOrder(newOrder);
    };

  // --- Render ---

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (printMenuRef.current && !printMenuRef.current.contains(event.target as Node)) {
        setPrintMenuOpen(false);
      }
      if (specDropdownRef.current && !specDropdownRef.current.contains(event.target as Node)) {
        setIsSpecDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTeachers = currentSchoolTeachers.filter(t => {
      // Updated Search: Name only
      const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      // Updated Filter: Multi-select
      const matchSpec = filterSpecializations.length === 0 || filterSpecializations.includes(t.specializationId);
      return matchSearch && matchSpec;
  });

  // Group by specialization
  const groupedTeachers: Record<string, Teacher[]> = {};
  filteredTeachers.forEach(t => {
      const specId = t.specializationId;
      if (!groupedTeachers[specId]) groupedTeachers[specId] = [];
      groupedTeachers[specId].push(t);
  });
  
  // Sort teachers within groups
  Object.keys(groupedTeachers).forEach(key => {
      groupedTeachers[key].sort((a,b) => (a.sortIndex || 0) - (b.sortIndex || 0));
  });

  // Determine order of groups to render
  const specsToRender = specializationOrder.filter(id => groupedTeachers[id] && groupedTeachers[id].length > 0);
  Object.keys(groupedTeachers).forEach(id => {
      if (!specsToRender.includes(id)) specsToRender.push(id);
  });

  const availableTargets = currentSchoolTeachers.filter(t => 
      t.id !== sourceTeacher?.id && 
      t.name.toLowerCase().includes(copySearchTerm.toLowerCase())
  );

  return (
    <>
      {/* ══════ Toast Notification ══════ */}
      {toast && ReactDOM.createPortal(
        <>
          <style>{`@keyframes toastIn { from { opacity:0; top:64px; } to { opacity:1; top:82px; } }`}</style>
          <div
            style={{ top: '82px', left: '50%', transform: 'translateX(-50%)', animation: 'toastIn 0.3s ease-out' }}
            className={`fixed z-[99999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border min-w-[320px] max-w-[90vw] ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              toast.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
                                         'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-100' :
              toast.type === 'error'   ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-600" />}
              {toast.type === 'error'   && <AlertCircle  size={20} className="text-red-600" />}
              {toast.type === 'warning' && <AlertTriangle size={20} className="text-amber-600" />}
            </div>
            <p className="font-bold text-sm flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0">
              <X size={16} className="opacity-50" />
            </button>
          </div>
        </>,
        document.body
      )}

    <div className="space-y-8 animate-in fade-in duration-500 pb-20 print:pb-0 print:space-y-4">
      
      {/* ══════ Header (Hidden in Print) ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6 print:hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>
          
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-[#e5e1fe] text-[#655ac1] rounded-xl"><Users size={24} /></div>
             إدارة المعلمين
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إضافة وتعديل بيانات المعلمين وتعيين الأنصبة والقيود</p>
      </div>

      {/* ══════ Print Header (Visible only in Print) ══════ */}
      <div className="hidden print:block text-center mb-8 border-b-2 border-slate-900 pb-4">
          <h2 className="text-2xl font-black text-slate-900 mb-2">جدول بيانات المعلمين والأنصبة</h2>
          <div className="flex justify-center gap-8 text-sm font-bold text-slate-600">
             <span>المدرسة: {schoolInfo.schoolName}</span>
             <span>التاريخ: {new Date().toLocaleDateString('ar-SA')}</span>
             <span>إجمالي المعلمين: {filteredTeachers.length}</span>
          </div>
      </div>

      {/* ══════ School Tabs & Merge Button (Hidden in Print) ══════ */}
      <div className="mb-6 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-4">
             <SchoolTabs
               schoolInfo={schoolInfo}
               activeSchoolId={activeSchoolId}
               onTabChange={(id) => {
                   setActiveSchoolId(id);
                   setSearchTerm('');
                   setFilterSpecializations([]);
               }}
             />
             
             {/* Redesigned Merge Teachers Button */}
             {schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0 && (
                <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-top-2">
                    <button
                        onClick={() => setSchoolInfo && setSchoolInfo(prev => ({ ...prev, mergeTeachersView: !prev.mergeTeachersView }))}
                        className={`
                            flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all
                            ${schoolInfo.mergeTeachersView 
                                ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-[#655ac1]/20' 
                                : 'bg-white text-slate-600 hover:border-[#655ac1] hover:text-[#655ac1]'}
                        `}
                    >
                         {schoolInfo.mergeTeachersView ? <CheckCircle2 size={18} /> : <Users size={18} />}
                         <span className="font-bold text-xs">دمج المعلمين (للمشتركة)</span>
                    </button>
                    {/* Warning Text */}
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 max-w-xs">
                        <AlertTriangle size={12} className="shrink-0" />
                        يمكن دمج جميع معلمي المدارس المشتركة في قائمة واحدة لعملية إنشاء الجدول فقط
                    </div>
                </div>
             )}
        </div>
      </div>

       {/* ══════ Action Bar (Hidden in Print) ══════ */}
       <div className="flex flex-wrap items-center gap-3 mb-6 print:hidden">
           <input type="file" ref={fileInputRef} hidden accept=".xlsx, .xls" onChange={handleFileUpload} />

           <button
               onClick={() => fileInputRef.current?.click()}
               className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:border-[#8779fb] hover:text-[#655ac1] transition-all hover:scale-105 active:scale-95"
           >
               <Upload size={20} className="text-[#8779fb]" />
               {loading ? 'جاري الاستيراد...' : 'استيراد من Excel'}
           </button>

           <button
               onClick={openAddModal}
               className="flex items-center gap-2 px-6 py-3 bg-[#655ac1] text-white rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 hover:bg-[#5448a8] transition-all hover:scale-105 active:scale-95"
           >
               <Plus size={20} />
               إضافة معلم
           </button>

           <button
               onClick={() => setShowConstraintsModal(true)}
               className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:border-[#8779fb] hover:text-[#655ac1] transition-all hover:scale-105 active:scale-95"
           >
               <Sliders size={20} className="text-[#8779fb]" />
                قيود المعلمين
           </button>

           <div className="flex-1"></div>

           {/* Updated Edit Button */}
           <button 
               onClick={handleBulkEditToggle}
               className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 border ${
                   isBulkEdit 
                   ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                   : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1]'
               }`}
           >
               {isBulkEdit ? <Check size={20} /> : <Edit size={20} />}
               {isBulkEdit ? 'حفظ التعديلات' : 'تعديل'}
           </button>

           <button
               onClick={handlePrint}
               className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:border-slate-300 transition-all hover:scale-105 active:scale-95"
               title="طباعة القائمة الحالية"
           >
               <Printer size={20} />
               طباعة
           </button>

           <button 
               onClick={handleDeleteAll}
               disabled={teachers.length === 0}
               className="flex items-center gap-2 px-6 py-3 bg-white text-rose-600 border border-rose-100 rounded-xl font-bold hover:bg-rose-500 hover:text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
           >
               <Trash2 size={20} />
               حذف الكل
           </button>
       </div>

        {/* ══════ Search & Stats Frame (Hidden in Print) ══════ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col-reverse lg:flex-row items-center gap-4 justify-between print:hidden">
             
             {/* Right Side: Search & Filter */}
             <div className="flex flex-col lg:flex-row items-center gap-4 flex-1 w-full">
                 {/* Search Input (Name Only) */}
                 <div className="relative flex-[2] w-full">
                    <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="بحث باسم المعلم..."
                        className="w-full pr-12 pl-4 py-3 bg-slate-50 border-0 rounded-xl outline-none text-sm font-bold focus:ring-2 focus:ring-[#8779fb]/20 transition-all text-slate-600 placeholder:text-slate-400"
                    />
                     {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                        <X size={16} />
                        </button>
                    )}
                 </div>

                 {/* Specialization Filter (Multi-Select) */}
                 <div className="w-full lg:w-48 shrink-0 relative" ref={specDropdownRef}>
                    <button 
                        onClick={() => setIsSpecDropdownOpen(!isSpecDropdownOpen)}
                        className={`w-full px-4 py-3 bg-slate-50 border-0 rounded-xl outline-none text-sm font-bold text-slate-600 flex justify-between items-center transition-all ${isSpecDropdownOpen ? 'ring-2 ring-[#8779fb]/20' : ''}`}
                    >
                        <span className="truncate">
                            {filterSpecializations.length === 0 
                                ? 'كل التخصصات' 
                                : `تم تحديد (${filterSpecializations.length})`}
                        </span>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isSpecDropdownOpen ? 'rotate-180' : ''}`}/>
                    </button>
                    
                    {isSpecDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden max-h-60 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                             <div className="p-2 border-b border-slate-50">
                                 <button onClick={() => setFilterSpecializations([])} className="w-full text-center text-[10px] text-[#655ac1] font-bold hover:bg-[#f8f7ff] py-1.5 rounded-lg">
                                     إعادة ضبط
                                 </button>
                             </div>
                             <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                 {getUsedSpecializationIds().map(id => (
                                     <button 
                                        key={id}
                                        onClick={() => toggleSpecializationFilter(id)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                            filterSpecializations.includes(id) 
                                                ? 'bg-[#e5e1fe] text-[#655ac1]' 
                                                : 'text-slate-500 hover:bg-slate-50'
                                        }`}
                                     >
                                         <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                              filterSpecializations.includes(id) ? 'bg-[#655ac1] border-[#655ac1]' : 'border-slate-300 bg-white'
                                         }`}>
                                             {filterSpecializations.includes(id) && <Check size={10} className="text-white"/>}
                                         </div>
                                         {getSpecializationName(id)}
                                     </button>
                                 ))}
                             </div>
                        </div>
                    )}
                 </div>
             </div>

             <div className="w-px h-8 bg-slate-200 hidden lg:block mx-2"></div>

             {/* Left Side: Stats */}
             <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end shrink-0">
                 <div className="flex items-center gap-3 px-5 py-2 bg-[#e5e1fe]/50 rounded-xl min-w-[140px] cursor-default border border-[#e5e1fe] hover:shadow-sm transition-all h-[52px]">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm">
                        <Users size={20} className="text-[#655ac1]" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-slate-400 leading-tight">الإجمالي</span>
                        <span className="text-xl font-black text-[#655ac1] leading-none mt-0.5">{filteredTeachers.length}</span>
                    </div>
                 </div>
             </div>
        </div>

      {/* ══════ Teachers List ══════ */}
      <div className="space-y-6 print:space-y-4">
        {specsToRender.map(specId => {
            const group = groupedTeachers[specId];
            return (
                <div key={specId} className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-[#655ac1]/5 overflow-hidden print:shadow-none print:border-2 print:border-slate-800 print:rounded-none print:break-inside-avoid">
                     {/* Section Header */}
                     <div className="bg-white px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-50/50 to-white print:bg-slate-100 print:from-slate-100 print:to-slate-100 print:border-slate-800 print:py-2">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#655ac1] rounded-full print:bg-slate-900" />
                            <h4 className="font-black text-slate-800 text-lg print:text-base">
                                {getSpecializationName(specId)} 
                                <span className="mr-2 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-bold print:border print:border-slate-400 print:text-slate-900">{group.length}</span>
                            </h4>
                        </div>
                        <div className="flex items-center gap-1 print:hidden">
                            <button onClick={() => moveSection(specId, 'up')} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-[#655ac1] transition-all"><ArrowUp size={16}/></button>
                            <button onClick={() => moveSection(specId, 'down')} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-[#655ac1] transition-all"><ArrowDown size={16}/></button>
                        </div>
                     </div>
                     
                     <div className="overflow-x-auto">
                        <table className="w-full text-right">
                             <thead>
                                <tr className="bg-[#f8f7ff] border-b border-slate-100 print:bg-white print:border-slate-800">
                                   <th className="p-4 w-16 text-center text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-2">#</th>
                                   <th className="p-4 text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-2">اسم المعلم</th>
                                   <th className="p-4 text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-2">رقم الجوال</th>
                                   <th className="p-4 text-center w-32 text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-2">نصاب الحصص</th>
                                   <th className="p-4 text-center w-32 text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-2">نصاب الانتظار</th>
                                   <th className="p-4 text-center w-32 text-xs font-black text-[#655ac1] print:text-slate-900 print:p-2">المجموع</th>
                                   <th className="p-4 w-32 text-center text-xs font-black text-[#655ac1] print:hidden">إجراءات</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50 print:divide-slate-300">
                                {group.map((t, idx) => (
                                    <tr 
                                        key={t.id} 
                                        draggable={!isBulkEdit}
                                        onDragStart={(e) => handleDragStart(e, t.id)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, t.id, specId)}
                                        className={`
                                            transition-colors group print:break-inside-avoid
                                            ${draggedTeacherId === t.id ? 'bg-[#e5e1fe]/30 opacity-50' : 'hover:bg-[#e5e1fe]/10 print:hover:bg-transparent'}
                                        `}
                                    >
                                        <td className="p-4 text-center relative print:border-l print:border-slate-300 print:p-2">
                                            <div className="flex items-center justify-center gap-1">
                                                {!isBulkEdit && (
                                                    <div 
                                                        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-[#655ac1] transition-colors absolute right-2 opacity-0 group-hover:opacity-100 print:hidden"
                                                        title="سحب للترتيب"
                                                    >
                                                        <GripVertical size={16} />
                                                    </div>
                                                )}
                                                <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 flex items-center justify-center rounded-full print:bg-transparent print:text-slate-900 print:w-auto print:h-auto">{idx + 1}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-700 print:border-l print:border-slate-300 print:p-2 print:text-black">
                                            {isBulkEdit ? (
                                                <input 
                                                    value={t.name} 
                                                    onChange={e => setTeachers(prev => prev.map(pt => pt.id === t.id ? {...pt, name: e.target.value} : pt))} 
                                                    className="w-full p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-sm font-bold shadow-sm"
                                                />
                                            ) : (
                                                <span className="group-hover:text-[#655ac1] transition-colors print:text-black">{t.name}</span>
                                            )}
                                        </td>
                                        <td className="p-4 print:border-l print:border-slate-300 print:p-2">
                                             {isBulkEdit ? (
                                                <input 
                                                    value={t.phone} 
                                                    onChange={e => setTeachers(prev => prev.map(pt => pt.id === t.id ? {...pt, phone: e.target.value} : pt))} 
                                                    className="w-full p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-sm font-bold text-center dir-ltr shadow-sm"
                                                />
                                            ) : (
                                                <span className="text-xs font-bold text-slate-500 font-mono print:text-black" dir="ltr">{t.phone || '-'}</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center print:border-l print:border-slate-300 print:p-2">
                                             {isBulkEdit ? (
                                                <input 
                                                    type="number" 
                                                    value={t.quotaLimit} 
                                                    onChange={e => setTeachers(prev => prev.map(pt => pt.id === t.id ? {...pt, quotaLimit: Number(e.target.value)} : pt))} 
                                                    className="w-20 p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-center font-bold shadow-sm mx-auto"
                                                />
                                            ) : (
                                                <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600 print:bg-transparent print:text-black print:p-0">
                                                    {t.quotaLimit}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center print:border-l print:border-slate-300 print:p-2">
                                             {isBulkEdit ? (
                                                <input 
                                                    type="number" 
                                                    value={t.waitingQuota || 0} 
                                                    onChange={e => setTeachers(prev => prev.map(pt => pt.id === t.id ? {...pt, waitingQuota: Number(e.target.value)} : pt))} 
                                                    className="w-20 p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-center font-bold shadow-sm mx-auto"
                                                />
                                            ) : (
                                                <span className="inline-block px-3 py-1 bg-orange-50 rounded-full text-xs font-bold text-orange-600 print:bg-transparent print:text-black print:p-0">
                                                    {t.waitingQuota || 0}
                                                </span>
                                            )}
                                        </td>
                                         <td className="p-4 text-center print:p-2">
                                            <span className="inline-block px-3 py-1 bg-[#e5e1fe] rounded-full text-xs font-black text-[#655ac1] print:bg-transparent print:text-black print:p-0">
                                                {(t.quotaLimit || 0) + (t.waitingQuota || 0)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center print:hidden">
                                            {!isBulkEdit && (
                                                <div className="flex justify-center gap-2 opacity-100">
                                                    <button 
                                                        onClick={() => openEditModal(t)} 
                                                        className="p-2 text-slate-400 bg-slate-50 hover:text-[#655ac1] hover:bg-[#e5e1fe] rounded-xl transition-all"
                                                        title="تعديل"
                                                    >
                                                        <Edit size={16}/>
                                                    </button>
                                                    <button 
                                                        onClick={() => openCopyModal(t)} 
                                                        className="p-2 text-slate-400 bg-slate-50 hover:text-[#655ac1] hover:bg-[#e5e1fe] rounded-xl transition-all"
                                                        title="نسخ النصاب"
                                                    >
                                                        <Copy size={16}/>
                                                    </button>
                                                    <button 
                                                        onClick={() => removeTeacher(t.id)} 
                                                        className="p-2 text-slate-400 bg-slate-50 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                        title="حذف"
                                                    >
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                             </tbody>
                        </table>
                     </div>
                </div>
            );
        })}
         
         {filteredTeachers.length === 0 && (
            <div className="p-12 text-center text-slate-400 bg-white rounded-[2rem] border border-dashed border-slate-200 print:hidden">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={32} className="text-slate-300" />
                </div>
                <p className="font-bold text-slate-500">لا يوجد معلمين يطابقون البحث</p>
                <p className="text-xs mt-2 text-slate-400">جرب البحث باسم آخر أو تغيير التخصص</p>
            </div>
        )}
      </div>

      {/* ══════ Modals (Hidden in Print) ══════ */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
             <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                        {modalMode === 'add' ? <User size={24} className="text-emerald-500" /> : <Edit size={24} className="text-[#655ac1]" />}
                        {modalMode === 'add' ? 'إضافة معلم جديد' : 'تعديل بيانات معلم'}
                    </h3>
                    <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">اسم المعلم <span className="text-rose-500">*</span></label>
                        <input 
                            value={currentTeacher.name} 
                            onChange={e => setCurrentTeacher({...currentTeacher, name: e.target.value})} 
                            placeholder="الاسم الثلاثي أو الرباعي"
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] focus:ring-4 focus:ring-[#e5e1fe] transition-all" 
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-2">التخصص</label>
                            <select 
                                value={currentTeacher.specializationId} 
                                onChange={e => setCurrentTeacher({...currentTeacher, specializationId: e.target.value})} 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] transition-all"
                            >
                                {specializations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-2">رقم الجوال</label>
                            <input 
                                value={currentTeacher.phone} 
                                onChange={e => setCurrentTeacher({...currentTeacher, phone: e.target.value})} 
                                placeholder="05xxxxxxxx"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] transition-all text-center" 
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0 && !schoolInfo.mergeTeachersView && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">المدرسة التابع لها</label>
                            <select 
                                value={currentTeacher.schoolId || 'main'} 
                                onChange={e => setCurrentTeacher({...currentTeacher, schoolId: e.target.value})} 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] transition-all"
                            >
                                <option value="main">{schoolInfo.schoolName}</option>
                                {schoolInfo.sharedSchools.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                     <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 text-center">نصاب الحصص</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={currentTeacher.quotaLimit} 
                                    onChange={e => setCurrentTeacher({...currentTeacher, quotaLimit: Number(e.target.value)})} 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xl font-black text-center focus:border-[#655ac1] transition-all" 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 text-center">نصاب الانتظار</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={currentTeacher.waitingQuota || 0} 
                                    onChange={e => setCurrentTeacher({...currentTeacher, waitingQuota: Number(e.target.value)})} 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xl font-black text-center focus:border-orange-400 transition-all text-orange-600" 
                                />
                            </div>
                        </div>
                     </div>
                </div>

                <div className="p-6 bg-slate-50 flex gap-3">
                    <button 
                        onClick={saveTeacher} 
                        className="flex-1 py-4 bg-[#655ac1] text-white font-black text-sm rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 size={18} /> حفظ البيانات
                    </button>
                    <button 
                        onClick={() => setShowModal(false)}
                        className="flex-1 py-4 bg-white text-slate-400 border border-slate-200 font-bold text-sm rounded-xl hover:bg-slate-100 transition-all"
                    >
                        إلغاء
                    </button>
                </div>
             </div>
        </div>
      )}

      {/* ══════ Copy Quota Modal (Hidden in Print) ══════ */}
      {showCopyModal && sourceTeacher && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
                <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                     {/* Header */}
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                             <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                                <Copy size={24} className="text-[#655ac1]" />
                                نسخ النصاب من: {sourceTeacher.name}
                             </h3>
                             <p className="text-xs text-slate-500 mt-1">حدد البيانات المراد نسخها والمعلمين المستهدفين</p>
                        </div>
                        <button onClick={() => setShowCopyModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                            <X size={20} />
                        </button>
                     </div>

                     {/* Content */}
                     <div className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
                          {/* 1. Select Data to Copy */}
                          <div className="bg-[#f8f7ff] p-4 rounded-xl border border-[#e5e1fe] flex flex-wrap gap-4">
                               <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCopyOptions(prev => ({...prev, basic: !prev.basic}))}>
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${copyOptions.basic ? 'bg-[#655ac1] border-[#655ac1]' : 'bg-white border-slate-300'}`}>
                                        {copyOptions.basic && <Check size={14} className="text-white"/>}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">نصاب الحصص ({sourceTeacher.quotaLimit})</span>
                               </div>
                               <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCopyOptions(prev => ({...prev, waiting: !prev.waiting}))}>
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${copyOptions.waiting ? 'bg-[#655ac1] border-[#655ac1]' : 'bg-white border-slate-300'}`}>
                                        {copyOptions.waiting && <Check size={14} className="text-white"/>}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">نصاب الانتظار ({sourceTeacher.waitingQuota || 0})</span>
                               </div>
                          </div>

                          {/* 2. Target Teachers */}
                          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                               <div className="flex justify-between items-center">
                                   <label className="text-xs font-bold text-slate-500">اختر المعلمين لتطبيق النصاب عليهم</label>
                                   <div className="flex gap-2">
                                        <button 
                                            onClick={() => setSelectedTargets(availableTargets.map(t => t.id))}
                                            className="text-[10px] font-bold text-[#655ac1] hover:underline"
                                        >
                                            تحديد الكل
                                        </button>
                                        <button 
                                            onClick={() => setSelectedTargets([])}
                                            className="text-[10px] font-bold text-slate-400 hover:text-rose-500 hover:underline"
                                        >
                                            إلغاء التحديد
                                        </button>
                                   </div>
                               </div>
                               
                               <div className="relative">
                                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input 
                                        value={copySearchTerm}
                                        onChange={e => setCopySearchTerm(e.target.value)}
                                        placeholder="بحث في القائمة..."
                                        className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#655ac1]"
                                    />
                               </div>

                               <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl p-2 space-y-1">
                                    {availableTargets.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 text-sm">لا يوجد معلمين آخرين</div>
                                    ) : (
                                        availableTargets.map(t => (
                                            <div 
                                                key={t.id}
                                                onClick={() => {
                                                    if(selectedTargets.includes(t.id)) setSelectedTargets(prev => prev.filter(id => id !== t.id));
                                                    else setSelectedTargets(prev => [...prev, t.id]);
                                                }}
                                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${
                                                    selectedTargets.includes(t.id) 
                                                    ? 'bg-[#f0fdf6] border-emerald-200 shadow-sm' 
                                                    : 'bg-white border-transparent hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${ selectedTargets.includes(t.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300' }`}>
                                                        {selectedTargets.includes(t.id) && <Check size={14} className="text-white"/>}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800">{t.name}</div>
                                                        <div className="text-[10px] text-slate-500">{getSpecializationName(t.specializationId)}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                                                     <span title="النصاب الحالي">{t.quotaLimit}</span>
                                                     <span className="text-slate-300">|</span>
                                                     <span title="نصاب الانتظار الحالي" className="text-orange-400">{t.waitingQuota || 0}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                               </div>
                          </div>
                     </div>

                     {/* Footer */}
                     <div className="p-6 bg-slate-50 flex gap-3 border-t border-slate-100">
                         <div className="flex-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                             <span>تم تحديد:</span>
                             <span className="bg-[#655ac1] text-white px-2 py-0.5 rounded-md">{selectedTargets.length}</span>
                             <span>معلم</span>
                         </div>
                         <button 
                             onClick={executeCopyQuota}
                             disabled={selectedTargets.length === 0}
                             className="px-6 py-3 bg-[#655ac1] text-white font-bold rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                         >
                             تطبيق النسخ
                         </button>
                     </div>
                </div>
           </div>
      )}
     {/* ══════ Teacher Constraints Modal ══════ */}
     {/* Delete Single Teacher Confirmation Modal */}
     {teacherToDelete && (
       <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
         <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
           <div className="p-6 text-center">
             <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <Trash2 size={32} className="text-rose-500" />
             </div>
             <h2 className="text-xl font-black text-slate-800 mb-2">تأكيد حذف المعلم</h2>
             <p className="text-sm font-medium text-slate-500 leading-relaxed">
               هل أنت متأكد من رغبتك في حذف هذا المعلم؟ لا يمكن التراجع عن هذا الإجراء.
             </p>
           </div>
           <div className="p-6 pt-0 flex gap-3">
             <button
               onClick={() => setTeacherToDelete(null)}
               className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
             >
               تراجع
             </button>
             <button
               onClick={confirmRemoveTeacher}
               className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
             >
               نعم، احذف المعلم
             </button>
           </div>
         </div>
       </div>
     )}

     {/* Delete All Confirmation Modal */}
     {showDeleteAllConfirm && (
       <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
         <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
           <div className="p-6 text-center">
             <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <Trash2 size={32} className="text-rose-500" />
             </div>
             <h2 className="text-xl font-black text-slate-800 mb-2">تأكيد حذف جميع المعلمين</h2>
             <p className="text-sm font-medium text-slate-500 leading-relaxed">
               هل أنت متأكد من رغبتك في حذف جميع المعلمين؟ لا يمكن التراجع عن هذا الإجراء.
             </p>
           </div>
           <div className="p-6 pt-0 flex gap-3">
             <button
               onClick={() => setShowDeleteAllConfirm(false)}
               className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
             >
               تراجع
             </button>
             <button
               onClick={confirmDeleteAll}
               className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
             >
               نعم، احذف الكل
             </button>
           </div>
         </div>
       </div>
     )}
     <TeacherConstraintsModal 
        isOpen={showConstraintsModal}
        onClose={() => setShowConstraintsModal(false)}
        teachers={teachers}
        specializations={specializations}
        constraints={scheduleSettings?.teacherConstraints || []}
        meetings={scheduleSettings?.meetings || []}
        activeDays={schoolInfo.timing?.activeDays || ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']}
        periodsPerDay={Math.max(7, ...(Object.values(schoolInfo.timing?.periodCounts || {}) as number[]))}
        periodCounts={schoolInfo.timing?.periodCounts || {}}
        warnings={[]} // Optional: Pass actual warnings if needed/calculated
        classes={classes}
        onChangeConstraints={c => setScheduleSettings && setScheduleSettings(prev => ({ ...prev, teacherConstraints: c }))}
        onChangeMeetings={m => setScheduleSettings && setScheduleSettings(prev => ({ ...prev, meetings: m }))}
     />
    </div>
    </>
  );
};

export default Step6Teachers;
