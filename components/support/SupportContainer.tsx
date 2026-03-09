import React, { useState, useRef } from 'react';
import { Headphones, TicketIcon, BookOpen, PhoneCall, Bell } from 'lucide-react';
import TicketSection from './TicketSection';
import KnowledgeBase from './KnowledgeBase';
import ContactChannels from './ContactChannels';
import ChatbotWidget from './ChatbotWidget';
import NotificationsPanel from './NotificationsPanel';

type SupportTab = 'tickets' | 'knowledge' | 'contact';

const TABS: { id: SupportTab; label: string; icon: React.ElementType }[] = [
  { id: 'tickets',   label: 'تذاكر الدعم',    icon: TicketIcon },
  { id: 'knowledge', label: 'مركز المساعدة',   icon: BookOpen },
  { id: 'contact',   label: 'تواصل معنا',      icon: PhoneCall },
];

const SupportContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SupportTab>('tickets');
  const [showNotif, setShowNotif] = useState(false);
  const [openTicketForm, setOpenTicketForm] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // When chatbot triggers ticket opening → switch tab + open form
  const handleOpenTicketFromBot = () => {
    setActiveTab('tickets');
    setOpenTicketForm(true);
    // Reset after mount so re-clicks still work
    setTimeout(() => setOpenTicketForm(false), 200);
  };

  return (
    <div className="space-y-6 dir-rtl animate-fade-in max-w-[1400px] mx-auto">

      {/* ── Header Card wrapper (relative so bell can escape overflow-hidden) ── */}
      <div className="relative">

        {/* Header Card — overflow-hidden preserved for design */}
        <div className="bg-white rounded-[2rem] px-8 pt-8 pb-6 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500" />
          <div className="relative z-10 flex items-start gap-4">
            {/* Reserve space on the left for the bell (avoid text overlap) */}
            <div className="flex-1">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-[#e5e1fe] text-[#655ac1] rounded-xl">
                  <Headphones size={24} />
                </div>
                الدعم الفني
              </h2>
              <p className="text-slate-500 font-medium mt-2 mr-12">
                ارفع تذاكرك، تصفح الأسئلة الشائعة، أو تواصل مع فريق الدعم مباشرة.
                يمكنك أيضاً استخدام المساعد الذكي للإجابة الفورية.
              </p>
            </div>
            {/* Spacer matching bell button width so text doesn't bleed under it */}
            <div className="w-12 shrink-0" />
          </div>
        </div>

        {/* Bell button — outside overflow-hidden, visually inside header */}
        <div className="absolute top-6 left-7 z-20" ref={notifRef}>
          <button
            onClick={() => setShowNotif(v => !v)}
            className="relative p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#655ac1] hover:border-[#655ac1]/30 hover:bg-[#f0eeff] transition-all shadow-sm"
            title="الإشعارات"
          >
            <Bell size={20} />
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-sm">
              2
            </span>
          </button>
          {showNotif && (
            <NotificationsPanel onClose={() => setShowNotif(false)} />
          )}
        </div>

      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex gap-2 overflow-x-auto custom-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all flex-1 justify-center ${
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

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div>
        {activeTab === 'tickets'   && <TicketSection openFormOnMount={openTicketForm} />}
        {activeTab === 'knowledge' && <KnowledgeBase />}
        {activeTab === 'contact'   && <ContactChannels />}
      </div>

      {/* ── Floating AI Chatbot ─────────────────────────────────────────────── */}
      <ChatbotWidget onOpenTicket={handleOpenTicketFromBot} />
    </div>
  );
};

export default SupportContainer;
