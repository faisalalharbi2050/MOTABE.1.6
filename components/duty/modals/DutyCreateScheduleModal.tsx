import React, { useState } from 'react';
import { X, Calendar, Zap, UserPlus } from 'lucide-react';
import { SchoolInfo, Teacher, Admin, DutyScheduleData, ScheduleSettingsData } from '../../../types';
import { generateSmartDutyAssignment } from '../../../utils/dutyUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dutyData: DutyScheduleData;
  setDutyData: React.Dispatch<React.SetStateAction<DutyScheduleData>>;
  teachers: Teacher[];
  admins: Admin[];
  scheduleSettings: ScheduleSettingsData;
  schoolInfo: SchoolInfo;
  suggestedCount: number;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
  activeDaysCount: number;
  availableStaffCount: number;
}

const DutyCreateScheduleModal: React.FC<Props> = ({
  isOpen, onClose, dutyData, setDutyData, teachers, admins,
  scheduleSettings, schoolInfo, suggestedCount, showToast, activeDaysCount, availableStaffCount
}) => {
  const [selectedMode, setSelectedMode] = useState<'auto' | 'manual' | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  if (!isOpen) return null;

  const buildAutoSavedScheduleName = (count: number) => `جدول رقم ${count}`;

  const handleAutoAssign = () => {
    try {
      const { assignments, weekAssignments, alerts, newCounts } = generateSmartDutyAssignment(
        teachers, admins, dutyData.exclusions, dutyData.settings,
        scheduleSettings, schoolInfo, dutyData.dutyAssignmentCounts || {}, dutyData.settings.suggestedCountPerDay || suggestedCount
      );
      setDutyData(prev => {
        const prevSaved = prev.savedSchedules || [];
        const newId = `duty-schedule-${Date.now()}`;
        const autoScheduleNumber = prevSaved.length + 1;
        const newSavedEntry = {
          id: newId,
          name: buildAutoSavedScheduleName(autoScheduleNumber),
          createdAt: new Date().toISOString(),
          dayAssignments: assignments,
          isApproved: false,
        };

        return {
          ...prev,
          dayAssignments: assignments,
          weekAssignments,
          dutyAssignmentCounts: newCounts,
          isApproved: false,
          approvedAt: undefined,
          savedSchedules: [newSavedEntry, ...prevSaved].slice(0, 10),
          activeScheduleId: newId,
        };
      });
      showToast('تم التوزيع التلقائي للمناوبين بنجاح', 'success');
      if (alerts.length > 0) {
        showToast(alerts[0], 'warning');
      }
      onClose();
    } catch (err) {
      showToast('حدث خطأ أثناء التوزيع', 'error');
      console.error(err);
    }
  };

  const handleManualAssign = () => {
    // If there's an existing schedule, ask for confirmation first
    if (dutyData.dayAssignments.length > 0) {
      setShowOverwriteConfirm(true);
      return;
    }
    executeManualAssign();
  };

  const executeManualAssign = () => {
    const { assignments, weekAssignments } = generateSmartDutyAssignment(
      teachers, admins, dutyData.exclusions, dutyData.settings,
      scheduleSettings, schoolInfo, dutyData.dutyAssignmentCounts || {}, 0
    );
    setDutyData(prev => ({ ...prev, dayAssignments: assignments, weekAssignments, isApproved: false }));
    showToast('تم تهيئة الجدول للتوزيع اليدوي', 'success');
    setShowOverwriteConfirm(false);
    onClose();
  };

  const isUnevenDistribution = (suggestedCount * activeDaysCount) !== availableStaffCount;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#e5e1fe] rounded-2xl flex items-center justify-center text-[#655ac1] shadow-sm">
              <Calendar size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">إنشاء جدول المناوبة</h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">اختر طريقة توزيع المناوبين على أيام الأسبوع</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Auto Mode */}
            <button
              onClick={() => setSelectedMode('auto')}
              className={`p-6 rounded-2xl border-2 text-right transition-all duration-300 relative overflow-hidden group ${
                selectedMode === 'auto'
                  ? 'border-[#655ac1] bg-violet-50/50 ring-4 ring-[#655ac1]/10'
                  : 'border-slate-200 bg-white hover:border-[#655ac1]/50 hover:bg-slate-50'
              }`}
            >
              <div className={`absolute top-0 right-0 w-2 h-full transition-colors ${selectedMode === 'auto' ? 'bg-[#655ac1]' : 'bg-transparent group-hover:bg-[#655ac1]/20'}`} />
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${selectedMode === 'auto' ? 'bg-[#655ac1] text-white shadow-md' : 'bg-slate-100 text-slate-500 group-hover:bg-[#e5e1fe] group-hover:text-[#655ac1]'}`}>
                <Zap size={24} />
              </div>
              <h3 className={`text-lg font-black mb-2 transition-colors ${selectedMode === 'auto' ? 'text-[#655ac1]' : 'text-slate-800'}`}>التوزيع التلقائي</h3>
              <div className="text-sm font-medium text-slate-500 leading-relaxed justify-end space-y-2 mt-2">
                <p>يقوم النظام بتوزيع المناوبين وفق التالي :</p>
                <ol className="list-decimal list-inside pr-2 text-xs space-y-1 text-slate-600">
                  <li>المعلمون بناءً على الحصة الأخيرة في جداولهم.</li>
                  <li>الإداريون يتم توزيعهم بشكل عشوائي.</li>
                </ol>
              </div>
            </button>

            {/* Manual Mode */}
            <button
              onClick={() => setSelectedMode('manual')}
              className={`p-6 rounded-2xl border-2 text-right transition-all duration-300 relative overflow-hidden group ${
                selectedMode === 'manual'
                  ? 'border-[#655ac1] bg-violet-50/50 ring-4 ring-[#655ac1]/10'
                  : 'border-slate-200 bg-white hover:border-[#655ac1]/50 hover:bg-slate-50'
              }`}
            >
              <div className={`absolute top-0 right-0 w-2 h-full transition-colors ${selectedMode === 'manual' ? 'bg-[#655ac1]' : 'bg-transparent group-hover:bg-[#655ac1]/20'}`} />
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${selectedMode === 'manual' ? 'bg-[#655ac1] text-white shadow-md' : 'bg-slate-100 text-slate-500 group-hover:bg-[#e5e1fe] group-hover:text-[#655ac1]'}`}>
                <UserPlus size={24} />
              </div>
              <h3 className={`text-lg font-black mb-2 transition-colors ${selectedMode === 'manual' ? 'text-[#655ac1]' : 'text-slate-800'}`}>التوزيع اليدوي</h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed mt-2">
                تحديد المناوبين يدويًا لكل يوم
              </p>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-slate-200 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            إلغاء
          </button>
          <button
            disabled={!selectedMode}
            onClick={selectedMode === 'auto' ? handleAutoAssign : handleManualAssign}
            className={`px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md ${
              selectedMode 
                ? 'bg-[#655ac1] hover:bg-[#5046a0] shadow-[#655ac1]/20 hover:scale-105 active:scale-95'
                : 'bg-slate-300 cursor-not-allowed opacity-70'
            }`}
          >
            {selectedMode === 'auto' ? 'توزيع تلقائي' : selectedMode === 'manual' ? 'البدء يدوياً' : 'اختر طريقة التوزيع'}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MODAL: تأكيد مسح الجدول للتوزيع اليدوي
      ══════════════════════════════════════════════ */}
      {showOverwriteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap size={32} className="text-rose-500" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">تنبيه: يوجد جدول حالي</h2>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                اختيارك للتوزيع اليدوي سيقوم بمسح الجدول الحالي بالكامل (بما في ذلك أي توزيع تلقائي أو يدوي سابق). هل أنت متأكد من رغبتك بالاستمراѿ
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowOverwriteConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={executeManualAssign}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
              >
                نعم، ابدأ يدوياً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DutyCreateScheduleModal;

