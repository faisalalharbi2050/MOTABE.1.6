import React from 'react';
import { Calendar, ShieldCheck, Zap, ArrowUpCircle } from 'lucide-react';
import { useToast } from '../ui/ToastProvider';
import { SubscriptionInfo } from '../../types';
import { PACKAGE_NAMES } from './packages';

interface SubscriptionDashboardProps {
  subscription: SubscriptionInfo;
  setSubscription: React.Dispatch<React.SetStateAction<SubscriptionInfo>>;
  onUpgrade: () => void;
}

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({ subscription, setSubscription, onUpgrade }) => {
  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining(subscription.endDate);
  const isExpired = daysRemaining < 0;

  const { showToast } = useToast();

  const toggleAutoRenew = () => {
    const next = !subscription.autoRenew;
    setSubscription(prev => ({ ...prev, autoRenew: next }));
    showToast(
      next ? 'تم تفعيل التجديد التلقائي للاشتراك ✓' : 'تم إيقاف التجديد التلقائي للاشتراك',
      next ? 'success' : 'warning'
    );
  };

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
                        ? 'bg-[#8779fb] border-[#8779fb] shadow-sm shadow-[#8779fb]/30'
                        : 'bg-slate-100 border-slate-200'
                    }`}
                  />
                );
              })}
              <span className="mr-2 text-xs font-black text-[#655ac1] bg-[#f4f3ff] px-2.5 py-1 rounded-full border border-[#e5e1fe]">
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
        <div className="bg-[#8779fb] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden group flex flex-col h-full">
           <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 blur-sm mix-blend-overlay"></div>
           <div className="relative z-10 flex border-b border-indigo-400/30 pb-4 mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                  <ArrowUpCircle size={24}/> 
                  الاشتراك والترقية
                </h3>
                <div className="mt-5 space-y-2">
                  <div className="flex items-start gap-2 text-indigo-50 font-medium text-sm">
                    <span className="mt-0.5 shrink-0">✦</span>
                    <span>احصل على كافة المزايا والأدوات المتقدمة التي تسهل مهامك اليومية</span>
                  </div>
                  <div className="flex items-start gap-2 text-indigo-50 font-medium text-sm">
                    <span className="mt-0.5 shrink-0">✦</span>
                    <span>يمكنك استعراض الباقات بالنقر على زر عرض الباقات أو الانتقال إلى تبويب الباقات</span>
                  </div>
                </div>
              </div>
           </div>
           
           <button onClick={onUpgrade} className="mt-auto w-full py-3 bg-white text-[#655ac1] rounded-xl font-bold hover:bg-slate-50 hover:scale-[1.02] transform transition-all shadow-md text-base relative z-10">
             عرض الباقات
           </button>
        </div>

        {/* Quotas & Auto-Renew Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">إدارة التجديد التلقائي</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">يمكنك من تفعيل أو تعطيل تجديد الاشتراك التلقائي</p>
            </div>
            <button 
              onClick={toggleAutoRenew}
              className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${subscription.autoRenew ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${subscription.autoRenew ? '-translate-x-5' : 'translate-x-0'}`}></div>
            </button>
          </div>

          <div>
             <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><Zap size={20} className="text-yellow-500" /> الاستهلاك (الرصيد المجاني الأول)</h3>
             
             <div className="mb-4">
               <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                 <span>رسائل نصية (SMS) المستهلكة</span>
                 <span>{10 - subscription.freeSmsRemaining} من 10</span>
               </div>
               <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                 <div className={`h-full transition-all ${smsPercentage > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${smsPercentage}%` }}></div>
               </div>
             </div>

             <div>
               <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                 <span>رسائل واتساب (WhatsApp) المستهلكة</span>
                 <span>{50 - subscription.freeWaRemaining} من 50</span>
               </div>
               <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                 <div className={`h-full transition-all ${waPercentage > 80 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${waPercentage}%` }}></div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDashboard;
