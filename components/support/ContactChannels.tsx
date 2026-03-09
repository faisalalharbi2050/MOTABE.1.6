import React from 'react';
import { MessageCircle, Mail, Clock, Phone } from 'lucide-react';

const ContactChannels: React.FC = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/966500000000?text=مرحباً، أحتاج للمساعدة بخصوص منصة متابع', '_blank');
  };

  const handleEmail = () => {
    window.location.href = 'mailto:support@motabe.sa?subject=طلب دعم فني - منصة متابع';
  };

  return (
    <div className="space-y-6">
      {/* Main Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* WhatsApp Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500" />
          <div className="relative z-10">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MessageCircle size={28} className="text-green-600" />
            </div>
            <h3 className="font-black text-slate-800 text-lg mb-1">واتساب</h3>
            <p className="text-sm text-slate-500 font-medium mb-4">
              تواصل مباشر مع فريق الدعم الفني عبر واتساب للحصول على مساعدة فورية.
            </p>
            <div className="flex items-center gap-2 text-slate-600 font-bold text-sm mb-5">
              <Phone size={16} className="text-green-600" />
              <span dir="ltr">+966 50 000 0000</span>
            </div>
            <button
              onClick={handleWhatsApp}
              className="w-full py-3 bg-green-500 text-white rounded-xl font-black hover:bg-green-600 hover:scale-[1.02] transition-all shadow-sm shadow-green-100 flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} />
              تواصل عبر واتساب
            </button>
          </div>
        </div>

        {/* Email Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#f0eeff] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500" />
          <div className="relative z-10">
            <div className="w-14 h-14 bg-[#f0eeff] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Mail size={28} className="text-[#655ac1]" />
            </div>
            <h3 className="font-black text-slate-800 text-lg mb-1">البريد الإلكتروني</h3>
            <p className="text-sm text-slate-500 font-medium mb-4">
              أرسل استفسارك بالتفصيل وسيتم الرد خلال أوقات العمل الرسمية.
            </p>
            <div className="flex items-center gap-2 text-slate-600 font-bold text-sm mb-5">
              <Mail size={16} className="text-[#655ac1]" />
              <span dir="ltr">support@motabe.sa</span>
            </div>
            <button
              onClick={handleEmail}
              className="w-full py-3 bg-[#655ac1] text-white rounded-xl font-black hover:bg-[#52499d] hover:scale-[1.02] transition-all shadow-sm shadow-indigo-100 flex items-center justify-center gap-2"
            >
              <Mail size={18} />
              مراسلة عبر البريد
            </button>
          </div>
        </div>
      </div>

      {/* Working Hours Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <Clock size={22} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base">أوقات دوام فريق الدعم</h3>
            <p className="text-xs text-slate-500 font-medium">خارج أوقات العمل يمكنك رفع تذكرة أو مراسلة المساعد الذكي</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <p className="text-xs font-bold text-amber-600 mb-2 uppercase tracking-wider">أيام العمل</p>
            <p className="font-black text-slate-800 text-lg">الأحد — الخميس</p>
            <p className="text-sm text-slate-500 font-medium mt-1">باستثناء الإجازات الرسمية</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wider">ساعات العمل</p>
            <p className="font-black text-slate-800 text-lg" dir="ltr">8:00 ص — 2:30 م</p>
            <p className="text-sm text-slate-500 font-medium mt-1">بتوقيت المملكة العربية السعودية</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0 animate-pulse" />
          <p className="text-sm text-slate-600 font-medium">
            يتم الرد على التذاكر المرسلة خارج أوقات العمل في أول يوم عمل تالٍ. نشكرك على تفهمك.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactChannels;
