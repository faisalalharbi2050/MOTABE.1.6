import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowUpRight, MessageSquare, PackageCheck, Receipt, SaudiRiyal, ShoppingCart, Trash2 } from 'lucide-react';
import { SubscriptionInfo } from '../../types';
import { PACKAGE_NAMES } from './packages';
import { SubscriptionCart } from './cartTypes';
import PaymentModal from './PaymentModal';
import MessagePaymentModal from '../messaging/MessagePaymentModal';

interface SubscriptionCartReviewProps {
  cart: SubscriptionCart;
  subscription: SubscriptionInfo;
  setSubscription: React.Dispatch<React.SetStateAction<SubscriptionInfo>>;
  onRemovePlan: () => void;
  onRemoveMessagePackage: () => void;
  onOpenPricing: () => void;
  onOpenMessagePackages: () => void;
  onComplete: () => void;
}

const periodLabel = (period: string) =>
  period === 'monthly' ? 'شهري' : period === 'semester' ? 'فصل دراسي' : 'سنة دراسية';

const periodDays = (period: string) =>
  period === 'monthly' ? 30 : period === 'semester' ? 90 : 365;

const Money: React.FC<{ value: number; className?: string; iconSize?: number }> = ({ value, className = '', iconSize = 15 }) => (
  <span className={`inline-flex items-center gap-1 ${className}`}>
    {value.toLocaleString()}
    <SaudiRiyal size={iconSize} className="shrink-0" strokeWidth={2.25} />
  </span>
);

const WhatsAppIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0">
    <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd" />
  </svg>
);

const SubscriptionCartReview: React.FC<SubscriptionCartReviewProps> = ({
  cart,
  subscription,
  setSubscription,
  onRemovePlan,
  onRemoveMessagePackage,
  onOpenPricing,
  onOpenMessagePackages,
  onComplete,
}) => {
  const [checkout, setCheckout] = useState<'plan' | 'message' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<'plan' | 'message' | null>(null);
  const total = (cart.plan?.finalPrice ?? 0) + (cart.messagePackage?.price ?? 0);
  const itemCount = (cart.plan ? 1 : 0) + (cart.messagePackage ? 1 : 0);

  const handleCheckout = () => {
    if (cart.plan) setCheckout('plan');
    else if (cart.messagePackage) setCheckout('message');
  };

  if (checkout === 'plan' && cart.plan) {
    return (
      <PaymentModal
        planData={cart.plan}
        period={cart.plan.period}
        subscription={subscription}
        setSubscription={setSubscription}
        messagePackage={cart.messagePackage}
        onClose={() => setCheckout(null)}
        onSuccess={onComplete}
      />
    );
  }

  if (checkout === 'message' && cart.messagePackage) {
    return (
      <MessagePaymentModal
        pkg={cart.messagePackage}
        onClose={() => setCheckout(null)}
        onSuccess={onComplete}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-[#655ac1] flex items-center justify-center">
              <ShoppingCart size={22} strokeWidth={2.4} />
            </span>
            <div>
              <h3 className="text-xl font-black text-slate-800">مراجعة الطلب</h3>
              <p className="mt-0.5 text-xs font-bold text-slate-500">
                {itemCount > 0 ? `${itemCount} عنصر في السلة` : 'السلة فارغة حالياً'}
              </p>
            </div>
          </div>
        </div>

        {itemCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <p className="text-sm font-bold text-slate-500 mb-4">اختر باقة متابع أو باقة رسائل لإضافتها إلى السلة.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button type="button" onClick={onOpenPricing} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-black text-[#655ac1] transition-opacity hover:opacity-80">
                تصفح باقات متابع
                <ArrowUpRight size={16} strokeWidth={2.5} />
              </button>
              <button type="button" onClick={onOpenMessagePackages} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-black text-[#655ac1] transition-opacity hover:opacity-80">
                تصفح باقات الرسائل
                <ArrowUpRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
            <div className="space-y-3">
              {cart.plan && (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-[#655ac1] flex items-center justify-center shrink-0 pt-0.5">
                        <PackageCheck size={21} strokeWidth={2.4} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-base font-black text-slate-800">{PACKAGE_NAMES[cart.plan.tier]}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          اشتراك متابع · {periodLabel(cart.plan.period)} · {periodDays(cart.plan.period)} يومًا
                        </p>
                        {cart.plan.remainingValue > 0 && (
                          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            يشمل خصم الرصيد المتبقي بقيمة
                            <Money value={cart.plan.remainingValue} iconSize={12} />
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Money value={cart.plan.finalPrice} className="text-base font-black text-slate-900" />
                      <button type="button" onClick={() => setDeleteConfirm('plan')} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:border-rose-200">
                        <Trash2 size={15} className="text-rose-500" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {cart.messagePackage && (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-[#655ac1] flex items-center justify-center shrink-0 pt-0.5">
                        <MessageSquare size={19} strokeWidth={2.4} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-base font-black text-slate-800">باقة الرسائل {cart.messagePackage.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-400">
                          <span className="inline-flex items-center gap-1.5"><WhatsAppIcon size={14} /> {cart.messagePackage.wa.toLocaleString()} واتساب</span>
                          <span className="inline-flex items-center gap-1.5"><MessageSquare size={14} className="text-[#007AFF]" strokeWidth={2.4} /> {cart.messagePackage.sms.toLocaleString()} SMS</span>
                          <span className="inline-flex items-center text-amber-600">صلاحية 12 شهراً</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Money value={cart.messagePackage.price} className="text-base font-black text-slate-900" />
                      <button type="button" onClick={() => setDeleteConfirm('message')} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:border-rose-200">
                        <Trash2 size={15} className="text-rose-500" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <aside className="rounded-2xl border border-slate-200 p-5 h-fit">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800">
                <Receipt size={17} className="text-[#655ac1]" strokeWidth={2.4} />
                ملخص الطلب
              </h4>
              <div className="space-y-3">
                {cart.plan && (
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-bold text-slate-500">باقة متابع</span>
                    <Money value={cart.plan.finalPrice} className="font-black text-[#655ac1]" iconSize={13} />
                  </div>
                )}
                {cart.messagePackage && (
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-bold text-slate-500">باقة الرسائل</span>
                    <Money value={cart.messagePackage.price} className="font-black text-[#655ac1]" iconSize={13} />
                  </div>
                )}
                <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-black text-slate-800">الإجمالي</span>
                  <Money value={total} className="text-xl font-black text-[#655ac1]" iconSize={17} />
                </div>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#655ac1] px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition-all hover:opacity-90 active:scale-[0.99]"
              >
                متابعة الدفع
                <ArrowLeft size={17} strokeWidth={2.5} />
              </button>
            </aside>
          </div>
        )}
      </div>

      {deleteConfirm && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="flex items-center gap-3 px-7 pt-7 pb-4">
              <Trash2 size={24} className="text-rose-500 shrink-0" />
              <div>
                <h3 className="font-black text-slate-800 text-base">تأكيد الحذف من السلة</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">يمكنك إضافة العنصر مرة أخرى لاحقًا</p>
              </div>
            </div>
            <p className="px-6 pb-5 text-sm text-slate-600 font-medium">
              هل تريد حذف <span className="font-black text-slate-800">"{deleteConfirm === 'plan' ? (cart.plan ? PACKAGE_NAMES[cart.plan.tier] : 'باقة متابع') : (cart.messagePackage ? `باقة الرسائل ${cart.messagePackage.name}` : 'باقة الرسائل')}"</span> من السلة؟
            </p>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm === 'plan') onRemovePlan();
                  else onRemoveMessagePackage();
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 size={15} /> تأكيد الحذف
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SubscriptionCartReview;
