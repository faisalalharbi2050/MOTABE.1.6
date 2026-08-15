import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock3, KeyRound, Phone, RefreshCcw, ShieldCheck } from 'lucide-react';
import AuthShell from './AuthShell';
import SocialAuthButtons from './SocialAuthButtons';
import { MarketingRoute } from './MarketingApp';
import { DemoNotice, OtpInput, PhoneField, isSaudiMobile, primaryButton, secondaryButton } from './AuthElements';

interface Props {
  onNavigate: (route: MarketingRoute) => void;
  onAuthenticated: () => void;
}

const LoginPage: React.FC<Props> = ({ onNavigate, onAuthenticated }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string>();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple'>();
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const signInWithProvider = (provider: 'google' | 'apple') => {
    setLoadingProvider(provider);
    window.setTimeout(() => {
      localStorage.setItem('motabe_demo_identity_v1', JSON.stringify({ kind: 'owner', authMethod: provider }));
      localStorage.setItem('motabe_profile', JSON.stringify({ authMethod: provider, lastLogin: new Date().toISOString() }));
      setLoadingProvider(undefined);
      onAuthenticated();
    }, 800);
  };

  const sendOtp = () => {
    if (!isSaudiMobile(phone)) {
      setPhoneError('أدخل رقم جوال سعودي صحيح');
      return;
    }
    setPhoneError(undefined);
    setResendSeconds(45);
    setStep('otp');
  };

  const confirmOtp = () => {
    if (otp !== '123456') {
      setOtpError(otp.length < 6 ? 'أدخل رمز التحقق المكون من 6 أرقام' : 'رمز التحقق غير صحيح');
      return;
    }
    localStorage.setItem('motabe_demo_identity_v1', JSON.stringify({ kind: 'owner', authMethod: 'phone', phone }));
    localStorage.setItem('motabe_profile', JSON.stringify({ phone, authMethod: 'manual', lastLogin: new Date().toISOString() }));
    onAuthenticated();
  };

  return (
    <AuthShell title="مرحبًا بعودتك" subtitle="اختر الطريقة المناسبة للدخول إلى منصة متابع" onNavigate={onNavigate}>
      <div className="space-y-4">
        <SocialAuthButtons onClick={signInWithProvider} disabled={Boolean(loadingProvider)} />
        {loadingProvider && (
          <p className="flex items-center justify-center gap-2 text-xs font-bold text-[#655ac1]">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#655ac1]/25 border-t-[#655ac1]" />
            جاري التحقق بواسطة {loadingProvider === 'google' ? 'Google' : 'Apple'}...
          </p>
        )}

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center"><span className="bg-white px-4 text-xs text-slate-400">أو الدخول برقم الجوال</span></div>
        </div>

        {step === 'phone' ? (
          <div className="space-y-4">
            <PhoneField value={phone} onChange={(value) => { setPhone(value); setPhoneError(undefined); }} error={phoneError} />
            <button type="button" onClick={sendOtp} className={primaryButton}>
              إرسال رمز التحقق <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#655ac1]/15 bg-[#655ac1]/5 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-black text-slate-700">
                <ShieldCheck className="h-4 w-4 text-[#655ac1]" /> تحقق من رقمك
              </div>
              <p className="mt-1 text-xs">أرسلنا رمزًا مكونًا من 6 أرقام إلى <b dir="ltr">{phone}</b></p>
            </div>
            <OtpInput value={otp} onChange={(value) => { setOtp(value); setOtpError(undefined); }} error={otpError} autoFocus />
            <button type="button" onClick={confirmOtp} className={primaryButton}>
              تأكيد وتسجيل الدخول <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-start justify-between text-xs">
              <div className="flex flex-col items-start gap-2">
                <button type="button" disabled={resendSeconds > 0} onClick={() => setResendSeconds(45)} className="flex items-center gap-1.5 font-bold text-[#655ac1] disabled:text-slate-400">
                  <RefreshCcw className="h-3.5 w-3.5" /> إعادة إرسال الرمز
                </button>
                <button type="button" onClick={() => { setStep('phone'); setOtp(''); }} className="flex items-center gap-1.5 font-bold text-slate-500 hover:text-[#655ac1]">
                  <Phone className="h-3.5 w-3.5" />
                  استخدام رقم جوال آخر
                </button>
              </div>
              {resendSeconds > 0 && <span className="flex items-center gap-1 text-slate-400"><Clock3 className="h-3.5 w-3.5" /> خلال {resendSeconds} ثانية</span>}
            </div>
            <DemoNotice>للتجربة استخدم رمز التحقق <b dir="ltr">123456</b>.</DemoNotice>
          </div>
        )}

        {step === 'phone' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-[#655ac1]" />
              <div>
                <p className="text-sm font-black text-slate-800">هل تم منحك تفويضًا للدخول؟</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">استخدم رمز التفعيل المرسل إليك لربط حسابك بالمدرسة.</p>
              </div>
            </div>
            <button type="button" onClick={() => onNavigate('delegate-activation')} className={secondaryButton}>لدي رمز تفعيل تفويض</button>
          </div>
        )}

        <p className="text-center text-sm text-slate-600">
          ليس لديك حساب؟{' '}
          <button type="button" onClick={() => onNavigate('register')} className="font-black text-[#655ac1] hover:text-[#52499d]">إنشاء حساب جديد</button>
        </p>
      </div>
    </AuthShell>
  );
};

export default LoginPage;
