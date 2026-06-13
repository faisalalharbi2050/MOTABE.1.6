import React, { useState } from 'react';
import {
  CircleHelp, ArrowRight, Lightbulb, BookOpen, ArrowLeft,
  Headset, ChevronLeft,
} from 'lucide-react';
import TicketSection from './TicketSection';
import KnowledgeBase from './KnowledgeBase';
import { TOTAL_FAQ_COUNT, TOTAL_VIDEO_COUNT } from './supportData';

type SupportView = 'home' | 'tickets';

// ─── Deflection Step ──────────────────────────────────────────────────────────
const DeflectionStep: React.FC<{
  onContinue: () => void;
  onGoKnowledge: () => void;
}> = ({ onContinue, onGoKnowledge }) => (
  <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
    <div className="py-10 px-8 text-center">
      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-5">
        <Lightbulb size={28} strokeWidth={1.8} className="text-[#655ac1]" />
      </div>

      {/* Title */}
      <h3 className="font-black text-slate-800 text-xl mb-3">قبل رفع التذكرة</h3>

      {/* Description */}
      <p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed max-w-md mx-auto">
        يضم مركز المساعدة{' '}
        <span className="font-black text-[#655ac1]">{TOTAL_FAQ_COUNT} سؤالاً وجواباً</span>
        {' '}و<span className="font-black text-[#655ac1]">{TOTAL_VIDEO_COUNT} شرحاً مرئياً</span>
        {' '}— قد تجد إجابتك فوراً دون انتظار.
      </p>

      {/* Buttons */}
      <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
        <button
          onClick={onGoKnowledge}
          className="w-full py-3.5 bg-[#655ac1] text-white rounded-2xl font-black text-sm hover:bg-[#5548b0] transition-all duration-300 shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
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
  const [view,        setView]        = useState<SupportView>('home');
  const [showDeflect, setShowDeflect] = useState(false);

  const handleBack = () => {
    setView('home');
    setShowDeflect(false);
  };

  const goTickets = () => {
    setView('tickets');
    setShowDeflect(true);
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

          {/* Deflection step */}
          {showDeflect ? (
            <DeflectionStep
              onContinue={() => setShowDeflect(false)}
              onGoKnowledge={handleBack}
            />
          ) : (
            <TicketSection />
          )}
        </>
      )}
    </div>
  );
};

export default SupportContainer;
