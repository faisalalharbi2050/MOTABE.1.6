import React, { useState } from 'react';
import { X, Printer, Edit, Calendar, FileText, PenLine, CheckCircle, Shield } from 'lucide-react';
import { SchoolInfo, DutyScheduleData } from '../../../types';
import { getDutyPrintData } from '../../../utils/dutyUtils';
import { printDutyReport } from '../DutyReportViewModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dutyData: DutyScheduleData;
  schoolInfo: SchoolInfo;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const toHijri = (dateStr?: string) => {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(d);
  } catch { return ''; }
};

const DAY_NAMES_AR: Record<string, string> = {
  sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت'
};

// ── Component ─────────────────────────────────────────────────────────────────
const DutyPrintModal: React.FC<Props> = ({ isOpen, onClose, dutyData, schoolInfo, showToast }) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'report'>('schedule');
  const [footerText, setFooterText] = useState(dutyData.footerText || '');
  const [editingFooter, setEditingFooter] = useState(false);
  if (!isOpen) return null;

  const printData = getDutyPrintData(dutyData, schoolInfo);
  const todayHijri = toHijri();

  // ── TAB 1: Print weekly schedule ──────────────────────────────────────────
  const handlePrintSchedule = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>جدول المناوبة اليومية - ${printData.schoolName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Tajawal', 'Arial', sans-serif; direction: rtl; background: #fff;
           padding: 150px 40px 80px 40px; }
    .page-header { position: fixed; top: 0; left: 0; right: 0; background: #fff; z-index: 100;
                   padding: 16px 40px 10px; border-bottom: 2px solid #1e293b; }
    .header-wrapper { display: flex; justify-content: space-between; align-items: flex-start; }
    .header-right { width: 33%; text-align: right; font-weight: bold; font-size: 12px; color: #1e293b; line-height: 1.8; }
    .header-center { width: 33%; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .logo-circle { width: 56px; height: 56px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; }
    .logo-text { font-size: 9px; color: #94a3b8; }
    .header-title { font-size: 16px; font-weight: 900; color: #1e293b; margin-bottom: 4px; }
    .header-left { width: 33%; text-align: left; font-weight: bold; font-size: 12px; color: #1e293b; line-height: 1.8; }
    .page-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; z-index: 100;
                   padding: 8px 40px 14px; border-top: 1px dashed #94a3b8;
                   display: flex; justify-content: space-between; align-items: flex-start; }
    .footer-note { font-size: 12px; font-weight: bold; color: #475569; }
    .principal-sig { font-weight: bold; font-size: 13px; color: #334155; text-align: center; }
    .sig-line { margin-top: 18px; border-top: 1px dotted #94a3b8; padding-top: 4px; font-size: 12px; color: #94a3b8; }
    .print-container { max-width: 100%; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
    th { background-color: #f1f5f9; color: #1e293b; border: 1px solid #94a3b8; padding: 8px 6px; font-weight: bold; text-align: center; }
    td { border: 1px solid #94a3b8; padding: 7px 8px; text-align: center; vertical-align: middle; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .day-header { background-color: #e2e8f0 !important; font-weight: 900; color: #334155; border: 1px solid #94a3b8; }
    .empty-state { color: #94a3b8; font-style: italic; }
    .week-title { font-size: 11px; font-weight: 900; color: #334155; background: #f1f5f9; padding: 5px 10px; border-radius: 4px; margin-bottom: 6px; display: inline-block; }
    .week-block { margin-bottom: 20px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-header { border-bottom: 2px solid #1e293b !important; }
      th { background-color: #f1f5f9 !important; color: #1e293b !important; }
      .day-header { background-color: #e2e8f0 !important; color: #334155 !important; }
      tr:nth-child(even) { background-color: #f8fafc !important; }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <div class="header-wrapper">
      <div class="header-right">
        <p>المملكة العربية السعودية</p>
        <p>وزارة التعليم</p>
        <p>${schoolInfo.region || 'إدارة التعليم'}</p>
        <p>مدرسة ${printData.schoolName || '..........'}</p>
        <p>الفصل الدراسي: ${printData.semester}</p>
      </div>
      <div class="header-center">
        ${schoolInfo.logo
          ? `<img src="${schoolInfo.logo}" style="width:56px;height:56px;object-fit:contain;margin-bottom:8px;" />`
          : `<div class="logo-circle"><span class="logo-text">شعار</span></div>`
        }
        <h1 class="header-title">${printData.title}</h1>
      </div>
      <div class="header-left">
        <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
        <p>العام الدراسي: ${schoolInfo.academicYear || ''}</p>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <p class="footer-note">${footerText || printData.footerText}</p>
    <div class="principal-sig">
      <div>مدير المدرسة / ${schoolInfo.principal || '..........................'}</div>
      <div class="sig-line">التوقيع</div>
    </div>
  </div>

  <div class="print-container">
  ${printData.weeks.map(week => `
  <div class="week-block">
    <div class="week-title">${week.weekName}${week.startDate ? ` &nbsp; ${week.startDate} — ${week.endDate}` : ''}</div>
    <table>
      <thead>
        <tr>
          <th style="width:11%;">اليوم</th>
          <th style="width:12%;">التاريخ</th>
          <th>المناوب</th>
          <th style="width:18%;">التوقيع</th>
        </tr>
      </thead>
      <tbody>
        ${week.days.map(day => {
          const sups = day.supervisors;
          if (day.statusText) {
            return `<tr>
              <td class="day-header">${day.dayName}</td>
              <td style="color:#475569;">${day.date || '—'}</td>
              <td class="empty-state">${day.statusText}</td>
              ${showSignatures ? '<td class="signature-cell">—</td>' : ''}
            </tr>`;
          }
          if (sups.length === 0) {
            return `<tr>
              <td class="day-header">${day.dayName}</td>
              <td style="color:#94a3b8;">${day.date || '—'}</td>
              <td class="empty-state">لم يتم التعيين</td>
              <td></td>
            </tr>`;
          }
          const namesHtml = sups.map((sup, idx) =>
            `<div style="display:flex;align-items:center;gap:6px;margin-bottom:${idx < sups.length-1 ? '4px' : '0'};">
              <span style="width:16px;height:16px;border-radius:50%;background:#e2e8f0;color:#334155;font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${idx + 1}</span>
              <span style="font-weight:bold;color:#1e293b;">${sup.name}</span>
            </div>`
          ).join('');
          return `<tr>
            <td class="day-header">${day.dayName}</td>
            <td style="color:#475569;">${day.date || '—'}</td>
            <td style="text-align:right; vertical-align:top;">${namesHtml}</td>
            <td></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
  `).join('')}
  </div>
</body>
</html>`);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
    showToast('تم فتح نافذة الطباعة', 'success');
  };

  // ── TAB 1b: Print schedule WITH embedded digital signatures ──────────────
  const handlePrintScheduleSigned = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>جدول المناوبة اليومية (موقّع) - ${printData.schoolName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Tajawal', sans-serif; direction: rtl; background: #fff; font-size: 11px;
           padding: 150px 40px 80px 40px; }
    .page-header { position: fixed; top: 0; left: 0; right: 0; background: #fff; z-index: 100;
                   padding: 16px 40px 10px; border-bottom: 2px solid #1e293b; }
    .header-wrapper { display: flex; justify-content: space-between; align-items: flex-start; }
    .header-right { width: 33%; text-align: right; font-weight: bold; font-size: 12px; color: #1e293b; line-height: 1.8; }
    .header-center { width: 33%; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .logo-circle { width: 56px; height: 56px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; }
    .logo-text { font-size: 9px; color: #94a3b8; }
    .header-title { font-size: 16px; font-weight: 900; color: #1e293b; margin-bottom: 4px; }
    .header-left { width: 33%; text-align: left; font-weight: bold; font-size: 12px; color: #1e293b; line-height: 1.8; }
    .page-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; z-index: 100;
                   padding: 8px 40px 14px; border-top: 1px dashed #94a3b8;
                   display: flex; justify-content: space-between; align-items: flex-start; }
    .footer-note { font-size: 12px; font-weight: bold; color: #475569; }
    .principal-sig { font-weight: bold; font-size: 13px; color: #334155; text-align: center; }
    .sig-line { margin-top: 18px; border-top: 1px dotted #94a3b8; padding-top: 4px; font-size: 12px; color: #94a3b8; }
    .print-container { max-width: 100%; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    th { background-color: #f1f5f9; color: #1e293b; border: 1px solid #94a3b8; padding: 8px 6px; font-weight: bold; text-align: center; }
    td { border: 1px solid #94a3b8; padding: 7px 8px; text-align: center; vertical-align: middle; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .day-header { background-color: #e2e8f0 !important; font-weight: 900; color: #334155; border: 1px solid #94a3b8; }
    .empty-state { color: #94a3b8; font-style: italic; }
    .week-title { font-size: 11px; font-weight: 900; color: #334155; background: #f1f5f9; padding: 5px 10px; border-radius: 4px; margin-bottom: 6px; display: inline-block; }
    .week-block { margin-bottom: 20px; }
    .sig-img { max-height: 44px; max-width: 130px; display: block; margin: 0 auto; }
    .sig-empty { display: inline-block; width: 100px; border-top: 1px dotted #94a3b8; margin-top: 20px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-header { border-bottom: 2px solid #1e293b !important; }
      th { background-color: #f1f5f9 !important; color: #1e293b !important; }
      .day-header { background-color: #e2e8f0 !important; color: #334155 !important; }
      tr:nth-child(even) { background-color: #f8fafc !important; }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <div class="header-wrapper">
      <div class="header-right">
        <p>المملكة العربية السعودية</p>
        <p>وزارة التعليم</p>
        <p>${schoolInfo.region || 'إدارة التعليم'}</p>
        <p>مدرسة ${printData.schoolName || '..........'}</p>
        <p>الفصل الدراسي: ${printData.semester}</p>
      </div>
      <div class="header-center">
        ${schoolInfo.logo
          ? `<img src="${schoolInfo.logo}" style="width:56px;height:56px;object-fit:contain;margin-bottom:8px;" />`
          : `<div class="logo-circle"><span class="logo-text">شعار</span></div>`
        }
        <h1 class="header-title">${printData.title}</h1>
      </div>
      <div class="header-left">
        <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
        <p>العام الدراسي: ${schoolInfo.academicYear || ''}</p>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <p class="footer-note">${footerText || printData.footerText}</p>
    <div class="principal-sig">
      <div>مدير المدرسة / ${schoolInfo.principal || '..........................'}</div>
      <div class="sig-line">التوقيع</div>
    </div>
  </div>

  <div class="print-container">
  ${printData.weeks.map(week => `
  <div class="week-block">
    <div class="week-title">${week.weekName}${week.startDate ? ` &nbsp; ${week.startDate} — ${week.endDate}` : ''}</div>
    <table>
      <thead>
        <tr>
          <th style="width:11%;">اليوم</th>
          <th style="width:12%;">التاريخ</th>
          <th>المناوب</th>
          <th style="width:20%;">التوقيع</th>
        </tr>
      </thead>
      <tbody>
        ${week.days.map(day => {
          const sups = day.supervisors;
          if (day.statusText) {
            return `<tr>
              <td class="day-header">${day.dayName}</td>
              <td style="color:#475569;">${day.date || '—'}</td>
              <td class="empty-state">${day.statusText}</td>
              ${showSignatures ? '<td class="signature-cell">—</td>' : ''}
            </tr>`;
          }
          if (sups.length === 0) {
            return `<tr>
              <td class="day-header">${day.dayName}</td>
              <td style="color:#94a3b8;">${day.date || '—'}</td>
              <td class="empty-state">لم يتم التعيين</td>
              <td></td>
            </tr>`;
          }
          const namesHtml = sups.map((sup, idx) =>
            `<div style="display:flex;align-items:center;gap:6px;margin-bottom:${idx < sups.length-1 ? '4px' : '0'};">
              <span style="width:16px;height:16px;border-radius:50%;background:#e2e8f0;color:#334155;font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${idx + 1}</span>
              <span style="font-weight:bold;color:#1e293b;">${sup.name}</span>
            </div>`
          ).join('');
          const sigHtml = sups.map(sup =>
            sup.signature
              ? `<img class="sig-img" src="${sup.signature}" alt="توقيع ${sup.name}" />`
              : `<span class="sig-empty"></span>`
          ).join('<br/>');
          return `<tr>
            <td class="day-header">${day.dayName}</td>
            <td style="color:#475569;">${day.date || '—'}</td>
            <td style="text-align:right; vertical-align:top;">${namesHtml}</td>
            <td style="vertical-align:middle; text-align:center;">${sigHtml}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
  `).join('')}
  </div>
</body>
</html>`);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
    showToast('تم فتح نافذة الطباعة الموقعة', 'success');
  };

  // ── TAB 2: Print blank daily report template ──────────────────────────────
  const handlePrintBlankReport = () => {
    printDutyReport(null, '', '', '', schoolInfo, true);
    showToast('تم فتح نافذة طباعة النموذج', 'success');
  };

  const LATE_ROWS = 5;
  const VIOLATION_ROWS = 5;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="bg-white border-b border-slate-100 px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Printer size={26} className="text-[#655ac1]" />
            <div>
              <h2 className="text-xl font-black text-slate-800">طباعة المناوبة</h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">معاينة وطباعة جدول المناوبة أو نموذج التقرير اليومي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ── Print sub-bar ── */}
        {activeTab === 'schedule' && (
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 gap-4">
            <p className="text-sm font-black text-slate-600">اختر نوع الطباعة:</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrintSchedule}
                className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white border-2 border-slate-200 hover:border-[#655ac1]/50 text-slate-700 hover:text-[#655ac1] font-bold transition-all shadow-sm hover:shadow active:scale-95"
              >
                <FileText size={18} />
                <span>طباعة بدون توقيع</span>
              </button>
              <button
                onClick={handlePrintScheduleSigned}
                className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-[#655ac1] hover:bg-[#5046a0] text-white font-bold transition-all shadow-md shadow-[#655ac1]/25 hover:shadow-[#655ac1]/40 active:scale-95"
              >
                <PenLine size={18} />
                <span>الطباعة بالتوقيع الإلكتروني</span>
              </button>
            </div>
          </div>
        )}
        {activeTab === 'report' && (
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 gap-4">
            <p className="text-sm font-black text-slate-600">معاينة نموذج التقرير اليومي الفارغ</p>
            <button
              onClick={handlePrintBlankReport}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-[#655ac1] hover:bg-[#5046a0] text-white font-bold transition-all shadow-md shadow-[#655ac1]/25 hover:shadow-[#655ac1]/40 active:scale-95"
            >
              <Printer size={18} />
              <span>طباعة النموذج</span>
            </button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="bg-white border-b border-slate-100 px-6 py-3 flex gap-3 shrink-0">
          {([
            { id: 'schedule', label: 'جدول المناوبة الأسبوعي', Icon: Calendar },
            { id: 'report',   label: 'نموذج التقرير اليومي',   Icon: FileText },
          ] as const).map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all bg-white text-[#655ac1] ${
                  active
                    ? 'border-[#655ac1] shadow-sm shadow-[#655ac1]/10'
                    : 'border-[#655ac1]/30 hover:border-[#655ac1]/60'
                }`}
              >
                <Icon size={15} className="text-[#655ac1]" />
                {label}
                {active && <CheckCircle size={14} className="text-[#655ac1] mr-1" />}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ═══════════════ TAB 1: Schedule ═══════════════ */}
          {activeTab === 'schedule' && (
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-5">
              {/* Footer / Notes card */}
              <div className="border border-[#655ac1]/20 bg-[#655ac1]/5 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Edit size={15} className="text-[#655ac1]" />
                    <label className="text-sm font-black text-[#655ac1]">التذييل / الملاحظات</label>
                  </div>
                  <button
                    onClick={() => setEditingFooter(!editingFooter)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                      editingFooter
                        ? 'bg-[#655ac1] text-white border-[#655ac1]'
                        : 'bg-white text-[#655ac1] border-[#655ac1]/30 hover:border-[#655ac1]'
                    }`}
                  >
                    {editingFooter ? 'حفظ' : 'تعديل'}
                  </button>
                </div>
                {editingFooter ? (
                  <textarea
                    value={footerText}
                    onChange={e => setFooterText(e.target.value)}
                    placeholder={printData.footerText}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#655ac1]/20 bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-[#655ac1]/20 focus:border-[#655ac1] outline-none resize-none leading-relaxed"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-slate-600 font-medium bg-white/70 px-3 py-2.5 rounded-xl border border-[#655ac1]/10 leading-relaxed min-h-[44px]">
                    {footerText || printData.footerText}
                  </p>
                )}
              </div>

              {/* Preview */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto">
                {printData.weeks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-1">
                      <Calendar size={28} className="text-slate-300" />
                    </div>
                    <p className="text-base font-black text-slate-500">لا يوجد جدول مناوبة لطباعته</p>
                    <p className="text-sm font-medium text-slate-400">يُرجى إنشاء جدول المناوبة أولاً</p>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-4 pb-4 border-b-2 border-double border-slate-300">
                      <h4 className="text-base font-black text-slate-800 mb-1">{printData.schoolName}</h4>
                      <h5 className="text-sm font-bold text-slate-500">{printData.title}</h5>
                    </div>
                    <div className="space-y-6">
                      {printData.weeks.map(week => (
                        <div key={week.weekName} className="mb-4">
                          <h5 className="font-bold text-[#334155] bg-[#f1f5f9] py-1.5 px-3 rounded-lg mb-2 text-xs inline-block">
                            {week.weekName} {week.startDate && <span className="text-slate-500 mr-1">({week.startDate} - {week.endDate})</span>}
                          </h5>
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#f1f5f9] text-[#1e293b]">
                                <th className="border border-[#94a3b8] p-1.5 w-20">اليوم</th>
                                <th className="border border-[#94a3b8] p-1.5 w-24">التاريخ</th>
                                <th className="border border-[#94a3b8] p-1.5">المناوب</th>
                                <th className="border border-[#94a3b8] p-1.5 w-28">التوقيع</th>
                              </tr>
                            </thead>
                            <tbody>
                              {week.days.map((day, rowIdx) => (
                                <tr key={day.date || day.dayName} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}>
                                  <td className="border border-[#94a3b8] p-1.5 font-bold bg-[#e2e8f0] text-[#334155] text-center">{day.dayName}</td>
                                  <td className="border border-[#94a3b8] p-1.5 text-center text-slate-500 text-[10px]">{day.date || '—'}</td>
                                  <td className="border border-[#94a3b8] p-1.5 align-top">
                                    {day.statusText
                                      ? <span className="text-slate-500 font-bold">{day.statusText}</span>
                                      : day.supervisors.length === 0
                                      ? <span className="text-slate-400 italic">لم يتم التعيين</span>
                                      : <div className="flex flex-col gap-1">
                                          {day.supervisors.map((sup, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5">
                                              <span className="w-4 h-4 rounded-full bg-[#e2e8f0] text-[#334155] text-[9px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                                              <span className="font-bold text-slate-800">{sup.name}</span>
                                            </div>
                                          ))}
                                        </div>}
                                  </td>
                                  <td className="border border-[#94a3b8] p-1.5"></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 border-t border-slate-100 pt-4 text-center">
                      <p className="font-bold text-xs text-slate-500">{footerText || printData.footerText}</p>
                      <div className="mt-4 flex justify-end">
                        <div className="text-center">
                          <p className="font-bold text-sm text-slate-800">مدير المدرسة: {schoolInfo.principal || '—'}</p>
                          <p className="font-bold text-xs text-slate-400 mt-2">التوقيع: ..........................</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ TAB 2: Daily Report Template ═══════════════ */}
          {activeTab === 'report' && (
            <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100">

              {/* Official header */}
              <div className="bg-white border-b border-slate-200 px-4 py-3">
                <div className="grid grid-cols-3 gap-2 items-center">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-500">المملكة العربية السعودية</p>
                    <p className="text-[9px] font-bold text-slate-500">وزارة التعليم</p>
                    {schoolInfo.region && <p className="text-[9.5px] font-black text-[#655ac1]">{schoolInfo.region}</p>}
                    <p className="text-[10.5px] font-black text-slate-800">{schoolInfo.schoolName}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="w-11 h-11 rounded-full bg-[#e5e1fe] border-[3px] border-[#655ac1]/20 flex items-center justify-center shadow-sm">
                      <Shield size={20} className="text-[#655ac1]" />
                    </div>
                    <p className="text-[9.5px] font-black text-slate-800 leading-tight">نموذج تقرير المناوبة اليومية</p>
                  </div>
                  <div className="grid grid-cols-[auto_1fr] gap-x-1.5 gap-y-px items-baseline">
                    <span className="text-[8.5px] font-bold text-slate-500 text-right">العام الدراسي:</span>
                    <span className="text-[9.5px] font-black text-slate-800">{schoolInfo.academicYear || '—'}</span>
                    <span className="text-[8.5px] font-bold text-slate-500 text-right">الفصل الدراسي:</span>
                    <span className="text-[9.5px] font-black text-slate-800">{schoolInfo.semesters?.find(s => s.isCurrent)?.name || '—'}</span>
                    <span className="text-[8.5px] font-bold text-slate-500 text-right">اليوم:</span>
                    <span className="text-[9.5px] font-medium text-slate-400">__________</span>
                    <span className="text-[8.5px] font-bold text-slate-500 text-right">هجري:</span>
                    <span className="text-[9.5px] font-medium text-slate-400">__________</span>
                    <span className="text-[8.5px] font-bold text-slate-500 text-right">ميلادي:</span>
                    <span className="text-[9.5px] font-medium text-slate-400">__________</span>
                  </div>
                </div>
              </div>

              {/* Staff table */}
              <div>
                <div className="flex items-center gap-2 px-4 py-2 bg-[#e2e8f0] text-[#334155]">
                  <span className="font-black text-xs">أولاً: المناوبون</span>
                </div>
                <table className="w-full text-[10.5px] border-collapse">
                  <thead>
                    <tr className="bg-[#f1f5f9]">
                      {['م','الاسم','التوقيع','ملاحظات'].map(h => (
                        <th key={h} className="border border-slate-200 p-1.5 text-[10px] font-black text-center text-[#334155]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1,2].map((n,i) => (
                      <tr key={n} className={i%2===0?'bg-white':'bg-[#f8fafc]'}>
                        <td className="border border-slate-200 p-1 text-center text-[10px] font-bold text-slate-300 w-6">{n}</td>
                        <td className="border border-slate-200 h-8" colSpan={3}/>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Late students table */}
              <div>
                <div className="flex items-center gap-2 px-4 py-2 bg-[#e2e8f0] text-[#334155]">
                  <span className="font-black text-xs">ثانياً: الطلاب المتأخرون</span>
                </div>
                <table className="w-full text-[10.5px] border-collapse">
                  <thead>
                    <tr className="bg-[#f1f5f9]">
                      {['م','اسم الطالب','الصف/الفصل','زمن الانصراف','الإجراء','ملاحظات'].map(h => (
                        <th key={h} className="border border-slate-200 p-1.5 text-[10px] font-black text-center text-[#334155]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array(LATE_ROWS).fill(null).map((_,i) => (
                      <tr key={i} className={i%2===0?'bg-white':'bg-[#f8fafc]'}>
                        <td className="border border-slate-200 p-1 text-center text-[10px] font-bold text-slate-300 w-6">{i+1}</td>
                        <td className="border border-slate-200 h-6" colSpan={5}/>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Violations table */}
              <div>
                <div className="flex items-center gap-2 px-4 py-2 bg-[#e2e8f0] text-[#334155]">
                  <span className="font-black text-xs">ثالثاً: الطلاب المخالفون سلوكياً</span>
                </div>
                <table className="w-full text-[10.5px] border-collapse">
                  <thead>
                    <tr className="bg-[#f1f5f9]">
                      {['م','اسم الطالب','الصف/الفصل','نوع المخالفة','الإجراء','ملاحظات'].map(h => (
                        <th key={h} className="border border-slate-200 p-1.5 text-[10px] font-black text-center text-[#334155]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array(VIOLATION_ROWS).fill(null).map((_,i) => (
                      <tr key={i} className={i%2===0?'bg-white':'bg-[#f8fafc]'}>
                        <td className="border border-slate-200 p-1 text-center text-[10px] font-bold text-slate-300 w-6">{i+1}</td>
                        <td className="border border-slate-200 h-6" colSpan={5}/>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer: notice (right) + principal (left) */}
              <div className="flex items-end justify-between px-4 pb-5 pt-3 border-t border-slate-100 mt-1">
                <p className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                  يُسلَّم هذا النموذج في اليوم التالي لوكيل الشؤون التعليمية
                </p>
                <div className="text-center">
                  <p className="text-[9.5px] font-bold text-slate-500 mb-1.5">مدير المدرسة وتوقيعه</p>
                  <div className="border-b-2 border-slate-400 mx-auto w-36 h-10" />
                  {schoolInfo.principal && <p className="text-[9.5px] font-bold text-slate-700 mt-1">{schoolInfo.principal}</p>}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Cancel footer ── */}
        <div className="bg-white border-t border-slate-100 px-6 py-3 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl text-sm font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

export default DutyPrintModal;
