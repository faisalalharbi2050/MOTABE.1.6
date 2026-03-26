import React, { useState } from 'react';
import { X, Printer, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import { SchoolInfo, DutyReportRecord, DutyDayAssignment, DutyStudentLate, DutyStudentViolation } from '../../../types';

const DAY_NAMES_AR: Record<string, string> = {
  sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت'
};

const toHijri = (dateStr: string) => {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  } catch { return ''; }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schoolInfo: SchoolInfo;
  /** The day assignment to print (day, date, staffAssignments) */
  dayAssignment: DutyDayAssignment | null;
  /** All submitted reports for the day */
  dayReports: DutyReportRecord[];
  /** Print blank template (no data) */
  blankTemplate?: boolean;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const MIN_LATE_ROWS = 5;
const MIN_VIOLATION_ROWS = 5;

const DutyDailyReportModal: React.FC<Props> = ({
  isOpen, onClose, schoolInfo, dayAssignment, dayReports, blankTemplate = false, showToast
}) => {
  const [showSignatures, setShowSignatures] = useState(true);

  if (!isOpen) return null;

  const da = dayAssignment;
  const staffList = da?.staffAssignments || [];
  const dateStr = da?.date || '';
  const day = da?.day || '';
  const hijriDate = toHijri(dateStr);

  // Aggregate late + violation students from all staff reports for this day
  const allLate: DutyStudentLate[] = blankTemplate ? [] : dayReports.flatMap(r => r.lateStudents || []);
  const allViolations: DutyStudentViolation[] = blankTemplate ? [] : dayReports.flatMap(r => r.violatingStudents || []);

  // Ensure at least MIN rows for display
  const lateRows = allLate.length >= MIN_LATE_ROWS ? allLate : [...allLate, ...Array(MIN_LATE_ROWS - allLate.length).fill(null)];
  const violationRows = allViolations.length >= MIN_VIOLATION_ROWS ? allViolations : [...allViolations, ...Array(MIN_VIOLATION_ROWS - allViolations.length).fill(null)];

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const staffRowsHtml = blankTemplate
      ? Array(3).fill(0).map((_, i) => `
        <tr>
          <td>${i + 1}</td>
          <td style="text-align:right;padding-right:8px;"></td>
          <td>${showSignatures ? '<div style="height:50px;"></div>' : ''}</td>
          <td></td>
        </tr>`).join('')
      : staffList.map((sa, i) => {
          const rep = dayReports.find(r => r.staffId === sa.staffId);
          const sigHtml = rep?.signature && showSignatures
            ? `<img src="${rep.signature}" style="height:45px;max-width:120px;object-fit:contain;" />`
            : '';
          return `
          <tr>
            <td>${i + 1}</td>
            <td style="text-align:right;padding-right:8px;font-weight:bold;">${sa.staffName}</td>
            <td>${sigHtml}</td>
            <td></td>
          </tr>`;
        }).join('');

    const makeLateRow = (s: DutyStudentLate | null, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td style="text-align:right;padding-right:4px;">${s?.studentName || ''}</td>
        <td>${s?.gradeAndClass || ''}</td>
        <td>${s?.exitTime || ''}</td>
        <td>${s?.actionTaken || ''}</td>
        <td>${s?.notes || ''}</td>
      </tr>`;

    const makeViolationRow = (s: DutyStudentViolation | null, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td style="text-align:right;padding-right:4px;">${s?.studentName || ''}</td>
        <td>${s?.gradeAndClass || ''}</td>
        <td>${s?.violationType || ''}</td>
        <td>${s?.actionTaken || ''}</td>
        <td>${s?.notes || ''}</td>
      </tr>`;

    printWin.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>تقرير المناوبة اليومية</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Tajawal', sans-serif; direction: rtl; background: #fff; font-size: 10px; color: #1e293b; }
  @page { size: A4; margin: 12mm 15mm; }

  /* Header */
  .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #655ac1; padding-bottom: 8px; margin-bottom: 10px; }
  .doc-header .logo-area { text-align: center; }
  .doc-title { font-size: 14px; font-weight: 900; color: #655ac1; text-align: center; }
  .doc-subtitle { font-size: 10px; font-weight: bold; color: #655ac1; text-align: center; margin-top: 2px; }
  .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 8px; }
  .meta-box { border: 1px solid #ddd6fe; border-radius: 4px; padding: 4px 6px; text-align: center; }
  .meta-box label { font-size: 8px; font-weight: bold; color: #64748b; display: block; }
  .meta-box span { font-size: 10px; font-weight: 900; color: #1e293b; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9.5px; }
  .section-title { font-size: 11px; font-weight: 900; color: white; padding: 4px 8px; border-radius: 4px 4px 0 0; display: block; margin-top: 6px; }
  .section-title.purple { background: #655ac1; }
  .section-title.blue { background: #3b82f6; }
  .section-title.rose { background: #e11d48; }
  th { background: #f3f0ff; color: #4c1d95; border: 1px solid #c4b5fd; padding: 4px 4px; font-weight: bold; text-align: center; }
  td { border: 1px solid #ddd6fe; padding: 4px 4px; text-align: center; vertical-align: middle; min-height: 18px; }
  tr:nth-child(even) td { background: #f9f7ff; }
  .sig-cell { min-height: 50px; height: 50px; }

  /* Footer */
  .doc-footer { margin-top: 10px; border-top: 1px dashed #c4b5fd; padding-top: 6px; }
  .footer-text { font-size: 9px; font-weight: bold; color: #64748b; text-align: center; margin-bottom: 10px; }
  .sig-block { display: flex; justify-content: flex-start; gap: 40px; padding: 0 12px; }
  .sig-person { text-align: center; }
  .sig-name { font-size: 10px; font-weight: 900; color: #334155; }
  .sig-line { display: block; border-top: 1px dotted #94a3b8; min-width: 130px; margin-top: 20px; padding-top: 3px; font-size: 9px; color: #94a3b8; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th { background: #f3f0ff !important; }
  }
</style>
</head>
<body>

<!-- Header -->
<div class="doc-header">
  <div>
    <div style="font-size:9px;font-weight:bold;color:#64748b;">المملكة العربية السعودية | وزارة التعليم</div>
    <div style="font-size:9px;font-weight:bold;color:#64748b;">${schoolInfo.region || ''}</div>
  </div>
  <div class="logo-area">
    <div class="doc-title">نموذج تقرير المناوبة اليومية</div>
    <div class="doc-subtitle">${schoolInfo.schoolName || ''}</div>
  </div>
  <div style="text-align:left;font-size:9px;font-weight:bold;color:#475569;">
    <div>العام الدراسي: ${schoolInfo.academicYear || '........'}</div>
    <div>الفصل: ${(schoolInfo as any).currentSemester || '........'}</div>
  </div>
</div>

<!-- Meta -->
<div class="meta-grid">
  <div class="meta-box"><label>اليوم</label><span>${DAY_NAMES_AR[day] || day}</span></div>
  <div class="meta-box"><label>التاريخ الميلادي</label><span>${dateStr || '............'}</span></div>
  <div class="meta-box"><label>التاريخ الهجري</label><span>${hijriDate || '............'}</span></div>
  <div class="meta-box"><label>المدرسة</label><span>${schoolInfo.schoolName || '............'}</span></div>
</div>

<!-- Staff Table -->
<span class="section-title purple">أولاً: المناوبون</span>
<table>
  <thead>
    <tr>
      <th style="width:6%;">م</th>
      <th>اسم المناوب</th>
      ${showSignatures ? '<th style="width:22%;">التوقيع الرقمي</th>' : ''}
      <th>ملاحظات</th>
    </tr>
  </thead>
  <tbody>
    ${staffRowsHtml}
  </tbody>
</table>

<!-- Late Students Table -->
<span class="section-title blue">ثانياً: المتأخرون</span>
<table>
  <thead>
    <tr>
      <th style="width:5%;">م</th>
      <th>اسم الطالب</th>
      <th style="width:14%;">الصف / الفصل</th>
      <th style="width:12%;">زمن الانصراف</th>
      <th style="width:18%;">الإجراء</th>
      <th>ملاحظات</th>
    </tr>
  </thead>
  <tbody>
    ${lateRows.map((s, i) => makeLateRow(s, i)).join('')}
  </tbody>
</table>

<!-- Violations Table -->
<span class="section-title rose">ثالثاً: المخالفون</span>
<table>
  <thead>
    <tr>
      <th style="width:5%;">م</th>
      <th>اسم الطالب</th>
      <th style="width:14%;">الصف / الفصل</th>
      <th style="width:18%;">المخالفة السلوكية</th>
      <th style="width:18%;">الإجراء</th>
      <th>ملاحظات</th>
    </tr>
  </thead>
  <tbody>
    ${violationRows.map((s, i) => makeViolationRow(s, i)).join('')}
  </tbody>
</table>

<!-- Footer -->
<div class="doc-footer">
  <div class="footer-text">سُلِّم هذا النموذج لوكيل الشؤون التعليمية</div>
  <div class="sig-block">
    <div class="sig-person">
      <div class="sig-name">مدير المدرسة / ${schoolInfo.principal || '............................'}</div>
      <span class="sig-line">التوقيع</span>
    </div>
    <div class="sig-person">
      <div class="sig-name">وكيل الشؤون التعليمية / ${(schoolInfo as any).educationalAgent || '............................'}</div>
      <span class="sig-line">التوقيع</span>
    </div>
  </div>
</div>

</body>
</html>`);
    printWin.document.close();
    setTimeout(() => printWin.print(), 300);
    showToast('تم فتح نافذة طباعة التقرير', 'success');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" dir="rtl" onClick={onClose}>
      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <FileText size={24} className="text-[#655ac1]" />
            <div>
              <h2 className="text-xl font-black text-slate-800">
                {blankTemplate ? 'قالب تقرير المناوبة (فارغ)' : `تقرير يوم ${DAY_NAMES_AR[day] || day}`}
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                {blankTemplate ? 'نموذج قابل للطباعة للاستخدام اليدوي' : `${hijriDate} | ${dateStr}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Signature toggle */}
            <button
              onClick={() => setShowSignatures(v => !v)}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
            >
              {showSignatures ? <ToggleRight size={18} className="text-[#655ac1]" /> : <ToggleLeft size={18} />}
              التوقيعات
            </button>
            <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Preview Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Meta info card */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <h3 className="text-base font-black text-slate-800 mb-4">بيانات اليوم</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'اليوم', val: DAY_NAMES_AR[day] || day },
                { label: 'التاريخ الميلادي', val: dateStr || '—' },
                { label: 'التاريخ الهجري', val: hijriDate || '—' },
                { label: 'المدرسة', val: schoolInfo.schoolName || '—' },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">{item.label}</p>
                  <p className="text-xs font-black text-slate-800">{item.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Staff table card */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <h3 className="text-base font-black text-slate-800 mb-4">أولاً: المناوبون</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="py-3 px-3 text-center font-black w-10">م</th>
                    <th className="py-3 px-4 text-right font-black">الاسم</th>
                    {showSignatures && <th className="py-3 px-3 text-center font-black w-32">التوقيع الرقمي</th>}
                    <th className="py-3 px-3 text-center font-black">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {blankTemplate
                    ? Array(3).fill(null).map((_, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-center text-slate-400">{i + 1}</td>
                        <td className="py-3 px-4"></td>
                        {showSignatures && <td className="py-3 px-3 h-12"></td>}
                        <td className="py-3 px-3"></td>
                      </tr>
                    ))
                    : staffList.map((sa, i) => {
                        const rep = dayReports.find(r => r.staffId === sa.staffId);
                        return (
                          <tr key={sa.staffId} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 text-center text-slate-400">{i + 1}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{sa.staffName}</td>
                            {showSignatures && (
                              <td className="py-3 px-3 h-12 text-center">
                                {rep?.signature
                                  ? <img src={rep.signature} className="h-10 max-w-[120px] object-contain mx-auto" alt="توقيع" />
                                  : <span className="text-slate-300">—</span>}
                              </td>
                            )}
                            <td className="py-3 px-3"></td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Late students card */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <h3 className="text-base font-black text-slate-800 mb-4">ثانياً: المتأخرون</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="py-3 px-3 text-center font-black w-8">م</th>
                    <th className="py-3 px-4 text-right font-black">اسم الطالب</th>
                    <th className="py-3 px-3 text-center font-black">الصف/الفصل</th>
                    <th className="py-3 px-3 text-center font-black">زمن الانصراف</th>
                    <th className="py-3 px-3 text-center font-black">الإجراء</th>
                    <th className="py-3 px-3 text-center font-black">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lateRows.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-center text-slate-400">{i + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{(s as DutyStudentLate)?.studentName || ''}</td>
                      <td className="py-3 px-3 text-center">{(s as DutyStudentLate)?.gradeAndClass || ''}</td>
                      <td className="py-3 px-3 text-center">{(s as DutyStudentLate)?.exitTime || ''}</td>
                      <td className="py-3 px-3 text-center">{(s as DutyStudentLate)?.actionTaken || ''}</td>
                      <td className="py-3 px-3">{(s as DutyStudentLate)?.notes || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Violations card */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <h3 className="text-base font-black text-slate-800 mb-4">ثالثاً: المخالفون</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="py-3 px-3 text-center font-black w-8">م</th>
                    <th className="py-3 px-4 text-right font-black">اسم الطالب</th>
                    <th className="py-3 px-3 text-center font-black">الصف/الفصل</th>
                    <th className="py-3 px-3 text-center font-black">المخالفة</th>
                    <th className="py-3 px-3 text-center font-black">الإجراء</th>
                    <th className="py-3 px-3 text-center font-black">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {violationRows.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-center text-slate-400">{i + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{(s as DutyStudentViolation)?.studentName || ''}</td>
                      <td className="py-3 px-3 text-center">{(s as DutyStudentViolation)?.gradeAndClass || ''}</td>
                      <td className="py-3 px-3 text-center">{(s as DutyStudentViolation)?.violationType || ''}</td>
                      <td className="py-3 px-3 text-center">{(s as DutyStudentViolation)?.actionTaken || ''}</td>
                      <td className="py-3 px-3">{(s as DutyStudentViolation)?.notes || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer card */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-end">
              <p className="text-xs font-bold text-slate-400">سُلِّم هذا النموذج لوكيل الشؤون التعليمية</p>
              <div className="text-center">
                <p className="text-sm font-black text-slate-800">مدير المدرسة / {schoolInfo.principal || '...'.repeat(8)}</p>
                <p className="text-xs text-slate-400 mt-3 border-t border-dotted border-slate-300 pt-1">التوقيع</p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Actions */}
        <div className="bg-white border-t border-slate-100 p-4 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
            إغلاق
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-[#655ac1]/20 transition-all hover:scale-105 active:scale-95"
          >
            <Printer size={18} /> طباعة التقرير
          </button>
        </div>
      </div>
    </div>
  );
};

export default DutyDailyReportModal;
