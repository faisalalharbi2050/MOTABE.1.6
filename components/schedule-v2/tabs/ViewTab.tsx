import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  Users,
  CalendarClock,
  LayoutGrid,
  User,
  BookOpen,
  Printer,
  FileDown,
  Send,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Copy,
  CheckCircle2,
  FileCode2,
  FileSpreadsheet,
  UserCog,
  GraduationCap,
  Search,
  ChevronDown,
  Check,
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
} from '../../../types';
import PrintableSchedule from '../../schedule/PrintableSchedule';
import InlineScheduleView from '../../schedule/InlineScheduleView';
import { generateExtensionXML, downloadFile } from '../../../utils/scheduleExport';

interface Props {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  scheduleSettings: ScheduleSettingsData;
  setScheduleSettings: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  admins: Admin[];
  assignments: Assignment[];
  specializations: Specialization[];
  onNavigate: (tab: 'view' | 'edit' | 'create') => void;
  isScheduleLocked?: boolean;
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
type SendAudience = 'teachers' | 'admins' | 'parents';
type SendTeacherLinkMode = 'single_bundle' | 'personalized';

type PrintJob = {
  type: ScheduleType;
  label: string;
  targetIds: string[];
};

type GeneratedLink = {
  label: string;
  url: string;
  teacherId?: string;
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
  { id: 'general_teachers', label: 'الجدول العام للمعلمين', icon: Users, isGeneral: true },
  { id: 'general_waiting', label: 'الجدول العام للانتظار', icon: CalendarClock, isGeneral: true },
  { id: 'general_classes', label: 'الجدول العام للفصول', icon: LayoutGrid, isGeneral: true },
  { id: 'individual_teacher', label: 'جدول معلم', icon: User, isGeneral: false },
  { id: 'individual_class', label: 'جدول فصل', icon: BookOpen, isGeneral: false },
];

const GENERAL_SCHEDULES = SCHEDULE_TYPES.filter(item => item.isGeneral);

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
      <label className="block text-xs font-black text-slate-500 mb-2">{label}</label>
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
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between border ${
                  value === option.value
                    ? 'bg-white text-[#655ac1] border-[#655ac1] shadow-sm'
                    : 'text-slate-700 border-transparent hover:bg-[#f0edff] hover:text-[#655ac1] hover:border-[#d9d3ff]'
                }`}
              >
                <span className="flex items-center gap-2">
                  {option.icon ? <option.icon size={15} className="text-[#655ac1]" /> : null}
                  {option.label}
                </span>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border transition-all ${
                  value === option.value
                    ? 'bg-[#655ac1] border-[#655ac1] text-white'
                    : 'border-slate-300 text-transparent'
                }`}>
                  <Check size={12} />
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
      <label className="block text-xs font-black text-slate-500 mb-2">{label}</label>
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
          style={{ top: position.top, left: position.left, width: position.width }}
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
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-white text-[#655ac1] border-[#655ac1] shadow-sm'
                      : 'text-slate-700 border-transparent hover:bg-[#f0edff] hover:text-[#655ac1] hover:border-[#d9d3ff]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {option.icon ? <option.icon size={15} className="text-[#655ac1]" /> : null}
                    {option.label}
                  </span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border transition-all ${
                    isSelected
                      ? 'bg-[#655ac1] border-[#655ac1] text-white'
                      : 'border-slate-300 text-transparent'
                  }`}>
                    <Check size={12} />
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

const PrintWorkspace: React.FC<{
  jobs: PrintJob[];
  teachers: Teacher[];
  classes: ClassInfo[];
  subjects: Subject[];
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
  settings,
  schoolInfo,
  paperSize,
  colorMode,
  perPage,
  onBack,
}) => {
  const blackAndWhite = colorMode === 'bw';
  const styleTag = useMemo(() => buildPrintCSS(paperSize, blackAndWhite), [paperSize, blackAndWhite]);

  return (
    <div className="fixed inset-0 z-[120] bg-white overflow-auto" dir="rtl">
      <style>{styleTag}</style>
      <div className="print-toolbar sticky top-0 z-20 flex items-center justify-between gap-3 px-6 py-4 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 transition-all"
          >
            <ArrowLeft size={16} />
            رجوع
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#655ac1] text-white font-bold shadow-lg shadow-[#655ac1]/20 hover:bg-[#5046a0] transition-all"
          >
            <Printer size={16} />
            طباعة الآن
          </button>
        </div>
        <div className="text-sm font-bold text-slate-500">
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
                    <PrintableSchedule
                      type={job.type}
                      settings={settings}
                      teachers={teachers}
                      classes={classes}
                      subjects={subjects}
                      targetId={targetId || undefined}
                      schoolInfo={schoolInfo}
                      onClose={onBack}
                      blackAndWhite={blackAndWhite}
                    />
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
  onBack: () => void;
}> = ({ teacherIds, teachers, classes, subjects, specializationNames, settings, schoolInfo, onBack }) => {
  const styleTag = useMemo(() => buildSignaturePrintCSS(), []);

  return (
    <div className="fixed inset-0 z-[125] bg-white overflow-auto" dir="rtl">
      <style>{styleTag}</style>
      <div className="signature-print-toolbar sticky top-0 z-20 flex items-center justify-between gap-3 px-6 py-4 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 transition-all"
          >
            <ArrowLeft size={16} />
            رجوع
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#655ac1] text-white font-bold shadow-lg shadow-[#655ac1]/20 hover:bg-[#5046a0] transition-all"
          >
            <Printer size={16} />
            طباعة الآن
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

          return (
            <div key={teacherId} className="signature-print-page rounded-[2rem] border border-slate-200 bg-white p-5 space-y-5">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-slate-400 font-bold mb-1">اسم المعلم</p>
                    <p className="text-slate-800 font-black">{teacher.name}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-slate-400 font-bold mb-1">نوع النموذج</p>
                    <p className="text-slate-800 font-black">العلم بالجدول واستلامه</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-slate-400 font-bold mb-1">المدرسة</p>
                    <p className="text-slate-800 font-black">{schoolInfo.schoolName || 'المدرسة'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white overflow-hidden">
                <InlineScheduleView
                  type="individual_teacher"
                  settings={settings}
                  teachers={teachers}
                  classes={classes}
                  subjects={subjects}
                  targetId={teacherId}
                  specializationNames={specializationNames}
                  compactIndividual
                />
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 font-medium leading-7">
                  تم العلم والاطلاع على الجدول المسند والتوقيع بالاستلام
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-bold text-slate-400 mb-6">اسم المعلم</p>
                    <div className="border-b-2 border-slate-300 h-8" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-bold text-slate-400 mb-6">التاريخ</p>
                    <div className="border-b-2 border-slate-300 h-8" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-bold text-slate-400 mb-6">التوقيع</p>
                    <div className="border-b-2 border-slate-300 h-8" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
  admins,
  specializations,
  onNavigate,
}) => {
  const [taskMode, setTaskMode] = useState<TaskMode>('print');

  const [printScheduleType, setPrintScheduleType] = useState<ScheduleType>('general_teachers');
  const [selectedPrintTeacherIds, setSelectedPrintTeacherIds] = useState<string[]>([]);
  const [selectedPrintClassIds, setSelectedPrintClassIds] = useState<string[]>([]);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [printColorMode, setPrintColorMode] = useState<PrintColorMode>('color');
  const [individualPrintPerPage, setIndividualPrintPerPage] = useState<number>(1);

  const [sendScheduleType, setSendScheduleType] = useState<ScheduleType>('general_teachers');
  const [sendAudience, setSendAudience] = useState<SendAudience>('teachers');
  const [selectedSendTeacherIds, setSelectedSendTeacherIds] = useState<string[]>([]);
  const [selectedSendAdminIds, setSelectedSendAdminIds] = useState<string[]>([]);
  const [selectedSendClassIds, setSelectedSendClassIds] = useState<string[]>([]);
  const [includeSignatureAck, setIncludeSignatureAck] = useState(false);
  const [sendTeacherLinkMode, setSendTeacherLinkMode] = useState<SendTeacherLinkMode>('single_bundle');

  const [exportScheduleType, setExportScheduleType] = useState<ScheduleType>('general_teachers');

  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [printJobs, setPrintJobs] = useState<PrintJob[] | null>(null);
  const [signaturePrintTeacherIds, setSignaturePrintTeacherIds] = useState<string[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  const teacherOptions = useMemo(() => teachers.map(item => ({ value: item.id, label: item.name, icon: User })), [teachers]);
  const adminOptions = useMemo(() => admins.map(item => ({ value: item.id, label: item.name, icon: UserCog })), [admins]);
  const classOptions = useMemo(() => sortedClasses.map(item => ({ value: item.id, label: getClassLabel(item), icon: BookOpen })), [sortedClasses]);
  const scheduleTypeOptions = useMemo(
    () => SCHEDULE_TYPES.map(item => ({ value: item.id, label: item.label, icon: item.icon })),
    []
  );
  const specializationNames = useMemo(
    () => Object.fromEntries(specializations.map(item => [item.id, item.name])),
    [specializations]
  );

  useEffect(() => {
    if (sendAudience === 'parents' && sendScheduleType !== 'individual_class') {
      setSendScheduleType('individual_class');
      setSelectedSendTeacherIds([]);
      setSelectedSendAdminIds([]);
    }
  }, [sendAudience, sendScheduleType]);

  useEffect(() => {
    if (
      includeSignatureAck &&
      sendAudience === 'teachers' &&
      sendScheduleType === 'individual_teacher' &&
      selectedSendTeacherIds.length > 1 &&
      sendTeacherLinkMode !== 'personalized'
    ) {
      setSendTeacherLinkMode('personalized');
    }
  }, [
    includeSignatureAck,
    sendAudience,
    sendScheduleType,
    selectedSendTeacherIds.length,
    sendTeacherLinkMode,
  ]);

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

  const buildShareUrl = (type: ScheduleType, targetIds: string[]) => {
    const url = new URL(`${window.location.origin}/shared-schedule`);
    url.searchParams.set('type', type);
    if (targetIds.length > 0) url.searchParams.set('targets', targetIds.join(','));
    url.searchParams.set('audience', sendAudience);
    if (includeSignatureAck) url.searchParams.set('ack', '1');
    return url.toString();
  };

  const buildTeacherSignatureUrl = (teacherId: string) => {
    const teacher = teachers.find(item => item.id === teacherId);
    const token = createSignatureToken(teacherId);
    const requests = readScheduleSignatureRequests().filter(request => request.teacherId !== teacherId);
    requests.push({
      token,
      teacherId,
      teacherName: teacher?.name || 'معلم',
      createdAt: new Date().toISOString(),
      status: 'pending',
    });
    writeScheduleSignatureRequests(requests);

    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('scheduleSign', token);
    return url.toString();
  };

  const handleSend = () => {
    const links: GeneratedLink[] = [];

    if (sendAudience === 'teachers') {
      if (selectedSendTeacherIds.length === 0) {
        showToast('اختر المعلمين المراد الإرسال لهم.');
        return;
      }

      if (sendScheduleType !== 'individual_teacher') {
        links.push({
          label: SCHEDULE_TYPES.find(item => item.id === sendScheduleType)?.label || sendScheduleType,
          url: buildShareUrl(sendScheduleType, []),
        });
      } else if (includeSignatureAck || sendTeacherLinkMode === 'personalized' || selectedSendTeacherIds.length === 1) {
        selectedSendTeacherIds.forEach(teacherId => {
          const teacher = teachers.find(item => item.id === teacherId);
          links.push({
            label: includeSignatureAck
              ? `جدول ${teacher?.name || 'معلم'} مع التوقيع`
              : `جدول ${teacher?.name || 'معلم'}`,
            url: includeSignatureAck
              ? buildTeacherSignatureUrl(teacherId)
              : buildShareUrl('individual_teacher', [teacherId]),
            teacherId,
          });
        });
      } else {
        links.push({
          label: selectedSendTeacherIds.length === 1 ? 'رابط جدول المعلم' : 'رابط جداول المعلمين',
          url: buildShareUrl('individual_teacher', selectedSendTeacherIds),
        });
      }
    } else if (sendAudience === 'admins') {
      if (selectedSendAdminIds.length === 0) {
        showToast('اختر الإداريين المراد الإرسال لهم.');
        return;
      }
      links.push({
        label: `${SCHEDULE_TYPES.find(item => item.id === sendScheduleType)?.label || sendScheduleType} للإداريين`,
        url: buildShareUrl(sendScheduleType, []),
      });
    } else if (sendAudience === 'parents') {
      if (selectedSendClassIds.length === 0) {
        showToast('اختر الفصول المراد إرسال جداولها لأولياء الأمور.');
        return;
      }
      selectedSendClassIds.forEach(classId => {
        const classItem = classes.find(item => item.id === classId);
        links.push({
          label: `جدول ${classItem ? getClassLabel(classItem) : 'فصل'}`,
          url: buildShareUrl('individual_class', [classId]),
        });
      });
    }

    setGeneratedLinks(links);
    showToast(`تم توليد ${links.length} ${links.length === 1 ? 'رابط' : 'روابط'}.`);
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

  const printableSignatureTeacherIds = generatedLinks
    .map(link => link.teacherId)
    .filter((value): value is string => Boolean(value));

  const openSignaturePrint = (teacherIds: string[]) => {
    if (teacherIds.length === 0) {
      showToast('لا توجد نماذج توقيع جاهزة للطباعة.');
      return;
    }
    setSignaturePrintTeacherIds(teacherIds);
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
        onBack={() => setSignaturePrintTeacherIds(null)}
      />
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
              onClick={() => {
                setTaskMode(option.id);
                setGeneratedLinks([]);
              }}
              className={actionButtonClass(taskMode === option.id)}
            >
              <option.icon size={17} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {taskMode === 'print' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 space-y-5">
          <div className="flex flex-wrap items-end gap-4">
            <SingleSelectDropdown
              label="نوع الجداول"
              value={printScheduleType}
              onChange={value => setPrintScheduleType(value as ScheduleType)}
              placeholder="اختر نوع الجداول"
              options={scheduleTypeOptions}
            />

            {printScheduleType === 'individual_teacher' && (
              <MultiSelectDropdown
                label="المعلمون"
                buttonLabel="اختر المعلمين"
                selectedSummary={selectedPrintTeacherIds.length > 0 ? `${selectedPrintTeacherIds.length} معلمين محددين` : undefined}
                options={teacherOptions}
                selectedValues={selectedPrintTeacherIds}
                onToggle={value => {
                  setSelectedPrintTeacherIds(current =>
                    current.includes(value) ? current.filter(item => item !== value) : [...current, value]
                  );
                }}
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
                onToggle={value => {
                  setSelectedPrintClassIds(current =>
                    current.includes(value) ? current.filter(item => item !== value) : [...current, value]
                  );
                }}
                onClear={() => setSelectedPrintClassIds([])}
                onSelectAll={() => setSelectedPrintClassIds(sortedClasses.map(item => item.id))}
                searchable
              />
            )}
          </div>

          {isPrintGeneral && (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-end gap-4">
                <SingleSelectDropdown
                  label="مقاس الورق"
                  value={paperSize}
                  onChange={value => setPaperSize(value as PaperSize)}
                  placeholder="اختر المقاس"
                  options={[
                    { value: 'A4', label: 'A4' },
                    { value: 'A3', label: 'A3' },
                  ]}
                />
                <SingleSelectDropdown
                  label="اللون"
                  value={printColorMode}
                  onChange={value => setPrintColorMode(value as PrintColorMode)}
                  placeholder="اختر اللون"
                  options={[
                    { value: 'color', label: 'ملون' },
                    { value: 'bw', label: 'أبيض وأسود' },
                  ]}
                />
              </div>
            </div>
          )}

          {(printScheduleType === 'individual_teacher' || printScheduleType === 'individual_class') && (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-end gap-4">
                <SingleSelectDropdown
                  label="اللون"
                  value={printColorMode}
                  onChange={value => setPrintColorMode(value as PrintColorMode)}
                  placeholder="اختر اللون"
                  options={[
                    { value: 'color', label: 'ملون' },
                    { value: 'bw', label: 'أبيض وأسود' },
                  ]}
                />
                <NumberChoiceButtons
                  count={Math.max(1, Math.min(4, selectedPrintCount))}
                  value={individualPrintPerPage}
                  onChange={setIndividualPrintPerPage}
                />
              </div>
            </div>
          )}

          <div className="bg-gradient-to-l from-[#655ac1]/5 via-white to-indigo-50/30 rounded-[2rem] p-5 border border-[#cfc8ff] shadow-sm flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm font-medium text-slate-500">
              {isPrintGeneral && `طباعة ${SCHEDULE_TYPES.find(item => item.id === printScheduleType)?.label || ''}`}
              {printScheduleType === 'individual_teacher' && `طباعة ${selectedPrintTeacherIds.length || 0} جداول معلمين`}
              {printScheduleType === 'individual_class' && `طباعة ${selectedPrintClassIds.length || 0} جداول فصول`}
            </p>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#655ac1] text-white font-black shadow-lg shadow-[#655ac1]/20 hover:bg-[#5046a0] transition-all"
            >
              <Printer size={16} />
              فتح صفحة الطباعة
            </button>
          </div>
        </div>
      )}

      {taskMode === 'send' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 space-y-5">
          <div className="flex flex-wrap items-end gap-4">
            <SingleSelectDropdown
              label="الجدول المراد إرساله"
              value={sendScheduleType}
              onChange={value => setSendScheduleType(value as ScheduleType)}
              placeholder="اختر الجدول"
              disabled={sendAudience === 'parents'}
              options={SCHEDULE_TYPES
                .filter(item => sendAudience !== 'parents' || item.id === 'individual_class')
                .map(item => ({ value: item.id, label: item.label, icon: item.icon }))}
            />

            <SingleSelectDropdown
              label="الجهة المرسل إليها"
              value={sendAudience}
              onChange={value => setSendAudience(value as SendAudience)}
              placeholder="اختر الجهة"
              options={[
                { value: 'teachers', label: 'المعلمون', icon: Users },
                { value: 'admins', label: 'الإداريون', icon: UserCog },
                { value: 'parents', label: 'أولياء الأمور', icon: GraduationCap },
              ]}
            />

            {sendAudience === 'teachers' && (
              <MultiSelectDropdown
                label="المعلمون"
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

            {sendAudience === 'admins' && (
              <MultiSelectDropdown
                label="الإداريون"
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

            {sendAudience === 'parents' && (
              <MultiSelectDropdown
                label="الفصول"
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

            {sendAudience === 'teachers' && sendScheduleType === 'individual_teacher' && selectedSendTeacherIds.length > 1 && (
              <SingleSelectDropdown
                label="نوع الرابط"
                value={sendTeacherLinkMode}
                onChange={value => setSendTeacherLinkMode(value as SendTeacherLinkMode)}
                placeholder="اختر نوع الرابط"
                disabled={includeSignatureAck}
                options={[
                  { value: 'single_bundle', label: 'رابط واحد يظهر جميع الجداول' },
                  { value: 'personalized', label: includeSignatureAck ? 'لكل معلم رابط خاص مع التوقيع' : 'لكل معلم رابط خاص' },
                ]}
              />
            )}

            {sendScheduleType === 'individual_teacher' && sendAudience === 'teachers' && (
              <SingleSelectDropdown
                label="إشعار الاستلام"
                value={includeSignatureAck ? 'yes' : 'no'}
                onChange={value => setIncludeSignatureAck(value === 'yes')}
                placeholder="اختر الحالة"
                options={[
                  { value: 'no', label: 'بدون إشعار توقيع' },
                  { value: 'yes', label: 'تضمين إشعار التوقيع' },
                ]}
              />
            )}
          </div>

          <div className="bg-gradient-to-l from-[#655ac1]/5 via-white to-indigo-50/30 rounded-[2rem] p-5 border border-[#cfc8ff] shadow-sm flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm font-medium text-slate-500">
              {sendAudience === 'parents'
                ? 'إرسال جداول الفصول الفردية لأولياء الأمور فقط'
                : `إرسال ${SCHEDULE_TYPES.find(item => item.id === sendScheduleType)?.label || ''}`}
            </p>
            <button
              onClick={handleSend}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#655ac1] text-white font-black shadow-lg shadow-[#655ac1]/20 hover:bg-[#5046a0] transition-all"
            >
              <Send size={16} />
              توليد الروابط
            </button>
          </div>
        </div>
      )}

      {taskMode === 'export' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 space-y-5">
          <div className="flex flex-wrap items-end gap-4">
            <SingleSelectDropdown
              label="الجدول المراد تصديره إلى Excel"
              value={exportScheduleType}
              onChange={value => setExportScheduleType(value as ScheduleType)}
              placeholder="اختر الجدول"
              options={scheduleTypeOptions}
            />
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#655ac1] text-white font-black shadow-lg shadow-[#655ac1]/20 hover:bg-[#5046a0] transition-all"
            >
              <FileSpreadsheet size={16} />
              تصدير Excel
            </button>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-black text-slate-800">تصدير XML</p>
            </div>
            <button
              onClick={handleExportXML}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#655ac1] border-2 border-slate-200 font-black hover:bg-slate-50 hover:border-[#cfc8ff] transition-all"
            >
              <FileCode2 size={16} />
              تصدير XML
            </button>
          </div>
        </div>
      )}

      {taskMode === 'send' && generatedLinks.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 text-[#655ac1]">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <h4 className="text-sm font-black">الروابط المولدة</h4>
          </div>

          <div className="px-4 py-3.5 border border-slate-100 rounded-2xl bg-slate-50/80 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm font-black text-slate-700">
              {generatedLinks.length} {generatedLinks.length === 1 ? 'رابط جاهز' : 'روابط جاهزة'}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={copyAllLinks}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold"
              >
                <Copy size={13} />
                نسخ الكل
              </button>
              <button
                onClick={openWhatsAppForAll}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] text-xs font-bold border border-[#25D366]/20"
              >
                <WhatsAppIcon size={14} />
                واتساب للكل {generatedLinks.length > 0 && `(${generatedLinks.length})`}
              </button>
              <button
                onClick={openSMSForAll}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] text-xs font-bold border border-[#007AFF]/20"
              >
                <Send size={13} />
                نصية للكل {generatedLinks.length > 0 && `(${generatedLinks.length})`}
              </button>
              {printableSignatureTeacherIds.length > 0 && (
                <button
                  onClick={() => openSignaturePrint(printableSignatureTeacherIds)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200"
                >
                  <Printer size={13} />
                  طباعة الكل {`(${printableSignatureTeacherIds.length})`}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {generatedLinks.map(link => (
              <div key={link.url} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-800">{link.label}</p>
                    <p dir="ltr" className="mt-2 rounded-xl border border-[#d8d1ff] bg-white px-3 py-2 text-xs font-mono text-slate-500 truncate">
                      {link.url}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => openWhatsApp(link)}
                      title="واتساب"
                      className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#25D366]/10 active:scale-90 transition-colors"
                    >
                      <WhatsAppIcon size={15} />
                    </button>
                    <button
                      onClick={() => openSMS(link)}
                      title="رسالة نصية"
                      className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#007AFF]/10 active:scale-90 transition-colors"
                    >
                      <Send size={13} className="text-[#007AFF]" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(link.url)}
                      title="نسخ"
                      className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <Copy size={14} />
                    </button>
                    {link.teacherId && (
                      <button
                        onClick={() => openSignaturePrint([link.teacherId!])}
                        title="طباعة النموذج"
                        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <Printer size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl font-bold shadow-2xl bg-emerald-500 text-white animate-in slide-in-from-bottom-5">
          {toast}
        </div>
      )}
    </div>
  );
};

export default ViewTab;
