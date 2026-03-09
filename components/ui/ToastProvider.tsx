import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={20} className="text-green-500 shrink-0" />,
  error:   <XCircle size={20} className="text-red-500 shrink-0" />,
  warning: <AlertTriangle size={20} className="text-yellow-500 shrink-0" />,
  info:    <Info size={20} className="text-[#8779fb] shrink-0" />,
};

const bg: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50',
  error:   'border-red-200 bg-red-50',
  warning: 'border-yellow-200 bg-yellow-50',
  info:    'border-[#e5e1fe] bg-[#f8f7ff]',
};

const text: Record<ToastType, string> = {
  success: 'text-green-800',
  error:   'text-red-800',
  warning: 'text-yellow-800',
  info:    'text-[#655ac1]',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${++counter.current}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-sm animate-fade-in pointer-events-auto ${bg[toast.type]}`}
          >
            {icons[toast.type]}
            <p className={`flex-1 text-sm font-bold leading-relaxed ${text[toast.type]}`}>{toast.message}</p>
            <button onClick={() => dismiss(toast.id)} className={`shrink-0 opacity-50 hover:opacity-100 transition-opacity ${text[toast.type]}`}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
