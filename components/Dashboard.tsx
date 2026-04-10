import React, { useState } from 'react';
import {
  Users,
  GraduationCap,
  School,
  UserCheck,
  MessageSquare,
  CreditCard,
  Calendar,
  CalendarCheck,
  CalendarX2,
  CalendarDays,
  Layers,
  MoreVertical,
  Minus,
  Plus,
  UserCog,
  LayoutGrid,
  BarChart3,
  Settings2
} from 'lucide-react';
import { 
  SchoolInfo, 
  Teacher, 
  ClassInfo, 
  Message, 
  CalendarEvent, 
  DailyScheduleItem, 
  SubscriptionInfo 
} from '../types';
import StatsCard from './dashboard/StatsCard';
import QuickActions from './dashboard/QuickActions';
import CalendarWidget from './dashboard/CalendarWidget';
import DailySchedule from './dashboard/DailySchedule';
import RecentMessages from './dashboard/RecentMessages';
import AcademicCalendarModal from './dashboard/AcademicCalendarModal';
import { useMessageArchive } from './messaging/MessageArchiveContext';
import { PACKAGE_NAMES } from './subscription/packages';

// --- Sub-components for Dashboard ---



const WeeklyPerformanceChart: React.FC = () => (
    <div className="h-full w-full flex items-end justify-between px-2 pb-2 gap-2 sm:gap-4">
        {/* Mock Chart Bars */}
        {[65, 80, 45, 90, 75, 40, 20].map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end">
                <div className="w-full max-w-[30px] sm:max-w-[40px] bg-slate-50 rounded-t-xl relative h-[80%] overflow-hidden flex items-end">
                    <div className="w-full bg-[#655ac1] rounded-t-xl transition-all duration-1000 ease-out group-hover:bg-[#7e74da]" style={{ height: `${val}%` }}></div>
                    <div className="absolute bottom-0 w-full bg-rose-300/50 rounded-t-xl transition-all duration-1000 ease-out" style={{ height: `${Math.max(0, 100-val-20)}%` }}></div>
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                    {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][i]}
                </span>
            </div>
        ))}
    </div>
);

interface DashboardProps {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  teachers: Teacher[];
  classes: ClassInfo[];
  messages: Message[];
  events: CalendarEvent[];
  todaySchedule: DailyScheduleItem[];
  subscription: SubscriptionInfo;
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  schoolInfo,
  setSchoolInfo,
  teachers,
  classes,
  messages,
  events,
  todaySchedule,
  subscription,
  onNavigate
}) => {
  // Academic calendar modal
  const [showAcademicCalendar, setShowAcademicCalendar] = useState(false);

  // Current semester info
  const currentSemester = schoolInfo.semesters?.find(s => s.id === schoolInfo.currentSemesterId)
    ?? schoolInfo.semesters?.[0];
  const hasAcademicCalendar = !!(schoolInfo.semesters && schoolInfo.semesters.length > 0);
  const getCurrentWeek = () => {
    if (!currentSemester) return null;

    const start = new Date(currentSemester.startDate + 'T00:00:00');
    const semesterEnd = new Date(currentSemester.endDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today < start) return 1;

    const effectiveEnd = today > semesterEnd ? semesterEnd : today;
    const workDaysStart = currentSemester.workDaysStart ?? 0;
    const workDaysEnd = currentSemester.workDaysEnd ?? 4;
    const holidays = new Set(currentSemester.holidays ?? []);
    const countedWeeks = new Set<string>();

    const toLocalDateKey = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const isWorkingDay = (day: number) => {
      if (workDaysStart <= workDaysEnd) {
        return day >= workDaysStart && day <= workDaysEnd;
      }
      return day >= workDaysStart || day <= workDaysEnd;
    };

    const getWeekStartKey = (date: Date) => {
      const weekStart = new Date(date);
      const offset = (weekStart.getDay() - workDaysStart + 7) % 7;
      weekStart.setDate(weekStart.getDate() - offset);
      return toLocalDateKey(weekStart);
    };

    for (const cursor = new Date(start); cursor <= effectiveEnd; cursor.setDate(cursor.getDate() + 1)) {
      const dateKey = toLocalDateKey(cursor);
      if (!isWorkingDay(cursor.getDay()) || holidays.has(dateKey)) continue;
      countedWeeks.add(getWeekStartKey(cursor));
    }

    return Math.max(1, Math.min(countedWeeks.size || 1, currentSemester.weeksCount));
  };
  const currentWeek = getCurrentWeek();
  const getTodayOfficialLeaveText = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayIds = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const todayDayId = dayIds[today.getDay()];
    const activeDays = schoolInfo.timing?.activeDays?.length
      ? schoolInfo.timing.activeDays
      : ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

    if (!activeDays.includes(todayDayId)) {
      return 'إجازة نهاية الأسبوع';
    }

    if (!currentSemester) return null;

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayKey = `${year}-${month}-${day}`;

    return currentSemester.holidays?.includes(todayKey) ? 'إجازة رسمية' : null;
  };
  const todayOfficialLeaveText = getTodayOfficialLeaveText();

  // Calculated stats
  const teacherCount = teachers.length;
  const classCount = classes.length;
  const staffCount = 0; // Placeholder
  const todayName = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date());

  // Message stats from context
  const { stats: msgStats } = useMessageArchive();

  // Subscription remaining days
  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const daysRemaining = getDaysRemaining(subscription.endDate);
  const isExpired = daysRemaining < 0;

  // Message donut ring calculations
  const waTotal = Math.max(1, msgStats.balanceWhatsApp + msgStats.whatsappSent);
  const waPct = msgStats.balanceWhatsApp / waTotal;
  const smsTotal = Math.max(1, msgStats.balanceSMS + msgStats.smsSent);
  const smsPct = msgStats.balanceSMS / smsTotal;
  const RING_C = 226; // circumference for r=36

  // Package semicircle arc calculations
  const pkgStartD = new Date(subscription.startDate);
  const pkgEndD = new Date(subscription.endDate);
  const pkgTotalDays = Math.max(1, Math.ceil((pkgEndD.getTime() - pkgStartD.getTime()) / (1000 * 60 * 60 * 24)));
  const pkgRemainingPct = Math.max(0, Math.min(1, daysRemaining / pkgTotalDays));
  const ARC_LEN = 157; // π × 50 (semicircle r=50)
  const pkgArcColor = isExpired ? '#94a3b8' : '#8779fb';
  const pkgTrackColor = isExpired ? '#f1f5f9' : '#e5e1fe';

  // Hijri date formatter
  const toHijri = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        year: 'numeric', month: 'long', day: 'numeric'
      }).format(new Date(dateStr));
    } catch { return dateStr; }
  };

  // مؤشر عدد الفصول الدراسية بالعربية
  const semesterCountLabel = (count: number) => {
    if (count === 1) return 'فصل دراسي';
    if (count === 2) return 'فصلان دراسيان';
    if (count === 3) return 'ثلاثة فصول دراسية';
    if (count === 4) return 'أربعة فصول دراسية';
    return `${count} فصول دراسية`;
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      
      {/* 1. General Stats Title & Cards */}
      <div>
        <h2 className="text-lg font-bold text-slate-700 mb-4 px-2 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#655ac1]" />
          الإحصائيات العامة
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatsCard 
            title="المعلمون" 
            value={teacherCount} 
            icon={Users} 
            color="bg-slate-100"
            />
            <StatsCard 
            title="الإداريون" 
            value={staffCount} 
            icon={UserCog} 
            color="bg-slate-100" 
            />
            <StatsCard 
            title="الطلاب" 
            value={schoolInfo.schoolName ? "1200" : "0"} 
            icon={GraduationCap} 
            color="bg-slate-100" 
            />
            <StatsCard 
            title="الفصول" 
            value={classCount} 
            icon={LayoutGrid} 
            color="bg-slate-100" 
            />
        </div>
      </div>

      {/* 2. Quick Actions & Calendar (Row 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch lg:h-[450px]">
        <div className="lg:col-span-4 min-h-[260px] lg:h-full">
           <QuickActions onNavigate={onNavigate} />
        </div>
        <div className="lg:col-span-8 min-h-[320px] lg:h-full">
           <CalendarWidget 
             events={events} 
             onAddEvent={() => console.log('Add event')} 
             schoolInfo={schoolInfo}
             setSchoolInfo={setSchoolInfo}
           />
        </div>
      </div>

      {/* 3 & 4. Unified two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left: Today schedule */}
        <div className="order-2 lg:order-1 lg:col-span-8 space-y-6">
          <DailySchedule
            schedule={todaySchedule}
            title={`جدول يوم ${todayName}`}
            officialLeaveText={todayOfficialLeaveText}
          />
          <RecentMessages messages={messages} onOpenArchive={() => onNavigate('messages_archive')} />
        </div>

        {/* Right: sidebar stacked */}
        <div className="order-1 lg:order-2 lg:col-span-4 space-y-4">

          {/* ─── Academic Calendar Card ─── */}
          <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 min-h-[280px] hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <CalendarDays size={20} strokeWidth={1.8} className="text-[#8779fb] shrink-0" />
                التقويم الدراسي
              </h4>
              {hasAcademicCalendar && (
              <button
                onClick={() => setShowAcademicCalendar(true)}
                className="px-2.5 py-1.5 text-xs font-bold text-[#8779fb] hover:text-[#655ac1] bg-white border border-slate-200 hover:border-slate-300 rounded-lg flex items-center gap-1 transition-colors"
                >
                  تعديل/إضافة
                </button>
              )}
            </div>

            {hasAcademicCalendar && currentSemester ? (
              <div className="space-y-5">
                {/* اسم الفصل + العام + عدد الفصول */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#655ac1]">{currentSemester.name}</span>
                    <span className="text-xs font-bold text-[#655ac1] bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {schoolInfo.academicYear}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-slate-100 my-1"></div>

                {currentWeek && (
                  <div className="flex justify-start">
                    <span className="text-xs font-black text-white bg-[#655ac1] px-2.5 py-1 rounded-full shadow-sm">
                      الأسبوع {currentWeek}
                    </span>
                  </div>
                )}

                {/* تاريخ البداية */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <CalendarCheck size={12} className="text-[#8779fb] shrink-0" />
                  <span>يبدأ من: {new Intl.DateTimeFormat(
                    currentSemester.calendarType === 'hijri' ? 'ar-SA-u-ca-islamic-umalqura' : 'ar-SA',
                    { day: 'numeric', month: 'long', year: 'numeric' }
                  ).format(new Date(currentSemester.startDate + 'T00:00:00'))}</span>
                </div>

                <div className="h-1"></div>
                {/* تاريخ النهاية */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <CalendarX2 size={12} className="text-[#8779fb] shrink-0" />
                  <span>ينتهي في: {new Intl.DateTimeFormat(
                    currentSemester.calendarType === 'hijri' ? 'ar-SA-u-ca-islamic-umalqura' : 'ar-SA',
                    { day: 'numeric', month: 'long', year: 'numeric' }
                  ).format(new Date(currentSemester.endDate + 'T00:00:00'))}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 gap-3">
                <p className="text-xs text-slate-400 font-bold text-center">لم يتم إعداد التقويم الدراسي بعد</p>
                <button
                  onClick={() => setShowAcademicCalendar(true)}
                  className="px-4 py-2 bg-white text-[#655ac1] border border-slate-200 rounded-xl text-xs font-bold hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-colors"
                >
                  البدء بالإعداد
                </button>
              </div>
            )}
          </div>

          {/* ─── Recent Messages ─── */}

          {/* Widgets (stacked below) */}
          <div className="space-y-4">

           {/* ─── Message Balance Card ─── */}
           <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between mb-4">
               <h4 className="text-sm font-bold text-slate-500 flex items-center gap-2">
                 <MessageSquare size={15} className="text-slate-400" />
                 رصيد الرسائل
               </h4>
               <button
                 onClick={() => onNavigate('messages_subscriptions')}
                 className="text-xs font-bold text-[#8779fb] hover:text-[#655ac1] transition-colors"
               >
                 شراء / شحن باقة
               </button>
             </div>

             <div className="flex items-center justify-around py-1">

               {/* WhatsApp Donut Ring */}
               <div className="flex flex-col items-center gap-2">
                 <div className="relative w-[84px] h-[84px]">
                   <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
                     <circle cx="44" cy="44" r="36" stroke="#dcfce7" strokeWidth="6" fill="transparent" />
                     <circle cx="44" cy="44" r="36" stroke="#25D366" strokeWidth="6" fill="transparent"
                       strokeDasharray={RING_C}
                       strokeDashoffset={RING_C * (1 - waPct)}
                       strokeLinecap="round"
                       style={{ transition: 'stroke-dashoffset 1s ease' }}
                     />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-base font-black text-[#25D366] leading-none">{msgStats.balanceWhatsApp.toLocaleString()}</span>
                     <span className="text-[9px] font-bold text-slate-400 mt-0.5">{Math.round(waPct * 100)}%</span>
                   </div>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                     <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd"/>
                   </svg>
                   <span className="text-xs font-bold text-slate-500">واتساب</span>
                 </div>
               </div>

               <div className="w-px h-20 bg-slate-100 rounded-full" />

               {/* SMS Donut Ring */}
               <div className="flex flex-col items-center gap-2">
                 <div className="relative w-[84px] h-[84px]">
                   <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
                     <circle cx="44" cy="44" r="36" stroke="#dbeafe" strokeWidth="6" fill="transparent" />
                     <circle cx="44" cy="44" r="36" stroke="#007AFF" strokeWidth="6" fill="transparent"
                       strokeDasharray={RING_C}
                       strokeDashoffset={RING_C * (1 - smsPct)}
                       strokeLinecap="round"
                       style={{ transition: 'stroke-dashoffset 1s ease' }}
                     />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-base font-black text-[#007AFF] leading-none">{msgStats.balanceSMS.toLocaleString()}</span>
                     <span className="text-[9px] font-bold text-slate-400 mt-0.5">{Math.round(smsPct * 100)}%</span>
                   </div>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <MessageSquare size={16} className="text-[#007AFF]" />
                   <span className="text-xs font-bold text-slate-500">نصية SMS</span>
                 </div>
               </div>

             </div>
           </div>

           {/* ─── Current Package Card ─── */}
           <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between mb-2">
               <h4 className="text-sm font-bold text-slate-500 flex items-center gap-2">
                 <CreditCard size={15} className="text-slate-400" />
                 الباقة الحالية
               </h4>
               <button
                 onClick={() => onNavigate('subscription_pricing')}
                 className="text-xs font-bold text-[#8779fb] hover:text-[#655ac1] transition-colors"
               >
                 اشتراك / ترقية
               </button>
             </div>

             <div className="flex flex-col items-center">

               {/* Semicircle gauge */}
               <div className="relative flex justify-center" style={{ width: 180, height: 100 }}>
                 <svg width="180" height="100" viewBox="0 0 120 70">
                   {/* Track */}
                   <path d="M 10,60 A 50,50 0 0 1 110,60"
                     stroke={pkgTrackColor} strokeWidth="7" fill="none" strokeLinecap="round" />
                   {/* Progress */}
                   <path d="M 10,60 A 50,50 0 0 1 110,60"
                     stroke={pkgArcColor} strokeWidth="7" fill="none" strokeLinecap="round"
                     strokeDasharray={ARC_LEN}
                     strokeDashoffset={ARC_LEN * (1 - pkgRemainingPct)}
                     style={{ transition: 'stroke-dashoffset 1s ease' }}
                   />
                 </svg>
                 {/* Center label */}
                 <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                   <span className="text-3xl font-black leading-none" style={{ color: pkgArcColor }}>
                     {isExpired ? '∞' : daysRemaining}
                   </span>
                   <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                     {isExpired ? 'انتهى الاشتراك' : 'يوم متبقي'}
                   </span>
                 </div>
               </div>

               {/* Package name + trial badge */}
               <div className="flex items-center justify-center gap-2 mt-2 mb-2">
                 <span className="text-sm font-black text-slate-800">
                   {PACKAGE_NAMES[subscription.packageTier] || subscription.planName}
                 </span>
                 {subscription.isTrial && (
                   <span className="text-[10px] font-bold text-[#655ac1] bg-[#f3f0ff] px-2 py-0.5 rounded-full border border-[#e5e1fe] whitespace-nowrap">
                     تجريبية
                   </span>
                 )}
               </div>

               {/* Date range in Hijri */}
               <div className="flex flex-col items-center gap-0.5 mt-0.5">
                 <div className="flex items-center gap-2 text-xs font-bold">
                   <span className="text-slate-400">{toHijri(subscription.startDate)}</span>
                   <span className="text-slate-300">—</span>
                   <span className={isExpired ? 'text-rose-500 font-black' : 'text-slate-600 font-bold'}>{toHijri(subscription.endDate)}</span>
                 </div>
               </div>

             </div>
           </div>

         </div>

        </div>
      </div>

      {showAcademicCalendar && (
        <AcademicCalendarModal
          isOpen={showAcademicCalendar}
          onClose={() => setShowAcademicCalendar(false)}
          schoolInfo={schoolInfo}
          setSchoolInfo={setSchoolInfo}
        />
      )}
    </div>
  );
};


export default Dashboard;
