import React, { useState, useMemo, useCallback, useRef, useEffect, startTransition } from 'react';
import ReactDOM from 'react-dom';
import { ClassInfo, Student, SchoolInfo, Phase } from '../../../types';
import { PHASE_CONFIG } from '../../../constants';
import {
  Users, Upload, Search, Filter, Printer, Trash2, Plus, X, Pencil, Check,
  AlertTriangle, School, GraduationCap, ArrowUpCircle, Download,
  ChevronDown, Loader2, CheckCircle2, Phone, Hash, FileSpreadsheet,
  RotateCcw, UserPlus, Trash, Edit2, BookOpen
} from 'lucide-react';
import {
  parseStudentExcel,
  printStudentList,
  getStudentStats,
} from '../../../utils/studentUtils';
import SchoolTabs from '../SchoolTabs';

interface Step5Props {
  classes: ClassInfo[];
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  schoolInfo: SchoolInfo;
}

// ─── Memoized Student Row ─────────────────────────────────────
// Defined outside the parent so React.memo works across renders.
// Only re-renders when its own props change — prevents all rows from
// re-rendering when a modal opens, dropdown toggles, etc.
interface StudentRowProps {
  student: Student;
  idx: number;
  isSelected: boolean;
  isEditing: boolean;
  editName: string;
  editPhone: string;
  editClassId: string;
  gradeClasses: ClassInfo[];
  getClassName: (classId: string) => string;
  onToggleSelect: (id: string) => void;
  onSetEditName: (v: string) => void;
  onSetEditPhone: (v: string) => void;
  onSetEditClassId: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onOpenDropdown: (e: React.MouseEvent<HTMLButtonElement>, id: string) => void;
}

const StudentRow = React.memo<StudentRowProps>(function StudentRow({
  student, idx, isSelected, isEditing,
  editName, editPhone, editClassId, gradeClasses, getClassName,
  onToggleSelect, onSetEditName, onSetEditPhone, onSetEditClassId,
  onSaveEdit, onCancelEdit, onOpenDropdown,
}) {
  return (
    <tr className={`transition-colors group ${
      isSelected ? 'bg-[#e5e1fe]/20' : isEditing ? 'bg-[#f5f3ff]' : 'hover:bg-[#e5e1fe]/10'
    }`}>
      <td className="p-4 text-center relative">
        <div className="flex items-center justify-center gap-1">
          <div
            onClick={() => onToggleSelect(student.id)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all absolute right-3 opacity-0 group-hover:opacity-100 ${
              isSelected ? 'opacity-100 bg-[#655ac1] border-[#655ac1]' : 'border-slate-200 hover:border-[#655ac1]'
            }`}
          >
            {isSelected && <Check size={11} className="text-white" />}
          </div>
          <span className={`text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 flex items-center justify-center rounded-full transition-opacity ${isSelected ? 'opacity-0' : 'group-hover:opacity-0'}`}>
            {idx + 1}
          </span>
        </div>
      </td>
      <td className="p-4 font-bold text-slate-700">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={e => onSetEditName(e.target.value)}
            className="w-full p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-sm font-bold shadow-sm"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit(); }}
          />
        ) : (
          <span className="group-hover:text-[#655ac1] transition-colors">{student.name}</span>
        )}
      </td>
      <td className="p-4 text-center">
        {isEditing ? (
          <select
            value={editClassId}
            onChange={e => onSetEditClassId(e.target.value)}
            className="p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-xs font-bold w-full shadow-sm"
          >
            <option value="">غير محدد</option>
            {gradeClasses.map(c => (
              <option key={c.id} value={c.id}>{c.name || `${c.grade}/${c.section}`}</option>
            ))}
          </select>
        ) : (
          <span className={`inline-block text-sm font-bold px-3 py-1.5 rounded-xl ${
            student.classId ? 'text-[#655ac1] bg-slate-100' : 'text-amber-600 bg-amber-50'
          }`}>
            {getClassName(student.classId)}
          </span>
        )}
      </td>
      <td className="p-4 text-center">
        {isEditing ? (
          <input
            type="tel"
            value={editPhone}
            onChange={e => onSetEditPhone(e.target.value)}
            className="w-full p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-xs font-bold text-center shadow-sm"
            dir="ltr"
            onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit(); }}
          />
        ) : (
          <span className="text-sm font-bold text-slate-600 font-mono tracking-wide" dir="ltr">
            {student.parentPhone || <span className="text-slate-300 font-normal">—</span>}
          </span>
        )}
      </td>
      <td className="p-4 text-center">
        {isEditing ? (
          <div className="flex items-center justify-center gap-1">
            <button onClick={onSaveEdit} className="p-2 bg-[#655ac1] text-white rounded-lg hover:bg-[#5448a8] transition-all shadow-sm" title="حفظ">
              <Check size={14} />
            </button>
            <button onClick={onCancelEdit} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all" title="إلغاء">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={e => onOpenDropdown(e, student.id)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#e5e1fe] text-slate-400 hover:text-[#655ac1] transition-all border border-slate-200 hover:border-[#8779fb] mx-auto"
            title="إجراءات"
          >
            <Edit2 size={14} />
          </button>
        )}
      </td>
    </tr>
  );
});

const Step5Students: React.FC<Step5Props> = ({ classes, students, setStudents, schoolInfo }) => {
  // ─── Core State ───
  const [activeSchoolId, setActiveSchoolId] = useState<string>('main');
  const [activePhase, setActivePhase] = useState<Phase>(schoolInfo.phases?.[0] || Phase.ELEMENTARY);

  // ─── Import State ───
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ matched: number; unmatched: number; total: number; errors: string[] } | null>(null);
  const [showImportErrors, setShowImportErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gradeDropdownRef = useRef<HTMLDivElement>(null);
  const classDropdownRef = useRef<HTMLDivElement>(null);
  // Ref keeps latest edit state so handleSaveEdit stays stable (no deps on edit fields)
  const editStateRef = useRef({ editName: '', editPhone: '', editClassId: '', editingStudent: null as string | null });

  // ─── Manual Add/Edit State ───
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [addGrade, setAddGrade] = useState<number>(1);
  const [addClassId, setAddClassId] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editClassId, setEditClassId] = useState('');

  // ─── Filter State ───
  const [searchText, setSearchText] = useState('');
  const [filterGrades, setFilterGrades] = useState<number[]>([]);
  const [filterClassIds, setFilterClassIds] = useState<string[]>([]);
  const [gradeDropdownOpen, setGradeDropdownOpen] = useState(false);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  // ─── Per-Grade Class Filter (chips inside each grade section) ───
  const [gradeClassFilters, setGradeClassFilters] = useState<Record<number, string>>({});

  // ─── Selection State ───
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [gradeDeleteTarget, setGradeDeleteTarget] = useState<{ grade: number; classId?: string; className?: string } | null>(null);
  const [showMissingDataModal, setShowMissingDataModal] = useState(false);


  // ─── Print State ───
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printSelection, setPrintSelection] = useState<{ type: 'all' | 'grade' | 'class'; gradeValue: number | ''; classId: string }>({ type: 'all', gradeValue: '', classId: '' });
  const [showBulkCountModal, setShowBulkCountModal] = useState(false);

  // ─── Manual Bulk Entry State ───
  const [isBulkEntryMode, setIsBulkEntryMode] = useState(false);
  const [bulkCount, setBulkCount] = useState<number>(50);
  const [bulkStudents, setBulkStudents] = useState<Array<{
    id: string;
    name: string;
    grade: number;
    classId: string;
    parentPhone: string;
  }>>([]);

  // ─── Toast State ───
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ─── Action Dropdown State ───
  const [actionDropdown, setActionDropdown] = useState<{ studentId: string; top: number; left: number } | null>(null);

  // ─── Derived Data ───
  // Sync activePhase with activeSchoolId
  React.useEffect(() => {
    if (activeSchoolId === 'main') {
      const phases = schoolInfo.phases || [];
      if (phases.length > 0 && !phases.includes(activePhase)) {
        setActivePhase(phases[0]);
      }
    } else {
      const shared = schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId);
      if (shared && shared.phases?.length > 0) {
        if (!shared.phases.includes(activePhase)) {
          setActivePhase(shared.phases[0]);
        }
      }
    }
  }, [activeSchoolId, schoolInfo, activePhase]);

  const hasSecond = schoolInfo.hasSecondSchool && (schoolInfo.secondSchoolPhases || [])[0];
  const totalGrades = PHASE_CONFIG[activePhase]?.grades || 6;

  const schoolStudents = useMemo(() => {
    return students.filter(s => (s.schoolId || 'main') === activeSchoolId);
  }, [students, activeSchoolId]);

  const schoolClasses = useMemo(() => {
    return classes.filter(c =>
      c.phase === activePhase && (c.schoolId || 'main') === activeSchoolId
    ).sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.section - b.section;
    });
  }, [classes, activePhase, activeSchoolId]);

  const studentsWithMissingData = useMemo(() => {
    return schoolStudents.filter(s => !s.grade || !s.classId || !s.parentPhone);
  }, [schoolStudents]);

  const filteredStudents = useMemo(() => {
    let result = schoolStudents;

    if (searchText) {
      result = result.filter(s => s.name.includes(searchText));
    }
    if (filterGrades.length > 0) {
      result = result.filter(s => filterGrades.includes(s.grade));
    }
    if (filterClassIds.length > 0) {
      result = result.filter(s => filterClassIds.includes(s.classId));
    }

    return result.sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.name.localeCompare(b.name, 'ar');
    });
  }, [schoolStudents, searchText, filterGrades, filterClassIds]);

  const stats = useMemo(() => getStudentStats(schoolStudents, schoolClasses), [schoolStudents, schoolClasses]);

  const classesForGrade = useMemo(() => {
    return schoolClasses.filter(c => c.grade === addGrade);
  }, [schoolClasses, addGrade]);

  // Classes available in the filter dropdown (limited by selected grades)
  const classesForFilter = useMemo(() => {
    if (filterGrades.length > 0) return schoolClasses.filter(c => filterGrades.includes(c.grade));
    return schoolClasses;
  }, [schoolClasses, filterGrades]);

  const groupedByGrade = useMemo(() => {
    const groups = new Map<number, Student[]>();
    filteredStudents.forEach(s => {
      if (!groups.has(s.grade)) groups.set(s.grade, []);
      groups.get(s.grade)!.push(s);
    });
    return groups;
  }, [filteredStudents]);

  // ─── Toast Helper ───
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Action Dropdown Close on Click/Scroll ───
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

  // ─── Close filter dropdowns on outside click ───
  useEffect(() => {
    if (!gradeDropdownOpen && !classDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (gradeDropdownRef.current && !gradeDropdownRef.current.contains(e.target as Node)) {
        setGradeDropdownOpen(false);
      }
      if (classDropdownRef.current && !classDropdownRef.current.contains(e.target as Node)) {
        setClassDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [gradeDropdownOpen, classDropdownOpen]);

  // ─── Excel Import ───
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);

    // Simulate progress for UX
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const result = await parseStudentExcel(file, classes, activeSchoolId, activePhase);

      clearInterval(progressInterval);
      setImportProgress(100);

      // Add parsed students (merge with existing)
      setStudents(prev => {
        const otherSchool = prev.filter(s => (s.schoolId || 'main') !== activeSchoolId);
        return [...otherSchool, ...result.students];
      });

      setImportResult({
        matched: result.matched,
        unmatched: result.unmatched,
        total: result.students.length,
        errors: result.errors,
      });

      showToast(`تم تحميل ${result.students.length} طالب بنجاح`, 'success');

      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
      }, 1500);
    } catch (err) {
      clearInterval(progressInterval);
      setIsImporting(false);
      setImportProgress(0);
      showToast('حدث خطأ أثناء قراءة الملف', 'error');
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [classes, activeSchoolId, activePhase, setStudents, showToast]);

  // ─── Manual Add ───
  const handleAddStudent = useCallback(() => {
    if (!addName.trim()) return;

    const student: Student = {
      id: `student-${activeSchoolId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: addName.trim(),
      classId: addClassId || '',
      grade: addGrade,
      parentPhone: addPhone.trim() || undefined,
      schoolId: activeSchoolId,
    };

    setStudents(prev => [...prev, student]);
    setAddName('');
    setAddPhone('');
    setAddClassId('');
    showToast('تم إضافة الطالب بنجاح');
  }, [addName, addGrade, addClassId, addPhone, activeSchoolId, setStudents, showToast]);

  // ─── Edit ───
  const handleStartEdit = useCallback((s: Student) => {
    setEditingStudent(s.id);
    setEditName(s.name);
    setEditPhone(s.parentPhone || '');
    setEditClassId(s.classId);
  }, []);

  // Sync latest edit state into ref so handleSaveEdit stays stable
  useEffect(() => {
    editStateRef.current = { editName, editPhone, editClassId, editingStudent };
  }, [editName, editPhone, editClassId, editingStudent]);

  // Stable — no deps on edit fields (reads from ref at call time)
  const handleSaveEdit = useCallback(() => {
    const { editingStudent, editName, editPhone, editClassId } = editStateRef.current;
    if (!editingStudent) return;
    setStudents(prev => prev.map(s =>
      s.id === editingStudent ? {
        ...s,
        name: editName.trim() || s.name,
        parentPhone: editPhone.trim() || undefined,
        classId: editClassId,
      } : s
    ));
    setEditingStudent(null);
    showToast('تم تحديث البيانات');
  }, [setStudents, showToast]);

  const handleCancelEdit = useCallback(() => setEditingStudent(null), []);

  // ─── Delete ───
  const handleDeleteOne = useCallback((id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    setSelectedStudents(prev => { const ns = new Set(prev); ns.delete(id); return ns; });
  }, [setStudents]);

  // ─── Action Dropdown Helper ───
  const openActionDropdown = useCallback((e: React.MouseEvent, studentId: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dropdownWidth = 160;
    const margin = 8;
    // محاذاة القائمة لتبدأ من يمين الزر وتمتد يساراً، مع ضمان بقائها داخل الشاشة
    const left = Math.max(margin, Math.min(rect.right - dropdownWidth, window.innerWidth - dropdownWidth - margin));
    setActionDropdown({ studentId, top: rect.bottom + 4, left });
  }, []);

  const handleBulkDelete = useCallback(() => {
    const count = selectedStudents.size;
    setStudents(prev => prev.filter(s => !selectedStudents.has(s.id)));
    setSelectedStudents(new Set());
    setShowBulkDeleteConfirm(false);
    showToast(`تم حذف ${count} طالب`);
  }, [selectedStudents, setStudents, showToast]);

  const handleDeleteGradeOrClass = useCallback(() => {
    if (!gradeDeleteTarget) return;
    const { grade, classId } = gradeDeleteTarget;
    if (classId) {
      const count = schoolStudents.filter(s => s.classId === classId).length;
      setStudents(prev => prev.filter(s => !(s.classId === classId && (s.schoolId || 'main') === activeSchoolId)));
      showToast(`تم حذف ${count} طالب من الفصل`);
    } else {
      const count = schoolStudents.filter(s => s.grade === grade).length;
      setStudents(prev => prev.filter(s => !(s.grade === grade && (s.schoolId || 'main') === activeSchoolId)));
      showToast(`تم حذف ${count} طالب من الصف ${grade}`);
    }
    setSelectedStudents(prev => {
      const ns = new Set(prev);
      const toRemove = classId
        ? schoolStudents.filter(s => s.classId === classId).map(s => s.id)
        : schoolStudents.filter(s => s.grade === grade).map(s => s.id);
      toRemove.forEach(id => ns.delete(id));
      return ns;
    });
    setGradeDeleteTarget(null);
  }, [gradeDeleteTarget, schoolStudents, activeSchoolId, setStudents, showToast]);

  const handleDeleteAll = useCallback(() => {
    setStudents(prev => prev.filter(s => (s.schoolId || 'main') !== activeSchoolId));
    setSelectedStudents(new Set());
    setShowDeleteAllConfirm(false);
    showToast('تم حذف جميع الطلاب');
  }, [activeSchoolId, setStudents, showToast]);

  // ─── Selection ───
  const toggleSelect = useCallback((id: string) => {
    setSelectedStudents(prev => {
      const ns = new Set(prev);
      if (ns.has(id)) ns.delete(id); else ns.add(id);
      return ns;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const ids = filteredStudents.map(s => s.id);
    const allSelected = ids.every(id => selectedStudents.has(id));
    setSelectedStudents(prev => {
      const ns = new Set(prev);
      ids.forEach(id => { if (allSelected) ns.delete(id); else ns.add(id); });
      return ns;
    });
  }, [filteredStudents, selectedStudents]);

  // ─── Promotion Removed ───

  // ─── Print ───
  const handlePrint = useCallback((sortBy: 'grade' | 'class', specificClassId?: string) => {
    let listToPrint = schoolStudents;
    let title = '';

    if (specificClassId) {
      listToPrint = schoolStudents.filter(s => s.classId === specificClassId);
      title = `قائمة طلاب ${getClassName(specificClassId)}`;
    } else if (filterClassIds.length === 1) {
       listToPrint = filteredStudents;
       title = `قائمة طلاب ${getClassName(filterClassIds[0])}`;
    }

    printStudentList(listToPrint, schoolClasses, schoolInfo, sortBy, title);
    setShowPrintMenu(false);
  }, [schoolStudents, filteredStudents, schoolClasses, schoolInfo, filterClassIds]);

  // ─── O(1) class name lookup (Map instead of .find per render) ───
  const classNameMap = useMemo(() => {
    const m = new Map<string, string>();
    classes.forEach(c => m.set(c.id, c.name || `${c.grade}/${c.section}`));
    return m;
  }, [classes]);

  const getClassName = useCallback((classId: string) => {
    if (!classId) return 'غير محدد';
    return classNameMap.get(classId) || 'غير محدد';
  }, [classNameMap]);

  // Pre-computed classes per grade → passed to StudentRow for edit select
  const gradeClassesMap = useMemo(() => {
    const m = new Map<number, ClassInfo[]>();
    schoolClasses.forEach(c => {
      if (!m.has(c.grade)) m.set(c.grade, []);
      m.get(c.grade)!.push(c);
    });
    return m;
  }, [schoolClasses]);

  // ══════════════════════════════════════════════════════
  //   R E N D E R
  // ══════════════════════════════════════════════════════

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">

      {/* ══════ Toast Notification ══════ */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' :
          toast.type === 'error' ? 'bg-rose-500 text-white' :
          'bg-indigo-500 text-white'
        }`}>
          {toast.type === 'success' && <CheckCircle2 size={20} />}
          {toast.type === 'error' && <AlertTriangle size={20} />}
          {toast.type === 'info' && <ArrowUpCircle size={20} />}
          {toast.message}
        </div>
      )}

      {/* ══════ Header ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>
          
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <GraduationCap size={36} strokeWidth={1.8} className="text-[#655ac1]" />
             إدارة الطلاب
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">استيراد الطلاب أو إضافتهم يدويًا وإدارة بياناتهم.</p>
      </div>

       {/* ══════ School Tabs ══════ */}
       <div className="mb-6">
        <SchoolTabs
            schoolInfo={schoolInfo}
            activeSchoolId={activeSchoolId}
            onTabChange={(id) => {
            setActiveSchoolId(id);
            setSelectedStudents(new Set());
            }}
        />
      </div>

      {/* Phase Selector (if multi-phase) */}
      {(() => {
        const currentPhases = activeSchoolId === 'main' 
          ? schoolInfo.phases || [] 
          : (schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId)?.phases || []);
        
        if (currentPhases.length <= 1) return null;

        return (
          <div className="flex flex-wrap gap-2 mb-6 p-1 bg-white rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
            {currentPhases.map(p => (
              <button
                key={p}
                onClick={() => setActivePhase(p)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activePhase === p
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {p === Phase.OTHER && (activeSchoolId === 'main' ? schoolInfo.otherPhase : schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId)?.otherPhase) 
                  ? (activeSchoolId === 'main' ? schoolInfo.otherPhase : schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId)?.otherPhase) 
                  : p}
              </button>
            ))}
          </div>
        );
      })()}

      {/* ══════ Manual Bulk Entry Mode ══════ */}
      {isBulkEntryMode && (() => {
        const availableGrades = [...new Set(schoolClasses.map(c => c.grade))].sort((a, b) => a - b);
        const defaultGrade = availableGrades[0] ?? 1;
        return (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                      <Pencil size={20} className="text-[#655ac1]" /> إضافة الطلاب يدويًا
                  </h3>
                  <div className="flex items-center gap-2">
                      <button
                          onClick={() => {
                             const validStudents = bulkStudents.filter(s => s.name.trim().length > 0);
                             if (validStudents.length === 0) {
                                 showToast('لا يوجد طلاب للحفظ', 'error');
                                 return;
                             }
                             const newStudents: Student[] = validStudents.map(s => ({
                                 id: s.id,
                                 name: s.name,
                                 grade: s.grade,
                                 classId: s.classId,
                                 parentPhone: s.parentPhone || undefined,
                                 schoolId: activeSchoolId
                             }));
                             setStudents(prev => [...prev, ...newStudents]);
                             setIsBulkEntryMode(false);
                             setBulkStudents([]);
                             showToast(`تم إضافة ${newStudents.length} طالب بنجاح`, 'success');
                          }}
                          className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
                      >
                          <CheckCircle2 size={16} className="inline ml-2" /> حفظ الطلاب ({bulkStudents.filter(s => s.name.trim()).length})
                      </button>
                      <button
                          onClick={() => setIsBulkEntryMode(false)}
                          className="px-6 py-2 bg-white text-slate-500 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                      >
                          إلغاء
                      </button>
                  </div>
              </div>

               {/* Batch Assignment Controls */}
               <div className="p-4 bg-[#f5f3ff] border-b border-[#e5e1fe] flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                      <div className="w-7 h-7 bg-[#655ac1] rounded-lg flex items-center justify-center">
                          <Users size={14} className="text-white" />
                      </div>
                      <span className="text-sm font-black text-[#655ac1]">تعيين الصف والفصل لجميع الطلاب دفعة واحدة</span>
                  </div>
                  <div className="w-px h-6 bg-[#e5e1fe]"></div>
                  <select
                      className="px-4 py-2 bg-white border border-[#e5e1fe] rounded-xl text-sm font-bold text-slate-600 focus:border-[#655ac1] outline-none shadow-sm"
                      defaultValue=""
                      onChange={(e) => {
                          if (e.target.value) {
                              const grade = parseInt(e.target.value);
                              setBulkStudents(prev => prev.map(s => ({ ...s, grade, classId: '' })));
                          }
                      }}
                  >
                      <option value="">اختر الصف للجميع...</option>
                      {availableGrades.map(g => (
                          <option key={g} value={g}>الصف {g}</option>
                      ))}
                  </select>

                  <select
                       className="px-4 py-2 bg-white border border-[#e5e1fe] rounded-xl text-sm font-bold text-slate-600 focus:border-[#655ac1] outline-none shadow-sm"
                       defaultValue=""
                       onChange={(e) => {
                          if (e.target.value) {
                              const classId = e.target.value;
                              const cls = schoolClasses.find(c => c.id === classId);
                              if (cls) {
                                  setBulkStudents(prev => prev.map(s => ({ ...s, classId, grade: cls.grade })));
                              }
                          }
                       }}
                  >
                      <option value="">اختر الفصل للجميع...</option>
                      {availableGrades.map(g => {
                          const gradeClasses = schoolClasses.filter(c => c.grade === g);
                          if (gradeClasses.length === 0) return null;
                          return (
                              <optgroup key={g} label={`الصف ${g}`}>
                                  {gradeClasses.map(c => (
                                      <option key={c.id} value={c.id}>{c.name || `${c.grade}/${c.section}`}</option>
                                  ))}
                              </optgroup>
                          );
                      })}
                  </select>
               </div>

              <div className="p-0 custom-scrollbar">
                  <table className="w-full">
                      <thead className="sticky top-0 z-10 bg-white shadow-sm">
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                              <th className="p-4 text-center w-16">#</th>
                              <th className="p-4 text-right min-w-[200px]">اسم الطالب <span className="text-rose-500">*</span></th>
                              <th className="p-4 text-center w-40">الصف <span className="text-rose-500">*</span></th>
                              <th className="p-4 text-center w-48">الفصل</th>
                              <th className="p-4 text-center w-48">رقم ولي الأمر</th>
                              <th className="p-4 text-center w-16"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {bulkStudents.map((student, index) => (
                              <tr key={student.id} className="group hover:bg-indigo-50/10 transition-colors">
                                  <td className="p-3 text-center text-slate-400 font-bold text-xs">{index + 1}</td>
                                  <td className="p-3">
                                      <input
                                          type="text"
                                          placeholder="اسم الطالب رباعي"
                                          value={student.name}
                                          onChange={(e) => {
                                              const updated = bulkStudents.map((s, i) => i === index ? { ...s, name: e.target.value } : s);
                                              setBulkStudents(updated);
                                          }}
                                          className={`w-full p-3 bg-slate-50 border-2 rounded-xl outline-none text-sm font-bold transition-all focus:bg-white ${
                                              student.name.trim() ? 'border-transparent focus:border-[#655ac1]' : 'border-slate-200 focus:border-rose-400'
                                          }`}
                                      />
                                  </td>
                                  <td className="p-3">
                                      <select
                                          value={student.grade}
                                          onChange={(e) => {
                                              const grade = parseInt(e.target.value);
                                              const updated = bulkStudents.map((s, i) => i === index ? { ...s, grade, classId: '' } : s);
                                              setBulkStudents(updated);
                                          }}
                                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-600 focus:border-[#655ac1]"
                                      >
                                          {availableGrades.length > 0 ? availableGrades.map(g => (
                                              <option key={g} value={g}>الصف {g}</option>
                                          )) : (
                                              <option value="1">الصف 1</option>
                                          )}
                                      </select>
                                  </td>
                                  <td className="p-3">
                                      <select
                                          value={student.classId}
                                          onChange={(e) => {
                                              const updated = bulkStudents.map((s, i) => i === index ? { ...s, classId: e.target.value } : s);
                                              setBulkStudents(updated);
                                          }}
                                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-600 focus:border-[#655ac1]"
                                      >
                                          <option value="">اختر الفصل</option>
                                          {schoolClasses.filter(c => c.grade === student.grade).map(c => (
                                              <option key={c.id} value={c.id}>{c.name || `${c.grade}/${c.section}`}</option>
                                          ))}
                                      </select>
                                  </td>
                                  <td className="p-3">
                                      <input
                                          type="tel"
                                          dir="ltr"
                                          placeholder="05xxxxxxxx"
                                          value={student.parentPhone}
                                          onChange={(e) => {
                                              const updated = bulkStudents.map((s, i) => i === index ? { ...s, parentPhone: e.target.value } : s);
                                              setBulkStudents(updated);
                                          }}
                                          className="w-full p-3 bg-slate-50 border border-transparent rounded-xl outline-none text-sm font-bold text-center group-hover:bg-white group-hover:border-slate-200 focus:!border-[#655ac1] focus:!bg-white transition-all"
                                      />
                                  </td>
                                   <td className="p-3 text-center">
                                      <button
                                          onClick={() => setBulkStudents(prev => prev.filter((_, i) => i !== index))}
                                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                      >
                                          <X size={16} />
                                      </button>
                                   </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>

                  {/* Add Row Button */}
                   <div className="p-4 border-t border-slate-100 bg-slate-50/30 text-center">
                      <button
                          onClick={() => {
                               const lastRow = bulkStudents[bulkStudents.length - 1];
                               setBulkStudents(prev => [...prev, {
                                  id: `student-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                  name: '',
                                  grade: lastRow ? lastRow.grade : defaultGrade,
                                  classId: lastRow ? lastRow.classId : '',
                                  parentPhone: ''
                               }]);
                          }}
                          className="px-4 py-2 bg-white border border-dashed border-slate-300 rounded-xl text-slate-500 text-xs font-bold hover:border-[#655ac1] hover:text-[#655ac1] transition-all"
                      >
                          + إضافة سطر جديد
                      </button>
                   </div>
              </div>
          </div>
        );
      })()}

      {/* ══════ Action Bar + Content ══════ */}
      {!isBulkEntryMode && (
        <>
            {/* ══════ Action Bar ══════ */}
            <div className="flex flex-wrap items-center gap-3 mb-6 bg-white/60 backdrop-blur-md rounded-2xl py-3.5 px-4 shadow-sm border border-slate-200">
                {/* Import Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#655ac1] text-white rounded-xl font-bold shadow-md shadow-[#655ac1]/20 hover:bg-[#5448a8] transition-all hover:scale-105 active:scale-95"
                >
                    <Upload size={18} />
                    استيراد من Excel
                </button>

                {/* Add Student Button */}
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:border-[#8779fb] hover:text-[#655ac1] transition-all hover:scale-105 active:scale-95"
                >
                    <Plus size={18} className="text-[#8779fb]" />
                    إضافة طالب
                </button>

                {/* Add Multiple Students Button */}
                <button
                    onClick={() => setShowBulkCountModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:border-[#9d8fe8] hover:text-[#655ac1] transition-all hover:scale-105 active:scale-95"
                >
                    <Users size={18} className="text-[#9d8fe8]" />
                    إضافة عدة طلاب
                </button>

                <div className="flex-1"></div>

                {/* Print Button */}
                <button
                    onClick={() => { setPrintSelection({ type: 'all', gradeValue: '', classId: '' }); setShowPrintModal(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:border-[#655ac1] transition-all hover:scale-105 active:scale-95"
                >
                    <Printer size={18} className="text-[#655ac1]" />
                    طباعة
                </button>

                {/* Delete All Button */}
                <button
                    onClick={() => setShowDeleteAllConfirm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-rose-500 border border-slate-200 rounded-xl font-bold hover:border-[#655ac1] transition-all hover:scale-105 active:scale-95"
                >
                    <Trash2 size={18} className="text-rose-500" />
                    حذف الكل
                </button>
            </div>



            {/* ══════ Stats Cards (Drill-Down) ══════ */}

          {/* ══════ Empty State ══════ */}
          {schoolStudents.length === 0 && !isImporting && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <GraduationCap size={48} className="mx-auto mb-5" style={{ color: '#8779fb' }} strokeWidth={1.6} />
              <p className="text-slate-600 font-black text-lg mb-1">لا يوجد طلاب بعد</p>
              <p className="text-slate-400 text-sm">استخدم زر <span className="font-bold" style={{ color: '#655ac1' }}>استيراد من Excel</span> أو <span className="font-bold" style={{ color: '#655ac1' }}>إضافة عدة طلاب</span> للبدء</p>
            </div>
          )}

          {/* ══════ Import Loading Overlay ══════ */}
          {isImporting && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-in fade-in duration-300">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <div className="absolute inset-3 bg-primary/10 rounded-full flex items-center justify-center">
                  <FileSpreadsheet size={24} className="text-primary" />
                </div>
              </div>
              <div className="text-center">
                <h4 className="font-black text-slate-700 mb-1">جاري تحميل البيانات...</h4>
                <p className="text-sm text-slate-400">يتم قراءة ملف Excel ومطابقة الطلاب بالفصول</p>
              </div>
              <div className="w-full max-w-md">
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-primary to-indigo-400 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(importProgress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-center text-slate-400 mt-2 font-bold">{Math.round(importProgress)}%</p>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Hidden Input for Header Button */}
      {!isImporting && (
         <input
         ref={fileInputRef}
         type="file"
         accept=".xlsx,.xls,.csv"
         onChange={handleFileSelect}
         className="hidden"
       />
      )}

      {/* ─── Import Results Toast/Dialog ─── */}
      {importResult && !isImporting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                      <CheckCircle2 size={24} className="text-emerald-500" /> نتائج الاستيراد
                    </h3>
                    <button onClick={() => setImportResult(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                      <X size={20} />
                    </button>
               </div>
               
               <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-2xl font-black text-primary">{importResult.total}</div>
                      <div className="text-xs text-slate-400 font-bold mt-1">إجمالي الطلاب</div>
                    </div>
                    <div className="text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <div className="text-2xl font-black text-emerald-500">{importResult.matched}</div>
                      <div className="text-xs text-emerald-600/70 font-bold mt-1">تمت المطابقة</div>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <div className="text-2xl font-black text-amber-500">{importResult.unmatched}</div>
                      <div className="text-xs text-amber-600/70 font-bold mt-1">بيانات ناقصة</div>
                    </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-4 max-h-40 overflow-y-auto custom-scrollbar border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                      <AlertTriangle size={12} /> تنبيهات ({importResult.errors.length})
                    </h4>
                    <div className="space-y-1">
                      {importResult.errors.map((err, i) => (
                         <div key={i} className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-100/50">{err}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end">
                  <button onClick={() => setImportResult(null)} className="px-6 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-all">
                    إغلاق
                  </button>
                </div>
             </div>
          </div>
      )}

      {/* ══════ Manual Add Modal (Replaces Card) ══════ */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
           <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                 <UserPlus size={24} className="text-[#655ac1]" /> إضافة طالب جديد
               </h3>
               <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                 <X size={20} />
               </button>
             </div>
             
             <div className="p-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">اسم الطالب *</label>
                      <input
                        type="text"
                        placeholder="أدخل اسم الطالب رباعياً"
                        value={addName}
                        onChange={e => setAddName(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        autoFocus
                      />
                    </div>
                     <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">رقم ولي الأمر</label>
                      <input
                        type="tel"
                        placeholder="05xxxxxxxx"
                        value={addPhone}
                        onChange={e => setAddPhone(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">الصف الدراسي *</label>
                      <select
                        value={addGrade}
                        onChange={e => { setAddGrade(parseInt(e.target.value)); setAddClassId(''); }}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-primary transition-all"
                      >
                        {Array.from({ length: totalGrades }, (_, i) => (
                          <option key={i + 1} value={i + 1}>الصف {i + 1}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">الفصل</label>
                      <select
                        value={addClassId}
                        onChange={e => setAddClassId(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-primary transition-all"
                      >
                        <option value="">اختر الفصل</option>
                        {classesForGrade.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name || `${c.grade}/${c.section}`}
                          </option>
                        ))}
                      </select>
                    </div>
                 </div>
                 
                 <div className="mt-8 flex gap-3">
                    <button
                      onClick={() => { handleAddStudent(); setShowAddForm(false); }}
                      disabled={!addName.trim()}
                      className="flex-1 py-4 bg-[#655ac1] text-white font-black text-sm rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} /> حفظ
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 py-4 bg-white text-slate-400 border border-slate-200 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all"
                    >
                      إلغاء
                    </button>
                 </div>
             </div>
           </div>
        </div>
      )}

      {/* ══════ Bulk Count Modal ══════ */}
      {showBulkCountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <Users size={20} className="text-[#9d8fe8]" /> إضافة عدة طلاب
              </h3>
              <button onClick={() => setShowBulkCountModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 font-medium mb-5">حدد عدد الطلاب المتوقع إضافتهم وسيتم إنشاء جدول لتعبئة بياناتهم.</p>
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-6">
                <span className="text-sm font-bold text-slate-500 shrink-0">عدد الطلاب:</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={bulkCount}
                  onChange={(e) => setBulkCount(parseInt(e.target.value) || 0)}
                  className="flex-1 p-2 bg-white border border-slate-200 rounded-xl font-bold text-center outline-none focus:border-[#9d8fe8] text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (bulkCount > 0) {
                      const availableGrades = [...new Set(schoolClasses.map(c => c.grade))].sort((a, b) => a - b);
                      const defaultGrade = availableGrades[0] ?? 1;
                      const newRows = Array.from({ length: bulkCount }, (_, i) => ({
                        id: `student-bulk-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
                        name: '',
                        grade: defaultGrade,
                        classId: '',
                        parentPhone: ''
                      }));
                      setBulkStudents(newRows);
                      setShowBulkCountModal(false);
                      setIsBulkEntryMode(true);
                    }
                  }}
                  disabled={!bulkCount || bulkCount < 1}
                  className="flex-1 py-3 bg-[#9d8fe8] text-white rounded-xl text-sm font-bold hover:bg-[#8779d0] transition-all shadow-md shadow-[#9d8fe8]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> إنشاء الجدول
                </button>
                <button
                  onClick={() => setShowBulkCountModal(false)}
                  className="flex-1 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Student List ══════ */}
      {schoolStudents.length > 0 && (
        <div className="space-y-4">

          {/* Combined Search, Filter & Stats Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col-reverse lg:flex-row items-center gap-4 justify-between">
            
            {/* Stats Indicators (Left Side in RTL, so put at End of Flex Row or Start?) 
                RTL: Flex Start is Right. Flex End is Left.
                The user wants Stats on the LEFT.
                So Stats should be at the END of the flex container (if flex-row).
                
                Current Order in Code: Search -> Filter -> Stats
                In RTL Display: Search (Right) -> Filter (Center) -> Stats (Left)
                
                Wait, if it's RTL:
                First Element (Search) -> Right
                Last Element (Stats) -> Left
                
                So the current order IS correct for "Stats on Left".
                The User says "Shift it to the left of the bar".
                It IS on the left.
                Maybe they mean "Far Left" and it wasn't going all the way?
                
                Let's use `flex-1` on the Search bar to push everything else.
                The current Search input has `w-full`.
                
                Let's Force the order explicitely just to be safe and use `flex-grow` on search.
            */}

            {/* Right Side: Search & Filter */}
            <div className="flex flex-col lg:flex-row items-center gap-4 flex-1 w-full">
                {/* Search Input (Expands) */}
                <div className="relative flex-[2] w-full">
                <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="بحث عن طالب..."
                    value={searchText}
                    onChange={e => { const v = e.target.value; startTransition(() => setSearchText(v)); }}
                    className="w-full pr-12 pl-4 py-3 bg-slate-50 border-0 rounded-xl outline-none text-sm font-bold focus:ring-2 focus:ring-[#8779fb]/20 transition-all text-slate-600 placeholder:text-slate-400"
                />
                {searchText && (
                    <button onClick={() => setSearchText('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                    <X size={16} />
                    </button>
                )}
                </div>

                {/* Split Filter (Grade -> Class) — Multi-select dropdowns */}
                <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">

                    {/* Grade multi-select */}
                    <div className="relative" ref={gradeDropdownRef}>
                        <button
                            onClick={() => { setGradeDropdownOpen(prev => !prev); setClassDropdownOpen(false); }}
                            className={`flex items-center gap-2 px-4 py-3 border-2 rounded-xl text-sm font-bold transition-all duration-100 min-w-[140px] ${
                                filterGrades.length > 0
                                    ? 'border-[#655ac1] bg-[#f5f3ff] text-[#655ac1]'
                                    : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                        >
                            <span className="flex-1 text-right">
                                {filterGrades.length === 0 ? 'جميع الصفوف' :
                                 filterGrades.length === 1 ? `الصف ${filterGrades[0]}` :
                                 `${filterGrades.length} صفوف`}
                            </span>
                            {filterGrades.length > 0 && (
                                <div className="w-4 h-4 bg-[#655ac1] rounded-full flex items-center justify-center shrink-0">
                                    <Check size={9} className="text-white" strokeWidth={3} />
                                </div>
                            )}
                            <ChevronDown size={13} className={`shrink-0 transition-transform duration-100 ${gradeDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {gradeDropdownOpen && (
                            <div className="absolute top-full mt-1.5 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[200] min-w-[160px] py-1.5 animate-in fade-in zoom-in-95 duration-100">
                                {/* All grades */}
                                <button
                                    onClick={() => setFilterGrades([])}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-colors text-right ${
                                        filterGrades.length === 0 ? 'text-[#655ac1] bg-[#f5f3ff]' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                                        filterGrades.length === 0 ? 'bg-[#655ac1] border-[#655ac1]' : 'border-slate-300'
                                    }`}>
                                        {filterGrades.length === 0 && <Check size={11} className="text-white" />}
                                    </div>
                                    جميع الصفوف
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                {Array.from({ length: totalGrades }, (_, i) => i + 1).map(grade => {
                                    const isSel = filterGrades.includes(grade);
                                    return (
                                        <button
                                            key={grade}
                                            onClick={() => setFilterGrades(prev => isSel ? prev.filter(g => g !== grade) : [...prev, grade])}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-colors text-right ${
                                                isSel ? 'text-[#655ac1] bg-[#f5f3ff]' : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                                                isSel ? 'bg-[#655ac1] border-[#655ac1]' : 'border-slate-300'
                                            }`}>
                                                {isSel && <Check size={11} className="text-white" />}
                                            </div>
                                            الصف {grade}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Class multi-select */}
                    <div className="relative" ref={classDropdownRef}>
                        <button
                            onClick={() => { setClassDropdownOpen(prev => !prev); setGradeDropdownOpen(false); }}
                            className={`flex items-center gap-2 px-4 py-3 border-2 rounded-xl text-sm font-bold transition-all duration-100 min-w-[150px] ${
                                filterClassIds.length > 0
                                    ? 'border-[#655ac1] bg-[#f5f3ff] text-[#655ac1]'
                                    : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                        >
                            <span className="flex-1 text-right">
                                {filterClassIds.length === 0 ? 'جميع الفصول' :
                                 filterClassIds.length === 1 ? getClassName(filterClassIds[0]) :
                                 `${filterClassIds.length} فصول`}
                            </span>
                            {filterClassIds.length > 0 && (
                                <div className="w-4 h-4 bg-[#655ac1] rounded-full flex items-center justify-center shrink-0">
                                    <Check size={9} className="text-white" strokeWidth={3} />
                                </div>
                            )}
                            <ChevronDown size={13} className={`shrink-0 transition-transform duration-100 ${classDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {classDropdownOpen && (
                            <div className="absolute top-full mt-1.5 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[200] min-w-[180px] py-1.5 max-h-72 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                                {/* All classes */}
                                <button
                                    onClick={() => setFilterClassIds([])}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-colors text-right ${
                                        filterClassIds.length === 0 ? 'text-[#655ac1] bg-[#f5f3ff]' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                                        filterClassIds.length === 0 ? 'bg-[#655ac1] border-[#655ac1]' : 'border-slate-300'
                                    }`}>
                                        {filterClassIds.length === 0 && <Check size={11} className="text-white" />}
                                    </div>
                                    جميع الفصول
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                {/* Grouped by grade */}
                                {Array.from({ length: totalGrades }, (_, i) => i + 1).map(grade => {
                                    const gradeClsItems = classesForFilter.filter(c => c.grade === grade);
                                    if (gradeClsItems.length === 0) return null;
                                    if (filterGrades.length > 0 && !filterGrades.includes(grade)) return null;
                                    return (
                                        <React.Fragment key={grade}>
                                            <div className="px-4 py-1 text-[11px] font-black text-slate-400 bg-slate-50/70 uppercase tracking-wide">
                                                الصف {grade}
                                            </div>
                                            {gradeClsItems.map(cls => {
                                                const isSel = filterClassIds.includes(cls.id);
                                                return (
                                                    <button
                                                        key={cls.id}
                                                        onClick={() => setFilterClassIds(prev => isSel ? prev.filter(id => id !== cls.id) : [...prev, cls.id])}
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-colors text-right ${
                                                            isSel ? 'text-[#655ac1] bg-[#f5f3ff]' : 'text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                                                            isSel ? 'bg-[#655ac1] border-[#655ac1]' : 'border-slate-300'
                                                        }`}>
                                                            {isSel && <Check size={11} className="text-white" />}
                                                        </div>
                                                        {cls.name || `${cls.grade}/${cls.section}`}
                                                    </button>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {(filterGrades.length > 0 || filterClassIds.length > 0) && (
                        <button
                            onClick={() => { setFilterGrades([]); setFilterClassIds([]); }}
                            className="p-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-500 rounded-xl text-slate-400 transition-all duration-100"
                            title="مسح التصفية"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>
            </div>

            <div className="w-px h-8 bg-slate-200 hidden lg:block mx-2"></div>

            {/* Left Side: Stats (Fixed Width) */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end shrink-0">
               {/* Total Count */}
               <div className="flex items-center gap-4 px-6 py-3 bg-white rounded-2xl border-2 border-[#655ac1]/20 cursor-default hover:border-[#655ac1]/40 transition-all">
                  <div className="p-2 bg-slate-100 rounded-xl">
                    <GraduationCap size={22} className="text-[#655ac1]" />
                  </div>
                  <div className="flex flex-col justify-center">
                      <span className="text-xs font-bold text-slate-400 leading-tight">إجمالي الطلاب</span>
                      <span className="text-2xl font-black text-[#655ac1] leading-none mt-0.5">{schoolStudents.length}</span>
                  </div>
               </div>

               {/* Missing Data Warning */}
               <div
                  onClick={() => { if (studentsWithMissingData.length > 0) setShowMissingDataModal(true); }}
                  className={`flex items-center gap-4 px-6 py-3 rounded-2xl transition-all border-2 ${
                      studentsWithMissingData.length === 0
                        ? 'cursor-default border-slate-100 opacity-60'
                        : 'cursor-pointer bg-white border-amber-200 hover:border-amber-400 hover:bg-amber-50/50'
                  }`}
               >
                  <div className={`p-2 bg-amber-50 rounded-xl ${studentsWithMissingData.length > 0 ? 'animate-pulse' : ''}`}>
                    <AlertTriangle size={22} className="text-amber-500" />
                  </div>
                  <div className="flex flex-col justify-center">
                      <span className="text-xs font-bold text-amber-600/80 leading-tight">بيانات ناقصة</span>
                      <span className="text-2xl font-black text-amber-700 leading-none mt-0.5">{studentsWithMissingData.length}</span>
                  </div>
               </div>
            </div>

          </div>

          {/* Selection Actions */}
           {selectedStudents.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-[#e5e1fe]/50 border border-[#e5e1fe] rounded-2xl animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#655ac1] bg-[#e5e1fe] px-3 py-1.5 rounded-xl">
                        {selectedStudents.size} محدد
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      من إجمالي {filteredStudents.length} طالب
                    </span>
                </div>
                <button
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="flex items-center gap-1 px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all"
                >
                    <Trash size={14} /> حذف المحدد
                </button>
            </div>
           )}

          {/* Bulk Delete Confirmation Modal */}
          {showBulkDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                    <Trash2 size={20} className="text-rose-500" /> حذف الطلاب المحددين
                  </h3>
                  <button onClick={() => setShowBulkDeleteConfirm(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex flex-col items-center text-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center">
                      <AlertTriangle size={32} className="text-rose-500" />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 mb-2">هل أنت متأكد من الحذف؟</p>
                      <p className="text-sm text-slate-500 font-medium">
                        سيتم حذف <span className="font-black text-rose-500">{selectedStudents.size}</span> طالب محدد بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleBulkDelete}
                      className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} /> نعم، احذف المحدد
                    </button>
                    <button
                      onClick={() => setShowBulkDeleteConfirm(false)}
                      className="flex-1 px-4 py-3 bg-white text-slate-600 border border-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete All Confirmation Modal */}
          {showDeleteAllConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                    <Trash2 size={20} className="text-rose-500" /> تأكيد الحذف
                  </h3>
                  <button onClick={() => setShowDeleteAllConfirm(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex flex-col items-center text-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center">
                      <AlertTriangle size={32} className="text-rose-500" />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 mb-2">هل أنت متأكد من حذف جميع الطلاب؟</p>
                      <p className="text-sm text-slate-500 font-medium">
                        سيتم حذف <span className="font-black text-rose-500">{schoolStudents.length}</span> طالب بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteAll}
                      className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} /> نعم، احذف الكل
                    </button>
                    <button
                      onClick={() => setShowDeleteAllConfirm(false)}
                      className="flex-1 px-4 py-3 bg-white text-slate-600 border border-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Student Table — Grouped by Grade (matches teachers design) */}
          <div className="space-y-6">
            {filteredStudents.length === 0 && schoolStudents.length > 0 ? (
              <div className="p-10 text-center text-slate-400 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                <Search size={40} className="mx-auto mb-3 text-slate-200" />
                <p className="font-bold text-sm">لا توجد نتائج مطابقة</p>
                <p className="text-xs mt-1">جرب تعديل كلمات البحث أو الفلاتر</p>
              </div>
            ) : (
              Array.from(groupedByGrade.entries()).map(([grade, gradeStudents]) => {
                const activeClassId = gradeClassFilters[grade] || '';
                const displayStudents = activeClassId
                  ? gradeStudents.filter(s => s.classId === activeClassId)
                  : gradeStudents;
                const gradeClasses = schoolClasses.filter(c => c.grade === grade);

                return (
                <div key={grade} className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-[#655ac1]/5 overflow-hidden">

                  {/* Grade Section Header */}
                  <div className="px-6 pt-4 pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white">

                    {/* Row 1: Title + select-all */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-[#655ac1] rounded-full" />
                        <h4 className="font-black text-slate-800 text-lg">
                          الصف {grade}
                        </h4>
                        <span className="px-2.5 py-0.5 bg-slate-100 text-[#655ac1] rounded-full text-sm font-black">
                          {displayStudents.length}
                          {activeClassId && gradeStudents.length !== displayStudents.length && (
                            <span className="text-slate-400 font-bold"> / {gradeStudents.length}</span>
                          )}
                        </span>
                      </div>
                      {/* Actions: Delete grade/class + select-all */}
                      <div className="flex items-center gap-2">
                        {/* Delete grade or active class button */}
                        <button
                          onClick={() => {
                            if (activeClassId) {
                              const cls = gradeClasses.find(c => c.id === activeClassId);
                              setGradeDeleteTarget({ grade, classId: activeClassId, className: cls?.name || `${grade}/${cls?.section}` });
                            } else {
                              setGradeDeleteTarget({ grade });
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 border border-rose-100 bg-rose-50/50 hover:bg-rose-50 hover:border-rose-300 transition-all duration-100"
                          title={activeClassId ? 'حذف طلاب هذا الفصل' : `حذف طلاب الصف ${grade}`}
                        >
                          <Trash2 size={13} />
                          {activeClassId
                            ? `حذف طلاب الفصل`
                            : `حذف طلاب الصف ${grade}`
                          }
                        </button>

                        {/* Select all visible in grade */}
                        <div
                          onClick={() => {
                            const ids = displayStudents.map(s => s.id);
                            const allSelected = ids.length > 0 && ids.every(id => selectedStudents.has(id));
                            setSelectedStudents(prev => {
                              const ns = new Set(prev);
                              ids.forEach(id => { if (allSelected) ns.delete(id); else ns.add(id); });
                              return ns;
                            });
                          }}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                            displayStudents.length > 0 && displayStudents.every(s => selectedStudents.has(s.id))
                              ? 'bg-[#655ac1] border-[#655ac1]'
                              : 'border-slate-300 hover:border-[#655ac1]'
                          }`}
                          title="تحديد الكل في هذا الصف"
                        >
                          {displayStudents.length > 0 && displayStudents.every(s => selectedStudents.has(s.id)) && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Class chips */}
                    {gradeClasses.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        {/* "الكل" chip */}
                        <button
                          onClick={() => setGradeClassFilters(prev => ({ ...prev, [grade]: '' }))}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors duration-100 border ${
                            !activeClassId
                              ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-md shadow-[#655ac1]/20'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-[#655ac1]/50 hover:text-[#655ac1]'
                          }`}
                        >
                          الكل
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${!activeClassId ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {gradeStudents.length}
                          </span>
                        </button>

                        {/* Class chips */}
                        {gradeClasses.map(cls => {
                          const clsCount = gradeStudents.filter(s => s.classId === cls.id).length;
                          const isActive = activeClassId === cls.id;
                          return (
                            <button
                              key={cls.id}
                              onClick={() => setGradeClassFilters(prev => ({
                                ...prev,
                                [grade]: isActive ? '' : cls.id
                              }))}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors duration-100 border ${
                                isActive
                                  ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-md shadow-[#655ac1]/20'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#8779fb] hover:text-[#655ac1] hover:bg-[#f5f3ff]'
                              }`}
                            >
                              {cls.name || `${cls.grade}/${cls.section}`}
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {clsCount}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="bg-white border-b border-slate-100">
                          <th className="p-4 w-12 text-center text-sm font-black text-[#655ac1]">م</th>
                          <th className="p-4 text-sm font-black text-[#655ac1]">اسم الطالب</th>
                          <th className="p-4 text-center w-32 text-sm font-black text-[#655ac1]">الفصل</th>
                          <th className="p-4 text-center w-40 text-sm font-black text-[#655ac1]">رقم ولي الأمر</th>
                          <th className="p-4 w-20 text-center text-sm font-black text-[#655ac1]">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {displayStudents.map((student, idx) => (
                          <StudentRow
                            key={student.id}
                            student={student}
                            idx={idx}
                            isSelected={selectedStudents.has(student.id)}
                            isEditing={editingStudent === student.id}
                            editName={editingStudent === student.id ? editName : ''}
                            editPhone={editingStudent === student.id ? editPhone : ''}
                            editClassId={editingStudent === student.id ? editClassId : ''}
                            gradeClasses={gradeClassesMap.get(student.grade) ?? []}
                            getClassName={getClassName}
                            onToggleSelect={toggleSelect}
                            onSetEditName={setEditName}
                            onSetEditPhone={setEditPhone}
                            onSetEditClassId={setEditClassId}
                            onSaveEdit={handleSaveEdit}
                            onCancelEdit={handleCancelEdit}
                            onOpenDropdown={openActionDropdown}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
              })
            )}
          </div>
        </div>
      )}

      {/* ══════ Empty State ══════ */}
      {schoolStudents.length === 0 && !isImporting && !isBulkEntryMode && (
         <div className="text-center p-6 text-slate-400">
             {/* Additional context if needed, but the cards above cover the actions */}
         </div>
      )}

      {/* ══════ Print Options Modal ══════ */}
      {showPrintModal && (() => {
        // Compute the count of students that will be printed based on current selection
        const printCount = printSelection.type === 'all'
          ? schoolStudents.length
          : printSelection.type === 'grade' && printSelection.gradeValue !== ''
            ? schoolStudents.filter(s => s.grade === printSelection.gradeValue).length
            : printSelection.type === 'class' && printSelection.classId
              ? schoolStudents.filter(s => s.classId === printSelection.classId).length
              : null;

        const canPrint =
          printSelection.type === 'all' ||
          (printSelection.type === 'grade' && printSelection.gradeValue !== '') ||
          (printSelection.type === 'class' && printSelection.classId !== '');

        const handleConfirmPrint = () => {
          if (!canPrint) return;
          if (printSelection.type === 'all') {
            handlePrint('grade');
          } else if (printSelection.type === 'grade' && printSelection.gradeValue !== '') {
            const gradeStudents = schoolStudents.filter(s => s.grade === printSelection.gradeValue);
            printStudentList(gradeStudents, schoolClasses, schoolInfo, 'class', `قائمة طلاب الصف ${printSelection.gradeValue}`);
          } else if (printSelection.type === 'class' && printSelection.classId) {
            handlePrint('class', printSelection.classId);
          }
          setShowPrintModal(false);
        };

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl">
                    <Printer size={22} className="text-[#655ac1]" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800">خيارات الطباعة</h3>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">اختر نطاق الطباعة ثم أكد</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Radio cards */}
              <div className="p-6 space-y-3">
                {/* Card: All */}
                <button
                  onClick={() => setPrintSelection({ type: 'all', gradeValue: '', classId: '' })}
                  className={`w-full p-4 border rounded-2xl transition-all flex items-center gap-4 text-right ${
                    printSelection.type === 'all'
                      ? 'border-[#655ac1] bg-[#f5f3ff]'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border shrink-0 transition-all ${
                    printSelection.type === 'all'
                      ? 'bg-[#655ac1] border-[#655ac1]'
                      : 'bg-white border-slate-200'
                  }`}>
                    <GraduationCap size={20} className={printSelection.type === 'all' ? 'text-white' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1">
                    <div className={`font-black text-sm ${printSelection.type === 'all' ? 'text-[#655ac1]' : 'text-slate-700'}`}>جميع الطلاب</div>
                    <div className="text-xs text-slate-400 font-bold mt-0.5">طباعة كل الطلاب مرتبين حسب الصفوف والفصول</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                    printSelection.type === 'all' ? 'border-[#655ac1] bg-[#655ac1]' : 'border-slate-300'
                  }`}>
                    {printSelection.type === 'all' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>

                {/* Card: By Grade */}
                <button
                  onClick={() => setPrintSelection(prev => ({ ...prev, type: 'grade', classId: '' }))}
                  className={`w-full p-4 border rounded-2xl transition-all flex items-center gap-4 text-right ${
                    printSelection.type === 'grade'
                      ? 'border-[#655ac1] bg-[#f5f3ff]'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border shrink-0 transition-all ${
                    printSelection.type === 'grade'
                      ? 'bg-[#655ac1] border-[#655ac1]'
                      : 'bg-white border-slate-200'
                  }`}>
                    <BookOpen size={20} className={printSelection.type === 'grade' ? 'text-white' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1">
                    <div className={`font-black text-sm ${printSelection.type === 'grade' ? 'text-[#655ac1]' : 'text-slate-700'}`}>حسب الصف</div>
                    <div className="text-xs text-slate-400 font-bold mt-0.5">طباعة طلاب صف دراسي محدد</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                    printSelection.type === 'grade' ? 'border-[#655ac1] bg-[#655ac1]' : 'border-slate-300'
                  }`}>
                    {printSelection.type === 'grade' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>

                {/* Grade dropdown (shown when grade selected) */}
                {printSelection.type === 'grade' && (
                  <div className="mr-14">
                    <select
                      value={printSelection.gradeValue}
                      onChange={(e) => setPrintSelection(prev => ({ ...prev, gradeValue: e.target.value ? parseInt(e.target.value) : '' }))}
                      className="w-full p-3 bg-white border border-[#e5e1fe] rounded-xl outline-none text-sm font-bold text-slate-600 focus:border-[#655ac1] focus:ring-2 focus:ring-[#e5e1fe] transition-all cursor-pointer"
                    >
                      <option value="">اختر الصف...</option>
                      {Array.from({ length: totalGrades }, (_, i) => i + 1).map(grade => (
                        <option key={grade} value={grade}>الصف {grade}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Card: By Class */}
                <button
                  onClick={() => setPrintSelection(prev => ({ ...prev, type: 'class', gradeValue: '' }))}
                  className={`w-full p-4 border rounded-2xl transition-all flex items-center gap-4 text-right ${
                    printSelection.type === 'class'
                      ? 'border-[#655ac1] bg-[#f5f3ff]'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border shrink-0 transition-all ${
                    printSelection.type === 'class'
                      ? 'bg-[#655ac1] border-[#655ac1]'
                      : 'bg-white border-slate-200'
                  }`}>
                    <Users size={20} className={printSelection.type === 'class' ? 'text-white' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1">
                    <div className={`font-black text-sm ${printSelection.type === 'class' ? 'text-[#655ac1]' : 'text-slate-700'}`}>فصل محدد</div>
                    <div className="text-xs text-slate-400 font-bold mt-0.5">طباعة طلاب فصل دراسي بعينه</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                    printSelection.type === 'class' ? 'border-[#655ac1] bg-[#655ac1]' : 'border-slate-300'
                  }`}>
                    {printSelection.type === 'class' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>

                {/* Class dropdown (shown when class selected) */}
                {printSelection.type === 'class' && (
                  <div className="mr-14">
                    <select
                      value={printSelection.classId}
                      onChange={(e) => setPrintSelection(prev => ({ ...prev, classId: e.target.value }))}
                      className="w-full p-3 bg-white border border-[#e5e1fe] rounded-xl outline-none text-sm font-bold text-slate-600 focus:border-[#655ac1] focus:ring-2 focus:ring-[#e5e1fe] transition-all cursor-pointer"
                    >
                      <option value="">اختر الفصل...</option>
                      {schoolClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name || `${c.grade}/${c.section}`}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Summary badge */}
                {printCount !== null && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                    <Printer size={14} className="text-[#655ac1] shrink-0" />
                    <span className="text-xs font-bold text-slate-500">سيتم طباعة</span>
                    <span className="text-sm font-black text-[#655ac1]">{printCount}</span>
                    <span className="text-xs font-bold text-slate-500">طالب</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-50/60 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmPrint}
                  disabled={!canPrint}
                  className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
                    canPrint
                      ? 'bg-[#655ac1] text-white hover:bg-[#5448a8] shadow-sm'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Printer size={15} />
                  طباعة الآن
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════ Missing Data Modal ══════ */}
      {showMissingDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">

            {/* Header */}
            <div className="p-6 border-b border-amber-100 flex items-center justify-between bg-amber-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-2xl">
                  <AlertTriangle size={24} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800">طلاب ببيانات ناقصة</h3>
                  <p className="text-xs text-amber-600/80 font-bold mt-0.5">
                    {studentsWithMissingData.length} طالب يحتاج إلى مراجعة وتحديث البيانات
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMissingDataModal(false)}
                className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm"
              >
                <X size={16} />
              </button>
            </div>

            {/* Stats */}
            <div className="px-6 py-4 border-b border-slate-100 flex gap-3 shrink-0">
              <div className="flex-1 text-center p-3 bg-rose-50 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xl font-black text-rose-500">
                  {studentsWithMissingData.filter(s => !s.grade).length}
                </div>
                <div className="text-xs font-bold text-rose-600/80 mt-0.5">بدون صف</div>
              </div>
              <div className="flex-1 text-center p-3 bg-amber-50 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xl font-black text-amber-500">
                  {studentsWithMissingData.filter(s => !s.classId).length}
                </div>
                <div className="text-xs font-bold text-amber-600/80 mt-0.5">بدون فصل</div>
              </div>
              <div className="flex-1 text-center p-3 bg-orange-50 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xl font-black text-orange-500">
                  {studentsWithMissingData.filter(s => !s.parentPhone).length}
                </div>
                <div className="text-xs font-bold text-orange-600/80 mt-0.5">بدون رقم ولي الأمر</div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <table className="w-full text-right">
                <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                  <tr>
                    <th className="p-4 text-xs font-black text-slate-400 w-12">م</th>
                    <th className="p-4 text-xs font-black text-slate-500">اسم الطالب</th>
                    <th className="p-4 text-center text-xs font-black text-slate-500 w-28">الصف</th>
                    <th className="p-4 text-center text-xs font-black text-slate-500 w-40">الفصل</th>
                    <th className="p-4 text-center text-xs font-black text-slate-500 w-44">رقم ولي الأمر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {studentsWithMissingData.map((student, idx) => {
                    const missingGrade = !student.grade;
                    const missingClass = !student.classId;
                    const missingPhone = !student.parentPhone;
                    return (
                      <tr key={student.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="p-4 text-xs font-bold text-slate-300">{idx + 1}</td>
                        <td className="p-4 font-bold text-slate-700 whitespace-nowrap">{student.name}</td>
                        <td className="p-4 text-center">
                          {missingGrade ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-500 rounded-lg text-xs font-bold border border-rose-100">
                              <X size={11} /> غير محدد
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold">
                              الصف {student.grade}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {missingClass ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold border border-amber-100">
                              <X size={11} /> غير محدد
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-sm font-bold">
                              {getClassName(student.classId)}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {missingPhone ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-500 rounded-lg text-xs font-bold border border-orange-100">
                              <X size={11} /> غير مسجل
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-slate-600 font-mono tracking-wide" dir="ltr">
                              {student.parentPhone}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-between items-center">
              <p className="text-xs text-slate-400 font-bold">
                يمكنك تعديل بيانات الطالب من خلال زر الإجراءات في الجدول الرئيسي
              </p>
              <button
                onClick={() => setShowMissingDataModal(false)}
                className="px-6 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Grade / Class Delete Confirmation Modal ══════ */}
      {gradeDeleteTarget && (() => {
        const { grade, classId, className } = gradeDeleteTarget;
        const targetStudents = classId
          ? schoolStudents.filter(s => s.classId === classId)
          : schoolStudents.filter(s => s.grade === grade);
        const label = classId
          ? `طلاب فصل ${className || classId}`
          : `طلاب الصف ${grade}`;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                  <Trash2 size={20} className="text-rose-500" /> تأكيد الحذف
                </h3>
                <button onClick={() => setGradeDeleteTarget(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <div className="flex flex-col items-center text-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center">
                    <AlertTriangle size={32} className="text-rose-500" />
                  </div>
                  <div>
                    <p className="font-black text-slate-800 mb-2">هل أنت متأكد من الحذف؟</p>
                    <p className="text-sm text-slate-500 font-medium">
                      سيتم حذف جميع{' '}
                      <span className="font-black text-rose-500">{targetStudents.length}</span>{' '}
                      {label} بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteGradeOrClass}
                    className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> نعم، احذف {label}
                  </button>
                  <button
                    onClick={() => setGradeDeleteTarget(null)}
                    className="flex-1 px-4 py-3 bg-white text-slate-600 border border-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════ Action Dropdown Portal ══════ */}
      {actionDropdown && ReactDOM.createPortal(
        <div
          className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 animate-in fade-in zoom-in-95 duration-150"
          style={{ top: actionDropdown.top, left: actionDropdown.left, minWidth: 160 }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const s = students.find(x => x.id === actionDropdown.studentId);
              if (s) { handleStartEdit(s); setActionDropdown(null); }
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors"
          >
            <Pencil size={15} className="text-[#655ac1]" /> تعديل
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={() => {
              handleDeleteOne(actionDropdown.studentId);
              setActionDropdown(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 font-bold transition-colors"
          >
            <Trash2 size={15} /> حذف
          </button>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Step5Students;
