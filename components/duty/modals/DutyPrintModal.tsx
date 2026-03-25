import React, { useState } from 'react';
import { X, Printer, Edit, Calendar, FileText, PenLine } from 'lucide-react';
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
    body { font-family: 'Tajawal', 'Arial', sans-serif; padding: 40px; direction: rtl; background: #fff; }
    .print-container { max-width: 100%; margin: 0 auto; }
    .header-wrapper { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
    .header-right { width: 33%; text-align: right; font-weight: bold; font-size: 12px; color: #1e293b; line-height: 1.8; }
    .header-center { width: 33%; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .logo-circle { width: 56px; height: 56px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; }
    .logo-text { font-size: 9px; color: #94a3b8; }
    .header-title { font-size: 16px; font-weight: 900; color: #1e293b; margin-bottom: 4px; }
    .header-left { width: 33%; text-align: left; font-weight: bold; font-size: 12px; color: #1e293b; line-height: 1.8; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
    th { background-color: #f1f5f9; color: #1e293b; border: 1px solid #94a3b8; padding: 8px 6px; font-weight: bold; text-align: center; }
    td { border: 1px solid #94a3b8; padding: 7px 8px; text-align: center; vertical-align: middle; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .day-header { background-color: #f1f5f9 !important; font-weight: 900; color: #655ac1; border: 1px solid #94a3b8; }
    .empty-state { color: #94a3b8; font-style: italic; }
    .week-title { font-size: 11px; font-weight: 900; color: #334155; background: #f1f5f9; padding: 5px 10px; border-radius: 4px; margin-bottom: 6px; display: inline-block; }
    .week-block { margin-bottom: 20px; }
    .footer { margin-top: 30px; text-align: center; font-size: 13px; font-weight: bold; color: #475569; padding-top: 16px; border-top: 2px dashed #94a3b8; }
    .principal-sig { margin-top: 40px; padding-right: 40px; font-weight: bold; font-size: 13px; color: #334155; text-align: right; }
    .principal-sig .sig-line { margin-top: 28px; border-top: 1px dotted #94a3b8; padding-top: 4px; font-size: 12px; color: #94a3b8; }
    @media print {
      body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header-wrapper { border-bottom: 2px solid #1e293b !important; }
      th { background-color: #f1f5f9 !important; color: #1e293b !important; }
      .day-header { background-color: #f1f5f9 !important; color: #655ac1 !important; }
      tr:nth-child(even) { background-color: #f8fafc !important; }
    }
  </style>
</head>
<body>
  <div class="print-container">
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

  <div class="footer">${footerText || printData.footerText}</div>
  <div class="principal-sig">
    <div>مدير المدرسة / ${schoolInfo.principal || '..........................'}</div>
    <div class="sig-line">التوقيع</div>
  </div>
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
    body { font-family: 'Tajawal', sans-serif; padding: 40px; direction: rtl; background: #fff; font-size: 11px; }
    .print-container { max-width: 100%; margin: 0 auto; }
    .header-wrapper { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
    .header-right { width: 33%; text-align: right; font-weight: bold; font-size: 12px; color: #1e293b; line-height: 1.8; }
    .header-center { width: 33%; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .logo-circle { width: 56px; height: 56px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; }
    .logo-text { font-size: 9px; color: #94a3b8; }
    .header-title { font-size: 16px; font-weight: 900; color: #1e293b; margin-bottom: 4px; }
    .header-left { width: 33%; text-align: left; font-weight: bold; font-size: 12px; color: #1e293b; line-height: 1.8; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    th { background-color: #f1f5f9; color: #1e293b; border: 1px solid #94a3b8; padding: 8px 6px; font-weight: bold; text-align: center; }
    td { border: 1px solid #94a3b8; padding: 7px 8px; text-align: center; vertical-align: middle; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .day-header { background-color: #f1f5f9 !important; font-weight: 900; color: #655ac1; border: 1px solid #94a3b8; }
    .empty-state { color: #94a3b8; font-style: italic; }
    .week-title { font-size: 11px; font-weight: 900; color: #334155; background: #f1f5f9; padding: 5px 10px; border-radius: 4px; margin-bottom: 6px; display: inline-block; }
    .week-block { margin-bottom: 20px; }
    .footer { margin-top: 30px; text-align: center; font-size: 13px; font-weight: bold; color: #475569; padding-top: 16px; border-top: 2px dashed #94a3b8; }
    .principal-sig { margin-top: 40px; padding-right: 40px; font-weight: bold; font-size: 13px; color: #334155; text-align: right; }
    .principal-sig .sig-line { margin-top: 28px; border-top: 1px dotted #94a3b8; padding-top: 4px; font-size: 12px; color: #94a3b8; }
    .sig-img { max-height: 44px; max-width: 130px; display: block; margin: 0 auto; }
    .sig-empty { display: inline-block; width: 100px; border-top: 1px dotted #94a3b8; margin-top: 20px; }
    @media print {
      body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header-wrapper { border-bottom: 2px solid #1e293b !important; }
      th { background-color: #f1f5f9 !important; color: #1e293b !important; }
      .day-header { background-color: #f1f5f9 !important; color: #655ac1 !important; }
      tr:nth-child(even) { background-color: #f8fafc !important; }
    }
  </style>
</head>
<body>
  <div class="print-container">
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

  <div class="footer">${footerText || printData.footerText}</div>
  <div class="principal-sig">
    <div>مدير المدرسة / ${schoolInfo.principal || '..........................'}</div>
    <div class="sig-line">التوقيع</div>
  </div>
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

        {/* ── Tabs ── */}
        <div className="bg-white border-b border-slate-200 px-6 flex gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'schedule'
                ? 'border-[#655ac1] text-[#655ac1]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar size={16} /> جدول المناوبة الأسبوعي
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'report'
                ? 'border-[#655ac1] text-[#655ac1]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={16} /> نموذج التقرير اليومي
          </button>
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
                    <div className="w-7 h-7 bg-[#e5e1fe] rounded-lg flex items-center justify-center">
                      <Edit size={13} className="text-[#655ac1]" />
                    </div>
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
                                {day.supervisors.length === 0
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
              </div>


            </div>
          )}

          {/* ═══════════════ TAB 2: Daily Report Template ═══════════════ */}
          {activeTab === 'report' && (
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-5">
              {/* Preview of blank report */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-[#1e293b] pb-3 mb-4">
                  <div className="text-[10px] font-bold text-slate-500 leading-relaxed">
                    <div>المملكة العربية السعودية | وزارة التعليم</div>
                    <div>{schoolInfo.region || ''}</div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-[#1e293b]">نموذج تقرير المناوبة اليومية</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">{schoolInfo.schoolName}</p>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 text-left">
                    <div>العام الدراسي: {schoolInfo.academicYear || '........'}</div>
                  </div>
                </div>

                {/* Meta boxes */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {['اليوم', 'التاريخ الميلادي', 'التاريخ الهجري', 'المدرسة'].map(l => (
                    <div key={l} className="border border-[#94a3b8] rounded-lg p-2 text-center">
                      <p className="text-[9px] font-bold text-slate-400 mb-1">{l}</p>
                      <p className="text-xs font-black text-slate-700">
                        {l === 'المدرسة' ? schoolInfo.schoolName : '............'}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Staff table – 2 rows */}
                <div className="mb-3">
                  <div className="bg-[#f1f5f9] text-[#1e293b] text-xs font-black px-3 py-1.5 rounded-t-lg border border-b-0 border-[#94a3b8]">أولاً: المناوبون</div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="border border-slate-200 p-1.5 w-8">م</th>
                        <th className="border border-slate-200 p-1.5 text-right pr-3">الاسم</th>
                        <th className="border border-slate-200 p-1.5 w-28">التوقيع</th>
                        <th className="border border-slate-200 p-1.5">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2].map((n, i) => (
                        <tr key={n} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="border border-slate-200 p-1.5 text-center text-slate-400">{n}</td>
                          <td className="border border-slate-200 p-1.5 h-10"></td>
                          <td className="border border-slate-200 p-1.5 h-10"></td>
                          <td className="border border-slate-200 p-1.5"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Late students table */}
                <div className="mb-3">
                  <div className="bg-[#f1f5f9] text-[#1e293b] text-xs font-black px-3 py-1.5 rounded-t-lg border border-b-0 border-[#94a3b8]">ثانياً: المتأخرون</div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="border border-slate-200 p-1.5 w-8">م</th>
                        <th className="border border-slate-200 p-1.5 text-right pr-3">اسم الطالب</th>
                        <th className="border border-slate-200 p-1.5">الصف/الفصل</th>
                        <th className="border border-slate-200 p-1.5">زمن الانصراف</th>
                        <th className="border border-slate-200 p-1.5">الإجراء</th>
                        <th className="border border-slate-200 p-1.5">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array(LATE_ROWS).fill(null).map((_, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="border border-slate-200 p-1.5 text-center text-slate-400">{i + 1}</td>
                          {[1,2,3,4,5].map(c => <td key={c} className="border border-slate-200 p-1.5 h-7"></td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Violations table */}
                <div className="mb-4">
                  <div className="bg-[#f1f5f9] text-[#1e293b] text-xs font-black px-3 py-1.5 rounded-t-lg border border-b-0 border-[#94a3b8]">ثالثاً: المخالفون</div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="border border-slate-200 p-1.5 w-8">م</th>
                        <th className="border border-slate-200 p-1.5 text-right pr-3">اسم الطالب</th>
                        <th className="border border-slate-200 p-1.5">الصف/الفصل</th>
                        <th className="border border-slate-200 p-1.5">المخالفة</th>
                        <th className="border border-slate-200 p-1.5">الإجراء</th>
                        <th className="border border-slate-200 p-1.5">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array(VIOLATION_ROWS).fill(null).map((_, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="border border-slate-200 p-1.5 text-center text-slate-400">{i + 1}</td>
                          {[1,2,3,4,5].map(c => <td key={c} className="border border-slate-200 p-1.5 h-7"></td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 pt-4 flex justify-between items-end">
                  <p className="text-[10px] font-bold text-slate-500">سُلِّم هذا النموذج لوكيل الشؤون التعليمية</p>
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-800">مدير المدرسة / {schoolInfo.principal || '—'}</p>
                    <p className="text-[10px] text-slate-400 mt-3 border-t border-dotted border-slate-300 pt-1">التوقيع</p>
                  </div>
                </div>
              </div>

              {/* Print button */}
              <div className="flex justify-end gap-3">
                <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                  إلغاء
                </button>
                <button
                  onClick={handlePrintBlankReport}
                  className="flex items-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-8 py-3 rounded-xl text-sm font-bold shadow-md shadow-[#655ac1]/25 transition-all hover:scale-105 active:scale-95"
                >
                  <Printer size={18} /> طباعة النموذج
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DutyPrintModal;
