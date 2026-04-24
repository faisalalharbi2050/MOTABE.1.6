import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ScheduleSettingsData, Teacher, ClassInfo, Subject, AuditLogEntry } from '../../types';
import { Maximize2, Users, CalendarClock, LayoutGrid, Pencil, ArrowRight, CheckCircle2, Shuffle, X, GripVertical, Check, AlertTriangle, Trash2 } from 'lucide-react';
import { getKey, tryMoveOrSwap, findChainSwap, SwapResult } from '../../utils/scheduleInteractive';
import SwapConfirmationModal from './SwapConfirmationModal';

export type TeacherSortMode = 'alpha' | 'specialization' | 'custom';

const ENGLISH_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
const ARABIC_DAYS  = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const MAX_PERIODS  = 7;
const GENERAL_PERIOD_BOX = 50;
const GENERAL_PERIOD_CARD = 44;

/* ──────────────────────────────────────────────────────────────
   Density presets — المرحلة 1: استخراج المقاسات إلى إعداد موحّد
   overview  : النظرة الشاملة
   expanded  : تكبير الجدول
   ────────────────────────────────────────────────────────────── */
export type DensityMode = 'overview' | 'expanded';

interface DensityConfig {
    rowH: number;
    cellPad: string;
    serialColW: number;
    teacherNameColW: number;
    classNameColW: number;
    specColW: number;
    quota1ColW: number;
    quota2ColW: number;
    periodBox: number;
    periodCard: number;
    primaryTextClass: string;
    secondaryTextClass: string;
    waitingTextSize: string;
    thInfoFontSize: string;
    thInfoPadding: string;
    thDayFontSize: string;
    thDayPadding: string;
    thPeriodFontSize: string;
    thPeriodPadding: string;
    thPeriodTopOffset: string;
}

const DENSITY_PRESETS: Record<DensityMode, DensityConfig> = {
    overview: {
        rowH: 40,
        cellPad: '1px',
        serialColW: 30,
        teacherNameColW: 96,
        classNameColW: 92,
        specColW: 46,
        quota1ColW: 36,
        quota2ColW: 40,
        periodBox: 28,
        periodCard: 24,
        primaryTextClass: 'text-[7px]',
        secondaryTextClass: 'text-[6px]',
        waitingTextSize: '7px',
        thInfoFontSize: '10px',
        thInfoPadding: '8px 2px',
        thDayFontSize: '10px',
        thDayPadding: '8px 1px',
        thPeriodFontSize: '8px',
        thPeriodPadding: '6px 1px',
        thPeriodTopOffset: '26px',
    },
    expanded: {
        rowH: 68,
        cellPad: '1px',
        serialColW: 44,
        teacherNameColW: 168,
        classNameColW: 156,
        specColW: 88,
        quota1ColW: 60,
        quota2ColW: 74,
        periodBox: 68,
        periodCard: 60,
        primaryTextClass: 'text-[11px]',
        secondaryTextClass: 'text-[10px]',
        waitingTextSize: '10px',
        thInfoFontSize: '13px',
        thInfoPadding: '12px 4px',
        thDayFontSize: '13px',
        thDayPadding: '12px 3px',
        thPeriodFontSize: '11px',
        thPeriodPadding: '8px 2px',
        thPeriodTopOffset: '38px',
    },
};

// Design tokens
const C_BG          = '#a59bf0'; // purple – day header bg & content text
const C_ACCENT      = '#8779fb';
const C_BG_SOFT     = '#ffffff'; // white – period-number row bg
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
    generalTopControls?: React.ReactNode;
    showInlineGeneralHeader?: boolean;
    showWaitingManagement?: boolean;
    compactIndividual?: boolean;
    hideIndividualHeader?: boolean;
    externalDragSource?: { teacherId: string; day: string; period: number } | null;
    onExternalDragSourceChange?: (src: { teacherId: string; day: string; period: number } | null) => void;
    onDeleteAllWaiting?: () => void;
    inlineWaitingReadOnly?: boolean;
    fullscreenButtonLabel?: string;
    waitingCountPerSlot?: Record<string, number>;
    forceWaitingInteractive?: boolean;
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
    generalTopControls,
    showInlineGeneralHeader = false,
    showWaitingManagement = true,
    compactIndividual = false,
    hideIndividualHeader = false,
    externalDragSource = null,
    onExternalDragSourceChange,
    onDeleteAllWaiting,
    inlineWaitingReadOnly = false,
    fullscreenButtonLabel,
    waitingCountPerSlot = {},
    forceWaitingInteractive = false,
}) => {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isFullScreenEditMode, setIsFullScreenEditMode] = useState(false);
    const [waitingDeleteKey, setWaitingDeleteKey] = useState<string | null>(null);
    const [confirmDeleteAllWaiting, setConfirmDeleteAllWaiting] = useState(false);
    const [badgePopupSlot, setBadgePopupSlot] = useState<string | null>(null);
    useEffect(() => {
        if (!badgePopupSlot) return;
        const close = () => setBadgePopupSlot(null);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [badgePopupSlot]);
    // ── وضع الكثافة مستقل بين العرض الداخلي ونافذة المعاينة ──
    const [inlineDensity, setInlineDensity] = useState<DensityMode>('expanded');
    const [fullScreenDensity, setFullScreenDensity] = useState<DensityMode>('overview');
    const density = isFullScreen ? fullScreenDensity : inlineDensity;
    const changeDensity = (mode: DensityMode) => {
        if (isFullScreen) {
            setFullScreenDensity(mode);
            return;
        }
        setInlineDensity(mode);
    };
    /* ── Internal teacher sort (used in fullscreen) ──────────────── */
    type InternalSortMode = 'alpha' | 'specialization' | 'custom';
    const [fsTeacherSort, setFsTeacherSort] = useState<InternalSortMode>('alpha');
    const [fsCustomOrder, setFsCustomOrder] = useState<string[]>([]);
    const [fsSpecOrder, setFsSpecOrder] = useState<string[]>([]);
    const [showFsSortModal, setShowFsSortModal] = useState(false);
    const [showFsSpecSortModal, setShowFsSpecSortModal] = useState(false);
    const [fsPendingOrder, setFsPendingOrder] = useState<string[]>([]);
    const [fsPendingSpecOrder, setFsPendingSpecOrder] = useState<string[]>([]);

    /* effective sort when fullscreen overrides props */
    const effectiveSortMode        = isFullScreen ? fsTeacherSort        : (teacherSortMode       ?? 'alpha');
    const effectiveCustomOrder     = isFullScreen ? fsCustomOrder        : (teacherCustomOrder    ?? []);
    const effectiveSpecOrder       = isFullScreen ? fsSpecOrder          : (specializationCustomOrder ?? []);

    const [showWaitingCounts, setShowWaitingCounts] = useState(true);
    const [draggingWaiting, setDraggingWaiting] = useState<'card'|'slot'|null>(null);
    const [draggingSlotKey, setDraggingSlotKey] = useState<string|null>(null);
    const [draggingTeacherRowId, setDraggingTeacherRowId] = useState<string | null>(null);
    const [hoverTarget, setHoverTarget] = useState<string|null>(null);
    const [dragSource, setDragSource] = useState<{teacherId: string; day: string; period: number} | null>(null);
    const [swapError, setSwapError] = useState<string | null>(null);
    const [swapNotice, setSwapNotice] = useState<{ type: 'simple' | 'chain'; text: string } | null>(null);
    const [pendingSwap, setPendingSwap] = useState<SwapResult | null>(null);
    const [editModeToast, setEditModeToast] = useState<string | null>(null);
    const fullScreenEditSnapshotRef = useRef<Record<string, any> | null>(null);
    const settings          = _settings;
    const teachers          = _teachers;
    const classes           = _classes;
    const subjects          = _subjects;
    const specializationNames = _specNames;
    const timetable = settings.timetable || {};
    const isManualMode = settings.substitution?.method === 'manual';
    const isManualReady = Boolean((settings.substitution as any)?.manualReady);
    const [selectedGeneralDays, setSelectedGeneralDays] = useState<string[]>([]);

    /* ── look-up helpers ─────────────────────────────── */
    const subjName    = (id: string) => subjects.find(s => s.id === id)?.name || '';
    const subjDisplay = (id: string) => settings.subjectAbbreviations?.[id] || subjName(id);
    const tName       = (id: string) => teachers.find(t => t.id === id)?.name || '';
    const cName       = (id: string) => { const c = classes.find(c => c.id === id); return c ? (c.name || `${c.grade}/${c.section}`) : ''; };
    const tLQ  = (t: Teacher) => t.quotaLimit   || 0;
    const tWQ  = (t: Teacher) => {
        if (t.waitingQuota !== undefined) return t.waitingQuota;
        if (isManualMode) {
            const maxQ = (settings.substitution as any)?.maxTotalQuota || 24;
            return Math.max(0, maxQ - (t.quotaLimit || 0));
        }
        return 0;
    };
    const getSlotHoverDetails = (slot: typeof timetable[string] | undefined, mode: 'teacher' | 'class' | 'waiting') => {
        if (!slot) return '';
        if (mode === 'waiting') return 'م انتظار';

        const subject = subjDisplay(slot.subjectId || '');
        const className = cName(slot.classId || '');
        const teacherName = tName(slot.teacherId || '');

        if (mode === 'teacher') {
            return `الفصل: ${className}\nالمادة: ${subject}`;
        }

        return `المادة: ${subject}\nالمعلم: ${teacherName}`;
    };
    const renderHoverTooltip = (details: string) => {
        if (!details) return null;

        return (
            <div
                className="pointer-events-none absolute bottom-full left-1/2 z-[90] mb-1 hidden w-max max-w-[180px] -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center shadow-lg group-hover/cell:block"
                style={{ whiteSpace: 'pre-line' }}
            >
                <div className="text-[9px] font-bold leading-4 text-slate-700">{details}</div>
                <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white" />
            </div>
        );
    };

    const renderWaitingCard = ({
        compact = false,
        stacked = false,
        highlighted = false,
        onDelete,
    }: {
        compact?: boolean;
        stacked?: boolean;
        highlighted?: boolean;
        onDelete?: () => void;
    }) => {
        const small = compact;
        return (
            <div className="relative flex items-center justify-center" style={{ width:'100%', height:'100%' }}>
                {stacked && (
                    <div
                        aria-hidden="true"
                        style={{
                            position:'absolute',
                            inset: small ? '5px 6px 0 6px' : '5px 6px 0 6px',
                            borderRadius:'8px',
                            background:'#f8fafc',
                            border:'1px solid #d1d5db',
                            boxShadow:'0 1px 2px rgba(15,23,42,0.05)',
                        }}
                    />
                )}
                <div
                    className="relative flex flex-col items-center justify-center select-none"
                    style={{
                        width:'100%',
                        height:'100%',
                        borderRadius:'8px',
                        background: highlighted ? '#f5f3ff' : '#ffffff',
                        border:`1px solid ${highlighted ? '#a78bfa' : '#d1d5db'}`,
                        boxShadow:'0 1px 2px rgba(15,23,42,0.06)',
                        padding: small ? '2px 2px' : '5px 4px',
                        transition:'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                    }}
                >
                    {onDelete && (
                        <button
                            onMouseDown={e => {
                                e.stopPropagation();
                                e.preventDefault();
                                onDelete();
                            }}
                            style={{
                                position: 'absolute',
                                top: density === 'expanded' ? '-6px' : '-4px',
                                left: density === 'expanded' ? '-6px' : '-4px',
                                width: density === 'expanded' ? '18px' : '13px',
                                height: density === 'expanded' ? '18px' : '13px',
                                fontSize: density === 'expanded' ? '10px' : '7px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                background: '#f43f5e',
                                color: '#fff',
                                fontWeight: 900,
                                lineHeight: 1,
                                zIndex: 10,
                                cursor: 'pointer',
                                border: '1.5px solid #fff',
                                boxShadow: '0 1px 4px rgba(244,63,94,0.35)',
                            }}
                        >
                            ✕
                        </button>
                    )}
                    <span style={{ fontSize: small ? '13px' : '17px', fontWeight:900, lineHeight:1, color:'#655ac1', marginBottom: small ? '1px' : '3px' }}>م</span>
                    <span style={{ fontSize: small ? '6px' : '9px', fontWeight:900, lineHeight:1, color:'#655ac1' }}>انتظار</span>
                </div>
            </div>
        );
    };

    const renderWaitingDeck = ({
        count,
        compact = false,
        draggable = false,
        onDragStart,
        onDragEnd,
    }: {
        count: number;
        compact?: boolean;
        draggable?: boolean;
        onDragStart?: (e: React.DragEvent) => void;
        onDragEnd?: () => void;
    }) => {
        const visibleCount = Math.max(1, Math.min(count, 4));
        const width = compact ? 28 : 42;
        const height = compact ? 30 : 36;
        const collapsedOffsets = visibleCount === 1
            ? [{ x: 0, y: 0, r: 0 }]
            : visibleCount === 2
                ? [{ x: -1, y: 1, r: -2 }, { x: 1, y: 0, r: 2 }]
                : visibleCount === 3
                    ? [{ x: -2, y: 2, r: -3 }, { x: 0, y: 1, r: 0 }, { x: 2, y: 2, r: 3 }]
                    : [{ x: -3, y: 3, r: -4 }, { x: -1, y: 1, r: -1 }, { x: 1, y: 1, r: 1 }, { x: 3, y: 3, r: 4 }];
        const fanOffsets = visibleCount === 1
            ? [{ x: 0, y: 0, r: 0 }]
            : visibleCount === 2
                ? [{ x: -4, y: 3, r: -10 }, { x: 4, y: 0, r: 10 }]
                : visibleCount === 3
                    ? [{ x: -7, y: 5, r: -14 }, { x: 0, y: 1, r: 0 }, { x: 7, y: 5, r: 14 }]
                    : [{ x: -9, y: 7, r: -18 }, { x: -3, y: 2, r: -6 }, { x: 3, y: 2, r: 6 }, { x: 9, y: 7, r: 18 }];
        const activeOffsets = draggingWaiting === 'card'
            ? Array.from({ length: visibleCount }).map(() => ({ x: 0, y: 0, r: 0 }))
            : fanOffsets;
        return (
            <div
                className="relative select-none group/waiting-deck"
                draggable={draggable}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                title={draggable ? 'اسحب م انتظار' : undefined}
                style={{
                    width:`${width}px`,
                    height:`${height + 8}px`,
                    cursor: draggable ? 'grab' : 'default',
                    filter: draggable ? 'drop-shadow(0 10px 18px rgba(101,90,193,0.16))' : undefined,
                    transition:'transform 0.18s ease, filter 0.18s ease',
                }}
            >
                {Array.from({ length: visibleCount }).map((_, index) => {
                    const fan = activeOffsets[index];
                    return (
                        <div
                            key={index}
                            className="group-hover/waiting-deck:z-10"
                            style={{
                                position:'absolute',
                                top:'4px',
                                left:'0',
                                right:0,
                                bottom:0,
                                transform:`translate(${collapsedOffsets[index].x}px, ${collapsedOffsets[index].y}px) rotate(${collapsedOffsets[index].r}deg)`,
                                transformOrigin:'bottom center',
                                transition:'transform 0.22s ease',
                                zIndex: index + 1,
                            }}
                        >
                            <div
                                className="transition-transform duration-200 group-hover/waiting-deck:[transform:translate(var(--tx),var(--ty))_rotate(var(--tr))]"
                                style={{
                                    ['--tx' as any]: `${fan.x}px`,
                                    ['--ty' as any]: `${fan.y}px`,
                                    ['--tr' as any]: `${fan.r}deg`,
                                }}
                            >
                                {renderWaitingCard({ compact, stacked: false })}
                            </div>
                        </div>
                    );
                })}
                {draggable && draggingWaiting !== 'card' && (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 hidden translate-y-[-50%] rounded-xl border border-[#c4b5fd] bg-white px-2.5 py-1.5 text-[10px] font-black text-[#5b50b8] shadow-lg group-hover/waiting-deck:block"
                        style={{ right:'calc(100% + 8px)', whiteSpace:'nowrap', zIndex: 30 }}
                    >
                        اسحب حصة الانتظار
                        <span
                            aria-hidden="true"
                            style={{
                                position:'absolute',
                                right:'-5px',
                                top:'50%',
                                width:'10px',
                                height:'10px',
                                background:'#ffffff',
                                borderTop:'1px solid #c4b5fd',
                                borderRight:'1px solid #c4b5fd',
                                transform:'translateY(-50%) rotate(45deg)',
                            }}
                        />
                    </div>
                )}
                {draggable && (
                    <div
                        aria-hidden="true"
                        className="transition-all duration-200 group-hover/waiting-deck:shadow-[0_0_0_3px_rgba(124,58,237,0.16),0_14px_28px_rgba(101,90,193,0.20)]"
                        style={{
                            position:'absolute',
                            inset:'0',
                            borderRadius:'8px',
                            boxShadow:'inset 0 0 0 1px rgba(124,58,237,0.16)',
                            pointerEvents:'none',
                        }}
                    />
                )}
            </div>
        );
    };

    const renderPlacedWaitingCard = ({
        compact = false,
        highlighted = false,
        onDelete,
    }: {
        compact?: boolean;
        highlighted?: boolean;
        onDelete?: () => void;
    }) => {
        return (
            <div className="relative flex items-center justify-center" style={{ width:'100%', height:'100%' }}>
                <div
                    className="relative flex flex-col items-center justify-center select-none"
                    style={{
                        width:'100%',
                        height:'100%',
                        borderRadius: compact ? '8px' : '10px',
                        background: highlighted ? '#ede9fe' : '#f4f2ff',
                        border:`1px solid ${highlighted ? '#a78bfa' : '#d8d0ff'}`,
                        boxShadow:'0 1px 2px rgba(15,23,42,0.05)',
                        padding: compact ? '2px 2px' : '6px 5px',
                    }}
                >
                    {onDelete && (
                        <button
                            onMouseDown={e => {
                                e.stopPropagation();
                                e.preventDefault();
                                onDelete();
                            }}
                            style={{
                                position: 'absolute',
                                top: density === 'expanded' ? '-6px' : '-4px',
                                left: density === 'expanded' ? '-6px' : '-4px',
                                width: density === 'expanded' ? '18px' : '13px',
                                height: density === 'expanded' ? '18px' : '13px',
                                fontSize: density === 'expanded' ? '10px' : '7px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                background: '#f43f5e',
                                color: '#fff',
                                fontWeight: 900,
                                lineHeight: 1,
                                zIndex: 10,
                                cursor: 'pointer',
                                border: '1.5px solid #fff',
                                boxShadow: '0 1px 4px rgba(244,63,94,0.35)',
                            }}
                        >
                            ✕
                        </button>
                    )}
                    <div
                        style={{
                            width:'100%',
                            height:'100%',
                            borderRadius: compact ? '8px' : '10px',
                            background:'linear-gradient(180deg, #f4f2ff 0%, #e9e5ff 100%)',
                            border:'1px solid #b9b0f3',
                            display:'flex',
                            flexDirection:'column',
                            alignItems:'center',
                            justifyContent:'center',
                            gap: compact ? '2px' : '4px',
                            color:'#5b50b8',
                        }}
                    >
                        <span style={{ fontSize: compact ? '13px' : '19px', fontWeight:900, lineHeight:1, marginBottom: compact ? '1px' : '3px' }}>م</span>
                        <span style={{ fontSize: compact ? '6px' : '10px', fontWeight:900, lineHeight:1 }}>انتظار</span>
                    </div>
                </div>
            </div>
        );
    };

    const setWaitingDragImage = (e: React.DragEvent) => {
        if (typeof document === 'undefined') return;
        const dragEl = document.createElement('div');
        dragEl.style.width = '46px';
        dragEl.style.height = '52px';
        dragEl.style.position = 'fixed';
        dragEl.style.top = '-1000px';
        dragEl.style.left = '-1000px';
        dragEl.style.pointerEvents = 'none';
        dragEl.style.zIndex = '9999';
        dragEl.style.display = 'flex';
        dragEl.style.alignItems = 'center';
        dragEl.style.justifyContent = 'center';
        dragEl.style.borderRadius = '8px';
        dragEl.style.background = '#ffffff';
        dragEl.style.border = '1px solid #d1d5db';
        dragEl.style.boxShadow = '0 8px 18px rgba(101,90,193,0.14)';
        dragEl.style.padding = '5px 4px';
        dragEl.style.fontFamily = 'inherit';
        dragEl.style.userSelect = 'none';

        const inner = document.createElement('div');
        inner.style.width = '100%';
        inner.style.height = '100%';
        inner.style.display = 'flex';
        inner.style.flexDirection = 'column';
        inner.style.alignItems = 'center';
        inner.style.justifyContent = 'center';
        inner.style.gap = '3px';

        const top = document.createElement('div');
        top.textContent = 'م';
        top.style.color = '#655ac1';
        top.style.fontWeight = '900';
        top.style.fontSize = '17px';
        top.style.lineHeight = '1';

        const bottom = document.createElement('div');
        bottom.textContent = 'انتظار';
        bottom.style.color = '#655ac1';
        bottom.style.fontWeight = '900';
        bottom.style.fontSize = '9px';
        bottom.style.lineHeight = '1';

        inner.appendChild(top);
        inner.appendChild(bottom);
        dragEl.appendChild(inner);
        document.body.appendChild(dragEl);
        e.dataTransfer.setDragImage(dragEl, 23, 26);
        window.setTimeout(() => {
            dragEl.remove();
        }, 0);
    };

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
                const parts = key.split('-');
                const tid = parts.slice(0, -2).join('-');
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
        const sm  = effectiveSortMode;
        const co  = effectiveCustomOrder;
        const sco = effectiveSpecOrder;
        if(sm === 'alpha') return list.sort((a,b)=>a.name.localeCompare(b.name,'ar'));
        if(sm === 'specialization'){
            if(sco.length > 0){
                const om = new Map(sco.map((id,i)=>[id,i]));
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
        if(sm==='custom' && co.length>0){
            const om=new Map(co.map((id,i)=>[id,i]));
            return list.sort((a,b)=>{
                const ia=om.has(a.id)?om.get(a.id)!:9999, ib=om.has(b.id)?om.get(b.id)!:9999; return ia-ib;
            });
        }
        return list;
    };
    const getSortedClasses = () => [...classes].sort((a,b)=> a.grade!==b.grade?a.grade-b.grade:(a.section||0)-(b.section||0));

    const isGeneral = type.startsWith('general_');
    const isInteractiveGeneralTeachers = type === 'general_teachers' && !!onUpdateSettings && (interactive || isFullScreenEditMode);
    const canEditWaitingNow = !inlineWaitingReadOnly || isFullScreen;
    const effectiveWaitingOk = (isManualMode && isManualReady) || forceWaitingInteractive;
    const isManualWaitingInteractive = type === 'general_teachers' && showWaitingManagement && isManualMode && isManualReady && !!onUpdateSettings && canEditWaitingNow;
    const showInlineTeacherHeaderCards = !isFullScreen && isGeneral && showInlineGeneralHeader;

    const toggleFullScreenEditMode = () => {
        setIsFullScreenEditMode(current => {
            const next = !current;
            if (next) {
                fullScreenEditSnapshotRef.current = JSON.parse(JSON.stringify(settings.timetable || {}));
            } else {
                fullScreenEditSnapshotRef.current = null;
            }
            setEditModeToast(next ? 'تم تفعيل التعديل اليدوي على الجدول' : 'تم حفظ وضع التعديل وإيقافه');
            return next;
        });
        setTimeout(() => setEditModeToast(null), 2600);
    };

    const cancelFullScreenEditMode = () => {
        if (fullScreenEditSnapshotRef.current && onUpdateSettings) {
            onUpdateSettings({
                ...settings,
                timetable: JSON.parse(JSON.stringify(fullScreenEditSnapshotRef.current)),
            });
        }
        fullScreenEditSnapshotRef.current = null;
        setIsFullScreenEditMode(false);
        setEditModeToast('تم إلغاء التعديلات الأخيرة');
        setTimeout(() => setEditModeToast(null), 2600);
    };

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
                            {isChain ? 'تبديل متعدد' : 'تبديل بسيط'}
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
        const nextSource = { teacherId, day, period };
        setDragSource(nextSource);
        onExternalDragSourceChange?.(nextSource);
        setDraggingTeacherRowId(teacherId);
        e.dataTransfer.setData('text/plain', key);
        e.dataTransfer.setData('dragType', 'slot');
        e.dataTransfer.setData('sourceKey', key);
        e.dataTransfer.setData('teacherId', teacherId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleGeneralDragOver = (e: React.DragEvent, targetTeacherId: string, targetKey: string, hasSlot: boolean) => {
        const dragType = e.dataTransfer.getData('dragType') || (draggingWaiting === 'card' ? 'waitingCard' : draggingWaiting === 'slot' ? 'waitingSlot' : '');
        const waitingTeacherId =
            e.dataTransfer.getData('teacherId') ||
            (draggingWaiting === 'card' ? (draggingTeacherRowId || '') : '') ||
            (draggingWaiting === 'slot' ? (draggingSlotKey?.split('-')[0] || '') : '');
        if (dragType === 'waitingCard') {
            if (!isManualMode || !isManualReady) return;
            if (waitingTeacherId && waitingTeacherId !== targetTeacherId) return;
            if (hasSlot) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setHoverTarget(targetKey);
            return;
        }
        if (dragType === 'waitingSlot') {
            if (waitingTeacherId && waitingTeacherId !== targetTeacherId) return;
            if (hasSlot && targetKey !== draggingSlotKey) return;
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
        const dragType = e.dataTransfer.getData('dragType') || (draggingWaiting === 'card' ? 'waitingCard' : draggingWaiting === 'slot' ? 'waitingSlot' : '');

        if (dragType === 'waitingCard') {
            const teacherId = e.dataTransfer.getData('teacherId') || draggingTeacherRowId || '';
            setDraggingWaiting(null);
            setDraggingTeacherRowId(null);
            if (!isManualMode || teacherId !== targetTeacherId || hasSlot) return;
            onUpdateSettings({ ...settings, timetable: { ...timetable, [targetKey]: { teacherId: targetTeacherId, type: 'waiting' as const } } });
            return;
        }

        if (dragType === 'waitingSlot') {
            const fromKey = e.dataTransfer.getData('slotKey');
            const teacherId = e.dataTransfer.getData('teacherId') || draggingSlotKey?.split('-')[0] || '';
            setDraggingWaiting(null);
            setDraggingSlotKey(null);
            setDraggingTeacherRowId(null);
            if (teacherId !== targetTeacherId || !fromKey || (hasSlot && fromKey !== targetKey)) return;
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
        onExternalDragSourceChange?.(null);
        setDraggingTeacherRowId(null);
    };

    const resetGeneralDragState = () => {
        setDragSource(null);
        onExternalDragSourceChange?.(null);
        setDraggingWaiting(null);
        setDraggingSlotKey(null);
        setDraggingTeacherRowId(null);
        setHoverTarget(null);
    };

    const toggleGeneralDay = (day: string) => {
        setSelectedGeneralDays(prev => (
            prev.includes(day) ? prev.filter(item => item !== day) : [...prev, day]
        ));
    };

    const teachersWithWaiting = useMemo(()=>{
        const ids=new Set<string>();
        Object.values(timetable).forEach(s=>{ if(s.type==='waiting'||s.isSubstitution) ids.add(s.teacherId); });
        const sorted = getSortedTeachers();
        return ids.size===0 ? sorted : sorted.filter(t=>ids.has(t.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[timetable,teachers,effectiveSortMode,effectiveCustomOrder,effectiveSpecOrder]);

    const titleMap: Record<string,string> = {
        general_teachers:   'الجدول العام للمعلمين',
        general_classes:    'الجدول العام للفصول',
        general_waiting:    'الجدول العام للانتظار',
        individual_teacher: 'جدول المعلم: '+tName(targetId||''),
        individual_class:   'جدول الفصل: ' +cName(targetId||''),
    };

    const renderGeneralTeacherControlCards = (compact = false) => {
        const generalDayOptions = ENGLISH_DAYS.map((key, index) => ({ key, label: ARABIC_DAYS[index] }));
        return (
            <div className={`grid gap-3 ${compact ? 'lg:grid-cols-2' : 'xl:grid-cols-[1.3fr_1fr]'}`}>
                <div className={`rounded-2xl border border-slate-300 bg-white ${compact ? 'px-4 py-3' : 'px-5 py-4'} shadow-sm`}>
                    <div className="flex items-start gap-3 mb-3">
                        <CalendarClock size={18} className="text-[#655ac1] shrink-0 mt-1" />
                        <div className="min-w-0">
                            <p className="text-sm font-black text-slate-800">عرض الأيام</p>
                            <p className="text-xs font-medium text-slate-500">اختر يومًا واحدًا أو أكثر أو اعرض الأسبوع كاملًا.</p>
                        </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                        <button
                            onClick={() => setSelectedGeneralDays([])}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all inline-flex items-center gap-1.5 ${
                                selectedGeneralDays.length === 0
                                    ? 'bg-white text-[#8779fb] border-slate-300'
                                    : 'bg-white text-slate-500 border-slate-300 hover:border-[#8779fb]'
                            }`}
                        >
                            {selectedGeneralDays.length === 0 && <Check size={13} strokeWidth={3} />}
                            الكل
                        </button>
                        {generalDayOptions.map(d => {
                            const active = selectedGeneralDays.length === 0 || selectedGeneralDays.includes(d.key);
                            return (
                                <button
                                    key={d.key}
                                    onClick={() => {
                                        setSelectedGeneralDays(prev => {
                                            if (prev.length === 0) return generalDayOptions.filter(x => x.key !== d.key).map(x => x.key);
                                            if (prev.includes(d.key)) {
                                                const next = prev.filter(k => k !== d.key);
                                                return next.length === 0 ? [] : next;
                                            }
                                            const next = [...prev, d.key];
                                            return next.length === generalDayOptions.length ? [] : next;
                                        });
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all inline-flex items-center gap-1.5 ${
                                        active
                                            ? 'bg-white text-[#8779fb] border-slate-300'
                                            : 'bg-white text-slate-400 border-slate-300 hover:border-[#8779fb]'
                                    }`}
                                >
                                    {active && <Check size={13} strokeWidth={3} />}
                                    {d.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className={`rounded-2xl border border-slate-300 bg-white ${compact ? 'px-4 py-3' : 'px-5 py-4'} shadow-sm`}>
                    <div className="flex items-start gap-3 mb-3">
                        <Users size={18} className="text-[#655ac1] shrink-0 mt-1" />
                        <div className="min-w-0">
                            <p className="text-sm font-black text-slate-800">عرض المعلمين</p>
                            <p className="text-xs font-medium text-slate-500">غيّر ترتيب العرض أبجديًا أو حسب التخصص أو بتخصيص يدوي.</p>
                        </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                        {([
                            { id: 'alpha' as InternalSortMode, label: 'أبجدي' },
                            { id: 'specialization' as InternalSortMode, label: 'التخصص' },
                            { id: 'custom' as InternalSortMode, label: 'مخصص' },
                        ]).map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => {
                                    setFsTeacherSort(opt.id);
                                    if (opt.id === 'custom') {
                                        setFsPendingOrder(fsCustomOrder.length > 0 ? fsCustomOrder : teachers.map(t => t.id));
                                        setShowFsSortModal(true);
                                    } else if (opt.id === 'specialization') {
                                        const usedIds = new Set(teachers.map(t => t.specializationId));
                                        const cur = fsSpecOrder.filter(id => usedIds.has(id));
                                        Object.keys(specializationNames).forEach(id => { if (usedIds.has(id) && !cur.includes(id)) cur.push(id); });
                                        setFsPendingSpecOrder(cur);
                                        setShowFsSpecSortModal(true);
                                    }
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all inline-flex items-center gap-1.5 ${
                                    fsTeacherSort === opt.id
                                        ? 'bg-white border-slate-300 text-[#8779fb]'
                                        : 'bg-white border-slate-300 text-slate-500 hover:border-[#8779fb]/50'
                                }`}
                            >
                                {fsTeacherSort === opt.id && <Check size={13} strokeWidth={3} />}
                                {opt.label}
                            </button>
                        ))}
                        {fsTeacherSort === 'custom' && fsCustomOrder.length > 0 && (
                            <button onClick={() => { setFsPendingOrder([...fsCustomOrder]); setShowFsSortModal(true); }} className="px-3 py-1.5 rounded-xl text-xs font-black border border-slate-300 text-[#655ac1] bg-white hover:border-[#8779fb] transition-all">تعديل الترتيب</button>
                        )}
                        {fsTeacherSort === 'specialization' && fsSpecOrder.length > 0 && (
                            <button onClick={() => { setFsPendingSpecOrder([...fsSpecOrder]); setShowFsSpecSortModal(true); }} className="px-3 py-1.5 rounded-xl text-xs font-black border border-slate-300 text-[#655ac1] bg-white hover:border-[#8779fb] transition-all">تعديل ترتيب التخصصات</button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    /* ════════════════════════════════════════════════════
       CELL renderers  (individual table – unchanged)
    ════════════════════════════════════════════════════ */
    const renderTeacherCell = (
        teacherId: string,
        dayKey: string,
        pi: number,
        periodBox: number,
        periodCard: number,
        primaryTextSize: string,
        secondaryTextSize: string
    ) => {
        const slot = timetable[teacherId+'-'+dayKey+'-'+(pi+1)];
        if(type==='general_waiting'){
            if(!slot || (slot.type!=='waiting' && !slot.isSubstitution))
                return null; // rendered by general table directly
            return null;
        }
        if(!slot) return null;
        const subj = subjDisplay(slot.subjectId||'');
        const cls  = cName(slot.classId||'');
        const hoverDetails = getSlotHoverDetails(slot, 'teacher');
        return (
            <div className="group/cell relative flex items-center justify-center mx-auto overflow-visible" style={{ width:`${periodBox}px`, height:`${periodBox}px`, maxWidth:'100%', maxHeight:'100%' }}>
                {renderHoverTooltip(hoverDetails)}
                <div className="relative z-10 hover:z-[80] flex flex-col items-center justify-center px-0.5 gap-0 transition-all duration-200 rounded-[8px] overflow-hidden"
                 style={{background: '#ffffff', border: '1px solid #d1d5db', width:`${periodCard}px`, height:`${periodCard}px`, boxShadow:'0 1px 2px rgba(15,23,42,0.06)'}}>
                <span className={`font-bold leading-[1.05] text-center w-full px-0.5 ${primaryTextSize}`}
                      style={{...TWO_LINE_CLAMP, color: '#111827', wordBreak:'break-word', overflowWrap:'anywhere'}}>{cls}</span>
                <span className={`font-semibold leading-[1.15] text-center w-full px-0.5 ${secondaryTextSize}`}
                      style={{...TWO_LINE_CLAMP, color: '#334155', wordBreak:'break-word', overflowWrap:'anywhere'}}>{subj}</span>
                </div>
            </div>
        );
    };

    const renderClassCell = (
        classId: string,
        dayKey: string,
        pi: number,
        periodBox: number,
        periodCard: number,
        primaryTextSize: string,
        secondaryTextSize: string
    ) => {
        const slot = classSlotMap.get(classId+'-'+dayKey+'-'+(pi+1));
        if(!slot) return null;
        const subj    = subjDisplay(slot.subjectId||'');
        const teacher = tName(slot.teacherId);
        const hoverDetails = getSlotHoverDetails(slot, 'class');
        return (
            <div className="group/cell relative flex items-center justify-center mx-auto overflow-visible" style={{ width:`${periodBox}px`, height:`${periodBox}px`, maxWidth:'100%', maxHeight:'100%' }}>
                {renderHoverTooltip(hoverDetails)}
                <div className="relative z-10 hover:z-[80] flex flex-col items-center justify-center px-0.5 gap-0 transition-all duration-200 rounded-[8px] overflow-hidden"
                 style={{background: '#ffffff', border: '1px solid #d1d5db', width:`${periodCard}px`, height:`${periodCard}px`, boxShadow:'0 1px 2px rgba(15,23,42,0.06)'}}>
                <span className={`font-bold leading-[1.05] text-center w-full px-0.5 ${primaryTextSize}`}
                      style={{...TWO_LINE_CLAMP, color: '#111827', wordBreak:'break-word', overflowWrap:'anywhere'}}>{subj}</span>
                <span className={`font-semibold leading-[1.15] text-center w-full px-0.5 ${secondaryTextSize}`}
                      style={{...TWO_LINE_CLAMP, color: '#334155', wordBreak:'break-word', overflowWrap:'anywhere'}}>{teacher}</span>
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
        const generalDayOptions = ENGLISH_DAYS.map((key, index) => ({ key, label: ARABIC_DAYS[index] }));
        const displayedDays = generalDayOptions.filter(day => selectedGeneralDays.length === 0 || selectedGeneralDays.includes(day.key));

        /* waiting badge counts per period */
        const periodWaitingCounts: number[][] = Array.from({length:displayedDays.length}, ()=>Array(MAX_PERIODS).fill(0));
        if((isTeachers || isWaiting) && showWaitingCounts){
            teachers.forEach(t=>{
                displayedDays.forEach(({ key: d },di)=>{
                    for(let p=1;p<=MAX_PERIODS;p++){
                        const s=timetable[`${t.id}-${d}-${p}`];
                        if(s&&(s.type==='waiting'||(isWaiting&&s.isSubstitution))) periodWaitingCounts[di][p-1]++;
                    }
                });
            });
        }

        /* gap background — shown as td background, inner div is the card */
        const GAP_BG   = '#eef0f6';
        /* المرحلة 2: المقاسات تُقرأ من الـ state الحالي (overview أو expanded) */
        const D = DENSITY_PRESETS[density];
        const ROW_H    = D.rowH;
        const CELL_PAD = D.cellPad; // td padding → creates the visual gap
        const hideTeacherMetaColumns = false;
        const serialColW = D.serialColW;
        const nameColW = isClasses ? D.classNameColW : hideTeacherMetaColumns ? D.teacherNameColW + D.specColW + D.quota1ColW + D.quota2ColW - 10 : D.teacherNameColW;
        const specColW = isClasses || hideTeacherMetaColumns ? 0 : D.specColW;
        const quota1ColW = hideTeacherMetaColumns ? 0 : D.quota1ColW;
        const quota2ColW = isTeachers && !hideTeacherMetaColumns ? D.quota2ColW : 0;
        const dynamicPeriodColW = D.periodBox;
        const dynamicPeriodBox = D.periodBox;
        const dynamicPeriodCard = D.periodCard;
        const dynamicPrimaryTextSize = D.primaryTextClass;
        const dynamicSecondaryTextSize = D.secondaryTextClass;
        const dynamicWaitingTextSize = D.waitingTextSize;
        const stickyRightOffsets = {
            serial: 0,
            name: serialColW,
            spec: serialColW + nameColW,
            quota1: serialColW + nameColW + specColW,
            quota2: serialColW + nameColW + specColW + quota1ColW,
        };
        const buildStickyColumnStyle = (right: number, zIndex: number, background: string): React.CSSProperties => ({
            position: 'sticky',
            right: `${right}px`,
            zIndex,
            background,
            boxShadow: 'inset -1px 0 0 rgba(148,163,184,0.22)',
        });
        /* ── period cell content ── */
        const renderPeriodCell = (rowId: string, dayKey: string, pi: number) => {
            if(isClasses) {
                const slot = classSlotMap.get(rowId+'-'+dayKey+'-'+(pi+1));
                if(!slot) return (
                    <div className="flex items-center justify-center" style={{width:`${dynamicPeriodBox}px`, height:`${dynamicPeriodBox}px`, margin:'0 auto'}}>
                        <div className="rounded-md flex items-center justify-center"
                         style={{border:'1px dashed #dde1ea', background:'#f8f9fc', width:`${dynamicPeriodCard}px`, height:`${dynamicPeriodCard}px`}}>
                            <span style={{color:'#c8cdd8', fontSize:'9px', fontWeight:700}}>—</span>
                        </div>
                    </div>
                );
                return renderClassCell(rowId, dayKey, pi, dynamicPeriodBox, dynamicPeriodCard, dynamicPrimaryTextSize, dynamicSecondaryTextSize);
            } else {
                const slot = timetable[rowId+'-'+dayKey+'-'+(pi+1)];
                if(!slot) return (
                    <div className="flex items-center justify-center" style={{width:`${dynamicPeriodBox}px`, height:`${dynamicPeriodBox}px`, margin:'0 auto'}}>
                        <div className="rounded-md flex items-center justify-center"
                         style={{border:'1px dashed #dde1ea', background: isWaiting ? '#f8fafc' : '#f8f9fc', width:`${dynamicPeriodCard}px`, height:`${dynamicPeriodCard}px`}}>
                            <span style={{color:'#c8cdd8', fontSize:'9px', fontWeight:700}}>—</span>
                        </div>
                    </div>
                );
                if(isTeachers && (slot.type==='waiting'||slot.isSubstitution)) {
                    const slotKey = `${rowId}-${dayKey}-${pi+1}`;
                    const canEditSlot = !!onUpdateSettings && canEditWaitingNow;
                    return (
                        <div className="group/cell relative flex items-center justify-center overflow-visible" style={{width:`${dynamicPeriodBox}px`, height:`${dynamicPeriodBox}px`, margin:'0 auto'}}>
                            {renderHoverTooltip(getSlotHoverDetails(slot, 'waiting'))}
                            <div
                                draggable={canEditSlot}
                                onDragStart={e => {
                                    if (!canEditSlot) return;
                                    setWaitingDragImage(e);
                                    e.dataTransfer.setData('text/plain', `waiting-slot-${slotKey}`);
                                    e.dataTransfer.setData('dragType', 'waitingSlot');
                                    e.dataTransfer.setData('slotKey', slotKey);
                                    e.dataTransfer.setData('teacherId', rowId);
                                    e.dataTransfer.effectAllowed = 'move';
                                    setDraggingWaiting('slot');
                                    setDraggingSlotKey(slotKey);
                                }}
                                onDragEnd={() => { setDraggingWaiting(null); setDraggingSlotKey(null); }}
                                style={{ width:`${dynamicPeriodCard}px`, height:`${dynamicPeriodCard}px`, cursor: canEditSlot ? 'grab' : undefined }}
                            >
                                {renderPlacedWaitingCard({
                                    compact: true,
                                    highlighted: hoverTarget === slotKey,
                                    onDelete: canEditSlot ? () => setWaitingDeleteKey(slotKey) : undefined,
                                })}
                            </div>
                        </div>
                    );
                }
                if(isWaiting) {
                    if(slot.type==='waiting'||slot.isSubstitution)
                        return (
                            <div className="group/cell relative flex items-center justify-center overflow-visible" style={{width:`${dynamicPeriodBox}px`, height:`${dynamicPeriodBox}px`, margin:'0 auto'}}>
                                {renderHoverTooltip(getSlotHoverDetails(slot, 'waiting'))}
                                <div style={{ width:`${dynamicPeriodCard}px`, height:`${dynamicPeriodCard}px` }}>
                                    {renderWaitingCard({ compact: true })}
                                </div>
                            </div>
                        );
                    return (
                        <div className="flex items-center justify-center" style={{width:`${dynamicPeriodBox}px`, height:`${dynamicPeriodBox}px`, margin:'0 auto'}}>
                            <div className="rounded-md flex items-center justify-center"
                             style={{border:'1px dashed #dde1ea', background:'#f8fafc', width:`${dynamicPeriodCard}px`, height:`${dynamicPeriodCard}px`}}>
                                <span style={{color:'#c8cdd8', fontSize:'9px', fontWeight:700}}>—</span>
                            </div>
                        </div>
                    );
                }
                const content = renderTeacherCell(rowId, dayKey, pi, dynamicPeriodBox, dynamicPeriodCard, dynamicPrimaryTextSize, dynamicSecondaryTextSize);
                if (isInteractiveGeneralTeachers && slot.type === 'lesson') {
                    return (
                        <div
                            draggable
                            onDragStart={e => handleGeneralSlotDragStart(e, rowId, dayKey, pi + 1)}
                            onDragEnd={resetGeneralDragState}
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
        const DAY_DIVIDER = '#94a3b8'; // between days
        const HEADER_DIVIDER = '#64748b'; // under sticky header
        const PERIOD_DIVIDER = '#e2e8f0'; // between period cells
        const TABLE_RADIUS = 16;

        /* th base style for info headers — مستخرجة من preset الكثافة */
        const thInfo: React.CSSProperties = {
            background: C_BG,
            color: '#fff',
            fontWeight: 800,
            fontSize: D.thInfoFontSize,
            textAlign: 'center',
            verticalAlign: 'middle',
            padding: D.thInfoPadding,
            position: 'sticky',
            top: 0,
            zIndex: 25,
            borderBottom: 0,
            borderLeft: `1px solid rgba(0,0,0,0.12)`,
            boxShadow: `inset 0 -3px 0 ${HEADER_DIVIDER}`,
        };
        const thDay: React.CSSProperties = {
            background: C_BG,
            color: '#fff',
            fontWeight: 900,
            fontSize: D.thDayFontSize,
            textAlign: 'center',
            verticalAlign: 'middle',
            padding: D.thDayPadding,
            position: 'sticky',
            top: 0,
            zIndex: 20,
            borderBottom: 0,
            borderLeft: `3px solid ${DAY_DIVIDER}`,
            boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.28)',
        };
        const thPeriod: React.CSSProperties = {
            background: C_BG_SOFT,
            color: '#64748b',
            fontWeight: 700,
            fontSize: D.thPeriodFontSize,
            textAlign: 'center',
            verticalAlign: 'middle',
            padding: D.thPeriodPadding,
            position: 'sticky',
            top: D.thPeriodTopOffset,
            zIndex: 20,
            borderBottom: 0,
            borderLeft: `1px solid ${PERIOD_DIVIDER}`,
            borderRight: `1px solid ${PERIOD_DIVIDER}`,
            boxShadow: `inset 0 0 0 1px #eef2f7, inset 0 -3px 0 ${HEADER_DIVIDER}`,
        };

        return (
            <div className="w-full relative flex flex-col flex-1 min-h-0">
                <div className="mb-3 space-y-3">
                    {!showInlineTeacherHeaderCards && !isFullScreen && isTeachers && (
                        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-300 bg-white px-3.5 py-3.5 shadow-sm">
                            <span className="text-sm font-black text-slate-500">عرض الأيام:</span>
                            <span className="text-xs font-bold text-slate-400">اختر يومًا أو أكثر، أو اعرض الأسبوع كاملًا.</span>
                            <button
                                type="button"
                                onClick={() => setSelectedGeneralDays([])}
                                className={`rounded-xl border px-3.5 py-2 text-sm font-black transition active:scale-95 ${
                                    selectedGeneralDays.length === 0
                                        ? 'border-[#8779fb] bg-[#8779fb] text-white shadow-sm'
                                        : 'border-slate-300 bg-white text-[#655ac1] hover:bg-slate-50'
                                }`}
                            >
                                الأسبوع كاملاً
                            </button>
                            {ENGLISH_DAYS.map((dayKey, index) => (
                                <button
                                    key={dayKey}
                                    type="button"
                                    onClick={() => toggleGeneralDay(dayKey)}
                                    className={`rounded-xl border px-3.5 py-2 text-sm font-black transition active:scale-95 ${
                                        selectedGeneralDays.includes(dayKey)
                                            ? 'border-[#8779fb] bg-[#8779fb] text-white shadow-sm'
                                            : 'border-slate-300 bg-white text-[#655ac1] hover:bg-slate-50'
                                    }`}
                                >
                                    {ARABIC_DAYS[index]}
                                </button>
                            ))}
                        </div>
                    )}
                    {isTeachers && generalTopControls}
                </div>
                {/* Table wrapper — flex-1+min-h-0 يجعل هذه الحاوية تأخذ الارتفاع المتبقي في الوضع الكامل */}
                <div
                    className="flex-1 min-h-0 flex flex-col"
                    style={{
                        borderRadius:'16px',
                        overflow:'hidden',
                        boxShadow:'0 4px 16px rgba(0,0,0,0.06)',
                        background: GAP_BG,
                        minHeight: isFullScreen ? undefined : '540px',
                        maxHeight: isFullScreen ? undefined : '72vh',
                    }}
                >
                <div
                    className="overflow-x-auto overflow-y-auto flex-1 min-h-0"
                    style={{
                        background: GAP_BG,
                        scrollbarGutter: 'stable both-edges',
                        overscrollBehavior: 'contain',
                    }}
                >
                <table
                    style={{
                        borderCollapse:'collapse',
                        borderSpacing:0,
                        width:'max-content',
                        minWidth:'calc(100% + 8px)',
                        marginInline:'-4px',
                        tableLayout:'fixed'
                    }}
                >
                    <colgroup>
                        <col style={{width:`${serialColW}px`}}/>
                        <col style={{width: `${nameColW}px`}}/>
                        {!isClasses && !hideTeacherMetaColumns && <col style={{width:`${specColW}px`}}/>}
                        {quota1ColW > 0 && <col style={{width:`${quota1ColW}px`}}/>}
                        {quota2ColW > 0 && <col style={{width:`${quota2ColW}px`}}/>}
                        {displayedDays.flatMap((_,di)=>
                            Array.from({length:MAX_PERIODS}).map((_,pi)=>(
                                <col key={`c-${di}-${pi}`} style={{width:`${dynamicPeriodColW}px`}}/>
                            ))
                        )}
                    </colgroup>

                    {/* ── THEAD ── */}
                    <thead>
                        {/* Row 1: info labels + day names */}
                        <tr>
                            <th rowSpan={2} style={{...thInfo, ...buildStickyColumnStyle(stickyRightOffsets.serial, 45, C_BG), borderTopRightRadius:`${TABLE_RADIUS}px`}}>م</th>
                            <th rowSpan={2} style={{...thInfo, ...buildStickyColumnStyle(stickyRightOffsets.name, 44, C_BG), textAlign:'right', paddingRight:'10px'}}>
                                {isClasses ? 'اسم الفصل' : 'اسم المعلم'}
                            </th>
                            {!isClasses && !hideTeacherMetaColumns && <th rowSpan={2} style={{...thInfo, ...buildStickyColumnStyle(stickyRightOffsets.spec, 43, C_BG)}}>التخصص</th>}
                            {quota1ColW > 0 && (
                                <th rowSpan={2} style={{...thInfo, ...buildStickyColumnStyle(stickyRightOffsets.quota1, 42, C_BG), lineHeight:'1.4'}}>
                                    <div>نصاب</div>
                                    <div style={{fontSize:'11px', opacity:0.85}}>{isClasses ? 'الحصص' : isWaiting ? 'الانتظار' : 'الحصص'}</div>
                                </th>
                            )}
                            {quota2ColW > 0 && <th rowSpan={2} style={{...thInfo, ...buildStickyColumnStyle(stickyRightOffsets.quota2, 41, C_BG), borderLeft:`3px solid ${DAY_DIVIDER}`, lineHeight:'1.4'}}>
                                <div>نصاب</div>
                                <div style={{fontSize:'11px', opacity:0.85}}>الانتظار</div>
                            </th>}
                            {displayedDays.map(({ label: day },di)=>(
                                <th
                                    key={day}
                                    colSpan={MAX_PERIODS}
                                    style={{
                                        ...thDay,
                                        borderLeft: di===0 ? `1px solid rgba(0,0,0,0.12)` : `3px solid ${DAY_DIVIDER}`,
                                        ...(di === displayedDays.length - 1 ? { borderTopLeftRadius:`${TABLE_RADIUS}px` } : {}),
                                    }}
                                >
                                    {day}
                                </th>
                            ))}
                        </tr>
                        {/* Row 2: period numbers */}
                        <tr>
                            {displayedDays.flatMap((_,di)=>
                                Array.from({length:MAX_PERIODS}).map((_,pi)=>(
                                    <th key={`h-${di}-${pi}`} style={{
                                        ...thPeriod,
                                        borderLeft: (pi===MAX_PERIODS-1 && di<ENGLISH_DAYS.length-1) ? `3px solid ${DAY_DIVIDER}` : `1px solid ${PERIOD_DIVIDER}`,
                                    }}>
                                        <span className="relative inline-flex items-center justify-center font-black text-xs"
                                              style={{color: '#64748b'}}>
                                            {pi+1}
                                            {showWaitingCounts && (isTeachers||isWaiting) && periodWaitingCounts[di][pi] > 0 && (
                                                <span
                                                    className="absolute top-full left-1/2 mt-1 -translate-x-1/2 rounded-full border border-[#f3d3d3] bg-white px-2 py-[2px] font-black leading-none text-red-500 shadow-sm"
                                                    style={{lineHeight:1, fontSize: density === 'expanded' ? '11px' : '9px'}}>
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
                        ) : rows.map((row, rowIndex)=>{
                            const isLastRow = rowIndex === rows.length - 1;
                            /* info card shared style */
                            const infoCardBase: React.CSSProperties = {
                                borderRadius:'7px',
                                background:'#fff',
                                border:'1px solid #e8eaf2',
                                padding:'3px 5px',
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
                                    <td style={{
                                        padding:CELL_PAD,
                                        background: row.id === draggingTeacherRowId ? '#ede9fe' : GAP_BG,
                                        verticalAlign:'middle',
                                        ...(isLastRow ? { borderBottomRightRadius:`${TABLE_RADIUS}px` } : {}),
                                        ...buildStickyColumnStyle(stickyRightOffsets.serial, 18, row.id === draggingTeacherRowId ? '#ede9fe' : GAP_BG)
                                    }}>
                                        <div className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200"
                                             style={{...infoCardBase, justifyContent:'center', background: row.id === draggingTeacherRowId ? '#f5f3ff' : infoCardBase.background, borderColor: row.id === draggingTeacherRowId ? '#a78bfa' : '#e8eaf2'}}>
                                             <span style={{color:'#94a3b8', fontSize:'9px', fontWeight:700}}>{row.serial}</span>
                                        </div>
                                    </td>
                                    {/* name */}
                                    <td style={{padding:CELL_PAD, background: row.id === draggingTeacherRowId ? '#ede9fe' : GAP_BG, verticalAlign:'middle', ...buildStickyColumnStyle(stickyRightOffsets.name, 17, row.id === draggingTeacherRowId ? '#ede9fe' : GAP_BG)}}>
                                        <div className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200"
                                             style={{...infoCardBase, justifyContent:'flex-start', paddingRight:'6px', paddingLeft:'3px', background: row.id === draggingTeacherRowId ? '#f5f3ff' : infoCardBase.background, borderColor: row.id === draggingTeacherRowId ? '#a78bfa' : '#e8eaf2'}}>
                                             <div className="flex items-center justify-between gap-2 w-full">
                                                <span style={{color:'#1e293b', fontSize:'11px', fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', direction:'rtl', textAlign:'right', flex:1}}>{row.name}</span>
                                                {showWaitingManagement && isTeachers && isManualMode && isManualReady && (row.quota2 || 0) > 0 && Math.max((row.quota2 || 0) - (placedWaitingPerTeacher.get(row.id) || 0), 0) > 0 && (
                                                    <div className="group/waiting-trigger relative flex items-center gap-2 shrink-0 rounded-xl px-1.5 py-1 transition-all duration-200">
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            draggable={isManualWaitingInteractive}
                                                            onDragStart={e => {
                                                                if (!isManualWaitingInteractive) return;
                                                                setWaitingDragImage(e);
                                                                e.dataTransfer.setData('text/plain', `waiting-${row.id}`);
                                                                e.dataTransfer.setData('dragType', 'waitingCard');
                                                                e.dataTransfer.setData('teacherId', row.id);
                                                                e.dataTransfer.setData('sourceKey', `waiting-${row.id}`);
                                                                e.dataTransfer.effectAllowed = 'move';
                                                                setDraggingWaiting('card');
                                                                setDraggingTeacherRowId(row.id);
                                                            }}
                                                            onDragEnd={resetGeneralDragState}
                                                            aria-label={`سحب م انتظار للمعلم ${row.name}`}
                                                            style={{
                                                                width:'46px',
                                                                height:'47px',
                                                                flexShrink:0,
                                                                cursor: isManualWaitingInteractive ? 'grab' : 'default',
                                                                filter: draggingTeacherRowId === row.id
                                                                    ? 'drop-shadow(0 10px 18px rgba(101,90,193,0.18))'
                                                                    : 'drop-shadow(0 4px 10px rgba(101,90,193,0.10))',
                                                                transform: draggingTeacherRowId === row.id ? 'translateY(-1px)' : undefined,
                                                                transition:'transform 0.18s ease, filter 0.18s ease, opacity 0.18s ease',
                                                            }}
                                                        >
                                                            <div className="transition-transform duration-200">
                                                                {renderWaitingDeck({
                                                                    count: Math.max((row.quota2 || 0) - (placedWaitingPerTeacher.get(row.id) || 0), 0),
                                                                    compact: false,
                                                                    draggable: false,
                                                                })}
                                                            </div>
                                                        </div>
                                                        <span
                                                            className="pointer-events-none absolute right-full top-1/2 inline-flex -translate-y-1/2 whitespace-nowrap rounded-full border border-[#d8d0ff] bg-white px-2.5 py-1 text-[10px] font-black text-[#5b50b8] shadow-sm opacity-0 transition-all duration-200 group-hover/waiting-trigger:mr-2 group-hover/waiting-trigger:opacity-100"
                                                            style={{ marginRight:'0px' }}
                                                        >
                                                            اسحب حصة الانتظار
                                                        </span>
                                                    </div>
                                                )}
                                             </div>
                                        </div>
                                    </td>
                                    {/* spec */}
                                    {!isClasses && !hideTeacherMetaColumns && (
                                        <td style={{padding:CELL_PAD, background: row.id === draggingTeacherRowId ? '#ede9fe' : GAP_BG, verticalAlign:'middle', ...buildStickyColumnStyle(stickyRightOffsets.spec, 16, row.id === draggingTeacherRowId ? '#ede9fe' : GAP_BG)}}>
                                            <div className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200"
                                                 style={{...infoCardBase, background: row.id === draggingTeacherRowId ? '#f5f3ff' : infoCardBase.background, borderColor: row.id === draggingTeacherRowId ? '#a78bfa' : '#e8eaf2'}} title={row.spec}>
                                                <span style={{color:'#64748b', fontSize:'8px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{row.spec}</span>
                                            </div>
                                        </td>
                                    )}
                                    {/* quota1 */}
                                    {quota1ColW > 0 && (
                                        <td style={{padding:CELL_PAD, background: row.id === draggingTeacherRowId ? '#ede9fe' : GAP_BG, verticalAlign:'middle', ...buildStickyColumnStyle(stickyRightOffsets.quota1, 15, row.id === draggingTeacherRowId ? '#ede9fe' : GAP_BG)}}>
                                            <div className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200"
                                                 style={{...infoCardBase, background: row.id === draggingTeacherRowId ? '#f5f3ff' : infoCardBase.background, borderColor: row.id === draggingTeacherRowId ? '#a78bfa' : '#e8eaf2'}}>
                                            <span style={{color: '#64748b', fontSize:'11px', fontWeight:900}}>{row.quota1}</span>
                                            </div>
                                        </td>
                                    )}
                                    {/* quota2 teachers only */}
                                    {quota2ColW > 0 && (
                                        <td style={{padding:CELL_PAD, background: row.id === draggingTeacherRowId ? '#ede9fe' : GAP_BG, verticalAlign:'middle', ...buildStickyColumnStyle(stickyRightOffsets.quota2, 14, row.id === draggingTeacherRowId ? '#ede9fe' : GAP_BG)}}>
                                            <div
                                                 className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200 relative"
                                                 style={{...infoCardBase, overflow:'visible', background: row.id === draggingTeacherRowId ? '#f5f3ff' : infoCardBase.background, borderColor: row.id === draggingTeacherRowId ? '#a78bfa' : '#e8eaf2'}}>
                                                <span style={{color: '#64748b', fontSize:'11px', fontWeight:900}}>
                                                    {row.quota2}
                                                </span>
                                            </div>
                                        </td>
                                    )}
                                    {/* period cells */}
                                    {displayedDays.flatMap(({ key: dayKey },di)=>
                                        Array.from({length:MAX_PERIODS}).map((_,pi)=>(
                                            <td key={`${di}-${pi}`}
                                                onDragOver={e => {
                                                    if (!onUpdateSettings || !canEditWaitingNow) return;
                                                    const dt = e.dataTransfer.getData('dragType') || (draggingWaiting === 'card' ? 'waitingCard' : draggingWaiting === 'slot' ? 'waitingSlot' : '');
                                                    if (dt === 'waitingCard' && !isManualWaitingInteractive) return;
                                                    handleGeneralDragOver(e, row.id, `${row.id}-${dayKey}-${pi+1}`, !!timetable[`${row.id}-${dayKey}-${pi+1}`]);
                                                }}
                                                onDragLeave={() => { if (onUpdateSettings && canEditWaitingNow) setHoverTarget(null); }}
                                                onDrop={e => {
                                                    if (!onUpdateSettings || !canEditWaitingNow) return;
                                                    const dt = e.dataTransfer.getData('dragType') || (draggingWaiting === 'card' ? 'waitingCard' : draggingWaiting === 'slot' ? 'waitingSlot' : '');
                                                    if (dt === 'waitingCard' && !isManualWaitingInteractive) return;
                                                    handleGeneralDrop(e, row.id, dayKey, pi + 1, !!timetable[`${row.id}-${dayKey}-${pi+1}`]);
                                                }}
                                                onDragEnd={resetGeneralDragState}
                                                style={{
                                                    padding: CELL_PAD,
                                                    background: row.id === draggingTeacherRowId
                                                        ? (hoverTarget === `${row.id}-${dayKey}-${pi+1}` ? '#ddd6fe' : '#ede9fe')
                                                        : (hoverTarget === `${row.id}-${dayKey}-${pi+1}` ? '#f1f5f9' : GAP_BG),
                                                    verticalAlign:'middle',
                                                    height:`${ROW_H}px`,
                                                    overflow:'visible',
                                                    borderLeft: (pi===MAX_PERIODS-1 && di<displayedDays.length-1) ? `3px solid ${DAY_DIVIDER}` : undefined,
                                                    ...(isLastRow && di === displayedDays.length - 1 && pi === MAX_PERIODS - 1
                                                        ? { borderBottomLeftRadius:`${TABLE_RADIUS}px` }
                                                        : {}),
                                                }}>
                                                {(() => {
                                                    const cellKey = `${row.id}-${dayKey}-${pi+1}`;
                                                    const isDropTarget = draggingTeacherRowId === row.id && hoverTarget === cellKey;
                                                    const isAvailableForDrop =
                                                        draggingTeacherRowId === row.id &&
                                                        draggingWaiting === 'card' &&
                                                        !timetable[cellKey];
                                                    if (isAvailableForDrop && !timetable[cellKey]) {
                                                        return (
                                                            <div
                                                                className="flex items-center justify-center rounded-[10px] border-2 border-dashed text-center transition-all"
                                                                style={{
                                                                    width:`${dynamicPeriodCard}px`,
                                                                    height:`${dynamicPeriodCard}px`,
                                                                    margin:'0 auto',
                                                                    borderColor: isDropTarget ? '#7c3aed' : '#c4b5fd',
                                                                    background: isDropTarget ? '#f3e8ff' : '#faf5ff',
                                                                    boxShadow: isDropTarget ? '0 8px 20px rgba(124,58,237,0.18)' : 'inset 0 0 0 1px rgba(196,181,253,0.35)',
                                                                }}
                                                            >
                                                                <div>
                                                                    <div className="text-[14px] font-black" style={{color: isDropTarget ? '#7c3aed' : '#8b5cf6'}}>
                                                                        {isDropTarget ? 'أفلت' : 'اسحب'}
                                                                    </div>
                                                                    <div className="text-[8px] font-black" style={{color: isDropTarget ? '#7c3aed' : '#8b5cf6'}}>
                                                                        {isDropTarget ? 'هنا' : 'إلى هنا'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return renderPeriodCell(row.id, dayKey, pi);
                                                })()}
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
        const individualWaitingQuota = isTeacher && teacher ? tWQ(teacher) : 0;
        const individualPlacedWaiting = isTeacher && teacher ? (placedWaitingPerTeacher.get(teacher.id) || 0) : 0;
        const individualRemainingWaiting = isManualReady ? Math.max(individualWaitingQuota - individualPlacedWaiting, 0) : 0;
        const GAP_BG = '#eef0f6';
        const INDIVIDUAL_HEADER_BG = '#e5e1fe';
        const INDIVIDUAL_HEADER_BORDER = '#cfc7ff';
        const INDIVIDUAL_HEADER_TEXT = '#655ac1';
        const ROW_H = compactIndividual ? 52 : 76;
        const CELL_PAD = '1px';
        const periodColW = compactIndividual ? 64 : 86;
        const dayColW = compactIndividual ? periodColW : 82;
        const individualPeriodBox = periodColW;
        const individualPeriodCardWidth = periodColW;
        const individualPeriodCardHeight = compactIndividual ? 48 : 72;
        const individualCardInset = compactIndividual ? 2 : 4;
        const infoCardBase: React.CSSProperties = {
            borderRadius:'7px',
            background:'#fff',
            border:'1px solid #e8eaf2',
            height: `${individualPeriodCardHeight}px`,
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            boxShadow:'0 1px 3px rgba(15,23,42,0.05)',
            transition:'background 0.2s, border-color 0.2s',
        };
        const headerCardBase: React.CSSProperties = {
            background:INDIVIDUAL_HEADER_BG,
            border:`1px solid ${INDIVIDUAL_HEADER_BORDER}`,
            boxShadow:'0 1px 2px rgba(101,90,193,0.10)',
            height:`${individualPeriodCardHeight}px`,
            width:'100%',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
        };
        const renderIndividualLessonCard = (slot: typeof timetable[string], mode: 'teacher' | 'class', isDragging = false, isDropTarget = false) => {
            const primaryText = mode === 'teacher' ? cName(slot.classId || '') : subjDisplay(slot.subjectId || '');
            const secondaryText = mode === 'teacher' ? subjDisplay(slot.subjectId || '') : tName(slot.teacherId);

            return (
                <div
                    className="group/cell relative flex items-center justify-center mx-auto"
                    style={{ width:'100%', height:`${individualPeriodCardHeight}px`, maxWidth:'100%', padding:`0 ${individualCardInset}px` }}
                >
                    <div
                        className="relative z-10 hover:z-[80] flex flex-col items-center justify-center rounded-[8px]"
                        style={{
                            background: isDropTarget ? '#f0edff' : isDragging ? '#f8f9fc' : '#ffffff',
                            border: isDropTarget ? '2px solid #8779fb' : isDragging ? '1.5px dashed #c4b5fd' : '1px solid #d1d5db',
                            width:'100%',
                            height:'100%',
                            boxShadow: isDropTarget ? '0 0 0 3px rgba(135,121,251,0.15)' : '0 1px 2px rgba(15,23,42,0.06)',
                            padding:'4px 5px',
                            gap:'3px',
                            overflow:'visible',
                            transition:'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                            cursor: isDragging ? 'grabbing' : undefined,
                        }}
                    >
                        <span
                            className={`w-full text-center font-black leading-tight ${compactIndividual ? 'text-[13px]' : 'text-[16px]'}`}
                            style={{color:'#6b7280', wordBreak:'break-word', overflowWrap:'anywhere'}}
                        >
                            {primaryText}
                        </span>
                        <span
                            className={`w-full text-center font-bold leading-tight ${compactIndividual ? 'text-[10px]' : 'text-[12px]'}`}
                            style={{color:'#9ca3af', wordBreak:'break-word', overflowWrap:'anywhere'}}
                        >
                            {secondaryText}
                        </span>
                    </div>
                </div>
            );
        };

        return (
            <div className="w-full" style={{direction:'rtl'}}>

                {/* ── Info Card Header ── */}
                {!hideIndividualHeader && (
                    <div className={`rounded-2xl relative overflow-hidden ${compactIndividual ? 'p-3.5 mb-3.5' : 'p-5 mb-5'}`}
                        style={{
                            background: '#ffffff',
                            border: '1px solid #d1d5db',
                            boxShadow:'0 2px 8px rgba(0,0,0,0.06)'
                        }}>
                        <div className={`relative flex items-center gap-5 flex-wrap ${compactIndividual ? 'justify-between' : ''}`}>
                            <div className="flex-1 min-w-0 text-right">
                                <div
                                    className="font-black mb-1"
                                    style={{color:'#8779fb', fontSize: compactIndividual ? '13px' : '18px'}}
                                >
                                    {isTeacher ? 'المعلم' : 'الفصل'}
                                </div>
                                <div className={`font-black leading-tight truncate ${compactIndividual ? 'text-lg' : 'text-2xl'}`} dir="ltr" style={{textAlign:'right', color:'#655ac1'}}>
                                    {isTeacher ? (teacher?.name||'—') : (cls?.name || (cls ? `${cls.grade}/${cls.section}` : '—'))}
                                </div>
                                {isTeacher && teacher && (
                                    <div
                                        className="font-semibold mt-1"
                                        style={{color:'#8779fb', fontSize: compactIndividual ? '11px' : '15px'}}
                                    >
                                        {specializationNames[teacher.specializationId]||'—'}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-1.5 shrink-0 items-center">
                                {showWaitingManagement && isTeacher && effectiveWaitingOk && individualRemainingWaiting > 0 && (
                                    <div className="flex flex-col items-center gap-1">
                                        {renderWaitingDeck({
                                            count: individualRemainingWaiting,
                                            compact: compactIndividual,
                                            draggable: true,
                                            onDragStart: e => {
                                                setWaitingDragImage(e);
                                                e.dataTransfer.setData('text/plain', `waiting-${targetId}`);
                                                e.dataTransfer.setData('dragType', 'waitingCard');
                                                e.dataTransfer.setData('teacherId', targetId || '');
                                                e.dataTransfer.effectAllowed = 'move';
                                                setDraggingWaiting('card');
                                                setDraggingTeacherRowId(targetId || null);
                                            },
                                            onDragEnd: () => {
                                                setDraggingWaiting(null);
                                                setDraggingTeacherRowId(null);
                                            },
                                        })}
                                        <span className={`font-bold ${compactIndividual ? 'text-[8px]' : 'text-[10px]'}`} style={{color:'#94a3b8'}}>اسحب للتعيين</span>
                                    </div>
                                )}
                                <div className={`flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 ${compactIndividual ? 'px-2.5 py-1 min-w-[56px]' : 'px-4 py-2 min-w-[80px]'}`}>
                                    <span className={`font-bold leading-none mb-1 ${compactIndividual ? 'text-[9px]' : 'text-[13px]'}`} style={{color:'#94a3b8'}}>
                                        {isTeacher ? 'نصاب الحصص' : 'عدد الحصص'}
                                    </span>
                                    <span className={`font-black leading-none ${compactIndividual ? 'text-[16px]' : 'text-[24px]'}`} style={{color:'#655ac1'}}>
                                        {isTeacher ? (teacher ? tLQ(teacher) : 0) : (classLessonCount.get(targetId||'')||0)}
                                    </span>
                                </div>
                                {isTeacher && (
                                    <div className={`flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 ${compactIndividual ? 'px-2.5 py-1 min-w-[56px]' : 'px-4 py-2 min-w-[80px]'}`}>
                                        <span className={`font-bold leading-none mb-1 ${compactIndividual ? 'text-[9px]' : 'text-[13px]'}`} style={{color:'#94a3b8'}}>نصاب الانتظار</span>
                                        <span className={`font-black leading-none ${compactIndividual ? 'text-[16px]' : 'text-[24px]'}`} style={{color:'#655ac1'}}>{individualWaitingQuota}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Table ── */}
                <div className="relative" style={{borderRadius:'16px', overflow:'visible', boxShadow:'0 4px 16px rgba(0,0,0,0.06)', background: GAP_BG}}>
                    <div className={compactIndividual ? 'overflow-x-visible' : 'overflow-x-auto'}>
                    <table className="w-full border-collapse" style={{minWidth: compactIndividual ? '100%' : '600px', background:GAP_BG}}>
                        <colgroup>
                            <col style={{width:`${dayColW}px`}} />
                            {Array.from({length:MAX_PERIODS}).map((_, i) => (
                                <col key={`individual-period-${i}`} style={{width:`${periodColW}px`}} />
                            ))}
                        </colgroup>
                        <thead>
                            <tr>
                                {/* Day column header */}
                                <th className="py-1 px-1 font-black text-base text-center"
                                    style={{
                                        minWidth:`${dayColW}px`,
                                        background:GAP_BG,
                                        color:'#fff',
                                        borderBottom:'0',
                                        borderLeft:'0',
                                        fontSize: compactIndividual ? '13px' : '18px'
                                    }}>
                                    <div
                                        style={{
                                            ...headerCardBase,
                                            borderRadius: compactIndividual ? '12px' : '14px',
                                            color:INDIVIDUAL_HEADER_TEXT,
                                            fontSize: compactIndividual ? '13px' : '18px',
                                            fontWeight:900,
                                        }}
                                    >
                                        اليوم
                                    </div>
                                </th>
                                {/* Period number headers */}
                                {Array.from({length:MAX_PERIODS}).map((_,i)=>(
                                    <th key={i} className="py-1 px-1 font-bold text-base text-center"
                                    style={{
                                        minWidth:`${periodColW}px`,
                                        background:GAP_BG,
                                        color:'#64748b',
                                        borderBottom:'0',
                                        borderLeft:'0'
                                    }}>
                                        <div className="flex items-center justify-center">
                                            <div
                                                className="flex items-center justify-center rounded-[14px]"
                                                style={{
                                                    ...headerCardBase,
                                                    color:INDIVIDUAL_HEADER_TEXT,
                                                    fontSize: compactIndividual ? '12px' : '17px',
                                                    fontWeight:900,
                                                    padding: compactIndividual ? '3px 3px 2px' : '6px 5px 5px',
                                                }}
                                            >
                                                {i+1}
                                            </div>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody style={{background:GAP_BG}}>
                            {ARABIC_DAYS.map((day, di)=>{
                                return (
                                <tr key={day}>
                                    {/* Day label cell */}
                                    <td className="sticky right-0 z-10"
                                        style={{
                                            minWidth:`${dayColW}px`,
                                            height:`${ROW_H}px`,
                                            background:GAP_BG,
                                            padding:CELL_PAD,
                                            verticalAlign:'middle',
                                        }}>
                                        <div
                                            style={{
                                                ...infoCardBase,
                                                background:INDIVIDUAL_HEADER_BG,
                                                borderColor:INDIVIDUAL_HEADER_BORDER,
                                                borderRadius:'14px',
                                                boxShadow:'0 1px 2px rgba(101,90,193,0.10)',
                                            }}
                                        >
                                            <span
                                                className={`px-2 font-black text-center leading-none ${compactIndividual ? 'text-[12px]' : 'text-[18px]'}`}
                                                style={{color:INDIVIDUAL_HEADER_TEXT}}
                                            >
                                                {day}
                                            </span>
                                        </div>
                                    </td>
                                    {/* Period cells */}
                                    {Array.from({length:MAX_PERIODS}).map((_,pi)=>{
                                        const slotKey = targetId+'-'+ENGLISH_DAYS[di]+'-'+(pi+1);
                                        const slot = isTeacher
                                            ? timetable[slotKey]
                                            : classSlotMap.get(slotKey);
                                        const isWaiting = isTeacher && slot && (slot.type==='waiting'||slot.isSubstitution);
                                        const isLessonSlot = !!slot && !isWaiting;
                                        const isHovered = hoverTarget === slotKey;
                                        const activeLessonDragSource = dragSource || externalDragSource;
                                        const isDraggingLesson = activeLessonDragSource !== null && draggingWaiting === null;
                                        const isThisCellDragging = activeLessonDragSource?.teacherId === targetId && activeLessonDragSource?.day === ENGLISH_DAYS[di] && activeLessonDragSource?.period === pi+1;
                                        const canDropWaiting = isTeacher && interactive && effectiveWaitingOk && onUpdateSettings && draggingWaiting !== null && !slot;
                                        const canDropLesson = isTeacher && interactive && onUpdateSettings && isDraggingLesson && !isWaiting;
                                        const canDropOnWaiting = isTeacher && interactive && effectiveWaitingOk && onUpdateSettings && draggingWaiting === 'slot' && isWaiting;

                                        let cellContent = null;
                                        if (!slot) {
                                            const isDragActive = canDropWaiting || canDropLesson;
                                            const showDrop = isDragActive && isHovered;
                                            cellContent = (
                                                <div className="w-full h-full rounded-[8px] border flex items-center justify-center transition-all"
                                                     style={{
                                                         borderStyle: 'dashed',
                                                         borderColor: showDrop ? '#64748b' : isDragActive ? '#94a3b8' : '#dde1ea',
                                                         background: showDrop ? '#f1f5f9' : isDragActive ? '#f8fafc' : '#f8f9fc',
                                                         width:`calc(100% - ${individualCardInset * 2}px)`,
                                                         height:`${individualPeriodCardHeight}px`,
                                                         margin:'0 auto',
                                                         boxShadow: showDrop ? '0 0 0 2px rgba(100,116,139,0.15)' : 'none',
                                                      }}>
                                                    {showDrop ? (
                                                        <div className="text-center flex flex-col items-center gap-0.5">
                                                            <div className="text-[13px] font-black" style={{color:'#64748b'}}>↓</div>
                                                            <div className="text-[9px] font-black" style={{color:'#94a3b8'}}>انقل هنا</div>
                                                        </div>
                                                    ) : isDragActive ? (
                                                        <span className="text-[9px] font-bold" style={{color:'#94a3b8'}}>انقل هنا</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold" style={{color:'#cbd5e1'}}>—</span>
                                                    )}
                                                </div>
                                            );
                                        } else if (isWaiting) {
                                            cellContent = (
                                                <div className="w-full h-full relative group"
                                                     style={{
                                                         width:`calc(100% - ${individualCardInset * 2}px)`,
                                                         height:`${individualPeriodCardHeight}px`,
                                                         margin:'0 auto'
                                                      }}>
                                                    {renderPlacedWaitingCard({
                                                        highlighted: canDropOnWaiting && isHovered,
                                                        onDelete: isTeacher && onUpdateSettings && canEditWaitingNow ? () => setWaitingDeleteKey(slotKey) : undefined,
                                                    })}
                                                </div>
                                            );
                                        } else {
                                            cellContent = renderIndividualLessonCard(
                                                slot,
                                                isTeacher ? 'teacher' : 'class',
                                                isThisCellDragging,
                                                isHovered && isDraggingLesson && !isThisCellDragging
                                            );
                                        }

                                        // Lesson drag props
                                        const lessonDragProps = (isTeacher && interactive && onUpdateSettings && isLessonSlot) ? {
                                            draggable: true,
                                            onDragStart: (e: React.DragEvent) => {
                                                handleGeneralSlotDragStart(e, targetId!, ENGLISH_DAYS[di], pi + 1);
                                            },
                                            onDragEnd: () => {
                                                setDragSource(null);
                                                onExternalDragSourceChange?.(null);
                                                setHoverTarget(null);
                                            },
                                        } : {};

                                        // Waiting drag props
                                        const waitingDragProps = (isTeacher && onUpdateSettings && isWaiting) ? {
                                            draggable: true,
                                            onDragStart: (e: React.DragEvent) => {
                                                setWaitingDragImage(e);
                                                e.dataTransfer.setData('dragType', 'waitingSlot');
                                                e.dataTransfer.setData('slotKey', slotKey);
                                                e.dataTransfer.setData('teacherId', targetId || '');
                                                e.dataTransfer.effectAllowed = 'move';
                                                setDraggingWaiting('slot');
                                                setDraggingSlotKey(slotKey);
                                            },
                                            onDragEnd: () => { setDraggingWaiting(null); setDraggingSlotKey(null); },
                                        } : {};

                                        const activeDragProps = isWaiting ? waitingDragProps : lessonDragProps;

                                        return (
                                            <td key={pi}
                                                {...activeDragProps}
                                                onDragOver={e => {
                                                    if (!isTeacher || !onUpdateSettings) return;
                                                    const dragType = e.dataTransfer.getData('dragType')
                                                        || (activeLessonDragSource ? 'slot' : '')
                                                        || (draggingWaiting === 'card' ? 'waitingCard' : draggingWaiting === 'slot' ? 'waitingSlot' : '');
                                                    if (dragType === 'slot') {
                                                        if (!interactive || isWaiting) return;
                                                        handleGeneralDragOver(e, targetId!, slotKey, isLessonSlot);
                                                        return;
                                                    }
                                                    const tid = e.dataTransfer.getData('teacherId')
                                                        || (draggingWaiting === 'card' ? (draggingTeacherRowId || '') : '');
                                                    if (!dragType || !tid || tid !== targetId) return;
                                                    if (dragType === 'waitingCard' && !slot && effectiveWaitingOk) {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                        setHoverTarget(slotKey);
                                                        return;
                                                    }
                                                    if (dragType === 'waitingSlot' && (!slot || (isWaiting && slotKey !== draggingSlotKey))) {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                        setHoverTarget(slotKey);
                                                    }
                                                }}
                                                onDragLeave={() => setHoverTarget(null)}
                                                onDrop={e => {
                                                    if (!isTeacher || !onUpdateSettings) return;
                                                    const dragType = e.dataTransfer.getData('dragType') || (activeLessonDragSource ? 'slot' : '');
                                                    if (dragType === 'slot') {
                                                        if (!interactive || isWaiting) { e.preventDefault(); return; }
                                                        handleGeneralDrop(e, targetId!, ENGLISH_DAYS[di], pi + 1, isLessonSlot);
                                                        setHoverTarget(null);
                                                        return;
                                                    }
                                                    e.preventDefault();
                                                    setHoverTarget(null);
                                                    const tid = e.dataTransfer.getData('teacherId');
                                                    if (tid !== targetId) return;
                                                    if (dragType === 'waitingCard' && !slot && effectiveWaitingOk) {
                                                        const newTimetable = { ...settings.timetable, [slotKey]: { type: 'waiting' as const, teacherId: tid } };
                                                        onUpdateSettings({ ...settings, timetable: newTimetable });
                                                        setDraggingWaiting(null);
                                                        setDraggingSlotKey(null);
                                                    } else if (dragType === 'waitingSlot') {
                                                        const fromKey = e.dataTransfer.getData('slotKey');
                                                        if (fromKey === slotKey) return;
                                                        if (!slot) {
                                                            const newTimetable = { ...settings.timetable };
                                                            newTimetable[slotKey] = newTimetable[fromKey];
                                                            delete newTimetable[fromKey];
                                                            onUpdateSettings({ ...settings, timetable: newTimetable });
                                                        }
                                                        setDraggingWaiting(null);
                                                        setDraggingSlotKey(null);
                                                    }
                                                }}
                                                style={{
                                                    height:`${ROW_H}px`,
                                                    minWidth:`${periodColW}px`,
                                                    background:GAP_BG,
                                                    padding:CELL_PAD,
                                                    verticalAlign:'middle',
                                                    position:'relative',
                                                    cursor: isLessonSlot && interactive ? 'grab' : (isTeacher && interactive && effectiveWaitingOk && isWaiting) ? 'grab' : undefined,
                                                }}>
                                                {cellContent}
                                                {(() => {
                                                    const slotBadgeKey = `${ENGLISH_DAYS[di]}-${pi+1}`;
                                                    const wCount = waitingCountPerSlot[slotBadgeKey];
                                                    if (!wCount) return null;
                                                    const isPopupOpen = badgePopupSlot === slotBadgeKey;
                                                    const waitingNames = isPopupOpen
                                                        ? Object.entries(settings.timetable || {})
                                                            .filter(([k, s]) => {
                                                                if ((s as any)?.type !== 'waiting') return false;
                                                                const p = k.split('-');
                                                                return p[p.length-1] === String(pi+1) && p[p.length-2] === ENGLISH_DAYS[di];
                                                            })
                                                            .map(([k]) => {
                                                                const p = k.split('-');
                                                                const tid = p.slice(0,-2).join('-');
                                                                return teachers.find(t => t.id === tid)?.name || tid;
                                                            })
                                                        : [];
                                                    return (
                                                        <div style={{position:'absolute', top:'3px', right:'3px', zIndex:100}}>
                                                            <div
                                                                onClick={e => { e.stopPropagation(); setBadgePopupSlot(isPopupOpen ? null : slotBadgeKey); }}
                                                                style={{
                                                                    minWidth:'16px', height:'16px', borderRadius:'99px',
                                                                    background:'#655ac1', color:'#fff',
                                                                    fontSize:'9px', fontWeight:900,
                                                                    display:'flex', alignItems:'center', justifyContent:'center',
                                                                    padding:'0 3px', cursor:'pointer',
                                                                    boxShadow:'0 1px 4px rgba(101,90,193,0.35)',
                                                                }}
                                                            >
                                                                {wCount}
                                                            </div>
                                                            {isPopupOpen && (
                                                                <div
                                                                    onClick={e => e.stopPropagation()}
                                                                    style={{
                                                                        position:'absolute', top:'20px', left:'0',
                                                                        background:'#fff', border:'1px solid #d8d0ff',
                                                                        borderRadius:'10px', padding:'8px 10px',
                                                                        boxShadow:'0 4px 16px rgba(101,90,193,0.18)',
                                                                        minWidth:'130px', zIndex:100,
                                                                        direction:'rtl',
                                                                    }}
                                                                >
                                                                    <div style={{fontSize:'10px', fontWeight:900, color:'#655ac1', marginBottom:'5px'}}>المعلمون المنتظرون</div>
                                                                    {waitingNames.map((name, idx) => (
                                                                        <div key={idx} style={{fontSize:'10px', fontWeight:700, color:'#334155', padding:'2px 0', borderTop: idx>0 ? '1px solid #f0eeff' : 'none'}}>
                                                                            {name}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
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
    const handleCloseFullScreen = () => {
        setIsFullScreen(false);
        setIsFullScreenEditMode(false);
    };

    /* ── fullscreen sort modals ─────────────────────────────────── */
    const renderFsSortModal = () => (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"><Users size={18} className="text-[#655ac1]" /></div>
                        <div><h3 className="font-black text-slate-800">ترتيب المعلمين</h3><p className="text-xs text-slate-500">اسحب وغير الترتيب كما تريد</p></div>
                    </div>
                    <button onClick={() => setShowFsSortModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={18} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                    {fsPendingOrder.map((tid, idx) => {
                        const t = teachers.find(t => t.id === tid); if (!t) return null;
                        return (
                            <div key={tid} draggable
                                onDragStart={e => e.dataTransfer.setData('text/plain', idx.toString())}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => {
                                    e.preventDefault();
                                    const src = parseInt(e.dataTransfer.getData('text/plain'));
                                    if (isNaN(src) || src === idx) return;
                                    const arr = [...fsPendingOrder]; const [m] = arr.splice(src, 1); arr.splice(idx, 0, m);
                                    setFsPendingOrder(arr);
                                }}
                                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-[#8779fb] cursor-move group"
                            >
                                <GripVertical size={20} className="text-slate-300 group-hover:text-[#655ac1]" />
                                <span className="w-6 h-6 rounded-lg border border-slate-300 text-[#655ac1] text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                                <p className="text-sm font-bold text-slate-800 truncate flex-1">{t.name}</p>
                            </div>
                        );
                    })}
                </div>
                <div className="p-4 border-t border-slate-100 flex gap-3">
                    <button onClick={() => setShowFsSortModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all">إلغاء</button>
                    <button onClick={() => { setFsCustomOrder(fsPendingOrder); setFsTeacherSort('custom'); setShowFsSortModal(false); }} className="flex-1 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold text-sm transition-all">اعتماد الترتيب</button>
                </div>
            </div>
        </div>
    );

    const renderFsSpecSortModal = () => (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"><Users size={18} className="text-[#655ac1]" /></div>
                        <div><h3 className="font-black text-slate-800">ترتيب التخصصات</h3><p className="text-xs text-slate-500">اسحب وغير الترتيب كما تريد</p></div>
                    </div>
                    <button onClick={() => setShowFsSpecSortModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={18} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                    {fsPendingSpecOrder.map((specId, idx) => {
                        const sp = specializationNames[specId]; if (!sp) return null;
                        return (
                            <div key={specId} draggable
                                onDragStart={e => e.dataTransfer.setData('text/plain', idx.toString())}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => {
                                    e.preventDefault();
                                    const src = parseInt(e.dataTransfer.getData('text/plain'));
                                    if (isNaN(src) || src === idx) return;
                                    const arr = [...fsPendingSpecOrder]; const [m] = arr.splice(src, 1); arr.splice(idx, 0, m);
                                    setFsPendingSpecOrder(arr);
                                }}
                                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-[#8779fb] cursor-move group"
                            >
                                <GripVertical size={20} className="text-slate-300 group-hover:text-[#655ac1]" />
                                <span className="w-6 h-6 rounded-lg border border-slate-300 text-[#655ac1] text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                                <p className="text-sm font-bold text-slate-800 truncate">{sp}</p>
                            </div>
                        );
                    })}
                </div>
                <div className="p-4 border-t border-slate-100 flex gap-3">
                    <button onClick={() => setShowFsSpecSortModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all">إلغاء</button>
                    <button onClick={() => { setFsSpecOrder(fsPendingSpecOrder); setFsTeacherSort('specialization'); setShowFsSpecSortModal(false); }} className="flex-1 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold text-sm transition-all">اعتماد الترتيب</button>
                </div>
            </div>
        </div>
    );

    if (isFullScreen && isGeneral) {
        return (
            <div className="fixed inset-0 z-[200] bg-slate-100 flex flex-col overflow-hidden" style={{direction:'rtl'}}>
                {/* Top bar */}
                <div className="bg-white shadow-sm px-6 py-4 shrink-0 z-50 border-b border-slate-200">
                    {/* Row 1: title + action buttons */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                            {type === 'general_teachers' && <Users size={22} style={{color: C_BG}} />}
                            {type === 'general_waiting'  && <CalendarClock size={22} style={{color: C_BG}} />}
                            {type === 'general_classes'  && <LayoutGrid size={22} style={{color: C_BG}} />}
                            <div>
                                <h2 className="text-xl font-black text-slate-800 leading-tight">{titleMap[type]}</h2>
                                <div className="h-1 w-10 rounded-full mt-0.5" style={{background: C_BG}}></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="inline-flex items-center rounded-xl border border-slate-300 p-1 bg-white" role="group">
                                <button
                                    type="button"
                                    onClick={() => { changeDensity('overview'); setSelectedGeneralDays([]); }}
                                    className="px-3.5 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95"
                                    style={density === 'overview' ? {background:'#655ac1', color:'#fff', boxShadow:'0 2px 8px rgba(101,90,193,0.25)'} : {background:'transparent', color:'#64748b'}}
                                >
                                    كامل الجدول
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { changeDensity('expanded'); setSelectedGeneralDays([]); }}
                                    className="px-3.5 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95"
                                    style={density === 'expanded' ? {background:'#655ac1', color:'#fff', boxShadow:'0 2px 8px rgba(101,90,193,0.25)'} : {background:'transparent', color:'#64748b'}}
                                >
                                    تكبير الجدول
                                </button>
                            </div>
                            {type === 'general_teachers' && onUpdateSettings && (
                                <>
                                    {isFullScreenEditMode && (
                                        <button
                                            onClick={cancelFullScreenEditMode}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all hover:bg-slate-50 active:scale-95"
                                            style={{color:'#64748b', borderColor:'#e2e8f0'}}
                                        >
                                            <span>إلغاء</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={toggleFullScreenEditMode}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all hover:bg-slate-50 active:scale-95"
                                        style={isFullScreenEditMode
                                            ? {background:'#655ac1', color:'#fff', border:'1px solid #655ac1'}
                                            : {color:'#64748b', borderColor:'#e2e8f0'}}
                                    >
                                        <span>{isFullScreenEditMode ? 'حفظ' : 'تعديل'}</span>
                                    </button>
                                </>
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

                    {(type === 'general_teachers' || type === 'general_waiting') && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            {renderGeneralTeacherControlCards(true)}
                        </div>
                    )}
                    {onDeleteAllWaiting && (() => {
                        const wCount = Object.values(settings.timetable || {}).filter((s: any) => s?.type === 'waiting').length;
                        return wCount > 0 ? (
                            <div className="mt-3 flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
                                        <AlertTriangle size={16} className="text-amber-600" />
                                    </div>
                                    <p className="text-sm font-bold text-amber-800 leading-snug">
                                        يوجد <span className="font-black text-amber-900">{wCount}</span> حصة انتظار موزعة في الجدول — يمكنك حذفها جميعاً إذا أردت إعادة التوزيع
                                    </p>
                                </div>
                                <button
                                    onClick={() => setConfirmDeleteAllWaiting(true)}
                                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-sm shadow-rose-200 transition-all active:scale-95"
                                >
                                    <Trash2 size={13} />
                                    حذف جميع حصص الانتظار
                                </button>
                            </div>
                        ) : null;
                    })()}
                </div>
                <div className="flex-1 overflow-hidden p-4 flex flex-col min-h-0">
                    <div className="bg-white rounded-xl shadow-xl flex-1 p-4 flex flex-col min-h-0 overflow-hidden">
                        {renderGeneralTable()}
                    </div>
                </div>
                {renderFloatingSwapNotice('z-[260]')}
                {editModeToast && (
                    <div className="fixed top-6 left-1/2 z-[280] -translate-x-1/2 rounded-2xl border border-amber-200 bg-white px-5 py-3 shadow-2xl shadow-amber-200/40">
                        <div className="flex items-center gap-3 text-amber-600">
                            <AlertTriangle size={18} />
                            <span className="text-sm font-black">{editModeToast}</span>
                        </div>
                    </div>
                )}
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
                {showFsSortModal && renderFsSortModal()}
                {showFsSpecSortModal && renderFsSpecSortModal()}

                {waitingDeleteKey && (
                    <div className="fixed inset-0 z-[320] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" dir="rtl">
                        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95">
                            <div className="flex items-center justify-between p-5 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                                        <AlertTriangle size={20} className="text-rose-500" />
                                    </div>
                                    <h3 className="font-black text-slate-800">حذف حصة الانتظار</h3>
                                </div>
                                <button onClick={() => setWaitingDeleteKey(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="p-5 text-sm text-slate-600 font-medium leading-relaxed">
                                هل تريد حذف هذه الحصة؟ لا يمكن التراجع عن هذا الإجراء.
                            </div>
                            <div className="px-5 pb-5 flex gap-3">
                                <button
                                    onClick={() => setWaitingDeleteKey(null)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={() => {
                                        if (!waitingDeleteKey || !onUpdateSettings) return;
                                        const newTimetable = { ...settings.timetable };
                                        delete newTimetable[waitingDeleteKey];
                                        onUpdateSettings({ ...settings, timetable: newTimetable });
                                        setWaitingDeleteKey(null);
                                    }}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors"
                                >
                                    حذف
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {confirmDeleteAllWaiting && (
                    <div className="fixed inset-0 z-[340] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" dir="rtl">
                        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
                            <div className="flex items-center justify-between p-6 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                                        <AlertTriangle size={22} className="text-rose-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-slate-800">حذف جميع حصص الانتظار</h3>
                                        <p className="text-sm font-bold text-slate-500 mt-0.5">سيتم إزالة جميع حصص الانتظار من الجدول.</p>
                                    </div>
                                </div>
                                <button onClick={() => setConfirmDeleteAllWaiting(false)} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 text-sm font-semibold leading-7 text-slate-600">
                                هذا الإجراء سيحذف جميع حصص الانتظار الموزعة في الجدول نهائيًا ولا يمكن التراجع عنه.
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setConfirmDeleteAllWaiting(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-black text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={() => {
                                        setConfirmDeleteAllWaiting(false);
                                        onDeleteAllWaiting?.();
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
    }

    return (
        <div className="bg-white font-sans w-full relative p-2" style={{direction:'rtl'}}>
            {/* Inline Header — general views only */}
            {isGeneral && !showInlineTeacherHeaderCards && (
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
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border transition-all active:scale-95 ${
                                type === 'general_teachers'
                                    ? 'bg-[#655ac1] text-white border-[#655ac1] hover:bg-[#5549b0] shadow-md shadow-[#655ac1]/25'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#655ac1]/5'
                            }`}>
                            <Maximize2 size={14}/>
                            <span>{type === 'general_teachers' ? (fullscreenButtonLabel ?? 'فتح الجدول للتعديل') : 'معاينة'}</span>
                        </button>
                    </div>
                </div>
            )}
            {showInlineTeacherHeaderCards && (
                <div className="mb-5 px-1 print:hidden space-y-3">
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
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border transition-all active:scale-95 ${
                                type === 'general_teachers'
                                    ? 'bg-[#655ac1] text-white border-[#655ac1] hover:bg-[#5549b0] shadow-md shadow-[#655ac1]/25'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#655ac1]/5'
                            }`}>
                            <Maximize2 size={14}/>
                            <span>{type === 'general_teachers' ? (fullscreenButtonLabel ?? 'فتح الجدول للتعديل') : 'معاينة'}</span>
                        </button>
                    </div>
                    {renderGeneralTeacherControlCards()}
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
            {showFsSortModal && renderFsSortModal()}
            {showFsSpecSortModal && renderFsSpecSortModal()}

            {/* تأكيد حذف حصة الانتظار */}
            {waitingDeleteKey && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" dir="rtl">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                                    <AlertTriangle size={20} className="text-rose-500" />
                                </div>
                                <h3 className="font-black text-slate-800">حذف حصة الانتظار</h3>
                            </div>
                            <button onClick={() => setWaitingDeleteKey(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 text-sm text-slate-600 font-medium leading-relaxed">
                            هل تريد حذف هذه الحصة؟ لا يمكن التراجع عن هذا الإجراء.
                        </div>
                        <div className="px-5 pb-5 flex gap-3">
                            <button
                                onClick={() => setWaitingDeleteKey(null)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={() => {
                                    if (!waitingDeleteKey || !onUpdateSettings) return;
                                    const newTimetable = { ...settings.timetable };
                                    delete newTimetable[waitingDeleteKey];
                                    onUpdateSettings({ ...settings, timetable: newTimetable });
                                    setWaitingDeleteKey(null);
                                }}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors"
                            >
                                حذف
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InlineScheduleView;
