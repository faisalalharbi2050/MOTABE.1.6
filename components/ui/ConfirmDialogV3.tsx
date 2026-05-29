import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'warning' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

const toneStyles = {
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    confirm: 'bg-[#655ac1] hover:bg-[#5046a0] text-white shadow-[#655ac1]/20',
  },
  danger: {
    icon: AlertTriangle,
    iconColor: 'text-rose-500',
    confirm: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
  },
} as const;

// نسخة متوافقة مع نهج المنصة: الأيقونة بلا خلفية لونية، وزر الإغلاق داخل إطار دائري بلا خلفية.
const ConfirmDialogV3: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  tone = 'warning',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const { iconColor, icon: Icon, confirm } = toneStyles[tone];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center ${iconColor}`}>
              <Icon size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">يرجى مراجعة الإجراء قبل المتابعة</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-7 font-medium text-slate-600">{message}</p>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl border border-slate-300 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 ${confirm}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialogV3;
