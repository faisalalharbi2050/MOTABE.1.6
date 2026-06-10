import React, { useState } from 'react';
import { Eye } from 'lucide-react';

/**
 * Unified inline "معاينة الرسالة" control used under the message text field
 * across every send page (المؤلّف + الحصص/الإشراف/المناوبة/الانتظار).
 *
 * - Grey-framed toggle button.
 * - Preview stays closed until the button is clicked.
 * - When open, the message preview shows inside a green frame with no colored background.
 *
 * This is the *message* preview only — it is intentionally separate from any
 * assignment ("معاينة التكليف") preview a page may also offer.
 */
const MessagePreviewInline: React.FC<{
  /** The already-personalised message text to display for the sample recipient. */
  previewText: string;
  /** Name of the sample recipient shown in the preview caption. */
  recipientName?: string;
  /** Disables the toggle (e.g. no recipients / empty message). */
  disabled?: boolean;
  className?: string;
}> = ({ previewText, recipientName, disabled = false, className = '' }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`mt-4 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#655ac1] hover:border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Eye size={14} />
        {open ? 'إخفاء المعاينة' : 'معاينة الرسالة'}
      </button>
      {open && !disabled && (
        <div className="mt-3 p-4 bg-white border border-emerald-400 rounded-2xl">
          <p className="text-[10px] font-bold text-emerald-600 mb-2">
            معاينة — {recipientName || 'مستلم تجريبي'}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{previewText}</p>
        </div>
      )}
    </div>
  );
};

export default MessagePreviewInline;
