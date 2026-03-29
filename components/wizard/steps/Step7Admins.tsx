import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as XLSX from 'xlsx';
import { Admin, SchoolInfo } from '../../../types';
import {
  Plus, X, UserCog, Edit, Edit2, Trash2, Printer, ChevronDown,
  Check, Save, AlertTriangle, Users, Upload, Search, UserPlus,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import PrintHeader from '../../ui/PrintHeader';

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

// ─── AgentTypeSelector ──────────────────────────────────────────
interface AgentTypeSelectorProps {
  admin: Admin;
  onToggle: (adminId: string, type: string) => void;
}

const AgentTypeSelector: React.FC<AgentTypeSelectorProps> = ({ admin, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedCount = admin.agentType?.length || 0;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-2 border rounded-lg text-sm flex justify-between items-center ${
          selectedCount > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'
        }`}
      >
        <span className="truncate">{selectedCount === 0 ? 'اختر الصفة' : `${selectedCount} محدد`}</span>
        <ChevronDown size={14} />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-100 z-50 p-2 space-y-1">
          {AGENT_TYPES.map(type => (
            <div
              key={type}
              onClick={() => onToggle(admin.id, type)}
              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-xs font-bold transition-colors ${
                admin.agentType?.includes(type) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                admin.agentType?.includes(type) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
              }`}>
                {admin.agentType?.includes(type) && <Check size={10} className="text-white" />}
              </div>
              {type}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────
const Step7Admins: React.FC<Step7Props> = ({ admins, setAdmins, schoolInfo }) => {

  // ── Search & Filter ─────────────────────────────────────────
  const [searchTerm, setSearchTerm]             = useState('');
  const [filterRole, setFilterRole]             = useState('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

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
  const [isBulkRoleDropdownOpen, setIsBulkRoleDropdownOpen] = useState(false);
  const bulkRoleDropdownRef = useRef<HTMLDivElement>(null);

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

  // ── Excel ────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Toast ────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Close on outside click ───────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node))
        setIsRoleDropdownOpen(false);
      if (bulkRoleDropdownRef.current && !bulkRoleDropdownRef.current.contains(e.target as Node))
        setIsBulkRoleDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    const rows = Array.from({ length: bulkCount }, (_, i) => ({
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
    showToast('تم حذف جميع الإداريين');
  };

  // ─── Action Dropdown ─────────────────────────────────────────
  const openActionDropdown = (e: React.MouseEvent, adminId: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const w = 168, h = 108;
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
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row?.[0]) continue;
          const name  = String(row[0] || '').trim();
          const role  = String(row[1] || '').trim();
          const phone = String(row[2] || '').trim();
          if (!name) continue;
          imported.push({
            id: `admin-import-${Date.now()}-${i}`,
            name,
            role: ROLES.includes(role) ? role : '',
            phone,
            waitingQuota: 0,
            sortIndex: base + imported.length + 1,
            agentType: [],
          });
        }
        if (imported.length > 0) {
          setAdmins(prev => [...prev, ...imported]);
          showToast(`تم استيراد ${imported.length} إداري بنجاح`);
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
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500" />
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
          <UserCog size={36} strokeWidth={1.8} className="text-[#655ac1]" />
          إدارة الإداريون
        </h3>
        <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إضافة وإدارة بيانات الإداريين</p>
      </div>

      {/* ── Print Header ──────────────────────────────────────── */}
      <div className="hidden print:block mb-4">
        <PrintHeader schoolInfo={schoolInfo} title="قائمة الكادر الإداري" />
      </div>

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
              <span className="text-sm font-black text-[#655ac1]">تعيين الدور لجميع الإداريين دفعة واحدة</span>
            </div>
            <div className="w-px h-5 bg-slate-200 hidden sm:block" />

            {/* Bulk Role Dropdown */}
            <div className="relative" ref={bulkRoleDropdownRef}>
              <button
                onClick={() => setIsBulkRoleDropdownOpen(p => !p)}
                className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-xl text-sm font-bold transition-all min-w-[160px] ${
                  bulkAssignRole
                    ? 'border-[#655ac1] bg-white text-[#655ac1]'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <span className="flex-1 text-right">{bulkAssignRole || 'اختر الدور للجميع'}</span>
                {bulkAssignRole && (
                  <div className="w-4 h-4 bg-[#655ac1] rounded-full flex items-center justify-center shrink-0">
                    <Check size={9} className="text-white" strokeWidth={3} />
                  </div>
                )}
                <ChevronDown size={13} className={`shrink-0 transition-transform ${isBulkRoleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isBulkRoleDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[9999] min-w-[180px] py-1.5 max-h-64 overflow-y-auto">
                  {ROLES.map(role => (
                    <button
                      key={role}
                      onClick={() => {
                        setBulkAssignRole(role);
                        setBulkAdmins(prev => prev.map(a => ({ ...a, role, agentType: [] })));
                        setIsBulkRoleDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-colors text-right ${
                        bulkAssignRole === role ? 'text-[#655ac1] bg-[#f5f3ff]' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                        bulkAssignRole === role ? 'bg-[#655ac1] border-[#655ac1]' : 'border-slate-300'
                      }`}>
                        {bulkAssignRole === role && <Check size={11} className="text-white" />}
                      </div>
                      {role}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Save / Cancel */}
            <div className="flex items-center gap-2 mr-auto">
              <button
                onClick={saveBulkAdmins}
                className="px-5 py-2 bg-[#655ac1] text-white rounded-xl text-sm font-black hover:bg-[#5448a8] transition-all shadow-lg shadow-[#655ac1]/20 flex items-center gap-2"
              >
                <CheckCircle2 size={15} /> حفظ ({bulkAdmins.filter(a => a.name.trim()).length})
              </button>
              <button
                onClick={() => { setIsBulkEntryMode(false); setBulkAdmins([]); setBulkAssignRole(''); }}
                className="px-5 py-2 bg-white text-slate-400 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-black">
                  <th className="p-4 text-center w-14">م</th>
                  <th className="p-4 text-right min-w-[200px]">اسم الإداري <span className="text-rose-500">*</span></th>
                  <th className="p-4 text-right w-44">الدور الوظيفي</th>
                  <th className="p-4 text-center w-44">رقم الجوال</th>
                  <th className="p-4 text-center w-14" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bulkAdmins.map((admin, index) => (
                  <tr key={admin.id} className="group hover:bg-indigo-50/10 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-bold text-xs">{index + 1}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        placeholder="اسم الإداري"
                        value={admin.name}
                        onChange={e => setBulkAdmins(prev => prev.map((a, i) => i === index ? { ...a, name: e.target.value } : a))}
                        className={`w-full p-3 bg-slate-50 border-2 rounded-xl outline-none text-sm font-bold transition-all focus:bg-white ${
                          admin.name.trim() ? 'border-transparent focus:border-[#655ac1]' : 'border-slate-200 focus:border-rose-400'
                        }`}
                      />
                    </td>
                    <td className="p-3">
                      <div className="space-y-2">
                        <select
                          value={admin.role}
                          onChange={e => setBulkAdmins(prev => prev.map((a, i) =>
                            i === index ? { ...a, role: e.target.value, agentType: [] } : a
                          ))}
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-600 focus:border-[#655ac1]"
                        >
                          <option value="">-- اختر الدور --</option>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        {admin.role === 'وكيل' && (
                          <div className="flex flex-col gap-1 bg-indigo-50/60 border border-indigo-100 rounded-xl p-2">
                            {AGENT_TYPES.map(type => {
                              const sel = (admin.agentType || []).includes(type);
                              return (
                                <div
                                  key={type}
                                  onClick={() => setBulkAdmins(prev => prev.map((a, i) => {
                                    if (i !== index) return a;
                                    const cur = a.agentType || [];
                                    return { ...a, agentType: cur.includes(type) ? cur.filter(t => t !== type) : [...cur, type] };
                                  }))}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs font-bold transition-colors ${
                                    sel ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white text-slate-500'
                                  }`}
                                >
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                    sel ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                                  }`}>
                                    {sel && <Check size={9} className="text-white" strokeWidth={3} />}
                                  </div>
                                  {type}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <input
                        type="tel"
                        dir="ltr"
                        placeholder="05xxxxxxxx"
                        value={admin.phone}
                        onChange={e => setBulkAdmins(prev => prev.map((a, i) => i === index ? { ...a, phone: e.target.value } : a))}
                        className="w-full p-3 bg-slate-50 border border-transparent rounded-xl outline-none text-sm font-bold text-center group-hover:bg-white group-hover:border-slate-200 focus:!border-[#655ac1] focus:!bg-white transition-all"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setBulkAdmins(prev => prev.filter((_, i) => i !== index))}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add Row */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/30 text-center rounded-b-[2rem]">
              <button
                onClick={() => setBulkAdmins(prev => [...prev, {
                  id: `admin-bulk-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
                  name: '', role: bulkAssignRole, phone: '', agentType: [] as string[],
                }])}
                className="px-4 py-2 bg-white border border-dashed border-slate-300 rounded-xl text-slate-500 text-xs font-bold hover:border-[#655ac1] hover:text-[#655ac1] transition-all"
              >
                + إضافة سطر جديد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Bar ────────────────────────────────────────── */}
      {!isBulkEntryMode && (
        <div className="print:hidden">
          <div className="bg-white/60 backdrop-blur-md border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2 shadow-sm">

            {/* Primary actions — inside the bar */}
            <button
              onClick={() => setShowAddSingle(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#655ac1] text-white rounded-xl font-bold shadow-md shadow-[#655ac1]/20 hover:bg-[#5448a8] transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={18} />
              إضافة إداري
            </button>

            <button
              onClick={() => setShowBulkCountModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:border-[#9d8fe8] hover:text-[#655ac1] transition-all hover:scale-105 active:scale-95"
            >
              <Users size={18} className="text-[#9d8fe8]" />
              إضافة عدة إداريين
            </button>

            <input type="file" ref={fileInputRef} hidden accept=".xlsx,.xls" onChange={handleFileUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:border-[#8779fb] hover:text-[#655ac1] transition-all hover:scale-105 active:scale-95"
            >
              <Upload size={18} className="text-[#8779fb]" />
              استيراد من Excel
            </button>

            <div className="flex-1" />

            {/* Edit state indicators */}
            {isEditAll && hasChanges && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 animate-in fade-in">
                <AlertTriangle size={12} />
                يوجد تعديلات غير محفوظة
              </div>
            )}
            {isEditAll && (
              <button
                onClick={cancelEditAll}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-500 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
              >
                <X size={16} />
                إلغاء
              </button>
            )}

            {/* Edit All */}
            <button
              onClick={handleEditAllToggle}
              disabled={admins.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 border ${
                isEditAll
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1] disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isEditAll ? <Save size={16} /> : <Edit size={16} className="text-[#8779fb]" />}
              {isEditAll ? 'حفظ التعديلات' : 'تعديل الكل'}
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-sm font-bold hover:border-[#655ac1] hover:text-[#655ac1] transition-all hover:scale-105 active:scale-95"
            >
              <Printer size={16} className="text-[#8779fb]" />
              طباعة
            </button>

            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              disabled={admins.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white text-rose-500 border border-rose-100 rounded-xl text-sm font-bold hover:bg-rose-500 hover:text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} />
              حذف الكل
            </button>
          </div>
        </div>
      )}

      {/* ── Search + Filter + Stats ────────────────────────────── */}
      {!isBulkEntryMode && admins.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col-reverse lg:flex-row items-center gap-4 justify-between print:hidden">

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

            {/* Role Filter Dropdown */}
            <div className="w-full lg:w-52 shrink-0 relative" ref={roleDropdownRef}>
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className={`w-full px-4 py-3 bg-slate-50 border-0 rounded-xl outline-none text-sm font-bold text-slate-600 flex justify-between items-center ${isRoleDropdownOpen ? 'ring-2 ring-[#8779fb]/20' : ''}`}
              >
                <span className="truncate">{filterRole || 'كل الأدوار'}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isRoleDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[9999] w-full overflow-hidden">
                  <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700">تصفية بالدور</span>
                    {filterRole && (
                      <button onClick={() => { setFilterRole(''); setIsRoleDropdownOpen(false); }} className="text-xs text-[#655ac1] font-black hover:bg-[#f0eeff] px-2 py-0.5 rounded-lg">
                        إعادة ضبط
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto max-h-56 p-2 space-y-0.5">
                    {ROLES.map(role => {
                      const count = admins.filter(a => a.role === role).length;
                      if (count === 0) return null;
                      return (
                        <button
                          key={role}
                          onClick={() => { setFilterRole(role); setIsRoleDropdownOpen(false); }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors text-right ${
                            filterRole === role ? 'bg-[#e5e1fe] text-[#655ac1]' : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <span>{role}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-black ${filterRole === role ? 'bg-[#655ac1] text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-px h-8 bg-slate-200 hidden lg:block mx-2" />

          {/* Stats */}
          <div className="flex items-center gap-4 px-6 py-3 bg-white rounded-2xl border-2 border-[#655ac1]/20 hover:border-[#655ac1]/40 transition-all shrink-0 cursor-default">
            <div className="p-2 bg-slate-100 rounded-xl">
              <Users size={22} className="text-[#655ac1]" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-400 leading-tight">إجمالي الإداريين</span>
              <span className="text-2xl font-black text-[#655ac1] leading-none mt-0.5">
                {filterRole || searchTerm ? `${filteredAdmins.length} / ${admins.length}` : admins.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Admins Table ──────────────────────────────────────── */}
      {!isBulkEntryMode && admins.length > 0 && (
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
          <UserCog size={48} className="mx-auto mb-5" style={{ color: '#8779fb' }} strokeWidth={1.6} />
          <p className="text-slate-600 font-black text-lg mb-1">لا يوجد إداريون بعد</p>
          <p className="text-slate-400 text-sm">
            استخدم زر{' '}
            <span className="font-bold" style={{ color: '#655ac1' }}>استيراد من Excel</span>
            {' '}أو{' '}
            <span className="font-bold" style={{ color: '#655ac1' }}>إضافة إداري</span>
            {' '}أو{' '}
            <span className="font-bold" style={{ color: '#655ac1' }}>إضافة عدة إداريين</span>
            {' '}للبدء
          </p>
        </div>
      )}

      {/* ══════ Portals ══════ */}

      {/* Action Dropdown */}
      {actionDropdown && ReactDOM.createPortal(
        <div
          style={{ position: 'fixed', top: actionDropdown.top, left: actionDropdown.left, zIndex: 99999, width: 168 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const admin = admins.find(a => a.id === actionDropdown.adminId);
              if (admin) startRowEdit(admin);
              setActionDropdown(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#e5e1fe]/50 hover:text-[#655ac1] transition-colors"
          >
            <Edit size={15} className="text-[#8779fb]" />
            تعديل
          </button>
          <div className="h-px bg-slate-100 mx-3" />
          <button
            onClick={() => { setAdminToDelete(actionDropdown.adminId); setActionDropdown(null); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <Trash2 size={15} />
            حذف
          </button>
        </div>,
        document.body
      )}

      {/* Delete Single Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center">
                <Trash2 size={28} className="text-rose-500" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800">تأكيد الحذف</h3>
                <p className="text-sm text-slate-500 mt-1">
                  هل أنت متأكد من حذف
                  {adminToDeleteName
                    ? <span className="font-black text-slate-700"> "{adminToDeleteName}" </span>
                    : ' هذا الإداري '}؟
                </p>
                <p className="text-xs text-rose-400 mt-1">لا يمكن التراجع عن هذا الإجراء</p>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <Button variant="outline" onClick={() => setAdminToDelete(null)} className="flex-1">إلغاء</Button>
              <button
                onClick={confirmDelete}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all"
              >
                <Trash2 size={16} /> حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={28} className="text-rose-500" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800">حذف جميع الإداريين</h3>
                <p className="text-sm text-slate-500 mt-1">
                  سيتم حذف <span className="font-black text-slate-700">{admins.length} إداري</span> بشكل نهائي
                </p>
                <p className="text-xs text-rose-400 mt-1">لا يمكن التراجع عن هذا الإجراء</p>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <Button variant="outline" onClick={() => setShowDeleteAllConfirm(false)} className="flex-1">إلغاء</Button>
              <button
                onClick={confirmDeleteAll}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all"
              >
                <Trash2 size={16} /> حذف الكل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Count Modal */}
      {showBulkCountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <UserPlus size={20} className="text-[#655ac1]" /> إضافة عدة إداريين
              </h3>
              <button onClick={() => setShowBulkCountModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 font-medium mb-5">حدد عدد الإداريين المتوقع إضافتهم وسيتم إنشاء جدول لتعبئة بياناتهم.</p>
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-6">
                <span className="text-sm font-bold text-slate-500 shrink-0">عدد الإداريين:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={bulkCount}
                  onChange={e => setBulkCount(parseInt(e.target.value) || 1)}
                  className="flex-1 p-2 bg-white border border-slate-200 rounded-xl font-bold text-center outline-none focus:border-[#9d8fe8] text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={startBulkEntry}
                  disabled={!bulkCount || bulkCount < 1}
                  className="flex-1 py-3 bg-[#655ac1] text-white rounded-xl text-sm font-black hover:bg-[#5448a8] transition-all shadow-lg shadow-[#655ac1]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} /> إضافة
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

      {/* Add Single Modal */}
      {showAddSingle && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <UserPlus size={24} className="text-[#655ac1]" /> إضافة إداري جديد
              </h3>
              <button onClick={() => setShowAddSingle(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-2">الدور الوظيفي</label>
                  <select
                    value={singleRole}
                    onChange={e => { setSingleRole(e.target.value); setSingleAgentTypes([]); }}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1] transition-all"
                  >
                    <option value="">-- اختر الدور --</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Agent type selector — shown only when role is وكيل */}
                {singleRole === 'وكيل' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-2">
                      صفة الوكيل
                      <span className="text-slate-400 font-medium mr-1">(يمكن اختيار أكثر من صفة)</span>
                    </label>
                    <div className="flex flex-col gap-2 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
                      {AGENT_TYPES.map(type => {
                        const selected = singleAgentTypes.includes(type);
                        return (
                          <div
                            key={type}
                            onClick={() => setSingleAgentTypes(prev =>
                              prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                            )}
                            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer text-sm font-bold transition-colors ${
                              selected ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white text-slate-600'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                              selected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                            }`}>
                              {selected && <Check size={11} className="text-white" strokeWidth={3} />}
                            </div>
                            {type}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={handleAddSingle}
                  disabled={!singleName.trim()}
                  className="flex-1 py-4 bg-[#655ac1] text-white font-black text-sm rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} /> حفظ
                </button>
                <button
                  onClick={() => setShowAddSingle(false)}
                  className="flex-1 py-4 bg-white text-slate-400 border border-slate-200 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Step7Admins;
