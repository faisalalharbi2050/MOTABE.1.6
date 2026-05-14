import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Eye, Settings, BarChart3,
  CheckCircle, AlertTriangle, AlertCircle,
  RefreshCw, X, Info, PenLine, Sparkles, FileOutput, Send, Table,
} from 'lucide-react';
import {
  SchoolInfo, Teacher, Admin, ScheduleSettingsData,
  SupervisionScheduleData,
} from '../../types';
import {
  getDefaultSupervisionData, getTimingConfig,
  hasTimingData, getSupervisionPeriods, getAvailableStaff,
  shouldSuggestExcludeTeachers, getSuggestedCountPerDay,
  generateSmartAssignment, validateGoldenRule,
  detectScheduleChanges,
} from '../../utils/supervisionUtils';

import SchoolTabs from '../wizard/SchoolTabs';
import SupervisionSettingsPage from '../supervision/SupervisionSettingsPage';
import SupervisionMonitoringModal from '../supervision/modals/SupervisionMonitoringModal';
import SupervisionPrintModal from '../supervision/modals/SupervisionPrintModal';
import SupervisionMessagingModal from '../supervision/modals/SupervisionMessagingModal';

import CreateTab from './tabs/CreateTab';
import MonitoringTab from './tabs/MonitoringTab';
import PrintSendTab from './tabs/PrintSendTab';
import ManageTab from './tabs/ManageTab';

interface Props {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  teachers: Teacher[];
  admins: Admin[];
  scheduleSettings: ScheduleSettingsData;
  onNavigateToTiming?: () => void;
  onOpenMessagesArchive?: () => void;
}

type TabId = 'settings' | 'create' | 'printsend' | 'send' | 'monitoring' | 'manage';

const TAB_STORAGE_KEY = 'motabe:supervision_v2:lastTab';

const SupervisionV2Container: React.FC<Props> = ({
  schoolInfo, setSchoolInfo, teachers, admins, scheduleSettings, onNavigateToTiming, onOpenMessagesArchive,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    try {
      if (sessionStorage.getItem('motabe:supervision_v2:open_send_reminder') === '1') {
        return 'send';
      }
      const saved = localStorage.getItem(TAB_STORAGE_KEY) as TabId | null;
      if (saved) return saved;
    } catch {}
    return 'settings';
  });

  useEffect(() => {
    try { localStorage.setItem(TAB_STORAGE_KEY, activeTab); } catch {}
  }, [activeTab]);

  const [activeSchoolTab, setActiveSchoolTab] = useState<string>('main');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [scheduleChangeAlert, setScheduleChangeAlert] = useState(false);

  const sharedSchools = schoolInfo.sharedSchools || [];
  const hasSharedSchools = sharedSchools.length > 0;

  const [isMonitoringOpen, setIsMonitoringOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsMessagingOpen(true);
    window.addEventListener('motabe:send_supervision', handler);
    return () => window.removeEventListener('motabe:send_supervision', handler);
  }, []);

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
          settings: parsed.settings || getDefaultSupervisionData(schoolInfo).settings,
        };
      } catch { /* ignore */ }
    }
    return getDefaultSupervisionData(schoolInfo);
  });

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
            sharedSchoolMode: globalSharedMode || parsed.settings?.sharedSchoolMode || 'unified',
          },
        });
      } catch {
        const d = getDefaultSupervisionData(schoolInfo);
        setSupervisionData({
          ...d,
          settings: { ...d.settings, sharedSchoolMode: globalSharedMode || d.settings.sharedSchoolMode },
        });
      }
    } else {
      const d = getDefaultSupervisionData(schoolInfo);
      setSupervisionData({
        ...d,
        settings: { ...d.settings, sharedSchoolMode: globalSharedMode || d.settings.sharedSchoolMode },
      });
    }
  }, [activeSchoolTab, schoolInfo, storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(supervisionData));
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
      } catch (e) {}
    }
  }, [supervisionData, storageKey, activeSchoolTab]);

  const prevTimetableRef = React.useRef(scheduleSettings.timetable);
  useEffect(() => {
    if (prevTimetableRef.current !== scheduleSettings.timetable && supervisionData.dayAssignments.length > 0) {
      const changes = detectScheduleChanges(
        prevTimetableRef.current,
        scheduleSettings.timetable,
        supervisionData.dayAssignments,
      );
      if (changes.hasChanges) {
        setScheduleChangeAlert(true);
        showToast('تم تغيير جدول الحصص - يُرجى مراجعة الإشراف اليومي', 'warning');
      }
    }
    prevTimetableRef.current = scheduleSettings.timetable;
  }, [scheduleSettings.timetable]);

  useEffect(() => {
    const newPeriods = getSupervisionPeriods(schoolInfo);
    if (newPeriods.length > 0 && supervisionData.periods.length === 0) {
      setSupervisionData(prev => ({ ...prev, periods: newPeriods }));
    }
  }, [schoolInfo.timing]);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const timing = useMemo(() => getTimingConfig(schoolInfo), [schoolInfo]);

  const filteredTeachers = useMemo(() => {
    if (hasSharedSchools && supervisionData.settings.sharedSchoolMode === 'separate') {
      return teachers.filter(t => t.schoolId === activeSchoolTab || (!t.schoolId && activeSchoolTab === 'main'));
    }
    return teachers;
  }, [teachers, hasSharedSchools, supervisionData.settings.sharedSchoolMode, activeSchoolTab]);

  const filteredAdmins = useMemo(() => {
    if (hasSharedSchools && supervisionData.settings.sharedSchoolMode === 'separate') {
      return admins.filter(a => (a as any).schoolId === activeSchoolTab || (!(a as any).schoolId && activeSchoolTab === 'main'));
    }
    return admins;
  }, [admins, hasSharedSchools, supervisionData.settings.sharedSchoolMode, activeSchoolTab]);

  const availableStaff = useMemo(
    () => getAvailableStaff(filteredTeachers, filteredAdmins, supervisionData.exclusions, supervisionData.settings),
    [filteredTeachers, filteredAdmins, supervisionData.exclusions, supervisionData.settings],
  );
  const suggestExcludeTeachers = useMemo(() => shouldSuggestExcludeTeachers(admins), [admins]);
  const suggestedCount = useMemo(
    () => getSuggestedCountPerDay(availableStaff.length, timing.activeDays?.length || 5),
    [availableStaff.length, timing],
  );
  const goldenRuleCheck = useMemo(
    () => validateGoldenRule(supervisionData.dayAssignments),
    [supervisionData.dayAssignments],
  );

  const handleAutoAssign = () => {
    const assignments = generateSmartAssignment(
      filteredTeachers, filteredAdmins, supervisionData.exclusions, supervisionData.settings,
      scheduleSettings, schoolInfo, supervisionData.periods,
      supervisionData.settings.suggestedCountPerDay || suggestedCount,
    );
    setSupervisionData(prev => ({ ...prev, dayAssignments: assignments }));
    showToast('تم التوزيع الذكي بنجاح', 'success');
  };

  const renderSettingsTab = () => (
    <div className="space-y-4">
      {!hasTimingData(schoolInfo) && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={22} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-amber-900">لم يتم حفظ توقيت اليوم الدراسي بعد</p>
              <p className="text-xs font-medium text-amber-700 mt-1">
                اضبط توقيت الفسح والصلاة حتى يتم بناء فترات الإشراف اليومية بدقة.
              </p>
            </div>
          </div>
          {onNavigateToTiming && (
            <button
              onClick={onNavigateToTiming}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-all"
            >
              ضبط التوقيت
            </button>
          )}
        </div>
      )}
      <SupervisionSettingsPage
        onBack={() => setActiveTab('create')}
        onSave={() => { showToast('تم حفظ إعدادات الإشراف بنجاح', 'success'); }}
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
        supervisionTypes={supervisionData.supervisionTypes}
        setSupervisionTypes={(t) => setSupervisionData(prev => ({
          ...prev,
          supervisionTypes: typeof t === 'function' ? t(prev.supervisionTypes) : t,
        }))}
        schoolInfo={schoolInfo}
        showToast={showToast}
      />
    </div>
  );

  const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<any> }> = [
    { id: 'settings', label: 'إعدادات الإشراف', icon: Settings },
    { id: 'create', label: 'إنشاء جدول الإشراف', icon: Sparkles },
    { id: 'printsend', label: 'طباعة الإشراف', icon: FileOutput },
    { id: 'send', label: 'إرسال الإشراف', icon: Send },
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
              <Eye size={36} strokeWidth={1.8} className="text-[#655ac1]" />
              الإشراف اليومي
            </h3>
            <p className="text-slate-500 font-medium mt-2 mr-12 max-w-2xl text-sm leading-relaxed">
              إنشاء وإدارة جدول الإشراف اليومي أثناء اليوم الدراسي عبر واجهة تفاعلية بطريقة منظّمة.
            </p>
          </div>
        </div>
      </div>

      {/* ══════ Shared Schools Tabs ══════ */}
      {hasSharedSchools && supervisionData.settings.sharedSchoolMode === 'separate' && (
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
      {suggestExcludeTeachers && !supervisionData.settings.autoExcludeTeachersWhen5Admins && (
        <div className="bg-[#fcfbff] border-2 border-[#8779fb]/30 rounded-2xl p-5 flex items-start gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 bg-[#655ac1] h-full rounded-r-2xl" />
          <div className="w-10 h-10 rounded-xl bg-[#e5e1fe] flex items-center justify-center shrink-0">
            <Info size={22} className="text-[#655ac1]" />
          </div>
          <div className="flex-1">
            <p className="text-base font-black text-slate-800">
              يوجد 5 إداريين أو أكثر - يُقترح استثناء المعلمين الممارسين من الإشراف
            </p>
            <p className="text-sm font-medium text-slate-500 mt-1">
              لتقليل العبء على المعلمين الممارسين للتدريس ينصح بتفعيل الاستثناء للوصول إلى إدارة أفضل ومريحة للجميع. يمكنك تفعيل هذا الخيار من إعدادات الاستثناءات.
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

      {scheduleChangeAlert && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 bg-amber-500 h-full rounded-r-2xl" />
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
        {activeTab === 'settings' && renderSettingsTab()}
        {activeTab === 'create' && (
          <CreateTab
            supervisionData={supervisionData}
            setSupervisionData={setSupervisionData}
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
            supervisionData={supervisionData}
            setSupervisionData={setSupervisionData}
            schoolInfo={schoolInfo}
            showToast={showToast}
          />
        )}
        {activeTab === 'printsend' && (
          <PrintSendTab
            supervisionData={supervisionData}
            setSupervisionData={setSupervisionData}
            storageKey={storageKey}
            schoolInfo={schoolInfo}
            teachers={filteredTeachers}
            admins={filteredAdmins}
            onOpenLegacyPrint={() => setIsPrintOpen(true)}
            onOpenLegacySend={() => setIsMessagingOpen(true)}
            onOpenMessagesArchive={onOpenMessagesArchive}
            showToast={showToast}
            mode="print"
          />
        )}
        {activeTab === 'send' && (
          <PrintSendTab
            supervisionData={supervisionData}
            setSupervisionData={setSupervisionData}
            storageKey={storageKey}
            schoolInfo={schoolInfo}
            teachers={filteredTeachers}
            admins={filteredAdmins}
            onOpenLegacyPrint={() => setIsPrintOpen(true)}
            onOpenLegacySend={() => setIsMessagingOpen(true)}
            onOpenMessagesArchive={onOpenMessagesArchive}
            showToast={showToast}
            mode="send"
          />
        )}
        {activeTab === 'manage' && (
          <ManageTab
            supervisionData={supervisionData}
            setSupervisionData={setSupervisionData}
            showToast={showToast}
          />
        )}
      </div>

      {/* ══════ Modals (legacy — to be migrated tab-by-tab) ══════ */}
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
        teachers={filteredTeachers}
        admins={filteredAdmins}
        showToast={showToast}
      />

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

export default SupervisionV2Container;
