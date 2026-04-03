import React, { useState } from 'react';
import {
    X, Trash2, CheckCircle2, History,
    Pencil, Check, Star, CalendarDays, Clock,
    BookOpenCheck, LayoutList, AlertTriangle, Shield, User2
} from 'lucide-react';
import { ScheduleSettingsData, SavedSchedule, TimetableData } from '../../types';

interface ScheduleManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: ScheduleSettingsData;
    onUpdateSettings: (newSettings: ScheduleSettingsData) => void;
    currentTimetable?: TimetableData;
}

const ScheduleManagerModal: React.FC<ScheduleManagerModalProps> = ({
    isOpen,
    onClose,
    settings,
    onUpdateSettings,
}) => {
    const [editingId, setEditingId]     = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmAdoptId, setConfirmAdoptId]   = useState<string | null>(null);

    if (!isOpen) return null;

    const savedSchedules   = settings.savedSchedules   || [];
    const activeScheduleId = settings.activeScheduleId;
    const activeSchedule   = savedSchedules.find(s => s.id === activeScheduleId);
    const isFull           = savedSchedules.length >= 10;
    const isNearFull       = savedSchedules.length === 9;

    const scheduleGenerationCount = settings.scheduleGenerationCount || 0;
    const waitingGenerationCount  = settings.waitingGenerationCount  || 0;

    const dayNames: Record<number, string> = {
        0: 'الأحد', 1: 'الإثنين', 2: 'الثلاثاء',
        3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت',
    };

    const formatDateTime = (iso: string) => {
        const d = new Date(iso);
        return {
            day:  dayNames[d.getDay()],
            date: new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
                year: 'numeric', month: '2-digit', day: '2-digit',
            }).format(d),
            time: new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
                hour: '2-digit', minute: '2-digit', hour12: true,
            }).format(d),
        };
    };

    // ── Actions ───────────────────────────────────────────────────────
    const handleAdoptConfirm = (schedule: SavedSchedule) => {
        onUpdateSettings({
            ...settings,
            timetable:        JSON.parse(JSON.stringify(schedule.timetable)),
            activeScheduleId: schedule.id,
        });
        setConfirmAdoptId(null);
    };

    const handleDeleteConfirm = (id: string) => {
        const updated     = savedSchedules.filter(s => s.id !== id);
        const newActiveId = id === activeScheduleId
            ? (updated[0]?.id ?? undefined)
            : activeScheduleId;
        onUpdateSettings({
            ...settings,
            savedSchedules:   updated,
            activeScheduleId: newActiveId,
            ...(id === activeScheduleId && updated[0]
                ? { timetable: JSON.parse(JSON.stringify(updated[0].timetable)) }
                : {}),
        });
        setConfirmDeleteId(null);
    };

    const handleRenameSave = (id: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const updated = savedSchedules.map(s =>
            s.id === id ? { ...s, name: trimmed } : s
        );
        onUpdateSettings({ ...settings, savedSchedules: updated });
        setEditingId(null);
        setEditingName('');
    };

    // ── stat cards data ───────────────────────────────────────────────
    const stats = [
        {
            label: 'إجمالي جداول الحصص',
            value: scheduleGenerationCount,
            icon:  <LayoutList size={20} />,
            color: '#655ac1',
        },
        {
            label: 'إجمالي جداول الانتظار',
            value: waitingGenerationCount,
            icon:  <Clock size={20} />,
            color: '#0ea5e9',
        },
        {
            label: 'الجداول المحفوظة',
            value: `${savedSchedules.length} / 10`,
            icon:  <BookOpenCheck size={20} />,
            color: isFull ? '#ef4444' : '#10b981',
        },
        {
            label: 'الجدول المعتمد',
            value: activeSchedule?.name ?? '—',
            icon:  <Star size={20} />,
            color: '#f59e0b',
            isText: true,
        },
    ];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            dir="rtl"
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">

                {/* ── Header ── */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#e5e1fe] text-[#655ac1] flex items-center justify-center shadow-sm">
                            <History size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">إدارة الجداول</h2>
                            <p className="text-sm font-medium text-slate-500 mt-1">عرض وإدارة جميع الجداول المُنشأة</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="overflow-y-auto flex-1 p-6 space-y-5 bg-slate-50/50">

                    {/* ── Stat Cards ── */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <h3 className="text-sm font-black text-slate-700 mb-4">ملخص إحصائي</h3>
                        <div className="grid grid-cols-4 gap-4">
                            {stats.map((s, i) => (
                                <div
                                    key={i}
                                    className="bg-slate-100 border-2 border-slate-200 rounded-2xl p-4 text-center flex flex-col items-center gap-2"
                                >
                                    <span style={{ color: s.color }}>{s.icon}</span>
                                    {s.isText ? (
                                        <p
                                            className="text-sm font-black leading-tight truncate w-full px-1"
                                            style={{ color: s.color }}
                                            title={String(s.value)}
                                        >
                                            {s.value}
                                        </p>
                                    ) : (
                                        <p className="text-3xl font-black" style={{ color: s.color }}>
                                            {s.value}
                                        </p>
                                    )}
                                    <p className="text-xs font-bold text-slate-600">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Alerts ── */}
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

                    {/* ── Table ── */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                            <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                                <BookOpenCheck size={15} className="text-[#655ac1]" />
                                الجداول المحفوظة
                                <span className="text-xs font-medium text-slate-400 mr-1">
                                    ({savedSchedules.length} / 10)
                                </span>
                            </p>
                        </div>

                        {savedSchedules.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                                <History size={40} className="opacity-30" style={{ color: '#655ac1' }} />
                                <div className="text-center">
                                    <p className="font-bold text-slate-600 text-sm mb-1">لا توجد جداول محفوظة بعد</p>
                                    <p className="text-xs">سيُحفظ الجدول تلقائياً عند إنشائه من زر «بناء الجدول»</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm" dir="rtl">
                                    <thead>
                                        <tr>
                                            <th className="bg-[#655ac1] text-white font-black px-4 py-3 text-center w-12" style={{ borderLeft: '1px solid #7c6fcf' }}>م</th>
                                            <th className="bg-[#655ac1] text-white font-black px-4 py-3 text-right" style={{ borderLeft: '1px solid #7c6fcf' }}>اسم الجدول</th>
                                            <th className="bg-[#655ac1] text-white font-black px-4 py-3 text-center w-20" style={{ borderLeft: '1px solid #7c6fcf' }}>اليوم</th>
                                            <th className="bg-[#655ac1] text-white font-black px-4 py-3 text-center w-28" style={{ borderLeft: '1px solid #7c6fcf' }}>التاريخ</th>
                                            <th className="bg-[#655ac1] text-white font-black px-4 py-3 text-center w-24" style={{ borderLeft: '1px solid #7c6fcf' }}>الوقت</th>
                                            <th className="bg-[#655ac1] text-white font-black px-4 py-3 text-center w-24" style={{ borderLeft: '1px solid #7c6fcf' }}>الحالة</th>
                                            <th className="bg-[#5046a0] text-white font-black px-4 py-3 text-center w-48">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {savedSchedules.map((schedule, index) => {
                                            const isActive   = schedule.id === activeScheduleId;
                                            const isEditing  = editingId === schedule.id;
                                            const isDeleting = confirmDeleteId === schedule.id;
                                            const isAdopting = confirmAdoptId === schedule.id;
                                            const { day, date, time } = formatDateTime(schedule.createdAt);
                                            const isSystem = schedule.createdBy === 'النظام';

                                            return (
                                                <tr
                                                    key={schedule.id}
                                                    className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                                                    style={isActive ? { borderRight: '3px solid #655ac1' } : {}}
                                                >
                                                    {/* م */}
                                                    <td className="px-4 py-3 text-center">
                                                        <span
                                                            className="inline-flex w-7 h-7 rounded-lg items-center justify-center text-xs font-black"
                                                            style={{
                                                                background: isActive ? 'linear-gradient(135deg,#655ac1,#7c6dd6)' : '#f1f0f8',
                                                                color:      isActive ? 'white' : '#94a0b8',
                                                            }}
                                                        >
                                                            {savedSchedules.length - index}
                                                        </span>
                                                    </td>

                                                    {/* اسم الجدول */}
                                                    <td className="px-4 py-3">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editingName}
                                                                onChange={e => setEditingName(e.target.value)}
                                                                autoFocus
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter')  handleRenameSave(schedule.id, editingName);
                                                                    if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
                                                                }}
                                                                className="w-full px-3 py-1.5 bg-white border-2 border-[#655ac1] rounded-lg text-sm font-bold outline-none text-slate-800"
                                                                placeholder="اسم الجدول..."
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-800 truncate max-w-[180px]" title={schedule.name}>
                                                                    {schedule.name}
                                                                </span>
                                                                {isActive && (
                                                                    <span
                                                                        className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-[#655ac1]"
                                                                        style={{ background: 'rgba(101,90,193,0.12)' }}
                                                                    >
                                                                        <Star size={8} /> معتمد
                                                                    </span>
                                                                )}
                                                                <span
                                                                    className="shrink-0 opacity-40"
                                                                    title={isSystem ? 'أنشأه النظام' : 'أنشأه المستخدم'}
                                                                >
                                                                    {isSystem
                                                                        ? <Shield size={11} className="text-slate-400" />
                                                                        : <User2  size={11} className="text-slate-400" />
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* اليوم */}
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-xs font-semibold text-slate-600">{day}</span>
                                                    </td>

                                                    {/* التاريخ */}
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <CalendarDays size={11} className="text-[#655ac1] shrink-0" />
                                                            <span className="text-xs text-slate-600">{date}</span>
                                                        </div>
                                                    </td>

                                                    {/* الوقت */}
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Clock size={11} className="text-[#655ac1] shrink-0" />
                                                            <span className="text-xs text-slate-600">{time}</span>
                                                        </div>
                                                    </td>

                                                    {/* الحالة */}
                                                    <td className="px-4 py-3 text-center">
                                                        {isActive ? (
                                                            <span
                                                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-[#655ac1]"
                                                                style={{ background: 'rgba(101,90,193,0.12)' }}
                                                            >
                                                                <CheckCircle2 size={10} /> معتمد
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full text-slate-500 bg-slate-100">
                                                                غير معتمد
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* الإجراءات */}
                                                    <td className="px-4 py-3 text-center">
                                                        {/* حالة تأكيد الحذف */}
                                                        {isDeleting ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <span className="text-xs font-semibold text-rose-500">تأكيد الحذف؟</span>
                                                                <button
                                                                    onClick={() => handleDeleteConfirm(schedule.id)}
                                                                    className="px-3 py-1 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
                                                                >
                                                                    نعم
                                                                </button>
                                                                <button
                                                                    onClick={() => setConfirmDeleteId(null)}
                                                                    className="px-3 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                                                >
                                                                    إلغاء
                                                                </button>
                                                            </div>
                                                        /* حالة تأكيد الاعتماد */
                                                        ) : isAdopting ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <span className="text-xs font-semibold text-[#655ac1]">تأكيد الاعتماد؟</span>
                                                                <button
                                                                    onClick={() => handleAdoptConfirm(schedule)}
                                                                    className="px-3 py-1 text-xs font-bold text-white rounded-lg transition-colors"
                                                                    style={{ background: '#655ac1' }}
                                                                >
                                                                    نعم
                                                                </button>
                                                                <button
                                                                    onClick={() => setConfirmAdoptId(null)}
                                                                    className="px-3 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                                                >
                                                                    إلغاء
                                                                </button>
                                                            </div>
                                                        /* حالة تعديل الاسم */
                                                        ) : isEditing ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => handleRenameSave(schedule.id, editingName)}
                                                                    className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white rounded-lg transition-colors"
                                                                    style={{ background: '#655ac1' }}
                                                                >
                                                                    <Check size={12} /> حفظ
                                                                </button>
                                                                <button
                                                                    onClick={() => { setEditingId(null); setEditingName(''); }}
                                                                    className="px-3 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                                                >
                                                                    إلغاء
                                                                </button>
                                                            </div>
                                                        /* الأزرار العادية */
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-2">
                                                                {!isActive && (
                                                                    <button
                                                                        onClick={() => setConfirmAdoptId(schedule.id)}
                                                                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white rounded-lg transition-all hover:scale-[1.03] active:scale-95"
                                                                        style={{
                                                                            background: 'linear-gradient(135deg,#655ac1,#7c6dd6)',
                                                                            boxShadow:  '0 2px 6px rgba(101,90,193,0.3)',
                                                                        }}
                                                                        title="اعتماد هذا الجدول"
                                                                    >
                                                                        <CheckCircle2 size={11} /> اعتماد
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingId(schedule.id);
                                                                        setEditingName(schedule.name);
                                                                    }}
                                                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-[#655ac1] rounded-lg transition-all"
                                                                    title="تعديل اسم الجدول"
                                                                >
                                                                    <Pencil size={11} /> تعديل
                                                                </button>
                                                                <button
                                                                    onClick={() => setConfirmDeleteId(schedule.id)}
                                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                                                    title="حذف الجدول"
                                                                >
                                                                    <Trash2 size={14} />
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
                </div>

                {/* ── Footer ── */}
                <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
                    <span className="text-xs font-medium text-slate-400">
                        يُحفظ الجدول تلقائياً عند كل إنشاء · الحد الأقصى 10 جداول
                    </span>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScheduleManagerModal;
