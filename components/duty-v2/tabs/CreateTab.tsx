import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, BarChart3, Lightbulb, PenLine, RotateCcw, SlidersHorizontal, Sparkles, Trash2, Users, Wand2, X } from 'lucide-react';
import {
  SchoolInfo, Teacher, Admin, ScheduleSettingsData,
  DutyScheduleData, DutyDayAssignment,
} from '../../../types';
import DutyScheduleBuilder from '../../duty/DutyScheduleBuilder';
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
    setDutyData(prev => ({
      ...prev,
      dayAssignments: weekAssignments.flatMap(week => week.dayAssignments),
      weekAssignments,
    }));
    setManualStarted(true);
    showToast('تم إنشاء جدول المناوبة اليدوي مفرغاً', 'success');
  };

  const buildAutoSchedule = () => {
    if (availableStaff.length === 0) {
      showToast('لا يوجد مناوبون متاحون للتوزيع', 'warning');
      return;
    }

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

    setDutyData(prev => ({
      ...prev,
      dayAssignments: assignments,
      weekAssignments,
      dutyAssignmentCounts: newCounts,
    }));
    setManualStarted(false);
    showToast('تم إنشاء جدول المناوبة آلياً', 'success');
    if (alerts[0]) showToast(alerts[0], 'warning');
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

  const emptyState = (
    <div dir="rtl" className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <div className="relative rounded-3xl p-6 border-2 bg-white border-slate-200 hover:border-slate-300 hover:shadow-md transition-all flex flex-col">
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8779fb] bg-white border border-slate-300 rounded-full px-3 py-1.5">
              <Users size={12} className="text-[#8779fb]" />
              {availableStaff.length} مناوب متاح
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4 pl-28">
            <Wand2 size={22} strokeWidth={1.8} className="text-[#8779fb] shrink-0" />
            <h3 className="text-lg font-black text-slate-800">إنشاء جدول آلي</h3>
          </div>
          <div className="text-xs font-medium text-slate-600 leading-relaxed mb-4 space-y-2">
            <p className="font-bold text-slate-700">يقوم النظام بتوزيع المناوبين آلياً:</p>
            <ul className="space-y-1.5 pr-4 list-disc marker:text-[#8779fb]">
              <li><span className="font-bold text-slate-700">المعلمون:</span> يتم اختيار من لديه حصة أخيرة أو قبل الأخيرة.</li>
              <li><span className="font-bold text-slate-700">الإداريون:</span> يتم توزيعهم عشوائياً مع مراعاة التوازن.</li>
            </ul>
            <p className="font-bold text-slate-700">يمكنك التعديل بسهولة على التوزيع بعد الإنشاء.</p>
          </div>
          <button
            onClick={buildAutoSchedule}
            disabled={availableStaff.length === 0}
            className={`mt-auto mx-auto w-full max-w-[230px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all ${
              availableStaff.length === 0
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#655ac1] border-[#655ac1] text-white hover:shadow-lg hover:-translate-y-0.5 shadow-md shadow-[#655ac1]/20'
            }`}
          >
            <Sparkles size={16} />
            إنشاء جدول آلي
            <ArrowLeft size={16} />
          </button>
        </div>

        <div className="relative rounded-3xl p-6 border-2 bg-white border-slate-200 hover:border-slate-300 hover:shadow-md transition-all flex flex-col">
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8779fb] bg-white border border-slate-300 rounded-full px-3 py-1.5">
              <Users size={12} className="text-[#8779fb]" />
              {availableStaff.length} مناوب متاح
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4 pl-28">
            <PenLine size={22} strokeWidth={1.8} className="text-[#8779fb] shrink-0" />
            <h3 className="text-lg font-black text-slate-800">إنشاء جدول يدوي</h3>
          </div>
          <p className="text-xs font-medium text-slate-600 leading-relaxed mb-4">
            أنشئ جدول المناوبة مفرغاً ووزع المناوبين يدوياً من قائمة المعلمين والإداريين وفق ما يناسبك.
          </p>
          <button
            onClick={buildEmptySchedule}
            className="mt-auto mx-auto w-full max-w-[230px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#655ac1] text-sm font-bold bg-[#655ac1] text-white hover:shadow-lg hover:-translate-y-0.5 shadow-md shadow-[#655ac1]/20 transition-all"
          >
            <PenLine size={16} />
            إنشاء جدول يدوي
            <ArrowLeft size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
        <Lightbulb size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <span className="text-[11px] font-medium text-amber-800 leading-relaxed">
          يمكنك تغيير طريقة إنشاء الجدول في أي وقت من خلال زر <span className="font-bold text-amber-900">إعادة الإنشاء</span> في شريط أدوات الجدول.
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {confirmMode && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmMode(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl p-6 w-full max-w-md" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                {confirmMode === 'clear' ? <Trash2 size={24} className="text-rose-500" /> : <AlertTriangle size={24} className="text-rose-500" />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-800">
                  {confirmMode === 'clear' ? 'حذف كل الإسنادات' : 'إعادة إنشاء جدول المناوبة'}
                </h3>
              </div>
              <button
                onClick={() => setConfirmMode(null)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
                title="إغلاق"
              >
                <X size={18} />
              </button>
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-3">
              <SlidersHorizontal size={22} className="text-[#655ac1]" />
              <h3 className="text-base font-black text-slate-800">إجراءات جدول المناوبة اليومية</h3>
            </div>
            <div dir="rtl" className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('motabe:duty_distribution_report'))}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-700 hover:border-[#655ac1] hover:bg-white transition-all"
                title="عرض تقرير توزيع المناوبة"
              >
                <BarChart3 size={16} />
                تقرير توزيع المناوبة
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('motabe:duty_staff_distribution_report'))}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-700 hover:border-[#655ac1] hover:bg-white transition-all"
                title="عرض تقرير توزيع المناوبين"
              >
                <BarChart3 size={16} />
                تقرير توزيع المناوبين
              </button>
              <button
                onClick={() => setConfirmMode('regenerate')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-700 hover:border-[#655ac1] hover:bg-white transition-all"
                title="إعادة الإنشاء"
              >
                <RotateCcw size={16} />
                إعادة الإنشاء
              </button>
              <button
                onClick={() => setConfirmMode('clear')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-rose-200 text-rose-600 hover:border-rose-400 hover:bg-rose-50 transition-all"
                title="حذف كل الإسنادات"
              >
                <Trash2 size={16} />
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
