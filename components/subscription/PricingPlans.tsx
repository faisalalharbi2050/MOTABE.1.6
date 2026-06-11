import React, { useState } from 'react';
import { PackageTier, PaymentPeriod, SubscriptionInfo } from '../../types';
import { FEATURE_GROUPS, BASIC_CARD_HIGHLIGHTS, PACKAGE_PRICING, PACKAGE_NAMES, PACKAGE_DESCRIPTIONS, calculateProRata } from './packages';
import PaymentModal from './PaymentModal';
import PlanFeaturesPage from './PlanFeaturesPage';
import { Sparkles, Crown, CheckCircle2, Check, ArrowLeft, ArrowUpRight, SaudiRiyal, AlertCircle, CalendarDays } from 'lucide-react';

interface PricingPlansProps {
  subscription: SubscriptionInfo;
  setSubscription: React.Dispatch<React.SetStateAction<SubscriptionInfo>>;
  onComplete: () => void;
}

const PricingPlans: React.FC<PricingPlansProps> = ({ subscription, setSubscription, onComplete }) => {
  const [period, setPeriod] = useState<PaymentPeriod>('semester');
  const [selectedPlan, setSelectedPlan] = useState<{tier: PackageTier, newPrice: number, finalPrice: number, remainingValue: number} | null>(null);
  const [featuresPlan, setFeaturesPlan] = useState<PackageTier | null>(null);

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

  // ⚠️ مؤقت للتجربة: يفتح أزرار الاشتراك/الدفع حتى لو كانت الباقة مفعّلة،
  // لاختبار تصميم بوابة الدفع. أعِده إلى false عند الاعتماد النهائي.
  const PREVIEW_UNLOCK = true;

  // Checkout is a standalone page (not a modal) — it replaces the current view.
  if (selectedPlan) {
    return (
      <PaymentModal
        planData={selectedPlan}
        period={period}
        subscription={subscription}
        setSubscription={setSubscription}
        onClose={() => setSelectedPlan(null)}
        onSuccess={onComplete}
      />
    );
  }

  // Full-features view replaces the cards grid (standalone page with a back button).
  if (featuresPlan) {
    return (
      <PlanFeaturesPage
        tier={featuresPlan}
        groups={FEATURE_GROUPS.filter(g =>
          featuresPlan === 'advanced' ? g.tier === 'advanced' : g.tier === 'basic'
        )}
        onBack={() => setFeaturesPlan(null)}
        onSubscribe={() => handleSelectPlan(featuresPlan)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col gap-5 mb-7">
          <div className="text-right">
            <h3 className="text-2xl font-black text-slate-800 mb-1.5">باقات متابع</h3>
            <p className="text-sm font-bold text-slate-500">
              اختر الباقة والمدة المناسبة
            </p>
          </div>

          {/* Period Toggle */}
          <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-2xl w-full max-w-4xl">
            {[
              { id: 'monthly', label: 'شهري' },
              { id: 'semester', label: 'فصل دراسي' },
              { id: 'yearly', label: 'سنة دراسية' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as PaymentPeriod)}
                className={`flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-black transition-all ${
                  period === p.id 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          {/* Duration Notice */}
          {(() => {
            const durationMap: Record<PaymentPeriod, { text: string; days: string }> = {
              monthly:  { text: 'مدة الاشتراك الشهري',         days: '30'  },
              semester: { text: 'مدة الاشتراك للفصل الدراسي',  days: '90'  },
              yearly:   { text: 'مدة الاشتراك للسنة الدراسية', days: '365' },
            };
            const { text, days } = durationMap[period];
            return (
              <div className="flex w-full max-w-4xl items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-right">
                <div className="flex shrink-0 items-center justify-center text-[#655ac1]">
                  <CalendarDays size={18} strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-black text-slate-800">
                    <span>{text}</span>
                    <span className="text-[#655ac1]">{days} يومًا</span>
                  </div>
                  <p className="mt-0.5 text-xs font-bold text-slate-400">تبدأ من تاريخ الاشتراك</p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {TIERS.map((tier) => {
             const price = PACKAGE_PRICING[tier][period];
             const isCurrent = subscription.packageTier === tier && !subscription.isTrial;
             const isAdvanced = tier === 'advanced';
             const isDowngradeUnavailable = !subscription.isTrial && subscription.packageTier === 'advanced' && tier === 'basic';
             const isUpgrade = !subscription.isTrial && subscription.packageTier === 'basic' && tier === 'advanced';
             return (
               <div
                 key={tier}
                 className={`bg-white border rounded-[2rem] p-6 text-center transition-all group flex flex-col relative overflow-hidden ${
                   isCurrent
                     ? 'border-slate-300 shadow-lg shadow-slate-200/70 -translate-y-0.5'
                     : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-lg'
                 }`}
               >
                 <div className="relative z-10 flex-1 flex flex-col">

                    {/* ── Badge slot: fixed height keeps cards aligned ── */}
                    <div className="h-7 flex items-center justify-center mb-4">
                      {isAdvanced ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-gradient-to-l from-[#655ac1] to-[#8779fb] text-white text-xs font-black rounded-full shadow-sm shadow-indigo-200">
                          <Sparkles size={12} className="fill-white" /> قريبًا
                        </span>
                      ) : isCurrent ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#655ac1] text-white text-xs font-black rounded-full shadow-sm shadow-indigo-200">
                          <CheckCircle2 size={15} strokeWidth={2.5} /> الباقة الحالية
                        </span>
                      ) : null}
                    </div>

                    <h4 className="text-2xl font-black text-slate-800 mb-2">{PACKAGE_NAMES[tier]}</h4>

                    <div className="flex justify-center items-center gap-1.5 mb-4">
                      <span className="text-4xl font-black text-[#655ac1]">{price}</span>
                      <SaudiRiyal className="w-6 h-6 text-[#655ac1]" strokeWidth={2.5} />
                    </div>

                    {/* Short package description */}
                    <p className="text-[13px] font-bold text-slate-500 leading-relaxed mb-5 px-2">
                      {PACKAGE_DESCRIPTIONS[tier]}
                    </p>

                    {/* Divider between header and features */}
                    <div className="h-px bg-slate-200 mb-5" />

                    <div className="text-right flex-1 transition-colors mb-5 flex flex-col">
                      {isAdvanced && (
                        <div className="mb-4 flex items-center gap-2 px-1">
                          <Crown size={16} className="text-slate-900 shrink-0" strokeWidth={2.2} />
                          <p className="text-sm font-black text-slate-900 leading-snug">
                            كل مزايا الباقة الأساسية +
                          </p>
                        </div>
                      )}

                      {(() => {
                        // Light view (global style): a flat, benefit-led checklist.
                        // Basic uses a curated highlight list; advanced derives from
                        // its (future) feature groups. Full details live in the page.
                        const lines = isAdvanced
                          ? FEATURE_GROUPS.filter(g => g.tier === 'advanced').map(g => g.cardLine)
                          : BASIC_CARD_HIGHLIGHTS;

                        return (
                          <div className="flex flex-col gap-3 flex-1">
                            {lines.map((line, i) => (
                              <div key={i} className="flex items-start gap-2.5">
                                <div className="mt-0.5 w-[18px] h-[18px] rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/30 shrink-0">
                                  <Check size={11} strokeWidth={3.5} className="text-white" />
                                </div>
                                <span className="text-[13px] font-bold text-slate-700 leading-snug">{line}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Actions: view all features link + subscribe */}
                    <div className="space-y-4">
                      <button
                        onClick={() => setFeaturesPlan(tier)}
                        className="w-full flex items-center justify-center gap-1.5 text-sm font-black text-[#655ac1] hover:opacity-80 transition-opacity"
                      >
                        عرض كل المزايا <ArrowUpRight size={16} strokeWidth={2.5} />
                      </button>

                      {(() => {
                        const showCurrent = isCurrent && !PREVIEW_UNLOCK;
                        const showLockedDown = isDowngradeUnavailable && !PREVIEW_UNLOCK;
                        const locked = showCurrent || showLockedDown;
                        return (
                          <button
                            onClick={() => handleSelectPlan(tier)}
                            disabled={locked}
                            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-base transition-all ${
                              showCurrent
                                ? 'bg-[#f3f0ff] border border-[#e5e1fe] text-[#655ac1] cursor-default'
                                : showLockedDown
                                ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-[#655ac1] text-white shadow-lg shadow-indigo-200 hover:opacity-90 hover:shadow-xl active:scale-[0.99]'
                            }`}
                          >
                            {showCurrent ? (
                              <><CheckCircle2 size={18} /> باقتك الحالية</>
                            ) : showLockedDown ? (
                              'غير متاح'
                            ) : (
                              <>{isUpgrade ? 'ترقية الآن' : 'اشترك الآن'} <ArrowLeft size={18} strokeWidth={2.5} /></>
                            )}
                          </button>
                        );
                      })()}
                    </div>
                 </div>
               </div>
             );
          })}
        </div>

        {/* Messaging-credit notice — shown once under the cards */}
        <div className="mt-5 flex justify-start">
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 px-3.5 py-2 text-right">
            <AlertCircle size={16} strokeWidth={2.4} className="shrink-0 text-amber-500" />
            <p className="text-xs font-black leading-relaxed text-amber-700">
              قيمة اشتراك الرسائل منفصلة عن قيمة الباقة
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PricingPlans;
