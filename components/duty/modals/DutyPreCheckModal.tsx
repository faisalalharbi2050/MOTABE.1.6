import React from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Settings, Zap, Shield } from 'lucide-react';

export interface DutyPreCheckItem {
  label: string;
  detail: string;
  status: 'ok' | 'warning' | 'error';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  onGoToSettings: () => void;
  checks: DutyPreCheckItem[];
}

const DutyPreCheckModal: React.FC<Props> = ({ isOpen, onClose, onProceed, onGoToSettings, checks }) => {
  if (!isOpen) return null;

  const hasError = checks.some(c => c.status === 'error');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <Shield size={20} className="text-[#655ac1]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">قبل إنشاء جدول المناوبة</h3>
              <p className="text-xs text-slate-400 mt-0.5">تحقق من اكتمال الإعداد</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Checks */}
        <div className="p-6 space-y-3">
          {checks.map((check, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white">
              <div className="shrink-0 mt-0.5">
                {check.status === 'ok'      && <CheckCircle  size={18} className="text-emerald-500" />}
                {check.status === 'warning' && <AlertTriangle size={18} className="text-amber-500" />}
                {check.status === 'error'   && <XCircle       size={18} className="text-rose-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${
                  check.status === 'ok'      ? 'text-emerald-800' :
                  check.status === 'warning' ? 'text-amber-800'   :
                  'text-rose-800'
                }`}>{check.label}</p>
                <p className={`text-xs mt-0.5 ${
                  check.status === 'ok'      ? 'text-emerald-600' :
                  check.status === 'warning' ? 'text-amber-600'   :
                  'text-rose-600'
                }`}>{check.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={() => { onClose(); onGoToSettings(); }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl border border-slate-300 transition-colors"
          >
            <Settings size={16} />
            تعديل الإعدادات
          </button>
          <button
            onClick={onProceed}
            disabled={hasError}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all shadow-md ${
              hasError
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-[#655ac1] hover:bg-[#5046a0] text-white shadow-[#655ac1]/20 hover:scale-105 active:scale-95'
            }`}
          >
            <Zap size={16} />
            متابعة الإنشاء
          </button>
        </div>
      </div>
    </div>
  );
};

export default DutyPreCheckModal;
