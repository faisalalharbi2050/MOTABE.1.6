import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLayoutEffect } from 'react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import arabic from 'react-date-object/calendars/arabic';
import arabic_ar from 'react-date-object/locales/arabic_ar';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_ar from 'react-date-object/locales/gregorian_ar';
import {
  Printer, Send, Loader2,
  Archive, ClipboardList, ClipboardCheck, CalendarDays, CalendarClock, SlidersHorizontal,
  MessageSquare, AlertCircle, CheckCircle2,
  ChevronDown, Check, Search, Eye, Users, ArrowRight, RefreshCw, X, Copy, Wallet,
} from 'lucide-react';
import { SchoolInfo, SupervisionScheduleData, Teacher, Admin } from '../../../types';
import {
  getSupervisionPrintData, DAYS, DAY_NAMES, getTimingConfig,
  getSupervisionTableConfig, MAIN_SUPERVISION_TABLE_ID,
} from '../../../utils/supervisionUtils';
import { calculateSmsSegments } from '../../../utils/smsUtils';
import { getMessageTemplate, fillMessageTemplate, shortenRecipientName, stripUnfilledTokens } from '../../../utils/messageCatalog';
import { useMessageArchive } from '../../messaging/MessageArchiveContext';
import RecipientsPreviewModal from '../../messaging/RecipientsPreviewModal';
import MessagePreviewInline from '../../messaging/MessagePreviewInline';

interface Props {
  supervisionData: SupervisionScheduleData;
  setSupervisionData?: React.Dispatch<React.SetStateAction<SupervisionScheduleData>>;
  storageKey?: string;
  schoolInfo: SchoolInfo;
  teachers: Teacher[];
  admins: Admin[];
  onOpenLegacyPrint: () => void;
  onOpenLegacySend: () => void;
  onOpenMessagesArchive?: () => void;
  showToast?: (msg: string, type: 'success' | 'warning' | 'error') => void;
  mode?: 'print' | 'send';
}

type TaskMode = 'print' | 'send';
type PaperSize = 'A4' | 'A3';
type PrintColorMode = 'color' | 'bw';
type PrintSignatureMode = 'with' | 'without';
type SendMode = 'electronic' | 'text' | 'reminder';
type SendAudience = 'supervisors' | 'followups' | 'all';
type SendChannel = 'whatsapp' | 'sms';
type SigFilter = 'all' | 'signed' | 'pending';
type ReceiptSnapshotRow = {
  key: string;
  staffId: string;
  staffName: string;
  staffType: 'teacher' | 'admin';
  role: 'supervisor' | 'followup';
  day: string;
  days: string[];
  contextTypeId?: string;
  typeName: string;
  status: 'signed' | 'pending';
  sentAt?: string;
  signedAt?: string;
  signatureData?: string;
  signatureToken?: string;
};
type ReceiptBatch = {
  id: string;
  sentAt: string;
  receiptKeys: string[];
  rows?: ReceiptSnapshotRow[];
};
const RECIPIENT_NAME_TOKEN = '{اسم_المستلم}';

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
  const onCloseRef = useRef(onClose);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
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
      if (!inButton && !inPanel) onCloseRef.current();
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

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
        <span className="truncate text-[13px] leading-tight">{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && position && createPortal(
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
                  value === option.value ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                }`}>
                  <Check size={12} strokeWidth={3.5} />
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
  compact?: boolean;
  minWidthClass?: string;
  hideSelectAll?: boolean;
}> = ({ label, buttonLabel, options, selectedValues, onToggle, onClear, onSelectAll, selectedSummary, searchable = false, compact = false, minWidthClass = 'min-w-[260px]', hideSelectAll = false }) => {
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
        <span className="truncate text-[12px] leading-tight">{selectedSummary || buttonLabel}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && position && createPortal(
        <div ref={panelRef} className="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[130] animate-in slide-in-from-top-2"
          style={{ top: position.top, left: position.left, width: position.width }}>
          {searchable && (
            <div className="relative mb-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="ابحث..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#655ac1]/20 font-medium" />
            </div>
          )}
          {!hideSelectAll && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={selectedValues.length === options.length && options.length > 0 ? onClear : onSelectAll}
                disabled={options.length === 0}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  options.length === 0
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white'
                }`}
              >
                {selectedValues.length === options.length && options.length > 0 ? 'إلغاء الكل' : 'اختيار الكل'}
              </button>
            </div>
          )}
          <div className={`${compact ? 'max-h-52' : 'max-h-60'} overflow-y-auto custom-scrollbar space-y-1 pr-1`}>
            {filteredOptions.map(option => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button key={option.value} type="button" onClick={() => onToggle(option.value)}
                  className={`w-full text-right px-3 ${compact ? 'py-2 text-xs' : 'py-2.5 text-sm'} font-bold rounded-xl transition-all flex items-center justify-between ${
                    isSelected ? 'bg-white text-[#655ac1]'
                      : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                  }`}>
                  <span className="flex items-center gap-2">
                    {option.icon ? <option.icon size={15} className="text-[#655ac1]" /> : null}
                    {option.label}
                  </span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                    isSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                  }`}>
                    <Check size={12} strokeWidth={3.5} />
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
  supervisionData, setSupervisionData, storageKey, schoolInfo, teachers, admins,
  onOpenLegacyPrint, onOpenLegacySend, onOpenMessagesArchive, showToast,
  mode = 'print',
}) => {
  const { scheduleMessage } = useMessageArchive();
  const openReminderFromDashboard = (() => {
    try { return sessionStorage.getItem('motabe:supervision_v2:open_send_reminder') === '1'; } catch { return false; }
  })();
  const taskMode: TaskMode = mode === 'send' || openReminderFromDashboard ? 'send' : 'print';

  // Print state
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [printColorMode, setPrintColorMode] = useState<PrintColorMode>('color');
  const [printSignatureMode, setPrintSignatureMode] = useState<PrintSignatureMode>('without');
  const [showNotesField, setShowNotesField] = useState(false);
  const [footerText, setFooterText] = useState(supervisionData.footerText || '');
  // اختيار الجداول المراد طباعتها (null = الكل) وطريقة التوزيع على الصفحات
  const [printTableIds, setPrintTableIds] = useState<string[] | null>(null);
  const [printLayout, setPrintLayout] = useState<'merged' | 'separate'>('merged');

  // قائمة جداول الإشراف القابلة للطباعة (الرئيسي + المنفصلة) لعرضها في خيارات الطباعة
  const availablePrintTables = useMemo(() => {
    const types = (supervisionData.supervisionTypes || [])
      .filter(t => t.isEnabled)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const list: { id: string; name: string }[] = [];
    if (types.some(t => t.displayMode === 'inline')) {
      list.push({ id: MAIN_SUPERVISION_TABLE_ID, name: 'الجدول الرئيسي' });
    }
    const seen = new Set<string>();
    types.filter(t => t.displayMode === 'separate').forEach(t => {
      const id = t.tableGroup || `solo-${t.id}`;
      if (seen.has(id)) return;
      seen.add(id);
      const isAutoId = id.startsWith('solo-') || /^table-\d+$/.test(id);
      const groupTypes = types.filter(x => x.displayMode === 'separate' && (x.tableGroup || `solo-${x.id}`) === id);
      list.push({ id, name: isAutoId ? groupTypes.map(x => x.name).join('، ') : id });
    });
    return list;
  }, [supervisionData.supervisionTypes]);

  const selectedPrintTableIds = printTableIds ?? availablePrintTables.map(t => t.id);
  const togglePrintTable = (id: string) => {
    const current = printTableIds ?? availablePrintTables.map(t => t.id);
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    setPrintTableIds(next);
  };

  // Send state
  const [sendMode, setSendMode] = useState<SendMode>(openReminderFromDashboard ? 'reminder' : 'electronic');

  useEffect(() => {
    if (openReminderFromDashboard) {
      try { sessionStorage.removeItem('motabe:supervision_v2:open_send_reminder'); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selectedSupervisionTypeId, setSelectedSupervisionTypeId] = useState('all');
  const [sendAudience, setSendAudience] = useState<SendAudience>('supervisors');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedStaffKeys, setSelectedStaffKeys] = useState<string[]>([]);
  const [sendChannel, setSendChannel] = useState<SendChannel>('whatsapp');
  const [fallbackToSms, setFallbackToSms] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [isSendScheduled, setIsSendScheduled] = useState(false);
  const [sendScheduleDate, setSendScheduleDate] = useState('');
  const [sendScheduleTime, setSendScheduleTime] = useState('08:00');
  const scheduleCalendarType = ((schoolInfo.calendarType || 'hijri') as 'hijri' | 'gregorian');
  const [isSendingNow, setIsSendingNow] = useState(false);
  const smsStats = useMemo(() => calculateSmsSegments(messageText), [messageText]);
  const [sendResults, setSendResults] = useState<{ name: string; status: 'sent' | 'failed'; reason?: string }[]>([]);
  const [showSendResultsModal, setShowSendResultsModal] = useState(false);
  const [previewRow, setPreviewRow] = useState<SendRow | null>(null);
  const [previewReceiptRow, setPreviewReceiptRow] = useState<ReceiptRow | null>(null);
  const [recipientsPreviewOpen, setRecipientsPreviewOpen] = useState(false);

  // Receipt log state
  const [sigReceiptOpen, setSigReceiptOpen] = useState(false);
  const [sigFilter, setSigFilter] = useState<SigFilter>('all');
  const [sigSearch, setSigSearch] = useState('');
  const receiptBatchesStorageKey = `${storageKey || 'supervision_data_v1'}:receipt-batches`;
  const [receiptBatches, setReceiptBatches] = useState<ReceiptBatch[]>(() => {
    try {
      const stored = localStorage.getItem(`${storageKey || 'supervision_data_v1'}:receipt-batches`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [selectedReceiptBatchId, setSelectedReceiptBatchId] = useState('');

  useEffect(() => {
    try { localStorage.setItem(receiptBatchesStorageKey, JSON.stringify(receiptBatches)); } catch {}
  }, [receiptBatches, receiptBatchesStorageKey]);

  const printData = useMemo(
    () => getSupervisionPrintData(supervisionData, schoolInfo),
    [supervisionData, schoolInfo]
  );
  const hasData = printData.days.some(d => d.supervisors.length > 0);

  const activeDays = useMemo(() => getTimingConfig(schoolInfo).activeDays || DAYS.slice(), [schoolInfo]);
  const hasFollowUpSupervisorColumn = supervisionData.settings.enableFollowUpSupervisor !== false;

  const dayOptions: DropdownOption[] = useMemo(
    () => activeDays.map(d => ({ value: d, label: DAY_NAMES[d] || d })),
    [activeDays]
  );

  const scheduledTypeIds = useMemo(() => {
    const ids = new Set<string>();
    supervisionData.dayAssignments.forEach(da =>
      da.staffAssignments.forEach(sa => {
        if (sa.contextTypeId) ids.add(sa.contextTypeId);
      })
    );
    return ids;
  }, [supervisionData.dayAssignments]);

  const supervisionTypeOptions: DropdownOption[] = useMemo(
    () => {
      const scheduledTypes = (supervisionData.supervisionTypes || [])
        .filter(type => type.isEnabled && scheduledTypeIds.has(type.id))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(type => ({ value: type.id, label: type.name }));
      return scheduledTypes.length > 0
        ? [{ value: 'all', label: 'الكل' }, ...scheduledTypes]
        : [{ value: 'all', label: 'لا يوجد نوع إشراف بجدول منشأ', disabled: true }];
    },
    [supervisionData.supervisionTypes, scheduledTypeIds]
  );

  useEffect(() => {
    if (supervisionTypeOptions.length <= 1) {
      setSelectedSupervisionTypeId('all');
      return;
    }
    if (!selectedSupervisionTypeId || !supervisionTypeOptions.some(option => option.value === selectedSupervisionTypeId)) {
      setSelectedSupervisionTypeId('all');
    }
  }, [supervisionTypeOptions, selectedSupervisionTypeId]);

  type SendRow = {
    key: string;
    staffId: string;
    staffName: string;
    staffType: 'teacher' | 'admin';
    role: 'supervisor' | 'followup';
    day: string;
    days: string[];
    contextTypeId?: string;
    typeName: string;
    locationNames: string[];
    phone?: string;
    signatureToken?: string;
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
        const typeName = supervisionData.supervisionTypes.find(type => type.id === sa.contextTypeId)?.name || 'الإشراف اليومي';
        const locationNames = sa.locationIds
          .map(lid => supervisionData.locations.find(l => l.id === lid)?.name || '')
          .filter(Boolean);
        rows.push({
          key: `sup-${da.day}-${sa.contextTypeId}-${sa.staffId}`,
          staffId: sa.staffId,
          staffName: sa.staffName,
          staffType: sa.staffType as 'teacher' | 'admin',
          role: 'supervisor',
          day: da.day,
          contextTypeId: sa.contextTypeId,
          typeName,
          locationNames,
          phone: (staff as any)?.phone || (staff as any)?.phoneNumber,
          signatureToken: sa.signatureToken,
        });
      });
      if (hasFollowUpSupervisorColumn && da.followUpSupervisorId && da.followUpSupervisorName) {
        const dayTypeIds = Array.from(new Set(da.staffAssignments.map(sa => sa.contextTypeId).filter(Boolean)));
        const asTeacher = teachers.find(t => t.id === da.followUpSupervisorId);
        const asAdmin = !asTeacher ? admins.find(a => a.id === da.followUpSupervisorId) : null;
        const staffType: 'teacher' | 'admin' = asTeacher ? 'teacher' : 'admin';
        const staff = asTeacher || asAdmin;
        dayTypeIds.forEach(typeId => rows.push({
          key: `fu-${da.day}-${typeId}-${da.followUpSupervisorId}`,
          staffId: da.followUpSupervisorId,
          staffName: da.followUpSupervisorName,
          staffType,
          role: 'followup',
          day: da.day,
          contextTypeId: typeId,
          typeName: supervisionData.supervisionTypes.find(type => type.id === typeId)?.name || 'الإشراف اليومي',
          locationNames: [],
          phone: (staff as any)?.phone || (staff as any)?.phoneNumber,
          signatureToken: da.followUpSignatureToken,
        }));
      }
    });
    const typeOrder = new Map((supervisionData.supervisionTypes || []).map((type, index) => [type.id, type.sortOrder ?? index]));
    const dayOrder = new Map(activeDays.map((day, index) => [day, index]));
    return rows.sort((a, b) =>
      (typeOrder.get(a.contextTypeId || '') ?? 999) - (typeOrder.get(b.contextTypeId || '') ?? 999) ||
      (dayOrder.get(a.day) ?? 999) - (dayOrder.get(b.day) ?? 999) ||
      a.staffName.localeCompare(b.staffName, 'ar')
    );
  }, [supervisionData, teachers, admins, activeDays, hasFollowUpSupervisorColumn]);

  useEffect(() => {
    if (!hasFollowUpSupervisorColumn && sendAudience !== 'supervisors') {
      setSendAudience('supervisors');
    }
  }, [hasFollowUpSupervisorColumn, sendAudience]);

  const sendAudienceOptions: DropdownOption[] = hasFollowUpSupervisorColumn
    ? [
        { value: 'supervisors', label: 'المشرف' },
        { value: 'followups', label: 'المشرف المتابع' },
        { value: 'all', label: 'الكل (مشرف ومشرف متابع)' },
      ]
    : [{ value: 'supervisors', label: 'المشرف' }];

  const filteredSendRows = useMemo(() => {
    return sendRows.filter(r => {
      if (selectedDays.length > 0 && !selectedDays.includes(r.day)) return false;
      if (selectedSupervisionTypeId !== 'all' && r.contextTypeId !== selectedSupervisionTypeId) return false;
      if (sendAudience === 'supervisors' && r.role !== 'supervisor') return false;
      if (sendAudience === 'followups' && r.role !== 'followup') return false;
      return true;
    });
  }, [sendRows, selectedDays, selectedSupervisionTypeId, sendAudience]);

  const staffOptions: DropdownOption[] = useMemo(() => {
    if (selectedSupervisionTypeId !== 'all') {
      return filteredSendRows.map(r => ({
        value: r.key,
        label: `${r.typeName} - ${r.staffName} - ${DAY_NAMES[r.day] || r.day}${r.role === 'followup' ? ' (مشرف متابع)' : ''}`,
      }));
    }
    const recipients = new Map<string, DropdownOption>();
    filteredSendRows.forEach(row => {
      const recipientKey = `${row.staffType}-${row.staffId}`;
      if (!recipients.has(recipientKey)) {
        recipients.set(recipientKey, {
          value: row.key,
          label: row.staffName,
        });
      }
    });
    return Array.from(recipients.values());
  }, [filteredSendRows, selectedSupervisionTypeId]);

  useEffect(() => {
    const validKeys = new Set(staffOptions.map(option => option.value));
    setSelectedStaffKeys(curr => curr.filter(k => validKeys.has(k)));
  }, [staffOptions]);

  const selectedRows = useMemo(() => {
    const directlySelected = filteredSendRows.filter(row => selectedStaffKeys.includes(row.key));
    if (selectedSupervisionTypeId !== 'all') return directlySelected;
    const selectedRecipients = new Set(directlySelected.map(row => `${row.staffType}-${row.staffId}`));
    return filteredSendRows.filter(row => selectedRecipients.has(`${row.staffType}-${row.staffId}`));
  }, [filteredSendRows, selectedStaffKeys, selectedSupervisionTypeId]);

  type SendRecipient = {
    key: string;
    staffId: string;
    staffName: string;
    staffType: 'teacher' | 'admin';
    phone?: string;
    tasks: SendRow[];
  };

  const selectedRecipients: SendRecipient[] = useMemo(() => {
    const recipients = new Map<string, SendRecipient>();
    selectedRows.forEach(row => {
      const key = `${row.staffType}-${row.staffId}`;
      const existing = recipients.get(key);
      if (existing) {
        existing.tasks.push(row);
      } else {
        recipients.set(key, {
          key,
          staffId: row.staffId,
          staffName: row.staffName,
          staffType: row.staffType,
          phone: row.phone,
          tasks: [row],
        });
      }
    });
    return Array.from(recipients.values());
  }, [selectedRows]);

  useEffect(() => {
    if (selectedRows.length === 0) { setMessageText(''); return; }
    setMessageText(buildDetailedMessage(selectedRows[0], RECIPIENT_NAME_TOKEN));
  }, [sendMode, selectedRows]);

  useEffect(() => {
    if (!previewRow) return;
    if (!selectedRows.some(row => row.key === previewRow.key)) setPreviewRow(null);
  }, [previewRow, selectedRows]);

  // ─── Receipt log rows ──────────────────────────────────────────────────
  type ReceiptRow = ReceiptSnapshotRow;

  const getReceiptKey = (row: Pick<ReceiptRow, 'role' | 'staffType' | 'staffId'>) =>
    `${row.role === 'supervisor' ? 'sup' : 'fu'}-${row.staffType}-${row.staffId}`;

  const getStaffRoleLabel = (row: Pick<ReceiptRow, 'staffType' | 'staffId'>) => {
    if (row.staffType === 'teacher') return 'معلم';
    return admins.find(admin => admin.id === row.staffId)?.role || 'إداري';
  };

  const receiptRows: ReceiptRow[] = useMemo(() => {
    const rows = new Map<string, ReceiptRow>();
    const getTypeName = (typeId?: string) =>
      supervisionData.supervisionTypes.find(type => type.id === typeId)?.name || 'الإشراف اليومي';
    const mergeDate = (current: string | undefined, next: string | undefined, mode: 'earliest' | 'latest') => {
      if (!next) return current;
      if (!current) return next;
      const currentTime = new Date(current).getTime();
      const nextTime = new Date(next).getTime();
      if (isNaN(currentTime)) return next;
      if (isNaN(nextTime)) return current;
      return mode === 'earliest'
        ? (nextTime < currentTime ? next : current)
        : (nextTime > currentTime ? next : current);
    };
    const mergeReceiptRow = (row: ReceiptRow) => {
      const existing = rows.get(row.key);
      if (!existing) {
        rows.set(row.key, row);
        return;
      }
      const typeNames = Array.from(new Set([...existing.typeName.split('، '), ...row.typeName.split('، ')].filter(Boolean)));
      rows.set(row.key, {
        ...existing,
        days: Array.from(new Set([...existing.days, ...row.days])),
        day: existing.day || row.day,
        typeName: typeNames.join('، '),
        status: existing.status === 'signed' || row.status === 'signed' ? 'signed' : 'pending',
        sentAt: mergeDate(existing.sentAt, row.sentAt, 'earliest'),
        signedAt: mergeDate(existing.signedAt, row.signedAt, 'latest'),
        signatureData: existing.signatureData || row.signatureData,
        signatureToken: existing.signatureToken || row.signatureToken,
      });
    };

    supervisionData.dayAssignments.forEach(da => {
      da.staffAssignments.forEach(sa => {
        mergeReceiptRow({
          key: `sup-${sa.staffType}-${sa.staffId}`,
          staffId: sa.staffId,
          staffName: sa.staffName,
          staffType: sa.staffType as 'teacher' | 'admin',
          role: 'supervisor',
          day: da.day,
          days: [da.day],
          contextTypeId: sa.contextTypeId,
          typeName: getTypeName(sa.contextTypeId),
          status: sa.signatureStatus === 'signed' ? 'signed' : 'pending',
          sentAt: sa.signatureSentAt,
          signedAt: sa.signatureSignedAt,
          signatureData: sa.signatureData,
          signatureToken: sa.signatureToken,
        });
      });
      if (da.followUpSupervisorId && da.followUpSupervisorName) {
        const asTeacher = teachers.find(t => t.id === da.followUpSupervisorId);
        const dayTypeIds = Array.from(new Set(da.staffAssignments.map(sa => sa.contextTypeId).filter(Boolean)));
        const typeName = dayTypeIds
          .map(typeId => getTypeName(typeId))
          .join('، ') || 'الإشراف اليومي';
        mergeReceiptRow({
          key: `fu-${asTeacher ? 'teacher' : 'admin'}-${da.followUpSupervisorId}`,
          staffId: da.followUpSupervisorId,
          staffName: da.followUpSupervisorName || '—',
          staffType: asTeacher ? 'teacher' : 'admin',
          role: 'followup',
          day: da.day,
          days: [da.day],
          typeName,
          status: da.followUpSignatureStatus === 'signed' ? 'signed' : 'pending',
          sentAt: da.followUpSignatureSentAt,
          signedAt: da.followUpSignatureSignedAt,
          signatureData: da.followUpSignatureData,
          signatureToken: da.followUpSignatureToken,
        });
      }
    });
    return Array.from(rows.values()).filter(row => !!row.sentAt).sort((a, b) =>
      a.staffName.localeCompare(b.staffName, 'ar') ||
      (a.role === 'supervisor' ? 0 : 1) - (b.role === 'supervisor' ? 0 : 1)
    );
  }, [supervisionData, teachers]);

  const filteredReceipts = useMemo(() => {
    const selectedBatch = receiptBatches.find(batch => batch.id === selectedReceiptBatchId);
    const rows = selectedBatch?.rows || receiptRows;
    return rows
      .filter(r =>
        (!selectedBatch || selectedBatch.receiptKeys.includes(getReceiptKey(r))) &&
        (sigFilter === 'all' || r.status === sigFilter) &&
        (sigSearch.trim() === '' || r.staffName.includes(sigSearch.trim()))
      )
      .map(row => selectedBatch ? { ...row, sentAt: selectedBatch.sentAt } : row);
  }, [receiptRows, receiptBatches, selectedReceiptBatchId, sigFilter, sigSearch]);

  const displayReceiptBatches = useMemo(() => {
    if (receiptBatches.length > 0) return receiptBatches;
    const sentRows = receiptRows.filter(row => row.sentAt);
    if (sentRows.length === 0) return [];
    return [{
      id: 'legacy',
      sentAt: sentRows.map(row => row.sentAt!).sort()[0],
      receiptKeys: sentRows.map(getReceiptKey),
    }];
  }, [receiptBatches, receiptRows]);

  useEffect(() => {
    if (displayReceiptBatches.length === 0) {
      setSelectedReceiptBatchId('');
      return;
    }
    if (!displayReceiptBatches.some(batch => batch.id === selectedReceiptBatchId)) {
      setSelectedReceiptBatchId(displayReceiptBatches[0].id);
    }
  }, [displayReceiptBatches, selectedReceiptBatchId]);

  const selectedBatchRows = useMemo(() => {
    const selectedBatch = displayReceiptBatches.find(batch => batch.id === selectedReceiptBatchId);
    if (!selectedBatch) return [];
    if (selectedBatch.rows) return selectedBatch.rows;
    return receiptRows.filter(row => selectedBatch.receiptKeys.includes(getReceiptKey(row)));
  }, [displayReceiptBatches, selectedReceiptBatchId, receiptRows]);

  const selectedBatchSignedCount = selectedBatchRows.filter(row => row.status === 'signed').length;
  const selectedBatchPendingCount = selectedBatchRows.filter(row => row.status === 'pending').length;
  const formatBatchSentLabel = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const calendarType = (schoolInfo.calendarType || 'hijri');
    const locale = calendarType === 'hijri' ? 'ar-SA-u-ca-islamic-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn';
    const parts = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(d);
    const pick = (type: string) => parts.find(p => p.type === type)?.value || '';
    const datePart = `${pick('day')} / ${pick('month')} / ${pick('year')}`;
    const timePart = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: true }).format(d);
    const era = calendarType === 'hijri' ? 'هـ' : 'م';
    return `${datePart}${era} - ${timePart}`;
  };
  const receiptBatchOptions: DropdownOption[] = displayReceiptBatches.map((batch, index) => ({
    value: batch.id,
    label: `جدول الإشراف المرسل ${displayReceiptBatches.length - index} · أُرسل ${formatBatchSentLabel(batch.sentAt)}`,
  }));

  // ─── Helpers ───────────────────────────────────────────────────────────
  const actionButtonClass = (active: boolean) =>
    `inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-black border transition-all ${
      active
        ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-md shadow-[#655ac1]/20'
        : 'bg-white text-slate-700 border-slate-200 hover:border-[#cfc8ff] hover:text-[#655ac1] hover:bg-slate-50'
    }`;

  const sendChannelLabel = sendChannel === 'whatsapp' ? 'الواتساب' : 'الرسائل النصية';

  const currentSemesterName = useMemo(() => {
    const current = schoolInfo.semesters?.find(sem => sem.id === schoolInfo.currentSemesterId || sem.isCurrent);
    return current?.name || printData.semester || '';
  }, [schoolInfo.semesters, schoolInfo.currentSemesterId, printData.semester]);

  const formatHijriDate = (date?: string) => {
    const base = date ? new Date(`${date}T12:00:00`) : new Date();
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(base);
  };

  function formatHijriDateTime(date?: string) {
    if (!date) return '—';
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return '—';
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }

  const refreshSupervisionDataFromStorage = () => {
    setSigSearch('');
    setSigFilter('all');
    if (!setSupervisionData) return;
    try {
      const key = storageKey || 'supervision_data_v1';
      const raw = localStorage.getItem(key);
      const storedBatches = localStorage.getItem(receiptBatchesStorageKey);
      if (raw) {
        setSupervisionData(JSON.parse(raw));
      }
      if (storedBatches) setReceiptBatches(JSON.parse(storedBatches));
      showToast?.('تم تحديث سجل الاستلام', 'success');
    } catch {
      showToast?.('تعذر تحديث سجل الاستلام', 'error');
    }
  };

  const formatPickerDate = (date: any) => {
    if (!date) return '';
    if (date instanceof DateObject) {
      const jsDate = date.toDate();
      if (isNaN(jsDate.getTime())) return '';
      return `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, '0')}-${String(jsDate.getDate()).padStart(2, '0')}`;
    }
    return date.toString();
  };

  const getValidPickerDate = (date?: string) => {
    if (!date) return undefined;
    const parsed = new Date(`${date}T00:00:00`);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const selectedDaysSummary = selectedDays.length === 0
    ? undefined
    : selectedDays.map(day => DAY_NAMES[day] || day).join('، ');

  const notificationTypeLabel = sendMode === 'electronic'
    ? 'تكليف بالإشراف مع توقيع إلكتروني'
    : sendMode === 'text'
      ? 'تكليف نصي بالإشراف'
      : 'تذكير يومي بالإشراف';

  const buildToken = (row: SendRow) =>
    row.signatureToken || `supv-${row.role}-${row.day}-${row.contextTypeId || 'all'}-${row.staffId}`;

  const buildSignatureLink = (row: SendRow) =>
    `${window.location.origin}${window.location.pathname}?supervisionSign=${encodeURIComponent(buildToken(row))}`;

  const getRowScheduleRows = (row: SendRow) =>
    sendRows
      .filter(item => item.staffId === row.staffId && item.staffType === row.staffType && item.role === row.role)
      .map(item => ({ day: item.day, typeName: item.typeName, locationNames: item.locationNames }));

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast?.('تم نسخ الرابط', 'success');
    } catch {
      showToast?.('تعذر نسخ الرابط', 'error');
    }
  };

  const buildDetailedMessage = (row: SendRow, recipientName = row.staffName): string => {
    const assignmentDayName = DAY_NAMES[row.day] || row.day;
    const assignmentHijri = formatHijriDate(supervisionData.effectiveDate);
    const todayDayName = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][new Date().getDay()];
    const todayHijri = formatHijriDate();
    const schoolName = schoolInfo.schoolName || 'اسم المدرسة';
    // الاسم في نص الرسالة يُختصر (أول+أخير) لتقليل التكلفة؛ يبقى كاملاً في الجداول والأرشيف
    const shortName = shortenRecipientName(recipientName);
    const link = buildSignatureLink(row);
    const reminderTemplate = supervisionData.settings.reminderMessageTemplate?.trim();
    const fillReminderTemplate = (template: string) => template
      .replace(/\(\s*(?:اسم المستلم|اسم المعلم|يظهر هنا اسم المعلم)\s*\)/g, shortName)
      .replace(/\(\s*(?:اليوم|يظهر هنا اليوم)\s*\)/g, todayDayName)
      .replace(/\(\s*(?:اسم المدرسة|يظهر اسم المدرسة)\s*\)/g, schoolName)
      .replace(/\(\s*(?:التاريخ بالهجري|يظهر التاريخ بالهجري)\s*\)/g, todayHijri)
      .replace(/\(\s*(?:الفصل الدراسي|يظهر الفصل الدراسي)\s*\)/g, currentSemesterName);

    const catalogValues = {
      'اسم_المستلم': shortName,
      'اسم_المدرسة': schoolName,
      'يوم_التكليف': assignmentDayName,
      'تاريخ_التكليف': assignmentHijri,
      'اليوم': todayDayName,
      'التاريخ': todayHijri,
      'الفصل_الدراسي': currentSemesterName,
      'رابط_التوقيع': link,
    };
    if (sendMode === 'electronic') {
      return fillMessageTemplate(getMessageTemplate('supervision/electronic'), catalogValues);
    }
    if (sendMode === 'text') {
      return fillMessageTemplate(getMessageTemplate('supervision/text'), catalogValues);
    }
    // قالب التذكير القديم في إعدادات الإشراف يبقى مقدَّماً للتوافق مع من خصّصه هناك
    if (reminderTemplate) {
      return fillReminderTemplate(reminderTemplate);
    }
    return fillMessageTemplate(getMessageTemplate('supervision/reminder'), catalogValues);
  };

  const buildRecipientTaskSummary = (recipient: SendRecipient) =>
    recipient.tasks.map(task => {
      const roleLabel = task.role === 'followup' ? 'مشرف متابع' : 'مشرف';
      const locations = task.locationNames.length > 0 ? ` - المواقع: ${task.locationNames.join('، ')}` : '';
      return `- ${DAY_NAMES[task.day] || task.day}: ${task.typeName} (${roleLabel})${locations}`;
    }).join('\n');

  const buildRecipientMessage = (recipient: SendRecipient) => {
    const firstTask = recipient.tasks[0];
    const taskSummary = buildRecipientTaskSummary(recipient);
    const shortName = shortenRecipientName(recipient.staffName);
    const customBase = selectedSupervisionTypeId !== 'all' && messageText.trim()
      ? messageText.replace(/\{اسم_المستلم\}/g, shortName)
      : '';
    // مقدمة المهام المجمّعة ثابتة عمداً — ليست قالباً قابلاً للتخصيص في السجل المركزي
    const heading = customBase || `المكرم/ ${shortName}\nنشعركم بمهام الإشراف اليومي المسندة لكم، شاكرين تعاونكم.`;
    const links = sendMode === 'electronic'
      ? Array.from(new Map(recipient.tasks.map(task => [buildSignatureLink(task), task])).entries())
          .map(([link, task]) => `${DAY_NAMES[task.day] || task.day} - ${task.typeName}:\n${link}`)
          .join('\n')
      : '';
    if (sendMode === 'reminder' && selectedSupervisionTypeId !== 'all') {
      return stripUnfilledTokens(buildDetailedMessage(firstTask, recipient.staffName));
    }
    // شبكة أمان: تُزال أي رموز {…} لم تُعبَّأ حتى لا تخرج رسالة بأقواس مكسورة
    return stripUnfilledTokens(`${heading}\n\nالمهام المسندة:\n${taskSummary}${links ? `\n\nروابط التكليف والتوقيع:\n${links}` : ''}`);
  };

  const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // ─── Direct print without modal ─────────────────────────────────────────
  const handleDirectPrint = (options?: { signed?: boolean }) => {
    if (!hasData) { showToast?.('لا يوجد جدول إشراف للطباعة', 'warning'); return; }

    const printWindow = window.open('', '_blank');
    if (!printWindow) { showToast?.('تعذّر فتح نافذة الطباعة', 'error'); return; }

    const isBW = printColorMode === 'bw';
    const headerColor = isBW ? '#1e293b' : '#1e293b';
    const accentColor = isBW ? '#1e293b' : '#655ac1';
    const stripeBg = isBW ? '#ffffff' : '#f8fafc';
    const dayBg = isBW ? '#ffffff' : '#f1f5f9';

    const printSignedVersion = options?.signed === true;
    const includeSignature = printSignatureMode === 'with' || printSignedVersion;
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
    const renderStaffCell = (day: string, typeId: string, showLocations: boolean) => {
      const rows = getStaffForType(day, typeId);
      if (rows.length === 0) return '<span class="empty-state">فارغ للتعبئة اليدوية</span>';
      return rows.map(row => {
        const locations = formatLocations(row.locationIds);
        return `<div class="staff-line">
          <div class="staff-name">${escapeHtml(row.staffName)}</div>
          ${showLocations ? `<div class="staff-locations">${escapeHtml(locations || 'بدون موقع محدد')}</div>` : ''}
        </div>`;
      }).join('');
    };
    const renderSignatureImage = (signatureData?: string) =>
      signatureData
        ? `<img class="signature-img" src="${signatureData}" alt="توقيع" />`
        : '<div class="signature-line"></div>';
    const renderSignatureCell = (day: string, typeId: string) => {
      const rows = getStaffForType(day, typeId);
      if (rows.length === 0) return '<span class="empty-state">—</span>';
      return rows.map(row => printSignedVersion ? renderSignatureImage(row.signatureData) : '<div class="signature-line"></div>').join('');
    };
    const renderTable = (
      types: typeof activeTypes,
      tableId: string,
      options: { name: string; showTitle: boolean; pageBreak: boolean }
    ) => {
      if (types.length === 0) return '';
      const tableCfg = getSupervisionTableConfig(supervisionData, tableId);
      const tableFollowUp = tableCfg.showFollowUp;
      const tableLocations = tableCfg.showLocations;
      const typeColWidth = includeSignature
        ? (tableFollowUp ? 56 : 66) / types.length
        : (tableFollowUp ? 78 : 88) / types.length;
      const signatureColWidth = includeSignature ? 22 / types.length : 0;
      return `
        <section class="schedule-section"${options.pageBreak ? ' style="page-break-after: always;"' : ''}>
          ${options.showTitle ? `<h2 class="section-title">${escapeHtml(options.name)}</h2>` : ''}
          <table>
            <thead>
              <tr>
                <th style="width: 12%;">اليوم</th>
                ${types.map(type => `
                  <th style="width: ${typeColWidth}%;">${escapeHtml(type.name)}</th>
                  ${includeSignature ? `<th style="width: ${signatureColWidth}%;">التوقيع</th>` : ''}
                `).join('')}
                ${tableFollowUp ? '<th style="width: 10%;">المشرف المتابع</th>' : ''}
                ${tableFollowUp && includeSignature ? '<th style="width: 10%;">التوقيع</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${activeDays.map(day => {
                const dayAssignment = getDayAssignment(day);
                return `<tr>
                  <td class="day-header">${escapeHtml(DAY_NAMES[day] || day)}</td>
                  ${types.map(type => `
                    <td>${renderStaffCell(day, type.id, tableLocations)}</td>
                    ${includeSignature ? `<td>${renderSignatureCell(day, type.id)}</td>` : ''}
                  `).join('')}
                  ${tableFollowUp ? `<td class="followup">${escapeHtml(dayAssignment?.followUpSupervisorName || '—')}</td>` : ''}
                  ${tableFollowUp && includeSignature ? `<td class="followup-signature signature-cell">${printSignedVersion ? renderSignatureImage(dayAssignment?.followUpSignatureData) : ''}</td>` : ''}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </section>
      `;
    };

    // ترتيب الجداول: الرئيسي ثم المنفصلة، مع تطبيق اختيار المستخدم وطريقة التوزيع
    const orderedTables: { id: string; name: string; types: typeof activeTypes }[] = [
      ...(inlineTypes.length > 0 ? [{ id: MAIN_SUPERVISION_TABLE_ID, name: 'الجدول الرئيسي', types: inlineTypes }] : []),
      ...separateGroups.map(group => {
        const isAutoId = group.id.startsWith('solo-') || /^table-\d+$/.test(group.id);
        return { id: group.id, name: isAutoId ? group.types.map(t => t.name).join('، ') : group.id, types: group.types };
      }),
    ];
    const tablesToPrint = orderedTables.filter(t => selectedPrintTableIds.includes(t.id));
    const showTitles = tablesToPrint.length > 1;
    const printableTables = tablesToPrint
      .map((t, i) => renderTable(t.types, t.id, {
        name: t.name,
        showTitle: showTitles,
        pageBreak: printLayout === 'separate' && i < tablesToPrint.length - 1,
      }))
      .join('');

    if (tablesToPrint.length === 0) {
      printWindow.close();
      showToast?.('اختر جدولاً واحداً على الأقل للطباعة', 'warning');
      return;
    }

    printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title></title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap');
    @page { size: ${paperSize} landscape; margin: 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Tajawal', 'Arial', sans-serif; padding: 18px; direction: rtl; background: #fff; ${isBW ? 'filter: grayscale(100%);' : ''} }
    .print-container { max-width: 100%; margin: 0 auto; }
    .header-wrapper { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${headerColor}; padding-bottom: 14px; margin-bottom: 10px; }
    .header-right, .header-left { width: 33%; font-weight: bold; font-size: 12px; color: ${headerColor}; line-height: 1.8; }
    .header-right { text-align: right; }
    .header-left { text-align: left; }
    .header-center { width: 33%; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .logo-circle { width: 56px; height: 56px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; }
    .logo-text { font-size: 9px; color: #94a3b8; }
    .main-title { text-align: center; color: ${headerColor}; font-size: 18px; font-weight: 900; margin: 8px 0 14px; }
    .schedule-section { margin-bottom: 18px; }
    .section-title { text-align: right; color: ${accentColor}; font-size: 14px; font-weight: 900; margin: 6px 2px 8px; padding-right: 4px; border-right: 4px solid ${accentColor}; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 16px; font-size: 11px; table-layout: fixed; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    th { background-color: ${isBW ? '#f1f5f9' : '#a59bf0'}; color: ${isBW ? headerColor : '#ffffff'}; border-left: 1px solid rgba(255,255,255,0.45); padding: 9px; font-weight: 900; text-align: center; }
    td { border-left: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px; vertical-align: top; }
    th:last-child, td:last-child { border-left: 0; }
    tbody tr:last-child td { border-bottom: 0; }
    tr:nth-child(even) td { background-color: ${stripeBg}; }
    .day-header { background-color: ${dayBg} !important; font-weight: 900; color: ${accentColor}; text-align: center; vertical-align: middle; }
    .staff-line { padding: 5px 0; border-bottom: 1px solid #e2e8f0; }
    .staff-line:last-child { border-bottom: 0; }
    .staff-name { font-weight: 900; color: ${headerColor}; line-height: 1.5; }
    .staff-locations { margin-top: 2px; color: #64748b; font-size: 10px; line-height: 1.5; }
    .followup { color: ${accentColor}; font-weight: 900; text-align: center; vertical-align: middle; }
    .signature-line { min-height: 38px; border-bottom: 1px dotted #94a3b8; margin: 0 4px 6px; }
    .signature-line:last-child { margin-bottom: 0; }
    .signature-cell { height: 46px; border-bottom: 1px dotted #94a3b8; }
    .signature-img { display: block; max-width: 92px; max-height: 38px; object-fit: contain; margin: 0 auto 6px; }
    .followup-signature { vertical-align: middle; }
    .empty-state { color: #94a3b8; font-style: italic; text-align: center; }
    .footer { margin-top: 18px; text-align: right; font-size: 12px; font-weight: bold; color: #475569; padding: 12px 14px; border: 1px dashed #94a3b8; border-radius: 10px; white-space: pre-wrap; }
    @media print {
      body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      th { background-color: ${isBW ? '#f1f5f9' : '#a59bf0'} !important; color: ${isBW ? headerColor : '#ffffff'} !important; }
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
      </div>
      <div class="header-left">
        <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
        <p>العام الدراسي: ${escapeHtml(schoolInfo.academicYear || '')}</p>
      </div>
    </div>

    <h1 class="main-title">${escapeHtml(printData.title)}</h1>

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

  const openPrintableHtml = (html: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { showToast?.('تعذّر فتح نافذة الطباعة', 'error'); return; }
    printWindow.document.write(html);
    printWindow.document.close();
    showToast?.('تم فتح نافذة الطباعة', 'success');
  };

  const buildAssignmentFormHtml = (rows: ReceiptRow[], autoPrint = true) => `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>نماذج تكليف الإشراف</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Tajawal', Arial, sans-serif; color: #1e293b; background: #fff; }
    .form { min-height: 255mm; padding: 10mm 0; page-break-after: always; display: flex; flex-direction: column; }
    .form:last-child { page-break-after: auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 14px; margin-bottom: 22px; font-weight: 700; font-size: 13px; line-height: 1.8; }
    .logo { width: 64px; height: 64px; object-fit: contain; }
    .title { text-align: center; font-size: 20px; font-weight: 900; color: #111827; margin: 0 0 18px; }
    .date-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
    .date-box { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 12px; padding: 10px 12px; line-height: 1.5; }
    .date-label { color: #64748b; font-size: 12px; font-weight: 900; margin-bottom: 3px; }
    .date-value { color: #1e293b; font-size: 13px; font-weight: 800; }
    .info-card { border: 1px solid #f1f5f9; background: #f8fafc; border-radius: 16px; padding: 16px; margin-bottom: 14px; }
    .info-line { display: flex; gap: 8px; align-items: center; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .info-line:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: 0; }
    .info-label { color: #64748b; font-weight: 800; flex: 0 0 auto; }
    .info-value { color: #1e293b; font-weight: 900; }
    .schedule { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 14px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
    .schedule th, .schedule td { padding: 10px 12px; text-align: right; border-bottom: 1px solid #f1f5f9; }
    .schedule th { color: #655ac1; background: #ffffff; font-weight: 900; }
    .schedule tr:last-child td { border-bottom: 0; }
    .ack { font-size: 14px; font-weight: 900; color: #334155; margin: 0 0 14px; }
    .signature { border: 2px dashed rgba(101,90,193,0.3); background: #f8fafc; border-radius: 16px; height: 128px; padding: 14px; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 12px; font-weight: 900; }
    .signature img { max-width: 260px; max-height: 96px; object-fit: contain; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  ${rows.map(row => `
    <section class="form">
      <div class="header">
        <div>
          <div>المملكة العربية السعودية</div>
          <div>وزارة التعليم</div>
          <div>${escapeHtml(schoolInfo.region || 'إدارة التعليم')}</div>
          <div>مدرسة ${escapeHtml(printData.schoolName || '')}</div>
        </div>
        <div>${schoolInfo.logo ? `<img class="logo" src="${schoolInfo.logo}" />` : ''}</div>
        <div style="text-align:left">
          <div>العام الدراسي: ${escapeHtml(schoolInfo.academicYear || '')}</div>
          <div>الفصل الدراسي: ${escapeHtml(printData.semester || '')}</div>
          <div>التاريخ: ${formatHijriDateTime(row.sentAt)}</div>
        </div>
      </div>
      <h1 class="title">نموذج تكليف بالإشراف اليومي</h1>
      <div class="date-grid">
        <div class="date-box">
          <div class="date-label">تاريخ الإرسال</div>
          <div class="date-value">${formatHijriDateTime(row.sentAt)}</div>
        </div>
        <div class="date-box">
          <div class="date-label">تاريخ التوقيع</div>
          <div class="date-value">${formatHijriDateTime(row.signedAt)}</div>
        </div>
      </div>
      <div class="info-card">
        <div class="info-line"><span class="info-label">الاسم:</span><span class="info-value">${escapeHtml(row.staffName)}</span></div>
        <div class="info-line"><span class="info-label">الصفة:</span><span class="info-value">${escapeHtml(getStaffRoleLabel(row))}</span></div>
        <div class="info-line"><span class="info-label">التوقيع:</span><span class="info-value">${row.status === 'signed' ? 'وقع' : 'لم يوقع'}</span></div>
      </div>
      <table class="schedule">
        <thead><tr><th>اليوم</th><th>نوع الإشراف</th></tr></thead>
        <tbody>
          ${row.days.map(day => `
            <tr>
              <td>${escapeHtml(DAY_NAMES[day] || day)}</td>
              <td>${escapeHtml(row.typeName)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p class="ack">تم العلم والاطلاع على جدول الإشراف المسند والتوقيع بالعلم.</p>
      <div class="signature">
        ${row.signatureData ? `<img src="${row.signatureData}" alt="توقيع" />` : 'التوقيع'}
        </div>
    </section>
  `).join('')}
  ${autoPrint ? '<script>document.fonts.ready.then(() => window.print()); setTimeout(() => window.print(), 1200);</script>' : ''}
</body>
</html>`;

  const handlePrintReceiptReport = () => {
    if (filteredReceipts.length === 0) { showToast?.('لا توجد بيانات للطباعة', 'warning'); return; }
    openPrintableHtml(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>سجل استلام التكليف بالإشراف</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Tajawal', Arial, sans-serif; color: #1e293b; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 18px; font-weight: 700; font-size: 12px; line-height: 1.8; }
    h1 { text-align: center; font-size: 20px; font-weight: 900; color: #111827; margin: 0 0 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; }
    th { background: #a59bf0; color: #fff; font-weight: 900; }
    .signed { color: #047857; font-weight: 900; }
    .pending { color: #b45309; font-weight: 900; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } th { background: #a59bf0 !important; color: #fff !important; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div>المملكة العربية السعودية</div>
      <div>وزارة التعليم</div>
      <div>${escapeHtml(schoolInfo.region || 'إدارة التعليم')}</div>
      <div>مدرسة ${escapeHtml(printData.schoolName || '')}</div>
    </div>
    <div style="text-align:left">
      <div>العام الدراسي: ${escapeHtml(schoolInfo.academicYear || '')}</div>
      <div>الفصل الدراسي: ${escapeHtml(printData.semester || '')}</div>
      <div>تاريخ الطباعة: ${formatHijriDateTime(new Date().toISOString())}</div>
    </div>
  </div>
  <h1>سجل استلام التكليف بالإشراف</h1>
  <table>
    <thead>
      <tr>
        <th>م</th>
        <th>المشرف / المشرف المتابع</th>
        <th>الصفة</th>
        <th>نوع الإشراف</th>
        <th>تاريخ الإرسال</th>
        <th>التوقيع</th>
        <th>تاريخ التوقيع</th>
      </tr>
    </thead>
    <tbody>
      ${filteredReceipts.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.staffName)}</td>
          <td>${escapeHtml(getStaffRoleLabel(row))}</td>
          <td>${escapeHtml(row.typeName)}</td>
          <td>${formatHijriDateTime(row.sentAt)}</td>
          <td class="${row.status === 'signed' ? 'signed' : 'pending'}">${row.status === 'signed' ? 'وقع' : 'لم يوقع'}</td>
          <td>${formatHijriDateTime(row.signedAt)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <script>document.fonts.ready.then(() => window.print()); setTimeout(() => window.print(), 1200);</script>
</body>
</html>`);
  };

  const handlePrintAssignmentForms = (rows: ReceiptRow[]) => {
    if (rows.length === 0) { showToast?.('لا توجد نماذج للطباعة', 'warning'); return; }
    openPrintableHtml(buildAssignmentFormHtml(rows));
  };

  const validateSendSelection = (): boolean => {
    if (selectedRecipients.length === 0) {
      showToast?.('يرجى اختيار مستلم واحد على الأقل', 'warning');
      return false;
    }
    return true;
  };

  const recordTestReceiptBatch = (rows: SendRow[]) => {
    if (sendMode !== 'electronic' || rows.length === 0) return;
    const sentAt = new Date().toISOString();
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const snapshots = new Map<string, ReceiptSnapshotRow>();

    rows.forEach(row => {
      const key = getReceiptKey(row);
      const existing = snapshots.get(key);
      if (existing) {
        existing.days = Array.from(new Set([...existing.days, row.day]));
        existing.typeName = Array.from(new Set([...existing.typeName.split('، '), row.typeName])).join('، ');
        return;
      }
      snapshots.set(key, {
        key,
        staffId: row.staffId,
        staffName: row.staffName,
        staffType: row.staffType,
        role: row.role,
        day: row.day,
        days: [row.day],
        contextTypeId: row.contextTypeId,
        typeName: row.typeName,
        status: 'pending',
        sentAt,
        signatureToken: buildToken(row),
      });
    });

    const snapshotRows = Array.from(snapshots.values());
    setReceiptBatches(current => [{
      id: batchId,
      sentAt,
      receiptKeys: snapshotRows.map(row => row.key),
      rows: snapshotRows,
    }, ...current]);
    setSelectedReceiptBatchId(batchId);
  };

  const handleSendDirectly = async () => {
    if (!validateSendSelection()) return;

    if (isSendScheduled) {
      if (!sendScheduleDate) {
        showToast?.('يرجى تحديد تاريخ جدولة الإرسال', 'warning');
        return;
      }
      const archiveMessages = selectedRecipients.map(recipient => ({
        source: 'supervision' as const,
        recipientId: recipient.staffId,
        recipientName: recipient.staffName,
        recipientPhone: recipient.phone || '',
        recipientRole: recipient.staffType,
        content: buildRecipientMessage(recipient),
        channel: sendChannel,
        senderRole: 'daily-supervision',
        isScheduled: true,
        scheduledFor: new Date(`${sendScheduleDate}T${sendScheduleTime}`).toISOString(),
      }));
      scheduleMessage({
        scheduledFor: new Date(`${sendScheduleDate}T${sendScheduleTime}`).toISOString(),
        fallbackToSms: sendChannel === 'whatsapp' && fallbackToSms,
        messages: archiveMessages,
      });
      setSendResults(selectedRecipients.map(recipient => ({ name: recipient.staffName, status: 'sent' as const })));
      recordTestReceiptBatch(selectedRows);
      setShowSendResultsModal(true);
      setIsSendingNow(false);
      return;
    }

    setIsSendingNow(true);
    setSendResults([]);
    setShowSendResultsModal(false);
    try {
      await new Promise(resolve => window.setTimeout(resolve, 450));
      const results = selectedRecipients.map(recipient => ({
        name: recipient.staffName,
        status: 'sent' as const,
      }));
      setSendResults(results);
      recordTestReceiptBatch(selectedRows);
      setShowSendResultsModal(true);
    } catch (error) {
      setSendResults([{
        name: 'عملية الإرسال',
        status: 'failed',
        reason: error instanceof Error ? error.message : 'تعذر إكمال عملية الإرسال',
      }]);
      setShowSendResultsModal(true);
    } finally {
      setIsSendingNow(false);
    }
  };

  const closeSendResults = () => {
    setShowSendResultsModal(false);
  };

  const openPreviewMessage = () => {
    if (selectedRows.length === 0) {
      showToast?.('اختر مستلماً واحداً على الأقل لمعاينة الرسالة', 'warning');
      return;
    }
    if (sendMode !== 'electronic') {
      setRecipientsPreviewOpen(true);
      return;
    }
    setPreviewRow(selectedRows[0]);
  };

  // ─── Receipt log inline page ──────────────────────────────────────────
  if (sigReceiptOpen) {
    return (
      <div className="space-y-5" dir="rtl">
        {/* Header */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setSigReceiptOpen(false)} title="رجوع"
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-slate-50 transition-all">
              <ArrowRight size={18} />
            </button>
            <div>
              <h2 className="font-black text-slate-800 text-lg">سجل استلام التكليف بالإشراف</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {selectedBatchSignedCount} وقّع من أصل {selectedBatchRows.length} مشرف
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'إجمالي المشرفين', value: String(selectedBatchRows.length), icon: Users },
            { label: 'وقّع', value: String(selectedBatchSignedCount), icon: CheckCircle2 },
            { label: 'لم يُوقّع', value: String(selectedBatchPendingCount), icon: AlertCircle },
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

        {/* Actions bar */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex flex-wrap items-center gap-2">
            <SingleSelectDropdown
              label=""
              value={selectedReceiptBatchId}
              options={receiptBatchOptions}
              placeholder="اختر الجدول المرسل"
              onChange={setSelectedReceiptBatchId}
              disabled={receiptBatchOptions.length === 0}
              minWidthClass="min-w-[260px] max-w-[400px]"
            />
            <button type="button" onClick={refreshSupervisionDataFromStorage}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black whitespace-nowrap hover:border-[#655ac1] hover:text-[#655ac1] transition-all">
              <RefreshCw size={15} />
              تحديث
            </button>
            <button type="button" onClick={handlePrintReceiptReport} disabled={filteredReceipts.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black whitespace-nowrap hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50">
              <Printer size={15} />
              طباعة سجل الاستلام
            </button>
            <button type="button" onClick={() => handlePrintAssignmentForms(filteredReceipts)} disabled={filteredReceipts.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black whitespace-nowrap hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50">
              <Printer size={15} />
              طباعة نماذج التكليف
            </button>
            <button type="button" onClick={() => handleDirectPrint({ signed: true })} disabled={!hasData}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black whitespace-nowrap hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50">
              <Printer size={15} />
              طباعة الجدول بعد التوقيع
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden"
          style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="px-6 py-4 border-b border-slate-100 bg-white flex flex-wrap items-center gap-3">
            <p className="text-sm font-black text-slate-800 flex items-center gap-2">
              <ClipboardList size={18} className="text-[#655ac1]" />
              سجل الاستلام
            </p>
            <div className="flex-1" />
            <div className="relative w-56">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" value={sigSearch} onChange={e => setSigSearch(e.target.value)}
                placeholder="ابحث عن مشرف..."
                className="w-full pr-8 pl-7 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#655ac1] focus:bg-white transition-all"
                dir="rtl" />
              {sigSearch && (
                <button type="button" onClick={() => setSigSearch('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'signed', 'pending'] as const).map(f => (
                <button key={f} type="button" onClick={() => setSigFilter(f)}
                  className={`px-4 py-2 rounded-xl border text-xs font-black transition-all ${
                    sigFilter === f
                      ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1]'
                  }`}>
                  {f === 'all' ? 'الكل' : f === 'signed' ? 'وقّع' : 'لم يوقّع'}
                </button>
              ))}
            </div>
          </div>

          {displayReceiptBatches.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="mx-auto mb-4 text-slate-300" size={40} />
              <p className="text-sm font-bold text-slate-400">لا توجد طلبات استلام مرسلة بعد.</p>
              <p className="text-xs text-slate-400 mt-1">أرسل تكليف إشراف إلكترونياً ليظهر هنا سجل الاستلام.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] table-fixed text-right whitespace-nowrap" dir="rtl">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] w-[5%]">م</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] w-[19%]">المشرف / المشرف المتابع</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] w-[8%]">الصفة</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] w-[20%]">نوع الإشراف</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] w-[12%]">تاريخ الإرسال</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] w-[10%]">التوقيع</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] w-[12%]">تاريخ التوقيع</th>
                    <th className="px-4 py-3 font-black text-[#655ac1] text-[13px] text-center w-[14%]">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts.map((req, idx) => (
                    <tr key={req.key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 text-slate-400 text-xs font-bold">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-black text-slate-800 text-[12px] truncate" title={req.staffName}>{req.staffName}</td>
                      <td className="px-3 py-3 font-black text-slate-800 text-[12px] truncate" title={getStaffRoleLabel(req)}>
                        {getStaffRoleLabel(req)}
                      </td>
                      <td className="px-3 py-3 text-slate-600 text-[11px] font-bold truncate" title={req.typeName}>{req.typeName}</td>
                      <td className="px-3 py-3 text-slate-500 text-[10px] truncate" title={formatHijriDateTime(req.sentAt)}>{formatHijriDateTime(req.sentAt)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${
                          req.status === 'signed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {req.status === 'signed' ? 'وقع' : 'لم يوقع'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500 text-[10px] truncate" title={formatHijriDateTime(req.signedAt)}>{formatHijriDateTime(req.signedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2 min-w-[118px]">
                          <button type="button" onClick={() => setPreviewReceiptRow(req)} title="عرض وطباعة النموذج"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all whitespace-nowrap shrink-0">
                            <Eye size={14} />
                            عرض وطباعة
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredReceipts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-sm font-medium text-slate-400">
                        لا توجد نتائج تطابق الفلتر.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {previewReceiptRow && createPortal(
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm" dir="rtl">
            <div className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-[2rem] bg-white border border-slate-200 shadow-2xl flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Eye size={22} className="text-[#655ac1] shrink-0" />
                  <h3 className="font-black text-slate-800">معاينة التكليف</h3>
                </div>
                <button type="button" onClick={() => setPreviewReceiptRow(null)}
                  className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="font-black text-slate-400 mb-1">تاريخ الإرسال</p>
                    <p className="font-bold text-slate-700 truncate">{formatHijriDateTime(previewReceiptRow.sentAt)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="font-black text-slate-400 mb-1">تاريخ التوقيع</p>
                    <p className="font-bold text-slate-700 truncate">{formatHijriDateTime(previewReceiptRow.signedAt)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-start gap-2 border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-bold shrink-0">الاسم:</span>
                      <span className="font-black text-slate-800">{previewReceiptRow.staffName}</span>
                    </div>
                    <div className="flex items-center justify-start gap-2 border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-bold shrink-0">الصفة:</span>
                      <span className="font-black text-slate-800">{getStaffRoleLabel(previewReceiptRow)}</span>
                    </div>
                    <div className="flex items-center justify-start gap-2">
                      <span className="text-slate-500 font-bold shrink-0">التوقيع:</span>
                      <span className="font-black text-slate-800">{previewReceiptRow.status === 'signed' ? 'وقع' : 'لم يوقع'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white border-b border-slate-100">
                        <th className="px-3 py-2 text-right text-[#655ac1] font-black">اليوم</th>
                        <th className="px-3 py-2 text-right text-[#655ac1] font-black">نوع الإشراف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewReceiptRow.days.map((day, index) => (
                        <tr key={`${previewReceiptRow.key}-${day}-${index}`} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-black text-slate-700">{DAY_NAMES[day] || day}</td>
                          <td className="px-3 py-2 font-bold text-slate-600">{previewReceiptRow.typeName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-sm font-black text-slate-700">
                  تم العلم والاطلاع على جدول الإشراف المسند والتوقيع بالعلم.
                </p>
                <div className="rounded-2xl border-2 border-dashed border-[#655ac1]/30 bg-slate-50 h-32 flex items-center justify-center text-xs font-bold text-slate-300">
                  {previewReceiptRow.signatureData ? (
                    <img src={previewReceiptRow.signatureData} alt="توقيع" className="max-h-24 max-w-[260px] object-contain" />
                  ) : (
                    'التوقيع'
                  )}
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => handlePrintAssignmentForms([previewReceiptRow])}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#655ac1] hover:bg-[#5046a0] text-white font-bold text-sm transition-all shadow-md shadow-[#655ac1]/20">
                    <Printer size={16} /> طباعة النموذج
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-5" dir="rtl">
      {/* شريط التبويب العلوي */}
      {mode === 'send' && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-5">
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setSigReceiptOpen(true)} className={actionButtonClass(false)}>
              <ClipboardList size={17} />
              سجل استلام التكليف بالإشراف
            </button>
            <button type="button" onClick={onOpenMessagesArchive} disabled={!onOpenMessagesArchive}
              className={`${actionButtonClass(false)} disabled:opacity-50 disabled:cursor-not-allowed`}>
              <Archive size={17} />
              أرشيف الرسائل
            </button>
          </div>
        </div>
      )}

      {/* ══════ الطباعة — بطاقة واحدة ══════ */}
      {mode === 'print' && taskMode === 'print' && (
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
              اضبط خيارات الطباعة قبل طباعة الجدول.
            </p>

            <div className="flex flex-wrap items-end gap-4 mb-5">
              <MultiSelectDropdown
                label="الجداول المراد طباعتها"
                buttonLabel="اختر الجداول"
                hideSelectAll
                options={availablePrintTables.map(t => ({ value: t.id, label: t.name }))}
                selectedValues={selectedPrintTableIds}
                onToggle={togglePrintTable}
                onClear={() => setPrintTableIds([])}
                onSelectAll={() => setPrintTableIds(availablePrintTables.map(t => t.id))}
                selectedSummary={
                  selectedPrintTableIds.length === 0
                    ? ''
                    : selectedPrintTableIds.length === availablePrintTables.length
                      ? 'كل الجداول'
                      : availablePrintTables
                          .filter(t => selectedPrintTableIds.includes(t.id))
                          .map(t => t.name)
                          .join('، ')
                }
              />
              {availablePrintTables.length > 1 && (
                <SingleSelectDropdown
                  label="توزيع الجداول"
                  value={printLayout}
                  onChange={value => setPrintLayout(value as 'merged' | 'separate')}
                  placeholder="اختر الطريقة"
                  options={[
                    { value: 'merged', label: 'دمج في صفحة واحدة' },
                    { value: 'separate', label: 'كل جدول في صفحة' },
                  ]}
                />
              )}
              <SingleSelectDropdown
                label="خانة توقيع المشرف"
                value={printSignatureMode}
                onChange={value => setPrintSignatureMode(value as PrintSignatureMode)}
                placeholder="اختر خيار التوقيع"
                options={[
                  { value: 'with', label: 'إضافة عامود توقيع لكل مشرف' },
                  { value: 'without', label: 'بدون إضافة عامود توقيع لكل مشرف' },
                ]}
              />
              <SingleSelectDropdown
                label="اللون"
                value={printColorMode}
                onChange={value => setPrintColorMode(value as PrintColorMode)}
                placeholder="اختر اللون"
                options={[{ value: 'color', label: 'ملون' }, { value: 'bw', label: 'أبيض وأسود' }]}
              />
            </div>

            <div className="mb-5">
              <label className="block text-xs font-black text-slate-500 mb-2">الملاحظات</label>
              <p className="text-xs font-bold text-slate-600 mb-3">
                هل تريد إضافة ملاحظات في جدول الإشراف اليومي قبل الطباعة ؟{' '}
                <button
                  type="button"
                  onClick={() => setShowNotesField(open => !open)}
                  className="text-[13px] font-black text-[#655ac1] hover:text-[#5046a0] underline underline-offset-4 transition-colors"
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
                  className="w-full border-2 border-slate-200 rounded-xl p-4 outline-none focus:border-[#655ac1] resize-none text-sm leading-relaxed transition-colors"
                  dir="rtl"
                />
              )}
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleDirectPrint}
                className="inline-flex min-w-[160px] items-center justify-center gap-2 px-10 py-2.5 rounded-xl border border-[#655ac1] bg-[#655ac1] text-white text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all shadow-md shadow-[#655ac1]/20"
              >
                <Printer size={16} />
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ الإرسال ══════ */}
      {mode === 'send' && taskMode === 'send' && (
        <div className="space-y-4">
          <div className="px-1">
            <h3 className="font-black text-slate-800 text-lg">إرسال الإشراف</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-start gap-3 mb-2">
                <ClipboardCheck size={20} className="text-[#655ac1]" />
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
                    { value: 'electronic', label: 'تكليف بالإشراف مع توقيع إلكتروني' },
                    { value: 'text', label: 'تكليف نصي بالإشراف' },
                    { value: 'reminder', label: 'تذكير يومي بالإشراف' },
                  ]}
                />
                <SingleSelectDropdown
                  label="نوع الإشراف"
                  value={selectedSupervisionTypeId}
                  onChange={setSelectedSupervisionTypeId}
                  placeholder="اختر نوع الإشراف"
                  disabled={scheduledTypeIds.size === 0}
                  options={supervisionTypeOptions}
                />
                <SingleSelectDropdown
                  label="المستلمون"
                  value={sendAudience}
                  onChange={v => setSendAudience(v as SendAudience)}
                  placeholder="اختر الجهة"
                  options={sendAudienceOptions}
                />
                <MultiSelectDropdown
                  label="الأيام المستهدفة"
                  buttonLabel="اختر الأيام"
                  selectedSummary={selectedDaysSummary}
                  options={dayOptions}
                  selectedValues={selectedDays}
                  onToggle={v => setSelectedDays(c => c.includes(v) ? c.filter(i => i !== v) : [...c, v])}
                  onClear={() => setSelectedDays([])}
                  onSelectAll={() => setSelectedDays(activeDays)}
                />
                <MultiSelectDropdown
                  label="المشرفون المستلمون"
                  buttonLabel="اختر المشرفين"
                  selectedSummary={selectedRecipients.length > 0 ? `${selectedRecipients.length} مستلم محدد` : undefined}
                  options={staffOptions}
                  selectedValues={selectedStaffKeys}
                  onToggle={v => setSelectedStaffKeys(c => c.includes(v) ? c.filter(i => i !== v) : [...c, v])}
                  onClear={() => setSelectedStaffKeys([])}
                  onSelectAll={() => setSelectedStaffKeys(staffOptions.map(option => option.value))}
                  searchable
                  compact
                />
              </div>
            </div>

            <div className="space-y-4">

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-start gap-3 mb-4">
                  <Wallet size={20} className="text-[#655ac1]" />
                  <h4 className="font-black text-slate-800">طريقة الإرسال المفضلة</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setSendChannel('whatsapp')}
                    className={`relative flex items-center gap-3 px-4 py-3 border-2 rounded-xl bg-white transition-all ${
                      sendChannel === 'whatsapp' ? 'border-slate-200 bg-slate-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}>
                    <span className={sendChannel === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-300'}>
                      <WhatsAppIcon size={24} />
                    </span>
                    <span className={`font-black text-sm ${sendChannel === 'whatsapp' ? 'text-[#1d9e4b]' : 'text-slate-400'}`}>واتساب</span>
                    {sendChannel === 'whatsapp' && (
                      <span className="absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#25D366] text-white shadow-sm">
                        <Check size={12} strokeWidth={3.5} />
                      </span>
                    )}
                  </button>
                  <button type="button" onClick={() => setSendChannel('sms')}
                    className={`relative flex items-center gap-3 px-4 py-3 border-2 rounded-xl bg-white transition-all ${
                      sendChannel === 'sms' ? 'border-slate-200 bg-slate-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}>
                    <MessageSquare size={24} className={`shrink-0 ${sendChannel === 'sms' ? 'text-[#007AFF]' : 'text-slate-300'}`} />
                    <span className={`font-black text-sm ${sendChannel === 'sms' ? 'text-[#007AFF]' : 'text-slate-400'}`}>النصية SMS</span>
                    {sendChannel === 'sms' && (
                      <span className="absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#007AFF] text-white shadow-sm">
                        <Check size={12} strokeWidth={3.5} />
                      </span>
                    )}
                  </button>
                </div>
                {sendChannel === 'whatsapp' && (
                  <label className={`relative mt-4 flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-colors border ${
                    fallbackToSms ? 'border-[#655ac1]/40' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={fallbackToSms}
                      onChange={e => setFallbackToSms(e.target.checked)}
                    />
                    <div className={`relative flex items-center w-11 h-6 shrink-0 rounded-full transition-colors ${fallbackToSms ? 'bg-[#655ac1]' : 'bg-slate-300'}`}>
                      <div className={`absolute w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${fallbackToSms ? 'right-1' : 'left-1'}`} />
                    </div>
                    <div className="select-none leading-relaxed">
                      <p className={`text-[13px] font-black ${fallbackToSms ? 'text-[#655ac1]' : 'text-slate-700'}`}>
                        تحويل تلقائي للرسائل النصية عند تعذّر الواتساب
                      </p>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                        لو لم تصل رسالة الواتساب للمستلم تُرسل له رسالة نصية لضمان وصول الرسالة
                      </p>
                    </div>
                  </label>
                )}
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={20} className="text-[#655ac1]" />
                    <h4 className="font-black text-slate-800">نص الرسالة</h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {sendMode === 'electronic' && (
                      <button type="button" onClick={openPreviewMessage} disabled={selectedRecipients.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <Eye size={14} /> معاينة التكليف
                      </button>
                    )}
                    <button type="button" onClick={() => setRecipientsPreviewOpen(true)} disabled={selectedRecipients.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      <Users size={14} /> معاينة المستلمين{selectedRecipients.length > 0 ? ` (${selectedRecipients.length})` : ''}
                    </button>
                    <button
                      type="button"
                      title="استعادة النص الافتراضي"
                      aria-label="استعادة النص الافتراضي"
                      onClick={() => {
                        if (selectedRows.length === 0) return;
                        setMessageText(buildDetailedMessage(selectedRows[0], RECIPIENT_NAME_TOKEN));
                        showToast?.('تمت استعادة النص الافتراضي.', 'success');
                      }}
                      disabled={selectedRows.length === 0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw size={14} className="text-[#655ac1]" />
                    </button>
                  </div>
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
                <MessagePreviewInline
                  previewText={selectedRecipients.length > 0 ? buildRecipientMessage(selectedRecipients[0]) : ''}
                  recipientName={selectedRecipients[0]?.staffName}
                  disabled={selectedRecipients.length === 0}
                  className="mt-0 mb-4"
                />
                {sendChannel === 'sms' && (
                  <div className="rounded-2xl border border-slate-200 px-4 py-3 mb-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black text-[#655ac1]">
                      <span>{smsStats.characterCount} حرفًا</span>
                      <span>الحد الأقصى: {smsStats.maxPerMessage} حرفًا للرسالة</span>
                      <span>{smsStats.messageCount} رسالة نصية</span>
                    </div>
                  </div>
                )}
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
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[30px]">
                          <label className="text-xs font-black text-slate-500">التاريخ</label>
                        </div>
                        <DatePicker
                          value={getValidPickerDate(sendScheduleDate)}
                          onChange={date => setSendScheduleDate(formatPickerDate(date))}
                          calendar={scheduleCalendarType === 'hijri' ? arabic : gregorian}
                          locale={scheduleCalendarType === 'hijri' ? arabic_ar : gregorian_ar}
                          containerClassName="w-full"
                          inputClass="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors cursor-pointer"
                          placeholder="حدد التاريخ"
                          portal
                          portalTarget={document.body}
                          editable={false}
                          zIndex={99999}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[30px]">
                          <label className="text-xs font-black text-slate-500">الوقت</label>
                        </div>
                        <input type="time" value={sendScheduleTime} onChange={e => setSendScheduleTime(e.target.value)}
                          className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors" />
                      </div>
                    </div>
                  )}
                </div>
                <button type="button" onClick={event => { event.preventDefault(); event.stopPropagation(); void handleSendDirectly(); }} disabled={isSendingNow}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#655ac1] text-white font-black shadow-md shadow-[#655ac1]/20 hover:bg-[#5046a0] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSendingNow ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {isSendingNow ? 'جارٍ الإرسال...' : `إرسال عبر ${sendChannelLabel}`}
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {previewRow && createPortal(
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-[2rem] bg-white border border-slate-200 shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <Eye size={22} className="text-[#655ac1] shrink-0" />
                <h3 className="font-black text-slate-800">معاينة التكليف</h3>
              </div>
              <button type="button" onClick={() => setPreviewRow(null)}
                className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-start gap-2 border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-bold shrink-0">الاسم:</span>
                    <span className="font-black text-slate-800">{previewRow.staffName}</span>
                  </div>
                  <div className="flex items-center justify-start gap-2 border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-bold shrink-0">الصفة:</span>
                    <span className="font-black text-slate-800">{getStaffRoleLabel(previewRow)}</span>
                  </div>
                  <div className="flex items-center justify-start gap-2">
                    <span className="text-slate-500 font-bold shrink-0">رقم الجوال:</span>
                    <span className="font-black text-slate-800" dir="ltr">{previewRow.phone || 'غير مسجل'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white border-b border-slate-100">
                      <th className="px-3 py-2 text-right text-[#655ac1] font-black">اليوم</th>
                      <th className="px-3 py-2 text-right text-[#655ac1] font-black">نوع الإشراف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getRowScheduleRows(previewRow).map((row, index) => (
                      <tr key={`${row.day}-${row.typeName}-${index}`} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-black text-slate-700">{DAY_NAMES[row.day] || row.day}</td>
                        <td className="px-3 py-2 font-bold text-slate-600">{row.typeName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-sm font-black text-slate-700">
                تم العلم والاطلاع على جدول الإشراف المسند والتوقيع بالعلم.
              </p>
              <div className="rounded-2xl border-2 border-dashed border-[#655ac1]/30 bg-slate-50 h-32 flex items-center justify-center text-xs font-bold text-slate-300">
                التوقيع
              </div>
                <div className="flex gap-3">
                  <button type="button" disabled className="flex-1 py-3 bg-slate-100 text-slate-400 rounded-xl font-bold text-sm cursor-not-allowed">
                    مسح التوقيع
                  </button>
                  <button type="button" disabled className="flex-1 py-3 bg-slate-200 text-slate-400 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                    <Check size={16} /> إرسال
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-bold text-center">
                  زر الإرسال والتوقيع يعملان عند فتح الرابط من قبل المشرف.
                </p>
              </div>
            </div>
          </div>,
        document.body
      )}

      <RecipientsPreviewModal
        open={recipientsPreviewOpen}
        onClose={() => setRecipientsPreviewOpen(false)}
        recipients={selectedRecipients.map(r => ({
          id: r.key,
          name: r.staffName,
          subtitle: r.staffType === 'teacher' ? 'معلم' : 'إداري',
          role: r.staffType,
          phone: r.phone,
        }))}
      />

      {showSendResultsModal && sendResults.length > 0 && createPortal(
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4 animate-in fade-in"
          dir="rtl"
          onClick={closeSendResults}
        >
          <div
            className="w-full max-w-xl bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <Send size={22} className="text-[#655ac1] shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-black text-slate-800 text-base">نتائج الإرسال</h4>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">تم تسجيل هذه العملية في أرشيف الرسائل.</p>
                </div>
              </div>
              <button
                type="button"
                title="إغلاق"
                aria-label="إغلاق"
                onClick={closeSendResults}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-transparent text-slate-500 hover:text-[#655ac1] hover:border-[#655ac1] transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                  <div className="text-[10px] font-bold text-[#655ac1] mb-1">تم الإرسال</div>
                  <div className="text-xl font-extrabold text-[#655ac1] tabular-nums">{sendResults.filter(r => r.status === 'sent').length}</div>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                  <div className="text-[10px] font-bold text-rose-600 mb-1">فشل الإرسال</div>
                  <div className="text-xl font-extrabold text-rose-600 tabular-nums">{sendResults.filter(r => r.status === 'failed').length}</div>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                  <div className="text-[10px] font-bold text-slate-500 mb-1">الإجمالي</div>
                  <div className="text-xl font-extrabold text-slate-800 tabular-nums">{sendResults.length}</div>
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    {sendChannel === 'whatsapp' ? <WhatsAppIcon size={18} /> : <MessageSquare size={16} className="text-[#007AFF]" />}
                    <span>قناة الإرسال: {sendChannelLabel}</span>
                  </div>
                  <div className="text-xs font-black text-slate-500">
                    {new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={closeSendResults}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-transparent text-slate-700 text-sm font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PrintSendTab;
