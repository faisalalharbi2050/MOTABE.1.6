import React from 'react';
import { 
  UserMinus,
  Send,
  TableProperties,
  Eye,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';

interface QuickActionsProps {
  onNavigate: (tab: string) => void;
}

function navWithAction(onNavigate: (tab: string) => void, tab: string, action?: string) {
  onNavigate(tab);
  if (action) {
    setTimeout(() => window.dispatchEvent(new CustomEvent(`motabe:${action}`)), 250);
  }
}

const ROWS = [
  [
    { label: 'إضافة انتظار',  icon: UserMinus,    tab: 'daily_waiting',  action: 'add_waiting',      rotate: false },
    { label: 'إرسال الانتظار', icon: Send,          tab: 'daily_waiting',  action: 'send_waiting',     rotate: true  },
  ],
  [
    { label: 'إرسال الجدول',  icon: TableProperties, tab: 'classes_waiting', action: 'send_schedule',  rotate: false },
    { label: 'إرسال رسالة',   icon: MessageSquare,   tab: 'messages',        action: undefined,        rotate: false },
  ],
  [
    { label: 'إرسال الإشراف', icon: Eye,           tab: 'supervision',    action: 'send_supervision', rotate: false },
    { label: 'إرسال المناوبة', icon: ShieldCheck,   tab: 'duty',           action: 'send_duty',        rotate: false },
  ],
];

const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-6 bg-[#8779fb] rounded-full"></div>
        <h3 className="text-lg font-bold text-slate-800">إجراءات سريعة</h3>
      </div>

      <div className="flex flex-col justify-between flex-1 gap-3">
        {ROWS.map((row, ri) => (
          <div key={ri} className="grid grid-cols-2 gap-3 flex-1">
            {row.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navWithAction(onNavigate, action.tab, action.action)}
                  className="group flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-slate-200/70 transition-all bg-transparent hover:border-slate-300"
                >
                  <div className={`w-10 h-10 flex items-center justify-center text-[#8779fb] group-hover:scale-110 transition-transform duration-200 ${action.rotate ? 'rotate-[20deg]' : ''}`}>
                    <Icon size={24} strokeWidth={1.8} />
                  </div>
                  <span className="text-xs font-bold text-slate-500 group-hover:text-[#655ac1] transition-colors text-center leading-tight">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;


