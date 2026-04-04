import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
    specializationNames?: Record<string, string>;
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
const GAP_BG     = '#eef2f7';
const DAY_COL_W  = 60;
const PERIOD_COL_W = 60;
const ROW_H = 60;

const CustomTeacherView: React.FC<CustomTeacherViewProps> = ({
    teachers, subjects, classes, settings, onUpdateSettings, activeSchoolId, specializationNames = {}
}) => {
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSelecting, setIsSelecting] = useState(false);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number; width: number }>({ top: 0, right: 0, width: 320 });
    const [dragSource, setDragSource] = useState<{ teacherId: string; day: string; period: number } | null>(null);
    const [hoverTarget, setHoverTarget] = useState<string | null>(null);
    const [pendingSwap, setPendingSwap] = useState<SwapResult | null>(null);
    const [swapError, setSwapError] = useState<string | null>(null);
    const addButtonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const timetable = settings.timetable || {};
    const selectedTeachers = teachers.filter(t => selectedTeacherIds.includes(t.id));
    const filteredTeachers = teachers.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        if (!isSelecting) return;

        const updateDropdownPosition = () => {
            if (!addButtonRef.current) return;
            const rect = addButtonRef.current.getBoundingClientRect();
            const width = Math.min(380, Math.max(320, rect.width + 70));
            const margin = 16;
            const right = Math.max(margin, window.innerWidth - rect.right);
            setDropdownPos({
                top: rect.bottom + 12,
                right,
                width: Math.min(width, window.innerWidth - margin * 2),
            });
        };

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const inButton = addButtonRef.current?.contains(target);
            const inDropdown = dropdownRef.current?.contains(target);
            if (!inButton && !inDropdown) setIsSelecting(false);
        };

        updateDropdownPosition();
        window.addEventListener('resize', updateDropdownPosition);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('resize', updateDropdownPosition);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSelecting]);

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
                <div className="w-full h-full rounded-[10px] flex flex-col items-center justify-center gap-0.5"
                     style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                    <Lock size={12} className="text-slate-400" />
                    <span style={{ color: '#94a3b8', fontSize: '8px', fontWeight: 700 }}>مشغول</span>
                </div>
            );
        } else if (!slot) {
            inner = (
                <div className="w-full h-full rounded-[10px] flex items-center justify-center"
                     style={{ border: `1px dashed ${isHov ? C_BG : '#dde1ea'}`, background: isHov ? '#ede9fe' : '#f8f9fc' }}>
                    <span style={{ color: '#c8cdd8', fontSize: '8px', fontWeight: 700 }}>—</span>
                </div>
            );
        } else if (slot.type === 'waiting') {
            inner = (
                <div className="w-full h-full rounded-[10px] flex flex-col items-center justify-center gap-0.5"
                     style={{ background: '#fef3e8', border: '1px solid #fbd28a' }}>
                    <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', fontSize: '7px', fontWeight: 900, borderRadius: '9999px', padding: '2px 5px' }}>انتظار</span>
                </div>
            );
        } else {
            const subj     = subjects.find(s => s.id === slot.subjectId);
            const clsInfo  = classes.find(c => c.id === slot.classId);
            const subjDisp = settings.subjectAbbreviations?.[slot.subjectId || ''] || subj?.name || '---';
            const clsDisp  = clsInfo?.name || '---';
            inner = (
                <div className="w-full h-full rounded-[10px] flex flex-col items-center justify-center px-1 gap-0.5 transition-all"
                     style={{ background: '#ffffff', border: '1px solid #d1d5db', boxShadow:'0 1px 2px rgba(15,23,42,0.06)' }}>
                    <span style={{ color: '#334155', fontSize: '10px', fontWeight: 800, lineHeight: 1.1, textAlign: 'center', width: '100%', padding: '0 1px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {clsDisp}
                    </span>
                    <span style={{ color: '#0f172a', fontSize: '8px', fontWeight: 700, lineHeight: 1.1, textAlign: 'center', width: '100%', padding: '0 1px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
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
                    height: `${ROW_H}px`,
                    padding: '3px',
                    background: GAP_BG,
                    borderLeft: '0',
                    borderBottom: '0',
                    cursor: slot && !isForeign ? 'grab' : 'default',
                    transition: 'background 0.15s',
                    outline: isHov ? `2px solid ${C_BG}` : 'none',
                    outlineOffset: '-2px',
                }}
            >
                <div
                    className="w-full h-full"
                    style={{
                        background: isHov ? '#ede9fe' : rowBg,
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        padding: '2px',
                    }}
                >
                    {inner}
                </div>
            </td>
        );
    };

    /* ── Single teacher table (InlineScheduleView style) ── */
    const renderTeacherTable = (teacher: Teacher) => (
        <div key={teacher.id} className="min-w-0 w-full max-w-full">
            {/* Info header */}
            <div
                className="rounded-t-[24px] p-3.5 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #655ac1 0%, #7c6dd6 100%)', boxShadow: '0 12px 32px rgba(101,90,193,0.25)' }}
            >
                <div className="flex items-center gap-2.5">
                    <div className="flex-1 min-w-0">
                        <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '10px', fontWeight: 700 }}>المعلم</div>
                        <div className="truncate" style={{ color: '#fff', fontWeight: 900, fontSize: '16px', lineHeight: 1.2 }}>{teacher.name}</div>
                        <div
                            className="truncate mt-1"
                            style={{ color: 'rgba(255,255,255,0.86)', fontSize: '11px', fontWeight: 600 }}
                        >
                            {specializationNames[teacher.specializationId] || '—'}
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        {[
                            { label: 'نصاب', value: teacher.quotaLimit || 0 },
                            { label: 'انتظار', value: teacher.waitingQuota || 0 },
                        ].map(stat => (
                            <div key={stat.label} className="flex flex-col items-center px-2.5 py-1.5 rounded-xl min-w-[52px]"
                                 style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)' }}>
                                <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: '9px', fontWeight: 700, lineHeight: 1, marginBottom: '2px' }}>{stat.label}</span>
                                <span style={{ color: '#fff', fontWeight: 900, fontSize: '18px', lineHeight: 1 }}>{stat.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-b-[24px] overflow-hidden" style={{ border: `1px solid #dde3ee`, borderTop: 'none', background: GAP_BG }}>
                <table className="w-full border-collapse table-fixed" style={{ background: GAP_BG }}>
                    <thead>
                        <tr>
                            <th style={{ width: `${DAY_COL_W}px`, background: GAP_BG, padding: '3px', borderBottom: '0', borderLeft: '0' }}>
                                <div
                                    className="flex items-center justify-center rounded-[14px]"
                                    style={{ background: 'linear-gradient(135deg, #655ac1 0%, #7c6dd6 100%)', border: '1px solid #5b50b8', color: '#fff', fontWeight: 900, fontSize: '14px', minHeight: '42px' }}
                                >
                                    اليوم
                                </div>
                            </th>
                            {Array.from({ length: MAX_PERIODS }).map((_, i) => (
                                <th key={i} style={{ width: `${PERIOD_COL_W}px`, background: GAP_BG, padding: '3px', borderBottom: '0', borderLeft: '0' }}>
                                    <div className="flex items-center justify-center">
                                        <div
                                            className="flex items-center justify-center rounded-[14px]"
                                            style={{ width: '100%', minHeight: '42px', background: '#ffffff', border: '1px solid #d1d5db', boxShadow:'0 1px 2px rgba(15,23,42,0.06)', color: '#5b50b8', fontWeight: 900, fontSize: '16px' }}
                                        >
                                            {i + 1}
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {DAYS.map((day, di) => (
                            <tr key={day}>
                                <td
                                    style={{ width: `${DAY_COL_W}px`, height: `${ROW_H}px`, background: GAP_BG, padding: '3px' }}
                                >
                                    <div
                                        className="w-full h-full flex items-center justify-center rounded-[14px]"
                                        style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
                                    >
                                        <span style={{ color: '#5b50b8', fontSize: '14px', fontWeight: 900, lineHeight: 1 }}>{DAY_NAMES[day]}</span>
                                    </div>
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
                            ref={addButtonRef}
                            onClick={() => setIsSelecting(!isSelecting)}
                            className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center gap-2"
                        >
                            <UserPlus size={18} className="text-[#655ac1]" />
                            إضافة معلمين للواجهة
                        </button>

                        {isSelecting && createPortal(
                            <div
                                ref={dropdownRef}
                                className="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[120] animate-in slide-in-from-top-2"
                                style={{ top: dropdownPos.top, right: dropdownPos.right, width: dropdownPos.width }}
                            >
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
                                        (() => {
                                            const isSelected = selectedTeacherIds.includes(t.id);
                                            return (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                setSelectedTeacherIds(prev =>
                                                    isSelected ? prev.filter(id => id !== t.id) : [...prev, t.id]
                                                );
                                            }}
                                            className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between border ${
                                                isSelected
                                                    ? 'bg-white text-[#655ac1] border-[#655ac1] shadow-sm'
                                                    : 'text-slate-700 border-transparent hover:bg-[#f0edff] hover:text-[#655ac1] hover:border-[#d9d3ff]'
                                            }`}
                                        >
                                            {t.name}
                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border transition-all ${
                                                isSelected
                                                    ? 'bg-[#655ac1] border-[#655ac1] text-white'
                                                    : 'border-slate-300 text-transparent'
                                            }`}>
                                                <Check size={12} strokeWidth={3} />
                                            </span>
                                        </button>
                                            );
                                        })()
                                    ))}
                                    {filteredTeachers.length === 0 && (
                                        <p className="text-center text-xs text-slate-400 font-medium py-3">لا يوجد معلمين مطابقين</p>
                                    )}
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>
                </div>

                {selectedTeachers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                        {selectedTeachers.map(t => (
                            <div key={t.id} className="flex items-center gap-2 pl-2.5 pr-3.5 py-2 bg-white text-[#655ac1] rounded-xl border border-slate-300 shadow-sm">
                                <span className="text-sm font-bold">{t.name}</span>
                                <button
                                    onClick={() => setSelectedTeacherIds(prev => prev.filter(id => id !== t.id))}
                                    className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-slate-600"
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
                <div className={`grid gap-5 items-start ${selectedTeachers.length >= 2 ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`} dir="rtl">
                    {selectedTeachers.map(teacher => renderTeacherTable(teacher))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center justify-center text-[#655ac1] mb-4">
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
