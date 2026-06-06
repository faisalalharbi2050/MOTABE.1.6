import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, BarChart3, PenLine, RotateCcw, SlidersHorizontal, Sparkles, Trash2, Users, UserCog, Wand2 } from 'lucide-react';
import {
  SchoolInfo, Teacher, Admin, ScheduleSettingsData,
  DutyScheduleData, DutyDayAssignment,
} from '../../../types';
import DutyScheduleBuilder from '../../duty/DutyScheduleBuilder';
import LoadingLogo from '../../ui/LoadingLogo';
import {
  generateDutyDates,
  generateSmartDutyAssignment,
  getAvailableStaffForDuty,
} from '../../../utils/dutyUtils';

interface Props {
  dutyData: DutyScheduleData;
  setDutyData: React.Dispatch<React.SetStateAction<DutyScheduleData>>;
  teachers: Teacher[];
  admins: Admin[];
  scheduleSettings: ScheduleSettingsData;
  schoolInfo: SchoolInfo;
  suggestedCount: number;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const CreateTab: React.FC<Props> = ({
  dutyData,
  setDutyData,
  teachers,
  admins,
  scheduleSettings,
  schoolInfo,
  suggestedCount,
  showToast,
}) => {
  const [confirmMode, setConfirmMode] = useState<'regenerate' | 'clear' | null>(null);
  const [manualStarted, setManualStarted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const buildAutoSavedScheduleName = (count: number) => `جدول رقم ${count}`;
  const availableStaff = useMemo(
    () => getAvailableStaffForDuty(teachers, admins, dutyData.exclusions, dutyData.settings),
    [teachers, admins, dutyData.exclusions, dutyData.settings],
  );

  const buildEmptySchedule = () => {
    const dates = generateDutyDates(schoolInfo, dutyData.settings.selectedWeeks, { includeOfficialLeaves: true });
    const weekMap: Record<string, { weekId: string; weekName: string; startDate: string; endDate: string; dayAssignments: DutyDayAssignment[] }> = {};

    dates.forEach(dateInfo => {
      if (!weekMap[dateInfo.weekId]) {
        weekMap[dateInfo.weekId] = {
          weekId: dateInfo.weekId,
          weekName: dateInfo.weekName,
          startDate: dateInfo.date,
          endDate: dateInfo.date,
          dayAssignments: [],
        };
      }
      weekMap[dateInfo.weekId].endDate = dateInfo.date;
      weekMap[dateInfo.weekId].dayAssignments.push({
        day: dateInfo.dayKey,
        date: dateInfo.date,
        staffAssignments: [],
        isOfficialLeave: dateInfo.isOfficialLeave,
        officialLeaveText: dateInfo.isOfficialLeave ? 'إجازة رسمية' : undefined,
      });
    });

    const weekAssignments = Object.values(weekMap);
    const flatAssignments = weekAssignments.flatMap(week => week.dayAssignments);
    setDutyData(prev => {
      if ((prev.savedSchedules || []).length >= 10) {
        showToast('وصلت للحد الأقصى 10 جداول. احذف أحد الجداول قبل إنشاء جدول جديد.', 'warning');
        return prev;
      }
      const prevSaved = prev.savedSchedules || [];
      const newId = `duty-schedule-${Date.now()}`;
      const newSavedEntry = {
        id: newId,
        name: buildAutoSavedScheduleName(prevSaved.length + 1),
        createdAt: new Date().toISOString(),
        dayAssignments: flatAssignments,
        isApproved: false,
      };
      return {
        ...prev,
        dayAssignments: flatAssignments,
        weekAssignments,
        isApproved: false,
        approvedAt: undefined,
        savedSchedules: [newSavedEntry, ...prevSaved],
        activeScheduleId: newId,
      };
    });
    setManualStarted(true);
    showToast('تم إنشاء جدول المناوبة اليدوي مفرغاً', 'success');
  };

  const buildAutoSchedule = () => {
    if (availableStaff.length === 0) {
      showToast('لا يوجد مناوبون متاحون للتوزيع', 'warning');
      return;
    }
    if ((dutyData.savedSchedules || []).length >= 10) {
      showToast('وصلت للحد الأقصى 10 جداول. احذف أحد الجداول قبل إنشاء جدول جديد.', 'warning');
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      const { assignments, weekAssignments, alerts, newCounts } = generateSmartDutyAssignment(
        teachers,
        admins,
        dutyData.exclusions,
        dutyData.settings,
        scheduleSettings,
        schoolInfo,
        dutyData.dutyAssignmentCounts || {},
        dutyData.settings.suggestedCountPerDay || suggestedCount,
      );

      setDutyData(prev => {
        const prevSaved = prev.savedSchedules || [];
        if (prevSaved.length >= 10) return prev;
        const newId = `duty-schedule-${Date.now()}`;
        const newSavedEntry = {
          id: newId,
          name: buildAutoSavedScheduleName(prevSaved.length + 1),
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
          savedSchedules: [newSavedEntry, ...prevSaved],
          activeScheduleId: newId,
        };
      });
      setManualStarted(false);

      setTimeout(() => {
        setIsGenerating(false);
        showToast('تم إنشاء جدول المناوبة آلياً', 'success');
        if (alerts[0]) showToast(alerts[0], 'warning');
      }, 2500);
    }, 50);
  };

  const clearSchedule = () => {
    setDutyData(prev => ({ ...prev, dayAssignments: [], weekAssignments: [] }));
    setManualStarted(false);
    setConfirmMode(null);
    showToast('تم حذف جدول المناوبة', 'success');
  };

  const resetScheduleToChoice = () => {
    setDutyData(prev => ({ ...prev, dayAssignments: [], weekAssignments: [] }));
    setManualStarted(false);
    setConfirmMode(null);
    showToast('تمت إعادة إنشاء جدول المناوبة - اختر طريقة الإنشاء من جديد', 'success');
  };

  const hasSchedule = dutyData.dayAssignments.length > 0 || (dutyData.weekAssignments?.length ?? 0) > 0;

  const autoDisabled = availableStaff.length === 0;

  const emptyState = (
    <div dir="rtl" className="space-y-5">
      {/* Choice cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* ════ Auto card ════ */}
        <div
          className={`relative rounded-3xl p-6 border-2 bg-white transition-all flex flex-col ${
            autoDisabled ? 'border-slate-200 opacity-70' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
          }`}
        >
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#655ac1] bg-white rounded-full px-3 py-1.5">
              <Users size={12} className="text-[#655ac1]" />
              {availableStaff.length} مناوب متاح
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4 pl-28">
            <Wand2 size={22} strokeWidth={1.8} className="text-[#655ac1] shrink-0" />
            <h3 className="text-lg font-black text-slate-800">إنشاء جدول آلي</h3>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 mb-4 space-y-3">
            <p className="text-xs font-bold text-slate-700">يوزّع النظام المناوبين تلقائياً وفق التالي:</p>

            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 w-6 h-6 text-[#655ac1] flex items-center justify-center">
                <Users size={14} strokeWidth={2} />
              </span>
              <div className="text-[11px] leading-relaxed text-slate-600">
                <span className="font-bold text-slate-700">المعلمون:</span> يُختار من لديه الحصة الأخيرة أو ما قبلها، قدر الإمكان.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 w-6 h-6 text-[#655ac1] flex items-center justify-center">
                <UserCog size={14} strokeWidth={2} />
              </span>
              <div className="text-[11px] leading-relaxed text-slate-600">
                <span className="font-bold text-slate-700">الإداريون:</span> يوزَّعون بالتناوب مع مراعاة التوازن.
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/70 text-[11px] font-bold text-[#655ac1]">
              <PenLine size={12} strokeWidth={2.2} className="shrink-0" />
              يمكنك تعديل التوزيع بسهولة بعد إنشائه.
            </div>
          </div>

          <button
            onClick={buildAutoSchedule}
            disabled={autoDisabled}
            className={`mt-auto mx-auto w-full max-w-[230px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all ${
              autoDisabled
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#655ac1] border-[#655ac1] text-white hover:bg-[#655ac1] hover:border-[#655ac1] hover:shadow-lg hover:-translate-y-0.5 shadow-md shadow-[#655ac1]/20'
            }`}
          >
            <Sparkles size={16} />
            إنشاء جدول آلي
            <ArrowLeft size={16} />
          </button>

          {autoDisabled && (
            <p className="mt-3 text-[11px] font-bold text-rose-600 leading-relaxed">⚠️ لا يوجد مناوبون متاحون — راجع قائمة المناوبين في الإعدادات</p>
          )}
        </div>

        {/* ════ Manual card ════ */}
        <div className="relative rounded-3xl p-6 border-2 bg-white border-slate-200 hover:border-slate-300 hover:shadow-md transition-all flex flex-col">
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#655ac1] bg-white rounded-full px-3 py-1.5">
              <Users size={12} className="text-[#655ac1]" />
              {availableStaff.length} مناوب متاح
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4 pl-28">
            <PenLine size={20} strokeWidth={1.8} className="text-[#655ac1] shrink-0" />
            <h3 className="text-lg font-black text-slate-800">إنشاء جدول يدوي</h3>
          </div>

          <p className="text-xs font-medium text-slate-600 leading-relaxed mb-4">
            أنشئ جدول المناوبة اليومية مفرغًا ووزع المناوبين يدويًا وفق ما يناسبك.
          </p>

          <button
            onClick={buildEmptySchedule}
            className="mt-auto mx-auto w-full max-w-[230px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#655ac1] text-sm font-bold bg-[#655ac1] text-white hover:bg-[#655ac1] hover:border-[#655ac1] hover:shadow-lg hover:-translate-y-0.5 shadow-md shadow-[#655ac1]/20 transition-all"
          >
            <PenLine size={16} />
            إنشاء جدول يدوي
            <ArrowLeft size={16} />
          </button>
        </div>
      </div>

      {/* Tip — same style as Basic Settings tip */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
        <span className="text-[11px] font-medium text-amber-800 leading-relaxed">
          💡 يمكنك تغيير طريقة إنشاء الجدول في أي وقت من خلال زر{' '}
          <span className="font-bold text-amber-900">«إعادة الإنشاء»</span> في شريط أدوات الجدول.
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {isGenerating && (
        <div className="fixed inset-0 z-[100000] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
          <LoadingLogo size="lg" />
          <p className="text-base font-bold text-[#655ac1]">جاري إنشاء جدول المناوبة...</p>
        </div>
      )}
      {confirmMode && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmMode(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl p-6 w-full max-w-md" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 flex items-center justify-center">
                {confirmMode === 'clear' ? <Trash2 size={24} className="text-rose-500" /> : <AlertTriangle size={24} className="text-rose-500" />}
              </div>
              <h3 className="text-lg font-black text-slate-800">
                {confirmMode === 'clear' ? 'حذف كل الإسنادات' : 'إعادة إنشاء جدول المناوبة'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 font-medium leading-relaxed mb-5">
              {confirmMode === 'clear'
                ? 'هل أنت متأكد من حذف كل الإسنادات؟ سيتم حذف جميع أيام المناوبة الحالية ، هل تريد المتابعة؟'
                : 'هل أنت متأكد من إعادة الإنشاء؟ سيتم حذف كل المناوبين المُسندين ، والعودة إلى شاشة اختيار طريقة الإنشاء.'}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmMode(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={confirmMode === 'clear' ? clearSchedule : resetScheduleToChoice}
                className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-all"
              >
                {confirmMode === 'clear' ? 'نعم، احذف الكل' : 'نعم، أعِد الإنشاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!hasSchedule && !manualStarted && emptyState}

      {hasSchedule && (
        <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-200">
          <div dir="rtl" className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3 shrink-0">
              <SlidersHorizontal size={22} className="text-[#655ac1]" />
              <h3 className="text-base font-black text-slate-800 whitespace-nowrap">إدارة جدول المناوبة</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('motabe:duty_distribution_report'))}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-700 transition-all"
                title="عرض تقرير توزيع المناوبة"
              >
                <BarChart3 size={16} />
                تقرير توزيع المناوبة
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('motabe:duty_staff_distribution_report'))}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-700 transition-all"
                title="عرض تقرير توزيع المناوبين"
              >
                <BarChart3 size={16} />
                تقرير توزيع المناوبين
              </button>
              <button
                onClick={() => setConfirmMode('regenerate')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-700 transition-all"
                title="إعادة الإنشاء"
              >
                <RotateCcw size={16} />
                إعادة الإنشاء
              </button>
              <button
                onClick={() => setConfirmMode('clear')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-700 transition-all"
                title="حذف كل الإسنادات"
              >
                <Trash2 size={16} className="text-rose-600" />
                حذف الكل
              </button>
            </div>
          </div>
        </div>
      )}

      {hasSchedule && <div id="schedule-builder-section">
        <DutyScheduleBuilder
          dutyData={dutyData}
          setDutyData={setDutyData}
          teachers={teachers}
          admins={admins}
          scheduleSettings={scheduleSettings}
          schoolInfo={schoolInfo}
          showToast={showToast}
        />
      </div>}
    </div>
  );
};

export default CreateTab;
