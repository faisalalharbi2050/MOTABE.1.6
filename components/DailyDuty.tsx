import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Eye, Settings, Send, Printer,
  CheckCircle, AlertTriangle, ShieldCheck,
  RefreshCw, BarChart3,
  X, Table, AlertCircle,
  Info, Zap
} from 'lucide-react';
import {
  SchoolInfo, Teacher, Admin, ScheduleSettingsData,
  DutyScheduleData,
} from '../types';

import {
  DAYS, DAY_NAMES,
  getTimingConfig, hasDutyTimingData,
  getAvailableStaffForDuty,
  canSuggestExcludeTeachers, getSuggestedDutyCountPerDay,
  generateSmartDutyAssignment, validateDutyGoldenRule
} from '../utils/dutyUtils';

// ===== Sub-component imports =====
import DutyScheduleBuilder from './duty/DutyScheduleBuilder';
import SchoolTabs from './wizard/SchoolTabs';
import AcademicYearPopup from './duty/AcademicYearPopup';
import AcademicCalendarModal from './dashboard/AcademicCalendarModal';
import DutySettingsPage from './duty/DutySettingsPage';
import DutyMonitoringModal from './duty/DutyMonitoring';
import DutyPrintModal from './duty/modals/DutyPrintModal';
import DutyMessagingModal from './duty/modals/DutyMessagingModal';
import DutyReportsModal from './duty/modals/DutyReportsModal';
import DutyManageSchedulesModal from './duty/modals/DutyManageSchedulesModal';
import DutyCreateScheduleModal from './duty/modals/DutyCreateScheduleModal';
import DutyPreCheckModal, { DutyPreCheckItem } from './duty/modals/DutyPreCheckModal';

// Provide default data if none exists
const getDefaultDutyData = (): DutyScheduleData => ({
  exclusions: [],
  settings: {
    excludeVicePrincipals: false,
    excludeGuards: true,
    autoExcludeTeachersWhen5Admins: false,
    suggestedCountPerDay: 4,
    reminderSendTime: '06:30',
    enableAutoAssignment: true,
    sharedSchoolMode: 'unified',
    autoSendLinks: false
  },
  dayAssignments: [],
  weekAssignments: [],
  reports: [],
  isApproved: false,
  savedSchedules: []
});

interface DailyDutyProps {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  teachers: Teacher[];
  admins: Admin[];
  scheduleSettings: ScheduleSettingsData;
  onNavigateToDashboard?: () => void;
}

const DailyDuty: React.FC<DailyDutyProps> = ({
  schoolInfo, setSchoolInfo, teachers, admins, scheduleSettings
}) => {
  const DUTY_ONE_TIME_RESET_MARKER = 'duty_data_reset_2026_04_04_done';
  // ===== State =====
  const [activeSchoolTab, setActiveSchoolTab] = useState<string>('main');
  const [showAcademicPopup, setShowAcademicPopup] = useState(false);
  const [showAcademicCalendarModal, setShowAcademicCalendarModal] = useState(false);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [scheduleChangeAlert, setScheduleChangeAlert] = useState(false);

  // ===== Shared Schools Validation =====
  const sharedSchools = schoolInfo.sharedSchools || [];
  const hasSharedSchools = sharedSchools.length > 0;

  // Modals state
  const [isMonitoringOpen, setIsMonitoringOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isManageSchedulesOpen, setIsManageSchedulesOpen] = useState(false);
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [showPreCheckModal, setShowPreCheckModal] = useState(false);

  // ── Quick-action deep-link from Dashboard ─────────────────────────
  useEffect(() => {
    const handler = () => setIsMessagingOpen(true);
    window.addEventListener('motabe:send_duty', handler);
    return () => window.removeEventListener('motabe:send_duty', handler);
  }, []);

  const storageKey = activeSchoolTab === 'main' ? 'duty_data_v1' : `duty_data_v1_${activeSchoolTab}`;

  const [dutyData, setDutyData] = useState<DutyScheduleData>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...getDefaultDutyData(),
          ...parsed,
          reports: parsed.reports || [],
          exclusions: parsed.exclusions || [],
          dayAssignments: parsed.dayAssignments || [],
          savedSchedules: parsed.savedSchedules || []
        };
      } catch { /* ignore */ }
    }
    return getDefaultDutyData();
  });

  useEffect(() => {
    if (localStorage.getItem(DUTY_ONE_TIME_RESET_MARKER)) return;

    Object.keys(localStorage)
      .filter(key => key.startsWith('duty_data_v1'))
      .forEach(key => localStorage.removeItem(key));

    localStorage.setItem(DUTY_ONE_TIME_RESET_MARKER, 'true');
    setDutyData(getDefaultDutyData());
  }, []);

  // Re-load data when activeSchoolTab changes
  useEffect(() => {
    let globalSharedMode: any = null;
    try {
      const mainSaved = localStorage.getItem('duty_data_v1_main') || localStorage.getItem('duty_data_v1');
      if (mainSaved) {
        const parsedMain = JSON.parse(mainSaved);
        if (parsedMain?.settings?.sharedSchoolMode) {
          globalSharedMode = parsedMain.settings.sharedSchoolMode;
        }
      }
    } catch (e) {}

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDutyData({
          ...getDefaultDutyData(),
          ...parsed,
          reports: parsed.reports || [],
          exclusions: parsed.exclusions || [],
          dayAssignments: parsed.dayAssignments || [],
          savedSchedules: parsed.savedSchedules || [],
          settings: {
            ...(parsed.settings || getDefaultDutyData().settings),
            sharedSchoolMode: globalSharedMode || parsed.settings?.sharedSchoolMode || 'unified'
          }
        });
      } catch {
        const d = getDefaultDutyData();
        setDutyData({
          ...d,
          settings: { ...d.settings, sharedSchoolMode: globalSharedMode || d.settings.sharedSchoolMode }
        });
      }
    } else {
      const d = getDefaultDutyData();
      setDutyData({
        ...d,
        settings: { ...d.settings, sharedSchoolMode: globalSharedMode || d.settings.sharedSchoolMode }
      });
    }
  }, [activeSchoolTab, storageKey]);

  // ===== Persistence =====
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(dutyData));

    // Sync sharedSchoolMode to main to ensure it acts globally across tabs
    if (activeSchoolTab !== 'main') {
      try {
        const mainKey = 'duty_data_v1_main';
        const fallbackKey = 'duty_data_v1';
        let mData = localStorage.getItem(mainKey);
        let usedKey = mainKey;
        if (!mData) {
          mData = localStorage.getItem(fallbackKey);
          usedKey = fallbackKey;
        }
        if (mData) {
          const pData = JSON.parse(mData);
          if (pData.settings && pData.settings.sharedSchoolMode !== dutyData.settings.sharedSchoolMode) {
            pData.settings.sharedSchoolMode = dutyData.settings.sharedSchoolMode;
            localStorage.setItem(usedKey, JSON.stringify(pData));
          }
        }
      } catch (e) {}
    }
  }, [dutyData, storageKey, activeSchoolTab]);

  // ===== Academic Year Check =====
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isReportLink = params.get('staffId') && params.get('day') && params.get('date');
    if (isReportLink) return;
    if (!schoolInfo.academicYear || !(schoolInfo.semesters && schoolInfo.semesters.length > 0)) {
      setShowAcademicPopup(true);
    }
  }, [schoolInfo]);

  // ===== Schedule Change Detection =====
  const prevTimetableRef = React.useRef(scheduleSettings.timetable);
  useEffect(() => {
    if (prevTimetableRef.current !== scheduleSettings.timetable && dutyData.dayAssignments.length > 0) {
      setScheduleChangeAlert(true);
      showToast('تم تغيير جدول الحصص - يُرجى مراجعة المناوبة اليومية', 'warning');
    }
    prevTimetableRef.current = scheduleSettings.timetable;
  }, [scheduleSettings.timetable]);

  // ===== Toast =====
  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ===== Computed values =====
  const timing = useMemo(() => getTimingConfig(schoolInfo), [schoolInfo]);
  const availableStaff = useMemo(() => {
    let targetTeachers = teachers;
    let targetAdmins = admins;

    if (hasSharedSchools && dutyData.settings.sharedSchoolMode === 'separate') {
      targetTeachers = teachers.filter(t => t.schoolId === activeSchoolTab || (!t.schoolId && activeSchoolTab === 'main'));
      targetAdmins = admins.filter(a => (a as any).schoolId === activeSchoolTab || (!(a as any).schoolId && activeSchoolTab === 'main'));
    }

    return getAvailableStaffForDuty(targetTeachers, targetAdmins, dutyData.exclusions, dutyData.settings);
  }, [teachers, admins, dutyData.exclusions, dutyData.settings, hasSharedSchools, activeSchoolTab]);

  const suggestExcludeTeachers = useMemo(() => canSuggestExcludeTeachers(admins), [admins]);
  const suggestedCount = useMemo(
    () => getSuggestedDutyCountPerDay(availableStaff.length, timing.activeDays?.length || 5),
    [availableStaff.length, timing]
  );
  const goldenRuleCheck = useMemo(
    () => validateDutyGoldenRule(dutyData.dayAssignments),
    [dutyData.dayAssignments]
  );

  // ===== Handlers =====
  const handleAutoAssign = () => {
    try {
      let targetTeachers = teachers;
      let targetAdmins = admins;

      if (hasSharedSchools && dutyData.settings.sharedSchoolMode === 'separate') {
        targetTeachers = teachers.filter(t => t.schoolId === activeSchoolTab || (!t.schoolId && activeSchoolTab === 'main'));
        targetAdmins = admins.filter(a => (a as any).schoolId === activeSchoolTab || (!(a as any).schoolId && activeSchoolTab === 'main'));
      }

      const { assignments, weekAssignments, alerts, newCounts } = generateSmartDutyAssignment(
        targetTeachers, targetAdmins, dutyData.exclusions, dutyData.settings,
        scheduleSettings, schoolInfo, dutyData.dutyAssignmentCounts || {}, dutyData.settings.suggestedCountPerDay || suggestedCount
      );
      setDutyData(prev => ({ ...prev, dayAssignments: assignments, weekAssignments, dutyAssignmentCounts: newCounts }));
      showToast('تم التوزيع الذكي بنجاح', 'success');
      if (alerts.length > 0) {
        showToast(alerts[0], 'warning');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء التوزيع', 'error');
    }
  };

  const handleApprove = () => {
    if (!goldenRuleCheck.valid) {
      showToast('يوجد مناوبون مكررون في أكثر من يوم - يُرجى مراجعة التوزيع', 'error');
      return;
    }
    setDutyData(prev => ({
      ...prev,
      isApproved: true,
      approvedAt: new Date().toISOString(),
    }));
    showToast('تم اعتماد جدول المناوبة', 'success');
  };

  // ===== Pre-check items =====
  const currentSemester = schoolInfo.semesters?.find(s => s.isCurrent) || schoolInfo.semesters?.[0];
  const hasSemesterDates = !!(currentSemester?.startDate && currentSemester?.endDate);
  const preChecks: DutyPreCheckItem[] = [
    {
      label: 'الفصل الدراسي',
      detail: hasSemesterDates
        ? `${currentSemester!.name || 'الفصل الدراسي'}: من ${currentSemester!.startDate} إلى ${currentSemester!.endDate}`
        : 'لم يتم تحديد تاريخ بداية ونهاية الفصل الدراسي — يتطلبه إنشاء جدول المناوبة',
      status: hasSemesterDates ? 'ok' : 'error',
    },
    {
      label: 'المناوبون المتاحون',
      detail: availableStaff.length > 0
        ? `${availableStaff.length} مناوب متاح للتوزيع`
        : 'لا يوجد مناوبون متاحون',
      status: availableStaff.length === 0 ? 'error' : availableStaff.length >= suggestedCount ? 'ok' : 'warning',
    },
    ...(dutyData.dayAssignments.length > 0 ? [{
      label: 'الجدول الحالي',
      detail: 'يوجد جدول حالي — سيتم استبداله بالجدول الجديد',
      status: 'warning' as const,
    }] : []),
  ];

  // ===== Settings Page =====
  if (showSettingsPage) {
    return (
      <DutySettingsPage
        onBack={() => setShowSettingsPage(false)}
        onSave={() => {
          showToast('تم حفظ إعدادات المناوبة بنجاح', 'success');
        }}
        teachers={teachers}
        admins={admins}
        totalStaffCount={availableStaff.length}
        exclusions={dutyData.exclusions}
        setExclusions={(excs) => setDutyData(prev => ({
          ...prev,
          exclusions: typeof excs === 'function' ? excs(prev.exclusions) : excs,
        }))}
        settings={dutyData.settings}
        setSettings={(s) => setDutyData(prev => ({
          ...prev,
          settings: typeof s === 'function' ? s(prev.settings) : s,
        }))}
        availableCount={availableStaff.length}
        suggestExclude={suggestExcludeTeachers}
        schoolInfo={schoolInfo}
        showToast={showToast}
      />
    );
  }

  // ===== Staff filter helper =====
  const filteredTeachers = hasSharedSchools && dutyData.settings.sharedSchoolMode === 'separate'
    ? teachers.filter(t => t.schoolId === activeSchoolTab || (!t.schoolId && activeSchoolTab === 'main'))
    : teachers;
  const filteredAdmins = hasSharedSchools && dutyData.settings.sharedSchoolMode === 'separate'
    ? admins.filter(a => (a as any).schoolId === activeSchoolTab || (!(a as any).schoolId && activeSchoolTab === 'main'))
    : admins;

  return (
    <div className="space-y-6 pb-20">
      {/* ══════ Header ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>

        <div className="flex justify-between items-start relative z-10">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <ShieldCheck size={36} strokeWidth={1.8} className="text-[#655ac1]" />
              المناوبة اليومية
            </h3>
            <p className="text-slate-500 font-medium mt-2 mr-12 max-w-2xl text-sm leading-relaxed">
              إنشاء وإدارة جدول المناوبة اليومية نهاية اليوم الدراسي بطريقة ذكية
            </p>
          </div>
        </div>
      </div>

      {/* Shared Schools Tabs */}
      {hasSharedSchools && dutyData.settings.sharedSchoolMode === 'separate' && (
        <SchoolTabs
          schoolInfo={schoolInfo}
          activeSchoolId={activeSchoolTab}
          onTabChange={setActiveSchoolTab}
        />
      )}

      {/* ══════ Toolbar / Action Bar ══════ */}
      <div className="flex flex-col gap-4 mb-6">
        {/* ROW 1 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Right Side */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSettingsPage(true)}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl font-bold transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
            >
              <Settings size={18} className="text-[#655ac1]" />
              <span>إعدادات المناوبة</span>
            </button>
            <button
              onClick={() => setShowPreCheckModal(true)}
              className="flex items-center gap-2 bg-[#655ac1] text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-[#655ac1]/20 transition-all hover:scale-105 active:scale-95"
            >
              <Zap size={18} />
              <span>إنشاء جدول المناوبة</span>
            </button>
          </div>

          {/* Left Side — placeholder for future actions */}
          <div className="flex flex-wrap items-center gap-2"></div>
        </div>

        {/* ROW 2 */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
          {/* Right Side */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPrintOpen(true)}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
            >
              <Printer size={18} className="text-[#655ac1]" />
              <span>طباعة المناوبة</span>
            </button>
            <button
              onClick={() => setIsMessagingOpen(true)}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
            >
              <Send size={18} className="text-[#655ac1]" />
              <span>إرسال المناوبة</span>
            </button>
            <button
              onClick={() => setIsMonitoringOpen(true)}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
            >
              <Eye size={18} className="text-[#655ac1]" />
              <span>المتابعة اليومية</span>
            </button>
          </div>

          {/* Left Side */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsReportsOpen(true)}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
            >
              <BarChart3 size={18} className="text-[#655ac1]" />
              <span>تقارير المناوبة</span>
            </button>
            <button
              onClick={() => setIsManageSchedulesOpen(true)}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
            >
              <Table size={18} className="text-[#655ac1]" />
              <span>إدارة الجداول</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Suggestion Banner */}
      {suggestExcludeTeachers && !dutyData.settings.autoExcludeTeachersWhen5Admins && (
        <div className="bg-[#fcfbff] border-2 border-[#655ac1]/20 rounded-2xl p-5 mb-6 flex items-start gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 bg-[#655ac1] h-full rounded-r-2xl"></div>
          <div className="w-10 h-10 rounded-xl bg-[#e5e1fe] flex items-center justify-center shrink-0">
            <Info size={22} className="text-[#655ac1]" />
          </div>
          <div className="flex-1">
            <p className="text-base font-black text-slate-800">
              يوجد 5 إداريين أو أكثر - يُقترح استثناء المعلمين من المناوبة
            </p>
            <p className="text-sm font-medium text-slate-500 mt-1">
              لتقليل العبء على المعلمين الممارسين للتدريس، ينصح بتفعيل الاستثناء للوصول إلى إدارة أفضل ومريحة للجميع في المناوبة. يمكنك تفعيل هذا الخيار من إعدادات الاستثناءات.
            </p>
          </div>
          <button
            onClick={() => {
              setDutyData(prev => ({
                ...prev,
                settings: { ...prev.settings, autoExcludeTeachersWhen5Admins: true },
              }));
              showToast('تم تفعيل استثناء المعلمين من المناوبة', 'success');
            }}
            className="shrink-0 px-6 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white text-sm font-bold rounded-xl transition-all shadow-md mt-auto mb-auto hover:scale-105 active:scale-95"
          >
            تفعيل التلقائي
          </button>
        </div>
      )}

      {/* Schedule Change Alert */}
      {scheduleChangeAlert && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 bg-amber-500 h-full rounded-r-2xl"></div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-base font-black text-amber-900">
              تم تعديل جدول الحصص - يُرجى مراجعة توزيع المناوبة
            </p>
            <p className="text-sm font-medium text-amber-700/80 mt-1">
              قد تكون هناك تغيرات تؤثر على أيام المناوبة. يُنصح بإعادة التوزيع.
            </p>
          </div>
          <div className="flex gap-2 items-center mt-auto mb-auto">
            <button
              onClick={() => {
                handleAutoAssign();
                setScheduleChangeAlert(false);
              }}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <RefreshCw size={16} />
              <span>إعادة التوزيع</span>
            </button>
            <button
              onClick={() => setScheduleChangeAlert(false)}
              className="p-2.5 text-slate-400 hover:bg-amber-100 hover:text-slate-600 rounded-xl transition-colors"
              title="إغلاق التنبيه"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div id="schedule-builder-section" className="mt-2">
        <DutyScheduleBuilder
          dutyData={dutyData}
          setDutyData={setDutyData}
          teachers={filteredTeachers}
          admins={filteredAdmins}
          scheduleSettings={scheduleSettings}
          schoolInfo={schoolInfo}
          showToast={showToast}
        />
      </div>

      {/* ══════ Modals ══════ */}
      <DutyMonitoringModal
        isOpen={isMonitoringOpen}
        onClose={() => setIsMonitoringOpen(false)}
        dutyData={dutyData}
        setDutyData={setDutyData}
        schoolInfo={schoolInfo}
        showToast={showToast}
      />

      <DutyPrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        dutyData={dutyData}
        schoolInfo={schoolInfo}
        showToast={showToast}
      />

      <DutyMessagingModal
        isOpen={isMessagingOpen}
        onClose={() => setIsMessagingOpen(false)}
        dutyData={dutyData}
        setDutyData={setDutyData}
        schoolInfo={schoolInfo}
        teachers={filteredTeachers}
        admins={filteredAdmins}
        showToast={showToast}
      />

      <DutyManageSchedulesModal
        isOpen={isManageSchedulesOpen}
        onClose={() => setIsManageSchedulesOpen(false)}
        dutyData={dutyData}
        setDutyData={setDutyData}
        showToast={showToast}
      />

      <DutyReportsModal
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        dutyData={dutyData}
        schoolInfo={schoolInfo}
        teachers={filteredTeachers}
        admins={filteredAdmins}
        showToast={showToast}
      />

      <DutyCreateScheduleModal
        isOpen={isCreateScheduleOpen}
        onClose={() => setIsCreateScheduleOpen(false)}
        dutyData={dutyData}
        setDutyData={setDutyData}
        teachers={filteredTeachers}
        admins={filteredAdmins}
        scheduleSettings={scheduleSettings}
        schoolInfo={schoolInfo}
        suggestedCount={suggestedCount}
        showToast={showToast}
        activeDaysCount={timing.activeDays?.length || 5}
        availableStaffCount={availableStaff.length}
      />

      <DutyPreCheckModal
        isOpen={showPreCheckModal}
        onClose={() => setShowPreCheckModal(false)}
        onProceed={() => { setShowPreCheckModal(false); setIsCreateScheduleOpen(true); }}
        onGoToSettings={() => {
          setShowPreCheckModal(false);
          if (!hasSemesterDates) {
            setShowAcademicPopup(true);
            return;
          }
          setShowSettingsPage(true);
        }}
        secondaryActionLabel={hasSemesterDates ? 'تعديل الإعدادات' : 'تحديد الفصل الدراسي'}
        checks={preChecks}
      />

      {/* Academic Year Popup */}
      {showAcademicPopup && (
        <AcademicYearPopup
          schoolInfo={schoolInfo}
          setSchoolInfo={setSchoolInfo}
          onClose={() => setShowAcademicPopup(false)}
          showToast={showToast}
          onOpenAcademicCalendar={() => {
            setShowAcademicPopup(false);
            setShowAcademicCalendarModal(true);
          }}
        />
      )}

      <AcademicCalendarModal
        isOpen={showAcademicCalendarModal}
        onClose={() => setShowAcademicCalendarModal(false)}
        schoolInfo={schoolInfo}
        setSchoolInfo={setSchoolInfo}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-xl border font-bold text-sm
            ${toast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : ''}
            ${toast.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' : ''}
            ${toast.type === 'error'   ? 'bg-red-50 text-red-800 border-red-200'       : ''}
          `}>
            {toast.type === 'success' && <CheckCircle  size={18} />}
            {toast.type === 'warning' && <AlertTriangle size={18} />}
            {toast.type === 'error'   && <AlertCircle  size={18} />}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyDuty;
