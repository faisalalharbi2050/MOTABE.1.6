import React, { useState } from 'react';
import { UserX, Eye, Shield, ShieldCheck, Clock, ClipboardList, Calendar } from 'lucide-react';
import { DailyScheduleItem } from '../../types';

interface DailyScheduleProps {
  schedule: DailyScheduleItem[];
  title: string;
}

export const DayScheduleCard: React.FC<DailyScheduleProps> = ({ schedule, title }) => {
  const [activeTab, setActiveTab] = useState<'absence' | 'supervision' | 'duty'>('absence');

  // Filter items based on activeTab
  const filteredItems = (schedule || []).filter(item => item.type === activeTab);

  // Mock data if empty
  const displayItems = filteredItems.length > 0 ? filteredItems : (
      activeTab === 'supervision' ? [{id: 'm1', type: 'supervision', name: 'عبدالرحمن الفهد', time: '06:45 صباحاً', location: 'الساحة الخارجية'}] :
      activeTab === 'duty' ? [{id: 'd1', type: 'duty', name: 'الإشراف على المقصف', time: 'الفسحة 1'}] :
      [] 
  );

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full text-right" dir="rtl">
      {/* ... header ... */}
      <div className="flex flex-col items-start gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Calendar size={20} strokeWidth={1.8} className="text-[#8779fb] shrink-0" />
          <h3 className="font-bold text-slate-700 text-lg">{title}</h3>
        </div>
        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl w-full">
            <button 
                onClick={() => setActiveTab('absence')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all border ${activeTab === 'absence' ? 'bg-white text-[#8779fb] shadow-sm border-slate-200' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}
            >
                الغياب
            </button>
            <button 
                onClick={() => setActiveTab('supervision')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all border ${activeTab === 'supervision' ? 'bg-white text-[#8779fb] shadow-sm border-slate-200' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}
            >
                الإشراف
            </button>
            <button 
                onClick={() => setActiveTab('duty')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all border ${activeTab === 'duty' ? 'bg-white text-[#8779fb] shadow-sm border-slate-200' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}
            >
                المناوبة
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2.5">
        {displayItems.length > 0 ? (
          displayItems.map((item, index) => (
            <div key={item.id || index} className="flex items-center gap-3 p-2.5 bg-white rounded-2xl border border-slate-100 hover:border-[#8779fb]/30 transition-colors group">
              <div className={`
                w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors
                ${item.type === 'absence' ? 'text-rose-500' : ''}
                ${item.type === 'supervision' ? 'text-[#8779fb]' : ''}
                ${item.type === 'duty' ? 'text-[#655ac1]' : ''}
                ${!item.type ? 'text-slate-500' : ''}
              `}>
                {item.type === 'absence' && <UserX size={18} />}
                {item.type === 'supervision' && <Eye size={18} />}
                {item.type === 'duty' && <ShieldCheck size={18} />}
                {!item.type && <Clock size={18} />}
              </div>
              <div>
                <p className="font-bold text-slate-700 text-sm">
                    <span className="text-[#655ac1] ml-1 font-mono text-xs">{index + 1}.</span>
                    {item.name}
                </p>
                <div className="flex flex-col gap-0.5">
                    {/* Hide details for specific types as requested */}
                    {!['absence', 'supervision', 'duty'].includes(item.type || '') && (
                        <>
                            {item.location && <span className="text-[10px] text-slate-500">{item.location}</span>}
                            {item.time && <span className="text-[10px] text-slate-400 font-bold">{item.time}</span>}
                        </>
                    )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-slate-300">
            <ClipboardList size={40} strokeWidth={1.5} className="mb-2 opacity-50" />
            <p className="text-xs font-bold">لا توجد بيانات {
                activeTab === 'absence' ? 'غياب' : activeTab === 'supervision' ? 'مناوبة' : 'إشراف'
            }</p>
          </div>
        )}
      </div>
    </div>
  );
};

const DailySchedule: React.FC<DailyScheduleProps> = (props) => {
  return <DayScheduleCard {...props} />;
};

export default DailySchedule;

