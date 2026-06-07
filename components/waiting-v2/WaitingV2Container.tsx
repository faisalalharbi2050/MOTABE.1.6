import React, { useEffect, useMemo, useState } from 'react';
import {
  UserX, Shuffle, FileOutput, BarChart3, Check, ChevronLeft,
  Printer, Send, Scale, FileText,
} from 'lucide-react';
import {
  Teacher, Admin, ClassInfo, Subject, SchoolInfo, ScheduleSettingsData, Specialization,
} from '../../types';
import RegisterTab from './tabs/RegisterTab';
import DistributeTab from './tabs/DistributeTab';
import BalanceTab from './tabs/BalanceTab';
import PrintSendTab from './tabs/PrintSendTab';
import SendTab from './tabs/SendTab';
import ReportsTab from './tabs/ReportsTab';
import SchoolTabs from '../wizard/SchoolTabs';

interface Props {
  teachers: Teacher[];
  admins: Admin[];
  classes: ClassInfo[];
  subjects: Subject[];
  schoolInfo: SchoolInfo;
  scheduleSettings: ScheduleSettingsData;
  specializations?: Specialization[];
  onOpenMessagesArchive?: () => void;
}

type StageId = 'register' | 'distribute' | 'output' | 'monitoring';
type OutputMode = 'printsend' | 'send';
type MonitorMode = 'balance' | 'reports';

const STAGE_STORAGE_KEY = 'motabe:waiting_v2:stage';
const LEGACY_TAB_KEY = 'motabe:waiting_v2:lastTab';
const OUTPUT_MODE_KEY = 'motabe:waiting_v2:outputMode';
const MONITOR_MODE_KEY = 'motabe:waiting_v2:monitorMode';
const SCHOOL_TAB_STORAGE_KEY = 'motabe:waiting_v2:activeSchoolTab';
const SELECTED_DATE_STORAGE_KEY = 'motabe:waiting_v2:selectedDate';

const STAGES: StageId[] = ['register', 'distribute', 'output', 'monitoring'];

const WaitingV2Container: React.FC<Props> = (props) => {
  const { schoolInfo, scheduleSettings } = props;

  const [stage, setStage] = useState<StageId>(() => {
    try {
      const saved = localStorage.getItem(STAGE_STORAGE_KEY) as StageId | null;
      if (saved && STAGES.includes(saved)) return saved;
      // Migrate legacy flat-tab value onto the new stages.
      const legacy = localStorage.getItem(LEGACY_TAB_KEY);
      if (legacy === 'register' || legacy === 'distribute') return legacy as StageId;
      if (legacy === 'printsend' || legacy === 'send') return 'output';
      if (legacy === 'balance' || legacy === 'reports') return 'monitoring';
    } catch {}
    return 'register';
  });

  const [outputMode, setOutputMode] = useState<OutputMode>(() => {
    try {
      const saved = localStorage.getItem(OUTPUT_MODE_KEY) as OutputMode | null;
      if (saved === 'printsend' || saved === 'send') return saved;
      if (localStorage.getItem(LEGACY_TAB_KEY) === 'send') return 'send';
    } catch {}
    return 'printsend';
  });

  const [monitorMode, setMonitorMode] = useState<MonitorMode>(() => {
    try {
      const saved = localStorage.getItem(MONITOR_MODE_KEY) as MonitorMode | null;
      if (saved === 'balance' || saved === 'reports') return saved;
      if (localStorage.getItem(LEGACY_TAB_KEY) === 'reports') return 'reports';
    } catch {}
    return 'balance';
  });

  const sharedSchools = schoolInfo?.sharedSchools || [];
  const hasSharedSchools = sharedSchools.length > 0;
  const isSeparateMode = (scheduleSettings?.generationMode || 'unified') === 'separate';
  const showSchoolTabs = hasSharedSchools && isSeparateMode;

  const [activeSchoolTab, setActiveSchoolTab] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(SCHOOL_TAB_STORAGE_KEY);
      if (saved && (saved === 'main' || sharedSchools.some(s => s.id === saved))) return saved;
    } catch {}
    return 'main';
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      return localStorage.getItem(SELECTED_DATE_STORAGE_KEY) || new Date().toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  });

  useEffect(() => { try { localStorage.setItem(STAGE_STORAGE_KEY, stage); } catch {} }, [stage]);
  useEffect(() => { try { localStorage.setItem(OUTPUT_MODE_KEY, outputMode); } catch {} }, [outputMode]);
  useEffect(() => { try { localStorage.setItem(MONITOR_MODE_KEY, monitorMode); } catch {} }, [monitorMode]);
  useEffect(() => { try { localStorage.setItem(SCHOOL_TAB_STORAGE_KEY, activeSchoolTab); } catch {} }, [activeSchoolTab]);
  useEffect(() => { try { localStorage.setItem(SELECTED_DATE_STORAGE_KEY, selectedDate); } catch {} }, [selectedDate]);

  useEffect(() => {
    if (!showSchoolTabs && activeSchoolTab !== 'main') setActiveSchoolTab('main');
  }, [showSchoolTabs, activeSchoolTab]);

  // ══════ Stage completion (read from the monolith's localStorage, decoupled) ══════
  const [completionTick, setCompletionTick] = useState(0);
  useEffect(() => {
    const bump = () => setCompletionTick(t => t + 1);
    window.addEventListener('focus', bump);
    document.addEventListener('visibilitychange', bump);
    window.addEventListener('motabe:waiting_changed', bump);
    return () => {
      window.removeEventListener('focus', bump);
      document.removeEventListener('visibilitychange', bump);
      window.removeEventListener('motabe:waiting_changed', bump);
    };
  }, []);

  const { absentCount, assignedCount } = useMemo(() => {
    try {
      const suffix = activeSchoolTab && activeSchoolTab !== 'main' ? `_${activeSchoolTab}` : '';
      const raw = localStorage.getItem(`daily_waiting_sessions_v1${suffix}`);
      const sessions = raw ? JSON.parse(raw) : [];
      const session = Array.isArray(sessions) ? sessions.find((s: any) => s.date === selectedDate) : null;
      return {
        absentCount: session?.absentTeachers?.length || 0,
        assignedCount: session?.assignments?.length || 0,
      };
    } catch {
      return { absentCount: 0, assignedCount: 0 };
    }
    // completionTick forces a re-read after edits/focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchoolTab, selectedDate, stage, completionTick]);

  const filteredTeachers = showSchoolTabs
    ? props.teachers.filter(t => t.schoolId === activeSchoolTab || (!t.schoolId && activeSchoolTab === 'main'))
    : props.teachers;
  const filteredAdmins = showSchoolTabs
    ? props.admins.filter(a => (a as any).schoolId === activeSchoolTab || (!(a as any).schoolId && activeSchoolTab === 'main'))
    : props.admins;

  const childProps = {
    ...props,
    teachers: filteredTeachers,
    admins: filteredAdmins,
    activeSchoolTab,
    selectedDate,
    onSelectedDateChange: setSelectedDate,
  };

  const stages: Array<{
    id: StageId; n: number; label: string; hint: string;
    icon: React.ComponentType<any>; complete: boolean;
  }> = [
    { id: 'register', n: 1, label: 'تسجيل الغياب', hint: 'اختر الغائبين ونوع غيابهم', icon: UserX, complete: absentCount > 0 },
    { id: 'distribute', n: 2, label: 'توزيع الانتظار', hint: 'وزّع آليًا أو يدويًا على المنتظرين', icon: Shuffle, complete: assignedCount > 0 },
    { id: 'output', n: 3, label: 'الإخراج والمشاركة', hint: 'اطبع النموذج أو أرسله إلكترونيًا', icon: FileOutput, complete: false },
    { id: 'monitoring', n: 4, label: 'الرصيد والتقارير', hint: 'تابع رصيد الانتظار واستخرج التقارير', icon: BarChart3, complete: false },
  ];

  const outputModes: Array<{ id: OutputMode; label: string; icon: React.ComponentType<any> }> = [
    { id: 'printsend', label: 'طباعة', icon: Printer },
    { id: 'send', label: 'إرسال الانتظار', icon: Send },
  ];

  const monitorModes: Array<{ id: MonitorMode; label: string; icon: React.ComponentType<any> }> = [
    { id: 'balance', label: 'رصيد الانتظار', icon: Scale },
    { id: 'reports', label: 'تقارير الانتظار', icon: FileText },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20" dir="rtl">
      {/* ══════ Header Card ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
        <div className="relative z-10">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <UserX size={36} strokeWidth={1.8} className="text-[#655ac1]" />
            الانتظار اليومي
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 max-w-2xl text-sm leading-relaxed">
            أمّن حصص المعلمين الغائبين بإسنادها للمنتظرين بخطوات سهلة، ثم اطبع النموذج أو أرسله إلكترونيًا للتوقيع.
          </p>
        </div>
      </div>

      {/* ══════ School Tabs (only when separate mode + shared schools) ══════ */}
      {showSchoolTabs && (
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

      {/* ══════ Stage Content ══════ */}
      <div className="min-h-[400px]">
        {stage === 'register' && (
          <RegisterTab {...childProps} onGoToDistribute={() => setStage('distribute')} />
        )}

        {stage === 'distribute' && (
          <DistributeTab
            {...childProps}
            onGoToPrintSend={() => { setStage('output'); setOutputMode('printsend'); }}
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

            {outputMode === 'printsend'
              ? <PrintSendTab key="printsend" {...childProps} />
              : <SendTab key="send" {...childProps} />}
          </div>
        )}

        {stage === 'monitoring' && (
          <div className="space-y-4">
            <div className="bg-white rounded-[2rem] px-4 py-3 border border-slate-100 shadow-sm">
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                {monitorModes.map(m => {
                  const active = monitorMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMonitorMode(m.id)}
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

            {monitorMode === 'balance'
              ? <BalanceTab key="balance" {...childProps} />
              : <ReportsTab key="reports" {...childProps} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitingV2Container;
