import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { ClassInfo, ScheduleSettingsData, SchoolInfo, Specialization, Subject, Teacher } from '../../types';
import ScheduleSignatureDocument from './ScheduleSignatureDocument';
import {
  APP_STORAGE_KEY,
  ScheduleSignatureRequest,
  readScheduleSignatureRequests,
} from '../../utils/scheduleShare';

type SignaturePrintRequest = { teacherIds: string[] };

type AppDataShape = {
  schoolInfo?: SchoolInfo;
  scheduleSettings?: ScheduleSettingsData;
  teachers?: Teacher[];
  classes?: ClassInfo[];
  subjects?: Subject[];
  specializations?: Specialization[];
};

export const SCHEDULE_SIGNATURE_PRINT_REQUEST_PREFIX = 'motabe:schedule_sigprint:';

const normalizeTeacherName = (name: string) => name.replace(/\s+/g, ' ').trim();

/** يحلّ المعلم من طلب توقيع محفوظ بتسامح: بالمعرّف ثم بالاسم المطبّع ثم بتطابق المقاطع. */
const resolveSignatureTeacher = <T extends { id: string; name: string }>(
  teacherList: T[],
  teacherId: string,
  teacherName?: string,
): T | undefined => {
  const byId = teacherList.find(item => item.id === teacherId);
  if (byId) return byId;
  if (!teacherName) return undefined;
  const target = normalizeTeacherName(teacherName);
  const byExactName = teacherList.find(item => normalizeTeacherName(item.name) === target);
  if (byExactName) return byExactName;
  const targetTokens = target.split(' ').filter(Boolean);
  if (targetTokens.length === 0) return undefined;
  const subsetMatches = teacherList.filter(item => {
    const itemTokens = normalizeTeacherName(item.name).split(' ').filter(Boolean);
    return targetTokens.every(token => itemTokens.includes(token));
  });
  return subsetMatches.length === 1 ? subsetMatches[0] : undefined;
};

const signaturePrintCSS = `
  @page { size: A4 portrait; margin: 10mm; }
  @media print {
    html, body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      background: #fff !important;
      font-family: "Tajawal", sans-serif !important;
    }
    body * { visibility: hidden !important; }
    #signature-print-root, #signature-print-root * { visibility: visible !important; }
    #signature-print-root { position: absolute !important; inset: 0 !important; width: 100% !important; background: #fff !important; }
    .no-print { display: none !important; }
    .signature-print-page { break-after: page; page-break-after: always; }
    .signature-print-page:last-child { break-after: auto; page-break-after: auto; }
  }
`;

interface Props {
  token: string;
}

const ScheduleSignaturePrintPage: React.FC<Props> = ({ token }) => {
  const request = useMemo<SignaturePrintRequest | null>(() => {
    try {
      const raw = localStorage.getItem(`${SCHEDULE_SIGNATURE_PRINT_REQUEST_PREFIX}${token}`);
      return raw ? (JSON.parse(raw) as SignaturePrintRequest) : null;
    } catch {
      return null;
    }
  }, [token]);

  const appData = useMemo<AppDataShape | null>(() => {
    try {
      const raw = localStorage.getItem(APP_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const sigRequests = useMemo<ScheduleSignatureRequest[]>(() => readScheduleSignatureRequests(), []);

  const specializationNames = useMemo(
    () => Object.fromEntries((appData?.specializations || []).map(item => [item.id, item.name])),
    [appData?.specializations]
  );

  const ready = Boolean(
    request && request.teacherIds.length > 0 &&
    appData?.scheduleSettings && appData.teachers && appData.classes && appData.subjects && appData.schoolInfo
  );

  const [printed, setPrinted] = useState(false);
  useEffect(() => {
    if (!ready || printed) return;
    const timer = window.setTimeout(() => {
      setPrinted(true);
      try { window.print(); } catch { /* المستخدم يطبع يدويًا عند الحاجة */ }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [ready, printed]);

  if (!ready || !request || !appData) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-slate-100">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-rose-500" />
          </div>
          <h2 className="text-lg font-black text-slate-800 mb-2">تعذّر تجهيز نماذج التوقيع</h2>
          <p className="text-sm text-slate-500 font-medium">انتهت صلاحية الطلب أو لا توجد بيانات. أعد المحاولة من صفحة الجداول.</p>
        </div>
      </div>
    );
  }

  const { teacherIds } = request;
  const { teachers, classes, subjects, scheduleSettings, schoolInfo } = appData as Required<AppDataShape>;

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      <style>{signaturePrintCSS}</style>
      <div id="signature-print-root" className="bg-white p-6 space-y-8">
        {teacherIds.map(teacherId => {
          const sigRequest = sigRequests.find(r => r.teacherId === teacherId);
          const teacher = resolveSignatureTeacher(teachers, teacherId, sigRequest?.teacherName);
          if (!teacher) {
            return (
              <div key={teacherId || sigRequest?.token || 'missing-teacher'} className="signature-print-page rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center">
                <p className="text-base font-black text-amber-800">تعذر عرض نموذج الاستلام</p>
                <p className="text-sm font-bold text-amber-700 mt-2">
                  لم يتم العثور على المعلم {sigRequest?.teacherName || 'المحدد'} في قائمة المعلمين الحالية.
                </p>
              </div>
            );
          }
          const isSigned = sigRequest?.status === 'signed';

          return (
            <ScheduleSignatureDocument
              key={teacherId}
              teacher={teacher}
              teachers={teachers}
              classes={classes}
              subjects={subjects}
              specializationNames={specializationNames}
              settings={scheduleSettings}
              schoolInfo={schoolInfo}
              mode={isSigned ? 'electronic' : 'manual'}
              signedAt={sigRequest?.signedAt}
            >
              {isSigned && sigRequest?.signatureData && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold text-emerald-600 mb-2">التوقيع الإلكتروني</p>
                  <img
                    src={sigRequest.signatureData}
                    alt={`توقيع ${teacher.name}`}
                    className="max-h-20 border border-emerald-200 rounded-xl bg-white"
                  />
                </div>
              )}
            </ScheduleSignatureDocument>
          );
        })}
      </div>
    </div>
  );
};

export default ScheduleSignaturePrintPage;
