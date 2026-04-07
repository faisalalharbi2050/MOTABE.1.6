import React, { useState } from 'react';
import {
  CircleHelp, TicketIcon, BookOpen, PhoneCall, Headset,
  ArrowRight, ArrowLeft, ChevronLeft, MessageSquare, Play, Lightbulb,
} from 'lucide-react';
import TicketSection from './TicketSection';
import KnowledgeBase from './KnowledgeBase';
import ContactChannels from './ContactChannels';
import ChatbotWidget from './ChatbotWidget';

type SupportView = 'home' | 'knowledge' | 'tickets' | 'contact';

// ─── Deflection Step ──────────────────────────────────────────────────────────
const DeflectionStep: React.FC<{
  onContinue: () => void;
  onGoKnowledge: () => void;
}> = ({ onContinue, onGoKnowledge }) => (
  <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative">
    {/* Background decorations */}
    <div className="absolute top-0 left-0 w-52 h-52 bg-gradient-to-br from-[#ede9ff] to-transparent rounded-br-[6rem] -z-0 pointer-events-none" />
    <div className="absolute bottom-0 right-0 w-28 h-28 bg-[#f5f3ff] rounded-tl-[4rem] -z-0 pointer-events-none" />

    <div className="relative z-10 py-10 px-8 text-center">
      {/* Icon */}
      <Lightbulb size={48} strokeWidth={1.5} className="text-[#655ac1] mx-auto mb-5" />

      {/* Title */}
      <h3 className="font-black text-slate-800 text-xl mb-3">قبل رفع التذكرة</h3>

      {/* Description — single line */}
      <p className="text-slate-500 font-medium text-sm mb-8 whitespace-nowrap">
        يضم مركز المساعدة أكثر من{' '}
        <span className="font-black text-[#655ac1]">40 سؤالاً وجواباً</span>
        {' '}و<span className="font-black text-[#655ac1]">22 شرحاً مفصّلاً</span>
        {' '}— قد تجد إجابتك فوراً.
      </p>

      {/* Buttons — stacked vertically */}
      <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
        <button
          onClick={onGoKnowledge}
          className="w-full py-3.5 bg-gradient-to-l from-[#655ac1] to-[#8779fb] text-white rounded-2xl font-black text-sm hover:from-[#5548b0] hover:to-[#7568eb] transition-all duration-300 shadow-lg shadow-indigo-200/60 flex items-center justify-center gap-2"
        >
          <BookOpen size={16} />
          استعرض مركز المساعدة
        </button>
        <button
          onClick={onContinue}
          className="w-full py-2.5 text-slate-400 font-semibold text-sm hover:text-[#655ac1] transition-colors flex items-center justify-center gap-1.5"
        >
          متابعة لرفع التذكرة
          <ArrowLeft size={14} />
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Container ───────────────────────────────────────────────────────────
const SupportContainer: React.FC = () => {
  const [view,           setView]           = useState<SupportView>('home');
  const [openTicketForm, setOpenTicketForm] = useState(false);
  const [showDeflect,    setShowDeflect]    = useState(false);

  const handleOpenTicketFromBot = () => {
    setView('tickets');
    setShowDeflect(false);
    setOpenTicketForm(true);
    setTimeout(() => setOpenTicketForm(false), 200);
  };

  const handleBack = () => {
    setView('home');
    setShowDeflect(false);
  };

  const sectionTitles: Record<SupportView, string> = {
    home:      '',
    knowledge: 'مركز المساعدة',
    tickets:   'تذاكر الدعم',
    contact:   'تواصل معنا',
  };

  return (
    <div className="space-y-6 dir-rtl animate-fade-in max-w-[1400px] mx-auto">

      {view === 'home' ? (
        // ── HOME VIEW ──────────────────────────────────────────────────────────
        <>
          {/* Header */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500" />
            <div className="relative z-10">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <CircleHelp size={36} strokeWidth={1.8} className="text-[#655ac1]" />
                الدعم والمساعدة
              </h2>
              <p className="text-slate-500 font-medium mt-2 mr-12">
                ابدأ بمركز المساعدة ستجد إجابة لاستفسارك ، أو ارفع تذكرة دعم، أو تواصل معنا.
              </p>
            </div>
          </div>

          {/* ── بطاقة مركز المساعدة ────────────────────────────────────────── */}
          <button
            onClick={() => setView('knowledge')}
            className="w-full bg-white rounded-[2rem] border border-[#c4bef9] shadow-lg transition-all duration-300 overflow-hidden group text-right relative p-8"
          >
            <div className="absolute top-0 left-0 w-56 h-56 bg-gradient-to-br from-[#ede9ff] to-transparent rounded-br-[6rem] -z-0 scale-110 duration-500" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-[#f5f3ff] rounded-tl-[3rem] -z-0" />

            <div className="relative z-10 flex items-start justify-between gap-6">
              <div className="flex-1">
                {/* Title */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 bg-[#655ac1] rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <BookOpen size={26} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-xl leading-tight">مركز المساعدة</h3>
                    <p className="text-[#8779fb] font-bold text-sm mt-0.5">ستجد إجابة لكل الاستفسارات مع شروحات فيديو توضيحية</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-2 justify-start">
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2">
                    <MessageSquare size={15} className="text-[#655ac1] shrink-0" />
                    <span className="text-base font-black text-[#655ac1]">+40</span>
                    <span className="text-sm font-bold text-slate-400">سؤال وجواب</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2">
                    <Play size={15} className="text-[#655ac1] shrink-0" />
                    <span className="text-base font-black text-[#655ac1]">22</span>
                    <span className="text-sm font-bold text-slate-400">شرح فيديو</span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="shrink-0 w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-[#655ac1] group-hover:border-[#655ac1] transition-all duration-300 mt-1">
                <ChevronLeft size={18} className="text-slate-400 group-hover:text-white transition-colors" />
              </div>
            </div>
          </button>

          {/* ── بطاقتا تذاكر الدعم + تواصل معنا ───────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* تذاكر الدعم */}
            <button
              onClick={() => { setView('tickets'); setShowDeflect(true); }}
              className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg hover:border-[#c4bef9] transition-all duration-300 overflow-hidden group text-right relative p-6"
            >
              <div className="absolute top-0 left-0 w-36 h-36 bg-gradient-to-br from-[#ede9ff] to-transparent rounded-br-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <TicketIcon size={26} className="text-[#655ac1]" />
                    <div>
                      <h3 className="font-black text-slate-800 text-base">تذاكر الدعم</h3>
                      <p className="text-[#8779fb] font-bold text-xs mt-0.5">ارفع تذكرتك لفريق الدعم</p>
                    </div>
                  </div>
                  <div className="shrink-0 w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-[#655ac1] group-hover:border-[#655ac1] transition-all duration-300">
                    <ChevronLeft size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                </div>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  ارفع تذكرة دعم وسيرد عليك فريقنا في أقرب وقت.
                </p>
              </div>
            </button>

            {/* تواصل معنا */}
            <button
              onClick={() => setView('contact')}
              className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg hover:border-[#c4bef9] transition-all duration-300 overflow-hidden group text-right relative p-6"
            >
              <div className="absolute top-0 left-0 w-36 h-36 bg-gradient-to-br from-[#ede9ff] to-transparent rounded-br-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <Headset size={26} className="text-[#655ac1]" />
                    <div>
                      <h3 className="font-black text-slate-800 text-base">تواصل معنا</h3>
                      <p className="text-[#8779fb] font-bold text-xs mt-0.5">تحدث مع فريق الدعم</p>
                    </div>
                  </div>
                  <div className="shrink-0 w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-[#655ac1] group-hover:border-[#655ac1] transition-all duration-300">
                    <ChevronLeft size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                </div>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  يمكنك التواصل مع فريق الدعم خلال أوقات العمل الرسمية.
                </p>
              </div>
            </button>
          </div>
        </>
      ) : (
        // ── SECTION VIEW ───────────────────────────────────────────────────────
        <>
          {/* Breadcrumb + Back */}
          <div className="bg-white rounded-[2rem] px-6 py-4 shadow-sm border border-slate-100 flex items-center gap-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-[#655ac1] hover:border-[#655ac1] transition-all group"
            >
              <ArrowRight size={18} className="text-slate-400 group-hover:text-white transition-colors" />
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2 text-sm font-medium">
              <span
                onClick={handleBack}
                className="text-slate-400 hover:text-[#655ac1] cursor-pointer transition-colors"
              >
                الدعم والمساعدة
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-black text-slate-700">{sectionTitles[view]}</span>
            </div>
          </div>

          {/* Deflection step */}
          {view === 'tickets' && showDeflect && (
            <DeflectionStep
              onContinue={() => setShowDeflect(false)}
              onGoKnowledge={() => { setView('knowledge'); setShowDeflect(false); }}
            />
          )}

          {/* Section content */}
          {!(view === 'tickets' && showDeflect) && (
            <>
              {view === 'knowledge' && <KnowledgeBase />}
              {view === 'tickets'   && <TicketSection openFormOnMount={openTicketForm} />}
              {view === 'contact'   && <ContactChannels />}
            </>
          )}
        </>
      )}

      {/* Floating AI Chatbot */}
      <ChatbotWidget onOpenTicket={handleOpenTicketFromBot} />
    </div>
  );
};

export default SupportContainer;
