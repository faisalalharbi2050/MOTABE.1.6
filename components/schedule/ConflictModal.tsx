import React from 'react';
import { X, AlertTriangle, CheckCircle2, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { ValidationWarning } from '../../utils/scheduleConstraints';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  warnings: ValidationWarning[];
  onContinue: (bypass: boolean) => void;
  isGenerating: boolean;
  onNavigateTo?: (type: 'subject' | 'teacher' | 'general', id?: string) => void;
}

const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onClose,
  warnings,
  onContinue,
  isGenerating,
  onNavigateTo
}) => {
  if (!isOpen) return null;

  const errors = warnings.filter(w => w.level === 'error');
  const warningList = warnings.filter(w => w.level === 'warning');
  const hasErrors = errors.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 border border-slate-100 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className={`relative overflow-hidden p-6 border-b flex justify-between items-center ${
          hasErrors ? 'bg-gradient-to-l from-rose-50 to-red-50 border-rose-100' : 'bg-gradient-to-l from-emerald-50 to-teal-50 border-emerald-100'
        }`}>
          {/* Decorative blob */}
          <div className={`absolute top-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-30 -translate-y-1/2 -translate-x-1/2 ${
            hasErrors ? 'bg-rose-300' : 'bg-emerald-300'
          }`} />

          <div className="relative flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
              hasErrors
                ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-200'
                : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200'
            }`}>
              {hasErrors
                ? <AlertTriangle size={22} className="text-white" strokeWidth={2.5} />
                : <CheckCircle2 size={22} className="text-white" strokeWidth={2.5} />
              }
            </div>
            <div>
              <h3 className={`font-black text-xl ${hasErrors ? 'text-rose-700' : 'text-slate-800'}`}>
                {hasErrors ? 'هناك تعارضات تمنع أو تصعّب بناء الجدول' : 'جاهز لبناء الجدول'}
              </h3>
              <p className={`text-sm font-bold mt-0.5 ${hasErrors ? 'text-rose-500' : 'text-slate-400'}`}>
                {hasErrors
                  ? `تم اكتشاف ${errors.length} خطأ و ${warningList.length} تنبيه`
                  : 'جميع القيود تبدو منطقية، ولكن قد توجد بعض الملاحظات'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`relative p-2 rounded-full transition-colors ${
              hasErrors ? 'hover:bg-rose-100 text-rose-400' : 'hover:bg-slate-100 text-slate-400'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

          {/* Errors Section */}
          {errors.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-rose-100 rounded-lg">
                  <AlertCircle size={14} className="text-rose-600" />
                </div>
                <h4 className="font-black text-rose-600 text-sm">
                  أخطاء يجب معالجتها
                </h4>
                <span className="mr-auto text-xs font-black bg-rose-100 text-rose-600 px-2.5 py-0.5 rounded-full">
                  {errors.length}
                </span>
              </div>

              {errors.map((err, idx) => (
                <div
                  key={idx}
                  className="bg-rose-50 border border-rose-100 rounded-2xl overflow-hidden flex"
                >
                  {/* Left accent bar */}
                  <div className="w-1 bg-gradient-to-b from-rose-400 to-red-500 shrink-0" />
                  <div className="flex-1 p-4 flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                      <X size={13} className="text-rose-500" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-rose-800">{err.message}</p>
                      {err.suggestion && (
                        <p className="text-xs font-medium text-rose-500 mt-1.5 flex items-center gap-1">
                          <Info size={11} />
                          اقتراح: {err.suggestion}
                        </p>
                      )}
                    </div>
                    {onNavigateTo && err.type && (
                      <button
                        onClick={() => onNavigateTo(err.type, err.relatedId)}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-rose-600 bg-white border border-rose-200 hover:bg-rose-100 rounded-xl transition-colors text-xs font-bold"
                        title="الذهاب لصفحة التعديل"
                      >
                        <span>تعديل</span>
                        <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warnings Section */}
          {warningList.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-amber-100 rounded-lg">
                  <AlertTriangle size={14} className="text-amber-600" />
                </div>
                <h4 className="font-black text-amber-600 text-sm">
                  تنبيهات قد تؤثر على الجودة
                </h4>
                <span className="mr-auto text-xs font-black bg-amber-100 text-amber-600 px-2.5 py-0.5 rounded-full">
                  {warningList.length}
                </span>
              </div>

              {warningList.map((warn, idx) => (
                <div
                  key={idx}
                  className="bg-amber-50 border border-amber-100 rounded-2xl overflow-hidden flex"
                >
                  {/* Left accent bar */}
                  <div className="w-1 bg-gradient-to-b from-amber-400 to-orange-400 shrink-0" />
                  <div className="flex-1 p-4 flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                      <AlertTriangle size={13} className="text-amber-500" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-amber-800">{warn.message}</p>
                      {warn.suggestion && (
                        <p className="text-xs font-medium text-amber-500 mt-1.5">
                          اقتراح: {warn.suggestion}
                        </p>
                      )}
                    </div>
                    {onNavigateTo && warn.type && (
                      <button
                        onClick={() => onNavigateTo(warn.type, warn.relatedId)}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-amber-600 bg-white border border-amber-200 hover:bg-amber-100 rounded-xl transition-colors text-xs font-bold"
                        title="الذهاب لصفحة التعديل"
                      >
                        <span>تعديل</span>
                        <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State - No warnings at all */}
          {warnings.length === 0 && (
            <div className="text-center py-12">
              <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                  <CheckCircle2 size={34} className="text-white" />
                </div>
              </div>
              <p className="font-black text-slate-700 text-lg">البيانات تبدو سليمة ومنطقية</p>
              <p className="text-sm text-slate-400 mt-2">يمكنك البدء بعملية التوليد الآلي الآن.</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 flex-wrap">
          <button
            onClick={() => onContinue(hasErrors)}
            disabled={isGenerating}
            className={`flex-1 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
              ${hasErrors
                ? 'bg-gradient-to-l from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-rose-200'
                : 'bg-gradient-to-l from-[#655ac1] to-[#7f75d0] hover:shadow-[#655ac1]/30 hover:-translate-y-0.5'}
              ${isGenerating ? 'opacity-70 cursor-not-allowed transform-none' : ''}
            `}
          >
            {isGenerating ? (
              'جاري البدء...'
            ) : (
              hasErrors ? 'تجاوز الأخطاء التلقائي والمحاولة' : 'بدء بناء الجدول ذكي'
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-6 py-3.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            إلغاء ومراجعة يدوية
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConflictModal;
