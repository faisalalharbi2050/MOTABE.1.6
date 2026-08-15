import React, { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Check, CheckCircle2, Clock3, RefreshCcw, Sparkles, UserRound } from 'lucide-react';
import AuthShell from './AuthShell';
import SocialAuthButtons from './SocialAuthButtons';
import { MarketingRoute } from './MarketingApp';
import {
  DemoNotice,
  FieldError,
  OtpInput,
  PhoneField,
  inputClass,
  isSaudiMobile,
  primaryButton,
} from './AuthElements';

interface Props {
  onNavigate: (route: MarketingRoute) => void;
  onAuthenticated: () => void;
}

type Provider = 'google' | 'apple';

const RegisterPage: React.FC<Props> = ({ onNavigate, onAuthenticated }) => {
  const [step, setStep] = useState<'details' | 'otp' | 'success'>('details');
  const [provider, setProvider] = useState<Provider>();
  const [providerLoading, setProviderLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; agree?: string; otp?: string }>({});
  const [otp, setOtp] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const connectProvider = (selected: Provider) => {
    setProviderLoading(true);
    window.setTimeout(() => {
      setProvider(selected);
      setFullName('عبدالله محمد سعد');
      setProviderLoading(false);
    }, 700);
  };

  const sendOtp = () => {
    const nextErrors: typeof errors = {};
    if (!fullName.trim()) nextErrors.fullName = 'الاسم الثلاثي مطلوب';
    if (!isSaudiMobile(phone)) nextErrors.phone = 'أدخل رقم جوال سعودي صحيح';
    if (!agree) nextErrors.agree = 'يجب الموافقة على الشروط وسياسة الخصوصية';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setResendSeconds(45);
    setStep('otp');
  };

  const confirmOtp = () => {
    if (otp !== '123456') {
      setErrors((current) => ({ ...current, otp: otp.length < 6 ? 'أدخل رمز التحقق المكون من 6 أرقام' : 'رمز التحقق غير صحيح' }));
      return;
    }
    localStorage.setItem('motabe_demo_identity_v1', JSON.stringify({
      kind: 'owner',
      name: fullName,
      phone,
      authMethod: provider ?? 'phone',
      phoneVerified: true,
    }));
    localStorage.setItem('motabe_profile', JSON.stringify({
      name: fullName,
      phone,
      email: provider === 'apple' ? 'user@privaterelay.appleid.com' : provider === 'google' ? 'abdullah@example.com' : '',
      authMethod: provider ?? 'manual',
      lastLogin: new Date().toISOString(),
    }));
    setStep('success');
  };

  return (
    <AuthShell
      title={step === 'success' ? 'اكتمل إنشاء حسابك' : 'إنشاء حساب جديد'}
      subtitle={step === 'details' ? 'ابدأ تجربتك في منصة متابع خلال دقائق' : step === 'otp' ? 'تبقت خطوة واحدة لتوثيق حسابك' : 'حسابك موثق وجاهز للاستخدام'}
      badge={step === 'details' ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-[#655ac1] to-[#8779fb] px-3 py-1.5 text-[11px] font-black text-white shadow-lg shadow-[#655ac1]/35 ring-2 ring-white">
          <Sparkles className="h-3.5 w-3.5" /> تجربة مجانية لمدة 10 أيام
        </span>
      ) : undefined}
      onNavigate={onNavigate}
    >
      {step === 'details' && (
        <div className="space-y-4">
          {!provider ? (
            <>
              <SocialAuthButtons onClick={connectProvider} disabled={providerLoading} />
              {providerLoading && (
                <p className="flex items-center justify-center gap-2 text-xs font-bold text-[#655ac1]">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#655ac1]/25 border-t-[#655ac1]" /> جاري التحقق...
                </p>
              )}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-4 text-xs text-slate-400">أو التسجيل برقم الجوال</span></div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-black text-emerald-800">
                <BadgeCheck className="h-5 w-5" /> تم التحقق بواسطة {provider === 'google' ? 'Google' : 'Apple'}
              </div>
              <button type="button" onClick={() => { setProvider(undefined); setFullName(''); }} className="text-xs font-bold text-emerald-700 hover:text-emerald-900">تغيير</button>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              الاسم الثلاثي <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <UserRound className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(event) => { setFullName(event.target.value); setErrors((current) => ({ ...current, fullName: undefined })); }}
                placeholder="مثال: عبدالله محمد سعد"
                className={`${inputClass(Boolean(errors.fullName))} pr-11`}
              />
            </div>
            <FieldError message={errors.fullName} />
          </div>

          <PhoneField required value={phone} onChange={(value) => { setPhone(value); setErrors((current) => ({ ...current, phone: undefined })); }} error={errors.phone} />

          {provider && (
            <p className="rounded-xl bg-[#655ac1]/5 px-4 py-3 text-xs leading-6 text-slate-600">
              توثيق رقم الجوال إلزامي لإكمال ربط حساب {provider === 'google' ? 'Google' : 'Apple'} وحماية الحساب من الاستخدام غير المصرح به.
            </p>
          )}

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3.5">
            <input
              type="checkbox"
              checked={agree}
              onChange={(event) => { setAgree(event.target.checked); setErrors((current) => ({ ...current, agree: undefined })); }}
              className="peer sr-only"
            />
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-[#655ac1]/15 ${
              agree
                ? 'border-[#655ac1] bg-[#655ac1] text-white'
                : 'border-slate-300 bg-white text-transparent'
            }`}>
              <Check size={12} strokeWidth={3.5} />
            </span>
            <span className="text-xs leading-6 text-slate-600">
              أوافق على{' '}
              <button type="button" onClick={() => onNavigate('terms')} className="font-black text-[#655ac1]">الشروط والأحكام</button>
              {' '}و{' '}
              <button type="button" onClick={() => onNavigate('privacy')} className="font-black text-[#655ac1]">سياسة الخصوصية</button>
            </span>
          </label>
          <FieldError message={errors.agree} />

          <button type="button" onClick={sendOtp} className={primaryButton}>
            إرسال رمز التحقق <ArrowLeft className="h-5 w-5" />
          </button>

          <p className="text-center text-sm text-slate-600">
            لديك حساب بالفعل؟{' '}
            <button type="button" onClick={() => onNavigate('login')} className="font-black text-[#655ac1] hover:text-[#52499d]">تسجيل الدخول</button>
          </p>
        </div>
      )}

      {step === 'otp' && (
        <div className="space-y-4">
          <div className="text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#655ac1]/10 text-[#655ac1]"><BadgeCheck className="h-6 w-6" /></span>
            <p className="text-sm leading-6 text-slate-600">أرسلنا رمز التحقق إلى <b dir="ltr" className="text-slate-800">{phone}</b></p>
          </div>
          <OtpInput value={otp} onChange={(value) => { setOtp(value); setErrors((current) => ({ ...current, otp: undefined })); }} error={errors.otp} autoFocus />
          <button type="button" onClick={confirmOtp} className={primaryButton}>
            توثيق وإنشاء الحساب <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center justify-between text-xs">
            <button type="button" disabled={resendSeconds > 0} onClick={() => setResendSeconds(45)} className="flex items-center gap-1.5 font-bold text-[#655ac1] disabled:text-slate-400">
              <RefreshCcw className="h-3.5 w-3.5" /> إعادة إرسال الرمز
            </button>
            {resendSeconds > 0 && <span className="flex items-center gap-1 text-slate-400"><Clock3 className="h-3.5 w-3.5" /> خلال {resendSeconds} ثانية</span>}
          </div>
          <DemoNotice>للتجربة استخدم رمز التحقق <b dir="ltr">123456</b>.</DemoNotice>
          <button type="button" onClick={() => { setStep('details'); setOtp(''); }} className="w-full text-center text-sm font-bold text-slate-500 hover:text-[#655ac1]">تعديل البيانات</button>
        </div>
      )}

      {step === 'success' && (
        <div className="py-3 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h2 className="mt-4 text-xl font-black text-slate-800">مرحبًا، {fullName.split(' ')[0]}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">تم توثيق رقم جوالك وإنشاء حسابك بنجاح. يمكنك الآن البدء باستخدام منصة متابع.</p>
          <button type="button" onClick={onAuthenticated} className={`${primaryButton} mt-7`}>
            الدخول إلى المنصة <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      )}
    </AuthShell>
  );
};

export default RegisterPage;
