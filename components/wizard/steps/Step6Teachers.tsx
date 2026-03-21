import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Teacher, Specialization, SchoolInfo, ScheduleSettingsData, ClassInfo } from '../../../types';
import { Briefcase, Plus, X, Upload, Trash2, Edit, Edit3, Pen, Check, ChevronDown, ChevronUp, Search, Printer, List, User, Users, GripVertical, AlertTriangle, CheckCircle2, ArrowUp, ArrowDown, Copy, CheckSquare, Square, Sliders, Info, AlertCircle } from 'lucide-react';
import { INITIAL_SPECIALIZATIONS } from '../../../constants';
import { parseTeachersExcel, TeacherData } from '../../../utils/excelTeachers';
import SchoolTabs from '../SchoolTabs';
import TeacherConstraintsModal from '../../teachers/TeacherConstraintsModal';
import PrintHeader from '../../ui/PrintHeader';

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
    { id: '99', name: 'آخر' },
  ];

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

  // Action Dropdown State
  const [actionDropdown, setActionDropdown] = useState<{ teacherId: string; top: number; left: number } | null>(null);

  // Import Review Modal State
  const [showImportReviewModal, setShowImportReviewModal] = useState(false);
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
  const [linkSchoolSearch, setLinkSchoolSearch]         = useState('');
  const [linkSchoolDuplicate, setLinkSchoolDuplicate]   = useState<string>('new'); // teacher id or 'new'

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
      return id; // custom specialization — show as-is
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
        specializationId: row.specialization || 'أخرى',
        assignedSubjectId: '', quotaLimit: row.weeklyQuota || 24,
        waitingQuota: row.waitingQuota || 0, phone: row.mobile || '',
        sortIndex: ++sortBase, schoolId: activeSchoolId,
        isShared: false, idNumber: row.idNumber || null,
        schools: [{ schoolId: activeSchoolId, schoolName: getSchName(activeSchoolId), subjects: [], classes: [], lessons: row.weeklyQuota || 24, waiting: row.waitingQuota || 0 }],
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
        showToast(`✅ تم استيراد ${directTeachers.length} معلماً بنجاح`, 'success');
      } else {
        showToast('لم يتم إضافة أي معلم — الأسماء موجودة مسبقاً', 'warning');
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
        specializationId: i.row.specialization || 'أخرى',
        assignedSubjectId: '', quotaLimit: i.row.weeklyQuota || 24,
        waitingQuota: i.row.waitingQuota || 0, phone: i.row.mobile || '',
        sortIndex: ++sortBase, schoolId: activeSchoolId,
        isShared: false, idNumber: i.row.idNumber || null,
        schools: [{ schoolId: activeSchoolId, schoolName: getSchName(activeSchoolId), subjects: [], classes: [], lessons: i.row.weeklyQuota || 24, waiting: i.row.waitingQuota || 0 }],
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
    const parts = [added && `إضافة ${added}`, linked && `ربط ${linked} كمشترك`, skipped && `تخطي ${skipped}`].filter(Boolean);
    showToast(`✅ ${parts.join(' — ')}`, 'success');
    setShowImportReviewModal(false);
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
    const knownIds = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','99'];
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

      let specId = currentTeacher.specializationId;
      if (specId === '99') {
          if (!customSpecName.trim()) return alert("يرجى كتابة اسم التخصص");
          specId = customSpecName.trim();
      }

      const teacherToSave = { ...currentTeacher, specializationId: specId, schoolId: currentTeacher.schoolId || activeSchoolId } as Teacher;
      
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

  const openLinkSchoolModal = (teacherId: string) => {
    setLinkSchoolTeacherId(teacherId);
    setLinkSchoolSelectedId('');
    setLinkSchoolSearch('');
    setLinkSchoolDuplicate('new');
    setShowLinkSchoolModal(true);
  };

  const confirmLinkSchool = () => {
    if (!linkSchoolTeacherId || !linkSchoolSelectedId) return;
    const schoolName = linkSchoolSelectedId === 'main'
      ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
      : schoolInfo.sharedSchools?.find(s => s.id === linkSchoolSelectedId)?.name || linkSchoolSelectedId;

    if (linkSchoolDuplicate && linkSchoolDuplicate !== 'new') {
      // دمج مع معلم موجود: احتفظ بالأقدم وانقل schools[] من المكرر
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
      // إضافة مدرسة جديدة للمعلم الحالي
      setTeachers(prev => prev.map(t => {
        if (t.id !== linkSchoolTeacherId) return t;
        return {
          ...t, isShared: true,
          schools: [...(t.schools || []), { schoolId: linkSchoolSelectedId, schoolName, subjects: [], classes: [], lessons: 0, waiting: 0 }],
        };
      }));
    }
    setShowLinkSchoolModal(false);
    showToast('✅ تم ربط المعلم بالمدرسة بنجاح', 'success');
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
    showToast('✅ تم فك الربط بنجاح', 'success');
  };

  const openActionDropdown = (e: React.MouseEvent, teacherId: string) => {
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const dropdownWidth = 185;
      // محاذاة من اليمين بالنسبة للزر مع منع الخروج عن الشاشة
      let left = rect.right - dropdownWidth;
      if (left < 8) left = rect.left;
      if (left + dropdownWidth > window.innerWidth - 8) left = window.innerWidth - dropdownWidth - 8;
      setActionDropdown({ teacherId, top: rect.bottom + 6, left });
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
      const style = document.createElement('style');
      style.id = 'print-portrait-override';
      style.innerHTML = `
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            font-size: 9.5px !important;
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
            <Users size={36} strokeWidth={1.8} className="text-[#655ac1]" />
             إدارة المعلمون
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إضافة وتعديل بيانات المعلمين وتعيين الأنصبة والقيود</p>
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
             
        </div>
      </div>

       {/* ══════ Action Bar (Hidden in Print) ══════ */}
       <div className="flex flex-wrap items-center gap-3 mb-6 print:hidden">
           <input type="file" ref={fileInputRef} hidden accept=".xlsx, .xls" onChange={handleFileUpload} />

           <button
               onClick={openAddModal}
               className="flex items-center gap-2 px-6 py-3 bg-[#655ac1] text-white rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 hover:bg-[#5448a8] transition-all hover:scale-105 active:scale-95"
           >
               <Plus size={20} />
               إضافة معلم
           </button>

           <button
               onClick={() => fileInputRef.current?.click()}
               className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:border-[#8779fb] hover:text-[#655ac1] transition-all hover:scale-105 active:scale-95"
           >
               <Upload size={20} className="text-[#8779fb]" />
               {loading ? 'جاري الاستيراد...' : 'استيراد من Excel'}
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
               {isBulkEdit ? <Check size={20} /> : <Edit size={20} className="text-[#8779fb]" />}
               {isBulkEdit ? 'حفظ التعديلات' : 'تعديل الكل'}
           </button>

           <button
               onClick={handlePrint}
               className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:border-[#655ac1] hover:text-[#655ac1] transition-all hover:scale-105 active:scale-95"
               title="طباعة القائمة الحالية"
           >
               <Printer size={20} className="text-[#8779fb]" />
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
                        <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[9999] w-72 flex flex-col">
                            <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-sm font-black text-slate-700">تصفية بالتخصص</span>
                                <div className="flex items-center gap-2">
                                    {filterSpecializations.length > 0 && (
                                        <button onClick={() => setFilterSpecializations([])} className="text-xs text-[#655ac1] font-black hover:bg-[#f0eeff] px-2.5 py-1 rounded-lg transition-colors">
                                            إعادة ضبط
                                        </button>
                                    )}
                                    <button onClick={() => setIsSpecDropdownOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                                        <X size={16} className="text-slate-400" />
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-y-auto p-3 space-y-1 max-h-72">
                                {getUsedSpecializationIds().map(id => {
                                    const selected = filterSpecializations.includes(id);
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => toggleSpecializationFilter(id)}
                                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all border ${
                                                selected
                                                    ? 'border-[#655ac1]/30 text-[#655ac1] bg-white'
                                                    : 'border-transparent text-slate-600 hover:border-[#655ac1]/20 hover:bg-white'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                                                selected ? 'bg-[#655ac1] border-[#655ac1] border' : 'border-2 border-slate-200 bg-white'
                                            }`}>
                                                {selected && <Check size={11} className="text-white" strokeWidth={3}/>}
                                            </div>
                                            <span className="flex-1 text-right">{getSpecializationName(id)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {filterSpecializations.length > 0 && (
                                <div className="px-4 py-3 border-t border-slate-100 bg-[#f8f7ff] rounded-b-2xl">
                                    <span className="text-xs font-bold text-[#655ac1]">{filterSpecializations.length} تخصص محدد</span>
                                </div>
                            )}
                        </div>
                    )}
                 </div>
             </div>

             <div className="w-px h-8 bg-slate-200 hidden lg:block mx-2"></div>

             {/* Left Side: Stats */}
             <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end shrink-0">
                 <div className="flex items-center gap-4 px-6 py-3 bg-white rounded-2xl border-2 border-[#655ac1]/20 cursor-default hover:border-[#655ac1]/40 transition-all">
                    <div className="p-2 bg-slate-100 rounded-xl">
                        <Users size={22} className="text-[#655ac1]" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="text-xs font-bold text-slate-400 leading-tight">إجمالي المعلمين</span>
                        <span className="text-2xl font-black text-[#655ac1] leading-none mt-0.5">{filteredTeachers.length}</span>
                    </div>
                 </div>
             </div>
        </div>

      {/* ══════ Teachers List (print:table wrapper makes header repeat on every page) ══════ */}
      <div className="print:table print:w-full">

        {/* Repeating print header — hidden on screen */}
        <div className="hidden print:table-header-group">
          <div className="print:table-row">
            <div className="print:table-cell" style={{ padding: 0 }}>
              <PrintHeader schoolInfo={schoolInfo} title="بيان المعلمين" />
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
            return (
                <div key={specId} className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-[#655ac1]/5 overflow-hidden print:shadow-none print:border-2 print:border-slate-800 print:rounded-none print:break-inside-avoid">
                     {/* Section Header */}
                     <div className="bg-white px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-50/50 to-white print:bg-slate-100 print:from-slate-100 print:to-slate-100 print:border-slate-800 print:py-2">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#655ac1] rounded-full print:bg-slate-900" />
                            <h4 className="font-black text-slate-800 text-lg print:text-base">
                                {getSpecializationName(specId)} 
                                <span className="mr-2 px-2.5 py-0.5 bg-slate-100 text-[#655ac1] rounded-full text-sm font-black print:border print:border-slate-400 print:text-slate-900">{group.length}</span>
                            </h4>
                        </div>
                        <div className="flex items-center gap-1 print:hidden">
                            <div className="relative group/up">
                                <button onClick={() => moveSection(specId, 'up')} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-[#655ac1] transition-all"><ArrowUp size={16}/></button>
                                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1 bg-[#655ac1] text-white text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/up:opacity-100 transition-opacity pointer-events-none z-[100]">للأعلى</span>
                            </div>
                            <div className="relative group/down">
                                <button onClick={() => moveSection(specId, 'down')} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-[#655ac1] transition-all"><ArrowDown size={16}/></button>
                                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1 bg-[#655ac1] text-white text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/down:opacity-100 transition-opacity pointer-events-none z-[100]">للأسفل</span>
                            </div>
                        </div>
                     </div>
                     
                     <div className="overflow-x-auto">
                        <table className="w-full text-right">
                             <thead>
                                <tr className="bg-white border-b border-slate-100 print:bg-white print:border-slate-800">
                                   <th className="p-4 w-16 text-center text-sm font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:w-8 print:text-xs">م</th>
                                   <th className="p-4 text-sm font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:min-w-[160px] print:text-xs">اسم المعلم</th>
                                   <th className="p-4 text-sm font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:min-w-[110px] print:text-xs">رقم الجوال</th>
                                   <th className="p-4 text-center w-32 text-sm font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:w-16 print:text-xs">نصاب الحصص</th>
                                   <th className="p-4 text-center w-32 text-sm font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:w-16 print:text-xs">نصاب الانتظار</th>
                                   <th className="p-4 text-center w-32 text-sm font-black text-[#655ac1] print:text-slate-900 print:p-1 print:w-14 print:text-xs">المجموع</th>
                                   <th className="p-4 w-32 text-center text-sm font-black text-[#655ac1] print:hidden">إجراءات</th>
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
                                        <td className="p-4 font-bold text-slate-700 print:border-l print:border-slate-300 print:p-1 print:text-black print:text-xs print:whitespace-nowrap">
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
                                        <td className="p-4 print:border-l print:border-slate-300 print:p-1 print:text-xs print:whitespace-nowrap">
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
                                                <button
                                                    onClick={e => openActionDropdown(e, t.id)}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all border border-slate-300"
                                                    title="الإجراءات"
                                                >
                                                    <Pen size={14} />
                                                </button>
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
            </div>
          </div>
        </div>
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
                                onChange={e => { setCurrentTeacher({...currentTeacher, specializationId: e.target.value}); setCustomSpecName(''); }}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] focus:ring-4 focus:ring-[#e5e1fe] transition-all"
                            >
                                {MODAL_SPECS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
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
     {/* ══════ Import Review Modal ══════ */}
     {showImportReviewModal && (
       <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
         <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

           {/* Header */}
           <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
             <div>
               <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                 <AlertCircle size={22} className="text-amber-500" />
                 مراجعة التعارضات
               </h3>
               <p className="text-xs text-slate-400 font-bold mt-0.5">
                 {importReviewItems.length} حالة تحتاج مراجعة — راجع وأكد الاختيار لكل سجل
               </p>
             </div>
             <button onClick={() => setShowImportReviewModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
               <X size={20} />
             </button>
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
                       {isId ? '✓ رقم هوية' : isPartial ? '⚠ تشابه جزئي' : '≈ تطابق تام'}
                     </span>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-black text-slate-800 truncate">{item.row.name}</p>
                       <p className="text-xs text-slate-400 font-bold mt-0.5">
                         في الملف → يشبه <span className="text-slate-600">{item.existing.name}</span> في {item.existingSchoolName}
                       </p>
                       {isPartial && <p className="text-[11px] text-amber-600 font-bold mt-1">تشابه في الاسم الأول والأخير فقط — تحقق بعناية</p>}
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
                       ربط كمشترك
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
                         إضافة كجديد
                       </button>
                     )}
                   </div>
                 </div>
               );
             })}
           </div>

           {/* Footer */}
           <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3 shrink-0">
             <button
               onClick={() => { setImportReviewItems(prev => prev.map(i => ({ ...i, choice: i.matchType === 'id' ? 'skip' : 'add_new' }))); }}
               className="text-xs text-slate-400 hover:text-slate-600 font-bold transition-colors underline underline-offset-2"
             >
               تجاهل الكل وإضافة كمعلمين جدد
             </button>
             <div className="flex-1" />
             <button onClick={() => setShowImportReviewModal(false)} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">
               إلغاء
             </button>
             <button onClick={confirmImportReview} className="px-6 py-2.5 bg-[#655ac1] text-white rounded-xl text-sm font-bold hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 transition-all">
               تطبيق الكل
             </button>
           </div>
         </div>
       </div>
     )}

     {/* ══════ Link School Modal ══════ */}
     {showLinkSchoolModal && linkSchoolTeacherId && (() => {
       const teacher = teachers.find(t => t.id === linkSchoolTeacherId)!;
       const currentSchoolIds = teacher.schools?.map(s => s.schoolId) ?? [teacher.schoolId ?? 'main'];
       const allSchools = [
         { id: 'main', name: schoolInfo.schoolName || 'المدرسة الرئيسية' },
         ...(schoolInfo.sharedSchools ?? []).map(s => ({ id: s.id, name: s.name })),
       ];
       const availableSchools = allSchools.filter(s => !currentSchoolIds.includes(s.id));
       const schoolTeachers = linkSchoolSelectedId
         ? teachers.filter(t => t.id !== linkSchoolTeacherId && (t.schools?.some(s => s.schoolId === linkSchoolSelectedId) || t.schoolId === linkSchoolSelectedId))
         : [];
       const searchResults = linkSchoolSearch.trim()
         ? schoolTeachers.filter(t => t.name.includes(linkSchoolSearch.trim()))
         : schoolTeachers;
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
                   <select
                     value={linkSchoolSelectedId}
                     onChange={e => { setLinkSchoolSelectedId(e.target.value); setLinkSchoolSearch(''); setLinkSchoolDuplicate('new'); }}
                     className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] focus:ring-4 focus:ring-[#e5e1fe] transition-all"
                   >
                     <option value="">— اختر المدرسة —</option>
                     {availableSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                 )}
               </div>

               {/* الخطوة 2: البحث عن سجل مكرر (بعد اختيار المدرسة) */}
               {linkSchoolSelectedId && (
                 <div>
                   <label className="block text-sm font-black text-slate-700 mb-2">ابحث عن سجل مكرر بالاسم <span className="font-normal text-slate-400">(اختياري)</span></label>
                   <input
                     value={linkSchoolSearch}
                     onChange={e => { setLinkSchoolSearch(e.target.value); setLinkSchoolDuplicate('new'); }}
                     placeholder="اكتب اسم المعلم للبحث..."
                     className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] focus:ring-4 focus:ring-[#e5e1fe] transition-all"
                   />
                   {/* نتائج البحث كـ radio buttons */}
                   <div className="mt-3 space-y-2">
                     {searchResults.map(t => (
                       <label key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${linkSchoolDuplicate === t.id ? 'border-[#655ac1]/40 bg-[#f5f3ff]' : 'border-slate-100 hover:border-[#655ac1]/20 hover:bg-slate-50'}`}>
                         <input type="radio" name="linkDuplicate" value={t.id} checked={linkSchoolDuplicate === t.id} onChange={() => setLinkSchoolDuplicate(t.id)} className="accent-[#655ac1]" />
                         <span className="text-sm font-bold text-slate-700">{t.name}</span>
                         <span className="text-xs text-slate-400 mr-auto">{getSpecializationName(t.specializationId)}</span>
                       </label>
                     ))}
                     <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${linkSchoolDuplicate === 'new' ? 'border-[#655ac1]/40 bg-[#f5f3ff]' : 'border-slate-100 hover:border-[#655ac1]/20 hover:bg-slate-50'}`}>
                       <input type="radio" name="linkDuplicate" value="new" checked={linkSchoolDuplicate === 'new'} onChange={() => setLinkSchoolDuplicate('new')} className="accent-[#655ac1]" />
                       <span className="text-sm font-bold text-slate-500">لا يوجد سجل، أضفه تلقائياً</span>
                     </label>
                   </div>
                 </div>
               )}
             </div>
             {/* Footer */}
             <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
               <button onClick={() => setShowLinkSchoolModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">إلغاء</button>
               <button
                 onClick={confirmLinkSchool}
                 disabled={!linkSchoolSelectedId}
                 className="px-5 py-2.5 bg-[#655ac1] text-white rounded-xl font-bold hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
               >
                 {linkSchoolDuplicate === 'new' ? 'ربط وإضافة' : 'ربط ودمج السجلات'}
               </button>
             </div>
           </div>
         </div>
       );
     })()}

     {/* ══════ Unlink School Modal ══════ */}
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
                 <p className="text-xs font-bold text-rose-600 leading-relaxed">سيتم حذف جميع إسنادات المعلم في المدرسة المختارة ولا يمكن التراجع</p>
               </div>
             </div>
             {/* Footer */}
             <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
               <button onClick={() => setShowUnlinkSchoolModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">إلغاء</button>
               <button
                 onClick={confirmUnlinkSchool}
                 disabled={!unlinkSchoolSelectedId}
                 className="px-5 py-2.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
               >
                 تأكيد الفك
               </button>
             </div>
           </div>
         </div>
       );
     })()}

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

     {/* ══════ Action Dropdown Portal ══════ */}
     {actionDropdown && ReactDOM.createPortal(
        <div
            className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5"
            style={{ top: actionDropdown.top, left: actionDropdown.left, minWidth: 185 }}
            onClick={e => e.stopPropagation()}
        >
            {/* تعديل */}
            <button
                onClick={() => {
                    const t = teachers.find(x => x.id === actionDropdown.teacherId);
                    if (t) { openEditModal(t); setActionDropdown(null); }
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors"
            >
                <Edit size={15} className="text-[#655ac1]" /> تعديل
            </button>

            {/* نسخ النصاب */}
            <button
                onClick={() => {
                    const t = teachers.find(x => x.id === actionDropdown.teacherId);
                    if (t) { openCopyModal(t); setActionDropdown(null); }
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors"
            >
                <Copy size={15} className="text-[#655ac1]" /> نسخ النصاب
            </button>

            {/* ربط بمدرسة أخرى — يظهر فقط إذا المعلم غير مشترك */}
            {!teachers.find(x => x.id === actionDropdown.teacherId)?.isShared && (
                <button
                    onClick={() => { openLinkSchoolModal(actionDropdown.teacherId); setActionDropdown(null); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#655ac1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    ربط بمدرسة أخرى
                </button>
            )}

            {/* إلغاء الربط — يظهر فقط إذا المعلم مشترك */}
            {teachers.find(x => x.id === actionDropdown.teacherId)?.isShared && (
                <button
                    onClick={() => { openUnlinkSchoolModal(actionDropdown.teacherId); setActionDropdown(null); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#655ac1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        <line x1="2" y1="2" x2="22" y2="22"/>
                    </svg>
                    إلغاء الربط
                </button>
            )}

            <div className="border-t border-slate-100 my-1" />

            {/* حذف */}
            <button
                onClick={() => { removeTeacher(actionDropdown.teacherId); setActionDropdown(null); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 font-bold transition-colors"
            >
                <Trash2 size={15} /> حذف المعلم
            </button>
        </div>,
        document.body
     )}
    </div>
    </>
  );
};

export default Step6Teachers;
