import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import arabic from 'react-date-object/calendars/arabic';
import arabic_ar from 'react-date-object/locales/arabic_ar';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_ar from 'react-date-object/locales/gregorian_ar';
import {
  AlertCircle, Archive, ArrowRight, CalendarClock, Check, CheckCircle2, ChevronDown,
  ClipboardCheck, ClipboardList, Copy, Eye, FileText, MessageSquare, Printer, RefreshCw,
  Search, Send, SlidersHorizontal, Users, Wallet, X,
} from 'lucide-react';
import { DutyDayAssignment, DutyReportRecord, DutyScheduleData, DutyWeekAssignment, SchoolInfo } from '../../../types';
import { DAY_NAMES } from '../../../utils/dutyUtils';
import { calculateSmsSegments } from '../../../utils/smsUtils';
import DutyReportPreview from '../../duty/DutyReportPreview';

const WhatsAppIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

interface Props {
  dutyData: DutyScheduleData;
  setDutyData?: React.Dispatch<React.SetStateAction<DutyScheduleData>>;
  storageKey?: string;
  schoolInfo: SchoolInfo;
  onOpenLegacyPrint: () => void;
  onOpenLegacySend: () => void;
  onOpenArchive?: () => void;
  showToast?: (msg: string, type: 'success' | 'warning' | 'error') => void;
  mode?: 'print' | 'send';
}

type TaskMode = 'print' | 'send';
type PaperSize = 'A4' | 'A3';
type PrintColorMode = 'color' | 'bw';
type PrintSignatureMode = 'with' | 'without';
type SchedulePrintScope = 'all' | 'selectedWeeks';
type SendMode = 'electronic' | 'text' | 'reminder';
type SendChannel = 'whatsapp' | 'sms';
type CalendarType = 'hijri' | 'gregorian';
const RECIPIENT_NAME_TOKEN = '{اسم_المستلم}';

type DropdownOption = {
  value: string;
  label: string;
  searchText?: string;
  disabled?: boolean;
};

type DutySendFlatRow = {
  key: string;
  dayKey: string;
  weekId: string;
  weekName: string;
  day: string;
  date: string;
  staffId: string;
  staffName: string;
  staffTypeKey: 'teacher' | 'admin';
  staffType: string;
  phone: string;
  signatureToken: string;
  status: 'signed' | 'pending' | 'none';
  sentAt?: string;
  signedAt?: string;
};

type DutySendDisplayRow = DutySendFlatRow & {
  assignments: DutySendFlatRow[];
  assignmentCount: number;
  reportDueCount: number;
  reportSubmittedCount: number;
  dayLabel: string;
  dateLabel: string;
};

const actionButtonClass = (active: boolean) =>
  `inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-black transition-all ${
    active
      ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-md shadow-[#655ac1]/20'
      : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-slate-50'
  }`;

const normalizeSearchText = (value: string) => (value || '')
  .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[إأآا]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/[ًٌٍَُِّْـ]/g, '')
  .toLowerCase()
  .trim();

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
      <label className="block text-xs font-black text-slate-500 mb-2">{label}</label>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(current => !current)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="truncate text-[13px] leading-tight">{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[130] animate-in slide-in-from-top-2"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => { if (option.disabled) return; onChange(option.value); setOpen(false); }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                  option.disabled ? 'text-slate-300 cursor-not-allowed bg-slate-50/70' :
                  value === option.value ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                }`}
              >
                <span>{option.label}</span>
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
  disabled?: boolean;
  minWidthClass?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}> = ({ label, buttonLabel, options, selectedValues, onToggle, onClear, onSelectAll, selectedSummary, disabled = false, minWidthClass = 'min-w-[260px]', searchable = false, searchPlaceholder = 'ابحث...' }) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { triggerRef, panelRef, position } = useDropdownPosition(open, () => setOpen(false));
  const visibleOptions = useMemo(() => {
    const q = normalizeSearchText(searchValue);
    if (!q) return options;
    return options.filter(option => normalizeSearchText(`${option.label} ${option.searchText || ''}`).includes(q));
  }, [options, searchValue]);

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => { if (!open) setSearchValue(''); }, [open]);

  return (
    <div className={`flex-1 ${minWidthClass}`}>
      <label className="block text-xs font-black text-slate-500 mb-2">{label}</label>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(current => !current)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="truncate text-[13px] leading-tight">{selectedSummary || buttonLabel}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[130] animate-in slide-in-from-top-2"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          <div className="flex items-center justify-between px-2 py-2 mb-2 border border-slate-100 bg-slate-50 rounded-xl">
            {onSelectAll ? <button type="button" onClick={onSelectAll} className="text-xs font-black text-[#655ac1] hover:underline">اختيار الكل</button> : <span />}
            <button type="button" onClick={onClear} className="text-xs font-black text-slate-400 hover:text-rose-500 hover:underline">إلغاء الكل</button>
          </div>
          {searchable && (
            <div className="relative mb-2">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchValue}
                onChange={event => setSearchValue(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pr-8 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#655ac1] focus:bg-white transition-all"
                dir="rtl"
                autoFocus
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {visibleOptions.map(option => {
              const selected = selectedValues.includes(option.value);
              return (
                <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => { if (!option.disabled) onToggle(option.value); }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                  option.disabled ? 'text-slate-300 cursor-not-allowed bg-slate-50/70' :
                  selected ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                }`}
              >
                  <span>{option.label}</span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                    selected ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'
                  }`}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                </button>
              );
            })}
            {visibleOptions.length === 0 && (
              <div className="px-3 py-6 text-center text-xs font-bold text-slate-400">لا توجد نتائج مطابقة.</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const escapeHtml = (value?: string) => (value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatDisplayDate = (date?: string) => {
  if (!date) return '-';
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
};

const formatHijriDate = (date?: string) => {
  if (!date) return '-';
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
};

const formatHijriDateTime = (date?: string) => {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const formatPickerDate = (date: DateObject | null) => {
  if (!date) return '';
  return date.convert(gregorian).format('YYYY-MM-DD');
};

const getValidPickerDate = (date?: string, calendarType: CalendarType = 'hijri') => {
  if (!date) return undefined;
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return new DateObject({ date: parsed, calendar: gregorian }).convert(calendarType === 'hijri' ? arabic : gregorian);
};

const PrintSendTab: React.FC<Props> = ({
  dutyData,
  setDutyData,
  storageKey,
  schoolInfo,
  onOpenLegacySend,
  onOpenArchive,
  showToast,
  mode = 'print',
}) => {
  const refreshDutyDataFromStorage = () => {
    if (!setDutyData) return;
    try {
      const key = storageKey || 'duty_data_v1';
      const raw = localStorage.getItem(key);
      if (raw) setDutyData(JSON.parse(raw));
      showToast?.('تم تحديث سجل الاستلام', 'success');
    } catch {
      showToast?.('تعذر تحديث سجل الاستلام', 'error');
    }
  };
  const openReminderFromDashboard = (() => {
    try { return sessionStorage.getItem('motabe:duty_v2:open_send_reminder') === '1'; } catch { return false; }
  })();
  const [taskMode, setTaskMode] = useState<TaskMode>(mode === 'send' || openReminderFromDashboard ? 'send' : 'print');
  const [schedulePrintScope, setSchedulePrintScope] = useState<SchedulePrintScope>('all');
  const [selectedWeekIds, setSelectedWeekIds] = useState<string[]>([]);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [printColorMode, setPrintColorMode] = useState<PrintColorMode>('color');
  const [printSignatureMode, setPrintSignatureMode] = useState<PrintSignatureMode>('without');
  const [showNotesField, setShowNotesField] = useState(false);
  const [footerText, setFooterText] = useState(dutyData.footerText || '');
  const [reportDutyRowsCount, setReportDutyRowsCount] = useState('1');
  const [sendMode, setSendMode] = useState<SendMode>(openReminderFromDashboard ? 'reminder' : 'electronic');

  useEffect(() => {
    if (openReminderFromDashboard) {
      try { sessionStorage.removeItem('motabe:duty_v2:open_send_reminder'); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [sendChannel, setSendChannel] = useState<SendChannel>('whatsapp');
  const [isSendScheduled, setIsSendScheduled] = useState(false);
  const [sendScheduleTime, setSendScheduleTime] = useState(dutyData.settings.reminderSendTime || '07:00');
  const [messageText, setMessageText] = useState('');
  const [selectedSendWeekIds, setSelectedSendWeekIds] = useState<string[]>([]);
  const [selectedSendDayKeys, setSelectedSendDayKeys] = useState<string[]>([]);
  const [selectedStaffKeys, setSelectedStaffKeys] = useState<string[]>([]);
  const [staffSelectionTouched, setStaffSelectionTouched] = useState(false);
  const [includeReportLinkInReminder, setIncludeReportLinkInReminder] = useState(dutyData.settings.includeReportLinkInReminder ?? true);
  const [sendScheduleDate, setSendScheduleDate] = useState(() => new DateObject({ calendar: gregorian }).format('YYYY-MM-DD'));
  const [scheduleCalendarType, setScheduleCalendarType] = useState<CalendarType>('hijri');
  const [previewRowKey, setPreviewRowKey] = useState<string | null>(null);
  const [recipientsPreviewOpen, setRecipientsPreviewOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [reportReceiptOpen, setReportReceiptOpen] = useState(false);
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'signed' | 'pending'>('all');
  const [receiptSearch, setReceiptSearch] = useState('');
  const [reportFilter, setReportFilter] = useState<'all' | 'submitted' | 'pending'>('all');
  const [reportSearch, setReportSearch] = useState('');
  const [previewAssignmentRow, setPreviewAssignmentRow] = useState<DutySendDisplayRow | null>(null);
  const [previewReportStaff, setPreviewReportStaff] = useState<{ staffId: string; staffName: string; staffType: string } | null>(null);
  const [previewReportRecord, setPreviewReportRecord] = useState<DutyReportRecord | null>(null);
  const smsStats = useMemo(() => calculateSmsSegments(messageText), [messageText]);

  const weeksToRender = useMemo<DutyWeekAssignment[]>(() => {
    if (dutyData.weekAssignments && dutyData.weekAssignments.length > 0) return dutyData.weekAssignments;
    return [{
      weekId: 'legacy-week',
      weekName: 'جدول المناوبة',
      startDate: '',
      endDate: '',
      dayAssignments: dutyData.dayAssignments,
    }];
  }, [dutyData.dayAssignments, dutyData.weekAssignments]);

  const selectedWeeks = useMemo(() => {
    if (schedulePrintScope === 'all') return weeksToRender;
    return weeksToRender.filter(week => selectedWeekIds.includes(week.weekId));
  }, [schedulePrintScope, selectedWeekIds, weeksToRender]);

  const reportByStaffAndDate = useMemo(() => (
    new Map(
      dutyData.reports
        .filter(report => !report.manuallySubmitted)
        .map(report => [`${report.staffId}-${report.date}`, report])
    )
  ), [dutyData.reports]);

  const sendRows = useMemo<DutySendFlatRow[]>(() => {
    const sourceWeeks = dutyData.weekAssignments && dutyData.weekAssignments.length > 0
      ? dutyData.weekAssignments
      : weeksToRender;
    return sourceWeeks.flatMap((week, weekIndex) =>
      week.dayAssignments.flatMap(day =>
        day.staffAssignments.map(staff => {
          const dayKey = `${week.weekId}-${day.date || day.day}`;
          return {
            key: `${dayKey}-${staff.staffId}`,
            dayKey,
            weekId: week.weekId,
            weekName: week.weekName || `الأسبوع ${weekIndex + 1}`,
            day: day.day,
            date: day.date || '',
            staffId: staff.staffId,
            staffName: staff.staffName,
            staffTypeKey: staff.staffType,
            staffType: staff.staffType === 'teacher' ? 'معلم' : 'إداري',
            phone: '',
            signatureToken: staff.signatureToken || `${staff.staffId}-${day.date || day.day}`,
            status: staff.signatureData ? 'signed' : staff.signatureStatus === 'pending' ? 'pending' : 'none',
            sentAt: staff.signatureSentAt,
            signedAt: staff.signatureSignedAt,
          };
        })
      )
    );
  }, [dutyData.weekAssignments, weeksToRender]);

  const enrichSendRow = (row: DutySendFlatRow): DutySendDisplayRow => ({
    ...row,
    assignments: [row],
    assignmentCount: 1,
    reportDueCount: 1,
    reportSubmittedCount: reportByStaffAndDate.get(`${row.staffId}-${row.date || row.day}`)?.isSubmitted ? 1 : 0,
    dayLabel: DAY_NAMES[row.day] || row.day,
    dateLabel: formatHijriDate(row.date),
  });

  const groupRowsByStaff = (rows: DutySendFlatRow[]): DutySendDisplayRow[] => {
    const groups = new Map<string, DutySendFlatRow[]>();
    rows.forEach(row => {
      const groupKey = `${row.staffId}-${row.staffTypeKey}`;
      groups.set(groupKey, [...(groups.get(groupKey) || []), row]);
    });
    return Array.from(groups.values()).map(assignments => {
      const first = assignments[0];
      const sentAt = assignments.map(row => row.sentAt).filter(Boolean).sort().at(-1);
      const signedAt = assignments.map(row => row.signedAt).filter(Boolean).sort().at(-1);
      const reportSubmittedCount = assignments.filter(row => reportByStaffAndDate.get(`${row.staffId}-${row.date || row.day}`)?.isSubmitted).length;
      const allSigned = assignments.every(row => row.status === 'signed');
      const anyPending = assignments.some(row => row.status !== 'signed');
      return {
        ...first,
        key: `staff-${first.staffTypeKey}-${first.staffId}`,
        assignments,
        assignmentCount: assignments.length,
        reportDueCount: assignments.length,
        reportSubmittedCount,
        status: allSigned ? 'signed' : anyPending ? 'pending' : 'none',
        sentAt,
        signedAt,
        dayLabel: `${assignments.length} مناوبة`,
        dateLabel: assignments.map(row => `${DAY_NAMES[row.day] || row.day} - ${formatHijriDate(row.date)}`).join('، '),
      };
    });
  };

  const assignmentGroupedRows = useMemo(() => groupRowsByStaff(sendRows), [reportByStaffAndDate, sendRows]);
  const signedCount = assignmentGroupedRows.filter(row => row.status === 'signed').length;
  const pendingCount = assignmentGroupedRows.length - signedCount;
  const hasData = sendRows.length > 0;
  const sendWeekOptions = useMemo(() => weeksToRender.map((week, index) => ({
    value: week.weekId,
    label: week.weekName || `الأسبوع ${index + 1}`,
    searchText: `${week.weekName || ''} الأسبوع ${index + 1} ${week.startDate || ''} ${week.endDate || ''} ${formatDisplayDate(week.startDate)} ${formatDisplayDate(week.endDate)} ${formatHijriDate(week.startDate)} ${formatHijriDate(week.endDate)}`,
    disabled: week.dayAssignments.every(day => day.staffAssignments.length === 0),
  })), [weeksToRender]);
  const dayOptions = useMemo(() => {
    const activeWeekIds = new Set(selectedSendWeekIds);
    const scopedWeeks = activeWeekIds.size > 0
      ? weeksToRender.filter(week => activeWeekIds.has(week.weekId))
      : weeksToRender;
    return scopedWeeks.flatMap((week, index) => week.dayAssignments
      .filter(day => !day.isDisabled && !day.isOfficialLeave)
      .map(day => ({
        value: `${week.weekId}-${day.date || day.day}`,
        label: `${week.weekName || `الأسبوع ${index + 1}`} - ${DAY_NAMES[day.day] || day.day}${day.date ? ` - ${formatHijriDate(day.date)}` : ''}`,
        searchText: `${week.weekName || ''} الأسبوع ${index + 1} ${day.day} ${DAY_NAMES[day.day] || ''} ${day.date || ''} ${formatDisplayDate(day.date)} ${formatHijriDate(day.date)}`,
        disabled: day.staffAssignments.length === 0,
      })));
  }, [selectedSendWeekIds, weeksToRender]);
  const filteredSendRows = useMemo(() => {
    const weekSet = new Set(selectedSendWeekIds);
    const daySet = new Set(selectedSendDayKeys);
    return sendRows.filter(row =>
      (weekSet.size === 0 || weekSet.has(row.weekId)) &&
      (daySet.size === 0 || daySet.has(row.dayKey))
    );
  }, [selectedSendDayKeys, selectedSendWeekIds, sendRows]);
  const displaySendRows = useMemo<DutySendDisplayRow[]>(() => (
    sendMode === 'reminder'
      ? filteredSendRows.map(enrichSendRow)
      : groupRowsByStaff(filteredSendRows)
  ), [filteredSendRows, reportByStaffAndDate, sendMode]);
  const staffOptions = useMemo(() => {
    return displaySendRows.map(row => ({
      value: row.key,
      label: sendMode === 'reminder'
        ? `${row.staffName} - ${row.dayLabel}${row.date ? ` - ${row.dateLabel}` : ''}`
        : `${row.staffName} - ${row.assignmentCount} مناوبة`,
    }));
  }, [displaySendRows, sendMode]);
  const selectedRows = useMemo(() => {
    if (!staffSelectionTouched || selectedStaffKeys.length === 0) return [];
    const selected = new Set(selectedStaffKeys);
    return displaySendRows.filter(row => selected.has(row.key));
  }, [displaySendRows, selectedStaffKeys, staffSelectionTouched]);
  const notificationTypeLabel = sendMode === 'electronic'
    ? 'رسالة تكليف بالمناوبة مع توقيع الكتروني'
    : sendMode === 'text'
      ? 'رسالة تكليف بالمناوبة نصية'
      : 'رسالة تذكير يومية بالمناوبة';
  const selectedWeeksSummary = selectedSendWeekIds.length ? `تم اختيار ${selectedSendWeekIds.length} أسبوع` : undefined;
  const selectedDaysSummary = selectedSendDayKeys.length ? `تم اختيار ${selectedSendDayKeys.length} يوم` : undefined;
  const firstSelectedRow = selectedRows[0] || null;
  const previewRow = useMemo(() => (
    previewRowKey ? selectedRows.find(row => row.key === previewRowKey) || null : null
  ), [previewRowKey, selectedRows]);
  useEffect(() => {
    const available = new Set(displaySendRows.map(row => row.key));
    setSelectedStaffKeys(current => current.filter(key => available.has(key)));
  }, [displaySendRows]);
  useEffect(() => {
    if (staffSelectionTouched && selectedStaffKeys.length === 0) {
      setMessageText('');
      setPreviewRowKey(null);
    }
  }, [selectedStaffKeys.length, staffSelectionTouched]);
  const filteredAssignmentRows = useMemo(() => {
    const q = receiptSearch.trim();
    return groupRowsByStaff(sendRows).filter(row =>
      (receiptFilter === 'all' || (receiptFilter === 'signed' ? row.status === 'signed' : row.status !== 'signed')) &&
      (!q || row.staffName.includes(q))
    );
  }, [receiptFilter, receiptSearch, reportByStaffAndDate, sendRows]);
  const reportRows = useMemo(() => {
    return groupRowsByStaff(sendRows).map(row => ({
      ...row,
      status: row.reportSubmittedCount === row.reportDueCount ? 'submitted' as const : 'pending' as const,
      submittedAt: `${row.reportSubmittedCount} / ${row.reportDueCount}`,
      deliveryType: row.reportSubmittedCount === 0 ? '-' : row.reportSubmittedCount === row.reportDueCount ? 'مكتمل' : 'جزئي',
    }));
  }, [reportByStaffAndDate, sendRows]);
  const submittedReportCount = reportRows.filter(row => row.status === 'submitted').length;
  const pendingReportCount = reportRows.length - submittedReportCount;
  const filteredReportRows = useMemo(() => {
    const q = reportSearch.trim();
    return reportRows.filter(row =>
      (reportFilter === 'all' || row.status === reportFilter) &&
      (!q || row.staffName.includes(q))
    );
  }, [reportFilter, reportRows, reportSearch]);
  const principalName = schoolInfo.principal || (schoolInfo as any).managerName || '';
  const printNotePlaceholder = 'يبدأ العمل بهذا الجدول من يوم الأحد الموافق   /   /    ';
  const semesterName = schoolInfo.semesters?.find(semester => semester.id === schoolInfo.currentSemesterId)?.name
    || schoolInfo.semesters?.find(semester => semester.isCurrent)?.name
    || 'الفصل الدراسي الأول';
  const todayHijriLine = `${schoolInfo.schoolName || 'المدرسة'} - ${new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())} - ${semesterName}`;
  const buildSignatureLink = (row: DutySendFlatRow | DutySendDisplayRow) => {
    const base = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
    const tokens = 'assignments' in row ? row.assignments.map(item => item.signatureToken) : [row.signatureToken];
    return `${base}?dutySign=${encodeURIComponent(tokens.filter(Boolean).join(','))}`;
  };
  const buildReportLink = (row: DutySendFlatRow | DutySendDisplayRow) => {
    const base = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
    const params = new URLSearchParams({
      staffId: row.staffId,
      staffName: row.staffName,
      day: row.day,
      date: row.date || row.day,
    });
    return `${base}?${params.toString()}`;
  };
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast?.('تم نسخ الرابط', 'success');
    } catch {
      showToast?.('تعذّر نسخ الرابط', 'error');
    }
  };
  const buildDetailedMessage = (row?: typeof sendRows[number], recipientName?: string) => {
    const target = row || selectedRows[0];
    if (!target) return '';
    const displayName = recipientName || target.staffName;
    const assignments = 'assignments' in target ? target.assignments : [target];
    const firstAssignment = assignments[0];
    const dayName = DAY_NAMES[firstAssignment.day] || firstAssignment.day;
    const dateText = formatHijriDate(firstAssignment.date);
    const assignmentLines = assignments.map(item => `- ${DAY_NAMES[item.day] || item.day} الموافق ${formatHijriDate(item.date)}`).join('\n');
    const assignmentText = assignments.length > 1 ? `الأيام التالية:\n${assignmentLines}` : `يوم ${dayName} الموافق ${dateText}`;
    if (sendMode === 'electronic') {
      return `المكرم/ ${displayName}
نشعركم بإسناد مهمة المناوبة اليومية لكم في ${assignmentText} ، يرجى الدخول على الرابط المرفق والتوقيع بالعلم، شاكرين تعاونكم.
${todayHijriLine}

رابط التكليف والتوقيع:
${buildSignatureLink(target)}`;
    }
    if (sendMode === 'text') {
      return `المكرم/ ${displayName}
نشعركم بإسناد مهمة المناوبة اليومية لكم في ${assignmentText}، شاكرين تعاونكم.
${todayHijriLine}`;
    }
    return `المكرم/ ${displayName}
نذكركم بمهمة المناوبة اليومية لهذا ${dayName} الموافق ${dateText}، شاكرين تعاونكم.
${todayHijriLine}${includeReportLinkInReminder ? `

رابط تقرير المناوبة اليومي:
${buildReportLink(target)}` : ''}`;
  };

  useEffect(() => {
    if (staffSelectionTouched && selectedStaffKeys.length > 0) {
      setMessageText(buildDetailedMessage(undefined, RECIPIENT_NAME_TOKEN));
    }
  }, [sendMode, selectedRows, todayHijriLine, includeReportLinkInReminder]);

  const openPrintableHtml = (html: string, successMessage = 'تم فتح نافذة الطباعة') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast?.('تعذّر فتح نافذة الطباعة', 'error');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    showToast?.(successMessage, 'success');
  };

  const getStaffReports = (staffId: string): DutyReportRecord[] => {
    const dutyDates = new Set(
      sendRows.filter(row => row.staffId === staffId).map(row => row.date || row.day)
    );
    return dutyData.reports
      .filter(r => r.staffId === staffId && !r.manuallySubmitted && (dutyDates.size === 0 || dutyDates.has(r.date)))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  };

  const getStaffSignatureByDate = (staffId: string): Map<string, string> => {
    const map = new Map<string, string>();
    const sourceWeeks = dutyData.weekAssignments && dutyData.weekAssignments.length > 0
      ? dutyData.weekAssignments
      : weeksToRender;
    sourceWeeks.forEach(week => {
      week.dayAssignments.forEach(day => {
        const key = day.date || day.day;
        day.staffAssignments
          .filter(s => s.staffId === staffId && s.signatureData)
          .forEach(s => { map.set(key, s.signatureData!); });
      });
    });
    return map;
  };

  const getDisplayReports = (staffId: string, staffName: string): DutyReportRecord[] => {
    const realByDate = new Map<string, DutyReportRecord>();
    dutyData.reports
      .filter(r => r.staffId === staffId && r.isSubmitted && !r.manuallySubmitted)
      .forEach(r => realByDate.set(r.date, r));
    const sigByDate = getStaffSignatureByDate(staffId);

    const seen = new Set<string>();
    const result: DutyReportRecord[] = [];
    sendRows
      .filter(row => row.staffId === staffId)
      .forEach(row => {
        const key = row.date || row.day;
        if (seen.has(key)) return;
        seen.add(key);
        const real = realByDate.get(key);
        if (real) {
          result.push(real);
        } else {
          result.push({
            id: `virtual-${staffId}-${key}`,
            date: row.date || '',
            day: row.day,
            staffId,
            staffName,
            signature: sigByDate.get(key),
            lateStudents: [],
            violatingStudents: [],
            isSubmitted: false,
            status: 'present' as any,
          });
        }
      });
    return result.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  };

  const buildAssignmentFormsHtml = (rows: DutySendDisplayRow[], autoPrint = true) => `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>نموذج تكليف بالمناوبة اليومية</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Tajawal', Arial, sans-serif; color: #1e293b; }
    .form { min-height: 255mm; padding: 10mm 0; page-break-after: always; }
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
    .info-label { color: #64748b; font-weight: 800; }
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
          <div>مدرسة ${escapeHtml(schoolInfo.schoolName || '')}</div>
        </div>
        <div>${schoolInfo.logo ? `<img class="logo" src="${schoolInfo.logo}" />` : ''}</div>
        <div style="text-align:left">
          <div>العام الدراسي: ${escapeHtml((schoolInfo as any).academicYear || '')}</div>
          <div>الفصل الدراسي: ${escapeHtml(semesterName)}</div>
        </div>
      </div>
      <h1 class="title">نموذج تكليف بالمناوبة اليومية</h1>
      <div class="info-card">
        <div class="info-line"><span class="info-label">الاسم:</span><span class="info-value">${escapeHtml(row.staffName)}</span></div>
        <div class="info-line"><span class="info-label">الصفة:</span><span class="info-value">${row.staffType}</span></div>
        <div class="info-line"><span class="info-label">عدد المناوبات:</span><span class="info-value">${row.assignmentCount}</span></div>
        <div class="info-line"><span class="info-label">التوقيع:</span><span class="info-value">${row.status === 'signed' ? 'وقّع' : 'لم يوقّع'}</span></div>
      </div>
      <table class="schedule">
        <thead><tr><th>اليوم</th><th>التاريخ</th><th>المهمة</th></tr></thead>
        <tbody>
          ${row.assignments.map(item => `
            <tr>
              <td>${escapeHtml(DAY_NAMES[item.day] || item.day)}</td>
              <td>${escapeHtml(formatHijriDate(item.date))}</td>
              <td>المناوبة اليومية</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p class="ack">تم العلم والاطلاع على جدول المناوبة المسند والتوقيع بالعلم.</p>
      <div class="signature">
        ${row.assignments.find(a => (dutyData.weekAssignments || []).flatMap(w => w.dayAssignments).flatMap(d => d.staffAssignments).find(s => s.staffId === a.staffId && s.signatureData))
          ? '<span>وقّع إلكترونيًا</span>'
          : 'التوقيع'}
      </div>
    </section>
  `).join('')}
  ${autoPrint ? '<script>document.fonts.ready.then(() => window.print()); setTimeout(() => window.print(), 1200);</script>' : ''}
</body>
</html>`;

  const handlePrintAssignmentForms = (rows: DutySendDisplayRow[]) => {
    if (rows.length === 0) { showToast?.('لا توجد نماذج للطباعة', 'warning'); return; }
    openPrintableHtml(buildAssignmentFormsHtml(rows));
  };

  const handlePrintReceiptReport = (rows: DutySendDisplayRow[]) => {
    if (rows.length === 0) { showToast?.('لا توجد بيانات للطباعة', 'warning'); return; }
    openPrintableHtml(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>سجل استلام التكليف بالمناوبة</title>
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
      <div>مدرسة ${escapeHtml(schoolInfo.schoolName || '')}</div>
    </div>
    <div style="text-align:left">
      <div>العام الدراسي: ${escapeHtml((schoolInfo as any).academicYear || '')}</div>
      <div>الفصل الدراسي: ${escapeHtml(semesterName)}</div>
      <div>تاريخ الطباعة: ${formatHijriDateTime(new Date().toISOString())}</div>
    </div>
  </div>
  <h1>سجل استلام التكليف بالمناوبة</h1>
  <table>
    <thead>
      <tr>
        <th>م</th>
        <th>المناوب</th>
        <th>الصفة</th>
        <th>عدد المناوبات</th>
        <th>الأيام والتواريخ</th>
        <th>تاريخ الإرسال</th>
        <th>التوقيع</th>
        <th>تاريخ التوقيع</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.staffName)}</td>
          <td>${escapeHtml(row.staffType)}</td>
          <td>${row.assignmentCount}</td>
          <td>${escapeHtml(row.dateLabel)}</td>
          <td>${formatHijriDateTime(row.sentAt)}</td>
          <td class="${row.status === 'signed' ? 'signed' : 'pending'}">${row.status === 'signed' ? 'وقّع' : 'لم يوقّع'}</td>
          <td>${formatHijriDateTime(row.signedAt)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <script>document.fonts.ready.then(() => window.print()); setTimeout(() => window.print(), 1200);</script>
</body>
</html>`);
  };

  // Builds one canonical "تقرير المناوبة اليومية" page populated from a real or virtual report.
  const buildSingleReportHtml = (report: DutyReportRecord) => {
    const padRows = (rows: string[], minRows: number, columns: number, startIndex = 0) => {
      const out = [...rows];
      while (out.length < minRows) {
        const i = startIndex + out.length + 1;
        out.push(`<tr><td>${i}</td>${'<td></td>'.repeat(columns - 1)}</tr>`);
      }
      return out.join('');
    };
    const staffRowHtml = `<tr>
      <td>1</td>
      <td>${escapeHtml(report.staffName)}</td>
      <td>${report.signature ? `<img src="${report.signature}" alt="توقيع" style="max-height:36px;max-width:120px;object-fit:contain;" />` : ''}</td>
      <td></td>
    </tr>`;
    const lateData = report.lateStudents.map((s, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(s.studentName)}</td>
      <td>${escapeHtml(s.gradeAndClass)}</td>
      <td>${escapeHtml(s.exitTime)}</td>
      <td>${escapeHtml(s.actionTaken)}</td>
      <td>${escapeHtml(s.notes || '')}</td>
    </tr>`);
    const violationData = report.violatingStudents.map((s, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(s.studentName)}</td>
      <td>${escapeHtml(s.gradeAndClass)}</td>
      <td>${escapeHtml(s.violationType)}</td>
      <td>${escapeHtml(s.actionTaken)}</td>
      <td>${escapeHtml(s.notes || '')}</td>
    </tr>`);
    const dayLabel = escapeHtml(DAY_NAMES[report.day] || report.day || '');
    const dateLabel = escapeHtml(formatHijriDate(report.date));
    return `
  <main class="page">
    ${buildOfficialHeader('')}
    <div class="report-title">تقرير المناوبة اليومية</div>
    <div class="meta">
      <div class="field"><span>اليوم:</span><b>${dayLabel}</b></div>
      <div class="field"><span>التاريخ:</span><b>${dateLabel}</b></div>
    </div>

    <div class="section-title">أولاً: المناوبون</div>
    <table>
      <thead>
        <tr>
          <th style="width:8%">م</th>
          <th style="width:34%">المناوب</th>
          <th style="width:24%">التوقيع</th>
          <th style="width:34%">ملاحظات</th>
        </tr>
      </thead>
      <tbody>${staffRowHtml}</tbody>
    </table>

    <div class="section-title">ثانيًا: الطلاب المتأخرون</div>
    <table>
      <thead>
        <tr>
          <th style="width:7%">م</th>
          <th style="width:24%">اسم الطالب</th>
          <th style="width:16%">الصف / الفصل</th>
          <th style="width:15%">زمن الانصراف</th>
          <th style="width:18%">الإجراء</th>
          <th style="width:20%">ملاحظات</th>
        </tr>
      </thead>
      <tbody>${padRows(lateData, Math.max(7, lateData.length), 6)}</tbody>
    </table>

    <div class="section-title">ثالثًا: الطلاب المخالفون سلوكيًا</div>
    <table>
      <thead>
        <tr>
          <th style="width:7%">م</th>
          <th style="width:24%">اسم الطالب</th>
          <th style="width:16%">الصف / الفصل</th>
          <th style="width:20%">نوع المخالفة</th>
          <th style="width:16%">الإجراء</th>
          <th style="width:17%">ملاحظات</th>
        </tr>
      </thead>
      <tbody>${padRows(violationData, Math.max(7, violationData.length), 6)}</tbody>
    </table>

    <div class="notice"><span class="notice-icon">!</span><span>يُسلَّم هذا النموذج في اليوم التالي لوكيل المدرسة</span></div>

    <div class="signatures-row">
      <div class="agent-field"><span>وكيل المدرسة:</span><b></b></div>
      <div class="signature-area">
        <div class="signature-box">
          <div class="signature-name"><span>مدير المدرسة:</span> <b>${escapeHtml(principalName)}</b></div>
          <div class="signature-line">التوقيع</div>
        </div>
      </div>
    </div>
  </main>`;
  };

  const wrapReportHtml = (innerSections: string, autoPrint = true) => `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>تقارير المناوبة اليومية</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Tajawal', Arial, sans-serif; color: #1e293b; background: #fff; }
    .page { max-width: 184mm; margin: 0 auto; padding: 8px 0 0; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .official-header { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: start; gap: 10px; border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 7px; }
    .header-side { font-size: 9.5px; font-weight: 800; line-height: 1.45; color: #1e293b; }
    .header-left { text-align: left; }
    .header-center { text-align: center; }
    .school-logo { width: 44px; height: 44px; object-fit: contain; margin-bottom: 3px; }
    .logo-placeholder { width: 44px; height: 44px; margin: 0 auto 3px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 9px; font-weight: 900; }
    h1 { margin: 0; font-size: 18px; font-weight: 900; color: #111827; }
    .report-title { text-align: center; font-size: 18px; font-weight: 900; margin: 6px 0 8px; color: #111827; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 auto 8px; max-width: 132mm; }
    .field { border: 1px solid #cbd5e1; border-radius: 10px; padding: 6px 9px; min-height: 30px; font-size: 11px; font-weight: 900; }
    .field span { color: #64748b; margin-left: 6px; }
    .section-title { margin: 8px 0 4px; color: #655ac1; font-size: 12px; font-weight: 900; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9.5px; margin-bottom: 7px; }
    th, td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: center; height: 23px; vertical-align: middle; }
    th { background: #a59bf0; color: #fff; font-weight: 900; }
    .notice { display: inline-flex; align-items: center; gap: 8px; margin-top: 4px; padding: 7px 0; color: #111827; background: #fff; font-size: 11px; font-weight: 900; }
    .notice-icon { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid #111827; color: #111827; background: transparent; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; line-height: 1; }
    .signatures-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-top: 8px; }
    .agent-field { width: 250px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 6px 9px; min-height: 30px; font-size: 11px; font-weight: 900; }
    .agent-field span { color: #64748b; margin-left: 6px; }
    .signature-area { display: flex; justify-content: flex-end; }
    .signature-box { width: 280px; border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px 12px; background: #fff; }
    .signature-name { font-size: 12px; font-weight: 900; margin-bottom: 20px; }
    .signature-name span { color: #64748b; }
    .signature-line { border-top: 1px solid #94a3b8; padding-top: 6px; min-height: 30px; font-size: 11px; font-weight: 900; color: #475569; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 0; }
      th { background: #a59bf0 !important; color: #fff !important; }
    }
  </style>
</head>
<body>
  ${innerSections}
  ${autoPrint ? '<script>document.fonts.ready.then(() => window.print()); setTimeout(() => window.print(), 1200);</script>' : ''}
</body>
</html>`;

  const handlePrintSingleReport = (report: DutyReportRecord) => {
    openPrintableHtml(wrapReportHtml(buildSingleReportHtml(report)));
  };

  const handlePrintReportsForStaff = (reports: DutyReportRecord[]) => {
    if (reports.length === 0) { showToast?.('لا توجد تقارير للطباعة', 'warning'); return; }
    openPrintableHtml(wrapReportHtml(reports.map(r => buildSingleReportHtml(r)).join('')));
  };

  const handlePrintAllReports = () => {
    const all = dutyData.reports.filter(r => r.isSubmitted && !r.manuallySubmitted);
    if (all.length === 0) { showToast?.('لا توجد تقارير مسلّمة للطباعة', 'warning'); return; }
    openPrintableHtml(wrapReportHtml(all.map(r => buildSingleReportHtml(r)).join('')));
  };

  const buildOfficialHeader = (title: string) => `
    <div class="official-header">
      <div class="header-side header-right">
        <p>المملكة العربية السعودية</p>
        <p>وزارة التعليم</p>
        <p>${escapeHtml(schoolInfo.educationAdministration || schoolInfo.region || 'إدارة التعليم')}</p>
        <p>مدرسة ${escapeHtml(schoolInfo.schoolName || '........................')}</p>
      </div>
      <div class="header-center">
        ${schoolInfo.logo
          ? `<img class="school-logo" src="${schoolInfo.logo}" alt="شعار المدرسة" />`
          : '<div class="logo-placeholder">شعار</div>'}
        ${title ? `<h1>${escapeHtml(title)}</h1>` : ''}
      </div>
      <div class="header-side header-left">
        <p>العام الدراسي: ${escapeHtml((schoolInfo as any).academicYear || '')}</p>
        <p>تاريخ الطباعة: ${new Intl.DateTimeFormat('ar-SA-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}</p>
      </div>
    </div>
  `;

  const renderScheduleStaffCell = (day: DutyDayAssignment) => {
    if (day.isOfficialLeave) return `<span class="empty-state">${escapeHtml(day.officialLeaveText || 'إجازة رسمية')}</span>`;
    if (day.isRemoteWork) return '<span class="empty-state">عمل عن بعد</span>';
    if (day.isDisabled) return '<span class="empty-state">يوم غير مفعل</span>';
    if (day.staffAssignments.length === 0) return '<span class="empty-state">لا يوجد مناوب</span>';
    return day.staffAssignments.map(staff => `
      <div class="staff-card">
        <div class="staff-name">${escapeHtml(staff.staffName)}</div>
        <div class="staff-type">${staff.staffType === 'teacher' ? 'معلم' : 'إداري'}</div>
      </div>
    `).join('');
  };

  const renderScheduleSignatureCell = (day: DutyDayAssignment, useElectronic = false) => {
    if (day.staffAssignments.length === 0) return '<span class="empty-state">-</span>';
    return day.staffAssignments.map(sa => {
      if (useElectronic && sa.signatureData) {
        return `<div class="signature-img-wrap"><img class="signature-img" src="${sa.signatureData}" alt="توقيع" /></div>`;
      }
      return '<div class="signature-line"></div>';
    }).join('');
  };

  const handlePrintSchedule = (opts: { electronicSignatures?: boolean } = {}) => {
    const useElectronic = !!opts.electronicSignatures;
    if (!hasData) {
      showToast?.('لا توجد بيانات مناوبة للطباعة', 'warning');
      return;
    }
    if (schedulePrintScope === 'selectedWeeks' && selectedWeeks.length === 0) {
      showToast?.('اختر أسبوعًا واحدًا على الأقل لطباعة جدول المناوبة', 'warning');
      return;
    }
    const includeSignature = useElectronic ? true : printSignatureMode === 'with';
    const isBW = printColorMode === 'bw';
    const finalFooter = showNotesField ? footerText.trim() : '';
    const printableWeeks = selectedWeeks;

    openPrintableHtml(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>جدول المناوبة اليومية</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
    @page { size: ${paperSize} landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Tajawal', Arial, sans-serif; color: #1e293b; background: #fff; ${isBW ? 'filter: grayscale(100%);' : ''} }
    .page { padding: 0; }
    .official-header { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: start; gap: 12px; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 14px; }
    .header-side { font-size: 12px; font-weight: 800; line-height: 1.8; color: #1e293b; }
    .header-left { text-align: left; }
    .header-center { text-align: center; }
    .school-logo { width: 58px; height: 58px; object-fit: contain; margin-bottom: 6px; }
    .logo-placeholder { width: 58px; height: 58px; margin: 0 auto 6px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px; font-weight: 900; }
    h1 { margin: 0; font-size: 19px; font-weight: 900; color: #111827; }
    .weeks-grid { display: block; }
    .week-card { border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; }
    .week-title { background: #fff; border-bottom: 1px solid #f1f5f9; padding: 12px 16px; color: #655ac1; font-size: 15px; font-weight: 900; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
    th { background: ${isBW ? '#e2e8f0' : '#a59bf0'}; color: ${isBW ? '#1e293b' : '#fff'}; font-weight: 900; padding: 10px 8px; border-left: 1px solid ${isBW ? '#cbd5e1' : 'rgba(255,255,255,0.45)'}; text-align: center; }
    td { border-left: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 10px; vertical-align: middle; }
    th:last-child, td:last-child { border-left: 0; }
    tbody tr:last-child td { border-bottom: 0; }
    tbody tr:hover td, tbody tr:nth-child(even) td { background: ${isBW ? '#fff' : '#f8fafc'}; }
    .day-cell { text-align: center; font-weight: 900; color: #111827; font-size: 13px; }
    .date-cell { text-align: center; font-weight: 800; color: #475569; }
    .staff-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px 10px; margin-bottom: 6px; background: #fff; }
    .staff-card:last-child { margin-bottom: 0; }
    .staff-name { font-size: 12px; font-weight: 900; color: #1e293b; }
    .staff-type { margin-top: 2px; font-size: 10px; font-weight: 800; color: #64748b; }
    .signature-line { height: 36px; border-bottom: 1px dotted #64748b; margin-bottom: 8px; }
    .signature-line:last-child { margin-bottom: 0; }
    .signature-img-wrap { height: 36px; display: flex; align-items: center; justify-content: center; border-bottom: 1px dotted #64748b; margin-bottom: 8px; }
    .signature-img-wrap:last-child { margin-bottom: 0; }
    .signature-img { max-height: 32px; max-width: 100%; object-fit: contain; }
    .empty-state { display: block; text-align: center; color: #94a3b8; font-weight: 800; }
    .footer-note { margin-top: 12px; border: 1px dashed #94a3b8; border-radius: 14px; padding: 12px 14px; font-size: 12px; font-weight: 800; color: #475569; white-space: pre-wrap; }
    .principal { margin-top: 24px; width: 280px; margin-right: auto; font-size: 13px; font-weight: 900; color: #1e293b; }
    .principal-sign { margin-top: 26px; border-top: 1px dotted #64748b; padding-top: 6px; color: #475569; }
    .compact .official-header { padding-bottom: 8px; margin-bottom: 8px; }
    .compact .header-side { font-size: 9px; line-height: 1.45; }
    .compact .school-logo, .compact .logo-placeholder { width: 44px; height: 44px; margin-bottom: 3px; }
    .compact h1 { font-size: 15px; }
    .compact .weeks-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; align-items: start; }
    .compact .week-card { border-radius: 14px; margin-bottom: 0; }
    .compact .week-title { padding: 6px 8px; font-size: 11px; }
    .compact table { font-size: 8px; }
    .compact th { padding: 5px 4px; }
    .compact td { padding: 5px; }
    .compact .day-cell { font-size: 9px; }
    .compact .date-cell { font-size: 8px; }
    .compact .staff-card { padding: 4px 5px; border-radius: 8px; margin-bottom: 3px; }
    .compact .staff-name { font-size: 8.5px; }
    .compact .staff-type { font-size: 7px; }
    .compact .signature-line { height: 18px; margin-bottom: 4px; }
    .compact .footer-note { grid-column: 1 / -1; font-size: 9px; padding: 8px; margin-top: 0; }
    .compact .principal { grid-column: 1 / -1; margin-top: 8px; font-size: 10px; width: 230px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      th { background: ${isBW ? '#e2e8f0' : '#a59bf0'} !important; color: ${isBW ? '#1e293b' : '#fff'} !important; }
    }
  </style>
</head>
<body>
  <main class="page ${schedulePrintScope === 'all' ? 'compact' : ''}">
    ${buildOfficialHeader('جدول المناوبة اليومية')}
    <div class="weeks-grid">
    ${printableWeeks.map((week, index) => `
      <section class="week-card">
        <div class="week-title">${escapeHtml(week.weekName || `الأسبوع ${index + 1}`)}</div>
        <table>
          <thead>
            <tr>
              <th style="width:16%">اليوم</th>
              <th style="width:18%">التاريخ</th>
              <th style="width:${includeSignature ? '48%' : '66%'}">المناوب</th>
              ${includeSignature ? '<th style="width:18%">التوقيع</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${week.dayAssignments.map(day => `
              <tr>
                <td class="day-cell">${escapeHtml(DAY_NAMES[day.day] || day.day)}</td>
                <td class="date-cell">${escapeHtml(formatDisplayDate(day.date))}</td>
                <td>${renderScheduleStaffCell(day)}</td>
                ${includeSignature ? `<td>${renderScheduleSignatureCell(day, useElectronic)}</td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    `).join('')}
    </div>
    ${finalFooter ? `<div class="footer-note">${escapeHtml(finalFooter)}</div>` : ''}
    <div class="principal">
      <div>اسم مدير المدرسة: ${escapeHtml(principalName || '............................')}</div>
      <div class="principal-sign">التوقيع</div>
    </div>
  </main>
  <script>document.fonts.ready.then(() => window.print()); setTimeout(() => window.print(), 1200);</script>
</body>
</html>`);
  };

  const dutyReportStaffRows = (count: number) => Array.from({ length: count }).map((_, index) => `
    <tr>
      <td>${index + 1}</td>
      <td contenteditable="true"></td>
      <td></td>
      <td></td>
    </tr>
  `).join('');

  const blankPrintRows = (count: number, columns: number) => Array.from({ length: count }).map((_, index) => `
    <tr>
      <td>${index + 1}</td>
      ${Array.from({ length: columns - 1 }).map(() => '<td></td>').join('')}
    </tr>
  `).join('');

  const handlePrintDailyReport = () => {
    const staffRows = Math.max(1, Math.min(4, Number(reportDutyRowsCount) || 1));
    openPrintableHtml(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>تقرير المناوبة اليومية</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Tajawal', Arial, sans-serif; color: #1e293b; background: #fff; ${printColorMode === 'bw' ? 'filter: grayscale(100%);' : ''} }
    .page { max-width: 184mm; margin: 0 auto; padding: 8px 0 0; }
    .official-header { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: start; gap: 10px; border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 7px; }
    .header-side { font-size: 9.5px; font-weight: 800; line-height: 1.45; color: #1e293b; }
    .header-left { text-align: left; }
    .header-center { text-align: center; }
    .school-logo { width: 44px; height: 44px; object-fit: contain; margin-bottom: 3px; }
    .logo-placeholder { width: 44px; height: 44px; margin: 0 auto 3px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 9px; font-weight: 900; }
    h1 { margin: 0; font-size: 18px; font-weight: 900; color: #111827; }
    .report-title { text-align: center; font-size: 18px; font-weight: 900; margin: 6px 0 8px; color: #111827; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 auto 8px; max-width: 132mm; }
    .field { border: 1px solid #cbd5e1; border-radius: 10px; padding: 6px 9px; min-height: 30px; font-size: 11px; font-weight: 900; }
    .field span { color: #64748b; margin-left: 6px; }
    .section-title { margin: 8px 0 4px; color: #655ac1; font-size: 12px; font-weight: 900; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9.5px; margin-bottom: 7px; }
    th, td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: center; height: 23px; vertical-align: middle; }
    th { background: ${printColorMode === 'bw' ? '#e2e8f0' : '#a59bf0'}; color: ${printColorMode === 'bw' ? '#1e293b' : '#fff'}; font-weight: 900; }
    td[contenteditable="true"] { outline: none; }
    .notice { display: inline-flex; align-items: center; gap: 8px; margin-top: 4px; padding: 7px 0; color: #111827; background: #fff; font-size: 11px; font-weight: 900; }
    .notice-icon { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid #111827; color: #111827; background: transparent; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; line-height: 1; }
    .signatures-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-top: 8px; }
    .agent-field { width: 250px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 6px 9px; min-height: 30px; font-size: 11px; font-weight: 900; }
    .agent-field span { color: #64748b; margin-left: 6px; }
    .signature-area { display: flex; justify-content: flex-end; }
    .signature-box { width: 280px; border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px 12px; background: #fff; }
    .signature-name { font-size: 12px; font-weight: 900; margin-bottom: 20px; }
    .signature-name span { color: #64748b; }
    .signature-line { border-top: 1px solid #94a3b8; padding-top: 6px; min-height: 30px; font-size: 11px; font-weight: 900; color: #475569; }
    .print-actions { display: flex; justify-content: flex-end; gap: 8px; max-width: 184mm; margin: 10px auto 8px; }
    .print-actions button { border: 0; border-radius: 12px; background: #655ac1; color: #fff; font: 900 12px Tajawal, Arial; padding: 9px 18px; cursor: pointer; box-shadow: 0 10px 24px rgba(101,90,193,0.18); }
    .print-actions .close-button { background: #fff; color: #475569; border: 1px solid #cbd5e1; box-shadow: none; }
    @media print {
      .print-actions { display: none; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 0; }
      th { background: ${printColorMode === 'bw' ? '#e2e8f0' : '#a59bf0'} !important; color: ${printColorMode === 'bw' ? '#1e293b' : '#fff'} !important; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button onclick="window.print()">طباعة تقرير المناوبة</button>
    <button class="close-button" onclick="window.close()">إغلاق</button>
  </div>
  <main class="page">
    ${buildOfficialHeader('')}
    <div class="report-title">تقرير المناوبة اليومية</div>
    <div class="meta">
      <div class="field"><span>اليوم:</span><b contenteditable="true"></b></div>
      <div class="field"><span>التاريخ:</span><b contenteditable="true">        /        /        </b></div>
    </div>

    <div class="section-title">أولاً: المناوبون</div>
    <table>
      <thead>
        <tr>
          <th style="width:8%">م</th>
          <th style="width:34%">المناوب</th>
          <th style="width:24%">التوقيع</th>
          <th style="width:34%">ملاحظات</th>
        </tr>
      </thead>
      <tbody>${dutyReportStaffRows(staffRows)}</tbody>
    </table>

    <div class="section-title">ثانيًا: الطلاب المتأخرون</div>
    <table>
      <thead>
        <tr>
          <th style="width:7%">م</th>
          <th style="width:24%">اسم الطالب</th>
          <th style="width:16%">الصف / الفصل</th>
          <th style="width:15%">زمن الانصراف</th>
          <th style="width:18%">الإجراء</th>
          <th style="width:20%">ملاحظات</th>
        </tr>
      </thead>
      <tbody>${blankPrintRows(7, 6)}</tbody>
    </table>

    <div class="section-title">ثالثًا: الطلاب المخالفون سلوكيًا</div>
    <table>
      <thead>
        <tr>
          <th style="width:7%">م</th>
          <th style="width:24%">اسم الطالب</th>
          <th style="width:16%">الصف / الفصل</th>
          <th style="width:20%">نوع المخالفة</th>
          <th style="width:16%">الإجراء</th>
          <th style="width:17%">ملاحظات</th>
        </tr>
      </thead>
      <tbody>${blankPrintRows(7, 6)}</tbody>
    </table>

    <div class="notice"><span class="notice-icon">!</span><span>يُسلَّم هذا النموذج في اليوم التالي لوكيل المدرسة</span></div>

    <div class="signatures-row">
      <div class="agent-field"><span>وكيل المدرسة:</span><b contenteditable="true"></b></div>
      <div class="signature-area">
        <div class="signature-box">
          <div class="signature-name"><span>مدير المدرسة:</span> <b contenteditable="true">${escapeHtml(principalName)}</b></div>
          <div class="signature-line">التوقيع</div>
        </div>
      </div>
    </div>
  </main>
</body>
</html>`, 'تم فتح تقرير المناوبة للتعبئة والطباعة');
  };

  // ─── Assignment receipt log inline page ──────────────────────────────
  if (receiptOpen) {
    return (
      <div className="space-y-5" dir="rtl">
        {/* Header */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setReceiptOpen(false)} title="رجوع"
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-slate-50 transition-all">
              <ArrowRight size={18} />
            </button>
            <div>
              <h2 className="font-black text-slate-800 text-lg">سجل استلام التكليف بالمناوبة</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {signedCount} وقّع من أصل {assignmentGroupedRows.length} مناوب
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'إجمالي المناوبين', value: String(assignmentGroupedRows.length), icon: Users },
            { label: 'وقّع', value: String(signedCount), icon: CheckCircle2 },
            { label: 'لم يُوقّع', value: String(pendingCount), icon: AlertCircle },
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
            <button type="button" onClick={() => { setReceiptSearch(''); setReceiptFilter('all'); refreshDutyDataFromStorage(); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all">
              <RefreshCw size={15} />
              تحديث
            </button>
            <button type="button" onClick={() => handlePrintReceiptReport(filteredAssignmentRows)} disabled={assignmentGroupedRows.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50">
              <Printer size={15} />
              طباعة سجل الاستلام الالكتروني
            </button>
            <button type="button" onClick={() => handlePrintAssignmentForms(filteredAssignmentRows)} disabled={assignmentGroupedRows.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50">
              <Printer size={15} />
              طباعة نماذج التكليف الالكترونية
            </button>
            <button type="button" onClick={() => handlePrintSchedule({ electronicSignatures: true })} disabled={!hasData}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50">
              <Printer size={15} />
              طباعة جدول المناوبة الالكتروني
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
              <input type="text" value={receiptSearch} onChange={e => setReceiptSearch(e.target.value)}
                placeholder="ابحث عن مناوب..."
                className="w-full pr-8 pl-7 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#655ac1] focus:bg-white transition-all"
                dir="rtl" />
              {receiptSearch && (
                <button type="button" onClick={() => setReceiptSearch('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'signed', 'pending'] as const).map(f => (
                <button key={f} type="button" onClick={() => setReceiptFilter(f)}
                  className={`px-4 py-2 rounded-xl border text-xs font-black transition-all ${
                    receiptFilter === f
                      ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1]'
                  }`}>
                  {f === 'all' ? 'الكل' : f === 'signed' ? 'وقّع' : 'لم يوقّع'}
                </button>
              ))}
            </div>
          </div>

          {assignmentGroupedRows.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="mx-auto mb-4 text-slate-300" size={40} />
              <p className="text-sm font-bold text-slate-400">لا توجد طلبات استلام مرسلة بعد.</p>
              <p className="text-xs text-slate-400 mt-1">أرسل تكليف المناوبة إلكترونيًا ليظهر هنا سجل الاستلام.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-right" dir="rtl">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] w-[4%]">م</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] w-[16%]">المناوب</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] w-[7%]">الصفة</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] text-center w-[8%]">عدد المناوبات</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] w-[20%]">الأيام والتواريخ</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] w-[13%]">تاريخ الإرسال</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] w-[9%]">التوقيع</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] w-[13%]">تاريخ التوقيع</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] text-center w-[10%]">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssignmentRows.map((row, idx) => (
                    <tr key={row.key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 text-slate-400 text-xs font-bold">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-2 py-3 font-black text-slate-800 text-[12px] truncate" title={row.staffName}>{row.staffName}</td>
                      <td className="px-2 py-3 text-slate-500 text-[11px] truncate">{row.staffType}</td>
                      <td className="px-2 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border-[1.5px] border-slate-300 bg-transparent text-[#655ac1] text-[12px] font-black">
                          {row.assignmentCount}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-slate-500 text-[11px]" title={row.dateLabel}>
                        <div className="space-y-1">
                          {row.assignments.map(item => (
                            <div key={`${row.key}-${item.key}`} className="leading-tight">
                              <span className="font-black text-slate-700">{DAY_NAMES[item.day] || item.day}</span>
                              <span className="mx-1 text-slate-300">-</span>
                              <span className="font-bold text-slate-500">{formatHijriDate(item.date)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-slate-500 text-[10px] leading-snug break-words" title={formatHijriDateTime(row.sentAt)}>{formatHijriDateTime(row.sentAt)}</td>
                      <td className="px-2 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border ${
                          row.status === 'signed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {row.status === 'signed' ? 'وقّع' : 'لم يوقّع'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-slate-500 text-[10px] leading-snug break-words" title={formatHijriDateTime(row.signedAt)}>{formatHijriDateTime(row.signedAt)}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => setPreviewAssignmentRow(row)} title="عرض وطباعة النموذج"
                            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all whitespace-nowrap shrink-0">
                            <Eye size={14} />
                            عرض وطباعة
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAssignmentRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-10 text-center text-sm font-medium text-slate-400">
                        لا توجد نتائج تطابق الفلتر.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {previewAssignmentRow && createPortal(
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm" dir="rtl">
            <div className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-[2rem] bg-white border border-slate-200 shadow-2xl flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Eye size={22} className="text-[#655ac1] shrink-0" />
                  <h3 className="font-black text-slate-800">معاينة التكليف الإلكتروني</h3>
                </div>
                <button type="button" onClick={() => setPreviewAssignmentRow(null)}
                  className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto p-6 space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-start gap-2 border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-bold shrink-0">الاسم:</span>
                      <span className="font-black text-slate-800">{previewAssignmentRow.staffName}</span>
                    </div>
                    <div className="flex items-center justify-start gap-2 border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-bold shrink-0">الصفة:</span>
                      <span className="font-black text-[#655ac1]">{previewAssignmentRow.staffType}</span>
                    </div>
                    <div className="flex items-center justify-start gap-2 border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-bold shrink-0">عدد المناوبات:</span>
                      <span className="font-black text-slate-800">{previewAssignmentRow.assignmentCount}</span>
                    </div>
                    <div className="flex items-center justify-start gap-2">
                      <span className="text-slate-500 font-bold shrink-0">التوقيع:</span>
                      <span className="font-black text-slate-800">{previewAssignmentRow.status === 'signed' ? 'وقّع' : 'لم يوقّع'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white border-b border-slate-100">
                        <th className="px-3 py-2 text-right text-[#655ac1] font-black">اليوم</th>
                        <th className="px-3 py-2 text-right text-[#655ac1] font-black">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewAssignmentRow.assignments.map((item, index) => (
                        <tr key={`${previewAssignmentRow.key}-${item.day}-${index}`} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-black text-slate-700">{DAY_NAMES[item.day] || item.day}</td>
                          <td className="px-3 py-2 font-bold text-slate-600">{formatHijriDate(item.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-sm font-black text-slate-700">
                  تم العلم والاطلاع على جدول المناوبة المسند والتوقيع بالعلم.
                </p>
                <div className="rounded-2xl border-2 border-dashed border-[#655ac1]/30 bg-slate-50 h-32 flex items-center justify-center text-xs font-bold text-slate-300">
                  {previewAssignmentRow.status === 'signed' ? 'وقّع إلكترونيًا' : 'التوقيع'}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => handlePrintAssignmentForms([previewAssignmentRow])}
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

  // ─── Daily duty report receipt log inline page ───────────────────────
  if (reportReceiptOpen) {
    return (
      <div className="space-y-5" dir="rtl">
        {/* Header */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setReportReceiptOpen(false)} title="رجوع"
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-slate-50 transition-all">
              <ArrowRight size={18} />
            </button>
            <div>
              <h2 className="font-black text-slate-800 text-lg">سجل استلام تقرير المناوبة اليومية</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {submittedReportCount} مناوب سلّم تقاريره من أصل {reportRows.length}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'إجمالي المناوبين', value: String(reportRows.length), icon: Users },
            { label: 'سلّم التقرير', value: String(submittedReportCount), icon: CheckCircle2 },
            { label: 'لم يُسلّم التقرير', value: String(pendingReportCount), icon: AlertCircle },
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
            <button type="button" onClick={() => { setReportSearch(''); setReportFilter('all'); refreshDutyDataFromStorage(); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all">
              <RefreshCw size={15} />
              تحديث
            </button>
            <button type="button" onClick={handlePrintAllReports}
              disabled={dutyData.reports.filter(r => r.isSubmitted && !r.manuallySubmitted).length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50">
              <Printer size={15} />
              طباعة كل التقارير المسلّمة
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden"
          style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="px-6 py-4 border-b border-slate-100 bg-white flex flex-wrap items-center gap-3">
            <p className="text-sm font-black text-slate-800 flex items-center gap-2">
              <ClipboardList size={18} className="text-[#655ac1]" />
              سجل تسليم التقارير
            </p>
            <div className="flex-1" />
            <div className="relative w-56">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" value={reportSearch} onChange={e => setReportSearch(e.target.value)}
                placeholder="ابحث عن مناوب..."
                className="w-full pr-8 pl-7 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#655ac1] focus:bg-white transition-all"
                dir="rtl" />
              {reportSearch && (
                <button type="button" onClick={() => setReportSearch('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'submitted', 'pending'] as const).map(f => (
                <button key={f} type="button" onClick={() => setReportFilter(f)}
                  className={`px-4 py-2 rounded-xl border text-xs font-black transition-all ${
                    reportFilter === f
                      ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1]'
                  }`}>
                  {f === 'all' ? 'الكل' : f === 'submitted' ? 'سلّم التقرير' : 'لم يسلّم التقرير'}
                </button>
              ))}
            </div>
          </div>

          {reportRows.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="mx-auto mb-4 text-slate-300" size={40} />
              <p className="text-sm font-bold text-slate-400">لا توجد تقارير مناوبة مسجلة بعد.</p>
              <p className="text-xs text-slate-400 mt-1">سيظهر هنا تسليم تقرير المناوبة اليومي لكل مناوب.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] table-fixed text-right whitespace-nowrap" dir="rtl">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] w-[5%]">م</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] w-[20%]">المناوب</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] w-[8%]">الصفة</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] text-center w-[10%]">عدد المناوبات</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] text-center w-[12%]">التقارير المسلّمة</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] text-center w-[18%]">الحالة</th>
                    <th className="px-4 py-3 font-black text-[#655ac1] text-[13px] text-center w-[20%]">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReportRows.map((row, idx) => {
                    return (
                      <tr key={row.key} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 text-slate-400 text-xs font-bold">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-black text-slate-800 text-[12px] truncate" title={row.staffName}>{row.staffName}</td>
                        <td className="px-3 py-3 text-slate-500 text-[11px] truncate">{row.staffType}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border-[1.5px] border-slate-300 bg-transparent text-[#655ac1] text-[12px] font-black">
                            {row.assignmentCount}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-slate-600 text-[12px] font-bold">{row.reportSubmittedCount} / {row.reportDueCount}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border ${
                            row.status === 'submitted'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {row.status === 'submitted' ? 'سلّم التقرير' : 'لم يسلّم التقرير'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center min-w-[120px]">
                            <button type="button" onClick={() => setPreviewReportStaff({ staffId: row.staffId, staffName: row.staffName, staffType: row.staffType })}
                              title="عرض التقارير وطباعتها"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all whitespace-nowrap">
                              <Eye size={14} />
                              عرض وطباعة
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredReportRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-sm font-medium text-slate-400">
                        لا توجد نتائج تطابق الفلتر.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reports list modal for a staff */}
        {previewReportStaff && createPortal(
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm" dir="rtl">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-white border border-slate-200 shadow-2xl flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={22} className="text-[#655ac1] shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-800 truncate">تقارير المناوب: {previewReportStaff.staffName}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{previewReportStaff.staffType}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setPreviewReportStaff(null)}
                  className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto p-5 space-y-3">
                {(() => {
                  const reports = getDisplayReports(previewReportStaff.staffId, previewReportStaff.staffName);
                  if (reports.length === 0) {
                    return (
                      <div className="py-10 text-center">
                        <FileText className="mx-auto mb-3 text-slate-300" size={36} />
                        <p className="text-sm font-bold text-slate-400">لا توجد مناوبات مسجلة لهذا المناوب.</p>
                      </div>
                    );
                  }
                  const submittedCount = reports.filter(r => r.isSubmitted).length;
                  return (
                    <>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-xs font-black text-slate-500">{submittedCount} تقرير مسلّم من أصل {reports.length}</p>
                        <button type="button" onClick={() => handlePrintReportsForStaff(reports)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all">
                          <Printer size={14} />
                          طباعة التقارير
                        </button>
                      </div>
                      {reports.map(report => (
                        <div key={report.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="min-w-0 flex items-center gap-3">
                              <div className="rounded-xl border border-slate-300 px-3 py-2 flex flex-col items-center justify-center min-w-[110px] shrink-0">
                                <p className="font-black text-[#655ac1] text-sm leading-tight">{DAY_NAMES[report.day] || report.day}</p>
                                <p className="font-black text-[#655ac1] text-[12px] mt-0.5 leading-tight">{formatHijriDate(report.date)}</p>
                              </div>
                              <div className="min-w-0">
                                {report.isSubmitted ? (
                                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-black">
                                    <CheckCircle2 size={14} />
                                    سلّم التقرير
                                    <span className="text-emerald-600/80 font-bold">• {formatHijriDateTime(report.submittedAt)}</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-black">
                                    <AlertCircle size={14} />
                                    لم يُسلّم التقرير بعد
                                  </div>
                                )}
                                {report.isSubmitted && (
                                  <p className="text-[11px] text-slate-500 font-bold mt-1.5">
                                    متأخرون: {report.lateStudents.length} • مخالفات: {report.violatingStudents.length}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button type="button" onClick={() => setPreviewReportRecord(report)} title="عرض وطباعة التقرير"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all">
                                <Eye size={14} />
                                عرض وطباعة
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0 flex justify-end">
                <button type="button" onClick={() => setPreviewReportStaff(null)}
                  className="px-6 py-2.5 text-sm text-slate-600 font-bold bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors">
                  إغلاق
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Single report preview modal */}
        {previewReportRecord && createPortal(
          <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm" dir="rtl">
            <div className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-[2rem] bg-white border border-slate-200 shadow-2xl flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={22} className="text-[#655ac1] shrink-0" />
                  <h3 className="font-black text-slate-800">تقرير المناوبة - {previewReportRecord.staffName}</h3>
                </div>
                <button type="button" onClick={() => setPreviewReportRecord(null)}
                  className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50">
                <DutyReportPreview report={previewReportRecord} schoolInfo={schoolInfo} />
                <button type="button" onClick={() => handlePrintSingleReport(previewReportRecord)}
                  className="w-full py-3 bg-[#655ac1] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  <Printer size={16} /> طباعة التقرير
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {mode === 'send' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setTaskMode('send')} className={actionButtonClass(taskMode === 'send')}>
              <Send size={17} />
              إرسال
            </button>
            <button type="button" onClick={() => setReceiptOpen(true)} className={actionButtonClass(false)}>
              <ClipboardList size={17} />
              سجل استلام التكليف بالمناوبة
            </button>
            <button type="button" onClick={() => setReportReceiptOpen(true)} className={actionButtonClass(false)}>
              <ClipboardList size={17} />
              سجل استلام تقرير المناوبة اليومية
            </button>
            <button type="button" onClick={onOpenArchive || (() => showToast?.('أرشيف الرسائل متاح من قسم الرسائل', 'warning'))} className={actionButtonClass(false)}>
              <Archive size={17} />
              أرشيف الرسائل
            </button>
          </div>
        </div>
      )}

      {mode === 'print' && taskMode === 'print' && (
        <div className="space-y-5">
          <div className="px-1">
            <h3 className="font-black text-slate-800 text-lg">الطباعة</h3>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)] gap-5 items-stretch">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-start gap-3 mb-2">
              <SlidersHorizontal size={20} className="text-[#655ac1]" />
              <h4 className="font-black text-slate-800">جدول المناوبة</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium text-right mb-5">
              اضبط مقاس الورق والألوان وإضافة عامود التوقيع ثم أضف الملاحظات قبل طباعة جدول المناوبة.
            </p>

            <div className="flex flex-wrap items-end gap-4 mb-5">
              <SingleSelectDropdown
                label="نطاق طباعة الجدول"
                value={schedulePrintScope}
                onChange={value => setSchedulePrintScope(value as SchedulePrintScope)}
                placeholder="اختر نطاق الطباعة"
                options={[
                  { value: 'all', label: 'طباعة جدول المناوبة بالكامل' },
                  { value: 'selectedWeeks', label: 'طباعة أسبوع أو عدة أسابيع' },
                ]}
              />
              {schedulePrintScope === 'selectedWeeks' && (
                <MultiSelectDropdown
                  label="الأسابيع"
                  buttonLabel="اختر الأسابيع"
                  options={weeksToRender.map((week, index) => ({ value: week.weekId, label: week.weekName || `الأسبوع ${index + 1}` }))}
                  selectedValues={selectedWeekIds}
                  selectedSummary={selectedWeekIds.length ? `تم اختيار ${selectedWeekIds.length} أسبوع` : undefined}
                  onToggle={value => setSelectedWeekIds(current => current.includes(value) ? current.filter(id => id !== value) : [...current, value])}
                  onClear={() => setSelectedWeekIds([])}
                  onSelectAll={() => setSelectedWeekIds(weeksToRender.map(week => week.weekId))}
                />
              )}
              <SingleSelectDropdown
                label="نوع الورق"
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
                label="خانة توقيع المناوب"
                value={printSignatureMode}
                onChange={value => setPrintSignatureMode(value as PrintSignatureMode)}
                placeholder="اختر خيار التوقيع"
                options={[
                  { value: 'with', label: 'إضافة عامود توقيع لكل مناوب' },
                  { value: 'without', label: 'بدون إضافة عامود توقيع لكل مناوب' },
                ]}
              />
            </div>

            <div className="mb-5">
              <label className="block text-xs font-black text-slate-500 mb-2">الملاحظات</label>
              <p className="text-xs font-bold text-slate-600 mb-3">
                هل تريد إضافة ملاحظات في جدول المناوبة اليومية قبل الطباعة؟{' '}
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
                  placeholder={printNotePlaceholder}
                  rows={3}
                  className="w-full border-2 border-slate-100 rounded-xl p-4 outline-none focus:border-[#655ac1] resize-none text-sm leading-relaxed transition-colors"
                  dir="rtl"
                />
              )}
            </div>

            <div className="mt-auto flex justify-center">
              <button
                type="button"
                onClick={() => handlePrintSchedule()}
                disabled={!hasData}
                className="inline-flex min-w-[160px] items-center justify-center gap-2 px-10 py-2.5 rounded-xl border border-[#655ac1] bg-[#655ac1] text-white text-sm font-black hover:bg-[#5046a0] transition-all shadow-md shadow-[#655ac1]/20 disabled:opacity-50"
              >
                <Printer size={16} />
                طباعة جدول المناوبة
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-start gap-3 mb-2">
              <ClipboardList size={20} className="text-[#655ac1]" />
              <h4 className="font-black text-slate-800">تقرير المناوبة اليومية</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium text-right mb-5">
              اطبع نموذج تقرير المناوبة اليومي المفرغ للتعبئة اليدوية.
            </p>

            <div className="flex flex-wrap items-end gap-4 mb-5">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-black text-slate-500 mb-2">عدد المناوبين</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={reportDutyRowsCount}
                  onChange={e => setReportDutyRowsCount(e.target.value)}
                  className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 focus:border-[#655ac1]/50 transition-all outline-none"
                />
              </div>
              <SingleSelectDropdown
                label="اللون"
                value={printColorMode}
                onChange={value => setPrintColorMode(value as PrintColorMode)}
                placeholder="اختر اللون"
                options={[{ value: 'color', label: 'ملون' }, { value: 'bw', label: 'أبيض وأسود' }]}
              />
            </div>

            <div className="mt-auto flex justify-center">
              <button
                type="button"
                onClick={handlePrintDailyReport}
                className="inline-flex min-w-[160px] items-center justify-center gap-2 px-10 py-2.5 rounded-xl border border-[#655ac1] bg-[#655ac1] text-white text-sm font-black hover:bg-[#5046a0] transition-all shadow-md shadow-[#655ac1]/20"
              >
                <Printer size={16} />
                طباعة التقرير
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {mode === 'send' && taskMode === 'send' && (
        <div className="space-y-4">
          <div className="px-1">
            <h3 className="font-black text-slate-800 text-lg">إرسال</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-start gap-3 mb-2">
                <ClipboardCheck size={20} className="text-[#655ac1]" />
                <h4 className="font-black text-slate-800">اختر نوع الإشعار والمستلمين</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium text-right mb-5">
                اختر نوع الإشعار أولاً ثم اختر الأسبوع ثم اختر اليوم ثم حدد المستلمين.
              </p>
              <div className="space-y-4">
                <SingleSelectDropdown
                  label="نوع الإشعار"
                  value={sendMode}
                  onChange={value => { setSendMode(value as SendMode); setPreviewRowKey(null); }}
                  placeholder="اختر نوع الإشعار"
                  options={[
                    { value: 'electronic', label: 'رسالة تكليف بالمناوبة مع توقيع الكتروني' },
                    { value: 'text', label: 'رسالة تكليف بالمناوبة نصية' },
                    { value: 'reminder', label: 'رسالة تذكير يومية بالمناوبة' },
                  ]}
                />
                <MultiSelectDropdown
                  label="الأسبوع"
                  buttonLabel="كل الأسابيع أو اختر أسبوعًا"
                  options={sendWeekOptions}
                  selectedValues={selectedSendWeekIds}
                  selectedSummary={selectedWeeksSummary}
                  onToggle={value => setSelectedSendWeekIds(current => current.includes(value) ? current.filter(id => id !== value) : [...current, value])}
                  onClear={() => setSelectedSendWeekIds([])}
                  onSelectAll={() => setSelectedSendWeekIds(weeksToRender.map(week => week.weekId))}
                  searchable
                  searchPlaceholder="ابحث بالأسبوع..."
                />
                <MultiSelectDropdown
                  label="اليوم"
                  buttonLabel="كل الأيام أو اختر يومًا"
                  options={dayOptions}
                  selectedValues={selectedSendDayKeys}
                  selectedSummary={selectedDaysSummary}
                  onToggle={value => setSelectedSendDayKeys(current => current.includes(value) ? current.filter(id => id !== value) : [...current, value])}
                  onClear={() => setSelectedSendDayKeys([])}
                  onSelectAll={() => setSelectedSendDayKeys(dayOptions.filter(option => !option.disabled).map(option => option.value))}
                  searchable
                  searchPlaceholder="ابحث باليوم أو التاريخ..."
                />
                <MultiSelectDropdown
                  label="المناوبون المستلمون"
                  buttonLabel="كل المناوبين أو اختر مستلمين"
                  options={staffOptions}
                  selectedValues={selectedStaffKeys}
                  selectedSummary={selectedStaffKeys.length > 0 ? `${selectedStaffKeys.length} مستلم محدد` : 'لم يتم اختيار مستلمين'}
                  onToggle={value => { setStaffSelectionTouched(true); setSelectedStaffKeys(current => current.includes(value) ? current.filter(id => id !== value) : [...current, value]); }}
                  onClear={() => { setStaffSelectionTouched(true); setSelectedStaffKeys([]); }}
                  onSelectAll={() => { setStaffSelectionTouched(true); setSelectedStaffKeys(displaySendRows.map(row => row.key)); }}
                  searchable
                  searchPlaceholder="ابحث عن مناوب بالاسم..."
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
                  <button
                    type="button"
                    onClick={() => setSendChannel('whatsapp')}
                    className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${sendChannel === 'whatsapp' ? 'border-[#25D366] bg-white shadow-sm' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <span className={sendChannel === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-300'}>
                      <WhatsAppIcon size={28} />
                    </span>
                    <span className={`font-black mt-2 text-sm ${sendChannel === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-400'}`}>واتساب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendChannel('sms')}
                    className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${sendChannel === 'sms' ? 'border-[#007AFF] bg-white shadow-sm' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <span className={sendChannel === 'sms' ? 'text-[#007AFF]' : 'text-slate-300'}>
                      <MessageSquare size={28} />
                    </span>
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
                  {sendMode !== 'text' && (
                    <button
                      type="button"
                      onClick={() => setPreviewRowKey(firstSelectedRow?.key || null)}
                      disabled={!firstSelectedRow}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Eye size={15} />
                      {sendMode === 'reminder' ? 'تقرير المناوبة اليومية' : 'معاينة التكليف الالكتروني'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setRecipientsPreviewOpen(true)}
                    disabled={selectedRows.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all disabled:opacity-50"
                  >
                    <Users size={15} />
                    معاينة المستلمين ({selectedRows.length})
                  </button>
                </div>
                {sendMode === 'reminder' && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-700">إضافة رابط التقرير اليومي للمناوبة</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-1">عند إيقافه ترسل رسالة التذكير بدون رابط التقرير.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIncludeReportLinkInReminder(current => !current)}
                        className={`relative inline-flex w-10 h-6 rounded-full transition-all shrink-0 ${includeReportLinkInReminder ? 'bg-[#655ac1]' : 'bg-slate-300'}`}
                        role="switch"
                        aria-checked={includeReportLinkInReminder}
                      >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${includeReportLinkInReminder ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                )}
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
                    onClick={() => {
                      if (selectedRows.length === 0) return;
                      setMessageText(buildDetailedMessage(undefined, RECIPIENT_NAME_TOKEN));
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
                    <button
                      type="button"
                      onClick={() => setIsSendScheduled(current => !current)}
                      className={`relative inline-flex w-10 h-6 rounded-full transition-all ${isSendScheduled ? 'bg-[#655ac1]' : 'bg-slate-300'}`}
                      role="switch"
                      aria-checked={isSendScheduled}
                    >
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
                                onClick={() => setScheduleCalendarType(option.value as CalendarType)}
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
                          value={getValidPickerDate(sendScheduleDate, scheduleCalendarType)}
                          onChange={date => setSendScheduleDate(formatPickerDate(date))}
                          calendar={scheduleCalendarType === 'hijri' ? arabic : gregorian}
                          locale={scheduleCalendarType === 'hijri' ? arabic_ar : gregorian_ar}
                          containerClassName="w-full"
                          inputClass="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors cursor-pointer bg-white"
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
                          <input
                          type="time"
                          value={sendScheduleTime}
                          onChange={e => setSendScheduleTime(e.target.value)}
                          className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onOpenLegacySend}
                  disabled={selectedRows.length === 0}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#655ac1] text-white font-black shadow-md shadow-[#655ac1]/20 hover:bg-[#5046a0] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                  إرسال عبر {sendChannel === 'whatsapp' ? 'واتساب' : 'الرسائل النصية'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewRow && previewRowKey !== null && createPortal(
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm" dir="rtl">
          <div className={`w-full ${sendMode === 'reminder' ? 'max-w-4xl' : 'max-w-2xl'} max-h-[90vh] overflow-hidden rounded-[2rem] bg-white border border-slate-200 shadow-2xl flex flex-col`}>
            <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <Eye size={22} className="text-[#655ac1] shrink-0" />
                <h3 className="font-black text-slate-800">{sendMode === 'reminder' ? 'تقرير المناوبة اليومية' : 'معاينة التكليف الالكتروني'}</h3>
              </div>
              <button type="button" onClick={() => setPreviewRowKey(null)}
                className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="block text-slate-500 font-bold mb-1">الاسم</span>
                    <span className="font-black text-slate-800">{previewRow.staffName}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 font-bold mb-1">الصفة</span>
                    <span className="font-black text-[#655ac1]">{previewRow.staffType}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 font-bold mb-1">رقم الجوال</span>
                    <span className="font-black text-slate-800" dir="ltr">{previewRow.phone || 'غير مسجل'}</span>
                  </div>
                </div>
              </div>

              {sendMode === 'reminder' ? (
                <div className="space-y-3">
                  <DutyReportPreview
                    report={{
                      id: `preview-${previewRow.staffId}`,
                      date: previewRow.date,
                      day: previewRow.day,
                      staffId: previewRow.staffId,
                      staffName: previewRow.staffName,
                      lateStudents: [],
                      violatingStudents: [],
                      status: 'present' as any,
                      isSubmitted: false,
                    }}
                    schoolInfo={schoolInfo}
                  />
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white border-b border-slate-100">
                          <th className="px-3 py-2 text-right text-[#655ac1] font-black">جدول المناوبة</th>
                          <th className="px-3 py-2 text-right text-[#655ac1] font-black">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRow.assignments.map(row => (
                          <tr key={row.key} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-black text-slate-700">{DAY_NAMES[row.day] || row.day}</td>
                            <td className="px-3 py-2 font-bold text-slate-600">{formatHijriDate(row.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm font-black text-slate-700">
                    تم العلم والاطلاع على جدول المناوبة المسند والتوقيع بالعلم.
                  </p>
                  <div className="rounded-2xl border-2 border-dashed border-[#655ac1]/30 bg-slate-50 h-32 flex items-center justify-center text-xs font-bold text-slate-300">
                    خانة التوقيع
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button type="button" disabled className="flex-1 py-3 bg-slate-100 text-slate-400 rounded-xl font-bold text-sm cursor-not-allowed">
                  مسح التوقيع
                </button>
                <button type="button" disabled className="flex-1 py-3 bg-slate-200 text-slate-400 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                  <Check size={16} /> إرسال
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-bold text-center">
                زر الإرسال والتوقيع يعملان عند فتح الرابط من قبل المناوب.
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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] table-fixed text-right whitespace-nowrap" dir="rtl">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-3 py-4 font-black text-[#655ac1] text-[12px] text-center w-[12%]">اليوم</th>
                      <th className="px-3 py-4 font-black text-[#655ac1] text-[12px] text-center w-[16%]">التاريخ</th>
                      <th className="px-3 py-4 font-black text-[#655ac1] text-[12px] text-right w-[22%]">المستلم</th>
                      <th className="px-3 py-4 font-black text-[#655ac1] text-[12px] text-right w-[22%]">نوع الإشعار</th>
                      {sendMode === 'electronic' && (
                        <>
                          <th className="px-3 py-4 font-black text-[#655ac1] text-[12px] text-right w-[16%]">الرابط</th>
                          <th className="px-3 py-4 font-black text-[#655ac1] text-[12px] text-center w-[12%]">إجراءات</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRows.length === 0 ? (
                      <tr>
                        <td colSpan={sendMode === 'electronic' ? 6 : 4} className="px-6 py-10 text-center text-sm font-bold text-slate-400">
                          لم يتم اختيار مستلمين بعد.
                        </td>
                      </tr>
                    ) : selectedRows.map(row => {
                      const link = sendMode === 'electronic' ? buildSignatureLink(row) : '';
                      const shouldStackAssignments = sendMode !== 'reminder' && row.assignments.length > 1;
                      return (
                        <tr key={row.key} className="hover:bg-[#f8f7ff] transition-all">
                          <td className="px-3 py-3.5 text-center text-[12px] font-bold text-slate-700">
                            {shouldStackAssignments ? (
                              <div className="flex flex-col gap-1.5 whitespace-normal">
                                {row.assignments.map(item => (
                                  <span key={`${row.key}-day-${item.key}`} className="block px-2 py-1 text-[#655ac1] leading-tight">
                                    {DAY_NAMES[item.day] || item.day}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="block truncate">{row.dayLabel}</span>
                            )}
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            {shouldStackAssignments ? (
                              <div className="flex flex-col gap-1.5 whitespace-normal">
                                {row.assignments.map(item => (
                                  <span key={`${row.key}-date-${item.key}`} className="block px-2 py-1 bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 leading-tight">
                                    {formatHijriDate(item.date)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span title={row.dateLabel} className="block max-w-full px-2 py-1 bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 truncate">
                                {row.dateLabel}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3.5 min-w-0">
                            <p className="font-black text-[12px] text-slate-800 truncate" title={row.staffName}>{row.staffName}</p>
                            <p className="text-[10px] font-bold text-slate-400 truncate">المناوبة اليومية</p>
                          </td>
                          <td className="px-3 py-3.5 text-[12px] font-bold text-slate-700 truncate" title={notificationTypeLabel}>{notificationTypeLabel}</td>
                          {sendMode === 'electronic' && (
                            <>
                              <td className="px-3 py-3.5 min-w-0">
                                {link ? (
                                  <div dir="ltr" title={link} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-mono text-slate-500 truncate">
                                    {link}
                                  </div>
                                ) : <span className="text-xs font-bold text-slate-400">بدون رابط</span>}
                              </td>
                              <td className="px-3 py-3.5">
                                <div className="flex items-center justify-center gap-1.5">
                                  {link && (
                                    <button type="button" onClick={() => { setPreviewRowKey(row.key); }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-black hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#f1efff] transition-all">
                                      <Eye size={12} />
                                      عرض
                                    </button>
                                  )}
                                  {link && (
                                    <button type="button" onClick={() => copyToClipboard(link)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-black hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#f1efff] transition-all">
                                      <Copy size={12} />
                                      نسخ
                                    </button>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
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
    </div>
  );
};

export default PrintSendTab;
