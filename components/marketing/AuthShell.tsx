import React from 'react';
import { ArrowRight } from 'lucide-react';
import { MarketingRoute } from './MarketingApp';

interface Props {
  title: string;
  subtitle: string;
  onNavigate: (r: MarketingRoute) => void;
  children: React.ReactNode;
}

/** Minimal, centered auth card on a white page (login & register share this shell). */
const AuthShell: React.FC<Props> = ({ title, subtitle, onNavigate, children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col" dir="rtl">
      {/* Top bar with back-to-landing button styled like the primary CTA */}
      <div className="px-5 lg:px-12 pt-6 flex justify-start">
        <button
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#655ac1] hover:bg-[#52499d] text-white font-bold text-sm shadow-lg shadow-[#655ac1]/25 transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للرئيسية
        </button>
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center p-5 lg:p-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-300/40 p-6 md:p-8">
          <div className="mb-10 text-center">
            <h1 className="text-2xl md:text-3xl font-black mb-2 text-[#655ac1]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-slate-500 text-sm md:text-base">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
