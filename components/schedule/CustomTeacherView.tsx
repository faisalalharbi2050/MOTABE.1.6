import React, { useState } from 'react';
import { Teacher, ScheduleSettingsData, Subject, ClassInfo, AuditLogEntry } from '../../types';
import { getKey, tryMoveOrSwap, findChainSwap, SwapResult } from '../../utils/scheduleInteractive';
import { Search, UserPlus, Check, X, Users, Lock } from 'lucide-react';
import SwapConfirmationModal from './SwapConfirmationModal';

interface CustomTeacherViewProps {
    teachers: Teacher[];
    subjects: Subject[];
    classes: ClassInfo[];
    settings: ScheduleSettingsData;
    onUpdateSettings: (newSettings: ScheduleSettingsData) => void;
    activeSchoolId: string;
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
const DAY_NAMES: Record<string, string> = {
    sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس',
};
const MAX_PERIODS = 7;

// Design tokens (same as InlineScheduleView)
const C_BG       = '#a59bf0';
const C_BG_SOFT  = '#f4f2ff';
const C_DAY_SEP  = '#64748b';
const C_BORDER   = '#94a3b8';

const getPastelColor = (name: string) => {
    const colors = [
        { bg: '#f0fdf4', text: '#166534' },
        { bg: '#eff6ff', text: '#1d4ed8' },
        { bg: '#fef2f2', text: '#b91c1c' },
        { bg: '#fdf4ff', text: '#be185d' },
        { bg: '#fefce8', text: '#a16207' },
        { bg: '#faf5ff', text: '#86198f' },
        { bg: '#f5f3ff', text: '#6b21a8' },
        { bg: '#f0fdfa', text: '#4338ca' },
        { bg: '#ecfdf5', text: '#0f766e' },
        { bg: '#fff7ed', text: '#c2410c' },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const CustomTeacherView: React.FC<CustomTeacherViewProps> = ({
    teachers, subjects, classes, settings, onUpdateSettings, activeSchoolId
}) => {
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSelecting, setIsSelecting] = useState(false);
    const [dragSource, setDragSource] = useState<{ teacherId: string; day: string; period: number } | null>(null);
    const [hoverTarget, setHoverTarget] = useState<string | null>(null);
    const [pendingSwap, setPendingSwap] = useState<SwapResult | null>(null);
    const [swapError, setSwapError] = useState<string | null>(null);

    const timetable = settings.timetable || {};
    const selectedTeachers = teachers.filter(t => selectedTeacherIds.includes(t.id));
    const filteredTeachers = teachers.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) && !selectedTeacherIds.includes(t.id)
    );

    const isClassInActiveSchool = (c?: ClassInfo) => {
        if (!c) return true;
        if (activeSchoolId === 'main' || !activeSchoolId) return !c.schoolId || c.schoolId === 'main';
        return c.schoolId === activeSchoolId;
    };

    /* ── Drag & Drop ── */
    const handleDragStart = (e: React.DragEvent, teacherId: string, day: string, period: number) => {
        const key = getKey(teacherId, day, period);
        if (!timetable[key]) { e.preventDefault(); return; }
        setDragSource({ teacherId, day, period });
        // Store in dataTransfer for reliable cross-event access
        e.dataTransfer.setData('ctv_teacherId', teacherId);
        e.dataTransfer.setData('ctv_day', day);
        e.dataTransfer.setData('ctv_period', String(period));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, targetKey: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setHoverTarget(targetKey);
    };

    const handleDragEnd = () => {
        setDragSource(null);
        setHoverTarget(null);
    };

    const handleDrop = (e: React.DragEvent, targetTeacherId: string, targetDay: string, targetPeriod: number) => {
        e.preventDefault();
        setHoverTarget(null);

        // Prefer dataTransfer over state for reliability
        const srcTeacherId = e.dataTransfer.getData('ctv_teacherId') || dragSource?.teacherId;
        const srcDay       = e.dataTransfer.getData('ctv_day')       || dragSource?.day;
        const srcPeriodRaw = e.dataTransfer.getData('ctv_period');
        const srcPeriod    = srcPeriodRaw ? parseInt(srcPeriodRaw) : dragSource?.period;

        setDragSource(null);
        if (!srcTeacherId || !srcDay || srcPeriod === undefined || isNaN(srcPeriod)) return;

        const source = { teacherId: srcTeacherId, day: srcDay, period: srcPeriod };
        const result = tryMoveOrSwap(timetable, source, { teacherId: targetTeacherId, day: targetDay, period: targetPeriod }, settings, teachers, classes);
        if (result.success) {
            setSwapError(null);
            setPendingSwap(result);
        } else {
            const chain = findChainSwap(timetable, source, { teacherId: targetTeacherId, day: targetDay, period: targetPeriod }, teachers, settings, classes);
            if (chain?.success) {
                setSwapError(null);
                setPendingSwap(chain);
            } else {
                setSwapError(result.reason || 'لا يمكن تنفيذ هذا التعديل. جرّب خلية أخرى.');
                setTimeout(() => setSwapError(null), 4000);
            }
        }
    };

    const confirmSwap = () => {
        if (pendingSwap?.newTimetable) {
            const relatedIds = pendingSwap.relatedTeacherIds || [];
            const primaryTeacher = teachers.find(t => t.id === relatedIds[0]);
            const logEntry: AuditLogEntry = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toISOString(),
                user: 'المستخدم الحالي',
                actionType: pendingSwap.isChain ? 'chain_swap' : 'swap',
                description: pendingSwap.chainSteps?.join(' | ') || 'تبديل حصص من العرض المخصص',
                relatedTeacherIds: relatedIds,
                viewType: 'individual',
                teacherName: primaryTeacher?.name || '',
            };
            const newIds = (pendingSwap.relatedTeacherIds || []).filter(id => !selectedTeacherIds.includes(id));
            if (newIds.length > 0) setSelectedTeacherIds(prev => [...prev, ...newIds]);
            onUpdateSettings({ ...settings, timetable: pendingSwap.newTimetable, auditLogs: [...(settings.auditLogs || []), logEntry] });
        }
        setPendingSwap(null);
    };

    /* ── Cell renderer ── */
    const renderCell = (teacher: Teacher, day: string, di: number, period: number) => {
        const key    = getKey(teacher.id, day, period);
        const slot   = timetable[key];
        const isHov  = hoverTarget === key;
        const cls    = slot?.classId ? classes.find(c => c.id === slot.classId) : undefined;
        const isForeign = cls && !isClassInActiveSchool(cls);
        const rowBg  = di % 2 === 0 ? '#f8fafc' : '#f1f5f9';

        let inner: React.ReactNode;

        if (isForeign) {
            inner = (
                <div className="w-full h-full rounded-lg flex flex-col items-center justify-center gap-0.5"
                     style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                    <Lock size={12} className="text-slate-400" />
                    <span style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 700 }}>مشغول</span>
                </div>
            );
        } else if (!slot) {
            inner = (
                <div className="w-full h-full rounded-lg flex items-center justify-center"
                     style={{ border: `1px dashed ${isHov ? C_BG : '#dde1ea'}`, background: isHov ? '#ede9fe' : '#f8f9fc' }}>
                    <span style={{ color: '#c8cdd8', fontSize: '9px', fontWeight: 700 }}>—</span>
                </div>
            );
        } else if (slot.type === 'waiting') {
            inner = (
                <div className="w-full h-full rounded-lg flex flex-col items-center justify-center gap-0.5"
                     style={{ background: '#fef3e8', border: '1px solid #fbd28a' }}>
                    <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', fontSize: '8px', fontWeight: 900, borderRadius: '9999px', padding: '2px 6px' }}>انتظار</span>
                </div>
            );
        } else {
            const subj     = subjects.find(s => s.id === slot.subjectId);
            const clsInfo  = classes.find(c => c.id === slot.classId);
            const subjDisp = settings.subjectAbbreviations?.[slot.subjectId || ''] || subj?.name || '---';
            const clsDisp  = clsInfo?.name || '---';
            const color    = getPastelColor(subj?.name || '');
            inner = (
                <div className="w-full h-full rounded-lg flex flex-col items-center justify-center px-0.5 gap-0.5 transition-all hover:scale-[1.03]"
                     style={{ background: color.bg, border: `1px solid ${color.text}30` }}>
                    <span style={{ color: color.text, fontSize: '10px', fontWeight: 700, lineHeight: 1.2, textAlign: 'center', width: '100%', padding: '0 2px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {clsDisp}
                    </span>
                    <span style={{ color: color.text, fontSize: '9px', fontWeight: 500, lineHeight: 1.2, textAlign: 'center', width: '100%', padding: '0 2px', opacity: 0.75, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {subjDisp}
                    </span>
                </div>
            );
        }

        return (
            <td key={`${day}-${period}`}
                draggable={!!slot && !isForeign && slot.type !== 'waiting'}
                onDragStart={e => { if (!isForeign && slot?.type !== 'waiting') handleDragStart(e, teacher.id, day, period); }}
                onDragOver={e  => { if (!isForeign) handleDragOver(e, key); }}
                onDragLeave={() => { if (hoverTarget === key) setHoverTarget(null); }}
                onDragEnd={handleDragEnd}
                onDrop={e      => { if (!isForeign) handleDrop(e, teacher.id, day, period); }}
                style={{
                    height: '72px',
                    padding: '3px',
                    background: isHov ? '#ede9fe' : rowBg,
                    borderLeft: `1px solid ${C_BORDER}`,
                    borderBottom: `1px solid ${C_BORDER}`,
                    cursor: slot && !isForeign ? 'grab' : 'default',
                    transition: 'background 0.15s',
                    outline: isHov ? `2px solid ${C_BG}` : 'none',
                    outlineOffset: '-2px',
                }}
            >
                {inner}
            </td>
        );
    };

    /* ── Single teacher table (InlineScheduleView style) ── */
    const renderTeacherTable = (teacher: Teacher) => (
        <div key={teacher.id} className="min-w-0" style={{ zoom: 0.63 }}>
            {/* Info header */}
            <div className="rounded-t-2xl p-4 overflow-hidden"
                 style={{ background: C_BG, boxShadow: '0 8px 25px rgba(101,90,193,0.30)' }}>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl shrink-0"
                         style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)', color: '#fff' }}>
                        {teacher.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', fontWeight: 600 }}>المعلم</div>
                        <div className="truncate" style={{ color: '#fff', fontWeight: 900, fontSize: '20px', lineHeight: 1.2 }}>{teacher.name}</div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        {[
                            { label: 'نصاب', value: teacher.quotaLimit || 0 },
                            { label: 'انتظار', value: teacher.waitingQuota || 0 },
                        ].map(stat => (
                            <div key={stat.label} className="flex flex-col items-center px-3 py-1.5 rounded-xl min-w-[60px]"
                                 style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)' }}>
                                <span style={{ color: 'rgba(255,255,255,0.60)', fontSize: '10px', fontWeight: 600, lineHeight: 1, marginBottom: '2px' }}>{stat.label}</span>
                                <span style={{ color: '#fff', fontWeight: 900, fontSize: '22px', lineHeight: 1 }}>{stat.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-b-2xl overflow-hidden" style={{ border: `2px solid #e0dcfb`, borderTop: 'none' }}>
                <table className="w-full border-collapse" style={{ minWidth: '600px' }}>
                    <thead>
                        <tr>
                            <th style={{ minWidth: '80px', background: C_BG, color: '#fff', fontWeight: 900, fontSize: '13px', textAlign: 'center', padding: '10px 6px', borderBottom: `2px solid ${C_DAY_SEP}`, borderLeft: `2px solid ${C_DAY_SEP}` }}>
                                اليوم
                            </th>
                            {Array.from({ length: MAX_PERIODS }).map((_, i) => (
                                <th key={i} style={{ minWidth: '90px', background: C_BG_SOFT, color: '#64748b', fontWeight: 700, fontSize: '12px', textAlign: 'center', padding: '8px 2px', borderBottom: `2px solid ${C_DAY_SEP}`, borderLeft: `1px solid ${C_BORDER}` }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#fff', border: `2px solid ${C_DAY_SEP}`, color: '#64748b', fontWeight: 900, fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                        {i + 1}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {DAYS.map((day, di) => (
                            <tr key={day}>
                                <td className="font-black text-center"
                                    style={{ minWidth: '80px', height: '76px', padding: '10px 8px', background: di % 2 === 0 ? '#f8fafc' : '#f1f5f9', color: '#475569', fontSize: '13px', borderLeft: `2px solid ${C_DAY_SEP}`, borderBottom: `1px solid ${C_BORDER}`, position: 'sticky', right: 0, zIndex: 5 }}>
                                    {DAY_NAMES[day]}
                                </td>
                                {Array.from({ length: MAX_PERIODS }).map((_, pi) =>
                                    renderCell(teacher, day, di, pi + 1)
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    /* ══════════════════════════════════════════════════════ */
    return (
        <div className="space-y-6 relative">
            {/* ── Error Toast ── */}
            {swapError && (
                <div
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl w-auto max-w-md animate-in slide-in-from-top-4"
                    style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', fontFamily: '"Tajawal", sans-serif' }}
                >
                    <span className="text-rose-500 mt-0.5 shrink-0 text-lg font-black">✕</span>
                    <div>
                        <p className="font-black text-rose-700 text-sm mb-0.5">تعذّر تنفيذ التعديل</p>
                        <p className="text-rose-600 text-xs font-semibold leading-relaxed">{swapError}</p>
                    </div>
                    <button onClick={() => setSwapError(null)} className="mr-auto text-rose-400 hover:text-rose-600 font-black text-lg leading-none shrink-0">✕</button>
                </div>
            )}
            {/* Selector header */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div>
                        <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <Users size={20} className="text-[#655ac1]" />
                            مقارنة وتعديل
                        </h4>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            اختر المعلمين المراد التعديل بينهم جنباً إلى جنب بشكل مباشر.
                        </p>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsSelecting(!isSelecting)}
                            className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center gap-2"
                        >
                            <UserPlus size={18} />
                            إضافة معلمين للواجهة
                        </button>

                        {isSelecting && (
                            <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in slide-in-from-top-2">
                                <div className="relative mb-2">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="ابحث عن معلم..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#655ac1]/20 font-medium"
                                    />
                                </div>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                    {filteredTeachers.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => { setSelectedTeacherIds(prev => [...prev, t.id]); setIsSelecting(false); setSearchQuery(''); }}
                                            className="w-full text-right px-3 py-2 text-sm font-bold text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1] rounded-lg transition-colors flex items-center justify-between group"
                                        >
                                            {t.name}
                                            <Check size={14} className="opacity-0 group-hover:opacity-100" />
                                        </button>
                                    ))}
                                    {filteredTeachers.length === 0 && (
                                        <p className="text-center text-xs text-slate-400 font-medium py-3">لا يوجد معلمين مطابقين</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {selectedTeachers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                        {selectedTeachers.map(t => (
                            <div key={t.id} className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-[#f0edff] text-[#655ac1] rounded-lg border border-[#e5e1fe]">
                                <span className="text-sm font-bold">{t.name}</span>
                                <button
                                    onClick={() => setSelectedTeacherIds(prev => prev.filter(id => id !== t.id))}
                                    className="p-1 hover:bg-white rounded-md transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Schedule comparison */}
            {selectedTeachers.length > 0 ? (
                <div className={`grid gap-4 ${selectedTeachers.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {selectedTeachers.map(teacher => renderTeacherTable(teacher))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                        <Users size={32} />
                    </div>
                    <h5 className="text-lg font-black text-slate-700 mb-2">استعرض وقارن</h5>
                    <p className="text-sm font-medium text-slate-500 max-w-sm">
                        قم باختيار المعلمين المراد التعديل بينهم لعرض جداولهم متجاورة للتبديل والتعديل اللحظي بسهولة ومرونة.
                    </p>
                </div>
            )}

            <SwapConfirmationModal
                isOpen={!!pendingSwap}
                onClose={() => setPendingSwap(null)}
                onConfirm={confirmSwap}
                swapResult={pendingSwap}
            />
        </div>
    );
};

export default CustomTeacherView;
