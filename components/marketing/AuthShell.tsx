import React from 'react';
import { ArrowRight } from 'lucide-react';
import { MarketingRoute } from './MarketingApp';

interface Props {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  wide?: boolean;
  onNavigate: (r: MarketingRoute) => void;
  children: React.ReactNode;
}

/** Shared shell for all authentication and delegated-access journeys. */
const AuthShell: React.FC<Props> = ({ title, subtitle, badge, wide = false, onNavigate, children }) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fcfbff] flex flex-col" dir="rtl">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#e5e1fe]/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-[30rem] w-[30rem] rounded-full bg-[#8779fb]/10 blur-3xl" />
      {/* Top bar with back-to-landing button styled like the primary CTA */}
      <div className="relative z-10 px-5 lg:px-10 pt-5 flex items-center justify-start gap-4">
        <button
          onClick={() => onNavigate('landing')}
          aria-label="العودة للرئيسية"
          title="العودة للرئيسية"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#655ac1] hover:bg-[#52499d] text-white shadow-lg shadow-[#655ac1]/25 transition-all"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <img
          src="/logo.png"
          alt="متابع"
          className="h-9 w-auto select-none"
          draggable={false}
        />
      </div>

      {/* Centered card */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 lg:p-8">
        <div className={`relative w-full ${wide ? 'max-w-xl' : 'max-w-[420px]'} bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-xl shadow-slate-300/30 p-5 md:p-6`}>
          {badge && (
            <div className="absolute -top-6 left-4">
              {badge}
            </div>
          )}
          <div className="mb-6 text-center">
            <h1 className="text-lg md:text-xl font-extrabold mb-1.5 text-slate-800">
              {title}
            </h1>
            {subtitle && (
              <p className="text-slate-500 text-xs md:text-sm">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
