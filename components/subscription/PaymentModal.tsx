import React, { useState } from 'react';
import { PackageTier, PaymentPeriod, SubscriptionInfo, Transaction } from '../../types';
import { PACKAGE_NAMES, getPeriodDays } from './packages';
import { CreditCard, X, Smartphone, FileText, AlertCircle, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../ui/ToastProvider';

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

const PaymentModal: React.FC<PaymentModalProps> = ({ planData, period, subscription, setSubscription, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [method, setMethod] = useState<PayMethod>('mada');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showCvv, setShowCvv] = useState(false);

  // Card form state
  const [cardNum, setCardNum] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const isCard = method === 'mada' || method === 'visa';

  const formatCardNum = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const handlePayment = () => {
    if (isCard) {
      const rawCard = cardNum.replace(/\s/g, '');
      if (rawCard.length < 16) { showToast('يرجى إدخال رقم بطاقة صحيح', 'error'); return; }
      if (!cardName.trim()) { showToast('يرجى إدخال اسم حامل البطاقة', 'error'); return; }
      if (expiry.length < 5) { showToast('يرجى إدخال تاريخ انتهاء صحيح', 'error'); return; }
      if (cvv.length < 3) { showToast('يرجى إدخال رمز CVV', 'error'); return; }
    }

    setIsProcessing(true);
    const processingMsg = method === 'applepay' ? 'جاري التحقق عبر Apple Pay...'
      : method === 'samsungpay' ? 'جاري التحقق عبر Samsung Pay...'
      : 'جاري معالجة الدفع بأمان...';
    showToast(processingMsg, 'info');

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      showToast('تمّت عملية الدفع بنجاح ✓', 'success');

      const today = new Date();
      const newEndDate = new Date(today);
      newEndDate.setDate(today.getDate() + getPeriodDays(period));

      const newTransaction: Transaction = {
        id: `TXN-${Date.now()}`,
        date: today.toISOString(),
        amount: planData.finalPrice,
        packageTier: planData.tier,
        period,
        paymentMethod: method,
        status: 'success'
      };

      setSubscription(prev => ({
        ...prev,
        packageTier: planData.tier,
        isTrial: false,
        startDate: today.toISOString().split('T')[0],
        endDate: newEndDate.toISOString().split('T')[0],
        planName: PACKAGE_NAMES[planData.tier],
        transactions: [newTransaction, ...prev.transactions],
        autoRenew: true
      }));

      setTimeout(() => { onSuccess(); }, 2200);
    }, 1800);
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white rounded-[2rem] p-10 max-w-md w-full text-center shadow-2xl space-y-5">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto border-4 border-green-100">
            <CheckCircle2 size={56} className="text-green-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-800">تم الدفع بنجاح!</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            تم ترقية باقتك إلى <span className="font-black text-[#655ac1]">{PACKAGE_NAMES[planData.tier]}</span> بنجاح وتم تفعيل كافة المزايا.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-bold bg-green-50 py-2 rounded-xl">
            <Lock size={14} /> عملية آمنة ومشفّرة
          </div>
        </div>
      </div>
    );
  }

  const methods: { id: PayMethod; label: string; sub?: string; color: string; bg: string; icon: React.ReactNode }[] = [
    { id: 'mada', label: 'بطاقة مدى', sub: 'بطاقات البنوك السعودية', color: 'text-green-700', bg: 'bg-green-50', icon: <CreditCard size={20} /> },
    { id: 'visa', label: 'فيزا / ماستركارد', sub: 'Visa · Mastercard', color: 'text-blue-700', bg: 'bg-blue-50', icon: <CreditCard size={20} /> },
    { id: 'applepay', label: 'Apple Pay', sub: 'تحقق سريع بالوجه أو البصمة', color: 'text-slate-800', bg: 'bg-slate-100', icon: <Smartphone size={20} /> },
    { id: 'samsungpay', label: 'Samsung Pay', sub: 'تحقق بالنقر أو البصمة', color: 'text-[#1428A0]', bg: 'bg-blue-50', icon: <Smartphone size={20} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in dir-rtl">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-[#655ac1] rounded-xl"><CreditCard size={22} /></div>
            <div>
              <h2 className="text-base font-black text-slate-800">إتمام الدفع</h2>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Lock size={10} /> بيئة دفع آمنة ومشفّرة SSL</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><X size={22} /></button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Order Summary */}
          <div className="space-y-4">
            <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm"><FileText size={16} className="text-slate-400" /> ملخص الطلب</h3>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                <span>الباقة المختارة</span>
                <span className="font-bold text-slate-800">{PACKAGE_NAMES[planData.tier]} — {period === 'monthly' ? 'شهري' : period === 'semester' ? 'فصل' : 'سنة'}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                <span>سعر الباقة</span>
                <span className="font-bold">{planData.newPrice} ر.س</span>
              </div>
              {planData.remainingValue > 0 && (
                <div className="flex justify-between items-center text-sm font-medium text-green-600">
                  <span>خصم الرصيد المتبقي</span>
                  <span className="font-bold">- {planData.remainingValue} ر.س</span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="font-black text-slate-800">الإجمالي المستحق</span>
                <span className="text-2xl font-black text-[#655ac1]">{planData.finalPrice} ر.س</span>
              </div>
            </div>

            {planData.remainingValue > 0 && (
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex gap-2 text-xs text-blue-700">
                <AlertCircle size={16} className="shrink-0 text-blue-500 mt-0.5" />
                <span>تم احتساب الرصيد المتبقي من اشتراكك الحالي وخصمه تلقائياً (Pro-rata).</span>
              </div>
            )}
            {subscription.isTrial && (
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex gap-2 text-xs text-orange-700">
                <AlertCircle size={16} className="shrink-0 text-orange-500 mt-0.5" />
                <span>الترقية ستنهي فترتك التجريبية وتبدأ دورتك المدفوعة فوراً.</span>
              </div>
            )}
          </div>

          {/* Payment Side */}
          <div className="space-y-4">
            <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm"><CreditCard size={16} className="text-slate-400" /> طريقة الدفع</h3>

            {/* Method selector */}
            <div className="grid grid-cols-2 gap-2">
              {methods.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${method === m.id ? 'border-[#655ac1] bg-[#f4f3ff]' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                >
                  <div className={`p-1.5 rounded-lg ${m.bg} ${m.color}`}>{m.icon}</div>
                  <span className="font-bold text-slate-700 text-xs text-center leading-tight">{m.label}</span>
                  {m.sub && <span className="text-[10px] text-slate-400 text-center leading-tight">{m.sub}</span>}
                  {method === m.id && <div className="w-1.5 h-1.5 rounded-full bg-[#655ac1]" />}
                </button>
              ))}
            </div>

            {/* Card form */}
            {isCard && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">رقم البطاقة</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0000 0000 0000 0000"
                    value={cardNum}
                    onChange={e => setCardNum(formatCardNum(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:border-[#8779fb] focus:ring-2 focus:ring-[#e5e1fe] bg-white text-slate-800 placeholder-slate-300 tracking-wider"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">اسم حامل البطاقة</label>
                  <input
                    type="text"
                    placeholder="AHMED AL HARBI"
                    value={cardName}
                    onChange={e => setCardName(e.target.value.toUpperCase())}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#8779fb] focus:ring-2 focus:ring-[#e5e1fe] bg-white text-slate-800 placeholder-slate-300 uppercase tracking-wider"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">تاريخ الانتهاء</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      inputMode="numeric"
                      value={expiry}
                      onChange={e => setExpiry(formatExpiry(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:border-[#8779fb] focus:ring-2 focus:ring-[#e5e1fe] bg-white text-slate-800 placeholder-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">CVV</label>
                    <div className="relative">
                      <input
                        type={showCvv ? 'text' : 'password'}
                        placeholder="•••"
                        inputMode="numeric"
                        maxLength={4}
                        value={cvv}
                        onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:border-[#8779fb] focus:ring-2 focus:ring-[#e5e1fe] bg-white text-slate-800 placeholder-slate-300 pr-10"
                      />
                      <button onClick={() => setShowCvv(!showCvv)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showCvv ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Apple Pay / Samsung Pay mock */}
            {(method === 'applepay' || method === 'samsungpay') && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-3">
                <div className="w-14 h-14 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                  <Smartphone size={28} className={method === 'applepay' ? 'text-slate-700' : 'text-[#1428A0]'} />
                </div>
                <p className="text-sm font-bold text-slate-700">
                  {method === 'applepay' ? 'سيتم طلب بصمتك أو Face ID لإتمام الدفع' : 'سيتم التحقق من هويتك عبر Samsung Pay'}
                </p>
                <p className="text-xs text-slate-400">جاهزة عند الضغط على "تأكيد الدفع"</p>
              </div>
            )}

            {/* Pay button */}
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-l from-[#655ac1] to-[#8779fb] text-white rounded-xl font-black hover:opacity-90 shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-wait text-base"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  جاري المعالجة...
                </>
              ) : (
                <><Lock size={16} /> تأكيد ودفع {planData.finalPrice} ر.س</>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1"><Lock size={10} /> بيئة دفع آمنة بتشفير 256-bit SSL</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
