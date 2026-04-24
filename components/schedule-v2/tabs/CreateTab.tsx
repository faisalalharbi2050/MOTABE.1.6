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
import GenerationStatusModal from '../../wizard/schedule/GenerationStatusModal';

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
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<'ready' | 'generating' | 'success'>('ready');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [missingDataAlert, setMissingDataAlert] = useState<{ title: string; message: string } | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [generationStats, setGenerationStats] = useState({
    teachers: 0, classes: 0, assignments: 0, periodsPerDay: 0, activeDays: 0,
  });

  const generationMode = scheduleSettings.generationMode || 'unified';
  const setGenerationMode = (mode: 'unified' | 'separate') =>
    setScheduleSettings(prev => ({ ...prev, generationMode: mode }));

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
    else openGenerationModal();
  };

  const openGenerationModal = () => {
    const timing = getTimingConfig();
    const periodsPerDay = Math.max(...(Object.values(timing.periodCounts || {}) as number[]));
    setGenerationStats({ teachers: teachers.length, classes: classes.length, assignments: assignments.length, periodsPerDay, activeDays: timing.activeDays.length });
    setGenerationStatus('ready');
    setGenerationProgress(0);
    setShowGenerationModal(true);
    setShowConflictReport(false);
  };

  const handleContinueWithBypass = (bypass: boolean) => {
    setIsBypassingConflicts(bypass);
    openGenerationModal();
  };

  const startGeneration = async () => {
    setGenerationStatus('generating');
    setIsGenerating(true);

    setTimeout(async () => {
      try {
        const timing = getTimingConfig();
        const periodsPerDay = Math.max(...(Object.values(timing.periodCounts || {}) as number[]));
        let finalTimetable: Record<string, any> = {};

        if (hasSharedSchools && generationMode === 'separate') {
          const schoolIds = ['main', ...(schoolInfo.sharedSchools || []).map(s => s.id)];
          let accumulated: Record<string, any> = {};
          for (let i = 0; i < schoolIds.length; i++) {
            const sid = schoolIds[i];
            const schoolClasses = classes.filter(c => c.schoolId === sid || (!c.schoolId && sid === 'main'));
            const tt = await generateSchedule(
              teachers, subjects, schoolClasses, scheduleSettings,
              { activeDays: timing.activeDays, periodsPerDay, weekDays: timing.activeDays.length },
              (p) => setGenerationProgress(Math.floor((i * 100 + p) / schoolIds.length)),
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
            (p) => setGenerationProgress(p),
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
          scheduleGenerationCount: (scheduleSettings.scheduleGenerationCount || 0) + 1,
        });
        setGenerationStatus('success');
        setGenerationProgress(100);
        setTimeout(() => setShowGenerationModal(false), 2000);
      } catch (err) {
        console.error(err);
        setMissingDataAlert({ title: 'خطأ غير متوقع', message: 'حدث خطأ أثناء بناء الجدول. حاول مرة أخرى.' });
        setShowGenerationModal(false);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
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

      {hasSharedSchools && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200" style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-3 mb-4">
            <Calendar size={20} className="text-[#655ac1]" />
            <h4 className="font-black text-slate-800 text-sm">وضع الجدول</h4>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setGenerationMode('unified')}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm transition-all border-2 ${
                generationMode === 'unified'
                  ? 'border-[#655ac1] bg-white text-[#655ac1]'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
              }`}
            >
              {generationMode === 'unified' && <Check size={16} />}
              <Grid size={16} /> جدول موحد
            </button>
            <button
              onClick={() => setGenerationMode('separate')}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm transition-all border-2 ${
                generationMode === 'separate'
                  ? 'border-[#655ac1] bg-white text-[#655ac1]'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
              }`}
            >
              {generationMode === 'separate' && <Check size={16} />}
              <LayoutGrid size={16} /> جدولان منفصلان
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-slate-200 transition-all w-full text-center" style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-center gap-3 mb-2">
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
              if (hasSchedule) {
                setShowRegenerateConfirm(true);
                return;
              }
              handleValidation();
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
              <div className="w-11 h-11 bg-rose-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={22} className="text-rose-600" />
              </div>
              <h3 className="font-black text-slate-800 text-lg">إعادة إنشاء الجدول؟</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-5">
              سيتم حذف الجدول الحالي واستبداله بجدول جديد بعد إعادة الإنشاء. هل تريد المتابعة؟
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
                  handleValidation();
                }}
                className="flex-1 py-3 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold transition-all"
              >
                تأكيد إعادة الإنشاء
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

      <GenerationStatusModal
        isOpen={showGenerationModal}
        onClose={() => setShowGenerationModal(false)}
        onStart={startGeneration}
        status={generationStatus}
        stats={generationStats}
        progress={generationProgress}
      />
    </div>
  );
};

export default CreateTab;
