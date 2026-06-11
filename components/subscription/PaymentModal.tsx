import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PackageTier, PaymentPeriod, SubscriptionInfo, Transaction } from '../../types';
import { PACKAGE_NAMES, getPeriodDays } from './packages';
import { ArrowRight, Lock, CheckCircle2, ShieldCheck, SaudiRiyal } from 'lucide-react';
import { useToast } from '../ui/ToastProvider';

/* Amount + the new Saudi Riyal symbol (lucide SaudiRiyal). */
const Money: React.FC<{ value: number; className?: string; iconSize?: number }> = ({
  value, className = '', iconSize = 14,
}) => (
  <span className={`inline-flex items-center gap-1 ${className}`}>
    {value}
    <SaudiRiyal size={iconSize} className="shrink-0" />
  </span>
);

interface PaymentModalProps {
  planData: {
    tier: PackageTier;
    newPrice: number;
    finalPrice: number;
    remainingValue: number;
  };
  period: PaymentPeriod;
  subscription: SubscriptionInfo;
  setSubscription: React.Dispatch<React.SetStateAction<SubscriptionInfo>>;
  onClose: () => void;
  onSuccess: () => void;
}

type PayMethod = 'mada' | 'visa' | 'applepay' | 'samsungpay';

/* ── Checkout page ── */
const PaymentModal: React.FC<PaymentModalProps> = ({
  planData, period, subscription, setSubscription, onClose, onSuccess,
}) => {
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cardNum, setCardNum]     = useState('');
  const [cardName, setCardName]   = useState('');
  const [expiry, setExpiry]       = useState('');
  const [cvv, setCvv]             = useState('');

  const periodLabel =
    period === 'monthly' ? 'شهري' :
    period === 'semester' ? 'فصل دراسي' : 'سنة دراسية';

  const formatCardNum = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const handlePayment = (pm: PayMethod) => {
    const isCardPay = pm === 'mada' || pm === 'visa';
    if (isCardPay) {
      if (cardNum.replace(/\s/g, '').length < 16) { showToast('يرجى إدخال رقم بطاقة صحيح', 'error'); return; }
      if (!cardName.trim())  { showToast('يرجى إدخال اسم حامل البطاقة', 'error'); return; }
      if (expiry.length < 5) { showToast('يرجى إدخال تاريخ انتهاء صحيح', 'error'); return; }
      if (cvv.length < 3)    { showToast('يرجى إدخال رمز CVV', 'error'); return; }
    }
    setIsProcessing(true);
    const msg = pm === 'applepay' ? 'جاري التحقق عبر Apple Pay...'
      : pm === 'samsungpay' ? 'جاري التحقق عبر Samsung Pay...'
      : 'جاري معالجة الدفع بأمان...';
    showToast(msg, 'info');

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      showToast('تمّت عملية الدفع بنجاح ✓', 'success');
      const today      = new Date();
      const newEndDate = new Date(today);
      newEndDate.setDate(today.getDate() + getPeriodDays(period));
      const newTransaction: Transaction = {
        id: `TXN-${Date.now()}`,
        date: today.toISOString(),
        amount: planData.finalPrice,
        packageTier: planData.tier,
        period,
        paymentMethod: pm,
        status: 'success',
      };
      setSubscription(prev => ({
        ...prev,
        packageTier: planData.tier,
        isTrial: false,
        startDate: today.toISOString().split('T')[0],
        endDate: newEndDate.toISOString().split('T')[0],
        planName: PACKAGE_NAMES[planData.tier],
        transactions: [newTransaction, ...prev.transactions],
      }));
      setTimeout(() => { onSuccess(); }, 2200);
    }, 1800);
  };

  /* ── Success screen ── */
  if (isSuccess) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-[2rem] p-10 max-w-md w-full text-center shadow-2xl space-y-5">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto border-4 border-green-100">
            <CheckCircle2 size={52} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">تم الدفع بنجاح!</h2>
            <p className="text-slate-500 font-medium leading-relaxed text-sm">
              تم ترقية باقتك إلى{' '}
              <span className="font-black text-[#655ac1]">{PACKAGE_NAMES[planData.tier]}</span>{' '}
              وتفعيل كافة المزايا فوراً.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-bold bg-green-50 py-2.5 rounded-xl">
            <ShieldCheck size={16} /> عملية آمنة ومشفّرة
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  const cardBrand: PayMethod = cardNum.replace(/\s/g, '').startsWith('4') ? 'visa' : 'mada';

  const inputBase =
    'w-full bg-transparent px-3.5 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none';

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-white flex flex-col" dir="rtl">

      {/* Back — top, standalone, outside the card */}
      <div className="px-5 lg:px-12 pt-6 shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="رجوع"
          title="رجوع"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#655ac1] hover:bg-[#52499d] text-white shadow-lg shadow-[#655ac1]/25 transition-all"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex items-center justify-center p-4 lg:p-6 min-h-0">
        <div className="w-full max-w-5xl bg-white rounded-[1.75rem] border border-slate-300 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-2">

        {/* ── Order summary (right in RTL) — tinted ── */}
        <div className="lg:border-l border-slate-200 p-6 lg:p-8 flex flex-col">
          <div className="mb-6">
            <img src="/logo.png" alt="متابع" className="h-8 w-auto select-none" draggable={false} />
          </div>

          <p className="text-sm font-bold text-slate-500">الاشتراك في</p>
          <h2 className="text-2xl font-black text-slate-900 mt-1">{PACKAGE_NAMES[planData.tier]}</h2>

          <div className="flex items-center gap-1.5 mt-4">
            <span className="text-[2.25rem] leading-none font-black text-slate-900">{planData.finalPrice}</span>
            <SaudiRiyal className="w-6 h-6 text-slate-700" strokeWidth={2} />
            <span className="text-slate-400 text-sm font-bold">/ {periodLabel}</span>
          </div>

          <div className="mt-6 space-y-2.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">الباقة</span>
              <span className="font-bold text-slate-700">{PACKAGE_NAMES[planData.tier]}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">مدة الاشتراك</span>
              <span className="font-bold text-slate-700">{periodLabel}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">سعر الباقة</span>
              <Money value={planData.newPrice} className="font-bold text-slate-700" iconSize={13} />
            </div>
            {planData.remainingValue > 0 && (
              <div className="flex justify-between items-center text-sm text-emerald-600">
                <span>خصم الرصيد المتبقي</span>
                <span className="inline-flex items-center gap-1 font-bold">
                  − <Money value={planData.remainingValue} iconSize={13} />
                </span>
              </div>
            )}
            <div className="pt-3 mt-1 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm font-black text-slate-700">الإجمالي المستحق</span>
              <Money value={planData.finalPrice} className="text-xl font-black text-slate-900" iconSize={16} />
            </div>
          </div>

          <div className="mt-auto pt-6 space-y-2">
            {planData.remainingValue > 0 && (
              <p className="text-xs text-slate-400 leading-relaxed">
                تم احتساب الرصيد المتبقي من اشتراكك الحالي وخصمه تلقائياً
              </p>
            )}
            {subscription.isTrial && (
              <p className="text-xs text-slate-400 leading-relaxed">
                الترقية ستنهي فترتك التجريبية وتبدأ دورتك المدفوعة فوراً.
              </p>
            )}
          </div>
        </div>

        {/* ── Payment form (left in RTL) — white ── */}
        <div className="p-6 lg:p-8">

          {/* Express checkout */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => handlePayment('applepay')}
              disabled={isProcessing}
              dir="ltr"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl font-bold text-sm text-slate-800 transition-all disabled:opacity-60"
            >
              <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple&nbsp;Pay
            </button>
            <button
              type="button"
              onClick={() => handlePayment('samsungpay')}
              disabled={isProcessing}
              dir="ltr"
              className="flex items-center justify-center px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl font-black text-sm transition-all disabled:opacity-60"
            >
              <span className="text-[#1428A0] italic">Samsung</span>
              <span className="text-black">&nbsp;Pay</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-bold text-slate-400">أو ادفع بالبطاقة</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Card details (Stripe-style grouped field) */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">معلومات البطاقة</label>
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-[#655ac1] focus-within:ring-2 focus-within:ring-[#e5e1fe] transition-all">
                <div className="relative border-b border-slate-200">
                  <input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="0000 0000 0000 0000"
                    value={cardNum}
                    onChange={e => setCardNum(formatCardNum(e.target.value))}
                    className={`${inputBase} font-mono tracking-wider text-left pl-24`}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                    <span className="text-[11px] font-black text-slate-400">mada</span>
                    <span className="text-[11px] font-black italic text-slate-400">VISA</span>
                    <svg className="w-6 h-4" viewBox="0 0 32 20" aria-hidden="true">
                      <circle cx="13" cy="10" r="6.5" fill="#EB001B" />
                      <circle cx="19" cy="10" r="6.5" fill="#F79E1B" fillOpacity="0.9" />
                    </svg>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-200">
                  <input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="MM / YY"
                    value={expiry}
                    onChange={e => setExpiry(formatExpiry(e.target.value))}
                    className={`${inputBase} font-mono text-left`}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    maxLength={4}
                    placeholder="CVC"
                    value={cvv}
                    onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className={`${inputBase} font-mono text-left`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">الاسم على البطاقة</label>
              <input
                type="text"
                placeholder="AHMED AL HARBI"
                value={cardName}
                onChange={e => setCardName(e.target.value.toUpperCase())}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-sm uppercase tracking-wider focus:outline-none focus:border-[#655ac1] focus:ring-2 focus:ring-[#e5e1fe] bg-white text-slate-800 placeholder-slate-300 transition-all"
              />
            </div>
          </div>

          {/* Pay button */}
          <button
            onClick={() => handlePayment(cardBrand)}
            disabled={isProcessing}
            className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 bg-[#655ac1] text-white rounded-xl font-black text-base hover:opacity-90 shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-wait active:scale-[0.99]"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                جاري المعالجة...
              </>
            ) : (
              <><Lock size={15} /> ادفع {planData.finalPrice} <SaudiRiyal size={16} /></>
            )}
          </button>

          {/* Trust line */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck size={13} className="text-slate-400" />
            دفع آمن ومشفّر بتقنية SSL 256-bit
          </div>
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default PaymentModal;
