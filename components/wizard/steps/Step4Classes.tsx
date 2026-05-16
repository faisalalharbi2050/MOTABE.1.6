import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Phase, ClassInfo, Subject, SchoolInfo, EntityType } from '../../../types';
import { PHASE_CONFIG } from '../../../constants';
import {
  GraduationCap, Trash2, CheckCircle2, BookPlus, X, School, PlusCircle,
  Zap, ChevronUp, ChevronDown, ChevronRight, Pencil, Settings2, Printer, AlertTriangle,
  LayoutGrid, Hash, Check, Layers, Plus, Minus, Clock, BookOpen, Sparkles,
  ArrowUpDown, Trash, RotateCcw, FlaskConical, Dumbbell, Warehouse, Building2, Info,
  MoreHorizontal, Edit2, MapPin
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

// ─── Wizard Constants ──────────────────────────────────────────────────────────
const ARABIC_LETTERS_W = ['أ','ب','ج','د','هـ','و','ز','ح','ط','ي','ك','ل','م','ن','س','ع','ف','ص','ق','ر'];
const GRADE_TEMPLATES_W: Record<string, string[]> = {
  elementary: ['الأول','الثاني','الثالث','الرابع','الخامس','السادس'],
  middle:     ['الأول المتوسط','الثاني المتوسط','الثالث المتوسط'],
  high:       ['الأول الثانوي','الثاني الثانوي','الثالث الثانوي'],
};
type NamingModeW    = 'numbers' | 'name_number' | 'name_letter';
type PhaseTemplateW = 'elementary' | 'middle' | 'high' | 'custom';
interface WizardGradeW { id: string; name: string; }

// بادئة المرحلة — تُضاف فقط حين توجد مدرسة مشتركة
const PHASE_SUFFIX_MAP: Partial<Record<Phase, string>> = {
  [Phase.ELEMENTARY]: 'ب',
  [Phase.MIDDLE]:     'م',
  [Phase.HIGH]:       'ث',
};

interface Props {
  classes: ClassInfo[];
  setClasses: React.Dispatch<React.SetStateAction<ClassInfo[]>>;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  gradeSubjectMap: Record<string, string[]>;
  setGradeSubjectMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
}

type CreationMode = 'auto' | 'manual';

const Step4Classes: React.FC<Props> = ({ classes, setClasses, subjects, setSubjects, gradeSubjectMap, setGradeSubjectMap, schoolInfo, setSchoolInfo }) => {
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
  const [editingSubjectPeriodId, setEditingSubjectPeriodId] = useState<string | null>(null);
  const [editingSubjectPeriodValue, setEditingSubjectPeriodValue] = useState('');
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
  type ViewMode = 'classes' | 'facilities';
  const [viewMode, setViewMode] = useState<ViewMode>('classes');

  // ─── Shared School Detection ───
  // يُفعَّل التمييز بالبادئة فقط عند وجود مدرسة مشتركة
  const hasSharedSchool = useMemo(
    () => !!(schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0),
    [schoolInfo.sharedSchools]
  );
  const phaseSuffix = hasSharedSchool ? (PHASE_SUFFIX_MAP[activePhase] || '') : '';

  // ─── New: Wizard State ───
  const [wizardOpen,      setWizardOpen]      = useState(false);
  const [wizardStep,      setWizardStep]      = useState<1|2|3>(1);
  const [wizardTemplate,  setWizardTemplate]  = useState<PhaseTemplateW>('elementary');
  const [wizardGrades,    setWizardGrades]    = useState<WizardGradeW[]>([]);
  const [wizardCount,     setWizardCount]     = useState(1);
  const [wizardNaming,    setWizardNaming]    = useState<NamingModeW>('numbers');

  // ─── New: Grade Label Map (localStorage) ───
  const [gradeLabelMap, setGradeLabelMap] = useState<Record<string,string>>(() => {
    try { return JSON.parse(localStorage.getItem('classSetup_gradeLabelMap') || '{}'); }
    catch { return {}; }
  });
  useEffect(() => {
    localStorage.setItem('classSetup_gradeLabelMap', JSON.stringify(gradeLabelMap));
  }, [gradeLabelMap]);

  // ─── New: Expanded Grade Blocks ───
  const [expandedGrades, setExpandedGrades] = useState<Set<number>>(new Set<number>());
  // Auto-expand when new grades appear
  const gradeNumbersKey = Object.keys(groupClassesByGrade(
    classes.filter(c => c.phase === activePhase && (c.schoolId||'main') === activeSchoolId && !['lab','computer_lab','gym','playground','other'].includes(c.type||''))
  )).join(',');
  useEffect(() => {
    const nums = gradeNumbersKey ? gradeNumbersKey.split(',').map(Number) : [];
    setExpandedGrades(new Set(nums));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeNumbersKey]);

  // ─── New: Portal Dropdown ───
  const [portalDropdown, setPortalDropdown] = useState<{classId:string; top:number; left:number}|null>(null);
  const [portalDeleteId,  setPortalDeleteId]  = useState<string|null>(null);
  useEffect(() => {
    if (!portalDropdown) return;
    const close = () => setPortalDropdown(null);
    document.addEventListener('click', close);
    document.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('click', close); document.removeEventListener('scroll', close, true); };
  }, [portalDropdown]);

  // ─── New: Toast ───
  const [toast, setToast] = useState<string|null>(null);
  const toastTimer = useRef<number|undefined>(undefined);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);
  
  // Custom/Other Classes
  const [customClassName, setCustomClassName] = useState('');
  const [customClassCount, setCustomClassCount] = useState<number>(1);
  
  // Facilities
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState<'lab' | 'computer_lab' | 'gym' | 'playground' | 'other'>('lab');
  const [facilityLinkedSubject, setFacilityLinkedSubject] = useState<string[]>([]); // Array of subject IDs for chips
  const [facilityOtherType, setFacilityOtherType] = useState('');
  const [facilityCapacity, setFacilityCapacity] = useState<number>(1); // 1, 2, or 3
  
  // Form validation and messages
  const [facilityErrors, setFacilityErrors] = useState<{name?: string; type?: string; capacity?: string}>({});
  const [facilitySuccess, setFacilitySuccess] = useState<string>('');


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
    return classes
      .filter(c => c.phase === activePhase && (c.schoolId || 'main') === activeSchoolId)
      .sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return (a.sortOrder ?? a.section) - (b.sortOrder ?? b.section);
      });
  }, [classes, activePhase, activeSchoolId]);

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

    // إذا وُجدت مدرسة مشتركة وأدخل المستخدم اسمًا مخصصًا نضيف البادئة إليه تلقائيًا
    // وإذا لم يدخل اسمًا نُنشئ اسمًا تلقائيًا بالبادئة
    let autoName: string | undefined;
    if (phaseSuffix) {
      const base = manualCustomName.trim()
        || `${toArabicNum(targetGrade)} / ${toArabicNum(nextSection)}`;
      autoName = `${base} ${phaseSuffix}`;
    } else {
      autoName = manualCustomName.trim() || undefined;
    }

    const newClass: ClassInfo = {
      id: `${activeSchoolId}-${activePhase}-${targetGrade}-${nextSection}-${Date.now()}`,
      phase: activePhase,
      grade: targetGrade,
      section: nextSection,
      name: autoName,
      subjectIds: [...subjectIds],
      schoolId: activeSchoolId,
      sortOrder: nextSection,
      isManuallyCreated: true,
      createdAt: new Date().toISOString(),
    };

    setClasses(prev => [...prev, newClass]);
    setManualCustomName('');
  }, [classes, activePhase, manualGrade, activeSchoolId, manualCustomName, phaseSuffix, gradeSubjectMap, setClasses]);

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

  // ─── Wizard Helpers ───
  const openWizard = useCallback(() => {
    setWizardStep(1);
    setWizardTemplate('elementary');
    setWizardCount(1);
    setWizardNaming('numbers');
    setWizardGrades(GRADE_TEMPLATES_W.elementary.map((n,i) => ({ id:`wg-${i}`, name: n })));
    setWizardOpen(true);
  }, []);

  const selectWizardTemplate = useCallback((t: PhaseTemplateW) => {
    setWizardTemplate(t);
    const names = t === 'custom' ? ['المستوى الأول'] : (GRADE_TEMPLATES_W[t] || []);
    setWizardGrades(names.map((n,i) => ({ id:`wg-${i}-${Date.now()}`, name: n })));
  }, []);

  const toArabicNum = (n: number) => n.toLocaleString('ar-EG');

  const wizardPreviewNames = useMemo((): string[][] => {
    const sfx = phaseSuffix ? ` ${phaseSuffix}` : '';
    return wizardGrades.map((grade, gi) =>
      Array.from({ length: wizardCount }, (_, si) => {
        const sNum = si + 1;
        switch (wizardNaming) {
          case 'numbers':     return `${toArabicNum(gi+1)} / ${toArabicNum(sNum)}${sfx}`;
          case 'name_number': return `${grade.name} / ${toArabicNum(sNum)}${sfx}`;
          case 'name_letter': return `${grade.name} / ${ARABIC_LETTERS_W[si] || toArabicNum(sNum)}${sfx}`;
          default:            return `${toArabicNum(gi+1)} / ${toArabicNum(sNum)}${sfx}`;
        }
      })
    );
  },
  [wizardGrades, wizardCount, wizardNaming, phaseSuffix]);

  const handleWizardCreate = useCallback(() => {
    const newClasses: ClassInfo[] = [];
    const newLabelMap = { ...gradeLabelMap };
    const sfx = phaseSuffix ? ` ${phaseSuffix}` : '';
    wizardGrades.forEach((grade, gi) => {
      const gradeNum = gi + 1;
      const gradeKey = `${activePhase}-${gradeNum}`;
      newLabelMap[gradeKey] = grade.name;
      for (let si = 0; si < wizardCount; si++) {
        const sNum = si + 1;
        let name: string;
        switch (wizardNaming) {
          case 'numbers':     name = `${toArabicNum(gradeNum)} / ${toArabicNum(sNum)}${sfx}`; break;
          case 'name_number': name = `${grade.name} / ${toArabicNum(sNum)}${sfx}`; break;
          case 'name_letter': name = `${grade.name} / ${ARABIC_LETTERS_W[si] || toArabicNum(sNum)}${sfx}`; break;
          default:            name = `${toArabicNum(gradeNum)} / ${toArabicNum(sNum)}${sfx}`;
        }
        newClasses.push({
          id: `${activeSchoolId}-${activePhase}-${gradeNum}-${sNum}-${Date.now()}-${si}`,
          phase: activePhase,
          grade: gradeNum,
          section: sNum,
          name,
          subjectIds: gradeSubjectMap[gradeKey] || [],
          schoolId: activeSchoolId,
          sortOrder: sNum,
          createdAt: new Date().toISOString(),
        });
      }
    });
    setClasses(prev => [
      ...prev.filter(c => !(c.phase === activePhase && (c.schoolId||'main') === activeSchoolId && !['lab','computer_lab','gym','playground','other'].includes(c.type||''))),
      ...newClasses,
    ]);
    setGradeLabelMap(newLabelMap);
    setWizardOpen(false);
    const total = wizardGrades.length * wizardCount;
    setTimeout(() => showToast(`تم إنشاء ${wizardGrades.length} صفوف و${total} فصلاً بنجاح`), 200);
  }, [wizardGrades, wizardCount, wizardNaming, activePhase, activeSchoolId, gradeLabelMap, gradeSubjectMap, phaseSuffix, setClasses, showToast]);

  // ─── Portal Dropdown Open ───
  const openPortalDropdown = useCallback((e: React.MouseEvent, classId: string) => {
    e.stopPropagation();
    setPortalDeleteId(null);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuW = 190;
    // Position so menu appears below button, clamped within viewport
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuW - 8));
    setPortalDropdown({ classId, top: rect.bottom + 4, left });
  }, []);

  // ─── Grade display label (with gradeLabelMap override) ───
  const getGradeLabelEx = useCallback((grade: number) =>
    gradeLabelMap[`${activePhase}-${grade}`] || getGradeLabel(grade),
    [gradeLabelMap, activePhase, getGradeLabel]
  );

  // ══════════════════════════════════════════════════════
  //   R E N D E R
  // ══════════════════════════════════════════════════════

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">

      {/* ══════ Header ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300 mb-6">
          
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <LayoutGrid size={36} strokeWidth={1.8} className="text-[#655ac1]" />
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
                    onClick={() => { setViewMode('classes'); openWizard(); }}
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
                    <MapPin size={20} className={viewMode === 'facilities' ? 'text-white' : 'text-[#8779fb]'} />
                    المرافق المدرسية
                  </button>

                  

              </div>
          </div>

          {viewMode === 'facilities' && (
              <div className="bg-white border border-[#e5e1fe] p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <Info size={16} className="text-[#8779fb] shrink-0" />
                  <p className="text-sm font-semibold text-slate-600 leading-relaxed">يمكنك تخصيص المرافق المضافة لمنع التعارض — مثلاً: صالتان رياضيتان تستوعبان فصلين فقط في نفس الوقت</p>
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

      {/* ══════ Classes View (Redesigned) ══════ */}
      {viewMode === 'classes' && (
        <>

          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
              <LayoutGrid size={28} className="text-[#8779fb] flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-bold">عدد الصفوف / المستويات</p>
                <p className="text-3xl font-black text-slate-800">{Object.keys(grouped).length}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
              <Hash size={28} className="text-[#8779fb] flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-bold">إجمالي الفصول</p>
                <p className="text-3xl font-black text-slate-800">{currentSchoolClasses.length}</p>
              </div>
            </div>
          </div>

          {/* ── Bulk Action Bar ── */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200/60 flex flex-wrap items-center justify-between gap-3 transition-all">
            <div className="flex items-center gap-3">
              <Settings2 size={20} className="text-[#655ac1]" />
              <div>
                <span className="text-sm font-black text-slate-700">إجراءات الفصول</span>
                {selectedClasses.size > 0 && (
                  <span className="text-xs bg-[#e5e1fe] text-[#655ac1] px-2 py-0.5 rounded-lg font-black mr-2">{selectedClasses.size} محدد</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { if (selectedClasses.size > 0) setShowGlobalRenameModal(true); }}
                disabled={selectedClasses.size === 0}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb] disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                <Pencil size={15} className="text-indigo-500" /> تعديل المسمى
              </button>
              <button
                onClick={() => { if (selectedClasses.size > 0) setShowGlobalPeriodsModal(true); }}
                disabled={selectedClasses.size === 0}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb] disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                <Clock size={15} className="text-[#655ac1]" /> تخصيص الحصص
              </button>
              <button
                onClick={() => { if (selectedClasses.size > 0) setShowBulkDeleteConfirm(true); }}
                disabled={selectedClasses.size === 0}
                className="flex items-center gap-2 bg-white hover:bg-rose-50 text-rose-500 border border-rose-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-rose-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                <Trash2 size={15} /> حذف المحدد
              </button>
              {currentSchoolClasses.length > 0 && (
                <button
                  onClick={() => setShowDeleteAllConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-xl border-2 border-rose-200 text-rose-500 hover:bg-rose-50 transition-all"
                >
                  <Trash size={13} /> حذف الكل
                </button>
              )}
            </div>
          </div>

          {/* ── Bulk Delete Confirmation — modal rendered below ── */}

          {/* ── Grade Blocks ── */}
          {currentSchoolClasses.length === 0 ? (
            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-16 text-center space-y-4">
              <LayoutGrid size={48} className="text-[#8779fb] mx-auto" />
              <h3 className="text-lg font-black text-slate-800">لم يتم إنشاء الفصول بعد</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                اضغط على زر إنشاء الفصول وأكمل الخطوات.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.keys(grouped).map(Number).sort((a,b) => a-b).map(grade => {
                const gradeClasses = grouped[grade];
                const isExpanded   = expandedGrades.has(grade);
                const gradeLabel   = getGradeLabelEx(grade);
                const allSelected  = gradeClasses.length > 0 && gradeClasses.every(c => selectedClasses.has(c.id));
                const someSelected = gradeClasses.some(c => selectedClasses.has(c.id));
                return (
                  <div key={grade} className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                    {/* Grade header */}
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer select-none bg-white border-b border-slate-100"
                      onClick={() => setExpandedGrades(prev => {
                        const n = new Set(prev);
                        n.has(grade) ? n.delete(grade) : n.add(grade);
                        return n;
                      })}
                    >
                      <div className="flex items-center gap-3">
                        {/* Grade-level checkbox */}
                        <div
                          onClick={e => {
                            e.stopPropagation();
                            const n = new Set(selectedClasses);
                            if (allSelected) gradeClasses.forEach(c => n.delete(c.id));
                            else             gradeClasses.forEach(c => n.add(c.id));
                            setSelectedClasses(n);
                          }}
                          className="w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                          style={{
                            background:  (allSelected || someSelected) ? '#8779fb' : 'transparent',
                            borderColor: '#8779fb',
                          }}
                        >
                          {(allSelected || someSelected) && <Check size={12} className="text-white" />}
                        </div>
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                          style={{ background: '#e5e1fe', color: '#8779fb' }}
                        >
                          {grade}
                        </span>
                        <div>
                          <span className="text-[#4338ca] font-black text-sm">{gradeLabel}</span>
                          <span className="text-[#8779fb] text-xs font-bold mr-2">({gradeClasses.length} فصل)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Add class */}
                        <button
                          onClick={e => { e.stopPropagation(); handleManualAdd(grade); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[#655ac1] text-xs font-bold rounded-lg border border-[#8779fb]/30 hover:bg-[#8779fb]/10 transition-all"
                        >
                          <Plus size={14} /> إضافة فصل
                        </button>
                        <div className="text-[#655ac1]">
                          {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                        </div>
                      </div>
                    </div>

                    {/* Grade content */}
                    {isExpanded && (
                      <div className="bg-white">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/50">
                              <th className="w-10 py-2 px-4"/>
                              <th className="py-2 px-4 text-right text-xs text-slate-400 font-bold">اسم الفصل</th>
                              <th className="w-12 py-2 px-4"/>
                            </tr>
                          </thead>
                          <tbody>
                            {gradeClasses.map(cls => {
                              const isSelected = selectedClasses.has(cls.id);
                              const displayName = cls.name || getClassroomDisplayName(cls);
                              return (
                                <tr
                                  key={cls.id}
                                  className={`border-b border-slate-50 last:border-0 transition-colors ${isSelected ? 'bg-purple-50/60' : 'hover:bg-slate-50/70'}`}
                                >
                                  <td className="py-3 px-4">
                                    <div
                                      onClick={() => toggleSelect(cls.id)}
                                      className="w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all"
                                      style={{
                                        background:  isSelected ? '#8779fb' : 'transparent',
                                        borderColor: isSelected ? '#8779fb' : '#cbd5e1',
                                      }}
                                    >
                                      {isSelected && <Check size={10} className="text-white"/>}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    {editingClassId === cls.id ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={editName}
                                          onChange={e => setEditName(e.target.value)}
                                          className="w-full max-w-[180px] p-2 bg-white border border-[#8779fb] rounded-lg text-xs font-black outline-none"
                                          autoFocus
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') handleSaveEdit();
                                            if (e.key === 'Escape') { setEditingClassId(null); setEditName(''); }
                                          }}
                                        />
                                        <button onClick={handleSaveEdit} className="p-2 bg-[#8779fb] text-white rounded-lg text-[10px] font-bold">حفظ</button>
                                      </div>
                                    ) : (
                                      <span className="text-sm font-bold text-slate-700">{displayName}</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-left">
                                    <button
                                      onClick={e => openPortalDropdown(e, cls.id)}
                                      title="إجراءات"
                                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#e5e1fe] text-slate-400 hover:text-[#655ac1] transition-all border border-slate-200 hover:border-[#8779fb]"
                                    >
                                      <Edit2 size={14}/>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}


      {/* ══════ OLD Approved Classrooms Display — hidden ══════ */}
      {false && currentSchoolClasses.length > 0 && (
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
                سيتم حذف جميع فصول مدرسة "{activeSchoolId === 'main' ? schoolInfo.schoolName : schoolInfo.sharedSchools?.find(s=>s.id === activeSchoolId)?.name}" في مرحلة "{activePhase}". هل أنت متأكϿ
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

    </>)}



    
    {/* ══════ Facilities View ══════ */}
  {viewMode === 'facilities' && (
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
              <div className="text-[#655ac1] shrink-0">
                  <MapPin size={20} />
              </div>
              <div>
                  <h3 className="text-lg font-black text-slate-800">المرافق المدرسية</h3>
                  <p className="text-sm text-slate-400">معامل، مختبراʡ صالات رياضيɡ وغيرها</p>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Form */}
              <div className="md:col-span-4 space-y-6">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 sticky top-4">
                      <h4 className="font-bold text-slate-700 mb-2">إضافة مرفق جديد</h4>
                      
                      {/* Type */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">نوع المرفق</label>
                          <select
                              value={facilityType}
                              onChange={e => {
                                  setFacilityType(e.target.value as any);
                                  if (facilityErrors.type) {
                                      setFacilityErrors(prev => ({ ...prev, type: undefined }));
                                  }
                              }}
                              className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-bold focus:border-[#655ac1] outline-none transition-all ${
                                  facilityErrors.type ? 'border-rose-400' : 'border-slate-200'
                              }`}
                          >
                              <option value="">-- اختر النوع --</option>
                              <option value="lab">معمل</option>
                              <option value="computer_lab">مختبر</option>
                              <option value="gym">صالة رياضية</option>
                              <option value="playground">ملعب</option>
                              <option value="other">أخرى</option>
                          </select>
                          {facilityErrors.type && (
                              <p className="text-xs text-rose-500 mt-1">{facilityErrors.type}</p>
                          )}
                      </div>
                      
                      {facilityType === 'other' && (
                          <div className="animate-in slide-in-from-top-2">
                              <label className="block text-xs font-bold text-slate-500 mb-2">تحديد النوع</label>
                              <input
                                  type="text"
                                  value={facilityOtherType}
                                  onChange={e => setFacilityOtherType(e.target.value)}
                                  placeholder="مثال: مكتبɡ مسرح..."
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-[#655ac1] outline-none transition-all"
                              />
                          </div>
                      )}

                      {/* Name (optional) */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">
                              اسم مخصص <span className="font-normal text-slate-400">(اختياري)</span>
                          </label>
                          <input
                              type="text"
                              value={facilityName}
                              onChange={e => setFacilityName(e.target.value)}
                              placeholder="اتركه فارغاً للاسم التلقائي"
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-[#655ac1] outline-none transition-all"
                          />
                      </div>

                      {/* Capacity */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">كم فصلاً يمكنه استيعابهم في نفس الوقʿ</label>
                          <div className="flex gap-2">
                              {[1, 2, 3, 4].map(n => (
                                  <button
                                      key={n}
                                      onClick={() => {
                                          setFacilityCapacity(n);
                                          if (facilityErrors.capacity) {
                                              setFacilityErrors(prev => ({ ...prev, capacity: undefined }));
                                          }
                                      }}
                                      className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${
                                          facilityCapacity === n
                                              ? 'bg-white text-[#655ac1] border-[#655ac1]'
                                              : 'bg-white border-slate-200 text-slate-700 hover:border-[#8779fb]'
                                      }`}
                                  >
                                      {n}
                                  </button>
                              ))}
                          </div>

                          {facilityErrors.capacity && (
                              <p className="text-xs text-rose-500 mt-1">{facilityErrors.capacity}</p>
                          )}
                      </div>

                      {/* Linked Subjects - Optional */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">
                              ربط بمادة
                              <span className="text-xs text-slate-400 mr-2">(اختياري)</span>
                          </label>
                          <div className="flex flex-wrap gap-2 mb-2">
                              {facilityLinkedSubject.map(subjectId => {
                                  const subject = subjects.find(s => s.id === subjectId);
                                  return subject ? (
                                      <span
                                          key={subjectId}
                                          className="inline-flex items-center gap-1 px-3 py-1 bg-[#e5e1fe] text-[#655ac1] rounded-full text-xs font-bold"
                                      >
                                          {subject.name}
                                          <button
                                              onClick={() => setFacilityLinkedSubject(prev => prev.filter(id => id !== subjectId))}
                                              className="hover:text-[#5046a0]"
                                          >
                                              <X size={12} />
                                          </button>
                                      </span>
                                  ) : null;
                              })}
                          </div>
                          <select
                              value=""
                              onChange={e => {
                                  if (e.target.value && !facilityLinkedSubject.includes(e.target.value)) {
                                      setFacilityLinkedSubject(prev => [...prev, e.target.value]);
                                  }
                              }}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-[#655ac1] outline-none transition-all"
                          >
                              <option value="">-- اختر مادة لإضافتها --</option>
                              {subjects
                                  .filter(s => s.phases.includes(activePhase) && !facilityLinkedSubject.includes(s.id))
                                  .map(s => (
                                      <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                          </select>
                      </div>

                      {/* Success Message */}
                      {facilitySuccess && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                              <p className="text-sm font-bold text-emerald-700">{facilitySuccess}</p>
                          </div>
                      )}

                      <button
                          onClick={() => {
                              // Validation
                              const errors: {name?: string; type?: string; capacity?: string} = {};

                              if (!facilityType) {
                                  errors.type = 'يجب اختيار نوع المرفق';
                              }
                              
                              if (!facilityCapacity) {
                                  errors.capacity = 'يجب اختيار السعة';
                              }
                              
                              if (Object.keys(errors).length > 0) {
                                  setFacilityErrors(errors);
                                  return;
                              }
                              
                              // Clear errors and success message
                              setFacilityErrors({});
                              setFacilitySuccess('');
                              
                              // Auto-generate name from type if not provided
                              const typeLabels: Record<string, string> = {
                                  lab: 'معمل', computer_lab: 'مختبر حاسب',
                                  gym: 'صالة رياضية', playground: 'ملعب', other: facilityOtherType || 'مرفق'
                              };
                              const existingOfType = classes.filter(c => c.type === facilityType && (c.schoolId || 'main') === activeSchoolId).length + 1;
                              const autoName = facilityName.trim() || `${typeLabels[facilityType] || 'مرفق'} ${existingOfType}`;

                              // Save facility
                              setClasses(prev => [...prev, {
                                  id: crypto.randomUUID(),
                                  phase: activePhase,
                                  grade: 0,
                                  section: 0,
                                  name: autoName,
                                  isManuallyCreated: true,
                                  type: facilityType,
                                  customType: facilityType === 'other' ? facilityOtherType : undefined,
                                  schoolId: activeSchoolId,
                                  linkedSubjectIds: facilityLinkedSubject.length > 0 ? facilityLinkedSubject : undefined,
                                  capacity: facilityCapacity,
                                  createdAt: new Date().toISOString()
                              } as ClassInfo]);
                              
                              // Reset form
                              setFacilityName('');
                              setFacilityType('lab');
                              setFacilityLinkedSubject([]);
                              setFacilityOtherType('');
                              setFacilityCapacity(1);
                              
                              // Show success message
                              setFacilitySuccess('تم حفظ المرفق');
                              
                              // Hide success message after 3 seconds
                              setTimeout(() => setFacilitySuccess(''), 3000);
                          }}
                          className="w-full py-3 bg-[#655ac1] text-white rounded-xl font-bold hover:bg-[#8779fb] transition-all flex items-center justify-center gap-2"
                      >
                          <Plus size={18} /> إضافة المرفق
                      </button>
                  </div>
              </div>

               {/* List */}
               <div className="md:col-span-8">
                   <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 min-h-[400px]">
                       <h4 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
                          <span>المرافق المدرسية ({classes.filter(c => ['lab', 'computer_lab', 'gym', 'playground', 'other'].includes(c.type || '') && (c.schoolId || 'main') === activeSchoolId).length})</span>
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
                                               c.type?.includes('lab') ? <Layers size={20} /> :
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
                                <MapPin size={40} className="mx-auto mb-3 opacity-20" />
                                <p>لا توجد مرافق مدرسية مضافة</p>
                            </div>
                           )}
                       </div>
                   </div>
               </div>
          </div>
      </div>
  )}

        {/* ══════ Subject Customization Modal (GradeDetailsModal Style) ══════ */}
      {(editingSubjectsClassId || editingSubjectsGrade !== null) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[#e5e1fe] rounded-2xl flex items-center justify-center text-[#655ac1]">
                  <BookOpen size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    {editingSubjectsGrade !== null
                      ? `مواد ${getGradeLabel(editingSubjectsGrade)}`
                      : `مواد ${classes.find(c => c.id === editingSubjectsClassId)?.name || 'الفصل'}`}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">
                    {editingSubjectsGrade !== null ? 'المواد المخصصة لهذا الصف — يمكنك إزالة أي مادة' : 'المواد المخصصة لهذا الفصل'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setEditingSubjectsClassId(null); setEditingSubjectsGrade(null); setEditingSubjectPeriodId(null); }}
                className="p-2.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {(() => {
                const activeSubjectIds: string[] = editingSubjectsGrade !== null
                  ? (gradeSubjectMap[`${activePhase}-${editingSubjectsGrade}`] || [])
                  : (classes.find(c => c.id === editingSubjectsClassId)?.subjectIds || []);

                const activeSubjects = subjects.filter(s => !s.isArchived && activeSubjectIds.includes(s.id));
                const availableSubjects = subjects.filter(s => !s.isArchived && s.phases.includes(activePhase) && !activeSubjectIds.includes(s.id));

                const removeSubject = (subId: string) => {
                  if (editingSubjectsGrade !== null) toggleSubjectForGrade(editingSubjectsGrade, subId);
                  else setClasses(prev => prev.map(c => c.id === editingSubjectsClassId ? { ...c, subjectIds: (c.subjectIds||[]).filter(id=>id!==subId) } : c));
                };
                const addSubject = (subId: string) => {
                  if (editingSubjectsGrade !== null) toggleSubjectForGrade(editingSubjectsGrade, subId);
                  else setClasses(prev => prev.map(c => c.id === editingSubjectsClassId ? { ...c, subjectIds: [...(c.subjectIds||[]), subId] } : c));
                };

                return (
                  <div className="space-y-5">
                    {/* Active subjects */}
                    {activeSubjects.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300">
                        <BookOpen size={36} className="mx-auto mb-3 opacity-30"/>
                        <p className="font-bold text-slate-400">لا توجد مواد مخصصة</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeSubjects.map(subject => (
                          <div key={subject.id}
                            className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-[#f8f7ff] rounded-2xl border border-transparent hover:border-[#e5e1fe] transition-colors group"
                          >
                            <div className="flex-1">
                              <h3 className="font-black text-slate-800 text-base">{subject.name}</h3>
                              {subject.department && <p className="text-xs text-slate-400 font-bold mt-0.5">{subject.department}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              {editingSubjectPeriodId === subject.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="1" max="99"
                                    value={editingSubjectPeriodValue}
                                    onChange={e => setEditingSubjectPeriodValue(e.target.value)}
                                    className="w-16 px-2 py-1.5 border-2 border-[#8779fb] bg-white rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-[#8779fb]/20"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        const v = parseInt(editingSubjectPeriodValue);
                                        if (!isNaN(v) && v > 0) setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, periodsPerClass: v } : s));
                                        setEditingSubjectPeriodId(null);
                                      }
                                      if (e.key === 'Escape') setEditingSubjectPeriodId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      const v = parseInt(editingSubjectPeriodValue);
                                      if (!isNaN(v) && v > 0) setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, periodsPerClass: v } : s));
                                      setEditingSubjectPeriodId(null);
                                    }}
                                    className="p-1.5 bg-[#655ac1] text-white rounded-lg hover:bg-[#5046a0] transition-colors"
                                  >
                                    <Check size={13}/>
                                  </button>
                                  <button onClick={() => setEditingSubjectPeriodId(null)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors">
                                    <X size={13}/>
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="text-center min-w-[56px] bg-white border border-slate-100 rounded-xl px-2 py-1.5 shadow-sm">
                                    <p className="text-base font-black text-[#655ac1]">{subject.periodsPerClass}</p>
                                    <p className="text-[9px] font-bold text-slate-400">حصة</p>
                                  </div>
                                  <div className="w-px h-8 bg-slate-200 rounded-full"/>
                                  <button
                                    onClick={() => { setEditingSubjectPeriodId(subject.id); setEditingSubjectPeriodValue(String(subject.periodsPerClass)); }}
                                    className="p-2 hover:bg-[#e5e1fe] rounded-xl transition-colors text-slate-300 hover:text-[#655ac1]"
                                    title="تعديل عدد الحصص"
                                  >
                                    <Edit2 size={14}/>
                                  </button>
                                  <button
                                    onClick={() => removeSubject(subject.id)}
                                    className="p-2 hover:bg-rose-50 rounded-xl transition-colors text-slate-300 hover:text-rose-500"
                                    title="إزالة المادة"
                                  >
                                    <Trash2 size={14}/>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Available subjects to add */}
                    {availableSubjects.length > 0 && (
                      <div>
                        <p className="text-xs font-black text-slate-400 mb-2 px-1">مواد أخرى يمكن إضافتها</p>
                        <div className="space-y-1.5">
                          {availableSubjects.map(subject => (
                            <div key={subject.id}
                              className="flex items-center gap-4 p-3 rounded-2xl border border-slate-100 hover:border-[#e5e1fe] hover:bg-[#f8f7ff] transition-colors group"
                            >
                              <div className="flex-1">
                                <span className="font-bold text-slate-500 text-sm group-hover:text-slate-700 transition-colors">{subject.name}</span>
                                <span className="text-xs text-slate-400 font-bold mr-2">· {subject.periodsPerClass} حصة</span>
                              </div>
                              <button
                                onClick={() => addSubject(subject.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-[#8779fb] hover:text-[#655ac1] text-slate-400 rounded-xl text-xs font-black transition-all"
                              >
                                <Plus size={13}/> إضافة
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => { setEditingSubjectsClassId(null); setEditingSubjectsGrade(null); setEditingSubjectPeriodId(null); }}
                className="px-7 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold transition-all shadow-md shadow-[#655ac1]/20"
              >
                إغلاق
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
                                     {activeDays.map(day => {
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

    {/* ═══ Bulk Delete Confirmation Modal ═══ */}
    {showBulkDeleteConfirm && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 px-8 pt-8 pb-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4">
              <Trash2 size={32} className="text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">حذف الفصول المحددة</h3>
            <p className="text-sm font-bold text-slate-500 leading-relaxed">
              سيتم حذف{' '}
              <span className="text-rose-600 font-black">{selectedClasses.size} فصل</span>{' '}
              محدد.
              <br />
              <span className="text-rose-600">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
          </div>
          <div className="px-8 py-6 flex gap-3 justify-center">
            <button
              onClick={() => setShowBulkDeleteConfirm(false)}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              إلغاء
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex-1 px-6 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
            >
              <Trash2 size={16} /> نعم، احذف
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ════════════════════════════════════════════════════
         PORTAL: ⋯ Dropdown Menu
       ════════════════════════════════════════════════════ */}
    {portalDropdown && createPortal(
      <div
        className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5"
        style={{ top: portalDropdown.top, left: portalDropdown.left, minWidth: 184 }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => {
            const cls = classes.find(c => c.id === portalDropdown.classId);
            if (cls) { setEditingSubjectsGrade(cls.grade); setPortalDropdown(null); }
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors"
        >
          <BookOpen size={15} className="text-[#8779fb]"/> تخصيص المواد
        </button>
        <button
          onClick={() => {
            setCustomPeriodClassId(portalDropdown.classId);
            setPortalDropdown(null);
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors"
        >
          <Clock size={15} className="text-[#8779fb]"/> تخصيص الحصص
        </button>
        <button
          onClick={() => {
            const cls = classes.find(c => c.id === portalDropdown.classId);
            if (cls) { handleStartEdit(cls); setPortalDropdown(null); }
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors"
        >
          <Pencil size={15} className="text-[#8779fb]"/> تعديل المسمى
        </button>
        <div className="border-t border-slate-100 my-1"/>
        {portalDeleteId === portalDropdown.classId ? (
          <div className="px-4 py-2.5">
            <p className="text-xs text-rose-600 font-bold mb-2">تأكيد الحذݿ</p>
            <div className="flex gap-2">
              <button onClick={() => { handleDeleteOne(portalDropdown.classId); setPortalDropdown(null); setPortalDeleteId(null); }} className="flex-1 py-1.5 bg-rose-500 text-white text-xs rounded-lg font-black">حذف</button>
              <button onClick={() => setPortalDeleteId(null)} className="flex-1 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-lg font-black">إلغاء</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setPortalDeleteId(portalDropdown.classId)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 font-bold transition-colors"
          >
            <Trash2 size={15}/> حذف الفصل
          </button>
        )}
      </div>,
      document.body
    )}

    {/* Custom Period Panel rendered as modal when triggered from portal */}
    {customPeriodClassId && (() => {
      const cls = classes.find(c => c.id === customPeriodClassId);
      if (!cls) return null;
      const displayName = cls.name || getClassroomDisplayName(cls);
      return (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setCustomPeriodClassId(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-800">تخصيص الحصص</h3>
                <p className="text-xs text-slate-400 mt-0.5">{displayName}</p>
              </div>
              <button onClick={() => setCustomPeriodClassId(null)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400"><X size={18}/></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activeDays.map(day => {
                  const defaultCount = currentTiming?.periodCounts?.[day] ?? 7;
                  const customCount  = cls.customPeriodCounts?.[day];
                  const count = customCount ?? defaultCount;
                  const isCustomized = customCount !== undefined && customCount !== defaultCount;
                  return (
                    <div key={day} className="flex flex-col items-center p-4 rounded-2xl border transition-all"
                      style={{ background: isCustomized ? '#e5e1fe' : '#f8fafc', borderColor: isCustomized ? '#8779fb' : '#e2e8f0' }}>
                      <span className="text-xs font-black mb-3" style={{ color: isCustomized ? '#8779fb' : '#475569' }}>
                        {dayLabels[day.toLowerCase()] || day}
                      </span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleCustomPeriodChange(cls.id, day, Math.max(0, count-1))} disabled={count<=0}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all font-bold disabled:opacity-40">−</button>
                        <span className="w-8 text-center text-lg font-black text-slate-800">{count}</span>
                        <button onClick={() => handleCustomPeriodChange(cls.id, day, Math.min(12, count+1))} disabled={count>=12}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-[#8779fb] hover:border-[#e5e1fe] transition-all font-bold disabled:opacity-40">+</button>
                      </div>
                      {isCustomized && <span className="text-[10px] font-bold mt-2 text-[#8779fb]">مخصص</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setCustomPeriodClassId(null)} className="flex-1 py-3 rounded-xl font-black text-white text-sm bg-[#8779fb]">حفظ</button>
              <button onClick={() => { handleResetCustomPeriods(customPeriodClassId); }} className="px-4 py-3 rounded-xl font-black text-slate-500 text-sm bg-slate-100 text-xs">إعادة تعيين</button>
            </div>
          </div>
        </div>
      );
    })()}

    {/* ════════════════════════════════════════════════════
         MODAL: Create Classes Wizard (3 Steps)
       ════════════════════════════════════════════════════ */}
    {wizardOpen && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-800 text-lg">إنشاء الفصول الدراسية</h3>
              <div className="flex items-center gap-2 mt-2">
                {([{n:1,label:'نوع المرحلة'},{n:2,label:'الصفوف'},{n:3,label:'الفصول والتسمية'}] as {n:1|2|3;label:string}[]).map(({n,label},idx) => (
                  <React.Fragment key={n}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                      style={{ background: wizardStep>=n ? '#8779fb' : '#f1f5f9', color: wizardStep>=n ? 'white' : '#94a3b8' }}>
                      {wizardStep>n ? <Check size={13}/> : n}
                    </div>
                    {idx<2 && <div className="w-8 h-0.5 rounded-full" style={{ background: wizardStep>n ? '#8779fb' : '#e2e8f0' }}/>}
                  </React.Fragment>
                ))}
                <span className="text-xs text-slate-400 font-bold mr-2">
                  {wizardStep===1?'نوع المرحلة':wizardStep===2?'الصفوف والمستويات':'الفصول والتسمية'}
                </span>
              </div>
            </div>
            <button onClick={() => setWizardOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400"><X size={18}/></button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {/* Step 1 */}
            {wizardStep === 1 && (
              <div>
                <p className="text-sm text-slate-500 font-bold mb-5">اختر نوع المرحلة لتحميل قالب الصفوف</p>
                <div className="grid grid-cols-2 gap-4">
                  {([
                    {id:'elementary',label:'ابتدائية',desc:'6 صفوف: الأول ← السادس'},
                    {id:'middle',label:'متوسطة',desc:'3 صفوف: الأول ← الثالث المتوسط'},
                    {id:'high',label:'ثانوية',desc:'3 صفوف: الأول ← الثالث الثانوي'},
                    {id:'custom',label:'مخصص بالكامل',desc:'ابدأ بمستوى واحد وأضف ما تريد'},
                  ] as {id:PhaseTemplateW;label:string;desc:string}[]).map(t => {
                    const active = wizardTemplate === t.id;
                    return (
                      <button key={t.id} onClick={() => selectWizardTemplate(t.id)}
                        className="relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 text-center transition-all"
                        style={{ borderColor: active?'#8779fb':'#e2e8f0', background: 'white' }}>
                        {active && (
                          <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-[#8779fb] flex items-center justify-center">
                            <Check size={11} className="text-white"/>
                          </div>
                        )}
                        <LayoutGrid size={26} className="text-[#8779fb]"/>
                        <div>
                          <p className="font-black text-base text-slate-800">{t.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2 */}
            {wizardStep === 2 && (
              <div>
                <p className="text-sm text-slate-500 font-bold mb-4">عدّل أسماء الصفوف أو احذف / أضف مستويات</p>
                <div className="space-y-2">
                  {wizardGrades.map((grade, i) => (
                    <div key={grade.id} className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black text-white flex-shrink-0 bg-[#8779fb]">{i+1}</span>
                      <input
                        className="flex-1 bg-transparent border-b border-slate-200 focus:border-[#8779fb] focus:outline-none text-sm font-bold text-slate-700 pb-1 transition-all"
                        value={grade.name}
                        onChange={e => { const u=[...wizardGrades]; u[i]={...grade,name:e.target.value}; setWizardGrades(u); }}
                      />
                      <button onClick={() => setWizardGrades(wizardGrades.filter((_,j)=>j!==i))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-100 text-slate-300 hover:text-rose-400 transition-all">
                        <X size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setWizardGrades([...wizardGrades,{id:`wg-${Date.now()}`,name:`المستوى ${wizardGrades.length+1}`}])}
                  className="mt-4 flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl border-2 border-dashed transition-all hover:opacity-80"
                  style={{ borderColor:'#8779fb', color:'#8779fb' }}>
                  <Plus size={16}/> إضافة صف / مستوى
                </button>
              </div>
            )}

            {/* Step 3 */}
            {wizardStep === 3 && (
              <div className="space-y-7">
                {/* Stepper */}
                <div>
                  <p className="text-sm font-black text-slate-700 mb-4">عدد الفصول لكل صف</p>
                  <div className="flex items-center gap-5">
                    <button onClick={() => setWizardCount(c=>Math.max(1,c-1))} disabled={wizardCount<=1}
                      className="w-11 h-11 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-rose-300 hover:text-rose-500 font-bold text-2xl transition-all disabled:opacity-40">−</button>
                    <span className="text-4xl font-black w-14 text-center text-[#8779fb]">{wizardCount}</span>
                    <button onClick={() => setWizardCount(c=>Math.min(30,c+1))} disabled={wizardCount>=30}
                      className="w-11 h-11 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-500 font-bold text-2xl transition-all disabled:opacity-40"
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='#8779fb';e.currentTarget.style.color='#8779fb';}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor='';e.currentTarget.style.color='';}}>+</button>
                    <span className="text-xs text-slate-400 font-bold">الحد الأقصى 30</span>
                  </div>
                </div>
                {/* Naming mode */}
                <div>
                  <p className="text-sm font-black text-slate-700 mb-3">طريقة التسمية</p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      {mode:'numbers',label:'أرقام',example:'١/١  ،  ١/٢'},
                      {mode:'name_number',label:'اسم + رقم',example:'الأول / ١'},
                      {mode:'name_letter',label:'اسم + حرف',example:'الأول / أ'},
                    ] as {mode:NamingModeW;label:string;example:string}[]).map(n => {
                      const active = wizardNaming === n.mode;
                      return (
                        <button key={n.mode} onClick={() => setWizardNaming(n.mode)}
                          className="relative p-4 rounded-2xl border-2 text-center transition-all"
                          style={{ borderColor:active?'#8779fb':'#e2e8f0', background:'white' }}>
                          {active && (
                            <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-[#8779fb] flex items-center justify-center">
                              <Check size={9} className="text-white"/>
                            </div>
                          )}
                          <p className="font-black text-sm text-slate-800">{n.label}</p>
                          <p className="text-xs text-slate-400 mt-1 font-bold">{n.example}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Preview */}
                <div>
                  <p className="text-sm font-black text-slate-700 mb-3">معاينة</p>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 max-h-52 overflow-y-auto custom-scrollbar space-y-4">
                    {wizardPreviewNames.map((gradeNames, gi) => (
                      <div key={gi}>
                        <p className="text-xs font-black mb-2 text-[#8779fb]">{wizardGrades[gi]?.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {gradeNames.map((name, si) => (
                            <span key={si} dir="rtl" className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">{name}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 flex gap-3">
            {wizardStep > 1 && (
              <button onClick={() => setWizardStep(s=>(s-1) as 1|2|3)}
                className="px-6 py-3 rounded-xl font-black text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">رجوع</button>
            )}
            {wizardStep < 3 ? (
              <button onClick={() => setWizardStep(s=>(s+1) as 1|2|3)}
                disabled={wizardStep===2 && wizardGrades.length===0}
                className="flex-1 py-3 rounded-xl font-black text-white text-sm disabled:opacity-50 transition-all"
                style={{ background:'#8779fb' }}>التالي</button>
            ) : (
              <button onClick={handleWizardCreate}
                className="flex-1 py-3 rounded-xl font-black text-white text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background:'#8779fb' }}>
                <CheckCircle2 size={18}/> إنشاء الفصول
              </button>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ════════════════════════════════════════════════════
         PORTAL: Toast Notification
       ════════════════════════════════════════════════════ */}
    {toast && createPortal(
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-white border border-slate-100 shadow-2xl px-6 py-4 rounded-2xl animate-in slide-in-from-bottom-4 duration-300" dir="rtl">
        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
          <CheckCircle2 size={18} className="text-emerald-600"/>
        </div>
        <span className="text-sm font-black text-slate-700">{toast}</span>
        <button onClick={() => setToast(null)} className="text-slate-300 hover:text-slate-500 transition-colors mr-2"><X size={14}/></button>
      </div>,
      document.body
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
