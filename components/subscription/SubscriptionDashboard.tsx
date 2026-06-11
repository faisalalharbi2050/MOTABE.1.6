import React from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  Crown,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import { SubscriptionInfo } from '../../types';
import { PACKAGE_NAMES } from './packages';
import { useMessageArchive } from '../messaging/MessageArchiveContext';

interface SubscriptionDashboardProps {
  subscription: SubscriptionInfo;
  onOpenPricing?: () => void;
  onOpenMessagePackages?: () => void;
}

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({
  subscription,
  onOpenPricing,
  onOpenMessagePackages,
}) => {
  const { stats } = useMessageArchive();

  const formatHijri = (isoDate: string | undefined | null) => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return '';
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    } catch {
      return isoDate;
    }
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

  const mainStartDate =
    subscription.isTrial && subscription.trialStartDate
      ? subscription.trialStartDate
      : subscription.startDate;

  const mainEndDate =
    subscription.isTrial && subscription.trialEndDate
      ? subscription.trialEndDate
      : subscription.endDate;

  const daysRemaining = getDaysRemaining(mainEndDate);
  const safeDaysRemaining = Math.max(0, daysRemaining ?? 0);
  const isExpired = (daysRemaining ?? 0) < 0;
  const isEndingSoon = !isExpired && safeDaysRemaining <= 14;

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
  const mainActionLabel =
    isExpired || subscription.isTrial
      ? 'الاشتراك في باقات متابع'
      : 'تجديد / ترقية الاشتراك';
  const messageActionLabel =
    !stats.activePackageName || isMessageTrial || isMessageExpired
      ? 'الاشتراك في باقات الرسائل'
      : 'تجديد / ترقية باقة الرسائل';
  const formatCount = (value: number | undefined) => (value ?? 0).toLocaleString('ar-SA');

  const statusLabel = isExpired
    ? 'منتهي'
    : subscription.isTrial
    ? 'تجربة مجانية'
    : isEndingSoon
    ? 'ينتهي قريبًا'
    : 'نشط';

  const statusClass = isExpired
    ? 'border-red-200 text-red-700'
    : isEndingSoon
    ? 'border-amber-200 text-amber-700'
    : 'border-emerald-200 text-emerald-700';

  const InfoRow: React.FC<{ label: string; value: string; icon?: React.ElementType }> = ({ label, value, icon: Icon }) => (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-500">
        {Icon && <Icon size={16} className="text-[#655ac1]" strokeWidth={2.3} />}
        <span className="text-xs font-black">{label}</span>
      </div>
      <span className="text-sm font-black text-slate-800 text-left">{value || '-'}</span>
    </div>
  );

  const MetricCard: React.FC<{ label: string; value: string; hint: string; icon: React.ElementType }> = ({
    label,
    value,
    hint,
    icon: Icon,
  }) => (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-center gap-2 text-slate-500 mb-3">
        <Icon size={17} className="text-[#655ac1]" strokeWidth={2.3} />
        <span className="text-xs font-black">{label}</span>
      </div>
      <div className="text-base font-black text-slate-800 leading-snug">{value}</div>
      <p className="mt-1.5 text-[11px] font-bold text-slate-400 leading-relaxed">{hint}</p>
    </div>
  );

  const MessageBalanceCard: React.FC<{ label: string; value: number; hint: string; icon: React.ElementType }> = ({
    label,
    value,
    hint,
    icon: Icon,
  }) => (
    <div className="rounded-2xl border border-slate-200 px-4 py-4">
      <div className="flex items-center gap-2 text-slate-500 mb-3">
        <Icon size={17} className="text-[#655ac1]" strokeWidth={2.3} />
        <span className="text-xs font-black">{label}</span>
      </div>
      <div className="text-2xl font-black text-slate-800 leading-none">{formatCount(value)}</div>
      <p className="mt-2 text-[11px] font-bold text-slate-400 leading-relaxed">{hint}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[1.75rem] border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="text-right">
            <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1 text-[11px] font-black mb-2 ${statusClass}`}>
              {isExpired || isEndingSoon ? <AlertCircle size={14} strokeWidth={2.4} /> : <CheckCircle2 size={14} strokeWidth={2.5} />}
              {statusLabel}
            </div>
            <h3 className="text-xl font-black text-slate-800">حالة اشتراكك في متابع</h3>
            <p className="mt-1.5 text-xs font-bold text-slate-500">
              تابع باقتك الحالية ومدة الاشتراك وصلاحية الرسائل من مكان واحد.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start lg:self-center rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-black text-[#655ac1]">
            <CheckCircle2 size={15} strokeWidth={2.4} />
            الاشتراك الحالي
          </div>
        </div>

        {(isExpired || isEndingSoon) && (
          <div className={`mt-4 rounded-xl border px-4 py-2.5 text-xs font-bold ${
            isExpired ? 'border-red-200 text-red-700' : 'border-amber-200 text-amber-700'
          }`}>
            {isExpired
              ? 'انتهت صلاحية اشتراك متابع. يمكنك التجديد أو اختيار باقة مناسبة للاستمرار.'
              : `باقي ${safeDaysRemaining} يوم على نهاية الاشتراك. التجديد المبكر يساعدك على استمرار الخدمة بدون انقطاع.`}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.95fr] gap-6 items-stretch">
        <div className="bg-white rounded-[1.75rem] border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={20} className="text-[#655ac1]" strokeWidth={2.4} />
                <h4 className="text-base font-black text-slate-800">اشتراك متابع</h4>
              </div>
              <p className="text-xs font-bold text-slate-500">الباقة الأساسية لتشغيل أدوات المنصة.</p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-black text-[#655ac1]">
              {mainPackageDisplay}
              {subscription.isTrial && (
                <span className="rounded-full bg-[#655ac1] px-2 py-0.5 text-[10px] font-black text-white">
                  تجربة مجانية
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <MetricCard label="الأيام المتبقية" value={`${safeDaysRemaining}`} hint={safeDaysRemaining === 0 ? 'انتهت المدة' : 'حتى نهاية الاشتراك'} icon={Clock3} />
            <MetricCard label="تاريخ البداية" value={formatHijri(mainStartDate)} hint="بداية فترة الاشتراك" icon={Calendar} />
            <MetricCard label="تاريخ الانتهاء" value={formatHijri(mainEndDate)} hint="نهاية فترة الاشتراك" icon={Calendar} />
          </div>

          <div className="mt-auto flex">
            <button
              type="button"
              onClick={onOpenPricing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#655ac1] px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition-all hover:opacity-90 active:scale-[0.99]"
            >
              {mainActionLabel}
              <ArrowLeft size={17} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[1.75rem] border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={20} className="text-[#655ac1]" strokeWidth={2.4} />
                <h4 className="text-base font-black text-slate-800">باقة الرسائل</h4>
              </div>
              <p className="text-xs font-bold text-slate-500">صلاحية باقة الرسائل ورصيد التواصل.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-[#655ac1]">
              {messagePackageDisplay}
              {isMessageTrial && <span className="text-slate-400">10 أيام</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <MessageBalanceCard
              label="واتساب"
              value={stats.balanceWhatsApp}
              hint={isMessageExpired ? 'تحتاج إلى تجديد الباقة' : 'الرصيد المتاح للإرسال'}
              icon={MessageSquare}
            />
            <MessageBalanceCard
              label="رسائل SMS"
              value={stats.balanceSMS}
              hint={isMessageExpired ? 'تحتاج إلى تجديد الباقة' : 'الرصيد المتاح للإرسال'}
              icon={Smartphone}
            />
          </div>

          <div className="space-y-3 mb-6">
            <InfoRow label="تاريخ البداية" value={formatHijri(messageStartDate)} icon={Calendar} />
            <InfoRow label="تاريخ الانتهاء" value={formatHijri(messageEndDate)} icon={Calendar} />
          </div>

          <button
            type="button"
            onClick={onOpenMessagePackages}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#655ac1] px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition-all hover:opacity-90 active:scale-[0.99]"
          >
            {messageActionLabel}
            <ArrowLeft size={17} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDashboard;
