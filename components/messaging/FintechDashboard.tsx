import React, { useState } from 'react';
import { Activity, MessageSquare, AlertCircle, Wallet, ChevronRight, ChevronLeft } from 'lucide-react';
import { useMessageArchive } from './MessageArchiveContext';

interface FintechDashboardProps {
  onNavigate?: (tab: string) => void;
}

// TODO: Replace mock data with real API data
const mockWeeklyUsage = [
  { label: 'الأحد',    wa: 85,  sms: 45  },
  { label: 'الإثنين', wa: 45,  sms: 23  },
  { label: 'الثلاثاء', wa: 120, sms: 89  },
  { label: 'الأربعاء', wa: 60,  sms: 34  },
  { label: 'الخميس',  wa: 180, sms: 110 },
];

const WA_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd" />
  </svg>
);

const FintechDashboard: React.FC<FintechDashboardProps> = ({ onNavigate }) => {
  const { stats } = useMessageArchive();
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = previous, etc.

  const maxValue = Math.max(...mockWeeklyUsage.flatMap(d => [d.wa, d.sms]));
  const getPercentage = (value: number) =>
    maxValue === 0 ? 0 : Math.min(100, Math.round((value / maxValue) * 100));

  // ── Week period label ────────────────────────────────────────────────────
  const weekLabel = (() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - day + weekOffset * 7);
    const thursday = new Date(sunday);
    thursday.setDate(sunday.getDate() + 4);

    const fmt = (d: Date) =>
      new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'short' }).format(d);
    const year = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { year: 'numeric' }).format(thursday);

    return `${fmt(sunday)} — ${fmt(thursday)} ${year}`;
  })();

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Top Stats Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">المرسل عبر الواتساب</p>
            <h2 className="text-4xl font-black text-[#25D366]">{stats.whatsappSent.toLocaleString()}</h2>
          </div>
          <div className="p-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">المرسل عبر النصية</p>
            <h2 className="text-4xl font-black text-[#007AFF]">{stats.smsSent.toLocaleString()}</h2>
          </div>
          <div className="p-2"><MessageSquare className="text-[#007AFF]" size={28} /></div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">الرسائل الفاشلة</p>
            <h2 className="text-4xl font-black text-rose-600">{stats.failedCount.toLocaleString()}</h2>
          </div>
          <div className="p-2"><AlertCircle className="text-rose-500" size={28} /></div>
        </div>

      </div>

      {/* ── Balance + Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Balance Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <h3 className="text-lg font-bold text-[#1e293b] mb-6 flex items-center gap-2">
            <Wallet className="text-[#8779fb]" size={20} />
            الرصيد
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-1">{WA_ICON}</div>
                <span className="font-bold text-slate-700">رسائل واتساب</span>
              </div>
              <span className="text-2xl font-black text-slate-800">{stats.balanceWhatsApp.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-1"><MessageSquare size={20} className="text-[#007AFF]" /></div>
                <span className="font-bold text-slate-700">رسائل نصية SMS</span>
              </div>
              <span className="text-2xl font-black text-slate-800">{stats.balanceSMS.toLocaleString()}</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('subscriptions')}
            className="mt-6 w-full py-3 bg-white hover:bg-[#8779fb] text-slate-700 hover:text-white rounded-xl text-sm font-black transition-colors shadow-sm cursor-pointer border-2 border-slate-200 hover:border-[#8779fb]"
          >
            شحن / ترقية الباقة
          </button>
        </div>

        {/* Consumption Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">

          {/* Card header */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">

            {/* Title + week navigator */}
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-[#1e293b] flex items-center gap-2">
                <Activity className="text-[#8779fb]" size={20} />
                الاستهلاك
              </h3>

              <div className="flex items-center gap-1 bg-white border-2 border-[#655ac1] rounded-xl px-1 py-0.5">
                <button
                  onClick={() => setWeekOffset(o => o - 1)}
                  className="p-1 rounded-full hover:bg-[#f0eeff] transition-colors text-[#655ac1]"
                  title="الأسبوع السابق"
                >
                  <ChevronRight size={14} />
                </button>

                <span className="text-xs font-bold text-[#655ac1] px-2 whitespace-nowrap" dir="rtl">
                  {weekLabel}
                </span>

                <button
                  onClick={() => setWeekOffset(o => o + 1)}
                  disabled={weekOffset >= 0}
                  className="p-1 rounded-full hover:bg-[#f0eeff] transition-colors text-[#655ac1] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="الأسبوع التالي"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#25D366]" /> واتساب
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#007AFF]" /> نصية
              </span>
            </div>

          </div>

          {/* Bars */}
          <div className="h-64 flex items-end justify-between gap-2 px-2 md:px-6">
            {mockWeeklyUsage.map((data, i) => (
              <div key={i} className="flex flex-col items-center gap-3 flex-1 group">
                <div className="w-full max-w-[5rem] relative flex items-end justify-center gap-1.5 h-52 bg-slate-50 rounded-t-xl p-1 border-x border-t border-slate-100/50">

                  {/* SMS bar */}
                  <div className="flex-1 w-full flex items-end justify-center h-full relative group/sms">
                    <div
                      style={{ height: `${getPercentage(data.sms)}%` }}
                      className="bg-[#007AFF] transition-all duration-500 rounded-t-lg w-full shadow-sm"
                    />
                    <div className="absolute -top-10 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover/sms:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg border border-slate-700 pointer-events-none">
                      {data.sms.toLocaleString()} نصية
                    </div>
                  </div>

                  {/* WhatsApp bar */}
                  <div className="flex-1 w-full flex items-end justify-center h-full relative group/wa">
                    <div
                      style={{ height: `${getPercentage(data.wa)}%` }}
                      className="bg-[#25D366] transition-all duration-500 rounded-t-lg w-full shadow-sm"
                    />
                    <div className="absolute -top-10 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover/wa:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg border border-slate-700 pointer-events-none">
                      {data.wa.toLocaleString()} واتساب
                    </div>
                  </div>

                </div>
                <span className="text-xs md:text-sm font-bold text-slate-500 text-center">
                  {data.label}
                </span>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};

export default FintechDashboard;
