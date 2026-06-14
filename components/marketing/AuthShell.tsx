import React from 'react';
import { ArrowRight } from 'lucide-react';
import { MarketingRoute } from './MarketingApp';

interface Props {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onNavigate: (r: MarketingRoute) => void;
  children: React.ReactNode;
}

/** Minimal, centered auth card on a white page (login & register share this shell). */
const AuthShell: React.FC<Props> = ({ title, subtitle, badge, onNavigate, children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col" dir="rtl">
      {/* Top bar with back-to-landing button styled like the primary CTA */}
      <div className="px-5 lg:px-12 pt-6 flex items-center justify-start gap-6">
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
          className="h-11 w-auto select-none"
          draggable={false}
        />
      </div>

      {/* Centered card */}
      <div className="flex-1 flex flex-col items-center justify-center p-5 lg:p-12">
        <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-300/40 p-6 md:p-8">
          {badge && (
            <div className="absolute -top-6 left-4">
              {badge}
            </div>
          )}
          <div className="mb-10 text-center">
            <h1 className="text-xl md:text-2xl font-extrabold mb-2 text-slate-800">
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
