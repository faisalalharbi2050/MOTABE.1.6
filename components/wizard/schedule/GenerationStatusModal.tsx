import React from 'react';
import { X, Play, Users, LayoutGrid, ClipboardList, CalendarDays, CheckCircle2, Sparkles, Info } from 'lucide-react';
import LoadingLogo, { useMinLoadingTime } from '../../ui/LoadingLogo';

interface GenerationStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  status: 'ready' | 'generating' | 'success';
  stats: {
    teachers: number;
    classes: number;
    assignments: number;
    periodsPerDay: number;
    activeDays: number;
  };
  progress?: number;
}

const GenerationStatusModal: React.FC<GenerationStatusModalProps> = ({
  isOpen, onClose, onStart, status, stats, progress = 0
}) => {
  // إبقاء طور "جاري البناء" ظاهرًا 2.5 ثانية على الأقل حتى لو انتهى التوليد بسرعة
  const stickyGenerating = useMinLoadingTime(status === 'generating', 2500);
  if (!isOpen) return null;
  const displayStatus = stickyGenerating ? 'generating' : status;

  const cards = [
    { label: 'المعلمون',   value: stats.teachers,    icon: Users        },
    { label: 'الفصول',     value: stats.classes,     icon: LayoutGrid   },
    { label: 'الإسنادات',  value: stats.assignments, icon: ClipboardList },
    { label: 'الحصص / يوم', value: stats.periodsPerDay, icon: CalendarDays },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col relative">

        {/* Close Button (Only if not generating) */}
        {displayStatus !== 'generating' && (
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors z-10"
          >
            <X size={20} />
          </button>
        )}

        {/* Header — White */}
        <div className="px-7 pt-7 pb-5 border-b border-slate-100 flex items-center gap-4">
          {displayStatus !== 'generating' && (
            <div className="flex items-center justify-center shrink-0">
              {displayStatus === 'success' ? (
                <CheckCircle2 size={24} className="text-[#655ac1]" />
              ) : (
                <Sparkles size={24} className="text-[#655ac1]" />
              )}
            </div>
          )}
          <div>
            <h3 className="text-xl font-black text-slate-800">
              {displayStatus === 'generating' ? 'جاري بناء الجدول...' :
               displayStatus === 'success'    ? 'تم إنشاء الجدول بنجاح!' :
               'إنشاء جدول الحصص'}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-7 space-y-5">

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {cards.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-md shadow-slate-200/70"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <Icon size={15} className="text-[#655ac1]" />
                  <span className="text-xs font-bold text-[#655ac1]">{label}</span>
                </div>
                <p className="text-2xl font-black text-[#655ac1]">{value}</p>
              </div>
            ))}
          </div>

          {/* Progress Bar (if generating) */}
          {displayStatus === 'generating' && (
            <div className="space-y-3">
              <div className="flex justify-center py-2">
                <LoadingLogo size="md" />
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>التقدم</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-[#655ac1] to-[#7f75d0] transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-xs text-slate-400 mt-1">جارٍ توزيع الحصص وفق القيود المحددة...</p>
            </div>
          )}

          {/* Info Text (if ready) */}
          {displayStatus === 'ready' && (
            <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div className="p-1 bg-indigo-100 text-indigo-500 rounded-lg shrink-0 mt-0.5">
                <Info size={14} />
              </div>
              <ul className="text-indigo-800 text-sm font-medium leading-relaxed space-y-1.5 list-disc list-inside">
                <li>سيقوم النظام ببناء الجدول تلقائياً بناءً على إسناد المواد وعدد الفصول وقيود المعلمون والمواد.</li>
                <li>سيظهر لك تقرير بالتعارضات حال وجودها.</li>
              </ul>
            </div>
          )}

          {/* Action Button */}
          {displayStatus === 'ready' && (
            <button
              onClick={onStart}
              className="w-full py-4 bg-gradient-to-l from-[#655ac1] to-[#7f75d0] text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Play size={20} fill="currentColor" />
              بدء إنشاء جدول الحصص
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default GenerationStatusModal;
