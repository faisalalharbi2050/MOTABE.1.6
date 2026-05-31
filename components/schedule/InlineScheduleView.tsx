import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ScheduleSettingsData, Teacher, ClassInfo, Subject, AuditLogEntry } from '../../types';
import { Maximize2, Users, CalendarClock, LayoutGrid, Pencil, ArrowRight, CheckCircle2, Shuffle, X, GripVertical, Check, AlertTriangle, Trash2, ChevronDown, Search, Settings2 } from 'lucide-react';
import { getKey, tryMoveOrSwap, findChainSwap, SwapResult, buildRevertPatch } from '../../utils/scheduleInteractive';
import { buildTeacherShortName, generateSubjectAbbreviation } from '../../utils/nameAbbreviations';
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
        rowH: 34,
        cellPad: '1px',
        serialColW: 28,
        teacherNameColW: 66,
        classNameColW: 72,
        specColW: 36,
        quota1ColW: 34,
        quota2ColW: 32,
        periodBox: 26,
        periodCard: 22,
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
        rowH: 56,
        cellPad: '1px',
        serialColW: 40,
        teacherNameColW: 104,
        classNameColW: 112,
        specColW: 54,
        quota1ColW: 54,
        quota2ColW: 48,
        periodBox: 58,
        periodCard: 50,
        primaryTextClass: 'text-[10px]',
        secondaryTextClass: 'text-[9px]',
        waitingTextSize: '9px',
        thInfoFontSize: '12px',
        thInfoPadding: '10px 3px',
        thDayFontSize: '12px',
        thDayPadding: '10px 2px',
        thPeriodFontSize: '11px',
        thPeriodPadding: '7px 2px',
        thPeriodTopOffset: '34px',
    },
};

// Design tokens
const C_BG          = '#a59bf0'; // purple – day header bg & content text
const C_ACCENT      = '#8779fb';
const C_PRIMARY     = '#655ac1';
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

const ONE_LINE_CELL_TEXT: React.CSSProperties = {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    wordBreak: 'normal',
    overflowWrap: 'normal',
};

// إطار منقّط كهرماني — نفس تنقيط المواد غير المسندة في صفحة إسناد المواد
const UNASSIGNED_DASH_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='none' rx='8' ry='8' stroke='%23fbbf24' stroke-width='2' stroke-dasharray='8 5'/%3E%3C/svg%3E\")";

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
    /**
     * التصميم الموحّد للجدول الفردي (معلم/فصل): بطاقة بيانات بتصميم نافذة
     * قيود المعلمين (الاسم في الأعلى ثم شرائح التخصص/عدد الحصص والنصاب)،
     * خلفية رمادية خفيفة خلف بطاقات الحصص بحواف مطابقة، ونص أكبر لرأس
     * "اليوم" وأسماء الأيام. يُستخدم في التعديل والمعاينة والطباعة والإرسال.
     */
    unifiedIndividual?: boolean;
    externalDragSource?: { teacherId: string; day: string; period: number } | null;
    onExternalDragSourceChange?: (src: { teacherId: string; day: string; period: number } | null) => void;
    onDeleteAllWaiting?: () => void;
    inlineWaitingReadOnly?: boolean;
    fullscreenButtonLabel?: string;
    waitingCountPerSlot?: Record<string, number>;
    forceWaitingInteractive?: boolean;
    hideHeaderActionButton?: boolean;
    /**
     * عند تفعيله: يُسمح بإسقاط حصة فوق خانة فيها انتظار. تأخذ الحصة مكانها
     * ويُزال انتظار تلك الخانة، فيعود تلقائيًا كـ"كرت انتظار" في المخزن
     * (لأن عدد الكروت = النصاب − الموزّع). مُطفأ افتراضيًا حتى لا يتغيّر سلوك
     * الصفحات القائمة؛ تُفعّله الصفحة المطوّرة فقط.
     */
    allowLessonOverWaiting?: boolean;
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
    unifiedIndividual = false,
    externalDragSource = null,
    onExternalDragSourceChange,
    onDeleteAllWaiting,
    inlineWaitingReadOnly = false,
    fullscreenButtonLabel,
    waitingCountPerSlot = {},
    forceWaitingInteractive = false,
    hideHeaderActionButton = false,
    allowLessonOverWaiting = false,
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
    const [pendingSortChoice, setPendingSortChoice] = useState<InternalSortMode | null>(null);
    const [fsCustomOrder, setFsCustomOrder] = useState<string[]>([]);
    const [fsSpecOrder, setFsSpecOrder] = useState<string[]>([]);
    const [showFsSortModal, setShowFsSortModal] = useState(false);
    const [showFsSpecSortModal, setShowFsSpecSortModal] = useState(false);
    const [fsPendingOrder, setFsPendingOrder] = useState<string[]>([]);
    const [fsPendingSpecOrder, setFsPendingSpecOrder] = useState<string[]>([]);

    /* effective sort when fullscreen overrides props */
    const usesInternalGeneralControls = type === 'general_teachers' || type === 'general_waiting';
    const effectiveSortMode        = (isFullScreen || usesInternalGeneralControls) ? fsTeacherSort        : (teacherSortMode       ?? 'alpha');
    const effectiveCustomOrder     = (isFullScreen || usesInternalGeneralControls) ? fsCustomOrder        : (teacherCustomOrder    ?? []);
    const effectiveSpecOrder       = (isFullScreen || usesInternalGeneralControls) ? fsSpecOrder          : (specializationCustomOrder ?? []);

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
    const [openGeneralFilter, setOpenGeneralFilter] = useState<'days' | 'teachers' | 'sort' | null>(null);
    const [generalFilterPos, setGeneralFilterPos] = useState<{ top: number; right: number; width: number }>({ top: 0, right: 0, width: 288 });
    const [selectedGeneralTeacherIds, setSelectedGeneralTeacherIds] = useState<string[]>([]);
    const [teacherFilterSearch, setTeacherFilterSearch] = useState('');
    const dayFilterButtonRef = useRef<HTMLButtonElement>(null);
    const teacherFilterButtonRef = useRef<HTMLButtonElement>(null);
    const sortFilterButtonRef = useRef<HTMLButtonElement>(null);
    const fullScreenEditSnapshotRef = useRef<Record<string, any> | null>(null);
    // قياس عرض حاوية الجدول — لحساب حجم خلية التعديل تلقائياً (الفلاتر=الزوم)
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const [viewportW, setViewportW] = useState(0);
    useEffect(() => {
        const el = scrollViewportRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(entries => {
            const w = entries[0]?.contentRect?.width;
            if (w) setViewportW(Math.round(w));
        });
        ro.observe(el);
        setViewportW(Math.round(el.clientWidth));
        return () => ro.disconnect();
    }, []);
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
    // الاختصار المخزَّن وإلا توليد تلقائي — لا يسقط للاسم الكامل أبداً
    const subjDisplay = (id: string) => settings.subjectAbbreviations?.[id] || generateSubjectAbbreviation(subjName(id));
    // اسم المعلم المختصر (shortName المحفوظ وإلا مبني تلقائياً) — لا يُعرض الاسم الكامل
    const tName       = (id: string) => {
        const t = teachers.find(t => t.id === id);
        return t ? (t.shortName?.trim() || buildTeacherShortName(t.name)) : '';
    };
    const cName       = (id: string) => { const c = classes.find(c => c.id === id); return c ? (c.name || `${c.grade}/${c.section}`) : ''; };
    const tLQ  = (t: Teacher) => {
        const legacyWeeklyQuota = Number((t as any).weeklyQuota ?? 0);
        const schoolLessons = Array.isArray(t.schools)
            ? t.schools.reduce((sum, school) => sum + Number(school.lessons || 0), 0)
            : 0;
        return Number(t.quotaLimit ?? 0) || legacyWeeklyQuota || schoolLessons || 0;
    };
    const tWQ  = (t: Teacher) => {
        const directWaitingQuota = Number(t.waitingQuota ?? (t as any).waitingQuota ?? 0);
        const schoolWaiting = Array.isArray(t.schools)
            ? t.schools.reduce((sum, school) => sum + Number(school.waiting || 0), 0)
            : 0;
        const savedWaitingQuota = Math.max(directWaitingQuota, schoolWaiting);
        if (savedWaitingQuota > 0) return savedWaitingQuota;
        if (isManualMode) {
            const maxQ = (settings.substitution as any)?.maxTotalQuota || 24;
            return Math.max(0, maxQ - tLQ(t));
        }
        return 0;
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

    // شبح سحب نظيف لحصة واحدة فقط — يمنع التقاط المتصفح لخلية مجاورة في الصورة
    const setLessonDragImage = (e: React.DragEvent, primary: string, secondary: string) => {
        if (typeof document === 'undefined') return;
        const dragEl = document.createElement('div');
        dragEl.style.cssText = 'width:56px;height:46px;position:fixed;top:-1000px;left:-1000px;pointer-events:none;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:8px;background:#ffffff;border:1px solid #d1d5db;box-shadow:0 8px 18px rgba(15,23,42,0.18);padding:4px;font-family:inherit;user-select:none;overflow:hidden;';
        const top = document.createElement('div');
        top.textContent = primary;
        top.style.cssText = 'color:#111827;font-weight:900;font-size:12px;line-height:1.05;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        const bottom = document.createElement('div');
        bottom.textContent = secondary;
        bottom.style.cssText = 'color:#334155;font-weight:700;font-size:9px;line-height:1.1;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        dragEl.appendChild(top);
        dragEl.appendChild(bottom);
        document.body.appendChild(dragEl);
        e.dataTransfer.setDragImage(dragEl, 28, 23);
        window.setTimeout(() => { dragEl.remove(); }, 0);
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
    const getSortedClasses = () => classes
        .filter(c => !c.type || c.type === 'class') // استبعاد المرافق (مختبر…) من جداول الفصول
        .sort((a,b)=> a.grade!==b.grade?a.grade-b.grade:(a.section||0)-(b.section||0));

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
            return next;
        });
    };

    const cancelFullScreenEditMode = () => {
        if (fullScreenEditSnapshotRef.current && onUpdateSettings) {
            onUpdateSettings({
                ...settings,
                timetable: { ...fullScreenEditSnapshotRef.current },
            });
        }
        fullScreenEditSnapshotRef.current = null;
        setIsFullScreenEditMode(false);
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
            swapDetails: result.swapDetails,
            relatedTeacherIds: relatedIds,
            viewType: 'general',
            teacherName: primaryTeacher?.name || '',
            revert: buildRevertPatch(timetable, result.newTimetable),
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
        setLessonDragImage(e, cName(slot.classId || ''), subjDisplay(slot.subjectId || ''));
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

        // إسقاط حصة فوق خانة انتظار: نُزيل الانتظار أولًا فتُعامَل الخانة كفارغة،
        // ثم تأخذ الحصة مكانها. الانتظار المُزاح يعود تلقائيًا كرتًا في المخزن.
        const targetExistingSlot = timetable[targetKey];
        const droppingOnWaiting =
            allowLessonOverWaiting && !!targetExistingSlot && targetExistingSlot.type === 'waiting';
        const workingTimetable = droppingOnWaiting
            ? (() => { const t = { ...timetable }; delete t[targetKey]; return t; })()
            : timetable;

        const result = tryMoveOrSwap(
            workingTimetable,
            source,
            { teacherId: targetTeacherId, day: targetDay, period: targetPeriod },
            settings,
            teachers,
            classes,
            subjects
        );
        if (result.success && result.newTimetable) {
            setPendingSwap(result);
        } else {
            const chainResult = findChainSwap(
                workingTimetable,
                source,
                { teacherId: targetTeacherId, day: targetDay, period: targetPeriod },
                teachers,
                settings,
                classes,
                subjects
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

    const toggleGeneralTeacher = (teacherId: string) => {
        setSelectedGeneralTeacherIds(prev => (
            prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]
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

    const renderGeneralFilterToolbar = (compact = false) => {
        const generalDayOptions = ENGLISH_DAYS.map((key, index) => ({ key, label: ARABIC_DAYS[index] }));
        const baseTeacherOptions = type === 'general_waiting' ? teachersWithWaiting : getSortedTeachers();
        const filteredTeacherOptions = baseTeacherOptions.filter(t => t.name.toLowerCase().includes(teacherFilterSearch.trim().toLowerCase()));
        const selectedTeachersCount = selectedGeneralTeacherIds.filter(id => baseTeacherOptions.some(t => t.id === id)).length;
        const allTeacherOptionsSelected = baseTeacherOptions.length > 0 && baseTeacherOptions.every(t => selectedGeneralTeacherIds.includes(t.id));
        const daySummary = selectedGeneralDays.length === 0
            ? 'الأسبوع كاملًا'
            : selectedGeneralDays.length === 1
                ? (generalDayOptions.find(d => d.key === selectedGeneralDays[0])?.label || 'يوم محدد')
                : `${selectedGeneralDays.length} أيام محددة`;
        const teacherSummary = selectedTeachersCount === 0
            ? (type === 'general_waiting' ? 'كل معلمي الانتظار' : 'كل المعلمين')
            : selectedTeachersCount === 1
                ? (baseTeacherOptions.find(t => t.id === selectedGeneralTeacherIds[0])?.name || 'معلم محدد')
                : `${selectedTeachersCount} معلمين`;
        const sortSummary = fsTeacherSort === 'alpha' ? 'أبجدي' : fsTeacherSort === 'specialization' ? 'حسب التخصص' : 'مخصص';
        const checkboxClass = (active: boolean) => `flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
            active ? 'border-[#655ac1] bg-[#655ac1] text-white shadow-sm' : 'border-slate-300 bg-white text-transparent'
        }`;
        const menuButtonClass = "inline-flex min-w-[150px] items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-black text-slate-700 transition-all hover:border-[#655ac1]/40 hover:bg-slate-50 active:scale-[0.98]";
        const openPanel = (filter: 'days' | 'teachers' | 'sort', element: HTMLButtonElement | null, width: number) => {
            if (openGeneralFilter === filter) {
                setOpenGeneralFilter(null);
                return;
            }
            const rect = element?.getBoundingClientRect();
            if (rect && typeof window !== 'undefined') {
                setGeneralFilterPos({
                    top: rect.bottom + 8,
                    right: Math.max(12, window.innerWidth - rect.right),
                    width,
                });
            }
            setOpenGeneralFilter(filter);
        };

        const renderOptionRow = (active: boolean, label: string, onClick: () => void, hint?: string) => (
            <button
                type="button"
                onClick={onClick}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right transition-colors hover:bg-slate-50"
            >
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-slate-700">{label}</span>
                    {hint && <span className="block truncate text-[11px] font-bold text-slate-400">{hint}</span>}
                </span>
                <span className={checkboxClass(active)}>{active && <Check size={12} strokeWidth={3.5} />}</span>
            </button>
        );

        const ensureCustomOrder = () => {
            const baseIds = getSortedTeachers().map(t => t.id);
            setFsPendingOrder(fsCustomOrder.length > 0 ? fsCustomOrder : baseIds);
            setShowFsSortModal(true);
        };

        const ensureSpecOrder = () => {
            const usedIds = new Set(teachers.map(t => t.specializationId));
            const cur = fsSpecOrder.filter(id => usedIds.has(id));
            Object.keys(specializationNames).forEach(id => { if (usedIds.has(id) && !cur.includes(id)) cur.push(id); });
            setFsPendingSpecOrder(cur);
            setShowFsSpecSortModal(true);
        };

        const renderPanelContent = () => {
            if (openGeneralFilter === 'days') {
                return (
                    <>
                        <div className="border-b border-slate-100 px-4 py-3">
                            <p className="text-sm font-black text-slate-800">اختر أيام العرض</p>
                        </div>
                        <div className="p-2.5">
                            {renderOptionRow(selectedGeneralDays.length === 0, 'الأسبوع كاملًا', () => setSelectedGeneralDays([]), 'عرض جميع أيام الجدول')}
                            <div className="my-1 h-px bg-slate-100" />
                            {generalDayOptions.map(d => renderOptionRow(
                                selectedGeneralDays.includes(d.key),
                                d.label,
                                () => {
                                    setSelectedGeneralDays(prev => {
                                        if (prev.length === 0) return [d.key];
                                        const next = prev.includes(d.key) ? prev.filter(k => k !== d.key) : [...prev, d.key];
                                        return next.length === generalDayOptions.length ? [] : next;
                                    });
                                }
                            ))}
                        </div>
                    </>
                );
            }

            if (openGeneralFilter === 'teachers') {
                return (
                    <>
                        <div className="border-b border-slate-100 px-4 py-3">
                            <p className="text-sm font-black text-slate-800">تصفية المعلمين</p>
                        </div>
                        <div className="p-3 border-b border-slate-100 space-y-2.5">
                            <div className="relative">
                                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={teacherFilterSearch}
                                    onChange={e => setTeacherFilterSearch(e.target.value)}
                                    placeholder="ابحث عن معلم"
                                    className="w-full pr-9 pl-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-[#655ac1]/40 transition-all"
                                />
                            </div>
                            <div className="flex gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setSelectedGeneralTeacherIds(allTeacherOptionsSelected ? [] : baseTeacherOptions.map(t => t.id))}
                                    className={`w-full px-2 py-2 rounded-lg border text-[11px] font-black transition-all ${
                                        allTeacherOptionsSelected
                                            ? 'border-[#655ac1] bg-[#655ac1] text-white shadow-sm'
                                            : 'border-slate-300 bg-white text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white'
                                    }`}
                                >
                                    {allTeacherOptionsSelected ? 'إلغاء الكل' : 'اختيار الكل'}
                                </button>
                            </div>
                        </div>
                        <div className="max-h-72 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {filteredTeacherOptions.map(t => renderOptionRow(
                                selectedGeneralTeacherIds.includes(t.id),
                                t.name,
                                () => toggleGeneralTeacher(t.id),
                                specializationNames[t.specializationId] || undefined
                            ))}
                            {filteredTeacherOptions.length === 0 && (
                                <div className="px-3 py-8 text-center text-sm font-bold text-slate-400">لا توجد نتائج مطابقة</div>
                            )}
                        </div>
                    </>
                );
            }

            if (openGeneralFilter === 'sort') {
                return (
                    <>
                        <div className="border-b border-slate-100 px-4 py-3">
                            <p className="text-sm font-black text-slate-800">ترتيب صفوف المعلمين</p>
                        </div>
                        <div className="p-2.5">
                            {renderOptionRow(pendingSortChoice === 'alpha', 'أبجدي', () => { setFsTeacherSort('alpha'); setPendingSortChoice(null); setOpenGeneralFilter(null); })}
                            {renderOptionRow(pendingSortChoice === 'specialization', 'حسب التخصص', () => { setPendingSortChoice('specialization'); setOpenGeneralFilter(null); ensureSpecOrder(); })}
                            {renderOptionRow(pendingSortChoice === 'custom', 'مخصص', () => { setPendingSortChoice('custom'); setOpenGeneralFilter(null); ensureCustomOrder(); })}
                        </div>
                    </>
                );
            }

            return null;
        };

        return (
            <div className={`flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white ${compact ? 'px-3.5 py-3' : 'px-4 py-3.5'} shadow-sm`}>
                <div className="flex items-center gap-2 pl-2 text-slate-500">
                    <Settings2 size={18} className="text-[#655ac1]" />
                    <span className="text-sm font-black">خيارات العرض</span>
                </div>

                <div className="relative">
                    <button ref={dayFilterButtonRef} type="button" onClick={() => openPanel('days', dayFilterButtonRef.current, 288)} className={menuButtonClass}>
                        <span className="truncate">الأيام: {daySummary}</span>
                        <ChevronDown size={15} className="text-[#655ac1]" />
                    </button>
                </div>

                <div className="relative">
                    <button ref={teacherFilterButtonRef} type="button" onClick={() => openPanel('teachers', teacherFilterButtonRef.current, 320)} className={menuButtonClass}>
                        <span className="truncate">المعلمون: {teacherSummary}</span>
                        <ChevronDown size={15} className="text-[#655ac1]" />
                    </button>
                </div>

                <div className="relative">
                    <button ref={sortFilterButtonRef} type="button" onClick={() => openPanel('sort', sortFilterButtonRef.current, 288)} className={menuButtonClass}>
                        <span className="truncate">الترتيب: {sortSummary}</span>
                        <ChevronDown size={15} className="text-[#655ac1]" />
                    </button>
                </div>

                {(selectedGeneralDays.length > 0 || selectedTeachersCount > 0) && (
                    <button
                        type="button"
                        onClick={() => { setSelectedGeneralDays([]); setSelectedGeneralTeacherIds([]); setTeacherFilterSearch(''); setOpenGeneralFilter(null); }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500 transition-all hover:border-[#8779fb] hover:text-[#655ac1]"
                    >
                        <X size={13} />
                        مسح
                    </button>
                )}
                {!isFullScreen && !hideHeaderActionButton && (type === 'general_teachers' || type === 'general_waiting') && (
                    <button
                        type="button"
                        onClick={() => {
                            setIsFullScreen(true);
                            // «افتح الجدول للتعديل» يدخل وضع التعديل مباشرة (للجدول العام للمعلمين فقط)
                            if (type === 'general_teachers' && onUpdateSettings && !isFullScreenEditMode) {
                                toggleFullScreenEditMode();
                            }
                        }}
                        className="mr-auto inline-flex items-center gap-2 rounded-xl bg-[#655ac1] px-4 py-2.5 text-sm font-black text-white shadow-md shadow-[#655ac1]/20 transition-all hover:bg-[#5549b0] active:scale-[0.98]"
                    >
                        <Maximize2 size={14} />
                        <span>{type === 'general_teachers' ? (fullscreenButtonLabel ?? 'افتح الجدول للتعديل') : (fullscreenButtonLabel ?? 'معاينة')}</span>
                    </button>
                )}
                {openGeneralFilter && typeof document !== 'undefined' && createPortal(
                    <>
                        <button
                            type="button"
                            aria-label="إغلاق القائمة"
                            onClick={() => setOpenGeneralFilter(null)}
                            className="fixed inset-0 z-[298] cursor-default bg-transparent"
                        />
                        <div
                            dir="rtl"
                            className="fixed z-[310] overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-2xl animate-in slide-in-from-top-2"
                            style={{ top: generalFilterPos.top, right: generalFilterPos.right, width: generalFilterPos.width }}
                        >
                            {renderPanelContent()}
                        </div>
                    </>,
                    document.body
                )}
            </div>
        );
    };

    const renderGeneralTeacherControlCards = (compact = false) => {
        return renderGeneralFilterToolbar(compact);
    };

    /* ════════════════════════════════════════════════════
       CELL renderers  (individual table – unchanged)
    ════════════════════════════════════════════════════ */
    const renderTeacherCell = (
        teacherId: string,
        dayKey: string,
        pi: number,
        boxW: number,
        boxH: number,
        cardW: number,
        cardH: number,
        primaryTextSize: string,
        secondaryTextSize: string,
        compactEdit = false
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
        return (
            <div className="group/cell relative flex items-center justify-center mx-auto overflow-visible" style={{ width:`${boxW}px`, height:`${boxH}px`, maxWidth:'100%', maxHeight:'100%' }}>
                <div className="relative z-10 hover:z-[80] flex flex-col items-center justify-center px-0.5 gap-0 transition-all duration-200 rounded-[8px] overflow-hidden"
                 style={{background: '#ffffff', border: '1px solid #d1d5db', width:`${cardW}px`, height:`${cardH}px`, boxShadow:'0 1px 2px rgba(15,23,42,0.06)'}}>
                <span className={`font-bold leading-[1.05] text-center w-full px-0.5 ${primaryTextSize}`}
                      style={{...ONE_LINE_CELL_TEXT, color: '#111827'}}>{cls}</span>
                {!compactEdit && (
                    <span className={`font-semibold leading-[1.15] text-center w-full px-0.5 ${secondaryTextSize}`}
                          style={{...ONE_LINE_CELL_TEXT, color: '#334155'}}>{subj}</span>
                )}
                </div>
                {compactEdit && (
                    <div
                        className="pointer-events-none absolute bottom-full left-1/2 z-[120] hidden min-w-[112px] -translate-x-1/2 mb-2 flex-col items-center gap-0.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-center shadow-xl group-hover/cell:flex"
                        dir="rtl"
                    >
                        <span className="text-[15px] font-black text-slate-800 leading-tight">{cls || '—'}</span>
                        <span className="text-[13px] font-black text-[#655ac1] leading-tight">{subj || '—'}</span>
                    </div>
                )}
            </div>
        );
    };

    const renderClassCell = (
        classId: string,
        dayKey: string,
        pi: number,
        boxW: number,
        boxH: number,
        cardW: number,
        cardH: number,
        primaryTextSize: string,
        secondaryTextSize: string
    ) => {
        const slot = classSlotMap.get(classId+'-'+dayKey+'-'+(pi+1));
        if(!slot) return null;
        const subj    = subjDisplay(slot.subjectId||'');
        const teacher = tName(slot.teacherId);
        return (
            <div className="group/cell relative flex items-center justify-center mx-auto overflow-visible" style={{ width:`${boxW}px`, height:`${boxH}px`, maxWidth:'100%', maxHeight:'100%' }}>
                <div className="relative z-10 hover:z-[80] flex flex-col items-center justify-center px-0.5 gap-0 transition-all duration-200 rounded-[8px] overflow-hidden"
                 style={{background: '#ffffff', border: '1px solid #d1d5db', width:`${cardW}px`, height:`${cardH}px`, boxShadow:'0 1px 2px rgba(15,23,42,0.06)'}}>
                <span className={`font-bold leading-[1.05] text-center w-full px-0.5 ${primaryTextSize}`}
                      style={{...ONE_LINE_CELL_TEXT, color: '#111827'}}>{subj}</span>
                <span className={`font-semibold leading-[1.15] text-center w-full px-0.5 ${secondaryTextSize}`}
                      style={{...ONE_LINE_CELL_TEXT, color: '#334155'}}>{teacher}</span>
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
        const selectedTeacherSet = new Set(selectedGeneralTeacherIds);
        if(isClasses){
            getSortedClasses().forEach((c,i)=>rows.push({serial:i+1,id:c.id,name:c.name||(c.grade+'/'+c.section),quota1:classLessonCount.get(c.id)||0}));
        } else {
            const baseList = isWaiting ? teachersWithWaiting : getSortedTeachers();
            const list = selectedGeneralTeacherIds.length > 0 ? baseList.filter(t => selectedTeacherSet.has(t.id)) : baseList;
            list.forEach((t,i)=>rows.push({serial:i+1,id:t.id,name:t.shortName?.trim()||buildTeacherShortName(t.name),spec:getAbbrSpec(t.specializationId),quota1:isWaiting?tWQ(t):tLQ(t),quota2:isTeachers?tWQ(t):undefined}));
        }
        const generalDayOptions = ENGLISH_DAYS.map((key, index) => ({ key, label: ARABIC_DAYS[index] }));
        const displayedDays = generalDayOptions.filter(day => selectedGeneralDays.length === 0 || selectedGeneralDays.includes(day.key));

        /* waiting badge counts per period */
        const periodWaitingCounts: number[][] = Array.from({length:displayedDays.length}, ()=>Array(MAX_PERIODS).fill(0));
        if((isTeachers || isWaiting) && showWaitingCounts){
            const countTeachers = rows.length > 0 ? rows.map(row => ({ id: row.id })) : (isWaiting ? teachersWithWaiting : teachers);
            countTeachers.forEach(t=>{
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
        const isTeacherEditPage = isTeachers && isFullScreen && !!onUpdateSettings;
        const isCompactTeacherEdit = isTeacherEditPage;
        const isEdit = isInteractiveGeneralTeachers || isTeacherEditPage;
        const canEditNow = isTeacherEditPage && isFullScreenEditMode; // السحب يعمل في ملء الشاشة فقط
        // صفحة تعديل المعلمين تستخدم نفس تصميم المعاينة الموسّعة؛ الفرق الوحيد هو إخفاء أعمدة البيانات لتقليل التمرير.
        const tableDensity: DensityMode = isTeacherEditPage ? 'expanded' : density;
        const D = DENSITY_PRESETS[tableDensity];
        const CELL_PAD = D.cellPad; // td padding → creates the visual gap
        const hideTeacherMetaColumns = isTeacherEditPage;
        const serialColW = isCompactTeacherEdit ? 34 : D.serialColW;
        const nameColW = isClasses ? D.classNameColW : (isCompactTeacherEdit ? 86 : D.teacherNameColW);
        const specColW = (isClasses || hideTeacherMetaColumns) ? 0 : D.specColW;
        const quota1ColW = hideTeacherMetaColumns ? 0 : D.quota1ColW;
        const quota2ColW = (isTeachers && !hideTeacherMetaColumns) ? D.quota2ColW : 0;
        const dynamicPeriodColW = isCompactTeacherEdit ? 46 : D.periodBox;
        const dynamicPeriodBox  = dynamicPeriodColW;
        const dynamicPeriodBoxH = dynamicPeriodColW;
        const dynamicPeriodCard = isCompactTeacherEdit ? 40 : D.periodCard;
        const dynamicPeriodCardH = dynamicPeriodCard;
        const ROW_H = isCompactTeacherEdit ? 48 : D.rowH;
        const dynamicPrimaryTextSize = isCompactTeacherEdit ? 'text-[9px]' : D.primaryTextClass;
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
                    <div className="flex items-center justify-center" style={{width:`${dynamicPeriodBox}px`, height:`${dynamicPeriodBoxH}px`, margin:'0 auto'}}>
                        <div className="rounded-md flex items-center justify-center"
                         style={{border:'1px dashed #dde1ea', background:'#f8f9fc', width:`${dynamicPeriodCard}px`, height:`${dynamicPeriodCardH}px`}}>
                            <span style={{color:'#c8cdd8', fontSize:'9px', fontWeight:700}}>—</span>
                        </div>
                    </div>
                );
                return renderClassCell(rowId, dayKey, pi, dynamicPeriodBox, dynamicPeriodBoxH, dynamicPeriodCard, dynamicPeriodCardH, dynamicPrimaryTextSize, dynamicSecondaryTextSize);
            } else {
                const slot = timetable[rowId+'-'+dayKey+'-'+(pi+1)];
                if(!slot) return (
                    <div className="flex items-center justify-center" style={{width:`${dynamicPeriodBox}px`, height:`${dynamicPeriodBoxH}px`, margin:'0 auto'}}>
                        <div className="rounded-md flex items-center justify-center"
                         style={{border:'1px dashed #dde1ea', background: isWaiting ? '#f8fafc' : '#f8f9fc', width:`${dynamicPeriodCard}px`, height:`${dynamicPeriodCardH}px`}}>
                            <span style={{color:'#c8cdd8', fontSize:'9px', fontWeight:700}}>—</span>
                        </div>
                    </div>
                );
                if(isTeachers && (slot.type==='waiting'||slot.isSubstitution)) {
                    const slotKey = `${rowId}-${dayKey}-${pi+1}`;
                    const canEditSlot = !!onUpdateSettings && canEditWaitingNow;
                    return (
                        <div className="group/cell relative flex items-center justify-center overflow-visible" style={{width:`${dynamicPeriodBox}px`, height:`${dynamicPeriodBoxH}px`, margin:'0 auto'}}>
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
                                style={{ width:`${dynamicPeriodCard}px`, height:`${dynamicPeriodCardH}px`, cursor: canEditSlot ? 'grab' : undefined }}
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
                            <div className="group/cell relative flex items-center justify-center overflow-visible" style={{width:`${dynamicPeriodBox}px`, height:`${dynamicPeriodBoxH}px`, margin:'0 auto'}}>
                                <div style={{ width:`${dynamicPeriodCard}px`, height:`${dynamicPeriodCardH}px` }}>
                                    {renderWaitingCard({ compact: true })}
                                </div>
                            </div>
                        );
                    return (
                        <div className="flex items-center justify-center" style={{width:`${dynamicPeriodBox}px`, height:`${dynamicPeriodBoxH}px`, margin:'0 auto'}}>
                            <div className="rounded-md flex items-center justify-center"
                             style={{border:'1px dashed #dde1ea', background:'#f8fafc', width:`${dynamicPeriodCard}px`, height:`${dynamicPeriodCardH}px`}}>
                                <span style={{color:'#c8cdd8', fontSize:'9px', fontWeight:700}}>—</span>
                            </div>
                        </div>
                    );
                }
                // التعديل (ملء الشاشة): نفس بطاقة العرض، مع إمكانية السحب فقط.
                const content = renderTeacherCell(rowId, dayKey, pi, dynamicPeriodBox, dynamicPeriodBoxH, dynamicPeriodCard, dynamicPeriodCardH, dynamicPrimaryTextSize, dynamicSecondaryTextSize, isCompactTeacherEdit);
                if (isEdit && slot.type === 'lesson') {
                    return (
                        <div
                            draggable={canEditNow}
                            onDragStart={e => {
                                if (!canEditNow) {
                                    e.preventDefault();
                                    return;
                                }
                                handleGeneralSlotDragStart(e, rowId, dayKey, pi + 1);
                            }}
                            onDragEnd={canEditNow ? resetGeneralDragState : undefined}
                            style={{cursor: canEditNow ? 'grab' : undefined}}
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
        const INFO_HEADER_SEPARATOR = '#ffffff';
        const INFO_HEADER_SEPARATOR_W = 2;
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
            borderLeft: 0,
            borderRight: 0,
            boxShadow: 'none',
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
            boxShadow: `inset 0 0 0 1px #eef2f7, inset 0 -3px 0 ${C_BG}`,
        };
        const buildInfoHeaderStyle = (
            right: number,
            zIndex: number,
            options: { endOfInfoBlock?: boolean } = {}
        ): React.CSSProperties => ({
            ...thInfo,
            ...buildStickyColumnStyle(right, zIndex, C_BG),
            borderLeft: 0,
            borderRight: 0,
            boxShadow: 'none',
        });
        const renderInfoHeaderSeparator = () => (
            <span
                aria-hidden="true"
                style={{
                    position:'absolute',
                    left:0,
                    top:0,
                    bottom:0,
                    width:`${INFO_HEADER_SEPARATOR_W}px`,
                    background:INFO_HEADER_SEPARATOR,
                    pointerEvents:'none',
                    zIndex:2,
                }}
            />
        );

        return (
            <div className="w-full relative flex flex-col flex-1 min-h-0">
                <div className="mb-3 space-y-3">
                    {!showInlineTeacherHeaderCards && !isFullScreen && (isTeachers || isWaiting) && renderGeneralFilterToolbar(false)}
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
                    ref={scrollViewportRef}
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
                            <th rowSpan={2} style={{
                                ...buildInfoHeaderStyle(stickyRightOffsets.serial, 45),
                                borderTopRightRadius:`${TABLE_RADIUS}px`
                            }}>
                                م
                                {renderInfoHeaderSeparator()}
                            </th>
                            <th rowSpan={2} style={{
                                ...buildInfoHeaderStyle(stickyRightOffsets.name, 44, { endOfInfoBlock: hideTeacherMetaColumns }),
                                textAlign:'right',
                                paddingRight:'10px'
                            }}>
                                {isClasses ? 'اسم الفصل' : 'اسم المعلم'}
                                {renderInfoHeaderSeparator()}
                            </th>
                            {!isClasses && !hideTeacherMetaColumns && (
                                <th rowSpan={2} style={{
                                    ...buildInfoHeaderStyle(stickyRightOffsets.spec, 43),
                                }}>
                                    التخصص
                                    {renderInfoHeaderSeparator()}
                                </th>
                            )}
                            {quota1ColW > 0 && (
                                <th rowSpan={2} style={{
                                    ...buildInfoHeaderStyle(stickyRightOffsets.quota1, 42, { endOfInfoBlock: quota2ColW === 0 }),
                                    lineHeight:'1.4'
                                }}>
                                    <div>نصاب</div>
                                    <div style={{fontSize:'11px', opacity:0.85}}>{isClasses ? 'الحصص' : isWaiting ? 'الانتظار' : 'الحصص'}</div>
                                    {renderInfoHeaderSeparator()}
                                </th>
                            )}
                            {quota2ColW > 0 && <th rowSpan={2} style={{
                                ...buildInfoHeaderStyle(stickyRightOffsets.quota2, 41, { endOfInfoBlock: true }),
                                lineHeight:'1.4'
                            }}>
                                <div>نصاب</div>
                                <div style={{fontSize:'11px', opacity:0.85}}>الانتظار</div>
                                {renderInfoHeaderSeparator()}
                            </th>}
                            {displayedDays.map(({ label: day },di)=>(
                                <th
                                    key={day}
                                    colSpan={MAX_PERIODS}
                                    style={{
                                        ...thDay,
                                        // #2/#3: فواصل الأيام بيضاء فارغة في كل الجداول (تشمل حافة الخميس)
                                        borderLeft: `2px solid #ffffff`,
                                        borderRight: 0,
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
                                        borderLeft: (pi===MAX_PERIODS-1 && di<displayedDays.length-1) ? `3px solid #ffffff` : `1px solid ${PERIOD_DIVIDER}`,
                                        borderRight: pi === 0 ? `2px solid #ffffff` : `1px solid ${PERIOD_DIVIDER}`,
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
                                    {selectedGeneralTeacherIds.length > 0 ? 'لا توجد نتائج تطابق فلاتر المعلمين' : 'لا توجد بيانات — قم بإنشاء الجدول أولاً'}
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
                                        background: GAP_BG,
                                        verticalAlign:'middle',
                                        ...(isLastRow ? { borderBottomRightRadius:`${TABLE_RADIUS}px` } : {}),
                                        ...buildStickyColumnStyle(stickyRightOffsets.serial, 18, GAP_BG)
                                    }}>
                                        <div className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200"
                                             style={{...infoCardBase, justifyContent:'center', background: infoCardBase.background, borderColor: '#e8eaf2'}}>
                                             <span style={{color:'#94a3b8', fontSize:'9px', fontWeight:700}}>{row.serial}</span>
                                        </div>
                                    </td>
                                    {/* name */}
                                    <td style={{padding:CELL_PAD, background: GAP_BG, verticalAlign:'middle', ...buildStickyColumnStyle(stickyRightOffsets.name, 17, GAP_BG)}}>
                                        <div className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200"
                                             style={{...infoCardBase, justifyContent:'flex-start', paddingRight:'6px', paddingLeft:'3px', background: row.id === draggingTeacherRowId ? 'rgba(255,251,235,0.7)' : infoCardBase.background, borderColor: row.id === draggingTeacherRowId ? 'transparent' : '#e8eaf2', backgroundImage: row.id === draggingTeacherRowId ? UNASSIGNED_DASH_SVG : undefined}}>
                                             <div className="flex items-center justify-between gap-2 w-full">
                                                <span style={{color:'#1e293b', fontSize: isCompactTeacherEdit ? '11px' : '13px', fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', direction:'rtl', textAlign:'right', flex:1}}>{row.name}</span>
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
                                        <td style={{padding:CELL_PAD, background: GAP_BG, verticalAlign:'middle', ...buildStickyColumnStyle(stickyRightOffsets.spec, 16, GAP_BG)}}>
                                            <div className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200"
                                                 style={{...infoCardBase, background: infoCardBase.background, borderColor: '#e8eaf2'}} title={row.spec}>
                                                <span style={{color:'#64748b', fontSize:'10.5px', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{row.spec}</span>
                                            </div>
                                        </td>
                                    )}
                                    {/* quota1 */}
                                    {quota1ColW > 0 && (
                                        <td style={{padding:CELL_PAD, background: GAP_BG, verticalAlign:'middle', ...buildStickyColumnStyle(stickyRightOffsets.quota1, 15, GAP_BG)}}>
                                            <div className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200"
                                                 style={{...infoCardBase, background: infoCardBase.background, borderColor: '#e8eaf2'}}>
                                            <span style={{color: '#64748b', fontSize:'11px', fontWeight:900}}>{row.quota1}</span>
                                            </div>
                                        </td>
                                    )}
                                    {/* quota2 teachers only */}
                                    {quota2ColW > 0 && (
                                        <td style={{padding:CELL_PAD, background: GAP_BG, verticalAlign:'middle', ...buildStickyColumnStyle(stickyRightOffsets.quota2, 14, GAP_BG)}}>
                                            <div
                                                 className="group-hover/row:bg-indigo-50 group-hover/row:border-indigo-200 transition-all duration-200 relative"
                                                 style={{...infoCardBase, overflow:'visible', background: infoCardBase.background, borderColor: '#e8eaf2'}}>
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
                                                    background: hoverTarget === `${row.id}-${dayKey}-${pi+1}` ? '#f1f5f9' : GAP_BG,
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
                                                    // المعلم الهدف أثناء السحب (انتظار أو حصة): حصصه الفارغة فقط تتحوّل
                                                    // إلى مناطق إفلات بتصميم المواد غير المسندة (كهرماني منقّط بلا نص)
                                                    const isActiveDrag = draggingWaiting === 'card' || dragSource !== null;
                                                    const isAvailableForDrop =
                                                        draggingTeacherRowId === row.id &&
                                                        isActiveDrag &&
                                                        !timetable[cellKey];
                                                    if (isAvailableForDrop) {
                                                        return (
                                                            <div
                                                                className="rounded-[8px] transition-all"
                                                                style={{
                                                                    width:`${dynamicPeriodCard}px`,
                                                                    height:`${dynamicPeriodCardH}px`,
                                                                    margin:'0 auto',
                                                                    backgroundColor: isDropTarget ? 'rgba(254,243,199,0.85)' : 'rgba(255,251,235,0.4)',
                                                                    backgroundImage: UNASSIGNED_DASH_SVG,
                                                                    boxShadow: isDropTarget ? '0 0 0 2px rgba(251,191,36,0.35)' : 'none',
                                                                }}
                                                            />
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
        const GAP_BG = unifiedIndividual ? '#f4f5f9' : '#eef0f6';
        const INDIVIDUAL_HEADER_BG = C_BG;
        const INDIVIDUAL_HEADER_BORDER = '#ffffff';
        const INDIVIDUAL_HEADER_TEXT = '#ffffff';
        const ROW_H = compactIndividual ? 48 : 58;
        const CELL_PAD = '1px';
        const periodColW = compactIndividual ? 58 : 64;
        const dayColW = compactIndividual ? 58 : 70;
        const individualPeriodBox = periodColW;
        const individualPeriodCardWidth = periodColW;
        const individualPeriodCardHeight = compactIndividual ? 44 : 54;
        const individualCardInset = compactIndividual ? 2 : 3;
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
            boxShadow:'none',
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
                            padding: compactIndividual ? '3px 4px' : '4px 4px',
                            gap: compactIndividual ? '2px' : '2px',
                            overflow:'visible',
                            transition:'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                            cursor: isDragging ? 'grabbing' : undefined,
                        }}
                    >
                        <span
                            className={`w-full text-center font-black leading-tight ${compactIndividual ? 'text-[11px]' : 'text-[12px]'}`}
                            style={{color:'#111827', wordBreak:'break-word', overflowWrap:'anywhere'}}
                        >
                            {primaryText}
                        </span>
                        <span
                            className={`w-full text-center font-bold leading-tight ${compactIndividual ? 'text-[8px]' : 'text-[9px]'}`}
                            style={{color:'#334155', wordBreak:'break-word', overflowWrap:'anywhere'}}
                        >
                            {secondaryText}
                        </span>
                    </div>
                </div>
            );
        };

        return (
            <div className="w-full" style={{direction:'rtl'}}>

                {/* ── Info Card Header (موحّد): بطاقة بيانات بتصميم نافذة قيود المعلمين ── */}
                {!hideIndividualHeader && unifiedIndividual && (
                    <div className="pb-3 mb-3 border-b border-slate-200">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-black text-slate-800 truncate" dir="ltr" style={{textAlign:'right'}}>
                                    {isTeacher ? (teacher?.name||'—') : (cls?.name || (cls ? `${cls.grade}/${cls.section}` : '—'))}
                                </h3>
                                {isTeacher && (
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        {teacher && (
                                            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-transparent border border-slate-300 text-slate-600">التخصص: {specializationNames[teacher.specializationId] || 'عام'}</span>
                                        )}
                                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-transparent border border-slate-300 text-slate-600">نصاب الحصص: {teacher ? tLQ(teacher) : 0}</span>
                                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-transparent border border-slate-300 text-slate-600">نصاب الانتظار: {individualWaitingQuota}</span>
                                    </div>
                                )}
                            </div>
                            {/* الفصل: عدد الحصص في أقصى اليسار */}
                            {!isTeacher && (
                                <span className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-transparent border border-slate-300 text-slate-600">عدد الحصص: {classLessonCount.get(targetId||'')||0}</span>
                            )}
                            {showWaitingManagement && isTeacher && effectiveWaitingOk && individualRemainingWaiting > 0 && (
                                <div className="flex flex-col items-center gap-1 shrink-0">
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
                                    <span className={`font-bold ${compactIndividual ? 'text-[7px]' : 'text-[8px]'}`} style={{color:'#94a3b8'}}>اسحب للتعيين</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Info Card Header (العرض العادي) ── */}
                {!hideIndividualHeader && !unifiedIndividual && (
                    <div className={`rounded-xl relative overflow-hidden ${compactIndividual ? 'p-2.5 mb-2.5' : 'p-3 mb-3'}`}
                        style={{
                            background: GAP_BG,
                            border: '1px solid #e2e8f0',
                            boxShadow:'0 2px 8px rgba(0,0,0,0.05)'
                        }}>
                        <div className={`relative flex items-center gap-3 flex-wrap ${compactIndividual ? 'justify-between' : ''}`}>
                            <div className="flex-1 min-w-0 text-right">
                                <div
                                    className="font-black mb-0.5"
                                    style={{color:'#64748b', fontSize: compactIndividual ? '10px' : '11px'}}
                                >
                                    {isTeacher ? 'المعلم' : 'الفصل'}
                                </div>
                                <div className={`font-black leading-tight truncate ${compactIndividual ? 'text-base' : 'text-lg'}`} dir="ltr" style={{textAlign:'right', color:'#1e293b'}}>
                                    {isTeacher ? (teacher?.name||'—') : (cls?.name || (cls ? `${cls.grade}/${cls.section}` : '—'))}
                                </div>
                                {isTeacher && teacher && (
                                    <div
                                        className="font-bold mt-1 inline-flex px-2 py-0.5 rounded-md bg-white border border-slate-200"
                                        style={{color:'#64748b', fontSize: compactIndividual ? '9px' : '10px'}}
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
                                        <span className={`font-bold ${compactIndividual ? 'text-[7px]' : 'text-[8px]'}`} style={{color:'#94a3b8'}}>اسحب للتعيين</span>
                                    </div>
                                )}
                                <div className={`flex flex-col items-center rounded-lg border border-slate-200 bg-white ${compactIndividual ? 'px-2 py-1 min-w-[50px]' : 'px-3 py-1.5 min-w-[66px]'}`}>
                                    <span className={`font-bold leading-none mb-1 ${compactIndividual ? 'text-[8px]' : 'text-[10px]'}`} style={{color:'#94a3b8'}}>
                                        {isTeacher ? 'نصاب الحصص' : 'عدد الحصص'}
                                    </span>
                                    <span className={`font-black leading-none ${compactIndividual ? 'text-[14px]' : 'text-[17px]'}`} style={{color:'#64748b'}}>
                                        {isTeacher ? (teacher ? tLQ(teacher) : 0) : (classLessonCount.get(targetId||'')||0)}
                                    </span>
                                </div>
                                {isTeacher && (
                                    <div className={`flex flex-col items-center rounded-lg border border-slate-200 bg-white ${compactIndividual ? 'px-2 py-1 min-w-[50px]' : 'px-3 py-1.5 min-w-[66px]'}`}>
                                        <span className={`font-bold leading-none mb-1 ${compactIndividual ? 'text-[8px]' : 'text-[10px]'}`} style={{color:'#94a3b8'}}>نصاب الانتظار</span>
                                        <span className={`font-black leading-none ${compactIndividual ? 'text-[14px]' : 'text-[17px]'}`} style={{color:'#64748b'}}>{individualWaitingQuota}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Table ── */}
                <div className="relative" style={{borderRadius: unifiedIndividual ? '8px' : '16px', overflow:'visible', boxShadow: unifiedIndividual ? 'none' : '0 4px 16px rgba(0,0,0,0.06)', background: GAP_BG, padding: unifiedIndividual ? '4px' : undefined}}>
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
                                    fontSize: compactIndividual ? '11px' : (unifiedIndividual ? '15px' : '13px')
                                    }}>
                                    <div
                                        style={{
                                            ...headerCardBase,
                                            borderRadius: compactIndividual ? '12px' : '14px',
                                            color:INDIVIDUAL_HEADER_TEXT,
                                            fontSize: compactIndividual ? '11px' : (unifiedIndividual ? '15px' : '13px'),
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
                                                    fontSize: compactIndividual ? '10px' : '12px',
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
                                                className={`px-2 font-black text-center leading-none ${compactIndividual ? 'text-[10px]' : (unifiedIndividual ? 'text-[14px]' : 'text-[12px]')}`}
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
                                        const canDropLesson = isTeacher && interactive && onUpdateSettings && isDraggingLesson && (!isWaiting || allowLessonOverWaiting);
                                        const canDropOnWaiting = isTeacher && interactive && effectiveWaitingOk && onUpdateSettings && draggingWaiting === 'slot' && isWaiting;

                                        let cellContent = null;
                                        if (!slot) {
                                            const isDragActive = canDropWaiting || canDropLesson;
                                            const showDrop = isDragActive && isHovered;
                                            if (interactive && isDragActive) {
                                                // أثناء السحب فقط: حصة فارغة بتصميم المواد غير المسندة في صفحة الإسناد
                                                // (خلفية كهرمانية فاتحة + إطار منقّط كهرماني) — بدون أي نص
                                                cellContent = (
                                                    <div className="w-full h-full rounded-[8px] transition-all"
                                                         style={{
                                                             backgroundColor: showDrop ? 'rgba(254,243,199,0.85)' : 'rgba(255,251,235,0.4)',
                                                             backgroundImage: UNASSIGNED_DASH_SVG,
                                                             width:`calc(100% - ${individualCardInset * 2}px)`,
                                                             height:`${individualPeriodCardHeight}px`,
                                                             margin:'0 auto',
                                                             boxShadow: showDrop ? '0 0 0 2px rgba(251,191,36,0.35)' : 'none',
                                                          }} />
                                                );
                                            } else {
                                                cellContent = (
                                                    <div className="w-full h-full rounded-[8px] border flex items-center justify-center"
                                                         style={{
                                                             borderStyle: 'dashed',
                                                             borderColor: '#dde1ea',
                                                             background: '#f8f9fc',
                                                             width:`calc(100% - ${individualCardInset * 2}px)`,
                                                             height:`${individualPeriodCardHeight}px`,
                                                             margin:'0 auto',
                                                          }}>
                                                        <span className="text-[10px] font-bold" style={{color:'#cbd5e1'}}>—</span>
                                                    </div>
                                                );
                                            }
                                        } else if (isWaiting) {
                                            cellContent = (
                                                <div className="w-full h-full relative group"
                                                     style={{
                                                         width:`calc(100% - ${individualCardInset * 2}px)`,
                                                         height:`${individualPeriodCardHeight}px`,
                                                         margin:'0 auto'
                                                      }}>
                                                    {renderPlacedWaitingCard({
                                                        highlighted: (canDropOnWaiting || (canDropLesson && isDraggingLesson)) && isHovered,
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
                                                        if (!interactive || (isWaiting && !allowLessonOverWaiting)) return;
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
                                                        if (!interactive || (isWaiting && !allowLessonOverWaiting)) { e.preventDefault(); return; }
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
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[82vh] overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between border-b border-slate-100 p-6">
                    <div className="flex items-center gap-3">
                        <GripVertical size={22} className="text-[#655ac1]" />
                        <div>
                            <h3 className="text-lg font-black text-slate-800">ترتيب المعلمين</h3>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">اسحب الصفوف لتغيير ترتيب ظهور المعلمين في الجدول</p>
                        </div>
                    </div>
                    <button onClick={() => setShowFsSortModal(false)} className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-50 transition-all"><X size={18} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
                    <div className="overflow-hidden rounded-2xl border border-slate-100">
                        <table className="w-full text-right text-sm" dir="rtl">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-black text-[#655ac1] w-14 text-center">م</th>
                                    <th className="px-5 py-3 text-xs font-black text-[#655ac1]">اسم المعلم</th>
                                    <th className="px-5 py-3 text-xs font-black text-[#655ac1]">التخصص</th>
                                    <th className="px-5 py-3 text-xs font-black text-[#655ac1] w-16 text-center">ترتيب</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {fsPendingOrder.map((tid, idx) => {
                                    const t = teachers.find(t => t.id === tid); if (!t) return null;
                                    return (
                                        <tr key={tid} draggable
                                            onDragStart={e => e.dataTransfer.setData('text/plain', idx.toString())}
                                            onDragOver={e => e.preventDefault()}
                                            onDrop={e => {
                                                e.preventDefault();
                                                const src = parseInt(e.dataTransfer.getData('text/plain'));
                                                if (isNaN(src) || src === idx) return;
                                                const arr = [...fsPendingOrder]; const [m] = arr.splice(src, 1); arr.splice(idx, 0, m);
                                                setFsPendingOrder(arr);
                                            }}
                                            className="hover:bg-slate-50/60 transition-all cursor-move group"
                                        >
                                            <td className="px-5 py-3 text-center">
                                                <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 flex items-center justify-center rounded-full mx-auto">{idx + 1}</span>
                                            </td>
                                            <td className="px-5 py-3 font-bold text-slate-800">{t.name}</td>
                                            <td className="px-5 py-3 text-xs font-bold text-slate-500">{specializationNames[t.specializationId] || 'بدون تخصص'}</td>
                                            <td className="px-5 py-3 text-center"><GripVertical size={18} className="mx-auto text-slate-300 group-hover:text-[#655ac1]" /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => { setPendingSortChoice(null); setShowFsSortModal(false); }} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">إلغاء</button>
                    <button onClick={() => { setFsCustomOrder(fsPendingOrder); setFsTeacherSort('custom'); setPendingSortChoice(null); setShowFsSortModal(false); }} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#655ac1] hover:bg-[#5046a0] text-white font-black text-sm shadow-lg shadow-[#655ac1]/10 transition-all active:scale-95">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1]">
                            <Check size={13} strokeWidth={3.2} className="text-white" />
                        </span>
                        حفظ
                    </button>
                </div>
            </div>
        </div>
    );

    const renderFsSpecSortModal = () => (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[82vh] overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between border-b border-slate-100 p-6">
                    <div className="flex items-center gap-3">
                        <Users size={22} className="text-[#655ac1]" />
                        <div>
                            <h3 className="text-lg font-black text-slate-800">ترتيب التخصصات</h3>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">سيتم ترتيب المعلمين في الجدول بناءً على ترتيب التخصصات</p>
                        </div>
                    </div>
                    <button onClick={() => setShowFsSpecSortModal(false)} className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-50 transition-all"><X size={18} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
                    <div className="overflow-hidden rounded-2xl border border-slate-100">
                        <table className="w-full text-right text-sm" dir="rtl">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-black text-[#655ac1] w-14 text-center">م</th>
                                    <th className="px-5 py-3 text-xs font-black text-[#655ac1]">التخصص</th>
                                    <th className="px-5 py-3 text-xs font-black text-[#655ac1] w-28 text-center">عدد المعلمين</th>
                                    <th className="px-5 py-3 text-xs font-black text-[#655ac1] w-16 text-center">ترتيب</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {fsPendingSpecOrder.map((specId, idx) => {
                                    const sp = specializationNames[specId]; if (!sp) return null;
                                    const specCount = teachers.filter(t => t.specializationId === specId).length;
                                    return (
                                        <tr key={specId} draggable
                                            onDragStart={e => e.dataTransfer.setData('text/plain', idx.toString())}
                                            onDragOver={e => e.preventDefault()}
                                            onDrop={e => {
                                                e.preventDefault();
                                                const src = parseInt(e.dataTransfer.getData('text/plain'));
                                                if (isNaN(src) || src === idx) return;
                                                const arr = [...fsPendingSpecOrder]; const [m] = arr.splice(src, 1); arr.splice(idx, 0, m);
                                                setFsPendingSpecOrder(arr);
                                            }}
                                            className="hover:bg-slate-50/60 transition-all cursor-move group"
                                        >
                                            <td className="px-5 py-3 text-center">
                                                <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 flex items-center justify-center rounded-full mx-auto">{idx + 1}</span>
                                            </td>
                                            <td className="px-5 py-3 font-bold text-slate-800">{sp}</td>
                                            <td className="px-5 py-3 text-center">
                                                <span className="inline-block px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-700">{specCount}</span>
                                            </td>
                                            <td className="px-5 py-3 text-center"><GripVertical size={18} className="mx-auto text-slate-300 group-hover:text-[#655ac1]" /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => { setPendingSortChoice(null); setShowFsSpecSortModal(false); }} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">إلغاء</button>
                    <button onClick={() => { setFsSpecOrder(fsPendingSpecOrder); setFsTeacherSort('specialization'); setPendingSortChoice(null); setShowFsSpecSortModal(false); }} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#655ac1] hover:bg-[#5046a0] text-white font-black text-sm shadow-lg shadow-[#655ac1]/10 transition-all active:scale-95">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1]">
                            <Check size={13} strokeWidth={3.2} className="text-white" />
                        </span>
                        حفظ
                    </button>
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
                            {type === 'general_teachers' && <Users size={22} style={{color: C_PRIMARY}} />}
                            {type === 'general_waiting'  && <CalendarClock size={22} style={{color: C_PRIMARY}} />}
                            {type === 'general_classes'  && <LayoutGrid size={22} style={{color: C_PRIMARY}} />}
                            <div>
                                <h2 className="text-xl font-black text-slate-800 leading-tight">{titleMap[type]}</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* أزرار الكثافة مخفية في تعديل المعلمين (وضع واحد ثابت) */}
                            {!(type === 'general_teachers' && onUpdateSettings) && (
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
                            )}
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
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95 ${isFullScreenEditMode ? 'text-white' : 'font-bold border-2 hover:bg-slate-50'}`}
                                        style={isFullScreenEditMode
                                            ? {background:'#16a34a', boxShadow:'0 4px 12px rgba(22,163,74,0.25)'}
                                            : {color:'#64748b', borderColor:'#e2e8f0'}}
                                    >
                                        {isFullScreenEditMode && <CheckCircle2 size={16} />}
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
                            {type === 'general_teachers' && <Users size={22} style={{color: C_PRIMARY}} />}
                            {type === 'general_waiting'  && <CalendarClock size={22} style={{color: C_PRIMARY}} />}
                            {type === 'general_classes'  && <LayoutGrid size={22} style={{color: C_PRIMARY}} />}
                            <div>
                                <h2 className="text-xl font-black text-slate-800 leading-tight">{titleMap[type]}</h2>
                            </div>
                        </div>
                        {!hideHeaderActionButton && !(type === 'general_teachers' || type === 'general_waiting') && (
                        <button onClick={()=>setIsFullScreen(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border transition-all active:scale-95 ${
                                type === 'general_teachers'
                                    ? 'bg-[#655ac1] text-white border-[#655ac1] hover:bg-[#5549b0] shadow-md shadow-[#655ac1]/25'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#655ac1]/5'
                            }`}>
                            <Maximize2 size={14}/>
                            <span>{type === 'general_teachers' ? (fullscreenButtonLabel ?? 'افتح الجدول للتعديل') : 'معاينة'}</span>
                        </button>
                        )}
                    </div>
                </div>
            )}
            {showInlineTeacherHeaderCards && (
                <div className="mb-5 px-1 print:hidden space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {type === 'general_teachers' && <Users size={22} style={{color: C_PRIMARY}} />}
                            {type === 'general_waiting'  && <CalendarClock size={22} style={{color: C_PRIMARY}} />}
                            {type === 'general_classes'  && <LayoutGrid size={22} style={{color: C_PRIMARY}} />}
                            <div>
                                <h2 className="text-xl font-black text-slate-800 leading-tight">{titleMap[type]}</h2>
                            </div>
                        </div>
                        {!hideHeaderActionButton && !(type === 'general_teachers' || type === 'general_waiting') && (
                        <button onClick={()=>setIsFullScreen(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border transition-all active:scale-95 ${
                                type === 'general_teachers'
                                    ? 'bg-[#655ac1] text-white border-[#655ac1] hover:bg-[#5549b0] shadow-md shadow-[#655ac1]/25'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-[#655ac1]/5'
                            }`}>
                            <Maximize2 size={14}/>
                            <span>{type === 'general_teachers' ? (fullscreenButtonLabel ?? 'افتح الجدول للتعديل') : 'معاينة'}</span>
                        </button>
                        )}
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
