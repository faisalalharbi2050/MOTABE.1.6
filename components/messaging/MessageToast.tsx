import React from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastState {
  type: ToastType;
  message: string;
}

interface MessageToastProps {
  toast: ToastState | null;
  onClose: () => void;
}

const STYLES: Record<ToastType, { wrap: string; iconWrap: string; icon: React.ReactNode }> = {
  success: {
    wrap: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    iconWrap: 'bg-emerald-100',
    icon: <CheckCircle2 size={20} className="text-emerald-600" />,
  },
  error: {
    wrap: 'bg-red-50 border-red-200 text-red-800',
    iconWrap: 'bg-red-100',
    icon: <AlertCircle size={20} className="text-red-600" />,
  },
  warning: {
    wrap: 'bg-amber-50 border-amber-200 text-amber-800',
    iconWrap: 'bg-amber-100',
    icon: <AlertTriangle size={20} className="text-amber-600" />,
  },
  info: {
    wrap: 'bg-blue-50 border-blue-200 text-blue-800',
    iconWrap: 'bg-blue-100',
    icon: <Info size={20} className="text-blue-600" />,
  },
};

/**
 * Unified toast used across the Messages page (composer, archive, templates).
 * Single position + animation so all message notifications look identical.
 */
const MessageToast: React.FC<MessageToastProps> = ({ toast, onClose }) => {
  if (!toast || typeof document === 'undefined') return null;
  const style = STYLES[toast.type];

  return ReactDOM.createPortal(
    <div
      className="fixed z-[9999] pointer-events-none w-full"
      style={{ top: '82px', left: '50%', transform: 'translateX(-50%)', animation: 'toastIn 0.3s ease-out' }}
    >
      <style>{`@keyframes toastIn { from { opacity:0; top:64px; } to { opacity:1; top:82px; } }`}</style>
      <div
        className={`mx-auto max-w-md w-[calc(100%-2rem)] flex items-center gap-3 p-4 rounded-xl shadow-lg border pointer-events-auto transition-all ${style.wrap}`}
      >
        <div className={`p-2 rounded-lg shrink-0 ${style.iconWrap}`}>{style.icon}</div>
        <p className="font-bold text-sm flex-1 leading-relaxed">{toast.message}</p>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>,
    document.body
  );
};

export default MessageToast;
