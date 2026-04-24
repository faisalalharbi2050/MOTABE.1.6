import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Trash2, CheckCircle2, Pen, Pencil, Check, AlertTriangle,
    Table, BookOpenCheck, AlertCircle, X, CalendarDays, Clock, Archive, BadgeCheck
} from 'lucide-react';
import { ScheduleSettingsData, SavedSchedule } from '../../../types';

interface Props {
    scheduleSettings: ScheduleSettingsData;
    setScheduleSettings: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
}

type ConfirmAction =
    | { mode: 'delete'; schedule: SavedSchedule }
    | { mode: 'adopt'; schedule: SavedSchedule }
    | { mode: 'unadopt'; schedule: SavedSchedule }
    | null;

type MenuState = {
    scheduleId: string;
    top: number;
    left: number;
} | null;

const ManageTab: React.FC<Props> = ({ scheduleSettings, setScheduleSettings }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [menuState, setMenuState] = useState<MenuState>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuState) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuState(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuState]);

    const settings = scheduleSettings;
    const savedSchedules = settings.savedSchedules || [];
    const activeScheduleId = settings.activeScheduleId;
    const activeSchedule = savedSchedules.find(s => s.id === activeScheduleId);
    const isFull = savedSchedules.length >= 10;
    const isNearFull = savedSchedules.length === 9;

    const scheduleGenerationCount = settings.scheduleGenerationCount || 0;
    const waitingGenerationCount = settings.waitingGenerationCount || 0;

    const dayNames: Record<number, string> = {
        0: 'الأحد', 1: 'الإثنين', 2: 'الثلاثاء',
        3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت',
    };

    const formatDateTime = (iso: string) => {
        const d = new Date(iso);
        return {
            day: dayNames[d.getDay()],
            date: new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
                year: 'numeric', month: '2-digit', day: '2-digit',
            }).format(d),
            time: new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
                hour: '2-digit', minute: '2-digit', hour12: true,
            }).format(d),
        };
    };

    const handleRenameSave = (id: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const updated = savedSchedules.map(s => s.id === id ? { ...s, name: trimmed } : s);
        setScheduleSettings(prev => ({ ...prev, savedSchedules: updated }));
        setEditingId(null);
        setEditingName('');
    };

    const handleConfirmAction = () => {
        if (!confirmAction) return;

        if (confirmAction.mode === 'adopt') {
            setScheduleSettings(prev => ({
                ...prev,
                timetable: JSON.parse(JSON.stringify(confirmAction.schedule.timetable)),
                activeScheduleId: confirmAction.schedule.id,
            }));
        }

        if (confirmAction.mode === 'unadopt') {
            setScheduleSettings(prev => ({ ...prev, activeScheduleId: undefined }));
        }

        if (confirmAction.mode === 'delete') {
            const id = confirmAction.schedule.id;
            const updated = savedSchedules.filter(s => s.id !== id);
            const isDeletingActiveSchedule = id === activeScheduleId;
            setScheduleSettings(prev => ({
                ...prev,
                savedSchedules: updated,
                activeScheduleId: isDeletingActiveSchedule ? undefined : prev.activeScheduleId,
                ...(isDeletingActiveSchedule ? { timetable: undefined } : {}),
            }));
        }

        setConfirmAction(null);
    };

    const openMenu = (event: React.MouseEvent<HTMLButtonElement>, scheduleId: string) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const menuWidth = 176;
        const left = Math.max(16, rect.left - menuWidth + rect.width);
        setMenuState(prev => prev?.scheduleId === scheduleId
            ? null
            : { scheduleId, top: rect.bottom + 8, left });
    };

    const stats = [
        { label: 'إجمالي جداول الحصص', value: String(scheduleGenerationCount), icon: CalendarDays },
        { label: 'إجمالي جداول الانتظار', value: String(waitingGenerationCount), icon: Clock },
        { label: 'الجداول المحفوظة', value: `${savedSchedules.length} / 10`, icon: Archive },
        { label: 'الجدول المعتمد', value: activeSchedule?.name ?? '—', icon: BadgeCheck, isText: true },
    ];

    const confirmTheme = confirmAction?.mode === 'delete'
        ? {
            iconWrap: 'bg-rose-50 text-rose-500',
            title: 'تأكيد الحذف',
            button: 'bg-rose-500 hover:bg-rose-600',
            subtitle: 'سيتم حذف الجدول المحدد من قائمة الجداول المحفوظة.',
            body: 'هذا الإجراء سيحذف جدول الحصص وجدول الانتظار الذي تم إنشاؤه نهائياً',
        }
        : confirmAction?.mode === 'unadopt'
            ? {
                iconWrap: 'bg-amber-50 text-amber-500',
                title: 'إلغاء الاعتماد',
                button: 'bg-amber-500 hover:bg-amber-600',
                subtitle: 'سيتم إلغاء اعتماد هذا الجدول.',
                body: 'سيبقى الجدول محفوظاً، لكن لن يكون هو الجدول المعتمد حالياً.',
            }
            : {
                iconWrap: 'bg-[#f1efff] text-[#655ac1]',
                title: 'اعتماد الجدول',
                button: 'bg-[#655ac1] hover:bg-[#5448b5]',
                subtitle: 'سيتم اعتماد هذا الجدول كجدول نشط.',
                body: 'سيصبح هذا الجدول هو الجدول المعتمد الحالي داخل صفحة إدارة الجداول.',
            };

    return (
        <div className="space-y-5" dir="rtl">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {stats.map((s, i) => (
                    <div
                        key={i}
                        className="bg-white border border-slate-200 rounded-2xl px-4 py-5 shadow-md flex items-start gap-3"
                        style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}
                    >
                        <div className="flex items-center justify-center shrink-0 text-[#655ac1]">
                            <s.icon size={22} />
                        </div>
                        <div className="min-w-0 flex-1 text-center">
                            <p className="text-xs font-bold text-slate-400 leading-none">{s.label}</p>
                            <p
                                className={`mt-1 font-black text-slate-800 truncate ${s.isText ? 'text-sm' : 'text-xl leading-none'}`}
                                title={s.value}
                            >
                                {s.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {isNearFull && !isFull && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                    <span className="text-sm font-semibold text-amber-700">
                        تبقّى مكان واحد فقط — احذف جدولاً قبل الإنشاء التالي
                    </span>
                </div>
            )}

            {isFull && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200">
                    <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                    <span className="text-sm font-semibold text-rose-700">
                        وصلت للحد الأقصى (10 جداول) — يجب حذف جدول قبل إنشاء جديد
                    </span>
                </div>
            )}

            <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden" style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="px-6 py-4 border-b border-slate-100 bg-white">
                    <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <BookOpenCheck size={18} className="text-[#655ac1]" />
                        الجداول المحفوظة
                        <span className="text-xs font-medium text-slate-400 mr-1">
                            ({savedSchedules.length} / 10)
                        </span>
                    </p>
                </div>

                {savedSchedules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400 opacity-60">
                        <Table size={64} strokeWidth={1.4} style={{ color: '#655ac1' }} />
                        <div className="text-center">
                            <p className="font-bold text-slate-600 text-lg mb-1">لا توجد جداول محفوظة بعد</p>
                            <p className="text-xs">سيُحفظ الجدول تلقائياً عند إنشائه من زر «بناء الجدول»</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right min-w-[820px]" dir="rtl">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center w-14">م</th>
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-right">اسم الجدول</th>
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">اليوم</th>
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">التاريخ</th>
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">الوقت</th>
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">الحالة</th>
                                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {savedSchedules.map((schedule, index) => {
                                    const isActive = schedule.id === activeScheduleId;
                                    const isEditing = editingId === schedule.id;
                                    const { day, date, time } = formatDateTime(schedule.createdAt);
                                    return (
                                        <tr
                                            key={schedule.id}
                                            className="hover:bg-accent/5 transition-all group"
                                            style={isActive ? { borderRight: '3px solid #655ac1' } : {}}
                                        >
                                            <td className="px-6 py-3.5 text-center">
                                                <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center text-[11px] font-black border border-slate-300 bg-white text-[#655ac1]">
                                                    {savedSchedules.length - index}
                                                </span>
                                            </td>

                                            <td className="px-6 py-3.5">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editingName}
                                                        onChange={e => setEditingName(e.target.value)}
                                                        autoFocus
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleRenameSave(schedule.id, editingName);
                                                            if (e.key === 'Escape') {
                                                                setEditingId(null);
                                                                setEditingName('');
                                                            }
                                                        }}
                                                        className="w-full px-3 py-2 bg-white border-2 border-[#655ac1] rounded-lg text-sm font-bold outline-none text-slate-800"
                                                        placeholder="اسم الجدول..."
                                                    />
                                                ) : (
                                                    <div className="flex items-center">
                                                        <span className="font-bold text-[13px] text-slate-800 truncate max-w-[220px]" title={schedule.name}>
                                                            {schedule.name}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-6 py-3.5 text-center">
                                                <span className="text-[12px] font-bold text-slate-700">{day}</span>
                                            </td>

                                            <td className="px-6 py-3.5 text-center">
                                                <div className="inline-flex items-center justify-center px-3 py-1 bg-slate-50 rounded-lg">
                                                    <span className="text-[12px] font-bold text-slate-700">{date}</span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-3.5 text-center">
                                                <div className="inline-flex items-center justify-center px-3 py-1 bg-slate-50 rounded-lg">
                                                    <span className="text-[12px] font-bold text-slate-700">{time}</span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-3.5 text-center">
                                                {isActive ? (
                                                    <span className="inline-flex items-center gap-1.5 text-[13px] font-black text-[#655ac1]">
                                                        <Check size={14} />
                                                        معتمد
                                                    </span>
                                                ) : (
                                                    <span className="text-[12px] font-semibold text-slate-400">
                                                        غير معتمد
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-6 py-3.5 text-center">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleRenameSave(schedule.id, editingName)}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-colors"
                                                            style={{ background: '#655ac1' }}
                                                        >
                                                            <Check size={12} /> حفظ
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditingId(null); setEditingName(''); }}
                                                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                                                        >
                                                            إلغاء
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center">
                                                        <button
                                                            onClick={(event) => openMenu(event, schedule.id)}
                                                            className="p-2 text-slate-400 bg-white hover:text-primary hover:bg-primary/5 rounded-lg transition-all border border-slate-200"
                                                            title="تعديل"
                                                        >
                                                            <Pen size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 text-slate-400 px-1">
                <AlertCircle size={15} className="shrink-0" />
                <span className="text-xs font-bold">
                    يُحفظ الجدول تلقائياً عند كل إنشاء · الحد الأقصى 10 جداول
                </span>
            </div>

            {menuState && createPortal(
                <div
                    ref={menuRef}
                    className="fixed w-44 rounded-2xl bg-white border border-slate-200 shadow-2xl p-1.5 z-[130]"
                    style={{ top: menuState.top, left: menuState.left }}
                    dir="rtl"
                >
                    <button
                        onClick={() => {
                            setEditingId(menuState.scheduleId);
                            const target = savedSchedules.find(s => s.id === menuState.scheduleId);
                            setEditingName(target?.name || '');
                            setMenuState(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        <Pencil size={14} />
                        تعديل
                    </button>

                    {(() => {
                        const schedule = savedSchedules.find(s => s.id === menuState.scheduleId);
                        if (!schedule) return null;
                        const isActive = schedule.id === activeScheduleId;

                        return (
                            <>
                                {!isActive && (
                                    <button
                                        onClick={() => {
                                            setConfirmAction({ mode: 'adopt', schedule });
                                            setMenuState(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                                    >
                                        <Check size={14} />
                                        اعتماد
                                    </button>
                                )}

                                {isActive && (
                                    <button
                                        onClick={() => {
                                            setConfirmAction({ mode: 'unadopt', schedule });
                                            setMenuState(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
                                    >
                                        <CheckCircle2 size={14} />
                                        إلغاء الاعتماد
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        setConfirmAction({ mode: 'delete', schedule });
                                        setMenuState(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                >
                                    <Trash2 size={14} />
                                    حذف
                                </button>
                            </>
                        );
                    })()}
                </div>,
                document.body
            )}

            {confirmAction && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden" dir="rtl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${confirmTheme.iconWrap}`}>
                                    <AlertTriangle size={22} />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-slate-800">{confirmTheme.title}</h3>
                                    <p className="text-sm font-bold text-slate-500 mt-0.5">{confirmTheme.subtitle}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 text-sm font-semibold leading-7 text-slate-600">
                            {confirmTheme.body}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="px-5 py-2.5 rounded-xl text-sm font-black text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleConfirmAction}
                                className={`px-5 py-2.5 rounded-xl text-sm font-black text-white transition-colors ${confirmTheme.button}`}
                            >
                                تأكيد
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageTab;
