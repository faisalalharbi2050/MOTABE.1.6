import React from 'react';
import { Calendar, Crown, MessageSquare } from 'lucide-react';
import { SubscriptionInfo } from '../../types';
import { PACKAGE_NAMES } from './packages';
import { useMessageArchive } from '../messaging/MessageArchiveContext';

interface SubscriptionDashboardProps {
  subscription: SubscriptionInfo;
}

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({ subscription }) => {
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


  const RemainingBadge: React.FC<{ value: number | null }> = ({ value }) => {
    const safe = Math.max(0, value ?? 0);
    return (
      <div className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-center min-w-[130px] flex flex-col items-center">
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

  const mainPackageDisplay = PACKAGE_NAMES[subscription.packageTier] || subscription.planName;
  const messagePackageDisplay = isMessageTrial
    ? 'الباقة المجانية'
    : (stats.activePackageName ? `الباقة ${stats.activePackageName}` : 'الباقة الأساسية');

  return (
    <div className="space-y-6">

      {/* ── Cards row: متابع + الرسائل ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── متابع subscription card ── */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group flex flex-col">
          <div className="relative z-10 flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-5">
              <Crown size={22} className="text-[#8779fb]" />
              <h3 className="text-base font-black text-slate-800">اشتراك متابع</h3>
            </div>

            <div className="inline-flex items-center gap-2 self-start px-4 py-2 bg-white rounded-xl border border-slate-300 mb-6">
              <span className="text-sm font-black text-[#655ac1]">{mainPackageDisplay}</span>
              {subscription.isTrial && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#655ac1] text-white">
                  تجربة مجانية
                </span>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={15} className="text-[#8779fb]" />
                <span className="text-xs font-black text-slate-500 uppercase tracking-wide">مدة الاشتراك</span>
              </div>
              <div className="text-sm text-slate-700 font-bold leading-relaxed">
                {formatHijriRange(mainStartDate, mainEndDate)}
              </div>
            </div>

            <div className="mt-auto flex justify-center">
              <RemainingBadge value={isExpired ? 0 : daysRemaining} />
            </div>

            {isExpired && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 font-bold">
                تم انتهاء صلاحية باقتك. يرجى الترقية للاستمرار في استخدام المنصة والأدوات.
              </div>
            )}
          </div>
        </div>

        {/* ── Message subscription card ── */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group flex flex-col">
          <div className="relative z-10 flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-5">
              <MessageSquare size={22} className="text-[#8779fb]" />
              <h3 className="text-base font-black text-slate-800">باقة الرسائل</h3>
            </div>

            <div className="inline-flex items-center gap-2 self-start px-4 py-2 bg-white rounded-xl border border-slate-300 mb-6">
              <span className="text-sm font-black text-[#655ac1]">{messagePackageDisplay}</span>
              {isMessageTrial && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#655ac1] text-white">
                  10 أيام
                </span>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={15} className="text-[#8779fb]" />
                <span className="text-xs font-black text-slate-500 uppercase tracking-wide">مدة الاشتراك</span>
              </div>
              <div className="text-sm text-slate-700 font-bold leading-relaxed">
                {formatHijriRange(messageStartDate, messageEndDate)}
              </div>
            </div>

            <div className="mt-auto flex justify-center">
              <RemainingBadge value={isMessageExpired ? 0 : messageDaysRemaining} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SubscriptionDashboard;
