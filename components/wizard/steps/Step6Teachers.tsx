import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Teacher, Specialization, SchoolInfo, ScheduleSettingsData, ClassInfo } from '../../../types';
import { BookOpen, Plus, X, Upload, Trash2, Edit, Edit2, Edit3, Pen, Pencil, Check, ChevronDown, ChevronUp, Search, Printer, List, User, UserPlus, Users, GripVertical, AlertTriangle, CheckCircle2, ArrowUp, ArrowDown, Copy, CheckSquare, Square, Sliders, Info, AlertCircle, Settings2 } from 'lucide-react';
import { INITIAL_SPECIALIZATIONS } from '../../../constants';
import { parseTeachersExcel, TeacherData } from '../../../utils/excelTeachers';
import SchoolTabs from '../SchoolTabs';
import TeacherConstraintsModal from '../../teachers/TeacherConstraintsModal';
import PrintHeader from '../../ui/PrintHeader';
import LoadingLogo, { useMinLoadingTime } from '../../ui/LoadingLogo';

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

type DropdownOption = { id: string; name: string };

const SaveCheckIcon = ({ className = "bg-[#655ac1]" }: { className?: string }) => (
  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border border-white ${className}`}>
    <Check size={13} strokeWidth={3.2} className="text-white" />
  </span>
);

const TeacherSelectDropdown: React.FC<{
  value?: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ value, options, onChange, placeholder = 'اختر' }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.id === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative w-full" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full px-5 py-3.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 ${open ? 'ring-2 ring-[#8779fb]/20 border-[#655ac1]/40' : ''}`}
      >
        <span className="truncate text-[13px] leading-tight">{selected?.name || placeholder}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5">
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {options.map(opt => {
              const active = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center justify-between ${active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}
                >
                  <span>{opt.name}</span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${active ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'}`}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const Step6Teachers: React.FC<Step6Props> = ({ teachers = [], setTeachers, specializations = [], schoolInfo, scheduleSettings, setScheduleSettings, classes }) => {
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
  const [constraintsInitialTeacherId, setConstraintsInitialTeacherId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentTeacher, setCurrentTeacher] = useState<Partial<Teacher>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const showImportLoader = useMinLoadingTime(loading, 2500);
  
  // Bulk Edit Logic
  const [isBulkEdit, setIsBulkEdit] = useState(false);
  const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
  const teachersSnapshot = useRef<string>("");

  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);
  
  // Custom Specialization Order State
  const [specializationOrder, setSpecializationOrder] = useState<string[]>(INITIAL_SPECIALIZATIONS.map(s => s.id));

  // Drag and Drop State
  const [draggedTeacherId, setDraggedTeacherId] = useState<string | null>(null);

  // Custom specialization for "آخر"
  const [customSpecName, setCustomSpecName] = useState('');

  const MODAL_SPECS = [
    { id: '1',  name: 'دين' },
    { id: '2',  name: 'عربي' },
    { id: '3',  name: 'رياضيات' },
    { id: '4',  name: 'علوم' },
    { id: '5',  name: 'انجليزي' },
    { id: '6',  name: 'الاجتماعيات' },
    { id: '7',  name: 'الحاسب' },
    { id: '8',  name: 'الفنية' },
    { id: '9',  name: 'البدنية' },
    { id: '10', name: 'كيمياء' },
    { id: '11', name: 'أحياء' },
    { id: '12', name: 'فيزياء' },
    { id: '13', name: 'علوم إدارية' },
    { id: '14', name: 'تربية فكرية' },
    { id: '15', name: 'صعوبات تعلم' },
    { id: '16', name: 'توحد' },
    { id: '17', name: 'المكتبات' },
    { id: '99', name: 'آخر' },
  ];

  // Copy Quota Modal State
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [sourceTeacher, setSourceTeacher] = useState<Teacher | null>(null);
  const [copyOptions, setCopyOptions] = useState({ basic: true, waiting: true });
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [copyTargetMode, setCopyTargetMode] = useState<'teachers' | 'specs' | 'all'>('teachers');
  const [copyTargetSpecIds, setCopyTargetSpecIds] = useState<string[]>([]);
  const [copySearchTerm, setCopySearchTerm] = useState("");

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Delete All Confirmation State
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Delete Single Teacher Confirmation State
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const [deleteSpecModal, setDeleteSpecModal] = useState<{ specId: string; selectedIds: string[] } | null>(null);
  const [deleteSelectedModalOpen, setDeleteSelectedModalOpen] = useState(false);
  const [teacherDeleteSelectionMode, setTeacherDeleteSelectionMode] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [deleteSelectedSpecIds, setDeleteSelectedSpecIds] = useState<string[]>([]);
  const [deleteSelectedTeacherIds, setDeleteSelectedTeacherIds] = useState<string[]>([]);
  const [showDeleteSelectedConfirm, setShowDeleteSelectedConfirm] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printScope, setPrintScope] = useState<'all' | 'spec'>('all');
  const [printSpecId, setPrintSpecId] = useState('');

  // Action Dropdown State
  const [actionDropdown, setActionDropdown] = useState<{ teacherId: string; top: number; left: number } | null>(null);

  // Import Review Modal State
  const [showImportReviewModal, setShowImportReviewModal] = useState(false);
  const [showSelectAllConfirm, setShowSelectAllConfirm] = useState(false);
  const [importReviewItems, setImportReviewItems] = useState<{
    row: TeacherData;
    matchType: 'id' | 'exact_name' | 'partial_name';
    existing: Teacher;
    existingSchoolName: string;
    choice: 'link' | 'add_new' | 'skip';
  }[]>([]);
  const [importDirectTeachers, setImportDirectTeachers] = useState<Teacher[]>([]);

  // Link School Modal State
  const [showLinkSchoolModal, setShowLinkSchoolModal]   = useState(false);
  const [linkSchoolTeacherId, setLinkSchoolTeacherId]   = useState<string | null>(null);
  const [linkSchoolSelectedId, setLinkSchoolSelectedId] = useState('');
  const [linkSchoolDuplicate, setLinkSchoolDuplicate]   = useState<string>('new'); // teacher id or 'new'
  const [linkSchoolLessons, setLinkSchoolLessons]       = useState<number>(24);
  const [linkSchoolWaiting, setLinkSchoolWaiting]       = useState<number>(0);

  // Unlink School Modal State
  const [showUnlinkSchoolModal, setShowUnlinkSchoolModal]     = useState(false);
  const [unlinkSchoolTeacherId, setUnlinkSchoolTeacherId]     = useState<string | null>(null);
  const [unlinkSchoolSelectedId, setUnlinkSchoolSelectedId]   = useState('');
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- Helpers ---
  const currentSchoolTeachers = useMemo(() => {
    if (schoolInfo.mergeTeachersView) return teachers;
    return teachers.filter(t =>
      (t.schoolId || 'main') === activeSchoolId ||          // legacy field
      t.schools?.some(s => s.schoolId === activeSchoolId)   // new schools[] array
    );
  }, [teachers, activeSchoolId, schoolInfo.mergeTeachersView]);

  const getUsedSpecializationIds = (): string[] => {
    return Array.from(new Set(currentSchoolTeachers.map(t => t.specializationId))) as string[];
  };

  const getSpecializationName = (id: string) => {
      const modalSpec = MODAL_SPECS.find(s => s.id === id);
      if (modalSpec && modalSpec.id !== '99') return modalSpec.name;
      const spec = specializations.find(s => s.id === id);
      if (spec) return spec.name;
      return id; // custom specialization â€” show as-is
  };

  const buildTeacherShortName = (name?: string) => {
      const parts = (name || '').trim().split(/\s+/).filter(Boolean);
      if (parts.length <= 2) return parts.join(' ');
      return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  const getTeacherShortName = (teacher: Teacher) => {
      return teacher.shortName?.trim() || buildTeacherShortName(teacher.name);
  };

  const getSchoolQuota = (teacher: Teacher, schoolId = activeSchoolId) => {
      if (teacher.isShared || teacher.schools?.length) {
          const entry = teacher.schools?.find(s => s.schoolId === schoolId);
          if (entry) {
              return {
                  lessons: entry.lessons || 0,
                  waiting: entry.waiting || 0,
                  total: (entry.lessons || 0) + (entry.waiting || 0),
              };
          }
      }
      const lessons = teacher.quotaLimit || 0;
      const waiting = teacher.waitingQuota || 0;
      return { lessons, waiting, total: lessons + waiting };
  };

  const getTeacherOverallQuotaTotal = (teacher: Teacher) => {
      if (teacher.isShared && teacher.schools?.length) {
          return teacher.schools.reduce((sum, s) => sum + (s.lessons || 0) + (s.waiting || 0), 0);
      }
      return (teacher.quotaLimit || 0) + (teacher.waitingQuota || 0);
  };

  const getMissingTeacherFields = (teacher: Teacher) => {
      const quota = getSchoolQuota(teacher);
      const importedMissing = new Set<string>(teacher.missingFields || []);
      const missing = new Set<string>();
      if (!teacher.name?.trim()) missing.add('الاسم');
      if (!teacher.specializationId || (importedMissing.has('التخصص') && teacher.specializationId === '99')) missing.add('التخصص');
      if (!teacher.phone?.trim()) missing.add('الجوال');
      if (quota.lessons === undefined || quota.lessons === null || (importedMissing.has('نصاب الحصص') && quota.lessons === 0)) missing.add('نصاب الحصص');
      if (quota.waiting === undefined || quota.waiting === null || (importedMissing.has('نصاب الانتظار') && quota.waiting === 0)) missing.add('نصاب الانتظار');
      return Array.from(missing);
  };

  const getSpecializationOptions = () => {
      const options = new Map<string, string>();
      MODAL_SPECS.filter(s => s.id !== '99').forEach(s => options.set(s.id, s.name));
      specializations.forEach(s => options.set(s.id, s.name));
      teachers.forEach(t => {
          if (t.specializationId && !options.has(t.specializationId)) {
              options.set(t.specializationId, getSpecializationName(t.specializationId));
          }
      });
      return Array.from(options.entries()).map(([id, name]) => ({ id, name }));
  };

  // --- Handlers ---

  const toggleSpecializationFilter = (id: string) => {
      setFilterSpecializations(prev => 
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const handleBulkEditToggle = () => {
      if (!isBulkEdit) {
          if (currentSchoolTeachers.length === 0) {
              showToast('لا يوجد معلمون في القائمة للتعديل', 'warning');
              return;
          }
          // Entering Edit Mode: Snapshot current state
          teachersSnapshot.current = JSON.stringify(teachers);
          setEditingSpecId(null);
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
      if (isBulkEdit || editingSpecId) return; // Disable DnD during edit
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
    if (!e.target.files?.[0]) return;
    setLoading(true);
    try {
      const rows = await parseTeachersExcel(e.target.files[0]);

      const getSchName = (sId: string): string =>
        sId === 'main'
          ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
          : schoolInfo.sharedSchools?.find(s => s.id === sId)?.name || sId;

      let sortBase = Math.max(...teachers.map(t => t.sortIndex || 0), 0);
      const buildT = (row: TeacherData): Teacher => ({
        id: row.id, name: row.name,
        shortName: buildTeacherShortName(row.name),
        specializationId: row.specialization || 'أخرى',
        assignedSubjectId: '', quotaLimit: row.weeklyQuota ?? 0,
        waitingQuota: row.waitingQuota || 0, phone: row.mobile || '',
        missingFields: row.missingFields || [],
        sortIndex: ++sortBase, schoolId: activeSchoolId,
        isShared: false, idNumber: row.idNumber || null,
        schools: [{ schoolId: activeSchoolId, schoolName: getSchName(activeSchoolId), subjects: [], classes: [], lessons: row.weeklyQuota ?? 0, waiting: row.waitingQuota || 0 }],
        constraints: { presenceDays: {} },
      });

      const directTeachers: Teacher[] = [];
      const reviewItems: typeof importReviewItems = [];

      for (const row of rows) {
        if (row.idNumber) {
          const existing = teachers.find(t => t.idNumber === row.idNumber);
          if (existing) {
            reviewItems.push({ row, matchType: 'id', existing,
              existingSchoolName: existing.schools?.[0]?.schoolName || getSchName(existing.schoolId || 'main'),
              choice: 'link' });
            continue;
          }
          directTeachers.push(buildT(row));
          continue;
        }
        const exactMatch   = teachers.find(t => t.name.trim() === row.name.trim());
        const partialMatch = !exactMatch && teachers.find(t => {
          const ex = t.name.trim().split(' '), inc = row.name.trim().split(' ');
          return ex[0] === inc[0] && ex[ex.length - 1] === inc[inc.length - 1];
        });
        const matched = exactMatch || partialMatch;
        if (matched) {
          reviewItems.push({ row,
            matchType: exactMatch ? 'exact_name' : 'partial_name',
            existing: matched,
            existingSchoolName: matched.schools?.[0]?.schoolName || getSchName(matched.schoolId || 'main'),
            choice: exactMatch ? 'link' : 'add_new' });
          continue;
        }
        directTeachers.push(buildT(row));
      }

      if (reviewItems.length > 0) {
        setImportDirectTeachers(directTeachers);
        setImportReviewItems(reviewItems);
        setShowImportReviewModal(true);
      } else if (directTeachers.length > 0) {
        setTeachers(prev => [...prev, ...directTeachers]);
        showToast(`✓ تم استيراد ${directTeachers.length} معلماً بنجاح`, 'success');
      } else {
        showToast('لم تتم إضافة أي معلم - الأسماء موجودة مسبقاً', 'warning');
      }
    } catch (error) {
      console.error(error);
      showToast('حدث خطأ في قراءة الملف', 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmImportReview = () => {
    const getSchName = (sId: string): string =>
      sId === 'main'
        ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
        : schoolInfo.sharedSchools?.find(s => s.id === sId)?.name || sId;

    let sortBase = Math.max(
      ...teachers.map(t => t.sortIndex || 0),
      ...importDirectTeachers.map(t => t.sortIndex || 0), 0
    );
    const toAdd: Teacher[] = [
      ...importDirectTeachers,
      ...importReviewItems.filter(i => i.choice === 'add_new').map(i => ({
        id: i.row.id, name: i.row.name,
        shortName: buildTeacherShortName(i.row.name),
        specializationId: i.row.specialization || 'أخرى',
        assignedSubjectId: '', quotaLimit: i.row.weeklyQuota ?? 0,
        waitingQuota: i.row.waitingQuota || 0, phone: i.row.mobile || '',
        missingFields: i.row.missingFields || [],
        sortIndex: ++sortBase, schoolId: activeSchoolId,
        isShared: false, idNumber: i.row.idNumber || null,
        schools: [{ schoolId: activeSchoolId, schoolName: getSchName(activeSchoolId), subjects: [], classes: [], lessons: i.row.weeklyQuota ?? 0, waiting: i.row.waitingQuota || 0 }],
        constraints: { presenceDays: {} },
      })),
    ];
    const toLink = importReviewItems.filter(i => i.choice === 'link').map(i => i.existing.id);

    setTeachers(prev => {
      let next = [...prev, ...toAdd];
      if (toLink.length > 0)
        next = next.map(t => !toLink.includes(t.id) ? t : {
          ...t, isShared: true,
          schools: [...(t.schools || []), { schoolId: activeSchoolId, schoolName: getSchName(activeSchoolId), subjects: [], classes: [], lessons: 0, waiting: 0 }],
        });
      return next;
    });

    const added = toAdd.length, linked = toLink.length, skipped = importReviewItems.filter(i => i.choice === 'skip').length;
    const parts = [added && `إضافة ${added}`, linked && `ربط ${linked} كمشترك`, skipped && `تجاهل ${skipped}`].filter(Boolean);
    showToast(`✓ ${parts.join(' - ')}`, 'success');
    setShowImportReviewModal(false); setShowSelectAllConfirm(false);
    setImportReviewItems([]);
    setImportDirectTeachers([]);
  };

  const openAddModal = () => {
    setModalMode('add');
    setCustomSpecName('');
    const maxSort = Math.max(...teachers.map(t => t.sortIndex || 0), 0);
    setCurrentTeacher({
        id: `t-${Date.now()}`,
        name: '',
        shortName: '',
        specializationId: '1',
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
    const knownIds = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','99'];
    if (!knownIds.includes(t.specializationId)) {
        setCustomSpecName(t.specializationId);
        setCurrentTeacher({ ...t, specializationId: '99' });
    } else {
        setCustomSpecName('');
        setCurrentTeacher({ ...t });
    }
    setShowModal(true);
  };

  const saveTeacher = () => {
      if (!currentTeacher.name) return alert("يرجى إدخال الاسم");
      if (currentTeacher.quotaLimit === undefined || currentTeacher.quotaLimit === null || Number.isNaN(Number(currentTeacher.quotaLimit))) return alert("يرجى إدخال نصاب الحصص");
      if (currentTeacher.waitingQuota === undefined || currentTeacher.waitingQuota === null || Number.isNaN(Number(currentTeacher.waitingQuota))) return alert("يرجى إدخال نصاب الانتظار");

      let specId = currentTeacher.specializationId;
      if (specId === '99') {
          if (!customSpecName.trim()) return alert("يرجى كتابة اسم التخصص");
          specId = customSpecName.trim();
      }

      const schoolIdForSave = currentTeacher.schoolId || activeSchoolId;
      const schoolNameForSave = schoolIdForSave === 'main'
        ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
        : schoolInfo.sharedSchools?.find(s => s.id === schoolIdForSave)?.name || schoolIdForSave;
      const teacherToSave = {
        ...currentTeacher,
        shortName: currentTeacher.shortName?.trim() || buildTeacherShortName(currentTeacher.name),
        missingFields: [],
        specializationId: specId,
        schoolId: schoolIdForSave,
        schools: currentTeacher.schools?.length
          ? currentTeacher.schools
          : [{ schoolId: schoolIdForSave, schoolName: schoolNameForSave, subjects: [], classes: [], lessons: currentTeacher.quotaLimit || 0, waiting: currentTeacher.waitingQuota || 0 }],
      } as Teacher;

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
      setCopyTargetMode('teachers');
      setCopyTargetSpecIds([]);
      setCopyOptions({ basic: true, waiting: true });
      setCopySearchTerm("");
      setShowCopyModal(true);
  };

  const openCopyModalForSpec = (specId: string) => {
      setSourceTeacher(currentSchoolTeachers.find(t => t.specializationId === specId) || null);
      setSelectedTargets([]);
      setCopyTargetMode('specs');
      setCopyTargetSpecIds([specId]);
      setCopyOptions({ basic: true, waiting: true });
      setCopySearchTerm("");
      setShowCopyModal(true);
  };

  const openTeacherConstraints = (teacherId?: string) => {
      setConstraintsInitialTeacherId(teacherId || null);
      setShowConstraintsModal(true);
  };

  const openLinkSchoolModal = (teacherId: string) => {
    setLinkSchoolTeacherId(teacherId);
    setLinkSchoolSelectedId('');
    setLinkSchoolDuplicate('');
    setLinkSchoolLessons(0);
    setLinkSchoolWaiting(0);
    setShowLinkSchoolModal(true);
  };

  const confirmLinkSchool = () => {
    if (!linkSchoolTeacherId || !linkSchoolSelectedId) return;
    const schoolName = linkSchoolSelectedId === 'main'
      ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
      : schoolInfo.sharedSchools?.find(s => s.id === linkSchoolSelectedId)?.name || linkSchoolSelectedId;

    if (linkSchoolDuplicate && linkSchoolDuplicate !== 'new') {
      // ط¯ظ…ط¬ ظ…ط¹ ظ…ط¹ظ„ظ… ظ…ظˆط¬ظˆط¯: ط§ط­طھظپط¸ ط¨ط§ظ„ط£ظ‚ط¯ظ… ظˆط§ظ†ظ‚ظ„ schools[] ظ…ظ† ط§ظ„ظ…ظƒرر
      const main = teachers.find(t => t.id === linkSchoolTeacherId)!;
      const dup  = teachers.find(t => t.id === linkSchoolDuplicate)!;
      const keep   = (main.sortIndex ?? Infinity) <= (dup.sortIndex ?? Infinity) ? main : dup;
      const remove = keep.id === main.id ? dup : main;
      setTeachers(prev => prev
        .filter(t => t.id !== remove.id)
        .map(t => {
          if (t.id !== keep.id) return t;
          const merged = [...(t.schools || [])];
          (remove.schools || []).forEach(s => {
            if (!merged.some(ms => ms.schoolId === s.schoolId)) merged.push(s);
          });
          return { ...t, isShared: true, schools: merged };
        })
      );
    } else {
      // ط¥ط¶ط§ظپط© ظ…ط¯ط±ط³ط© ط¬ط¯ظٹط¯ط© ظ„ظ„ظ…ط¹ظ„ظ… ط§ظ„ط­ط§ظ„ظٹ â€” ط¨ط¯ظˆن خصم من المدرسة الحالية
      setTeachers(prev => prev.map(t => {
        if (t.id !== linkSchoolTeacherId) return t;
        const primaryId = t.schoolId || 'main';
        const primaryName = primaryId === 'main'
          ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
          : schoolInfo.sharedSchools?.find(s => s.id === primaryId)?.name || primaryId;
        // ط§ط¨ط¯ط£ ظ…ظ† schools[] ط§ظ„ظ…ظˆط¬ظˆط¯ة، ط£ظˆ ط£ظ†ط´ط¦ ظ…ط¯ط®ظ„ط§ظ‹ للمدرسة الأساسية
        let baseSchools = t.schools?.length ? [...t.schools] : [];
        // طھط£ظƒط¯ ظ…ظ† ظˆط¬ظˆد مدخل للمدرسة الأساسية بالنصاب الصحيح
        if (!baseSchools.some(s => s.schoolId === primaryId)) {
          baseSchools = [
            { schoolId: primaryId, schoolName: primaryName, subjects: [], classes: [], lessons: t.quotaLimit || 0, waiting: t.waitingQuota || 0 },
            ...baseSchools,
          ];
        } else {
          // ط¥ط°ط§ ظƒط§ظ†طھ schools[0].lessons ظ„ط§ طھط¹ظƒس quotaLimit الفعلي للمعلم غير المشترߡ صحّحها
          if (!t.isShared) {
            baseSchools = baseSchools.map(s =>
              s.schoolId === primaryId ? { ...s, lessons: t.quotaLimit || s.lessons, waiting: t.waitingQuota ?? s.waiting } : s
            );
          }
        }
        return {
          ...t, isShared: true,
          schools: [...baseSchools, { schoolId: linkSchoolSelectedId, schoolName, subjects: [], classes: [], lessons: linkSchoolLessons, waiting: linkSchoolWaiting }],
        };
      }));
    }
    setShowLinkSchoolModal(false);
    showToast('تم ربط المعلم بالمدرسة بنجاح', 'success');
  };

  const openUnlinkSchoolModal = (teacherId: string) => {
    setUnlinkSchoolTeacherId(teacherId);
    setUnlinkSchoolSelectedId('');
    setShowUnlinkSchoolModal(true);
  };

  const confirmUnlinkSchool = () => {
    if (!unlinkSchoolTeacherId || !unlinkSchoolSelectedId) return;
    setTeachers(prev => prev.map(t => {
      if (t.id !== unlinkSchoolTeacherId) return t;
      const newSchools = (t.schools || []).filter(s => s.schoolId !== unlinkSchoolSelectedId);
      return { ...t, schools: newSchools, isShared: newSchools.length > 1 };
    }));
    setShowUnlinkSchoolModal(false);
    showToast('تم فك الربط بنجاح', 'success');
  };

  const openActionDropdown = (e: React.MouseEvent, teacherId: string) => {
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const dropdownWidth = 210;
      const estimatedHeight = 240;
      // ظ…ط­ط§ط°ط§ط© ط£ظپظ‚ظٹط© ظ…ظ† ط§ظ„ظٹظ…ظٹظ† ظ…ط¹ ظ…ظ†ط¹ ط§ظ„ط®ط±ظˆج عن الشاشة
      let left = rect.right - dropdownWidth;
      if (left < 8) left = rect.left;
      if (left + dropdownWidth > window.innerWidth - 8) left = window.innerWidth - dropdownWidth - 8;
      // ط§ظ†ط¹ظƒط§ط³ ظ„ظ„ط£ط¹ظ„ظ‰ ط¥ط°ط§ ظ„ظ… طھظƒظ† ظ‡ظ†ط§ظƒ ظ…ط³ط§ط­ط© ظƒافية أسفل الزر
      const showAbove = rect.bottom + estimatedHeight > window.innerHeight - 10;
      const top = showAbove ? rect.top - estimatedHeight - 6 : rect.bottom + 6;
      setActionDropdown({ teacherId, top, left });
  };

  useEffect(() => {
      if (!actionDropdown) return;
      const close = () => setActionDropdown(null);
      document.addEventListener('click', close);
      document.addEventListener('scroll', close, true);
      return () => {
          document.removeEventListener('click', close);
          document.removeEventListener('scroll', close, true);
      };
  }, [actionDropdown]);

  const executeCopyQuota = () => {
      if (!sourceTeacher) return;
      const targetIds = copyTargetMode === 'all'
          ? currentSchoolTeachers.filter(t => t.id !== sourceTeacher.id).map(t => t.id)
          : copyTargetMode === 'specs'
              ? currentSchoolTeachers.filter(t => t.id !== sourceTeacher.id && copyTargetSpecIds.includes(t.specializationId)).map(t => t.id)
              : selectedTargets;
      if (targetIds.length === 0) {
          showToast('اختر هدفاً واحداً على الأقل لنسخ النصاب', 'warning');
          return;
      }
      
      setTeachers(prev => prev.map(t => {
          if (targetIds.includes(t.id)) {
              const sourceQuota = getSchoolQuota(sourceTeacher);
              if ((t.isShared || t.schools?.length) && t.schools?.some(s => s.schoolId === activeSchoolId)) {
                  return {
                      ...t,
                      schools: t.schools.map(s => s.schoolId === activeSchoolId ? {
                          ...s,
                          lessons: copyOptions.basic ? sourceQuota.lessons : s.lessons,
                          waiting: copyOptions.waiting ? sourceQuota.waiting : s.waiting,
                      } : s),
                  };
              }
              return {
                  ...t,
                  quotaLimit: copyOptions.basic ? sourceQuota.lessons : t.quotaLimit,
                  waitingQuota: copyOptions.waiting ? sourceQuota.waiting : t.waitingQuota
              };
          }
          return t;
      }));
      
      showToast(`تم تطبيق النصاب على ${targetIds.length} معلم`, 'success');
      setShowCopyModal(false);
  };

  const handlePrint = () => {
      const style = document.createElement('style');
      style.id = 'print-portrait-override';
      style.innerHTML = `
        @page { size: A4 landscape; margin: 8mm; }
        @media print {
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            font-size: 10px !important;
          }
          th, td {
            border: 0.5px solid #444 !important;
            padding: 3px 5px !important;
            line-height: 1.3 !important;
          }
          tr { page-break-inside: avoid; }
        }
      `;
      document.head.appendChild(style);
      setPrintMenuOpen(false);
      setTimeout(() => {
          window.print();
          const el = document.getElementById('print-portrait-override');
          if (el) el.remove();
      }, 200);
  };

  const printSpecialization = (specId: string) => {
      const style = document.createElement('style');
      style.id = 'print-specialization-override';
      style.innerHTML = `
        @page { size: A4 landscape; margin: 8mm; }
        @media print {
          .teacher-spec-card { display: none !important; }
          .teacher-spec-card[data-spec-id="${specId}"] { display: block !important; }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            font-size: 10px !important;
          }
          th, td {
            border: 0.5px solid #444 !important;
            padding: 3px 5px !important;
            line-height: 1.3 !important;
          }
          tr { page-break-inside: avoid; }
        }
      `;
      document.head.appendChild(style);
      setTimeout(() => {
          window.print();
          const el = document.getElementById('print-specialization-override');
          if (el) el.remove();
      }, 100);
  };

  const openDeleteSpecModal = (specId: string) => {
      const ids = currentSchoolTeachers.filter(t => t.specializationId === specId).map(t => t.id);
      setDeleteSpecModal({ specId, selectedIds: ids });
  };

  const confirmDeleteSpecTeachers = () => {
      if (!deleteSpecModal || deleteSpecModal.selectedIds.length === 0) return;
      const ids = new Set(deleteSpecModal.selectedIds);
      setTeachers(prev => prev.filter(t => !ids.has(t.id)));
      showToast(`تم حذف ${deleteSpecModal.selectedIds.length} معلم من تخصص ${getSpecializationName(deleteSpecModal.specId)}`, 'success');
      setDeleteSpecModal(null);
  };
  
  const openDeleteSelectedModal = () => {
      setDeleteSelectedSpecIds([]);
      setDeleteSelectedTeacherIds([]);
      setShowDeleteSelectedConfirm(false);
      setTeacherDeleteSelectionMode(true);
  };

  const handleInlineDeleteSelected = () => {
      if (!teacherDeleteSelectionMode) {
          openDeleteSelectedModal();
          return;
      }
      if (deleteSelectedSpecIds.length === 0 && deleteSelectedTeacherIds.length === 0) {
          setTeacherDeleteSelectionMode(false);
          setShowDeleteSelectedConfirm(false);
          return;
      }
      if (showDeleteSelectedConfirm) {
          confirmDeleteSelected();
          return;
      }
      setShowDeleteSelectedConfirm(true);
  };

  const confirmDeleteSelected = () => {
      const ids = new Set([
          ...deleteSelectedTeacherIds,
          ...currentSchoolTeachers
              .filter(t => deleteSelectedSpecIds.includes(t.specializationId))
              .map(t => t.id),
      ]);
      if (ids.size === 0) return;
      setTeachers(prev => prev.filter(t => !ids.has(t.id)));
      showToast(`تم حذف ${ids.size} معلم`, 'success');
      setDeleteSelectedModalOpen(false);
      setShowDeleteSelectedConfirm(false);
      setTeacherDeleteSelectionMode(false);
      setDeleteSelectedSpecIds([]);
      setDeleteSelectedTeacherIds([]);
  };

  const executePrint = () => {
      setShowPrintModal(false);
      if (printScope === 'spec' && printSpecId) {
          printSpecialization(printSpecId);
          return;
      }
      handlePrint();
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
      const term = searchTerm.toLowerCase().trim();
      const specName = getSpecializationName(t.specializationId).toLowerCase();
      const matchSearch = !term
        || t.name.toLowerCase().includes(term)
        || getTeacherShortName(t).toLowerCase().includes(term)
        || specName.includes(term);
      // Updated Filter: Multi-select
      const matchSpec = filterSpecializations.length === 0 || filterSpecializations.includes(t.specializationId);
      return matchSearch && matchSpec;
  });

  const uniqueSpecializationCount = getUsedSpecializationIds().length;
  const missingDataCount = currentSchoolTeachers.filter(t => getMissingTeacherFields(t).length > 0).length;
  const specializationOptions = getSpecializationOptions();

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

  const availableTargets = currentSchoolTeachers.filter(t => {
      const term = copySearchTerm.toLowerCase().trim();
      return t.id !== sourceTeacher?.id && (
          !term
          || t.name.toLowerCase().includes(term)
          || getTeacherShortName(t).toLowerCase().includes(term)
          || getSpecializationName(t.specializationId).toLowerCase().includes(term)
      );
  });

  return (
    <>
      {/* â•گâ•گâ•گâ•گâ•گâ•گ Import Loading Overlay â•گâ•گâ•گâ•گâ•گâ•گ */}
      {showImportLoader && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100000] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
          <LoadingLogo size="lg" />
          <p className="text-base font-bold text-[#655ac1]">جاري استيراد المعلمين...</p>
        </div>,
        document.body
      )}
      {/* â•گâ•گâ•گâ•گâ•گâ•گ Toast Notification â•گâ•گâ•گâ•گâ•گâ•گ */}
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
      
      {/* â•گâ•گâ•گâ•گâ•گâ•گ Header (Hidden in Print) â•گâ•گâ•گâ•گâ•گâ•گ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300 mb-6 print:hidden">
          
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <Users size={36} strokeWidth={1.8} className="text-[#655ac1]" />
             إدارة المعلمون
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إضافة وتعديل بيانات المعلمين وتعيين الأنصبة والقيود</p>
      </div>


      <div className="space-y-4 mb-6 print:hidden">
        <input type="file" ref={fileInputRef} hidden accept=".xlsx, .xls" onChange={handleFileUpload} />

        <SchoolTabs
          schoolInfo={schoolInfo}
          activeSchoolId={activeSchoolId}
          onTabChange={(id) => {
            setActiveSchoolId(id);
            setSearchTerm('');
            setFilterSpecializations([]);
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'إجمالي المعلمين', value: currentSchoolTeachers.length, icon: Users, tone: 'text-[#655ac1]' },
            { label: 'عدد التخصصات', value: uniqueSpecializationCount, icon: BookOpen, tone: 'text-[#655ac1]' },
            { label: 'بيانات ناقصة', value: missingDataCount, icon: AlertCircle, tone: 'text-[#655ac1]' },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 flex items-center justify-center ${tone}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400">{label}</p>
                <p className="text-2xl font-black text-slate-800 leading-tight">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div dir="rtl" className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 space-y-2">
          {/* Top row — primary actions, right-aligned */}
          <div className="flex flex-wrap items-center gap-2 justify-start">
            <button
              dir="rtl"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-[#655ac1]/50 font-bold text-sm transition-all"
            >
              <Upload size={16} className="text-slate-400" />
              {loading ? 'جاري الاستيراد...' : 'استيراد من Excel'}
            </button>
            <button
              dir="rtl"
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-[#655ac1]/50 font-bold text-sm transition-all"
            >
              <UserPlus size={17} className="text-slate-400" />
              إضافة معلم
            </button>
          </div>

          {/* Bottom row — secondary actions, left-aligned */}
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              dir="rtl"
              onClick={() => openTeacherConstraints()}
              disabled={currentSchoolTeachers.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-[#655ac1]/50 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sliders size={16} className="text-slate-400" />
              قيود المعلمون
            </button>
            <button
              dir="rtl"
              onClick={() => {
                setSourceTeacher(null);
                setCopyTargetMode('specs');
                setCopyTargetSpecIds([]);
                setSelectedTargets([]);
                setShowCopyModal(true);
              }}
              disabled={currentSchoolTeachers.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-[#655ac1]/50 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Copy size={16} className="text-slate-400" />
              نسخ النصاب
            </button>
            <button
              dir="rtl"
              onClick={handleBulkEditToggle}
              disabled={currentSchoolTeachers.length === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 border disabled:opacity-40 disabled:cursor-not-allowed ${
                isBulkEdit
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-[#655ac1]/50'
              }`}
            >
              {isBulkEdit ? <SaveCheckIcon className="bg-emerald-500" /> : <Edit2 size={15} className="text-slate-400" />}
              {isBulkEdit ? 'حفظ' : 'تعديل الكل'}
            </button>
            {isBulkEdit && (
              <button
                dir="rtl"
                onClick={() => {
                  try { setTeachers(JSON.parse(teachersSnapshot.current)); } catch {}
                  setIsBulkEdit(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-bold text-sm transition-all"
              >
                إلغاء
              </button>
            )}
            <button
              dir="rtl"
              onClick={() => { setPrintScope('all'); setPrintSpecId(getUsedSpecializationIds()[0] || ''); setShowPrintModal(true); }}
              disabled={filteredTeachers.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-[#655ac1]/50 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="طباعة القائمة الحالية"
            >
              <Printer size={16} className="text-slate-400" />
              طباعة
            </button>
            <button
              dir="rtl"
              onClick={handleInlineDeleteSelected}
              disabled={currentSchoolTeachers.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-rose-50 hover:border-rose-300 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckSquare size={16} className="text-rose-500" />
              {teacherDeleteSelectionMode ? (showDeleteSelectedConfirm ? 'نعم، احذف المحدد' : 'تأكيد حذف المحدد') : 'حذف محدد'}
            </button>
            {teacherDeleteSelectionMode && (
              <button
                data-cancel-teacher-delete-selection
                dir="rtl"
                onClick={() => {
                  setTeacherDeleteSelectionMode(false);
                  setShowDeleteSelectedConfirm(false);
                  setDeleteSelectedSpecIds([]);
                  setDeleteSelectedTeacherIds([]);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-bold text-sm transition-all"
              >
                إلغاء
              </button>
            )}
            <button
              dir="rtl"
              onClick={handleDeleteAll}
              disabled={teachers.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-rose-50 hover:border-rose-300 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} className="text-rose-500" />
              حذف الكل
            </button>
          </div>
        </div>

        {showDeleteSelectedConfirm && teacherDeleteSelectionMode && (
          <div data-teacher-delete-inline-confirm className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700 text-center">
            هل أنت متأكد من حذف العناصر المحددة؟ اضغط نعم، احذف المحدد للتأكيد.
          </div>
        )}

        <div dir="rtl" className="relative z-[70] bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-3 justify-between overflow-visible">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث باسم المعلم أو الاختصار أو التخصص..."
              className="w-full pr-12 pl-4 py-3 bg-slate-100 border border-slate-300 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20 transition-all text-slate-600 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="w-full lg:w-64 shrink-0 relative z-[90]" ref={specDropdownRef}>
            <button
              onClick={() => setIsSpecDropdownOpen(!isSpecDropdownOpen)}
              className={`w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 ${isSpecDropdownOpen ? 'ring-2 ring-[#8779fb]/20 border-[#655ac1]/40' : ''}`}
            >
              <span className="truncate">
                {filterSpecializations.length === 0
                  ? 'كل التخصصات'
                  : filterSpecializations.length === 1
                    ? getSpecializationName(filterSpecializations[0])
                    : `تم تحديد (${filterSpecializations.length})`}
              </span>
              <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${isSpecDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSpecDropdownOpen && (
              <div className="absolute z-[9999] top-full mt-2 right-0 left-0 min-w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5">
                <div className="overflow-y-auto custom-scrollbar space-y-1 max-h-72 pr-1">
                  {getUsedSpecializationIds().map(id => {
                    const selected = filterSpecializations.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggleSpecializationFilter(id)}
                        className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                          selected
                            ? 'bg-white text-[#655ac1]'
                            : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                        }`}
                      >
                        <span>{getSpecializationName(id)}</span>
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                          selected ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'
                        }`}>
                          <Check size={12} strokeWidth={3} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* â•گâ•گâ•گâ•گâ•گâ•گ Teachers List (print:table wrapper makes header repeat on every page) â•گâ•گâ•گâ•گâ•گâ•گ */}
      <div className="print:table print:w-full">

        {/* Repeating print header â€” hidden on screen */}
        <div className="hidden print:table-header-group">
          <div className="print:table-row">
            <div className="print:table-cell" style={{ padding: 0 }}>
              <PrintHeader schoolInfo={schoolInfo} title="بيان بأسماء المعلمين" />
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="print:table-row-group">
          <div className="print:table-row">
            <div className="print:table-cell" style={{ padding: 0, verticalAlign: 'top' }}>
      <div className="space-y-6 print:space-y-4">
        {specsToRender.map(specId => {
            const group = groupedTeachers[specId];
            const isGroupEdit = editingSpecId === specId;
            return (
                <div key={specId} data-spec-id={specId} className="teacher-spec-card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-2 print:border-slate-800 print:rounded-none print:break-inside-avoid">
                     {/* Section Header */}
                     <div className="bg-white px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-50/50 to-white print:bg-slate-100 print:from-slate-100 print:to-slate-100 print:border-slate-800 print:py-2">
                        <div className="flex items-center gap-3">
                            {teacherDeleteSelectionMode && (
                              <button
                                type="button"
                                onClick={() => setDeleteSelectedSpecIds(prev => prev.includes(specId) ? prev.filter(id => id !== specId) : [...prev, specId])}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${deleteSelectedSpecIds.includes(specId) ? 'border-rose-500 text-rose-500 bg-white' : 'border-slate-300 text-transparent hover:border-rose-300'}`}
                              >
                                <Check size={12} strokeWidth={3} />
                              </button>
                            )}
                            <div className="w-1.5 h-6 bg-[#655ac1] rounded-full print:bg-slate-900" />
                            <h4 className="font-black text-slate-800 text-lg print:text-base">
                                {getSpecializationName(specId)} 
                                <span className="mr-2 px-2.5 py-0.5 bg-slate-100 text-[#655ac1] rounded-full text-sm font-black print:border print:border-slate-400 print:text-slate-900">{group.length}</span>
                            </h4>
                        </div>
                        <div className="flex items-center gap-1 print:hidden">
                            <button onClick={() => setEditingSpecId(prev => prev === specId ? null : specId)} className={`px-3 py-2 rounded-xl text-xs font-black border transition-all inline-flex items-center gap-2 ${isGroupEdit ? 'border-emerald-500 text-white bg-emerald-500 shadow-sm shadow-emerald-500/20' : 'border-slate-200 text-slate-600 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-white'}`}>
                              {isGroupEdit && <SaveCheckIcon className="bg-emerald-500" />}
                              {isGroupEdit ? 'حفظ' : 'تعديل معلمي التخصص'}
                            </button>
                            <div className="relative group/up">
                                <button onClick={() => moveSection(specId, 'up')} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-[#655ac1] transition-all"><ArrowUp size={16}/></button>
                                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1 bg-white border border-slate-300 text-[#655ac1] text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/up:opacity-100 transition-opacity pointer-events-none z-[100]">للأعلى</span>
                            </div>
                            <div className="relative group/down">
                                <button onClick={() => moveSection(specId, 'down')} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-[#655ac1] transition-all"><ArrowDown size={16}/></button>
                                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1 bg-white border border-slate-300 text-[#655ac1] text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/down:opacity-100 transition-opacity pointer-events-none z-[100]">للأسفل</span>
                            </div>
                        </div>
                     </div>
                     
                     <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] table-fixed text-right border-separate border-spacing-0 rounded-2xl overflow-hidden border border-slate-100">
                             <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100 print:bg-white print:border-slate-800">
                                   <th className="px-3 py-4 w-14 text-center text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:w-8 print:text-xs">م</th>
                                   <th className="px-3 py-4 w-[22%] text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:text-xs">اسم المعلم</th>
                                   <th className="px-3 py-4 w-[15%] text-center text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:text-xs">اختصار الاسم</th>
                                   <th className="px-3 py-4 w-[14%] text-center text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:text-xs">التخصص</th>
                                   <th className="px-3 py-4 w-[14%] text-center text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:text-xs">رقم الجوال</th>
                                   <th className="px-3 py-4 w-28 text-center text-xs font-black text-[#655ac1] whitespace-nowrap print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:text-xs">نصاب الحصص</th>
                                   <th className="px-3 py-4 w-28 text-center text-xs font-black text-[#655ac1] whitespace-nowrap print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:text-xs">نصاب الانتظار</th>
                                   <th className="px-3 py-4 w-24 text-center text-xs font-black text-[#655ac1] print:text-slate-900 print:p-1 print:text-xs">المجموع</th>
                                   <th className="px-3 py-4 w-28 text-center text-xs font-black text-[#655ac1] print:hidden">إجراءات</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50 print:divide-slate-300">
                                {group.map((t, idx) => {
                                    const quota = getSchoolQuota(t);
                                    const missingFields = getMissingTeacherFields(t);
                                    const totalQuota = quota.total;
                                    const overallTotal = getTeacherOverallQuotaTotal(t);
                                    const hasQuotaWarning = totalQuota > 24 || overallTotal > 24;
                                    const editRows = isBulkEdit || isGroupEdit || editingTeacherId === t.id;
                                    return (
                                    <tr 
                                        key={t.id} 
                                         draggable={!editRows}
                                        onDragStart={(e) => handleDragStart(e, t.id)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, t.id, specId)}
                                        className={`
                                            transition-colors group print:break-inside-avoid
                                            ${draggedTeacherId === t.id ? 'bg-[#e5e1fe]/30 opacity-50' : 'hover:bg-[#e5e1fe]/10 print:hover:bg-transparent'}
                                        `}
                                    >
                                        <td className="px-3 py-3 text-center relative print:border-l print:border-slate-300 print:p-2">
                                            <div className="flex items-center justify-center gap-1">
                                                {!editRows && (
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
                                        <td className="px-3 py-3 font-bold text-slate-700 align-middle print:border-l print:border-slate-300 print:p-1 print:text-black print:text-xs print:whitespace-nowrap">
                                            {editRows ? (
                                                <input 
                                                    value={t.name} 
                                                    onChange={e => setTeachers(prev => prev.map(pt => pt.id === t.id ? {...pt, name: e.target.value} : pt))} 
                                                    className="w-full bg-transparent border-0 focus:ring-0 outline-none font-bold text-sm text-slate-800 py-1"
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {teacherDeleteSelectionMode && (
                                                      <button
                                                        type="button"
                                                        onClick={() => setDeleteSelectedTeacherIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${deleteSelectedTeacherIds.includes(t.id) ? 'border-rose-500 text-rose-500 bg-white' : 'border-slate-300 text-transparent hover:border-rose-300'}`}
                                                      >
                                                        <Check size={12} strokeWidth={3} />
                                                      </button>
                                                    )}
                                                    <span className="text-sm group-hover:text-[#655ac1] transition-colors print:text-black">{t.name}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 align-middle text-center print:border-l print:border-slate-300 print:p-1 print:text-xs print:whitespace-nowrap">
                                            {editRows ? (
                                                <input
                                                    value={t.shortName ?? buildTeacherShortName(t.name)}
                                                    onChange={e => setTeachers(prev => prev.map(pt => pt.id === t.id ? { ...pt, shortName: e.target.value } : pt))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-[#655ac1] focus:outline-none focus:border-[#655ac1]"
                                                    maxLength={15}
                                                />
                                            ) : (
                                                <span className="inline-flex min-h-8 items-center justify-center text-xs font-black text-[#655ac1] print:text-black">{getTeacherShortName(t) || '-'}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 align-middle text-center print:border-l print:border-slate-300 print:p-1 print:text-xs print:whitespace-nowrap">
                                            {editRows ? (
                                                <select
                                                    value={t.specializationId}
                                                    onChange={e => setTeachers(prev => prev.map(pt => pt.id === t.id ? { ...pt, specializationId: e.target.value } : pt))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-700 focus:outline-none focus:border-[#655ac1]"
                                                >
                                                    {specializationOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            ) : (
                                                <span className="inline-flex min-h-8 items-center justify-center text-xs font-black text-slate-600 print:text-black">{getSpecializationName(t.specializationId)}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 align-middle text-center print:border-l print:border-slate-300 print:p-1 print:text-xs print:whitespace-nowrap">
                                             {editRows ? (
                                                <input 
                                                    value={t.phone} 
                                                    onChange={e => setTeachers(prev => prev.map(pt => pt.id === t.id ? {...pt, phone: e.target.value} : pt))} 
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-700 focus:outline-none focus:border-[#655ac1] text-center dir-ltr"
                                                />
                                            ) : (
                                                <span className="inline-flex min-h-8 items-center justify-center px-2 text-xs font-bold text-slate-500 font-mono print:text-black" dir="ltr">{t.phone || (missingFields.includes('الجوال') ? <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black">الجوال</span> : '-')}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center print:border-l print:border-slate-300 print:p-2">
                                             {editRows ? (
                                                <input
                                                    type="number"
                                                    value={quota.lessons}
                                                    onChange={e => {
                                                        const val = Number(e.target.value);
                                                        setTeachers(prev => prev.map(pt => {
                                                            if (pt.id !== t.id) return pt;
                                                            if (pt.isShared && pt.schools) {
                                                                return {
                                                                    ...pt,
                                                                    schools: pt.schools.map(s =>
                                                                        s.schoolId === activeSchoolId ? { ...s, lessons: val } : s
                                                                    ),
                                                                };
                                                            }
                                                            return { ...pt, quotaLimit: val };
                                                        }));
                                                    }}
                                                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm font-black text-slate-800 focus:outline-none focus:border-[#655ac1] text-center mx-auto"
                                                />
                                            ) : (
                                                <span className="inline-flex w-8 h-8 items-center justify-center rounded-full border border-slate-200 text-sm font-black text-[#655ac1] print:text-black">
                                                    {quota.lessons}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center print:border-l print:border-slate-300 print:p-2">
                                             {editRows ? (
                                                <input
                                                    type="number"
                                                    value={quota.waiting}
                                                    onChange={e => {
                                                        const val = Number(e.target.value);
                                                        setTeachers(prev => prev.map(pt => {
                                                            if (pt.id !== t.id) return pt;
                                                            if (pt.isShared && pt.schools) {
                                                                return {
                                                                    ...pt,
                                                                    schools: pt.schools.map(s =>
                                                                        s.schoolId === activeSchoolId ? { ...s, waiting: val } : s
                                                                    ),
                                                                };
                                                            }
                                                            return { ...pt, waitingQuota: val };
                                                        }));
                                                    }}
                                                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm font-black text-slate-800 focus:outline-none focus:border-[#655ac1] text-center mx-auto"
                                                />
                                            ) : (
                                                <span className="inline-flex w-8 h-8 items-center justify-center rounded-full border border-slate-200 text-sm font-black text-[#655ac1] print:text-black">
                                                    {quota.waiting}
                                                </span>
                                            )}
                                        </td>
                                         <td className="px-3 py-3 text-center print:p-2">
                                            <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full border text-sm font-black print:bg-transparent print:text-black print:p-0 ${hasQuotaWarning ? 'border-rose-300 text-rose-600' : 'border-slate-200 text-slate-800'}`}>
                                                {totalQuota}
                                            </span>
                                            {overallTotal > 24 && overallTotal !== totalQuota && (
                                                <div className="mt-1 text-[10px] font-black text-rose-500 print:hidden">إجمالي المدارس {overallTotal}</div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center print:hidden">
                                            {editRows && editingTeacherId === t.id ? (
                                                <div className="flex items-center justify-center gap-1.5">
                                                  <button onClick={() => setEditingTeacherId(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500 text-white transition-all" title="حفظ"><SaveCheckIcon className="bg-emerald-500 h-4 w-4" /></button>
                                                  <button onClick={() => setEditingTeacherId(null)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 transition-all" title="إلغاء"><X size={14} /></button>
                                                </div>
                                            ) : !editRows && (
                                                <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={e => openActionDropdown(e, t.id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-slate-400 hover:text-[#655ac1] transition-all border border-slate-200 hover:border-[#655ac1]"
                                                    title="إجراءات"
                                                >
                                                    <Settings2 size={14} />
                                                </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    );
                                })}
                             </tbody>
                        </table>
                     </div>
                </div>
            );
        })}
         
         {filteredTeachers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center print:hidden">
                {currentSchoolTeachers.length === 0
                    ? <Users size={48} className="mx-auto mb-5" style={{ color: '#8779fb' }} strokeWidth={1.6} />
                    : <Search size={48} className="mx-auto mb-5" style={{ color: '#8779fb' }} strokeWidth={1.6} />
                }
                <p className="text-slate-600 font-black text-lg mb-1">
                    {currentSchoolTeachers.length === 0 ? 'لا يوجد معلمون بعد' : 'لا يوجد معلمون يطابقون البحث'}
                </p>
                <p className="text-slate-400 text-sm">
                    {currentSchoolTeachers.length === 0
                        ? <>استخدم زر <span className="font-bold" style={{ color: '#655ac1' }}>إضافة معلم</span> أو <span className="font-bold" style={{ color: '#655ac1' }}>استيراد من Excel</span> للبدء</>
                        : 'جرب البحث باسم آخر أو تغيير التخصص'}
                </p>
            </div>
        )}
      </div>
            </div>
          </div>
        </div>
      </div>

      {/* â•گâ•گâ•گâ•گâ•گâ•گ Modals (Hidden in Print) â•گâ•گâ•گâ•گâ•گâ•گ */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
             <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                        {modalMode === 'add' ? <UserPlus size={26} className="text-[#655ac1]" /> : <Edit size={24} className="text-[#655ac1]" />}
                        {modalMode === 'add' ? 'إضافة معلم جديد' : 'تعديل بيانات معلم'}
                    </h3>
                    <button onClick={() => setShowModal(false)} className="p-2 border border-slate-200 bg-white hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-8 space-y-6 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">اسم المعلم <span className="text-rose-500">*</span></label>
                        <input 
                            value={currentTeacher.name} 
                            onChange={e => {
                              const name = e.target.value;
                              setCurrentTeacher(prev => ({...prev, name, shortName: buildTeacherShortName(name)}));
                            }} 
                            placeholder="مثال محمد عبدالله أحمد"
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] focus:ring-4 focus:ring-[#e5e1fe] transition-all" 
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">اختصار الاسم</label>
                        <input
                            value={currentTeacher.shortName ?? buildTeacherShortName(currentTeacher.name)}
                            onChange={e => setCurrentTeacher({...currentTeacher, shortName: e.target.value})}
                            placeholder="مثال: محمد أحمد"
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] focus:ring-4 focus:ring-[#e5e1fe] transition-all"
                        />
                        <p className="mt-2 text-[11px] font-bold text-slate-400">ينشأ تلقائياً من الاسم الأول والأخير ويمكن تعديله لاستخدامه لاحقاً في الجداول.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-2">التخصص</label>
                            <TeacherSelectDropdown
                                value={currentTeacher.specializationId}
                                options={MODAL_SPECS}
                                onChange={(value) => { setCurrentTeacher({...currentTeacher, specializationId: value}); setCustomSpecName(''); }}
                            />
                            {currentTeacher.specializationId === '99' && (
                                <input
                                    placeholder="اكتب اسم التخصص..."
                                    value={customSpecName}
                                    onChange={e => setCustomSpecName(e.target.value)}
                                    className="w-full mt-2 p-3 bg-slate-50 border border-[#655ac1] rounded-xl outline-none text-sm font-bold focus:ring-4 focus:ring-[#e5e1fe] transition-all"
                                    autoFocus
                                />
                            )}
                        </div>
                        
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-2">رقم الجوال</label>
                            <input 
                                value={currentTeacher.phone} 
                                onChange={e => setCurrentTeacher({...currentTeacher, phone: e.target.value})} 
                                placeholder="05xxxxxxxx"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] transition-all text-left" 
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0 && !schoolInfo.mergeTeachersView && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">المدرسة التابع لها</label>
                            <TeacherSelectDropdown
                                value={currentTeacher.schoolId || 'main'}
                                options={[{ id: 'main', name: schoolInfo.schoolName }, ...schoolInfo.sharedSchools.map(s => ({ id: s.id, name: s.name }))]}
                                onChange={(value) => setCurrentTeacher({...currentTeacher, schoolId: value})}
                            />
                        </div>
                    )}

                     <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <div>
                            <label className="block text-xs font-bold text-[#655ac1] mb-2 text-center">نصاب الحصص <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={currentTeacher.quotaLimit} 
                                    onChange={e => setCurrentTeacher({...currentTeacher, quotaLimit: Number(e.target.value)})} 
                                    required
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xl font-black text-center text-[#655ac1] focus:border-[#655ac1] transition-all" 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#655ac1] mb-2 text-center">نصاب الانتظار <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={currentTeacher.waitingQuota || 0} 
                                    onChange={e => setCurrentTeacher({...currentTeacher, waitingQuota: Number(e.target.value)})} 
                                    required
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xl font-black text-center focus:border-[#655ac1] transition-all text-[#655ac1]" 
                                />
                            </div>
                        </div>
                     </div>

                     {(() => {
                       const quotaTotal = Number(currentTeacher.quotaLimit ?? 0) + Number(currentTeacher.waitingQuota ?? 0);
                       return quotaTotal > 24 ? (
                         <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                           <p className="text-xs font-bold text-amber-700 leading-relaxed">
                              إجمالي النصاب الحالي <span className="text-amber-900">{quotaTotal}</span> حصة، وهو يتجاوز النصاب الرسمي (24). يمكنك المتابعة لكن يُنصح بمراجعة النصاب.
                           </p>
                         </div>
                       ) : null;
                     })()}
                </div>

                <div className="p-6 bg-slate-50 flex gap-3">
                    <button 
                        onClick={() => setShowModal(false)}
                        className="flex-1 py-4 bg-white text-slate-600 border border-slate-300 font-bold text-sm rounded-xl hover:bg-slate-100 transition-all"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={saveTeacher}
                        className="flex-1 py-4 bg-[#655ac1] text-white font-black text-sm rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 transition-all flex items-center justify-center gap-2"
                    >
                        <SaveCheckIcon /> حفظ
                    </button>
                </div>
             </div>
        </div>
      )}

      {showPrintModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-[2rem] w-full max-w-md max-h-[92vh] shadow-2xl overflow-visible animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                  <Printer size={22} className="text-[#655ac1]" />
                  طباعة المعلمين
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">اختر نطاق الطباعة المطلوب.</p>
              </div>
              <button onClick={() => setShowPrintModal(false)} className="p-2 border border-slate-200 rounded-full text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-visible flex-1">
              <button
                onClick={() => setPrintScope('all')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-black transition-all ${printScope === 'all' ? 'border-[#655ac1] text-[#655ac1]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span>طباعة الكل</span>
                <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${printScope === 'all' ? 'border-[#655ac1] text-[#655ac1]' : 'border-slate-300 text-transparent'}`}>
                  <Check size={12} strokeWidth={3} />
                </span>
              </button>
              <button
                onClick={() => setPrintScope('spec')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-black transition-all ${printScope === 'spec' ? 'border-[#655ac1] text-[#655ac1]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span>طباعة تخصص محدد</span>
                <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${printScope === 'spec' ? 'border-[#655ac1] text-[#655ac1]' : 'border-slate-300 text-transparent'}`}>
                  <Check size={12} strokeWidth={3} />
                </span>
              </button>
              {printScope === 'spec' && (
                <TeacherSelectDropdown
                  value={printSpecId}
                  options={getUsedSpecializationIds().map(id => ({ id, name: getSpecializationName(id) }))}
                  onChange={setPrintSpecId}
                  placeholder="اختر التخصص"
                />
              )}
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setShowPrintModal(false)} className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50">
                إلغاء
              </button>
              <button
                onClick={executePrint}
                disabled={printScope === 'spec' && !printSpecId}
                className="flex-1 px-4 py-3 bg-[#655ac1] text-white text-sm font-bold rounded-xl hover:bg-[#5448a8] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSelectedModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-800">حذف محدد</h2>
                <p className="text-sm font-bold text-slate-400 mt-1">حدد تخصصاً كاملاً أو معلماً واحداً أو أكثر.</p>
              </div>
              <button onClick={() => setDeleteSelectedModalOpen(false)} className="p-2 rounded-full border border-slate-200 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-black text-slate-700">التخصصات</h3>
                <div className="max-h-72 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl p-2 space-y-1">
                  {getUsedSpecializationIds().map(id => {
                    const selected = deleteSelectedSpecIds.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => setDeleteSelectedSpecIds(prev => selected ? prev.filter(x => x !== id) : [...prev, id])}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${selected ? 'bg-rose-50 text-rose-600' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span>{getSpecializationName(id)}</span>
                        <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${selected ? 'border-rose-500 text-rose-500' : 'border-slate-300 text-transparent'}`}>
                          <Check size={12} strokeWidth={3} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-black text-slate-700">المعلمون</h3>
                <div className="max-h-72 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl p-2 space-y-1">
                  {currentSchoolTeachers.map(t => {
                    const selected = deleteSelectedTeacherIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => setDeleteSelectedTeacherIds(prev => selected ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${selected ? 'bg-rose-50 text-rose-600' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span>{t.name}</span>
                        <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${selected ? 'border-rose-500 text-rose-500' : 'border-slate-300 text-transparent'}`}>
                          <Check size={12} strokeWidth={3} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {showDeleteSelectedConfirm && (
              <div className="mx-6 mb-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700 text-center">
                هل أنت متأكد من حذف العناصر المحددة؟ لا يمكن التراجع عن هذا الإجراء.
              </div>
            )}
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setDeleteSelectedModalOpen(false)} className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50">
                تراجع
              </button>
              <button
                onClick={() => showDeleteSelectedConfirm ? confirmDeleteSelected() : setShowDeleteSelectedConfirm(true)}
                disabled={deleteSelectedSpecIds.length === 0 && deleteSelectedTeacherIds.length === 0}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {showDeleteSelectedConfirm ? 'نعم، احذف المحدد' : `حذف المحدد (${new Set([...deleteSelectedTeacherIds, ...currentSchoolTeachers.filter(t => deleteSelectedSpecIds.includes(t.specializationId)).map(t => t.id)]).size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â•گâ•گâ•گâ•گâ•گâ•گ Copy Quota Modal (Hidden in Print) â•گâ•گâ•گâ•گâ•گâ•گ */}
      {showCopyModal && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
                <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                     {/* Header */}
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                             <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                                <Copy size={24} className="text-[#655ac1]" />
                                نسخ النصاب
                             </h3>
                              <p className="text-xs text-slate-500 mt-1">اختر المصدر، ثم نوع النصاب، ثم الهدف</p>
                        </div>
                        <button onClick={() => setShowCopyModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                            <X size={20} />
                        </button>
                     </div>

                     {/* Content */}
                     <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-5">
                          <div>
                            <label className="block text-xs font-black text-slate-600 mb-2">المعلم المصدر</label>
                            <select
                              value={sourceTeacher?.id || ''}
                              onChange={e => setSourceTeacher(currentSchoolTeachers.find(t => t.id === e.target.value) || null)}
                              className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1]"
                            >
                              <option value="">اختر المعلم المصدر...</option>
                              {currentSchoolTeachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name} - {getSpecializationName(t.specializationId)}</option>
                              ))}
                            </select>
                          </div>

                          {sourceTeacher && (
                          <div className="bg-[#f8f7ff] p-4 rounded-xl border border-[#e5e1fe]">
                            <label className="block text-xs font-black text-slate-600 mb-3">ماذا تريد أن تنسخ؟</label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { key: 'basic', label: `نصاب الحصص (${getSchoolQuota(sourceTeacher).lessons})` },
                                { key: 'waiting', label: `نصاب الانتظار (${getSchoolQuota(sourceTeacher).waiting})` },
                              ].map(item => {
                                const active = copyOptions[item.key as 'basic' | 'waiting'];
                                return (
                                  <button
                                    key={item.key}
                                    onClick={() => setCopyOptions(prev => ({ ...prev, [item.key]: !active }))}
                                    className={`px-4 py-2.5 rounded-xl border text-sm font-black transition-all flex items-center gap-2 ${active ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-200 text-slate-500'}`}
                                  >
                                    <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${active ? 'border-[#655ac1]' : 'border-slate-300'}`}>
                                      {active && <Check size={12} strokeWidth={3} />}
                                    </span>
                                    {item.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          )}

                          {sourceTeacher && (
                          <div className="flex flex-col gap-3 overflow-hidden">
                               <label className="text-xs font-black text-slate-600">اختر الهدف</label>
                               <div className="grid grid-cols-3 gap-2">
                                 {[
                                   { id: 'teachers', label: 'معلمون' },
                                   { id: 'specs', label: 'تخصصات' },
                                   { id: 'all', label: 'الكل' },
                                 ].map(item => (
                                   <button
                                     key={item.id}
                                     onClick={() => setCopyTargetMode(item.id as 'teachers' | 'specs' | 'all')}
                                     className={`py-2.5 rounded-xl border text-sm font-black transition-all ${copyTargetMode === item.id ? 'border-[#655ac1] text-[#655ac1] bg-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                   >
                                     {item.label}
                                   </button>
                                 ))}
                               </div>
                               
                               {copyTargetMode === 'teachers' && (
                               <>
                                 <div className="flex justify-end gap-3">
                                   <button onClick={() => setSelectedTargets(availableTargets.map(t => t.id))} className="text-[10px] font-bold text-[#655ac1] hover:underline">تحديد الكل</button>
                                   <button onClick={() => setSelectedTargets([])} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 hover:underline">إلغاء التحديد</button>
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

                                 <div className="max-h-56 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl p-2 space-y-1">
                                    {availableTargets.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 text-sm">لا يوجد معلمون آخرون</div>
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
                                                     <span title="النصاب الحالي">{getSchoolQuota(t).lessons}</span>
                                                     <span className="text-slate-300">|</span>
                                                     <span title="نصاب الانتظار الحالي" className="text-orange-400">{getSchoolQuota(t).waiting}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                 </div>
                               </>
                               )}

                               {copyTargetMode === 'specs' && (
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl p-2">
                                   {getUsedSpecializationIds().map(id => {
                                     const selected = copyTargetSpecIds.includes(id);
                                     return (
                                       <button
                                         key={id}
                                         onClick={() => setCopyTargetSpecIds(prev => selected ? prev.filter(x => x !== id) : [...prev, id])}
                                         className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-bold transition-all ${selected ? 'border-[#655ac1] text-[#655ac1] bg-white' : 'border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                                       >
                                         <span>{getSpecializationName(id)}</span>
                                         <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${selected ? 'border-[#655ac1]' : 'border-slate-300 text-transparent'}`}>
                                           <Check size={12} strokeWidth={3} />
                                         </span>
                                       </button>
                                     );
                                   })}
                                 </div>
                               )}

                               {copyTargetMode === 'all' && (
                                 <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                                    سيتم تطبيق النصاب على جميع المعلمين عدا المعلم المصدر.
                                 </div>
                               )}
                          </div>
                          )}
                     </div>

                     {/* Footer */}
                     <div className="p-6 bg-slate-50 flex gap-3 border-t border-slate-100">
                         <div className="flex-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                             <span>تم تحديد:</span>
                             <span className="bg-[#655ac1] text-white px-2 py-0.5 rounded-md">
                               {sourceTeacher ? (
                                 copyTargetMode === 'all'
                                   ? currentSchoolTeachers.filter(t => t.id !== sourceTeacher.id).length
                                   : copyTargetMode === 'specs'
                                     ? currentSchoolTeachers.filter(t => t.id !== sourceTeacher.id && copyTargetSpecIds.includes(t.specializationId)).length
                                     : selectedTargets.length
                               ) : 0}
                             </span>
                             <span>معلم</span>
                         </div>
                         <button 
                             onClick={executeCopyQuota}
                             disabled={!sourceTeacher || (!copyOptions.basic && !copyOptions.waiting) || (copyTargetMode === 'teachers' && selectedTargets.length === 0) || (copyTargetMode === 'specs' && copyTargetSpecIds.length === 0)}
                             className="px-6 py-3 bg-[#655ac1] text-white font-bold rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                         >
                             تطبيق النسخ
                         </button>
                     </div>
                </div>
           </div>
       )}
     {/* â•گâ•گâ•گâ•گâ•گâ•گ Teacher Constraints Modal â•گâ•گâ•گâ•گâ•گâ•گ */}
     {deleteSpecModal && (() => {
       const specTeachers = currentSchoolTeachers.filter(t => t.specializationId === deleteSpecModal.specId);
       const allSelected = specTeachers.length > 0 && specTeachers.every(t => deleteSpecModal.selectedIds.includes(t.id));
       return (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-slate-100 flex items-start justify-between">
               <div>
                 <h2 className="text-xl font-black text-slate-800">حذف معلمي التخصص</h2>
                 <p className="text-sm font-bold text-slate-400 mt-1">{getSpecializationName(deleteSpecModal.specId)}</p>
               </div>
               <button onClick={() => setDeleteSpecModal(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                 <X size={18} />
               </button>
             </div>
             <div className="p-6 space-y-3">
               <button
                 onClick={() => setDeleteSpecModal(prev => prev ? { ...prev, selectedIds: allSelected ? [] : specTeachers.map(t => t.id) } : prev)}
                 className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-black text-slate-700"
               >
                  <span>اختيار كل معلمي التخصص</span>
                 <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${allSelected ? 'border-[#655ac1] text-[#655ac1]' : 'border-slate-300 text-transparent'}`}>
                   <Check size={12} strokeWidth={3} />
                 </span>
               </button>
               <div className="max-h-72 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl p-2 space-y-1">
                 {specTeachers.map(t => {
                   const selected = deleteSpecModal.selectedIds.includes(t.id);
                   return (
                     <button
                       key={t.id}
                       onClick={() => setDeleteSpecModal(prev => prev ? {
                         ...prev,
                         selectedIds: selected ? prev.selectedIds.filter(id => id !== t.id) : [...prev.selectedIds, t.id],
                       } : prev)}
                       className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${selected ? 'bg-rose-50 text-rose-600' : 'text-slate-700 hover:bg-slate-50'}`}
                     >
                       <span>{t.name}</span>
                       <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${selected ? 'border-rose-500 text-rose-500' : 'border-slate-300 text-transparent'}`}>
                         <Check size={12} strokeWidth={3} />
                       </span>
                     </button>
                   );
                 })}
               </div>
             </div>
             <div className="p-6 pt-0 flex gap-3">
               <button onClick={() => setDeleteSpecModal(null)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors">
                 تراجع
               </button>
               <button
                 onClick={confirmDeleteSpecTeachers}
                 disabled={deleteSpecModal.selectedIds.length === 0}
                 className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
               >
                 حذف المحدد ({deleteSpecModal.selectedIds.length})
               </button>
             </div>
           </div>
         </div>
       );
     })()}

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
         <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
           <div className="p-6 flex items-start gap-3">
             <Trash2 size={28} className="text-rose-500 mt-0.5" />
             <div>
               <h2 className="text-xl font-black text-slate-800 mb-2">حذف الكل</h2>
               <p className="text-sm font-medium text-slate-500 leading-relaxed">
                 سيتم حذف جميع المعلمين في هذه المدرسة. هل تريد المتابعة؟
               </p>
             </div>
           </div>
           <div className="p-6 pt-0 flex gap-3">
             <button
               onClick={() => setShowDeleteAllConfirm(false)}
               className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors"
             >
               إلغاء
             </button>
             <button
               onClick={confirmDeleteAll}
               className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
             >
               حذف
             </button>
           </div>
         </div>
       </div>
     )}
      {/* Import Review Modal */}
      {showImportReviewModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

      {/* Header */}
           <div className="p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
             <div className="flex justify-between items-start">
               <div>
                 <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                   <AlertCircle size={22} className="text-amber-500" />
                    وجدنا معلمين مشابهين - راجع قبل الإضافة
                 </h3>
                 <p className="text-xs text-slate-400 font-bold mt-0.5">
                    وجدنا {importReviewItems.length} معلماً في الملف يشبه معلماً موجوداً - ماذا تريد أن تفعل بكل واحد؟
                 </p>
               </div>
               <button onClick={() => { setShowImportReviewModal(false); setShowSelectAllConfirm(false); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all shrink-0">
                 <X size={20} />
               </button>
             </div>
             {!showSelectAllConfirm ? (
               <button
                 onClick={() => setShowSelectAllConfirm(true)}
                 className="mt-3 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-black text-slate-600 hover:text-slate-800 transition-all flex items-center justify-center gap-2"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  اعتبرهم جميعاً أشخاصاً مختلفين
               </button>
             ) : (
               <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-black text-amber-800 text-center">سيتم اعتبار الجميع أشخاصاً مختلفين وإضافتهم كمعلمين جدد - هل أنت متأكد؟</p>
                 <div className="flex gap-2">
                   <button
                     onClick={() => { setImportReviewItems(prev => prev.map(i => ({ ...i, choice: i.matchType === 'id' ? 'skip' : 'add_new' }))); setShowSelectAllConfirm(false); }}
                     className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black transition-all"
                   >
                      نعم، تابع
                   </button>
                   <button
                     onClick={() => setShowSelectAllConfirm(false)}
                     className="flex-1 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-black transition-all"
                   >
                     إلغاء
                   </button>
                 </div>
               </div>
             )}
           </div>

           {/* List */}
           <div className="overflow-y-auto flex-1 p-4 space-y-3">
             {importReviewItems.map((item, idx) => {
               const isId      = item.matchType === 'id';
               const isPartial = item.matchType === 'partial_name';
               return (
                 <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3">
                   {/* Badge + names */}
                   <div className="flex items-start gap-3">
                     <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-full ${
                       isId      ? 'bg-emerald-100 text-emerald-700' :
                       isPartial ? 'bg-amber-100 text-amber-700' :
                                   'bg-blue-100 text-blue-700'
                     }`}>
                       {isId ? 'نفس رقم الهوية' : isPartial ? 'الاسم مشابه - تحقق' : 'نفس الاسم تماماً'}
                     </span>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-black text-slate-800 truncate">{item.row.name}</p>
                       <p className="text-xs text-slate-400 font-bold mt-0.5">
                         المعلم في الملف يشبه: <span className="text-slate-600">{item.existing.name}</span> في {item.existingSchoolName}
                       </p>
                        {isPartial && <p className="text-[11px] text-amber-600 font-bold mt-1">تشابه في الاسم الأول والأخير فقط - تحقق بعناية</p>}
                     </div>
                   </div>
                   {/* Choice buttons */}
                   <div className="flex gap-2">
                     <button
                       onClick={() => setImportReviewItems(prev => prev.map((it, i) => i === idx ? { ...it, choice: 'link' } : it))}
                       className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                         item.choice === 'link'
                           ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-md shadow-[#655ac1]/20'
                           : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1]/40'
                       }`}
                     >
                       نعم، نفس المعلم
                     </button>
                     {isId ? (
                       <button
                         onClick={() => setImportReviewItems(prev => prev.map((it, i) => i === idx ? { ...it, choice: 'skip' } : it))}
                         className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                           item.choice === 'skip'
                             ? 'bg-slate-700 text-white border-slate-700'
                             : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                         }`}
                       >
                         تخطي
                       </button>
                     ) : (
                       <button
                         onClick={() => setImportReviewItems(prev => prev.map((it, i) => i === idx ? { ...it, choice: 'add_new' } : it))}
                         className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                           item.choice === 'add_new'
                             ? 'bg-slate-700 text-white border-slate-700'
                             : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                         }`}
                       >
                          لا، شخص مختلف
                       </button>
                     )}
                   </div>
                 </div>
               );
             })}
           </div>

           {/* Footer */}
           <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3 shrink-0">
             <div className="flex-1" />
             <button onClick={() => { setShowImportReviewModal(false); setShowSelectAllConfirm(false); }} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">
               إلغاء
             </button>
             <button onClick={confirmImportReview} className="px-6 py-2.5 bg-[#655ac1] text-white rounded-xl text-sm font-bold hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 transition-all">
                تأكيد وإضافة
             </button>
           </div>
         </div>
       </div>
     )}

     {/* â•گâ•گâ•گâ•گâ•گâ•گ Link School Modal â•گâ•گâ•گâ•گâ•گâ•گ */}
     {showLinkSchoolModal && linkSchoolTeacherId && (() => {
       const teacher = teachers.find(t => t.id === linkSchoolTeacherId)!;
       const currentSchoolIds = teacher.schools?.map(s => s.schoolId) ?? [teacher.schoolId ?? 'main'];
       // ط­ط³ط§ط¨ ط§ظ„ظ†طµط§ط¨ ط§ظ„ظ…طھط§ط­ ظ„ظ„ط±ط¨ط· (24 - ظ…ط¬ظ…ظˆط¹ ظ†طµط§ط¨ ط§ظ„ظ…ط¯ط§ط±ط³ ط§ظ„ط­ط§ظ„ظٹط©)
       // ظ„ظ„ظ…ط¹ظ„ظ… ط؛ظٹط± ط§ظ„ظ…ط´طھط±ظƒ: quotaLimit ظ‡ظˆ ط§ظ„ظ…ط±ط¬ط¹ ط§ظ„طµط­ظٹط­ (ظ‚ط¯ ظٹظƒظˆظ† ظ…ط®طھظ„ظپط§ظ‹ عن schools[0].lessons بعد bulk edit)
       const _usedQuota = teacher.isShared && teacher.schools?.length
         ? teacher.schools.reduce((sum, s) => sum + (s.lessons || 0) + (s.waiting || 0), 0)
         : (teacher.quotaLimit || 0) + (teacher.waitingQuota || 0);
       const _availableQuota = Math.max(0, 24 - _usedQuota);
       const _autoMatchId = linkSchoolSelectedId
         ? teachers.find(t => t.id !== linkSchoolTeacherId && t.name.trim() === teacher.name.trim() && (t.schools?.some(s => s.schoolId === linkSchoolSelectedId) || t.schoolId === linkSchoolSelectedId))?.id ?? null
         : null;
       const _isMerge = _autoMatchId && linkSchoolDuplicate === _autoMatchId;
       const _confirmDisabled = !linkSchoolSelectedId || (!_isMerge && (linkSchoolLessons <= 0 || linkSchoolLessons + linkSchoolWaiting > _availableQuota));
       const allSchools = [
         { id: 'main', name: schoolInfo.schoolName || 'المدرسة الرئيسية' },
         ...(schoolInfo.sharedSchools ?? []).map(s => ({ id: s.id, name: s.name })),
       ];
       const availableSchools = allSchools.filter(s => !currentSchoolIds.includes(s.id));
       return (
         <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
           <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
             {/* Header */}
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#655ac1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  ربط بمدرسة أخرى
               </h3>
               <button onClick={() => setShowLinkSchoolModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"><X size={20} /></button>
             </div>
             <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
                {/* الخطوة 1: اختيار المدرسة */}
               <div>
                 <label className="block text-sm font-black text-slate-700 mb-2">اختر المدرسة الثانية</label>
                 {availableSchools.length === 0 ? (
                   <p className="text-sm text-slate-400 bg-slate-50 p-3 rounded-xl">المعلم مرتبط بجميع المدارس المتاحة بالفعل.</p>
                 ) : (
                    <TeacherSelectDropdown
                      value={linkSchoolSelectedId}
                      options={availableSchools}
                      onChange={(value) => { setLinkSchoolSelectedId(value); setLinkSchoolDuplicate(''); setLinkSchoolLessons(0); setLinkSchoolWaiting(0); }}
                      placeholder="اختر المدرسة"
                    />
                 )}
               </div>

                {/* المنطق الذكي بعد اختيار المدرسة */}
               {linkSchoolSelectedId && (() => {
                 const currentTeacher = teachers.find(t => t.id === linkSchoolTeacherId);
                 const selectedSchoolName = linkSchoolSelectedId === 'main'
                   ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
                   : schoolInfo.sharedSchools?.find(s => s.id === linkSchoolSelectedId)?.name || linkSchoolSelectedId;
                 const schoolTeachers = teachers.filter(t =>
                   t.id !== linkSchoolTeacherId &&
                   (t.schools?.some(s => s.schoolId === linkSchoolSelectedId) || t.schoolId === linkSchoolSelectedId)
                 );
                 const autoMatch = currentTeacher
                   ? schoolTeachers.find(t => t.name.trim() === currentTeacher.name.trim())
                   : null;

                  // حالة: يوجد معلم بنفس الاسم ولم يُجب المستخدم بعد
                 if (autoMatch && linkSchoolDuplicate === '') {
                   return (
                     <div className="space-y-3">
                       <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                         <div>
                            <p className="text-sm font-black text-amber-800">وجدنا معلماً بنفس الاسم في مدرسة {selectedSchoolName}</p>
                            <p className="text-xs text-amber-700 mt-1">الاسم: <span className="font-bold">{autoMatch.name}</span> - هل هو نفس الشخص؟</p>
                         </div>
                       </div>
                       <button
                         onClick={() => setLinkSchoolDuplicate(autoMatch.id)}
                         className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-right"
                       >
                          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg flex-shrink-0">✓</span>
                         <div>
                            <p className="text-sm font-black text-slate-700">لا، شخص مختلف</p>
                            <p className="text-xs text-slate-400">سيتم توحيد بياناته تلقائياً</p>
                         </div>
                       </button>
                       <button
                         onClick={() => setLinkSchoolDuplicate('new')}
                         className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-slate-200 hover:border-[#655ac1] hover:bg-[#f5f3ff] transition-all text-right"
                       >
                         <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-lg flex-shrink-0">+</span>
                         <div>
                            <p className="text-sm font-black text-slate-700">لا، شخص مختلف</p>
                            <p className="text-xs text-slate-400">سيضاف كمعلم مشترك مستقل</p>
                         </div>
                       </button>
                     </div>
                   );
                 }

                  // حالة: تم اختيار توحيد المعلم
                 if (autoMatch && linkSchoolDuplicate === autoMatch.id) {
                   return (
                     <div className="space-y-3">
                       <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                         <div>
                            <p className="text-sm font-black text-emerald-800">سيتم توحيد بيانات المعلم في مدرسة {selectedSchoolName}</p>
                            <p className="text-xs text-emerald-700 mt-0.5">سيندمج سجله مع السجل الموجود تلقائياً عند الضغط على "ربط ودمج"</p>
                         </div>
                       </div>
                       <button onClick={() => setLinkSchoolDuplicate('')} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← تغيير الإجابة</button>
                     </div>
                   );
                 }

                  // حالة: لا يوجد تطابق أو اختار شخصاً مختلفاً
                 const usedQuota = currentTeacher?.isShared && currentTeacher?.schools?.length
                   ? currentTeacher.schools.reduce((sum, s) => sum + (s.lessons || 0) + (s.waiting || 0), 0)
                   : (currentTeacher ? (currentTeacher.quotaLimit || 0) + (currentTeacher.waitingQuota || 0) : 0);
                 const availableQuota = Math.max(0, 24 - usedQuota);
                 const maxLessons = Math.max(0, availableQuota - linkSchoolWaiting);
                 const maxWaiting = Math.max(0, availableQuota - linkSchoolLessons);
                 const newTotal = linkSchoolLessons + linkSchoolWaiting;
                 const isOverQuota = newTotal > availableQuota;
                 const noLessons = linkSchoolLessons <= 0;
                 return (
                   <div className="space-y-3">
                     {linkSchoolDuplicate === 'new' && autoMatch && (
                       <button onClick={() => setLinkSchoolDuplicate('')} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← تغيير الإجابة</button>
                     )}
                     <div className="bg-white border border-slate-200 rounded-2xl p-4">
                       <div className="flex items-center justify-between mb-3">
                         <label className="text-sm font-black text-slate-700">نصاب المعلم في مدرسة {selectedSchoolName}</label>
                         <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                           المتاح: <span className={`font-black ${availableQuota === 0 ? 'text-rose-500' : 'text-[#655ac1]'}`}>{availableQuota}</span> حصة
                         </span>
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                         <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1.5">نصاب الحصص <span className="text-rose-500">*</span></label>
                           <input
                             type="number"
                             value={linkSchoolLessons}
                             onChange={e => setLinkSchoolLessons(Math.max(0, Number(e.target.value)))}
                             min={1} max={availableQuota}
                             className={`w-full p-3 bg-slate-50 border rounded-xl outline-none text-sm font-bold text-center text-[#655ac1] focus:ring-4 transition-all ${isOverQuota ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-[#655ac1] focus:ring-[#e5e1fe]'}`}
                           />
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1.5">نصاب الانتظار</label>
                           <input
                             type="number"
                             value={linkSchoolWaiting}
                             onChange={e => setLinkSchoolWaiting(Math.max(0, Number(e.target.value)))}
                             min={0} max={availableQuota}
                             className={`w-full p-3 bg-slate-50 border rounded-xl outline-none text-sm font-bold text-center text-[#655ac1] focus:ring-4 transition-all ${isOverQuota ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-[#655ac1] focus:ring-[#e5e1fe]'}`}
                           />
                         </div>
                       </div>
                       {newTotal > 0 && (
                         <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-400">
                            <span>المجموع: <span className={isOverQuota ? 'text-rose-600' : 'text-slate-600'}>{newTotal}</span> حصة</span>
                            <span>يتبقى: <span className="text-emerald-600">{Math.max(0, availableQuota - newTotal)}</span> حصة</span>
                         </div>
                       )}
                     </div>
                     {isOverQuota && (
                       <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl p-3">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                         <p className="text-xs font-bold text-rose-700">
                            المجموع ({newTotal}) يتجاوز المتاح ({availableQuota} حصة). قلّل النصاب للمتابعة.
                         </p>
                       </div>
                     )}
                   </div>
                 );
               })()}
             </div>
             {/* Footer */}
             <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
               <button onClick={() => setShowLinkSchoolModal(false)} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all">إلغاء</button>
               <button
                 onClick={confirmLinkSchool}
                 disabled={_confirmDisabled}
                 className="px-5 py-2.5 bg-[#655ac1] text-white rounded-xl font-bold hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
               >
                  {_isMerge ? 'ربط ودمج' : 'ربط وإضافة'}
               </button>
             </div>
           </div>
         </div>
       );
     })()}

     {/* â•گâ•گâ•گâ•گâ•گâ•گ Unlink School Modal â•گâ•گâ•گâ•گâ•گâ•گ */}
     {showUnlinkSchoolModal && unlinkSchoolTeacherId && (() => {
       const teacher = teachers.find(t => t.id === unlinkSchoolTeacherId)!;
       const schools = teacher.schools ?? [];
       return (
         <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
           <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
             {/* Header */}
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#655ac1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                 إلغاء الربط
               </h3>
               <button onClick={() => setShowUnlinkSchoolModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"><X size={20} /></button>
             </div>
             <div className="p-6 space-y-4">
                <p className="text-sm font-black text-slate-700">فك الارتباط عن أي مدرسة؟</p>
               <div className="space-y-2">
                 {schools.map(s => (
                   <label key={s.schoolId} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${unlinkSchoolSelectedId === s.schoolId ? 'border-rose-300 bg-rose-50' : 'border-slate-100 hover:border-rose-200 hover:bg-rose-50/40'}`}>
                     <input type="radio" name="unlinkSchool" value={s.schoolId} checked={unlinkSchoolSelectedId === s.schoolId} onChange={() => setUnlinkSchoolSelectedId(s.schoolId)} className="accent-rose-500" />
                     <span className="text-sm font-bold text-slate-700">{s.schoolName}</span>
                   </label>
                 ))}
               </div>
               {/* تحذير */}
               <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                 <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                  <p className="text-xs font-bold text-rose-600 leading-relaxed">سيتم حذف جميع إسنادات المعلم في المدرسة المختارة ولا يمكن التراجع.</p>
               </div>
             </div>
             {/* Footer */}
             <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
               <button onClick={() => setShowUnlinkSchoolModal(false)} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all">إلغاء</button>
               <button
                 onClick={confirmUnlinkSchool}
                 disabled={!unlinkSchoolSelectedId}
                 className="px-5 py-2.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
               >
                 إلغاء الربط
               </button>
             </div>
           </div>
         </div>
       );
     })()}

          <TeacherConstraintsModal
        isOpen={showConstraintsModal}
        onClose={() => setShowConstraintsModal(false)}
        initialTeacherId={constraintsInitialTeacherId}
        teachers={teachers}
        specializations={specializations}
        constraints={scheduleSettings?.teacherConstraints || []}
        activeDays={schoolInfo.timing?.activeDays || ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']}
        periodsPerDay={Math.max(7, ...(Object.values(schoolInfo.timing?.periodCounts || {}) as number[]))}
        periodCounts={schoolInfo.timing?.periodCounts || {}}
        warnings={[]} // Optional: Pass actual warnings if needed/calculated
        classes={classes}
        mainSchoolName={schoolInfo.schoolName || 'المدرسة الرئيسية'}
        schoolPhasesMap={{
          'main': schoolInfo.phases || [],
          ...Object.fromEntries((schoolInfo.sharedSchools || []).map(s => [s.id, s.phases || []]))
        }}
        onChangeConstraints={c => setScheduleSettings && setScheduleSettings(prev => ({ ...prev, teacherConstraints: c }))}
     />

     {/* â•گâ•گâ•گâ•گâ•گâ•گ Action Dropdown Portal â•گâ•گâ•گâ•گâ•گâ•گ */}
     {actionDropdown && ReactDOM.createPortal(
        <div
            className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 w-56"
            style={{ top: actionDropdown.top, left: actionDropdown.left, minWidth: 210 }}
            onClick={e => e.stopPropagation()}
        >
            <button
                onClick={() => {
                    const t = teachers.find(x => x.id === actionDropdown.teacherId);
                    if (t) { setEditingTeacherId(t.id); setEditingSpecId(null); setIsBulkEdit(false); setActionDropdown(null); }
                }}
                className="w-full text-right px-4 py-3 text-sm text-slate-700 hover:bg-white hover:text-[#655ac1] hover:ring-1 hover:ring-[#655ac1]/30 rounded-xl font-bold transition-colors"
            >
                تعديل
            </button>

            <button
                onClick={() => {
                    const t = teachers.find(x => x.id === actionDropdown.teacherId);
                    if (t) { openCopyModal(t); setActionDropdown(null); }
                }}
                className="w-full text-right px-4 py-3 text-sm text-slate-700 hover:bg-white hover:text-[#655ac1] hover:ring-1 hover:ring-[#655ac1]/30 rounded-xl font-bold transition-colors"
            >
                نسخ النصاب
            </button>

            <button
                onClick={() => { openTeacherConstraints(actionDropdown.teacherId); setActionDropdown(null); }}
                className="w-full text-right px-4 py-3 text-sm text-slate-700 hover:bg-white hover:text-[#655ac1] hover:ring-1 hover:ring-[#655ac1]/30 rounded-xl font-bold transition-colors"
            >
                قيود المعلم
            </button>

            {/* ربط بمدرسة أخرى - يظهر فقط إذا وجدت مدارس مشتركة والمعلم غير مشترك */}
            {schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0 && !teachers.find(x => x.id === actionDropdown.teacherId)?.isShared && (
                <button
                    onClick={() => { openLinkSchoolModal(actionDropdown.teacherId); setActionDropdown(null); }}
                    className="w-full text-right px-4 py-3 text-sm text-slate-700 hover:bg-white hover:text-[#655ac1] hover:ring-1 hover:ring-[#655ac1]/30 rounded-xl font-bold transition-colors"
                >
                    ربط بمدرسة أخرى
                </button>
            )}

            {/* إلغاء الربط - يظهر فقط إذا المعلم مشترك */}
            {teachers.find(x => x.id === actionDropdown.teacherId)?.isShared && (
                <button
                    onClick={() => { openUnlinkSchoolModal(actionDropdown.teacherId); setActionDropdown(null); }}
                    className="w-full text-right px-4 py-3 text-sm text-slate-700 hover:bg-white hover:text-[#655ac1] hover:ring-1 hover:ring-[#655ac1]/30 rounded-xl font-bold transition-colors"
                >
                    إلغاء الربط
                </button>
            )}
        </div>,
        document.body
     )}
    </div>
    </>
  );
};

export default Step6Teachers;
