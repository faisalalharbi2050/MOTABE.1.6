import React, { useState, useRef, useEffect } from 'react';
import {
    X, Printer, Users, User, LayoutGrid, BookOpen, CalendarClock,
    FileText, AlignJustify, SlidersHorizontal, Settings2, Maximize2
} from 'lucide-react';
import { ScheduleSettingsData, Teacher, ClassInfo, Subject, SchoolInfo, Specialization } from '../../types';
import PrintableSchedule from './PrintableSchedule';

type PrintType = 'general_teachers' | 'general_classes' | 'individual_teacher' | 'individual_class' | 'general_waiting';
type PaperSize = 'A4' | 'A3';
type LayoutMode = '1' | '4' | 'custom';

interface PrintOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: ScheduleSettingsData;
    teachers: Teacher[];
    classes: ClassInfo[];
    subjects: Subject[];
    specializations?: Specialization[];
    schoolInfo: SchoolInfo;
}

const PRINT_OPTIONS: Array<{ id: PrintType; title: string; icon: React.ReactNode; desc: string }> = [
    { id: 'general_teachers',   title: 'الجدول العام للمعلمين',   desc: 'كل المعلمين في صفحة واحدة',    icon: <Users size={18} /> },
    { id: 'general_classes',    title: 'الجدول العام للفصول',     desc: 'كل الفصول في صفحة واحدة',      icon: <LayoutGrid size={18} /> },
    { id: 'general_waiting',    title: 'الجدول العام للانتظار',   desc: 'توزيع الانتظار لكل المعلمين',  icon: <CalendarClock size={18} /> },
    { id: 'individual_teacher', title: 'جدول معلم',               desc: 'جدول مستقل لكل معلم',          icon: <User size={18} /> },
    { id: 'individual_class',   title: 'جدول فصل',                desc: 'جدول مستقل لكل فصل',           icon: <BookOpen size={18} /> },
];

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
};

const buildPrintCSS = (paperSize: PaperSize, fontSize: number, safeMargins: boolean, blackAndWhite: boolean): string => {
    const margin = safeMargins ? '5mm 8mm 5mm 8mm' : '1cm';
    const bwRules = blackAndWhite ? `
        .bw-mode * { background: white !important; background-image: none !important; color: black !important; }
        .bw-mode th, .bw-mode td { border: 1px solid #333 !important; }
        .bw-mode table thead tr th { background: white !important; color: black !important; border: 2px solid #333 !important; font-weight: 900 !important; }
    ` : '';
    return `
        :root { --schedule-font: ${fontSize}px; }
        @page { size: ${paperSize} landscape; margin: ${margin}; }
        @media print {
            html, body { font-family: 'Tajawal', sans-serif !important; font-size: ${fontSize}px !important; }
            body * { visibility: hidden !important; }
            #schedule-print-root, #schedule-print-root * { visibility: visible !important; }
            #schedule-print-root { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
            .no-print, .print-toolbar { display: none !important; }
            .print-page-break { page-break-after: always; break-after: page; }
            .print-page-break:last-child { page-break-after: avoid; break-after: avoid; }
            table { table-layout: fixed !important; width: 100% !important; }
            thead { display: table-header-group !important; }
            tr { break-inside: avoid !important; }
            .schedule-item-container { break-inside: avoid !important; page-break-inside: avoid !important; }
            ${bwRules}
        }
    `;
};

/* ── Mini Preview ─────────────────────────────────────────────────────── */
const MiniPreview: React.FC<{
    type: PrintType | null; settings: ScheduleSettingsData;
    teachers: Teacher[]; classes: ClassInfo[]; subjects: Subject[]; specializations?: Specialization[]; schoolInfo: SchoolInfo;
    targetIds: string[]; fontSize: number; paperSize: PaperSize; blackAndWhite: boolean;
    layoutMode: LayoutMode; customCols: number; customRows: number;
}> = ({ type, settings, teachers, classes, subjects, specializations, schoolInfo, targetIds, fontSize, paperSize,
        blackAndWhite, layoutMode, customCols, customRows }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.3);
    const paperW = paperSize === 'A4' ? 1123 : 1587;
    const paperH = paperSize === 'A4' ? 794  : 1123;

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            const w = entries[0].contentRect.width;
            if (w > 0) setScale(w / paperW);
        });
        ro.observe(el);
        const w = el.getBoundingClientRect().width;
        if (w > 0) setScale(w / paperW);
        return () => ro.disconnect();
    }, [paperW]);

    if (!type) {
        return (
            <div className="flex flex-col items-center justify-center h-40 gap-3"
                 style={{ color: '#cbd5e1' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                     style={{ background: 'linear-gradient(135deg,#f1eeff,#ede9ff)' }}>
                    <FileText size={26} style={{ color: '#a59bf0' }} />
                </div>
                <span className="text-xs font-semibold text-slate-400">اختر نوع الجدول لعرض المعاينة</span>
            </div>
        );
    }

    const isIndividual = type.startsWith('individual_');
    // Determine grid dimensions for the preview
    const cols = !isIndividual ? 1 : layoutMode === '4' ? 2 : layoutMode === 'custom' ? customCols : 1;
    const rows = !isIndividual ? 1 : layoutMode === '4' ? 2 : layoutMode === 'custom' ? customRows : 1;
    const cellCount = cols * rows;

    // IDs to show: for general types use '__all__', for individual use the selected IDs (pad with first if needed)
    const displayIds: string[] = isIndividual
        ? Array.from({ length: cellCount }, (_, i) => targetIds[i] ?? targetIds[0] ?? '__placeholder__')
        : ['__all__'];

    return (
        <div ref={containerRef} className="relative overflow-hidden rounded-2xl bg-slate-100"
             style={{ width: '100%', paddingBottom: `${(paperH / paperW) * 100}%`,
                      border: '1.5px solid #e2e8f0' }}>
            {/* dir=ltr forces physical left=0 regardless of parent RTL context */}
            <div className="absolute inset-0" dir="ltr">
                <div style={{
                              position: 'absolute', top: 0, left: 0,
                              width: paperW, height: paperH,
                              transform: `scale(${scale})`, transformOrigin: 'top left',
                              fontFamily: "'Cairo', sans-serif", fontSize: `${fontSize}px`,
                              overflow: 'hidden', pointerEvents: 'none',
                              display: 'grid',
                              gridTemplateColumns: `repeat(${cols}, 1fr)`,
                              gridTemplateRows: `repeat(${rows}, 1fr)`,
                              gap: cols > 1 ? '4px' : '0',
                              padding: cols > 1 ? '6px' : '0',
                              boxSizing: 'border-box' }}>
                    {displayIds.map((tid, i) => (
                        <div key={i} className={blackAndWhite ? 'bw-mode overflow-hidden' : 'overflow-hidden'}
                             style={{ border: cols > 1 ? '1px solid #e2e8f0' : 'none', borderRadius: cols > 1 ? '6px' : '0' }}>
                            {tid === '__placeholder__' ? (
                                <div style={{ width: '100%', height: '100%', background: '#f8fafc',
                                              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: '#cbd5e1', fontSize: '40px', fontWeight: 900 }}>—</span>
                                </div>
                            ) : (
                                <PrintableSchedule type={type} settings={settings} teachers={teachers} classes={classes}
                                    subjects={subjects} specializations={specializations}
                                    targetId={tid === '__all__' ? undefined : tid}
                                    schoolInfo={schoolInfo} onClose={() => {}}
                                    fontSize={fontSize} blackAndWhite={blackAndWhite} />
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div className="absolute bottom-2 left-2 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm"
                 style={{ background: 'linear-gradient(135deg,#655ac1cc,#7c6dd6cc)', boxShadow: '0 2px 8px rgba(101,90,193,0.3)' }}>
                {cols > 1 ? `${cols}×${rows} جدول` : 'جدول واحد'} • {paperSize} • {fontSize}px
            </div>
        </div>
    );
};

/* ── Print Page ───────────────────────────────────────────────────────── */
const PrintPage: React.FC<{
    selectedType: PrintType; settings: ScheduleSettingsData; teachers: Teacher[]; classes: ClassInfo[];
    subjects: Subject[]; specializations?: Specialization[]; schoolInfo: SchoolInfo; targetIds: string[]; layoutMode: LayoutMode;
    customCols: number; customRows: number; paperSize: PaperSize; fontSize: number;
    safeMargins: boolean; blackAndWhite: boolean; onBack: () => void; printTypeName: string;
}> = ({ selectedType, settings, teachers, classes, subjects, specializations, schoolInfo, targetIds, layoutMode,
        customCols, customRows, paperSize, fontSize, safeMargins, blackAndWhite, onBack, printTypeName }) => {
    const styleRef = useRef<HTMLStyleElement | null>(null);
    useEffect(() => {
        if (styleRef.current) styleRef.current.remove();
        const style = document.createElement('style');
        style.id = 'schedule-print-dynamic';
        style.innerHTML = buildPrintCSS(paperSize, fontSize, safeMargins, blackAndWhite);
        document.head.appendChild(style);
        styleRef.current = style;
        return () => { style.remove(); };
    }, [paperSize, fontSize, safeMargins, blackAndWhite]);

    const isIndividual = selectedType.startsWith('individual_');
    const perPage = layoutMode === '4' ? 4 : layoutMode === 'custom' ? customCols * customRows : 1;
    const chunks  = isIndividual ? chunkArray(targetIds, perPage) : [['__all__']];
    const gridCols = layoutMode === '4' ? 2 : layoutMode === 'custom' ? customCols : 1;

    return (
        <div id="schedule-print-root" className="fixed inset-0 z-[120] bg-white overflow-auto print:overflow-hidden">
            <div className="print-toolbar no-print sticky top-0 z-20 flex items-center gap-3 px-6 py-3 bg-white border-b border-slate-100 shadow-sm"
                 style={{ fontFamily: '"Tajawal", sans-serif', direction: 'rtl' }}>
                <button onClick={onBack}
                    className="flex items-center gap-2 px-5 py-2.5 text-slate-600 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02]"
                    style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0' }}>
                    <X size={16} /> رجوع
                </button>
                <button onClick={() => window.print()}
                    className="flex items-center gap-2 px-6 py-2.5 text-white rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg,#655ac1,#7c6dd6)', boxShadow: '0 4px 16px rgba(101,90,193,0.4)' }}>
                    <Printer size={16} /> طباعة الآن
                </button>
                <span className="text-sm text-slate-400 font-medium">
                    {printTypeName} — {paperSize} — {fontSize}px{blackAndWhite && ' — أبيض وأسود'}
                </span>
            </div>
            <div className="p-8 print:p-0" style={{ fontFamily: '"Tajawal", sans-serif' }}>
                {chunks.map((chunk, ci) => (
                    <div key={ci} className={`print-page-break bg-white ${ci < chunks.length - 1 ? 'mb-12' : ''}`}
                         style={{ minHeight: '210mm', padding: safeMargins ? '5mm 8mm' : '10mm',
                                  display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: '8px' }}>
                        {chunk.map(tid => (
                            <div key={tid} className="schedule-item-container border border-slate-200 rounded-xl print:rounded-none print:border-none overflow-hidden">
                                <div className={blackAndWhite ? 'bw-mode' : ''} style={{ fontSize: `${fontSize}px` }}>
                                    <PrintableSchedule type={selectedType} settings={settings} teachers={teachers}
                                        classes={classes} subjects={subjects} specializations={specializations} targetId={tid === '__all__' ? undefined : tid}
                                        schoolInfo={schoolInfo} onClose={onBack} fontSize={fontSize} blackAndWhite={blackAndWhite} />
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ── Main Modal ───────────────────────────────────────────────────────── */
const PrintOptionsModal: React.FC<PrintOptionsModalProps> = ({
    isOpen, onClose, settings, teachers, classes, subjects, specializations, schoolInfo
}) => {
    const [selectedType,       setSelectedType]       = useState<PrintType | null>(null);
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
    const [selectedClassIds,   setSelectedClassIds]   = useState<string[]>([]);
    const [paperSize,   setPaperSize]   = useState<PaperSize>('A4');
    const [layoutMode,  setLayoutMode]  = useState<LayoutMode>('1');
    const [fontSize,    setFontSize]    = useState<number>(11);
    const [safeMargins, setSafeMargins] = useState<boolean>(true);
    const [blackAndWhite, setBlackAndWhite] = useState<boolean>(false);
    const [customCols,  setCustomCols]  = useState<number>(2);
    const [customRows,  setCustomRows]  = useState<number>(2);
    const [showPrintPage, setShowPrintPage] = useState(false);

    const needsTeachers = selectedType === 'individual_teacher';
    const needsClasses  = selectedType === 'individual_class';
    const isReady = !!(selectedType && (
        (!needsTeachers && !needsClasses) ||
        (needsTeachers && selectedTeacherIds.length > 0) ||
        (needsClasses  && selectedClassIds.length > 0)
    ));
    const printTypeName = PRINT_OPTIONS.find(p => p.id === selectedType)?.title || '';
    const toggleId = (id: string, list: string[], set: (v: string[]) => void) =>
        set(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

    if (!isOpen) return null;

    if (showPrintPage && selectedType) {
        const targetIds = needsTeachers ? selectedTeacherIds : needsClasses ? selectedClassIds : ['__all__'];
        return (
            <PrintPage selectedType={selectedType} settings={settings} teachers={teachers} classes={classes}
                subjects={subjects} specializations={specializations} schoolInfo={schoolInfo} targetIds={targetIds} layoutMode={layoutMode}
                customCols={customCols} customRows={customRows} paperSize={paperSize} fontSize={fontSize}
                safeMargins={safeMargins} blackAndWhite={blackAndWhite}
                onBack={() => setShowPrintPage(false)} printTypeName={printTypeName} />
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" dir="rtl">
            <div className="bg-white w-full flex flex-col overflow-hidden"
                 style={{ maxWidth: '980px', maxHeight: '92vh', borderRadius: '28px',
                          boxShadow: '0 40px 100px rgba(101,90,193,0.25),0 12px 32px rgba(0,0,0,0.14)',
                          fontFamily: '"Tajawal", sans-serif' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                             style={{ background: 'linear-gradient(135deg,#655ac1,#7c6dd6)',
                                      boxShadow: '0 6px 16px rgba(101,90,193,0.38), 0 1px 4px rgba(101,90,193,0.2)' }}>
                            <Printer size={22} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-800">معاينة وطباعة الجداول</h3>
                            <p className="text-sm font-bold text-slate-500 mt-0.5">خصّص إعدادات الطباعة بدقة قبل التنفيذ</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all duration-200">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-col overflow-y-auto" style={{ maxHeight: 'calc(92vh - 140px)' }}>
                    <div className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-100">

                        {/* Left: Type Selection */}
                        <div className="p-5 space-y-2 border-l border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#655ac1,#a59bf0)' }} />
                                <span className="text-sm font-semibold text-slate-700">اختر نوع الجدول</span>
                            </div>
                            {PRINT_OPTIONS.map(opt => (
                                <button key={opt.id} onClick={() => { setSelectedType(opt.id); setSelectedTeacherIds([]); setSelectedClassIds([]); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-200 text-right ${
                                        selectedType === opt.id
                                            ? 'border-[#8779fb] bg-white text-[#655ac1] shadow-md'
                                            : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:border-[#8779fb]/40 hover:bg-white hover:text-[#655ac1] hover:shadow-sm'
                                    }`}
                                    style={selectedType === opt.id ? { boxShadow: '0 4px 12px rgba(101,90,193,0.15), inset 3px 0 0 #655ac1' } : {}}>
                                    <span className="flex-1 min-w-0 font-medium text-sm text-right leading-tight">{opt.title}</span>
                                </button>
                            ))}

                            {needsTeachers && (
                                <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 mt-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-medium text-slate-500">اختر المعلم / المعلمين</p>
                                        <button
                                            onClick={() => setSelectedTeacherIds(
                                                selectedTeacherIds.length === teachers.length ? [] : teachers.map(t => t.id)
                                            )}
                                            className="text-[11px] font-medium px-2.5 py-0.5 rounded-full transition-colors"
                                            style={{ background: selectedTeacherIds.length === teachers.length ? '#655ac1' : '#ede9ff',
                                                     color: selectedTeacherIds.length === teachers.length ? 'white' : '#655ac1' }}
                                        >
                                            {selectedTeacherIds.length === teachers.length ? '✓ إلغاء الكل' : 'تحديد الكل'}
                                        </button>
                                    </div>
                                    <div className="space-y-0.5 max-h-44 overflow-y-auto">
                                        {teachers.map(t => (
                                            <label key={t.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white cursor-pointer transition-colors">
                                                <input type="checkbox" checked={selectedTeacherIds.includes(t.id)}
                                                    onChange={() => toggleId(t.id, selectedTeacherIds, setSelectedTeacherIds)}
                                                    className="w-4 h-4 rounded accent-[#655ac1]" />
                                                <span className="text-xs font-normal text-slate-700">{t.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {selectedTeacherIds.length > 0 && (
                                        <p className="text-xs font-medium mt-1.5" style={{ color: '#655ac1' }}>✓ تم اختيار {selectedTeacherIds.length} من {teachers.length} معلم</p>
                                    )}
                                </div>
                            )}

                            {needsClasses && (
                                <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 mt-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-medium text-slate-500">اختر الفصل / الفصول</p>
                                        <button
                                            onClick={() => setSelectedClassIds(
                                                selectedClassIds.length === classes.length ? [] : classes.map(c => c.id)
                                            )}
                                            className="text-[11px] font-medium px-2.5 py-0.5 rounded-full transition-colors"
                                            style={{ background: selectedClassIds.length === classes.length ? '#655ac1' : '#ede9ff',
                                                     color: selectedClassIds.length === classes.length ? 'white' : '#655ac1' }}
                                        >
                                            {selectedClassIds.length === classes.length ? '✓ إلغاء الكل' : 'تحديد الكل'}
                                        </button>
                                    </div>
                                    <div className="space-y-0.5 max-h-44 overflow-y-auto">
                                        {[...classes].sort((a,b) => a.grade !== b.grade ? a.grade-b.grade : (a.section||0)-(b.section||0)).map(c => (
                                            <label key={c.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white cursor-pointer transition-colors">
                                                <input type="checkbox" checked={selectedClassIds.includes(c.id)}
                                                    onChange={() => toggleId(c.id, selectedClassIds, setSelectedClassIds)}
                                                    className="w-4 h-4 rounded accent-[#655ac1]" />
                                                <span className="text-xs font-normal text-slate-700">{c.name || `${c.grade}/${c.section}`}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {selectedClassIds.length > 0 && (
                                        <p className="text-xs font-medium mt-1.5" style={{ color: '#655ac1' }}>✓ تم اختيار {selectedClassIds.length} من {classes.length} فصل</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right: Print Settings */}
                        <div className="p-5 space-y-5">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#7c6dd6,#a59bf0)' }} />
                                <span className="text-sm font-semibold text-slate-700">إعدادات الطباعة</span>
                            </div>

                            {/* Paper Size */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                    <FileText size={13} className="text-[#655ac1]" /> حجم الورق
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['A4','A3'] as PaperSize[]).map(size => (
                                        <button key={size} onClick={() => setPaperSize(size)}
                                            className={`flex flex-col items-center gap-2 py-3 px-4 rounded-2xl border transition-all duration-200 ${
                                                paperSize===size
                                                    ? 'border-[#8779fb] bg-white text-[#655ac1]'
                                                    : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:border-[#8779fb]/40 hover:bg-white hover:text-[#655ac1]'
                                            }`}
                                            style={paperSize===size ? { boxShadow: '0 4px 12px rgba(101,90,193,0.15)' } : {}}>
                                            <div className="border flex items-center justify-center font-semibold text-xs"
                                                 style={{ width:size==='A4'?36:48, height:size==='A4'?26:34,
                                                          borderColor:paperSize===size?'#655ac1':'#cbd5e1',
                                                          borderRadius:6, color:paperSize===size?'#655ac1':'#94a3b8',
                                                          background:paperSize===size?'#f3f0ff':'transparent' }}>
                                                {size}
                                            </div>
                                            <span className="text-xs font-medium">
                                                {size==='A4'?'210 × 297 mm':'297 × 420 mm'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Font Slider */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                        <SlidersHorizontal size={13} className="text-[#655ac1]"/> حجم خط الجدول
                                    </label>
                                    <span className="text-xs font-semibold px-3 py-0.5 rounded-full text-white min-w-[44px] text-center"
                                          style={{ background:'linear-gradient(135deg,#655ac1,#7c6dd6)',
                                                   boxShadow: '0 2px 6px rgba(101,90,193,0.3)' }}>
                                        {fontSize}px
                                    </span>
                                </div>
                                <div style={{ direction:'ltr' }}>
                                    <input type="range" min={8} max={16} step={1} value={fontSize}
                                        onChange={e => setFontSize(Number(e.target.value))}
                                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                        style={{ background:`linear-gradient(to right,#655ac1 0%,#7c6dd6 ${((fontSize-8)/8)*100}%,#e2e8f0 ${((fontSize-8)/8)*100}%,#e2e8f0 100%)`, outline:'none' }}/>
                                    <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-bold" style={{ direction:'rtl' }}>
                                        <span>16px</span><span>8px</span>
                                    </div>
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { key:'margins', label:'هوامش آمنة', sub:'5mm من الأطراف', val:safeMargins, set:setSafeMargins },
                                    { key:'bw',      label:'أبيض وأسود', sub:'توفير الحبر',    val:blackAndWhite, set:setBlackAndWhite },
                                ].map(item => (
                                    <button key={item.key} onClick={() => item.set(!item.val)}
                                        className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all duration-200 text-right ${
                                            item.val
                                                ? 'border-[#8779fb] bg-white text-[#655ac1]'
                                                : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:border-[#8779fb]/40 hover:bg-white hover:text-[#655ac1]'
                                        }`}
                                        style={item.val ? { boxShadow: '0 4px 12px rgba(101,90,193,0.15)' } : {}}>
                                        <div className="w-10 h-6 rounded-full flex items-center transition-all shrink-0"
                                             style={{ background:item.val?'linear-gradient(135deg,#655ac1,#7c6dd6)':'#e2e8f0',
                                                      padding:'2px', justifyContent:item.val?'flex-end':'flex-start',
                                                      boxShadow: item.val?'0 2px 6px rgba(101,90,193,0.3)':'none' }}>
                                            <div className="w-5 h-5 bg-white rounded-full"
                                                 style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.15)'}}/>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-medium">{item.label}</div>
                                            <div className="text-[10px] font-normal opacity-55">{item.sub}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Layout — only for individual schedules, placed after toggles */}
                            {selectedType?.startsWith('individual_') && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                    <AlignJustify size={13} className="text-[#655ac1]" /> توزيع الجداول في الصفحة
                                </label>
                                <div className="space-y-1.5">
                                    {[
                                        { id:'1',      label:'جدول واحد لكل صفحة',    icon:<Maximize2 size={14}/> },
                                        { id:'4',      label:'أربعة جداول في الصفحة', icon:<LayoutGrid size={14}/> },
                                        { id:'custom', label:'تخصيص يدوي',             icon:<Settings2 size={14}/> },
                                    ].map(opt => (
                                        <button key={opt.id} onClick={() => setLayoutMode(opt.id as LayoutMode)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 text-right ${
                                                layoutMode===opt.id
                                                    ? 'border-[#8779fb] bg-white text-[#655ac1]'
                                                    : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:border-[#8779fb]/40 hover:bg-white hover:text-[#655ac1]'
                                            }`}
                                            style={layoutMode===opt.id ? { boxShadow: '0 4px 12px rgba(101,90,193,0.15)', borderRightWidth: 3 } : {}}>
                                            <span className="shrink-0" style={{ color: layoutMode===opt.id?'#655ac1':'#94a3b8' }}>{opt.icon}</span>
                                            <span className="flex-1 text-right font-medium text-xs">{opt.label}</span>
                                        </button>
                                    ))}
                                    {layoutMode === 'custom' && (
                                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 animate-in fade-in">
                                            <label className="text-xs font-medium text-slate-500">أعمدة</label>
                                            <input type="number" min={1} max={4} value={customCols}
                                                onChange={e => setCustomCols(Math.max(1,Math.min(4,Number(e.target.value))))}
                                                className="w-14 text-center text-sm font-medium border border-slate-200 rounded-xl p-1 outline-none focus:border-[#655ac1]"
                                                style={{ fontFamily: '"Tajawal", sans-serif' }}/>
                                            <span className="text-slate-300 font-light">×</span>
                                            <label className="text-xs font-medium text-slate-500">صفوف</label>
                                            <input type="number" min={1} max={4} value={customRows}
                                                onChange={e => setCustomRows(Math.max(1,Math.min(4,Number(e.target.value))))}
                                                className="w-14 text-center text-sm font-medium border border-slate-200 rounded-xl p-1 outline-none focus:border-[#655ac1]"
                                                style={{ fontFamily: '"Tajawal", sans-serif' }}/>
                                        </div>
                                    )}
                                </div>
                            </div>
                            )}
                        </div>
                    </div>

                    {/* Live Preview */}
                    <div className="px-5 pb-5 pt-4 bg-slate-50 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#a59bf0,#c4bcf8)' }}/>
                            <span className="text-sm font-semibold text-slate-700">معاينة مباشرة</span>
                            <span className="text-[10px] text-slate-400 font-normal mr-1">— سيتغيّر الجدول فور تعديل الإعدادات</span>
                        </div>
                        <MiniPreview type={selectedType} settings={settings} teachers={teachers} classes={classes}
                            subjects={subjects} specializations={specializations} schoolInfo={schoolInfo}
                            targetIds={needsTeachers ? selectedTeacherIds : needsClasses ? selectedClassIds : ['__all__']}
                            fontSize={fontSize} paperSize={paperSize} blackAndWhite={blackAndWhite}
                            layoutMode={layoutMode} customCols={customCols} customRows={customRows}/>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
                    <button onClick={onClose}
                        className="px-6 py-3 rounded-2xl font-medium text-sm text-slate-600 transition-all hover:scale-[1.02]"
                        style={{ background:'#f1f5f9', border:'1.5px solid #e2e8f0' }}>
                        إلغاء
                    </button>
                    <button onClick={() => isReady && setShowPrintPage(true)} disabled={!isReady}
                        className="flex-1 flex items-center justify-center gap-3 py-3 rounded-2xl font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01]"
                        style={{ background:isReady?'linear-gradient(135deg,#655ac1 0%,#7c6dd6 60%,#8779fb 100%)':'#c8c4e8',
                                 boxShadow:isReady?'0 8px 28px rgba(101,90,193,0.38),0 2px 8px rgba(101,90,193,0.2)':'none' }}>
                        <Printer size={18}/>
                        {isReady ? 'معاينة وطباعة' : 'اختر نوع الجدول أولاً'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrintOptionsModal;
