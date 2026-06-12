import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import arabic from 'react-date-object/calendars/arabic';
import arabic_ar from 'react-date-object/locales/arabic_ar';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_ar from 'react-date-object/locales/gregorian_ar';
import {
  Users,
  CalendarDays,
  CalendarClock,
  LayoutGrid,
  User,
  BookOpen,
  Printer,
  FileDown,
  Send,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Copy,
  CheckCircle2,
  FileCode2,
  FileSpreadsheet,
  Search,
  ChevronDown,
  ChevronLeft,
  Check,
  SlidersHorizontal,
  Archive,
  MessageSquare,
  Eye,
  ClipboardList,
  Loader2,
  X,
  RefreshCw,
  Wallet,
  Smartphone,
} from 'lucide-react';
import {
  SchoolInfo,
  ScheduleSettingsData,
  Teacher,
  Subject,
  ClassInfo,
  Admin,
  Assignment,
  Specialization,
  TimetableData,
  TimetableSlot,
  Student,
  MessageComposerDraft,
  CentralMessage,
} from '../../../types';
import InlineScheduleView from '../../schedule/InlineScheduleView';
import ScheduleSignatureDocument, { MinistryLogo } from '../../schedule/ScheduleSignatureDocument';
import { SCHEDULE_PRINT_REQUEST_PREFIX } from '../../schedule/SchedulePrintPage';
import { SCHEDULE_SIGNATURE_PRINT_REQUEST_PREFIX } from '../../schedule/ScheduleSignaturePrintPage';
import { generateExtensionXML, downloadFile } from '../../../utils/scheduleExport';
import {
  buildScheduleShareLink,
  saveScheduleShare,
  ShareAudience,
  ShareRecipientRecord,
} from '../../../utils/scheduleShare';
import { calculateSmsSegments } from '../../../utils/smsUtils';
import { useMessageArchive } from '../../messaging/MessageArchiveContext';
import RecipientsPreviewModal from '../../messaging/RecipientsPreviewModal';
import MessagePreviewInline from '../../messaging/MessagePreviewInline';
import { getClassLabel } from '../../../utils/classLabels';
import { getMessageTemplate, fillMessageTemplate, shortenRecipientName, stripUnfilledTokens } from '../../../utils/messageCatalog';

interface Props {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  scheduleSettings: ScheduleSettingsData;
  setScheduleSettings: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  students: Student[];
  admins: Admin[];
  assignments: Assignment[];
  specializations: Specialization[];
  onNavigate: (tab: 'view' | 'edit' | 'create') => void;
  isScheduleLocked?: boolean;
  onOpenMessagesArchive?: () => void;
  onPrepareMessageDraft?: (draft: MessageComposerDraft) => void;
  /** Active task, driven by the merged stage-4 toolbar in ScheduleV2Preview. */
  task?: TaskMode;
}

type ScheduleType =
  | 'general_teachers'
  | 'general_waiting'
  | 'general_classes'
  | 'individual_teacher'
  | 'individual_class';

type TaskMode = 'preview' | 'print' | 'send' | 'export';
type PaperSize = 'A4' | 'A3';
type PrintColorMode = 'color' | 'bw';
type ExportFormat = 'xlsx' | 'xml';
type SendAudience = ShareAudience | 'teachers_admins';
type SendChannel = 'whatsapp' | 'sms';

type PrintJob = {
  type: ScheduleType;
  label: string;
  targetIds: string[];
};

type GeneratedLink = {
  label: string;
  url: string;
  teacherId?: string;
  targetId?: string;
  targetLabel: string;
  recipients: ShareRecipientRecord[];
};

type ScheduleSignatureRequest = {
  token: string;
  teacherId: string;
  teacherName: string;
  createdAt: string;
  status: 'pending' | 'signed';
  signedAt?: string;
  signatureData?: string;
  /** يجمع طلبات إرسال واحد في دفعة مستقلة. القيمة 'preview' تعني طلب معاينة لا يظهر في السجل. */
  sendBatchId?: string;
  /** اسم الجدول المختوم وقت الإرسال — يُستخدم كاحتياطي لو حُذف الجدول لاحقًا. */
  scheduleName?: string;
  /** معرّف الجدول المعتمد وقت الإرسال — يتيح عرض الاسم الحيّ المحدّث عند إعادة التسمية. */
  scheduleId?: string;
};

type DropdownOption = {
  value: string;
  label: string;
  icon?: React.ComponentType<any>;
  disabled?: boolean;
};

const SCHEDULE_SIGNATURE_REQUESTS_KEY = 'schedule_signature_requests_v1';

const readScheduleSignatureRequests = (): ScheduleSignatureRequest[] => {
  try {
    const raw = localStorage.getItem(SCHEDULE_SIGNATURE_REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeScheduleSignatureRequests = (requests: ScheduleSignatureRequest[]) => {
  localStorage.setItem(SCHEDULE_SIGNATURE_REQUESTS_KEY, JSON.stringify(requests));
};

const createSignatureToken = (teacherId: string) =>
  `schedule-${teacherId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** معرّف الدفعة المخصص لطلبات المعاينة — تُحفظ ليعمل رابط المعاينة لكنها لا تظهر في سجل الاستلام. */
const PREVIEW_SIGNATURE_BATCH = 'preview';

/** يطبّع الاسم العربي (يوحّد المسافات) لمطابقة أكثر تسامحًا. */
const normalizeTeacherName = (name: string) => name.replace(/\s+/g, ' ').trim();

/**
 * يحلّ المعلم من طلب توقيع محفوظ بتسامح: بالمعرّف، ثم بالاسم المطبّع،
 * ثم بتطابق المقاطع (يلتقط الاسم المختصر «أحمد الزهراني» داخل «أحمد محمد الزهراني»).
 */
const resolveSignatureTeacher = <T extends { id: string; name: string }>(
  teacherList: T[],
  teacherId: string,
  teacherName?: string,
): T | undefined => {
  const byId = teacherList.find(item => item.id === teacherId);
  if (byId) return byId;
  if (!teacherName) return undefined;
  const target = normalizeTeacherName(teacherName);
  const byExactName = teacherList.find(item => normalizeTeacherName(item.name) === target);
  if (byExactName) return byExactName;
  const targetTokens = target.split(' ').filter(Boolean);
  if (targetTokens.length === 0) return undefined;
  const subsetMatches = teacherList.filter(item => {
    const itemTokens = normalizeTeacherName(item.name).split(' ').filter(Boolean);
    return targetTokens.every(token => itemTokens.includes(token));
  });
  // نقبل تطابق المقاطع فقط حين يكون فريدًا لتجنّب الالتباس بين أسماء متشابهة.
  return subsetMatches.length === 1 ? subsetMatches[0] : undefined;
};

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20.52 3.48A11.78 11.78 0 0 0 12.07 0C5.5 0 .16 5.33.16 11.9c0 2.1.55 4.15 1.58 5.96L0 24l6.3-1.65a11.85 11.85 0 0 0 5.77 1.47h.01c6.57 0 11.91-5.34 11.91-11.91 0-3.18-1.24-6.17-3.47-8.43ZM12.08 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.74.98 1-3.64-.23-.37a9.86 9.86 0 0 1-1.52-5.27c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.12 1.03 6.98 2.9a9.82 9.82 0 0 1 2.9 6.98c0 5.46-4.44 9.9-9.88 9.9Z"
      fill="#25D366"
    />
    <path
      d="M17.52 14.32c-.3-.15-1.76-.87-2.03-.96-.27-.1-.47-.15-.66.15-.19.29-.76.96-.93 1.16-.17.2-.34.22-.64.07-.3-.15-1.24-.46-2.36-1.47-.87-.77-1.46-1.72-1.63-2.01-.17-.3-.02-.45.13-.6.13-.13.3-.34.44-.51.15-.17.19-.29.3-.49.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.08-.8.37-.27.3-1.04 1.01-1.04 2.45 0 1.44 1.07 2.83 1.22 3.03.15.2 2.08 3.17 5.03 4.45.71.3 1.26.49 1.69.63.71.22 1.35.19 1.86.12.57-.08 1.76-.72 2-1.42.25-.71.25-1.31.17-1.43-.07-.12-.27-.2-.57-.35Z"
      fill="#25D366"
    />
  </svg>
);

const SCHEDULE_TYPES: Array<{
  id: ScheduleType;
  label: string;
  icon: React.ComponentType<any>;
  isGeneral: boolean;
}> = [
  { id: 'general_teachers', label: 'الجدول العام للمعلمين', icon: Users, isGeneral: true },
  { id: 'general_waiting', label: 'الجدول العام للانتظار', icon: CalendarClock, isGeneral: true },
  { id: 'general_classes', label: 'الجدول العام للفصول', icon: LayoutGrid, isGeneral: true },
  { id: 'individual_teacher', label: 'جدول معلم', icon: User, isGeneral: false },
  { id: 'individual_class', label: 'جدول فصل', icon: BookOpen, isGeneral: false },
];

const GENERAL_SCHEDULES = SCHEDULE_TYPES.filter(item => item.isGeneral);

const AUDIENCE_LABELS: Record<SendAudience, string> = {
  teachers: 'المعلمون',
  admins: 'الإداريون',
  teachers_admins: 'المعلمون والإداريون',
  guardians: 'أولياء الأمور',
};

const ALLOWED_SEND_AUDIENCES: Record<ScheduleType, SendAudience[]> = {
  individual_teacher: ['teachers', 'admins', 'teachers_admins'],
  individual_class: ['teachers', 'admins', 'teachers_admins', 'guardians'],
  general_teachers: ['teachers', 'admins', 'teachers_admins'],
  general_classes: ['teachers', 'admins', 'teachers_admins'],
  general_waiting: ['teachers', 'admins', 'teachers_admins'],
};

const DAY_LABELS: Record<string, string> = {
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
};

const sanitizeSheetName = (input: string) =>
  input.replace(/[\\/?*:[\]]/g, ' ').slice(0, 31) || 'Sheet';

const buildPrintCSS = (paperSize: PaperSize, blackAndWhite: boolean) => `
  @page { size: ${paperSize} landscape; margin: 8mm; }
  @media print {
    html, body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      background: #fff !important;
      font-family: "Tajawal", sans-serif !important;
    }
    body * { visibility: hidden !important; }
    #schedule-print-root, #schedule-print-root * { visibility: visible !important; }
    #schedule-print-root { position: absolute !important; inset: 0 !important; width: 100% !important; background: #fff !important; }
    .print-toolbar { display: none !important; }
    .print-page { break-after: page; page-break-after: always; }
    .print-page:last-child { break-after: auto; page-break-after: auto; }
    .print-grid-item { break-inside: avoid; page-break-inside: avoid; }
    /* الجداول العامة الكبيرة: تتدفّق صفوفها على صفحات بدل أن تُقصّ */
    .print-grid-item--flow { break-inside: auto !important; page-break-inside: auto !important; }
    #schedule-print-root thead { display: table-header-group !important; }
    #schedule-print-root thead th, #schedule-print-root tbody td, #schedule-print-root tbody th { position: static !important; }
    #schedule-print-root tbody tr { break-inside: avoid; page-break-inside: avoid; }
    ${blackAndWhite ? '#schedule-print-root { filter: grayscale(100%) !important; }' : ''}
    ${blackAndWhite ? '#schedule-print-root * { box-shadow: none !important; }' : ''}
  }
`;

const useDropdownPosition = (open: boolean, onClose: () => void) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 });

  // Keep the latest onClose without making it an effect dependency — a fresh closure each
  // render would otherwise re-run the effect every render, and setPosition's new object would
  // re-render again → an infinite loop (white screen with useLayoutEffect).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Position synchronously before paint so the panel never flashes at the top-left (0,0) corner.
  useLayoutEffect(() => {
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

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div className={`flex-1 ${minWidthClass}`}>
      {label ? <label className="block text-xs font-black text-slate-500 mb-2">{label}</label> : null}
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
                onClick={() => {
                  if (option.disabled) return;
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                  option.disabled
                    ? 'text-slate-300 cursor-not-allowed bg-slate-50/70'
                    :
                  value === option.value
                    ? 'bg-white text-[#655ac1]'
                    : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                }`}
              >
                <span className="flex items-center gap-2">
                  {option.icon ? <option.icon size={15} className="text-[#655ac1]" /> : null}
                  {option.label}
                </span>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                  value === option.value
                    ? 'bg-[#655ac1] border-[#655ac1] text-white'
                    : 'bg-white border-slate-300 text-transparent'
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
  minWidthClass?: string;
  dropdownPlacement?: 'auto' | 'top' | 'bottom';
  hideSelectAll?: boolean;
  closeOnToggle?: boolean;
}> = ({
  label,
  buttonLabel,
  options,
  selectedValues,
  onToggle,
  onClear,
  onSelectAll,
  selectedSummary,
  searchable = false,
  minWidthClass = 'min-w-[260px]',
  dropdownPlacement = 'bottom',
  hideSelectAll = false,
  closeOnToggle = false,
}) => {
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
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(current => !current)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2"
      >
        <span className="truncate text-[13px] leading-tight">{selectedSummary || buttonLabel}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[130] animate-in slide-in-from-top-2"
          style={{
            top: dropdownPlacement === 'top'
              ? Math.max(16, position.top - 330)
              : position.top,
            left: position.left,
            width: position.width
          }}
        >
          {searchable && (
            <div className="relative mb-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="ابحث..."
                value={search}
                onChange={event => setSearch(event.target.value)}
                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#655ac1]/20 font-medium"
              />
            </div>
          )}
          {!hideSelectAll && (() => {
            const allSelected = options.length > 0 && options.every(o => selectedValues.includes(o.value));
            const isClearMode = !onSelectAll || allSelected;
            return (
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => { if (isClearMode) { onClear(); } else { onSelectAll?.(); } }}
                  disabled={options.length === 0}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    options.length === 0
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white'
                  }`}
                >
                  {isClearMode ? 'إلغاء الكل' : 'اختيار الكل'}
                </button>
              </div>
            );
          })()}
          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {filteredOptions.map(option => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    onToggle(option.value);
                    if (closeOnToggle) setOpen(false);
                  }}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                    option.disabled
                      ? 'bg-slate-50/70 text-slate-300 cursor-not-allowed'
                      : isSelected
                      ? 'bg-white text-[#655ac1]'
                      : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {option.icon ? <option.icon size={15} className={option.disabled ? 'text-slate-300' : 'text-[#655ac1]'} /> : null}
                    {option.label}
                  </span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                    option.disabled
                      ? 'bg-white border-slate-200 text-transparent'
                      : isSelected
                      ? 'bg-[#655ac1] border-[#655ac1] text-white'
                      : 'bg-white border-slate-300 text-transparent'
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

const NumberChoiceButtons: React.FC<{
  count: number;
  value: number;
  onChange: (value: number) => void;
}> = ({ count, value, onChange }) => (
  <div className="flex-1 min-w-[240px]">
    <label className="block text-xs font-black text-slate-500 mb-2">عدد الجداول في الصفحة</label>
    <div className="flex gap-2">
      {[1, 2, 3, 4].map(num => {
        const disabled = num > count;
        return (
          <button
            key={num}
            type="button"
            disabled={disabled}
            onClick={() => onChange(num)}
            className={`w-12 h-12 rounded-xl font-black text-sm border transition-all ${
              value === num
                ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-md shadow-[#655ac1]/20'
                : 'bg-white text-slate-700 border-slate-200'
            } ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-[#cfc8ff] hover:text-[#655ac1]'}`}
          >
            {num}
          </button>
        );
      })}
    </div>
  </div>
);

class SendPanelErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Send schedule panel failed to render', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 text-right">
          <h3 className="font-black text-rose-700 mb-2">تعذر فتح إعدادات الإرسال</h3>
          <p className="text-sm font-bold text-rose-600">
            حدث خطأ أثناء تجهيز لوحة الإرسال. أعد تحميل الصفحة ثم حاول مرة أخرى.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

const PrintWorkspace: React.FC<{
  jobs: PrintJob[];
  teachers: Teacher[];
  classes: ClassInfo[];
  subjects: Subject[];
  specializations?: Specialization[];
  settings: ScheduleSettingsData;
  schoolInfo: SchoolInfo;
  paperSize: PaperSize;
  colorMode: PrintColorMode;
  perPage: number;
  onBack: () => void;
}> = ({
  jobs,
  teachers,
  classes,
  subjects,
  specializations,
  settings,
  schoolInfo,
  paperSize,
  colorMode,
  perPage,
  onBack,
}) => {
  const blackAndWhite = colorMode === 'bw';
  const styleTag = useMemo(() => buildPrintCSS(paperSize, blackAndWhite), [paperSize, blackAndWhite]);
  const specializationNames = useMemo(
    () => Object.fromEntries((specializations || []).map(item => [item.id, item.name])),
    [specializations]
  );

  return (
    <div className="fixed inset-0 z-[120] bg-white overflow-auto" dir="rtl">
      <style>{styleTag}</style>
      <div className="print-toolbar sticky top-0 z-20 flex items-center justify-between gap-3 px-6 py-4 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 order-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 transition-all"
          >
            <ArrowRight size={16} />
            رجوع
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#655ac1] text-white font-bold shadow-lg shadow-[#655ac1]/20 hover:bg-[#5046a0] transition-all"
          >
            <Printer size={16} />
            طباعة
          </button>
        </div>
        <div className="text-sm font-bold text-slate-500 order-1">
          {paperSize} • {blackAndWhite ? 'أبيض وأسود' : 'ملون'}
        </div>
      </div>

      <div id="schedule-print-root" className="bg-white p-6 space-y-8">
        {jobs.map(job => {
          const gridClass = perPage === 4 ? 'grid-cols-2' : perPage === 3 ? 'grid-cols-2' : perPage === 2 ? 'grid-cols-2' : 'grid-cols-1';
          const pages: string[][] =
            job.targetIds.length > 1
              ? Array.from({ length: Math.ceil(job.targetIds.length / perPage) }, (_, index) =>
                  job.targetIds.slice(index * perPage, index * perPage + perPage)
                )
              : [job.targetIds];

          return pages.map((pageIds, pageIndex) => (
            <div key={`${job.type}-${pageIndex}`} className="print-page rounded-[2rem] border border-slate-200 p-4 bg-white">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-800">{job.label}</h3>
                  <p className="text-xs font-bold text-slate-400">
                    {pageIds.length > 1 ? `عدد الجداول في الصفحة: ${pageIds.length}` : 'جدول واحد في الصفحة'}
                  </p>
                </div>
                <div className="text-xs font-black text-[#655ac1] bg-[#f4f2ff] border border-[#ddd7ff] px-3 py-1.5 rounded-full">
                  صفحة {pageIndex + 1}
                </div>
              </div>

              <div className={`grid ${gridClass} gap-4`}>
                {pageIds.map(targetId => {
                  const isGeneralJob = job.type !== 'individual_teacher' && job.type !== 'individual_class';
                  return (
                  <div key={`${job.type}-${targetId || 'all'}`} className={`print-grid-item rounded-2xl border border-slate-100 ${isGeneralJob ? 'print-grid-item--flow' : 'overflow-hidden'}`}>
                    {!isGeneralJob ? (
                      <div className="bg-white p-3">
                        <InlineScheduleView
                          type={job.type}
                          settings={settings}
                          teachers={teachers}
                          classes={classes}
                          subjects={subjects}
                          specializationNames={specializationNames}
                          targetId={targetId || undefined}
                          compactIndividual={pageIds.length > 1}
                          showWaitingManagement={false}
                          unifiedIndividual
                        />
                      </div>
                    ) : (
                      <div className="bg-white p-3">
                        <InlineScheduleView
                          type={job.type}
                          settings={settings}
                          teachers={teachers}
                          classes={classes}
                          subjects={subjects}
                          specializationNames={specializationNames}
                          showWaitingManagement={false}
                          hideHeaderActionButton
                          hideGeneralFilterToolbar
                          printMode
                        />
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          ));
        })}
      </div>
    </div>
  );
};

const buildSignaturePrintCSS = () => `
  @page { size: A4 portrait; margin: 10mm; }
  @media print {
    html, body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      background: #fff !important;
      font-family: "Tajawal", sans-serif !important;
    }
    body * { visibility: hidden !important; }
    #signature-print-root, #signature-print-root * { visibility: visible !important; }
    #signature-print-root { position: absolute !important; inset: 0 !important; width: 100% !important; background: #fff !important; }
    .signature-print-toolbar { display: none !important; }
    .signature-print-page { break-after: page; page-break-after: always; }
    .signature-print-page:last-child { break-after: auto; page-break-after: auto; }
  }
`;

const SignaturePrintWorkspace: React.FC<{
  teacherIds: string[];
  teachers: Teacher[];
  classes: ClassInfo[];
  subjects: Subject[];
  specializationNames: Record<string, string>;
  settings: ScheduleSettingsData;
  schoolInfo: SchoolInfo;
  sigRequests: ScheduleSignatureRequest[];
  onBack: () => void;
}> = ({ teacherIds, teachers, classes, subjects, specializationNames, settings, schoolInfo, sigRequests, onBack }) => {
  const styleTag = useMemo(() => buildSignaturePrintCSS(), []);

  return (
    <div className="fixed inset-0 z-[125] bg-white overflow-auto" dir="rtl">
      <style>{styleTag}</style>
      <div className="signature-print-toolbar sticky top-0 z-20 flex items-center justify-between gap-3 px-6 py-4 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 order-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 transition-all"
          >
            <ArrowRight size={16} />
            رجوع
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#655ac1] text-white font-bold shadow-lg shadow-[#655ac1]/20 hover:bg-[#5046a0] transition-all"
          >
            <Printer size={16} />
            طباعة
          </button>
        </div>
        <div className="text-sm font-bold text-slate-500">
          {teacherIds.length} {teacherIds.length === 1 ? 'نموذج' : 'نماذج'}
        </div>
      </div>

      <div id="signature-print-root" className="bg-white p-6 space-y-8">
        {teacherIds.map(teacherId => {
          const sigRequest = sigRequests.find(r => r.teacherId === teacherId);
          const teacher = resolveSignatureTeacher(teachers, teacherId, sigRequest?.teacherName);
          if (!teacher) {
            return (
              <div key={teacherId || sigRequest?.token || 'missing-teacher'} className="signature-print-page rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center">
                <p className="text-base font-black text-amber-800">تعذر عرض نموذج الاستلام</p>
                <p className="text-sm font-bold text-amber-700 mt-2">
                  لم يتم العثور على المعلم {sigRequest?.teacherName || 'المحدد'} في قائمة المعلمين الحالية.
                </p>
              </div>
            );
          }
          const isSigned = sigRequest?.status === 'signed';

          return (
            <ScheduleSignatureDocument
              key={teacherId}
              teacher={teacher}
              teachers={teachers}
              classes={classes}
              subjects={subjects}
              specializationNames={specializationNames}
              settings={settings}
              schoolInfo={schoolInfo}
              mode={isSigned ? 'electronic' : 'manual'}
              signedAt={sigRequest?.signedAt}
            >
              {isSigned && sigRequest?.signatureData && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold text-emerald-600 mb-2">التوقيع الإلكتروني</p>
                  <img
                    src={sigRequest.signatureData}
                    alt={`توقيع ${teacher.name}`}
                    className="max-h-20 border border-emerald-200 rounded-xl bg-white"
                  />
                </div>
              )}
            </ScheduleSignatureDocument>
          );
        })}
      </div>
    </div>
  );
};

const SignatureSummaryPrintWorkspace: React.FC<{
  requests: ScheduleSignatureRequest[];
  schoolInfo: SchoolInfo;
  onDone: () => void;
}> = ({ requests, schoolInfo, onDone }) => {
  const styleTag = useMemo(() => buildSignaturePrintCSS(), []);
  const currentSemester =
    schoolInfo.semesters?.find(item => item.id === schoolInfo.currentSemesterId) ||
    schoolInfo.semesters?.[0];
  const now = new Date();
  const formatReceiptDate = (value?: string | Date) => {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { dateStyle: 'medium' }).format(date);
  };
  const formatReceiptDateTime = (value?: string | Date) => {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  useEffect(() => {
    let finished = false;
    const finishPrinting = () => {
      if (finished) return;
      finished = true;
      window.setTimeout(onDone, 100);
    };
    const printQuery = window.matchMedia?.('print');
    const handlePrintQueryChange = (event: MediaQueryListEvent) => {
      if (!event.matches) finishPrinting();
    };

    window.addEventListener('afterprint', finishPrinting);
    printQuery?.addEventListener?.('change', handlePrintQueryChange);
    const timer = window.setTimeout(() => window.print(), 250);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', finishPrinting);
      printQuery?.removeEventListener?.('change', handlePrintQueryChange);
    };
  }, [onDone]);

  return (
    <div className="signature-summary-print fixed inset-0 z-[125] bg-white overflow-auto" dir="rtl">
      <style>{styleTag}</style>
      <style>{`
        @page { size: A4 landscape; margin: 10mm; }
        @media print {
          html, body {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          .signature-summary-print {
            position: static !important;
            inset: auto !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #fff !important;
          }
          #signature-print-root {
            position: static !important;
            inset: auto !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            padding: 0 !important;
          }
          .receipt-print-card { box-shadow: none !important; border-radius: 0 !important; border: 0 !important; }
        }
        .receipt-print-root {
          font-family: "Tajawal", Arial, sans-serif;
          color: #1e293b;
          padding: 0;
        }
        .receipt-print-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #1e293b;
          padding-bottom: 12px;
          margin-bottom: 18px;
          font-weight: 700;
          font-size: 12px;
          line-height: 1.8;
        }
        .receipt-print-title {
          text-align: center;
          font-size: 20px;
          font-weight: 900;
          color: #111827;
          margin: 0 0 18px;
        }
        .receipt-print-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          page-break-inside: auto;
        }
        .receipt-print-table th,
        .receipt-print-table td {
          border: 1px solid #cbd5e1;
          padding: 8px;
          text-align: center;
          vertical-align: middle;
        }
        .receipt-print-table th {
          background: #a59bf0;
          color: #fff;
          font-weight: 900;
        }
        .receipt-status-signed { color: #047857; font-weight: 900; }
        .receipt-status-pending { color: #b45309; font-weight: 900; }
        .receipt-signature-img { max-height: 34px; max-width: 110px; object-fit: contain; }
        .receipt-print-table thead { display: table-header-group; }
        .receipt-print-table tfoot { display: table-footer-group; }
        .receipt-print-table tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        @media print {
          .receipt-print-table th {
            background: #a59bf0 !important;
            color: #fff !important;
          }
          .receipt-print-table thead { display: table-header-group !important; }
          .receipt-print-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      <div id="signature-print-root" className="bg-white p-8">
        <div className="receipt-print-root">
          <div className="receipt-print-header">
            <div>
              <div>المملكة العربية السعودية</div>
              <div>وزارة التعليم</div>
              <div>{schoolInfo.region || 'إدارة التعليم'}</div>
              <div>مدرسة {schoolInfo.schoolName || ''}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div>العام الدراسي: {schoolInfo.academicYear || ''}</div>
              <div>الفصل الدراسي: {currentSemester?.name || ''}</div>
              <div>تاريخ الطباعة: {formatReceiptDateTime(now)}</div>
            </div>
          </div>

          <h1 className="receipt-print-title">سجل استلام المعلمين للجداول</h1>

          <table className="receipt-print-table" dir="rtl">
            <thead>
              <tr>
                <th style={{ width: '7%' }}>م</th>
                <th style={{ width: '27%' }}>اسم المعلم</th>
                <th style={{ width: '18%' }}>تاريخ الإرسال</th>
                <th style={{ width: '14%' }}>التوقيع</th>
                <th style={{ width: '18%' }}>تاريخ التوقيع</th>
                <th style={{ width: '16%' }}>صورة التوقيع</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req, idx) => (
                <tr key={req.token}>
                  <td>{idx + 1}</td>
                  <td>{req.teacherName}</td>
                  <td>{formatReceiptDate(req.createdAt)}</td>
                  <td className={req.status === 'signed' ? 'receipt-status-signed' : 'receipt-status-pending'}>
                    {req.status === 'signed' ? 'وقّع' : 'لم يوقّع'}
                  </td>
                  <td>{formatReceiptDateTime(req.signedAt)}</td>
                  <td>
                    {req.signatureData ? (
                      <img src={req.signatureData} alt={`توقيع ${req.teacherName}`} className="receipt-signature-img" />
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6}>لا توجد بيانات.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ViewTabV3: React.FC<Props> = ({
  schoolInfo,
  scheduleSettings,
  teachers,
  subjects,
  classes,
  students,
  admins,
  specializations,
  onNavigate,
  onOpenMessagesArchive,
  onPrepareMessageDraft,
  task = 'preview',
}) => {
  const { sendMessage, scheduleMessage } = useMessageArchive();
  // Navigation is owned by the merged stage-4 toolbar; this tab just renders the active task.
  const taskMode = task;

  const [previewScheduleType, setPreviewScheduleType] = useState<ScheduleType>('general_teachers');
  const [previewTeacherIds, setPreviewTeacherIds] = useState<string[]>([]);
  const [previewClassIds, setPreviewClassIds] = useState<string[]>([]);

  const [printScheduleType, setPrintScheduleType] = useState<ScheduleType>('general_teachers');
  const [selectedPrintTeacherIds, setSelectedPrintTeacherIds] = useState<string[]>([]);
  const [selectedPrintClassIds, setSelectedPrintClassIds] = useState<string[]>([]);
  const [selectedDeliveryTeacherIds, setSelectedDeliveryTeacherIds] = useState<string[]>([]);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [printColorMode, setPrintColorMode] = useState<PrintColorMode>('color');
  const [individualPrintPerPage, setIndividualPrintPerPage] = useState<number>(1);

  const [sendScheduleType, setSendScheduleType] = useState<ScheduleType>('general_teachers');
  const [sendAudience, setSendAudience] = useState<SendAudience>('teachers');
  // وضع إرسال جدول المعلم: مع التوقيع بالعلم (نموذج استلام) أو إرسال فقط للعرض.
  // يبدأ فارغًا ليُجبر المستخدم على اختياره صراحةً قبل الإرسال.
  const [teacherSendMode, setTeacherSendMode] = useState<'signature' | 'view' | ''>('');
  const [selectedSendTeacherIds, setSelectedSendTeacherIds] = useState<string[]>([]);
  const [selectedSendAdminIds, setSelectedSendAdminIds] = useState<string[]>([]);
  const [selectedSendClassIds, setSelectedSendClassIds] = useState<string[]>([]);
  const [selectedGuardianStudentIds, setSelectedGuardianStudentIds] = useState<string[]>([]);
  const [expandedGuardianClassIds, setExpandedGuardianClassIds] = useState<string[]>([]);
  const [sendChannel, setSendChannel] = useState<SendChannel>('whatsapp');
  const [fallbackToSms, setFallbackToSms] = useState(true);
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);
  const [recipientsListLink, setRecipientsListLink] = useState<GeneratedLink | null>(null);

  const [sendModalResults, setSendModalResults] = useState<Array<{id: string; name: string; phone: string; status: 'sent'|'failed'; channel: string; timestamp: string; failureReason?: string}>>([]);
  const [showSendResultsModal, setShowSendResultsModal] = useState(false);
  const [isSendingNow, setIsSendingNow] = useState(false);
  const [modalMessageContent, setModalMessageContent] = useState('');
  const [sigFilter, setSigFilter] = useState<'all' | 'signed' | 'pending'>('all');
  const [sigSearch, setSigSearch] = useState('');
  const [selectedSigBatchId, setSelectedSigBatchId] = useState<string>('');
  const [sigReceiptRequests, setSigReceiptRequests] = useState<ScheduleSignatureRequest[]>(() => readScheduleSignatureRequests());
  const [sigReceiptModalOpen, setSigReceiptModalOpen] = useState(false);
  const [summaryPrintRequests, setSummaryPrintRequests] = useState<ScheduleSignatureRequest[] | null>(null);

  const [exportScheduleType, setExportScheduleType] = useState<ScheduleType>('general_teachers');

  // المدارس المشتركة: نطاق تصدير ملف XML (ملف موحّد للمدرستين أو ملف منفصل لكل مدرسة)
  const hasSharedSchools = !!(schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0);
  const [exportXmlScope, setExportXmlScope] = useState<'combined' | 'separate'>(
    (scheduleSettings.generationMode || 'unified') === 'separate' ? 'separate' : 'combined'
  );
  const exportXmlScopeOptions = useMemo(
    () => [
      { value: 'combined', label: 'ملف واحد للمدرستين' },
      { value: 'separate', label: 'ملف منفصل لكل مدرسة' },
    ],
    []
  );

  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [signaturePrintTeacherIds, setSignaturePrintTeacherIds] = useState<string[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isSendScheduled, setIsSendScheduled] = useState(false);
  const [sendScheduleDate, setSendScheduleDate] = useState('');
  const [sendScheduleTime, setSendScheduleTime] = useState('08:00');
  const sendScheduleCalendarType = ((schoolInfo.calendarType || 'hijri') as 'hijri' | 'gregorian');
  const smsStats = useMemo(() => calculateSmsSegments(modalMessageContent), [modalMessageContent]);
  const sendResultsStats = useMemo(() => {
    const base = {
      whatsapp: { sent: 0, failed: 0, total: 0 },
      sms: { sent: 0, failed: 0, total: 0 },
    };

    sendModalResults.forEach(result => {
      const channel = result.channel === 'sms' ? 'sms' : 'whatsapp';
      base[channel].total += 1;
      if (result.status === 'sent') base[channel].sent += 1;
      else base[channel].failed += 1;
    });

    return {
      ...base,
      sent: sendModalResults.filter(result => result.status === 'sent').length,
      failed: sendModalResults.filter(result => result.status === 'failed').length,
      total: sendModalResults.length,
    };
  }, [sendModalResults]);

  const hasSchedule = !!scheduleSettings.timetable && Object.keys(scheduleSettings.timetable).length > 0;
  const sortedClasses = useMemo(
    () => classes
      .filter(c => !c.type || c.type === 'class') // استبعاد المرافق (مختبر/مصلى/مكتبة…) — فصول فعلية فقط
      .sort((a, b) => a.grade !== b.grade ? a.grade - b.grade : (a.section || 0) - (b.section || 0)),
    [classes]
  );

  const actionButtonClass = (active: boolean) =>
    `inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-black border transition-all ${
      active
        ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-md shadow-[#655ac1]/20'
        : 'bg-white text-slate-700 border-slate-200 hover:border-[#cfc8ff] hover:text-[#655ac1] hover:bg-slate-50'
    }`;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };

  const formatPickerDate = (date: any) => {
    if (!date) return '';
    if (date instanceof DateObject) {
      const jsDate = date.toDate();
      if (isNaN(jsDate.getTime())) return '';
      return `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, '0')}-${String(jsDate.getDate()).padStart(2, '0')}`;
    }
    if (date instanceof Date && !isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    return '';
  };

  const getValidPickerDate = (date?: string) => {
    if (!date) return undefined;
    const parsed = new Date(`${date}T00:00:00`);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const teacherOptions = useMemo(() => teachers.map(item => ({ value: item.id, label: item.name })), [teachers]);
  const adminOptions = useMemo(() => admins.map(item => ({ value: item.id, label: item.name })), [admins]);
  const classOptions = useMemo(() => sortedClasses.map(item => ({ value: item.id, label: getClassLabel(item) })), [sortedClasses]);
  const safeSendScheduleType = ALLOWED_SEND_AUDIENCES[sendScheduleType]
    ? sendScheduleType
    : 'general_teachers';
  const safeSendAudience = ALLOWED_SEND_AUDIENCES[safeSendScheduleType].includes(sendAudience)
    ? sendAudience
    : ALLOWED_SEND_AUDIENCES[safeSendScheduleType][0];

  const allowedAudienceOptions = useMemo(
    () => (['teachers', 'admins', 'teachers_admins', 'guardians'] as SendAudience[]).map(audience => ({
      value: audience,
      label: AUDIENCE_LABELS[audience],
      disabled: !ALLOWED_SEND_AUDIENCES[safeSendScheduleType].includes(audience),
    })),
    [safeSendScheduleType]
  );
  const recipientAudienceOptions = useMemo(
    () => (['teachers', 'admins', 'guardians'] as SendAudience[])
      .map(audience => ({
        value: audience,
        label: AUDIENCE_LABELS[audience],
        disabled: !ALLOWED_SEND_AUDIENCES[safeSendScheduleType].includes(audience),
      })),
    [safeSendScheduleType]
  );
  const selectedAudienceValues = useMemo<SendAudience[]>(() => {
    if (safeSendAudience === 'teachers_admins') return ['teachers', 'admins'];
    if (safeSendAudience === 'teachers' || safeSendAudience === 'admins' || safeSendAudience === 'guardians') return [safeSendAudience];
    return [];
  }, [safeSendAudience]);
  const selectedAudienceSummary = selectedAudienceValues.length > 0
    ? selectedAudienceValues.map(audience => AUDIENCE_LABELS[audience]).join('، ')
    : undefined;
  const toggleSendAudience = (value: string) => {
    const audience = value as SendAudience;
    if (audience === 'guardians') {
      setSendAudience('guardians');
      return;
    }

    const currentStaff: SendAudience[] = safeSendAudience === 'teachers_admins'
      ? ['teachers', 'admins']
      : safeSendAudience === 'teachers' || safeSendAudience === 'admins'
        ? [safeSendAudience]
        : [];
    const nextStaff = currentStaff.includes(audience)
      ? currentStaff.filter(item => item !== audience)
      : [...currentStaff, audience];

    if (nextStaff.includes('teachers') && nextStaff.includes('admins')) setSendAudience('teachers_admins');
    else if (nextStaff.includes('teachers')) setSendAudience('teachers');
    else if (nextStaff.includes('admins')) setSendAudience('admins');
    else setSendAudience(audience === 'teachers' ? 'admins' : 'teachers');
  };
  const selectedScheduleLabel = SCHEDULE_TYPES.find(item => item.id === safeSendScheduleType)?.label || '';
  const needsSendTeacherTargets = safeSendScheduleType === 'individual_teacher';
  const needsSendClassTargets = safeSendScheduleType === 'individual_class';
  const selectedSendTargetCount = needsSendTeacherTargets
    ? selectedSendTeacherIds.length
    : needsSendClassTargets
      ? selectedSendClassIds.length
      : 0;
  const guardianCandidates = useMemo(() => {
    if (safeSendScheduleType !== 'individual_class') return [];
    return students
      .filter(student => selectedSendClassIds.includes(student.classId))
      .map(student => {
        const classItem = classes.find(item => item.id === student.classId);
        return {
          id: student.id,
          name: student.name,
          phone: student.parentPhone || '',
          role: 'guardian' as const,
          classId: student.classId,
          classLabel: classItem ? getClassLabel(classItem) : '',
          studentName: student.name,
        };
      });
  }, [students, classes, selectedSendClassIds, safeSendScheduleType]);
  const selectedGuardianRecipients = useMemo(
    () => guardianCandidates.filter(recipient => selectedGuardianStudentIds.includes(recipient.id) && recipient.phone),
    [guardianCandidates, selectedGuardianStudentIds]
  );
  const selectedRecipients = useMemo<ShareRecipientRecord[]>(() => {
    if (safeSendAudience === 'teachers' || safeSendAudience === 'teachers_admins') {
      const ids = safeSendScheduleType === 'individual_teacher' ? selectedSendTeacherIds : selectedSendTeacherIds;
      const teacherRecipients = teachers
        .filter(item => ids.includes(item.id))
        .map(item => ({ id: item.id, name: item.name, phone: item.phone || '', role: 'teacher' as const }));
      if (safeSendAudience === 'teachers') return teacherRecipients;

      const adminRecipients = admins
        .filter(item => selectedSendAdminIds.includes(item.id))
        .map(item => ({ id: item.id, name: item.name, phone: item.phone || '', role: 'admin' as const }));
      return [...teacherRecipients, ...adminRecipients];
    }
    if (safeSendAudience === 'admins') {
      return admins
        .filter(item => selectedSendAdminIds.includes(item.id))
        .map(item => ({ id: item.id, name: item.name, phone: item.phone || '', role: 'admin' as const }));
    }
    return selectedGuardianRecipients;
  }, [safeSendAudience, safeSendScheduleType, selectedSendTeacherIds, selectedSendAdminIds, teachers, admins, selectedGuardianRecipients]);
  const guardiansByClass = useMemo(() => {
    const grouped: Record<string, typeof guardianCandidates> = {};
    guardianCandidates.forEach(recipient => {
      const key = recipient.classId || 'unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(recipient);
    });
    return grouped;
  }, [guardianCandidates]);
  const toggleGuardianStudent = (studentId: string) => {
    const candidate = guardianCandidates.find(recipient => recipient.id === studentId);
    if (!candidate?.phone) return;
    setSelectedGuardianStudentIds(current =>
      current.includes(studentId) ? current.filter(id => id !== studentId) : [...current, studentId]
    );
  };
  const toggleGuardianClass = (classId: string) => {
    const classRecipientIds = (guardiansByClass[classId] || [])
      .filter(recipient => recipient.phone)
      .map(recipient => recipient.id);
    const allSelected = classRecipientIds.length > 0 && classRecipientIds.every(id => selectedGuardianStudentIds.includes(id));
    setSelectedGuardianStudentIds(current => {
      if (allSelected) return current.filter(id => !classRecipientIds.includes(id));
      return Array.from(new Set([...current, ...classRecipientIds]));
    });
  };
  const toggleGuardianClassExpand = (classId: string) => {
    setExpandedGuardianClassIds(current =>
      current.includes(classId) ? current.filter(id => id !== classId) : [...current, classId]
    );
  };
  const estimatedLinkCount = useMemo(() => {
    if (safeSendScheduleType === 'individual_teacher') {
      const perTeacher = safeSendAudience === 'teachers_admins' ? 2 : 1;
      return selectedSendTeacherIds.length * perTeacher;
    }
    if (safeSendScheduleType === 'individual_class') return selectedSendClassIds.length > 0 ? 1 : 0;
    return safeSendAudience === 'teachers_admins' ? 2 : 1;
  }, [safeSendScheduleType, safeSendAudience, selectedSendTeacherIds.length, selectedSendClassIds.length]);
  const modelTypeSummary = safeSendScheduleType === 'individual_teacher' && safeSendAudience === 'teachers'
    ? (teacherSendMode === '' ? 'اختر طريقة الإرسال' : teacherSendMode === 'view' ? 'اطلاع فقط' : 'توقيع إلكتروني بالاستلام')
    : safeSendScheduleType === 'individual_teacher' && safeSendAudience === 'teachers_admins'
      ? (teacherSendMode === '' ? 'اختر طريقة الإرسال' : teacherSendMode === 'view' ? 'اطلاع فقط' : 'توقيع إلكتروني للمعلمين واطلاع للإداريين')
      : 'اطلاع فقط';
  const sendChannelLabel = sendChannel === 'whatsapp' ? 'واتساب' : 'رسالة نصية';
  const previewModelButtonLabel = `معاينة ${selectedScheduleLabel || 'النموذج'}`;
  const recipientRoleLabels: Record<ShareRecipientRecord['role'], string> = {
    teacher: 'معلمين',
    admin: 'إداريين',
    guardian: 'أولياء أمور',
  };
  const getRecipientsPreview = (recipients: ShareRecipientRecord[]) => {
    if (recipients.length <= 3) {
      return recipients.map(item => item.name).join('، ') || 'لا يوجد مستلمين';
    }

    const groupedRoles = Array.from(new Set(recipients.map(item => item.role)));
    const roleText = groupedRoles.length === 1
      ? recipientRoleLabels[groupedRoles[0]]
      : groupedRoles.map(role => recipientRoleLabels[role]).join(' و');

    return `${roleText} (${recipients.length})`;
  };
  const printScheduleTypeOptions = useMemo(
    () => SCHEDULE_TYPES.map(item => ({ value: item.id, label: item.label })),
    []
  );
  const scheduleTypeOptions = useMemo(
    () => SCHEDULE_TYPES.map(item => ({ value: item.id, label: item.label, icon: item.icon })),
    []
  );
  const specializationNames = useMemo(
    () => Object.fromEntries(specializations.map(item => [item.id, item.name])),
    [specializations]
  );

  useEffect(() => {
    const allowed = ALLOWED_SEND_AUDIENCES[sendScheduleType];
    if (!allowed.includes(sendAudience)) {
      setSendAudience(allowed[0]);
    }
    setGeneratedLinks([]);
  }, [sendAudience, sendScheduleType, selectedSendTeacherIds, selectedSendAdminIds, selectedSendClassIds, teacherSendMode]);

  const isPrintGeneral = SCHEDULE_TYPES.find(item => item.id === printScheduleType)?.isGeneral;
  const selectedPrintCount =
    printScheduleType === 'individual_teacher'
      ? selectedPrintTeacherIds.length
      : printScheduleType === 'individual_class'
        ? selectedPrintClassIds.length
        : 0;

  useEffect(() => {
    if (selectedPrintCount === 0) return;
    if (individualPrintPerPage > Math.min(4, selectedPrintCount)) {
      setIndividualPrintPerPage(Math.min(4, selectedPrintCount));
    }
  }, [selectedPrintCount, individualPrintPerPage]);

  const parseKeyDetails = (key: string) => {
    const parts = key.split('-');
    return {
      teacherIdFromKey: parts[0],
      dayCode: parts[parts.length - 2],
      period: Number(parts[parts.length - 1]),
    };
  };

  const buildRowsForType = (type: ScheduleType, targetId?: string) => {
    const timetable = (scheduleSettings.timetable || {}) as TimetableData;

    return Object.entries(timetable).flatMap(([key, slot]) => {
      const safeSlot = slot as TimetableSlot;
      const { dayCode, period, teacherIdFromKey } = parseKeyDetails(key);
      const teacher = teachers.find(item => item.id === (safeSlot.teacherId || teacherIdFromKey));
      const currentClass = classes.find(item => item.id === safeSlot.classId);
      const subject = subjects.find(item => item.id === safeSlot.subjectId);
      const row = {
        اليوم: DAY_LABELS[dayCode] || dayCode,
        الحصة: period,
        المعلم: teacher?.name || '',
        الفصل: currentClass ? getClassLabel(currentClass) : '',
        المادة: subject?.name || '',
        النوع: safeSlot.type === 'waiting' ? 'انتظار' : 'درس',
      };

      if (type === 'general_teachers') return [row];
      if (type === 'general_waiting') return safeSlot.type === 'waiting' ? [row] : [];
      if (type === 'general_classes') return [row];
      if (type === 'individual_teacher') return safeSlot.teacherId === targetId ? [row] : [];
      if (type === 'individual_class') return safeSlot.classId === targetId ? [row] : [];
      return [];
    });
  };

  const handlePrint = () => {
    let jobs: PrintJob[] = [];

    if (printScheduleType === 'general_teachers' || printScheduleType === 'general_waiting' || printScheduleType === 'general_classes') {
      jobs = [{
        type: printScheduleType,
        label: SCHEDULE_TYPES.find(item => item.id === printScheduleType)?.label || printScheduleType,
        targetIds: [''],
      }];
    }

    if (printScheduleType === 'individual_teacher') {
      if (selectedPrintTeacherIds.length === 0) {
        showToast('اختر معلمًا واحدًا على الأقل.');
        return;
      }
      jobs = [{
        type: 'individual_teacher',
        label: 'جداول المعلمين',
        targetIds: selectedPrintTeacherIds,
      }];
    }

    if (printScheduleType === 'individual_class') {
      if (selectedPrintClassIds.length === 0) {
        showToast('اختر فصلًا واحدًا على الأقل.');
        return;
      }
      jobs = [{
        type: 'individual_class',
        label: 'جداول الفصول',
        targetIds: selectedPrintClassIds,
      }];
    }

    if (jobs.length === 0) return;

    const isIndividual = printScheduleType === 'individual_teacher' || printScheduleType === 'individual_class';
    const payload = {
      jobs,
      paperSize: isPrintGeneral ? paperSize : 'A4',
      colorMode: printColorMode,
      perPage: isIndividual ? individualPrintPerPage : 1,
    };
    const token = `print-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      localStorage.setItem(`${SCHEDULE_PRINT_REQUEST_PREFIX}${token}`, JSON.stringify(payload));
    } catch {
      showToast('تعذّر تجهيز الطباعة.');
      return;
    }
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('schedulePrint', token);
    // تفتح الطباعة في تبويب مستقل يطبع تلقائيًا؛ إغلاقه لا يؤثر على الموقع
    const opened = window.open(url.toString(), '_blank');
    if (!opened) showToast('فعّل النوافذ المنبثقة للسماح بفتح صفحة الطباعة.');
  };

  // يفتح نماذج التوقيع في تبويب مستقل يطبع تلقائيًا؛ إغلاقه لا يؤثر على الموقع
  const openSignaturePrint = (teacherIds: string[]) => {
    if (teacherIds.length === 0) return;
    const token = `sigprint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      localStorage.setItem(`${SCHEDULE_SIGNATURE_PRINT_REQUEST_PREFIX}${token}`, JSON.stringify({ teacherIds }));
    } catch {
      showToast('تعذّر تجهيز نماذج التوقيع.');
      return;
    }
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('scheduleSigPrint', token);
    const opened = window.open(url.toString(), '_blank');
    if (!opened) showToast('فعّل النوافذ المنبثقة للسماح بفتح صفحة الطباعة.');
  };

  const handlePrintDeliveryForms = () => {
    if (selectedDeliveryTeacherIds.length === 0) {
      showToast('اختر معلمًا واحدًا على الأقل لطباعة نموذج التسليم.');
      return;
    }

    openSignaturePrint(selectedDeliveryTeacherIds);
  };

  const handleExportExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const targetType = exportScheduleType;
      if (targetType === 'individual_teacher') {
        teachers.forEach(teacher => {
          const rows = buildRowsForType(targetType, teacher.id);
          if (rows.length > 0) {
            const sheet = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(workbook, sheet, sanitizeSheetName(teacher.name));
          }
        });
      } else if (targetType === 'individual_class') {
        sortedClasses.forEach(currentClass => {
          const rows = buildRowsForType(targetType, currentClass.id);
          if (rows.length > 0) {
            const sheet = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(workbook, sheet, sanitizeSheetName(getClassLabel(currentClass)));
          }
        });
      } else {
        const rows = buildRowsForType(targetType);
        const sheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ ملاحظة: 'لا توجد بيانات متاحة.' }]);
        XLSX.utils.book_append_sheet(workbook, sheet, sanitizeSheetName(SCHEDULE_TYPES.find(item => item.id === targetType)?.label || targetType));
      }

      XLSX.writeFile(workbook, `schedule_${schoolInfo.schoolName || 'school'}.xlsx`);
      showToast('تم تصدير Excel بنجاح.');
    } catch {
      showToast('تعذر تصدير Excel.');
    }
  };

  const handleExportXML = () => {
    try {
      const timetable = scheduleSettings.timetable || {};

      // مدرسة مشتركة + اختيار «ملف منفصل لكل مدرسة»: نقسّم الجدول حسب فصول كل مدرسة
      if (hasSharedSchools && exportXmlScope === 'separate') {
        const schoolDefs = [
          { id: 'main', name: schoolInfo.schoolName || 'المدرسة الأولى' },
          ...(schoolInfo.sharedSchools || []).map(s => ({ id: s.id, name: s.name })),
        ];
        let exported = 0;
        schoolDefs.forEach(def => {
          const schoolClassIds = new Set(
            classes.filter(c => c.schoolId === def.id || (!c.schoolId && def.id === 'main')).map(c => c.id)
          );
          const schoolTimetable = Object.fromEntries(
            Object.entries(timetable).filter(([, slot]) => slot.classId && schoolClassIds.has(slot.classId))
          ) as typeof timetable;
          if (Object.keys(schoolTimetable).length === 0) return;
          const xml = generateExtensionXML(schoolTimetable, teachers, subjects, classes, { ...schoolInfo, schoolName: def.name });
          downloadFile(xml, `schedule_${def.name || 'school'}.xml`, 'text/xml');
          exported++;
        });
        showToast(exported > 0 ? 'تم تصدير XML لكل مدرسة بنجاح.' : 'لا توجد بيانات للتصدير.');
        return;
      }

      const xml = generateExtensionXML(timetable, teachers, subjects, classes, schoolInfo);
      downloadFile(xml, `schedule_${schoolInfo.schoolName || 'school'}.xml`, 'text/xml');
      showToast('تم تصدير XML بنجاح.');
    } catch {
      showToast('تعذر تصدير XML.');
    }
  };

  const buildShareUrl = (
    type: ScheduleType,
    audience: ShareAudience,
    targetId: string | undefined,
    targetLabel: string,
    recipients: ShareRecipientRecord[],
    targetIds?: string[],
    persistShare = true
  ) => {
    const token = `schedule-share-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const currentSemester = schoolInfo.semesters?.find(item => item.id === schoolInfo.currentSemesterId) || schoolInfo.semesters?.[0];
    if (persistShare) {
      saveScheduleShare({
        token,
        type,
        audience,
        targetId,
        targetIds,
        targetLabel,
        title: targetIds && targetIds.length > 1
          ? targetLabel
          : targetId ? `${SCHEDULE_TYPES.find(item => item.id === type)?.label || type}: ${targetLabel}` : (SCHEDULE_TYPES.find(item => item.id === type)?.label || type),
        createdAt: new Date().toISOString(),
        schoolName: schoolInfo.schoolName,
        academicYear: schoolInfo.academicYear,
        semesterName: currentSemester?.name,
        recipients,
      });
    }
    return buildScheduleShareLink(`${window.location.origin}${window.location.pathname}`, token);
  };

  const buildTeacherSignatureUrl = (
    teacherId: string,
    persistSignatureRequest = true,
    batch?: { id: string; name: string; scheduleId?: string } | null,
  ) => {
    const teacher = teachers.find(item => item.id === teacherId);
    const token = createSignatureToken(teacherId);
    if (persistSignatureRequest) {
      const sendBatchId = batch?.id ?? PREVIEW_SIGNATURE_BATCH;
      const isPreview = sendBatchId === PREVIEW_SIGNATURE_BATCH;
      const existing = readScheduleSignatureRequests();
      // دفعات الإرسال الحقيقية تتراكم كسجلّات مستقلة؛ أمّا المعاينة فتُستبدل لنفس المعلم فقط.
      const requests = isPreview
        ? existing.filter(request => !(request.sendBatchId === PREVIEW_SIGNATURE_BATCH && request.teacherId === teacherId))
        : existing;
      requests.push({
        token,
        teacherId,
        teacherName: teacher?.name || 'معلم',
        createdAt: new Date().toISOString(),
        status: 'pending',
        sendBatchId,
        scheduleName: batch?.name,
        scheduleId: batch?.scheduleId,
      });
      writeScheduleSignatureRequests(requests);
    }

    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('scheduleSign', token);
    return url.toString();
  };

  const validateSendSelection = () => {
    if (!ALLOWED_SEND_AUDIENCES[sendScheduleType].includes(sendAudience)) {
      showToast('هذه الجهة غير متاحة لهذا النوع من الجداول.');
      return false;
    }
    if (sendScheduleType === 'individual_teacher' && selectedSendTeacherIds.length === 0) {
      showToast('اختر المعلمين المطلوب إرسال جداولهم.');
      return false;
    }
    if (
      sendScheduleType === 'individual_teacher' &&
      (sendAudience === 'teachers' || sendAudience === 'teachers_admins') &&
      teacherSendMode === ''
    ) {
      showToast('اختر طريقة الإرسال للمعلم (مع التوقيع أو بدون).');
      return false;
    }
    if (sendScheduleType === 'individual_class' && selectedSendClassIds.length === 0) {
      showToast('اختر الفصول المطلوب إرسال جداولها.');
      return false;
    }
    if (sendAudience === 'teachers' && selectedSendTeacherIds.length === 0) {
      showToast('اختر المعلمين المستلمين.');
      return false;
    }
    if (sendAudience === 'admins' && selectedSendAdminIds.length === 0) {
      showToast('اختر الإداريين المستلمين.');
      return false;
    }
    if (sendAudience === 'teachers_admins') {
      if (selectedSendTeacherIds.length === 0) {
        showToast('اختر المعلمين المطلوب تجهيز روابطهم.');
        return false;
      }
      if (selectedSendAdminIds.length === 0) {
        showToast('اختر الإداريين المستلمين.');
        return false;
      }
    }
    if (sendAudience === 'guardians' && selectedGuardianRecipients.length === 0) {
      showToast('لا توجد أرقام أولياء أمور مرتبطة بالفصول المحددة.');
      return false;
    }
    return true;
  };

  const createGeneratedLinks = (
    persistSignatureRequests = true,
    batch?: { id: string; name: string; scheduleId?: string } | null,
  ) => {
    const links: GeneratedLink[] = [];

    if (sendScheduleType === 'individual_teacher') {
      selectedSendTeacherIds.forEach(teacherId => {
        const teacher = teachers.find(item => item.id === teacherId);
        const targetLabel = teacher?.name || 'معلم';
        const teacherRecipients = selectedRecipients.filter(item => item.role === 'teacher' && item.id === teacherId);
        const adminRecipients = selectedRecipients.filter(item => item.role === 'admin');

        if ((sendAudience === 'teachers' || sendAudience === 'teachers_admins') && teacherRecipients.length > 0) {
          links.push({
            label: `جدول ${targetLabel}`,
            url: teacherSendMode === 'view'
              ? buildShareUrl('individual_teacher', 'teachers', teacherId, targetLabel, teacherRecipients, undefined, persistSignatureRequests)
              : buildTeacherSignatureUrl(teacherId, persistSignatureRequests, batch),
            ...(teacherSendMode === 'view' ? {} : { teacherId }),
            targetId: teacherId,
            targetLabel,
            recipients: teacherRecipients,
          });
        }

        if ((sendAudience === 'admins' || sendAudience === 'teachers_admins') && adminRecipients.length > 0) {
          links.push({
            label: `جدول ${targetLabel}`,
            url: buildShareUrl('individual_teacher', 'admins', teacherId, targetLabel, adminRecipients, undefined, persistSignatureRequests),
            targetId: teacherId,
            targetLabel,
            recipients: adminRecipients,
          });
        }
      });
      return links;
    }

    if (sendScheduleType === 'individual_class') {
      const selectedClasses = selectedSendClassIds
        .map(classId => classes.find(item => item.id === classId))
        .filter((item): item is ClassInfo => Boolean(item));
      const targetLabel = selectedClasses.length === 1
        ? getClassLabel(selectedClasses[0])
        : `جداول الفصول (${selectedSendClassIds.length})`;
      const recipients = sendAudience === 'guardians'
        ? selectedGuardianRecipients
        : selectedRecipients;
      links.push({
        label: selectedClasses.length === 1 ? `جدول فصل: ${targetLabel}` : targetLabel,
        url: buildShareUrl(
          'individual_class',
          sendAudience as ShareAudience,
          selectedSendClassIds[0],
          targetLabel,
          recipients,
          selectedSendClassIds,
          persistSignatureRequests
        ),
        targetId: selectedSendClassIds[0],
        targetLabel,
        recipients,
      });
      return links;
    }

    const targetLabel = selectedScheduleLabel;
    if (sendAudience === 'teachers_admins') {
      const teacherRecipients = selectedRecipients.filter(item => item.role === 'teacher');
      const adminRecipients = selectedRecipients.filter(item => item.role === 'admin');
      if (teacherRecipients.length > 0) {
        links.push({
          label: targetLabel,
          url: buildShareUrl(sendScheduleType, 'teachers', undefined, targetLabel, teacherRecipients, undefined, persistSignatureRequests),
          targetLabel,
          recipients: teacherRecipients,
        });
      }
      if (adminRecipients.length > 0) {
        links.push({
          label: targetLabel,
          url: buildShareUrl(sendScheduleType, 'admins', undefined, targetLabel, adminRecipients, undefined, persistSignatureRequests),
          targetLabel,
          recipients: adminRecipients,
        });
      }
      return links;
    }

    links.push({
      label: targetLabel,
      url: buildShareUrl(sendScheduleType, sendAudience as ShareAudience, undefined, targetLabel, selectedRecipients, undefined, persistSignatureRequests),
      targetLabel,
      recipients: selectedRecipients,
    });
    return links;
  };

  const buildMessageComposerDraft = (links: GeneratedLink[]): MessageComposerDraft => {
    const recipientMap = new Map<string, { recipient: ShareRecipientRecord; links: GeneratedLink[] }>();

    links.forEach(link => {
      link.recipients.forEach(recipient => {
        const current = recipientMap.get(recipient.id);
        if (current) {
          current.links.push(link);
        } else {
          recipientMap.set(recipient.id, { recipient, links: [link] });
        }
      });
    });

    const currentSemester = schoolInfo.semesters?.find(item => item.id === schoolInfo.currentSemesterId) || schoolInfo.semesters?.[0];
    const now = new Date();
    const dayLabel = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(now);
    const dateLabel = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { dateStyle: 'medium' }).format(now);
    const linksByRecipientId = Object.fromEntries(
      Array.from(recipientMap.values()).map(({ recipient, links: recipientLinks }) => {
        return [recipient.id, recipientLinks.map(link => `${link.label}: ${link.url}`).join('\n')];
      })
    );
    const previewUrlByRecipientId = Object.fromEntries(
      Array.from(recipientMap.values()).map(({ recipient, links: recipientLinks }) => [recipient.id, recipientLinks[0]?.url || ''])
    );

    const recipients = Array.from(recipientMap.values()).map(({ recipient }) => ({
      id: recipient.id,
      name: recipient.name,
      phone: recipient.phone,
      role: recipient.role,
      classId: recipient.classId,
      classLabel: recipient.classLabel,
    }));

    const group: MessageComposerDraft['group'] =
      sendAudience === 'teachers_admins' ? 'staff' :
      sendAudience === 'teachers' ? 'teachers' :
      sendAudience === 'admins' ? 'admins' :
      'parents';
    const schedTypeLabel = SCHEDULE_TYPES.find(item => item.id === sendScheduleType)?.label || 'الجدول';
    // {اسم_المستلم} و{روابط_الجداول} يبقيان رمزين هنا ويُعبَّآن لكل مستلم عند الإرسال
    const content = fillMessageTemplate(getMessageTemplate('schedule/send'), {
      'اسم_المدرسة': schoolInfo.schoolName || 'المدرسة',
      'اليوم': dayLabel,
      'التاريخ': dateLabel,
      'الفصل_الدراسي': currentSemester?.name || '-',
      'نوع_الجدول': schedTypeLabel,
    });

    return {
      id: `schedule-draft-${Date.now()}`,
      title: selectedScheduleLabel,
      group,
      recipients,
      content,
      linksByRecipientId,
      previewUrlByRecipientId,
      channel: sendChannel,
      source: sendScheduleType === 'general_waiting' ? 'waiting' : 'general',
      senderRole: 'إرسال الجداول',
    };
  };

  useEffect(() => {
    if (taskMode !== 'send') return;
    const allowed = ALLOWED_SEND_AUDIENCES[safeSendScheduleType] || [];
    const hasValidAudience = allowed.includes(safeSendAudience);
    const hasTeacherTargets = safeSendScheduleType !== 'individual_teacher' || selectedSendTeacherIds.length > 0;
    const hasClassTargets = safeSendScheduleType !== 'individual_class' || selectedSendClassIds.length > 0;
    const hasRecipients =
      (safeSendAudience === 'teachers' && selectedSendTeacherIds.length > 0) ||
      (safeSendAudience === 'admins' && selectedSendAdminIds.length > 0) ||
      (safeSendAudience === 'teachers_admins' && selectedSendTeacherIds.length > 0 && selectedSendAdminIds.length > 0) ||
      (safeSendAudience === 'guardians' && selectedGuardianRecipients.length > 0);

    if (!hasValidAudience || !hasTeacherTargets || !hasClassTargets || !hasRecipients) {
      setGeneratedLinks([]);
      setModalMessageContent('');
      return;
    }

    const links = createGeneratedLinks(false);
    setGeneratedLinks(links);
    setModalMessageContent(buildMessageComposerDraft(links).content);
  }, [
    taskMode,
    safeSendScheduleType,
    safeSendAudience,
    selectedSendTeacherIds,
    selectedSendAdminIds,
    selectedSendClassIds,
    selectedGuardianRecipients,
    sendChannel,
    schoolInfo.schoolName,
    schoolInfo.currentSemesterId,
  ]);

  const buildSendPayloads = (links: GeneratedLink[], contentOverride?: string) => {
    const draft = buildMessageComposerDraft(links);
    const templateContent = contentOverride ?? draft.content;
    const batchId = `schedule-batch-${Date.now()}`;
    const now = new Date();
    const dayLabel = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(now);
    const dateLabel = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { dateStyle: 'medium' }).format(now);
    const scheduleTypeLabel = SCHEDULE_TYPES.find(item => item.id === sendScheduleType)?.label || 'الجدول';
    return draft.recipients.map(recipient => {
      const recipientLinkText = draft.linksByRecipientId?.[recipient.id] || '';
      // الاسم في نص الرسالة يُختصر (أول+أخير) لتقليل التكلفة؛ يبقى كاملاً في الجداول والأرشيف
      const shortName = shortenRecipientName(recipient.name);
      const personalContent = templateContent
        .replace(/\{اسم_المعلم\}/g, shortName)
        .replace(/\{اسم_الإداري\}/g, shortName)
        .replace(/\{اسم_الطالب\}/g, recipient.classLabel || shortName)
        .replace(/\{اسم_المستلم\}/g, shortName)
        .replace(/\{روابط_الجداول\}/g, recipientLinkText)
        .replace(/\{اسم_المدرسة\}/g, schoolInfo.schoolName || 'المدرسة')
        .replace(/\{اليوم\}/g, dayLabel)
        .replace(/\{التاريخ\}/g, dateLabel)
        .replace(/\{نوع_الجدول\}/g, scheduleTypeLabel);
      // شبكة أمان: تُزال أي رموز {…} لم تُعبَّأ حتى لا تخرج رسالة بأقواس مكسورة
      const safeContent = stripUnfilledTokens(personalContent);
      const recipientLinks = links.filter(link => link.recipients.some(r => r.id === recipient.id));
      return {
        recipientInfo: recipient,
        message: {
          batchId,
          senderRole: 'إرسال الجداول',
          source: (sendScheduleType === 'general_waiting' ? 'waiting' : 'general') as CentralMessage['source'],
          recipientId: recipient.id,
          recipientName: recipient.name,
          recipientPhone: recipient.phone,
          recipientRole: recipient.role as CentralMessage['recipientRole'],
          content: safeContent,
          channel: sendChannel,
          attachments: recipientLinks.map(link => ({
            name: link.label,
            url: link.url,
            type: link.teacherId ? 'schedule-signature-link' : 'schedule-share-link',
          })),
        } satisfies Omit<CentralMessage, 'id' | 'timestamp' | 'status' | 'retryCount'>,
      };
    });
  };

  const handleSendDirectly = async () => {
    if (!validateSendSelection()) return;
    if (!modalMessageContent.trim()) { showToast('نص الرسالة فارغ.'); return; }
    const activeSchedule = (scheduleSettings.savedSchedules || []).find(s => s.id === scheduleSettings.activeScheduleId);
    const sendBatch = {
      id: `sigbatch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: activeSchedule?.name || selectedScheduleLabel || 'الجدول',
      scheduleId: activeSchedule?.id,
    };
    const links = createGeneratedLinks(true, sendBatch);
    setGeneratedLinks(links);
    const payloads = buildSendPayloads(links, modalMessageContent);

    // ── إرسال مجدوَل: نسلّم الدفعة لمنفّذ الجدولة في سياق الرسائل ──
    if (isSendScheduled) {
      if (!sendScheduleDate) { showToast('حدّد تاريخ الجدولة.'); return; }
      const scheduledFor = new Date(`${sendScheduleDate}T${sendScheduleTime || '08:00'}:00`);
      if (Number.isNaN(scheduledFor.getTime())) { showToast('تاريخ أو وقت الجدولة غير صالح.'); return; }
      if (scheduledFor.getTime() <= Date.now()) { showToast('وقت الجدولة يجب أن يكون في المستقبل.'); return; }
      scheduleMessage({
        scheduledFor: scheduledFor.toISOString(),
        fallbackToSms: sendChannel === 'whatsapp' && fallbackToSms,
        messages: payloads.map(payload => payload.message),
      });
      setSigReceiptRequests(readScheduleSignatureRequests());
      const whenLabel = new Intl.DateTimeFormat(
        sendScheduleCalendarType === 'hijri' ? 'ar-SA-u-ca-islamic' : 'ar-SA',
        { dateStyle: 'medium', timeStyle: 'short' }
      ).format(scheduledFor);
      showToast(`تمت جدولة إرسال ${payloads.length} رسالة في ${whenLabel}.`);
      return;
    }

    setIsSendingNow(true);
    const results: typeof sendModalResults = [];
    for (const payload of payloads) {
      const response = await sendMessage(payload.message, sendChannel === 'whatsapp' && fallbackToSms);
      results.push({
        id: payload.recipientInfo.id,
        name: payload.recipientInfo.name,
        phone: payload.recipientInfo.phone,
        status: response.status === 'sent' ? 'sent' : 'failed',
        channel: response.channel,
        timestamp: response.timestamp,
        failureReason: response.failureReason,
      });
    }
    setSendModalResults(results);
    setShowSendResultsModal(true);
    setIsSendingNow(false);
    setSigReceiptRequests(readScheduleSignatureRequests());
    const sentCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.length - sentCount;
    showToast(
      failedCount > 0
        ? `تم الإرسال إلى ${sentCount} وتعذر الإرسال إلى ${failedCount}.`
        : `تم إرسال جميع الجداول بنجاح إلى ${sentCount} مستلمًا.`
    );
  };

  const openFirstGeneratedModel = () => {
    if (!validateSendSelection()) return;

    // معاينة فقط: تُحفظ الطلبات بدفعة 'preview' لتعمل الروابط دون أن تلوّث سجل الاستلام.
    const links = createGeneratedLinks(true, null);
    setGeneratedLinks(links);
    const firstLink = links[0];
    if (!firstLink?.url) {
      showToast('تعذر تجهيز رابط المعاينة.');
      return;
    }

    window.open(firstLink.url, '_blank');
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast('تم نسخ الرابط.');
    } catch {
      showToast('تعذر نسخ الرابط.');
    }
  };

  const openWhatsApp = (link: GeneratedLink) => {
    const message = `تم تجهيز ${link.label}\n${link.url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const openSMS = (link: GeneratedLink) => {
    const message = `تم تجهيز ${link.label}\n${link.url}`;
    window.open(`sms:?&body=${encodeURIComponent(message)}`, '_blank');
  };

  const copyAllLinks = async () => {
    try {
      const payload = generatedLinks.map(link => `${link.label}\n${link.url}`).join('\n\n');
      await navigator.clipboard.writeText(payload);
      showToast('تم نسخ جميع الروابط.');
    } catch {
      showToast('تعذر نسخ جميع الروابط.');
    }
  };

  const openWhatsAppForAll = () => {
    generatedLinks.forEach(link => openWhatsApp(link));
    showToast(`تم فتح ${generatedLinks.length} رسالة واتساب.`);
  };

  const openSMSForAll = () => {
    generatedLinks.forEach(link => openSMS(link));
    showToast(`تم فتح ${generatedLinks.length} رسالة نصية.`);
  };

  if (!hasSchedule) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm p-12 text-center">
        <AlertTriangle className="mx-auto mb-5 text-slate-400" size={36} />
        <h3 className="text-xl font-black text-slate-800 mb-2">لا يوجد جدول للطباعة أو التصدير</h3>
        <p className="text-sm text-slate-500 font-medium mb-6">يجب إنشاء جدول الحصص أولًا قبل تنفيذ هذه المهام</p>
        <button
          onClick={() => onNavigate('create')}
          className="inline-flex items-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 transition-all"
        >
          <Sparkles size={16} />
          انتقل لإنشاء الجدول
          <ArrowLeft size={14} />
        </button>
      </div>
    );
  }

  if (signaturePrintTeacherIds) {
    return (
      <SignaturePrintWorkspace
        teacherIds={signaturePrintTeacherIds}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        specializationNames={specializationNames}
        settings={scheduleSettings}
        schoolInfo={schoolInfo}
        sigRequests={sigReceiptRequests}
        onBack={() => setSignaturePrintTeacherIds(null)}
      />
    );
  }

  if (summaryPrintRequests !== null) {
    return (
      <SignatureSummaryPrintWorkspace
        requests={summaryPrintRequests}
        schoolInfo={schoolInfo}
        onDone={() => setSummaryPrintRequests(null)}
      />
    );
  }

  if (sigReceiptModalOpen) {
    // ── تجميع الطلبات في دفعات إرسال مستقلة (تُستثنى دفعات المعاينة) ──
    const sigCalendarType = (schoolInfo.calendarType || schoolInfo.semesters?.[0]?.calendarType || 'hijri') as 'hijri' | 'gregorian';
    const formatBatchSent = (iso: string) => {
      const d = new Date(iso);
      const locale = sigCalendarType === 'hijri' ? 'ar-SA-u-ca-islamic-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn';
      // نستخرج المقاطع لاستبعاد لاحقة الحقبة التي يضيفها Intl تلقائيًّا (تفاديًا لتكرار «هـ»).
      const parts = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(d);
      const pick = (type: string) => parts.find(p => p.type === type)?.value || '';
      const datePart = `${pick('day')} / ${pick('month')} / ${pick('year')}`;
      const timePart = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: true }).format(d);
      const era = sigCalendarType === 'hijri' ? 'هـ' : 'م';
      return `${datePart}${era} - ${timePart}`;
    };
    const savedSchedulesList = scheduleSettings.savedSchedules || [];

    const batchMap = new Map<string, { id: string; scheduleId?: string; name?: string; sentAt: string; requests: ScheduleSignatureRequest[] }>();
    sigReceiptRequests
      .filter(r => r.sendBatchId !== PREVIEW_SIGNATURE_BATCH)
      .forEach(r => {
        const id = r.sendBatchId || 'legacy';
        const existing = batchMap.get(id);
        if (existing) {
          existing.requests.push(r);
          if (r.createdAt < existing.sentAt) existing.sentAt = r.createdAt;
        } else {
          batchMap.set(id, {
            id,
            scheduleId: r.scheduleId,
            name: r.scheduleName,
            sentAt: r.createdAt,
            requests: [r],
          });
        }
      });
    const batches = Array.from(batchMap.values()).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    const activeBatchId = batches.some(b => b.id === selectedSigBatchId)
      ? selectedSigBatchId
      : (batches[0]?.id || '');
    const activeBatch = batches.find(b => b.id === activeBatchId) || null;
    const batchRequests = activeBatch?.requests || [];

    // الاسم الحيّ من الجداول المحفوظة (يتحدّث عند إعادة التسمية)، ثم المختوم، ثم احتياطي عام.
    const resolveBatchName = (b: { scheduleId?: string; name?: string }) =>
      (b.scheduleId ? savedSchedulesList.find(s => s.id === b.scheduleId)?.name : undefined) || b.name || 'جدول مُرسَل';
    const batchOptions: DropdownOption[] = batches.map(b => {
      const isAdopted = !!b.scheduleId && b.scheduleId === scheduleSettings.activeScheduleId;
      return {
        value: b.id,
        label: `${resolveBatchName(b)}${isAdopted ? ' (المعتمد)' : ''} · أُرسل ${formatBatchSent(b.sentAt)}`,
      };
    });

    const filteredReceipts = batchRequests.filter(r =>
      (sigFilter === 'all' || r.status === sigFilter) &&
      (sigSearch.trim() === '' || r.teacherName.includes(sigSearch.trim()))
    );
    const signedCount = batchRequests.filter(r => r.status === 'signed').length;
    const pendingCount = batchRequests.filter(r => r.status === 'pending').length;

    return (
      <div className="space-y-5" dir="rtl">
        {/* Header */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSigReceiptModalOpen(false)}
              title="رجوع"
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-slate-50 transition-all"
            >
              <ArrowRight size={18} />
            </button>
            <div>
              <h2 className="font-black text-slate-800 text-lg">سجل استلام المعلمين للجداول</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {signedCount} وقّع من أصل {batchRequests.length} معلم
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'إجمالي المعلمين', value: String(batchRequests.length), icon: Users },
            { label: 'وقّع', value: String(signedCount), icon: CheckCircle2 },
            { label: 'لم يوقّع', value: String(pendingCount), icon: AlertCircle },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-2xl px-4 py-5 flex items-start gap-3"
              style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}
            >
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

        {/* Actions */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex flex-wrap items-center gap-2">
            <SingleSelectDropdown
              label=""
              value={activeBatchId}
              options={batchOptions}
              placeholder="اختر دفعة الإرسال"
              onChange={setSelectedSigBatchId}
              disabled={batchOptions.length === 0}
              minWidthClass="min-w-[260px] max-w-[400px]"
            />
            <button
              type="button"
              onClick={() => { setSigSearch(''); setSigFilter('all'); setSigReceiptRequests(readScheduleSignatureRequests()); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all"
            >
              <RefreshCw size={15} />
              تحديث
            </button>
            <button
              type="button"
              onClick={() => {
                if (filteredReceipts.length > 0) setSummaryPrintRequests(filteredReceipts);
                else showToast('لا توجد بيانات للطباعة.');
              }}
              disabled={batchRequests.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50"
            >
              <Printer size={15} />
              طباعة سجل الاستلام
            </button>
            <button
              type="button"
              onClick={() => {
                const ids = filteredReceipts.map(r => r.teacherId).filter(Boolean);
                if (ids.length > 0) openSignaturePrint(ids);
                else showToast('لا توجد نماذج للطباعة.');
              }}
              disabled={batchRequests.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50"
            >
              <Printer size={15} />
              طباعة نماذج التكليف
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
              <input
                type="text"
                value={sigSearch}
                onChange={e => setSigSearch(e.target.value)}
                placeholder="ابحث عن معلم..."
                className="w-full pr-8 pl-7 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#655ac1] focus:bg-white transition-all"
                dir="rtl"
              />
              {sigSearch && (
                <button
                  type="button"
                  onClick={() => setSigSearch('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'signed', 'pending'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSigFilter(f)}
                  className={`px-4 py-2 rounded-xl border text-xs font-black transition-all ${
                    sigFilter === f
                      ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1]'
                  }`}
                >
                  {f === 'all' ? 'الكل' : f === 'signed' ? 'وقّع' : 'لم يوقّع'}
                </button>
              ))}
            </div>
          </div>
          {batches.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="mx-auto mb-4 text-slate-300" size={40} />
              <p className="text-sm font-bold text-slate-400">لا توجد جداول مُرسلة للتوقيع بعد.</p>
              <p className="text-xs text-slate-400 mt-1">أرسل جدول معلم لتظهر هنا بيانات الاستلام.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] table-fixed text-right whitespace-nowrap" dir="rtl">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[13px] text-center w-[7%]">م</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] w-[28%]">اسم المعلم</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] w-[18%]">تاريخ الإرسال</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] w-[13%]">التوقيع</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] w-[18%]">تاريخ التوقيع</th>
                    <th className="px-3 py-3 font-black text-[#655ac1] text-[13px] text-center w-[16%]">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts.map((req, idx) => (
                    <tr key={req.token} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-2 py-3 text-center align-middle">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 text-slate-400 text-xs font-bold">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-black text-slate-800 text-[12px] truncate" title={req.teacherName}>{req.teacherName}</td>
                      <td className="px-3 py-3 text-slate-600 text-[12px] font-bold truncate">
                        {new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { dateStyle: 'medium' }).format(new Date(req.createdAt))}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border ${
                          req.status === 'signed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {req.status === 'signed' ? 'وقّع' : 'لم يوقّع'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500 text-[10px] truncate">
                        {req.signedAt
                          ? new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(req.signedAt))
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => { openSignaturePrint([req.teacherId]); }}
                          title="عرض وطباعة نموذج الاطلاع على الجدول والتوقيع"
                          className="mx-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all whitespace-nowrap"
                        >
                          <Eye size={14} />
                          عرض وطباعة
                        </button>
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

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl font-bold shadow-2xl bg-emerald-500 text-white animate-in slide-in-from-bottom-5">
            {toast}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* الإجراءات الثانوية للإرسال — التنقّل الرئيسي يُدار من شريط المرحلة الموحّد في ScheduleV2Preview */}
      {taskMode === 'send' && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-5">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => { setSigReceiptRequests(readScheduleSignatureRequests()); setSigReceiptModalOpen(true); }}
              className={actionButtonClass(false)}
            >
              <ClipboardList size={17} />
              سجل استلام المعلمين للجداول
            </button>
            <button
              type="button"
              onClick={onOpenMessagesArchive}
              disabled={!onOpenMessagesArchive}
              className={`${actionButtonClass(false)} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Archive size={17} />
              أرشيف الرسائل
            </button>
          </div>
        </div>
      )}

      {taskMode === 'preview' && (
        <div className="space-y-4">
          <div className="px-1">
            <h3 className="font-black text-slate-800 text-lg">معاينة الجدول</h3>
          </div>
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-start gap-3 mb-2">
              <CalendarDays size={20} className="text-[#655ac1]" />
              <h4 className="font-black text-slate-800">نوع الجدول</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium text-right mb-5">
              اختر نوع الجدول الذي تريد معاينته ليظهر لك
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[260px]">
                <SingleSelectDropdown
                  label=""
                  value={previewScheduleType}
                  onChange={value => setPreviewScheduleType(value as ScheduleType)}
                  placeholder="اختر نوع الجدول"
                  options={printScheduleTypeOptions}
                />
              </div>
              {previewScheduleType === 'individual_teacher' && (
                <div className="min-w-[260px]">
                  <MultiSelectDropdown
                    label="المعلمون"
                    buttonLabel="اختر المعلمين"
                    selectedSummary={previewTeacherIds.length > 0 ? `${previewTeacherIds.length} معلمين محددين` : undefined}
                    options={teacherOptions}
                    selectedValues={previewTeacherIds}
                    onToggle={value => setPreviewTeacherIds(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])}
                    onClear={() => setPreviewTeacherIds([])}
                    onSelectAll={() => setPreviewTeacherIds(teachers.map(item => item.id))}
                    searchable
                  />
                </div>
              )}
              {previewScheduleType === 'individual_class' && (
                <div className="min-w-[260px]">
                  <MultiSelectDropdown
                    label="الفصول"
                    buttonLabel="اختر الفصول"
                    selectedSummary={previewClassIds.length > 0 ? `${previewClassIds.length} فصول محددة` : undefined}
                    options={classOptions}
                    selectedValues={previewClassIds}
                    onToggle={value => setPreviewClassIds(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])}
                    onClear={() => setPreviewClassIds([])}
                    onSelectAll={() => setPreviewClassIds(sortedClasses.map(item => item.id))}
                    searchable
                  />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
            {!hasSchedule ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                <AlertCircle size={36} className="mb-3 text-slate-300" />
                <p className="font-bold">لا يوجد جدول لعرضه. يرجى إنشاء الجدول أولاً.</p>
              </div>
            ) : previewScheduleType === 'individual_teacher' ? (
              previewTeacherIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                  <User size={36} className="mb-3 text-slate-300" />
                  <p className="font-bold">اختر معلمًا أو أكثر لعرض جداولهم.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4 justify-start">
                  {previewTeacherIds.map(id => (
                    <div key={id} className="flex-1 min-w-[520px] max-w-[680px] rounded-2xl border border-slate-100 overflow-hidden bg-white p-3">
                      <InlineScheduleView
                        type="individual_teacher"
                        settings={scheduleSettings}
                        teachers={teachers}
                        classes={classes}
                        subjects={subjects}
                        specializationNames={specializationNames}
                        targetId={id}
                        showWaitingManagement={false}
                        compactIndividual
                        unifiedIndividual
                        hideHeaderActionButton
                      />
                    </div>
                  ))}
                </div>
              )
            ) : previewScheduleType === 'individual_class' ? (
              previewClassIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                  <BookOpen size={36} className="mb-3 text-slate-300" />
                  <p className="font-bold">اختر فصلاً أو أكثر لعرض جداولها.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4 justify-start">
                  {previewClassIds.map(id => (
                    <div key={id} className="flex-1 min-w-[520px] max-w-[680px] rounded-2xl border border-slate-100 overflow-hidden bg-white p-3">
                      <InlineScheduleView
                        type="individual_class"
                        settings={scheduleSettings}
                        teachers={teachers}
                        classes={classes}
                        subjects={subjects}
                        specializationNames={specializationNames}
                        targetId={id}
                        showWaitingManagement={false}
                        compactIndividual
                        unifiedIndividual
                        hideHeaderActionButton
                      />
                    </div>
                  ))}
                </div>
              )
            ) : (
              <InlineScheduleView
                type={previewScheduleType}
                settings={scheduleSettings}
                teachers={teachers}
                classes={classes}
                subjects={subjects}
                specializationNames={specializationNames}
                showWaitingManagement={false}
                hideHeaderActionButton
              />
            )}
          </div>
        </div>
      )}

      {taskMode === 'print' && (
        <div className="space-y-4">
          <div className="px-1">
            <h3 className="font-black text-slate-800 text-lg">الطباعة</h3>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">

            {/* بطاقة نوع الجدول */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm min-h-[300px]">
              <div className="flex items-center justify-start gap-3 mb-2">
                <CalendarDays size={20} className="text-[#655ac1]" />
                <h4 className="font-black text-slate-800">نوع الجدول</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium text-right mb-5">
                اختر نوع الجدول الذي تريد طباعته ثم حدّد عناصره إذا كان فردياً.
              </p>
              <div className="space-y-4">
                <div className="[&_label]:hidden">
                  <SingleSelectDropdown
                    label="نوع الجداول"
                    value={printScheduleType}
                    onChange={value => setPrintScheduleType(value as ScheduleType)}
                    placeholder="اختر نوع الجداول"
                    options={printScheduleTypeOptions}
                  />
                </div>
                {printScheduleType === 'individual_teacher' && (
                  <MultiSelectDropdown
                    label="المعلمون"
                    buttonLabel="اختر المعلمين"
                    selectedSummary={selectedPrintTeacherIds.length > 0 ? `${selectedPrintTeacherIds.length} معلمين محددين` : undefined}
                    options={teacherOptions}
                    selectedValues={selectedPrintTeacherIds}
                    onToggle={value => setSelectedPrintTeacherIds(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])}
                    onClear={() => setSelectedPrintTeacherIds([])}
                    onSelectAll={() => setSelectedPrintTeacherIds(teachers.map(item => item.id))}
                    searchable
                  />
                )}
                {printScheduleType === 'individual_class' && (
                  <MultiSelectDropdown
                    label="الفصول"
                    buttonLabel="اختر الفصول"
                    selectedSummary={selectedPrintClassIds.length > 0 ? `${selectedPrintClassIds.length} فصول محددة` : undefined}
                    options={classOptions}
                    selectedValues={selectedPrintClassIds}
                    onToggle={value => setSelectedPrintClassIds(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])}
                    onClear={() => setSelectedPrintClassIds([])}
                    onSelectAll={() => setSelectedPrintClassIds(sortedClasses.map(item => item.id))}
                    searchable
                  />
                )}
              </div>
            </div>

            {/* بطاقة تخصيص الطباعة (عامة) + زر طباعة */}
            {isPrintGeneral && (
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm min-h-[300px] flex flex-col">
                <div className="flex items-center justify-start gap-3 mb-2">
                  <SlidersHorizontal size={20} className="text-[#655ac1]" />
                  <h4 className="font-black text-slate-800">تخصيص الطباعة</h4>
                </div>
                <p className="text-xs text-slate-500 font-medium text-right mb-5">
                  اضبط شكل الورقة وإخراج الألوان قبل فتح صفحة الطباعة.
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
                </div>
                <button
                  onClick={handlePrint}
                  className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all"
                >
                  <Printer size={15} />
                  طباعة
                </button>
              </div>
            )}

            {/* بطاقة تخصيص الطباعة (فردية) + زر طباعة */}
            {(printScheduleType === 'individual_teacher' || printScheduleType === 'individual_class') && (
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm min-h-[300px] flex flex-col">
                <div className="flex items-center justify-start gap-3 mb-2">
                  <SlidersHorizontal size={20} className="text-[#655ac1]" />
                  <h4 className="font-black text-slate-800">تخصيص الطباعة</h4>
                </div>
                <p className="text-xs text-slate-500 font-medium text-right mb-5">
                  اختر اللون وعدد الجداول المعروضة في الصفحة.
                </p>
                <div className="flex flex-wrap items-end gap-4 mb-5">
                  <SingleSelectDropdown
                    label="اللون"
                    value={printColorMode}
                    onChange={value => setPrintColorMode(value as PrintColorMode)}
                    placeholder="اختر اللون"
                    options={[{ value: 'color', label: 'ملون' }, { value: 'bw', label: 'أبيض وأسود' }]}
                  />
                  <NumberChoiceButtons
                    count={Math.max(1, Math.min(4, selectedPrintCount))}
                    value={individualPrintPerPage}
                    onChange={setIndividualPrintPerPage}
                  />
                </div>
                <button
                  onClick={handlePrint}
                  className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all"
                >
                  <Printer size={15} />
                  طباعة
                </button>
              </div>
            )}

            {/* بطاقة نموذج تسليم جدول معلم للتوقيع */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm min-h-[300px] flex flex-col">
              <div className="flex items-center justify-start gap-3 mb-2">
                <CheckCircle2 size={20} className="text-[#655ac1]" />
                <h4 className="font-black text-slate-800">نموذج تسليم جدول معلم للتوقيع</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium text-right mb-5">
                اطبع نموذج التسليم الورقي الرسمي لمعلم أو لجميع المعلمين
              </p>
              <div className="space-y-4 flex-1">
                <MultiSelectDropdown
                  label="المعلمون"
                  buttonLabel="اختر المعلمين"
                  selectedSummary={selectedDeliveryTeacherIds.length > 0 ? `${selectedDeliveryTeacherIds.length} معلمين محددين` : undefined}
                  options={teacherOptions}
                  selectedValues={selectedDeliveryTeacherIds}
                  onToggle={value => setSelectedDeliveryTeacherIds(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])}
                  onClear={() => setSelectedDeliveryTeacherIds([])}
                  onSelectAll={() => setSelectedDeliveryTeacherIds(teachers.map(item => item.id))}
                  searchable
                  dropdownPlacement="top"
                />
              </div>
              <button
                type="button"
                onClick={handlePrintDeliveryForms}
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all"
              >
                <Printer size={15} />
                طباعة نموذج التسليم
              </button>
            </div>

          </div>
        </div>
      )}

      {taskMode === 'send' && (
        <SendPanelErrorBoundary>
        <div className="space-y-4">
          <div className="px-1">
            <h3 className="font-black text-slate-800 text-lg">إرسال الجداول</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

            {/* === العمود الأيمن: نوع الجدول + المستلمون === */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-start gap-3 mb-2">
                <CalendarDays size={20} className="text-[#655ac1]" />
                <h4 className="font-black text-slate-800">اختر نوع الجدول والمستلمين</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium text-right mb-5">
                اختر نوع الجدول أولاً ثم حدد المستلمين من القوائم أدناه.
              </p>
              <div className="space-y-4">
                <SingleSelectDropdown
                  label="نوع الجدول"
                  value={sendScheduleType}
                  onChange={value => setSendScheduleType(value as ScheduleType)}
                  placeholder="اختر الجدول"
                  options={SCHEDULE_TYPES.map(item => ({ value: item.id, label: item.label }))}
                />
                <MultiSelectDropdown
                  label="المستلمون"
                  buttonLabel="اختر الجهة"
                  selectedSummary={selectedAudienceSummary}
                  options={recipientAudienceOptions}
                  selectedValues={selectedAudienceValues}
                  onToggle={toggleSendAudience}
                  onClear={() => setSendAudience('teachers')}
                  hideSelectAll
                  closeOnToggle
                />
                {(safeSendScheduleType === 'individual_teacher' || safeSendAudience === 'teachers' || safeSendAudience === 'teachers_admins') && (
                  <MultiSelectDropdown
                    label={safeSendScheduleType === 'individual_teacher' ? 'المعلمون المستهدفون' : 'المعلمون المستلمون'}
                    buttonLabel="اختر المعلمين"
                    selectedSummary={selectedSendTeacherIds.length > 0 ? `${selectedSendTeacherIds.length} معلمين محددين` : undefined}
                    options={teacherOptions}
                    selectedValues={selectedSendTeacherIds}
                    onToggle={value => {
                      setSelectedSendTeacherIds(current =>
                        current.includes(value) ? current.filter(item => item !== value) : [...current, value]
                      );
                    }}
                    onClear={() => setSelectedSendTeacherIds([])}
                    onSelectAll={() => setSelectedSendTeacherIds(teachers.map(item => item.id))}
                    searchable
                  />
                )}
                {safeSendScheduleType === 'individual_teacher' && (safeSendAudience === 'teachers' || safeSendAudience === 'teachers_admins') && (
                  <SingleSelectDropdown
                    label="طريقة الإرسال للمعلم"
                    value={teacherSendMode}
                    onChange={value => setTeacherSendMode(value as 'signature' | 'view')}
                    placeholder="اختر طريقة الإرسال"
                    options={[
                      { value: 'signature', label: 'مع التوقيع بالعلم' },
                      { value: 'view', label: 'إرسال فقط بدون توقيع' },
                    ]}
                  />
                )}
                {(safeSendAudience === 'admins' || safeSendAudience === 'teachers_admins') && (
                  <MultiSelectDropdown
                    label="الإداريون المستلمون"
                    buttonLabel="اختر الإداريين"
                    selectedSummary={selectedSendAdminIds.length > 0 ? `${selectedSendAdminIds.length} إداريين محددين` : undefined}
                    options={adminOptions}
                    selectedValues={selectedSendAdminIds}
                    onToggle={value => {
                      setSelectedSendAdminIds(current =>
                        current.includes(value) ? current.filter(item => item !== value) : [...current, value]
                      );
                    }}
                    onClear={() => setSelectedSendAdminIds([])}
                    onSelectAll={() => setSelectedSendAdminIds(admins.map(item => item.id))}
                    searchable
                  />
                )}
                {safeSendScheduleType === 'individual_class' && (
                  <MultiSelectDropdown
                    label="الفصول المستهدفة"
                    buttonLabel="اختر الفصول"
                    selectedSummary={selectedSendClassIds.length > 0 ? `${selectedSendClassIds.length} فصول محددة` : undefined}
                    options={classOptions}
                    selectedValues={selectedSendClassIds}
                    onToggle={value => {
                      const removed = selectedSendClassIds.includes(value);
                      setSelectedSendClassIds(current =>
                        current.includes(value) ? current.filter(item => item !== value) : [...current, value]
                      );
                      if (removed) {
                        const removedStudentIds = students
                          .filter(student => student.classId === value)
                          .map(student => student.id);
                        setSelectedGuardianStudentIds(current => current.filter(id => !removedStudentIds.includes(id)));
                        setExpandedGuardianClassIds(current => current.filter(id => id !== value));
                      }
                    }}
                    onClear={() => {
                      setSelectedSendClassIds([]);
                      setSelectedGuardianStudentIds([]);
                      setExpandedGuardianClassIds([]);
                    }}
                    onSelectAll={() => setSelectedSendClassIds(sortedClasses.map(item => item.id))}
                    searchable
                  />
                )}
                {safeSendAudience === 'guardians' && safeSendScheduleType === 'individual_class' && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-slate-700">أولياء الأمور المستلمون</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-400">
                          اختر فصلًا كاملًا أو طالبًا محددًا من الفصول المستهدفة.
                        </p>
                      </div>
                      {selectedGuardianStudentIds.length > 0 && (
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-[#655ac1]">
                          {selectedGuardianRecipients.length} مستلم
                        </span>
                      )}
                    </div>

                    {selectedSendClassIds.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-400">
                        اختر فصلًا واحدًا أو أكثر أولًا.
                      </div>
                    ) : guardianCandidates.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-400">
                        لا توجد بيانات طلاب ضمن الفصول المحددة.
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {selectedSendClassIds.map(classId => {
                          const recipients = guardiansByClass[classId] || [];
                          if (recipients.length === 0) return null;
                          const classItem = classes.find(item => item.id === classId);
                          const classLabel = classItem ? getClassLabel(classItem) : recipients[0]?.classLabel || 'فصل غير محدد';
                          const selectableIds = recipients.filter(recipient => recipient.phone).map(recipient => recipient.id);
                          const selectedCount = selectableIds.filter(id => selectedGuardianStudentIds.includes(id)).length;
                          const allSelected = selectableIds.length > 0 && selectedCount === selectableIds.length;
                          const someSelected = selectedCount > 0;
                          const isExpanded = expandedGuardianClassIds.includes(classId);

                          return (
                            <div key={classId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                              <div
                                className="flex cursor-pointer items-center justify-between gap-3 p-3 transition-colors hover:bg-[#f0edff]"
                                onClick={() => toggleGuardianClassExpand(classId)}
                              >
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={event => { event.stopPropagation(); toggleGuardianClass(classId); }}
                                    disabled={selectableIds.length === 0}
                                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                                      selectableIds.length === 0
                                        ? 'border-slate-200 bg-slate-50 text-transparent cursor-not-allowed'
                                        : allSelected || someSelected
                                          ? 'bg-[#655ac1] border-[#655ac1] text-white'
                                          : 'bg-white border-slate-300 text-transparent hover:border-[#655ac1]'
                                    }`}
                                  >
                                    <Check size={12} strokeWidth={3.5} className={someSelected && !allSelected ? 'opacity-50' : ''} />
                                  </button>
                                  <span className={`text-sm font-black ${someSelected ? 'text-[#655ac1]' : 'text-slate-700'}`}>
                                    فصل {classLabel}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-400">
                                    {selectedCount} / {selectableIds.length}
                                  </span>
                                  {isExpanded
                                    ? <ChevronDown size={18} className="text-slate-400" />
                                    : <ChevronLeft size={18} className="text-slate-400" />}
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="space-y-1 border-t border-slate-100 bg-white p-2">
                                  {recipients.map(recipient => {
                                    const isSelected = selectedGuardianStudentIds.includes(recipient.id);
                                    const hasPhone = !!recipient.phone;
                                    return (
                                      <button
                                        key={recipient.id}
                                        type="button"
                                        disabled={!hasPhone}
                                        onClick={() => toggleGuardianStudent(recipient.id)}
                                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right transition-colors ${
                                          !hasPhone
                                            ? 'cursor-not-allowed bg-slate-50/70 text-slate-300'
                                            : 'hover:bg-slate-50'
                                        }`}
                                      >
                                        <span className="min-w-0">
                                          <span className={`block text-sm font-bold ${isSelected ? 'text-[#655ac1]' : hasPhone ? 'text-slate-800' : 'text-slate-300'}`}>
                                            {recipient.studentName}
                                          </span>
                                          <span className={`mt-1 flex items-center gap-1 text-[11px] font-bold ${hasPhone ? 'text-slate-400' : 'text-rose-500'}`}>
                                            <Smartphone size={13} className="shrink-0 text-[#655ac1]" />
                                            <span dir={hasPhone ? 'ltr' : 'rtl'}>
                                              {hasPhone ? recipient.phone : 'بدون رقم جوال'}
                                            </span>
                                          </span>
                                        </span>
                                        <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                          !hasPhone
                                            ? 'bg-white border-slate-200 text-transparent'
                                            : isSelected
                                              ? 'bg-[#655ac1] border-[#655ac1] text-white'
                                              : 'bg-white border-slate-300 text-transparent'
                                        }`}>
                                          <Check size={12} strokeWidth={3.5} />
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {!needsSendTeacherTargets && !needsSendClassTargets && safeSendAudience === 'guardians' && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
                    سيتم إرسال الرابط لأولياء أمور الفصول المتاحة.
                  </div>
                )}
              </div>
            </div>

            {/* === العمود الأيسر: طريقة الإرسال + المعاينة + نص الرسالة === */}
            <div className="space-y-4">

              {/* بطاقة: طريقة الإرسال المفضلة */}
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-start gap-3 mb-4">
                  <Wallet size={20} className="text-[#655ac1]" />
                  <h4 className="font-black text-slate-800">طريقة الإرسال المفضلة</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSendChannel('whatsapp')}
                    className={`relative flex items-center gap-3 px-4 py-3 border-2 rounded-xl bg-white transition-all ${
                      sendChannel === 'whatsapp' ? 'border-slate-200 bg-slate-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
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
                  <button
                    type="button"
                    onClick={() => setSendChannel('sms')}
                    className={`relative flex items-center gap-3 px-4 py-3 border-2 rounded-xl bg-white transition-all ${
                      sendChannel === 'sms' ? 'border-slate-200 bg-slate-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
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
                    fallbackToSms ? 'border-emerald-300' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={fallbackToSms}
                      onChange={e => setFallbackToSms(e.target.checked)}
                    />
                    <div className={`relative flex items-center w-11 h-6 shrink-0 rounded-full transition-colors ${fallbackToSms ? 'bg-[#25D366]' : 'bg-slate-300'}`}>
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

              {/* بطاقة: نص الرسالة + المعاينة + جدولة الإرسال + زر إرسال */}
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={20} className="text-[#655ac1]" />
                    <h4 className="font-black text-slate-800">نص الرسالة</h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={openFirstGeneratedModel}
                      title={previewModelButtonLabel}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all"
                    >
                      <Eye size={14} />
                      {previewModelButtonLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!validateSendSelection()) return;
                        const links = createGeneratedLinks();
                        setGeneratedLinks(links);
                        setShowRecipientsModal(true);
                      }}
                      disabled={selectedRecipients.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all disabled:opacity-50"
                    >
                      <Users size={14} />
                      معاينة المستلمين{selectedRecipients.length > 0 ? ` (${selectedRecipients.length})` : ''}
                    </button>
                    <button
                      type="button"
                      title="استعادة النص الافتراضي"
                      aria-label="استعادة النص الافتراضي"
                      onClick={() => {
                        setModalMessageContent(buildMessageComposerDraft(generatedLinks).content);
                        showToast('تمت استعادة النص الافتراضي.');
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all"
                    >
                      <RefreshCw size={14} className="text-[#655ac1]" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={modalMessageContent}
                  onChange={e => setModalMessageContent(e.target.value)}
                  rows={5}
                  className="w-full border-2 border-slate-100 rounded-xl p-4 outline-none focus:border-[#655ac1] resize-none text-sm leading-relaxed transition-colors mb-2"
                  placeholder="نص الرسالة..."
                  dir="rtl"
                />
                <p className="text-[10px] text-slate-400 font-bold mb-4">يتم تخصيص الرسالة لكل مستلم تلقائياً عند الإرسال</p>
                <MessagePreviewInline
                  previewText={selectedRecipients.length > 0 && modalMessageContent.trim()
                    ? (buildSendPayloads(generatedLinks, modalMessageContent)[0]?.message.content || '')
                    : ''}
                  recipientName={selectedRecipients[0]?.name}
                  disabled={selectedRecipients.length === 0 || !modalMessageContent.trim()}
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
                        </div>
                        <DatePicker
                          value={getValidPickerDate(sendScheduleDate)}
                          onChange={date => setSendScheduleDate(formatPickerDate(date))}
                          calendar={sendScheduleCalendarType === 'hijri' ? arabic : gregorian}
                          locale={sendScheduleCalendarType === 'hijri' ? arabic_ar : gregorian_ar}
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
                  onClick={handleSendDirectly}
                  disabled={isSendingNow}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#655ac1] text-white font-black shadow-md shadow-[#655ac1]/20 hover:bg-[#5046a0] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingNow
                    ? <Loader2 size={16} className="animate-spin" />
                    : isSendScheduled ? <CalendarClock size={16} /> : <Send size={16} />}
                  {isSendingNow
                    ? 'جارٍ الإرسال...'
                    : isSendScheduled ? `جدولة الإرسال عبر ${sendChannelLabel}` : `إرسال عبر ${sendChannelLabel}`}
                </button>
              </div>
            </div>
          </div>

          {showSendResultsModal && sendModalResults.length > 0 && createPortal(
            <div
              className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4 animate-in fade-in"
              dir="rtl"
              onClick={() => setShowSendResultsModal(false)}
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
                    onClick={() => setShowSendResultsModal(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-transparent text-slate-500 hover:text-[#655ac1] hover:border-[#655ac1] transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                      <div className="text-[10px] font-bold text-[#655ac1] mb-1">تم الإرسال</div>
                      <div className="text-xl font-extrabold text-[#655ac1] tabular-nums">{sendResultsStats.sent.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                      <div className="text-[10px] font-bold text-rose-600 mb-1">فشل الإرسال</div>
                      <div className="text-xl font-extrabold text-rose-600 tabular-nums">{sendResultsStats.failed.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                      <div className="text-[10px] font-bold text-slate-500 mb-1">الإجمالي</div>
                      <div className="text-xl font-extrabold text-slate-800 tabular-nums">{sendResultsStats.total.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        {sendChannel === 'whatsapp' ? <WhatsAppIcon size={18} /> : <MessageSquare size={16} className="text-[#007AFF]" />}
                        <span>قناة الإرسال: {sendChannelLabel}</span>
                      </div>
                      <div className="text-xs font-black text-slate-500">
                        {new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(sendModalResults[0]?.timestamp || Date.now()))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSendResultsModal(false)}
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
        </SendPanelErrorBoundary>
      )}

      {taskMode === 'export' && (
        <div className="space-y-4">
          <div className="px-1">
            <h3 className="font-black text-slate-800 text-lg">تصدير</h3>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">

            {/* بطاقة تصدير Excel */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm flex flex-col min-h-[240px]">
              <div className="flex items-center justify-start gap-3 mb-2">
                <FileSpreadsheet size={20} className="text-[#655ac1]" />
                <h4 className="font-black text-slate-800">تصدير الجدول EXCEL</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium text-right mb-5">
                اختر الجدول ثم صدّره إلى EXCEL
              </p>
              <div className="[&_label]:hidden mb-5">
                <SingleSelectDropdown
                  label="الجدول"
                  value={exportScheduleType}
                  onChange={value => setExportScheduleType(value as ScheduleType)}
                  placeholder="اختر الجدول"
                  options={printScheduleTypeOptions}
                />
              </div>
              <button
                onClick={handleExportExcel}
                className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:border-[#655ac1] hover:text-white hover:bg-[#655ac1] transition-all"
              >
                <FileSpreadsheet size={15} />
                تصدير EXCEL
              </button>
            </div>

            {/* بطاقة تصدير XML */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm flex flex-col min-h-[240px]">
              <div className="flex items-center justify-start gap-3 mb-2">
                <FileCode2 size={20} className="text-[#655ac1]" />
                <h4 className="font-black text-slate-800">تصدير الجدول XML</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium text-right mb-5">
                صدّر الجدول بصيغة XML للاستفادة منه في إضافات قوقل كروم.
              </p>
              {hasSharedSchools ? (
                <div className="[&_label]:hidden mb-5">
                  <SingleSelectDropdown
                    label="نطاق التصدير"
                    value={exportXmlScope}
                    onChange={value => setExportXmlScope(value as 'combined' | 'separate')}
                    placeholder="نطاق التصدير"
                    options={exportXmlScopeOptions}
                  />
                </div>
              ) : (
                <div className="flex-1" />
              )}
              <button
                onClick={handleExportXML}
                className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:border-[#655ac1] hover:text-white hover:bg-[#655ac1] transition-all"
              >
                <FileCode2 size={15} />
                تصدير XML
              </button>
            </div>

          </div>
        </div>
      )}


      <RecipientsPreviewModal
        open={showRecipientsModal}
        onClose={() => { setShowRecipientsModal(false); setRecipientsListLink(null); }}
        recipients={selectedRecipients.map(r => ({
          id: r.id,
          name: r.name,
          subtitle: r.role === 'guardian' ? 'طالب' : recipientRoleLabels[r.role],
          role: r.role,
          phone: r.phone || undefined,
          classLabel: r.classLabel,
        }))}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl font-bold shadow-2xl bg-emerald-500 text-white animate-in slide-in-from-bottom-5">
          {toast}
        </div>
      )}
    </div>
  );
};

export default ViewTabV3;
