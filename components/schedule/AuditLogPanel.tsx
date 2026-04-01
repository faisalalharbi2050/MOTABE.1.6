import React, { useState, useMemo } from 'react';
import { History, FileText, X, Search, LayoutGrid, User, ArrowRightLeft, RotateCcw } from 'lucide-react';
import { AuditLogEntry } from '../../types';

interface AuditLogPanelProps {
    logs: AuditLogEntry[];
    isOpen: boolean;
    onClose: () => void;
}

const DAY_NAMES_AR: Record<number, string> = {
    0: 'الأحد', 1: 'الإثنين', 2: 'الثلاثاء', 3: 'الأربعاء',
    4: 'الخميس', 5: 'الجمعة', 6: 'السبت',
};

const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const formatDay = (iso: string) => {
    const d = new Date(iso);
    return DAY_NAMES_AR[d.getDay()] ?? '';
};

const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const AuditLogPanel: React.FC<AuditLogPanelProps> = ({ logs, isOpen, onClose }) => {
    const [filter, setFilter] = useState<'all' | 'general' | 'individual'>('all');
    const [search, setSearch] = useState('');

    const generalCount    = useMemo(() => logs.filter(l => (l.viewType ?? 'general') === 'general').length, [logs]);
    const individualCount = useMemo(() => logs.filter(l => l.viewType === 'individual').length, [logs]);

    const filtered = useMemo(() => {
        let result = [...logs].reverse();
        if (filter === 'general')    result = result.filter(l => (l.viewType ?? 'general') === 'general');
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <div
                className="bg-white w-full flex flex-col overflow-hidden"
                style={{
                    maxWidth: '96vw',
                    height: '94vh',
                    borderRadius: '28px',
                    boxShadow: '0 40px 100px rgba(101,90,193,0.25), 0 12px 32px rgba(0,0,0,0.14)',
                    fontFamily: '"Tajawal", sans-serif',
                }}
                dir="rtl"
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-5 bg-slate-50 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center shrink-0">
                            <History size={26} style={{ color: '#655ac1' }} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-800">سجل تعديلات الجدول</h3>
                            <p className="text-sm font-bold text-slate-500 mt-0.5">جميع التعديلات اليدوية المسجّلة على الجداول</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Stats Cards ── */}
                <div className="px-6 pt-5 pb-4 flex gap-4 shrink-0 border-b border-slate-100">
                    {/* Card: الجدول العام */}
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0">
                            <LayoutGrid size={22} style={{ color: '#655ac1' }} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-slate-500 mb-1">التعديل على الجدول العام للمعلمين</p>
                            <p className="text-2xl font-black leading-none" style={{ color: '#655ac1' }}>{generalCount}</p>
                        </div>
                        <span
                            className="text-xs font-bold px-2.5 py-1 rounded-lg shrink-0"
                            style={{ background: 'rgba(101,90,193,0.08)', color: '#655ac1' }}
                        >
                            عملية تعديل
                        </span>
                    </div>

                    {/* Card: جدول معلم */}
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0">
                            <User size={22} style={{ color: '#655ac1' }} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-slate-500 mb-1">التعديل على جدول معلم</p>
                            <p className="text-2xl font-black leading-none" style={{ color: '#655ac1' }}>{individualCount}</p>
                        </div>
                        <span
                            className="text-xs font-bold px-2.5 py-1 rounded-lg shrink-0"
                            style={{ background: 'rgba(101,90,193,0.08)', color: '#655ac1' }}
                        >
                            عملية تعديل
                        </span>
                    </div>

                    {/* Card: الإجمالي */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4 min-w-[190px]">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0">
                            <History size={22} style={{ color: '#655ac1' }} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 mb-1">الإجمالي</p>
                            <p className="text-2xl font-black leading-none" style={{ color: '#655ac1' }}>{logs.length}</p>
                        </div>
                    </div>
                </div>

                {/* ── Filters & Search ── */}
                <div className="px-6 py-3 flex items-center gap-3 border-b border-slate-100 shrink-0 bg-white">
                    {/* Filter tabs */}
                    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                        {([
                            { key: 'all',        label: 'الكل',        count: logs.length },
                            { key: 'general',    label: 'الجدول العام', count: generalCount },
                            { key: 'individual', label: 'جدول معلم',   count: individualCount },
                        ] as const).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className="px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5"
                                style={filter === tab.key
                                    ? { background: 'white', color: '#655ac1', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                                    : { color: '#64748b' }
                                }
                            >
                                {tab.label}
                                <span
                                    className="text-xs px-1.5 py-0.5 rounded-md font-black"
                                    style={filter === tab.key
                                        ? { background: 'rgba(101,90,193,0.1)', color: '#655ac1' }
                                        : { background: '#e2e8f0', color: '#64748b' }
                                    }
                                >
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="بحث باسم المعلم أو التفاصيل..."
                            className="w-full pr-9 pl-4 py-2 text-sm border border-slate-200 rounded-xl outline-none bg-slate-50 text-slate-700 font-semibold placeholder:text-slate-400 transition-colors"
                            style={{ fontFamily: '"Tajawal", sans-serif' }}
                            onFocus={e => e.target.style.borderColor = '#655ac1'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                            dir="rtl"
                        />
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="flex-1 overflow-auto">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 opacity-60 py-20">
                            <FileText size={60} strokeWidth={1} />
                            <p className="font-bold text-lg">
                                {logs.length === 0
                                    ? 'لا توجد تعديلات يدوية مسجّلة حتى الآن'
                                    : 'لا توجد نتائج تطابق بحثك'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-sm" dir="rtl">
                            <thead className="sticky top-0 z-10 border-b border-slate-200" style={{ background: '#f8f7ff' }}>
                                <tr>
                                    <th className="px-4 py-3 text-center font-black text-slate-600 w-12">م</th>
                                    <th className="px-4 py-3 text-right font-black text-slate-600 w-24">اليوم</th>
                                    <th className="px-4 py-3 text-right font-black text-slate-600 w-28">التاريخ</th>
                                    <th className="px-4 py-3 text-right font-black text-slate-600 w-28">الوقت</th>
                                    <th className="px-4 py-3 text-right font-black text-slate-600 w-40">المعلم</th>
                                    <th className="px-4 py-3 text-center font-black text-slate-600 w-36">نوع التعديل</th>
                                    <th className="px-4 py-3 text-right font-black text-slate-600">تفاصيل التعديل</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((log, idx) => {
                                    const isChain   = log.actionType === 'chain_swap';
                                    const isGeneral = (log.viewType ?? 'general') === 'general';
                                    const steps     = log.description.split(' | ').filter(Boolean);

                                    return (
                                        <tr
                                            key={log.id}
                                            className="border-b border-slate-100 transition-colors"
                                            style={{ background: idx % 2 === 0 ? '#ffffff' : '#faf9ff' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ff')}
                                            onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#faf9ff')}
                                        >
                                            {/* م */}
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className="text-xs font-black w-7 h-7 rounded-lg flex items-center justify-center mx-auto"
                                                    style={{ background: 'rgba(101,90,193,0.08)', color: '#655ac1' }}
                                                >
                                                    {filtered.length - idx}
                                                </span>
                                            </td>

                                            {/* اليوم */}
                                            <td className="px-4 py-3">
                                                <span className="font-bold text-slate-700 text-xs">{formatDay(log.timestamp)}</span>
                                            </td>

                                            {/* التاريخ */}
                                            <td className="px-4 py-3">
                                                <span className="font-bold text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{formatDate(log.timestamp)}</span>
                                            </td>

                                            {/* الوقت */}
                                            <td className="px-4 py-3">
                                                <span className="font-bold text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{formatTime(log.timestamp)}</span>
                                            </td>

                                            {/* المعلم */}
                                            <td className="px-4 py-3">
                                                {log.teacherName ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <div
                                                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                                                            style={{ background: 'rgba(101,90,193,0.1)' }}
                                                        >
                                                            <User size={12} style={{ color: '#655ac1' }} />
                                                        </div>
                                                        <span className="font-bold text-slate-700 text-xs leading-tight">{log.teacherName}</span>
                                                        {log.relatedTeacherIds.length > 1 && (
                                                            <span
                                                                className="text-[10px] font-black px-1.5 py-0.5 rounded-md"
                                                                style={{ background: 'rgba(101,90,193,0.08)', color: '#655ac1' }}
                                                            >
                                                                +{log.relatedTeacherIds.length - 1}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-semibold">—</span>
                                                )}
                                            </td>

                                            {/* نوع التعديل */}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span
                                                        className="text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1 w-max"
                                                        style={isChain
                                                            ? { background: 'rgba(101,90,193,0.15)', color: '#4a3fa8' }
                                                            : { background: 'rgba(101,90,193,0.08)', color: '#655ac1' }
                                                        }
                                                    >
                                                        {isChain
                                                            ? <><RotateCcw size={11} /> متعدد</>
                                                            : <><ArrowRightLeft size={11} /> بسيط</>
                                                        }
                                                    </span>
                                                    <span
                                                        className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                                                        style={{ background: '#f1f0fb', color: '#7c6dd6' }}
                                                    >
                                                        {isGeneral ? 'جدول عام' : 'جدول معلم'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* تفاصيل التعديل */}
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    {steps.map((step, si) => (
                                                        <div key={si} className="flex items-start gap-2 text-xs text-slate-600">
                                                            {steps.length > 1 && (
                                                                <span
                                                                    className="text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 mt-0.5"
                                                                    style={{ background: 'rgba(101,90,193,0.08)', color: '#655ac1' }}
                                                                >
                                                                    {si + 1}
                                                                </span>
                                                            )}
                                                            <span className="font-semibold leading-relaxed">{step}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-slate-400">
                        عرض {filtered.length} من أصل {logs.length} سجل
                    </span>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200/50 rounded-xl transition-colors text-sm"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuditLogPanel;
