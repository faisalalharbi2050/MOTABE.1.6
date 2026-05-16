import React, { useState } from 'react';
import { UserPlus, Users, ClipboardList, Lock } from 'lucide-react';
import AddDelegate from './AddDelegate';
import ManageDelegates from './ManageDelegates';
import ActionLogs from './ActionLogs';
import DelegateLoginPortal from './DelegateLoginPortal';
import Toast, { useToast } from './Toast';

const RolePermissions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add' | 'manage' | 'logs'>('add');
  const [showLoginPortal, setShowLoginPortal] = useState(false);
  const { toast, showToast } = useToast();

  const tabs = [
    { id: 'add', label: 'إضافة مفوض', icon: UserPlus },
    { id: 'manage', label: 'إدارة المفوضين', icon: Users },
    { id: 'logs', label: 'سجل الإجراءات', icon: ClipboardList },
  ] as const;

  return (
    <div className="space-y-6 dir-rtl animate-fade-in max-w-[1400px] mx-auto pb-20">

      {/* ══════ Header Card ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <Lock size={36} strokeWidth={1.8} className="text-[#655ac1]" />
              الصلاحيات
            </h3>
            <p className="text-slate-500 font-medium mt-2 mr-12">
              إدارة صلاحيات المستخدمين، تفويض المهام، وتتبع الإجراءات في النظام.
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex gap-2 overflow-x-auto custom-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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
        {activeTab === 'add' && <AddDelegate onSimulateLogin={() => setShowLoginPortal(true)} />}
        {activeTab === 'manage' && <ManageDelegates />}
        {activeTab === 'logs' && <ActionLogs />}
      </div>

      {showLoginPortal && (
        <DelegateLoginPortal
          onSuccess={(delegate) => {
            showToast(`تم إعداد حساب المفوض ${delegate.name} بنجاح!`, 'success');
            setShowLoginPortal(false);
          }}
          onCancel={() => setShowLoginPortal(false)}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
};

export default RolePermissions;
