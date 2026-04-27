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
  createdAt?: Date | null;
  children?: React.ReactNode;
};

export const MinistryLogo = () => (
  <svg width="68" height="72" viewBox="0 0 120 130" aria-label="شعار وزارة التعليم">
    <rect x="56" y="62" width="8" height="46" rx="2" fill="#1a6b30"/>
    <path d="M60 60 Q40 45 22 50" stroke="#1a6b30" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M60 60 Q38 38 35 18" stroke="#1a6b30" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M60 60 Q58 35 50 14" stroke="#1a6b30" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M60 60 Q62 35 70 14" stroke="#1a6b30" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M60 60 Q82 38 85 18" stroke="#1a6b30" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M60 60 Q82 45 98 50" stroke="#1a6b30" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <line x1="32" y1="108" x2="55" y2="68" stroke="#1a6b30" strokeWidth="3" strokeLinecap="round"/>
    <polygon points="55,65 51,60 60,64" fill="#1a6b30"/>
    <rect x="28" y="105" width="12" height="4" rx="1" fill="#1a6b30" transform="rotate(-58 34 107)"/>
    <line x1="88" y1="108" x2="65" y2="68" stroke="#1a6b30" strokeWidth="3" strokeLinecap="round"/>
    <polygon points="65,65 69,60 60,64" fill="#1a6b30"/>
    <rect x="80" y="105" width="12" height="4" rx="1" fill="#1a6b30" transform="rotate(58 86 107)"/>
  </svg>
);

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
  createdAt,
  children,
}) => {
  const currentSemester =
    schoolInfo.semesters?.find(item => item.id === schoolInfo.currentSemesterId) ||
    schoolInfo.semesters?.[0];
  const headerDate = createdAt || new Date();
  const specializationLabel = specializationNames[teacher.specializationId] || 'غير محدد';
  const headerCell = 'text-[11px] sm:text-xs font-bold text-slate-600 leading-6';

  return (
  <div className="signature-print-page rounded-[2rem] border border-slate-200 bg-white p-5 space-y-5">
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center border-b border-slate-200 pb-4">
      <div className="text-right">
        <p className={headerCell}>وزارة التعليم</p>
        <p className={headerCell}>إدارة التعليم بمنطقة {schoolInfo.region || '—'}</p>
        <p className={headerCell}>المدرسة {schoolInfo.schoolName || '—'}</p>
      </div>
      <div className="flex justify-center">
        <MinistryLogo />
      </div>
      <div className="text-right sm:text-left">
        <p className={headerCell}>الفصل الدراسي {currentSemester?.name || '—'}</p>
        <p className={headerCell}>العام الدراسي {schoolInfo.academicYear || '—'}</p>
        <p className={headerCell}>اليوم {new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(headerDate)}</p>
        <p className={headerCell}>التاريخ {new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(headerDate)}</p>
        <p className={headerCell}>الوقت {new Intl.DateTimeFormat('ar-SA', { timeStyle: 'short' }).format(headerDate)}</p>
      </div>
    </div>

    <h1 className="text-center text-xl font-black text-slate-800">الاطلاع على الجدول والتوقيع بالاستلام</h1>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-slate-400 font-bold mb-1">اسم المعلم</p>
          <p className="text-slate-800 font-black">{teacher.name}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-slate-400 font-bold mb-1">التخصص</p>
          <p className="text-slate-800 font-black">{specializationLabel}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-slate-400 font-bold mb-1">رقم الجوال</p>
          <p className="text-slate-800 font-black" dir="ltr">{teacher.phone || 'غير متوفر'}</p>
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
};

export default ScheduleSignatureDocument;
