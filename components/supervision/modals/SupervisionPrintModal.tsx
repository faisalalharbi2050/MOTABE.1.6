import React, { useState } from 'react';
import { X, Printer, Edit, PenLine, FileText } from 'lucide-react';
import { SchoolInfo, SupervisionScheduleData } from '../../../types';
import { getSupervisionPrintData, DAY_NAMES } from '../../../utils/supervisionUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supervisionData: SupervisionScheduleData;
  schoolInfo: SchoolInfo;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const SupervisionPrintModal: React.FC<Props> = ({
  isOpen, onClose, supervisionData, schoolInfo, showToast
}) => {
  const [footerText, setFooterText] = useState(supervisionData.footerText || '');
  const [editingFooter, setEditingFooter] = useState(false);
  const showSupervisorSig = true;
  const showFollowUpSig = true;

  if (!isOpen) return null;

  const printData = getSupervisionPrintData(supervisionData, schoolInfo);

  // Build a lookup map keyed by Arabic dayName: dayName -> supervisorName -> signatureData
  const buildSigMap = () => {
    const map: Record<string, { supSigs: Record<string, string>; followUpSig: string }> = {};
    supervisionData.dayAssignments.forEach(da => {
      const supSigs: Record<string, string> = {};
      da.staffAssignments.forEach(sa => { if (sa.signatureData) supSigs[sa.staffName] = sa.signatureData; });
      const key = DAY_NAMES[da.day] || da.day;
      map[key] = { supSigs, followUpSig: da.followUpSignatureData || '' };
    });
    return map;
  };

  const handlePrint = (withSignatures = false) => {
    const sigMap = withSignatures ? buildSigMap() : {};
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>جدول الإشراف اليومي - ${printData.schoolName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, 'Arial', sans-serif; padding: 40px; direction: rtl; background: #fff; }
    
    .print-container { max-width: 100%; margin: 0 auto; }
    
    .header-wrapper { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #655ac1; padding-bottom: 20px; margin-bottom: 30px; }
    
    .header-right { text-align: right; font-weight: bold; font-size: 13px; color: #334155; line-height: 1.6; }
    
    .header-center { text-align: center; }
    .logo-placeholder { width: 60px; height: 60px; background-color: #f1f5f9; border-radius: 50%; border: 2px solid #e2e8f0; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }
    .header-title { font-size: 20px; font-weight: 900; color: #655ac1; margin-bottom: 5px; }
    
    .header-left { text-align: left; font-weight: bold; font-size: 13px; color: #334155; line-height: 1.6; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
    th { background-color: #655ac1; color: white; border: 1px solid #c7d2fe; padding: 12px; font-weight: bold; }
    td { border: 1px solid #e2e8f0; padding: 10px; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .day-header { background-color: #eef2ff !important; font-weight: 900; color: #4338ca; border: 2px solid #c7d2fe; }
    
    .empty-state { color: #94a3b8; font-style: italic; }
    
    .footer { margin-top: 40px; text-align: center; font-size: 14px; font-weight: bold; color: #475569; padding-top: 20px; border-top: 2px dashed #cbd5e1; }
    
    .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding: 0 40px; font-weight: bold; font-size: 14px; color: #334155; }
    .sig-box { text-align: center; width: 200px; }
    .sig-line { margin-top: 30px; border-top: 1px dotted #94a3b8; }
    
    @media print { 
      body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
      .header-wrapper { border-bottom: 4px solid #655ac1 !important; }
      th { background-color: #655ac1 !important; color: white !important; }
      .day-header { background-color: #eef2ff !important; border: 2px solid #c7d2fe !important; }
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
        <p>${schoolInfo.region || 'إدارة التعليم بالمنطقة'}</p>
        <p>مدرسة ${printData.schoolName || '..........'}</p>
      </div>
      
      <div class="header-center">
        <div class="logo-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#655ac1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M6 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/></svg>
        </div>
        <h1 class="header-title">${printData.title}</h1>
        <div style="font-size: 11px; color: #10b981; font-weight: bold; background: #ecfdf5; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-top: 4px; border: 1px solid #34d399;">
          ${printData.semester}
        </div>
      </div>
      
      <div class="header-left">
        <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
        <p>الفصل: ${printData.semester}</p>
      </div>
    </div>

  <table>
    <thead>
      <tr>
        <th style="width: 15%;">اليوم</th>
        <th style="width: 25%;">اسم المشرف</th>
        <th style="width: 30%;">المواقع</th>
        ${showSupervisorSig ? '<th style="width: 15%;">توقيع المشرف</th>' : ''}
        <th style="width: 15%;">المشرف المتابع</th>
        ${showFollowUpSig ? '<th style="width: 15%;">توقيع المتابع</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${printData.days.map(day => {
        if (day.supervisors.length === 0) {
          return `<tr>
            <td class="day-header" style="vertical-align: middle;">${day.dayName}</td>
            <td colspan="${2 + (showSupervisorSig ? 1 : 0) + 1 + (showFollowUpSig ? 1 : 0)}" class="empty-state">لم يتم التعيين</td>
          </tr>`;
        }
        const daySigMap = sigMap[day.dayName] || { supSigs: {}, followUpSig: '' };
        return day.supervisors.map((sup, idx) => {
          const supSigData = daySigMap.supSigs[sup.name] || '';
          const fuSigData = daySigMap.followUpSig || '';
          const supSigCell = showSupervisorSig
            ? (withSignatures && supSigData
                ? `<td style="text-align:center;vertical-align:middle;padding:4px;"><img src="${supSigData}" style="height:36px;max-width:80px;object-fit:contain;"></td>`
                : '<td></td>')
            : '';
          const fuSigCell = showFollowUpSig && idx === 0
            ? (withSignatures && fuSigData
                ? `<td rowspan="${day.supervisors.length}" style="text-align:center;vertical-align:middle;padding:4px;"><img src="${fuSigData}" style="height:36px;max-width:80px;object-fit:contain;"></td>`
                : `<td rowspan="${day.supervisors.length}"></td>`)
            : '';
          return `
          <tr>
            ${idx === 0 ? `<td class="day-header" rowspan="${day.supervisors.length}" style="vertical-align: middle;">${day.dayName}</td>` : ''}
            <td style="text-align: right; font-weight: bold; color: #1e293b;">${sup.name}</td>
            <td style="color: #475569;">${sup.locations || '-'}</td>
            ${supSigCell}
            ${idx === 0 ? `<td rowspan="${day.supervisors.length}" style="font-weight: bold; color: #b45309; vertical-align: middle;">${day.followUpSupervisor || '\u2014'}</td>` : ''}
            ${fuSigCell}
          </tr>
        `;
        }).join('');
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>${footerText || printData.footerText}</p>
  </div>

  <div class="signatures">
    <div class="sig-box">
      <p>مدير المدرسة / ${schoolInfo.principal || '............................'}</p>
      <div class="sig-line">التوقيع</div>
    </div>
    <div class="sig-box">
      <p>الختم الرسمي</p>
      <div class="sig-line"></div>
    </div>
  </div>
  </div>
</body>
</html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
    showToast('تم فتح نافذة الطباعة', 'success');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#e5e1fe] rounded-2xl flex items-center justify-center shadow-sm">
              <Printer size={22} className="text-[#655ac1]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">طباعة الإشراف</h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">معاينة وطباعة جدول الإشراف اليومي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Print buttons sub-bar */}
        <div className="bg-[#655ac1]/5 border-b border-[#655ac1]/10 px-5 py-2.5 flex items-center justify-between shrink-0">
          <p className="text-xs font-bold text-[#655ac1]/70">اختر نوع الطباعة</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrint(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95"
            >
              <FileText size={14} /> طباعة بدون توقيع
            </button>
            <button
              onClick={() => handlePrint(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#655ac1] hover:bg-[#5046a0] text-white text-xs font-bold transition-all shadow-md shadow-[#655ac1]/20 hover:shadow-[#655ac1]/30 active:scale-95"
            >
              <PenLine size={14} /> طباعة موقعًا
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            {/* Footer / Notes card */}
            <div className="border border-[#655ac1]/20 bg-[#655ac1]/5 rounded-2xl p-4 mb-5">
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
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="text-center mb-4 pb-4 border-b-2 border-double border-slate-300">
                <h4 className="text-lg font-black text-slate-800 mb-1">{printData.schoolName}</h4>
                <h5 className="text-sm font-bold text-slate-500">{printData.title}</h5>
              </div>

              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="border border-slate-300 p-2">اليوم</th>
                    <th className="border border-slate-300 p-2">المشرف</th>
                    <th className="border border-slate-300 p-2">المواقع</th>
                    {showSupervisorSig && <th className="border border-slate-300 p-2">توقيع المشرف</th>}
                    <th className="border border-slate-300 p-2">المشرف المتابع</th>
                    {showFollowUpSig && <th className="border border-slate-300 p-2">توقيع المتابع</th>}
                  </tr>
                </thead>
                <tbody>
                  {printData.days.map(day => (
                    <React.Fragment key={day.dayName}>
                      {day.supervisors.length === 0 ? (
                        <tr>
                          <td className="border border-slate-300 p-2 font-bold bg-slate-50">{day.dayName}</td>
                          <td className="border border-slate-300 p-2 text-slate-400 text-center" colSpan={2 + (showSupervisorSig ? 1 : 0) + 1 + (showFollowUpSig ? 1 : 0)}>لم يتم التعيين</td>
                        </tr>
                      ) : (
                        day.supervisors.map((sup, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            {idx === 0 && (
                              <td className="border border-slate-300 p-2 font-bold bg-slate-50 text-center" rowSpan={day.supervisors.length}>
                                {day.dayName}
                              </td>
                            )}
                            <td className="border border-slate-300 p-2 text-right">{sup.name}</td>
                            <td className="border border-slate-300 p-2 text-center text-slate-600">{sup.locations || '-'}</td>
                            {showSupervisorSig && <td className="border border-slate-300 p-2"></td>}
                            {idx === 0 && (
                              <td className="border border-slate-300 p-2 text-center text-amber-700 font-bold" rowSpan={day.supervisors.length}>
                                {day.followUpSupervisor || '—'}
                              </td>
                            )}
                            {showFollowUpSig && idx === 0 && (
                              <td className="border border-slate-300 p-2 border-r" rowSpan={day.supervisors.length}></td>
                            )}
                          </tr>
                        ))
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              <div className="mt-8 text-left pl-10">
                 <p className="font-bold text-sm text-slate-800 tracking-wide mb-3">مدير المدرسة: {schoolInfo.principal || '----------------'}</p>
                 <p className="font-bold text-sm text-slate-800 tracking-wide">التوقيع: ..........................</p>
              </div>
            </div>
            

          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisionPrintModal;
