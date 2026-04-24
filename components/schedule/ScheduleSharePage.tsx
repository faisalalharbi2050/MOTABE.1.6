import React, { useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, Copy, Phone, School, Users } from 'lucide-react';
import { ClassInfo, ScheduleSettingsData, SchoolInfo, Specialization, Subject, Teacher } from '../../types';
import PrintableSchedule from './PrintableSchedule';
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

const ScheduleSharePage: React.FC<Props> = ({ token }) => {
  const [copied, setCopied] = useState(false);

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

  const createdAtLabel = request?.createdAt
    ? new Intl.DateTimeFormat('ar-SA', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(new Date(request.createdAt))
    : '';
  const createdAtDate = request?.createdAt ? new Date(request.createdAt) : null;
  const createdDayLabel = createdAtDate
    ? new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(createdAtDate)
    : '';
  const createdDateLabel = createdAtDate
    ? new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(createdAtDate)
    : '';
  const createdTimeLabel = createdAtDate
    ? new Intl.DateTimeFormat('ar-SA', { timeStyle: 'short' }).format(createdAtDate)
    : '';

  const title = request?.title || 'عرض الجدول';
  const recipientCount = request?.recipients.length || 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

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
          <div className="bg-[#655ac1] px-6 py-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
                  <School size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-white text-lg font-black">{title}</h1>
                  <p className="text-white/75 text-sm font-medium mt-1">{request.schoolName || appData.schoolInfo.schoolName || 'المدرسة'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-[#655ac1] font-bold text-sm shadow-sm"
              >
                <Copy size={16} />
                {copied ? 'تم نسخ الرابط' : 'نسخ الرابط'}
              </button>
            </div>
          </div>

          <div className="p-5 md:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-slate-400 font-bold mb-1 flex items-center gap-2">
                  <CalendarDays size={15} />
                  اليوم
                </p>
                <p className="text-slate-800 font-black">{createdDayLabel}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-slate-400 font-bold mb-1 flex items-center gap-2">
                  <CalendarDays size={15} />
                  التاريخ
                </p>
                <p className="text-slate-800 font-black">{createdDateLabel}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-slate-400 font-bold mb-1 flex items-center gap-2">
                  <Clock3 size={15} />
                  الوقت
                </p>
                <p className="text-slate-800 font-black">{createdTimeLabel}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-slate-400 font-bold mb-1 flex items-center gap-2">
                  <Users size={15} />
                  الفئة المستهدفة
                </p>
                <p className="text-slate-800 font-black">
                  {request.audience === 'teachers' && 'المعلمون'}
                  {request.audience === 'admins' && 'الإداريون'}
                  {request.audience === 'guardians' && 'أولياء الأمور'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-slate-400 font-bold mb-1">العنصر المرسل</p>
                <p className="text-slate-800 font-black">{request.targetLabel}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-[#e5e1fe] bg-[#f8f7ff] px-4 py-3 text-sm font-medium text-[#655ac1]">
              وقت الإرسال الكامل: {createdAtLabel}
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white overflow-hidden">
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
              />
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h2 className="text-base font-black text-slate-800">بيانات المستلمين</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    تم تضمين {recipientCount} سجلًا مرتبطًا بهذا الرابط لسهولة المراجعة دون تكدس داخل المحتوى الرئيسي.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 text-emerald-700 px-4 py-2 text-sm font-black">
                  <CheckCircle2 size={16} />
                  {recipientCount} مستلم
                </div>
              </div>

              <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer list-none font-black text-slate-700 flex items-center justify-between">
                  <span>عرض بيانات المستلمين</span>
                  <span className="text-xs text-slate-400">اضغط للتوسيع</span>
                </summary>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-200">
                        <th className="py-2 text-right font-black">الاسم</th>
                        <th className="py-2 text-right font-black">الصفة</th>
                        <th className="py-2 text-right font-black">رقم الجوال</th>
                        <th className="py-2 text-right font-black">البيان المرتبط</th>
                      </tr>
                    </thead>
                    <tbody>
                      {request.recipients.map(recipient => (
                        <tr key={recipient.id} className="border-b border-slate-100 last:border-b-0 text-slate-700">
                          <td className="py-3 font-bold">{recipient.name}</td>
                          <td className="py-3">
                            {recipient.role === 'teacher' && 'معلم'}
                            {recipient.role === 'admin' && 'إداري'}
                            {recipient.role === 'guardian' && 'ولي أمر'}
                          </td>
                          <td className="py-3" dir="ltr">
                            <span className="inline-flex items-center gap-1.5">
                              <Phone size={14} className="text-slate-400" />
                              {recipient.phone || 'بدون رقم'}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500">
                            {recipient.studentName || recipient.classLabel || request.targetLabel}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleSharePage;
