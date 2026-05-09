import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, UserPlus, User, Phone, School, Briefcase, Check } from 'lucide-react';
import AuthShell from './AuthShell';
import SocialAuthButtons from './SocialAuthButtons';
import { MarketingRoute } from './MarketingApp';

interface Props {
  onNavigate: (r: MarketingRoute) => void;
  onAuthenticated: () => void;
}

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  schoolName: string;
  role: '' | 'manager' | 'vice';
  password: string;
  agree: boolean;
}

const RegisterPage: React.FC<Props> = ({ onNavigate, onAuthenticated }) => {
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    phone: '',
    schoolName: '',
    role: '',
    password: '',
    agree: false,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const validate = () => {
    const errs: typeof errors = {};
    if (!form.fullName.trim()) errs.fullName = 'الاسم الكامل مطلوب';
    if (!form.email.trim()) errs.email = 'البريد الإلكتروني مطلوب';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'صيغة البريد غير صحيحة';
    if (!form.phone.trim()) errs.phone = 'رقم الجوال مطلوب';
    else if (!/^(05|5)\d{8}$/.test(form.phone.replace(/\s/g, ''))) errs.phone = 'صيغة رقم الجوال غير صحيحة';
    if (!form.schoolName.trim()) errs.schoolName = 'اسم المدرسة مطلوب';
    if (!form.role) errs.role = 'حدد منصبك';
    if (!form.password) errs.password = 'كلمة المرور مطلوبة';
    else if (form.password.length < 8) errs.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    if (!form.agree) errs.agree = 'يجب الموافقة على الشروط للمتابعة';
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
    }, 700);
  };

  const pwdStrength = (() => {
    const p = form.password;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p) || /[؀-ۿ]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();

  return (
    <AuthShell
      title="أنشئ حساباً جديداً"
      subtitle="ابدأ تجربتك المجانية لمدة 10 أيام بدون بطاقة ائتمان"
      onNavigate={onNavigate}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <SocialAuthButtons />

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gradient-to-b from-[#fcfbff] to-white px-4 text-xs text-slate-500">
              أو أنشئ حساباً بالتسجيل اليدوي
            </span>
          </div>
        </div>

        {/* Full name */}
        <Field
          label="الاسم الكامل"
          icon={User}
          error={errors.fullName}
          input={
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              placeholder="مثال: عبدالله بن محمد"
              className={inputCls(errors.fullName)}
            />
          }
        />

        {/* Email & Phone */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="البريد الإلكتروني"
            icon={Mail}
            error={errors.email}
            input={
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="you@motabe.sa"
                className={inputCls(errors.email)}
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            }
          />
          <Field
            label="رقم الجوال"
            icon={Phone}
            error={errors.phone}
            input={
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="05xxxxxxxx"
                className={inputCls(errors.phone)}
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            }
          />
        </div>

        {/* School & Role */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="اسم المدرسة"
            icon={School}
            error={errors.schoolName}
            input={
              <input
                type="text"
                value={form.schoolName}
                onChange={(e) => update('schoolName', e.target.value)}
                placeholder="مدرسة..."
                className={inputCls(errors.schoolName)}
              />
            }
          />
          <Field
            label="المنصب"
            icon={Briefcase}
            error={errors.role}
            input={
              <select
                value={form.role}
                onChange={(e) => update('role', e.target.value as FormState['role'])}
                className={inputCls(errors.role) + ' appearance-none cursor-pointer'}
              >
                <option value="">اختر منصبك</option>
                <option value="manager">مدير المدرسة</option>
                <option value="vice">وكيل المدرسة</option>
              </select>
            }
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور</label>
          <div className="relative">
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="8 أحرف على الأقل"
              className={`${inputCls(errors.password)} pl-12`}
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
          {errors.password ? (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.password}
            </p>
          ) : (
            pwdStrength !== null && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      pwdStrength <= 1
                        ? 'w-1/4 bg-red-400'
                        : pwdStrength === 2
                        ? 'w-2/4 bg-amber-400'
                        : pwdStrength === 3
                        ? 'w-3/4 bg-[#8779fb]'
                        : 'w-full bg-green-500'
                    }`}
                  />
                </div>
                <span className="text-xs text-slate-500 w-16 text-left">
                  {pwdStrength <= 1 ? 'ضعيفة' : pwdStrength === 2 ? 'متوسطة' : pwdStrength === 3 ? 'جيدة' : 'قوية'}
                </span>
              </div>
            )
          )}
        </div>

        {/* Agreement */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={form.agree}
            onChange={(e) => update('agree', e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded accent-[#655ac1] shrink-0"
          />
          <span className="text-sm text-slate-600 leading-relaxed">
            أوافق على{' '}
            <button
              type="button"
              onClick={() => onNavigate('terms')}
              className="text-[#655ac1] hover:text-[#52499d] font-bold"
            >
              الشروط والأحكام
            </button>{' '}
            و{' '}
            <button
              type="button"
              onClick={() => onNavigate('privacy')}
              className="text-[#655ac1] hover:text-[#52499d] font-bold"
            >
              سياسة الخصوصية
            </button>
          </span>
        </label>
        {errors.agree && (
          <p className="text-xs text-red-600 flex items-center gap-1 -mt-2">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.agree}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-[#655ac1] hover:bg-[#52499d] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base shadow-lg shadow-[#655ac1]/30 hover:shadow-[#655ac1]/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-4"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              جاري إنشاء الحساب...
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              ابدأ تجربتي المجانية
            </>
          )}
        </button>

        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-start gap-2.5 mt-3">
          <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          <p className="text-xs text-green-800 leading-relaxed">
            تجربة مجانية لمدة <strong>10 أيام كاملة</strong> — بدون بطاقة ائتمان، وبدون التزام.
          </p>
        </div>

        <p className="text-center text-sm text-slate-600 pt-2">
          لديك حساب بالفعل؟{' '}
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="text-[#655ac1] hover:text-[#52499d] font-bold"
          >
            تسجيل الدخول
          </button>
        </p>
      </form>
    </AuthShell>
  );
};

const inputCls = (err?: string) =>
  `w-full pr-11 pl-4 py-3 bg-white rounded-xl border-2 text-sm focus:outline-none transition-colors ${
    err ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-[#655ac1]'
  }`;

const Field: React.FC<{
  label: string;
  icon: React.ComponentType<any>;
  error?: string;
  input: React.ReactNode;
}> = ({ label, icon: Icon, error, input }) => (
  <div>
    <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
    <div className="relative">
      <Icon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
      {input}
    </div>
    {error && (
      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5" />
        {error}
      </p>
    )}
  </div>
);

export default RegisterPage;
