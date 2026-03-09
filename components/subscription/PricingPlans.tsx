import React, { useState } from 'react';
import { PackageTier, PaymentPeriod, SubscriptionInfo } from '../../types';
import { PACKAGE_FEATURES, PACKAGE_PRICING, PACKAGE_NAMES, calculateProRata } from './packages';
import PaymentModal from './PaymentModal';
import { Check, X, Shield, Star, Crown, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface PricingPlansProps {
  subscription: SubscriptionInfo;
  setSubscription: React.Dispatch<React.SetStateAction<SubscriptionInfo>>;
  onComplete: () => void;
}

const PricingPlans: React.FC<PricingPlansProps> = ({ subscription, setSubscription, onComplete }) => {
  const [period, setPeriod] = useState<PaymentPeriod>('semester');
  const [selectedPlan, setSelectedPlan] = useState<{tier: PackageTier, newPrice: number, finalPrice: number, remainingValue: number} | null>(null);
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({});

  const toggleFeatures = (tier: string) => {
    setExpandedTiers(prev => ({ ...prev, [tier]: !prev[tier] }));
  };

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
      bgIcon: 'bg-white text-[#8779fb] shadow-sm border border-[#e5e1fe]',
      btnDefault: 'bg-white border-2 border-[#e5e1fe] text-[#8779fb]',
      btnHover: 'hover:border-[#8779fb] hover:bg-[#8779fb] hover:text-white group-hover:border-[#8779fb] group-hover:bg-[#8779fb] group-hover:text-white',
      icon: Shield
    },
    advanced: {
      bgLight: 'bg-[#f3f0ff]',
      textMain: 'text-[#6e5ee0]',
      bgIcon: 'bg-white text-[#8779fb] shadow-sm border border-[#e5e1fe]',
      btnDefault: 'bg-white border-2 border-[#e5e1fe] text-[#8779fb]',
      btnHover: 'hover:border-[#8779fb] hover:bg-[#8779fb] hover:text-white group-hover:border-[#8779fb] group-hover:bg-[#8779fb] group-hover:text-white',
      icon: Star
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center mb-6">
          <h3 className="text-xl font-black text-slate-800 mb-2">باقات الاشتراك</h3>
          <p className="text-sm font-bold text-slate-600 flex items-center justify-center gap-2">
            <Sparkles size={20} className="text-yellow-500 fill-yellow-500/20" />
            اختر الباقة التي تناسبك واستمتع بتجربة مجانية لمدة 10 أيام
            <Sparkles size={20} className="text-yellow-500 fill-yellow-500/20" />
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

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {TIERS.map((tier) => {
             const price = PACKAGE_PRICING[tier][period];
             const isCurrent = subscription.packageTier === tier && !subscription.isTrial;
             const isAdvanced = tier === 'advanced';
             const styles = packageStyles[tier as keyof typeof packageStyles];
             const Icon = styles.icon;
             
             return (
               <div 
                 key={tier} 
                 className="bg-white border-2 border-slate-100 hover:border-slate-300 rounded-2xl p-6 text-center shadow-sm hover:shadow-xl transition-all group flex flex-col relative overflow-hidden"
               >
                 <div className={`absolute top-0 right-0 w-24 h-24 ${styles.bgLight} rounded-bl-full -z-0 transition-transform group-hover:scale-110`} />
                 
                 {isAdvanced && (
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#8779fb] text-white px-4 py-1.5 rounded-b-xl text-xs font-bold shadow-md">
                     الأكثر طلباً
                   </div>
                 )}
                 {isCurrent && (
                   <div className="absolute top-0 left-8 bg-green-500 text-white px-4 py-1.5 rounded-b-xl text-xs font-bold shadow-md">
                     الباقة الحالية
                   </div>
                 )}

                 <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex justify-center mb-3 mt-2">
                      <div className={`w-14 h-14 rounded-2xl ${styles.bgLight} flex items-center justify-center text-[#8779fb]`}>
                         <Icon size={28} />
                      </div>
                    </div>

                    <h4 className="text-2xl font-black text-slate-800 mb-2">{PACKAGE_NAMES[tier]}</h4>
                    
                    <div className="flex justify-center items-end gap-1 mb-6">
                      <span className={`text-4xl font-black ${styles.textMain}`}>{price}</span>
                      <span className="text-sm font-bold text-slate-400 mb-1.5">ريال</span>
                    </div>
                    
                    <div className="space-y-3 text-right flex-1 bg-slate-50 rounded-2xl p-5 border border-slate-100 group-hover:bg-white transition-colors mb-6 flex flex-col">
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
                          const included = feat.includedIn.includes(tier);
                          if (!included && !isAdvanced) return false;
                          if (isAdvanced && feat.includedIn.includes('basic')) return false;
                          return included;
                        });
                        
                        const isExpanded = expandedTiers[tier];
                        const initialCount = isAdvanced ? 4 : 6;
                        const displayedFeatures = isExpanded ? tierFeatures : tierFeatures.slice(0, initialCount);

                        return (
                          <div className="flex flex-col flex-1">
                            <div className="space-y-3">
                              {displayedFeatures.map((feat, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-slate-700 animate-fade-in">
                                  <div className="mt-0.5 p-0.5 rounded-full bg-indigo-50 text-[#8779fb]">
                                    <Check size={14} strokeWidth={3} />
                                  </div>
                                  <span className="font-bold text-sm leading-relaxed">{feat.name}</span>
                                </div>
                              ))}
                            </div>
                            
                            {tierFeatures.length > initialCount && (
                              <button 
                                onClick={() => toggleFeatures(tier)}
                                className="mt-auto pt-3 w-full flex items-center justify-center gap-1 text-xs font-bold text-[#8779fb] hover:text-[#52499d] transition-colors py-2 bg-indigo-50/50 hover:bg-indigo-50 rounded-lg"
                              >
                                {isExpanded ? (
                                  <>إخفاء المزايا <ChevronUp size={14} /></>
                                ) : (
                                  <>استعراض كامل المزايا <ChevronDown size={14} /></>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    
                    <button
                      onClick={() => handleSelectPlan(tier)}
                      disabled={isCurrent}
                      className={`w-full py-3.5 rounded-xl font-black text-lg transition-all shadow-sm ${
                        isCurrent
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : `${styles.btnDefault} ${styles.btnHover}`
                      }`}
                    >
                      {isCurrent ? 'باقتك الحالية' : 'اشتراك'}
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
