import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Teacher, Specialization, TeacherConstraint, ClassInfo, Phase } from '../../types';
import { Users, User, Search, AlertTriangle, X, Sliders, Ban, Clock, Repeat, ChevronDown, Check, CheckCircle2, RotateCcw, MapPin, Coffee, Sparkles, Eye, Rows3, Copy } from 'lucide-react';
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

type ConstraintDropdownOption = { id: string; name: string };

const ConstraintSelectDropdown: React.FC<{
  value?: string;
  options: ConstraintDropdownOption[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}> = ({ value, options, onChange, placeholder, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.id === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative w-full" ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 text-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed disabled:hover:border-slate-200 ${open ? 'ring-2 ring-[#8779fb]/20 border-[#655ac1]/40' : ''}`}
      >
        <span className="truncate leading-tight">{selected?.name || placeholder}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <div className="absolute z-50 top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5">
          <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-colors text-slate-500 hover:bg-slate-50"
              >
                بدون اختيار
              </button>
            )}
            {options.map(opt => {
              const active = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { onChange(active ? '' : opt.id); setOpen(false); }}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center justify-between gap-3 ${active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}
                >
                  <span className="whitespace-nowrap">{opt.name}</span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                    <Check size={12} strokeWidth={3.5} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Component ---
interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTeacherId?: string | null;
  initialOpenSection?: 'c1' | 'c2' | 'c5' | 'c6' | 'c7' | null;
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

  // --- State ---
  const [selId, setSelId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'spec' | 'alpha'>('spec');
  const [specFilter, setSpecFilter] = useState('');

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
  const [quickFilter, setQuickFilter] = useState<'all' | 'has' | 'none' | 'excluded'>('all');
  const [collapsedSpecs, setCollapsedSpecs] = useState<Set<string>>(new Set());

  // Auto-collapse all specialization groups when the modal opens
  useEffect(() => {
    if (isOpen && sortBy === 'spec') {
      setCollapsedSpecs(new Set(usedSpecIds.concat(['__none__'])));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sortBy]);

  // Sections Expansions
  const [open, setOpen] = useState<Record<string, boolean>>({ c1: false, c2: false, c5: false, c6: false, c7: false });

  // Copy-constraints panel (overlay inside this modal — copies the selected teacher's constraints to others)
  const [showCopyPanel, setShowCopyPanel] = useState(false);
  const [copyTargets, setCopyTargets] = useState<string[]>([]);
  const [copyTypes, setCopyTypes] = useState({ consec: true, excluded: true, early: true });
  const [copySearch, setCopySearch] = useState('');
  const [copySpecFilter, setCopySpecFilter] = useState('');
  const [copyEarlyMode, setCopyEarlyMode] = useState<'manual' | 'auto'>('auto');
  const [copyDone, setCopyDone] = useState<{ applied: number; adjusted: number; skipped: number } | null>(null);
  const [earlyDraftDay, setEarlyDraftDay] = useState<Record<string, string>>({});

  // Sync open sections when initialOpenSection prop changes (e.g. when modal is reopened with a different target)
  useEffect(() => {
    if (isOpen && initialOpenSection) {
      setOpen(prev => ({ ...prev, [initialOpenSection]: true }));
    }
  }, [isOpen, initialOpenSection]);

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

  const getTeacherAvailableSlots = (
    teacherId: string,
    override?: { day: string; period: number }
  ) => {
    const c = getC(teacherId);
    return days.reduce((sum, day) => {
      const dayCount = dayLastPeriods[day] ?? safePeriodsCount;
      const end = override?.day === day ? Math.min(dayCount, override.period) : dayCount;
      const excluded = new Set((c.excludedSlots?.[day] || []).filter(p => p >= 1 && p <= end));
      return sum + Math.max(0, end - excluded.size);
    }, 0);
  };

  const evaluateEarlyExit = (
    teacher: Teacher,
    mode: 'manual' | 'auto',
    day: string,
    requestedPeriod: number
  ): { status: 'empty' | 'ok' | 'adjust' | 'impossible'; suggestedDay?: string; suggestedPeriod?: number } => {
    if (!requestedPeriod || (mode === 'manual' && !day)) return { status: 'empty' };
    const quota = teacher.quotaLimit || 0;
    const candidateDays = mode === 'manual' ? [day] : days;

    const works = (candidateDay: string, period: number) => {
      const dayCount = dayLastPeriods[candidateDay] ?? safePeriodsCount;
      if (period >= dayCount) return false;
      return getTeacherAvailableSlots(teacher.id, { day: candidateDay, period }) >= quota;
    };

    for (const candidateDay of candidateDays) {
      if (works(candidateDay, requestedPeriod)) {
        return { status: 'ok', suggestedDay: candidateDay, suggestedPeriod: requestedPeriod };
      }
    }

    const maxCandidate = Math.max(...candidateDays.map(d => Math.max(1, (dayLastPeriods[d] ?? safePeriodsCount) - 1)));
    for (let period = requestedPeriod + 1; period <= maxCandidate; period++) {
      for (const candidateDay of candidateDays) {
        if (works(candidateDay, period)) {
          return { status: 'adjust', suggestedDay: candidateDay, suggestedPeriod: period };
        }
      }
    }

    return { status: 'impossible' };
  };

  // --- Copy the selected teacher's constraints to a group of teachers ---
  const openCopyPanel = () => {
    if (!selId) return;
    const c = getC(selId);
    const excludedCount = days.reduce((sum, d) =>
      sum + (c.excludedSlots?.[d] || []).filter(p => p >= 1 && p <= (dayLastPeriods[d] ?? safePeriodsCount)).length, 0);
    const hasEarly = !!c.earlyExitMode && !!c.earlyExit && Object.keys(c.earlyExit).length > 0;
    setCopyTypes({ consec: true, excluded: excludedCount > 0, early: hasEarly });
    setCopyEarlyMode((c.earlyExitMode as 'manual' | 'auto') || 'auto');
    setCopyTargets([]);
    setCopySearch('');
    setCopySpecFilter('');
    setCopyDone(null);
    setShowCopyPanel(true);
  };

  const runCopyConstraints = () => {
    if (!selId || copyTargets.length === 0) return;
    const src = getC(selId);
    const srcDay = src.earlyExit ? Object.keys(src.earlyExit)[0] || '' : '';
    const srcPeriod = src.earlyExit ? Object.values(src.earlyExit)[0] || 0 : 0;
    const next = [...constraints];
    let adjusted = 0;
    let skipped = 0;

    copyTargets.forEach(tid => {
      const idx = next.findIndex(c => c.teacherId === tid);
      const base = (idx >= 0 ? { ...next[idx] } : { teacherId: tid, maxConsecutive: 2, excludedSlots: {} }) as TeacherConstraint;
      if (copyTypes.consec) base.maxConsecutive = src.maxConsecutive ?? 2;
      if (copyTypes.excluded) {
        base.excludedSlots = Object.fromEntries(
          Object.entries(src.excludedSlots || {}).map(([day, slots]) => [day, [...(slots || [])]])
        ) as Record<string, number[]>;
      }
      if (copyTypes.early && srcPeriod) {
        const teacher = teachers.find(t => t.id === tid);
        const result = teacher ? evaluateEarlyExit(teacher, copyEarlyMode, srcDay, srcPeriod) : { status: 'impossible' as const };
        if (result.status === 'impossible' || result.status === 'empty' || !result.suggestedPeriod) {
          skipped++;
        } else {
          const targetDay = copyEarlyMode === 'auto' ? (result.suggestedDay || days[0]) : srcDay;
          base.earlyExitMode = copyEarlyMode;
          base.earlyExit = { [targetDay]: result.suggestedPeriod };
          if (result.status === 'adjust') adjusted++;
        }
      }
      if (idx >= 0) next[idx] = base;
      else next.push(base);
    });

    onChangeConstraints(next);
    setCopyDone({ applied: copyTargets.length, adjusted, skipped });
    setTimeout(() => { setShowCopyPanel(false); setCopyDone(null); }, 1900);
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
    if (specFilter && t.specializationId !== specFilter) return false;
    const hasC = constraints.some(c => c.teacherId === t.id && (
      (c.maxConsecutive !== undefined && c.maxConsecutive !== 2) ||
      (c.excludedSlots && Object.values(c.excludedSlots).some(arr => arr && arr.length > 0)) ||
      (c.earlyExit && Object.keys(c.earlyExit).length > 0)
    ));
    const isExcluded = (t.quotaLimit || 0) === 0;
    if (quickFilter === 'has') return hasC && !isExcluded;
    if (quickFilter === 'none') return !hasC && !isExcluded;
    if (quickFilter === 'excluded') return isExcluded;
    return true;
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
      <div className={`relative bg-slate-50 w-full ${singleTeacherMode ? 'max-w-3xl' : 'max-w-6xl'} h-[92vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200`}>

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
            {/* Search & Specialization filter — unified with apply-quota modal */}
            <div className="p-3 border-b border-slate-100 space-y-2.5">
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ابحث باسم المعلم"
                  className="w-full pr-10 pl-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20 transition-all"
                />
              </div>
              <ConstraintSelectDropdown
                value={specFilter}
                onChange={setSpecFilter}
                options={[{ id: '', name: 'كل التخصصات' }, ...usedSpecIds.map(id => ({ id, name: specializations.find(s => s.id === id)?.name || INITIAL_SPECIALIZATIONS.find(s => s.id === id)?.name || 'بدون تخصص' }))]}
                placeholder="كل التخصصات"
              />
            </div>
            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredTeachers.length === 0 ? (
                <div className="text-center py-8 text-xs font-bold text-slate-400">لا يوجد معلمين</div>
              ) : filteredTeachers.map(t => {
                const spName = specializations.find(s => s.id === t.specializationId)?.name
                  || INITIAL_SPECIALIZATIONS.find(s => s.id === t.specializationId)?.name
                  || 'بدون تخصص';
                const selected = selId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelId(selected ? null : t.id)}
                    className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${selected ? 'border-slate-300 bg-white shadow-sm' : 'border-transparent hover:bg-slate-50'}`}
                  >
                    <span className="min-w-0">
                      <span className={`block text-sm font-black truncate ${selected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{t.name}</span>
                      <span className={`block text-[11px] font-bold truncate ${selected ? 'text-slate-400' : 'text-[#655ac1]'}`}>{spName}</span>
                    </span>
                    <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 ${selected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'}`}>
                      <Check size={12} strokeWidth={3.5} />
                    </span>
                  </button>
                );
              })}
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
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-black text-slate-800">{selTeacher.name}</h3>
                    {!singleTeacherMode && teachers.length > 1 && (
                      <button
                        onClick={openCopyPanel}
                        className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-600 text-xs font-black hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white transition-all"
                      >
                        <Copy size={14} />
                        نسخ القيود إلى معلمين
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-transparent border border-slate-300 text-slate-600">التخصص: {specializations.find(s=>s.id===selTeacher.specializationId)?.name || 'عام'}</span>
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-transparent border border-slate-300 text-slate-600">نصاب الحصص: {selTeacher.quotaLimit}</span>
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-transparent border border-slate-300 text-slate-600">نصاب الانتظار: {selTeacher.waitingQuota ?? 0}</span>
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
                            <div className="text-[10px] text-slate-500 font-bold">الحد الأدنى والأقصى للحصص المتتابعة</div>
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
                                  <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-colors ${
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
                            <div className="text-[10px] text-slate-500 font-bold">الحصص التي لا تُسند لمعلم/ة</div>
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
                                كثرة الحصص المستثناة قد تقلل فرص إنشاء جدول مكتمل لهذا المعلم.
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
                                              {isEx ? <X size={10} strokeWidth={3.5} /> : <Check size={10} strokeWidth={3.5} />}
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

                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 5. Early Exit — unified card */}
                {(() => {
                  const mode = sc?.earlyExitMode as 'manual' | 'auto' | undefined;
                  const selectedDay = (sc?.earlyExit ? Object.keys(sc.earlyExit)[0] || '' : '') || earlyDraftDay[selTeacher.id] || '';
                  const selectedPeriod = sc?.earlyExit ? Object.values(sc.earlyExit)[0] || 0 : 0;
                  const evalMode = mode || 'manual';
                  const earlyResult = evaluateEarlyExit(selTeacher, evalMode, selectedDay, selectedPeriod);
                  const earlySummary = [selTeacher].reduce((acc, teacher) => {
                    const result = evaluateEarlyExit(teacher, evalMode, selectedDay, selectedPeriod);
                    if (result.status === 'ok') acc.ok++;
                    else if (result.status === 'adjust') acc.adjust++;
                    else if (result.status === 'impossible') acc.impossible++;
                    return acc;
                  }, { ok: 0, adjust: 0, impossible: 0 });
                  const hasSelection = !!mode && selectedPeriod > 0 && (mode === 'auto' || !!selectedDay);

                  return (
                    <div className={`bg-white rounded-2xl border transition-all ${open.c5 ? 'border-slate-300 shadow-md' : 'border-slate-200 shadow-sm'}`}>
                      <button
                        onClick={() => setOpen(prev => ({ ...prev, c5: !prev.c5 }))}
                        className="w-full flex items-center justify-between p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#655ac1]">
                            <Clock size={21} />
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-slate-800">الخروج المبكر</div>
                            <div className="text-[10px] text-slate-500 font-bold">منح المعلم/ة يومًا ينتهي فيه/ا جدوله مبكرًا قدر الإمكان</div>
                          </div>
                        </div>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open.c5 ? 'rotate-180' : ''}`} />
                      </button>
                      {open.c5 && (
                        <div className="px-5 pb-5 pt-1 space-y-5 border-t border-slate-100">
                          <div className="pt-3 flex flex-wrap gap-2">
                            {[
                              { mode: 'auto' as const, title: 'توزيع آلي' },
                              { mode: 'manual' as const, title: 'تحديد يدوي' },
                            ].map(item => {
                              const active = mode === item.mode;
                              return (
                                <button
                                  key={item.mode}
                                  type="button"
                                  onClick={() => {
                                    if (active) {
                                      setEarlyDraftDay(prev => ({ ...prev, [selTeacher.id]: '' }));
                                      updC(selTeacher.id, { earlyExitMode: undefined, earlyExit: {} });
                                      return;
                                    }
                                    updC(selTeacher.id, { earlyExitMode: item.mode, earlyExit: {} });
                                  }}
                                  className={`inline-flex items-center justify-center px-4 py-2 rounded-xl border font-bold text-xs transition-all ${
                                    active
                                      ? 'bg-[#5448a8] border-[#5448a8] text-white shadow-md shadow-[#5448a8]/15'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white'
                                  }`}
                                >
                                  {item.title}
                                </button>
                              );
                            })}
                          </div>

                          <div className="bg-white rounded-2xl p-3 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {mode === 'manual' && (
                              <div>
                                <label className="text-xs font-black text-slate-600 block mb-2">اليوم المطلوب</label>
                                <ConstraintSelectDropdown
                                  value={selectedDay}
                                  placeholder="اختر اليوم"
                                  options={days.map(day => ({ id: day, name: getDayLabel(day) }))}
                                  onChange={day => {
                                    setEarlyDraftDay(prev => ({ ...prev, [selTeacher.id]: day }));
                                    if (!day) { updC(selTeacher.id, { earlyExit: {} }); return; }
                                    updC(selTeacher.id, { earlyExitMode: 'manual', earlyExit: selectedPeriod ? { [day]: selectedPeriod } : {} });
                                  }}
                                />
                              </div>
                            )}

                            {mode ? (
                            <div className={mode === 'manual' ? '' : 'md:col-span-2'}>
                              <label className="text-xs font-black text-slate-600 block mb-2">الخروج بعد الحصة</label>
                              <ConstraintSelectDropdown
                                value={selectedPeriod ? String(selectedPeriod) : ''}
                                placeholder="اختر رقم الحصة"
                                disabled={mode === 'manual' && !selectedDay}
                                options={periods.slice(0, -1).map(period => ({ id: String(period), name: `الحصة ${period}` }))}
                                onChange={value => {
                                  const period = Number(value);
                                  if (!period) { updC(selTeacher.id, { earlyExit: {} }); return; }
                                  const targetDay = selectedDay || days[0] || '';
                                  updC(selTeacher.id, { earlyExitMode: mode, earlyExit: { [targetDay]: period } });
                                }}
                              />
                            </div>
                            ) : (
                              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                                اختر طريقة الخروج المبكر عند الحاجة، أو اتركها بدون اختيار.
                              </div>
                            )}
                          </div>

                          {hasSelection && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                  <div className="text-lg font-black text-emerald-600">{earlySummary.ok}</div>
                                  <div className="text-[10px] font-bold text-slate-500">قابل للتطبيق</div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                  <div className="text-lg font-black text-amber-600">{earlySummary.adjust}</div>
                                  <div className="text-[10px] font-bold text-slate-500">يحتاج تعديل</div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                  <div className="text-lg font-black text-rose-600">{earlySummary.impossible}</div>
                                  <div className="text-[10px] font-bold text-slate-500">غير ممكن</div>
                                </div>
                              </div>

                              {earlyResult.status === 'adjust' && earlyResult.suggestedPeriod && (
                                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-800">
                                  <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                                  <span className="leading-relaxed">لا يمكن تحقيق الخروج بعد الحصة {selectedPeriod}. أقرب خيار ممكن: بعد الحصة {earlyResult.suggestedPeriod}.</span>
                                </div>
                              )}
                              {earlySummary.adjust > 0 && (
                                <div className="text-[11px] font-bold text-slate-500 leading-relaxed">سيتم اعتماد أقرب حصة ممكنة لمن يحتاج تعديلًا عند التطبيق على المجموعة.</div>
                              )}
                              {earlyResult.status === 'impossible' && (
                                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700">
                                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                                  <span className="leading-relaxed">لا يمكن تطبيق الخروج المبكر لهذا المعلم بهذه القيود. يمكن استثناؤه من الخروج المبكر.</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
                {selTeacher?.isShared && (selTeacher.schools?.length ?? 0) > 0 && (
                  <div className={`bg-white rounded-2xl border transition-all ${open.c7 ? 'border-slate-300 shadow-md' : 'border-slate-200 shadow-sm'}`}>
                    <button
                      onClick={() => setOpen(prev => ({ ...prev, c7: !prev.c7 }))}
                      className="w-full flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#655ac1]">
                          <MapPin size={21} />
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-slate-800">أيام التواجد</div>
                          <div className="text-[10px] text-slate-500 font-bold">تحديد الأيام التي يتواجد فيها المعلم/ة في كل مدرسة</div>
                        </div>
                      </div>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform ${open.c7 ? 'rotate-180' : ''}`} />
                    </button>

                    {open.c7 && (() => {
                        const rawSchools = selTeacher.schools ?? [];
                        const hasMain = rawSchools.some(s => s.schoolId === 'main');
                        const schools = hasMain
                          ? rawSchools.map(s => s.schoolId === 'main' ? { ...s, schoolName: mainSchoolName } : s)
                          : [{ schoolId: 'main', schoolName: mainSchoolName, subjects: [], classes: [] }, ...rawSchools];
                        const presenceDays = sc?.presenceDays ?? {};
                        const hasPresence = Object.keys(presenceDays).some(id => (presenceDays[id] || []).length > 0);
                        const selectedByOthers = (schoolId: string) => new Set(
                          schools
                            .filter(s => s.schoolId !== schoolId)
                            .flatMap(s => presenceDays[s.schoolId] || [])
                        );
                        const getEffectiveDays = (schoolId: string) => {
                          if (!hasPresence) return schoolId === 'main' ? days : [];
                          if (schoolId === 'main') {
                            return days.filter(day => !selectedByOthers('main').has(day));
                          }
                          return presenceDays[schoolId] || [];
                        };

                        const applyPresence = (schoolId: string, day: string) => {
                          const currentForSchool = getEffectiveDays(schoolId);
                          const removing = currentForSchool.includes(day);
                          const next: Record<string, string[]> = {};
                          schools.forEach(s => {
                            if (s.schoolId === 'main') return;
                            const current = presenceDays[s.schoolId] || [];
                            next[s.schoolId] = s.schoolId === schoolId
                              ? (removing ? current.filter(d => d !== day) : Array.from(new Set([...current, day])))
                              : current.filter(d => d !== day);
                          });
                          next.main = days.filter(d => !schools.some(s => s.schoolId !== 'main' && (next[s.schoolId] || []).includes(d)));
                          const cleaned = Object.fromEntries(
                            Object.entries(next).filter(([, value]) => value.length > 0)
                          ) as Record<string, string[]>;
                          updC(selId!, { presenceDays: cleaned });
                        };

                        const resetPresence = () => updC(selId!, { presenceDays: {} });
                        const hasSharedSchoolWithoutDays = schools.some(s => s.schoolId !== 'main' && getEffectiveDays(s.schoolId).length === 0);

                        return (
                          <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100">
                            <div className="pt-3 flex items-center justify-between gap-3">
                              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                                اختر الأيام التي يتواجد فيها المعلم/ة في كل مدرسة.
                              </p>
                              <button
                                type="button"
                                onClick={resetPresence}
                                disabled={!hasPresence}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-500 text-xs font-black hover:border-[#5448a8] hover:text-[#5448a8] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-300 disabled:hover:text-slate-500 transition-all"
                              >
                                <RotateCcw size={14} />
                                إعادة التعيين
                              </button>
                            </div>

                            <div className="overflow-x-auto custom-scrollbar">
                              <div className="min-w-[620px] rounded-2xl border border-slate-200 overflow-hidden bg-white">
                                <div className="grid bg-slate-50 border-b border-slate-200" style={{ gridTemplateColumns: `160px repeat(${days.length}, minmax(72px, 1fr)) 72px` }}>
                                  <div className="px-3 py-2 text-[10px] font-black text-slate-400 border-l border-slate-200">المدرسة</div>
                                  {days.map(day => (
                                    <div key={day} className="px-2 py-2 text-center text-[10px] font-black text-slate-500 border-l border-slate-200">
                                      {getDayLabel(day)}
                                    </div>
                                  ))}
                                  <div className="px-2 py-2 text-center text-[10px] font-black text-slate-400">الأيام</div>
                                </div>

                                {schools.map((school, idx) => {
                                  const effectiveDays = getEffectiveDays(school.schoolId);
                                  const isMainSchool = school.schoolId === 'main';
                                  return (
                                    <div
                                      key={school.schoolId}
                                      className={`grid ${idx < schools.length - 1 ? 'border-b border-slate-200' : ''}`}
                                      style={{ gridTemplateColumns: `160px repeat(${days.length}, minmax(72px, 1fr)) 72px` }}
                                    >
                                      <div className="px-3 py-3 border-l border-slate-200 flex flex-col justify-center">
                                        <span className="text-xs font-black text-slate-800 truncate">{school.schoolName}</span>
                                        <span className="text-[11px] font-black text-[#655ac1] mt-0.5">{isMainSchool ? 'الرئيسية' : 'المشتركة'}</span>
                                      </div>
                                      {days.map(day => {
                                        const selected = effectiveDays.includes(day);
                                        return (
                                          <div key={day} className="px-2 py-2 border-l border-slate-200 flex items-center justify-center">
                                            <button
                                              type="button"
                                              onClick={() => applyPresence(school.schoolId, day)}
                                              className={`w-full h-8 rounded-xl text-[11px] font-black transition-all flex items-center justify-center ${
                                                selected
                                                  ? 'bg-white text-white'
                                                  : 'bg-white text-slate-400 hover:bg-slate-50'
                                              }`}
                                            >
                                              {selected ? (
                                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1] mx-auto">
                                                  <Check size={13} strokeWidth={3.2} className="text-white" />
                                                </span>
                                              ) : (
                                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 bg-white mx-auto" />
                                              )}
                                            </button>
                                          </div>
                                        );
                                      })}
                                      <div className="px-2 py-2 flex items-center justify-center">
                                        <span className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-black text-[#655ac1]">
                                          {effectiveDays.length}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {hasSharedSchoolWithoutDays && (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-bold leading-relaxed flex items-start gap-2">
                                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                <span>حاول إسناد أيام كافية للمعلم في كل مدرسة حتى يمكن إسناد حصصه بشكل صحيح.</span>
                              </div>
                            )}
                          </div>
                        );
                    })()}
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

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
            <CheckCircle2 size={16} />
            حفظ
          </button>
        </div>

        {/* --- Copy constraints overlay (slides over this modal, no second backdrop) --- */}
        {showCopyPanel && selTeacher && (() => {
          const src = sc || getC(selId!);
          const consecVal = src.maxConsecutive ?? 2;
          const consecText = consecVal === 1 ? 'حصة واحدة ثم راحة' : consecVal === 2 ? 'حصتان متتاليتان ثم راحة' : `${consecVal} حصص متتالية ثم راحة`;
          const exChips = days.flatMap(d => (src.excludedSlots?.[d] || [])
            .filter(p => p >= 1 && p <= (dayLastPeriods[d] ?? safePeriodsCount))
            .map(p => `${getDayLabel(d)} · ح${p}`));
          const hasExcluded = exChips.length > 0;
          const earlyDay = src.earlyExit ? Object.keys(src.earlyExit)[0] || '' : '';
          const earlyPeriod = src.earlyExit ? Object.values(src.earlyExit)[0] || 0 : 0;
          const hasEarly = !!src.earlyExitMode && earlyPeriod > 0;
          const earlyText = hasEarly ? `${getDayLabel(earlyDay)} · ح${earlyPeriod}` : 'غير محدد لهذا المعلم';

          const term = copySearch.toLowerCase().trim();
          const copyList = teachers.filter(t => t.id !== selId).filter(t => {
            const sName = specializations.find(s => s.id === t.specializationId)?.name
              || INITIAL_SPECIALIZATIONS.find(s => s.id === t.specializationId)?.name || '';
            const okSearch = !term || t.name.toLowerCase().includes(term) || sName.toLowerCase().includes(term);
            const okSpec = !copySpecFilter || t.specializationId === copySpecFilter;
            return okSearch && okSpec;
          });
          const allCopyVisible = copyList.length > 0 && copyList.every(t => copyTargets.includes(t.id));
          const anyTypeOn = copyTypes.consec || (copyTypes.excluded && hasExcluded) || (copyTypes.early && hasEarly);

          const rows: { key: 'consec' | 'excluded' | 'early'; label: string; value: string; enabled: boolean }[] = [
            { key: 'consec', label: 'الحصص المتتالية', value: consecText, enabled: true },
            { key: 'excluded', label: 'الحصص المستثناة', value: hasExcluded ? exChips.join('، ') : 'لا توجد حصص مستثناة', enabled: hasExcluded },
            { key: 'early', label: 'الخروج المبكر', value: earlyText, enabled: hasEarly },
          ];

          const previewParts: string[] = [];
          if (copyTypes.consec) previewParts.push(consecText);
          if (copyTypes.excluded && hasExcluded) previewParts.push(`مستثناة (${exChips.join('، ')})`);
          if (copyTypes.early && hasEarly) previewParts.push(`خروج مبكر (${earlyText})`);

          return (
            <div className="absolute inset-0 z-[60] bg-white flex flex-col rounded-[2rem] overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowCopyPanel(false)} className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-[#655ac1] hover:bg-slate-50 transition-colors" title="رجوع للقيود">
                    <ChevronDown size={18} className="-rotate-90" />
                  </button>
                  <div>
                    <div className="text-base font-black text-slate-800">نسخ القيود إلى معلمين</div>
                    <div className="text-[11px] font-bold text-slate-400 mt-0.5">فعّل القيود واختر المعلمين المستهدفين.</div>
                  </div>
                </div>
                <button onClick={() => setShowCopyPanel(false)} className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="إغلاق">
                  <X size={18} />
                </button>
              </div>

              {copyDone ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 gap-3">
                  <div className="w-16 h-16 rounded-full border border-slate-200 flex items-center justify-center text-[#655ac1]"><CheckCircle2 size={34} /></div>
                  <p className="text-lg font-black text-slate-800">تم نسخ القيود إلى {copyDone.applied} معلم</p>
                  {(copyTypes.early && hasEarly && (copyDone.adjusted > 0 || copyDone.skipped > 0)) && (
                    <p className="text-xs font-bold text-slate-500">الخروج المبكر: عُدّل {copyDone.adjusted}، واستُثني {copyDone.skipped}.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] min-h-0 flex-1">
                  {/* Targets sidebar */}
                  <div className="border-l border-slate-100 p-4 space-y-3 bg-slate-50/40 overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="relative shrink-0">
                      <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={copySearch}
                        onChange={e => setCopySearch(e.target.value)}
                        placeholder="ابحث باسم المعلم"
                        className="w-full pr-10 pl-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20 transition-all"
                      />
                    </div>
                    <ConstraintSelectDropdown
                      value={copySpecFilter}
                      onChange={setCopySpecFilter}
                      options={[{ id: '', name: 'كل التخصصات' }, ...usedSpecIds.map(id => ({ id, name: specializations.find(s => s.id === id)?.name || INITIAL_SPECIALIZATIONS.find(s => s.id === id)?.name || 'بدون تخصص' }))]}
                      placeholder="كل التخصصات"
                    />
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col min-h-0 flex-1">
                      <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
                        <span className="text-[11px] font-black text-[#655ac1] border border-slate-200 bg-white px-2.5 py-1 rounded-full">{copyTargets.length} محدد</span>
                        <button
                          type="button"
                          onClick={() => setCopyTargets(allCopyVisible ? copyTargets.filter(id => !copyList.some(t => t.id === id)) : Array.from(new Set([...copyTargets, ...copyList.map(t => t.id)])))}
                          disabled={copyList.length === 0}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${copyList.length === 0 ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-300 text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white'}`}
                        >
                          {allCopyVisible ? 'إلغاء الكل' : 'اختيار الكل'}
                        </button>
                      </div>
                      <div className="overflow-y-auto custom-scrollbar p-2 space-y-1 flex-1">
                        {copyList.length === 0 ? (
                          <div className="py-8 text-center text-xs font-bold text-slate-400">لا يوجد معلمين</div>
                        ) : copyList.map(t => {
                          const spName = specializations.find(s => s.id === t.specializationId)?.name
                            || INITIAL_SPECIALIZATIONS.find(s => s.id === t.specializationId)?.name || 'بدون تخصص';
                          const selected = copyTargets.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setCopyTargets(prev => selected ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                              className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${selected ? 'border-slate-300 bg-white shadow-sm' : 'border-transparent hover:bg-slate-50'}`}
                            >
                              <span className="min-w-0">
                                <span className={`block text-sm font-black truncate ${selected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{t.name}</span>
                                <span className={`block text-[11px] font-bold truncate ${selected ? 'text-slate-400' : 'text-[#655ac1]'}`}>{spName}</span>
                              </span>
                              <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 ${selected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'}`}>
                                <Check size={12} strokeWidth={3.5} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Constraints + preview */}
                  <div className="min-w-0 flex flex-col overflow-y-auto custom-scrollbar">
                    <div className="p-6 w-full max-w-xl mx-auto space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-white border border-slate-200">
                          <User size={14} className="text-[#655ac1] shrink-0" />
                          <span className="text-[11px] font-bold text-slate-500">القيود المنسوخة من</span>
                          <span className="text-sm font-black text-[#655ac1] truncate">{selTeacher.name}</span>
                        </div>
                        <label className="block text-xs font-black text-slate-600 mb-0.5">القيود المنسوخة</label>
                        <p className="text-[11px] font-medium text-slate-400 mb-3">فعّل القيد لنسخ قيمته الفعلية إلى المعلمين المحددين.</p>
                        <div className="space-y-2.5">
                          {rows.map(row => {
                            const active = copyTypes[row.key] && row.enabled;
                            return (
                              <div
                                key={row.key}
                                className={`rounded-xl border transition-all ${active ? 'border-slate-300 shadow-sm' : 'border-slate-200'} ${row.enabled ? '' : 'opacity-60'}`}
                              >
                                <button
                                  type="button"
                                  disabled={!row.enabled}
                                  onClick={() => setCopyTypes(prev => ({ ...prev, [row.key]: !prev[row.key] }))}
                                  className={`w-full text-right flex items-start gap-3 px-3 py-2.5 ${row.enabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                >
                                  <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 inline-flex items-center justify-center transition-colors ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                                    <Check size={12} strokeWidth={3.5} />
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    <span className={`block text-sm font-black ${active ? 'text-slate-700' : 'text-slate-400'}`}>{row.label}</span>
                                    <span className={`block text-xs font-bold mt-0.5 leading-relaxed ${active ? 'text-[#655ac1]' : 'text-slate-400'}`}>{row.value}</span>
                                  </span>
                                </button>
                                {row.key === 'early' && active && (
                                  <div className="px-3 pb-3 pt-0">
                                    <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
                                      {[
                                        { m: 'auto' as const, t: 'توزيع آلي' },
                                        { m: 'manual' as const, t: 'تحديد يدوي' },
                                      ].map(it => (
                                        <button
                                          key={it.m}
                                          type="button"
                                          onClick={() => setCopyEarlyMode(it.m)}
                                          className={`py-2 rounded-xl text-xs font-black transition-all ${copyEarlyMode === it.m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                          {it.t}
                                        </button>
                                      ))}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1.5 leading-relaxed">
                                      {copyEarlyMode === 'auto' ? 'يختار النظام أنسب يوم لكل معلم تلقائيًا.' : 'يُطبَّق نفس اليوم والحصة، مع أقرب بديل ممكن لمن لا يناسبه.'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 px-4 py-3">
                        {anyTypeOn ? (
                          <div className="text-sm font-bold text-slate-800 leading-relaxed">
                            <p className="mb-2">سيُنسَخ:</p>
                            <ul className="flex flex-col gap-1.5 mb-3">
                              {previewParts.map((part, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#655ac1] inline-block shrink-0 mt-1.5" />
                                  <span>{part}</span>
                                </li>
                              ))}
                            </ul>
                            <p className="pt-2 border-t border-slate-100 text-slate-600">
                              إلى <span className="font-black text-[#655ac1]">{copyTargets.length}</span> معلم.
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-slate-500">فعّل قيدًا واحدًا على الأقل لنسخه.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!copyDone && (
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-white">
                  <button onClick={() => setShowCopyPanel(false)} className="px-6 py-2.5 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors inline-flex items-center gap-2">
                    <ChevronDown size={16} className="-rotate-90" />
                    رجوع
                  </button>
                  <button
                    onClick={runCopyConstraints}
                    disabled={copyTargets.length === 0 || !anyTypeOn}
                    className="px-8 py-3 bg-[#655ac1] text-white font-black text-sm rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
                  >
                    <Copy size={16} />
                    نسخ القيود
                  </button>
                </div>
              )}
            </div>
          );
        })()}

      </div>

    </div>
  );
}


