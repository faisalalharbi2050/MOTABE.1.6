import React, { useState } from 'react';
import { ArrowLeft, CreditCard, FileText, LayoutDashboard, MessageSquare, SaudiRiyal, ShoppingCart } from 'lucide-react';
import SubscriptionDashboard from './SubscriptionDashboard';
import PricingPlans from './PricingPlans';
import InvoiceList from './InvoiceList';
import MessageSubscriptions from '../messaging/MessageSubscriptions';
import { SubscriptionInfo } from '../../types';
import { SubscriptionCart } from './cartTypes';
import SubscriptionCartReview from './SubscriptionCartReview';

interface SubscriptionContainerProps {
  subscription: SubscriptionInfo;
  setSubscription: React.Dispatch<React.SetStateAction<SubscriptionInfo>>;
  initialTab?: 'dashboard' | 'pricing' | 'message_packages' | 'invoices';
}

const SubscriptionContainer: React.FC<SubscriptionContainerProps> = ({ subscription, setSubscription, initialTab }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pricing' | 'message_packages' | 'cart' | 'invoices'>(initialTab || 'dashboard');
  const [cart, setCart] = useState<SubscriptionCart>({});

  const cartItemCount = (cart.plan ? 1 : 0) + (cart.messagePackage ? 1 : 0);
  const cartTotal = (cart.plan?.finalPrice ?? 0) + (cart.messagePackage?.price ?? 0);

  const tabs = [
    { id: 'dashboard',         label: 'الاشتراك الحالي',  hint: 'حالة باقتك وتجديدها',    icon: LayoutDashboard },
    { id: 'pricing',           label: 'باقات متابع',      hint: 'الباقات والأسعار',        icon: CreditCard      },
    { id: 'message_packages',  label: 'باقات الرسائل',    hint: 'رصيد وباقات الرسائل',     icon: MessageSquare   },
    { id: 'cart',              label: 'السلة',             hint: 'مراجعة الطلب والدفع',     icon: ShoppingCart    },
    { id: 'invoices',          label: 'الفواتير',          hint: 'سجل الفواتير والمدفوعات', icon: FileText        },
  ] as const;

  return (
    <div className="space-y-6 dir-rtl animate-fade-in max-w-[1400px] mx-auto">

      {/* Header Card */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
        <div className="relative z-10">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <CreditCard size={36} strokeWidth={1.8} className="text-[#655ac1]" />
            الاشتراك والفوترة
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12">
            إدارة ومتابعة حالة الاشتراك، يمكنك التجديد أو الترقية، واستعراض فواتيرك بكل يسر.
          </p>
        </div>
      </div>

      {/* Main Navigation — Stepper style (unified with the Messages section) */}
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-200">
        <div className="flex items-stretch gap-3 overflow-x-auto custom-scrollbar">
          {tabs.map((tab, i) => {
            const isActive = activeTab === tab.id;
            return (
              <React.Fragment key={tab.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="group min-w-[176px] flex-1 rounded-2xl px-1.5 text-right transition-all hover:bg-slate-50"
                >
                  <span className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-all ${
                    isActive
                      ? 'bg-[#655ac1] text-white shadow-sm shadow-[#655ac1]/20'
                      : 'text-slate-700'
                  }`}>
                    <span className="shrink-0">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                        isActive ? 'bg-white border-white' : 'bg-transparent border-slate-200 group-hover:border-[#655ac1]/30'
                      }`}>
                        <tab.icon size={17} className="text-[#655ac1]" />
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className={`block font-black text-sm leading-tight ${
                        isActive ? 'text-white' : 'text-slate-800'
                      }`}>
                        {tab.label}
                        {tab.id === 'cart' && cartItemCount > 0 && (
                          <span className={`mr-2 inline-flex min-w-5 h-5 items-center justify-center rounded-full px-1.5 text-[11px] ${
                            isActive ? 'bg-white text-[#655ac1]' : 'bg-[#655ac1] text-white'
                          }`}>
                            {cartItemCount}
                          </span>
                        )}
                      </span>
                      <span className={`block text-[11px] font-bold mt-0.5 truncate ${
                        isActive ? 'text-white/80' : 'text-slate-400'
                      }`}>
                        {tab.hint}
                      </span>
                    </span>
                  </span>
                </button>
                {i < tabs.length - 1 && (
                  <div className="flex items-center shrink-0" aria-hidden="true">
                    <span className="h-9 w-px rounded-full bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {cartItemCount > 0 && activeTab !== 'cart' && (
        <div className="bg-white rounded-2xl border border-[#e5e1fe] shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[#655ac1] flex items-center justify-center">
              <ShoppingCart size={19} strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-sm font-black text-slate-800">{cartItemCount} عنصر في السلة</p>
              <p className="text-xs font-bold text-slate-400">
                الإجمالي {cartTotal.toLocaleString()} <SaudiRiyal size={12} className="inline-block align-[-2px]" />
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('cart')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#655ac1] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition-all hover:opacity-90"
          >
            مراجعة الطلب
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'dashboard' && (
          <SubscriptionDashboard
            subscription={subscription}
            onOpenPricing={() => setActiveTab('pricing')}
            onOpenMessagePackages={() => setActiveTab('message_packages')}
          />
        )}
        {activeTab === 'pricing' && (
          <PricingPlans
            subscription={subscription}
            cartPlan={cart.plan}
            onAddToCart={(plan) => setCart(prev => ({ ...prev, plan }))}
          />
        )}
        {activeTab === 'message_packages' && (
          <MessageSubscriptions
            cartMessagePackage={cart.messagePackage}
            onAddToCart={(messagePackage) => setCart(prev => ({ ...prev, messagePackage }))}
          />
        )}
        {activeTab === 'cart' && (
          <SubscriptionCartReview
            cart={cart}
            subscription={subscription}
            setSubscription={setSubscription}
            onRemovePlan={() => setCart(prev => ({ ...prev, plan: undefined }))}
            onRemoveMessagePackage={() => setCart(prev => ({ ...prev, messagePackage: undefined }))}
            onOpenPricing={() => setActiveTab('pricing')}
            onOpenMessagePackages={() => setActiveTab('message_packages')}
            onComplete={() => {
              setCart({});
              setActiveTab('dashboard');
            }}
          />
        )}
        {activeTab === 'invoices' && (
          <InvoiceList transactions={subscription.transactions} />
        )}
      </div>

    </div>
  );
};

export default SubscriptionContainer;
