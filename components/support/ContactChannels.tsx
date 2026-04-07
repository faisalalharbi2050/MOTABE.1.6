import React from 'react';
import { Mail, Clock, Smartphone, Calendar, Sun, Phone, PhoneCall } from 'lucide-react';

const ContactChannels: React.FC = () => {
  const handlePhone = () => {
    window.location.href = 'tel:+966500000000';
  };

  const handleEmail = () => {
    window.location.href = 'mailto:support@motabe.sa?subject=طلب دعم فني - منصة متابع';
  };

  return (
    <div className="space-y-6">

      {/* ── أوقات العمل ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
          <Clock size={22} className="text-[#655ac1] shrink-0" />
          <div>
            <h3 className="font-black text-slate-800 text-base">أوقات العمل لفريق الدعم الفني</h3>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {/* أيام العمل */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-3">
              <Calendar size={16} className="text-[#655ac1] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#8779fb] mb-1">أيام العمل</p>
                <p className="font-black text-slate-800 text-sm">الأحد — الخميس</p>
              </div>
            </div>
            {/* ساعات العمل */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-3">
              <Clock size={16} className="text-[#655ac1] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#8779fb] mb-1">ساعات العمل</p>
                <p className="font-black text-slate-800 text-sm">8:00 ص — 2:30 م</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">بتوقيت مكة المكرمة</p>
              </div>
            </div>
            {/* أيام الإجازة */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-3">
              <Sun size={16} className="text-[#655ac1] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#8779fb] mb-1">أيام الإجازة</p>
                <p className="font-black text-slate-800 text-sm">الجمعة — السبت</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── قنوات التواصل ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* الهاتف */}
        <div className="bg-white rounded-2xl border border-slate-200 hover:shadow-md hover:border-[#c4bef9] transition-all group overflow-hidden">
          <div className="flex items-center gap-4 p-5">
            <div className="w-14 h-14 flex items-center justify-center shrink-0">
              <PhoneCall size={30} className="text-[#655ac1]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-slate-800 text-base mb-0.5">الهاتف</h3>
              <div className="flex items-center gap-1.5 text-slate-500 font-bold text-sm">
                <Smartphone size={13} className="text-[#655ac1] shrink-0" />
                <span dir="ltr" className="text-[#655ac1] font-black">+966 50 000 0000</span>
              </div>
            </div>
          </div>
          <div className="px-5 pb-5">
            <button
              onClick={handlePhone}
              className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
            >
              <Phone size={16} className="text-[#655ac1] group-hover/btn:text-white transition-colors" />
              اتصل بنا
            </button>
          </div>
        </div>

        {/* البريد الإلكتروني */}
        <div className="bg-white rounded-2xl border border-slate-200 hover:shadow-md hover:border-[#c4bef9] transition-all group overflow-hidden">
          <div className="flex items-center gap-4 p-5">
            <div className="w-14 h-14 flex items-center justify-center shrink-0">
              <Mail size={30} className="text-[#655ac1]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-slate-800 text-base mb-0.5">البريد الإلكتروني</h3>
              <div className="flex items-center gap-1.5 text-slate-500 font-bold text-sm">
                <Mail size={13} className="text-[#655ac1] shrink-0" />
                <span dir="ltr" className="text-[#655ac1] font-black">support@motabe.sa</span>
              </div>
            </div>
          </div>
          <div className="px-5 pb-5">
            <button
              onClick={handleEmail}
              className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
            >
              <Mail size={16} className="text-[#655ac1] group-hover/btn:text-white transition-colors" />
              تواصل عبر البريد الإلكتروني
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ContactChannels;
