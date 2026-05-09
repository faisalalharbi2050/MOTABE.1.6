import React from 'react';
import { Twitter, Mail, Phone } from 'lucide-react';
import { MarketingRoute } from './MarketingApp';

interface Props {
  onNavigate: (r: MarketingRoute) => void;
}

const PaymentBadge: React.FC<{ label: string; icon: React.ReactNode }> = ({ label, icon }) => (
  <div className="px-3 h-10 rounded-lg bg-white flex items-center justify-center gap-2 text-xs font-bold text-slate-700 shadow-sm border border-white/40">
    <span className="flex items-center justify-center">{icon}</span>
    <span>{label}</span>
  </div>
);

const MadaIcon = () => (
  <span className="text-[10px] font-black text-[#84BD00] tracking-tight">مدى</span>
);
const VisaIcon = () => (
  <span className="text-[11px] italic font-black text-[#1A1F71] tracking-tight">VISA</span>
);
const MasterCardIcon = () => (
  <span className="flex items-center -space-x-1.5">
    <span className="w-3.5 h-3.5 rounded-full bg-[#EB001B] block" />
    <span className="w-3.5 h-3.5 rounded-full bg-[#F79E1B] block opacity-90" />
  </span>
);
const ApplePayIcon = () => (
  <span className="text-[11px] font-black text-black tracking-tight">Pay</span>
);
const SamsungPayIcon = () => (
  <span className="text-[10px] font-black text-[#1428A0] tracking-tight">Samsung Pay</span>
);

const MarketingFooter: React.FC<Props> = ({ onNavigate }) => {
  const year = new Date().getFullYear();

  return (
    <footer
      className="text-white"
      dir="rtl"
      style={{ background: 'linear-gradient(135deg, #6c5ec9 0%, #655ac1 45%, #5a4fb8 100%)' }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* About */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7c6ee0] to-[#655ac1] flex items-center justify-center text-white font-black text-lg shadow-lg shadow-black/20 ring-1 ring-white/30">
                M
              </div>
              <span className="font-black text-xl text-white tracking-tight">متابع</span>
            </div>
            <p className="text-sm text-white/90 leading-relaxed mb-2 font-bold">
              مؤسسة متابع التقنية
            </p>
            <p className="text-sm text-white/80 leading-relaxed">
              سجل تجاري رقم: <span className="font-bold text-white">10101010101</span>
            </p>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-black text-white mb-4 text-base md:text-lg">الدعم والمساعدة</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('faq')}
                  className="text-white/85 hover:text-white hover:underline transition-colors"
                >
                  الأسئلة الشائعة
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="text-white/85 hover:text-white hover:underline transition-colors"
                >
                  تواصل معنا
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-black text-white mb-4 text-base md:text-lg">السياسات والشروط</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('privacy')}
                  className="text-white/85 hover:text-white hover:underline transition-colors"
                >
                  سياسة الخصوصية
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('terms')}
                  className="text-white/85 hover:text-white hover:underline transition-colors"
                >
                  الشروط والأحكام
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('refund')}
                  className="text-white/85 hover:text-white hover:underline transition-colors"
                >
                  سياسة الاسترجاع
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-black text-white mb-4 text-base md:text-lg">تواصل معنا</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="mailto:info@motabe.sa"
                  className="flex items-center gap-2 text-white/85 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  البريد الإلكتروني
                </a>
              </li>
              <li>
                <a
                  href="tel:+966920000000"
                  className="flex items-center gap-2 text-white/85 hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  الهاتف
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com/motabe_sa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-white/85 hover:text-white transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                  تويتر / X
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment methods */}
        <div className="mt-10 pt-8 border-t border-white/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h5 className="text-base md:text-lg font-black text-white mb-3 tracking-wide">
                وسائل الدفع المتاحة
              </h5>
              <div className="flex flex-wrap items-center gap-2">
                <PaymentBadge label="مدى" icon={<MadaIcon />} />
                <PaymentBadge label="فيزا" icon={<VisaIcon />} />
                <PaymentBadge label="ماستر كارد" icon={<MasterCardIcon />} />
                <PaymentBadge label="سامسونج باي" icon={<SamsungPayIcon />} />
                <PaymentBadge label="أبل باي" icon={<ApplePayIcon />} />
              </div>
            </div>
            <p className="text-xs text-white/75 leading-relaxed">
              © {year} مؤسسة متابع التقنية — جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MarketingFooter;
