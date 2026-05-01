import React, { useState } from 'react';
import { AlertTriangle, BookOpenCheck, Check, Edit3, Table, Trash2 } from 'lucide-react';
import { SavedSupervisionSchedule, SupervisionScheduleData } from '../../../types';

interface Props {
  supervisionData: SupervisionScheduleData;
  setSupervisionData: React.Dispatch<React.SetStateAction<SupervisionScheduleData>>;
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

const ManageTab: React.FC<Props> = ({ supervisionData, setSupervisionData, showToast }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const savedSchedules = supervisionData.savedSchedules || [];
  const activeScheduleId = supervisionData.activeScheduleId;
  const approvedSchedule = savedSchedules.find(schedule => schedule.isApproved || schedule.id === activeScheduleId);
  const isFull = savedSchedules.length >= 10;
  const isNearFull = savedSchedules.length === 9;

  const saveName = (schedule: SavedSupervisionSchedule) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setSupervisionData(prev => ({
      ...prev,
      savedSchedules: (prev.savedSchedules || []).map(item =>
        item.id === schedule.id ? { ...item, name: trimmed } : item
      ),
    }));
    setEditingId(null);
    setEditingName('');
    showToast('تم تعديل اسم الجدول', 'success');
  };

  const adoptSchedule = (schedule: SavedSupervisionSchedule) => {
    setSupervisionData(prev => ({
      ...prev,
      savedSchedules: (prev.savedSchedules || []).map(item => ({
        ...item,
        isApproved: item.id === schedule.id,
      })),
      dayAssignments: [...schedule.dayAssignments],
      isApproved: true,
      approvedAt: new Date().toISOString(),
      activeScheduleId: schedule.id,
    }));
    showToast('تم اعتماد جدول الإشراف', 'success');
  };

  const deleteSchedule = (schedule: SavedSupervisionSchedule) => {
    setSupervisionData(prev => {
      const isActive = prev.activeScheduleId === schedule.id;
      return {
        ...prev,
        savedSchedules: (prev.savedSchedules || []).filter(item => item.id !== schedule.id),
        activeScheduleId: isActive ? undefined : prev.activeScheduleId,
        ...(isActive ? { dayAssignments: [], isApproved: false, approvedAt: undefined } : {}),
      };
    });
    showToast('تم حذف الجدول من القائمة', 'success');
  };

  const stats = [
    { label: 'إجمالي جداول الإشراف', value: String(savedSchedules.length) },
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

      {isFull && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200">
          <AlertTriangle size={16} className="text-rose-500 shrink-0" />
          <span className="text-sm font-semibold text-rose-700">وصلت للحد الأقصى 10 جداول. احذف جدولًا قبل إنشاء جديد.</span>
        </div>
      )}

      <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-white">
          <p className="text-sm font-black text-slate-800 flex items-center gap-2">
            <BookOpenCheck size={18} className="text-[#655ac1]" />
            جداول الإشراف المحفوظة
            <span className="text-xs font-medium text-slate-400 mr-1">({savedSchedules.length} / 10)</span>
          </p>
        </div>

        {savedSchedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500">
            <Table size={64} strokeWidth={1.6} className="text-[#655ac1]" />
            <div className="text-center">
              <p className="font-bold text-slate-600 text-lg mb-1">لا توجد جداول محفوظة بعد</p>
              <p className="text-sm font-medium text-slate-500">سيظهر الجدول هنا بعد إنشائه من تاب إنشاء وتعديل جدول الإشراف.</p>
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
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <button onClick={() => saveName(schedule)} className="px-3 py-1.5 text-xs font-bold text-white rounded-lg bg-[#655ac1]">
                              حفظ
                            </button>
                          ) : (
                            <button
                              onClick={() => { setEditingId(schedule.id); setEditingName(schedule.name); }}
                              className="p-2 text-slate-500 bg-white hover:text-[#655ac1] hover:bg-[#f5f3ff] rounded-lg transition-all border border-slate-200"
                              title="تعديل الاسم"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                          {!isActive && (
                            <button onClick={() => adoptSchedule(schedule)} className="px-3 py-2 text-xs font-bold text-[#655ac1] bg-[#f5f3ff] rounded-lg border border-[#d7d0ff]">
                              اعتماد
                            </button>
                          )}
                          <button
                            onClick={() => deleteSchedule(schedule)}
                            className="p-2 text-rose-500 bg-white hover:bg-rose-50 rounded-lg transition-all border border-rose-100"
                            title="حذف"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
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
  );
};

export default ManageTab;
