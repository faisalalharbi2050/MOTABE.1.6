import React from 'react';
import { Check } from 'lucide-react';
import { ClassInfo, ScheduleSettingsData, SchoolInfo, Subject, Teacher } from '../../types';
import InlineScheduleView from './InlineScheduleView';

type Props = {
  teacher: Teacher;
  teachers: Teacher[];
  classes: ClassInfo[];
  subjects: Subject[];
  specializationNames: Record<string, string>;
  settings: ScheduleSettingsData;
  schoolInfo: SchoolInfo;
  mode: 'manual' | 'electronic';
  signedAt?: string;
  children?: React.ReactNode;
};

const ScheduleSignatureDocument: React.FC<Props> = ({
  teacher,
  teachers,
  classes,
  subjects,
  specializationNames,
  settings,
  schoolInfo,
  mode,
  signedAt,
  children,
}) => (
  <div className="signature-print-page rounded-[2rem] border border-slate-200 bg-white p-5 space-y-5">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-slate-400 font-bold mb-1">اسم المعلم</p>
          <p className="text-slate-800 font-black">{teacher.name}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-slate-400 font-bold mb-1">نوع النموذج</p>
          <p className="text-slate-800 font-black">العلم بالجدول واستلامه</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-slate-400 font-bold mb-1">المدرسة</p>
          <p className="text-slate-800 font-black">{schoolInfo.schoolName || 'المدرسة'}</p>
        </div>
      </div>
    </div>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white overflow-hidden">
      <InlineScheduleView
        type="individual_teacher"
        settings={settings}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        targetId={teacher.id}
        specializationNames={specializationNames}
        compactIndividual
        showWaitingManagement={false}
      />
    </div>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 font-medium leading-7">
        تم العلم والاطلاع على الجدول المسند والتوقيع بالاستلام
      </div>

      {mode === 'manual' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-400 mb-6">اسم المعلم</p>
            <div className="border-b-2 border-slate-300 h-8" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-400 mb-6">التاريخ</p>
            <div className="border-b-2 border-slate-300 h-8" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-400 mb-6">التوقيع</p>
            <div className="border-b-2 border-slate-300 h-8" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {children}
          {signedAt && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Check size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-black text-emerald-800">تم استلام التوقيع بنجاح</p>
                <p className="text-xs font-bold text-emerald-700 mt-0.5">
                  تم توثيق الاستلام بتاريخ {new Intl.DateTimeFormat('ar-SA', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(signedAt))}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

export default ScheduleSignatureDocument;
