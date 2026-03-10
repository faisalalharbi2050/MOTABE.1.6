import React, { useState, useMemo, useEffect } from 'react';
import { Phase, Subject, SchoolInfo } from '../../../types';
import { DETAILED_TEMPLATES } from '../../../constants';
import { STUDY_PLANS_CONFIG } from '../../../study_plans_config';
import {
  Plus, Trash2, Printer, Search, Eye, Download, Info, School, Building, GraduationCap, BookOpen, Layers, CheckCircle2, X, Edit2, Check, Copy, List, Sparkles, ArrowRight, Table, Grid
} from 'lucide-react';
import { GradeDetailsModal } from './GradeDetailsModal';
import SchoolTabs from '../SchoolTabs';
import StudyPlansModal from '../StudyPlansModal';
import { ScheduleSettingsData, SubjectConstraint } from '../../../types';
import { getMaxDailyPeriodsForSubject, describeDistribution, ValidationWarning, validateAllConstraints } from '../../../utils/scheduleConstraints';
import { Ban, Star, Repeat, AlertTriangle, ChevronDown } from 'lucide-react';

interface Props {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  schoolInfo: SchoolInfo;
  gradeSubjectMap: Record<string, string[]>;
  setGradeSubjectMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  scheduleSettings?: ScheduleSettingsData;
  setScheduleSettings?: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
}

const Step3Subjects: React.FC<Props> = ({ subjects, setSubjects, schoolInfo, gradeSubjectMap, setGradeSubjectMap, scheduleSettings, setScheduleSettings }) => {
  const [activeSchoolId, setActiveSchoolId] = useState<string>('main');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showConstraintsModal, setShowConstraintsModal] = useState(false);
  
  // Grade Details Modal State
  const [viewingGradeDetails, setViewingGradeDetails] = useState<{
      gradeKey: string;
      gradeName: string;
      department: string;
      phase: Phase;
  } | null>(null);

  // State to track approved department per phase
  const [phaseDepartmentMap, setPhaseDepartmentMap] = useState<Record<Phase, string>>({} as Record<Phase, string>);

  const customPlans = useMemo(() => {
      return subjects.reduce((acc, sub) => {
          if (sub.customPlanName) {
              if (!acc[sub.customPlanName]) acc[sub.customPlanName] = [];
              acc[sub.customPlanName].push(sub);
          }
          return acc;
      }, {} as Record<string, Subject[]>);
  }, [subjects]);

  // Helper to check if we have data for the current view
  const hasData = useMemo(() => {
     // We should only check if there is data for the ACTIVE school context
     // But for simplicity, we check generally. 
     // A better check would be filtering subjects by the current phases.
     const hasCustomPlans = Object.keys(customPlans).length > 0;
     const hasMinistryPlans = Object.keys(gradeSubjectMap).length > 0;
     
     return subjects.length > 0 && (hasMinistryPlans || hasCustomPlans);
  }, [subjects, gradeSubjectMap, customPlans]);

  // Determine Active Phases based on Active School + Added Subjects
  const currentPhases = useMemo(() => {
      let activePhases: Phase[] = [];
      
      // 1. Get Configured Phases
      if (activeSchoolId === 'main') {
          activePhases = schoolInfo.phases || [];
      } else {
          const shared = schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId);
          activePhases = shared?.phases || [];
      }

      // 2. Add Phases from Existing Subjects (so they don't disappear)
      const subjectPhases = new Set(subjects.map(s => s.phases[0]));
      
      // 3. Merge and Deduplicate
      const merged = Array.from(new Set([...activePhases, ...Array.from(subjectPhases)])) as Phase[];
      
      // 4. Default if empty
      if (merged.length === 0) return [Phase.ELEMENTARY];

      // 5. Sort by educational order
      const order = [Phase.ELEMENTARY, Phase.MIDDLE, Phase.HIGH, Phase.OTHER];
      return merged.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [activeSchoolId, schoolInfo, subjects]);


  // --- Helper Functions ---
  
  const getPhaseLabel = (phase: Phase) => {
    switch(phase) {
      case Phase.ELEMENTARY: return 'الابتدائية';
      case Phase.MIDDLE: return 'المتوسطة';
      case Phase.HIGH: return 'الثانوية';
      case Phase.KINDERGARTEN: return 'رياض الأطفال';
      default: return 'أخرى';
    }
  };
// ... (rest of helper functions)

  const getGradesForPhase = (phase: Phase) => {
      if (phase === Phase.KINDERGARTEN) return [1, 2];
      if (phase === Phase.ELEMENTARY) return [1, 2, 3, 4, 5, 6];
      if (phase === Phase.MIDDLE) return [1, 2, 3];
      if (phase === Phase.HIGH) return [1, 2, 3];
      if (phase === Phase.OTHER) return [1];
      return [];
  };

  const getGradeName = (phase: Phase, grade: number) => {
      if (phase === Phase.KINDERGARTEN) {
          return grade === 1 ? 'الحضانة - المستوى الأول' : 'رياض أطفال - المستوى الثاني';
      }
      const names = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
      return `الصف ${names[grade - 1] || grade}`;
  };

  // --- Actions ---

  const handleApprovePlan = (phase: Phase, departmentId: string, planKeys: string[], periodsOverride?: Record<string, number>) => {
      const newSubjects: Subject[] = [];
      const newMapUpdates: Record<string, string[]> = {};

      planKeys.forEach(key => {
          const templates = DETAILED_TEMPLATES[key] || [];
          // Add subjects
          templates.forEach(t => {
             const subject = periodsOverride?.[t.id] !== undefined
               ? { ...t, periodsPerClass: periodsOverride[t.id] }
               : t;
             // Check if subject exists (by ID) to avoid duplicates
             if (!subjects.find(s => s.id === t.id) && !newSubjects.find(s => s.id === t.id)) {
                 newSubjects.push(subject);
             }
          });

          // Update Map – detect grade from plan key
          let grade = 0;
          const gradeAR: Record<string, number> = { 'الأول': 1, 'الثاني': 2, 'الثالث': 3, 'الرابع': 4, 'الخامس': 5, 'السادس': 6 };

          // HS: _الأول|الثاني|الثالث_الثانوي
          const hsM = key.match(/_(الأول|الثاني|الثالث)_الثانوي/);
          if (hsM) {
            grade = gradeAR[hsM[1]] ?? 0;
          } else {
            // Middle: _الأول|الثاني|الثالث_المتوسط
            const midM = key.match(/_(الأول|الثاني|الثالث)_المتوسط/);
            if (midM) {
              grade = gradeAR[midM[1]] ?? 0;
            } else {
              // Elementary / other: search grade words from largest to smallest
              const gradeOrder: [string, number][] = [
                ['السادس', 6], ['الخامس', 5], ['الرابع', 4],
                ['الثالث', 3], ['الثاني', 2], ['الأول', 1]
              ];
              for (const [word, num] of gradeOrder) {
                if (key.includes(word)) { grade = num; break; }
              }
            }
          }
          // Numeric fallback
          if (grade === 0) {
            const nm = key.match(/grade_(\d+)/);
            if (nm) grade = parseInt(nm[1]);
          }

          if (grade > 0) {
             const gradeKey = `${phase}-${grade}`;
             newMapUpdates[gradeKey] = [
                 ...(gradeSubjectMap[gradeKey] || []),
                 ...(newMapUpdates[gradeKey] || []),
                 ...templates.map(s => s.id)
             ];
             newMapUpdates[gradeKey] = [...new Set(newMapUpdates[gradeKey])];
          }
      });
      
      setSubjects(prev => [...prev, ...newSubjects]);
      setGradeSubjectMap(prev => ({ ...prev, ...newMapUpdates }));
      
      // Update department map
      setPhaseDepartmentMap(prev => ({
          ...prev,
          [phase]: departmentId
      }));

      setShowPlanModal(false);
  };

  // School Selection Dropdown State
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  
  const handleDeletePlan = (phase: Phase) => {
      if (confirm('هل أنت متأكد من حذف الخطة الدراسية لهذه المرحلة؟ سيتم حذف جميع المواد المرتبطة بها.')) {
          // Identify subjects to remove (those in the gradeSubjectMap for this phase)
          const grades = getGradesForPhase(phase);
          let subjectsToRemove: string[] = [];
          
          grades.forEach(g => {
              const key = `${phase}-${g}`;
              if (gradeSubjectMap[key]) {
                  subjectsToRemove = [...subjectsToRemove, ...gradeSubjectMap[key]];
              }
          });

          // Update Map (Remove keys for this phase)
          setGradeSubjectMap(prev => {
              const next = { ...prev };
              grades.forEach(g => delete next[`${phase}-${g}`]);
              return next;
          });

          // Optional: Remove subjects from main list if they are no longer used?
          // For now, we keep them in 'subjects' array to avoid losing manual entries if keys overlap, 
          // or we can remove them if we are sure. 
          // Safest is just clearing the map for this phase.
          
          // Clear department map for this phase
          setPhaseDepartmentMap(prev => {
              const next = { ...prev };
              delete next[phase];
              return next;
          });
      }
  };

  const handleCustomPlanAdd = (planName: string, subjectCount: number) => {
      const generatedSubjects: Subject[] = [];
      
      for (let i = 0; i < subjectCount; i++) {
          const newSub: Subject = {
              id: `custom-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
              name: '',
              periodsPerClass: 0,
              phases: [Phase.OTHER], // Default phase, harmless
              department: 'custom',
              targetGrades: [],
              isArchived: false,
              specializationIds: [],
              customPlanName: planName
          };
          generatedSubjects.push(newSub);
      }

      setSubjects(prev => [...prev, ...generatedSubjects]);
      setShowManualModal(false);
  };
 
  // Grade Details Actions
  const handleOpenGradeDetails = (gradeKey: string, gradeName: string, phase: Phase) => {
      setViewingGradeDetails({
          gradeKey,
          gradeName,
          department: 'عام',
          phase
      });
  };

 const handleAddSubjectToGrade = (subject: Subject) => {
    setSubjects(prev => [...prev, subject]);
    if (viewingGradeDetails) {
      setGradeSubjectMap(prev => ({
        ...prev,
        [viewingGradeDetails.gradeKey]: [...(prev[viewingGradeDetails.gradeKey] || []), subject.id]
      }));
    }
 };

 const handleUpdateSubjectPeriods = (subjectId: string, periodsPerClass: number) => {
    setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, periodsPerClass } : s));
 };

 const handleDeleteSubjectFromGrade = (subjectId: string) => {
    if (viewingGradeDetails) {
      setGradeSubjectMap(prev => ({
        ...prev,
        [viewingGradeDetails.gradeKey]: (prev[viewingGradeDetails.gradeKey] || []).filter(id => id !== subjectId)
      }));
    }
 };

 const handleCopySubjectToGrades = (subjectId: string, targetGradeKeys: string[]) => {
    const original = subjects.find(s => s.id === subjectId);
    if (!original) return;

    targetGradeKeys.forEach(targetGradeKey => {
      const targetSubjectIds = gradeSubjectMap[targetGradeKey] || [];
      const alreadyExists = targetSubjectIds.some(id => {
        const s = subjects.find(sub => sub.id === id);
        return s?.name === original.name;
      });

      if (alreadyExists) return;

      const clonedSubject: Subject = {
        ...original,
        id: `copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      setSubjects(prev => [...prev, clonedSubject]);
      setGradeSubjectMap(prev => ({
        ...prev,
        [targetGradeKey]: [...(prev[targetGradeKey] || []), clonedSubject.id]
      }));
    });
    alert(`تم نسخ المادة بنجاح!`);
 };

 const getAvailableGradesForCopy = (currentGradeKey: string, phase: Phase) => {
     const grades = getGradesForPhase(phase);
     return grades.map(g => {
         const key = `${phase}-${g}`;
         if (key === currentGradeKey) return null;
         return { key, label: getGradeName(phase, g) };
     }).filter(Boolean) as { key: string; label: string }[];
 };


  // --- Render ---

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>
          
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <BookOpen size={36} strokeWidth={1.8} className="text-[#655ac1]" />
             المواد الدراسية
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إدارة الخطط الدراسية والمواد وتوزيع الحصص</p>
      </div>



      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-4">
           {/* Study Plans Button */}
           <div className="relative">
               <button 
                 onClick={() => setShowPlanModal(true)}
                 className="flex items-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 transition-all hover:scale-105 active:scale-95"
               >
                   <Layers size={20} />
                   الخطط الدراسية
               </button>
           </div>

            {/* Subject Constraints Button */}
            {scheduleSettings && setScheduleSettings && (
              <button 
                onClick={() => setShowConstraintsModal(true)}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-bold transition-all hover:border-[#8779fb]"
              >
                  <Ban size={20} className="text-rose-500" />
                  قيود المواد
              </button>
            )}

           <button 
             onClick={() => setShowManualModal(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-bold transition-all hover:border-[#8779fb]"
          >
              <Plus size={20} className="text-[#8779fb]" />
              إضافة خطة مخصصة
          </button>
      </div>

      {/* Custom Plans Render Area */}
      {Object.entries(customPlans).map(([planName, planSubjects]: [string, Subject[]]) => (
           <div key={planName} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mb-6">
                <div className="p-6 border-b border-slate-100 bg-[#f8f7ff] flex justify-between items-center">
                    <h4 className="font-black text-lg text-[#655ac1] flex items-center gap-2">
                        <List size={20} />
                        {planName}
                        <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-500 font-bold">خطة مخصصة</span>
                    </h4>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="group flex items-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-800 px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 shadow-sm">
                            <Printer size={16} className="transition-transform group-hover:scale-110" /> 
                            طباعة
                        </button>
                        <button 
                            onClick={() => {
                                if (confirm('هل أنت متأكد من حذف هذه الخطة بالكامل؟')) {
                                    setSubjects(prev => prev.filter(s => s.customPlanName !== planName));
                                }
                            }}
                            className="group flex items-center gap-1.5 bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-500 hover:text-white hover:border-rose-500 px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 shadow-sm"
                            title="حذف الخطة"
                        >
                            <Trash2 size={16} className="transition-transform group-hover:scale-110" /> 
                            حذف
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white border-b border-slate-100">
                                <th className="px-6 py-4 text-right text-sm font-black text-slate-600">اسم المادة</th>
                                <th className="px-6 py-4 text-center text-sm font-black text-slate-600">عدد الحصص</th>
                                <th className="px-6 py-4 text-center text-sm font-black text-slate-600">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {planSubjects.map((sub, idx) => (
                                <tr key={sub.id} className="hover:bg-[#f8f7ff] transition-colors group">
                                    <td className="px-6 py-4">
                                        <input 
                                            value={sub.name}
                                            onChange={e => {
                                                setSubjects(prev => prev.map(s => s.id === sub.id ? { ...s, name: e.target.value } : s));
                                            }}
                                            placeholder={`مادة ${idx + 1}`}
                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#655ac1] outline-none font-bold text-slate-800 transition-colors py-1"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                         <input 
                                            type="number"
                                            value={sub.periodsPerClass}
                                            onChange={e => {
                                                setSubjects(prev => prev.map(s => s.id === sub.id ? { ...s, periodsPerClass: parseInt(e.target.value) || 0 } : s));
                                            }}
                                            className="w-20 text-center bg-slate-50 border border-slate-200 rounded-lg py-1 focus:border-[#655ac1] outline-none font-bold text-slate-700"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                               onClick={() => {
                                                   if (confirm('حذف المادة؟')) {
                                                       setSubjects(prev => prev.filter(s => s.id !== sub.id));
                                                   }
                                               }}
                                               className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                                               title="حذف"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
           </div>
      ))}

      {/* Main Content Area */}
      {/* We iterate over currentPhases instead of schoolInfo.phases to match active tab */}
      {hasData ? (
          <div className="space-y-6">
             {currentPhases.map(phase => {
                 const grades = getGradesForPhase(phase);
                 const phaseData = grades.map(grade => {
                     const gradeKey = `${phase}-${grade}`;
                     const subjectIds = gradeSubjectMap[gradeKey] || [];
                     const gradeSubjects = subjects.filter(s => subjectIds.includes(s.id));
                     const totalPeriods = gradeSubjects.reduce((acc, curr) => acc + curr.periodsPerClass, 0);
                     
                     return {
                         grade,
                         gradeKey,
                         gradeName: getGradeName(phase, grade),
                         subjectCount: gradeSubjects.length,
                         totalPeriods,
                         subjects: gradeSubjects
                     };
                 }).filter(d => d.subjectCount > 0); 

                 if (phaseData.length === 0) return null;

                  const departmentId = phaseDepartmentMap[phase];
                  const departmentName = departmentId 
                      ? STUDY_PLANS_CONFIG.find(c => c.phase === phase)?.departments.find(d => d.id === departmentId)?.name 
                      : null;
                  
                  const activeSchoolName = activeSchoolId === 'main' 
                      ? schoolInfo.schoolName 
                      : schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId)?.name;

                  return (
                      <div key={phase} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                          <div className="p-6 border-b border-slate-100 bg-[#f8f7ff] flex justify-between items-center">
                              <h4 className="font-black text-lg text-[#655ac1] flex items-center gap-2">
                                  <span className="text-slate-700">{activeSchoolName}</span>
                                  <span className="text-slate-300">|</span>
                                  {getPhaseLabel(phase)}
                                  {departmentName && (
                                      <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                                          {departmentName}
                                      </span>
                                  )}
                              </h4>
                             <div className="flex gap-3">
                                  <button onClick={() => alert('تم اعتماد الخطة بنجاح')} className="group flex items-center gap-2 bg-gradient-to-l from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all duration-200 shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300 hover:-translate-y-0.5">
                                      <CheckCircle2 size={18} className="transition-transform group-hover:scale-110" /> 
                                      اعتماد
                                  </button>
                                  <button onClick={() => window.print()} className="group flex items-center gap-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-800 px-5 py-2.5 rounded-xl text-sm font-black transition-all duration-200 shadow-sm hover:shadow-md">
                                      <Printer size={18} className="transition-transform group-hover:scale-110" /> 
                                      طباعة
                                  </button>
                                  <button 
                                      onClick={() => handleDeletePlan(phase)}
                                      className="group flex items-center gap-2 bg-white text-rose-500 border border-rose-200 hover:bg-rose-500 hover:text-white hover:border-rose-500 px-5 py-2.5 rounded-xl text-sm font-black transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-rose-200"
                                      title="حذف الخطة"
                                  >
                                      <Trash2 size={18} className="transition-transform group-hover:scale-110" /> 
                                      حذف
                                  </button>
                              </div>
                         </div>
                         
                         <div className="overflow-x-auto">
                             <table className="w-full">
                                 <thead>
                                     <tr className="bg-white border-b border-slate-100">
                                         <th className="px-6 py-4 text-right text-sm font-black text-slate-600">الصف</th>
                                         <th className="px-6 py-4 text-center text-sm font-black text-slate-600">عدد المواد</th>
                                         <th className="px-6 py-4 text-center text-sm font-black text-slate-600">عدد الحصص</th>
                                         <th className="px-6 py-4 text-center text-sm font-black text-slate-600">الإجراءات</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50">
                                     {phaseData.map((row) => (
                                         <tr key={row.grade} className="hover:bg-[#f8f7ff] transition-colors group">
                                             <td className="px-6 py-4 text-sm font-bold text-slate-800">
                                                 <div className="flex items-center gap-3">
                                                     <div className="w-2 h-8 bg-[#8779fb] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                     {row.gradeName}
                                                 </div>
                                             </td>
                                             <td className="px-6 py-4 text-center">
                                                 <span className="inline-flex items-center justify-center bg-[#e5e1fe] text-[#655ac1] px-3 py-1 rounded-full text-xs font-black">
                                                     {row.subjectCount}
                                                 </span>
                                             </td>
                                              <td className="px-6 py-4 text-center">
                                                 <span className="inline-flex items-center justify-center bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-black">
                                                     {row.totalPeriods}
                                                 </span>
                                             </td>
                                             <td className="px-6 py-4">
                                                 <div className="flex items-center justify-center gap-2">
                                                     <button 
                                                        onClick={() => handleOpenGradeDetails(row.gradeKey, row.gradeName, phase)}
                                                        className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 hover:text-[#655ac1] transition-all"
                                                        title="معاينة وتعديل"
                                                     >
                                                         <List size={18} />
                                                     </button>
                                                 </div>
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 );
             })}
          </div>
      ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-slate-100 border-dashed">
              <div className="w-20 h-20 bg-[#e5e1fe] rounded-full flex items-center justify-center text-[#655ac1] mb-6 animate-pulse">
                  <Layers size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">لم يتم اعتماد خطة دراسية بعد</h3>
              <p className="text-slate-500 max-w-md text-center mb-8">
                  البدء باختيار الخطة الدراسية المناسبة للمدرسة لعرض المواد وتوزيع الحصص.
              </p>
              <button 
                  onClick={() => setShowPlanModal(true)}
                  className="bg-[#655ac1] hover:bg-[#5046a0] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 transition-all hover:scale-105"
              >
                  اختيار الخطة الدراسية
              </button>
          </div>
      )}

      {/* Modals */}
      <StudyPlansModal 
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          onApprovePlan={handleApprovePlan}
          schoolPhases={currentPhases}
          activeSchoolId={activeSchoolId}
          onSchoolChange={setActiveSchoolId}
          schoolInfo={schoolInfo}
      />
      
      {viewingGradeDetails && (
          <GradeDetailsModal
            gradeKey={viewingGradeDetails.gradeKey}
            gradeName={viewingGradeDetails.gradeName}
            department={viewingGradeDetails.department}
            phase={viewingGradeDetails.phase}
            subjects={subjects.filter(s => (gradeSubjectMap[viewingGradeDetails.gradeKey] || []).includes(s.id))}
            allSubjects={subjects}
            onClose={() => setViewingGradeDetails(null)}
            onAddSubject={handleAddSubjectToGrade}
            onUpdateSubject={handleUpdateSubjectPeriods}
            onDeleteSubject={handleDeleteSubjectFromGrade}
            onCopySubjectToGrades={handleCopySubjectToGrades}
            availableGradesForCopy={getAvailableGradesForCopy(viewingGradeDetails.gradeKey, viewingGradeDetails.phase)}
          />
      )}

      {showManualModal && (
          <CustomPlanModal 
              onClose={() => setShowManualModal(false)}
              onAddPlan={handleCustomPlanAdd}
          />
      )}

      {showConstraintsModal && scheduleSettings && setScheduleSettings && (
        <SubjectConstraintsModal 
          isOpen={showConstraintsModal}
          onClose={() => setShowConstraintsModal(false)}
          subjects={subjects}
          gradeSubjectMap={gradeSubjectMap}
          scheduleSettings={scheduleSettings}
          setScheduleSettings={setScheduleSettings}
          schoolInfo={schoolInfo}
        />
      )}

    </div>
  );
};

const CustomPlanModal: React.FC<{
    onClose: () => void;
    onAddPlan: (planName: string, subjectCount: number) => void;
}> = ({ onClose, onAddPlan }) => {
    const [planName, setPlanName] = useState('');
    const [count, setCount] = useState('5'); // Default 5 subjects

    const handleSave = () => {
        if (!planName || !count) return;
        onAddPlan(planName, parseInt(count) || 1);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#e5e1fe] rounded-xl flex items-center justify-center text-[#655ac1]">
                            <BookOpen size={24} />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-slate-800">إضافة خطة مخصصة</h3>
                           <p className="text-sm text-slate-500 font-bold">إنشاء خطة جديدة وتحديد عدد المواد</p>
                        </div>
                    </div>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1.5">اسم الخطة</label>
                        <input 
                            value={planName} 
                            onChange={e => setPlanName(e.target.value)} 
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#655ac1] outline-none font-bold" 
                            placeholder="مثال: خطة النشاط" 
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1.5">عدد المواد</label>
                        <input 
                            type="number" 
                            value={count} 
                            onChange={e => setCount(e.target.value)} 
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#655ac1] outline-none font-bold" 
                            min="1"
                            max="50"
                        />
                         <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                             <Info size={12} />
                             يمكنك تعديل أسماء المواد وعدد الحصص لاحقاً من الجدول
                         </p>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">إلغاء</button>
                    <button 
                        onClick={handleSave} 
                        disabled={!planName}
                        className="bg-[#655ac1] hover:bg-[#5046a0] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                    >
                        إنشاء الخطة
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Step3Subjects;

interface SubjectConstraintsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  gradeSubjectMap: Record<string, string[]>;
  scheduleSettings: ScheduleSettingsData;
  setScheduleSettings: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
  schoolInfo: SchoolInfo;
}

const SubjectConstraintsModal: React.FC<SubjectConstraintsModalProps> = ({ 
  isOpen, onClose, subjects, gradeSubjectMap, scheduleSettings, setScheduleSettings, schoolInfo 
}) => {
  const [selectedIdentifier, setSelectedIdentifier] = useState<string>(''); // combined key: "gradeKey|subjectId"

  if (!isOpen) return null;

  // 1. Group Subjects by Name for Dropdown (Distinct Names only, from approved study plan)
  const uniqueSubjects = useMemo(() => {
    // Collect only subject IDs that appear in the approved gradeSubjectMap
    const approvedIds = new Set<string>();
    Object.values(gradeSubjectMap).forEach(ids => ids.forEach(id => approvedIds.add(id)));

    const seen = new Set<string>();
    const unique: { id: string; name: string; periodsPerClass: number }[] = [];

    subjects
      .filter(s => approvedIds.has(s.id))
      .forEach(s => {
        if (!seen.has(s.name)) {
          seen.add(s.name);
          unique.push({ id: s.id, name: s.name, periodsPerClass: s.periodsPerClass });
        }
      });

    return unique.sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, gradeSubjectMap]);


  // Selected Subject Logic (By Name)
  const selectedSubjectExample = useMemo(() => {
    if (!selectedIdentifier) return null;
    return subjects.find(s => s.name === selectedIdentifier) || null;
  }, [selectedIdentifier, subjects]);

  // Constraints Logic (Apply to ALL subjects with same name)
  const constraints = scheduleSettings.subjectConstraints;
  
  // Get constraint from the *first* subject with this name (assuming uniformity)
  // or find if any subject with this name has a constraint
  const selectedConstraint = useMemo(() => {
      if (!selectedIdentifier) return null;
      // We look for a constraint matching ANY subject ID with this name.
      // Since we want to apply to all, we essentially pick one to show.
      // Better: find a constraint that matches one of the subjects.
      const subjectsWithName = subjects.filter(s => s.name === selectedIdentifier);
      const subjectIds = subjectsWithName.map(s => s.id);
      
      const found = constraints.find(c => subjectIds.includes(c.subjectId));
      
      // Default empty if none found
      return found || { subjectId: subjectsWithName[0]?.id || '', excludedPeriods: [], preferredPeriods: [], enableDoublePeriods: false };
  }, [selectedIdentifier, subjects, constraints]);


  const updateConstraint = (updates: Partial<SubjectConstraint>) => {
      if (!selectedIdentifier) return;
      
      const subjectsWithName = subjects.filter(s => s.name === selectedIdentifier);
      const subjectIds = subjectsWithName.map(s => s.id);

      setScheduleSettings(prev => {
          const newConstraints = [...prev.subjectConstraints];
          
          subjectIds.forEach(id => {
              const existingIndex = newConstraints.findIndex(c => c.subjectId === id);
              if (existingIndex >= 0) {
                  newConstraints[existingIndex] = { ...newConstraints[existingIndex], ...updates };
              } else {
                  newConstraints.push({ 
                      subjectId: id, 
                      excludedPeriods: [], 
                      preferredPeriods: [], 
                      enableDoublePeriods: false, 
                      ...updates 
                    });
              }
          });
          
          return { ...prev, subjectConstraints: newConstraints };
      });
  };

  const togglePeriod = (period: number, field: 'excludedPeriods' | 'preferredPeriods') => {
      if (!selectedIdentifier || !selectedConstraint) return;
      const current = (selectedConstraint[field] || []) as number[];
      const otherField = field === 'excludedPeriods' ? 'preferredPeriods' : 'excludedPeriods';
      const otherList = (selectedConstraint[otherField] || []) as number[];

      if (current.includes(period)) {
          updateConstraint({ [field]: current.filter((p: number) => p !== period) });
      } else {
          updateConstraint({ [field]: [...current, period], [otherField]: otherList.filter((p: number) => p !== period) });
      }
  };

  const toggleDoublePeriods = () => {
      updateConstraint({ enableDoublePeriods: !selectedConstraint?.enableDoublePeriods });
  };


  // Periods Data
  const weekDays = schoolInfo.timing?.activeDays?.length || 5;
  const periodsPerDay = Math.max(...(Object.values(schoolInfo.timing?.periodCounts || { 'default': 7 }) as number[]));
  const periods = Array.from({ length: periodsPerDay }, (_, i) => i + 1);

  // Warnings (Aggregate for all subjects with this name)
  const warnings = useMemo(() => {
     if (!selectedIdentifier || !scheduleSettings) return [];
     const subjectsWithName = subjects.filter(s => s.name === selectedIdentifier);
     const subjectIds = subjectsWithName.map(s => s.id);
     
     return validateAllConstraints(scheduleSettings, subjects, [], weekDays, periodsPerDay, schoolInfo.timing?.activeDays || [], 1)
        .filter(w => w.relatedId && subjectIds.includes(w.relatedId));
  }, [selectedIdentifier, scheduleSettings, subjects, weekDays, periodsPerDay, schoolInfo]);


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-50 to-white px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shadow-sm">
                        <Ban size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">قيود المواد</h2>
                        <p className="text-slate-500 font-medium text-sm">تخصيص الحصص المستثناة والمفضلة للمواد</p>
                    </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Column: Selection */}
                    <div className="lg:col-span-4 space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">اختر المادة</label>
                            <div className="relative">
                                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                <select 
                                    value={selectedIdentifier}
                                    onChange={(e) => setSelectedIdentifier(e.target.value)}
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all"
                                >
                                    <option value="">-- اختر مادة --</option>
                                    {uniqueSubjects.map(sub => (
                                        <option key={sub.id} value={sub.name}>
                                            {sub.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedSubjectExample && (
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                                <div>
                                    <div className="text-xs font-bold text-slate-400 mb-1">نصاب المادة (تقريبي)</div>
                                    <div className="text-xl font-black text-slate-700 flex items-baseline gap-1">
                                        {selectedSubjectExample.periodsPerClass}
                                        <span className="text-xs font-bold text-slate-400">حصة / أسبوعياً</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1">
                                        * سيتم تطبيق القيود على جميع المواد المسماة ({selectedSubjectExample.name})
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 mb-1">الحد اليومي</div>
                                    <div className="text-base font-black text-slate-700">
                                        {getMaxDailyPeriodsForSubject(selectedSubjectExample.periodsPerClass, weekDays)} حصة
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-slate-200">
                                    <div className="text-[11px] font-bold text-slate-500 leading-relaxed">
                                        {describeDistribution(selectedSubjectExample.periodsPerClass, weekDays)}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Warnings List */}
                        {warnings.length > 0 && (
                            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 space-y-2">
                                <div className="flex items-center gap-2 text-amber-600 font-bold text-xs mb-1">
                                    <AlertTriangle size={14} /> تنبيهات
                                </div>
                                {warnings.map((w, idx) => (
                                    <div key={idx} className="text-[11px] font-medium text-amber-700 leading-snug">
                                        - {w.message}
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>

                    {/* Right Column: Settings */}
                    <div className="lg:col-span-8">
                        {!selectedIdentifier ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl min-h-[300px]">
                                <Ban size={48} className="mb-4 opacity-20" />
                                <p className="font-bold text-lg text-slate-400">الرجاء اختيار مادة</p>
                                <p className="text-sm">لعرض وتعديل إعدادات القيود الخاصة بها</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                
                                {/* Excluded Periods */}
                                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                     <div className="px-6 py-4 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
                                         <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                             <Ban size={18} className="text-rose-500" />
                                             الحصص المستثناة
                                         </h4>
                                         <span className="text-[10px] font-bold bg-white text-rose-500 px-2.5 py-1 rounded-full border border-rose-100 shadow-sm">
                                             يمنع الجدولة فيها
                                         </span>
                                     </div>
                                     <div className="p-6">
                                         <div className="flex flex-wrap gap-2">
                                            {periods.map(p => {
                                                const isExcluded = selectedConstraint?.excludedPeriods.includes(p);
                                                return (
                                                    <button 
                                                        key={p} 
                                                        onClick={() => togglePeriod(p, 'excludedPeriods')}
                                                        className={`w-12 h-12 rounded-xl text-sm font-black transition-all duration-200 border-2 ${
                                                            isExcluded 
                                                              ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200 scale-105' 
                                                              : 'bg-white border-slate-100 text-slate-400 hover:border-rose-200 hover:text-rose-500'
                                                        }`}
                                                    >
                                                        {p}
                                                    </button>
                                                );
                                            })}
                                         </div>
                                     </div>
                                </div>

                                {/* Preferred Periods */}
                                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                     <div className="px-6 py-4 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
                                         <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                             <Star size={18} className="text-amber-500" />
                                             الحصص المفضلة
                                         </h4>
                                         <span className="text-[10px] font-bold bg-white text-amber-500 px-2.5 py-1 rounded-full border border-amber-100 shadow-sm">
                                             أولوية للجدولة
                                         </span>
                                     </div>
                                     <div className="p-6">
                                         <div className="flex flex-wrap gap-2">
                                            {periods.map(p => {
                                                const isPreferred = selectedConstraint?.preferredPeriods.includes(p);
                                                return (
                                                    <button 
                                                        key={p} 
                                                        onClick={() => togglePeriod(p, 'preferredPeriods')}
                                                        className={`w-12 h-12 rounded-xl text-sm font-black transition-all duration-200 border-2 ${
                                                            isPreferred 
                                                              ? 'bg-amber-400 border-amber-400 text-white shadow-lg shadow-amber-200 scale-105' 
                                                              : 'bg-white border-slate-100 text-slate-400 hover:border-amber-200 hover:text-amber-500'
                                                        }`}
                                                    >
                                                        {p}
                                                    </button>
                                                );
                                            })}
                                         </div>
                                     </div>
                                </div>

                                {/* Double Periods */}
                                <div className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl p-6 border border-indigo-100 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-1">
                                            <Repeat size={18} className="text-indigo-500" />
                                            تتابع الحصص
                                        </h4>
                                        <p className="text-sm text-slate-500">السماح بتدريس حصتين متتاليتين للمادة في نفس اليوم</p>
                                    </div>
                                    <button 
                                        onClick={() => toggleDoublePeriods()}
                                        className={`w-16 h-9 rounded-full transition-all duration-300 relative shadow-inner ${selectedConstraint?.enableDoublePeriods ? 'bg-indigo-500' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-1 w-7 h-7 bg-white rounded-full shadow-md transition-all duration-300 ${selectedConstraint?.enableDoublePeriods ? 'right-1' : 'right-[calc(100%-2rem)]'}`} />
                                    </button>
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button 
                    onClick={onClose}
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                    إغلاق
                </button>
                <button 
                    onClick={onClose}
                    className="px-8 py-3 bg-gradient-to-r from-[#8779fb] to-[#655ac1] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-[#655ac1]/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                >
                    <Check size={18} />
                    حفظ
                </button>
            </div>
        </div>
    </div>
  );
};
