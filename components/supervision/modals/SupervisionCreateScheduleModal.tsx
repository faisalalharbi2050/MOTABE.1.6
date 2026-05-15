import React, { useState } from 'react';
import { X, Calendar, Zap, UserPlus } from 'lucide-react';
import { SchoolInfo, Teacher, Admin, SupervisionScheduleData, ScheduleSettingsData } from '../../../types';
import { generateSmartAssignment } from '../../../utils/supervisionUtils';
import LoadingLogo from '../../ui/LoadingLogo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supervisionData: SupervisionScheduleData;
  setSupervisionData: React.Dispatch<React.SetStateAction<SupervisionScheduleData>>;
  teachers: Teacher[];
  admins: Admin[];
  scheduleSettings: ScheduleSettingsData;
  schoolInfo: SchoolInfo;
  suggestedCount: number;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
  activeDaysCount: number;
  availableStaffCount: number;
}

const SupervisionCreateScheduleModal: React.FC<Props> = ({
  isOpen, onClose, supervisionData, setSupervisionData, teachers, admins,
  scheduleSettings, schoolInfo, suggestedCount, showToast, activeDaysCount, availableStaffCount
}) => {
  const [selectedMode, setSelectedMode] = useState<'auto' | 'manual' | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const buildAutoSavedScheduleName = (count: number) => `جدول رقم ${count}`;

  const handleAutoAssign = () => {
    setIsGenerating(true);
    // إعطاء المتصفح فرصة لرسم شعار التحميل قبل العمل التزامني
    setTimeout(() => {
      const assignments = generateSmartAssignment(
        teachers, admins, supervisionData.exclusions, supervisionData.settings,
        scheduleSettings, schoolInfo, supervisionData.periods, suggestedCount
      );
      setSupervisionData(prev => {
        const prevSaved = prev.savedSchedules || [];
        const newId = `supervision-schedule-${Date.now()}`;
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
          isApproved: false,
          approvedAt: undefined,
          savedSchedules: [newSavedEntry, ...prevSaved].slice(0, 10),
          activeScheduleId: newId,
        };
      });
      // إبقاء الشعار ظاهرًا فترة كافية ليراه المستخدم
      setTimeout(() => {
        setIsGenerating(false);
        showToast('تم التوزيع التلقائي للمشرفين بنجاح', 'success');
        onClose();
      }, 1500);
    }, 50);
  };

  const handleManualAssign = () => {
    if (supervisionData.dayAssignments.length > 0) {
      setShowOverwriteConfirm(true);
      return;
    }
    executeManualAssign();
  };

  const executeManualAssign = () => {
    setSupervisionData(prev => ({ ...prev, dayAssignments: [], isApproved: false }));
    showToast('تم تهيئة الجدول للتوزيع اليدوي', 'success');
    setShowOverwriteConfirm(false);
    onClose();
  };

  const isUnevenDistribution = (suggestedCount * activeDaysCount) !== availableStaffCount;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      {isGenerating && (
        <div className="fixed inset-0 z-[10000] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
          <LoadingLogo size="lg" />
          <p className="text-base font-bold text-[#655ac1]">جاري إنشاء جدول الإشراف...</p>
        </div>
      )}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#655ac1]/10 rounded-2xl flex items-center justify-center text-[#655ac1]">
              <Calendar size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">إنشاء جدول الإشراف</h2>
              <p className="text-sm font-medium text-slate-400 mt-0.5">اختر طريقة توزيع المشرفين على أيام الأسبوع</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Auto Mode — visually featured */}
            <button
              onClick={() => setSelectedMode('auto')}
              className={`p-6 rounded-2xl border-2 text-right transition-all duration-200 relative overflow-hidden group ${
                selectedMode === 'auto'
                  ? 'border-[#655ac1] bg-gradient-to-br from-[#e5e1fe]/40 to-white ring-4 ring-[#655ac1]/10 shadow-lg shadow-[#655ac1]/10'
                  : 'border-[#655ac1]/30 bg-gradient-to-br from-[#f5f3ff] to-white hover:border-[#655ac1]/60 hover:shadow-md'
              }`}
            >
              <div className={`absolute top-0 right-0 w-1.5 h-full rounded-r-2xl transition-colors ${selectedMode === 'auto' ? 'bg-[#655ac1]' : 'bg-[#655ac1]/30 group-hover:bg-[#655ac1]/60'}`} />
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${selectedMode === 'auto' ? 'bg-[#655ac1] text-white shadow-lg shadow-[#655ac1]/30' : 'bg-[#655ac1]/10 text-[#655ac1]'}`}>
                <Zap size={24} />
              </div>
              <h3 className={`text-lg font-black mb-2 ${selectedMode === 'auto' ? 'text-[#655ac1]' : 'text-slate-800'}`}>التوزيع التلقائي</h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                يقوم النظام بتوزيع المشرفين المتاحين بالتساوي قدر الإمكان على أيام الأسبوع بناءً على الإعدادات والحصة الفارغة قبل أو بعد الفسحة
              </p>

              {selectedMode === 'auto' && (
                <div className="mt-4 pt-4 border-t border-[#655ac1]/10 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-white rounded-xl p-3 border border-[#655ac1]/10 shadow-sm mb-3">
                    <p className="text-xs font-bold text-slate-500 mb-1">المقترح لكل يوم</p>
                    <p className="text-lg font-black text-[#655ac1]">{suggestedCount} مشرفين</p>
                  </div>
                  {isUnevenDistribution && (
                    <p className="text-xs font-bold text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200/50 leading-relaxed">
                      تنبيه: العدد الإجمالي للمتاحين ({availableStaffCount}) لا يقبل القسمة بالتساوي على ({activeDaysCount}) أيام. سيتم توزيع الزيادة بشكل عشوائي.
                    </p>
                  )}
                </div>
              )}
            </button>

            {/* Manual Mode */}
            <button
              onClick={() => setSelectedMode('manual')}
              className={`p-6 rounded-2xl border-2 text-right transition-all duration-200 relative overflow-hidden group ${
                selectedMode === 'manual'
                  ? 'border-[#655ac1] bg-[#e5e1fe]/30 ring-4 ring-[#655ac1]/10 shadow-lg shadow-[#655ac1]/10'
                  : 'border-slate-200 bg-white hover:border-[#655ac1]/50 hover:bg-slate-50/80 hover:shadow-md'
              }`}
            >
              <div className={`absolute top-0 right-0 w-1.5 h-full rounded-r-2xl transition-colors ${selectedMode === 'manual' ? 'bg-[#655ac1]' : 'bg-transparent group-hover:bg-[#655ac1]/30'}`} />
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${selectedMode === 'manual' ? 'bg-[#655ac1] text-white shadow-lg shadow-[#655ac1]/30' : 'bg-slate-100 text-slate-500 group-hover:bg-[#e5e1fe] group-hover:text-[#655ac1]'}`}>
                <UserPlus size={24} />
              </div>
              <h3 className={`text-lg font-black mb-2 transition-colors ${selectedMode === 'manual' ? 'text-[#655ac1]' : 'text-slate-800'}`}>التوزيع اليدوي</h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                تحديد المشرفين يدويًا لكل يوم
              </p>

              {selectedMode === 'manual' && (
                <div className="mt-4 pt-4 border-t border-slate-200/60 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-white rounded-xl p-3 border border-slate-200/50 shadow-sm">
                    <p className="text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#655ac1]"></span> المقترح لمساعدتك: {suggestedCount} مشرفين / يوم</p>
                    <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#655ac1]"></span> سيتم مسح الجدول الحالي للبدء من جديد.</p>
                  </div>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50/80 border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            disabled={!selectedMode}
            onClick={selectedMode === 'auto' ? handleAutoAssign : handleManualAssign}
            className={`px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
              selectedMode
                ? 'bg-[#655ac1] hover:bg-[#5046a0] shadow-md shadow-[#655ac1]/20 hover:scale-105 active:scale-95'
                : 'bg-slate-300 cursor-not-allowed opacity-70'
            }`}
          >
            {selectedMode === 'auto' ? 'توزيع تلقائي' : selectedMode === 'manual' ? 'البدء يدوياً' : 'اختر طريقة التوزيع'}
          </button>
        </div>
      </div>

      {/* Overwrite confirm for manual */}
      {showOverwriteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap size={32} className="text-rose-500" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">تنبيه: يوجد جدول حالي</h2>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                اختيارك للتوزيع اليدوي سيقوم بمسح الجدول الحالي بالكامل (بما في ذلك أي توزيع تلقائي أو يدوي سابق). هل أنت متأكد من رغبتك بالاستمرار؟
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

export default SupervisionCreateScheduleModal;
