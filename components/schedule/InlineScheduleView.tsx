import React, { useState, useMemo } from 'react';
import { ScheduleSettingsData, Teacher, ClassInfo, Subject, AuditLogEntry } from '../../types';
import { Maximize2, Minimize2, Users, CalendarClock, LayoutGrid, Pencil, ArrowRight, CheckCircle2, Shuffle } from 'lucide-react';
import { getKey, tryMoveOrSwap, findChainSwap, SwapResult } from '../../utils/scheduleInteractive';
import SwapConfirmationModal from './SwapConfirmationModal';

export type TeacherSortMode = 'alpha' | 'specialization' | 'custom';

const ENGLISH_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
const ARABIC_DAYS  = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const MAX_PERIODS  = 7;

// Design tokens
const C_BG          = '#a59bf0'; // purple – day header bg & content text
const C_BG_SOFT     = '#f4f2ff'; // very light purple – period-number row bg
const C_BG_HEADER_ROW = '#a59bf0'; // same purple for sticky info header
const C_BORDER      = '#94a3b8'; // slate-400 – normal column dividers (light)
const C_DAY_SEP     = '#64748b'; // slate-500 – separator between days (medium)
const C_STRONG_SEP  = '#334155'; // slate-700 – post-waiting-quota strong separator

const SPECIALIZATION_ABBR: Record<string, string> = {
    'اللغة العربية': 'عربي',
    'الدراسات الإسلامية': 'دين',
    'القرآن الكريم': 'دين',
    'اللغة الإنجليزية': 'انجليزي',
    'التربية الفنية': 'فنية',
    'التربية البدنية': 'بدنية',
    'الحاسب الآلي': 'حاسب',
    'الرياضيات': 'رياضيات',
    'العلوم': 'علوم',
    'الاجتماعيات': 'اجتماعيات',
    'المهارات الحياتية': 'مهارات',
    'التربية المهنية': 'مهنية',
    'التقنية الرقمية': 'رقمية',
    'أحياء': 'أحياء',
    'فيزياء': 'فيزياء',
    'كيمياء': 'كيمياء',
    'علم البيئة': 'بيئة',
};

const TWO_LINE_CLAMP: React.CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

interface InlineScheduleViewProps {
    type: 'general_teachers' | 'general_classes' | 'individual_teacher' | 'individual_class' | 'general_waiting';
    settings: ScheduleSettingsData;
    teachers: Teacher[];
    classes: ClassInfo[];
    subjects: Subject[];
    targetId?: string;
    teacherSortMode?: TeacherSortMode;
    teacherCustomOrder?: string[];
    specializationCustomOrder?: string[];
    specializationNames?: Record<string, string>;
    onEditRequest?: () => void;
    onUpdateSettings?: (s: ScheduleSettingsData) => void;
    interactive?: boolean;
}

const InlineScheduleView: React.FC<InlineScheduleViewProps> = ({
    type, settings: _settings, teachers: _teachers, classes: _classes, subjects: _subjects, targetId,
    teacherSortMode = 'alpha',
    teacherCustomOrder = [],
    specializationCustomOrder = [],
    specializationNames: _specNames = {},
    onEditRequest,
    onUpdateSettings,
    interactive = false,
}) => {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [showWaitingCounts, setShowWaitingCounts] = useState(true);
    const [draggingWaiting, setDraggingWaiting] = useState<'card'|'slot'|null>(null);
    const [draggingSlotKey, setDraggingSlotKey] = useState<string|null>(null);
    const [hoverTarget, setHoverTarget] = useState<string|null>(null);
    const [dragSource, setDragSource] = useState<{teacherId: string; day: string; period: number} | null>(null);
    const [swapError, setSwapError] = useState<string | null>(null);
    const [swapNotice, setSwapNotice] = useState<{ type: 'simple' | 'chain'; text: string } | null>(null);
    const [pendingSwap, setPendingSwap] = useState<SwapResult | null>(null);
    const settings          = _settings;
    const teachers          = _teachers;
    const classes           = _classes;
    const subjects          = _subjects;
    const specializationNames = _specNames;
    const timetable = settings.timetable || {};
    const isManualMode = settings.substitution?.method === 'manual';

    /* ── look-up helpers ─────────────────────────────── */
    const subjName    = (id: string) => subjects.find(s => s.id === id)?.name || '';
    const subjDisplay = (id: string) => settings.subjectAbbreviations?.[id] || subjName(id);
    const tName       = (id: string) => teachers.find(t => t.id === id)?.name || '';
    const cName       = (id: string) => { const c = classes.find(c => c.id === id); return c ? (c.name || `${c.grade}/${c.section}`) : ''; };
    const tLQ  = (t: Teacher) => t.quotaLimit   || 0;
    const tWQ  = (t: Teacher) => t.waitingQuota || 0;

    /* ── abbreviation helper ────────────────────────── */
    const getAbbrSpec = (specId: string) => {
        const full = (specializationNames[specId] || specId || '').trim();
        // Try exact match first
        if(SPECIALIZATION_ABBR[full]) return SPECIALIZATION_ABBR[full];
        // Try partial mapping (e.g. contains "إسلامية")
        if(full.includes('إسلامية') || full.includes('قرآن')) return 'دين';
        if(full.includes('عربية')) return 'عربي';
        if(full.includes('إنجليزية') || full.includes('انجليزي')) return 'انجليزي';
        if(full.includes('فنية')) return 'فنية';
        if(full.includes('بدنية')) return 'بدنية';
        if(full.includes('حاسب')) return 'حاسب';
        return full;
    };

    /* ── class lesson count ──────────────────────────── */
    const classLessonCount = useMemo(() => {
        const m = new Map<string,number>();
        Object.values(timetable).forEach(s => { if(s.classId && s.type==='lesson') m.set(s.classId,(m.get(s.classId)||0)+1); });
        return m;
    }, [timetable]);

    /* ── placed waiting count per teacher (for manual mode) ─ */
    const placedWaitingPerTeacher = useMemo(() => {
        const m = new Map<string, number>();
        Object.entries(timetable).forEach(([key, slot]) => {
            if (slot.type === 'waiting') {
                const tid = key.split('-')[0];
                m.set(tid, (m.get(tid) || 0) + 1);
            }
        });
        return m;
    }, [timetable]);

    /* ── pastel colors helper ────────────────────────── */
    const getPastelColor = (subjectName: string) => {
        const colors = [
            { bg: '#f0fdf4', text: '#166534' }, // green
            { bg: '#eff6ff', text: '#1d4ed8' }, // blue
            { bg: '#fef2f2', text: '#b91c1c' }, // red
            { bg: '#fdf4ff', text: '#be185d' }, // pink
            { bg: '#fefce8', text: '#a16207' }, // yellow
            { bg: '#faf5ff', text: '#86198f' }, // fuchsia
            { bg: '#f5f3ff', text: '#6b21a8' }, // purple
            { bg: '#f0fdfa', text: '#4338ca' }, // violet
            { bg: '#ecfdf5', text: '#0f766e' }, // teal
            { bg: '#fff7ed', text: '#c2410c' }, // orange
        ];
        let hash = 0;
        for (let i = 0; i < subjectName.length; i++) {
            hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    /* ── class-keyed slot map (classId-day-period) ───── */
    const classSlotMap = useMemo(() => {
        const m = new Map<string, typeof timetable[string]>();
        Object.entries(timetable).forEach(([key, slot]) => {
            if (!slot.classId) return;
            for(const day of ENGLISH_DAYS){
                const match = key.match(new RegExp(`-(${day})-(\\d+)$`));
                if(match){ m.set(`${slot.classId}-${day}-${match[2]}`, slot); break; }
            }
        });
        return m;
    }, [timetable]);

    /* ── sorting ─────────────────────────────────────── */
    const getSortedTeachers = (): Teacher[] => {
        const list = [...teachers];
        if(teacherSortMode === 'alpha') return list.sort((a,b)=>a.name.localeCompare(b.name,'ar'));
        if(teacherSortMode === 'specialization'){
            if(specializationCustomOrder.length > 0){
                const om = new Map(specializationCustomOrder.map((id,i)=>[id,i]));
                return list.sort((a,b)=>{
                    const ia = om.has(a.specializationId)?om.get(a.specializationId)!:9999;
                    const ib = om.has(b.specializationId)?om.get(b.specializationId)!:9999;
                    return ia!==ib ? ia-ib : a.name.localeCompare(b.name,'ar');
                });
            }
            return list.sort((a,b)=>{
                const sa=specializationNames[a.specializationId]||a.specializationId||'';
                const sb=specializationNames[b.specializationId]||b.specializationId||'';
                const c=sa.localeCompare(sb,'ar'); return c!==0?c:a.name.localeCompare(b.name,'ar');
            });
        }
        if(teacherSortMode==='custom' && teacherCustomOrder.length>0){
            const om=new Map(teacherCustomOrder.map((id,i)=>[id,i]));
            return list.sort((a,b)=>{
                const ia=om.has(a.id)?om.get(a.id)!:9999, ib=om.has(b.id)?om.get(b.id)!:9999; return ia-ib;
            });
        }
        return list;
    };
    const getSortedClasses = () => [...classes].sort((a,b)=> a.grade!==b.grade?a.grade-b.grade:(a.section||0)-(b.section||0));

    const isInteractiveGeneralTeachers = type === 'general_teachers' && interactive && !!onUpdateSettings;

    const showSwapNotice = (type: 'simple' | 'chain', text: string) => {
        setSwapNotice({ type, text });
        window.setTimeout(() => {
            setSwapNotice(current => (current?.text === text ? null : current));
        }, 2600);
    };

    const commitSwapResult = (result: SwapResult) => {
        if (!onUpdateSettings || !result.success || !result.newTimetable) return;
        const relatedIds = result.relatedTeacherIds || [];
        const primaryTeacher = teachers.find(t => t.id === relatedIds[0]);
        const logEntry: AuditLogEntry = {
            id: Math.random().toString(36).slice(2, 11),
            timestamp: new Date().toISOString(),
            user: 'المستخدم الحالي',
            actionType: result.isChain ? 'chain_swap' : 'swap',
            description: result.chainSteps?.join(' | ') || 'تبديل حصص',
            relatedTeacherIds: relatedIds,
            viewType: 'general',
            teacherName: primaryTeacher?.name || '',
        };
        onUpdateSettings({
            ...settings,
            timetable: result.newTimetable,
            auditLogs: [...(settings.auditLogs || []), logEntry],
        });
        setSwapError(null);
        showSwapNotice(result.isChain ? 'chain' : 'simple', result.isChain ? 'تم تنفيذ تعديل مركب بنجاح' : 'تم تنفيذ تعديل بسيط بنجاح');
    };

    const renderFloatingSwapNotice = (zClass: string) => {
        if (!swapNotice) return null;
        const isChain = swapNotice.type === 'chain';
        const Icon = isChain ? Shuffle : CheckCircle2;
        return (
            <div className={`fixed bottom-5 left-5 ${zClass} pointer-events-none print:hidden`}>
                <div
                    className="flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm"
                    style={{
                        background: isChain ? 'rgba(255,247,237,0.96)' : 'rgba(240,253,244,0.96)',
                        borderColor: isChain ? '#f59e0b' : '#22c55e',
                        color: isChain ? '#b45309' : '#15803d',
                        boxShadow: isChain ? '0 10px 24px rgba(245,158,11,0.18)' : '0 10px 24px rgba(34,197,94,0.18)',
                    }}>
                    <span
                        className="flex h-9 w-9 items-center justify-center rounded-full"
                        style={{
                            background: isChain ? '#fef3c7' : '#dcfce7',
                            border: `1px solid ${isChain ? '#fcd34d' : '#86efac'}`,
                        }}>
                        <Icon size={18} />
                    </span>
                    <div className="text-right">
                        <div className="text-xs font-extrabold">
                            {isChain ? 'تعديل مركب' : 'تعديل بسيط'}
                        </div>
                        <div className="text-sm font-bold">
                            {swapNotice.text}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const parseSourceFromKey = (key: string | null) => {
        if (!key) return null;
        const parts = key.split('-');
        if (parts.length < 3) return null;
        const period = Number(parts[parts.length - 1]);
        const day = parts[parts.length - 2];
        const teacherId = parts.slice(0, -2).join('-');
        if (!teacherId || !day || Number.isNaN(period)) return null;
        return { teacherId, day, period };
    };

    const handleGeneralSlotDragStart = (e: React.DragEvent, teacherId: string, day: string, period: number) => {
        const key = getKey(teacherId, day, period);
        const slot = timetable[key];
        if (!slot || slot.type === 'waiting') { e.preventDefault(); return; }
        setDragSource({ teacherId, day, period });
        e.dataTransfer.setData('text/plain', key);
        e.dataTransfer.setData('dragType', 'slot');
        e.dataTransfer.setData('sourceKey', key);
        e.dataTransfer.setData('teacherId', teacherId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleGeneralDragOver = (e: React.DragEvent, targetTeacherId: string, targetKey: string, hasSlot: boolean) => {
        const dragType = e.dataTransfer.getData('dragType');
        const waitingTeacherId = e.dataTransfer.getData('teacherId') || (draggingWaiting ? draggingSlotKey?.split('-')[0] : '');
        if (dragType === 'waitingCard' || dragType === 'waitingSlot') {
            if (!isManualMode) return;
            if (waitingTeacherId && waitingTeacherId !== targetTeacherId) return;
            if (dragType === 'waitingCard' && hasSlot) return;
            if (dragType === 'waitingSlot' && hasSlot && targetKey === draggingSlotKey) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setHoverTarget(targetKey);
            return;
        }
        const source = parseSourceFromKey(e.dataTransfer.getData('sourceKey')) || dragSource;
        if (!source) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setHoverTarget(targetKey);
    };

    const handleGeneralDrop = (e: React.DragEvent, targetTeacherId: string, targetDay: string, targetPeriod: number, hasSlot: boolean) => {
        e.preventDefault();
        setHoverTarget(null);
        if (!onUpdateSettings) return;
        const targetKey = getKey(targetTeacherId, targetDay, targetPeriod);
        const dragType = e.dataTransfer.getData('dragType');

        if (dragType === 'waitingCard') {
            const teacherId = e.dataTransfer.getData('teacherId');
            setDraggingWaiting(null);
            if (!isManualMode || teacherId !== targetTeacherId || hasSlot) return;
            onUpdateSettings({ ...settings, timetable: { ...timetable, [targetKey]: { teacherId: targetTeacherId, type: 'waiting' as const } } });
            return;
        }

        if (dragType === 'waitingSlot') {
            const fromKey = e.dataTransfer.getData('slotKey');
            const teacherId = e.dataTransfer.getData('teacherId');
            setDraggingWaiting(null);
            setDraggingSlotKey(null);
            if (!isManualMode || teacherId !== targetTeacherId || !fromKey || (hasSlot && fromKey !== targetKey)) return;
            if (fromKey === targetKey) return;
            const newTimetable = { ...timetable };
            if (!hasSlot) {
                newTimetable[targetKey] = newTimetable[fromKey];
                delete newTimetable[fromKey];
                onUpdateSettings({ ...settings, timetable: newTimetable });
            }
            return;
        }

        const source = parseSourceFromKey(e.dataTransfer.getData('sourceKey')) || dragSource;
        if (!source) return;
        const result = tryMoveOrSwap(
            timetable,
            source,
            { teacherId: targetTeacherId, day: targetDay, period: targetPeriod },
            settings,
            teachers,
            classes
        );
        if (result.success && result.newTimetable) {
            setPendingSwap(result);
        } else {
            const chainResult = findChainSwap(
                timetable,
                source,
                { teacherId: targetTeacherId, day: targetDay, period: targetPeriod },
                teachers,
                settings,
                classes
            );
            if (chainResult && chainResult.success && chainResult.newTimetable) {
                setPendingSwap(chainResult);
            } else {
                setSwapError(result.reason || 'تعذر تنفيذ التعديل');
            }
        }
        setDragSource(null);
    };

    const teachersWithWaiting = useMemo(()=>{
        const ids=new Set<string>();
        Object.values(timetable).forEach(s=>{ if(s.type==='waiting'||s.isSubstitution) ids.add(s.teacherId); });
        const sorted = getSortedTeachers();
        return ids.size===0 ? sorted : sorted.filter(t=>ids.has(t.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[timetable,teachers,teacherSortMode,teacherCustomOrder,specializationCustomOrder]);

    const titleMap: Record<string,string> = {
        general_teachers:   'الجدول العام للمعلمين',
        general_classes:    'الجدول العام للفصول',
        general_waiting:    'الجدول العام للانتظار',
        individual_teacher: 'جدول المعلم: '+tName(targetId||''),
        individual_class:   'جدول الفصل: ' +cName(targetId||''),
    };
    const isGeneral = type.startsWith('general_');

    /* ════════════════════════════════════════════════════
       CELL renderers  (individual table – unchanged)
    ════════════════════════════════════════════════════ */
    const renderTeacherCell = (teacherId: string, di: number, pi: number) => {
        const slot = timetable[teacherId+'-'+ENGLISH_DAYS[di]+'-'+(pi+1)];
        if(type==='general_waiting'){
            if(!slot || (slot.type!=='waiting' && !slot.isSubstitution))
                return null; // rendered by general table directly
            return null;
        }
        if(!slot) return null;
        const subj = subjDisplay(slot.subjectId||'');
        const cls  = cName(slot.classId||'');
        const color = getPastelColor(subj);
        return (
            <div className="flex items-center justify-center w-[84px] h-[84px] mx-auto">
                <div className="group/cell relative z-10 hover:z-[80] flex flex-col items-center justify-center px-1 gap-0.5 transition-all duration-200 rounded-[10px]"
                 style={{background: color.bg, border: `1px solid ${color.text}30`, width:'74px', height:'74px', boxShadow:'0 1px 2px rgba(15,23,42,0.06)'}}>
                <span className="text-[11px] font-bold leading-[1.15] text-center w-full px-1"
                      style={{...TWO_LINE_CLAMP, color: color.text, wordBreak:'break-word', overflowWrap:'anywhere'}}>{cls}</span>
                <span className="text-[10px] font-medium leading-[1.1] text-center w-full px-1 opacity-80"
                      style={{...TWO_LINE_CLAMP, color: color.text, wordBreak:'break-word', overflowWrap:'anywhere'}}>{subj}</span>
                </div>
            </div>
        );
    };

    const renderClassCell = (classId: string, di: number, pi: number) => {
        const slot = classSlotMap.get(classId+'-'+ENGLISH_DAYS[di]+'-'+(pi+1));
        if(!slot) return null;
        const subj    = subjDisplay(slot.subjectId||'');
        const teacher = tName(slot.teacherId);
        const color   = getPastelColor(subj);
        return (
            <div className="flex items-center justify-center w-[84px] h-[84px] mx-auto">
                <div className="group/cell relative z-10 hover:z-[80] flex flex-col items-center justify-center px-1 gap-0.5 transition-all duration-200 rounded-[10px]"
                 style={{background: color.bg, border: `1px solid ${color.text}30`, width:'74px', height:'74px', boxShadow:'0 1px 2px rgba(15,23,42,0.06)'}}>
                <span className="text-[11px] font-bold leading-[1.15] text-center w-full px-1"
                      style={{...TWO_LINE_CLAMP, color: color.text, wordBreak:'break-word', overflowWrap:'anywhere'}}>{subj}</span>
                <span className="text-[10px] font-medium leading-[1.1] text-center w-full px-1 opacity-80"
                      style={{...TWO_LINE_CLAMP, color: color.text, wordBreak:'break-word', overflowWrap:'anywhere'}}>{teacher}</span>
                </div>
            </div>
        );
    };

    /* ════════════════════════════════════════════════════
       GENERAL TABLE  — Card-based modern redesign
    ════════════════════════════════════════════════════ */
    const renderGeneralTable = () => {
        const isWaiting  = type==='general_waiting';
        const isClasses  = type==='general_classes';
        const isTeachers = type==='general_teachers';

        interface Row { serial:number; id:string; name:string; spec?:string; quota1?:number; quota2?:number; }
        const rows: Row[] = [];
        if(isClasses){
            getSortedClasses().forEach((c,i)=>rows.push({serial:i+1,id:c.id,name:c.name||(c.grade+'/'+c.section),quota1:classLessonCount.get(c.id)||0}));
        } else {
            const list = isWaiting ? teachersWithWaiting : getSortedTeachers();
            list.forEach((t,i)=>rows.push({serial:i+1,id:t.id,name:t.name,spec:getAbbrSpec(t.specializationId),quota1:isWaiting?tWQ(t):tLQ(t),quota2:isTeachers?tWQ(t):undefined}));
        }

        /* waiting badge counts per period */
        const periodWaitingCounts: number[][] = Array.from({length:ENGLISH_DAYS.length}, ()=>Array(MAX_PERIODS).fill(0));
        if((isTeachers || isWaiting) && showWaitingCounts){
            teachers.forEach(t=>{
                ENGLISH_DAYS.forEach((d,di)=>{
                    for(let p=1;p<=MAX_PERIODS;p++){
                        const s=timetable[`${t.id}-${d}-${p}`];
                        if(s&&(s.type==='waiting'||(isWaiting&&s.isSubstitution))) periodWaitingCounts[di][p-1]++;
                    }
                });
            });
        }

        /* gap background — shown as td background, inner div is the card */
        const GAP_BG   = '#eef0f6';
        const ROW_H    = 74;
        const CELL_PAD = '2px'; // td padding → creates the visual gap
        const PERIOD_BOX = 84;
        const PERIOD_CARD = 74;

        /* ── period cell content ── */
        const renderPeriodCell = (rowId: string, di: number, pi: number) => {
            if(isClasses) {
                const slot = classSlotMap.get(rowId+'-'+ENGLISH_DAYS[di]+'-'+(pi+1));
                if(!slot) return (
                    <div className="flex items-center justify-center" style={{width:`${PERIOD_BOX}px`, height:`${PERIOD_BOX}px`, margin:'0 auto'}}>
                        <div className="rounded-md flex items-center justify-center"
                         style={{border:'1px dashed #dde1ea', background:'#f8f9fc', width:`${PERIOD_CARD}px`, height:`${PERIOD_CARD}px`}}>
                            <span style={{color:'#c8cdd8', fontSize:'9px', fontWeight:700}}>—</span>
                        </div>
                    </div>
                );
                return renderClassCell(rowId, di, pi);
            } else {
                const slot = timetable[rowId+'-'+ENGLISH_DAYS[di]+'-'+(pi+1)];
                if(!slot) return (
                    <div className="flex items-center justify-center" style={{width:`${PERIOD_BOX}px`, height:`${PERIOD_BOX}px`, margin:'0 auto'}}>
                        <div className="rounded-md flex items-center justify-center"
                         style={{border:'1px dashed #dde1ea', background: isWaiting ? '#f8fafc' : '#f8f9fc', width:`${PERIOD_CARD}px`, height:`${PERIOD_CARD}px`}}>
                            <span style={{color:'#c8cdd8', fontSize:'9px', fontWeight:700}}>—</span>
                        </div>
                    </div>
                );
                if(isTeachers && (slot.type==='waiting'||slot.isSubstitution)) {
                    const slotKey = `${rowId}-${ENGLISH_DAYS[di]}-${pi+1}`;
                    return (
                        <div className="flex items-center justify-center" style={{width:`${PERIOD_BOX}px`, height:`${PERIOD_BOX}px`, margin:'0 auto'}}>
                            <div
                                draggable={isInteractiveGeneralTeachers && isManualMode}
                                onDragStart={e => {
                                    if (!isInteractiveGeneralTeachers || !isManualMode) return;
                                    e.dataTransfer.setData('dragType', 'waitingSlot');
                                    e.dataTransfer.setData('slotKey', slotKey);
                                    e.dataTransfer.setData('teacherId', rowId);
                                    setDraggingWaiting('slot');
                                    setDraggingSlotKey(slotKey);
                                }}
                                onDragEnd={() => { setDraggingWaiting(null); setDraggingSlotKey(null); }}
                                className="rounded-[10px] flex flex-col items-center justify-center gap-0.5 transition-all duration-200"
                                style={{background:'#f7f5ff', border:'1px solid #d6ccff', width:`${PERIOD_CARD}px`, height:`${PERIOD_CARD}px`, boxShadow:'0 1px 2px rgba(15,23,42,0.05)', cursor: isInteractiveGeneralTeachers && isManualMode ? 'grab' : undefined}}>
                                <span className="rounded-full px-1.5 py-0.5 font-black"
                                      style={{background:'#ede9fe', color:'#6d28d9', border:'1px solid #c4b5fd', fontSize:'8px'}}>م انتظار</span>
                            </div>
                        </div>
                    );
                }
                if(isWaiting) {
                    if(slot.type==='waiting'||slot.isSubstitution)
                        return (
                            <div className="flex items-center justify-center" style={{width:`${PERIOD_BOX}px`, height:`${PERIOD_BOX}px`, margin:'0 auto'}}>
                                <div className="rounded-[10px] flex flex-col items-center justify-center gap-0.5 transition-all duration-200 hover:shadow-sm"
                                 style={{background:'#fef3e8', border:'1px solid #fbd28a', width:`${PERIOD_CARD}px`, height:`${PERIOD_CARD}px`, boxShadow:'0 1px 2px rgba(15,23,42,0.05)'}}>
                                    <span className="rounded-full px-1.5 py-0.5 font-black"
                                      style={{background:'#fef3c7', color:'#b45309', border:'1px solid #fcd34d', fontSize:'8px'}}>انتظار</span>
                                </div>
                            </div>
                        );
                    return (
                        <div className="flex items-center justify-center" style={{width:`${PERIOD_BOX}px`, height:`${PERIOD_BOX}px`, margin:'0 auto'}}>
                            <div className="rounded-md flex items-center justify-center"
                             style={{border:'1px dashed #dde1ea', background:'#f8fafc', width:`${PERIOD_CARD}px`, height:`${PERIOD_CARD}px`}}>
                                <span style={{color:'#c8cdd8', fontSize:'9px', fontWeight:700}}>—</span>
                            </div>
                        </div>
                    );
                }
                const content = renderTeacherCell(rowId, di, pi);
                if (isInteractiveGeneralTeachers && slot.type === 'lesson') {
                    return (
                        <div
                            draggable
                            onDragStart={e => handleGeneralSlotDragStart(e, rowId, ENGLISH_DAYS[di], pi + 1)}
                            onDragEnd={() => { setDragSource(null); setHoverTarget(null); }}
                            style={{cursor:'grab'}}
                        >
                            {content}
                        </div>
                    );
                }
                return content;
            }
        };

        /* Design constants */
        const DAY_DIVIDER = '#94a3b8'; // slate-400 gray — between days

        /* th base style for info headers */
        const thInfo: React.CSSProperties = {
            background: C_BG,
            color: '#fff',
            fontWeight: 800,
            fontSize: '13px',
            textAlign: 'center',
            verticalAlign: 'middle',
            padding: '10px 6px',
            position: 'sticky',
            top: 0,
            zIndex: 25,
            borderBottom: `3px solid ${DAY_DIVIDER}`,
            borderLeft: `1px solid rgba(0,0,0,0.12)`,
        };
        const thDay: React.CSSProperties = {
            background: C_BG,
            color: '#fff',
            fontWeight: 900,
            fontSize: '14px',
            textAlign: 'center',
            verticalAlign: 'middle',
            padding: '10px 4px',
            position: 'sticky',
            top: 0,
            zIndex: 20,
            borderBottom: 0,
            borderLeft: `3px solid ${DAY_DIVIDER}`,
        };
        const thPeriod: React.CSSProperties = {
            background: C_BG_SOFT,
            color: '#64748b',
            fontWeight: 700,
            fontSize: '12px',
            textAlign: 'center',
            verticalAlign: 'middle',
            padding: '6px 2px',
            position: 'sticky',
            top: '41px',
            zIndex: 20,
            borderBottom: `3px solid ${DAY_DIVIDER}`,
            borderLeft: `1px solid #dde1ea`,
        };

        return (
            <div className="w-full relative">
                {/* Table wrapper */}
                <div style={{borderRadius:'16px', overflow:'visible', boxShadow:'0 4px 16px rgba(0,0,0,0.06)', background: GAP_BG}}>
                <div className="overflow-x-auto">
                <table style={{borderCollapse:'collapse', borderSpacing:0, width:'calc(100% + 360px)', minWidth:'100%', tableLayout:'fixed'}}>
                    <colgroup>
                        <col style={{width:'60px'}}/>
                        <col style={{width: isClasses ? '180px' : '190px'}}/>
                        {!isClasses && <col style={{width:'110px'}}/>}
                        <col style={{width:'78px'}}/>
                        {isTeachers && <col style={{width:'96px'}}/>}
                        {ENGLISH_DAYS.flatMap((_,di)=>
                            Array.from({length:MAX_PERIODS}).map((_,pi)=>(
                                <col key={`c-${di}-${pi}`} style={{width:'84px'}}/>
                            ))
                        )}
                    </colgroup>

                    {/* ── THEAD ── */}
                    <thead>
                        {/* Row 1: info labels + day names */}
                        <tr>
                            <th rowSpan={2} style={thInfo}>م</th>
                            <th rowSpan={2} style={{...thInfo, textAlign:'right', paddingRight:'10px'}}>
                                {isClasses ? 'اسم الفصل' : 'اسم المعلم'}
                            </th>
                            {!isClasses && <th rowSpan={2} style={thInfo}>التخصص</th>}
                            <th rowSpan={2} style={{...thInfo, lineHeight:'1.4'}}>
                                <div>نصاب</div>
                                <div style={{fontSize:'11px', opacity:0.85}}>{isClasses ? 'الحصص' : isWaiting ? 'الانتظار' : 'الحصص'}</div>
                            </th>
                            {isTeachers && <th rowSpan={2} style={{...thInfo, borderLeft:`3px solid ${DAY_DIVIDER}`, lineHeight:'1.4'}}>
                                <div>نصاب</div>
                                <div style={{fontSize:'11px', opacity:0.85}}>الانتظار</div>
                            </th>}
                            {ARABIC_DAYS.map((day,di)=>(
                                <th key={day} colSpan={MAX_PERIODS} style={{...thDay, borderLeft: di===0 ? `1px solid rgba(0,0,0,0.12)` : `3px solid ${DAY_DIVIDER}`}}>
                                    {day}
                                </th>
                            ))}
                        </tr>
                        {/* Row 2: period numbers */}
                        <tr>
                            {ENGLISH_DAYS.flatMap((_,di)=>
                                Array.from({length:MAX_PERIODS}).map((_,pi)=>(
                                    <th key={`h-${di}-${pi}`} style={{
                                        ...thPeriod,
                                        borderLeft: (pi===MAX_PERIODS-1 && di<ENGLISH_DAYS.length-1) ? `3px solid ${DAY_DIVIDER}` : `1px solid #dde1ea`,
                                    }}>
                                        <span className="relative inline-flex items-center justify-center font-black text-xs"
                                              style={{color: C_BG}}>
                                            {pi+1}
                                            {showWaitingCounts && (isTeachers||isWaiting) && periodWaitingCounts[di][pi] > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full flex items-center justify-center border border-white"
                                                      style={{fontSize:'8px', width:'14px', height:'14px', lineHeight:1}}>
                                                    {periodWaitingCounts[di][pi]}
                                                </span>
                                            )}
                                        </span>
                                    </th>
                                ))
                            )}
                        </tr>
                    </thead>

                    {/* ── TBODY ── */}
                    <tbody style={{background: GAP_BG}}>
                        {rows.length===0 ? (
                            <tr>
                                <td colSpan={999} style={{textAlign:'center', padding:'40px', color:'#94a3b8', fontSize:'15px', fontWeight:600, background:'#fff'}}>
                                    لا توجد بيانات — قم بإنشاء الجدول أولاً
                                </td>
                            </tr>
                        ) : rows.map((row)=>{
                            /* info card shared style */
                            const infoCardBase: React.CSSProperties = {
                                borderRadius:'8px',
                                background:'#fff',
                                border:'1px solid #e8eaf2',
                                padding:'4px 6px',
                                height: `${ROW_H - 6}px`,
                                display:'flex',
                                alignItems:'center',
                                justifyContent:'center',
                                transition:'background 0.2s, border-color 0.2s',
                                boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                            };
                            return (
                                <tr key={row.id} className="group/row">
                                    {/* serial */}
                                    <td style={{padding:CELL_PAD, background: GAP_BG, verticalAlign:'middle'}}>
                                        <div className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200"
                                             style={{...infoCardBase, justifyContent:'center'}}>
                                            <span style={{color:'#94a3b8', fontSize:'11px', fontWeight:700}}>{row.serial}</span>
                                        </div>
                                    </td>
                                    {/* name */}
                                    <td style={{padding:CELL_PAD, background: GAP_BG, verticalAlign:'middle'}}>
                                        <div className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200"
                                             style={{...infoCardBase, justifyContent:'flex-start', paddingRight:'8px', paddingLeft:'4px'}} title={row.name}>
                                            <span style={{color:'#1e293b', fontSize:'12px', fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', direction:'rtl', textAlign:'right', width:'100%'}}>{row.name}</span>
                                        </div>
                                    </td>
                                    {/* spec */}
                                    {!isClasses && (
                                        <td style={{padding:CELL_PAD, background: GAP_BG, verticalAlign:'middle'}}>
                                            <div className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200"
                                                 style={{...infoCardBase}} title={row.spec}>
                                                <span style={{color:'#64748b', fontSize:'10px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{row.spec}</span>
                                            </div>
                                        </td>
                                    )}
                                    {/* quota1 */}
                                    <td style={{padding:CELL_PAD, background: GAP_BG, verticalAlign:'middle'}}>
                                        <div className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200"
                                             style={{...infoCardBase}}>
                                            <span style={{color: C_BG, fontSize:'14px', fontWeight:900}}>{row.quota1}</span>
                                        </div>
                                    </td>
                                    {/* quota2 teachers only */}
                                    {isTeachers && (
                                        <td style={{padding:CELL_PAD, background: GAP_BG, verticalAlign:'middle'}}>
                                            <div
                                                 className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200 relative"
                                                 style={{...infoCardBase, overflow:'visible'}}>
                                                <span style={{color: C_BG, fontSize:'14px', fontWeight:900}}>
                                                    {row.quota2}
                                                </span>
                                                {isManualMode && (row.quota2 || 0) > 0 && Math.max((row.quota2 || 0) - (placedWaitingPerTeacher.get(row.id) || 0), 0) > 0 && (
                                                    <div
                                                        role="button"
                                                        tabIndex={0}
                                                        draggable={isInteractiveGeneralTeachers}
                                                        onDragStart={e => {
                                                            if (!isInteractiveGeneralTeachers) return;
                                                            e.dataTransfer.setData('text/plain', `waiting-${row.id}`);
                                                            e.dataTransfer.setData('dragType', 'waitingCard');
                                                            e.dataTransfer.setData('teacherId', row.id);
                                                            e.dataTransfer.setData('sourceKey', `waiting-${row.id}`);
                                                            e.dataTransfer.effectAllowed = 'move';
                                                            setDraggingWaiting('card');
                                                        }}
                                                        onDragEnd={() => setDraggingWaiting(null)}
                                                        className="absolute left-1.5 top-1.5 flex items-center justify-center cursor-grab active:cursor-grabbing bg-transparent p-0"
                                                        aria-label={`سحب بطاقة انتظار للمعلم ${row.name}`}>
                                                        <span className="relative block w-7 h-9">
                                                            <span className="absolute inset-x-0 top-1.5 h-8 rounded-[8px]" style={{background:'#f4f0ff', border:'1px solid #ddd6fe'}} />
                                                            <span className="absolute inset-x-0.5 top-0 h-8 rounded-[8px] shadow-sm" style={{background:'#ffffff', border:'1px solid #c4b5fd'}}>
                                                                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{background:'#ede9fe', color:'#6d28d9', border:'1px solid #c4b5fd', fontSize:'8px', fontWeight:800}}>م</span>
                                                            </span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    {/* period cells */}
                                    {ENGLISH_DAYS.flatMap((_,di)=>
                                        Array.from({length:MAX_PERIODS}).map((_,pi)=>(
                                            <td key={`${di}-${pi}`}
                                                onDragOver={e => {
                                                    if (!isInteractiveGeneralTeachers) return;
                                                    handleGeneralDragOver(e, row.id, `${row.id}-${ENGLISH_DAYS[di]}-${pi+1}`, !!timetable[`${row.id}-${ENGLISH_DAYS[di]}-${pi+1}`]);
                                                }}
                                                onDragLeave={() => { if (isInteractiveGeneralTeachers) setHoverTarget(null); }}
                                                onDrop={e => {
                                                    if (!isInteractiveGeneralTeachers) return;
                                                    handleGeneralDrop(e, row.id, ENGLISH_DAYS[di], pi + 1, !!timetable[`${row.id}-${ENGLISH_DAYS[di]}-${pi+1}`]);
                                                }}
                                                onDragEnd={() => { setDragSource(null); setDraggingWaiting(null); setDraggingSlotKey(null); setHoverTarget(null); }}
                                                style={{
                                                    padding: CELL_PAD,
                                                    background: hoverTarget === `${row.id}-${ENGLISH_DAYS[di]}-${pi+1}` ? '#f1f5f9' : GAP_BG,
                                                    verticalAlign:'middle',
                                                    height:`${ROW_H}px`,
                                                    overflow:'visible',
                                                    borderLeft: (pi===MAX_PERIODS-1 && di<ENGLISH_DAYS.length-1) ? `3px solid ${DAY_DIVIDER}` : undefined,
                                                }}>
                                                {renderPeriodCell(row.id, di, pi)}
                                            </td>
                                        ))
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
                </div>
            </div>
        );
    };

    /* ════════════════════════════════════════════════════
       INDIVIDUAL TABLE (teacher / class) — Redesigned
    ════════════════════════════════════════════════════ */
    const renderIndividualTable = () => {
        const isTeacher = type==='individual_teacher';
        const teacher = isTeacher ? teachers.find(t=>t.id===targetId) : null;
        const cls     = !isTeacher ? classes.find(c=>c.id===targetId) : null;

        return (
            <div className="w-full" style={{direction:'rtl'}}>

                {/* ── Info Card Header ── */}
                <div className="rounded-2xl p-5 mb-5 relative overflow-hidden"
                    style={{
                        background: C_BG,
                        boxShadow:'0 10px 30px rgba(101,90,193,0.35)'
                    }}>
                    <div className="relative flex items-center gap-5 flex-wrap">
                        {/* Name + sub info */}
                        <div className="flex-1 min-w-0 text-right">
                            <div className="text-white/70 text-xs font-semibold mb-0.5">
                                {isTeacher ? 'المعلم' : 'الفصل'}
                            </div>
                            <div className="text-white font-black text-2xl leading-tight truncate" dir="ltr" style={{textAlign:'right'}}>
                                {isTeacher ? (teacher?.name||'—') : (cls?.name || (cls ? `${cls.grade}/${cls.section}` : '—'))}
                            </div>
                            {isTeacher && teacher && (
                                <div className="text-white/60 text-xs font-medium mt-0.5">
                                    {specializationNames[teacher.specializationId]||'—'}
                                </div>
                            )}
                        </div>

                        {/* Stats pills — نصاب الحصص + نصاب الانتظار فقط */}
                        <div className="flex flex-wrap gap-2 shrink-0 items-center">
                            <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm min-w-[68px]">
                                <span className="text-white/60 text-[10px] font-semibold leading-none mb-1">
                                    {isTeacher ? 'نصاب الحصص' : 'عدد الحصص'}
                                </span>
                                <span className="text-white font-black text-2xl leading-none">
                                    {isTeacher ? (teacher ? tLQ(teacher) : 0) : (classLessonCount.get(targetId||'')||0)}
                                </span>
                            </div>
                            {isTeacher && (
                                <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm min-w-[68px]">
                                    <span className="text-white/60 text-[10px] font-semibold leading-none mb-1">نصاب الانتظار</span>
                                    <span className="text-white font-black text-2xl leading-none">{teacher ? tWQ(teacher) : 0}</span>
                                </div>
                            )}
                            {/* Manual waiting distribution card */}
                            {isTeacher && teacher && isManualMode && onUpdateSettings && (() => {
                                const waitingQuota = tWQ(teacher);
                                const placed = placedWaitingPerTeacher.get(teacher.id) || 0;
                                const remaining = waitingQuota - placed;
                                if (waitingQuota === 0) return null;
                                if (remaining === 0) return (
                                    <div className="flex flex-col items-center px-3 py-2 rounded-xl border-2 backdrop-blur-sm min-w-[60px]"
                                         style={{background:'rgba(16,185,129,0.15)', borderColor:'rgba(16,185,129,0.5)'}}>
                                        <span className="text-[9px] font-bold leading-none mb-1" style={{color:'#6ee7b7'}}>اكتمل</span>
                                        <span className="font-black text-lg leading-none" style={{color:'#6ee7b7'}}>✓</span>
                                    </div>
                                );
                                return (
                                    <div
                                        draggable
                                        onDragStart={e => {
                                            e.dataTransfer.setData('dragType', 'waitingCard');
                                            e.dataTransfer.setData('teacherId', teacher.id);
                                            setDraggingWaiting('card');
                                        }}
                                        onDragEnd={() => setDraggingWaiting(null)}
                                        className="flex flex-col items-center px-3 py-2 rounded-xl border-2 backdrop-blur-sm min-w-[60px] cursor-grab active:cursor-grabbing select-none"
                                        style={{background:'rgba(251,146,60,0.15)', borderColor:'rgba(251,146,60,0.5)'}}>
                                        <span className="text-[9px] font-bold leading-none mb-1" style={{color:'#fed7aa'}}>م انتظار</span>
                                        <span className="font-black text-lg leading-none" style={{color:'#fb923c'}}>{remaining}/{waitingQuota}</span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="rounded-2xl overflow-hidden border-2 shadow-sm"
                    style={{borderColor:'#e0dcfb', boxShadow:'0 4px 20px rgba(101,90,193,0.10)'}}>
                    <div className="overflow-x-auto">
                    <table className="w-full border-collapse" style={{minWidth:'600px'}}>
                        <thead>
                            <tr>
                                {/* Day column header */}
                                <th className="py-3 px-4 font-black text-base text-center"
                                    style={{
                                        minWidth:'90px',
                                        background:C_BG,
                                        color:'#fff',
                                        borderBottom:'2px solid '+C_DAY_SEP,
                                        borderLeft:'2px solid '+C_DAY_SEP
                                    }}>
                                    اليوم
                                </th>
                                {/* Period number headers */}
                                {Array.from({length:MAX_PERIODS}).map((_,i)=>(
                                    <th key={i} className="py-3 px-2 font-bold text-base text-center"
                                        style={{
                                            minWidth:'110px',
                                            background:C_BG_SOFT,
                                            color:'#64748b',
                                            borderBottom:'2px solid '+C_DAY_SEP,
                                            borderLeft:'1px solid '+C_BORDER
                                        }}>
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 font-black text-base shadow-sm"
                                              style={{borderColor:C_DAY_SEP, color:'#64748b'}}>
                                            {i+1}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ARABIC_DAYS.map((day, di)=>{
                                const isEvenRow = di % 2 === 0;
                                return (
                                <tr key={day}>
                                    {/* Day label cell */}
                                    <td className="py-3 px-3 font-black text-base text-center sticky right-0 z-10 shadow-[inset_1px_0_0_rgba(148,163,184,1)]"
                                        style={{
                                            minWidth:'90px',
                                            height:'76px',
                                            background: isEvenRow ? '#f8fafc' : '#f1f5f9',
                                            color:'#475569',
                                            borderLeft:'2px solid '+C_DAY_SEP,
                                            borderBottom:'1px solid '+C_BORDER
                                        }}>
                                        {day}
                                    </td>
                                    {/* Period cells */}
                                    {Array.from({length:MAX_PERIODS}).map((_,pi)=>{
                                        const slotKey = targetId+'-'+ENGLISH_DAYS[di]+'-'+(pi+1);
                                        const slot = isTeacher
                                            ? timetable[slotKey]
                                            : classSlotMap.get(slotKey);
                                        const isWaiting = isTeacher && slot && (slot.type==='waiting'||slot.isSubstitution);
                                        const isHovered = hoverTarget === slotKey;
                                        const canDrop = isTeacher && isManualMode && onUpdateSettings && draggingWaiting !== null && !slot;
                                        const canDropOnWaiting = isTeacher && isManualMode && onUpdateSettings && draggingWaiting === 'slot' && isWaiting;

                                        let cellContent = null;
                                        if (!slot) {
                                            cellContent = (
                                                <div className="w-full h-full rounded-xl border-2 border-dashed flex items-center justify-center transition-colors"
                                                     style={{
                                                         borderColor: (canDrop && isHovered) ? '#fb923c' : '#e2e8f0',
                                                         background: (canDrop && isHovered) ? '#fff7ed' : 'transparent',
                                                         aspectRatio:'1 / 1',
                                                         maxWidth:'72px',
                                                         minHeight:'72px',
                                                         margin:'0 auto'
                                                     }}>
                                                    <span className="text-[10px] font-bold" style={{color: (canDrop && isHovered) ? '#fb923c' : '#cbd5e1'}}>
                                                        {(canDrop && isHovered) ? '+' : '—'}
                                                    </span>
                                                </div>
                                            );
                                        } else if (isWaiting) {
                                            cellContent = (
                                                <div className="w-full h-full rounded-xl border flex flex-col items-center justify-center px-2 gap-1 relative group"
                                                     style={{
                                                         background: (canDropOnWaiting && isHovered) ? '#fff7ed' : '#fff8ee',
                                                         borderColor: (canDropOnWaiting && isHovered) ? '#fb923c' : '#fbd28a',
                                                         aspectRatio:'1 / 1',
                                                         maxWidth:'72px',
                                                         minHeight:'72px',
                                                         margin:'0 auto'
                                                     }}>
                                                    {/* Delete button */}
                                                    {isTeacher && isManualMode && onUpdateSettings && (
                                                        <button
                                                            onMouseDown={e => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                const newTimetable = { ...settings.timetable };
                                                                delete newTimetable[slotKey];
                                                                onUpdateSettings({ ...settings, timetable: newTimetable });
                                                            }}
                                                            className="absolute -top-1 -left-1 w-4 h-4 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10 text-[8px] font-black leading-none"
                                                        >✕</button>
                                                    )}
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black"
                                                          style={{background:'#fef3c7', color:'#b45309', border:'1px solid #fcd34d'}}>
                                                        انتظار
                                                    </span>
                                                    <span className="font-black text-[12px] leading-[1.15] text-center px-1" style={{...TWO_LINE_CLAMP, color:'#92400e'}}>
                                                        {cName(slot.classId||'')}
                                                    </span>
                                                    {slot.subjectId && (
                                                        <span className="text-[11px] font-medium leading-[1.1] text-center px-1" style={{...TWO_LINE_CLAMP, color:'#b45309'}}>
                                                            {subjName(slot.subjectId)}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        } else {
                                            const subj = subjDisplay(slot.subjectId||'');
                                            const color = getPastelColor(subj);
                                            cellContent = (
                                                <div className="w-full h-full rounded-xl border flex flex-col items-center justify-center px-1.5 gap-0.5 transition-all duration-300 group"
                                                     style={{background: color.bg, borderColor: color.text + '40', aspectRatio:'1 / 1', maxWidth:'84px', minHeight:'84px', margin:'0 auto', cursor:'default'}}>
                                                    {isTeacher ? (<>
                                                        <span className="font-black text-[12px] leading-[1.15] text-center w-full px-1"
                                                              style={{...TWO_LINE_CLAMP, color: color.text}} title={cName(slot.classId||'')}>
                                                            {cName(slot.classId||'')}
                                                        </span>
                                                        <span className="text-[11px] font-semibold leading-[1.1] text-center w-full px-1 opacity-80"
                                                              style={{...TWO_LINE_CLAMP, color: color.text}} title={subjName(slot.subjectId||'')}>
                                                            {subj}
                                                        </span>
                                                    </>) : (<>
                                                        <span className="font-black text-[12px] leading-[1.15] text-center w-full px-1"
                                                              style={{...TWO_LINE_CLAMP, color: color.text}} title={subjName(slot.subjectId||'')}>
                                                            {subj}
                                                        </span>
                                                        <span className="text-[11px] font-semibold leading-[1.1] text-center w-full px-1 opacity-80"
                                                              style={{...TWO_LINE_CLAMP, color: color.text}} title={tName(slot.teacherId)}>
                                                            {tName(slot.teacherId)}
                                                        </span>
                                                    </>)}
                                                </div>
                                            );
                                        }

                                        // Make waiting slots draggable in manual mode
                                        const waitingDragProps = (isTeacher && isManualMode && onUpdateSettings && isWaiting) ? {
                                            draggable: true,
                                            onDragStart: (e: React.DragEvent) => {
                                                e.dataTransfer.setData('dragType', 'waitingSlot');
                                                e.dataTransfer.setData('slotKey', slotKey);
                                                e.dataTransfer.setData('teacherId', targetId || '');
                                                setDraggingWaiting('slot');
                                                setDraggingSlotKey(slotKey);
                                            },
                                            onDragEnd: () => { setDraggingWaiting(null); setDraggingSlotKey(null); },
                                        } : {};

                                        return (
                                            <td key={pi}
                                                {...waitingDragProps}
                                                onDragOver={e => {
                                                    if (!isTeacher || !isManualMode || !onUpdateSettings) return;
                                                    if (draggingWaiting === null) return;
                                                    if (!slot || (draggingWaiting === 'slot' && isWaiting && slotKey !== draggingSlotKey)) {
                                                        e.preventDefault();
                                                        setHoverTarget(slotKey);
                                                    }
                                                }}
                                                onDragLeave={() => setHoverTarget(null)}
                                                onDrop={e => {
                                                    e.preventDefault();
                                                    setHoverTarget(null);
                                                    setDraggingWaiting(null);
                                                    if (!isTeacher || !isManualMode || !onUpdateSettings) return;
                                                    const dragType = e.dataTransfer.getData('dragType');
                                                    const tid = e.dataTransfer.getData('teacherId');
                                                    if (tid !== targetId) return;
                                                    if (dragType === 'waitingCard' && !slot) {
                                                        const newTimetable = { ...settings.timetable, [slotKey]: { type: 'waiting' as const, teacherId: tid } };
                                                        onUpdateSettings({ ...settings, timetable: newTimetable });
                                                    } else if (dragType === 'waitingSlot') {
                                                        const fromKey = e.dataTransfer.getData('slotKey');
                                                        if (fromKey === slotKey) return;
                                                        if (!slot) {
                                                            const newTimetable = { ...settings.timetable };
                                                            newTimetable[slotKey] = newTimetable[fromKey];
                                                            delete newTimetable[fromKey];
                                                            onUpdateSettings({ ...settings, timetable: newTimetable });
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    height:'76px',
                                                    minWidth:'110px',
                                                    background: isEvenRow ? '#ffffff' : '#f8fafc',
                                                    borderLeft:'1px solid '+C_BORDER,
                                                    borderBottom:'1px solid '+C_BORDER,
                                                    padding:'6px 5px',
                                                    verticalAlign:'middle',
                                                    position:'relative',
                                                    cursor: (isTeacher && isManualMode && isWaiting) ? 'grab' : undefined,
                                                }}>
                                                {cellContent}
                                            </td>
                                        );
                                    })}
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>
        );
    };

    /* ════════════════════════════════════════════════════
       WRAPPER
    ════════════════════════════════════════════════════ */
    const handleCloseFullScreen = () => setIsFullScreen(false);

    if (isFullScreen && isGeneral) {
        return (
            <div className="fixed inset-0 z-[200] bg-slate-100 flex flex-col overflow-hidden" style={{direction:'rtl'}}>
                {/* Top bar */}
                <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between shrink-0 z-50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        {type === 'general_teachers' && <Users size={22} style={{color: C_BG}} />}
                        {type === 'general_waiting'  && <CalendarClock size={22} style={{color: C_BG}} />}
                        {type === 'general_classes'  && <LayoutGrid size={22} style={{color: C_BG}} />}
                        <div>
                            <h2 className="text-xl font-black text-slate-800 leading-tight">{titleMap[type]}</h2>
                            <div className="h-1 w-10 rounded-full mt-0.5" style={{background: C_BG}}></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {type === 'general_teachers' && onEditRequest && (
                            <button
                                onClick={() => { handleCloseFullScreen(); onEditRequest(); }}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.03] active:scale-95"
                                style={{background:'#655ac1', color:'#fff', boxShadow:'0 4px 14px rgba(101,90,193,0.25)'}}>
                                <Pencil size={15}/>
                                <span>تعديل</span>
                            </button>
                        )}
                        <button
                            onClick={handleCloseFullScreen}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all hover:bg-slate-50 active:scale-95"
                            style={{color:'#64748b', borderColor:'#e2e8f0'}}>
                            <ArrowRight size={16}/>
                            <span>رجوع</span>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4">
                    <div className="bg-white rounded-xl shadow-xl min-h-full p-4">
                        {renderGeneralTable()}
                    </div>
                </div>
                {renderFloatingSwapNotice('z-[260]')}
                <SwapConfirmationModal
                    isOpen={!!pendingSwap}
                    onClose={() => setPendingSwap(null)}
                    onConfirm={() => {
                        if (!pendingSwap) return;
                        commitSwapResult(pendingSwap);
                        setPendingSwap(null);
                    }}
                    swapResult={pendingSwap}
                />
            </div>
        );
    }

    return (
        <div className="bg-white font-sans w-full relative p-2" style={{direction:'rtl'}}>
            {/* Inline Header — general views only */}
            {isGeneral && (
                <div className="mb-5 px-1 print:hidden">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {type === 'general_teachers' && <Users size={22} style={{color: C_BG}} />}
                            {type === 'general_waiting'  && <CalendarClock size={22} style={{color: C_BG}} />}
                            {type === 'general_classes'  && <LayoutGrid size={22} style={{color: C_BG}} />}
                            <div>
                                <h2 className="text-xl font-black text-slate-800 leading-tight">{titleMap[type]}</h2>
                                <div className="h-1 w-10 rounded-full mt-1" style={{background: C_BG}}></div>
                            </div>
                        </div>
                        <button onClick={()=>setIsFullScreen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:bg-[#f4f2ff] active:scale-95"
                            style={{background: '#fff', color: C_BG, border: `1.5px solid ${C_BG}`}}>
                            <Maximize2 size={15}/>
                            <span>{type === 'general_teachers' ? 'تعديل ومعاينة' : 'معاينة'}</span>
                        </button>
                    </div>
                </div>
            )}
            {/* Table */}
            {isGeneral ? renderGeneralTable() : renderIndividualTable()}
            {renderFloatingSwapNotice('z-[120]')}
            <SwapConfirmationModal
                isOpen={!!pendingSwap}
                onClose={() => setPendingSwap(null)}
                onConfirm={() => {
                    if (!pendingSwap) return;
                    commitSwapResult(pendingSwap);
                    setPendingSwap(null);
                }}
                swapResult={pendingSwap}
            />
        </div>
    );
};

export default InlineScheduleView;
