import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck, PenLine, FileOutput, Send, Shuffle, Sparkles,
  Check, Archive, Eye, Printer, FileDown,
} from 'lucide-react';
import {
  SchoolInfo, ScheduleSettingsData, Teacher, Subject, ClassInfo, Admin,
  Assignment, Specialization, Student, MessageComposerDraft,
} from '../../types';
import ViewTabV3 from './tabs/ViewTabV3';
import EditTabV3 from './tabs/EditTabV3';
import CreateTab from './tabs/CreateTab';
import WaitingTabV3 from './tabs/WaitingTabV3';
import ManageTab from './tabs/ManageTab';

interface Props {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  scheduleSettings: ScheduleSettingsData;
  setScheduleSettings: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  students: Student[];
  admins: Admin[];
  assignments: Assignment[];
  gradeSubjectMap: Record<string, string[]>;
  specializations: Specialization[];
  onOpenMessagesArchive?: () => void;
  onPrepareMessageDraft?: (draft: MessageComposerDraft) => void;
  onNavigateMain?: (tab: string) => void;
}

type StageId = 'create' | 'waiting' | 'review' | 'output';
type OutputMode = 'preview' | 'print' | 'export' | 'send' | 'manage';

const STAGE_STORAGE_KEY = 'motabe:schedule_v3:stage';
const LOCK_STORAGE_KEY = 'motabe:schedule_v2:locked';

const ScheduleV2Preview: React.FC<Props> = (props) => {
  const { scheduleSettings, onOpenMessagesArchive, onPrepareMessageDraft } = props;

  const [stage, setStage] = useState<StageId>(() => {
    try {
      const saved = localStorage.getItem(STAGE_STORAGE_KEY);
      if (saved === 'create' || saved === 'waiting' || saved === 'review' || saved === 'output') {
        return saved as StageId;
      }
    } catch {}
    return 'create';
  });
  const [outputMode, setOutputMode] = useState<OutputMode>('preview');

  const [isScheduleLocked, setIsScheduleLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LOCK_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STAGE_STORAGE_KEY, stage); } catch {}
  }, [stage]);

  useEffect(() => {
    try { localStorage.setItem(LOCK_STORAGE_KEY, isScheduleLocked ? '1' : '0'); } catch {}
  }, [isScheduleLocked]);

  useEffect(() => {
    const handler = () => { setStage('output'); setOutputMode('send'); };
    window.addEventListener('motabe:send_schedule', handler);
    return () => window.removeEventListener('motabe:send_schedule', handler);
  }, []);

  const hasSchedule = !!scheduleSettings.timetable && Object.keys(scheduleSettings.timetable).length > 0;

  const distributionPrepared = useMemo(() => {
    const slots = Object.values(scheduleSettings.timetable || {});
    const hasWaiting = slots.some((slot: any) => slot?.type === 'waiting');
    const sub = (scheduleSettings.substitution || {}) as any;
    const manualReady = sub.method === 'manual' && !!sub.manualReady;
    return hasWaiting || manualReady;
  }, [scheduleSettings.timetable, scheduleSettings.substitution]);

  // Maps the legacy navigation ids used by the inner tabs onto the new stages.
  const navigate = (tab: string) => {
    if (tab === 'create') setStage('create');
    else if (tab === 'waiting') setStage('waiting');
    else if (tab === 'edit') setStage('review');
    else if (tab === 'view') { setStage('output'); setOutputMode('preview'); }
    else if (tab === 'send') { setStage('output'); setOutputMode('send'); }
  };

  const stages: Array<{
    id: StageId; n: number; label: string; hint: string;
    icon: React.ComponentType<any>; complete: boolean;
  }> = [
    { id: 'create', n: 1, label: 'إنشاء الجدول', hint: 'ابنِ جدول الحصص', icon: Sparkles, complete: hasSchedule },
    { id: 'review', n: 2, label: 'المراجعة والتعديل', hint: 'راجع وعدّل الجدول', icon: PenLine, complete: false },
    { id: 'waiting', n: 3, label: 'توزيع الانتظار', hint: 'ابنِ جدول الانتظار', icon: Shuffle, complete: distributionPrepared },
    { id: 'output', n: 4, label: 'الإخراج والمشاركة', hint: 'عاين - اطبع - صدّر - أرسل', icon: FileOutput, complete: false },
  ];

  const goToStage = (s: typeof stages[number]) => {
    setStage(s.id);
  };

  const outputModes: Array<{ id: OutputMode; label: string; icon: React.ComponentType<any>; badge?: number }> = [
    { id: 'preview', label: 'معاينة', icon: Eye },
    { id: 'print', label: 'طباعة', icon: Printer },
    { id: 'export', label: 'تصدير', icon: FileDown },
    { id: 'send', label: 'إرسال الجداول', icon: Send },
    { id: 'manage', label: 'الجداول المحفوظة', icon: Archive },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
        <div className="relative z-10">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <CalendarCheck size={36} strokeWidth={1.8} className="text-[#655ac1]" />
            إدارة الحصص والانتظار
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12">
            إدارة جدول الحصص والانتظار من الإنشاء حتى الاعتماد والمشاركة.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-200">
        <div className="flex items-stretch gap-1 overflow-x-auto custom-scrollbar">
          {stages.map((s, i) => {
            const isActive = stage === s.id;
            const prevComplete = i > 0 && stages[i - 1].complete;
            const waitingForSchedule = !hasSchedule && s.id !== 'create';
            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => goToStage(s)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all min-w-[180px] flex-1 text-right ${
                    isActive
                      ? 'bg-[#655ac1] shadow-md shadow-[#655ac1]/20'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black border-2 transition-all ${
                    s.complete
                      ? 'bg-white border-slate-200'
                      : isActive
                        ? `bg-white border-white ${waitingForSchedule ? 'text-slate-400' : 'text-[#655ac1]'}`
                        : `bg-white border-slate-200 ${waitingForSchedule ? 'text-slate-400' : 'text-[#655ac1]'}`
                  }`}>
                    {s.complete ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white">
                        <Check size={12} strokeWidth={3.5} />
                      </span>
                    ) : s.n}
                  </span>
                  <span className="min-w-0">
                    <span className={`flex items-center gap-1.5 font-black text-sm leading-tight ${
                      isActive ? 'text-white' : 'text-slate-800'
                    }`}>
                      <s.icon size={15} className={isActive ? 'text-white' : waitingForSchedule ? 'text-slate-400' : 'text-[#655ac1]'} />
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
                  <div className="flex items-center px-1 shrink-0">
                    <span className={`w-6 h-0.5 rounded-full transition-all ${prevComplete ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {stage === 'create' && (
          <CreateTab
            {...props}
            onNavigate={navigate as any}
            isScheduleLocked={isScheduleLocked}
            setIsScheduleLocked={setIsScheduleLocked}
          />
        )}
        {stage === 'waiting' && (
          <WaitingTabV3
            {...props}
            onNavigate={navigate as any}
            isScheduleLocked={isScheduleLocked}
            setIsScheduleLocked={setIsScheduleLocked}
          />
        )}
        {stage === 'review' && (
          <EditTabV3 {...props} onNavigate={navigate as any} isScheduleLocked={isScheduleLocked} />
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
                      {typeof m.badge === 'number' && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#655ac1]'}`}>
                          {m.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {outputMode === 'manage' ? (
              <ManageTab
                scheduleSettings={props.scheduleSettings}
                setScheduleSettings={props.setScheduleSettings}
              />
            ) : (
              <ViewTabV3
                key={outputMode}
                {...props}
                task={outputMode as 'preview' | 'print' | 'export' | 'send'}
                onNavigate={navigate as any}
                isScheduleLocked={isScheduleLocked}
                onOpenMessagesArchive={onOpenMessagesArchive}
                onPrepareMessageDraft={onPrepareMessageDraft}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleV2Preview;
