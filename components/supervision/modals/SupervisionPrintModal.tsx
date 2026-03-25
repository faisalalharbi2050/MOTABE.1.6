import React, { useState } from 'react';
import { X, Printer, Edit, PenLine, FileText, Eye, EyeOff } from 'lucide-react';
import { SchoolInfo, SupervisionScheduleData } from '../../../types';
import { getSupervisionPrintData, DAY_NAMES } from '../../../utils/supervisionUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supervisionData: SupervisionScheduleData;
  setSupervisionData: React.Dispatch<React.SetStateAction<SupervisionScheduleData>>;
  schoolInfo: SchoolInfo;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const SupervisionPrintModal: React.FC<Props> = ({
  isOpen, onClose, supervisionData, setSupervisionData, schoolInfo, showToast
}) => {
  const [footerText, setFooterText] = useState(supervisionData.footerText || '');
  const [editingFooter, setEditingFooter] = useState(false);
  const [showSupervisorSig, setShowSupervisorSig] = useState(true);
  const [showFollowUpSig, setShowFollowUpSig] = useState(true);

  if (!isOpen) return null;

  const printData = getSupervisionPrintData(supervisionData, schoolInfo);
  const hasData = printData.days.some(d => d.supervisors.length > 0);

  const handleSaveFooter = () => {
    setEditingFooter(false);
    setSupervisionData(prev => ({ ...prev, footerText }));
    showToast('تم حفظ التذييل', 'success');
  };

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
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Tajawal', 'Arial', sans-serif; padding: 40px; direction: rtl; background: #fff; }

    .print-container { max-width: 100%; margin: 0 auto; }

    .header-wrapper { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; }

    .header-right { width: 33%; text-align: right; font-weight: bold; font-size: 12px; color: #1e293b; line-height: 1.8; }

    .header-center { width: 33%; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .logo-circle { width: 56px; height: 56px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; }
    .logo-text { font-size: 9px; color: #94a3b8; }
    .header-title { font-size: 18px; font-weight: 900; color: #1e293b; margin-bottom: 4px; }

    .header-left { width: 33%; text-align: left; font-weight: bold; font-size: 12px; color: #1e293b; line-height: 1.8; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
    th { background-color: #f1f5f9; color: #1e293b; border: 1px solid #94a3b8; padding: 12px; font-weight: bold; }
    td { border: 1px solid #94a3b8; padding: 10px; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .day-header { background-color: #e2e8f0 !important; font-weight: 900; color: #334155; border: 2px solid #94a3b8; }

    .empty-state { color: #94a3b8; font-style: italic; }

    .footer { margin-top: 40px; text-align: center; font-size: 14px; font-weight: bold; color: #475569; padding-top: 20px; border-top: 2px dashed #94a3b8; }

    .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding: 0 40px; font-weight: bold; font-size: 14px; color: #334155; }
    .sig-box { text-align: center; width: 200px; }
    .sig-line { margin-top: 30px; border-top: 1px dotted #94a3b8; }

    @media print {
      body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header-wrapper { border-bottom: 2px solid #1e293b !important; }
      th { background-color: #f1f5f9 !important; color: #1e293b !important; }
      .day-header { background-color: #e2e8f0 !important; border: 2px solid #94a3b8 !important; }
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

  <div style="margin-top: 50px; padding-right: 40px; font-weight: bold; font-size: 14px; color: #334155; text-align: right;">
    <p>مدير المدرسة / ${schoolInfo.principal || '............................'}</p>
    <p style="margin-top: 30px; border-top: 1px dotted #94a3b8; padding-top: 4px;">التوقيع</p>
  </div>
  </div>

  <script>
    document.fonts.ready.then(() => { window.print(); });
    setTimeout(() => { window.print(); }, 1200);
  </script>
</body>
</html>
    `);

    printWindow.document.close();
    showToast('تم فتح نافذة الطباعة', 'success');
  };

  // بناء خريطة التوقيعات للمعاينة الداخلية
  const previewSigMap = buildSigMap();

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* الهيدر */}
        <div className="bg-white border-b border-slate-100 px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Printer size={26} className="text-[#655ac1]" />
            <div>
              <h2 className="text-xl font-black text-slate-800">طباعة الإشراف</h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">معاينة وطباعة جدول الإشراف اليومي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* شريط أزرار الطباعة */}
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 gap-4">
          <p className="text-sm font-black text-slate-600">اختر نوع الطباعة:</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePrint(false)}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white border-2 border-slate-200 hover:border-[#655ac1]/50 text-slate-700 hover:text-[#655ac1] font-bold transition-all shadow-sm hover:shadow active:scale-95"
            >
              <FileText size={18} />
              <span>طباعة بدون توقيع</span>
            </button>
            <button
              onClick={() => handlePrint(true)}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-[#655ac1] hover:bg-[#5046a0] text-white font-bold transition-all shadow-md shadow-[#655ac1]/25 hover:shadow-[#655ac1]/40 active:scale-95"
            >
              <PenLine size={18} />
              <span>الطباعة بالتوقيع الإلكتروني</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* خيارات الأعمدة */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
            <div className="flex items-start gap-2">
              <Eye size={15} className="text-[#655ac1] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-black text-slate-700">أعمدة التوقيع في المطبوعة</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  يمكنك إخفاء أعمدة التوقيع من الجدول المطبوع — مفيد عند الطباعة قبل اكتمال التوقيعات
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setShowSupervisorSig(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  showSupervisorSig
                    ? 'bg-white border-[#655ac1] text-[#655ac1] shadow-sm'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                }`}
              >
                {showSupervisorSig ? <Eye size={14}/> : <EyeOff size={14}/>}
                عمود توقيع المشرف
              </button>
              <button
                onClick={() => setShowFollowUpSig(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  showFollowUpSig
                    ? 'bg-white border-[#655ac1] text-[#655ac1] shadow-sm'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                }`}
              >
                {showFollowUpSig ? <Eye size={14}/> : <EyeOff size={14}/>}
                عمود توقيع المتابع
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-5">

            {/* بطاقة التذييل */}
            <div className="border border-[#655ac1]/20 bg-[#655ac1]/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Edit size={15} className="text-[#655ac1]" />
                  <label className="text-sm font-black text-[#655ac1]">التذييل / الملاحظات</label>
                </div>
                <button
                  onClick={() => editingFooter ? handleSaveFooter() : setEditingFooter(true)}
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

            {/* المعاينة */}
            {!hasData ? (
              <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                <Printer size={36} className="mx-auto mb-3 text-slate-300" />
                <p className="font-bold text-slate-500">لا يوجد جدول إشراف لطباعته</p>
                <p className="text-sm mt-1">يُرجى إنشاء جدول الإشراف أولاً</p>
              </div>
            ) : (
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
                    {printData.days.map(day => {
                      const daySigMap = previewSigMap[day.dayName] || { supSigs: {}, followUpSig: '' };
                      return (
                        <React.Fragment key={day.dayName}>
                          {day.supervisors.length === 0 ? (
                            <tr>
                              <td className="border border-slate-300 p-2 font-bold bg-slate-50">{day.dayName}</td>
                              <td className="border border-slate-300 p-2 text-slate-400 text-center" colSpan={2 + (showSupervisorSig ? 1 : 0) + 1 + (showFollowUpSig ? 1 : 0)}>لم يتم التعيين</td>
                            </tr>
                          ) : (
                            day.supervisors.map((sup, idx) => {
                              const supSigData = daySigMap.supSigs[sup.name] || '';
                              const fuSigData = daySigMap.followUpSig || '';
                              return (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  {idx === 0 && (
                                    <td className="border border-slate-300 p-2 font-bold bg-slate-50 text-center" rowSpan={day.supervisors.length}>
                                      {day.dayName}
                                    </td>
                                  )}
                                  <td className="border border-slate-300 p-2 text-right">{sup.name}</td>
                                  <td className="border border-slate-300 p-2 text-center text-slate-600">{sup.locations || '-'}</td>
                                  {showSupervisorSig && (
                                    <td className="border border-slate-300 p-2 text-center">
                                      {supSigData
                                        ? <img src={supSigData} alt="توقيع" className="h-6 max-w-[60px] object-contain mx-auto" />
                                        : null}
                                    </td>
                                  )}
                                  {idx === 0 && (
                                    <td className="border border-slate-300 p-2 text-center text-amber-700 font-bold" rowSpan={day.supervisors.length}>
                                      {day.followUpSupervisor || '—'}
                                    </td>
                                  )}
                                  {showFollowUpSig && idx === 0 && (
                                    <td className="border border-slate-300 p-2 text-center" rowSpan={day.supervisors.length}>
                                      {fuSigData
                                        ? <img src={fuSigData} alt="توقيع" className="h-6 max-w-[60px] object-contain mx-auto" />
                                        : null}
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-8 flex justify-start pr-10">
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-800">مدير المدرسة / {schoolInfo.principal || '............................'}</p>
                    <p className="font-bold text-xs text-slate-400 mt-5 border-t border-dotted border-slate-300 pt-1">التوقيع</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisionPrintModal;
