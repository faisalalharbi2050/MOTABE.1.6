import React, { useState, useEffect, useMemo } from 'react';
import { Subject, ScheduleSettingsData } from '../../types';
import { Bot, Save, X, Sparkles } from 'lucide-react';

interface SubjectAbbreviationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    subjects: Subject[];
    settings: ScheduleSettingsData;
    onSave: (abbreviations: Record<string, string>) => void;
}

const generateSuggestion = (name: string): string => {
    if (name.includes('الدراسات الإسلامية')) return 'إسلامية';
    if (name.includes('قرآن وإسلامية')) return 'قرآن';
    if (name.includes('التربية البدنية')) return 'بدنية';
    if (name.includes('التربية الفنية')) return 'فنية';
    if (name.includes('الدراسات الاجتماعية')) return 'اجتماعيات';
    if (name.includes('المهارات الرقمية')) return 'رقمية';
    if (name.includes('المهارات الحياتية')) return 'حياتية';
    if (name.includes('لغتي')) return 'لغتي';
    if (name.includes('القرآن الكريم')) return 'قرآن';
    if (name.includes('الرياضيات')) return 'رياضيات';
    if (name.includes('العلوم')) return 'علوم';
    if (name.includes('اللغة الإنجليزية')) return 'إنجليزي';
    if (name.includes('اللغة العربية')) return 'عربي';
    const words = name.split(' ');
    if (words.length > 1 && words[0] !== 'التربية' && words[0] !== 'الدراسات' && words[0] !== 'اللغة') {
        return words[0];
    } else if (words.length > 1) {
        return words[1];
    }
    return name;
};

const SubjectAbbreviationsModal: React.FC<SubjectAbbreviationsModalProps> = ({
    isOpen,
    onClose,
    subjects,
    settings,
    onSave
}) => {
    // abbreviations keyed by subject NAME (not id) — one entry per unique name
    const [abbreviations, setAbbreviations] = useState<Record<string, string>>({});

    // Unique, named subjects only — deduplicated by name
    const uniqueSubjects = useMemo(() => {
        const seen = new Set<string>();
        return subjects.filter(s => {
            const name = s.name?.trim();
            if (!name) return false;          // skip unnamed/empty
            if (seen.has(name)) return false; // skip duplicates
            seen.add(name);
            return true;
        });
    }, [subjects]);

    // Load existing abbreviations (ID-keyed in settings) → convert to name-keyed for display
    useEffect(() => {
        if (!isOpen) return;
        const initialMap: Record<string, string> = {};
        uniqueSubjects.forEach(sub => {
            // Find any saved abbreviation for any subject with this name
            const savedEntry = subjects.find(
                s => s.name === sub.name && settings.subjectAbbreviations?.[s.id]
            );
            initialMap[sub.name] = savedEntry
                ? settings.subjectAbbreviations![savedEntry.id]
                : generateSuggestion(sub.name);
        });
        setAbbreviations(initialMap);
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        // Expand name-keyed map → id-keyed (cover ALL subjects with same name)
        const expanded: Record<string, string> = {};
        subjects.forEach(sub => {
            const name = sub.name?.trim();
            if (name && abbreviations[name] !== undefined) {
                expanded[sub.id] = abbreviations[name];
            }
        });
        onSave(expanded);
        onClose();
    };

    const handleSuggestAll = () => {
        const newMap: Record<string, string> = {};
        uniqueSubjects.forEach(sub => {
            newMap[sub.name] = generateSuggestion(sub.name);
        });
        setAbbreviations(newMap);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-800">اختصارات المواد</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">اكتب اسماً مختصراً لكل مادة حتى تظهر بشكل صحيح في الجدول</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSuggestAll}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
                        >
                            <Sparkles size={16} className="text-amber-500" />
                            اقتراح ذكي للكل
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <X size={22} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 flex-1 custom-scrollbar bg-slate-50/50">
                    {uniqueSubjects.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-medium">
                            لا يوجد مواد مضافة للنظام حتى الآن.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {uniqueSubjects.map(subject => (
                                <div key={subject.name} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-700 truncate" title={subject.name}>
                                        {subject.name}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={abbreviations[subject.name] || ''}
                                            onChange={(e) => setAbbreviations({ ...abbreviations, [subject.name]: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-[#655ac1] focus:outline-none focus:ring-2 focus:ring-[#655ac1]/20 focus:border-[#655ac1] transition-all dir-rtl"
                                            placeholder="اسم مختصر..."
                                            maxLength={15}
                                        />
                                        <Bot size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none opacity-50" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                    >
                        إغلاق
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-2.5 bg-[#655ac1] hover:bg-[#5a4eb3] text-white font-bold rounded-xl transition-all shadow-md shadow-[#655ac1]/20 flex items-center gap-2"
                    >
                        <Save size={18} />
                        حفظ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubjectAbbreviationsModal;
