import React from 'react';
import { ArrowRight, CalendarDays, ClipboardCheck, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { MarketingRoute } from './MarketingApp';

interface Props {
  title: string;
  subtitle: string;
  onNavigate: (r: MarketingRoute) => void;
  children: React.ReactNode;
}

/** Split-screen shell shared by login & register pages. */
const AuthShell: React.FC<Props> = ({ title, subtitle, onNavigate, children }) => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row" dir="rtl">
      {/* Right side — visual panel */}
      <aside
        className="lg:w-1/2 relative overflow-hidden hidden lg:flex flex-col justify-between p-10 xl:p-14 text-white"
        style={{ background: 'linear-gradient(135deg, #655ac1 0%, #8779fb 100%)' }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[28rem] h-[28rem] bg-white/5 rounded-full blur-3xl" />

        <div className="relative">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 group"
            aria-label="منصة متابع"
          >
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white font-black text-lg">
              م
            </div>
            <span className="font-black text-xl">متابع</span>
          </button>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-1.5 rounded-full text-sm font-bold mb-6">
            <Sparkles className="w-4 h-4" />
            10 أيام تجربة مجانية
          </div>
          <h2 className="text-3xl xl:text-4xl font-black mb-5 leading-tight">
            إدارة المدرسة <br />
            تستحق وقتك، لا أوراقك
          </h2>
          <p className="text-white/85 text-base leading-relaxed mb-8 max-w-md">
            انضم لمئات المدراء الذين اختصروا أعباءهم اليومية مع متابع.
          </p>

          <ul className="space-y-3 max-w-md">
            {[
              { icon: CalendarDays, text: 'جداول الحصص والانتظار في دقائق' },
              { icon: ClipboardCheck, text: 'مناوبة وإشراف يومي بضغطة' },
              { icon: MessageCircle, text: 'رسائل SMS وواتساب فورية' },
              { icon: ShieldCheck, text: 'صلاحيات لكل وكيل بدقة' },
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4" />
                </div>
                <span className="text-white/95 text-sm">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-white/70">
          © {new Date().getFullYear()} مؤسسة متابع التقنية
        </div>
      </aside>

      {/* Left side — form */}
      <main className="flex-1 flex flex-col bg-gradient-to-b from-[#fcfbff] to-white">
        {/* Mobile header (hidden on desktop) */}
        <div className="lg:hidden px-5 pt-5 flex items-center justify-between">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#655ac1] to-[#8779fb] flex items-center justify-center text-white font-black text-sm shadow-md">
              م
            </div>
            <span className="font-black text-slate-800">متابع</span>
          </button>
        </div>

        {/* Back-to-landing link */}
        <div className="px-5 lg:px-12 pt-6">
          <button
            onClick={() => onNavigate('landing')}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#655ac1] font-medium transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة إلى الصفحة الرئيسية
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-5 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">
                {title}
              </h1>
              <p className="text-slate-500 text-sm md:text-base">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthShell;
