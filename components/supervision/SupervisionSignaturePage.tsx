import React, { useRef, useState, useEffect } from 'react';
import { Check, PenLine, X } from 'lucide-react';
import { SupervisionScheduleData } from '../../types';
import { DAY_NAMES } from '../../utils/supervisionUtils';
import LoadingLogo, { useMinLoadingTime } from '../ui/LoadingLogo';

interface AssignmentInfo {
  staffName: string;
  staffType: 'teacher' | 'admin';
  day: string;
  locationNames: string[];
  rowType: 'supervisor' | 'followup';
  effectiveDate?: string;
  token: string;
  phone?: string;
  scheduleRows: { day: string; typeName: string; locationNames: string[] }[];
}

function findAssignment(data: SupervisionScheduleData, token: string): AssignmentInfo | null {
  const getTypeName = (typeId?: string) =>
    data.supervisionTypes.find(type => type.id === typeId)?.name || 'الإشراف اليومي';
  const getLocations = (locationIds: string[]) => locationIds
    .map(lid => data.locations.find(l => l.id === lid)?.name || '')
    .filter(Boolean);
  const supervisorToken = (day: string, typeId: string | undefined, staffId: string) =>
    `supv-supervisor-${day}-${typeId || 'all'}-${staffId}`;
  const followupToken = (day: string, typeId: string | undefined, staffId: string) =>
    `supv-followup-${day}-${typeId || 'all'}-${staffId}`;

  for (const da of data.dayAssignments) {
    // Check supervisors
    for (const sa of da.staffAssignments) {
      if (sa.signatureToken === token || supervisorToken(da.day, sa.contextTypeId, sa.staffId) === token) {
        const scheduleRows = data.dayAssignments.flatMap(dayAssignment =>
          dayAssignment.staffAssignments
            .filter(item => item.staffId === sa.staffId && item.staffType === sa.staffType)
            .map(item => ({
              day: dayAssignment.day,
              typeName: getTypeName(item.contextTypeId),
              locationNames: getLocations(item.locationIds),
            }))
        );
        const locs = getLocations(sa.locationIds);
        return {
          staffName: sa.staffName,
          staffType: sa.staffType,
          day: da.day,
          locationNames: locs,
          rowType: 'supervisor',
          effectiveDate: data.effectiveDate,
          token,
          scheduleRows,
        };
      }
    }
    // Check follow-up supervisor
    const dayTypeIds = Array.from(new Set(da.staffAssignments.map(item => item.contextTypeId).filter(Boolean)));
    const followupTokenMatches = da.followUpSupervisorId && dayTypeIds.some(typeId =>
      followupToken(da.day, typeId, da.followUpSupervisorId!) === token
    );
    if ((da.followUpSignatureToken === token || followupTokenMatches) && da.followUpSupervisorId && da.followUpSupervisorName) {
      const scheduleRows = data.dayAssignments
        .filter(dayAssignment => dayAssignment.followUpSupervisorId === da.followUpSupervisorId)
        .flatMap(dayAssignment => {
          const typeIds = Array.from(new Set(dayAssignment.staffAssignments.map(item => item.contextTypeId).filter(Boolean)));
          return typeIds.map(typeId => ({
            day: dayAssignment.day,
            typeName: getTypeName(typeId),
            locationNames: [],
          }));
        });
      return {
        staffName: da.followUpSupervisorName,
        staffType: 'admin',
        day: da.day,
        locationNames: [],
        rowType: 'followup',
        effectiveDate: data.effectiveDate,
        token,
        scheduleRows,
      };
    }
  }
  return null;
}

function saveSignatureToStorage(token: string, signatureData: string, rowType: 'supervisor' | 'followup') {
  try {
    const raw = localStorage.getItem('supervision_data_v1');
    if (!raw) return;
    const data: SupervisionScheduleData = JSON.parse(raw);
    const signedAt = new Date().toISOString();
    const supervisorToken = (day: string, typeId: string | undefined, staffId: string) =>
      `supv-supervisor-${day}-${typeId || 'all'}-${staffId}`;
    const followupToken = (day: string, typeId: string | undefined, staffId: string) =>
      `supv-followup-${day}-${typeId || 'all'}-${staffId}`;
    const updated: SupervisionScheduleData = {
      ...data,
      dayAssignments: data.dayAssignments.map(da => {
        if (rowType === 'supervisor') {
          const hasSup = da.staffAssignments.some(sa => sa.signatureToken === token || supervisorToken(da.day, sa.contextTypeId, sa.staffId) === token);
          if (!hasSup) return da;
          return {
            ...da,
            staffAssignments: da.staffAssignments.map(sa =>
              sa.signatureToken === token || supervisorToken(da.day, sa.contextTypeId, sa.staffId) === token
                ? { ...sa, signatureData, signatureStatus: 'signed' as const, signatureToken: token, signatureSignedAt: signedAt }
                : sa
            ),
          };
        } else {
          const dayTypeIds = Array.from(new Set(da.staffAssignments.map(item => item.contextTypeId).filter(Boolean)));
          const matches = da.followUpSupervisorId && dayTypeIds.some(typeId => followupToken(da.day, typeId, da.followUpSupervisorId!) === token);
          if (da.followUpSignatureToken !== token && !matches) return da;
          return { ...da, followUpSignatureData: signatureData, followUpSignatureStatus: 'signed' as const, followUpSignatureToken: token, followUpSignatureSignedAt: signedAt };
        }
      }),
    };
    localStorage.setItem('supervision_data_v1', JSON.stringify(updated));
  } catch { /* silent */ }
}

interface Props {
  token: string;
}

const SupervisionSignaturePage: React.FC<Props> = ({ token }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [notFound, setNotFound] = useState(false);
  const showLoader = useMinLoadingTime(!assignment && !notFound && !alreadySigned, 1500);

  useEffect(() => {
    try {
      // Read school name
      const appRaw = localStorage.getItem('school_assignment_v4');
      if (appRaw) {
        const appData = JSON.parse(appRaw);
        setSchoolName(appData?.schoolInfo?.schoolName || '');
      }
      // Read supervision data
      const raw = localStorage.getItem('supervision_data_v1');
      if (!raw) { setNotFound(true); return; }
      const data: SupervisionScheduleData = JSON.parse(raw);
      const info = findAssignment(data, token);
      if (!info) { setNotFound(true); return; }
      const staffList = [
        ...((JSON.parse(localStorage.getItem('school_assignment_v4') || '{}')?.teachers || []) as any[]).map(item => ({ ...item, staffType: 'teacher' })),
        ...((JSON.parse(localStorage.getItem('school_assignment_v4') || '{}')?.admins || []) as any[]).map(item => ({ ...item, staffType: 'admin' })),
      ];
      const staff = staffList.find(item => item.name === info.staffName && item.staffType === info.staffType);
      setAssignment({ ...info, phone: staff?.phone || staff?.phoneNumber || '' });
      // Check if already signed
      for (const da of data.dayAssignments) {
        if (info.rowType === 'supervisor') {
          const sa = da.staffAssignments.find(s => s.signatureToken === token || `supv-supervisor-${da.day}-${s.contextTypeId || 'all'}-${s.staffId}` === token);
          if (sa?.signatureStatus === 'signed') { setAlreadySigned(true); break; }
        } else {
          const dayTypeIds = Array.from(new Set(da.staffAssignments.map(s => s.contextTypeId).filter(Boolean)));
          const matches = da.followUpSupervisorId && dayTypeIds.some(typeId => `supv-followup-${da.day}-${typeId || 'all'}-${da.followUpSupervisorId}` === token);
          if ((da.followUpSignatureToken === token || matches) && da.followUpSignatureStatus === 'signed') {
            setAlreadySigned(true); break;
          }
        }
      }
    } catch { setNotFound(true); }
  }, [token]);

  const startDraw = (x: number, y: number) => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const r = c.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo((x - r.left) * (c.width / r.width), (y - r.top) * (c.height / r.height));
    setIsDrawing(true);
  };
  const continueDraw = (x: number, y: number) => {
    if (!isDrawing) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const r = c.getBoundingClientRect();
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#1e293b';
    ctx.lineTo((x - r.left) * (c.width / r.width), (y - r.top) * (c.height / r.height));
    ctx.stroke();
    setHasSignature(true);
  };
  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const c = canvasRef.current; if (!c) return;
    c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setHasSignature(false);
  };

  const handleConfirm = () => {
    const c = canvasRef.current; if (!c || !hasSignature || !assignment) return;
    const off = document.createElement('canvas'); off.width = 240; off.height = 80;
    const octx = off.getContext('2d'); if (octx) octx.drawImage(c, 0, 0, 240, 80);
    const sigData = off.toDataURL('image/png');
    saveSignatureToStorage(token, sigData, assignment.rowType);
    setConfirmed(true);
  };

  const effDate = assignment?.effectiveDate
    ? new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(assignment.effectiveDate))
    : '';

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={28} className="text-rose-500" />
          </div>
          <h2 className="text-lg font-black text-slate-800 mb-2">الرابط غير صالح</h2>
          <p className="text-sm text-slate-500 font-medium">لم يتم العثور على بيانات التكليف المرتبطة بهذا الرابط.</p>
        </div>
      </div>
    );
  }

  if (alreadySigned) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-emerald-600" />
          </div>
          <h2 className="text-lg font-black text-slate-800 mb-2">تم توقيعك مسبقاً</h2>
          <p className="text-sm text-slate-500 font-medium">لقد قمت بالتوقيع على هذا التكليف بالفعل، شاكرين حسن تعاونكم.</p>
        </div>
      </div>
    );
  }

  if (showLoader || !assignment) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <LoadingLogo size="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-[#e5e1fe]/30 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-[#655ac1] to-[#8779fb] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <PenLine size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-white leading-snug">نظام الإشراف الإلكتروني</h1>
              {schoolName && <p className="text-white/70 text-xs font-medium mt-0.5">{schoolName}</p>}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Assignment Details */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <h2 className="text-sm font-black text-slate-700 mb-4">تفاصيل التكليف</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">الاسم:</span>
                <span className="font-black text-slate-800">{assignment.staffName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">المهمة:</span>
                <span className="font-black text-[#655ac1]">
                  {assignment.rowType === 'supervisor' ? 'إشراف يومي' : 'مشرف متابع'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">اليوم:</span>
                <span className="font-black text-slate-800">{DAY_NAMES[assignment.day] || assignment.day}</span>
              </div>
              {assignment.rowType === 'supervisor' && assignment.locationNames.length > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">موقع الإشراف:</span>
                  <span className="font-black text-slate-800 text-right max-w-[55%]">
                    {assignment.locationNames.join(' و')}
                  </span>
                </div>
              )}
              {effDate && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500 font-medium">تاريخ البدء:</span>
                  <span className="font-black text-slate-800">{effDate}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <span className="block text-slate-500 font-medium text-xs mb-1">الصفة</span>
                <span className="font-black text-[#655ac1]">{assignment.staffType === 'teacher' ? 'معلم' : 'إداري'}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 sm:col-span-2">
                <span className="block text-slate-500 font-medium text-xs mb-1">رقم الجوال</span>
                <span className="font-black text-slate-800">{assignment.phone || 'غير مسجل'}</span>
              </div>
            </div>
            <h3 className="text-xs font-black text-slate-600 mb-2">موعد الإشراف</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#655ac1] text-white">
                    <th className="px-3 py-2 text-right">اليوم</th>
                    <th className="px-3 py-2 text-right">نوع الإشراف</th>
                  </tr>
                </thead>
                <tbody>
                  {assignment.scheduleRows.map((row, index) => (
                    <tr key={`${row.day}-${row.typeName}-${index}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-black text-slate-700">{DAY_NAMES[row.day] || row.day}</td>
                      <td className="px-3 py-2 font-bold text-slate-600">{row.typeName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm font-black text-slate-700 mt-4">
              تم العلم والاطلاع على جدول الإشراف المسند والتوقيع بالعلم.
            </p>
          </div>

          {/* Signature Pad */}
          {!confirmed ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-black text-slate-700 flex items-center gap-2 mb-1">
                  <PenLine size={15} className="text-[#655ac1]" /> التوقيع الإلكتروني
                </p>
                <p className="text-xs text-slate-400 font-medium">وقّع في المربع أدناه لتأكيد استلام التكليف</p>
              </div>
              <div className="relative border-2 border-dashed border-[#655ac1]/30 rounded-2xl overflow-hidden bg-slate-50" style={{ height: 160 }}>
                <canvas
                  ref={canvasRef} width={420} height={160}
                  className="w-full h-full touch-none cursor-crosshair"
                  onMouseDown={e => startDraw(e.clientX, e.clientY)}
                  onMouseMove={e => continueDraw(e.clientX, e.clientY)}
                  onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={e => { e.preventDefault(); if (e.touches[0]) startDraw(e.touches[0].clientX, e.touches[0].clientY); }}
                  onTouchMove={e => { e.preventDefault(); if (e.touches[0]) continueDraw(e.touches[0].clientX, e.touches[0].clientY); }}
                  onTouchEnd={stopDraw}
                />
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-slate-300 text-xs font-bold">وقّع هنا بالضغط والسحب</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={clearCanvas}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-colors"
                >
                  مسح التوقيع
                </button>
                <button
                  disabled={!hasSignature}
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-[#655ac1] hover:bg-[#5046a0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Check size={16} /> إرسال
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={30} className="text-emerald-600" />
              </div>
              <h3 className="text-lg font-black text-emerald-800 mb-2">تم استلام توقيعك بنجاح</h3>
              <p className="text-sm text-emerald-600 font-medium">شاكرين حسن تعاونكم</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupervisionSignaturePage;
