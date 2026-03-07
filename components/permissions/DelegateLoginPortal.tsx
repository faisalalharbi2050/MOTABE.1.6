import React, { useState } from 'react';
import { KeyRound, ShieldCheck, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { Delegate } from '../../types';

interface Props {
  onSuccess: (delegate: Delegate) => void;
  onCancel: () => void;
}

export default function DelegateLoginPortal({ onSuccess, onCancel }: Props) {
  const [step, setStep] = useState<'otp' | 'setup'>('otp');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  
  // Setup fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [matchedDelegate, setMatchedDelegate] = useState<Delegate | null>(null);

  const handleVerifyOtp = () => {
    setError('');
    const savedDelegatesStr = localStorage.getItem('motabe_delegates');
    if (!savedDelegatesStr) {
      setError('لا توجد حسابات مفوضين مسجلة');
      return;
    }
    
    const delegates: Delegate[] = JSON.parse(savedDelegatesStr);
    const delegate = delegates.find(d => d.otp === otp && d.isPendingSetup);
    
    if (delegate) {
      setMatchedDelegate(delegate);
      setStep('setup');
    } else {
      setError('رمز الدخول المؤقت غير صحيح أو منتهي الصلاحية');
    }
  };

  const handleSetupAccount = () => {
    setError('');
    
    if (!username || username.length < 4) {
      setError('يجب أن يتكون اسم المستخدم من 4 أحرف على الأقل');
      return;
    }
    
    if (!password || password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف/أرقام على الأقل');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }
    
    // Check if username exists (mock)
    const delegatesStr = localStorage.getItem('motabe_delegates');
    const delegates: Delegate[] = delegatesStr ? JSON.parse(delegatesStr) : [];
    
    if (delegates.some(d => d.username === username)) {
      setError('اسم المستخدم هذا مستخدم مسبقاً، يرجى اختيار اسم آخر');
      return;
    }
    
    // Success - update delegate
    if (matchedDelegate) {
      const updatedDelegate: Delegate = {
        ...matchedDelegate,
        username,
        passwordHash: btoa(password), // Very basic mock hash
        isPendingSetup: false,
        otp: undefined // clear OTP
      };
      
      const updatedDelegates = delegates.map(d => d.id === updatedDelegate.id ? updatedDelegate : d);
      localStorage.setItem('motabe_delegates', JSON.stringify(updatedDelegates));
      
      onSuccess(updatedDelegate);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative dir-rtl animate-fade-in-up">
        {/* Header Decor */}
        <div className="h-32 bg-gradient-to-br from-[#655ac1] to-[#4f46e5] relative">
          <button 
            onClick={onCancel}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
          >
            <ArrowRight size={20} />
          </button>
          
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-2xl shadow-lg border-4 border-white flex items-center justify-center text-[#655ac1]">
            {step === 'otp' ? <KeyRound size={32} /> : <ShieldCheck size={32} />}
          </div>
        </div>
        
        <div className="px-8 pt-16 pb-8">
          {step === 'otp' ? (
            <div className="text-center animate-fade-in">
              <h3 className="text-2xl font-black text-slate-800 mb-2">تفعيل حساب المفوض</h3>
              <p className="text-slate-500 mb-8">أدخل رمز الدخول المؤقت المرسل إليك لتفعيل حسابك وإعداد بيانات الدخول الدائمة.</p>
              
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="رمز الدخول (6 أرقام)"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full text-center text-3xl tracking-widest font-black text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl py-4 outline-none focus:border-[#655ac1] transition-all"
                  maxLength={6}
                />
              </div>
              
              {error && (
                <div className="mb-6 p-3 bg-rose-50 text-rose-600 rounded-lg text-sm border border-rose-100 flex gap-2 items-center text-right">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}
              
              <button
                onClick={handleVerifyOtp}
                disabled={otp.length < 4}
                className="w-full bg-[#655ac1] hover:bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                التحقق والمتابعة <ArrowRight size={18} className="rotate-180" />
              </button>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-slate-800 mb-1">مرحباً {matchedDelegate?.name}</h3>
                <p className="text-slate-500 text-sm">الخطوة الأخيرة: إعداد بيانات الدخول الخاصة بك</p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اسم المستخدم</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    dir="ltr"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1] transition-all text-left font-medium"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      dir="ltr"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1] transition-all text-left font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">تأكيد كلمة المرور</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    dir="ltr"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1] transition-all text-left font-medium"
                  />
                </div>
              </div>
              
              {error && (
                <div className="mb-6 p-3 bg-rose-50 text-rose-600 rounded-lg text-sm border border-rose-100 flex gap-2 items-center text-right">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}
              
              <button
                onClick={handleSetupAccount}
                className="w-full bg-[#655ac1] hover:bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2"
              >
                <CheckCircle2 size={20} /> حفظ وإنهاء الإعداد
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
