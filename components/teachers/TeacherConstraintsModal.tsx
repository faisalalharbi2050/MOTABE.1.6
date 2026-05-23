import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Teacher, Specialization, TeacherConstraint, ClassInfo, Phase } from '../../types';
import { Users, Search, AlertTriangle, X, Copy, Sliders, Ban, Clock, ArrowRightFromLine, ArrowLeftFromLine, Repeat, GripVertical, ChevronUp, ChevronDown, Check, CheckCircle2, RotateCcw, MapPin, Coffee, Sparkles, Eye, Rows3, Lightbulb } from 'lucide-react';
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
  initialTeacherId?: string | null;
  initialOpenSection?: 'c1' | 'c2' | 'c4' | 'c5' | 'c6' | 'c7' | null;
  teachers?: Teacher[];
  specializations?: Specialization[];
  constraints?: TeacherConstraint[];
  activeDays?: string[];
  periodsPerDay?: number;
  periodCounts?: Record<string, number>; // عدد الحصص لكل يوم على حدة
  warnings?: ValidationWarning[];
  classes?: ClassInfo[];
  mainSchoolName?: string;
  schoolPhasesMap?: Record<string, Phase[]>; // schoolId => phases
  onChangeConstraints: (c: TeacherConstraint[]) => void;
}

export default function TeacherConstraintsModal({
  isOpen, onClose, initialTeacherId = null, initialOpenSection = null,
  teachers = [], specializations = [], constraints = [], activeDays = [], periodsPerDay = 7,
  periodCounts = {},
  warnings = [], classes = [], mainSchoolName = 'المدرسة الرئيسية', schoolPhasesMap = {}, onChangeConstraints
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

  useEffect(() => {
    if (isOpen && initialTeacherId) setSelId(initialTeacherId);
  }, [isOpen, initialTeacherId]);
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
  const [copyConfirm, setCopyConfirm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'all' | 'has' | 'none' | 'excluded'>('all');
  const [collapsedSpecs, setCollapsedSpecs] = useState<Set<string>>(new Set());

  // Auto-collapse all specialization groups when the modal opens
  useEffect(() => {
    if (isOpen && sortBy === 'spec') {
      setCollapsedSpecs(new Set(usedSpecIds.concat(['__none__'])));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sortBy]);

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

  // Generic sidebar apply-mode (multi-select against the right sidebar)
  const [applyMode, setApplyMode] = useState<null | 'consec' | 'excluded'>(null);
  const [applySelection, setApplySelection] = useState<string[]>([]);
  const [consecApplyDone, setConsecApplyDone] = useState<{ count: number; value: number } | null>(null);
  const [excludedApplyDone, setExcludedApplyDone] = useState<{ count: number } | null>(null);

  // Sync open sections when initialOpenSection prop changes (e.g. when modal is reopened with a different target)
  useEffect(() => {
    if (isOpen && initialOpenSection) {
      setOpen(prev => ({ ...prev, [initialOpenSection]: true }));
    }
  }, [isOpen, initialOpenSection]);

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

  // --- Apply max-consecutive value to a selected group of teachers ---
  const applyConsecutiveToSelection = (value: number, ids: string[]) => {
    if (ids.length === 0) return;
    const next = [...constraints];
    ids.forEach(tid => {
      const idx = next.findIndex(c => c.teacherId === tid);
      if (idx >= 0) {
        next[idx] = { ...next[idx], maxConsecutive: value };
      } else {
        next.push({ teacherId: tid, maxConsecutive: value, excludedSlots: {} });
      }
    });
    onChangeConstraints(next);
    setApplyMode(null);
    setApplySelection([]);
    setConsecApplyDone({ count: ids.length, value });
    setTimeout(() => setConsecApplyDone(null), 2400);
  };

  const applyExcludedSlotsToSelection = (excludedSlots: Record<string, number[]>, ids: string[]) => {
    if (ids.length === 0) return;
    const next = [...constraints];
    ids.forEach(tid => {
      const idx = next.findIndex(c => c.teacherId === tid);
      const clonedSlots = Object.fromEntries(
        Object.entries(excludedSlots || {}).map(([day, slots]) => [day, [...(slots || [])]])
      ) as Record<string, number[]>;
      if (idx >= 0) {
        next[idx] = { ...next[idx], excludedSlots: clonedSlots };
      } else {
        next.push({ teacherId: tid, maxConsecutive: 2, excludedSlots: clonedSlots });
      }
    });
    onChangeConstraints(next);
    setApplyMode(null);
    setApplySelection([]);
    setExcludedApplyDone({ count: ids.length });
    setTimeout(() => setExcludedApplyDone(null), 2400);
  };

  const toggleApplyTarget = (id: string) => {
    setApplySelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const exitApplyMode = () => {
    setApplyMode(null);
    setApplySelection([]);
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
    const matchesSearch = t.name.toLowerCase().includes(term) || sName.toLowerCase().includes(term);
    if (!matchesSearch) return false;
    const hasC = constraints.some(c => c.teacherId === t.id && (
      (c.maxConsecutive !== undefined && c.maxConsecutive !== 2) ||
      (c.excludedSlots && Object.values(c.excludedSlots).some(arr => arr && arr.length > 0)) ||
      c.maxFirstPeriods !== undefined ||
      c.maxLastPeriods !== undefined ||
      (c.earlyExit && Object.keys(c.earlyExit).length > 0)
    ));
    const isExcluded = (t.quotaLimit || 0) === 0;
    if (quickFilter === 'has') return hasC && !isExcluded;
    if (quickFilter === 'none') return !hasC && !isExcluded;
    if (quickFilter === 'excluded') return isExcluded;
    return true;
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
  const singleTeacherMode = Boolean(initialTeacherId);

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
      <div className={`bg-slate-50 w-full ${singleTeacherMode ? 'max-w-3xl' : 'max-w-6xl'} h-[92vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200`}>

        {/* --- Header --- */}
        <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 flex items-center justify-center text-[#655ac1]"><Sliders size={26} /></div>
            <div>
              <h2 className="text-lg font-black text-slate-800">قيود المعلمون</h2>
              <p className="text-[11px] text-slate-400 font-bold">إدارة قيود المعلمون الاستثناءات والتفضيلات</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* --- Sidebar --- */}
          {!singleTeacherMode && (
          <div className="w-72 bg-white border-l border-slate-100 flex flex-col shrink-0">
            {/* Apply-mode banner — gray frame, gray text, purple buttons */}
            {applyMode && (() => {
              const ids = filteredTeachers.map(t => t.id);
              const allOn = ids.length > 0 && ids.every(id => applySelection.includes(id));
              const toggleSelectAll = () => {
                if (allOn) {
                  setApplySelection(prev => prev.filter(id => !ids.includes(id)));
                } else {
                  setApplySelection(prev => Array.from(new Set([...prev, ...ids])));
                }
              };
              const runApply = () => {
                if (applyMode === 'consec') applyConsecutiveToSelection(sc?.maxConsecutive ?? 2, applySelection);
                if (applyMode === 'excluded') applyExcludedSlotsToSelection(sc?.excludedSlots || {}, applySelection);
              };
              return (
                <div className="bg-slate-50 border-b border-slate-200 px-3 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-slate-600 truncate">وضع التحديد للتطبيق</span>
                    <button onClick={exitApplyMode} className="w-6 h-6 rounded-full border border-slate-300 bg-white flex items-center justify-center hover:bg-slate-100 hover:border-slate-400 text-slate-500 shrink-0 transition-all" title="إلغاء التطبيق">
                      <X size={12} />
                    </button>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    محدد: <span className="font-black text-[#655ac1]">{applySelection.length}</span> من {filteredTeachers.length}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={toggleSelectAll}
                      className="flex-1 px-2 py-1.5 rounded-md bg-white border border-[#655ac1]/40 text-[#655ac1] text-[10px] font-black hover:bg-[#655ac1]/5 transition-all"
                    >
                      {allOn ? 'إلغاء الكل' : 'تحديد الكل'}
                    </button>
                    <button
                      onClick={runApply}
                      disabled={applySelection.length === 0}
                      className="flex-1 px-2 py-1.5 rounded-md bg-[#655ac1] text-white text-[10px] font-black hover:bg-[#574bb1] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      تطبيق على ({applySelection.length})
                    </button>
                  </div>
                </div>
              );
            })()}
            {/* Search & Sort */}
            <div className="p-3 border-b border-slate-100 space-y-2.5">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="w-full pr-9 pl-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-[#655ac1]/40 transition-all" />
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setSortBy('spec')} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${sortBy==='spec'?'bg-[#655ac1] border-[#655ac1] text-white':'bg-white border-slate-300 text-slate-500 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white'}`}>التخصص</button>
                {sortBy === 'spec' && (
                  <button onClick={() => setShowSpecPanel(!showSpecPanel)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${showSpecPanel ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-slate-500 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white'}`}>
                    <GripVertical size={13} />
                    ترتيب
                  </button>
                )}
                <button onClick={() => setSortBy('alpha')} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${sortBy==='alpha'?'bg-[#655ac1] border-[#655ac1] text-white':'bg-white border-slate-300 text-slate-500 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white'}`}>أبجدي</button>
              </div>
              {/* Spec Sorting Dropdown - entity-dropdown style */}
              {showSpecPanel && sortBy === 'spec' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-2.5 max-h-72 overflow-y-auto custom-scrollbar space-y-1 animate-in slide-in-from-top-2">
                  {specOrder.map((sid, idx) => {
                    const sp = specializations.find(s => s.id === sid) || INITIAL_SPECIALIZATIONS.find(s => s.id === sid);
                    if (!sp) return null;
                    const specCount = teachers.filter(t => t.specializationId === sid).length;
                    return (
                      <div key={sid} className="group w-full text-right px-3 py-2 text-[12px] font-bold rounded-xl flex items-center justify-between text-slate-700 hover:bg-[#655ac1] hover:text-white transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-transparent border border-slate-300 text-[#655ac1] text-xs font-black shrink-0 group-hover:bg-white group-hover:border-white">
                            {specCount}
                          </span>
                          <span className="truncate">{sp.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => {
                            const newOrder = [...specOrder];
                            if (idx > 0) {
                              [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
                              setSpecOrder(newOrder);
                            }
                          }} disabled={idx === 0} className="w-6 h-6 inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-400 group-hover:border-white group-hover:text-white hover:!bg-white hover:!text-[#655ac1] hover:!border-white disabled:opacity-30 transition-all"><ChevronUp size={13} /></button>
                          <button onClick={() => {
                            const newOrder = [...specOrder];
                            if (idx < specOrder.length - 1) {
                              [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
                              setSpecOrder(newOrder);
                            }
                          }} disabled={idx === specOrder.length - 1} className="w-6 h-6 inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-400 group-hover:border-white group-hover:text-white hover:!bg-white hover:!text-[#655ac1] hover:!border-white disabled:opacity-30 transition-all"><ChevronDown size={13} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {(() => {
                if (filteredTeachers.length === 0) {
                  return <div className="text-center py-8 text-xs font-bold text-slate-400">لا يوجد معلمين</div>;
                }
                const renderTeacher = (t: Teacher) => {
                  const spName = specializations.find(s => s.id === t.specializationId)?.name
                    || INITIAL_SPECIALIZATIONS.find(s => s.id === t.specializationId)?.name
                    || '';
                  if (applyMode) {
                    const checked = applySelection.includes(t.id);
                    return (
                      <button key={t.id} type="button" onClick={() => toggleApplyTarget(t.id)}
                        className="w-full text-right p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 flex items-center gap-3 transition-all">
                        <div className="flex-1 min-w-0">
                          <div className={`text-[13px] font-black truncate transition-colors ${checked ? 'text-[#655ac1]' : 'text-slate-700'}`}>{t.name}</div>
                          {sortBy === 'alpha' && <div className="text-[11px] font-bold truncate text-slate-500 mt-0.5">{spName}</div>}
                        </div>
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-[#655ac1] border-[#655ac1]' : 'border-slate-300 bg-white'}`}>
                          {checked && <Check size={12} className="text-white" strokeWidth={3.5} />}
                        </span>
                      </button>
                    );
                  }
                  const isSel = selId === t.id;
                  const hasC = constraints.some(c => c.teacherId === t.id);
                  return (
                    <button key={t.id} onClick={() => setSelId(isSel ? null : t.id)}
                      className={`w-full text-right p-3 rounded-xl border flex items-center gap-3 transition-all ${isSel ? 'bg-white border-slate-300 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13px] font-black truncate ${isSel ? 'text-[#655ac1]' : 'text-slate-700'}`}>{t.name}</div>
                        {sortBy === 'alpha' && <div className="text-[11px] font-bold truncate text-slate-500 mt-0.5">{spName}</div>}
                      </div>
                      {isSel && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#655ac1] text-white shrink-0">
                          <Check size={12} strokeWidth={3.5} />
                        </span>
                      )}
                    </button>
                  );
                };

                if (sortBy !== 'spec') {
                  return filteredTeachers.map(renderTeacher);
                }

                // Group by specialization
                const groups: { sid: string; name: string; teachers: Teacher[] }[] = [];
                filteredTeachers.forEach(t => {
                  const sid = t.specializationId || '__none__';
                  const name = specializations.find(s => s.id === sid)?.name
                    || INITIAL_SPECIALIZATIONS.find(s => s.id === sid)?.name
                    || 'بدون تخصص';
                  let g = groups.find(x => x.sid === sid);
                  if (!g) { g = { sid, name, teachers: [] }; groups.push(g); }
                  g.teachers.push(t);
                });

                return groups.map(g => {
                  const collapsed = (search.trim() || applyMode) ? false : collapsedSpecs.has(g.sid);
                  return (
                    <div key={g.sid} className="space-y-1">
                      <button
                        onClick={() => {
                          const next = new Set(collapsedSpecs);
                          if (collapsed) next.delete(g.sid); else next.add(g.sid);
                          setCollapsedSpecs(next);
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-700">{g.name}</span>
                          <ChevronDown size={15} className={`text-slate-500 transition-transform ${collapsed ? 'rotate-90' : ''}`} />
                        </div>
                        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-white text-xs font-black text-[#655ac1] border border-slate-200">{g.teachers.length}</span>
                      </button>
                      {!collapsed && <div className="space-y-1 pr-1">{g.teachers.map(renderTeacher)}</div>}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          )}

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
                <div className="bg-white rounded-2xl p-5 border border-slate-300 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800">{selTeacher.name}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-transparent border border-slate-300 text-slate-600">{specializations.find(s=>s.id===selTeacher.specializationId)?.name || 'عام'}</span>
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-transparent border border-slate-300 text-slate-600">نصاب الحصص: {selTeacher.quotaLimit}</span>
                  </div>
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

                {/* 1. Consecutive Periods — unified card */}
                {(() => {
                  const n = sc?.maxConsecutive ?? 2;
                  const palette: Record<number, { border: string; text: string; dot: string; ring: string }> = {
                    1: { border: 'border-emerald-600', text: 'text-emerald-700', dot: 'bg-emerald-600', ring: 'shadow-emerald-200' },
                    2: { border: 'border-emerald-300', text: 'text-emerald-500', dot: 'bg-emerald-400', ring: 'shadow-emerald-100' },
                    3: { border: 'border-amber-400',   text: 'text-amber-600',   dot: 'bg-amber-500',   ring: 'shadow-amber-100' },
                    4: { border: 'border-orange-400',  text: 'text-orange-600',  dot: 'bg-orange-500',  ring: 'shadow-orange-100' },
                    5: { border: 'border-rose-400',    text: 'text-rose-600',    dot: 'bg-rose-500',    ring: 'shadow-rose-100' },
                  };
                  const cur = palette[n] || palette[2];
                  const isConsecApplyMode = applyMode === 'consec';

                  return (
                    <div className={`bg-white rounded-2xl border transition-all ${open.c1 ? 'border-slate-300 shadow-md' : 'border-slate-200 shadow-sm'}`}>
                      {/* Header — toggles open/close */}
                      <button
                        onClick={() => setOpen(prev => ({ ...prev, c1: !prev.c1 }))}
                        className="w-full flex items-center justify-between p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#655ac1]">
                            <Rows3 size={22} />
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-slate-800">تتابع الحصص</div>
                            <div className="text-[10px] text-slate-500 font-bold">الحد الأقصى للحصص المتتالية</div>
                          </div>
                        </div>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open.c1 ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Body */}
                      {open.c1 && (
                        <div className="px-5 pb-5 pt-1 space-y-5 border-t border-slate-100">
                          {/* Helper text */}
                          <p className="text-[12px] font-bold text-slate-500 leading-relaxed pt-3">
                            الحد الأعلى لعدد الحصص التي يؤديها المعلم/ة متتالية :
                          </p>

                          {/* Buttons row — numbers only, no labels, no badge */}
                          <div className="flex flex-wrap gap-3 justify-center">
                            {[1, 2, 3, 4, 5].map(num => {
                              const isAct = n === num;
                              const c = palette[num];
                              return (
                                <button
                                  key={num}
                                  onClick={() => updC(selTeacher.id, { maxConsecutive: num })}
                                  className={`relative flex items-center justify-center w-16 h-16 rounded-2xl border-2 bg-white transition-all hover:-translate-y-0.5 ${
                                    isAct ? `${c.border} shadow-md ${c.ring}` : 'border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  <span className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-black transition-colors ${
                                    isAct ? `${c.dot} text-white` : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {num}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Visual preview — single-line: title · blocks · rest · text */}
                          <div className="rounded-2xl p-4 border border-slate-200 bg-white">
                            <div dir="rtl" className="flex items-center gap-3 flex-wrap">
                              <span className="text-[11px] font-black text-slate-600 shrink-0">توضيح التتابع :</span>
                              <div className="flex items-center gap-1.5">
                                {Array.from({ length: n }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black text-white shadow-sm ${cur.dot}`}
                                    title={`حصة متتالية ${i + 1}`}
                                  >
                                    {i + 1}
                                  </div>
                                ))}
                              </div>
                              <span className="text-[10px] font-black text-slate-300 shrink-0">←</span>
                              <div className="flex items-center px-3 py-2 rounded-lg bg-slate-50 border border-dashed border-slate-300 shrink-0">
                                <span className="text-[10px] font-black text-slate-500">راحة</span>
                              </div>
                              <span className={`text-[11px] font-black mr-auto ${cur.text}`}>
                                {n === 1 ? 'حصة واحدة' : n === 2 ? 'حصتان' : `${n} حصص`} ثم راحة
                              </span>
                            </div>
                          </div>

                          {/* Apply — actions live in the right sidebar */}
                          <div className="pt-3 border-t border-slate-100">
                            {consecApplyDone ? (
                              <div className="flex justify-start">
                                <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
                                  <CheckCircle2 size={14} />
                                  تم تطبيق ({consecApplyDone.value}) على {consecApplyDone.count} معلم
                                </span>
                              </div>
                            ) : isConsecApplyMode ? (
                              <div className="flex items-center gap-2 text-xs font-bold py-2 px-3 rounded-xl border bg-amber-50 text-amber-800 border-amber-200">
                                <Lightbulb size={15} className="text-amber-600 shrink-0" />
                                <span className="leading-relaxed">
                                  اختر المعلمين من القائمة اليمنى ثم اضغط <span className="font-black">تطبيق على</span>
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-2 text-right">
                                <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                                  يمكنك تطبيق هذا الإعداد على مجموعة من المعلمين
                                </p>
                                <div className="flex justify-start">
                                  <button
                                    onClick={() => { setApplyMode('consec'); setApplySelection([]); }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#655ac1] hover:bg-[#574bb1] text-white text-xs font-black shadow transition-all"
                                  >
                                    <Users size={14} />
                                    تطبيق على
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 2. Excluded Slots — unified card */}
                {(() => {
                  const excludedSlots = sc?.excludedSlots || {};
                  const totalOfficialSlots = days.reduce((sum, d) => sum + (dayLastPeriods[d] ?? safePeriodsCount), 0);
                  const excludedCount = days.reduce((sum, d) => {
                    const max = dayLastPeriods[d] ?? safePeriodsCount;
                    return sum + (excludedSlots[d] || []).filter(p => p >= 1 && p <= max).length;
                  }, 0);
                  const availableSlots = Math.max(0, totalOfficialSlots - excludedCount);
                  const quota = selTeacher.quotaLimit || 0;
                  const hasPressure = excludedCount > 0 && (availableSlots < quota || excludedCount / Math.max(1, totalOfficialSlots) >= 0.35);
                  const isExcludedApplyMode = applyMode === 'excluded';

                  const resetExcludedSlots = () => updC(selTeacher.id, { excludedSlots: {} });

                  return (
                    <div className={`bg-white rounded-2xl border transition-all ${open.c2 ? 'border-slate-300 shadow-md' : 'border-slate-200 shadow-sm'}`}>
                      <button
                        onClick={() => setOpen(prev => ({ ...prev, c2: !prev.c2 }))}
                        className="w-full flex items-center justify-between p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#655ac1]">
                            <Ban size={20} />
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-slate-800">الحصص المستثناة</div>
                            <div className="text-[10px] text-slate-500 font-bold">حدد الحصص التي لا ترغب أن تُسند لهذا المعلم عند إنشاء الجدول</div>
                          </div>
                        </div>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open.c2 ? 'rotate-180' : ''}`} />
                      </button>

                      {open.c2 && (
                        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100">
                          <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-500">
                                <span className="w-4 h-4 rounded-full bg-emerald-500 border border-emerald-500 text-white inline-flex items-center justify-center"><Check size={10} strokeWidth={3.5} /></span>
                                متاح
                              </span>
                              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-500">
                                <span className="w-4 h-4 rounded-full bg-rose-500 border border-rose-500 text-white inline-flex items-center justify-center"><X size={10} strokeWidth={3.5} /></span>
                                مستثنى
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black">
                                إجمالي المستثنى: <span className="text-[#655ac1]">{excludedCount}</span>
                              </span>
                              <button
                                onClick={resetExcludedSlots}
                                disabled={excludedCount === 0}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-500 text-xs font-black hover:border-[#5448a8] hover:text-[#5448a8] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                              >
                                <RotateCcw size={14} />
                                إعادة التعيين
                              </button>
                            </div>
                          </div>

                          <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                            انقر على رقم الحصة لإغلاقها في كل الأيام، أو على اسم اليوم لإغلاق كل حصصه.
                          </p>

                          {hasPressure && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-800">
                              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                              <span className="leading-relaxed">
                                كثرة الحصص المستثناة قد تقلل فرص إنشاء جدول مكتمل لهذا المعلم. المتاح الآن {availableSlots} حصة مقابل نصاب {quota}.
                              </span>
                            </div>
                          )}

                          <div className="overflow-x-auto custom-scrollbar">
                            <div className="min-w-[560px] border border-slate-200 rounded-2xl overflow-hidden bg-white">
                              <div className="flex bg-slate-50 border-b border-slate-200">
                                <div className="w-24 shrink-0 border-l border-slate-200 px-2 py-2 flex items-center justify-center">
                                  <span className="text-[9px] font-black text-slate-400">اليوم / الحصة</span>
                                </div>
                                {periods.map((p, pi) => {
                                  const validDays = days.filter(d => p <= (dayLastPeriods[d] ?? safePeriodsCount));
                                  const allBlocked = validDays.length > 0 && validDays.every(d => (excludedSlots[d] || []).includes(p));
                                  return (
                                    <div key={p} className={`flex-1 min-w-[52px] flex justify-center items-center py-2 ${pi < periods.length - 1 ? 'border-l border-slate-200' : ''}`}>
                                      <button
                                        onClick={() => {
                                          const c = getC(selTeacher.id);
                                          const currentSlots = c.excludedSlots || {};
                                          const isAllBlocked = validDays.length > 0 && validDays.every(d => (currentSlots[d] || []).includes(p));
                                          const newSlots = { ...currentSlots };
                                          validDays.forEach(d => {
                                            const daySlots = newSlots[d] || [];
                                            newSlots[d] = isAllBlocked ? daySlots.filter(x => x !== p) : Array.from(new Set([...daySlots, p]));
                                          });
                                          updC(selTeacher.id, { excludedSlots: newSlots });
                                        }}
                                        disabled={validDays.length === 0}
                                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-xs transition-all ${
                                          validDays.length === 0
                                            ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                                            : allBlocked
                                              ? 'bg-rose-500 border-rose-500 text-white'
                                              : 'bg-white border-slate-300 text-slate-600 hover:border-[#655ac1] hover:text-[#655ac1]'
                                        }`}
                                      >
                                        {p}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              {days.map((d, di) => {
                                const dayCount = dayLastPeriods[d] ?? safePeriodsCount;
                                const dayPeriods = periods.filter(p => p <= dayCount);
                                const dayExcluded = (excludedSlots[d] || []).filter(p => p <= dayCount);
                                const fullDayBlocked = dayPeriods.length > 0 && dayPeriods.every(p => dayExcluded.includes(p));
                                return (
                                  <div key={d} className={`flex ${di < days.length - 1 ? 'border-b border-slate-200' : ''}`}>
                                    <button
                                      onClick={() => {
                                        const c = getC(selTeacher.id);
                                        const current = c.excludedSlots?.[d] || [];
                                        const newSlots = { ...(c.excludedSlots || {}) };
                                        newSlots[d] = fullDayBlocked ? [] : [...dayPeriods];
                                        updC(selTeacher.id, { excludedSlots: newSlots });
                                      }}
                                      className={`w-24 shrink-0 border-l border-slate-200 px-2 py-2 text-center text-xs font-black transition-colors ${
                                        fullDayBlocked ? 'text-rose-600 bg-rose-50 hover:bg-slate-100 hover:text-[#655ac1]' : 'text-slate-600 hover:bg-slate-100 hover:text-[#655ac1]'
                                      }`}
                                    >
                                      {getDayLabel(d)}
                                    </button>

                                    {periods.map((p, pi) => {
                                      const isValid = p <= dayCount;
                                      const isEx = isValid && (excludedSlots[d] || []).includes(p);
                                      return (
                                        <div key={p} className={`flex-1 min-w-[52px] flex justify-center items-center py-2 ${pi < periods.length - 1 ? 'border-l border-slate-200' : ''}`}>
                                          {isValid ? (
                                            <button
                                              onClick={() => {
                                                const c = getC(selTeacher.id);
                                                const cur = c.excludedSlots?.[d] || [];
                                                const newSlots = { ...(c.excludedSlots || {}) };
                                                newSlots[d] = cur.includes(p) ? cur.filter(x => x !== p) : Array.from(new Set([...cur, p]));
                                                updC(selTeacher.id, { excludedSlots: newSlots });
                                              }}
                                              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                                                isEx
                                                  ? 'bg-rose-500 border-rose-500 text-white hover:bg-rose-600'
                                                  : 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600'
                                              }`}
                                              title={isEx ? 'مستثنى من الإسناد' : 'متاح للإسناد'}
                                            >
                                              {isEx ? <X size={12} strokeWidth={3.5} /> : <Check size={12} strokeWidth={3.5} />}
                                            </button>
                                          ) : (
                                            <span className="w-7 h-7 rounded-full border border-slate-200 bg-slate-50 text-slate-300 inline-flex items-center justify-center text-xs font-black">-</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100">
                            {excludedApplyDone ? (
                              <div className="flex justify-start">
                                <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
                                  <CheckCircle2 size={14} />
                                  تم تطبيق الحصص المستثناة على {excludedApplyDone.count} معلم
                                </span>
                              </div>
                            ) : isExcludedApplyMode ? (
                              <div className="flex items-center gap-2 text-xs font-bold py-2 px-3 rounded-xl border bg-amber-50 text-amber-800 border-amber-200">
                                <Lightbulb size={15} className="text-amber-600 shrink-0" />
                                <span className="leading-relaxed">
                                  اختر المعلمين من القائمة اليمنى ثم اضغط <span className="font-black">تطبيق على</span>
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-2 text-right">
                                <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                                  يمكنك تطبيق الحصص المستثناة نفسها على مجموعة من المعلمين
                                </p>
                                <div className="flex justify-start">
                                  <button
                                    onClick={() => { setApplyMode('excluded'); setApplySelection([]); }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#655ac1] hover:bg-[#574bb1] text-white text-xs font-black shadow transition-all"
                                  >
                                    <Users size={14} />
                                    تطبيق على
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

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
                            <span className="font-black text-slate-700">التوزيع التلقائي:</span> يقوم النظام آلياً بحساب <span className="text-[#655ac1] font-black">عدد الفصول × عدد الأيام</span> = عدد الحصص الأولى والأخيرة المطلوبɡ ثم يوزعها بالتساوي على جميع المعلمين.
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
                                تتبّع شريط التغطية أدناه لمعرفة حالة التوزيڡ وفي حال وجود نقص سيظهر لك تنبيه تلقائي.
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

                {/* Copy constraints button — placed after all sections */}
                <div className="flex justify-start">
                  <button
                    dir="rtl"
                    onClick={() => setShowCopyModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#655ac1] border border-[#655ac1] rounded-xl text-white hover:bg-[#655ac1] font-bold text-sm transition-all"
                  >
                    <Copy size={16} />
                    نسخ القيود لمعلم آخر
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Copy Modal - Added Select All */}

        {/* --- Footer --- */}
        <div className="bg-white px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 hover:text-slate-800 transition-all"
          >
            إغلاق
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#655ac1] text-white rounded-xl font-bold text-sm hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 transition-all flex items-center gap-2"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1]">
              <Check size={13} strokeWidth={3.2} className="text-white" />
            </span>
            حفظ
          </button>
        </div>

      </div>

      {/* ── Quick Copy Modal ── */}
      {showCopyModal && selTeacher && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3" style={{ direction: 'rtl' }} onClick={() => { if (!copyConfirm && !copySuccess) { setShowCopyModal(false); setCopyConfirm(false); } }}>
          <div className="bg-slate-50 w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 flex items-center justify-center text-[#655ac1]"><Copy size={22} /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">نسخ القيود لمعلم آخر</h3>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">نسخ قيود <span className="font-black text-[#655ac1]">{selTeacher.name}</span> إلى معلم أو معلمين آخرين</p>
                </div>
              </div>
              <button onClick={() => setShowCopyModal(false)} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* ── خيارات النسخ ── */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full bg-[#655ac1]" />
                    <h4 className="text-sm font-black text-slate-700">خيارات النسخ</h4>
                  </div>
                  {(() => {
                    const allOn = copyOpts.consecutive && copyOpts.excluded && copyOpts.firstLast && copyOpts.earlyEntry;
                    return (
                      <button
                        onClick={() => { const v = !allOn; setCopyOpts({ consecutive: v, excluded: v, firstLast: v, earlyEntry: v }); }}
                        className={`text-[11px] font-black px-3 py-1.5 rounded-lg border transition-all ${allOn ? 'bg-rose-500 border-rose-500 text-white hover:bg-rose-500' : 'bg-[#655ac1] border-[#655ac1] text-white hover:bg-[#655ac1]'}`}
                      >
                        {allOn ? 'إلغاء الكل' : 'تحديد الكل'}
                      </button>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { k: 'consecutive', l: 'تتابع الحصص' },
                    { k: 'excluded', l: 'الحصص المستثناة' },
                    { k: 'firstLast', l: 'أولى / أخيرة' },
                    { k: 'earlyEntry', l: 'خروج مبكر' },
                  ].map(opt => {
                    const on = copyOpts[opt.k as keyof typeof copyOpts];
                    return (
                      <button
                        type="button"
                        key={opt.k}
                        onClick={() => setCopyOpts({ ...copyOpts, [opt.k]: !on })}
                        className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 transition-all text-right ${on ? 'bg-white border-slate-300 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                      >
                        {on ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#655ac1] text-white shrink-0">
                            <Check size={12} strokeWidth={3.5} />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                        )}
                        <span className={`text-xs font-bold ${on ? 'text-slate-700' : 'text-slate-500'}`}>{opt.l}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── تحديد المعلمين ── */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full bg-[#655ac1]" />
                    <div>
                      <h4 className="text-sm font-black text-slate-700">تحديد المعلمين</h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">اختر المعلمين المراد تطبيق نفس القيود عليهم</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-white border border-slate-300 text-[#655ac1] text-[10px] font-black rounded-full">{copyTargets.length} محدد</span>
                </div>

                {/* Search + select all */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={copySearch}
                      onChange={e => setCopySearch(e.target.value)}
                      placeholder="بحث عن معلم..."
                      className="w-full pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-[#655ac1]/40 transition-all"
                    />
                  </div>
                  {(() => {
                    const allIds = filteredTeachers.filter(t => t.id !== selId).map(t => t.id);
                    const allOn = allIds.length > 0 && copyTargets.length === allIds.length;
                    return (
                      <button
                        onClick={() => allOn ? setCopyTargets([]) : setCopyTargets(allIds)}
                        className={`text-[11px] font-black px-3 py-2 rounded-xl border transition-all ${allOn ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-slate-500 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white'}`}
                      >
                        {allOn ? 'إلغاء الكل' : 'تحديد الكل'}
                      </button>
                    );
                  })()}
                </div>

                {/* Teachers List */}
                <div className="max-h-52 overflow-y-auto rounded-xl space-y-1">
                  {filteredTeachers.filter(t => t.id !== selId && t.name.toLowerCase().includes(copySearch.toLowerCase())).map(t => {
                    const on = copyTargets.includes(t.id);
                    const spName = specializations.find(s => s.id === t.specializationId)?.name
                      || INITIAL_SPECIALIZATIONS.find(s => s.id === t.specializationId)?.name || '';
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => on ? setCopyTargets(copyTargets.filter(id => id !== t.id)) : setCopyTargets([...copyTargets, t.id])}
                        className={`w-full text-right p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${on ? 'bg-white border-slate-300 shadow-md' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
                      >
                        {on ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#655ac1] text-white shrink-0">
                            <Check size={12} strokeWidth={3.5} />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-black truncate ${on ? 'text-[#655ac1]' : 'text-slate-700'}`}>{t.name}</div>
                          {spName && <div className="text-xs font-bold truncate text-slate-500 mt-0.5">{spName}</div>}
                        </div>
                      </button>
                    );
                  })}
                  {filteredTeachers.filter(t => t.id !== selId && t.name.toLowerCase().includes(copySearch.toLowerCase())).length === 0 && (
                    <div className="text-center py-6 text-xs font-bold text-slate-400">
                      {copySearch ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد معلمين آخرين للنسخ إليهم'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 bg-white border-t border-slate-100">
              {copySuccess ? (
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-black">
                  <CheckCircle2 size={18} />
                  <span>تم نسخ القيود بنجاح إلى {copyTargets.length} معلم</span>
                </div>
              ) : copyConfirm ? (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                      ستُستبدل القيود المحددة لـ <span className="font-black">{copyTargets.length} معلم</span> بقيود <span className="font-black">{selTeacher.name}</span>. هل أنت متأكد؟
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCopyConfirm(false)}
                      className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-50 transition-all"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => {
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
                        setCopyConfirm(false);
                        setCopySuccess(true);
                        setTimeout(() => {
                          setCopySuccess(false);
                          setCopyTargets([]);
                          setShowCopyModal(false);
                        }, 1400);
                      }}
                      className="flex-[2] py-2.5 bg-[#655ac1] text-white rounded-xl text-xs font-black hover:bg-[#4b3f9f] transition-all flex items-center justify-center gap-2"
                    >
                      <Check size={14} strokeWidth={3} /> تأكيد النسخ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowCopyModal(false)}
                    className="px-5 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-xl text-sm font-black hover:bg-slate-50 transition-all"
                  >
                    إغلاق
                  </button>
                  <button
                    disabled={copyTargets.length === 0}
                    onClick={() => setCopyConfirm(true)}
                    className="px-5 py-2.5 bg-[#655ac1] text-white rounded-xl text-sm font-black hover:bg-[#655ac1] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <Copy size={16} /> تطبيق النسخ {copyTargets.length > 0 ? `على ${copyTargets.length} معلم` : ''}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
