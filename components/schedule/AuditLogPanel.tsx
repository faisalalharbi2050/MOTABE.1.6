import React, { useMemo, useState } from 'react';
import { History, FileText, X, Search, LayoutGrid, User, ArrowRightLeft, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { AuditLogEntry } from '../../types';

interface AuditLogPanelProps {
    logs: AuditLogEntry[];
    isOpen: boolean;
    onClose: () => void;
    onChangeLogs: (logs: AuditLogEntry[]) => void;
}

const DAY_NAMES_AR: Record<number, string> = {
    0: 'الأحد',
    1: 'الإثنين',
    2: 'الثلاثاء',
    3: 'الأربعاء',
    4: 'الخميس',
    5: 'الجمعة',
    6: 'السبت',
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

const formatDay = (iso: string) => DAY_NAMES_AR[new Date(iso).getDay()] ?? '';

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('ar-SA-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
});

const formatDetailStep = (step: string) => step.replace(/↔/g, ' مقابل ').replace(/→/g, ' إلى ');

const AuditLogPanel: React.FC<AuditLogPanelProps> = ({ logs, isOpen, onClose, onChangeLogs }) => {
    const [filter, setFilter] = useState<'all' | 'general' | 'individual'>('all');
    const [search, setSearch] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<{ mode: 'all' } | { mode: 'one'; id: string } | null>(null);

    const generalCount = useMemo(() => logs.filter(l => (l.viewType ?? 'general') === 'general').length, [logs]);
    const individualCount = useMemo(() => logs.filter(l => l.viewType === 'individual').length, [logs]);

    const filtered = useMemo(() => {
        let result = [...logs].reverse();
        if (filter === 'general') result = result.filter(l => (l.viewType ?? 'general') === 'general');
        if (filter === 'individual') result = result.filter(l => l.viewType === 'individual');
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter(l =>
                (l.teacherName ?? '').toLowerCase().includes(q) ||
                l.description.toLowerCase().includes(q)
            );
        }
        return result;
    }, [logs, filter, search]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" dir="rtl">
            <div
                className="bg-white w-full flex flex-col overflow-hidden"
                style={{
                    maxWidth: '96vw',
                    height: '94vh',
                    borderRadius: '28px',
                    boxShadow: '0 40px 100px rgba(101,90,193,0.25), 0 12px 32px rgba(0,0,0,0.14)',
                    fontFamily: '"Tajawal", sans-serif',
                }}
            >
                <div className="flex items-center justify-between px-6 py-5 bg-slate-50 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center shrink-0">
                            <History size={26} style={{ color: '#655ac1' }} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-800">سجل تعديلات الجدول</h3>
                            <p className="text-sm font-bold text-slate-500 mt-0.5">جميع التعديلات اليدوية المسجلة على الجداول</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 pt-5 pb-4 flex gap-4 shrink-0 border-b border-slate-100">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0">
                            <LayoutGrid size={22} style={{ color: '#655ac1' }} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-slate-500 mb-1">التعديل على الجدول العام للمعلمين</p>
                            <p className="text-2xl font-black leading-none" style={{ color: '#655ac1' }}>{generalCount}</p>
                        </div>
                    </div>

                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0">
                            <User size={22} style={{ color: '#655ac1' }} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-slate-500 mb-1">التعديل على جدول معلم</p>
                            <p className="text-2xl font-black leading-none" style={{ color: '#655ac1' }}>{individualCount}</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4 min-w-[190px]">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0">
                            <History size={22} style={{ color: '#655ac1' }} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 mb-1">إجمالي التعديلات</p>
                            <p className="text-2xl font-black leading-none" style={{ color: '#655ac1' }}>{logs.length}</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-3 flex items-center gap-3 border-b border-slate-100 shrink-0 bg-white">
                    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                        {([
                            { key: 'all', label: 'الكل', count: logs.length },
                            { key: 'general', label: 'الجدول العام', count: generalCount },
                            { key: 'individual', label: 'جدول معلم', count: individualCount },
                        ] as const).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className="px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5"
                                style={filter === tab.key
                                    ? { background: '#655ac1', color: '#ffffff', boxShadow: '0 4px 12px rgba(101,90,193,0.28)' }
                                    : { color: '#64748b' }}
                            >
                                {tab.label}
                                <span
                                    className="text-xs px-1.5 py-0.5 rounded-md font-black"
                                    style={filter === tab.key
                                        ? { background: 'rgba(255,255,255,0.18)', color: '#ffffff' }
                                        : { background: '#e2e8f0', color: '#64748b' }}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 relative">
                        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="بحث باسم المعلم أو التفاصيل..."
                            className="w-full pr-9 pl-4 py-2 text-sm border border-slate-200 rounded-xl outline-none bg-slate-50 text-slate-700 font-semibold placeholder:text-slate-400 transition-colors"
                            onFocus={e => e.target.style.borderColor = '#655ac1'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                            dir="rtl"
                        />
                    </div>

                    <button
                        onClick={() => setConfirmDelete({ mode: 'all' })}
                        disabled={logs.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderColor: '#fecaca', color: '#dc2626', background: '#fff' }}
                    >
                        <Trash2 size={15} />
                        حذف كل السجلات
                    </button>
                </div>

                <div className="flex-1 overflow-auto">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 opacity-60 py-20">
                            <FileText size={60} strokeWidth={1} />
                            <p className="font-bold text-lg">
                                {logs.length === 0 ? 'لا توجد تعديلات يدوية مسجلة حتى الآن' : 'لا توجد نتائج تطابق بحثك'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-right text-sm min-w-[980px]" dir="rtl">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center w-14">م</th>
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-right w-24">اليوم</th>
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-right w-28">التاريخ</th>
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-right w-28">الوقت</th>
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-right w-40">المعلم</th>
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center w-36">نوع التعديل</th>
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">تفاصيل التعديل</th>
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center w-24">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map((log, idx) => {
                                    const isChain = log.actionType === 'chain_swap';
                                    const isGeneral = (log.viewType ?? 'general') === 'general';
                                    const steps = log.description.split(' | ').filter(Boolean);

                                    return (
                                        <tr
                                            key={log.id}
                                            className="hover:bg-accent/5 transition-all group"
                                        >
                                            <td className="px-6 py-3.5 text-center">
                                                <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center text-[11px] font-black border border-slate-300 bg-white text-[#655ac1]">
                                                    {filtered.length - idx}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5"><span className="text-[12px] font-bold text-slate-700">{formatDay(log.timestamp)}</span></td>
                                            <td className="px-6 py-3.5"><span className="inline-flex items-center justify-center px-3 py-1 bg-slate-50 rounded-lg text-[12px] font-bold text-slate-700">{formatDate(log.timestamp)}</span></td>
                                            <td className="px-6 py-3.5 whitespace-nowrap"><span className="inline-flex items-center justify-center px-3 py-1 bg-slate-50 rounded-lg text-[12px] font-bold text-slate-700 whitespace-nowrap">{formatTime(log.timestamp)}</span></td>
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                {log.teacherName ? (
                                                    <span className="font-bold text-[13px] text-slate-800 leading-tight whitespace-nowrap">{log.teacherName}</span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-semibold">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span
                                                        className="text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1 w-max"
                                                        style={{ background: '#ffffff', color: '#655ac1', border: '1px solid #cbd5e1' }}
                                                    >
                                                        {isChain ? <><RotateCcw size={11} /> متعدد</> : <><ArrowRightLeft size={11} /> بسيط</>}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: '#f1f0fb', color: '#7c6dd6' }}>
                                                        {isGeneral ? 'جدول عام' : 'جدول معلم'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="space-y-1">
                                                    {steps.map((step, si) => (
                                                        <div key={si} className="flex items-start gap-2 text-xs text-slate-600">
                                                            {steps.length > 1 && (
                                                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 mt-0.5" style={{ background: '#f1f5f9', color: '#655ac1' }}>
                                                                    {si + 1}
                                                                </span>
                                                            )}
                                                            <span className="font-semibold leading-relaxed">{formatDetailStep(step)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                <button
                                                    onClick={() => setConfirmDelete({ mode: 'one', id: log.id })}
                                                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-colors hover:bg-rose-50"
                                                    style={{ borderColor: '#fecaca', color: '#dc2626', background: '#fff' }}
                                                    title="حذف هذا السجل"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-slate-400">عرض {filtered.length} من أصل {logs.length} سجل</span>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm text-slate-600 font-bold bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        إغلاق
                    </button>
                </div>
            </div>

            {confirmDelete && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden" dir="rtl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-rose-50 text-rose-500">
                                    <AlertTriangle size={22} />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-slate-800">تأكيد الحذف</h3>
                                    <p className="text-sm font-bold text-slate-500 mt-0.5">
                                        {confirmDelete.mode === 'all' ? 'سيتم حذف كامل سجل التعديلات.' : 'سيتم حذف سجل التعديل المحدد.'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 text-sm font-semibold leading-7 text-slate-600">
                            {confirmDelete.mode === 'all'
                                ? 'هذا الإجراء سيحذف جميع سجلات التعديل نهائيًا من القائمة الحالية.'
                                : 'هذا الإجراء سيحذف هذا السجل فقط من سجل التعديلات.'}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-5 py-2.5 rounded-xl text-sm font-black text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmDelete.mode === 'all') {
                                        onChangeLogs([]);
                                    } else {
                                        onChangeLogs(logs.filter(log => log.id !== confirmDelete.id));
                                    }
                                    setConfirmDelete(null);
                                }}
                                className="px-5 py-2.5 rounded-xl text-sm font-black text-white bg-rose-500 hover:bg-rose-600 transition-colors"
                            >
                                تأكيد الحذف
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogPanel;
