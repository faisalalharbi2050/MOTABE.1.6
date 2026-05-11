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
  initialTab?: 'print' | 'blank';
  colorMode?: 'color' | 'bw';
  autoPrint?: boolean;
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
    background-color: #f8fafc !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    padding: 7px 10px;
    border-bottom: 1px solid #e2e8f0;
    border-left: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
    border-top: 0;
    font-weight: 900;
    font-size: 11px;
    color: #655ac1;
    text-align: center;
  }
  #dw-print-modal .table-container td {
    padding: 10px 10px;
    border-bottom: 1px solid #f1f5f9;
    border-left: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
    border-top: 0;
    font-size: 11px;
    height: 38px;
  }
  #dw-print-modal .table-container {
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    overflow: hidden;
  }
  #dw-print-modal .official-header {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    align-items: start;
    gap: 10px;
    border-bottom: 2px solid #1e293b;
    padding-bottom: 8px;
    margin-bottom: 7px;
  }
  #dw-print-modal .header-side {
    font-size: 9.5px;
    font-weight: 800;
    line-height: 1.45;
    color: #1e293b;
  }
  #dw-print-modal .header-left { text-align: left; }
  #dw-print-modal .header-center { text-align: center; }
  #dw-print-modal .school-logo { width: 44px; height: 44px; object-fit: contain; margin-bottom: 3px; }
  #dw-print-modal .logo-placeholder { width: 44px; height: 44px; margin: 0 auto 3px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 9px; font-weight: 900; }
  #dw-print-modal .report-title { text-align: center; font-size: 18px; font-weight: 900; margin: 6px 0 8px; color: #111827; }
  #dw-print-modal .signature-box { width: 280px; border: 0; border-radius: 0; padding: 10px 0; background: #fff; }
  #dw-print-modal .signature-name { font-size: 12px; font-weight: 900; margin-bottom: 20px; }
  #dw-print-modal .signature-name span { color: #64748b; }
  #dw-print-modal .signature-line { border-top: 1px solid #94a3b8; padding-top: 6px; min-height: 30px; font-size: 11px; font-weight: 900; color: #475569; }
  #dw-print-modal .absence-note { white-space: nowrap; overflow: hidden; text-overflow: clip; }
  #dw-print-modal .blank-page {
    min-height: auto;
  }
  #dw-print-modal .blank-page .official-header {
    padding-bottom: 5px;
    margin-bottom: 4px;
  }
  #dw-print-modal .blank-page .report-title {
    font-size: 16px;
    margin: 3px 0 5px;
  }
  #dw-print-modal .blank-table-group {
    margin-bottom: 18px;
    padding-bottom: 12px;
    border-bottom: 1.5px dashed #cbd5e1;
  }
  #dw-print-modal .blank-table-group:last-child {
    margin-bottom: 6px;
    padding-bottom: 0;
    border-bottom: 0;
  }
  #dw-print-modal .blank-table-group .absence-card {
    padding: 5px 8px;
    margin-bottom: 5px;
  }
  #dw-print-modal .blank-table-group .absence-note {
    font-size: 10px;
    line-height: 1.25;
  }
  #dw-print-modal .blank-table-group .table-container {
    margin-top: 0;
  }
  #dw-print-modal .blank-table-group .table-container th {
    padding: 4px 6px;
    font-size: 9.5px;
  }
  #dw-print-modal .blank-table-group .table-container td {
    padding: 4px 6px;
    height: 24px;
    font-size: 9.5px;
  }
  #dw-print-modal .absence-choice {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-inline: 2px;
  }
  #dw-print-modal .absence-checkbox {
    width: 11px;
    height: 11px;
    border: 1.5px solid #64748b;
    border-radius: 2px;
    display: inline-block;
    background: #fff;
    flex: 0 0 auto;
  }
  #dw-print-modal .blank-page .signature-area {
    margin-top: 2px;
    padding-top: 2px;
  }
  #dw-print-modal .blank-page .signature-name {
    margin-bottom: 12px;
  }
  #dw-print-modal .blank-page .signature-line {
    min-height: 20px;
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
  .dw-print-auto-source {
    position: fixed;
    inset: 0 auto auto 0;
    width: 0;
    height: 0;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
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
    .dw-print-auto-source {
      position: static !important;
      width: auto !important;
      height: auto !important;
      overflow: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }
    #dw-print-modal.bw-print, #dw-print-modal.bw-print * {
      filter: grayscale(1) !important;
      color: #111827 !important;
      box-shadow: none !important;
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
  targetTeacherId,
  initialTab = 'print',
  colorMode = 'color',
  autoPrint = false
}) => {
  const [activeTab, setActiveTab] = useState<'print' | 'blank'>(initialTab);
  const [separatePages, setSeparatePages] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      injectPrintCSS();
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen || !autoPrint) return;
    const closeAfterPrint = () => onClose();
    window.addEventListener('afterprint', closeAfterPrint, { once: true });
    const timer = window.setTimeout(() => {
      window.print();
      window.setTimeout(closeAfterPrint, 400);
    }, 120);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', closeAfterPrint);
    };
  }, [autoPrint, isOpen, onClose]);

  if (!isOpen) return null;

  const handleExecutePrint = () => {
    window.print();
  };

  const selectedDateText = String((schoolInfo as any).calendarType || '').toLowerCase() === 'gregorian'
    ? gregorianDateStr
    : hijriDateStr;

  const getMissingText = (teacherName: string, absenceType: PrintAbsentTeacher['absenceType']) => (
    `نظراً لغياب زميلنا المعلم ( ${teacherName || ''} ) يوم ( ${dayName} ) ، الموافق ( ${selectedDateText} ) - ${absenceType === 'full' ? 'غياب يوم' : 'غياب جزئي'}.`
  );

  // Pre-filter teachers if targetTeacherId is specified
  const filteredTeachers = targetTeacherId 
    ? absentTeachers.filter(t => t.id === targetTeacherId) 
    : absentTeachers;
  const printableTeachers = filteredTeachers.filter(t =>
    t.periods.some(p => assignments.some(a => a.absentTeacherId === t.id && a.periodNumber === p.periodNumber))
  );

  // We chunk them into groups of 4 for printing to minimize waste
  const chunks = [];
  for (let i = 0; i < filteredTeachers.length; i += 4) {
    chunks.push(filteredTeachers.slice(i, i + 4));
  }

  const renderPrintHeader = () => (
    <>
    <div className="official-header">
      <div className="header-side">
        <div>الإدارة العامة للتعليم</div>
        <div>{schoolInfo.region || ''}</div>
        <div>المدرسة: {schoolInfo.schoolName || 'اسم المدرسة'}</div>
      </div>
      <div className="header-center">
        {schoolInfo.logo ? (
          <img src={schoolInfo.logo} alt="شعار" className="school-logo" />
        ) : (
          <div className="logo-placeholder">شعار</div>
        )}
        <h1>{schoolInfo.schoolName || ''}</h1>
      </div>
      <div className="header-side header-left">
        <div>اليوم: {dayName}</div>
        <div>التاريخ: {selectedDateText}</div>
        <div>العام الدراسي: {schoolInfo.academicYear || ''}</div>
      </div>
    </div>
    <div className="report-title">نموذج الانتظار اليومي</div>
    </>
  );

  const renderPrintFooter = () => (
    <div className="signature-area">
      <div className="signature-box">
        <div className="signature-name"><span>مدير المدرسة:</span> <b>{schoolInfo.principal || ''}</b></div>
        <div className="signature-line">التوقيع</div>
      </div>
    </div>
  );

  const renderTeacherTable = (t: PrintAbsentTeacher, showHeader = true) => {
    const assignedRows = t.periods
      .map(periodInfo => ({
        periodInfo,
        assignment: assignments.find(a => a.absentTeacherId === t.id && a.periodNumber === periodInfo.periodNumber),
      }))
      .filter(row => !!row.assignment)
      .sort((a, b) => a.periodInfo.periodNumber - b.periodInfo.periodNumber);

    const tableRows = assignedRows.map(({ periodInfo, assignment }) => (
      <tr key={periodInfo.periodNumber}>
        <td className="text-center font-bold text-slate-800 w-16">{periodInfo.periodNumber}</td>
        <td className="text-center w-32">{periodInfo.className}</td>
        <td className="text-center w-32">{periodInfo.subjectName}</td>
        <td className="text-right font-semibold text-slate-800 w-48">{assignment?.substituteTeacherName || ''}</td>
        <td className="text-center w-24">
          {assignment?.signatureData ? (
            <span className="text-[10px] text-green-700 font-bold px-2 py-0.5 bg-green-50 rounded-full border border-green-200">
              موقّع إلكترونياً
            </span>
          ) : null}
        </td>
        <td></td>
      </tr>
    ));

    return (
      <div key={t.id} className="print-item-wrapper bg-white">
        {showHeader && renderPrintHeader()}
        
        <div className="mb-4 bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#655ac1]"></div>
          <p className="absence-note text-sm font-bold text-slate-800">
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

  const renderBlankHeader = () => renderPrintHeader();

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
      <div key={index} className="blank-table-group">
        <div className="absence-card bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></div>
          <p className="absence-note text-xs font-bold text-slate-800 w-full flex items-center gap-x-1 leading-relaxed">
            <span>نظراً لغياب زميلنا المعلم (</span>
            <span className="inline-block border-b border-dashed border-slate-400 w-32"></span>
            <span>) يوم (</span>
            <span className="inline-block border-b border-dashed border-slate-400 w-24"></span>
            <span>) ، الموافق (</span>
            <span className="inline-block border-b border-dashed border-slate-400 w-8"></span>
            <span>/</span>
            <span className="inline-block border-b border-dashed border-slate-400 w-8"></span>
            <span>/</span>
            <span className="inline-block border-b border-dashed border-slate-400 w-16"></span>
            <span>) - </span>
            <span>غياب (</span>
            <span className="absence-choice"><span className="absence-checkbox"></span><span>يوم</span></span>
            <span>-</span>
            <span className="absence-choice"><span className="absence-checkbox"></span><span>جزئي</span></span>
            <span>)</span>
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
      <div className="blank-page print-item-wrapper bg-white !mb-0 flex flex-col h-full print:px-4">
        {renderBlankHeader()}
        
        <div className="flex-1 flex flex-col justify-start">
           {[1, 2, 3].map(idx => (
             <div key={idx}>
               {renderBlankTableGroup(idx)}
             </div>
           ))}
        </div>

        {renderPrintFooter()}
      </div>
    );
  };

  const printContent = (
    <div
      id="dw-print-modal"
      className={`w-full max-w-[850px] bg-white rounded-lg h-fit min-h-full flex flex-col p-8 shadow-xl print:shadow-none print:px-8 print:py-4 print:h-auto print:min-h-0 ${separatePages ? 'separate-pages' : ''} ${colorMode === 'bw' ? 'bw-print' : ''}`}
    >
      {activeTab === 'blank' ? (
        renderBlankPage()
      ) : (
        <>
          {printableTeachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 no-print text-slate-400">
              <FileText size={48} className="mb-4 opacity-50" />
              <p className="font-bold">لا يوجد معلمين غائبين لطباعتهم</p>
            </div>
          ) : (
            <div className="print-content">
              {printableTeachers.map((t, idx) => renderTeacherTable(t, separatePages || idx === 0))}
            </div>
          )}
        </>
      )}
    </div>
  );

  if (autoPrint) {
    return (
      <div className="dw-print-auto-source" dir="rtl">
        {printContent}
      </div>
    );
  }

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
           {printContent}
        </div>

      </div>
    </div>
  );
};

export default DailyWaitingPrintModal;
