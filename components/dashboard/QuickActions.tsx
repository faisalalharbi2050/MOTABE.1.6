import React from 'react';
import {
  UserX,
  Eye,
  ShieldCheck,
  MessageSquare,
  CalendarCheck,
  ClipboardList
} from 'lucide-react';

interface QuickActionsProps {
  onNavigate: (tab: string) => void;
}

function navWithAction(onNavigate: (tab: string) => void, tab: string, action?: string) {
  // Pre-seed target containers so they land on the correct sub-tab / mode
  try {
    switch (action) {
      case 'add_waiting':
        localStorage.setItem('motabe:waiting_v2:lastTab', 'register');
        break;
      case 'open_schedule_view':
        localStorage.setItem('motabe:schedule_v2:lastTab', 'view');
        break;
      case 'send_supervision':
        localStorage.setItem('motabe:supervision_v2:lastTab', 'printsend');
        sessionStorage.setItem('motabe:supervision_v2:open_send_reminder', '1');
        break;
      case 'send_duty':
        localStorage.setItem('motabe:duty_v2:lastTab', 'printsend');
        sessionStorage.setItem('motabe:duty_v2:open_send_reminder', '1');
        break;
    }
  } catch {}

  onNavigate(tab);
}

const ROWS = [
  [
    { label: 'إرسال رسالة',     icon: MessageSquare, tab: 'messages',      action: undefined,            rotate: false },
    { label: 'إضافة انتظار',    icon: UserX,         tab: 'daily_waiting', action: 'add_waiting',        rotate: false },
  ],
  [
    { label: 'إسناد المواد',    icon: ClipboardList, tab: 'manual',        action: undefined,            rotate: false },
    { label: 'جدول الحصص',      icon: CalendarCheck, tab: 'schedule_v2',   action: 'open_schedule_view', rotate: false },
  ],
  [
    { label: 'التذكير بالإشراف', icon: Eye,          tab: 'supervision',   action: 'send_supervision',   rotate: false },
    { label: 'التذكير بالمناوبة', icon: ShieldCheck, tab: 'duty',          action: 'send_duty',          rotate: false },
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


