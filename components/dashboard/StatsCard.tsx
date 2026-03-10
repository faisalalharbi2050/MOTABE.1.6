import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: string;
  trendUp?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, trend, trendUp }) => {
  return (
    <div className="bg-white p-5 rounded-[2rem] shadow-md border border-slate-100 flex items-center gap-4 transition-shadow cursor-pointer group h-full">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center scale-105 transition-transform duration-300`}>
        <Icon className={`w-7 h-7 text-[#8779fb]`} strokeWidth={2} />
      </div>
      <div>
        <h3 className="text-slate-500 font-bold text-sm mb-1">{title}</h3>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-black text-slate-800 tracking-tight">{value}</span>
          {trend && (
             <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-1 ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {trend} {trendUp ? '↑' : '↓'}
             </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
