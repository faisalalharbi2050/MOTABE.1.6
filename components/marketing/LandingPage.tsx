import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  CalendarCheck,
  School,
  User,
  ClipboardCheck,
  ClipboardList,
  Users,
  Clock,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  UserX,
  Database,
  Download,
  Send,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Rocket,
  Mail,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  FileCheck,
  FileSignature,
  Quote,
  Star,
  Crown,
  AlertCircle,
  Eye,
  Lock,
  Cloud,
} from 'lucide-react';
import MarketingHeader from './MarketingHeader';
import MarketingFooter from './MarketingFooter';
import { MarketingRoute } from './MarketingApp';
import { PACKAGE_FEATURES, PACKAGE_PRICING, PACKAGE_NAMES } from '../subscription/packages';
import { PackageTier, PaymentPeriod } from '../../types';

interface Props {
  onNavigate: (r: MarketingRoute) => void;
}

/* ═══════════════════════════════════════════════════════
   HERO — solid purple background with hero image + mockup
   ═══════════════════════════════════════════════════════ */
const Hero: React.FC<Props> = ({ onNavigate }) => (
  <section
    id="top"
    className="relative overflow-hidden min-h-[640px] lg:min-h-[720px] flex items-center"
    style={{
      background:
        'linear-gradient(135deg, #6c5ec9 0%, #655ac1 45%, #5a4fb8 100%)',
    }}
  >
    {/* Decorative background shapes */}
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-[#8779fb]/20 rounded-full blur-3xl" />
      <svg
        className="absolute bottom-0 left-0 w-full opacity-10"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
      >
        <path
          d="M0,120 C320,180 640,40 960,100 C1200,140 1320,80 1440,120 L1440,200 L0,200 Z"
          fill="white"
        />
      </svg>
    </div>

    <div className="relative max-w-[1280px] mx-auto px-5 lg:px-8 py-14 lg:py-20 grid lg:grid-cols-2 gap-10 lg:gap-6 items-center w-full">
      {/* Text side — appears on RIGHT in RTL (order-1 = first in flow) */}
      <div className="relative order-1 text-center lg:text-right text-white">
        <h1 className="font-black leading-[0.95]">
          <span className="block text-5xl md:text-6xl lg:text-[88px] tracking-tight drop-shadow-md">
            متابع
          </span>
        </h1>

        <div className="h-8 md:h-10" aria-hidden />

        <p className="text-base md:text-lg text-white/90 leading-relaxed mb-3 max-w-md mx-auto lg:mx-0 lg:mr-0 font-bold">
          نظام ذكي يُبسّط المهام ومتوافق مع الواقع المدرسي.
        </p>
        <p className="text-sm md:text-base text-white/80 leading-relaxed mb-8 max-w-md mx-auto lg:mx-0 lg:mr-0">
          إنشاء جداول الحصص والانتظار، إدارة الانتظار اليومي، إنشاء وإدارة الإشراف والمناوبة، إرسال الرسائل والإشعارات اليومية في مكان واحد.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
          <button
            onClick={() => onNavigate('register')}
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#655ac1] rounded-xl font-black text-base shadow-2xl shadow-black/20 hover:-translate-y-0.5 hover:shadow-black/40 hover:bg-[#f7f5ff] transition-all"
          >
            ابدأ الآن مجاناً
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform" />
          </button>
          <button
            onClick={() => onNavigate('login')}
            className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-base border border-white/30 backdrop-blur-sm transition-all"
          >
            تسجيل الدخول
          </button>
        </div>

        <div className="mt-6 flex justify-center lg:justify-start">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm text-white text-sm font-bold shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>جرّب متابع مجانًا لمدة</span>
            <span className="px-2 py-0.5 rounded-full bg-white text-[#655ac1] font-black text-xs">10 أيام</span>
          </div>
        </div>
      </div>

      {/* Visual side — appears on LEFT in RTL (order-2 = last in flow) */}
      <div className="relative order-2 flex justify-center lg:justify-end">
        <HeroVisual />
      </div>
    </div>
  </section>
);

const HeroVisual: React.FC = () => (
  <div className="relative w-full max-w-[580px] aspect-[5/4]">
    {/* Subtle browser window backdrop — semi-transparent, blends with purple bg */}
    <div className="absolute inset-y-6 inset-x-0 rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-[2px] overflow-hidden">
      {/* Browser chrome (top bar with traffic-light dots) */}
      <div className="h-9 px-3 flex items-center gap-1.5 border-b border-white/10">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
      </div>

      {/* Subtle content lines (mimicking dashboard) */}
      <div className="p-6 pt-8 space-y-3 opacity-60">
        <div className="h-1.5 bg-white/20 rounded-full w-3/4 ml-auto" />
        <div className="h-1.5 bg-white/15 rounded-full w-1/2 ml-auto" />
        <div className="h-1.5 bg-white/15 rounded-full w-2/3 ml-auto" />
      </div>

      {/* Decorative wave at bottom (lighter purple) */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full h-24 opacity-40"
        viewBox="0 0 580 100"
        preserveAspectRatio="none"
      >
        <path
          d="M0,60 C145,100 290,20 435,60 C507,80 543,50 580,60 L580,100 L0,100 Z"
          fill="rgba(255,255,255,0.15)"
        />
      </svg>
    </div>

    {/* Person image — sits directly on the purple bg, in front of browser */}
    <img
      src="/hero-person.png"
      alt="منصة متابع — مدير مدرسة"
      className="absolute bottom-8 left-1/2 -translate-x-1/2 h-[82%] w-auto object-contain object-bottom drop-shadow-[0_25px_40px_rgba(0,0,0,0.25)] z-10"
      loading="eager"
    />

    {/* Floating badges — anchored on the side closer to text (right in RTL) */}
    <FloatingBadge
      icon={Rocket}
      color="#655ac1"
      position="top-[36%] right-4 md:right-8"
      delay="0s"
    />
    <FloatingBadge
      icon={CalendarDays}
      color="#655ac1"
      position="top-1/2 -translate-y-1/2 -right-6 md:-right-8"
      delay="0.4s"
    />
    <FloatingBadge
      icon={Mail}
      color="#655ac1"
      position="bottom-[20%] right-2 md:right-4"
      delay="0.8s"
    />
  </div>
);

const FloatingBadge: React.FC<{
  icon: React.ComponentType<any>;
  color: string;
  position: string;
  delay: string;
}> = ({ icon: Icon, color, position, delay }) => (
  <div
    className={`absolute ${position} w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-white shadow-2xl shadow-black/20 flex items-center justify-center border-2 border-white animate-float`}
    style={{ animationDelay: delay }}
  >
    <Icon className="w-6 h-6 lg:w-7 lg:h-7" style={{ color }} strokeWidth={2.5} />
  </div>
);

/* ═══════════════════════════════════════════════════════
   SECTION TITLE — shared component
   ═══════════════════════════════════════════════════════ */
const SectionTitle: React.FC<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  light?: boolean;
}> = ({ eyebrow, title, subtitle, light }) => (
  <div className="text-center max-w-2xl mx-auto mb-14">
    {eyebrow && (
      <div
        className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-4 ${
          light
            ? 'bg-white/15 text-white border border-white/20 backdrop-blur-sm'
            : 'bg-[#e5e1fe]/60 text-[#655ac1]'
        }`}
      >
        {eyebrow}
      </div>
    )}
    <h2
      className={`text-3xl md:text-4xl lg:text-5xl font-black mb-3 inline-block relative ${
        light ? 'text-white' : 'text-[#655ac1]'
      }`}
    >
      {title}
      <span
        className={`block w-16 h-1 rounded-full mt-3 mx-auto ${
          light ? 'bg-white/40' : 'bg-[#655ac1]/30'
        }`}
      />
    </h2>
    {subtitle && (
      <p
        className={`text-base md:text-lg leading-relaxed mt-5 ${
          light ? 'text-white/80' : 'text-slate-600'
        }`}
      >
        {subtitle}
      </p>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════
   FEATURES — Image carousel + single consolidated card
   ═══════════════════════════════════════════════════════ */
const FEATURE_SLIDES = [
  { src: '/1.png', title: 'لوحة التحكم',       desc: 'نظرة شاملة على المدرسة وإحصاءاتها اليومية في مكان واحد' },
  { src: '/2.png', title: 'إسناد المواد',      desc: 'توزيع مرن وذكي للمواد على المعلمين بنقرات بسيطة' },
  { src: '/3.png', title: 'الحصص والانتظار',  desc: 'بناء جدول الحصص والانتظار آليًا مع توزيع عادل ومتوازن' },
  { src: '/4.png', title: 'الإشراف اليومي',   desc: 'متابعة الإشراف وتنبيه المعلمين فور أي تغيير' },
  { src: '/5.png', title: 'المناوبة اليومية', desc: 'إدارة المناوبة وتوزيعها وتقاريرها من شاشة واحدة' },
  { src: '/6.png', title: 'الرسائل',           desc: 'قوالب جاهزة وتواصل فوري عبر الواتساب والرسائل' },
];

const Features: React.FC = () => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActive(i => (i + 1) % FEATURE_SLIDES.length);
    }, 5000);
    return () => clearInterval(id);
  }, [paused]);

  const slide = FEATURE_SLIDES[active];
  const next = () => setActive(i => (i + 1) % FEATURE_SLIDES.length);
  const prev = () => setActive(i => (i - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length);

  return (
    <section id="features" className="relative py-24 md:py-32 bg-[#fafaff] overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[#e5e1fe]/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-[#e5e1fe]/30 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-[1280px] mx-auto px-5 lg:px-8">
        <SectionTitle title="مزايا متابع" />

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-12 items-center">
          {/* Carousel — realistic computer screen */}
          <div
            className="relative order-1"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Ambient glow */}
            <div className="absolute -inset-6 bg-gradient-to-tr from-[#655ac1]/20 via-[#8779fb]/10 to-transparent rounded-[32px] blur-3xl opacity-80 pointer-events-none" />

            {/* Browser-style frame */}
            <div className="relative bg-white rounded-2xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25),0_8px_24px_-8px_rgba(15,23,42,0.18)] ring-1 ring-slate-300/80 border border-slate-200">
              {/* Browser top bar */}
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                <div className="mx-auto bg-white border border-slate-200 rounded-md px-3 py-0.5 text-[10px] text-slate-500 font-mono">
                  motabe.sa
                </div>
              </div>

              {/* Slides */}
              <div className="relative aspect-[16/9] bg-white">
                {FEATURE_SLIDES.map((s, i) => (
                  <img
                    key={s.src}
                    src={s.src}
                    alt={s.title}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${
                      i === active ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                ))}
              </div>

              {/* Auto-advance progress bar */}
              <div className="h-1 bg-slate-100">
                <div
                  key={`${active}-${paused ? 'p' : 'r'}`}
                  className={`h-full bg-gradient-to-l from-[#8779fb] to-[#655ac1] ${
                    paused ? 'w-0' : 'animate-[motabe-progress_5s_linear]'
                  }`}
                />
              </div>
            </div>

            {/* Caption + nav row */}
            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                onClick={prev}
                aria-label="الشريحة السابقة"
                className="shrink-0 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="flex-1 text-center min-w-0">
                <h4 className="text-base md:text-lg font-black text-slate-900 truncate">
                  {slide.title}
                </h4>
                <p className="text-xs md:text-sm text-slate-500 truncate">{slide.desc}</p>
              </div>

              <button
                onClick={next}
                aria-label="الشريحة التالية"
                className="shrink-0 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Dots */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {FEATURE_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`الانتقال إلى الشريحة ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === active ? 'w-8 bg-[#655ac1]' : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>

            <style>{`
              @keyframes motabe-progress {
                from { width: 0%; }
                to { width: 100%; }
              }
            `}</style>
          </div>

          {/* Right column: heading + separate feature cards (2 per row) */}
          <div className="relative order-2">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 text-[#655ac1] text-xs font-black mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              منظومة متكاملة
            </div>

            <h3 className="text-xl md:text-2xl font-black text-[#655ac1] mb-5 flex items-center gap-2.5">
              <span className="w-1.5 h-7 bg-[#655ac1] rounded-full" />
              كل ما تحتاجه في منصة واحدة
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: Download,       title: 'استيراد البيانات',       desc: 'استيراد ذكي لبيانات المعلمين والطلاب' },
                { icon: ClipboardList,  title: 'إسناد المواد',           desc: 'توزيع المواد على المعلمين بسهولة ومرونة' },
                { icon: CalendarCheck,  title: 'الحصص والانتظار',        desc: 'إنشاء جداول الحصص والانتظار آليًا أو يدويًا' },
                { icon: Eye,            title: 'الإشراف اليومي',         desc: 'إنشاء جداول الإشراف بشكل آلي أو يدوي' },
                { icon: ShieldCheck,    title: 'المناوبة اليومية',       desc: 'إنشاء جداول المناوبة بشكل آلي أو يدوي' },
                { icon: UserX,          title: 'الانتظار اليومي',         desc: 'توزيع الانتظار آليًا أو يدويًا وإشعار المنتظرين' },
                { icon: MessageSquare,  title: 'الرسائل والإشعارات',     desc: 'إرسال الرسائل بقوالب جاهزة عبر الواتساب والرسائل النصية' },
                { icon: Lock,           title: 'منح الصلاحيات',           desc: 'توزيع المهام ومنح الصلاحيات لإدارة المنصة' },
                { icon: Cloud,          title: 'نظام سحابي',             desc: 'يعمل على الجوال والكمبيوتر من أي مكان' },
                { icon: FileSignature,  title: 'الإشعارات والتواقيع',    desc: 'نظام إشعارات إلكتروني وتواقيع رقمية' },
              ].map((it) => {
                const Icon = it.icon;
                return (
                  <div
                    key={it.title}
                    className="group flex items-start gap-2.5 p-4 rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_-12px_rgba(101,90,193,0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-12px_rgba(101,90,193,0.28)] hover:border-[#655ac1]/30"
                  >
                    <div className="w-9 h-9 flex items-center justify-center text-[#8779fb] group-hover:scale-110 transition-transform duration-200 shrink-0">
                      <Icon size={20} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-black text-slate-800 group-hover:text-[#655ac1] transition-colors mb-0.5 leading-tight">
                        {it.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-snug">
                        {it.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/** Reusable feature image with subtle tilt, glow, browser frame, and hover float. */
const FeatureImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  tilt?: string;
}> = ({ src, alt, className = '', tilt = '-2deg' }) => (
  <div className={`relative group ${className}`}>
    {/* Soft glow */}
    <div className="absolute -inset-4 bg-gradient-to-tr from-[#655ac1]/20 via-[#8779fb]/10 to-transparent rounded-[28px] blur-2xl opacity-80" />

    {/* Image with browser-style frame */}
    <div
      className="relative bg-white rounded-2xl overflow-hidden shadow-2xl shadow-[#655ac1]/25 border border-white ring-1 ring-slate-200/70 transform-gpu transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[#655ac1]/35"
      style={{ transform: `rotate(${tilt})` }}
    >
      {/* Browser chrome */}
      <div className="bg-slate-50 border-b border-slate-100 px-3 py-2 flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="mx-auto bg-white border border-slate-200 rounded px-3 py-0.5 text-[10px] text-slate-500 font-mono">
          motabe.sa
        </div>
      </div>
      <img src={src} alt={alt} className="w-full h-auto block" loading="lazy" />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════════ */
const HowItWorks: React.FC = () => {
  const steps = [
    { icon: UserPlus, title: 'سجّل', desc: 'أنشئ حسابك وابدأ تجربتك المجانية لمدة 10 أيام.' },
    { icon: Database, title: 'أضف البيانات', desc: 'أضف معلميك وفصولك ومواد الدراسة دفعة واحدة.' },
    { icon: CalendarDays, title: 'أنشئ جداولك', desc: 'الحصص، الانتظار، الإشراف، والمناوبة.' },
    { icon: Send, title: 'أرسل رسائلك', desc: 'تواصل مع المعلمين وأولياء الأمور.' },
    { icon: ShieldCheck, title: 'امنح صلاحياتك', desc: 'شارك المهام مع وكلائك بصلاحيات محدّدة.', optional: true },
  ];

  return (
    <section id="how" className="py-24 md:py-32 bg-white">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-8">
        <SectionTitle
          eyebrow="كيف يعمل؟"
          title="ابدأ في 5 خطوات سريعة"
          subtitle="رحلتك من التسجيل إلى إدارة كاملة لمدرستك خلال أقل من ساعة."
        />

        <div className="hidden lg:block relative">
          <div className="absolute top-[42px] right-[10%] left-[10%] h-0.5 bg-gradient-to-l from-[#e5e1fe] via-[#655ac1] to-[#e5e1fe]" />
          <div className="grid grid-cols-5 gap-4 relative">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="relative inline-block mb-5">
                  <div className="w-[88px] h-[88px] mx-auto rounded-2xl bg-white border-2 border-[#655ac1]/20 shadow-[0_12px_32px_-8px_rgba(101,90,193,0.18)] flex items-center justify-center relative z-10">
                    <s.icon className="w-8 h-8 text-[#655ac1]" strokeWidth={2} />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#655ac1] text-white text-xs font-black flex items-center justify-center shadow-lg z-20">
                    {i + 1}
                  </div>
                </div>
                <h3 className="font-black text-slate-800 text-lg mb-2">{s.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed px-2">{s.desc}</p>
                {s.optional && (
                  <p className="mt-2 text-[10px] text-amber-600 font-bold">اختياري</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:hidden space-y-4">
          {steps.map((s, i) => (
            <div
              key={i}
              className="flex gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
            >
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-xl bg-[#e5e1fe]/50 flex items-center justify-center">
                  <s.icon className="w-6 h-6 text-[#655ac1]" />
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#655ac1] text-white text-xs font-black flex items-center justify-center">
                  {i + 1}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-800 text-base mb-1">{s.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{s.desc}</p>
                {s.optional && (
                  <p className="mt-1.5 text-xs text-amber-600 font-bold">اختياري</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════
   STATS — dark navy bg with pill labels
   ═══════════════════════════════════════════════════════ */
const useCountUp = (target: number, duration = 1500, start: boolean) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return val;
};

const StatItem: React.FC<{
  icon: React.ComponentType<any>;
  value: number;
  label: string;
  start: boolean;
}> = ({ icon: Icon, value, label, start }) => {
  const v = useCountUp(value, 1800, start);
  return (
    <div className="text-center">
      <div className="text-5xl md:text-6xl lg:text-7xl font-black text-white tabular-nums mb-4 leading-none tracking-tight">
        {v.toLocaleString('en-US')}
        <span className="text-[#8779fb]">+</span>
      </div>
      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full text-white/90 text-sm font-bold">
        <Icon className="w-4 h-4 text-white" />
        {label}
      </div>
    </div>
  );
};

const Stats: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStart(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-28 overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, #1a1f3a 0%, #232a4d 50%, #1e2440 100%)',
      }}
    >
      {/* Decorative glows */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#655ac1]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#8779fb]/15 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative max-w-[1280px] mx-auto px-5 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-5">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white relative">
              متابع في أرقام
              <span className="absolute -bottom-2 right-0 left-0 h-0.5 bg-gradient-to-l from-transparent via-[#8779fb] to-transparent" />
            </h2>
            <div className="hidden md:inline-flex items-center gap-1.5 mr-2 px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full text-white text-xs font-bold">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              نمو مستمر
            </div>
          </div>
          <p className="text-white/70 text-base mt-6">أرقام تعكس ثقة المدارس واستخدامها اليومي.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 md:gap-6">
          <StatItem icon={School} value={300} label="مدرسة تثق بنا" start={start} />
          <StatItem icon={User} value={1500} label="زائر أسبوعياً" start={start} />
          <StatItem icon={CalendarCheck} value={2750} label="جداول تم إنشاءها" start={start} />
          <StatItem icon={MessageSquare} value={15000} label="رسائل تم إرسالها" start={start} />
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════
   TESTIMONIALS — carousel
   ═══════════════════════════════════════════════════════ */
const TESTIMONIALS = [
  {
    name: 'أ. سارة الغامدي',
    role: 'وكيلة شؤون طلاب',
    content:
      'سهولة الاستخدام والتكامل مع منصة مدرستي ونظام نور مذهلة. الدعم الفني متجاوب جداً.',
  },
  {
    name: 'أ. عبدالعزيز المطيري',
    role: 'مستخدم',
    content:
      'تجربة مميّزة جداً. النظام يغطي كافة احتياجاتنا اليومية في المدرسة بشكل احترافي.',
  },
  {
    name: 'أ. نورة القحطاني',
    role: 'مديرة مدرسة',
    content:
      'استطعنا تنظيم عملية الحضور والانصراف والمناوبة بشكل لم يسبق له مثيل. شكراً لكم.',
  },
  {
    name: 'أ. فهد الشمري',
    role: 'وكيل شؤون تعليمية',
    content:
      'وفّرنا ساعات يومياً في إعداد جداول المناوبة والإشراف. النظام أحدث فرقاً جوهرياً.',
  },
  {
    name: 'أ. ريم العتيبي',
    role: 'مديرة مدرسة',
    content:
      'الصلاحيات للوكلاء كانت نقطة تحوّل — كل وكيل يدير قسمه بدقة واحترافية كاملة.',
  },
];

const Testimonials: React.FC = () => {
  const [idx, setIdx] = useState(2);
  const total = TESTIMONIALS.length;

  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);

  return (
    <section id="testimonials" className="py-24 md:py-32 bg-gradient-to-b from-white to-[#fafaff]">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-8">
        <SectionTitle
          title="آراء عملاؤنا"
          subtitle="نسعد ونفخر بثقة عملائنا وآرائهم التي تدفعنا للتطوير المستمر."
        />

        <div className="relative">
          {/* Carousel container */}
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-[0_8px_40px_-15px_rgba(101,90,193,0.18)] py-12 px-6 md:px-12 overflow-hidden">
            <div className="relative h-[260px] md:h-[240px] flex items-center justify-center">
              {TESTIMONIALS.map((t, i) => {
                const offset = ((i - idx + total) % total) - 0;
                const wrappedOffset =
                  offset > total / 2 ? offset - total : offset < -total / 2 ? offset + total : offset;
                const isActive = wrappedOffset === 0;
                const isVisible = Math.abs(wrappedOffset) <= 2;
                if (!isVisible) return null;

                return (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 transition-all duration-500 ease-out"
                    style={{
                      transform: `translate(-50%, -50%) translateX(${wrappedOffset * 105}%) scale(${
                        isActive ? 1 : 0.85
                      })`,
                      opacity: isActive ? 1 : Math.abs(wrappedOffset) === 1 ? 0.55 : 0.2,
                      filter: isActive ? 'none' : 'blur(0.5px)',
                      zIndex: 10 - Math.abs(wrappedOffset),
                      pointerEvents: isActive ? 'auto' : 'none',
                    }}
                  >
                    <TestimonialCard t={t} />
                  </div>
                );
              })}
            </div>

            {/* Arrow controls */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={prev}
                className="w-11 h-11 rounded-full bg-white border border-slate-200 hover:border-[#655ac1] hover:bg-[#e5e1fe]/30 text-slate-600 hover:text-[#655ac1] flex items-center justify-center transition-all"
                aria-label="السابق"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Dots */}
              <div className="flex items-center gap-2 mx-2">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    className={`rounded-full transition-all ${
                      i === idx
                        ? 'w-8 h-2 bg-[#655ac1]'
                        : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                    aria-label={`الانتقال للرأي ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={next}
                className="w-11 h-11 rounded-full bg-white border border-slate-200 hover:border-[#655ac1] hover:bg-[#e5e1fe]/30 text-slate-600 hover:text-[#655ac1] flex items-center justify-center transition-all"
                aria-label="التالي"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const TestimonialCard: React.FC<{ t: typeof TESTIMONIALS[0] }> = ({ t }) => (
  <div className="w-[300px] md:w-[360px] bg-white border border-slate-200 rounded-2xl p-6 shadow-lg shadow-[#655ac1]/8">
    <p className="text-slate-700 text-sm md:text-[15px] leading-loose mb-5 min-h-[80px]">
      {t.content}
    </p>
    <div className="pt-4 border-t border-slate-100">
      <div className="font-black text-slate-800 text-sm">{t.name}</div>
      <div className="text-xs text-slate-500 mt-0.5">{t.role}</div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   PRICING — مطابق حرفياً لتصميم قسم الاشتراك والفوترة
   (components/subscription/PricingPlans.tsx)
   ═══════════════════════════════════════════════════════ */

const Pricing: React.FC<Props> = ({ onNavigate }) => {
  const [period, setPeriod] = useState<PaymentPeriod>('semester');

  const TIERS: PackageTier[] = ['basic', 'advanced'];

  const packageStyles = {
    basic: {
      bgLight: 'bg-[#f8f7ff]',
      textMain: 'text-[#8779fb]',
      btnDefault: 'bg-white border-2 border-slate-300 text-slate-800',
      btnHover: 'hover:border-[#655ac1] hover:bg-[#655ac1] hover:text-white group-hover:border-[#655ac1] group-hover:bg-[#655ac1] group-hover:text-white',
    },
    advanced: {
      bgLight: 'bg-[#f3f0ff]',
      textMain: 'text-[#6e5ee0]',
      btnDefault: 'bg-white border-2 border-slate-300 text-slate-800',
      btnHover: 'hover:border-[#655ac1] hover:bg-[#655ac1] hover:text-white group-hover:border-[#655ac1] group-hover:bg-[#655ac1] group-hover:text-white',
    },
  } as const;

  return (
    <section id="pricing" className="py-24 md:py-32 bg-white">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-8">
        <SectionTitle title="باقات متابع" subtitle="اختر الباقة والمدة التي تناسبك" />

        <div className="max-w-5xl mx-auto">
          {/* Period Toggle */}
          <div className="flex justify-center mb-10">
            <div className="bg-slate-50 p-1.5 rounded-2xl shadow-inner border border-slate-200 inline-flex">
              {[
                { id: 'monthly', label: 'شهري' },
                { id: 'semester', label: 'فصل دراسي' },
                { id: 'yearly', label: 'سنة دراسية' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as PaymentPeriod)}
                  className={`px-8 py-2 mx-1 rounded-xl font-bold transition-all text-sm ${
                    period === p.id
                      ? 'bg-white text-[#655ac1] shadow-md border-b-2 border-[#655ac1]'
                      : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Notice */}
          {(() => {
            const durationMap: Record<PaymentPeriod, { label: string; days: string }> = {
              monthly:  { label: 'الشهري',         days: '30'  },
              semester: { label: 'الفصل الدراسي',  days: '90'  },
              yearly:   { label: 'السنة الدراسية', days: '365' },
            };
            const { label, days } = durationMap[period];
            return (
              <div className="flex justify-center mb-8">
                <div className="inline-flex items-center gap-3 bg-white border border-slate-300 rounded-2xl px-6 py-3 text-sm font-bold text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-[#8779fb]" />
                  <span className="text-slate-400">مدة الاشتراك {label}</span>
                  <span className="font-black text-[#655ac1]">{days} يومًا</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs text-slate-400">تبدأ من تاريخ الاشتراك</span>
                </div>
              </div>
            );
          })()}

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {TIERS.map((tier) => {
              const price = PACKAGE_PRICING[tier][period];
              const isAdvanced = tier === 'advanced';
              const styles = packageStyles[tier as keyof typeof packageStyles];

              return (
                <div
                  key={tier}
                  className="bg-white border-2 border-slate-100 hover:border-slate-300 rounded-2xl p-6 text-center shadow-sm hover:shadow-xl transition-all group flex flex-col relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 ${styles.bgLight} rounded-bl-full -z-0 transition-transform group-hover:scale-110`} />

                  <div className="relative z-10 flex-1 flex flex-col">

                    {/* Badge slot */}
                    <div className="h-7 flex items-center justify-center mb-4">
                      {isAdvanced && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#655ac1] text-white text-xs font-black rounded-full shadow-sm shadow-indigo-200">
                          <Star size={11} className="fill-white text-white" /> الأكثر طلباً
                        </span>
                      )}
                    </div>

                    <h4 className="text-2xl font-black text-slate-800 mb-2">{PACKAGE_NAMES[tier]}</h4>

                    <div className="flex justify-center items-end gap-1 mb-6">
                      <span className={`text-4xl font-black ${styles.textMain}`}>{price}</span>
                      <span className="text-sm font-bold text-slate-400 mb-1.5">ريال</span>
                    </div>

                    <div className="space-y-3 text-right flex-1 p-2 transition-colors mb-6 flex flex-col">
                      {isAdvanced && (
                        <div className="mb-3 pb-3 border-b border-indigo-100">
                          <p className="text-sm font-black text-[#655ac1] flex items-center gap-2">
                            <Crown size={18}/>
                            جميع مزايا الباقة الأساسية بالاضافة للمزايا التالية :
                          </p>
                        </div>
                      )}
                      {(() => {
                        const tierFeatures = PACKAGE_FEATURES.filter(feat => {
                          if (feat.name === 'باقات الرسائل حسب احتياجك') return false;
                          const included = feat.includedIn.includes(tier);
                          if (!included && !isAdvanced) return false;
                          if (isAdvanced && feat.includedIn.includes('basic')) return false;
                          return included;
                        });

                        return (
                          <div className="flex flex-col flex-1">
                            <div className="space-y-3">
                              {tierFeatures.map((feat, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-slate-900">
                                  <div className="mt-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-[#7c6ee0] to-[#655ac1] flex items-center justify-center shadow-sm shadow-[#655ac1]/30 shrink-0">
                                    <Check size={12} strokeWidth={3.5} className="text-white" />
                                  </div>
                                  <span className="font-bold text-sm leading-relaxed">{feat.name}</span>
                                </div>
                              ))}
                              <div className="mt-4 pt-3 border-t border-slate-200">
                                <div className="flex items-center justify-center gap-1.5 w-full px-2 py-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 font-black whitespace-nowrap" style={{ fontSize: 'clamp(9px, 2.4vw, 12px)' }}>
                                  <AlertCircle size={13} strokeWidth={2.5} className="shrink-0" />
                                  <span>قيمة اشتراك الرسائل منفصلة عن قيمة الباقة</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <button
                      onClick={() => onNavigate('register')}
                      className={`w-full py-3.5 rounded-xl font-black text-lg transition-all shadow-sm ${styles.btnDefault} ${styles.btnHover}`}
                    >
                      اشتراك
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════
   MESSAGING PRICING — مطابق حرفياً لـ MessageSubscriptions
   (components/messaging/MessageSubscriptions.tsx)
   ═══════════════════════════════════════════════════════ */
type MsgPkg = {
  name: string; sms: number; wa: number; price: number;
  bgLight: string; textMain: string; bgIcon: string;
  btnDefault: string; btnHover: string;
};

const MESSAGING_PACKAGES: MsgPkg[] = [
  {
    name: 'أساسية', sms: 1000, wa: 10000, price: 289,
    bgLight: 'bg-[#f8f7ff]', textMain: 'text-[#8779fb]',
    bgIcon: 'bg-white text-[#8779fb] shadow-sm border border-[#e5e1fe]',
    btnDefault: 'bg-white border-2 border-[#e5e1fe] text-[#8779fb]',
    btnHover: 'hover:border-[#8779fb] hover:bg-[#8779fb] hover:text-white',
  },
  {
    name: 'متقدمة', sms: 5000, wa: 20000, price: 749,
    bgLight: 'bg-[#f3f0ff]', textMain: 'text-[#6e5ee0]',
    bgIcon: 'bg-white text-[#8779fb] shadow-sm border border-[#e5e1fe]',
    btnDefault: 'bg-white border-2 border-[#e5e1fe] text-[#8779fb]',
    btnHover: 'hover:border-[#8779fb] hover:bg-[#8779fb] hover:text-white',
  },
  {
    name: 'احترافية', sms: 10000, wa: 30000, price: 994,
    bgLight: 'bg-[#e5e1fe]', textMain: 'text-[#5b4cb8]',
    bgIcon: 'bg-white text-[#5b4cb8] shadow-sm border border-[#e5e1fe]',
    btnDefault: 'bg-white border-2 border-[#e5e1fe] text-[#8779fb]',
    btnHover: 'hover:border-[#8779fb] hover:bg-[#8779fb] hover:text-white',
  },
];

const MessagingPricing: React.FC<Props> = ({ onNavigate }) => (
  <div className="mt-10 max-w-5xl mx-auto">
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="text-center mb-8">
        <h3 className="text-xl font-black text-slate-800">باقات الرسائل</h3>
        <p className="text-sm font-bold text-slate-500 mt-2">اختر الباقة التي تناسبك</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MESSAGING_PACKAGES.map(pkg => (
          <div
            key={pkg.name}
            className="bg-white border-2 border-slate-100 hover:border-slate-300 rounded-3xl p-8 text-center shadow-sm hover:shadow-xl transition-all group flex flex-col relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${pkg.bgLight} rounded-bl-full -z-0 transition-transform group-hover:scale-110`} />
            <div className="relative z-10 flex-1 flex flex-col">

              <div className="h-7 flex items-center justify-center mb-3" />

              <h4 className="text-3xl font-black text-slate-800 mb-2">{pkg.name}</h4>
              <div className="flex justify-center items-end gap-1 mb-8">
                <span className={`text-5xl font-black ${pkg.textMain}`}>{pkg.price}</span>
                <span className="text-base font-bold text-slate-400 mb-1.5">ريال</span>
              </div>

              <div className="space-y-4 mb-10 text-right flex-1 bg-slate-50 rounded-2xl p-6 border border-slate-100 group-hover:bg-white transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${pkg.bgIcon} flex items-center justify-center shrink-0`}>
                    <MessageSquare size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-500 mb-1">نصية SMS</p>
                    <p className="text-lg font-black text-slate-800">
                      {pkg.sms.toLocaleString()} <span className="text-xs font-bold text-slate-400">رسالة</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${pkg.bgIcon} flex items-center justify-center shrink-0`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-500 mb-1">الواتساب</p>
                    <p className="text-lg font-black text-slate-800">
                      {pkg.wa.toLocaleString()} <span className="text-xs font-bold text-slate-400">رسالة</span>
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate('register')}
                className={`w-full py-3 ${pkg.btnDefault} ${pkg.btnHover} rounded-xl text-lg font-black transition-all shadow-sm`}
              >
                اشتراك
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-sm font-bold text-red-500 mt-10 flex items-center justify-center gap-2">
        <AlertCircle size={20} className="text-red-500" /> جميع الباقات صالحة لمدة 12 شهر تبدأ من تاريخ الاشتراك.
      </p>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════════ */
const FinalCTA: React.FC<Props> = ({ onNavigate }) => (
  <section className="py-16 md:py-20 bg-[#fafaff]">
    <div className="max-w-5xl mx-auto px-5 lg:px-8">
      <div
        className="rounded-[28px] p-10 md:p-14 text-center relative overflow-hidden shadow-2xl shadow-[#655ac1]/30"
        style={{
          background: 'linear-gradient(135deg, #6c5ec9 0%, #655ac1 100%)',
        }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="relative">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4">
            ابدأ تجربتك المجانية الآن
          </h2>
          <p className="text-white/90 text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            10 أيام كاملة بدون بطاقة ائتمان، ومع جميع المزايا.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onNavigate('register')}
              className="px-8 py-4 bg-white hover:bg-slate-50 text-[#655ac1] rounded-xl font-black text-base shadow-2xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              ابدأ الآن مجانًا
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-base border border-white/30 backdrop-blur-sm transition-all"
            >
              تواصل مع المبيعات
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════
   PAGE COMPOSITION
   ═══════════════════════════════════════════════════════ */
const LandingPage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <MarketingHeader onNavigate={onNavigate} />
      <main>
        <Hero onNavigate={onNavigate} />
        <Features />
        <Stats />
        <Testimonials />
        <Pricing onNavigate={onNavigate} />
      </main>
      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
};

export default LandingPage;
