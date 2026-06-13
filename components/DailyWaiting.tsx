import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import arabic from 'react-date-object/calendars/arabic';
import arabic_ar from 'react-date-object/locales/arabic_ar';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';
import gregorian_ar from 'react-date-object/locales/gregorian_ar';
import {
  User, UserX, UserPlus, Clock, X, Search,
  AlertCircle, CheckCircle2, Info, Zap, ArrowLeftRight, Users, ClipboardList,
  Calendar, BookOpen, Layers, RefreshCw, Plus, Trash2,
  BarChart3, AlertTriangle, MessageSquare, Printer, CheckCircle, Scale, PieChart,
  ArrowRight, ArrowLeft, Edit3, Shield, Copy, FileText, Send, ChevronDown, ChevronUp, Check,
  PenLine, Eye, Hourglass, Link2, ExternalLink, BookX, UserCog, Shuffle, CircleOff,
  Archive, ClipboardCheck, CalendarClock, Wallet, MoreHorizontal
} from 'lucide-react';
import {
  Teacher, Admin, ClassInfo, Subject, SchoolInfo,
  ScheduleSettingsData, TimetableData, Specialization, SemesterInfo
} from '../types';
import DailyWaitingPrintModal from './DailyWaitingPrintModal';
import { useMessageArchive } from './messaging/MessageArchiveContext';
import RecipientsPreviewModal from './messaging/RecipientsPreviewModal';
import MessagePreviewInline from './messaging/MessagePreviewInline';
import LoadingLogo from './ui/LoadingLogo';
import { getClassLabel } from '../utils/classLabels';
import { getMessageTemplate, fillMessageTemplate, shortenRecipientName, stripUnfilledTokens } from '../utils/messageCatalog';

// ===== Local Type Definitions =====

interface AbsentPeriodEntry {
  periodNumber: number;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

interface SwapCandidate {
  waitingTeacherId: string;
  waitingTeacherName: string;
  quotaDisplay: string;
  theirPeriod: number;
  targetPeriod: number;
  classId: string;
  className: string;
  phone: string;
}

interface AbsentTeacher {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherPhone: string;
  absenceType: 'full' | 'partial';
  periods: AbsentPeriodEntry[];
  swapCandidates: Record<number, SwapCandidate[]>;
  addedAt: string;
}

interface WaitingAssignment {
  id: string;
  absentTeacherId: string;
  absentTeacherName: string;
  periodNumber: number;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  substituteTeacherId: string;
  substituteTeacherName: string;
  substitutePhone: string;
  isSwap: boolean;
  swapFromPeriod?: number;
  status: 'pending' | 'sent' | 'acknowledged' | 'signed';
  assignedAt: string;
  sentAt?: string;
  signatureSignedAt?: string;
  messageChannel?: 'whatsapp' | 'sms';
  notes?: string;
  signatureData?: string;
  sendType?: 'notification' | 'electronic';
  signatureToken?: string;
}
const RECIPIENT_NAME_TOKEN = '{اسم_المستلم}';

interface DailyWaitingSession {
  id: string;
  date: string;
  dayName: string;
  absentTeachers: AbsentTeacher[];
  assignments: WaitingAssignment[];
  isFinalized: boolean;
  createdAt: string;
}

interface WeeklyQuotaRecord {
  weekKey: string;
  counts: Record<string, number>;
  lastResetDate: string;
}

interface DistributionResult {
  assigned: number;
  failed: number;
  skipped: number;
  details: { periodNumber: number; className: string; assignedTo: string | null; reason?: string; absentTeacherName?: string }[];
  teacherLoad: Record<string, { name: string; newCount: number; total: number }>;
}

// ── Phase 3: Business Rules ──
type RuleSeverity = 'blocking' | 'warning';

interface BusinessRuleViolation {
  ruleId: string;
  severity: RuleSeverity;
  message: string;
}

// ===== Constants =====
const ARABIC_DAYS: Record<string, string> = {
  'Sunday': 'الأحد',
  'Monday': 'الاثنين',
  'Tuesday': 'الثلاثاء',
  'Wednesday': 'الأربعاء',
  'Thursday': 'الخميس',
  'Friday': 'الجمعة',
  'Saturday': 'السبت',
};

const ADMIN_BLOCKED_ROLES = ['مساعد إداري', 'مساعد', 'سكرتير'];

// ===== Helper functions =====
const getTodayStr = () => new Date().toISOString().split('T')[0];

const getArabicDayFromDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const eng = d.toLocaleDateString('en-US', { weekday: 'long' });
  return ARABIC_DAYS[eng] || 'الأحد';
};

const getISOWeekKey = (dateStr: string): string => {
  const d = new Date(dateStr);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

const toLocalISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface AcademicWeek {
  number: number;
  start: string;
  end: string;
  days: string[];
  holidays: string[];
  hasHoliday: boolean;
}

const buildAcademicWeeks = (semester: SemesterInfo | undefined): AcademicWeek[] => {
  if (!semester?.startDate || !semester.endDate || !semester.weeksCount) return [];
  const workStart = semester.workDaysStart ?? 0;
  const workEnd = semester.workDaysEnd ?? 4;
  const holidaySet = new Set(semester.holidays || []);
  const start = new Date(`${semester.startDate}T00:00:00`);
  const end = new Date(`${semester.endDate}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
  const cur = new Date(start);
  while (cur.getDay() !== workStart && cur <= end) cur.setDate(cur.getDate() + 1);
  const weeks: AcademicWeek[] = [];
  let num = 1;
  while (cur <= end && num <= semester.weeksCount) {
    const days: string[] = [];
    const weekHolidays: string[] = [];
    for (let d = workStart; d <= workEnd; d++) {
      const dateStr = toLocalISODate(cur);
      days.push(dateStr);
      if (holidaySet.has(dateStr)) weekHolidays.push(dateStr);
      cur.setDate(cur.getDate() + 1);
    }
    while (cur.getDay() !== workStart && cur <= end) cur.setDate(cur.getDate() + 1);
    weeks.push({
      number: num,
      start: days[0],
      end: days[days.length - 1],
      days,
      holidays: weekHolidays,
      hasHoliday: weekHolidays.length > 0,
    });
    num++;
  }
  return weeks;
};

const getCurrentAcademicSemester = (schoolInfo: SchoolInfo): SemesterInfo | undefined => {
  const semesters = schoolInfo.semesters || [];
  if (semesters.length === 0) return undefined;

  return semesters.find(s => s.id === schoolInfo.currentSemesterId)
    || semesters.find(s => s.isCurrent)
    || semesters[0];
};

const getWaitingWeekRange = (dateStr: string): { start: string; end: string; weekKey: string } => {
  const d = new Date(`${dateStr}T00:00:00`);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 4);
  const startStr = toLocalISODate(start);
  return {
    start: startStr,
    end: toLocalISODate(end),
    weekKey: getISOWeekKey(startStr),
  };
};

const formatHijri = (dateStr: string): string => {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr));
  } catch { return dateStr; }
};

const formatGregorian = (dateStr: string): string => {
  try {
    return new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr));
  } catch { return dateStr; }
};

// Numeric date (month as a number, Latin digits) respecting the school calendar.
const formatDateNumeric = (dateStr: string, calendarType: 'hijri' | 'gregorian'): string => {
  try {
    const parsed = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    const locale = calendarType === 'hijri' ? 'ar-SA-u-ca-islamic-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn';
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
  } catch { return dateStr; }
};

// Numeric date from a full ISO timestamp (month as a number, Latin digits).
const formatISODateNumeric = (value: string | undefined, calendarType: 'hijri' | 'gregorian'): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  const locale = calendarType === 'hijri' ? 'ar-SA-u-ca-islamic-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
};

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatReceiptDateTime = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
};

const formatReceiptTime = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(parsed);
  const hour = parts.find(part => part.type === 'hour')?.value || '';
  const minute = parts.find(part => part.type === 'minute')?.value || '00';
  const period = (parts.find(part => part.type === 'dayPeriod')?.value || '').includes('م') ? 'م' : 'ص';
  return `${hour}:${minute} ${period}`;
};

// ── Report helpers (pure, module-level) ──
const getWeekDates = (dateStr: string): string[] => {
  const d = new Date(dateStr + 'T00:00:00');
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 5 }, (_, i) => {
    const dt = new Date(sunday);
    dt.setDate(sunday.getDate() + i);
    return dt.toISOString().split('T')[0];
  });
};

const getMonthWeeks = (yearMonthStr: string): { label: string; dates: string[] }[] => {
  const [year, month] = yearMonthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  return [
    { label: 'الأسبوع الأول',   start: 1,  end: 7 },
    { label: 'الأسبوع الثاني',  start: 8,  end: 14 },
    { label: 'الأسبوع الثالث', start: 15, end: 21 },
    { label: 'الأسبوع الرابع', start: 22, end: daysInMonth },
  ].map(({ label, start, end }) => ({
    label,
    dates: Array.from({ length: end - start + 1 }, (_, i) => {
      const dt = new Date(year, month - 1, start + i);
      return dt.toISOString().split('T')[0];
    }),
  }));
};

const formatMonthName = (yearMonthStr: string, calType: 'gregorian' | 'hijri'): string => {
  const [year, month] = yearMonthStr.split('-').map(Number);
  const d = new Date(year, month - 1, 15);
  try {
    return calType === 'hijri'
      ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { month: 'long', year: 'numeric' }).format(d)
      : new Intl.DateTimeFormat('ar-SA', { month: 'long', year: 'numeric' }).format(d);
  } catch { return yearMonthStr; }
};

// ===== WhatsApp Icon =====
const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

type WaitingDropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const WaitingSingleSelect: React.FC<{
  label: string;
  value: string;
  options: WaitingDropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}> = ({ label, value, options, placeholder, onChange, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="flex-1 min-w-[220px] relative">
      <label className="block text-xs font-black text-slate-500 mb-2">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(current => !current)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="truncate text-[13px] leading-tight">{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-[60] top-full right-0 left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5">
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1">
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
                  option.disabled ? 'text-slate-300 cursor-not-allowed bg-slate-50/70' :
                  value === option.value ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                }`}
              >
                <span>{option.label}</span>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                  value === option.value ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                }`}>
                  <Check size={12} strokeWidth={3.5} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const WaitingMultiSelect: React.FC<{
  label: string;
  values: string[];
  options: WaitingDropdownOption[];
  placeholder: string;
  onToggle: (value: string) => void;
  disabled?: boolean;
}> = ({ label, values, options, placeholder, onToggle, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const summary = values.length === 0 ? placeholder : `${values.length} معلم محدد`;

  return (
    <div ref={containerRef} className="flex-1 min-w-[220px] relative">
      <label className="block text-xs font-black text-slate-500 mb-2">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(current => !current)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="truncate text-[13px] leading-tight">{summary}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-[60] top-full right-0 left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5">
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1">
            {options.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 text-center py-6">لا يوجد معلمون غائبون</p>
            ) : options.map(option => {
              const checked = values.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToggle(option.value)}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                    checked ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                    checked ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                  }`}>
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

type WaitingRecipientRow = { key: string; asgn: { substituteTeacherName: string; periodNumber: number; className: string; absentTeacherName: string; substitutePhone?: string } };

const WaitingRecipientsMultiSelect: React.FC<{
  rows: any[];
  selectedIds: Set<string>;
  open: boolean;
  setOpen: (v: boolean | ((current: boolean) => boolean)) => void;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}> = ({ rows, selectedIds, open, setOpen, onToggle, onSelectAll, onClear }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const filteredSelectedCount = rows.filter(r => selectedIds.has(r.key)).length;
  const allSelected = rows.length > 0 && filteredSelectedCount === rows.length;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, setOpen]);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-black text-slate-500 mb-2">المنتظرون المستلمون</label>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2"
      >
        <span className="truncate text-[13px] leading-tight">
          {filteredSelectedCount > 0 ? `${filteredSelectedCount} مستلم محدد` : 'لم يتم اختيار مستلمين'}
        </span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-[60] top-full right-0 left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={allSelected ? onClear : onSelectAll}
              disabled={rows.length === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                rows.length === 0
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white'
              }`}
            >
              {allSelected ? 'إلغاء الكل' : 'اختيار الكل'}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {rows.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 text-center py-6">لا توجد تكليفات انتظار لهذا اليوم</p>
            ) : rows.map((row: any) => {
              const checked = selectedIds.has(row.key);
              return (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => onToggle(row.key)}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${checked ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}
                >
                  <span className="min-w-0 text-right">
                    <span className="block text-[13px] font-black truncate">{row.asgn.substituteTeacherName}</span>
                    <span className="block text-[12px] font-bold text-slate-500 truncate">الحصة {row.asgn.periodNumber} · {row.asgn.className}</span>
                  </span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 transition-all ${checked ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
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

// ===== Props =====
interface DailyWaitingProps {
  teachers: Teacher[];
  admins: Admin[];
  classes: ClassInfo[];
  subjects: Subject[];
  schoolInfo: SchoolInfo;
  scheduleSettings: ScheduleSettingsData;
  specializations?: Specialization[];
  embeddedSection?: 'register' | 'distribute' | 'balance' | 'printsend' | 'send' | 'reports';
  onSectionExit?: () => void;
  onGoToPrintSend?: () => void;
  onGoToDistribute?: () => void;
  onOpenMessagesArchive?: () => void;
  activeSchoolTab?: string;
  selectedDate?: string;
  onSelectedDateChange?: (date: string) => void;
}

// ===== قائمة منسدلة متعددة الاختيار (بنمط اختيار الأسبوع في إرسال المناوبة) =====
interface RptOption { value: string; label: React.ReactNode; search?: string; }
const ReportMultiSelect: React.FC<{
  label: string;
  buttonLabel: string;
  summary?: React.ReactNode;
  options: RptOption[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
}> = ({ label, buttonLabel, summary, options, selected, onToggle, onSelectAll, onClear, searchable = false, searchPlaceholder = 'ابحث...', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => { if (!open) setQ(''); }, [open]);
  const term = q.trim();
  const visible = term ? options.filter(o => `${o.search || ''}`.includes(term)) : options;
  const allSelected = options.length > 0 && options.every(o => selected.has(o.value));
  return (
    <div className="relative flex-1 min-w-[240px]" ref={ref}>
      <label className="block text-xs font-black text-slate-500 mb-2">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="min-w-0 flex items-center gap-1.5 text-[13px] leading-tight text-right overflow-hidden whitespace-nowrap">{summary || buttonLabel}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 z-[130] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 animate-in slide-in-from-top-2">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={allSelected ? onClear : onSelectAll}
              disabled={options.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-white border-slate-300 text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white transition-all disabled:opacity-50"
            >
              {allSelected ? 'إلغاء الكل' : 'اختيار الكل'}
            </button>
          </div>
          {searchable && (
            <div className="relative mb-2">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pr-8 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#655ac1] focus:bg-white transition-all"
                dir="rtl"
                autoFocus
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {visible.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs font-bold text-slate-400">لا توجد نتائج مطابقة.</div>
            ) : visible.map(o => {
              const isSel = selected.has(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => onToggle(o.value)}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between gap-3 ${isSel ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}
                >
                  <span className="min-w-0 flex-1">{o.label}</span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all shrink-0 ${isSel ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
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

// ===== Main Component =====
const DailyWaiting: React.FC<DailyWaitingProps> = ({
  teachers, admins, classes, subjects, schoolInfo, scheduleSettings, specializations = [], embeddedSection, onSectionExit, onGoToPrintSend, onGoToDistribute, onOpenMessagesArchive, activeSchoolTab = 'main', selectedDate: controlledSelectedDate, onSelectedDateChange
}) => {
  const storageSuffix = activeSchoolTab && activeSchoolTab !== 'main' ? `_${activeSchoolTab}` : '';
  const SESSIONS_KEY = `daily_waiting_sessions_v1${storageSuffix}`;
  const QUOTA_KEY = `daily_waiting_quota_v1${storageSuffix}`;
  const { sendMessage } = useMessageArchive();
  // ===== Embedded section flags =====
  const isEmbedded = !!embeddedSection;
  const isRegister = embeddedSection === 'register';
  const isDistribute = embeddedSection === 'distribute';
  const isBalance = embeddedSection === 'balance';
  const isPrintSend = embeddedSection === 'printsend';
  const isSend = embeddedSection === 'send';
  const isReports = embeddedSection === 'reports';
  // ===== State =====
  const [localSelectedDate, setLocalSelectedDate] = useState<string>(getTodayStr());
  const selectedDate = controlledSelectedDate ?? localSelectedDate;
  const setSelectedDate = useCallback((date: string) => {
    setLocalSelectedDate(date);
    onSelectedDateChange?.(date);
  }, [onSelectedDateChange]);
  const [sessions, setSessions] = useState<DailyWaitingSession[]>(() => {
    try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); } catch { return []; }
  });
  // Waiting quota is bucketed per week-key: { [weekKey]: { [teacherId]: count } }.
  // Each week is isolated automatically, so no "new week" reset prompt is needed.
  const [quotaByWeek, setQuotaByWeek] = useState<Record<string, Record<string, number>>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(QUOTA_KEY) || 'null');
      if (saved && saved.byWeek && typeof saved.byWeek === 'object') return saved.byWeek;
      // Migrate legacy single-week record { weekKey, counts }.
      if (saved && saved.weekKey && saved.counts) return { [saved.weekKey]: saved.counts };
    } catch {}
    return {};
  });

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printTargetTeacherId, setPrintTargetTeacherId] = useState<string | null>(null);
  const [printTargetTeacherIds, setPrintTargetTeacherIds] = useState<string[]>([]);
  const [printShowSignatures, setPrintShowSignatures] = useState(false);
  const [waitingSendResults, setWaitingSendResults] = useState<{ name: string; status: 'sent' | 'failed' }[]>([]);
  const [showWaitingSendResults, setShowWaitingSendResults] = useState(false);
  const [waitingSendChannel, setWaitingSendChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [printInitialTab, setPrintInitialTab] = useState<'print' | 'blank'>('print');
  const [waitingPrintColorMode, setWaitingPrintColorMode] = useState<'color' | 'bw'>('color');
  const [blankPrintColorMode, setBlankPrintColorMode] = useState<'color' | 'bw'>('color');
  const [waitingPrintScope, setWaitingPrintScope] = useState<'all' | 'teacher'>('all');
  const [selectedPrintTeacherIds, setSelectedPrintTeacherIds] = useState<string[]>([]);
  const [waitingTaskMode, setWaitingTaskMode] = useState<'print' | 'send'>(embeddedSection === 'send' ? 'send' : 'print');
  const [showWaitingReceipt, setShowWaitingReceipt] = useState(false);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'signed' | 'pending'>('all');

  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [showSwapConfirm, setShowSwapConfirm] = useState<{
    swap: SwapCandidate; period: AbsentPeriodEntry; absentId: string; absentName: string;
  } | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<{
    period: AbsentPeriodEntry; absentTeacher: AbsentTeacher;
  } | null>(null);
  const [showManualDistModal, setShowManualDistModal] = useState(false);
  const [manualDistMode, setManualDistMode] = useState(false);
  const [distributionMode, setDistributionMode] = useState<'auto' | 'manual' | null>(null);
  type AbsenceQueueEntry = { teacherId: string; teacherName: string; absenceType: 'full' | 'partial'; selectedPeriods: Set<number> };
  const [absentQueue, setAbsentQueue] = useState<AbsenceQueueEntry[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [swapSendMode, setSwapSendMode] = useState<'auto' | 'manual'>('manual');

  const [absenceForm, setAbsenceForm] = useState<{
    teacherId: string;
    absenceType: 'full' | 'partial';
    selectedPeriods: Set<number>;
  }>({ teacherId: '', absenceType: 'full', selectedPeriods: new Set() });
  const [teacherSearch, setTeacherSearch] = useState('');

  // ── Phase 2: Distribution Engine ──
  const [showDistReport, setShowDistReport] = useState(false);
  const [lastDistResult, setLastDistResult] = useState<DistributionResult | null>(null);
  const [showAutoOverwriteConfirm, setShowAutoOverwriteConfirm] = useState(false);
  const [pendingAutoFn, setPendingAutoFn] = useState<(() => void) | null>(null);
  const [showManualOverwriteConfirm, setShowManualOverwriteConfirm] = useState(false);
  const [removeAssignmentConfirm, setRemoveAssignmentConfirm] = useState<WaitingAssignment | null>(null);
  const [clearTeacherAssignmentsConfirm, setClearTeacherAssignmentsConfirm] = useState<AbsentTeacher | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [disabledWaitingSlots, setDisabledWaitingSlots] = useState<Set<string>>(new Set());
  const [selectedAssignPerson, setSelectedAssignPerson] = useState<Teacher | Admin | null>(null);
  const [manualNameSlots, setManualNameSlots] = useState<Set<string>>(new Set());
  const [manualNameValues, setManualNameValues] = useState<Record<string, string>>({});
  const [showRankModal, setShowRankModal] = useState<'top' | 'bottom' | null>(null);
  const [assignModalTab, setAssignModalTab] = useState<'teachers' | 'admins'>('teachers');
  // Per-period row actions dropdown (matches TeachersAndStaff "قسم المعلمون" design)
  const [rowActionMenu, setRowActionMenu] = useState<{ period: AbsentPeriodEntry; absentTeacher: AbsentTeacher; top: number; right: number } | null>(null);
  const openRowActionMenu = (e: React.MouseEvent, period: AbsentPeriodEntry, absentTeacher: AbsentTeacher) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const MENU_W = 200;
    // Anchor menu's right edge to the button, but clamp so it never clips off-screen.
    let right = window.innerWidth - rect.right;
    right = Math.max(8, Math.min(right, window.innerWidth - MENU_W - 8));
    setRowActionMenu(prev => (
      prev && prev.absentTeacher.id === absentTeacher.id && prev.period.periodNumber === period.periodNumber
        ? null
        : { period, absentTeacher, top: rect.bottom + 4, right }
    ));
  };
  const [showShortageAlert, setShowShortageAlert] = useState(false);
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);
  const [isAutoDistributing, setIsAutoDistributing] = useState(false);

  // ── Phase 4: Messaging ──
  const [showSendModal, setShowSendModal] = useState(false);
  const [showSendTable, setShowSendTable] = useState(true);

  // ── Quick-action deep-link events from Dashboard ─────────────────
  useEffect(() => {
    const onAddWaiting  = () => setShowAbsenceModal(true);
    const onSendWaiting = () => { setShowSendTable(true); setShowSendModal(true); };
    window.addEventListener('motabe:add_waiting',  onAddWaiting);
    window.addEventListener('motabe:send_waiting', onSendWaiting);
    return () => {
      window.removeEventListener('motabe:add_waiting',  onAddWaiting);
      window.removeEventListener('motabe:send_waiting', onSendWaiting);
    };
  }, []);
  const [sendMasterTemplate, setSendMasterTemplate] = useState('');
  const [sendCustomMessages, setSendCustomMessages] = useState<Record<string, string>>({});
  const [sendSelectedIds, setSendSelectedIds] = useState<Set<string>>(new Set());
  const [sendModalMode, setSendModalMode] = useState<'notification' | 'electronic'>('electronic');
  const [sendPreferredChannel, setSendPreferredChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [sendFallbackToSms, setSendFallbackToSms] = useState(true);
  const [sendScheduleEnabled, setSendScheduleEnabled] = useState(false);
  const [sendScheduledAt, setSendScheduledAt] = useState('');
  const sendScheduleCalendarType = (schoolInfo.calendarType || 'hijri') as 'hijri' | 'gregorian';
  const [sendScheduleDate, setSendScheduleDate] = useState('');
  const [sendScheduleTime, setSendScheduleTime] = useState('');
  const [showSendRecipientsPreview, setShowSendRecipientsPreview] = useState(false);
  const [sendAbsentFilterId, setSendAbsentFilterId] = useState<string>('');
  const [sendRecipientsDropdownOpen, setSendRecipientsDropdownOpen] = useState(false);
  const [showSendRecipientsModal, setShowSendRecipientsModal] = useState(false);

  // ── Electronic Signature Preview ──
  const [showElectronicPreview, setShowElectronicPreview] = useState(false);
  const [previewAssignment, setPreviewAssignment] = useState<WaitingAssignment | null>(null);
  const signaturePadRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // ── Phase 5: Print ──

  // ── Reports Modal ──
  const [showReportsModal, setShowReportsModal] = useState(false);

  // ── Reports Modal (new design) ──
  const [rptFromDate, setRptFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [rptToDate, setRptToDate] = useState<string>(getTodayStr());
  const [rptStaffMode, setRptStaffMode] = useState<'all' | 'specific'>('all');
  const [rptSelectedIds, setRptSelectedIds] = useState<Set<string>>(new Set());
  const [rptSearch, setRptSearch] = useState('');
  const [rptDropdownOpen, setRptDropdownOpen] = useState(false);
  const [rptSelectedWeekNumbers, setRptSelectedWeekNumbers] = useState<Set<number>>(new Set());
  const rptCalendarType = (schoolInfo.calendarType || 'hijri') as 'hijri' | 'gregorian';
  const [rptWeekDropdownOpen, setRptWeekDropdownOpen] = useState(false);
  const [rptWeekSearch, setRptWeekSearch] = useState('');
  const rptWeekDropdownRef = useRef<HTMLDivElement>(null);
  const [rptStaffModalOpen, setRptStaffModalOpen] = useState(false);
  const [rptStaffTab, setRptStaffTab] = useState<'teacher' | 'admin'>('teacher');

  useEffect(() => {
    if (!rptWeekDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (rptWeekDropdownRef.current && !rptWeekDropdownRef.current.contains(e.target as Node)) {
        setRptWeekDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [rptWeekDropdownOpen]);

  // ── Teacher Remove Confirm ──
  const [showTeacherRemoveConfirm, setShowTeacherRemoveConfirm] = useState(false);

  // ── Absent Teacher Delete Confirm ──
  const [removeAbsentConfirm, setRemoveAbsentConfirm] = useState<{ id: string; name: string } | null>(null);
  const [showClearAllAbsentsConfirm, setShowClearAllAbsentsConfirm] = useState(false);

  // ── Submit Absence Confirm ──
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // ── Balance Modal ──
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [resetConfirmStep, setResetConfirmStep] = useState<'idle' | 'confirm'>('idle');
  const [showBalanceResetConfirm, setShowBalanceResetConfirm] = useState(false);

  // ── New-week reset prompt (custom modal replacing window.confirm) ──

  // ── Past-week editing banner: dismissed per-date in this session ──
  const [pastBannerDismissed, setPastBannerDismissed] = useState<Record<string, boolean>>(() => {
    try {
      const raw = sessionStorage.getItem('dw-past-banner-dismissed');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const dismissPastBanner = (dateStr: string) => {
    setPastBannerDismissed(prev => {
      const next = { ...prev, [dateStr]: true };
      try { sessionStorage.setItem('dw-past-banner-dismissed', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // ── Absence modal date ref ──
  const absenceDateInputRef = useRef<HTMLInputElement>(null);

  // ── Phase 3: Business Rules ──

  // ===== Persistence =====
  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    // Notify the container shell so the stepper completion marks stay in sync.
    try { window.dispatchEvent(new CustomEvent('motabe:waiting_changed')); } catch {}
  }, [sessions, SESSIONS_KEY]);

  useEffect(() => {
    localStorage.setItem(QUOTA_KEY, JSON.stringify({ byWeek: quotaByWeek }));
  }, [quotaByWeek, QUOTA_KEY]);

  // Re-hydrate state when active school changes
  useEffect(() => {
    try {
      const rawSessions = localStorage.getItem(SESSIONS_KEY);
      setSessions(rawSessions ? JSON.parse(rawSessions) : []);
    } catch { setSessions([]); }
    try {
      const rawQuota = JSON.parse(localStorage.getItem(QUOTA_KEY) || 'null');
      if (rawQuota && rawQuota.byWeek && typeof rawQuota.byWeek === 'object') setQuotaByWeek(rawQuota.byWeek);
      else if (rawQuota && rawQuota.weekKey && rawQuota.counts) setQuotaByWeek({ [rawQuota.weekKey]: rawQuota.counts });
      else setQuotaByWeek({});
    } catch { setQuotaByWeek({}); }
    setDisabledWaitingSlots(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchoolTab]);

  // ===== Derived data =====
  const timetable: TimetableData = useMemo(() => {
    const activeSaved = scheduleSettings?.savedSchedules?.find(s => s.id === scheduleSettings?.activeScheduleId);
    if (activeSaved?.timetable && Object.keys(activeSaved.timetable).length > 0) return activeSaved.timetable;
    if (scheduleSettings?.timetable && Object.keys(scheduleSettings.timetable).length > 0) return scheduleSettings.timetable;
    const latestSaved = scheduleSettings?.savedSchedules?.[0];
    return latestSaved?.timetable || {};
  }, [scheduleSettings?.activeScheduleId, scheduleSettings?.savedSchedules, scheduleSettings?.timetable]);
  const dayName = useMemo(() => getArabicDayFromDate(selectedDate), [selectedDate]);
  // مفتاح اليوم بالإنجليزية لمطابقة مفاتيح الجدول الزمني (sunday, monday, ...)
  const dayKey = useMemo(() => new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(), [selectedDate]);
  // نصاب الانتظار الفعلي للمدرسة النشطة (مطابق لمنطق getSchoolQuota في صفحة المعلمون):
  // القيمة المعتمدة محفوظة لكل مدرسة في schools[].waiting، مع waitingQuota كقيمة احتياطية.
  const getTeacherWaitingQuota = (t: Teacher): number => {
    if (t.isShared || (t.schools && t.schools.length)) {
      const entry = t.schools?.find(s => s.schoolId === activeSchoolTab);
      if (entry) return entry.waiting || 0;
    }
    return t.waitingQuota || 0;
  };
  // تاريخ رقمي نظيف بصيغة «22 / 12 / 1447هـ» (الشهر رقمًا، بدون تكرار «هـ» أو علامات اتجاه).
  const fmtNumericDate = (dateStr: string): string => {
    const calType = (schoolInfo.calendarType === 'gregorian' ? 'gregorian' : 'hijri') as 'hijri' | 'gregorian';
    const numeric = formatDateNumeric(dateStr, calType)
      .replace(/[‎‏]/g, '')
      .replace(/\s*هـ\s*$/, '')
      .replace(/\s*\/\s*/g, ' / ')
      .trim();
    return `${numeric}${calType === 'hijri' ? 'هـ' : ''}`;
  };
  const waitingWeekRange = useMemo(() => {
    const semester = getCurrentAcademicSemester(schoolInfo);
    const weeks = buildAcademicWeeks(semester);
    const match = weeks.find(w => selectedDate >= w.start && selectedDate <= w.end);
    if (match) return { start: match.start, end: match.end, weekKey: `acad-W${match.number}`, number: match.number as number | null };
    return { ...getWaitingWeekRange(selectedDate), number: null as number | null };
  }, [selectedDate, schoolInfo]);

  // Week relation: is selectedDate's week before / equal / after today's week?
  const weekRelation = useMemo<'same' | 'past' | 'future'>(() => {
    const today = getTodayStr();
    const semester = getCurrentAcademicSemester(schoolInfo);
    const weeks = buildAcademicWeeks(semester);
    const todayMatch = weeks.find(w => today >= w.start && today <= w.end);
    const todayWeekStart = todayMatch ? todayMatch.start : getWaitingWeekRange(today).start;
    if (waitingWeekRange.start < todayWeekStart) return 'past';
    if (waitingWeekRange.start > todayWeekStart) return 'future';
    return 'same';
  }, [waitingWeekRange.start, schoolInfo]);

  // The quota record the rest of the component reads/writes — always the
  // bucket for the currently selected date's week. Writes are routed back into
  // that same bucket, so past/current/future weeks never touch one another.
  const weeklyQuota = useMemo<WeeklyQuotaRecord>(() => ({
    weekKey: waitingWeekRange.weekKey,
    counts: quotaByWeek[waitingWeekRange.weekKey] || {},
    lastResetDate: '',
  }), [quotaByWeek, waitingWeekRange.weekKey]);

  const setWeeklyQuota = (
    updater: WeeklyQuotaRecord | ((prev: WeeklyQuotaRecord) => WeeklyQuotaRecord)
  ) => {
    setQuotaByWeek(prevMap => {
      const wk = waitingWeekRange.weekKey;
      const prevRecord: WeeklyQuotaRecord = { weekKey: wk, counts: prevMap[wk] || {}, lastResetDate: '' };
      const next = typeof updater === 'function' ? updater(prevRecord) : updater;
      return { ...prevMap, [wk]: next.counts || {} };
    });
  };

  const currentSession = useMemo(
    () => sessions.find(s => s.date === selectedDate) || null,
    [sessions, selectedDate]
  );

  const absentTeacherIds = useMemo(
    () => new Set(currentSession?.absentTeachers.map(a => a.teacherId) || []),
    [currentSession]
  );

  // Direct lookup keeps teacher IDs that contain hyphens from being split incorrectly.
  const getTeacherDaySchedule = useCallback((teacherId: string, day: string): AbsentPeriodEntry[] => {
    const entries: AbsentPeriodEntry[] = [];
    const dayPeriodCount = schoolInfo.timing?.periodCounts?.[day] || 7;
    for (let p = 1; p <= dayPeriodCount; p++) {
      const slot = timetable[`${teacherId}-${day}-${p}`];
      if (!slot || slot.type !== 'lesson') continue;
      const classInfo = classes.find(c => c.id === slot.classId);
      const subjectInfo = subjects.find(s => s.id === slot.subjectId);
      entries.push({
        periodNumber: p,
        classId: slot.classId || '',
        className: classInfo
          ? getClassLabel(classInfo)
          : (slot.classId || `فصل ${p}`),
        subjectId: slot.subjectId || '',
        subjectName: subjectInfo?.name || 'مادة',
      });
    }
    return entries;
  }, [timetable, classes, subjects, schoolInfo.timing]);

  // Smart Swap Engine: find teachers who teach same class in a later period
  const findSwapCandidates = useCallback(
    (absentTeacherId: string, period: AbsentPeriodEntry, day: string, currentAbsentIds: Set<string>): SwapCandidate[] => {
      if (!period.classId) return [];
      const candidates: SwapCandidate[] = [];

      for (const teacher of teachers) {
        if (teacher.id === absentTeacherId) continue;
        if (currentAbsentIds.has(teacher.id)) continue;
        if ((teacher.waitingQuota || 0) <= 0) continue;

        const theirPeriods = Object.entries(timetable).filter(([key, slot]) => {
          const parts = key.split('-');
          if (parts.length < 3 || slot.type !== 'lesson') return false;
          const tId = parts[0];
          const d = parts.slice(1, parts.length - 1).join('-');
          const p = parseInt(parts[parts.length - 1]);
          return tId === teacher.id && d === day && slot.classId === period.classId && p > period.periodNumber;
        });

        if (theirPeriods.length > 0) {
          const [swapKey] = theirPeriods.sort(([a], [b]) => {
            const pa = parseInt(a.split('-').at(-1)!);
            const pb = parseInt(b.split('-').at(-1)!);
            return pa - pb;
          });
          const swapPeriod = parseInt(swapKey[0].split('-').at(-1)!);
          const assigned = weeklyQuota.counts[teacher.id] || 0;
          const total = teacher.waitingQuota || 10;
          candidates.push({
            waitingTeacherId: teacher.id,
            waitingTeacherName: teacher.name,
            quotaDisplay: `${assigned}/${total}`,
            theirPeriod: swapPeriod,
            targetPeriod: period.periodNumber,
            classId: period.classId,
            className: period.className,
            phone: teacher.phone || '',
          });
        }
      }
      return candidates;
    },
    [teachers, timetable, weeklyQuota]
  );

  // Available waiting teachers for a period
  const getWaitersWithQuota = useCallback(
    (periodNumber: number, day: string, currentAssignments: WaitingAssignment[]) => {
      const alreadyAssigned = new Set(
        currentAssignments
          .filter(a => a.periodNumber === periodNumber)
          .map(a => a.substituteTeacherId)
      );

      const result: { person: Teacher | Admin; assigned: number; total: number; quotaDisplay: string; isTeacher: boolean }[] = [];

      for (const t of teachers) {
        if (absentTeacherIds.has(t.id)) continue;
        if (alreadyAssigned.has(t.id)) continue;
        // Exclude teachers with full 24 lesson quota and no waiting quota
        if (t.quotaLimit >= 24 && !t.waitingQuota) continue;
        // Check not busy at this period
        const busyKey = `${t.id}-${day}-${periodNumber}`;
        if (timetable[busyKey]?.type === 'lesson') continue;

        const total = t.waitingQuota || 10;
        const assigned = weeklyQuota.counts[t.id] || 0;
        result.push({ person: t, assigned, total, quotaDisplay: `${assigned}/${total}`, isTeacher: true });
      }

      for (const a of admins) {
        if (alreadyAssigned.has(a.id)) continue;
        if (ADMIN_BLOCKED_ROLES.some(r => a.role?.includes(r))) continue;
        const total = a.waitingQuota || 5;
        const assigned = weeklyQuota.counts[a.id] || 0;
        result.push({ person: a, assigned, total, quotaDisplay: `${assigned}/${total}`, isTeacher: false });
      }

      return result.sort((a, b) => (b.total - b.assigned) - (a.total - a.assigned));
    },
    [teachers, admins, timetable, absentTeacherIds, weeklyQuota]
  );

  // ══ Phase 3: Business Rule Validator ══
  const validateAssignment = useCallback((
    person: Teacher | Admin,
    period: AbsentPeriodEntry,
    absentTeacher: AbsentTeacher,
    currentAssignments: WaitingAssignment[],
    day: string,
    ignoredAssignment?: WaitingAssignment | null,
  ): BusinessRuleViolation[] => {
    const violations: BusinessRuleViolation[] = [];
    const isTeacher = teachers.some(t => t.id === person.id);

    // Rule 1 [BLOCKING] — person is absent today
    if (absentTeacherIds.has(person.id)) {
      violations.push({ ruleId: 'absent', severity: 'blocking', message: 'هذا المعلم مُسجَّل غائبًا اليوم' });
    }

    // Rule 2 [BLOCKING] — person already has a real lesson at this period
    const busyKey = `${person.id}-${day}-${period.periodNumber}`;
    if (timetable[busyKey]?.type === 'lesson') {
      violations.push({ ruleId: 'lesson_conflict', severity: 'blocking', message: `لديه حصة تدريسية في الحصة ${period.periodNumber}` });
    }

    // Rule 3 [BLOCKING] — already assigned to another absent teacher at same period
    const doubleAssign = currentAssignments.find(
      a => a.id !== ignoredAssignment?.id && a.substituteTeacherId === person.id && a.periodNumber === period.periodNumber && a.absentTeacherId !== absentTeacher.id
    );
    if (doubleAssign) {
      violations.push({ ruleId: 'double_assign', severity: 'blocking', message: `مُسنَد بالفعل في الحصة ${period.periodNumber} لغائب آخر` });
    }

    // Rule 4 [BLOCKING] — weekly quota exceeded
    if (isTeacher) {
      const teacher = person as Teacher;
      const total = teacher.waitingQuota || 10;
      const assigned = Math.max(
        0,
        (weeklyQuota.counts[teacher.id] || 0) -
          (!ignoredAssignment?.isSwap && ignoredAssignment?.substituteTeacherId === teacher.id ? 1 : 0)
      );
      if (assigned >= total) {
        violations.push({ ruleId: 'quota_exceeded', severity: 'blocking', message: `اكتمل نصابه الأسبوعي (${assigned}/${total})` });
      }
    }

    return violations;
  }, [teachers, absentTeacherIds, timetable, weeklyQuota]);

  // Helper: check if assignment is safe to proceed (no blocking violations)
  const hasBlockingViolations = (violations: BusinessRuleViolation[]) =>
    violations.some(v => v.severity === 'blocking');

  // ===== Session helpers =====
  const getOrCreateSession = (date: string): DailyWaitingSession => {
    const existing = sessions.find(s => s.date === date);
    if (existing) return existing;
    return {
      id: `session-${date}`,
      date,
      dayName: getArabicDayFromDate(date),
      absentTeachers: [],
      assignments: [],
      isFinalized: false,
      createdAt: new Date().toISOString(),
    };
  };

  const updateSession = (date: string, updater: (s: DailyWaitingSession) => DailyWaitingSession) => {
    setSessions(prev => {
      const existing = prev.find(s => s.date === date);
      if (existing) return prev.map(s => s.date === date ? updater(s) : s);
      return [...prev, updater(getOrCreateSession(date))];
    });
  };

  const releaseAssignmentQuota = (assignments: WaitingAssignment[]) => {
    const normalAssignments = assignments.filter(a => !a.isSwap);
    if (normalAssignments.length === 0) return;
    setWeeklyQuota(prev => {
      const counts = { ...prev.counts };
      normalAssignments.forEach(a => {
        counts[a.substituteTeacherId] = Math.max(0, (counts[a.substituteTeacherId] || 0) - 1);
      });
      return { ...prev, counts };
    });
  };

  const getWaitingSlotKey = (absentTeacherId: string, periodNumber: number) => `${absentTeacherId}-${periodNumber}`;

  const isWaitingSlotDisabled = (absentTeacherId: string, periodNumber: number) =>
    disabledWaitingSlots.has(getWaitingSlotKey(absentTeacherId, periodNumber));

  const getActiveAbsentPeriods = (absentTeacher: AbsentTeacher) =>
    absentTeacher.periods.filter(p => !isWaitingSlotDisabled(absentTeacher.id, p.periodNumber));

  const hasPendingPeriods = (absentTeacher: AbsentTeacher, assignments: WaitingAssignment[]) =>
    getActiveAbsentPeriods(absentTeacher).some(period =>
      !assignments.some(a => a.absentTeacherId === absentTeacher.id && a.periodNumber === period.periodNumber)
    );

  const resetAssignModal = () => {
    setShowAssignModal(null);
    setAssignModalTab('teachers');
    setAssignmentSearch('');
    setSelectedAssignPerson(null);
  };

  const openAssignModal = (period: AbsentPeriodEntry, absentTeacher: AbsentTeacher) => {
    const existingAssignment = (currentSession?.assignments || []).find(
      a => a.absentTeacherId === absentTeacher.id && a.periodNumber === period.periodNumber
    );
    const selectedTeacher = existingAssignment
      ? teachers.find(t => t.id === existingAssignment.substituteTeacherId)
      : undefined;
    const selectedAdmin = existingAssignment && !selectedTeacher
      ? admins.find(a => a.id === existingAssignment.substituteTeacherId)
      : undefined;

    setAssignmentSearch('');
    setSelectedAssignPerson(selectedTeacher || selectedAdmin || null);
    setAssignModalTab(selectedAdmin ? 'admins' : 'teachers');
    setShowAssignModal({ period, absentTeacher });
  };

  // ── Phase 4: Message helpers ──
  // قيم رموز السجل المركزي المشتركة بين رسالتي التبليغ والتكليف
  const buildWaitingCatalogValues = (asgn: WaitingAssignment, recipientName: string): Record<string, string> => ({
    // الأسماء في نص الرسالة تُختصر (أول+أخير) لتقليل التكلفة؛ تبقى كاملة في الجداول والأرشيف
    'اسم_المستلم': shortenRecipientName(recipientName),
    'اليوم': dayName,
    'رقم_الحصة': String(asgn.periodNumber),
    'الفصل': asgn.className,
    'المعلم_الغائب': shortenRecipientName(asgn.absentTeacherName),
    'اسم_المدرسة': schoolInfo.schoolName || 'المدرسة',
    'التاريخ': formatHijri(selectedDate),
    'الفصل_الدراسي': getCurrentAcademicSemester(schoolInfo)?.name || '',
  });

  // message without link (notification only)
  const buildNotificationMessage = (asgn: WaitingAssignment, recipientName = asgn.substituteTeacherName): string =>
    fillMessageTemplate(getMessageTemplate('waiting/notification'), buildWaitingCatalogValues(asgn, recipientName));

  // generate a deterministic signing token/link for electronic send
  const buildSignLink = (asgn: WaitingAssignment): string => {
    const token = asgn.signatureToken || asgn.id;
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}?sign=${token}&date=${selectedDate}`;
  };

  // message with signature link (electronic)
  const buildElectronicMessage = (asgn: WaitingAssignment, recipientName = asgn.substituteTeacherName): string =>
    fillMessageTemplate(getMessageTemplate('waiting/electronic'), {
      ...buildWaitingCatalogValues(asgn, recipientName),
      'رابط_التوقيع': buildSignLink(asgn),
    });

  // default message builder (backward compat) — uses notification format
  const buildAssignmentMessage = (asgn: WaitingAssignment, recipientName = asgn.substituteTeacherName): string =>
    asgn.sendType === 'electronic' ? buildElectronicMessage(asgn, recipientName) : buildNotificationMessage(asgn, recipientName);

  const personalizeWaitingMessage = (message: string, asgn: WaitingAssignment) =>
    // شبكة أمان: تُزال أي رموز {…} لم تُعبَّأ حتى لا تخرج رسالة بأقواس مكسورة
    stripUnfilledTokens(message.replace(/\{اسم_المستلم\}/g, shortenRecipientName(asgn.substituteTeacherName)));

  const buildWhatsAppUrl = (phone: string, message: string): string => {
    const clean = phone.replace(/\D/g, '');
    const intl = clean.startsWith('0') ? '966' + clean.slice(1) : clean;
    return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
  };

  const dispatchMessage = (asgn: WaitingAssignment, msg: string, channel: 'whatsapp' | 'sms', mode?: 'notification' | 'electronic') => {
    if (!asgn.substitutePhone) return;

    if (channel === 'whatsapp') {
      window.open(buildWhatsAppUrl(asgn.substitutePhone, msg), '_blank');
      handleUpdateStatus(asgn.id, 'sent', 'whatsapp', mode);
    } else {
      window.open(`sms:${asgn.substitutePhone.replace(/\D/g,'')}?body=${encodeURIComponent(msg)}`, '_self');
      handleUpdateStatus(asgn.id, 'sent', 'sms', mode);
    }
    
    sendMessage({
      source: 'waiting',
      recipientId: asgn.substituteTeacherId,
      recipientName: asgn.substituteTeacherName,
      recipientPhone: asgn.substitutePhone,
      recipientRole: teachers.some(t => t.id === asgn.substituteTeacherId) ? 'teacher' : 'admin',
      content: msg,
      channel,
    }).catch(e => console.error('Archive error:', e));
  };

  const handleUpdateStatus = (
    assignmentId: string,
    newStatus: WaitingAssignment['status'],
    channel?: 'whatsapp' | 'sms',
    sendType?: 'notification' | 'electronic',
    signatureData?: string,
  ) => {
    updateSession(selectedDate, s => ({
      ...s,
      assignments: s.assignments.map(a =>
        a.id === assignmentId
          ? {
              ...a,
              status: newStatus,
              sentAt: newStatus === 'sent' && !a.sentAt ? new Date().toISOString() : a.sentAt,
              messageChannel: channel || a.messageChannel,
              sendType: sendType !== undefined ? sendType : a.sendType,
              signatureData: signatureData !== undefined ? signatureData : a.signatureData,
              signatureSignedAt: signatureData !== undefined ? new Date().toISOString() : a.signatureSignedAt,
              signatureToken: a.signatureToken || a.id,
            }
          : a
      ),
    }));
  };

  // ── Send modal rows ──
  const sendRows = useMemo(() => {
    if (!currentSession) return [];
    return currentSession.assignments.map(asgn => {
      const baseMsg = sendModalMode === 'electronic'
        ? buildElectronicMessage(asgn, RECIPIENT_NAME_TOKEN)
        : buildNotificationMessage(asgn, RECIPIENT_NAME_TOKEN);
      return { key: asgn.id, asgn, message: sendCustomMessages[asgn.id] ?? baseMsg };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession, sendCustomMessages, sendModalMode]);

  useEffect(() => {
    if (!showSendModal) return;
    setSendSelectedIds(new Set((currentSession?.assignments || []).map(a => a.id)));
  }, [showSendModal, currentSession?.id, sendModalMode]);

  useEffect(() => {
    if (waitingTaskMode !== 'send') return;
    setSendSelectedIds(new Set((currentSession?.assignments || []).map(a => a.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingTaskMode, currentSession?.id, currentSession?.assignments.length]);

  const selectedSendRows = useMemo(
    () => sendRows.filter(r => sendSelectedIds.has(r.key)),
    [sendRows, sendSelectedIds]
  );

  const allSendRowsSelected = sendRows.length > 0 && selectedSendRows.length === sendRows.length;
  const selectedWithPhoneCount = selectedSendRows.filter(r => !!r.asgn.substitutePhone).length;

  const toggleAllSendRows = () => {
    setSendSelectedIds(prev => {
      if (sendRows.length > 0 && prev.size === sendRows.length) return new Set();
      return new Set(sendRows.map(r => r.key));
    });
  };

  const sendWaitingBulk = (channel: 'whatsapp' | 'sms' = sendPreferredChannel) => {
    if (!selectedSendRows.length) {
      showToast('لم يتم تحديد أي تكليف', 'warning');
      return;
    }

    const targets = selectedSendRows.filter(r => r.asgn.substitutePhone);
    if (!targets.length) {
      showToast('لا توجد أرقام جوال للمستلمين المحددين', 'warning');
      return;
    }

    const sendNow = () => {
      targets.forEach((r, i) => {
        if (channel === 'whatsapp') {
          setTimeout(() => dispatchMessage(r.asgn, personalizeWaitingMessage(r.message, r.asgn), 'whatsapp', sendModalMode), i * 350);
        } else {
          dispatchMessage(r.asgn, personalizeWaitingMessage(r.message, r.asgn), 'sms', sendModalMode);
        }
      });
    };

    if (sendScheduleEnabled) {
      const scheduledTime = sendScheduledAt ? new Date(sendScheduledAt).getTime() : 0;
      const delay = scheduledTime - Date.now();
      if (!sendScheduledAt || delay <= 0) {
        showToast('حدد وقتاً لاحقاً لجدولة الإرسال', 'warning');
        return;
      }
      window.setTimeout(sendNow, delay);
      showToast(`تمت جدولة ${targets.length} رسالة لوقت لاحق`, 'success');
      return;
    }

    sendNow();
    setWaitingSendChannel(channel);
    setWaitingSendResults(selectedSendRows.map(r => ({
      name: r.asgn.substituteTeacherName,
      status: r.asgn.substitutePhone ? 'sent' : 'failed',
    })));
    setShowWaitingSendResults(true);
  };

  // ── Reports print helper ──
  const handleReportPrint = () => {
    const el = document.getElementById('waiting-report-print-area');
    if (!el) return;
    const w = window.open('', '_blank', 'width=1100,height=750');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><style>
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Tajawal',sans-serif; direction:rtl; color:#1e293b; padding:28px; }
      h1 { font-size:16px; font-weight:900; color:#655ac1; margin-bottom:6px; }
      .subtitle { font-size:11px; color:#64748b; margin-bottom:20px; }
      table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:30px; }
      thead th { background:#655ac1; color:#fff; padding:10px 12px; text-align:right; font-weight:800; }
      tbody tr:nth-child(even) td { background:#f8fafc; }
      tbody td { padding:9px 12px; border-bottom:1px solid #f1f5f9; }
      .total-col { font-weight:900; color:#655ac1; }
      @media print { @page { size: A4 landscape; margin:12mm; } body{-webkit-print-color-adjust:exact; print-color-adjust:exact;} }
    </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 350);
  };

  // ── Reports print helper (new design) ──
  const handleWaitingReportPrint = () => {
    const calType = (schoolInfo.calendarType || getCurrentAcademicSemester(schoolInfo)?.calendarType || 'hijri') as 'hijri' | 'gregorian';
    const todayDate = new Date();
    const todayDayName = todayDate.toLocaleDateString('ar-SA', { weekday: 'long' });
    const todayHijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(todayDate);
    const todayGregorian = new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }).format(todayDate);

    const fromDateDisplay = rptFromDate
      ? calType === 'hijri'
        ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(rptFromDate))
        : new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(rptFromDate))
      : '';
    const toDateDisplay = rptToDate
      ? calType === 'hijri'
        ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(rptToDate))
        : new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(rptToDate))
      : '';

    const fromDayName = rptFromDate ? new Date(rptFromDate).toLocaleDateString('ar-SA', { weekday: 'long' }) : '';
    const toDayName = rptToDate ? new Date(rptToDate).toLocaleDateString('ar-SA', { weekday: 'long' }) : '';

    const currentSemester = getCurrentAcademicSemester(schoolInfo);
    const semesterName = currentSemester?.name || '';
    const educationAdmin = schoolInfo.educationAdministration || schoolInfo.region || '';

    const tableRows = rptTableData.map((row, idx) => {
      const sortedPeriods = [...new Set(row.periods)].sort((a, b) => a - b);
      const periodsDisplay = sortedPeriods.join(' ، ');
      return `
        <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'}">
          <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:800;color:#1e293b;">${row.name}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#655ac1;font-weight:800;">${row.quota || '—'}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:900;color:#655ac1;font-size:15px;">${row.totalAssigned}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px;color:#334155;">${periodsDisplay || '—'}</td>
        </tr>`;
    }).join('');

    const absentRows = rptAbsenceData.absents.slice(0, 12).map((row, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-weight:800;">${escapeHtml(row.name)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${row.dayCount}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${row.fullDays}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${row.partialDays}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:900;color:#655ac1;">${row.affectedPeriods}</td>
      </tr>
    `).join('');
    const classRows = rptAbsenceData.classes.slice(0, 12).map((row, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-weight:800;">${escapeHtml(row.name)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:900;color:#655ac1;">${row.affectedPeriods}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${row.dayCount}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${escapeHtml(row.topSubject)}</td>
      </tr>
    `).join('');
    const subjectRows = rptAbsenceData.subjects.slice(0, 12).map((row, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-weight:800;">${escapeHtml(row.name)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:900;color:#655ac1;">${row.affectedPeriods}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${row.absentCount}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${escapeHtml(row.topClass)}</td>
      </tr>
    `).join('');

    const w = window.open('', '_blank', 'width=900,height=750');
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>تقرير الانتظار اليومي</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Tajawal',sans-serif; direction:rtl; color:#1e293b; padding:28px; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #334155; padding-bottom:12px; margin-bottom:18px; }
    .header-right { font-size:11px; line-height:1.9; color:#334155; font-weight:700; }
    .header-center { text-align:center; font-size:13px; font-weight:900; color:#334155; display:flex; flex-direction:column; align-items:center; gap:4px; }
    .header-left { font-size:11px; line-height:1.9; color:#334155; font-weight:700; text-align:left; }
    .report-title { text-align:center; font-size:18px; font-weight:900; color:#655ac1; margin:12px 0 6px; }
    .date-range { text-align:center; font-size:11px; color:#64748b; font-weight:700; margin-bottom:18px; }
    .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:16px; }
    .stat { border:1px solid #e2e8f0; border-radius:10px; padding:8px; text-align:center; }
    .stat b { display:block; font-size:17px; color:#655ac1; }
    .stat span { display:block; font-size:9px; color:#64748b; font-weight:900; margin-top:2px; }
    .section-title { font-size:13px; font-weight:900; color:#334155; border-right:4px solid #655ac1; padding-right:8px; margin:18px 0 8px; }
    table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:30px; }
    thead th { background:#655ac1; color:#fff; padding:10px 12px; font-weight:800; border-left:1px solid #7c6fcf; }
    thead th:last-child { border-left:none; }
    tbody td { vertical-align:middle; }
    .totals-row td { background:#f1f5f9 !important; font-weight:900; color:#475569; padding:9px 12px; border-top:2px solid #e2e8f0; }
    .footer { margin-top:50px; display:flex; justify-content:space-between; font-size:12px; color:#475569; }
    .signature-box { text-align:center; width:180px; }
    .signature-line { margin-top:35px; border-top:1px solid #94a3b8; }
    .ministry-logo { width:60px; height:60px; border:2px solid #94a3b8; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:900; color:#475569; text-align:center; line-height:1.3; }
    @media print { @page { size:A4 portrait; margin:12mm; } body{-webkit-print-color-adjust:exact;print-color-adjust:exact;} }
  </style>
</head>
<body>
  <div class="page-header">
    <div class="header-right">
      <div>إدارة التعليم بمنطقة ${educationAdmin}</div>
      <div>${schoolInfo.schoolName}</div>
      ${semesterName ? `<div>${semesterName}</div>` : ''}
    </div>
    <div class="header-center">
      <div class="ministry-logo">وزارة<br/>التعليم</div>
    </div>
    <div class="header-left">
      <div>يوم: ${todayDayName}</div>
      <div>الموافق: ${todayHijri}</div>
      <div>الموافق: ${todayGregorian}</div>
    </div>
  </div>

  <div class="report-title">تقرير الانتظار اليومي</div>
  <div class="date-range">
    من يوم (${fromDayName}) الموافق (${fromDateDisplay}) إلى يوم (${toDayName}) الموافق (${toDateDisplay})
  </div>

  <div class="stats">
    <div class="stat"><b>${rptSummary.totalAssigned}</b><span>حصص الانتظار</span></div>
    <div class="stat"><b>${rptSummary.activeWaiters}</b><span>المنتظرون المكلفون</span></div>
    <div class="stat"><b>${rptSummary.absentCount}</b><span>المعلمون الغائبون</span></div>
    <div class="stat"><b>${rptSummary.affectedClasses}</b><span>الفصول المتأثرة</span></div>
  </div>

  ${rptTableData.length === 0 ? `
    <p style="text-align:center;color:#94a3b8;font-size:14px;padding:30px;font-weight:bold;">لا توجد بيانات في الفترة الزمنية المحددة</p>
  ` : `
  <div class="section-title">توزيع الانتظار على المنتظرين</div>
  <table>
    <thead>
      <tr>
        <th style="text-align:right;">المنتظر</th>
        <th style="text-align:center;width:110px;">نصاب الانتظار</th>
        <th style="text-align:center;width:120px;">الانتظار المسند</th>
        <th style="text-align:center;">الحصص المسندة</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="totals-row">
        <td>الإجمالي</td>
        <td style="text-align:center;">—</td>
        <td style="text-align:center;color:#655ac1;font-size:15px;">${rptTableData.reduce((s, r) => s + r.totalAssigned, 0)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
  `}

  <div class="section-title">أكثر المعلمين غيابًا وأثرًا على الانتظار</div>
  <table>
    <thead><tr><th style="text-align:right;">المعلم</th><th>أيام الغياب</th><th>غياب كامل</th><th>غياب جزئي</th><th>الحصص المتأثرة</th></tr></thead>
    <tbody>${absentRows || '<tr><td colspan="5" style="text-align:center;padding:14px;color:#94a3b8;">لا توجد بيانات غياب</td></tr>'}</tbody>
  </table>
  <div class="section-title">الفصول المتأثرة بالغياب</div>
  <table>
    <thead><tr><th style="text-align:right;">الفصل</th><th>الحصص المتأثرة</th><th>الأيام</th><th>أكثر مادة تأثرًا</th></tr></thead>
    <tbody>${classRows || '<tr><td colspan="4" style="text-align:center;padding:14px;color:#94a3b8;">لا توجد فصول متأثرة</td></tr>'}</tbody>
  </table>
  <div class="section-title">المواد المتأثرة بالغياب</div>
  <table>
    <thead><tr><th style="text-align:right;">المادة</th><th>الحصص المتأثرة</th><th>المعلمون الغائبون</th><th>أكثر فصل تأثرًا</th></tr></thead>
    <tbody>${subjectRows || '<tr><td colspan="4" style="text-align:center;padding:14px;color:#94a3b8;">لا توجد مواد متأثرة</td></tr>'}</tbody>
  </table>

  <div class="footer">
    <div class="signature-box">
      <div>${schoolInfo.principal || 'مدير المدرسة'}</div>
      <div class="signature-line"></div>
    </div>
  </div>
</body>
</html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 350);
    showToast('تم فتح تقرير الانتظار', 'success');
  };

  // ── Phase 5: Print helper ──
  const handlePrint = () => {
    const el = document.getElementById('daily-waiting-print-area');
    if (!el) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>سجل حصص الانتظار</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: 'Tajawal', sans-serif; direction:rtl; color:#1e293b; background:#fff; }
          .page { padding:28px 32px; max-width:900px; margin:auto; }
          .header { display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid #655ac1; pb:16px; margin-bottom:20px; }
          .school-name { font-size:18px; font-weight:900; color:#655ac1; }
          .report-title { font-size:13px; font-weight:700; color:#64748b; margin-top:4px; }
          .date-block { text-align:left; font-size:12px; color:#64748b; line-height:1.8; }
          .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:22px; }
          .stat-card { border:1.5px solid #e2e8f0; border-radius:12px; padding:12px; text-align:center; }
          .stat-num { font-size:22px; font-weight:900; }
          .stat-lbl { font-size:11px; color:#64748b; font-weight:700; margin-top:2px; }
          table { width:100%; border-collapse:collapse; font-size:12px; }
          thead th { background:#655ac1; color:#fff; padding:10px 12px; text-align:right; font-weight:800; }
          tbody tr { border-bottom:1px solid #f1f5f9; }
          tbody tr:nth-child(even) { background:#f8fafc; }
          tbody td { padding:9px 12px; }
          .badge { display:inline-block; padding:2px 8px; border-radius:99px; font-size:10px; font-weight:800; }
          .badge-signed { background:#d1fae5; color:#065f46; }
          .badge-ack { background:#dbeafe; color:#1e40af; }
          .badge-sent { background:#fef3c7; color:#92400e; }
          .badge-pending { background:#f1f5f9; color:#64748b; }
          .badge-swap { background:#ede9fe; color:#5b21b6; }
          .section-title { font-size:13px; font-weight:900; color:#655ac1; margin:20px 0 10px; border-right:4px solid #655ac1; padding-right:10px; }
          .no-data { text-align:center; color:#94a3b8; padding:20px; font-size:12px; }
          .footer { margin-top:40px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; border-top:2px solid #e2e8f0; padding-top:20px; }
          .sign-box { text-align:center; }
          .sign-label { font-size:11px; font-weight:800; color:#64748b; margin-bottom:30px; }
          .sign-line { border-top:1.5px solid #94a3b8; margin-top:8px; }
          @media print { body{-webkit-print-color-adjust:exact; print-color-adjust:exact;} }
        </style>
      </head>
      <body>
        ${el.innerHTML}
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  // ===== Toast =====
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // ===== Embedded inline-table state =====
  const [embTableSearch, setEmbTableSearch] = useState('');
  const [embAbsentsOnly, setEmbAbsentsOnly] = useState(false);
  const embCalendarType = (schoolInfo.calendarType === 'gregorian' ? 'gregorian' : 'hijri') as 'hijri' | 'gregorian';
  const receiptCalendarType = (schoolInfo.calendarType === 'gregorian' ? 'gregorian' : 'hijri') as 'hijri' | 'gregorian';
  // Receipt date range: two separate fields (from / to). The selected list is
  // the inclusive set of days between them, driving both the receipt log and
  // the post-signature schedule print.
  const [receiptStartDate, setReceiptStartDate] = useState<string>(selectedDate);
  const [receiptEndDate, setReceiptEndDate] = useState<string>(selectedDate);
  const receiptSelectedDates = useMemo(() => {
    const start = receiptStartDate || selectedDate;
    const end = receiptEndDate || start;
    const lo = start <= end ? start : end;
    const hi = start <= end ? end : start;
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    const out: string[] = [];
    const cursor = new Date(`${lo}T12:00:00`);
    const last = new Date(`${hi}T12:00:00`);
    let guard = 0;
    while (cursor <= last && guard < 400) { out.push(fmt(cursor)); cursor.setDate(cursor.getDate() + 1); guard++; }
    return out.length ? out : [selectedDate];
  }, [receiptStartDate, receiptEndDate, selectedDate]);

  // Close per-period row actions dropdown on outside click / scroll
  useEffect(() => {
    if (!rowActionMenu) return;
    const close = () => setRowActionMenu(null);
    document.addEventListener('click', close);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('scroll', close, true);
    };
  }, [rowActionMenu]);

  // ===== Auto-open modals for legacy report embedded section =====
  const [autoOpenedKey, setAutoOpenedKey] = useState<'balance' | 'reports' | null>(null);
  useEffect(() => {
    if (!embeddedSection || embeddedSection !== 'reports') {
      setAutoOpenedKey(null);
    }
  }, [embeddedSection]);

  useEffect(() => {
    if (autoOpenedKey === 'balance' && !showBalanceModal) {
      setAutoOpenedKey(null);
      onSectionExit?.();
    }
  }, [showBalanceModal, autoOpenedKey, onSectionExit]);

  useEffect(() => {
    if (autoOpenedKey === 'reports' && !showReportsModal) {
      setAutoOpenedKey(null);
      onSectionExit?.();
    }
  }, [showReportsModal, autoOpenedKey, onSectionExit]);

  // Build / replace an absent record from inline controls
  const setTeacherAbsenceInline = (teacher: Teacher, type: 'none' | 'full' | 'partial', selectedPeriods: number[] = []) => {
    if (type === 'none') {
      const existing = currentSession?.absentTeachers.find(a => a.teacherId === teacher.id);
      if (existing) {
        const removedAssignments = (currentSession?.assignments || []).filter(
          a => a.absentTeacherId === existing.id && !a.isSwap
        );
        if (removedAssignments.length > 0) {
          setWeeklyQuota(prev => {
            const newCounts = { ...prev.counts };
            for (const asgn of removedAssignments) {
              newCounts[asgn.substituteTeacherId] = Math.max(0, (newCounts[asgn.substituteTeacherId] || 0) - 1);
            }
            return { ...prev, counts: newCounts };
          });
        }
        updateSession(selectedDate, s => ({
          ...s,
          absentTeachers: s.absentTeachers.filter(a => a.id !== existing.id),
          assignments: s.assignments.filter(a => a.absentTeacherId !== existing.id),
        }));
      }
      return;
    }

    const allDaySchedule = getTeacherDaySchedule(teacher.id, dayKey);
    let periods: AbsentPeriodEntry[];
    if (type === 'full') {
      periods = allDaySchedule;
    } else {
      const sortedPeriods = [...selectedPeriods].sort((a, b) => a - b);
      periods = allDaySchedule.filter(p => sortedPeriods.includes(p.periodNumber));
    }

    const swapCandidates: Record<number, SwapCandidate[]> = {};
    if (type === 'partial') {
      const currentAbsentPlusSelf = new Set([...absentTeacherIds, teacher.id]);
      for (const period of periods) {
        const candidates = findSwapCandidates(teacher.id, period, dayKey, currentAbsentPlusSelf);
        if (candidates.length > 0) swapCandidates[period.periodNumber] = candidates;
      }
    }

    const existing = currentSession?.absentTeachers.find(a => a.teacherId === teacher.id);
    if (existing) {
      const removedAssignments = (currentSession?.assignments || []).filter(
        a => a.absentTeacherId === existing.id && !a.isSwap
      );
      if (removedAssignments.length > 0) {
        setWeeklyQuota(prev => {
          const newCounts = { ...prev.counts };
          for (const asgn of removedAssignments) {
            newCounts[asgn.substituteTeacherId] = Math.max(0, (newCounts[asgn.substituteTeacherId] || 0) - 1);
          }
          return { ...prev, counts: newCounts };
        });
      }
      updateSession(selectedDate, s => ({
        ...s,
        absentTeachers: s.absentTeachers.map(a => a.teacherId === teacher.id ? {
          ...a, absenceType: type, periods, swapCandidates,
        } : a),
        assignments: s.assignments.filter(a => a.absentTeacherId !== existing.id),
      }));
    } else {
      const newAbsent: AbsentTeacher = {
        id: `absent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${teacher.id}`,
        teacherId: teacher.id, teacherName: teacher.name, teacherPhone: teacher.phone || '',
        absenceType: type, periods, swapCandidates,
        addedAt: new Date().toISOString(),
      };
      updateSession(selectedDate, s => ({ ...s, absentTeachers: [...s.absentTeachers, newAbsent] }));
    }
  };

  const toggleEmbPartialPeriod = (teacher: Teacher, periodNumber: number) => {
    const existing = currentSession?.absentTeachers.find(a => a.teacherId === teacher.id);
    const currentNumbers = existing?.periods.map(p => p.periodNumber) || [];
    const newNumbers = currentNumbers.includes(periodNumber)
      ? currentNumbers.filter(p => p !== periodNumber)
      : [...currentNumbers, periodNumber];
    const teachingNumbers = getTeacherDaySchedule(teacher.id, dayKey).map(p => p.periodNumber);
    const selectedActualNumbers = newNumbers.filter(p => teachingNumbers.includes(p));

    if (newNumbers.length === 0) {
      // Deselecting the last period must NOT remove the teacher — keep them as a
      // partial absence with no periods yet. Removal is only via the X button.
      setTeacherAbsenceInline(teacher, 'partial', []);
    } else if (teachingNumbers.length > 0 && selectedActualNumbers.length === teachingNumbers.length) {
      setTeacherAbsenceInline(teacher, 'full');
    } else {
      setTeacherAbsenceInline(teacher, 'partial', selectedActualNumbers);
    }
  };

  // ===== Handlers =====
  const handleAddToQueue = () => {
    if (!absenceForm.teacherId) { showToast('يرجى اختيار المعلم الغائب', 'error'); return; }
    if (absenceForm.absenceType === 'partial' && absenceForm.selectedPeriods.size === 0) {
      showToast('يرجى تحديد الحصص المتغيبة في الغياب الجزئي', 'error'); return;
    }
    if (currentSession?.absentTeachers.some(a => a.teacherId === absenceForm.teacherId)) {
      showToast('هذا المعلم مُضاف بالفعل في قائمة الغائبين', 'warning'); return;
    }
    if (absentQueue.some(q => q.teacherId === absenceForm.teacherId)) {
      showToast('هذا المعلم موجود بالفعل في القائمة', 'warning'); return;
    }
    const teacher = teachers.find(t => t.id === absenceForm.teacherId);
    if (!teacher) return;
    setAbsentQueue(prev => [...prev, {
      teacherId: absenceForm.teacherId,
      teacherName: teacher.name,
      absenceType: absenceForm.absenceType,
      selectedPeriods: new Set(absenceForm.selectedPeriods),
    }]);
    setAbsenceForm({ teacherId: '', absenceType: 'full', selectedPeriods: new Set() });
    setTeacherSearch('');
  };

  const handleSubmitAbsenceQueue = () => {
    let toProcess = [...absentQueue];
    if (absenceForm.teacherId) {
      if (absenceForm.absenceType === 'partial' && absenceForm.selectedPeriods.size === 0) {
        showToast('يرجى تحديد حصص الغياب الجزئي أو اضغط "أضف غيابًا آخر" أولاً', 'error'); return;
      }
      if (!toProcess.some(q => q.teacherId === absenceForm.teacherId)) {
        const t = teachers.find(t => t.id === absenceForm.teacherId);
        if (t) toProcess = [...toProcess, { teacherId: t.id, teacherName: t.name, absenceType: absenceForm.absenceType, selectedPeriods: new Set(absenceForm.selectedPeriods) }];
      }
    }
    if (toProcess.length === 0) { showToast('يرجى إضافة معلم واحد على الأقل', 'error'); return; }

    const currentAbsentPlusNew = new Set([...absentTeacherIds]);
    const newAbsentList: AbsentTeacher[] = [];

    for (const entry of toProcess) {
      if (currentSession?.absentTeachers.some(a => a.teacherId === entry.teacherId)) continue;
      const teacher = teachers.find(t => t.id === entry.teacherId);
      if (!teacher) continue;

      const allDaySchedule = getTeacherDaySchedule(teacher.id, dayKey);
      let periods: AbsentPeriodEntry[];

      if (entry.absenceType === 'full') {
        periods = allDaySchedule.length > 0 ? allDaySchedule : Array.from(
          { length: (schoolInfo.timing?.periodCounts?.[dayKey] || 7) },
          (_, i) => ({
            periodNumber: i + 1, classId: '', className: '(غير محدد)',
            subjectId: teacher.assignedSubjectId || '',
            subjectName: subjects.find(s => s.id === teacher.assignedSubjectId)?.name || 'الحصة',
          })
        );
      } else {
        const fromSchedule = allDaySchedule.filter(p => entry.selectedPeriods.has(p.periodNumber));
        periods = fromSchedule.length > 0 ? fromSchedule : Array.from(entry.selectedPeriods).sort((a, b) => a - b).map(p => ({
          periodNumber: p, classId: '', className: '(غير محدد)',
          subjectId: teacher.assignedSubjectId || '',
          subjectName: subjects.find(s => s.id === teacher.assignedSubjectId)?.name || 'الحصة',
        }));
      }

      currentAbsentPlusNew.add(teacher.id);
      const swapCandidates: Record<number, SwapCandidate[]> = {};
      if (entry.absenceType === 'partial') {
        for (const period of periods) {
          const candidates = findSwapCandidates(teacher.id, period, dayKey, currentAbsentPlusNew);
          if (candidates.length > 0) swapCandidates[period.periodNumber] = candidates;
        }
      }

      newAbsentList.push({
        id: `absent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${teacher.id}`,
        teacherId: teacher.id, teacherName: teacher.name, teacherPhone: teacher.phone || '',
        absenceType: entry.absenceType, periods, swapCandidates,
        addedAt: new Date().toISOString(),
      });
    }

    if (newAbsentList.length > 0) {
      updateSession(selectedDate, s => ({ ...s, absentTeachers: [...s.absentTeachers, ...newAbsentList] }));
      showToast(`✅ تم تسجيل غياب ${newAbsentList.length} معلم${newAbsentList.length > 1 ? 'ين' : ''}`, 'success');
    }
    setAbsenceForm({ teacherId: '', absenceType: 'full', selectedPeriods: new Set() });
    setTeacherSearch('');
    setAbsentQueue([]);
    setShowAbsenceModal(false);
  };

  const handleRemoveAbsent = (absentId: string, teacherName: string) => {
    // Subtract quota counts for all assignments belonging to this absent teacher
    const removedAssignments = (currentSession?.assignments || []).filter(
      a => a.absentTeacherId === absentId && !a.isSwap
    );
    if (removedAssignments.length > 0) {
      setWeeklyQuota(prev => {
        const newCounts = { ...prev.counts };
        for (const asgn of removedAssignments) {
          newCounts[asgn.substituteTeacherId] = Math.max(0, (newCounts[asgn.substituteTeacherId] || 0) - 1);
        }
        return { ...prev, counts: newCounts };
      });
    }
    updateSession(selectedDate, s => ({
      ...s,
      absentTeachers: s.absentTeachers.filter(a => a.id !== absentId),
      assignments: s.assignments.filter(a => a.absentTeacherId !== absentId),
    }));
    showToast(`تم حذف "${teacherName}" من قائمة الغائبين`, 'info');
    setRemoveAbsentConfirm(null);
  };

  const handleAutoAssign = (period: AbsentPeriodEntry, absentTeacher: AbsentTeacher) => {
    if (isWaitingSlotDisabled(absentTeacher.id, period.periodNumber)) {
      showToast('هذه الحصة معطّلة ولا يمكن إضافة منتظر لها', 'warning');
      return;
    }
    const existing = currentSession?.assignments || [];
    const waiters = getWaitersWithQuota(period.periodNumber, dayKey, existing);
    // Filter with validator (skip any candidate with blocking violations)
    const eligible = waiters.filter(w => {
      if (absentTeacherIds.has(w.person.id)) return false;
      return !hasBlockingViolations(validateAssignment(w.person, period, absentTeacher, existing, dayKey));
    });

    if (eligible.length === 0) { showToast('لا يوجد منتظرون متاحون لهذه الحصة', 'warning'); return; }

    // Dynamic Balance: أعلى نصاب → أعلى رصيد متبقي → أقل إسناداً هذا الأسبوع
    const best = eligible.reduce((a, b) => {
      if (a.total !== b.total) return a.total > b.total ? a : b;
      const ra = a.total - a.assigned, rb = b.total - b.assigned;
      if (ra !== rb) return ra > rb ? a : b;
      return a.assigned <= b.assigned ? a : b;
    });

    const newAsgn: WaitingAssignment = {
      id: `asgn-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      absentTeacherId: absentTeacher.id,
      absentTeacherName: absentTeacher.teacherName,
      periodNumber: period.periodNumber,
      classId: period.classId,
      className: period.className,
      subjectId: period.subjectId,
      subjectName: period.subjectName,
      substituteTeacherId: best.person.id,
      substituteTeacherName: best.person.name,
      substitutePhone: (best.person as Teacher).phone || (best.person as Admin).phone || '',
      isSwap: false,
      status: 'pending',
      assignedAt: new Date().toISOString(),
    };

    updateSession(selectedDate, s => ({
      ...s,
      assignments: [...s.assignments.filter(
        a => !(a.absentTeacherId === absentTeacher.id && a.periodNumber === period.periodNumber)
      ), newAsgn],
    }));
    setWeeklyQuota(prev => ({
      ...prev,
      counts: { ...prev.counts, [best.person.id]: (prev.counts[best.person.id] || 0) + 1 },
    }));
    showToast(`✅ الحصة ${period.periodNumber} → ${best.person.name} (${best.quotaDisplay})`, 'success');
  };

  // ── Phase 2: Batch Auto-Assign with distribution report ──
  const startManualDistribution = () => {
    if (!currentSession || currentSession.absentTeachers.length === 0) return;
    const existingAssignments = currentSession.assignments || [];
    const hasPending = currentSession.absentTeachers.some(absent => hasPendingPeriods(absent, existingAssignments));
    if (existingAssignments.length > 0 && !hasPending) {
      setShowManualOverwriteConfirm(true);
      return;
    }
    setDistributionMode('manual');
    setManualDistMode(true);
    if (existingAssignments.length > 0) {
      showToast('سيتم استكمال الحصص غير المسندة فقط مع الحفاظ على التوزيع الحالي', 'info');
    }
  };

  const requestAutoDistribution = (absentTeacher?: AbsentTeacher) => {
    if (!currentSession || currentSession.absentTeachers.length === 0) {
      showToast('لا يوجد غياب مسجل لهذا اليوم', 'warning');
      return;
    }
    const targetAbsents = absentTeacher ? [absentTeacher] : currentSession.absentTeachers;
    const hasPending = targetAbsents.some(absent => hasPendingPeriods(absent, currentSession.assignments || []));

    if (!hasPending) {
      showToast('جميع حصص الانتظار مسندة بالفعل', 'info');
      return;
    }

    setPendingAutoFn(() => () => handleBatchAutoAssign(absentTeacher));
    setShowAutoConfirm(true);
  };

  const handleBatchAutoAssign = (absentTeacher?: AbsentTeacher, forceReplace = false) => {
    const session = currentSession;
    if (!session || session.absentTeachers.length === 0) {
      showToast('لا يوجد غياب مسجل لهذا اليوم', 'warning');
      return;
    }
    const targetAbsents = absentTeacher ? [absentTeacher] : session.absentTeachers;
    const pendingTargetCount = targetAbsents.reduce((sum, absent) => (
      sum + getActiveAbsentPeriods(absent).filter(period =>
        !session.assignments.some(a => a.absentTeacherId === absent.id && a.periodNumber === period.periodNumber)
      ).length
    ), 0);

    if (!forceReplace && pendingTargetCount === 0) {
      showToast('جميع حصص الانتظار مسندة بالفعل', 'info');
      return;
    }

    let newSessions = { ...session };
    const newCounts = { ...weeklyQuota.counts };

    // If forceReplace, clear existing assignments for the target scope first
    if (forceReplace) {
      const targetIds = new Set(targetAbsents.map(a => a.id));
      const removedAssignments = newSessions.assignments.filter(a => targetIds.has(a.absentTeacherId));
      removedAssignments.forEach(a => {
        if (!a.isSwap) newCounts[a.substituteTeacherId] = Math.max(0, (newCounts[a.substituteTeacherId] || 0) - 1);
      });
      newSessions = { ...newSessions, assignments: newSessions.assignments.filter(a => !targetIds.has(a.absentTeacherId)) };
    }

    const result: DistributionResult = {
      assigned: 0, failed: 0, skipped: 0,
      details: [],
      teacherLoad: {},
    };

    for (const absent of targetAbsents) {
      const pendingPeriods = absent.periods.filter(p =>
        !isWaitingSlotDisabled(absent.id, p.periodNumber) &&
        !newSessions.assignments.find(a => a.absentTeacherId === absent.id && a.periodNumber === p.periodNumber)
      );

      for (const period of pendingPeriods) {
        // Re-compute waiters with latest newSessions.assignments + new newCounts
        const assignedThisPeriod = new Set(
          newSessions.assignments
            .filter(a => a.periodNumber === period.periodNumber)
            .map(a => a.substituteTeacherId)
        );

        const candidates = [...teachers, ...admins].flatMap(person => {
          const isTeacher = teachers.some(t => t.id === person.id);
          if (isTeacher) {
            const t = person as Teacher;
            if (absentTeacherIds.has(t.id)) return [];
            if (assignedThisPeriod.has(t.id)) return [];
            if (t.quotaLimit >= 24 && !t.waitingQuota) return [];
            const busyKey = `${t.id}-${dayKey}-${period.periodNumber}`;
            if (timetable[busyKey]?.type === 'lesson') return [];
            const total = t.waitingQuota || 10;
            const assigned = newCounts[t.id] || 0;
            if (assigned >= total) return []; // quota full
            return [{ person, assigned, total, isTeacher: true }];
          } else {
            const a = person as Admin;
            if (assignedThisPeriod.has(a.id)) return [];
            if (ADMIN_BLOCKED_ROLES.some(r => a.role?.includes(r))) return [];
            const total = a.waitingQuota || 5;
            const assigned = newCounts[a.id] || 0;
            return [{ person, assigned, total, isTeacher: false }];
          }
        });

        if (candidates.length === 0) {
          result.failed++;
          result.details.push({ periodNumber: period.periodNumber, className: period.className, assignedTo: null, reason: 'لا يوجد منتظرون متاحون', absentTeacherName: absent.teacherName });
          continue;
        }

        // Dynamic Balance: أعلى نصاب → أعلى رصيد متبقي → أقل إسناداً هذا الأسبوع
        const best = candidates.reduce((a, b) => {
          if (a.total !== b.total) return a.total > b.total ? a : b;
          const ra = a.total - a.assigned, rb = b.total - b.assigned;
          if (ra !== rb) return ra > rb ? a : b;
          return a.assigned <= b.assigned ? a : b;
        });

        const newAsgn: WaitingAssignment = {
          id: `asgn-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
          absentTeacherId: absent.id,
          absentTeacherName: absent.teacherName,
          periodNumber: period.periodNumber,
          classId: period.classId,
          className: period.className,
          subjectId: period.subjectId,
          subjectName: period.subjectName,
          substituteTeacherId: best.person.id,
          substituteTeacherName: best.person.name,
          substitutePhone: (best.person as Teacher).phone || (best.person as Admin).phone || '',
          isSwap: false,
          status: 'pending',
          assignedAt: new Date().toISOString(),
        };

        newSessions = { ...newSessions, assignments: [...newSessions.assignments, newAsgn] };
        newCounts[best.person.id] = (newCounts[best.person.id] || 0) + 1;
        result.assigned++;

        // Build teacher load summary
        if (!result.teacherLoad[best.person.id]) {
          result.teacherLoad[best.person.id] = {
            name: best.person.name,
            newCount: 0,
            total: best.total,
          };
        }
        result.teacherLoad[best.person.id].newCount++;

        result.details.push({
          periodNumber: period.periodNumber,
          className: period.className,
          assignedTo: best.person.name,
          absentTeacherName: absent.teacherName,
        });
      }
    }

    // Commit batch update
    setSessions(prev => prev.map(s => s.date === selectedDate ? newSessions : s).concat(
      prev.some(s => s.date === selectedDate) ? [] : [newSessions]
    ));
    setWeeklyQuota(prev => ({ ...prev, counts: newCounts }));
    setLastDistResult(result);
    if (result.failed > 0) {
      setShowDistReport(true);
    }
    if (result.failed > 0) setShowShortageAlert(true);

    setManualDistMode(false);
    setDistributionMode('auto');
    if (result.assigned === 0 && result.failed === 0) {
      showToast('لا توجد حصص غير مسندة تحتاج إلى توزيع', 'info');
    } else if (result.failed === 0) {
      showToast(`✅ تم توزيع ${result.assigned} حصة بنجاح`, 'success');
    } else if (result.assigned > 0) {
      showToast(`⚠️ تم توزيع ${result.assigned} حصة — تعذّر ${result.failed} حصة`, 'warning');
    } else {
      showToast('لا يوجد منتظرون متاحون لأي حصة', 'error');
    }
  };

  const handleManualAssign = (person: Teacher | Admin, period: AbsentPeriodEntry, absentTeacher: AbsentTeacher) => {
    if (isWaitingSlotDisabled(absentTeacher.id, period.periodNumber)) {
      showToast('هذه الحصة معطّلة ولا يمكن إضافة منتظر لها', 'warning');
      return;
    }
    const currentAssignments = currentSession?.assignments || [];
    const replacedAssignment = currentAssignments.find(
      a => a.absentTeacherId === absentTeacher.id && a.periodNumber === period.periodNumber
    );
    // Phase 3: validate before assigning
    const violations = validateAssignment(person, period, absentTeacher, currentAssignments, dayKey, replacedAssignment);
    if (hasBlockingViolations(violations)) {
      const blocking = violations.filter(v => v.severity === 'blocking');
      showToast(`❌ تعذّر الإسناد: ${blocking[0].message}`, 'error');
      return;
    }
    // No violations — proceed
    commitManualAssign(person, period, absentTeacher);
  };

  // Commit the actual assignment (used by both handleManualAssign and force override confirm)
  const commitManualAssign = (person: Teacher | Admin, period: AbsentPeriodEntry, absentTeacher: AbsentTeacher) => {
    const replacedAssignment = currentSession?.assignments.find(
      a => a.absentTeacherId === absentTeacher.id && a.periodNumber === period.periodNumber
    );
    const newAsgn: WaitingAssignment = {
      id: `asgn-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      absentTeacherId: absentTeacher.id,
      absentTeacherName: absentTeacher.teacherName,
      periodNumber: period.periodNumber,
      classId: period.classId,
      className: period.className,
      subjectId: period.subjectId,
      subjectName: period.subjectName,
      substituteTeacherId: person.id,
      substituteTeacherName: person.name,
      substitutePhone: (person as Teacher).phone || (person as Admin).phone || '',
      isSwap: false,
      status: 'pending',
      assignedAt: new Date().toISOString(),
    };
    updateSession(selectedDate, s => ({
      ...s,
      assignments: [...s.assignments.filter(
        a => !(a.absentTeacherId === absentTeacher.id && a.periodNumber === period.periodNumber)
      ), newAsgn],
    }));
    setWeeklyQuota(prev => {
      const counts = { ...prev.counts };
      if (replacedAssignment && !replacedAssignment.isSwap) {
        counts[replacedAssignment.substituteTeacherId] = Math.max(0, (counts[replacedAssignment.substituteTeacherId] || 0) - 1);
      }
      counts[person.id] = (counts[person.id] || 0) + 1;
      return { ...prev, counts };
    });
    showToast(`✅ تم إسناد الحصة لـ${person.name}`, 'success');
  };

  const handleRemoveAssignment = (asgn: WaitingAssignment) => {
    updateSession(selectedDate, s => ({
      ...s,
      assignments: s.assignments.filter(a => a.id !== asgn.id),
    }));
    if (!asgn.isSwap) {
      setWeeklyQuota(prev => ({
        ...prev,
        counts: { ...prev.counts, [asgn.substituteTeacherId]: Math.max(0, (prev.counts[asgn.substituteTeacherId] || 0) - 1) },
      }));
    }
    showToast('تم حذف الإسناد', 'info');
  };

  const confirmRemoveAssignment = () => {
    if (!removeAssignmentConfirm) return;
    handleRemoveAssignment(removeAssignmentConfirm);
    setRemoveAssignmentConfirm(null);
  };

  const confirmClearTeacherAssignments = () => {
    if (!clearTeacherAssignmentsConfirm) return;
    const removed = (currentSession?.assignments || []).filter(a => a.absentTeacherId === clearTeacherAssignmentsConfirm.id);
    releaseAssignmentQuota(removed);
    updateSession(selectedDate, s => ({
      ...s,
      assignments: s.assignments.filter(a => a.absentTeacherId !== clearTeacherAssignmentsConfirm.id),
    }));
    setClearTeacherAssignmentsConfirm(null);
    showToast('تم حذف جميع المنتظرين لهذا المعلم', 'info');
  };

  const confirmClearAllAssignments = () => {
    const removed = currentSession?.assignments || [];
    if (removed.length === 0) { setShowClearAllConfirm(false); return; }
    releaseAssignmentQuota(removed);
    updateSession(selectedDate, s => ({ ...s, assignments: [] }));
    setShowClearAllConfirm(false);
    showToast('تم حذف كل المنتظرين المسندين', 'info');
  };

  const confirmClearAllAbsents = () => {
    const removed = currentSession?.assignments || [];
    releaseAssignmentQuota(removed);
    updateSession(selectedDate, s => ({
      ...s,
      absentTeachers: [],
      assignments: [],
    }));
    setDisabledWaitingSlots(new Set());
    setManualNameSlots(new Set());
    setManualNameValues({});
    setLastDistResult(null);
    setManualDistMode(false);
    setDistributionMode(null);
    setShowClearAllAbsentsConfirm(false);
    showToast('تم حذف كل الغائبين لهذا اليوم', 'info');
  };

  const toggleWaitingSlotDisabled = (absentTeacherId: string, periodNumber: number) => {
    const key = getWaitingSlotKey(absentTeacherId, periodNumber);
    const isDisabling = !disabledWaitingSlots.has(key);
    if (isDisabling) {
      const removed = (currentSession?.assignments || []).filter(
        a => a.absentTeacherId === absentTeacherId && a.periodNumber === periodNumber
      );
      releaseAssignmentQuota(removed);
      updateSession(selectedDate, s => ({
        ...s,
        assignments: s.assignments.filter(a => !(a.absentTeacherId === absentTeacherId && a.periodNumber === periodNumber)),
      }));
      setManualNameSlots(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setManualNameValues(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setDisabledWaitingSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleManualNameSlot = (absentTeacherId: string, periodNumber: number) => {
    const key = getWaitingSlotKey(absentTeacherId, periodNumber);
    setManualNameSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const saveManualNameAssignment = (period: AbsentPeriodEntry, absentTeacher: AbsentTeacher) => {
    const key = getWaitingSlotKey(absentTeacher.id, period.periodNumber);
    const name = (manualNameValues[key] || '').trim();
    if (!name) return;
    const newAsgn: WaitingAssignment = {
      id: `manual-asgn-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      absentTeacherId: absentTeacher.id,
      absentTeacherName: absentTeacher.teacherName,
      periodNumber: period.periodNumber,
      classId: period.classId,
      className: period.className,
      subjectId: period.subjectId,
      subjectName: period.subjectName,
      substituteTeacherId: `manual-${key}`,
      substituteTeacherName: name,
      substitutePhone: '',
      isSwap: true,
      status: 'pending',
      assignedAt: new Date().toISOString(),
    };
    updateSession(selectedDate, s => ({
      ...s,
      assignments: [
        ...s.assignments.filter(a => !(a.absentTeacherId === absentTeacher.id && a.periodNumber === period.periodNumber)),
        newAsgn,
      ],
    }));
    setManualNameSlots(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    showToast('تم حفظ اسم المنتظر يدويًا', 'success');
  };

  const saveSelectedAssignPerson = () => {
    if (!showAssignModal || !selectedAssignPerson) {
      showToast('اختر منتظراً أولاً', 'warning');
      return;
    }
    handleManualAssign(selectedAssignPerson, showAssignModal.period, showAssignModal.absentTeacher);
  };

  const confirmSwap = () => {
    if (!showSwapConfirm) return;
    const { swap, period, absentId, absentName } = showSwapConfirm;

    const newAsgn: WaitingAssignment = {
      id: `asgn-${Date.now()}`,
      absentTeacherId: absentId,
      absentTeacherName: absentName,
      periodNumber: period.periodNumber,
      classId: period.classId,
      className: period.className,
      subjectId: period.subjectId,
      subjectName: period.subjectName,
      substituteTeacherId: swap.waitingTeacherId,
      substituteTeacherName: swap.waitingTeacherName,
      substitutePhone: swap.phone,
      isSwap: true,
      swapFromPeriod: swap.theirPeriod,
      status: 'pending',
      assignedAt: new Date().toISOString(),
    };

    updateSession(selectedDate, s => ({
      ...s,
      assignments: [...s.assignments.filter(
        a => !(a.absentTeacherId === absentId && a.periodNumber === period.periodNumber)
      ), newAsgn],
    }));
    // Swap does NOT consume quota
    if (swapSendMode === 'auto') {
      showToast(`📲 تم إرسال رسالة التبديل لـ${swap.waitingTeacherName}`, 'success');
    } else {
      showToast(`✅ تم إسناد تبديل الحصة لـ${swap.waitingTeacherName} — الإرسال يدوي`, 'success');
    }
    setShowSwapConfirm(null);
  };

  // ===== Computed stats =====
  const totalAbsent = currentSession?.absentTeachers.length || 0;
  const totalPeriods = currentSession?.absentTeachers.reduce((s, a) => s + getActiveAbsentPeriods(a).length, 0) || 0;
  const totalAssigned = (currentSession?.assignments || []).filter(
    a => !isWaitingSlotDisabled(a.absentTeacherId, a.periodNumber)
  ).length;
  const totalPending = totalPeriods - totalAssigned;
  const receiptDateSet = useMemo(() => new Set(receiptSelectedDates.length ? receiptSelectedDates : [selectedDate]), [receiptSelectedDates, selectedDate]);
  const receiptAssignments = useMemo(() => sessions
    .filter(s => receiptDateSet.has(s.date))
    .flatMap(s => s.assignments.map(a => ({ ...a, receiptDate: s.date, receiptDayName: s.dayName } as WaitingAssignment & { receiptDate: string; receiptDayName: string })))
    .filter(a => !isWaitingSlotDisabled(a.absentTeacherId, a.periodNumber)),
    [sessions, receiptDateSet, disabledWaitingSlots]
  );
  const receiptAbsentTeachersByDate = useMemo(() => {
    const map = new Map<string, AbsentTeacher>();
    sessions
      .filter(s => receiptDateSet.has(s.date))
      .forEach(s => s.absentTeachers.forEach(absent => map.set(`${s.date}-${absent.id}`, absent)));
    return map;
  }, [sessions, receiptDateSet]);
  const receiptRows = useMemo(() => {
    const q = receiptSearch.trim().toLowerCase();
    return receiptAssignments
      .filter(a => receiptFilter === 'all' ? true : receiptFilter === 'signed' ? !!a.signatureData : !a.signatureData)
      .filter(a => !q || [a.substituteTeacherName, a.absentTeacherName, a.className, a.subjectName].some(v => (v || '').toLowerCase().includes(q)));
  }, [receiptAssignments, receiptFilter, receiptSearch]);
  const waitingRecipientCount = useMemo(
    () => new Set(receiptAssignments.map(a => a.substituteTeacherId)).size,
    [receiptAssignments]
  );
  const receiptGroups = useMemo(() => {
    const rowsByAbsent = new Map<string, (WaitingAssignment & { receiptDate?: string; receiptDayName?: string })[]>();
    receiptRows.forEach(row => {
      rowsByAbsent.set(`${(row as any).receiptDate || selectedDate}-${row.absentTeacherId}`, [...(rowsByAbsent.get(`${(row as any).receiptDate || selectedDate}-${row.absentTeacherId}`) || []), row]);
    });
    return Array.from(rowsByAbsent.entries())
      .map(([groupKey, rows]) => {
        const receiptDate = (rows[0] as any)?.receiptDate || selectedDate;
        const absentTeacherId = rows[0]?.absentTeacherId || groupKey;
        const absent = receiptAbsentTeachersByDate.get(`${receiptDate}-${absentTeacherId}`);
        return {
          key: groupKey,
          absentTeacherId,
          absentTeacherName: absent?.teacherName || rows[0]?.absentTeacherName || 'معلم غائب',
          absenceType: absent?.absenceType || 'full' as const,
          date: receiptDate,
          dayName: (rows[0] as any)?.receiptDayName || getArabicDayFromDate(receiptDate),
          rows: rows.slice().sort((a, b) => a.periodNumber - b.periodNumber),
        };
      })
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.absentTeacherName.localeCompare(b.absentTeacherName, 'ar'));
  }, [receiptRows, receiptAbsentTeachersByDate, selectedDate]);
  // Flat row list for the receipt log table (serial · waiter · ... · actions).
  const receiptFlatRows = useMemo(
    () => receiptRows.slice().sort((a, b) =>
      (((a as any).receiptDate || '') as string).localeCompare(((b as any).receiptDate || '') as string)
      || (a.absentTeacherName || '').localeCompare(b.absentTeacherName || '', 'ar')
      || a.periodNumber - b.periodNumber
    ),
    [receiptRows]
  );
  const signedReceiptCount = receiptAssignments.filter(a => !!a.signatureData).length;
  const receiptTotalAssigned = receiptAssignments.length;
  const pendingReceiptCount = receiptTotalAssigned - signedReceiptCount;
  const actionButtonClass = (active = false) =>
    `inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-black transition-all ${
      active
        ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-md shadow-[#655ac1]/20'
        : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-slate-50'
    }`;
  const openWaitingPrint = (target: string | string[] | null = null, initialTab: 'print' | 'blank' = 'print', showSignatures = false) => {
    if (Array.isArray(target)) {
      setPrintTargetTeacherIds(target);
      setPrintTargetTeacherId(null);
    } else {
      setPrintTargetTeacherId(target);
      setPrintTargetTeacherIds([]);
    }
    setPrintShowSignatures(showSignatures);
    setPrintInitialTab(initialTab);
    setShowPrintModal(true);
  };

  // Absent teachers / assignments across the selected receipt date range —
  // used to print the post-signature schedule via the same daily-waiting form.
  const receiptRangeAbsentTeachers = useMemo(
    () => sessions.filter(s => receiptDateSet.has(s.date)).flatMap(s => s.absentTeachers),
    [sessions, receiptDateSet]
  );

  // Role label for a waiter: "معلم" for teachers, the real title for admins
  // (وكيل / موجه طلابي / ...). Falls back to "معلم".
  const roleLabelFor = (personId: string): string => {
    if (teachers.some(t => t.id === personId)) return 'معلم';
    const admin = admins.find(a => a.id === personId);
    if (admin) return admin.role || 'إداري';
    return 'معلم';
  };

  const refreshWaitingReceiptFromStorage = () => {
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      if (raw) setSessions(JSON.parse(raw));
      setReceiptSearch('');
      setReceiptFilter('all');
      showToast('تم تحديث سجل الاستلام', 'success');
    } catch {
      showToast('تعذر تحديث سجل الاستلام', 'error');
    }
  };

  const openWaitingPrintableHtml = (html: string) => {
    const w = window.open('', '_blank', 'width=1100,height=750');
    if (!w) {
      showToast('تعذر فتح نافذة الطباعة', 'error');
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 450);
  };

  const waitingReceiptPrintStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; direction: rtl; font-family: 'Tajawal', Arial, sans-serif; color: #1e293b; background: #fff; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .official-header { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; align-items: start; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 12px; }
    .header-side { font-size: 11px; font-weight: 800; line-height: 1.65; }
    .header-center { text-align: center; }
    .header-left { text-align: left; }
    .school-logo { width: 52px; height: 52px; object-fit: contain; margin-bottom: 4px; }
    .logo-placeholder { width: 52px; height: 52px; border: 2px solid #cbd5e1; border-radius: 50%; margin: 0 auto 4px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px; font-weight: 900; }
    h1 { margin: 0; font-size: 18px; font-weight: 900; color: #111827; }
    .report-title { text-align: center; font-size: 18px; font-weight: 900; margin: 8px 0 12px; color: #111827; }
    .absence-card { border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc; padding: 10px 12px; margin-bottom: 10px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .field-label { display: block; color: #64748b; font-size: 10px; font-weight: 900; margin-bottom: 2px; }
    .field-value { color: #1e293b; font-size: 12px; font-weight: 900; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; margin-bottom: 18px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 8px; text-align: center; vertical-align: middle; }
    th { background: #a59bf0; color: #fff; font-weight: 900; }
    .signed { color: #047857; font-weight: 900; }
    .pending { color: #b45309; font-weight: 900; }
    .footer { margin-top: 20px; display: flex; justify-content: flex-end; }
    .signature-box { width: 260px; font-size: 12px; font-weight: 900; }
    .signature-line { margin-top: 22px; border-top: 1px solid #94a3b8; padding-top: 6px; color: #475569; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } th { background: #a59bf0 !important; color: #fff !important; } }
  `;

  const buildWaitingReceiptOfficialHeader = (title: string) => `
    <div class="official-header">
      <div class="header-side">
        <div>الإدارة العامة للتعليم</div>
        <div>${escapeHtml(schoolInfo.region || '')}</div>
        <div>المدرسة: ${escapeHtml(schoolInfo.schoolName || 'اسم المدرسة')}</div>
      </div>
      <div class="header-center">
        ${schoolInfo.logo ? `<img src="${schoolInfo.logo}" class="school-logo" />` : '<div class="logo-placeholder">شعار</div>'}
        <h1>${escapeHtml(schoolInfo.schoolName || '')}</h1>
      </div>
      <div class="header-side header-left">
        <div>اليوم: ${escapeHtml(dayName)}</div>
        <div>التاريخ: ${escapeHtml(formatDateNumeric(selectedDate, receiptCalendarType))}</div>
        <div>العام الدراسي: ${escapeHtml(schoolInfo.academicYear || '')}</div>
      </div>
    </div>
    <div class="report-title">${escapeHtml(title)}</div>
  `;

  // Flat receipt-log table matching the on-screen design (serial · waiter ·
  // role · in-place-of · class · sent date · signature · signed date · time).
  const buildWaitingReceiptFlatHtml = () => `
    <section class="page">
      ${buildWaitingReceiptOfficialHeader('سجل استلام التكليف بالانتظار')}
      <table>
        <thead>
          <tr>
            <th style="width:4%">م</th>
            <th style="width:15%">المنتظر</th>
            <th style="width:9%">الصفة</th>
            <th style="width:14%">بدلاً من</th>
            <th style="width:11%">الصف والفصل</th>
            <th style="width:12%">تاريخ الإرسال</th>
            <th style="width:8%">التوقيع</th>
            <th style="width:11%">تاريخ التوقيع</th>
            <th style="width:8%">وقت التوقيع</th>
          </tr>
        </thead>
        <tbody>
          ${receiptFlatRows.map((row, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${escapeHtml(row.substituteTeacherName)}</td>
              <td>${escapeHtml(roleLabelFor(row.substituteTeacherId))}</td>
              <td>${escapeHtml(row.absentTeacherName)}</td>
              <td>${escapeHtml(row.className)}</td>
              <td>${formatISODateNumeric(row.sentAt, receiptCalendarType)}</td>
              <td class="${row.signatureData ? 'signed' : 'pending'}">${row.signatureData ? 'وقّع' : 'لم يوقّع'}</td>
              <td>${row.signatureData ? formatISODateNumeric(row.signatureSignedAt, receiptCalendarType) : '—'}</td>
              <td>${row.signatureData ? formatReceiptTime(row.signatureSignedAt) : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer"><div class="signature-box"><div>مدير المدرسة: ${escapeHtml(schoolInfo.principal || '')}</div><div class="signature-line">التوقيع</div></div></div>
    </section>
  `;

  // Print a single waiter's assignment form (works whether signed or not),
  // matching the duty receipt's "عرض وطباعة" → "طباعة النموذج" behaviour.
  const printWaitingAssignmentForm = (row: WaitingAssignment & { receiptDate?: string; receiptDayName?: string }) => {
    const receiptDate = (row as any).receiptDate || selectedDate;
    const day = (row as any).receiptDayName || getArabicDayFromDate(receiptDate);
    const dateStr = formatDateNumeric(receiptDate, receiptCalendarType);
    const html = `
      <section class="page">
        ${buildWaitingReceiptOfficialHeader('تكليف بالانتظار')}
        <div class="absence-card">
          <div><span class="field-label">المنتظر</span><span class="field-value">${escapeHtml(row.substituteTeacherName)}</span></div>
          <div><span class="field-label">الصفة</span><span class="field-value">${escapeHtml(roleLabelFor(row.substituteTeacherId))}</span></div>
          <div><span class="field-label">بدلاً من</span><span class="field-value">${escapeHtml(row.absentTeacherName)}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:16%">اليوم</th>
              <th style="width:16%">التاريخ</th>
              <th style="width:10%">الحصة</th>
              <th style="width:20%">الصف والفصل</th>
              <th style="width:22%">المادة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(day)}</td>
              <td>${escapeHtml(dateStr)}</td>
              <td>${row.periodNumber}</td>
              <td>${escapeHtml(row.className)}</td>
              <td>${escapeHtml(row.subjectName || '')}</td>
            </tr>
          </tbody>
        </table>
        <p style="margin:18px 4px 10px;font-weight:700;">تم الاطلاع على حصة الانتظار المسندة والتوقيع بالعلم.</p>
        <div style="margin:6px 4px 0;font-weight:700;">التوقيع:</div>
        <div style="height:90px;border:1px dashed #cbd5e1;border-radius:10px;margin-top:6px;display:flex;align-items:center;justify-content:center;">
          ${row.signatureData ? `<img src="${row.signatureData}" style="max-height:80px;max-width:240px;object-fit:contain;" />` : ''}
        </div>
        <div class="footer"><div class="signature-box"><div>مدير المدرسة: ${escapeHtml(schoolInfo.principal || '')}</div><div class="signature-line">التوقيع</div></div></div>
      </section>
    `;
    openWaitingPrintableHtml(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><style>${waitingReceiptPrintStyles}</style></head><body>${html}<script>document.fonts.ready.then(() => window.print()); setTimeout(() => window.print(), 1200);</script></body></html>`);
  };

  const printWaitingReceiptGroups = () => {
    if (!receiptFlatRows.length) {
      showToast('لا توجد سجلات انتظار للطباعة', 'warning');
      return;
    }
    openWaitingPrintableHtml(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><style>${waitingReceiptPrintStyles}</style></head><body>${buildWaitingReceiptFlatHtml()}<script>document.fonts.ready.then(() => window.print()); setTimeout(() => window.print(), 1200);</script></body></html>`);
  };

  // ── Phase 2: Fairness / distribution quality score ──
  const distributionQuality = useMemo(() => {
    const waitingTeachers = teachers.filter(t => (t.waitingQuota || 0) > 0);
    if (waitingTeachers.length === 0) return { score: 100, level: 'ممتاز', color: 'emerald' };
    const loads = waitingTeachers.map(t => {
      const total = t.waitingQuota || 10;
      const assigned = weeklyQuota.counts[t.id] || 0;
      return total > 0 ? assigned / total : 0;
    });
    const mean = loads.reduce((s, l) => s + l, 0) / loads.length;
    const variance = loads.reduce((s, l) => s + Math.pow(l - mean, 2), 0) / loads.length;
    const stdDev = Math.sqrt(variance);
    // Lower stdDev = more fair. stdDev 0 = perfect, >0.3 = poor
    const score = Math.max(0, Math.round(100 - stdDev * 300));
    return {
      score,
      level: score >= 85 ? 'ممتاز' : score >= 65 ? 'جيد' : score >= 40 ? 'مقبول' : 'يحتاج مراجعة',
      color: score >= 85 ? 'emerald' : score >= 65 ? 'blue' : score >= 40 ? 'amber' : 'rose',
    };
  }, [teachers, weeklyQuota]);

  // ── New report modal computed data ──
  const rptCalType = (schoolInfo.calendarType || getCurrentAcademicSemester(schoolInfo)?.calendarType || 'hijri') as 'hijri' | 'gregorian';

  const allWaitingStaff = useMemo(() => {
    const list: { id: string; name: string; role: 'teacher' | 'admin'; quota: number }[] = [];
    teachers.forEach(t => { if ((t.waitingQuota || 0) > 0) list.push({ id: t.id, name: t.name, role: 'teacher', quota: t.waitingQuota || 0 }); });
    admins.forEach(a => {
      if (!ADMIN_BLOCKED_ROLES.some(r => a.role?.includes(r))) list.push({ id: a.id, name: a.name, role: 'admin', quota: a.waitingQuota || 0 });
    });
    return list;
  }, [teachers, admins]);

  const rptFilteredSessions = useMemo(() => sessions.filter(session => {
    if (rptFromDate && session.date < rptFromDate) return false;
    if (rptToDate && session.date > rptToDate) return false;
    return true;
  }), [sessions, rptFromDate, rptToDate]);

  const rptTableData = useMemo(() => {
    const staffMap: Record<string, { id: string; name: string; role: 'teacher' | 'admin'; quota: number; totalAssigned: number; periods: number[]; days: Set<string> }> = {};
    for (const session of rptFilteredSessions) {
      for (const asgn of session.assignments) {
        if (isWaitingSlotDisabled(asgn.absentTeacherId, asgn.periodNumber)) continue;
        const sid = asgn.substituteTeacherId;
        if (rptStaffMode === 'specific' && rptSelectedIds.size > 0 && !rptSelectedIds.has(sid)) continue;
        if (!staffMap[sid]) {
          const teacher = teachers.find(t => t.id === sid);
          const admin = admins.find(a => a.id === sid);
          const quota = teacher?.waitingQuota || admin?.waitingQuota || 0;
          staffMap[sid] = { id: sid, name: asgn.substituteTeacherName, role: admin ? 'admin' : 'teacher', quota, totalAssigned: 0, periods: [], days: new Set() };
        }
        staffMap[sid].totalAssigned++;
        staffMap[sid].periods.push(asgn.periodNumber);
        staffMap[sid].days.add(session.date);
      }
    }
    return Object.values(staffMap)
      .map(row => ({ ...row, dayCount: row.days.size }))
      .sort((a, b) => b.totalAssigned - a.totalAssigned || a.name.localeCompare(b.name, 'ar'));
  }, [rptFilteredSessions, rptStaffMode, rptSelectedIds, teachers, admins, disabledWaitingSlots]);

  const rptAbsenceData = useMemo(() => {
    const absentMap: Record<string, { id: string; name: string; fullDays: number; partialDays: number; affectedPeriods: number; dates: Set<string> }> = {};
    const classMap: Record<string, { name: string; affectedPeriods: number; dates: Set<string>; subjects: Record<string, number> }> = {};
    const subjectMap: Record<string, { name: string; affectedPeriods: number; dates: Set<string>; classes: Record<string, number>; absents: Set<string> }> = {};

    for (const session of rptFilteredSessions) {
      for (const absent of session.absentTeachers) {
        if (!absentMap[absent.teacherId]) {
          absentMap[absent.teacherId] = { id: absent.teacherId, name: absent.teacherName, fullDays: 0, partialDays: 0, affectedPeriods: 0, dates: new Set() };
        }
        const absentRow = absentMap[absent.teacherId];
        absentRow.dates.add(session.date);
        if (absent.absenceType === 'full') absentRow.fullDays++;
        else absentRow.partialDays++;

        for (const period of absent.periods) {
          if (isWaitingSlotDisabled(absent.id, period.periodNumber)) continue;
          absentRow.affectedPeriods++;

          const classKey = period.classId || period.className || 'unknown-class';
          if (!classMap[classKey]) classMap[classKey] = { name: period.className || 'غير محدد', affectedPeriods: 0, dates: new Set(), subjects: {} };
          classMap[classKey].affectedPeriods++;
          classMap[classKey].dates.add(session.date);
          classMap[classKey].subjects[period.subjectName || 'غير محدد'] = (classMap[classKey].subjects[period.subjectName || 'غير محدد'] || 0) + 1;

          const subjectKey = period.subjectId || period.subjectName || 'unknown-subject';
          if (!subjectMap[subjectKey]) subjectMap[subjectKey] = { name: period.subjectName || 'غير محدد', affectedPeriods: 0, dates: new Set(), classes: {}, absents: new Set() };
          subjectMap[subjectKey].affectedPeriods++;
          subjectMap[subjectKey].dates.add(session.date);
          subjectMap[subjectKey].classes[period.className || 'غير محدد'] = (subjectMap[subjectKey].classes[period.className || 'غير محدد'] || 0) + 1;
          subjectMap[subjectKey].absents.add(absent.teacherId);
        }
      }
    }

    const topFromRecord = (record: Record<string, number>) => {
      const [name] = Object.entries(record).sort((a, b) => b[1] - a[1])[0] || ['—', 0];
      return name;
    };

    return {
      absents: Object.values(absentMap)
        .map(row => ({ ...row, dayCount: row.dates.size }))
        .sort((a, b) => b.affectedPeriods - a.affectedPeriods || b.dayCount - a.dayCount || a.name.localeCompare(b.name, 'ar')),
      classes: Object.values(classMap)
        .map(row => ({ ...row, dayCount: row.dates.size, topSubject: topFromRecord(row.subjects) }))
        .sort((a, b) => b.affectedPeriods - a.affectedPeriods || a.name.localeCompare(b.name, 'ar')),
      subjects: Object.values(subjectMap)
        .map(row => ({ ...row, dayCount: row.dates.size, absentCount: row.absents.size, topClass: topFromRecord(row.classes) }))
        .sort((a, b) => b.affectedPeriods - a.affectedPeriods || a.name.localeCompare(b.name, 'ar')),
    };
  }, [rptFilteredSessions, disabledWaitingSlots]);

  const rptSummary = useMemo(() => {
    const totalAssigned = rptTableData.reduce((sum, row) => sum + row.totalAssigned, 0);
    const activeWaiters = rptTableData.length;
    const absentCount = rptAbsenceData.absents.length;
    const affectedClasses = rptAbsenceData.classes.length;
    const loads = allWaitingStaff
      .filter(staff => rptStaffMode === 'all' || rptSelectedIds.size === 0 || rptSelectedIds.has(staff.id))
      .map(staff => {
        const row = rptTableData.find(item => item.id === staff.id);
        return staff.quota > 0 ? (row?.totalAssigned || 0) / staff.quota : 0;
      });
    const mean = loads.length ? loads.reduce((sum, load) => sum + load, 0) / loads.length : 0;
    const variance = loads.length ? loads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / loads.length : 0;
    const fairnessScore = Math.max(0, Math.min(100, Math.round(100 - Math.sqrt(variance) * 220)));

    return {
      totalAssigned,
      activeWaiters,
      absentCount,
      affectedClasses,
      avgAssigned: activeWaiters ? Number((totalAssigned / activeWaiters).toFixed(1)) : 0,
      topWaiter: rptTableData[0]?.name || '—',
      topAbsent: rptAbsenceData.absents[0]?.name || '—',
      fairnessScore,
      fairnessLabel: fairnessScore >= 85 ? 'متوازن' : fairnessScore >= 65 ? 'جيد' : 'يحتاج مراجعة',
    };
  }, [rptTableData, rptAbsenceData, allWaitingStaff, rptStaffMode, rptSelectedIds]);

  const rptWeekTotal = useMemo(() => {
    const weekDates = new Set(getWeekDates(getTodayStr()));
    return sessions.reduce((sum, s) => weekDates.has(s.date) ? sum + s.assignments.filter(a => !isWaitingSlotDisabled(a.absentTeacherId, a.periodNumber)).length : sum, 0);
  }, [sessions, disabledWaitingSlots]);

  const rptMonthTotal = useMemo(() => {
    const today = getTodayStr();
    const [cy, cm] = today.split('-').map(Number);
    return sessions.reduce((sum, s) => {
      const [sy, sm] = s.date.split('-').map(Number);
      return sy === cy && sm === cm ? sum + s.assignments.filter(a => !isWaitingSlotDisabled(a.absentTeacherId, a.periodNumber)).length : sum;
    }, 0);
  }, [sessions, disabledWaitingSlots]);

  // ── Phase 2: Shortage detection ──
  const shortageWarnings = useMemo(() => {
    if (!currentSession) return [];
    const warnings: { absentName: string; periodNumber: number; className: string }[] = [];
    for (const absent of currentSession.absentTeachers) {
      for (const period of absent.periods) {
        if (isWaitingSlotDisabled(absent.id, period.periodNumber)) continue;
        const alreadyAssigned = currentSession.assignments.find(
          a => a.absentTeacherId === absent.id && a.periodNumber === period.periodNumber
        );
        if (alreadyAssigned) continue;
        const waiters = getWaitersWithQuota(period.periodNumber, dayKey, currentSession.assignments);
        const eligible = waiters.filter(w => (w.total - w.assigned) > 0);
        if (eligible.length === 0) {
          warnings.push({ absentName: absent.teacherName, periodNumber: period.periodNumber, className: period.className });
        }
      }
    }
    return warnings;
  }, [currentSession, dayKey, getWaitersWithQuota]);

  const selectedTeacherSchedule = useMemo(
    () => absenceForm.teacherId ? getTeacherDaySchedule(absenceForm.teacherId, dayKey) : [],
    [absenceForm.teacherId, dayKey, getTeacherDaySchedule]
  );

  const maxPeriods = useMemo(() => {
    const tc = schoolInfo.timing?.periodCounts;
    if (tc) {
      const key = Object.keys(tc).find(k => k === dayKey);
      if (key) return tc[key];
    }
    return 7;
  }, [schoolInfo.timing, dayKey]);

  const filteredTeachers = useMemo(
    () => teachers.filter(t =>
      t.name.includes(teacherSearch) &&
      !currentSession?.absentTeachers.some(a => a.teacherId === t.id) &&
      !absentQueue.some(q => q.teacherId === t.id)
    ),
    [teachers, teacherSearch, currentSession, absentQueue]
  );

  if ((isPrintSend || isSend) && showWaitingReceipt) {
    return (
      <div className="space-y-5" dir="rtl">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setShowWaitingReceipt(false)} title="رجوع"
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-slate-50 transition-all">
              <ArrowRight size={18} />
            </button>
            <div>
              <h2 className="font-black text-slate-800 text-lg">سجل استلام التكليف بالانتظار</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {signedReceiptCount} وقّع من أصل {receiptTotalAssigned} تكليف انتظار
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'إجمالي المنتظرين', value: String(waitingRecipientCount), icon: Users },
            { label: 'وقّع', value: String(signedReceiptCount), icon: CheckCircle2 },
            { label: 'لم يوقّع', value: String(Math.max(0, pendingReceiptCount)), icon: AlertCircle },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl px-4 py-5 flex items-start gap-3 shadow-sm">
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

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-56">
              <label className="block text-xs font-black text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-[#655ac1]" />
                من تاريخ
              </label>
              <DatePicker
                value={new DateObject({ date: receiptStartDate, calendar: gregorian, format: 'YYYY-MM-DD' }).convert(receiptCalendarType === 'hijri' ? arabic : gregorian, receiptCalendarType === 'hijri' ? arabic_ar : gregorian_ar)}
                onChange={(d: any) => {
                  if (d instanceof DateObject) {
                    const g = d.convert(gregorian, gregorian_en).format('YYYY-MM-DD');
                    setReceiptStartDate(g);
                    setSelectedDate(g);
                    if (receiptEndDate < g) setReceiptEndDate(g);
                  }
                }}
                calendar={receiptCalendarType === 'hijri' ? arabic : gregorian}
                locale={receiptCalendarType === 'hijri' ? arabic_ar : gregorian_ar}
                containerClassName="w-full"
                inputClass="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors cursor-pointer bg-white"
                placeholder="من تاريخ"
                portal
                portalTarget={document.body}
                editable={false}
                zIndex={99999}
                format="dddd - YYYY/MM/DD"
              />
            </div>
            <div className="w-56">
              <label className="block text-xs font-black text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-[#655ac1]" />
                إلى تاريخ
              </label>
              <DatePicker
                value={new DateObject({ date: receiptEndDate, calendar: gregorian, format: 'YYYY-MM-DD' }).convert(receiptCalendarType === 'hijri' ? arabic : gregorian, receiptCalendarType === 'hijri' ? arabic_ar : gregorian_ar)}
                onChange={(d: any) => {
                  if (d instanceof DateObject) {
                    const g = d.convert(gregorian, gregorian_en).format('YYYY-MM-DD');
                    setReceiptEndDate(g);
                    if (g < receiptStartDate) setReceiptStartDate(g);
                  }
                }}
                calendar={receiptCalendarType === 'hijri' ? arabic : gregorian}
                locale={receiptCalendarType === 'hijri' ? arabic_ar : gregorian_ar}
                containerClassName="w-full"
                inputClass="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors cursor-pointer bg-white"
                placeholder="إلى تاريخ"
                portal
                portalTarget={document.body}
                editable={false}
                zIndex={99999}
                format="dddd - YYYY/MM/DD"
              />
            </div>
            <div className="flex-1" />
            <button type="button" onClick={refreshWaitingReceiptFromStorage}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all">
              <RefreshCw size={15} />
              تحديث
            </button>
            <button type="button" onClick={() => printWaitingReceiptGroups()} disabled={receiptGroups.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50">
              <Printer size={15} />
              طباعة سجل الاستلام
            </button>
            <button type="button" onClick={() => openWaitingPrint(null, 'print', true)} disabled={receiptFlatRows.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all disabled:opacity-50">
              <Printer size={15} />
              طباعة الانتظار بعد التوقيع
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-white flex flex-wrap items-center gap-3">
            <p className="text-sm font-black text-slate-800 flex items-center gap-2">
              <ClipboardList size={18} className="text-[#655ac1]" />
              سجل الاستلام
            </p>
            <div className="flex-1" />
            <div className="relative w-64">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" value={receiptSearch} onChange={e => setReceiptSearch(e.target.value)}
                placeholder="ابحث عن منتظر أو غائب..."
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
              {[
                { id: 'all', label: 'الكل' },
                { id: 'signed', label: 'وقّع' },
                { id: 'pending', label: 'لم يوقّع' },
              ].map(option => (
                <button key={option.id} type="button" onClick={() => setReceiptFilter(option.id as typeof receiptFilter)}
                  className={`px-4 py-2 rounded-xl border text-xs font-black transition-all ${
                    receiptFilter === option.id
                      ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1]'
                  }`}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            {receiptFlatRows.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm font-bold text-slate-400">لا توجد تكليفات مطابقة.</div>
            ) : (
              <table className="w-full min-w-[1100px] table-fixed text-sm text-right" dir="rtl">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] text-center w-[4%]">م</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] w-[15%]">المنتظر</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] text-center w-[9%]">الصفة</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] text-center w-[14%]">بدلاً من</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] text-center w-[11%]">الصف والفصل</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] text-center w-[11%]">تاريخ الإرسال</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] text-center w-[8%]">التوقيع</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] text-center w-[10%]">تاريخ التوقيع</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] text-center w-[8%]">وقت التوقيع</th>
                    <th className="px-2 py-3 font-black text-[#655ac1] text-[12px] text-center w-[10%]">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receiptFlatRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-2 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 text-slate-400 text-xs font-bold">{idx + 1}</span>
                      </td>
                      <td className="px-2 py-3 font-black text-slate-800 text-[12px] truncate" title={row.substituteTeacherName}>{row.substituteTeacherName}</td>
                      <td className="px-2 py-3 text-center font-bold text-[#655ac1] text-[12px]">{roleLabelFor(row.substituteTeacherId)}</td>
                      <td className="px-2 py-3 text-center font-bold text-slate-600 text-[12px] truncate" title={row.absentTeacherName}>{row.absentTeacherName}</td>
                      <td className="px-2 py-3 text-center font-bold text-slate-600 text-[12px]" dir="ltr" style={{ unicodeBidi: 'isolate' }}>{row.className}</td>
                      <td className="px-2 py-3 text-center font-bold text-slate-500 text-[11px]">{formatISODateNumeric(row.sentAt, receiptCalendarType)}</td>
                      <td className="px-2 py-3 text-center">
                        {row.signatureData ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-black">وقّع</span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-xs font-black">لم يوقّع</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center font-bold text-slate-500 text-[11px]">{row.signatureData ? formatISODateNumeric(row.signatureSignedAt, receiptCalendarType) : '—'}</td>
                      <td className="px-2 py-3 text-center font-bold text-slate-600 text-[11px]">{row.signatureData ? formatReceiptTime(row.signatureSignedAt) : '—'}</td>
                      <td className="px-2 py-3 text-center">
                        <button type="button" onClick={() => { setPreviewAssignment(row); setHasSignature(false); setShowElectronicPreview(true); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-black hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#f1efff] transition-all whitespace-nowrap">
                          <Eye size={13} />
                          عرض وطباعة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {showElectronicPreview && previewAssignment && ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm"
            dir="rtl"
            onClick={() => setShowElectronicPreview(false)}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-white border border-slate-200 shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Eye size={22} className="text-[#655ac1] shrink-0" />
                  <h3 className="font-black text-slate-800">معاينة التكليف</h3>
                </div>
                <button type="button" onClick={() => setShowElectronicPreview(false)}
                  className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto p-6 space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="block text-slate-500 font-bold mb-1">الاسم</span>
                      <span className="font-black text-slate-800">{previewAssignment.substituteTeacherName}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-bold mb-1">الصفة</span>
                      <span className="font-black text-[#655ac1]">{roleLabelFor(previewAssignment.substituteTeacherId)}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-bold mb-1">رقم الجوال</span>
                      <span className="font-black text-slate-800" dir="ltr">{previewAssignment.substitutePhone || 'غير مسجل'}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white border-b border-slate-100">
                        <th className="px-3 py-2 text-right text-[#655ac1] font-black">اليوم</th>
                        <th className="px-3 py-2 text-right text-[#655ac1] font-black">التاريخ</th>
                        <th className="px-3 py-2 text-right text-[#655ac1] font-black">الحصة</th>
                        <th className="px-3 py-2 text-right text-[#655ac1] font-black">الفصل</th>
                        <th className="px-3 py-2 text-right text-[#655ac1] font-black">المعلم الغائب</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-100">
                        <td className="px-3 py-2 font-black text-slate-700">{(previewAssignment as any).receiptDayName || getArabicDayFromDate((previewAssignment as any).receiptDate || selectedDate)}</td>
                        <td className="px-3 py-2 font-bold text-slate-600">{formatDateNumeric((previewAssignment as any).receiptDate || selectedDate, (schoolInfo.calendarType || 'hijri') as 'hijri' | 'gregorian')}</td>
                        <td className="px-3 py-2 font-bold text-slate-600">الحصة {previewAssignment.periodNumber}</td>
                        <td className="px-3 py-2 font-bold text-slate-600">{previewAssignment.className}</td>
                        <td className="px-3 py-2 font-bold text-slate-600">{previewAssignment.absentTeacherName}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm font-black text-slate-700">تم الاطلاع على حصة الانتظار المسندة والتوقيع بالعلم.</p>
                <div className="rounded-2xl border-2 border-dashed border-[#655ac1]/30 bg-slate-50 h-32 flex items-center justify-center text-xs font-bold text-slate-300">
                  {previewAssignment.signatureData ? (
                    <img src={previewAssignment.signatureData} alt="توقيع المعلم" className="max-h-24 max-w-[260px] object-contain" />
                  ) : 'خانة التوقيع'}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => printWaitingAssignmentForm(previewAssignment as WaitingAssignment & { receiptDate?: string; receiptDayName?: string })}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#655ac1] hover:bg-[#5046a0] text-white font-bold text-sm transition-all shadow-md shadow-[#655ac1]/20"
                  >
                    <Printer size={16} /> طباعة النموذج
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
        {showPrintModal && (
          <DailyWaitingPrintModal
            isOpen={showPrintModal}
            onClose={() => setShowPrintModal(false)}
            dayName={getArabicDayFromDate(selectedDate)}
            gregorianDateStr={formatGregorian(selectedDate)}
            hijriDateStr={formatHijri(selectedDate)}
            schoolInfo={{ ...schoolInfo, calendarType: receiptCalendarType }}
            absentTeachers={printShowSignatures ? receiptRangeAbsentTeachers : (currentSession?.absentTeachers || [])}
            assignments={printShowSignatures ? receiptAssignments : (currentSession?.assignments || []).filter(a => !isWaitingSlotDisabled(a.absentTeacherId, a.periodNumber))}
            targetTeacherId={printTargetTeacherId}
            targetTeacherIds={printTargetTeacherIds}
            initialTab={printInitialTab}
            colorMode={printInitialTab === 'blank' ? blankPrintColorMode : waitingPrintColorMode}
            showSignatureImages={printShowSignatures}
            autoPrint
          />
        )}
      </div>
    );
  }

  if (isReports) {
    const activeSemester = getCurrentAcademicSemester(schoolInfo);
    const academicWeeks = buildAcademicWeeks(activeSemester);
    const today = getTodayStr();
    const autoWeek =
      academicWeeks.find(w => today >= w.start && today <= w.end) ||
      academicWeeks[academicWeeks.length - 1] ||
      null;
    const calendarReady = !!activeSemester && academicWeeks.length > 0 && !!autoWeek;

    const formatDateLabel = (dateStr: string) => rptCalendarType === 'hijri' ? formatHijri(dateStr) : formatGregorian(dateStr);
    const formatDateLabelFull = (dateStr: string) => `${getArabicDayFromDate(dateStr)} ${formatDateLabel(dateStr)}`;

    const effectiveWeeks: AcademicWeek[] = calendarReady
      ? academicWeeks.filter(w => rptSelectedWeekNumbers.has(w.number))
      : [];

    type ReportCell = { period: number; className: string };
    type ReportRow = { id: string; name: string; role: 'teacher' | 'admin'; roleLabel: string; quota: number; totalAssigned: number; dayPeriods: Record<string, ReportCell[]> };

    const rptSearchTerm = embTableSearch.trim();
    // عند اختيار منتظرين محددين نُرشّح عليهم؛ وإلا نعرض الجميع.
    const filterByMode = (rows: ReportRow[]) =>
      rptSelectedIds.size > 0 ? rows.filter(r => rptSelectedIds.has(r.id)) : rows;
    const applySearch = (rows: ReportRow[]) => rptSearchTerm ? rows.filter(r => r.name.includes(rptSearchTerm)) : rows;

    const computeWeek = (week: AcademicWeek) => {
      const daySet = new Set(week.days);
      const perStaff: Record<string, ReportRow> = {};
      sessions.filter(s => daySet.has(s.date)).forEach(s => {
        s.assignments.forEach(a => {
          if (isWaitingSlotDisabled(a.absentTeacherId, a.periodNumber)) return;
          const sid = a.substituteTeacherId;
          const teacher = teachers.find(t => t.id === sid);
          const admin = admins.find(adm => adm.id === sid);
          if (!perStaff[sid]) {
            perStaff[sid] = {
              id: sid,
              name: a.substituteTeacherName,
              role: admin ? 'admin' : 'teacher',
              roleLabel: admin ? (admin.role || 'إداري') : 'معلم',
              quota: teacher ? getTeacherWaitingQuota(teacher) : (admin?.waitingQuota || 0),
              totalAssigned: 0,
              dayPeriods: {},
            };
          }
          perStaff[sid].totalAssigned++;
          if (!perStaff[sid].dayPeriods[s.date]) perStaff[sid].dayPeriods[s.date] = [];
          perStaff[sid].dayPeriods[s.date].push({ period: a.periodNumber, className: a.className || '' });
        });
      });
      const rows = applySearch(filterByMode(
        Object.values(perStaff).sort((a, b) => b.totalAssigned - a.totalAssigned || a.name.localeCompare(b.name, 'ar'))
      ));
      const dayHeaders = week.days.map(d => ({ date: d, day: getArabicDayFromDate(d), isHoliday: week.holidays.includes(d) }));
      const totalAssigned = rows.reduce((sum, r) => sum + r.totalAssigned, 0);
      return { week, rows, dayHeaders, totalAssigned };
    };

    const weekBlocks = effectiveWeeks.map(computeWeek);
    const isMultiWeek = effectiveWeeks.length > 1;

    // ملخص إجمالي عبر الأسابيع المختارة (للوضع متعدد الأسابيع).
    const summaryMap: Record<string, { id: string; name: string; role: 'teacher' | 'admin'; roleLabel: string; quota: number; total: number }> = {};
    weekBlocks.forEach(b => b.rows.forEach(r => {
      if (!summaryMap[r.id]) summaryMap[r.id] = { id: r.id, name: r.name, role: r.role, roleLabel: r.roleLabel, quota: r.quota, total: 0 };
      summaryMap[r.id].total += r.totalAssigned;
    }));
    const summaryRows = Object.values(summaryMap).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ar'));
    const totalAssignedInScope = summaryRows.reduce((sum, r) => sum + r.total, 0);
    const hasAnyRows = weekBlocks.some(b => b.rows.length > 0);

    // شارة رقم الأسبوع الدائرية (نفس تصميم القائمة) — تُستعمل في حقل الاختيار وتحت العنوان.
    const weekNumberBadge = (n: number) => (
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 text-[11px] font-black text-[#655ac1] shrink-0">{n}</span>
    );
    const selectedWeeksLabel: React.ReactNode = effectiveWeeks.length === 0
      ? undefined
      : effectiveWeeks.length === 1
        ? (
          <span className="flex items-center gap-1.5 overflow-hidden">
            <span className="font-black text-slate-800 shrink-0">الأسبوع</span>
            {weekNumberBadge(effectiveWeeks[0].number)}
            <span className="font-bold text-slate-500 truncate">— {getArabicDayFromDate(effectiveWeeks[0].start)} {fmtNumericDate(effectiveWeeks[0].start)} ← {getArabicDayFromDate(effectiveWeeks[0].end)} {fmtNumericDate(effectiveWeeks[0].end)}</span>
          </span>
        )
        : rptSelectedWeekNumbers.size === academicWeeks.length
          ? `كل الأسابيع (${academicWeeks.length})`
          : (
            <span className="flex items-center gap-1.5 overflow-hidden">
              <span className="font-black text-slate-800 shrink-0">الأسابيع</span>
              {effectiveWeeks.map(w => <React.Fragment key={w.number}>{weekNumberBadge(w.number)}</React.Fragment>)}
            </span>
          );

    // خيارات قائمة الأسابيع (بنمط اختيار الأسبوع في إرسال المناوبة: «الأسبوع» + شارة الرقم + التاريخ رقمًا أسفله).
    const weekDropdownOptions: RptOption[] = academicWeeks.map(w => ({
      value: String(w.number),
      search: `الأسبوع ${w.number} ${getArabicDayFromDate(w.start)} ${getArabicDayFromDate(w.end)} ${fmtNumericDate(w.start)} ${fmtNumericDate(w.end)} ${w.start} ${w.end}`,
      label: (
        <span className="flex flex-col items-start min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-black text-slate-800">الأسبوع</span>
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 text-[11px] font-black text-[#655ac1]">{w.number}</span>
            {autoWeek?.number === w.number && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">الحالي</span>}
            {w.hasHoliday && <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">إجازة</span>}
          </span>
          <span className="text-[12px] font-bold text-slate-500 mt-1 truncate max-w-full">
            {getArabicDayFromDate(w.start)} {fmtNumericDate(w.start)} ← {getArabicDayFromDate(w.end)} {fmtNumericDate(w.end)}
          </span>
        </span>
      ),
    }));

    // خيارات قائمة المنتظرين (الاسم بالأعلى وصفته بالأسفل باللون البنفسجي؛ الإداري بمسماه الفعلي).
    const staffDropdownOptions: RptOption[] = allWaitingStaff.map(s => {
      const roleLabel = s.role === 'teacher' ? 'معلم' : (admins.find(a => a.id === s.id)?.role || 'إداري');
      return {
        value: s.id,
        search: `${s.name} ${roleLabel}`,
        label: (
          <span className="flex flex-col items-start min-w-0">
            <span className="font-black truncate text-slate-800">{s.name}</span>
            <span className="text-[11px] font-black text-[#655ac1] mt-0.5">{roleLabel}</span>
          </span>
        ),
      };
    });
    const staffSummary = rptSelectedIds.size === 0
      ? 'كل المنتظرين'
      : `${rptSelectedIds.size} منتظر محدد`;

    const printWaitingReport = () => {
      if (effectiveWeeks.length === 0) return;
      const todayStr = getTodayStr();
      const weekTableHtml = (block: typeof weekBlocks[number]) => {
        const headerCells = block.dayHeaders.map(d => `<th class="day-head">${escapeHtml(d.day)}${d.isHoliday ? ' <span class="hol-dot">●</span>' : ''}</th>`).join('');
        const bodyRows = block.rows.map((row, index) => {
          const dayCells = block.dayHeaders.map(d => {
            if (d.isHoliday) return `<td class="day-cell"><span class="day-holiday">إجازة</span></td>`;
            const cells = (row.dayPeriods[d.date] || []).slice().sort((a, b) => a.period - b.period);
            return `<td class="day-cell">${cells.length ? cells.map(c => `<span class="day-num">ح${c.period}${c.className ? ` – ${escapeHtml(c.className)}` : ''}</span>`).join('') : '<span class="day-empty">·</span>'}</td>`;
          }).join('');
          return `
            <tr>
              <td><span class="seq-num">${index + 1}</span></td>
              <td style="text-align:right;font-weight:900">${escapeHtml(row.name)}</td>
              <td><span class="role-cell">${escapeHtml(row.roleLabel)}</span></td>
              <td><span class="plain purple">${row.quota || '—'}</span></td>
              <td><span class="plain amber">${row.totalAssigned}</span></td>
              ${dayCells}
            </tr>
          `;
        }).join('');
        const weekHead = `الأسبوع ${block.week.number} — من ${getArabicDayFromDate(block.week.start)} ${formatDateLabel(block.week.start)} إلى ${getArabicDayFromDate(block.week.end)} ${formatDateLabel(block.week.end)}`;
        return `<div class="week-block">
          <div class="week-range">${escapeHtml(weekHead)}${block.week.hasHoliday ? ' — <span style="color:#dc2626">يحتوي إجازة</span>' : ''}</div>
          <table>
            <thead>
              <tr>
                <th rowspan="2" style="width:34px">م</th>
                <th rowspan="2" style="text-align:right">المنتظر</th>
                <th rowspan="2" style="width:70px">الصفة</th>
                <th rowspan="2" style="width:66px">نصاب الانتظار</th>
                <th rowspan="2" style="width:64px">المُسند</th>
                <th colspan="${block.dayHeaders.length}">أيام وحصص الإسناد</th>
              </tr>
              <tr>${headerCells}</tr>
            </thead>
            <tbody>${bodyRows || `<tr><td colspan="${5 + block.dayHeaders.length}">لا توجد بيانات</td></tr>`}</tbody>
          </table>
        </div>`;
      };
      openWaitingPrintableHtml(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>تقرير الانتظار الأسبوعي</title><style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
        @page { size: A4 portrait; margin: 12mm; }
        * { box-sizing: border-box; }
        body { margin:0; direction:rtl; font-family:'Tajawal',Arial,sans-serif; color:#1e293b; background:white; }
        .official-header { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; align-items:start; border-bottom:2px solid #1e293b; padding-bottom:12px; margin-bottom:14px; }
        .header-side { font-size:11px; font-weight:800; line-height:1.7; }
        .header-center { text-align:center; }
        .header-left { text-align:left; }
        .logo-placeholder { width:52px; height:52px; border:2px solid #cbd5e1; border-radius:50%; margin:0 auto 4px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:10px; font-weight:900; }
        h1 { margin:0; font-size:18px; font-weight:900; }
        .title { text-align:center; font-size:18px; font-weight:900; margin:12px 0 10px; }
        .week-block { margin-bottom:18px; page-break-inside:avoid; }
        .week-range { text-align:center; font-size:12px; font-weight:900; color:#1e293b; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:8px 12px; margin-bottom:8px; }
        .week-range.summary { background:#f0edff; border-color:#d8d2f5; color:#655ac1; }
        table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:12px; }
        th,td { border:1px solid #cbd5e1; padding:8px; text-align:center; vertical-align:middle; }
        th { background:#a59bf0; color:#fff; font-weight:900; }
        tbody tr:nth-child(even) td { background:#f8fafc; }
        .seq-num { color:#94a3b8; font-size:12px; font-weight:800; }
        .plain { font-size:13px; font-weight:900; }
        .purple { color:#655ac1; }
        .amber { color:#d97706; }
        .role-cell { font-size:12px; font-weight:900; color:#475569; }
        .day-head { width:54px; font-size:11px; border-left:1px solid #e2e8f0 !important; border-right:1px solid #e2e8f0 !important; }
        .day-cell { text-align:center; padding:6px 4px; border-left:1px solid #e2e8f0 !important; border-right:1px solid #e2e8f0 !important; }
        .day-num { display:block; color:#655ac1; font-size:11px; font-weight:900; white-space:nowrap; line-height:1.5; }
        .day-empty { color:#cbd5e1; font-size:13px; font-weight:800; }
        .day-holiday { display:inline-block; font-size:10px; font-weight:900; color:#dc2626; background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:3px 6px; }
        .hol-dot { color:#dc2626; font-size:10px; }
        .footer { margin-top:28px; display:flex; justify-content:space-between; gap:24px; font-size:12px; font-weight:900; padding:0 24px; }
        .signature { width:40%; text-align:right; }
        .role-label { color:#1e293b; }
        .signature-name { margin-top:4px; color:#475569; font-weight:800; }
        .line { margin-top:26px; border-top:1px solid #94a3b8; padding-top:6px; color:#475569; }
        @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } th { background:#a59bf0 !important; color:#fff !important; } }
      </style></head><body><section class="page">
        <div class="official-header">
          <div class="header-side">
            <div>الإدارة العامة للتعليم</div>
            <div>${escapeHtml(schoolInfo.region || schoolInfo.educationAdministration || '')}</div>
            <div>المدرسة: ${escapeHtml(schoolInfo.schoolName || 'اسم المدرسة')}</div>
          </div>
          <div class="header-center">
            ${schoolInfo.logo ? `<img src="${schoolInfo.logo}" style="width:52px;height:52px;object-fit:contain;margin-bottom:4px" />` : '<div class="logo-placeholder">شعار</div>'}
            <h1>${escapeHtml(schoolInfo.schoolName || '')}</h1>
          </div>
          <div class="header-side header-left">
            <div>${escapeHtml(activeSemester?.name || '')}</div>
            <div>تاريخ الطباعة: ${escapeHtml(formatDateLabel(todayStr))}</div>
          </div>
        </div>
        <div class="title">تقرير الانتظار${isMultiWeek ? '' : ' الأسبوعي'}</div>
        ${weekBlocks.map(weekTableHtml).join('')}
        <div class="footer">
          <div class="signature">
            <div class="role-label">وكيل الشؤون التعليمية</div>
            <div class="signature-name">${escapeHtml(schoolInfo.educationalAgent || '')}</div>
            <div class="line">التوقيع</div>
          </div>
          <div class="signature">
            <div class="role-label">مدير المدرسة</div>
            <div class="signature-name">${escapeHtml(schoolInfo.principal || '')}</div>
            <div class="line">التوقيع</div>
          </div>
        </div>
      </section><script>document.fonts.ready.then(() => window.print()); setTimeout(() => window.print(), 1200);</script></body></html>`);
      showToast('تم فتح تقرير الانتظار للطباعة', 'success');
    };

    // جدول أسبوع واحد بنمط جدول بيانات المعلمين (مع عمود الصفة).
    const renderReportTable = (block: typeof weekBlocks[number]) => {
      if (block.rows.length === 0) {
        return <div className="px-6 py-10 text-center text-sm font-bold text-slate-400">لا توجد إسنادات انتظار في هذا الأسبوع.</div>;
      }
      return (
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full table-fixed text-right border-separate border-spacing-0">
            <thead>
              <tr>
                <th rowSpan={2} className="sticky top-0 z-20 bg-slate-50 px-3 h-[34px] pb-2.5 text-center text-xs font-black text-[#655ac1] w-14 align-bottom border-b border-slate-100">م</th>
                <th rowSpan={2} className="sticky top-0 z-20 bg-slate-50 px-3 h-[34px] pb-2.5 text-xs font-black text-[#655ac1] min-w-[150px] w-[22%] align-bottom border-b border-slate-100">المنتظر</th>
                <th rowSpan={2} className="sticky top-0 z-20 bg-slate-50 px-3 h-[34px] pb-2.5 text-center text-xs font-black text-[#655ac1] w-28 align-bottom border-b border-slate-100">الصفة</th>
                <th rowSpan={2} className="sticky top-0 z-20 bg-slate-50 px-3 h-[34px] pb-2.5 text-center text-xs font-black text-[#655ac1] whitespace-nowrap w-28 align-bottom border-b border-slate-100">نصاب الانتظار</th>
                <th rowSpan={2} className="sticky top-0 z-20 bg-slate-50 px-3 h-[34px] pb-2.5 text-center text-xs font-black text-[#655ac1] w-20 align-bottom border-b border-slate-100">المُسند</th>
                <th colSpan={block.dayHeaders.length} className="sticky top-0 z-20 bg-slate-50 px-3 h-[34px] pb-1.5 text-center text-xs font-black text-[#655ac1] align-bottom border-b border-slate-100 border-r-2 border-r-slate-300">أيام وحصص الإسناد</th>
              </tr>
              <tr>
                {block.dayHeaders.map((d, i) => (
                  <th
                    key={d.date}
                    className={`sticky top-[34px] z-20 bg-slate-50 px-1 pb-2.5 pt-1.5 text-[11px] font-black text-center align-bottom border-b border-slate-100 ${i === 0 ? 'border-r-2 border-r-slate-300' : 'border-r border-slate-200'} ${i === block.dayHeaders.length - 1 ? 'border-l border-slate-100' : ''} ${d.isHoliday ? 'text-rose-500' : 'text-[#655ac1]'}`}
                  >
                    {d.day}
                    {d.isHoliday && <span className="block text-[9px] font-black text-rose-500 mt-0.5">إجازة</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-[#e5e1fe]/10 transition-colors group">
                  <td className="px-3 py-3 text-center border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 inline-flex items-center justify-center rounded-full">{index + 1}</span>
                  </td>
                  <td className="px-3 py-3 font-bold text-slate-700 truncate border-b border-slate-50">
                    <span className="text-sm group-hover:text-[#655ac1] transition-colors">{row.name}</span>
                  </td>
                  <td className="px-3 py-3 text-center border-b border-slate-50">
                    <span className="inline-flex items-center justify-center text-xs font-black text-slate-600">{row.roleLabel}</span>
                  </td>
                  <td className="px-3 py-3 text-center text-sm font-black text-[#655ac1] border-b border-slate-50">{row.quota || '—'}</td>
                  <td className="px-3 py-3 text-center text-sm font-black text-amber-600 border-b border-slate-50">{row.totalAssigned}</td>
                  {block.dayHeaders.map((d, i) => {
                    const cells = (row.dayPeriods[d.date] || []).slice().sort((a, b) => a.period - b.period);
                    return (
                      <td key={d.date} className={`px-1 py-3 text-center align-middle border-b border-slate-50 ${i === 0 ? 'border-r-2 border-r-slate-300' : 'border-r border-slate-200'} ${i === block.dayHeaders.length - 1 ? 'border-l border-slate-100' : ''}`}>
                        {d.isHoliday ? (
                          <span className="inline-block text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1 leading-tight">إجازة</span>
                        ) : cells.length === 0 ? (
                          <span className="text-slate-300 text-xs">·</span>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            {cells.map((c, ci) => (
                              <span key={ci} className="text-[#655ac1] text-[11px] font-black whitespace-nowrap">
                                ح{c.period}{c.className ? ` – ${c.className}` : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    return (
      <div className="space-y-5 pb-20" dir="rtl">
        {toast && ReactDOM.createPortal(
          <div
            style={{ top: '82px', left: '50%', transform: 'translateX(-50%)' }}
            className={`fixed z-[99999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border min-w-[320px] max-w-[90vw] ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              toast.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
              toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                         'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-100' :
              toast.type === 'error'   ? 'bg-red-100' :
              toast.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
            }`}>
              {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-600" />}
              {toast.type === 'error'   && <AlertCircle  size={20} className="text-red-600" />}
              {toast.type === 'warning' && <AlertTriangle size={20} className="text-amber-600" />}
              {toast.type === 'info'    && <Info          size={20} className="text-blue-600" />}
            </div>
            <p className="font-bold text-sm flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0">
              <X size={16} className="opacity-50" />
            </button>
          </div>,
          document.body
        )}

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <FileText size={23} className="text-[#655ac1] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <h2 className="font-black text-slate-800 text-lg">تقارير الانتظار</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-6">
                  تقرير أسبوعي بحصص الانتظار التي أُسندت للمنتظرين خلال الأسبوع الدراسي المختار.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {calendarReady && (
                <button
                  type="button"
                  onClick={printWaitingReport}
                  disabled={!hasAnyRows}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#655ac1] text-white text-[13px] font-black shadow-sm hover:bg-[#5046a0] transition-all disabled:opacity-50"
                >
                  <Printer size={15} />
                  طباعة التقرير
                </button>
              )}
            </div>
          </div>
        </div>

        {!calendarReady ? (
          <div className="bg-white rounded-[2rem] border border-amber-200 shadow-sm p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 text-amber-600 mb-4">
              <CalendarClock size={28} />
            </div>
            <h3 className="font-black text-slate-800 text-base mb-2">اضبط التقويم الدراسي ليظهر التقرير بشكل صحيح</h3>
            <p className="text-sm font-bold text-slate-500 leading-7 max-w-lg mx-auto">
              تقارير الانتظار تعتمد على الأسابيع الدراسية من التقويم الدراسي للمدرسة. يمكنك ضبطه من خلال بطاقة التقويم الدراسي في الصفحة الرئيسية، ثم العودة هنا.
            </p>
          </div>
        ) : (
        <>
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <ReportMultiSelect
              label="الأسبوع الدراسي"
              buttonLabel="اختر الأسبوع الدراسي"
              summary={selectedWeeksLabel}
              options={weekDropdownOptions}
              selected={new Set(Array.from(rptSelectedWeekNumbers).map(String))}
              onToggle={v => {
                const num = Number(v);
                setRptSelectedWeekNumbers(prev => { const next = new Set(prev); if (next.has(num)) next.delete(num); else next.add(num); return next; });
              }}
              onSelectAll={() => setRptSelectedWeekNumbers(new Set(academicWeeks.map(w => w.number)))}
              onClear={() => setRptSelectedWeekNumbers(new Set())}
              searchable
              searchPlaceholder="ابحث برقم الأسبوع أو التاريخ..."
            />
            <ReportMultiSelect
              label="اختر المنتظر"
              buttonLabel="كل المنتظرين"
              summary={staffSummary}
              options={staffDropdownOptions}
              selected={rptSelectedIds}
              onToggle={v => setRptSelectedIds(prev => { const next = new Set(prev); if (next.has(v)) next.delete(v); else next.add(v); return next; })}
              onSelectAll={() => setRptSelectedIds(new Set(allWaitingStaff.map(s => s.id)))}
              onClear={() => setRptSelectedIds(new Set())}
              searchable
              searchPlaceholder="ابحث عن منتظر بالاسم..."
            />
          </div>
          {effectiveWeeks.some(w => w.hasHoliday) && (
            <p className="mt-3 text-[11px] font-black text-rose-600 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              يحتوي أسبوع مختار إجازة — قد ينخفض إسناد الانتظار في ذلك اليوم.
            </p>
          )}
        </div>

        {effectiveWeeks.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm px-6 py-12 text-center text-sm font-bold text-slate-400">
            اختر أسبوعًا دراسيًا واحدًا أو أكثر لعرض التقرير.
          </div>
        ) : !hasAnyRows ? (
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm px-6 py-12 text-center text-sm font-bold text-slate-400">
            لا توجد إسنادات انتظار في {isMultiWeek ? 'الأسابيع المختارة' : 'هذا الأسبوع'}.
          </div>
        ) : (
          <>
            {weekBlocks.map(block => (
              <div key={block.week.number} className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 bg-white">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-black text-slate-800 flex items-center gap-2 shrink-0">
                      <Users size={18} className="text-[#655ac1]" />
                      تقرير المنتظرين في الأسبوع
                    </p>
                    <div className="flex-1" />
                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={embTableSearch}
                        onChange={e => setEmbTableSearch(e.target.value)}
                        placeholder="ابحث..."
                        className="w-full pr-8 pl-7 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#655ac1] transition-all"
                        dir="rtl"
                      />
                      {embTableSearch && (
                        <button type="button" onClick={() => setEmbTableSearch('')} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-black text-[#655ac1] bg-white border border-slate-300 rounded-full pr-3 pl-3 py-1">
                      <CalendarClock size={13} />
                      <span>الأسبوع</span>
                      {weekNumberBadge(block.week.number)}
                      <span>— {getArabicDayFromDate(block.week.start)} {fmtNumericDate(block.week.start)} ← {getArabicDayFromDate(block.week.end)} {fmtNumericDate(block.week.end)}</span>
                    </span>
                    {block.week.hasHoliday && (
                      <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">يحتوي إجازة</span>
                    )}
                  </div>
                </div>
                {renderReportTable(block)}
              </div>
            ))}
          </>
        )}
        </>
        )}
      </div>
    );
  }

  if (isBalance) {
    const weekDates: string[] = [];
    {
      const startD = new Date(`${waitingWeekRange.start}T00:00:00`);
      for (let i = 0; i < 5; i++) {
        const d = new Date(startD);
        d.setDate(startD.getDate() + i);
        weekDates.push(toLocalISODate(d));
      }
    }
    type BalanceCell = { period: number; className: string };
    const perTeacherDayPeriods: Record<string, Record<string, BalanceCell[]>> = {};
    const assignedNameById: Record<string, string> = {};
    sessions.forEach(s => {
      if (!weekDates.includes(s.date)) return;
      s.assignments.forEach(a => {
        if (isWaitingSlotDisabled(a.absentTeacherId, a.periodNumber)) return;
        assignedNameById[a.substituteTeacherId] = a.substituteTeacherName;
        if (!perTeacherDayPeriods[a.substituteTeacherId]) perTeacherDayPeriods[a.substituteTeacherId] = {};
        if (!perTeacherDayPeriods[a.substituteTeacherId][s.date]) perTeacherDayPeriods[a.substituteTeacherId][s.date] = [];
        perTeacherDayPeriods[a.substituteTeacherId][s.date].push({ period: a.periodNumber, className: a.className || '' });
      });
    });
    const buildAssignmentDays = (teacherId: string): { date: string; day: string; count: number; cells: BalanceCell[] }[] => {
      const map = perTeacherDayPeriods[teacherId] || {};
      return weekDates
        .filter(d => (map[d] || []).length > 0)
        .map(d => {
          const cells = [...map[d]].sort((a, b) => a.period - b.period);
          return { date: d, day: getArabicDayFromDate(d), count: cells.length, cells };
        });
    };

    // الصفوف: المعلمون أصحاب نصاب الانتظار + أي شخص (إداري) أُسند له فعليًا هذا الأسبوع.
    const balanceIds = new Set<string>();
    teachers.forEach(t => { if (getTeacherWaitingQuota(t) > 0) balanceIds.add(t.id); });
    Object.keys(weeklyQuota.counts).forEach(id => { if ((weeklyQuota.counts[id] || 0) > 0) balanceIds.add(id); });
    Object.keys(perTeacherDayPeriods).forEach(id => balanceIds.add(id));
    const balanceRows = Array.from(balanceIds)
      .map(id => {
        const teacher = teachers.find(t => t.id === id);
        const admin = admins.find(a => a.id === id);
        const person = teacher || admin;
        const name = person?.name || assignedNameById[id] || '';
        const quota = teacher ? getTeacherWaitingQuota(teacher) : (admin?.waitingQuota || 0);
        const assigned = weeklyQuota.counts[id] || 0;
        const balance = quota - assigned;
        const pct = quota > 0 ? assigned / quota : (assigned > 0 ? 1 : 0);
        const assignmentDays = buildAssignmentDays(id);
        return { teacher: { id, name } as { id: string; name: string }, quota, assigned, balance, pct, assignmentDays };
      })
      .sort((a, b) => b.assigned - a.assigned || a.balance - b.balance || a.teacher.name.localeCompare(b.teacher.name, 'ar'));
    const totalAssigned = balanceRows.reduce((sum, row) => sum + row.assigned, 0);
    // الأكثر إسنادًا: عدد الإسناد المطلق (نتجنّبه). الأقل إسنادًا: من لا يزال لديه رصيد (نسند له).
    const mostAssigned = balanceRows
      .filter(row => row.assigned > 0)
      .sort((a, b) => b.assigned - a.assigned || a.teacher.name.localeCompare(b.teacher.name, 'ar'))
      .slice(0, 5);
    const leastAssigned = balanceRows
      .filter(row => row.quota > 0 && row.balance > 0)
      .sort((a, b) => a.assigned - b.assigned || b.balance - a.balance || a.teacher.name.localeCompare(b.teacher.name, 'ar'))
      .slice(0, 5);
    const balanceSearch = embTableSearch.trim();
    const filteredBalanceRows = balanceRows.filter(row => !balanceSearch || row.teacher.name.includes(balanceSearch));

    const printWaitingBalance = () => {
      const today = getTodayStr();
      const dayCellsHtml = (row: typeof balanceRows[number]) => weekDates.map(d => {
        const cells = (row.assignmentDays.find(ad => ad.date === d)?.cells) || [];
        return `<td class="day-cell">${cells.length ? cells.map(c => `<span class="day-num">ح${c.period}${c.className ? ` – ${escapeHtml(c.className)}` : ''}</span>`).join('') : '<span class="day-empty">·</span>'}</td>`;
      }).join('');
      const rows = balanceRows.map((row, index) => `
        <tr>
          <td><span class="seq-num">${index + 1}</span></td>
          <td style="text-align:right;font-weight:900">${escapeHtml(row.teacher.name)}</td>
          <td><span class="plain purple">${row.quota}</span></td>
          <td><span class="plain amber">${row.assigned}</span></td>
          <td><span class="plain ${row.balance <= 0 ? 'red' : 'green'}">${row.balance}</span></td>
          ${dayCellsHtml(row)}
        </tr>
      `).join('');
      const dayHeadersHtml = weekDates.map(d => `<th class="day-head">${escapeHtml(getArabicDayFromDate(d))}</th>`).join('');
      const weekRangeText = `${waitingWeekRange.number ? `الأسبوع ${waitingWeekRange.number} ` : ''}من ${getArabicDayFromDate(waitingWeekRange.start)} الموافق ${fmtNumericDate(waitingWeekRange.start)} إلى ${getArabicDayFromDate(waitingWeekRange.end)} الموافق ${fmtNumericDate(waitingWeekRange.end)}`;
      openWaitingPrintableHtml(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>رصيد الانتظار</title><style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
        @page { size: A4 portrait; margin: 12mm; }
        * { box-sizing: border-box; }
        body { margin:0; direction:rtl; font-family:'Tajawal',Arial,sans-serif; color:#1e293b; background:white; }
        .page { padding: 0; }
        .official-header { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; align-items:start; border-bottom:2px solid #1e293b; padding-bottom:12px; margin-bottom:14px; }
        .header-side { font-size:11px; font-weight:800; line-height:1.7; }
        .header-center { text-align:center; }
        .header-left { text-align:left; }
        .logo-placeholder { width:52px; height:52px; border:2px solid #cbd5e1; border-radius:50%; margin:0 auto 4px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:10px; font-weight:900; }
        h1 { margin:0; font-size:18px; font-weight:900; }
        .title { text-align:center; font-size:18px; font-weight:900; margin:12px 0 6px; }
        .meta { text-align:center; color:#64748b; font-size:11px; font-weight:800; margin-bottom:14px; }
        .stats { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:14px; }
        .stat { border:1px solid #cbd5e1; border-radius:10px; padding:9px; text-align:center; }
        .stat b { display:block; font-size:18px; color:#655ac1; }
        .stat span { font-size:10px; color:#64748b; font-weight:900; }
        table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:12px; }
        th,td { border:1px solid #cbd5e1; padding:8px; text-align:center; vertical-align:middle; }
        th { background:#a59bf0; color:#fff; font-weight:900; }
        tbody tr:nth-child(even) td { background:#f8fafc; }
        .seq-num { color:#94a3b8; font-size:12px; font-weight:800; }
        .plain { font-size:13px; font-weight:900; }
        .purple { color:#655ac1; }
        .amber { color:#d97706; }
        .green { color:#059669; }
        .red { color:#dc2626; }
        .rank-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
        .rank-card { border:1px solid #e2e8f0; border-radius:14px; overflow:hidden; }
        .rank-title { padding:8px 10px; border-bottom:1px solid #f1f5f9; background:#f8fafc; font-size:11px; font-weight:900; }
        .rank-body { padding:8px; }
        .rank-row { display:flex; align-items:center; gap:8px; border:1px solid #cbd5e1; border-radius:12px; padding:6px 8px; margin-bottom:6px; background:#fff; }
        .rank-row:last-child { margin-bottom:0; }
        .rank-name { flex:1; text-align:right; font-weight:900; color:#1e293b; }
        .rank-pill { display:inline-flex; align-items:center; justify-content:center; min-width:52px; border:1px solid #cbd5e1; border-radius:999px; padding:4px 10px; font-size:12px; font-weight:900; }
        .slash { color:#cbd5e1; margin:0 4px; }
        .empty-rank { text-align:center; color:#94a3b8; font-size:11px; font-weight:800; padding:12px; }
        .week-range { text-align:center; font-size:12px; font-weight:900; color:#1e293b; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:8px 12px; margin-bottom:14px; }
        .day-head { width:54px; font-size:11px; border-left:1px solid #e2e8f0 !important; border-right:1px solid #e2e8f0 !important; }
        .day-head:first-of-type { border-right:1px solid #cbd5e1 !important; }
        .day-cell { text-align:center; padding:6px 4px; border-left:1px solid #e2e8f0 !important; border-right:1px solid #e2e8f0 !important; }
        .day-num { display:block; color:#655ac1; font-size:11px; font-weight:900; white-space:nowrap; line-height:1.5; }
        .day-empty { color:#cbd5e1; font-size:13px; font-weight:800; }
        .footer { margin-top:28px; display:flex; justify-content:space-between; gap:24px; font-size:12px; font-weight:900; padding:0 24px; }
        .signature { width:40%; }
        .signature.left { text-align:right; }
        .signature.right { text-align:right; }
        .role-label { color:#1e293b; }
        .signature-name { margin-top:4px; color:#475569; font-weight:800; }
        .line { margin-top:26px; border-top:1px solid #94a3b8; padding-top:6px; color:#475569; }
        @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } th { background:#a59bf0 !important; color:#fff !important; } }
      </style></head><body><section class="page">
        <div class="official-header">
          <div class="header-side">
            <div>الإدارة العامة للتعليم</div>
            <div>${escapeHtml(schoolInfo.region || schoolInfo.educationAdministration || '')}</div>
            <div>المدرسة: ${escapeHtml(schoolInfo.schoolName || 'اسم المدرسة')}</div>
          </div>
          <div class="header-center">
            ${schoolInfo.logo ? `<img src="${schoolInfo.logo}" style="width:52px;height:52px;object-fit:contain;margin-bottom:4px" />` : '<div class="logo-placeholder">شعار</div>'}
            <h1>${escapeHtml(schoolInfo.schoolName || '')}</h1>
          </div>
          <div class="header-side header-left">
            <div>تاريخ الطباعة: ${escapeHtml(formatHijri(today))}</div>
            <div>الموافق: ${escapeHtml(formatGregorian(today))}</div>
          </div>
        </div>
        <div class="title">رصيد الانتظار الأسبوعي</div>
        <div class="week-range">${escapeHtml(weekRangeText)}</div>
        <div class="stats">
          <div class="stat"><b>${balanceRows.length}</b><span>إجمالي المنتظرين</span></div>
          <div class="stat"><b>${totalAssigned}</b><span>إجمالي الانتظار المسند</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width:34px">م</th>
              <th rowspan="2" style="text-align:right">المنتظر</th>
              <th rowspan="2" style="width:66px">نصاب الانتظار</th>
              <th rowspan="2" style="width:72px">المُسند</th>
              <th rowspan="2" style="width:78px">المتبقي</th>
              <th colspan="5">أيام وحصص الإسناد</th>
            </tr>
            <tr>${dayHeadersHtml}</tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="${5 + weekDates.length}">لا توجد بيانات رصيد انتظار</td></tr>`}</tbody>
        </table>
        <div class="footer">
          <div class="signature right">
            <div class="role-label">وكيل الشؤون التعليمية</div>
            <div class="signature-name">${escapeHtml(schoolInfo.educationalAgent || '')}</div>
            <div class="line">التوقيع</div>
          </div>
          <div class="signature left">
            <div class="role-label">مدير المدرسة</div>
            <div class="signature-name">${escapeHtml(schoolInfo.principal || '')}</div>
            <div class="line">التوقيع</div>
          </div>
        </div>
      </section><script>document.fonts.ready.then(() => window.print()); setTimeout(() => window.print(), 1200);</script></body></html>`);
      showToast('تم فتح رصيد الانتظار للطباعة', 'success');
    };

    return (
      <div className="space-y-5 pb-20" dir="rtl">
        {toast && ReactDOM.createPortal(
          <div
            style={{ top: '82px', left: '50%', transform: 'translateX(-50%)' }}
            className={`fixed z-[99999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border min-w-[320px] max-w-[90vw] ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              toast.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
              toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                         'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-100' :
              toast.type === 'error'   ? 'bg-red-100' :
              toast.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
            }`}>
              {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-600" />}
              {toast.type === 'error'   && <AlertCircle  size={20} className="text-red-600" />}
              {toast.type === 'warning' && <AlertTriangle size={20} className="text-amber-600" />}
              {toast.type === 'info'    && <Info          size={20} className="text-blue-600" />}
            </div>
            <p className="font-bold text-sm flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0">
              <X size={16} className="opacity-50" />
            </button>
          </div>,
          document.body
        )}

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <Scale size={22} className="text-[#655ac1] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <h2 className="font-black text-slate-800 text-lg">رصيد الانتظار الأسبوعي</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  متابعة نصاب المنتظرين أسبوعيًا مع إمكانية إعادة ضبط للإسناد.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'إجمالي المنتظرين', value: balanceRows.length, icon: Users, color: 'text-[#655ac1]' },
            { label: 'إجمالي الانتظار المسند', value: totalAssigned, icon: CheckCircle2, color: 'text-emerald-700' },
          ].map((stat, index) => (
            <div key={index} className="bg-white border border-slate-200 rounded-2xl px-4 py-5 flex items-start gap-3 shadow-sm">
              <div className="flex items-center justify-center shrink-0 text-[#655ac1]">
                <stat.icon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-400 leading-none">{stat.label}</p>
                <p className={`mt-1 font-black text-xl leading-none ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-black text-slate-500 ml-3">
              <CalendarClock size={18} className="text-[#655ac1]" />
              {waitingWeekRange.number != null && (
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="font-black text-sm">الأسبوع</span>
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 text-[11px] font-black text-[#655ac1]">{waitingWeekRange.number}</span>
                </span>
              )}
              <span>
                من {getArabicDayFromDate(waitingWeekRange.start)} الموافق {fmtNumericDate(waitingWeekRange.start)} ← {getArabicDayFromDate(waitingWeekRange.end)} الموافق {fmtNumericDate(waitingWeekRange.end)}
              </span>
            </div>
            <div className="flex-1" />
            <button
              type="button"
              onClick={printWaitingBalance}
              disabled={balanceRows.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white transition-all disabled:opacity-50"
            >
              <Printer size={15} />
              طباعة رصيد الانتظار
            </button>
            <button
              type="button"
              onClick={() => setShowBalanceResetConfirm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-black hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white transition-all"
            >
              <RefreshCw size={15} />
              إعادة ضبط الإسناد
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {[
            { title: 'الأكثر إسنادًا', rows: mostAssigned, tone: 'rose' },
            { title: 'الأقل إسنادًا', rows: leastAssigned, tone: 'emerald' },
          ].map(section => (
            <div key={section.title} className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                <p className={`text-sm font-black ${section.tone === 'rose' ? 'text-rose-700' : 'text-emerald-700'}`}>{section.title}</p>
              </div>
              <div className="p-2">
                {section.rows.length === 0 ? (
                  <p className="text-center text-xs font-bold text-slate-400 py-5">لا توجد بيانات</p>
                ) : section.rows.map((row, index) => (
                  <div key={row.teacher.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 flex items-center justify-center rounded-full shrink-0">{index + 1}</span>
                    <span className="text-sm font-black text-slate-800 truncate flex-1">{row.teacher.name}</span>
                    <span className="inline-flex items-center justify-center gap-0.5 min-w-14 px-3 py-1 rounded-full border border-slate-200 text-xs font-black text-slate-800 shrink-0">
                      <span className={section.tone === 'rose' ? 'text-rose-600' : 'text-emerald-600'}>{Math.min(row.assigned, row.quota)}</span>
                      <span className="text-slate-400">/</span>
                      {row.quota}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-white flex flex-wrap items-center gap-3">
            <p className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Scale size={18} className="text-[#655ac1]" />
              رصيد الانتظار
            </p>
            <div className="flex-1" />
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={embTableSearch}
                onChange={e => setEmbTableSearch(e.target.value)}
                placeholder="ابحث..."
                className="w-full pr-8 pl-7 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#655ac1] transition-all"
                dir="rtl"
              />
              {embTableSearch && (
                <button type="button" onClick={() => setEmbTableSearch('')} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
          {filteredBalanceRows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm font-bold text-slate-400">
              لا توجد بيانات رصيد انتظار مطابقة.
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full table-fixed text-right border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th rowSpan={2} className="sticky top-0 z-20 bg-slate-50 px-3 h-[34px] pb-2.5 text-center text-xs font-black text-[#655ac1] w-14 align-bottom border-b border-slate-100">م</th>
                    <th rowSpan={2} className="sticky top-0 z-20 bg-slate-50 px-3 h-[34px] pb-2.5 text-xs font-black text-[#655ac1] min-w-[160px] w-[20%] align-bottom border-b border-slate-100">المنتظر</th>
                    <th rowSpan={2} className="sticky top-0 z-20 bg-slate-50 px-3 h-[34px] pb-2.5 text-center text-xs font-black text-[#655ac1] whitespace-nowrap w-28 align-bottom border-b border-slate-100">نصاب الانتظار</th>
                    <th rowSpan={2} className="sticky top-0 z-20 bg-slate-50 px-3 h-[34px] pb-2.5 text-center text-xs font-black text-[#655ac1] whitespace-nowrap w-24 align-bottom border-b border-slate-100">المُسند</th>
                    <th rowSpan={2} className="sticky top-0 z-20 bg-slate-50 px-3 h-[34px] pb-2.5 text-center text-xs font-black text-[#655ac1] whitespace-nowrap w-24 align-bottom border-b border-slate-100">المتبقي</th>
                    <th colSpan={5} className="sticky top-0 z-20 bg-slate-50 px-3 h-[34px] pb-1.5 text-center text-xs font-black text-[#655ac1] align-bottom border-b border-slate-100 border-r-2 border-r-slate-300">أيام وحصص الإسناد</th>
                  </tr>
                  <tr>
                    {weekDates.map((d, i) => (
                      <th
                        key={d}
                        className={`sticky top-[34px] z-20 bg-slate-50 px-1 pb-2.5 pt-1.5 text-[11px] font-black text-[#655ac1] text-center align-bottom border-b border-slate-100 ${i === 0 ? 'border-r-2 border-r-slate-300' : 'border-r border-slate-200'} ${i === weekDates.length - 1 ? 'border-l border-slate-100' : ''}`}
                      >
                        {getArabicDayFromDate(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBalanceRows.map((row, index) => (
                    <tr key={row.teacher.id} className="hover:bg-[#e5e1fe]/10 transition-colors group">
                      <td className="px-3 py-3 text-center border-b border-slate-50">
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 inline-flex items-center justify-center rounded-full">{index + 1}</span>
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-700 truncate border-b border-slate-50">
                        <span className="text-sm group-hover:text-[#655ac1] transition-colors">{row.teacher.name}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-sm font-black text-[#655ac1] border-b border-slate-50">{row.quota}</td>
                      <td className="px-3 py-3 text-center text-sm font-black text-amber-600 border-b border-slate-50">{row.assigned}</td>
                      <td className={`px-3 py-3 text-center text-sm font-black border-b border-slate-50 ${row.balance <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{row.balance}</td>
                      {weekDates.map((d, i) => {
                        const cells = (row.assignmentDays.find(ad => ad.date === d)?.cells) || [];
                        return (
                          <td
                            key={d}
                            className={`px-1 py-3 text-center align-middle border-b border-slate-50 ${i === 0 ? 'border-r-2 border-r-slate-300' : 'border-r border-slate-200'} ${i === weekDates.length - 1 ? 'border-l border-slate-100' : ''}`}
                          >
                            {cells.length === 0 ? (
                              <span className="text-slate-300 text-xs">·</span>
                            ) : (
                              <div className="flex flex-col items-center gap-0.5">
                                {cells.map((c, ci) => (
                                  <span key={ci} className="text-[#655ac1] text-[11px] font-black whitespace-nowrap">
                                    ح{c.period}{c.className ? ` – ${c.className}` : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showBalanceResetConfirm && ReactDOM.createPortal(
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
            dir="rtl"
            onClick={() => setShowBalanceResetConfirm(false)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-7 pt-7 pb-4">
                <Trash2 size={24} className="text-rose-500 shrink-0" />
                <div>
                  <h3 className="font-black text-slate-800 text-base">إعادة ضبط الإسناد</h3>
                </div>
              </div>
              <p className="px-7 pb-5 text-sm text-slate-600 font-medium leading-7">
                سيُحذف كل ما هو <span className="font-black text-slate-800">مُسند</span> للمنتظرين في رصيد هذا الأسبوع ويعود الرصيد فارغًا للبدء من جديد.
                <span className="block mt-2 text-[13px] text-slate-500">يبقى سجل الإسناد محفوظًا في <span className="font-black text-[#655ac1]">تقارير الانتظار</span> للرجوع إليه لاحقًا.</span>
              </p>
              <div className="flex gap-2 px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setShowBalanceResetConfirm(false)}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWeeklyQuota({ weekKey: waitingWeekRange.weekKey, counts: {}, lastResetDate: getTodayStr() });
                    setShowBalanceResetConfirm(false);
                    showToast('تمت إعادة ضبط رصيد الانتظار مع حفظ سجل الإسناد للتقارير', 'success');
                  }}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={15} /> نعم، إعادة الضبط
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // ===== Render =====
  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {/* ── Auto-distribution loading overlay ── */}
      {isAutoDistributing && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100000] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
          <LoadingLogo size="lg" />
          <p className="text-base font-bold text-[#655ac1]">جاري التوزيع الآلي للانتظار...</p>
        </div>,
        document.body
      )}
      {/* ── Toast ── */}
      {toast && ReactDOM.createPortal(
        <div
          style={{ top: '82px', left: '50%', transform: 'translateX(-50%)' }}
          className={`fixed z-[99999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border min-w-[320px] max-w-[90vw] ${
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            toast.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
            toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                       'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-100' :
            toast.type === 'error'   ? 'bg-red-100' :
            toast.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
          }`}>
            {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-600" />}
            {toast.type === 'error'   && <AlertCircle  size={20} className="text-red-600" />}
            {toast.type === 'warning' && <AlertTriangle size={20} className="text-amber-600" />}
            {toast.type === 'info'    && <Info          size={20} className="text-blue-600" />}
          </div>
          <p className="font-bold text-sm flex-1 leading-relaxed">{toast.message}</p>
          <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0">
            <X size={16} className="opacity-50" />
          </button>
        </div>,
        document.body
      )}

      {/* ── New-week reset prompt (custom modal) ── */}
      {/* ── Past-week editing banner (non-intrusive, dismissible) ── */}
      {weekRelation === 'past' && !pastBannerDismissed[selectedDate] && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex items-start gap-3 text-amber-900">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed font-medium flex-1">
            أنت تعدّل أسبوعًا سابقًا — ستنعكس التعديلات على تقارير ذلك الأسبوع فقط، ولن يتأثر رصيد الأسبوع الحالي.
          </p>
          <button
            onClick={() => dismissPastBanner(selectedDate)}
            className="p-1 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors shrink-0"
            aria-label="إغلاق التنبيه"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ══════ Header Card ══════ */}
      {!isEmbedded && (
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
        {/* Decorative corner accent */}

        <div className="relative z-10">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <UserX size={36} strokeWidth={1.8} className="text-[#655ac1]" />
            الانتظار اليومي
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12">
            إسناد حصص الانتظار اليومية توزيعًا يدويًا أو تلقائيًا بطريقة ذكية وعادلة
          </p>
        </div>
      </div>
      )}

      {/* ══════ Embedded UI: Date bar + Teachers table + Distribution method card ══════ */}
      {isEmbedded && !isPrintSend && !isSend && (() => {
        const lowerSearch = embTableSearch.trim().toLowerCase();
        const tableTeachers = teachers
          .filter(t => {
            if (lowerSearch && !(t.name || '').toLowerCase().includes(lowerSearch)) return false;
            // المعلم المسجَّل غائبًا ينتقل لبطاقة الغائبين ولا يظهر في القائمة.
            if (absentTeacherIds.has(t.id)) return false;
            return true;
          })
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

        const subjectNameOf = (sid?: string) => {
          if (!sid) return '—';
          return subjects.find(s => s.id === sid)?.name || '—';
        };

        const showMethodCard = totalAbsent > 0;
        const absentRecords = currentSession?.absentTeachers || [];

        return (
          <div className="space-y-4 mb-6">
            {/* Date Picker Bar + Teachers Table — register section only */}
            {isRegister && (<>
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
              <div className="w-72">
                <label className="block text-xs font-black text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#655ac1]" />
                  تاريخ الغياب
                </label>
                <DatePicker
                  value={new DateObject({ date: selectedDate, calendar: gregorian, format: 'YYYY-MM-DD' }).convert(
                    embCalendarType === 'hijri' ? arabic : gregorian,
                    embCalendarType === 'hijri' ? arabic_ar : gregorian_ar,
                  )}
                  onChange={(d: any) => {
                    if (d instanceof DateObject) {
                      const greg = d.convert(gregorian, gregorian_en);
                      setSelectedDate(greg.format('YYYY-MM-DD'));
                    }
                  }}
                  calendar={embCalendarType === 'hijri' ? arabic : gregorian}
                  locale={embCalendarType === 'hijri' ? arabic_ar : gregorian_ar}
                  containerClassName="w-full"
                  inputClass="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors cursor-pointer bg-white"
                  placeholder="حدد التاريخ"
                  portal
                  portalTarget={document.body}
                  editable={false}
                  zIndex={99999}
                  format="dddd - YYYY/MM/DD"
                />
              </div>
            </div>

            {/* Master-Detail: قائمة المعلمين (يمين) + بطاقة الغائبين (يسار) */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 items-start">

              {/* ══ RIGHT: Teachers picker list ══ */}
              <div className="lg:col-span-3 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Users size={20} className="text-[#655ac1]" />
                    <h4 className="font-black text-slate-800">المعلمون</h4>
                    <span className="inline-flex items-center justify-center px-2.5 h-6 rounded-full border border-slate-200 bg-white text-[#655ac1] text-xs font-black">
                      {teachers.length - totalAbsent}
                    </span>
                  </div>
                  <div className="relative flex-1 min-w-[160px]">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={embTableSearch}
                      onChange={e => setEmbTableSearch(e.target.value)}
                      placeholder="ابحث"
                      className="w-full h-10 pr-10 pl-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-200 focus:border-slate-300 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="max-h-[560px] overflow-y-auto custom-scrollbar divide-y divide-slate-50">
                  {tableTeachers.length === 0 && (
                    <div className="text-center text-slate-400 font-medium py-16 text-sm">لا توجد نتائج</div>
                  )}
                  {tableTeachers.map(t => {
                    const specialty = specializations.find(s => s.id === t.specializationId)?.name
                      || subjectNameOf(t.assignedSubjectId);
                    const teachingCount = getTeacherDaySchedule(t.id, dayKey).length;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTeacherAbsenceInline(t, 'full')}
                        className="group w-full flex items-center gap-3 px-4 py-3 text-right bg-white hover:bg-slate-50 transition-colors"
                      >
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 text-slate-300 group-hover:border-[#655ac1] group-hover:text-[#655ac1] bg-white shrink-0 transition-all">
                          <Plus size={12} strokeWidth={3} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-black text-sm truncate text-slate-800" title={t.name}>{t.name}</span>
                          <span className="block text-[12px] font-bold text-slate-400 truncate" title={specialty}>{specialty}</span>
                        </span>
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full border border-slate-200 text-[11px] font-black shrink-0 ${teachingCount === 0 ? 'text-amber-500' : 'text-slate-500'}`}>
                          {teachingCount === 0 ? 'لا حصص اليوم' : `${teachingCount} حصص`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ══ LEFT: Absentees detail ══ */}
              <div className="lg:col-span-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserX size={20} className="text-[#655ac1] shrink-0" />
                    <h4 className="font-black text-slate-800 truncate">الغائبون اليوم</h4>
                    <span className={`inline-flex items-center justify-center px-2.5 h-6 rounded-full border border-slate-200 bg-white text-xs font-black shrink-0 ${
                      totalAbsent > 0 ? 'text-[#655ac1]' : 'text-slate-400'
                    }`}>
                      {totalAbsent}
                    </span>
                  </div>
                  {totalAbsent > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClearAllAbsentsConfirm(true)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-rose-600 text-xs font-black hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-95 shrink-0"
                    >
                      <Trash2 size={14} />
                      <span>حذف الكل</span>
                    </button>
                  )}
                </div>

                {absentRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-20 px-6">
                    <UserX size={40} className="text-slate-200 mb-3" strokeWidth={1.6} />
                    <p className="text-sm font-black text-slate-500">لا يوجد غائبون بعد</p>
                    <p className="text-xs font-medium text-slate-400 mt-1">اختر معلمًا من القائمة لتسجيله غائبًا</p>
                  </div>
                ) : (
                  <div className="max-h-[560px] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                    {absentRecords.map(rec => {
                      const t = teachers.find(x => x.id === rec.teacherId);
                      const type = rec.absenceType;
                      const selPeriods = new Set(rec.periods.map(p => p.periodNumber));
                      const daySchedule = getTeacherDaySchedule(rec.teacherId, dayKey);
                      const specialty = (t && specializations.find(s => s.id === t.specializationId)?.name)
                        || (t ? subjectNameOf(t.assignedSubjectId) : '—');
                      const totalAbsentPeriods = type === 'full' ? daySchedule.length : selPeriods.size;
                      return (
                        <div key={rec.id} className="px-4 py-4 space-y-3">
                          {/* Absentee header row: name + small toggle + remove */}
                          <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-black text-slate-800 text-sm truncate" title={rec.teacherName}>{rec.teacherName}</p>
                              <p className="text-[12px] font-medium text-slate-400 truncate" title={specialty}>
                                {specialty}{totalAbsentPeriods > 0 ? ` · ${totalAbsentPeriods} حصص` : ''}
                              </p>
                            </div>
                            <div className="inline-flex gap-0.5 bg-slate-50 p-0.5 rounded-lg shrink-0">
                              {([
                                { id: 'full', label: 'يوم كامل' },
                                { id: 'partial', label: 'جزئي' },
                              ] as const).map(opt => {
                                const active = type === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                      if (!t) return;
                                      if (opt.id === 'full') setTeacherAbsenceInline(t, 'full');
                                      else setTeacherAbsenceInline(t, 'partial', []);
                                    }}
                                    className={`px-6 py-1.5 rounded-md text-xs font-bold transition-all ${
                                      active ? 'bg-white text-[#655ac1] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => t && setTeacherAbsenceInline(t, 'none')}
                              className="w-7 h-7 inline-flex items-center justify-center rounded-full border border-slate-300 text-rose-500 hover:bg-rose-50 hover:border-rose-300 transition-all shrink-0"
                              title="إزالة من الغائبين"
                            >
                              <X size={13} strokeWidth={2.5} />
                            </button>
                          </div>

                            {type === 'partial' && daySchedule.length > 0 && selPeriods.size === 0 && (
                              <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                                <AlertCircle size={12} className="shrink-0" />
                                انقر على الحصة المراد تأمينها لتحديدها
                              </p>
                            )}

                            {daySchedule.length === 0 ? (
                              <p className="text-xs font-bold text-amber-500 text-center py-2">لا توجد حصص لهذا المعلم في هذا اليوم</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {daySchedule.map(p => {
                                  const clickable = type === 'partial';
                                  const checked = type === 'partial' && selPeriods.has(p.periodNumber);
                                  return (
                                    <button
                                      key={p.periodNumber}
                                      type="button"
                                      disabled={!clickable}
                                      onClick={() => t && clickable && toggleEmbPartialPeriod(t, p.periodNumber)}
                                      title={`${p.subjectName || ''} ${p.className ? '· ' + p.className : ''}`.trim()}
                                      className={`relative flex flex-col items-center justify-center w-[64px] py-1 rounded-lg border text-center transition-all ${
                                        checked
                                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                                          : 'bg-white border-slate-300 text-slate-600'
                                      } ${clickable ? 'cursor-pointer hover:border-emerald-300' : 'cursor-default'}`}
                                    >
                                      {checked && (
                                        <span className="absolute -top-1.5 -left-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white ring-2 ring-white">
                                          <Check size={10} strokeWidth={4} />
                                        </span>
                                      )}
                                      <span className="text-[11px] font-black leading-none">الحصة {p.periodNumber}</span>
                                      <span className={`text-[11px] font-bold leading-tight mt-0.5 truncate max-w-[56px] ${checked ? 'text-emerald-600' : 'text-slate-500'}`}>
                                        {p.className || p.subjectName || ''}
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

                {/* CTA: الانتقال لتوزيع الانتظار */}
                {totalAbsent > 0 && onGoToDistribute && (
                  <div className="p-4 border-t border-slate-100 flex justify-center">
                    <button
                      type="button"
                      onClick={() => onGoToDistribute()}
                      className="inline-flex items-center justify-center gap-2 px-10 py-2.5 rounded-xl bg-[#655ac1] hover:bg-[#655ac1] text-white text-sm font-bold shadow-md shadow-[#655ac1]/20 transition-transform active:scale-95"
                    >
                      <span>التالي: توزيع الانتظار</span>
                      <ArrowLeft size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            </>)}

            {/* Distribution action bar — distribute section only */}
            {isDistribute && showMethodCard && (
              <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm px-5 py-5" dir="rtl">
                {/* Title + chips + description (right) and actions (left, vertically centered) */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 shrink-0">
                        <Shuffle size={20} className="text-[#655ac1]" />
                        <p className="text-sm font-black text-slate-800">توزيع الانتظار</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-500">
                          الإجمالي <span className="font-black text-slate-700">{totalPeriods}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-500">
                          مُسند <span className="font-black text-emerald-600">{totalAssigned}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-500">
                          متبقٍّ <span className={`font-black ${totalPending > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{totalPending}</span>
                        </span>
                      </div>
                    </div>
                    <p className="mt-4 text-[12px] font-bold text-slate-400">
                      وزّع حصص الانتظار آليًا بنقرة ويمكنك التعديل لاحقًا، أو أسندها يدويًا مباشرةً للمنتظرين
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap ml-4">
                    <button
                      onClick={() => requestAutoDistribution()}
                      className="inline-flex items-center justify-center gap-2 min-w-40 px-7 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black shadow-sm transition-all active:scale-95 hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1]"
                    >
                      <Zap size={17} />
                      <span>توزيع آلي</span>
                    </button>
                    {totalAssigned > 0 && (
                      <button
                        onClick={() => setShowClearAllConfirm(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-black active:scale-95 transition-all hover:bg-slate-50"
                      >
                        <Trash2 size={16} className="text-rose-600" />
                        <span>حذف كل المنتظرين</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Distribution report mini-bar — distribute section only */}
            {false && isDistribute && lastDistResult && (
              <button
                onClick={() => setShowDistReport(true)}
                className="w-full bg-white rounded-2xl border border-slate-200 hover:border-[#8779fb] shadow-sm p-4 flex items-center gap-3 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  lastDistResult.failed > 0 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <PieChart size={20} />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-sm font-black text-slate-800">تقرير توزيع الانتظار</p>
                  <p className="text-xs text-slate-500 font-medium">
                    تم إسناد <span className="text-emerald-600 font-bold">{lastDistResult.assigned}</span>
                    {lastDistResult.failed > 0 && (
                      <> · تعذّر إسناد <span className="text-rose-500 font-bold">{lastDistResult.failed}</span></>
                    )}
                  </p>
                </div>
                <ArrowRight size={18} className="text-slate-300 rotate-180" />
              </button>
            )}
          </div>
        );
      })()}

      {/* ══════ Primary Toolbar (legacy — hidden in embedded mode; replaced by inline table + cards below) ══════ */}
      {!isEmbedded && (
      <div className="flex flex-col gap-3 mb-6">
        {/* Tier 1: Primary CTA + زرا التوزيع */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setAbsenceForm({ teacherId: '', absenceType: 'full', selectedPeriods: new Set() });
              setTeacherSearch('');
              setAbsentQueue([]);
              setShowSubmitConfirm(false);
              setShowAbsenceModal(true);
            }}
            className="flex items-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 transition-all hover:scale-105 active:scale-95"
          >
            <UserX size={20} />
            تسجيل غياب معلم
          </button>

          <div className="w-px h-8 bg-slate-200 rounded-full shrink-0" />

          <button
            onClick={() => {
              if (!currentSession || currentSession.absentTeachers.length === 0) {
                showToast('سجّل غياب معلم أولاً قبل التوزيع اليدوي', 'warning');
                return;
              }
              if (manualDistMode) {
                setManualDistMode(false);
                setDistributionMode(null);
                return;
              }
              startManualDistribution();
            }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all border ${
              manualDistMode
                ? 'bg-white text-slate-700 border-[#8779fb]'
                : 'bg-white hover:bg-white text-slate-700 border-slate-200 hover:border-[#8779fb]'
            }`}
          >
            <PenLine size={18} className="text-[#655ac1]" />
            <span>توزيع الانتظار يدويًا</span>
          </button>

          <button
            onClick={() => {
              if (!currentSession || currentSession.absentTeachers.length === 0) {
                showToast('سجّل غياب معلم أولاً قبل التوزيع التلقائي', 'warning');
                return;
              }
              requestAutoDistribution();
            }}
            className={`flex items-center gap-2 bg-white hover:bg-white text-slate-700 border border-slate-200 px-4 py-3 rounded-xl font-bold transition-all hover:border-[#8779fb] ${lastDistResult ? 'border-emerald-300' : ''}`}
          >
            <Zap size={18} className="text-[#8779fb]" />
            <span>توزيع الانتظار تلقائيًا</span>
          </button>
        </div>

        {/* Tier 2: Secondary actions bar — hidden when embedded (actions migrated to tabs) */}
        {!isEmbedded && (
        <div className="flex justify-between items-center bg-white/60 backdrop-blur-md rounded-2xl py-3 px-4 shadow-sm border border-slate-200">

          {/* Right group: تقرير التوزيع اليومي | طباعة الانتظار */}
          <div className="flex gap-2">
            <button
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border relative ${
                lastDistResult
                  ? 'bg-white hover:bg-white text-slate-700 border-slate-200 hover:border-[#8779fb]'
                  : 'bg-white text-slate-300 border-slate-100 cursor-not-allowed'
              }`}
              onClick={() => { if (lastDistResult) setShowDistReport(true); }}
              disabled={!lastDistResult}
              title={!lastDistResult ? 'لا يوجد تقرير توزيع بعد' : 'عرض تقرير توزيع الانتظار'}
            >
              <PieChart size={18} className={lastDistResult ? 'text-[#8779fb]' : 'text-slate-300'} />
              <span>تقرير التوزيع اليومي</span>
              {lastDistResult && (
                <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 text-white text-[9px] font-black rounded-full flex items-center justify-center ${
                  lastDistResult.failed > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}>
                  {lastDistResult.failed > 0 ? lastDistResult.failed : lastDistResult.assigned}
                </span>
              )}
            </button>

            <button
              className="flex items-center gap-2 bg-white hover:bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb]"
              onClick={() => setShowPrintModal(true)}
            >
              <Printer size={18} className="text-[#655ac1]" />
              <span>طباعة الانتظار</span>
            </button>
          </div>

          {/* Left group: إرسال الانتظار | رصيد الانتظار | تقارير الانتظار */}
          <div className="flex gap-2">
            <button
              className="flex items-center gap-2 bg-white hover:bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb] relative"
              onClick={() => { setShowSendTable(true); setShowSendModal(true); }}
            >
              <Send size={18} className="text-[#655ac1]" />
              <span>إرسال الانتظار</span>
              {currentSession && currentSession.assignments.filter(a => a.status === 'pending').length > 0 && (
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-emerald-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {currentSession.assignments.filter(a => a.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              className="flex items-center gap-2 bg-white hover:bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb]"
              onClick={() => { setResetConfirmStep('idle'); setShowBalanceModal(true); }}
            >
              <Scale size={18} className="text-[#655ac1]" />
              <span>رصيد الانتظار</span>
            </button>

            <button
              className="flex items-center gap-2 bg-white hover:bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb]"
              onClick={() => setShowReportsModal(true)}
            >
              <FileText size={18} className="text-[#655ac1]" />
              <span>تقارير الانتظار</span>
            </button>
          </div>
        </div>
        )}

      </div>
      )}

      {/* ══════ Distribution Report Modal ══════ */}
      {showDistReport && lastDistResult && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={() => setShowDistReport(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden" dir="rtl" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 flex items-center justify-center text-rose-500">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">تقرير توزيع الانتظار</h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    <span className="text-rose-500 font-bold">{lastDistResult.failed} حصة تعذّر إسنادها</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowDistReport(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Summary stat cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'تم إسناده', value: lastDistResult.assigned, cls: 'text-emerald-700' },
                  { label: 'تعذّر إسناده', value: lastDistResult.failed, cls: 'text-rose-600' },
                  { label: 'إجمالي المنتظرين', value: Object.keys(lastDistResult.teacherLoad).length, cls: 'text-[#655ac1]' },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center p-4 rounded-2xl bg-slate-100 border border-slate-200">
                    <span className={`text-3xl font-black ${s.cls}`}>{s.value}</span>
                    <span className="text-[11px] font-bold text-slate-500 mt-1 text-center">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Failed details */}
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                <h4 className="text-xs font-black text-rose-700 mb-4 flex items-center gap-2">
                  <AlertCircle size={14} /> حصص تعذّر إسنادها
                </h4>
                <div className="space-y-4">
                  {(() => {
                    const failedDetails = lastDistResult.details.filter(d => !d.assignedTo);
                    const groups: Record<string, typeof failedDetails> = {};
                    failedDetails.forEach(d => {
                      const key = d.absentTeacherName || '—';
                      if (!groups[key]) groups[key] = [];
                      groups[key].push(d);
                    });
                    return Object.entries(groups).map(([teacherName, items]) => (
                      <div key={teacherName}>
                        <p className="text-xs font-black text-rose-800 mb-2 flex items-center gap-1.5">
                          <UserX size={12} /> {teacherName}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pr-2">
                          {items.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white border border-rose-200 rounded-xl px-3 py-1.5 text-xs">
                              <span className="w-5 h-5 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center font-black text-[10px]">{d.periodNumber}</span>
                              <span className="font-bold text-slate-700">{d.className}</span>
                              {d.reason && <span className="text-rose-500">{d.reason}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══════ Print/Send inline (printsend section only) ══════ */}
      {(isPrintSend || isSend) && (
        <div className="space-y-5">
          {isSend && (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-5">
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setShowWaitingReceipt(true)} className={actionButtonClass(false)}>
                  <ClipboardList size={17} />
                  سجل استلام التكليف بالانتظار
                </button>
                <button type="button" onClick={onOpenMessagesArchive} disabled={!onOpenMessagesArchive}
                  className={`${actionButtonClass(false)} disabled:opacity-50 disabled:cursor-not-allowed`}>
                  <Archive size={17} />
                  أرشيف الرسائل
                </button>
              </div>
            </div>
          )}

          {isPrintSend && waitingTaskMode === 'print' && (
          <div className="space-y-5">
            <div className="px-1">
              <h3 className="font-black text-slate-800 text-lg">الطباعة</h3>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)] gap-5 items-stretch">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-start gap-3 mb-2">
              <Printer size={20} className="text-[#655ac1]" />
              <h4 className="font-black text-slate-800">طباعة الانتظار اليومي</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium text-right mb-5">
              اختر المطلوب طباعته ( انتظار اليوم - انتظار محدد ) ثم اختر اللون ثم طباعة.
            </p>
            <div className="flex flex-wrap items-end gap-4 mb-5">
              <WaitingSingleSelect
                label="نوع الانتظار"
                value={waitingPrintScope}
                onChange={value => setWaitingPrintScope(value as 'all' | 'teacher')}
                placeholder="اختر المطلوب طباعته"
                options={[
                  { value: 'all', label: 'انتظار اليوم' },
                  { value: 'teacher', label: 'انتظار محدد' },
                ]}
              />
              {waitingPrintScope === 'teacher' && (
                <WaitingMultiSelect
                  label="المعلمون الغائبون"
                  values={selectedPrintTeacherIds}
                  onToggle={id => setSelectedPrintTeacherIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                  placeholder="اختر المعلمين"
                  options={(currentSession?.absentTeachers || []).map(absent => ({ value: absent.id, label: absent.teacherName }))}
                />
              )}
              <WaitingSingleSelect
                label="اللون"
                value={waitingPrintColorMode}
                onChange={value => setWaitingPrintColorMode(value as typeof waitingPrintColorMode)}
                placeholder="اختر اللون"
                options={[
                  { value: 'color', label: 'ملون' },
                  { value: 'bw', label: 'أسود وأبيض' },
                ]}
              />
            </div>
            {waitingPrintScope === 'teacher' && selectedPrintTeacherIds.length > 0 && selectedPrintTeacherIds.length >= (currentSession?.absentTeachers?.length || 0) && (
              <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1 -mt-3 mb-4">
                <AlertCircle size={12} className="shrink-0" />
                لا يمكن اختيار كل المعلمين — استخدم «انتظار اليوم» لطباعة الانتظار كاملًا.
              </p>
            )}
            <div className="mt-auto flex justify-center">
              <button
                type="button"
                onClick={() => openWaitingPrint(waitingPrintScope === 'teacher' ? selectedPrintTeacherIds : null, 'print')}
                disabled={totalAssigned === 0 || (waitingPrintScope === 'teacher' && (selectedPrintTeacherIds.length === 0 || selectedPrintTeacherIds.length >= (currentSession?.absentTeachers?.length || 0)))}
                className="inline-flex min-w-[160px] items-center justify-center gap-2 px-10 py-2.5 rounded-xl border border-[#655ac1] bg-[#655ac1] text-white text-sm font-black hover:bg-[#5046a0] transition-all shadow-md shadow-[#655ac1]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer size={16} />
                طباعة
              </button>
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-start gap-3 mb-2">
              <ClipboardList size={20} className="text-[#655ac1]" />
              <h4 className="font-black text-slate-800">نموذج الانتظار اليومي مفرّغ</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium text-right mb-5">
              طباعة نموذج الانتظار اليومي مفرغ للتعبئة اليدوية.
            </p>
            <div className="flex flex-wrap items-end gap-4 mb-5">
              <div className="hidden">
                <label className="block text-xs font-black text-slate-500 mb-2">عدد الجداول</label>
                <input
                  type="number"
                  min={3}
                  max={3}
                  value={3}
                  readOnly
                  className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl outline-none"
                />
              </div>
              <WaitingSingleSelect
                label="اللون"
                value={blankPrintColorMode}
                onChange={value => setBlankPrintColorMode(value as typeof blankPrintColorMode)}
                placeholder="اختر اللون"
                options={[
                  { value: 'color', label: 'ملون' },
                  { value: 'bw', label: 'أسود وأبيض' },
                ]}
              />
            </div>
            <div className="mt-auto flex justify-center">
              <button
                type="button"
                onClick={() => openWaitingPrint(null, 'blank')}
                className="inline-flex min-w-[160px] items-center justify-center gap-2 px-10 py-2.5 rounded-xl border border-[#655ac1] bg-[#655ac1] text-white text-sm font-black hover:bg-[#5046a0] transition-all shadow-md shadow-[#655ac1]/20"
              >
                <Printer size={16} />
                طباعة النموذج
              </button>
            </div>
          </div>
            </div>
          </div>
          )}

          {waitingTaskMode === 'send' && (() => {
            const filteredSendRows = sendAbsentFilterId
              ? sendRows.filter(r => r.asgn.absentTeacherId === sendAbsentFilterId)
              : sendRows;
            const filteredSelected = filteredSendRows.filter(r => sendSelectedIds.has(r.key));
            const sampleRow = filteredSelected[0] || filteredSendRows[0];
            return (
            <div className="space-y-4">
              <div className="px-1">
                <h3 className="font-black text-slate-800 text-lg">إرسال</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {/* ─── LEFT CARD : اختر نوع الإشعار والمستلمين ─── */}
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-start gap-3 mb-2">
                    <ClipboardCheck size={20} className="text-[#655ac1]" />
                    <h4 className="font-black text-slate-800">اختر نوع الإشعار والمستلمين</h4>
                  </div>
                  <p className="text-xs text-slate-500 font-medium text-right mb-5">
                    اختر نوع الإشعار أولاً ثم اختر المعلم الغائب ثم حدد المنتظرين.
                  </p>
                  <div className="space-y-4">
                    <WaitingSingleSelect
                      label="نوع الإشعار"
                      value={sendModalMode}
                      onChange={value => { setSendModalMode(value as 'notification' | 'electronic'); setSendCustomMessages({}); }}
                      placeholder="اختر نوع الإشعار"
                      options={[
                        { value: 'electronic', label: 'تكليف بالانتظار مع توقيع الكتروني' },
                        { value: 'notification', label: 'تكليف نصي بالانتظار' },
                      ]}
                    />
                    <WaitingSingleSelect
                      label="المعلم الغائب"
                      value={sendAbsentFilterId}
                      onChange={value => setSendAbsentFilterId(value)}
                      placeholder="كل المعلمين الغائبين"
                      options={[
                        { value: '', label: 'كل المعلمين الغائبين' },
                        ...((currentSession?.absentTeachers || []).map(absent => ({ value: absent.id, label: absent.teacherName }))),
                      ]}
                    />
                    <WaitingRecipientsMultiSelect
                      rows={filteredSendRows}
                      selectedIds={sendSelectedIds}
                      open={sendRecipientsDropdownOpen}
                      setOpen={setSendRecipientsDropdownOpen}
                      onToggle={key => setSendSelectedIds(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; })}
                      onSelectAll={() => setSendSelectedIds(new Set(filteredSendRows.map(r => r.key)))}
                      onClear={() => setSendSelectedIds(prev => { const n = new Set(prev); filteredSendRows.forEach(r => n.delete(r.key)); return n; })}
                    />
                  </div>
                </div>

                {/* ─── RIGHT COLUMN : 3 cards ─── */}
                <div className="space-y-4">
                  {/* طريقة الإرسال المفضلة */}
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-start gap-3 mb-4">
                      <Wallet size={20} className="text-[#655ac1]" />
                      <h4 className="font-black text-slate-800">طريقة الإرسال المفضلة</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSendPreferredChannel('whatsapp')}
                        className={`relative flex items-center gap-3 px-4 py-3 border-2 rounded-xl bg-white transition-all ${sendPreferredChannel === 'whatsapp' ? 'border-slate-200 bg-slate-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <span className={sendPreferredChannel === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-300'}>
                          <WhatsAppIcon size={24} />
                        </span>
                        <span className={`font-black text-sm ${sendPreferredChannel === 'whatsapp' ? 'text-[#1d9e4b]' : 'text-slate-400'}`}>واتساب</span>
                        {sendPreferredChannel === 'whatsapp' && (
                          <span className="absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#25D366] text-white shadow-sm">
                            <Check size={12} strokeWidth={3.5} />
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSendPreferredChannel('sms')}
                        className={`relative flex items-center gap-3 px-4 py-3 border-2 rounded-xl bg-white transition-all ${sendPreferredChannel === 'sms' ? 'border-slate-200 bg-slate-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <span className={sendPreferredChannel === 'sms' ? 'text-[#007AFF]' : 'text-slate-300'}>
                          <MessageSquare size={24} />
                        </span>
                        <span className={`font-black text-sm ${sendPreferredChannel === 'sms' ? 'text-[#007AFF]' : 'text-slate-400'}`}>النصية SMS</span>
                        {sendPreferredChannel === 'sms' && (
                          <span className="absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#007AFF] text-white shadow-sm">
                            <Check size={12} strokeWidth={3.5} />
                          </span>
                        )}
                      </button>
                    </div>
                    {sendPreferredChannel === 'whatsapp' && (
                      <label className={`relative mt-4 flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-colors border ${
                        sendFallbackToSms ? 'border-[#655ac1]/40' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={sendFallbackToSms}
                          onChange={e => setSendFallbackToSms(e.target.checked)}
                        />
                        <div className={`relative flex items-center w-11 h-6 shrink-0 rounded-full transition-colors ${sendFallbackToSms ? 'bg-[#655ac1]' : 'bg-slate-300'}`}>
                          <div className={`absolute w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${sendFallbackToSms ? 'right-1' : 'left-1'}`} />
                        </div>
                        <div className="select-none leading-relaxed">
                          <p className={`text-[13px] font-black ${sendFallbackToSms ? 'text-[#655ac1]' : 'text-slate-700'}`}>
                            تحويل تلقائي للرسائل النصية عند تعذّر الواتساب
                          </p>
                          <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                            لو لم تصل رسالة الواتساب للمستلم تُرسل له رسالة نصية لضمان وصول الرسالة
                          </p>
                        </div>
                      </label>
                    )}
                  </div>

                  {/* نص الرسالة + المعاينة */}
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <MessageSquare size={20} className="text-[#655ac1]" />
                        <h4 className="font-black text-slate-800">نص الرسالة</h4>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {sendModalMode === 'electronic' && (
                          <button
                            type="button"
                            onClick={() => {
                              const first = filteredSelected[0] || filteredSendRows[0];
                              if (!first) { showToast('لا توجد حصص انتظار لمعاينتها', 'warning'); return; }
                              setPreviewAssignment(first.asgn);
                              setHasSignature(false);
                              setShowElectronicPreview(true);
                            }}
                            disabled={!sampleRow}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Eye size={14} />
                            معاينة التكليف
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowSendRecipientsModal(true)}
                          disabled={filteredSelected.length === 0}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Users size={14} />
                          معاينة المستلمين ({filteredSelected.length})
                        </button>
                        <button
                          type="button"
                          title="استعادة النص الافتراضي"
                          onClick={() => { setSendCustomMessages({}); setSendMasterTemplate(''); showToast('تمت استعادة النص الافتراضي', 'success'); }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all"
                        >
                          <RefreshCw size={14} className="text-[#655ac1]" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={sendMasterTemplate || sampleRow?.message || ''}
                      onChange={e => {
                        setSendMasterTemplate(e.target.value);
                        const next: Record<string, string> = { ...sendCustomMessages };
                        filteredSendRows.forEach(r => { next[r.key] = e.target.value; });
                        setSendCustomMessages(next);
                      }}
                      rows={5}
                      className="w-full border-2 border-slate-100 rounded-xl p-4 outline-none focus:border-[#655ac1] resize-none text-sm leading-relaxed transition-colors mb-2"
                      placeholder="نص الرسالة..."
                      dir="rtl"
                    />
                    <p className="text-[10px] text-slate-400 font-bold mb-4">يتم تخصيص الرسالة لكل مستلم تلقائياً عند الإرسال</p>
                    <MessagePreviewInline
                      previewText={(sendMasterTemplate || sampleRow?.message || '').split(RECIPIENT_NAME_TOKEN).join(sampleRow?.asgn?.substituteTeacherName || 'مستلم تجريبي')}
                      recipientName={sampleRow?.asgn?.substituteTeacherName}
                      disabled={filteredSelected.length === 0 || !(sendMasterTemplate || sampleRow?.message || '').trim()}
                      className="mt-0 mb-4"
                    />

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarClock size={16} className="text-[#655ac1]" />
                          <span className="text-sm font-black text-slate-700">جدولة الإرسال لوقت لاحق</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSendScheduleEnabled(v => !v)}
                          className={`relative inline-flex w-10 h-6 rounded-full transition-all ${sendScheduleEnabled ? 'bg-[#655ac1]' : 'bg-slate-300'}`}
                          role="switch"
                          aria-checked={sendScheduleEnabled}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${sendScheduleEnabled ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                      {sendScheduleEnabled && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[30px]">
                              <label className="text-xs font-black text-slate-500">التاريخ</label>
                            </div>
                            <DatePicker
                              value={sendScheduleDate ? new DateObject({ date: new Date(`${sendScheduleDate}T12:00:00`), calendar: gregorian }).convert(sendScheduleCalendarType === 'hijri' ? arabic : gregorian) : undefined}
                              onChange={(d: any) => {
                                const iso = d ? (d as DateObject).convert(gregorian).format('YYYY-MM-DD') : '';
                                setSendScheduleDate(iso);
                                if (iso && sendScheduleTime) setSendScheduledAt(`${iso}T${sendScheduleTime}`);
                                else setSendScheduledAt('');
                              }}
                              calendar={sendScheduleCalendarType === 'hijri' ? arabic : gregorian}
                              locale={sendScheduleCalendarType === 'hijri' ? arabic_ar : gregorian_ar}
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
                              onChange={e => {
                                const t = e.target.value;
                                setSendScheduleTime(t);
                                if (sendScheduleDate && t) setSendScheduledAt(`${sendScheduleDate}T${t}`);
                                else setSendScheduledAt('');
                              }}
                              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => sendWaitingBulk(sendPreferredChannel)}
                      disabled={filteredSelected.length === 0}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#655ac1] text-white font-black shadow-md shadow-[#655ac1]/20 hover:bg-[#5046a0] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={16} />
                      إرسال عبر {sendPreferredChannel === 'whatsapp' ? 'واتساب' : 'الرسائل النصية'}
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── Recipients Preview Modal (shared, unified) ─── */}
              <RecipientsPreviewModal
                open={showSendRecipientsModal}
                onClose={() => setShowSendRecipientsModal(false)}
                recipients={filteredSelected.map(row => ({
                  id: row.key,
                  name: row.asgn.substituteTeacherName,
                  subtitle: `بدلاً من ${row.asgn.absentTeacherName}`,
                  role: 'teacher' as const,
                  phone: row.asgn.substitutePhone || undefined,
                  classLabel: `${row.asgn.className} · الحصة ${row.asgn.periodNumber}`,
                }))}
              />

              {showWaitingSendResults && waitingSendResults.length > 0 && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4 animate-in fade-in" dir="rtl" onClick={() => setShowWaitingSendResults(false)}>
                  <div className="w-full max-w-xl bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <Send size={22} className="text-[#655ac1] shrink-0" />
                        <div className="min-w-0">
                          <h4 className="font-black text-slate-800 text-base">نتائج الإرسال</h4>
                          <p className="text-xs font-bold text-slate-400 mt-0.5">تم تسجيل هذه العملية في سجل الاستلام.</p>
                        </div>
                      </div>
                      <button type="button" title="إغلاق" aria-label="إغلاق" onClick={() => setShowWaitingSendResults(false)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-transparent text-slate-500 hover:text-[#655ac1] hover:border-[#655ac1] transition-all">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                          <div className="text-[10px] font-bold text-[#655ac1] mb-1">تم الإرسال</div>
                          <div className="text-xl font-extrabold text-[#655ac1] tabular-nums">{waitingSendResults.filter(r => r.status === 'sent').length}</div>
                        </div>
                        <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                          <div className="text-[10px] font-bold text-rose-600 mb-1">فشل الإرسال</div>
                          <div className="text-xl font-extrabold text-rose-600 tabular-nums">{waitingSendResults.filter(r => r.status === 'failed').length}</div>
                        </div>
                        <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                          <div className="text-[10px] font-bold text-slate-500 mb-1">الإجمالي</div>
                          <div className="text-xl font-extrabold text-slate-800 tabular-nums">{waitingSendResults.length}</div>
                        </div>
                      </div>
                      <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            {waitingSendChannel === 'whatsapp' ? <WhatsAppIcon size={18} /> : <MessageSquare size={16} className="text-[#007AFF]" />}
                            <span>قناة الإرسال: {waitingSendChannel === 'whatsapp' ? 'الواتساب' : 'الرسائل النصية'}</span>
                          </div>
                          <div className="text-xs font-black text-slate-500">{new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}</div>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
                      <button type="button" onClick={() => setShowWaitingSendResults(false)}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-transparent text-slate-700 text-sm font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all">
                        إغلاق
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>
            );
          })()}

        </div>
      )}

      {/* ══════ Stats Strip — visible in standalone daily waiting page ══════ */}
      {!isEmbedded && (
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" dir="rtl">
        <div className="flex divide-x divide-x-reverse divide-slate-100">
          <div className="flex items-center gap-2 px-5 py-3 border-l border-slate-100 shrink-0">
            <Clock size={15} className="text-[#8779fb]" />
            <span className="text-sm font-black text-slate-600">انتظار اليوم</span>
          </div>
          {[
            { label: 'الغائبون اليوم',     value: totalAbsent,   icon: <UserX size={16} className="text-[#8779fb]" />,         color: 'text-[#8779fb]'   },
            { label: 'حصص الغائبون',       value: totalPeriods,  icon: <BookOpen size={16} className="text-amber-500" />,      color: 'text-amber-600'   },
            { label: 'الحصص المسندة',      value: totalAssigned, icon: <CheckCircle size={16} className="text-emerald-500" />, color: 'text-emerald-600' },
            { label: 'الحصص الغير مسندة', value: totalPending,  icon: <BookX size={16} className="text-rose-400" />,          color: 'text-rose-500'    },
          ].map(s => (
            <div key={s.label} className="flex-1 flex flex-col items-center justify-center px-5 py-3 gap-1">
              <div className="flex items-center gap-1.5">
                {s.icon}
                <span className="text-[11px] font-bold text-slate-400">{s.label}</span>
              </div>
              <span className={`text-xl font-black leading-none ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* ══════ Empty State ══════ */}
      {totalAbsent === 0 && !isEmbedded && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-16 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 left-0 w-24 h-24 bg-slate-50 rounded-br-[3rem] -z-0" />
          <UserX size={48} className="text-[#655ac1] mb-5 relative z-10" strokeWidth={1.6} />
          <h3 className="text-xl font-black text-slate-700 mb-2 relative z-10">لا يوجد غياب مسجل لهذا اليوم</h3>
          <p className="text-sm text-slate-400 font-medium relative z-10 whitespace-nowrap">
            اضغط على "تسجيل غياب معلم" لإضافة غائب وبدء عملية توزيع حصص الانتظار
          </p>
        </div>
      )}

      {/* ══════ Absent Teachers Cards — hidden in register section (shown in non-embedded + distribute) ══════ */}
      {(!isEmbedded || isDistribute) && currentSession?.absentTeachers.map(absentTeacher => {
        const teacherAssignments = currentSession.assignments.filter(
          a => a.absentTeacherId === absentTeacher.id && !isWaitingSlotDisabled(absentTeacher.id, a.periodNumber)
        );
        const hasSwaps = Object.keys(absentTeacher.swapCandidates).length > 0;
        const coveredCount = teacherAssignments.length;
        const totalCount = getActiveAbsentPeriods(absentTeacher).length;
        const isFullyCovered = coveredCount === totalCount && totalCount > 0;

        return (
          <div key={absentTeacher.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="flex items-center justify-between px-6 py-3 relative">
              {/* الشريط اللوني (يمين البطاقة) */}
              <div className={`absolute right-0 inset-y-0 w-1 transition-colors duration-300 ${
                isFullyCovered ? 'bg-emerald-400' : 'bg-rose-500'
              }`} />
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                  <UserX size={28} className="text-[#655ac1]" />
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-black text-slate-800 text-base">{absentTeacher.teacherName}</h3>
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-50 text-[#655ac1]">
                      {absentTeacher.absenceType === 'full' ? 'غياب يوم' : 'غياب جزئي'}
                    </span>
                    {hasSwaps && !isFullyCovered && (
                      <span className="text-xs font-black px-3 py-1 rounded-full bg-violet-100 text-violet-600 flex items-center gap-1">
                        <Zap size={11} /> تبديل ذكي متاح
                      </span>
                    )}
                  </div>
                  {/* سطر الإحصاء: إطار رمادي بلا خلفية، تحت الاسم */}
                  <span className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-500">
                    الإجمالي {totalCount} ·
                    <span className="text-emerald-600 font-black">{coveredCount} مُسند</span>
                    {coveredCount < totalCount && (
                      <>· <span className="text-rose-500 font-black">{totalCount - coveredCount} غير مسندة</span></>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); setClearTeacherAssignmentsConfirm(absentTeacher); }}
                  disabled={teacherAssignments.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 text-xs font-black shadow-sm transition-all hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} className="text-rose-600" />
                  حذف المنتظرين
                </button>
              </div>
            </div>

            {/* Card Body: Periods Table */}
            <div className="border-t border-slate-100">
                {/* Smart swap hint banner */}
                {hasSwaps && !isFullyCovered && (
                  <div className="mx-5 mt-5 bg-violet-50 border border-violet-100 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                      <Zap size={16} className="text-violet-600" />
                    </div>
                    <div>
                      <p className="font-black text-violet-700 text-sm">تبديل ذكي متاح</p>
                      <p className="text-xs text-violet-600 mt-0.5">
                        يوجد معلم منتظر يدرّس نفس الفصل في حصة لاحقة — ابحث عن زر "تبديل ذكي" أمام الحصص المناسبة
                      </p>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        <th className="px-5 py-3.5 text-center font-black text-[#655ac1] text-[13px] w-[12%]">الحصة</th>
                        <th className="px-5 py-3.5 text-center font-black text-[#655ac1] text-[13px] w-[22%]">الصف والفصل</th>
                        <th className="px-5 py-3.5 text-right font-black text-[#655ac1] text-[13px] w-[24%]">المادة</th>
                        <th className="px-5 py-3.5 text-right font-black text-[#655ac1] text-[13px]">المعلم المنتظر</th>
                        <th className="px-5 py-3.5 text-center font-black text-[#655ac1] text-[13px] w-[90px]">إجراءات</th>
                        <th className="hidden print:table-cell px-5 py-3.5 text-center font-black text-[#655ac1] text-[13px]">التوقيع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {absentTeacher.periods.map(period => {
                        const assignment = teacherAssignments.find(a => a.periodNumber === period.periodNumber);
                        const swapCandidates = absentTeacher.swapCandidates[period.periodNumber] || [];
                        const hasSwapOption = swapCandidates.length > 0 && !assignment;
                        const slotDisabled = isWaitingSlotDisabled(absentTeacher.id, period.periodNumber);
                        const slotKey = getWaitingSlotKey(absentTeacher.id, period.periodNumber);
                        const manualNameMode = manualNameSlots.has(slotKey);

                        return (
                          <tr key={period.periodNumber} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-2 text-center">
                              <span className="inline-flex items-center justify-center w-7 h-7 bg-white text-slate-600 font-black text-[13px] rounded-full border border-slate-300">
                                {period.periodNumber}
                              </span>
                            </td>
                            <td className="px-5 py-2 font-bold text-slate-700 text-center">{period.className || '—'}</td>
                            <td className="px-5 py-2 text-slate-500 font-medium">{period.subjectName || '—'}</td>
                            <td className="px-5 py-2">
                              {manualNameMode ? (
                                <input
                                  autoFocus
                                  value={manualNameValues[slotKey] || ''}
                                  onChange={e => setManualNameValues(prev => ({ ...prev, [slotKey]: e.target.value }))}
                                  onBlur={() => saveManualNameAssignment(period, absentTeacher)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveManualNameAssignment(period, absentTeacher);
                                    if (e.key === 'Escape') toggleManualNameSlot(absentTeacher.id, period.periodNumber);
                                  }}
                                  placeholder="اكتب اسم المنتظر"
                                  className="w-full max-w-[220px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#655ac1]/20 focus:border-[#655ac1]"
                                />
                              ) : assignment ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-700">{assignment.substituteTeacherName}</span>
                                  {assignment.substitutePhone && assignment.status !== 'signed' && (
                                    <button
                                      onClick={() => {
                                        const msg = buildAssignmentMessage(assignment);
                                        dispatchMessage(assignment, msg, 'whatsapp');
                                      }}
                                      title="إرسال عبر واتساب"
                                      className="p-1 text-emerald-400 hover:text-emerald-600 transition-colors"
                                    >
                                      <MessageSquare size={13} />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {(manualDistMode || isDistribute) && !slotDisabled ? (
                                    <button
                                      onClick={() => openAssignModal(period, absentTeacher)}
                                      className="inline-flex items-center justify-center gap-1 px-4 py-2 border-2 border-dashed border-slate-200 hover:border-[#655ac1]/50 rounded-xl text-slate-400 hover:text-[#655ac1] hover:bg-[#e5e1fe]/20 font-bold text-xs transition-all"
                                    >
                                      <Plus size={12} /> إضافة منتظر
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 text-xs font-medium">{slotDisabled ? 'الحصة معطّلة' : 'لم يُسند'}</span>
                                  )}
                                  {hasSwapOption && (
                                    <button
                                      onClick={() => {
                                        setSwapSendMode('manual');
                                        setShowSwapConfirm({ swap: swapCandidates[0], period, absentId: absentTeacher.id, absentName: absentTeacher.teacherName });
                                      }}
                                      className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-white hover:bg-violet-50 text-violet-600 border border-violet-200 font-bold text-xs transition-all hover:border-violet-400"
                                    >
                                      <ArrowLeftRight size={13} /> تبديل ذكي
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-2 print:hidden">
                              <div className="flex items-center justify-center">
                                <button
                                  onClick={e => openRowActionMenu(e, period, absentTeacher)}
                                  title="إجراءات"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-[#655ac1] hover:border-[#655ac1]/40 transition-all"
                                >
                                  <MoreHorizontal size={16} />
                                </button>
                              </div>
                            </td>
                            <td className="hidden print:table-cell px-5 py-3.5 text-center">
                              {assignment?.signatureData ? (
                                /* حالة 2: تم التوقيع */
                                <div className="flex flex-col items-center gap-1">
                                  <img
                                    src={assignment.signatureData}
                                    alt="توقيع المعلم"
                                    className="h-10 max-w-[120px] object-contain border border-emerald-200 rounded-lg bg-white p-1"
                                  />
                                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 size={10} /> تم التوقيع
                                  </span>
                                </div>
                              ) : assignment && assignment.sendType === 'electronic' ? (
                                /* حالة 1: بانتظار التوقيع */
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-9 h-9 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center animate-pulse">
                                    <Hourglass size={16} className="text-amber-500" />
                                  </div>
                                  <span className="text-[10px] text-amber-600 font-bold">بانتظار التوقيع</span>
                                </div>
                              ) : assignment && !assignment.sendType ? (
                                /* حالة 3: لم يُرسل إلكترونياً */
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                                    <PenLine size={14} className="text-slate-300" />
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-bold">لم يُرسل</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300 font-medium">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>


              </div>
          </div>
        );
      })}

      {/* ══════ CTA: Continue to Print & Send (distribute section only) ══════ */}
      {false && isDistribute && totalAbsent > 0 && totalAssigned > 0 && totalPending === 0 && onGoToPrintSend && (
        <div className="bg-gradient-to-l from-[#fcfbff] to-white border-2 border-[#655ac1]/20 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-base font-black text-slate-800">تم إسناد جميع الحصص بنجاح</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                يمكنك الآن الانتقال إلى تاب الطباعة والإرسال لإرسال التكليفات للمناوبين.
              </p>
            </div>
          </div>
          <button
            onClick={onGoToPrintSend}
            className="flex items-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-[#655ac1]/20 transition-all hover:scale-105 active:scale-95"
          >
            <span>متابعة إلى الطباعة والإرسال</span>
            <ArrowRight size={18} className="rotate-180" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: تأكيد التوزيع التلقائي
      ══════════════════════════════════════════════ */}
      {showAutoConfirm && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[220] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="flex items-start justify-between gap-3 px-7 pt-7 pb-5">
              <div className="flex items-center gap-3">
                <Zap size={24} className="text-[#655ac1] shrink-0" />
                <div>
                  <h3 className="font-black text-slate-800 text-base">تأكيد توزيع الانتظار آليًا</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">سيتم تطبيق التوزيع على الحصص المتاحة</p>
                </div>
              </div>
              <button
                onClick={() => { setShowAutoConfirm(false); setPendingAutoFn(null); }}
                className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shrink-0"
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>
            <p className="px-7 pb-7 text-sm text-slate-600 font-medium leading-7">
              سيتم توزيع حصص الانتظار آليًا وفق المتاحين ورصيد الانتظار، هل تريد بدء التوزيع الآن؟
            </p>
            <div className="flex gap-2 px-7 pb-7">
              <button
                onClick={() => { setShowAutoConfirm(false); setPendingAutoFn(null); }}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  setShowAutoConfirm(false);
                  const fn = pendingAutoFn;
                  setPendingAutoFn(null);
                  if (fn) {
                    setIsAutoDistributing(true);
                    setTimeout(() => {
                      fn();
                      setTimeout(() => setIsAutoDistributing(false), 2500);
                    }, 50);
                  }
                }}
                className="flex-1 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Zap size={15} /> بدء التوزيع
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══════════════════════════════════════════════
          MODAL: تأكيد حذف المعلم الغائب
      ══════════════════════════════════════════════ */}
      {removeAbsentConfirm && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="flex items-center gap-3 px-7 pt-7 pb-4">
              <Trash2 size={24} className="text-rose-500 shrink-0" />
              <div>
                <h3 className="font-black text-slate-800 text-base">تأكيد الحذف</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">هذا الإجراء لا يمكن التراجع عنه</p>
              </div>
            </div>
            <p className="px-6 pb-5 text-sm text-slate-600 font-medium">
              هل تريد حذف <span className="font-black text-slate-800">"{removeAbsentConfirm.name}"</span> من قائمة الغائبين؟ سيتم حذف جميع الإسنادات المرتبطة به.
            </p>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setRemoveAbsentConfirm(null)}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleRemoveAbsent(removeAbsentConfirm.id, removeAbsentConfirm.name)}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 size={15} /> تأكيد الحذف
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* ══════════════════════════════════════════════
          MODAL: تسجيل الغياب
      ══════════════════════════════════════════════ */}
      {showAbsenceModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl min-h-[82vh] max-h-[96vh] flex flex-col overflow-hidden" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center">
                  <UserX size={24} className="text-[#655ac1]" />
                </div>
                <h3 className="font-black text-slate-800">تسجيل غياب معلم</h3>
              </div>
              <button onClick={() => { setShowAbsenceModal(false); setShowTeacherRemoveConfirm(false); setShowSubmitConfirm(false); }} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Date strip — click to open native date picker */}
            <div
              className="flex items-center gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100 shrink-0 cursor-pointer group"
              onClick={() => {
                if (absenceDateInputRef.current) {
                  try {
                    absenceDateInputRef.current.showPicker();
                  } catch (e) {
                    absenceDateInputRef.current.click();
                  }
                }
              }}
              title="انقر لتغيير التاريخ"
            >
              <div className="flex items-center gap-2.5 bg-white border border-slate-200 group-hover:border-[#655ac1] rounded-xl px-4 py-2.5 shadow-sm w-full transition-all select-none">
                <Calendar size={16} className="text-[#655ac1] shrink-0" />
                <span className="text-sm font-black text-slate-700">{dayName}</span>
                <span className="text-slate-300 mx-1">—</span>
                <span className="text-sm font-medium text-slate-600 flex-1">
                  {schoolInfo.calendarType === 'hijri' ? formatHijri(selectedDate) : formatGregorian(selectedDate)}
                </span>
                <span className="text-[10px] font-bold text-[#655ac1] shrink-0">انقر للتغيير</span>
              </div>
              <input
                ref={absenceDateInputRef}
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="sr-only"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ── قائمة الغائبين المضافين ── */}
              {absentQueue.length > 0 && (
                <div>
                  <p className="text-xs font-black text-slate-600 mb-2.5 flex items-center gap-2">
                    <UserX size={13} className="text-[#655ac1]" />
                    الغائبون المضافون
                    <span className="bg-[#655ac1] text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                      {absentQueue.length}
                    </span>
                  </p>
                  <div className="flex flex-col gap-2">
                    {absentQueue.map((entry, idx) => (
                      <div
                        key={entry.teacherId}
                        className="flex items-center gap-3 bg-[#655ac1]/5 border border-[#655ac1]/20 rounded-xl px-4 py-2.5"
                      >
                        <div className="w-7 h-7 bg-[#655ac1]/10 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-xs font-black text-[#655ac1]">{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-800 text-sm truncate">{entry.teacherName}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">
                            {entry.absenceType === 'full'
                              ? 'غياب يوم كامل'
                              : `غياب جزئي · ${entry.selectedPeriods.size} حصة`}
                          </p>
                        </div>
                        <button
                          onClick={() => setAbsentQueue(prev => prev.filter(q => q.teacherId !== entry.teacherId))}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                          title="إزالة من القائمة"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 h-px bg-slate-100" />
                  <p className="text-xs font-black text-[#655ac1] mt-3 flex items-center gap-1.5">
                    <UserX size={12} /> إضافة معلم آخر
                  </p>
                </div>
              )}

              {/* Teacher Search */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">المعلم الغائب</label>
                <div className="relative">
                  <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={teacherSearch}
                    onChange={e => setTeacherSearch(e.target.value)}
                    placeholder="ابحث باسم المعلم..."
                    className="w-full pr-9 pl-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1]"
                  />
                </div>
                {!absenceForm.teacherId && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                    {filteredTeachers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-400 text-center">لا يوجد معلمون</div>
                    ) : filteredTeachers.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setAbsenceForm(p => ({ ...p, teacherId: t.id, selectedPeriods: new Set() })); setTeacherSearch(t.name); }}
                        className="w-full text-right px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        {t.name}
                        <span className="text-xs font-normal text-slate-400 mr-2">
                          ({subjects.find(s => s.id === t.assignedSubjectId)?.name || 'لا مادة'})
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {absenceForm.teacherId && (
                  <div className="mt-2 flex items-center gap-2 bg-white border-2 border-[#655ac1] rounded-xl px-4 py-2.5">
                    <CheckCircle2 size={22} className="text-[#655ac1] shrink-0" />
                    <span className="font-black text-[#655ac1] text-sm flex-1">
                      {teachers.find(t => t.id === absenceForm.teacherId)?.name}
                    </span>
                    <button
                      onClick={() => setShowTeacherRemoveConfirm(true)}
                      className="text-rose-500 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
                {showTeacherRemoveConfirm && (
                  <div className="mt-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex flex-col gap-3">
                    <p className="text-sm font-bold text-rose-700">هل تريد إلغاء اختيار هذا المعلم؟</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setAbsenceForm(p => ({ ...p, teacherId: '', selectedPeriods: new Set() }));
                          setTeacherSearch('');
                          setShowTeacherRemoveConfirm(false);
                        }}
                        className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5"
                      >
                        <Trash2 size={15} /> تأكيد الحذف
                      </button>
                      <button
                        onClick={() => setShowTeacherRemoveConfirm(false)}
                        className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Absence Type */}
              {absenceForm.teacherId && (
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-2">نوع الغياب</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['full', 'partial'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setAbsenceForm(p => ({ ...p, absenceType: type, selectedPeriods: new Set() }))}
                        className={`flex items-center gap-2 p-3 rounded-2xl border-2 font-bold text-sm transition-all ${
                          absenceForm.absenceType === type
                            ? 'border-[#655ac1] bg-white text-[#655ac1]'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {absenceForm.absenceType === type
                          ? <Check size={16} className="text-[#655ac1]" />
                          : (type === 'full' ? <UserX size={16} /> : <Clock size={16} />)
                        }
                        {type === 'full' ? 'غياب يوم كامل' : 'غياب جزئي'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Partial: Period Selection */}
              {absenceForm.teacherId && absenceForm.absenceType === 'partial' && (
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-2">
                    حصص الغياب
                    <span className="font-normal text-slate-400 mr-1">(من جدول {dayName})</span>
                  </label>
                  {selectedTeacherSchedule.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTeacherSchedule.map(entry => (
                        <label
                          key={entry.periodNumber}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            absenceForm.selectedPeriods.has(entry.periodNumber)
                              ? 'border-[#655ac1] bg-[#655ac1]/5'
                              : 'border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={absenceForm.selectedPeriods.has(entry.periodNumber)}
                            onChange={e => {
                              setAbsenceForm(p => {
                                const s = new Set(p.selectedPeriods);
                                e.target.checked ? s.add(entry.periodNumber) : s.delete(entry.periodNumber);
                                return { ...p, selectedPeriods: s };
                              });
                            }}
                            className="rounded accent-[#655ac1]"
                          />
                          <span className="w-7 h-7 text-[#655ac1] font-black text-sm bg-[#655ac1]/10 rounded-lg flex items-center justify-center shrink-0">
                            {entry.periodNumber}
                          </span>
                          <span className="font-bold text-slate-700 text-sm flex-1">{entry.className}</span>
                          <span className="text-xs text-slate-400">{entry.subjectName}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
                        <p className="text-xs text-amber-700 font-bold flex items-center gap-2">
                          <AlertTriangle size={13} /> لا يوجد جدول محمّل لهذا اليوم — حدد الحصص يدوياً
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: maxPeriods }, (_, i) => i + 1).map(p => (
                          <button
                            key={p}
                            onClick={() => setAbsenceForm(prev => {
                              const s = new Set(prev.selectedPeriods);
                              s.has(p) ? s.delete(p) : s.add(p);
                              return { ...prev, selectedPeriods: s };
                            })}
                            className={`w-10 h-10 rounded-xl font-black text-sm transition-all border ${
                              absenceForm.selectedPeriods.has(p)
                                ? 'bg-[#655ac1] text-white border-[#655ac1]'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#655ac1]/50'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Swap preview hint */}
                  {absenceForm.selectedPeriods.size > 0 && (() => {
                    const hasPotential = Array.from(absenceForm.selectedPeriods).some(p => {
                      const entry = selectedTeacherSchedule.find(e => e.periodNumber === p) || {
                        periodNumber: p, classId: '', className: '', subjectId: '', subjectName: ''
                      };
                      return findSwapCandidates(absenceForm.teacherId, entry, dayKey, absentTeacherIds).length > 0;
                    });
                    if (!hasPotential) return null;
                    return (
                      <div className="mt-3 bg-violet-50 border border-violet-100 rounded-2xl p-3 flex items-start gap-2">
                        <Zap size={16} className="text-violet-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-black text-violet-700 text-sm">تبديل ذكي محتمل</p>
                          <p className="text-xs text-violet-600 mt-0.5">يوجد معلم منتظر يدرّس نفس الفصل في حصة لاحقة — سيظهر خيار التبديل بعد الإضافة.</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col gap-3">
              {(() => {
                const totalCount = absentQueue.length + (absenceForm.teacherId ? 1 : 0);

                if (showSubmitConfirm) {
                  return (
                    <>
                      <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                        <p className="text-sm font-bold text-amber-800 flex-1">
                          سيتم تسجيل غياب {totalCount} معلم{totalCount > 1 ? 'ين' : ''} — هل أنت متأكϿ
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowSubmitConfirm(false)}
                          className="flex-1 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-sm transition-all"
                        >
                          تراجع
                        </button>
                        <button
                          onClick={() => { setShowSubmitConfirm(false); handleSubmitAbsenceQueue(); }}
                          className="flex-1 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#655ac1]/20 flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                        >
                          <CheckCircle2 size={16} />
                          تأكيد التسجيل
                        </button>
                      </div>
                    </>
                  );
                }

                return (
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowAbsenceModal(false); setShowSubmitConfirm(false); }}
                      className="flex-1 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-sm transition-all hover:border-slate-300"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleAddToQueue}
                      disabled={!absenceForm.teacherId}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <UserX size={15} />
                      أضف غيابًا آخر
                    </button>
                    <button
                      onClick={() => { if (totalCount > 0) setShowSubmitConfirm(true); }}
                      disabled={totalCount === 0}
                      className="flex-1 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#655ac1]/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      {totalCount > 1 ? `تسجيل (${totalCount})` : 'تسجيل الغياب'}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══════════════════════════════════════════════
          MODAL: الإسناد اليدوي
      ══════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════
          MODAL: التوزيع اليدوي الجماعي
      ══════════════════════════════════════════════ */}
      {showManualDistModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={() => setShowManualDistModal(false)}>
          <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden" dir="rtl" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[#655ac1]/10 rounded-2xl flex items-center justify-center">
                  <Users size={22} className="text-[#655ac1]" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">التوزيع اليدوي</h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {currentSession?.absentTeachers.length || 0} غائب ·{' '}
                    <span className="text-rose-500 font-bold">
                      {totalPending} حصة غير مسندة
                    </span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowManualDistModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {(!currentSession || currentSession.absentTeachers.length === 0) ? (
                <div className="text-center py-16 text-slate-400">
                  <UserX size={40} className="mx-auto mb-3 text-slate-200" />
                  <p className="font-bold">لا يوجد غائبون مسجّلون لهذا اليوم</p>
                </div>
              ) : currentSession.absentTeachers.map(absentTeacher => {
                const teacherAssignments = currentSession.assignments.filter(a => a.absentTeacherId === absentTeacher.id && !isWaitingSlotDisabled(absentTeacher.id, a.periodNumber));
                const coveredCount = teacherAssignments.length;
                const totalCount = getActiveAbsentPeriods(absentTeacher).length;
                const isFullyCovered = coveredCount === totalCount && totalCount > 0;

                return (
                  <div key={absentTeacher.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                    isFullyCovered ? 'border-emerald-200' : absentTeacher.absenceType === 'full' ? 'border-rose-200' : 'border-amber-200'
                  }`}>
                    {/* Card header */}
                    <div className={`flex items-center justify-between px-5 py-4 border-r-4 ${
                      isFullyCovered ? 'border-emerald-400' : absentTeacher.absenceType === 'full' ? 'border-rose-400' : 'border-amber-400'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isFullyCovered ? 'bg-emerald-50 text-emerald-500' : absentTeacher.absenceType === 'full' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'
                        }`}>
                          {isFullyCovered ? <CheckCircle2 size={20} /> : <UserX size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-slate-800">{absentTeacher.teacherName}</h3>
                            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                              isFullyCovered ? 'bg-emerald-100 text-emerald-600' : absentTeacher.absenceType === 'full' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                              {absentTeacher.absenceType === 'full' ? 'غياب يوم' : 'غياب جزئي'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">
                            {coveredCount} / {totalCount} حصة مُسندة
                          </p>
                        </div>
                      </div>
                      {!isFullyCovered && (
                        <button
                          onClick={() => {
                            requestAutoDistribution(absentTeacher);
                          }}
                          className="flex items-center gap-1.5 bg-[#655ac1] hover:bg-[#5046a0] text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95"
                        >
                          <Zap size={14} /> تلقائي للكل
                        </button>
                      )}
                    </div>

                    {/* Periods table */}
                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400">
                            <th className="px-4 py-3 text-right font-black text-xs">الحصة</th>
                            <th className="px-4 py-3 text-right font-black text-xs">الصف والفصل</th>
                            <th className="px-4 py-3 text-right font-black text-xs">المادة</th>
                            <th className="px-4 py-3 text-right font-black text-xs">المعلم المنتظر</th>
                            <th className="px-4 py-3 text-right font-black text-xs">الإجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {absentTeacher.periods.map(period => {
                            const assignment = teacherAssignments.find(a => a.periodNumber === period.periodNumber);
                            const swapCandidates = absentTeacher.swapCandidates[period.periodNumber] || [];
                            const hasSwapOption = swapCandidates.length > 0 && !assignment;
                            return (
                              <tr key={period.periodNumber} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center justify-center w-8 h-8 bg-[#655ac1]/10 text-[#655ac1] font-black text-sm rounded-lg">
                                    {period.periodNumber}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-700">{period.className || '—'}</td>
                                <td className="px-4 py-3 text-slate-500 font-medium">{period.subjectName || '—'}</td>
                                <td className="px-4 py-3">
                                  {assignment ? (
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                                        assignment.status === 'signed' ? 'bg-emerald-500' : assignment.status === 'acknowledged' ? 'bg-blue-500' : assignment.status === 'sent' ? 'bg-amber-500' : 'bg-slate-300'
                                      }`} />
                                      <span className="font-bold text-slate-700 text-sm">{assignment.substituteTeacherName}</span>
                                      <button
                                        title="تغيير المنتظر"
                                        onClick={() => openAssignModal(period, absentTeacher)}
                                        className="p-1.5 text-[#655ac1] hover:text-[#5046a0] hover:bg-[#e5e1fe] rounded-lg transition-colors"
                                      >
                                        <Edit3 size={14} />
                                      </button>
                                      <button onClick={() => setRemoveAssignmentConfirm(assignment)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 text-xs font-medium">لم يُسند</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {!assignment ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {hasSwapOption && (
                                        <button
                                          onClick={() => { setSwapSendMode('manual'); setShowSwapConfirm({ swap: swapCandidates[0], period, absentId: absentTeacher.id, absentName: absentTeacher.teacherName }); }}
                                          className="flex items-center gap-1.5 bg-white hover:bg-violet-50 text-violet-600 border border-violet-200 px-3 py-1.5 rounded-xl font-bold text-xs transition-all hover:border-violet-400"
                                        >
                                          <ArrowLeftRight size={12} /> تبديل ذكي
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleAutoAssign(period, absentTeacher)}
                                        className="flex items-center gap-1.5 bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold text-xs transition-all hover:border-emerald-400"
                                      >
                                        <Zap size={12} /> تلقائي
                                      </button>
                                      <button
                                        onClick={() => openAssignModal(period, absentTeacher)}
                                        className="flex items-center gap-1.5 bg-white hover:bg-[#e5e1fe] text-[#655ac1] border border-[#655ac1]/20 px-3 py-1.5 rounded-xl font-bold text-xs transition-all hover:border-[#655ac1]"
                                      >
                                        <Users size={12} /> يدوي
                                      </button>
                                    </div>
                                  ) : (
                                    <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full ${
                                      assignment.status === 'signed' ? 'bg-emerald-100 text-emerald-700' : assignment.status === 'acknowledged' ? 'bg-blue-100 text-blue-700' : assignment.status === 'sent' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {assignment.status === 'signed' ? '✅ موقّع' : assignment.status === 'acknowledged' ? '👁 اطلع' : assignment.status === 'sent' ? '📤 أُرسل' : '⏳ غير مسندة'}
                                    </span>
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
          </div>
        </div>,
        document.body
      )}

      {showAssignModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-800">إضافة منتظر</h3>
                <p className="mt-1.5 text-xs text-[#655ac1] font-bold">
                  الحصة {showAssignModal.period.periodNumber} · {showAssignModal.period.className} · {showAssignModal.period.subjectName}
                </p>
              </div>
              <button
                onClick={resetAssignModal}
                className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs — نمط تبويبات الإشراف */}
            <div className="px-4 pt-3">
              <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded-xl">
                <button
                  onClick={() => setAssignModalTab('teachers')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all border ${
                    assignModalTab === 'teachers' ? 'bg-white text-slate-900 shadow-sm border-slate-200' : 'text-slate-400 hover:text-slate-600 border-transparent'
                  }`}
                >
                  <Users size={16} className={assignModalTab === 'teachers' ? 'text-[#655ac1]' : ''} />
                  المعلمون
                </button>
                <button
                  onClick={() => setAssignModalTab('admins')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all border ${
                    assignModalTab === 'admins' ? 'bg-white text-slate-900 shadow-sm border-slate-200' : 'text-slate-400 hover:text-slate-600 border-transparent'
                  }`}
                >
                  <UserCog size={16} className={assignModalTab === 'admins' ? 'text-[#655ac1]' : ''} />
                  الإداريون
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-4 py-3">
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={assignmentSearch}
                  onChange={e => setAssignmentSearch(e.target.value)}
                  placeholder="ابحث"
                  className="w-full pr-10 pl-3 py-2.5 text-sm font-medium border border-slate-200 rounded-xl bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              {(() => {
                const currentAssignments = currentSession?.assignments || [];
                const currentSlotAssignment = currentAssignments.find(
                  a => a.absentTeacherId === showAssignModal.absentTeacher.id && a.periodNumber === showAssignModal.period.periodNumber
                );
                const alreadyAssignedThisPeriod = new Set(
                  currentAssignments
                    .filter(a => a.periodNumber === showAssignModal.period.periodNumber)
                    .filter(a => a.id !== currentSlotAssignment?.id)
                    .map(a => a.substituteTeacherId)
                );

                if (assignModalTab === 'teachers') {
                  const waiters = teachers
                    .filter(t => {
                      if (absentTeacherIds.has(t.id)) return false;
                      if (alreadyAssignedThisPeriod.has(t.id)) return false;
                      if (t.quotaLimit >= 24 && !t.waitingQuota) return false;
                      const busyKey = `${t.id}-${dayKey}-${showAssignModal.period.periodNumber}`;
                      if (timetable[busyKey]?.type === 'lesson') return false;
                      if (!t.name.includes(assignmentSearch)) return false;
                      return true;
                    })
                    .map(t => {
                      const total = t.waitingQuota || 10;
                      const assigned = weeklyQuota.counts[t.id] || 0;
                      const remaining = total - assigned;
                      const busyKey = `${t.id}-${dayKey}-${showAssignModal.period.periodNumber}`;
                      const isBusy = timetable[busyKey]?.type === 'lesson';
                      const isQuotaFull = remaining <= 0;
                      // Phase 3: get validation result for this teacher
                      const violations = validateAssignment(t, showAssignModal.period, showAssignModal.absentTeacher, currentSession?.assignments || [], dayKey, currentSlotAssignment);
                      const hasWarnings = violations.some(v => v.severity === 'warning');
                      const isBlocking = hasBlockingViolations(violations);
                      return { person: t as Teacher | Admin, assigned, total, remaining, isTeacher: true, isBusy, isQuotaFull: isBlocking, violations, hasWarnings };
                    })
                    .sort((a, b) => {
                      if (a.person.id === selectedAssignPerson?.id) return -1;
                      if (b.person.id === selectedAssignPerson?.id) return 1;
                      if (a.isBusy !== b.isBusy) return a.isBusy ? 1 : -1;
                      if (a.isQuotaFull !== b.isQuotaFull) return a.isQuotaFull ? 1 : -1;
                      return b.remaining - a.remaining;
                    });

                  if (waiters.length === 0) return (
                    <div className="px-5 py-10 text-center text-slate-400 flex flex-col items-center gap-3">
                      <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center">
                        <AlertCircle size={28} className="text-amber-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-600">لا يوجد معلمون منتظرون متاحون</p>
                    </div>
                  );

                  return (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-slate-50 text-[#655ac1]">
                          <tr>
                            <th className="px-4 py-3 font-black text-center w-16">م</th>
                            <th className="px-4 py-3 font-black">الاسم</th>
                            <th className="px-4 py-3 font-black w-28">الصفة</th>
                            <th className="px-4 py-3 font-black text-center w-20">تحديد</th>
                            <th className="px-4 py-3 font-black text-center w-32">نصاب الانتظار</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {waiters.map(({ person, assigned, total, remaining, isBusy, isQuotaFull }, index) => {
                            const disabled = isBusy || isQuotaFull;
                            const isSel = selectedAssignPerson?.id === person.id;
                            const quotaFull = assigned >= total;
                            return (
                              <tr key={person.id} className={`hover:bg-slate-50 transition-colors ${disabled ? 'opacity-50 bg-slate-50' : ''}`}>
                                <td className="px-4 py-2.5 text-center">
                                  <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 inline-flex items-center justify-center rounded-full">{index + 1}</span>
                                </td>
                                <td className="px-4 py-2.5 text-[13px] font-bold text-slate-700">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span>{person.name}</span>
                                    {isBusy && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">مشغول بحصة</span>}
                                    {isQuotaFull && !isBusy && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">اكتمل النصاب</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-[13px] font-bold text-slate-500">معلم</td>
                                <td className="px-4 py-2.5">
                                  <button
                                    type="button"
                                    onClick={() => !disabled && setSelectedAssignPerson(isSel ? null : person)}
                                    disabled={disabled}
                                    className={`mx-auto w-6 h-6 rounded-full border flex items-center justify-center transition-colors disabled:cursor-not-allowed ${
                                      isSel ? 'border-[#655ac1] bg-[#655ac1] text-white' : 'border-slate-300 text-transparent hover:border-[#655ac1]/60'
                                    }`}
                                    title="تحديد"
                                  >
                                    {isSel && <Check size={13} strokeWidth={3.2} className="text-white" />}
                                  </button>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className="inline-flex items-center justify-center gap-0.5 min-w-14 px-3 py-1 rounded-full border border-slate-200 text-xs font-black text-slate-800">
                                    <span className={quotaFull ? 'text-rose-500' : 'text-emerald-600'}>{Math.min(assigned, total)}</span>
                                    <span className="text-slate-400">/</span>
                                    {total}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );

                } else {
                  // Admins tab
                  const adminList = admins
                    .filter(a => {
                      if (alreadyAssignedThisPeriod.has(a.id)) return false;
                      if (ADMIN_BLOCKED_ROLES.some(r => a.role?.includes(r))) return false;
                      if (!a.name.includes(assignmentSearch)) return false;
                      return true;
                    })
                    .map(a => {
                      const total = a.waitingQuota || 5;
                      const assigned = weeklyQuota.counts[a.id] || 0;
                      const remaining = total - assigned;
                      return { person: a as Teacher | Admin, assigned, total, remaining, isTeacher: false };
                    })
                    .sort((a, b) => {
                      if (a.person.id === selectedAssignPerson?.id) return -1;
                      if (b.person.id === selectedAssignPerson?.id) return 1;
                      return b.remaining - a.remaining;
                    });

                  if (adminList.length === 0) return (
                    <div className="px-5 py-10 text-center text-slate-400">
                      <Shield size={32} className="mx-auto mb-3 text-slate-200" />
                      <p className="text-sm font-bold">لا يوجد طاقم إداري متاح</p>
                    </div>
                  );

                  return (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-slate-50 text-[#655ac1]">
                          <tr>
                            <th className="px-4 py-3 font-black text-center w-16">م</th>
                            <th className="px-4 py-3 font-black">الاسم</th>
                            <th className="px-4 py-3 font-black w-28">الصفة</th>
                            <th className="px-4 py-3 font-black text-center w-20">تحديد</th>
                            <th className="px-4 py-3 font-black text-center w-36 whitespace-nowrap">الانتظار المسند</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {adminList.map(({ person, assigned }, index) => {
                            const admin = person as Admin;
                            const isSel = selectedAssignPerson?.id === person.id;
                            return (
                              <tr key={person.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5 text-center">
                                  <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 inline-flex items-center justify-center rounded-full">{index + 1}</span>
                                </td>
                                <td className="px-4 py-2.5 text-[13px] font-bold text-slate-700">{person.name}</td>
                                <td className="px-4 py-2.5 text-[13px] font-bold text-slate-500">{admin.role || 'إداري'}</td>
                                <td className="px-4 py-2.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAssignPerson(isSel ? null : person)}
                                    className={`mx-auto w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                                      isSel ? 'border-[#655ac1] bg-[#655ac1] text-white' : 'border-slate-300 text-transparent hover:border-[#655ac1]/60'
                                    }`}
                                    title="تحديد"
                                  >
                                    {isSel && <Check size={13} strokeWidth={3.2} className="text-white" />}
                                  </button>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className="inline-flex items-center justify-center min-w-12 px-3 py-1 rounded-full border border-slate-200 text-xs font-black text-slate-800">
                                    {assigned}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                }
              })()}
            </div>
            <div className="sticky bottom-0 z-10 p-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2 shrink-0 shadow-[0_-8px_20px_rgba(15,23,42,0.04)]">
              <button
                onClick={resetAssignModal}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
              >
                إغلاق
              </button>
              <button
                onClick={saveSelectedAssignPerson}
                className="inline-flex items-center justify-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!selectedAssignPerson}
              >
                <CheckCircle2 size={16} />
                حفظ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══════════════════════════════════════════════
          MODAL: تأكيد التبديل الذكي
      ══════════════════════════════════════════════ */}
      {showSwapConfirm && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="bg-gradient-to-l from-violet-50 to-white px-6 py-5 border-b border-violet-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-2xl flex items-center justify-center">
                  <ArrowLeftRight size={20} className="text-violet-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800">تأكيد التبديل الذكي</h3>
                  <p className="text-xs text-violet-600 font-bold flex items-center gap-1">
                    <Shield size={11} /> لا يُستهلك رصيد الانتظار — إعادة جدولة فقط
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">الحصة الغائبة:</span>
                  <span className="font-black text-slate-800">حصة {showSwapConfirm.period.periodNumber} · {showSwapConfirm.period.className}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">المعلم المنتظر:</span>
                  <span className="font-black text-slate-800">{showSwapConfirm.swap.waitingTeacherName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">تقديم حصته من:</span>
                  <span className="font-black text-violet-700 flex items-center gap-1.5">
                    الحصة {showSwapConfirm.swap.theirPeriod}
                    <ArrowLeftRight size={13} />
                    الحصة {showSwapConfirm.swap.targetPeriod}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-xs font-black text-blue-600 mb-2">📝 نص الرسالة للمعلم:</p>
                <p className="text-sm text-blue-800 leading-relaxed">
                  "نحيطكم علماً بتقديم حصتكم مع فصل <strong>{showSwapConfirm.period.className}</strong> لتكون{' '}
                  الحصة <strong>{showSwapConfirm.swap.targetPeriod}</strong> بدلاً من الحصة <strong>{showSwapConfirm.swap.theirPeriod}</strong>."
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">طريقة الإرسال</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['auto', '📲 تلقائي'], ['manual', '✍️ يدوي']] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => setSwapSendMode(mode)}
                      className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${
                        swapSendMode === mode
                          ? 'border-[#655ac1] bg-[#655ac1]/5 text-[#655ac1]'
                          : 'border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setShowSwapConfirm(null)}
                className="flex-1 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-sm transition-all hover:border-[#8779fb]"
              >
                إلغاء
              </button>
              <button
                onClick={confirmSwap}
                className="flex-1 py-2.5 bg-[#8779fb] hover:bg-[#7668ea] text-white rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#8779fb]/20"
              >
                تأكيد التبديل
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {removeAssignmentConfirm && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
              <Trash2 size={24} className="text-rose-500 shrink-0" />
              <div>
                <h3 className="font-black text-slate-800 text-base">تأكيد حذف المنتظر</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">سيتم إلغاء الإسناد من هذه الحصة</p>
              </div>
            </div>
            <p className="px-6 pb-5 text-sm text-slate-600 font-medium">
              هل تريد حذف المنتظر <span className="font-black text-slate-800">"{removeAssignmentConfirm.substituteTeacherName}"</span> من الحصة {removeAssignmentConfirm.periodNumber}؟
            </p>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setRemoveAssignmentConfirm(null)}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={confirmRemoveAssignment}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 size={15} /> تأكيد الحذف
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {clearTeacherAssignmentsConfirm && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
              <Trash2 size={24} className="text-rose-500 shrink-0" />
              <div>
                <h3 className="font-black text-slate-800 text-base">تأكيد حذف المنتظرين</h3>
              </div>
            </div>
            <p className="px-6 pb-5 text-sm text-slate-600 font-medium">
              هل تريد حذف جميع المنتظرين المسندين لحصص <span className="font-black text-slate-800">"{clearTeacherAssignmentsConfirm.teacherName}"</span>؟
            </p>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setClearTeacherAssignmentsConfirm(null)}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={confirmClearTeacherAssignments}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 size={15} /> تأكيد الحذف
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Clear-all absents confirmation */}
      {showClearAllAbsentsConfirm && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
              <Trash2 size={24} className="text-rose-500 shrink-0" />
              <div>
                <h3 className="font-black text-slate-800 text-base">حذف الكل</h3>
              </div>
            </div>
            <p className="px-6 pb-5 text-sm text-slate-600 font-medium">
              سيتم حذف كل الغائبين المسجلين لهذا اليوم. وإذا كان الانتظار موزعًا، فسيتم حذف المنتظرين المسندين لهم أيضًا.
            </p>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setShowClearAllAbsentsConfirm(false)}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={confirmClearAllAbsents}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 size={15} /> حذف الكل
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Clear-all assignments confirmation */}
      {showClearAllConfirm && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
              <Trash2 size={24} className="text-rose-500 shrink-0" />
              <div>
                <h3 className="font-black text-slate-800 text-base">حذف كل المنتظرين</h3>
              </div>
            </div>
            <p className="px-6 pb-5 text-sm text-slate-600 font-medium">
              هل تريد حذف كل المنتظرين المسندين لهذا اليوم؟ يمكنك إعادة التوزيع بعدها.
            </p>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setShowClearAllConfirm(false)}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={confirmClearAllAssignments}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 size={15} /> حذف كل المنتظرين
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Per-period row actions dropdown (matches قسم المعلمون design) */}
      {rowActionMenu && ReactDOM.createPortal(
        (() => {
          const { period, absentTeacher } = rowActionMenu;
          const slotKey = getWaitingSlotKey(absentTeacher.id, period.periodNumber);
          const slotDisabled = isWaitingSlotDisabled(absentTeacher.id, period.periodNumber);
          const manualNameMode = manualNameSlots.has(slotKey);
          const assignment = (currentSession?.assignments || []).find(
            a => a.absentTeacherId === absentTeacher.id && a.periodNumber === period.periodNumber
          );
          return (
            <div
              className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5"
              style={{ top: rowActionMenu.top, right: rowActionMenu.right, minWidth: 190 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => { openAssignModal(period, absentTeacher); setRowActionMenu(null); }}
                disabled={slotDisabled}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PenLine size={15} className="text-[#655ac1]" /> {assignment ? 'تعديل المنتظر' : 'إضافة منتظر'}
              </button>

              <button
                onClick={() => { toggleManualNameSlot(absentTeacher.id, period.periodNumber); setRowActionMenu(null); }}
                disabled={slotDisabled}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={15} className="text-[#655ac1]" /> {manualNameMode ? 'إلغاء الإدخال اليدوي' : 'إدخال اسم يدويًا'}
              </button>

              <button
                onClick={() => { toggleWaitingSlotDisabled(absentTeacher.id, period.periodNumber); setRowActionMenu(null); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors"
              >
                <CircleOff size={15} className="text-[#655ac1]" /> {slotDisabled ? 'تفعيل الحصة' : 'تعطيل الحصة'}
              </button>

              <div className="border-t border-slate-100 my-1" />

              <button
                onClick={() => { if (assignment) setRemoveAssignmentConfirm(assignment); setRowActionMenu(null); }}
                disabled={!assignment}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={15} /> حذف المنتظر
              </button>
            </div>
          );
        })(),
        document.body
      )}

      {/* ════════════════════════════════════════════
          MODAL: Manual-Overwrite Confirmation
      ════════════════════════════════════════════ */}
      {showManualOverwriteConfirm && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[220] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="flex items-center gap-3 px-7 pt-7 pb-4">
              <ArrowLeftRight size={24} className="text-[#655ac1] shrink-0" />
              <div>
                <h3 className="font-black text-slate-800 text-base">التبديل إلى التوزيع اليدوي</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">سيُحذف التوزيع الحالي قبل التبديل</p>
              </div>
            </div>
            <p className="px-6 pb-5 text-sm text-slate-600 font-medium">
              يوجد توزيع حالي لهذا اليوم سيتم حذفه لإعادة التوزيع، هل تريد المتابعة؟
            </p>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setShowManualOverwriteConfirm(false)}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  releaseAssignmentQuota(currentSession?.assignments || []);
                  updateSession(selectedDate, s => ({ ...s, assignments: [] }));
                  setDistributionMode('manual');
                  setManualDistMode(true);
                  setShowManualOverwriteConfirm(false);
                  setLastDistResult(null);
                  showToast('تم حذف التوزيع — يمكنك الآن التوزيع يدوياً', 'info');
                }}
                className="flex-1 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeftRight size={15} /> نعم، بدّل للتوزيع اليدوي
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════════════════════════════════════════
          MODAL: Auto-Overwrite Confirmation
      ════════════════════════════════════════════ */}
      {showAutoOverwriteConfirm && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[220] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="flex items-center gap-3 px-7 pt-7 pb-4">
              <Zap size={24} className="text-[#655ac1] shrink-0" />
              <div>
                <h3 className="font-black text-slate-800 text-base">تأكيد التوزيع الآلي</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">سيُحذف التوزيع الحالي قبل إعادة التوزيع</p>
              </div>
            </div>
            <p className="px-6 pb-5 text-sm text-slate-600 font-medium">
              يوجد توزيع حالي لهذا اليوم سيتم حذفه وإعادة التوزيع، هل تريد المتابعة؟
            </p>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => { setShowAutoOverwriteConfirm(false); setPendingAutoFn(null); }}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  setShowAutoOverwriteConfirm(false);
                  const fn = pendingAutoFn;
                  setPendingAutoFn(null);
                  if (fn) {
                    setIsAutoDistributing(true);
                    setTimeout(() => {
                      fn();
                      setTimeout(() => setIsAutoDistributing(false), 2500);
                    }, 50);
                  }
                }}
                className="flex-1 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Zap size={15} /> نعم، أعد التوزيع
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════════════════════════════════════════
          MODAL: Phase 4 — إرسال التكاليف
      ════════════════════════════════════════════ */}
      {showSendModal && ReactDOM.createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setShowSendModal(false)}
        >
          <div
            className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-[95vw] xl:max-w-7xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Send size={22} className="text-[#655ac1]" />
                <div>
                  <h2 className="text-lg font-black text-slate-800">إرسال الانتظار</h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">اختر طريقة الإرسال المناسبة</p>
                </div>
              </div>
              <button onClick={() => setShowSendModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                <X size={20} />
              </button>
            </div>

            {/* ── Mode Tabs ── */}
            <div className="bg-white border-b border-slate-100 px-5 py-3 flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setSendModalMode('notification'); setSendCustomMessages({}); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-2 shrink-0 ${
                  sendModalMode === 'notification'
                    ? 'bg-white text-[#655ac1] border-[#655ac1] shadow-sm scale-[1.02]'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-[#655ac1]/40 hover:text-slate-700'
                }`}
              >
                <MessageSquare size={15} />
                إرسال إشعار الانتظار
                <span className="text-[10px] font-medium opacity-70">(رسالة فقط)</span>
              </button>

              <div className="w-px h-7 bg-slate-200 rounded-full shrink-0" />

              <button
                onClick={() => { setSendModalMode('electronic'); setSendCustomMessages({}); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-2 shrink-0 ${
                  sendModalMode === 'electronic'
                    ? 'bg-white text-[#655ac1] border-[#655ac1] shadow-sm scale-[1.02]'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-[#655ac1]/40 hover:text-slate-700'
                }`}
              >
                <PenLine size={15} />
                إرسال الانتظار إلكترونياً
                <span className="text-[10px] font-medium opacity-70">(رسالة + رابط توقيع)</span>
              </button>
            </div>

            {/* Mode description banner */}
            {sendModalMode === 'electronic' && (
              <div className="bg-[#655ac1]/5 border-b border-[#655ac1]/10 px-5 py-3 flex items-center gap-3 shrink-0">
                <Link2 size={16} className="text-[#655ac1] shrink-0" />
                <p className="text-xs font-bold text-[#655ac1] flex-1">
                  سيتم إرسال رابط توقيع إلكتروني مع كل رسالة — يمكن للمنتظر التوقيع عبر الرابط ويُحدَّث عمود التوقيع في الجدول تلقائياً.
                </p>
                <button
                  onClick={() => {
                    if (sendRows.length > 0) {
                      setPreviewAssignment(sendRows[0].asgn);
                      setHasSignature(false);
                      setShowElectronicPreview(true);
                    } else {
                      showToast('لا توجد حصص انتظار لمعاينتها', 'warning');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#655ac1] text-white text-sm font-bold transition-all hover:bg-[#5046a0] active:scale-95 shadow-md shadow-[#655ac1]/25 shrink-0"
                >
                  <Eye size={15} /> معاينة صفحة التوقيع
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck size={19} className="text-[#655ac1]" />
                    <div>
                      <h3 className="text-sm font-black text-slate-800">نوع الإشعار</h3>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">اختر صيغة تكليف الانتظار</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { id: 'electronic' as const, label: 'رسالة تكليف مع توقيع إلكتروني', icon: <PenLine size={15} />, desc: 'رسالة مرفق فيها رابط صفحة التوقيع' },
                      { id: 'notification' as const, label: 'رسالة تكليف نصية', icon: <MessageSquare size={15} />, desc: 'نص فقط بدون رابط' },
                    ].map(option => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => { setSendModalMode(option.id); setSendCustomMessages({}); }}
                        className={`w-full text-right p-3 rounded-xl border-2 transition-all ${sendModalMode === option.id ? 'bg-[#f8f7ff] border-[#655ac1] text-[#655ac1] shadow-sm' : 'bg-white border-slate-100 text-slate-600 hover:border-[#655ac1]/30'}`}
                      >
                        <span className="flex items-center gap-2 text-sm font-black">{option.icon}{option.label}</span>
                        <span className="block text-[11px] font-bold text-slate-400 mt-1 pr-6">{option.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
                  <div className="flex items-center gap-3">
                    <Users size={19} className="text-[#655ac1]" />
                    <div>
                      <h3 className="text-sm font-black text-slate-800">المنتظرون</h3>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">{selectedSendRows.length} محدد من أصل {sendRows.length}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSendRecipientsPreview(v => !v)}
                    className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-[13px] leading-tight">قائمة المستلمين المحددين تلقائياً</span>
                    <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${showSendRecipientsPreview ? 'rotate-180' : ''}`} />
                  </button>
                  {showSendRecipientsPreview && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2 max-h-52 overflow-y-auto space-y-1">
                      {sendRows.length === 0 ? (
                        <p className="text-xs font-bold text-slate-400 text-center py-6">لا توجد تكليفات انتظار لهذا اليوم</p>
                      ) : sendRows.map(row => {
                        const checked = sendSelectedIds.has(row.key);
                        return (
                          <button
                            key={row.key}
                            type="button"
                            onClick={() => setSendSelectedIds(prev => { const n = new Set(prev); n.has(row.key) ? n.delete(row.key) : n.add(row.key); return n; })}
                            className={`w-full text-right px-3 py-2 rounded-xl transition-all flex items-center justify-between gap-3 ${checked ? 'bg-white text-[#655ac1]' : 'text-slate-600 hover:bg-white'}`}
                          >
                            <span className="min-w-0">
                              <span className="block text-xs font-black truncate">{row.asgn.substituteTeacherName}</span>
                              <span className="block text-[10px] font-bold text-slate-400 truncate">الحصة {row.asgn.periodNumber} - {row.asgn.className}</span>
                            </span>
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 ${checked ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                              <Check size={12} strokeWidth={3.5} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <button type="button" onClick={toggleAllSendRows} className="text-xs font-black text-[#655ac1] hover:text-[#5046a0]">
                    {allSendRowsSelected ? 'إلغاء تحديد الجميع' : 'تحديد الجميع'}
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
                  <div className="flex items-center gap-3">
                    <Wallet size={19} className="text-[#655ac1]" />
                    <div>
                      <h3 className="text-sm font-black text-slate-800">طريقة الإرسال المفضلة</h3>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">{selectedWithPhoneCount} مستلم لديه رقم جوال</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setSendPreferredChannel('whatsapp')} className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-black bg-white transition-all ${sendPreferredChannel === 'whatsapp' ? 'border-slate-200 bg-slate-50 text-[#1d9e4b]' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <span className={sendPreferredChannel === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-300'}>
                        <WhatsAppIcon size={24} />
                      </span>
                      واتساب
                      {sendPreferredChannel === 'whatsapp' && (
                        <span className="absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#25D366] text-white shadow-sm">
                          <Check size={12} strokeWidth={3.5} />
                        </span>
                      )}
                    </button>
                    <button type="button" onClick={() => setSendPreferredChannel('sms')} className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-black bg-white transition-all ${sendPreferredChannel === 'sms' ? 'border-slate-200 bg-slate-50 text-[#007AFF]' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <Send size={22} className={sendPreferredChannel === 'sms' ? 'text-[#007AFF]' : 'text-slate-300'} />
                      SMS
                      {sendPreferredChannel === 'sms' && (
                        <span className="absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#007AFF] text-white shadow-sm">
                          <Check size={12} strokeWidth={3.5} />
                        </span>
                      )}
                    </button>
                  </div>
                  {sendPreferredChannel === 'whatsapp' && (
                    <label className="relative flex items-center gap-2.5 p-2.5 border border-slate-300 bg-transparent rounded-xl cursor-pointer hover:border-slate-400 transition-colors">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={sendFallbackToSms}
                        onChange={e => {
                          setSendFallbackToSms(e.target.checked);
                          if (e.target.checked) showToast('تم تفعيل الإرسال الاحتياطي عبر الرسائل النصية', 'success');
                        }}
                      />
                      <div className={`relative flex items-center w-10 h-5 shrink-0 rounded-full transition-colors ${sendFallbackToSms ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`absolute w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all duration-300 ${sendFallbackToSms ? 'right-1' : 'left-1'}`} />
                      </div>
                      <span className="text-xs font-bold text-rose-700 select-none leading-relaxed">
                        في حال فشل الواتساب يتم الإرسال عبر الرسائل النصية تلقائيًا
                      </span>
                    </label>
                  )}
                  <button type="button" onClick={() => sendWaitingBulk()} disabled={selectedSendRows.length === 0} className="w-full flex items-center justify-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                    <Send size={15} />
                    إرسال المحددين
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock size={19} className="text-[#655ac1]" />
                    <div>
                      <h3 className="text-sm font-black text-slate-800">جدولة الإرسال لوقت لاحق</h3>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">بنفس خيار الإرسال الحالي</p>
                    </div>
                  </div>
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 cursor-pointer">
                    <span className="text-sm font-black text-slate-700">تفعيل الجدولة</span>
                    <input type="checkbox" checked={sendScheduleEnabled} onChange={e => setSendScheduleEnabled(e.target.checked)} className="w-5 h-5 accent-[#655ac1]" />
                  </label>
                  <input
                    type="datetime-local"
                    value={sendScheduledAt}
                    onChange={e => setSendScheduledAt(e.target.value)}
                    disabled={!sendScheduleEnabled}
                    className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl outline-none focus:border-[#655ac1] disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <Link2 size={19} className="text-[#655ac1]" />
                      <h3 className="text-sm font-black text-slate-800">المعاينة والروابط</h3>
                    </div>
                    <button type="button" onClick={() => setShowSendRecipientsPreview(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
                      <Users size={13} /> معاينة المستلمين
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <p className="text-xl font-black text-[#655ac1]">{sendRows.length}</p>
                      <p className="text-[10px] font-bold text-slate-400">تكليف</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <p className="text-xl font-black text-emerald-600">{selectedSendRows.length}</p>
                      <p className="text-[10px] font-bold text-slate-400">محدد</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <p className="text-xl font-black text-amber-600">{sendRows.filter(r => !r.asgn.signatureData).length}</p>
                      <p className="text-[10px] font-bold text-slate-400">بانتظار التوقيع</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const first = selectedSendRows[0] || sendRows[0];
                      if (!first) { showToast('لا توجد حصص انتظار لمعاينتها', 'warning'); return; }
                      setPreviewAssignment(first.asgn);
                      setHasSignature(false);
                      setShowElectronicPreview(true);
                    }}
                    disabled={sendRows.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#655ac1] text-white text-sm font-bold hover:bg-[#5046a0] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Eye size={15} /> معاينة التكليف
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <MessageSquare size={19} className="text-[#655ac1]" />
                      <h3 className="text-sm font-black text-slate-800">نص الرسالة</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => { const text = selectedSendRows.map(r => r.message).join('\n\n────────────────────\n\n'); navigator.clipboard?.writeText(text); showToast('تم نسخ رسائل المحددين', 'success'); }}
                      disabled={selectedSendRows.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold disabled:opacity-40"
                    >
                      <Copy size={13} /> نسخ المحدد
                    </button>
                  </div>
                  <textarea
                    value={selectedSendRows[0]?.message || sendRows[0]?.message || ''}
                    readOnly
                    rows={6}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium outline-none resize-none leading-relaxed"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Zone 1: Controls + Template */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { const text = sendRows.map(r => r.message).join('\n\n────────────────────\n\n'); navigator.clipboard?.writeText(text); showToast('تم نسخ جميع الرسائل', 'success'); }}
                      disabled={sendRows.length === 0}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold transition-all disabled:opacity-40"
                    ><Copy size={13} /> نسخ الكل</button>
                    <button
                      onClick={() => { setSendCustomMessages({}); setSendMasterTemplate(''); showToast('تمت استعادة القوالب', 'success'); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-500 text-xs font-bold transition-all"
                    ><RefreshCw size={13} /></button>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">قالب موحد — اكتب رسالة وطبّقها على الجميع</label>
                    <textarea
                      value={sendMasterTemplate}
                      onChange={e => setSendMasterTemplate(e.target.value)}
                      placeholder={sendModalMode === 'electronic'
                        ? 'اكتب نصاً (سيُضاف رابط التوقيع تلقائياً) واضغط (اعتماد للكل)…'
                        : 'اكتب نصاً واضغط (اعتماد للكل) لتطبيقه على جميع الرسائل…'}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:ring-2 focus:ring-[#655ac1]/20 focus:border-[#655ac1] outline-none resize-none leading-relaxed"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!sendMasterTemplate.trim()) return;
                      const next: Record<string, string> = {};
                      sendRows.forEach(r => { next[r.key] = sendMasterTemplate; });
                      setSendCustomMessages(next);
                      showToast('تم اعتماد القالب على جميع الرسائل', 'success');
                    }}
                    disabled={!sendMasterTemplate.trim()}
                    className="mt-6 flex items-center gap-2 bg-[#655ac1] hover:bg-[#4e44a6] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  ><Check size={15} /> اعتماد للكل</button>
                </div>
              </div>

              {/* Zone 2: Action Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                  <div>
                    <p className="text-sm font-black text-slate-800">إسناد الانتظار</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {sendRows.length > 0 ? `${sendRows.length} إسناد • ${sendSelectedIds.size > 0 ? `${sendSelectedIds.size} محدد` : 'لم يتم التحديد'}` : 'لا توجد إسنادات لهذا اليوم'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSendTable(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold transition-all"
                    >
                      {showSendTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {showSendTable ? 'إخفاء الجدول' : 'إظهار الجدول'}
                    </button>
                    <button
                      onClick={() => {
                        const targets = sendRows.filter(r => sendSelectedIds.has(r.key));
                        if (!targets.length) { showToast('لم يتم تحديد أي تكليف', 'warning'); return; }
                        targets.forEach((r, i) => {
                          if (r.asgn.substitutePhone) {
                            setTimeout(() => dispatchMessage(r.asgn, personalizeWaitingMessage(r.message, r.asgn), 'whatsapp', sendModalMode), i * 350);
                          }
                        });
                        showToast(`تم فتح ${targets.filter(r => r.asgn.substitutePhone).length} رسالة واتساب`, 'success');
                      }}
                      disabled={sendSelectedIds.size === 0}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] text-xs font-bold transition-all border border-[#25D366]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    ><WhatsAppIcon size={14} /> واتساب للكل {sendSelectedIds.size > 0 && `(${sendSelectedIds.size})`}</button>
                    <button
                      onClick={() => {
                        const targets = sendRows.filter(r => sendSelectedIds.has(r.key));
                        if (!targets.length) { showToast('لم يتم تحديد أي تكليف', 'warning'); return; }
                        targets.forEach(r => {
                          if (r.asgn.substitutePhone) {
                            dispatchMessage(r.asgn, personalizeWaitingMessage(r.message, r.asgn), 'sms', sendModalMode);
                          }
                        });
                        showToast(`تم فتح ${targets.filter(r => r.asgn.substitutePhone).length} رسالة نصية`, 'success');
                      }}
                      disabled={sendSelectedIds.size === 0}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] text-xs font-bold transition-all border border-[#007AFF]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    ><Send size={13} /> نصية للكل {sendSelectedIds.size > 0 && `(${sendSelectedIds.size})`}</button>
                  </div>
                </div>

                {showSendTable ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-4 py-3 w-10">
                            <button onClick={toggleAllSendRows} className={`w-5 h-5 rounded flex items-center justify-center border ${allSendRowsSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 hover:border-[#655ac1]'}`}>
                              {allSendRowsSelected && <Check size={11} />}
                            </button>
                          </th>
                          <th className="px-3 py-3 font-black text-slate-500 text-xs w-8">م</th>
                          <th className="px-3 py-3 font-black text-slate-700 text-xs min-w-[130px]">المعلم البديل</th>
                          <th className="px-3 py-3 font-black text-slate-700 text-xs text-center w-16">الحصة</th>
                          <th className="px-3 py-3 font-black text-slate-700 text-xs min-w-[100px]">الصف والفصل</th>
                          <th className="px-3 py-3 font-black text-slate-700 text-xs min-w-[110px]">بدلاً عن</th>
                          <th className="px-3 py-3 font-black text-slate-700 text-xs">الرسالة</th>
                          <th className="px-3 py-3 font-black text-slate-700 text-xs text-center w-28">الإجراءات</th>
                          <th className="px-3 py-3 font-black text-slate-700 text-xs text-center w-28">التوقيع</th>
                          <th className="px-3 py-3 font-black text-slate-700 text-xs text-center w-24">حالة الإرسال</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sendRows.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="text-center py-14">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-1">
                                  <Send size={26} className="text-slate-300" />
                                </div>
                                <p className="text-sm font-black text-slate-500">لا توجد حصص انتظار مسندة لهذا اليوم</p>
                                <p className="text-xs font-medium text-slate-400">يُرجى تسجيل غياب معلم وتوزيع حصص الانتظار أولاً</p>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                        {sendRows.map((row, idx) => {
                          const { asgn } = row;
                          const checked = sendSelectedIds.has(row.key);
                          const isSent = asgn.status !== 'pending';
                          return (
                            <tr key={row.key} className={`hover:bg-slate-50/60 transition-colors ${checked ? 'bg-[#f3f0ff]/60' : ''}`}>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => setSendSelectedIds(prev => { const n = new Set(prev); n.has(row.key) ? n.delete(row.key) : n.add(row.key); return n; })}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${checked ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent hover:border-[#655ac1]'}`}
                                ><Check size={11} strokeWidth={3.5} /></button>
                              </td>
                              <td className="px-3 py-3 text-slate-400 font-bold text-xs text-center">{idx + 1}</td>
                              <td className="px-3 py-3"><span className="font-bold text-slate-800 text-sm">{asgn.substituteTeacherName}</span></td>
                              <td className="px-3 py-3 text-center">
                                <span className="inline-block bg-[#e5e1fe] text-[#655ac1] px-2 py-0.5 rounded-lg text-xs font-black">{asgn.periodNumber}</span>
                              </td>
                              <td className="px-3 py-3"><span className="text-sm font-medium text-slate-700">{asgn.className}</span></td>
                              <td className="px-3 py-3"><span className="text-sm font-medium text-slate-600">{asgn.absentTeacherName}</span></td>
                              <td className="px-3 py-2 min-w-[280px]">
                                <textarea
                                  value={row.message}
                                  onChange={e => setSendCustomMessages(prev => ({ ...prev, [row.key]: e.target.value }))}
                                  rows={3}
                                  className="w-full text-xs font-medium text-slate-600 leading-relaxed bg-slate-50 border border-transparent hover:border-slate-200 focus:border-[#655ac1]/30 focus:ring-1 focus:ring-[#655ac1]/10 focus:bg-white rounded-lg px-2 py-1.5 outline-none resize-y min-h-[52px] max-h-[120px] transition-all"
                                />
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  <button
                                    onClick={() => {
                                      if (!asgn.substitutePhone) { showToast('لا يوجد رقم هاتف', 'warning'); return; }
                                      dispatchMessage(asgn, personalizeWaitingMessage(row.message, asgn), 'whatsapp', sendModalMode);
                                    }}
                                    title="واتساب"
                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all active:scale-90"
                                  ><WhatsAppIcon size={15} /></button>
                                  <button
                                    onClick={() => {
                                      if (!asgn.substitutePhone) { showToast('لا يوجد رقم هاتف', 'warning'); return; }
                                      dispatchMessage(asgn, personalizeWaitingMessage(row.message, asgn), 'sms', sendModalMode);
                                    }}
                                    title="رسالة نصية"
                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#007AFF]/10 hover:bg-[#007AFF]/25 border border-[#007AFF]/20 transition-all active:scale-90"
                                  ><Send size={13} className="text-[#007AFF]" /></button>
                                  <button
                                    onClick={() => { navigator.clipboard?.writeText(row.message); showToast('تم نسخ الرسالة', 'success'); }}
                                    title="نسخ الرسالة"
                                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                                  ><Copy size={14} /></button>
                                  {sendModalMode === 'electronic' && (
                                    <button
                                      onClick={() => {
                                        setPreviewAssignment(asgn);
                                        setHasSignature(false);
                                        setShowElectronicPreview(true);
                                      }}
                                      title="معاينة صفحة التوقيع"
                                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#655ac1]/10 hover:bg-[#655ac1]/20 text-[#655ac1] transition-all active:scale-90"
                                    ><Eye size={14} /></button>
                                  )}
                                </div>
                              </td>
                              {/* Signature status column */}
                              <td className="px-3 py-3 text-center">
                                {asgn.signatureData ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <img src={asgn.signatureData} alt="توقيع" className="h-8 max-w-[80px] object-contain border border-emerald-200 rounded bg-white" />
                                    <span className="text-[9px] text-emerald-600 font-bold">✅ موقّع</span>
                                  </div>
                                ) : asgn.sendType === 'electronic' ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center animate-pulse">
                                      <Hourglass size={14} className="text-amber-500" />
                                    </div>
                                    <span className="text-[9px] text-amber-600 font-bold">بانتظار التوقيع</span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-slate-300 font-bold">لم يُرسل</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full ${isSent ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                                  {isSent ? '✅ تم' : '⏳ لم يتم'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 border-t border-slate-100">
                    <p className="text-sm font-medium text-slate-500">لا توجد حصص انتظار مسندة لهذا اليوم</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* ════════════════════════════════════════════
          MODAL: معاينة الانتظار الإلكتروني (صفحة التوقيع)
      ════════════════════════════════════════════ */}
      {showElectronicPreview && previewAssignment && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm"
          dir="rtl"
          onClick={() => setShowElectronicPreview(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-white border border-slate-200 shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <Eye size={22} className="text-[#655ac1] shrink-0" />
                <h3 className="font-black text-slate-800">معاينة التكليف</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowElectronicPreview(false)}
                className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="block text-slate-500 font-bold mb-1">الاسم</span>
                    <span className="font-black text-slate-800">{previewAssignment.substituteTeacherName}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 font-bold mb-1">الصفة</span>
                    <span className="font-black text-[#655ac1]">{roleLabelFor(previewAssignment.substituteTeacherId)}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 font-bold mb-1">رقم الجوال</span>
                    <span className="font-black text-slate-800" dir="ltr">{previewAssignment.substitutePhone || 'غير مسجل'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white border-b border-slate-100">
                      <th className="px-3 py-2 text-right text-[#655ac1] font-black">اليوم</th>
                      <th className="px-3 py-2 text-right text-[#655ac1] font-black">التاريخ</th>
                      <th className="px-3 py-2 text-right text-[#655ac1] font-black">الحصة</th>
                      <th className="px-3 py-2 text-right text-[#655ac1] font-black">الفصل</th>
                      <th className="px-3 py-2 text-right text-[#655ac1] font-black">المعلم الغائب</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2 font-black text-slate-700">{dayName}</td>
                      <td className="px-3 py-2 font-bold text-slate-600">{formatDateNumeric(selectedDate, (schoolInfo.calendarType || 'hijri') as 'hijri' | 'gregorian')}</td>
                      <td className="px-3 py-2 font-bold text-slate-600">الحصة {previewAssignment.periodNumber}</td>
                      <td className="px-3 py-2 font-bold text-slate-600">{previewAssignment.className}</td>
                      <td className="px-3 py-2 font-bold text-slate-600">{previewAssignment.absentTeacherName}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm font-black text-slate-700">
                تم الاطلاع على حصة الانتظار المسندة والتوقيع بالعلم.
              </p>
              <div className="rounded-2xl border-2 border-dashed border-[#655ac1]/30 bg-slate-50 h-32 flex items-center justify-center text-xs font-bold text-slate-300">
                {previewAssignment.signatureData ? (
                  <img src={previewAssignment.signatureData} alt="توقيع المعلم" className="max-h-24 max-w-[260px] object-contain" />
                ) : (
                  'خانة التوقيع'
                )}
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
                زر الإرسال والتوقيع يعملان عند فتح الرابط من قبل المنتظر.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════════════════════════════════════════
          MODAL: تقارير الانتظار (NEW DESIGN)
      ════════════════════════════════════════════ */}
      {showReportsModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" dir="rtl" onClick={() => setShowReportsModal(false)}>
          <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

            {/* ── Header ── */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <FileText size={24} className="text-[#655ac1]" />
                <div>
                  <h2 className="text-xl font-black text-slate-800">تقارير الانتظار</h2>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">تقارير حصص الانتظار اليومي للمنتظرين</p>
                </div>
              </div>
              <button
                onClick={() => setShowReportsModal(false)}
                className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {/* ── Scrollable Content ── */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">

              {/* ── بطاقات إحصائية ── */}
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                <div className="mb-5">
                  <h3 className="text-base font-black text-slate-800">ملخص الانتظار</h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">إجمالي حصص الانتظار المسندة في الأسبوع والشهر الحاليين</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl p-5 text-center">
                    <p className="text-3xl font-black text-[#655ac1]">{rptWeekTotal}</p>
                    <p className="text-sm font-bold text-slate-600 mt-1">انتظار الأسبوع</p>
                  </div>
                  <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl p-5 text-center">
                    <p className="text-3xl font-black text-[#655ac1]">{rptMonthTotal}</p>
                    <p className="text-sm font-bold text-slate-600 mt-1">انتظار الشهر</p>
                  </div>
                </div>
              </div>

              {/* ── تحديد الفترة الزمنية ── */}
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                <p className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
                  <Calendar size={17} className="text-[#655ac1]" /> تحديد الفترة الزمنية
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">من تاريخ</label>
                    <DatePicker
                      value={rptFromDate}
                      onChange={(date: DateObject | DateObject[] | null) => {
                        if (!date) {
                          setRptFromDate('');
                          return;
                        }
                        const selectedDate = Array.isArray(date) ? date[0] : date;
                        if (selectedDate) {
                          setRptFromDate(selectedDate.convert(gregorian, gregorian_en).format('YYYY-MM-DD'));
                        } else {
                          setRptFromDate('');
                        }
                      }}
                      calendar={arabic}
                      locale={arabic_ar}
                      containerClassName="w-full"
                      inputClass="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1] transition-all text-right"
                      placeholder="حدد التاريخ"
                      portal
                      portalTarget={document.body}
                      editable={false}
                      zIndex={99999}
                    />
                    {rptFromDate && (
                      <p className="text-xs text-[#655ac1] font-bold mt-1">
                        {rptCalType === 'hijri'
                          ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(rptFromDate))
                          : new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(rptFromDate))}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">إلى تاريخ</label>
                    <DatePicker
                      value={rptToDate}
                      onChange={(date: DateObject | DateObject[] | null) => {
                        if (!date) {
                          setRptToDate('');
                          return;
                        }
                        const selectedDate = Array.isArray(date) ? date[0] : date;
                        if (selectedDate) {
                          setRptToDate(selectedDate.convert(gregorian, gregorian_en).format('YYYY-MM-DD'));
                        } else {
                          setRptToDate('');
                        }
                      }}
                      calendar={arabic}
                      locale={arabic_ar}
                      containerClassName="w-full"
                      inputClass="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1] transition-all text-right"
                      placeholder="حدد التاريخ"
                      portal
                      portalTarget={document.body}
                      editable={false}
                      zIndex={99999}
                    />
                    {rptToDate && (
                      <p className="text-xs text-[#655ac1] font-bold mt-1">
                        {rptCalType === 'hijri'
                          ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(rptToDate))
                          : new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(rptToDate))}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── اختيار المنتظر ── */}
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                <p className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
                  <Users size={17} className="text-[#655ac1]" /> اختيار المنتظر
                </p>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 w-fit mb-4">
                  <button
                    onClick={() => { setRptStaffMode('all'); setRptSelectedIds(new Set()); }}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${rptStaffMode === 'all' ? 'bg-white shadow-sm text-[#655ac1]' : 'text-slate-500 hover:text-slate-700'}`}
                  >كل المنتظرين</button>
                  <button
                    onClick={() => setRptStaffMode('specific')}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${rptStaffMode === 'specific' ? 'bg-white shadow-sm text-[#655ac1]' : 'text-slate-500 hover:text-slate-700'}`}
                  >منتظر محدد</button>
                </div>

                {rptStaffMode === 'specific' && (
                  <div className="relative max-w-sm">
                    <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ابحث عن منتظر..."
                      value={rptSearch}
                      onChange={e => setRptSearch(e.target.value)}
                      onFocus={() => setRptDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setRptDropdownOpen(false), 200)}
                      className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1]"
                    />
                    {rptDropdownOpen && (
                      <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-100 max-h-56 overflow-y-auto z-[99]">
                        {allWaitingStaff.filter(s => s.name.includes(rptSearch)).map(s => (
                          <button
                            key={s.id}
                            onMouseDown={() => {
                              setRptSelectedIds(prev => {
                                const next = new Set(prev);
                                next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                                return next;
                              });
                            }}
                            className="w-full text-right px-4 py-2.5 hover:bg-slate-50 text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0 flex items-center justify-between gap-3 transition-colors"
                          >
                            <span>{s.name}</span>
                            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              rptSelectedIds.has(s.id) ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                            }`}>
                              <Check size={12} strokeWidth={3.5} />
                            </span>
                          </button>
                        ))}
                        {allWaitingStaff.filter(s => s.name.includes(rptSearch)).length === 0 && (
                          <div className="p-4 text-center text-sm text-slate-500">لا توجد نتائج</div>
                        )}
                      </div>
                    )}
                    {rptSelectedIds.size > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {Array.from(rptSelectedIds).map(id => {
                          const s = allWaitingStaff.find(x => x.id === id);
                          return s ? (
                            <span key={id} className="flex items-center gap-1.5 text-xs font-bold text-[#655ac1] bg-[#e5e1fe]/60 px-3 py-1.5 rounded-lg">
                              {s.name}
                              <button onClick={() => setRptSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; })} className="hover:bg-[#655ac1]/20 p-0.5 rounded-full"><X size={11}/></button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── جدول بيانات المنتظرين ── */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <div>
                    <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <FileText size={15} className="text-[#655ac1]" />
                      بيانات الانتظار
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {rptFromDate && rptToDate ? `من ${new Date(rptFromDate).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })} إلى ${new Date(rptToDate).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'كل البيانات'}
                    </p>
                  </div>
                  <button
                    onClick={handleWaitingReportPrint}
                    className="flex items-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#655ac1]/20 transition-all active:scale-95 shrink-0"
                  >
                    <Printer size={15} /> طباعة التقرير
                  </button>
                </div>
                {rptTableData.length === 0 ? (
                  <div className="text-center text-slate-400 py-16 font-bold">
                    <FileText size={40} className="mx-auto mb-3 opacity-30" />
                    لا توجد بيانات في الفترة الزمنية المحددة
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="bg-[#655ac1] text-white font-black px-4 py-3 text-right" style={{ borderLeft: '1px solid #7c6fcf' }}>المنتظر</th>
                          <th className="bg-[#655ac1] text-white font-black px-4 py-3 text-center" style={{ borderLeft: '1px solid #7c6fcf', width: 120 }}>نصاب الانتظار</th>
                          <th className="bg-[#655ac1] text-white font-black px-4 py-3 text-center" style={{ borderLeft: '1px solid #7c6fcf', width: 130 }}>الانتظار المسند</th>
                          <th className="bg-[#5046a0] text-white font-black px-4 py-3 text-center">الحصص المسندة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rptTableData.map((row, idx) => {
                          const sortedPeriods = [...new Set(row.periods)].sort((a, b) => a - b);
                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="px-4 py-3 font-bold text-slate-800">{row.name}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-block bg-[#e5e1fe] text-[#655ac1] font-black px-3 py-1 rounded-full text-xs">
                                  {row.quota || '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-block bg-[#655ac1] text-white font-black px-3 py-1 rounded-full text-sm">
                                  {row.totalAssigned}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex flex-wrap gap-1.5 justify-center">
                                  {sortedPeriods.map(p => (
                                    <span key={p} className="inline-block bg-slate-100 border border-slate-300 text-slate-700 font-black px-2.5 py-0.5 rounded-full text-xs">{p}</span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-100 border-t-2 border-slate-200">
                          <td className="px-4 py-3 font-black text-slate-600">الإجمالي</td>
                          <td className="px-4 py-3 text-center text-slate-400">—</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block bg-[#655ac1] text-white font-black px-3 py-1 rounded-full">
                              {rptTableData.reduce((s, r) => s + r.totalAssigned, 0)}
                            </span>
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>


            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══════ Balance Modal ══════ */}
      {showBalanceModal && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowBalanceModal(false); }}
        >
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <Scale size={22} className="text-[#655ac1]" />
                رصيد الانتظار الأسبوعي
              </h2>
              <button
                onClick={() => setShowBalanceModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Summary stats + Reset */}
            {(() => {
              const wtTeachers = teachers.filter(t => (t.waitingQuota || 0) > 0);
              const totalWQ = wtTeachers.reduce((s, t) => s + (t.waitingQuota || 0), 0);
              const totalAQ = wtTeachers.reduce((s, t) => s + (weeklyQuota.counts[t.id] || 0), 0);
              const totalBal = totalWQ - totalAQ;
              const statCards = [
                { label: 'إجمالي المعلمون',         value: wtTeachers.length, color: 'text-[#655ac1]' },
                { label: 'إجمالي نصاب الانتظار',   value: totalWQ,           color: 'text-amber-700' },
                { label: 'إجمالي الانتظار المسند', value: totalAQ,           color: 'text-emerald-700' },
                { label: 'إجمالي رصيد الانتظار',   value: totalBal,          color: totalBal < 0 ? 'text-rose-700' : 'text-blue-700' },
              ];
              return (
                <div className="px-6 pt-5 pb-4 shrink-0">
                  {/* Stat cards only */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {statCards.map(s => (
                      <div key={s.label} className="bg-slate-50 border border-slate-300 rounded-2xl p-4 text-center">
                        <p className="text-xs font-bold text-slate-500 mb-1">{s.label}</p>
                        <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* شريط الأكثر/الأقل + زر التصفير */}
                  {(() => {
                    const sorted = wtTeachers
                      .map(t => ({ t, assigned: weeklyQuota.counts[t.id] || 0, quota: t.waitingQuota || 0 }))
                      .sort((a, b) => b.assigned - a.assigned);
                    const topN = sorted.slice(0, 2);
                    const btmN = [...sorted].reverse().slice(0, 2);
                    return (
                      <div className="flex flex-wrap items-stretch gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">

                        {/* الأكثر إسناداً */}
                        <div className="flex-1 min-w-[170px]">
                          <p className="text-xs font-black text-rose-600 mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                            الأكثر إسناداً
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {topN.map(({ t, assigned, quota }, i) => (
                              <div key={t.id} className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-700 flex-1">{i + 1}. {t.name}</span>
                                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                  assigned >= quota ? 'bg-rose-100 text-rose-700' :
                                  assigned >= quota * 0.5 ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>{assigned}/{quota}</span>
                              </div>
                            ))}
                          </div>
                          {sorted.length > 2 && (
                            <button
                              onClick={() => setShowRankModal('top')}
                              className="mt-2 text-[11px] font-bold text-rose-500 hover:text-rose-700 hover:underline transition-colors"
                            >
                              عرض الكل ←
                            </button>
                          )}
                        </div>

                        <div className="w-px bg-slate-200 rounded-full shrink-0" />

                        {/* الأقل إسناداً */}
                        <div className="flex-1 min-w-[170px]">
                          <p className="text-xs font-black text-emerald-600 mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                            الأقل إسناداً
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {btmN.map(({ t, assigned, quota }, i) => (
                              <div key={t.id} className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-700 flex-1">{i + 1}. {t.name}</span>
                                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{assigned}/{quota}</span>
                              </div>
                            ))}
                          </div>
                          {sorted.length > 2 && (
                            <button
                              onClick={() => setShowRankModal('bottom')}
                              className="mt-2 text-[11px] font-bold text-emerald-600 hover:text-emerald-800 hover:underline transition-colors"
                            >
                              عرض الكل ←
                            </button>
                          )}
                        </div>

                        <div className="w-px bg-slate-200 rounded-full shrink-0" />

                        {/* زر التصفير */}
                        <div className="flex flex-col justify-center gap-2 shrink-0">
                          {resetConfirmStep === 'idle' ? (
                            <button
                              onClick={() => setResetConfirmStep('confirm')}
                              className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl px-4 py-2.5 transition-all active:scale-95 group"
                            >
                              <RefreshCw size={15} className="text-rose-500" />
                              <span className="text-sm font-bold text-rose-600 whitespace-nowrap">إعادة ضبط</span>
                            </button>
                          ) : (
                            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex flex-col gap-2">
                              <p className="text-xs font-black text-rose-700 whitespace-nowrap">تأكيد التصفيѿ</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setResetConfirmStep('idle')}
                                  className="flex-1 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl py-1.5 px-2 hover:bg-slate-50 transition-colors"
                                >إلغاء</button>
                                <button
                                  onClick={() => {
                                    const weekKey = getISOWeekKey(selectedDate);
                                    setWeeklyQuota({ weekKey, counts: {}, lastResetDate: getTodayStr() });
                                    setResetConfirmStep('idle');
                                    showToast('✅ تم تصفير الانتظار', 'success');
                                  }}
                                  className="flex-1 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl py-1.5 px-2 transition-colors"
                                >تأكيد</button>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })()}

                </div>
              );
            })()}

            {/* Teachers table */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {(() => {
                const wtTeachers = teachers
                  .filter(t => (t.waitingQuota || 0) > 0)
                  .sort((a, b) => {
                    const bA = (a.waitingQuota || 0) - (weeklyQuota.counts[a.id] || 0);
                    const bB = (b.waitingQuota || 0) - (weeklyQuota.counts[b.id] || 0);
                    return bB - bA;
                  });
                if (wtTeachers.length === 0) {
                  return (
                    <div className="text-center text-slate-400 py-16 font-bold">
                      <Users size={40} className="mx-auto mb-3 opacity-30" />
                      <p>لا يوجد معلمون بنصاب انتظار مُحدَّد</p>
                    </div>
                  );
                }
                return (
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        {['م', 'المعلم', 'نصاب الانتظار', 'الانتظار المسند', 'رصيد الانتظار'].map((h, i) => (
                          <th
                            key={i}
                            className="bg-[#655ac1] text-white font-black px-4 py-3 text-right"
                            style={{ borderLeft: i < 4 ? '1px solid #7c6fcf' : undefined }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {wtTeachers.map((t, idx) => {
                        const quota    = t.waitingQuota || 0;
                        const assigned = weeklyQuota.counts[t.id] || 0;
                        const balance  = quota - assigned;
                        const pct      = quota > 0 ? assigned / quota : 0;
                        const rowBg = pct >= 1
                          ? 'bg-rose-50'
                          : pct >= 0.5
                            ? 'bg-amber-50'
                            : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                        return (
                          <tr key={t.id} className={rowBg}>
                            <td className="px-4 py-3 text-center text-slate-400 font-bold w-12">{idx + 1}</td>
                            <td className="px-4 py-3 font-bold text-slate-800">
                              <div className="flex items-center gap-2">
                                {pct >= 1 && (
                                  <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
                                    ⚠️ اكتمل النصاب
                                  </span>
                                )}
                                {pct >= 0.5 && pct < 1 && (
                                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
                                    ⚠️ تجاوز النصف
                                  </span>
                                )}
                                {t.name}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block bg-[#e5e1fe] text-[#655ac1] font-black px-3 py-1 rounded-full">{quota}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`inline-block font-black px-3 py-1 rounded-full ${
                                  pct >= 1 ? 'bg-rose-100 text-rose-600' : pct >= 0.5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                                }`}>{assigned}</span>
                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      pct >= 1 ? 'bg-rose-400' : pct >= 0.5 ? 'bg-amber-400' : 'bg-emerald-400'
                                    }`}
                                    style={{ width: `${Math.min(pct * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block font-black px-3 py-1 rounded-full ${
                                balance <= 0 ? 'bg-rose-100 text-rose-600' : balance <= 2 ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700'
                              }`}>{balance}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ══════ Rank Modal ══════ */}
      {showRankModal !== null && (() => {
        const sorted = teachers
          .filter(t => (t.waitingQuota || 0) > 0)
          .map(t => ({ t, assigned: weeklyQuota.counts[t.id] || 0, quota: t.waitingQuota || 0 }))
          .sort((a, b) => b.assigned - a.assigned);
        const list = showRankModal === 'top' ? sorted : [...sorted].reverse();
        const isTop = showRankModal === 'top';
        return ReactDOM.createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center z-[99999]"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={() => setShowRankModal(null)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col"
              style={{ maxHeight: '80vh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-5 py-4 ${isTop ? 'bg-rose-50 border-b border-rose-100' : 'bg-emerald-50 border-b border-emerald-100'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${isTop ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                  <h3 className={`text-sm font-black ${isTop ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {isTop ? 'الأكثر إسناداً — الترتيب الكامل' : 'الأقل إسناداً — الترتيب الكامل'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowRankModal(null)}
                  className="w-7 h-7 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              {/* List */}
              <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-1.5">
                {list.map(({ t, assigned, quota }, i) => {
                  const pct = quota > 0 ? assigned / quota : 0;
                  const rowBg = pct >= 1 ? 'bg-rose-50' : pct >= 0.5 ? 'bg-amber-50' : '';
                  const badgeCls = pct >= 1
                    ? 'bg-rose-100 text-rose-700'
                    : pct >= 0.5
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700';
                  return (
                    <div key={t.id} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl ${rowBg}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-black text-slate-400 w-5 text-left shrink-0">{i + 1}</span>
                        <span className="text-sm font-bold text-slate-800 truncate">{t.name}</span>
                      </div>
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-full shrink-0 ${badgeCls}`}>
                        {assigned}/{quota}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* ══════ Print Modal ══════ */}
      {showPrintModal && (
        <DailyWaitingPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          dayName={getArabicDayFromDate(selectedDate)}
          gregorianDateStr={formatGregorian(selectedDate)}
          hijriDateStr={formatHijri(selectedDate)}
          schoolInfo={schoolInfo}
          absentTeachers={currentSession?.absentTeachers || []}
          assignments={(currentSession?.assignments || []).filter(a => !isWaitingSlotDisabled(a.absentTeacherId, a.periodNumber))}
          targetTeacherId={printTargetTeacherId}
          targetTeacherIds={printTargetTeacherIds}
          initialTab={printInitialTab}
          colorMode={printInitialTab === 'blank' ? blankPrintColorMode : waitingPrintColorMode}
          autoPrint
        />
      )}

    </div>
  );
};

export default DailyWaiting;
