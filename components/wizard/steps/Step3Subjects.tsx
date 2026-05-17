import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Phase, Subject, SchoolInfo, ScheduleSettingsData } from '../../../types';
import { DETAILED_TEMPLATES } from '../../../constants';
import { STUDY_PLANS_CONFIG } from '../../../study_plans_config';
import {
  Plus, Trash2, Printer, Search, Eye, Download, Info, School, Building, GraduationCap, BookOpen, Layers, CheckCircle2, X, Edit2, Check, Copy, List, Sparkles, ArrowRight, Table, Grid, Route, FileSliders, ClipboardCheck, Settings2
} from 'lucide-react';
import { GradeDetailsModal } from './GradeDetailsModal';
import SchoolTabs from '../SchoolTabs';
import StudyPlansModal from '../StudyPlansModal';
import { SubjectConstraint } from '../../../types';
import { getMaxDailyPeriodsForSubject, describeDistribution, ValidationWarning, validateAllConstraints } from '../../../utils/scheduleConstraints';
import { Ban, Star, Repeat, AlertTriangle, ChevronDown, TypeIcon, Save } from 'lucide-react';
import SubjectAbbreviationsModal from '../../schedule/SubjectAbbreviationsModal';

const InlineSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}> = ({ value, onChange, options, placeholder = 'اختر' }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative w-full" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2"
      >
        <span className="truncate text-[13px] leading-tight">{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 animate-in slide-in-from-top-2">
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                  value === option.value ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                }`}
              >
                <span>{option.label}</span>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                  value === option.value ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'
                }`}>
                  <Check size={12} strokeWidth={3} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
    setSubjects(prev => prev.filter(s => !(s.customPlanName === deleteCustomPlanName && ((s as any).customPlanSchoolId || 'main') === activeSchoolId)));
    if (activeCustomPlanName === deleteCustomPlanName) setActiveCustomPlanName('');
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

  const [selectedPhase, setSelectedPhase] = useState<Phase>(currentPhases[0] || Phase.ELEMENTARY);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedSubDepartmentId, setSelectedSubDepartmentId] = useState<string>('');
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>('');
  const [expandedConstraintSubjectId, setExpandedConstraintSubjectId] = useState<string | null>(null);
  const [planPeriodOverrides, setPlanPeriodOverrides] = useState<Record<string, number>>({});
  const [planMode, setPlanMode] = useState<'ready' | 'custom'>('ready');
  const [confirmAddCustomSubject, setConfirmAddCustomSubject] = useState(false);
  const [addSubjectTargetPlanName, setAddSubjectTargetPlanName] = useState<string | null>(null);
  const [constraintSubjectId, setConstraintSubjectId] = useState<string | null>(null);
  const [constraintCopyGrades, setConstraintCopyGrades] = useState<string[]>([]);
  const [constraintCopyDone, setConstraintCopyDone] = useState(false);
  const [selectedManualGrade, setSelectedManualGrade] = useState<number>(1);
  const [deleteSubjectCandidate, setDeleteSubjectCandidate] = useState<string | null>(null);
  const [showPrintChooser, setShowPrintChooser] = useState(false);
  const [selectedPrintKeys, setSelectedPrintKeys] = useState<string[]>([]);
  const [printScope, setPrintScope] = useState<'all' | 'selected' | null>(null);
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<'1' | '2'>('1');
  const [customPlanName, setCustomPlanName] = useState('');
  const [customSubjectCount, setCustomSubjectCount] = useState('5');
  const [activeCustomPlanName, setActiveCustomPlanName] = useState('');

  const activeSchoolName = activeSchoolId === 'main'
    ? schoolInfo.schoolName
    : schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId)?.name;

  const planCategories = useMemo(() => {
    const order = [Phase.KINDERGARTEN, Phase.ELEMENTARY, Phase.MIDDLE, Phase.HIGH];
    return STUDY_PLANS_CONFIG
      .filter(category => order.includes(category.phase as Phase))
      .sort((a, b) => order.indexOf(a.phase as Phase) - order.indexOf(b.phase as Phase));
  }, []);

  const selectedCategory = useMemo(() => {
    return planCategories.find(category => category.phase === selectedPhase) || planCategories[0];
  }, [planCategories, selectedPhase]);

  const availableDepartments = useMemo(() => {
    return (selectedCategory?.departments || []).filter(dept =>
      dept.id !== 'المعاهد_العلمية' && !dept.name.includes('المعاهد العلمية')
    );
  }, [selectedCategory]);

  const selectedDepartment = useMemo(() => {
    return availableDepartments.find(dept => dept.id === selectedDepartmentId) || availableDepartments[0];
  }, [availableDepartments, selectedDepartmentId]);

  const phaseOptions = useMemo(() => (
    [Phase.KINDERGARTEN, Phase.ELEMENTARY, Phase.MIDDLE, Phase.HIGH].map(phase => ({
      value: phase,
      label: getPhaseLabel(phase)
    }))
  ), []);

  const departmentOptions = useMemo(() => (
    availableDepartments.map(dept => ({ value: dept.id, label: dept.name }))
  ), [availableDepartments]);

  const customGradeOptions = useMemo(() => (
    getGradesForPhase(selectedPhase).map(grade => ({
      value: String(grade),
      label: getGradeName(selectedPhase, grade)
    }))
  ), [selectedPhase]);

  const customPlanNames = useMemo(() => (
    [...new Set(subjects
      .filter(subject => subject.customPlanName && ((subject as any).customPlanSchoolId || 'main') === activeSchoolId)
      .map(subject => subject.customPlanName)
      .filter(Boolean))] as string[]
  ), [subjects, activeSchoolId]);

  const customPlanOptions = useMemo(() => (
    customPlanNames.map(name => ({ value: name, label: name }))
  ), [customPlanNames]);

  const getCustomPlanSubjects = (planName: string) =>
    subjects.filter(subject => subject.customPlanName === planName && ((subject as any).customPlanSchoolId || 'main') === activeSchoolId);

  const selectedSubDepartment = useMemo(() => {
    return selectedDepartment?.subDepartments?.find(dept => dept.id === selectedSubDepartmentId) || selectedDepartment?.subDepartments?.[0];
  }, [selectedDepartment, selectedSubDepartmentId]);

  const selectablePlans = useMemo(() => {
    return selectedSubDepartment?.plans || selectedDepartment?.plans || [];
  }, [selectedSubDepartment, selectedDepartment]);

  const gradePlanGroups = useMemo(() => {
    if (!selectedDepartment) return [];
    if (selectedDepartment.subDepartments?.length) {
      return selectedDepartment.subDepartments.map(sub => ({
        id: sub.id,
        label: sub.name,
        plans: sub.plans
      }));
    }
    return (selectedDepartment.plans || []).map(plan => ({
      id: plan.key,
      label: plan.label,
      plans: [plan]
    }));
  }, [selectedDepartment]);

  const getPlanSemester = (plan: { key: string; label: string }): '1' | '2' | null => {
    const source = `${plan.key} ${plan.label}`;
    if (
      source.includes('الفصل_الأول') ||
      source.includes('فصل أول') ||
      source.includes('ف1') ||
      source.includes('ف١') ||
      source.includes('ظپطµظ„_ط§ظ„ط£ظˆظ„') ||
      source.includes('ظپطµظ„ ط£ظˆظ„') ||
      source.includes('ظپظ،')
    ) return '1';
    if (
      source.includes('الفصل_الثاني') ||
      source.includes('فصل ثاني') ||
      source.includes('ف2') ||
      source.includes('ف٢') ||
      source.includes('ظپطµظ„_ط§ظ„ط«ط§ظ†ظٹ') ||
      source.includes('ظپطµظ„ ط«ط§ظ†ظٹ') ||
      source.includes('ظپظ¢')
    ) return '2';
    return null;
  };

  const formatSemesterLabel = (label: string) =>
    label
      .replace(/ - ف1/g, ' - فصل أول')
      .replace(/ - ف١/g, ' - فصل أول')
      .replace(/ - ف2/g, ' - فصل ثاني')
      .replace(/ - ف٢/g, ' - فصل ثاني')
      .replace(/ - ظپظ،/g, ' - فصل أول')
      .replace(/ - ظپظ¢/g, ' - فصل ثاني');

  const planHasSemesterChoices = useMemo(() => {
    return gradePlanGroups.some(group => group.plans.some(plan => getPlanSemester(plan)));
  }, [gradePlanGroups]);

  const visiblePlanNavigation = useMemo(() => {
    const stripSemesterLabel = (label: string) =>
      label
        .replace(/ - فصل أول/g, '')
        .replace(/ - فصل ثاني/g, '')
        .replace(/ - ف1/g, '')
        .replace(/ - ف2/g, '')
        .replace(/ - ف١/g, '')
        .replace(/ - ف٢/g, '')
        .replace(/ - ظپطµظ„ ط£ظˆظ„/g, '')
        .replace(/ - ظپطµظ„ ط«ط§ظ†ظٹ/g, '')
        .replace(/ - ظپظ،/g, '')
        .replace(/ - ظپظ¢/g, '')
        .trim();

    const selectedGroup = selectedDepartment?.subDepartments?.length
      ? gradePlanGroups.find(group => group.id === selectedSubDepartmentId) || gradePlanGroups[0]
      : null;

    const sourcePlans = selectedGroup ? selectedGroup.plans : gradePlanGroups.flatMap(group => group.plans);
    const filteredPlans = planHasSemesterChoices
      ? sourcePlans.filter(plan => getPlanSemester(plan) === selectedSemesterFilter)
      : sourcePlans;

    return filteredPlans.map(plan => ({
      key: plan.key,
      label: stripSemesterLabel(plan.label),
    }));
  }, [gradePlanGroups, planHasSemesterChoices, selectedSemesterFilter, selectedDepartment, selectedSubDepartmentId]);

  const visibleGradeGroups = useMemo(() => {
    if (!planHasSemesterChoices) return gradePlanGroups;
    return gradePlanGroups.filter(group => group.plans.some(plan => getPlanSemester(plan) === selectedSemesterFilter));
  }, [gradePlanGroups, planHasSemesterChoices, selectedSemesterFilter]);

  useEffect(() => {
    if (!planCategories.some(category => category.phase === selectedPhase)) {
      setSelectedPhase((planCategories[0]?.phase as Phase) || Phase.ELEMENTARY);
    }
  }, [planCategories, selectedPhase]);

  useEffect(() => {
    const grades = getGradesForPhase(selectedPhase);
    if (!grades.includes(selectedManualGrade)) setSelectedManualGrade(grades[0] || 1);
  }, [selectedPhase, selectedManualGrade]);

  useEffect(() => {
    if (planMode !== 'custom') return;
    if (!activeCustomPlanName && customPlanNames.length > 0) setActiveCustomPlanName(customPlanNames[0]);
    if (activeCustomPlanName && !customPlanNames.includes(activeCustomPlanName)) setActiveCustomPlanName(customPlanNames[0] || '');
  }, [planMode, activeCustomPlanName, customPlanNames]);

  useEffect(() => {
    if (!selectedCategory) return;
    const firstDepartment = availableDepartments[0];
    if (!selectedDepartmentId || !availableDepartments.some(dept => dept.id === selectedDepartmentId)) {
      setSelectedDepartmentId(firstDepartment?.id || '');
    }
  }, [selectedCategory, selectedDepartmentId, availableDepartments]);

  useEffect(() => {
    if (!selectedDepartment) return;
    const firstSubDepartment = selectedDepartment.subDepartments?.[0];
    if (selectedDepartment.subDepartments?.length) {
      if (!selectedSubDepartmentId || !selectedDepartment.subDepartments.some(dept => dept.id === selectedSubDepartmentId)) {
        setSelectedSubDepartmentId(firstSubDepartment?.id || '');
      }
    } else {
      setSelectedSubDepartmentId('');
    }
  }, [selectedDepartment, selectedSubDepartmentId]);

  useEffect(() => {
    if (visibleGradeGroups.length > 0 && !visibleGradeGroups.some(group => group.id === selectedSubDepartmentId) && selectedDepartment?.subDepartments?.length) {
      setSelectedSubDepartmentId(visibleGradeGroups[0].id);
      return;
    }
    if (visiblePlanNavigation.length > 0 && !visiblePlanNavigation.some(item => item.key === selectedPlanKey)) {
      setSelectedPlanKey(visiblePlanNavigation[0].key);
    }
  }, [visiblePlanNavigation, visibleGradeGroups, selectedPlanKey, selectedSubDepartmentId, selectedDepartment]);

  const inferGradeFromPlanKey = (planKey: string, planLabel?: string) => {
    const source = `${planKey} ${planLabel || ''}`;
    const gradeWords: [string, number][] = [
      ['السادس', 6], ['الخامس', 5], ['الرابع', 4],
      ['الثالث', 3], ['الثاني', 2], ['الأول', 1],
      ['المستوى_الثاني', 2], ['المستوى الثاني', 2],
      ['المستوى_الأول', 1], ['المستوى الأول', 1],
    ];
    for (const [word, grade] of gradeWords) {
      if (source.includes(word)) return grade;
    }
    const numeric = source.match(/grade_(\d+)/);
    return numeric ? parseInt(numeric[1], 10) : 1;
  };

  const selectedPlanLabel = selectablePlans.find(plan => plan.key === selectedPlanKey)?.label || '';
  const selectedPathLabel = visiblePlanNavigation.find(item => item.key === selectedPlanKey)?.label || '';
  const selectedGrade = planMode === 'custom'
    ? selectedManualGrade
    : selectedPlanKey ? inferGradeFromPlanKey(selectedPlanKey, selectedPlanLabel) : 1;
  const selectedGradeKey = makeGradeKey(activeSchoolId, selectedPhase, selectedGrade);
  const selectedTemplateSubjects = selectedPlanKey ? (DETAILED_TEMPLATES[selectedPlanKey] || []) : [];
  const selectedApprovedIds = getSchoolGradeSubjectIds(activeSchoolId, selectedPhase, selectedGrade);
  const selectedApprovedSubjects = subjects.filter(subject => selectedApprovedIds.includes(subject.id));
  const selectedTemplateIds = new Set(selectedTemplateSubjects.map(subject => subject.id));
  const selectedExtraSubjects = selectedApprovedSubjects.filter(subject => !selectedTemplateIds.has(subject.id));
  const selectedDepartmentPlanKeys = selectedDepartment?.subDepartments?.length
    ? selectedDepartment.subDepartments.flatMap(sub => sub.plans.map(plan => plan.key))
    : selectedDepartment?.plans.map(plan => plan.key) || [];
  const selectedStagePlanGrades = [...new Set(selectedDepartmentPlanKeys.map(key => inferGradeFromPlanKey(key, selectablePlans.find(plan => plan.key === key)?.label)))];
  const isSelectedStageApproved = planMode === 'ready' && selectedDepartmentPlanKeys.length > 0 && selectedDepartmentPlanKeys.every(key => {
    const planSubjects = DETAILED_TEMPLATES[key] || [];
    const planLabel = selectablePlans.find(plan => plan.key === key)?.label || '';
    const grade = inferGradeFromPlanKey(key, planLabel);
    const approvedIds = getSchoolGradeSubjectIds(activeSchoolId, selectedPhase, grade);
    return planSubjects.length > 0 && planSubjects.every(subject => approvedIds.includes(subject.id));
  });
  const isSelectedPlanApproved = planMode === 'ready' && selectedTemplateSubjects.length > 0 && selectedTemplateSubjects.every(subject => selectedApprovedIds.includes(subject.id));
  const selectedPlanSubjects = planMode === 'custom'
    ? subjects.filter(subject => subject.customPlanName === activeCustomPlanName && ((subject as any).customPlanSchoolId || 'main') === activeSchoolId)
    : isSelectedPlanApproved
      ? selectedApprovedSubjects
      : [
        ...selectedTemplateSubjects.map(subject => ({
          ...subject,
          periodsPerClass: planPeriodOverrides[subject.id] ?? subject.periodsPerClass
        })),
        ...selectedExtraSubjects
      ];
  const selectedPlanTotal = selectedPlanSubjects.reduce((sum, subject) => sum + (subject.periodsPerClass || 0), 0);
  const isSelectedCustomPlanApproved = planMode === 'custom' && selectedPlanSubjects.length > 0 && selectedPlanSubjects.every(subject => (subject as any).customPlanApproved === true);
  const constraintSubject = selectedPlanSubjects.find(subject => subject.id === constraintSubjectId) || subjects.find(subject => subject.id === constraintSubjectId) || null;
  const weekDays = schoolInfo.timing?.activeDays?.length || 5;
  const periodsPerDay = Math.max(...(Object.values(schoolInfo.timing?.periodCounts || { default: 7 }) as number[]));
  const periods = Array.from({ length: periodsPerDay }, (_, i) => i + 1);
  const constraintCopyTargets = useMemo(() => {
    if (!constraintSubject) return [];
    const grades = selectedStagePlanGrades.length > 0 ? selectedStagePlanGrades : getGradesForPhase(selectedPhase);
    return grades
      .filter(grade => grade !== selectedGrade)
      .map(grade => {
        const gradeKey = makeGradeKey(activeSchoolId, selectedPhase, grade);
        const legacyKey = `${selectedPhase}-${grade}`;
        const subjectIds = gradeSubjectMap[gradeKey] || (activeSchoolId === 'main' ? gradeSubjectMap[legacyKey] : []) || [];
        const targetSubject = subjects.find(subject => subjectIds.includes(subject.id) && subject.name === constraintSubject.name);
        return targetSubject ? { grade, label: getGradeName(selectedPhase, grade), subjectId: targetSubject.id } : null;
      })
      .filter(Boolean) as Array<{ grade: number; label: string; subjectId: string }>;
  }, [constraintSubject, selectedStagePlanGrades, selectedGrade, activeSchoolId, selectedPhase, gradeSubjectMap, subjects]);

  const planSummary = useMemo(() => {
    return currentPhases.map(phase => {
      const grades = getGradesForPhase(phase);
      const rows = grades.map(grade => {
        const subjectIds = getSchoolGradeSubjectIds(activeSchoolId, phase, grade);
        const gradeSubjects = subjects.filter(subject => subjectIds.includes(subject.id));
        return {
          grade,
          subjectCount: gradeSubjects.length,
          totalPeriods: gradeSubjects.reduce((sum, subject) => sum + (subject.periodsPerClass || 0), 0)
        };
      });
      return {
        phase,
        subjectCount: rows.reduce((sum, row) => sum + row.subjectCount, 0),
        totalPeriods: rows.reduce((sum, row) => sum + row.totalPeriods, 0),
        activeGrades: rows.filter(row => row.subjectCount > 0).length,
      };
    });
  }, [activeSchoolId, currentPhases, gradeSubjectMap, subjects]);

  const getSubjectConstraint = (subjectId: string): SubjectConstraint => {
    return scheduleSettings?.subjectConstraints.find(c => c.subjectId === subjectId) || {
      subjectId,
      excludedPeriods: [],
      preferredPeriods: [],
      enableDoublePeriods: false
    };
  };

  const updateSubjectConstraint = (subjectId: string, updates: Partial<SubjectConstraint>) => {
    if (!setScheduleSettings) return;
    setScheduleSettings(prev => {
      const current = prev.subjectConstraints || [];
      const existing = current.find(c => c.subjectId === subjectId);
      const nextConstraint = existing
        ? { ...existing, ...updates }
        : { subjectId, excludedPeriods: [], preferredPeriods: [], enableDoublePeriods: false, ...updates };

      return {
        ...prev,
        subjectConstraints: existing
          ? current.map(c => c.subjectId === subjectId ? nextConstraint : c)
          : [...current, nextConstraint]
      };
    });
  };

  const toggleInlinePeriod = (subjectId: string, period: number, field: 'excludedPeriods' | 'preferredPeriods') => {
    const constraint = getSubjectConstraint(subjectId);
    const current = constraint[field] || [];
    const otherField = field === 'excludedPeriods' ? 'preferredPeriods' : 'excludedPeriods';
    const otherList = constraint[otherField] || [];
    if (current.includes(period)) {
      updateSubjectConstraint(subjectId, { [field]: current.filter(p => p !== period) });
    } else {
      updateSubjectConstraint(subjectId, {
        [field]: [...current, period],
        [otherField]: otherList.filter(p => p !== period)
      });
    }
  };

  const toggleConstraintCopyGrade = (grade: number) => {
    const value = String(grade);
    setConstraintCopyGrades(prev => prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]);
  };

  const applyConstraintCopy = () => {
    if (!constraintSubject || !setScheduleSettings || constraintCopyGrades.length === 0) return;
    const source = getSubjectConstraint(constraintSubject.id);
    const targetSubjectIds = constraintCopyTargets
      .filter(target => constraintCopyGrades.includes(String(target.grade)))
      .map(target => target.subjectId);
    if (targetSubjectIds.length === 0) return;

    setScheduleSettings(prev => {
      const current = prev.subjectConstraints || [];
      const next = [...current];
      targetSubjectIds.forEach(subjectId => {
        const existingIndex = next.findIndex(item => item.subjectId === subjectId);
        const copied = {
          subjectId,
          excludedPeriods: [...source.excludedPeriods],
          preferredPeriods: [...source.preferredPeriods],
          enableDoublePeriods: source.enableDoublePeriods
        };
        if (existingIndex >= 0) next[existingIndex] = { ...next[existingIndex], ...copied };
        else next.push(copied);
      });
      return { ...prev, subjectConstraints: next };
    });
    setConstraintCopyDone(true);
    window.setTimeout(() => setConstraintCopyDone(false), 1800);
  };

  const updateSubjectAbbreviation = (subjectId: string, abbreviation: string) => {
    if (!setScheduleSettings) return;
    setScheduleSettings(prev => ({
      ...prev,
      subjectAbbreviations: {
        ...(prev.subjectAbbreviations || {}),
        [subjectId]: abbreviation
      }
    }));
  };

  const generateAbbreviation = (name: string) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    const exactRules: [string, string][] = [
      ['التربية الفنية', 'الفنية'],
      ['التربية البدنية', 'البدنية'],
      ['المهارات الحياتية', 'الحياتية'],
      ['المهارات الرقمية', 'الرقمية'],
      ['الدراسات الاجتماعية', 'اجتماعيات'],
      ['الدراسات الإسلامية', 'إسلامية'],
      ['قرآن وإسلامية', 'قرآن'],
      ['القرآن الكريم', 'قرآن'],
      ['اللغة الإنجليزية', 'إنجليزي'],
      ['اللغة العربية', 'عربي'],
      ['الرياضيات', 'رياضيات'],
      ['العلوم', 'علوم'],
      ['لغتي', 'لغتي'],
    ];
    const rule = exactRules.find(([needle]) => name.includes(needle));
    if (rule) return rule[1];
    const ignored = new Set(['التربية', 'الدراسات', 'المهارات', 'اللغة', 'مادة']);
    return words.find(word => word.length > 2 && !ignored.has(word.replace(/^ال/, 'ال'))) || words[words.length - 1] || words[0];
  };

  useEffect(() => {
    if (!setScheduleSettings || selectedPlanSubjects.length === 0) return;
    setScheduleSettings(prev => {
      const current = prev.subjectAbbreviations || {};
      let changed = false;
      const next = { ...current };
      selectedPlanSubjects.forEach(subject => {
        if (!next[subject.id] && subject.name?.trim()) {
          next[subject.id] = generateAbbreviation(subject.name);
          changed = true;
        }
      });
      return changed ? { ...prev, subjectAbbreviations: next } : prev;
    });
  }, [selectedPlanSubjects.map(subject => `${subject.id}:${subject.name}`).join('|'), setScheduleSettings]);

  const handleSuggestVisibleAbbreviations = () => {
    if (!setScheduleSettings) return;
    const updates = selectedPlanSubjects.reduce((acc, subject) => ({
      ...acc,
      [subject.id]: generateAbbreviation(subject.name)
    }), {} as Record<string, string>);
    setScheduleSettings(prev => ({
      ...prev,
      subjectAbbreviations: {
        ...(prev.subjectAbbreviations || {}),
        ...updates
      }
    }));
  };

  const handleInlinePeriodChange = (subjectId: string, value: number) => {
    if (isSelectedPlanApproved || subjects.some(subject => subject.id === subjectId)) {
      setSubjects(prev => prev.map(subject => subject.id === subjectId ? { ...subject, periodsPerClass: value } : subject));
      return;
    }
    setPlanPeriodOverrides(prev => ({ ...prev, [subjectId]: value }));
  };

  const handleApproveSelectedPlan = () => {
    if (!selectedCategory || !selectedDepartment) return;
    if (selectedDepartmentPlanKeys.length === 0) return;
    handleApprovePlan(selectedCategory.phase as Phase, selectedDepartment.id, selectedDepartmentPlanKeys, planPeriodOverrides);
  };

  const handleApproveCustomPlan = () => {
    if (!activeCustomPlanName) return;
    handleApproveCustomPlanByName(activeCustomPlanName);
  };

  const handleApproveCustomPlanByName = (planName: string) => {
    setSubjects(prev => prev.map(subject =>
      subject.customPlanName === planName && ((subject as any).customPlanSchoolId || 'main') === activeSchoolId
        ? ({ ...subject, customPlanApproved: true } as Subject)
        : subject
    ));
  };

  const handleUnapproveCustomPlan = () => {
    if (!activeCustomPlanName) return;
    handleUnapproveCustomPlanByName(activeCustomPlanName);
  };

  const handleUnapproveCustomPlanByName = (planName: string) => {
    setSubjects(prev => prev.map(subject =>
      subject.customPlanName === planName && ((subject as any).customPlanSchoolId || 'main') === activeSchoolId
        ? ({ ...subject, customPlanApproved: false } as Subject)
        : subject
    ));
  };

  const handleAddSubjectToSelectedGrade = () => {
    const newSub: Subject = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      periodsPerClass: 0,
      phases: [selectedPhase],
      department: selectedDepartment?.name || 'custom',
      targetGrades: [selectedGrade],
      isArchived: false,
      specializationIds: [],
      customPlanName: planMode === 'custom' ? (addSubjectTargetPlanName || activeCustomPlanName || customPlanName || 'خطة مخصصة') : undefined,
      ...(planMode === 'custom' ? { customPlanSchoolId: activeSchoolId, customPlanApproved: false } : {})
    } as Subject;
    setSubjects(prev => [...prev, newSub]);
    if (planMode !== 'custom') {
      setGradeSubjectMap(prev => ({
        ...prev,
        [selectedGradeKey]: [...(prev[selectedGradeKey] || []), newSub.id]
      }));
    }
  };

  const handleCreateCustomGradePlan = (planName: string, subjectCount: number) => {
    const generatedSubjects: Subject[] = [];
    for (let i = 0; i < subjectCount; i++) {
      generatedSubjects.push({
        id: `custom-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        name: '',
        periodsPerClass: 0,
        phases: [Phase.OTHER],
        department: 'custom',
        targetGrades: [],
        isArchived: false,
        specializationIds: [],
        customPlanName: planName,
        customPlanSchoolId: activeSchoolId,
        customPlanApproved: false
      } as Subject);
    }
    setSubjects(prev => [...prev, ...generatedSubjects]);
    setActiveCustomPlanName(planName);
    setShowManualModal(false);
    setPlanMode('custom');
  };

  const handleUnapproveSelectedGrade = () => {
    const idsToRemove = new Set(selectedApprovedIds);
    setGradeSubjectMap(prev => {
      const next = { ...prev };
      delete next[selectedGradeKey];
      if (activeSchoolId === 'main') delete next[`${selectedPhase}-${selectedGrade}`];
      return next;
    });
    const remainingIds = new Set<string>();
    Object.entries(gradeSubjectMap).forEach(([key, ids]) => {
      if (key !== selectedGradeKey && key !== `${selectedPhase}-${selectedGrade}`) {
        ids.forEach(id => remainingIds.add(id));
      }
    });
    setSubjects(prev => prev.filter(subject => !idsToRemove.has(subject.id) || remainingIds.has(subject.id)));
  };

  const handleUnapproveSelectedPlan = () => {
    if (!selectedDepartment) return;
    const gradesToClear = selectedStagePlanGrades;
    const gradeKeysToClear = new Set(gradesToClear.flatMap(grade => [
      makeGradeKey(activeSchoolId, selectedPhase, grade),
      `${selectedPhase}-${grade}`
    ]));
    const subjectIdsToRemove = new Set<string>();
    Object.entries(gradeSubjectMap).forEach(([key, ids]) => {
      if (gradeKeysToClear.has(key)) ids.forEach(id => subjectIdsToRemove.add(id));
    });
    setGradeSubjectMap(prev => {
      const next = { ...prev };
      gradeKeysToClear.forEach(key => {
        if (key.startsWith(activeSchoolId) || activeSchoolId === 'main') delete next[key];
      });
      return next;
    });
    const remainingIds = new Set<string>();
    Object.entries(gradeSubjectMap).forEach(([key, ids]) => {
      if (!gradeKeysToClear.has(key)) ids.forEach(id => remainingIds.add(id));
    });
    setSubjects(prev => prev.filter(subject => !subjectIdsToRemove.has(subject.id) || remainingIds.has(subject.id)));
  };

  const handleDeleteSubjectFromSelectedGrade = (subjectId: string) => {
    if (planMode === 'custom') {
      setSubjects(prev => prev.filter(subject => subject.id !== subjectId));
      return;
    }
    setGradeSubjectMap(prev => ({
      ...prev,
      [selectedGradeKey]: (prev[selectedGradeKey] || []).filter(id => id !== subjectId)
    }));
    if (subjectId.startsWith('custom-')) {
      setSubjects(prev => prev.filter(subject => subject.id !== subjectId));
    }
  };

  const handleDeleteCurrentCustomPlan = () => {
    const customNames = [...new Set(selectedPlanSubjects.map(subject => subject.customPlanName).filter(Boolean))] as string[];
    if (customNames.length > 0) {
      setDeleteCustomPlanName(customNames[0]);
      return;
    }
    const ids = new Set(selectedPlanSubjects.map(subject => subject.id));
    setGradeSubjectMap(prev => ({
      ...prev,
      [selectedGradeKey]: (prev[selectedGradeKey] || []).filter(id => !ids.has(id))
    }));
    setSubjects(prev => prev.filter(subject => !ids.has(subject.id)));
  };

  const handlePrintCustomPlanCard = (planName: string, planSubjects: Subject[]) => {
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
      <title>${planName}</title>
      <style>${printableTableStyles}</style>
      </head><body>
      <h2>${activeSchoolName || 'المدرسة'}</h2>
      ${buildPrintablePlanTable(planName, planSubjects)}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const buildPrintablePlanTable = (label: string, planSubjects: Subject[]) => {
    const total = planSubjects.reduce((sum, subject) => sum + (subject.periodsPerClass || 0), 0);
    const rows = planSubjects.map((subject, index) => `
      <tr>
        <td class="seq"><span>${index + 1}</span></td>
        <td class="subject">${subject.name || '-'}</td>
        <td class="periods">${subject.periodsPerClass || '-'}</td>
      </tr>
    `).join('');
    return `
      <section class="plan-section">
        <h3>${label}</h3>
        <table class="plan-table">
          <thead>
            <tr>
              <th class="seq">م</th>
              <th>المادة</th>
              <th class="periods">عدد الحصص</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td class="total-label">الإجمالي</td>
              <td class="total-subjects">${planSubjects.length} مواد</td>
              <td class="total-periods">${total}</td>
            </tr>
          </tfoot>
        </table>
      </section>
    `;
  };

  const printableTableStyles = `
    @page{size:A4 portrait;margin:14mm}
    body{margin:0;background:white;direction:rtl;font-family:'Tajawal',Arial,sans-serif;color:#1e293b}
    h2{color:#655ac1;margin:0 0 12px;font-size:18px;font-weight:900}
    .plan-section{break-inside:avoid;margin-bottom:24px}
    .plan-section h3{color:#655ac1;margin:0 0 10px;font-size:16px;font-weight:900}
    .plan-table{border-collapse:separate;border-spacing:0;width:100%;table-layout:fixed;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;margin-bottom:16px}
    .plan-table th{background:#f8fafc;color:#655ac1;font-weight:900;font-size:13px;border-bottom:1px solid #e2e8f0;padding:12px 10px;text-align:right;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .plan-table td{border-bottom:1px solid #f1f5f9;padding:10px;font-size:12px;text-align:right;color:#334155}
    .plan-table tr:last-child td{border-bottom:0}
    .plan-table .seq{width:52px;text-align:center}
    .plan-table td.seq span{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:999px;background:#f8fafc;border:1px solid #f1f5f9;color:#64748b;font-weight:900;box-shadow:0 1px 2px rgba(15,23,42,.08);-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .plan-table .subject{font-weight:800;color:#1e293b}
    .plan-table .periods{width:110px;text-align:center;font-weight:900}
    .plan-table tfoot td{background:#f8fafc;color:#655ac1;font-weight:900;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .plan-table .total-label{color:#64748b;text-align:center;font-size:11px}
    .plan-table .total-subjects,.plan-table .total-periods{color:#655ac1}
  `;

  const handlePrintSelectedPlan = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
      <title>طباعة الخطة الدراسية</title>
      <style>${printableTableStyles}</style>
      </head><body>
      <h2>${getPhaseLabel(selectedPhase)} - ${selectedDepartment?.name || ''}</h2>
      ${buildPrintablePlanTable(planMode === 'custom' ? (activeCustomPlanName || 'خطة مخصصة') : `${getGradeName(selectedPhase, selectedGrade)} ${selectedPlanLabel ? `- ${selectedPlanLabel}` : ''}`, selectedPlanSubjects)}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const handlePrintSelectedDepartment = () => {
    if (!selectedCategory || !selectedDepartment) return;
    const printPlan = (label: string, planKey: string) => {
      const planSubjects = DETAILED_TEMPLATES[planKey] || [];
      return buildPrintablePlanTable(label, planSubjects);
    };
    const allPlansRaw = selectedDepartment.subDepartments?.length
      ? selectedDepartment.subDepartments.flatMap(sub => sub.plans.map(plan => ({ ...plan, label: formatSemesterLabel(`${sub.name} - ${plan.label}`) })))
      : selectedDepartment.plans.map(plan => ({ ...plan, label: formatSemesterLabel(plan.label) }));
    const allPlans = planHasSemesterChoices
      ? allPlansRaw.filter(plan => getPlanSemester(plan) === selectedSemesterFilter)
      : allPlansRaw;
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
      <title>طباعة خطط المرحلة</title>
      <style>${printableTableStyles}</style>
      </head><body>
      <h2 style="color:#3b355a;margin-bottom:12px;font-size:1.1rem;font-weight:900;">${selectedCategory.name} - ${selectedDepartment.name}</h2>
      ${allPlans.map(plan => printPlan(plan.label, plan.key)).join('')}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const handlePrintPlanKeys = (planKeys: string[]) => {
    if (!selectedCategory || !selectedDepartment || planKeys.length === 0) return;
    const allPlansRaw = selectedDepartment.subDepartments?.length
      ? selectedDepartment.subDepartments.flatMap(sub => sub.plans.map(plan => ({ ...plan, label: formatSemesterLabel(`${sub.name} - ${plan.label}`) })))
      : selectedDepartment.plans.map(plan => ({ ...plan, label: formatSemesterLabel(plan.label) }));
    const allPlans = planHasSemesterChoices
      ? allPlansRaw.filter(plan => getPlanSemester(plan) === selectedSemesterFilter)
      : allPlansRaw;
    const plansToPrint = allPlans.filter(plan => planKeys.includes(plan.key));
    const buildTable = (label: string, planKey: string) => {
      const planSubjects = DETAILED_TEMPLATES[planKey] || [];
      return buildPrintablePlanTable(label, planSubjects);
    };
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
      <title>طباعة الخطة الدراسية</title>
      <style>${printableTableStyles}</style>
      </head><body>
      <h2 style="color:#3b355a;margin-bottom:12px;font-size:1.1rem;font-weight:900;">${selectedCategory.name} - ${selectedDepartment.name}</h2>
      ${plansToPrint.map(plan => buildTable(plan.label, plan.key)).join('')}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
    setShowPrintChooser(false);
  };


  // --- Render ---

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300 mb-6">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <Layers size={36} strokeWidth={1.8} className="text-[#655ac1]" />
             المواد الدراسية
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">معاينة الخطة، اعتمادها، طباعتها، وضبط اختصارات وقيود المواد من شاشة واحدة</p>
      </div>

      {/* School Tabs */}
      <SchoolTabs
        schoolInfo={schoolInfo}
        activeSchoolId={activeSchoolId}
        onTabChange={setActiveSchoolId}
      />

      <div className="space-y-6">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <ClipboardCheck size={26} className="text-[#655ac1] mt-0.5" />
              <div>
              <h4 className="text-lg font-black text-slate-800">اختر الخطة الدراسية</h4>
              <p className="text-xs text-slate-400 font-bold mt-1">ابدأ بخطة جاهزة أو أنشئ خطة مخصصة حسب احتياجك</p>
            </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => { setPlanMode('ready'); setPrintScope(null); }}
                className={`inline-flex w-fit min-w-[180px] items-center justify-center gap-3 rounded-xl border-2 px-4 py-2.5 text-center transition-all ${
                  planMode === 'ready'
                    ? 'border-[#655ac1] bg-[#655ac1] text-white shadow-lg shadow-[#655ac1]/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-[#655ac1]/40'
                }`}
              >
                <span className="font-black text-sm">خطة دراسية جاهزة</span>
              </button>
              <button
                onClick={() => { setPlanMode('custom'); setShowManualModal(false); setPrintScope(null); }}
                className={`inline-flex w-fit min-w-[180px] items-center justify-center gap-3 rounded-xl border-2 px-4 py-2.5 text-center transition-all ${
                  planMode === 'custom'
                    ? 'border-[#655ac1] bg-[#655ac1] text-white shadow-lg shadow-[#655ac1]/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-[#655ac1]/40'
                }`}
              >
                <span className="font-black text-sm">إضافة خطة مخصصة</span>
              </button>
            </div>
          </div>
        </div>

        {planMode === 'ready' && (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-visible">
            <div className="px-5 pt-4 flex items-start gap-3">
              <Route size={24} className="text-[#655ac1] mt-1" />
              <div>
                <h4 className="font-black text-slate-800">مسار الخطة</h4>
                <p className="text-xs text-slate-400 font-bold mt-1">اختر المرحلة ثم القسم / المسار.</p>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black text-slate-400 block mb-2">المرحلة</label>
                <InlineSelect value={selectedPhase} onChange={value => setSelectedPhase(value as Phase)} options={phaseOptions} />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 block mb-2">القسم / المسار</label>
                <InlineSelect value={selectedDepartment?.id || ''} onChange={setSelectedDepartmentId} options={departmentOptions} />
              </div>
            </div>
          </div>
        )}

        {planMode === 'custom' && (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="font-black text-slate-800">إعداد الخطة المخصصة</h4>
                <p className="text-xs text-slate-400 font-bold mt-1">إنشاء خطة مخصصة وتحديد عدد موادها ونصاب حصصها يدويًا.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="text-[11px] font-black text-slate-400 block mb-2">اسم الخطة</label>
                  <input
                    value={customPlanName}
                    onChange={e => setCustomPlanName(e.target.value)}
                    className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl focus:outline-none focus:border-[#655ac1]/50 transition-all"
                    placeholder="مثال : خطة المدرسة العالمية"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 block mb-2">عدد المواد</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={customSubjectCount}
                    onChange={e => setCustomSubjectCount(e.target.value)}
                    className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl focus:outline-none focus:border-[#655ac1]/50 transition-all"
                  />
                </div>
                <div>
                  <button
                  onClick={() => {
                    if (!customPlanName.trim()) return;
                    handleCreateCustomGradePlan(customPlanName.trim(), parseInt(customSubjectCount, 10) || 1);
                    setCustomPlanName('');
                    setCustomSubjectCount('5');
                  }}
                  disabled={!customPlanName.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#655ac1] text-white font-bold text-sm shadow-lg shadow-[#655ac1]/20 hover:bg-[#5046a0] disabled:bg-slate-300 disabled:shadow-none transition-all"
                >
                  <Plus size={16} />
                  إنشاء الخطة
                </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {planMode === 'ready' && (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-col items-start gap-2">
                  <span className="text-sm font-black text-[#655ac1]">{activeSchoolName || 'المدرسة'}</span>
                  {planMode === 'ready' && (
                    <span className="text-[11px] font-bold bg-white border border-slate-300 text-slate-500 rounded-lg px-2.5 py-1">
                      {getPhaseLabel(selectedPhase)} - {selectedDepartment?.name || 'عام'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {planMode === 'custom' && selectedPlanSubjects.length > 0 && (
                  isSelectedCustomPlanApproved ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm font-black text-[#655ac1]">
                      <Check size={16} />
                      <span>خطة معتمدة</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleApproveCustomPlan}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-[#655ac1] text-white hover:bg-[#5046a0] shadow-lg shadow-[#655ac1]/20"
                    >
                      <Check size={16} />
                      <span>اعتماد الخطة</span>
                    </button>
                  )
                )}
                {planMode !== 'custom' && (
                  isSelectedStageApproved ? (
                    <>
                      <div className="flex items-center gap-2 px-3 py-2 text-sm font-black text-[#655ac1]">
                        <Check size={16} />
                        <span>خطة معتمدة</span>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={handleApproveSelectedPlan}
                      disabled={!selectedPlanKey || selectedTemplateSubjects.length === 0}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-[#655ac1] text-white hover:bg-[#5046a0] shadow-lg shadow-[#655ac1]/20 disabled:bg-slate-300 disabled:shadow-none"
                    >
                      <Check size={16} />
                      <span>اعتماد الخطة</span>
                    </button>
                  )
                )}
                <button
                  onClick={() => {
                    if (planMode === 'custom') {
                      handlePrintSelectedPlan();
                      return;
                    }
                    setSelectedPrintKeys(selectedPlanKey ? [selectedPlanKey] : []);
                    setPrintScope(null);
                    setShowPrintChooser(true);
                  }}
                  disabled={selectedPlanSubjects.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-bold text-sm transition-all disabled:opacity-40"
                >
                  <Printer size={16} />
                  <span>طباعة</span>
                </button>
                <button
                  onClick={() => { setAddSubjectTargetPlanName(null); setConfirmAddCustomSubject(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-[#655ac1]/50 font-bold text-sm transition-all"
                >
                  <Plus size={16} />
                  <span>إضافة مادة</span>
                </button>
                {planMode !== 'custom' && isSelectedStageApproved && (
                  <button
                    onClick={handleUnapproveSelectedPlan}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-500/20"
                  >
                    <X size={16} />
                    <span>إلغاء الاعتماد</span>
                  </button>
                )}
                {planMode === 'custom' && isSelectedCustomPlanApproved && (
                  <button
                    onClick={handleUnapproveCustomPlan}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-500/20"
                  >
                    <X size={16} />
                    <span>إلغاء الاعتماد</span>
                  </button>
                )}
                {planMode === 'custom' ? (
                  <button
                    onClick={handleDeleteCurrentCustomPlan}
                    disabled={selectedPlanSubjects.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                    <span>حذف الخطة</span>
                  </button>
                ) : null}
              </div>
            </div>

            {planMode === 'ready' && gradePlanGroups.length > 0 && (
              <div className="px-5 py-3 border-b border-slate-100 space-y-3">
                {planHasSemesterChoices && (
                  <div className="flex gap-2 flex-wrap">
                    {(['1', '2'] as const).map(semester => (
                      <button
                        key={semester}
                        onClick={() => setSelectedSemesterFilter(semester)}
                        className={`px-5 py-2.5 rounded-xl border text-xs font-black transition-all ${
                          selectedSemesterFilter === semester
                            ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-lg shadow-[#655ac1]/15'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-[#655ac1]/40 hover:text-[#655ac1]'
                        }`}
                      >
                        {semester === '1' ? 'الفصل الأول' : 'الفصل الثاني'}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {(planHasSemesterChoices ? visibleGradeGroups : gradePlanGroups).map(group => {
                    const isActive = selectedDepartment?.subDepartments?.length
                      ? selectedSubDepartmentId === group.id
                      : group.plans.some(plan => plan.key === selectedPlanKey);
                    return (
                      <button
                        key={group.id}
                        onClick={() => {
                          if (selectedDepartment?.subDepartments?.length) {
                            setSelectedSubDepartmentId(group.id);
                            const nextPlan = (planHasSemesterChoices
                              ? group.plans.find(plan => getPlanSemester(plan) === selectedSemesterFilter)
                              : group.plans[0]);
                            setSelectedPlanKey(nextPlan?.key || '');
                          } else {
                            setSelectedPlanKey(group.plans[0]?.key || '');
                          }
                        }}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-black transition-all ${
                          isActive
                            ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-lg shadow-[#655ac1]/15'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-[#655ac1]/40 hover:text-[#655ac1]'
                        }`}
                      >
                        {group.label}
                      </button>
                    );
                  })}
                </div>

                {selectedDepartment?.subDepartments?.length && visiblePlanNavigation.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {visiblePlanNavigation.map(item => {
                      const isActive = item.key === selectedPlanKey;
                      return (
                        <button
                          key={item.key}
                          onClick={() => setSelectedPlanKey(item.key)}
                        className={`px-4 py-2 rounded-xl border text-[11px] font-black transition-all ${
                          isActive
                              ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-lg shadow-[#655ac1]/15'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-[#655ac1]/40 hover:text-[#655ac1]'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="px-5 pt-4">
              <div className="mb-3 text-lg font-black text-[#655ac1]">
                {planMode === 'custom'
                  ? (activeCustomPlanName || 'خطة مخصصة')
                  : (
                    <>
                      {getGradeName(selectedPhase, selectedGrade)}
                      {selectedPhase === Phase.HIGH && selectedPathLabel ? ` - ${selectedPathLabel.includes('مسار') ? selectedPathLabel : `مسار ${selectedPathLabel}`}` : ''}
                    </>
                  )}
              </div>
            </div>

            <div className="px-5 pb-5 overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed text-right border-separate border-spacing-0 rounded-2xl overflow-hidden border border-slate-100">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-3 py-4 text-sm font-black text-[#655ac1] w-14 text-center">م</th>
                    <th className="px-3 py-4 text-sm font-black text-[#655ac1] w-[38%]">المادة</th>
                    <th className="px-3 py-4 text-sm font-black text-[#655ac1] w-[24%]">اختصار المادة</th>
                    <th className="px-3 py-4 text-sm font-black text-[#655ac1] text-center w-32">عدد الحصص</th>
                    <th className="px-3 py-4 text-sm font-black text-[#655ac1] text-center w-28">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {selectedPlanSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center">
                        <Layers size={42} className="mx-auto text-[#655ac1]/30 mb-3" />
                        <div className="font-black text-slate-600">لا توجد مواد لهذا الاختيار</div>
                        <div className="text-xs text-slate-400 font-bold mt-1">اختر مرحلة وقسمًا وصفًا آخر أو أضف مادة مخصصة</div>
                      </td>
                    </tr>
                  ) : selectedPlanSubjects.map((subject, index) => {
                    return (
                      <React.Fragment key={subject.id}>
                        <tr className="hover:bg-[#655ac1]/[0.03] transition-colors">
                          <td className="px-3 py-3 text-center">
                            <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-slate-50 text-slate-500 text-xs font-black shadow-sm border border-slate-100">
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              value={subject.name}
                              onChange={e => setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, name: e.target.value } : s))}
                              readOnly={planMode !== 'custom' && !subject.id.startsWith('custom-')}
                              className="w-full bg-transparent border-0 read-only:cursor-default focus:ring-0 outline-none font-bold text-sm text-slate-800 py-1"
                              placeholder="اسم المادة"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              value={scheduleSettings?.subjectAbbreviations?.[subject.id] ?? generateAbbreviation(subject.name)}
                              onChange={e => updateSubjectAbbreviation(subject.id, e.target.value)}
                              disabled={!setScheduleSettings}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-[#655ac1] focus:outline-none focus:border-[#655ac1] disabled:opacity-50"
                              placeholder={generateAbbreviation(subject.name)}
                              maxLength={15}
                            />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min={0}
                              value={subject.periodsPerClass || 0}
                              onChange={e => handleInlinePeriodChange(subject.id, parseInt(e.target.value) || 0)}
                              className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-center text-sm font-black text-slate-700 focus:outline-none focus:border-[#655ac1]"
                            />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => { setConstraintSubjectId(subject.id); setConstraintCopyGrades([]); }}
                                className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-[#655ac1] hover:bg-[#ede9fe] hover:border-[#655ac1]/40 transition-colors"
                                title="إعدادات المادة"
                              >
                                <Settings2 size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteSubjectCandidate(subject.id)}
                                className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                                title="حذف من الصف"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
                {selectedPlanSubjects.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-100">
                      <td className="px-3 py-3 text-center text-xs font-black text-slate-500">الإجمالي</td>
                      <td className="px-3 py-3 text-sm font-black text-[#655ac1]">{selectedPlanSubjects.length} مواد</td>
                      <td className="px-3 py-3"></td>
                      <td className="px-3 py-3 text-center text-sm font-black text-[#655ac1]">{selectedPlanTotal}</td>
                      <td className="px-3 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

        )}

        {planMode === 'custom' && customPlanNames.map(planName => {
          const planSubjects = getCustomPlanSubjects(planName);
          const planTotal = planSubjects.reduce((sum, subject) => sum + (subject.periodsPerClass || 0), 0);
          const isApproved = planSubjects.length > 0 && planSubjects.every(subject => (subject as any).customPlanApproved === true);
          return (
            <div key={planName} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-col items-start gap-2">
                    <span className="text-sm font-black text-[#655ac1]">{activeSchoolName || 'المدرسة'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isApproved ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm font-black text-[#655ac1]">
                      <Check size={16} />
                      <span>خطة معتمدة</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApproveCustomPlanByName(planName)}
                      disabled={planSubjects.length === 0}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-[#655ac1] text-white hover:bg-[#5046a0] shadow-lg shadow-[#655ac1]/20 disabled:bg-slate-300 disabled:shadow-none"
                    >
                      <Check size={16} />
                      <span>اعتماد الخطة</span>
                    </button>
                  )}
                  <button
                    onClick={() => handlePrintCustomPlanCard(planName, planSubjects)}
                    disabled={planSubjects.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-bold text-sm transition-all disabled:opacity-40"
                  >
                    <Printer size={16} />
                    <span>طباعة</span>
                  </button>
                  <button
                    onClick={() => { setAddSubjectTargetPlanName(planName); setConfirmAddCustomSubject(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-[#655ac1]/50 font-bold text-sm transition-all"
                  >
                    <Plus size={16} />
                    <span>إضافة مادة</span>
                  </button>
                  {isApproved && (
                    <button
                      onClick={() => handleUnapproveCustomPlanByName(planName)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-500/20"
                    >
                      <X size={16} />
                      <span>إلغاء الاعتماد</span>
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteCustomPlanName(planName)}
                    disabled={planSubjects.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-white text-slate-500 border border-slate-300 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Trash2 size={16} className="text-rose-500" />
                    <span>حذف الخطة</span>
                  </button>
                </div>
              </div>

              <div className="px-5 pt-4">
                <div className="mb-3 text-lg font-black text-[#655ac1]">{planName}</div>
              </div>

              <div className="px-5 pb-5 overflow-x-auto">
                <table className="w-full min-w-[720px] table-fixed text-right border-separate border-spacing-0 rounded-2xl overflow-hidden border border-slate-100">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-3 py-4 text-sm font-black text-[#655ac1] w-14 text-center">م</th>
                      <th className="px-3 py-4 text-sm font-black text-[#655ac1] w-[38%]">المادة</th>
                      <th className="px-3 py-4 text-sm font-black text-[#655ac1] w-[24%]">اختصار المادة</th>
                      <th className="px-3 py-4 text-sm font-black text-[#655ac1] text-center w-32">عدد الحصص</th>
                      <th className="px-3 py-4 text-sm font-black text-[#655ac1] text-center w-28">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {planSubjects.map((subject, index) => (
                      <tr key={subject.id} className="hover:bg-[#655ac1]/[0.03] transition-colors">
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-slate-50 text-slate-500 text-xs font-black shadow-sm border border-slate-100">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            value={subject.name}
                            onChange={e => setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, name: e.target.value } : s))}
                            className="w-full bg-transparent border-0 focus:ring-0 outline-none font-bold text-sm text-slate-800 py-1"
                            placeholder="اسم المادة"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            value={scheduleSettings?.subjectAbbreviations?.[subject.id] ?? generateAbbreviation(subject.name)}
                            onChange={e => updateSubjectAbbreviation(subject.id, e.target.value)}
                            disabled={!setScheduleSettings}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-[#655ac1] focus:outline-none focus:border-[#655ac1] disabled:opacity-50"
                            placeholder={generateAbbreviation(subject.name)}
                            maxLength={15}
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            min={0}
                            value={subject.periodsPerClass || 0}
                            onChange={e => handleInlinePeriodChange(subject.id, parseInt(e.target.value) || 0)}
                            className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-center text-sm font-black text-slate-700 focus:outline-none focus:border-[#655ac1]"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => { setConstraintSubjectId(subject.id); setConstraintCopyGrades([]); }}
                              className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-[#655ac1] hover:bg-[#ede9fe] hover:border-[#655ac1]/40 transition-colors"
                              title="إعدادات المادة"
                            >
                              <Settings2 size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteSubjectCandidate(subject.id)}
                              className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                              title="حذف المادة"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {planSubjects.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-100">
                        <td className="px-3 py-3 text-center text-xs font-black text-slate-500">الإجمالي</td>
                        <td className="px-3 py-3 text-sm font-black text-[#655ac1]">{planSubjects.length} مواد</td>
                        <td className="px-3 py-3"></td>
                        <td className="px-3 py-3 text-center text-sm font-black text-[#655ac1]">{planTotal}</td>
                        <td className="px-3 py-3"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {confirmAddCustomSubject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-7 py-8">
              <div className="flex items-start gap-4">
                <Plus size={30} className="text-[#655ac1] mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-xl font-black text-slate-800 mb-2">هل تريد إضافة مادة ؟</h2>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    سيتم إضافة مادة جديدة إلى خطة {planMode === 'custom' ? (addSubjectTargetPlanName || activeCustomPlanName || 'مخصصة') : getGradeName(selectedPhase, selectedGrade)} ويمكنك التعديل مباشرة بعد الإضافة.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-7 pb-7 flex gap-3">
              <button
                onClick={() => { setConfirmAddCustomSubject(false); setAddSubjectTargetPlanName(null); }}
                className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  handleAddSubjectToSelectedGrade();
                  setConfirmAddCustomSubject(false);
                  setAddSubjectTargetPlanName(null);
                }}
                className="flex-1 px-4 py-3 bg-[#655ac1] hover:bg-[#5046a0] text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-[#655ac1]/20"
              >
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSubjectCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 flex items-start gap-3">
              <Trash2 size={28} className="text-rose-500 mt-0.5" />
              <div>
                <h2 className="text-xl font-black text-slate-800 mb-2">حذف المادة</h2>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  سيتم حذف المادة من هذه الخطة. هل تريد المتابعة؟
                </p>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setDeleteSubjectCandidate(null)}
                className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  handleDeleteSubjectFromSelectedGrade(deleteSubjectCandidate);
                  setDeleteSubjectCandidate(null);
                }}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintChooser && selectedDepartment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Printer size={28} className="text-[#655ac1] mt-0.5" />
                <div>
                  <h2 className="text-xl font-black text-slate-800">طباعة الخطة</h2>
                  <p className="text-xs text-slate-400 font-bold mt-1">اختر طباعة كامل الخطة أو اختر صفوف محددة.</p>
                </div>
              </div>
              <button onClick={() => { setShowPrintChooser(false); setPrintScope(null); }} className="w-10 h-10 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-400 flex items-center justify-center">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[55vh] overflow-y-auto custom-scrollbar">
              <button
                onClick={() => {
                  const printPlansRaw = selectedDepartment.subDepartments?.length
                    ? selectedDepartment.subDepartments.flatMap(sub => sub.plans.map(plan => ({ ...plan, label: formatSemesterLabel(`${sub.name} - ${plan.label}`) })))
                    : selectedDepartment.plans.map(plan => ({ ...plan, label: formatSemesterLabel(plan.label) }));
                  const printPlans = planHasSemesterChoices
                    ? printPlansRaw.filter(plan => getPlanSemester(plan) === selectedSemesterFilter)
                    : printPlansRaw;
                  const allKeys = printPlans.map(plan => plan.key);
                  setSelectedPrintKeys(allKeys);
                  setPrintScope('all');
                }}
                className={`w-full flex items-center justify-between rounded-2xl border px-5 py-3 font-black text-sm transition-all ${
                  printScope === 'all'
                    ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-lg shadow-[#655ac1]/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#655ac1]/40'
                }`}
              >
                <span>طباعة كامل الخطة</span>
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                  printScope === 'all' ? 'border-white bg-white text-[#655ac1]' : 'border-slate-300 bg-white text-transparent'
                }`}>
                  <Check size={12} strokeWidth={3} />
                </span>
              </button>
              {(planHasSemesterChoices
                ? (selectedDepartment.subDepartments?.length
                    ? selectedDepartment.subDepartments.flatMap(sub => sub.plans.map(plan => ({ ...plan, label: formatSemesterLabel(`${sub.name} - ${plan.label}`) })))
                    : selectedDepartment.plans.map(plan => ({ ...plan, label: formatSemesterLabel(plan.label) }))
                  ).filter(plan => getPlanSemester(plan) === selectedSemesterFilter)
                : (selectedDepartment.subDepartments?.length
                    ? selectedDepartment.subDepartments.flatMap(sub => sub.plans.map(plan => ({ ...plan, label: formatSemesterLabel(`${sub.name} - ${plan.label}`) })))
                    : selectedDepartment.plans.map(plan => ({ ...plan, label: formatSemesterLabel(plan.label) }))
                  )
              ).map(plan => {
                const checked = selectedPrintKeys.includes(plan.key);
                return (
                  <button
                    key={plan.key}
                    onClick={() => {
                      setPrintScope('selected');
                      setSelectedPrintKeys(prev => checked ? prev.filter(key => key !== plan.key) : [...prev, plan.key]);
                    }}
                    className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 text-right hover:bg-slate-50 transition-all"
                  >
                    <span className="font-bold text-sm text-slate-700">{plan.label}</span>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${checked && printScope === 'selected' ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'border-slate-300 bg-white text-transparent'}`}>
                      <Check size={13} strokeWidth={3} />
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => { setShowPrintChooser(false); setPrintScope(null); }} className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50">
                إغلاق
              </button>
              <button onClick={() => handlePrintPlanKeys(selectedPrintKeys)} disabled={!printScope || selectedPrintKeys.length === 0} className="px-7 py-2.5 rounded-xl bg-[#655ac1] text-white font-bold text-sm disabled:bg-slate-300">
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}

      {constraintSubject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center text-[#655ac1]">
                  <Settings2 size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">إعدادات المواد</h2>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">اختر الحصص المستثناة أو المفضلة والتتابع للمادة</p>
                </div>
              </div>
              <button onClick={() => setConstraintSubjectId(null)} className="w-10 h-10 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-400 transition-colors flex items-center justify-center">
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const constraint = getSubjectConstraint(constraintSubject.id);
                const isConstraintForCustomPlan = Boolean(constraintSubject.customPlanName);
                return (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full table-fixed text-right">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className={`px-4 py-3 text-right text-xs font-black text-[#655ac1] ${isConstraintForCustomPlan ? 'w-[42%]' : 'w-[34%]'}`}>اسم المادة</th>
                            <th className={`px-4 py-3 text-right text-xs font-black text-[#655ac1] ${isConstraintForCustomPlan ? 'w-[30%]' : 'w-[22%]'}`}>
                              {isConstraintForCustomPlan ? 'الخطة' : 'الصف'}
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-black text-[#655ac1] w-[18%]">عدد الحصص</th>
                            {!isConstraintForCustomPlan && (
                              <th className="px-4 py-3 text-right text-xs font-black text-[#655ac1] w-[26%]">الحد اليومي</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-4 py-3 text-sm font-black text-slate-800 align-middle">{constraintSubject.name}</td>
                            <td className="px-4 py-3 text-sm font-bold text-slate-600 align-middle">
                              {isConstraintForCustomPlan ? constraintSubject.customPlanName : getGradeName(selectedPhase, selectedGrade)}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-black text-slate-700 align-middle">{constraintSubject.periodsPerClass || 0} حصة / أسبوعيًا</td>
                            {!isConstraintForCustomPlan && (
                              <td className="px-4 py-3 text-xs font-bold text-slate-600 leading-relaxed align-middle">{describeDistribution(constraintSubject.periodsPerClass || 0, weekDays)}</td>
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-white rounded-2xl border border-rose-100 p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-black text-slate-700 mb-4">
                        <Ban size={17} className="text-rose-500" />
                        الحصص المستثناة
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {periods.map(period => {
                          const isOn = constraint.excludedPeriods.includes(period);
                          return (
                            <button
                              key={period}
                              onClick={() => toggleInlinePeriod(constraintSubject.id, period, 'excludedPeriods')}
                              disabled={!setScheduleSettings}
                              className={`w-11 h-11 rounded-xl text-sm font-black border transition-all disabled:opacity-40 ${isOn ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200' : 'bg-white border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500'}`}
                            >
                              {period}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-black text-slate-700 mb-4">
                        <Star size={17} className="text-amber-500" />
                        الحصص المفضلة
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {periods.map(period => {
                          const isOn = constraint.preferredPeriods.includes(period);
                          return (
                            <button
                              key={period}
                              onClick={() => toggleInlinePeriod(constraintSubject.id, period, 'preferredPeriods')}
                              disabled={!setScheduleSettings}
                              className={`w-11 h-11 rounded-xl text-sm font-black border transition-all disabled:opacity-40 ${isOn ? 'bg-amber-400 border-amber-400 text-white shadow-md shadow-amber-200' : 'bg-white border-slate-200 text-slate-400 hover:border-amber-200 hover:text-amber-600'}`}
                            >
                              {period}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                            <Repeat size={17} className="text-[#655ac1]" />
                            تتابع الحصص
                          </div>
                          <p className="text-xs font-bold text-slate-400 mt-1">حصتان متتاليتان للمادة في نفس اليوم</p>
                        </div>
                        <button
                          onClick={() => updateSubjectConstraint(constraintSubject.id, { enableDoublePeriods: !constraint.enableDoublePeriods })}
                          disabled={!setScheduleSettings}
                          className={`w-14 h-8 rounded-full transition-all relative shadow-inner disabled:opacity-40 ${constraint.enableDoublePeriods ? 'bg-[#655ac1]' : 'bg-slate-200'}`}
                        >
                          <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${constraint.enableDoublePeriods ? 'right-1' : 'right-[calc(100%-1.75rem)]'}`} />
                        </button>
                      </div>
                    </div>
                    {!isConstraintForCustomPlan && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                            <Copy size={17} className="text-[#655ac1]" />
                            نسخ إعدادات المواد
                          </div>
                          <p className="text-xs font-bold text-slate-400 mt-1 leading-relaxed">
                            نسخ الحصص المستثناة والمفضلة لهذه المادة إلى الصفوف المحددة.
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setConstraintCopyGrades(constraintCopyTargets.map(target => String(target.grade)))}
                            disabled={constraintCopyTargets.length === 0}
                            className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-500 hover:border-[#3b2f90] hover:text-[#3b2f90] disabled:opacity-40"
                          >
                            تحديد الكل
                          </button>
                          <button
                            type="button"
                            onClick={applyConstraintCopy}
                            disabled={constraintCopyGrades.length === 0}
                            className={`px-4 py-2 rounded-xl text-white text-xs font-black transition-all disabled:bg-slate-300 ${
                              constraintCopyDone ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-[#655ac1] hover:bg-[#5046a0]'
                            }`}
                          >
                            {constraintCopyDone ? 'تم النسخ' : 'نسخ الإعدادات'}
                          </button>
                        </div>
                      </div>
                      {constraintCopyTargets.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs font-bold text-slate-400">
                          لا توجد صفوف أخرى تحتوي على نفس المادة ضمن الخطة المعتمدة.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {constraintCopyTargets.map(target => {
                            const checked = constraintCopyGrades.includes(String(target.grade));
                            return (
                              <button
                                key={target.grade}
                                type="button"
                                onClick={() => toggleConstraintCopyGrade(target.grade)}
                                className={`inline-flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-right text-xs font-black transition-all ${
                                  checked
                                    ? 'border-slate-300 text-[#655ac1] bg-white'
                                    : 'border-slate-300 text-slate-500 bg-white hover:border-[#655ac1]/40 hover:text-[#655ac1]'
                                }`}
                              >
                                <span>{target.label}</span>
                                <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all ${
                                  checked ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'
                                }`}>
                                  <Check size={10} strokeWidth={3} />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="p-5 border-t border-slate-200 bg-white flex justify-end">
              <button onClick={() => setConstraintSubjectId(null)} className="px-7 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

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
              onAddPlan={handleCreateCustomGradePlan}
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
            <div className="p-6 flex items-start gap-3">
              <Trash2 size={28} className="text-rose-500 mt-0.5" />
              <div>
                <h2 className="text-xl font-black text-slate-800 mb-2">حذف الخطة</h2>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  سيتم حذف خطة <span className="text-[#655ac1] font-black">"{deleteCustomPlanName}"</span> وجميع موادها. هل تريد المتابعة؟
                </p>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setDeleteCustomPlanName(null)}
                className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDeleteCustomPlan}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
              >
                حذف
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
