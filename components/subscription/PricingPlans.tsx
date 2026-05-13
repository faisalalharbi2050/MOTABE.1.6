import React, { useState } from 'react';
import { PackageTier, PaymentPeriod, SubscriptionInfo } from '../../types';
import { PACKAGE_FEATURES, PACKAGE_PRICING, PACKAGE_NAMES, calculateProRata } from './packages';
import PaymentModal from './PaymentModal';
import { AlertCircle, Check, Star, Crown, CheckCircle2 } from 'lucide-react';

interface PricingPlansProps {
  subscription: SubscriptionInfo;
  setSubscription: React.Dispatch<React.SetStateAction<SubscriptionInfo>>;
  onComplete: () => void;
}

const PricingPlans: React.FC<PricingPlansProps> = ({ subscription, setSubscription, onComplete }) => {
  const [period, setPeriod] = useState<PaymentPeriod>('semester');
  const [selectedPlan, setSelectedPlan] = useState<{tier: PackageTier, newPrice: number, finalPrice: number, remainingValue: number} | null>(null);

  const getDaysRemaining = (endDate: string) => {
    const diffTime = new Date(endDate).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleSelectPlan = (tier: PackageTier) => {
    const daysRemaining = getDaysRemaining(subscription.endDate);
    const isExpired = daysRemaining <= 0;
    
    // Pro-rata Calculation
    const proRata = calculateProRata(
      subscription.packageTier,
      isExpired ? 'trial' : (subscription.isTrial ? 'trial' : 'semester'), // Assuming active period type if not stored, wait, let's keep it simple: if trial, no pro-rata cost. If expired, no pro-rata.
      isExpired ? 0 : daysRemaining,
      tier,
      period
    );

    setSelectedPlan({
      tier,
      newPrice: proRata.newPrice,
      finalPrice: proRata.finalPrice,
      remainingValue: proRata.remainingValue
    });
  };

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
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center mb-6">
          <h3 className="text-xl font-black text-slate-800 mb-2">باقات متابع</h3>
          <p className="text-sm font-bold text-slate-600">
            اختر الباقة والمدة التي تناسبك
          </p>
        </div>

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
            monthly:  { label: 'الشهري',        days: '30'  },
            semester: { label: 'الفصل الدراسي', days: '90'  },
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
             const isCurrent = subscription.packageTier === tier && !subscription.isTrial;
             const isAdvanced = tier === 'advanced';
             const isDowngradeUnavailable = !subscription.isTrial && subscription.packageTier === 'advanced' && tier === 'basic';
             const isUpgrade = !subscription.isTrial && subscription.packageTier === 'basic' && tier === 'advanced';
             const styles = packageStyles[tier as keyof typeof packageStyles];
             
             return (
               <div
                 key={tier}
                 className={`bg-white border-2 rounded-2xl p-6 text-center shadow-sm hover:shadow-xl transition-all group flex flex-col relative overflow-hidden ${
                   isCurrent  ? 'border-[#655ac1] shadow-indigo-100' :
                   'border-slate-100 hover:border-slate-300'
                 }`}
               >
                 <div className={`absolute top-0 right-0 w-24 h-24 ${styles.bgLight} rounded-bl-full -z-0 transition-transform group-hover:scale-110`} />

                 <div className="relative z-10 flex-1 flex flex-col">

                    {/* ── Badge slot: fixed height keeps cards aligned ── */}
                    <div className="h-7 flex items-center justify-center mb-4">
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#655ac1] text-white text-xs font-black rounded-full shadow-sm shadow-indigo-200">
                          <CheckCircle2 size={12} /> الباقة الحالية
                        </span>
                      )}
                      {isAdvanced && !isCurrent && (
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
                          if (feat === PACKAGE_FEATURES[22]) return false;
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
                            </div>
                              <div className="mt-4 pt-3 border-t border-slate-200">
                                <div className="flex items-center justify-center gap-1.5 w-full px-2 py-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 font-black whitespace-nowrap" style={{ fontSize: 'clamp(9px, 2.4vw, 12px)' }}>
                                  <AlertCircle size={13} strokeWidth={2.5} className="shrink-0" />
                                  <span>قيمة اشتراك الرسائل منفصلة عن قيمة الباقة</span>
                                </div>
                              </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                    <button
                      onClick={() => handleSelectPlan(tier)}
                      disabled={isCurrent || isDowngradeUnavailable}
                      className={`w-full py-3.5 rounded-xl font-black text-lg transition-all shadow-sm ${
                        isCurrent
                        ? 'bg-[#655ac1] border-2 border-[#655ac1] text-white cursor-not-allowed shadow-sm shadow-indigo-200'
                        : isDowngradeUnavailable
                        ? 'bg-slate-100 border-2 border-slate-200 text-slate-400 cursor-not-allowed'
                        : `${styles.btnDefault} ${styles.btnHover}`
                      }`}
                    >
                      {isCurrent ? 'باقتك الحالية' : isDowngradeUnavailable ? 'غير متاح' : isUpgrade ? 'ترقية' : 'اشتراك'}
                    </button>
                 </div>
               </div>
             );
          })}
        </div>

      </div>

      {selectedPlan && (
        <PaymentModal 
          planData={selectedPlan} 
          period={period} 
          subscription={subscription}
          setSubscription={setSubscription}
          onClose={() => setSelectedPlan(null)} 
          onSuccess={onComplete}
        />
      )}
    </div>
  );
};

export default PricingPlans;
