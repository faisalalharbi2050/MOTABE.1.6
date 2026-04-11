import React, { useState, useMemo, useEffect } from 'react';
import { Phase, Subject, SchoolInfo, ScheduleSettingsData } from '../../../types';
import { DETAILED_TEMPLATES } from '../../../constants';
import { STUDY_PLANS_CONFIG } from '../../../study_plans_config';
import {
  Plus, Trash2, Printer, Search, Eye, Download, Info, School, Building, GraduationCap, BookOpen, Layers, CheckCircle2, X, Edit2, Check, Copy, List, Sparkles, ArrowRight, Table, Grid
} from 'lucide-react';
import { GradeDetailsModal } from './GradeDetailsModal';
import SchoolTabs from '../SchoolTabs';
import StudyPlansModal from '../StudyPlansModal';
import { SubjectConstraint } from '../../../types';
import { getMaxDailyPeriodsForSubject, describeDistribution, ValidationWarning, validateAllConstraints } from '../../../utils/scheduleConstraints';
import { Ban, Star, Repeat, AlertTriangle, ChevronDown, TypeIcon, Save } from 'lucide-react';
import SubjectAbbreviationsModal from '../../schedule/SubjectAbbreviationsModal';

interface Props {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  schoolInfo: SchoolInfo;
  gradeSubjectMap: Record<string, string[]>;
  setGradeSubjectMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  phaseDepartmentMap: Record<string, string>;
  setPhaseDepartmentMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  scheduleSettings?: ScheduleSettingsData;
  setScheduleSettings?: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
}

const Step3Subjects: React.FC<Props> = ({ subjects, setSubjects, schoolInfo, gradeSubjectMap, setGradeSubjectMap, phaseDepartmentMap, setPhaseDepartmentMap, scheduleSettings, setScheduleSettings }) => {
  const [activeSchoolId, setActiveSchoolId] = useState<string>('main');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showConstraintsModal, setShowConstraintsModal] = useState(false);
  const [deletePlanPhase, setDeletePlanPhase] = useState<Phase | null>(null);
  const [showAbbreviationsModal, setShowAbbreviationsModal] = useState(false);
  const [deleteCustomPlanName, setDeleteCustomPlanName] = useState<string | null>(null);
  const [deleteCustomSubjectId, setDeleteCustomSubjectId] = useState<string | null>(null);
  
  // Grade Details Modal State
  const [viewingGradeDetails, setViewingGradeDetails] = useState<{
      gradeKey: string;
      gradeName: string;
      department: string;
      phase: Phase;
  } | null>(null);

  // State to track approved department per phase

  const customPlans = useMemo(() => {
      return subjects.reduce((acc, sub) => {
          if (sub.customPlanName) {
              if (!acc[sub.customPlanName]) acc[sub.customPlanName] = [];
              acc[sub.customPlanName].push(sub);
          }
          return acc;
      }, {} as Record<string, Subject[]>);
  }, [subjects]);

  // Helper to check if the ACTIVE school has approved plans
  const hasData = useMemo(() => {
     const hasCustomPlans = Object.keys(customPlans).length > 0;
     // check if any gradeSubjectMap key belongs to the current school
     const hasMinistryPlans = Object.keys(gradeSubjectMap).some(key => {
       // new format: "schoolId-phase-grade"
       const newFmt = key.match(/^([^-]+)-([^-]+)-(\d+)$/);
       if (newFmt) return newFmt[1] === activeSchoolId;
       // legacy format: "phase-grade" → belongs to main school
       return activeSchoolId === 'main';
     });
     return subjects.length > 0 && (hasMinistryPlans || hasCustomPlans);
  }, [subjects, gradeSubjectMap, customPlans, activeSchoolId]);

  // ── helpers: build school-scoped gradeKey (e.g. "main-elementary-1")
  //    Backward-compat: old keys have no schoolId prefix → treated as 'main'
  const makeGradeKey = (schoolId: string, phase: Phase, grade: number) =>
    `${schoolId}-${phase}-${grade}`;

  const getSchoolGradeSubjectIds = (schoolId: string, phase: Phase, grade: number): string[] => {
    const newKey = makeGradeKey(schoolId, phase, grade);
    if (gradeSubjectMap[newKey]) return gradeSubjectMap[newKey];
    // fallback to legacy key (no prefix) for main school backward compat
    if (schoolId === 'main') return gradeSubjectMap[`${phase}-${grade}`] || [];
    return [];
  };

  // Determine Active Phases based on Active School + Approved plans for this school
  const currentPhases = useMemo(() => {
      let activePhases: Phase[] = [];

      if (activeSchoolId === 'main') {
          activePhases = schoolInfo.phases || [];
      } else {
          const shared = schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId);
          activePhases = shared?.phases || [];
      }

      // Add phases that already have approved plans for THIS school (new + legacy keys)
      const approvedPhases = new Set<Phase>();
      Object.keys(gradeSubjectMap).forEach(key => {
          // new format: "schoolId-phase-grade"
          const newFmt = key.match(/^([^-]+)-([^-]+)-(\d+)$/);
          if (newFmt && newFmt[1] === activeSchoolId) {
              approvedPhases.add(newFmt[2] as Phase);
              return;
          }
          // legacy format: "phase-grade" (belongs to main)
          if (activeSchoolId === 'main') {
              const legacyFmt = key.match(/^([^-]+)-(\d+)$/);
              if (legacyFmt) approvedPhases.add(legacyFmt[1] as Phase);
          }
      });

      const merged = Array.from(new Set([...activePhases, ...Array.from(approvedPhases)])) as Phase[];
      if (merged.length === 0) return [Phase.ELEMENTARY];
      const order = [Phase.ELEMENTARY, Phase.MIDDLE, Phase.HIGH, Phase.OTHER];
      return merged.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [activeSchoolId, schoolInfo, gradeSubjectMap]);


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
      const overrideUpdates: Record<string, number> = {};
      const newMapUpdates: Record<string, string[]> = {};

      planKeys.forEach(key => {
          const templates = DETAILED_TEMPLATES[key] || [];
          // Add subjects
          templates.forEach(t => {
             const overridePeriods = periodsOverride?.[t.id];
             const subject = overridePeriods !== undefined
               ? { ...t, periodsPerClass: overridePeriods }
               : t;
             if (subjects.find(s => s.id === t.id) || newSubjects.find(s => s.id === t.id)) {
                 // Subject already exists — apply override if provided
                 if (overridePeriods !== undefined) overrideUpdates[t.id] = overridePeriods;
             } else {
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
             const gradeKey = makeGradeKey(activeSchoolId, phase, grade);
             const existing = getSchoolGradeSubjectIds(activeSchoolId, phase, grade);
             newMapUpdates[gradeKey] = [
                 ...existing,
                 ...(newMapUpdates[gradeKey] || []),
                 ...templates.map(s => s.id)
             ];
             newMapUpdates[gradeKey] = [...new Set(newMapUpdates[gradeKey])];
          }
      });
      
      setSubjects(prev => [
          ...prev.map(s => overrideUpdates[s.id] !== undefined ? { ...s, periodsPerClass: overrideUpdates[s.id] } : s),
          ...newSubjects
      ]);
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
  
  const confirmDeletePlan = () => {
      const phase = deletePlanPhase;
      if (!phase) return;
      setDeletePlanPhase(null);
      {
          // Identify subjects to remove (those in the gradeSubjectMap for this phase)
          const grades = getGradesForPhase(phase);
          let subjectsToRemove: string[] = [];
          
          grades.forEach(g => {
              const newKey = makeGradeKey(activeSchoolId, phase, g);
              const legacyKey = `${phase}-${g}`;
              const ids = gradeSubjectMap[newKey] || gradeSubjectMap[legacyKey] || [];
              subjectsToRemove = [...subjectsToRemove, ...ids];
          });

          // Update Map (Remove keys for this phase + this school)
          setGradeSubjectMap(prev => {
              const next = { ...prev };
              grades.forEach(g => {
                  delete next[makeGradeKey(activeSchoolId, phase, g)];
                  // also remove legacy key if it exists and we are main
                  if (activeSchoolId === 'main') delete next[`${phase}-${g}`];
              });
              return next;
          });

          // Remove subjects from the main list if they are only used by this phase
          const remainingIds = new Set<string>();
          Object.entries(gradeSubjectMap).forEach(([key, ids]) => {
              const belongsToThisPhase = grades.some(g =>
                  key === makeGradeKey(activeSchoolId, phase, g) ||
                  key === `${phase}-${g}`
              );
              if (!belongsToThisPhase) ids.forEach(id => remainingIds.add(id));
          });
          const removeSet = new Set(subjectsToRemove.filter(id => !remainingIds.has(id)));
          setSubjects(prev => prev.filter(s => !removeSet.has(s.id)));

          // Clear department map for this phase
          setPhaseDepartmentMap(prev => {
              const next = { ...prev };
              delete next[phase];
              return next;
          });
      }
  };

  const handlePrintCustomPlan = (planName: string, planSubjects: Subject[]) => {
    const TH = 'border:1px solid #e2e8f0;padding:8px 12px;text-align:right;background:#ede9fe;font-weight:900;-webkit-print-color-adjust:exact;print-color-adjust:exact;';
    const TD = 'border:1px solid #e2e8f0;padding:7px 12px;text-align:right;';
    const total = planSubjects.reduce((s, x) => s + (x.periodsPerClass ?? 0), 0);
    const rows = planSubjects.map((s, i) =>
      `<tr><td style="${TD}text-align:center;">${i + 1}</td><td style="${TD}">${s.name || '—'}</td><td style="${TD}text-align:center;font-weight:bold;">${s.periodsPerClass || '–'}</td></tr>`
    ).join('');

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html><html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${planName}</title>
        <style>
          @page { size: A4 portrait; margin: 14mm; }
          body { margin:0; background:white; direction:rtl; font-family:'Tajawal',sans-serif; color:#1e293b; }
          table { border-collapse:collapse; width:100%; margin-bottom:16px; }
          th, td { border:1px solid #e2e8f0; padding:9px 14px; text-align:right; }
          th { background:#ede9fe; font-weight:900; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        </style>
      </head>
      <body>
        <h2 style="color:#3b355a;margin-bottom:6px;font-size:1.1rem;font-weight:900;">${planName}</h2>
        <div style="background:#655ac1;color:white;padding:7px 13px;border-radius:6px;margin-bottom:10px;font-weight:900;font-size:.85rem;-webkit-print-color-adjust:exact;print-color-adjust:exact;">خطة مخصصة</div>
        <table>
          <thead><tr>
            <th style="${TH}width:32px;">#</th>
            <th style="${TH}">المادة الدراسية</th>
            <th style="${TH}width:90px;">الحصص</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr>
            <td colspan="2" style="${TD}font-weight:900;">المجموع</td>
            <td style="${TD}text-align:center;font-weight:900;color:#655ac1;">${total}</td>
          </tr></tfoot>
        </table>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const confirmDeleteCustomPlan = () => {
    if (!deleteCustomPlanName) return;
    setSubjects(prev => prev.filter(s => s.customPlanName !== deleteCustomPlanName));
    setDeleteCustomPlanName(null);
  };

  const confirmDeleteCustomSubject = () => {
    if (!deleteCustomSubjectId) return;
    setSubjects(prev => prev.filter(s => s.id !== deleteCustomSubjectId));
    setDeleteCustomSubjectId(null);
  };

  const handleAddRowToCustomPlan = (planName: string) => {
    const newSub: Subject = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      periodsPerClass: 0,
      phases: [Phase.OTHER],
      department: 'custom',
      targetGrades: [],
      isArchived: false,
      specializationIds: [],
      customPlanName: planName
    };
    setSubjects(prev => [...prev, newSub]);
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
            <Layers size={36} strokeWidth={1.8} className="text-[#655ac1]" />
             المواد الدراسية
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إدارة الخطط الدراسية واعتمادها وطباعتها والتعديل عليها بسهولة</p>
      </div>



      {/* School Tabs */}
      <SchoolTabs
        schoolInfo={schoolInfo}
        activeSchoolId={activeSchoolId}
        onTabChange={setActiveSchoolId}
      />

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-4">
           {/* Study Plans Button */}
           <div className="relative">
               <button 
                 onClick={() => setShowPlanModal(true)}
                 className="flex items-center gap-2 bg-[#655ac1] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 transition-all hover:scale-105 active:scale-95"
               >
                   <Layers size={20} />
                   الخطط الدراسية
               </button>
           </div>

           <button 
             onClick={() => setShowManualModal(true)}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-bold transition-all hover:border-[#8779fb]"
          >
              <Plus size={20} className="text-[#8779fb]" />
              إضافة خطة مخصصة
          </button>
      </div>

      {/* Secondary Action Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200/60 flex flex-col lg:flex-row lg:items-center gap-4 transition-all">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowAbbreviationsModal(true)}
            title="اختصارات المواد"
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb]"
          >
            <TypeIcon size={18} className="text-indigo-500" />
            <span>اختصارات المواد</span>
          </button>

          {scheduleSettings && setScheduleSettings && (
            <button
              onClick={() => setShowConstraintsModal(true)}
              className="flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb] min-w-[145px]"
            >
              <Ban size={18} className="text-rose-500" />
              <span>قيود المواد</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom Plans Render Area */}
      {Object.entries(customPlans).map(([planName, planSubjects]: [string, Subject[]]) => (
           <div key={planName} className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-base text-slate-800">{planName}</span>
                        <span className="text-slate-300">|</span>
                        <span className="px-3 py-1 bg-primary/5 text-primary rounded-lg text-[10px] font-black">خطة مخصصة</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handlePrintCustomPlan(planName, planSubjects)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-bold text-sm transition-all shadow-sm"
                        >
                            <Printer size={16} />
                            <span>طباعة</span>
                        </button>
                        <button
                            onClick={() => setDeleteCustomPlanName(planName)}
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
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-right text-sm font-black text-primary">اسم المادة</th>
                                <th className="px-6 py-4 text-center text-sm font-black text-primary">عدد الحصص</th>
                                <th className="px-6 py-4 text-center text-sm font-black text-primary">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {planSubjects.map((sub, idx) => (
                                <tr key={sub.id} className="hover:bg-accent/5 transition-all group">
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
                                    <td className="px-6 py-3 text-center">
                                        <div className="flex items-center justify-center">
                                            <button
                                               onClick={() => setDeleteCustomSubjectId(sub.id)}
                                               className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-50 transition-all border border-slate-200 hover:border-rose-200 text-rose-500"
                                               title="حذف"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Add row button */}
                <div className="px-6 py-4 border-t border-slate-50">
                    <button
                        onClick={() => handleAddRowToCustomPlan(planName)}
                        className="flex items-center gap-2 text-[#655ac1] hover:text-[#5046a0] font-bold text-sm transition-colors"
                    >
                        <Plus size={16} />
                        إضافة مادة
                    </button>
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
                     const gradeKey = makeGradeKey(activeSchoolId, phase, grade);
                     const subjectIds = getSchoolGradeSubjectIds(activeSchoolId, phase, grade);
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
                      <div key={phase} className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
                          <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                              <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-black text-base text-slate-800">{activeSchoolName}</span>
                                  <span className="text-slate-300">|</span>
                                  <span className="font-black text-base text-primary">{getPhaseLabel(phase)}</span>
                                  {departmentName && (
                                      <span className="px-3 py-1 bg-primary/5 text-primary rounded-lg text-[10px] font-black">
                                          {departmentName}
                                      </span>
                                  )}
                              </div>
                              <button
                                  onClick={() => setDeletePlanPhase(phase)}
                                  className="group flex items-center gap-2 bg-white text-rose-500 border border-rose-200 hover:bg-rose-500 hover:text-white hover:border-rose-500 px-5 py-2.5 rounded-xl text-sm font-black transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-rose-200"
                                  title="حذف الخطة"
                              >
                                  <Trash2 size={18} className="transition-transform group-hover:scale-110" />
                                  حذف
                              </button>
                          </div>

                          <div className="overflow-x-auto">
                                <table className="w-full text-right min-w-[600px]">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 font-black text-primary text-sm">الصف</th>
                                            <th className="px-6 py-4 font-black text-primary text-sm text-center">عدد المواد</th>
                                            <th className="px-6 py-4 font-black text-primary text-sm text-center">عدد الحصص</th>
                                            <th className="px-6 py-4 font-black text-primary text-sm text-center">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {phaseData.map((row) => (
                                            <tr key={row.grade} className="hover:bg-accent/5 transition-all group">
                                                <td className="px-6 py-3">
                                                    <div className="font-bold text-slate-800 text-sm">{row.gradeName}</div>
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <span className="px-3 py-1 bg-primary/5 text-primary rounded-lg text-sm font-black">
                                                        {row.subjectCount}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <div className="inline-block px-3 py-1 bg-slate-50 rounded-lg text-sm font-black text-slate-700">
                                                        {row.totalPeriods}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => handleOpenGradeDetails(row.gradeKey, row.gradeName, phase)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#e5e1fe] text-slate-400 hover:text-[#655ac1] transition-all border border-slate-200 hover:border-[#8779fb] mx-auto"
                                                            title="معاينة وتعديل"
                                                        >
                                                            <Edit2 size={14} />
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
              <Layers size={48} className="text-[#655ac1] mb-5" />
              <h3 className="text-xl font-black text-slate-700 mb-1">لم يتم اعتماد خطة دراسية بعد</h3>
              <p className="text-sm text-slate-400 font-medium">اختر خطة مدرستك أو أضف خطة مخصصة</p>
          </div>
      )}

      {/* Modals */}
      <StudyPlansModal 
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          onApprovePlan={handleApprovePlan}
          approvedDepartmentMap={phaseDepartmentMap}
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

      <SubjectAbbreviationsModal 
        isOpen={showAbbreviationsModal}
        onClose={() => setShowAbbreviationsModal(false)}
        subjects={subjects}
        settings={scheduleSettings || {
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
          if (setScheduleSettings) {
            setScheduleSettings(prev => ({
              ...prev,
              subjectAbbreviations: abbreviations
            }));
          }
        }}
      />

      {/* Delete Custom Plan Confirmation Modal */}
      {deleteCustomPlanName && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-rose-500" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">حذف الخطة المخصصة</h2>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                هل أنت متأكد من حذف خطة <span className="text-[#655ac1] font-black">"{deleteCustomPlanName}"</span>؟ سيتم حذف جميع المواد المرتبطة بها ولا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setDeleteCustomPlanName(null)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={confirmDeleteCustomPlan}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Custom Subject Confirmation Modal */}
      {deleteCustomSubjectId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-rose-500" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">حذف المادة</h2>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                هل أنت متأكد من حذف هذه المادة من الخطة؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setDeleteCustomSubjectId(null)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={confirmDeleteCustomSubject}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Plan Confirmation Modal */}
      {deletePlanPhase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-rose-500" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">حذف الخطة الدراسية</h2>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                هل أنت متأكد من حذف خطة <span className="text-[#655ac1] font-black">{getPhaseLabel(deletePlanPhase)}</span>؟ سيتم حذف جميع المواد المرتبطة بها ولا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setDeletePlanPhase(null)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={confirmDeletePlan}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
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
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 flex flex-col overflow-hidden">

                {/* Header — matches GradeDetailsModal style */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-800">إضافة خطة مخصصة</h3>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">إنشاء خطة مخصصة وتحديد عدد موادها ونصاب حصصها</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                        <X size={22} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1.5">
                            اسم الخطة <span className="text-rose-500">*</span>
                        </label>
                        <input
                            value={planName}
                            onChange={e => setPlanName(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#655ac1] outline-none font-bold"
                            placeholder="مثال: خطة مدرسة ... العالمية"
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
                            يمكنك تعديل مسميات المواد وعدد الحصص لاحقاً بعد إنشاء الخطة
                        </p>
                    </div>
                </div>

                <div className="px-6 pb-6 pt-2 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800">إلغاء</button>
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
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <div>
                    <h2 className="text-xl font-black text-slate-800">قيود المواد</h2>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">تخصيص الحصص المستثناة والمفضلة للمواد</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <X size={22} />
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
                                <Ban size={48} className="mb-4 text-rose-400" />
                                <p className="font-bold text-lg text-slate-400">اختر مادة أولاً</p>
                                <p className="text-sm text-slate-400">لعرض وتعديل إعدادات القيود الخاصة بها</p>
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
            
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                <button
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                >
                    إغلاق
                </button>
                <button
                    onClick={onClose}
                    className="px-8 py-2.5 bg-[#655ac1] hover:bg-[#5a4eb3] text-white font-bold rounded-xl transition-all shadow-md shadow-[#655ac1]/20 flex items-center gap-2"
                >
                    <Save size={18} />
                    حفظ
                </button>
            </div>
        </div>
    </div>
  );
};
