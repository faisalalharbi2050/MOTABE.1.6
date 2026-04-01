import React, { useState, useMemo } from 'react';
import { Teacher, ScheduleSettingsData, Subject, ClassInfo, AuditLogEntry } from '../../types';
import { getKey, tryMoveOrSwap, findChainSwap, SwapResult } from '../../utils/scheduleInteractive';
import { GripHorizontal, Lock } from 'lucide-react';
import SwapConfirmationModal from './SwapConfirmationModal';

interface ScheduleGridProps {
    teachers: Teacher[];
    subjects: Subject[];
    classes: ClassInfo[];
    settings: ScheduleSettingsData;
    onUpdateSettings: (newSettings: ScheduleSettingsData) => void;
    activeSchoolId: string;
    interactive?: boolean;
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
const TEACHER_COLUMN_WIDTH = 168;
const BASE_QUOTA_COLUMN_WIDTH = 48;
const WAITING_COLUMN_WIDTH = 96;
const SLOT_HEIGHT_CLASS = 'h-[108px]';
const TWO_LINE_CLAMP: React.CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};
const DAY_NAMES: Record<string, string> = {
    'sunday': 'الأحد', 'monday': 'الإثنين', 'tuesday': 'الثلاثاء', 'wednesday': 'الأربعاء', 'thursday': 'الخميس'
};

const ScheduleGrid: React.FC<ScheduleGridProps> = ({
    teachers, subjects, classes, settings, onUpdateSettings, activeSchoolId, interactive = true
}) => {
    const [dragSource, setDragSource] = useState<{teacherId: string, day: string, period: number} | null>(null);
    const [hoverTarget, setHoverTarget] = useState<string | null>(null);
    const [pendingSwap, setPendingSwap] = useState<SwapResult | null>(null);
    const [draggingWaitingTeacherId, setDraggingWaitingTeacherId] = useState<string | null>(null);
    const [hoverWaitingColumn, setHoverWaitingColumn] = useState<string | null>(null);
    const [swapError, setSwapError] = useState<string | null>(null);

    const periodCount = 7;
    const timetable = settings.timetable || {};
    const isManualMode = interactive && settings.substitution?.method === 'manual';

    // Count placed waiting periods per teacher
    const placedWaitingPerTeacher = useMemo(() => {
        const counts: Record<string, number> = {};
        Object.values(timetable).forEach(slot => {
            if (slot.type === 'waiting') {
                counts[slot.teacherId] = (counts[slot.teacherId] || 0) + 1;
            }
        });
        return counts;
    }, [timetable]);

    // ── Drag: regular lesson slot ──
    const handleDragStart = (e: React.DragEvent, teacherId: string, day: string, period: number) => {
        const key = getKey(teacherId, day, period);
        if (!timetable[key]) { e.preventDefault(); return; }
        setDragSource({ teacherId, day, period });
        e.dataTransfer.setData('text/plain', key);
        e.dataTransfer.setData('dragType', 'slot');
        e.dataTransfer.setData('sourceKey', key);
        e.dataTransfer.effectAllowed = 'move';
    };

    // ── Drag: waiting card (from quota column) ──
    const handleWaitingCardDragStart = (e: React.DragEvent, teacherId: string) => {
        if (!isManualMode) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', teacherId);
        e.dataTransfer.setData('dragType', 'waitingCard');
        e.dataTransfer.setData('waitingTeacherId', teacherId);
        e.dataTransfer.effectAllowed = 'move';
        setDraggingWaitingTeacherId(teacherId);
    };

    // ── Drag: existing waiting slot (move it) ──
    const handleWaitingSlotDragStart = (e: React.DragEvent, teacherId: string, day: string, period: number) => {
        if (!isManualMode) {
            e.preventDefault();
            return;
        }
        const key = getKey(teacherId, day, period);
        e.dataTransfer.setData('text/plain', key);
        e.dataTransfer.setData('dragType', 'waitingSlot');
        e.dataTransfer.setData('sourceKey', key);
        e.dataTransfer.setData('waitingTeacherId', teacherId);
        e.dataTransfer.effectAllowed = 'move';
        setDraggingWaitingTeacherId(teacherId);
    };

    const handleDragOver = (e: React.DragEvent, targetTeacherId: string, targetKey: string) => {
        const dragType = e.dataTransfer.getData('dragType');
        const waitingTeacherId = e.dataTransfer.getData('waitingTeacherId') || draggingWaitingTeacherId;
        const isWaitingDrag = dragType === 'waitingCard' || dragType === 'waitingSlot' || !!waitingTeacherId;
        if (isWaitingDrag) {
            if (!isManualMode) return;
            if (waitingTeacherId && waitingTeacherId !== targetTeacherId) {
                e.dataTransfer.dropEffect = 'none';
                return;
            }
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setHoverTarget(targetKey);
            return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setHoverTarget(targetKey);
    };

    const handleDrop = (e: React.DragEvent, targetTeacherId: string, targetDay: string, targetPeriod: number) => {
        e.preventDefault();
        setHoverTarget(null);
        const dragType = e.dataTransfer.getData('dragType');
        const targetKey = getKey(targetTeacherId, targetDay, targetPeriod);

        // ── Drop: waiting card → create new waiting slot ──
        if (dragType === 'waitingCard') {
            if (!isManualMode) return;
            const waitingTeacherId = e.dataTransfer.getData('waitingTeacherId') || draggingWaitingTeacherId;
            setDraggingWaitingTeacherId(null);
            if (waitingTeacherId !== targetTeacherId) return;
            if (timetable[targetKey]) return;
            const newTimetable = {
                ...timetable,
                [targetKey]: { teacherId: targetTeacherId, type: 'waiting' as const }
            };
            onUpdateSettings({ ...settings, timetable: newTimetable });
            return;
        }

        // ── Drop: waiting slot → move to empty cell ──
        if (dragType === 'waitingSlot') {
            if (!isManualMode) return;
            const sourceKey = e.dataTransfer.getData('sourceKey');
            const waitingTeacherId = e.dataTransfer.getData('waitingTeacherId') || draggingWaitingTeacherId;
            setDraggingWaitingTeacherId(null);
            if (waitingTeacherId !== targetTeacherId) return;
            if (timetable[targetKey]) return;
            if (sourceKey === targetKey) return;
            const newTimetable = { ...timetable };
            newTimetable[targetKey] = newTimetable[sourceKey];
            delete newTimetable[sourceKey];
            onUpdateSettings({ ...settings, timetable: newTimetable });
            return;
        }

        // ── Drop: regular slot → swap logic ──
        if (!dragSource) return;
        const result = tryMoveOrSwap(
            timetable, dragSource,
            { teacherId: targetTeacherId, day: targetDay, period: targetPeriod },
            settings, teachers, classes
        );
        if (result.success) {
            setSwapError(null);
            setPendingSwap(result);
        } else {
            const chainResult = findChainSwap(
                timetable, dragSource,
                { teacherId: targetTeacherId, day: targetDay, period: targetPeriod },
                teachers, settings, classes
            );
            if (chainResult && chainResult.success) {
                setSwapError(null);
                setPendingSwap(chainResult);
            } else {
                setSwapError(result.reason || "لا يمكن تنفيذ هذا التعديل. جرّب خلية أخرى.");
                setTimeout(() => setSwapError(null), 4000);
            }
        }
        setDragSource(null);
    };

    const handleDragEnd = () => {
        setDraggingWaitingTeacherId(null);
        setDragSource(null);
        setHoverTarget(null);
        setHoverWaitingColumn(null);
    };

    // ── Drop: waiting slot → return to quota column ──
    const handleWaitingColumnDrop = (teacherId: string) => (e: React.DragEvent) => {
        if (!isManualMode) return;
        e.preventDefault();
        setHoverWaitingColumn(null);
        const dragType = e.dataTransfer.getData('dragType');
        if (dragType === 'waitingSlot') {
            const sourceKey = e.dataTransfer.getData('sourceKey');
            const waitingTeacherId = e.dataTransfer.getData('waitingTeacherId') || draggingWaitingTeacherId;
            if (waitingTeacherId !== teacherId) return;
            setDraggingWaitingTeacherId(null);
            const newTimetable = { ...timetable };
            delete newTimetable[sourceKey];
            onUpdateSettings({ ...settings, timetable: newTimetable });
        }
    };

    const confirmSwap = () => {
        if (pendingSwap && pendingSwap.newTimetable) {
            const relatedIds = pendingSwap.relatedTeacherIds || [];
            const primaryTeacher = teachers.find(t => t.id === relatedIds[0]);
            const logEntry: AuditLogEntry = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toISOString(),
                user: "المستخدم الحالي",
                actionType: pendingSwap.isChain ? 'chain_swap' : 'swap',
                description: pendingSwap.chainSteps?.join(' | ') || 'تبديل حصص',
                relatedTeacherIds: relatedIds,
                viewType: 'general',
                teacherName: primaryTeacher?.name || '',
            };
            const updatedLogs = [...(settings.auditLogs || []), logEntry];
            onUpdateSettings({ ...settings, timetable: pendingSwap.newTimetable, auditLogs: updatedLogs });
        }
        setPendingSwap(null);
    };

    const isClassInActiveSchool = (c?: ClassInfo) => {
        if (!c) return true;
        if (activeSchoolId === 'main' || !activeSchoolId) return !c.schoolId || c.schoolId === 'main';
        return c.schoolId === activeSchoolId;
    };

    const isWaitingDragActive = isManualMode && draggingWaitingTeacherId !== null;

    const getCellContent = (teacherId: string, day: string, period: number) => {
        const key = getKey(teacherId, day, period);
        const slot = timetable[key];
        if (!slot) return null;
        const subj = subjects.find(s => s.id === slot.subjectId);
        const cls = classes.find(c => c.id === slot.classId);

        if (cls && !isClassInActiveSchool(cls)) {
            return (
                <div className="w-full h-full p-2 rounded-xl text-[11px] flex flex-col items-center justify-center gap-1.5 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed transition-all" title="محجوز في المدرسة المشتركة الأخرى">
                    <Lock size={14} className="opacity-50 mb-1" />
                    <span className="font-bold truncate w-full text-center">مشغول</span>
                </div>
            );
        }

        if (slot.type === 'waiting') {
            const slotKey = getKey(teacherId, day, period);
            return (
                <div
                    draggable={isManualMode}
                    onDragStart={(e) => { if (isManualMode) handleWaitingSlotDragStart(e, teacherId, day, period); }}
                    onDragEnd={handleDragEnd}
                    className={`relative w-full h-full px-2.5 py-2 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-[linear-gradient(180deg,#faf7ff_0%,#ede9fe_100%)] text-[#5b46b2] border border-[#c4b5fd] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all ${isManualMode ? 'cursor-grab active:cursor-grabbing hover:border-[#8b7cf6] hover:shadow-[0_6px_18px_rgba(101,90,193,0.18)] group' : ''}`}
                >
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-white/90 border border-[#d8ccff] text-[#655ac1]">{"\u0627\u0646\u062a\u0638\u0627\u0631"}</span>
                    <span className="font-black text-[13px] w-full text-center leading-[1.2]" style={TWO_LINE_CLAMP}>{"\u062d\u0635\u0629 \u0627\u0646\u062a\u0638\u0627\u0631"}</span>
                    {isManualMode && (
                        <button
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const newTimetable = { ...timetable };
                                delete newTimetable[slotKey];
                                onUpdateSettings({ ...settings, timetable: newTimetable });
                            }}
                            className="absolute -top-1 -left-1 w-4 h-4 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10 text-[8px] font-black leading-none"
                        >✕</button>
                    )}
                </div>
            );
        }

        return (
            <div className="w-full h-full p-2 rounded-xl text-[11px] flex flex-col items-center justify-center gap-1.5 bg-[#f4f2ff] text-[#6f5fd1] border border-[#e4defd] hover:border-[#b7abf3]/70 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <span className="font-extrabold text-[13px] w-full text-center leading-[1.2]" style={TWO_LINE_CLAMP} title={subj?.name}>
                    {settings.subjectAbbreviations?.[subj?.id || ''] || subj?.name || '---'}
                </span>
                <span className="font-bold text-[12px] opacity-80 w-full text-center leading-[1.2]" style={TWO_LINE_CLAMP}>{cls?.name || '---'}</span>
            </div>
        );
    };

    return (
        <div className="w-full overflow-x-hidden pb-4 custom-scrollbar relative">
            {isWaitingDragActive && (
                <div
                    className="absolute z-[220] pointer-events-none"
                    style={{ top: 58, left: TEACHER_COLUMN_WIDTH + BASE_QUOTA_COLUMN_WIDTH + WAITING_COLUMN_WIDTH + 12, right: 12 }}
                >
                    <div className="flex justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#d8ccff] bg-white/95 px-4 py-2 shadow-[0_10px_30px_rgba(101,90,193,0.18)] backdrop-blur-sm">
                        <span className="flex h-7 w-7 items-center justify-center rounded-[10px] border border-[#c4b5fd] bg-[linear-gradient(180deg,#ffffff_0%,#f5f3ff_100%)] text-[14px] font-black text-[#655ac1]">
                            
                        </span>
                        <span className="text-[12px] font-black text-[#655ac1]">اسحب البطاقة إلى الحصة المناسبة</span>
                        </div>
                    </div>
                </div>
            )}
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
            <div className="w-full min-w-0">
                {/* Header Row */}
                <div
                    className="grid gap-0 border-b-2 border-slate-100 sticky top-0 bg-white z-20"
                    style={{ gridTemplateColumns: `${TEACHER_COLUMN_WIDTH + BASE_QUOTA_COLUMN_WIDTH + WAITING_COLUMN_WIDTH}px minmax(0, 1fr)` }}
                >
                    <div className="flex bg-slate-50 font-black text-slate-600 text-xs text-center border-l border-slate-100">
                        <div className="p-4 flex items-center justify-center" style={{ width: TEACHER_COLUMN_WIDTH }}>{"المعلم"}</div>
                        <div className="p-4 flex items-center justify-center text-[10px] text-slate-500 bg-slate-100/50 border-r border-slate-100" style={{ width: BASE_QUOTA_COLUMN_WIDTH }} title={"النصاب الأساسي"}>{"الأساسي"}</div>
                        <div className="p-2.5 flex flex-col items-center justify-center gap-1 bg-white border-r border-slate-100" style={{ width: WAITING_COLUMN_WIDTH }} title={isManualMode ? "اسحب بطاقات الانتظار وأفلتها داخل الحصص الفارغة، ويمكنك أيضًا إرجاعها لهذا العمود" : "نصاب الانتظار"}>
                            <span className="text-[11px] text-[#5b46b2] font-black">{"\u0646\u0635\u0627\u0628 \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631"}</span>
                            {isManualMode && (
                                <span className="text-[9px] text-[#7c6dd6] font-semibold flex items-center gap-1">
                                    <GripHorizontal size={10} />{"اسحب وأفلت"}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-5 divide-x divide-x-reverse divide-slate-100">
                        {DAYS.map(day => (
                            <div key={day} className="text-center">
                                <div className="py-2 bg-slate-50 text-xs font-black text-slate-500 border-b border-slate-100">{DAY_NAMES[day]}</div>
                                <div className="grid grid-cols-7 divide-x divide-x-reverse divide-slate-50">
                                    {Array.from({ length: periodCount }).map((_, i) => (
                                        <div key={i} className="py-1.5 text-[10px] font-bold text-slate-400 bg-slate-50/50">{i + 1}</div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Teachers Rows */}
                <div className="divide-y divide-slate-100">
                    {teachers.map((teacher, teacherIndex) => {
                        const waitingQuota = teacher.waitingQuota || 0;
                        const placed = placedWaitingPerTeacher[teacher.id] || 0;
                        const remaining = waitingQuota - placed;
                        const showCard = isManualMode && waitingQuota > 0;
                        const isDraggingFromThis = draggingWaitingTeacherId === teacher.id;
                        const isColumnHovered = hoverWaitingColumn === teacher.id;

                        return (
                            <div
                                key={teacher.id}
                                className={`grid group transition-colors hover:bg-slate-50/50 ${
                                    isManualMode && draggingWaitingTeacherId && draggingWaitingTeacherId !== teacher.id
                                        ? 'opacity-55'
                                        : ''
                                }`}
                                style={{ gridTemplateColumns: `${TEACHER_COLUMN_WIDTH + BASE_QUOTA_COLUMN_WIDTH + WAITING_COLUMN_WIDTH}px minmax(0, 1fr)` }}
                            >
                                {/* Teacher Info */}
                                <div className="flex border-l border-slate-100">
                                    <div className="p-3 flex items-center gap-3" style={{ width: TEACHER_COLUMN_WIDTH }}>
                                        <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-black text-[11px] shrink-0">
                                            {teacherIndex + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-700 text-xs truncate" title={teacher.name}>{teacher.name}</div>
                                            <div className="text-[10px] text-slate-400 truncate">{teacher.phone || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center text-xs font-bold text-slate-600 bg-slate-50/50 border-r border-slate-100" style={{ width: BASE_QUOTA_COLUMN_WIDTH }}>
                                        {teacher.quotaLimit}
                                    </div>
                                    {/* Waiting Quota Cell — card stack */}
                                    <div
                                        className={`relative flex items-start justify-start border-r border-slate-100 transition-all ${
                                            isColumnHovered && isDraggingFromThis
                                                ? 'bg-[#f8f7ff] ring-2 ring-inset ring-[#8779fb]'
                                                : 'bg-white'
                                        }`}
                                        style={{ width: WAITING_COLUMN_WIDTH }}
                                        onDragOver={isManualMode && isDraggingFromThis ? (e) => {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                            setHoverWaitingColumn(teacher.id);
                                        } : undefined}
                                        onDragLeave={isManualMode ? () => setHoverWaitingColumn(null) : undefined}
                                        onDrop={isManualMode ? handleWaitingColumnDrop(teacher.id) : undefined}
                                    >
                                        {showCard && remaining > 0 ? (
                                            <div
                                                draggable={isManualMode}
                                                onDragStart={(e) => handleWaitingCardDragStart(e, teacher.id)}
                                                onDragEnd={handleDragEnd}
                                                className={`relative w-full h-full px-2 py-2 ${isManualMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                                title={`اسحب لإضافة حصة انتظار: المتبقي ${remaining} من ${waitingQuota}`}
                                            >
                                                {/* Layer 3 — bottom */}
                                                {remaining >= 3 && (
                                                    <div
                                                        className="absolute top-1 left-2 w-[30px] h-[42px] rounded-[10px] border border-[#d9d2fb]"
                                                        style={{ background: '#d9d0ff', transform: 'rotate(10deg)', opacity: isDraggingFromThis ? 0.28 : 0.62 }}
                                                    />
                                                )}
                                                {/* Layer 2 — middle */}
                                                {remaining >= 2 && (
                                                    <div
                                                        className="absolute top-1 left-2 w-[30px] h-[42px] rounded-[10px] border border-[#e3dcff]"
                                                        style={{ background: '#ebe5ff', transform: 'rotate(5deg)', opacity: isDraggingFromThis ? 0.34 : 0.82 }}
                                                    />
                                                )}
                                                {/* Top card — draggable */}
                                                <div
                                                    className={`absolute top-1 left-2 z-10 w-[30px] h-[42px] rounded-[10px] flex flex-col items-center justify-between overflow-hidden select-none border-2 transition-all pointer-events-none ${
                                                        isDraggingFromThis
                                                            ? 'opacity-35 cursor-grabbing border-[#d7cff7]'
                                                            : 'cursor-grab active:cursor-grabbing border-[#c8bdf5] hover:border-[#9f90ea] hover:shadow-[0_10px_24px_rgba(101,90,193,0.22)] hover:-translate-y-1'
                                                    }`}
                                                    style={{
                                                        background: 'linear-gradient(180deg,#ffffff 0%,#f5f3ff 100%)',
                                                        boxShadow: isDraggingFromThis ? 'none' : '0 8px 20px rgba(101,90,193,0.18)'
                                                    }}
                                                >
                                                    <span className="mt-1 h-[2px] w-3 rounded-full bg-[#d7cff7]" />
                                                    <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full border border-[#ddd6fb] bg-[#f7f4ff] text-[10px] font-black leading-none text-[#655ac1]">م</span>
                                                    <span className="mb-1 h-[2px] w-3 rounded-full bg-[#d7cff7]" />
                                                </div>
                                                {/* Total badge */}
                                                <div className="absolute top-1 right-1 z-20">
                                                    <span className="inline-flex items-center rounded-full bg-white/90 border border-[#d8ccff] px-1.5 py-0.5 text-[10px] font-black text-[#655ac1] shadow-sm">
                                                        {remaining}/{waitingQuota}
                                                    </span>
                                                </div>
                                                {/* Return hint when dragging */}
                                                {isDraggingFromThis && (
                                                    <div className="absolute inset-x-1 bottom-1 flex justify-center z-30">
                                                        <span className="text-[7px] font-black text-[#655ac1] text-center leading-tight px-1.5 py-1 rounded-full bg-white/90 border border-[#d8ccff]">{"\u0623\u0641\u0644\u0650\u062a \u0644\u0644\u0625\u0631\u062c\u0627\u0639"}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : showCard && remaining === 0 ? (
                                            <div
                                                className={`flex flex-col items-center justify-center gap-0.5 w-full h-full py-1 transition-all ${
                                                    isColumnHovered && isDraggingFromThis ? 'opacity-100' : ''
                                                }`}
                                                title={"\u0627\u0643\u062a\u0645\u0644 \u062a\u0648\u0632\u064a\u0639 \u062d\u0635\u0635 \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631\u060c \u0648\u064a\u0645\u0643\u0646\u0643 \u0625\u0639\u0627\u062f\u0629 \u0623\u064a \u0628\u0637\u0627\u0642\u0629 \u0625\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0639\u0645\u0648\u062f"}
                                            >
                                                <span className="text-emerald-500 font-black text-base">{"\u2713"}</span>
                                                <span className="text-[10px] text-emerald-500 font-bold">{remaining}/{waitingQuota}</span>
                                                {isDraggingFromThis && (
                                                    <span className="text-[7px] text-[#7c6dd6] font-bold mt-0.5">{"\u0623\u0641\u0644\u0650\u062a \u0644\u0644\u0625\u0631\u062c\u0627\u0639"}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-1 text-center px-2">
                                                <span className="text-xs font-black text-[#655ac1]">{waitingQuota > 0 ? waitingQuota : '-'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Schedule Cells */}
                                <div className="grid grid-cols-5 divide-x divide-x-reverse divide-slate-100">
                                    {DAYS.map(day => (
                                        <div key={day} className="grid grid-cols-7 divide-x divide-x-reverse divide-slate-100 bg-white relative">
                                            {Array.from({ length: periodCount }).map((_, i) => {
                                                const p = i + 1;
                                                const key = getKey(teacher.id, day, p);
                                                const isHovered = hoverTarget === key;
                                                const slotInfo = timetable[key];
                                                const cls = slotInfo?.classId ? classes.find(c => c.id === slotInfo.classId) : undefined;
                                                const isForeignSlot = cls && !isClassInActiveSchool(cls);
                                                const isValidWaitingDrop = isManualMode
                                                    && draggingWaitingTeacherId === teacher.id
                                                    && !slotInfo
                                                    && !isForeignSlot;

                                                return (
                                                    <div
                                                        key={i}
                                                        draggable={!!slotInfo && slotInfo.type !== 'waiting' && !isForeignSlot}
                                                        onDragStart={(e) => { if (!isForeignSlot && slotInfo?.type !== 'waiting') handleDragStart(e, teacher.id, day, p); }}
                                                        onDragOver={(e) => { if (!isForeignSlot) handleDragOver(e, teacher.id, key); }}
                                                        onDrop={(e) => { if (!isForeignSlot) handleDrop(e, teacher.id, day, p); }}
                                                        onDragEnd={handleDragEnd}
                                                        className={`
                                                            ${SLOT_HEIGHT_CLASS} border-b border-transparent p-1 relative transition-all
                                                            ${isHovered && !isForeignSlot && !isValidWaitingDrop ? 'bg-primary/10 ring-2 ring-inset ring-primary z-10' : ''}
                                                            ${isValidWaitingDrop && isHovered ? 'bg-slate-100 ring-2 ring-inset ring-slate-400 z-10 scale-105' : ''}
                                                            ${isValidWaitingDrop && !isHovered && !slotInfo ? 'bg-slate-50 ring-1 ring-inset ring-slate-300' : ''}
                                                            ${isForeignSlot ? 'bg-slate-50 opacity-80' : ''}
                                                        `}
                                                    >
                                                        {getCellContent(teacher.id, day, p)}
                                                        {isValidWaitingDrop && !slotInfo && !isHovered && (
                                                            <div className="absolute inset-0 pointer-events-none">
                                                                <div className="absolute inset-[4px] rounded-[10px] border border-dashed border-slate-400 bg-slate-100/70" />
                                                            </div>
                                                        )}
                                                        {isValidWaitingDrop && isHovered && !slotInfo && (
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                <div className="rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black text-amber-950 shadow-lg border border-amber-300">
                                                                    {"أفلت الآن"}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <SwapConfirmationModal
                isOpen={!!pendingSwap}
                onClose={() => setPendingSwap(null)}
                onConfirm={confirmSwap}
                swapResult={pendingSwap}
            />
        </div>
    );
};

export default ScheduleGrid;
