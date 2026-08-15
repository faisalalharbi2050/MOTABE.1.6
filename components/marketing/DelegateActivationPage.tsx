import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  KeyRound,
  Phone,
  RefreshCcw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import AuthShell from './AuthShell';
import SocialAuthButtons from './SocialAuthButtons';
import { MarketingRoute } from './MarketingApp';
import {
  DemoNotice,
  FieldError,
  OtpInput,
  ProgressSteps,
  primaryButton,
  secondaryButton,
  inputClass,
} from './AuthElements';

interface Props {
  onNavigate: (route: MarketingRoute) => void;
  onAuthenticated: () => void;
}

type Stage = 'code' | 'review' | 'method' | 'verify' | 'success';
type AuthMethod = 'google' | 'apple' | 'phone';

const DEMO_ACTIVATION_CODE = '482913';
const DEMO_OTP = '123456';

const delegatedUser = {
  name: 'أحمد محمد العتيبي',
  school: 'التميز النموذجية',
  title: 'وكيل المدرسة',
  maskedPhone: '05*****123',
};

const methodLabel: Record<AuthMethod, string> = {
  google: 'Google',
  apple: 'Apple',
  phone: 'رقم الجوال',
};

const DelegateActivationPage: React.FC<Props> = ({ onNavigate, onAuthenticated }) => {
  const [stage, setStage] = useState<Stage>('code');
  const [activationCode, setActivationCode] = useState('');
  const [codeError, setCodeError] = useState<string>();
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod>();
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    const codeFromUrl = new URLSearchParams(window.location.search).get('activationCode');
    if (codeFromUrl) setActivationCode(codeFromUrl.replace(/\D/g, '').slice(0, 6));
  }, []);

  const progress = useMemo(() => {
    if (stage === 'code') return 1;
    if (stage === 'review') return 2;
    if (stage === 'method' || stage === 'verify') return 3;
    return 4;
  }, [stage]);

  const verifyActivationCode = () => {
    if (activationCode.length !== 6) {
      setCodeError('أدخل رمز التفعيل المكون من 6 أرقام');
      return;
    }
    if (activationCode !== DEMO_ACTIVATION_CODE) {
      setCodeError('رمز التفعيل غير صحيح، تحقق من الرمز المرسل إليك');
      return;
    }
    setCodeError(undefined);
    setStage('review');
  };

  const chooseMethod = (method: AuthMethod) => {
    setSelectedMethod(method);
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setOtp('');
      setOtpError(undefined);
      setResendSeconds(45);
      setStage('verify');
    }, method === 'phone' ? 450 : 750);
  };

  const verifyOtp = () => {
    if (otp.length !== 6) {
      setOtpError('أدخل رمز التحقق المكون من 6 أرقام');
      return;
    }
    if (otp !== DEMO_OTP) {
      setOtpError('رمز التحقق غير صحيح');
      return;
    }

    const demoSession = {
      kind: 'delegate',
      name: delegatedUser.name,
      school: delegatedUser.school,
      title: delegatedUser.title,
      authMethod: selectedMethod,
      activatedAt: new Date().toISOString(),
    };
    localStorage.setItem('motabe_demo_identity_v1', JSON.stringify(demoSession));
    localStorage.setItem('motabe_profile', JSON.stringify({
      name: delegatedUser.name,
      phone: '0500000123',
      email: selectedMethod === 'apple' ? 'user@privaterelay.appleid.com' : 'ahmad@example.com',
      authMethod: selectedMethod === 'phone' ? 'manual' : selectedMethod,
      lastLogin: new Date().toISOString(),
    }));
    setOtpError(undefined);
    setStage('success');
  };

  return (
    <AuthShell
      title={stage === 'success' ? 'تم تفعيل حسابك' : 'تفعيل حساب المفوّض'}
      subtitle={stage === 'success' ? 'أصبح حسابك جاهزًا للدخول إلى منصة متابع' : 'أكمل الخطوات لربط حسابك بالتفويض الممنوح لك'}
      wide
      onNavigate={onNavigate}
    >
      {stage !== 'success' && (
        <ProgressSteps current={progress} labels={['الرمز', 'البيانات', 'الدخول', 'الاكتمال']} />
      )}

      {stage === 'code' && (
        <div className="mx-auto max-w-sm space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <KeyRound className="h-5 w-5 shrink-0 text-[#655ac1]" />
              <div>
                <h2 className="font-black text-slate-800">أدخل رمز تفعيل التفويض</h2>
                <p className="mt-0.5 text-xs text-slate-500">الرمز المرسل إليك من إدارة المدرسة</p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">رمز التفعيل</label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              autoComplete="one-time-code"
              value={activationCode}
              onChange={(event) => {
                setActivationCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                setCodeError(undefined);
              }}
              onKeyDown={(event) => event.key === 'Enter' && verifyActivationCode()}
              maxLength={6}
              placeholder="— — — — — —"
              dir="ltr"
              className={`${inputClass(Boolean(codeError))} text-center text-xl tracking-[0.55em]`}
            />
            <FieldError message={codeError} />
          </div>

          <button type="button" onClick={verifyActivationCode} className={primaryButton}>
            التحقق من الرمز
            <ArrowLeft className="h-5 w-5" />
          </button>

          <DemoNotice>
            للتجربة استخدم رمز التفعيل <b dir="ltr">482913</b>.
          </DemoNotice>

          <button type="button" onClick={() => onNavigate('login')} className="flex w-full items-center justify-center gap-2 text-center text-sm font-bold text-[#655ac1] hover:text-[#52499d]">
            <ArrowRight className="h-4 w-4" />
            العودة إلى تسجيل الدخول
          </button>
        </div>
      )}

      {stage === 'review' && (
        <div className="space-y-4">
          <div className="flex flex-col items-center px-2 pb-2 pt-1 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" strokeWidth={1.9} />
            <h2 className="mt-2.5 text-base font-black text-emerald-600">رمز التفعيل صحيح</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">راجع بياناتك قبل متابعة تفعيل الحساب</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-black text-slate-700">
              بيانات التفويض
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <InfoRow icon={UserRound} label="الاسم" value={delegatedUser.name} />
              <InfoRow icon={Building2} label="المدرسة" value={delegatedUser.school} />
              <InfoRow icon={ShieldCheck} label="المسمى الوظيفي" value={delegatedUser.title} />
              <InfoRow icon={Phone} label="رقم الجوال" value={delegatedUser.maskedPhone} ltr />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setStage('method')} className={primaryButton}>
              متابعة وربط الحساب
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setStage('code')} className={secondaryButton}>
              تعديل رمز التفعيل
            </button>
          </div>
        </div>
      )}

      {stage === 'method' && (
        <div className="mx-auto max-w-md space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-black text-slate-800">كيف ترغب في الدخول إلى حسابك؟</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              سيتم ربط طريقة الدخول التي تختارها بحسابك في مدرسة {delegatedUser.school}.
            </p>
          </div>

          <SocialAuthButtons onClick={(provider) => chooseMethod(provider)} disabled={loading} />

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-4 text-xs text-slate-400">أو</span></div>
          </div>

          <button type="button" disabled={loading} onClick={() => chooseMethod('phone')} className={secondaryButton}>
            {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" /> : <Phone className="h-5 w-5" />}
            المتابعة برقم الجوال
          </button>

          <button type="button" onClick={() => setStage('review')} className="flex w-full items-center justify-center gap-2 text-center text-sm font-bold text-[#655ac1] hover:text-[#52499d]">
            <ArrowRight className="h-4 w-4" />
            الرجوع إلى بيانات التفويض
          </button>
        </div>
      )}

      {stage === 'verify' && selectedMethod && (
        <div className="mx-auto max-w-sm space-y-4">
          <div className="text-center">
            <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
            <h2 className="text-lg font-black text-slate-800">تحقق من رقم الجوال</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              أرسلنا رمز تحقق إلى الرقم المسجل في بياناتك <b dir="ltr" className="text-slate-700">{delegatedUser.maskedPhone}</b>
            </p>
            {selectedMethod !== 'phone' && (
              <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                تم التحقق بواسطة {methodLabel[selectedMethod]}
              </span>
            )}
          </div>

          <OtpInput value={otp} onChange={(value) => { setOtp(value); setOtpError(undefined); }} error={otpError} autoFocus />

          <button type="button" onClick={verifyOtp} className={primaryButton}>
            تأكيد وربط الحساب
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              disabled={resendSeconds > 0}
              onClick={() => setResendSeconds(45)}
              className="flex items-center gap-1.5 font-bold text-[#655ac1] disabled:text-slate-400"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              إعادة إرسال الرمز
            </button>
            {resendSeconds > 0 && (
              <span className="flex items-center gap-1 text-slate-400"><Clock3 className="h-3.5 w-3.5" /> خلال {resendSeconds} ثانية</span>
            )}
          </div>

          <DemoNotice>للتجربة استخدم رمز التحقق <b dir="ltr">123456</b>.</DemoNotice>

          <button type="button" onClick={() => setStage('method')} className="flex w-full items-center justify-center gap-2 text-center text-sm font-bold text-[#655ac1] hover:text-[#52499d]">
            <ArrowRight className="h-4 w-4" />
            اختيار طريقة دخول أخرى
          </button>
        </div>
      )}

      {stage === 'success' && selectedMethod && (
        <div className="mx-auto max-w-md py-1 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h2 className="mt-4 text-xl font-black text-slate-800">مرحبًا، {delegatedUser.name.split(' ')[0]}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
            تم تفعيل حسابك وربطه بمدرسة <b className="text-slate-800">{delegatedUser.school}</b> بنجاح. يمكنك الآن الدخول إلى منصة متابع.
          </p>
          <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 text-right">
            <InfoRow icon={UserRound} label="الحساب" value={delegatedUser.name} />
            <div className="my-3 h-px bg-slate-200" />
            <InfoRow icon={ShieldCheck} label="طريقة الدخول" value={methodLabel[selectedMethod]} />
          </div>
          <button type="button" onClick={onAuthenticated} className={`${primaryButton} mx-auto mt-7 max-w-sm`}>
            الدخول إلى المنصة
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      )}
    </AuthShell>
  );
};

const InfoRow: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  ltr?: boolean;
}> = ({ icon: Icon, label, value, ltr }) => (
  <div className="flex items-center gap-3">
    <Icon className="h-5 w-5 shrink-0 text-[#655ac1]" />
    <div className="min-w-0">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-slate-700" dir={ltr ? 'ltr' : undefined}>{value}</p>
    </div>
  </div>
);

export default DelegateActivationPage;
