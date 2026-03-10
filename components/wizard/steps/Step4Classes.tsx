import React, { useState, useMemo, useCallback } from 'react';
import { Phase, ClassInfo, Subject, SchoolInfo, EntityType } from '../../../types';
import { PHASE_CONFIG } from '../../../constants';
import {
  GraduationCap, Trash2, CheckCircle2, BookPlus, X, School, PlusCircle,
  Zap, ChevronUp, ChevronDown, Pencil, Settings2, Printer, AlertTriangle,
  LayoutGrid, Hash, Check, Layers, Plus, Minus, Clock, BookOpen, Sparkles,
  ArrowUpDown, Trash, RotateCcw, FlaskConical, Dumbbell, Warehouse, Building2, Shuffle, Info
} from 'lucide-react';
import {
  calculateDistribution,
  generateClassroomsFromDistribution,
  getClassroomDisplayName,
  getNextSectionNumber,
  groupClassesByGrade,
  reorderClassroom,
  printClassrooms,
} from '../../../utils/classroomUtils';
import SchoolTabs from '../SchoolTabs';

interface Props {
  classes: ClassInfo[];
  setClasses: React.Dispatch<React.SetStateAction<ClassInfo[]>>;
  subjects: Subject[];
  gradeSubjectMap: Record<string, string[]>;
  setGradeSubjectMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
}

type CreationMode = 'auto' | 'manual';

const Step4Classes: React.FC<Props> = ({ classes, setClasses, subjects, gradeSubjectMap, setGradeSubjectMap, schoolInfo, setSchoolInfo }) => {
  // ─── Core State ───
  const [activeSchoolId, setActiveSchoolId] = useState<string>('main');
  const [activePhase, setActivePhase] = useState<Phase>(schoolInfo.phases?.[0] || Phase.ELEMENTARY);
  const [creationMode, setCreationMode] = useState<CreationMode>('auto');

  // ─── Auto Generation State ───
  const [totalClassrooms, setTotalClassrooms] = useState<string>('');
  const [manualDistribution, setManualDistribution] = useState<number[]>([]);
  const [showDistribution, setShowDistribution] = useState(false);
  const [isDistributionManual, setIsDistributionManual] = useState(false);

  // ─── Manual Entry State ───
  const [manualGrade, setManualGrade] = useState<number>(1);
  const [manualCustomName, setManualCustomName] = useState<string>('');

  // ─── Institute/Other Mode State ───
  const [instituteLevelsCount, setInstituteLevelsCount] = useState<string>('');
  const isSchool = !schoolInfo.entityType || schoolInfo.entityType === EntityType.SCHOOL;

  // ─── UI State ───
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [customPeriodClassId, setCustomPeriodClassId] = useState<string | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [editingSubjectsGrade, setEditingSubjectsGrade] = useState<number | null>(null);
  const [editingSubjectsClassId, setEditingSubjectsClassId] = useState<string | null>(null);
  const [bulkEditingPeriodsGrade, setBulkEditingPeriodsGrade] = useState<number | null>(null);
  const [bulkEditingRenameGrade, setBulkEditingRenameGrade] = useState<number | null>(null);
  const [bulkRenamePattern, setBulkRenamePattern] = useState<string>('');
  const [bulkPeriodCounts, setBulkPeriodCounts] = useState<Record<string, number>>({});
  const [tempClassNames, setTempClassNames] = useState<Record<string, string>>({});

  // ─── Dropdown Menu State ───
  const [gradeMenuOpenId, setGradeMenuOpenId] = useState<number | null>(null);
  const [classMenuOpenId, setClassMenuOpenId] = useState<string | null>(null);
  const [deleteConfirmClassId, setDeleteConfirmClassId] = useState<string | null>(null);
  
  // Custom/Other Classes
  const [showGlobalRenameModal, setShowGlobalRenameModal] = useState(false);
  const [showGlobalPeriodsModal, setShowGlobalPeriodsModal] = useState(false);

  // ─── View Mode State (Refactored) ───
  type ViewMode = 'classes' | 'facilities' | 'merge';
  const [viewMode, setViewMode] = useState<ViewMode>('classes');
  
  // Custom/Other Classes
  const [customClassName, setCustomClassName] = useState('');
  const [customClassCount, setCustomClassCount] = useState<number>(1);
  
  // Facilities
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState<'lab' | 'computer_lab' | 'gym' | 'playground' | 'other'>('lab');
  const [facilityLinkedSubject, setFacilityLinkedSubject] = useState<string>(''); // Subject ID
  const [facilityOtherType, setFacilityOtherType] = useState('');

  // Merging (Schools)
  const [mergedClassName, setMergedClassName] = useState('');
  const [selectedMergeClasses, setSelectedMergeClasses] = useState<Set<string>>(new Set());

  // ─── Custom/Institute Mode State ───
  const [customCategories, setCustomCategories] = useState<{id: number, name: string}[]>(
    schoolInfo.customCategories || [
      { id: 101, name: 'المستوى الأول' },
      { id: 102, name: 'المستوى الثاني' },
    ]
  );
  
  // Persist custom categories
  React.useEffect(() => {
    setSchoolInfo(prev => ({ ...prev, customCategories }));
  }, [customCategories, setSchoolInfo]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [tempCategoryName, setTempCategoryName] = useState('');
  const [customTotalUnits, setCustomTotalUnits] = useState('');
  const [customDistribution, setCustomDistribution] = useState<Record<number, number>>({});
  const [showCustomDistribution, setShowCustomDistribution] = useState(false);


  // ─── Derived Data ───
  // Sync activePhase with activeSchoolId
  React.useEffect(() => {
    if (activeSchoolId === 'main') {
      const phases = schoolInfo.phases || [];
      if (phases.length > 0 && !phases.includes(activePhase)) {
        setActivePhase(phases[0]);
      }
    } else {
      const shared = schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId);
      if (shared && shared.phases?.length > 0) {
        if (!shared.phases.includes(activePhase)) {
            setActivePhase(shared.phases[0]);
        }
      }
    }
  }, [activeSchoolId, schoolInfo, activePhase]);

  const hasSecond = schoolInfo.hasSecondSchool && (schoolInfo.secondSchoolPhases || [])[0];
  const totalGrades = PHASE_CONFIG[activePhase]?.grades || 3;

  const currentSchoolClasses = useMemo(() => {
    // If Merge View is active, return ALL classes regardless of school ID
    if (schoolInfo.mergeClassesView) {
        return classes
        .sort((a, b) => {
            if (a.grade !== b.grade) return a.grade - b.grade;
            return (a.sortOrder ?? a.section) - (b.sortOrder ?? b.section);
        });
    }

    return classes
      .filter(c => c.phase === activePhase && (c.schoolId || 'main') === activeSchoolId)
      .sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return (a.sortOrder ?? a.section) - (b.sortOrder ?? b.section);
      });
  }, [classes, activePhase, activeSchoolId, schoolInfo.mergeClassesView]);

  const grouped = useMemo(() => groupClassesByGrade(currentSchoolClasses), [currentSchoolClasses]);

  const currentTiming = useMemo(() => {
    if (activeSchoolId === 'main') return schoolInfo.timing;
    
    // For shared schools
    const sharedSchool = schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId);
    if (!sharedSchool) return schoolInfo.timing;

    const mode = schoolInfo.timing?.sharedSchoolMode || 'unified';
    if (mode === 'separate') {
        return sharedSchool.timing || schoolInfo.timing;
    }
    
    return schoolInfo.timing;
  }, [activeSchoolId, schoolInfo]);

  const activeDays = useMemo(() => {
    const timing = currentTiming;
    if (!timing) return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
    return timing.activeDays || ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
  }, [currentTiming]);

  const dayLabels: Record<string, string> = {
    sunday: 'الأحد',
    monday: 'الاثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
  };

  // ─── Custom Grade Names (for KG/Other) ───
  const gradeDisplayNames = useMemo(() => {
    const names: Record<number, string> = {};
    subjects.forEach(sub => {
      if (sub.phases.includes(activePhase) && sub.targetGradeNames && sub.targetGrades) {
         sub.targetGrades.forEach((grade, idx) => {
           if (sub.targetGradeNames![idx]) {
             names[grade] = sub.targetGradeNames![idx];
           }
         });
      }
    });
    return names;
  }, [subjects, activePhase]);

  const getGradeLabel = (grade: number) => gradeDisplayNames[grade] || `الصف ${grade}`;

  // ─── Auto Generation Handlers ───
  const handleCalculateDistribution = useCallback(() => {
    const total = parseInt(totalClassrooms);
    if (!total || total <= 0) return;

    const { distribution, hasRemainder } = calculateDistribution(total, totalGrades);
    setManualDistribution(distribution);
    setShowDistribution(true);
    setIsDistributionManual(hasRemainder);
  }, [totalClassrooms, totalGrades]);

  const handleDistributionChange = useCallback((gradeIndex: number, value: number) => {
    setManualDistribution(prev => {
      const updated = [...prev];
      updated[gradeIndex] = Math.max(0, value);
      return updated;
    });
    setIsDistributionManual(true);
  }, []);

  const distributionTotal = useMemo(() => manualDistribution.reduce((a, b) => a + b, 0), [manualDistribution]);

  const handleGenerateFromDistribution = useCallback(() => {
    const newClassrooms = generateClassroomsFromDistribution(
      manualDistribution,
      activePhase,
      gradeSubjectMap,
      activeSchoolId
    );

    setClasses(prev => {
      // Remove existing classrooms for this phase/school
      const other = prev.filter(c =>
        !(c.phase === activePhase && (c.schoolId || 'main') === activeSchoolId)
      );
      return [...other, ...newClassrooms];
    });

    setShowDistribution(false);
    setTotalClassrooms('');
    setInstituteLevelsCount(''); // Reset institute input
    setManualDistribution([]);
  }, [manualDistribution, activePhase, gradeSubjectMap, activeSchoolId, setClasses]);

  // ─── Institute Logic ───
  const handleInstituteLevelsChange = useCallback((value: string) => {
    setInstituteLevelsCount(value);
    const count = parseInt(value);
    if (!isNaN(count) && count > 0) {
       // Reset distribution to zeros for the new number of levels
       setManualDistribution(new Array(count).fill(0));
       setShowDistribution(true);
       setIsDistributionManual(true);
    } else {
       setShowDistribution(false);
       setManualDistribution([]);
    }
  }, []);

  // ─── Manual Entry Handlers ───
  const handleManualAdd = useCallback((gradeOverride?: number) => {
    const targetGrade = gradeOverride ?? manualGrade;
    const nextSection = getNextSectionNumber(classes, activePhase, targetGrade, activeSchoolId);
    const subjectIds = gradeSubjectMap[`${activePhase}-${targetGrade}`] || [];

    const newClass: ClassInfo = {
      id: `${activeSchoolId}-${activePhase}-${targetGrade}-${nextSection}-${Date.now()}`,
      phase: activePhase,
      grade: targetGrade,
      section: nextSection,
      name: manualCustomName.trim() || undefined,
      subjectIds: [...subjectIds],
      schoolId: activeSchoolId,
      sortOrder: nextSection,
      isManuallyCreated: true,
      createdAt: new Date().toISOString(),
    };

    setClasses(prev => [...prev, newClass]);
    setManualCustomName('');
  }, [classes, activePhase, manualGrade, activeSchoolId, manualCustomName, gradeSubjectMap, setClasses]);

  // ─── Edit & Delete Handlers ───
  const handleStartEdit = useCallback((c: ClassInfo) => {
    setEditingClassId(c.id);
    setEditName(c.name || getClassroomDisplayName(c));
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingClassId) return;
    setClasses(prev => prev.map(c =>
      c.id === editingClassId ? { ...c, name: editName.trim() || undefined } : c
    ));
    setEditingClassId(null);
    setEditName('');
  }, [editingClassId, editName, setClasses]);

  const handleDeleteOne = useCallback((id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    setSelectedClasses(prev => {
      const ns = new Set(prev);
      ns.delete(id);
      return ns;
    });
  }, [setClasses]);

  const handleBulkDelete = useCallback(() => {
    setClasses(prev => prev.filter(c => !selectedClasses.has(c.id)));
    setSelectedClasses(new Set());
    setShowBulkDeleteConfirm(false);
  }, [selectedClasses, setClasses]);

  const handleDeleteAll = useCallback(() => {
    setClasses(prev => prev.filter(c =>
      !(c.phase === activePhase && (c.schoolId || 'main') === activeSchoolId)
    ));
    setSelectedClasses(new Set());
    setShowDeleteAllConfirm(false);
  }, [activePhase, activeSchoolId, setClasses]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedClasses(prev => {
      const ns = new Set(prev);
      if (ns.has(id)) ns.delete(id);
      else ns.add(id);
      return ns;
    });
  }, []);

  const selectAllInGrade = useCallback((grade: number) => {
    const gradeClasses = currentSchoolClasses.filter(c => c.grade === grade);
    const allSelected = gradeClasses.every(c => selectedClasses.has(c.id));
    setSelectedClasses(prev => {
      const ns = new Set(prev);
      gradeClasses.forEach(c => {
        if (allSelected) ns.delete(c.id);
        else ns.add(c.id);
      });
      return ns;
    });
  }, [currentSchoolClasses, selectedClasses]);

  // ─── Reorder ───
  const handleReorder = useCallback((classId: string, direction: 'up' | 'down') => {
    setClasses(prev => reorderClassroom(prev, classId, direction));
  }, [setClasses]);

  // ─── Custom Period Counts ───
  const handleCustomPeriodChange = useCallback((classId: string, day: string, value: number) => {
    setClasses(prev => prev.map(c => {
      if (c.id !== classId) return c;
      const existing = c.customPeriodCounts || {};
      return {
        ...c,
        customPeriodCounts: { ...existing, [day]: Math.max(0, value) }
      };
    }));
  }, [setClasses]);

  const handleResetCustomPeriods = useCallback((classId: string) => {
    setClasses(prev => prev.map(c => {
      if (c.id !== classId) return c;
      return { ...c, customPeriodCounts: undefined };
    }));
    setCustomPeriodClassId(null);
  }, [setClasses]);

  // ─── Subject Toggling ───
  const toggleSubjectForGrade = useCallback((grade: number, subId: string) => {
    const key = `${activePhase}-${grade}`;
    const current = gradeSubjectMap[key] || [];
    const updated = current.includes(subId) ? current.filter(id => id !== subId) : [...current, subId];
    setGradeSubjectMap(prev => ({ ...prev, [key]: updated }));

    // Also update existing classes for this grade
    setClasses(prev => prev.map(c => {
      if (c.phase === activePhase && c.grade === grade && (c.schoolId || 'main') === activeSchoolId) {
        return { ...c, subjectIds: updated };
      }
      return c;
    }));
  }, [activePhase, activeSchoolId, gradeSubjectMap, setGradeSubjectMap, setClasses]);

  // ─── Bulk Grade Handlers ───
  const handleBulkRename = useCallback((grade: number) => {
     setClasses(prev => prev.map(c => {
       if (c.grade !== grade || c.phase !== activePhase || (c.schoolId || 'main') !== activeSchoolId) return c;
       const newName = tempClassNames[c.id];
       return newName ? { ...c, name: newName.trim() || undefined } : c;
     }));
     setBulkEditingRenameGrade(null);
     setTempClassNames({});
   }, [tempClassNames, activePhase, activeSchoolId, setClasses]);

  const handleBulkPeriods = useCallback((grade: number) => {
    setClasses(prev => prev.map(c => {
      if (c.phase === activePhase && c.grade === grade && (c.schoolId || 'main') === activeSchoolId) {
        return { ...c, customPeriodCounts: { ...bulkPeriodCounts } };
      }
      return c;
    }));
    setBulkEditingPeriodsGrade(null);
    setBulkPeriodCounts({});
  }, [activePhase, activeSchoolId, bulkPeriodCounts, setClasses]);

  // ─── Print ───
  const handlePrint = useCallback(() => {
    printClassrooms(classes, schoolInfo, activeSchoolId);
  }, [classes, schoolInfo, activeSchoolId]);

  // ══════════════════════════════════════════════════════
  //   R E N D E R
  // ══════════════════════════════════════════════════════

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">

      {/* ══════ Header ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>
          
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-[#e5e1fe] text-[#655ac1] rounded-xl"><LayoutGrid size={24} /></div>
             الفصول الدراسية
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إنشاء وإدارة الفصول الدراسية</p>
      </div>

      {/* ══════ Action Button Bar ══════ */}
      <div className="space-y-4 mb-6">
          <div className="flex flex-col gap-4">
              {/* School Tabs */}
              <SchoolTabs
                 schoolInfo={schoolInfo}
                 activeSchoolId={viewMode === 'classes' ? activeSchoolId : ''}
                 onTabChange={(id) => {
                   setActiveSchoolId(id);
                   setViewMode('classes');
                 }}
              />

              <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setViewMode('classes')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 ${
                        viewMode === 'classes'
                        ? 'bg-[#655ac1] text-white shadow-lg shadow-[#655ac1]/20'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-[#8779fb]'
                    }`}
                  >
                    <Plus size={20} className={viewMode === 'classes' ? 'text-white' : 'text-[#8779fb]'} />
                    إنشاء الفصول
                  </button>

                  <button
                    onClick={() => setViewMode('facilities')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 ${
                        viewMode === 'facilities'
                        ? 'bg-[#655ac1] text-white shadow-lg shadow-[#655ac1]/20'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-[#8779fb]'
                    }`}
                  >
                    <FlaskConical size={20} className={viewMode === 'facilities' ? 'text-white' : 'text-[#8779fb]'} />
                    إضافة معامل ومرافق
                  </button>

                  <button
                    onClick={() => setViewMode('merge')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 ${
                        viewMode === 'merge'
                        ? 'bg-[#655ac1] text-white shadow-lg shadow-[#655ac1]/20'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-[#8779fb]'
                    }`}
                  >
                    <Shuffle size={20} className={viewMode === 'merge' ? 'text-white' : 'text-[#8779fb]'} />
                    دمج الفصول (للمشتركة)
                  </button>


              </div>
          </div>

          {viewMode === 'facilities' && (
              <div className="bg-[#f8f7ff] border border-[#e5e1fe] p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 bg-[#e5e1fe] text-[#655ac1] rounded-lg mt-0.5">
                      <Info size={16} />
                  </div>
                  <div className="text-sm font-bold text-slate-600 leading-relaxed space-y-2">
                      <p className="text-[#655ac1] mb-1">توضيح :</p>
                      <ul className="space-y-1 pr-4 list-disc marker:text-[#655ac1]">
                          <li>إضافة مرفق يعادل إضافة فصل.</li>
                          <li>يمكن حجز المرفق لمادة أومعلم.</li>
                          <li><span className="text-[#655ac1]">الهدف :</span> عدم حدوث تعارض في تواجد عدة فصول بنفس الوقت في مكان واحد مثل مادة (التربية البدنية)</li>
                      </ul>
                  </div>
              </div>
          )}

          {/* Phase Selector (if multi-phase) */}
          {(() => {
              const currentPhases = activeSchoolId === 'main' 
              ? schoolInfo.phases || [] 
              : (schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId)?.phases || []);
              
              if (currentPhases.length <= 1) return null;

              return (
              <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in slide-in-from-left-2">
                  {currentPhases.map(p => (
                  <button
                      key={p}
                      onClick={() => setActivePhase(p)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      activePhase === p
                          ? 'bg-[#8779fb] border-[#8779fb] text-white shadow-md'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                  >
                      {p === Phase.OTHER && (activeSchoolId === 'main' ? schoolInfo.otherPhase : schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId)?.otherPhase) 
                      ? (activeSchoolId === 'main' ? schoolInfo.otherPhase : schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId)?.otherPhase) 
                      : p}
                  </button>
                  ))}
              </div>
              );
          })()}
      </div>

      {/* ══════ Classes View ══════ */}
      {viewMode === 'classes' && (
        <>

          {/* Auto Generation Section */}
          {currentSchoolClasses.length === 0 && (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-indigo-50/50 overflow-hidden mb-8">
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-[#e5e1fe] text-[#655ac1] rounded-lg">
            <Zap size={18} />
          </div>
          <span className="font-black text-slate-700 text-sm">عملية الإنشاء التلقائي</span>
        </div>

        {/* ── Auto Mode Content ── */}
        {creationMode === 'auto' && (
          <div className="p-8 space-y-6">
            {/* Conditional Input based on Entity Type */}
            {isSchool ? (
                /* School Mode: Total Classes -> Auto Distribute */
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-black text-slate-500 mr-1 flex items-center gap-1.5">
                       <Hash size={14} /> إجمالي عدد الفصول المطلوبة
                    </label>
                    <input
                      type="number"
                      value={totalClassrooms}
                      onChange={e => setTotalClassrooms(e.target.value)}
                      placeholder="مثال: 18"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black focus:bg-white focus:border-[#655ac1] focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                    />
                  </div>
                  <button
                    onClick={handleCalculateDistribution}
                    disabled={!totalClassrooms || parseInt(totalClassrooms) <= 0}
                    className="group px-10 py-4 bg-[#655ac1] text-white font-black rounded-2xl hover:bg-[#5046a0] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-1 transition-all flex items-center gap-3"
                  >
                    <Sparkles size={20} className="group-hover:animate-pulse" />
                    توزيع
                  </button>
                </div>
            ) : (
                /* Institute/Other Mode: Number of Levels -> Manual Input */
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-black text-slate-500 mr-1 flex items-center gap-1.5">
                       <Layers size={14} /> عدد المستويات / الصفوف
                    </label>
                    <input
                      type="number"
                      value={instituteLevelsCount}
                      onChange={e => handleInstituteLevelsChange(e.target.value)}
                      placeholder="مثال: 4"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black focus:bg-white focus:border-[#655ac1] focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                    />
                  </div>
                  {/* No button needed here, it updates instantly */}
                </div>
            )}

            {/* Distribution Table UI */}
            {showDistribution && (
              <div className="space-y-4 pt-4 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-2 text-[#655ac1] mb-2">
                   <ArrowUpDown size={18} />
                   <h4 className="text-sm font-black">مقترح توزيع الفصول على الصفوف</h4>
                </div>
                
                <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-2 overflow-hidden">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-3">{isSchool ? 'الصف' : 'المستوى'}</th>
                        <th className="px-4 py-3 text-center">عدد الفصول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.from({ length: isSchool ? totalGrades : (parseInt(instituteLevelsCount) || 0) }, (_, i) => i + 1).map((grade, idx) => (
                        <tr key={grade} className="group hover:bg-white transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-600 group-hover:border-[#655ac1] group-hover:text-[#655ac1] transition-all">
                                {grade}
                              </div>
                              <span className="text-sm font-bold text-slate-700">{getGradeLabel(grade)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl p-1 w-32 mx-auto shadow-sm">
                              <button
                                onClick={() => handleDistributionChange(idx, (manualDistribution[idx] || 0) - 1)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="flex-1 text-center font-black text-sm text-slate-800">
                                {manualDistribution[idx] || 0}
                              </span>
                              <button
                                onClick={() => handleDistributionChange(idx, (manualDistribution[idx] || 0) + 1)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 transition-all"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/50 font-black text-[#655ac1]">
                        <td className="px-4 py-4 text-sm">الإجمالي الموزع</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`text-xl font-black ${(isSchool ? distributionTotal === parseInt(totalClassrooms) : true) ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {distributionTotal}
                            </span>
                            {isSchool && distributionTotal !== parseInt(totalClassrooms) && (
                              <span className="text-xs text-rose-400">(المطلوب: {totalClassrooms})</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleGenerateFromDistribution}
                    className="px-6 py-3 bg-emerald-500 text-white font-black text-sm rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 size={18} /> إنشاء الفصول
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* ══════ Approved Classrooms Display ══════ */}
      {currentSchoolClasses.length > 0 && (
        <div className="space-y-6">

          {/* Section Header + Bulk Actions */}
          <div className="flex flex-col gap-4">
              {/* Header Card */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-[#655ac1]"></div>
                
                <div className="flex items-center gap-4 z-10">
                    <div className="w-12 h-12 bg-[#e5e1fe] text-[#655ac1] rounded-2xl flex items-center justify-center shadow-inner">
                        <LayoutGrid size={24} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 text-lg">
                        الفصول المعتمدة <span className="text-[#655ac1] text-sm font-bold bg-[#f8f7ff] px-2 py-0.5 rounded-lg border border-[#e5e1fe] mx-2">{activePhase}</span>
                        </h3>
                        <p className="text-xs text-slate-400 font-bold mt-1">إدارة وتخصيص الفصول الدراسية للمدرسة</p>
                    </div>
                </div>

                {/* Enhanced Stats Display */}
                <div className="flex items-center gap-3 bg-[#f8f7ff] px-5 py-3 rounded-2xl border border-[#e5e1fe] mt-4 md:mt-0 shadow-sm">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">إجمالي الفصول</p>
                        <p className="text-2xl font-black text-[#655ac1] leading-none">{currentSchoolClasses.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#655ac1] shadow-sm border border-[#e5e1fe]">
                        <Hash size={20} />
                    </div>
                </div>
              </div>

              {/* Global Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-2">
                {/* Right group: edit actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                     onClick={() => setShowGlobalRenameModal(true)}
                     className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all shadow-sm"
                  >
                     <Pencil size={15} /> تعديل مسمى الكل
                  </button>
                  <button
                     onClick={() => setShowGlobalPeriodsModal(true)}
                     className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all shadow-sm"
                  >
                     <Clock size={15} /> تخصيص حصص الكل
                  </button>
                </div>

                {/* Left group: print & delete */}
                <div className="flex items-center gap-2">
                  <button
                     onClick={handlePrint}
                     className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all shadow-sm"
                  >
                     <Printer size={15} className="text-[#655ac1]" /> طباعة الفصول
                  </button>
                  <button
                     onClick={() => setShowDeleteAllConfirm(true)}
                     className="flex items-center gap-2 px-4 py-2.5 bg-white border border-rose-200 text-rose-500 rounded-xl text-xs font-black hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                  >
                     <Trash size={15} /> حذف الكل
                  </button>
                </div>
              </div>
          </div>


          {/* Bulk Delete Confirmation */}
          {showBulkDeleteConfirm && (
            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl animate-in zoom-in-95 duration-200">
              <AlertTriangle size={20} className="text-rose-500" />
              <span className="text-sm font-bold text-rose-700 flex-1">
                هل أنت متأكد من حذف {selectedClasses.size} فصل؟
              </span>
              <button onClick={handleBulkDelete} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition-all">
                نعم، احذف
              </button>
              <button onClick={() => setShowBulkDeleteConfirm(false)} className="px-4 py-2 bg-white border border-rose-200 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all">
                إلغاء
              </button>
            </div>
          )}

          {/* Delete All Confirmation */}
          {showDeleteAllConfirm && (
            <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-2xl animate-in zoom-in-95 duration-200">
              <AlertTriangle size={20} className="text-orange-500" />
              <span className="text-sm font-bold text-orange-700 flex-1">
                سيتم حذف جميع فصول مدرسة "{activeSchoolId === 'main' ? schoolInfo.schoolName : schoolInfo.sharedSchools?.find(s=>s.id === activeSchoolId)?.name}" في مرحلة "{activePhase}". هل أنت متأكد؟
              </span>
              <button onClick={handleDeleteAll} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition-all">
                نعم، احذف الكل
              </button>
              <button onClick={() => setShowDeleteAllConfirm(false)} className="px-4 py-2 bg-white border border-orange-200 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all">
                إلغاء
              </button>
            </div>
          )}

          {/* ── Table Results ── */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-indigo-50/20">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gradient-to-l from-[#f0eeff] to-[#f8f7ff] border-b-2 border-[#e5e1fe]">
                  <th className="px-6 py-5 w-12 text-center">
                    <span className="text-xs font-black text-[#655ac1]/60 uppercase tracking-wider">#</span>
                  </th>
                  <th className="px-6 py-5">
                    <span className="text-sm font-black text-slate-700">اسم الفصل</span>
                  </th>
                  <th className="px-6 py-5 text-center">
                    <span className="text-sm font-black text-slate-700">المواد المحددة</span>
                  </th>
                  <th className="px-6 py-5 text-center">
                    <span className="text-sm font-black text-slate-700">عدد الحصص الأسبوعية</span>
                  </th>
                  <th className="px-6 py-5 text-center">
                    <span className="text-sm font-black text-slate-700">الخيارات</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(grouped).map(Number).sort((a, b) => a - b).map(grade => {
                  const gradeClasses = grouped[grade];
                  const gradeKey = `${activePhase}-${grade}`;
                  const allSelected = gradeClasses.every(c => selectedClasses.has(c.id));

                   return (
                    <React.Fragment key={grade}>
                      {/* Grade Group Header */}
                       <tr className="bg-slate-50/70">
                         <td colSpan={5} className="px-6 py-3 border-y border-slate-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <label className="cursor-pointer" onClick={() => selectAllInGrade(grade)}>
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${allSelected ? 'bg-[#655ac1] border-[#655ac1]' : 'border-slate-300 hover:border-[#655ac1]'}`}>
                                    {allSelected && <Check size={12} className="text-white" />}
                                  </div>
                                </label>
                                <div className="w-9 h-9 bg-[#e5e1fe] rounded-lg flex items-center justify-center text-[#655ac1] font-black text-sm">
                                  {grade}
                                </div>
                                <span className="font-black text-[#655ac1] text-base">{getGradeLabel(grade)}</span>
                                <span className="text-xs bg-white border border-slate-200 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                                  {gradeClasses.length} فصل
                                </span>
                              </div>

                               <div className="relative flex items-center gap-2">
                                 <button
                                   onClick={() => setGradeMenuOpenId(gradeMenuOpenId === grade ? null : grade)}
                                   className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-l from-[#655ac1] to-[#8779fb] rounded-xl text-xs font-black text-white hover:from-[#5046a0] hover:to-[#655ac1] transition-all shadow-md shadow-indigo-200"
                                 >
                                   خيارات الصف <ChevronDown size={13} className={`transition-transform duration-200 ${gradeMenuOpenId === grade ? 'rotate-180' : ''}`} />
                                 </button>
                                 {gradeMenuOpenId === grade && (
                                   <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in zoom-in-95 duration-150">
                                     <button
                                       onClick={() => { handleManualAdd(grade); setGradeMenuOpenId(null); }}
                                       className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-[#f8f7ff] hover:text-[#655ac1] transition-colors"
                                     >
                                       <Plus size={14} /> إضافة فصل
                                     </button>
                                     <button
                                       onClick={() => { setEditingSubjectsGrade(editingSubjectsGrade === grade ? null : grade); setGradeMenuOpenId(null); }}
                                       className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold transition-colors ${editingSubjectsGrade === grade ? 'bg-[#e5e1fe] text-[#655ac1]' : 'text-slate-600 hover:bg-[#f8f7ff] hover:text-[#655ac1]'}`}
                                     >
                                       <BookOpen size={14} /> تخصيص المواد
                                     </button>
                                     <button
                                       onClick={() => { setBulkEditingPeriodsGrade(bulkEditingPeriodsGrade === grade ? null : grade); setGradeMenuOpenId(null); }}
                                       className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold transition-colors ${bulkEditingPeriodsGrade === grade ? 'bg-[#e5e1fe] text-[#655ac1]' : 'text-slate-600 hover:bg-[#f8f7ff] hover:text-[#655ac1]'}`}
                                     >
                                       <Clock size={14} /> تخصيص الحصص
                                     </button>
                                     <button
                                       onClick={() => {
                                         if (bulkEditingRenameGrade === grade) {
                                           setBulkEditingRenameGrade(null);
                                           setTempClassNames({});
                                         } else {
                                           setBulkEditingRenameGrade(grade);
                                           const initials: Record<string, string> = {};
                                           gradeClasses.forEach(c => initials[c.id] = c.name || getClassroomDisplayName(c));
                                           setTempClassNames(initials);
                                         }
                                         setGradeMenuOpenId(null);
                                       }}
                                       className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold transition-colors ${bulkEditingRenameGrade === grade ? 'bg-[#e5e1fe] text-[#655ac1]' : 'text-slate-600 hover:bg-[#f8f7ff] hover:text-[#655ac1]'}`}
                                     >
                                       <Pencil size={14} /> تعديل المسميات
                                     </button>
                                   </div>
                                 )}
                               </div>
                           </div>

                             {/* Bulk Subject Editor - Removed Inline, now handled by Modal at bottom */ }

                             {/* Bulk Rename Panel - Inline Edit */}
                             {bulkEditingRenameGrade === grade && (
                               <div className="mt-4 p-6 bg-[#f8f7ff] border border-[#e5e1fe] rounded-2xl shadow-inner animate-in slide-in-from-top-2">
                                 <div className="flex justify-between items-center mb-4">
                                   <div className="flex items-center gap-2">
                                     <Sparkles size={16} className="text-[#655ac1]" />
                                     <p className="text-[11px] font-extrabold text-[#655ac1]">تعديل مسميات فصل {getGradeLabel(grade)}:</p>
                                   </div>
                                   <button onClick={() => { setBulkEditingRenameGrade(null); setTempClassNames({}); }} className="text-slate-300 hover:text-rose-500 transition-colors">
                                     <X size={16} />
                                   </button>
                                 </div>
                                 
                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                   {gradeClasses.map((c, idx) => (
                                     <div key={c.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                                       <span className="w-6 h-6 flex items-center justify-center bg-slate-50 text-slate-400 text-[10px] font-black rounded-lg">{idx + 1}</span>
                                       <input
                                         type="text"
                                         value={tempClassNames[c.id] || ''}
                                         onChange={e => setTempClassNames(prev => ({ ...prev, [c.id]: e.target.value }))}
                                         className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-700 placeholder:text-slate-300"
                                         placeholder="اسم الفصل..."
                                       />
                                     </div>
                                   ))}
                                 </div>
                                 
                                 <div className="mt-6 flex justify-end">
                                   <button
                                     onClick={() => handleBulkRename(grade)}
                                     className="px-8 py-2.5 bg-[#655ac1] text-white rounded-xl text-xs font-black hover:bg-[#5046a0] transition-all shadow-lg shadow-indigo-200 active:scale-95"
                                   >
                                     حفظ التعديلات
                                   </button>
                                 </div>
                               </div>
                             )}

                             {/* Bulk Periods Panel - Redesigned to match Step2Timing */}
                             {bulkEditingPeriodsGrade === grade && (
                               <div className="mt-4 p-6 bg-[#f8f7ff] border border-[#e5e1fe] rounded-2xl shadow-inner animate-in slide-in-from-top-2">
                                 <div className="flex justify-between items-center mb-6">
                                   <div className="flex items-center gap-2">
                                     <Clock size={16} className="text-[#655ac1]" />
                                     <p className="text-[11px] font-extrabold text-[#655ac1]">تخصيص الحصص لجميع فصول {getGradeLabel(grade)}:</p>
                                   </div>
                                   <button onClick={() => setBulkEditingPeriodsGrade(null)} className="text-slate-300 hover:text-rose-500 transition-colors"><X size={16} /></button>
                                 </div>
                                 
                                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                   {activeDays.map(day => {
                                     const defaultCount = currentTiming?.periodCounts?.[day] ?? 7;
                                     const count = bulkPeriodCounts[day] ?? defaultCount;
                                     
                                     return (
                                       <div key={day} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 relative group hover:border-[#655ac1]/30 transition-all">
                                         <span className="text-[10px] font-black text-[#655ac1]">{dayLabels[day.toLowerCase()] || day}</span>
                                         <div className="flex items-center gap-3">
                                           <button 
                                             onClick={() => setBulkPeriodCounts(prev => ({ ...prev, [day]: Math.max(0, count - 1) }))}
                                             className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all font-bold"
                                           >
                                             -
                                           </button>
                                           <span className="text-lg font-black text-slate-800 w-6 text-center">{count}</span>
                                           <button 
                                             onClick={() => setBulkPeriodCounts(prev => ({ ...prev, [day]: Math.min(12, count + 1) }))}
                                             className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-[#655ac1] hover:border-[#e5e1fe] transition-all font-bold"
                                           >
                                             +
                                           </button>
                                         </div>
                                       </div>
                                     );
                                   })}
                                 </div>
                                 <div className="mt-6 flex justify-end">
                                   <button
                                     onClick={() => handleBulkPeriods(grade)}
                                     className="px-8 py-2.5 bg-[#655ac1] text-white rounded-xl text-xs font-black hover:bg-[#5046a0] transition-all shadow-lg shadow-indigo-100 active:scale-95"
                                   >
                                     تطبيق الحصص على الكل
                                   </button>
                                 </div>
                               </div>
                             )}
                        </td>
                      </tr>

                      {/* Class Rows */}
                      {gradeClasses.map((c, idx) => {
                        const isSelected = selectedClasses.has(c.id);
                        const isEditing = editingClassId === c.id;
                        const hasCustomPeriods = c.customPeriodCounts && Object.keys(c.customPeriodCounts).length > 0;
                        const displayName = getClassroomDisplayName(c);

                        return (
                          <tr key={c.id} className={`group border-b border-slate-50 last:border-0 hover:bg-[#f8f7ff]/50 transition-colors ${isSelected ? 'bg-[#e5e1fe]/10' : ''}`}>
                            <td className="px-6 py-4">
                              <div onClick={() => toggleSelect(c.id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-[#655ac1] border-[#655ac1]' : 'border-slate-200 group-hover:border-[#8779fb]'}`}>
                                {isSelected && <Check size={12} className="text-white" />}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                               {isEditing ? (
                                 <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={editName}
                                      onChange={e => setEditName(e.target.value)}
                                      className="w-full max-w-[150px] p-2 bg-white border border-[#655ac1] rounded-lg text-xs font-black outline-none"
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') { setEditingClassId(null); setEditName(''); }
                                      }}
                                    />
                                    <button onClick={handleSaveEdit} className="p-2 bg-[#655ac1] text-white rounded-lg hover:bg-indigo-700 font-bold text-[10px]">حفظ</button>
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-2">
                                   <span className="font-black text-slate-700 text-sm tracking-wide" dir="ltr">{displayName}</span>
                                   {c.isManuallyCreated && <span className="text-[8px] px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded font-bold">يدوي</span>}
                                 </div>
                               )}
                            </td>
                            <td className="px-6 py-4 text-center">
                               <div className="flex items-center justify-center gap-1.5">
                                  <span className="text-sm font-black text-slate-700">{(c.subjectIds || []).length}</span>
                                  <span className="text-xs font-bold text-slate-400">مادة</span>
                               </div>
                            </td>
                             <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-xs font-bold text-slate-500">
                                    {hasCustomPeriods ? 'مخصص' : (currentTiming?.periodCounts?.['sunday'] ?? 7)} حصص
                                  </span>
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                 <div className="flex items-center justify-center gap-2 relative">
                                   {/* Actions Dropdown */}
                                   <div className="relative">
                                     <button
                                       onClick={() => setClassMenuOpenId(classMenuOpenId === c.id ? null : c.id)}
                                       className="flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-[#655ac1] rounded-xl text-xs font-black text-[#655ac1] hover:bg-[#655ac1] hover:text-white transition-all shadow-sm"
                                     >
                                       خيارات الفصل <ChevronDown size={13} className={`transition-transform duration-200 ${classMenuOpenId === c.id ? 'rotate-180' : ''}`} />
                                     </button>
                                     {classMenuOpenId === c.id && (
                                       <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in zoom-in-95 duration-150">
                                         <button
                                           onClick={() => { setEditingSubjectsClassId(editingSubjectsClassId === c.id ? null : c.id); setCustomPeriodClassId(null); setClassMenuOpenId(null); }}
                                           className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold transition-colors ${(c.subjectIds && c.subjectIds.length > 0) ? 'bg-[#f8f7ff] text-[#655ac1]' : 'text-slate-600 hover:bg-[#f8f7ff] hover:text-[#655ac1]'}`}
                                         >
                                           <BookOpen size={14} /> تخصيص المواد
                                         </button>
                                         <button
                                           onClick={() => { setCustomPeriodClassId(customPeriodClassId === c.id ? null : c.id); setEditingSubjectsClassId(null); setClassMenuOpenId(null); }}
                                           className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold transition-colors ${hasCustomPeriods ? 'bg-[#f8f7ff] text-[#655ac1]' : 'text-slate-600 hover:bg-[#f8f7ff] hover:text-[#655ac1]'}`}
                                         >
                                           <Clock size={14} /> تخصيص الحصص
                                         </button>
                                         <button
                                           onClick={() => { handleStartEdit(c); setClassMenuOpenId(null); }}
                                           className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-[#f8f7ff] hover:text-[#655ac1] transition-colors"
                                         >
                                           <Pencil size={14} /> تعديل الاسم
                                         </button>
                                         <div className="border-t border-slate-100 mx-3" />
                                         <button
                                           onClick={() => { setDeleteConfirmClassId(c.id); setClassMenuOpenId(null); }}
                                           className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors"
                                         >
                                           <Trash2 size={14} /> حذف الفصل
                                         </button>
                                       </div>
                                     )}
                                   </div>
                                   
                                   {/* Inline Custom Period Panel */}
                                   {customPeriodClassId === c.id && (
                                     <div className="absolute z-40 mt-12 p-6 bg-white border border-[#e5e1fe] rounded-3xl shadow-2xl w-[400px] animate-in zoom-in-95 left-0 origin-top-left">
                                       <div className="flex justify-between items-center mb-5">
                                         <div className="flex items-center gap-3">
                                           <div className="w-10 h-10 bg-[#f8f7ff] text-[#655ac1] rounded-xl flex items-center justify-center border border-[#e5e1fe]">
                                              <Clock size={20} />
                                           </div>
                                           <div>
                                             <p className="text-[12px] font-black text-slate-800">تخصيص الحصص</p>
                                             <p className="text-[10px] text-slate-400 font-bold">{displayName}</p>
                                           </div>
                                         </div>
                                         <button onClick={() => setCustomPeriodClassId(null)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><X size={18} /></button>
                                       </div>
                                       
                                       <div className="grid grid-cols-2 gap-3 mb-5">
                                         {activeDays.map(day => {
                                           const defaultCount = currentTiming?.periodCounts?.[day] ?? 7;
                                           const customCount = c.customPeriodCounts?.[day];
                                           const count = customCount ?? defaultCount;
                                           const isCustom = customCount !== undefined && customCount !== defaultCount;
                                           
                                           return (
                                             <div key={day} className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${isCustom ? 'bg-[#f8f7ff] border-[#655ac1] shadow-sm' : 'bg-slate-50 border-slate-100 opacity-80'}`}>
                                               <span className={`text-[11px] font-black ${isCustom ? 'text-[#655ac1]' : 'text-slate-400'}`}>{dayLabels[day.toLowerCase()] || day}</span>
                                               <div className="flex items-center gap-3">
                                                  <button 
                                                    onClick={() => handleCustomPeriodChange(c.id, day, count - 1)}
                                                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all font-bold"
                                                  >
                                                    -
                                                  </button>
                                                  <span className={`text-lg font-black w-6 text-center ${isCustom ? 'text-[#655ac1]' : 'text-slate-700'}`}>{count}</span>
                                                  <button 
                                                    onClick={() => handleCustomPeriodChange(c.id, day, count + 1)}
                                                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#655ac1] hover:border-[#e5e1fe] transition-all font-bold"
                                                  >
                                                    +
                                                  </button>
                                               </div>
                                             </div>
                                           );
                                         })}
                                       </div>
                                       
                                       <button 
                                          onClick={() => handleResetCustomPeriods(c.id)} 
                                          className="w-full py-3 bg-slate-50 text-slate-500 text-[11px] font-black rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-100 flex items-center justify-center gap-2"
                                       >
                                          <RotateCcw size={14} /> إعادة تعيين للجدول الافتراضي
                                       </button>
                                     </div>
                                   )}
                                   
                                   <div className="flex flex-col gap-0.5">
                                     <button
                                       onClick={() => handleReorder(c.id, 'up')}
                                       disabled={idx === 0}
                                       className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-t-lg text-slate-400 hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                                       title="تحريك لأعلى"
                                     >
                                       <ChevronUp size={13}/>
                                     </button>
                                     <button
                                       onClick={() => handleReorder(c.id, 'down')}
                                       disabled={idx === gradeClasses.length - 1}
                                       className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-b-lg text-slate-400 hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                                       title="تحريك لأسفل"
                                     >
                                       <ChevronDown size={13}/>
                                     </button>
                                   </div>
                                 </div>
                             </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════ Empty State ══════ */}
      {currentSchoolClasses.length === 0 && (
        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-16 text-center space-y-4">
          <div className="w-20 h-20 bg-[#e5e1fe] rounded-full mx-auto flex items-center justify-center text-[#655ac1]">
            <GraduationCap size={40} />
          </div>
          <h3 className="text-lg font-black text-slate-800">لم يتم إنشاء فصول بعد</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            استخدم الإنشاء التلقائي لتوزيع الفصول تلقائياً على الصفوف، أو أضف فصولاً يدوياً.
          </p>
        </div>
      )}
    </>)}



    
    {/* ══════ Facilities View ══════ */}
  {viewMode === 'facilities' && (
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <FlaskConical size={24} />
              </div>
              <div>
                  <h3 className="text-lg font-black text-slate-800">معامل ومرافق</h3>
                  <p className="text-sm text-slate-400">إضافة المعامل، المختبرات، والصالات الرياضية وربطها بالمواد لضمان عدم التعارض.</p>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Form */}
              <div className="md:col-span-4 space-y-6">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 sticky top-4">
                      <h4 className="font-bold text-slate-700 mb-2">إضافة مرفق جديد</h4>
                      
                      {/* Name */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">اسم المرفق</label>
                          <input
                              type="text"
                              value={facilityName}
                              onChange={e => setFacilityName(e.target.value)}
                              placeholder="مثال: معمل الكيمياء 1"
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-[#655ac1] outline-none transition-all"
                          />
                      </div>

                      {/* Type */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">نوع المرفق</label>
                          <select
                              value={facilityType}
                              onChange={e => setFacilityType(e.target.value as any)}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-[#655ac1] outline-none transition-all"
                          >
                              <option value="lab">معمل</option>
                              <option value="computer_lab">مختبر</option>
                              <option value="gym">صالة رياضية</option>
                              <option value="playground">ملعب</option>
                              <option value="other">أخرى</option>
                          </select>
                      </div>
                      
                      {facilityType === 'other' && (
                          <div className="animate-in slide-in-from-top-2">
                              <label className="block text-xs font-bold text-slate-500 mb-2">تحديد النوع</label>
                              <input
                                  type="text"
                                  value={facilityOtherType}
                                  onChange={e => setFacilityOtherType(e.target.value)}
                                  placeholder="مثال: مكتبة، مسرح..."
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-[#655ac1] outline-none transition-all"
                              />
                          </div>
                      )}

                      {/* Linked Subject */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">ربط بمادة (إلزامي)</label>
                          <select
                              value={facilityLinkedSubject}
                              onChange={e => setFacilityLinkedSubject(e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-[#655ac1] outline-none transition-all"
                          >
                              <option value="">-- اختر مادة --</option>
                              {subjects.filter(s => s.phases.includes(activePhase)).map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                          </select>
                          <p className="text-[10px] text-slate-400 mt-1">عدم جدولة مادة لفصلين بمكان واحد في حصة واحدة.</p>
                      </div>

                      <button
                          onClick={() => {
                              if (!facilityName.trim()) return;
                              if (!facilityLinkedSubject) return; // Enforce subject selection
                              
                              setClasses(prev => [...prev, {
                                  id: crypto.randomUUID(),
                                  phase: activePhase,
                                  grade: 0,
                                  section: 0,
                                  name: facilityName,
                                  isManuallyCreated: true,
                                  type: facilityType,
                                  customType: facilityType === 'other' ? facilityOtherType : undefined,
                                  schoolId: activeSchoolId,
                                  linkedSubjectId: facilityLinkedSubject, // Guaranteed string now
                                  createdAt: new Date().toISOString()
                              }]);
                              setFacilityName('');
                              setFacilityLinkedSubject('');
                              setFacilityOtherType('');
                          }}
                          disabled={!facilityName.trim() || !facilityLinkedSubject}
                          className="w-full py-3 bg-[#655ac1] text-white rounded-xl font-bold hover:bg-[#8779fb] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                          <Plus size={18} /> إضافة المرفق
                      </button>
                  </div>
              </div>

               {/* List */}
               <div className="md:col-span-8">
                   <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 min-h-[400px]">
                       <h4 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
                          <span>المرافق المضافة ({classes.filter(c => ['lab', 'computer_lab', 'gym', 'playground', 'other'].includes(c.type || '') && (c.schoolId || 'main') === activeSchoolId).length})</span>
                       </h4>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           {classes.filter(c => ['lab', 'computer_lab', 'gym', 'playground', 'other'].includes(c.type || '') && (c.schoolId || 'main') === activeSchoolId).map(c => {
                              const linkedSubject = subjects.find(s => s.id === c.linkedSubjectId);
                              return (
                                  <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition-all group relative">
                                       <button onClick={() => handleDeleteOne(c.id)} className="absolute top-3 left-3 text-slate-300 hover:text-rose-500 transition-colors">
                                          <Trash size={16} />
                                      </button>
                                      
                                      <div className="flex items-start gap-3">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                              c.type === 'gym' || c.type === 'playground' ? 'bg-orange-50 text-orange-600' :
                                              c.type?.includes('lab') ? 'bg-cyan-50 text-cyan-600' :
                                              'bg-slate-100 text-slate-600'
                                          }`}>
                                              {c.type === 'gym' || c.type === 'playground' ? <Dumbbell size={20} /> :
                                               c.type?.includes('lab') ? <FlaskConical size={20} /> :
                                               <LayoutGrid size={20} />}
                                          </div>
                                          
                                          <div>
                                              <h5 className="font-bold text-slate-800">{c.name}</h5>
                                              <div className="flex flex-wrap gap-2 mt-2">
                                                  <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">
                                                      {c.type === 'lab' ? 'معمل' :
                                                       c.type === 'computer_lab' ? 'معمل حاسب' :
                                                       c.type === 'gym' ? 'صالة رياضية' :
                                                       c.type === 'playground' ? 'ملعب' :
                                                       c.customType || 'أخرى'}
                                                  </span>
                                                  
                                                  {linkedSubject && (
                                                      <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-1">
                                                          <BookOpen size={10} />
                                                          {linkedSubject.name}
                                                      </span>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              );
                           })}
                           {classes.filter(c => ['lab', 'computer_lab', 'gym', 'playground', 'other'].includes(c.type || '') && (c.schoolId || 'main') === activeSchoolId).length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-400">
                                <FlaskConical size={40} className="mx-auto mb-3 opacity-20" />
                                <p>لا توجد مرافق مضافة لهذه المدرسة</p>
                            </div>
                           )}
                       </div>
                   </div>
               </div>
          </div>
      </div>
  )}

  {/* ══════ Merge View ══════ */}
{viewMode === 'merge' && (
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                  <Shuffle size={24} />
              </div>
              <div>
                  <h3 className="text-lg font-black text-slate-800">دمج المدارس في الجدول</h3>
                  <p className="text-sm text-slate-400">دمج جميع فصول المدارس المشتركة في قائمة واحدة لعملية إنشاء الجدول.</p>
              </div>
          </div>

          <div className="max-w-3xl">
               <div className="flex items-center gap-4 p-6 bg-slate-50 border border-slate-200 rounded-2xl mb-8">
                    <div className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer ${schoolInfo.mergeClassesView ? 'bg-[#655ac1]' : 'bg-slate-300'}`}
                         onClick={() => {
                             setSchoolInfo(prev => ({
                                 ...prev,
                                 mergeClassesView: !prev.mergeClassesView
                             }));
                         }}
                    >
                        <div className={`w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${schoolInfo.mergeClassesView ? 'translate-x-[-24px]' : ''}`} />
                    </div>
                    <div>
                        <h4 className="font-bold text-base text-slate-800">تفعيل الدمج في الجدول</h4>
                        <p className="text-sm text-slate-500 mt-1">عند التفعيل، سيتم اعتبار الفصول من كافة المدارس كقائمة واحدة عند التوزيع (Total: {classes.length} فصل).</p>
                    </div>
                </div>

                <h5 className="font-bold text-slate-700 mb-4">معاينة القائمة الموحدة</h5>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="overflow-y-auto max-h-[300px] custom-scrollbar p-2">
                        <table className="w-full text-right">
                            <thead className="text-xs text-slate-400 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">الفصل</th>
                                    <th className="px-4 py-3">المدرسة</th>
                                    <th className="px-4 py-3">الصف</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classes.sort((a,b) => a.grade - b.grade || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(c => (
                                    <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-white transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-700">{getClassroomDisplayName(c)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] px-2 py-1 rounded-lg font-bold ${
                                                (c.schoolId || 'main') === 'main' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                                            }`}>
                                                {(c.schoolId || 'main') === 'main' ? 'المدرسة الرئيسية' : schoolInfo.sharedSchools.find(s=>s.id === c.schoolId)?.name || 'مدرسة أخرى'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{getGradeLabel(c.grade)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
          </div>
      </div>
)}
      {/* ══════ Subject Customization Modal (Matches GradeDetailsModal Design) ══════ */}
      {(editingSubjectsClassId || editingSubjectsGrade !== null) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-8 pb-4 border-b border-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#f8f7ff] rounded-2xl flex items-center justify-center border border-[#e5e1fe] text-[#655ac1]">
                  <BookOpen size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">
                    {editingSubjectsGrade ? `تخصيص مواد الصف ${getGradeLabel(editingSubjectsGrade)}` : 'تخصيص مواد الفصل'}
                  </h3>
                  <p className="text-slate-500 font-medium mt-1">
                    {editingSubjectsGrade ? 'تحديد المواد التي سيتم دراستها لجميع فصول هذا الصف' : classes.find(c => c.id === editingSubjectsClassId)?.name || 'فصل دراسي'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setEditingSubjectsClassId(null); setEditingSubjectsGrade(null); }}
                className="p-3 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content - List of Subjects */}
            <div className="flex-1 overflow-y-auto p-8 pt-6">
              <div className="grid grid-cols-1 gap-3">
                {subjects.filter(s => !s.isArchived && s.phases.includes(activePhase)).map((subject) => {
                  // Determine status info
                  let isSelected = false;
                  
                  if (editingSubjectsGrade !== null) {
                    const gradeKey = `${activePhase}-${editingSubjectsGrade}`;
                    isSelected = (gradeSubjectMap[gradeKey] || []).includes(subject.id);
                  } else if (editingSubjectsClassId) {
                    const cls = classes.find(c => c.id === editingSubjectsClassId);
                    isSelected = (cls?.subjectIds || []).includes(subject.id);
                  }

                  return (
                    <div
                      key={subject.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group ${
                        isSelected 
                          ? 'bg-white border-[#e5e1fe] shadow-sm' 
                          : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-200'
                      }`}
                    >
                      {/* Status Indicator */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-[#e5e1fe] text-[#655ac1]' : 'bg-slate-200 text-slate-400'
                      }`}>
                         {isSelected ? <CheckCircle2 size={24} /> : <BookOpen size={20} />}
                      </div>

                      <div className="flex-1">
                        <h3 className={`font-black text-lg ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>
                          {subject.name}
                        </h3>
                        <p className="text-sm text-slate-400 flex items-center gap-2">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md text-xs font-bold">{subject.periodsPerClass} حصص</span>
                          {subject.department && <span className="text-xs">• {subject.department}</span>}
                        </p>
                      </div>

                      {/* Action Button */}
                      {isSelected ? (
                        <button
                          onClick={() => {
                             if (editingSubjectsGrade !== null) {
                               toggleSubjectForGrade(editingSubjectsGrade, subject.id);
                             } else if (editingSubjectsClassId) {
                               setClasses(prev => prev.map(c => {
                                 if (c.id === editingSubjectsClassId) {
                                   return { ...c, subjectIds: (c.subjectIds || []).filter(id => id !== subject.id) };
                                 }
                                 return c;
                               }));
                             }
                          }}
                          className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-2 font-bold"
                          title="إزالة المادة"
                        >
                          <Trash2 size={18} />
                          <span className="hidden sm:inline">إزالة</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                             if (editingSubjectsGrade !== null) {
                               toggleSubjectForGrade(editingSubjectsGrade, subject.id);
                             } else if (editingSubjectsClassId) {
                               setClasses(prev => prev.map(c => {
                                 if (c.id === editingSubjectsClassId) {
                                   return { ...c, subjectIds: [...(c.subjectIds || []), subject.id] };
                                 }
                                 return c;
                               }));
                             }
                          }}
                          className="p-3 bg-white border border-slate-200 text-slate-400 hover:border-[#655ac1] hover:text-[#655ac1] rounded-xl transition-all flex items-center gap-2 font-bold shadow-sm"
                          title="إضافة المادة"
                        >
                          <Plus size={18} />
                          <span className="hidden sm:inline">إضافة</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Footer / Summary */}
            <div className="p-6 bg-[#f8f7ff] border-t border-[#e5e1fe] flex justify-between items-center">
                <div className="flex items-center gap-2 text-[#655ac1] text-sm font-bold">
                    <Info size={16} />
                    <span>تغيير المواد هنا يؤثر فقط على {editingSubjectsGrade ? 'الصف المحدد' : 'الفصل المحدد'}.</span>
                </div>
                <button 
                  onClick={() => { setEditingSubjectsClassId(null); setEditingSubjectsGrade(null); }}
                  className="px-8 py-3 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200"
                >
                  حفظ وإغلاق
                </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Global Rename Modal ══════ */}
      {showGlobalRenameModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-8 pb-4 border-b border-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#f8f7ff] rounded-2xl flex items-center justify-center border border-[#e5e1fe] text-[#655ac1]">
                  <Pencil size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">تعديل مسميات الفصول</h3>
                  <p className="text-slate-500 font-medium mt-1">تعديل أسماء جميع الفصول في المدرسة دفعة واحدة</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowGlobalRenameModal(false); setTempClassNames({}); }}
                className="p-3 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content - List of Classes Grouped by Grade */}
            <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
              <div className="space-y-8">
                {Object.entries(groupClassesByGrade(currentSchoolClasses)).map(([gradeStr, classes]) => ({ grade: Number(gradeStr), classes })).map((group) => (
                  <div key={group.grade} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <h4 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm text-sm">{group.classes.length}</span>
                      {getGradeLabel(group.grade)}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.classes.sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(cls => (
                        <div key={cls.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                           <div className="flex-1">
                             <label className="text-[10px] font-bold text-slate-400 mb-1 block">اسم الفصل</label>
                             <input
                               type="text"
                               value={tempClassNames[cls.id] ?? cls.name}
                               onChange={(e) => setTempClassNames(prev => ({ ...prev, [cls.id]: e.target.value }))}
                               className="w-full font-bold text-slate-800 border-b border-slate-200 focus:border-[#655ac1] outline-none py-1 bg-transparent transition-colors"
                               placeholder="اسم الفصل"
                             />
                           </div>
                           <div className="text-xs font-black text-slate-300">#{cls.section}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 bg-[#f8f7ff] border-t border-[#e5e1fe] flex justify-between items-center">
                <div className="flex items-center gap-2 text-[#655ac1] text-sm font-bold">
                    <Info size={16} />
                    <span>تأكد من عدم تكرار الأسماء داخل نفس الصف الدراسي.</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => { setShowGlobalRenameModal(false); setTempClassNames({}); }}
                    className="px-6 py-3 bg-transparent text-slate-500 font-bold hover:text-slate-700 transition-colors"
                  >
                    إلغاء الأمر
                  </button>
                  <button 
                    onClick={() => {
                       // Apply changes
                       setClasses(prev => prev.map(c => {
                         if (tempClassNames[c.id]) {
                           return { ...c, name: tempClassNames[c.id] };
                         }
                         return c;
                       }));
                       setShowGlobalRenameModal(false);
                       setTempClassNames({});
                    }}
                    className="px-8 py-3 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200"
                  >
                    حفظ التغييرات
                  </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Global Periods Modal ══════ */}
      {showGlobalPeriodsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-8 pb-4 border-b border-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#f8f7ff] rounded-2xl flex items-center justify-center border border-[#e5e1fe] text-[#655ac1]">
                  <Clock size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">تخصيص الحصص للكل</h3>
                  <p className="text-slate-500 font-medium mt-1">تعديل عدد الحصص اليومية لجميع الفصول دفعة واحدة</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGlobalPeriodsModal(false)}
                className="p-3 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content - List of Classes Grouped by Grade */}
            <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
              <div className="space-y-8">
                {Object.entries(groupClassesByGrade(currentSchoolClasses)).map(([gradeStr, classes]) => ({ grade: Number(gradeStr), classes })).map((group) => (
                  <div key={group.grade} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-black text-slate-700 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm text-sm">{group.classes.length}</span>
                        {getGradeLabel(group.grade)}
                      </h4>
                      
                      {/* Bulk Actions for Grade */}
                      <button 
                        onClick={() => {
                           // Apply to all classes in this grade - Reset to default
                           setClasses(prev => prev.map(c => {
                             if (c.grade === group.grade && (c.schoolId || 'main') === activeSchoolId) {
                               const { customPeriodCounts, ...rest } = c;
                               return rest;
                             }
                             return c;
                           }));
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-[#655ac1] flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200"
                      >
                         <RotateCcw size={12} /> إعادة تعيين للكل في هذا الصف
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {group.classes.sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(cls => {
                         const hasCustom = !!cls.customPeriodCounts;
                         
                         return (
                            <div key={cls.id} className={`p-4 rounded-xl border transition-all ${hasCustom ? 'bg-white border-[#e5e1fe] shadow-sm' : 'bg-white/50 border-slate-200'}`}>
                               <div className="flex flex-col xl:flex-row items-center gap-4">
                                  <div className="w-full xl:w-48 flex items-center justify-between xl:justify-start gap-3">
                                     <span className="font-bold text-slate-700">{cls.name}</span>
                                     {hasCustom && <span className="text-[9px] bg-[#e5e1fe] text-[#655ac1] px-2 py-0.5 rounded font-bold">مخصص</span>}
                                  </div>
                                  
                                  <div className="flex-1 grid grid-cols-5 gap-2 w-full">
                                     {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'].filter(d => currentTiming?.activeDays?.includes(d as any)).map(day => {
                                        const defaultCount = currentTiming?.periodCounts?.[day as any] ?? 7;
                                        const customCount = cls.customPeriodCounts?.[day as any];
                                        const count = customCount ?? defaultCount;
                                        const isCustomDay = customCount !== undefined && customCount !== defaultCount;
                                        
                                        return (
                                           <div key={day} className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${isCustomDay ? 'bg-[#f8f7ff] border-[#655ac1]' : 'bg-slate-50 border-slate-100'}`}>
                                              <span className="text-[9px] font-bold text-slate-400 mb-1">{(dayLabels as any)[day]}</span>
                                              <div className="flex items-center gap-2">
                                                 <button 
                                                   onClick={() => {
                                                      const newCount = Math.max(1, count - 1);
                                                      handleCustomPeriodChange(cls.id, day as any, newCount);
                                                   }}
                                                   className="w-6 h-6 flex items-center justify-center bg-white rounded-md text-slate-400 hover:text-rose-500 border border-slate-200 hover:border-rose-200 transition-colors"
                                                 >
                                                   -
                                                 </button>
                                                 <span className={`text-sm font-black w-4 text-center ${isCustomDay ? 'text-[#655ac1]' : 'text-slate-600'}`}>{count}</span>
                                                 <button 
                                                   onClick={() => {
                                                      const newCount = Math.min(12, count + 1);
                                                      handleCustomPeriodChange(cls.id, day as any, newCount);
                                                   }}
                                                   className="w-6 h-6 flex items-center justify-center bg-white rounded-md text-slate-400 hover:text-[#655ac1] border border-slate-200 hover:border-[#e5e1fe] transition-colors"
                                                 >
                                                   +
                                                 </button>
                                              </div>
                                           </div>
                                        );
                                     })}
                                  </div>
                               </div>
                            </div>
                         );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 bg-[#f8f7ff] border-t border-[#e5e1fe] flex justify-between items-center">
                <div className="flex items-center gap-2 text-[#655ac1] text-sm font-bold">
                    <Info size={16} />
                    <span>التغييرات تُحفظ مباشرة. استخدم "إعادة تعيين" للعودة للإعدادات الافتراضية.</span>
                </div>
                <button 
                  onClick={() => setShowGlobalPeriodsModal(false)}
                  className="px-8 py-3 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200"
                >
                  إغلاق
                </button>
            </div>
          </div>
        </div>
      )}

    {/* ═══ Delete All Confirmation Modal ═══ */}
    {showDeleteAllConfirm && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
          <div className="bg-gradient-to-br from-rose-50 to-orange-50 px-8 pt-8 pb-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4">
              <AlertTriangle size={32} className="text-orange-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">حذف جميع الفصول</h3>
            <p className="text-sm font-bold text-slate-500 leading-relaxed">
              سيتم حذف جميع فصول مرحلة{' '}
              <span className="text-orange-600 font-black">{activePhase}</span>{' '}
              لمدرسة{' '}
              <span className="text-slate-800 font-black">
                "{activeSchoolId === 'main' ? schoolInfo.schoolName : schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId)?.name}"
              </span>.
              <br />
              <span className="text-rose-600">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
          </div>
          <div className="px-8 py-6 flex gap-3 justify-center">
            <button
              onClick={() => setShowDeleteAllConfirm(false)}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              إلغاء
            </button>
            <button
              onClick={() => { handleDeleteAll(); setShowDeleteAllConfirm(false); }}
              className="flex-1 px-6 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
            >
              <Trash size={16} /> نعم، احذف الكل
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ═══ Delete Single Class Confirmation Modal ═══ */}
    {deleteConfirmClassId && (() => {
      const targetClass = classes.find(c => c.id === deleteConfirmClassId);
      const displayName = targetClass ? getClassroomDisplayName(targetClass) : '';
      return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 px-8 pt-8 pb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4">
                <Trash2 size={30} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">حذف الفصل</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed">
                هل أنت متأكد من حذف فصل{' '}
                <span className="text-slate-800 font-black" dir="ltr">"{displayName}"</span>؟
                <br />
                <span className="text-rose-500">خطوة غير قابلة للتراجع.</span>
              </p>
            </div>
            <div className="px-8 py-6 flex gap-3 justify-center">
              <button
                onClick={() => setDeleteConfirmClassId(null)}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => { handleDeleteOne(deleteConfirmClassId); setDeleteConfirmClassId(null); }}
                className="flex-1 px-6 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> نعم، احذف
              </button>
            </div>
          </div>
        </div>
      );
    })()}

    </div>
  );
};
export default Step4Classes;
