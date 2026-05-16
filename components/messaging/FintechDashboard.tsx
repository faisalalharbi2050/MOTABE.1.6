import React, { useMemo, useState } from 'react';
import { Activity, MessageSquare, AlertCircle, Hourglass, ChevronRight, ChevronLeft } from 'lucide-react';
import { useMessageArchive } from './MessageArchiveContext';
import { SchoolInfo, SubscriptionInfo } from '../../types';
import { buildAcademicWeeks, getCurrentAcademicSemester, toLocalISODate } from '../../utils/academicCalendar';

interface FintechDashboardProps {
  onNavigate?: (tab: string) => void;
  subscription?: SubscriptionInfo;
  schoolInfo?: SchoolInfo | null;
}

type CalendarType = 'hijri' | 'gregorian';

const ARABIC_DAY_LABELS: Record<string, string> = {
  Sunday: 'الأحد', Monday: 'الإثنين', Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت',
};

const arabicDayFromISO = (iso: string): string => {
  const eng = new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
  return ARABIC_DAY_LABELS[eng] || eng;
};

const formatDatePart = (iso: string, calendarType: CalendarType): string => {
  const d = new Date(`${iso}T00:00:00`);
  try {
    return calendarType === 'hijri'
      ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'short' }).format(d)
      : new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'short' }).format(d);
  } catch { return iso; }
};

const formatYear = (iso: string, calendarType: CalendarType): string => {
  const d = new Date(`${iso}T00:00:00`);
  try {
    return calendarType === 'hijri'
      ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { year: 'numeric' }).format(d)
      : new Intl.DateTimeFormat('ar-SA', { year: 'numeric' }).format(d);
  } catch { return ''; }
};

// TODO: Replace mock data with real API data
const mockUsageByDay = (date: string): { wa: number; sms: number } => {
  let seed = 0;
  for (let i = 0; i < date.length; i++) seed = (seed * 31 + date.charCodeAt(i)) >>> 0;
  return { wa: 30 + (seed % 170), sms: 10 + ((seed >> 8) % 110) };
};

const WA_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd" />
  </svg>
);

const FintechDashboard: React.FC<FintechDashboardProps> = ({ onNavigate, subscription, schoolInfo }) => {
  const { stats } = useMessageArchive();
  const [calendarType, setCalendarType] = useState<CalendarType>(
    (schoolInfo?.calendarType === 'gregorian' ? 'gregorian' : 'hijri') as CalendarType
  );

  const freeWaTotal = 50;
  const freeSmsTotal = 10;
  const waRemaining = subscription?.freeWaRemaining ?? stats.balanceWhatsApp;
  const smsRemaining = subscription?.freeSmsRemaining ?? stats.balanceSMS;
  const waUsed = Math.max(0, freeWaTotal - waRemaining);
  const smsUsed = Math.max(0, freeSmsTotal - smsRemaining);
  const waPercentage = (waUsed / freeWaTotal) * 100;
  const smsPercentage = (smsUsed / freeSmsTotal) * 100;

  // ── Academic weeks for the current semester ──────────────────────────────
  const academicWeeks = useMemo(() => {
    const semester = getCurrentAcademicSemester(schoolInfo ?? undefined);
    return buildAcademicWeeks(semester);
  }, [schoolInfo]);

  const todayStr = toLocalISODate(new Date());
  const initialWeekIdx = useMemo(() => {
    if (academicWeeks.length === 0) return 0;
    const inRange = academicWeeks.findIndex(w => todayStr >= w.start && todayStr <= w.end);
    if (inRange >= 0) return inRange;
    const next = academicWeeks.findIndex(w => w.start > todayStr);
    return next >= 0 ? next : academicWeeks.length - 1;
  }, [academicWeeks, todayStr]);

  const [weekIdx, setWeekIdx] = useState<number>(initialWeekIdx);
  React.useEffect(() => { setWeekIdx(initialWeekIdx); }, [initialWeekIdx]);

  const currentWeek = academicWeeks[weekIdx];
  const weekDates: string[] = currentWeek?.days ?? [];
  const weeklyUsage = useMemo(
    () => weekDates.map(d => ({ date: d, label: arabicDayFromISO(d), ...mockUsageByDay(d) })),
    [weekDates]
  );

  const maxValue = Math.max(0, ...weeklyUsage.flatMap(d => [d.wa, d.sms]));
  const getPercentage = (value: number) =>
    maxValue === 0 ? 0 : Math.min(100, Math.round((value / maxValue) * 100));

  // ── Week period label ────────────────────────────────────────────────────
  const weekLabel = currentWeek
    ? `الأسبوع ${currentWeek.number} • ${formatDatePart(currentWeek.start, calendarType)} — ${formatDatePart(currentWeek.end, calendarType)} ${formatYear(currentWeek.end, calendarType)}`
    : 'لم تُعرّف الأسابيع الدراسية بعد';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Top Stats Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">المرسل عبر الواتساب</p>
            <h2 className="text-2xl font-extrabold text-slate-800">{stats.whatsappSent.toLocaleString()}</h2>
          </div>
          <div className="p-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">المرسل عبر النصية</p>
            <h2 className="text-2xl font-extrabold text-slate-800">{stats.smsSent.toLocaleString()}</h2>
          </div>
          <div className="p-2"><MessageSquare className="text-[#007AFF]" size={28} /></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">الرسائل الفاشلة</p>
            <h2 className="text-2xl font-extrabold text-slate-800">{stats.failedCount.toLocaleString()}</h2>
          </div>
          <div className="p-2"><AlertCircle className="text-rose-500" size={28} /></div>
        </div>

      </div>

      {/* ── Balance + Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Balance Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="p-2 bg-amber-50 text-amber-500 rounded-xl shrink-0">
              <Hourglass size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">رصيد الرسائل</h3>
            </div>
          </div>

          <div className="flex flex-col justify-between flex-1 gap-4">
            {/* WhatsApp */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                <span className="flex items-center gap-1.5">{WA_ICON} واتساب</span>
                <span className="text-slate-600">{waUsed} مُرسلة من أصل {freeWaTotal}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${waPercentage > 80 ? 'bg-red-500' : 'bg-[#25D366]'}`}
                  style={{ width: `${waPercentage}%` }}
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* SMS */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-[#007AFF]" /> نصية SMS
                </span>
                <span className="text-slate-600">{smsUsed} مُرسلة من أصل {freeSmsTotal}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${smsPercentage > 80 ? 'bg-red-500' : 'bg-[#007AFF]'}`}
                  style={{ width: `${smsPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('subscription_message_packages')}
            className="mt-5 w-full py-2.5 bg-white hover:bg-[#655ac1] text-slate-700 hover:text-white rounded-xl text-xs font-black transition-colors shadow-sm cursor-pointer border-2 border-slate-200 hover:border-[#655ac1]"
          >
            شحن / ترقية الباقة
          </button>
        </div>

        {/* Consumption Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">

          {/* Card header */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-5">

            {/* Title + calendar toggle + week navigator */}
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-sm font-bold text-[#1e293b] flex items-center gap-2">
                <Activity className="text-[#8779fb]" size={20} />
                الاستهلاك
              </h3>

              {/* Hijri / Gregorian toggle */}
              <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5">
                {[
                  { value: 'hijri', label: 'هجري' },
                  { value: 'gregorian', label: 'ميلادي' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCalendarType(option.value as CalendarType)}
                    className={`px-2 py-1 rounded-md text-[10px] font-black transition-all ${
                      calendarType === option.value ? 'bg-[#655ac1] text-white' : 'text-slate-500 hover:text-[#655ac1]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-white border-2 border-slate-200 rounded-xl px-1 py-0.5">
                <button
                  onClick={() => setWeekIdx(i => Math.max(0, i - 1))}
                  disabled={weekIdx <= 0 || academicWeeks.length === 0}
                  className="p-1 rounded-full hover:bg-slate-100 transition-colors text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="الأسبوع السابق"
                >
                  <ChevronRight size={14} />
                </button>

                <span className="text-xs font-bold text-slate-700 px-2 whitespace-nowrap" dir="rtl">
                  {weekLabel}
                </span>

                <button
                  onClick={() => setWeekIdx(i => Math.min(academicWeeks.length - 1, i + 1))}
                  disabled={weekIdx >= academicWeeks.length - 1 || academicWeeks.length === 0}
                  className="p-1 rounded-full hover:bg-slate-100 transition-colors text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="الأسبوع التالي"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-[#25D366]" /> واتساب
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-[#007AFF]" /> نصية
              </span>
            </div>

          </div>

          {/* Bars */}
          <div className="h-64 flex items-end justify-between gap-2 px-2 md:px-6">
            {weeklyUsage.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                لا توجد بيانات للأسبوع
              </div>
            )}
            {weeklyUsage.map((data, i) => (
              <div key={data.date || i} className="flex flex-col items-center gap-3 flex-1 group">
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
