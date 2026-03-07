import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Users, Edit2, Trash2, Power, KeyRound, Smartphone, Search, ShieldAlert, ShieldCheck, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Delegate } from '../../types';

export default function ManageDelegates() {
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadDelegates();
  }, []);

  const loadDelegates = () => {
    const saved = localStorage.getItem('motabe_delegates');
    if (saved) {
      setDelegates(JSON.parse(saved));
    }
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    const updated = delegates.map(d => d.id === id ? { ...d, isActive: !currentStatus } : d);
    setDelegates(updated);
    localStorage.setItem('motabe_delegates', JSON.stringify(updated));
    showToast(currentStatus ? 'تم إيقاف حساب المفوض' : 'تم تفعيل حساب المفوض', 'success');
  };

  const confirmDeleteDelegate = (id: string) => {
    setDeleteConfirmId(id);
  };

  const proceedDelete = () => {
    if (deleteConfirmId) {
      const updated = delegates.filter(d => d.id !== deleteConfirmId);
      setDelegates(updated);
      localStorage.setItem('motabe_delegates', JSON.stringify(updated));
      showToast('تم حذف المفوض بنجاح', 'success');
    }
    setDeleteConfirmId(null);
  };

  const filteredDelegates = delegates.filter(d => 
    d.name.includes(searchTerm) || d.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Controls Container */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="البحث باسم المفوض أو رقم الجوال..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1] transition-all"
          />
        </div>
        <div className="text-sm font-bold text-slate-500 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
          العدد الإجمالي: {delegates.length}
        </div>
      </div>

      {/* Grid of delegates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredDelegates.map(delegate => (
          <div key={delegate.id} className={`bg-white rounded-2xl p-6 shadow-sm border transition-all ${delegate.isActive ? 'border-slate-200' : 'border-rose-200 bg-rose-50/30'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${delegate.isActive ? 'bg-[#e5e1fe] text-[#655ac1] border-[#d4cbf9]' : 'bg-rose-100 text-rose-500 border-rose-200'}`}>
                  {delegate.isPendingSetup ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">{delegate.name}</h4>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                    <Smartphone size={14} />
                    {delegate.phone} 
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-slate-400 text-xs">{delegate.linkedStaffType === 'teacher' ? 'معلم' : 'إداري'}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 border-2 border-slate-100 p-1.5 rounded-lg">
                <button 
                  onClick={() => handleToggleActive(delegate.id, delegate.isActive)}
                  className={`p-1.5 rounded-md transition-all ${delegate.isActive ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100'}`}
                  title={delegate.isActive ? "إيقاف الحساب" : "تفعيل الحساب"}
                >
                  <Power size={18} />
                </button>
                <button 
                  onClick={() => showToast('هذه الميزة قيد التطوير وسيتم توفيرها قريباً', 'warning')}
                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-all"
                  title="البيانات السرية"
                >
                  <KeyRound size={18} />
                </button>
                <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>
                <button 
                  onClick={() => showToast('هذه الميزة قيد التطوير وسيتم توفيرها قريباً', 'warning')}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all"
                  title="تعديل الصلاحيات"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => confirmDeleteDelegate(delegate.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                  title="حذف المفوض"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-3">
                <span className="text-sm font-bold text-slate-600">نوع الصلاحية:</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  delegate.role === 'delegate_full' ? 'bg-[#655ac1] text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {delegate.role === 'delegate_full' ? 'كاملة' : 'مخصصة'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">حالة الحساب:</span>
                {delegate.isPendingSetup ? (
                  <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                    <AlertCircle size={12} /> بانتظار التفعيل
                  </span>
                ) : (
                  <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12} /> نشط وتم الإعداد
                  </span>
                )}
              </div>
              
              {delegate.isPendingSetup && delegate.otp && (
                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500">رمز الدخول المؤقت:</span>
                  <span className="text-sm font-bold tracking-widest bg-white border border-slate-200 px-2 rounded">{delegate.otp}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {filteredDelegates.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium text-lg">لم يتم العثور على أي مفوضين مسجلين.</p>
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-rose-100">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-center text-slate-800 mb-2">تأكيد الحذف</h3>
            <p className="text-center text-slate-500 font-medium mb-6">هل أنت متأكد من رغبتك في حذف هذا المفوض بشكل نهائي؟</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={proceedDelete}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-colors shadow-sm shadow-rose-200"
              >
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
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
}
