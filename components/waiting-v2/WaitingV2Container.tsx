import React, { useEffect, useState } from 'react';
import { UserX, Shuffle, Scale, FileOutput, FileText, Send } from 'lucide-react';
import {
  Teacher, Admin, ClassInfo, Subject, SchoolInfo, ScheduleSettingsData, Specialization,
} from '../../types';
import RegisterTab from './tabs/RegisterTab';
import DistributeTab from './tabs/DistributeTab';
import BalanceTab from './tabs/BalanceTab';
import PrintSendTab from './tabs/PrintSendTab';
import SendTab from './tabs/SendTab';
import ReportsTab from './tabs/ReportsTab';

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

type TabId = 'register' | 'distribute' | 'balance' | 'printsend' | 'send' | 'reports';

const TAB_STORAGE_KEY = 'motabe:waiting_v2:lastTab';
const VALID_TABS: TabId[] = ['register', 'distribute', 'printsend', 'send', 'balance', 'reports'];

const WaitingV2Container: React.FC<Props> = (props) => {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE_KEY) as TabId | null;
      if (saved && VALID_TABS.includes(saved)) return saved;
    } catch {}
    return 'register';
  });

  useEffect(() => {
    try { localStorage.setItem(TAB_STORAGE_KEY, activeTab); } catch {}
  }, [activeTab]);

  const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<any> }> = [
    { id: 'register', label: 'تسجيل غياب معلم', icon: UserX },
    { id: 'distribute', label: 'توزيع الانتظار', icon: Shuffle },
    { id: 'printsend', label: 'طباعة الانتظار', icon: FileOutput },
    { id: 'send', label: 'إرسال الانتظار', icon: Send },
    { id: 'balance', label: 'رصيد الانتظار', icon: Scale },
    { id: 'reports', label: 'تقارير الانتظار', icon: FileText },
  ];

  // When user closes a auto-opened modal (balance/reports), the tab returns to register
  const handleSectionExit = () => setActiveTab('register');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20" dir="rtl">
      {/* ══════ Header Card ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500" />
        <div className="relative z-10">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <UserX size={36} strokeWidth={1.8} className="text-[#655ac1]" />
            الانتظار اليومي
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 max-w-2xl text-sm leading-relaxed">
            إسناد حصص الانتظار اليومية للمنتظرين بطريقة ذكية ومتوازنة، أو استخدام التوزيع اليدوي
          </p>
        </div>
      </div>

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

      {/* ══════ Tab Content ══════ */}
      <div className="min-h-[400px]">
        {activeTab === 'register' && <RegisterTab {...props} onGoToDistribute={() => setActiveTab('distribute')} />}
        {activeTab === 'distribute' && <DistributeTab {...props} onGoToPrintSend={() => setActiveTab('printsend')} />}
        {activeTab === 'balance' && <BalanceTab {...props} onSectionExit={handleSectionExit} />}
        {activeTab === 'printsend' && <PrintSendTab {...props} />}
        {activeTab === 'send' && <SendTab {...props} />}
        {activeTab === 'reports' && <ReportsTab {...props} onSectionExit={handleSectionExit} />}
      </div>
    </div>
  );
};

export default WaitingV2Container;
