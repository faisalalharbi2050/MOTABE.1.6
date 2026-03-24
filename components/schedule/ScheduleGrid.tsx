import React, { useState, useMemo } from 'react';
import { Teacher, ScheduleSettingsData, TimetableData, Subject, ClassInfo, AuditLogEntry } from '../../types';
import { getKey, tryMoveOrSwap, findChainSwap, SwapResult } from '../../utils/scheduleInteractive';
import { AlertCircle, User, Users, GripHorizontal, Eye, Lock } from 'lucide-react';
import SwapConfirmationModal from './SwapConfirmationModal';

interface ScheduleGridProps {
    teachers: Teacher[];
    subjects: Subject[];
    classes: ClassInfo[];
    settings: ScheduleSettingsData;
    onUpdateSettings: (newSettings: ScheduleSettingsData) => void;
    activeSchoolId: string;
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
const DAY_NAMES: Record<string, string> = {
    'sunday': 'الأحد', 'monday': 'الإثنين', 'tuesday': 'الثلاثاء', 'wednesday': 'الأربعاء', 'thursday': 'الخميس'
};

const ScheduleGrid: React.FC<ScheduleGridProps> = ({
    teachers, subjects, classes, settings, onUpdateSettings, activeSchoolId
}) => {
    const [dragSource, setDragSource] = useState<{teacherId: string, day: string, period: number} | null>(null);
    const [hoverTarget, setHoverTarget] = useState<string | null>(null);
    const [pendingSwap, setPendingSwap] = useState<SwapResult | null>(null);
    const [draggingWaitingTeacherId, setDraggingWaitingTeacherId] = useState<string | null>(null);

    const periodCount = 7;
    const timetable = settings.timetable || {};
    const isManualMode = settings.substitution?.method === 'manual';

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
        e.dataTransfer.setData('dragType', 'slot');
        e.dataTransfer.setData('sourceKey', key);
        e.dataTransfer.effectAllowed = 'move';
    };

    // ── Drag: waiting card (from quota column) ──
    const handleWaitingCardDragStart = (e: React.DragEvent, teacherId: string) => {
        e.dataTransfer.setData('dragType', 'waitingCard');
        e.dataTransfer.setData('waitingTeacherId', teacherId);
        e.dataTransfer.effectAllowed = 'move';
        setDraggingWaitingTeacherId(teacherId);
    };

    // ── Drag: existing waiting slot (move it) ──
    const handleWaitingSlotDragStart = (e: React.DragEvent, teacherId: string, day: string, period: number) => {
        const key = getKey(teacherId, day, period);
        e.dataTransfer.setData('dragType', 'waitingSlot');
        e.dataTransfer.setData('sourceKey', key);
        e.dataTransfer.setData('waitingTeacherId', teacherId);
        e.dataTransfer.effectAllowed = 'move';
        setDraggingWaitingTeacherId(teacherId);
    };

    const handleDragOver = (e: React.DragEvent, targetTeacherId: string, targetKey: string) => {
        e.preventDefault();
        if (draggingWaitingTeacherId && draggingWaitingTeacherId !== targetTeacherId) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }
        setHoverTarget(targetKey);
    };

    const handleDrop = (e: React.DragEvent, targetTeacherId: string, targetDay: string, targetPeriod: number) => {
        e.preventDefault();
        setHoverTarget(null);
        const dragType = e.dataTransfer.getData('dragType');
        const targetKey = getKey(targetTeacherId, targetDay, targetPeriod);

        // ── Drop: waiting card → create new waiting slot ──
        if (dragType === 'waitingCard') {
            const waitingTeacherId = e.dataTransfer.getData('waitingTeacherId');
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
            const sourceKey = e.dataTransfer.getData('sourceKey');
            const waitingTeacherId = e.dataTransfer.getData('waitingTeacherId');
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
            settings
        );
        if (result.success) {
            setPendingSwap(result);
        } else {
            const chainResult = findChainSwap(
                timetable, dragSource,
                { teacherId: targetTeacherId, day: targetDay, period: targetPeriod },
                teachers, settings
            );
            if (chainResult && chainResult.success) {
                setPendingSwap(chainResult);
            } else {
                alert(result.reason || "لا يمكن النقل (تعارض في الجدول)");
            }
        }
        setDragSource(null);
    };

    const handleDragEnd = () => {
        setDraggingWaitingTeacherId(null);
        setDragSource(null);
        setHoverTarget(null);
    };

    const confirmSwap = () => {
        if (pendingSwap && pendingSwap.newTimetable) {
            const logEntry: AuditLogEntry = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toISOString(),
                user: "المستخدم الحالي",
                actionType: pendingSwap.isChain ? 'chain_swap' : 'swap',
                description: pendingSwap.chainSteps?.join(' | ') || 'تبديل حصص',
                relatedTeacherIds: []
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

    const getCellContent = (teacherId: string, day: string, period: number) => {
        const key = getKey(teacherId, day, period);
        const slot = timetable[key];
        if (!slot) return null;
        const subj = subjects.find(s => s.id === slot.subjectId);
        const cls = classes.find(c => c.id === slot.classId);

        if (cls && !isClassInActiveSchool(cls)) {
            return (
                <div className="w-full h-full p-1 rounded-lg text-[10px] flex flex-col items-center justify-center gap-0.5 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed transition-all" title="محجوز في المدرسة المشتركة الأخرى">
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
                    className={`relative w-full h-full p-1 rounded-lg text-[10px] flex flex-col items-center justify-center gap-0.5 bg-orange-50 text-orange-600 border border-orange-100 transition-all ${isManualMode ? 'cursor-grab active:cursor-grabbing hover:bg-orange-100 group' : ''}`}
                >
                    <Eye size={14} className="opacity-70" />
                    <span className="font-bold truncate w-full text-center">انتظار</span>
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
            <div className="w-full h-full p-1 rounded-lg text-[10px] flex flex-col items-center justify-center gap-0.5 bg-[#f4f2ff] text-[#7c6dd6] cursor-grab active:cursor-grabbing border border-transparent hover:border-[#a59bf0]/30 transition-all">
                <span className="font-extrabold truncate w-full text-center" title={subj?.name}>
                    {settings.subjectAbbreviations?.[subj?.id || ''] || subj?.name || '---'}
                </span>
                <span className="font-bold opacity-80 truncate w-full text-center dir-ltr">{cls?.name || '---'}</span>
            </div>
        );
    };

    return (
        <div className="overflow-x-auto pb-4 custom-scrollbar">
            <div className="min-w-[1200px]">
                {/* Header Row */}
                <div className="grid grid-cols-[260px_1fr] gap-0 border-b-2 border-slate-100 sticky top-0 bg-white z-20">
                    <div className="flex bg-slate-50 font-black text-slate-600 text-xs text-center border-l border-slate-100">
                        <div className="w-[160px] p-4 flex items-center justify-center">المعلمين</div>
                        <div className="w-[50px] p-4 flex items-center justify-center text-[10px] text-slate-500 bg-slate-100/50 border-r border-slate-100" title="النصاب الأساسي">الأساسي</div>
                        <div className="w-[50px] p-4 flex items-center justify-center text-[10px] text-slate-500 bg-orange-50/50 border-r border-slate-100" title="نصاب الانتظار">الانتظار</div>
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
                    {teachers.map(teacher => {
                        const waitingQuota = teacher.waitingQuota || 0;
                        const placed = placedWaitingPerTeacher[teacher.id] || 0;
                        const remaining = waitingQuota - placed;
                        const showCard = isManualMode && waitingQuota > 0;

                        return (
                            <div key={teacher.id} className="grid grid-cols-[260px_1fr] group transition-colors hover:bg-slate-50/50">
                                {/* Teacher Info */}
                                <div className="flex border-l border-slate-100">
                                    <div className="w-[160px] p-3 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">
                                            {teacher.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-700 text-xs truncate" title={teacher.name}>{teacher.name}</div>
                                            <div className="text-[10px] text-slate-400 truncate">{teacher.phone || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="w-[50px] flex items-center justify-center text-xs font-bold text-slate-600 bg-slate-50/50 border-r border-slate-100">
                                        {teacher.quotaLimit}
                                    </div>
                                    {/* Waiting Quota Cell */}
                                    <div className="w-[50px] flex items-center justify-center bg-orange-50/30 border-r border-slate-100 p-0.5">
                                        {showCard && remaining > 0 ? (
                                            <div
                                                draggable
                                                onDragStart={(e) => handleWaitingCardDragStart(e, teacher.id)}
                                                onDragEnd={handleDragEnd}
                                                title={`اسحب لإضافة حصة انتظار — متبقٍ ${remaining} من ${waitingQuota}`}
                                                className="w-full cursor-grab active:cursor-grabbing bg-white border-2 border-orange-300 rounded-lg p-1 flex flex-col items-center justify-center gap-0.5 hover:border-orange-400 hover:shadow-sm transition-all select-none"
                                            >
                                                <span className="text-[9px] font-black text-orange-600 leading-none">م</span>
                                                <span className="text-[8px] font-bold text-orange-400 leading-none">{remaining}/{waitingQuota}</span>
                                            </div>
                                        ) : showCard && remaining === 0 ? (
                                            <div className="w-full flex items-center justify-center" title="اكتمل التوزيع">
                                                <span className="text-emerald-500 font-black text-sm">✓</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold text-orange-600">{waitingQuota}</span>
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
                                                            h-12 border-b border-transparent p-0.5 relative transition-all
                                                            ${isHovered && !isForeignSlot && !isValidWaitingDrop ? 'bg-primary/10 ring-2 ring-inset ring-primary z-10' : ''}
                                                            ${isValidWaitingDrop && isHovered ? 'bg-orange-50 ring-2 ring-inset ring-orange-400 z-10' : ''}
                                                            ${isForeignSlot ? 'bg-slate-50 opacity-80' : ''}
                                                        `}
                                                    >
                                                        {getCellContent(teacher.id, day, p)}
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
