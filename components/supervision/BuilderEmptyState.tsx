import React from 'react';
import { Sparkles, PenLine, Wand2, ArrowLeft, Users, UserCog } from 'lucide-react';

interface Props {
  onAutoGenerate: () => void;
  onManualStart: () => void;
  /** عدد المشرفين المتاحين للإسناد (يُعرض في كلتا البطاقتين كمعلومة مساعدة). */
  availableCount?: number;
  /** هل يوجد بيانات جدول حصص؟ — يُعطّل التوليد الذكي إن لم تُتوفر. */
  hasTimetable?: boolean;
}

const BuilderEmptyState: React.FC<Props> = ({
  onAutoGenerate,
  onManualStart,
  availableCount,
  hasTimetable = true,
}) => {
  const autoDisabled = !hasTimetable || (availableCount !== undefined && availableCount === 0);
  const autoDisabledReason = !hasTimetable
    ? 'يتطلب التوليد التلقائي وجود جدول حصص — أضِفه أولاً من قسم الجدول الدراسي'
    : (availableCount === 0 ? 'لا يوجد مشرفون متاحون — راجع قائمة المشرفين في الإعدادات' : '');

  return (
    <div dir="rtl" className="space-y-5">
      {/* Choice cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* ════ Auto card ════ */}
        <div
          className={`relative rounded-3xl p-6 border-2 bg-white transition-all flex flex-col ${
            autoDisabled ? 'border-slate-200 opacity-70' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
          }`}
        >
          {availableCount !== undefined && (
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#655ac1] bg-white rounded-full px-3 py-1.5">
                <Users size={12} className="text-[#655ac1]" />
                {availableCount} مشرف متاح
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 mb-4 pl-28">
            <Wand2 size={22} strokeWidth={1.8} className="text-[#655ac1] shrink-0" />
            <h3 className="text-lg font-black text-slate-800">إنشاء جدول آلي</h3>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 mb-4 space-y-3">
            <p className="text-xs font-bold text-slate-700">يوزّع النظام المشرفين تلقائياً وفق التالي:</p>

            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 w-6 h-6 text-[#655ac1] flex items-center justify-center">
                <Users size={14} strokeWidth={2} />
              </span>
              <div className="text-[11px] leading-relaxed text-slate-600">
                <span className="font-bold text-slate-700">المعلمون:</span> للفسحة يُختار من لديه حصة فارغة قبلها أو بعدها، ولإشراف الصلاة من لديه الحصة الأخيرة أو ما قبلها، قدر الإمكان.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 w-6 h-6 text-[#655ac1] flex items-center justify-center">
                <UserCog size={14} strokeWidth={2} />
              </span>
              <div className="text-[11px] leading-relaxed text-slate-600">
                <span className="font-bold text-slate-700">الإداريون:</span> يوزَّعون بالتناوب على الأيام الأقل عددًا.
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/70 text-[11px] font-bold text-[#655ac1]">
              <PenLine size={12} strokeWidth={2.2} className="shrink-0" />
              يمكنك تعديل التوزيع بسهولة بعد إنشائه.
            </div>
          </div>

          <button
            onClick={onAutoGenerate}
            disabled={autoDisabled}
            className={`mt-auto mx-auto w-full max-w-[230px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all ${
              autoDisabled
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#655ac1] border-[#655ac1] text-white hover:bg-[#655ac1] hover:border-[#655ac1] hover:shadow-lg hover:-translate-y-0.5 shadow-md shadow-[#655ac1]/20'
            }`}
          >
            <Sparkles size={16} />
            إنشاء جدول آلي
            <ArrowLeft size={16} />
          </button>

          {autoDisabled && autoDisabledReason && (
            <p className="mt-3 text-[11px] font-bold text-rose-600 leading-relaxed">⚠️ {autoDisabledReason}</p>
          )}
        </div>

        {/* ════ Manual card ════ */}
        <div className="relative rounded-3xl p-6 border-2 bg-white border-slate-200 hover:border-slate-300 hover:shadow-md transition-all flex flex-col">
          {availableCount !== undefined && (
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#655ac1] bg-white rounded-full px-3 py-1.5">
                <Users size={12} className="text-[#655ac1]" />
                {availableCount} مشرف متاح
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 mb-4 pl-28">
            <PenLine size={20} strokeWidth={1.8} className="text-[#655ac1] shrink-0" />
            <h3 className="text-lg font-black text-slate-800">إنشاء جدول يدوي</h3>
          </div>

          <p className="text-xs font-medium text-slate-600 leading-relaxed mb-4">
            أنشئ جدول الإشراف اليومي مفرغًا ووزع المشرفين يدويًا وفق ما يناسبك.
          </p>

          <button
            onClick={onManualStart}
            className="mt-auto mx-auto w-full max-w-[230px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#655ac1] text-sm font-bold bg-[#655ac1] text-white hover:bg-[#655ac1] hover:border-[#655ac1] hover:shadow-lg hover:-translate-y-0.5 shadow-md shadow-[#655ac1]/20 transition-all"
          >
            <PenLine size={16} />
            إنشاء جدول يدوي
            <ArrowLeft size={16} />
          </button>
        </div>
      </div>

      {/* Tip — same style as Basic Settings tip */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
        <span className="text-[11px] font-medium text-amber-800 leading-relaxed">
          💡 يمكنك تغيير طريقة إنشاء الجدول في أي وقت من خلال زر{' '}
          <span className="font-bold text-amber-900">«إعادة الإنشاء»</span> في شريط أدوات الجدول.
        </span>
      </div>
    </div>
  );
};

export default BuilderEmptyState;
