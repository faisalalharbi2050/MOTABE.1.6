import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ChevronDown, MapPin, BookOpen, FileText, MessageSquare } from 'lucide-react';
import { MarketingRoute } from './MarketingApp';

interface Props {
  onNavigate: (r: MarketingRoute) => void;
  onScrollTo?: (id: string) => void;
}

interface NavItem {
  label: string;
  scrollId?: string;
  route?: MarketingRoute;
  children?: { label: string; route: MarketingRoute }[];
}

const MarketingHeader: React.FC<Props> = ({ onNavigate, onScrollTo }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (!openDropdown) return;
    const onDocClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openDropdown]);

  const items: NavItem[] = [
    { label: 'الرئيسية', scrollId: 'top' },
    { label: 'المزايا', scrollId: 'features' },
    { label: 'الأسعار', scrollId: 'pricing' },
    {
      label: 'الدعم والمساعدة',
      children: [
        { label: 'الأسئلة الشائعة', route: 'faq' },
        { label: 'تواصل معنا', route: 'contact' },
      ],
    },
    {
      label: 'السياسات والشروط',
      children: [
        { label: 'سياسة الخصوصية', route: 'privacy' },
        { label: 'الشروط والأحكام', route: 'terms' },
        { label: 'سياسة الاسترجاع', route: 'refund' },
      ],
    },
  ];

  const handleScroll = (id: string) => {
    setOpen(false);
    setOpenDropdown(null);
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (onScrollTo) onScrollTo(id);
    else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleRoute = (r: MarketingRoute) => {
    setOpen(false);
    setOpenDropdown(null);
    onNavigate(r);
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-[0_2px_20px_-8px_rgba(101,90,193,0.15)] border-b border-slate-200/60'
          : 'bg-white/80 backdrop-blur-sm border-b border-transparent'
      }`}
      dir="rtl"
    >
      <div className="max-w-[1280px] mx-auto px-5 lg:px-8 h-[72px] flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 group shrink-0"
          aria-label="منصة متابع"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7c6ee0] to-[#655ac1] flex items-center justify-center text-white font-black text-lg shadow-lg shadow-[#655ac1]/30 group-hover:shadow-[#655ac1]/50 group-hover:scale-105 transition-all">
            M
          </div>
          <span className="font-black text-xl text-slate-800 tracking-tight">متابع</span>
        </button>

        {/* Desktop nav */}
        <nav ref={navRef} className="hidden lg:flex items-center gap-0.5">
          {items.map((it) => (
            <div key={it.label} className="relative">
              {it.children ? (
                <button
                  onClick={() => setOpenDropdown((d) => (d === it.label ? null : it.label))}
                  className="px-3.5 py-2 rounded-lg text-slate-700 hover:text-[#655ac1] font-medium text-base transition-colors flex items-center gap-1"
                >
                  {it.label}
                  <ChevronDown className="w-3.5 h-3.5 mt-0.5" />
                </button>
              ) : (
                <button
                  onClick={() =>
                    it.scrollId ? handleScroll(it.scrollId) : it.route && handleRoute(it.route)
                  }
                  className="px-3.5 py-2 rounded-lg text-slate-700 hover:text-[#655ac1] font-medium text-base transition-colors"
                >
                  {it.label}
                </button>
              )}

              {/* Dropdown */}
              {it.children && openDropdown === it.label && (
                <div
                  className="absolute top-full right-0 mt-1 min-w-[200px] bg-white rounded-xl shadow-xl shadow-[#655ac1]/10 border border-slate-200/80 py-2 animate-fade-in"
                >
                  {it.children.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => handleRoute(c.route)}
                      className="w-full text-right px-4 py-2.5 text-sm text-slate-700 hover:bg-[#e5e1fe]/50 hover:text-[#655ac1] font-medium transition-colors"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Auth buttons */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('login')}
            className="px-6 py-3 rounded-lg bg-transparent text-slate-700 hover:text-[#655ac1] font-bold text-[15px] border border-slate-200 hover:border-[#655ac1] hover:bg-transparent transition-all"
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => onNavigate('register')}
            className="px-6 py-3 rounded-lg bg-[#655ac1] hover:bg-[#52499d] text-white font-bold text-[15px] shadow-lg shadow-[#655ac1]/25 hover:shadow-[#655ac1]/40 hover:-translate-y-0.5 transition-all"
          >
            ابدأ الآن مجانًا
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="lg:hidden w-10 h-10 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100"
          aria-label="القائمة"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-white border-t border-slate-200 shadow-lg animate-fade-in max-h-[calc(100vh-72px)] overflow-y-auto">
          <div className="px-5 py-4 space-y-1">
            {items.map((it) =>
              it.children ? (
                <details key={it.label} className="group">
                  <summary className="flex items-center justify-between px-4 py-3 rounded-lg text-slate-700 hover:bg-[#e5e1fe]/40 font-medium cursor-pointer list-none">
                    {it.label}
                    <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="pr-4 mt-1 space-y-1">
                    {it.children.map((c) => (
                      <button
                        key={c.label}
                        onClick={() => handleRoute(c.route)}
                        className="block w-full text-right px-4 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-[#e5e1fe]/30 hover:text-[#655ac1]"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </details>
              ) : (
                <button
                  key={it.label}
                  onClick={() =>
                    it.scrollId ? handleScroll(it.scrollId) : it.route && handleRoute(it.route)
                  }
                  className="block w-full text-right px-4 py-3 rounded-lg text-slate-700 hover:bg-[#e5e1fe]/40 font-medium"
                >
                  {it.label}
                </button>
              )
            )}
            <div className="pt-3 mt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => handleRoute('login')}
                className="w-full px-4 py-3 rounded-lg text-slate-700 border border-slate-200 font-bold text-sm"
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => handleRoute('register')}
                className="w-full px-4 py-3 rounded-lg bg-[#655ac1] text-white font-bold text-sm shadow-lg shadow-[#655ac1]/25"
              >
                ابدأ الآن مجانًا
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default MarketingHeader;
