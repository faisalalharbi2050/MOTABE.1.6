import React from 'react';
import { Mail, Clock, Smartphone, Calendar, Sun } from 'lucide-react';

const WhatsAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const ContactChannels: React.FC = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/966500000000?text=مرحباً، أحتاج للمساعدة بخصوص منصة متابع', '_blank');
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
            <p className="text-xs text-[#8779fb] font-medium mt-0.5">للاستفسارات خارج أوقات العمل، يُرجى رفع تذكرة دعم وسيتم الرد عليك في أقرب وقت.</p>
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

        {/* واتساب */}
        <div className="bg-white rounded-2xl border border-slate-200 hover:shadow-md hover:border-green-200 transition-all group overflow-hidden">
          {/* المحتوى الأفقي */}
          <div className="flex items-center gap-4 p-5">
            <div className="w-14 h-14 flex items-center justify-center shrink-0">
              <WhatsAppIcon size={32} className="text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-slate-800 text-base mb-0.5">واتساب</h3>
              <p className="text-sm text-slate-500 font-medium mb-1.5">تواصل مباشرة مع فريق الدعم الفني</p>
              <div className="flex items-center gap-1.5 text-slate-500 font-bold text-sm">
                <Smartphone size={13} className="text-green-500 shrink-0" />
                <span dir="ltr" className="text-green-600 font-black">+966 50 000 0000</span>
              </div>
            </div>
          </div>
          {/* زر التواصل */}
          <div className="px-5 pb-5">
            <button
              onClick={handleWhatsApp}
              className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black hover:bg-green-500 hover:border-green-500 hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
            >
              <WhatsAppIcon size={16} className="text-green-500 group-hover/btn:text-white transition-colors" />
              تواصل عبر واتساب
            </button>
          </div>
        </div>

        {/* البريد الإلكتروني */}
        <div className="bg-white rounded-2xl border border-slate-200 hover:shadow-md hover:border-[#c4bef9] transition-all group overflow-hidden">
          {/* المحتوى الأفقي */}
          <div className="flex items-center gap-4 p-5">
            <div className="w-14 h-14 flex items-center justify-center shrink-0">
              <Mail size={30} className="text-[#655ac1]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-slate-800 text-base mb-0.5">البريد الإلكتروني</h3>
              <p className="text-sm text-slate-500 font-medium mb-1.5">أرسل استفسارك لفريق الدعم الفني</p>
              <div className="flex items-center gap-1.5 text-slate-500 font-bold text-sm">
                <Mail size={13} className="text-[#655ac1] shrink-0" />
                <span dir="ltr" className="text-[#655ac1] font-black">support@motabe.sa</span>
              </div>
            </div>
          </div>
          {/* زر التواصل */}
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
