import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Teacher, Subject, ClassInfo, Assignment, SchoolInfo, Specialization } from '../../types';
import SchoolTabs from '../wizard/SchoolTabs';
import {
  Search, X, Trash2, ChevronDown, Filter, Check, Layers,
  Printer, Users, CheckCircle2, AlertTriangle, ClipboardList, BookOpen,
  ListFilter, LayoutGrid, Eye, Sparkles, ArrowLeftRight, HelpCircle, ArrowLeft
} from 'lucide-react';
import { useToast } from '../ui/ToastProvider';
import PreviewModal from './PreviewModal';
import PrintModal from './PrintModal';
import { DeleteBySubjectModal, DeleteByTeacherModal } from './DeleteModals';
import { TeacherDetailsModal, TransferTeacherModal } from './TeacherActionModals';

// ── أسماء الصفوف بالعربية (المرتبة) ──
const ARABIC_ORDINALS: Record<number, string> = {
  1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع', 5: 'الخامس',
  6: 'السادس', 7: 'السابع', 8: 'الثامن', 9: 'التاسع', 10: 'العاشر',
  11: 'الحادي عشر', 12: 'الثاني عشر',
};

interface Props {
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  subjects: Subject[];
  classes: ClassInfo[];
  assignments: Assignment[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  specializations: Specialization[];
  schoolInfo: SchoolInfo;
  gradeSubjectMap: Record<string, string[]>;
}

interface ConfirmDialog {
  title: string;
  message: string;
  confirmLabel?: string;
  type: 'danger' | 'warning';
  onConfirm: () => void;
}

const AssignmentPage: React.FC<Props> = ({
  teachers, subjects, classes, assignments, setAssignments,
  schoolInfo, gradeSubjectMap, specializations
}) => {
  const { showToast } = useToast();

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  const sharedSchools = schoolInfo.sharedSchools || [];
  const hasSharedSchools = sharedSchools.length > 0;
  const [activeSchoolTab, setActiveSchoolTab] = useState<string>('main');

  const [teacherFilterSearch, setTeacherFilterSearch] = useState('');
  const [specSearch, setSpecSearch] = useState('');
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [selectedTeacherFilterIds, setSelectedTeacherFilterIds] = useState<string[]>([]);

  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  const [showSpecDropdown, setShowSpecDropdown] = useState(false);
  const [showTeacherFilterDropdown, setShowTeacherFilterDropdown] = useState(false);
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  // ── مودالات المرحلة 3 ──
  const [showPreview, setShowPreview] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showDeleteBySubject, setShowDeleteBySubject] = useState(false);
  const [showDeleteByTeacher, setShowDeleteByTeacher] = useState(false);

  // ── وضع التحديد الفردي للحذف ──
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set()); // `${classId}::${subjectId}`

  // ── toast التراجع للعمليات الكبيرة ──
  const [undoSnapshot, setUndoSnapshot] = useState<{ before: Assignment[]; label: string } | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  // ── مودالات إجراءات المعلم ──
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [transferringTeacher, setTransferringTeacher] = useState<Teacher | null>(null);

  const specDropdownRef = useRef<HTMLDivElement>(null);
  const teacherFilterDropdownRef = useRef<HTMLDivElement>(null);
  const gradeDropdownRef = useRef<HTMLDivElement>(null);
  const classDropdownRef = useRef<HTMLDivElement>(null);
  const deleteMenuRef = useRef<HTMLDivElement>(null);

  // ─── helpers ───
  // أسماء الصفوف: من targetGradeNames في المواد إن وُجدت، وإلا الترتيب العربي
  const gradeDisplayNames = useMemo(() => {
    const names: Record<number, string> = {};
    subjects.forEach(sub => {
      if (sub.targetGrades && sub.targetGradeNames) {
        sub.targetGrades.forEach((g, idx) => {
          if (sub.targetGradeNames![idx]) names[g] = sub.targetGradeNames![idx];
        });
      }
    });
    return names;
  }, [subjects]);
  const getGradeLabel = (g: number) => gradeDisplayNames[g] || ARABIC_ORDINALS[g] || String(g);

  const currentSchoolPhases = activeSchoolTab === 'main'
    ? schoolInfo.phases
    : (sharedSchools.find(s => s.id === activeSchoolTab)?.phases || schoolInfo.phases);

  const isClassInCurrentSchool = (c: { schoolId?: string }) => {
    if (!hasSharedSchools) return true;
    if (activeSchoolTab === 'main') return !c.schoolId || c.schoolId === 'main';
    return c.schoolId === activeSchoolTab;
  };

  const isAssignableClass = (c?: Pick<ClassInfo, 'type'> | null) => {
    return !!c && (!c.type || c.type === 'class');
  };

  const isTeacherInCurrentSchool = (t: { schoolId?: string; isShared?: boolean; schools?: { schoolId: string }[] }) => {
    if (!hasSharedSchools) return true;
    if (t.isShared) {
      const originalId = t.schoolId || 'main';
      if (activeSchoolTab === originalId) return true;
      return (t.schools || []).some(s => s.schoolId === activeSchoolTab);
    }
    if (activeSchoolTab === 'main') return !t.schoolId || t.schoolId === 'main';
    return t.schoolId === activeSchoolTab;
  };

  const getGradeSubjectIds = (cls: { phase: string; grade: number; schoolId?: string }): string[] => {
    const schoolId = cls.schoolId || 'main';
    return (
      gradeSubjectMap[`${schoolId}-${cls.phase}-${cls.grade}`] ||
      gradeSubjectMap[`${cls.phase}-${cls.grade}`] ||
      []
    );
  };

  const getTeacherLoad = (tId: string, source: Assignment[] = assignments) => {
    return source.filter(a => {
      if (a.teacherId !== tId) return false;
      const cls = classes.find(c => c.id === a.classId);
      return isAssignableClass(cls);
    }).reduce((total, a) => {
      const sub = subjects.find(s => s.id === a.subjectId);
      return total + (sub?.periodsPerClass || 0);
    }, 0);
  };

  const getTeacherLoadForSchool = (tId: string, schoolId = activeSchoolTab, source: Assignment[] = assignments) => {
    return source.filter(a => {
      if (a.teacherId !== tId) return false;
      const cls = classes.find(c => c.id === a.classId);
      return isAssignableClass(cls) && (cls?.schoolId || 'main') === schoolId;
    }).reduce((total, a) => {
      const sub = subjects.find(s => s.id === a.subjectId);
      return total + (sub?.periodsPerClass || 0);
    }, 0);
  };

  const getTeacherLessonQuotaForSchool = (teacher: Teacher, schoolId = activeSchoolTab) => {
    if (teacher.isShared || teacher.schools?.length) {
      const originalSchoolId = teacher.schoolId || 'main';
      const entry = teacher.schools?.find(s => s.schoolId === schoolId);
      if (entry) return schoolId === originalSchoolId ? (entry.lessons || teacher.quotaLimit || 0) : (entry.lessons || 0);
      if (schoolId === originalSchoolId) return teacher.quotaLimit || 0;
    }
    return teacher.quotaLimit || 0;
  };

  const getTeacherTotalLessonQuota = (teacher: Teacher) => {
    if (!teacher.isShared || !teacher.schools?.length) return getTeacherLessonQuotaForSchool(teacher);
    const originalSchoolId = teacher.schoolId || 'main';
    const originalQuota = teacher.schools.find(s => s.schoolId === originalSchoolId)?.lessons || teacher.quotaLimit || 0;
    const otherQuotas = teacher.schools
      .filter(s => s.schoolId !== originalSchoolId)
      .reduce((sum, s) => sum + (s.lessons || 0), 0);
    return originalQuota + otherQuotas;
  };

  const getTeacherEffectiveLoad = (teacher: Teacher, source: Assignment[] = assignments) => {
    return teacher.isShared ? getTeacherLoad(teacher.id, source) : getTeacherLoadForSchool(teacher.id, activeSchoolTab, source);
  };

  const getTeacherEffectiveQuota = (teacher: Teacher) => {
    return teacher.isShared ? getTeacherTotalLessonQuota(teacher) : getTeacherLessonQuotaForSchool(teacher);
  };

  // هل المادة من تخصص المعلم؟
  const matchesTeacherSpec = (sub: Subject, teacher: Teacher) => {
    return !!sub.specializationIds && sub.specializationIds.includes(teacher.specializationId);
  };

  // ─── stats ───
  const stats = useMemo(() => {
    let totalPeriods = 0, totalSubjects = 0;
    let assignedPeriods = 0, assignedSubjects = 0;
    let unassignedClasses = 0;
    classes
      .filter(c => isAssignableClass(c) && currentSchoolPhases.includes(c.phase) && isClassInCurrentSchool(c))
      .forEach(cls => {
        const relevant = subjects.filter(s =>
          !s.isArchived &&
          (getGradeSubjectIds(cls).includes(s.id) || cls.subjectIds?.includes(s.id))
        );
        const uniq = Array.from(new Map(relevant.map(s => [s.id, s])).values());
        let classAssigned = 0;
        uniq.forEach(s => {
          totalPeriods += s.periodsPerClass;
          totalSubjects += 1;
          const a = assignments.find(x => x.classId === cls.id && x.subjectId === s.id);
          if (a) {
            assignedPeriods += s.periodsPerClass;
            assignedSubjects += 1;
            classAssigned += 1;
          }
        });
        if (uniq.length > 0 && classAssigned < uniq.length) unassignedClasses += 1;
      });
    return {
      totalPeriods, assignedPeriods, unassignedPeriods: totalPeriods - assignedPeriods,
      totalSubjects, assignedSubjects, unassignedSubjects: totalSubjects - assignedSubjects,
      unassignedClasses,
    };
  }, [classes, subjects, assignments, currentSchoolPhases, activeSchoolTab, gradeSubjectMap]);

  // ─── derived ───
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchId = selectedTeacherFilterIds.length === 0 || selectedTeacherFilterIds.includes(t.id);
      const matchSpec = selectedSpecs.length === 0 || selectedSpecs.includes(t.specializationId);
      const matchSchool = isTeacherInCurrentSchool(t);
      return matchId && matchSpec && matchSchool;
    });
  }, [teachers, selectedTeacherFilterIds, selectedSpecs, activeSchoolTab]);

  const availableSpecializations = useMemo(() => {
    const used = new Set(teachers.map(t => t.specializationId));
    return specializations.filter(s => used.has(s.id));
  }, [teachers, specializations]);

  const activeGrades = useMemo(() => {
    const grades = new Set<number>();
    classes.forEach(c => {
      if (isAssignableClass(c) && currentSchoolPhases.includes(c.phase) && isClassInCurrentSchool(c)) grades.add(c.grade);
    });
    return Array.from(grades).sort((a, b) => a - b);
  }, [classes, currentSchoolPhases, activeSchoolTab]);

  const availableClassesForDropdown = useMemo(() => {
    return classes.filter(c => {
      const phaseMatch = currentSchoolPhases.includes(c.phase);
      const schoolMatch = isClassInCurrentSchool(c);
      const gradeMatch = selectedGrades.length === 0 || selectedGrades.includes(c.grade);
      return isAssignableClass(c) && phaseMatch && schoolMatch && gradeMatch;
    });
  }, [classes, currentSchoolPhases, selectedGrades, activeSchoolTab]);

  const currentSchoolClassCount = useMemo(() => {
    return classes.filter(c => isAssignableClass(c) && currentSchoolPhases.includes(c.phase) && isClassInCurrentSchool(c)).length;
  }, [classes, currentSchoolPhases, activeSchoolTab]);

  const displayedGrades = useMemo(() => {
    if (selectedGrades.length > 0) return [...selectedGrades].sort((a, b) => a - b);
    if (selectedClassIds.length > 0) {
      const g = new Set<number>();
      selectedClassIds.forEach(id => {
        const c = classes.find(x => x.id === id);
        if (isAssignableClass(c)) g.add(c.grade);
      });
      return Array.from(g).sort((a, b) => a - b);
    }
    return activeGrades;
  }, [selectedGrades, selectedClassIds, activeGrades, classes]);

  const displayedClasses = (grade: number) => {
    let g = classes.filter(c => isAssignableClass(c) && currentSchoolPhases.includes(c.phase) && c.grade === grade && isClassInCurrentSchool(c));
    if (selectedClassIds.length > 0) g = g.filter(c => selectedClassIds.includes(c.id));
    return g;
  };

  const selectedTeacher = useMemo(
    () => teachers.find(t => t.id === selectedTeacherId) || null,
    [teachers, selectedTeacherId]
  );

  // ─── tab switch ───
  const switchSchoolTab = (tabId: string) => {
    setActiveSchoolTab(tabId);
    setSelectedTeacherId(null);
    setSelectedTeacherFilterIds([]);
    setSelectedGrades([]);
    setSelectedClassIds([]);
    setSelectedSpecs([]);
  };

  // ─── simple change applier (no history) ───
  const applyChange = (next: Assignment[]) => setAssignments(next);

  // ─── applier مع toast تراجع للعمليات الكبيرة (10 ثوانٍ) ───
  const applyChangeWithUndo = (label: string, next: Assignment[]) => {
    const before = assignments;
    setAssignments(next);
    setUndoSnapshot({ before, label });
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => setUndoSnapshot(null), 10000);
  };
  const performUndo = () => {
    if (!undoSnapshot) return;
    setAssignments(undoSnapshot.before);
    setUndoSnapshot(null);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    showToast('تم التراجع عن العملية', 'info');
  };

  // ─── معلومات المدرسة الحالية ──
  const currentSchoolLabel = activeSchoolTab === 'main'
    ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
    : (sharedSchools.find(s => s.id === activeSchoolTab)?.name || activeSchoolTab);

  // ─── handlers: المرحلة 3 ───
  const handleDeleteBySubjectConfirm = (assignmentIds: string[]) => {
    if (assignmentIds.length === 0) {
      setShowDeleteBySubject(false);
      return;
    }
    const idSet = new Set(assignmentIds);
    applyChangeWithUndo(`حذف ${assignmentIds.length} إسناد`, assignments.filter(a => !idSet.has(a.id)));
    setShowDeleteBySubject(false);
  };

  const handleDeleteByTeacherConfirm = (teacherIds: string[]) => {
    const removed = assignments.filter(a => {
      if (!teacherIds.includes(a.teacherId)) return false;
      const cls = classes.find(c => c.id === a.classId);
      return isAssignableClass(cls) && (cls?.schoolId || 'main') === activeSchoolTab;
    });
    if (removed.length === 0) {
      setShowDeleteByTeacher(false);
      showToast('لا توجد إسنادات للحذف', 'info');
      return;
    }
    setConfirmDialog({
      title: 'تأكيد حذف إسنادات المعلمين',
      message: `سيتم حذف ${removed.length} إسناد لـ ${teacherIds.length} معلم في "${currentSchoolLabel}". إسنادات هؤلاء المعلمين في المدارس الأخرى لن تتأثر.`,
      confirmLabel: 'حذف',
      type: 'danger',
      onConfirm: () => {
        applyChangeWithUndo(`حذف ${removed.length} إسناد حسب المعلم`, assignments.filter(a => !removed.includes(a)));
        setShowDeleteByTeacher(false);
      },
    });
  };

  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedCells(new Set());
    setSelectedTeacherId(null);
    setShowDeleteMenu(false);
    showToast('وضع التحديد: اضغط على الإسنادات لتحديدها ثم اضغط حذف', 'info');
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedCells(new Set());
  };

  const toggleCellSelection = (classId: string, subjectId: string) => {
    const key = `${classId}::${subjectId}`;
    const next = new Set(selectedCells);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelectedCells(next);
  };

  const handleTransferConfirm = (targetId: string, selectedKeys: Set<string>) => {
    if (!transferringTeacher) return;
    const source = transferringTeacher;
    const target = teachers.find(t => t.id === targetId);
    if (!target) return;

    // الإسنادات المختارة فقط (في المدرسة الحالية)
    const sourceAssns = assignments.filter(a => {
      if (a.teacherId !== source.id) return false;
      const cls = classes.find(c => c.id === a.classId);
      if (!isAssignableClass(cls) || (cls?.schoolId || 'main') !== activeSchoolTab) return false;
      return selectedKeys.has(`${a.classId}::${a.subjectId}`);
    });
    if (sourceAssns.length === 0) {
      setTransferringTeacher(null);
      showToast('لا توجد إسنادات للنقل', 'info');
      return;
    }

    const sourcePeriods = sourceAssns.reduce((s, a) => s + (subjects.find(x => x.id === a.subjectId)?.periodsPerClass || 0), 0);
    const targetLoad = getTeacherEffectiveLoad(target);
    const targetQuota = getTeacherEffectiveQuota(target);
    const afterLoad = targetLoad + sourcePeriods;
    const willOverflow = targetQuota > 0 && afterLoad > targetQuota;

    const doTransfer = () => {
      const next = assignments.map(a => {
        if (a.teacherId !== source.id) return a;
        const cls = classes.find(c => c.id === a.classId);
        if (!isAssignableClass(cls) || (cls?.schoolId || 'main') !== activeSchoolTab) return a;
        if (!selectedKeys.has(`${a.classId}::${a.subjectId}`)) return a;
        return { ...a, teacherId: target.id };
      });
      applyChangeWithUndo(`نقل ${sourceAssns.length} إسناد من ${source.name} إلى ${target.name}`, next);
      setTransferringTeacher(null);
    };

    if (willOverflow) {
      setConfirmDialog({
        title: 'تجاوز النصاب',
        message: `سيتجاوز ${target.name} نصابه (${afterLoad}/${targetQuota}). متابعة؟`,
        confirmLabel: 'متابعة',
        type: 'danger',
        onConfirm: doTransfer,
      });
      return;
    }
    doTransfer();
  };

  const confirmDeleteSelected = () => {
    if (selectedCells.size === 0) return;
    const pairs = Array.from(selectedCells).map(k => {
      const [classId, subjectId] = k.split('::');
      return { classId, subjectId };
    });
    setConfirmDialog({
      title: 'حذف الإسنادات المحددة',
      message: `سيتم حذف ${pairs.length} إسناد. لا يمكن التراجع.`,
      confirmLabel: 'حذف',
      type: 'danger',
      onConfirm: () => {
        const next = assignments.filter(a => !pairs.some(p => p.classId === a.classId && p.subjectId === a.subjectId));
        applyChangeWithUndo(`حذف ${pairs.length} إسناد محدد`, next);
        setSelectionMode(false);
        setSelectedCells(new Set());
      },
    });
  };

  // ─── single-cell actions ───
  const handleCellClick = (classId: string, subjectId: string) => {
    // وضع التحديد للحذف يحظى بالأولوية
    if (selectionMode) {
      const existing = assignments.find(a => a.classId === classId && a.subjectId === subjectId);
      if (!existing) {
        showToast('لا يمكن تحديد خلية غير مسندة', 'warning');
        return;
      }
      toggleCellSelection(classId, subjectId);
      return;
    }

    const existing = assignments.find(a => a.classId === classId && a.subjectId === subjectId);
    const cls = classes.find(c => c.id === classId);
    const sub = subjects.find(s => s.id === subjectId);
    if (!isAssignableClass(cls)) {
      showToast('لا يمكن إسناد المواد للمعامل أو المرافق', 'warning');
      return;
    }
    if (!selectedTeacherId) {
      if (existing) {
        const t = teachers.find(x => x.id === existing.teacherId);
        showToast(`مسندة لـ ${t?.name || 'معلم'} — اختر معلمًا لإعادة الإسناد`, 'info');
      } else {
        showToast('اختر معلمًا أولًا من القائمة', 'warning');
      }
      return;
    }
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    if (!teacher || !sub || !cls) return;

    const effectiveQuota = getTeacherEffectiveQuota(teacher);
    const hasQuotaLimit = effectiveQuota > 0;
    const newLoad = getTeacherEffectiveLoad(teacher) + sub.periodsPerClass;

    const doAssign = () => {
      const filtered = assignments.filter(a => !(a.classId === classId && a.subjectId === subjectId));
      applyChange([...filtered, { teacherId: selectedTeacherId, classId, subjectId }]);
      showToast(`✓ تم إسناد "${sub.name}" — فصل ${cls.grade}/${cls.section}`, 'success');
    };

    if (existing && existing.teacherId !== selectedTeacherId) {
      const oldTeacher = teachers.find(x => x.id === existing.teacherId);
      setConfirmDialog({
        title: 'استبدال الإسناد',
        message: `هذه المادة مسندة حاليًا لـ "${oldTeacher?.name || 'معلم'}". هل تستبدل بـ "${teacher.name}"؟`,
        confirmLabel: 'استبدال',
        type: 'warning',
        onConfirm: () => {
          if (hasQuotaLimit && newLoad > effectiveQuota) {
            setConfirmDialog({
              title: 'تجاوز النصاب',
              message: `سيتجاوز ${teacher.name} نصابه الأساسي (${newLoad}/${effectiveQuota}). هل تريد المتابعة؟`,
              confirmLabel: 'متابعة',
              type: 'danger',
              onConfirm: doAssign,
            });
            return;
          }
          doAssign();
        },
      });
      return;
    }
    if (existing && existing.teacherId === selectedTeacherId) return;
    if (hasQuotaLimit && newLoad > effectiveQuota) {
      setConfirmDialog({
        title: 'تجاوز النصاب الكلي',
        message: `هذا الإسناد سيرفع نصاب ${teacher.name} إلى (${newLoad}/${effectiveQuota}) حصة، وهذا يتجاوز نصابه الأساسي. هل تريد المتابعة؟`,
        confirmLabel: 'متابعة',
        type: 'danger',
        onConfirm: doAssign,
      });
      return;
    }
    doAssign();
  };

  const handleUnassign = (classId: string, subjectId: string) => {
    const cls = classes.find(c => c.id === classId);
    const sub = subjects.find(s => s.id === subjectId);
    if (!cls || !sub || !isAssignableClass(cls)) return;
    const assignment = assignments.find(a => a.classId === classId && a.subjectId === subjectId);
    if (!assignment || assignment.teacherId !== selectedTeacherId) {
      showToast('اختر المعلم المسندة له المادة قبل إلغاء الإسناد', 'warning');
      return;
    }
    applyChangeWithUndo(`إلغاء إسناد "${sub.name}" — فصل ${cls.grade}/${cls.section}`, assignments.filter(a => !(a.classId === classId && a.subjectId === subjectId)));
  };

  const handleDeleteAll = () => {
    const currentSchool = activeSchoolTab;
    const currentAssns = assignments.filter(a => {
      const cls = classes.find(c => c.id === a.classId);
      return isAssignableClass(cls) && (cls?.schoolId || 'main') === currentSchool;
    });
    if (currentAssns.length === 0) {
      showToast('لا توجد إسنادات للحذف', 'info');
      return;
    }
    const schoolLabel = currentSchool === 'main'
      ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
      : (sharedSchools.find(s => s.id === currentSchool)?.name || currentSchool);
    setConfirmDialog({
      title: 'حذف كل الإسنادات',
      message: `سيتم حذف جميع الإسنادات في "${schoolLabel}" نهائيًا. إسنادات المدارس الأخرى لن تتأثر. لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: 'حذف كل الإسنادات',
      type: 'danger',
      onConfirm: () => {
        const next = assignments.filter(a => {
          const cls = classes.find(c => c.id === a.classId);
          return !isAssignableClass(cls) || (cls?.schoolId || 'main') !== currentSchool;
        });
        applyChangeWithUndo(`حذف الكل في ${schoolLabel} (${currentAssns.length} إسناد)`, next);
      },
    });
  };

  // ─── dropdown outside-click ───
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (specDropdownRef.current && !specDropdownRef.current.contains(e.target as Node)) setShowSpecDropdown(false);
      if (teacherFilterDropdownRef.current && !teacherFilterDropdownRef.current.contains(e.target as Node)) setShowTeacherFilterDropdown(false);
      if (gradeDropdownRef.current && !gradeDropdownRef.current.contains(e.target as Node)) setShowGradeDropdown(false);
      if (classDropdownRef.current && !classDropdownRef.current.contains(e.target as Node)) setShowClassDropdown(false);
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(e.target as Node)) setShowDeleteMenu(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const toggleTeacherFilter = (id: string) =>
    setSelectedTeacherFilterIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  const toggleSpec = (id: string) =>
    setSelectedSpecs(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  const toggleGradeFilter = (g: number) =>
    setSelectedGrades(p => p.includes(g) ? p.filter(i => i !== g) : [...p, g]);
  const toggleClassFilter = (id: string) =>
    setSelectedClassIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  // ──────────── RENDER ────────────
  return (
    <div className={`space-y-8 animate-in fade-in duration-500 ${selectionMode ? 'pb-28' : 'pb-12'}`}>

      {/* ── مودال التأكيد ── */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md mx-4 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 flex items-start gap-3">
              {confirmDialog.type === 'danger' ? (
                confirmDialog.title.includes('تجاوز') ? (
                  <AlertTriangle size={28} className="text-rose-500 mt-0.5 shrink-0" />
                ) : (
                  <Trash2 size={28} className="text-rose-500 mt-0.5 shrink-0" />
                )
              ) : (
                <AlertTriangle size={28} className="text-amber-500 mt-0.5 shrink-0" />
              )}
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-2">{confirmDialog.title}</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed whitespace-pre-line">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors">إلغاء</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white transition-colors shadow-md ${confirmDialog.type === 'danger' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' : 'bg-[#655ac1] hover:bg-[#5448a8] shadow-[#655ac1]/20'}`}>
                {confirmDialog.confirmLabel || 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Header ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300 mb-6">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
          <ClipboardList size={36} strokeWidth={1.8} className="text-[#655ac1]" />
          إسناد المواد
        </h3>
        <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إسناد المواد للمعلمين بطريقة تفاعلية سهلة</p>
      </div>

      {/* ══════ Stats + Tabs + Action Bar ══════ */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col gap-4">

          {hasSharedSchools && (
            <SchoolTabs
              schoolInfo={schoolInfo}
              activeSchoolId={activeSchoolTab}
              onTabChange={switchSchoolTab}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center text-[#655ac1]">
                <BookOpen size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400">حصص غير مسندة</p>
                <p className="text-2xl font-black text-[#655ac1] leading-tight">
                  {stats.unassignedPeriods}
                  <span className="text-sm font-black text-slate-800 mr-1">/ {stats.totalPeriods}</span>
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center text-[#655ac1]">
                <Layers size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400">مواد غير مسندة</p>
                <p className="text-2xl font-black text-[#655ac1] leading-tight">
                  {stats.unassignedSubjects}
                  <span className="text-sm font-black text-slate-800 mr-1">/ {stats.totalSubjects}</span>
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center text-[#655ac1]">
                <LayoutGrid size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400">فصول غير مكتملة</p>
                <p className="text-2xl font-black text-[#655ac1] leading-tight">{stats.unassignedClasses}</p>
              </div>
            </div>
          </div>

          <div dir="rtl" className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-2 justify-start">
            <button className="inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 bg-[#655ac1] text-white border-[#655ac1] shadow-sm">
              <ClipboardList size={16} className="text-white" />
              إسناد المواد
            </button>
            <button onClick={() => setShowPreview(true)} className="inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 bg-white text-slate-700 border-slate-200 hover:border-[#655ac1]">
              <Eye size={16} className="text-slate-500" />
              معاينة الإسناد
            </button>

            <div className="w-px h-8 bg-slate-200 mx-1" />

            <button onClick={() => setShowPrint(true)} className="inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 bg-white text-slate-700 border-slate-200 hover:border-[#655ac1]">
              <Printer size={16} className="text-slate-500" />
              طباعة الإسناد
            </button>

            {/* حذف محدد */}
            <div className="relative" ref={deleteMenuRef}>
              <button
                onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                className={`inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:border-rose-300 ${showDeleteMenu ? 'ring-2 ring-rose-100 border-rose-300' : ''}`}
              >
                <Trash2 size={16} className="text-red-500" strokeWidth={2.2} />
                حذف
                <ChevronDown size={12} className={`text-slate-400 transition-transform ${showDeleteMenu ? 'rotate-180' : ''}`} />
              </button>
              {showDeleteMenu && (
                <div className="absolute z-50 top-full mt-2 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 animate-in slide-in-from-top-2">
                  <button
                    onClick={() => { setShowDeleteBySubject(true); setShowDeleteMenu(false); }}
                    className="w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-colors hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                  >
                    <div className="flex-1">
                      <div className="text-xs font-black text-slate-800">حذف إسنادات فصل</div>
                    </div>
                    <span className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white inline-flex items-center justify-center shrink-0">
                      <Check size={12} strokeWidth={3.5} className="text-transparent" />
                    </span>
                  </button>
                  <button
                    onClick={() => { setShowDeleteByTeacher(true); setShowDeleteMenu(false); }}
                    className="w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-colors hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                  >
                    <div className="flex-1">
                      <div className="text-xs font-black text-slate-800">حذف إسنادات معلم</div>
                    </div>
                    <span className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white inline-flex items-center justify-center shrink-0">
                      <Check size={12} strokeWidth={3.5} className="text-transparent" />
                    </span>
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => { setShowDeleteMenu(false); handleDeleteAll(); }}
                    disabled={stats.assignedSubjects === 0}
                    className="w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-colors hover:bg-rose-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white flex items-center gap-2"
                  >
                    <div className="flex-1">
                      <div className="text-xs font-black text-rose-600">حذف كل الإسنادات</div>
                    </div>
                    <Trash2 size={16} className="text-rose-500 shrink-0" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════ Workspace ══════ */}
      <div className="flex flex-col lg:flex-row items-start gap-4">

        {/* ── جانب المعلمين ── */}
        <aside dir="rtl" className="w-full lg:w-96 shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] bg-white rounded-[2rem] p-4 shadow-sm border border-slate-200 flex flex-col">

          <div className="flex items-center gap-3 justify-between mb-3">
            <div className="flex items-center gap-3">
              <Users size={24} className="text-[#655ac1]" />
              <div>
                <span className="text-lg font-black text-slate-800">المعلمون</span>
                <span className="text-xs bg-white border border-slate-300 text-[#655ac1] px-2 py-0.5 rounded-lg font-black mr-2">{filteredTeachers.length}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="relative" ref={teacherFilterDropdownRef}>
              <button
                onClick={() => setShowTeacherFilterDropdown(!showTeacherFilterDropdown)}
                className={`w-full px-3 py-2.5 bg-white border-2 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 text-xs ${showTeacherFilterDropdown ? 'border-[#655ac1]/40 ring-2 ring-[#8779fb]/20' : 'border-slate-200'}`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <ListFilter size={13} className="text-slate-400 shrink-0" />
                  {selectedTeacherFilterIds.length > 0 ? `(${selectedTeacherFilterIds.length})` : 'كل المعلمين'}
                </span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform shrink-0 ${showTeacherFilterDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showTeacherFilterDropdown && (() => {
                const schoolTeachers = teachers.filter(isTeacherInCurrentSchool);
                const term = teacherFilterSearch.trim().toLowerCase();
                const visible = !term ? schoolTeachers : schoolTeachers.filter(t => t.name.toLowerCase().includes(term));
                return (
                <div className="absolute z-50 top-full mt-2 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 animate-in slide-in-from-top-2">
                  <div className="relative mb-2">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="بحث عن معلم..."
                      value={teacherFilterSearch}
                      onChange={e => setTeacherFilterSearch(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#655ac1]/20 focus:border-[#655ac1] outline-none transition-all"
                    />
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {visible.map(t => {
                      const active = selectedTeacherFilterIds.includes(t.id);
                      return (
                        <button key={t.id} onClick={() => toggleTeacherFilter(t.id)} className={`w-full text-right px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-between gap-2 ${active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}>
                          <span className="truncate">{t.name}</span>
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                            <Check size={12} strokeWidth={3.5} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                );
              })()}
            </div>

            <div className="relative" ref={specDropdownRef}>
              <button
                onClick={() => setShowSpecDropdown(!showSpecDropdown)}
                className={`w-full px-3 py-2.5 bg-white border-2 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 text-xs ${showSpecDropdown ? 'border-[#655ac1]/40 ring-2 ring-[#8779fb]/20' : 'border-slate-200'}`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Filter size={13} className="text-slate-400 shrink-0" />
                  {selectedSpecs.length ? `(${selectedSpecs.length})` : 'كل التخصصات'}
                </span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform shrink-0 ${showSpecDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showSpecDropdown && (() => {
                const term = specSearch.trim().toLowerCase();
                const visible = !term ? availableSpecializations : availableSpecializations.filter(s => s.name.toLowerCase().includes(term));
                return (
                <div className="absolute z-50 top-full mt-2 left-0 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 animate-in slide-in-from-top-2">
                  <div className="relative mb-2">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="بحث عن تخصص..."
                      value={specSearch}
                      onChange={e => setSpecSearch(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#655ac1]/20 focus:border-[#655ac1] outline-none transition-all"
                    />
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {visible.map(s => {
                      const active = selectedSpecs.includes(s.id);
                      return (
                        <button key={s.id} onClick={() => toggleSpec(s.id)} className={`w-full text-right px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-between gap-2 ${active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}>
                          <span className="truncate">{s.name}</span>
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                            <Check size={12} strokeWidth={3.5} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                );
              })()}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pt-1">
            {filteredTeachers.length > 0 ? filteredTeachers.map(t => {
              const load = getTeacherLoad(t.id);
              const isSelected = selectedTeacherId === t.id;
              const spec = specializations.find(s => s.id === t.specializationId)?.name || 'عام';
              // المعلم المشترك: شريطان لكل مدرسة
              const isShared = !!t.isShared && (t.schools?.length || 0) > 0;
              const sharedSchoolsArr: { id: string; name: string; quota: number; load: number }[] = [];
              if (isShared) {
                const originalId = t.schoolId || 'main';
                const allSchoolEntries = [
                  { schoolId: originalId, schoolName: originalId === 'main' ? (schoolInfo.schoolName || 'المدرسة الرئيسية') : (sharedSchools.find(s => s.id === originalId)?.name || originalId), lessons: (t.schools || []).find(s => s.schoolId === originalId)?.lessons || t.quotaLimit || 0 },
                  ...((t.schools || []).filter(s => s.schoolId !== originalId)),
                ];
                allSchoolEntries.forEach(entry => {
                  const sid = entry.schoolId;
                  const sname = (entry as any).schoolName || (sid === 'main' ? (schoolInfo.schoolName || 'المدرسة الرئيسية') : (sharedSchools.find(s => s.id === sid)?.name || sid));
                  const sQuota = sid === originalId ? (((entry as any).lessons || t.quotaLimit || 0)) : ((entry as any).lessons || 0);
                  const sLoad = assignments
                    .filter(a => {
                      const cls = classes.find(c => c.id === a.classId);
                      return a.teacherId === t.id && isAssignableClass(cls) && (cls?.schoolId || 'main') === sid;
                    })
                    .reduce((sum, a) => sum + (subjects.find(x => x.id === a.subjectId)?.periodsPerClass || 0), 0);
                  sharedSchoolsArr.push({ id: sid, name: sname, quota: sQuota, load: sLoad });
                });
              }
              const totalQuota = isShared
                ? sharedSchoolsArr.reduce((s, x) => s + x.quota, 0)
                : getTeacherLessonQuotaForSchool(t);
              const isOver = totalQuota > 0 && load >= totalQuota;
              const isHigh = !isOver && totalQuota > 0 && load >= totalQuota / 2;
              const progressColor = isOver ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-500';
              const progress = totalQuota > 0 ? Math.min(100, Math.round((load / totalQuota) * 100)) : 0;
              const hasAssignments = load > 0;
              return (
                <div
                  key={t.id}
                  onClick={() => !selectionMode && setSelectedTeacherId(isSelected ? null : t.id)}
                  className={`rounded-2xl overflow-hidden border bg-white transition-all cursor-pointer p-3 ${isSelected ? 'border-slate-300 ring-2 ring-slate-200 shadow-md' : 'border-slate-200 hover:border-slate-300'} ${selectionMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 mb-1">
                        <h4 className={`text-sm font-black truncate ${isSelected ? 'text-[#655ac1]' : 'text-slate-800'}`}>{t.name}</h4>
                        {isSelected && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#655ac1] text-white shrink-0">
                            <Check size={12} strokeWidth={3.5} />
                          </span>
                        )}
                        {isShared && (
                          <span title="معلم مشترك" className="shrink-0 text-[#655ac1]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <span className={`text-[13px] font-bold truncate block ${isSelected ? 'text-slate-500' : 'text-[#655ac1]'}`}>{spec}</span>
                    </div>
                    {/* أزرار الإجراءات — مكدّسة عموديًا */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewingTeacher(t); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#655ac1] hover:bg-[#f0edff] transition-all"
                        title="عرض الإسنادات"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (hasAssignments) setTransferringTeacher(t); else showToast('لا توجد إسنادات للنقل', 'info'); }}
                        disabled={!hasAssignments}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                        title="نقل الإسنادات لمعلم آخر"
                      >
                        <ArrowLeftRight size={14} />
                      </button>
                    </div>
                  </div>
                  {isShared && sharedSchoolsArr.length > 0 ? (
                    <div className="space-y-2">
                      {sharedSchoolsArr.map(sc => {
                        const scOver = sc.quota > 0 && sc.load >= sc.quota;
                        const scHigh = !scOver && sc.quota > 0 && sc.load >= sc.quota / 2;
                        const scColor = scOver ? 'bg-rose-500' : scHigh ? 'bg-amber-500' : 'bg-emerald-500';
                        const scProgress = sc.quota > 0 ? Math.min(100, Math.round((sc.load / sc.quota) * 100)) : 0;
                        return (
                          <div key={sc.id}>
                            <div className="flex items-center justify-between text-[10px] font-bold mb-0.5">
                              <span className="text-[#655ac1] truncate flex-1 ml-1">{sc.name}</span>
                              <span className="text-slate-400">نصاب الحصص: {sc.quota}</span>
                            </div>
                            <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${scColor} transition-all duration-700 ease-out`} style={{ width: `${scProgress}%` }} />
                            </div>
                            <div className="flex justify-start mt-0.5">
                              <span className="text-[10px] font-bold text-slate-400 ml-1">النصاب المسند</span>
                              <span className={`text-[10px] font-black ${scOver ? 'text-rose-600' : scHigh ? 'text-amber-600' : 'text-emerald-600'}`}>{sc.load} حصة</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-500">نصاب الحصص: {totalQuota}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${progressColor} transition-all duration-700 ease-out`} style={{ width: `${progress}%` }} />
                      </div>
                      <div className="flex justify-start">
                        <span className="text-[10px] font-bold text-slate-400 ml-1">النصاب المسند</span>
                        <span className={`text-[10px] font-black ${isOver ? 'text-rose-600' : isHigh ? 'text-amber-600' : 'text-emerald-600'}`}>{load} حصة</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                <Users size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">لا يوجد معلمين</p>
              </div>
            )}
          </div>
        </aside>

        {/* ── مساحة الفصول ── */}
        <main className="flex-1 min-w-0 w-full space-y-4">

          {/* بطاقة الفصول */}
          <div dir="rtl" className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 justify-between mb-3">
              <div className="flex items-center gap-3">
                <LayoutGrid size={24} className="text-[#655ac1]" />
                <div>
                  <span className="text-lg font-black text-slate-800">الصفوف والفصول</span>
                  <span className="text-xs bg-white border border-slate-300 text-[#655ac1] px-2 py-0.5 rounded-lg font-black mr-2">{currentSchoolClassCount}</span>
                </div>
              </div>
              {selectionMode && (
                <div className="flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 px-3 py-1.5 rounded-xl">
                  <Trash2 size={12} />
                  <span>وضع التحديد للحذف</span>
                </div>
              )}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2 justify-start">
              <div className="relative min-w-[180px]" ref={gradeDropdownRef}>
                <button
                  onClick={() => setShowGradeDropdown(!showGradeDropdown)}
                  className={`w-full px-4 py-2.5 bg-white border-2 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 text-sm ${showGradeDropdown ? 'border-[#655ac1]/40 ring-2 ring-[#8779fb]/20' : 'border-slate-200'}`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <ListFilter size={14} className="text-slate-400 shrink-0" />
                    {selectedGrades.length > 0 ? `الصفوف (${selectedGrades.length})` : 'كل الصفوف'}
                  </span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${showGradeDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showGradeDropdown && (
                  <div className="absolute z-50 top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 animate-in slide-in-from-top-2 max-h-60 overflow-y-auto custom-scrollbar">
                    <button onClick={() => setSelectedGrades([])} className={`w-full text-right px-3 py-2 text-xs font-bold rounded-xl transition-colors mb-1 ${selectedGrades.length === 0 ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}>
                      عرض الكل
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    {activeGrades.map(g => {
                      const active = selectedGrades.includes(g);
                      return (
                        <button key={g} onClick={() => toggleGradeFilter(g)} className={`w-full text-right px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-between gap-2 ${active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}>
                          <span>الصف {g}</span>
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                            <Check size={12} strokeWidth={3.5} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="relative min-w-[180px]" ref={classDropdownRef}>
                <button
                  onClick={() => setShowClassDropdown(!showClassDropdown)}
                  className={`w-full px-4 py-2.5 bg-white border-2 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 text-sm ${showClassDropdown ? 'border-[#655ac1]/40 ring-2 ring-[#8779fb]/20' : 'border-slate-200'}`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Filter size={14} className="text-slate-400 shrink-0" />
                    {selectedClassIds.length > 0 ? `الفصول (${selectedClassIds.length})` : 'كل الفصول'}
                  </span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${showClassDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showClassDropdown && (
                  <div className="absolute z-50 top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 animate-in slide-in-from-top-2 max-h-60 overflow-y-auto custom-scrollbar">
                    <button onClick={() => setSelectedClassIds([])} className={`w-full text-right px-3 py-2 text-xs font-bold rounded-xl transition-colors mb-1 ${selectedClassIds.length === 0 ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}>
                      عرض الكل
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    {availableClassesForDropdown.length > 0 ? availableClassesForDropdown.map(c => {
                      const active = selectedClassIds.includes(c.id);
                      return (
                        <button key={c.id} onClick={() => toggleClassFilter(c.id)} className={`w-full text-right px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-between gap-2 ${active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}>
                          <span>فصل {c.grade} / {c.section}</span>
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                            <Check size={12} strokeWidth={3.5} />
                          </span>
                        </button>
                      );
                    }) : (
                      <div className="px-3 py-4 text-center text-[10px] text-slate-400 font-medium">لا توجد فصول للصفوف المحددة</div>
                    )}
                  </div>
                )}
              </div>

              {!selectionMode && selectedTeacher && (
                <div className="mr-auto inline-flex items-center gap-2 text-xs font-bold text-[#655ac1] bg-white border border-slate-300 px-3 py-2.5 rounded-xl">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#655ac1] text-white">
                    <Check size={10} strokeWidth={3.5} />
                  </span>
                  <span>الإسناد لـ "{selectedTeacher.name}"</span>
                </div>
              )}
            </div>

            <div className="pt-3 space-y-6">
              {displayedGrades.length > 0 ? displayedGrades.map(grade => {
                const gradeClasses = displayedClasses(grade);
                if (gradeClasses.length === 0) return null;
                return (
                  <div key={grade} className="space-y-3">
                    <div className="flex items-center gap-3 px-1">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center text-[#655ac1] bg-white font-black text-sm flex-shrink-0 border border-slate-300">
                        {grade}
                      </span>
                      <span className="text-base font-black text-slate-800">الصف {getGradeLabel(grade)}</span>
                      <span className="text-xs bg-white border border-slate-300 text-slate-500 px-2 py-0.5 rounded-lg font-black">
                        {gradeClasses.length} {gradeClasses.length === 1 ? 'فصل' : gradeClasses.length === 2 ? 'فصلان' : gradeClasses.length <= 10 ? 'فصول' : 'فصلًا'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {gradeClasses.map(cls => {
                        const rawSubjects: Subject[] = subjects.filter(s =>
                          !s.isArchived && (getGradeSubjectIds(cls).includes(s.id) || cls.subjectIds?.includes(s.id))
                        );
                        const classSubjects: Subject[] = Array.from(new Map(rawSubjects.map(s => [s.id, s])).values());
                        const assignedCount = classSubjects.filter(s => assignments.some(a => a.classId === cls.id && a.subjectId === s.id)).length;
                        const progress = classSubjects.length > 0 ? Math.round((assignedCount / classSubjects.length) * 100) : 0;
                        const isCompleted = classSubjects.length > 0 && progress === 100;
                        return (
                          <div key={cls.id} className="rounded-2xl overflow-hidden border border-slate-200 bg-white transition-all">
                            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100">
                              <div className="flex items-center gap-3">
                                <span className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 border border-slate-300 bg-white text-[#655ac1]">
                                  {cls.section}
                                </span>
                                <div>
                                  <div className="text-sm font-black text-slate-800">الفصل {cls.grade} / {cls.section}</div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <div className="h-1.5 w-24 rounded-full overflow-hidden bg-slate-100">
                                      {assignedCount === 0 ? (
                                        <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: '16%' }} />
                                      ) : (
                                        <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${progress}%` }} />
                                      )}
                                    </div>
                                    {isCompleted && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                                        <CheckCircle2 size={12} /> مكتمل
                                      </span>
                                    )}
                                    {!isCompleted && <span className="text-[10px] font-black text-slate-400">{progress}%</span>}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                              {classSubjects.length > 0 ? classSubjects.map(sub => {
                                const assignment = assignments.find(a => a.classId === cls.id && a.subjectId === sub.id);
                                const assignedTeacher = teachers.find(t => t.id === assignment?.teacherId);
                                const isAssigned = !!assignment;
                                const isMine = isAssigned && assignment?.teacherId === selectedTeacherId;
                                const cellKey = `${cls.id}::${sub.id}`;
                                const isSelectedForDelete = selectionMode && selectedCells.has(cellKey);
                                // الذكاء البصري — إشارات إيجابية فقط، بدون إخفاء خيارات
                                const teacherSelected = !!selectedTeacher && !selectionMode;
                                const matchesSpec = teacherSelected && matchesTeacherSpec(sub, selectedTeacher!);
                                const highlightSpec = teacherSelected && matchesSpec && !isMine && !isAssigned;
                                // في وضع التحديد: الخلايا غير المسندة معطّلة
                                const selectionDisabled = selectionMode && !isAssigned;
                                return (
                                  <div
                                    key={sub.id}
                                    onClick={() => handleCellClick(cls.id, sub.id)}
                                    className={`relative rounded-xl text-right transition-all group cursor-pointer select-none p-2.5 min-h-[78px] flex flex-col justify-between
                                      ${isSelectedForDelete
                                        ? 'bg-rose-50 border border-rose-400 ring-2 ring-rose-200'
                                        : isAssigned
                                          ? 'bg-white border border-slate-200 hover:border-slate-300'
                                          : 'bg-amber-50/40 hover:bg-amber-100/50'}
                                      ${selectionDisabled ? 'opacity-40 cursor-not-allowed' : ''}
                                    `}
                                    style={
                                      !isSelectedForDelete && !isAssigned
                                        ? {
                                            backgroundImage:
                                              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%23fbbf24' stroke-width='2' stroke-dasharray='8 5'/%3E%3C/svg%3E\")",
                                          }
                                        : undefined
                                    }
                                  >
                                    {/* checkbox في وضع التحديد */}
                                    {selectionMode && isAssigned && (
                                      <div className="absolute top-1.5 left-1.5">
                                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 ${isSelectedForDelete ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                                          <Check size={12} strokeWidth={3.5} />
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-between items-start gap-1 mb-1">
                                      <div className={`min-w-0 flex-1 ${isAssigned && !selectionMode ? 'pr-5' : ''}`}>
                                        <div className={`text-[11px] font-black truncate ${isSelectedForDelete ? 'text-rose-700' : isAssigned ? 'text-slate-800' : 'text-slate-700'}`}>{sub.name}</div>
                                        <div className="text-[10px] font-bold text-slate-500">{sub.periodsPerClass} حصص</div>
                                      </div>
                                      {!selectionMode && isAssigned && (
                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white shrink-0 mt-0.5">
                                          <Check size={10} strokeWidth={3.5} />
                                        </span>
                                      )}
                                      {!selectionMode && !isAssigned && (
                                        highlightSpec ? (
                                          <span title="تناسب تخصص المعلم" className="shrink-0 mt-0.5">
                                            <Sparkles size={14} className="text-[#655ac1]" strokeWidth={2.5} />
                                          </span>
                                        ) : (
                                          <HelpCircle size={16} className="text-amber-500 shrink-0 mt-1" strokeWidth={2.5} />
                                        )
                                      )}
                                    </div>
                                    {isAssigned ? (
                                      <div className="flex items-center gap-1">
                                        <span className={`text-[10px] font-black truncate flex-1 ${isSelectedForDelete ? 'text-rose-700' : 'text-[#655ac1]'}`}>
                                          {assignedTeacher?.name}
                                        </span>
                                        {!selectionMode && isMine && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleUnassign(cls.id, sub.id); }}
                                            className="absolute -bottom-2 -right-2 bg-white text-rose-700 hover:bg-rose-50 border-2 border-slate-300 hover:border-rose-500 rounded-full p-0.5 transition-all"
                                            title="إلغاء الإسناد"
                                          >
                                            <X size={10} strokeWidth={3} />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-[10px] font-black text-amber-700">
                                        <ArrowLeft size={11} strokeWidth={3} />
                                        <span>اضغط للإسناد</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              }) : (
                                <div className="col-span-full py-6 text-center text-[11px] font-bold text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                  لا توجد مواد في هذا الفصل
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center space-y-4">
                  <LayoutGrid size={42} className="text-slate-300 mx-auto" />
                  <h3 className="text-lg font-black text-slate-800">لا توجد فصول دراسية</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">قم بإنشائها من صفحة الفصول</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── شريط وضع التحديد للحذف ── */}
      {selectionMode && (
        <div className="fixed bottom-0 left-0 right-0 z-[90] bg-white border-t-2 border-rose-300 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Trash2 size={18} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-800">وضع التحديد للحذف</div>
                <div className="text-[10px] font-bold text-slate-500">اضغط على الإسنادات لتحديدها</div>
              </div>
            </div>

            <div className="flex-1 text-center">
              {selectedCells.size > 0 ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-black text-rose-700">
                  <Check size={12} /> {selectedCells.size} إسناد محدد
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-400">لم يتم تحديد أي إسناد بعد</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={cancelSelection}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
              >
                <X size={14} /> إلغاء
              </button>
              <button
                onClick={confirmDeleteSelected}
                disabled={selectedCells.size === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border bg-rose-500 text-white border-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-500"
              >
                <Trash2 size={14} /> حذف المحدد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── toast التراجع للعمليات الكبيرة ── */}
      {undoSnapshot && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[180] bg-slate-800 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 max-w-md animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-bold flex-1 truncate">{undoSnapshot.label}</span>
          <button
            onClick={performUndo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-800 font-black text-xs hover:bg-slate-100 active:scale-95 transition-all shrink-0"
          >
            تراجع
          </button>
          <button
            onClick={() => setUndoSnapshot(null)}
            className="text-white/60 hover:text-white shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── مودالات المرحلة 3 ── */}
      {showPreview && (
        <PreviewModal
          teachers={teachers}
          subjects={subjects}
          classes={classes}
          assignments={assignments}
          specializations={specializations}
          schoolInfo={schoolInfo}
          gradeSubjectMap={gradeSubjectMap}
          activeSchoolTab={activeSchoolTab}
          onClose={() => setShowPreview(false)}
        />
      )}
      {showPrint && (
        <PrintModal
          teachers={teachers}
          subjects={subjects}
          classes={classes}
          assignments={assignments}
          specializations={specializations}
          schoolInfo={schoolInfo}
          gradeSubjectMap={gradeSubjectMap}
          activeSchoolTab={activeSchoolTab}
          onClose={() => setShowPrint(false)}
        />
      )}
      {showDeleteBySubject && (
        <DeleteBySubjectModal
          subjects={subjects}
          classes={classes}
          assignments={assignments}
          activeSchoolTab={activeSchoolTab}
          schoolLabel={currentSchoolLabel}
          onConfirm={handleDeleteBySubjectConfirm}
          onClose={() => setShowDeleteBySubject(false)}
        />
      )}
      {showDeleteByTeacher && (
        <DeleteByTeacherModal
          teachers={teachers}
          subjects={subjects}
          classes={classes}
          assignments={assignments}
          specializations={specializations}
          activeSchoolTab={activeSchoolTab}
          schoolLabel={currentSchoolLabel}
          onConfirm={handleDeleteByTeacherConfirm}
          onClose={() => setShowDeleteByTeacher(false)}
        />
      )}

      {/* مودالات إجراءات المعلم */}
      {viewingTeacher && (
        <TeacherDetailsModal
          teacher={viewingTeacher}
          teachers={teachers}
          subjects={subjects}
          classes={classes}
          assignments={assignments}
          specializations={specializations}
          schoolInfo={schoolInfo}
          onClose={() => setViewingTeacher(null)}
        />
      )}
      {transferringTeacher && (
        <TransferTeacherModal
          sourceTeacher={transferringTeacher}
          teachers={teachers}
          subjects={subjects}
          classes={classes}
          assignments={assignments}
          specializations={specializations}
          activeSchoolTab={activeSchoolTab}
          isTeacherInCurrentSchool={isTeacherInCurrentSchool}
          onConfirm={handleTransferConfirm}
          onClose={() => setTransferringTeacher(null)}
        />
      )}

    </div>
  );
};

export default AssignmentPage;
