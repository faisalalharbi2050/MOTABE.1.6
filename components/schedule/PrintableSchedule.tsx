import React from 'react';
import { ScheduleSettingsData, Teacher, ClassInfo, Subject, SchoolInfo, TimetableSlot, Specialization } from '../../types';

interface PrintableScheduleProps {
    type: 'general_teachers' | 'general_classes' | 'individual_teacher' | 'individual_class' | 'general_waiting';
    settings: ScheduleSettingsData;
    teachers: Teacher[];
    classes: ClassInfo[];
    subjects: Subject[];
    specializations?: Specialization[];
    targetId?: string;
    schoolInfo: SchoolInfo;
    onClose: () => void;
    /** Base font size in px (8-16). Applies proportional zoom. Default: 11 */
    fontSize?: number;
    /** Render in black & white mode (no coloured backgrounds) */
    blackAndWhite?: boolean;
    /** Hide internal approval/signature footer for parent-facing shared copies */
    hideSignature?: boolean;
    /** Optional send timestamp used in shared links instead of local print time */
    sentAt?: string;
}

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const MAX_PERIODS = 7;

const PrintableSchedule: React.FC<PrintableScheduleProps> = ({
    type, settings, teachers, classes, subjects, specializations, targetId, schoolInfo,
    fontSize = 11, blackAndWhite = false, hideSignature = false, sentAt
}) => {
    const zoomFactor = fontSize / 11;
    const subjectName  = (id: string) => settings.subjectAbbreviations?.[id] || subjects.find(s => s.id === id)?.name || '';
    const teacherName  = (id: string) => teachers.find(t => t.id === id)?.name || '';
    const className    = (id: string) => { const c = classes.find(cl => cl.id === id); return c ? (c.name || `${c.grade}/${c.section}`) : ''; };

    // ── School meta ──────────────────────────────────────────
    const schoolName      = schoolInfo.schoolName || '';
    const principal       = schoolInfo.principal  || '';
    const currentSemester = schoolInfo.semesters?.find(s => s.id === schoolInfo.currentSemesterId) || schoolInfo.semesters?.[0];
    const academicYear    = schoolInfo.academicYear || '';
    const semesterName    = currentSemester?.name || '';
    const calendarType    = currentSemester?.calendarType || 'hijri';

    const effectiveDate = sentAt ? new Date(sentAt) : new Date();
    const printDate = calendarType === 'hijri'
        ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { dateStyle: 'long' }).format(effectiveDate)
        : new Intl.DateTimeFormat('ar-EG', { dateStyle: 'long' }).format(effectiveDate);

    // ── Lookup helpers using timetable key format: "teacherId-day-period" ──
    const { timetable } = settings;

    const getTeacherSlot   = (teacherId: string, day: string, period: number): TimetableSlot | undefined => 
        (timetable as Record<string, TimetableSlot>)?.[`${teacherId}-${day}-${period}`];

    const classIndex: Record<string, TimetableSlot> = {};
    if (timetable) {
        Object.entries(timetable as Record<string, TimetableSlot>).forEach(([key, slot]: [string, TimetableSlot]) => {
            const parts = key.split('-');
            const period = parseInt(parts[parts.length - 1]);
            const day    = parts.slice(1, parts.length - 1).join('-');
            if (slot.classId) {
                classIndex[`${slot.classId}-${day}-${period}`] = slot;
            }
        });
    }

    // ── Waiting quota calculation (mirrors InlineScheduleView) ───────────
    const getWaitingQuota = (teacher: Teacher): number => {
        if (teacher.waitingQuota !== undefined) return teacher.waitingQuota;
        const isManualMode = settings.substitution?.method === 'manual';
        if (isManualMode) {
            const maxQ = settings.substitution?.maxTotalQuota ?? 24;
            return Math.max(0, maxQ - (teacher.quotaLimit || 0));
        }
        return 0;
    };

    // ── Cell renderer ────────────────────────────────────────
    const renderCell = (day: string, period: number, rowId: string) => {
        if (!timetable) return null;

        if (type === 'general_teachers') {
            const slot = getTeacherSlot(rowId, day, period);
            if (!slot) return null;
            return (
                <div className="text-center">
                    <div className="font-bold text-[10px] break-words" style={{color:'#a59bf0'}}>{className(slot.classId || '')}</div>
                    <div className="text-[9px] font-bold text-slate-600">{subjectName(slot.subjectId || '')}</div>
                </div>
            );
        }
        if (type === 'general_classes') {
            const slot = classIndex[`${rowId}-${day}-${period}`];
            if (!slot) return null;
            return (
                <div className="text-center">
                    <div className="font-bold text-[10px] truncate" style={{color:'#a59bf0'}}>{subjectName(slot.subjectId || '')}</div>
                    <div className="text-[9px] font-bold text-slate-600 break-words">{teacherName(slot.teacherId)}</div>
                </div>
            );
        }
        if (type === 'general_waiting') {
            const slot = getTeacherSlot(rowId, day, period);
            if (!slot) return null;
            if (slot.isSubstitution) {
                return (
                    <div className="text-center h-full w-full flex flex-col justify-center items-center" style={{background:'#f4f2ff'}}>
                        <div className="text-[9px] font-bold" style={{color:'#a59bf0'}}>انتظار</div>
                    </div>
                );
            }
            return null;
        }
        if (type === 'individual_teacher' && rowId === targetId) {
            const slot = getTeacherSlot(rowId, day, period);
            if (!slot) return null;
            const isWaitingSlot = slot.isSubstitution || slot.type === 'waiting';
            const slotSubtitle = isWaitingSlot
                ? (slot.subjectId ? `انتظار • ${subjectName(slot.subjectId || '')}` : 'انتظار')
                : subjectName(slot.subjectId || '');
            return (
                <div className="text-center h-full w-full flex flex-col justify-center items-center">
                    <div className="font-bold text-sm break-words mb-1" style={{color:'#a59bf0'}}>{className(slot.classId || '')}</div>
                    <div className="text-[11px] font-bold text-slate-600">{slotSubtitle}</div>
                </div>
            );
        }
        if (type === 'individual_class' && rowId === targetId) {
            const slot = classIndex[`${rowId}-${day}-${period}`];
            if (!slot) return null;
            return (
                <div className="text-center h-full w-full flex flex-col justify-center items-center">
                    <div className="font-bold text-sm break-words mb-1" style={{color:'#a59bf0'}}>{subjectName(slot.subjectId || '')}</div>
                    <div className="text-[11px] font-bold text-slate-600">{teacherName(slot.teacherId)}</div>
                </div>
            );
        }
        return null;
    };

    // ── Rows ─────────────────────────────────────────────────
    let rowsToRender: Array<{ id: string; name: string }> = [];
    if (type === 'general_classes') {
        rowsToRender = [...classes]
            .sort((a, b) => a.grade !== b.grade ? a.grade - b.grade : (a.section || 0) - (b.section || 0))
            .map(c => ({ id: c.id, name: c.name || `${c.grade}/${c.section}` }));
    } else if (type === 'general_teachers' || type === 'general_waiting') {
        rowsToRender = [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(t => ({ id: t.id, name: t.name }));
    } else if (type === 'individual_teacher') {
        const t = teachers.find(t => t.id === targetId);
        if (t) rowsToRender = [{ id: t.id, name: t.name }];
    } else if (type === 'individual_class') {
        const c = classes.find(c => c.id === targetId);
        if (c) rowsToRender = [{ id: c.id, name: c.name || `${c.grade}/${c.section}` }];
    }

    const isIndividual = type.startsWith('individual_');
    const C_BG      = '#a59bf0'; // purple
    const C_BG_SOFT = '#f4f2ff'; // light purple
    const C_BORDER  = '#94a3b8'; // slate-400 – normal dividers
    const C_DAY_SEP = '#64748b'; // slate-500 – day separators / outer border
    const C_STRONG_SEP = '#334155'; // slate-700 – strong separator

    const renderIndividualLayout = () => {
        const row = rowsToRender[0];
        if (!row) return null;
        const isT = type === 'individual_teacher';
        const t   = isT ? teachers.find(t => t.id === row.id) : null;
        const c   = !isT ? classes.find(c => c.id === row.id) : null;

        return (
            <div className="w-full flex flex-col bg-white" style={{direction:'rtl', border:'2px solid '+C_DAY_SEP, borderRadius:'12px', overflow:'hidden', zoom: `${zoomFactor}`}}>

                {/* ── School header ── */}
                <div className="flex justify-between items-center px-5 py-3 border-b" style={{borderColor:C_BORDER}}>
                    <div>
                        <div className="text-base font-black text-slate-800">{schoolName}</div>
                        <div className="text-xs text-slate-500 font-semibold">{academicYear}{academicYear && semesterName ? ' | ' : ''}{semesterName}</div>
                    </div>
                    <div className="text-xs text-slate-400">تاريخ الطباعة: {printDate}</div>
                </div>

                {/* ── Info Card (matches inline gradient design) ── */}
                <div className="px-5 py-5 relative"
                    style={{
                        background:'linear-gradient(135deg, #5b50b8 0%, #7c6dd6 60%, #655ac1 100%)',
                        boxShadow:'0 10px 30px rgba(101,90,193,0.35)'
                    }}>
                    <div className="flex items-center gap-5 flex-wrap">
                        {/* Name + spec */}
                        <div className="flex-1 min-w-0 text-right">
                            <div className="text-white/70 text-xs font-semibold mb-0.5">
                                {isT ? 'المعلم' : 'الفصل'}
                            </div>
                            <div className="text-white font-black text-xl leading-tight truncate" dir={isT ? 'rtl' : 'ltr'} style={{textAlign:'right'}}>
                                {isT ? (t?.name || '—') : row.name}
                            </div>
                            {isT && t && (
                                <div className="text-white/60 text-xs font-medium mt-0.5">
                                    {specializations?.find(s => s.id === t.specializationId)?.name
                                        || subjects.find(s => s.id === t.assignedSubjectId)?.name
                                        || t.specializationId
                                        || '—'}
                                </div>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap gap-2 shrink-0">
                            <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm min-w-[68px]">
                                <span className="text-white/60 text-[10px] font-semibold leading-none mb-1">
                                    {isT ? 'نصاب الحصص' : 'عدد الحصص'}
                                </span>
                                <span className="text-white font-black text-xl leading-none">
                                    {isT ? (t?.quotaLimit || 0) : (c ? Object.values(timetable as Record<string, any>).filter(s => s.classId === c.id && s.type === 'lesson').length : 0)}
                                </span>
                            </div>
                            {isT && t && (
                                <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm min-w-[68px]">
                                    <span className="text-white/60 text-[10px] font-semibold leading-none mb-1">نصاب الانتظار</span>
                                    <span className="text-white font-black text-xl leading-none">{getWaitingQuota(t)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="rounded-b-xl overflow-hidden border-2 m-4"
                    style={{borderColor:'#e0dcfb', boxShadow:'0 4px 20px rgba(101,90,193,0.10)'}}>
                <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="py-3 px-4 font-black text-sm text-center"
                                style={{minWidth:'80px', background:'linear-gradient(135deg,#655ac1,#7c6dd6)', color:'#fff',
                                    borderBottom:'2px solid #5b50b8', borderLeft:'2px solid #5b50b8'}}>
                                اليوم
                            </th>
                            {Array.from({length:MAX_PERIODS}).map((_,i)=>(
                                <th key={i} className="py-3 px-2 font-bold text-sm text-center"
                                    style={{background:'#f4f2ff', color:'#655ac1',
                                        borderBottom:'2px solid #5b50b8', borderLeft:'1px solid #e0dcfb'}}>
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 font-black text-sm shadow-sm"
                                          style={{borderColor:'#a59bf0', color:'#655ac1'}}>
                                        {i+1}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {DAYS.map((day, di)=>{
                            const dayCode = ['sunday','monday','tuesday','wednesday','thursday'][di];
                            const isEvenRow = di % 2 === 0;
                            return (
                                <tr key={day}>
                                    <td className="py-3 px-3 font-black text-sm text-center"
                                        style={{minWidth:'80px', height:'76px',
                                            background: isEvenRow ? '#f4f2ff' : '#ece9ff',
                                            color:'#655ac1', borderLeft:'2px solid #c4bcf7',
                                            borderBottom:'1px solid #e0dcfb'}}>
                                        {day}
                                    </td>
                                    {Array.from({length:MAX_PERIODS}).map((_,pi)=>{
                                        const slot = isT
                                            ? getTeacherSlot(row.id, dayCode, pi+1)
                                            : classIndex[`${row.id}-${dayCode}-${pi+1}`];
                                        const isWaiting = isT && slot && (slot.isSubstitution || (slot as any).type==='waiting');
                                        const slotSubtitle = isWaiting
                                            ? (slot?.subjectId ? `انتظار • ${subjectName(slot.subjectId)}` : 'انتظار')
                                            : subjectName(slot?.subjectId || '');
                                        return (
                                            <td key={pi}
                                                style={{height:'76px', minWidth:'100px',
                                                    background: isEvenRow ? '#fafafe' : '#f7f6ff',
                                                    borderLeft:'1px solid #e0dcfb',
                                                    borderBottom:'1px solid #e0dcfb',
                                                    padding:'6px 5px', verticalAlign:'middle'}}>
                                                {!slot ? (
                                                    <div className="w-full h-full rounded-xl border-2 border-dashed flex items-center justify-center"
                                                         style={{borderColor:'#d1cdf4', background:'transparent', minHeight:'56px'}}>
                                                        <span className="text-[10px] font-bold" style={{color:'#c4bcf7'}}>—</span>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full rounded-xl border flex flex-col items-center justify-center px-2 gap-1"
                                                         style={{background:'#f0edff', borderColor:'#c4bcf7', minHeight:'56px'}}>
                                                        {isT ? <>
                                                            <span className="font-black text-sm leading-tight text-center w-full truncate"
                                                                  style={{color:'#4f46e5'}}>{className(slot.classId||'')}</span>
                                                            <span className="text-[11px] font-semibold leading-tight text-center w-full truncate"
                                                                  style={{color:'#7c6dd6'}}>{slotSubtitle}</span>
                                                        </> : <>
                                                            <span className="font-black text-sm leading-tight text-center w-full truncate"
                                                                  style={{color:'#4f46e5'}}>{subjectName(slot.subjectId||'')}</span>
                                                            <span className="text-[11px] font-semibold leading-tight text-center w-full truncate"
                                                                  style={{color:'#7c6dd6'}}>{teacherName(slot.teacherId)}</span>
                                                        </>}
                                                    </div>
                                                )}
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

                {/* ── Footer ── */}
                <div className="flex justify-between items-end px-5 py-3 border-t" style={{borderColor:C_BORDER, display: hideSignature ? 'none' : undefined}}>
                    <div className="text-center">
                        <div className="text-xs font-bold text-slate-600 mb-3">مدير المدرسة{principal ? `: ${principal}` : ''}</div>
                        <div className="border-t pt-1 w-32 text-[10px] text-slate-400 text-center" style={{borderColor:C_BORDER}}>التوقيع</div>
                    </div>
                </div>
            </div>
        );
    };

    if(isIndividual) return renderIndividualLayout();

    /* ── GENERAL TABLE RENDER (Existing Logic Updated) ── */
    const titleMap: Record<string, string> = {
        general_teachers:   'الجدول العام للمعلمين',
        general_classes:    'الجدول العام للفصول',
        general_waiting:    'الجدول العام للانتظار',
        individual_teacher: `جدول المعلم: ${teacherName(targetId || '')}`,
        individual_class:   `جدول الفصل: ${className(targetId || '')}`,
    };

    return (
        <div className="bg-white text-black font-sans" style={{ direction: 'rtl', zoom: `${zoomFactor}` }}>

            {/* ── Page Header ── */}
            <div className="text-center mb-4 pb-3 border-b-2 border-gray-400">
                {schoolName && (
                    <h1 className="text-xl font-black mb-1">{schoolName}</h1>
                )}
                {(academicYear || semesterName) && (
                    <p className="text-sm text-gray-600 font-bold">
                        {academicYear && `العام الدراسي: ${academicYear}`}
                        {academicYear && semesterName && ' | '}
                        {semesterName && `الفصل: ${semesterName}`}
                    </p>
                )}
                <h2 className="text-lg font-black mt-2">{titleMap[type]}</h2>
            </div>

            {/* ── Table ── */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm" style={{border:'2px solid '+C_DAY_SEP, tableLayout:'fixed'}}>
                    <thead style={{ display: 'table-header-group' }}>
                        <tr>
                            <th className="p-2 w-32 font-bold max-w-[120px] text-white"
                                style={{background:C_BG, border:'1px solid '+C_BORDER}}>
                                {type === 'general_classes' ? 'الفصل' : 'المعلم'}
                            </th>
                            {DAYS.map((day,di) => (
                                <th key={day} colSpan={MAX_PERIODS} className="p-1 font-bold text-center text-white"
                                    style={{background:C_BG,
                                        borderTop:'1px solid '+C_BORDER,
                                        borderBottom:'2px solid '+C_DAY_SEP,
                                        borderLeft: di<DAYS.length-1 ? '3px solid '+C_DAY_SEP : '1px solid '+C_BORDER,
                                        borderRight:'1px solid '+C_BORDER}}>
                                    {day}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            <th className="p-1 font-bold text-white" style={{background:C_BG, border:'1px solid '+C_BORDER}}>الحصص ←</th>
                            {DAYS.map((day,di) =>
                                Array.from({ length: MAX_PERIODS }).map((_, i) => (
                                    <th key={`${day}-${i}`} className="p-1 w-10 text-center font-bold"
                                        style={{background:C_BG_SOFT, color:C_BG,
                                            borderTop:'1px solid '+C_BORDER,
                                            borderBottom:'2px solid '+C_DAY_SEP,
                                            borderLeft: (i===MAX_PERIODS-1 && di<DAYS.length-1) ? '3px solid '+C_DAY_SEP : '1px solid '+C_BORDER,
                                            borderRight:'1px solid '+C_BORDER}}>
                                        {i + 1}
                                    </th>
                                ))
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {rowsToRender.map(row => (
                            <tr key={row.id} style={{borderBottom:'1px solid '+C_BORDER, breakInside:'avoid', pageBreakInside:'avoid'}}>
                                <td
                                    className={`p-2 font-bold truncate ${isIndividual ? 'text-sm' : 'text-[11px] w-32'} max-w-[120px]`}
                                    style={{background:'#fff', border:'1px solid '+C_BORDER}}
                                    title={row.name}>
                                    <span dir={type === 'general_classes' ? 'ltr' : 'auto'}>{row.name}</span>
                                </td>
                                {DAYS.map((day,di) =>
                                    Array.from({ length: MAX_PERIODS }).map((_, i) => (
                                        <td
                                            key={`${day}-${i}`}
                                            className={`p-0 ${isIndividual ? 'h-24 w-24' : 'h-10 w-10'} overflow-hidden relative align-middle`}
                                            style={{background:'#fff',
                                                borderTop:'1px solid '+C_BORDER,
                                                borderBottom:'1px solid '+C_BORDER,
                                                borderLeft: (i===MAX_PERIODS-1 && di<DAYS.length-1) ? '3px solid '+C_DAY_SEP : '1px solid '+C_BORDER,
                                                borderRight:'1px solid '+C_BORDER}}>
                                            <div className="absolute inset-0 flex items-center justify-center p-0.5">
                                                {renderCell(day, i + 1, row.id)}
                                            </div>
                                        </td>
                                    ))
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Page Footer ── */}
            <div className="flex justify-between items-end mt-10 text-sm text-gray-700 font-bold px-2">
                {/* Left: principal signature */}
                <div className="text-right" style={{display: hideSignature ? 'none' : undefined}}>
                    <div className="mb-2">اعتماد مدير المدرسة{principal ? `: ${principal}` : ''}</div>
                    <div className="border-t border-gray-400 pt-2 w-40 text-xs text-gray-400 text-center">التوقيع</div>
                </div>
                {/* Right: print date */}
                <div className="text-xs text-gray-500">تاريخ الطباعة: {printDate}</div>
            </div>
        </div>
    );
};

export default PrintableSchedule;
