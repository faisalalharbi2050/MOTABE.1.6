import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as XLSX from 'xlsx';
import { Admin, SchoolInfo } from '../../../types';
import {
  X, UserCog, Edit2, Trash2, Printer, ChevronDown,
  Check, AlertTriangle, Users, Upload, Search, UserPlus,
  CheckCircle2, CheckSquare, ArrowUp, ArrowDown, Plus
} from 'lucide-react';

interface Step7Props {
  admins: Admin[];
  setAdmins: React.Dispatch<React.SetStateAction<Admin[]>>;
  schoolInfo: SchoolInfo;
}

const ROLES = [
  'وكيل',
  'موجه طلابي',
  'رائد النشاط',
  'محضر المختبر',
  'مساعد معلم',
  'مساعد إداري',
  'أمين مصادر',
  'موجه صحي',
  'مسجل المعلومات',
  'سكرتير',
  'حارس',
];

const AGENT_TYPES = [
  'وكيل الشؤون التعليمية',
  'وكيل شؤون الطلاب',
  'وكيل الشؤون المدرسية',
];

const SaveCheckIcon = ({ className = "bg-[#655ac1]" }: { className?: string }) => (
  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border border-white ${className}`}>
    <Check size={13} strokeWidth={3.2} className="text-white" />
  </span>
);

const MultiAddIcon = ({ className = "text-slate-400" }: { className?: string }) => (
  <span className={`relative inline-flex h-5 w-5 items-center justify-center ${className}`}>
    <Users size={17} />
    <Plus size={9} strokeWidth={3.2} className="absolute -right-1 top-1" />
  </span>
);

// ─── AgentTypeSelector ──────────────────────────────────────────
const AdminsPrintHeader: React.FC<{ schoolInfo: SchoolInfo }> = ({ schoolInfo }) => {
  const currentSemester =
    schoolInfo.semesters?.find(s => s.id === schoolInfo.currentSemesterId) ??
    schoolInfo.semesters?.[0];

  return (
    <div className="admins-print-header hidden print:block" dir="rtl">
      <div className="admins-print-header-wrapper">
        <div className="admins-print-header-right">
          <p>المملكة العربية السعودية</p>
          <p>وزارة التعليم</p>
          <p>{schoolInfo.region || 'إدارة التعليم بالمنطقة'}</p>
          <p>مدرسة {schoolInfo.schoolName || '..........'}</p>
          <p>الفصل الدراسي: {currentSemester?.name || ''}</p>
        </div>

        <div className="admins-print-header-center">
          {schoolInfo.logo ? (
            <img src={schoolInfo.logo} alt="شعار المدرسة" />
          ) : (
            <div className="admins-print-logo-placeholder">شعار</div>
          )}
        </div>

        <div className="admins-print-header-left">
          <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
          <p>العام الدراسي: {schoolInfo.academicYear || ''}</p>
        </div>
      </div>

      <h1>بيان بأسماء الإداريين</h1>
    </div>
  );
};

interface AgentTypeSelectorProps {
  admin: Admin;
  onToggle: (adminId: string, type: string) => void;
}

const AgentTypeSelector: React.FC<AgentTypeSelectorProps> = ({ admin, onToggle }) => {
  return (
    <div className="flex flex-wrap gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2">
      {AGENT_TYPES.map(type => {
        const sel = admin.agentType?.includes(type);
        return (
          <button
            type="button"
            key={type}
            onClick={() => onToggle(admin.id, type)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-black transition-all ${
              sel ? 'border-slate-200 text-[#655ac1] bg-white' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
              sel ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent bg-white'
            }`}>
              {sel && <Check size={9} className="text-white" strokeWidth={3} />}
            </span>
            {type}
          </button>
        );
      })}
    </div>
  );
};

const RoleSelectDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
  emptyLabel?: string;
}> = ({ value, onChange, placeholder = 'اختر الدور', compact = false, emptyLabel }) => {
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
    const panelHeight = 300;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const placeAbove = spaceBelow < panelHeight + 16 && spaceAbove > spaceBelow;
    const maxH = Math.max(180, (placeAbove ? spaceAbove : spaceBelow) - 16);
    setPos({
      top: placeAbove ? Math.max(8, r.top - Math.min(maxH, panelHeight) - 8) : r.bottom + 8,
      left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, compact ? 224 : r.width) - 8)),
      width: Math.max(r.width, compact ? 224 : r.width),
      maxH,
    });
  }, [open, compact]);

  const btnSize = compact ? 'px-3 py-2 text-xs' : 'px-5 py-3.5 text-[13px]';

  return (
    <div className="relative w-full" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full ${btnSize} bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 ${open ? 'ring-2 ring-[#8779fb]/20 border-[#655ac1]/40' : ''}`}
      >
        <span className="truncate leading-tight">{value || placeholder}</span>
        <ChevronDown size={compact ? 14 : 16} className={`text-[#655ac1] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && ReactDOM.createPortal(
        <div
          dir="rtl"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxH, zIndex: 99999 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5"
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="overflow-y-auto custom-scrollbar space-y-1 pr-1" style={{ maxHeight: pos.maxH - 20 }}>
            {emptyLabel && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center justify-between gap-3 ${!value ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}
              >
                <span className="whitespace-nowrap">{emptyLabel}</span>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${!value ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                  <Check size={12} strokeWidth={3.5} />
                </span>
              </button>
            )}
            {ROLES.map(role => {
              const active = role === value;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => { onChange(role); setOpen(false); }}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center justify-between gap-3 ${active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}
                >
                  <span className="whitespace-nowrap">{role}</span>
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

// ─── Main Component ──────────────────────────────────────────────
const Step7Admins: React.FC<Step7Props> = ({ admins, setAdmins, schoolInfo }) => {

  // ── Search & Filter ─────────────────────────────────────────
  const [searchTerm, setSearchTerm]             = useState('');
  const [filterRole, setFilterRole]             = useState('');

  // ── Single Add Modal ─────────────────────────────────────────
  const [showAddSingle, setShowAddSingle]       = useState(false);
  const [singleName, setSingleName]             = useState('');
  const [singleRole, setSingleRole]             = useState('');
  const [singlePhone, setSinglePhone]           = useState('');
  const [singleAgentTypes, setSingleAgentTypes] = useState<string[]>([]);

  // ── Bulk Count Modal ─────────────────────────────────────────
  const [showBulkCountModal, setShowBulkCountModal] = useState(false);
  const [bulkCount, setBulkCount]                   = useState(5);

  // ── Bulk Entry Mode ──────────────────────────────────────────
  const [isBulkEntryMode, setIsBulkEntryMode] = useState(false);
  const [bulkAdmins, setBulkAdmins]           = useState<
    { id: string; name: string; role: string; phone: string; agentType: string[] }[]
  >([]);
  const [bulkAssignRole, setBulkAssignRole]         = useState('');

  // ── Per-row Edit ─────────────────────────────────────────────
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [editSnapshot, setEditSnapshot]     = useState<Admin | null>(null);

  // ── Global Edit (edit all) ───────────────────────────────────
  const [isEditAll, setIsEditAll]     = useState(false);
  const [hasChanges, setHasChanges]   = useState(false);
  const allSnapshot = useRef<string>('');

  // ── Action Dropdown ──────────────────────────────────────────
  const [actionDropdown, setActionDropdown] = useState<{
    adminId: string; top: number; left: number;
  } | null>(null);

  // ── Delete Modals ────────────────────────────────────────────
  const [adminToDelete, setAdminToDelete]       = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [adminDeleteSelectionMode, setAdminDeleteSelectionMode] = useState(false);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [showDeleteSelectedConfirm, setShowDeleteSelectedConfirm] = useState(false);

  // ── Data Edit Modal ──────────────────────────────────────────
  type AdminEditDraft = { id: string; name: string; role: string; phone: string };
  const [showDataEditModal, setShowDataEditModal] = useState(false);
  const [showDataEditConfirm, setShowDataEditConfirm] = useState(false);
  const [dataEditSearch, setDataEditSearch] = useState('');
  const [dataEditRole, setDataEditRole] = useState('');
  const [dataEditSelectedIds, setDataEditSelectedIds] = useState<Set<string>>(new Set());
  const [dataEditDrafts, setDataEditDrafts] = useState<Record<string, AdminEditDraft>>({});

  // ── Delete Selected Modal ────────────────────────────────────
  const [deleteSelectedModalOpen, setDeleteSelectedModalOpen] = useState(false);
  const [deleteModalSearch, setDeleteModalSearch] = useState('');
  const [deleteModalRoleFilter, setDeleteModalRoleFilter] = useState('');
  const [deleteWholeRoleConfirm, setDeleteWholeRoleConfirm] = useState(false);

  // ── Print ────────────────────────────────────────────────────
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printScope, setPrintScope] = useState<'all' | 'role'>('all');
  const [printRole, setPrintRole] = useState('');

  // ── Role cards order ─────────────────────────────────────────
  const [roleOrder, setRoleOrder] = useState<string[]>(ROLES);

  // ── Excel ────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Toast ────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!actionDropdown) return;
    const close = () => setActionDropdown(null);
    document.addEventListener('click', close);
    document.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('click', close); document.removeEventListener('scroll', close, true); };
  }, [actionDropdown]);

  // ─── Filtered list ────────────────────────────────────────────
  const filteredAdmins = admins.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole   = !filterRole || a.role === filterRole;
    return matchSearch && matchRole;
  });

  const usedRoles = roleOrder.filter(role => filteredAdmins.some(a => a.role === role));
  const uncategorizedAdmins = filteredAdmins.filter(a => !a.role || !ROLES.includes(a.role));
  const rolesToRender = [
    ...usedRoles,
    ...(uncategorizedAdmins.length > 0 ? ['غير محدد'] : []),
  ];
  const usedRoleCount = new Set(admins.map(a => a.role).filter(Boolean)).size;
  const missingDataCount = admins.filter(a => !a.name?.trim() || !a.role?.trim() || !a.phone?.trim()).length;

  const getAdminsByRole = (role: string) =>
    role === 'غير محدد'
      ? uncategorizedAdmins
      : filteredAdmins.filter(a => a.role === role);

  const moveRole = (role: string, direction: 'up' | 'down') => {
    setRoleOrder(prev => {
      const index = prev.indexOf(role);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // ─── Single Add ───────────────────────────────────────────────
  const handleAddSingle = () => {
    if (!singleName.trim()) return;
    const newAdmin: Admin = {
      id: `admin-${Date.now()}`,
      name: singleName.trim(),
      role: singleRole,
      phone: singlePhone.trim(),
      waitingQuota: 0,
      sortIndex: admins.length,
      agentType: singleRole === 'وكيل' ? singleAgentTypes : [],
    };
    setAdmins(prev => [...prev, newAdmin]);
    setSingleName(''); setSingleRole(''); setSinglePhone(''); setSingleAgentTypes([]);
    setShowAddSingle(false);
    showToast('تمت إضافة الإداري بنجاح');
  };

  // ─── Bulk Entry ───────────────────────────────────────────────
  const startBulkEntry = () => {
    const safeBulkCount = Math.max(2, bulkCount);
    const rows = Array.from({ length: safeBulkCount }, (_, i) => ({
      id: `admin-bulk-${Date.now()}-${i}`,
      name: '',
      role: '',
      phone: '',
      agentType: [] as string[],
    }));
    setBulkAdmins(rows);
    setBulkAssignRole('');
    setShowBulkCountModal(false);
    setIsBulkEntryMode(true);
  };

  const saveBulkAdmins = () => {
    const valid = bulkAdmins.filter(a => a.name.trim().length > 0);
    if (valid.length === 0) { showToast('لا يوجد إداريين للحفظ', 'error'); return; }
    const base = admins.length > 0 ? Math.max(...admins.map(a => a.sortIndex || 0)) : 0;
    const newAdmins: Admin[] = valid.map((a, i) => ({
      id: a.id,
      name: a.name.trim(),
      role: a.role,
      phone: a.phone.trim(),
      waitingQuota: 0,
      sortIndex: base + i + 1,
      agentType: a.role === 'وكيل' ? (a.agentType || []) : [],
    }));
    setAdmins(prev => [...prev, ...newAdmins]);
    setBulkAdmins([]);
    setIsBulkEntryMode(false);
    showToast(`تمت إضافة ${newAdmins.length} إداري بنجاح`);
  };

  // ─── Per-row edit ─────────────────────────────────────────────
  const startRowEdit = (admin: Admin) => {
    setEditingAdminId(admin.id);
    setEditSnapshot({ ...admin });
    if (isEditAll) { setIsEditAll(false); setHasChanges(false); }
  };

  const saveRowEdit = () => {
    setEditingAdminId(null);
    setEditSnapshot(null);
  };

  const cancelRowEdit = () => {
    if (editSnapshot) {
      setAdmins(prev => prev.map(a => a.id === editSnapshot.id ? editSnapshot : a));
    }
    setEditingAdminId(null);
    setEditSnapshot(null);
  };

  // ─── Global Edit All ─────────────────────────────────────────
  const handleEditAllToggle = () => {
    if (!isEditAll) {
      allSnapshot.current = JSON.stringify(admins);
      setIsEditAll(true);
      setHasChanges(false);
      setEditingAdminId(null);
    } else {
      setIsEditAll(false);
      setHasChanges(false);
    }
  };

  const cancelEditAll = () => {
    if (allSnapshot.current) setAdmins(JSON.parse(allSnapshot.current));
    setIsEditAll(false);
    setHasChanges(false);
  };

  const updateAdmin = (id: string, field: keyof Admin, value: any) => {
    setAdmins(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    setHasChanges(true);
  };

  const toggleAgentType = (adminId: string, type: string) => {
    setAdmins(prev => prev.map(a => {
      if (a.id !== adminId) return a;
      const cur = a.agentType || [];
      return { ...a, agentType: cur.includes(type) ? cur.filter(t => t !== type) : [...cur, type] };
    }));
    setHasChanges(true);
  };

  // ─── Delete ───────────────────────────────────────────────────
  const confirmDelete = () => {
    if (!adminToDelete) return;
    setAdmins(prev => prev.filter(a => a.id !== adminToDelete));
    setAdminToDelete(null);
    showToast('تم حذف الإداري');
  };

  const confirmDeleteAll = () => {
    setAdmins([]);
    setShowDeleteAllConfirm(false);
    setIsEditAll(false);
    setAdminDeleteSelectionMode(false);
    setSelectedAdminIds([]);
    setShowDeleteSelectedConfirm(false);
    showToast('تم حذف جميع الإداريين');
  };

  const handleInlineDeleteSelected = () => {
    if (!adminDeleteSelectionMode) {
      setAdminDeleteSelectionMode(true);
      setShowDeleteSelectedConfirm(false);
      setSelectedAdminIds([]);
      if (isEditAll) {
        setIsEditAll(false);
        setHasChanges(false);
      }
      return;
    }

    if (selectedAdminIds.length === 0) {
      setAdminDeleteSelectionMode(false);
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
    const ids = new Set(selectedAdminIds);
    setAdmins(prev => prev.filter(a => !ids.has(a.id)));
    showToast(`تم حذف ${selectedAdminIds.length} إداري`);
    setAdminDeleteSelectionMode(false);
    setSelectedAdminIds([]);
    setShowDeleteSelectedConfirm(false);
  };

  const openDataEditModal = () => {
    if (admins.length === 0) {
      showToast('لا يوجد إداريون للتعديل', 'error');
      return;
    }
    setDataEditSelectedIds(new Set());
    setDataEditDrafts({});
    setDataEditSearch('');
    setDataEditRole('');
    setShowDataEditConfirm(false);
    setShowDataEditModal(true);
  };

  const toggleDataEditAdmin = (admin: Admin) => {
    setDataEditSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(admin.id)) {
        next.delete(admin.id);
      } else {
        next.add(admin.id);
        setDataEditDrafts(drafts => ({
          ...drafts,
          [admin.id]: drafts[admin.id] || {
            id: admin.id,
            name: admin.name || '',
            role: admin.role || '',
            phone: admin.phone || '',
          },
        }));
      }
      return next;
    });
  };

  const updateDataEditDraft = (id: string, patch: Partial<AdminEditDraft>) => {
    setDataEditDrafts(prev => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: { ...current, ...patch } };
    });
  };

  const applyDataEditSave = () => {
    const ids = Array.from(dataEditSelectedIds);
    if (ids.length === 0) {
      showToast('اختر إداريًا واحدًا على الأقل للحفظ', 'error');
      return;
    }
    const patches = new Map(
      ids
        .map(id => [id, dataEditDrafts[id]] as const)
        .filter((entry): entry is readonly [string, AdminEditDraft] => !!entry[1])
    );
    setAdmins(prev => prev.map(a => {
      const patch = patches.get(a.id);
      if (!patch) return a;
      return {
        ...a,
        name: patch.name.trim() || a.name,
        role: patch.role,
        phone: patch.phone.trim(),
        agentType: patch.role === 'وكيل' ? (a.agentType || []) : [],
      };
    }));
    setShowDataEditConfirm(false);
    setShowDataEditModal(false);
    showToast(`تم حفظ بيانات ${patches.size} إداري`);
  };

  const handleDataEditSave = () => {
    if (dataEditSelectedIds.size > 1) {
      setShowDataEditConfirm(true);
      return;
    }
    applyDataEditSave();
  };

  const openDeleteSelectedModal = () => {
    if (admins.length === 0) {
      showToast('لا يوجد إداريون للحذف', 'error');
      return;
    }
    setSelectedAdminIds([]);
    setDeleteModalSearch('');
    setDeleteModalRoleFilter('');
    setDeleteWholeRoleConfirm(false);
    setShowDeleteSelectedConfirm(false);
    setDeleteSelectedModalOpen(true);
  };

  const toggleAdminSelection = (adminId: string) => {
    setSelectedAdminIds(prev =>
      prev.includes(adminId) ? prev.filter(id => id !== adminId) : [...prev, adminId]
    );
    setShowDeleteSelectedConfirm(false);
  };

  const toggleRoleSelection = (roleAdmins: Admin[]) => {
    const ids = roleAdmins.map(a => a.id);
    const allSelected = ids.length > 0 && ids.every(id => selectedAdminIds.includes(id));
    setSelectedAdminIds(prev =>
      allSelected
        ? prev.filter(id => !ids.includes(id))
        : Array.from(new Set([...prev, ...ids]))
    );
    setShowDeleteSelectedConfirm(false);
  };

  const executePrint = () => {
    setShowPrintModal(false);
    const styleId = 'print-admin-role-override';
    document.getElementById(styleId)?.remove();

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 10mm; }
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          background: #ffffff !important;
        }

        .admins-print-header {
          display: block !important;
          margin-bottom: 14px !important;
          font-family: 'Tajawal', 'Arial', sans-serif !important;
          color: #1e293b !important;
        }

        .admins-print-header-wrapper {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          border-bottom: 2px solid #1e293b !important;
          padding-bottom: 14px !important;
          margin-bottom: 8px !important;
        }

        .admins-print-header-right,
        .admins-print-header-left {
          width: 33% !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          line-height: 1.8 !important;
          color: #1e293b !important;
        }

        .admins-print-header-right { text-align: right !important; }
        .admins-print-header-left { text-align: left !important; }

        .admins-print-header-center {
          width: 33% !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
        }

        .admins-print-header-center img {
          width: 56px !important;
          height: 56px !important;
          object-fit: contain !important;
        }

        .admins-print-logo-placeholder {
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

        .admins-print-header h1 {
          margin: 8px 0 14px !important;
          text-align: center !important;
          color: #1e293b !important;
          font-size: 18px !important;
          font-weight: 900 !important;
        }

        [data-admin-role-card] {
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

        ${printScope === 'role' && printRole ? `
        [data-admin-role-card] { display: none !important; }
        [data-admin-role-card="${printRole}"] { display: block !important; }
        ` : ''}

        [data-admin-role-card] > div:first-child {
          background: linear-gradient(to left, rgba(248, 250, 252, 0.55), #ffffff) !important;
          border-bottom: 1px solid #f1f5f9 !important;
          padding: 12px 16px !important;
        }

        [data-admin-role-card] h4 {
          color: #1e293b !important;
          font-size: 15px !important;
          font-weight: 900 !important;
        }

        [data-admin-role-card] table {
          width: 100% !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
          table-layout: fixed !important;
          font-size: 12px !important;
        }

        [data-admin-role-card] thead tr {
          background: rgba(248, 250, 252, 0.8) !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }

        [data-admin-role-card] th {
          padding: 10px !important;
          color: #655ac1 !important;
          font-size: 12px !important;
          font-weight: 900 !important;
          border-left: 1px solid #e2e8f0 !important;
          background: rgba(248, 250, 252, 0.8) !important;
        }

        [data-admin-role-card] td {
          padding: 9px 10px !important;
          color: #334155 !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          border-left: 1px solid #f1f5f9 !important;
          border-bottom: 1px solid #f1f5f9 !important;
          background: #ffffff !important;
        }

        [data-admin-role-card] th:last-child,
        [data-admin-role-card] td:last-child {
          border-left: 0 !important;
        }

        [data-admin-role-card] tbody tr:last-child td {
          border-bottom: 0 !important;
        }

        [data-admin-role-card] tbody tr:nth-child(even) td {
          background: #f8fafc !important;
        }
      }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
      window.print();
      document.getElementById(styleId)?.remove();
    }, 80);
  };

  // ─── Action Dropdown ─────────────────────────────────────────
  const openActionDropdown = (e: React.MouseEvent, adminId: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const w = 220, h = 120;
    let left = rect.right - w;
    if (left < 8) left = rect.left;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    const top = rect.bottom + h > window.innerHeight - 10 ? rect.top - h - 6 : rect.bottom + 6;
    setActionDropdown({ adminId, top, left });
  };

  // ─── Excel Import ─────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: 'array' });
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        const base = admins.length > 0 ? Math.max(...admins.map(a => a.sortIndex || 0)) : 0;
        const imported: Admin[] = [];
        let invalidRoleCount = 0;
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row?.[0]) continue;
          const name  = String(row[0] || '').trim();
          const role  = String(row[1] || '').trim();
          const phone = String(row[2] || '').trim();
          if (!name) continue;
          const validRole = ROLES.includes(role);
          if (role && !validRole) invalidRoleCount++;
          imported.push({
            id: `admin-import-${Date.now()}-${i}`,
            name,
            role: validRole ? role : '',
            phone,
            waitingQuota: 0,
            sortIndex: base + imported.length + 1,
            agentType: [],
          });
        }
        if (imported.length > 0) {
          setAdmins(prev => [...prev, ...imported]);
          showToast(
            invalidRoleCount > 0
              ? `تم استيراد ${imported.length} إداري، وتم تجاهل ${invalidRoleCount} دور غير مطابق`
              : `تم استيراد ${imported.length} إداري بنجاح`,
            invalidRoleCount > 0 ? 'error' : 'success'
          );
        } else {
          showToast('لم يتم العثور على بيانات صالحة', 'error');
        }
      } catch { showToast('حدث خطأ أثناء قراءة الملف', 'error'); }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const adminToDeleteName = admins.find(a => a.id === adminToDelete)?.name;

  const isRowEditing = (id: string) => isEditAll || editingAdminId === id;

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 print:pb-0">

      {/* ── Toast ─────────────────────────────────────────────── */}
      {toast && ReactDOM.createPortal(
        <div
          style={{ top: '82px', left: '50%', transform: 'translateX(-50%)' }}
          className={`fixed z-[99999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border min-w-[300px] max-w-[90vw] animate-in fade-in duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'
          }`}>
            {toast.type === 'success'
              ? <CheckCircle2 size={18} className="text-emerald-600" />
              : <AlertTriangle size={18} className="text-red-600" />
            }
          </div>
          <p className="font-bold text-sm flex-1">{toast.message}</p>
          <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-black/5 shrink-0"><X size={15} className="opacity-40" /></button>
        </div>,
        document.body
      )}

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300 print:hidden">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
          <UserCog size={36} strokeWidth={1.8} className="text-[#655ac1]" />
          إدارة الإداريون
        </h3>
        <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إضافة وإدارة بيانات الإداريين</p>
      </div>

      {/* ── Print Header ──────────────────────────────────────── */}
      <div className="hidden print:block mb-4">
        <AdminsPrintHeader schoolInfo={schoolInfo} />
      </div>

      {!isBulkEntryMode && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
          {[
            { label: 'إجمالي الإداريين', value: admins.length, icon: Users },
            { label: 'عدد الأدوار المضافة', value: usedRoleCount, icon: UserCog },
            { label: 'بيانات ناقصة', value: missingDataCount, icon: AlertTriangle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center text-[#655ac1]">
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400">{label}</p>
                <p className="text-2xl font-black text-slate-800 leading-tight">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Bulk Entry Mode ───────────────────────────────────── */}
      {isBulkEntryMode && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl animate-in slide-in-from-bottom-4 duration-500 print:hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-[2rem]">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <UserPlus size={20} className="text-[#655ac1]" /> إضافة عدة إداريين
            </h3>
          </div>

          {/* Batch Assignment + Save/Cancel */}
          <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <UserCog size={18} className="text-[#655ac1]" />
              <span className="text-sm font-black text-slate-800">تعيين الدور لجميع الإداريين دفعة واحدة</span>
            </div>
            <div className="w-px h-5 bg-slate-200 hidden sm:block" />

            <div className="w-full sm:w-56">
              <RoleSelectDropdown
                compact
                value={bulkAssignRole}
                placeholder="اختر الدور للجميع"
                onChange={role => {
                  setBulkAssignRole(role);
                  setBulkAdmins(prev => prev.map(a => ({ ...a, role, agentType: [] })));
                }}
              />
            </div>

            {/* Cancel / Save (right→left: cancel then save — matches Step5 bulk students) */}
            <div className="flex items-center gap-2 mr-auto">
              <button
                onClick={() => { setIsBulkEntryMode(false); setBulkAdmins([]); setBulkAssignRole(''); }}
                className="px-5 py-2 bg-white text-slate-400 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={saveBulkAdmins}
                className="px-5 py-2 bg-[#655ac1] text-white rounded-xl text-sm font-black hover:bg-[#5448a8] transition-all shadow-lg shadow-[#655ac1]/20 flex items-center gap-2"
              >
                <CheckCircle2 size={15} /> حفظ ({bulkAdmins.filter(a => a.name.trim()).length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-3 py-4 w-14 text-center text-xs font-black text-[#655ac1]">م</th>
                  <th className="px-3 py-4 text-xs font-black text-[#655ac1]">اسم الإداري <span className="text-rose-500">*</span></th>
                  <th className="px-3 py-4 w-[32%] text-center text-xs font-black text-[#655ac1]">الدور الوظيفي</th>
                  <th className="px-3 py-4 w-[22%] text-center text-xs font-black text-[#655ac1]">رقم الجوال</th>
                  <th className="px-3 py-4 w-16 text-center text-xs font-black text-[#655ac1]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bulkAdmins.map((admin, index) => (
                  <tr key={admin.id} className="group hover:bg-[#e5e1fe]/10 transition-colors">
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 flex items-center justify-center rounded-full mx-auto">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        placeholder="اسم الإداري"
                        value={admin.name}
                        onChange={e => setBulkAdmins(prev => prev.map((a, i) => i === index ? { ...a, name: e.target.value } : a))}
                        className={`w-full bg-transparent border-0 focus:ring-0 outline-none font-bold text-sm text-slate-800 py-1 ${
                          admin.name.trim() ? '' : 'placeholder:text-rose-300'
                        }`}
                      />
                    </td>
                    <td className="px-3 py-3 align-middle text-center">
                      <div className="space-y-2">
                        <RoleSelectDropdown
                          compact
                          value={admin.role}
                          onChange={role => setBulkAdmins(prev => prev.map((a, i) =>
                            i === index ? { ...a, role, agentType: [] } : a
                          ))}
                        />
                        {admin.role === 'وكيل' && (
                          <div className="flex flex-wrap gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2">
                            {AGENT_TYPES.map(type => {
                              const sel = (admin.agentType || []).includes(type);
                              return (
                                <button
                                  type="button"
                                  key={type}
                                  onClick={() => setBulkAdmins(prev => prev.map((a, i) => {
                                    if (i !== index) return a;
                                    const cur = a.agentType || [];
                                    return { ...a, agentType: cur.includes(type) ? cur.filter(t => t !== type) : [...cur, type] };
                                  }))}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-black transition-all ${
                                    sel ? 'border-slate-200 text-[#655ac1] bg-white' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-white'
                                  }`}
                                >
                                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    sel ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent bg-white'
                                  }`}>
                                    {sel && <Check size={9} className="text-white" strokeWidth={3} />}
                                  </span>
                                  {type}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle text-center">
                      <input
                        type="tel"
                        dir="ltr"
                        placeholder="05xxxxxxxx"
                        value={admin.phone}
                        onChange={e => setBulkAdmins(prev => prev.map((a, i) => i === index ? { ...a, phone: e.target.value } : a))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-700 focus:outline-none focus:border-[#655ac1] text-center dir-ltr"
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => setBulkAdmins(prev => prev.filter((_, i) => i !== index))}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-sm shadow-rose-500/20"
                        title="حذف السطر"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add Row */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/30 rounded-b-[2rem] flex justify-start">
              <button
                onClick={() => setBulkAdmins(prev => [...prev, {
                  id: `admin-bulk-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
                  name: '', role: bulkAssignRole, phone: '', agentType: [] as string[],
                }])}
                className="px-4 py-2 bg-white border border-dashed border-slate-300 rounded-xl text-slate-500 text-xs font-bold hover:border-[#655ac1] hover:text-[#655ac1] transition-all"
              >
                + إضافة جديد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Bar ────────────────────────────────────────── */}
      {!isBulkEntryMode && (
        <div className="print:hidden">
          <div dir="rtl" className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-2 justify-between">
            <input type="file" ref={fileInputRef} hidden accept=".xlsx,.xls" onChange={handleFileUpload} />
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
                onClick={() => setShowAddSingle(true)}
                className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white font-bold text-sm transition-all"
              >
                <UserPlus size={17} className="text-slate-400 group-hover:text-white transition-colors" />
                إضافة إداري
              </button>
              <button
                dir="rtl"
                onClick={() => setShowBulkCountModal(true)}
                className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white font-bold text-sm transition-all"
              >
                <MultiAddIcon className="text-slate-400 group-hover:text-white transition-colors" />
                إضافة عدة إداريين
              </button>
            </div>

            <div className="hidden lg:block w-px h-9 bg-slate-200" aria-hidden="true" />

            <div className="flex flex-wrap items-center gap-2">
              <button
                dir="rtl"
                onClick={openDataEditModal}
                disabled={admins.length === 0}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 border disabled:opacity-40 disabled:cursor-not-allowed bg-white text-slate-600 border-slate-200 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white"
                title="تعديل بيانات إداري أو مجموعة إداريين"
              >
                <Edit2 size={15} className="text-slate-400 group-hover:text-white transition-colors" />
                تعديل البيانات
              </button>
              <button
                dir="rtl"
                onClick={() => { setPrintScope('all'); setPrintRole(rolesToRender[0] || ''); setShowPrintModal(true); }}
                disabled={admins.length === 0}
                className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                طباعة
              </button>
              <button
                dir="rtl"
                onClick={openDeleteSelectedModal}
                disabled={admins.length === 0}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border disabled:opacity-40 disabled:cursor-not-allowed bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600"
                title="حذف إداري أو مجموعة إداريين"
              >
                <CheckSquare size={16} className="text-rose-500" />
                حذف محدد
              </button>
              <button
                dir="rtl"
                onClick={() => setShowDeleteAllConfirm(true)}
                disabled={admins.length === 0}
                className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} className="text-rose-500" />
                حذف الكل
              </button>
            </div>
          </div>
          {isEditAll && hasChanges && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-2xl border border-amber-100 animate-in fade-in">
              <AlertTriangle size={12} />
              يوجد تعديلات غير محفوظة
            </div>
          )}
          {showDeleteSelectedConfirm && adminDeleteSelectionMode && (
            <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700 text-center">
              هل أنت متأكد من حذف الإداريين المحددين؟ اضغط نعم، احذف المحدد للتأكيد.
            </div>
          )}
        </div>
      )}

      {/* ── Search + Filter + Stats ────────────────────────────── */}
      {!isBulkEntryMode && admins.length > 0 && (
        <div dir="rtl" className="relative z-[70] bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-3 overflow-visible print:hidden">

          {/* Search & Filter */}
          <div className="flex flex-col lg:flex-row items-center gap-3 flex-1 w-full">
            <div className="relative flex-1 w-full">
              <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="بحث باسم الإداري..."
                className="w-full pr-12 pl-4 py-3 bg-slate-50 border-0 rounded-xl outline-none text-sm font-bold focus:ring-2 focus:ring-[#8779fb]/20 text-slate-600 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="w-full lg:w-64 shrink-0">
              <RoleSelectDropdown
                value={filterRole}
                onChange={setFilterRole}
                placeholder="كل الأدوار"
                emptyLabel="كل الأدوار"
              />
            </div>
          </div>

        </div>
      )}

      {/* ── Admin Role Cards ──────────────────────────────────── */}
      {!isBulkEntryMode && admins.length > 0 && rolesToRender.length > 0 && (
        <div className="space-y-6 print:space-y-4">
          {rolesToRender.map((role, roleIndex) => {
            const group = getAdminsByRole(role);
            const allSelected = group.length > 0 && group.every(a => selectedAdminIds.includes(a.id));

            return (
              <div
                key={role}
                data-admin-role-card={role}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-2 print:border-slate-800 print:rounded-none print:break-inside-avoid"
              >
                <div className="bg-white px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-50/50 to-white print:bg-slate-100 print:from-slate-100 print:to-slate-100 print:border-slate-800 print:py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {adminDeleteSelectionMode && (
                      <button
                        type="button"
                        onClick={() => toggleRoleSelection(group)}
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-all shrink-0 print:hidden ${
                          allSelected ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-2 border-slate-300 text-transparent hover:border-rose-300'
                        }`}
                        title="تحديد الفئة"
                      >
                        {allSelected && <Check size={12} strokeWidth={3.5} />}
                      </button>
                    )}
                    <div className="w-1.5 h-6 bg-[#655ac1] rounded-full print:bg-slate-900" />
                    <h4 className="font-black text-slate-800 text-lg print:text-base truncate">
                      {role}
                      <span className="mr-2 px-2.5 py-0.5 bg-slate-100 text-[#655ac1] rounded-full text-sm font-black print:border print:border-slate-400 print:text-slate-900">
                        {group.length}
                      </span>
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 print:hidden">
                    <button
                      onClick={() => moveRole(role, 'up')}
                      disabled={role === 'غير محدد' || roleIndex === 0}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-[#655ac1] hover:border-[#655ac1] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="رفع الفئة"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveRole(role, 'down')}
                      disabled={role === 'غير محدد' || roleIndex === rolesToRender.length - 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-[#655ac1] hover:border-[#655ac1] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="خفض الفئة"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 print:bg-white print:border-slate-800">
                        <th className="px-3 py-4 w-14 text-center text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:w-8 print:text-xs">م</th>
                        <th className="px-3 py-4 text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:text-xs">اسم الإداري</th>
                        <th className="px-3 py-4 w-[32%] text-center text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:text-xs">الدور الوظيفي</th>
                        <th className="px-3 py-4 w-[22%] text-center text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-1 print:text-xs">رقم الجوال</th>
                        <th className="px-3 py-4 w-24 text-center text-xs font-black text-[#655ac1] print:hidden">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 print:divide-slate-300">
                      {group.map((admin, idx) => {
                        const editing = isRowEditing(admin.id);
                        const selected = selectedAdminIds.includes(admin.id);

                        return (
                          <tr
                            key={admin.id}
                            className="transition-colors group print:break-inside-avoid hover:bg-[#e5e1fe]/10 print:hover:bg-transparent"
                          >
                            <td className="px-3 py-3 text-center relative print:border-l print:border-slate-300 print:p-2">
                              <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 flex items-center justify-center rounded-full mx-auto print:bg-transparent print:text-slate-900 print:w-auto print:h-auto">
                                {idx + 1}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-bold text-slate-700 align-middle print:border-l print:border-slate-300 print:p-1 print:text-black print:text-xs print:whitespace-nowrap">
                              {editing ? (
                                <input
                                  value={admin.name}
                                  onChange={e => updateAdmin(admin.id, 'name', e.target.value)}
                                  className="w-full bg-transparent border-0 focus:ring-0 outline-none font-bold text-sm text-slate-800 py-1"
                                  placeholder="اسم الإداري"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  {adminDeleteSelectionMode && (
                                    <button
                                      type="button"
                                      onClick={() => toggleAdminSelection(admin.id)}
                                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-all shrink-0 print:hidden ${
                                        selected ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-2 border-slate-300 text-transparent hover:border-rose-300'
                                      }`}
                                    >
                                      {selected && <Check size={12} strokeWidth={3.5} />}
                                    </button>
                                  )}
                                  <span className="text-sm group-hover:text-[#655ac1] transition-colors print:text-black">{admin.name || '-'}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 align-middle text-center print:border-l print:border-slate-300 print:p-1 print:text-xs print:whitespace-nowrap">
                              {editing ? (
                                <div className="space-y-2">
                                  <RoleSelectDropdown
                                    compact
                                    value={admin.role}
                                    onChange={value => {
                                      updateAdmin(admin.id, 'role', value);
                                      if (value !== 'وكيل') updateAdmin(admin.id, 'agentType', []);
                                    }}
                                  />
                                  {admin.role === 'وكيل' && (
                                    <AgentTypeSelector admin={admin} onToggle={toggleAgentType} />
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-0.5 items-center">
                                  {admin.role === 'وكيل' && admin.agentType && admin.agentType.length > 0 ? (
                                    admin.agentType.map(t => (
                                      <span key={t} className="text-xs font-black text-[#655ac1] print:text-black">
                                        وكيل - {t.replace('وكيل ', '')}
                                      </span>
                                    ))
                                  ) : (
                                    <span className={`inline-flex min-h-8 items-center justify-center text-xs font-black print:text-black ${
                                      admin.role ? 'text-slate-600' : 'text-amber-600'
                                    }`}>
                                      {admin.role || 'لم يُحدد'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 align-middle text-center print:border-l print:border-slate-300 print:p-1 print:text-xs print:whitespace-nowrap">
                              {editing ? (
                                <input
                                  value={admin.phone}
                                  onChange={e => updateAdmin(admin.id, 'phone', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-700 focus:outline-none focus:border-[#655ac1] text-center dir-ltr"
                                  placeholder="05xxxxxxxx"
                                />
                              ) : (
                                <span className="inline-flex min-h-8 items-center justify-center px-2 text-xs font-bold text-slate-500 font-mono print:text-black" dir="ltr">{admin.phone || '-'}</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center print:hidden">
                              {editingAdminId === admin.id ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button onClick={saveRowEdit} className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500 text-white transition-all" title="حفظ">
                                    <SaveCheckIcon className="bg-emerald-500 h-4 w-4" />
                                  </button>
                                  <button onClick={cancelRowEdit} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 transition-all" title="إلغاء">
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : !isEditAll && !adminDeleteSelectionMode && (
                                <button
                                  onClick={() => startRowEdit(admin)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-slate-400 hover:text-[#655ac1] transition-all border border-slate-200 hover:border-[#655ac1] mx-auto"
                                  title="تعديل"
                                >
                                  <Edit2 size={14} />
                                </button>
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
        </div>
      )}

      {!isBulkEntryMode && admins.length > 0 && filteredAdmins.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center print:hidden">
          <Search size={36} className="mx-auto mb-5 text-slate-400" strokeWidth={1.6} />
          <p className="text-slate-600 font-black text-lg mb-1">لا يوجد إداريون يطابقون البحث</p>
          <p className="text-slate-400 text-sm">جرب البحث باسم آخر أو تغيير الدور</p>
        </div>
      )}

      {/* ── Admins Table ──────────────────────────────────────── */}
      {false && !isBulkEntryMode && admins.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-[#655ac1]/5 overflow-hidden print:shadow-none print:border-2 print:border-slate-800 print:rounded-none">
          <div className="bg-white px-6 py-4 border-b border-slate-50 flex items-center bg-gradient-to-r from-slate-50/50 to-white print:bg-slate-100 print:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#655ac1] rounded-full print:bg-slate-900" />
              <h4 className="font-black text-slate-800 text-lg print:text-base">
                الإداريون
                {(filterRole || searchTerm) && (
                  <span className="mr-2 px-2.5 py-0.5 bg-slate-100 text-[#655ac1] rounded-full text-sm font-black">{filteredAdmins.length}</span>
                )}
              </h4>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-white border-b border-slate-100 print:border-slate-800">
                  <th className="p-4 w-14 text-center text-sm font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300">م</th>
                  <th className="p-4 text-sm font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300">الاسم</th>
                  <th className="p-4 text-sm font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300">الدور الوظيفي</th>
                  <th className="p-4 text-sm font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300">رقم الجوال</th>
                  <th className="p-4 w-20 text-center text-sm font-black text-[#655ac1] print:hidden">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 print:divide-slate-300">
                {filteredAdmins.map((admin, idx) => {
                  const editing = isRowEditing(admin.id);
                  return (
                    <tr
                      key={admin.id}
                      className={`transition-colors group print:break-inside-avoid ${
                        editing ? 'bg-[#f5f3ff]' : 'hover:bg-[#e5e1fe]/10'
                      }`}
                    >
                      {/* م */}
                      <td className="p-4 text-center print:border-l print:border-slate-300">
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 w-7 h-7 flex items-center justify-center rounded-full mx-auto print:bg-transparent print:text-slate-900">
                          {idx + 1}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="p-4 font-bold text-slate-700 print:border-l print:border-slate-300">
                        {editing ? (
                          <input
                            value={admin.name}
                            onChange={e => updateAdmin(admin.id, 'name', e.target.value)}
                            className="w-full p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-sm font-bold shadow-sm"
                            placeholder="اسم الإداري"
                          />
                        ) : (
                          <span className="group-hover:text-[#655ac1] transition-colors print:text-black">{admin.name || '-'}</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="p-4 print:border-l print:border-slate-300">
                        {editing ? (
                          <div className="space-y-2">
                            <select
                              value={admin.role}
                              onChange={e => updateAdmin(admin.id, 'role', e.target.value)}
                              className={`w-full p-2 bg-white border rounded-lg outline-none text-sm font-bold shadow-sm ${!admin.role ? 'border-amber-400 text-slate-400' : 'border-[#655ac1]'}`}
                            >
                              <option value="">-- اختر الدور --</option>
                              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            {admin.role === 'وكيل' && (
                              <AgentTypeSelector admin={admin} onToggle={toggleAgentType} />
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {admin.role === 'وكيل' && admin.agentType && admin.agentType.length > 0 ? (
                              admin.agentType.map(t => (
                                <span key={t} className="text-sm font-black text-[#655ac1] print:text-black">
                                  وكيل - {t.replace('وكيل ', '')}
                                </span>
                              ))
                            ) : (
                              <span className={`text-sm font-black print:text-black ${
                                admin.role ? 'text-[#655ac1]' : 'text-amber-500'
                              }`}>
                                {admin.role || 'لم يُحدد'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="p-4 print:border-l print:border-slate-300">
                        {editing ? (
                          <input
                            value={admin.phone}
                            onChange={e => updateAdmin(admin.id, 'phone', e.target.value)}
                            className="w-full p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-sm font-bold text-center dir-ltr shadow-sm"
                            placeholder="05xxxxxxxx"
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-500 font-mono print:text-black" dir="ltr">{admin.phone || '-'}</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center print:hidden">
                        {editingAdminId === admin.id ? (
                          /* Per-row save/cancel */
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={saveRowEdit}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-all"
                              title="حفظ"
                            >
                              <Check size={14} strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={cancelRowEdit}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200 transition-all"
                              title="إلغاء"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : isEditAll ? null : (
                          <button
                            onClick={e => openActionDropdown(e, admin.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#e5e1fe] text-slate-400 hover:text-[#655ac1] transition-all border border-slate-200 hover:border-[#8779fb] mx-auto"
                            title="إجراءات"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredAdmins.length === 0 && admins.length > 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search size={40} className="mx-auto mb-3 text-[#8779fb]" strokeWidth={1.6} />
                        <p className="text-slate-600 font-black text-base mb-0.5">لا توجد نتائج مطابقة</p>
                        <p className="text-slate-400 text-sm">جرب البحث بكلمة أخرى أو <span className="font-bold" style={{ color: '#655ac1' }}>تغيير الفلتر</span></p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Empty State (no admins at all) ───────────────────── */}
      {!isBulkEntryMode && admins.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center print:hidden">
          <UserCog size={48} className="mx-auto mb-5 text-slate-400" strokeWidth={1.6} />
          <p className="text-slate-600 font-black text-lg mb-1">لا يوجد إداريون بعد</p>
          <p className="text-slate-400 text-sm">
            استخدم زر{' '}
            <span className="font-bold" style={{ color: '#655ac1' }}>استيراد من Excel</span>
            {' '}أو{' '}
            <span className="font-bold" style={{ color: '#655ac1' }}>إضافة إداري</span>
            {' '}أو{' '}
            <span className="font-bold" style={{ color: '#655ac1' }}>عدة إداريين</span>
            {' '}للبدء
          </p>
        </div>
      )}

      {/* ══════ Portals ══════ */}

      {/* Action Dropdown */}
      {actionDropdown && ReactDOM.createPortal(
        (() => {
          const itemBase = "group w-full text-right px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors flex items-center gap-3";
          const iconWrap = "w-7 h-7 text-slate-500 flex items-center justify-center shrink-0";
          const labelCls = "flex-1 group-hover:text-[#655ac1] transition-colors";
          const circleCls = "w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-[#655ac1] group-hover:bg-[#655ac1] flex items-center justify-center transition-all shrink-0";
          const tickCls = "text-transparent group-hover:text-white transition-colors";
          return (
            <div
              style={{ position: 'fixed', top: actionDropdown.top, left: actionDropdown.left, zIndex: 99999, minWidth: 220 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 w-60 animate-in fade-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  const admin = admins.find(a => a.id === actionDropdown.adminId);
                  if (admin) startRowEdit(admin);
                  setActionDropdown(null);
                }}
                className={itemBase}
              >
                <span className={iconWrap}><Edit2 size={14} /></span>
                <span className={labelCls}>تعديل</span>
                <span className={circleCls}><Check size={10} strokeWidth={3.5} className={tickCls} /></span>
              </button>
              <button
                onClick={() => { setAdminToDelete(actionDropdown.adminId); setActionDropdown(null); }}
                className={`${itemBase} text-rose-600 hover:bg-rose-50`}
              >
                <span className="w-7 h-7 text-rose-500 flex items-center justify-center shrink-0"><Trash2 size={14} /></span>
                <span className="flex-1 transition-colors">حذف</span>
                <span className="w-4 h-4 rounded-full border-2 border-rose-300 group-hover:border-rose-500 group-hover:bg-rose-500 flex items-center justify-center transition-all shrink-0">
                  <Check size={10} strokeWidth={3.5} className="text-transparent group-hover:text-white transition-colors" />
                </span>
              </button>
            </div>
          );
        })(),
        document.body
      )}

      {/* Delete Single Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-rose-500" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">تأكيد حذف الإداري</h2>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف {adminToDeleteName ? <span className="font-black text-slate-700">{adminToDeleteName}</span> : 'هذا الإداري'}؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setAdminToDelete(null)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
              >
                نعم، احذف الإداري
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 flex items-start gap-3">
              <Trash2 size={28} className="text-rose-500 mt-0.5" />
              <div>
                <h2 className="text-xl font-black text-slate-800 mb-2">حذف الكل</h2>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  سيتم حذف جميع الإداريين. هل تريد المتابعة؟
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

      {/* Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                  <Printer size={22} className="text-[#655ac1]" />
                  طباعة الإداريين
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">اختر نطاق الطباعة المطلوب.</p>
              </div>
              <button onClick={() => setShowPrintModal(false)} className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
              <button
                onClick={() => setPrintScope('all')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-black transition-all ${printScope === 'all' ? 'border-slate-200 text-[#655ac1]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span>طباعة الكل</span>
                <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${printScope === 'all' ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'}`}>
                  <Check size={12} strokeWidth={3.5} />
                </span>
              </button>
              <button
                onClick={() => setPrintScope('role')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-black transition-all ${printScope === 'role' ? 'border-slate-200 text-[#655ac1]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span>طباعة دور محدد</span>
                <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${printScope === 'role' ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'}`}>
                  <Check size={12} strokeWidth={3.5} />
                </span>
              </button>
              {printScope === 'role' && (
                <div className="pt-1">
                  <p className="text-[11px] font-bold text-slate-400 mb-2 px-1">اختر الدور</p>
                  <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1 custom-scrollbar">
                    {rolesToRender.map(role => {
                      const on = printRole === role;
                      return (
                        <button
                          type="button"
                          key={role}
                          onClick={() => setPrintRole(role)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right ${on ? 'border-slate-200 text-[#655ac1]' : 'border-slate-100 hover:border-slate-300'}`}
                        >
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-all shrink-0 ${on ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-2 border-slate-300 text-transparent'}`}>
                            {on && <Check size={12} strokeWidth={3.5} />}
                          </span>
                          <span className="text-sm font-bold text-slate-700">{role}</span>
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
                disabled={printScope === 'role' && !printRole}
                className="flex-1 px-4 py-2.5 bg-[#655ac1] text-white text-sm font-bold rounded-xl hover:bg-[#5448a8] shadow-md shadow-[#655ac1]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Count Modal */}
      {showBulkCountModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <MultiAddIcon className="text-[#655ac1]" />
                إضافة عدة إداريين
              </h3>
              <button onClick={() => setShowBulkCountModal(false)} className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 font-bold mb-5">حدد عدد الإداريين المتوقع إضافتهم</p>
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-6">
                <span className="text-sm font-bold text-slate-500 shrink-0">عدد الإداريين:</span>
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={bulkCount}
                  onChange={e => setBulkCount(Math.max(2, parseInt(e.target.value) || 2))}
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
                  onClick={startBulkEntry}
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

      {/* Add Single Modal */}
      {showAddSingle && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <UserPlus size={24} className="text-[#655ac1]" /> إضافة إداري جديد
              </h3>
              <button onClick={() => setShowAddSingle(false)} className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">اسم الإداري <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    placeholder="أدخل الاسم"
                    value={singleName}
                    onChange={e => setSingleName(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] focus:ring-4 focus:ring-[#655ac1]/10 transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">رقم الجوال</label>
                  <input
                    type="tel"
                    placeholder="05xxxxxxxx"
                    value={singlePhone}
                    onChange={e => setSinglePhone(e.target.value)}
                    dir="ltr"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] focus:ring-4 focus:ring-[#655ac1]/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">الدور الوظيفي</label>
                  <RoleSelectDropdown
                    value={singleRole}
                    onChange={value => { setSingleRole(value); setSingleAgentTypes([]); }}
                  />
                </div>

                {/* Agent type selector — shown only when role is وكيل */}
                {singleRole === 'وكيل' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">
                      صفة الوكيل
                      <span className="text-slate-400 font-medium mr-1">(يمكن اختيار أكثر من صفة)</span>
                    </label>
                    <div className="flex flex-wrap gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2">
                      {AGENT_TYPES.map(type => {
                        const selected = singleAgentTypes.includes(type);
                        return (
                          <button
                            type="button"
                            key={type}
                            onClick={() => setSingleAgentTypes(prev =>
                              prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                            )}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-black transition-all ${
                              selected ? 'border-slate-200 text-[#655ac1] bg-white' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-white'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              selected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent bg-white'
                            }`}>
                              {selected && <Check size={11} className="text-white" strokeWidth={3} />}
                            </span>
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setShowAddSingle(false)}
                  className="flex-1 py-4 bg-white text-slate-400 border border-slate-200 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddSingle}
                  disabled={!singleName.trim()}
                  className="flex-1 py-4 bg-[#655ac1] text-white font-black text-sm rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} /> حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Data Edit Modal ══════ */}
      {showDataEditModal && (() => {
        const qRaw = dataEditSearch.trim();
        const q = qRaw.toLowerCase();
        const selectableAdmins = admins.filter(a => {
          const matchesSearch = !q
            || (a.name || '').toLowerCase().includes(q)
            || (a.phone || '').includes(qRaw);
          const matchesRole = !dataEditRole || a.role === dataEditRole;
          return matchesSearch && matchesRole;
        }).sort((a, b) => {
          if ((a.role || '') !== (b.role || '')) return (a.role || '').localeCompare(b.role || '', 'ar');
          return (a.name || '').localeCompare(b.name || '', 'ar');
        });
        const selectedDrafts = Array.from(dataEditSelectedIds)
          .map(id => dataEditDrafts[id])
          .filter((d): d is AdminEditDraft => !!d);

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                    <Edit2 size={20} className="text-[#655ac1]" />
                    تعديل البيانات
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">ابحث عن إداري أو اختر الدور ثم عدّل البيانات مباشرة.</p>
                </div>
                <button
                  onClick={() => setShowDataEditModal(false)}
                  className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  title="إغلاق"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] min-h-0 flex-1">
                <div className="border-l border-slate-100 p-5 space-y-4 bg-slate-50/40 overflow-y-auto custom-scrollbar">
                  <div className="relative">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={dataEditSearch}
                      onChange={e => setDataEditSearch(e.target.value)}
                      placeholder="ابحث باسم الإداري أو رقم الجوال"
                      className="w-full pr-10 pl-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20"
                    />
                  </div>
                  <RoleSelectDropdown
                    value={dataEditRole}
                    onChange={setDataEditRole}
                    placeholder="كل الأدوار"
                    emptyLabel="كل الأدوار"
                  />

                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-500">الإداريون</span>
                      <span className="text-[11px] font-black text-[#655ac1] border border-slate-200 bg-white px-2.5 py-1 rounded-full">{dataEditSelectedIds.size} محدد</span>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                      {selectableAdmins.length === 0 ? (
                        <div className="py-8 text-center text-xs font-bold text-slate-400">لا توجد نتائج مطابقة</div>
                      ) : selectableAdmins.map(admin => {
                        const selected = dataEditSelectedIds.has(admin.id);
                        return (
                          <button
                            key={admin.id}
                            type="button"
                            onClick={() => toggleDataEditAdmin(admin)}
                            className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${selected ? 'border-slate-300 bg-white' : 'border-transparent hover:bg-slate-50'}`}
                          >
                            <span className="min-w-0">
                              <span className={`block text-sm font-black truncate ${selected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{admin.name || '—'}</span>
                              <span className={`block text-[11px] font-bold truncate ${selected ? 'text-slate-400' : 'text-[#655ac1]'}`}>{admin.role || 'غير محدد'}</span>
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
                      <p className="font-black text-slate-700">اختر إداريًا أو مجموعة إداريين</p>
                      <p className="text-xs font-bold text-slate-400 mt-1">ستظهر البيانات القابلة للتعديل هنا مباشرة.</p>
                    </div>
                  ) : (
                    <div className="overflow-y-auto custom-scrollbar flex-1">
                      <table className="w-full table-fixed text-right">
                        <thead className="sticky top-0 z-10 bg-white border-b border-slate-200">
                          <tr>
                            <th className="p-3 text-xs font-black text-[#655ac1] w-12 text-center">م</th>
                            <th className="p-3 text-xs font-black text-[#655ac1]">الاسم</th>
                            <th className="p-3 text-xs font-black text-[#655ac1] w-44 text-center">الدور</th>
                            <th className="p-3 text-xs font-black text-[#655ac1] w-36 text-center">رقم الجوال</th>
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
                                <RoleSelectDropdown
                                  compact
                                  value={draft.role}
                                  onChange={v => updateDataEditDraft(draft.id, { role: v })}
                                  placeholder="اختر الدور"
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
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">سيتم حفظ تعديلات {dataEditSelectedIds.size} إداري. هل تريد المتابعة؟</p>
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

      {/* ══════ Delete Selected Modal ══════ */}
      {deleteSelectedModalOpen && (() => {
        const qRaw = deleteModalSearch.trim();
        const q = qRaw.toLowerCase();
        const filteredForDelete = admins.filter(a => {
          const matchesSearch = !q
            || (a.name || '').toLowerCase().includes(q)
            || (a.phone || '').includes(qRaw);
          const matchesRole = !deleteModalRoleFilter || a.role === deleteModalRoleFilter;
          return matchesSearch && matchesRole;
        }).sort((a, b) => {
          if ((a.role || '') !== (b.role || '')) return (a.role || '').localeCompare(b.role || '', 'ar');
          return (a.name || '').localeCompare(b.name || '', 'ar');
        });
        const selectedCount = selectedAdminIds.length;
        const roleAdminCount = deleteModalRoleFilter ? admins.filter(a => a.role === deleteModalRoleFilter).length : 0;
        const closeModal = () => {
          setDeleteSelectedModalOpen(false);
          setDeleteWholeRoleConfirm(false);
          setShowDeleteSelectedConfirm(false);
        };
        const deleteWholeRole = () => {
          if (!deleteModalRoleFilter) return;
          const ids = new Set(admins.filter(a => a.role === deleteModalRoleFilter).map(a => a.id));
          if (ids.size === 0) return;
          setAdmins(prev => prev.filter(a => !ids.has(a.id)));
          showToast(`تم حذف ${ids.size} إداري من دور ${deleteModalRoleFilter}`);
          closeModal();
        };
        const deleteSelectedAdmins = () => {
          const ids = new Set(selectedAdminIds);
          if (ids.size === 0) return;
          setAdmins(prev => prev.filter(a => !ids.has(a.id)));
          showToast(`تم حذف ${ids.size} إداري`);
          closeModal();
        };
        const visibleIds = filteredForDelete.map(a => a.id);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedAdminIds.includes(id));
        const toggleSelectAllVisible = () => {
          if (allVisibleSelected) {
            setSelectedAdminIds(prev => prev.filter(id => !visibleIds.includes(id)));
          } else {
            setSelectedAdminIds(prev => Array.from(new Set([...prev, ...visibleIds])));
          }
        };

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
            <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                    <Trash2 size={20} className="text-rose-500" />
                    حذف محدد
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">ابحث أو فلتر بالدور، ثم حدد الإداريين للحذف.</p>
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
                    placeholder="ابحث باسم الإداري أو رقم الجوال"
                    className="w-full pr-10 pl-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 focus:border-rose-300 focus:ring-2 focus:ring-rose-200/40"
                  />
                </div>
                <RoleSelectDropdown
                  value={deleteModalRoleFilter}
                  onChange={v => { setDeleteModalRoleFilter(v); setDeleteWholeRoleConfirm(false); }}
                  placeholder="كل الأدوار"
                  emptyLabel="كل الأدوار"
                />
                {deleteModalRoleFilter && roleAdminCount > 0 && (
                  deleteWholeRoleConfirm ? (
                    <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-3 space-y-2">
                      <p className="text-xs font-black text-rose-700 text-center leading-relaxed">
                        سيتم حذف <span className="text-sm">{roleAdminCount}</span> إداري بدور {deleteModalRoleFilter}. هل أنت متأكد؟
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeleteWholeRoleConfirm(false)}
                          className="flex-1 px-3 py-2 bg-white border border-slate-300 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50"
                        >
                          تراجع
                        </button>
                        <button
                          onClick={deleteWholeRole}
                          className="flex-1 px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black rounded-lg shadow-sm shadow-rose-500/30"
                        >
                          نعم، احذف الكل
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteWholeRoleConfirm(true)}
                      className="w-full px-4 py-2.5 bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} />
                      حذف كامل {deleteModalRoleFilter} ({roleAdminCount})
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 bg-white shrink-0">
                <span className="text-xs font-black text-slate-500">
                  {filteredForDelete.length} إداري
                  {selectedCount > 0 && <span className="text-rose-600"> · {selectedCount} محدد</span>}
                </span>
                {filteredForDelete.length > 0 && (
                  <button
                    onClick={toggleSelectAllVisible}
                    className="text-[11px] font-black text-rose-500 hover:text-rose-600"
                  >
                    {allVisibleSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
                {filteredForDelete.length === 0 ? (
                  <div className="py-12 text-center text-xs font-bold text-slate-400">لا توجد نتائج مطابقة</div>
                ) : filteredForDelete.map(admin => {
                  const selected = selectedAdminIds.includes(admin.id);
                  return (
                    <button
                      key={admin.id}
                      type="button"
                      onClick={() => setSelectedAdminIds(prev => selected ? prev.filter(id => id !== admin.id) : [...prev, admin.id])}
                      className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 mb-1 ${selected ? 'border-rose-300 bg-rose-50' : 'border-transparent hover:bg-slate-50'}`}
                    >
                      <span className="min-w-0">
                        <span className={`block text-sm font-black truncate ${selected ? 'text-rose-600' : 'text-slate-700'}`}>{admin.name || '—'}</span>
                        <span className={`block text-[11px] font-bold truncate ${selected ? 'text-rose-400' : 'text-slate-400'}`}>{admin.role || 'غير محدد'}</span>
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
                  onClick={() => {
                    if (selectedCount === 0) return;
                    if (selectedCount > 1) { setShowDeleteSelectedConfirm(true); return; }
                    deleteSelectedAdmins();
                  }}
                  disabled={selectedCount === 0}
                  className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-black rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-rose-500/20"
                >
                  حذف المحدد {selectedCount > 0 ? `(${selectedCount})` : ''}
                </button>
              </div>

              {showDeleteSelectedConfirm && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={28} className="text-rose-500 mt-0.5 shrink-0" />
                      <div>
                        <h2 className="text-xl font-black text-slate-800 mb-2">تأكيد الحذف</h2>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">سيتم حذف {selectedCount} إداري. لا يمكن التراجع عن هذا الإجراء.</p>
                      </div>
                    </div>
                    <div className="pt-6 flex gap-3">
                      <button onClick={() => setShowDeleteSelectedConfirm(false)} className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors">إلغاء</button>
                      <button onClick={deleteSelectedAdmins} className="flex-1 py-3 bg-rose-500 text-white font-black text-sm rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all">نعم، احذف</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default Step7Admins;
