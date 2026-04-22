import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Lock,
  Unlock,
  Shuffle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Users,
  CalendarClock,
  GripHorizontal,
  PenLine,
  User,
  Search,
  X,
} from 'lucide-react';
import {
  SchoolInfo,
  ScheduleSettingsData,
  Teacher,
  Subject,
  ClassInfo,
  Admin,
  Assignment,
  Specialization,
  SubstitutionConfig,
} from '../../../types';
import { validateAllConstraints } from '../../../utils/scheduleConstraints';
import { distributeWaiting } from '../../../utils/waitingDistributor';
import SubstitutionTab from '../../schedule/SubstitutionTab';
import InlineScheduleView from '../../schedule/InlineScheduleView';
import ConfirmDialog from '../../ui/ConfirmDialog';

interface Props {
  schoolInfo: SchoolInfo;
  scheduleSettings: ScheduleSettingsData;
  setScheduleSettings: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  admins: Admin[];
  assignments: Assignment[];
  specializations: Specialization[];
  isScheduleLocked: boolean;
  setIsScheduleLocked: React.Dispatch<React.SetStateAction<boolean>>;
  onNavigate: (tab: 'view' | 'edit' | 'create' | 'waiting') => void;
}

type SubTab = 'lock' | 'settings' | 'preview';

const WaitingTab: React.FC<Props> = ({
  schoolInfo,
  scheduleSettings,
  setScheduleSettings,
  teachers,
  subjects,
  classes,
  admins,
  specializations,
  isScheduleLocked,
  setIsScheduleLocked,
  onNavigate,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('lock');
  const [previewType, setPreviewType] = useState<'general_teachers' | 'general_waiting' | 'individual_teacher'>('general_teachers');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [showTeacherSelector, setShowTeacherSelector] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherSelectorPos, setTeacherSelectorPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 360 });
  const teacherSelectorButtonRef = useRef<HTMLButtonElement>(null);
  const teacherSelectorPanelRef = useRef<HTMLDivElement>(null);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [showRedistributeConfirm, setShowRedistributeConfirm] = useState(false);
  const [showMethodChangeConfirm, setShowMethodChangeConfirm] = useState(false);
  const [showPreviewSkipConfirm, setShowPreviewSkipConfirm] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<SubstitutionConfig | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const hasSchedule = !!scheduleSettings.timetable && Object.keys(scheduleSettings.timetable).length > 0;

  const waitingSlots = useMemo(
    () => Object.values(scheduleSettings.timetable || {}).filter((slot: any) => slot?.type === 'waiting'),
    [scheduleSettings.timetable]
  );

  const waitingCount = waitingSlots.length;
  const hasWaiting = waitingCount > 0;

  const waitingTeachersCount = useMemo(() => {
    const ids = new Set(waitingSlots.map((slot: any) => slot.teacherId).filter(Boolean));
    return ids.size;
  }, [waitingSlots]);

  const waitingCountPerSlot = useMemo(() => {
    const m: Record<string, number> = {};
    Object.entries(scheduleSettings.timetable || {}).forEach(([key, slot]) => {
      if ((slot as any)?.type === 'waiting') {
        const parts = key.split('-');
        const periodIdx = parts[parts.length - 1];
        const dayKey = parts[parts.length - 2];
        const k = `${dayKey}-${periodIdx}`;
        m[k] = (m[k] || 0) + 1;
      }
    });
    return m;
  }, [scheduleSettings.timetable]);

  const filteredTeachers = useMemo(
    () => teachers.filter(t => t.name.toLowerCase().includes(teacherSearch.toLowerCase())),
    [teachers, teacherSearch]
  );

  useEffect(() => {
    if (!showTeacherSelector) return;
    const updatePosition = () => {
      if (!teacherSelectorButtonRef.current) return;
      const rect = teacherSelectorButtonRef.current.getBoundingClientRect();
      const margin = 16;
      const width = Math.min(420, Math.max(300, rect.width));
      const safeWidth = Math.min(width, window.innerWidth - margin * 2);
      const centeredLeft = rect.left + rect.width / 2 - safeWidth / 2;
      setTeacherSelectorPos({
        top: rect.bottom + 8,
        left: Math.min(Math.max(margin, centeredLeft), window.innerWidth - safeWidth - margin),
        width: safeWidth,
      });
    };
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!teacherSelectorButtonRef.current?.contains(t) && !teacherSelectorPanelRef.current?.contains(t))
        setShowTeacherSelector(false);
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTeacherSelector]);

  const substitutionConfig = (scheduleSettings.substitution || {}) as SubstitutionConfig & { manualReady?: boolean };
  const currentMethod = substitutionConfig.method || 'auto';
  const isManualMode = currentMethod === 'manual';
  const isManualReady = Boolean(substitutionConfig.manualReady);
  const isDistributionPrepared = hasWaiting || (isManualMode && isManualReady);

  const specializationNames = useMemo(
    () => Object.fromEntries(specializations.map(item => [item.id, item.name])),
    [specializations]
  );

  const totalManualCards = useMemo(() => {
    if (!isManualMode) return 0;
    const maxQuota = substitutionConfig.maxTotalQuota || 24;
    return teachers.reduce((sum, t) => {
      const quota = t.waitingQuota !== undefined
        ? t.waitingQuota
        : Math.max(0, maxQuota - (t.quotaLimit || 0));
      return sum + quota;
    }, 0);
  }, [teachers, isManualMode, substitutionConfig.maxTotalQuota]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getTimingConfig = () =>
    schoolInfo.timing || {
      activeDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
      periodDuration: 45,
      assemblyTime: '06:45',
      breaks: [],
      prayers: [],
      periodCounts: { sunday: 7, monday: 7, tuesday: 7, wednesday: 7, thursday: 7 },
    };

  const defaultSubstitutionConfig: SubstitutionConfig & { manualReady?: boolean } = {
    method: substitutionConfig.method || 'auto',
    maxTotalQuota: substitutionConfig.maxTotalQuota || 24,
    maxDailyTotal: substitutionConfig.maxDailyTotal || 5,
    fixedPerPeriod: substitutionConfig.fixedPerPeriod || 3,
    manualReady: substitutionConfig.manualReady || false,
  };

  const waitingWarnings = useMemo(() => {
    const timing = getTimingConfig();
    const periodsPerDay = Math.max(...(Object.values(timing.periodCounts || {}) as number[]));
    return validateAllConstraints(
      scheduleSettings,
      subjects,
      teachers,
      timing.activeDays.length,
      periodsPerDay,
      timing.activeDays,
      classes.length,
      schoolInfo.sharedSchools
    );
  }, [scheduleSettings, subjects, teachers, classes.length, schoolInfo.sharedSchools]);

  const subTabs: Array<{ id: SubTab; label: string; icon: React.ComponentType<any> }> = [
    { id: 'lock', label: 'قفل الجدول', icon: Lock },
    { id: 'settings', label: 'إعداد وتنفيذ التوزيع', icon: Shuffle },
    { id: 'preview', label: 'معاينة وتعديل الانتظار', icon: PenLine },
  ];

  const subTabButtonClass = (isActive: boolean) =>
    `flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 border ${
      isActive
        ? 'bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20 border-[#655ac1]'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200 bg-white'
    }`;

  const handleLockToggle = () => {
    if (isScheduleLocked && isDistributionPrepared) {
      setShowUnlockConfirm(true);
      return;
    }
    const nextState = !isScheduleLocked;
    setIsScheduleLocked(nextState);
    showToast(
      nextState ? 'تم قفل الجدول بنجاح' : 'تم فك قفل الجدول',
      nextState ? 'success' : 'info'
    );
  };

  const prepareManualWaiting = () => {
    const maxQuota = substitutionConfig.maxTotalQuota || 24;
    const cardCount = teachers.reduce((sum, t) => {
      const quota = t.waitingQuota !== undefined
        ? t.waitingQuota
        : Math.max(0, maxQuota - (t.quotaLimit || 0));
      return sum + quota;
    }, 0);
    setScheduleSettings(prev => ({
      ...prev,
      substitution: {
        ...(prev.substitution || defaultSubstitutionConfig),
        method: 'manual',
        maxTotalQuota: (prev.substitution as any)?.maxTotalQuota || defaultSubstitutionConfig.maxTotalQuota,
        maxDailyTotal: (prev.substitution as any)?.maxDailyTotal || defaultSubstitutionConfig.maxDailyTotal,
        fixedPerPeriod: (prev.substitution as any)?.fixedPerPeriod || defaultSubstitutionConfig.fixedPerPeriod,
        manualReady: true,
      } as any,
      waitingGenerationCount: (prev.waitingGenerationCount || 0) + 1,
    }));
    showToast(`تم تجهيز ${cardCount} بطاقة انتظار جاهزة للتوزيع اليدوي`, 'success');
  };

  const execAutomaticOrFixedDistribution = () => {
    try {
      if (!scheduleSettings.timetable) {
        showToast('لا يوجد جدول حصص لتوزيع الانتظار عليه', 'error');
        return;
      }
      const timing = getTimingConfig();
      const periodsPerDay = Math.max(...(Object.values(timing.periodCounts || {}) as number[]));
      const newTimetable = distributeWaiting(scheduleSettings.timetable, teachers, admins, scheduleSettings, {
        activeDays: timing.activeDays,
        periodsPerDay,
      });
      setScheduleSettings(prev => ({
        ...prev,
        timetable: newTimetable,
        substitution: {
          ...(prev.substitution || defaultSubstitutionConfig),
          manualReady: false,
        } as any,
        waitingGenerationCount: (prev.waitingGenerationCount || 0) + 1,
      }));
      showToast('تم إنشاء وتوزيع حصص الانتظار بنجاح', 'success');
      setShowRedistributeConfirm(false);
    } catch (error) {
      console.error(error);
      showToast('حدث خطأ أثناء إنشاء حصص الانتظار', 'error');
    }
  };

  const handleCreateWaiting = () => {
    if (isManualMode) {
      if (hasWaiting) {
        setShowRedistributeConfirm(true);
      } else {
        prepareManualWaiting();
      }
      return;
    }
    if (hasWaiting) {
      setShowRedistributeConfirm(true);
    } else {
      execAutomaticOrFixedDistribution();
    }
  };

  const openPreviewTab = () => {
    setSubTab('preview');
    setShowPreviewSkipConfirm(false);
  };

  const requestPreviewTab = () => {
    if (!isDistributionPrepared) {
      setShowPreviewSkipConfirm(true);
      return;
    }
    openPreviewTab();
  };

  if (!hasSchedule) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm p-12 text-center">
        <AlertTriangle className="mx-auto mb-5 text-[#655ac1]" size={36} />
        <h3 className="text-xl font-black text-slate-800 mb-2">لا يوجد جدول للانتظار</h3>
        <p className="text-sm text-slate-500 font-medium">
          يجب إنشاء جدول الحصص أولًا من تبويب "إنشاء الجدول" قبل إعداد الانتظار
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Sub-tabs navigation */}
      <div className="bg-white rounded-[2rem] px-4 py-3 border border-slate-100 shadow-sm">
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'preview') {
                  requestPreviewTab();
                  return;
                }
                setSubTab(tab.id);
              }}
              className={subTabButtonClass(subTab === tab.id)}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── قفل الجدول ── */}
      {subTab === 'lock' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all w-full">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  {isScheduleLocked ? (
                    <Lock size={22} className="text-[#655ac1]" />
                  ) : (
                    <Unlock size={22} className="text-slate-500" />
                  )}
                </div>
                <div>
                  <p className="font-black text-slate-800 text-lg">
                    {isScheduleLocked ? 'الجدول مقفل' : 'الجدول غير مقفل'}
                  </p>
                  <p className="text-sm font-medium mt-1 text-slate-500">
                    {isScheduleLocked
                      ? 'يمكنك الآن إعداد وتنفيذ توزيع حصص الانتظار'
                      : 'اقفل الجدول لتفعيل إعدادات الانتظار وتنفيذ التوزيع'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLockToggle}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all border ${
                  isScheduleLocked
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    : 'bg-[#655ac1] hover:bg-[#5046a0] text-white border-[#655ac1]'
                }`}
              >
                {isScheduleLocked ? <Unlock size={16} /> : <Lock size={16} />}
                {isScheduleLocked ? 'فك القفل' : 'قفل الجدول'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── إعداد وتنفيذ التوزيع ── */}
      {subTab === 'settings' && (
        <div className="space-y-4">
          {!isScheduleLocked && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 border border-amber-200">
                <Lock size={18} className="text-amber-600" />
              </div>
              <p className="text-sm font-bold text-amber-800 flex-1">
                اقفل الجدول أولًا لتفعيل إعدادات وتوزيع الانتظار
              </p>
              <button
                onClick={() => setSubTab('lock')}
                className="shrink-0 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 px-4 py-2 rounded-lg text-xs font-bold transition-all"
              >
                انتقل إلى القفل
              </button>
            </div>
          )}

          <div className={`transition-all duration-300 ${!isScheduleLocked ? 'opacity-50 pointer-events-none select-none' : ''}`}>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <SubstitutionTab
                teachers={teachers}
                config={substitutionConfig}
                weekDays={getTimingConfig().activeDays.length}
                periodsPerDay={Math.max(...(Object.values(getTimingConfig().periodCounts || {}) as number[]))}
                warnings={waitingWarnings}
                onChange={config => {
                  const previousMethod = substitutionConfig.method;
                  if (previousMethod === 'manual' && config.method !== 'manual') {
                    const hasPlacedWaiting = Object.values(scheduleSettings.timetable || {}).some(
                      (slot: any) => slot.type === 'waiting'
                    );
                    if (hasPlacedWaiting) {
                      setPendingConfig({ ...(config as any), manualReady: false } as any);
                      setShowMethodChangeConfirm(true);
                      return;
                    }
                  }
                  setScheduleSettings(prev => ({
                    ...prev,
                    substitution: {
                      ...(config as any),
                      manualReady: config.method === 'manual' ? ((prev.substitution as any)?.manualReady || false) : false,
                    } as any,
                  }));
                }}
              />

              {/* بطاقة ابدأ إنشاء حصص الانتظار */}
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <p className="text-sm font-black text-slate-800 text-center mb-5">
                  ابدأ إنشاء حصص الانتظار بعد ضبط الإعدادات
                </p>

                {isDistributionPrepared && !isManualMode && (
                  <div className="mb-4 flex items-center justify-center gap-2 text-emerald-700">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <p className="text-sm font-bold">{`تم توزيع ${waitingCount} حصة انتظار.`}</p>
                  </div>
                )}

                <div>
                  {isManualMode ? (
                    <div className="space-y-4">
                      {isManualReady && (
                        <div className="flex items-center justify-center gap-2 text-emerald-700">
                          <CheckCircle2 size={16} className="shrink-0" />
                          <p className="text-sm font-bold">
                            {totalManualCards > 0
                              ? `تم تجهيز ${totalManualCards} بطاقة انتظار — انتقل إلى معاينة وتعديل لتوزيعها`
                              : 'تم تجهيز بطاقات الانتظار — انتقل إلى معاينة وتعديل لتوزيعها'}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-3 flex-wrap">
                      <button
                        onClick={handleCreateWaiting}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black transition-all ${
                          isManualReady
                            ? 'text-[#655ac1] hover:bg-[#f5f3ff] hover:border-[#c4b5fd]'
                            : 'text-slate-700 hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1]'
                        }`}
                      >
                        <Shuffle size={16} />
                        {isManualReady ? 'إعادة إنشاء بطاقات الانتظار' : 'إنشاء بطاقات الانتظار'}
                      </button>
                      <button
                        onClick={() => {
                          setSubTab('preview');
                          onNavigate('waiting');
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d8d0ff] bg-[#f8f7ff] px-4 py-2.5 text-sm font-black text-[#655ac1] transition-all hover:border-[#c4b5fd] hover:bg-[#f1efff]"
                      >
                        <PenLine size={14} />
                        الانتقال إلى معاينة وتعديل
                      </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center pt-1">
                      <button
                        onClick={handleCreateWaiting}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black transition-all ${
                          hasWaiting
                            ? 'text-[#655ac1] hover:bg-[#f5f3ff] hover:border-[#c4b5fd]'
                            : 'text-slate-700 hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1]'
                        }`}
                      >
                        <Shuffle size={16} />
                        {hasWaiting ? 'إعادة إنشاء حصص الانتظار' : 'إنشاء حصص الانتظار'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── معاينة وتعديل ── */}
      {subTab === 'preview' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[2rem] px-4 py-3 border border-slate-100 shadow-sm">
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              <button
                onClick={() => setPreviewType('general_teachers')}
                className={subTabButtonClass(previewType === 'general_teachers')}
              >
                <Users size={16} /> الجدول العام للمعلمين
              </button>
              <button
                onClick={() => setPreviewType('general_waiting')}
                className={subTabButtonClass(previewType === 'general_waiting')}
              >
                <CalendarClock size={16} /> الجدول العام للانتظار
              </button>
              <button
                onClick={() => setPreviewType('individual_teacher')}
                className={subTabButtonClass(previewType === 'individual_teacher')}
              >
                <User size={16} /> جدول معلم
              </button>
            </div>
          </div>

          {!isDistributionPrepared && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 border border-amber-200">
                <AlertTriangle size={16} className="text-amber-600" />
              </div>
              <p className="text-sm font-bold text-amber-800 leading-relaxed">
                لم يتم تحديد أو تنفيذ آلية التوزيع بعد، ويمكنك المتابعة إلى المعاينة والتعديل.
              </p>
            </div>
          )}

          {isDistributionPrepared && previewType === 'general_waiting' && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 border border-amber-200">
                <Info size={15} className="text-amber-600" />
              </div>
              <p className="text-sm font-medium text-amber-800 leading-relaxed">
                الجدول العام للانتظار للعرض فقط. لتعديل حصص الانتظار انتقل إلى الجدول العام للمعلمين ثم عدّل الحصة من هناك.
              </p>
            </div>
          )}

          {previewType === 'individual_teacher' ? (
            <div className="space-y-4">
              {/* Teacher selector — نفس تصميم EditTab */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <User size={20} className="text-[#655ac1] shrink-0" />
                  <p className="text-xs font-black text-slate-500 shrink-0">اختر معلماً أو أكثر لعرض جدولهم</p>
                  <button
                    ref={teacherSelectorButtonRef}
                    onClick={() => setShowTeacherSelector(v => !v)}
                    className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center gap-2"
                  >
                    <Search size={16} className="text-[#655ac1]" />
                    اختيار المعلمين
                  </button>
                </div>
                {selectedTeacherIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                    {teachers.filter(t => selectedTeacherIds.includes(t.id)).map(t => (
                      <div key={t.id} className="flex items-center gap-2 pl-2.5 pr-3.5 py-2 bg-white text-[#655ac1] rounded-xl border border-slate-300 shadow-sm">
                        <span className="text-sm font-bold">{t.name}</span>
                        <button
                          onClick={() => setSelectedTeacherIds(prev => prev.filter(id => id !== t.id))}
                          className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-slate-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedTeacherIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-56 text-center text-slate-400">
                  <User size={42} className="mb-3 text-[#655ac1]" />
                  <p className="text-sm font-bold text-slate-500">قم باختيار المعلم أولاً لعرض جدوله</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedTeacherIds.map((id, idx) => (
                    <div key={id} style={{ zoom: 0.78 }}>
                      {idx > 0 && <div className="h-px bg-gradient-to-r from-transparent via-[#a59bf0] to-transparent opacity-40 mb-6" />}
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-4">
                        <InlineScheduleView
                          type="individual_teacher"
                          targetId={id}
                          settings={scheduleSettings}
                          teachers={teachers}
                          classes={classes}
                          subjects={subjects}
                          specializationNames={specializationNames}
                          showWaitingManagement
                          interactive
                          forceWaitingInteractive
                          waitingCountPerSlot={waitingCountPerSlot}
                          fullscreenButtonLabel="فتح الانتظار للتعديل"
                          onUpdateSettings={setScheduleSettings}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4">
              <InlineScheduleView
                type={previewType as 'general_teachers' | 'general_waiting'}
                settings={scheduleSettings}
                teachers={teachers}
                classes={classes}
                subjects={subjects}
                specializationNames={specializationNames}
                showInlineGeneralHeader
                inlineWaitingReadOnly
                fullscreenButtonLabel="فتح الانتظار للتعديل"
                onUpdateSettings={setScheduleSettings}
                onDeleteAllWaiting={() => {
                  setScheduleSettings(prev => ({
                    ...prev,
                    timetable: Object.fromEntries(
                      Object.entries(prev.timetable || {}).filter(([, v]: any) => v?.type !== 'waiting')
                    ),
                  }));
                  showToast('تم حذف جميع حصص الانتظار من الجدول', 'success');
                }}
              />
            </div>
          </div>
          )}
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl font-bold shadow-2xl animate-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white'
              : toast.type === 'error'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-700 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Teacher selector portal */}
      {showTeacherSelector && createPortal(
        <div
          ref={teacherSelectorPanelRef}
          className="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[120] animate-in slide-in-from-top-2"
          style={{ top: teacherSelectorPos.top, left: teacherSelectorPos.left, width: teacherSelectorPos.width, direction: 'rtl' }}
        >
          <div className="relative mb-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="ابحث عن معلم..."
              value={teacherSearch}
              onChange={e => setTeacherSearch(e.target.value)}
              className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#655ac1]/20 font-medium"
            />
          </div>
          <div className="flex items-center justify-between px-2 py-2 mb-2 border border-slate-100 bg-slate-50 rounded-xl">
            <button onClick={() => setSelectedTeacherIds(teachers.map(t => t.id))} className="text-xs font-black text-[#655ac1] hover:underline">اختيار الكل</button>
            <button onClick={() => setSelectedTeacherIds([])} className="text-xs font-black text-slate-400 hover:text-rose-500 hover:underline">إلغاء الكل</button>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {filteredTeachers.map(t => {
              const isSelected = selectedTeacherIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeacherIds(prev =>
                    isSelected ? prev.filter(id => id !== t.id) : [...prev, t.id]
                  )}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-white text-[#655ac1] border-[#655ac1] shadow-sm'
                      : 'text-slate-700 border-transparent hover:bg-[#f0edff] hover:text-[#655ac1] hover:border-[#d9d3ff]'
                  }`}
                >
                  {t.name}
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border transition-all ${
                    isSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'
                  }`}>
                    <span className="text-[11px] font-black">✓</span>
                  </span>
                </button>
              );
            })}
            {filteredTeachers.length === 0 && (
              <p className="text-center text-xs text-slate-400 font-medium py-3">لا يوجد معلمون مطابقون</p>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* تخطي معاينة التوزيع */}
      {showPreviewSkipConfirm && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center">
                <AlertTriangle size={22} className="text-rose-500" />
              </div>
              <h3 className="font-black text-slate-800 text-lg">الانتقال إلى معاينة وتعديل</h3>
            </div>
            <p className="text-sm text-rose-700 bg-white border border-rose-200 rounded-xl p-4 leading-relaxed mb-5">
              لم يتم اختيار أو تنفيذ آلية التوزيع بعد. هل تريد التخطي والمتابعة إلى معاينة وتعديل؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPreviewSkipConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={openPreviewTab}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all"
              >
                تخطَّ والمتابعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* تأكيد فك القفل — نظام التأكيدات بالمنصة باللون الأحمر */}
      <ConfirmDialog
        isOpen={showUnlockConfirm}
        title="فك قفل الجدول"
        message="يوجد توزيع أو تجهيز انتظار حالي. فك القفل يسمح بتعديل الجدول الأساسي، وفي حال إعادة الإنشاء سيتم حذف الوضع الحالي وبناء جديد."
        confirmLabel="فك القفل"
        cancelLabel="إلغاء"
        tone="danger"
        onCancel={() => setShowUnlockConfirm(false)}
        onConfirm={() => {
          setIsScheduleLocked(false);
          setShowUnlockConfirm(false);
          showToast('تم فك قفل الجدول', 'info');
        }}
      />

      {/* تأكيد إعادة التوزيع */}
      {showRedistributeConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="font-black text-slate-800 text-lg">
                {isManualMode ? 'إعادة تجهيز بطاقات الانتظار' : 'إعادة إنشاء حصص الانتظار'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 leading-relaxed mb-5">
              {isManualMode
                ? 'يوجد تجهيز سابق لبطاقات الانتظار اليدوي. سيتم حذف الوضع الحالي وتجهيز بطاقات جديدة. هل تريد المتابعة؟'
                : `يوجد توزيع سابق (${waitingCount} حصة على ${waitingTeachersCount} معلم). سيتم حذف التوزيع السابق بالكامل وبناء توزيع جديد. هل تريد المتابعة؟`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRedistributeConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={isManualMode ? prepareManualWaiting : execAutomaticOrFixedDistribution}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all"
              >
                متابعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* تأكيد تغيير طريقة التوزيع */}
      {showMethodChangeConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-rose-500" />
              </div>
              <div>
                <h3 className="font-black text-slate-800">تغيير طريقة التوزيع</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  سيتم حذف جميع حصص الانتظار الموزعة أو الجاهزة يدويًا
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 leading-relaxed">
              لديك حصص انتظار موزعة أو مجهزة يدويًا. تغيير الطريقة سيحذفها نهائيًا. هل تريد المتابعة؟
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowMethodChangeConfirm(false);
                  setPendingConfig(null);
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  const newTimetable = Object.fromEntries(
                    Object.entries(scheduleSettings.timetable || {}).filter(([, slot]: any) => slot.type !== 'waiting')
                  );
                  setScheduleSettings(prev => ({
                    ...prev,
                    substitution: { ...(pendingConfig as any), manualReady: false } as any,
                    timetable: newTimetable,
                  }));
                  setShowMethodChangeConfirm(false);
                  setPendingConfig(null);
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all"
              >
                حذف والمتابعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaitingTab;
