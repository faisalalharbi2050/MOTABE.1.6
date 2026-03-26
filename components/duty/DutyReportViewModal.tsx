import React from 'react';
import {
  X, Shield, Clock, AlertTriangle, Printer, CheckCircle,
  AlertCircle, FileText, FileDown
} from 'lucide-react';
import { DutyReportRecord, SchoolInfo } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  report: DutyReportRecord | null;
  staffName: string;
  day: string;
  date: string;
  schoolInfo: SchoolInfo;
}

const DAY_NAMES_AR: Record<string, string> = {
  sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت'
};

const toHijri = (dateStr: string) => {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(d);
  } catch { return ''; }
};

const toGregorian = (dateStr: string) => {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    return new Intl.DateTimeFormat('ar-SA', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(d);
  } catch { return dateStr; }
};

/** CSS shared between filled and blank print output */
const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Tajawal', sans-serif;
    direction: rtl; background: #fff; color: #1e293b;
    font-size: 11px; padding: 8px 16px;
  }
  .page-header {
    display: grid; grid-template-columns: 1fr 120px 1fr;
    align-items: start; gap: 8px;
    background: #ffffff;
    border-bottom: 2px solid #1e293b;
    padding: 10px 4px 12px; margin-bottom: 8px;
    overflow: visible;
  }
  .col-right { text-align: right; }
  .col-left  { text-align: left; }
  .col-center { text-align: center; }
  .emblem {
    width: 48px; height: 48px; background: #e5e1fe;
    border-radius: 50%; border: 2px solid rgba(101,90,193,0.2);
    margin: 0 auto 3px;
    display: flex; align-items: center; justify-content: center; font-size: 20px;
  }
  .form-title { font-size: 12px; font-weight: 900; color: #1e293b; }
  .badge-box { margin-top: 2px; }
  .lbl { font-size: 9px; color: #64748b; font-weight: 600; }
  .val { font-size: 10.5px; color: #1e293b; font-weight: 700; }
  .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: 1px 5px; align-items: baseline; }
  .sup-bar {
    display: flex; align-items: center; gap: 7px;
    background: #f5f3ff; border: 1px solid #ddd6fe;
    border-radius: 7px; padding: 4px 11px; margin-bottom: 6px;
  }
  .sup-name { font-weight: 900; color: #5b21b6; font-size: 12px; }
  .sec-title {
    font-size: 11.5px; font-weight: 900; color: #fff;
    padding: 4px 11px; display: flex; align-items: center; gap: 4px;
    border-radius: 5px 5px 0 0;
  }
  .sec-late       { background: #655ac1; }
  .sec-violations { background: #7c6ff0; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 6px; }
  thead tr { background: #ede9ff; }
  tbody tr:nth-child(even) { background: #f8f7ff; }
  td, th { border: 1px solid #d1d5db; padding: 3px 5px; text-align: center; }
  th { font-weight: 700; color: #4c1d95; font-size: 10px; }
  /* blank-mode: gray style matching the weekly schedule preview */
  .blank-mode .sec-late, .blank-mode .sec-violations { background: #e2e8f0 !important; color: #334155 !important; }
  .blank-mode thead tr { background: #f1f5f9 !important; }
  .blank-mode thead th { color: #334155 !important; }
  .blank-mode tbody tr:nth-child(even) { background: #f8fafc !important; }
  td.num { width: 20px; color: #64748b; font-weight: bold; }
  td.txt { text-align: right; }
  tr.empty-row td { height: 20px; }
  .footer-notice {
    text-align: center; font-size: 10px; font-weight: 700; color: #5b21b6;
    background: #f5f3ff; border: 1px solid #ddd6fe;
    border-radius: 5px; padding: 4px 10px;
    margin: 5px 0 7px;
  }
  .sign-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }
  .sign-box { text-align: center; }
  .sign-label { font-size: 9.5px; color: #64748b; font-weight: 600; margin-bottom: 3px; }
  .sign-name  { font-size: 10.5px; font-weight: 700; color: #1e293b; margin-top: 2px; }
  .sign-line  { width: 100%; max-width: 190px; height: 50px; border-bottom: 1.5px solid #334155; margin: 0 auto; }
  @media print {
    body { padding: 4px 10px; }
    @page { margin: 9mm; size: A4 portrait; }
  }
`;

/** Opens a print window with a compact, single-page form
 *  blank=true → empty form for manual filling; blank=false → filled with submitted data */
export const printDutyReport = (
  report: DutyReportRecord | null,
  staffName: string,
  day: string,
  date: string,
  schoolInfo: SchoolInfo,
  blank = false
) => {
  const hijriDate    = blank ? '......................' : toHijri(date);
  const gregDate     = blank ? '......................' : toGregorian(date);
  const dayName      = blank ? '......................' : (DAY_NAMES_AR[day] || day);
  const schoolName   = schoolInfo.schoolName || '—';
  const academicYear = schoolInfo.academicYear || '—';
  const currentSem   = schoolInfo.semesters?.find(s => s.isCurrent);
  const semesterName = currentSem?.name || '—';
  const principal    = schoolInfo.principal || '';
  const eduAdmin     = schoolInfo.educationAdministration
    || (schoolInfo.region ? `الإدارة العامة للتعليم بمنطقة ${schoolInfo.region}` : '');

  const E = 6; // empty row count
  const usedLate = (!blank && report?.lateStudents?.length) ? report.lateStudents : null;
  const usedViol = (!blank && report?.violatingStudents?.length) ? report.violatingStudents : null;

  const lateRows = usedLate
    ? usedLate.map((s, i) => `<tr><td class="num">${i+1}</td><td class="txt">${s.studentName}</td><td>${s.gradeAndClass}</td><td>${s.exitTime||'—'}</td><td class="txt">${s.actionTaken||'—'}</td><td class="txt">${s.notes||'—'}</td></tr>`).join('')
    : Array(E).fill(null).map((_, i) => `<tr class="empty-row"><td class="num">${i+1}</td><td></td><td></td><td></td><td></td><td></td></tr>`).join('');

  const violRows = usedViol
    ? usedViol.map((s, i) => `<tr><td class="num">${i+1}</td><td class="txt">${s.studentName}</td><td>${s.gradeAndClass}</td><td class="txt">${s.violationType||'—'}</td><td class="txt">${s.actionTaken||'—'}</td><td class="txt">${s.notes||'—'}</td></tr>`).join('')
    : Array(E).fill(null).map((_, i) => `<tr class="empty-row"><td class="num">${i+1}</td><td></td><td></td><td></td><td></td><td></td></tr>`).join('');

  const signHtml = (!blank && report?.signature)
    ? `<img src="${report.signature}" style="max-height:50px;border:1px solid #ccc;border-radius:5px;padding:2px;" />`
    : `<div class="sign-line"></div>`;

  const badge = (!blank && report?.isSubmitted)
    ? `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:9999px;font-size:9px;font-weight:bold;border:1px solid #bbf7d0;">✔ مُسلَّم إلكترونياً</span>`
    : ``;

  const raisedAt = (!blank && report?.submittedAt)
    ? `<span style="margin-right:auto;font-size:8.5px;color:#64748b;">رُفع: ${new Date(report.submittedAt).toLocaleString('ar-SA')}</span>` : '';

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8" />
<title>نموذج تقرير المناوبة اليومية – ${staffName}</title>
<style>${PRINT_CSS}</style>
</head>
<body${blank ? ' class="blank-mode"' : ''}>
<div class="page-header">
  <div class="col-right">
    <p class="lbl">المملكة العربية السعودية</p>
    <p class="lbl">وزارة التعليم</p>
    ${eduAdmin ? `<p class="val" style="color:#655ac1;margin-top:1px">${eduAdmin}</p>` : ''}
    <p class="val" style="font-size:11.5px;margin-top:1px">${schoolName}</p>
  </div>
  <div class="col-center">
    <div class="emblem">🛡️</div>
    <p class="form-title">نموذج تقرير المناوبة اليومية</p>
    <div class="badge-box">${badge}</div>
  </div>
  <div class="col-left">
    <div class="meta-grid">
      <span class="lbl">العام الدراسي:</span> <span class="val">${academicYear}</span>
      <span class="lbl">الفصل الدراسي:</span> <span class="val">${semesterName}</span>
      <span class="lbl">اليوم:</span>          <span class="val">${dayName}</span>
      <span class="lbl">التاريخ الهجري:</span> <span class="val">${hijriDate}</span>
      <span class="lbl">التاريخ الميلادي:</span><span class="val">${gregDate}</span>
    </div>
  </div>
</div>
${!blank ? `<div class="sup-bar">
  <span class="lbl">المناوب:</span>
  <span class="sup-name">${staffName}</span>
  ${raisedAt}
</div>` : ''}
<div class="sec-title sec-late">⏱ الطلاب المتأخرون</div>
<table>
  <thead><tr>
    <th style="width:20px">م</th><th>اسم الطالب</th>
    <th style="width:65px">الصف / الفصل</th>
    <th style="width:58px">وقت الخروج</th>
    <th>الإجراء المتخذ</th>
    <th style="width:72px">ملاحظات</th>
  </tr></thead>
  <tbody>${lateRows}</tbody>
</table>
<div class="sec-title sec-violations">⚠ الطلاب المخالفون سلوكياً</div>
<table>
  <thead><tr>
    <th style="width:20px">م</th><th>اسم الطالب</th>
    <th style="width:65px">الصف / الفصل</th>
    <th>نوع المخالفة</th>
    <th>الإجراء المتخذ</th>
    <th style="width:72px">ملاحظات</th>
  </tr></thead>
  <tbody>${violRows}</tbody>
</table>
${blank ? `
<div class="sign-row">
  <div class="sign-box" style="text-align:right;display:flex;flex-direction:column;justify-content:flex-end;padding-right:8px;">
    <p style="font-size:10.5px;font-weight:700;color:#475569;white-space:nowrap;">
      يُسلَّم هذا النموذج في اليوم التالي لوكيل الشؤون التعليمية
    </p>
  </div>
  <div class="sign-box">
    <p class="sign-label">مدير المدرسة وتوقيعه</p>
    <div class="sign-line"></div>
    ${principal ? `<p class="sign-name">${principal}</p>` : ''}
  </div>
</div>
` : `
<div class="footer-notice">⚠ يُسلَّم تقرير المناوبة لوكيل الشؤون التعليمية في اليوم التالي</div>
<div class="sign-row">
  <div class="sign-box">
    <p class="sign-label">توقيع المناوب</p>
    ${signHtml}
    <p class="sign-name">${staffName}</p>
  </div>
  <div class="sign-box">
    <p class="sign-label">اعتماد مدير المدرسة وتوقيعه</p>
    <div class="sign-line"></div>
    ${principal ? `<p class="sign-name">${principal}</p>` : ''}
  </div>
</div>
`}
</body></html>`;

  const win = window.open('', '_blank', 'width=960,height=720');
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 600); }
};

// ─── Modal component ────────────────────────────────────────────────────────
const DutyReportViewModal: React.FC<Props> = ({
  isOpen, onClose, report, staffName, day, date, schoolInfo
}) => {
  if (!isOpen) return null;

  const hijriDate    = toHijri(date);
  const gregDate     = toGregorian(date);
  const dayName      = DAY_NAMES_AR[day] || day;
  const hasReport    = report?.isSubmitted;
  const isElectronic = hasReport && !report?.manuallySubmitted;
  const lateCount    = report?.lateStudents?.filter(s => s.studentName.trim()).length || 0;
  const violCount    = report?.violatingStudents?.filter(s => s.studentName.trim()).length || 0;
  const eduAdmin     = schoolInfo.educationAdministration
    || (schoolInfo.region ? `الإدارة العامة للتعليم بمنطقة ${schoolInfo.region}` : '');
  const principal    = schoolInfo.principal || '';

  const cell  = 'border border-slate-200 p-1.5 text-[10.5px] text-right align-top';
  const hcell = (_bg?: string) => `border border-slate-200 p-1.5 text-[10px] font-black text-center text-white`;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Modal header bar ── */}
        <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#e5e1fe] rounded-2xl flex items-center justify-center shadow-sm shrink-0">
              <FileText size={20} className="text-[#655ac1]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">معاينة وطباعة نموذج تقرير المناوبة اليومية</h2>
              <p className="text-[11px] font-medium text-slate-500">
                {staffName} · {dayName} · {hijriDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isElectronic && (
              <button
                onClick={() => printDutyReport(report, staffName, day, date, schoolInfo, false)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#655ac1] hover:bg-[#4e44a6] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <Printer size={13} />
                طباعة التقرير
              </button>
            )}
            <button
              onClick={() => printDutyReport(null, staffName, day, date, schoolInfo, true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 active:scale-95"
            >
              <FileDown size={13} />
              طباعة فارغ
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4" dir="rtl">

          {/* ── Not submitted state — show blank form ── */}
          {!hasReport && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl border bg-slate-100 border-slate-200 text-slate-600">
              <AlertCircle size={18} className="text-slate-400 shrink-0" />
              <div>
                <p className="font-black text-sm">لم يتم رفع التقرير بعد</p>
                <p className="text-xs font-medium mt-0.5 text-slate-500">
                  سيظهر التقرير هنا بعد أن يُعبّئه المناوب عبر الرابط المُرسل إليه
                </p>
              </div>
            </div>
          )}

          {/* ── Submitted status banner ── */}
          {hasReport && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border mb-4 ${
              report?.manuallySubmitted
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <CheckCircle size={18} className={report?.manuallySubmitted ? 'text-amber-600' : 'text-emerald-600'} />
              <div>
                <p className="font-black text-sm">
                  {report?.manuallySubmitted ? 'تم التسليم ورقياً' : 'تم رفع التقرير إلكترونياً'}
                </p>
                {report?.submittedAt && (
                  <p className="text-xs font-medium mt-0.5 opacity-70">
                    {new Date(report.submittedAt).toLocaleString('ar-SA')}
                  </p>
                )}
              </div>
              {isElectronic && (
                <div className="mr-auto flex gap-2 text-xs font-bold flex-wrap">
                  <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <Clock size={10} className="inline ml-1" />متأخرون: {lateCount}
                  </span>
                  <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200">
                    <AlertTriangle size={10} className="inline ml-1" />مخالفون: {violCount}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Form preview — same layout as printed output ── */}
          <ReportFormPreview
            report={hasReport ? report : null}
            staffName={staffName}
            schoolInfo={schoolInfo}
            hijriDate={hijriDate}
            gregDate={gregDate}
            dayName={dayName}
            eduAdmin={eduAdmin}
            principal={principal}
            cell={cell}
            hcell={hcell}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Shared form layout — matches the printed HTML ─────────────────────────
interface PreviewProps {
  report: DutyReportRecord | null;
  staffName: string;
  schoolInfo: SchoolInfo;
  hijriDate: string;
  gregDate: string;
  dayName: string;
  eduAdmin: string;
  principal: string;
  cell: string;
  hcell: (bg?: string) => string;
}

const EMPTY_ROWS = Array(6).fill(null);

const ReportFormPreview: React.FC<PreviewProps> = ({
  report, staffName, schoolInfo,
  hijriDate, gregDate, dayName, eduAdmin, principal, cell, hcell
}) => {
  const isElectronic = report?.isSubmitted && !report?.manuallySubmitted;
  const lateStudents = isElectronic ? (report?.lateStudents?.filter(s => s.studentName.trim()) || []) : [];
  const violStudents = isElectronic ? (report?.violatingStudents?.filter(s => s.studentName.trim()) || []) : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" dir="rtl">

      {/* ── Compact header ── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5">
        <div className="grid grid-cols-3 gap-2 items-center">
          {/* Right */}
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-500">المملكة العربية السعودية</p>
            <p className="text-[9px] font-bold text-slate-500">وزارة التعليم</p>
            {eduAdmin && <p className="text-[9.5px] font-black text-[#655ac1]">{eduAdmin}</p>}
            <p className="text-[10.5px] font-black text-slate-800">{schoolInfo.schoolName}</p>
          </div>
          {/* Center */}
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="w-11 h-11 rounded-full bg-[#e5e1fe] border-[3px] border-[#655ac1]/20 flex items-center justify-center shadow-sm">
              <Shield size={20} className="text-[#655ac1]" />
            </div>
            <p className="text-[9.5px] font-black text-slate-800 leading-tight">نموذج تقرير المناوبة اليومية</p>
          </div>
          {/* Left — compact two-col grid */}
          <div className="grid grid-cols-[auto_1fr] gap-x-1.5 gap-y-px items-baseline text-left">
            <span className="text-[8.5px] font-bold text-slate-500 text-right">العام الدراسي:</span>
            <span className="text-[9.5px] font-black text-slate-800">{schoolInfo.academicYear || '—'}</span>
            {schoolInfo.semesters?.find(s => s.isCurrent) && <>
              <span className="text-[8.5px] font-bold text-slate-500 text-right">الفصل:</span>
              <span className="text-[9.5px] font-black text-slate-800">{schoolInfo.semesters.find(s => s.isCurrent)?.name}</span>
            </>}
            <span className="text-[8.5px] font-bold text-slate-500 text-right">اليوم:</span>
            <span className="text-[9.5px] font-black text-slate-800">{dayName}</span>
            <span className="text-[8.5px] font-bold text-slate-500 text-right">هجري:</span>
            <span className="text-[9.5px] font-medium text-slate-700">{hijriDate}</span>
            <span className="text-[8.5px] font-bold text-slate-500 text-right">ميلادي:</span>
            <span className="text-[9.5px] font-medium text-slate-600">{gregDate}</span>
          </div>
        </div>
      </div>

      {/* ── Supervisor bar ── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-violet-50/50 border-b border-violet-100">
        <Shield size={12} className="text-[#655ac1] shrink-0" />
        <p className="text-[9.5px] font-bold text-slate-500">المناوب:</p>
        <p className="text-xs font-black text-[#655ac1]">{staffName}</p>
        {report?.submittedAt && (
          <p className="mr-auto text-[8.5px] text-slate-400 font-medium">
            رُفع: {new Date(report.submittedAt).toLocaleString('ar-SA')}
          </p>
        )}
      </div>

      {/* ── Late students table ── */}
      <div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#655ac1] text-white">
          <Clock size={12} />
          <span className="font-black text-xs">الطلاب المتأخرون</span>
          {lateStudents.length > 0 && (
            <span className="mr-auto bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {lateStudents.length} طالب
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10.5px] border-collapse">
            <thead>
              <tr className="bg-[#655ac1]">
                <th className={hcell() + ' w-6'}>م</th>
                <th className={hcell()}>اسم الطالب</th>
                <th className={hcell()}>الصف / الفصل</th>
                <th className={hcell() + ' w-20'}>وقت الخروج</th>
                <th className={hcell()}>الإجراء المتخذ</th>
                <th className={hcell()}>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {lateStudents.length > 0
                ? lateStudents.map((s, i) => (
                    <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-200 p-1 text-center text-[10px] font-bold text-slate-400">{i + 1}</td>
                      <td className={cell + ' font-bold text-slate-800'}>{s.studentName}</td>
                      <td className={cell + ' text-center'}>{s.gradeAndClass}</td>
                      <td className={cell + ' text-center'}>{s.exitTime || '—'}</td>
                      <td className={cell}>{s.actionTaken || '—'}</td>
                      <td className={cell + ' text-slate-500'}>{s.notes || '—'}</td>
                    </tr>
                  ))
                : EMPTY_ROWS.map((_, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-200 p-1 text-center text-[10px] font-bold text-slate-300 w-6">{i + 1}</td>
                      <td className="border border-slate-200 h-5" colSpan={5} />
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Violations table ── */}
      <div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#7c6ff0] text-white">
          <AlertTriangle size={12} />
          <span className="font-black text-xs">الطلاب المخالفون سلوكياً</span>
          {violStudents.length > 0 && (
            <span className="mr-auto bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {violStudents.length} طالب
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10.5px] border-collapse">
            <thead>
              <tr className="bg-[#7c6ff0]">
                <th className={hcell('#7c6ff0') + ' w-6'}>م</th>
                <th className={hcell('#7c6ff0')}>اسم الطالب</th>
                <th className={hcell('#7c6ff0')}>الصف / الفصل</th>
                <th className={hcell('#7c6ff0')}>نوع المخالفة</th>
                <th className={hcell('#7c6ff0')}>الإجراء المتخذ</th>
                <th className={hcell('#7c6ff0')}>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {violStudents.length > 0
                ? violStudents.map((s, i) => (
                    <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-violet-50/30'}>
                      <td className="border border-slate-200 p-1 text-center text-[10px] font-bold text-slate-400">{i + 1}</td>
                      <td className={cell + ' font-bold text-slate-800'}>{s.studentName}</td>
                      <td className={cell + ' text-center'}>{s.gradeAndClass}</td>
                      <td className={cell}>{s.violationType || '—'}</td>
                      <td className={cell}>{s.actionTaken || '—'}</td>
                      <td className={cell + ' text-slate-500'}>{s.notes || '—'}</td>
                    </tr>
                  ))
                : EMPTY_ROWS.map((_, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-violet-50/30'}>
                      <td className="border border-slate-200 p-1 text-center text-[10px] font-bold text-slate-300 w-6">{i + 1}</td>
                      <td className="border border-slate-200 h-5" colSpan={5} />
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer notice ── */}
      <div className="mx-4 mt-2.5 mb-2 py-2 px-3 bg-violet-50 border border-violet-200 rounded-xl text-center">
        <p className="text-[10px] font-black text-[#5b21b6]">
          ⚠ يُسلَّم تقرير المناوبة لوكيل الشؤون التعليمية في اليوم التالي
        </p>
      </div>

      {/* ── Signatures ── */}
      <div className="grid grid-cols-2 gap-4 px-4 pb-4 pt-1">
        {/* Supervisor */}
        <div className="text-center">
          <p className="text-[9.5px] font-bold text-slate-500 mb-1.5">توقيع المناوب</p>
          {isElectronic && report?.signature ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center justify-center h-14">
              <img src={report.signature} alt="توقيع" className="max-h-12 object-contain" />
            </div>
          ) : (
            <div className="border-b-2 border-slate-400 mx-auto w-40 h-12" />
          )}
          <p className="text-[9.5px] font-bold text-slate-700 mt-1">{staffName}</p>
        </div>
        {/* Principal */}
        <div className="text-center">
          <p className="text-[9.5px] font-bold text-slate-500 mb-1.5">اعتماد مدير المدرسة وتوقيعه</p>
          <div className="border-b-2 border-slate-400 mx-auto w-40 h-12" />
          {principal && <p className="text-[9.5px] font-bold text-slate-700 mt-1">{principal}</p>}
        </div>
      </div>

    </div>
  );
};

export default DutyReportViewModal;
