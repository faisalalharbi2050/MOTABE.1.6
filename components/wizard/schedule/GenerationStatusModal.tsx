import React from 'react';
import { X, Play, Loader2, Database, Users, GraduationCap, Calendar, CheckCircle2 } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col relative">
        
        {/* Close Button (Only if not generating) */}
        {status !== 'generating' && (
             <button onClick={onClose} className="absolute top-4 left-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors z-10">
                <X size={20} />
             </button>
        )}

        {/* Header Graphic */}
        <div className="h-32 bg-[#655ac1] relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 opacity-20">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                 <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400 rounded-full mix-blend-overlay filter blur-2xl translate-y-1/2 -translate-x-1/2"></div>
            </div>
            
            <div className="relative z-10 text-white text-center">
                 <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-white/30">
                     {status === 'generating' ? (
                         <Loader2 size={32} className="animate-spin" />
                     ) : status === 'success' ? (
                         <CheckCircle2 size={32} />
                     ) : (
                         <Database size={32} />
                     )}
                 </div>
                 <h3 className="text-xl font-bold">
                     {status === 'generating' ? 'جاري بناء الجدول...' : 
                      status === 'success' ? 'تم الإنشاء بنجاح!' : 'جاهز للبدء'}
                 </h3>
            </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Users size={16}/></div>
                        <span className="text-xs font-bold text-slate-500">المعلمون</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{stats.teachers}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><GraduationCap size={16}/></div>
                        <span className="text-xs font-bold text-slate-500">الفصول</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{stats.classes}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="flex items-center gap-3 mb-1">
                        <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><Database size={16}/></div>
                        <span className="text-xs font-bold text-slate-500">الإسنادات</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{stats.assignments}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="flex items-center gap-3 mb-1">
                        <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg"><Calendar size={16}/></div>
                        <span className="text-xs font-bold text-slate-500">الحصص/يوم</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{stats.periodsPerDay}</p>
                </div>
            </div>

            {/* Progress Bar (if generating) */}
            {status === 'generating' && (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>التقدم</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                           className="h-full bg-[#655ac1] transition-all duration-300 ease-out"
                           style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-2">جارٍ توزيع الحصص وفق القيود المحددة...</p>
                </div>
            )}

            {/* Info Text (if ready) */}
            {status === 'ready' && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-800 text-sm font-medium leading-relaxed">
                    سيقوم النظام ببناء الجدول تلقائياً بناءً على {stats.assignments} إسناد ومعالجة قيود المعلمون والمواد. تأكد من مراجعة تقرير التعارضات قبل البدء.
                </div>
            )}

            {/* Action Button */}
            {status === 'ready' && (
                <button 
                    onClick={onStart}
                    className="w-full py-4 bg-[#655ac1] text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/20 hover:bg-[#5448a8] hover:shadow-indigo-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                    <Play size={20} fill="currentColor" />
                    بدء البناء الآن
                </button>
            )}

        </div>
      </div>
    </div>
  );
};

export default GenerationStatusModal;
