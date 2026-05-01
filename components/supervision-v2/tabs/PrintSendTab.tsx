import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer, Send, Loader2,
  Archive, ClipboardList, CalendarDays, CalendarClock, SlidersHorizontal,
  MessageSquare, Bell, Link2, AlertCircle, CheckCircle2,
  ChevronDown, Check, Search, Eye, Users, ArrowRight, RefreshCw, X,
} from 'lucide-react';
import { SchoolInfo, SupervisionScheduleData, Teacher, Admin } from '../../../types';
import {
  getSupervisionPrintData, DAYS, DAY_NAMES, getTimingConfig,
  generateAssignmentMessage, generateReminderMessage,
} from '../../../utils/supervisionUtils';

interface Props {
  supervisionData: SupervisionScheduleData;
  schoolInfo: SchoolInfo;
  teachers: Teacher[];
  admins: Admin[];
  onOpenLegacyPrint: () => void;
  onOpenLegacySend: () => void;
  onOpenMessagesArchive?: () => void;
  showToast?: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

type TaskMode = 'print' | 'send';
type PaperSize = 'A4' | 'A3';
type PrintColorMode = 'color' | 'bw';
type PrintSignatureMode = 'with' | 'without';
type SendMode = 'electronic' | 'text' | 'reminder';
type SendAudience = 'supervisors' | 'followups' | 'all';
type SendChannel = 'whatsapp' | 'sms';
type SigFilter = 'all' | 'signed' | 'pending';

type DropdownOption = {
  value: string;
  label: string;
  icon?: React.ComponentType<any>;
  disabled?: boolean;
};

const WhatsAppIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

const useDropdownPosition = (open: boolean, onClose: () => void) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 });

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const margin = 16;
      const width = Math.min(430, Math.max(260, rect.width));
      const safeWidth = Math.min(width, window.innerWidth - margin * 2);
      setPosition({
        top: rect.bottom + 10,
        left: Math.min(Math.max(margin, rect.left), window.innerWidth - safeWidth - margin),
        width: safeWidth,
      });
    };
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inButton = triggerRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inButton && !inPanel) onClose();
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  return { triggerRef, panelRef, position };
};

const SingleSelectDropdown: React.FC<{
  label: string;
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minWidthClass?: string;
}> = ({ label, value, options, placeholder, onChange, disabled = false, minWidthClass = 'min-w-[220px]' }) => {
  const [open, setOpen] = useState(false);
  const { triggerRef, panelRef, position } = useDropdownPosition(open, () => setOpen(false));
  const selected = options.find(option => option.value === value);

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  return (
    <div className={`flex-1 ${minWidthClass}`}>
      {label ? <label className="block text-xs font-black text-slate-500 mb-2">{label}</label> : null}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(c => !c)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div ref={panelRef} className="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[130] animate-in slide-in-from-top-2"
          style={{ top: position.top, left: position.left, width: position.width }}>
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {options.map(option => (
              <button key={option.value} type="button" disabled={option.disabled}
                onClick={() => { if (option.disabled) return; onChange(option.value); setOpen(false); }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                  option.disabled ? 'text-slate-300 cursor-not-allowed bg-slate-50/70' :
                  value === option.value ? 'bg-white text-[#655ac1]'
                    : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                }`}>
                <span className="flex items-center gap-2">
                  {option.icon ? <option.icon size={15} className="text-[#655ac1]" /> : null}
                  {option.label}
                </span>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                  value === option.value ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'
                }`}>
                  <Check size={12} strokeWidth={3} />
                </span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const MultiSelectDropdown: React.FC<{
  label: string;
  buttonLabel: string;
  options: DropdownOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  onSelectAll?: () => void;
  selectedSummary?: string;
  searchable?: boolean;
  minWidthClass?: string;
}> = ({ label, buttonLabel, options, selectedValues, onToggle, onClear, onSelectAll, selectedSummary, searchable = false, minWidthClass = 'min-w-[260px]' }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { triggerRef, panelRef, position } = useDropdownPosition(open, () => setOpen(false));

  const filteredOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(option => option.label.toLowerCase().includes(q));
  }, [options, search, searchable]);

  return (
    <div className={`flex-1 ${minWidthClass}`}>
      {label ? <label className="block text-xs font-black text-slate-500 mb-2">{label}</label> : null}
      <button ref={triggerRef} type="button" onClick={() => setOpen(c => !c)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2">
        <span className="truncate">{selectedSummary || buttonLabel}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div ref={panelRef} className="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[130] animate-in slide-in-from-top-2"
          style={{ top: position.top, left: position.left, width: position.width }}>
          {searchable && (
            <div className="relative mb-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="ابحث..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#655ac1]/20 font-medium" />
            </div>
          )}
          <div className="flex items-center justify-between px-2 py-2 mb-2 border border-slate-100 bg-slate-50 rounded-xl">
            {onSelectAll ? (
              <button type="button" onClick={onSelectAll} className="text-xs font-black text-[#655ac1] hover:underline">اختيار الكل</button>
            ) : <span />}
            <button type="button" onClick={onClear} className="text-xs font-black text-slate-400 hover:text-rose-500 hover:underline">إلغاء الكل</button>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {filteredOptions.map(option => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button key={option.value} type="button" onClick={() => onToggle(option.value)}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                    isSelected ? 'bg-white text-[#655ac1]'
                      : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                  }`}>
                  <span className="flex items-center gap-2">
                    {option.icon ? <option.icon size={15} className="text-[#655ac1]" /> : null}
                    {option.label}
                  </span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                    isSelected ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'
                  }`}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                </button>
              );
            })}
            {filteredOptions.length === 0 && (
              <p className="text-center text-xs text-slate-400 font-medium py-3">لا توجد نتائج مطابقة</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────
const PrintSendTab: React.FC<Props> = ({
  supervisionData, schoolInfo, teachers, admins,
  onOpenLegacyPrint, onOpenLegacySend, onOpenMessagesArchive, showToast,
}) => {
  const [taskMode, setTaskMode] = useState<TaskMode>('print');

  // Print state
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [printColorMode, setPrintColorMode] = useState<PrintColorMode>('color');
  const [printSignatureMode, setPrintSignatureMode] = useState<PrintSignatureMode>('without');
  const [showNotesField, setShowNotesField] = useState(false);
  const [footerText, setFooterText] = useState(supervisionData.footerText || '');

  // Send state
  const [sendMode, setSendMode] = useState<SendMode>('electronic');
  const [sendAudience, setSendAudience] = useState<SendAudience>('supervisors');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedStaffKeys, setSelectedStaffKeys] = useState<string[]>([]);
  const [sendChannel, setSendChannel] = useState<SendChannel>('whatsapp');
  const [messageText, setMessageText] = useState('');
  const [isSendScheduled, setIsSendScheduled] = useState(false);
  const [sendScheduleDate, setSendScheduleDate] = useState('');
  const [sendScheduleTime, setSendScheduleTime] = useState('08:00');
  const [isSendingNow, setIsSendingNow] = useState(false);
  const [sendResults, setSendResults] = useState<{ name: string; status: 'sent' | 'failed' }[]>([]);

  // Receipt log state
  const [sigReceiptOpen, setSigReceiptOpen] = useState(false);
  const [sigFilter, setSigFilter] = useState<SigFilter>('all');
  const [sigSearch, setSigSearch] = useState('');

  const printData = useMemo(
    () => getSupervisionPrintData(supervisionData, schoolInfo),
    [supervisionData, schoolInfo]
  );
  const hasData = printData.days.some(d => d.supervisors.length > 0);

  const activeDays = useMemo(() => getTimingConfig(schoolInfo).activeDays || DAYS.slice(), [schoolInfo]);

  const dayOptions: DropdownOption[] = useMemo(
    () => activeDays.map(d => ({ value: d, label: DAY_NAMES[d] || d })),
    [activeDays]
  );

  type SendRow = {
    key: string;
    staffId: string;
    staffName: string;
    staffType: 'teacher' | 'admin';
    role: 'supervisor' | 'followup';
    day: string;
    locationNames: string[];
    phone?: string;
  };

  const sendRows: SendRow[] = useMemo(() => {
    const findStaff = (staffId: string, staffType: 'teacher' | 'admin') => {
      if (staffType === 'teacher') return teachers.find(t => t.id === staffId);
      return admins.find(a => a.id === staffId);
    };

    const rows: SendRow[] = [];
    supervisionData.dayAssignments.forEach(da => {
      da.staffAssignments.forEach(sa => {
        const staff = findStaff(sa.staffId, sa.staffType as 'teacher' | 'admin');
        const locationNames = sa.locationIds
          .map(lid => supervisionData.locations.find(l => l.id === lid)?.name || '')
          .filter(Boolean);
        rows.push({
          key: `sup-${da.day}-${sa.staffId}`,
          staffId: sa.staffId,
          staffName: sa.staffName,
          staffType: sa.staffType as 'teacher' | 'admin',
          role: 'supervisor',
          day: da.day,
          locationNames,
          phone: (staff as any)?.phone || (staff as any)?.phoneNumber,
        });
      });
      if (da.followUpSupervisorId && da.followUpSupervisorName) {
        const asTeacher = teachers.find(t => t.id === da.followUpSupervisorId);
        const asAdmin = !asTeacher ? admins.find(a => a.id === da.followUpSupervisorId) : null;
        const staffType: 'teacher' | 'admin' = asTeacher ? 'teacher' : 'admin';
        const staff = asTeacher || asAdmin;
        rows.push({
          key: `fu-${da.day}-${da.followUpSupervisorId}`,
          staffId: da.followUpSupervisorId,
          staffName: da.followUpSupervisorName,
          staffType,
          role: 'followup',
          day: da.day,
          locationNames: [],
          phone: (staff as any)?.phone || (staff as any)?.phoneNumber,
        });
      }
    });
    return rows;
  }, [supervisionData, teachers, admins]);

  const filteredSendRows = useMemo(() => {
    return sendRows.filter(r => {
      if (selectedDays.length > 0 && !selectedDays.includes(r.day)) return false;
      if (sendAudience === 'supervisors' && r.role !== 'supervisor') return false;
      if (sendAudience === 'followups' && r.role !== 'followup') return false;
      return true;
    });
  }, [sendRows, selectedDays, sendAudience]);

  const staffOptions: DropdownOption[] = useMemo(
    () => filteredSendRows.map(r => ({
      value: r.key,
      label: `${r.staffName} — ${DAY_NAMES[r.day] || r.day}${r.role === 'followup' ? ' (متابع)' : ''}`,
    })),
    [filteredSendRows]
  );

  useEffect(() => {
    const validKeys = new Set(filteredSendRows.map(r => r.key));
    setSelectedStaffKeys(curr => curr.filter(k => validKeys.has(k)));
  }, [filteredSendRows]);

  const selectedRows = useMemo(
    () => filteredSendRows.filter(r => selectedStaffKeys.includes(r.key)),
    [filteredSendRows, selectedStaffKeys]
  );

  useEffect(() => {
    if (selectedRows.length === 0) { setMessageText(''); return; }
    const sample = selectedRows[0];
    let txt = '';
    if (sendMode === 'electronic') {
      txt = `${sample.staffType === 'teacher' ? 'المعلم الفاضل' : 'الإداري الفاضل'}/ ${sample.staffName} — نشعركم بإسناد مهمة الإشراف اليومي لكم في يوم ${DAY_NAMES[sample.day] || sample.day}.\nالرجاء التوقيع عبر الرابط: <رابط التوقيع>`;
    } else if (sendMode === 'text') {
      txt = generateAssignmentMessage(sample.staffName, sample.staffType, sample.day, sample.locationNames);
    } else {
      txt = generateReminderMessage(sample.staffName, sample.staffType, sample.day, sample.locationNames);
    }
    setMessageText(txt);
  }, [sendMode, selectedRows]);

  const buildMessage = (row: SendRow): string => {
    if (sendMode === 'text') return generateAssignmentMessage(row.staffName, row.staffType, row.day, row.locationNames);
    if (sendMode === 'reminder') return generateReminderMessage(row.staffName, row.staffType, row.day, row.locationNames);
    return `${row.staffType === 'teacher' ? 'المعلم الفاضل' : 'الإداري الفاضل'}/ ${row.staffName} — نشعركم بإسناد مهمة الإشراف اليومي لكم في يوم ${DAY_NAMES[row.day] || row.day}.\nالرجاء التوقيع عبر الرابط: <رابط التوقيع>`;
  };

  // ─── Receipt log rows ──────────────────────────────────────────────────
  type ReceiptRow = {
    key: string;
    staffId: string;
    staffName: string;
    role: 'supervisor' | 'followup';
    day: string;
    status: 'signed' | 'pending';
    sentAt?: string;
    signedAt?: string;
    signatureData?: string;
  };

  const receiptRows: ReceiptRow[] = useMemo(() => {
    const list: ReceiptRow[] = [];
    supervisionData.dayAssignments.forEach(da => {
      da.staffAssignments.forEach(sa => {
        if (sa.signatureToken || sa.signatureStatus) {
          list.push({
            key: `sup-${da.day}-${sa.staffId}`,
            staffId: sa.staffId,
            staffName: sa.staffName,
            role: 'supervisor',
            day: da.day,
            status: sa.signatureStatus === 'signed' ? 'signed' : 'pending',
            signatureData: sa.signatureData,
          });
        }
      });
      if (da.followUpSupervisorId && (da.followUpSignatureToken || da.followUpSignatureStatus)) {
        list.push({
          key: `fu-${da.day}-${da.followUpSupervisorId}`,
          staffId: da.followUpSupervisorId,
          staffName: da.followUpSupervisorName || '—',
          role: 'followup',
          day: da.day,
          status: da.followUpSignatureStatus === 'signed' ? 'signed' : 'pending',
          signatureData: da.followUpSignatureData,
        });
      }
    });
    return list;
  }, [supervisionData]);

  const signedCount = receiptRows.filter(r => r.status === 'signed').length;
  const pendingCount = receiptRows.filter(r => r.status === 'pending').length;

  const filteredReceipts = useMemo(() => {
    return receiptRows.filter(r =>
      (sigFilter === 'all' || r.status === sigFilter) &&
      (sigSearch.trim() === '' || r.staffName.includes(sigSearch.trim()))
    );
  }, [receiptRows, sigFilter, sigSearch]);

  // ─── Helpers ───────────────────────────────────────────────────────────
  const actionButtonClass = (active: boolean) =>
    `inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-black border transition-all ${
      active
        ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-md shadow-[#655ac1]/20'
        : 'bg-white text-slate-700 border-slate-200 hover:border-[#cfc8ff] hover:text-[#655ac1] hover:bg-slate-50'
    }`;

  const sendChannelLabel = sendChannel === 'whatsapp' ? 'الواتساب' : 'الرسائل النصية';

  const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // ─── Direct print without modal ─────────────────────────────────────────
  const handleDirectPrint = () => {
    if (!hasData) { showToast?.('لا يوجد جدول إشراف للطباعة', 'warning'); return; }

    const printWindow = window.open('', '_blank');
    if (!printWindow) { showToast?.('تعذّر فتح نافذة الطباعة', 'error'); return; }

    const isBW = printColorMode === 'bw';
    const headerColor = isBW ? '#1e293b' : '#1e293b';
    const accentColor = isBW ? '#1e293b' : '#655ac1';
    const headBg = isBW ? '#ffffff' : '#f1f5f9';
    const stripeBg = isBW ? '#ffffff' : '#f8fafc';
    const dayBg = isBW ? '#ffffff' : '#f1f5f9';

    const includeSignature = printSignatureMode === 'with';
    const finalFooter = showNotesField ? footerText.trim() : '';
    const activeTypes = (supervisionData.supervisionTypes || [])
      .filter(type => type.isEnabled)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const inlineTypes = activeTypes.filter(type => type.displayMode === 'inline');
    const separateGroups = Array.from(
      activeTypes
        .filter(type => type.displayMode === 'separate')
        .reduce((groups, type) => {
          const key = type.tableGroup || `solo-${type.id}`;
          groups.set(key, [...(groups.get(key) || []), type]);
          return groups;
        }, new Map<string, typeof activeTypes>())
        .entries()
    ).map(([id, types]) => ({ id, types }));

    const getDayAssignment = (day: string) =>
      supervisionData.dayAssignments.find(item => item.day === day);
    const getStaffForType = (day: string, typeId: string) =>
      (getDayAssignment(day)?.staffAssignments || []).filter(item => item.contextTypeId === typeId);
    const formatLocations = (locationIds: string[]) => locationIds
      .map(id => supervisionData.locations.find(location => location.id === id)?.name || '')
      .filter(Boolean)
      .join('، ');
    const renderStaffCell = (day: string, typeId: string) => {
      const rows = getStaffForType(day, typeId);
      if (rows.length === 0) return '<span class="empty-state">فارغ للتعبئة اليدوية</span>';
      return rows.map(row => {
        const locations = formatLocations(row.locationIds);
        return `<div class="staff-line">
          <div class="staff-name">${escapeHtml(row.staffName)}</div>
          <div class="staff-locations">${escapeHtml(locations || 'بدون موقع محدد')}</div>
        </div>`;
      }).join('');
    };
    const renderSignatureCell = (day: string, typeId: string) => {
      const rows = getStaffForType(day, typeId);
      if (rows.length === 0) return '<span class="empty-state">—</span>';
      return rows.map(() => '<div class="signature-line"></div>').join('');
    };
    const renderTable = (title: string, types: typeof activeTypes) => {
      if (types.length === 0) return '';
      const typeColWidth = includeSignature ? 56 / types.length : 78 / types.length;
      const signatureColWidth = includeSignature ? 22 / types.length : 0;
      return `
        <section class="schedule-section">
          <h2 class="section-title">${escapeHtml(title)}</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 12%;">اليوم</th>
                ${types.map(type => `
                  <th style="width: ${typeColWidth}%;">${escapeHtml(type.name)}</th>
                  ${includeSignature ? `<th style="width: ${signatureColWidth}%;">توقيع ${escapeHtml(type.name)}</th>` : ''}
                `).join('')}
                <th style="width: 10%;">المشرف المتابع</th>
                ${includeSignature ? '<th style="width: 10%;">توقيع المشرف المتابع</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${activeDays.map(day => {
                const dayAssignment = getDayAssignment(day);
                return `<tr>
                  <td class="day-header">${escapeHtml(DAY_NAMES[day] || day)}</td>
                  ${types.map(type => `
                    <td>${renderStaffCell(day, type.id)}</td>
                    ${includeSignature ? `<td>${renderSignatureCell(day, type.id)}</td>` : ''}
                  `).join('')}
                  <td class="followup">${escapeHtml(dayAssignment?.followUpSupervisorName || '—')}</td>
                  ${includeSignature ? '<td class="followup-signature signature-cell"></td>' : ''}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </section>
      `;
    };
    const printableTables = [
      renderTable('جدول الإشراف اليومي', inlineTypes),
      ...separateGroups.map(group => renderTable(group.types.length === 1 ? group.types[0].name : 'جدول إشراف مستقل', group.types)),
    ].join('');

    printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>جدول الإشراف اليومي - ${escapeHtml(printData.schoolName)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap');
    @page { size: ${paperSize} landscape; margin: 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Tajawal', 'Arial', sans-serif; padding: 18px; direction: rtl; background: #fff; ${isBW ? 'filter: grayscale(100%);' : ''} }
    .print-container { max-width: 100%; margin: 0 auto; }
    .header-wrapper { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${headerColor}; padding-bottom: 14px; margin-bottom: 18px; }
    .header-right, .header-left { width: 33%; font-weight: bold; font-size: 12px; color: ${headerColor}; line-height: 1.8; }
    .header-right { text-align: right; }
    .header-left { text-align: left; }
    .header-center { width: 33%; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .logo-circle { width: 56px; height: 56px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; }
    .logo-text { font-size: 9px; color: #94a3b8; }
    .header-title { font-size: 18px; font-weight: 900; color: ${headerColor}; margin-bottom: 4px; }
    .section-title { color: ${accentColor}; font-size: 14px; font-weight: 900; margin: 14px 0 8px; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; table-layout: fixed; }
    th { background-color: ${headBg}; color: ${accentColor}; border: 1px solid #cbd5e1; padding: 9px; font-weight: 900; text-align: center; }
    td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; }
    tr:nth-child(even) td { background-color: ${stripeBg}; }
    .day-header { background-color: ${dayBg} !important; font-weight: 900; color: ${accentColor}; text-align: center; vertical-align: middle; }
    .staff-line { padding: 5px 0; border-bottom: 1px dashed #e2e8f0; }
    .staff-line:last-child { border-bottom: 0; }
    .staff-name { font-weight: 900; color: ${headerColor}; line-height: 1.5; }
    .staff-locations { margin-top: 2px; color: #64748b; font-size: 10px; line-height: 1.5; }
    .followup { color: ${accentColor}; font-weight: 900; text-align: center; vertical-align: middle; }
    .signature-line { min-height: 38px; border-bottom: 1px dotted #94a3b8; margin: 0 4px 6px; }
    .signature-line:last-child { margin-bottom: 0; }
    .signature-cell { height: 46px; border-bottom: 1px dotted #94a3b8; }
    .followup-signature { vertical-align: middle; }
    .empty-state { color: #94a3b8; font-style: italic; text-align: center; }
    .footer { margin-top: 18px; text-align: right; font-size: 12px; font-weight: bold; color: #475569; padding: 12px 14px; border: 1px dashed #94a3b8; border-radius: 10px; white-space: pre-wrap; }
    @media print {
      body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      th { background-color: ${headBg} !important; color: ${headerColor} !important; }
      .day-header { background-color: ${dayBg} !important; color: ${accentColor} !important; }
      tr:nth-child(even) td { background-color: ${stripeBg} !important; }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <div class="header-wrapper">
      <div class="header-right">
        <p>المملكة العربية السعودية</p>
        <p>وزارة التعليم</p>
        <p>${escapeHtml(schoolInfo.region || 'إدارة التعليم بالمنطقة')}</p>
        <p>مدرسة ${escapeHtml(printData.schoolName || '..........')}</p>
        <p>الفصل الدراسي: ${escapeHtml(printData.semester)}</p>
      </div>
      <div class="header-center">
        ${schoolInfo.logo
          ? `<img src="${schoolInfo.logo}" style="width:56px;height:56px;object-fit:contain;margin-bottom:8px;" />`
          : `<div class="logo-circle"><span class="logo-text">شعار</span></div>`}
        <h1 class="header-title">${escapeHtml(printData.title)}</h1>
      </div>
      <div class="header-left">
        <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
        <p>العام الدراسي: ${escapeHtml(schoolInfo.academicYear || '')}</p>
      </div>
    </div>

    ${printableTables}

    ${finalFooter ? `<div class="footer">${escapeHtml(finalFooter)}</div>` : ''}

    <div style="margin-top: 50px; padding-right: 40px; font-weight: bold; font-size: 14px; color: #334155; text-align: right;">
      <p>مدير المدرسة / ${escapeHtml(schoolInfo.principal || '............................')}</p>
      <p style="margin-top: 30px; border-top: 1px dotted #94a3b8; padding-top: 4px;">التوقيع</p>
    </div>
  </div>

  <script>
    document.fonts.ready.then(() => { window.print(); });
    setTimeout(() => { window.print(); }, 1200);
  </script>
</body>
</html>
    `);
    printWindow.document.close();
    showToast?.('تم فتح نافذة الطباعة', 'success');
  };

  const validateSendSelection = (): boolean => {
    if (selectedRows.length === 0) {
      showToast?.('يرجى اختيار مستلم واحد على الأقل', 'warning');
      return false;
    }
    return true;
  };

  const handleSendDirectly = async () => {
    if (!validateSendSelection()) return;
    setIsSendingNow(true);
    setSendResults([]);
    const results: { name: string; status: 'sent' | 'failed' }[] = [];

    for (const row of selectedRows) {
      const msg = messageText && selectedRows.length === 1 ? messageText : buildMessage(row);
      try {
        if (sendChannel === 'whatsapp') {
          const phone = (row.phone || '').replace(/\D/g, '');
          if (!phone) { results.push({ name: row.staffName, status: 'failed' }); continue; }
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
          const phone = row.phone || '';
          if (!phone) { results.push({ name: row.staffName, status: 'failed' }); continue; }
          window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, '_blank');
        }
        results.push({ name: row.staffName, status: 'sent' });
        await new Promise(r => setTimeout(r, 400));
      } catch {
        results.push({ name: row.staffName, status: 'failed' });
      }
    }
    setSendResults(results);
    setIsSendingNow(false);
    showToast?.(`اكتمل الإرسال — ${results.filter(r => r.status === 'sent').length} نجح / ${results.filter(r => r.status === 'failed').length} فشل`, 'success');
  };

  const openPreviewMessage = () => {
    if (selectedRows.length === 0) {
      showToast?.('اختر مستلماً واحداً على الأقل لمعاينة الرسالة', 'warning');
      return;
    }
    onOpenLegacySend();
  };

  // ─── Receipt log inline page ──────────────────────────────────────────
  if (sigReceiptOpen) {
    return (
      <div className="space-y-5" dir="rtl">
        {/* Header */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-slate-800 text-lg">سجل استلام الإشراف</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {signedCount} وقّع من أصل {receiptRows.length} مشرف
              </p>
            </div>
            <button type="button" onClick={() => setSigReceiptOpen(false)} className={actionButtonClass(false)}>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'إجمالي المشرفين', value: String(receiptRows.length), icon: Users },
            { label: 'وقّعوا', value: String(signedCount), icon: CheckCircle2 },
            { label: 'لم يوقعوا بعد', value: String(pendingCount), icon: AlertCircle },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl px-4 py-5 flex items-start gap-3"
              style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-center shrink-0 text-[#655ac1]">
                <s.icon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-400 leading-none">{s.label}</p>
                <p className="mt-1 font-black text-slate-800 text-xl leading-none">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-500 ml-1">تصفية:</span>
            {(['all', 'signed', 'pending'] as const).map(f => (
              <button key={f} type="button" onClick={() => setSigFilter(f)}
                className={`px-4 py-2 rounded-xl border text-xs font-black transition-all ${
                  sigFilter === f
                    ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1]'
                }`}>
                {f === 'all' ? 'الكل' : f === 'signed' ? 'وقّع' : 'لم يوقع'}
              </button>
            ))}
            <div className="flex-1" />
            <button type="button" onClick={() => { setSigSearch(''); setSigFilter('all'); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all">
              <RefreshCw size={13} />
              تحديث
            </button>
            <button type="button" onClick={handleDirectPrint} disabled={receiptRows.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50">
              <Printer size={13} />
              طباعة التقرير
            </button>
            <button type="button" onClick={onOpenLegacyPrint} disabled={receiptRows.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50">
              <Printer size={13} />
              طباعة النماذج
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden"
          style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4">
            <p className="text-sm font-black text-slate-800 flex items-center gap-2">
              <ClipboardList size={18} className="text-[#655ac1]" />
              سجل الاستلام
            </p>
            <div className="relative w-56">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" value={sigSearch} onChange={e => setSigSearch(e.target.value)}
                placeholder="ابحث عن مشرف..."
                className="w-full pr-8 pl-7 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#655ac1] focus:bg-white transition-all"
                dir="rtl" />
              {sigSearch && (
                <button type="button" onClick={() => setSigSearch('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {receiptRows.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="mx-auto mb-4 text-slate-300" size={40} />
              <p className="text-sm font-bold text-slate-400">لا توجد طلبات استلام مرسلة بعد.</p>
              <p className="text-xs text-slate-400 mt-1">أرسل تكليف إشراف إلكترونياً ليظهر هنا سجل الاستلام.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-right" dir="rtl">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px]">م</th>
                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px]">اسم المشرف</th>
                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px]">اليوم</th>
                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px]">الدور</th>
                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px]">الحالة</th>
                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts.map((req, idx) => (
                    <tr key={req.key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-400 text-sm font-bold">{idx + 1}</td>
                      <td className="px-6 py-4 font-black text-slate-800">{req.staffName}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{DAY_NAMES[req.day] || req.day}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {req.role === 'supervisor' ? 'مشرف' : 'مشرف متابع'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${
                          req.status === 'signed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {req.status === 'signed' ? 'وقّع' : 'لم يوقع'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button type="button" onClick={onOpenLegacySend} title="معاينة النموذج"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#f0edff] transition-all">
                            <Eye size={13} />
                            معاينة
                          </button>
                          <button type="button" onClick={onOpenLegacyPrint} title="طباعة النموذج"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#f0edff] transition-all">
                            <Printer size={13} />
                            طباعة
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredReceipts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm font-medium text-slate-400">
                        لا توجد نتائج تطابق الفلتر.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-5" dir="rtl">
      {/* شريط التبويب العلوي */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-5">
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'print' as TaskMode, label: 'طباعة', icon: Printer },
            { id: 'send' as TaskMode, label: 'إرسال', icon: Send },
          ].map(option => (
            <button key={option.id} type="button" onClick={() => setTaskMode(option.id)}
              className={actionButtonClass(taskMode === option.id)}>
              <option.icon size={17} />
              {option.label}
            </button>
          ))}
          <button type="button" onClick={() => setSigReceiptOpen(true)} className={actionButtonClass(false)}>
            <ClipboardList size={17} />
            سجل استلام الإشراف
          </button>
          <button type="button" onClick={onOpenMessagesArchive} disabled={!onOpenMessagesArchive}
            className={`${actionButtonClass(false)} disabled:opacity-50 disabled:cursor-not-allowed`}>
            <Archive size={17} />
            أرشيف الرسائل
          </button>
        </div>
      </div>

      {/* ══════ الطباعة — بطاقة واحدة ══════ */}
      {taskMode === 'print' && (
        <div className="space-y-4">
          <div className="px-1">
            <h3 className="font-black text-slate-800 text-lg">الطباعة</h3>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-start gap-3 mb-2">
              <SlidersHorizontal size={20} className="text-[#655ac1]" />
              <h4 className="font-black text-slate-800">تخصيص الطباعة</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium text-right mb-5">
              اضبط مقاس الورقة واختر الألوان وأضف الملاحظات في الجدول قبل الطباعة.
            </p>

            <div className="flex flex-wrap items-end gap-4 mb-5">
              <SingleSelectDropdown
                label="مقاس الورق"
                value={paperSize}
                onChange={value => setPaperSize(value as PaperSize)}
                placeholder="اختر المقاس"
                options={[{ value: 'A4', label: 'A4' }, { value: 'A3', label: 'A3' }]}
              />
              <SingleSelectDropdown
                label="اللون"
                value={printColorMode}
                onChange={value => setPrintColorMode(value as PrintColorMode)}
                placeholder="اختر اللون"
                options={[{ value: 'color', label: 'ملون' }, { value: 'bw', label: 'أبيض وأسود' }]}
              />
              <SingleSelectDropdown
                label="خانة توقيع المشرف"
                value={printSignatureMode}
                onChange={value => setPrintSignatureMode(value as PrintSignatureMode)}
                placeholder="اختر خيار التوقيع"
                options={[
                  { value: 'with', label: 'إضافة خانة توقيع لكل مشرف' },
                  { value: 'without', label: 'بدون خانة توقيع' },
                ]}
              />
            </div>

            <div className="mb-5">
              <label className="block text-xs font-black text-slate-500 mb-2">الملاحظات</label>
              <p className="text-xs font-bold text-slate-600 mb-3">
                هل تريد إضافة ملاحظات في جدول الإشراف اليومي قبل الطباعة ؟{' '}
                <button
                  type="button"
                  onClick={() => setShowNotesField(open => !open)}
                  className="text-[#8779fb] hover:text-[#655ac1] underline underline-offset-4"
                >
                  {showNotesField ? 'إلغاء' : 'انقر هنا'}
                </button>
              </p>
              {showNotesField && (
                <textarea
                  value={footerText}
                  onChange={e => setFooterText(e.target.value)}
                  placeholder={printData.footerText}
                  rows={3}
                  className="w-full border-2 border-slate-100 rounded-xl p-4 outline-none focus:border-[#655ac1] resize-none text-sm leading-relaxed transition-colors"
                  dir="rtl"
                />
              )}
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleDirectPrint}
                className="inline-flex min-w-[160px] items-center justify-center gap-2 px-10 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-500 text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all shadow-sm"
              >
                <Printer size={16} />
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ الإرسال ══════ */}
      {taskMode === 'send' && (
        <div className="space-y-4">
          <div className="px-1">
            <h3 className="font-black text-slate-800 text-lg">إرسال الإشراف</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-start gap-3 mb-2">
                <CalendarDays size={20} className="text-[#655ac1]" />
                <h4 className="font-black text-slate-800">اختر نوع الإشعار والمستلمين</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium text-right mb-5">
                اختر نوع الإشعار أولاً ثم حدد المستلمين والأيام المطلوبة.
              </p>
              <div className="space-y-4">
                <SingleSelectDropdown
                  label="نوع الإشعار"
                  value={sendMode}
                  onChange={v => setSendMode(v as SendMode)}
                  placeholder="اختر النوع"
                  options={[
                    { value: 'electronic', label: 'إشعار إلكتروني للتوقيع', icon: Link2 },
                    { value: 'text', label: 'رسالة تكليف نصية', icon: MessageSquare },
                    { value: 'reminder', label: 'رسالة تذكير', icon: Bell },
                  ]}
                />
                <SingleSelectDropdown
                  label="المستلمون"
                  value={sendAudience}
                  onChange={v => setSendAudience(v as SendAudience)}
                  placeholder="اختر الجهة"
                  options={[
                    { value: 'supervisors', label: 'المشرفون' },
                    { value: 'followups', label: 'المتابعون' },
                    { value: 'all', label: 'الكل (المشرفون والمتابعون)' },
                  ]}
                />
                <MultiSelectDropdown
                  label="الأيام المستهدفة"
                  buttonLabel="اختر الأيام"
                  selectedSummary={selectedDays.length > 0 ? `${selectedDays.length} أيام محددة` : undefined}
                  options={dayOptions}
                  selectedValues={selectedDays}
                  onToggle={v => setSelectedDays(c => c.includes(v) ? c.filter(i => i !== v) : [...c, v])}
                  onClear={() => setSelectedDays([])}
                  onSelectAll={() => setSelectedDays(activeDays)}
                />
                <MultiSelectDropdown
                  label="المشرفون المستلمون"
                  buttonLabel="اختر المشرفين"
                  selectedSummary={selectedStaffKeys.length > 0 ? `${selectedStaffKeys.length} مستلم محدد` : undefined}
                  options={staffOptions}
                  selectedValues={selectedStaffKeys}
                  onToggle={v => setSelectedStaffKeys(c => c.includes(v) ? c.filter(i => i !== v) : [...c, v])}
                  onClear={() => setSelectedStaffKeys([])}
                  onSelectAll={() => setSelectedStaffKeys(filteredSendRows.map(r => r.key))}
                  searchable
                />
                {selectedRows.length > 0 && (
                  <div className="rounded-2xl border border-[#e5e1fe] bg-[#f8f7ff] px-4 py-3 text-xs font-black text-[#655ac1] flex items-center gap-2">
                    <Users size={14} />
                    {selectedRows.length} مستلم محدد — {sendMode === 'electronic' ? 'إشعار إلكتروني' : sendMode === 'text' ? 'تكليف نصي' : 'تذكير'}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-start gap-3 mb-4">
                  <MessageSquare size={20} className="text-[#655ac1]" />
                  <h4 className="font-black text-slate-800">طريقة الإرسال المفضلة</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setSendChannel('whatsapp')}
                    className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${
                      sendChannel === 'whatsapp' ? 'border-[#25D366] bg-white shadow-sm' : 'border-slate-100 hover:border-slate-200'
                    }`}>
                    <span className={sendChannel === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-300'}>
                      <WhatsAppIcon size={28} />
                    </span>
                    <span className={`font-black mt-2 text-sm ${sendChannel === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-400'}`}>واتساب</span>
                  </button>
                  <button type="button" onClick={() => setSendChannel('sms')}
                    className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${
                      sendChannel === 'sms' ? 'border-[#007AFF] bg-white shadow-sm' : 'border-slate-100 hover:border-slate-200'
                    }`}>
                    <MessageSquare size={28} className={sendChannel === 'sms' ? 'text-[#007AFF]' : 'text-slate-300'} />
                    <span className={`font-black mt-2 text-sm ${sendChannel === 'sms' ? 'text-[#007AFF]' : 'text-slate-400'}`}>النصية SMS</span>
                  </button>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-start gap-3 mb-4">
                  <Eye size={20} className="text-[#655ac1]" />
                  <h4 className="font-black text-slate-800">المعاينة والروابط</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={openPreviewMessage}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all">
                    <Eye size={15} /> معاينة الرسالة
                  </button>
                  <button type="button" onClick={onOpenLegacySend} disabled={selectedRows.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all disabled:opacity-50">
                    <Users size={15} /> معاينة المستلمين{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                  </button>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <MessageSquare size={20} className="text-[#655ac1]" />
                  <h4 className="font-black text-slate-800">نص الرسالة</h4>
                </div>
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  rows={5}
                  className="w-full border-2 border-slate-100 rounded-xl p-4 outline-none focus:border-[#655ac1] resize-none text-sm leading-relaxed transition-colors mb-2"
                  placeholder="نص الرسالة..."
                  dir="rtl"
                />
                <p className="text-[10px] text-slate-400 font-bold mb-4">يتم تخصيص الرسالة لكل مستلم تلقائياً عند الإرسال</p>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarClock size={16} className="text-[#655ac1]" />
                      <span className="text-sm font-black text-slate-700">جدولة الإرسال لوقت لاحق</span>
                    </div>
                    <button type="button" onClick={() => setIsSendScheduled(c => !c)}
                      className={`relative inline-flex w-10 h-6 rounded-full transition-all ${isSendScheduled ? 'bg-[#655ac1]' : 'bg-slate-300'}`}
                      role="switch" aria-checked={isSendScheduled}>
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isSendScheduled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  {isSendScheduled && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <div className="flex-1 min-w-[140px]">
                        <label className="text-xs font-black text-slate-500 block mb-1.5">التاريخ</label>
                        <input type="date" value={sendScheduleDate} onChange={e => setSendScheduleDate(e.target.value)}
                          className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors" />
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-xs font-black text-slate-500 block mb-1.5">الوقت</label>
                        <input type="time" value={sendScheduleTime} onChange={e => setSendScheduleTime(e.target.value)}
                          className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors" />
                      </div>
                    </div>
                  )}
                </div>
                <button type="button" onClick={handleSendDirectly} disabled={isSendingNow}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#655ac1] text-white font-black shadow-md shadow-[#655ac1]/20 hover:bg-[#5046a0] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSendingNow ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {isSendingNow ? 'جارٍ الإرسال...' : `إرسال عبر ${sendChannelLabel}`}
                </button>
              </div>
            </div>
          </div>

          {sendResults.length > 0 && (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 size={20} className="text-emerald-500" />
                <h4 className="font-black text-slate-800">نتائج الإرسال</h4>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                  <p className="text-2xl font-black text-emerald-800">{sendResults.filter(r => r.status === 'sent').length}</p>
                  <p className="text-xs text-emerald-600 mt-1">تم الإرسال</p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-center">
                  <p className="text-2xl font-black text-rose-800">{sendResults.filter(r => r.status === 'failed').length}</p>
                  <p className="text-xs text-rose-600 mt-1">فشل</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <p className="text-2xl font-black text-slate-800">{sendResults.length}</p>
                  <p className="text-xs text-slate-500 mt-1">الإجمالي</p>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 rounded-xl border border-[#e5e1fe] bg-[#f8f7ff] px-3 py-2">
                لإدارة التوقيعات الإلكترونية وإعادة الإرسال استخدم نافذة الإرسال الكاملة.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrintSendTab;
