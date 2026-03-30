import React, { useState } from 'react';
import { ShoppingCart, CheckCircle2, MessageSquare, AlertCircle, X } from 'lucide-react';
import { useMessageArchive } from './MessageArchiveContext';

const MessageSubscriptions: React.FC = () => {
  const { buyPackage } = useMessageArchive();
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const packages = [
    { 
      name: 'أساسية', 
      sms: 1000, 
      wa: 10000, 
      price: 289, 
      bgLight: 'bg-[#f8f7ff]',
      textMain: 'text-[#8779fb]',
      bgIcon: 'bg-white text-[#8779fb] shadow-sm border border-[#e5e1fe]',
      btnDefault: 'bg-white border-2 border-[#e5e1fe] text-[#8779fb]',
      btnHover: 'hover:border-[#8779fb] hover:bg-[#8779fb] hover:text-white group-hover:border-[#8779fb] group-hover:bg-[#8779fb] group-hover:text-white'
    },
    { 
      name: 'متقدمة', 
      sms: 5000, 
      wa: 20000, 
      price: 749, 
      bgLight: 'bg-[#f3f0ff]',
      textMain: 'text-[#6e5ee0]',
      bgIcon: 'bg-white text-[#8779fb] shadow-sm border border-[#e5e1fe]',
      btnDefault: 'bg-white border-2 border-[#e5e1fe] text-[#8779fb]',
      btnHover: 'hover:border-[#8779fb] hover:bg-[#8779fb] hover:text-white group-hover:border-[#8779fb] group-hover:bg-[#8779fb] group-hover:text-white'
    },
    { 
      name: 'احترافية', 
      sms: 10000, 
      wa: 30000, 
      price: 994, 
      bgLight: 'bg-[#e5e1fe]',
      textMain: 'text-[#5b4cb8]',
      bgIcon: 'bg-white text-[#5b4cb8] shadow-sm border border-[#e5e1fe]',
      btnDefault: 'bg-white border-2 border-[#e5e1fe] text-[#8779fb]',
      btnHover: 'hover:border-[#8779fb] hover:bg-[#8779fb] hover:text-white group-hover:border-[#8779fb] group-hover:bg-[#8779fb] group-hover:text-white'
    }
  ];

  const handleBuyPackage = (pkg: typeof packages[0]) => {
    buyPackage({ name: pkg.name, wa: pkg.wa, sms: pkg.sms });
    showToast(`تم الاشتراك في باقة "${pkg.name}" بنجاح! — صلاحية الباقة 12 شهراً`);
  };

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">

      {/* Available Packages */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
         <div className="text-center mb-8">
           <h3 className="text-xl font-black text-slate-800">باقات الرسائل</h3>
           <p className="text-sm font-bold text-slate-500 mt-2">
             اختر الباقة المناسبة لاحتياج مدرستك.
           </p>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {packages.map(pkg => (
             <div key={pkg.name} className="bg-white border-2 border-slate-100 hover:border-slate-300 rounded-3xl p-8 text-center shadow-sm hover:shadow-xl transition-all group flex flex-col relative overflow-hidden">
               <div className={`absolute top-0 right-0 w-32 h-32 ${pkg.bgLight} rounded-bl-full -z-0 transition-transform group-hover:scale-110`} />
               <div className="relative z-10 flex-1 flex flex-col">
                  <h4 className="text-3xl font-black text-slate-800 mb-2 mt-4">{pkg.name}</h4>
                  <div className="flex justify-center items-end gap-1 mb-8">
                    <span className={`text-5xl font-black ${pkg.textMain}`}>{pkg.price}</span>
                    <span className="text-base font-bold text-slate-400 mb-1.5">ريال</span>
                  </div>
                  
                  <div className="space-y-4 mb-10 text-right flex-1 bg-slate-50 rounded-2xl p-6 border border-slate-100 group-hover:bg-white transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${pkg.bgIcon} flex items-center justify-center shrink-0`}>
                        <MessageSquare size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-500 mb-1">نصية SMS</p>
                        <p className="text-lg font-black text-slate-800">{pkg.sms.toLocaleString()} <span className="text-xs font-bold text-slate-400">رسالة</span></p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${pkg.bgIcon} flex items-center justify-center shrink-0`}>
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
                           <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd"/>
                         </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-500 mb-1">الواتساب</p>
                        <p className="text-lg font-black text-slate-800">{pkg.wa.toLocaleString()} <span className="text-xs font-bold text-slate-400">رسالة</span></p>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleBuyPackage(pkg)}
                    className={`w-full py-3 ${pkg.btnDefault} ${pkg.btnHover} rounded-xl text-lg font-black transition-all shadow-sm`}
                  >
                    اشتراك
                  </button>
               </div>
             </div>
           ))}
         </div>
         
         <p className="text-center text-sm font-bold text-slate-500 mt-10 flex items-center justify-center gap-2">
           <AlertCircle size={20} className="text-slate-400" /> جميع الباقات صالحة لمدة 12 شهر تبدأ من تاريخ الاشتراك.
         </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed z-[9999] top-[82px] left-1/2 -translate-x-1/2 max-w-md w-[calc(100%-2rem)]">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl shadow-lg">
            <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
            <p className="font-bold text-sm flex-1">{toast}</p>
            <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageSubscriptions;
