import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { ClassInfo, ScheduleSettingsData, SchoolInfo, Specialization, Subject, Teacher } from '../../types';
import InlineScheduleView from './InlineScheduleView';
import PrintableSchedule from './PrintableSchedule';
import { MinistryLogo } from './ScheduleSignatureDocument';
import { APP_STORAGE_KEY, readScheduleShares } from '../../utils/scheduleShare';

type AppDataShape = {
  schoolInfo?: SchoolInfo;
  scheduleSettings?: ScheduleSettingsData;
  teachers?: Teacher[];
  classes?: ClassInfo[];
  subjects?: Subject[];
  specializations?: Specialization[];
};

interface Props {
  token: string;
}

const SharedScheduleHeader: React.FC<{
  schoolInfo: SchoolInfo;
  createdAt: Date;
}> = ({ schoolInfo, createdAt }) => {
  const currentSemester =
    schoolInfo.semesters?.find(item => item.id === schoolInfo.currentSemesterId) ||
    schoolInfo.semesters?.[0];
  const headerCell = 'text-[11px] sm:text-xs font-bold text-slate-600 leading-6';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center border-b border-slate-200 pb-4">
      <div className="text-right">
        <p className={headerCell}>وزارة التعليم</p>
        <p className={headerCell}>إدارة التعليم بمنطقة {schoolInfo.region || '-'}</p>
        <p className={headerCell}>المدرسة {schoolInfo.schoolName || '-'}</p>
      </div>
      <div className="flex justify-center">
        <MinistryLogo />
      </div>
      <div className="text-right sm:text-left">
        <p className={headerCell}>الفصل الدراسي {currentSemester?.name || '-'}</p>
        <p className={headerCell}>العام الدراسي {schoolInfo.academicYear || '-'}</p>
        <p className={headerCell}>اليوم {new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(createdAt)}</p>
        <p className={headerCell}>التاريخ {new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(createdAt)}</p>
        <p className={headerCell}>الوقت {new Intl.DateTimeFormat('ar-SA', { timeStyle: 'short' }).format(createdAt)}</p>
      </div>
    </div>
  );
};

const ScheduleSharePage: React.FC<Props> = ({ token }) => {
  const request = useMemo(
    () => readScheduleShares().find(item => item.token === token) || null,
    [token]
  );

  const appData = useMemo<AppDataShape | null>(() => {
    try {
      const raw = localStorage.getItem(APP_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const createdAtDate = request?.createdAt ? new Date(request.createdAt) : null;
  const title = request?.title || 'عرض الجدول';
  const specializationNames = useMemo(
    () => Object.fromEntries((appData?.specializations || []).map(item => [item.id, item.name])),
    [appData?.specializations]
  );
  const classTargetIds = request?.type === 'individual_class'
    ? (request.targetIds?.length ? request.targetIds : request.targetId ? [request.targetId] : [])
    : [];

  if (!request || !appData?.schoolInfo || !appData.scheduleSettings || !appData.teachers || !appData.classes || !appData.subjects) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-slate-100">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-rose-500" />
          </div>
          <h2 className="text-lg font-black text-slate-800 mb-2">الرابط غير صالح</h2>
          <p className="text-sm text-slate-500 font-medium">تعذر العثور على بيانات هذا الجدول أو أن الرابط لم يعد متاحًا.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 space-y-5">
            <SharedScheduleHeader schoolInfo={appData.schoolInfo} createdAt={createdAtDate || new Date()} />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
              <p className="text-sm font-black text-slate-800">{title}</p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white overflow-hidden">
              {request.type === 'individual_teacher' ? (
                <div className="bg-white p-3">
                  <InlineScheduleView
                    type={request.type}
                    settings={appData.scheduleSettings}
                    teachers={appData.teachers}
                    classes={appData.classes}
                    subjects={appData.subjects}
                    specializationNames={specializationNames}
                    targetId={request.targetId}
                    compactIndividual
                    showWaitingManagement={false}
                  />
                </div>
              ) : request.type === 'individual_class' ? (
                <div className="bg-white p-3 space-y-4">
                  {classTargetIds.map(classId => (
                    <InlineScheduleView
                      key={classId}
                      type="individual_class"
                      settings={appData.scheduleSettings}
                      teachers={appData.teachers}
                      classes={appData.classes}
                      subjects={appData.subjects}
                      specializationNames={specializationNames}
                      targetId={classId}
                      compactIndividual
                      showWaitingManagement={false}
                    />
                  ))}
                </div>
              ) : (
                <PrintableSchedule
                  type={request.type}
                  settings={appData.scheduleSettings}
                  teachers={appData.teachers}
                  classes={appData.classes}
                  subjects={appData.subjects}
                  specializations={appData.specializations}
                  targetId={request.targetId}
                  schoolInfo={appData.schoolInfo}
                  onClose={() => {}}
                  hideSignature={request.audience === 'guardians'}
                  sentAt={request.createdAt}
                  hideHeader
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleSharePage;
