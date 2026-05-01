import React from 'react';
import { FileOutput, Printer, Send } from 'lucide-react';

interface Props {
  onOpenLegacyPrint: () => void;
  onOpenLegacySend: () => void;
}

const PrintSendTab: React.FC<Props> = ({ onOpenLegacyPrint, onOpenLegacySend }) => {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-16 flex flex-col items-center justify-center text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-24 h-24 bg-slate-50 rounded-br-[3rem] -z-0" />
      <FileOutput size={48} className="text-[#655ac1] mb-5 relative z-10" strokeWidth={1.6} />
      <h3 className="text-xl font-black text-slate-700 mb-2 relative z-10">طباعة وإرسال المناوبة</h3>
      <p className="text-sm text-slate-400 font-medium relative z-10 max-w-md mb-6">
        ستُدمَج الطباعة والإرسال في تاب واحد بأقسام جانبية في المرحلة القادمة. مؤقتًا يمكنك المتابعة عبر النوافذ الحالية.
      </p>
      <div className="flex gap-3 relative z-10">
        <button
          onClick={onOpenLegacyPrint}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-3 rounded-xl font-bold transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
        >
          <Printer size={18} className="text-[#655ac1]" />
          <span>طباعة المناوبة</span>
        </button>
        <button
          onClick={onOpenLegacySend}
          className="flex items-center gap-2 bg-[#655ac1] text-white px-5 py-3 rounded-xl font-bold shadow-md shadow-[#655ac1]/20 transition-all hover:scale-105 active:scale-95"
        >
          <Send size={18} />
          <span>إرسال المناوبة</span>
        </button>
      </div>
    </div>
  );
};

export default PrintSendTab;
