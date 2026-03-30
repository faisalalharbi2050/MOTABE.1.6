import React, { useState } from 'react';
import { X, Lock, CheckCircle2, Eye, EyeOff, ShieldCheck, AlertCircle, MessageSquare } from 'lucide-react';
import { useToast } from '../ui/ToastProvider';
import { useMessageArchive } from './MessageArchiveContext';

interface MessagePaymentModalProps {
  pkg: { name: string; sms: number; wa: number; price: number };
  onClose: () => void;
}

type PayMethod = 'mada' | 'visa' | 'applepay' | 'samsungpay';

const WA_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd" />
  </svg>
);

/* ── Card Preview ── */
const CardPreview: React.FC<{ cardNum: string; cardName: string; expiry: string; method: PayMethod }> = ({
  cardNum, cardName, expiry, method,
}) => {
  const raw     = cardNum.replace(/\D/g, '').padEnd(16, '·');
  const chunks  = raw.match(/.{1,4}/g) ?? ['····', '····', '····', '····'];
  const formatted = chunks.join('  ');
  return (
    <div className="relative h-[148px] rounded-2xl bg-gradient-to-br from-[#4e43b0] to-[#8779fb] p-5 text-white shadow-lg overflow-hidden">
      <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/10 rounded-full" />
      <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-white/10 rounded-full" />
      <div className="relative z-10 h-full flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <span className="text-white/60 text-[11px] font-bold">متابع Pay</span>
          {method === 'mada' ? (
            <span className="bg-white text-green-600 text-[11px] font-black px-2 py-0.5 rounded-md">mada</span>
          ) : (
            <span className="text-white font-black italic text-base tracking-wider">VISA</span>
          )}
        </div>
        <div className="font-mono text-[15px] font-bold tracking-[0.2em]">{formatted}</div>
        <div className="flex justify-between items-end">
          <div>
            <div className="text-white/50 text-[9px] uppercase tracking-wide mb-0.5">حامل البطاقة</div>
            <div className="text-xs font-bold truncate max-w-[150px]">{cardName || '—'}</div>
          </div>
          <div className="text-right">
            <div className="text-white/50 text-[9px] uppercase tracking-wide mb-0.5">صالحة حتى</div>
            <div className="text-xs font-bold">{expiry || 'MM/YY'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Step Indicator ── */
const Steps: React.FC = () => (
  <div className="flex items-center gap-2">
    <div className="flex items-center gap-1.5 text-[#8779fb]/70">
      <div className="w-5 h-5 rounded-full bg-[#e5e1fe] flex items-center justify-center">
        <CheckCircle2 size={11} className="text-[#655ac1]" />
      </div>
      <span className="text-xs font-bold">اختيار الباقة</span>
    </div>
    <div className="w-6 h-px bg-[#e5e1fe]" />
    <div className="flex items-center gap-1.5 text-[#655ac1]">
      <div className="w-5 h-5 rounded-full bg-[#655ac1] flex items-center justify-center">
        <span className="text-white text-[10px] font-black">2</span>
      </div>
      <span className="text-xs font-black">الدفع</span>
    </div>
    <div className="w-6 h-px bg-[#e5e1fe]" />
    <div className="flex items-center gap-1.5 text-slate-300">
      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
        <span className="text-[10px] font-black text-slate-300">3</span>
      </div>
      <span className="text-xs font-bold">تأكيد</span>
    </div>
  </div>
);

/* ── Main Component ── */
const MessagePaymentModal: React.FC<MessagePaymentModalProps> = ({ pkg, onClose }) => {
  const { showToast } = useToast();
  const { buyPackage } = useMessageArchive();

  const [method, setMethod]             = useState<PayMethod>('mada');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess]       = useState(false);
  const [showCvv, setShowCvv]           = useState(false);
  const [cardNum, setCardNum]           = useState('');
  const [cardName, setCardName]         = useState('');
  const [expiry, setExpiry]             = useState('');
  const [cvv, setCvv]                   = useState('');

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
      if (cardNum.replace(/\s/g, '').length < 16) { showToast('يرجى إدخال رقم بطاقة صحيح', 'error'); return; }
      if (!cardName.trim())  { showToast('يرجى إدخال اسم حامل البطاقة', 'error'); return; }
      if (expiry.length < 5) { showToast('يرجى إدخال تاريخ انتهاء صحيح', 'error'); return; }
      if (cvv.length < 3)    { showToast('يرجى إدخال رمز CVV', 'error'); return; }
    }
    setIsProcessing(true);
    const msg = method === 'applepay' ? 'جاري التحقق عبر Apple Pay...'
      : method === 'samsungpay' ? 'جاري التحقق عبر Samsung Pay...'
      : 'جاري معالجة الدفع بأمان...';
    showToast(msg, 'info');

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      showToast('تمّت عملية الدفع بنجاح ✓', 'success');
      buyPackage({ name: pkg.name, wa: pkg.wa, sms: pkg.sms });
      setTimeout(() => { onClose(); }, 2200);
    }, 1800);
  };

  /* ── Success screen ── */
  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white rounded-[2rem] p-10 max-w-md w-full text-center shadow-2xl space-y-5">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto border-4 border-green-100">
            <CheckCircle2 size={52} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">تم الدفع بنجاح!</h2>
            <p className="text-slate-500 font-medium leading-relaxed text-sm">
              تم تفعيل{' '}
              <span className="font-black text-[#655ac1]">الباقة {pkg.name}</span>{' '}
              وإضافة الرصيد فوراً.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-bold bg-green-50 py-2.5 rounded-xl">
            <ShieldCheck size={16} /> عملية آمنة ومشفّرة
          </div>
        </div>
      </div>
    );
  }

  const payMethods: {
    id: PayMethod;
    logo: React.ReactNode;
    sub: string;
    activeBorder: string;
    activeBg: string;
  }[] = [
    { id: 'mada',      logo: <span className="font-black text-green-600 text-base tracking-wide">mada</span>,           sub: 'بطاقات البنوك السعودية', activeBorder: 'border-green-400',    activeBg: 'bg-green-50'  },
    { id: 'visa',      logo: <span className="font-black italic text-blue-700 text-base tracking-wider">VISA</span>,    sub: 'Visa · Mastercard',      activeBorder: 'border-blue-400',     activeBg: 'bg-blue-50'   },
    { id: 'applepay',  logo: <span className="font-black text-slate-800 text-sm"> Pay</span>,                           sub: 'Face ID أو بصمة الإصبع', activeBorder: 'border-slate-400',    activeBg: 'bg-slate-100' },
    { id: 'samsungpay',logo: <span className="font-black text-[#1428A0] text-xs">Samsung Pay</span>,                   sub: 'بصمة أو NFC',            activeBorder: 'border-[#1428A0]',   activeBg: 'bg-blue-50'   },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in dir-rtl">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">

        {/* ── Header ── */}
        <div className="bg-white px-6 pt-5 pb-6 relative overflow-hidden shrink-0 border-b border-slate-100">
          <div className="absolute top-0 left-0 w-40 h-40 bg-[#e5e1fe]/20 rounded-full -translate-y-1/2 -translate-x-1/2" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#e5e1fe]/20 rounded-full translate-y-1/2 translate-x-1/2" />
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors z-20"
          >
            <X size={17} />
          </button>
          <div className="relative z-10">
            <Steps />
            <div className="flex items-end justify-between mt-4">
              <div>
                <h2 className="text-[#655ac1] font-black text-xl leading-tight">الباقة {pkg.name}</h2>
                <p className="text-[#8779fb] text-sm mt-0.5 font-medium">باقة رسائل — صالحة 12 شهراً</p>
              </div>
              <div className="text-left">
                <div className="text-slate-400 text-xs mb-0.5">الإجمالي المستحق</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#655ac1]">{pkg.price}</span>
                  <span className="text-[#8779fb] text-sm font-bold">ر.س</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* ── Order Summary ── */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">ملخص الطلب</h3>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">الباقة</span>
                <span className="font-black text-slate-800">الباقة {pkg.name}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-1.5">
                  {WA_ICON} واتساب
                </span>
                <span className="font-bold text-slate-700">{pkg.wa.toLocaleString()} رسالة</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <MessageSquare size={15} className="text-[#007AFF]" /> نصية SMS
                </span>
                <span className="font-bold text-slate-700">{pkg.sms.toLocaleString()} رسالة</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">الصلاحية</span>
                <span className="font-bold text-slate-700">12 شهراً</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">الإجمالي</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[#655ac1]">{pkg.price}</span>
                  <span className="text-slate-400 text-sm">ر.س</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex gap-2 text-xs text-amber-700">
              <AlertCircle size={14} className="shrink-0 text-amber-500 mt-0.5" />
              <span>صلاحية الباقة 12 شهراً تبدأ من تاريخ الاشتراك.</span>
            </div>

            {/* Security badges */}
            <div className="flex items-center justify-center gap-4 pt-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <ShieldCheck size={13} className="text-green-500" />
                SSL 256-bit
              </div>
              <div className="w-px h-3 bg-slate-200" />
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Lock size={11} />
                دفع آمن ومشفّر
              </div>
            </div>
          </div>

          {/* ── Payment Side ── */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">طريقة الدفع</h3>

            <div className="grid grid-cols-2 gap-2">
              {payMethods.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border-2 transition-all min-h-[62px] ${
                    method === m.id
                      ? `${m.activeBorder} ${m.activeBg} shadow-sm`
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  {m.logo}
                  <span className="text-[10px] text-slate-400 text-center leading-tight">{m.sub}</span>
                  {method === m.id && <div className="w-1.5 h-1.5 rounded-full bg-[#655ac1]" />}
                </button>
              ))}
            </div>

            {isCard && (
              <CardPreview cardNum={cardNum} cardName={cardName} expiry={expiry} method={method} />
            )}

            {isCard && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">رقم البطاقة</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0000  0000  0000  0000"
                    value={cardNum}
                    onChange={e => setCardNum(formatCardNum(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:border-[#8779fb] focus:ring-2 focus:ring-[#e5e1fe] bg-white text-slate-800 placeholder-slate-300 tracking-wider"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">اسم حامل البطاقة</label>
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
                    <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">تاريخ الانتهاء</label>
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
                    <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">CVV</label>
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
                      <button
                        onClick={() => setShowCvv(!showCvv)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showCvv ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(method === 'applepay' || method === 'samsungpay') && (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2">
                <div className={`text-3xl font-black ${method === 'applepay' ? 'text-slate-800' : 'text-[#1428A0]'}`}>
                  {method === 'applepay' ? ' Pay' : 'Samsung Pay'}
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  {method === 'applepay'
                    ? 'سيتم طلب بصمتك أو Face ID لإتمام الدفع'
                    : 'سيتم التحقق من هويتك عبر Samsung Pay'}
                </p>
                <p className="text-xs text-slate-400">جاهزة عند الضغط على زر الدفع</p>
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-l from-[#4e43b0] to-[#8779fb] text-white rounded-xl font-black hover:opacity-90 shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-wait text-base"
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
                <><Lock size={16} /> ادفع الآن — {pkg.price} ر.س</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagePaymentModal;
