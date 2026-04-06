import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Clock,
  Search,
  Trash2,
} from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import arabic from 'react-date-object/calendars/arabic';
import arabic_ar from 'react-date-object/locales/arabic_ar';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';
import { ActionLog, LogActionType } from '../../types';
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

const ACTION_TYPE_COLORS: Record<LogActionType, { bg: string; text: string; dot: string }> = {
  create: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  edit_permissions: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-[#655ac1]' },
  activate: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  deactivate: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  delete: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-600' },
  regenerate_otp: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  reset_account: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
};

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date(iso));

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const toYMD = (iso: string) => iso.slice(0, 10);

function TypeBadge({ type }: { type: LogActionType }) {
  const colors = ACTION_TYPE_COLORS[type];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${colors.bg} ${colors.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      {ACTION_TYPE_LABELS[type]}
    </span>
  );
}

export default function ActionLogs() {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [search, setSearch] = useState('');
  const [delegateFilter, setDelegateFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDelegateDropdown, setShowDelegateDropdown] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'all' | 'delegate' | 'older' | null>(null);
  const delegateDropdownRef = useRef<HTMLDivElement>(null);
  const deleteMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs(getLogs());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        delegateDropdownRef.current &&
        !delegateDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDelegateDropdown(false);
      }

      if (
        deleteMenuRef.current &&
        !deleteMenuRef.current.contains(event.target as Node)
      ) {
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

    if (query && !(log.targetDelegateName ?? '').toLowerCase().includes(query)) {
      return false;
    }

    if (delegateFilter !== 'all' && log.targetDelegateName !== delegateFilter) {
      return false;
    }

    if (dateFrom && toYMD(log.timestamp) < dateFrom) {
      return false;
    }

    if (dateTo && toYMD(log.timestamp) > dateTo) {
      return false;
    }

    return true;
  });

  const selectedDelegateLabel =
    delegateFilter === 'all' ? 'جميع المفوضين' : delegateFilter;

  const resetFilters = () => {
    setSearch('');
    setDelegateFilter('all');
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

  const deleteMessage =
    deleteMode === 'older' && dateTo
      ? `سيتم حذف جميع السجلات الأقدم من تاريخ ${fmtDate(dateTo)} نهائيًا. هل تريد المتابعة؟`
      : deleteMode === 'delegate' && delegateFilter !== 'all'
        ? `سيتم حذف جميع سجلات المفوض ${delegateFilter}. هل تريد المتابعة؟`
        : 'سيتم حذف جميع السجلات المسجلة نهائيًا. هل تريد المتابعة؟';

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-black text-slate-800">
                <ClipboardList size={18} className="text-[#655ac1]" />
                سجل الإجراءات
                {logs.length > 0 && (
                  <span className="rounded-full bg-[#e5e1fe] px-2 py-0.5 text-xs font-bold text-[#655ac1]">
                    {logs.length} عملية
                  </span>
                )}
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-400">
                متابعة العمليات الإجرائية للمفوضين
              </p>
            </div>

            <div className="relative" ref={deleteMenuRef}>
              <button
                type="button"
                onClick={() => setShowDeleteMenu((prev) => !prev)}
                className={`flex items-center gap-2 rounded-xl border bg-white px-3.5 py-2 text-xs font-bold transition-all ${
                  showDeleteMenu
                    ? 'border-rose-300 text-rose-600 shadow-sm'
                    : 'border-slate-200 text-slate-700 hover:border-rose-200 hover:text-rose-600'
                }`}
              >
                <Trash2 size={13} className="text-rose-500" />
                حذف السجلات
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${showDeleteMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {showDeleteMenu && (
                <div className="absolute left-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteMode('older');
                      setShowDeleteMenu(false);
                    }}
                    disabled={!dateTo}
                    className={`w-full px-4 py-3 text-right transition-colors ${
                      dateTo
                        ? 'text-slate-700 hover:bg-slate-50'
                        : 'cursor-not-allowed text-slate-300'
                    }`}
                  >
                    <p className="text-sm font-bold">حذف السجلات الأقدم</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {dateTo
                        ? `حذف كل السجلات الأقدم من ${fmtDate(dateTo)}`
                        : 'حدد إلى تاريخ أولًا لتفعيل هذا الخيار'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteMode('delegate');
                      setShowDeleteMenu(false);
                    }}
                    disabled={delegateFilter === 'all'}
                    className={`w-full border-t border-slate-100 px-4 py-3 text-right transition-colors ${
                      delegateFilter !== 'all'
                        ? 'text-slate-700 hover:bg-slate-50'
                        : 'cursor-not-allowed text-slate-300'
                    }`}
                  >
                    <p className="text-sm font-bold">حذف سجل مفوض محدد</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {delegateFilter !== 'all'
                        ? `حذف جميع سجلات ${delegateFilter}`
                        : 'اختر مفوضًا من القائمة لتفعيل هذا الخيار'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteMode('all');
                      setShowDeleteMenu(false);
                    }}
                    className="w-full border-t border-slate-100 px-4 py-3 text-right text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <p className="text-sm font-bold">حذف جميع السجلات</p>
                    <p className="mt-1 text-xs text-rose-400">إفراغ سجل الإجراءات بالكامل</p>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="البحث باسم المفوض..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1]"
              />
            </div>

            {uniqueTargets.length > 0 && (
              <div className="relative min-w-[230px]" ref={delegateDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowDelegateDropdown((prev) => !prev)}
                  className={`flex w-full items-center justify-between rounded-xl border-2 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition-all shadow-sm ${
                    showDelegateDropdown
                      ? 'border-[#655ac1] ring-2 ring-[#655ac1]/15'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <span className="truncate">{selectedDelegateLabel}</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${showDelegateDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {showDelegateDropdown && (
                  <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setDelegateFilter('all');
                        setShowDelegateDropdown(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition-colors ${
                        delegateFilter === 'all'
                          ? 'bg-[#655ac1]/6 text-[#655ac1]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm font-bold">جميع المفوضين</span>
                      {delegateFilter === 'all' && <span className="text-xs font-bold">محدد</span>}
                    </button>

                    <div className="max-h-72 overflow-y-auto p-2">
                      {uniqueTargets.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setDelegateFilter(name);
                            setShowDelegateDropdown(false);
                          }}
                          className={`w-full rounded-xl px-3 py-3 text-right transition-colors ${
                            delegateFilter === name
                              ? 'bg-[#655ac1]/6 text-[#655ac1]'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <p className="truncate text-sm font-bold">{name}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            عرض جميع العمليات الإجرائية لهذا المفوض
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
            <p className="mb-4 flex items-center gap-2 text-sm font-black text-slate-700">
              <CalendarDays size={17} className="text-[#655ac1]" />
              تحديد الفترة الزمنية
            </p>

            <div className="flex flex-wrap gap-4">
              <div className="min-w-[180px] flex-1">
                <label className="mb-1.5 block text-xs font-bold text-slate-600">من تاريخ</label>
                <DatePicker
                  value={dateFrom}
                  onChange={(date: DateObject | DateObject[] | null) => {
                    if (!date) {
                      setDateFrom('');
                      return;
                    }

                    const selectedDate = Array.isArray(date) ? date[0] : date;
                    if (selectedDate) {
                      setDateFrom(selectedDate.convert(gregorian, gregorian_en).format('YYYY-MM-DD'));
                    } else {
                      setDateFrom('');
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
                {dateFrom && (
                  <p className="mt-1 text-xs font-bold text-[#655ac1]" dir="ltr">
                    {fmtDate(dateFrom)}
                  </p>
                )}
              </div>

              <div className="min-w-[180px] flex-1">
                <label className="mb-1.5 block text-xs font-bold text-slate-600">إلى تاريخ</label>
                <DatePicker
                  value={dateTo}
                  onChange={(date: DateObject | DateObject[] | null) => {
                    if (!date) {
                      setDateTo('');
                      return;
                    }

                    const selectedDate = Array.isArray(date) ? date[0] : date;
                    if (selectedDate) {
                      setDateTo(selectedDate.convert(gregorian, gregorian_en).format('YYYY-MM-DD'));
                    } else {
                      setDateTo('');
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
                {dateTo && (
                  <p className="mt-1 text-xs font-bold text-[#655ac1]" dir="ltr">
                    {fmtDate(dateTo)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="md:hidden space-y-3 p-3">
          {filtered.map((log, index) => (
            <div key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-black text-[#655ac1]">
                      {index + 1}
                    </span>
                    <TypeBadge type={log.actionType} />
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-800">{log.action}</p>
                  {log.details && <p className="mt-1 text-xs leading-6 text-slate-500">{log.details}</p>}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 col-span-2">
                  <p className="text-[11px] font-bold text-slate-400">المفوض</p>
                  <p className="mt-1 font-medium text-slate-700">
                    {log.targetDelegateName || '—'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-bold text-slate-400">اليوم</p>
                  <p className="mt-1 text-xs font-bold text-slate-700">{fmtDay(log.timestamp)}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-bold text-slate-400">الوقت</p>
                  <p dir="ltr" className="mt-1 text-xs font-bold text-slate-700">{fmtTime(log.timestamp)}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 col-span-2">
                  <p className="text-[11px] font-bold text-slate-400">التاريخ</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                    <CalendarDays size={11} className="text-[#655ac1]" />
                    <span dir="ltr">{fmtDate(log.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="px-6 py-16 text-center">
              <AlertCircle size={32} className="mx-auto mb-3 text-[#655ac1] opacity-40" />
              {logs.length === 0 ? (
                <>
                  <p className="font-bold text-slate-600">لا توجد عمليات مسجلة بعد</p>
                  <p className="mt-1 text-sm text-slate-400">
                    سيظهر هنا سجل العمليات المرتبطة بالمفوضين تلقائيًا
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-slate-600">لا توجد نتائج مطابقة</p>
                  <p className="mt-1 text-sm text-slate-400">
                    جرّب تغيير اسم المفوض أو الفترة الزمنية
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="hidden md:block">
          <table className="w-full table-fixed text-right">
            <thead className="border-b border-slate-100 bg-slate-50 text-sm text-[#655ac1]">
              <tr>
                <th className="w-14 whitespace-nowrap px-4 py-4 text-center font-medium">م</th>
                <th className="whitespace-nowrap px-4 py-4 font-medium">نوع العملية</th>
                <th className="w-[30%] px-4 py-4 font-medium">وصف العملية</th>
                <th className="whitespace-nowrap px-4 py-4 font-medium">المفوض</th>
                <th className="whitespace-nowrap px-4 py-4 font-medium">اليوم</th>
                <th className="whitespace-nowrap px-4 py-4 font-medium">التاريخ</th>
                <th className="whitespace-nowrap px-4 py-4 font-medium">الوقت</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-gray-700">
              {filtered.map((log, index) => (
                <tr key={log.id} className="transition-colors hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-gray-400">
                    {index + 1}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <TypeBadge type={log.actionType} />
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="text-sm font-bold text-slate-800">{log.action}</p>
                    {log.details && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{log.details}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 align-top">
                    {log.targetDelegateName ? (
                      <span className="text-sm font-medium text-slate-700">{log.targetDelegateName}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 align-top">
                    <span className="text-xs font-bold text-slate-700">{fmtDay(log.timestamp)}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 align-top">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <CalendarDays size={11} className="text-[#655ac1]" />
                      <span dir="ltr">{fmtDate(log.timestamp)}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 align-top">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-rose-400" />
                      <span dir="ltr" className="text-xs font-bold text-slate-600">
                        {fmtTime(log.timestamp)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <AlertCircle size={32} className="mx-auto mb-3 text-[#655ac1] opacity-40" />
                    {logs.length === 0 ? (
                      <>
                        <p className="font-bold text-slate-600">لا توجد عمليات مسجلة بعد</p>
                        <p className="mt-1 text-sm text-slate-400">
                          سيظهر هنا سجل العمليات المرتبطة بالمفوضين تلقائيًا
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-slate-600">لا توجد نتائج مطابقة</p>
                        <p className="mt-1 text-sm text-slate-400">
                          جرّب تغيير اسم المفوض أو الفترة الزمنية
                        </p>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && filtered.length < logs.length && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs font-medium text-slate-500">
            عرض {filtered.length} من أصل {logs.length} عملية
          </div>
        )}
      </div>

      {deleteMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="animate-in zoom-in-95 w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl duration-200">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-rose-100 bg-rose-50 text-rose-500">
              <AlertTriangle size={28} />
            </div>
            <h3 className="mb-2 text-center text-xl font-black text-slate-800">حذف السجلات</h3>
            <p className="mb-6 text-center font-medium text-slate-500">{deleteMessage}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteMode(null)}
                className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-700 transition-colors hover:bg-slate-200"
              >
                تراجع
              </button>
              <button
                onClick={handleDeleteLogs}
                className="flex-1 rounded-xl bg-rose-500 py-3 font-bold text-white transition-colors hover:bg-rose-600"
              >
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
