import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, ClipboardList, ListFilter, RefreshCw, Search, Trash2 } from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import arabic from 'react-date-object/calendars/arabic';
import arabic_ar from 'react-date-object/locales/arabic_ar';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_ar from 'react-date-object/locales/gregorian_ar';
import gregorian_en from 'react-date-object/locales/gregorian_en';
import { ActionLog, LogActionType, SchoolInfo } from '../../types';
import { clearLogs, clearLogsByDelegate, clearLogsOlderThan, getLogs } from './auditLog';

const ACTION_TYPE_LABELS: Record<LogActionType, string> = {
  create: 'إنشاء',
  edit_permissions: 'تعديل الصلاحيات',
  activate: 'تفعيل',
  deactivate: 'إيقاف',
  delete: 'حذف',
  regenerate_otp: 'إعادة إصدار رمز',
  reset_account: 'إعادة تهيئة',
};

// ألوان نصّية لتمييز نوع العملية بصريًا (بلا خلفيات)
const ACTION_TYPE_TEXT: Record<LogActionType, string> = {
  create: 'text-emerald-600',
  edit_permissions: 'text-[#655ac1]',
  activate: 'text-sky-600',
  deactivate: 'text-amber-600',
  delete: 'text-rose-600',
  regenerate_otp: 'text-indigo-600',
  reset_account: 'text-orange-600',
};

const ACTION_TYPE_ORDER: LogActionType[] = [
  'create',
  'edit_permissions',
  'activate',
  'deactivate',
  'delete',
  'regenerate_otp',
  'reset_account',
];

// أسماء الأقسام/الصفحات (جاهزة لاستقبال كل وحدات المنصّة لاحقًا)
const MODULE_LABELS: Record<string, string> = {
  permissions: 'الصلاحيات والتفويض',
  settings_basic: 'بيانات المدرسة',
  settings_calendar: 'التقويم',
  settings_timing: 'التوقيت',
  settings_subjects: 'المواد',
  settings_classes: 'الفصول',
  settings_teachers: 'المعلمون',
  settings_admins: 'الإداريون',
  settings_students: 'الطلاب',
  schedule_assign: 'إسناد المواد',
  schedule_manage: 'الحصص والانتظار',
  supervision: 'الإشراف اليومي',
  duty: 'المناوبة اليومية',
  daily_waiting: 'الانتظار اليومي',
  messages: 'الرسائل',
  subscription: 'الاشتراك والفوترة',
  support: 'الدعم والمساعدة',
};

const moduleLabel = (module: string) => MODULE_LABELS[module] || module || '—';

// لا نعرض نوع الصلاحية (كاملة/مخصصة) في وصف العملية — يشمل السجلات القديمة المخزّنة
const visibleDetails = (details?: string) =>
  details && !details.includes('صلاحية كاملة') && !details.includes('صلاحية مخصصة') ? details : '';

const toYMD = (iso: string) => iso.slice(0, 10);

// تركيب التاريخ يدويًا (يوم/شهر/سنة) لتفادي انعكاس الاتجاه
const formatCalendarDate = (date: Date, hijri: boolean) => {
  const parts = new Intl.DateTimeFormat(
    hijri ? 'ar-SA-u-ca-islamic-umalqura-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn',
    { day: '2-digit', month: '2-digit', year: 'numeric' }
  ).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}/${get('month')}/${get('day')}`;
};

// الوقت ثم فترة الصباح/المساء بعده
const formatTimeOfDay = (date: Date) => {
  const parts = new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const period = get('dayPeriod');
  return `${get('hour')}:${get('minute')}${period ? ` ${period}` : ''}`;
};

interface DropdownOption {
  value: string;
  label: string;
}

// قائمة منسدلة بنفس تصميم قوائم المشروع (مرجع: «نوع الكيان» في بيانات المدرسة)
function Dropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selected = options.find((option) => option.value === value);

  return (
    <div className="relative w-full" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 py-2.5 font-bold text-slate-600 transition-all hover:border-[#655ac1]/30 hover:bg-slate-50"
      >
        <span className="truncate text-[13px] leading-tight">{selected?.label || 'الكل'}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 left-0 top-full z-30 mt-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xl animate-in slide-in-from-top-2">
          <div className="custom-scrollbar max-h-72 space-y-1 overflow-y-auto pr-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-right text-sm font-bold transition-all ${
                  value === option.value ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                }`}
              >
                <span className="truncate">{option.label}</span>
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                    value === option.value ? 'border-[#655ac1] bg-[#655ac1] text-white' : 'border-slate-300 bg-white text-transparent'
                  }`}
                >
                  <Check size={12} strokeWidth={3.5} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  schoolInfo?: SchoolInfo;
}

export default function ActionLogs({ schoolInfo }: Props) {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [search, setSearch] = useState('');
  const [delegateFilter, setDelegateFilter] = useState('all');
  const [actionTypeFilter, setActionTypeFilter] = useState<'all' | LogActionType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'all' | 'delegate' | 'older' | null>(null);
  const deleteMenuRef = useRef<HTMLDivElement>(null);

  // صيغة التقويم تتبع مرتكز الرئيسية (هجري/ميلادي) من schoolInfo.calendarType
  const isHijri = (schoolInfo?.calendarType ?? 'hijri') !== 'gregorian';
  const pickerCalendar = isHijri ? arabic : gregorian;
  const pickerLocale = isHijri ? arabic_ar : gregorian_ar;

  const fmtDayName = (iso: string) =>
    new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date(iso));

  // التاريخ بصيغة عرض التقويم، يوم/شهر/سنة والشهر رقمًا
  const fmtCalDate = (iso: string) => formatCalendarDate(new Date(iso), isHijri);

  const fmtTime = (iso: string) => formatTimeOfDay(new Date(iso));

  const fmtPickerLabel = (ymd: string) => formatCalendarDate(new Date(`${ymd}T12:00:00`), isHijri);

  const toPicker = (ymd: string) =>
    ymd
      ? new DateObject({ date: ymd, format: 'YYYY-MM-DD', calendar: gregorian, locale: gregorian_en }).convert(pickerCalendar, pickerLocale)
      : '';

  const fromPicker = (date: DateObject | DateObject[] | null) => {
    if (!date) return '';
    const selected = Array.isArray(date) ? date[0] : date;
    return selected ? selected.convert(gregorian, gregorian_en).format('YYYY-MM-DD') : '';
  };

  useEffect(() => {
    setLogs(getLogs());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(event.target as Node)) {
        setShowDeleteMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const uniqueTargets = Array.from(
    new Set(logs.map((log) => log.targetDelegateName).filter(Boolean))
  ) as string[];

  const filtered = logs.filter((log) => {
    const query = search.trim().toLowerCase();
    if (query && !(log.targetDelegateName ?? '').toLowerCase().includes(query)) return false;
    if (delegateFilter !== 'all' && log.targetDelegateName !== delegateFilter) return false;
    if (actionTypeFilter !== 'all' && log.actionType !== actionTypeFilter) return false;
    if (dateFrom && toYMD(log.timestamp) < dateFrom) return false;
    if (dateTo && toYMD(log.timestamp) > dateTo) return false;
    return true;
  });

  const hasActiveFilters =
    !!search || delegateFilter !== 'all' || actionTypeFilter !== 'all' || !!dateFrom || !!dateTo;
  const canDeleteOlderLogs = !!dateFrom && !!dateTo && delegateFilter === 'all';
  const canDeleteDelegateLogs = delegateFilter !== 'all' && !dateFrom && !dateTo;
  const canDeleteAllLogs = delegateFilter === 'all' && !dateFrom && !dateTo;

  const resetFilters = () => {
    setSearch('');
    setDelegateFilter('all');
    setActionTypeFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const handleDeleteLogs = () => {
    if (deleteMode === 'older' && dateTo) {
      clearLogsOlderThan(dateTo);
      setLogs(getLogs());
      resetFilters();
    }
    if (deleteMode === 'delegate' && delegateFilter !== 'all') {
      clearLogsByDelegate(delegateFilter);
      setLogs(getLogs());
      resetFilters();
    }
    if (deleteMode === 'all') {
      clearLogs();
      setLogs([]);
      resetFilters();
    }
    setDeleteMode(null);
    setShowDeleteMenu(false);
  };

  const deleteCopy =
    deleteMode === 'older' && dateTo
      ? {
          title: 'حذف السجلات الأقدم',
          body: (
            <>
              سيتم حذف السجلات التي تسبق تاريخ{' '}
              <span className="font-black text-slate-800">{fmtPickerLabel(dateTo)}</span>.
            </>
          ),
        }
      : deleteMode === 'delegate' && delegateFilter !== 'all'
        ? {
            title: 'حذف سجلات المفوّض',
            body: (
              <>
                سيتم حذف كل السجلات المرتبطة بالمفوّض <span className="font-black text-slate-800">"{delegateFilter}"</span>.
              </>
            ),
          }
        : {
            title: 'حذف كل السجلات',
            body: <>سيتم حذف سجل الإجراءات بالكامل.</>,
          };

  const actionTypeOptions: DropdownOption[] = [
    { value: 'all', label: 'كل العمليات' },
    ...ACTION_TYPE_ORDER.map((type) => ({ value: type, label: ACTION_TYPE_LABELS[type] })),
  ];

  const delegateOptions: DropdownOption[] = [
    { value: 'all', label: 'جميع المفوضين' },
    ...uniqueTargets.map((name) => ({ value: name, label: name })),
  ];

  const datePickerInputClass =
    'w-full bg-white border-2 border-slate-200 rounded-xl px-5 py-2.5 text-[13px] font-bold text-slate-600 outline-none focus:border-[#655ac1] transition-all cursor-pointer text-right';

  return (
    <div className="space-y-5" dir="rtl">
      {/* ─── Filters card ─── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h4 className="flex items-center gap-2 text-lg font-black text-slate-800">
              <ListFilter size={19} className="text-[#655ac1]" />
              تصفية السجلات
            </h4>
            {logs.length > 0 && (
              <span className="mr-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-black text-[#655ac1]">
                {logs.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-black text-slate-600 transition-all hover:border-[#655ac1] hover:bg-[#655ac1] hover:text-white disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
            >
              <RefreshCw size={15} />
              إعادة ضبط
            </button>

            <div className="relative" ref={deleteMenuRef}>
              <button
                type="button"
                onClick={() => setShowDeleteMenu((prev) => !prev)}
                disabled={logs.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-black text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                <Trash2 size={15} className="text-rose-500" />
                حذف السجلات
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showDeleteMenu ? 'rotate-180' : ''}`} />
              </button>

              {showDeleteMenu && (
                <div className="absolute left-0 top-full z-30 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl animate-in slide-in-from-top-2">
                  <button
                    type="button"
                    onClick={() => { setDeleteMode('older'); setShowDeleteMenu(false); }}
                    disabled={!canDeleteOlderLogs}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-right transition-all ${
                      canDeleteOlderLogs ? 'text-rose-600 hover:bg-slate-50' : 'cursor-not-allowed text-slate-300'
                    }`}
                  >
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center ${canDeleteOlderLogs ? 'text-rose-600' : 'text-rose-300'}`}>
                      <Trash2 size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black">حذف السجلات الأقدم</span>
                      <span className={`mt-0.5 block text-xs font-bold leading-5 ${canDeleteOlderLogs ? 'text-slate-500' : 'text-slate-400'}`}>
                        {canDeleteOlderLogs ? `قبل ${fmtPickerLabel(dateTo)}` : 'اختر التاريخ من وإلى للتفعيل'}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteMode('delegate'); setShowDeleteMenu(false); }}
                    disabled={!canDeleteDelegateLogs}
                    className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-right transition-all ${
                      canDeleteDelegateLogs ? 'text-rose-600 hover:bg-slate-50' : 'cursor-not-allowed text-slate-300'
                    }`}
                  >
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center ${canDeleteDelegateLogs ? 'text-rose-600' : 'text-rose-300'}`}>
                      <Trash2 size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black">حذف سجلات مفوّض</span>
                      <span className={`mt-0.5 block truncate text-xs font-bold leading-5 ${canDeleteDelegateLogs ? 'text-slate-500' : 'text-slate-400'}`}>
                        {canDeleteDelegateLogs ? delegateFilter : 'اختر مفوضاً للتفعيل'}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteMode('all'); setShowDeleteMenu(false); }}
                    disabled={!canDeleteAllLogs}
                    className={`mt-2 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-right transition-all ${
                      canDeleteAllLogs ? 'text-rose-600 hover:bg-slate-50' : 'cursor-not-allowed text-slate-300'
                    }`}
                  >
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center ${canDeleteAllLogs ? 'text-rose-600' : 'text-rose-300'}`}>
                      <Trash2 size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black">حذف كل السجلات</span>
                      <span className={`mt-0.5 block text-xs font-bold leading-5 ${canDeleteAllLogs ? 'text-slate-500' : 'text-slate-400'}`}>
                        {canDeleteAllLogs ? 'حذف سجل الإجراءات بالكامل' : 'امسح التاريخ والمفوّض للتفعيل'}
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* البحث */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">البحث</label>
            <div className="relative">
              <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث باسم المفوّض..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 bg-white py-2.5 pr-11 pl-4 text-[13px] font-bold text-slate-600 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 focus:border-[#655ac1]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">نوع العملية</label>
              <Dropdown
                value={actionTypeFilter}
                options={actionTypeOptions}
                onChange={(value) => setActionTypeFilter(value as 'all' | LogActionType)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">المفوّض</label>
              <Dropdown value={delegateFilter} options={delegateOptions} onChange={setDelegateFilter} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">من تاريخ</label>
              <DatePicker
                value={toPicker(dateFrom)}
                onChange={(date: DateObject | DateObject[] | null) => setDateFrom(fromPicker(date))}
                calendar={pickerCalendar}
                locale={pickerLocale}
                format="dddd YYYY/MM/DD"
                containerClassName="w-full"
                inputClass={datePickerInputClass}
                placeholder="حدد التاريخ"
                portal
                portalTarget={document.body}
                editable={false}
                zIndex={99999}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">إلى تاريخ</label>
              <DatePicker
                value={toPicker(dateTo)}
                onChange={(date: DateObject | DateObject[] | null) => setDateTo(fromPicker(date))}
                calendar={pickerCalendar}
                locale={pickerLocale}
                format="dddd YYYY/MM/DD"
                containerClassName="w-full"
                inputClass={datePickerInputClass}
                placeholder="حدد التاريخ"
                portal
                portalTarget={document.body}
                editable={false}
                zIndex={99999}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Logs card ─── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-[#655ac1]" />
            <h4 className="text-base font-black text-slate-800">سجل العمليات الإجرائية</h4>
            <span className="mr-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-black text-[#655ac1]">
              {filtered.length}
            </span>
          </div>
          {filtered.length > 0 && filtered.length < logs.length && (
            <span className="text-xs font-bold text-slate-400">
              عرض {filtered.length} من أصل {logs.length} عملية
            </span>
          )}
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 p-3 md:hidden">
          {filtered.map((log, index) => (
            <div key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-xs font-bold text-slate-400">
                  {index + 1}
                </span>
                <span className={`text-[13px] font-black ${ACTION_TYPE_TEXT[log.actionType]}`}>{ACTION_TYPE_LABELS[log.actionType]}</span>
                <span className="mr-auto rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                  {moduleLabel(log.module)}
                </span>
              </div>
              <p className={`mt-3 text-[13px] font-bold ${ACTION_TYPE_TEXT[log.actionType]}`}>{log.action}</p>
              {visibleDetails(log.details) && <p className="mt-1 text-xs leading-6 text-slate-400">{visibleDetails(log.details)}</p>}

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-[11px] font-bold text-slate-400">المفوّض</p>
                  <p className="mt-1 text-[13px] font-bold text-slate-700">{log.targetDelegateName || '—'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-[11px] font-bold text-slate-400">اليوم</p>
                  <p className="mt-1 text-[12px] font-bold text-slate-600">{fmtDayName(log.timestamp)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-[11px] font-bold text-slate-400">التاريخ</p>
                  <p className="mt-1 text-[12px] font-bold text-slate-600">{fmtCalDate(log.timestamp)}</p>
                </div>
                <div className="col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-[11px] font-bold text-slate-400">الوقت</p>
                  <p className="mt-1 text-[12px] font-bold text-slate-600">{fmtTime(log.timestamp)}</p>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && <EmptyState hasLogs={logs.length > 0} />}
        </div>

        {/* Desktop table */}
        <div className="hidden p-4 md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] table-fixed border-separate border-spacing-0 overflow-hidden rounded-2xl border border-slate-100 text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="w-12 px-3 py-4 text-center text-xs font-black text-[#655ac1]">م</th>
                  <th className="w-[10%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">اليوم</th>
                  <th className="w-[12%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">التاريخ</th>
                  <th className="w-[11%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">الوقت</th>
                  <th className="w-[13%] px-3 py-4 text-xs font-black text-[#655ac1]">القسم</th>
                  <th className="w-[12%] px-3 py-4 text-xs font-black text-[#655ac1]">نوع العملية</th>
                  <th className="w-[26%] px-3 py-4 text-xs font-black text-[#655ac1]">وصف العملية</th>
                  <th className="w-[14%] px-3 py-4 text-xs font-black text-[#655ac1]">المفوّض</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {filtered.map((log, index) => (
                  <tr key={log.id} className="transition-colors hover:bg-[#e5e1fe]/10">
                    <td className="px-3 py-3.5 text-center">
                      <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-xs font-bold text-slate-400">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center align-middle">
                      <span className="text-[12px] font-bold text-slate-600">{fmtDayName(log.timestamp)}</span>
                    </td>
                    <td className="px-3 py-3.5 text-center align-middle">
                      <span className="text-[12px] font-bold text-slate-600">{fmtCalDate(log.timestamp)}</span>
                    </td>
                    <td className="px-3 py-3.5 text-center align-middle">
                      <span className="text-[12px] font-bold text-slate-600">{fmtTime(log.timestamp)}</span>
                    </td>
                    <td className="px-3 py-3.5 align-middle">
                      <span className="text-[12px] font-bold text-slate-600">{moduleLabel(log.module)}</span>
                    </td>
                    <td className="px-3 py-3.5 align-middle">
                      <span className={`text-[13px] font-black ${ACTION_TYPE_TEXT[log.actionType]}`}>{ACTION_TYPE_LABELS[log.actionType]}</span>
                    </td>
                    <td className="px-3 py-3.5 align-middle">
                      <p className={`text-[13px] font-bold ${ACTION_TYPE_TEXT[log.actionType]}`}>{log.action}</p>
                      {visibleDetails(log.details) && <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{visibleDetails(log.details)}</p>}
                    </td>
                    <td className="px-3 py-3.5 align-middle">
                      {log.targetDelegateName ? (
                        <span className="text-[13px] font-bold text-slate-700">{log.targetDelegateName}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-16">
                      <EmptyState hasLogs={logs.length > 0} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Delete confirmation (نمط الانتظار اليومي) ─── */}
      {deleteMode && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
              <Trash2 size={24} className="shrink-0 text-rose-500" />
              <div>
                <h3 className="text-base font-black text-slate-800">{deleteCopy.title}</h3>
              </div>
            </div>
            <p className="px-6 pb-5 text-sm font-medium text-slate-600">{deleteCopy.body}</p>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setDeleteMode(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteLogs}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-rose-500 py-2.5 text-sm font-bold text-white transition-all hover:bg-rose-600"
              >
                <Trash2 size={15} /> تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasLogs }: { hasLogs: boolean }) {
  return (
    <div className="text-center">
      <AlertCircle size={32} className={`mx-auto mb-3 ${hasLogs ? 'text-[#655ac1] opacity-40' : 'text-slate-300'}`} />
      {hasLogs ? (
        <>
          <p className="font-bold text-slate-600">لا توجد نتائج مطابقة</p>
          <p className="mt-1 text-sm text-slate-400">جرّب تغيير الفلاتر أو الفترة الزمنية</p>
        </>
      ) : (
        <>
          <p className="font-bold text-slate-600">لا توجد عمليات مسجلة بعد</p>
          <p className="mt-1 text-sm text-slate-400">سيظهر هنا سجل العمليات المرتبطة بالمفوضين تلقائيًا</p>
        </>
      )}
    </div>
  );
}
