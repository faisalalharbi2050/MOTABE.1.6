import React, { useState } from 'react';
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

  const generationMode = scheduleSettings.generationMode;
  const isModeLocked = !!scheduleSettings.generationModeLocked && !!generationMode;
  const setGenerationMode = (mode: 'unified' | 'separate') =>
    setScheduleSettings(prev => ({ ...prev, generationMode: mode }));
  const unlockGenerationMode = () =>
    setScheduleSettings(prev => ({ ...prev, generationModeLocked: false }));

  const hasSharedSchools = !!(schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0);
  const hasSchedule = !!scheduleSettings.timetable && Object.keys(scheduleSettings.timetable).length > 0;

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

        const effectiveMode = generationMode || 'unified';
        if (hasSharedSchools && effectiveMode === 'separate') {
          const schoolIds = ['main', ...(schoolInfo.sharedSchools || []).map(s => s.id)];
          let accumulated: Record<string, any> = {};
          for (let i = 0; i < schoolIds.length; i++) {
            const sid = schoolIds[i];
            const schoolClasses = classes.filter(c => c.schoolId === sid || (!c.schoolId && sid === 'main'));
            const tt = await generateSchedule(
              teachers, subjects, schoolClasses, scheduleSettings,
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
            teachers, subjects, classes, scheduleSettings,
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
              if (hasSharedSchools && !generationMode) {
                showToast('اختر آلية إنشاء الجدول للمدرستين أولاً', 'info');
                return;
              }
              setShowRegenerateConfirm(true);
            }}
            disabled={isGenerating || (!hasSchedule && isScheduleLocked)}
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
    </div>
  );
};

export default CreateTab;
