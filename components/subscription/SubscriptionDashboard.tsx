import React from 'react';
import { Calendar, ShieldCheck, Hourglass, ArrowUpCircle } from 'lucide-react';
import { SubscriptionInfo } from '../../types';
import { PACKAGE_NAMES } from './packages';

interface SubscriptionDashboardProps {
  subscription: SubscriptionInfo;
  onUpgrade: () => void;
}

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({ subscription, onUpgrade }) => {
  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining(subscription.endDate);
  const isExpired = daysRemaining < 0;

  const smsPercentage = ((10 - subscription.freeSmsRemaining) / 10) * 100;
  const waPercentage = ((50 - subscription.freeWaRemaining) / 50) * 100;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${subscription.isTrial ? 'text-[#655ac1]' : 'bg-green-100 text-green-600'}`}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {PACKAGE_NAMES[subscription.packageTier] || subscription.planName}
                {subscription.isTrial && <span className="text-sm text-[#655ac1] px-3 py-1 rounded-full mr-3 border border-[#e5e1fe]">فترة تجريبية مجانية</span>}
              </h2>
              <div className="flex items-center gap-4 mt-2 text-slate-500 font-medium text-sm">
                <span className="flex items-center gap-2"><Calendar size={16} /> الصلاحية: {subscription.startDate} إلى {subscription.endDate}</span>
              </div>
            </div>
          </div>
          
          <div className="text-center w-full md:w-auto bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 flex flex-col justify-center items-center min-w-[100px]">
            <div className="text-2xl font-black text-[#655ac1] mb-1">
              {isExpired ? '0' : daysRemaining}
            </div>
            <div className="text-[#8779fb] font-bold text-xs">
              {isExpired ? 'انتهى الاشتراك' : 
               daysRemaining === 1 ? 'يوم متبقي' : 
               daysRemaining === 2 ? 'يومان متبقيان' : 
               daysRemaining <= 10 ? 'أيام متبقية' : 
               'يوماً متبقياً'}
            </div>
          </div>
        </div>

        {subscription.isTrial && !isExpired && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <span className="font-bold text-slate-600 text-sm">المدة المتبقية للتجربة</span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 10 }).map((_, i) => {
                const remaining = Math.max(0, daysRemaining);
                const filled = i < remaining;
                return (
                  <div
                    key={i}
                    title={`اليوم ${i + 1}`}
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                      filled
                        ? 'bg-green-500 border-green-500 shadow-sm shadow-green-200'
                        : 'bg-slate-100 border-slate-200'
                    }`}
                  />
                );
              })}
              <span className="mr-2 text-xs font-black text-[#655ac1]">
                {Math.max(0, daysRemaining)} / 10 أيام
              </span>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 font-bold flex items-center gap-2">
            تم انتهاء صلاحية باقتك. يرجى الترقية للاستمرار في استخدام المنصة والأدوات.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upgrade Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group flex flex-col h-full">
           <div className="absolute top-0 right-0 w-24 h-24 bg-[#f3f0ff] rounded-bl-full -z-0 transition-transform group-hover:scale-110" />
           <div className="relative z-10 flex border-b border-slate-100 pb-4 mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                  <ArrowUpCircle size={24} className="text-[#8779fb]"/> 
                  الاشتراك والترقية
                </h3>
                <div className="mt-5 space-y-2">
                  <div className="flex items-start gap-2 text-slate-600 font-medium text-sm">
                    <span className="mt-0.5 shrink-0 text-[#8779fb]">✦</span>
                    <span>احصل على كافة المزايا والأدوات المتقدمة التي تسهل مهامك اليومية</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-600 font-medium text-sm">
                    <span className="mt-0.5 shrink-0 text-[#8779fb]">✦</span>
                    <span>يمكنك استعراض الباقات بالنقر على زر عرض الباقات أو الانتقال إلى تبويب الباقات</span>
                  </div>
                </div>
              </div>
           </div>
           
           <button onClick={onUpgrade} className="mt-auto w-full py-3 bg-[#8779fb] text-white rounded-xl font-bold hover:bg-[#6e5ee0] hover:scale-[1.02] transform transition-all shadow-md text-base relative z-10">
             عرض الباقات
           </button>
        </div>

        {/* Quotas Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="p-2 bg-amber-50 text-amber-500 rounded-xl shrink-0">
              <Hourglass size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">الاستهلاك والرصيد المجاني</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">نظرة عامة على استهلاكك من الرصيد المجاني</p>
            </div>
          </div>

          <div className="space-y-5 flex-1">
            <div>
              <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                <span>رسائل نصية (SMS) المستهلكة</span>
                <span className="text-blue-600">{10 - subscription.freeSmsRemaining} من 10</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${smsPercentage > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${smsPercentage}%` }}></div>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 font-medium">{subscription.freeSmsRemaining} رسالة متبقية</p>
            </div>

            <div>
              <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                <span>رسائل واتساب (WhatsApp) المستهلكة</span>
                <span className="text-green-600">{50 - subscription.freeWaRemaining} من 50</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${waPercentage > 80 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${waPercentage}%` }}></div>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 font-medium">{subscription.freeWaRemaining} رسالة متبقية</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDashboard;
