import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Teacher, Specialization, TeacherConstraint, ClassInfo, Phase } from '../../types';
import { Users, Search, AlertTriangle, X, Sliders, Ban, Clock, Repeat, GripVertical, ChevronUp, ChevronDown, Check, CheckCircle2, RotateCcw, MapPin, Coffee, Sparkles, Eye, Rows3, Lightbulb } from 'lucide-react';
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

  // Generic sidebar apply-mode (multi-select against the right sidebar)
  const [applyMode, setApplyMode] = useState<null | 'consec' | 'excluded' | 'early'>(null);
  const [applySelection, setApplySelection] = useState<string[]>([]);
  const [consecApplyDone, setConsecApplyDone] = useState<{ count: number; value: number } | null>(null);
  const [excludedApplyDone, setExcludedApplyDone] = useState<{ count: number } | null>(null);
  const [earlyApplyDone, setEarlyApplyDone] = useState<{ applied: number; adjusted: number; skipped: number } | null>(null);
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

  const applyEarlyExitToSelection = (
    mode: 'manual' | 'auto',
    day: string,
    period: number,
    ids: string[]
  ) => {
    if (ids.length === 0 || !period || (mode === 'manual' && !day)) return;
    const next = [...constraints];
    let applied = 0;
    let adjusted = 0;
    let skipped = 0;

    ids.forEach(tid => {
      const teacher = teachers.find(t => t.id === tid);
      if (!teacher) return;
      const result = evaluateEarlyExit(teacher, mode, day, period);
      if (result.status === 'impossible' || result.status === 'empty' || !result.suggestedPeriod) {
        skipped++;
        return;
      }
      const targetDay = mode === 'auto' ? (result.suggestedDay || days[0]) : day;
      const idx = next.findIndex(c => c.teacherId === tid);
      const updated = {
        ...(idx >= 0 ? next[idx] : { teacherId: tid, maxConsecutive: 2, excludedSlots: {} }),
        earlyExitMode: mode,
        earlyExit: { [targetDay]: result.suggestedPeriod },
      } as TeacherConstraint;
      if (idx >= 0) next[idx] = updated;
      else next.push(updated);
      applied++;
      if (result.status === 'adjust') adjusted++;
    });

    onChangeConstraints(next);
    setApplyMode(null);
    setApplySelection([]);
    setEarlyApplyDone({ applied, adjusted, skipped });
    setTimeout(() => setEarlyApplyDone(null), 3200);
  };

  const toggleApplyTarget = (id: string) => {
    setApplySelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const exitApplyMode = () => {
    setApplyMode(null);
    setApplySelection([]);
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
                if (applyMode === 'early') {
                  const mode = (sc?.earlyExitMode || 'manual') as 'manual' | 'auto';
                  const day = sc?.earlyExit ? Object.keys(sc.earlyExit)[0] || '' : '';
                  const period = sc?.earlyExit ? Object.values(sc.earlyExit)[0] || 0 : 0;
                  applyEarlyExitToSelection(mode, day, period, applySelection);
                }
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
                                              {isEx ? <X size={11} strokeWidth={3.5} /> : <Check size={11} strokeWidth={3.5} />}
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

                {/* 5. Early Exit — unified card */}
                {(() => {
                  const mode = sc?.earlyExitMode as 'manual' | 'auto' | undefined;
                  const selectedDay = (sc?.earlyExit ? Object.keys(sc.earlyExit)[0] || '' : '') || earlyDraftDay[selTeacher.id] || '';
                  const selectedPeriod = sc?.earlyExit ? Object.values(sc.earlyExit)[0] || 0 : 0;
                  const evalMode = mode || 'manual';
                  const earlyResult = evaluateEarlyExit(selTeacher, evalMode, selectedDay, selectedPeriod);
                  const summaryTeachers = applyMode === 'early' && applySelection.length > 0
                    ? teachers.filter(t => applySelection.includes(t.id))
                    : [selTeacher];
                  const earlySummary = summaryTeachers.reduce((acc, teacher) => {
                    const result = evaluateEarlyExit(teacher, evalMode, selectedDay, selectedPeriod);
                    if (result.status === 'ok') acc.ok++;
                    else if (result.status === 'adjust') acc.adjust++;
                    else if (result.status === 'impossible') acc.impossible++;
                    return acc;
                  }, { ok: 0, adjust: 0, impossible: 0 });
                  const hasSelection = !!mode && selectedPeriod > 0 && (mode === 'auto' || !!selectedDay);
                  const isEarlyApplyMode = applyMode === 'early';

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

                          <div className="pt-3 border-t border-slate-100">
                            {earlyApplyDone ? (
                              <div className="flex justify-start">
                                <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
                                  <CheckCircle2 size={14} />
                                  تم التطبيق على {earlyApplyDone.applied} معلم، وتعديل {earlyApplyDone.adjusted}، واستثناء {earlyApplyDone.skipped}
                                </span>
                              </div>
                            ) : isEarlyApplyMode ? (
                              <div className="flex items-center gap-2 text-xs font-bold py-2 px-3 rounded-xl border bg-amber-50 text-amber-800 border-amber-200">
                                <Lightbulb size={15} className="text-amber-600 shrink-0" />
                                <span className="leading-relaxed">اختر المعلمين من القائمة اليمنى ثم اضغط <span className="font-black">تطبيق على</span></span>
                              </div>
                            ) : (
                              <div className="space-y-2 text-right">
                                <p className="text-[11px] font-bold text-slate-500 leading-relaxed">يمكنك تطبيق إعداد الخروج المبكر على مجموعة من المعلمين</p>
                                <div className="flex justify-start">
                                  <button
                                    onClick={() => { setApplyMode('early'); setApplySelection([]); }}
                                    disabled={!hasSelection}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#655ac1] hover:bg-[#574bb1] text-white text-xs font-black shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
                                        <span className="text-xs font-black text-[#655ac1] mt-0.5">{isMainSchool ? 'الرئيسية' : 'المشتركة'}</span>
                                      </div>
                                      {days.map(day => {
                                        const selected = effectiveDays.includes(day);
                                        return (
                                          <div key={day} className="px-2 py-2 border-l border-slate-200 flex items-center justify-center">
                                            <button
                                              type="button"
                                              onClick={() => applyPresence(school.schoolId, day)}
                                              className={`w-full h-8 rounded-xl border text-[11px] font-black transition-all ${
                                                selected
                                                  ? 'bg-white border-slate-200 text-white shadow-sm'
                                                  : 'bg-white border-slate-200 text-slate-400 hover:border-[#655ac1]/50 hover:text-[#655ac1]'
                                              }`}
                                            >
                                              {selected && (
                                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1] mx-auto">
                                                  <Check size={13} strokeWidth={3.2} className="text-white" />
                                                </span>
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
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1]">
              <Check size={13} strokeWidth={3.2} className="text-white" />
            </span>
            حفظ
          </button>
        </div>

      </div>

    </div>
  );
}


