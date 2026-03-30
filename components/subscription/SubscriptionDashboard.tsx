import React from 'react';
import { Calendar, ShieldCheck, Hourglass, ArrowUpCircle, MessageSquare, Award } from 'lucide-react';
import { SubscriptionInfo } from '../../types';
import { PACKAGE_NAMES } from './packages';
import { useMessageArchive } from '../messaging/MessageArchiveContext';

interface SubscriptionDashboardProps {
  subscription: SubscriptionInfo;
  onUpgrade: () => void;
  onManageMessages: () => void;
}

const WA_ICON_SM = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd" />
  </svg>
);

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({ subscription, onUpgrade, onManageMessages }) => {
  const { stats } = useMessageArchive();

  const addDaysIso = (isoDate: string, days: number) => {
    const base = new Date(isoDate);
    const next = new Date(base);
    next.setDate(next.getDate() + days);
    return next.toISOString().slice(0, 10);
  };

  const getDaysRemaining = (endDate: string | undefined | null) => {
    if (!endDate) return null;
    const diffTime = new Date(endDate).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const mainStartDate =
    subscription.isTrial && subscription.trialStartDate
      ? subscription.trialStartDate
      : subscription.startDate;

  const mainEndDate =
    subscription.isTrial && subscription.trialEndDate
      ? subscription.trialEndDate
      : subscription.endDate;

  const daysRemaining = getDaysRemaining(mainEndDate);
  const isExpired = (daysRemaining ?? 0) < 0;

  const isMessageTrial = subscription.isTrial;
  const messageStartDate: string | undefined = isMessageTrial
    ? (subscription.trialStartDate || subscription.startDate)
    : stats.messagePackageStartDate;

  // For free trial: messages validity must be fixed to 10 days
  const messageEndDate: string | undefined = isMessageTrial
    ? (messageStartDate ? addDaysIso(messageStartDate, 10) : undefined)
    : stats.messagePackageEndDate;

  const messageDaysRemaining = getDaysRemaining(messageEndDate);
  const isMessageExpired = messageDaysRemaining !== null && messageDaysRemaining < 0;

  const smsUsed = 10 - subscription.freeSmsRemaining;
  const waUsed  = 50 - subscription.freeWaRemaining;
  const smsPercentage = (smsUsed / 10) * 100;
  const waPercentage  = (waUsed  / 50) * 100;

  const hasMessagePackage = stats.balanceWhatsApp > 0 || stats.balanceSMS > 0;
  const hasMessageSubscription = isMessageTrial || (!!stats.messagePackageStartDate && !!stats.messagePackageEndDate);

  const formatDaysLabel = (value: number | null) => {
    if (value === null) return '';
    if (value < 0) return 'انتهى الاشتراك';
    if (value === 0) return 'ينتهي اليوم';
    if (value === 1) return 'يوم متبقٍ';
    if (value === 2) return 'يومان متبقيان';
    if (value <= 10) return 'أيام متبقية';
    return 'يوماً متبقياً';
  };

  const mainDaysLabel = formatDaysLabel(daysRemaining);
  const messageDaysLabel = formatDaysLabel(messageDaysRemaining);

  const isUpgradeNearExpiry =
    (daysRemaining !== null && daysRemaining < 10) ||
    (messageDaysRemaining !== null && messageDaysRemaining < 10) ||
    isExpired ||
    isMessageExpired;

  return (
    <div className="space-y-6">

      {/* ── Main cards: متابع + الرسائل (جنبًا إلى جنب) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── متابع subscription card ── */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${subscription.isTrial ? 'text-[#655ac1]' : 'bg-green-100 text-green-600'}`}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {PACKAGE_NAMES[subscription.packageTier] || subscription.planName}
                  {subscription.isTrial && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full mr-2 border border-[#e5e1fe] text-[#655ac1] bg-[#f8f7ff]">
                      تجربة مجانية
                    </span>
                  )}
                </h3>
                <div className="mt-2 text-slate-500 font-medium text-sm flex items-center gap-2">
                  <Calendar size={16} className="text-[#655ac1]" />
                  <span>الاشتراك: {mainStartDate} إلى {mainEndDate}</span>
                </div>
              </div>
            </div>

            <div className="text-center bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 flex flex-col justify-center items-center min-w-[120px]">
              <div className="text-2xl font-black text-[#655ac1] mb-1">
                {isExpired || daysRemaining === null ? '0' : daysRemaining}
              </div>
              <div className="text-[#8779fb] font-bold text-xs">
                {mainDaysLabel}
              </div>
            </div>
          </div>

          {isExpired && (
            <div className="mt-5 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 font-bold flex items-center gap-2">
              تم انتهاء صلاحية باقتك. يرجى الترقية للاستمرار في استخدام المنصة والأدوات.
            </div>
          )}
        </div>

        {/* ── Message subscription card ── */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group flex flex-col">
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#f0fdf4] rounded-bl-full -z-0 transition-transform group-hover:scale-110" />
          <div className="relative z-10 flex justify-between items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Award size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">باقة الرسائل</h3>
                <div className="mt-2 text-slate-500 font-medium text-sm flex items-center gap-2">
                  <Calendar size={16} className="text-[#655ac1]" />
                  <span>الاشتراك: {messageStartDate} إلى {messageEndDate}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {isMessageTrial ? (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#f8f7ff] text-[#655ac1] border border-[#e5e1fe]">
                      تجربة مجانية (10 أيام)
                    </span>
                  ) : hasMessageSubscription ? (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> نشطة
                    </span>
                  ) : (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                      غير مشترك
                    </span>
                  )}

                  {!isMessageTrial && stats.activePackageName && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                      {stats.activePackageName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={`text-center p-3 rounded-2xl border min-w-[120px] flex flex-col justify-center items-center ${
              isMessageExpired ? 'bg-red-50/50 border-red-100' : 'bg-emerald-50/50 border-emerald-100'
            }`}>
              <div className={`text-2xl font-black mb-1 ${isMessageExpired ? 'text-red-600' : 'text-emerald-700'}`}>
                {messageDaysRemaining === null || isMessageExpired ? '0' : messageDaysRemaining}
              </div>
              <div className={`font-bold text-xs ${isMessageExpired ? 'text-red-600' : 'text-emerald-700'}`}>
                {messageDaysLabel}
              </div>
            </div>
          </div>

          {/* Balances preview */}
          <div className="relative z-10 mt-5 grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-600 flex items-center gap-2">{WA_ICON_SM} واتساب</span>
              <span className="text-base font-black text-slate-800">{stats.balanceWhatsApp.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                <MessageSquare size={16} className="text-[#007AFF]" /> SMS
              </span>
              <span className="text-base font-black text-slate-800">{stats.balanceSMS.toLocaleString()}</span>
            </div>
          </div>

          {isMessageTrial && !isMessageExpired && (
            <div className="relative z-10 mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <span className="font-bold text-slate-600 text-sm">المدة المتبقية للتجربة</span>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 10 }).map((_, i) => {
                  const filled = i < Math.max(0, Math.min(10, messageDaysRemaining ?? 0));
                  return (
                    <div
                      key={i}
                      title={`اليوم ${i + 1}`}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                        filled ? 'bg-green-500 border-green-500 shadow-sm shadow-green-200' : 'bg-slate-100 border-slate-200'
                      }`}
                    />
                  );
                })}
                <span className="mr-2 text-xs font-black text-[#655ac1]">
                  {Math.max(0, Math.min(10, messageDaysRemaining ?? 0))} / 10 أيام
                </span>
              </div>
            </div>
          )}

          <button
            onClick={onManageMessages}
            className="relative z-10 mt-5 w-full py-3 bg-white hover:bg-[#25D366] text-slate-700 hover:text-white rounded-xl font-bold transition-colors shadow-sm border-2 border-slate-200 hover:border-[#25D366] text-sm"
          >
            {hasMessagePackage || hasMessageSubscription ? 'إدارة باقة الرسائل' : 'اشترك في باقة رسائل'}
          </button>
        </div>
      </div>

      {/* ── Cards grid: الرسائل + الرصيد + الترقية ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Balance & consumption ── */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="p-2 bg-amber-50 text-amber-500 rounded-xl shrink-0">
              <Hourglass size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">رصيد الرسائل</h3>
            </div>
          </div>

          <div className="space-y-5 flex-1">
            {/* WhatsApp */}
            <div>
              <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                <span className="flex items-center gap-1.5">{WA_ICON_SM} واتساب</span>
                <span className="text-green-600">{waUsed} مستهلك من 50</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${waPercentage > 80 ? 'bg-red-500' : 'bg-[#25D366]'}`}
                  style={{ width: `${waPercentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs font-medium text-slate-400">
                <span>مجاني متبقي: {subscription.freeWaRemaining}</span>
                <span>الرصيد المتبقي: {stats.balanceWhatsApp.toLocaleString()}</span>
              </div>
            </div>

            {/* SMS */}
            <div>
              <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-[#007AFF]" /> نصية SMS
                </span>
                <span className="text-blue-600">{smsUsed} مستهلك من 10</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${smsPercentage > 80 ? 'bg-red-500' : 'bg-[#007AFF]'}`}
                  style={{ width: `${smsPercentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs font-medium text-slate-400">
                <span>مجاني متبقي: {subscription.freeSmsRemaining}</span>
                <span>الرصيد المتبقي: {stats.balanceSMS.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Upgrade / باقات متابع (تظهر عند قرب انتهاء الباقة) ── */}
        {isUpgradeNearExpiry ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group flex flex-col">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#f3f0ff] rounded-bl-full -z-0 transition-transform group-hover:scale-110" />
            <div className="relative z-10 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpCircle size={22} className="text-[#8779fb]" />
                <h3 className="text-base font-black text-slate-800">الاشتراك والترقية</h3>
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-start gap-2 text-slate-600 font-medium text-sm">
                  <span className="mt-0.5 shrink-0 text-[#8779fb]">✦</span>
                  <span>اقترب موعد انتهاء إحدى باقاتك. قم بالترقية/التجديد لتفادي انقطاع الخدمات.</span>
                </div>
                <div className="flex items-start gap-2 text-slate-600 font-medium text-sm">
                  <span className="mt-0.5 shrink-0 text-[#8779fb]">✦</span>
                  <span>استعرض باقات متابع واختر ما يناسب احتياج مدرستك.</span>
                </div>
              </div>
              <button
                onClick={onUpgrade}
                className="mt-4 w-full py-3 bg-[#8779fb] text-white rounded-xl font-bold hover:bg-[#6e5ee0] hover:scale-[1.02] transform transition-all shadow-md text-sm"
              >
                عرض باقات متابع
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden md:block" />
        )}

      </div>
    </div>
  );
};

export default SubscriptionDashboard;
