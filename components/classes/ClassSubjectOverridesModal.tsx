import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Copy, ListPlus, Plus, RotateCcw, Settings2, Trash2, Undo2, X } from 'lucide-react';
import { Assignment, ClassInfo, Phase, ScheduleSettingsData, SchoolInfo, Subject } from '../../types';
import { getClassSubjectIds, getClassSubjectPeriods } from '../../utils/classSubjectPlans';
import { generateSubjectAbbreviation } from '../../utils/nameAbbreviations';
import SubjectConstraintsWorkspaceModal from '../subjects/SubjectConstraintsModal';

type Draft = { subjectIds: string[]; overrides: Record<string, number> };
interface Props {
  isOpen: boolean; onClose: () => void;
  classes: ClassInfo[]; setClasses: React.Dispatch<React.SetStateAction<ClassInfo[]>>;
  subjects: Subject[]; setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  gradeSubjectMap: Record<string, string[]>;
  assignments: Assignment[]; setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  scheduleSettings: ScheduleSettingsData; setScheduleSettings: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
  schoolInfo: SchoolInfo; activePhase: Phase; activeSchoolId: string;
  initialClassIds?: string[]; onSaved?: (message: string) => void;
}
const classNameOf = (cls: ClassInfo) => cls.name?.trim() || `${cls.grade} / ${cls.section}`;
const RoundCheck = ({ selected }: { selected: boolean }) => <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${selected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}><Check size={12} strokeWidth={3.5} /></span>;

const ClassSubjectOverridesModal: React.FC<Props> = ({ isOpen, onClose, classes, setClasses, subjects, setSubjects, gradeSubjectMap, assignments, setAssignments, scheduleSettings, setScheduleSettings, schoolInfo, activePhase, activeSchoolId, initialClassIds = [], onSaved }) => {
  const eligibleClasses = useMemo(() => classes.filter(c => c.phase === activePhase && (c.schoolId || 'main') === activeSchoolId && c.grade !== 0 && (!c.type || c.type === 'class')).sort((a, b) => a.grade - b.grade || a.section - b.section), [classes, activePhase, activeSchoolId]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<Draft>({ subjectIds: [], overrides: {} });
  const [original, setOriginal] = useState<Draft>({ subjectIds: [], overrides: {} });
  const [pending, setPending] = useState<Subject[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false); const [newName, setNewName] = useState(''); const [newPeriods, setNewPeriods] = useState(''); const [addError, setAddError] = useState('');
  const [newAbbreviation, setNewAbbreviation] = useState(''); const [abbreviationTouched, setAbbreviationTouched] = useState(false);
  const [abbreviations, setAbbreviations] = useState<Record<string, string>>({});
  const [settingsDraft, setSettingsDraft] = useState<ScheduleSettingsData>(scheduleSettings);
  const [constraintSubjectId, setConstraintSubjectId] = useState<string | null>(null);
  const [showCopy, setShowCopy] = useState(false); const [copyIds, setCopyIds] = useState<string[]>([]);
  const [copySubjectId, setCopySubjectId] = useState<string | null>(null); const [copySubjectTargetIds, setCopySubjectTargetIds] = useState<string[]>([]);
  const [subjectCopies, setSubjectCopies] = useState<Record<string, string[]>>({});
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null); const [permanentlyDeletedIds, setPermanentlyDeletedIds] = useState<string[]>([]);
  const selectedClass = eligibleClasses.find(c => c.id === selectedId);
  const allSubjects = useMemo(() => [...subjects, ...pending], [subjects, pending]);

  const loadClass = (id: string) => {
    const cls = eligibleClasses.find(c => c.id === id); if (!cls) return;
    const discardedPendingIds = new Set(pending.map(subject => subject.id));
    if (discardedPendingIds.size) {
      setAbbreviations(prev => Object.fromEntries(Object.entries(prev).filter(([subjectId]) => !discardedPendingIds.has(subjectId))));
      setSettingsDraft(prev => ({ ...prev, subjectAbbreviations: Object.fromEntries(Object.entries(prev.subjectAbbreviations || {}).filter(([subjectId]) => !discardedPendingIds.has(subjectId))), subjectConstraints: (prev.subjectConstraints || []).filter(constraint => !discardedPendingIds.has(constraint.subjectId)) }));
    }
    const next = { subjectIds: [...getClassSubjectIds(cls, gradeSubjectMap)], overrides: { ...(cls.subjectPeriodOverrides || {}) } };
    setSelectedId(id); setDraft(next); setOriginal(JSON.parse(JSON.stringify(next))); setPending([]); setDeleteId(null); setShowAdd(false); setNewName(''); setNewPeriods(''); setNewAbbreviation(''); setAbbreviationTouched(false); setAddError(''); setCopyIds([]); setShowCopy(false); setCopySubjectId(null); setCopySubjectTargetIds([]); setSubjectCopies({}); setPermanentDeleteId(null); setPermanentlyDeletedIds([]); setConstraintSubjectId(null);
  };
  useEffect(() => { if (!isOpen) return; setAbbreviations({ ...(scheduleSettings.subjectAbbreviations || {}) }); setSettingsDraft({ ...scheduleSettings, subjectConstraints: [...(scheduleSettings.subjectConstraints || [])], subjectAbbreviations: { ...(scheduleSettings.subjectAbbreviations || {}) } }); const id = initialClassIds.find(x => eligibleClasses.some(c => c.id === x)) || eligibleClasses[0]?.id; if (id) loadClass(id); else setSelectedId(''); }, [isOpen, initialClassIds.join('|')]);
  if (!isOpen) return null;

  const planOrder = [...new Set([...original.subjectIds, ...(selectedClass ? getClassSubjectIds(selectedClass, gradeSubjectMap) : []), ...pending.map(subject => subject.id)])];
  const activeSubjects = draft.subjectIds.map(id => allSubjects.find(s => s.id === id)).filter((s): s is Subject => !!s && !s.isArchived);
  const removedSubjects = planOrder.filter(id => !draft.subjectIds.includes(id) && !permanentlyDeletedIds.includes(id)).map(id => allSubjects.find(s => s.id === id)).filter((s): s is Subject => !!s && !s.isArchived);
  const copyTargets = eligibleClasses.filter(c => c.id !== selectedId);
  const activeDays = schoolInfo.timing?.activeDays || [];
  const capacity = activeDays.reduce((sum, day) => sum + (Number(schoolInfo.timing?.periodCounts?.[day]) || 0), 0);
  const total = draft.subjectIds.reduce((sum, id) => { const s = allSubjects.find(x => x.id === id); return sum + (s ? (draft.overrides[id] ?? s.periodsPerClass ?? 0) : 0); }, 0);
  const overCapacity = capacity > 0 && total > capacity;
  const settingsChanged = JSON.stringify(abbreviations) !== JSON.stringify(scheduleSettings.subjectAbbreviations || {}) || JSON.stringify(settingsDraft.subjectConstraints || []) !== JSON.stringify(scheduleSettings.subjectConstraints || []);
  const changed = JSON.stringify(draft) !== JSON.stringify(original) || pending.length > 0 || copyIds.length > 0 || Object.keys(subjectCopies).length > 0 || permanentlyDeletedIds.length > 0 || settingsChanged;
  const affectedIds = selectedClass ? [selectedClass.id, ...copyIds] : [];
  const removedAssignments = assignments.filter(a => affectedIds.includes(a.classId) && !draft.subjectIds.includes(a.subjectId));

  const removeSubject = (id: string) => {
    setDraft(prev => { const overrides = { ...prev.overrides }; delete overrides[id]; return { subjectIds: prev.subjectIds.filter(x => x !== id), overrides }; });
    setSubjectCopies(prev => { const next = { ...prev }; delete next[id]; return next; });
    setDeleteId(null);
  };
  const restoreSubject = (id: string) => setDraft(prev => ({ ...prev, subjectIds: [...prev.subjectIds, id].sort((a, b) => { const order = [...new Set([...planOrder, ...prev.subjectIds])]; return order.indexOf(a) - order.indexOf(b); }) }));
  const setPeriods = (s: Subject, value: number) => { if (Number.isFinite(value) && value > 0 && value < 100) setDraft(prev => ({ ...prev, overrides: { ...prev.overrides, [s.id]: value } })); };
  const resetPeriods = (id: string) => setDraft(prev => { const overrides = { ...prev.overrides }; delete overrides[id]; return { ...prev, overrides }; });
  const queueSubjectCopy = () => {
    if (!copySubjectId || !copySubjectTargetIds.length) return;
    setSubjectCopies(prev => ({ ...prev, [copySubjectId]: [...copySubjectTargetIds] }));
    setCopySubjectId(null); setCopySubjectTargetIds([]);
  };
  const permanentlyDeleteSubject = (id: string) => {
    const usedElsewhere = eligibleClasses.some(cls => cls.id !== selectedId && getClassSubjectIds(cls, gradeSubjectMap).includes(id));
    setPermanentlyDeletedIds(prev => [...new Set([...prev, id])]);
    if (!usedElsewhere) {
      setPending(prev => prev.filter(subject => subject.id !== id));
      setAbbreviations(prev => { const next = { ...prev }; delete next[id]; return next; });
      setSettingsDraft(prev => ({ ...prev, subjectAbbreviations: Object.fromEntries(Object.entries(prev.subjectAbbreviations || {}).filter(([subjectId]) => subjectId !== id)), subjectConstraints: (prev.subjectConstraints || []).filter(constraint => constraint.subjectId !== id) }));
    }
    setSubjectCopies(prev => { const next = { ...prev }; delete next[id]; return next; });
    setPermanentDeleteId(null);
  };
  const addManual = () => {
    const name = newName.trim(); const periods = Number(newPeriods);
    if (!name) return setAddError('أدخل اسم المادة.');
    if (!Number.isInteger(periods) || periods < 1 || periods > 99) return setAddError('أدخل نصابًا صحيحًا من 1 إلى 99 حصة.');
    if (allSubjects.some(s => s.name.trim().toLowerCase() === name.toLowerCase())) return setAddError('توجد مادة بهذا الاسم بالفعل.');
    const subject: Subject = { id: `class-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, specializationIds: [], periodsPerClass: periods, phases: [activePhase], targetGrades: selectedClass ? [selectedClass.grade] : undefined, department: 'custom', customPlanName: selectedClass ? `مادة مضافة لفصل ${classNameOf(selectedClass)}` : 'مادة فصل مخصصة' };
    const abbreviation = newAbbreviation.trim() || generateSubjectAbbreviation(name);
    setPending(prev => [...prev, subject]); setDraft(prev => ({ ...prev, subjectIds: [...prev.subjectIds, subject.id] })); setAbbreviations(prev => ({ ...prev, [subject.id]: abbreviation })); setSettingsDraft(prev => ({ ...prev, subjectAbbreviations: { ...(prev.subjectAbbreviations || {}), [subject.id]: abbreviation } })); setNewName(''); setNewPeriods(''); setNewAbbreviation(''); setAbbreviationTouched(false); setAddError(''); setShowAdd(false);
  };
  const save = () => {
    if (!selectedClass || !changed || overCapacity) return;
    const targetIds = new Set([selectedClass.id, ...copyIds]);
    const globallyDeletedIds = permanentlyDeletedIds.filter(id => !eligibleClasses.some(cls => cls.id !== selectedId && getClassSubjectIds(cls, gradeSubjectMap).includes(id)));
    const overrides = Object.fromEntries(Object.entries(draft.overrides).filter(([id, value]) => { const s = allSubjects.find(x => x.id === id); return draft.subjectIds.includes(id) && s && value !== s.periodsPerClass; }));
    const copiedSubjectIds = Object.keys(subjectCopies).filter(id => !permanentlyDeletedIds.includes(id));
    const retainedPending = pending.filter(s => (draft.subjectIds.includes(s.id) || copiedSubjectIds.includes(s.id)) && !globallyDeletedIds.includes(s.id));
    setSubjects(prev => {
      const retained = prev.filter(subject => !globallyDeletedIds.includes(subject.id));
      const ids = new Set(retained.map(subject => subject.id));
      return [...retained, ...retainedPending.filter(subject => !ids.has(subject.id))];
    });
    setClasses(prev => prev.map(c => {
      if (targetIds.has(c.id)) return { ...c, subjectIds: [...draft.subjectIds], subjectIdsCustomized: true, subjectPeriodOverrides: { ...overrides } };
      const subjectsForClass = copiedSubjectIds.filter(subjectId => subjectCopies[subjectId]?.includes(c.id));
      if (!subjectsForClass.length) return c;
      const currentIds = getClassSubjectIds(c, gradeSubjectMap);
      const nextIds = [...new Set([...currentIds, ...subjectsForClass])];
      const nextOverrides = { ...(c.subjectPeriodOverrides || {}) };
      subjectsForClass.forEach(subjectId => {
        const subject = allSubjects.find(item => item.id === subjectId);
        if (!subject) return;
        const copiedPeriods = draft.overrides[subjectId] ?? subject.periodsPerClass;
        if (copiedPeriods !== subject.periodsPerClass) nextOverrides[subjectId] = copiedPeriods;
        else delete nextOverrides[subjectId];
      });
      return { ...c, subjectIds: nextIds, subjectIdsCustomized: true, subjectPeriodOverrides: nextOverrides };
    }));
    if (removedAssignments.length || globallyDeletedIds.length) {
      const keys = new Set(removedAssignments.map(a => `${a.classId}|${a.subjectId}`));
      setAssignments(prev => prev.filter(a => !keys.has(`${a.classId}|${a.subjectId}`) && !globallyDeletedIds.includes(a.subjectId)));
    }
    setScheduleSettings(prev => {
      const previousAbbreviations = Object.fromEntries(Object.entries(prev.subjectAbbreviations || {}).filter(([subjectId]) => !globallyDeletedIds.includes(subjectId)));
      const nextAbbreviations = Object.fromEntries(Object.entries(abbreviations).filter(([subjectId]) => !globallyDeletedIds.includes(subjectId)));
      return { ...prev, subjectAbbreviations: { ...previousAbbreviations, ...nextAbbreviations }, subjectConstraints: (settingsDraft.subjectConstraints || []).filter(constraint => !globallyDeletedIds.includes(constraint.subjectId)) };
    });
    const copiedMaterialsCount = Object.values(subjectCopies).reduce((sum, ids) => sum + ids.length, 0);
    onSaved?.(`تم حفظ تخصيص فصل ${classNameOf(selectedClass)}${copyIds.length ? ` ونسخه إلى ${copyIds.length} ${copyIds.length === 1 ? 'فصل' : 'فصول'}` : ''}${copiedMaterialsCount ? `، ونسخ المواد المحددة بنجاح` : ''}`); onClose();
  };

  return <div className="fixed inset-0 z-[10000] bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-3" dir="rtl">
    <div className="bg-slate-50 w-full max-w-6xl h-[92vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
      <header className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-3"><ListPlus size={27} className="text-[#655ac1]" /><div><h2 className="text-lg font-black text-slate-800">تخصيص مواد الفصول</h2><p className="text-[11px] font-bold text-slate-400">خصّص وعدّل مواد الفصول.</p></div></div><button onClick={onClose} className="w-9 h-9 rounded-full border border-slate-300 text-slate-500 flex items-center justify-center"><X size={18} /></button></header>
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 shrink-0 bg-white border-l border-slate-100 flex flex-col"><div className="flex-1 overflow-y-auto p-2 space-y-1">{eligibleClasses.map(c => { const selected = c.id === selectedId; const custom = !!c.subjectIdsCustomized || Object.keys(c.subjectPeriodOverrides || {}).length > 0; return <button key={c.id} onClick={() => loadClass(c.id)} className={`w-full text-right px-3 py-2.5 rounded-xl border flex items-center justify-between ${selected ? 'border-slate-300 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}><span><b className={`block text-sm ${selected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{classNameOf(c)}</b><small className="text-[10px] font-bold text-slate-400">الصف {c.grade}{custom ? ' · مخصص' : ''}</small></span><RoundCheck selected={selected} /></button>; })}</div></aside>
        <main className="flex-1 overflow-y-auto p-5">{!selectedClass ? <div className="h-full grid place-items-center text-sm font-black text-slate-400">اختر فصلًا من القائمة</div> : <div className="max-w-3xl mx-auto space-y-4">
          <section className="bg-white rounded-2xl border border-slate-300 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><b className="block text-sm text-slate-800">الفصل المستهدف</b><p className="text-xs font-bold text-[#655ac1] mt-1">{classNameOf(selectedClass)}</p></div><div className="flex items-center gap-2"><span className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"><small className="block text-[9px] font-black text-slate-400">إجمالي المواد</small><b className="block text-sm font-black text-[#655ac1] mt-0.5">{draft.subjectIds.length} {draft.subjectIds.length === 1 ? 'مادة' : 'مواد'}</b></span><span className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"><small className="block text-[9px] font-black text-slate-400">إجمالي الحصص</small><b className="block text-sm font-black text-[#655ac1] mt-0.5">{total} حصة</b></span></div></section>
          <div className="flex flex-col sm:flex-row gap-2"><button onClick={() => { setShowAdd(!showAdd); setAddError(''); }} className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-black text-slate-600 flex items-center justify-center gap-2"><Plus size={16} />إضافة مادة</button><button onClick={() => setShowCopy(true)} className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-black text-slate-600 flex items-center justify-center gap-2"><Copy size={16} />نسخ تخصيص الفصل</button></div>
          {showAdd && <section className="bg-white rounded-2xl border border-slate-300 p-4 space-y-3"><div><b className="text-sm text-slate-800">إضافة مادة يدويًا</b><p className="text-[11px] font-bold text-slate-400 mt-1">أدخل اسم المادة واختصارها ونصابها لهذا الفصل.</p></div><div className="grid grid-cols-1 sm:grid-cols-[1fr_150px_125px_auto_auto] gap-2"><input value={newName} onChange={e => { const name = e.target.value; setNewName(name); if (!abbreviationTouched) setNewAbbreviation(generateSubjectAbbreviation(name)); setAddError(''); }} placeholder="اسم المادة" className="px-3 py-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none" /><input value={newAbbreviation} onChange={e => { setNewAbbreviation(e.target.value); setAbbreviationTouched(true); setAddError(''); }} placeholder="الاسم المختصر" maxLength={15} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-[#655ac1] focus:outline-none focus:border-[#655ac1]" /><input type="number" min={1} max={99} value={newPeriods} onChange={e => { setNewPeriods(e.target.value); setAddError(''); }} placeholder="عدد الحصص" className="px-3 py-3 rounded-xl border-2 border-slate-200 text-sm font-black text-center outline-none" /><button onClick={addManual} className="px-5 py-3 rounded-xl bg-[#655ac1] text-white text-sm font-black flex items-center justify-center gap-2"><CheckCircle2 size={16} />حفظ</button><button onClick={() => { setShowAdd(false); setNewName(''); setNewAbbreviation(''); setAbbreviationTouched(false); setNewPeriods(''); setAddError(''); }} className="px-5 py-3 rounded-xl bg-white border border-slate-300 text-slate-600 text-sm font-bold">إلغاء</button></div>{addError && <p className="text-xs font-bold text-rose-600">{addError}</p>}</section>}
          <section className="space-y-2">
            <div><b className="text-sm text-slate-800">مواد الفصل</b><p className="text-[11px] font-bold text-slate-400 mt-1">خصّص مواد الفصل وفق حاجتك.</p></div>
            {activeSubjects.length === 0 && <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-10 text-center text-sm font-bold text-slate-400">لا توجد مواد في الفصل.</div>}
            {activeSubjects.map(s => {
              const value = draft.overrides[s.id] ?? getClassSubjectPeriods(selectedClass, s);
              const isClassAdded = s.id.startsWith('class-custom-');
              const hasConstraint = (settingsDraft.subjectConstraints || []).some(constraint => constraint.subjectId === s.id);
              return <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-3 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px_138px_132px] items-center gap-3">
                <b className="min-w-0 text-sm text-slate-800 truncate">{s.name}</b>
                <input value={abbreviations[s.id] ?? generateSubjectAbbreviation(s.name)} onChange={e => { const abbreviation = e.target.value; setAbbreviations(prev => ({ ...prev, [s.id]: abbreviation })); setSettingsDraft(prev => ({ ...prev, subjectAbbreviations: { ...(prev.subjectAbbreviations || {}), [s.id]: abbreviation } })); }} className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-black text-[#655ac1] focus:outline-none focus:border-[#655ac1]" placeholder={generateSubjectAbbreviation(s.name)} maxLength={15} title="الاسم المختصر" />
                <div className="flex items-center gap-2"><label className="text-[10px] font-black text-slate-400 whitespace-nowrap">نصاب المادة</label><input type="number" min={1} max={99} value={value} onChange={e => setPeriods(s, Number(e.target.value))} className="w-16 h-9 px-2 rounded-xl border-2 border-slate-200 text-center text-sm font-black text-[#655ac1] outline-none focus:border-[#655ac1]/40" /></div>
                <div className="flex items-center justify-start md:justify-center gap-2 min-h-9">
                  {draft.overrides[s.id] !== undefined && !isClassAdded && <button onClick={() => resetPeriods(s.id)} className="w-9 h-9 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 flex items-center justify-center" title="العودة لنصاب الخطة"><RotateCcw size={15} /></button>}
                  {isClassAdded && <button onClick={() => { setCopySubjectId(s.id); setCopySubjectTargetIds(subjectCopies[s.id] || []); }} className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center" title="نسخ المادة لفصول أخرى"><Copy size={16} /></button>}
                  {isClassAdded && <button onClick={() => setConstraintSubjectId(s.id)} className={`w-9 h-9 rounded-xl border flex items-center justify-center ${hasConstraint ? 'border-[#655ac1]/30 text-[#655ac1] hover:bg-[#f0edff]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`} title="قيود المادة"><Settings2 size={16} /></button>}
                  <button onClick={() => setDeleteId(s.id)} className="w-9 h-9 rounded-xl border border-slate-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center" title="حذف المادة"><Trash2 size={16} /></button>
                </div>
              </div>;
            })}
          </section>
          {removedSubjects.length > 0 && <section className="space-y-2"><div><b className="text-sm text-slate-800">قائمة المواد المحذوفة</b><p className="text-[11px] font-bold text-slate-400 mt-1">يمكنك استعادة المادة، أو حذف المادة المضافة يدويًا من هذا الفصل نهائيًا.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{removedSubjects.map(s => { const isClassAdded = s.id.startsWith('class-custom-'); return <div key={s.id} className="bg-white rounded-xl border border-slate-200 px-3 py-3 flex items-center justify-between gap-3"><b className="text-sm text-slate-600 truncate">{s.name}</b><div className="flex items-center gap-3 shrink-0"><button onClick={() => restoreSubject(s.id)} className="text-xs font-black text-[#655ac1] flex items-center gap-1.5"><Undo2 size={14} />استعادة</button>{isClassAdded && <button onClick={() => setPermanentDeleteId(s.id)} title="حذف نهائي من الفصل" className="text-xs font-black text-rose-500 flex items-center gap-1.5"><Trash2 size={14} />حذف نهائي</button>}</div></div>; })}</div></section>}
          {(removedAssignments.length > 0 || overCapacity || copyIds.length > 0 || Object.keys(subjectCopies).length > 0) && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800 space-y-2"><span className="flex items-center gap-2"><AlertTriangle size={16} />تنبيهات قبل الحفظ</span>{removedAssignments.length > 0 && <p>• ستتم إزالة {removedAssignments.length} من إسنادات المواد المحذوفة.</p>}{overCapacity && <p>• مجموع الأنصبة ({total}) يتجاوز سعة الأسبوع ({capacity}).</p>}{copyIds.length > 0 && <p>• سيُنسخ التخصيص إلى: {copyTargets.filter(c => copyIds.includes(c.id)).map(classNameOf).join('، ')}.</p>}{Object.entries(subjectCopies).map(([subjectId, targetClassIds]) => <p key={subjectId}>• ستُنسخ مادة «{allSubjects.find(subject => subject.id === subjectId)?.name}» إلى: {copyTargets.filter(cls => targetClassIds.includes(cls.id)).map(classNameOf).join('، ')}.</p>)}</section>}
        </div>}</main>
      </div>
      <footer className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end gap-3"><button onClick={onClose} className="px-6 py-2.5 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl">إغلاق</button><button onClick={save} disabled={!changed || overCapacity} className="px-8 py-3 bg-[#655ac1] text-white font-black text-sm rounded-xl shadow-lg disabled:opacity-40 flex items-center gap-2"><CheckCircle2 size={16} />حفظ التخصيص</button></footer>
    </div>
    {deleteId && <div className="fixed inset-0 z-[10020] bg-slate-900/45 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}><div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}><div className="p-6 text-right"><div className="flex items-center gap-3 mb-5"><Trash2 size={27} className="text-rose-500 shrink-0" /><h3 className="text-lg font-black text-slate-800">تأكيد حذف المادة</h3></div><p className="text-sm font-bold text-slate-500 mt-3">هل تريد حذف مادة «{allSubjects.find(s => s.id === deleteId)?.name}» من هذا الفصل؟</p><p className="text-xs font-bold text-slate-400 mt-1">يمكنك استعادة المادة لاحقًا في حال الحذف</p></div><div className="px-6 py-4 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-3"><button onClick={() => setDeleteId(null)} className="w-full px-5 py-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600">إلغاء</button><button onClick={() => removeSubject(deleteId)} className="w-full px-5 py-3 rounded-xl bg-rose-500 text-white text-sm font-black flex items-center justify-center gap-2"><Trash2 size={15} />تأكيد الحذف</button></div></div></div>}
    {showCopy && selectedClass && <div className="fixed inset-0 z-[10020] bg-slate-900/45 flex items-center justify-center p-4" onClick={() => setShowCopy(false)}><div className="bg-white w-full max-w-2xl max-h-[82vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}><header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-3"><Copy size={22} className="text-[#655ac1]" /><div><h3 className="text-base font-black text-slate-800">نسخ تخصيص الفصل</h3><p className="text-[11px] font-bold text-slate-400">سيتم نسخ مواد وأنصبة فصل {classNameOf(selectedClass)}.</p></div></div><button onClick={() => setShowCopy(false)} className="w-9 h-9 rounded-full border border-slate-300 text-slate-500 flex items-center justify-center"><X size={18} /></button></header><div className="flex-1 overflow-y-auto p-5"><p className="text-xs font-black text-slate-600 mb-3">اختر الفصول المستهدفة</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{copyTargets.map(c => { const selected = copyIds.includes(c.id); return <button key={c.id} onClick={() => setCopyIds(prev => selected ? prev.filter(id => id !== c.id) : [...prev, c.id])} className={`p-3 rounded-xl border bg-white flex items-center justify-between text-right transition-colors ${selected ? 'border-slate-300' : 'border-slate-200 hover:border-slate-300'}`}><span><b className={`block text-sm ${selected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{classNameOf(c)}</b><small className="text-[10px] font-bold text-slate-400">الصف {c.grade}</small></span><RoundCheck selected={selected} /></button>; })}</div>{copyTargets.length === 0 && <p className="py-10 text-center text-sm font-bold text-slate-400">لا توجد فصول أخرى متاحة للنسخ.</p>}</div><footer className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3"><button onClick={() => { setCopyIds([]); setShowCopy(false); }} className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600">إلغاء</button><button onClick={() => setShowCopy(false)} disabled={!copyIds.length} className="px-7 py-2.5 rounded-xl bg-[#655ac1] text-white text-sm font-black disabled:opacity-40 flex items-center gap-2"><Copy size={15} />اعتماد الفصول</button></footer></div></div>}
    {copySubjectId && selectedClass && (() => { const subject = allSubjects.find(item => item.id === copySubjectId); return subject ? <div className="fixed inset-0 z-[10020] bg-slate-900/45 flex items-center justify-center p-4" onClick={() => { setCopySubjectId(null); setCopySubjectTargetIds([]); }}><div className="bg-white w-full max-w-2xl max-h-[82vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}><header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-3"><Copy size={22} className="text-[#655ac1]" /><div><h3 className="text-base font-black text-slate-800">نسخ المادة لفصول أخرى</h3><p className="text-[11px] font-bold text-slate-400">سيتم نسخ مادة «{subject.name}» واختصارها ونصابها وقيودها.</p></div></div><button onClick={() => { setCopySubjectId(null); setCopySubjectTargetIds([]); }} className="w-9 h-9 rounded-full border border-slate-300 text-slate-500 flex items-center justify-center"><X size={18} /></button></header><div className="flex-1 overflow-y-auto p-5"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 mb-4 flex items-center justify-between gap-3"><div><small className="block text-[10px] font-black text-slate-400">المادة المراد نسخها</small><b className="block text-sm text-slate-800 mt-1">{subject.name}</b></div><span className="text-xs font-black text-[#655ac1]">{draft.overrides[subject.id] ?? subject.periodsPerClass} حصة أسبوعيًا</span></div><p className="text-xs font-black text-slate-600 mb-3">اختر الفصول المستهدفة</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{copyTargets.map(c => { const selected = copySubjectTargetIds.includes(c.id); const alreadyAdded = getClassSubjectIds(c, gradeSubjectMap).includes(subject.id); return <button key={c.id} onClick={() => setCopySubjectTargetIds(prev => selected ? prev.filter(id => id !== c.id) : [...prev, c.id])} className={`p-3 rounded-xl border bg-white flex items-center justify-between text-right transition-colors ${selected ? 'border-slate-300' : 'border-slate-200 hover:border-slate-300'}`}><span><b className={`block text-sm ${selected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{classNameOf(c)}</b><small className="text-[10px] font-bold text-slate-400">الصف {c.grade}{alreadyAdded ? ' · مضافة حاليًا' : ''}</small></span><RoundCheck selected={selected} /></button>; })}</div>{copyTargets.length === 0 && <p className="py-10 text-center text-sm font-bold text-slate-400">لا توجد فصول أخرى متاحة للنسخ.</p>}</div><footer className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3"><button onClick={() => { setCopySubjectId(null); setCopySubjectTargetIds([]); }} className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600">إلغاء</button><button onClick={queueSubjectCopy} disabled={!copySubjectTargetIds.length} className="px-7 py-2.5 rounded-xl bg-[#655ac1] text-white text-sm font-black disabled:opacity-40 flex items-center gap-2"><Copy size={15} />اعتماد الفصول</button></footer></div></div> : null; })()}
    {permanentDeleteId && (() => { const subject = allSubjects.find(item => item.id === permanentDeleteId); return subject ? <div className="fixed inset-0 z-[10020] bg-slate-900/45 flex items-center justify-center p-4" onClick={() => setPermanentDeleteId(null)}><div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}><div className="p-6 text-right"><div className="flex items-center gap-3 mb-5"><Trash2 size={27} className="text-rose-500 shrink-0" /><h3 className="text-lg font-black text-slate-800">حذف المادة نهائيًا</h3></div><p className="text-sm font-bold text-slate-500">هل تريد حذف مادة «{subject.name}» نهائيًا من هذا الفصل؟</p><p className="text-xs font-bold text-rose-500 mt-2">لن تظهر المادة مرة أخرى في قائمة المواد المحذوفة لهذا الفصل.</p></div><div className="px-6 py-4 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-3"><button onClick={() => setPermanentDeleteId(null)} className="w-full px-5 py-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600">إلغاء</button><button onClick={() => permanentlyDeleteSubject(permanentDeleteId)} className="w-full px-5 py-3 rounded-xl bg-rose-500 text-white text-sm font-black flex items-center justify-center gap-2"><Trash2 size={15} />حذف نهائي</button></div></div></div> : null; })()}
    {constraintSubjectId && selectedClass && (() => { const subject = allSubjects.find(item => item.id === constraintSubjectId); return subject ? <SubjectConstraintsWorkspaceModal isOpen={true} onClose={() => setConstraintSubjectId(null)} scheduleSettings={settingsDraft} setScheduleSettings={setSettingsDraft} schoolInfo={schoolInfo} scopedSubjects={[{ ...subject, periodsPerClass: draft.overrides[subject.id] ?? subject.periodsPerClass, constraintScopeLabel: classNameOf(selectedClass) }]} initialSubjectId={subject.id} singleSubjectMode /> : null; })()}
  </div>;
};
export default ClassSubjectOverridesModal;
