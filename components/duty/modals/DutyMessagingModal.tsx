import React, { useState, useMemo, useRef } from 'react';
import {
  X, Send, Copy, RefreshCw, Check, ChevronDown,
  Eye, PenLine, Link2, Hourglass, MessageSquare, Bell, AlertTriangle
} from 'lucide-react';
import { SchoolInfo, DutyScheduleData, Teacher, Admin } from '../../../types';
import {
  DAYS, DAY_NAMES, getTimingConfig,
  generateDutyAssignmentMessage, generateDutyReminderMessage
} from '../../../utils/dutyUtils';
import { useMessageArchive } from '../../messaging/MessageArchiveContext';

// ─── WhatsApp Icon ────────────────────────────────────────────────────────────
const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = 'electronic' | 'text' | 'reminder';

interface BaseRow {
  key: string;
  staffId: string;
  staffName: string;
  staffType: 'teacher' | 'admin';
  day: string;
  date: string;
  weekName: string;
  message: string;
}

interface ElectronicRow extends BaseRow {
  token: string;
  signLink: string;
  signatureData?: string;
  signatureStatus?: 'not-sent' | 'pending' | 'signed';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildToken(staffId: string, weekId: string, day: string): string {
  try { return btoa(`duty_${staffId}_${weekId}_${day}`); }
  catch { return `duty_${staffId}_${weekId}_${day}`; }
}

function buildSignLink(token: string): string {
  const base = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : '';
  return `${base}?dutySign=${encodeURIComponent(token)}`;
}

function buildElectronicMsg(
  staffName: string,
  staffType: 'teacher' | 'admin',
  day: string,
  dateFormatted: string,
  link: string
): string {
  const title = staffType === 'teacher' ? 'المعلم الفاضل' : 'الإداري الفاضل';
  const dayName = DAY_NAMES[day] || day;
  return `${title}، نشعركم بإسناد مهمة المناوبة اليومية في يوم ${dayName} الموافق ${dateFormatted}.\nالرجاء التوقيع عبر الرابط:\n${link}`;
}

function formatDate(dateStr: string, calType: 'hijri' | 'gregorian' = 'hijri'): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return calType === 'hijri'
      ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
      : new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  } catch { return dateStr; }
}

// ─── Bulk Confirm Dialog ──────────────────────────────────────────────────────
interface BulkConfirmProps {
  count: number;
  method: 'whatsapp' | 'sms';
  onConfirm: () => void;
  onCancel: () => void;
}
const BulkConfirmDialog: React.FC<BulkConfirmProps> = ({ count, method, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10002] flex items-center justify-center p-4" onClick={onCancel}>
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5" dir="rtl" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-3">
        <AlertTriangle size={22} className="text-amber-500 shrink-0" />
        <h3 className="text-base font-black text-slate-800">تأكيد الإرسال الجماعي</h3>
      </div>
      <p className="text-sm font-medium text-slate-600 leading-relaxed">
        سيتم إرسال <span className="font-black text-[#655ac1]">{count} رسالة</span> عبر{' '}
        <span className="font-black">{method === 'whatsapp' ? 'واتساب' : 'رسائل نصية'}</span>.
        {method === 'whatsapp' && (
          <span className="block text-xs text-slate-400 mt-1">سيتم فتح نافذة لكل مناوب تباعاً.</span>
        )}
      </p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-colors">إلغاء</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
          {method === 'whatsapp' ? <WhatsAppIcon size={15} /> : <Send size={14} />}
          إرسال
        </button>
      </div>
    </div>
  </div>
);

// ─── Signature Preview Modal ──────────────────────────────────────────────────
interface PreviewProps {
  row: ElectronicRow;
  schoolInfo: SchoolInfo;
  calendarType: 'hijri' | 'gregorian';
  onClose: () => void;
  onSigned: (weekId: string, day: string, staffId: string, sigData: string) => void;
}

const SignaturePreviewModal: React.FC<PreviewProps> = ({
  row, schoolInfo, calendarType, onClose, onSigned
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const startDraw = (x: number, y: number) => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const r = c.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo((x - r.left) * (c.width / r.width), (y - r.top) * (c.height / r.height));
    setIsDrawing(true);
  };
  const draw = (x: number, y: number) => {
    if (!isDrawing) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const r = c.getBoundingClientRect();
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#1e293b';
    ctx.lineTo((x - r.left) * (c.width / r.width), (y - r.top) * (c.height / r.height));
    ctx.stroke(); setHasSignature(true);
  };
  const stopDraw = () => setIsDrawing(false);
  const clearCanvas = () => {
    const c = canvasRef.current; if (!c) return;
    c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setHasSignature(false);
  };
  const handleConfirm = () => {
    const c = canvasRef.current; if (!c || !hasSignature) return;
    const off = document.createElement('canvas'); off.width = 240; off.height = 80;
    const octx = off.getContext('2d');
    if (octx) octx.drawImage(c, 0, 0, 240, 80);
    const sigData = off.toDataURL('image/png');
    setConfirmed(true);
    let weekId = 'all'; let day = row.day;
    try {
      const decoded = atob(row.token);
      const parts = decoded.split('_');
      if (parts.length >= 4) { weekId = parts[2]; day = parts[3]; }
    } catch { /* silent */ }
    setTimeout(() => { onSigned(weekId, day, row.staffId, sigData); onClose(); }, 1800);
  };

  const dayName = DAY_NAMES[row.day] || row.day;
  const dateStr = formatDate(row.date, calendarType);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10001] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="bg-[#655ac1] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <PenLine size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">معاينة صفحة التكليف</h2>
              <p className="text-xs text-white/70 mt-0.5">هذه الصفحة ستُرسل للمناوب عبر الرابط</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5 bg-slate-50 overflow-y-auto space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 bg-[#e5e1fe] rounded-2xl flex items-center justify-center">
                <PenLine size={22} className="text-[#655ac1]" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-sm">نظام المناوبة اليومية</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{schoolInfo.schoolName}</p>
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">الاسم:</span>
                <span className="font-black text-slate-800">{row.staffName}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">اليوم:</span>
                <span className="font-black text-[#655ac1]">{dayName}</span>
              </div>
              {dateStr && (
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">التاريخ:</span>
                  <span className="font-black text-slate-800">{dateStr}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500 font-medium">المهمة:</span>
                <span className="font-black text-slate-800">مناوبة يومية</span>
              </div>
            </div>
          </div>
          <div className="bg-[#f3f0ff] rounded-2xl p-4 text-sm text-[#4c3aaf] font-medium leading-relaxed whitespace-pre-wrap border border-[#c4b5fd]/40">
            {row.message}
          </div>
          {!confirmed ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="text-sm font-black text-slate-700 mb-1 flex items-center gap-2">
                <PenLine size={15} className="text-[#655ac1]" /> التوقيع الإلكتروني
              </p>
              <p className="text-xs text-slate-400 font-medium mb-3">يرجى التوقيع في المربع أدناه لتأكيد استلام التكليف</p>
              <div className="relative border-2 border-dashed border-[#655ac1]/30 rounded-2xl overflow-hidden bg-slate-50" style={{ height: 150 }}>
                <canvas
                  ref={canvasRef} width={420} height={150}
                  className="w-full h-full touch-none cursor-crosshair"
                  onMouseDown={e => startDraw(e.clientX, e.clientY)}
                  onMouseMove={e => draw(e.clientX, e.clientY)}
                  onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={e => { e.preventDefault(); if (e.touches[0]) startDraw(e.touches[0].clientX, e.touches[0].clientY); }}
                  onTouchMove={e => { e.preventDefault(); if (e.touches[0]) draw(e.touches[0].clientX, e.touches[0].clientY); }}
                  onTouchEnd={stopDraw}
                />
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-slate-300 text-xs font-bold">وقّع هنا بالضغط والسحب</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={clearCanvas} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-colors">مسح</button>
                <button
                  disabled={!hasSignature} onClick={handleConfirm}
                  className="flex-1 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Check size={16} /> اعتماد وإرسال
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-base font-black text-emerald-800">تم استلام توقيعك بنجاح</h3>
              <p className="text-sm text-emerald-600 font-medium mt-1">شاكرين حسن تعاونكم</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  isOpen: boolean;
  onClose: () => void;
  dutyData: DutyScheduleData;
  setDutyData: React.Dispatch<React.SetStateAction<DutyScheduleData>>;
  schoolInfo: SchoolInfo;
  teachers: Teacher[];
  admins: Admin[];
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const DutyMessagingModal: React.FC<Props> = ({
  isOpen, onClose, dutyData, setDutyData, schoolInfo, teachers, admins, showToast
}) => {
  const { sendMessage } = useMessageArchive();
  const [activeTab, setActiveTab] = useState<TabId>('electronic');
  const [filterWeek, setFilterWeek] = useState<string>('all');
  const [filterDay, setFilterDay] = useState<string>('all');
  const [masterTemplate, setMasterTemplate] = useState('');
  const [customMessages, setCustomMessages] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [includeReportLink, setIncludeReportLink] = useState(true);
  const [previewRow, setPreviewRow] = useState<ElectronicRow | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<{ method: 'whatsapp' | 'sms'; count: number } | null>(null);

  const calendarType = (schoolInfo.semesters?.find(s => s.isCurrent) || schoolInfo.semesters?.[0])?.calendarType || 'hijri';
  const timing = getTimingConfig(schoolInfo);
  const activeDays = timing.activeDays || DAYS.slice();

  const appBaseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : '';

  const weeks = useMemo(() => {
    if (dutyData.weekAssignments && dutyData.weekAssignments.length > 0) {
      return dutyData.weekAssignments;
    }
    return [{ weekId: 'all', weekName: 'الجدول الكامل', startDate: '', endDate: '', dayAssignments: dutyData.dayAssignments }];
  }, [dutyData]);

  const electronicRows = useMemo((): ElectronicRow[] => {
    const result: ElectronicRow[] = [];
    weeks.forEach(week => {
      if (filterWeek !== 'all' && week.weekId !== filterWeek) return;
      week.dayAssignments.forEach(da => {
        if (filterDay !== 'all' && da.day !== filterDay) return;
        if (da.isOfficialLeave || da.isRemoteWork) return;
        const dateFormatted = formatDate(da.date || '', calendarType);
        da.staffAssignments.forEach(sa => {
          const key = `elec-${week.weekId}-${da.day}-${sa.staffId}`;
          const token = sa.signatureToken || buildToken(sa.staffId, week.weekId, da.day);
          const signLink = buildSignLink(token);
          const baseMsg = buildElectronicMsg(sa.staffName, sa.staffType, da.day, dateFormatted, signLink);
          result.push({
            key, staffId: sa.staffId, staffName: sa.staffName, staffType: sa.staffType,
            day: da.day, date: da.date || '', weekName: week.weekName,
            message: customMessages[key] ?? baseMsg,
            token, signLink, signatureData: sa.signatureData, signatureStatus: sa.signatureStatus,
          });
        });
      });
    });
    return result;
  }, [weeks, filterWeek, filterDay, calendarType, customMessages]);

  const textRows = useMemo((): BaseRow[] => {
    const result: BaseRow[] = [];
    weeks.forEach(week => {
      if (filterWeek !== 'all' && week.weekId !== filterWeek) return;
      week.dayAssignments.forEach(da => {
        if (filterDay !== 'all' && da.day !== filterDay) return;
        if (da.isOfficialLeave || da.isRemoteWork) return;
        const dateFormatted = formatDate(da.date || '', calendarType);
        da.staffAssignments.forEach(sa => {
          const key = `text-${week.weekId}-${da.day}-${sa.staffId}`;
          const baseMsg = generateDutyAssignmentMessage(sa.staffName, sa.staffType, da.day, dateFormatted, schoolInfo.gender);
          result.push({ key, staffId: sa.staffId, staffName: sa.staffName, staffType: sa.staffType, day: da.day, date: da.date || '', weekName: week.weekName, message: customMessages[key] ?? baseMsg });
        });
      });
    });
    return result;
  }, [weeks, filterWeek, filterDay, calendarType, customMessages, schoolInfo.gender]);

  const reminderRows = useMemo((): BaseRow[] => {
    const result: BaseRow[] = [];
    weeks.forEach(week => {
      if (filterWeek !== 'all' && week.weekId !== filterWeek) return;
      week.dayAssignments.forEach(da => {
        if (filterDay !== 'all' && da.day !== filterDay) return;
        if (da.isOfficialLeave || da.isRemoteWork) return;
        const dateFormatted = formatDate(da.date || '', calendarType);
        da.staffAssignments.forEach(sa => {
          const key = `rem-${week.weekId}-${da.day}-${sa.staffId}`;
          const staffReportUrl = `${appBaseUrl}?staffId=${encodeURIComponent(sa.staffId)}&staffName=${encodeURIComponent(sa.staffName)}&day=${da.day}&date=${da.date || da.day}&school=${encodeURIComponent(schoolInfo.schoolName || '')}`;
          let baseMsg = generateDutyReminderMessage(sa.staffName, sa.staffType, da.day, dateFormatted, schoolInfo.gender);
          if (dutyData.settings.includeReportLinkInReminder ?? true) {
            baseMsg += `\n\n📋 *نموذج تقرير المناوبة اليومية:*\nيُرجى تعبئة النموذج بعد انتهاء المناوبة وإرساله من خلال الرابط التالي:\n${staffReportUrl}`;
          }
          result.push({ key, staffId: sa.staffId, staffName: sa.staffName, staffType: sa.staffType, day: da.day, date: da.date || '', weekName: week.weekName, message: customMessages[key] ?? baseMsg });
        });
      });
    });
    return result;
  }, [weeks, filterWeek, filterDay, calendarType, customMessages, schoolInfo.gender, schoolInfo.schoolName, dutyData.settings.includeReportLinkInReminder, appBaseUrl]);

  const activeRows: BaseRow[] = activeTab === 'electronic' ? electronicRows : activeTab === 'text' ? textRows : reminderRows;
  const allSelected = activeRows.length > 0 && activeRows.every(r => selectedIds.has(r.key));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(activeRows.map(r => r.key)));
  const toggleRow = (key: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const selectedCount = activeRows.filter(r => selectedIds.has(r.key)).length;

  const applyMaster = () => {
    if (!masterTemplate.trim()) return;
    const n = { ...customMessages };
    activeRows.forEach(r => { n[r.key] = masterTemplate; });
    setCustomMessages(n);
    showToast('تم اعتماد القالب', 'success');
  };
  const copyAll = () => { navigator.clipboard?.writeText(activeRows.map(r => r.message).join('\n\n────────\n\n')); showToast('تم نسخ جميع الرسائل', 'success'); };
  const resetAll = () => { setCustomMessages({}); setMasterTemplate(''); showToast('تمت استعادة القوالب', 'success'); };

  const getPhone = (staffId: string) =>
    ([...teachers, ...admins] as Array<{ id: string; phone?: string }>).find(s => s.id === staffId)?.phone;

  const sendWhatsApp = async (staffId: string, staffName: string, staffType: 'teacher'|'admin', msg: string) => {
    const p = getPhone(staffId);
    if (p) {
      await sendMessage({
        source: 'duty',
        recipientId: staffId,
        recipientName: staffName,
        recipientPhone: p,
        recipientRole: staffType,
        content: msg,
        channel: 'whatsapp',
      });
      window.open(`https://wa.me/${p.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    } else showToast('لم يُعثر على رقم الهاتف', 'warning');
  };
  const sendSMS = async (staffId: string, staffName: string, staffType: 'teacher'|'admin', msg: string) => {
    const p = getPhone(staffId);
    if (p) {
      await sendMessage({
        source: 'duty',
        recipientId: staffId,
        recipientName: staffName,
        recipientPhone: p,
        recipientRole: staffType,
        content: msg,
        channel: 'sms',
      });
      window.open(`sms:${p.replace(/\D/g, '')}?body=${encodeURIComponent(msg)}`, '_self');
    } else showToast('لم يُعثر على رقم الهاتف', 'warning');
  };

  const markPending = (eRow: ElectronicRow) => {
    setDutyData(prev => {
      const updateDAs = (das: typeof prev.dayAssignments) =>
        das.map(da => {
          if (da.day !== eRow.day) return da;
          return { ...da, staffAssignments: da.staffAssignments.map(sa => sa.staffId === eRow.staffId ? { ...sa, signatureStatus: 'pending' as const, signatureToken: eRow.token } : sa) };
        });
      return { ...prev, dayAssignments: updateDAs(prev.dayAssignments), weekAssignments: prev.weekAssignments?.map(wa => ({ ...wa, dayAssignments: updateDAs(wa.dayAssignments) })) };
    });
  };

  const handleSigned = (_weekId: string, day: string, staffId: string, sigData: string) => {
    setDutyData(prev => {
      const updateDAs = (das: typeof prev.dayAssignments) =>
        das.map(da => {
          if (da.day !== day) return da;
          return { ...da, staffAssignments: da.staffAssignments.map(sa => sa.staffId === staffId ? { ...sa, signatureData: sigData, signatureStatus: 'signed' as const } : sa) };
        });
      return { ...prev, dayAssignments: updateDAs(prev.dayAssignments), weekAssignments: prev.weekAssignments?.map(wa => ({ ...wa, dayAssignments: updateDAs(wa.dayAssignments) })) };
    });
    showToast('تم حفظ التوقيع بنجاح', 'success');
  };

  const sendOne = async (row: BaseRow, method: 'whatsapp' | 'sms') => {
    if (method === 'whatsapp') await sendWhatsApp(row.staffId, row.staffName, row.staffType, row.message);
    else await sendSMS(row.staffId, row.staffName, row.staffType, row.message);
    if (activeTab === 'electronic') markPending(row as ElectronicRow);
  };
  const sendBulk = (method: 'whatsapp' | 'sms') => {
    const targets = activeRows.filter(r => selectedIds.has(r.key));
    if (!targets.length) { showToast('لم يتم تحديد أي موظف', 'warning'); return; }
    setBulkConfirm({ method, count: targets.length });
  };

  const executeBulk = () => {
    if (!bulkConfirm) return;
    const { method } = bulkConfirm;
    const targets = activeRows.filter(r => selectedIds.has(r.key));
    targets.forEach(r => sendOne(r, method));
    showToast(`تم فتح ${targets.length} رسالة ${method === 'whatsapp' ? 'واتساب' : 'نصية'}`, 'success');
    setBulkConfirm(null);
  };

  const showWeekCol = filterWeek === 'all' && weeks.length > 1;
  const showDayCol = filterDay === 'all';

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#25D366]/10 rounded-2xl flex items-center justify-center shadow-sm">
                <WhatsAppIcon size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">إرسال إشعارات المناوبة</h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">تبليغ المناوبين بمهامهم عبر الواتساب أو الرسائل النصية</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={20} /></button>
          </div>

          {/* Tabs */}
          <div className="bg-white border-b border-slate-100 px-5 py-3 flex items-center gap-2 shrink-0 overflow-x-auto">
            {([
              { id: 'electronic' as TabId, label: 'إرسال التكليف إلكترونياً', sub: '(رسالة + رابط توقيع)', icon: <PenLine size={15} /> },
              { id: 'text' as TabId, label: 'إرسال التكليف نصيًا', sub: '', icon: <MessageSquare size={15} /> },
              { id: 'reminder' as TabId, label: 'إرسال التذكير اليومي', sub: '', icon: <Bell size={15} /> },
            ] as const).map((tab, i) => (
              <React.Fragment key={tab.id}>
                {i > 0 && <div className="w-px h-7 bg-slate-200 rounded-full shrink-0" />}
                <button
                  onClick={() => { setActiveTab(tab.id); setCustomMessages({}); setMasterTemplate(''); setSelectedIds(new Set()); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-2 shrink-0 ${activeTab === tab.id ? 'bg-white text-[#655ac1] border-[#655ac1] shadow-sm scale-[1.02]' : 'bg-white text-slate-500 border-slate-200 hover:border-[#655ac1]/40 hover:text-slate-700'}`}
                >
                  {tab.icon} {tab.label}
                  {tab.sub && <span className="text-[10px] font-medium opacity-60">{tab.sub}</span>}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Electronic banner */}
          {activeTab === 'electronic' && (
            <div className="bg-[#655ac1]/5 border-b border-[#655ac1]/10 px-5 py-3 flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 bg-[#e5e1fe] rounded-lg flex items-center justify-center shrink-0">
                <Link2 size={14} className="text-[#655ac1]" />
              </div>
              <p className="text-xs font-bold text-[#655ac1] flex-1">
                سيتم توليد رابط فريد لكل مناوب — يمكن للمناوب التوقيع عبر الرابط ويُحدَث عمود التوقيع في الجدول تلقائياً.
              </p>
              {electronicRows.length > 0 && (
                <button onClick={() => setPreviewRow(electronicRows[0])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#655ac1] text-white text-xs font-bold hover:bg-[#5046a0] shrink-0">
                  <Eye size={13} /> معاينة صفحة التوقيع
                </button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Controls */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-2 mr-auto">
                  <button onClick={copyAll} disabled={activeRows.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold disabled:opacity-40"><Copy size={13} /> نسخ الكل</button>
                  <button onClick={resetAll} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-500 text-xs font-bold"><RefreshCw size={13} /></button>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">قالب موحد — اكتب رسالة وطبّقها على جميع الصفوف الظاهرة</label>
                  <textarea value={masterTemplate} onChange={e => setMasterTemplate(e.target.value)} placeholder="اكتب النص واضغط (اعتماد للكل)..." rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:ring-2 focus:ring-[#655ac1]/20 focus:border-[#655ac1] outline-none resize-none leading-relaxed" />
                </div>
                <button onClick={applyMaster} disabled={!masterTemplate.trim()} className="mt-6 flex items-center gap-2 bg-[#655ac1] hover:bg-[#4e44a6] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                  <Check size={15} /> اعتماد للكل
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <span className="text-sm font-black text-slate-700">
                  {activeRows.length > 0 ? `${activeRows.length} موظف${selectedCount > 0 ? ` • ${selectedCount} محدد` : ''}` : 'لا يوجد بيانات للفلتر المحدد'}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => sendBulk('whatsapp')} disabled={selectedCount === 0} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] text-xs font-bold border border-[#25D366]/20 disabled:opacity-40">
                    <WhatsAppIcon size={14} /> واتساب للكل {selectedCount > 0 && `(${selectedCount})`}
                  </button>
                  <button onClick={() => sendBulk('sms')} disabled={selectedCount === 0} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] text-xs font-bold border border-[#007AFF]/20 disabled:opacity-40">
                    <Send size={13} /> نصية للكل {selectedCount > 0 && `(${selectedCount})`}
                  </button>
                </div>
              </div>

              {/* Filter bar */}
              <div className="px-5 py-3 border-b border-[#655ac1]/10 bg-[#f3f0ff]/40 flex flex-wrap items-center gap-3">
                <span className="text-xs font-black text-[#655ac1]">تصفية:</span>
                <div className="relative">
                  <select value={filterWeek} onChange={e => { setFilterWeek(e.target.value); setSelectedIds(new Set()); }}
                    className="appearance-none pl-9 pr-4 py-2 rounded-xl border-2 border-[#655ac1]/30 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1] outline-none bg-white cursor-pointer shadow-sm hover:border-[#655ac1] transition-colors min-w-[150px]">
                    <option value="all">📅 كل الأسابيع</option>
                    {weeks.map(w => <option key={w.weekId} value={w.weekId}>{w.weekName}{w.startDate ? ` (${formatDate(w.startDate, calendarType)})` : ''}</option>)}
                  </select>
                  <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#655ac1] pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={filterDay} onChange={e => { setFilterDay(e.target.value); setSelectedIds(new Set()); }}
                    className="appearance-none pl-9 pr-4 py-2 rounded-xl border-2 border-[#655ac1]/30 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1] outline-none bg-white cursor-pointer shadow-sm hover:border-[#655ac1] transition-colors min-w-[150px]">
                    <option value="all">📅 كل الأيام</option>
                    {activeDays.map(day => <option key={day} value={day}>{DAY_NAMES[day]}</option>)}
                  </select>
                  <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#655ac1] pointer-events-none" />
                </div>
              </div>

              {activeRows.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-3"><WhatsAppIcon size={32} /></div>
                  <p className="font-bold text-slate-500">لا يوجد مناوبون للفلتر المحدد</p>
                  <p className="text-sm mt-1">يُرجى إعداد جدول المناوبة أولاً أو تغيير الفلتر</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-3 w-10">
                          <button onClick={toggleAll} className={`w-5 h-5 rounded flex items-center justify-center border ${allSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 hover:border-[#655ac1]'}`}>
                            {allSelected && <Check size={11} />}
                          </button>
                        </th>
                        <th className="px-3 py-3 font-black text-slate-500 text-xs w-10">م</th>
                        <th className="px-3 py-3 font-black text-slate-700 text-xs min-w-[130px]">المناوب</th>
                        <th className="px-3 py-3 font-black text-slate-700 text-xs text-center w-16">الصفة</th>
                        {showWeekCol && <th className="px-3 py-3 font-black text-slate-700 text-xs text-center w-24">الأسبوع</th>}
                        {showDayCol && <th className="px-3 py-3 font-black text-slate-700 text-xs text-center w-20">اليوم</th>}
                        <th className="px-3 py-3 font-black text-slate-700 text-xs text-center w-28">التاريخ</th>
                        <th className="px-3 py-3 font-black text-slate-700 text-xs">الرسالة</th>
                        <th className="px-3 py-3 font-black text-slate-700 text-xs text-center w-28">الإجراءات</th>
                        {activeTab === 'electronic' && <th className="px-3 py-3 font-black text-slate-700 text-xs text-center w-28">حالة التوقيع</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activeRows.map((row, idx) => {
                        const checked = selectedIds.has(row.key);
                        const eRow = activeTab === 'electronic' ? row as ElectronicRow : null;
                        return (
                          <tr key={row.key} className={`hover:bg-slate-50/60 transition-colors align-top ${checked ? 'bg-[#f3f0ff]/60' : ''}`}>
                            <td className="px-4 pt-3">
                              <button onClick={() => toggleRow(row.key)} className={`w-5 h-5 rounded flex items-center justify-center border ${checked ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 hover:border-[#655ac1]'}`}>
                                {checked && <Check size={11} />}
                              </button>
                            </td>
                            <td className="px-3 pt-3 text-slate-400 font-bold text-xs text-center">{idx + 1}</td>
                            <td className="px-3 pt-3"><span className="font-bold text-slate-800 text-sm block">{row.staffName}</span></td>
                            <td className="px-3 pt-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${row.staffType === 'teacher' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-[#e5e1fe] text-[#655ac1] border-[#655ac1]/20'}`}>
                                {row.staffType === 'teacher' ? 'معلم' : 'إداري'}
                              </span>
                            </td>
                            {showWeekCol && <td className="px-3 pt-3 text-center"><span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg whitespace-nowrap">{row.weekName}</span></td>}
                            {showDayCol && <td className="px-3 pt-3 text-center"><span className="text-[10px] font-bold text-[#655ac1] bg-[#e5e1fe] px-2 py-0.5 rounded-lg">{DAY_NAMES[row.day]}</span></td>}
                            <td className="px-3 pt-3 text-center"><span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg whitespace-nowrap">{formatDate(row.date, calendarType) || '—'}</span></td>
                            <td className="px-3 py-2">
                              <textarea value={row.message} onChange={e => setCustomMessages(prev => ({ ...prev, [row.key]: e.target.value }))} rows={3}
                                className="w-full text-xs font-medium text-slate-600 leading-relaxed bg-slate-50 border border-transparent hover:border-slate-200 focus:border-[#655ac1]/30 focus:ring-1 focus:ring-[#655ac1]/10 focus:bg-white rounded-lg px-2 py-1.5 outline-none resize-y min-h-[52px] max-h-[120px] transition-all" />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <button onClick={() => sendOne(row, 'whatsapp')} title="واتساب" className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 active:scale-90"><WhatsAppIcon size={15} /></button>
                                <button onClick={() => sendOne(row, 'sms')} title="رسالة نصية" className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#007AFF]/10 hover:bg-[#007AFF]/25 border border-[#007AFF]/20 active:scale-90"><Send size={13} className="text-[#007AFF]" /></button>
                                <button onClick={() => { navigator.clipboard?.writeText(row.message); showToast('تم نسخ الرسالة', 'success'); }} title="نسخ" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Copy size={14} /></button>
                                {eRow && <button onClick={() => setPreviewRow(eRow)} title="معاينة صفحة التوقيع" className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#655ac1]/10 hover:bg-[#655ac1]/20 text-[#655ac1] active:scale-90"><Eye size={14} /></button>}
                              </div>
                            </td>
                            {activeTab === 'electronic' && eRow && (
                              <td className="px-3 py-3 text-center">
                                {eRow.signatureData ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <img src={eRow.signatureData} alt="توقيع" className="h-8 max-w-[70px] object-contain border border-emerald-200 rounded bg-white" />
                                    <span className="text-[9px] text-emerald-600 font-bold">✅ موقّع</span>
                                  </div>
                                ) : eRow.signatureStatus === 'pending' ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center animate-pulse border border-amber-200"><Hourglass size={14} className="text-amber-500" /></div>
                                    <span className="text-[9px] text-amber-600 font-bold">بانتظار التوقيع</span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-slate-300 font-bold">لم يُرسل</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {previewRow && (
        <SignaturePreviewModal
          row={previewRow}
          schoolInfo={schoolInfo}
          calendarType={calendarType}
          onClose={() => setPreviewRow(null)}
          onSigned={handleSigned}
        />
      )}
      {bulkConfirm && (
        <BulkConfirmDialog
          count={bulkConfirm.count}
          method={bulkConfirm.method}
          onConfirm={executeBulk}
          onCancel={() => setBulkConfirm(null)}
        />
      )}
    </>
  );
};

export default DutyMessagingModal;

