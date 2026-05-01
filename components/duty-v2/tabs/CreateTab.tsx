import React from 'react';
import { Sparkles, Zap } from 'lucide-react';

interface Props {
  onOpenLegacyCreate: () => void;
}

const CreateTab: React.FC<Props> = ({ onOpenLegacyCreate }) => {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-16 flex flex-col items-center justify-center text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-24 h-24 bg-slate-50 rounded-br-[3rem] -z-0" />
      <Sparkles size={48} className="text-[#655ac1] mb-5 relative z-10" strokeWidth={1.6} />
      <h3 className="text-xl font-black text-slate-700 mb-2 relative z-10">إنشاء جدول المناوبة</h3>
      <p className="text-sm text-slate-400 font-medium relative z-10 max-w-md mb-6">
        ستُحوَّل خطوات الفحص والتوزيع الذكي إلى صفحة كاملة في المرحلة القادمة. مؤقتًا يمكنك المتابعة عبر النافذة الحالية.
      </p>
      <button
        onClick={onOpenLegacyCreate}
        className="flex items-center gap-2 bg-[#655ac1] text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-[#655ac1]/20 transition-all hover:scale-105 active:scale-95 relative z-10"
      >
        <Zap size={18} />
        <span>إنشاء جدول المناوبة</span>
      </button>
    </div>
  );
};

export default CreateTab;
