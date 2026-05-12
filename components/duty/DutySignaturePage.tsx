import React, { useRef, useState, useEffect } from 'react';
import { Check, PenLine, X } from 'lucide-react';
import { DutyScheduleData } from '../../types';
import { DAY_NAMES } from '../../utils/dutyUtils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AssignmentInfo {
  staffName: string;
  staffType: 'teacher' | 'admin';
  day: string;
  date?: string;
  weekName?: string;
  token: string;
}

interface AssignmentGroupInfo {
  staffName: string;
  staffType: 'teacher' | 'admin';
  assignments: AssignmentInfo[];
  tokens: string[];
}

// ─── Find assignment by token ─────────────────────────────────────────────────
function findDutyAssignment(data: DutyScheduleData, token: string): AssignmentInfo | null {
  // Search current day assignments
  for (const da of data.dayAssignments) {
    for (const sa of da.staffAssignments) {
      if (sa.signatureToken === token) {
        return {
          staffName: sa.staffName,
          staffType: sa.staffType,
          day: da.day,
          date: da.date,
          weekName: undefined,
          token,
        };
      }
    }
  }
  // Search week assignments
  if (data.weekAssignments) {
    for (const wa of data.weekAssignments) {
      for (const da of wa.dayAssignments) {
        for (const sa of da.staffAssignments) {
          if (sa.signatureToken === token) {
            return {
              staffName: sa.staffName,
              staffType: sa.staffType,
              day: da.day,
              date: da.date,
              weekName: wa.weekName,
              token,
            };
          }
        }
      }
    }
  }
  return null;
}

function findDutyAssignments(data: DutyScheduleData, tokens: string[]): AssignmentGroupInfo | null {
  const assignments = tokens
    .map(token => findDutyAssignment(data, token))
    .filter((item): item is AssignmentInfo => Boolean(item));
  if (assignments.length === 0) return null;
  const first = assignments[0];
  return {
    staffName: first.staffName,
    staffType: first.staffType,
    assignments,
    tokens: assignments.map(item => item.token),
  };
}

// ─── Save signature to localStorage ──────────────────────────────────────────
function saveSignatureToStorage(tokens: string[], signatureData: string): void {
  try {
    const raw = localStorage.getItem('duty_data_v1');
    if (!raw) return;
    const data: DutyScheduleData = JSON.parse(raw);
    const signedAt = new Date().toISOString();

    const updateDAs = (das: DutyScheduleData['dayAssignments']) =>
      das.map(da => {
        const hasSig = da.staffAssignments.some(sa => sa.signatureToken && tokens.includes(sa.signatureToken));
        if (!hasSig) return da;
        return {
          ...da,
          staffAssignments: da.staffAssignments.map(sa =>
            sa.signatureToken && tokens.includes(sa.signatureToken)
              ? { ...sa, signatureData, signatureStatus: 'signed' as const, signatureSignedAt: signedAt }
              : sa
          ),
        };
      });

    const updated: DutyScheduleData = {
      ...data,
      dayAssignments: updateDAs(data.dayAssignments),
      weekAssignments: data.weekAssignments?.map(wa => ({
        ...wa,
        dayAssignments: updateDAs(wa.dayAssignments),
      })),
    };

    localStorage.setItem('duty_data_v1', JSON.stringify(updated));
  } catch { /* silent */ }
}

// ─── Check already signed ─────────────────────────────────────────────────────
function isAlreadySigned(data: DutyScheduleData, tokens: string[]): boolean {
  return tokens.every(token => {
    for (const da of data.dayAssignments) {
      const sa = da.staffAssignments.find(s => s.signatureToken === token);
      if (sa?.signatureStatus === 'signed') return true;
    }
    if (data.weekAssignments) {
      for (const wa of data.weekAssignments) {
        for (const da of wa.dayAssignments) {
          const sa = da.staffAssignments.find(s => s.signatureToken === token);
          if (sa?.signatureStatus === 'signed') return true;
        }
      }
    }
    return false;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  token: string;
}

const DutySignaturePage: React.FC<Props> = ({ token }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [assignmentGroup, setAssignmentGroup] = useState<AssignmentGroupInfo | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    try {
      // Read school name
      const appRaw = localStorage.getItem('school_assignment_v4');
      if (appRaw) {
        const appData = JSON.parse(appRaw);
        setSchoolName(appData?.schoolInfo?.schoolName || '');
      }
      // Read duty data
      const raw = localStorage.getItem('duty_data_v1');
      if (!raw) { setNotFound(true); return; }
      const data: DutyScheduleData = JSON.parse(raw);
      const tokens = token.split(',').map(item => item.trim()).filter(Boolean);
      const info = findDutyAssignments(data, tokens.length ? tokens : [token]);
      if (!info) { setNotFound(true); return; }
      setAssignmentGroup(info);
      if (isAlreadySigned(data, info.tokens)) setAlreadySigned(true);
    } catch { setNotFound(true); }
  }, [token]);

  // ─── Canvas drawing helpers ──────────────────────────────────────────────────
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
    const c = canvasRef.current; if (!c || !hasSignature || !assignmentGroup) return;
    const off = document.createElement('canvas'); off.width = 240; off.height = 80;
    const octx = off.getContext('2d'); if (octx) octx.drawImage(c, 0, 0, 240, 80);
    const sigData = off.toDataURL('image/png');
    saveSignatureToStorage(assignmentGroup.tokens, sigData);
    setConfirmed(true);
  };

  // ─── Format date ─────────────────────────────────────────────────────────────
  const formatHijriDate = (date?: string) => {
    if (!date) return '';
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: 'numeric', month: 'long', year: 'numeric'
      }).format(new Date(date));
    } catch { return date; }
  };

  // ─── Not found state ─────────────────────────────────────────────────────────
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

  // ─── Already signed state ────────────────────────────────────────────────────
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

  // ─── Loading state ────────────────────────────────────────────────────────────
  if (!assignmentGroup) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#655ac1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Main page ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-[#e5e1fe]/30 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-[#655ac1] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <PenLine size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-white leading-snug">نظام المناوبة اليومية</h1>
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
                <span className="font-black text-slate-800">{assignmentGroup.staffName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">المهمة:</span>
                <span className="font-black text-[#655ac1]">مناوبة يومية</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">اليوم:</span>
                <span className="font-black text-slate-800">{assignmentGroup.assignments.length} مناوبة</span>
              </div>
              <div className="pt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#655ac1]">
                      <th className="py-2 text-right font-black">اليوم</th>
                      <th className="py-2 text-right font-black">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentGroup.assignments.map(item => (
                      <tr key={item.token} className="border-t border-slate-100">
                        <td className="py-2 font-black text-slate-800">{DAY_NAMES[item.day] || item.day}</td>
                        <td className="py-2 font-bold text-slate-600">{formatHijriDate(item.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Assignment description */}
          <div className="bg-[#f3f0ff] rounded-2xl p-4 text-sm text-[#4c3aaf] font-medium leading-relaxed border border-[#c4b5fd]/40">
            {`إسناد مهمة المناوبة اليومية حسب الجدول الموضح أعلاه.\nيُرجى التوقيع أدناه لتأكيد استلام التكليف.`}
          </div>

          {/* Signature or Confirmed */}
          {!confirmed ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-black text-slate-700 flex items-center gap-2 mb-1">
                  <PenLine size={15} className="text-[#655ac1]" /> التوقيع الإلكتروني
                </p>
                <p className="text-xs text-slate-400 font-medium">وقّع في المربع أدناه لتأكيد استلام التكليف</p>
              </div>
              <div
                className="relative border-2 border-dashed border-[#655ac1]/30 rounded-2xl overflow-hidden bg-slate-50"
                style={{ height: 160 }}
              >
                <canvas
                  ref={canvasRef}
                  width={420}
                  height={160}
                  className="w-full h-full touch-none cursor-crosshair"
                  onMouseDown={e => startDraw(e.clientX, e.clientY)}
                  onMouseMove={e => continueDraw(e.clientX, e.clientY)}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
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
                  مسح
                </button>
                <button
                  disabled={!hasSignature}
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-[#655ac1] hover:bg-[#5046a0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Check size={16} /> اعتماد وإرسال
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

export default DutySignaturePage;
