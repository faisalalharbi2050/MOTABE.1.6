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
    { id: 'dashboard',         label: 'الاشتراك الحالي',  icon: LayoutDashboard },
    { id: 'pricing',           label: 'باقات متابع',      icon: CreditCard      },
    { id: 'message_packages',  label: 'باقات الرسائل',    icon: MessageSquare   },
    { id: 'invoices',          label: 'الفواتير',          icon: FileText        },
  ] as const;

  return (
    <div className="space-y-6 dir-rtl animate-fade-in max-w-[1400px] mx-auto">

      {/* Header Card */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500" />
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

      {/* Main Tabs */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex gap-2 overflow-x-auto custom-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-[#655ac1] text-white shadow-md shadow-indigo-200'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'dashboard' && (
          <SubscriptionDashboard
            subscription={subscription}
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
