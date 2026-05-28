import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Grid,
  LayoutGrid,
  Sparkles,
  Users,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { SchoolInfo, ScheduleSettingsData, Teacher, Subject, ClassInfo, Admin, Assignment, Specialization } from '../../../types';
import { validateAllConstraints, ValidationWarning } from '../../../utils/scheduleConstraints';
import { generateSchedule } from '../../../utils/scheduleGenerator';
import ConflictModal from '../../schedule/ConflictModal';
import LoadingLogo from '../../ui/LoadingLogo';
import PresenceDaysWarningModal from '../PresenceDaysWarningModal';
import TeacherConstraintsModal from '../../teachers/TeacherConstraintsModal';

interface Props {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  scheduleSettings: ScheduleSettingsData;
  setScheduleSettings: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  admins: Admin[];
  assignments: Assignment[];
  specializations: Specialization[];
  onNavigate: (tab: 'view' | 'edit' | 'create' | 'waiting') => void;
  isScheduleLocked: boolean;
  setIsScheduleLocked: React.Dispatch<React.SetStateAction<boolean>>;
}

const CreateTab: React.FC<Props> = ({
  schoolInfo,
  scheduleSettings,
  setScheduleSettings,
  teachers,
  subjects,
  classes,
  assignments,
  isScheduleLocked,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBypassingConflicts, setIsBypassingConflicts] = useState(false);
  const [showConflictReport, setShowConflictReport] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [missingDataAlert, setMissingDataAlert] = useState<{ title: string; message: string } | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showPresenceWarning, setShowPresenceWarning] = useState(false);
  const [constraintsTargetTeacherId, setConstraintsTargetTeacherId] = useState<string | null>(null);

  // Shared teachers that still need presenceDays defined for at least one non-main school
  const sharedTeachersMissingPresence = useMemo(() => {
    const tcList = scheduleSettings.teacherConstraints || [];
    return teachers.filter(t => {
      if (!t.isShared) return false;
      const teacherSchools = t.schools ?? [];
      const nonMain = teacherSchools.filter(s => s.schoolId !== 'main');
      if (nonMain.length === 0) return false;
      const tc = tcList.find(c => c.teacherId === t.id);
      const pd = tc?.presenceDays || {};
      return nonMain.some(s => !pd[s.schoolId] || pd[s.schoolId].length === 0);
    });
  }, [teachers, scheduleSettings.teacherConstraints]);

  const generationMode = scheduleSettings.generationMode;
  const isModeLocked = !!scheduleSettings.generationModeLocked && !!generationMode;
  const setGenerationMode = (mode: 'unified' | 'separate') =>
    setScheduleSettings(prev => ({ ...prev, generationMode: mode }));
  const unlockGenerationMode = () =>
    setScheduleSettings(prev => ({ ...prev, generationModeLocked: false }));

  const hasSharedSchools = !!(schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0);
  const hasSchedule = !!scheduleSettings.timetable && Object.keys(scheduleSettings.timetable).length > 0;
  const assignableClasses = useMemo(
    () => classes.filter(c => !(c.grade === 0 && c.linkedSubjectIds && c.linkedSubjectIds.length > 0)),
    [classes]
  );
  const activeSubjects = useMemo(() => subjects.filter(s => !s.isArchived), [subjects]);

  const readinessReview = useMemo(() => {
    const issues: { level: 'error' | 'warning' | 'info'; message: string; suggestion?: string }[] = [];
    const timing = schoolInfo.timing || {
      activeDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
      periodCounts: { sunday: 7, monday: 7, tuesday: 7, wednesday: 7, thursday: 7 },
    };
    const activeDays = timing.activeDays || [];
    const periodCounts = timing.periodCounts || {};
    const periodsPerDay = Math.max(0, ...(Object.values(periodCounts) as number[]), 0);
    const teacherIds = new Set(teachers.map(t => t.id));
    const classIds = new Set(assignableClasses.map(c => c.id));
    const subjectIds = new Set(activeSubjects.map(s => s.id));
    const relevantAssignments = assignments.filter(a => classIds.has(a.classId));

    if (activeDays.length === 0) {
      issues.push({ level: 'error', message: 'لم يتم تحديد أيام الدراسة النشطة.', suggestion: 'راجع إعدادات وقت الدوام وأيام الدراسة.' });
    }
    if (periodsPerDay <= 0) {
      issues.push({ level: 'error', message: 'عدد الحصص اليومية غير محدد.', suggestion: 'راجع إعدادات الدوام وعدد الحصص لكل يوم.' });
    }
    if (teachers.length === 0) {
      issues.push({ level: 'error', message: 'لا يوجد معلمون.', suggestion: 'استورد أو أضف المعلمين أولًا.' });
    }
    if (assignableClasses.length === 0) {
      issues.push({ level: 'error', message: 'لا توجد فصول قابلة للجدولة.', suggestion: 'أنشئ الفصول قبل إنشاء الجدول.' });
    }
    if (activeSubjects.length === 0) {
      issues.push({ level: 'error', message: 'لا توجد مواد نشطة.', suggestion: 'أضف المواد أو فعّل المواد المطلوبة.' });
    }
    if (relevantAssignments.length === 0) {
      issues.push({ level: 'error', message: 'لا توجد إسنادات مواد للفصول.', suggestion: 'أكمل إسناد المواد للمعلمين قبل إنشاء الجدول.' });
    }

    const brokenAssignments = relevantAssignments.filter(a =>
      !teacherIds.has(a.teacherId) || !subjectIds.has(a.subjectId) || !classIds.has(a.classId)
    );
    if (brokenAssignments.length > 0) {
      issues.push({
        level: 'error',
        message: `يوجد ${brokenAssignments.length} إسنادًا مرتبطًا بمعلم أو مادة أو فصل غير موجود.`,
        suggestion: 'راجع إسناد المواد واحذف أو أعد حفظ الإسنادات غير الصحيحة.'
      });
    }

    const classesWithoutAssignments = assignableClasses.filter(cls =>
      !relevantAssignments.some(a => a.classId === cls.id)
    );
    if (classesWithoutAssignments.length > 0) {
      issues.push({
        level: 'warning',
        message: `${classesWithoutAssignments.length} فصل بدون أي إسناد مواد.`,
        suggestion: 'يمكنك المتابعة، لكن هذه الفصول قد تظهر فارغة في الجدول.'
      });
    }

    const assignedLoad = new Map<string, number>();
    relevantAssignments.forEach(a => {
      const subject = activeSubjects.find(s => s.id === a.subjectId);
      assignedLoad.set(a.teacherId, (assignedLoad.get(a.teacherId) || 0) + (subject?.periodsPerClass || 0));
    });
    const overloadedTeachers = teachers.filter(t => {
      const load = assignedLoad.get(t.id) || 0;
      const quota = t.quotaLimit || 0;
      return quota > 0 && load > quota;
    });
    if (overloadedTeachers.length > 0) {
      issues.push({
        level: 'warning',
        message: `${overloadedTeachers.length} معلمًا لديهم إسناد أعلى من نصاب الحصص.`,
        suggestion: 'راجع النصاب أو الإسناد؛ سيعرض النظام تقرير القيود قبل الإنشاء.'
      });
    }

    const blockingCount = issues.filter(i => i.level === 'error').length;
    return { issues, blockingCount, isReady: blockingCount === 0 };
  }, [schoolInfo.timing, teachers, assignableClasses, activeSubjects, assignments]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getTimingConfig = () => schoolInfo.timing || {
    activeDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    periodDuration: 45,
    assemblyTime: '06:45',
    breaks: [],
    prayers: [],
    periodCounts: { sunday: 7, monday: 7, tuesday: 7, wednesday: 7, thursday: 7 },
  };

  const handleValidation = () => {
    const timing = getTimingConfig();
    const periodCountsValues = Object.values(timing.periodCounts || {}) as number[];
    const periodsPerDay = Math.max(...periodCountsValues);

    const warnings = validateAllConstraints(
      scheduleSettings, subjects, teachers,
      timing.activeDays.length, periodsPerDay, timing.activeDays,
      classes.length, schoolInfo.sharedSchools
    );
    setValidationWarnings(warnings);

    if (!readinessReview.isReady) {
      const firstIssue = readinessReview.issues.find(i => i.level === 'error');
      setMissingDataAlert({
        title: 'البيانات غير جاهزة لإنشاء الجدول',
        message: firstIssue
          ? `${firstIssue.message}${firstIssue.suggestion ? ` ${firstIssue.suggestion}` : ''}`
          : 'راجع ملخص الجاهزية قبل إنشاء الجدول.'
      });
      return;
    }

    if (teachers.length === 0 || classes.length === 0 || subjects.length === 0) {
      setMissingDataAlert({ title: 'بيانات أساسية مفقودة', message: 'تأكد من إضافة بيانات المعلمين والمواد والفصول في إعدادات المدرسة.' });
      return;
    }
    if (!assignments || assignments.length === 0) {
      setMissingDataAlert({ title: 'لا يوجد إسناد للمواد', message: 'يجب إسناد المواد للمعلمين أولاً من قسم "إسناد المواد".' });
      return;
    }
    if (warnings.length > 0) setShowConflictReport(true);
    else startGeneration();
  };

  // Returns true if the presence warning was opened (caller should NOT proceed yet)
  const checkPresenceBeforeGenerate = (): boolean => {
    const effectiveMode = generationMode || 'unified';
    if (effectiveMode !== 'unified') return false;
    if (!hasSharedSchools) return false;
    if (sharedTeachersMissingPresence.length === 0) return false;
    setShowPresenceWarning(true);
    return true;
  };

  const handleContinueWithBypass = (bypass: boolean) => {
    setIsBypassingConflicts(bypass);
    setShowConflictReport(false);
    startGeneration();
  };

  const startGeneration = async () => {
    setIsGenerating(true);
    const wasRegeneration = hasSchedule;

    setTimeout(async () => {
      try {
        const timing = getTimingConfig();
        const periodsPerDay = Math.max(...(Object.values(timing.periodCounts || {}) as number[]));
        let finalTimetable: Record<string, any> = {};

        // Sync presenceDays from teacherConstraints into each shared teacher's
        // constraints field — the generator reads `teacher.constraints.presenceDays`,
        // but the constraints modal writes into `teacherConstraints[].presenceDays`.
        const tcList = scheduleSettings.teacherConstraints || [];
        const teachersWithSyncedPresence = teachers.map(t => {
          if (!t.isShared) return t;
          const tc = tcList.find(c => c.teacherId === t.id);
          if (!tc?.presenceDays) return t;
          return {
            ...t,
            constraints: {
              ...(t.constraints || {}),
              presenceDays: tc.presenceDays,
            },
          };
        });

        const effectiveMode = generationMode || 'unified';
        if (hasSharedSchools && effectiveMode === 'separate') {
          const schoolIds = ['main', ...(schoolInfo.sharedSchools || []).map(s => s.id)];
          let accumulated: Record<string, any> = {};
          for (let i = 0; i < schoolIds.length; i++) {
            const sid = schoolIds[i];
            const schoolClasses = classes.filter(c => c.schoolId === sid || (!c.schoolId && sid === 'main'));
            const tt = await generateSchedule(
              teachersWithSyncedPresence, subjects, schoolClasses, scheduleSettings,
              { activeDays: timing.activeDays, periodsPerDay, weekDays: timing.activeDays.length },
              () => {},
              assignments, isBypassingConflicts,
              Object.keys(accumulated).length > 0 ? accumulated : undefined
            );
            accumulated = { ...accumulated, ...tt };
          }
          finalTimetable = accumulated;
        } else {
          finalTimetable = await generateSchedule(
            teachersWithSyncedPresence, subjects, classes, scheduleSettings,
            { activeDays: timing.activeDays, periodsPerDay, weekDays: timing.activeDays.length },
            () => {},
            assignments, isBypassingConflicts, undefined
          );
        }

        const prevSaved = scheduleSettings.savedSchedules || [];
        const newId = `schedule-${Date.now()}`;
        const newEntry = {
          id: newId,
          name: `جدول رقم ${prevSaved.length + 1}`,
          createdAt: new Date().toISOString(),
          createdBy: 'النظام',
          timetable: JSON.parse(JSON.stringify(finalTimetable)),
        };

        setScheduleSettings({
          ...scheduleSettings,
          timetable: finalTimetable,
          savedSchedules: [newEntry, ...prevSaved].slice(0, 10),
          activeScheduleId: newId,
          generationModeLocked: hasSharedSchools ? true : scheduleSettings.generationModeLocked,
          scheduleGenerationCount: (scheduleSettings.scheduleGenerationCount || 0) + 1,
        });

        // إبقاء شعار التحميل ظاهرًا فترة كافية ليراه المستخدم
        setTimeout(() => {
          setIsGenerating(false);
          showToast(wasRegeneration ? 'تم إعادة إنشاء الجدول بنجاح' : 'تم إنشاء الجدول بنجاح', 'success');
        }, 2500);
      } catch (err) {
        console.error(err);
        setIsGenerating(false);
        setMissingDataAlert({ title: 'خطأ غير متوقع', message: 'حدث خطأ أثناء بناء الجدول. حاول مرة أخرى.' });
      }
    }, 50);
  };

  const totalAssignedPeriods = assignments.reduce((sum, a) => {
    const sub = subjects.find(s => s.id === a.subjectId);
    return sum + (sub?.periodsPerClass || 0);
  }, 0);

  const statsCards = [
    { label: 'المعلمون', value: teachers.length, icon: Users },
    { label: 'الفصول', value: classes.length, icon: LayoutGrid },
    { label: 'الإسنادات', value: assignments.length, icon: ClipboardList },
    { label: 'المواد', value: subjects.length, icon: CalendarDays },
    { label: 'عدد الحصص', value: totalAssignedPeriods, icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statsCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-4 border border-slate-200 transition-all" style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-3">
              <card.icon size={22} className="text-[#655ac1]" />
              <div>
                <p className="text-xs text-slate-500 font-bold">{card.label}</p>
                <p className="text-2xl font-black text-slate-800">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasSharedSchools && !isModeLocked && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200" style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-3 mb-1">
            <Calendar size={20} className="text-[#655ac1]" />
            <h4 className="font-black text-slate-800 text-sm">اختر آلية إنشاء الجدول للمدرستين</h4>
          </div>
          <p className="text-xs font-medium text-slate-500 mb-5 pr-8">
            حدّد كيف تريد توزيع الحصص بين المدرستين المشتركتين قبل البدء.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                id: 'unified' as const,
                title: 'جدول موحد',
                desc: 'إنشاء جدول واحد يشمل المدرستين بنفس آلية التوزيع.',
                Icon: Grid,
              },
              {
                id: 'separate' as const,
                title: 'جدولان منفصلان',
                desc: 'إنشاء جدول مستقل لكل مدرسة مع تجنّب تعارضات المعلمين المشتركين.',
                Icon: LayoutGrid,
              },
            ].map(opt => {
              const active = generationMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setGenerationMode(opt.id)}
                  className={`relative text-right px-5 py-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                    active
                      ? 'border-[#655ac1] bg-white shadow-sm ring-2 ring-[#655ac1]/10'
                      : 'border-slate-200 bg-white hover:border-[#655ac1]/40 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${active ? 'bg-[#655ac1] text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <opt.Icon size={18} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-black text-sm text-slate-800 mb-0.5">{opt.title}</span>
                    <span className="block text-[11px] font-medium text-slate-500 leading-5">{opt.desc}</span>
                  </span>
                  <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${active ? 'border-[#655ac1] bg-[#655ac1] text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`bg-white rounded-2xl p-5 border transition-all ${
        readinessReview.isReady ? 'border-emerald-200' : 'border-amber-200'
      }`} style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3 text-right">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              readinessReview.isReady ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              {readinessReview.isReady ? <CheckCircle2 size={21} /> : <AlertTriangle size={21} />}
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-sm">مراجعة جاهزية إنشاء الجدول</h4>
              <p className="text-xs font-bold text-slate-500 mt-1">
                {readinessReview.isReady
                  ? 'المدخلات الأساسية جاهزة، وسيتم عرض ملاحظات القيود قبل البدء إن وجدت.'
                  : `يوجد ${readinessReview.blockingCount} ملاحظة تمنع إنشاء الجدول حاليًا.`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 text-[11px] font-black">
            <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">الفصول: {assignableClasses.length}</span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">المواد النشطة: {activeSubjects.length}</span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">الإسنادات: {assignments.length}</span>
          </div>
        </div>
        {readinessReview.issues.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {readinessReview.issues.slice(0, 4).map((issue, index) => (
              <div key={`${issue.level}-${index}`} className={`rounded-xl border px-3 py-2 text-right ${
                issue.level === 'error'
                  ? 'bg-rose-50 border-rose-100 text-rose-700'
                  : 'bg-amber-50 border-amber-100 text-amber-700'
              }`}>
                <p className="text-xs font-black">{issue.message}</p>
                {issue.suggestion && <p className="text-[11px] font-bold opacity-80 mt-1">{issue.suggestion}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 transition-all w-full text-center" style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-center gap-3 mb-2 flex-wrap">
          <Sparkles size={22} className="text-[#655ac1] shrink-0" />
          <h3 className="font-black text-slate-800">إنشاء جداول الحصص</h3>
          {hasSchedule && <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />}
        </div>
        <p className="text-sm text-slate-500 font-medium mb-7 max-w-2xl mx-auto">
          {hasSchedule ? 'الجدول جاهز ويمكنك إعادة الإنشاء في أي وقت.' : 'بناء الجدول تلقائيًا وفق القيود والإسنادات.'}
        </p>
        <div className="flex justify-center">
          <button
            onClick={() => {
              if (!readinessReview.isReady) {
                const firstIssue = readinessReview.issues.find(i => i.level === 'error');
                setMissingDataAlert({
                  title: 'البيانات غير جاهزة لإنشاء الجدول',
                  message: firstIssue
                    ? `${firstIssue.message}${firstIssue.suggestion ? ` ${firstIssue.suggestion}` : ''}`
                    : 'راجع ملخص الجاهزية قبل إنشاء الجدول.'
                });
                return;
              }
              if (hasSharedSchools && !generationMode) {
                showToast('اختر آلية إنشاء الجدول للمدرستين أولاً', 'info');
                return;
              }
              setShowRegenerateConfirm(true);
            }}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-[#655ac1] transition-all hover:border-[#655ac1] hover:bg-[#655ac1] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={17} />
            {isGenerating ? 'جارٍ الإنشاء...' : hasSchedule ? 'إعادة إنشاء الجدول' : 'إنشاء الجدول'}
          </button>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl font-bold shadow-2xl animate-in slide-in-from-bottom-5 ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' :
          toast.type === 'error' ? 'bg-rose-500 text-white' :
          'bg-slate-800 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {missingDataAlert && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={22} className="text-amber-600" />
              </div>
              <h3 className="font-black text-slate-800 text-lg">{missingDataAlert.title}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-5">{missingDataAlert.message}</p>
            <button
              onClick={() => setMissingDataAlert(null)}
              className="w-full py-3 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 transition-all"
            >
              حسنًا
            </button>
          </div>
        </div>
      )}

      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-11 h-11 ${hasSchedule ? 'bg-rose-100' : 'bg-indigo-100'} rounded-xl flex items-center justify-center`}>
                {hasSchedule
                  ? <AlertTriangle size={22} className="text-rose-600" />
                  : <Sparkles size={22} className="text-[#655ac1]" />}
              </div>
              <h3 className="font-black text-slate-800 text-lg">
                {hasSchedule ? 'إعادة إنشاء الجدول؟' : 'إنشاء الجدول؟'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-5">
              {hasSchedule
                ? 'سيتم حذف الجدول الحالي واستبداله بجدول جديد بعد إعادة الإنشاء. هل تريد المتابعة؟'
                : 'سيقوم النظام ببناء الجدول تلقائيًا بناءً على إسناد المواد والقيود المحددة. هل تريد المتابعة؟'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  setShowRegenerateConfirm(false);
                  if (hasSharedSchools && isModeLocked) {
                    unlockGenerationMode();
                    showToast('اختر آلية إنشاء الجدول للمدرستين قبل المتابعة', 'info');
                    return;
                  }
                  if (checkPresenceBeforeGenerate()) return;
                  handleValidation();
                }}
                className="flex-1 py-3 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold transition-all"
              >
                {hasSchedule ? 'تأكيد إعادة الإنشاء' : 'تأكيد الإنشاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConflictModal
        isOpen={showConflictReport}
        onClose={() => setShowConflictReport(false)}
        warnings={validationWarnings}
        onContinue={handleContinueWithBypass}
        isGenerating={isGenerating}
        onNavigateTo={() => {}}
      />

      {isGenerating && (
        <div className="fixed inset-0 z-[100000] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
          <LoadingLogo size="lg" />
          <p className="text-base font-bold text-[#655ac1]">جاري إنشاء جدول الحصص...</p>
        </div>
      )}

      <PresenceDaysWarningModal
        isOpen={showPresenceWarning}
        teachers={sharedTeachersMissingPresence}
        teacherConstraints={scheduleSettings.teacherConstraints || []}
        schoolInfo={schoolInfo}
        onAdjustTeacher={(tid) => setConstraintsTargetTeacherId(tid)}
        onContinueAnyway={() => {
          setShowPresenceWarning(false);
          handleValidation();
        }}
        onCancel={() => setShowPresenceWarning(false)}
      />

      {constraintsTargetTeacherId && (
        <TeacherConstraintsModal
          isOpen={!!constraintsTargetTeacherId}
          onClose={() => {
            setConstraintsTargetTeacherId(null);
            // If user resolved all teachers while inside the inner modal,
            // close the warning and proceed automatically with generation.
            if (sharedTeachersMissingPresence.length === 0 && showPresenceWarning) {
              setShowPresenceWarning(false);
              showToast('تم ضبط أيام التواجد لجميع المعلمين', 'success');
              setTimeout(() => handleValidation(), 300);
            }
          }}
          initialTeacherId={constraintsTargetTeacherId}
          initialOpenSection="c7"
          teachers={teachers}
          specializations={specializations}
          constraints={scheduleSettings.teacherConstraints || []}
          activeDays={schoolInfo.timing?.activeDays || ['sunday','monday','tuesday','wednesday','thursday']}
          periodsPerDay={Math.max(7, ...(Object.values(schoolInfo.timing?.periodCounts || {}) as number[]))}
          periodCounts={schoolInfo.timing?.periodCounts || {}}
          classes={classes}
          mainSchoolName={schoolInfo.schoolName || 'المدرسة الرئيسية'}
          schoolPhasesMap={{
            'main': schoolInfo.phases || [],
            ...Object.fromEntries((schoolInfo.sharedSchools || []).map(s => [s.id, s.phases || []]))
          }}
          onChangeConstraints={c => setScheduleSettings(prev => ({ ...prev, teacherConstraints: c }))}
        />
      )}
    </div>
  );
};

export default CreateTab;
