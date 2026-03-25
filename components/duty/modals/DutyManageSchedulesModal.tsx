import React, { useState } from 'react';
import { X, Settings, Plus, Save, Clock, CheckCircle, Shield, Trash2, Edit2 } from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { DutyScheduleData, SavedDutySchedule } from '../../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dutyData: DutyScheduleData;
  setDutyData: React.Dispatch<React.SetStateAction<DutyScheduleData>>;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const DutyManageSchedulesModal: React.FC<Props> = ({
  isOpen, onClose, dutyData, setDutyData, showToast
}) => {
  const [newScheduleName, setNewScheduleName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showDeleteCurrentConfirm, setShowDeleteCurrentConfirm] = useState(false);

  if (!isOpen) return null;

  const savedSchedules = dutyData.savedSchedules || [];

  const handleSaveCurrent = () => {
    if (savedSchedules.length >= 10) {
      showToast('الحد الأقصى للجداول المحفوظة هو 10', 'warning');
      return;
    }
    if (!newScheduleName.trim()) {
      showToast('يرجى إدخال اسم للجدول', 'warning');
      return;
    }

    const newSchedule: SavedDutySchedule = {
      id: Date.now().toString(),
      name: newScheduleName.trim(),
      createdAt: new Date().toISOString(),
      dayAssignments: [...dutyData.dayAssignments],
      isApproved: dutyData.isApproved,
    };

    setDutyData(prev => ({
      ...prev,
      savedSchedules: [...(prev.savedSchedules || []), newSchedule],
      activeScheduleId: newSchedule.id,
    }));
    setNewScheduleName('');
    showToast('تم حفظ جدول المناوبة بنجاح', 'success');
  };

  const handleLoad = (id: string) => {
    const target = savedSchedules.find(s => s.id === id);
    if (!target) return;

    setDutyData(prev => ({
      ...prev,
      dayAssignments: [...target.dayAssignments],
      isApproved: target.isApproved,
      activeScheduleId: target.id,
    }));
    showToast(`تم عرض الجدول: ${target.name}`, 'success');
  };

  const confirmDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const executeDelete = () => {
    if (!deleteConfirmId) return;
    setDutyData(prev => {
      const remaining = (prev.savedSchedules || []).filter(s => s.id !== deleteConfirmId);
      return {
        ...prev,
        savedSchedules: remaining,
        activeScheduleId: prev.activeScheduleId === deleteConfirmId ? undefined : prev.activeScheduleId,
      };
    });
    setDeleteConfirmId(null);
    showToast('تم حذف الجدول من القائمة', 'success');
  };

  const handleApprove = (id: string) => {
    setDutyData(prev => {
      // Approve in saved list
      const updatedSchedules = (prev.savedSchedules || []).map(s =>
        s.id === id ? { ...s, isApproved: true } : { ...s, isApproved: false }
      );
      
      const target = updatedSchedules.find(s => s.id === id);
      
      return {
        ...prev,
        savedSchedules: updatedSchedules,
        dayAssignments: target ? [...target.dayAssignments] : prev.dayAssignments,
        isApproved: true,
        approvedAt: new Date().toISOString(),
        activeScheduleId: id,
      };
    });
    showToast('تم اعتماد الجدول كخطة أساسية للمناوبة', 'success');
  };

  const handleDeleteCurrent = () => {
    setDutyData(prev => ({
      ...prev,
      dayAssignments: [],
      weekAssignments: [],
      dutyAssignmentCounts: {},
      isApproved: false,
      activeScheduleId: undefined,
    }));
    setShowDeleteCurrentConfirm(false);
    showToast('تم حذف الجدول الحالي', 'success');
  };

  const saveRename = (id: string) => {
    if (!editName.trim()) return;
    setDutyData(prev => ({
      ...prev,
      savedSchedules: (prev.savedSchedules || []).map(s =>
        s.id === id ? { ...s, name: editName.trim() } : s
      ),
    }));
    setEditingId(null);
    showToast('تم تعديل اسم الجدول', 'success');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#e5e1fe] rounded-2xl flex items-center justify-center text-[#655ac1] shadow-sm">
              <Settings size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">إدارة جداول المناوبة</h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">يمكنك حفظ حتى 10 جداول واعتماد أحدها</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Save Current Section */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                   <Save size={18} className="text-[#655ac1]" />
                   <h3 className="font-black text-lg text-slate-700">الجدول الحالي</h3>
                </div>
                
                {dutyData.dayAssignments.length === 0 ? (
                  <div className="text-center text-slate-400 py-8 flex-1 flex flex-col items-center justify-center">
                    <Shield size={32} className="mb-2 opacity-50 text-[#655ac1]" />
                    <p className="text-sm">لا يوجد جدول مبني لِحفظه</p>
                  </div>
                ) : (
                  <div className="space-y-4 flex-1">
                    <div className="bg-violet-50/50 p-3 rounded-xl border border-[#e5e1fe] flex items-center justify-between">
                       <span className="text-sm font-bold text-[#655ac1]">حالة الجدول:</span>
                       <span className={`text-xs font-bold px-2 py-1 rounded-md ${dutyData.isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600 border border-slate-200'}`}>
                         {dutyData.isApproved ? 'معتمد' : 'غير معتمد'}
                       </span>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">اسم مقترح للجدول المفتوح:</label>
                      <input
                        type="text"
                        value={newScheduleName}
                        onChange={e => setNewScheduleName(e.target.value)}
                        placeholder="مثال: مناوبة الفصل الأول"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1]/30"
                      />
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleSaveCurrent}
                  disabled={dutyData.dayAssignments.length === 0 || savedSchedules.length >= 10 || !newScheduleName.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white py-3 rounded-xl text-sm font-bold shadow-md shadow-[#655ac1]/20 transition-all active:scale-95 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={18} />
                  <span>حفظ بمسودة الجداول ({savedSchedules.length}/10)</span>
                </button>
                {dutyData.dayAssignments.length > 0 && (
                  <button
                    onClick={() => setShowDeleteCurrentConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-2.5 rounded-xl text-sm font-bold transition-all mt-2"
                  >
                    <Trash2 size={16} />
                    <span>حذف الجدول الحالي</span>
                  </button>
                )}
              </div>
            </div>

            {/* List of Saved Schedules */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 min-h-[400px]">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                   <Clock size={18} className="text-[#655ac1]" />
                   <h3 className="font-black text-lg text-slate-700">الجداول المحفوظة</h3>
                </div>

                {savedSchedules.length === 0 ? (
                  <div className="text-center text-slate-400 py-16">
                    <Settings size={48} className="mx-auto mb-4 opacity-20 text-[#655ac1]" />
                    <p className="text-sm font-bold">لا توجد جداول محفوظة بعد</p>
                    <p className="text-xs mt-1">ابدأ بإنشاء الجدول ثم احفظه هنا للرجوع إليه</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                    {savedSchedules.map(schedule => (
                      <div key={schedule.id} className={`p-4 rounded-xl border-2 transition-all ${dutyData.activeScheduleId === schedule.id ? 'border-[#655ac1] bg-violet-50/50 shadow-sm' : 'border-slate-100 bg-white hover:border-[#655ac1]/40'}`}>
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                               {editingId === schedule.id ? (
                                 <div className="flex items-center gap-2">
                                   <input
                                      type="text"
                                      value={editName}
                                      autoFocus
                                      onChange={(e) => setEditName(e.target.value)}
                                      onKeyDown={(e) => { if(e.key === 'Enter') saveRename(schedule.id) }}
                                      className="border border-[#655ac1] rounded-lg px-2 py-1 text-sm font-bold text-slate-800 outline-none focus:ring-1 focus:ring-[#655ac1]/30"
                                   />
                                   <button onClick={() => saveRename(schedule.id)} className="text-emerald-600 hover:text-emerald-700"><CheckCircle size={18}/></button>
                                   <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-2">
                                   <h4 className="font-black text-slate-800 text-base">{schedule.name}</h4>
                                   <button onClick={() => { setEditingId(schedule.id); setEditName(schedule.name); }} className="text-slate-400 hover:text-[#655ac1]"><Edit2 size={14}/></button>
                                 </div>
                               )}
                               <p className="text-xs text-slate-500 mt-1">
                                  {new Date(schedule.createdAt).toLocaleDateString('ar-SA')} - {new Date(schedule.createdAt).toLocaleTimeString('ar-SA')}
                               </p>
                               {schedule.isApproved && (
                                 <Badge variant="success" className="mt-2 text-[10px] py-0">الجدول المعتمَد</Badge>
                               )}
                               {dutyData.activeScheduleId === schedule.id && !schedule.isApproved && (
                                 <Badge variant="warning" className="mt-2 text-[10px] py-0">الجدول المعروض الأن</Badge>
                               )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 justify-end">
                               {dutyData.activeScheduleId !== schedule.id && (
                                 <button
                                   onClick={() => handleLoad(schedule.id)}
                                   className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                                 >
                                   عرض الجدول
                                 </button>
                               )}

                               {!schedule.isApproved && (
                                 <button
                                   onClick={() => handleApprove(schedule.id)}
                                   className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition-colors"
                                 >
                                   اعتماد
                                 </button>
                               )}

                               <button
                                 onClick={() => confirmDelete(schedule.id)}
                                 className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                                 title="حذف الجدول المحفوظ"
                               >
                                 <Trash2 size={16} />
                               </button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Delete Current Schedule Confirmation */}
      {showDeleteCurrentConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-rose-500" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">حذف الجدول الحالي</h2>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف الجدول الحالي بالكامل؟ سيتم هذا الإجراء ولا يمكن التراجع عنه.
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowDeleteCurrentConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={handleDeleteCurrent}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
              >
                نعم، احذف الجدول
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-rose-500" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">تأكيد الحذف</h2>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذا الجدول؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذفه نهائياً من القائمة.
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DutyManageSchedulesModal;

