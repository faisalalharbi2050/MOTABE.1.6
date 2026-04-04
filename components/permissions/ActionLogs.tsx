import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Clock,
  Search,
  X,
} from 'lucide-react';
import { ActionLog, LogActionType } from '../../types';
import { getLogs } from './auditLog';

const ACTION_TYPE_LABELS: Record<LogActionType, string> = {
  create: 'إنشاء',
  edit_permissions: 'تعديل صلاحيات',
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
  const [delegateFilter, setDelegate] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDelegateDropdown, setShowDelegateDropdown] = useState(false);
  const delegateDropdownRef = useRef<HTMLDivElement>(null);

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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const uniqueTargets = Array.from(
    new Set(logs.map((log) => log.targetDelegateName).filter(Boolean))
  ) as string[];

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase();

    if (q && !(log.targetDelegateName ?? '').toLowerCase().includes(q)) {
      return false;
    }

    if (delegateFilter !== 'all' && log.targetDelegateName !== delegateFilter) return false;
    if (dateFrom && toYMD(log.timestamp) < dateFrom) return false;
    if (dateTo && toYMD(log.timestamp) > dateTo) return false;

    return true;
  });

  const hasFilters = search || delegateFilter !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch('');
    setDelegate('all');
    setDateFrom('');
    setDateTo('');
  };

  const selectedDelegateLabel =
    delegateFilter === 'all' ? 'جميع المفوضين' : delegateFilter;

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

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100"
              >
                <X size={12} />
                مسح الفلاتر
              </button>
            )}
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
                        setDelegate('all');
                        setShowDelegateDropdown(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition-colors ${
                        delegateFilter === 'all'
                          ? 'bg-[#655ac1]/6 text-[#655ac1]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-bold text-sm">جميع المفوضين</span>
                      {delegateFilter === 'all' && <span className="text-xs font-bold">محدد</span>}
                    </button>

                    <div className="max-h-72 overflow-y-auto p-2">
                      {uniqueTargets.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setDelegate(name);
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
                            عرض عمليات هذا المفوض فقط
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
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#655ac1] focus:ring-1"
                />
                {dateFrom && (
                  <p className="mt-1 text-xs font-bold text-[#655ac1]" dir="ltr">
                    {fmtDate(dateFrom)}
                  </p>
                )}
              </div>

              <div className="min-w-[180px] flex-1">
                <label className="mb-1.5 block text-xs font-bold text-slate-600">إلى تاريخ</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#655ac1] focus:ring-1"
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

        <div>
          <table className="w-full table-fixed text-right">
            <thead className="border-b border-slate-100 bg-slate-50 text-sm text-[#655ac1]">
              <tr>
                <th className="px-4 py-4 font-medium w-14 text-center whitespace-nowrap">م</th>
                <th className="px-4 py-4 font-medium whitespace-nowrap">نوع العملية</th>
                <th className="px-4 py-4 font-medium w-[30%]">وصف العملية</th>
                <th className="px-4 py-4 font-medium whitespace-nowrap">المفوض</th>
                <th className="px-4 py-4 font-medium whitespace-nowrap">اليوم</th>
                <th className="px-4 py-4 font-medium whitespace-nowrap">التاريخ</th>
                <th className="px-4 py-4 font-medium whitespace-nowrap">الوقت</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-gray-700">
              {filtered.map((log, index) => (
                <tr key={log.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-4 align-top text-center text-sm text-gray-400 whitespace-nowrap">
                    {index + 1}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <TypeBadge type={log.actionType} />
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="text-sm font-bold text-slate-800">{log.action}</p>
                    {log.details && <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{log.details}</p>}
                  </td>
                  <td className="px-4 py-4 align-top whitespace-nowrap">
                    {log.targetDelegateName ? (
                      <span className="text-sm font-medium text-slate-700">{log.targetDelegateName}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top whitespace-nowrap">
                    <span className="text-xs font-bold text-slate-700">{fmtDay(log.timestamp)}</span>
                  </td>
                  <td className="px-4 py-4 align-top whitespace-nowrap">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <CalendarDays size={11} className="text-[#655ac1]" />
                      <span dir="ltr">{fmtDate(log.timestamp)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top whitespace-nowrap">
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
                        <p className="mt-1 text-sm text-slate-400">جرّب تغيير الفلاتر أو مسحها</p>
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
    </div>
  );
}
