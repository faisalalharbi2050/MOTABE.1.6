import React from 'react';
import { AlertCircle, Check, Info, Phone } from 'lucide-react';

export const primaryButton =
  'w-full min-h-11 px-4 py-3 rounded-xl bg-[#655ac1] text-sm text-white font-black shadow-md shadow-[#655ac1]/20 transition-all hover:bg-[#52499d] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2';

export const secondaryButton =
  'w-full min-h-11 px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm text-slate-700 font-black transition-colors hover:border-[#655ac1]/35 hover:bg-[#655ac1]/5 flex items-center justify-center gap-2';

export const inputClass = (hasError = false) =>
  `w-full rounded-xl border-2 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 ${
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-50'
      : 'border-slate-200 focus:border-[#655ac1] focus:ring-4 focus:ring-[#655ac1]/10'
  }`;

export const DemoNotice: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2.5 rounded-xl border border-[#655ac1]/15 bg-[#655ac1]/5 px-4 py-3 text-xs leading-6 text-slate-600">
    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#655ac1]" />
    <span>{children ?? 'هذه تجربة تفاعلية للواجهة، وسيقوم المطور بربطها بخدمة المصادقة والرسائل.'}</span>
  </div>
);

export const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-red-600">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  ) : null;

export const PhoneField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}> = ({ value, onChange, error, disabled, required = false }) => (
  <div>
    <label className="mb-2 block text-sm font-black text-slate-700">
      رقم الجوال {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <Phone className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="tel"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value.replace(/[^\d+\s-]/g, ''))}
        placeholder="05xxxxxxxx"
        dir="ltr"
        style={{ textAlign: 'right' }}
        className={`${inputClass(Boolean(error))} pr-11 disabled:bg-slate-50 disabled:text-slate-500`}
      />
    </div>
    <FieldError message={error} />
  </div>
);

export const OtpInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}> = ({ value, onChange, error, autoFocus }) => (
  <div>
    <label className="mb-2 block text-sm font-black text-slate-700">رمز التحقق</label>
    <input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
      maxLength={6}
      placeholder="— — — — — —"
      dir="ltr"
      className={`${inputClass(Boolean(error))} text-center text-xl tracking-[0.55em]`}
    />
    <FieldError message={error} />
  </div>
);

export const ProgressSteps: React.FC<{ current: number; labels: string[] }> = ({ current, labels }) => (
  <div className="mb-5 flex items-start justify-center" aria-label="مراحل التفعيل">
    {labels.map((label, index) => {
      const number = index + 1;
      const complete = number < current;
      const active = number === current;
      return (
        <React.Fragment key={label}>
          <div className="flex w-[4.25rem] flex-col items-center gap-1.5 text-center sm:w-24">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-black transition-colors ${
                complete
                  ? 'border-[#655ac1] bg-[#655ac1] text-white'
                  : active
                    ? 'border-[#655ac1] bg-white text-[#655ac1] ring-4 ring-[#655ac1]/10'
                    : 'border-slate-200 bg-white text-slate-400'
              }`}
            >
              {complete ? <Check className="h-4 w-4" /> : number}
            </span>
            <span className={`text-[10px] font-bold sm:text-[11px] ${active || complete ? 'text-[#655ac1]' : 'text-slate-400'}`}>
              {label}
            </span>
          </div>
          {index < labels.length - 1 && (
            <span className={`mt-3.5 h-0.5 w-4 sm:w-9 ${number < current ? 'bg-[#655ac1]' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

export const isSaudiMobile = (phone: string) => /^(?:\+?966|0)?5\d{8}$/.test(phone.replace(/[\s-]/g, ''));
