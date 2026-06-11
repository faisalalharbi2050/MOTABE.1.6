import React, { useState } from 'react';
import { MessageSquare, CheckCircle2, ArrowLeft, Sparkles, SaudiRiyal, CalendarDays } from 'lucide-react';
import { useMessageArchive } from './MessageArchiveContext';
import MessagePaymentModal from './MessagePaymentModal';

type Pkg = { name: string; sms: number; wa: number; price: number; desc: string; recommended?: boolean };

const packages: Pkg[] = [
  { name: 'أساسية',  sms: 1000,  wa: 10000, price: 289, desc: 'رصيد يكفي المدارس بأعداد صغيرة' },
  { name: 'متقدمة',  sms: 5000,  wa: 20000, price: 749, desc: 'رصيد يكفي المدارس بأعداد متوسطة', recommended: true },
  { name: 'احترافية', sms: 10000, wa: 30000, price: 994, desc: 'رصيد يكفي المدارس بأعداد كبيرة' },
];

// واتساب — الأيقونة الرسمية بلونها الأخضر، مطابقة لتبويب الاشتراك الحالي.
const waIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd" />
  </svg>
);

const MessageSubscriptions: React.FC = () => {
  const { stats } = useMessageArchive();
  const [selectedPkg, setSelectedPkg] = useState<Pkg | null>(null);

  // ⚠️ مؤقت للتجربة: يبقي أزرار الاشتراك/الدفع مفتوحة حتى لو كانت الباقة مفعّلة،
  // لاختبار تصميم بوابة الدفع. أعِده إلى false عند الاعتماد النهائي.
  const PREVIEW_UNLOCK = true;

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="text-right mb-7">
          <h3 className="text-2xl font-black text-slate-800 mb-1.5">باقات الرسائل</h3>
          <p className="text-sm font-bold text-slate-500">اختر الباقة التي تناسبك</p>
        </div>

        {/* Duration Notice */}
        <div className="mb-8">
          <div className="flex w-full max-w-5xl items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-right">
            <div className="flex shrink-0 items-center justify-center text-[#655ac1]">
              <CalendarDays size={18} strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-black text-slate-800">
                <span>صلاحية كل باقة</span>
                <span className="text-[#655ac1]">12 شهراً</span>
              </div>
              <p className="mt-0.5 text-xs font-bold text-slate-400">تبدأ من تاريخ الاشتراك</p>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {packages.map((pkg) => {
            const isCurrent = stats.activePackageName === pkg.name;
            const features = [
              { icon: waIcon, text: `${pkg.wa.toLocaleString()} رسالة واتساب` },
              { icon: <MessageSquare size={17} className="text-[#007AFF]" strokeWidth={2.4} />, text: `${pkg.sms.toLocaleString()} رسالة SMS` },
            ];
            return (
              <div
                key={pkg.name}
                className={`bg-white border rounded-[2rem] p-6 text-center transition-all group flex flex-col relative overflow-hidden ${
                  isCurrent
                    ? 'border-slate-300 shadow-lg shadow-slate-200/70 -translate-y-0.5'
                    : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-lg'
                }`}
              >
                <div className="relative z-10 flex-1 flex flex-col">

                  {/* ── Badge slot: fixed height keeps cards aligned ── */}
                  <div className="h-7 flex items-center justify-center mb-4">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#655ac1] text-white text-xs font-black rounded-full shadow-sm shadow-indigo-200">
                        <CheckCircle2 size={15} strokeWidth={2.5} /> الباقة الحالية
                      </span>
                    ) : pkg.recommended ? (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-gradient-to-l from-[#655ac1] to-[#8779fb] text-white text-xs font-black rounded-full shadow-sm shadow-indigo-200">
                        <Sparkles size={12} className="fill-white" /> الأكثر طلبًا
                      </span>
                    ) : null}
                  </div>

                  <h4 className="text-2xl font-black text-slate-800 mb-2">{pkg.name}</h4>

                  <div className="flex justify-center items-center gap-1.5 mb-4">
                    <span className="text-4xl font-black text-[#655ac1]">{pkg.price}</span>
                    <SaudiRiyal className="w-6 h-6 text-[#655ac1]" strokeWidth={2.5} />
                  </div>

                  {/* Short package description */}
                  <p className="text-[13px] font-bold text-slate-500 leading-relaxed mb-5 px-2">
                    {pkg.desc}
                  </p>

                  {/* Divider between header and features */}
                  <div className="h-px bg-slate-200 mb-5" />

                  <div className="text-right flex-1 transition-colors mb-5 flex flex-col">
                    <div className="flex flex-col gap-3.5 flex-1">
                      {features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <span className="w-[20px] h-[20px] flex items-center justify-center shrink-0">
                            {f.icon}
                          </span>
                          <span className="text-sm font-black text-slate-800 leading-snug">{f.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action: subscribe */}
                  <button
                    onClick={() => setSelectedPkg(pkg)}
                    disabled={isCurrent && !PREVIEW_UNLOCK}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-base transition-all ${
                      isCurrent && !PREVIEW_UNLOCK
                        ? 'bg-[#f3f0ff] border border-[#e5e1fe] text-[#655ac1] cursor-default'
                        : 'bg-[#655ac1] text-white shadow-lg shadow-indigo-200 hover:opacity-90 hover:shadow-xl active:scale-[0.99]'
                    }`}
                  >
                    {isCurrent && !PREVIEW_UNLOCK ? (
                      <><CheckCircle2 size={18} /> باقتك الحالية</>
                    ) : (
                      <>{isCurrent ? 'تجديد الباقة' : 'اشترك الآن'} <ArrowLeft size={18} strokeWidth={2.5} /></>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedPkg && (
        <MessagePaymentModal
          pkg={selectedPkg}
          onClose={() => setSelectedPkg(null)}
        />
      )}
    </div>
  );
};

export default MessageSubscriptions;
