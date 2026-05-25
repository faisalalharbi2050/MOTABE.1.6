import React, { useState, useMemo, useCallback, useRef, useEffect, startTransition } from 'react';
import ReactDOM from 'react-dom';
import { ClassInfo, Student, SchoolInfo, Phase } from '../../../types';
import { PHASE_CONFIG } from '../../../constants';
import {
  Users, Upload, Search, Filter, Printer, Trash2, Plus, X, Pencil, Check,
  AlertTriangle, School, GraduationCap, ArrowUpCircle, Download,
  ChevronDown, Loader2, CheckCircle2, Phone, Hash, FileSpreadsheet,
  RotateCcw, UserPlus, Trash, Edit2, BookOpen, ArrowLeftRight
} from 'lucide-react';
import {
  parseStudentExcel,
  printStudentList,
  getStudentStats,
  normalizeArabic,
} from '../../../utils/studentUtils';
import LoadingLogo, { useMinLoadingTime } from '../../ui/LoadingLogo';
import SchoolTabs from '../SchoolTabs';

interface Step5Props {
  classes: ClassInfo[];
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  schoolInfo: SchoolInfo;
}

// ─── MultiAdd Icon (matches Step7 Admins) ────────────────────
const MultiAddIcon: React.FC<{ className?: string }> = ({ className = 'text-slate-400' }) => (
  <span className={`relative inline-flex h-5 w-5 items-center justify-center ${className}`}>
    <Users size={17} />
    <Plus size={9} strokeWidth={3.2} className="absolute -right-1 top-1" />
  </span>
);

const SaveCheckIcon = ({ className = "bg-[#655ac1]" }: { className?: string }) => (
  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border border-white ${className}`}>
    <Check size={13} strokeWidth={3.2} className="text-white" />
  </span>
);

const gradeLabel = (grade: number) => {
  const labels: Record<number, string> = {
    1: 'الأول',
    2: 'الثاني',
    3: 'الثالث',
    4: 'الرابع',
    5: 'الخامس',
    6: 'السادس',
  };
  return labels[grade] || String(grade);
};

// ─── Reusable Dropdown (matches EntityTypeDropdown style from Step1 General) ─────
interface DropdownOption { value: string; label: string; }
interface StudentDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  compact?: boolean;
}

type StudentEditDraft = Pick<Student, 'id' | 'name' | 'grade' | 'classId'> & {
  parentPhone: string;
};
const StudentDropdown: React.FC<StudentDropdownProps> = ({
  value, onChange, options, placeholder = 'اختر', emptyLabel, disabled, compact,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxH: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const panelH = 300;
    const below = window.innerHeight - r.bottom;
    const above = r.top;
    const placeAbove = below < panelH + 16 && above > below;
    const maxH = Math.max(180, (placeAbove ? above : below) - 16);
    const panelWidth = Math.min(window.innerWidth - 16, Math.max(r.width, compact ? 220 : r.width));
    setPos({
      top: placeAbove ? Math.max(8, r.top - Math.min(maxH, panelH) - 8) : r.bottom + 8,
      left: Math.max(8, Math.min(r.left, window.innerWidth - panelWidth - 8)),
      width: panelWidth,
      maxH,
    });
  }, [open, compact]);

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  const selectedLabel = options.find(o => o.value === value)?.label;
  const btnSize = compact ? 'px-3 py-2 text-xs' : 'px-5 py-3.5 text-[13px]';

  return (
    <div className="relative w-full" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full ${btnSize} bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${open ? 'ring-2 ring-[#8779fb]/20 border-[#655ac1]/40' : ''}`}
      >
        <span className="truncate leading-tight">{selectedLabel || placeholder}</span>
        <ChevronDown size={compact ? 14 : 16} className={`text-[#655ac1] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && ReactDOM.createPortal(
        <div
          dir="rtl"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxH, zIndex: 99999 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 overflow-x-hidden"
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="overflow-y-auto custom-scrollbar space-y-1 pr-1" style={{ maxHeight: pos.maxH - 20 }}>
            {emptyLabel && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center justify-between gap-3 ${!value ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}
              >
                <span className="min-w-0 whitespace-normal leading-relaxed">{emptyLabel}</span>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${!value ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                  <Check size={12} strokeWidth={3.5} />
                </span>
              </button>
            )}
            {options.length === 0 && !emptyLabel && (
              <div className="px-3 py-6 text-center text-xs text-slate-400 font-bold">لا توجد خيارات متاحة</div>
            )}
            {options.map(opt => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center justify-between gap-3 ${active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}
                >
                  <span className="min-w-0 whitespace-normal leading-relaxed">{opt.label}</span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                    <Check size={12} strokeWidth={3.5} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ─── Memoized Student Row ─────────────────────────────────────
// Defined outside the parent so React.memo works across renders.
// Only re-renders when its own props change — prevents all rows from
// re-rendering when a modal opens, dropdown toggles, etc.
interface StudentRowProps {
  student: Student;
  idx: number;
  isSelected: boolean;
  isEditing: boolean;
  selectionMode: boolean;
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
  student, idx, isSelected, isEditing, selectionMode,
  editName, editPhone, editClassId, gradeClasses, getClassName,
  onToggleSelect, onSetEditName, onSetEditPhone, onSetEditClassId,
  onSaveEdit, onCancelEdit, onOpenDropdown,
}) {
  const showCheckbox = selectionMode || isSelected;
  return (
    <tr className={`transition-colors group ${
      isSelected ? 'bg-[#e5e1fe]/20' : isEditing ? 'bg-[#f5f3ff]' : selectionMode ? 'hover:bg-rose-50/30' : 'hover:bg-[#e5e1fe]/10'
    }`}>
      <td className="p-4 text-center relative">
        <div className="flex items-center justify-center gap-1">
          <div
            onClick={() => onToggleSelect(student.id)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all absolute right-3 ${
              showCheckbox ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } ${
              isSelected ? 'bg-[#655ac1] border-[#655ac1]' : 'border-slate-300 hover:border-[#655ac1]'
            }`}
          >
            {isSelected && <Check size={11} className="text-white" />}
          </div>
          <span className={`text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 flex items-center justify-center rounded-full transition-opacity ${showCheckbox ? 'opacity-0' : 'group-hover:opacity-0'}`}>
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
  const showImportLoader = useMinLoadingTime(isImporting, 2500);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ matched: number; unmatched: number; total: number; errors: string[] } | null>(null);
  const [showImportErrors, setShowImportErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gradeDropdownRef = useRef<HTMLDivElement>(null);
  const classDropdownRef = useRef<HTMLDivElement>(null);
  const bulkGradeDropdownRef = useRef<HTMLDivElement>(null);
  const bulkClassDropdownRef = useRef<HTMLDivElement>(null);
  const bulkGradeBtnRef = useRef<HTMLDivElement>(null);
  const bulkClassBtnRef = useRef<HTMLDivElement>(null);
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
  const [selectionMode, setSelectionMode] = useState(false);

  // ─── Data Edit Modal State ───
  const [showDataEditModal, setShowDataEditModal] = useState(false);
  const [dataEditSearch, setDataEditSearch] = useState('');
  const [dataEditGrade, setDataEditGrade] = useState<number | ''>('');
  const [dataEditClassId, setDataEditClassId] = useState('');
  const [dataEditSelectedIds, setDataEditSelectedIds] = useState<Set<string>>(new Set());
  const [dataEditDrafts, setDataEditDrafts] = useState<Record<string, StudentEditDraft>>({});
  const [showDataEditConfirm, setShowDataEditConfirm] = useState(false);

  // ─── Student Transfer Modal State ───
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditScope, setBulkEditScope] = useState<'selected' | 'grade' | 'class'>('selected');
  const [bulkEditScopeGrade, setBulkEditScopeGrade] = useState<number | ''>('');
  const [bulkEditScopeClassId, setBulkEditScopeClassId] = useState('');
  const [bulkEditTargetClassId, setBulkEditTargetClassId] = useState('');
  const [transferSearch, setTransferSearch] = useState('');
  const [transferSelectedIds, setTransferSelectedIds] = useState<Set<string>>(new Set());
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferGlobalSelectWarning, setTransferGlobalSelectWarning] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [gradeDeleteTarget, setGradeDeleteTarget] = useState<{ grade: number; classId?: string; className?: string } | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [showMissingDataModal, setShowMissingDataModal] = useState(false);


  // ─── Print State ───
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printSelection, setPrintSelection] = useState<{ type: 'all' | 'grade' | 'class'; gradeValue: number | ''; classId: string }>({ type: 'all', gradeValue: '', classId: '' });
  const [showBulkCountModal, setShowBulkCountModal] = useState(false);

  // ─── Manual Bulk Entry State ───
  const [isBulkEntryMode, setIsBulkEntryMode] = useState(false);
  const [bulkCount, setBulkCount] = useState<number>(20);
  const [bulkSelectedGrade, setBulkSelectedGrade] = useState<number | ''>('');
  const [bulkSelectedClassId, setBulkSelectedClassId] = useState<string>('');
  const [bulkGradeDropdownOpen, setBulkGradeDropdownOpen] = useState(false);
  const [bulkClassDropdownOpen, setBulkClassDropdownOpen] = useState(false);
  const [bulkGradeDropdownPos, setBulkGradeDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const [bulkClassDropdownPos, setBulkClassDropdownPos] = useState<{ top: number; right: number } | null>(null);
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
      const q = normalizeArabic(searchText.toLowerCase().trim());
      result = result.filter(s =>
        normalizeArabic(s.name).toLowerCase().includes(q) ||
        (s.parentPhone || '').includes(searchText.trim())
      );
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

  useEffect(() => {
    if (!bulkGradeDropdownOpen && !bulkClassDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inGradeBtn = bulkGradeBtnRef.current?.contains(target);
      const inGradeMenu = bulkGradeDropdownRef.current?.contains(target);
      if (!inGradeBtn && !inGradeMenu) setBulkGradeDropdownOpen(false);
      const inClassBtn = bulkClassBtnRef.current?.contains(target);
      const inClassMenu = bulkClassDropdownRef.current?.contains(target);
      if (!inClassBtn && !inClassMenu) setBulkClassDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [bulkGradeDropdownOpen, bulkClassDropdownOpen]);

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

  const openDataEditModal = useCallback(() => {
    const initialIds = selectedStudents.size > 0 ? selectedStudents : new Set<string>();
    const drafts: Record<string, StudentEditDraft> = {};
    schoolStudents.forEach(s => {
      if (initialIds.has(s.id)) {
        drafts[s.id] = {
          id: s.id,
          name: s.name,
          grade: s.grade,
          classId: s.classId,
          parentPhone: s.parentPhone || '',
        };
      }
    });
    setDataEditSelectedIds(new Set(initialIds));
    setDataEditDrafts(drafts);
    setDataEditSearch('');
    setDataEditGrade('');
    setDataEditClassId('');
    setShowDataEditConfirm(false);
    setShowDataEditModal(true);
  }, [schoolStudents, selectedStudents]);

  const toggleDataEditStudent = useCallback((student: Student) => {
    setDataEditSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(student.id)) {
        next.delete(student.id);
      } else {
        next.add(student.id);
        setDataEditDrafts(drafts => ({
          ...drafts,
          [student.id]: drafts[student.id] || {
            id: student.id,
            name: student.name,
            grade: student.grade,
            classId: student.classId,
            parentPhone: student.parentPhone || '',
          },
        }));
      }
      return next;
    });
  }, []);

  const updateDataEditDraft = useCallback((id: string, patch: Partial<StudentEditDraft>) => {
    setDataEditDrafts(prev => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: { ...current, ...patch } };
    });
  }, []);

  const applyDataEditSave = useCallback(() => {
    const ids = Array.from(dataEditSelectedIds);
    if (ids.length === 0) {
      showToast('اختر طالبًا واحدًا على الأقل للحفظ', 'error');
      return;
    }

    const patches = new Map(ids.map(id => [id, dataEditDrafts[id]]).filter((entry): entry is [string, StudentEditDraft] => !!entry[1]));
    setStudents(prev => prev.map(s => {
      const patch = patches.get(s.id);
      if (!patch) return s;
      return {
        ...s,
        name: patch.name.trim() || s.name,
        grade: patch.grade,
        classId: patch.classId,
        parentPhone: patch.parentPhone.trim() || undefined,
      };
    }));
    setShowDataEditConfirm(false);
    setShowDataEditModal(false);
    showToast(`تم حفظ بيانات ${patches.size} طالب`);
  }, [dataEditDrafts, dataEditSelectedIds, setStudents, showToast]);

  const handleDataEditSave = useCallback(() => {
    if (dataEditSelectedIds.size > 1) {
      setShowDataEditConfirm(true);
      return;
    }
    applyDataEditSave();
  }, [applyDataEditSave, dataEditSelectedIds.size]);

  const openTransferModal = useCallback(() => {
    const initialIds = new Set<string>();
    selectedStudents.forEach(id => {
      if (schoolStudents.some(s => s.id === id)) initialIds.add(id);
    });
    setTransferSelectedIds(initialIds);
    setTransferSearch('');
    setBulkEditScope('selected');
    setBulkEditScopeGrade('');
    setBulkEditScopeClassId('');
    setBulkEditTargetClassId('');
    setShowTransferConfirm(false);
    setTransferGlobalSelectWarning(false);
    setShowBulkEditModal(true);
  }, [schoolStudents, selectedStudents]);

  const toggleTransferStudent = useCallback((student: Student) => {
    setTransferSelectedIds(prev => {
      const next = new Set(prev);
      const selectedGrades = new Set(schoolStudents.filter(s => next.has(s.id)).map(s => s.grade));
      const selectedGrade = selectedGrades.size === 1 ? Array.from(selectedGrades)[0] : null;
      if (next.has(student.id)) {
        next.delete(student.id);
      } else if (selectedGrade === null || student.grade === selectedGrade) {
        next.add(student.id);
      } else {
        showToast('يمكن نقل طلاب من نفس الصف فقط', 'error');
      }
      return next;
    });
  }, [schoolStudents, showToast]);

  // ─── Student Transfer Handler ───
  const handleBulkEditApply = useCallback(() => {
    if (!bulkEditTargetClassId) return;
    const targetClass = classes.find(c => c.id === bulkEditTargetClassId);
    if (!targetClass) return;

    let affected: string[] = [];
    if (bulkEditScope === 'selected') {
      affected = Array.from(transferSelectedIds);
    } else if (bulkEditScope === 'grade' && bulkEditScopeGrade !== '') {
      affected = schoolStudents.filter(s => s.grade === bulkEditScopeGrade).map(s => s.id);
    } else if (bulkEditScope === 'class' && bulkEditScopeClassId) {
      affected = schoolStudents.filter(s => s.classId === bulkEditScopeClassId).map(s => s.id);
    }

    if (affected.length === 0) {
      showToast('لا يوجد طلاب مطابقون للنطاق المحدد', 'error');
      return;
    }

    const sourceStudents = schoolStudents.filter(s => affected.includes(s.id));
    const selectedGrades = new Set(sourceStudents.map(s => s.grade));
    if (selectedGrades.size !== 1 || !selectedGrades.has(targetClass.grade)) {
      showToast('لا يمكن نقل الطالب إلى صف آخر', 'error');
      return;
    }
    if (sourceStudents.every(s => s.classId === targetClass.id)) {
      showToast('اختر فصلًا مختلفًا عن الفصل الحالي', 'error');
      return;
    }

    const affectedSet = new Set(affected);
    setStudents(prev => prev.map(s =>
      affectedSet.has(s.id) ? { ...s, classId: targetClass.id, grade: targetClass.grade } : s
    ));
    setShowBulkEditModal(false);
    setShowTransferConfirm(false);
    setTransferSelectedIds(new Set());
    if (bulkEditScope === 'selected') { setSelectedStudents(new Set()); setSelectionMode(false); }
    showToast(`تم نقل ${affected.length} طالب إلى ${targetClass.name || `${targetClass.grade}/${targetClass.section}`}`);
  }, [bulkEditScope, bulkEditScopeGrade, bulkEditScopeClassId, bulkEditTargetClassId, transferSelectedIds, schoolStudents, classes, setStudents, showToast]);

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
    setShowPrintModal(false);
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

      {/* ══════ Import Loading Overlay (Portal — matches Step6 Teachers) ══════ */}
      {showImportLoader && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100000] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
          <LoadingLogo size="lg" />
          <p className="text-base font-bold text-[#655ac1]">جاري استيراد الطلاب...</p>
        </div>,
        document.body
      )}

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
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300 mb-6">
          
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

      {/* ══════ Stats Cards (Total / Classes Used / Missing Data — last one clickable) ══════ */}
      {!isBulkEntryMode && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 print:hidden">
          {[
            { label: 'إجمالي الطلاب', value: schoolStudents.length, icon: Users, clickable: false },
            { label: 'عدد الفصول المستخدمة', value: stats.classMap.size, icon: BookOpen, clickable: false },
            { label: 'بيانات ناقصة', value: studentsWithMissingData.length, icon: AlertTriangle, clickable: true },
          ].map(({ label, value, icon: Icon, clickable }) => {
            const interactive = clickable && value > 0;
            const Wrapper: any = interactive ? 'button' : 'div';
            return (
              <Wrapper
                key={label}
                {...(interactive ? { onClick: () => setShowMissingDataModal(true), title: 'انقر لعرض وتعديل البيانات الناقصة' } : {})}
                className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 text-right ${
                  interactive ? 'cursor-pointer hover:border-[#655ac1]/40 hover:shadow-md transition-all' : ''
                }`}
              >
                <div className="w-10 h-10 flex items-center justify-center text-[#655ac1]">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-400">{label}</p>
                  <p className="text-2xl font-black text-slate-800 leading-tight">{value}</p>
                </div>
                {interactive && (
                  <span className="mr-auto text-[10px] font-black text-[#655ac1] bg-[#e5e1fe] px-2 py-1 rounded-full">انقر للتعديل</span>
                )}
              </Wrapper>
            );
          })}
        </div>
      )}

      {/* ══════ Manual Bulk Entry Mode (matches Step7 Admins layout) ══════ */}
      {isBulkEntryMode && (() => {
        const availableGrades = [...new Set(schoolClasses.map(c => c.grade))].sort((a, b) => a - b);
        const defaultGrade = availableGrades[0] ?? 1;
        const gradeOptions: DropdownOption[] = availableGrades.map(g => ({ value: String(g), label: `الصف ${g}` }));
        const allClassOptions: DropdownOption[] = schoolClasses.map(c => ({
          value: c.id,
          label: `${c.name || `${c.grade}/${c.section}`} — الصف ${c.grade}`,
        }));

        return (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-[2rem]">
                  <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                      <MultiAddIcon className="text-[#655ac1]" /> إضافة عدة طلاب
                  </h3>
              </div>

              {/* Batch Assignment + Save/Cancel */}
              <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                      <GraduationCap size={18} className="text-[#655ac1]" />
                      <span className="text-sm font-black text-slate-800">تعيين الصف والفصل لجميع الطلاب دفعة واحدة</span>
                  </div>
                  <div className="w-px h-5 bg-slate-200 hidden sm:block" />

                  <div className="w-full sm:w-44">
                      <StudentDropdown
                          compact
                          value={bulkSelectedGrade === '' ? '' : String(bulkSelectedGrade)}
                          onChange={v => {
                              const g = v ? parseInt(v) : '' as ('' | number);
                              setBulkSelectedGrade(g);
                              setBulkSelectedClassId('');
                              if (g !== '') setBulkStudents(prev => prev.map(s => ({ ...s, grade: g as number, classId: '' })));
                          }}
                          options={gradeOptions}
                          placeholder="اختر الصف للجميع"
                      />
                  </div>

                  <div className="w-full sm:w-52">
                      <StudentDropdown
                          compact
                          value={bulkSelectedClassId}
                          onChange={v => {
                              setBulkSelectedClassId(v);
                              const cls = schoolClasses.find(c => c.id === v);
                              if (cls) {
                                  setBulkSelectedGrade(cls.grade);
                                  setBulkStudents(prev => prev.map(s => ({ ...s, classId: cls.id, grade: cls.grade })));
                              }
                          }}
                          options={allClassOptions}
                          placeholder="اختر الفصل للجميع"
                      />
                  </div>

                  {/* Save / Cancel */}
                  <div className="flex items-center gap-2 mr-auto">
                      <button
                          onClick={() => { setIsBulkEntryMode(false); setBulkStudents([]); setBulkSelectedGrade(''); setBulkSelectedClassId(''); }}
                          className="px-5 py-2 bg-white text-slate-400 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                      >
                          إلغاء
                      </button>
                      <button
                          onClick={() => {
                             const validStudents = bulkStudents.filter(s => s.name.trim().length > 0);
                             if (validStudents.length === 0) { showToast('لا يوجد طلاب للحفظ', 'error'); return; }
                             const newStudents: Student[] = validStudents.map(s => ({
                                 id: s.id, name: s.name, grade: s.grade, classId: s.classId,
                                 parentPhone: s.parentPhone || undefined, schoolId: activeSchoolId
                             }));
                             setStudents(prev => [...prev, ...newStudents]);
                             setIsBulkEntryMode(false); setBulkStudents([]);
                             setBulkSelectedGrade(''); setBulkSelectedClassId('');
                             showToast(`تم إضافة ${newStudents.length} طالب بنجاح`, 'success');
                          }}
                          className="px-5 py-2 bg-[#655ac1] text-white rounded-xl text-sm font-black hover:bg-[#5448a8] transition-all shadow-lg shadow-[#655ac1]/20 flex items-center gap-2"
                      >
                          <CheckCircle2 size={15} /> حفظ ({bulkStudents.filter(s => s.name.trim()).length})
                      </button>
                  </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                  <table className="w-full text-right">
                      <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100">
                              <th className="px-3 py-4 w-14 text-center text-xs font-black text-[#655ac1]">م</th>
                              <th className="px-3 py-4 text-xs font-black text-[#655ac1]">اسم الطالب <span className="text-rose-500">*</span></th>
                              <th className="px-3 py-4 w-[22%] text-center text-xs font-black text-[#655ac1]">الصف <span className="text-rose-500">*</span></th>
                              <th className="px-3 py-4 w-[24%] text-center text-xs font-black text-[#655ac1]">الفصل</th>
                              <th className="px-3 py-4 w-[20%] text-center text-xs font-black text-[#655ac1]">رقم ولي الأمر</th>
                              <th className="px-3 py-4 w-14 text-center text-xs font-black text-[#655ac1]" />
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {bulkStudents.map((student, index) => {
                              const rowGradeOpts = gradeOptions;
                              const rowClassOpts: DropdownOption[] = schoolClasses
                                  .filter(c => c.grade === student.grade)
                                  .map(c => ({ value: c.id, label: c.name || `${c.grade}/${c.section}` }));
                              return (
                              <tr key={student.id} className="group hover:bg-[#e5e1fe]/10 transition-colors">
                                  <td className="px-3 py-3 text-center">
                                      <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 flex items-center justify-center rounded-full mx-auto">
                                          {index + 1}
                                      </span>
                                  </td>
                                  <td className="px-3 py-3">
                                      <input
                                          type="text"
                                          placeholder="أحمد محمد خالد"
                                          value={student.name}
                                          onChange={(e) => setBulkStudents(prev => prev.map((s, i) => i === index ? { ...s, name: e.target.value } : s))}
                                          className={`w-full bg-transparent border-0 focus:ring-0 outline-none font-bold text-sm text-slate-800 py-1 ${
                                              student.name.trim() ? '' : 'placeholder:text-rose-300'
                                          }`}
                                      />
                                  </td>
                                  <td className="px-3 py-3 align-middle">
                                      <StudentDropdown
                                          compact
                                          value={String(student.grade)}
                                          onChange={v => {
                                              const g = parseInt(v);
                                              setBulkStudents(prev => prev.map((s, i) => i === index ? { ...s, grade: g, classId: '' } : s));
                                          }}
                                          options={rowGradeOpts}
                                          placeholder="اختر الصف"
                                      />
                                  </td>
                                  <td className="px-3 py-3 align-middle">
                                      <StudentDropdown
                                          compact
                                          value={student.classId}
                                          onChange={v => setBulkStudents(prev => prev.map((s, i) => i === index ? { ...s, classId: v } : s))}
                                          options={rowClassOpts}
                                          placeholder={rowClassOpts.length === 0 ? 'لا توجد فصول' : 'اختر الفصل'}
                                          disabled={rowClassOpts.length === 0}
                                      />
                                  </td>
                                  <td className="px-3 py-3 align-middle text-center">
                                      <input
                                          type="tel"
                                          dir="ltr"
                                          placeholder="05xxxxxxxx"
                                          value={student.parentPhone}
                                          onChange={(e) => setBulkStudents(prev => prev.map((s, i) => i === index ? { ...s, parentPhone: e.target.value } : s))}
                                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-700 focus:outline-none focus:border-[#655ac1] text-center"
                                      />
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                      <button
                                          onClick={() => setBulkStudents(prev => prev.filter((_, i) => i !== index))}
                                          className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-sm shadow-rose-500/20"
                                          title="حذف السطر"
                                      >
                                          <X size={14} />
                                      </button>
                                  </td>
                              </tr>
                              );
                          })}
                      </tbody>
                  </table>

                  {/* Add Row */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50/30 rounded-b-[2rem] flex justify-start">
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
                          + إضافة جديد
                      </button>
                  </div>
              </div>
          </div>
        );
      })()}

      {/* ══════ Action Bar + Content ══════ */}
      {!isBulkEntryMode && (
        <>
            {/* ══════ Action Bar (Unified — matches Step6/Step7) ══════ */}
            <div dir="rtl" className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-2 justify-between mb-6">
                {/* Right group — primary actions */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        dir="rtl"
                        onClick={() => fileInputRef.current?.click()}
                        className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white font-bold text-sm transition-all"
                    >
                        <Upload size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                        استيراد من Excel
                    </button>
                    <button
                        dir="rtl"
                        onClick={() => setShowAddForm(true)}
                        className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white font-bold text-sm transition-all"
                    >
                        <UserPlus size={17} className="text-slate-400 group-hover:text-white transition-colors" />
                        إضافة طالب
                    </button>
                    <button
                        dir="rtl"
                        onClick={() => setShowBulkCountModal(true)}
                        className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white font-bold text-sm transition-all"
                    >
                        <MultiAddIcon className="text-slate-400 group-hover:text-white transition-colors" />
                        إضافة عدة طلاب
                    </button>
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px h-9 bg-slate-200" aria-hidden="true" />

                {/* Left group — table actions */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        dir="rtl"
                        onClick={openDataEditModal}
                        disabled={schoolStudents.length === 0}
                        className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        title="تعديل بيانات طالب أو مجموعة طلاب"
                    >
                        <Edit2 size={15} className="text-slate-400 group-hover:text-white transition-colors" />
                        تعديل البيانات
                    </button>
                    <button
                        dir="rtl"
                        onClick={openTransferModal}
                        disabled={schoolStudents.length === 0}
                        className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        title="نقل طالب أو مجموعة طلاب بين فصول الصف نفسه"
                    >
                        <ArrowLeftRight size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                        نقل طالب
                    </button>
                    <button
                        dir="rtl"
                        onClick={() => { setPrintSelection({ type: 'all', gradeValue: '', classId: '' }); setShowPrintModal(true); }}
                        disabled={schoolStudents.length === 0}
                        className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Printer size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                        طباعة
                    </button>
                    {/* Selection-mode toggle (delete-multi flow) */}
                    <button
                        dir="rtl"
                        onClick={() => {
                          if (selectionMode && selectedStudents.size > 0) {
                            setShowBulkDeleteConfirm(true);
                          } else {
                            setSelectionMode(prev => {
                              if (prev) setSelectedStudents(new Set());
                              return !prev;
                            });
                          }
                        }}
                        disabled={schoolStudents.length === 0}
                        className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border disabled:opacity-40 disabled:cursor-not-allowed ${
                          selectionMode
                            ? 'bg-rose-500 text-white border-rose-500 hover:bg-rose-600 hover:border-rose-600 shadow-md shadow-rose-500/20'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600'
                        }`}
                    >
                        {selectionMode ? <Check size={16} className="text-white" /> : <Trash2 size={16} className="text-rose-500" />}
                        {selectionMode
                          ? (selectedStudents.size > 0 ? `تأكيد حذف (${selectedStudents.size})` : 'تأكيد')
                          : 'حذف محدد'}
                    </button>
                    {selectionMode && (
                      <button
                        dir="rtl"
                        onClick={() => { setSelectionMode(false); setSelectedStudents(new Set()); }}
                        className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold text-sm transition-all"
                      >
                        إلغاء
                      </button>
                    )}
                    <button
                        dir="rtl"
                        onClick={() => setShowDeleteAllConfirm(true)}
                        disabled={schoolStudents.length === 0}
                        className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={16} className="text-rose-500" />
                        حذف الكل
                    </button>
                </div>
            </div>



            {/* ══════ Stats Cards (Drill-Down) ══════ */}

          {/* ══════ Empty State ══════ */}
          {schoolStudents.length === 0 && !isImporting && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <GraduationCap size={48} className="mx-auto mb-5 text-slate-300" strokeWidth={1.6} />
              <p className="text-slate-600 font-black text-lg mb-1">لا يوجد طلاب بعد</p>
              <p className="text-slate-400 text-sm">
                استخدم زر <span className="font-bold text-[#655ac1]">استيراد من Excel</span> أو{' '}
                <span className="font-bold text-[#655ac1]">إضافة طالب</span> أو{' '}
                <span className="font-bold text-[#655ac1]">إضافة عدة طلاب</span> للبدء
              </p>
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

      {/* ─── Import Results Modal ─── */}
      {importResult && !isImporting && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                      <CheckCircle2 size={24} className="text-[#655ac1]" /> نتائج الاستيراد
                    </h3>
                    <button onClick={() => setImportResult(null)} className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                      <X size={18} />
                    </button>
               </div>

               <div className="p-8">
                 <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="text-center p-4 bg-white rounded-2xl border border-slate-200">
                        <div className="text-2xl font-black text-[#655ac1]">{importResult.total}</div>
                        <div className="text-xs text-slate-400 font-bold mt-1">إجمالي الطلاب</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-2xl border border-slate-200">
                        <div className="text-2xl font-black text-[#655ac1]">{importResult.matched}</div>
                        <div className="text-xs text-slate-400 font-bold mt-1">تمت المطابقة</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-2xl border border-slate-200">
                        <div className="text-2xl font-black text-[#655ac1]">{importResult.unmatched}</div>
                        <div className="text-xs text-slate-400 font-bold mt-1">بيانات ناقصة</div>
                      </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="bg-slate-50 rounded-2xl p-4 max-h-40 overflow-y-auto custom-scrollbar border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                        <AlertTriangle size={12} /> تنبيهات ({importResult.errors.length})
                      </h4>
                      <div className="space-y-1">
                        {importResult.errors.map((err, i) => (
                           <div key={i} className="text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200">{err}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-8 flex gap-3">
                    <button
                      onClick={() => setImportResult(null)}
                      className="flex-1 py-4 bg-white text-slate-400 border border-slate-200 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
             </div>
          </div>
      )}

      {/* ══════ Add Single Student Modal (matches Step7 Admins) ══════ */}
      {showAddForm && (() => {
        // Grades available in the current school+phase (only grades that have classes)
        const availableGrades = [...new Set(schoolClasses.map(c => c.grade))].sort((a, b) => a - b);
        const gradeOptions: DropdownOption[] = availableGrades.map(g => ({ value: String(g), label: `الصف ${g}` }));
        const classOptions: DropdownOption[] = classesForGrade.map(c => ({
          value: c.id,
          label: c.name || `${c.grade}/${c.section}`,
        }));

        return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <UserPlus size={24} className="text-[#655ac1]" /> إضافة طالب جديد
              </h3>
              <button onClick={() => setShowAddForm(false)} className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">اسم الطالب <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    placeholder="أحمد محمد خالد"
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] focus:ring-4 focus:ring-[#655ac1]/10 transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">رقم جوال ولي الأمر</label>
                  <input
                    type="tel"
                    placeholder="05xxxxxxxx"
                    value={addPhone}
                    onChange={e => setAddPhone(e.target.value)}
                    dir="ltr"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] focus:ring-4 focus:ring-[#655ac1]/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">الصف الدراسي <span className="text-rose-500">*</span></label>
                  <StudentDropdown
                    value={availableGrades.includes(addGrade) ? String(addGrade) : ''}
                    onChange={v => { setAddGrade(parseInt(v)); setAddClassId(''); }}
                    options={gradeOptions}
                    placeholder={availableGrades.length === 0 ? 'لا توجد صفوف — أنشئ فصولاً أولاً' : 'اختر الصف'}
                    disabled={availableGrades.length === 0}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">الفصل</label>
                  <StudentDropdown
                    value={addClassId}
                    onChange={v => setAddClassId(v)}
                    options={classOptions}
                    placeholder={classOptions.length === 0 ? 'لا توجد فصول لهذا الصف' : 'اختر الفصل'}
                    disabled={classOptions.length === 0}
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-4 bg-white text-slate-400 border border-slate-200 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => { handleAddStudent(); setShowAddForm(false); }}
                  disabled={!addName.trim() || availableGrades.length === 0}
                  className="flex-1 py-4 bg-[#655ac1] text-white font-black text-sm rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} /> حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ══════ Bulk Count Modal ══════ */}
      {showBulkCountModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <MultiAddIcon className="text-[#655ac1]" />
                إضافة عدة طلاب
              </h3>
              <button onClick={() => setShowBulkCountModal(false)} className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 font-bold mb-5">حدد عدد الطلاب المتوقع إضافتهم</p>
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-6">
                <span className="text-sm font-bold text-slate-500 shrink-0">عدد الطلاب:</span>
                <input
                  type="number"
                  min="2"
                  max="500"
                  value={bulkCount}
                  onChange={(e) => setBulkCount(Math.max(2, parseInt(e.target.value) || 2))}
                  className="flex-1 p-2 bg-white border border-slate-200 rounded-xl font-black text-center outline-none focus:border-[#9d8fe8] text-sm text-[#655ac1]"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkCountModal(false)}
                  className="flex-1 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                >
                  إلغاء
                </button>
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
                  disabled={!bulkCount || bulkCount < 2}
                  className="flex-1 py-3 bg-[#655ac1] text-white rounded-xl text-sm font-black hover:bg-[#5448a8] transition-all shadow-lg shadow-[#655ac1]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} /> إضافة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Student List ══════ */}
      {schoolStudents.length > 0 && (
        <div className="space-y-4">

          {/* Search + Filter Bar (matches Step6/Step7 style) */}
          <div dir="rtl" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-3">

            {/* Right Side: Search & Filter */}
            <div className="flex flex-col lg:flex-row items-center gap-3 flex-1 w-full">
                {/* Search Input (Expands) */}
                <div className="relative flex-1 w-full">
                <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="بحث عن طالب..."
                    value={searchText}
                    onChange={e => { const v = e.target.value; startTransition(() => setSearchText(v)); }}
                    className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20 transition-all text-slate-600 placeholder:text-slate-400"
                />
                {searchText && (
                    <button onClick={() => setSearchText('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                    <X size={16} />
                    </button>
                )}
                </div>

                {/* Split Filter (Grade -> Class) — Multi-select dropdowns (matches Step6 specialization filter) */}
                <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">

                    {/* Grade multi-select */}
                    <div className="relative w-full lg:w-44 shrink-0" ref={gradeDropdownRef}>
                        <button
                            onClick={() => { setGradeDropdownOpen(prev => !prev); setClassDropdownOpen(false); }}
                            className={`w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 ${gradeDropdownOpen ? 'ring-2 ring-[#8779fb]/20 border-[#655ac1]/40' : ''}`}
                        >
                            <span className="truncate text-[13px] leading-tight">
                                {filterGrades.length === 0 ? 'جميع الصفوف' :
                                 filterGrades.length === 1 ? `الصف ${filterGrades[0]}` :
                                 `تم تحديد (${filterGrades.length})`}
                            </span>
                            <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${gradeDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {gradeDropdownOpen && (
                            <div className="absolute z-[200] top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 animate-in slide-in-from-top-2">
                                <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                    {Array.from({ length: totalGrades }, (_, i) => i + 1).map(grade => {
                                        const isSel = filterGrades.includes(grade);
                                        return (
                                            <button
                                                key={grade}
                                                type="button"
                                                onClick={() => setFilterGrades(prev => isSel ? prev.filter(g => g !== grade) : [...prev, grade])}
                                                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center justify-between ${
                                                    isSel ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                                                }`}
                                            >
                                                <span>الصف {grade}</span>
                                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${
                                                    isSel ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                                                }`}>
                                                    <Check size={12} strokeWidth={3.5} />
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Class multi-select */}
                    <div className="relative w-full lg:w-48 shrink-0" ref={classDropdownRef}>
                        <button
                            onClick={() => { setClassDropdownOpen(prev => !prev); setGradeDropdownOpen(false); }}
                            className={`w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 ${classDropdownOpen ? 'ring-2 ring-[#8779fb]/20 border-[#655ac1]/40' : ''}`}
                        >
                            <span className="truncate text-[13px] leading-tight">
                                {filterClassIds.length === 0 ? 'جميع الفصول' :
                                 filterClassIds.length === 1 ? getClassName(filterClassIds[0]) :
                                 `تم تحديد (${filterClassIds.length})`}
                            </span>
                            <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${classDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {classDropdownOpen && (
                            <div className="absolute z-[200] top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 animate-in slide-in-from-top-2">
                                <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                    {Array.from({ length: totalGrades }, (_, i) => i + 1).map(grade => {
                                        const gradeClsItems = classesForFilter.filter(c => c.grade === grade);
                                        if (gradeClsItems.length === 0) return null;
                                        if (filterGrades.length > 0 && !filterGrades.includes(grade)) return null;
                                        return (
                                            <React.Fragment key={grade}>
                                                <div className="px-3 py-1 text-[11px] font-black text-slate-400">
                                                    الصف {grade}
                                                </div>
                                                {gradeClsItems.map(cls => {
                                                    const isSel = filterClassIds.includes(cls.id);
                                                    return (
                                                        <button
                                                            key={cls.id}
                                                            type="button"
                                                            onClick={() => setFilterClassIds(prev => isSel ? prev.filter(id => id !== cls.id) : [...prev, cls.id])}
                                                            className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center justify-between ${
                                                                isSel ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                                                            }`}
                                                        >
                                                            <span>{cls.name || `${cls.grade}/${cls.section}`}</span>
                                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${
                                                                isSel ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                                                            }`}>
                                                                <Check size={12} strokeWidth={3.5} />
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {(filterGrades.length > 0 || filterClassIds.length > 0) && (
                        <button
                            onClick={() => { setFilterGrades([]); setFilterClassIds([]); }}
                            className="shrink-0 p-2.5 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 rounded-xl text-slate-400 transition-all"
                            title="مسح التصفية"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>
            </div>

            {/* Missing data quick-access (clickable when there are items) */}
            {studentsWithMissingData.length > 0 && (
              <button
                onClick={() => setShowMissingDataModal(true)}
                className="shrink-0 group flex items-center gap-2 px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-amber-600 hover:bg-amber-50 hover:border-amber-300 font-bold text-sm transition-all"
                title="عرض الطلاب ذوي البيانات الناقصة"
              >
                <AlertTriangle size={16} />
                بيانات ناقصة ({studentsWithMissingData.length})
              </button>
            )}

          </div>

          {/* Selection summary chip (count only — delete action lives in the top action bar) */}
           {selectedStudents.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#e5e1fe]/40 border border-[#e5e1fe] rounded-xl animate-in slide-in-from-top-2 w-fit">
                <span className="text-xs font-bold text-[#655ac1] bg-[#e5e1fe] px-3 py-1 rounded-lg">
                    {selectedStudents.size} محدد
                </span>
                <span className="text-xs font-bold text-slate-500">
                  من إجمالي {filteredStudents.length} طالب
                </span>
                <button
                  onClick={() => setSelectedStudents(new Set())}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  title="إلغاء التحديد"
                >
                  <X size={14} />
                </button>
            </div>
           )}

          {/* Bulk Delete Confirmation Modal */}
          {showBulkDeleteConfirm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 flex items-start gap-3">
                  <Trash2 size={28} className="text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <h2 className="text-xl font-black text-slate-800 mb-2">حذف الطلاب المحددين</h2>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                      سيتم حذف <span className="font-black text-rose-500">{selectedStudents.size}</span> طالب محدد. هل تريد المتابعة؟
                    </p>
                  </div>
                </div>
                <div className="p-6 pt-0 flex gap-3">
                  <button
                    onClick={() => setShowBulkDeleteConfirm(false)}
                    className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete All Confirmation Modal */}
          {showDeleteAllConfirm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 flex items-start gap-3">
                  <Trash2 size={28} className="text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <h2 className="text-xl font-black text-slate-800 mb-2">حذف الكل</h2>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                      سيتم حذف جميع الطلاب (<span className="font-black text-rose-500">{schoolStudents.length}</span>) بشكل نهائي. هل تريد المتابعة؟
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
                    onClick={handleDeleteAll}
                    className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
                  >
                    حذف
                  </button>
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
                            selectionMode={selectionMode}
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

      {/* ══════ Print Options Modal (matches Step7 Admins) ══════ */}
      {showPrintModal && (() => {
        const availableGrades = [...new Set(schoolClasses.map(c => c.grade))].sort((a, b) => a - b);
        const gradeOptions: DropdownOption[] = availableGrades.map(g => ({ value: String(g), label: `الصف ${g}` }));
        const classOptions: DropdownOption[] = schoolClasses.map(c => ({
          value: c.id,
          label: `${c.name || `${c.grade}/${c.section}`} — الصف ${c.grade}`,
        }));

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

        const options: Array<{ value: 'all' | 'grade' | 'class'; label: string }> = [
          { value: 'all', label: 'طباعة جميع الطلاب' },
          { value: 'grade', label: 'طباعة طلاب صف محدد' },
          { value: 'class', label: 'طباعة طلاب فصل محدد' },
        ];

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
            <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                    <Printer size={22} className="text-[#655ac1]" />
                    طباعة الطلاب
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">اختر نطاق الطباعة المطلوب.</p>
                </div>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {options.map(opt => {
                  const on = printSelection.type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setPrintSelection({ type: opt.value, gradeValue: '', classId: '' })}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-black transition-all ${on ? 'border-slate-200 text-[#655ac1]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span>{opt.label}</span>
                      <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${on ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'}`}>
                        <Check size={12} strokeWidth={3.5} />
                      </span>
                    </button>
                  );
                })}

                {/* Grade dropdown */}
                {printSelection.type === 'grade' && (
                  <div className="pt-1">
                    <p className="text-[11px] font-bold text-slate-400 mb-2 px-1">اختر الصف</p>
                    <StudentDropdown
                      value={printSelection.gradeValue === '' ? '' : String(printSelection.gradeValue)}
                      onChange={v => setPrintSelection(prev => ({ ...prev, gradeValue: v ? parseInt(v) : '' }))}
                      options={gradeOptions}
                      placeholder="اختر الصف"
                    />
                  </div>
                )}

                {/* Class dropdown */}
                {printSelection.type === 'class' && (
                  <div className="pt-1">
                    <p className="text-[11px] font-bold text-slate-400 mb-2 px-1">اختر الفصل</p>
                    <StudentDropdown
                      value={printSelection.classId}
                      onChange={v => setPrintSelection(prev => ({ ...prev, classId: v }))}
                      options={classOptions}
                      placeholder="اختر الفصل"
                    />
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmPrint}
                  disabled={!canPrint}
                  className="flex-1 px-4 py-2.5 bg-[#655ac1] text-white text-sm font-bold rounded-xl hover:bg-[#5448a8] shadow-md shadow-[#655ac1]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  طباعة
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════ Missing Data Modal (Inline Editing) ══════ */}
      {showMissingDataModal && (() => {
        const availableGrades = [...new Set(schoolClasses.map(c => c.grade))].sort((a, b) => a - b);
        const gradeOptions: DropdownOption[] = availableGrades.map(g => ({ value: String(g), label: `الصف ${g}` }));

        // Helper: update a single student field inline
        const updateField = (id: string, patch: Partial<Student>) => {
          setStudents(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
        };

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

              {/* Header — clean, icon w/o background */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                    <AlertTriangle size={22} className="text-[#655ac1]" />
                    البيانات الناقصة
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    {studentsWithMissingData.length} طالب — يمكنك التعديل المباشر هنا
                  </p>
                </div>
                <button
                  onClick={() => setShowMissingDataModal(false)}
                  className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Stats (neutral) */}
              <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-3 gap-3 shrink-0">
                {[
                  { label: 'بدون صف', count: studentsWithMissingData.filter(s => !s.grade).length },
                  { label: 'بدون فصل', count: studentsWithMissingData.filter(s => !s.classId).length },
                  { label: 'بدون رقم ولي الأمر', count: studentsWithMissingData.filter(s => !s.parentPhone).length },
                ].map(({ label, count }) => (
                  <div key={label} className="text-center p-3 bg-white rounded-2xl border border-slate-200">
                    <div className="text-xl font-black text-[#655ac1]">{count}</div>
                    <div className="text-xs font-bold text-slate-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Table — inline editable */}
              <div className="overflow-y-auto custom-scrollbar flex-1">
                {studentsWithMissingData.length === 0 ? (
                  <div className="p-12 text-center">
                    <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500" />
                    <p className="font-bold text-slate-700">جميع البيانات مكتملة</p>
                    <p className="text-xs text-slate-400 font-bold mt-1">لا يوجد طلاب بحاجة لتحديث</p>
                  </div>
                ) : (
                  <table className="w-full text-right">
                    <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
                      <tr>
                        <th className="p-3 text-xs font-black text-slate-500 w-12 text-center">م</th>
                        <th className="p-3 text-xs font-black text-slate-500 min-w-[180px]">اسم الطالب</th>
                        <th className="p-3 text-center text-xs font-black text-slate-500 w-36">الصف</th>
                        <th className="p-3 text-center text-xs font-black text-slate-500 w-44">الفصل</th>
                        <th className="p-3 text-center text-xs font-black text-slate-500 w-48">رقم ولي الأمر</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentsWithMissingData.map((student, idx) => {
                        const classOpts: DropdownOption[] = schoolClasses
                          .filter(c => student.grade ? c.grade === student.grade : true)
                          .map(c => ({ value: c.id, label: c.name || `${c.grade}/${c.section}` }));
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="p-3 text-xs font-bold text-slate-300 text-center">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-700 whitespace-nowrap">{student.name}</td>
                            <td className="p-3">
                              <StudentDropdown
                                compact
                                value={student.grade ? String(student.grade) : ''}
                                onChange={v => updateField(student.id, { grade: parseInt(v), classId: '' })}
                                options={gradeOptions}
                                placeholder={!student.grade ? 'اختر الصف' : `الصف ${student.grade}`}
                              />
                            </td>
                            <td className="p-3">
                              <StudentDropdown
                                compact
                                value={student.classId}
                                onChange={v => updateField(student.id, { classId: v })}
                                options={classOpts}
                                placeholder={classOpts.length === 0 ? 'اختر الصف أولاً' : 'اختر الفصل'}
                                disabled={classOpts.length === 0}
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="tel"
                                dir="ltr"
                                placeholder="05xxxxxxxx"
                                defaultValue={student.parentPhone || ''}
                                onBlur={e => {
                                  const v = e.target.value.trim();
                                  if (v !== (student.parentPhone || '')) {
                                    updateField(student.id, { parentPhone: v || undefined });
                                  }
                                }}
                                className={`w-full px-3 py-2 bg-white border-2 rounded-xl outline-none text-xs font-bold text-center transition-all focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20 ${
                                  !student.parentPhone ? 'border-rose-200 placeholder:text-rose-300' : 'border-slate-200'
                                }`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
                <button
                  onClick={() => setShowMissingDataModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => { setShowMissingDataModal(false); showToast('تم حفظ التعديلات'); }}
                  className="flex-1 px-4 py-2.5 bg-[#655ac1] text-white text-sm font-bold rounded-xl hover:bg-[#5448a8] shadow-md shadow-[#655ac1]/20 transition-all"
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 flex items-start gap-3">
                <Trash2 size={28} className="text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-xl font-black text-slate-800 mb-2">حذف {label}</h2>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    سيتم حذف <span className="font-black text-rose-500">{targetStudents.length}</span> طالب. هل تريد المتابعة؟
                  </p>
                </div>
              </div>
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={() => setGradeDeleteTarget(null)}
                  className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDeleteGradeOrClass}
                  className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════ Single Student Delete Confirmation ══════ */}
      {studentToDelete && (() => {
        const target = students.find(s => s.id === studentToDelete);
        if (!target) return null;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 flex items-start gap-3">
                <Trash2 size={28} className="text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-xl font-black text-slate-800 mb-2">حذف الطالب</h2>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    سيتم حذف الطالب <span className="font-black text-slate-700">{target.name}</span> بشكل نهائي. هل تريد المتابعة؟
                  </p>
                </div>
              </div>
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={() => setStudentToDelete(null)}
                  className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => { handleDeleteOne(studentToDelete); setStudentToDelete(null); }}
                  className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════ Data Edit Modal ══════ */}
      {showDataEditModal && (() => {
        const availableGrades = [...new Set(schoolClasses.map(c => c.grade))].sort((a, b) => a - b);
        const gradeOptions: DropdownOption[] = availableGrades.map(g => ({ value: String(g), label: gradeLabel(g) }));
        const classOptions = (dataEditGrade === '' ? schoolClasses : schoolClasses.filter(c => c.grade === dataEditGrade)).map(c => ({
          value: c.id,
          label: c.name || `${c.grade}/${c.section}`,
        }));
        const q = normalizeArabic(dataEditSearch.trim().toLowerCase());
        const selectableStudents = schoolStudents.filter(s => {
          const matchesSearch = !q || normalizeArabic(s.name).toLowerCase().includes(q) || (s.parentPhone || '').includes(dataEditSearch.trim()) || (s.nationalId || '').includes(dataEditSearch.trim());
          const matchesGrade = dataEditGrade === '' || s.grade === dataEditGrade;
          const matchesClass = !dataEditClassId || s.classId === dataEditClassId;
          return matchesSearch && matchesGrade && matchesClass;
        }).sort((a, b) => a.grade !== b.grade ? a.grade - b.grade : a.name.localeCompare(b.name, 'ar'));
        const selectedDrafts = Array.from(dataEditSelectedIds)
          .map(id => dataEditDrafts[id])
          .filter((draft): draft is StudentEditDraft => !!draft);

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[92vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                    <Edit2 size={20} className="text-[#655ac1]" />
                    تعديل البيانات
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">ابحث عن طالب أو اختر الصف والفصل ثم عدّل البيانات مباشرة.</p>
                </div>
                <button
                  onClick={() => setShowDataEditModal(false)}
                  className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  title="إغلاق"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] min-h-0 flex-1">
                <div className="border-l border-slate-100 p-5 space-y-4 bg-slate-50/40 overflow-y-auto custom-scrollbar">
                  <div className="relative">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={dataEditSearch}
                      onChange={e => setDataEditSearch(e.target.value)}
                      placeholder="ابحث باسم الطالب أو رقم الجوال"
                      className="w-full pr-10 pl-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                    <StudentDropdown
                      value={dataEditGrade === '' ? '' : String(dataEditGrade)}
                      onChange={v => { setDataEditGrade(v ? parseInt(v) : ''); setDataEditClassId(''); }}
                      options={gradeOptions}
                      placeholder="اختر الصف"
                      emptyLabel="كل الصفوف"
                    />
                    <StudentDropdown
                      value={dataEditClassId}
                      onChange={setDataEditClassId}
                      options={classOptions}
                      placeholder="اختر الفصل"
                      emptyLabel="كل الفصول"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-500">الطلاب</span>
                      <span className="text-[11px] font-black text-[#655ac1] border border-slate-200 bg-white px-2.5 py-1 rounded-full">{dataEditSelectedIds.size} محدد</span>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                      {selectableStudents.length === 0 ? (
                        <div className="py-8 text-center text-xs font-bold text-slate-400">لا توجد نتائج مطابقة</div>
                      ) : selectableStudents.map(student => {
                        const selected = dataEditSelectedIds.has(student.id);
                        return (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => toggleDataEditStudent(student)}
                            className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${selected ? 'border-slate-300 bg-white' : 'border-transparent hover:bg-slate-50'}`}
                          >
                            <span className="min-w-0">
                              <span className={`block text-sm font-black truncate ${selected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{student.name}</span>
                              <span className={`block text-[11px] font-bold truncate ${selected ? 'text-slate-400' : 'text-[#655ac1]'}`}>{`الصف ${gradeLabel(student.grade)} - الفصل ${getClassName(student.classId)}`}</span>
                            </span>
                            <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 ${selected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'}`}>
                              <Check size={12} strokeWidth={3.5} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 flex flex-col">
                  {selectedDrafts.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                      <Users size={42} className="text-slate-300 mb-3" />
                      <p className="font-black text-slate-700">اختر طالبًا أو مجموعة طلاب</p>
                      <p className="text-xs font-bold text-slate-400 mt-1">ستظهر البيانات القابلة للتعديل هنا مباشرة.</p>
                    </div>
                  ) : (
                    <div className="overflow-y-auto custom-scrollbar flex-1">
                      <table className="w-full table-fixed text-right">
                        <thead className="sticky top-0 z-10 bg-white border-b border-slate-200">
                          <tr>
                            <th className="p-3 text-xs font-black text-[#655ac1] w-12 text-center">م</th>
                            <th className="p-3 text-xs font-black text-[#655ac1]">اسم الطالب</th>
                            <th className="p-3 text-xs font-black text-[#655ac1] w-32 text-center">الصف</th>
                            <th className="p-3 text-xs font-black text-[#655ac1] w-32 text-center">الفصل</th>
                            <th className="p-3 text-xs font-black text-[#655ac1] w-36 text-center">رقم ولي الأمر</th>
                            <th className="p-3 text-xs font-black text-[#655ac1] w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedDrafts.map((draft, idx) => {
                            const rowClassOptions = schoolClasses
                              .filter(c => c.grade === draft.grade)
                              .map(c => ({ value: c.id, label: c.name || `${c.grade}/${c.section}` }));
                            return (
                              <tr key={draft.id} className="hover:bg-slate-50/60">
                                <td className="p-3 text-center">
                                  <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 flex items-center justify-center rounded-full mx-auto">
                                    {idx + 1}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <input
                                    value={draft.name}
                                    onChange={e => updateDataEditDraft(draft.id, { name: e.target.value })}
                                    className="w-full min-w-0 px-3 py-2 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20"
                                  />
                                </td>
                                <td className="p-3">
                                  <StudentDropdown
                                    compact
                                    value={String(draft.grade)}
                                    onChange={v => updateDataEditDraft(draft.id, { grade: parseInt(v), classId: '' })}
                                    options={gradeOptions}
                                    placeholder="اختر الصف"
                                  />
                                </td>
                                <td className="p-3">
                                  <StudentDropdown
                                    compact
                                    value={draft.classId}
                                    onChange={v => updateDataEditDraft(draft.id, { classId: v })}
                                    options={rowClassOptions}
                                    placeholder="اختر الفصل"
                                    disabled={rowClassOptions.length === 0}
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    value={draft.parentPhone}
                                    onChange={e => updateDataEditDraft(draft.id, { parentPhone: e.target.value })}
                                    dir="ltr"
                                    placeholder="05xxxxxxxx"
                                    className="w-full min-w-0 px-3 py-2 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-bold text-center text-slate-700 focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20"
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setDataEditSelectedIds(prev => { const next = new Set(prev); next.delete(draft.id); return next; })}
                                    className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-sm shadow-rose-500/20"
                                    title="إزالة من التحديد"
                                  >
                                    <X size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-white">
                <button
                  onClick={() => setShowDataEditModal(false)}
                  className="px-6 py-2.5 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  إغلاق
                </button>
                <button
                  onClick={handleDataEditSave}
                  disabled={dataEditSelectedIds.size === 0}
                  className="px-6 py-2.5 bg-[#655ac1] text-white text-sm font-bold rounded-xl hover:bg-[#5448a8] shadow-md shadow-[#655ac1]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
                >
                  <SaveCheckIcon />
                  حفظ
                </button>
              </div>

              {showDataEditConfirm && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={28} className="text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <h2 className="text-xl font-black text-slate-800 mb-2">تأكيد حفظ التعديلات</h2>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">سيتم حفظ تعديلات {dataEditSelectedIds.size} طلاب. هل تريد المتابعة؟</p>
                      </div>
                    </div>
                    <div className="pt-6 flex gap-3">
                      <button onClick={() => setShowDataEditConfirm(false)} className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors">إلغاء</button>
                    <button onClick={applyDataEditSave} className="flex-1 px-4 py-3 bg-[#655ac1] hover:bg-[#5448a8] text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-[#655ac1]/20 inline-flex items-center justify-center gap-2"><SaveCheckIcon /> حفظ</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══════ Student Transfer Modal ══════ */}
      {showBulkEditModal && (() => {
        const availableGrades = [...new Set(schoolClasses.map(c => c.grade))].sort((a, b) => a - b);
        const gradeOptions: DropdownOption[] = availableGrades.map(g => ({ value: String(g), label: `الصف ${g}` }));
        const sourceClassOptions: DropdownOption[] = schoolClasses
          .filter(c => bulkEditScopeGrade === '' || c.grade === bulkEditScopeGrade)
          .map(c => ({
          value: c.id,
          label: c.name || `${c.grade}/${c.section}`,
        }));
        const q = normalizeArabic(transferSearch.trim().toLowerCase());
        const selectedTransferStudents = schoolStudents.filter(s => transferSelectedIds.has(s.id));
        const selectedTransferGrades = new Set(selectedTransferStudents.map(s => s.grade));
        const selectedTransferGrade = selectedTransferGrades.size === 1 ? Array.from(selectedTransferGrades)[0] : null;
        const selectedCurrentClassIds = new Set(selectedTransferStudents.map(s => s.classId).filter(Boolean));
        const sourceGradeCount = bulkEditScopeGrade === '' ? 0 : schoolStudents.filter(s => s.grade === bulkEditScopeGrade).length;
        const sourceClass = schoolClasses.find(c => c.id === bulkEditScopeClassId);
        const sourceClassCount = bulkEditScopeClassId ? schoolStudents.filter(s => s.classId === bulkEditScopeClassId).length : 0;
        const sourceGradeClasses = bulkEditScopeGrade === '' ? [] : schoolClasses.filter(c => c.grade === bulkEditScopeGrade);
        const sourceGradeClassCounts = sourceGradeClasses.map(c => ({
          classInfo: c,
          count: schoolStudents.filter(s => s.classId === c.id).length,
        }));
        const transferCandidates = schoolStudents.filter(s => {
          const matchesSearch = !q || normalizeArabic(s.name).toLowerCase().includes(q) || (s.parentPhone || '').includes(transferSearch.trim()) || (s.nationalId || '').includes(transferSearch.trim());
          const matchesGrade = bulkEditScopeGrade === '' || s.grade === bulkEditScopeGrade;
          const matchesClass = !bulkEditScopeClassId || s.classId === bulkEditScopeClassId;
          const matchesSelectedGrade = selectedTransferGrade === null || s.grade === selectedTransferGrade || transferSelectedIds.has(s.id);
          return matchesSearch && matchesGrade && matchesClass && matchesSelectedGrade;
        }).sort((a, b) => a.grade !== b.grade ? a.grade - b.grade : a.name.localeCompare(b.name, 'ar'));
        const targetClassOptions: DropdownOption[] = schoolClasses
          .filter(c => selectedTransferGrade !== null && c.grade === selectedTransferGrade && !selectedCurrentClassIds.has(c.id))
          .map(c => ({
          value: c.id,
          label: c.name || `${c.grade}/${c.section}`,
        }));

        const canApply = !!bulkEditTargetClassId && transferSelectedIds.size > 0 && selectedTransferGrade !== null;
        const destinationClass = schoolClasses.find(c => c.id === bulkEditTargetClassId);
        const destinationCurrentCount = destinationClass ? schoolStudents.filter(s => s.classId === destinationClass.id).length : 0;
        const destinationAfterCount = destinationClass ? destinationCurrentCount + transferSelectedIds.size : 0;
        const transferSelectableIds = transferCandidates.filter(s => selectedTransferGrade === null || s.grade === selectedTransferGrade).map(s => s.id);
        const allTransferCandidatesSelected = transferSelectableIds.length > 0 && transferSelectableIds.every(id => transferSelectedIds.has(id));

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                    <ArrowLeftRight size={20} className="text-[#655ac1]" />
                    نقل طالب
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">اختر طالبًا أو مجموعة طلاب ثم انقلهم إلى فصل آخر.</p>
                </div>
                <button
                  onClick={() => setShowBulkEditModal(false)}
                  className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  title="إغلاق"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] min-h-0 flex-1">
                <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
                  <div className="relative">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={transferSearch}
                      onChange={e => { setTransferSearch(e.target.value); setTransferGlobalSelectWarning(false); }}
                      placeholder="ابحث باسم الطالب أو رقم الجوال"
                      className="w-full pr-10 pl-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <StudentDropdown
                      value={bulkEditScopeGrade === '' ? '' : String(bulkEditScopeGrade)}
                      onChange={v => { setBulkEditScopeGrade(v ? parseInt(v) : ''); setBulkEditScopeClassId(''); setTransferSelectedIds(new Set()); setBulkEditTargetClassId(''); setTransferGlobalSelectWarning(false); }}
                      options={gradeOptions}
                      placeholder="اختر الصف"
                      emptyLabel="كل الصفوف"
                    />
                    <StudentDropdown
                      value={bulkEditScopeClassId}
                      onChange={v => { setBulkEditScopeClassId(v); setTransferSelectedIds(new Set()); setBulkEditTargetClassId(''); setTransferGlobalSelectWarning(false); }}
                      options={sourceClassOptions}
                      placeholder="اختر الفصل الحالي"
                      emptyLabel="كل الفصول"
                    />
                  </div>
                  {transferGlobalSelectWarning && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 leading-relaxed">
                      لا يمكن اختيار كل الطلاب في جميع الصفوف والفصول لنقلهم. اختر صفًا أو فصلًا محددًا أولًا.
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-500">اختر الطلاب</span>
                        {bulkEditScopeGrade !== '' && (
                          <span className="text-[11px] font-black text-[#655ac1] border border-slate-200 bg-white px-2.5 py-1 rounded-full">
                            الصف {gradeLabel(bulkEditScopeGrade)}
                          </span>
                        )}
                        {sourceClass && (
                          <span className="text-[11px] font-black text-[#655ac1] border border-slate-200 bg-white px-2.5 py-1 rounded-full">
                            الفصل {sourceClass.name || `${sourceClass.grade}/${sourceClass.section}`}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!transferSearch.trim() && bulkEditScopeGrade === '' && !bulkEditScopeClassId && transferCandidates.length === schoolStudents.length) {
                            setTransferGlobalSelectWarning(true);
                            return;
                          }
                          const baseGrade = selectedTransferGrade ?? transferCandidates[0]?.grade;
                          const nextIds = transferCandidates.filter(s => s.grade === baseGrade).map(s => s.id);
                          const allSelected = nextIds.length > 0 && nextIds.every(id => transferSelectedIds.has(id));
                          setTransferSelectedIds(prev => {
                            const next = new Set(prev);
                            nextIds.forEach(id => { if (allSelected) next.delete(id); else next.add(id); });
                            return next;
                          });
                          setBulkEditTargetClassId('');
                        }}
                        disabled={transferCandidates.length === 0}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed ${allTransferCandidatesSelected ? 'bg-[#655ac1] border-[#655ac1] text-white shadow-sm shadow-[#655ac1]/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {allTransferCandidatesSelected ? 'إلغاء الكل' : 'اختر الكل'}
                      </button>
                    </div>
                    <div className="max-h-[430px] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                      {transferCandidates.length === 0 ? (
                        <div className="py-10 text-center text-xs font-bold text-slate-400">لا توجد نتائج مطابقة</div>
                      ) : transferCandidates.map(student => {
                        const selected = transferSelectedIds.has(student.id);
                        const disabled = selectedTransferGrade !== null && student.grade !== selectedTransferGrade && !selected;
                        return (
                          <button
                            key={student.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => { toggleTransferStudent(student); setBulkEditTargetClassId(''); }}
                            className={`w-full text-right px-4 py-3 transition-all flex items-center justify-between gap-3 disabled:opacity-40 disabled:cursor-not-allowed ${selected ? 'bg-[#f5f3ff]' : 'hover:bg-slate-50'}`}
                          >
                            <span className="min-w-0">
                              <span className={`block text-sm font-black truncate ${selected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{student.name}</span>
                              <span className={`block text-[11px] font-bold truncate ${selected ? 'text-slate-400' : 'text-[#655ac1]'}`}>{`الصف ${gradeLabel(student.grade)} - الفصل ${getClassName(student.classId)}`}</span>
                            </span>
                            <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 ${selected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'}`}>
                              <Check size={12} strokeWidth={3.5} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="border-r border-slate-100 bg-slate-50/40 p-5 space-y-4 overflow-y-auto custom-scrollbar">
                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-black text-slate-400">الطلاب المحددون</p>
                      <span className="text-[11px] font-black text-[#655ac1] border border-slate-200 bg-white px-2.5 py-1 rounded-full">{transferSelectedIds.size} محدد</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">يمكن نقل الطلاب داخل الصف نفسه فقط.</p>
                  </div>
                  {(bulkEditScopeGrade !== '' || sourceClass) && (
                    <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
                      <p className="text-xs font-black text-slate-400">أعداد الطلاب</p>
                      {bulkEditScopeGrade !== '' && (
                        <div className="flex items-center justify-between gap-2 text-xs font-bold">
                          <span className="text-slate-500">الصف {gradeLabel(bulkEditScopeGrade)}</span>
                          <span className="text-[#655ac1]">{sourceGradeCount} طالب</span>
                        </div>
                      )}
                      {sourceClass && (
                        <div className="flex items-center justify-between gap-2 text-xs font-bold">
                          <span className="text-slate-500">الفصل {sourceClass.name || `${sourceClass.grade}/${sourceClass.section}`}</span>
                          <span className="text-[#655ac1]">{sourceClassCount} طالب</span>
                        </div>
                      )}
                      {bulkEditScopeGrade !== '' && !sourceClass && sourceGradeClassCounts.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {sourceGradeClassCounts.map(({ classInfo, count }) => (
                            <span key={classInfo.id} className="text-[10px] font-black text-[#655ac1] border border-slate-200 bg-white px-2 py-1 rounded-full text-center">
                              {classInfo.name || `${classInfo.grade}/${classInfo.section}`}: {count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 mb-2 px-1">الفصل المنقول له الطالب</p>
                    <StudentDropdown
                      value={bulkEditTargetClassId}
                      onChange={setBulkEditTargetClassId}
                      options={targetClassOptions}
                      placeholder={selectedTransferGrade === null ? 'اختر الطلاب أولًا' : 'اختر الفصل'}
                      disabled={selectedTransferGrade === null || targetClassOptions.length === 0}
                    />
                  </div>

                  {transferSelectedIds.size > 0 && destinationClass && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-bold text-amber-700 leading-relaxed">
                        سيتم نقل <span className="font-black">{transferSelectedIds.size}</span> طالب إلى فصل <span className="font-black">{destinationClass.name || `${destinationClass.grade}/${destinationClass.section}`}</span>.
                      </p>
                      <p className="text-[11px] font-black text-amber-700 mt-2">
                        العدد الحالي: {destinationCurrentCount} | بعد النقل: {destinationAfterCount}
                      </p>
                    </div>
                  )}
                  {transferSelectedIds.size > 0 && targetClassOptions.length === 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-700 leading-relaxed">
                      لا يوجد فصل آخر متاح في الصف نفسه يمكن النقل إليه.
                    </div>
                  )}
                  <div className="flex-1" />
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowBulkEditModal(false)}
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      إغلاق
                    </button>
                    <button
                      onClick={() => setShowTransferConfirm(true)}
                      disabled={!canApply}
                      className="flex-1 px-4 py-2.5 bg-[#655ac1] text-white text-sm font-bold rounded-xl hover:bg-[#5448a8] shadow-md shadow-[#655ac1]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
                    >
                      <SaveCheckIcon />
                      نقل
                    </button>
                  </div>
                </div>
              </div>

              {showTransferConfirm && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                    <div className="flex items-start gap-3">
                      <ArrowLeftRight size={28} className="text-[#655ac1] mt-0.5 shrink-0" />
                      <div>
                        <h2 className="text-xl font-black text-slate-800 mb-2">تأكيد نقل الطلاب</h2>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">
                          سيتم نقل {transferSelectedIds.size} طالب إلى فصل {destinationClass?.name || (destinationClass ? `${destinationClass.grade}/${destinationClass.section}` : '')}. هل تريد المتابعة؟
                        </p>
                      </div>
                    </div>
                    <div className="pt-6 flex gap-3">
                      <button onClick={() => setShowTransferConfirm(false)} className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors">إلغاء</button>
                      <button onClick={handleBulkEditApply} className="flex-1 px-4 py-3 bg-[#655ac1] hover:bg-[#5448a8] text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-[#655ac1]/20 inline-flex items-center justify-center gap-2"><SaveCheckIcon /> نقل</button>
                    </div>
                  </div>
                </div>
              )}
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
              setStudentToDelete(actionDropdown.studentId);
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
