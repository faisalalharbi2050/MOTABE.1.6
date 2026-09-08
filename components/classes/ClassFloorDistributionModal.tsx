import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, X, Plus, Check, CheckCircle2, Trash2, Settings2 } from 'lucide-react';
import { ClassInfo } from '../../types';
import { getFloorLabel } from '../../utils/classFloorTravel';
import { getClassroomDisplayName } from '../../utils/classroomUtils';

type Props = { classes: ClassInfo[]; floors?: number[]; onClose: () => void; onSave: (locations: Record<string, number | undefined>, floors: number[], close?: boolean) => void };
export default function ClassFloorDistributionModal({ classes, floors, onClose, onSave }: Props) {
  const eligible = classes.filter(c => c.grade !== 0 && (!c.type || c.type === 'class'));
  const [draft, setDraft] = useState<Record<string, number | undefined>>(() => Object.fromEntries(eligible.map(c => [c.id, c.floorNumber])));
  const [levels, setLevels] = useState(() => [...new Set([...(floors ?? []), ...eligible.flatMap(c => c.floorNumber === undefined ? [] : [c.floorNumber])])].sort((a,b) => a-b));
  const [setup, setSetup] = useState(floors === undefined);
  const [setupLevels, setSetupLevels] = useState<number[]>(levels);
  const [catalog, setCatalog] = useState(() => [...new Set([0, 1, 2, 3, 4, ...levels])].sort((a, b) => a - b));
  const [active, setActive] = useState<number | null>(null);
  const [deleteLevel, setDeleteLevel] = useState<number | null>(null);
  const confirmation = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newFloor, setNewFloor] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const visible = eligible;
  const missing = eligible.filter(c => draft[c.id] === undefined).length;
  const button = 'px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-600 text-xs font-bold hover:border-[#655ac1]/30 transition-colors';
  const closePicker = () => { setActive(null); setSelected(new Set()); };
  const openPicker = (level: number) => { setActive(level); setSelected(new Set(eligible.filter(c => draft[c.id] === level).map(c => c.id))); };
  // The selection is the complete membership of this floor: unchecked members
  // become unassigned, and selected members of other floors move here.
  const applySelection = (locations: Record<string, number | undefined>, level: number) => {
    const next = { ...locations };
    eligible.forEach(c => { if (selected.has(c.id)) next[c.id] = level; else if (next[c.id] === level) next[c.id] = undefined; });
    return next;
  };
  const assign = (level: number) => { setDraft(prev => applySelection(prev, level)); closePicker(); };
  const confirmDelete = () => {
    if (deleteLevel === null) return;
    setSetupLevels(prev => prev.filter(level => level !== deleteLevel));
    setDeleteLevel(null);
  };
  const toggleFloor = (level: number) => {
    if (setupLevels.includes(level)) {
      if (eligible.some(c => draft[c.id] === level)) setDeleteLevel(level);
      else setSetupLevels(prev => prev.filter(n => n !== level));
    } else setSetupLevels(prev => [...prev, level].sort((a, b) => a - b));
  };
  const saveFloors = () => {
    const next = Object.fromEntries(Object.entries(draft).map(([id, floor]) => [id, floor !== undefined && !setupLevels.includes(floor) ? undefined : floor]));
    setDraft(next);
    setLevels([...setupLevels].sort((a, b) => a - b));
    setSetup(false);
    setAdding(false);
    onSave(next, [...setupLevels].sort((a, b) => a - b), false);
  };
  const editFloors = () => {
    if (active !== null) setDraft(prev => applySelection(prev, active));
    closePicker();
    setSetupLevels([...levels]);
    setSetup(true);
  };

  return createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4" dir="rtl">
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="floor-title" className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col outline-none" onKeyDown={e => {
      if (e.key === 'Escape') { if (deleteLevel !== null) setDeleteLevel(null); else if (active !== null) closePicker(); else onClose(); }
      if (e.key === 'Tab') { const items = (deleteLevel !== null ? confirmation.current : panel.current)?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select'); if (!items?.length) return; const first = items[0], last = items[items.length-1]; if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }}>
      <header className="flex items-center justify-between p-5 border-b border-slate-100"><div className="flex items-center gap-3"><MapPin size={24} className="text-[#655ac1]" /><div><h3 id="floor-title" className="text-base font-black text-slate-800">{setup ? 'تحديد أدوار المدرسة' : 'توزيع الفصول على الأدوار'}</h3><p className="text-xs text-slate-500 mt-1">{setup ? 'اختر الأدوار الموجودة في المدرسة، ثم تابع لتوزيع الفصول.' : 'أضف الفصول تحت دورها، ثم احفظ التوزيع.'}</p></div></div><button aria-label="إغلاق" onClick={onClose} className="p-2 border border-slate-300 rounded-full text-slate-500"><X size={18} /></button></header>
      <div className="overflow-y-auto p-5 space-y-4">
        {setup ? <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{catalog.map(level => <button key={level} type="button" role="checkbox" aria-checked={setupLevels.includes(level)} onClick={() => toggleFloor(level)} className={`flex items-center justify-between gap-3 rounded-xl border bg-white p-4 text-right ${setupLevels.includes(level) ? 'border-slate-400' : 'border-slate-200 hover:border-slate-300'}`}><span className="text-sm font-bold text-slate-700">{getFloorLabel(level)}</span><span aria-hidden="true" className={`w-5 h-5 shrink-0 rounded-full border-2 inline-flex items-center justify-center ${setupLevels.includes(level) ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'}`}><Check size={12} strokeWidth={3.5} /></span></button>)}</div>
          <p className="text-xs text-slate-400">يمكنك تعديل الاختيار لاحقاً. تُرتّب الأدوار تلقائياً من الأرضي إلى الأعلى.</p>
        </> : <>
          <div className="flex justify-end"><button onClick={editFloors} className={`${button} inline-flex items-center gap-2`}><Settings2 size={15} />تعديل أدوار المدرسة</button></div>

        <div aria-live="polite" className={`rounded-xl border px-4 py-3 ${missing ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          <span className="text-sm font-bold">{missing ? `باقي ${missing} فصول لم تُوزّع` : 'تم توزيع جميع الفصول'}</span>
        </div>

        <div className="space-y-3">
          {levels.map(level => {
            const assigned = eligible.filter(c => draft[c.id] === level);
            const isOpen = active === level;
            return <section key={level} aria-label={getFloorLabel(level)} className={`rounded-2xl border overflow-hidden transition-colors ${isOpen ? 'border-slate-400' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/70">
                <div className="flex items-center gap-2"><h4 className="text-sm font-black text-slate-800">{getFloorLabel(level)}</h4><span className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500">{assigned.length} فصل</span></div>
                <div className="flex items-center gap-2">{!isOpen && <button onClick={() => openPicker(level)} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#655ac1] hover:bg-slate-100 rounded-lg px-2 py-2"><Settings2 size={15} />إضافة / إعداد</button>}</div>
              </div>
              <div className="px-4 py-3">
                {!isOpen && (assigned.length > 0 ? <div className="flex flex-wrap gap-2">{assigned.map(c => <div key={c.id} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700">{c.name || getClassroomDisplayName(c)}</div>)}</div> : <p className="text-xs text-slate-400 py-1">لم تُضف فصول لهذا الدور بعد</p>)}

                {isOpen && <div>
                  <div className="flex items-center justify-between gap-2 mb-3"><p className="text-xs font-bold text-slate-600">اختر الفصول الموجودة في {getFloorLabel(level)}</p><button aria-label="إغلاق اختيار الفصول" onClick={closePicker} className="p-1 text-slate-400 hover:text-slate-700"><X size={16} /></button></div>
                  <p className="text-[11px] text-slate-500 mb-3">حدّد فصول هذا الدور. تحديد فصل من دور آخر ينقله هنا، وإلغاء تحديد فصل يزيل ربطه بهذا الدور.</p>
                  {visible.length > 0 && <div className="flex justify-end mb-3"><button type="button" onClick={() => setSelected(visible.every(c => selected.has(c.id)) ? new Set() : new Set(visible.map(c => c.id)))} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 transition-all hover:border-[#655ac1]/30 hover:text-[#655ac1]">{visible.every(c => selected.has(c.id)) ? 'إلغاء اختيار الكل' : 'اختيار الكل'}</button></div>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">{visible.map(c => <button type="button" role="checkbox" aria-checked={selected.has(c.id)} key={c.id} onClick={() => setSelected(prev => { const next = new Set(prev); next.has(c.id) ? next.delete(c.id) : next.add(c.id); return next; })} className={`flex items-center justify-between gap-2 rounded-xl border bg-white p-3 text-right transition-colors ${selected.has(c.id) ? 'border-slate-400' : 'border-slate-200 hover:border-slate-300'}`}><span><span className={`block text-xs font-bold ${selected.has(c.id) ? 'text-[#655ac1]' : 'text-slate-700'}`}>{c.name || getClassroomDisplayName(c)}</span><span className="block text-[10px] text-slate-400 mt-1">{getFloorLabel(draft[c.id])}</span></span><span aria-hidden="true" className={`w-5 h-5 shrink-0 rounded-full border-2 inline-flex items-center justify-center ${selected.has(c.id) ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}><Check size={12} strokeWidth={3.5} /></span></button>)}</div>
                  {!visible.length && <p className="text-center py-4 text-xs text-slate-400">لا توجد فصول متاحة</p>}
                  <div className="flex justify-end gap-2 items-center mt-3"><button onClick={closePicker} className={button}>إلغاء</button><button onClick={() => assign(level)} className="px-5 py-2 rounded-xl bg-[#655ac1] hover:bg-[#5046a0] text-white text-xs font-black">إضافة</button></div>
                </div>}
              </div>
            </section>;
          })}
        </div>

        </>}
        {setup && <>{!adding ? <button className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#655ac1] px-2 py-2" onClick={() => { setAdding(true); setNewFloor(String(Math.max(...catalog) + 1)); setError(''); }}><Plus size={15} />إضافة دور آخر</button> : <div className="rounded-2xl border border-dashed border-slate-300 p-4"><div className="flex gap-2 items-center flex-wrap"><label className="text-xs font-bold text-slate-600" htmlFor="new-floor">رقم الدور</label><input autoFocus id="new-floor" type="number" min="0" step="1" value={newFloor} onChange={e => { setNewFloor(e.target.value); setError(''); }} className="border border-slate-200 rounded-xl p-2 w-24 text-sm outline-none focus:border-[#655ac1]" /><button className={button} onClick={() => { const n = Number(newFloor); if (!newFloor.trim() || !Number.isSafeInteger(n) || n < 0) { setError('أدخل رقماً صحيحاً موجباً أو صفراً.'); return; } if (catalog.includes(n)) { setError('هذا الدور موجود في القائمة؛ اختره مباشرة.'); return; } setCatalog(prev => [...prev, n].sort((a,b) => a-b)); setSetupLevels(prev => [...prev, n].sort((a,b) => a-b)); setAdding(false); }}>إضافة الدور</button><button className="text-xs text-slate-500 px-2 py-2" onClick={() => setAdding(false)}>إلغاء</button></div>{error && <p role="alert" className="text-xs text-rose-600 mt-2">{error}</p>}</div>}
        </>}
      </div>
      <footer className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap"><span className="text-xs text-slate-400">{setup ? `${setupLevels.length} أدوار محددة` : 'تُطبّق التغييرات عند حفظ التوزيع'}</span><div className="flex gap-2"><button onClick={() => { if (setup && floors !== undefined) { setSetup(false); setAdding(false); } else onClose(); }} className={button}>إلغاء</button><button disabled={setup && !setupLevels.length} onClick={() => setup ? saveFloors() : onSave(active !== null ? applySelection(draft, active) : draft, levels)} className="px-8 py-3 bg-[#655ac1] text-white font-black text-sm rounded-xl shadow-lg disabled:opacity-40 flex items-center gap-2"><CheckCircle2 size={16} />{setup ? 'حفظ ومتابعة' : 'حفظ'}</button></div></footer>
      {deleteLevel !== null && <div className="fixed inset-0 z-[10020] bg-slate-900/45 flex items-center justify-center p-4"><div ref={confirmation} role="alertdialog" aria-modal="true" aria-labelledby="delete-floor-title" aria-describedby="delete-floor-description" className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"><div className="p-6 text-right"><div className="flex items-center gap-3 mb-5"><Trash2 size={27} className="text-rose-500 shrink-0" /><h3 id="delete-floor-title" className="text-lg font-black text-slate-800">تأكيد إلغاء اختيار الدور</h3></div><p id="delete-floor-description" className="text-sm font-bold text-slate-500">هل تريد إلغاء اختيار {getFloorLabel(deleteLevel)}؟ سيُلغى ربط {eligible.filter(c => draft[c.id] === deleteLevel).length} فصول به دون حذف الفصول نفسها.</p><p className="text-xs text-slate-400 mt-2">يُعتمد التغيير عند الضغط على حفظ ومتابعة.</p></div><div className="px-6 py-4 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-3"><button autoFocus onClick={() => setDeleteLevel(null)} className="w-full px-5 py-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600">إلغاء</button><button onClick={confirmDelete} className="w-full px-5 py-3 rounded-xl bg-rose-500 text-white text-sm font-black flex items-center justify-center gap-2"><Trash2 size={15} />تأكيد الإلغاء</button></div></div></div>}
    </div>
  </div>, document.body);
}
