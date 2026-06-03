import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Eye, Settings, BarChart3,
  CheckCircle, AlertTriangle, AlertCircle,
  RefreshCw, X, Info, Sparkles, FileOutput, Send,
  Check, Printer, Archive, ChevronLeft,
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

type StageId = 'settings' | 'create' | 'output' | 'monitoring';
type OutputMode = 'print' | 'send' | 'manage';

const STAGE_STORAGE_KEY = 'motabe:supervision_v2:stage';
const TAB_STORAGE_KEY = 'motabe:supervision_v2:lastTab';

const SupervisionV2Container: React.FC<Props> = ({
  schoolInfo, setSchoolInfo, teachers, admins, scheduleSettings, onNavigateToTiming, onOpenMessagesArchive,
}) => {
  const [stage, setStage] = useState<StageId>(() => {
    try {
      if (sessionStorage.getItem('motabe:supervision_v2:open_send_reminder') === '1') {
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
      if (sessionStorage.getItem('motabe:supervision_v2:open_send_reminder') === '1') {
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
        onBack={() => setStage('create')}
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

  const settingsComplete = hasTimingData(schoolInfo);
  const scheduleComplete = supervisionData.dayAssignments.length > 0;

  const stages: Array<{
    id: StageId; n: number; label: string; hint: string;
    icon: React.ComponentType<any>; complete: boolean;
  }> = [
    { id: 'settings', n: 1, label: 'إعدادات الإشراف', hint: 'اضبط إعدادات الفترات والمشرفون', icon: Settings, complete: settingsComplete },
    { id: 'create', n: 2, label: 'إنشاء الجدول', hint: 'وزّع المشرفين على الفترات', icon: Sparkles, complete: scheduleComplete },
    { id: 'output', n: 3, label: 'الإخراج والمشاركة', hint: 'اطبع - أرسل - أدر الجداول', icon: FileOutput, complete: false },
    { id: 'monitoring', n: 4, label: 'المتابعة والتقارير', hint: 'أدر الإشراف وتقاريره', icon: BarChart3, complete: false },
  ];

  const outputModes: Array<{ id: OutputMode; label: string; icon: React.ComponentType<any> }> = [
    { id: 'print', label: 'طباعة', icon: Printer },
    { id: 'send', label: 'إرسال الإشراف', icon: Send },
    { id: 'manage', label: 'الجداول المحفوظة', icon: Archive },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20" dir="rtl">
      {/* ══════ Header Card ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
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
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all min-w-[180px] flex-1 text-right ${
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
                  <div className="flex items-center px-0.5 shrink-0">
                    <ChevronLeft size={20} className="text-slate-300" strokeWidth={2.5} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
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

      {/* ══════ Stage Content ══════ */}
      <div className="min-h-[400px]">
        {stage === 'settings' && renderSettingsTab()}
        {stage === 'create' && (
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
        {stage === 'monitoring' && (
          <MonitoringTab
            supervisionData={supervisionData}
            setSupervisionData={setSupervisionData}
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
                supervisionData={supervisionData}
                setSupervisionData={setSupervisionData}
                showToast={showToast}
              />
            ) : (
              <PrintSendTab
                key={outputMode}
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
                mode={outputMode === 'send' ? 'send' : 'print'}
              />
            )}
          </div>
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
