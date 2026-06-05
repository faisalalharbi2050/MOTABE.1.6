import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Settings, BarChart3, ShieldCheck,
  CheckCircle, AlertTriangle, AlertCircle,
  RefreshCw, X, Info, Sparkles, FileOutput, Send,
  Check, Printer, Archive, ChevronLeft,
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

type StageId = 'settings' | 'create' | 'output' | 'monitoring';
type OutputMode = 'print' | 'send' | 'manage';

const STAGE_STORAGE_KEY = 'motabe:duty_v2:stage';
const TAB_STORAGE_KEY = 'motabe:duty_v2:lastTab';
const DUTY_ONE_TIME_RESET_MARKER = 'duty_data_reset_2026_04_04_done';

const DutyV2Container: React.FC<Props> = ({
  schoolInfo, setSchoolInfo, teachers, admins, scheduleSettings,
}) => {
  const [stage, setStage] = useState<StageId>(() => {
    try {
      if (sessionStorage.getItem('motabe:duty_v2:open_send_reminder') === '1') {
        return 'output';
      }
      const saved = localStorage.getItem(STAGE_STORAGE_KEY);
      if (saved === 'settings' || saved === 'create' || saved === 'output' || saved === 'monitoring') {
        return saved as StageId;
      }
      // Migrate legacy flat-tab value onto the new stages.
      const legacy = localStorage.getItem(TAB_STORAGE_KEY);
      if (legacy === 'printsend' || legacy === 'send' || legacy === 'manage') return 'output';
      if (legacy === 'create' || legacy === 'monitoring' || legacy === 'settings') return legacy as StageId;
    } catch {}
    return 'settings';
  });

  const [outputMode, setOutputMode] = useState<OutputMode>(() => {
    try {
      if (sessionStorage.getItem('motabe:duty_v2:open_send_reminder') === '1') {
        return 'send';
      }
      const legacy = localStorage.getItem(TAB_STORAGE_KEY);
      if (legacy === 'send') return 'send';
      if (legacy === 'manage') return 'manage';
    } catch {}
    return 'print';
  });

  useEffect(() => {
    try { localStorage.setItem(STAGE_STORAGE_KEY, stage); } catch {}
  }, [stage]);

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

  // عند تفعيل/تعطيل «استثناء المعلمين عند 5 إداريين»: استثناء/إتاحة كل المعلمين مباشرةً.
  const prevAutoExcludeRef = React.useRef(dutyData.settings.autoExcludeTeachersWhen5Admins);
  useEffect(() => {
    const cur = dutyData.settings.autoExcludeTeachersWhen5Admins;
    if (prevAutoExcludeRef.current === cur) return;
    prevAutoExcludeRef.current = cur;
    setDutyData(prev => {
      const teacherIds = new Set(teachers.map(t => t.id));
      const others = prev.exclusions.filter(e => !teacherIds.has(e.staffId));
      const teacherExclusions = teachers.map(t => ({ staffId: t.id, staffType: 'teacher' as const, isExcluded: cur }));
      return { ...prev, exclusions: [...others, ...teacherExclusions] };
    });
  }, [dutyData.settings.autoExcludeTeachersWhen5Admins]);

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

  const settingsComplete = availableStaff.length > 0;
  const scheduleComplete = dutyData.dayAssignments.length > 0;

  const stages: Array<{
    id: StageId; n: number; label: string; hint: string;
    icon: React.ComponentType<any>; complete: boolean;
  }> = [
    { id: 'settings', n: 1, label: 'إعدادات المناوبة', hint: 'اضبط إعدادات المناوبة والمناوبون', icon: Settings, complete: settingsComplete },
    { id: 'create', n: 2, label: 'إنشاء الجدول', hint: 'وزّع المناوبين على الأيام', icon: Sparkles, complete: scheduleComplete },
    { id: 'output', n: 3, label: 'الإخراج والمشاركة', hint: 'اطبع - أرسل - أدر الجداول', icon: FileOutput, complete: false },
    { id: 'monitoring', n: 4, label: 'المتابعة والتقارير', hint: 'أدر المناوبة وتقاريرها', icon: BarChart3, complete: false },
  ];

  const outputModes: Array<{ id: OutputMode; label: string; icon: React.ComponentType<any> }> = [
    { id: 'print', label: 'طباعة', icon: Printer },
    { id: 'send', label: 'إرسال المناوبة', icon: Send },
    { id: 'manage', label: 'الجداول المحفوظة', icon: Archive },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20" dir="rtl">
      {/* ══════ Header Card ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
        <div className="relative z-10 flex justify-between items-start gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <ShieldCheck size={36} strokeWidth={1.8} className="text-[#655ac1]" />
              المناوبة اليومية
            </h3>
            <p className="text-slate-500 font-medium mt-2 mr-12 max-w-2xl text-sm leading-relaxed">
              نظّم توزيع المناوبين بخطوات سهلة، وعدّل الجدول وشاركه.
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

      {/* ══════ Stepper ══════ */}
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-200">
        <div className="flex items-stretch gap-1 overflow-x-auto custom-scrollbar">
          {stages.map((s, i) => {
            const isActive = stage === s.id;
            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => setStage(s.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all min-w-[180px] flex-1 text-right ${
                    isActive
                      ? 'bg-[#655ac1] shadow-md shadow-[#655ac1]/20'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="relative shrink-0">
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all ${
                      isActive ? 'bg-white border-white' : 'bg-transparent border-slate-200'
                    }`}>
                      <s.icon size={17} className="text-[#655ac1]" />
                    </span>
                    {s.complete && (
                      <span className="absolute -top-1.5 -left-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white ring-2 ring-white">
                        <Check size={9} strokeWidth={4} />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className={`block font-black text-sm leading-tight ${
                      isActive ? 'text-white' : 'text-slate-800'
                    }`}>
                      {s.label}
                    </span>
                    <span className={`block text-[11px] font-bold mt-0.5 truncate ${
                      isActive ? 'text-white/80' : 'text-slate-400'
                    }`}>
                      {s.hint}
                    </span>
                  </span>
                </button>
                {i < stages.length - 1 && (
                  <div className="flex items-center px-2 shrink-0">
                    <ChevronLeft size={20} className="text-slate-300" strokeWidth={2.5} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ══════ Banners ══════ */}
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

      {/* ══════ Stage Content ══════ */}
      <div className="min-h-[400px]">
        {stage === 'settings' && (
          <DutySettingsPage
            onBack={() => setStage('create')}
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
        {stage === 'create' && (
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
        {stage === 'monitoring' && (
          <MonitoringTab
            dutyData={dutyData}
            setDutyData={setDutyData}
            schoolInfo={schoolInfo}
            showToast={showToast}
          />
        )}
        {stage === 'output' && (
          <div className="space-y-4">
            <div className="bg-white rounded-[2rem] px-4 py-3 border border-slate-100 shadow-sm">
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                {outputModes.map(m => {
                  const active = outputMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setOutputMode(m.id)}
                      className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 border ${
                        active
                          ? 'bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20 border-[#655ac1]'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200 bg-white'
                      }`}
                    >
                      <m.icon size={16} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {outputMode === 'manage' ? (
              <ManageTab
                dutyData={dutyData}
                setDutyData={setDutyData}
                showToast={showToast}
              />
            ) : (
              <PrintSendTab
                key={outputMode}
                dutyData={dutyData}
                schoolInfo={schoolInfo}
                onOpenLegacyPrint={() => setIsPrintOpen(true)}
                onOpenLegacySend={() => setIsMessagingOpen(true)}
                showToast={showToast}
                mode={outputMode === 'send' ? 'send' : 'print'}
              />
            )}
          </div>
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
