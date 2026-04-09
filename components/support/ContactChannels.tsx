import React from 'react';
import { Clock, Calendar, Sun } from 'lucide-react';

const ContactChannels: React.FC = () => {
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

    </div>
  );
};

export default ContactChannels;
