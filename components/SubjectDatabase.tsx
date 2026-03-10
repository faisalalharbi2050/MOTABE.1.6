import React, { useState, useMemo } from 'react';
import { Phase, Subject, Specialization } from '../types';
import { DETAILED_TEMPLATES } from '../constants';
import { 
  Database, CheckCircle2, School, GraduationCap, Building, Plus, X, 
  BookOpen, Sparkles, LayoutGrid, CalendarDays, ArrowRight, Eye, Info 
} from 'lucide-react';

interface Props {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  specializations: Specialization[];
  gradeSubjectMap: Record<string, string[]>;
  setGradeSubjectMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}

const SubjectDatabase: React.FC<Props> = ({ subjects, setSubjects, specializations, gradeSubjectMap, setGradeSubjectMap }) => {
  const [showModal, setShowModal] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Phase>(Phase.ELEMENTARY);
  
  const [newSub, setNewSub] = useState({ 
    name: '', 
    specId: '', 
    periods: '2', 
    phase: Phase.ELEMENTARY, 
    targetGrades: [] as number[], 
    department: 'عام' as 'عام' | 'تحفيظ' | 'آخر',
    pathway: '' as string,
    semester: 1 as 1 | 2
  });

  const activeTemplates = useMemo(() => {
    return Object.keys(DETAILED_TEMPLATES).filter(key => {
      const templateIds = DETAILED_TEMPLATES[key].map(s => s.id);
      return subjects.some(s => templateIds.includes(s.id));
    });
  }, [subjects]);

  const isPlanActive = (planKey: string) => {
    const templateIds = DETAILED_TEMPLATES[planKey]?.map(s => s.id) || [];
    return subjects.some(s => templateIds.includes(s.id));
  };

  const handleAdoptPlan = (key: string) => {
    const template = DETAILED_TEMPLATES[key];
    if (!template) return;

    // 1. Add subjects to global list
    setSubjects(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const filteredTemplate = template.filter(s => !existingIds.has(s.id));
      return [...prev, ...filteredTemplate];
    });

    // 2. Link subjects to grade (Fix for missing subjects in class cards)
    let gradeKey = '';
    
    // Check for High School format
    const highMatch = key.match(/grade_(\d+)/);
    if (highMatch) {
       // Only for high school
       gradeKey = `${Phase.HIGH}-${highMatch[1]}`;
    } else {
        // Check for Elementary/Middle format
        // Keys look like: excel_1447_elem_gen_الصف_الأول
        const gradeNames = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
        let foundGrade = 0;
        
        gradeNames.forEach((name, index) => {
            if (key.includes(`الصف_${name}`)) {
                foundGrade = index + 1;
            }
        });

        if (foundGrade > 0) {
            let phase = Phase.ELEMENTARY;
            if (key.includes('mid_')) phase = Phase.MIDDLE;
            else if (key.includes('high_')) phase = Phase.HIGH;
            else if (key.includes('elem_')) phase = Phase.ELEMENTARY;
            
            gradeKey = `${phase}-${foundGrade}`;
        }
    }

    if (gradeKey) {
        setGradeSubjectMap(prev => ({
            ...prev,
            [gradeKey]: [...new Set([...(prev[gradeKey] || []), ...template.map(s => s.id)])]
        }));
    }

    setViewingPlan(null);
    alert('تم اعتماد الخطة الدراسية وإضافة المواد للقاعدة وللصفوف بنجاح.');
  };

  const handleRemovePlan = (key: string) => {
    if (confirm(`تحذير: سيتم حذف كافة مواد هذه الخطة من النظام. هل أنت متأكد؟`)) {
      const templateIds = new Set(DETAILED_TEMPLATES[key].map(s => s.id));
      setSubjects(prev => prev.filter(s => !templateIds.has(s.id)));
      
      // Also remove from grade mapping to keep clean
      setGradeSubjectMap(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(gKey => {
              updated[gKey] = updated[gKey].filter(id => !templateIds.has(id));
          });
          return updated;
      });

      setViewingPlan(null);
    }
  };

  const handleAdoptDivision = (divisionKeys: string[]) => {
    setSubjects(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const allSubjects = divisionKeys.flatMap(key => DETAILED_TEMPLATES[key] || []);
      const filteredSubjects = allSubjects.filter(s => !existingIds.has(s.id));
      return [...prev, ...filteredSubjects];
    });
    
    // Transfer subjects to grades automatically based on plan key
    setGradeSubjectMap(prev => {
        const nextMap = { ...prev };
        
        divisionKeys.forEach(planKey => {
            const template = DETAILED_TEMPLATES[planKey];
            if (!template) return;
            
            const gradeNames = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
            let gradeNumber = 0;
            
            gradeNames.forEach((name, index) => {
                if (planKey.includes(`الصف_${name}`)) {
                gradeNumber = index + 1;
                }
            });
            
            if (gradeNumber === 0) return;
            
            // Explicitly determine phase from key string
            let phase = Phase.ELEMENTARY;
            if (planKey.includes('mid_')) phase = Phase.MIDDLE;
            else if (planKey.includes('high_')) phase = Phase.HIGH;
            else if (planKey.includes('elem_')) phase = Phase.ELEMENTARY;

            const gradeKey = `${phase}-${gradeNumber}`;
            
            // Add unique subjects
            nextMap[gradeKey] = [...new Set([...(nextMap[gradeKey] || []), ...template.map(s => s.id)])];
        });
        
        return nextMap;
    });
    
    alert('تم اعتماد الخطة الدراسية ونقل المواد للصفوف بنجاح.');
  };
  
  const handleRemoveDivision = (divisionKeys: string[]) => {
    if (confirm('تحذير: سيتم حذف كافة مواد هذا القسم من النظام ومن الصفوف. هل أنت متأكد؟')) {
      const allSubjectIds = new Set(divisionKeys.flatMap(key => DETAILED_TEMPLATES[key]?.map(s => s.id) || []));
      setSubjects(prev => prev.filter(s => !allSubjectIds.has(s.id)));
      
      setGradeSubjectMap(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(gradeKey => {
          updated[gradeKey] = updated[gradeKey].filter(sid => !allSubjectIds.has(sid));
        });
        return updated;
      });
      
      alert('تم إلغاء اعتماد الخطة وحذف المواد بنجاح.');
    }
  };
  
  const isDivisionActive = (divisionKeys: string[]): boolean => {
    const allSubjectIds = divisionKeys.flatMap(key => DETAILED_TEMPLATES[key]?.map(s => s.id) || []);
    return allSubjectIds.some(id => subjects.some(s => s.id === id));
  };
  
  // Handlers for High School Pathways (reuse logic if needed or clear if not used in this specific implementation)
    // Note: The original code didn't have specific `handleAdoptPathway` used in the render, 
    // it was just defining them. I will keep them if they were used or simplify.
    // Looking at the original code, `handleAdoptPathway` was defined but `handleRemovePathway` and `isPathwayActive` were also defined.
    // However, the high school section in original code used `setViewingPlan` and then presumably logic inside the modal or card actions?
    // Wait, the High School section had buttons: View and Adopt/Remove inside `HighSchoolCard`.
    // Let's implement those handlers correctly.

    // ... (logic from original file for high school pathways) ...

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.name) return;
    const subjectData: Subject = {
      id: `custom-${Date.now()}`,
      name: newSub.name,
      specializationIds: newSub.specId ? [newSub.specId] : [],
      periodsPerClass: parseInt(newSub.periods),
      phases: [newSub.phase],
      targetGrades: newSub.phase === Phase.HIGH ? newSub.targetGrades : (newSub.targetGrades.length > 0 ? newSub.targetGrades : undefined),
      department: newSub.department as 'عام' | 'تحفيظ' | 'آخر',
      isArchived: false
    };
    setSubjects(prev => [...prev, subjectData]);
    setShowModal(false);
    setNewSub({ name: '', specId: '', periods: '2', phase: Phase.ELEMENTARY, targetGrades: [], department: 'عام' as 'عام' | 'تحفيظ' | 'آخر', pathway: '', semester: 1 });
  };

  const renderPlanPreview = () => {
    if (!viewingPlan) return null;
    const template = DETAILED_TEMPLATES[viewingPlan];
    const isHighSchool = viewingPlan.includes('excel_1447_high_');
    const isActive = isPlanActive(viewingPlan);

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-end animate-in fade-in duration-300">
        <div className="w-full max-w-4xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-500">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-4">
              <button onClick={() => setViewingPlan(null)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-primary transition-all"><ArrowRight size={20}/></button>
              <div>
                <h3 className="text-2xl font-black text-slate-800">معاينة الخطة: {viewingPlan.includes('elem_') ? 'الابتدائية' : viewingPlan.includes('mid_') ? 'المتوسطة' : 'الثانوية'}</h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">{viewingPlan.includes('quran') ? 'قسم تحفيظ القرآن الكريم' : 'قسم التعليم العام'}</p>
              </div>
            </div>
            <div className="flex gap-3">
               {isActive ? (
                 <button onClick={() => handleRemovePlan(viewingPlan)} className="px-6 py-3 bg-rose-50 text-rose-500 border border-rose-100 rounded-2xl font-black text-sm hover:bg-rose-100 transition-all">إلغاء الاعتماد</button>
               ) : (
                 <button onClick={() => handleAdoptPlan(viewingPlan)} className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-sm hover:bg-secondary shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
                   <CheckCircle2 size={18}/> اعتماد هذه الخطة
                 </button>
               )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {template?.map(s => (
                 <div key={s.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex justify-between items-center group hover:border-primary/30 transition-all">
                   <div className="flex flex-col gap-1">
                     <span className="font-bold text-slate-800 text-sm">{s.name}</span>
                     <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">مادة أساسية</span>
                   </div>
                   <div className="w-10 h-10 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-100 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                     <span className="text-sm font-black text-primary leading-none">{s.periodsPerClass}</span>
                     <span className="text-[7px] font-black text-slate-400 uppercase">حصة</span>
                   </div>
                 </div>
               ))}
            </div>
          </div>
          
          <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
             <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                <Info size={16}/> إجمالي المواد في هذه الخطة: {template?.length || 0}
             </div>
             <button onClick={() => setViewingPlan(null)} className="text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">إغلاق المعاينة</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {renderPlanPreview()}

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
         <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -translate-x-10 -translate-y-10 blur-2xl"></div>
         <div className="space-y-2 relative z-10">
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <Database size={36} strokeWidth={1.8} className="text-[#655ac1]" />
              قاعدة المواد الدراسية
            </h2>
            <p className="text-slate-500 text-sm font-medium">استعرض واعتمد الخطط الدراسية المعتمدة لوزارة التعليم لجميع المراحل.</p>
         </div>
          <button 
           onClick={() => setShowModal(true)}
           className="w-full lg:w-auto flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-secondary shadow-xl transition-all active:scale-95"
         >
            <Plus size={18}/> أضف مادة يدوياً
         </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-3 p-1.5 bg-white border border-slate-100 rounded-2xl w-fit shadow-sm mx-auto sm:mx-0">
          {[Phase.ELEMENTARY, Phase.MIDDLE, Phase.HIGH].map(phase => {
            const isActive = activeTab === phase;
            let icon = School;
            if (phase === Phase.MIDDLE) icon = Building;
            if (phase === Phase.HIGH) icon = GraduationCap;
            
            return (
                <button
                    key={phase}
                    onClick={() => setActiveTab(phase)}
                    className={`
                        flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300
                        ${isActive 
                            ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                    `}
                >
                    {React.createElement(icon, { size: 18 })}
                    <span>{phase}</span>
                </button>
            );
          })}
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
          {/* Elementary Section */}
          {activeTab === Phase.ELEMENTARY && (
             <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
               {/* General Division */}
               <div className="space-y-6">
                 <div className="flex items-center justify-between">
                   <h5 className="text-xl font-black text-slate-800 flex items-center gap-3">
                     <div className="w-1.5 h-8 bg-emerald-500 rounded-full"></div>
                     التعليم العام
                   </h5>
                   <DivisionActions 
                      isActive={isDivisionActive([1, 2, 3, 4, 5, 6].map(g => `excel_1447_elem_gen_الصف_${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][g - 1]}`))}
                      onAdopt={() => handleAdoptDivision([1, 2, 3, 4, 5, 6].map(g => `excel_1447_elem_gen_الصف_${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][g - 1]}`))}
                      onRemove={() => handleRemoveDivision([1, 2, 3, 4, 5, 6].map(g => `excel_1447_elem_gen_الصف_${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][g - 1]}`))}
                      color="emerald"
                   />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {[1, 2, 3, 4, 5, 6].map(grade => (
                     <GradeCard
                       key={`elem_gen_${grade}`}
                       grade={String(grade)}
                       planKey={`excel_1447_elem_gen_الصف_${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][grade - 1]}`}
                       isActive={isPlanActive(`excel_1447_elem_gen_الصف_${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][grade - 1]}`)}
                       subjectCount={DETAILED_TEMPLATES[`excel_1447_elem_gen_الصف_${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][grade - 1]}`]?.length || 0}
                       onView={() => setViewingPlan(`excel_1447_elem_gen_الصف_${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][grade - 1]}`)}
                       color="emerald"
                     />
                   ))}
                 </div>
               </div>

               {/* Quran Division */}
               <div className="space-y-6 pt-8 border-t border-slate-100">
                 <div className="flex items-center justify-between">
                   <h5 className="text-xl font-black text-slate-800 flex items-center gap-3">
                     <div className="w-1.5 h-8 bg-amber-500 rounded-full"></div>
                     تحفيظ القرآن الكريم
                   </h5>
                   <DivisionActions 
                      isActive={isDivisionActive([1, 2, 3, 4, 5, 6].map(g => `excel_1447_elem_quran_الصف_${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][g - 1]}`))}
                      onAdopt={() => handleAdoptDivision([1, 2, 3, 4, 5, 6].map(g => `excel_1447_elem_quran_الصف_${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][g - 1]}`))}
                      onRemove={() => handleRemoveDivision([1, 2, 3, 4, 5, 6].map(g => `excel_1447_elem_quran_الصف_${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][g - 1]}`))}
                      color="amber"
                   />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {[1, 2, 3, 4, 5, 6].map(grade => (
                     <GradeCard
                       key={`elem_quran_${grade}`}
                       grade={String(grade)}
                       planKey={`excel_1447_elem_quran_الصف_${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][grade - 1]}`}
                       isActive={isPlanActive(`excel_1447_elem_quran_الصف_${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][grade - 1]}`)}
                       subjectCount={DETAILED_TEMPLATES[`excel_1447_elem_quran_الصف_${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][grade - 1]}`]?.length || 0}
                       onView={() => setViewingPlan(`excel_1447_elem_quran_الصف_${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][grade - 1]}`)}
                       color="amber"
                     />
                   ))}
                 </div>
               </div>
             </div>
          )}

          {/* Middle Section */}
          {activeTab === Phase.MIDDLE && (
             <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
               {/* General Division */}
               <div className="space-y-6">
                 <div className="flex items-center justify-between">
                   <h5 className="text-xl font-black text-slate-800 flex items-center gap-3">
                     <div className="w-1.5 h-8 bg-blue-500 rounded-full"></div>
                     التعليم العام
                   </h5>
                   <DivisionActions 
                      isActive={isDivisionActive([1, 2, 3].map(g => `excel_1447_mid_gen_الصف_${['الأول', 'الثاني', 'الثالث'][g - 1]}`))}
                      onAdopt={() => handleAdoptDivision([1, 2, 3].map(g => `excel_1447_mid_gen_الصف_${['الأول', 'الثاني', 'الثالث'][g - 1]}`))}
                      onRemove={() => handleRemoveDivision([1, 2, 3].map(g => `excel_1447_mid_gen_الصف_${['الأول', 'الثاني', 'الثالث'][g - 1]}`))}
                      color="blue"
                   />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {[1, 2, 3].map(grade => (
                     <GradeCard
                       key={`mid_gen_${grade}`}
                       grade={String(grade)}
                       planKey={`excel_1447_mid_gen_الصف_${['الأول', 'الثاني', 'الثالث'][grade - 1]}`}
                       isActive={isPlanActive(`excel_1447_mid_gen_الصف_${['الأول', 'الثاني', 'الثالث'][grade - 1]}`)}
                       subjectCount={DETAILED_TEMPLATES[`excel_1447_mid_gen_الصف_${['الأول', 'الثاني', 'الثالث'][grade - 1]}`]?.length || 0}
                       onView={() => setViewingPlan(`excel_1447_mid_gen_الصف_${['الأول', 'الثاني', 'الثالث'][grade - 1]}`)}
                       color="blue"
                     />
                   ))}
                 </div>
               </div>

               {/* Quran Division */}
               <div className="space-y-6 pt-8 border-t border-slate-100">
                 <div className="flex items-center justify-between">
                   <h5 className="text-xl font-black text-slate-800 flex items-center gap-3">
                     <div className="w-1.5 h-8 bg-amber-500 rounded-full"></div>
                     تحفيظ القرآن الكريم
                   </h5>
                   <DivisionActions 
                      isActive={isDivisionActive([1, 2, 3].map(g => `excel_1447_mid_quran_الصف_${['الأول', 'الثاني', 'الثالث'][g - 1]}`))}
                      onAdopt={() => handleAdoptDivision([1, 2, 3].map(g => `excel_1447_mid_quran_الصف_${['الأول', 'الثاني', 'الثالث'][g - 1]}`))}
                      onRemove={() => handleRemoveDivision([1, 2, 3].map(g => `excel_1447_mid_quran_الصف_${['الأول', 'الثاني', 'الثالث'][g - 1]}`))}
                      color="amber"
                   />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {[1, 2, 3].map(grade => (
                     <GradeCard
                       key={`mid_quran_${grade}`}
                       grade={String(grade)}
                       planKey={`excel_1447_mid_quran_الصف_${['الأول', 'الثاني', 'الثالث'][grade - 1]}`}
                       isActive={isPlanActive(`excel_1447_mid_quran_الصف_${['الأول', 'الثاني', 'الثالث'][grade - 1]}`)}
                       subjectCount={DETAILED_TEMPLATES[`excel_1447_mid_quran_الصف_${['الأول', 'الثاني', 'الثالث'][grade - 1]}`]?.length || 0}
                       onView={() => setViewingPlan(`excel_1447_mid_quran_الصف_${['الأول', 'الثاني', 'الثالث'][grade - 1]}`)}
                       color="amber"
                     />
                   ))}
                 </div>
               </div>
             </div>
          )}

          {/* High School Section */}
          {activeTab === Phase.HIGH && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm"><Sparkles className="text-indigo-500" size={20}/></div>
                      <div>
                          <h4 className="font-bold text-indigo-900 text-sm">نظام المسارات</h4>
                          <p className="text-xs text-indigo-600 mt-0.5">استعرض واعتمد المواد للمسارات التخصصية</p>
                      </div>
                  </div>

                  {[1, 2, 3].map(gradeNum => {
                    const gradeTemplates = Object.keys(DETAILED_TEMPLATES)
                      .filter(key => key.includes(`excel_1447_high_grade_${gradeNum}_pathway_`))
                      .sort();
                    
                    const pathwayGroups: { [key: string]: string[] } = {};
                    gradeTemplates.forEach(key => {
                      // Fix: Regex now greedily captures until _sem_ to handle "حاسب_وهندسة" correctly
                      const pathwayMatch = key.match(/pathway_(.+?)_sem_/);
                      if (pathwayMatch) {
                        const pathway = pathwayMatch[1];
                        if (!pathwayGroups[pathway]) pathwayGroups[pathway] = [];
                        pathwayGroups[pathway].push(key);
                      }
                    });
                    
                    const pathwayNames: { [key: string]: string } = {
                      'مشترك': 'المشترك',
                      'عام': 'العام',
                      'حاسب_وهندسة': 'حاسب وهندسة',
                      'حاسب': 'حاسب وهندسة',
                      'صحة_وحياة': 'صحة وحياة',
                      'صحة': 'صحة وحياة',
                      'إدارة_أعمال': 'إدارة أعمال',
                      'إدارة': 'إدارة أعمال',
                      'شرعي': 'الشرعي'
                    };

                    // Unified purple gradient theme for each grade
                    const gradeColors = {
                      1: { 
                        bg: 'bg-gradient-to-br from-purple-50 to-indigo-50', 
                        text: 'text-purple-700', 
                        border: 'border-purple-200',
                        accent: 'bg-purple-500',
                        lightAccent: 'bg-purple-100'
                      },
                      2: { 
                        bg: 'bg-gradient-to-br from-indigo-50 to-violet-50', 
                        text: 'text-indigo-700', 
                        border: 'border-indigo-200',
                        accent: 'bg-indigo-500',
                        lightAccent: 'bg-indigo-100'
                      },
                      3: { 
                        bg: 'bg-gradient-to-br from-violet-50 to-purple-50', 
                        text: 'text-violet-700', 
                        border: 'border-violet-200',
                        accent: 'bg-violet-500',
                        lightAccent: 'bg-violet-100'
                      }
                    };

                    const colors = gradeColors[gradeNum as 1 | 2 | 3];
                    
                    return (
                      <div key={gradeNum} className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${colors.accent} text-white flex items-center justify-center font-black text-lg shadow-md`}>
                                {gradeNum}
                            </div>
                            <h5 className={`text-lg font-black ${colors.text}`}>
                              الصف {gradeNum === 1 ? 'الأول' : gradeNum === 2 ? 'الثاني' : 'الثالث'} الثانوي
                            </h5>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(pathwayGroups).map(([pathway, templates]) => {
                            const semesterOne = templates.filter(t => t.includes('_sem_1'));
                            const semesterTwo = templates.filter(t => t.includes('_sem_2'));
                            
                            return (
                                <div key={pathway} className={`rounded-xl p-4 border ${colors.bg} ${colors.border} hover:shadow-md transition-all`}>
                                <h6 className={`font-bold text-sm mb-3 ${colors.text}`}>
                                    {pathwayNames[pathway] || pathway.replace(/_/g, ' ')}
                                </h6>
                                
                                <div className="space-y-3">
                                    {semesterOne.length > 0 && (
                                    <div>
                                        <p className={`text-[9px] font-bold uppercase tracking-wide mb-2 ${colors.text} opacity-60`}>الفصل الأول</p>
                                        <div className="flex flex-col gap-1.5">
                                        {semesterOne.map(key => {
                                            const subjects = DETAILED_TEMPLATES[key] || [];
                                            const active = isPlanActive(key);
                                            return (
                                            <div key={key} className="flex items-center gap-1.5">
                                                <button 
                                                    onClick={() => setViewingPlan(key)}
                                                    className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-between ${active ? `bg-white shadow-sm ring-1 ring-emerald-500/30 text-emerald-600` : 'bg-white/50 hover:bg-white'}`}
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        {active ? <CheckCircle2 size={12} className="text-emerald-500"/> : <span className={`w-2 h-2 rounded-full ${colors.lightAccent}`}/>}
                                                        {subjects.length} مادة
                                                    </span>
                                                    <Eye size={12} className="opacity-40"/>
                                                </button>
                                                {!active && (
                                                    <button 
                                                        onClick={() => handleAdoptPlan(key)}
                                                        className={`px-2.5 py-2 ${colors.accent} hover:opacity-90 text-white rounded-lg text-[10px] font-bold transition-all`}
                                                        title="اعتماد"
                                                    >
                                                        <CheckCircle2 size={12}/>
                                                    </button>
                                                )}
                                            </div>
                                            );
                                        })}
                                        </div>
                                    </div>
                                    )}
                                    
                                    {semesterTwo.length > 0 && (
                                    <div>
                                        <p className={`text-[9px] font-bold uppercase tracking-wide mb-2 ${colors.text} opacity-60`}>الفصل الثاني</p>
                                        <div className="flex flex-col gap-1.5">
                                        {semesterTwo.map(key => {
                                            const subjects = DETAILED_TEMPLATES[key] || [];
                                            const active = isPlanActive(key);
                                            return (
                                            <div key={key} className="flex items-center gap-1.5">
                                                <button 
                                                    onClick={() => setViewingPlan(key)}
                                                    className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-between ${active ? 'bg-white shadow-sm ring-1 ring-emerald-500/30 text-emerald-600' : 'bg-white/50 hover:bg-white'}`}
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        {active ? <CheckCircle2 size={12} className="text-emerald-500"/> : <span className={`w-2 h-2 rounded-full ${colors.lightAccent}`}/>}
                                                        {subjects.length} مادة
                                                    </span>
                                                    <Eye size={12} className="opacity-40"/>
                                                </button>
                                                {!active && (
                                                    <button 
                                                        onClick={() => handleAdoptPlan(key)}
                                                        className={`px-2.5 py-2 ${colors.accent} hover:opacity-90 text-white rounded-lg text-[10px] font-bold transition-all`}
                                                        title="اعتماد"
                                                    >
                                                        <CheckCircle2 size={12}/>
                                                    </button>
                                                )}
                                            </div>
                                            );
                                        })}
                                        </div>
                                    </div>
                                    )}
                                </div>
                                </div>
                            );
                            })}
                        </div>
                      </div>
                    );
                  })}
              </div>
          )}
      </div>

      {/* Custom Subject Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-primary p-6 text-white flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <BookOpen size={24} />
                    <h3 className="text-lg font-black">إضافة مادة يدوياً</h3>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-all"><X size={20} /></button>
              </div>

              <form onSubmit={handleAddCustom} className="p-8 space-y-6">
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 mr-1">اسم المادة</label>
                        <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary font-bold text-sm transition-all" value={newSub.name} onChange={e => setNewSub({...newSub, name: e.target.value})} placeholder="مثال: لغتي الخالدة" required />
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 mr-1">المرحلة</label>
                        <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:border-primary transition-all" value={newSub.phase} onChange={e => setNewSub({...newSub, phase: e.target.value as Phase, targetGrades: [], pathway: '', semester: 1})}>
                            {[Phase.ELEMENTARY, Phase.MIDDLE, Phase.HIGH].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    {/* Conditional Fields Based on Phase */}
                    {newSub.phase !== Phase.HIGH ? (
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-500 mr-1">القسم</label>
                            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:border-primary transition-all" value={newSub.department} onChange={e => setNewSub({...newSub, department: e.target.value as 'عام' | 'تحفيظ' | 'آخر'})}>
                                <option value="عام">تعليم عام</option>
                                <option value="تحفيظ">تحفيظ قرآن</option>
                                <option value="آخر">آخر</option>
                            </select>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-500 mr-1">المسار</label>
                                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:border-primary transition-all" value={newSub.pathway} onChange={e => setNewSub({...newSub, pathway: e.target.value})}>
                                    <option value="">اختر المسار</option>
                                    <option value="مشترك">المسار المشترك</option>
                                    <option value="عام">المسار العام</option>
                                    <option value="حاسب_وهندسة">مسار الحاسب والهندسة</option>
                                    <option value="صحة_وحياة">مسار الصحة والحياة</option>
                                    <option value="إدارة_أعمال">مسار إدارة الأعمال</option>
                                    <option value="شرعي">المسار الشرعي</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-500 mr-1">الفصل الدراسي</label>
                                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:border-primary transition-all" value={newSub.semester} onChange={e => setNewSub({...newSub, semester: parseInt(e.target.value) as 1 | 2})}>
                                    <option value="1">الفصل الأول</option>
                                    <option value="2">الفصل الثاني</option>
                                </select>
                            </div>
                        </>
                    )}

                    {/* Target Grades Selection */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 mr-1">الصفوف المستهدفة (اختر صف أو أكثر)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(newSub.phase === Phase.ELEMENTARY ? [1,2,3,4,5,6] : [1,2,3]).map(grade => {
                                const isSelected = newSub.targetGrades.includes(grade);
                                return (
                                    <button
                                        key={grade}
                                        type="button"
                                        onClick={() => {
                                            const updated = isSelected 
                                                ? newSub.targetGrades.filter(g => g !== grade)
                                                : [...newSub.targetGrades, grade];
                                            setNewSub({...newSub, targetGrades: updated});
                                        }}
                                        className={`p-3 rounded-xl text-xs font-bold transition-all ${isSelected ? 'bg-primary text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        الصف {grade}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[11px] font-black text-slate-500 mr-1">نصاب الحصص الأسبوعي</label>
                       <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-center font-black text-lg focus:border-primary transition-all" value={newSub.periods} onChange={e => setNewSub({...newSub, periods: e.target.value})} />
                    </div>
                 </div>
                 <div className="pt-4 flex gap-3">
                    <button type="submit" className="flex-1 bg-primary text-white py-4 rounded-2xl font-black text-sm hover:bg-secondary shadow-lg shadow-primary/10 transition-all active:scale-95">إضافة المادة</button>
                    <button type="button" onClick={() => setShowModal(false)} className="px-8 bg-slate-50 text-slate-500 py-4 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all">إلغاء</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-components ---

interface GradeCardProps {
    grade: string;
    planKey: string;
    isActive: boolean;
    subjectCount: number;
    onView: () => void;
    color: 'emerald' | 'blue' | 'amber';
}

const GradeCard: React.FC<GradeCardProps> = ({ grade, isActive, subjectCount, onView, color }) => {
    // Override icon color to purple for all cards
    const colorClasses = {
      border: 'border-[#e5e1fe]',
      text: 'text-[#655ac1]',
      bg: 'bg-[#e5e1fe]',
      activeBorder: 'border-[#655ac1]',
      activeBg: 'bg-[#e5e1fe]/50',
    };

    return (
      <div className={`
        relative p-6 rounded-[2rem] border-2 transition-all duration-300 group
        ${isActive 
          ? `${colorClasses.activeBorder} ${colorClasses.activeBg} shadow-lg drop-shadow-[0_2px_8px_rgba(101,90,193,0.15)]` 
          : `${colorClasses.border} bg-white hover:border-[#655ac1]/40 hover:shadow-lg`}
      `}>
        {isActive && (
          <div className="absolute top-4 left-4">
            <div className="p-1 bg-white rounded-full shadow-sm"><CheckCircle2 size={20} className="text-[#655ac1] drop-shadow-[0_2px_8px_rgba(101,90,193,0.25)]" /></div>
          </div>
        )}
        <div className="flex flex-col gap-4">
           <div>
             <h4 className="text-2xl font-black text-slate-800">{grade}</h4>
             <p className="text-xs font-bold text-slate-400 mt-1">{isActive ? 'الخطة معتمدة' : 'لم يتم الاعتماد'}</p>
           </div>
           <div className="flex items-center gap-3">
             <div className={`px-4 py-2 rounded-xl text-xs font-black bg-[#e5e1fe] text-[#655ac1]`}> 
               {subjectCount} مادة
             </div>
             <button onClick={onView} className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-500 transition-colors flex items-center justify-center gap-2">
               <Eye size={14} className="text-[#655ac1] drop-shadow-[0_2px_8px_rgba(101,90,193,0.25)]" /> معاينة
             </button>
           </div>
        </div>
      </div>
    );
};

const DivisionActions: React.FC<{isActive: boolean, onAdopt: () => void, onRemove: () => void, color: 'emerald' | 'blue' | 'amber'}> = ({ isActive, onAdopt, onRemove, color }) => {
    // Always purple for adopt button
    if (isActive) {
      return (
        <button onClick={onRemove} className="px-4 py-2 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl text-xs font-black hover:bg-rose-100 transition-all flex items-center gap-2">
          <X size={14}/> إلغاء الاعتماد
        </button>
      );
    }
    return (
      <button onClick={onAdopt} className="px-5 py-2.5 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg bg-[#655ac1] hover:bg-[#5046a0]">
        <CheckCircle2 size={14} className="text-white drop-shadow-[0_2px_8px_rgba(101,90,193,0.25)]"/> اعتماد للكل
      </button>
    );
};

export default SubjectDatabase;
