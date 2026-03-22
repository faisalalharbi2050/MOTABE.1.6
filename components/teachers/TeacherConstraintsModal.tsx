import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Teacher, Specialization, TeacherConstraint, SpecializedMeeting, ClassInfo, Phase } from '../../types';
import { Users, Search, AlertTriangle, X, Copy, Sliders, Ban, Clock, ArrowRightFromLine, ArrowLeftFromLine, Plus, Repeat, GripVertical, ChevronUp, ChevronDown, Calendar, Sparkles, Check, CheckCircle2, RotateCcw, MapPin } from 'lucide-react';
import { ValidationWarning } from '../../utils/scheduleConstraints';
import { INITIAL_SPECIALIZATIONS } from '../../constants';

// --- Constants & Helpers ---
const DAYS_AR_DEFAULT = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

function getDayLabel(d: string): string {
  if (!d) return 'يوم';
  const map: Record<string, string> = { 
    sunday:'الأحد', monday:'الإثنين', tuesday:'الثلاثاء', wednesday:'الأربعاء', thursday:'الخميس', friday:'الجمعة', saturday:'السبت' 
  };
  return map[d.toLowerCase()] ?? d;
}

// --- Component ---
interface Props {
  isOpen: boolean;
  onClose: () => void;
  teachers?: Teacher[];
  specializations?: Specialization[];
  constraints?: TeacherConstraint[];
  meetings?: SpecializedMeeting[];
  activeDays?: string[];
  periodsPerDay?: number;
  periodCounts?: Record<string, number>; // عدد الحصص لكل يوم على حدة
  warnings?: ValidationWarning[];
  classes?: ClassInfo[];
  mainSchoolName?: string;
  schoolPhasesMap?: Record<string, Phase[]>; // schoolId => phases
  onChangeConstraints: (c: TeacherConstraint[]) => void;
  onChangeMeetings: (m: SpecializedMeeting[]) => void;
}

export default function TeacherConstraintsModal({
  isOpen, onClose,
  teachers = [], specializations = [], constraints = [], meetings = [], activeDays = [], periodsPerDay = 7,
  periodCounts = {},
  warnings = [], classes = [], mainSchoolName = 'المدرسة الرئيسية', schoolPhasesMap = {}, onChangeConstraints, onChangeMeetings
}: Props) {

  // --- Safe Locals ---
  const safePeriodsCount = useMemo(() => {
    const p = Math.floor(Number(periodsPerDay)) || 7;
    return Math.max(1, Math.min(20, p));
  }, [periodsPerDay]);

  const periods = useMemo(() => Array.from({ length: safePeriodsCount }, (_, i) => i + 1), [safePeriodsCount]);
  
  const days = useMemo(() => {
    return (activeDays && activeDays.length > 0) ? activeDays.filter(Boolean) : DAYS_AR_DEFAULT;
  }, [activeDays]);

  // --- Engine: الحصة الأخيرة لكل يوم (ديناميكية) ---
  const dayLastPeriods = useMemo(() => {
    const result: Record<string, number> = {};
    days.forEach(d => {
      result[d] = Math.max(1, Math.min(20, Math.floor(Number(periodCounts[d])) || safePeriodsCount));
    });
    return result;
  }, [days, periodCounts, safePeriodsCount]);

  // --- Engine: حساب الاحتياج الكلي وتوزيع الحصص ---
  const periodEngine = useMemo(() => {
    const numClasses = classes.length;
    const numDays = days.length || 1;
    const totalNeeded = numClasses * numDays;

    const qualifiedTeachers = teachers.filter(t => (t.quotaLimit || 0) > 0);
    const numQualified = qualifiedTeachers.length;

    // الحد الأدنى من المعلمين المطلوبين = عدد الفصول
    // (كل يوم تُفتح numClasses حصة أولى في آنٍ واحد)
    const minTeachersNeeded = numClasses;
    const distributionFeasible = numQualified >= minTeachersNeeded;

    // النصيب العادل مقيَّد بأيام العمل (لا يمكن أن يتجاوز عدد الأيام)
    const rawShare = numQualified > 0 ? Math.ceil(totalNeeded / numQualified) : 0;
    const teacherShare = Math.min(rawShare, numDays);

    const totalFirst = qualifiedTeachers.reduce((sum, t) => {
      const c = constraints.find(x => x.teacherId === t.id);
      return sum + (c?.maxFirstPeriods ?? 0);
    }, 0);
    const totalLast = qualifiedTeachers.reduce((sum, t) => {
      const c = constraints.find(x => x.teacherId === t.id);
      return sum + (c?.maxLastPeriods ?? 0);
    }, 0);

    const firstDeficit = Math.max(0, totalNeeded - totalFirst);
    const lastDeficit = Math.max(0, totalNeeded - totalLast);
    const firstSurplus = Math.max(0, totalFirst - totalNeeded);
    const lastSurplus = Math.max(0, totalLast - totalNeeded);

    const firstCoverage = totalNeeded > 0 ? Math.min(100, Math.round((totalFirst / totalNeeded) * 100)) : 0;
    const lastCoverage = totalNeeded > 0 ? Math.min(100, Math.round((totalLast / totalNeeded) * 100)) : 0;

    return {
      numClasses, numDays, totalNeeded,
      numQualified, teacherShare,
      minTeachersNeeded, distributionFeasible,
      totalFirst, totalLast,
      firstDeficit, lastDeficit,
      firstSurplus, lastSurplus,
      firstCoverage, lastCoverage,
    };
  }, [classes, days, teachers, constraints]);

  // --- State ---
  const [selId, setSelId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'spec' | 'alpha'>('spec');
  // Only include specialization IDs that are actually used by teachers
  const usedSpecIds = useMemo(() => {
    const ids = Array.from(new Set(teachers.map(t => t.specializationId).filter(Boolean))) as string[];
    // Preserve order from INITIAL_SPECIALIZATIONS for known IDs, append unknowns at the end
    const ordered = INITIAL_SPECIALIZATIONS.map(s => s.id).filter(id => ids.includes(id));
    const extras = ids.filter(id => !INITIAL_SPECIALIZATIONS.some(s => s.id === id));
    return [...ordered, ...extras];
  }, [teachers]);

  const [specOrder, setSpecOrder] = useState<string[]>(() => {
    const ids = Array.from(new Set(teachers.map(t => t.specializationId).filter(Boolean))) as string[];
    const ordered = INITIAL_SPECIALIZATIONS.map(s => s.id).filter(id => ids.includes(id));
    const extras = ids.filter(id => !INITIAL_SPECIALIZATIONS.some(s => s.id === id));
    return [...ordered, ...extras];
  });

  // Sync specOrder when teachers change (add/remove)
  useEffect(() => {
    setSpecOrder(prev => {
      // Keep existing order for IDs still in use, add new ones at end, remove unused
      const kept = prev.filter(id => usedSpecIds.includes(id));
      const added = usedSpecIds.filter(id => !prev.includes(id));
      return [...kept, ...added];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedSpecIds]);
  const [showSpecPanel, setShowSpecPanel] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargets, setCopyTargets] = useState<string[]>([]);
  
  // Meeting Form & Smart Distribution
  const [mForm, setMForm] = useState({ specId: '', day: DAYS_AR_DEFAULT[0], period: 1 });
  const [distributeModal, setDistributeModal] = useState<{ teachers: string[], specId: string, day: string, period: number } | null>(null);

  // Copy Options
  const [copyOpts, setCopyOpts] = useState({
    consecutive: true,
    excluded: true,
    firstLast: true,
    earlyEntry: true,
  });
  const [copySearch, setCopySearch] = useState('');
  
  // Sections Expansions
  const [open, setOpen] = useState<Record<string, boolean>>({ c1: false, c2: false, c4: false, c5: false, c6: false, c7: false });

  // --- التوزيع التلقائي الفوري (Reactive Engine) ---
  // يُشغَّل فور فتح النافذة أو تغيّر الفصول / الأيام / المعلمين
  const prevKeyRef = useRef<string>('');
  useEffect(() => {
    if (!isOpen) return;
    const { teacherShare, numClasses, numDays, numQualified } = periodEngine;
    // مفتاح يتغيّر فقط عند تغيّر المدخلات الجوهرية
    const key = `${numClasses}|${numDays}|${numQualified}|${teacherShare}`;
    if (key === prevKeyRef.current) return; // لم تتغيّر المدخلات — لا إعادة توزيع
    prevKeyRef.current = key;
    if (numClasses === 0 || numQualified === 0) return;

    const nc = [...constraints];
    let changed = false;

    teachers.forEach(t => {
      const isExcluded = (t.quotaLimit || 0) === 0;
      const share = isExcluded ? 0 : teacherShare;
      const idx = nc.findIndex(c => c.teacherId === t.id);
      if (idx >= 0) {
        if (nc[idx].maxFirstPeriods !== share || nc[idx].maxLastPeriods !== share) {
          nc[idx] = { ...nc[idx], maxFirstPeriods: share === 0 ? undefined : share, maxLastPeriods: share === 0 ? undefined : share };
          changed = true;
        }
      } else {
        nc.push({ teacherId: t.id, maxConsecutive: 2, excludedSlots: {},
          maxFirstPeriods: share === 0 ? undefined : share,
          maxLastPeriods:  share === 0 ? undefined : share });
        changed = true;
      }
    });

    if (changed) onChangeConstraints(nc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, periodEngine.teacherShare, periodEngine.numClasses, periodEngine.numDays, periodEngine.numQualified]);

  // Early Return
  if (!isOpen) return null;

  // --- Logic Helpers ---
  const getC = (id: string): TeacherConstraint =>
    constraints.find(c => c.teacherId === id) || { teacherId: id, maxConsecutive: 2, excludedSlots: {} }; // Default changed to 2

  const updC = (tid: string, upd: Partial<TeacherConstraint>) => {
    const ex = constraints.find(c => c.teacherId === tid);
    const newConstraints = ex
      ? constraints.map(c => c.teacherId === tid ? { ...c, ...upd } : c)
      : [...constraints, { teacherId: tid, maxConsecutive: 2, excludedSlots: {}, ...upd }];
    onChangeConstraints(newConstraints);
  };

  // --- Engine: التوزيع التلقائي الكامل (زر التوزيع التلقائي) ---
  const autoDistributeFirstLast = () => {
    const { totalNeeded, numDays } = periodEngine;
    const qualifiedTeachers = teachers.filter(t => (t.quotaLimit || 0) > 0);
    if (qualifiedTeachers.length === 0) return;

    const share = Math.min(Math.ceil(totalNeeded / qualifiedTeachers.length), numDays);
    const nc = [...constraints];

    qualifiedTeachers.forEach(t => {
      const idx = nc.findIndex(c => c.teacherId === t.id);
      if (idx >= 0) {
        nc[idx] = { ...nc[idx], maxFirstPeriods: share, maxLastPeriods: share };
      } else {
        nc.push({ teacherId: t.id, maxConsecutive: 2, excludedSlots: {}, maxFirstPeriods: share, maxLastPeriods: share });
      }
    });

    teachers.filter(t => (t.quotaLimit || 0) === 0).forEach(t => {
      const idx = nc.findIndex(c => c.teacherId === t.id);
      if (idx >= 0) {
        nc[idx] = { ...nc[idx], maxFirstPeriods: undefined, maxLastPeriods: undefined };
      }
    });

    onChangeConstraints(nc);
  };

  // --- Engine: تحديث يدوي فقط للمعلم المحدد — بدون إعادة توزيع على الآخرين ---
  // شريط التغطية والنقص/الفائض يعملان تلقائياً لإظهار الوضع الحالي
  const updCFirstLast = (tid: string, type: 'first' | 'last', val: number | undefined) => {
    const nc = constraints.map(c =>
      c.teacherId === tid
        ? { ...c, ...(type === 'first' ? { maxFirstPeriods: val } : { maxLastPeriods: val }) }
        : { ...c }
    );
    if (!nc.find(c => c.teacherId === tid)) {
      nc.push({ teacherId: tid, maxConsecutive: 2, excludedSlots: {},
        ...(type === 'first' ? { maxFirstPeriods: val } : { maxLastPeriods: val }) });
    }
    onChangeConstraints(nc);
  };

  // --- Engine: حساب إتاحة المعلم للحصص الطرفية ---
  const getTeacherPeriodAvailability = (tid: string) => {
    const teacher = teachers.find(t => t.id === tid);
    if (!teacher) return { firstAvailDays: 0, lastAvailDays: 0, lastAvailByDay: {} as Record<string, number | null>, excluded: false };

    if ((teacher.quotaLimit || 0) === 0) {
      return { firstAvailDays: 0, lastAvailDays: 0, lastAvailByDay: {} as Record<string, number | null>, excluded: true };
    }

    const c = getC(tid);
    let firstAvailDays = 0;
    let lastAvailDays = 0;
    const lastAvailByDay: Record<string, number | null> = {};

    days.forEach(d => {
      const excluded = c.excludedSlots?.[d] || [];

      // الحصة الأولى (حصة رقم 1)
      if (!excluded.includes(1)) firstAvailDays++;

      // الحصة الأخيرة الديناميكية لهذا اليوم
      const lastP = dayLastPeriods[d] ?? safePeriodsCount;
      let foundLast: number | null = null;
      for (let p = lastP; p >= 1; p--) {
        if (!excluded.includes(p)) {
          foundLast = p;
          lastAvailDays++;
          break;
        }
      }
      lastAvailByDay[d] = foundLast;
    });

    return { firstAvailDays, lastAvailDays, lastAvailByDay, excluded: false };
  };

  // --- Stats ---
  const stats = (() => {
    try {
      const tc = classes.length || 0;
      const dc = days.length || 5;
      const need = tc * dc;
      const rec = Math.max(1, Math.ceil(need / (teachers.length || 1)));
      return { need, rec, tc, dc };
    } catch (e) {
      return { need: 0, rec: 5, tc: 0, dc: 5 };
    }
  })();

  // --- Filters ---
  const filteredTeachers = teachers.filter(t => {
    if (!t || !t.name) return false;
    const sName = specializations.find(s => s.id === t.specializationId)?.name
      || INITIAL_SPECIALIZATIONS.find(s => s.id === t.specializationId)?.name || '';
    const term = search.toLowerCase();
    return t.name.toLowerCase().includes(term) || sName.toLowerCase().includes(term);
  }).sort((a, b) => {
    if (sortBy === 'alpha') return a.name.localeCompare(b.name, 'ar');
    const iA = specOrder.indexOf(a.specializationId ?? '');
    const iB = specOrder.indexOf(b.specializationId ?? '');
    const valA = iA === -1 ? 999 : iA;
    const valB = iB === -1 ? 999 : iB;
    if (valA !== valB) return valA - valB;
    return a.name.localeCompare(b.name, 'ar');
  });

  const selTeacher = teachers.find(t => t.id === selId);
  const sc = selId ? getC(selId) : null;
  const selWarnings = selId ? warnings.filter(w => w.relatedId === selId) : [];

  // --- Render Helpers ---
  const renderSectionHeader = (key: string, bg: string, border: string, iconBg: string, iconCol: string, Icon: React.ElementType, title: string, subtitle: string) => (
    <button onClick={() => setOpen(prev => ({ ...prev, [key]: !prev[key] }))}
      className={`w-full flex items-center justify-between p-4 rounded-2xl bg-white border transition-all hover:opacity-90 ${open[key] ? 'border-[#8779fb]' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconCol}`}>
          <Icon size={18} />
        </div>
        <div className="text-right">
          <div className="text-sm font-black text-slate-800">{title}</div>
          <div className="text-[10px] text-slate-500 font-bold">{subtitle}</div>
        </div>
      </div>
      <ChevronDown size={16} className={`text-slate-400 transition-transform ${open[key] ? 'rotate-180' : ''}`} />
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3" style={{ direction: 'rtl' }}>
      <div className="bg-slate-50 w-full max-w-6xl h-[92vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200">

        {/* --- Header --- */}
        <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#e5e1fe] rounded-2xl flex items-center justify-center text-[#655ac1]"><Sliders size={22} /></div>
            <div>
              <h2 className="text-lg font-black text-slate-800">قيود المعلمون</h2>
              <p className="text-[11px] text-slate-400 font-bold">إدارة القيود والتفضيلات الفردية للمعلمين</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"><X size={22} /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* --- Sidebar --- */}
          <div className="w-72 bg-white border-l border-slate-100 flex flex-col shrink-0">
            {/* Search & Sort */}
            <div className="p-3 border-b border-slate-100 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="w-full pr-9 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setSortBy('spec')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${sortBy==='spec'?'bg-[#655ac1] text-white':'bg-slate-100 text-slate-500'}`}>التخصص</button>
                <button onClick={() => setSortBy('alpha')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${sortBy==='alpha'?'bg-[#655ac1] text-white':'bg-slate-100 text-slate-500'}`}>أبجدي</button>
                {sortBy === 'spec' && (
                  <button onClick={() => setShowSpecPanel(!showSpecPanel)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${showSpecPanel ? 'bg-[#655ac1] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    <GripVertical size={12} />
                    ترتيب
                  </button>
                )}
              </div>
              {/* Spec Sorting Panel */}
              {showSpecPanel && sortBy === 'spec' && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-2 max-h-44 overflow-y-auto space-y-1">
                  {specOrder.map((sid, idx) => {
                    const sp = specializations.find(s => s.id === sid) || INITIAL_SPECIALIZATIONS.find(s => s.id === sid);
                    if (!sp) return null;
                    return (
                      <div key={sid} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white border border-slate-100">
                        <span className="flex-1 text-[10px] font-bold text-slate-600 truncate">{sp.name}</span>
                        <div className="flex gap-1">
                          <button onClick={() => {
                            const newOrder = [...specOrder];
                            if (idx > 0) {
                              [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
                              setSpecOrder(newOrder);
                            }
                          }} disabled={idx === 0} className="text-slate-300 hover:text-[#655ac1] disabled:opacity-30"><ChevronUp size={12} /></button>
                          <button onClick={() => {
                            const newOrder = [...specOrder];
                            if (idx < specOrder.length - 1) {
                              [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
                              setSpecOrder(newOrder);
                            }
                          }} disabled={idx === specOrder.length - 1} className="text-slate-300 hover:text-[#655ac1] disabled:opacity-30"><ChevronDown size={12} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredTeachers.map(t => {
                const isSel = selId === t.id;
                const spName = specializations.find(s => s.id === t.specializationId)?.name
                  || INITIAL_SPECIALIZATIONS.find(s => s.id === t.specializationId)?.name
                  || '';
                const hasC = constraints.some(c => c.teacherId === t.id);
                return (
                  <button key={t.id} onClick={() => setSelId(t.id)}
                    className={`w-full text-right p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${isSel ? 'bg-white border-[#655ac1] shadow-sm shadow-[#655ac1]/10' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold truncate ${isSel ? 'text-[#655ac1]' : 'text-slate-700'}`}>{t.name}</div>
                      <div className={`text-[10px] truncate ${isSel ? 'text-[#655ac1]/60' : 'text-slate-400'}`}>{spName}</div>
                    </div>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isSel ? 'bg-emerald-500' : hasC ? 'bg-[#655ac1]/40' : 'hidden'}`} />
                  </button>
                );
              })}
              {filteredTeachers.length === 0 && <div className="text-center py-8 text-xs text-slate-400">لا يوجد معلمين</div>}
            </div>
          </div>

          {/* --- Main Content --- */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {!selTeacher ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                <Users size={48} className="opacity-20" />
                <p className="text-sm font-bold text-slate-400">اختر معلماً للبدء</p>
              </div>
            ) : (
              <div className="space-y-4 pb-10">
                {/* Info Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">{selTeacher.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">{specializations.find(s=>s.id===selTeacher.specializationId)?.name || 'عام'}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600">نصاب: {selTeacher.quotaLimit}</span>
                      </div>
                    </div>
                  </div>
                  {/* Quick Copy Button */}
                  <button
                    onClick={() => setShowCopyModal(true)}
                    title="نسخ القيود لمعلم آخر"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border bg-white text-slate-700 border-[#8779fb] hover:bg-violet-50 transition-all"
                  >
                    <Copy size={14} />
                    <span>نسخ القيود لمعلم آخر</span>
                  </button>
                </div>

                {/* Warnings */}
                {selWarnings.map(w => (
                  <div key={w.id} className={`p-3 rounded-xl text-xs border flex gap-3 ${w.level==='error'?'bg-rose-50 text-rose-700 border-rose-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    <AlertTriangle size={16} className="shrink-0" />
                    <div>
                      <div className="font-bold">{w.message}</div>
                      {w.suggestion && <div className="opacity-80 mt-1">{w.suggestion}</div>}
                    </div>
                  </div>
                ))}

                {/* 1. Consecutive Periods - Smaller, Pattern N+0, Default 2 */}
                <div className="space-y-2">
                  {renderSectionHeader('c1', 'bg-violet-50', 'border-violet-200', 'bg-violet-100', 'text-violet-600', Sliders, 'تتابع الحصص', 'الحد الأقصى للحصص المتتالية')}
                  {open.c1 && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex flex-wrap gap-2 px-4">
                        {[1, 2, 3, 4, 5].map(n => {
                          const isAct = (sc?.maxConsecutive ?? 2) === n;
                          return (
                            <button key={n} onClick={() => updC(selTeacher.id, { maxConsecutive: n })}
                              className={`w-14 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${isAct ? 'border-violet-500 bg-white shadow-sm shadow-violet-100' : 'border-slate-100 hover:border-violet-200 bg-white'}`}>
                              <span className={`text-base font-black ${isAct ? 'text-violet-600' : 'text-slate-400'}`}>{n}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Excluded Slots */}
                <div className="space-y-2">
                  {renderSectionHeader('c2', 'bg-rose-50', 'border-rose-200', 'bg-rose-100', 'text-rose-600', Ban, 'استثناء الحصص', 'منع إسناد حصص معينة')}
                  {open.c2 && (
                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">

                      {/* توجيه سريع */}
                      <div className="flex flex-wrap gap-2 mb-4 min-w-[520px]">
                        <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg flex-1">
                          <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center shrink-0">
                            <span className="text-white font-black text-[9px]">١</span>
                          </div>
                          <span className="text-[10px] font-bold text-rose-700">انقر على <span className="font-black underline decoration-rose-400">رقم الحصة</span> لإغلاق تلك الحصة في جميع الأيام</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg flex-1">
                          <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center shrink-0">
                            <span className="text-white font-black text-[9px]">٢</span>
                          </div>
                          <span className="text-[10px] font-bold text-rose-700">انقر على <span className="font-black underline decoration-rose-400">اسم اليوم</span> لإغلاق جميع حصصه دفعةً واحدة</span>
                        </div>
                      </div>

                      <div className="min-w-[520px]">
                        <div className="border-2 border-slate-200 rounded-xl overflow-hidden">

                          {/* Header - Period Numbers */}
                          <div className="flex bg-slate-50 border-b-2 border-slate-200">
                            <div className="w-20 shrink-0 border-r-2 border-slate-200 px-2 py-2 flex items-center justify-center">
                              <span className="text-[8px] font-black text-slate-400 tracking-wider">اليوم / الحصة</span>
                            </div>
                            {periods.map((p, pi) => {
                              const allBlocked = days.every(d => (sc?.excludedSlots?.[d] || []).includes(p));
                              return (
                                <div key={p} className={`flex-1 flex justify-center items-center py-2 ${pi < periods.length - 1 ? 'border-r border-slate-200' : ''}`}>
                                  <button onClick={() => {
                                    const c = getC(selTeacher.id);
                                    const currentSlots = c.excludedSlots || {};
                                    const isAllBlocked = days.every(d => (currentSlots[d] || []).includes(p));
                                    const newSlots = { ...currentSlots };
                                    days.forEach(d => {
                                      const daySlots = newSlots[d] || [];
                                      if (isAllBlocked) newSlots[d] = daySlots.filter(x => x !== p);
                                      else if (!daySlots.includes(p)) newSlots[d] = [...daySlots, p];
                                    });
                                    updC(selTeacher.id, { excludedSlots: newSlots });
                                  }} className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-all
                                    ${allBlocked
                                      ? 'bg-rose-500 text-white border-2 border-rose-500'
                                      : 'bg-white border-2 border-slate-300 text-slate-600 hover:border-rose-400 hover:text-rose-500 hover:bg-rose-50'
                                    }`}>
                                    {p}
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {/* Body - Days */}
                          {days.map((d, di) => (
                            <div key={d} className={`flex ${di < days.length - 1 ? 'border-b border-slate-200' : ''}`}>
                              <button onClick={() => {
                                const c = getC(selTeacher.id);
                                const current = c.excludedSlots?.[d] || [];
                                const newSlots = { ...(c.excludedSlots || {}) };
                                newSlots[d] = current.length === safePeriodsCount ? [] : [...periods];
                                updC(selTeacher.id, { excludedSlots: newSlots });
                              }} className="w-20 shrink-0 border-r-2 border-slate-200 px-2 py-2 text-center text-[10px] font-black text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                {getDayLabel(d)}
                              </button>

                              {periods.map((p, pi) => {
                                const isEx = (sc?.excludedSlots?.[d] || []).includes(p);
                                const isEarly = (sc?.earlyExit?.[d] !== undefined) && p > sc.earlyExit[d];

                                return (
                                  <div key={p} className={`flex-1 flex justify-center items-center py-1.5 ${pi < periods.length - 1 ? 'border-r border-slate-200' : ''} ${isEx ? 'bg-rose-50/60' : ''}`}>
                                    <button
                                      onClick={() => {
                                        if (isEarly) return;
                                        const c = getC(selTeacher.id);
                                        const cur = c.excludedSlots?.[d] || [];
                                        const newSlots = { ...(c.excludedSlots || {}) };
                                        newSlots[d] = cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p];
                                        updC(selTeacher.id, { excludedSlots: newSlots });
                                      }}
                                      disabled={isEarly}
                                      className={`w-8 h-7 rounded-lg flex items-center justify-center transition-all duration-200
                                        ${isEarly
                                          ? 'opacity-25 cursor-not-allowed bg-slate-100 border-2 border-slate-200'
                                          : isEx
                                            ? 'bg-rose-100 border-2 border-rose-400 text-rose-500 hover:bg-rose-200 shadow-sm shadow-rose-100'
                                            : 'bg-emerald-50 border-2 border-emerald-300 text-emerald-500 hover:bg-emerald-100 shadow-sm shadow-emerald-100'
                                        }`}>
                                      {isEarly && <span className="text-slate-300 font-bold text-xs">—</span>}
                                      {!isEarly && isEx && <X size={12} strokeWidth={3} />}
                                      {!isEarly && !isEx && <Check size={12} strokeWidth={3} />}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. First/Last */}
                <div className="space-y-2">
                  {renderSectionHeader('c4', 'bg-violet-50', 'border-violet-200', 'bg-violet-100', 'text-violet-600', ArrowRightFromLine, 'الحصص الأولى والأخيرة', 'تخصيص توزيع عدد الحصص الأولى والأخيرة')}
                  {open.c4 && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

                      {/* ── شرح آلية النظام ── */}
                      <div className="px-5 pt-4 pb-4 border-b border-slate-100 bg-slate-50/60 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-[#e5e1fe] text-[#655ac1] flex items-center justify-center shrink-0 mt-0.5 font-black text-[10px]">١</div>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            <span className="font-black text-slate-700">التوزيع التلقائي:</span> يقوم النظام آلياً بحساب <span className="text-[#655ac1] font-black">عدد الفصول × عدد الأيام</span> = عدد الحصص الأولى والأخيرة المطلوبة، ثم يوزعها بالتساوي على جميع المعلمين.
                          </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-[#e5e1fe] text-[#655ac1] flex items-center justify-center shrink-0 mt-0.5 font-black text-[10px]">٢</div>
                          <div className="space-y-1.5">
                            <p className="text-xs text-slate-700 font-black">التخصيص اليدوي:</p>
                            <ul className="space-y-1">
                              <li className="flex items-start gap-1.5 text-xs text-slate-600 font-medium leading-relaxed">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-[#655ac1] shrink-0"></span>
                                يمكنك تعديل نصيب أي معلم يدوياً من الجدول أدناه، وسيتكيّف النظام تلقائياً مع تعديلاتك.
                              </li>
                              <li className="flex items-start gap-1.5 text-xs text-slate-600 font-medium leading-relaxed">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-[#655ac1] shrink-0"></span>
                                تتبّع شريط التغطية أدناه لمعرفة حالة التوزيع، وفي حال وجود نقص سيظهر لك تنبيه تلقائي.
                              </li>
                              <li className="flex items-start gap-1.5 text-xs text-slate-600 font-medium leading-relaxed">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-[#655ac1] shrink-0"></span>
                                إذا رغبت في العودة للتوزيع العادل التلقائي استخدم <span className="font-black text-[#655ac1]">زر إعادة التوزيع التلقائي بالأسفل</span>.
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* ── لوحة الاحتياج والتوزيع ── */}
                      <div className="p-5 border-b border-slate-100 space-y-4">

                        {/* إحصاءات: فصول × أيام = مطلوب + معلمون + نصيب */}
                        <div className="grid grid-cols-6 gap-2">
                          {[
                            { value: periodEngine.numClasses,    label: 'فصل' },
                            { value: periodEngine.numDays,       label: 'يوم دراسي' },
                            { value: periodEngine.totalNeeded,   label: 'حصة مطلوبة' },
                            { value: periodEngine.numQualified,  label: 'عدد المعلمين' },
                            { value: periodEngine.teacherShare,  label: 'نصيب المعلم أولى' },
                            { value: periodEngine.teacherShare,  label: 'نصيب المعلم أخيرة' },
                          ].map(({ value, label }) => (
                            <div key={label} className="flex flex-col items-center justify-center gap-1 py-3 bg-white border border-slate-200 rounded-xl shadow-sm shadow-slate-100">
                              <span className="text-2xl font-black text-[#655ac1]">{value}</span>
                              <span className="text-[10px] font-bold text-slate-400">{label}</span>
                            </div>
                          ))}
                        </div>

                        {/* شريطا تغطية */}
                        <div className="space-y-2.5">
                          {/* الأولى */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <ArrowRightFromLine size={12} className="text-slate-400" />
                                <span className="text-[10px] font-black text-slate-600">الحصص الأولى</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-600">{periodEngine.totalFirst} / {periodEngine.totalNeeded}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  periodEngine.firstDeficit > 0
                                    ? 'bg-rose-50 text-rose-500'
                                    : periodEngine.firstSurplus > 0
                                    ? 'bg-violet-50 text-[#655ac1]'
                                    : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                  {periodEngine.firstDeficit > 0 ? `نقص ${periodEngine.firstDeficit}` : periodEngine.firstSurplus > 0 ? `+${periodEngine.firstSurplus}` : '✓ مكتمل'}
                                </span>
                              </div>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${periodEngine.firstCoverage >= 100 ? 'bg-[#655ac1]' : periodEngine.firstCoverage >= 70 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                style={{ width: `${Math.min(100, periodEngine.firstCoverage)}%` }}
                              />
                            </div>
                          </div>
                          {/* الأخيرة */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <ArrowLeftFromLine size={12} className="text-slate-400" />
                                <span className="text-[10px] font-black text-slate-600">الحصص الأخيرة</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-600">{periodEngine.totalLast} / {periodEngine.totalNeeded}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  periodEngine.lastDeficit > 0
                                    ? 'bg-rose-50 text-rose-500'
                                    : periodEngine.lastSurplus > 0
                                    ? 'bg-violet-50 text-[#655ac1]'
                                    : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                  {periodEngine.lastDeficit > 0 ? `نقص ${periodEngine.lastDeficit}` : periodEngine.lastSurplus > 0 ? `+${periodEngine.lastSurplus}` : '✓ مكتمل'}
                                </span>
                              </div>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${periodEngine.lastCoverage >= 100 ? 'bg-[#655ac1]' : periodEngine.lastCoverage >= 70 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                style={{ width: `${Math.min(100, periodEngine.lastCoverage)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* زر إعادة التوزيع الافتراضي */}
                        <button
                          onClick={autoDistributeFirstLast}
                          disabled={periodEngine.numClasses === 0 || periodEngine.numQualified === 0}
                          className="w-full flex items-center justify-center gap-2 py-2 border border-[#655ac1]/40 bg-[#e5e1fe]/40 hover:bg-[#e5e1fe] hover:border-[#655ac1] active:scale-[0.98] text-[#655ac1] text-[11px] font-black rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <RotateCcw size={13} />
                          إعادة التوزيع التلقائي
                        </button>
                      </div>

                      {/* ── تنبيه استحالة التوزيع ── */}
                      {!periodEngine.distributionFeasible && periodEngine.numClasses > 0 && (
                        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100 space-y-1">
                          <div className="flex items-start gap-2 text-amber-700 text-[10px] font-bold">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                            <span>التوزيع العادل غير ممكن حالياً — تحتاج على الأقل <span className="font-black">{periodEngine.minTeachersNeeded} معلمًا</span> بنصاب رسمي لتغطية {periodEngine.numClasses} فصلاً. المعلمون الحاليون: {periodEngine.numQualified}.</span>
                          </div>
                        </div>
                      )}

                      {/* ── تنبيه النقص ── */}
                      {(periodEngine.firstDeficit > 0 || periodEngine.lastDeficit > 0) && (
                        <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-100 space-y-1">
                          {periodEngine.firstDeficit > 0 && (
                            <div className="flex items-start gap-2 text-rose-600 text-[10px] font-bold">
                              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                              <span>التوزيع الحالي للحصص الأولى غير كافٍ لتغطية كافة الفصول (نقص {periodEngine.firstDeficit} حصة).</span>
                            </div>
                          )}
                          {periodEngine.lastDeficit > 0 && (
                            <div className="flex items-start gap-2 text-rose-600 text-[10px] font-bold">
                              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                              <span>التوزيع الحالي للحصص الأخيرة غير كافٍ لتغطية كافة الفصول (نقص {periodEngine.lastDeficit} حصة).</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── إعدادات المعلم ── */}
                      <div className="p-5 space-y-4">
                        {(() => {
                          const isExcluded = (selTeacher.quotaLimit || 0) === 0;
                          return (
                            <>
                              {/* مستبعد تلقائياً */}
                              {isExcluded && (
                                <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                                  <Ban size={15} className="text-slate-400 shrink-0" />
                                  <div>
                                    <div className="text-xs font-black text-slate-600">مستبعد تلقائياً</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">نصاب هذا المعلم (0) — تم استبعاده من توزيع الحصص الطرفية.</div>
                                  </div>
                                </div>
                              )}

                              {/* عنوان قسم التخصيص */}
                              <div className="flex items-center gap-2 pt-1">
                                <div className="w-1 h-5 rounded-full bg-[#655ac1]" />
                                <h4 className="text-sm font-black text-slate-700">تخصيص الحصص الأولى والأخيرة</h4>
                              </div>

                              {/* حقلا التخصيص */}
                              <div className="grid md:grid-cols-2 gap-4">

                                {/* الحصص الأولى */}
                                {(() => {
                                  const curFirst = isExcluded ? 0 : (sc?.maxFirstPeriods ?? 0);
                                  const maxOpts = days.length; // الحد الأقصى = أيام الأسبوع
                                  const diffFirst = curFirst - periodEngine.teacherShare;
                                  return (
                                    <div className={`p-4 border rounded-2xl transition-all ${
                                      isExcluded ? 'opacity-50 pointer-events-none bg-slate-50 border-slate-200'
                                      : curFirst === 0 ? 'bg-slate-50/40 border-dashed border-slate-300'
                                      : 'bg-slate-50/40 border-slate-200 hover:bg-white hover:shadow-sm hover:border-violet-200'
                                    }`}>
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <ArrowRightFromLine size={14} className={curFirst === 0 && !isExcluded ? 'text-slate-300' : 'text-[#655ac1]'} />
                                          <label className="text-sm font-black text-slate-700">الحصص الأولى</label>
                                          {curFirst === 0 && !isExcluded && (
                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">معفي</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          {!isExcluded && periodEngine.teacherShare > 0 && (
                                            <span className="px-2 py-0.5 bg-[#e5e1fe] text-[#655ac1] text-[9px] font-black rounded-full">
                                              مقترح: {periodEngine.teacherShare}
                                            </span>
                                          )}
                                          <span className="text-[9px] text-slate-400 font-bold">أسبوعياً</span>
                                        </div>
                                      </div>
                                      <div className="relative">
                                        <select
                                          value={curFirst}
                                          disabled={isExcluded}
                                          onChange={e => {
                                            const val = Number(e.target.value);
                                            updCFirstLast(selTeacher.id, 'first', val === 0 ? undefined : val);
                                          }}
                                          className={`w-full p-3 bg-white border rounded-xl text-sm font-bold focus:border-[#655ac1] focus:ring-4 focus:ring-[#e5e1fe] outline-none transition-all appearance-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                                            curFirst === 0 && !isExcluded ? 'border-slate-200 text-slate-400 italic' : 'border-slate-200'
                                          }`}>
                                          <option value={0}>{isExcluded ? 'مستبعد' : '-- غير مفعل (معفي) --'}</option>
                                          {!isExcluded && Array.from({ length: maxOpts }, (_, i) => i + 1).map(n => (
                                            <option key={n} value={n}>
                                              {n} {n === 1 ? 'حصة' : 'حصص'}{n === periodEngine.teacherShare ? ' ← مقترح' : ''}
                                            </option>
                                          ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                      </div>
                                      {!isExcluded && curFirst === 0 && (
                                        <p className="text-[10px] mt-2 font-bold text-slate-400">ℹ️ سيتم توزيع نصيبه من الحصص الأولى على بقية المعلمين تلقائياً.</p>
                                      )}
                                      {!isExcluded && curFirst > 0 && periodEngine.teacherShare > 0 && (
                                        <p className={`text-[10px] mt-2 font-bold flex items-center gap-1 ${diffFirst === 0 ? 'text-emerald-500' : diffFirst > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                                          {diffFirst === 0 ? '✓ يساوي النصيب العادل' : diffFirst > 0 ? `▲ أعلى من المقترح بـ ${diffFirst} حصة` : `▼ أقل من المقترح بـ ${Math.abs(diffFirst)} حصة`}
                                        </p>
                                      )}
                                      {isExcluded && (
                                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">مستبعد لعدم وجود نصاب تدريسي.</p>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* الحصص الأخيرة */}
                                {(() => {
                                  const curLast = isExcluded ? 0 : (sc?.maxLastPeriods ?? 0);
                                  const maxOpts = days.length; // الحد الأقصى = أيام الأسبوع
                                  const diffLast = curLast - periodEngine.teacherShare;
                                  return (
                                    <div className={`p-4 border rounded-2xl transition-all ${
                                      isExcluded ? 'opacity-50 pointer-events-none bg-slate-50 border-slate-200'
                                      : curLast === 0 ? 'bg-slate-50/40 border-dashed border-slate-300'
                                      : 'bg-slate-50/40 border-slate-200 hover:bg-white hover:shadow-sm hover:border-violet-200'
                                    }`}>
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <ArrowLeftFromLine size={14} className={curLast === 0 && !isExcluded ? 'text-slate-300' : 'text-[#655ac1]'} />
                                          <label className="text-sm font-black text-slate-700">الحصص الأخيرة</label>
                                          {curLast === 0 && !isExcluded && (
                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">معفي</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          {!isExcluded && periodEngine.teacherShare > 0 && (
                                            <span className="px-2 py-0.5 bg-[#e5e1fe] text-[#655ac1] text-[9px] font-black rounded-full">
                                              مقترح: {periodEngine.teacherShare}
                                            </span>
                                          )}
                                          <span className="text-[9px] text-slate-400 font-bold">أسبوعياً</span>
                                        </div>
                                      </div>
                                      <div className="relative">
                                        <select
                                          value={curLast}
                                          disabled={isExcluded}
                                          onChange={e => {
                                            const val = Number(e.target.value);
                                            updCFirstLast(selTeacher.id, 'last', val === 0 ? undefined : val);
                                          }}
                                          className={`w-full p-3 bg-white border rounded-xl text-sm font-bold focus:border-[#655ac1] focus:ring-4 focus:ring-[#e5e1fe] outline-none transition-all appearance-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                                            curLast === 0 && !isExcluded ? 'border-slate-200 text-slate-400 italic' : 'border-slate-200'
                                          }`}>
                                          <option value={0}>{isExcluded ? 'مستبعد' : '-- غير مفعل (معفي) --'}</option>
                                          {!isExcluded && Array.from({ length: maxOpts }, (_, i) => i + 1).map(n => (
                                            <option key={n} value={n}>
                                              {n} {n === 1 ? 'حصة' : 'حصص'}{n === periodEngine.teacherShare ? ' ← مقترح' : ''}
                                            </option>
                                          ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                      </div>
                                      {!isExcluded && curLast === 0 && (
                                        <p className="text-[10px] mt-2 font-bold text-slate-400">ℹ️ سيتم توزيع نصيبه من الحصص الأخيرة على بقية المعلمين تلقائياً.</p>
                                      )}
                                      {!isExcluded && curLast > 0 && periodEngine.teacherShare > 0 && (
                                        <p className={`text-[10px] mt-2 font-bold flex items-center gap-1 ${diffLast === 0 ? 'text-emerald-500' : diffLast > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                                          {diffLast === 0 ? '✓ يساوي النصيب العادل' : diffLast > 0 ? `▲ أعلى من المقترح بـ ${diffLast} حصة` : `▼ أقل من المقترح بـ ${Math.abs(diffLast)} حصة`}
                                        </p>
                                      )}
                                      {isExcluded && (
                                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">مستبعد لعدم وجود نصاب تدريسي.</p>
                                      )}
                                    </div>
                                  );
                                })()}

                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Early Exit - Improved Design */}
                <div className="space-y-2">
                  {renderSectionHeader('c5', 'bg-violet-50', 'border-violet-200', 'bg-violet-100', 'text-violet-600', Clock, 'الخروج المبكر', 'إنهاء الدوام مبكراً')}
                  {open.c5 && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-5">

                      {/* اختيار الوضع */}
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          {
                            mode: 'manual',
                            title: 'تحديد يدوي',
                            desc: 'أنت تختار اليوم والحصة التي ينهي فيها المعلم دوامه مبكراً',
                          },
                          {
                            mode: 'auto',
                            title: 'تحديد تلقائي',
                            desc: 'النظام يُحدد يوم الخروج تلقائياً بناءً على الجدول الدراسي',
                          },
                        ].map(({ mode, title, desc }) => {
                          const isSel = (sc?.earlyExitMode || 'manual') === mode;
                          return (
                            <button key={mode}
                              onClick={() => updC(selTeacher.id, { earlyExitMode: mode as any })}
                              className={`text-right p-4 rounded-2xl border-2 transition-all duration-200 ${
                                isSel
                                  ? 'border-slate-400 bg-white shadow-sm shadow-slate-200'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSel ? 'border-slate-600 bg-slate-600' : 'border-slate-300'}`}>
                                  {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className={`text-sm font-black transition-colors ${isSel ? 'text-slate-700' : 'text-slate-500'}`}>{title}</span>
                              </div>
                              <p className="text-[10px] font-medium text-slate-400 leading-relaxed pr-5">{desc}</p>
                            </button>
                          );
                        })}
                      </div>

                      {/* الإعدادات */}
                      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                        {(sc?.earlyExitMode || 'manual') === 'manual' && (
                          <div className="flex-1">
                            <label className="text-xs font-black text-slate-600 block mb-2">اليوم المطلوب</label>
                            <p className="text-[10px] text-slate-400 font-medium mb-2">اختر اليوم الذي يخرج فيه المعلم مبكراً</p>
                            <div className="relative">
                              <select
                                value={sc?.earlyExit ? Object.keys(sc.earlyExit)[0] || '' : ''}
                                onChange={e => {
                                  const d = e.target.value;
                                  if (!d) { updC(selTeacher.id, { earlyExit: {} }); return; }
                                  const oldP = sc?.earlyExit ? Object.values(sc.earlyExit)[0] : (safePeriodsCount - 1);
                                  updC(selTeacher.id, { earlyExit: { [d]: oldP || (safePeriodsCount - 1) } });
                                }}
                                className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-slate-400 focus:ring-4 focus:ring-slate-50 outline-none appearance-none transition-all">
                                <option value="">— اختر اليوم —</option>
                                {days.map(d => <option key={d} value={d}>{getDayLabel(d)}</option>)}
                              </select>
                              <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                        )}

                        <div className="flex-1">
                          <label className="text-xs font-black text-slate-600 block mb-2">الخروج بعد الحصة</label>
                          <p className="text-[10px] text-slate-400 font-medium mb-2">رقم الحصة الأخيرة التي يُدرّسها المعلم</p>
                          <div className="relative">
                            <select
                              value={sc?.earlyExit ? Object.values(sc.earlyExit)[0] || '' : ''}
                              onChange={e => {
                                const v = Number(e.target.value);
                                const mode = sc?.earlyExitMode || 'manual';
                                const day = sc?.earlyExit ? Object.keys(sc.earlyExit)[0] : (mode === 'auto' ? days[0] : '');
                                if (!day && mode === 'manual') return;
                                const targetDay = day || days[0];

                                // Conflict Check
                                const p = v;
                                const maxTotal = p + (days.length - 1) * safePeriodsCount;
                                if (maxTotal < selTeacher.quotaLimit) {
                                  alert('تنبيه: هذا التوقيت يتعارض مع نصاب المعلم!');
                                }

                                updC(selTeacher.id, { earlyExit: { [targetDay]: v } });
                              }}
                              className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-slate-400 focus:ring-4 focus:ring-slate-50 outline-none appearance-none transition-all">
                              <option value="">— اختر رقم الحصة —</option>
                              {periods.slice(0, -1).map(p => (
                                <option key={p} value={p}>الحصة {p}{p === 1 ? ' (الأولى)' : p === 2 ? ' (الثانية)' : p === 3 ? ' (الثالثة)' : p === 4 ? ' (الرابعة)' : p === 5 ? ' (الخامسة)' : p === 6 ? ' (السادسة)' : ''}</option>
                              ))}
                            </select>
                            <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>



                {/* ══════════════════════════════════════════════════════════════
                    القيد السابع — تخصيص أيام التواجد (للمعلم المشترك فقط)
                    ══════════════════════════════════════════════════════════════ */}
                {selTeacher?.isShared && (selTeacher.schools?.length ?? 0) > 0 && (
                  <>
                    {/* فاصل بصري */}
                    <div className="flex items-center gap-3 px-1">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                    </div>

                    <div className="space-y-2">
                      {renderSectionHeader('c7', 'bg-teal-50', 'border-teal-200', 'bg-teal-100', 'text-teal-600', MapPin, 'تخصيص أيام تواجد المعلم', 'أيام وجود المعلم المشترك في كل مدرسة')}

                      {open.c7 && (() => {
                        const rawSchools = selTeacher.schools ?? [];
                        // المدرسة الرئيسية تظهر دائماً أولاً باسمها الفعلي من schoolInfo
                        const hasMain = rawSchools.some(s => s.schoolId === 'main');
                        const schools = hasMain
                          ? rawSchools.map(s => s.schoolId === 'main' ? { ...s, schoolName: mainSchoolName } : s)
                          : [{ schoolId: 'main', schoolName: mainSchoolName, subjects: [], classes: [] }, ...rawSchools];
                        const presenceDays = sc?.presenceDays ?? {};
                        // المدرسة الرئيسية: جميع الأيام محددة تلقائياً إذا لم يُعدَّل
                        const mainEffectiveDays = presenceDays['main'] ?? days;

                        /** الأيام الفعلية لمدرسة (محفوظة أو تلقائية) */
                        const getEffective = (schoolId: string, schoolIdx: number): string[] => {
                          if (presenceDays[schoolId] !== undefined) return presenceDays[schoolId];
                          // المدرسة الرئيسية: جميع الأيام افتراضياً
                          if (schoolId === 'main') return days;
                          // المدارس الأخرى: بدون تفعيل حتى يحددها المستخدم
                          return [];
                        };

                        return (
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            {schools.map((school, idx) => {
                              const savedDays  = presenceDays[school.schoolId]; // undefined = auto
                              const isMainSchool = school.schoolId === 'main';
                              const isAutoMode = isMainSchool ? savedDays === undefined : false;
                              const displayDays = isAutoMode ? getEffective(school.schoolId, idx) : (savedDays ?? []);

                              // كشف التعارض: أيام هذه المدرسة تظهر في مدرسة أخرى أيضاً
                              const otherEffective = schools.flatMap((s, si) =>
                                si !== idx ? getEffective(s.schoolId, si) : []
                              );
                              const conflicts = displayDays.filter(d => otherEffective.includes(d));

                              const toggleDay = (day: string) => {
                                const current = isAutoMode
                                  ? getEffective(school.schoolId, idx)
                                  : (savedDays ?? []);
                                const newDays = current.includes(day)
                                  ? current.filter(d => d !== day)
                                  : [...current, day];
                                // clicking in auto mode switches to manual automatically
                                updC(selId!, { presenceDays: { ...presenceDays, [school.schoolId]: newDays } });
                              };

                              const resetToAuto = () => {
                                const pd = { ...presenceDays };
                                delete pd[school.schoolId];
                                updC(selId!, { presenceDays: pd });
                              };

                              return (
                                <div
                                  key={school.schoolId}
                                  className={`p-4 rounded-2xl border transition-colors ${
                                    conflicts.length > 0
                                      ? 'border-rose-300 bg-rose-50/40'
                                      : idx === 0
                                        ? 'border-slate-200 bg-white'
                                        : 'border-dashed border-slate-200 bg-slate-50/40'
                                  }`}
                                >
                                  {/* اسم المدرسة + badge */}
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-black text-slate-800">{school.schoolName}</p>
                                      {(schoolPhasesMap[school.schoolId] ?? []).map(ph => (
                                        <span key={ph} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{ph}</span>
                                      ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isAutoMode && (
                                        <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                                          جميع الأيام (افتراضي)
                                        </span>
                                      )}
                                      {!isAutoMode && isMainSchool && (
                                        <button
                                          onClick={resetToAuto}
                                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
                                        >
                                          إعادة تلقائي
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* أزرار الأيام */}
                                  <div className="flex flex-wrap gap-2">
                                    {days.map(day => {
                                      const isSelected  = displayDays.includes(day);
                                      const isConflict  = conflicts.includes(day) && isSelected;
                                      return (
                                        <button
                                          key={day}
                                          type="button"
                                          onClick={() => toggleDay(day)}
                                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                                            isConflict  ? 'bg-white border-rose-400 text-rose-600 shadow-sm' :
                                            isSelected  ? 'bg-white border-[#655ac1] text-[#655ac1] shadow-sm shadow-[#655ac1]/10' :
                                            isAutoMode  ? 'bg-white text-teal-600 border-teal-200 opacity-80' :
                                                          'bg-white text-slate-500 border-slate-200 hover:border-[#655ac1]/50 hover:text-[#655ac1]'
                                          }`}
                                        >
                                          {isConflict  && <AlertTriangle size={11} />}
                                          {isSelected && !isConflict && <Check size={11} strokeWidth={3} />}
                                          {getDayLabel(day)}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* تحذيرات التعارض */}
                                  {conflicts.map(cd => (
                                    <p key={cd} className="text-[11px] text-rose-600 font-bold mt-2 flex items-center gap-1">
                                      <AlertTriangle size={11} />
                                      يوم {getDayLabel(cd)} محدد في مدرستين في نفس الوقت
                                    </p>
                                  ))}

                                  {/* تلميح للمدرسة الثانية عند عدم تحديد المدرسة الأولى بعد */}
                                  {isAutoMode && displayDays.length === 0 && (
                                    <p className="text-[10px] text-slate-400 font-bold mt-2">
                                      حدّد أيام المدرسة الأولى أولاً لتُحسَب الأيام هنا تلقائياً
                                    </p>
                                  )}
                                </div>
                              );
                            })}

                            {/* ── تأثير القيد على الخوارزمية ──────────────────────────────────
                                عند إنشاء الجدول، إذا كان presenceDays غير فارغ:
                                لا تُسند للمعلم أي حصة في مدرسة في يوم
                                غير مدرج في presenceDays[schoolId] لتلك المدرسة.
                                ─────────────────────────────────────────────────────────────── */}
                            <div className="p-3 bg-teal-50/60 border border-teal-100 rounded-xl text-[10px] text-slate-500 font-bold leading-relaxed">
                              💡 حدّد في أي أيام يكون المعلم موجوداً في كل مدرسة. لن يُضاف له أي درس في يوم غير محدد لتلك المدرسة.
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}

              </div>
            )}
          </div>
        </div>

        {/* Copy Modal - Added Select All */}

      </div>

      {/* ── Quick Copy Modal ── */}
      {showCopyModal && selTeacher && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCopyModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center"><Copy size={18} /></div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">نسخ القيود لمعلم آخر</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">نسخ قيود <span className="font-bold text-[#8779fb]">{selTeacher.name}</span> إلى معلمين آخرين</p>
                </div>
              </div>
              <button onClick={() => setShowCopyModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Copy Options */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-700 text-sm">خيارات النسخ</h4>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700 hover:text-slate-900">
                    <input type="checkbox"
                      checked={copyOpts.consecutive && copyOpts.excluded && copyOpts.firstLast && copyOpts.earlyEntry}
                      onChange={e => { const v = e.target.checked; setCopyOpts({ consecutive: v, excluded: v, firstLast: v, earlyEntry: v }); }}
                      className="accent-[#8779fb] w-4 h-4 rounded" />
                    <span>تحديد الكل</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { k: 'consecutive', l: 'تتابع الحصص' },
                    { k: 'excluded', l: 'استثناء الحصص' },
                    { k: 'firstLast', l: 'أولى / أخيرة' },
                    { k: 'earlyEntry', l: 'خروج مبكر' },
                  ].map(opt => (
                    <label key={opt.k} className="flex items-center gap-2.5 bg-white px-4 py-3 rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors select-none">
                      <input type="checkbox" checked={copyOpts[opt.k as keyof typeof copyOpts]}
                        onChange={e => setCopyOpts({ ...copyOpts, [opt.k]: e.target.checked })} className="accent-[#8779fb] w-4 h-4 rounded shrink-0" />
                      <span className="text-xs font-bold text-slate-600">{opt.l}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Teacher Selection */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-700 text-sm">تحديد المعلمين</h4>
                    <p className="text-xs text-slate-400 mt-0.5">اختر المعلمين المراد تطبيق نفس القيود عليهم</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">{copyTargets.length} محددين</span>
                    <button
                      onClick={() => {
                        const allIds = filteredTeachers.filter(t => t.id !== selId).map(t => t.id);
                        if (copyTargets.length === allIds.length) setCopyTargets([]);
                        else setCopyTargets(allIds);
                      }}
                      className="text-xs font-bold text-slate-600 hover:text-[#655ac1] px-2.5 py-1 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                    >
                      {copyTargets.length === filteredTeachers.filter(t => t.id !== selId).length ? 'إلغاء الكل' : 'تحديد الكل'}
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={copySearch}
                    onChange={e => setCopySearch(e.target.value)}
                    placeholder="بحث عن معلم..."
                    className="w-full pr-8 pl-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-slate-400 transition-all"
                  />
                </div>
              </div>

              {/* Teachers List */}
              <div className="max-h-52 overflow-y-auto border border-slate-100 rounded-xl p-2 space-y-1 bg-slate-50/50">
                {filteredTeachers.filter(t => t.id !== selId && t.name.toLowerCase().includes(copySearch.toLowerCase())).map(t => (
                  <label key={t.id} className="flex items-center gap-3 p-2.5 hover:bg-white border border-transparent hover:border-slate-100 rounded-xl cursor-pointer transition-all">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${copyTargets.includes(t.id) ? 'bg-[#8779fb] border-[#8779fb]' : 'bg-white border-slate-300'}`}>
                      {copyTargets.includes(t.id) && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{t.name}</span>
                    <input type="checkbox" className="hidden" checked={copyTargets.includes(t.id)} onChange={e => {
                      if (e.target.checked) setCopyTargets([...copyTargets, t.id]);
                      else setCopyTargets(copyTargets.filter(id => id !== t.id));
                    }} />
                  </label>
                ))}
                {filteredTeachers.filter(t => t.id !== selId && t.name.toLowerCase().includes(copySearch.toLowerCase())).length === 0 && (
                  <div className="text-center py-4 text-xs text-slate-400">
                    {copySearch ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد معلمين آخرين للنسخ إليهم'}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                disabled={copyTargets.length === 0}
                onClick={() => {
                  if (copyTargets.length === 0) return;
                  if (!confirm(`هل أنت متأكد من نسخ القيود المحددة إلى ${copyTargets.length} معلم؟`)) return;
                  const src = getC(selId!);
                  const nc = [...constraints];
                  copyTargets.forEach(tid => {
                    const idx = nc.findIndex(c => c.teacherId === tid);
                    const existing: TeacherConstraint = idx >= 0 ? nc[idx] : { teacherId: tid, maxConsecutive: 2, excludedSlots: {} };
                    const n = { ...existing };
                    if (copyOpts.consecutive) n.maxConsecutive = src.maxConsecutive;
                    if (copyOpts.excluded) n.excludedSlots = src.excludedSlots;
                    if (copyOpts.firstLast) { n.maxFirstPeriods = src.maxFirstPeriods; n.maxLastPeriods = src.maxLastPeriods; }
                    if (copyOpts.earlyEntry) { n.earlyExit = src.earlyExit; n.earlyExitMode = src.earlyExitMode; }
                    if (idx >= 0) nc[idx] = n; else nc.push(n);
                  });
                  onChangeConstraints(nc);
                  setCopyTargets([]);
                  setShowCopyModal(false);
                  alert('تم نسخ القيود بنجاح');
                }}
                className="w-full py-3 bg-[#8779fb] text-white rounded-xl text-sm font-bold hover:bg-[#655ac1] shadow-lg shadow-[#c8c1fd] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <Copy size={16} /> تطبيق النسخ على {copyTargets.length > 0 ? `${copyTargets.length} معلم` : 'المحدد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Distribution Modal */}
      {distributeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             <div className="p-5 border-b border-slate-100 bg-violet-50/50 flex justify-between items-center">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-white text-violet-600 flex items-center justify-center shadow-sm">
                   <Sparkles size={20} />
                 </div>
                 <div>
                   <h3 className="font-black text-slate-800">توزيع ذكي للمعلمين</h3>
                   <p className="text-xs font-bold text-slate-500">عدد المعلمين كبير ({distributeModal.teachers.length})، اختر طريقة التوزيع</p>
                 </div>
               </div>
               <button onClick={() => setDistributeModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
             </div>
             
             <div className="p-5 space-y-3">
               {/* Option 1: All in One */}
               <button onClick={() => {
                   const newMeeting: SpecializedMeeting = {
                      id: `m-${Date.now()}`, 
                      specializationId: distributeModal.specId, 
                      day: distributeModal.day, 
                      period: distributeModal.period, 
                      teacherIds: distributeModal.teachers 
                   };
                   onChangeMeetings([...meetings, newMeeting]);
                   setDistributeModal(null);
               }} className="w-full text-right p-4 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-all group">
                  <div className="font-bold text-slate-700 group-hover:text-violet-700">جمع الجميع في يوم واحد</div>
                  <div className="text-xs text-slate-400 mt-1">إضافة {distributeModal.teachers.length} معلم في {distributeModal.day} - الحصة {distributeModal.period}</div>
               </button>

               {/* Option 2: Split 2 Days */}
               {(activeDays?.length ?? 0) >= 2 && (
                 <button onClick={() => {
                     const half = Math.ceil(distributeModal.teachers.length / 2);
                     const g1 = distributeModal.teachers.slice(0, half);
                     const g2 = distributeModal.teachers.slice(half);
                     
                     // Find next day from activeDays
                     const d1 = distributeModal.day;
                     // Note: activeDays might be undefined, fallback to DAYS_AR_DEFAULT
                     const daysList = activeDays && activeDays.length > 0 ? activeDays : DAYS_AR_DEFAULT;
                     
                     // Find index using localized display comparison is risky if activeDays are keys
                     // Assuming activeDays contains 'Sunday', 'Monday', etc... 
                     // But getDayLabel implies keys might be English or Arabic.
                     // The component uses 'days' helper which comes from props or fallback.
                     // Let's use the 'days' variable defined in the component logic (line ~35)
                     // But wait, 'days' variable is internal to component scope and not available here?
                     // Ah, I am inside the component function scope. Yes.
                     // I'll assume 'days' (lines 35-45) is accessible.
                     // Since I am appending JSX, I need to make sure I am inside the function scope.
                     // Yes, I am replacing the closing brace of return.
                     
                     // Re-reading file structure:
                     // The 'days' const is defined at top of component.
                     // It is accessible.
                     
                     const idx = days.indexOf(d1);
                     const nextIdx = idx === -1 ? 1 : (idx + 1) % days.length;
                     const d2 = days[nextIdx];

                     const m1 = { id: `m-${Date.now()}-1`, specializationId: distributeModal.specId, day: d1, period: distributeModal.period, teacherIds: g1 };
                     const m2 = { id: `m-${Date.now()}-2`, specializationId: distributeModal.specId, day: d2, period: distributeModal.period, teacherIds: g2 };
                     
                     onChangeMeetings([...meetings, m1, m2]);
                     setDistributeModal(null);
                 }} className="w-full text-right p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group">
                    <div className="flex items-center justify-between">
                       <div className="font-bold text-slate-700 group-hover:text-emerald-700">توزيع على يومين (50/50)</div>
                       <span className="text-[10px] font-black px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg">موصى به</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">يوم {getDayLabel(distributeModal.day)} ({Math.ceil(distributeModal.teachers.length/2)}) + اليوم التالي ({Math.floor(distributeModal.teachers.length/2)})</div>
                 </button>
               )}

               {/* Option 3: Split 3 Days */}
               {(activeDays?.length ?? 0) >= 3 && distributeModal.teachers.length > 8 && (
                 <button onClick={() => {
                     const third = Math.ceil(distributeModal.teachers.length / 3);
                     const g1 = distributeModal.teachers.slice(0, third);
                     const g2 = distributeModal.teachers.slice(third, third*2);
                     const g3 = distributeModal.teachers.slice(third*2);
                     
                     const d1 = distributeModal.day;
                     // Reuse 'days' scope variable
                     const idx = days.indexOf(d1);
                     const d2 = days[(idx + 1) % days.length];
                     const d3 = days[(idx + 2) % days.length];

                     const m1 = { id: `m-${Date.now()}-1`, specializationId: distributeModal.specId, day: d1, period: distributeModal.period, teacherIds: g1 };
                     const m2 = { id: `m-${Date.now()}-2`, specializationId: distributeModal.specId, day: d2, period: distributeModal.period, teacherIds: g2 };
                     const m3 = { id: `m-${Date.now()}-3`, specializationId: distributeModal.specId, day: d3, period: distributeModal.period, teacherIds: g3 };
                     
                     onChangeMeetings([...meetings, m1, m2, m3]);
                     setDistributeModal(null);
                 }} className="w-full text-right p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-all group">
                    <div className="font-bold text-slate-700 group-hover:text-sky-700">توزيع على 3 أيام</div>
                    <div className="text-xs text-slate-400 mt-1">توزيع {distributeModal.teachers.length} معلم على 3 أيام متتالية</div>
                 </button>
               )}
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
