import React from 'react';
import {
  ArrowLeft,
  Calendar,
  Crown,
  MessageSquare,
} from 'lucide-react';
import { SubscriptionInfo } from '../../types';
import { PACKAGE_NAMES } from './packages';
import { useMessageArchive } from '../messaging/MessageArchiveContext';

interface SubscriptionDashboardProps {
  subscription: SubscriptionInfo;
  onOpenPricing?: () => void;
  onOpenMessagePackages?: () => void;
}

// واتساب — الأيقونة الرسمية بلونها الأخضر، مطابقة لقسم الرسائل.
const waIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd" />
  </svg>
);

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({
  subscription,
  onOpenPricing,
  onOpenMessagePackages,
}) => {
  const { stats } = useMessageArchive();

  // نوع التقويم موحّد من مرتكز الرئيسية (schoolInfo.calendarType) — لا مبدّل مستقل.
  const calendarType: 'hijri' | 'gregorian' = (() => {
    try {
      const saved = localStorage.getItem('school_assignment_v4');
      if (saved) {
        const data = JSON.parse(saved);
        if (data?.schoolInfo?.calendarType === 'gregorian') return 'gregorian';
      }
    } catch {}
    return 'hijri';
  })();

  // أرقام لاتينية (nu-latn) كصيغة المنصة المعتمدة. الهجري تُلحق Intl لاحقته «هـ»
  // تلقائيًا، أما الميلادي فنُلحق «م» يدويًا.
  const formatDate = (isoDate: string | undefined | null) => {
    if (!isoDate) return '';
    const d = new Date(isoDate.length === 10 ? `${isoDate}T12:00:00` : isoDate);
    if (Number.isNaN(d.getTime())) return '';
    try {
      if (calendarType === 'gregorian') {
        const g = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        }).format(d);
        return `${g} م`;
      }
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-nu-latn', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      }).format(d);
    } catch {
      return isoDate;
    }
  };

  const addYearsIso = (isoDate: string, years: number) => {
    const d = new Date(isoDate);
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().slice(0, 10);
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

  // ── حلقة التقدّم: نسبة ما انقضى من مدة الاشتراك ──
  const totalDays = (() => {
    if (!mainStartDate || !mainEndDate) return 0;
    const diff = Math.round(
      (new Date(mainEndDate).getTime() - new Date(mainStartDate).getTime()) / 86400000,
    );
    return Math.max(1, diff);
  })();
  const elapsedDays = totalDays > 0 ? Math.min(totalDays, Math.max(0, totalDays - safeDaysRemaining)) : 0;
  const elapsedPct = totalDays > 0 ? Math.round((elapsedDays / totalDays) * 100) : 0;
  const RING_R = 40;
  const RING_C = 2 * Math.PI * RING_R;
  const ringOffset = RING_C * (1 - elapsedPct / 100);

  // Preview: force messages subscription to display as free trial.
  const forcePreviewMessageTrial = true;
  const isMessageTrial = forcePreviewMessageTrial || subscription.isTrial;
  const messageStartDate: string | undefined = isMessageTrial
    ? (subscription.trialStartDate || subscription.startDate)
    : stats.messagePackageStartDate;

  // صلاحية باقة الرسائل = سنة كاملة من تاريخ البداية،
  // وتنتهي فعليًا عند نفاد الرصيد أو انتهاء السنة أيهما أسبق.
  const messageEndDate: string | undefined = isMessageTrial
    ? (messageStartDate ? addYearsIso(messageStartDate, 1) : undefined)
    : stats.messagePackageEndDate;

  // ── الإجمالي والمستهلك لكل قناة (التجربة المجانية: واتساب ٥٠ / SMS ١٠) ──
  const waTotal = isMessageTrial ? 50 : (stats.activePackageWA ?? stats.balanceWhatsApp);
  const smsTotal = isMessageTrial ? 10 : (stats.activePackageSMS ?? stats.balanceSMS);
  const waUsed = Math.max(0, waTotal - stats.balanceWhatsApp);
  const smsUsed = Math.max(0, smsTotal - stats.balanceSMS);
  const usagePct = (used: number, total: number) =>
    total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  const mainPackageDisplay = PACKAGE_NAMES[subscription.packageTier] || subscription.planName;
  const mainActionLabel =
    isExpired || subscription.isTrial
      ? 'الاشتراك في باقات متابع'
      : 'تجديد / ترقية الاشتراك';
  const messageActionLabel = 'تجديد / ترقية الاشتراك';
  const formatCount = (value: number | undefined) => (value ?? 0).toLocaleString('en-US');

  const DateCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="rounded-2xl border border-slate-200 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-500 mb-2">
        <Calendar size={15} className="text-[#655ac1]" strokeWidth={2.3} />
        <span className="text-[11px] font-black">{label}</span>
      </div>
      <div className="text-sm font-black text-slate-800">{value || '-'}</div>
    </div>
  );

  const ChannelBar: React.FC<{
    name: string;
    icon: React.ReactNode;
    used: number;
    total: number;
    color: string;
  }> = ({ name, icon, used, total, color }) => (
    <div className="rounded-2xl border border-slate-200 px-4 py-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <span className="flex items-center gap-1.5 text-xs font-black text-slate-500">
          {icon}
          {name}
        </span>
        <span className="text-sm font-bold text-slate-400 tabular-nums">
          <span className="text-lg font-black text-[#655ac1]">{formatCount(used)}</span>
          {' / '}
          {formatCount(total)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${usagePct(used, total)}%`, background: color }} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[1.75rem] border border-slate-200 shadow-sm p-5">
        <h3 className="text-xl font-black text-slate-800">حالة اشتراكك في متابع</h3>
        <p className="mt-1.5 text-xs font-bold text-slate-500">
          تابع باقتك الحالية ومدة الاشتراك وصلاحية الرسائل.
        </p>

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
        {/* ═══ بطاقة اشتراك متابع ═══ */}
        <div className="bg-white rounded-[1.75rem] border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Crown size={20} className="text-[#655ac1]" strokeWidth={2.4} />
            <h4 className="text-base font-black text-slate-800">اشتراك متابع</h4>
          </div>

          <div className="rounded-2xl border border-slate-200 px-4 py-4 mb-3">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-black text-slate-800">الأيام المتبقية على الاشتراك</span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-[#655ac1]">
                {mainPackageDisplay}
                {subscription.isTrial && (
                  <span className="rounded-full bg-[#655ac1] px-2 py-0.5 text-[10px] font-black text-white">
                    تجربة مجانية
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <svg width="92" height="92" viewBox="0 0 92 92" className="shrink-0">
                <circle cx="46" cy="46" r={RING_R} fill="none" stroke="#e2e8f0" strokeWidth="9" />
                <circle
                  cx="46" cy="46" r={RING_R} fill="none" stroke="#655ac1" strokeWidth="9"
                  strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset={ringOffset}
                  transform="rotate(-90 46 46)"
                />
                <text x="46" y="42" textAnchor="middle" fontSize="26" fontWeight="800" fill="#1e293b">
                  {formatCount(safeDaysRemaining)}
                </text>
                <text x="46" y="60" textAnchor="middle" fontSize="11" fontWeight="700" fill="#94a3b8">
                  يوم
                </text>
              </svg>
              <p className="text-[13px] font-bold text-slate-500 leading-relaxed">
                متبقية حتى نهاية فترة اشتراكك الحالية.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <DateCard label="تاريخ البداية" value={formatDate(mainStartDate)} />
            <DateCard label="تاريخ الانتهاء" value={formatDate(mainEndDate)} />
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

        {/* ═══ بطاقة باقة الرسائل ═══ */}
        <div className="bg-white rounded-[1.75rem] border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={20} className="text-[#655ac1]" strokeWidth={2.4} />
            <h4 className="text-base font-black text-slate-800">باقة الرسائل</h4>
          </div>

          <div className="space-y-3 mb-4">
            <ChannelBar name="واتساب" icon={waIcon} used={waUsed} total={waTotal} color="#25D366" />
            <ChannelBar
              name="رسائل SMS"
              icon={<MessageSquare size={15} className="text-[#007AFF]" strokeWidth={2.4} />}
              used={smsUsed}
              total={smsTotal}
              color="#007AFF"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <DateCard label="تاريخ البداية" value={formatDate(messageStartDate)} />
            <DateCard label="تاريخ الانتهاء" value={formatDate(messageEndDate)} />
          </div>

          <div className="mt-auto flex">
            <button
              type="button"
              onClick={onOpenMessagePackages}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#655ac1] px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition-all hover:opacity-90 active:scale-[0.99]"
            >
              {messageActionLabel}
              <ArrowLeft size={17} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDashboard;
