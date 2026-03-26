import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Teacher, Subject, ClassInfo, Assignment, Phase, SchoolInfo, Specialization } from '../types';
import SchoolTabs from './wizard/SchoolTabs';
import {
  Search, X, Trash2, ChevronDown, Filter, Check, Layers, Briefcase,
  Printer, Users, CheckCircle2, User, HelpCircle, AlertTriangle, LayoutTemplate,
  Eye, ArrowUp, ClipboardList, BookOpen, ChevronRight, Calculator, GraduationCap,
  ListFilter, School, LayoutGrid, ShieldAlert
} from 'lucide-react';
import AssignmentReport from './AssignmentReport';
import { useToast } from './ui/ToastProvider';

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

// ── نوع مودال التأكيد ──
interface ConfirmDialog {
  title: string;
  message: string;
  confirmLabel?: string;
  type: 'danger' | 'warning';
  onConfirm: () => void;
}

const ManualAssignment: React.FC<Props> = ({
  teachers, setTeachers, subjects, classes, assignments,
  setAssignments, schoolInfo, gradeSubjectMap, specializations
}) => {
  const { showToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  const [showReport, setShowReport] = useState(false);

  // -- Shared Schools --
  const sharedSchools = schoolInfo.sharedSchools || [];
  const hasSharedSchools = sharedSchools.length > 0;
  const [activeSchoolTab, setActiveSchoolTab] = useState<string>('main');

  // -- Filter States --
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [selectedTeacherFilterIds, setSelectedTeacherFilterIds] = useState<string[]>([]);

  // -- Class Filter States (Multi-Select) --
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // -- Selection States --
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  // -- Details Modal State --
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);

  // -- Dropdown Toggles --
  const [showSpecDropdown, setShowSpecDropdown] = useState(false);
  const [showTeacherFilterDropdown, setShowTeacherFilterDropdown] = useState(false);
  
  // Custom Dropdown Toggles
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  // -- Interactive Quota Edit --
  const [editingQuotaTeacherId, setEditingQuotaTeacherId] = useState<string | null>(null);
  const [tempQuota, setTempQuota] = useState<number>(0);

  // -- Refs & Scroll --
  const specDropdownRef = useRef<HTMLDivElement>(null);
  const teacherFilterDropdownRef = useRef<HTMLDivElement>(null);
  const gradeDropdownRef = useRef<HTMLDivElement>(null);
  const classDropdownRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null); 

  // -- Constants --
  const THEME_COLOR = '#655ac1';
  const THEME_BG = '#e5e1fe';

  // -- School-aware helpers --
  const currentSchoolPhases = activeSchoolTab === 'main'
    ? schoolInfo.phases
    : (sharedSchools.find(s => s.id === activeSchoolTab)?.phases || schoolInfo.phases);

  const isClassInCurrentSchool = (c: { schoolId?: string }) => {
    if (!hasSharedSchools) return true;
    if (activeSchoolTab === 'main') return !c.schoolId || c.schoolId === 'main';
    return c.schoolId === activeSchoolTab;
  };

  const isTeacherInCurrentSchool = (t: { schoolId?: string; isShared?: boolean; schools?: { schoolId: string }[] }) => {
    if (!hasSharedSchools) return true;
    if (t.isShared) {
      // المدرسة الأصلية (schoolId) + كل مدارس schools[]
      const originalId = t.schoolId || 'main';
      if (activeSchoolTab === originalId) return true;
      return (t.schools || []).some(s => s.schoolId === activeSchoolTab);
    }
    if (activeSchoolTab === 'main') return !t.schoolId || t.schoolId === 'main';
    return t.schoolId === activeSchoolTab;
  };

  // -- Helpers --

  // يحل مفتاح gradeSubjectMap بالصيغتين: الجديدة "{schoolId}-{phase}-{grade}" والقديمة "{phase}-{grade}"
  const getGradeSubjectIds = (cls: { phase: string; grade: number; schoolId?: string }): string[] => {
    const schoolId = cls.schoolId || 'main';
    return (
      gradeSubjectMap[`${schoolId}-${cls.phase}-${cls.grade}`] ||
      gradeSubjectMap[`${cls.phase}-${cls.grade}`] ||
      []
    );
  };

  const getTeacherLoad = (tId: string) => {
    return assignments.filter(a => a.teacherId === tId).reduce((total, a) => {
      const sub = subjects.find(s => s.id === a.subjectId);
      return total + (sub?.periodsPerClass || 0);
    }, 0);
  };

  const getTotalStats = () => {
    let totalPeriods = 0;
    let totalSubjects = 0;
    
    classes.filter(c => currentSchoolPhases.includes(c.phase) && isClassInCurrentSchool(c)).forEach(cls => {
        const relevantSubjects = subjects.filter(s =>
            !s.isArchived &&
            (getGradeSubjectIds(cls).includes(s.id) || cls.subjectIds?.includes(s.id))
        );
        // unique subjects for THIS class instance
        const uniqueSubjects = Array.from(new Set(relevantSubjects.map(s => s.id))).map(id => relevantSubjects.find(s => s.id === id)!);

        uniqueSubjects.forEach(s => {
            totalPeriods += s.periodsPerClass;
        });
        totalSubjects += uniqueSubjects.length;
    });
    return { totalPeriods, totalSubjects };
  };

  const getAssignedStats = () => {
      const assignedPeriods = assignments.reduce((total, a) => {
           const sub = subjects.find(s => s.id === a.subjectId);
           return total + (sub?.periodsPerClass || 0);
      }, 0);
      const assignedSubjectsCount = assignments.length;
      return { assignedPeriods, assignedSubjectsCount };
  };

  const getUnassignedClassesCount = () => {
      let count = 0;
      classes.filter(c => currentSchoolPhases.includes(c.phase) && isClassInCurrentSchool(c)).forEach(cls => {
            const relevantSubjects = subjects.filter(s =>
                !s.isArchived &&
                (getGradeSubjectIds(cls).includes(s.id) || cls.subjectIds?.includes(s.id))
            );
            const uniqueSubjects = Array.from(new Set(relevantSubjects.map(s => s.id))).map(id => relevantSubjects.find(s => s.id === id)!);
            if (uniqueSubjects.length > 0) {
                 const assignedCount = uniqueSubjects.filter(s => assignments.some(a => a.classId === cls.id && a.subjectId === s.id)).length;
                 if (assignedCount < uniqueSubjects.length) {
                     count++;
                 }
            }
      });
      return count;
  }

  // Filter Teachers based on Search, Specs, and Specific Selection
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      // 1. Filter by ID Selection (if any selected)
      const matchId = selectedTeacherFilterIds.length === 0 || selectedTeacherFilterIds.includes(t.id);
      const matchSpec = selectedSpecs.length === 0 || selectedSpecs.includes(t.specializationId);
      const matchSchool = isTeacherInCurrentSchool(t);
      const matchSearch = teacherSearch.trim() === '' || t.name.toLowerCase().includes(teacherSearch.toLowerCase());
      return matchId && matchSpec && matchSchool && matchSearch;
    });
  }, [teachers, selectedTeacherFilterIds, selectedSpecs, activeSchoolTab, teacherSearch]);

  // Dynamic Specializations (Only used ones)
  const availableSpecializations = useMemo(() => {
      const usedSpecIds = new Set(teachers.map(t => t.specializationId));
      return specializations.filter(s => usedSpecIds.has(s.id));
  }, [teachers, specializations]);

  const sourceSubjects = useMemo(() => {
    return subjects.filter(s => !s.isArchived); // Pass all subjects, filter by grade later
  }, [subjects]);

  // -- Derived State for Grades to render --
  const activeGrades = useMemo(() => {
      const grades = new Set<number>();
      classes.forEach(c => {
          if (currentSchoolPhases.includes(c.phase) && isClassInCurrentSchool(c)) {
              grades.add(c.grade);
          }
      });
      return Array.from(grades).sort((a,b) => a - b);
  }, [classes, currentSchoolPhases, activeSchoolTab]);

  // -- Derived State for Classes in Dropdown --
  const availableClassesForDropdown = useMemo(() => {
      return classes.filter(c => {
          const phaseMatch = currentSchoolPhases.includes(c.phase);
          const schoolMatch = isClassInCurrentSchool(c);
          const gradeMatch = selectedGrades.length === 0 || selectedGrades.includes(c.grade);
          return phaseMatch && schoolMatch && gradeMatch;
      });
  }, [classes, currentSchoolPhases, selectedGrades, activeSchoolTab]);

  // -- Filtered Content Logic (Workspace) --
  const displayedGrades = useMemo(() => {
      // If grades selected, show them.
      if (selectedGrades.length > 0) return selectedGrades.sort((a,b) => a - b);
      
      // If classes selected, show their grades.
      if (selectedClassIds.length > 0) {
           const grades = new Set<number>();
           selectedClassIds.forEach(id => {
               const c = classes.find(x => x.id === id);
               if (c) grades.add(c.grade);
           });
           return Array.from(grades).sort((a,b) => a - b);
      }
      
      // Default: All active grades
      return activeGrades;
  }, [selectedGrades, selectedClassIds, activeGrades, classes]);

  const displayedClasses = (grade: number) => {
      let gradeClasses = classes.filter(c => currentSchoolPhases.includes(c.phase) && c.grade === grade && isClassInCurrentSchool(c));
      
      // If specific classes selected, filter further
      if (selectedClassIds.length > 0) {
          gradeClasses = gradeClasses.filter(c => selectedClassIds.includes(c.id));
      }
      return gradeClasses;
  }

  // -- Switch School Tab --
  const switchSchoolTab = (tabId: string) => {
    setActiveSchoolTab(tabId);
    setSelectedTeacherId(null);
    setSelectedTeacherFilterIds([]);
    setSelectedGrades([]);
    setSelectedClassIds([]);
    setSelectedSpecs([]);
  };

  // -- Toggle Helpers --
  const toggleTeacherFilter = (id: string) => {
      setSelectedTeacherFilterIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  
  const toggleGradeFilter = (g: number) => {
      setSelectedGrades(prev => prev.includes(g) ? prev.filter(i => i !== g) : [...prev, g]);
  };

  const toggleClassFilter = (id: string) => {
      setSelectedClassIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };


  // -- Quota Handlers --
  const startEditingQuota = (e: React.MouseEvent, t: Teacher) => {
      e.stopPropagation();
      setEditingQuotaTeacherId(t.id);
      setTempQuota(t.quotaLimit);
  };

  const saveQuota = (e: React.MouseEvent, t: Teacher) => {
      e.stopPropagation();
      setTeachers(prev => prev.map(teacher => teacher.id === t.id ? { ...teacher, quotaLimit: tempQuota } : teacher));
      setEditingQuotaTeacherId(null);
  };

  // -- Assignment Actions --
  const handleAssign = (classId: string, subjectId: string) => {
    if (!selectedTeacherId) {
        showToast('يرجى اختيار معلم أولاً من القائمة اليمنى', 'warning');
        return;
    }

    const teacher = teachers.find(t => t.id === selectedTeacherId);
    if (!teacher) {
      showToast('يرجى اختيار معلم أولاً من القائمة اليمنى', 'warning');
      return;
    }
    
    const existingAssignment = assignments.find(a => a.classId === classId && a.subjectId === subjectId);
    if (existingAssignment) {
        if (existingAssignment.teacherId === selectedTeacherId) return;
    }

    const subject = subjects.find(s => s.id === subjectId);
    const subjectLoad = subject?.periodsPerClass || 0;
    const currentLoad = getTeacherLoad(teacher.id);

    // النصاب الفعّال: للمعلم المشترك = مجموع نصابي المدرستين، للعادي = quotaLimit
    const effectiveQuota = teacher.isShared && teacher.schools?.length
      ? teacher.schools.reduce((sum, s) => sum + (s.lessons || 0), 0)
      : teacher.quotaLimit;

    const doAssign = () => {
      setAssignments(prev => {
        const filtered = prev.filter(a => !(a.classId === classId && a.subjectId === subjectId));
        return [...filtered, { teacherId: selectedTeacherId, classId, subjectId }];
      });
    };

    // تنبيه فقط عند تجاوز النصاب الكلي للمعلم في المدرستين
    if (currentLoad + subjectLoad > effectiveQuota) {
        setConfirmDialog({
            title: 'تجاوز النصاب الكلي',
            message: `هذا الإسناد سيتجاوز إجمالي نصاب المعلم (${effectiveQuota} حصة في المدرستين). هل أنت متأكد من المتابعة؟`,
            confirmLabel: 'متابعة رغم ذلك',
            type: 'warning',
            onConfirm: doAssign,
        });
        return;
    }

    doAssign();
  };

  const handleUnassign = (classId: string, subjectId: string) => {
    setAssignments(prev => prev.filter(a => !(a.classId === classId && a.subjectId === subjectId)));
  };

  const handleUnassignTeacher = (tId: string, tName: string) => {
    const currentSchool = activeSchoolTab;
    const schoolLabel = currentSchool === 'main'
      ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
      : (sharedSchools.find(s => s.id === currentSchool)?.name || currentSchool);

    setConfirmDialog({
      title: 'حذف إسنادات المعلم',
      message: `سيتم حذف إسنادات المعلم "${tName}" في "${schoolLabel}" فقط. إسناداته في المدارس الأخرى لن تتأثر.`,
      confirmLabel: 'حذف الإسنادات',
      type: 'danger',
      onConfirm: () => setAssignments(prev => prev.filter(a => {
        if (a.teacherId !== tId) return true; // احتفظ بإسنادات بقية المعلمين
        // احذف فقط إسنادات المعلم في فصول المدرسة الحالية
        const cls = classes.find(c => c.id === a.classId);
        const clsSchool = cls?.schoolId || 'main';
        return clsSchool !== currentSchool;
      })),
    });
  };

  const handleDeleteAll = () => {
    const currentSchool = activeSchoolTab;
    // تحقق من وجود إسنادات في المدرسة الحالية فقط
    const currentSchoolAssignments = assignments.filter(a => {
      const cls = classes.find(c => c.id === a.classId);
      return (cls?.schoolId || 'main') === currentSchool;
    });
    if (currentSchoolAssignments.length === 0) return;

    const schoolLabel = currentSchool === 'main'
      ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
      : (sharedSchools.find(s => s.id === currentSchool)?.name || currentSchool);

    setConfirmDialog({
      title: 'حذف جميع الإسنادات',
      message: `سيتم حذف جميع الإسنادات في "${schoolLabel}" نهائياً. إسنادات المدارس الأخرى لن تتأثر.`,
      confirmLabel: 'حذف الكل',
      type: 'danger',
      onConfirm: () => setAssignments(prev => prev.filter(a => {
        const cls = classes.find(c => c.id === a.classId);
        return (cls?.schoolId || 'main') !== currentSchool;
      })),
    });
  };

  const toggleSpec = (id: string) => {
    setSelectedSpecs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Scroll to top handler
  const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // -- Render Helpers --
  const { totalPeriods, totalSubjects } = getTotalStats();
  const { assignedPeriods, assignedSubjectsCount } = getAssignedStats();
  const unassignedClassesCount = getUnassignedClassesCount();
  const unassignedSubjectsCount = totalSubjects - assignedSubjectsCount;
  
  // Close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (specDropdownRef.current && !specDropdownRef.current.contains(event.target as Node)) {
            setShowSpecDropdown(false);
        }
        if (teacherFilterDropdownRef.current && !teacherFilterDropdownRef.current.contains(event.target as Node)) {
            setShowTeacherFilterDropdown(false);
        }
        if (gradeDropdownRef.current && !gradeDropdownRef.current.contains(event.target as Node)) {
            setShowGradeDropdown(false);
        }
        if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
            setShowClassDropdown(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // -- Components --
  
  // Teacher Details Modal
  const TeacherDetailsModal = () => {
      if (!viewingTeacher) return null;
      const teacherAssignments = assignments.filter(a => a.teacherId === viewingTeacher.id);

      // ── مساعد: عرض صف مادة واحدة ──
      const AssignmentRow = ({ a, idx }: { a: typeof teacherAssignments[0]; idx: number }) => {
          const cls = classes.find(c => c.id === a.classId);
          const sub = subjects.find(s => s.id === a.subjectId);
          return (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-100 text-[#655ac1]">
                          <Briefcase size={16}/>
                      </div>
                      <div>
                          <h4 className="text-sm font-black text-slate-700">{sub?.name}</h4>
                          <span className="text-[10px] font-bold text-slate-400">الفصل {cls?.grade} / {cls?.section}</span>
                      </div>
                  </div>
                  <div className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                      {sub?.periodsPerClass} حصص
                  </div>
              </div>
          );
      };

      // ── عرض مجموعة مدرسة مع نصابها ──
      const SchoolSection = ({
          schoolName,
          schoolAssignments,
          quota,
      }: { schoolName: string; schoolAssignments: typeof teacherAssignments; quota: number }) => {
          const total = schoolAssignments.reduce((sum, a) => {
              const sub = subjects.find(s => s.id === a.subjectId);
              return sum + (sub?.periodsPerClass || 0);
          }, 0);
          return (
              <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-black text-[#655ac1]">{schoolName}</span>
                      <span className="text-[10px] font-bold text-slate-500 bg-[#e5e1fe] px-2 py-0.5 rounded-full">
                          {total} / {quota} حصة
                      </span>
                  </div>
                  {schoolAssignments.length > 0 ? (
                      schoolAssignments.map((a, idx) => <AssignmentRow key={idx} a={a} idx={idx} />)
                  ) : (
                      <div className="py-4 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl">
                          لا توجد مواد مسندة في هذه المدرسة بعد.
                      </div>
                  )}
              </div>
          );
      };

      return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl m-4">
                  <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-[#e5e1fe] text-[#655ac1] flex items-center justify-center font-black text-lg">
                              {viewingTeacher.name.substring(0,2)}
                          </div>
                          <div>
                              <h3 className="text-lg font-black text-slate-800">{viewingTeacher.name}</h3>
                              <p className="text-xs font-bold text-slate-500">تفاصيل الإسناد الحالي</p>
                          </div>
                      </div>
                      <button onClick={() => setViewingTeacher(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                          <X size={20}/>
                      </button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
                      {viewingTeacher.isShared ? (() => {
                          // ── عرض مشترك: مدرستان منفصلتان ──
                          const schoolA_Id = viewingTeacher.schoolId || 'main';
                          const schoolA_Name = schoolA_Id === 'main'
                              ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
                              : (sharedSchools.find(s => s.id === schoolA_Id)?.name || schoolA_Id);
                          const schoolB_Entry = (viewingTeacher.schools || []).find(s => s.schoolId !== schoolA_Id);
                          const schoolB_Id = schoolB_Entry?.schoolId;
                          const schoolB_Name = schoolB_Entry?.schoolName || '';

                          const isClassOfSchool = (classId: string, sId: string) => {
                              const cls = classes.find(c => c.id === classId);
                              const clsSchool = cls?.schoolId || 'main';
                              return clsSchool === sId;
                          };

                          const assignmentsA = teacherAssignments.filter(a => isClassOfSchool(a.classId, schoolA_Id));

                          // النصاب من البيانات المخزونة لكل مدرسة (مستقل — لا يعتمد على quotaLimit)
                          const schoolA_Entry = (viewingTeacher.schools || []).find(s => s.schoolId === schoolA_Id);
                          const schoolA_Quota = schoolA_Entry?.lessons || viewingTeacher.quotaLimit || 24;
                          const schoolB_Quota = schoolB_Entry?.lessons || 0;
                          const assignmentsB = schoolB_Id
                              ? teacherAssignments.filter(a => isClassOfSchool(a.classId, schoolB_Id))
                              : [];

                          const totalAll = teacherAssignments.reduce((sum, a) => {
                              const sub = subjects.find(s => s.id === a.subjectId);
                              return sum + (sub?.periodsPerClass || 0);
                          }, 0);

                          return (
                              <>
                                  <SchoolSection schoolName={schoolA_Name} schoolAssignments={assignmentsA} quota={schoolA_Quota} />
                                  {schoolB_Entry && (
                                      <>
                                          <div className="h-px bg-slate-100 my-1" />
                                          <SchoolSection schoolName={schoolB_Name} schoolAssignments={assignmentsB} quota={schoolB_Quota} />
                                      </>
                                  )}
                                  <div className="h-px bg-slate-200 my-1" />
                                  <div className="flex items-center justify-between px-1 pt-1">
                                      <span className="text-xs font-black text-slate-600">إجمالي الإسناد</span>
                                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                          {totalAll} / {schoolA_Quota + schoolB_Quota} حصة
                                      </span>
                                  </div>
                              </>
                          );
                      })() : (
                          // ── عرض عادي: مدرسة واحدة ──
                          teacherAssignments.length > 0 ? (
                              teacherAssignments.map((a, idx) => <AssignmentRow key={idx} a={a} idx={idx} />)
                          ) : (
                              <div className="py-8 text-center text-slate-400 font-medium">
                                  لا توجد مواد مسندة لهذا المعلم بعد.
                              </div>
                          )
                      )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                      <button onClick={() => setViewingTeacher(null)} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors">
                          إغلاق
                      </button>
                  </div>
              </div>
          </div>
      );
  };


  if (showReport) {
    return (
        <AssignmentReport 
            schoolInfo={schoolInfo} 
            teachers={teachers} 
            subjects={subjects} 
            classes={classes} 
            assignments={assignments} 
            specializations={specializations} 
            onClose={() => setShowReport(false)}
        />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24" ref={mainScrollRef}>
        
      {viewingTeacher && <TeacherDetailsModal />}

      {/* ── مودال التأكيد الاحترافي ── */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md mx-4 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className={`p-6 pb-4 flex items-center gap-4 ${confirmDialog.type === 'danger' ? 'bg-rose-50' : 'bg-amber-50'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${confirmDialog.type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                {confirmDialog.type === 'danger' ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
              </div>
              <h3 className={`text-lg font-black ${confirmDialog.type === 'danger' ? 'text-rose-700' : 'text-amber-700'}`}>
                {confirmDialog.title}
              </h3>
            </div>
            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-sm font-medium text-slate-600 leading-relaxed">{confirmDialog.message}</p>
            </div>
            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95 ${confirmDialog.type === 'danger' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-amber-500 hover:bg-amber-600'}`}
              >
                {confirmDialog.confirmLabel || 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 1. ROW 1: Header */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <ClipboardList size={36} strokeWidth={1.8} className="text-[#655ac1]" />
            إسناد المواد
        </h3>
        <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إسناد المواد للمعلمين بطريقة تفاعلية سهلة</p>
      </div>

      {/* Shared Schools Tabs — شريط مستقل */}
      {hasSharedSchools && (
        <SchoolTabs
          schoolInfo={schoolInfo}
          activeSchoolId={activeSchoolTab}
          onTabChange={switchSchoolTab}
        />
      )}

      {/* 2. ROW 2: Action Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Stat 1: Unassigned Periods (Refined) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md flex flex-col justify-center items-center transition-all">
                <div className="flex items-center gap-2 mb-2.5">
                    <div className="p-1.5 bg-slate-100 rounded-lg shadow-sm"><BookOpen size={18} className="text-[#655ac1]" /></div>
                    <span className="text-xs font-bold text-slate-500">حصص غير مسندة</span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-indigo-600 leading-none">{totalPeriods - assignedPeriods}</span>
                    <span className="text-3xl font-black text-slate-400 leading-none">/ {totalPeriods}</span>
                </div>
            </div>

            {/* Stat 2: Unassigned Classes (Refined Icon + Color) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md flex flex-col justify-center items-center transition-all">
                <div className="flex items-center gap-2 mb-2.5">
                    <div className="p-1.5 bg-slate-100 rounded-lg shadow-sm"><LayoutGrid size={18} className="text-[#655ac1]" /></div>
                    <span className="text-xs font-bold text-slate-500">فصول غير مسندة</span>
                </div>
                <span className="text-3xl font-black leading-none text-[#655ac1]">{unassignedClassesCount}</span>
            </div>

            {/* Stat 3: Unassigned Subjects (Refined Color) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md flex flex-col justify-center items-center transition-all">
                <div className="flex items-center gap-2 mb-2.5">
                    <div className="p-1.5 bg-slate-100 rounded-lg shadow-sm"><Layers size={18} className="text-[#655ac1]" /></div>
                    <span className="text-xs font-bold text-slate-500">مواد غير مسندة</span>
                </div>
                <span className="text-3xl font-black leading-none text-[#655ac1]">{unassignedSubjectsCount}</span>
            </div>

            {/* Action 4: Report Button */}
            <button 
                onClick={() => setShowReport(true)}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center items-center gap-2 hover:border-[#655ac1] hover:text-[#655ac1] transition-all group"
            >
                <Printer size={24} className="text-[#655ac1] transition-colors shadow-sm"/>
                <span className="text-xs font-bold text-slate-600 group-hover:text-[#655ac1]">تقرير الإسناد</span>
            </button>

            {/* Action 5: Delete All Button (Refined Label) */}
            <button 
                onClick={handleDeleteAll}
                disabled={assignments.length === 0}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center items-center gap-2 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-100 disabled:hover:text-inherit"
            >
                <Trash2 size={24} className="text-slate-400 group-hover:text-rose-500 transition-colors"/>
                <span className="text-xs font-bold text-slate-600 group-hover:text-rose-500">حذف إسناد الكل</span>
            </button>

      </div>

      <div className="flex flex-col lg:flex-row items-start gap-6">
        
        {/* RIGHT SIDEBAR (Teachers) */}
        <aside className="w-full lg:w-96 shrink-0 relative lg:sticky lg:top-4 max-h-[calc(100vh-2rem)] flex flex-col bg-white rounded-[2rem] border-2 border-[#e5e1fe] shadow-xl shadow-[#655ac1]/5 overflow-hidden z-20">
            
            {/* Sidebar Header */}
            <div className="p-5 bg-white relative">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#655ac1]">
                             <Users size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-sm">المعلمون</h3>
                            <span className="text-[10px] font-bold text-slate-400">إجمالي المعلمون: {filteredTeachers.length}</span>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-3">
                    <Search className="absolute right-2.5 top-2.5 text-slate-400" size={13}/>
                    <input
                        type="text"
                        placeholder="بحث عن معلم..."
                        className="w-full pr-8 pl-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:border-[#8779fb] focus:bg-white transition-all"
                        value={teacherSearch}
                        onChange={e => setTeacherSearch(e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    {/* Teacher Filter Dropdown */}
                     <div className="relative" ref={teacherFilterDropdownRef}>
                        <button
                            onClick={() => setShowTeacherFilterDropdown(!showTeacherFilterDropdown)}
                            className="w-full flex justify-between items-center px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-[#8779fb] transition-all"
                        >
                             <span className="text-xs font-bold text-slate-600 flex items-center gap-2 truncate">
                                <ListFilter size={14}/>
                                {selectedTeacherFilterIds.length > 0 ? `تم تحديد (${selectedTeacherFilterIds.length})` : 'كل المعلمين'}
                             </span>
                             <ChevronDown size={14} className={`text-slate-400 transition-transform ${showTeacherFilterDropdown ? 'rotate-180' : ''}`}/>
                        </button>

                        {showTeacherFilterDropdown && (
                             <div className="absolute top-full mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                 <div className="max-h-52 overflow-y-auto custom-scrollbar p-1">
                                    {/* Action buttons */}
                                    <div className="flex gap-1 mb-1 px-1">
                                        <button
                                            onClick={() => setSelectedTeacherFilterIds([])}
                                            className="text-[10px] flex-1 py-1.5 bg-slate-50 hover:bg-[#e5e1fe] hover:text-[#655ac1] rounded font-bold text-slate-500 transition-colors"
                                        >
                                            إلغاء التحديد
                                        </button>
                                        <button
                                            onClick={() => setSelectedTeacherFilterIds(teachers.map(t => t.id))}
                                            className="text-[10px] flex-1 py-1.5 bg-slate-50 hover:bg-[#e5e1fe] hover:text-[#655ac1] rounded font-bold text-slate-500 transition-colors"
                                        >
                                            تحديد الكل
                                        </button>
                                    </div>

                                    {teachers.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => toggleTeacherFilter(t.id)}
                                            className={`w-full flex justify-between items-center px-3 py-2 rounded-xl text-xs font-bold transition-all mb-0.5 border ${selectedTeacherFilterIds.includes(t.id) ? 'bg-white text-[#655ac1] border-[#655ac1]' : 'text-slate-600 border-transparent hover:bg-slate-50'}`}
                                        >
                                            <span className="truncate">{t.name}</span>
                                            {selectedTeacherFilterIds.includes(t.id) && <Check size={12}/>}
                                        </button>
                                    ))}
                                 </div>
                             </div>
                        )}
                    </div>
                    
                    <div className="relative" ref={specDropdownRef}>
                        <button 
                            onClick={() => setShowSpecDropdown(!showSpecDropdown)}
                            className={`w-full flex justify-between items-center px-3 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-[#8779fb] transition-all ${showSpecDropdown ? 'ring-2 ring-[#8779fb]/20 border-[#8779fb]' : ''}`}
                        >
                             <span className="text-xs font-bold text-slate-600 flex items-center gap-2 truncate">
                                <Filter size={12}/> 
                                {selectedSpecs.length ? `تخصص (${selectedSpecs.length})` : 'كل التخصصات'}
                             </span>
                             <ChevronDown size={14} className={`text-slate-400 transition-transform ${showSpecDropdown ? 'rotate-180' : ''}`}/>
                        </button>
                        {showSpecDropdown && (
                            <div className="absolute top-full mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar p-1.5 animate-in fade-in zoom-in-95 duration-200">
                                {availableSpecializations.map(s => (
                                    <button 
                                        key={s.id} 
                                        onClick={() => toggleSpec(s.id)}
                                        className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-xs font-bold transition-all mb-0.5 ${selectedSpecs.includes(s.id) ? 'bg-[#e5e1fe] text-[#655ac1]' : 'hover:bg-slate-50 text-slate-600'}`}
                                    >
                                        {s.name}
                                        {selectedSpecs.includes(s.id) && <Check size={12}/>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Separator */}
            <div className="h-px bg-slate-100 w-full mb-1"></div>

            {/* Teacher List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 pt-2">
                {filteredTeachers.length > 0 ? (
                    filteredTeachers.map(t => {
                        const assignedLoad = getTeacherLoad(t.id);
                        
                        const isSelected = selectedTeacherId === t.id;
                        
                        const isOverLimit = assignedLoad >= 24;
                        const isHighLoad = assignedLoad >= 20;

                        let progressColor = 'bg-emerald-500';
                        if (isOverLimit) progressColor = 'bg-rose-500';
                        else if (isHighLoad) progressColor = 'bg-amber-500';

                        const progressValue = Math.min(100, Math.round((assignedLoad / (t.quotaLimit || 24)) * 100));

                        return (
                            <div
                                key={t.id}
                                onClick={() => setSelectedTeacherId(t.id)}
                                className={`
                                    p-3.5 rounded-2xl cursor-pointer transition-all group relative overflow-hidden flex flex-col gap-2.5
                                    ${isSelected
                                        ? 'bg-white border-2 border-[#655ac1] shadow-sm'
                                        : 'bg-white border border-slate-100 hover:border-[#8779fb]/50 hover:shadow-md hover:translate-x-[-2px]'}
                                `}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {/* Avatar Removed */}
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <h4 className={`text-sm font-black truncate ${isSelected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{t.name}</h4>
                                                {t.isShared && (() => {
                                                    // بناء قائمة كاملة بمدارس المعلم (الأصلية + المشتركة)
                                                    const originalId = t.schoolId || 'main';
                                                    const originalName = originalId === 'main'
                                                        ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
                                                        : (sharedSchools.find(s => s.id === originalId)?.name || originalId);
                                                    const allSchools = [
                                                        { schoolId: originalId, schoolName: originalName },
                                                        ...(t.schools || []).filter(s => s.schoolId !== originalId),
                                                    ];
                                                    const otherSchools = allSchools
                                                        .filter(s => s.schoolId !== activeSchoolTab)
                                                        .map(s => s.schoolName)
                                                        .join('، ');
                                                    return (
                                                        <span title={`مشترك مع: ${otherSchools || 'مدارس أخرى'}`} className="shrink-0 text-[#655ac1]">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                                                            </svg>
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-bold truncate">
                                                {specializations.find(s => s.id === t.specializationId)?.name || 'عام'}
                                            </span>
                                            {(() => {
                                                const days = t.constraints?.presenceDays?.[activeSchoolTab];
                                                if (!days || days.length === 0) return null;
                                                const dayNames: Record<string, string> = {
                                                    sun: 'الأحد', mon: 'الاثنين', tue: 'الثلاثاء',
                                                    wed: 'الأربعاء', thu: 'الخميس', fri: 'الجمعة', sat: 'السبت'
                                                };
                                                return (
                                                    <span className="text-[9px] text-[#655ac1] font-bold truncate mt-0.5">
                                                        {days.map(d => dayNames[d] || d).join('، ')}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                        {isSelected && (
                                            <span className="w-5 h-5 rounded-full bg-[#655ac1] flex items-center justify-center shrink-0">
                                                <Check size={11} className="text-white" strokeWidth={3}/>
                                            </span>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewingTeacher(t);
                                            }}
                                            className="text-[#655ac1] bg-[#e5e1fe] hover:bg-[#d0cbfb] p-1.5 rounded-lg shadow-sm transition-all hover:scale-105"
                                            title="عرض الإسناد"
                                        >
                                            <ClipboardList size={14} />
                                        </button>

                                        {assignedLoad > 0 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUnassignTeacher(t.id, t.name);
                                                }}
                                                className="text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                                                title="حذف جميع إسنادات المعلم"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Bar & Quota */}
                                {t.isShared ? (() => {
                                    // ── شريطان للمعلم المشترك ──
                                    const schoolA_Id = t.schoolId || 'main';
                                    const schoolA_Name = schoolA_Id === 'main'
                                        ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
                                        : (sharedSchools.find(s => s.id === schoolA_Id)?.name || schoolA_Id);

                                    // النصاب المخصص لكل مدرسة (المخزون في schools[].lessons من خطوة إضافة المعلمين)
                                    const schoolA_Entry = (t.schools || []).find(s => s.schoolId === schoolA_Id);
                                    const schoolA_Quota = schoolA_Entry?.lessons || t.quotaLimit || 24;

                                    // الحصص الفعلية المسندة في المدرسة الأولى (من assignments)
                                    const schoolA_Actual = assignments
                                        .filter(a => a.teacherId === t.id && (classes.find(c => c.id === a.classId)?.schoolId || 'main') === schoolA_Id)
                                        .reduce((sum, a) => sum + (subjects.find(s => s.id === a.subjectId)?.periodsPerClass || 0), 0);

                                    const aIsOver = schoolA_Actual >= schoolA_Quota;
                                    const aIsHigh = schoolA_Actual >= 20;
                                    const aColor = aIsOver ? 'bg-rose-500' : aIsHigh ? 'bg-amber-500' : 'bg-emerald-500';
                                    const aTextCls = aIsOver ? 'bg-rose-100 text-rose-600' : aIsHigh ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600';
                                    const aProgress = schoolA_Quota > 0 ? Math.min(100, Math.round((schoolA_Actual / schoolA_Quota) * 100)) : 0;

                                    const schoolB_Entry = (t.schools || []).find(s => s.schoolId !== schoolA_Id);
                                    const schoolB_Id = schoolB_Entry?.schoolId;
                                    const schoolB_Name = schoolB_Entry?.schoolName || '';

                                    // النصاب المخصص للمدرسة الثانية (مستقل لا يعتمد على المدرسة الأولى)
                                    const schoolB_Quota = schoolB_Entry?.lessons || 0;

                                    // الحصص الفعلية المسندة في المدرسة الثانية (من assignments)
                                    const schoolB_Actual = schoolB_Id
                                        ? assignments
                                            .filter(a => a.teacherId === t.id && (classes.find(c => c.id === a.classId)?.schoolId || 'main') === schoolB_Id)
                                            .reduce((sum, a) => sum + (subjects.find(s => s.id === a.subjectId)?.periodsPerClass || 0), 0)
                                        : 0;

                                    const threshold = schoolB_Quota - 4;
                                    const bIsOver = schoolB_Actual >= schoolB_Quota;
                                    const bIsHigh = schoolB_Actual >= threshold;
                                    const bColor = bIsOver ? 'bg-rose-500' : bIsHigh ? 'bg-amber-500' : 'bg-emerald-500';
                                    const bTextCls = bIsOver ? 'bg-rose-100 text-rose-600' : bIsHigh ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600';
                                    const bProgress = schoolB_Quota > 0 ? Math.min(100, Math.round((schoolB_Actual / schoolB_Quota) * 100)) : 0;

                                    return (
                                        <div className="space-y-1.5">
                                            {/* الشريط الأول — المدرسة الأولى */}
                                            <div className="space-y-1.5 p-2 bg-slate-50/50 rounded-xl border border-slate-50">
                                                <div className="text-[9px] font-black text-slate-400 truncate">{schoolA_Name}</div>
                                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                                    <span>نصاب: <span className="mr-1">{schoolA_Quota}</span></span>
                                                    <span className={`px-1.5 py-0.5 rounded-md ${aTextCls}`}>{schoolA_Actual} حصة</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden">
                                                    <div className={`h-full ${aColor} transition-all duration-700 ease-out shadow-sm`} style={{width: `${aProgress}%`}} />
                                                </div>
                                            </div>
                                            {/* الشريط الثاني — المدرسة الثانية */}
                                            {schoolB_Entry && (
                                                <div className="space-y-1.5 p-2 bg-slate-50/50 rounded-xl border border-slate-50">
                                                    <div className="text-[9px] font-black text-slate-400 truncate">{schoolB_Name}</div>
                                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                                        <span>نصاب: <span className="mr-1">{schoolB_Quota}</span></span>
                                                        <span className={`px-1.5 py-0.5 rounded-md ${bTextCls}`}>{schoolB_Actual} حصة</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden">
                                                        <div className={`h-full ${bColor} transition-all duration-700 ease-out shadow-sm`} style={{width: `${bProgress}%`}} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })() : (
                                    // ── شريط واحد للمعلم غير المشترك (بدون تغيير) ──
                                    <div className="space-y-1.5 p-2 bg-slate-50/50 rounded-xl border border-slate-50">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                            <span className="flex items-center gap-1">
                                                نصاب:
                                                {editingQuotaTeacherId === t.id ? (
                                                    <div className="inline-flex items-center gap-1 mr-1" onClick={e => e.stopPropagation()}>
                                                        <input
                                                            type="number"
                                                            value={tempQuota}
                                                            onChange={e => setTempQuota(Number(e.target.value))}
                                                            className="w-10 text-center border border-[#655ac1] rounded px-0.5 py-0 focus:outline-none bg-white font-black text-[#655ac1]"
                                                            autoFocus
                                                        />
                                                        <button onClick={(e) => saveQuota(e, t)} className="text-emerald-600 hover:bg-emerald-50 rounded p-0.5"><Check size={12}/></button>
                                                    </div>
                                                ) : (
                                                    <span
                                                        className="mr-1 cursor-pointer hover:text-[#655ac1] hover:bg-white px-1.5 py-0.5 rounded transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
                                                        onClick={(e) => startEditingQuota(e, t)}
                                                        title="اضغط لتعديل النصاب"
                                                    >
                                                        {t.quotaLimit}
                                                    </span>
                                                )}
                                            </span>

                                            <span className={`px-1.5 py-0.5 rounded-md ${isOverLimit ? 'bg-rose-100 text-rose-600' : isHighLoad ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {assignedLoad} حصة
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${progressColor} transition-all duration-700 ease-out shadow-sm`}
                                                style={{width: `${progressValue}%`}}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                         <div className="bg-slate-50 p-4 rounded-full mb-3">
                             <Users size={24} />
                         </div>
                         <p className="text-xs font-bold">لا يوجد معلمين</p>
                    </div>
                )}
            </div>
        </aside>

        {/* WORKSPACE (Classes) */}
        <main className="flex-1 flex flex-col gap-6 w-full min-w-0">
             
             {/* Integrated Filter Bar */}
             <div className="flex flex-col md:flex-row items-center gap-4 bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100">
                 <div className="flex items-center gap-2 text-slate-500 font-bold text-sm min-w-fit">
                     <Filter size={18} />
                     <span>تصفية الصفوف والفصول:</span>
                 </div>
                 
                 <div className="flex-1 w-full grid grid-cols-2 gap-4">
                     {/* Grade Multi-Select Dropdown */}
                     <div className="relative" ref={gradeDropdownRef}>
                         <button 
                            onClick={() => setShowGradeDropdown(!showGradeDropdown)}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold transition-all text-sm"
                         >
                             <span className="truncate">
                                 {selectedGrades.length > 0 ? `تم تحديد (${selectedGrades.length})` : 'كل الصفوف'}
                             </span>
                             <ChevronDown size={14} className={`transition-transform ${showGradeDropdown ? 'rotate-180' : ''}`} />
                         </button>
                         
                         {showGradeDropdown && (
                             <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 p-1">
                                 <button
                                    onClick={() => setSelectedGrades([])}
                                    className={`w-full text-right px-3 py-2 rounded-xl font-bold text-xs transition-all border ${selectedGrades.length === 0 ? 'bg-white text-[#655ac1] border-[#655ac1]' : 'text-slate-600 border-transparent hover:bg-slate-50'}`}
                                 >
                                     عرض الكل
                                 </button>
                                 <div className="my-1 border-t border-slate-50"></div>
                                 {activeGrades.map(g => (
                                    <button
                                        key={g}
                                        onClick={() => toggleGradeFilter(g)}
                                        className={`w-full flex justify-between items-center px-3 py-2 rounded-xl font-bold text-xs transition-all border ${selectedGrades.includes(g) ? 'bg-white text-[#655ac1] border-[#655ac1]' : 'text-slate-600 border-transparent hover:bg-slate-50'}`}
                                     >
                                        <span>الصف {g}</span>
                                        {selectedGrades.includes(g) && <Check size={12}/>}
                                     </button>
                                 ))}
                             </div>
                         )}
                     </div>

                     {/* Class Multi-Select Dropdown */}
                     <div className="relative" ref={classDropdownRef}>
                         <button 
                            onClick={() => setShowClassDropdown(!showClassDropdown)}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold transition-all text-sm"
                         >
                             <span className="truncate">
                                 {selectedClassIds.length > 0 ? `تم تحديد (${selectedClassIds.length})` : 'كل الفصول'}
                             </span>
                             <ChevronDown size={14} className={`transition-transform ${showClassDropdown ? 'rotate-180' : ''}`} />
                         </button>
                         
                         {showClassDropdown && (
                             <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 p-1 max-h-60 overflow-y-auto custom-scrollbar">
                                 <button
                                    onClick={() => setSelectedClassIds([])}
                                    className={`w-full text-right px-3 py-2 rounded-xl font-bold text-xs transition-all border ${selectedClassIds.length === 0 ? 'bg-white text-[#655ac1] border-[#655ac1]' : 'text-slate-600 border-transparent hover:bg-slate-50'}`}
                                 >
                                     عرض الكل
                                 </button>
                                 <div className="my-1 border-t border-slate-50"></div>
                                 {availableClassesForDropdown.length > 0 ? (
                                     availableClassesForDropdown.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => toggleClassFilter(c.id)}
                                            className={`w-full flex justify-between items-center px-3 py-2 rounded-xl font-bold text-xs transition-all border ${selectedClassIds.includes(c.id) ? 'bg-white text-[#655ac1] border-[#655ac1]' : 'text-slate-600 border-transparent hover:bg-slate-50'}`}
                                        >
                                            <span>فصل {c.grade} / {c.section}</span>
                                            {selectedClassIds.includes(c.id) && <Check size={12}/>}
                                        </button>
                                     ))
                                 ) : (
                                     <div className="p-3 text-center text-[10px] text-slate-400 font-medium">لا توجد فصول للصفوف المحددة</div>
                                 )}
                             </div>
                         )}
                     </div>
                 </div>
             </div>

             {/* Check if we have classes to show */}
             {displayedGrades.length > 0 ? (
                /* Grades Loop */
                displayedGrades.map(grade => {
                    const gradeClasses = displayedClasses(grade);
                    if (gradeClasses.length === 0) return null;

                    return (
                        <div key={grade} className="space-y-4">
                            {/* Grade Header */}
                            <div className="flex items-center gap-4">
                                <div className="h-px bg-slate-200 flex-1"></div>
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-4 py-1 bg-slate-50 rounded-full border border-slate-100">
                                    <Layers size={14}/> الصف الدراسي {grade}
                                </h3>
                                <div className="h-px bg-slate-200 flex-1"></div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-6">
                                {gradeClasses.map(cls => {
                                    // Filter and Deduplicate Subjects
                                    const rawSubjects: Subject[] = sourceSubjects.filter(
                                        (s) => getGradeSubjectIds(cls).includes(s.id) || cls.subjectIds?.includes(s.id)
                                    );
                                    const classSubjects: Subject[] = Array.from(new Map(rawSubjects.map(s => [s.id, s])).values());
                                    
                                    // Calculate completion
                                    const assignedCount = classSubjects.filter(s => assignments.some(a => a.classId === cls.id && a.subjectId === s.id)).length;
                                    const progress = classSubjects.length > 0 ? Math.round((assignedCount / classSubjects.length) * 100) : 0;
                                    const isCompleted = progress === 100;

                                    return (
                                        <div key={cls.id} className="bg-white rounded-[2rem] border-2 border-[#e5e1fe] shadow-xl shadow-[#655ac1]/5 overflow-hidden hover:shadow-md transition-all duration-300">
                                            {/* Header */}
                                            <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-[#fbfbfe] to-white group">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner transition-all duration-500 ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-[#e5e1fe] text-[#655ac1]'}`}>
                                                        {isCompleted ? <Check size={20} /> : cls.section}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-base font-black text-slate-800">الفصل {cls.grade} / {cls.section}</h4>
                                                        <div className="flex items-center gap-3 mt-1">
                                                                <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div className={`h-full transition-all duration-700 ease-out ${isCompleted ? 'bg-emerald-500' : 'bg-[#655ac1]'}`} style={{width: `${progress}%`}}></div>
                                                                </div>
                                                                <span className={`text-[9px] font-bold ${isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>{progress}% مكتمل</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 text-[9px] text-amber-600 font-bold bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full shadow-sm animate-pulse">
                                                    <AlertTriangle size={10} />
                                                    انقر للتعيين
                                                </div>
                                            </div>

                                            {/* Subjects Grid */}
                                            <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                                {classSubjects.length > 0 ? (
                                                    classSubjects.map(sub => {
                                                        const assignment = assignments.find(a => a.classId === cls.id && a.subjectId === sub.id);
                                                        const assignedTeacher = teachers.find(t => t.id === assignment?.teacherId);
                                                        
                                                        const isAssigned = !!assignment;
                                                        
                                                        return (
                                                            <div 
                                                                key={sub.id}
                                                                onClick={() => {
                                                                    if (!isAssigned) {
                                                                        if (selectedTeacherId) handleAssign(cls.id, sub.id);
                                                                        else showToast('اختر معلماً أولاً من القائمة اليمنى', 'warning');
                                                                    }
                                                                }}
                                                                onDoubleClick={() => isAssigned && handleUnassign(cls.id, sub.id)}
                                                                className={`
                                                                    relative p-3 rounded-2xl border text-right transition-all group cursor-pointer select-none flex flex-col justify-between min-h-[85px]
                                                                    ${isAssigned 
                                                                        ? 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 shadow-sm' 
                                                                        : 'bg-white border-slate-100 hover:border-[#8779fb] hover:shadow-md hover:-translate-y-1'}
                                                                `}
                                                            >
                                                                <div className="flex justify-between items-start mb-1.5">
                                                                    <div className="flex flex-col gap-0.5 max-w-[85%]">
                                                                        <span className={`text-[11px] font-black truncate ${isAssigned ? 'text-emerald-800' : 'text-slate-700'}`}>{sub.name}</span>
                                                                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                                                            {sub.periodsPerClass} حصص
                                                                        </span>
                                                                    </div>
                                                                    {isAssigned && <div className="p-0.5 bg-emerald-100 rounded-full"><CheckCircle2 size={10} className="text-emerald-600" /></div>}
                                                                </div>
                                                                
                                                                {isAssigned ? (
                                                                    <div className="flex items-center gap-1.5 mt-auto animate-in zoom-in duration-300">
                                                                        <div className="w-5 h-5 rounded-full bg-emerald-200/50 flex items-center justify-center text-[9px] font-black text-emerald-800 shadow-sm border border-emerald-100">
                                                                            {assignedTeacher?.name.substring(0,2)}
                                                                        </div>
                                                                        <span className="text-[9px] font-bold text-emerald-700 truncate flex-1">
                                                                            {assignedTeacher?.name}
                                                                        </span>
                                                                        
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); handleUnassign(cls.id, sub.id); }}
                                                                            className="absolute -top-1.5 -left-1.5 bg-white text-rose-400 hover:text-rose-600 hover:bg-rose-50 border border-rose-100 shadow-sm rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
                                                                            title="إلغاء الإسناد"
                                                                        >
                                                                            <X size={10} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="mt-auto flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                                                        <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                                                                            <User size={8} className="text-slate-400"/>
                                                                        </div>
                                                                        <span className="text-[9px] text-slate-400 font-bold">--</span>
                                                                    </div>
                                                                )}

                                                                {!isAssigned && selectedTeacherId && (
                                                                    <div className="absolute inset-0 bg-[#655ac1]/5 opacity-0 group-hover:opacity-100 transition-all rounded-2xl border-2 border-[#655ac1] border-dashed flex items-center justify-center backdrop-blur-[1px]">
                                                                        <span className="text-[10px] font-black text-[#655ac1] bg-white px-2 py-0.5 rounded-lg shadow-sm">إسناد</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="col-span-full py-6 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl">
                                                        <LayoutTemplate size={24} className="mb-1 opacity-50"/>
                                                        <p className="text-[10px] font-bold">لا توجد مواد في هذا الفصل</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })
             ) : (
                 <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100 p-12 text-center min-h-[400px]">
                     <div className="w-20 h-20 rounded-full flex items-center justify-center text-slate-300 mb-6 animate-pulse">
                         <LayoutGrid size={40} />
                     </div>
                     <h3 className="text-xl font-black text-slate-700 mb-2">لا توجد فصول دراسية</h3>
                     <p className="text-slate-400 font-medium max-w-md mx-auto mb-8">
                         قم بإنشائها من صفحة الفصول
                     </p>
                 </div>
             )}
        </main>
      </div>

      <button 
        onClick={scrollToTop}
        className="fixed bottom-6 left-6 bg-[#655ac1] text-white p-3 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all z-40 opacity-50 hover:opacity-100"
        title="للأعلى"
      >
        <ArrowUp size={20} />
      </button>

    </div>
  );
};

export default ManualAssignment;
