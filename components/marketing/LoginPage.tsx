import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';
import AuthShell from './AuthShell';
import SocialAuthButtons from './SocialAuthButtons';
import { MarketingRoute } from './MarketingApp';

interface Props {
  onNavigate: (r: MarketingRoute) => void;
  onAuthenticated: () => void;
}

const LoginPage: React.FC<Props> = ({ onNavigate, onAuthenticated }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs: typeof errors = {};
    if (!email) errs.email = 'البريد الإلكتروني أو رقم الجوال مطلوب';
    if (!password) errs.password = 'كلمة المرور مطلوبة';
    else if (password.length < 4) errs.password = 'كلمة المرور قصيرة جداً';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    // Design-only: simulate auth
    setTimeout(() => {
      setSubmitting(false);
      onAuthenticated();
    }, 600);
  };

  return (
    <AuthShell
      title="مرحباً بعودتك"
      subtitle="سجّل دخولك للمتابعة إلى لوحة التحكم"
      onNavigate={onNavigate}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Email */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            البريد الإلكتروني أو رقم الجوال
          </label>
          <div className="relative">
            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder="example@motabe.sa"
              className={`w-full pr-11 pl-4 py-3 bg-white rounded-xl border-2 text-sm focus:outline-none transition-colors ${
                errors.email
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-slate-200 focus:border-[#655ac1]'
              }`}
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-slate-700">كلمة المرور</label>
            <button
              type="button"
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
          <span className="text-sm text-slate-600">تذكّرني على هذا الجهاز</span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-[#655ac1] hover:bg-[#52499d] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base shadow-lg shadow-[#655ac1]/30 hover:shadow-[#655ac1]/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              جاري الدخول...
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              تسجيل الدخول
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gradient-to-b from-[#fcfbff] to-white px-4 text-xs text-slate-500">
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
    </AuthShell>
  );
};

export default LoginPage;
