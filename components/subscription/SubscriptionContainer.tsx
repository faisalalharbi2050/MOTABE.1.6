import React, { useState } from 'react';
import { CreditCard, FileText, LayoutDashboard, MessageSquare } from 'lucide-react';
import SubscriptionDashboard from './SubscriptionDashboard';
import PricingPlans from './PricingPlans';
import InvoiceList from './InvoiceList';
import MessageSubscriptions from '../messaging/MessageSubscriptions';
import { SubscriptionInfo } from '../../types';

interface SubscriptionContainerProps {
  subscription: SubscriptionInfo;
  setSubscription: React.Dispatch<React.SetStateAction<SubscriptionInfo>>;
  initialTab?: 'dashboard' | 'pricing' | 'message_packages' | 'invoices';
}

const SubscriptionContainer: React.FC<SubscriptionContainerProps> = ({ subscription, setSubscription, initialTab }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pricing' | 'message_packages' | 'invoices'>(initialTab || 'dashboard');

  const tabs = [
    { id: 'dashboard',         label: 'الاشتراك الحالي',  hint: 'حالة باقتك وتجديدها',    icon: LayoutDashboard },
    { id: 'pricing',           label: 'باقات متابع',      hint: 'الباقات والأسعار',        icon: CreditCard      },
    { id: 'message_packages',  label: 'باقات الرسائل',    hint: 'رصيد وباقات الرسائل',     icon: MessageSquare   },
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
            setSubscription={setSubscription}
            onComplete={() => setActiveTab('dashboard')}
          />
        )}
        {activeTab === 'message_packages' && (
          <MessageSubscriptions />
        )}
        {activeTab === 'invoices' && (
          <InvoiceList transactions={subscription.transactions} />
        )}
      </div>

    </div>
  );
};

export default SubscriptionContainer;
