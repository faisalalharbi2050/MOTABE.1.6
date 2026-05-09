import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, Mail, Phone, X } from 'lucide-react';
import AuthShell from './AuthShell';
import SocialAuthButtons from './SocialAuthButtons';
import { MarketingRoute } from './MarketingApp';

interface Props {
  onNavigate: (r: MarketingRoute) => void;
  onAuthenticated: () => void;
}

type RecoverChannel = 'email' | 'phone';
type RecoverStep = 'choose' | 'enter' | 'verify' | 'done';

const LoginPage: React.FC<Props> = ({ onNavigate, onAuthenticated }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Forgot-password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [recStep, setRecStep] = useState<RecoverStep>('choose');
  const [recChannel, setRecChannel] = useState<RecoverChannel>('email');
  const [recValue, setRecValue] = useState('');
  const [recCode, setRecCode] = useState('');
  const [recError, setRecError] = useState<string | undefined>();

  const validate = () => {
    const errs: typeof errors = {};
    if (!identifier) errs.identifier = 'اسم المستخدم أو البريد الإلكتروني مطلوب';
    if (!password) errs.password = 'كلمة المرور مطلوبة';
    else if (password.length < 4) errs.password = 'كلمة المرور قصيرة جداً';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onAuthenticated();
    }, 600);
  };

  const openForgot = () => {
    setRecStep('choose');
    setRecChannel('email');
    setRecValue('');
    setRecCode('');
    setRecError(undefined);
    setForgotOpen(true);
  };

  const submitRecChoose = () => {
    setRecStep('enter');
    setRecError(undefined);
  };

  const submitRecValue = () => {
    if (!recValue.trim()) {
      setRecError(recChannel === 'email' ? 'أدخل البريد الإلكتروني' : 'أدخل رقم الجوال');
      return;
    }
    if (recChannel === 'email' && !/^\S+@\S+\.\S+$/.test(recValue)) {
      setRecError('صيغة البريد الإلكتروني غير صحيحة');
      return;
    }
    if (recChannel === 'phone' && !/^(05|5)\d{8}$/.test(recValue.replace(/\s/g, ''))) {
      setRecError('صيغة رقم الجوال غير صحيحة');
      return;
    }
    setRecError(undefined);
    setRecStep('verify');
  };

  const submitRecCode = () => {
    if (!recCode.trim() || recCode.length < 4) {
      setRecError('أدخل رمز التحقق');
      return;
    }
    setRecError(undefined);
    setRecStep('done');
  };

  return (
    <AuthShell
      title="مرحباً بك في متابع"
      subtitle=""
      onNavigate={onNavigate}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Username or email */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            اسم المستخدم أو البريد الإلكتروني
          </label>
          <div className="relative">
            <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (errors.identifier) setErrors((p) => ({ ...p, identifier: undefined }));
              }}
              placeholder="username أو example@motabe.sa"
              className={`w-full pr-11 pl-4 py-3 bg-white rounded-xl border-2 text-sm focus:outline-none transition-colors ${
                errors.identifier
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-slate-200 focus:border-[#655ac1]'
              }`}
            />
          </div>
          {errors.identifier && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.identifier}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-slate-700">كلمة المرور</label>
            <button
              type="button"
              onClick={openForgot}
              className="text-xs text-[#655ac1] hover:text-[#52499d] font-bold"
            >
              نسيت كلمة المرور؟
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              }}
              placeholder="••••••••"
              className={`w-full pr-11 pl-12 py-3 bg-white rounded-xl border-2 text-sm focus:outline-none transition-colors ${
                errors.password
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-slate-200 focus:border-[#655ac1]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="إظهار كلمة المرور"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.password}
            </p>
          )}
        </div>

        {/* Remember */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded accent-[#655ac1]"
          />
          <span className="text-sm text-slate-600">تذكّرني</span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-[#655ac1] hover:bg-[#52499d] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base shadow-lg shadow-[#655ac1]/30 transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              جاري الدخول...
            </>
          ) : (
            <>
              تسجيل الدخول
              <ArrowLeft className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-xs text-slate-500">
              أو سجّل الدخول عبر
            </span>
          </div>
        </div>

        <SocialAuthButtons />

        <p className="text-center text-sm text-slate-600 pt-4">
          ليس لديك حساب؟{' '}
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="text-[#655ac1] hover:text-[#52499d] font-bold"
          >
            أنشئ حساباً جديداً
          </button>
        </p>
      </form>

      {/* Forgot-password modal */}
      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setForgotOpen(false)}
          dir="rtl"
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-[#655ac1]">استعادة كلمة المرور</h3>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {recStep === 'choose' && (
              <>
                <p className="text-sm text-slate-600 mb-4">
                  اختر طريقة الاستعادة، وسنرسل إليك رمز تحقق:
                </p>
                <div className="space-y-2">
                  {([
                    { key: 'email' as RecoverChannel, label: 'البريد الإلكتروني المسجل', icon: Mail },
                    { key: 'phone' as RecoverChannel, label: 'رقم الجوال', icon: Phone },
                  ]).map(({ key, label, icon: Icon }) => (
                    <label
                      key={key}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        recChannel === key
                          ? 'border-[#655ac1] bg-[#655ac1]/5'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="recover-channel"
                        checked={recChannel === key}
                        onChange={() => setRecChannel(key)}
                        className="accent-[#655ac1]"
                      />
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-700 font-bold">{label}</span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={submitRecChoose}
                  className="mt-5 w-full py-3 bg-[#655ac1] hover:bg-[#52499d] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#655ac1]/30 transition-all"
                >
                  متابعة
                </button>
              </>
            )}

            {recStep === 'enter' && (
              <>
                <p className="text-sm text-slate-600 mb-4">
                  {recChannel === 'email'
                    ? 'أدخل البريد الإلكتروني المسجل في النظام:'
                    : 'أدخل رقم الجوال المسجل في النظام:'}
                </p>
                <div className="relative">
                  {recChannel === 'email' ? (
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  ) : (
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  )}
                  <input
                    type={recChannel === 'email' ? 'email' : 'tel'}
                    value={recValue}
                    onChange={(e) => setRecValue(e.target.value)}
                    placeholder={recChannel === 'email' ? 'example@motabe.sa' : '05xxxxxxxx'}
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                    className={`w-full pr-11 pl-4 py-3 bg-white rounded-xl border-2 text-sm focus:outline-none transition-colors ${
                      recError ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-[#655ac1]'
                    }`}
                  />
                </div>
                {recError && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {recError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={submitRecValue}
                  className="mt-5 w-full py-3 bg-[#655ac1] hover:bg-[#52499d] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#655ac1]/30 transition-all"
                >
                  إرسال رمز التحقق
                </button>
              </>
            )}

            {recStep === 'verify' && (
              <>
                <p className="text-sm text-slate-600 mb-4">
                  أدخل رمز التحقق المرسل إلى{' '}
                  <span className="font-bold text-slate-800">{recValue}</span>:
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  value={recCode}
                  onChange={(e) => setRecCode(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  placeholder="••••••"
                  dir="ltr"
                  className={`w-full px-4 py-3 bg-white rounded-xl border-2 text-base tracking-widest text-center focus:outline-none transition-colors ${
                    recError ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-[#655ac1]'
                  }`}
                />
                {recError && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {recError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={submitRecCode}
                  className="mt-5 w-full py-3 bg-[#655ac1] hover:bg-[#52499d] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#655ac1]/30 transition-all"
                >
                  تأكيد
                </button>
              </>
            )}

            {recStep === 'done' && (
              <>
                <p className="text-sm text-slate-700 leading-relaxed">
                  تم التحقق بنجاح. يمكنك الآن تعيين كلمة مرور جديدة عبر الرابط الذي تم إرساله.
                </p>
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="mt-5 w-full py-3 bg-[#655ac1] hover:bg-[#52499d] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#655ac1]/30 transition-all"
                >
                  إغلاق
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </AuthShell>
  );
};

export default LoginPage;
