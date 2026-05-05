import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import arabic from 'react-date-object/calendars/arabic';
import arabic_ar from 'react-date-object/locales/arabic_ar';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_ar from 'react-date-object/locales/gregorian_ar';
import {
  Printer, Send, Loader2,
  Archive, ClipboardList, ClipboardCheck, CalendarDays, CalendarClock, SlidersHorizontal,
  MessageSquare, AlertCircle, CheckCircle2,
  ChevronDown, Check, Search, Eye, Users, ArrowRight, RefreshCw, X, Copy,
} from 'lucide-react';
import { SchoolInfo, SupervisionScheduleData, Teacher, Admin } from '../../../types';
import {
  getSupervisionPrintData, DAYS, DAY_NAMES, getTimingConfig,
} from '../../../utils/supervisionUtils';
import { calculateSmsSegments } from '../../../utils/smsUtils';
import { useMessageArchive } from '../../messaging/MessageArchiveContext';

interface Props {
  supervisionData: SupervisionScheduleData;
  setSupervisionData?: React.Dispatch<React.SetStateAction<SupervisionScheduleData>>;
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
        <span className="truncate text-[13px] leading-tight">{selected?.label || placeholder}</span>
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
  supervisionData, setSupervisionData, schoolInfo, teachers, admins,
  onOpenLegacyPrint, onOpenLegacySend, onOpenMessagesArchive, showToast,
}) => {
  const { sendMessage, scheduleMessage } = useMessageArchive();
  const [taskMode, setTaskMode] = useState<TaskMode>('print');

  // Print state
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [printColorMode, setPrintColorMode] = useState<PrintColorMode>('color');
  const [printSignatureMode, setPrintSignatureMode] = useState<PrintSignatureMode>('without');
  const [showNotesField, setShowNotesField] = useState(false);
  const [footerText, setFooterText] = useState(supervisionData.footerText || '');

  // Send state
  const [sendMode, setSendMode] = useState<SendMode>('electronic');
  const [selectedSupervisionTypeId, setSelectedSupervisionTypeId] = useState('all');
  const [sendAudience, setSendAudience] = useState<SendAudience>('supervisors');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedStaffKeys, setSelectedStaffKeys] = useState<string[]>([]);
  const [sendChannel, setSendChannel] = useState<SendChannel>('whatsapp');
  const [messageText, setMessageText] = useState('');
  const [isSendScheduled, setIsSendScheduled] = useState(false);
  const [sendScheduleDate, setSendScheduleDate] = useState('');
  const [sendScheduleTime, setSendScheduleTime] = useState('08:00');
  const [scheduleCalendarType, setScheduleCalendarType] = useState<'hijri' | 'gregorian'>(
    ((schoolInfo.calendarType || schoolInfo.semesters?.[0]?.calendarType || 'hijri') as 'hijri' | 'gregorian')
  );
  const [isSendingNow, setIsSendingNow] = useState(false);
  const smsStats = useMemo(() => calculateSmsSegments(messageText), [messageText]);
  const [sendResults, setSendResults] = useState<{ name: string; status: 'sent' | 'failed' }[]>([]);
  const [previewRow, setPreviewRow] = useState<SendRow | null>(null);
  const [previewReceiptRow, setPreviewReceiptRow] = useState<ReceiptRow | null>(null);
  const [recipientsPreviewOpen, setRecipientsPreviewOpen] = useState(false);

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
      if (da.followUpSupervisorId && da.followUpSupervisorName) {
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
  }, [supervisionData, teachers, admins, activeDays]);

  const filteredSendRows = useMemo(() => {
    return sendRows.filter(r => {
      if (selectedDays.length > 0 && !selectedDays.includes(r.day)) return false;
      if (selectedSupervisionTypeId !== 'all' && r.contextTypeId !== selectedSupervisionTypeId) return false;
      if (sendAudience === 'supervisors' && r.role !== 'supervisor') return false;
      if (sendAudience === 'followups' && r.role !== 'followup') return false;
      return true;
    });
  }, [sendRows, selectedDays, selectedSupervisionTypeId, sendAudience]);

  const staffOptions: DropdownOption[] = useMemo(
    () => filteredSendRows.map(r => ({
      value: r.key,
      label: `${r.typeName} - ${r.staffName} - ${DAY_NAMES[r.day] || r.day}${r.role === 'followup' ? ' (مشرف متابع)' : ''}`,
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
    setMessageText(buildDetailedMessage(selectedRows[0]));
  }, [sendMode, selectedRows]);

  useEffect(() => {
    if (!previewRow) return;
    if (!selectedRows.some(row => row.key === previewRow.key)) setPreviewRow(null);
  }, [previewRow, selectedRows]);

  const buildMessage = (row: SendRow): string => buildDetailedMessage(row);

  // ─── Receipt log rows ──────────────────────────────────────────────────
  type ReceiptRow = {
    key: string;
    staffId: string;
    staffName: string;
    staffType: 'teacher' | 'admin';
    role: 'supervisor' | 'followup';
    day: string;
    contextTypeId?: string;
    typeName: string;
    status: 'signed' | 'pending';
    sentAt?: string;
    signedAt?: string;
    signatureData?: string;
    signatureToken?: string;
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
    return Array.from(rows.values()).sort((a, b) =>
      a.staffName.localeCompare(b.staffName, 'ar') ||
      (a.role === 'supervisor' ? 0 : 1) - (b.role === 'supervisor' ? 0 : 1)
    );
  }, [supervisionData, teachers]);

  const totalAssignedSupervisors = receiptRows.length;
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

  const formatHijriDateTime = (date?: string) => {
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
  };

  const refreshSupervisionDataFromStorage = () => {
    setSigSearch('');
    setSigFilter('all');
    if (!setSupervisionData) return;
    try {
      const raw = localStorage.getItem('supervision_data_v1');
      if (raw) setSupervisionData(JSON.parse(raw));
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
    ? 'رسالة تكليف بالإشراف مع توقيع الكتروني'
    : sendMode === 'text'
      ? 'رسالة تكليف بالإشراف نصية'
      : 'رسالة تذكير يومية بالإشراف';

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

  const buildDetailedMessage = (row: SendRow): string => {
    const assignmentDayName = DAY_NAMES[row.day] || row.day;
    const assignmentHijri = formatHijriDate(supervisionData.effectiveDate);
    const todayDayName = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][new Date().getDay()];
    const todayHijri = formatHijriDate();
    const schoolName = schoolInfo.schoolName || 'اسم المدرسة';
    const link = buildSignatureLink(row);
    const reminderTemplate = supervisionData.settings.reminderMessageTemplate?.trim();
    const fillReminderTemplate = (template: string) => template
      .replace(/\(\s*(?:اسم المستلم|اسم المعلم|يظهر هنا اسم المعلم)\s*\)/g, row.staffName)
      .replace(/\(\s*(?:اليوم|يظهر هنا اليوم)\s*\)/g, todayDayName)
      .replace(/\(\s*(?:اسم المدرسة|يظهر اسم المدرسة)\s*\)/g, schoolName)
      .replace(/\(\s*(?:التاريخ بالهجري|يظهر التاريخ بالهجري)\s*\)/g, todayHijri)
      .replace(/\(\s*(?:الفصل الدراسي|يظهر الفصل الدراسي)\s*\)/g, currentSemesterName);

    if (sendMode === 'electronic') {
      return `المكرم/ ${row.staffName}\nنشعركم بإسناد مهمة الإشراف اليومي لكم في يوم ${assignmentDayName}، يرجى الدخول على الرابط المرفق والتوقيع بالعلم، شاكرين تعاونكم.\n${schoolName} - ${assignmentDayName} - ${assignmentHijri} - ${currentSemesterName}\nرابط التكليف والتوقيع:\n${link}`;
    }
    if (sendMode === 'text') {
      return `المكرم/ ${row.staffName}\nنشعركم بإسناد مهمة الإشراف اليومي لكم في يوم ${assignmentDayName}، شاكرين تعاونكم.\n${schoolName} - ${assignmentDayName} - ${assignmentHijri} - ${currentSemesterName}.`;
    }
    if (reminderTemplate) {
      return fillReminderTemplate(reminderTemplate);
    }
    return `المكرم/ ${row.staffName}\nنذكركم بموعد الإشراف اليومي لهذا اليوم ${todayDayName}، شاكرين تعاونكم.\n${schoolName} - ${todayDayName} - ${todayHijri} - ${currentSemesterName}.`;
  };

  const markSignaturePending = (rows: SendRow[]) => {
    if (sendMode !== 'electronic' || !setSupervisionData) return;
    const targets = new Map(rows.map(row => [row.key, buildToken(row)]));
    const sentAt = new Date().toISOString();
    setSupervisionData(prev => ({
      ...prev,
      dayAssignments: prev.dayAssignments.map(da => ({
        ...da,
        staffAssignments: da.staffAssignments.map(sa => {
          const key = `sup-${da.day}-${sa.contextTypeId}-${sa.staffId}`;
          const token = targets.get(key);
          return token ? { ...sa, signatureStatus: 'pending' as const, signatureToken: token, signatureSentAt: sa.signatureSentAt || sentAt } : sa;
        }),
        ...(da.followUpSupervisorId ? (() => {
          const match = rows.find(row => row.role === 'followup' && row.day === da.day && row.staffId === da.followUpSupervisorId);
          return match ? { followUpSignatureStatus: 'pending' as const, followUpSignatureToken: buildToken(match), followUpSignatureSentAt: da.followUpSignatureSentAt || sentAt } : {};
        })() : {}),
      })),
    }));
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
    const renderSignatureImage = (signatureData?: string) =>
      signatureData
        ? `<img class="signature-img" src="${signatureData}" alt="توقيع" />`
        : '<div class="signature-line"></div>';
    const renderSignatureCell = (day: string, typeId: string) => {
      const rows = getStaffForType(day, typeId);
      if (rows.length === 0) return '<span class="empty-state">—</span>';
      return rows.map(row => printSignedVersion ? renderSignatureImage(row.signatureData) : '<div class="signature-line"></div>').join('');
    };
    const renderTable = (types: typeof activeTypes) => {
      if (types.length === 0) return '';
      const typeColWidth = includeSignature ? 56 / types.length : 78 / types.length;
      const signatureColWidth = includeSignature ? 22 / types.length : 0;
      return `
        <section class="schedule-section">
          <table>
            <thead>
              <tr>
                <th style="width: 12%;">اليوم</th>
                ${types.map(type => `
                  <th style="width: ${typeColWidth}%;">${escapeHtml(type.name)}</th>
                  ${includeSignature ? `<th style="width: ${signatureColWidth}%;">التوقيع</th>` : ''}
                `).join('')}
                <th style="width: 10%;">المشرف المتابع</th>
                ${includeSignature ? '<th style="width: 10%;">التوقيع</th>' : ''}
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
                  ${includeSignature ? `<td class="followup-signature signature-cell">${printSignedVersion ? renderSignatureImage(dayAssignment?.followUpSignatureData) : ''}</td>` : ''}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </section>
      `;
    };
    const printableTables = [
      renderTable(inlineTypes),
      ...separateGroups.map(group => renderTable(group.types)),
    ].join('');

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
        <div class="info-line"><span class="info-label">الصفة:</span><span class="info-value">${row.staffType === 'teacher' ? 'معلم' : 'إداري'}</span></div>
        <div class="info-line"><span class="info-label">الحالة:</span><span class="info-value">${row.status === 'signed' ? 'وقع' : 'لم يوقع'}</span></div>
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
        <th>الحالة</th>
        <th>تاريخ الإرسال</th>
        <th>تاريخ التوقيع</th>
      </tr>
    </thead>
    <tbody>
      ${filteredReceipts.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.staffName)}</td>
          <td>${row.staffType === 'teacher' ? 'معلم' : 'إداري'}</td>
          <td>${escapeHtml(row.typeName)}</td>
          <td class="${row.status === 'signed' ? 'signed' : 'pending'}">${row.status === 'signed' ? 'وقع' : 'لم يوقع'}</td>
          <td>${formatHijriDateTime(row.sentAt)}</td>
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
    if (selectedRows.length === 0) {
      showToast?.('يرجى اختيار مستلم واحد على الأقل', 'warning');
      return false;
    }
    return true;
  };

  const handleSendDirectly = async () => {
    if (!validateSendSelection()) return;

    const archiveMessages = selectedRows.map(row => ({
      source: 'supervision' as const,
      recipientId: row.staffId,
      recipientName: row.staffName,
      recipientPhone: row.phone || '',
      recipientRole: row.staffType,
      content: selectedRows.length === 1 && messageText.trim() ? messageText : buildMessage(row),
      channel: sendChannel,
      senderRole: 'daily-supervision',
      isScheduled: isSendScheduled,
      scheduledFor: isSendScheduled && sendScheduleDate ? new Date(`${sendScheduleDate}T${sendScheduleTime}`).toISOString() : undefined,
    }));

    if (isSendScheduled) {
      if (!sendScheduleDate) {
        showToast?.('يرجى تحديد تاريخ جدولة الإرسال', 'warning');
        return;
      }
      scheduleMessage({
        scheduledFor: new Date(`${sendScheduleDate}T${sendScheduleTime}`).toISOString(),
        fallbackToSms: false,
        messages: archiveMessages,
      });
      markSignaturePending(selectedRows);
      setSendResults(selectedRows.map(row => ({ name: row.staffName, status: 'sent' as const })));
      return;
    }

    setIsSendingNow(true);
    setSendResults([]);
    const results: { name: string; status: 'sent' | 'failed' }[] = [];

    for (const row of selectedRows) {
      const msg = selectedRows.length === 1 && messageText.trim() ? messageText : buildMessage(row);
      const phone = row.phone || '';
      try {
        if (!phone) { results.push({ name: row.staffName, status: 'failed' }); continue; }
        await sendMessage({
          source: 'supervision',
          recipientId: row.staffId,
          recipientName: row.staffName,
          recipientPhone: phone,
          recipientRole: row.staffType,
          content: msg,
          channel: sendChannel,
          senderRole: 'daily-supervision',
        });
        if (sendChannel === 'whatsapp') {
          window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
          window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, '_blank');
        }
        results.push({ name: row.staffName, status: 'sent' });
        await new Promise(r => setTimeout(r, 400));
      } catch {
        results.push({ name: row.staffName, status: 'failed' });
      }
    }
    markSignaturePending(selectedRows.filter(row => results.some(result => result.name === row.staffName && result.status === 'sent')));
    setSendResults(results);
    setIsSendingNow(false);
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-slate-800 text-lg">سجل استلام التكليف بالإشراف</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {signedCount} وقّع من أصل {totalAssignedSupervisors} مشرف
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
            { label: 'إجمالي المشرفين', value: String(totalAssignedSupervisors), icon: Users },
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
            <button type="button" onClick={refreshSupervisionDataFromStorage}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all">
              <RefreshCw size={13} />
              تحديث
            </button>
            <button type="button" onClick={handlePrintReceiptReport} disabled={receiptRows.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50">
              <Printer size={13} />
              طباعة التقرير
            </button>
            <button type="button" onClick={() => handlePrintAssignmentForms(filteredReceipts)} disabled={receiptRows.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50">
              <Printer size={13} />
              طباعة النماذج
            </button>
            <button type="button" onClick={() => handleDirectPrint({ signed: true })} disabled={!hasData}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50">
              <Printer size={13} />
              طباعة جدول الإشراف بالتوقيع
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
              <table className="w-full min-w-[1120px] table-fixed text-right whitespace-nowrap" dir="rtl">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[11px] w-[5%]">م</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[11px] w-[19%]">المشرف / المشرف المتابع</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[11px] w-[8%]">الصفة</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[11px] w-[20%]">نوع الإشراف</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[11px] w-[10%]">الحالة</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[11px] w-[12%]">تاريخ الإرسال</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[11px] w-[12%]">تاريخ التوقيع</th>
                    <th className="px-4 py-3 font-black text-[#655ac1] text-[11px] text-center w-[14%]">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts.map((req, idx) => (
                    <tr key={req.key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3 text-slate-400 text-[11px] font-bold truncate">{idx + 1}</td>
                      <td className="px-3 py-3 font-black text-slate-800 text-[12px] truncate" title={req.staffName}>{req.staffName}</td>
                      <td className="px-3 py-3 text-slate-500 text-[11px] truncate">
                        {req.staffType === 'teacher' ? 'معلم' : 'إداري'}
                      </td>
                      <td className="px-3 py-3 text-slate-600 text-[11px] font-bold truncate" title={req.typeName}>{req.typeName}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${
                          req.status === 'signed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {req.status === 'signed' ? 'وقع' : 'لم يوقع'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500 text-[10px] truncate" title={formatHijriDateTime(req.sentAt)}>{formatHijriDateTime(req.sentAt)}</td>
                      <td className="px-3 py-3 text-slate-500 text-[10px] truncate" title={formatHijriDateTime(req.signedAt)}>{formatHijriDateTime(req.signedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2 min-w-[118px]">
                          <button type="button" onClick={() => setPreviewReceiptRow(req)} title="معاينة النموذج"
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#f0edff] transition-all whitespace-nowrap shrink-0">
                            <Eye size={13} />
                            معاينة
                          </button>
                          <button type="button" onClick={() => handlePrintAssignmentForms([req])} title="طباعة النموذج"
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#f0edff] transition-all whitespace-nowrap shrink-0">
                            <Printer size={13} />
                            طباعة
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
                  <h3 className="font-black text-slate-800">معاينة التكليف الإلكتروني</h3>
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
                      <span className="font-black text-[#655ac1]">{previewReceiptRow.staffType === 'teacher' ? 'معلم' : 'إداري'}</span>
                    </div>
                    <div className="flex items-center justify-start gap-2">
                      <span className="text-slate-500 font-bold shrink-0">الحالة:</span>
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
                <div className="flex gap-3">
                  <button type="button" onClick={() => handlePrintAssignmentForms([previewReceiptRow])}
                    className="w-full py-3 bg-[#655ac1] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
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
            سجل استلام التكليف بالإشراف
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
              اضبط مقاس الورق والألوان وإضافة عامود التوقيع ثم أضف الملاحظات قبل طباعة جدول الإشراف.
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
                  { value: 'with', label: 'إضافة عامود توقيع لكل مشرف' },
                  { value: 'without', label: 'بدون إضافة عامود توقيع لكل مشرف' },
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
      {taskMode === 'send' && (
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
                    { value: 'electronic', label: 'رسالة تكليف بالإشراف مع توقيع الكتروني' },
                    { value: 'text', label: 'رسالة تكليف بالإشراف نصية' },
                    { value: 'reminder', label: 'رسالة تذكير يومية بالإشراف' },
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
                  options={[
                    { value: 'supervisors', label: 'المشرفون' },
                    { value: 'followups', label: 'المتابعون' },
                    { value: 'all', label: 'الكل (المشرفون والمتابعون)' },
                  ]}
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
                  selectedSummary={selectedStaffKeys.length > 0 ? `${selectedStaffKeys.length} مستلم محدد` : undefined}
                  options={staffOptions}
                  selectedValues={selectedStaffKeys}
                  onToggle={v => setSelectedStaffKeys(c => c.includes(v) ? c.filter(i => i !== v) : [...c, v])}
                  onClear={() => setSelectedStaffKeys([])}
                  onSelectAll={() => setSelectedStaffKeys(filteredSendRows.map(r => r.key))}
                  searchable
                />
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
                  <button type="button" onClick={openPreviewMessage} disabled={selectedRows.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <Eye size={15} /> {sendMode === 'electronic' ? 'معاينة التكليف الإلكتروني' : 'معاينة الرسالة'}
                  </button>
                  <button type="button" onClick={() => setRecipientsPreviewOpen(true)} disabled={selectedRows.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <Users size={15} /> معاينة المستلمين{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                  </button>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={20} className="text-[#655ac1]" />
                    <h4 className="font-black text-slate-800">نص الرسالة</h4>
                  </div>
                  <button
                    type="button"
                    title="استعادة النص الافتراضي"
                    aria-label="استعادة النص الافتراضي"
                    onClick={() => {
                      if (selectedRows.length === 0) return;
                      setMessageText(buildDetailedMessage(selectedRows[0]));
                      showToast?.('تمت استعادة النص الافتراضي.', 'success');
                    }}
                    disabled={selectedRows.length === 0}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={14} className="text-[#655ac1]" />
                  </button>
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
                          <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5">
                            {[
                              { value: 'hijri', label: 'هجري' },
                              { value: 'gregorian', label: 'ميلادي' },
                            ].map(option => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setScheduleCalendarType(option.value as 'hijri' | 'gregorian')}
                                className={`px-2 py-1 rounded-md text-[10px] font-black transition-all ${
                                  scheduleCalendarType === option.value ? 'bg-[#655ac1] text-white' : 'text-slate-500 hover:text-[#655ac1]'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
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
                <button type="button" onClick={handleSendDirectly} disabled={isSendingNow}
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
                <h3 className="font-black text-slate-800">معاينة التكليف الإلكتروني</h3>
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
                    <span className="font-black text-[#655ac1]">{previewRow.staffType === 'teacher' ? 'معلم' : 'إداري'}</span>
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

      {recipientsPreviewOpen && createPortal(
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-[78rem] h-[85vh] overflow-hidden rounded-[2rem] bg-white border border-slate-200 shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <Users size={22} className="text-[#655ac1] shrink-0" />
                <h3 className="font-black text-slate-800">معاينة المستلمين</h3>
              </div>
              <button type="button" onClick={() => setRecipientsPreviewOpen(false)}
                className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="overflow-x-hidden">
                <table className="w-full table-fixed text-right whitespace-nowrap" dir="rtl">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-3 py-4 font-black text-[#655ac1] text-[12px] text-center whitespace-nowrap w-[10%]">اليوم</th>
                      <th className="px-3 py-4 font-black text-[#655ac1] text-[12px] text-center whitespace-nowrap w-[14%]">التاريخ</th>
                      <th className="px-3 py-4 font-black text-[#655ac1] text-[12px] text-right whitespace-nowrap w-[18%]">المستلم</th>
                      <th className="px-3 py-4 font-black text-[#655ac1] text-[12px] text-right whitespace-nowrap w-[22%]">نوع الإشعار</th>
                      {sendMode === 'electronic' && <th className="px-3 py-4 font-black text-[#655ac1] text-[12px] text-right whitespace-nowrap w-[22%]">الرابط</th>}
                      <th className="px-3 py-4 font-black text-[#655ac1] text-[12px] text-center whitespace-nowrap w-[14%]">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRows.length === 0 ? (
                      <tr>
                        <td colSpan={sendMode === 'electronic' ? 6 : 5} className="px-6 py-10 text-center text-sm font-bold text-slate-400">
                          لم يتم اختيار مستلمين بعد.
                        </td>
                      </tr>
                    ) : selectedRows.map(row => {
                      const link = sendMode === 'electronic' ? buildSignatureLink(row) : '';
                      return (
                        <tr key={row.key} className="hover:bg-[#f8f7ff] transition-all">
                          <td className="px-3 py-3.5 text-center text-[12px] font-bold text-slate-700 whitespace-nowrap truncate">{DAY_NAMES[row.day] || row.day}</td>
                          <td className="px-3 py-3.5 text-center">
                            <span className="block max-w-full px-2 py-1 bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 whitespace-nowrap truncate">
                              {formatHijriDate(supervisionData.effectiveDate)}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap min-w-0">
                            <div className="whitespace-nowrap">
                              <p className="font-black text-[12px] text-slate-800 whitespace-nowrap truncate" title={row.staffName}>{row.staffName}</p>
                              <p className="text-[10px] font-bold text-slate-400 whitespace-nowrap truncate" title={row.typeName}>{row.typeName}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 text-[12px] font-bold text-slate-700 whitespace-nowrap truncate" title={notificationTypeLabel}>{notificationTypeLabel}</td>
                          {sendMode === 'electronic' && (
                            <td className="px-3 py-3.5 min-w-0">
                              <div dir="ltr" title={link} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-mono text-slate-500 truncate">
                                {link}
                              </div>
                            </td>
                          )}
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                              {sendMode === 'electronic' && (
                                <button type="button" onClick={() => setPreviewRow(row)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-black hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#f1efff] transition-all whitespace-nowrap">
                                  <Eye size={12} />
                                  عرض
                                </button>
                              )}
                              {sendMode === 'electronic' && (
                                <button type="button" onClick={() => copyToClipboard(link)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-black hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#f1efff] transition-all whitespace-nowrap">
                                  <Copy size={12} />
                                  نسخ
                                </button>
                              )}
                              {sendMode !== 'electronic' && <span className="text-xs font-bold text-slate-400 whitespace-nowrap">بدون رابط</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
              <button type="button" onClick={() => setRecipientsPreviewOpen(false)}
                className="px-6 py-2.5 text-sm text-slate-600 font-bold bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors">
                إغلاق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {sendResults.length > 0 && createPortal(
        <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white border border-slate-200 shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100 bg-[#f8f7ff] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white text-[#655ac1] flex items-center justify-center shadow-sm border border-[#e5e1fe]">
                  <CheckCircle2 size={23} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">نتائج الإرسال</h3>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">تم تسجيل العملية في أرشيف الرسائل</p>
                </div>
              </div>
              <button type="button" onClick={() => setSendResults([])}
                className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                  <p className="text-3xl font-black text-emerald-800">{sendResults.filter(r => r.status === 'sent').length}</p>
                  <p className="text-xs text-emerald-600 mt-1 font-bold">تم الإرسال</p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-center">
                  <p className="text-3xl font-black text-rose-800">{sendResults.filter(r => r.status === 'failed').length}</p>
                  <p className="text-xs text-rose-600 mt-1 font-bold">فشل</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-3xl font-black text-slate-800">{sendResults.length}</p>
                  <p className="text-xs text-slate-500 mt-1 font-bold">الإجمالي</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {sendResults.map((result, index) => (
                    <div key={`${result.name}-${index}`} className="px-4 py-3 flex items-center justify-between gap-3 bg-white">
                      <span className="text-sm font-black text-slate-700 truncate">{result.name}</span>
                      <span className={`px-3 py-1 rounded-full text-[11px] font-black whitespace-nowrap ${
                        result.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {result.status === 'sent' ? 'تم الإرسال' : 'فشل الإرسال'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => setSendResults([])}
                className="w-full py-3 rounded-xl bg-[#655ac1] hover:bg-[#5046a0] text-white text-sm font-black transition-all shadow-md shadow-[#655ac1]/20">
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
