import React, { useState } from 'react';
import {
  CircleHelp, ArrowRight, Headset, ChevronLeft,
} from 'lucide-react';
import TicketSection from './TicketSection';
import KnowledgeBase from './KnowledgeBase';

type SupportView = 'home' | 'tickets';

// ─── Main Container ───────────────────────────────────────────────────────────
const SupportContainer: React.FC = () => {
  const [view, setView] = useState<SupportView>('home');

  const handleBack = () => {
    setView('home');
  };

  const goTickets = () => {
    setView('tickets');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 dir-rtl animate-fade-in max-w-[1400px] mx-auto">

      {view === 'home' ? (
        // ── HOME VIEW — مركز واحد متدفّق ───────────────────────────────────────
        <>
          {/* Header — شريط العنوان يبقى كما هو، تحسين الوصف فقط */}
          <div className="relative overflow-visible">
            <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
              <div className="relative z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                    <CircleHelp size={36} strokeWidth={1.8} className="text-[#655ac1]" />
                    الدعم والمساعدة
                  </h2>
                  <p className="text-slate-500 font-medium mt-2 mr-12 leading-relaxed">
                    ابحث عن إجابتك في الأسئلة والشروحات، وإن لم تجدها فارفع تذكرة دعم.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* مركز المساعدة — بحث + أسئلة + فيديو، ظاهر فوراً */}
          <KnowledgeBase />

          {/* ── لم تجد إجابتك؟ → التذاكر (قناة تأتي بعد المحتوى) ──────────────── */}
          <button
            onClick={goTickets}
            className="w-full bg-white rounded-[2rem] border border-slate-200 transition-all duration-300 overflow-hidden group text-right p-6 hover:border-[#655ac1]/30 hover:shadow-[0_8px_28px_-6px_rgba(101,90,193,0.14)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <Headset size={24} className="text-[#655ac1]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-800 text-lg leading-tight mb-1">لم تجد إجابة لاستفسارك؟</h3>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed">
                    ارفع تذكرة دعم وسيتواصل معك فريقنا خلال أوقات العمل الرسمية.
                  </p>
                </div>
              </div>
              <div className="shrink-0 self-center w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-slate-100 group-hover:border-slate-300 transition-all duration-300">
                <ChevronLeft size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
            </div>
          </button>
        </>
      ) : (
        // ── TICKETS VIEW ───────────────────────────────────────────────────────
        <>
          {/* Breadcrumb + Back */}
          <div className="bg-white rounded-[2rem] px-6 py-4 shadow-sm border border-slate-200 flex items-center gap-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 hover:border-slate-300 transition-all group"
            >
              <ArrowRight size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2 text-sm font-medium min-w-0 flex-wrap">
              <span
                onClick={handleBack}
                className="text-slate-400 hover:text-[#655ac1] cursor-pointer transition-colors"
              >
                الدعم والمساعدة
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-black text-slate-700">تذاكر الدعم</span>
            </div>
          </div>

          <TicketSection />
        </>
      )}
    </div>
  );
};

export default SupportContainer;
