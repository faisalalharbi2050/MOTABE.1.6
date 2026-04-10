import React, { useState } from 'react';
import { UserX, Eye, ShieldCheck, ClipboardList, Calendar, CalendarDays } from 'lucide-react';
import { DailyScheduleItem } from '../../types';

interface DailyScheduleProps {
  schedule: DailyScheduleItem[];
  title: string;
  officialLeaveText?: string | null;
}

const TAB_LABELS: Record<'absence' | 'supervision' | 'duty', string> = {
  absence: 'الغياب',
  supervision: 'الإشراف',
  duty: 'المناوبة',
};

export const DayScheduleCard: React.FC<DailyScheduleProps> = ({ schedule, title, officialLeaveText: officialLeaveTextFromProps }) => {
  const [activeTab, setActiveTab] = useState<'absence' | 'supervision' | 'duty'>('absence');

  const officialLeaveItem = (schedule || []).find(item => item.isOfficialLeave);
  const officialLeaveText = officialLeaveTextFromProps || officialLeaveItem?.officialLeaveText || officialLeaveItem?.name || 'إجازة رسمية';

  const filteredItems = (schedule || []).filter(item => item.type === activeTab && !item.isOfficialLeave);

  const displayItems = filteredItems.length > 0
    ? filteredItems
    : activeTab === 'supervision'
      ? [{ id: 'm1', type: 'supervision', name: 'عبدالرحمن الفهد', time: '06:45 صباحاً', location: 'الساحة الخارجية' } satisfies DailyScheduleItem]
      : activeTab === 'duty'
        ? [{ id: 'd1', type: 'duty', name: 'الإشراف على المقصف', time: 'الفسحة 1' } satisfies DailyScheduleItem]
        : [];

  return (
    <div className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col min-h-[360px] lg:h-full text-right hover:shadow-md transition-shadow" dir="rtl">
      <div className="flex flex-col items-start gap-4 mb-6">
        <div className="w-full flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={20} strokeWidth={1.8} className="text-[#8779fb] shrink-0" />
            <h3 className="font-bold text-slate-700 text-lg">{title}</h3>
          </div>

          {(officialLeaveItem || officialLeaveTextFromProps) && (
            <div className="w-full rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8f7ff_55%,#f1efff_100%)] px-4 py-3 shadow-[0_10px_24px_-20px_rgba(101,90,193,0.45)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white text-[#655ac1] border border-[#e5e1fe] flex items-center justify-center shrink-0 shadow-sm">
                  <CalendarDays size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#655ac1] leading-6">{officialLeaveText}</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">لا توجد مهام لهذا اليوم.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl w-full">
          <button
            onClick={() => setActiveTab('absence')}
            className={`px-2 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all border ${activeTab === 'absence' ? 'bg-white text-[#8779fb] shadow-sm border-slate-200' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}
          >
            {TAB_LABELS.absence}
          </button>
          <button
            onClick={() => setActiveTab('supervision')}
            className={`px-2 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all border ${activeTab === 'supervision' ? 'bg-white text-[#8779fb] shadow-sm border-slate-200' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}
          >
            {TAB_LABELS.supervision}
          </button>
          <button
            onClick={() => setActiveTab('duty')}
            className={`px-2 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all border ${activeTab === 'duty' ? 'bg-white text-[#8779fb] shadow-sm border-slate-200' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}
          >
            {TAB_LABELS.duty}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-visible lg:overflow-y-auto custom-scrollbar lg:pr-2 space-y-2.5">
        {displayItems.length > 0 ? (
          displayItems.map((item, index) => (
            <div key={item.id || index} className="flex items-center gap-3 p-2.5 bg-white rounded-2xl border border-slate-100 hover:border-[#8779fb]/30 transition-colors group">
              <div
                className={`
                  w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors
                  ${item.type === 'absence' ? 'text-rose-500' : ''}
                  ${item.type === 'supervision' ? 'text-[#8779fb]' : ''}
                  ${item.type === 'duty' ? 'text-[#655ac1]' : ''}
                `}
              >
                {item.type === 'absence' && <UserX size={18} />}
                {item.type === 'supervision' && <Eye size={18} />}
                {item.type === 'duty' && <ShieldCheck size={18} />}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-700 text-sm">
                  <span className="text-[#655ac1] ml-1 font-mono text-xs">{index + 1}.</span>
                  {item.name}
                </p>
                <div className="flex flex-col gap-0.5">
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
            <p className="text-xs font-bold">لا توجد بيانات {TAB_LABELS[activeTab]}</p>
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
