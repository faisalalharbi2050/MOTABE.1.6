import React, { useMemo, useRef, useState } from 'react';
import { Check, GripVertical, Search, UserPlus, Users, X } from 'lucide-react';
import { Teacher, ScheduleSettingsData, Subject, ClassInfo } from '../../types';
import InlineScheduleView from './InlineScheduleView';

interface CustomTeacherViewProps {
    teachers: Teacher[];
    subjects: Subject[];
    classes: ClassInfo[];
    settings: ScheduleSettingsData;
    onUpdateSettings: (newSettings: ScheduleSettingsData) => void;
    activeSchoolId: string;
    selectedTeacherIds: string[];
    setSelectedTeacherIds: React.Dispatch<React.SetStateAction<string[]>>;
    specializationNames?: Record<string, string>;
}

const CustomTeacherView: React.FC<CustomTeacherViewProps> = ({
    teachers,
    subjects,
    classes,
    settings,
    onUpdateSettings,
    selectedTeacherIds,
    setSelectedTeacherIds,
    specializationNames = {},
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSelecting, setIsSelecting] = useState(false);
    const [sharedDragSource, setSharedDragSource] = useState<{ teacherId: string; day: string; period: number } | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    const filteredTeachers = useMemo(
        () => teachers.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())),
        [teachers, searchQuery]
    );

    const selectedTeachers = useMemo(
        () => teachers.filter(t => selectedTeacherIds.includes(t.id)),
        [teachers, selectedTeacherIds]
    );

    return (
        <div className="space-y-6 relative">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Users size={20} className="text-[#655ac1]" />
                        <h4 className="text-lg font-black text-slate-800">مقارنة وتعديل</h4>
                        <button
                            onClick={() => setIsSelecting(true)}
                            className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center gap-2"
                        >
                            <UserPlus size={18} className="text-[#655ac1]" />
                            إضافة المعلمين
                        </button>
                    </div>
                </div>

                {selectedTeachers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                        {selectedTeachers.map(t => (
                            <div key={t.id} className="flex items-center gap-2 pl-2.5 pr-3.5 py-2 bg-white text-[#655ac1] rounded-xl border border-slate-300 shadow-sm">
                                <span className="text-sm font-bold">{t.name}</span>
                                <button
                                    onClick={() => setSelectedTeacherIds(prev => prev.filter(id => id !== t.id))}
                                    className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedTeachers.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
                        <div>
                            <h5 className="text-base font-black text-slate-800">جداول المعلمين للمقارنة والتعديل</h5>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                                عرض الجداول مع دعم السحب والإفلات
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-xl border border-[#d9d3ff] bg-white px-3 py-2 text-xs font-black text-[#655ac1] shadow-sm">
                            <GripVertical size={14} />
                            اسحب الحصة بين الجداول
                        </div>
                    </div>

                    <div className={`grid gap-4 items-start ${selectedTeachers.length >= 2 ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`} dir="rtl">
                        {selectedTeachers.map(teacher => (
                            <div key={teacher.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-3">
                                <InlineScheduleView
                                    type="individual_teacher"
                                    settings={settings}
                                    teachers={teachers}
                                    classes={classes}
                                    subjects={subjects}
                                    targetId={teacher.id}
                                    specializationNames={specializationNames}
                                    onUpdateSettings={onUpdateSettings}
                                    interactive
                                    showWaitingManagement
                                    compactIndividual
                                    externalDragSource={sharedDragSource}
                                    onExternalDragSourceChange={setSharedDragSource}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center justify-center text-[#655ac1] mb-4">
                        <Users size={32} />
                    </div>
                    <h5 className="text-lg font-black text-slate-700 mb-2">استعرض وقارن الجداول</h5>
                    <p className="text-sm font-medium text-slate-500 whitespace-nowrap">
                        اختر معلماً أو معلمين لعرض الجداول بشكل موحّد ومتجاور داخل الواجهة.
                    </p>
                </div>
            )}

            {isSelecting && (
                <div
                    className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4"
                    onMouseDown={(event) => {
                        if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
                            setIsSelecting(false);
                        }
                    }}
                >
                    <div
                        ref={dialogRef}
                        className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 p-3 animate-in zoom-in-95"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-3 px-2 pt-2 pb-3">
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-[#655ac1]" />
                                <h5 className="font-black text-slate-800">إضافة المعلمين</h5>
                            </div>
                            <button
                                onClick={() => setIsSelecting(false)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="relative mb-2">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="ابحث عن معلم..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#655ac1]/20 font-medium"
                            />
                        </div>

                        <div className="flex items-center justify-between px-2 py-2 mb-2 border border-slate-100 bg-slate-50 rounded-xl">
                            <button onClick={() => setSelectedTeacherIds(teachers.map(t => t.id))} className="text-xs font-black text-[#655ac1] hover:underline">اختيار الكل</button>
                            <button onClick={() => setSelectedTeacherIds([])} className="text-xs font-black text-slate-400 hover:text-rose-500 hover:underline">إلغاء الكل</button>
                        </div>

                        <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                            {filteredTeachers.map(t => {
                                const isSelected = selectedTeacherIds.includes(t.id);
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            setSelectedTeacherIds(prev => (
                                                isSelected ? prev.filter(id => id !== t.id) : [...prev, t.id]
                                            ));
                                        }}
                                        className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between border ${
                                            isSelected
                                                ? 'bg-white text-[#655ac1] border-[#655ac1] shadow-sm'
                                                : 'text-slate-700 border-transparent hover:bg-[#f0edff] hover:text-[#655ac1] hover:border-[#d9d3ff]'
                                        }`}
                                    >
                                        {t.name}
                                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border transition-all ${
                                            isSelected
                                                ? 'bg-[#655ac1] border-[#655ac1] text-white'
                                                : 'border-slate-300 text-transparent'
                                        }`}>
                                            <Check size={12} strokeWidth={3} />
                                        </span>
                                    </button>
                                );
                            })}
                            {filteredTeachers.length === 0 && (
                                <p className="text-center text-xs text-slate-400 font-medium py-3">لا يوجد معلمون مطابقون</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomTeacherView;
