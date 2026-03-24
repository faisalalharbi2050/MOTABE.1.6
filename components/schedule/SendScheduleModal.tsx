import React, { useState } from 'react';
import { X, Share2, Copy, CheckCircle2, Users, UserCog, GraduationCap, Link as LinkIcon, MessageCircle } from 'lucide-react';
import { Teacher, ClassInfo } from '../../types';

interface SendScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    teachers: Teacher[];
    classes: ClassInfo[];
    schoolName?: string; // Optional: displays which school's schedule is being sent (separate mode)
}

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);

const SendScheduleModal: React.FC<SendScheduleModalProps> = ({ isOpen, onClose, teachers, classes, schoolName }) => {
    const [selectedTarget, setSelectedTarget] = useState('');
    const [selectedType, setSelectedType]   = useState('');
    const [selectedIds, setSelectedIds]     = useState<string[]>([]);
    const [generatedLink, setGeneratedLink] = useState('');
    const [isCopied, setIsCopied]           = useState(false);

    if (!isOpen) return null;

    const targetGroups = [
        { id: 'teachers', title: 'المعلمون',               icon: <Users size={20} /> },
        { id: 'admin',    title: 'الإداريون',               icon: <UserCog size={20} /> },
        { id: 'students', title: 'الطلاب / أولياء الأمور', icon: <GraduationCap size={20} /> },
    ];

    const scheduleTypes = [
        { id: 'general_teachers',   title: 'الجدول العام للمعلمين' },
        { id: 'general_waiting',    title: 'الجدول العام للانتظار' },
        { id: 'individual_teacher', title: 'جدول معلم'              },
        { id: 'general_classes',    title: 'الجدول العام للفصول'   },
        { id: 'individual_class',   title: 'جدول فصل'               },
    ];

    const needsTeachers = selectedType === 'individual_teacher';
    const needsClasses  = selectedType === 'individual_class';
    const listItems     = needsTeachers ? teachers : needsClasses
        ? [...classes].sort((a, b) => a.grade !== b.grade ? a.grade - b.grade : (a.section||0)-(b.section||0))
        : [];

    const toggleId = (id: string) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const toggleAll = () =>
        setSelectedIds(selectedIds.length === listItems.length ? [] : listItems.map(i => i.id));

    const targetLabel = targetGroups.find(g => g.id === selectedTarget)?.title || '';

    const isReady = selectedTarget && selectedType &&
        ((!needsTeachers && !needsClasses) || selectedIds.length > 0);

    const generateLink = () => {
        const uniqueId = Math.random().toString(36).substr(2, 9);
        setGeneratedLink(`${window.location.origin || 'https://motabe.app'}/s/${selectedTarget}/${selectedType}/${uniqueId}`);
        setIsCopied(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
    };

    const buildMessage = () => {
        if (selectedTarget === 'teachers')
            return `الزملاء المعلمين،\nتجدون عبر الرابط جدول الحصص الأسبوعي:\n${generatedLink}\n\nمع تحيات إدارة المدرسة`;
        if (selectedTarget === 'students')
            return `السادة أولياء الأمور،\nتجدون عبر الرابط جدول الحصص الأسبوعي:\n${generatedLink}\n\nمع تمنياتنا بعام دراسي موفق`;
        return `مرفق رابط جدول الحصص المحدث:\n${generatedLink}`;
    };

    const handleWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(buildMessage())}`, '_blank');
    const handleSMS      = () => window.open(`sms:?&body=${encodeURIComponent(`مرفق رابط جدول الحصص:\n${generatedLink}`)}`, '_self');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col animate-in zoom-in-95 overflow-hidden">

                {/* Header */}
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#e5e1fe] text-[#655ac1] flex items-center justify-center">
                            <Share2 size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-xl">إرسال الجداول</h3>
                            <p className="text-sm font-bold text-slate-500">
                                {schoolName
                                    ? `مشاركة جدول ${schoolName} عبر روابط ذكية`
                                    : 'مشاركة الجداول مع المستفيدين عبر روابط ذكية'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Step 1: Target */}
                    <div>
                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                            <span className="w-6 h-6 rounded-full bg-[#e5e1fe] text-[#655ac1] flex items-center justify-center text-xs font-black">1</span>
                            الفئة المستهدفة
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                            {targetGroups.map(g => (
                                <button key={g.id} onClick={() => setSelectedTarget(g.id)}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 font-bold text-sm transition-all ${
                                        selectedTarget === g.id
                                            ? 'border-[#8779fb] bg-white text-[#655ac1]'
                                            : 'border-slate-100 bg-slate-50 hover:border-slate-200 text-slate-600'
                                    }`}
                                >
                                    {g.icon}
                                    <span className="whitespace-nowrap text-xs">{g.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Step 2: Schedule Type */}
                    <div className={`transition-opacity ${selectedTarget ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                            <span className="w-6 h-6 rounded-full bg-[#e5e1fe] text-[#655ac1] flex items-center justify-center text-xs font-black">2</span>
                            نوع الجدول المرسل
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {scheduleTypes.map(t => (
                                <button key={t.id}
                                    onClick={() => { setSelectedType(t.id); setSelectedIds([]); }}
                                    className={`px-4 py-2.5 rounded-xl border-2 text-right font-bold text-sm transition-all ${
                                        selectedType === t.id
                                            ? 'border-[#8779fb] bg-white text-[#655ac1]'
                                            : 'border-slate-100 bg-slate-50 hover:border-slate-200 text-slate-600'
                                    }`}
                                >{t.title}</button>
                            ))}
                        </div>
                    </div>

                    {/* Step 3: Multi-select teachers/classes */}
                    {(needsTeachers || needsClasses) && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                                <span className="w-6 h-6 rounded-full bg-[#e5e1fe] text-[#655ac1] flex items-center justify-center text-xs font-black">3</span>
                                {needsTeachers ? 'اختر المعلمين' : 'اختر الفصول'}
                            </h4>
                            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3">
                                {/* Select All */}
                                <label className="flex items-center gap-3 px-2 py-2 mb-1 rounded-xl hover:bg-white cursor-pointer transition-colors border-b border-slate-200 pb-2">
                                    <input type="checkbox"
                                        checked={selectedIds.length === listItems.length && listItems.length > 0}
                                        onChange={toggleAll}
                                        className="w-4 h-4 accent-[#655ac1] rounded"
                                    />
                                    <span className="text-sm font-black text-[#655ac1]">
                                        {selectedIds.length === listItems.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                                    </span>
                                </label>
                                <div className="max-h-40 overflow-y-auto space-y-0.5">
                                    {listItems.map(item => (
                                        <label key={item.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white cursor-pointer transition-colors">
                                            <input type="checkbox"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={() => toggleId(item.id)}
                                                className="w-4 h-4 accent-[#655ac1] rounded"
                                            />
                                            <span className="text-sm font-bold text-slate-700">
                                                {'name' in item ? (item as any).name : `${(item as any).grade}/${(item as any).section}`}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                {selectedIds.length > 0 && (
                                    <p className="text-xs text-[#655ac1] font-black mt-2 px-2">
                                        ✓ تم اختيار {selectedIds.length} {needsTeachers ? 'معلم' : 'فصل'}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Generate button */}
                    {isReady && (
                        <div className="flex justify-center pt-1">
                            <button onClick={generateLink}
                                className="px-8 py-3 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-2xl font-bold transition-all shadow-lg shadow-[#655ac1]/20 flex items-center gap-2 active:scale-95"
                            >
                                <LinkIcon size={18} />
                                إنشاء الرابط المخصص لـ {targetLabel}
                            </button>
                        </div>
                    )}

                    {/* Result */}
                    {generatedLink && (
                        <div className="bg-[#f5f3ff] border border-[#c4b8f8] rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom-4">
                            <div className="flex items-center justify-between">
                                <h5 className="font-black text-[#655ac1] flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                    تم إنشاء الرابط
                                </h5>
                                {isCopied && <span className="text-emerald-600 font-bold text-xs">✓ تم النسخ</span>}
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-white border border-[#c4b8f8] rounded-xl px-4 py-3 text-left font-mono text-sm text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap" dir="ltr">
                                    {generatedLink}
                                </div>
                                <button onClick={handleCopy}
                                    className="px-4 py-3 bg-white border border-[#c4b8f8] hover:bg-[#e5e1fe] text-[#655ac1] rounded-xl transition-colors"
                                    title="نسخ الرابط"
                                >
                                    <Copy size={18} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={handleWhatsApp}
                                    className="flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-2xl font-black text-sm transition-all shadow-md shadow-[#25D366]/25 active:scale-95"
                                >
                                    <WhatsAppIcon />
                                    مشاركة عبر واتساب
                                </button>
                                <button onClick={handleSMS}
                                    className="flex items-center justify-center gap-2 py-3 px-4 bg-[#8779fb] hover:bg-[#655ac1] text-white rounded-2xl font-black text-sm transition-all shadow-md shadow-[#8779fb]/25 active:scale-95"
                                >
                                    <MessageCircle size={18} />
                                    إرسال رسالة نصية
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SendScheduleModal;
