import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { Delegate } from '../../types';

interface Props {
  onSuccess: (delegate: Delegate) => void;
  onCancel: () => void;
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '6 أحرف على الأقل', pass: password.length >= 6 },
    { label: 'يحتوي على رقم', pass: /\d/.test(password) },
    { label: 'يحتوي على حرف', pass: /[a-zA-Z]/.test(password) },
  ];
  const score = checks.filter((check) => check.pass).length;
  const colors = ['bg-rose-400', 'bg-amber-400', 'bg-emerald-500'];
  const labels = ['ضعيفة', 'متوسطة', 'قوية'];

  if (!password) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              index < score ? colors[Math.max(score - 1, 0)] : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {checks.map((check) => (
            <span
              key={check.label}
              className={`text-xs flex items-center gap-1 ${
                check.pass ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              <CheckCircle2 size={10} />
              {check.label}
            </span>
          ))}
        </div>

        {score > 0 && (
          <span
            className={`text-xs font-bold ${
              score === 3
                ? 'text-emerald-600'
                : score === 2
                ? 'text-amber-600'
                : 'text-rose-500'
            }`}
          >
            {labels[score - 1]}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DelegateLoginPortal({ onSuccess, onCancel }: Props) {
  const [step, setStep] = useState<'otp' | 'setup'>('otp');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [matchedDelegate, setMatchedDelegate] = useState<Delegate | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'otp') otpInputRef.current?.focus();
  }, [step]);

  const handleVerifyOtp = () => {
    setError('');
    const savedStr = localStorage.getItem('motabe_delegates');

    if (!savedStr) {
      setError('لا توجد حسابات مفوضين مسجلة');
      return;
    }

    const delegates: Delegate[] = JSON.parse(savedStr);
    const delegate = delegates.find((item) => item.otp === otp && item.isPendingSetup);

    if (delegate) {
      setMatchedDelegate(delegate);
      setStep('setup');
      return;
    }

    setError('رمز الدخول غير صحيح أو منتهي الصلاحية');
  };

  const handleSetupAccount = () => {
    setError('');

    if (!username || username.length < 4) {
      setError('اسم المستخدم يجب أن يكون 4 أحرف على الأقل');
      return;
    }

    if (!password || password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    const delegatesStr = localStorage.getItem('motabe_delegates');
    const delegates: Delegate[] = delegatesStr ? JSON.parse(delegatesStr) : [];

    if (delegates.some((delegate) => delegate.username === username)) {
      setError('اسم المستخدم مستخدم مسبقًا، اختر اسمًا آخر');
      return;
    }

    if (matchedDelegate) {
      const updated: Delegate = {
        ...matchedDelegate,
        username,
        passwordHash: btoa(password),
        isPendingSetup: false,
        otp: undefined,
      };

      const updatedList = delegates.map((delegate) =>
        delegate.id === updated.id ? updated : delegate
      );

      localStorage.setItem('motabe_delegates', JSON.stringify(updatedList));
      onSuccess(updated);
    }
  };

  const stepBadgeLabel = step === 'otp' ? 'التحقق من الرمز' : 'إعداد بيانات الدخول';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_35px_90px_-35px_rgba(15,23,42,0.45)] dir-rtl animate-fade-in-up">
        <div className="border-b border-slate-100 bg-white px-6 pb-5 pt-6">
          <button
            onClick={onCancel}
            className="absolute right-5 top-5 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowRight size={20} />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-[76px] w-[76px] items-center justify-center rounded-[1.6rem] border border-slate-200 bg-slate-50 text-[#655ac1] shadow-sm">
              {step === 'otp' ? <KeyRound size={30} /> : <ShieldCheck size={30} />}
            </div>

            <span className="inline-flex items-center rounded-full border border-[#655ac1]/10 bg-[#655ac1]/8 px-3 py-1 text-xs font-bold text-[#655ac1]">
              {stepBadgeLabel}
            </span>
          </div>
        </div>

        <div className="px-8 pb-8 pt-8">
          {step === 'otp' && (
            <div className="animate-fade-in text-center">
              <h3 className="mb-2 text-2xl font-black text-slate-800">تفعيل حساب المفوض</h3>
              <p className="mb-8 text-sm leading-relaxed text-slate-500">
                أدخل رمز الدخول المؤقت المرسل إليك لتفعيل الحساب والانتقال إلى إعداد بيانات
                الدخول الدائمة.
              </p>

              <input
                ref={otpInputRef}
                type="number"
                inputMode="numeric"
                placeholder="• • • • • •"
                value={otp}
                onChange={(event) => setOtp(event.target.value.slice(0, 6))}
                onKeyDown={(event) => event.key === 'Enter' && otp.length === 6 && handleVerifyOtp()}
                className="mb-6 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-4 text-center text-3xl font-black tracking-[0.5em] text-slate-800 outline-none transition-all focus:border-[#655ac1] focus:bg-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                maxLength={6}
              />

              {error && (
                <div className="mb-6 flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-right text-sm text-rose-600">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleVerifyOtp}
                disabled={otp.length < 6}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#655ac1] py-4 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                التحقق والمتابعة
                <ArrowRight size={18} className="rotate-180" />
              </button>
            </div>
          )}

          {step === 'setup' && (
            <div className="animate-fade-in">
              <div className="mb-6 text-center">
                <h3 className="mb-1 text-xl font-black text-slate-800">
                  مرحبًا {matchedDelegate?.name}
                </h3>
                <p className="text-sm text-slate-500">
                  الخطوة الأخيرة: إعداد بيانات الدخول الدائمة
                </p>
              </div>

              <div className="mb-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">اسم المستخدم</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="مثال: ahmed2024"
                    dir="ltr"
                    autoComplete="username"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left font-medium outline-none transition-all focus:border-[#655ac1] focus:bg-white focus:ring-2 focus:ring-[#655ac1]/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">كلمة المرور</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      dir="ltr"
                      autoComplete="new-password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-left font-medium outline-none transition-all focus:border-[#655ac1] focus:bg-white focus:ring-2 focus:ring-[#655ac1]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    تأكيد كلمة المرور
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleSetupAccount()}
                    dir="ltr"
                    autoComplete="new-password"
                    className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-left font-medium outline-none transition-all focus:bg-white focus:ring-2 ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
                        : confirmPassword && password === confirmPassword
                        ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-200'
                        : 'border-slate-200 focus:border-[#655ac1] focus:ring-[#655ac1]/10'
                    }`}
                  />

                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
                      <AlertCircle size={11} />
                      كلمتا المرور غير متطابقتين
                    </p>
                  )}

                  {confirmPassword && password === confirmPassword && password.length >= 6 && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 size={11} />
                      كلمتا المرور متطابقتان
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-right text-sm text-rose-600">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleSetupAccount}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#655ac1] py-4 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-600"
              >
                <CheckCircle2 size={20} />
                حفظ وإنهاء الإعداد
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
