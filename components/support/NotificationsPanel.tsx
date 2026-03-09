import React, { useState } from 'react';
import { Bell, X, CheckCircle2, MessageCircle, Clock, BellOff } from 'lucide-react';

interface Notification {
  id: string;
  type: 'reply' | 'status' | 'closed';
  ticketId: string;
  message: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'reply',
    ticketId: 'TKT-001',
    message: 'تم الرد على تذكرتك #TKT-001 بخصوص "مشكلة في تسجيل الدخول". اضغط للاطلاع على الرد.',
    time: 'منذ 5 دقائق',
    read: false,
  },
  {
    id: 'n2',
    type: 'status',
    ticketId: 'TKT-002',
    message: 'تم تحديث حالة تذكرتك #TKT-002 إلى "قيد المعالجة". سيتواصل معك فريق الدعم قريباً.',
    time: 'منذ ساعة',
    read: false,
  },
  {
    id: 'n3',
    type: 'closed',
    ticketId: 'TKT-003',
    message: 'تم إغلاق تذكرتك #TKT-003. نأمل أن يكون طلبك قد تمت معالجته بشكل مُرضٍ.',
    time: 'أمس',
    read: true,
  },
];

const typeConfig = {
  reply: { icon: MessageCircle, color: 'text-[#655ac1]', bg: 'bg-[#f0eeff]' },
  status: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  closed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
};

interface NotificationsPanelProps {
  onClose: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="absolute left-0 top-14 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 animate-fade-in overflow-hidden" style={{ direction: 'rtl' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-l from-[#f0eeff] to-white">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-[#655ac1]" />
          <h3 className="font-black text-slate-800 text-base">الإشعارات</h3>
          {unreadCount > 0 && (
            <span className="bg-[#655ac1] text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-bold text-[#655ac1] hover:text-[#52499d] transition-colors"
            >
              تعليم الكل كمقروء
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <BellOff size={36} className="mb-3 text-slate-300" />
            <p className="font-bold text-sm">لا توجد إشعارات</p>
          </div>
        ) : (
          notifications.map(notif => {
            const cfg = typeConfig[notif.type];
            const Icon = cfg.icon;
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3 px-5 py-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors group ${!notif.read ? 'bg-[#faf9ff]' : 'bg-white'}`}
              >
                <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon size={18} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed ${!notif.read ? 'font-bold text-slate-800' : 'text-slate-600 font-medium'}`}>
                    {notif.message}
                  </p>
                  <p className="text-xs text-slate-400 font-medium mt-1">{notif.time}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-[#655ac1]" />
                  )}
                  <button
                    onClick={() => dismissNotification(notif.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-500 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400 font-medium">
          يتم إشعارك أيضاً عبر واتساب / SMS عند وجود ردود جديدة
        </p>
      </div>
    </div>
  );
};

export default NotificationsPanel;
