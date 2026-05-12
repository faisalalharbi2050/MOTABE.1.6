import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Check,
  SlidersHorizontal,
  Archive,
  MessageSquare,
  Eye,
  ClipboardList,
  Loader2,
  X,
  RefreshCw,
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
import PrintableSchedule from '../../schedule/PrintableSchedule';
import InlineScheduleView from '../../schedule/InlineScheduleView';
import ScheduleSignatureDocument, { MinistryLogo } from '../../schedule/ScheduleSignatureDocument';
import { generateExtensionXML, downloadFile } from '../../../utils/scheduleExport';
import {
  buildScheduleShareLink,
  saveScheduleShare,
  ShareAudience,
  ShareRecipientRecord,
} from '../../../utils/scheduleShare';
import { calculateSmsSegments } from '../../../utils/smsUtils';
import { useMessageArchive } from '../../messaging/MessageArchiveContext';

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
}

type ScheduleType =
  | 'general_teachers'
  | 'general_waiting'
  | 'general_classes'
  | 'individual_teacher'
  | 'individual_class';

type TaskMode = 'print' | 'send' | 'export';
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
  { id: 'individual_teacher', label: 'جدول معلم', icon: User, isGeneral: false },
  { id: 'individual_class', label: 'جدول فصل', icon: BookOpen, isGeneral: false },
  { id: 'general_teachers', label: 'الجدول العام للمعلمين', icon: Users, isGeneral: true },
  { id: 'general_classes', label: 'الجدول العام للفصول', icon: LayoutGrid, isGeneral: true },
  { id: 'general_waiting', label: 'الجدول العام للانتظار', icon: CalendarClock, isGeneral: true },
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
  individual_class: ['teachers', 'admins', 'guardians'],
  general_teachers: ['teachers', 'admins', 'teachers_admins'],
  general_classes: ['teachers', 'admins', 'guardians'],
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

const getClassLabel = (item: ClassInfo) => item.name || `${item.grade}/${item.section}`;

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
    ${blackAndWhite ? '#schedule-print-root * { box-shadow: none !important; }' : ''}
  }
`;

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
        <span className="truncate">{selected?.label || placeholder}</span>
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
                    ? 'bg-white border-[#655ac1] text-[#655ac1]'
                    : 'bg-white border-slate-300 text-transparent'
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
  dropdownPlacement?: 'auto' | 'top' | 'bottom';
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
        <span className="truncate">{selectedSummary || buttonLabel}</span>
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
          <div className="flex items-center justify-between px-2 py-2 mb-2 border border-slate-100 bg-slate-50 rounded-xl">
            {onSelectAll ? (
              <button type="button" onClick={onSelectAll} className="text-xs font-black text-[#655ac1] hover:underline">
                اختيار الكل
              </button>
            ) : <span />}
            <button type="button" onClick={onClear} className="text-xs font-black text-slate-400 hover:text-rose-500 hover:underline">
              إلغاء الكل
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {filteredOptions.map(option => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToggle(option.value)}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-white text-[#655ac1]'
                      : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {option.icon ? <option.icon size={15} className="text-[#655ac1]" /> : null}
                    {option.label}
                  </span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                    isSelected
                      ? 'bg-white border-[#655ac1] text-[#655ac1]'
                      : 'bg-white border-slate-300 text-transparent'
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

const TaskPanel: React.FC<{
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, description, children }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
    <div className="relative text-center">
      <div className="absolute top-[-24px] left-[-24px] w-28 h-28 rounded-br-[2.5rem] bg-[#e5e1fe] opacity-80" />
      <div className="relative z-10 flex items-center justify-center gap-3 mb-2">
        <Icon size={22} className="text-[#655ac1] shrink-0" />
        <h3 className="font-black text-slate-800">{title}</h3>
      </div>
      <p className="relative z-10 text-sm text-slate-500 font-medium mb-7 max-w-2xl mx-auto">{description}</p>
    </div>
    <div className="space-y-5">{children}</div>
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
                {pageIds.map(targetId => (
                  <div key={`${job.type}-${targetId || 'all'}`} className="print-grid-item rounded-2xl border border-slate-100 overflow-hidden">
                    {job.type === 'individual_teacher' || job.type === 'individual_class' ? (
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
                        />
                      </div>
                    ) : (
                      <PrintableSchedule
                        type={job.type}
                        settings={settings}
                        teachers={teachers}
                        classes={classes}
                        subjects={subjects}
                        specializations={specializations}
                        targetId={targetId || undefined}
                        schoolInfo={schoolInfo}
                        onClose={onBack}
                        blackAndWhite={blackAndWhite}
                      />
                    )}
                  </div>
                ))}
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
          const teacher = teachers.find(item => item.id === teacherId);
          if (!teacher) return null;
          const sigRequest = sigRequests.find(r => r.teacherId === teacherId);
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
}> = ({ requests, schoolInfo }) => {
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
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[125] bg-white overflow-auto" dir="rtl">
      <style>{styleTag}</style>
      <style>{`
        @page { size: A4 landscape; margin: 10mm; }
        @media print {
          #signature-print-root { padding: 0 !important; }
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
        @media print {
          .receipt-print-table th {
            background: #a59bf0 !important;
            color: #fff !important;
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

const ViewTab: React.FC<Props> = ({
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
}) => {
  const { sendMessage } = useMessageArchive();
  const [taskMode, setTaskMode] = useState<TaskMode>('print');

  const [printScheduleType, setPrintScheduleType] = useState<ScheduleType>('general_teachers');
  const [selectedPrintTeacherIds, setSelectedPrintTeacherIds] = useState<string[]>([]);
  const [selectedPrintClassIds, setSelectedPrintClassIds] = useState<string[]>([]);
  const [selectedDeliveryTeacherIds, setSelectedDeliveryTeacherIds] = useState<string[]>([]);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [printColorMode, setPrintColorMode] = useState<PrintColorMode>('color');
  const [individualPrintPerPage, setIndividualPrintPerPage] = useState<number>(1);

  const [sendScheduleType, setSendScheduleType] = useState<ScheduleType>('general_teachers');
  const [sendAudience, setSendAudience] = useState<SendAudience>('teachers');
  const [selectedSendTeacherIds, setSelectedSendTeacherIds] = useState<string[]>([]);
  const [selectedSendAdminIds, setSelectedSendAdminIds] = useState<string[]>([]);
  const [selectedSendClassIds, setSelectedSendClassIds] = useState<string[]>([]);
  const [sendChannel, setSendChannel] = useState<SendChannel>('whatsapp');
  const [isSending, setIsSending] = useState(false);
  const [showLinkDetails, setShowLinkDetails] = useState(false);
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);
  const [recipientsListLink, setRecipientsListLink] = useState<GeneratedLink | null>(null);

  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendModalResults, setSendModalResults] = useState<Array<{id: string; name: string; phone: string; status: 'sent'|'failed'; channel: string; timestamp: string; failureReason?: string}>>([]);
  const [isSendingNow, setIsSendingNow] = useState(false);
  const [modalMessageContent, setModalMessageContent] = useState('');
  const [sigFilter, setSigFilter] = useState<'all' | 'signed' | 'pending'>('all');
  const [sigSearch, setSigSearch] = useState('');
  const [sigReceiptRequests, setSigReceiptRequests] = useState<ScheduleSignatureRequest[]>(() => readScheduleSignatureRequests());
  const [sigReceiptModalOpen, setSigReceiptModalOpen] = useState(false);
  const [summaryPrintRequests, setSummaryPrintRequests] = useState<ScheduleSignatureRequest[] | null>(null);

  const [exportScheduleType, setExportScheduleType] = useState<ScheduleType>('general_teachers');

  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [printJobs, setPrintJobs] = useState<PrintJob[] | null>(null);
  const [signaturePrintTeacherIds, setSignaturePrintTeacherIds] = useState<string[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isSendScheduled, setIsSendScheduled] = useState(false);
  const [sendScheduleDate, setSendScheduleDate] = useState('');
  const [sendScheduleTime, setSendScheduleTime] = useState('08:00');
  const [sendScheduleCalendarType, setSendScheduleCalendarType] = useState<'hijri' | 'gregorian'>(
    ((schoolInfo.calendarType || schoolInfo.semesters?.[0]?.calendarType || 'hijri') as 'hijri' | 'gregorian')
  );
  const smsStats = useMemo(() => calculateSmsSegments(modalMessageContent), [modalMessageContent]);

  const hasSchedule = !!scheduleSettings.timetable && Object.keys(scheduleSettings.timetable).length > 0;
  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => a.grade !== b.grade ? a.grade - b.grade : (a.section || 0) - (b.section || 0)),
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
  const selectedScheduleLabel = SCHEDULE_TYPES.find(item => item.id === safeSendScheduleType)?.label || '';
  const needsSendTeacherTargets = safeSendScheduleType === 'individual_teacher';
  const needsSendClassTargets = safeSendScheduleType === 'individual_class';
  const selectedSendTargetCount = needsSendTeacherTargets
    ? selectedSendTeacherIds.length
    : needsSendClassTargets
      ? selectedSendClassIds.length
      : 0;
  const selectedGuardianRecipients = useMemo(() => {
    const classIds = safeSendScheduleType === 'individual_class' ? selectedSendClassIds : sortedClasses.map(item => item.id);
    return students
      .filter(student => classIds.includes(student.classId) && student.parentPhone)
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
  }, [students, classes, sortedClasses, selectedSendClassIds, safeSendScheduleType]);
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
  const estimatedLinkCount = useMemo(() => {
    if (safeSendScheduleType === 'individual_teacher') {
      const perTeacher = safeSendAudience === 'teachers_admins' ? 2 : 1;
      return selectedSendTeacherIds.length * perTeacher;
    }
    if (safeSendScheduleType === 'individual_class') return selectedSendClassIds.length > 0 ? 1 : 0;
    return safeSendAudience === 'teachers_admins' ? 2 : 1;
  }, [safeSendScheduleType, safeSendAudience, selectedSendTeacherIds.length, selectedSendClassIds.length]);
  const modelTypeSummary = safeSendScheduleType === 'individual_teacher' && safeSendAudience === 'teachers'
    ? 'توقيع إلكتروني بالاستلام'
    : safeSendScheduleType === 'individual_teacher' && safeSendAudience === 'teachers_admins'
      ? 'توقيع إلكتروني للمعلمين واطلاع للإداريين'
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
  const taskModeMeta: Record<TaskMode, { title: string; description: string; icon: React.ComponentType<any> }> = {
    print: {
      title: 'إعداد الطباعة',
      description: 'اختر نوع الجدول ثم اضبط خيارات الإخراج قبل فتح صفحة الطباعة.',
      icon: Printer,
    },
    send: {
      title: 'إعداد الإرسال',
      description: 'حدّد الجهة المستهدفة ونوع الجدول ثم ولّد الروابط بنفس الآلية الحالية.',
      icon: Send,
    },
    export: {
      title: 'إعداد التصدير',
      description: 'اختر الجدول المطلوب ثم صدّره إلى Excel أو XML بدون أي تغيير في البيانات.',
      icon: FileDown,
    },
  };
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
    setShowLinkDetails(false);
  }, [sendAudience, sendScheduleType, selectedSendTeacherIds, selectedSendAdminIds, selectedSendClassIds]);

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

    setPrintJobs(jobs);
  };

  const handlePrintDeliveryForms = () => {
    if (selectedDeliveryTeacherIds.length === 0) {
      showToast('اختر معلمًا واحدًا على الأقل لطباعة نموذج التسليم.');
      return;
    }

    setSignaturePrintTeacherIds(selectedDeliveryTeacherIds);
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
      const xml = generateExtensionXML(scheduleSettings.timetable || {}, teachers, subjects, classes, schoolInfo);
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

  const buildTeacherSignatureUrl = (teacherId: string, persistSignatureRequest = true) => {
    const teacher = teachers.find(item => item.id === teacherId);
    const token = createSignatureToken(teacherId);
    if (persistSignatureRequest) {
      const requests = readScheduleSignatureRequests().filter(request => request.teacherId !== teacherId);
      requests.push({
        token,
        teacherId,
        teacherName: teacher?.name || 'معلم',
        createdAt: new Date().toISOString(),
        status: 'pending',
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

  const createGeneratedLinks = (persistSignatureRequests = true) => {
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
            url: buildTeacherSignatureUrl(teacherId, persistSignatureRequests),
            teacherId,
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
    const recipientName = sendAudience === 'guardians'
      ? 'المكرم/ولي أمر الطالب/ـة {اسم_الطالب}'
      : sendAudience === 'admins'
        ? 'المكرم/{اسم_الإداري}'
        : 'المكرم/{اسم_المعلم}';
    const content = [
      `${recipientName}`,
      `نرفق لكم جدول للعلم والاطلاع.`,
      ``,
      `المدرسة: ${schoolInfo.schoolName || 'المدرسة'} - اليوم (${dayLabel}) - التاريخ (${dateLabel}) - الفصل الدراسي (${currentSemester?.name || '-'}) - نوع الجدول (${schedTypeLabel}) - رابط الجدول ({روابط_الجداول})`,
    ].join('\n');

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

  const handlePrepareInMessages = () => {
    if (!validateSendSelection()) return;
    if (!onPrepareMessageDraft) {
      showToast('تعذر فتح صفحة الرسائل من هذا الموضع.');
      return;
    }
    const links = createGeneratedLinks();
    setGeneratedLinks(links);
    setIsSending(true);
    onPrepareMessageDraft(buildMessageComposerDraft(links));
    setIsSending(false);
    showToast('تم تجهيز المسودة في صفحة الرسائل.');
  };

  const handleOpenSendModal = () => {
    if (!validateSendSelection()) return;
    const links = createGeneratedLinks();
    setGeneratedLinks(links);
    setSendModalResults([]);
    setModalMessageContent(buildMessageComposerDraft(links).content);
    setSendModalOpen(true);
  };

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
      const personalContent = templateContent
        .replace(/\{اسم_المعلم\}/g, recipient.name)
        .replace(/\{اسم_الإداري\}/g, recipient.name)
        .replace(/\{اسم_الطالب\}/g, recipient.classLabel || recipient.name)
        .replace(/\{روابط_الجداول\}/g, recipientLinkText)
        .replace(/\{اسم_المدرسة\}/g, schoolInfo.schoolName || 'المدرسة')
        .replace(/\{اليوم\}/g, dayLabel)
        .replace(/\{التاريخ\}/g, dateLabel)
        .replace(/\{نوع_الجدول\}/g, scheduleTypeLabel);
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
          content: personalContent,
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

  const executeSendNow = async () => {
    setIsSendingNow(true);
    const links = generatedLinks;
    const payloads = buildSendPayloads(links, modalMessageContent || undefined);
    const results: typeof sendModalResults = [];
    for (const payload of payloads) {
      const response = await sendMessage(payload.message, sendChannel === 'whatsapp');
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

  const handleSendDirectly = async () => {
    if (!validateSendSelection()) return;
    if (!modalMessageContent.trim()) { showToast('نص الرسالة فارغ.'); return; }
    const links = createGeneratedLinks();
    setGeneratedLinks(links);
    setIsSendingNow(true);
    const payloads = buildSendPayloads(links, modalMessageContent);
    const results: typeof sendModalResults = [];
    for (const payload of payloads) {
      const response = await sendMessage(payload.message, sendChannel === 'whatsapp');
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

    const links = createGeneratedLinks();
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
        <AlertTriangle className="mx-auto mb-5 text-[#655ac1]" size={36} />
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

  if (printJobs) {
    return (
      <PrintWorkspace
        jobs={printJobs}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        specializations={specializations}
        settings={scheduleSettings}
        schoolInfo={schoolInfo}
        paperSize={isPrintGeneral ? paperSize : 'A4'}
        colorMode={printColorMode}
        perPage={printScheduleType === 'individual_teacher' || printScheduleType === 'individual_class' ? individualPrintPerPage : 1}
        onBack={() => setPrintJobs(null)}
      />
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
      />
    );
  }

  if (sigReceiptModalOpen) {
    const filteredReceipts = sigReceiptRequests.filter(r =>
      (sigFilter === 'all' || r.status === sigFilter) &&
      (sigSearch.trim() === '' || r.teacherName.includes(sigSearch.trim()))
    );
    const signedCount = sigReceiptRequests.filter(r => r.status === 'signed').length;
    const pendingCount = sigReceiptRequests.filter(r => r.status === 'pending').length;

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
                {signedCount} وقّع من أصل {sigReceiptRequests.length} معلم
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'إجمالي المعلمين', value: String(sigReceiptRequests.length), icon: Users },
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
              disabled={sigReceiptRequests.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50"
            >
              <Printer size={15} />
              طباعة سجل الاستلام الالكتروني
            </button>
            <button
              type="button"
              onClick={() => {
                const ids = filteredReceipts.map(r => r.teacherId).filter(Boolean);
                if (ids.length > 0) setSignaturePrintTeacherIds(ids);
                else showToast('لا توجد نماذج للطباعة.');
              }}
              disabled={sigReceiptRequests.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50"
            >
              <Printer size={15} />
              طباعة نموذج الاطلاع على الجدول والتوقيع
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
          {sigReceiptRequests.length === 0 ? (
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
                          onClick={() => { setSignaturePrintTeacherIds([req.teacherId]); }}
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
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-5">
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'print' as TaskMode, label: 'طباعة', icon: Printer },
            { id: 'send' as TaskMode, label: 'إرسال', icon: Send },
            { id: 'export' as TaskMode, label: 'تصدير', icon: FileDown },
          ].map(option => (
            <button
              key={option.id}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                setTaskMode(option.id);
                setGeneratedLinks([]);
              }}
              className={actionButtonClass(taskMode === option.id)}
            >
              <option.icon size={17} />
              {option.label}
            </button>
          ))}
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
                اطبع نموذج التسليم الورقي الرسمي لمعلم واحد أو عدة معلمين أو جميع المعلمين.
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
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-[#655ac1] leading-6 flex items-center gap-2">
                  <AlertCircle size={16} className="text-[#655ac1] shrink-0" />
                  <span>سيتم طباعة نموذج مستقل لكل معلم يحتوي على جدول المعلم وبياناته والتوقيع بالاستلام</span>
                </div>
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
                <SingleSelectDropdown
                  label="المستلمون"
                  value={safeSendAudience}
                  onChange={value => setSendAudience(value as SendAudience)}
                  placeholder="اختر الجهة"
                  options={allowedAudienceOptions}
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
                      setSelectedSendClassIds(current =>
                        current.includes(value) ? current.filter(item => item !== value) : [...current, value]
                      );
                    }}
                    onClear={() => setSelectedSendClassIds([])}
                    onSelectAll={() => setSelectedSendClassIds(sortedClasses.map(item => item.id))}
                    searchable
                  />
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
                  <MessageSquare size={20} className="text-[#655ac1]" />
                  <h4 className="font-black text-slate-800">طريقة الإرسال المفضلة</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSendChannel('whatsapp')}
                    className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${
                      sendChannel === 'whatsapp' ? 'border-[#25D366] bg-white shadow-sm' : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <WhatsAppIcon size={28} />
                    <span className={`font-black mt-2 text-sm ${sendChannel === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-400'}`}>واتساب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendChannel('sms')}
                    className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${
                      sendChannel === 'sms' ? 'border-[#007AFF] bg-white shadow-sm' : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <MessageSquare size={28} className={sendChannel === 'sms' ? 'text-[#007AFF]' : 'text-slate-300'} />
                    <span className={`font-black mt-2 text-sm ${sendChannel === 'sms' ? 'text-[#007AFF]' : 'text-slate-400'}`}>النصية SMS</span>
                  </button>
                </div>
              </div>

              {/* بطاقة: المعاينة والروابط */}
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-start gap-3 mb-4">
                  <Eye size={20} className="text-[#655ac1]" />
                  <h4 className="font-black text-slate-800">المعاينة والروابط</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openFirstGeneratedModel}
                    title={previewModelButtonLabel}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all"
                  >
                    <Eye size={15} />
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all disabled:opacity-50"
                  >
                    <Users size={15} />
                    معاينة المستلمين{selectedRecipients.length > 0 ? ` (${selectedRecipients.length})` : ''}
                  </button>
                </div>
              </div>

              {/* بطاقة: نص الرسالة + جدولة الإرسال + زر إرسال */}
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
                      setModalMessageContent(buildMessageComposerDraft(generatedLinks).content);
                      showToast('تمت استعادة النص الافتراضي.');
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all"
                  >
                    <RefreshCw size={14} className="text-[#655ac1]" />
                  </button>
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
                                onClick={() => setSendScheduleCalendarType(option.value as 'hijri' | 'gregorian')}
                                className={`px-2 py-1 rounded-md text-[10px] font-black transition-all ${
                                  sendScheduleCalendarType === option.value ? 'bg-[#655ac1] text-white' : 'text-slate-500 hover:text-[#655ac1]'
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
                  {isSendingNow ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {isSendingNow ? 'جارٍ الإرسال...' : `إرسال عبر ${sendChannelLabel}`}
                </button>
              </div>
            </div>
          </div>

          {/* نتائج الإرسال المباشر */}
          {sendModalResults.length > 0 && (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 size={20} className="text-emerald-500" />
                <h4 className="font-black text-slate-800">نتائج الإرسال</h4>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                  <p className="text-2xl font-black text-emerald-800">{sendModalResults.filter(r => r.status === 'sent').length}</p>
                  <p className="text-xs text-emerald-600 mt-1">تم الإرسال</p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-center">
                  <p className="text-2xl font-black text-rose-800">{sendModalResults.filter(r => r.status === 'failed').length}</p>
                  <p className="text-xs text-rose-600 mt-1">فشل</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <p className="text-2xl font-black text-slate-800">{sendModalResults.length}</p>
                  <p className="text-xs text-slate-500 mt-1">الإجمالي</p>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 rounded-xl border border-[#e5e1fe] bg-[#f8f7ff] px-3 py-2">
                تم تسجيل هذه العملية في أرشيف الرسائل.
              </p>
            </div>
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
                صدّر بيانات الجدول إلى ملف Excel جاهز للفتح والتعديل.
              </p>
              <div className="[&_label]:hidden mb-5">
                <SingleSelectDropdown
                  label="الجدول"
                  value={exportScheduleType}
                  onChange={value => setExportScheduleType(value as ScheduleType)}
                  placeholder="اختر الجدول"
                  options={scheduleTypeOptions}
                />
              </div>
              <button
                onClick={handleExportExcel}
                className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#f0edff] transition-all"
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
                صدّر بيانات الجدول بصيغة XML لاستخدامها في أنظمة خارجية.
              </p>
              <div className="flex-1" />
              <button
                onClick={handleExportXML}
                className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#f0edff] transition-all"
              >
                <FileCode2 size={15} />
                تصدير XML
              </button>
            </div>

          </div>
        </div>
      )}

      {taskMode === 'send' && generatedLinks.length > 0 && showLinkDetails && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-800">
            <h4 className="text-sm font-black">تفاصيل الروابط المولدة</h4>
          </div>

          <div className="px-4 py-3.5 border border-slate-200 rounded-2xl bg-white flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm font-black text-slate-700">
              {generatedLinks.length} {generatedLinks.length === 1 ? 'رابط جاهز' : 'روابط جاهزة'}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-400">مشاركة يدوية</span>
              <button
                onClick={copyAllLinks}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold"
              >
                <Copy size={13} className="text-[#655ac1]" />
                نسخ الكل
              </button>
              <button
                onClick={openWhatsAppForAll}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300"
              >
                <WhatsAppIcon size={14} />
                واتساب للكل {generatedLinks.length > 0 && `(${generatedLinks.length})`}
              </button>
              <button
                onClick={openSMSForAll}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300"
              >
                <MessageSquare size={13} className="text-[#007AFF]" />
                نصية للكل {generatedLinks.length > 0 && `(${generatedLinks.length})`}
              </button>
              <button
                onClick={handleOpenSendModal}
                disabled={isSending}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#655ac1] hover:bg-[#5046a0] text-white text-xs font-bold border border-[#655ac1] disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Send size={13} />
                إرسال الآن
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[1080px] text-right" dir="rtl">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-5 py-4 font-black text-[#655ac1] text-[13px] text-right">اسم الجدول</th>
                  <th className="px-5 py-4 font-black text-[#655ac1] text-[13px] text-center">رقم الجوال</th>
                  <th className="px-5 py-4 font-black text-[#655ac1] text-[13px] text-center">نوع النموذج</th>
                  <th className="px-5 py-4 font-black text-[#655ac1] text-[13px] text-center">نوع الجدول</th>
                  <th className="px-5 py-4 font-black text-[#655ac1] text-[13px] text-center">الرابط</th>
                  <th className="px-5 py-4 font-black text-[#655ac1] text-[13px] text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {generatedLinks.map(link => {
                  const phones = Array.from(new Set(link.recipients.map(item => item.phone).filter(Boolean)));
                  const actionButtonClassName = 'w-8 h-8 flex items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-90 transition-all';
                  return (
                    <tr key={link.url} className="hover:bg-accent/5 transition-all">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-[13px] text-slate-800">{link.targetLabel}</div>
                        <div className="text-[11px] font-bold text-slate-400 mt-0.5">{link.label}</div>
                      </td>
                      <td className="px-5 py-3.5 text-center text-[12px] font-bold text-slate-600" dir="ltr">
                        {phones.length > 0 ? phones.join('، ') : 'بدون رقم'}
                      </td>
                      <td className="px-5 py-3.5 text-center text-[12px] font-bold text-slate-600">
                        {link.teacherId ? 'توقيع إلكتروني بالاستلام' : 'اطلاع فقط'}
                      </td>
                      <td className="px-5 py-3.5 text-center text-[12px] font-bold text-slate-600">{selectedScheduleLabel}</td>
                      <td className="px-5 py-3.5">
                        <div dir="ltr" className="max-w-[260px] mx-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-500 truncate">
                          {link.url}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => openWhatsApp(link)} title="واتساب" className={actionButtonClassName}>
                            <WhatsAppIcon size={15} />
                          </button>
                          <button onClick={() => openSMS(link)} title="رسالة نصية" className={actionButtonClassName}>
                            <MessageSquare size={14} className="text-[#007AFF]" />
                          </button>
                          <button onClick={() => window.open(link.url, '_blank')} title="معاينة النموذج" className={actionButtonClassName}>
                            <Eye size={14} className="text-[#655ac1]" />
                          </button>
                          <button onClick={() => copyToClipboard(link.url)} title="نسخ الرابط" className={actionButtonClassName}>
                            <Copy size={14} className="text-[#655ac1]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}




      {sendModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">

            {/* ── Header ── */}
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e5e1fe] text-[#655ac1] flex items-center justify-center shrink-0">
                  <Send size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800">إرسال الجداول</h3>
                  <p className="text-xs text-slate-500">{selectedScheduleLabel} • {AUDIENCE_LABELS[safeSendAudience]}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSendModalOpen(false); setSendModalResults([]); }}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Body: two-column ── */}
            <div className="flex-1 overflow-hidden min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 h-full divide-x divide-x-reverse divide-slate-100">

                {/* ══ Left: recipients + links ══ */}
                <div className="flex flex-col h-full overflow-y-auto p-5 space-y-4">

                  {/* summary cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ['نوع الجدول', selectedScheduleLabel || '-'],
                      ['عدد المستلمين', `${selectedRecipients.length}`],
                      ['نوع النموذج', modelTypeSummary],
                      ['عدد الروابط', `${generatedLinks.length}`],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[10px] font-black text-slate-400 mb-0.5">{label}</p>
                        <p className="text-sm font-black text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* recipient list */}
                  <div>
                    <p className="text-xs font-black text-slate-500 mb-2 flex items-center gap-1.5">
                      <Users size={13} />
                      المستلمون ({selectedRecipients.length})
                    </p>
                    <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto">
                      {selectedRecipients.length === 0 ? (
                        <div className="py-6 text-center text-sm font-medium text-slate-400">لم يتم اختيار مستلمين بعد.</div>
                      ) : selectedRecipients.map(r => (
                        <div key={`${r.role}-${r.id}`} className="px-4 py-2.5 flex items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="text-sm font-black text-slate-800">{r.name}</p>
                            <p className="text-[10px] font-bold text-slate-400">
                              {r.role === 'teacher' ? 'معلم' : r.role === 'admin' ? 'إداري' : 'ولي أمر'}
                            </p>
                          </div>
                          <p className="text-xs font-mono text-slate-400 shrink-0" dir="ltr">{r.phone || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* links */}
                  {generatedLinks.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-black text-slate-500 flex items-center gap-1.5">
                          <Copy size={13} />
                          الروابط ({generatedLinks.length})
                        </p>
                        <button
                          type="button"
                          onClick={copyAllLinks}
                          className="text-xs font-black text-[#655ac1] hover:underline"
                        >
                          نسخ الكل
                        </button>
                      </div>
                      <div className="space-y-2">
                        {generatedLinks.map(link => (
                          <div key={link.url} className="rounded-2xl border border-[#e5e1fe] bg-[#f8f7ff] p-3">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <p className="text-xs font-black text-[#655ac1] truncate">{link.label}</p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(link.url)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#d9d2ff] bg-white hover:bg-[#f0edff] text-[#655ac1] transition-all"
                                >
                                  <Copy size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => window.open(link.url, '_blank')}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#d9d2ff] bg-white hover:bg-[#f0edff] text-[#655ac1] transition-all"
                                >
                                  <Eye size={12} />
                                </button>
                              </div>
                            </div>
                            <p dir="ltr" className="text-[10px] font-mono text-slate-500 truncate">{link.url}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 truncate">
                              {link.recipients.map(r => r.name).join('، ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ══ Right: channel + message + send ══ */}
                <div className="flex flex-col h-full overflow-y-auto p-5 space-y-4">

                  {/* channel cards */}
                  <div>
                    <p className="text-xs font-black text-slate-500 mb-3">طريقة الإرسال</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSendChannel('whatsapp')}
                        disabled={sendModalResults.length > 0}
                        className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all disabled:opacity-60 ${
                          sendChannel === 'whatsapp' ? 'border-[#25D366] bg-white shadow-sm' : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <WhatsAppIcon size={28} />
                        <span className={`font-black mt-2 text-sm ${sendChannel === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-400'}`}>واتساب</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSendChannel('sms')}
                        disabled={sendModalResults.length > 0}
                        className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all disabled:opacity-60 ${
                          sendChannel === 'sms' ? 'border-[#007AFF] bg-white shadow-sm' : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <MessageSquare size={28} className={sendChannel === 'sms' ? 'text-[#007AFF]' : 'text-slate-300'} />
                        <span className={`font-black mt-2 text-sm ${sendChannel === 'sms' ? 'text-[#007AFF]' : 'text-slate-400'}`}>النصية SMS</span>
                      </button>
                    </div>
                  </div>

                  {/* message textarea */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-black text-slate-500">نص الرسالة</p>
                      <span className="text-[10px] text-slate-400 font-bold">يتم تخصيص الرسالة لكل مستلم تلقائياً</span>
                    </div>
                    <textarea
                      value={modalMessageContent}
                      onChange={e => setModalMessageContent(e.target.value)}
                      disabled={sendModalResults.length > 0}
                      rows={9}
                      className="w-full border-2 border-slate-100 rounded-xl p-4 outline-none focus:border-[#655ac1] resize-none text-sm leading-relaxed disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
                      placeholder="نص الرسالة..."
                      dir="rtl"
                    />
                    {sendChannel === 'sms' && (
                      <div className="rounded-2xl border border-slate-200 px-4 py-3 mt-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black text-[#655ac1]">
                          <span>{smsStats.characterCount} حرفًا</span>
                          <span>الحد الأقصى: {smsStats.maxPerMessage} حرفًا للرسالة</span>
                          <span>{smsStats.messageCount} رسالة نصية</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* live preview */}
                  {(() => {
                    if (!modalMessageContent.trim() || generatedLinks.length === 0) return null;
                    const draft = buildMessageComposerDraft(generatedLinks);
                    const firstRecipient = draft.recipients[0];
                    if (!firstRecipient) return null;
                    const now = new Date();
                    const dayLabel = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(now);
                    const dateLabel = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { dateStyle: 'medium' }).format(now);
                    const scheduleTypeLabel = SCHEDULE_TYPES.find(item => item.id === sendScheduleType)?.label || 'الجدول';
                    const previewContent = modalMessageContent
                      .replace(/\{اسم_المعلم\}/g, firstRecipient.name)
                      .replace(/\{اسم_الإداري\}/g, firstRecipient.name)
                      .replace(/\{اسم_الطالب\}/g, firstRecipient.classLabel || firstRecipient.name)
                      .replace(/\{روابط_الجداول\}/g, draft.linksByRecipientId?.[firstRecipient.id] || '')
                      .replace(/\{اسم_المدرسة\}/g, schoolInfo.schoolName || 'المدرسة')
                      .replace(/\{اليوم\}/g, dayLabel)
                      .replace(/\{التاريخ\}/g, dateLabel)
                      .replace(/\{نوع_الجدول\}/g, scheduleTypeLabel);
                    return (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                        <p className="text-[10px] font-black text-emerald-600 mb-2">معاينة — {firstRecipient.name}</p>
                        <pre className="text-xs text-slate-700 whitespace-pre-wrap font-medium leading-relaxed">{previewContent}</pre>
                      </div>
                    );
                  })()}

                  {/* results after send */}
                  {sendModalResults.length > 0 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-2.5 text-center">
                          <p className="text-lg font-black text-emerald-800">{sendModalResults.filter(r => r.status === 'sent').length}</p>
                          <p className="text-[10px] text-emerald-600 mt-0.5">تم الإرسال</p>
                        </div>
                        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-2.5 text-center">
                          <p className="text-lg font-black text-rose-800">{sendModalResults.filter(r => r.status === 'failed').length}</p>
                          <p className="text-[10px] text-rose-600 mt-0.5">فشل</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-center">
                          <p className="text-lg font-black text-slate-800">{sendModalResults.length}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">الإجمالي</p>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-slate-500 rounded-xl border border-[#e5e1fe] bg-[#f8f7ff] px-3 py-2">
                        تم تسجيل هذه العملية في أرشيف الرسائل.
                      </p>
                    </div>
                  )}

                  {/* send button */}
                  <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
                    {sendModalResults.length === 0 ? (
                      <button
                        type="button"
                        onClick={executeSendNow}
                        disabled={isSendingNow || !modalMessageContent.trim()}
                        className="w-full bg-gradient-to-r from-[#8779fb] to-[#655ac1] text-white py-4 rounded-xl font-black text-base hover:shadow-lg hover:shadow-[#655ac1]/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                      >
                        {isSendingNow ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        {isSendingNow ? 'جارٍ الإرسال...' : `إرسال الآن عبر ${sendChannelLabel}`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setSendModalOpen(false); setSendModalResults([]); setSigReceiptRequests(readScheduleSignatureRequests()); }}
                        className="w-full py-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-black text-base hover:bg-slate-50 transition-all"
                      >
                        إغلاق
                      </button>
                    )}
                    {sendModalResults.length === 0 && (
                      <div className="flex gap-2 flex-wrap justify-center">
                        <button
                          type="button"
                          onClick={openFirstGeneratedModel}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black hover:bg-slate-50 transition-all"
                        >
                          <Eye size={13} />
                          معاينة النموذج
                        </button>
                        <button
                          type="button"
                          onClick={copyAllLinks}
                          disabled={generatedLinks.length === 0}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                          <Copy size={13} />
                          نسخ الرابط
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSendModalOpen(false); onOpenMessagesArchive?.(); }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black hover:bg-slate-50 transition-all"
                        >
                          <Archive size={13} />
                          عرض الأرشيف
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showRecipientsModal && (() => {
        const now = new Date();
        const dayLabel = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(now);
        const dateLabel = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(now);
        return (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm" dir="rtl">
            <div className="w-full max-w-6xl h-[85vh] overflow-hidden rounded-[2rem] bg-white border border-slate-200 shadow-2xl flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Users size={22} className="text-[#655ac1] shrink-0" />
                  <h3 className="font-black text-slate-800">معاينة المستلمين</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecipientsModal(false);
                    setRecipientsListLink(null);
                  }}
                  className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {generatedLinks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400 opacity-70">
                    <Users size={58} strokeWidth={1.4} style={{ color: '#655ac1' }} />
                    <p className="text-sm font-bold text-slate-500">لم يتم اختيار مستلمين بعد.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right min-w-[980px]" dir="rtl">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">اليوم</th>
                          <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">التاريخ</th>
                          <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-right">المستلم</th>
                          <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-right">نوع الجدول</th>
                          <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-right">الرابط</th>
                          <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {generatedLinks.map(link => {
                          const hasManyRecipients = link.recipients.length > 3;
                          return (
                            <tr key={link.url} className="hover:bg-accent/5 transition-all">
                              <td className="px-6 py-3.5 text-center">
                                <span className="text-[12px] font-bold text-slate-700">{dayLabel}</span>
                              </td>
                              <td className="px-6 py-3.5 text-center">
                                <div className="inline-flex items-center justify-center px-3 py-1 bg-slate-50 rounded-lg">
                                  <span className="text-[12px] font-bold text-slate-700">{dateLabel}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-bold text-[13px] text-slate-800 truncate max-w-[240px]" title={link.recipients.map(item => item.name).join('، ')}>
                                    {getRecipientsPreview(link.recipients)}
                                  </span>
                                  {hasManyRecipients && (
                                    <button
                                      type="button"
                                      onClick={() => setRecipientsListLink(link)}
                                      title="عرض جميع المستلمين"
                                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-[#655ac1] hover:bg-[#f1efff] flex items-center justify-center transition-all shrink-0"
                                    >
                                      <Eye size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-3.5">
                                <span className="font-bold text-[13px] text-slate-700">{link.label}</span>
                              </td>
                              <td className="px-6 py-3.5">
                                <div dir="ltr" className="max-w-[240px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-mono text-slate-500 truncate">
                                  {link.url}
                                </div>
                              </td>
                              <td className="px-6 py-3.5">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => window.open(link.url, '_blank')}
                                    title="عرض الجدول الذي سيتم إرساله"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#f1efff] transition-all"
                                  >
                                    <Eye size={12} />
                                    عرض
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(link.url)}
                                    title="نسخ رابط الجدول الذي سيتم إرساله"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#f1efff] transition-all"
                                  >
                                    <Copy size={12} />
                                    نسخ
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecipientsModal(false);
                    setRecipientsListLink(null);
                  }}
                  className="px-6 py-2.5 text-sm text-slate-600 font-bold bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {recipientsListLink && (
              <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-slate-900/30" dir="rtl">
                <div className="w-full max-w-md max-h-[70vh] overflow-hidden rounded-[1.75rem] bg-white border border-slate-200 shadow-2xl flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <ClipboardList size={18} className="text-[#655ac1] shrink-0" />
                      <h4 className="font-black text-slate-800 truncate">جميع المستلمين</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecipientsListLink(null)}
                      className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div className="overflow-y-auto p-3 space-y-2">
                    {recipientsListLink.recipients.map(recipient => (
                      <div key={recipient.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <span className="text-sm font-black text-slate-800 truncate">{recipient.name}</span>
                        <span className="text-[11px] font-black text-[#655ac1] bg-white border border-[#e5e1fe] rounded-lg px-2 py-1 shrink-0">
                          {recipientRoleLabels[recipient.role]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl font-bold shadow-2xl bg-emerald-500 text-white animate-in slide-in-from-bottom-5">
          {toast}
        </div>
      )}
    </div>
  );
};

export default ViewTab;
