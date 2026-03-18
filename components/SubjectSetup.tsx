
import React, { useState, useMemo, useEffect } from 'react';
import { Specialization, Subject, Phase, SchoolInfo, ScheduleSettingsData } from '../types';
import { Tag, BookOpen, Trash2, Edit3, RotateCcw, Archive, CheckCircle2, X, Archive as ArchiveIcon, ChevronDown, ChevronUp, Layers, GraduationCap, School, Building, TypeIcon } from 'lucide-react';
import SubjectAbbreviationsModal from './schedule/SubjectAbbreviationsModal';

interface Props {
  specializations: Specialization[];
  setSpecializations: React.Dispatch<React.SetStateAction<Specialization[]>>;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  schoolInfo?: SchoolInfo;
}

const SubjectSetup: React.FC<Props> = ({ specializations, setSpecializations, subjects, setSubjects, schoolInfo }) => {
  const [activeTab, setActiveTab] = useState<Phase | 'all'>('all');
  const [editingSub, setEditingSub] = useState<Subject | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [showAbbreviationsModal, setShowAbbreviationsModal] = useState(false);

  const availablePhases = useMemo(() => {
    const phases = new Set(subjects.map(s => s.phases[0]));
    return Array.from(phases);
  }, [subjects]);

  useEffect(() => {
    if (activeTab === 'all' && availablePhases.length > 0 && availablePhases.length < 2) {
      setActiveTab(availablePhases[0]);
    }
  }, [availablePhases]);

  const filteredSubjects = subjects.filter(s => !s.isArchived && (activeTab === 'all' || s.phases.includes(activeTab as Phase)));
  const archivedSubjects = subjects.filter(s => s.isArchived);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    setSubjects(prev => prev.map(s => s.id === editingSub.id ? editingSub : s));
    setEditingSub(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-black text-slate-800">المواد المعتمدة</h2>
          <p className="text-slate-400 text-sm">راجع واضبط نصاب الحصص لكل مادة دراسية.</p>
        </div>
        <button 
          onClick={() => setShowAbbreviationsModal(true)}
          title="اختصارات المواد"
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold transition-all hover:border-[#8779fb]"
        >
          <TypeIcon size={18} className="text-indigo-500" />
          <span>اختصارات المواد</span>
        </button>
      </div>

      {/* Compact Phase Tabs */}
      {availablePhases.length > 1 && (
        <div className="flex p-1 bg-slate-100/60 rounded-2xl w-fit border border-slate-200/50 shadow-inner">
            <button 
                onClick={() => setActiveTab('all')}
                className={`px-6 py-2 rounded-xl font-black text-[11px] transition-all duration-300 ${activeTab === 'all' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
                الكل
            </button>
            {availablePhases.map(p => (
                <button 
                    key={p}
                    onClick={() => setActiveTab(p)}
                    className={`px-6 py-2 rounded-xl font-black text-[11px] transition-all duration-300 flex items-center gap-2 ${activeTab === p ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    {p}
                </button>
            ))}
        </div>
      )}

      <div className="space-y-8">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredSubjects.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                   <BookOpen size={40} className="text-slate-100 mx-auto mb-4" />
                   <p className="text-slate-300 font-bold">لا توجد مواد في هذا القسم.</p>
                </div>
              ) : (
                filteredSubjects.map(s => (
                  <div key={s.id} className="group flex flex-col p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:border-primary/20 hover:shadow-xl transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="text-[9px] font-black text-primary bg-primary/5 px-2.5 py-1 rounded-lg w-fit mb-1.5 border border-primary/10 truncate">{s.phases[0]}</span>
                        <h3 className="font-black text-slate-800 text-sm leading-tight group-hover:text-primary transition-colors truncate">{s.name}</h3>
                      </div>
                      <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                        <span className="text-lg font-black leading-none">{s.periodsPerClass}</span>
                        <span className="text-[7px] font-black uppercase opacity-60">حصة</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                        <div className="flex flex-wrap gap-1">
                            {s.targetGrades ? s.targetGrades.map(g => (
                                <span key={g} className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">صف {g}</span>
                            )) : <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">عام</span>}
                        </div>
                        <div className="flex gap-1.5">
                            <button onClick={() => setEditingSub(s)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all border border-slate-50"><Edit3 size={14} /></button>
                            <button onClick={() => setSubjects(prev => prev.map(x => x.id === s.id ? {...x, isArchived: true} : x))} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all border border-slate-50"><ArchiveIcon size={14} /></button>
                        </div>
                    </div>
                  </div>
                ))
              )}
           </div>

           {archivedSubjects.length > 0 && (
               <div className="bg-slate-50/50 rounded-[2rem] border border-slate-100 overflow-hidden">
                   <button onClick={() => setIsArchiveOpen(!isArchiveOpen)} className="w-full flex items-center justify-between p-6 hover:bg-slate-100/50 transition-all">
                       <div className="flex items-center gap-3 text-slate-500 font-bold text-sm"><ArchiveIcon size={20} /> الأرشيف ({archivedSubjects.length})</div>
                       <ChevronDown size={18} className={`text-slate-300 transition-transform duration-300 ${isArchiveOpen ? 'rotate-180' : ''}`}/>
                   </button>
                   {isArchiveOpen && (
                       <div className="p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in slide-in-from-top-4">
                           {archivedSubjects.map(s => (
                               <div key={s.id} className="flex justify-between items-center p-3.5 bg-white rounded-2xl border border-slate-100 opacity-70 hover:opacity-100 transition-opacity">
                                   <div className="flex flex-col overflow-hidden">
                                       <span className="text-[11px] font-bold text-slate-700 truncate">{s.name}</span>
                                       <span className="text-[8px] text-slate-400 uppercase">{s.phases[0]}</span>
                                   </div>
                                   <div className="flex gap-1 shrink-0">
                                       <button onClick={() => setSubjects(prev => prev.map(x => x.id === s.id ? {...x, isArchived: false} : x))} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"><RotateCcw size={14} /></button>
                                       <button onClick={() => setSubjects(prev => prev.filter(x => x.id !== s.id))} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}
               </div>
           )}
      </div>

      {/* Edit Subject Modal */}
      {editingSub && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-primary p-6 text-white flex justify-between items-center">
                 <div className="overflow-hidden">
                    <h3 className="text-lg font-black truncate">تعديل: {editingSub.name}</h3>
                 </div>
                 <button onClick={() => setEditingSub(null)} className="p-1.5 hover:bg-white/10 rounded-full transition-all shrink-0"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdate} className="p-8 space-y-6">
                 <div className="space-y-6">
                    <div className="space-y-1.5 text-center">
                        <label className="text-[11px] font-black text-slate-500">نصاب الحصص الأسبوعي</label>
                        <div className="flex items-center justify-center gap-4">
                           <input 
                                type="number" 
                                className="w-24 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-2xl font-black text-center focus:border-primary transition-all" 
                                value={editingSub.periodsPerClass} 
                                onChange={e => setEditingSub({...editingSub, periodsPerClass: parseInt(e.target.value) || 0})} 
                           />
                           <span className="font-bold text-slate-400">حصة</span>
                        </div>
                    </div>
                    {editingSub.phases.includes(Phase.HIGH) && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                           <p className="text-[10px] font-black text-primary flex items-center gap-1.5"><GraduationCap size={14}/> تخصيص الصفوف الثانوية:</p>
                           <div className="flex gap-2">
                              {[1, 2, 3].map(g => (
                                  <label key={g} className="flex-1 flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-primary transition-all has-[:checked]:bg-primary/10 shadow-sm">
                                      <input type="checkbox" className="hidden" checked={editingSub.targetGrades?.includes(g)} onChange={(e) => {
                                              const grades = e.target.checked ? [...(editingSub.targetGrades || []), g] : (editingSub.targetGrades || []).filter(x => x !== g);
                                              setEditingSub({...editingSub, targetGrades: grades});
                                      }} />
                                      <span className={`text-[11px] font-black ${editingSub.targetGrades?.includes(g) ? 'text-primary' : 'text-slate-400'}`}>صف {g}</span>
                                  </label>
                              ))}
                           </div>
                        </div>
                    )}
                 </div>
                 <div className="flex gap-3">
                    <button type="submit" className="flex-1 bg-primary text-white py-3.5 rounded-2xl font-black text-sm hover:bg-secondary shadow-lg shadow-primary/10 transition-all active:scale-95">حفظ</button>
                    <button type="button" onClick={() => setEditingSub(null)} className="px-8 bg-slate-100 text-slate-500 py-3.5 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">إلغاء</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      <SubjectAbbreviationsModal 
        isOpen={showAbbreviationsModal}
        onClose={() => setShowAbbreviationsModal(false)}
        subjects={subjects}
        settings={{
          subjectAbbreviations: {},
          subjectConstraints: [],
          teacherConstraints: [],
          meetings: [],
          substitution: {
            method: 'auto',
            maxTotalQuota: 24,
            maxDailyTotal: 5
          }
        }}
        onSave={(abbreviations) => {
          console.log('Saved abbreviations:', abbreviations);
        }}
      />
    </div>
  );
};

export default SubjectSetup;
