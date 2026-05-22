import React from 'react';
import { AlertTriangle, X, Sliders } from 'lucide-react';
import { Teacher, SchoolInfo, TeacherConstraint } from '../../types';

interface Props {
  isOpen: boolean;
  teachers: Teacher[];                    // shared teachers still missing presenceDays
  teacherConstraints: TeacherConstraint[];
  schoolInfo: SchoolInfo;
  onAdjustTeacher: (teacherId: string) => void;
  onContinueAnyway: () => void;
  onCancel: () => void;
}

const PresenceDaysWarningModal: React.FC<Props> = ({
  isOpen,
  teachers,
  teacherConstraints,
  schoolInfo,
  onAdjustTeacher,
  onContinueAnyway,
  onCancel,
}) => {
  if (!isOpen) return null;

  const mainName = schoolInfo.schoolName || 'المدرسة الرئيسية';
  const sharedSchools = schoolInfo.sharedSchools || [];

  const schoolNameOf = (schoolId: string): string => {
    if (schoolId === 'main') return mainName;
    return sharedSchools.find(s => s.id === schoolId)?.name || schoolId;
  };

  const missingSchoolsFor = (teacher: Teacher): string[] => {
    const tc = teacherConstraints.find(c => c.teacherId === teacher.id);
    const presenceDays = tc?.presenceDays || {};
    const teacherSchools = teacher.schools ?? [];
    return teacherSchools
      .filter(s => s.schoolId !== 'main')
      .filter(s => !presenceDays[s.schoolId] || presenceDays[s.schoolId].length === 0)
      .map(s => s.schoolId);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-amber-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">قيود غير مكتملة قد تؤثر على دقة الجدول</h3>
              <p className="text-xs text-slate-400 mt-0.5">يرجى مراجعة الإجراء قبل المتابعة</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm leading-7 font-medium text-slate-600">
            يوجد <span className="font-black text-slate-800">{teachers.length}</span>{' '}
            {teachers.length === 1 ? 'معلم مشترك' : 'معلمين مشتركين'} لم تُحدَّد أيام تواجدهم في المدارس.
            قد يوزّع النظام حصصهم بشكل لا يطابق دوامهم الفعلي.
          </p>

          <div className="max-h-[280px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {teachers.map(t => {
              const missing = missingSchoolsFor(t);
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{t.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {missing.map(sid => (
                        <span
                          key={sid}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-500 border border-slate-200"
                        >
                          {schoolNameOf(sid)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => onAdjustTeacher(t.id)}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-[#655ac1] hover:bg-[#655ac1]/5 px-3 py-2 rounded-lg transition-colors"
                  >
                    <Sliders size={13} />
                    ضبط
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onContinueAnyway}
            className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl border border-slate-300 transition-colors"
          >
            متابعة البناء رغم ذلك
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-[#655ac1]/20 hover:scale-105 active:scale-95"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

export default PresenceDaysWarningModal;
