import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, Check, CheckCircle2, ChevronDown, Copy, Lock, RotateCcw, Rows3, Search, Settings2, X } from 'lucide-react';
import { SchoolInfo, ScheduleSettingsData, Subject, SubjectConstraint } from '../../types';

type ScopedSubject = Subject & { constraintScopeLabel?: string };
type Placement = { key: string; subjectId: string; subjectName: string; periodsPerClass: number; label: string };
type SlotKind = 'excludedSlots' | 'fixedSlots';

interface Props {
  isOpen: boolean; onClose: () => void; scheduleSettings: ScheduleSettingsData;
  setScheduleSettings: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
  schoolInfo: SchoolInfo; scopedSubjects: ScopedSubject[]; initialSubjectId?: string | null;
}

const emptyConstraint = (subjectId = ''): SubjectConstraint => ({ subjectId, excludedSlots: {}, fixedSlots: {}, consecutivePairs: 0 });
const getDayLabel = (day: string) => ({ sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت' }[day.toLowerCase()] || day);
const hasConstraint = (value?: SubjectConstraint) => Boolean(value && (Object.values(value.excludedSlots || {}).some(x => x.length) || Object.values(value.fixedSlots || {}).some(x => x.length) || (value.consecutivePairs || 0) > 0 || (value.excludedPeriods || []).length));

const RoundCheck = ({ selected }: { selected: boolean }) => (
  <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 ${selected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}><Check size={12} strokeWidth={3.5} /></span>
);

const SubjectConstraintsModal: React.FC<Props> = ({ isOpen, onClose, scheduleSettings, setScheduleSettings, schoolInfo, scopedSubjects, initialSubjectId }) => {
  const days = schoolInfo.timing?.activeDays?.length ? schoolInfo.timing.activeDays : ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
  const dayCounts = schoolInfo.timing?.periodCounts || {};
  const maxPeriods = Math.max(1, ...Object.values(dayCounts).map(Number).filter(Boolean), 7);
  const periods = Array.from({ length: maxPeriods }, (_, i) => i + 1);
  const placements = useMemo<Placement[]>(() => scopedSubjects.map((s, i) => ({ key: `${s.constraintScopeLabel || 'scope'}|${s.id}|${i}`, subjectId: s.id, subjectName: s.name, periodsPerClass: s.periodsPerClass || 0, label: s.constraintScopeLabel || 'الخطة الحالية' })).sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'ar') || a.label.localeCompare(b.label, 'ar')), [scopedSubjects]);
  const names = useMemo(() => [...new Set(placements.map(x => x.subjectName))], [placements]);

  const [selectedName, setSelectedName] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<SubjectConstraint>(emptyConstraint());
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [open, setOpen] = useState({ excluded: false, fixed: false, consecutive: false });
  const [view, setView] = useState<'edit' | 'summary'>('edit');
  const [toast, setToast] = useState('');
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySearch, setCopySearch] = useState('');
  const [copyNames, setCopyNames] = useState<string[]>([]);
  const [copyKeys, setCopyKeys] = useState<string[]>([]);
  const [copyTypes, setCopyTypes] = useState({ excluded: true, fixed: true, consecutive: true });

  const selected = placements.filter(x => x.subjectName === selectedName);
  const targets = scope === 'all' ? selected : selected.filter(x => selectedKeys.includes(x.key));
  const selectedSaved = scheduleSettings.subjectConstraints.find(c => selected.some(x => x.subjectId === c.subjectId));
  const lessonCount = Math.max(0, ...selected.map(x => x.periodsPerClass));

  useEffect(() => {
    if (!isOpen || !names.length) return;
    const focused = initialSubjectId ? placements.find(x => x.subjectId === initialSubjectId) : undefined;
    const name = focused?.subjectName || names[0];
    setSelectedName(name); setSearch(''); setOpen({ excluded: false, fixed: false, consecutive: false });
    setView(focused && hasConstraint(scheduleSettings.subjectConstraints.find(c => c.subjectId === focused.subjectId)) ? 'summary' : 'edit');
  }, [isOpen, initialSubjectId]);

  useEffect(() => {
    if (!selected.length) return;
    const current = scheduleSettings.subjectConstraints.find(c => selected.some(x => x.subjectId === c.subjectId));
    const legacy = current?.excludedPeriods || [];
    setDraft(current ? { subjectId: current.subjectId, excludedSlots: current.excludedSlots || Object.fromEntries(days.map(day => [day, legacy])), fixedSlots: current.fixedSlots || {}, consecutivePairs: current.consecutivePairs ?? (current.enableDoublePeriods ? 1 : 0), targetScopeKeys: current.targetScopeKeys || [] } : emptyConstraint(selected[0].subjectId));
    setScope('all'); setSelectedKeys(selected.map(x => x.key));
  }, [selectedName, selected.map(x => x.key).join('|')]);

  useEffect(() => {
    setCopyKeys(prev => {
      const valid = prev.filter(key => placements.some(x => x.key === key && copyNames.includes(x.subjectName)));
      const added = placements.filter(x => copyNames.includes(x.subjectName)).map(x => x.key);
      return [...new Set([...valid, ...added])];
    });
  }, [copyNames, placements]);
  if (!isOpen) return null;

  const validFor = (day: string) => periods.filter(p => p <= (Number(dayCounts[day]) || maxPeriods));
  const slots = (kind: SlotKind, day: string) => draft[kind]?.[day] || [];
  const total = (kind: SlotKind) => days.reduce((sum, day) => sum + slots(kind, day).length, 0);
  const setDaySlots = (kind: SlotKind, day: string, values: number[]) => setDraft(prev => ({ ...prev, [kind]: { ...(prev[kind] || {}), [day]: values } }));
  const toggleCell = (kind: SlotKind, day: string, period: number) => { const values = slots(kind, day); setDaySlots(kind, day, values.includes(period) ? values.filter(x => x !== period) : [...values, period]); };
  const toggleDay = (kind: SlotKind, day: string) => { const valid = validFor(day); setDaySlots(kind, day, valid.every(p => slots(kind, day).includes(p)) ? [] : valid); };
  const togglePeriod = (kind: SlotKind, period: number) => {
    const eligible = days.filter(day => validFor(day).includes(period)); const all = eligible.every(day => slots(kind, day).includes(period));
    setDraft(prev => { const next = { ...(prev[kind] || {}) }; eligible.forEach(day => { const values = next[day] || []; next[day] = all ? values.filter(x => x !== period) : [...new Set([...values, period])]; }); return { ...prev, [kind]: next }; });
  };
  const conflicts = days.reduce((sum, day) => sum + slots('excludedSlots', day).filter(p => slots('fixedSlots', day).includes(p)).length, 0);
  const validation = conflicts ? ['لا يمكن تثبيت حصة مستثناة في الوقت نفسه.'] : [];
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3500); };

  const save = () => {
    if (!targets.length || validation.length) return;
    setScheduleSettings(prev => {
      const ids = new Set(targets.map(x => x.subjectId)); const next = prev.subjectConstraints.filter(c => !ids.has(c.subjectId));
      targets.forEach(x => next.push({ subjectId: x.subjectId, excludedSlots: draft.excludedSlots, fixedSlots: draft.fixedSlots, consecutivePairs: draft.consecutivePairs || 0, excludedPeriods: [], enableDoublePeriods: false, targetScopeKeys: [x.key] }));
      return { ...prev, subjectConstraints: next };
    });
    notify(`تم حفظ قيود مادة ${selectedName} بنجاح`); setOpen({ excluded: false, fixed: false, consecutive: false }); setScope('all');
    const next = names.find(name => name !== selectedName && !placements.filter(x => x.subjectName === name).some(x => hasConstraint(scheduleSettings.subjectConstraints.find(c => c.subjectId === x.subjectId))));
    if (next) { setSelectedName(next); setView('edit'); }
  };

  const availableCopyTypes = {
    excluded: total('excludedSlots') > 0,
    fixed: total('fixedSlots') > 0,
    consecutive: (draft.consecutivePairs || 0) > 0
  };
  const openCopy = () => {
    setCopyNames([]); setCopyKeys([]); setCopySearch('');
    setCopyTypes({ ...availableCopyTypes }); setCopyOpen(true);
  };
  const copy = () => {
    const copyTargets = placements.filter(x => copyNames.includes(x.subjectName) && copyKeys.includes(x.key)); if (!copyTargets.length) return;
    setScheduleSettings(prev => { const next = [...prev.subjectConstraints]; copyTargets.forEach(x => { const i = next.findIndex(c => c.subjectId === x.subjectId); const base = i >= 0 ? next[i] : emptyConstraint(x.subjectId); const value: SubjectConstraint = { ...base, subjectId: x.subjectId, targetScopeKeys: [x.key], ...(copyTypes.excluded ? { excludedSlots: draft.excludedSlots, excludedPeriods: [] } : {}), ...(copyTypes.fixed ? { fixedSlots: draft.fixedSlots } : {}), ...(copyTypes.consecutive ? { consecutivePairs: draft.consecutivePairs || 0, enableDoublePeriods: false } : {}) }; if (i >= 0) next[i] = value; else next.push(value); }); return { ...prev, subjectConstraints: next }; });
    setCopyOpen(false); notify(`تم نسخ القيود إلى ${copyNames.length} ${copyNames.length === 1 ? 'مادة' : 'مواد'} بنجاح`);
  };

  const chooseName = (name: string) => { setSelectedName(name); setOpen({ excluded: false, fixed: false, consecutive: false }); const items = placements.filter(x => x.subjectName === name); setView(items.some(x => hasConstraint(scheduleSettings.subjectConstraints.find(c => c.subjectId === x.subjectId))) ? 'summary' : 'edit'); };

  const grid = (kind: SlotKind, title: string, subtitle: string, Icon: typeof Ban) => {
    const excluded = kind === 'excludedSlots'; const section = excluded ? 'excluded' : 'fixed';
    return <section className={`bg-white rounded-2xl border ${open[section] ? 'border-slate-300 shadow-md' : 'border-slate-200 shadow-sm'}`}>
      <button type="button" onClick={() => setOpen(prev => ({ ...prev, [section]: !prev[section] }))} className="w-full p-4 flex items-center justify-between"><span className="flex items-center gap-3"><span className="w-9 h-9 flex items-center justify-center text-[#655ac1]"><Icon size={20} /></span><span className="text-right"><b className="block text-sm text-slate-800">{title}</b><small className="text-[10px] text-slate-500 font-bold">{subtitle}</small></span></span><ChevronDown size={16} className={`text-slate-400 transition-transform ${open[section] ? 'rotate-180' : ''}`} /></button>
      {open[section] && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100">
        <div className="pt-3 flex flex-wrap justify-between gap-3"><div className="flex gap-2 text-xs font-black">{excluded && <><span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-500"><i className="w-4 h-4 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center"><Check size={10} strokeWidth={3.5} /></i>متاح</span><span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-500"><i className="w-4 h-4 rounded-full bg-rose-500 text-white inline-flex items-center justify-center"><X size={10} strokeWidth={3.5} /></i>مستثنى</span></>}{!excluded && <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-500"><i className="w-4 h-4 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center"><Check size={10} /></i>مثبت</span>}</div><div className="flex gap-2"><span className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-slate-600">إجمالي {excluded ? 'المستثنى' : 'المثبت'}: <b className="text-[#655ac1]">{total(kind)}</b></span><button type="button" disabled={!total(kind)} onClick={() => setDraft(prev => ({ ...prev, [kind]: {} }))} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-black text-slate-500 disabled:opacity-40 inline-flex gap-2 items-center"><RotateCcw size={14} />إعادة التعيين</button></div></div>
        <p className="text-[11px] font-bold text-slate-500">{excluded ? 'انقر على رقم الحصة لتطبيقها في كل الأيام، أو على اسم اليوم لتطبيقها على كل حصصه.' : 'انقر على رقم الحصة لتطبيقها في كل الأيام.'}</p>
        <div className="overflow-x-auto custom-scrollbar"><div className="min-w-[560px] rounded-2xl overflow-hidden border border-slate-200 bg-white">
          <div className="flex bg-slate-50 border-b border-slate-200"><div className="w-24 shrink-0 border-l border-slate-200 p-2 flex items-center justify-center text-[9px] font-black text-slate-400">اليوم / الحصة</div>{periods.map((p, i) => { const eligible = days.filter(day => validFor(day).includes(p)); const all = eligible.length > 0 && eligible.every(day => slots(kind, day).includes(p)); return <div key={p} className={`flex-1 min-w-[52px] flex justify-center py-2 ${i < periods.length - 1 ? 'border-l border-slate-200' : ''}`}><button type="button" onClick={() => togglePeriod(kind, p)} className={`w-8 h-8 rounded-full border-2 font-black text-xs ${all ? (excluded ? 'bg-rose-500 border-rose-500 text-white' : 'bg-emerald-500 border-emerald-500 text-white') : 'bg-white border-slate-300 text-slate-600 hover:border-emerald-500 hover:text-emerald-600'}`}>{p}</button></div>; })}</div>
          {days.map((day, di) => { const valid = validFor(day); const all = valid.every(p => slots(kind, day).includes(p)); return <div key={day} className={`flex ${di < days.length - 1 ? 'border-b border-slate-200' : ''}`}><button type="button" disabled={!excluded} onClick={() => excluded && toggleDay(kind, day)} className={`w-24 shrink-0 border-l border-slate-200 text-xs font-black ${excluded ? (all ? 'text-rose-600 bg-rose-50' : 'text-slate-600 hover:bg-slate-100') : 'text-slate-600 cursor-default'}`}>{getDayLabel(day)}</button>{periods.map((p, pi) => { const active = slots(kind, day).includes(p); return <div key={p} className={`flex-1 min-w-[52px] flex justify-center py-2 ${pi < periods.length - 1 ? 'border-l border-slate-200' : ''}`}>{valid.includes(p) ? <button type="button" onClick={() => toggleCell(kind, day, p)} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${excluded ? (active ? 'bg-rose-500 border-rose-500 text-white' : 'bg-emerald-500 border-emerald-500 text-white') : (active ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 text-slate-300')}`}>{excluded ? (active ? <X size={10} strokeWidth={3.5} /> : <Check size={10} strokeWidth={3.5} />) : (active ? <Check size={10} strokeWidth={3.5} /> : '-')}</button> : <span className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 text-slate-300 text-xs inline-flex items-center justify-center">-</span>}</div>; })}</div>; })}
        </div></div>
      </div>}
    </section>;
  };

  const palette: Record<number, { border: string; dot: string; ring: string }> = { 1: { border: 'border-emerald-300', dot: 'bg-emerald-400', ring: 'shadow-emerald-100' }, 2: { border: 'border-emerald-300', dot: 'bg-emerald-400', ring: 'shadow-emerald-100' }, 3: { border: 'border-emerald-300', dot: 'bg-emerald-400', ring: 'shadow-emerald-100' }, 4: { border: 'border-emerald-300', dot: 'bg-emerald-400', ring: 'shadow-emerald-100' }, 5: { border: 'border-emerald-300', dot: 'bg-emerald-400', ring: 'shadow-emerald-100' } };
  const summaryExcluded = selectedSaved ? Object.values(selectedSaved.excludedSlots || {}).reduce((sum, x) => sum + x.length, 0) : 0;
  const summaryFixed = selectedSaved ? Object.values(selectedSaved.fixedSlots || {}).reduce((sum, x) => sum + x.length, 0) : 0;
  const summarizeSlots = (values?: Record<string, number[]>) => periods.flatMap(period => {
    const slotDays = days.filter(day => (values?.[day] || []).includes(period));
    if (!slotDays.length) return [];
    const dayText = slotDays.length === days.length ? `${getDayLabel(days[0])} إلى ${getDayLabel(days[days.length - 1])}` : slotDays.map(getDayLabel).join('، ');
    return [`${dayText} — الحصة ${period}`];
  });
  const excludedSummary = summarizeSlots(selectedSaved?.excludedSlots);
  const fixedSummary = summarizeSlots(selectedSaved?.fixedSlots);
  const copyRows = placements.filter(x => copyNames.includes(x.subjectName));
  const copyWarnings = copyRows.filter(x => copyKeys.includes(x.key)).flatMap(x => {
    const warnings: string[] = [];
    if (copyTypes.consecutive && (draft.consecutivePairs || 0) > Math.floor(x.periodsPerClass / 2)) warnings.push(`مادة ${x.subjectName} في ${x.label}: عدد الحصص لا يكفي لتطبيق ${draft.consecutivePairs} من الحصص الزوجية.`);
    const current = scheduleSettings.subjectConstraints.find(c => c.subjectId === x.subjectId);
    if (copyTypes.fixed && Object.entries(draft.fixedSlots || {}).some(([day, values]) => values.some(p => (copyTypes.excluded ? draft.excludedSlots?.[day] : current?.excludedSlots?.[day])?.includes(p)))) warnings.push(`مادة ${x.subjectName} في ${x.label}: يوجد تعارض بين حصة مثبتة وحصة مستثناة.`);
    return warnings;
  });

  return <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3" dir="rtl"><div className="relative bg-slate-50 w-full max-w-6xl h-[92vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
    {toast && <div className="absolute z-[170] top-5 left-1/2 -translate-x-1/2 min-w-[320px] rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-xl text-emerald-800 flex items-center gap-3"><span className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center"><CheckCircle2 size={19} className="text-emerald-600" /></span><b className="text-sm">{toast}</b></div>}
    <header className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between"><span className="flex items-center gap-3"><span className="w-11 h-11 flex items-center justify-center text-[#655ac1]"><Settings2 size={26} /></span><span><b className="block text-lg text-slate-800">قيود المواد</b><small className="font-bold text-slate-400">حدّد قيود المادة ثم طبّقها على الصفوف.</small></span></span><button type="button" onClick={onClose} className="p-2 border border-slate-300 rounded-full text-slate-500"><X size={18} /></button></header>
    <div className="flex-1 flex overflow-hidden">{view !== 'summary' && <aside className="w-72 shrink-0 bg-white border-l border-slate-100 flex flex-col"><div className="p-3 border-b border-slate-100"><div className="relative"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باسم المادة" className="w-full pr-10 pl-4 py-3 border-2 border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#655ac1]/40" /></div></div><div className="flex-1 overflow-y-auto p-2 space-y-1">{names.filter(name => name.includes(search.trim())).map(name => { const active = name === selectedName; return <button key={name} type="button" onClick={() => chooseName(name)} className={`w-full text-right px-3 py-3 rounded-xl border flex items-center justify-between gap-3 ${active ? 'border-slate-300 bg-white shadow-sm' : 'border-transparent hover:bg-slate-50'}`}><b className={`block text-sm truncate ${active ? 'text-[#655ac1]' : 'text-slate-700'}`}>{name}</b><RoundCheck selected={active} /></button>; })}</div></aside>}
      <main className="flex-1 overflow-y-auto p-5 space-y-4">{!selected.length ? <div className="h-full grid place-items-center text-slate-400 font-bold">لا توجد مواد في الخطة الحالية.</div> : view === 'summary' && selectedSaved ? <div className="max-w-4xl mx-auto space-y-4"><section className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm"><h3 className="text-lg font-black text-slate-800">ملخص قيود {selectedName}</h3><p className="text-xs font-bold text-slate-400 mt-1">القيود المحفوظة والمطبقة حاليًا</p></section><section className="grid grid-cols-1 md:grid-cols-3 gap-3"><div className="bg-white rounded-2xl border border-slate-200 p-5"><b className="block text-sm text-slate-700">الحصص المستثناة</b><span className="block mt-1 text-xs font-black text-rose-500">{summaryExcluded ? `${summaryExcluded} حصة مستثناة` : 'غير محدد'}</span><div className="mt-3 space-y-2">{excludedSummary.map(text => <span key={text} className="block rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-700">{text}</span>)}</div></div><div className="bg-white rounded-2xl border border-slate-200 p-5"><b className="block text-sm text-slate-700">تثبيت الحصص</b><span className="block mt-1 text-xs font-black text-emerald-600">{summaryFixed ? `${summaryFixed} حصة مثبتة` : 'غير محدد'}</span><div className="mt-3 space-y-2">{fixedSummary.map(text => <span key={text} className="block rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700">{text}</span>)}</div></div><div className="bg-white rounded-2xl border border-slate-200 p-5"><b className="block text-sm text-slate-700">تتابع حصص المادة</b><span className="block mt-1 text-xs font-black text-emerald-600">{selectedSaved.consecutivePairs ? `${selectedSaved.consecutivePairs} من الحصص الزوجية أسبوعيًا` : 'غير محدد'}</span>{selectedSaved.consecutivePairs ? <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">يوزّع النظام حصتين متتاليتين في {selectedSaved.consecutivePairs} {selectedSaved.consecutivePairs === 1 ? 'يوم' : 'أيام'}، ثم يوزّع ما تبقى منفردًا.</p> : null}</div></section><section className="bg-white rounded-2xl border border-slate-200 p-5"><b className="text-sm text-slate-800">الصفوف المطبق عليها القيد</b><div className="grid grid-cols-3 gap-2 mt-3">{selected.map(x => <span key={x.key} className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-black text-[#655ac1] flex justify-between items-center">{x.label}<RoundCheck selected /></span>)}</div></section></div> : <>
        <section className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm"><div className="flex justify-between"><h3 className="text-lg font-black text-slate-800">{selectedName}</h3>{names.length > 1 && <button type="button" onClick={openCopy} className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-black text-slate-600 hover:bg-[#655ac1] hover:text-white inline-flex gap-2 items-center"><Copy size={14} />نسخ القيود لمادة أخرى</button>}</div><small className="block text-[10px] text-slate-400 font-black mt-3 mb-2">الصفوف المسندة للمادة حسب الخطة</small><div className="grid grid-cols-3 gap-2">{selected.map(x => <span key={x.key} className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-slate-600">{x.label} <b className="text-[#655ac1]">— {x.periodsPerClass} حصص</b></span>)}</div></section>
        {grid('excludedSlots', 'الحصص المستثناة', 'الحصص التي لا تُسند للمادة', Ban)}
        {grid('fixedSlots', 'تثبيت الحصص', 'تثبيت حصص المادة في حصة معينة.', Lock)}
        <section className={`bg-white rounded-2xl border ${open.consecutive ? 'border-slate-300 shadow-md' : 'border-slate-200 shadow-sm'}`}><button type="button" onClick={() => setOpen(prev => ({ ...prev, consecutive: !prev.consecutive }))} className="w-full p-4 flex justify-between"><span className="flex gap-3 items-center"><span className="w-9 h-9 flex items-center justify-center text-[#655ac1]"><Rows3 size={22} /></span><span className="text-right"><b className="block text-sm text-slate-800">تتابع حصص المادة</b><small className="text-[10px] font-bold text-slate-500">الحصص الزوجية للمادة في اليوم.</small></span></span><ChevronDown size={16} className={`text-slate-400 ${open.consecutive ? 'rotate-180' : ''}`} /></button>{open.consecutive && <div className="p-5 border-t border-slate-100 space-y-4"><div className="flex flex-wrap gap-3 justify-center">{Array.from({ length: Math.min(5, Math.floor(lessonCount / 2)) }, (_, i) => i + 1).map(n => { const active = draft.consecutivePairs === n; const c = palette[n]; return <button key={n} type="button" onClick={() => setDraft(prev => ({ ...prev, consecutivePairs: prev.consecutivePairs === n ? 0 : n }))} className={`w-16 h-16 rounded-2xl border-2 bg-white flex items-center justify-center ${active ? `${c.border} shadow-md ${c.ring}` : 'border-slate-200'}`}><span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${active ? `${c.dot} text-white` : 'bg-emerald-50 text-emerald-500'}`}>{n}</span></button>; })}</div><div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs font-bold text-emerald-800">{draft.consecutivePairs ? <>سيضع النظام حصتين متتاليتين للمادة في <b>{draft.consecutivePairs} {draft.consecutivePairs === 1 ? 'يوم' : 'أيام'}</b>، ثم يوزّع الحصص المتبقية بشكل منفرد.</> : <>اختر عدد الأيام التي تريد أن تظهر فيها حصتان متتاليتان للمادة. يمكنك إلغاء الاختيار بالنقر على الرقم مرة أخرى.</>}</div></div>}</section>
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"><b className="text-sm text-slate-800">تطبيق القيود على الصفوف</b><div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl"><button type="button" onClick={() => setScope('all')} className={`py-2.5 rounded-xl text-sm font-black ${scope === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>جميع الصفوف المسندة للمادة</button><button type="button" onClick={() => setScope('selected')} className={`py-2.5 rounded-xl text-sm font-black ${scope === 'selected' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>صفوف محددة</button></div>{scope === 'selected' && <div className="grid grid-cols-3 gap-2">{selected.map(x => { const active = selectedKeys.includes(x.key); return <button key={x.key} type="button" onClick={() => setSelectedKeys(prev => active ? prev.filter(k => k !== x.key) : [...prev, x.key])} className={`px-3 py-2.5 rounded-xl border text-xs font-black flex justify-between items-center ${active ? 'border-slate-300 text-[#655ac1] shadow-sm' : 'border-slate-200 text-slate-500'}`}>{x.label}<RoundCheck selected={active} /></button>; })}</div>}</section>
        {validation.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800">{validation.join(' ')}</section>}
      </>}</main></div>
    <footer className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3">{view === 'summary' ? <><button type="button" onClick={onClose} className="px-6 py-2.5 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all">إغلاق</button><button type="button" onClick={() => setView('edit')} className="px-8 py-3 bg-[#655ac1] text-white font-black text-sm rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 transition-all inline-flex items-center justify-center gap-2"><Settings2 size={16} />تعديل القيود</button></> : <><button type="button" onClick={onClose} className="px-6 py-2.5 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all">إغلاق</button><button type="button" onClick={save} disabled={!targets.length || validation.length > 0} className="px-8 py-3 bg-[#655ac1] text-white font-black text-sm rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"><CheckCircle2 size={16} />حفظ القيود</button></>}</footer>
    {copyOpen && <div className="absolute inset-0 z-[150] bg-slate-50 flex flex-col">
      <header className="bg-white p-5 border-b border-slate-100 flex justify-between items-center"><span><b className="block text-lg text-slate-800">نسخ القيود لمادة أخرى</b><small className="font-bold text-slate-400">اختر مادة أو أكثر، ثم حدّد القيود والصفوف المستهدفة.</small></span><button type="button" onClick={() => setCopyOpen(false)} className="w-9 h-9 aspect-square shrink-0 border border-slate-300 rounded-full text-slate-500 inline-flex items-center justify-center"><X size={17} /></button></header>
      <div className="flex-1 flex overflow-hidden"><aside className="w-72 bg-white border-l border-slate-100 flex flex-col"><div className="p-3"><div className="relative"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={copySearch} onChange={e => setCopySearch(e.target.value)} placeholder="ابحث باسم المادة" className="w-full pr-10 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none" /></div></div><div className="overflow-y-auto p-2 space-y-1">{names.filter(n => n !== selectedName && n.includes(copySearch.trim())).map(n => { const active = copyNames.includes(n); return <button key={n} type="button" onClick={() => setCopyNames(prev => active ? prev.filter(x => x !== n) : [...prev, n])} className={`w-full px-3 py-2.5 rounded-xl border flex justify-between items-center text-sm font-black ${active ? 'border-slate-300 text-[#655ac1] shadow-sm' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}>{n}<RoundCheck selected={active} /></button>; })}</div></aside>
        <main className="flex-1 overflow-y-auto p-6"><div className="max-w-2xl mx-auto space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-[#f0edff] text-[#655ac1] inline-flex items-center justify-center"><Copy size={18} /></span><span><small className="block text-[10px] font-bold text-slate-400">نسخ القيود من المادة</small><b className="block text-base text-[#655ac1]">{selectedName}</b></span></section>
          <section><b className="text-sm text-slate-800">القيود المراد نسخها</b><p className="text-[11px] font-bold text-slate-400 mt-1">تظهر هنا القيود التي تم تنفيذها فقط.</p><div className="space-y-2 mt-3">{([['excluded', 'الحصص المستثناة', `${total('excludedSlots')} حصة`], ['fixed', 'تثبيت الحصص', `${total('fixedSlots')} حصة`], ['consecutive', 'تتابع الحصص', `${draft.consecutivePairs || 0} من الحصص الزوجية`]] as const).filter(([key]) => availableCopyTypes[key]).map(([key, label, value]) => <button key={key} type="button" onClick={() => setCopyTypes(prev => ({ ...prev, [key]: !prev[key] }))} className="w-full px-3 py-3 rounded-xl border border-slate-200 flex gap-3 items-center text-right"><RoundCheck selected={copyTypes[key]} /><span><b className="block text-sm text-slate-700">{label}</b><small className="font-bold text-[#655ac1]">{value}</small></span></button>)}</div></section>
          <section><b className="text-sm text-slate-800">الصفوف المستهدفة</b>{copyNames.length === 0 ? <p className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-xs font-bold text-slate-400">اختر مادة أو أكثر من القائمة لعرض صفوفها.</p> : <div className="space-y-3 mt-3">{copyNames.map(name => <div key={name} className="rounded-2xl border border-slate-200 bg-white p-4"><b className="block text-sm text-[#655ac1] mb-3">{name}</b><div className="grid grid-cols-3 gap-2">{copyRows.filter(x => x.subjectName === name).map(x => { const active = copyKeys.includes(x.key); return <button key={x.key} type="button" onClick={() => setCopyKeys(prev => active ? prev.filter(k => k !== x.key) : [...prev, x.key])} className={`px-3 py-2.5 rounded-xl border text-xs font-black flex justify-between items-center ${active ? 'border-slate-300 text-[#655ac1] shadow-sm' : 'border-slate-200 text-slate-500'}`}>{x.label}<RoundCheck selected={active} /></button>; })}</div></div>)}</div>}</section>
          {copyWarnings.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800 space-y-2"><span className="flex items-center gap-2"><AlertTriangle size={16} />تنبيهات التوافق قبل النسخ</span>{[...new Set(copyWarnings)].map(message => <p key={message}>• {message}</p>)}</section>}
        </div></main></div>
      <footer className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3"><button type="button" onClick={() => setCopyOpen(false)} className="px-6 py-2.5 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors">إلغاء</button><button type="button" onClick={copy} disabled={!copyKeys.length || !Object.values(copyTypes).some(Boolean)} className="px-8 py-3 bg-[#655ac1] text-white font-black text-sm rounded-xl hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"><Copy size={16} />نسخ القيود</button></footer>
    </div>}
  </div></div>;
};

export default SubjectConstraintsModal;
