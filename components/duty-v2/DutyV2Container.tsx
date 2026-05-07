import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Eye, Settings, BarChart3, ShieldCheck,
  CheckCircle, AlertTriangle, AlertCircle,
  RefreshCw, X, Info, Sparkles, FileOutput, Table,
} from 'lucide-react';
import {
  SchoolInfo, Teacher, Admin, ScheduleSettingsData,
  DutyScheduleData,
} from '../../types';
import {
  getTimingConfig,
  getAvailableStaffForDuty,
  canSuggestExcludeTeachers, getSuggestedDutyCountPerDay,
  generateSmartDutyAssignment, validateDutyGoldenRule,
} from '../../utils/dutyUtils';

import SchoolTabs from '../wizard/SchoolTabs';
import AcademicCalendarModal from '../dashboard/AcademicCalendarModal';
import DutySettingsPage from '../duty/DutySettingsPage';
import DutyMonitoringModal from '../duty/DutyMonitoring';
import DutyPrintModal from '../duty/modals/DutyPrintModal';
import DutyMessagingModal from '../duty/modals/DutyMessagingModal';
import DutyManageSchedulesModal from '../duty/modals/DutyManageSchedulesModal';
import DutyCreateScheduleModal from '../duty/modals/DutyCreateScheduleModal';

import CreateTab from './tabs/CreateTab';
import MonitoringTab from './tabs/MonitoringTab';
import PrintSendTab from './tabs/PrintSendTab';
import ManageTab from './tabs/ManageTab';

const getDefaultDutyData = (): DutyScheduleData => ({
  exclusions: [],
  settings: {
    excludeVicePrincipals: true,
    excludeGuards: true,
    autoExcludeTeachersWhen5Admins: false,
    suggestedCountPerDay: 1,
    reminderSendTime: '07:00',
    enableAutoAssignment: true,
    sharedSchoolMode: 'unified',
    autoSendLinks: false,
    autoSendReminder: false,
    autoSendReminderTouched: false,
  },
  dayAssignments: [],
  weekAssignments: [],
  reports: [],
  isApproved: false,
  savedSchedules: [],
});

interface Props {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  teachers: Teacher[];
  admins: Admin[];
  scheduleSettings: ScheduleSettingsData;
  onNavigateToDashboard?: () => void;
}

type TabId = 'settings' | 'create' | 'printsend' | 'monitoring' | 'manage';

const TAB_STORAGE_KEY = 'motabe:duty_v2:lastTab';
const DUTY_ONE_TIME_RESET_MARKER = 'duty_data_reset_2026_04_04_done';

const DutyV2Container: React.FC<Props> = ({
  schoolInfo, setSchoolInfo, teachers, admins, scheduleSettings,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE_KEY);
      if (saved === 'settings' || saved === 'create' || saved === 'printsend' || saved === 'monitoring' || saved === 'manage') {
        return saved as TabId;
      }
    } catch {}
    return 'settings';
  });

  useEffect(() => {
    try { localStorage.setItem(TAB_STORAGE_KEY, activeTab); } catch {}
  }, [activeTab]);

  const [activeSchoolTab, setActiveSchoolTab] = useState<string>('main');
  const [showAcademicCalendarModal, setShowAcademicCalendarModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [scheduleChangeAlert, setScheduleChangeAlert] = useState(false);

  const sharedSchools = schoolInfo.sharedSchools || [];
  const hasSharedSchools = sharedSchools.length > 0;

  const [isMonitoringOpen, setIsMonitoringOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [isManageSchedulesOpen, setIsManageSchedulesOpen] = useState(false);
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);

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
          savedSchedules: parsed.savedSchedules || [],
          settings: {
            ...getDefaultDutyData().settings,
            ...(parsed.settings || {}),
            autoSendReminder: parsed.settings?.autoSendReminderTouched ? parsed.settings?.autoSendReminder === true : false,
            autoSendReminderTouched: parsed.settings?.autoSendReminderTouched === true,
            reminderSendTime: parsed.settings?.reminderSendTime || '07:00',
          },
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
            sharedSchoolMode: globalSharedMode || parsed.settings?.sharedSchoolMode || 'unified',
            autoSendReminder: parsed.settings?.autoSendReminderTouched ? parsed.settings?.autoSendReminder === true : false,
            autoSendReminderTouched: parsed.settings?.autoSendReminderTouched === true,
            reminderSendTime: parsed.settings?.reminderSendTime || '07:00',
          },
        });
      } catch {
        const d = getDefaultDutyData();
        setDutyData({
          ...d,
          settings: { ...d.settings, sharedSchoolMode: globalSharedMode || d.settings.sharedSchoolMode },
        });
      }
    } else {
      const d = getDefaultDutyData();
      setDutyData({
        ...d,
        settings: { ...d.settings, sharedSchoolMode: globalSharedMode || d.settings.sharedSchoolMode },
      });
    }
  }, [activeSchoolTab, storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(dutyData));
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

  const prevTimetableRef = React.useRef(scheduleSettings.timetable);
  useEffect(() => {
    if (prevTimetableRef.current !== scheduleSettings.timetable && dutyData.dayAssignments.length > 0) {
      setScheduleChangeAlert(true);
      showToast('تم تغيير جدول الحصص - يُرجى مراجعة المناوبة اليومية', 'warning');
    }
    prevTimetableRef.current = scheduleSettings.timetable;
  }, [scheduleSettings.timetable]);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const timing = useMemo(() => getTimingConfig(schoolInfo), [schoolInfo]);

  const filteredTeachers = useMemo(() => {
    if (hasSharedSchools && dutyData.settings.sharedSchoolMode === 'separate') {
      return teachers.filter(t => t.schoolId === activeSchoolTab || (!t.schoolId && activeSchoolTab === 'main'));
    }
    return teachers;
  }, [teachers, hasSharedSchools, dutyData.settings.sharedSchoolMode, activeSchoolTab]);

  const filteredAdmins = useMemo(() => {
    if (hasSharedSchools && dutyData.settings.sharedSchoolMode === 'separate') {
      return admins.filter(a => (a as any).schoolId === activeSchoolTab || (!(a as any).schoolId && activeSchoolTab === 'main'));
    }
    return admins;
  }, [admins, hasSharedSchools, dutyData.settings.sharedSchoolMode, activeSchoolTab]);

  const availableStaff = useMemo(
    () => getAvailableStaffForDuty(filteredTeachers, filteredAdmins, dutyData.exclusions, dutyData.settings),
    [filteredTeachers, filteredAdmins, dutyData.exclusions, dutyData.settings],
  );

  const suggestExcludeTeachers = useMemo(() => canSuggestExcludeTeachers(admins), [admins]);
  const suggestedCount = useMemo(
    () => getSuggestedDutyCountPerDay(availableStaff.length, timing.activeDays?.length || 5),
    [availableStaff.length, timing],
  );
  const goldenRuleCheck = useMemo(
    () => validateDutyGoldenRule(dutyData.dayAssignments),
    [dutyData.dayAssignments],
  );

  const handleAutoAssign = () => {
    try {
      const { assignments, weekAssignments, alerts, newCounts } = generateSmartDutyAssignment(
        filteredTeachers, filteredAdmins, dutyData.exclusions, dutyData.settings,
        scheduleSettings, schoolInfo, dutyData.dutyAssignmentCounts || {}, dutyData.settings.suggestedCountPerDay || suggestedCount,
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

  const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<any> }> = [
    { id: 'settings', label: 'إعدادات المناوبة', icon: Settings },
    { id: 'create', label: 'إنشاء جدول المناوبة', icon: Sparkles },
    { id: 'printsend', label: 'طباعة وإرسال المناوبة', icon: FileOutput },
    { id: 'monitoring', label: 'المتابعة وتقارير الأداء', icon: BarChart3 },
    { id: 'manage', label: 'إدارة الجداول', icon: Table },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20" dir="rtl">
      {/* ══════ Header Card ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500" />
        <div className="relative z-10 flex justify-between items-start gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <ShieldCheck size={36} strokeWidth={1.8} className="text-[#655ac1]" />
              المناوبة اليومية
            </h3>
            <p className="text-slate-500 font-medium mt-2 mr-12 max-w-2xl text-sm leading-relaxed">
              إنشاء وإدارة جدول المناوبة اليومية عبر واجهة تفاعلية بطريق منظّمة
            </p>
          </div>
        </div>
      </div>

      {/* ══════ Shared Schools Tabs ══════ */}
      {hasSharedSchools && dutyData.settings.sharedSchoolMode === 'separate' && (
        <SchoolTabs
          schoolInfo={schoolInfo}
          activeSchoolId={activeSchoolTab}
          onTabChange={setActiveSchoolTab}
        />
      )}

      {/* ══════ Tabs Bar ══════ */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex gap-2 overflow-x-auto custom-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold whitespace-nowrap transition-all flex-1 justify-center text-sm ${
              activeTab === tab.id
                ? 'bg-[#655ac1] text-white shadow-md shadow-indigo-200'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={17} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════ Banners ══════ */}
      {suggestExcludeTeachers && !dutyData.settings.autoExcludeTeachersWhen5Admins && (
        <div className="bg-[#fcfbff] border-2 border-[#655ac1]/20 rounded-2xl p-5 flex items-start gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 bg-[#655ac1] h-full rounded-r-2xl" />
          <div className="w-10 h-10 rounded-xl bg-[#e5e1fe] flex items-center justify-center shrink-0">
            <Info size={22} className="text-[#655ac1]" />
          </div>
          <div className="flex-1">
            <p className="text-base font-black text-slate-800">
              يوجد 5 إداريين أو أكثر - يُقترح استثناء المعلمين من المناوبة
            </p>
            <p className="text-sm font-medium text-slate-500 mt-1">
              لتقليل العبء على المعلمين الممارسين للتدريس ينصح بتفعيل الاستثناء للوصول إلى إدارة أفضل ومريحة للجميع في المناوبة. يمكنك تفعيل هذا الخيار من إعدادات الاستثناءات.
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

      {scheduleChangeAlert && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 bg-amber-500 h-full rounded-r-2xl" />
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
              onClick={() => { handleAutoAssign(); setScheduleChangeAlert(false); }}
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

      {/* ══════ Tab Content ══════ */}
      <div className="min-h-[400px]">
        {activeTab === 'settings' && (
          <DutySettingsPage
            onBack={() => setActiveTab('create')}
            onSave={() => { showToast('تم حفظ إعدادات المناوبة بنجاح', 'success'); }}
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
            setSchoolInfo={setSchoolInfo}
            showToast={showToast}
          />
        )}
        {activeTab === 'create' && (
          <CreateTab
            dutyData={dutyData}
            setDutyData={setDutyData}
            teachers={filteredTeachers}
            admins={filteredAdmins}
            scheduleSettings={scheduleSettings}
            schoolInfo={schoolInfo}
            suggestedCount={suggestedCount}
            showToast={showToast}
          />
        )}
        {activeTab === 'monitoring' && (
          <MonitoringTab
            dutyData={dutyData}
            setDutyData={setDutyData}
            schoolInfo={schoolInfo}
            showToast={showToast}
          />
        )}
        {activeTab === 'printsend' && (
          <PrintSendTab
            dutyData={dutyData}
            schoolInfo={schoolInfo}
            onOpenLegacyPrint={() => setIsPrintOpen(true)}
            onOpenLegacySend={() => setIsMessagingOpen(true)}
            showToast={showToast}
          />
        )}
        {activeTab === 'manage' && (
          <ManageTab
            dutyData={dutyData}
            setDutyData={setDutyData}
            showToast={showToast}
          />
        )}
      </div>

      {/* ══════ Modals (legacy — to be migrated tab-by-tab) ══════ */}
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

export default DutyV2Container;
