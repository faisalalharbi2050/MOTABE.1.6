import React, { useEffect, useState } from 'react';
import { CalendarDays, PenLine, FileOutput, Send, Shuffle, Sparkles, Table } from 'lucide-react';
import { SchoolInfo, ScheduleSettingsData, Teacher, Subject, ClassInfo, Admin, Assignment, Specialization, Student, MessageComposerDraft } from '../../types';
import ViewTab from './tabs/ViewTab';
import EditTab from './tabs/EditTab';
import CreateTab from './tabs/CreateTab';
import WaitingTab from './tabs/WaitingTab';
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
  specializations: Specialization[];
  onOpenMessagesArchive?: () => void;
  onPrepareMessageDraft?: (draft: MessageComposerDraft) => void;
}

type TabId = 'create' | 'edit' | 'waiting' | 'view' | 'send' | 'manage';

const TAB_STORAGE_KEY = 'motabe:schedule_v2:lastTab';
const LOCK_STORAGE_KEY = 'motabe:schedule_v2:locked';

const ScheduleV2Container: React.FC<Props> = (props) => {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE_KEY);
      if (saved === 'view' || saved === 'edit' || saved === 'create' || saved === 'waiting' || saved === 'send' || saved === 'manage') {
        return saved as TabId;
      }
    } catch {}
    return 'create';
  });

  const [isScheduleLocked, setIsScheduleLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LOCK_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCK_STORAGE_KEY, isScheduleLocked ? '1' : '0');
    } catch {}
  }, [isScheduleLocked]);

  useEffect(() => {
    const handler = () => setActiveTab('send');
    window.addEventListener('motabe:send_schedule', handler);
    return () => window.removeEventListener('motabe:send_schedule', handler);
  }, []);

  const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<any> }> = [
    { id: 'create', label: 'إنشاء الجدول', icon: Sparkles },
    { id: 'edit', label: 'تعديل الجدول', icon: PenLine },
    { id: 'waiting', label: 'إعداد وتوزيع الانتظار', icon: Shuffle },
    { id: 'view', label: 'معاينة وطباعة وتصدير', icon: FileOutput },
    { id: 'send', label: 'إرسال الجدول', icon: Send },
    { id: 'manage', label: 'إدارة الجداول', icon: Table },
  ];

  const navigate = (tab: TabId) => setActiveTab(tab);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
        <div className="relative z-10">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <CalendarDays size={36} strokeWidth={1.8} className="text-[#655ac1]" />
            إدارة الحصص والانتظار
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12">
            إنشاء وإدارة جدول الحصص والانتظار عبر واجهة تفاعلية سهلة وسلسة
          </p>
        </div>
      </div>

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

      <div className="min-h-[400px]">
        {activeTab === 'create' && (
          <CreateTab
            {...props}
            onNavigate={navigate}
            isScheduleLocked={isScheduleLocked}
            setIsScheduleLocked={setIsScheduleLocked}
          />
        )}
        {activeTab === 'edit' && (
          <EditTab {...props} onNavigate={navigate} isScheduleLocked={isScheduleLocked} />
        )}
        {activeTab === 'waiting' && (
          <WaitingTab
            {...props}
            onNavigate={navigate}
            isScheduleLocked={isScheduleLocked}
            setIsScheduleLocked={setIsScheduleLocked}
          />
        )}
        {activeTab === 'view' && (
          <ViewTab {...props} mode="view" onNavigate={navigate} isScheduleLocked={isScheduleLocked} onOpenMessagesArchive={props.onOpenMessagesArchive} onPrepareMessageDraft={props.onPrepareMessageDraft} />
        )}
        {activeTab === 'send' && (
          <ViewTab {...props} mode="send" onNavigate={navigate} isScheduleLocked={isScheduleLocked} onOpenMessagesArchive={props.onOpenMessagesArchive} onPrepareMessageDraft={props.onPrepareMessageDraft} />
        )}
        {activeTab === 'manage' && (
          <ManageTab
            scheduleSettings={props.scheduleSettings}
            setScheduleSettings={props.setScheduleSettings}
          />
        )}
      </div>
    </div>
  );
};

export default ScheduleV2Container;
