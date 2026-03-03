import React, { useState } from 'react';
import { X, Printer, Edit, ToggleLeft, ToggleRight, Calendar, FileText } from 'lucide-react';
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
  const [showSupervisorSig, setShowSupervisorSig] = useState(true);

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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; background: #fff; font-size: 11px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 3px solid #655ac1;
      padding: 8px 16px; margin-bottom: 10px;
    }
    .page-header .school-info { font-size: 10px; font-weight: bold; color: #334155; line-height: 1.5; }
    .page-header .doc-title { text-align: center; }
    .page-header .doc-title h1 { font-size: 14px; font-weight: 900; color: #655ac1; }
    .page-header .doc-title p { font-size: 9px; color: #8779fb; font-weight: bold; margin-top: 2px; }
    .page-header .doc-date { font-size: 10px; font-weight: bold; color: #475569; text-align: left; }
    @page { margin: 15mm 15mm 20mm 15mm; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10.5px; }
    th { background-color: #655ac1; color: white; border: 1px solid #8779fb; padding: 6px 4px; font-weight: bold; text-align: center; }
    td { border: 1px solid #ddd6fe; padding: 5px 6px; text-align: center; vertical-align: middle; }
    tr:nth-child(even) { background-color: #f5f3ff; }
    .day-header { background-color: #ede9fe !important; font-weight: 900; color: #4c1d95; border: 1px solid #c4b5fd; }
    .empty-state { color: #94a3b8; font-style: italic; }
    .week-title { font-size: 11px; font-weight: 900; color: #5C50A4; background: #ede9fe; padding: 5px 10px; border-radius: 4px; margin-bottom: 6px; display: inline-block; }
    .page-footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9px; font-weight: bold; color: #64748b; padding: 5px 20px; border-top: 1px dashed #c4b5fd; background: white; }
    .principal-sig { text-align: left; margin-top: 16px; font-size: 11px; font-weight: bold; color: #334155; padding-left: 20px; }
    .principal-sig .sig-line { display: inline-block; min-width: 160px; border-top: 1px dotted #94a3b8; margin-top: 16px; padding-top: 3px; }
    .week-block { margin-bottom: 16px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      th { background-color: #655ac1 !important; color: white !important; }
      .day-header { background-color: #ede9fe !important; }
      tr:nth-child(even) { background-color: #f5f3ff !important; }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <div class="school-info">
      <div>المملكة العربية السعودية &nbsp;|&nbsp; وزارة التعليم</div>
      <div>${schoolInfo.region || 'إدارة التعليم'} &nbsp;|&nbsp; مدرسة ${printData.schoolName || '..........'}</div>
    </div>
    <div class="doc-title">
      <h1>${printData.title}</h1>
      <p>${printData.semester}</p>
    </div>
    <div class="doc-date">
      <div>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</div>
      <div>العام الدراسي: ${schoolInfo.academicYear || ''}</div>
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
          ${showSupervisorSig ? '<th style="width:18%;">التوقيع</th>' : ''}
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
              ${showSupervisorSig ? '<td></td>' : ''}
            </tr>`;
          }
          const namesHtml = sups.map((sup, idx) =>
            `<div style="display:flex;align-items:center;gap:6px;margin-bottom:${idx < sups.length-1 ? '4px' : '0'};">
              <span style="width:16px;height:16px;border-radius:50%;background:#e5e1fe;color:#655ac1;font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${idx + 1}</span>
              <span style="font-weight:bold;color:#1e293b;">${sup.name}</span>
            </div>`
          ).join('');
          return `<tr>
            <td class="day-header">${day.dayName}</td>
            <td style="color:#475569;">${day.date || '—'}</td>
            <td style="text-align:right; vertical-align:top;">${namesHtml}</td>
            ${showSupervisorSig ? '<td></td>' : ''}
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
  `).join('')}

  <div class="page-footer">${footerText || printData.footerText}</div>
  <div class="principal-sig">
    <div>مدير المدرسة / ${schoolInfo.principal || '..........................'}</div>
    <span class="sig-line">التوقيع</span>
  </div>
</body>
</html>`);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
    showToast('تم فتح نافذة الطباعة', 'success');
  };

  // ── TAB 2: Print blank daily report template ──────────────────────────────
  const handlePrintBlankReport = () => {
    printDutyReport(null, '', '', '', schoolInfo, true);
    showToast('تم فتح نافذة طباعة النموذج', 'success');
  };

  const LATE_ROWS = 5;
  const VIOLATION_ROWS = 5;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* ── Header ── */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#e5e1fe] rounded-2xl flex items-center justify-center text-[#655ac1] shadow-sm">
              <Printer size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">طباعة</h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">معاينة وطباعة جدول المناوبة أو نموذج التقرير اليومي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white border-b border-slate-200 px-6 flex gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'schedule'
                ? 'border-[#8779fb] text-[#655ac1]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar size={16} /> جدول المناوبة الأسبوعي
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'report'
                ? 'border-[#8779fb] text-[#655ac1]'
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
              {/* Options row */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col md:flex-row gap-4">
                {/* Footer text */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-600">نص التذييل</label>
                    <button onClick={() => setEditingFooter(!editingFooter)} className="p-1.5 rounded-lg hover:bg-white text-slate-400 border border-transparent hover:border-slate-200 transition-colors">
                      <Edit size={14} />
                    </button>
                  </div>
                  {editingFooter ? (
                    <textarea
                      value={footerText}
                      onChange={e => setFooterText(e.target.value)}
                      placeholder={printData.footerText}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-[#8779fb]/30 focus:border-[#8779fb] outline-none resize-none"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm text-slate-600 font-medium bg-white p-2 text-right rounded-lg border border-slate-100">{footerText || printData.footerText}</p>
                  )}
                </div>

                {/* Signature toggle */}
                <div className="w-full md:w-56 bg-white p-3 rounded-xl border border-slate-200 shrink-0">
                  <h4 className="text-xs font-bold text-slate-500 mb-3 border-b border-slate-100 pb-2">إعدادات الأعمدة</h4>
                  <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                    <span>توقيع المناوب</span>
                    <button onClick={() => setShowSupervisorSig(!showSupervisorSig)}>
                      {showSupervisorSig
                        ? <ToggleRight size={28} className="text-[#8779fb]" />
                        : <ToggleLeft size={28} className="text-slate-300" />}
                    </button>
                  </div>
                </div>
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
                      <h5 className="font-bold text-[#5C50A4] bg-[#ede9fe] py-1.5 px-3 rounded-lg mb-2 text-xs inline-block">
                        {week.weekName} {week.startDate && <span className="text-slate-500 mr-1">({week.startDate} - {week.endDate})</span>}
                      </h5>
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#8779fb] text-white">
                            <th className="border border-[#8779fb] p-1.5 w-20">اليوم</th>
                            <th className="border border-[#8779fb] p-1.5 w-24">التاريخ</th>
                            <th className="border border-[#8779fb] p-1.5">المناوب</th>
                            {showSupervisorSig && <th className="border border-[#8779fb] p-1.5 w-28">التوقيع</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {week.days.map((day, rowIdx) => (
                            <tr key={day.date || day.dayName} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#f5f3ff]'}>
                              <td className="border border-[#ddd6fe] p-1.5 font-bold bg-[#ede9fe] text-[#4c1d95] text-center">{day.dayName}</td>
                              <td className="border border-[#ddd6fe] p-1.5 text-center text-slate-500 text-[10px]">{day.date || '—'}</td>
                              <td className="border border-[#ddd6fe] p-1.5 align-top">
                                {day.supervisors.length === 0
                                  ? <span className="text-slate-400 italic">لم يتم التعيين</span>
                                  : <div className="flex flex-col gap-1">
                                      {day.supervisors.map((sup, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5">
                                          <span className="w-4 h-4 rounded-full bg-[#e5e1fe] text-[#655ac1] text-[9px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                                          <span className="font-bold text-slate-800">{sup.name}</span>
                                        </div>
                                      ))}
                                    </div>}
                              </td>
                              {showSupervisorSig && <td className="border border-[#ddd6fe] p-1.5"></td>}
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

              {/* Print button */}
              <div className="flex justify-end gap-3">
                <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                  إلغاء
                </button>
                <button
                  onClick={handlePrintSchedule}
                  className="flex items-center gap-2 bg-[#8779fb] hover:bg-[#655ac1] text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                  <Printer size={18} /> طباعة الجدول
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════ TAB 2: Daily Report Template ═══════════════ */}
          {activeTab === 'report' && (
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-5">
              {/* Preview of blank report */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-[#655ac1] pb-3 mb-4">
                  <div className="text-[10px] font-bold text-slate-500 leading-relaxed">
                    <div>المملكة العربية السعودية | وزارة التعليم</div>
                    <div>{schoolInfo.region || ''}</div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-[#655ac1]">نموذج تقرير المناوبة اليومية</p>
                    <p className="text-xs font-bold text-[#8779fb] mt-1">{schoolInfo.schoolName}</p>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 text-left">
                    <div>العام الدراسي: {schoolInfo.academicYear || '........'}</div>
                  </div>
                </div>

                {/* Meta boxes */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {['اليوم', 'التاريخ الميلادي', 'التاريخ الهجري', 'المدرسة'].map(l => (
                    <div key={l} className="border border-[#ddd6fe] rounded-lg p-2 text-center">
                      <p className="text-[9px] font-bold text-slate-400 mb-1">{l}</p>
                      <p className="text-xs font-black text-slate-700">
                        {l === 'المدرسة' ? schoolInfo.schoolName : '............'}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Staff table – 2 rows */}
                <div className="mb-3">
                  <div className="bg-[#8779fb] text-white text-xs font-black px-3 py-1.5 rounded-t-lg">أولاً: المناوبون</div>
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
                  <div className="bg-[#8779fb] text-white text-xs font-black px-3 py-1.5 rounded-t-lg">ثانياً: المتأخرون</div>
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
                  <div className="bg-[#8779fb] text-white text-xs font-black px-3 py-1.5 rounded-t-lg">ثالثاً: المخالفون</div>
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
                  className="flex items-center gap-2 bg-[#8779fb] hover:bg-[#655ac1] text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
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
