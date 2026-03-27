import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, LayoutGrid, CheckSquare, CheckCircle } from 'lucide-react';
import { SchoolInfo } from '../types';

export interface PrintAbsentTeacher {
  id: string;
  teacherName: string;
  absenceType: 'full' | 'partial';
  periods: {
    periodNumber: number;
    className: string;
    subjectName: string;
  }[];
}

export interface PrintWaitingAssignment {
  absentTeacherId: string;
  periodNumber: number;
  substituteTeacherName: string;
  signatureData?: string;
}

export interface DailyWaitingPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayName: string;
  gregorianDateStr: string;
  hijriDateStr: string;
  schoolInfo: SchoolInfo;
  absentTeachers: PrintAbsentTeacher[];
  assignments: PrintWaitingAssignment[];
  targetTeacherId?: string | null;
}

const PRINT_CSS = `
  /* Screen & Print Shared Styles */
  #dw-print-modal .table-container {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-family: inherit;
  }
  #dw-print-modal .table-container th {
    background-color: #f1f5f9 !important;
    -webkit-print-color-adjust: exact;
    color-adjust: exact;
    print-color-adjust: exact;
    padding: 6px;
    border: 1px solid #94a3b8;
    font-weight: bold;
    font-size: 11px;
    text-align: right;
  }
  #dw-print-modal .table-container td {
    padding: 4px;
    border: 1px solid #94a3b8;
    font-size: 11px;
    height: 24px;
  }
    
  #dw-print-modal .header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    border-bottom: 2px solid #334155;
    padding-bottom: 10px;
  }
    
  #dw-print-modal .signature-area {
    display: flex;
    justify-content: flex-end;
    margin-top: 15px;
    padding-top: 10px;
  }

  /* Print Only Styles */
  @media print {
    body * { visibility: hidden; }
    #dw-print-modal, #dw-print-modal * { visibility: visible; }
    #dw-print-modal {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      background: white;
      margin: 0 !important;
      padding: 0 !important;
    }
    .no-print { display: none !important; }
    
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    
    .print-page {
      page-break-after: always;
      width: 100%;
    }
    .print-page:last-child {
      page-break-after: auto;
    }
    
    #dw-print-modal .print-item-wrapper {
      page-break-inside: avoid;
      margin-bottom: 20px;
      padding: 0;
      border: none;
    }
    #dw-print-modal.separate-pages .print-item-wrapper {
      page-break-before: always;
      margin-bottom: 0;
    }
    #dw-print-modal.separate-pages .print-item-wrapper:first-child {
      page-break-before: auto;
    }
  }
`;

function injectPrintCSS() {
  if (!document.getElementById('dw-print-css')) {
    const s = document.createElement('style');
    s.id = 'dw-print-css';
    s.textContent = PRINT_CSS;
    document.head.appendChild(s);
  }
}

const DailyWaitingPrintModal: React.FC<DailyWaitingPrintModalProps> = ({
  isOpen,
  onClose,
  dayName,
  gregorianDateStr,
  hijriDateStr,
  schoolInfo,
  absentTeachers,
  assignments,
  targetTeacherId
}) => {
  const [activeTab, setActiveTab] = useState<'print' | 'blank'>('print');
  const [separatePages, setSeparatePages] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      injectPrintCSS();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecutePrint = () => {
    window.print();
  };

  const getMissingText = (teacherName: string, type: 'full' | 'partial') => {
    const absenceStr = type === 'partial' ? ' جزئياً' : '';
    return `نظراً لغياب زميلنا المعلم ( ${teacherName || ''} )${absenceStr} يوم ( ${dayName} ) ، الموافق ${hijriDateStr} هـ`;
  };

  // Pre-filter teachers if targetTeacherId is specified
  const filteredTeachers = targetTeacherId 
    ? absentTeachers.filter(t => t.id === targetTeacherId) 
    : absentTeachers;

  // We chunk them into groups of 4 for printing to minimize waste
  const chunks = [];
  for (let i = 0; i < filteredTeachers.length; i += 4) {
    chunks.push(filteredTeachers.slice(i, i + 4));
  }

  const renderPrintHeader = () => (
    <div className="header-section">
      <div className="text-right">
        <h2 className="font-bold text-lg mb-1">{schoolInfo.schoolName || 'اسم المدرسة'}</h2>
        <p className="text-sm font-semibold text-slate-600">العام الدراسي: {schoolInfo.academicYear || '—'}</p>
      </div>
      <div className="text-center flex-1">
        <h1 className="text-xl font-black text-slate-800 border-b-2 border-slate-800 inline-block pb-1 px-4">نموذج الانتظار اليومي</h1>
      </div>
      <div className="text-left text-sm font-semibold text-slate-600 space-y-1">
        <p>اليوم: {dayName}</p>
        <p>الموافق: {hijriDateStr} هـ</p>
        <p>الموافق: {gregorianDateStr} م</p>
      </div>
    </div>
  );

  const renderPrintFooter = () => (
    <div className="signature-area">
      <div className="text-center w-48">
        <p className="font-bold text-sm mb-8">يعتمد مدير المدرسة</p>
        <div className="border-b border-dashed border-slate-400 w-32 mx-auto mb-2"></div>
        <p className="text-sm font-bold">{schoolInfo.principal || '—'}</p>
      </div>
    </div>
  );

  const renderTeacherTable = (t: PrintAbsentTeacher, showHeader = true) => {
    const tableRows = [];
    // We want 7 rows minimum
    for (let i = 1; i <= 7; i++) {
      const periodInfo = t.periods.find(p => p.periodNumber === i);
      let className = '';
      let subjectName = '';
      let subName = '';
      let signatureStr = '';

      if (periodInfo) {
        className = periodInfo.className;
        subjectName = periodInfo.subjectName;
        const asgn = assignments.find(a => a.absentTeacherId === t.id && a.periodNumber === i);
        if (asgn) {
          subName = asgn.substituteTeacherName;
          signatureStr = asgn.signatureData || '';
        }
      }

      tableRows.push(
        <tr key={i}>
          <td className="text-center font-bold text-slate-800 w-16">{i}</td>
          <td className="text-center w-32">{className}</td>
          <td className="text-center w-32">{subjectName}</td>
          <td className="text-right font-semibold text-slate-800 w-48">{subName}</td>
          <td className="text-center w-24">
            {signatureStr ? (
              <span className="text-[10px] text-green-700 font-bold px-2 py-0.5 bg-green-50 rounded-full border border-green-200">
                موقّع إلكترونياً
              </span>
            ) : null}
          </td>
          <td></td>
        </tr>
      );
    }

    return (
      <div key={t.id} className="print-item-wrapper bg-white">
        {showHeader && renderPrintHeader()}
        
        <div className="mb-4 bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#655ac1]"></div>
          <p className="text-sm font-bold text-slate-800">
            {getMissingText(t.teacherName, t.absenceType)}
          </p>
        </div>

        <table className="table-container">
          <thead>
            <tr>
              <th className="text-center">الحصة</th>
              <th className="text-center">الصف والفصل</th>
              <th className="text-center">المادة</th>
              <th className="text-right">المعلم المنتظر</th>
              <th className="text-center">التوقيع</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {tableRows}
          </tbody>
        </table>

        {renderPrintFooter()}
      </div>
    );
  };

  const renderBlankHeader = () => (
    <div className="flex items-start justify-between mb-4 border-b-2 border-slate-800 pb-2">
      <div className="text-right w-1/3 space-y-1">
        <p className="font-bold text-sm">الإدارة العامة للتعليم بمنطقة {schoolInfo.region || '___'}</p>
        <p className="text-sm font-semibold text-slate-800">المدرسة: {schoolInfo.schoolName || '___'}</p>
        <p className="text-sm font-semibold text-slate-800">الفصل الدراسي: {schoolInfo.academicYear || '___'}</p>
      </div>
      <div className="text-center w-1/3 flex flex-col items-center justify-center">
        {schoolInfo.logo ? (
          <img src={schoolInfo.logo} alt="شعار التعليم" className="h-14 w-14 object-contain mb-2" />
        ) : (
          <div className="h-14 w-14 border-2 border-slate-300 rounded-full flex items-center justify-center mb-2">
             <span className="text-[10px] text-slate-400">شعار</span>
          </div>
        )}
        <h1 className="text-lg font-black text-slate-800 inline-block px-4">نموذج الانتظار اليومي</h1>
      </div>
      <div className="text-left w-1/3 text-sm font-semibold text-slate-800 space-y-1">
        <p>اليوم: {dayName}</p>
        <p>الموافق: {hijriDateStr} هـ</p>
        <p>الموافق: {gregorianDateStr} م</p>
      </div>
    </div>
  );

  const renderBlankTableGroup = (index: number) => {
    const tableRows = [];
    for (let i = 1; i <= 7; i++) {
        tableRows.push(
            <tr key={i}>
              <td className="text-center font-bold text-slate-800 w-16">{i}</td>
              <td className="text-center w-32">&nbsp;</td>
              <td className="text-center w-32">&nbsp;</td>
              <td className="text-right font-semibold text-slate-800 w-48">&nbsp;</td>
              <td className="text-center w-24">&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
        );
    }

    return (
      <div key={index}>
        <div className="mb-2 bg-slate-50 border border-slate-200 p-2 rounded-lg flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></div>
          <p className="text-xs font-bold text-slate-800 w-full flex items-center flex-wrap gap-y-1 gap-x-1 leading-relaxed">
            <span>نظراً لغياب زميلنا المعلم (</span>
            <span className="inline-block border-b border-dashed border-slate-400 w-32"></span>
            <span>)</span>
            <span className="inline-flex items-center gap-1 mx-2">
              <span className="w-3 h-3 border border-slate-400 rounded-sm inline-block"></span>
              <span>يوم كامل</span>
            </span>
            <span className="inline-flex items-center gap-1 mx-2">
              <span className="w-3 h-3 border border-slate-400 rounded-sm inline-block"></span>
              <span>جزئي</span>
            </span>
            <span>اليوم</span>
            <span className="inline-block border-b border-dashed border-slate-400 w-24"></span>
            <span>، الموافق</span>
            <span className="inline-block border-b border-dashed border-slate-400 w-8"></span>
            <span>/</span>
            <span className="inline-block border-b border-dashed border-slate-400 w-8"></span>
            <span>/</span>
            <span className="inline-block border-b border-dashed border-slate-400 w-16"></span>
            <span>14 هـ.</span>
          </p>
        </div>

        <table className="table-container mt-0">
          <thead>
            <tr>
              <th className="text-center">الحصة</th>
              <th className="text-center">الصف والفصل</th>
              <th className="text-center">المادة</th>
              <th className="text-right">المعلم المنتظر</th>
              <th className="text-center">التوقيع</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {tableRows}
          </tbody>
        </table>
      </div>
    );
  };

  const renderBlankPage = () => {
    return (
      <div className="print-item-wrapper bg-white !mb-0 flex flex-col h-full print:px-4">
        {renderBlankHeader()}
        
        <div className="flex-1 flex flex-col justify-start">
           {[1, 2, 3].map(idx => (
             <div key={idx} className="mb-6">
               {renderBlankTableGroup(idx)}
             </div>
           ))}
        </div>

        <div className="signature-area mt-4 border-t border-slate-200 pt-4">
          <div className="text-center w-48 mr-auto">
            <p className="font-bold text-sm mb-6">يعتمد مدير المدرسة</p>
            <div className="border-b border-dashed border-slate-400 w-32 mx-auto mb-2"></div>
            <p className="text-sm font-bold">{schoolInfo.principal || '—'}</p>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose} dir="rtl">
      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="bg-white border-b border-slate-100 px-6 py-5 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-3">
            <Printer size={26} className="text-[#655ac1]" />
            <div>
              <h2 className="text-xl font-black text-slate-800">طباعة الانتظار</h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">طباعة الانتظار اليومي أو طباعة نموذج الانتظار فارغًا</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal Tabs */}
        {!targetTeacherId ? (
          <div className="bg-white border-b border-slate-100 px-6 py-3 flex gap-3 shrink-0 no-print">
            {([
              { id: 'print', label: `طباعة جداول الانتظار (${absentTeachers.length})`, Icon: LayoutGrid },
              { id: 'blank', label: 'نموذج الانتظار اليومي (فارغ)', Icon: FileText },
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
        ) : null}

        {/* Modal Options / Filters */}
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 gap-4 no-print">
          <div>
            {activeTab === 'print' && !targetTeacherId && (
               <label className="flex items-center gap-2 cursor-pointer group">
                 <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${separatePages ? 'bg-[#655ac1] text-white' : 'bg-white border-2 border-slate-300 group-hover:border-[#655ac1]'}`}>
                   {separatePages && <CheckSquare size={13} className="text-white bg-transparent" />}
                 </div>
                 <input type="checkbox" className="hidden" checked={separatePages} onChange={e => setSeparatePages(e.target.checked)} />
                 <span className="text-sm font-bold text-slate-700 select-none">طباعة كل جدول في صفحة</span>
               </label>
            )}
          </div>
          <button
             onClick={handleExecutePrint}
             className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-[#655ac1] hover:bg-[#5046a0] text-white font-bold transition-all shadow-md shadow-[#655ac1]/25 hover:shadow-[#655ac1]/40 active:scale-95"
          >
             <Printer size={18} /> طباعة
          </button>
        </div>

        {/* Modal Content - Scrollable Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/50 flex justify-center print:bg-white print:p-0 print:overflow-visible">
           <div 
              id="dw-print-modal" 
              className={`w-full max-w-[850px] bg-white rounded-lg h-fit min-h-full flex flex-col p-8 shadow-xl print:shadow-none print:px-8 print:py-4 print:h-auto print:min-h-0 ${separatePages ? 'separate-pages' : ''}`}
           >
              {activeTab === 'blank' ? (
                 <>
                    {renderBlankPage()}
                 </>
              ) : (
                 <>
                    {filteredTeachers.length === 0 ? (
                       <div className="flex flex-col items-center justify-center h-48 no-print text-slate-400">
                          <FileText size={48} className="mb-4 opacity-50" />
                          <p className="font-bold">لا يوجد معلمين غائبين لطباعتهم</p>
                       </div>
                    ) : (
                       <div className="print-content">
                          {filteredTeachers.map((t, idx) => renderTeacherTable(t, separatePages || idx === 0))}
                       </div>
                    )}
                 </>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default DailyWaitingPrintModal;
