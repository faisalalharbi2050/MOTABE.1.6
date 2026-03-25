import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Eye, Settings, Send, Printer,
  CheckCircle, AlertTriangle,
  RefreshCw, BarChart3,
  X, Save, AlertCircle,
  Info, Zap
} from 'lucide-react';
import {
  SchoolInfo, Teacher, Admin, ScheduleSettingsData,
  SupervisionScheduleData,
} from '../types';
import {
  getDefaultSupervisionData, getTimingConfig,
  hasTimingData, getSupervisionPeriods, getAvailableStaff,
  shouldSuggestExcludeTeachers, getSuggestedCountPerDay,
  generateSmartAssignment, validateGoldenRule,
  detectScheduleChanges
} from '../utils/supervisionUtils';

// ===== Sub-component imports =====
// ===== Sub-component imports =====
import SupervisionScheduleBuilder from './supervision/SupervisionScheduleBuilder';
import SchoolTabs from './wizard/SchoolTabs';
import TimingPopup from './supervision/TimingPopup';
import SupervisionSettingsPage from './supervision/SupervisionSettingsPage';
import SupervisionMonitoringModal from './supervision/modals/SupervisionMonitoringModal';
import SupervisionPrintModal from './supervision/modals/SupervisionPrintModal';
import SupervisionMessagingModal from './supervision/modals/SupervisionMessagingModal';
import SupervisionReportsModal from './supervision/modals/SupervisionReportsModal';
import SupervisionManageSchedulesModal from './supervision/modals/SupervisionManageSchedulesModal';
import SupervisionCreateScheduleModal from './supervision/modals/SupervisionCreateScheduleModal';
import SupervisionPreCheckModal, { PreCheckItem } from './supervision/modals/SupervisionPreCheckModal';

interface DailySupervisionProps {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  teachers: Teacher[];
  admins: Admin[];
  scheduleSettings: ScheduleSettingsData;
  onNavigateToTiming?: () => void;
}

type TabId = 'settings' | 'schedule' | 'monitoring' | 'reports';

const DailySupervision: React.FC<DailySupervisionProps> = ({
  schoolInfo, setSchoolInfo, teachers, admins, scheduleSettings, onNavigateToTiming
}) => {
  // ===== State =====
  const [activeSchoolTab, setActiveSchoolTab] = useState<string>('main');
  const [showTimingPopup, setShowTimingPopup] = useState(false);
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

  // ── Quick-action deep-link from Dashboard ─────────────────────────
  useEffect(() => {
    const handler = () => setIsMessagingOpen(true);
    window.addEventListener('motabe:send_supervision', handler);
    return () => window.removeEventListener('motabe:send_supervision', handler);
  }, []);
  
  // Confirmation state
  const [showPreCheckModal, setShowPreCheckModal] = useState(false);

  const storageKey = activeSchoolTab === 'main' ? 'supervision_data_v1' : `supervision_data_v1_${activeSchoolTab}`;

  const [supervisionData, setSupervisionData] = useState<SupervisionScheduleData>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return {
          ...getDefaultSupervisionData(schoolInfo),
          ...parsed,
          exclusions: parsed.exclusions || [],
          dayAssignments: parsed.dayAssignments || [],
          attendanceRecords: parsed.attendanceRecords || [],
          savedSchedules: parsed.savedSchedules || [],
          settings: parsed.settings || getDefaultSupervisionData(schoolInfo).settings
        };
      } catch { /* ignore */ }
    }
    return getDefaultSupervisionData(schoolInfo);
  });

  // Re-load data when activeSchoolTab changes
  useEffect(() => {
    let globalSharedMode: any = null;
    try {
      const mainSaved = localStorage.getItem('supervision_data_v1_main') || localStorage.getItem('supervision_data_v1');
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
        setSupervisionData({
          ...getDefaultSupervisionData(schoolInfo),
          ...parsed,
          exclusions: parsed.exclusions || [],
          dayAssignments: parsed.dayAssignments || [],
          attendanceRecords: parsed.attendanceRecords || [],
          savedSchedules: parsed.savedSchedules || [],
          settings: {
            ...(parsed.settings || getDefaultSupervisionData(schoolInfo).settings),
            sharedSchoolMode: globalSharedMode || parsed.settings?.sharedSchoolMode || 'unified'
          }
        });
      } catch { 
        const d = getDefaultSupervisionData(schoolInfo);
        setSupervisionData({
          ...d,
          settings: { ...d.settings, sharedSchoolMode: globalSharedMode || d.settings.sharedSchoolMode }
        });
      }
    } else {
      const d = getDefaultSupervisionData(schoolInfo);
      setSupervisionData({
        ...d,
        settings: { ...d.settings, sharedSchoolMode: globalSharedMode || d.settings.sharedSchoolMode }
      });
    }
  }, [activeSchoolTab, schoolInfo, storageKey]);

  // ===== Persistence =====
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(supervisionData));
    
    // Sync sharedSchoolMode to main to ensure it acts globally across tabs
    if (activeSchoolTab !== 'main') {
      try {
        const mainKey = 'supervision_data_v1_main';
        const fallbackKey = 'supervision_data_v1';
        let mData = localStorage.getItem(mainKey);
        let usedKey = mainKey;
        if (!mData) {
           mData = localStorage.getItem(fallbackKey);
           usedKey = fallbackKey;
        }
        if (mData) {
           const pData = JSON.parse(mData);
           if (pData.settings && pData.settings.sharedSchoolMode !== supervisionData.settings.sharedSchoolMode) {
              pData.settings.sharedSchoolMode = supervisionData.settings.sharedSchoolMode;
              localStorage.setItem(usedKey, JSON.stringify(pData));
           }
        }
      } catch(e) {}
    }
  }, [supervisionData, storageKey, activeSchoolTab]);

  // ===== Timing Check =====
  useEffect(() => {
    if (!hasTimingData(schoolInfo)) {
      setShowTimingPopup(true);
    }
  }, [schoolInfo]);

  // ===== Schedule Change Detection =====
  const prevTimetableRef = React.useRef(scheduleSettings.timetable);
  useEffect(() => {
    if (prevTimetableRef.current !== scheduleSettings.timetable && supervisionData.dayAssignments.length > 0) {
      const changes = detectScheduleChanges(
        prevTimetableRef.current,
        scheduleSettings.timetable,
        supervisionData.dayAssignments
      );
      if (changes.hasChanges) {
        setScheduleChangeAlert(true);
        showToast('تم تغيير جدول الحصص - يُرجى مراجعة الإشراف اليومي', 'warning');
      }
    }
    prevTimetableRef.current = scheduleSettings.timetable;
  }, [scheduleSettings.timetable]);

  // ===== Sync periods from timing =====
  useEffect(() => {
    const newPeriods = getSupervisionPeriods(schoolInfo);
    if (newPeriods.length > 0 && supervisionData.periods.length === 0) {
      setSupervisionData(prev => ({ ...prev, periods: newPeriods }));
    }
  }, [schoolInfo.timing]);

  // ===== Toast =====
  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ===== Computed values =====
  const timing = useMemo(() => getTimingConfig(schoolInfo), [schoolInfo]);
  const availableStaff = useMemo(() => {
    // Filter staff for active school
    let targetTeachers = teachers;
    let targetAdmins = admins;

    if (hasSharedSchools && supervisionData.settings.sharedSchoolMode === 'separate') {
      targetTeachers = teachers.filter(t => t.schoolId === activeSchoolTab || (!t.schoolId && activeSchoolTab === 'main'));
      // Note: Admins are currently global in this system, so we might want to check if they have schoolId too, 
      // but if not, they apply to main. Assuming admins are global or have schoolId.
      targetAdmins = admins.filter(a => (a as any).schoolId === activeSchoolTab || (!(a as any).schoolId && activeSchoolTab === 'main'));
    }

    return getAvailableStaff(targetTeachers, targetAdmins, supervisionData.exclusions, supervisionData.settings);
  }, [teachers, admins, supervisionData.exclusions, supervisionData.settings, hasSharedSchools, activeSchoolTab]);
  const suggestExcludeTeachers = useMemo(() => shouldSuggestExcludeTeachers(admins), [admins]);
  const suggestedCount = useMemo(
    () => getSuggestedCountPerDay(availableStaff.length, timing.activeDays?.length || 5),
    [availableStaff.length, timing]
  );
  const goldenRuleCheck = useMemo(
    () => validateGoldenRule(supervisionData.dayAssignments),
    [supervisionData.dayAssignments]
  );

  // ===== Handlers =====
  const handleAutoAssign = () => {
    // Filter staff for active school
    let targetTeachers = teachers;
    let targetAdmins = admins;

    if (hasSharedSchools && supervisionData.settings.sharedSchoolMode === 'separate') {
      targetTeachers = teachers.filter(t => t.schoolId === activeSchoolTab || (!t.schoolId && activeSchoolTab === 'main'));
      targetAdmins = admins.filter(a => (a as any).schoolId === activeSchoolTab || (!(a as any).schoolId && activeSchoolTab === 'main'));
    }

    const assignments = generateSmartAssignment(
      targetTeachers, targetAdmins, supervisionData.exclusions, supervisionData.settings,
      scheduleSettings, schoolInfo, supervisionData.periods,
      supervisionData.settings.suggestedCountPerDay || suggestedCount
    );
    setSupervisionData(prev => ({ ...prev, dayAssignments: assignments }));
    showToast('تم التوزيع الذكي بنجاح', 'success');
  };

  const handleApprove = () => {
    if (!goldenRuleCheck.valid) {
      showToast('يوجد موظفون مكررون في أكثر من يوم - يُرجى مراجعة التوزيع', 'error');
      return;
    }
    setSupervisionData(prev => ({
      ...prev,
      isApproved: true,
      approvedAt: new Date().toISOString(),
    }));
    showToast('تم اعتماد جدول الإشراف', 'success');
  };

  // ===== Pre-check items for schedule creation modal =====
  const activeLocsCount = supervisionData.locations.filter(l => l.isActive).length;
  const preChecks: PreCheckItem[] = [
    {
      label: 'التوقيت',
      detail: hasTimingData(schoolInfo) ? 'أوقات الفسح والصلاة محددة' : 'لم يتم تحديد أوقات الفسح والصلاة بعد',
      status: (hasTimingData(schoolInfo) ? 'ok' : 'error') as 'ok' | 'warning' | 'error',
    },
    {
      label: 'مواقع الإشراف',
      detail: activeLocsCount > 0 ? `${activeLocsCount} موقع إشراف نشط` : 'لا توجد مواقع إشراف مفعّلة',
      status: (activeLocsCount > 0 ? 'ok' : 'warning') as 'ok' | 'warning' | 'error',
    },
    {
      label: 'المشرفون المتاحون',
      detail: availableStaff.length > 0 ? `${availableStaff.length} مشرف متاح للتوزيع` : 'لا يوجد مشرفون متاحون',
      status: (availableStaff.length === 0 ? 'error' : availableStaff.length >= suggestedCount ? 'ok' : 'warning') as 'ok' | 'warning' | 'error',
    },
    ...(supervisionData.dayAssignments.length > 0 ? [{
      label: 'الجدول الحالي',
      detail: 'يوجد جدول حالي — سيتم استبداله بالجدول الجديد',
      status: 'warning' as const,
    }] : []),
  ];

  // ===== Shared Schools Tabs =====
  // moved to the top

  // ===== Settings Page =====
  if (showSettingsPage) {
    return (
      <SupervisionSettingsPage
        onBack={() => setShowSettingsPage(false)}
        onSave={() => {
          showToast('تم حفظ إعدادات الإشراف بنجاح', 'success');
        }}
        teachers={teachers}
        admins={admins}
        totalStaffCount={availableStaff.length}
        exclusions={supervisionData.exclusions}
        setExclusions={(excs) => setSupervisionData(prev => ({
          ...prev,
          exclusions: typeof excs === 'function' ? excs(prev.exclusions) : excs,
        }))}
        settings={supervisionData.settings}
        setSettings={(s) => setSupervisionData(prev => ({
          ...prev,
          settings: typeof s === 'function' ? s(prev.settings) : s,
        }))}
        availableCount={availableStaff.length}
        suggestExclude={suggestExcludeTeachers}
        locations={supervisionData.locations}
        setLocations={(locs) => setSupervisionData(prev => ({
          ...prev,
          locations: typeof locs === 'function' ? locs(prev.locations) : locs,
        }))}
        periods={supervisionData.periods}
        setPeriods={(periods) => setSupervisionData(prev => ({
          ...prev,
          periods: typeof periods === 'function' ? periods(prev.periods) : periods,
        }))}
        schoolInfo={schoolInfo}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ══════ Header ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>

        <div className="flex justify-between items-start relative z-10">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <Eye size={36} strokeWidth={1.8} className="text-[#655ac1]" />
              الإشراف اليومي
            </h3>
            <p className="text-slate-500 font-medium mt-2 mr-12 max-w-2xl text-sm leading-relaxed">
              إنشاء وإدارة جدول الإشراف اليومي أثناء اليوم الدراسي بطريقة ذكية
            </p>
          </div>
        </div>

      </div>

      {/* Shared Schools Tabs — شريط مستقل */}
      {hasSharedSchools && supervisionData.settings.sharedSchoolMode === 'separate' && (
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
              <span>إعدادات الإشراف</span>
            </button>
            <button
              onClick={() => setShowPreCheckModal(true)}
              className="flex items-center gap-2 bg-[#655ac1] text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-[#655ac1]/20 transition-all hover:scale-105 active:scale-95"
            >
              <Zap size={18} />
              <span>إنشاء جدول الإشراف</span>
            </button>
          </div>

          {/* Left Side */}
          <div className="flex flex-wrap items-center gap-2">
          </div>
        </div>

        {/* ROW 2 */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
           {/* Right Side */}
           <div className="flex flex-wrap items-center gap-2">
             <button
               onClick={() => setIsManageSchedulesOpen(true)}
               className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
             >
               <Save size={18} className="text-[#655ac1]" />
               <span>إدارة الجداول</span>
             </button>
             <button
               onClick={() => setIsPrintOpen(true)}
               className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
             >
               <Printer size={18} className="text-[#655ac1]" />
               <span>طباعة الإشراف</span>
             </button>
             <button
               onClick={() => setIsMessagingOpen(true)}
               className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
             >
               <Send size={18} className="text-[#655ac1]" />
               <span>إرسال الإشراف</span>
             </button>
           </div>

           {/* Left Side */}
           <div className="flex flex-wrap items-center gap-2">
             <button
               onClick={() => setIsMonitoringOpen(true)}
               className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
             >
               <Eye size={18} className="text-[#655ac1]" />
               <span>المتابعة اليومية</span>
             </button>
             <button
               onClick={() => setIsReportsOpen(true)}
               className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
             >
               <BarChart3 size={18} className="text-[#655ac1]" />
               <span>تقارير الإشراف</span>
             </button>
           </div>
        </div>
      </div>


      {/* Admin Suggestion Banner */}
      {suggestExcludeTeachers && !supervisionData.settings.autoExcludeTeachersWhen5Admins && (
        <div className="bg-[#fcfbff] border-2 border-[#8779fb]/30 rounded-2xl p-5 mb-6 flex items-start gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 bg-[#655ac1] h-full rounded-r-2xl"></div>
          <div className="w-10 h-10 rounded-xl bg-[#e5e1fe] flex items-center justify-center shrink-0">
            <Info size={22} className="text-[#655ac1]" />
          </div>
          <div className="flex-1">
            <p className="text-base font-black text-slate-800">
              يوجد 5 إداريين أو أكثر - يُقترح استثناء المعلمين الممارسين من الإشراف
            </p>
            <p className="text-sm font-medium text-slate-500 mt-1">
              لتقليل العبء على المعلمين الممارسين للتدريس، ينصح بتفعيل الاستثناء للوصول إلى إدارة أفضل ومريحة للجميع. يمكنك تفعيل هذا الخيار من إعدادات الاستثناءات.
            </p>
          </div>
          <button
            onClick={() => {
              setSupervisionData(prev => ({
                ...prev,
                settings: { ...prev.settings, autoExcludeTeachersWhen5Admins: true },
              }));
              showToast('تم تفعيل استثناء المعلمين الممارسين', 'success');
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
              تم تعديل جدول الحصص - يُرجى مراجعة توزيع الإشراف
            </p>
            <p className="text-sm font-medium text-amber-700/80 mt-1">
              قد تكون هناك فراغات جديدة أو تغيرات يمكن الاستفادة منها. يُنصح بإعادة التوزيع.
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

      {/* Main Content Area - Schedule Viewer and Builder */}
      <div id="schedule-builder-section" className="mt-2">
         <SupervisionScheduleBuilder
            supervisionData={supervisionData}
            setSupervisionData={setSupervisionData}
            teachers={hasSharedSchools && supervisionData.settings.sharedSchoolMode === 'separate' ? teachers.filter(t => t.schoolId === activeSchoolTab || (!t.schoolId && activeSchoolTab === 'main')) : teachers}
            admins={hasSharedSchools && supervisionData.settings.sharedSchoolMode === 'separate' ? admins.filter(a => (a as any).schoolId === activeSchoolTab || (!(a as any).schoolId && activeSchoolTab === 'main')) : admins}
            scheduleSettings={scheduleSettings}
            schoolInfo={schoolInfo}
            suggestedCount={suggestedCount}
            showToast={showToast}
          />
      </div>

      {/* ══════ Modals ══════ */}
       <SupervisionMonitoringModal
         isOpen={isMonitoringOpen}
         onClose={() => setIsMonitoringOpen(false)}
         supervisionData={supervisionData}
         setSupervisionData={setSupervisionData}
         schoolInfo={schoolInfo}
         showToast={showToast}
       />

       <SupervisionPrintModal
         isOpen={isPrintOpen}
         onClose={() => setIsPrintOpen(false)}
         supervisionData={supervisionData}
         setSupervisionData={setSupervisionData}
         schoolInfo={schoolInfo}
         showToast={showToast}
       />

       <SupervisionMessagingModal
         isOpen={isMessagingOpen}
         onClose={() => setIsMessagingOpen(false)}
         supervisionData={supervisionData}
         setSupervisionData={setSupervisionData}
         schoolInfo={schoolInfo}
         teachers={hasSharedSchools && supervisionData.settings.sharedSchoolMode === 'separate' ? teachers.filter(t => t.schoolId === activeSchoolTab || (!t.schoolId && activeSchoolTab === 'main')) : teachers}
         admins={hasSharedSchools && supervisionData.settings.sharedSchoolMode === 'separate' ? admins.filter(a => (a as any).schoolId === activeSchoolTab || (!(a as any).schoolId && activeSchoolTab === 'main')) : admins}
         showToast={showToast}
       />

       <SupervisionManageSchedulesModal
         isOpen={isManageSchedulesOpen}
         onClose={() => setIsManageSchedulesOpen(false)}
         supervisionData={supervisionData}
         setSupervisionData={setSupervisionData}
         showToast={showToast}
       />

       <SupervisionReportsModal
         isOpen={isReportsOpen}
         onClose={() => setIsReportsOpen(false)}
         supervisionData={supervisionData}
         schoolInfo={schoolInfo}
         teachers={hasSharedSchools && supervisionData.settings.sharedSchoolMode === 'separate' ? teachers.filter(t => t.schoolId === activeSchoolTab || (!t.schoolId && activeSchoolTab === 'main')) : teachers}
         admins={hasSharedSchools && supervisionData.settings.sharedSchoolMode === 'separate' ? admins.filter(a => (a as any).schoolId === activeSchoolTab || (!(a as any).schoolId && activeSchoolTab === 'main')) : admins}
         showToast={showToast}
       />

       <SupervisionCreateScheduleModal
         isOpen={isCreateScheduleOpen}
         onClose={() => setIsCreateScheduleOpen(false)}
         supervisionData={supervisionData}
         setSupervisionData={setSupervisionData}
         teachers={hasSharedSchools && supervisionData.settings.sharedSchoolMode === 'separate' ? teachers.filter(t => t.schoolId === activeSchoolTab || (!t.schoolId && activeSchoolTab === 'main')) : teachers}
         admins={hasSharedSchools && supervisionData.settings.sharedSchoolMode === 'separate' ? admins.filter(a => (a as any).schoolId === activeSchoolTab || (!(a as any).schoolId && activeSchoolTab === 'main')) : admins}
         scheduleSettings={scheduleSettings}
         schoolInfo={schoolInfo}
         suggestedCount={suggestedCount}
         showToast={showToast}
         activeDaysCount={timing.activeDays?.length || 5}
         availableStaffCount={availableStaff.length}
       />

       <SupervisionPreCheckModal
         isOpen={showPreCheckModal}
         onClose={() => setShowPreCheckModal(false)}
         onProceed={() => { setShowPreCheckModal(false); setIsCreateScheduleOpen(true); }}
         onGoToSettings={() => setShowSettingsPage(true)}
         checks={preChecks}
       />

      {/* Timing Popup */}
      {showTimingPopup && (
        <TimingPopup
          schoolInfo={schoolInfo}
          setSchoolInfo={setSchoolInfo}
          onClose={() => setShowTimingPopup(false)}
          showToast={showToast}
          onNavigateToTiming={onNavigateToTiming}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-xl border font-bold text-sm
            ${toast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : ''}
            ${toast.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' : ''}
            ${toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : ''}
          `}>
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'warning' && <AlertTriangle size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailySupervision;
