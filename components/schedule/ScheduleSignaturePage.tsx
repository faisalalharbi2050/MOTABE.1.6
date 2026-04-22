import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, PenLine, X } from 'lucide-react';
import InlineScheduleView from './InlineScheduleView';
import { ClassInfo, ScheduleSettingsData, SchoolInfo, Specialization, Subject, Teacher } from '../../types';

type ScheduleSignatureRequest = {
  token: string;
  teacherId: string;
  teacherName: string;
  createdAt: string;
  status: 'pending' | 'signed';
  signedAt?: string;
  signatureData?: string;
};

type AppDataShape = {
  schoolInfo?: SchoolInfo;
  scheduleSettings?: ScheduleSettingsData;
  teachers?: Teacher[];
  classes?: ClassInfo[];
  subjects?: Subject[];
  specializations?: Specialization[];
};

const APP_STORAGE_KEY = 'school_assignment_v4';
const SCHEDULE_SIGNATURE_REQUESTS_KEY = 'schedule_signature_requests_v1';

const readSignatureRequests = (): ScheduleSignatureRequest[] => {
  try {
    const raw = localStorage.getItem(SCHEDULE_SIGNATURE_REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const updateSignatureRequest = (token: string, nextData: Partial<ScheduleSignatureRequest>) => {
  const requests = readSignatureRequests().map(request =>
    request.token === token ? { ...request, ...nextData } : request
  );
  localStorage.setItem(SCHEDULE_SIGNATURE_REQUESTS_KEY, JSON.stringify(requests));
  return requests.find(request => request.token === token) || null;
};

interface Props {
  token: string;
}

const ScheduleSignaturePage: React.FC<Props> = ({ token }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [request, setRequest] = useState<ScheduleSignatureRequest | null>(null);
  const [appData, setAppData] = useState<AppDataShape | null>(null);

  useEffect(() => {
    try {
      const currentRequest = readSignatureRequests().find(item => item.token === token) || null;
      const rawAppData = localStorage.getItem(APP_STORAGE_KEY);
      const parsedAppData = rawAppData ? JSON.parse(rawAppData) : null;

      if (!currentRequest || !parsedAppData?.scheduleSettings?.timetable) {
        setNotFound(true);
        return;
      }

      setRequest(currentRequest);
      setAppData(parsedAppData);
      setConfirmed(currentRequest.status === 'signed');
    } catch {
      setNotFound(true);
    }
  }, [token]);

  const teacher = useMemo(
    () => appData?.teachers?.find(item => item.id === request?.teacherId) || null,
    [appData, request]
  );
  const specializationNames = useMemo(
    () => Object.fromEntries((appData?.specializations || []).map(item => [item.id, item.name])),
    [appData?.specializations]
  );

  const formattedCreatedAt = request?.createdAt
    ? new Intl.DateTimeFormat('ar-SA', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(new Date(request.createdAt))
    : '';

  const startDraw = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo((x - rect.left) * (canvas.width / rect.width), (y - rect.top) * (canvas.height / rect.height));
    setIsDrawing(true);
  };

  const continueDraw = (x: number, y: number) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo((x - rect.left) * (canvas.width / rect.width), (y - rect.top) * (canvas.height / rect.height));
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature || !request) return;

    const output = document.createElement('canvas');
    output.width = 240;
    output.height = 80;
    const outputCtx = output.getContext('2d');
    if (outputCtx) outputCtx.drawImage(canvas, 0, 0, 240, 80);

    const signedRequest = updateSignatureRequest(token, {
      status: 'signed',
      signedAt: new Date().toISOString(),
      signatureData: output.toDataURL('image/png'),
    });

    setRequest(signedRequest);
    setConfirmed(true);
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-slate-100">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={28} className="text-rose-500" />
          </div>
          <h2 className="text-lg font-black text-slate-800 mb-2">الرابط غير صالح</h2>
          <p className="text-sm text-slate-500 font-medium">تعذر العثور على جدول المعلم المرتبط بهذا الرابط.</p>
        </div>
      </div>
    );
  }

  if (!request || !appData?.schoolInfo || !appData.scheduleSettings || !appData.teachers || !appData.classes || !appData.subjects || !teacher) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#655ac1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-[#655ac1] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
                <PenLine size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-white text-lg font-black">الاطلاع على الجدول والتوقيع بالاستلام</h1>
                <p className="text-white/75 text-sm font-medium mt-1">{appData.schoolInfo.schoolName || 'المدرسة'}</p>
              </div>
            </div>
          </div>

          <div className="p-5 md:p-6 space-y-5">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-slate-400 font-bold mb-1">اسم المعلم</p>
                  <p className="text-slate-800 font-black">{teacher.name}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-slate-400 font-bold mb-1">نوع الإشعار</p>
                  <p className="text-slate-800 font-black">العلم بالجدول واستلامه</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-slate-400 font-bold mb-1">تاريخ إنشاء الرابط</p>
                  <p className="text-slate-800 font-black">{formattedCreatedAt}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white overflow-hidden">
              <InlineScheduleView
                type="individual_teacher"
                settings={appData.scheduleSettings}
                teachers={appData.teachers}
                classes={appData.classes}
                subjects={appData.subjects}
                targetId={teacher.id}
                specializationNames={specializationNames}
                compactIndividual
              />
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 font-medium leading-7">
                تم العلم والاطلاع على الجدول المسند والتوقيع بالاستلام
              </div>

              {!confirmed ? (
                <>
                  <div>
                    <p className="text-sm font-black text-slate-700 mb-1">التوقيع الحر</p>
                    <p className="text-xs text-slate-400 font-medium">وقّع داخل المساحة التالية لتأكيد العلم بالجدول واستلامه.</p>
                  </div>

                  <div className="relative rounded-[1.5rem] border-2 border-dashed border-[#cfc8ff] bg-slate-50 overflow-hidden" style={{ height: 180 }}>
                    <canvas
                      ref={canvasRef}
                      width={900}
                      height={180}
                      className="w-full h-full touch-none cursor-crosshair"
                      onMouseDown={event => startDraw(event.clientX, event.clientY)}
                      onMouseMove={event => continueDraw(event.clientX, event.clientY)}
                      onMouseUp={stopDraw}
                      onMouseLeave={stopDraw}
                      onTouchStart={event => {
                        event.preventDefault();
                        if (event.touches[0]) startDraw(event.touches[0].clientX, event.touches[0].clientY);
                      }}
                      onTouchMove={event => {
                        event.preventDefault();
                        if (event.touches[0]) continueDraw(event.touches[0].clientX, event.touches[0].clientY);
                      }}
                      onTouchEnd={stopDraw}
                    />
                    {!hasSignature && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-slate-300 text-sm font-bold">وقّع هنا بالضغط والسحب</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all"
                    >
                      مسح التوقيع
                    </button>
                    <button
                      type="button"
                      disabled={!hasSignature}
                      onClick={handleConfirm}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#655ac1] text-white font-black shadow-lg shadow-[#655ac1]/20 hover:bg-[#5046a0] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <Check size={16} />
                      إرسال
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6 text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={28} className="text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-black text-emerald-800 mb-2">تم استلام التوقيع بنجاح</h3>
                  <p className="text-sm font-medium text-emerald-700">
                    {request.signedAt
                      ? `تم توثيق الاستلام بتاريخ ${new Intl.DateTimeFormat('ar-SA', {
                          dateStyle: 'full',
                          timeStyle: 'short',
                        }).format(new Date(request.signedAt))}`
                      : 'تم توثيق العلم بالجدول واستلامه.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleSignaturePage;
