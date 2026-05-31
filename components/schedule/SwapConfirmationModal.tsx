import React from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRightLeft, CheckCircle2, RotateCcw, Users, ArrowLeft } from 'lucide-react';
import { SwapResult, SwapStepDetail } from '../../utils/scheduleInteractive';

interface SwapConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    swapResult: SwapResult | null;
}

const PURPLE = '#655ac1';

// خانة وقت: "الأحد ح2" مع تمييز رقم الحصة بالبنفسجي — لا تلتفّ
const SlotText: React.FC<{ day: string; period: number }> = ({ day, period }) => (
    <span className="whitespace-nowrap text-sm font-bold text-slate-700">
        {day} ح<span className="font-black" style={{ color: PURPLE }}>{period}</span>
    </span>
);

// نقطة بيان بسيطة (بدون إطار/خلفية، لون موحّد، حجم خط موحّد)
const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
        <span className="text-sm font-bold text-slate-700">{children}</span>
    </div>
);

// حركة "من الخانة إلى الخانة"
const Movement: React.FC<{ detail: SwapStepDetail }> = ({ detail }) => (
    <span className="inline-flex items-center gap-1.5">
        <SlotText day={detail.fromDay} period={detail.fromPeriod} />
        <ArrowLeft size={13} className="text-slate-400" />
        <SlotText day={detail.toDay} period={detail.toPeriod} />
    </span>
);

// بطاقة طرف التبديل (من / إلى) للتبديل البسيط
const SwapSideCard: React.FC<{ label: string; detail: SwapStepDetail }> = ({ label, detail }) => (
    <div className="relative flex-1 rounded-2xl border border-slate-200 bg-white p-4 pt-5">
        <span className="absolute -top-2.5 right-4 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-black" style={{ color: PURPLE }}>
            {label}
        </span>
        <p className="mb-3 text-sm font-black text-slate-800">{detail.teacher}</p>
        <div className="space-y-2">
            <Bullet><Movement detail={detail} /></Bullet>
            {detail.subject && <Bullet>{detail.subject}</Bullet>}
            <Bullet>فصل {detail.className}</Bullet>
        </div>
    </div>
);

// خطوة الخط الزمني (للتبديل المتعدد)
const TimelineStep: React.FC<{ index: number; total: number; detail: SwapStepDetail }> = ({ index, total, detail }) => (
    <div className="flex gap-3">
        <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: PURPLE }}>{index + 1}</div>
            {index < total - 1 && <div className="my-1 w-0.5 flex-1 bg-slate-200" />}
        </div>
        <div className="mb-3 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-black text-slate-800">{detail.teacher}</p>
            <div className="mt-2"><Movement detail={detail} /></div>
            <div className="mt-2 flex items-center gap-4">
                {detail.subject && <Bullet>{detail.subject}</Bullet>}
                <Bullet>فصل {detail.className}</Bullet>
            </div>
        </div>
    </div>
);

const SwapConfirmationModal: React.FC<SwapConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    swapResult,
}) => {
    if (!isOpen || !swapResult) return null;

    const details = swapResult.swapDetails || [];
    const isChain = !!swapResult.isChain;
    const isMove = !isChain && details.length === 1;

    const teacherCount = new Set(details.map(d => d.teacher)).size;
    const stepCount = details.length;

    const title = isChain ? 'تبديل متعدد' : isMove ? 'نقل حصة' : 'تبديل بسيط';
    const description = isChain
        ? 'تبديل متعدد يتطلب نقل عدة حصص بين عدة معلمين.'
        : isMove
            ? 'نقل حصة من وقت إلى آخر.'
            : 'تبديل حصّتين بين اثنين مباشرةً.';
    const width = isChain ? 'max-w-md' : isMove ? 'max-w-md' : 'max-w-lg';

    const modalContent = (
        <div className="fixed inset-0 z-[320] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4" onClick={onClose}>
            <div className={`w-full ${width} overflow-hidden rounded-[26px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]`} dir="rtl" onClick={(event) => event.stopPropagation()}>
                {/* الهيدر — أبيض بالكامل، أيقونة بنفسجية بلا خلفية */}
                <div className="border-b border-slate-100 px-7 pt-6 pb-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 items-center justify-center" style={{ color: PURPLE }}>
                                {isChain ? <RotateCcw size={26} /> : <ArrowRightLeft size={26} />}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">{title}</h3>
                                <p className="mt-0.5 text-sm font-bold text-slate-500">{description}</p>
                            </div>
                        </div>
                        {/* زر الإغلاق المعتمد: إطار دائري رمادي */}
                        <button
                            onClick={onClose}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-400 transition-all hover:bg-slate-50 hover:text-rose-500"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    {/* شارات إحصائية — إطار رمادي، نص بنفسجي */}
                    <div className="mt-4 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black" style={{ color: PURPLE }}>
                            <Users size={13} style={{ color: PURPLE }} /> {teacherCount} {teacherCount === 1 ? 'معلم' : 'معلمين'}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black" style={{ color: PURPLE }}>
                            {stepCount} {stepCount === 1 ? 'خطوة' : 'خطوات'}
                        </span>
                    </div>
                </div>

                <div className="px-7 py-6">
                    {isChain ? (
                        <>
                            <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                <p className="text-sm font-bold leading-6 text-slate-600">
                                    لم يكن بالإمكان تبديل الحصتين مباشرةً دون حدوث تعارض في الجدول، لكن يمكن التبديل وفق الخطوات التالية.
                                </p>
                            </div>
                            <div>
                                {details.map((detail, index) => (
                                    <TimelineStep key={index} index={index} total={details.length} detail={detail} />
                                ))}
                            </div>
                        </>
                    ) : isMove ? (
                        <div className="flex">
                            {details[0] && <SwapSideCard label="نقل" detail={details[0]} />}
                        </div>
                    ) : (
                        <div className="flex items-stretch gap-3">
                            {details[0] && <SwapSideCard label="من" detail={details[0]} />}
                            <div className="flex items-center">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm" style={{ background: PURPLE }}>
                                    <ArrowRightLeft size={18} />
                                </div>
                            </div>
                            {details[1] && <SwapSideCard label="إلى" detail={details[1]} />}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-7 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-100"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={onConfirm}
                        className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-black text-white shadow-sm transition hover:brightness-110 active:scale-95"
                        style={{ background: PURPLE }}
                    >
                        <CheckCircle2 size={18} />
                        اعتماد التبديل
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') {
        return modalContent;
    }

    return createPortal(modalContent, document.body);
};

export default SwapConfirmationModal;
