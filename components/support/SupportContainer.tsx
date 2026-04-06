import React, { useState } from 'react';
import { CircleHelp, TicketIcon, BookOpen, PhoneCall } from 'lucide-react';
import TicketSection from './TicketSection';
import KnowledgeBase from './KnowledgeBase';
import ContactChannels from './ContactChannels';
import ChatbotWidget from './ChatbotWidget';

type SupportTab = 'tickets' | 'knowledge' | 'contact';

const TABS: { id: SupportTab; label: string; icon: React.ElementType }[] = [
  { id: 'knowledge', label: 'مركز المساعدة',   icon: BookOpen },
  { id: 'tickets',   label: 'تذاكر الدعم',    icon: TicketIcon },
  { id: 'contact',   label: 'تواصل معنا',      icon: PhoneCall },
];

const SupportContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SupportTab>('knowledge');
  const [openTicketForm, setOpenTicketForm] = useState(false);

  // When chatbot triggers ticket opening → switch tab + open form
  const handleOpenTicketFromBot = () => {
    setActiveTab('tickets');
    setOpenTicketForm(true);
    // Reset after mount so re-clicks still work
    setTimeout(() => setOpenTicketForm(false), 200);
  };

  return (
    <div className="space-y-6 dir-rtl animate-fade-in max-w-[1400px] mx-auto">

      {/* ── Header Card ── */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500" />
        <div className="relative z-10">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <CircleHelp size={36} strokeWidth={1.8} className="text-[#655ac1]" />
            الدعم والمساعدة
          </h2>
          <p className="text-slate-500 font-medium mt-2 mr-12">
            تصفح مركز المساعدة، ارفع تذكرتك، أو تواصل مع فريق الدعم مباشرة، ويمكنك أيضاً استخدام المساعد الذكي للإجابة الفورية.
          </p>
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
