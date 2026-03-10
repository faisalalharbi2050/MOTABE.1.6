import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { UserPlus, Users, Activity, Lock, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import AddDelegate from './AddDelegate';
import ManageDelegates from './ManageDelegates';
import ActionLogs from './ActionLogs';
import DelegateLoginPortal from './DelegateLoginPortal';

const RolePermissions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add' | 'manage' | 'logs'>('add');
  const [showLoginPortal, setShowLoginPortal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const tabs = [
    { id: 'add', label: 'إضافة مفوض', icon: UserPlus },
    { id: 'manage', label: 'إدارة المفوضين', icon: Users },
    { id: 'logs', label: 'سجل الإجراءات', icon: Activity },
  ] as const;

  return (
    <div className="space-y-6 dir-rtl animate-fade-in max-w-[1400px] mx-auto pb-20">
      
      {/* ══════ Header Card ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500" />

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

      {/* Toast Notification */}
      {toast && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed z-[9999] pointer-events-none w-full" style={{ top: '82px', left: '50%', transform: 'translateX(-50%)', animation: 'toastIn 0.3s ease-out' }}>
           <style>{`@keyframes toastIn { from { opacity:0; top:64px; } to { opacity:1; top:82px; } }`}</style>
           <div className={`mx-auto max-w-md w-full shadow-lg rounded-2xl p-4 flex items-center gap-3 border pointer-events-auto
             ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
             toast.type === 'error'   ? 'bg-rose-50 border-rose-200 text-rose-800' :
             'bg-amber-50 border-amber-200 text-amber-800'}`}
           >
             <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center
               ${toast.type === 'success' ? 'bg-emerald-100' :
               toast.type === 'error'   ? 'bg-rose-100' : 'bg-amber-100'}`}
             >
               {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-600" />}
               {toast.type === 'error'   && <AlertCircle  size={20} className="text-rose-600" />}
               {toast.type === 'warning' && <AlertTriangle size={20} className="text-amber-600" />}
             </div>
            <p className="font-bold text-sm flex-1 leading-relaxed">{toast.message}</p>
           </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RolePermissions;
