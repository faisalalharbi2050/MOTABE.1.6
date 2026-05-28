import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Teacher, Specialization, SchoolInfo, ScheduleSettingsData, ClassInfo } from '../../../types';
import { BookOpen, Plus, X, Upload, Trash2, Edit, Edit2, Edit3, Pen, Pencil, Check, ChevronDown, ChevronUp, Search, Printer, List, User, UserPlus, Users, GripVertical, AlertTriangle, CheckCircle2, ArrowUp, ArrowDown, Copy, CheckSquare, Square, Sliders, Info, AlertCircle, Settings2, Link2, Unlink, MoreHorizontal } from 'lucide-react';
import { INITIAL_SPECIALIZATIONS } from '../../../constants';
import { parseTeachersExcel, TeacherData } from '../../../utils/excelTeachers';
import SchoolTabs from '../SchoolTabs';
import TeacherConstraintsModal from '../../teachers/TeacherConstraintsModal';
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

type TeacherEditDraft = {
  id: string;
  name: string;
  specializationId: string;
  phone: string;
  lessons: number;
  waiting: number;
};

const SaveCheckIcon = ({ className = "bg-[#655ac1]" }: { className?: string }) => (
  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border border-white ${className}`}>
    <Check size={13} strokeWidth={3.2} className="text-white" />
  </span>
);

const TeachersPrintHeader: React.FC<{ schoolInfo: SchoolInfo }> = ({ schoolInfo }) => {
  const currentSemester =
    schoolInfo.semesters?.find(s => s.id === schoolInfo.currentSemesterId) ??
    schoolInfo.semesters?.[0];

  return (
    <div className="teachers-print-header hidden print:block" dir="rtl">
      <div className="teachers-print-header-wrapper">
        <div className="teachers-print-header-right">
          <p>المملكة العربية السعودية</p>
          <p>وزارة التعليم</p>
          <p>{schoolInfo.region || 'إدارة التعليم بالمنطقة'}</p>
          <p>مدرسة {schoolInfo.schoolName || '..........'}</p>
          <p>الفصل الدراسي: {currentSemester?.name || ''}</p>
        </div>

        <div className="teachers-print-header-center">
          {schoolInfo.logo ? (
            <img src={schoolInfo.logo} alt="شعار المدرسة" />
          ) : (
            <div className="teachers-print-logo-placeholder">شعار</div>
          )}
        </div>

        <div className="teachers-print-header-left">
          <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
          <p>العام الدراسي: {schoolInfo.academicYear || ''}</p>
        </div>
      </div>

      <h1>بيان بأسماء المعلمين</h1>
    </div>
  );
};

const TeacherSelectDropdown: React.FC<{
  value?: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
}> = ({ value, options, onChange, placeholder = 'اختر', compact = false }) => {
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

  const btnSize = compact ? 'px-3 py-2 text-xs' : 'px-5 py-3.5 text-[13px]';
  const chevSize = compact ? 14 : 16;

  return (
    <div className="relative w-full" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full ${btnSize} bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 ${open ? 'ring-2 ring-[#8779fb]/20 border-[#655ac1]/40' : ''}`}
      >
        <span className="truncate leading-tight">{selected?.name || placeholder}</span>
        <ChevronDown size={chevSize} className={`text-[#655ac1] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute z-50 top-full mt-2 right-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 ${compact ? 'min-w-[14rem]' : 'left-0'}`}>
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {options.map(opt => {
              const active = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center justify-between gap-3 ${active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}
                >
                  <span className="whitespace-nowrap">{opt.name}</span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                    <Check size={12} strokeWidth={3.5} />
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

// Shared row renderer: black name, gray-bg spec chip, gray-bordered quota chips with purple label + gray numbers
const renderTeacherRow = (
  t: Teacher,
  getSpecializationName: (id: string) => string,
  getSchoolQuota: (t: Teacher) => { lessons: number; waiting: number; total: number }
) => {
  const q = getSchoolQuota(t);
  return (
    <div className="flex-1 flex items-center gap-2 text-sm min-w-0 flex-wrap px-1">
      <span className="text-slate-900 font-bold truncate">{t.name}</span>
      <span className="text-[11px] font-bold text-slate-500 px-2 py-0.5 rounded-md bg-slate-100">{getSpecializationName(t.specializationId)}</span>
      <span className="inline-block w-3" aria-hidden="true" />
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md border border-slate-200 text-[#655ac1]">
        الحصص {q.lessons}
      </span>
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md border border-slate-200 text-[#655ac1]">
        الانتظار {q.waiting}
      </span>
    </div>
  );
};

// Compute dropdown placement (flip up if not enough space below)
const computeDropdownPos = (btn: HTMLElement, panelHeight = 320, minWidth = 360) => {
  const r = btn.getBoundingClientRect();
  const spaceBelow = window.innerHeight - r.bottom;
  const spaceAbove = r.top;
  const placeAbove = spaceBelow < panelHeight + 16 && spaceAbove > spaceBelow;
  const width = Math.max(r.width, minWidth);
  const maxH = Math.max(180, (placeAbove ? spaceAbove : spaceBelow) - 16);
  const top = placeAbove ? Math.max(8, r.top - Math.min(maxH, panelHeight) - 8) : r.bottom + 8;
  const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
  return { top, left, width, maxH, placeAbove };
};

const SourceTeacherDropdown: React.FC<{
  teachers: Teacher[];
  value: string;
  onChange: (id: string) => void;
  getSpecializationName: (id: string) => string;
  getSchoolQuota: (t: Teacher) => { lessons: number; waiting: number; total: number };
}> = ({ teachers, value, onChange, getSpecializationName, getSchoolQuota }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxH: number } | null>(null);
  const selected = teachers.find(t => t.id === value);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const tgt = e.target as Node;
      if (wrapRef.current && !wrapRef.current.contains(tgt)) {
        const panel = document.querySelector('[data-source-teacher-panel]');
        if (!panel || !panel.contains(tgt)) setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  useEffect(() => {
    if (open && btnRef.current) {
      setPos(computeDropdownPos(btnRef.current, 360, 380));
    }
  }, [open]);
  const term = search.toLowerCase().trim();
  const filtered = teachers.filter(t =>
    !term ||
    t.name.toLowerCase().includes(term) ||
    getSpecializationName(t.specializationId).toLowerCase().includes(term)
  );
  return (
    <div className="relative w-full" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 text-sm ${open ? 'ring-2 ring-[#8779fb]/20 border-[#655ac1]/40' : ''}`}
      >
        <span className="truncate text-right">
          {selected ? `${selected.name} - ${getSpecializationName(selected.specializationId)}` : 'اختر المعلم...'}
        </span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && ReactDOM.createPortal(
        <div
          data-source-teacher-panel
          dir="rtl"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxH, zIndex: 99999 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 flex flex-col"
        >
          <div className="relative mb-2 shrink-0">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-[#655ac1]/40"
            />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1 min-h-0">
            {filtered.length === 0 ? (
              <div className="text-center py-6 text-xs font-bold text-slate-400">لا توجد نتائج</div>
            ) : filtered.map(t => {
              const active = t.id === value;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { onChange(active ? '' : t.id); setOpen(false); }}
                  className="w-full flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  {renderTeacherRow(t, getSpecializationName, getSchoolQuota)}
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors shrink-0 ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
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

const TargetTeachersDropdown: React.FC<{
  teachers: Teacher[];
  selected: string[];
  onChange: (next: string[]) => void;
  getSpecializationName: (id: string) => string;
  getSchoolQuota: (t: Teacher) => { lessons: number; waiting: number; total: number };
  search: string;
  setSearch: (v: string) => void;
}> = ({ teachers, selected, onChange, getSpecializationName, getSchoolQuota, search, setSearch }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxH: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const tgt = e.target as Node;
      if (wrapRef.current && !wrapRef.current.contains(tgt)) {
        const panel = document.querySelector('[data-target-teachers-panel]');
        if (!panel || !panel.contains(tgt)) setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  useEffect(() => {
    if (open && btnRef.current) {
      setPos(computeDropdownPos(btnRef.current, 380, 380));
    }
  }, [open]);
  const term = search.toLowerCase().trim();
  const filtered = teachers.filter(t =>
    !term ||
    t.name.toLowerCase().includes(term) ||
    getSpecializationName(t.specializationId).toLowerCase().includes(term)
  );
  const allSelected = filtered.length > 0 && filtered.every(t => selected.includes(t.id));
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };
  return (
    <div className="relative w-full" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 text-sm ${open ? 'ring-2 ring-[#8779fb]/20 border-[#655ac1]/40' : ''}`}
      >
        <span className="truncate text-right">
          {selected.length === 0 ? 'اختر المعلمين...' : `تم تحديد (${selected.length})`}
        </span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && ReactDOM.createPortal(
        <div
          data-target-teachers-panel
          dir="rtl"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxH, zIndex: 99999 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 flex flex-col"
        >
          <div className="relative mb-2 shrink-0">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-[#655ac1]/40"
            />
          </div>
          <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-black">
              <span className="text-slate-500">المعلمون</span>
              <span className="text-slate-800">{filtered.length}</span>
              <span className="w-px h-3.5 bg-slate-200" />
              <span className="text-[#655ac1]">المحدد {selected.length}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (allSelected) onChange(selected.filter(id => !filtered.some(t => t.id === id)));
                else onChange(Array.from(new Set([...selected, ...filtered.map(t => t.id)])));
              }}
              className={`px-3 py-1 rounded-lg border text-[10px] font-black transition-colors ${allSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-[#655ac1] hover:text-[#655ac1]'}`}
            >
              {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1 min-h-0">
            {filtered.length === 0 ? (
              <div className="text-center py-6 text-xs font-bold text-slate-400">لا توجد نتائج</div>
            ) : filtered.map(t => {
              const active = selected.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className="w-full flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  {renderTeacherRow(t, getSpecializationName, getSchoolQuota)}
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors shrink-0 ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
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

// Normalize Arabic names so common variants compare as equal
const normalizeArabicName = (raw: string): string => {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/[ً-ٰٟ]/g, '')   // remove tashkeel/diacritics
    .replace(/ـ/g, '')                         // remove tatweel
    .replace(/[إأآا]/g, 'ا')                  // unify alef variants
    .replace(/ة/g, 'ه')                       // ta marbuta -> ha
    .replace(/ى/g, 'ي')                       // alef maqsura -> ya
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .toLowerCase();
};

const Step6Teachers: React.FC<Step6Props> = ({ teachers = [], setTeachers, specializations = [], schoolInfo, scheduleSettings, setScheduleSettings, classes }) => {
  // State
  const [activeSchoolId, setActiveSchoolId] = useState<string>('main');
  const [searchTerm, setSearchTerm] = useState("");
  
  // Multi-select for Specializations
  const [filterSpecializations, setFilterSpecializations] = useState<string[]>([]);
  const [isSpecDropdownOpen, setIsSpecDropdownOpen] = useState(false);
  const specDropdownRef = useRef<HTMLDivElement>(null);
  const specDropdownPanelRef = useRef<HTMLDivElement>(null);
  const specDropdownBtnRef = useRef<HTMLButtonElement>(null);
  const [specDropdownPos, setSpecDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

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
  const teachersSnapshot = useRef<string>("");

  // Data Edit Modal State
  const [showDataEditModal, setShowDataEditModal] = useState(false);
  const [showDataEditConfirm, setShowDataEditConfirm] = useState(false);
  const [dataEditSearch, setDataEditSearch] = useState('');
  const [dataEditSpecId, setDataEditSpecId] = useState('');
  const [dataEditSelectedIds, setDataEditSelectedIds] = useState<Set<string>>(new Set());
  const [dataEditDrafts, setDataEditDrafts] = useState<Record<string, TeacherEditDraft>>({});

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
  const [copyMode, setCopyMode] = useState<'teacher' | 'manual'>('teacher');
  const [sourceTeacher, setSourceTeacher] = useState<Teacher | null>(null);
  const [copyOptions, setCopyOptions] = useState({ basic: true, waiting: true });
  const [manualQuotaValues, setManualQuotaValues] = useState({ basic: 0, waiting: 0 });
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
  const [deleteModalSearch, setDeleteModalSearch] = useState('');
  const [deleteModalSpecFilter, setDeleteModalSpecFilter] = useState('');
  const [deleteWholeSpecConfirm, setDeleteWholeSpecConfirm] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [deleteSelectedSpecIds, setDeleteSelectedSpecIds] = useState<string[]>([]);
  const [deleteSelectedTeacherIds, setDeleteSelectedTeacherIds] = useState<string[]>([]);
  const [showDeleteSelectedConfirm, setShowDeleteSelectedConfirm] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printScope, setPrintScope] = useState<'all' | 'spec' | ''>('all');
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
  const [importReviewSearch, setImportReviewSearch] = useState('');

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

  const openDataEditModal = () => {
      if (currentSchoolTeachers.length === 0) {
          showToast('لا يوجد معلمون في القائمة للتعديل', 'warning');
          return;
      }
      setDataEditSelectedIds(new Set());
      setDataEditDrafts({});
      setDataEditSearch('');
      setDataEditSpecId('');
      setShowDataEditConfirm(false);
      setShowDataEditModal(true);
  };

  const toggleDataEditTeacher = (teacher: Teacher) => {
      setDataEditSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(teacher.id)) {
              next.delete(teacher.id);
          } else {
              next.add(teacher.id);
              const quota = getSchoolQuota(teacher);
              setDataEditDrafts(drafts => ({
                  ...drafts,
                  [teacher.id]: drafts[teacher.id] || {
                      id: teacher.id,
                      name: teacher.name || '',
                      specializationId: teacher.specializationId || '',
                      phone: teacher.phone || '',
                      lessons: quota.lessons,
                      waiting: quota.waiting,
                  },
              }));
          }
          return next;
      });
  };

  const updateDataEditDraft = (id: string, patch: Partial<TeacherEditDraft>) => {
      setDataEditDrafts(prev => {
          const current = prev[id];
          if (!current) return prev;
          return { ...prev, [id]: { ...current, ...patch } };
      });
  };

  const applyDataEditSave = () => {
      const ids = Array.from(dataEditSelectedIds);
      if (ids.length === 0) {
          showToast('اختر معلمًا واحدًا على الأقل للحفظ', 'error');
          return;
      }
      const patches = new Map(
          ids
              .map(id => [id, dataEditDrafts[id]] as const)
              .filter((entry): entry is readonly [string, TeacherEditDraft] => !!entry[1])
      );
      setTeachers(prev => prev.map(t => {
          const patch = patches.get(t.id);
          if (!patch) return t;
          const updated: Teacher = {
              ...t,
              name: patch.name.trim() || t.name,
              specializationId: patch.specializationId || t.specializationId,
              phone: patch.phone.trim(),
              quotaLimit: patch.lessons,
              waitingQuota: patch.waiting,
          };
          if (t.schools?.length) {
              updated.schools = t.schools.map(s =>
                  s.schoolId === activeSchoolId ? { ...s, lessons: patch.lessons, waiting: patch.waiting } : s
              );
          }
          return updated;
      }));
      setShowDataEditConfirm(false);
      setShowDataEditModal(false);
      showToast(`تم حفظ بيانات ${patches.size} معلم`);
  };

  const handleDataEditSave = () => {
      if (dataEditSelectedIds.size > 1) {
          setShowDataEditConfirm(true);
          return;
      }
      applyDataEditSave();
  };

  const handleBulkEditToggle = () => {
      if (!isBulkEdit) {
          if (currentSchoolTeachers.length === 0) {
              showToast('لا يوجد معلمون في القائمة للتعديل', 'warning');
              return;
          }
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
        const rowNorm = normalizeArabicName(row.name);
        const exactMatch   = teachers.find(t => normalizeArabicName(t.name) === rowNorm);
        const partialMatch = !exactMatch && teachers.find(t => {
          const ex = normalizeArabicName(t.name).split(' ').filter(Boolean);
          const inc = rowNorm.split(' ').filter(Boolean);
          if (ex.length === 0 || inc.length === 0) return false;
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
      const quota = getSchoolQuota(teacher);
      setCopyMode('teacher');
      setSourceTeacher(teacher);
      setManualQuotaValues({ basic: quota.lessons, waiting: quota.waiting });
      setSelectedTargets([]);
      setCopyTargetMode('teachers');
      setCopyTargetSpecIds([]);
      setCopyOptions({ basic: true, waiting: true });
      setCopySearchTerm("");
      setShowCopyModal(true);
  };

  const openCopyModalForSpec = (specId: string) => {
      const teacher = currentSchoolTeachers.find(t => t.specializationId === specId) || null;
      const quota = teacher ? getSchoolQuota(teacher) : { lessons: 0, waiting: 0 };
      setCopyMode('teacher');
      setSourceTeacher(teacher);
      setManualQuotaValues({ basic: quota.lessons, waiting: quota.waiting });
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
      if (copyMode === 'teacher' && !sourceTeacher) return;
      const targetIds = copyTargetMode === 'all'
          ? currentSchoolTeachers.filter(t => copyMode === 'manual' || t.id !== sourceTeacher?.id).map(t => t.id)
          : copyTargetMode === 'specs'
              ? currentSchoolTeachers.filter(t => (copyMode === 'manual' || t.id !== sourceTeacher?.id) && copyTargetSpecIds.includes(t.specializationId)).map(t => t.id)
              : selectedTargets;
      if (targetIds.length === 0) {
          showToast('اختر هدفاً واحداً على الأقل لتطبيق النصاب', 'warning');
          return;
      }
      
      setTeachers(prev => prev.map(t => {
          if (targetIds.includes(t.id)) {
              const sourceQuota = sourceTeacher ? getSchoolQuota(sourceTeacher) : null;
              const nextLessons = copyMode === 'manual' ? manualQuotaValues.basic : sourceQuota?.lessons ?? 0;
              const nextWaiting = copyMode === 'manual' ? manualQuotaValues.waiting : sourceQuota?.waiting ?? 0;
              if ((t.isShared || t.schools?.length) && t.schools?.some(s => s.schoolId === activeSchoolId)) {
                  return {
                      ...t,
                      schools: t.schools.map(s => s.schoolId === activeSchoolId ? {
                          ...s,
                          lessons: copyOptions.basic ? nextLessons : s.lessons,
                          waiting: copyOptions.waiting ? nextWaiting : s.waiting,
                      } : s),
                  };
              }
              return {
                  ...t,
                  quotaLimit: copyOptions.basic ? nextLessons : t.quotaLimit,
                  waitingQuota: copyOptions.waiting ? nextWaiting : t.waitingQuota
              };
          }
          return t;
      }));
      
      showToast(`تم تطبيق النصاب على ${targetIds.length} معلم`, 'success');
      setShowCopyModal(false);
  };

  const buildTeachersPrintStyles = (specId?: string) => `
    @page { size: A4 landscape; margin: 8mm; }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: #ffffff !important;
      }

      .teachers-print-header {
        display: block !important;
        margin-bottom: 14px !important;
        font-family: 'Tajawal', 'Arial', sans-serif !important;
        color: #1e293b !important;
      }

      .teachers-print-header-wrapper {
        display: flex !important;
        justify-content: space-between !important;
        align-items: flex-start !important;
        border-bottom: 2px solid #1e293b !important;
        padding-bottom: 14px !important;
        margin-bottom: 8px !important;
      }

      .teachers-print-header-right,
      .teachers-print-header-left {
        width: 33% !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        line-height: 1.8 !important;
        color: #1e293b !important;
      }

      .teachers-print-header-right { text-align: right !important; }
      .teachers-print-header-left { text-align: left !important; }

      .teachers-print-header-center {
        width: 33% !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
      }

      .teachers-print-header-center img {
        width: 56px !important;
        height: 56px !important;
        object-fit: contain !important;
      }

      .teachers-print-logo-placeholder {
        width: 56px !important;
        height: 56px !important;
        border: 2px solid #cbd5e1 !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 9px !important;
        color: #94a3b8 !important;
      }

      .teachers-print-header h1 {
        margin: 8px 0 14px !important;
        text-align: center !important;
        color: #1e293b !important;
        font-size: 18px !important;
        font-weight: 900 !important;
      }

      .teacher-spec-card {
        display: block !important;
        margin-bottom: 14px !important;
        overflow: hidden !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 16px !important;
        box-shadow: none !important;
        background: #ffffff !important;
      }

      ${specId ? `
      .teacher-spec-card { display: none !important; }
      .teacher-spec-card[data-spec-id="${specId}"] { display: block !important; }
      ` : ''}

      .teacher-spec-card > div:first-child {
        background: linear-gradient(to left, rgba(248, 250, 252, 0.55), #ffffff) !important;
        border-bottom: 1px solid #f1f5f9 !important;
        padding: 12px 16px !important;
      }

      .teacher-spec-card h4 {
        color: #1e293b !important;
        font-size: 15px !important;
        font-weight: 900 !important;
      }

      .teacher-spec-card table {
        width: 100% !important;
        min-width: 0 !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
        table-layout: fixed !important;
        font-size: 11px !important;
        border: 1px solid #f1f5f9 !important;
        border-radius: 14px !important;
        overflow: hidden !important;
      }

      .teacher-spec-card thead tr {
        background: rgba(248, 250, 252, 0.8) !important;
        border-bottom: 1px solid #e2e8f0 !important;
      }

      .teacher-spec-card th {
        padding: 9px 7px !important;
        color: #655ac1 !important;
        font-size: 11px !important;
        font-weight: 900 !important;
        line-height: 1.45 !important;
        border-left: 1px solid #e2e8f0 !important;
        background: rgba(248, 250, 252, 0.8) !important;
      }

      .teacher-spec-card td {
        padding: 8px 7px !important;
        color: #334155 !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        line-height: 1.45 !important;
        border-left: 1px solid #f1f5f9 !important;
        border-bottom: 1px solid #f1f5f9 !important;
        background: #ffffff !important;
      }

      .teacher-spec-card th:last-child,
      .teacher-spec-card td:last-child {
        border-left: 0 !important;
      }

      .teacher-spec-card tbody tr:last-child td {
        border-bottom: 0 !important;
      }

      .teacher-spec-card tbody tr:nth-child(even) td {
        background: #f8fafc !important;
      }

      .teacher-spec-card tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  `;

  const handlePrint = () => {
      const style = document.createElement('style');
      style.id = 'print-portrait-override';
      style.innerHTML = buildTeachersPrintStyles();
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
      style.innerHTML = buildTeachersPrintStyles(specId);
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
      if (currentSchoolTeachers.length === 0) {
          showToast('لا يوجد معلمون للحذف', 'warning');
          return;
      }
      setDeleteSelectedSpecIds([]);
      setDeleteSelectedTeacherIds([]);
      setDeleteModalSearch('');
      setDeleteModalSpecFilter('');
      setDeleteWholeSpecConfirm(false);
      setShowDeleteSelectedConfirm(false);
      setDeleteSelectedModalOpen(true);
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
      const target = event.target as HTMLElement | null;
      if (target && !target.closest('[data-spec-filter-anchor]') && !target.closest('[data-spec-filter-panel]')) {
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
      return (copyMode === 'manual' || t.id !== sourceTeacher?.id) && (
          !term
          || t.name.toLowerCase().includes(term)
          || getTeacherShortName(t).toLowerCase().includes(term)
          || getSpecializationName(t.specializationId).toLowerCase().includes(term)
      );
  });

  const copyTargetCount = copyTargetMode === 'all'
      ? currentSchoolTeachers.filter(t => copyMode === 'manual' || t.id !== sourceTeacher?.id).length
      : copyTargetMode === 'specs'
          ? currentSchoolTeachers.filter(t => (copyMode === 'manual' || t.id !== sourceTeacher?.id) && copyTargetSpecIds.includes(t.specializationId)).length
          : selectedTargets.length;

  const copyActionDisabled =
      (copyMode === 'teacher' && !sourceTeacher)
      || (!copyOptions.basic && !copyOptions.waiting)
      || copyTargetCount === 0
      || (copyTargetMode === 'teachers' && selectedTargets.length === 0)
      || (copyTargetMode === 'specs' && copyTargetSpecIds.length === 0);

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

        <div dir="rtl" className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-2 justify-between">
          {/* Right group — primary actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              dir="rtl"
              onClick={() => fileInputRef.current?.click()}
              className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white font-bold text-sm transition-all"
            >
              <Upload size={16} className="text-slate-400 group-hover:text-white transition-colors" />
              {loading ? 'جاري الاستيراد...' : 'استيراد من Excel'}
            </button>
            <button
              dir="rtl"
              onClick={openAddModal}
              className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white font-bold text-sm transition-all"
            >
              <UserPlus size={17} className="text-slate-400 group-hover:text-white transition-colors" />
              إضافة معلم
            </button>
            <button
              dir="rtl"
              onClick={() => openTeacherConstraints()}
              disabled={currentSchoolTeachers.length === 0}
              className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sliders size={16} className="text-slate-400 group-hover:text-white transition-colors" />
              قيود المعلمون
            </button>
            <button
              dir="rtl"
              onClick={() => {
                setCopyMode('teacher');
                setSourceTeacher(null);
                setCopyTargetMode('specs');
                setCopyTargetSpecIds([]);
                setSelectedTargets([]);
                setCopyOptions({ basic: true, waiting: true });
                setManualQuotaValues({ basic: 0, waiting: 0 });
                setCopySearchTerm("");
                setShowCopyModal(true);
              }}
              disabled={currentSchoolTeachers.length === 0}
              className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Copy size={16} className="text-slate-400 group-hover:text-white transition-colors" />
              تطبيق النصاب
            </button>
          </div>

          {/* Visual divider between right and left groups */}
          <div className="hidden lg:block w-px h-9 bg-slate-200" aria-hidden="true" />

          {/* Left group — table actions */}
          <div className="flex flex-wrap items-center gap-2">
            {!teacherDeleteSelectionMode && (
              <>
                <button
                  dir="rtl"
                  onClick={openDataEditModal}
                  disabled={currentSchoolTeachers.length === 0}
                  className="group flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 border disabled:opacity-40 disabled:cursor-not-allowed bg-white text-slate-600 border-slate-200 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white"
                  title="تعديل بيانات معلم أو مجموعة معلمين"
                >
                  <Edit2 size={15} className="text-slate-400 group-hover:text-white transition-colors" />
                  تعديل البيانات
                </button>
                {!isBulkEdit && (
                  <button
                    dir="rtl"
                    onClick={() => { setPrintScope('all'); setPrintSpecId(getUsedSpecializationIds()[0] || ''); setShowPrintModal(true); }}
                    disabled={filteredTeachers.length === 0}
                    className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    title="طباعة القائمة الحالية"
                  >
                    <Printer size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                    طباعة
                  </button>
                )}
              </>
            )}
            {!isBulkEdit && (
              <button
                dir="rtl"
                onClick={openDeleteSelectedModal}
                disabled={currentSchoolTeachers.length === 0}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border disabled:opacity-40 disabled:cursor-not-allowed bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600"
                title="حذف معلم أو مجموعة معلمين"
              >
                <Trash2 size={16} className="text-rose-500" />
                حذف
              </button>
            )}
          </div>
        </div>

        {showDeleteSelectedConfirm && teacherDeleteSelectionMode && (
          <div data-teacher-delete-inline-confirm className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700 text-center">
            هل أنت متأكد من حذف العناصر المحددة؟ اضغط نعم، احذف المحدد للتأكيد.
          </div>
        )}

        <div dir="rtl" className="relative z-[70] bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-3 overflow-visible">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث باسم المعلم أو الاختصار أو التخصص..."
              className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20 transition-all text-slate-600 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <X size={16} />
              </button>
            )}
          </div>

          <div data-spec-filter-anchor className="w-full lg:w-64 shrink-0 relative z-[90]" ref={specDropdownRef}>
            <button
              ref={specDropdownBtnRef}
              onClick={() => {
                if (!isSpecDropdownOpen && specDropdownBtnRef.current) {
                  const r = specDropdownBtnRef.current.getBoundingClientRect();
                  setSpecDropdownPos({ top: r.bottom + 8, left: r.left, width: Math.max(r.width, 240) });
                }
                setIsSpecDropdownOpen(!isSpecDropdownOpen);
              }}
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

            {isSpecDropdownOpen && specDropdownPos && ReactDOM.createPortal(
              <div
                data-spec-filter-panel
                ref={specDropdownPanelRef}
                dir="rtl"
                style={{ position: 'fixed', top: specDropdownPos.top, left: specDropdownPos.left, width: specDropdownPos.width, zIndex: 99999 }}
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5"
              >
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
                          selected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                        }`}>
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
        </div>
      </div>

      {/* â•گâ•گâ•گâ•گâ•گâ•گ Teachers List (print:table wrapper makes header repeat on every page) â•گâ•گâ•گâ•گâ•گâ•گ */}
      <div className="print:table print:w-full">

        {/* Repeating print header â€” hidden on screen */}
        <div className="hidden print:table-header-group">
          <div className="print:table-row">
            <div className="print:table-cell" style={{ padding: 0 }}>
              <TeachersPrintHeader schoolInfo={schoolInfo} />
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
                <div key={specId} data-spec-id={specId} className="teacher-spec-card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-2 print:border-slate-800 print:rounded-none print:break-inside-avoid">
                     {/* Section Header */}
                     <div className="bg-white px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-50/50 to-white print:bg-slate-100 print:from-slate-100 print:to-slate-100 print:border-slate-800 print:py-2">
                        <div className="flex items-center gap-3">
                            {teacherDeleteSelectionMode && (() => {
                              const groupTeacherIds = group.map(t => t.id);
                              const on = deleteSelectedSpecIds.includes(specId);
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (on) {
                                      setDeleteSelectedSpecIds(prev => prev.filter(id => id !== specId));
                                      setDeleteSelectedTeacherIds(prev => prev.filter(id => !groupTeacherIds.includes(id)));
                                    } else {
                                      setDeleteSelectedSpecIds(prev => [...prev, specId]);
                                      setDeleteSelectedTeacherIds(prev => Array.from(new Set([...prev, ...groupTeacherIds])));
                                    }
                                  }}
                                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-all shrink-0 ${on ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-2 border-slate-300 text-transparent hover:border-rose-300'}`}
                                >
                                  {on && <Check size={12} strokeWidth={3.5} />}
                                </button>
                              );
                            })()}
                            <div className="w-1.5 h-6 bg-[#655ac1] rounded-full print:bg-slate-900" />
                            <h4 className="font-black text-slate-800 text-lg print:text-base">
                                {getSpecializationName(specId)} 
                                <span className="mr-2 px-2.5 py-0.5 bg-slate-100 text-[#655ac1] rounded-full text-sm font-black print:border print:border-slate-400 print:text-slate-900">{group.length}</span>
                            </h4>
                        </div>
                        <div className="flex items-center gap-1 print:hidden">
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
                                   <th className="px-3 py-4 w-[14%] text-center text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:text-xs">التخصص</th>
                                   <th className="px-3 py-4 w-[15%] text-center text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:text-xs">الاسم المختصر</th>
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
                                    const editRows = isBulkEdit || editingTeacherId === t.id;
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
                                                    {teacherDeleteSelectionMode && (() => {
                                                      const on = deleteSelectedTeacherIds.includes(t.id);
                                                      return (
                                                        <button
                                                          type="button"
                                                          onClick={() => setDeleteSelectedTeacherIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                                                          className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-all shrink-0 ${on ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-2 border-slate-300 text-transparent hover:border-rose-300'}`}
                                                        >
                                                          {on && <Check size={12} strokeWidth={3.5} />}
                                                        </button>
                                                      );
                                                    })()}
                                                    <span className="text-sm group-hover:text-[#655ac1] transition-colors print:text-black">{t.name}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 align-middle text-center print:border-l print:border-slate-300 print:p-1 print:text-xs print:whitespace-nowrap">
                                            {editRows ? (
                                                <TeacherSelectDropdown
                                                    compact
                                                    value={t.specializationId}
                                                    options={specializationOptions.map(s => ({ id: s.id, name: s.name }))}
                                                    onChange={(value) => setTeachers(prev => prev.map(pt => pt.id === t.id ? { ...pt, specializationId: value } : pt))}
                                                />
                                            ) : (
                                                <span className="inline-flex min-h-8 items-center justify-center text-xs font-black text-slate-600 print:text-black">{getSpecializationName(t.specializationId)}</span>
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
                                                <span className="inline-flex min-h-8 items-center justify-center text-xs font-black text-slate-900 print:text-black">{getTeacherShortName(t) || '-'}</span>
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
                                                            const updated: Teacher = { ...pt, quotaLimit: val };
                                                            if (pt.schools?.length) {
                                                                updated.schools = pt.schools.map(s =>
                                                                    s.schoolId === activeSchoolId ? { ...s, lessons: val } : s
                                                                );
                                                            }
                                                            return updated;
                                                        }));
                                                    }}
                                                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm font-black text-slate-800 focus:outline-none focus:border-[#655ac1] text-center mx-auto"
                                                />
                                            ) : (
                                                <span className="inline-flex min-h-8 items-center justify-center text-sm font-black text-[#655ac1] print:text-black">
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
                                                            const updated: Teacher = { ...pt, waitingQuota: val };
                                                            if (pt.schools?.length) {
                                                                updated.schools = pt.schools.map(s =>
                                                                    s.schoolId === activeSchoolId ? { ...s, waiting: val } : s
                                                                );
                                                            }
                                                            return updated;
                                                        }));
                                                    }}
                                                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm font-black text-[#655ac1] focus:outline-none focus:border-[#655ac1] text-center mx-auto"
                                                />
                                            ) : (
                                                <span className="inline-flex min-h-8 items-center justify-center text-sm font-black text-[#655ac1] print:text-black">
                                                    {quota.waiting}
                                                </span>
                                            )}
                                        </td>
                                         <td className="px-3 py-3 text-center print:p-2">
                                            <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full border text-sm font-black print:bg-transparent print:text-black print:p-0 print:border-slate-300 ${hasQuotaWarning ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
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
                                                    <MoreHorizontal size={14} />
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
                    ? <Users size={36} className="mx-auto mb-5 text-slate-400" strokeWidth={1.6} />
                    : <Search size={36} className="mx-auto mb-5 text-slate-400" strokeWidth={1.6} />
                }
                <p className="text-slate-600 font-black text-lg mb-1">
                    {currentSchoolTeachers.length === 0 ? 'لا يوجد معلمون بعد' : 'لا يوجد معلمون يطابقون البحث'}
                </p>
                <p className="text-slate-400 text-sm">
                    {currentSchoolTeachers.length === 0
                        ? <>للبدء استخدم زر <span className="font-bold" style={{ color: '#655ac1' }}>استيراد من Excel</span> أو <span className="font-bold" style={{ color: '#655ac1' }}>إضافة معلم</span></>
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
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">الاسم المختصر</label>
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
                            <label className="block text-xs font-bold text-slate-500 mb-2 text-center">نصاب الحصص <span className="text-rose-500">*</span></label>
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
                            <label className="block text-xs font-bold text-slate-500 mb-2 text-center">نصاب الانتظار <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={currentTeacher.waitingQuota || 0}
                                    onChange={e => setCurrentTeacher({...currentTeacher, waitingQuota: Number(e.target.value)})}
                                    required
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xl font-black text-center focus:border-[#655ac1] focus:ring-4 focus:ring-[#e5e1fe] transition-all text-[#655ac1]"
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
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                  <Printer size={22} className="text-[#655ac1]" />
                  طباعة المعلمين
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">اختر نطاق الطباعة المطلوب.</p>
              </div>
              <button onClick={() => setShowPrintModal(false)} className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="إغلاق">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
              <button
                onClick={() => setPrintScope(printScope === 'all' ? '' as any : 'all')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-black transition-all ${printScope === 'all' ? 'border-slate-300 text-[#655ac1] bg-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span>طباعة الكل</span>
                <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${printScope === 'all' ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'}`}>
                  <Check size={12} strokeWidth={3.5} />
                </span>
              </button>
              <button
                onClick={() => setPrintScope(printScope === 'spec' ? '' as any : 'spec')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-black transition-all ${printScope === 'spec' ? 'border-slate-300 text-[#655ac1] bg-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span>طباعة تخصص محدد</span>
                <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${printScope === 'spec' ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'}`}>
                  <Check size={12} strokeWidth={3.5} />
                </span>
              </button>
              {printScope === 'spec' && (
                <div className="pt-1">
                  <p className="text-[11px] font-bold text-slate-400 mb-2 px-1">اختر التخصص</p>
                  <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1 custom-scrollbar">
                    {getUsedSpecializationIds().map(id => {
                      const on = printSpecId === id;
                      return (
                        <button
                          type="button"
                          key={id}
                          onClick={() => setPrintSpecId(on ? '' : id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right ${on ? 'border-slate-300 bg-white' : 'border-slate-100 hover:border-[#655ac1]/40'}`}
                        >
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-all shrink-0 ${on ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-2 border-slate-300 text-transparent'}`}>
                            {on && <Check size={12} strokeWidth={3.5} />}
                          </span>
                          <span className={`text-sm font-bold ${on ? 'text-[#655ac1]' : 'text-slate-700'}`}>{getSpecializationName(id)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
              <button onClick={() => setShowPrintModal(false)} className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors">
                إلغاء
              </button>
              <button
                onClick={executePrint}
                disabled={!printScope || (printScope === 'spec' && !printSpecId)}
                className="flex-1 px-4 py-2.5 bg-[#655ac1] text-white text-sm font-bold rounded-xl hover:bg-[#5448a8] shadow-md shadow-[#655ac1]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSelectedModalOpen && (() => {
        const usedSpecIds = getUsedSpecializationIds();
        const specFilterOptions: DropdownOption[] = [
          { id: '', name: 'كل التخصصات' },
          ...usedSpecIds.map(id => ({ id, name: getSpecializationName(id) })),
        ];
        const qRaw = deleteModalSearch.trim();
        const q = normalizeArabicName(qRaw.toLowerCase());
        const filteredTeachersForDelete = currentSchoolTeachers.filter(t => {
          const matchesSearch = !q
            || normalizeArabicName((t.name || '').toLowerCase()).includes(q)
            || (t.phone || '').includes(qRaw);
          const matchesSpec = !deleteModalSpecFilter || t.specializationId === deleteModalSpecFilter;
          return matchesSearch && matchesSpec;
        }).sort((a, b) => {
          if (a.specializationId !== b.specializationId) {
            return getSpecializationName(a.specializationId).localeCompare(getSpecializationName(b.specializationId), 'ar');
          }
          return (a.name || '').localeCompare(b.name || '', 'ar');
        });
        const selectedCount = deleteSelectedTeacherIds.length;
        const specTeacherCount = deleteModalSpecFilter
          ? currentSchoolTeachers.filter(t => t.specializationId === deleteModalSpecFilter).length
          : 0;
        const closeModal = () => {
          setDeleteSelectedModalOpen(false);
          setDeleteWholeSpecConfirm(false);
          setShowDeleteSelectedConfirm(false);
        };
        const deleteWholeSpec = () => {
          if (!deleteModalSpecFilter) return;
          const ids = new Set(currentSchoolTeachers.filter(t => t.specializationId === deleteModalSpecFilter).map(t => t.id));
          if (ids.size === 0) return;
          const specName = getSpecializationName(deleteModalSpecFilter);
          setTeachers(prev => prev.filter(t => !ids.has(t.id)));
          showToast(`تم حذف ${ids.size} معلم من تخصص ${specName}`, 'success');
          closeModal();
        };
        const deleteSelectedTeachers = () => {
          const ids = new Set(deleteSelectedTeacherIds);
          if (ids.size === 0) return;
          setTeachers(prev => prev.filter(t => !ids.has(t.id)));
          showToast(`تم حذف ${ids.size} معلم`, 'success');
          closeModal();
        };
        const toggleSelectAllVisible = () => {
          const visibleIds = filteredTeachersForDelete.map(t => t.id);
          const allSelected = visibleIds.length > 0 && visibleIds.every(id => deleteSelectedTeacherIds.includes(id));
          if (allSelected) {
            setDeleteSelectedTeacherIds(prev => prev.filter(id => !visibleIds.includes(id)));
          } else {
            setDeleteSelectedTeacherIds(prev => Array.from(new Set([...prev, ...visibleIds])));
          }
        };
        const visibleIds = filteredTeachersForDelete.map(t => t.id);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => deleteSelectedTeacherIds.includes(id));

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
            <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                    <Trash2 size={20} className="text-rose-500" />
                    حذف
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">ابحث أو فلتر بالتخصص، ثم حدد المعلمين للحذف.</p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  title="إغلاق"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-3 shrink-0 border-b border-slate-100 bg-slate-50/40">
                <div className="relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={deleteModalSearch}
                    onChange={e => setDeleteModalSearch(e.target.value)}
                    placeholder="ابحث باسم المعلم أو رقم الجوال"
                    className="w-full pr-10 pl-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 focus:border-rose-300 focus:ring-2 focus:ring-rose-200/40"
                  />
                </div>
                <TeacherSelectDropdown
                  value={deleteModalSpecFilter}
                  onChange={v => { setDeleteModalSpecFilter(v); setDeleteWholeSpecConfirm(false); }}
                  options={specFilterOptions}
                  placeholder="كل التخصصات"
                />
                {deleteModalSpecFilter && specTeacherCount > 0 && (
                  deleteWholeSpecConfirm ? (
                    <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-3 space-y-2">
                      <p className="text-xs font-black text-rose-700 text-center leading-relaxed">
                        سيتم حذف <span className="text-sm">{specTeacherCount}</span> معلم من تخصص {getSpecializationName(deleteModalSpecFilter)}. هل أنت متأكد؟
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeleteWholeSpecConfirm(false)}
                          className="flex-1 px-3 py-2 bg-white border border-slate-300 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50"
                        >
                          تراجع
                        </button>
                        <button
                          onClick={deleteWholeSpec}
                          className="flex-1 px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black rounded-lg shadow-sm shadow-rose-500/30"
                        >
                          نعم، احذف الكل
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteWholeSpecConfirm(true)}
                      className="w-full px-4 py-2.5 bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} />
                      حذف كامل معلمي {getSpecializationName(deleteModalSpecFilter)} ({specTeacherCount})
                    </button>
                  )
                )}
              </div>

              <div className="px-5 py-3 border-b border-slate-100 bg-white shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black">
                    <span className="text-slate-500">العدد الكلي</span>
                    <span className="text-slate-800">{filteredTeachersForDelete.length}</span>
                    <span className="w-px h-4 bg-slate-200" />
                    <span className="text-rose-600">المحدد {selectedCount}</span>
                  </div>
                  {filteredTeachersForDelete.length > 0 && (
                    <button
                      onClick={toggleSelectAllVisible}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 text-[11px] font-black transition-colors"
                    >
                      {allVisibleSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
                {filteredTeachersForDelete.length === 0 ? (
                  <div className="py-12 text-center text-xs font-bold text-slate-400">لا توجد نتائج مطابقة</div>
                ) : filteredTeachersForDelete.map(teacher => {
                  const selected = deleteSelectedTeacherIds.includes(teacher.id);
                  return (
                    <button
                      key={teacher.id}
                      type="button"
                      onClick={() => setDeleteSelectedTeacherIds(prev => selected ? prev.filter(id => id !== teacher.id) : [...prev, teacher.id])}
                      className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 mb-1 ${selected ? 'border-rose-300' : 'border-transparent hover:bg-slate-50'}`}
                    >
                      <span className="min-w-0">
                        <span className={`block text-sm font-black truncate ${selected ? 'text-rose-600' : 'text-slate-700'}`}>{teacher.name}</span>
                        <span className={`block text-[11px] font-bold truncate ${selected ? 'text-rose-400' : 'text-slate-400'}`}>{getSpecializationName(teacher.specializationId)}</span>
                      </span>
                      <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 ${selected ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-300 text-transparent'}`}>
                        <Check size={12} strokeWidth={3.5} />
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="px-5 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => { if (selectedCount === 0) return; setShowDeleteSelectedConfirm(true); }}
                  disabled={selectedCount === 0}
                  className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-black rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-rose-500/20"
                >
                  حذف
                </button>
              </div>

              {showDeleteSelectedConfirm && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-6 flex items-start gap-3">
                      <Trash2 size={28} className="text-rose-500 mt-0.5" />
                      <div>
                        <h2 className="text-xl font-black text-slate-800 mb-2">حذف المحدد</h2>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">
                          سيتم حذف {selectedCount} معلم. هل تريد المتابعة؟
                        </p>
                      </div>
                    </div>
                    <div className="p-6 pt-0 flex gap-3">
                      <button
                        onClick={() => setShowDeleteSelectedConfirm(false)}
                        className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={deleteSelectedTeachers}
                        className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Copy Quota Modal (Hidden in Print) */}
      {showCopyModal && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
                <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]">
                     {/* Header */}
                     <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                             <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
                                <Copy size={20} className="text-[#655ac1]" />
                                تطبيق النصاب
                             </h3>
                              <p className="text-xs text-slate-500 mt-1">انسخ نصاب الحصص أو الانتظار من معلم وطبقه على معلم أو مجموعة معلمين أو حدّد النصاب مباشرةً.</p>
                        </div>
                        <button onClick={() => setShowCopyModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all">
                            <X size={18} />
                        </button>
                     </div>

                     {/* Content */}
                     <div className="flex-1 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 'teacher' as const, label: 'نسخ من معلم' },
                              { id: 'manual' as const, label: 'تحديد النصاب' },
                            ].map(item => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setCopyMode(item.id);
                                  if (item.id === 'manual') setSourceTeacher(null);
                                  setSelectedTargets([]);
                                  setCopyTargetSpecIds([]);
                                }}
                                className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                                  copyMode === item.id
                                    ? 'bg-[#655ac1] border-[#655ac1] text-white shadow-sm shadow-[#655ac1]/20'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-[#655ac1]/40 hover:text-[#655ac1]'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>

                          {copyMode === 'teacher' ? (
                          <div>
                            <label className="block text-xs font-black text-slate-600 mb-2">اختر المعلم</label>
                            <SourceTeacherDropdown
                              teachers={currentSchoolTeachers}
                              value={sourceTeacher?.id || ''}
                              getSpecializationName={getSpecializationName}
                              getSchoolQuota={getSchoolQuota}
                              onChange={(id) => {
                                const teacher = currentSchoolTeachers.find(t => t.id === id) || null;
                                const quota = teacher ? getSchoolQuota(teacher) : { lessons: 0, waiting: 0 };
                                setSourceTeacher(teacher);
                                setManualQuotaValues({ basic: quota.lessons, waiting: quota.waiting });
                              }}
                            />
                          </div>
                          ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-black text-slate-600 mb-2">نصاب الحصص</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={24}
                                  value={manualQuotaValues.basic}
                                  onChange={e => setManualQuotaValues(prev => ({ ...prev, basic: Math.max(0, Number(e.target.value)) }))}
                                  className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-[#655ac1] outline-none focus:border-[#655ac1] text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-black text-slate-600 mb-2">نصاب الانتظار</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={24}
                                  value={manualQuotaValues.waiting}
                                  onChange={e => setManualQuotaValues(prev => ({ ...prev, waiting: Math.max(0, Number(e.target.value)) }))}
                                  className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-[#655ac1] outline-none focus:border-[#655ac1] text-center"
                                />
                              </div>
                            </div>
                            {(manualQuotaValues.basic + manualQuotaValues.waiting) > 24 && (
                              <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                <div className="w-7 h-7 shrink-0 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center">
                                  <AlertTriangle size={13} className="text-amber-600" />
                                </div>
                                <p className="text-xs font-bold text-amber-800 leading-snug">
                                  مجموع نصاب الحصص ونصاب الانتظار <span className="font-black text-amber-900">({manualQuotaValues.basic + manualQuotaValues.waiting})</span> يتجاوز 24 حصة في الأسبوع.
                                </p>
                              </div>
                            )}
                          </div>
                          )}

                          {(copyMode === 'manual' || sourceTeacher) && (
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <label className="block text-xs font-black text-slate-600 mb-2">اختر النصاب</label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { key: 'basic', label: 'نصاب الحصص', value: copyMode === 'manual' ? manualQuotaValues.basic : getSchoolQuota(sourceTeacher!).lessons },
                                { key: 'waiting', label: 'نصاب الانتظار', value: copyMode === 'manual' ? manualQuotaValues.waiting : getSchoolQuota(sourceTeacher!).waiting },
                              ].map(item => {
                                const active = copyOptions[item.key as 'basic' | 'waiting'];
                                return (
                                  <button
                                    key={item.key}
                                    onClick={() => setCopyOptions(prev => ({ ...prev, [item.key]: !active }))}
                                    className={`px-3 py-2 rounded-xl border text-sm font-bold transition-all flex items-center gap-2 bg-white border-slate-200 hover:border-slate-300 ${active ? 'text-[#655ac1]' : 'text-slate-500'}`}
                                  >
                                    <span>{item.label} <span className={active ? 'text-[#655ac1]' : 'text-slate-400'}>({item.value})</span></span>
                                    <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center transition-colors shrink-0 ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                                      <Check size={12} strokeWidth={3.5} />
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          )}

                          {(copyMode === 'manual' || sourceTeacher) && (
                          <div className="flex flex-col gap-3">
                               <label className="text-xs font-black text-slate-600">حدد الهدف</label>
                               <div className="flex flex-wrap gap-2">
                                 {[
                                   { id: 'teachers', label: 'معلمون' },
                                   { id: 'specs', label: 'تخصصات' },
                                   { id: 'all', label: 'الكل' },
                                 ].map(item => (
                                   <button
                                     key={item.id}
                                     onClick={() => setCopyTargetMode(item.id as 'teachers' | 'specs' | 'all')}
                                     className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${copyTargetMode === item.id ? 'bg-[#655ac1] border-[#655ac1] text-white shadow-sm shadow-[#655ac1]/20' : 'bg-white border-slate-200 text-slate-600 hover:border-[#655ac1]/40 hover:text-[#655ac1]'}`}
                                   >
                                     {item.label}
                                   </button>
                                 ))}
                               </div>
                               
                               {copyTargetMode === 'teachers' && (
                                 <TargetTeachersDropdown
                                   teachers={availableTargets}
                                   selected={selectedTargets}
                                   onChange={setSelectedTargets}
                                   getSpecializationName={getSpecializationName}
                                   getSchoolQuota={getSchoolQuota}
                                   search={copySearchTerm}
                                   setSearch={setCopySearchTerm}
                                 />
                               )}

                               {copyTargetMode === 'specs' && (
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl p-2">
                                   {getUsedSpecializationIds().map(id => {
                                     const selected = copyTargetSpecIds.includes(id);
                                     return (
                                       <button
                                         key={id}
                                         onClick={() => setCopyTargetSpecIds(prev => selected ? prev.filter(x => x !== id) : [...prev, id])}
                                         className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-bold transition-all bg-white border-slate-200 hover:border-slate-300 ${selected ? 'text-[#655ac1]' : 'text-slate-600'}`}
                                       >
                                         <span>{getSpecializationName(id)}</span>
                                         <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center transition-colors ${selected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                                           <Check size={12} strokeWidth={3.5} />
                                         </span>
                                       </button>
                                     );
                                   })}
                                 </div>
                               )}

                               {copyTargetMode === 'all' && (
                                 <div className="space-y-2">
                                   <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                     <div className="w-7 h-7 shrink-0 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center">
                                       <AlertTriangle size={13} className="text-amber-600" />
                                     </div>
                                     <p className="text-xs font-bold text-amber-800 leading-snug">
                                       سيتم تطبيق نصاب المعلم المحدد على جميع المعلمين
                                     </p>
                                   </div>
                                   <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                                     تم تحديد (<span className="text-[#655ac1]">{copyTargetCount}</span>) معلم
                                   </div>
                                 </div>
                               )}
                          </div>
                          )}
                     </div>

                     {/* Footer */}
                     <div className="p-6 bg-white flex gap-3 border-t border-slate-100 justify-end">
                         {copyTargetCount > 0 && copyOptions.basic && copyOptions.waiting && (copyMode === 'manual' ? manualQuotaValues.basic + manualQuotaValues.waiting : sourceTeacher ? getSchoolQuota(sourceTeacher).total : 0) > 24 && (
                           <div className="flex-1 flex items-center text-xs font-bold text-amber-700">
                             الإجمالي يتجاوز 24
                           </div>
                         )}
                         <button
                             onClick={() => setShowCopyModal(false)}
                             className="px-6 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                         >
                             إغلاق
                         </button>
                         <button 
                             onClick={executeCopyQuota}
                             disabled={copyActionDisabled}
                             className="px-6 py-3 bg-[#655ac1] text-white font-bold rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                         >
                             تطبيق النصاب
                         </button>
                     </div>
                </div>
           </div>
       )}
     {/* ══════ Data Edit Modal ══════ */}
     {showDataEditModal && (() => {
       const usedSpecIds = getUsedSpecializationIds();
       const specFilterOptions: DropdownOption[] = [
         { id: '', name: 'كل التخصصات' },
         ...usedSpecIds.map(id => ({ id, name: getSpecializationName(id) })),
       ];
       const allSpecOptions: DropdownOption[] = getSpecializationOptions();
       const qRaw = dataEditSearch.trim();
       const q = normalizeArabicName(qRaw.toLowerCase());
       const selectableTeachers = currentSchoolTeachers.filter(t => {
         const matchesSearch = !q
           || normalizeArabicName((t.name || '').toLowerCase()).includes(q)
           || (t.phone || '').includes(qRaw);
         const matchesSpec = !dataEditSpecId || t.specializationId === dataEditSpecId;
         return matchesSearch && matchesSpec;
       }).sort((a, b) => {
         if (a.specializationId !== b.specializationId) {
           return getSpecializationName(a.specializationId).localeCompare(getSpecializationName(b.specializationId), 'ar');
         }
         return (a.name || '').localeCompare(b.name || '', 'ar');
       });
       const selectedDrafts = Array.from(dataEditSelectedIds)
         .map(id => dataEditDrafts[id])
         .filter((draft): draft is TeacherEditDraft => !!draft);

       return (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[92vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
               <div>
                 <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                   <Edit2 size={20} className="text-[#655ac1]" />
                   تعديل البيانات
                 </h3>
                 <p className="text-xs text-slate-400 font-bold mt-1">ابحث عن معلم أو اختر التخصص ثم عدّل البيانات مباشرة.</p>
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
                     placeholder="ابحث باسم المعلم أو رقم الجوال"
                     className="w-full pr-10 pl-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20"
                   />
                 </div>
                 <TeacherSelectDropdown
                   value={dataEditSpecId}
                   onChange={setDataEditSpecId}
                   options={specFilterOptions}
                   placeholder="كل التخصصات"
                 />

                 <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                   <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                     <span className="text-xs font-black text-slate-500">المعلمون</span>
                     <span className="text-[11px] font-black text-[#655ac1] border border-slate-200 bg-white px-2.5 py-1 rounded-full">{dataEditSelectedIds.size} محدد</span>
                   </div>
                   <div className="max-h-[360px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                     {selectableTeachers.length === 0 ? (
                       <div className="py-8 text-center text-xs font-bold text-slate-400">لا توجد نتائج مطابقة</div>
                     ) : selectableTeachers.map(teacher => {
                       const selected = dataEditSelectedIds.has(teacher.id);
                       return (
                         <button
                           key={teacher.id}
                           type="button"
                           onClick={() => toggleDataEditTeacher(teacher)}
                           className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${selected ? 'border-slate-300 bg-white' : 'border-transparent hover:bg-slate-50'}`}
                         >
                           <span className="min-w-0">
                             <span className={`block text-sm font-black truncate ${selected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{teacher.name}</span>
                             <span className={`block text-[11px] font-bold truncate ${selected ? 'text-slate-400' : 'text-[#655ac1]'}`}>{getSpecializationName(teacher.specializationId)}</span>
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
                     <p className="font-black text-slate-700">اختر معلمًا أو مجموعة معلمين</p>
                     <p className="text-xs font-bold text-slate-400 mt-1">ستظهر البيانات القابلة للتعديل هنا مباشرة.</p>
                   </div>
                 ) : (
                   <div className="overflow-y-auto custom-scrollbar flex-1">
                     <table className="w-full table-fixed text-right">
                       <thead className="sticky top-0 z-10 bg-white border-b border-slate-200">
                         <tr>
                           <th className="p-3 text-xs font-black text-[#655ac1] w-12 text-center">م</th>
                           <th className="p-3 text-xs font-black text-[#655ac1]">الاسم</th>
                           <th className="p-3 text-xs font-black text-[#655ac1] w-40 text-center">التخصص</th>
                           <th className="p-3 text-xs font-black text-[#655ac1] w-36 text-center">رقم الجوال</th>
                           <th className="p-3 text-xs font-black text-[#655ac1] w-28 text-center">نصاب الحصص</th>
                           <th className="p-3 text-xs font-black text-[#655ac1] w-28 text-center">نصاب الانتظار</th>
                           <th className="p-3 text-xs font-black text-[#655ac1] w-12 text-center"></th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {selectedDrafts.map((draft, idx) => (
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
                               <TeacherSelectDropdown
                                 compact
                                 value={draft.specializationId}
                                 onChange={v => updateDataEditDraft(draft.id, { specializationId: v })}
                                 options={allSpecOptions}
                                 placeholder="اختر التخصص"
                               />
                             </td>
                             <td className="p-3">
                               <input
                                 value={draft.phone}
                                 onChange={e => updateDataEditDraft(draft.id, { phone: e.target.value })}
                                 dir="ltr"
                                 placeholder="05xxxxxxxx"
                                 className="w-full min-w-0 px-3 py-2 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-bold text-center text-slate-700 focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20"
                               />
                             </td>
                             <td className="p-3 text-center">
                               <input
                                 type="number"
                                 value={draft.lessons}
                                 onChange={e => updateDataEditDraft(draft.id, { lessons: Number(e.target.value) || 0 })}
                                 className="w-20 px-2 py-2 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-black text-center text-slate-800 focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20 mx-auto"
                               />
                             </td>
                             <td className="p-3 text-center">
                               <input
                                 type="number"
                                 value={draft.waiting}
                                 onChange={e => updateDataEditDraft(draft.id, { waiting: Number(e.target.value) || 0 })}
                                 className="w-20 px-2 py-2 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-black text-center text-[#655ac1] focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20 mx-auto"
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
                         ))}
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
                 className="min-w-32 px-8 py-3 bg-[#655ac1] text-white font-black text-sm rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
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
                       <p className="text-sm font-medium text-slate-500 leading-relaxed">سيتم حفظ تعديلات {dataEditSelectedIds.size} معلم. هل تريد المتابعة؟</p>
                     </div>
                   </div>
                   <div className="pt-6 flex gap-3">
                     <button onClick={() => setShowDataEditConfirm(false)} className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors">إلغاء</button>
                     <button onClick={applyDataEditSave} className="flex-1 py-4 bg-[#655ac1] text-white font-black text-sm rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 transition-all inline-flex items-center justify-center gap-2"><SaveCheckIcon /> حفظ</button>
                   </div>
                 </div>
               </div>
             )}
           </div>
         </div>
       );
     })()}

     {/* ══════ Teacher Constraints Modal ══════ */}
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
                 <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${allSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'}`}>
                   <Check size={12} strokeWidth={3.5} />
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
                       <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${selected ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-300 text-transparent'}`}>
                         <Check size={12} strokeWidth={3.5} />
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
      {/* Import Review Modal — redesigned */}
      {showImportReviewModal && (() => {
        const activeSchoolName = activeSchoolId === 'main'
          ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
          : schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId)?.name || activeSchoolId;
        const counts = importReviewItems.reduce(
          (acc, it) => { acc[it.choice] = (acc[it.choice] || 0) + 1; return acc; },
          { link: 0, add_new: 0, skip: 0 } as Record<'link'|'add_new'|'skip', number>
        );
        const term = importReviewSearch.trim().toLowerCase();
        const filteredItems = !term ? importReviewItems : importReviewItems.filter(it =>
          it.row.name.toLowerCase().includes(term) ||
          it.existing.name.toLowerCase().includes(term)
        );
        const updateItem = (idx: number, patch: Partial<typeof importReviewItems[number]>) =>
          setImportReviewItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
        const closeReview = () => {
          setShowImportReviewModal(false);
          setShowSelectAllConfirm(false);
          setImportReviewSearch('');
        };
        return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]">

            {/* Header — matches apply-quota modal style */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
                  <AlertCircle size={20} className="text-[#655ac1]" />
                  مراجعة المعلمين قبل الإضافة
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {importReviewItems.length} معلم/ة مطابق(ة) لمعلمين موجودين — حدّد الإجراء المناسب لكل واحد.
                </p>
              </div>
              <button onClick={closeReview} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all">
                <X size={18} />
              </button>
            </div>

            {/* School-context alert + grouped toolbar */}
            <div className="px-5 py-3 border-b border-slate-100 space-y-3 shrink-0">
              {activeSchoolId !== 'main' && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#655ac1]/20 bg-[#655ac1]/5">
                  <Info size={18} className="text-[#655ac1] shrink-0" />
                  <p className="text-sm font-bold text-slate-700 leading-snug">
                    سيتم الربط أو الإضافة في مدرسة <span className="text-[#655ac1] font-black">{activeSchoolName}</span>
                  </p>
                </div>
              )}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[#655ac1]">
                    سيُربط <span className="text-slate-700 mr-1">{counts.link}</span>
                  </span>
                  <span className="text-xs font-black px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[#655ac1]">
                    سيُضاف <span className="text-slate-700 mr-1">{counts.add_new}</span>
                  </span>
                  <span className="text-xs font-black px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[#655ac1]">
                    سيُتخطى <span className="text-slate-700 mr-1">{counts.skip}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={importReviewSearch}
                      onChange={e => setImportReviewSearch(e.target.value)}
                      placeholder="بحث في القائمة..."
                      className="w-full pr-9 pl-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-[#655ac1]/40"
                    />
                  </div>
                  {!showSelectAllConfirm ? (
                    <button
                      onClick={() => setShowSelectAllConfirm(true)}
                      className="shrink-0 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all bg-white border-slate-200 text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white"
                    >
                      اعتبرهم جميعاً أشخاصاً مختلفين
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-slate-500">تأكيد؟</span>
                      <button
                        onClick={() => { setImportReviewItems(prev => prev.map(i => ({ ...i, choice: i.matchType === 'id' ? 'skip' : 'add_new' }))); setShowSelectAllConfirm(false); }}
                        className="px-3 py-2 rounded-xl border text-[11px] font-bold transition-all bg-[#655ac1] border-[#655ac1] text-white hover:bg-[#5448a8]"
                      >
                        نعم، تابع
                      </button>
                      <button
                        onClick={() => setShowSelectAllConfirm(false)}
                        className="px-3 py-2 rounded-xl border text-[11px] font-bold transition-all bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      >
                        إلغاء
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 p-4 space-y-3 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="text-center py-10 text-xs font-bold text-slate-400">لا توجد نتائج</div>
              ) : filteredItems.map((item) => {
                const idx = importReviewItems.indexOf(item);
                const isId = item.matchType === 'id';
                const isPartial = item.matchType === 'partial_name';
                const badgeText = isId ? 'نفس رقم الهوية' : isPartial ? 'اسم مشابه' : 'نفس الاسم';
                const badgeClass = isId
                  ? 'bg-[#655ac1] text-white'
                  : isPartial
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-[#655ac1]/10 text-[#655ac1] border border-[#655ac1]/30';
                const ex = item.existing;
                const rowSpec = item.row.specialization || 'أخرى';
                const rowPhone = item.row.mobile || '';
                const rowQ = item.row.weeklyQuota ?? 0;
                const rowW = item.row.waitingQuota ?? 0;
                const rowId = item.row.idNumber || '';
                return (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                    {/* Top: badge + name input */}
                    <div className="flex items-start gap-3">
                      <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-md ${badgeClass}`}>
                        {badgeText}
                      </span>
                      <div className="flex-1 min-w-0">
                        <input
                          value={item.row.name}
                          onChange={e => updateItem(idx, { row: { ...item.row, name: e.target.value } })}
                          className="w-full text-sm font-black text-slate-800 bg-transparent border-0 outline-none focus:bg-slate-50 focus:px-2 focus:py-1 focus:rounded-lg transition-all"
                          title="اسم المعلم/ة من ملف الإكسل (قابل للتعديل)"
                        />
                        <p className="text-[11px] text-slate-500 font-bold mt-0.5 truncate">
                          مطابق لـ <span className="text-[#655ac1] font-black">{ex.name}</span> في {item.existingSchoolName}
                        </p>
                      </div>
                    </div>

                    {/* Inline data chips — single value per chip, no colored background */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white">
                        <span className="text-slate-500">التخصص:</span>
                        <span className="text-[#655ac1]">{getSpecializationName(rowSpec)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white">
                        <span className="text-slate-500">الحصص:</span>
                        <span className="text-[#655ac1]">{rowQ}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white">
                        <span className="text-slate-500">الانتظار:</span>
                        <span className="text-[#655ac1]">{rowW}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white">
                        <span className="text-slate-500">الجوال:</span>
                        <span className="text-[#655ac1]" dir="ltr">{rowPhone || '—'}</span>
                      </span>
                      {rowId && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white">
                          <span className="text-slate-500">الهوية:</span>
                          <span className="text-[#655ac1]" dir="ltr">{rowId}</span>
                        </span>
                      )}
                    </div>

                    {/* Choices — separated with a clear visual gap */}
                    <div className="flex gap-2 pt-3 mt-1 border-t border-slate-100">
                      <button
                        onClick={() => updateItem(idx, { choice: 'link' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                          item.choice === 'link'
                            ? 'bg-[#655ac1] border-[#655ac1] text-white shadow-sm shadow-[#655ac1]/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-[#655ac1]/40 hover:text-[#655ac1]'
                        }`}
                      >
                        اربط (نفس المعلم)
                      </button>
                      {!isId && (
                        <button
                          onClick={() => updateItem(idx, { choice: 'add_new' })}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                            item.choice === 'add_new'
                              ? 'bg-[#655ac1] border-[#655ac1] text-white shadow-sm shadow-[#655ac1]/20'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-[#655ac1]/40 hover:text-[#655ac1]'
                          }`}
                        >
                          أضف كجديد
                        </button>
                      )}
                      <button
                        onClick={() => updateItem(idx, { choice: 'skip' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                          item.choice === 'skip'
                            ? 'bg-[#655ac1] border-[#655ac1] text-white shadow-sm shadow-[#655ac1]/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-[#655ac1]/40 hover:text-[#655ac1]'
                        }`}
                      >
                        تخطٍّ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={closeReview}
                className="px-6 py-2.5 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={() => { setImportReviewSearch(''); confirmImportReview(); }}
                className="px-6 py-2.5 bg-[#655ac1] text-white rounded-xl font-bold hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 transition-all text-sm"
              >
                تأكيد وإضافة
              </button>
            </div>
          </div>
        </div>
        );
      })()}

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
                    <div className="space-y-2">
                      {availableSchools.map(s => {
                        const on = linkSchoolSelectedId === s.id;
                        return (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => { setLinkSchoolSelectedId(s.id); setLinkSchoolDuplicate(''); setLinkSchoolLessons(0); setLinkSchoolWaiting(0); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right ${on ? 'border-[#655ac1]' : 'border-slate-100 hover:border-[#655ac1]/40'}`}
                          >
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-all shrink-0 ${on ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-2 border-slate-300 text-transparent'}`}>
                              {on && <Check size={12} strokeWidth={3.5} />}
                            </span>
                            <span className="text-sm font-bold text-slate-700">{s.name}</span>
                          </button>
                        );
                      })}
                    </div>
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
                 {schools.map(s => {
                   const on = unlinkSchoolSelectedId === s.schoolId;
                   return (
                     <button
                       type="button"
                       key={s.schoolId}
                       onClick={() => setUnlinkSchoolSelectedId(s.schoolId)}
                       className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right ${on ? 'border-rose-300' : 'border-slate-100 hover:border-rose-200'}`}
                     >
                       <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-all shrink-0 ${on ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-2 border-slate-300 text-transparent'}`}>
                         {on && <Check size={12} strokeWidth={3.5} />}
                       </span>
                       <span className="text-sm font-bold text-slate-700">{s.schoolName}</span>
                     </button>
                   );
                 })}
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

     {/* ══════ Action Dropdown Portal ══════ */}
     {actionDropdown && ReactDOM.createPortal(
        (() => {
          const targetTeacher = teachers.find(x => x.id === actionDropdown.teacherId);
          const hasShared = !!(schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0);

          const itemBase = "group w-full text-right px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors flex items-center gap-3";
          const iconWrap = "w-7 h-7 text-slate-500 flex items-center justify-center shrink-0";
          const labelCls = "flex-1 group-hover:text-[#655ac1] transition-colors";
          const circleCls = "w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-[#655ac1] group-hover:bg-[#655ac1] flex items-center justify-center transition-all shrink-0";
          const tickCls = "text-transparent group-hover:text-white transition-colors";

          // أيقونات مطابقة لنوافذ الربط/فك الربط
          const LinkIconInline = (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          );
          const UnlinkIconInline = (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              <line x1="2" y1="2" x2="22" y2="22"/>
            </svg>
          );

          return (
            <div
                className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 w-60"
                style={{ top: actionDropdown.top, left: actionDropdown.left, minWidth: 220 }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={() => {
                        if (targetTeacher) { setEditingTeacherId(targetTeacher.id); setIsBulkEdit(false); setActionDropdown(null); }
                    }}
                    className={itemBase}
                >
                    <span className={iconWrap}><Edit2 size={14} /></span>
                    <span className={labelCls}>تعديل</span>
                    <span className={circleCls}><Check size={10} strokeWidth={3.5} className={tickCls} /></span>
                </button>

                <button
                    onClick={() => {
                        if (targetTeacher) { openCopyModal(targetTeacher); setActionDropdown(null); }
                    }}
                    className={itemBase}
                >
                    <span className={iconWrap}><Copy size={14} /></span>
                    <span className={labelCls}>تطبيق النصاب</span>
                    <span className={circleCls}><Check size={10} strokeWidth={3.5} className={tickCls} /></span>
                </button>

                <button
                    onClick={() => { openTeacherConstraints(actionDropdown.teacherId); setActionDropdown(null); }}
                    className={itemBase}
                >
                    <span className={iconWrap}><Sliders size={14} /></span>
                    <span className={labelCls}>قيود المعلم</span>
                    <span className={circleCls}><Check size={10} strokeWidth={3.5} className={tickCls} /></span>
                </button>

                {/* ربط بمدرسة أخرى - يظهر فقط إذا وجدت مدارس مشتركة والمعلم غير مشترك */}
                {hasShared && !targetTeacher?.isShared && (
                    <button
                        onClick={() => { openLinkSchoolModal(actionDropdown.teacherId); setActionDropdown(null); }}
                        className={itemBase}
                    >
                        <span className={iconWrap}>{LinkIconInline}</span>
                        <span className={labelCls}>ربط بمدرسة أخرى</span>
                        <span className={circleCls}><Check size={10} strokeWidth={3.5} className={tickCls} /></span>
                    </button>
                )}

                {/* إلغاء الربط - يظهر فقط إذا المعلم مشترك */}
                {targetTeacher?.isShared && (
                    <button
                        onClick={() => { openUnlinkSchoolModal(actionDropdown.teacherId); setActionDropdown(null); }}
                        className={itemBase}
                    >
                        <span className={iconWrap}>{UnlinkIconInline}</span>
                        <span className={labelCls}>إلغاء الربط</span>
                        <span className={circleCls}><Check size={10} strokeWidth={3.5} className={tickCls} /></span>
                    </button>
                )}
            </div>
          );
        })(),
        document.body
     )}
    </div>
    </>
  );
};

export default Step6Teachers;
