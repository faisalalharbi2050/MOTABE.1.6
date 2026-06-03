import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * مكوّنات تحكم مشتركة لإعدادات الإشراف (والمناوبة لاحقاً).
 * - Switch: مفتاح تفعيل/تعطيل انزلاقي أنيق (RTL).
 * - SegmentedToggle: خيار ثنائي/متعدّد بقطعة نشطة ملوّنة.
 * - CheckDropdown: قائمة منسدلة بشيك‑بكس وعلامة صح (بنمط قائمة الكيان في معلومات عامة).
 */

export const Switch: React.FC<{ checked: boolean; onChange: () => void; title?: string }> = ({ checked, onChange, title }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    title={title ?? (checked ? 'تعطيل' : 'تفعيل')}
    className={`relative h-6 w-11 rounded-full transition-colors duration-300 shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
      checked ? 'bg-emerald-500 focus:ring-emerald-300' : 'bg-slate-300 focus:ring-slate-300'
    }`}
  >
    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ${checked ? 'right-1' : 'left-1'}`} />
  </button>
);

export type SegOption<T> = { value: T; label: React.ReactNode; activeClass?: string };

export function SegmentedToggle<T extends string | number | boolean>({
  value, onChange, options, className = '', fluid = false,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegOption<T>[];
  className?: string;
  fluid?: boolean;
}) {
  return (
    <div className={`${fluid ? 'flex w-full' : 'inline-flex shrink-0'} items-center gap-1 bg-slate-100 rounded-xl p-1 ${className}`}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${fluid ? 'flex-1' : ''} ${
              active ? (opt.activeClass ?? 'bg-white text-[#655ac1] shadow-sm') : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function CheckDropdown<T extends string | number>({
  value, onChange, options, className = '',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const current = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-[13px] rounded-lg hover:border-[#655ac1]/40 transition-all flex items-center justify-between gap-2"
      >
        <span className="truncate">{current?.label ?? ''}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 animate-in slide-in-from-top-2">
          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {options.map(opt => {
              const sel = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                    sel ? 'text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all shrink-0 ${
                    sel ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                  }`}>
                    <Check size={12} strokeWidth={3.5} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
