import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, BookOpenCheck, Check, Edit3, Pencil, Table, Trash2, X } from 'lucide-react';
import { DutyScheduleData, SavedDutySchedule } from '../../../types';

interface Props {
  dutyData: DutyScheduleData;
  setDutyData: React.Dispatch<React.SetStateAction<DutyScheduleData>>;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return {
    date: new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d),
    time: new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(d),
  };
};

const ManageTab: React.FC<Props> = ({ dutyData, setDutyData, showToast }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [menuState, setMenuState] = useState<{ scheduleId: string; top: number; left: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SavedDutySchedule | null>(null);
  const [confirmAdopt, setConfirmAdopt] = useState<{ schedule: SavedDutySchedule; mode: 'adopt' | 'unadopt' } | null>(null);
  const warnedFullAutoSaveRef = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const savedSchedules = dutyData.savedSchedules || [];
  const activeScheduleId = dutyData.activeScheduleId;
  const approvedSchedule = savedSchedules.find(schedule => schedule.isApproved || schedule.id === activeScheduleId);
  const hasCurrentSchedule = dutyData.dayAssignments.some(day => day.staffAssignments.length > 0);
  const currentScheduleIsSaved = !!activeScheduleId && savedSchedules.some(schedule => schedule.id === activeScheduleId);
  const isFull = savedSchedules.length >= 10;
  const isNearFull = savedSchedules.length === 9;

  useEffect(() => {
    if (!menuState) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuState(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuState]);

  const openMenu = (event: React.MouseEvent<HTMLButtonElement>, scheduleId: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 176;
    const left = Math.max(16, rect.left - menuWidth + rect.width);
    setMenuState(prev => prev?.scheduleId === scheduleId ? null : { scheduleId, top: rect.bottom + 8, left });
  };

  useEffect(() => {
    if (!hasCurrentSchedule || currentScheduleIsSaved) return;
    if (isFull) {
      if (!warnedFullAutoSaveRef.current) {
        warnedFullAutoSaveRef.current = true;
        showToast('وصلت للحد الأقصى 10 جداول. احذف جدولاً قبل إنشاء جدول جديد.', 'warning');
      }
      return;
    }
    warnedFullAutoSaveRef.current = false;
    setDutyData(prev => {
      const prevSaved = prev.savedSchedules || [];
      const alreadySaved = !!prev.activeScheduleId && prevSaved.some(schedule => schedule.id === prev.activeScheduleId);
      if (alreadySaved || prevSaved.length >= 10) return prev;
      const id = `duty-schedule-${Date.now()}`;
      const savedEntry: SavedDutySchedule = {
        id,
        name: `جدول رقم ${prevSaved.length + 1}`,
        createdAt: new Date().toISOString(),
        dayAssignments: prev.dayAssignments,
        isApproved: false,
      };
      return {
        ...prev,
        savedSchedules: [savedEntry, ...prevSaved],
        activeScheduleId: id,
      };
    });
  }, [currentScheduleIsSaved, hasCurrentSchedule, isFull, setDutyData, showToast]);

  const saveName = (schedule: SavedDutySchedule) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setDutyData(prev => ({
      ...prev,
      savedSchedules: (prev.savedSchedules || []).map(item =>
        item.id === schedule.id ? { ...item, name: trimmed } : item
      ),
    }));
    setEditingId(null);
    setEditingName('');
    showToast('تم تعديل اسم الجدول', 'success');
  };

  const adoptSchedule = (schedule: SavedDutySchedule) => {
    setDutyData(prev => ({
      ...prev,
      savedSchedules: (prev.savedSchedules || []).map(item => ({ ...item, isApproved: item.id === schedule.id })),
      dayAssignments: [...schedule.dayAssignments],
      isApproved: true,
      approvedAt: new Date().toISOString(),
      activeScheduleId: schedule.id,
    }));
    showToast('تم اعتماد جدول المناوبة', 'success');
    setConfirmAdopt(null);
  };

  const unadoptSchedule = (schedule: SavedDutySchedule) => {
    setDutyData(prev => ({
      ...prev,
      savedSchedules: (prev.savedSchedules || []).map(item => item.id === schedule.id ? { ...item, isApproved: false } : item),
      isApproved: false,
      approvedAt: undefined,
    }));
    showToast('تم إلغاء اعتماد جدول المناوبة', 'success');
    setConfirmAdopt(null);
  };

  const deleteSchedule = (schedule: SavedDutySchedule) => {
    setDutyData(prev => {
      const isActive = prev.activeScheduleId === schedule.id;
      return {
        ...prev,
        savedSchedules: (prev.savedSchedules || []).filter(item => item.id !== schedule.id),
        activeScheduleId: isActive ? undefined : prev.activeScheduleId,
        ...(isActive ? { dayAssignments: [], weekAssignments: [], isApproved: false, approvedAt: undefined } : {}),
      };
    });
    showToast('تم حذف الجدول من القائمة', 'success');
    setConfirmDelete(null);
  };

  const stats = [
    { label: 'إجمالي جداول المناوبة', value: String(savedSchedules.length) },
    { label: 'الجداول المحفوظة', value: `${savedSchedules.length} / 10` },
    { label: 'الجدول المعتمد', value: approvedSchedule?.name ?? '-' },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-slate-200 rounded-2xl px-5 py-5 text-center shadow-sm">
            <p className="text-sm font-black text-slate-500">{stat.label}</p>
            <p className="mt-3 font-black text-[#655ac1] text-xl leading-none truncate" title={stat.value}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {isNearFull && !isFull && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <span className="text-sm font-semibold text-amber-700">تبقّى مكان واحد فقط قبل الوصول للحد الأقصى.</span>
        </div>
      )}

      <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-white">
          <p className="text-sm font-black text-slate-800 flex items-center gap-2">
            <BookOpenCheck size={18} className="text-[#655ac1]" />
            جداول المناوبة المحفوظة
            <span className="text-xs font-medium text-slate-400 mr-1">({savedSchedules.length} / 10)</span>
          </p>
        </div>

        {savedSchedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500">
            <Table size={64} strokeWidth={1.6} className="text-[#655ac1]" />
            <div className="text-center">
              <p className="font-bold text-slate-600 text-lg mb-1">لا توجد جداول محفوظة بعد</p>
              <p className="text-sm font-medium text-slate-500">
                سيظهر الجدول هنا مباشرة بعد إنشائه من تبويب إنشاء جدول المناوبة.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[820px]" dir="rtl">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center w-14">م</th>
                  <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-right">اسم الجدول</th>
                  <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">التاريخ</th>
                  <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">الوقت</th>
                  <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">الحالة</th>
                  <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {savedSchedules.map((schedule, index) => {
                  const isActive = activeScheduleId === schedule.id || schedule.isApproved;
                  const isEditing = editingId === schedule.id;
                  const { date, time } = formatDateTime(schedule.createdAt);
                  return (
                    <tr key={schedule.id} className="hover:bg-slate-50 transition-all" style={isActive ? { borderRight: '3px solid #655ac1' } : {}}>
                      <td className="px-6 py-3.5 text-center">
                        <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center text-[11px] font-black border border-slate-300 bg-white text-[#655ac1]">
                          {savedSchedules.length - index}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {isEditing ? (
                          <input
                            value={editingName}
                            onChange={event => setEditingName(event.target.value)}
                            onKeyDown={event => {
                              if (event.key === 'Enter') saveName(schedule);
                              if (event.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="w-full px-3 py-2 bg-white border-2 border-[#655ac1] rounded-lg text-sm font-bold outline-none text-slate-800"
                          />
                        ) : (
                          <span className="font-bold text-[13px] text-slate-800 truncate max-w-[240px] inline-block" title={schedule.name}>
                            {schedule.name}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-center text-[12px] font-bold text-slate-700">{date}</td>
                      <td className="px-6 py-3.5 text-center text-[12px] font-bold text-slate-700">{time}</td>
                      <td className="px-6 py-3.5 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-black text-[#655ac1]">
                            <Check size={14} /> معتمد
                          </span>
                        ) : (
                          <span className="text-[12px] font-semibold text-slate-400">غير معتمد</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => saveName(schedule)} className="px-3 py-1.5 text-xs font-bold text-white rounded-lg bg-[#655ac1]">
                              حفظ
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
                              onClick={event => openMenu(event, schedule.id)}
                              className="p-2 text-slate-400 bg-white hover:text-[#655ac1] hover:bg-[#f5f3ff] rounded-lg transition-all border border-slate-200"
                              title="تعديل"
                            >
                              <Edit3 size={15} />
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

      {menuState && createPortal(
        <div
          ref={menuRef}
          className="fixed w-44 rounded-2xl bg-white border border-slate-200 shadow-2xl p-1.5 z-[130]"
          style={{ top: menuState.top, left: menuState.left }}
          dir="rtl"
        >
          <button
            onClick={() => {
              const target = savedSchedules.find(schedule => schedule.id === menuState.scheduleId);
              setEditingId(menuState.scheduleId);
              setEditingName(target?.name || '');
              setMenuState(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <Pencil size={14} />
            تعديل
          </button>
          {(() => {
            const schedule = savedSchedules.find(item => item.id === menuState.scheduleId);
            if (!schedule) return null;
            const isActive = activeScheduleId === schedule.id || schedule.isApproved;
            return (
              <>
                <button
                  onClick={() => { setConfirmAdopt({ schedule, mode: isActive ? 'unadopt' : 'adopt' }); setMenuState(null); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold rounded-xl transition-colors ${
                    isActive ? 'text-amber-700 hover:bg-amber-50' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Check size={14} />
                  {isActive ? 'إلغاء الاعتماد' : 'اعتماد'}
                </button>
                <button
                  onClick={() => { setConfirmDelete(schedule); setMenuState(null); }}
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

      {confirmAdopt && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="p-6 text-sm font-semibold leading-7 text-slate-600">
              هل تريد {confirmAdopt.mode === 'adopt' ? 'اعتماد' : 'إلغاء اعتماد'} جدول <span className="font-black text-slate-800">"{confirmAdopt.schedule.name}"</span>؟
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button onClick={() => setConfirmAdopt(null)} className="px-5 py-2.5 rounded-xl text-sm font-black text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                إلغاء
              </button>
              <button
                onClick={() => confirmAdopt.mode === 'adopt' ? adoptSchedule(confirmAdopt.schedule) : unadoptSchedule(confirmAdopt.schedule)}
                className="px-5 py-2.5 rounded-xl text-sm font-black text-white bg-[#655ac1] hover:bg-[#5046a0] transition-colors"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="p-6 text-sm font-semibold leading-7 text-slate-600">
              هل تريد حذف جدول <span className="font-black text-slate-800">"{confirmDelete.name}"</span>؟ لا يمكن التراجع عن هذا الإجراء.
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-5 py-2.5 rounded-xl text-sm font-black text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                إلغاء
              </button>
              <button onClick={() => deleteSchedule(confirmDelete)} className="px-5 py-2.5 rounded-xl text-sm font-black text-white bg-rose-500 hover:bg-rose-600 transition-colors">
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTab;
