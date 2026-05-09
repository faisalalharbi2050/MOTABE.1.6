import React from 'react';
import { MessageCircle, Twitter, Mail, Phone } from 'lucide-react';
import { MarketingRoute } from './MarketingApp';

interface Props {
  onNavigate: (r: MarketingRoute) => void;
}

const PaymentBadge: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-3 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
    {label}
  </div>
);

const MarketingFooter: React.FC<Props> = ({ onNavigate }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 border-t border-slate-200" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#655ac1] to-[#8779fb] flex items-center justify-center text-white font-black shadow-md">
                م
              </div>
              <span className="font-black text-lg text-slate-800">متابع</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              مؤسسة متابع التقنية — منصة متكاملة لإدارة جداول المدارس والمناوبات والإشراف اليومي والرسائل.
            </p>
            <p className="text-xs text-slate-500">
              سجل تجاري رقم: <span className="font-bold text-slate-700">10101010101</span>
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-bold text-slate-800 mb-4 text-sm">روابط سريعة</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('landing')}
                  className="text-slate-600 hover:text-[#655ac1] transition-colors"
                >
                  الرئيسية
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('login')}
                  className="text-slate-600 hover:text-[#655ac1] transition-colors"
                >
                  تسجيل الدخول
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('register')}
                  className="text-slate-600 hover:text-[#655ac1] transition-colors"
                >
                  حساب جديد
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="text-slate-600 hover:text-[#655ac1] transition-colors"
                >
                  تواصل معنا
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-slate-800 mb-4 text-sm">الدعم القانوني</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('faq')}
                  className="text-slate-600 hover:text-[#655ac1] transition-colors"
                >
                  الأسئلة الشائعة
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('privacy')}
                  className="text-slate-600 hover:text-[#655ac1] transition-colors"
                >
                  سياسة الخصوصية
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('terms')}
                  className="text-slate-600 hover:text-[#655ac1] transition-colors"
                >
                  الشروط والأحكام
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('refund')}
                  className="text-slate-600 hover:text-[#655ac1] transition-colors"
                >
                  سياسة الاسترجاع
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-slate-800 mb-4 text-sm">تواصل معنا</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="https://wa.me/966500000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-600 hover:text-[#655ac1] transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  واتساب
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com/motabe_sa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-600 hover:text-[#655ac1] transition-colors"
                >
                  <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                  تويتر / X
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@motabe.sa"
                  className="flex items-center gap-2 text-slate-600 hover:text-[#655ac1] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#655ac1]" />
                  info@motabe.sa
                </a>
              </li>
              <li>
                <a
                  href="tel:+966920000000"
                  className="flex items-center gap-2 text-slate-600 hover:text-[#655ac1] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#655ac1]" />
                  920000000
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment methods */}
        <div className="mt-10 pt-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h5 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                وسائل الدفع المتاحة
              </h5>
              <div className="flex flex-wrap items-center gap-2">
                <PaymentBadge label="مدى" />
                <PaymentBadge label="VISA" />
                <PaymentBadge label="MasterCard" />
                <PaymentBadge label="Apple Pay" />
                <PaymentBadge label="Samsung Pay" />
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              © {year} مؤسسة متابع التقنية — جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MarketingFooter;
