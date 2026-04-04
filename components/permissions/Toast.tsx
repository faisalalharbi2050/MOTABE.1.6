import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning';
export interface ToastState { message: string; type: ToastType }

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, showToast };
}

interface ToastProps { toast: ToastState | null }

export default function Toast({ toast }: ToastProps) {
  if (!toast || typeof document === 'undefined') return null;
  return ReactDOM.createPortal(
    <div
      className="fixed z-[9999] pointer-events-none w-full"
      style={{ top: '82px', left: '50%', transform: 'translateX(-50%)', animation: 'toastIn 0.3s ease-out' }}
    >
      <style>{`@keyframes toastIn { from { opacity:0; top:64px; } to { opacity:1; top:82px; } }`}</style>
      <div className={`mx-auto max-w-md w-full shadow-lg rounded-2xl p-4 flex items-center gap-3 border pointer-events-auto
        ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          toast.type === 'error'   ? 'bg-rose-50 border-rose-200 text-rose-800' :
          'bg-amber-50 border-amber-200 text-amber-800'}`}
      >
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          ${toast.type === 'success' ? 'bg-emerald-100' :
            toast.type === 'error'   ? 'bg-rose-100' : 'bg-amber-100'}`}
        >
          {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-600" />}
          {toast.type === 'error'   && <AlertCircle  size={20} className="text-rose-600" />}
          {toast.type === 'warning' && <AlertTriangle size={20} className="text-amber-600" />}
        </div>
        <p className="font-bold text-sm flex-1 leading-relaxed">{toast.message}</p>
      </div>
    </div>,
    document.body
  );
}
