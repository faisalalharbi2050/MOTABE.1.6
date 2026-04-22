import React from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRightLeft, Info, CheckCircle2, RotateCcw, Users } from 'lucide-react';
import { SwapResult } from '../../utils/scheduleInteractive';

interface SwapConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    swapResult: SwapResult | null;
}

const formatStep = (step: string) => step.replace(/â†"/g, ' مقابل ').replace(/â†'/g, ' إلى ');

const extractTeachers = (steps: string[]) => {
    const names = new Set<string>();
    for (const step of steps) {
        const matches: string[] = step.match(/\[([^\]]+)\]/g) ?? [];
        for (const match of matches) {
            const name = match.slice(1, -1).trim();
            if (name) names.add(name);
        }
    }
    return Array.from(names);
};

const SwapConfirmationModal: React.FC<SwapConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    swapResult,
}) => {
    if (!isOpen || !swapResult) return null;

    const steps = (swapResult.chainSteps || []).map(formatStep);
    const teachers = extractTeachers(swapResult.chainSteps || []);
    const isChain = !!swapResult.isChain;
    const accent = { strong: '#655ac1', border: '#d1d5db' };

    const modalContent = (
        <div className="fixed inset-0 z-[320] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-4xl overflow-hidden rounded-[24px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]" dir="rtl" onClick={(event) => event.stopPropagation()}>
                <div className="border-b border-slate-100 px-7 py-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 items-center justify-center" style={{ color: accent.strong }}>
                                {isChain ? <RotateCcw size={24} /> : <ArrowRightLeft size={24} />}
                            </div>
                            <div>
                                <h3 className="font-black text-2xl text-slate-800">
                                    {isChain ? 'تبديل متعدد' : 'تبديل بسيط'}
                                </h3>
                                <p className="text-base font-bold text-slate-500 mt-0.5">
                                    {isChain ? 'راجع خطوات التبديل قبل اعتماده على الجدول.' : 'راجع تفاصيل التبديل قبل اعتماده.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="px-7 py-5 space-y-4">
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-white px-4 py-3" style={{ borderColor: accent.border }}>
                        <span className="text-sm font-black" style={{ color: accent.strong }}>
                            {isChain ? 'سيتم تنفيذ تبديل متعدد' : 'سيتم تنفيذ تبديل بسيط'}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: accent.strong }}>
                            <Users size={15} style={{ color: accent.strong }} />
                            {teachers.length} معلمين
                        </span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="text-sm font-bold" style={{ color: accent.strong }}>
                            {steps.length} خطوات
                        </span>
                    </div>

                    {isChain && (
                        <div className="flex items-start gap-2 rounded-2xl border bg-white px-4 py-3" style={{ borderColor: accent.border }}>
                            <Info size={17} className="mt-0.5 shrink-0" style={{ color: accent.strong }} />
                            <p className="text-sm font-bold leading-6" style={{ color: accent.strong }}>
                                التبديل المباشر لا يكفي هنا دون تعارض، لذلك اقترح النظام هذا التسلسل البديل.
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        {steps.map((step, index) => (
                            <div key={index} className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3" style={{ borderColor: accent.border }}>
                                <div
                                    className="flex h-8 w-8 items-center justify-center rounded-full border text-sm font-black shrink-0"
                                    style={{ background: '#ffffff', borderColor: accent.border, color: accent.strong }}
                                >
                                    {index + 1}
                                </div>
                                <p className="text-base font-semibold leading-relaxed" style={{ color: accent.strong }}>
                                    {step}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-7 py-5">
                    <button
                        onClick={onClose}
                        className="rounded-xl border px-7 py-3 text-base font-black text-slate-600 transition hover:bg-slate-100"
                        style={{ borderColor: accent.border }}
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={onConfirm}
                        className="inline-flex items-center gap-2 rounded-xl px-7 py-3 text-base font-black text-white transition active:scale-95"
                        style={{ background: '#655ac1' }}
                    >
                        <CheckCircle2 size={19} />
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
