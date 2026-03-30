import React from 'react';
import { Calendar, Crown, Hourglass, MessageSquare } from 'lucide-react';
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

  const formatHijri = (isoDate: string | undefined | null) => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return '';
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(d);
    } catch {
      return isoDate;
    }
  };

  const formatHijriRange = (startIso: string | undefined | null, endIso: string | undefined | null) => {
    const s = formatHijri(startIso);
    const e = formatHijri(endIso);
    if (!s && !e) return '';
    if (s && !e) return `من ${s}`;
    if (!s && e) return `إلى ${e}`;
    return `من ${s} إلى ${e}`;
  };

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

  const getTotalDays = (startDate: string | undefined | null, endDate: string | undefined | null) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return null;
    const diff = end - start;
    if (diff <= 0) return null;
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const RemainingBadge: React.FC<{ value: number | null }> = ({ value }) => {
    const safe = Math.max(0, value ?? 0);
    return (
      <div className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-center min-w-[130px]">
        <div className="text-2xl font-black text-[#655ac1] leading-none">{safe}</div>
        <div className="text-xs font-bold text-[#8779fb] mt-1">
          {safe === 0 ? 'انتهت المدة' : 'يوم متبقٍ'}
        </div>
      </div>
    );
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

  // Preview: force messages subscription to display as free trial (10 days)
  const forcePreviewMessageTrial = true;
  const isMessageTrial = forcePreviewMessageTrial || subscription.isTrial;
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

  const mainPackageDisplay = PACKAGE_NAMES[subscription.packageTier] || subscription.planName;
  const messagePackageDisplay = stats.activePackageName ? `الباقة ${stats.activePackageName}` : 'الباقة الأساسية';

  return (
    <div className="space-y-6">

      {/* ── Cards row: متابع + الرسائل + رصيد الرسائل ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── متابع subscription card ── */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group flex flex-col">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#f3f0ff] rounded-bl-full -z-0 transition-transform group-hover:scale-110" />
          <div className="relative z-10 flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Crown size={22} className="text-[#8779fb]" />
              <h3 className="text-base font-black text-slate-800">اشتراك متابع</h3>
            </div>
            <p className="text-sm font-black text-slate-600 mb-4">
              {mainPackageDisplay}
              {subscription.isTrial && (
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full mr-2 border border-[#e5e1fe] text-[#655ac1] bg-[#f8f7ff]">
                  تجربة مجانية
                </span>
              )}
            </p>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="text-slate-600 font-medium text-sm">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[#8779fb]" />
                  <span className="font-black text-slate-700">مدة الاشتراك</span>
                </div>
                <div className="mt-1.5 text-slate-500 font-bold">
                  {formatHijriRange(mainStartDate, mainEndDate)}
                </div>
              </div>

              <RemainingBadge value={isExpired ? 0 : daysRemaining} />
            </div>

            <button
              onClick={onUpgrade}
              className="mt-auto w-full py-3 bg-white hover:bg-[#8779fb] text-slate-700 hover:text-white rounded-xl font-bold transition-colors shadow-sm border-2 border-slate-200 hover:border-[#8779fb] text-sm"
            >
              ترقية الباقة
            </button>

            {isExpired && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 font-bold">
                تم انتهاء صلاحية باقتك. يرجى الترقية للاستمرار في استخدام المنصة والأدوات.
              </div>
            )}
          </div>
        </div>

        {/* ── Message subscription card ── */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group flex flex-col">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#f8f7ff] rounded-bl-full -z-0 transition-transform group-hover:scale-110" />
          {isMessageTrial && (
            <div className="absolute top-5 left-5 z-20 px-3 py-1 rounded-full border-2 border-[#8779fb] bg-white text-[#655ac1] text-[11px] font-black">
              تجربة مجانية لمدة 10 أيام
            </div>
          )}
          <div className="relative z-10 flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={22} className="text-[#8779fb]" />
              <h3 className="text-base font-black text-slate-800">باقة الرسائل</h3>
            </div>
            <p className="text-sm font-black text-slate-600 mb-4">
              {messagePackageDisplay}
            </p>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="text-slate-600 font-medium text-sm">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[#8779fb]" />
                  <span className="font-black text-slate-700">مدة الاشتراك</span>
                </div>
                <div className="mt-1.5 text-slate-500 font-bold">
                  {formatHijriRange(messageStartDate, messageEndDate)}
                </div>
              </div>

              <RemainingBadge value={isMessageExpired ? 0 : messageDaysRemaining} />
            </div>

            <div className="mt-auto pt-5">
              <button
                onClick={onManageMessages}
                className="w-full py-3 bg-white hover:bg-[#8779fb] text-slate-700 hover:text-white rounded-xl font-bold transition-colors shadow-sm border-2 border-slate-200 hover:border-[#8779fb] text-sm"
              >
                ترقية الباقة
              </button>
            </div>
          </div>
        </div>

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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDashboard;
