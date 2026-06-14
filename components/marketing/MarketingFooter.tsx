import React from 'react';
import { Twitter, Mail, Phone, MapPin } from 'lucide-react';
import { MarketingRoute } from './MarketingApp';

interface Props {
  onNavigate: (r: MarketingRoute) => void;
}

const PaymentBadge: React.FC<{ label: string; icon: React.ReactNode }> = ({ label, icon }) => (
  <div
    className="px-3.5 h-10 min-w-[64px] rounded-lg bg-white flex items-center justify-center shadow-sm border border-white/40"
    title={label}
    aria-label={label}
  >
    {icon}
  </div>
);

const MadaIcon = () => (
  <svg viewBox="0 0 78 24" className="h-4 w-auto" role="img" aria-label="مدى" xmlns="http://www.w3.org/2000/svg">
    <text x="39" y="19" textAnchor="middle" direction="ltr" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="22" fill="#84BD00" letterSpacing="0.3">mada</text>
  </svg>
);
const VisaIcon = () => (
  <svg viewBox="0 0 64 22" className="h-4 w-auto" role="img" aria-label="فيزا" xmlns="http://www.w3.org/2000/svg">
    <text x="32" y="18" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontStyle="italic" fontWeight="800" fontSize="22" fill="#1434CB" letterSpacing="0.5">VISA</text>
  </svg>
);
const MasterCardIcon = () => (
  <svg viewBox="0 0 40 24" className="h-5 w-auto" role="img" aria-label="ماستر كارد" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="12" r="9" fill="#EB001B" />
    <circle cx="25" cy="12" r="9" fill="#F79E1B" />
    <path fill="#FF5F00" d="M20 5.4a9 9 0 0 0 0 13.2 9 9 0 0 0 0-13.2Z" />
  </svg>
);
const ApplePayIcon = () => (
  <svg viewBox="0 0 56 24" className="h-4 w-auto" role="img" aria-label="أبل باي" xmlns="http://www.w3.org/2000/svg">
    <path fill="#000" transform="translate(1,1) scale(0.92)" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.611 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    <text x="26" y="17" direction="ltr" textAnchor="start" fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize="15" fill="#000">Pay</text>
  </svg>
);
const SamsungPayIcon = () => (
  <svg viewBox="0 0 122 22" className="h-3.5 w-auto" role="img" aria-label="سامسونج باي" xmlns="http://www.w3.org/2000/svg">
    <text x="61" y="17" textAnchor="middle" direction="ltr" fontFamily="Arial, Helvetica, sans-serif" fontSize="16" fill="#1428A0" letterSpacing="0.3">
      <tspan fontWeight="800">Samsung</tspan><tspan fontWeight="500"> Pay</tspan>
    </text>
  </svg>
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
            <div className="flex items-center mb-4">
              <img
                src="/logo-white.png"
                alt="متابع"
                className="h-11 w-auto select-none"
                draggable={false}
              />
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
                <span className="flex items-center gap-2 text-white/85 whitespace-nowrap">
                  <MapPin className="w-4 h-4 shrink-0" />
                  المملكة العربية السعودية
                </span>
              </li>
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
