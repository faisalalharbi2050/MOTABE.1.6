import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive, CalendarClock, Check, CheckCircle2, ChevronDown, ClipboardCheck,
  ClipboardList, MessageSquare, Printer, RefreshCw, Send, SlidersHorizontal,
  Users,
} from 'lucide-react';
import { DutyDayAssignment, DutyScheduleData, DutyWeekAssignment, SchoolInfo } from '../../../types';
import { DAY_NAMES } from '../../../utils/dutyUtils';

interface Props {
  dutyData: DutyScheduleData;
  schoolInfo: SchoolInfo;
  onOpenLegacyPrint: () => void;
  onOpenLegacySend: () => void;
  onOpenArchive?: () => void;
  showToast?: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

type TaskMode = 'print' | 'send';
type PaperSize = 'A4' | 'A3';
type PrintColorMode = 'color' | 'bw';
type PrintSignatureMode = 'with' | 'without';
type SchedulePrintScope = 'all' | 'selectedWeeks';
type SendMode = 'assignment' | 'reminder' | 'report';
type SendChannel = 'whatsapp' | 'sms';

type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const actionButtonClass = (active: boolean) =>
  `inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-black transition-all ${
    active
      ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-md shadow-[#655ac1]/20'
      : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-slate-50'
  }`;

const useDropdownPosition = (open: boolean, onClose: () => void) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 });

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const margin = 16;
      const width = Math.min(430, Math.max(260, rect.width));
      const safeWidth = Math.min(width, window.innerWidth - margin * 2);
      setPosition({
        top: rect.bottom + 10,
        left: Math.min(Math.max(margin, rect.left), window.innerWidth - safeWidth - margin),
        width: safeWidth,
      });
    };
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inButton = triggerRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inButton && !inPanel) onClose();
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  return { triggerRef, panelRef, position };
};

const SingleSelectDropdown: React.FC<{
  label: string;
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minWidthClass?: string;
}> = ({ label, value, options, placeholder, onChange, disabled = false, minWidthClass = 'min-w-[220px]' }) => {
  const [open, setOpen] = useState(false);
  const { triggerRef, panelRef, position } = useDropdownPosition(open, () => setOpen(false));
  const selected = options.find(option => option.value === value);

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  return (
    <div className={`flex-1 ${minWidthClass}`}>
      <label className="block text-xs font-black text-slate-500 mb-2">{label}</label>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(current => !current)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="truncate text-[13px] leading-tight">{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[130] animate-in slide-in-from-top-2"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => { if (option.disabled) return; onChange(option.value); setOpen(false); }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                  option.disabled ? 'text-slate-300 cursor-not-allowed bg-slate-50/70' :
                  value === option.value ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                }`}
              >
                <span>{option.label}</span>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                  value === option.value ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'
                }`}>
                  <Check size={12} strokeWidth={3} />
                </span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const MultiSelectDropdown: React.FC<{
  label: string;
  buttonLabel: string;
  options: DropdownOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  onSelectAll?: () => void;
  selectedSummary?: string;
  disabled?: boolean;
  minWidthClass?: string;
}> = ({ label, buttonLabel, options, selectedValues, onToggle, onClear, onSelectAll, selectedSummary, disabled = false, minWidthClass = 'min-w-[260px]' }) => {
  const [open, setOpen] = useState(false);
  const { triggerRef, panelRef, position } = useDropdownPosition(open, () => setOpen(false));

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  return (
    <div className={`flex-1 ${minWidthClass}`}>
      <label className="block text-xs font-black text-slate-500 mb-2">{label}</label>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(current => !current)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="truncate text-[13px] leading-tight">{selectedSummary || buttonLabel}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[130] animate-in slide-in-from-top-2"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          <div className="flex items-center justify-between px-2 py-2 mb-2 border border-slate-100 bg-slate-50 rounded-xl">
            {onSelectAll ? <button type="button" onClick={onSelectAll} className="text-xs font-black text-[#655ac1] hover:underline">اختيار الكل</button> : <span />}
            <button type="button" onClick={onClear} className="text-xs font-black text-slate-400 hover:text-rose-500 hover:underline">إلغاء الكل</button>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {options.map(option => {
              const selected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToggle(option.value)}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                    selected ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                    selected ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'
                  }`}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const escapeHtml = (value?: string) => (value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatDisplayDate = (date?: string) => {
  if (!date) return '-';
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
};

const PrintSendTab: React.FC<Props> = ({
  dutyData,
  schoolInfo,
  onOpenLegacySend,
  onOpenArchive,
  showToast,
}) => {
  const [taskMode, setTaskMode] = useState<TaskMode>('print');
  const [schedulePrintScope, setSchedulePrintScope] = useState<SchedulePrintScope>('all');
  const [selectedWeekIds, setSelectedWeekIds] = useState<string[]>([]);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [printColorMode, setPrintColorMode] = useState<PrintColorMode>('color');
  const [printSignatureMode, setPrintSignatureMode] = useState<PrintSignatureMode>('without');
  const [showNotesField, setShowNotesField] = useState(false);
  const [footerText, setFooterText] = useState(dutyData.footerText || '');
  const [reportDutyRowsCount, setReportDutyRowsCount] = useState('1');
  const [sendMode, setSendMode] = useState<SendMode>('assignment');
  const [sendChannel, setSendChannel] = useState<SendChannel>('whatsapp');
  const [isSendScheduled, setIsSendScheduled] = useState(false);
  const [sendScheduleTime, setSendScheduleTime] = useState(dutyData.settings.reminderSendTime || '07:00');
  const [messageText, setMessageText] = useState(dutyData.settings.reminderMessageTemplate || '');
  const [receiptOpen, setReceiptOpen] = useState(false);

  const weeksToRender = useMemo<DutyWeekAssignment[]>(() => {
    if (dutyData.weekAssignments && dutyData.weekAssignments.length > 0) return dutyData.weekAssignments;
    return [{
      weekId: 'legacy-week',
      weekName: 'جدول المناوبة',
      startDate: '',
      endDate: '',
      dayAssignments: dutyData.dayAssignments,
    }];
  }, [dutyData.dayAssignments, dutyData.weekAssignments]);

  const selectedWeeks = useMemo(() => {
    if (schedulePrintScope === 'all') return weeksToRender;
    return weeksToRender.filter(week => selectedWeekIds.includes(week.weekId));
  }, [schedulePrintScope, selectedWeekIds, weeksToRender]);

  const sendRows = useMemo(() => {
    const sourceDays = dutyData.weekAssignments && dutyData.weekAssignments.length > 0
      ? dutyData.weekAssignments.flatMap(week => week.dayAssignments)
      : dutyData.dayAssignments;
    return sourceDays.flatMap(day =>
      day.staffAssignments.map(staff => ({
        key: `${day.date || day.day}-${staff.staffId}`,
        day: day.day,
        date: day.date || '',
        staffName: staff.staffName,
        staffType: staff.staffType === 'teacher' ? 'معلم' : 'إداري',
        status: staff.signatureData ? 'signed' : staff.signatureStatus === 'pending' ? 'pending' : 'none',
      }))
    );
  }, [dutyData.dayAssignments, dutyData.weekAssignments]);

  const signedCount = sendRows.filter(row => row.status === 'signed').length;
  const pendingCount = sendRows.filter(row => row.status !== 'signed').length;
  const hasData = sendRows.length > 0;
  const principalName = schoolInfo.principal || (schoolInfo as any).managerName || '';
  const printNotePlaceholder = 'يبدأ العمل بهذا الجدول من يوم الأحد الموافق   /   /    ';

  const openPrintableHtml = (html: string, successMessage = 'تم فتح نافذة الطباعة') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast?.('تعذّر فتح نافذة الطباعة', 'error');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    showToast?.(successMessage, 'success');
  };

  const buildOfficialHeader = (title: string) => `
    <div class="official-header">
      <div class="header-side header-right">
        <p>المملكة العربية السعودية</p>
        <p>وزارة التعليم</p>
        <p>${escapeHtml(schoolInfo.educationAdministration || schoolInfo.region || 'إدارة التعليم')}</p>
        <p>مدرسة ${escapeHtml(schoolInfo.schoolName || '........................')}</p>
      </div>
      <div class="header-center">
        ${schoolInfo.logo
          ? `<img class="school-logo" src="${schoolInfo.logo}" alt="شعار المدرسة" />`
          : '<div class="logo-placeholder">شعار</div>'}
        ${title ? `<h1>${escapeHtml(title)}</h1>` : ''}
      </div>
      <div class="header-side header-left">
        <p>العام الدراسي: ${escapeHtml((schoolInfo as any).academicYear || '')}</p>
        <p>تاريخ الطباعة: ${new Intl.DateTimeFormat('ar-SA-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}</p>
      </div>
    </div>
  `;

  const renderScheduleStaffCell = (day: DutyDayAssignment) => {
    if (day.isOfficialLeave) return `<span class="empty-state">${escapeHtml(day.officialLeaveText || 'إجازة رسمية')}</span>`;
    if (day.isRemoteWork) return '<span class="empty-state">عمل عن بعد</span>';
    if (day.isDisabled) return '<span class="empty-state">يوم غير مفعل</span>';
    if (day.staffAssignments.length === 0) return '<span class="empty-state">لا يوجد مناوب</span>';
    return day.staffAssignments.map(staff => `
      <div class="staff-card">
        <div class="staff-name">${escapeHtml(staff.staffName)}</div>
        <div class="staff-type">${staff.staffType === 'teacher' ? 'معلم' : 'إداري'}</div>
      </div>
    `).join('');
  };

  const renderScheduleSignatureCell = (day: DutyDayAssignment) => {
    if (day.staffAssignments.length === 0) return '<span class="empty-state">-</span>';
    return day.staffAssignments.map(() => '<div class="signature-line"></div>').join('');
  };

  const handlePrintSchedule = () => {
    if (!hasData) {
      showToast?.('لا توجد بيانات مناوبة للطباعة', 'warning');
      return;
    }
    if (schedulePrintScope === 'selectedWeeks' && selectedWeeks.length === 0) {
      showToast?.('اختر أسبوعًا واحدًا على الأقل لطباعة جدول المناوبة', 'warning');
      return;
    }
    const includeSignature = printSignatureMode === 'with';
    const isBW = printColorMode === 'bw';
    const finalFooter = showNotesField ? footerText.trim() : '';
    const printableWeeks = selectedWeeks;

    openPrintableHtml(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>جدول المناوبة اليومية</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
    @page { size: ${paperSize} landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Tajawal', Arial, sans-serif; color: #1e293b; background: #fff; ${isBW ? 'filter: grayscale(100%);' : ''} }
    .page { padding: 0; }
    .official-header { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: start; gap: 12px; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 14px; }
    .header-side { font-size: 12px; font-weight: 800; line-height: 1.8; color: #1e293b; }
    .header-left { text-align: left; }
    .header-center { text-align: center; }
    .school-logo { width: 58px; height: 58px; object-fit: contain; margin-bottom: 6px; }
    .logo-placeholder { width: 58px; height: 58px; margin: 0 auto 6px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px; font-weight: 900; }
    h1 { margin: 0; font-size: 19px; font-weight: 900; color: #111827; }
    .weeks-grid { display: block; }
    .week-card { border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; }
    .week-title { background: #fff; border-bottom: 1px solid #f1f5f9; padding: 12px 16px; color: #655ac1; font-size: 15px; font-weight: 900; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
    th { background: ${isBW ? '#e2e8f0' : '#a59bf0'}; color: ${isBW ? '#1e293b' : '#fff'}; font-weight: 900; padding: 10px 8px; border-left: 1px solid ${isBW ? '#cbd5e1' : 'rgba(255,255,255,0.45)'}; text-align: center; }
    td { border-left: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 10px; vertical-align: middle; }
    th:last-child, td:last-child { border-left: 0; }
    tbody tr:last-child td { border-bottom: 0; }
    tbody tr:hover td, tbody tr:nth-child(even) td { background: ${isBW ? '#fff' : '#f8fafc'}; }
    .day-cell { text-align: center; font-weight: 900; color: #111827; font-size: 13px; }
    .date-cell { text-align: center; font-weight: 800; color: #475569; }
    .staff-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px 10px; margin-bottom: 6px; background: #fff; }
    .staff-card:last-child { margin-bottom: 0; }
    .staff-name { font-size: 12px; font-weight: 900; color: #1e293b; }
    .staff-type { margin-top: 2px; font-size: 10px; font-weight: 800; color: #64748b; }
    .signature-line { height: 36px; border-bottom: 1px dotted #64748b; margin-bottom: 8px; }
    .signature-line:last-child { margin-bottom: 0; }
    .empty-state { display: block; text-align: center; color: #94a3b8; font-weight: 800; }
    .footer-note { margin-top: 12px; border: 1px dashed #94a3b8; border-radius: 14px; padding: 12px 14px; font-size: 12px; font-weight: 800; color: #475569; white-space: pre-wrap; }
    .principal { margin-top: 24px; width: 280px; margin-right: auto; font-size: 13px; font-weight: 900; color: #1e293b; }
    .principal-sign { margin-top: 26px; border-top: 1px dotted #64748b; padding-top: 6px; color: #475569; }
    .compact .official-header { padding-bottom: 8px; margin-bottom: 8px; }
    .compact .header-side { font-size: 9px; line-height: 1.45; }
    .compact .school-logo, .compact .logo-placeholder { width: 44px; height: 44px; margin-bottom: 3px; }
    .compact h1 { font-size: 15px; }
    .compact .weeks-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; align-items: start; }
    .compact .week-card { border-radius: 14px; margin-bottom: 0; }
    .compact .week-title { padding: 6px 8px; font-size: 11px; }
    .compact table { font-size: 8px; }
    .compact th { padding: 5px 4px; }
    .compact td { padding: 5px; }
    .compact .day-cell { font-size: 9px; }
    .compact .date-cell { font-size: 8px; }
    .compact .staff-card { padding: 4px 5px; border-radius: 8px; margin-bottom: 3px; }
    .compact .staff-name { font-size: 8.5px; }
    .compact .staff-type { font-size: 7px; }
    .compact .signature-line { height: 18px; margin-bottom: 4px; }
    .compact .footer-note { grid-column: 1 / -1; font-size: 9px; padding: 8px; margin-top: 0; }
    .compact .principal { grid-column: 1 / -1; margin-top: 8px; font-size: 10px; width: 230px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      th { background: ${isBW ? '#e2e8f0' : '#a59bf0'} !important; color: ${isBW ? '#1e293b' : '#fff'} !important; }
    }
  </style>
</head>
<body>
  <main class="page ${schedulePrintScope === 'all' ? 'compact' : ''}">
    ${buildOfficialHeader('جدول المناوبة اليومية')}
    <div class="weeks-grid">
    ${printableWeeks.map((week, index) => `
      <section class="week-card">
        <div class="week-title">${escapeHtml(week.weekName || `الأسبوع ${index + 1}`)}</div>
        <table>
          <thead>
            <tr>
              <th style="width:16%">اليوم</th>
              <th style="width:18%">التاريخ</th>
              <th style="width:${includeSignature ? '48%' : '66%'}">المناوب</th>
              ${includeSignature ? '<th style="width:18%">التوقيع</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${week.dayAssignments.map(day => `
              <tr>
                <td class="day-cell">${escapeHtml(DAY_NAMES[day.day] || day.day)}</td>
                <td class="date-cell">${escapeHtml(formatDisplayDate(day.date))}</td>
                <td>${renderScheduleStaffCell(day)}</td>
                ${includeSignature ? `<td>${renderScheduleSignatureCell(day)}</td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    `).join('')}
    </div>
    ${finalFooter ? `<div class="footer-note">${escapeHtml(finalFooter)}</div>` : ''}
    <div class="principal">
      <div>اسم مدير المدرسة: ${escapeHtml(principalName || '............................')}</div>
      <div class="principal-sign">التوقيع</div>
    </div>
  </main>
  <script>document.fonts.ready.then(() => window.print()); setTimeout(() => window.print(), 1200);</script>
</body>
</html>`);
  };

  const dutyReportStaffRows = (count: number) => Array.from({ length: count }).map((_, index) => `
    <tr>
      <td>${index + 1}</td>
      <td contenteditable="true"></td>
      <td></td>
      <td></td>
    </tr>
  `).join('');

  const blankPrintRows = (count: number, columns: number) => Array.from({ length: count }).map((_, index) => `
    <tr>
      <td>${index + 1}</td>
      ${Array.from({ length: columns - 1 }).map(() => '<td></td>').join('')}
    </tr>
  `).join('');

  const handlePrintDailyReport = () => {
    const staffRows = Math.max(1, Math.min(4, Number(reportDutyRowsCount) || 1));
    openPrintableHtml(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>تقرير المناوبة اليومية</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Tajawal', Arial, sans-serif; color: #1e293b; background: #fff; ${printColorMode === 'bw' ? 'filter: grayscale(100%);' : ''} }
    .page { max-width: 184mm; margin: 0 auto; padding: 8px 0 0; }
    .official-header { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: start; gap: 10px; border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 7px; }
    .header-side { font-size: 9.5px; font-weight: 800; line-height: 1.45; color: #1e293b; }
    .header-left { text-align: left; }
    .header-center { text-align: center; }
    .school-logo { width: 44px; height: 44px; object-fit: contain; margin-bottom: 3px; }
    .logo-placeholder { width: 44px; height: 44px; margin: 0 auto 3px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 9px; font-weight: 900; }
    h1 { margin: 0; font-size: 18px; font-weight: 900; color: #111827; }
    .report-title { text-align: center; font-size: 18px; font-weight: 900; margin: 6px 0 8px; color: #111827; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 auto 8px; max-width: 132mm; }
    .field { border: 1px solid #cbd5e1; border-radius: 10px; padding: 6px 9px; min-height: 30px; font-size: 11px; font-weight: 900; }
    .field span { color: #64748b; margin-left: 6px; }
    .section-title { margin: 8px 0 4px; color: #655ac1; font-size: 12px; font-weight: 900; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9.5px; margin-bottom: 7px; }
    th, td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: center; height: 23px; vertical-align: middle; }
    th { background: ${printColorMode === 'bw' ? '#e2e8f0' : '#a59bf0'}; color: ${printColorMode === 'bw' ? '#1e293b' : '#fff'}; font-weight: 900; }
    td[contenteditable="true"] { outline: none; }
    .notice { display: inline-flex; align-items: center; gap: 8px; margin-top: 4px; padding: 7px 0; color: #111827; background: #fff; font-size: 11px; font-weight: 900; }
    .notice-icon { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid #111827; color: #111827; background: transparent; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; line-height: 1; }
    .signatures-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-top: 8px; }
    .agent-field { width: 250px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 6px 9px; min-height: 30px; font-size: 11px; font-weight: 900; }
    .agent-field span { color: #64748b; margin-left: 6px; }
    .signature-area { display: flex; justify-content: flex-end; }
    .signature-box { width: 280px; border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px 12px; background: #fff; }
    .signature-name { font-size: 12px; font-weight: 900; margin-bottom: 20px; }
    .signature-name span { color: #64748b; }
    .signature-line { border-top: 1px solid #94a3b8; padding-top: 6px; min-height: 30px; font-size: 11px; font-weight: 900; color: #475569; }
    .print-actions { display: flex; justify-content: flex-start; gap: 8px; max-width: 184mm; margin: 10px auto 8px; }
    .print-actions button { border: 0; border-radius: 12px; background: #655ac1; color: #fff; font: 900 12px Tajawal, Arial; padding: 9px 18px; cursor: pointer; box-shadow: 0 10px 24px rgba(101,90,193,0.18); }
    .print-actions .close-button { background: #fff; color: #475569; border: 1px solid #cbd5e1; box-shadow: none; }
    @media print {
      .print-actions { display: none; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 0; }
      th { background: ${printColorMode === 'bw' ? '#e2e8f0' : '#a59bf0'} !important; color: ${printColorMode === 'bw' ? '#1e293b' : '#fff'} !important; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button onclick="window.print()">طباعة تقرير المناوبة</button>
    <button class="close-button" onclick="window.close()">إغلاق</button>
  </div>
  <main class="page">
    ${buildOfficialHeader('')}
    <div class="report-title">تقرير المناوبة اليومية</div>
    <div class="meta">
      <div class="field"><span>اليوم:</span><b contenteditable="true"></b></div>
      <div class="field"><span>التاريخ:</span><b contenteditable="true">        /        /        </b></div>
    </div>

    <div class="section-title">أولاً: المناوبون</div>
    <table>
      <thead>
        <tr>
          <th style="width:8%">م</th>
          <th style="width:34%">المناوب</th>
          <th style="width:24%">التوقيع</th>
          <th style="width:34%">ملاحظات</th>
        </tr>
      </thead>
      <tbody>${dutyReportStaffRows(staffRows)}</tbody>
    </table>

    <div class="section-title">ثانيًا: الطلاب المتأخرون</div>
    <table>
      <thead>
        <tr>
          <th style="width:7%">م</th>
          <th style="width:24%">اسم الطالب</th>
          <th style="width:16%">الصف / الفصل</th>
          <th style="width:15%">زمن الانصراف</th>
          <th style="width:18%">الإجراء</th>
          <th style="width:20%">ملاحظات</th>
        </tr>
      </thead>
      <tbody>${blankPrintRows(7, 6)}</tbody>
    </table>

    <div class="section-title">ثالثًا: الطلاب المخالفون سلوكيًا</div>
    <table>
      <thead>
        <tr>
          <th style="width:7%">م</th>
          <th style="width:24%">اسم الطالب</th>
          <th style="width:16%">الصف / الفصل</th>
          <th style="width:20%">نوع المخالفة</th>
          <th style="width:16%">الإجراء</th>
          <th style="width:17%">ملاحظات</th>
        </tr>
      </thead>
      <tbody>${blankPrintRows(7, 6)}</tbody>
    </table>

    <div class="notice"><span class="notice-icon">!</span><span>يُسلَّم هذا النموذج في اليوم التالي لوكيل المدرسة</span></div>

    <div class="signatures-row">
      <div class="agent-field"><span>وكيل المدرسة:</span><b contenteditable="true"></b></div>
      <div class="signature-area">
        <div class="signature-box">
          <div class="signature-name"><span>مدير المدرسة:</span> <b contenteditable="true">${escapeHtml(principalName)}</b></div>
          <div class="signature-line">التوقيع</div>
        </div>
      </div>
    </div>
  </main>
</body>
</html>`, 'تم فتح تقرير المناوبة للتعبئة والطباعة');
  };

  if (receiptOpen) {
    return (
      <div className="space-y-5" dir="rtl">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-slate-800 text-lg">سجل استلام المناوبة اليومية</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{signedCount} وقّع من أصل {sendRows.length} مناوب</p>
            </div>
            <button type="button" onClick={() => setReceiptOpen(false)} className={actionButtonClass(false)}>رجوع</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'إجمالي المناوبين', value: String(sendRows.length), icon: Users },
            { label: 'وقّعوا', value: String(signedCount), icon: CheckCircle2 },
            { label: 'لم يوقّعوا بعد', value: String(pendingCount), icon: ClipboardList },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl px-4 py-5 flex items-start gap-3 shadow-sm">
              <div className="flex items-center justify-center shrink-0 text-[#655ac1]"><s.icon size={22} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-400 leading-none">{s.label}</p>
                <p className="mt-1 font-black text-slate-800 text-xl leading-none">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4">
            <p className="text-sm font-black text-slate-800 flex items-center gap-2">
              <ClipboardList size={18} className="text-[#655ac1]" />
              سجل الاستلام
            </p>
            <button type="button" onClick={onOpenLegacySend} className={actionButtonClass(false)}>
              <RefreshCw size={15} />
              فتح نافذة الإرسال
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-right" dir="rtl">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-4 py-3 font-black text-[#655ac1] text-[12px] w-14">م</th>
                  <th className="px-4 py-3 font-black text-[#655ac1] text-[12px]">المناوب</th>
                  <th className="px-4 py-3 font-black text-[#655ac1] text-[12px]">الصفة</th>
                  <th className="px-4 py-3 font-black text-[#655ac1] text-[12px]">اليوم</th>
                  <th className="px-4 py-3 font-black text-[#655ac1] text-[12px]">التاريخ</th>
                  <th className="px-4 py-3 font-black text-[#655ac1] text-[12px] text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sendRows.map((row, index) => (
                  <tr key={row.key} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-[12px] font-bold">{index + 1}</td>
                    <td className="px-4 py-3 font-black text-slate-800 text-[13px]">{row.staffName}</td>
                    <td className="px-4 py-3 text-slate-500 text-[12px]">{row.staffType}</td>
                    <td className="px-4 py-3 text-slate-600 text-[12px] font-bold">{DAY_NAMES[row.day] || row.day}</td>
                    <td className="px-4 py-3 text-slate-500 text-[12px]">{row.date || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${
                        row.status === 'signed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {row.status === 'signed' ? 'وقّع' : 'لم يوقّع'}
                      </span>
                    </td>
                  </tr>
                ))}
                {sendRows.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-14 text-center text-sm font-bold text-slate-400">لا توجد طلبات استلام مرسلة بعد.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'print' as TaskMode, label: 'طباعة', icon: Printer },
            { id: 'send' as TaskMode, label: 'إرسال', icon: Send },
          ].map(option => (
            <button key={option.id} type="button" onClick={() => setTaskMode(option.id)} className={actionButtonClass(taskMode === option.id)}>
              <option.icon size={17} />
              {option.label}
            </button>
          ))}
          <button type="button" onClick={() => setReceiptOpen(true)} className={actionButtonClass(false)}>
            <ClipboardList size={17} />
            سجل استلام المناوبة اليومية
          </button>
          <button type="button" onClick={onOpenArchive || (() => showToast?.('أرشيف الرسائل متاح من قسم الرسائل', 'warning'))} className={actionButtonClass(false)}>
            <Archive size={17} />
            أرشيف الرسائل
          </button>
        </div>
      </div>

      {taskMode === 'print' && (
        <div className="space-y-5">
          <div className="px-1">
            <h3 className="font-black text-slate-800 text-lg">الطباعة</h3>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)] gap-5 items-stretch">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-start gap-3 mb-2">
              <SlidersHorizontal size={20} className="text-[#655ac1]" />
              <h4 className="font-black text-slate-800">جدول المناوبة</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium text-right mb-5">
              اضبط مقاس الورق والألوان وإضافة عامود التوقيع ثم أضف الملاحظات قبل طباعة جدول المناوبة.
            </p>

            <div className="flex flex-wrap items-end gap-4 mb-5">
              <SingleSelectDropdown
                label="نطاق طباعة الجدول"
                value={schedulePrintScope}
                onChange={value => setSchedulePrintScope(value as SchedulePrintScope)}
                placeholder="اختر نطاق الطباعة"
                options={[
                  { value: 'all', label: 'طباعة جدول المناوبة بالكامل' },
                  { value: 'selectedWeeks', label: 'طباعة أسبوع أو عدة أسابيع' },
                ]}
              />
              {schedulePrintScope === 'selectedWeeks' && (
                <MultiSelectDropdown
                  label="الأسابيع"
                  buttonLabel="اختر الأسابيع"
                  options={weeksToRender.map((week, index) => ({ value: week.weekId, label: week.weekName || `الأسبوع ${index + 1}` }))}
                  selectedValues={selectedWeekIds}
                  selectedSummary={selectedWeekIds.length ? `تم اختيار ${selectedWeekIds.length} أسبوع` : undefined}
                  onToggle={value => setSelectedWeekIds(current => current.includes(value) ? current.filter(id => id !== value) : [...current, value])}
                  onClear={() => setSelectedWeekIds([])}
                  onSelectAll={() => setSelectedWeekIds(weeksToRender.map(week => week.weekId))}
                />
              )}
              <SingleSelectDropdown
                label="نوع الورق"
                value={paperSize}
                onChange={value => setPaperSize(value as PaperSize)}
                placeholder="اختر المقاس"
                options={[{ value: 'A4', label: 'A4' }, { value: 'A3', label: 'A3' }]}
              />
              <SingleSelectDropdown
                label="اللون"
                value={printColorMode}
                onChange={value => setPrintColorMode(value as PrintColorMode)}
                placeholder="اختر اللون"
                options={[{ value: 'color', label: 'ملون' }, { value: 'bw', label: 'أبيض وأسود' }]}
              />
              <SingleSelectDropdown
                label="خانة توقيع المناوب"
                value={printSignatureMode}
                onChange={value => setPrintSignatureMode(value as PrintSignatureMode)}
                placeholder="اختر خيار التوقيع"
                options={[
                  { value: 'with', label: 'إضافة عامود توقيع لكل مناوب' },
                  { value: 'without', label: 'بدون إضافة عامود توقيع لكل مناوب' },
                ]}
              />
            </div>

            <div className="mb-5">
              <label className="block text-xs font-black text-slate-500 mb-2">الملاحظات</label>
              <p className="text-xs font-bold text-slate-600 mb-3">
                هل تريد إضافة ملاحظات في جدول المناوبة اليومية قبل الطباعة؟{' '}
                <button
                  type="button"
                  onClick={() => setShowNotesField(open => !open)}
                  className="text-[#8779fb] hover:text-[#655ac1] underline underline-offset-4"
                >
                  {showNotesField ? 'إلغاء' : 'انقر هنا'}
                </button>
              </p>
              {showNotesField && (
                <textarea
                  value={footerText}
                  onChange={e => setFooterText(e.target.value)}
                  placeholder={printNotePlaceholder}
                  rows={3}
                  className="w-full border-2 border-slate-100 rounded-xl p-4 outline-none focus:border-[#655ac1] resize-none text-sm leading-relaxed transition-colors"
                  dir="rtl"
                />
              )}
            </div>

            <div className="mt-auto flex justify-center">
              <button
                type="button"
                onClick={handlePrintSchedule}
                disabled={!hasData}
                className="inline-flex min-w-[160px] items-center justify-center gap-2 px-10 py-2.5 rounded-xl border border-[#655ac1] bg-[#655ac1] text-white text-sm font-black hover:bg-[#5046a0] transition-all shadow-md shadow-[#655ac1]/20 disabled:opacity-50"
              >
                <Printer size={16} />
                طباعة جدول المناوبة
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-start gap-3 mb-2">
              <ClipboardList size={20} className="text-[#655ac1]" />
              <h4 className="font-black text-slate-800">تقرير المناوبة اليومية</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium text-right mb-5">
              اطبع نموذج تقرير المناوبة اليومي المفرغ للتعبئة اليدوية.
            </p>

            <div className="flex flex-wrap items-end gap-4 mb-5">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-black text-slate-500 mb-2">عدد المناوبين</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={reportDutyRowsCount}
                  onChange={e => setReportDutyRowsCount(e.target.value)}
                  className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 focus:border-[#655ac1]/50 transition-all outline-none"
                />
              </div>
              <SingleSelectDropdown
                label="اللون"
                value={printColorMode}
                onChange={value => setPrintColorMode(value as PrintColorMode)}
                placeholder="اختر اللون"
                options={[{ value: 'color', label: 'ملون' }, { value: 'bw', label: 'أبيض وأسود' }]}
              />
            </div>

            <div className="mt-auto flex justify-center">
              <button
                type="button"
                onClick={handlePrintDailyReport}
                className="inline-flex min-w-[160px] items-center justify-center gap-2 px-10 py-2.5 rounded-xl border border-[#655ac1] bg-[#655ac1] text-white text-sm font-black hover:bg-[#5046a0] transition-all shadow-md shadow-[#655ac1]/20"
              >
                <Printer size={16} />
                طباعة التقرير
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {taskMode === 'send' && (
        <div className="space-y-4">
          <div className="px-1">
            <h3 className="font-black text-slate-800 text-lg">إرسال المناوبة</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-start gap-3 mb-2">
                <ClipboardCheck size={20} className="text-[#655ac1]" />
                <h4 className="font-black text-slate-800">اختر نوع الإشعار والمستلمين</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium text-right mb-5">
                اختر نوع الإشعار ثم تابع معاينة المستلمين وإرسال المناوبة.
              </p>
              <div className="space-y-4">
                <SingleSelectDropdown
                  label="نوع الإشعار"
                  value={sendMode}
                  onChange={value => setSendMode(value as SendMode)}
                  placeholder="اختر نوع الإشعار"
                  options={[
                    { value: 'assignment', label: 'رسالة تكليف بالمناوبة اليومية' },
                    { value: 'reminder', label: 'رسالة تذكير يومية بالمناوبة' },
                    { value: 'report', label: 'إرسال تقرير المناوبة اليومية' },
                  ]}
                />
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarClock size={16} className="text-[#655ac1]" />
                      <span className="text-sm font-black text-slate-700">جدولة الإرسال لوقت لاحق</span>
                    </div>
                    <button type="button" onClick={() => setIsSendScheduled(c => !c)}
                      className={`relative inline-flex w-10 h-6 rounded-full transition-all ${isSendScheduled ? 'bg-[#655ac1]' : 'bg-slate-300'}`}
                      role="switch" aria-checked={isSendScheduled}>
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isSendScheduled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  {isSendScheduled && (
                    <div className="mt-3">
                      <label className="text-xs font-black text-slate-500 block mb-1.5">الوقت</label>
                      <input
                        type="time"
                        value={sendScheduleTime}
                        onChange={event => setSendScheduleTime(event.target.value)}
                        className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors"
                      />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all"
                >
                  <Users size={15} />
                  معاينة المستلمين ({sendRows.length})
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-start gap-3 mb-4">
                  <MessageSquare size={20} className="text-[#655ac1]" />
                  <h4 className="font-black text-slate-800">طريقة الإرسال المفضلة</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'whatsapp' as SendChannel, label: 'واتساب', color: '#25D366' },
                    { id: 'sms' as SendChannel, label: 'النصية SMS', color: '#007AFF' },
                  ].map(option => (
                    <button key={option.id} type="button" onClick={() => setSendChannel(option.id)}
                      className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${
                        sendChannel === option.id ? 'bg-white shadow-sm' : 'border-slate-100 hover:border-slate-200'
                      }`}
                      style={sendChannel === option.id ? { borderColor: option.color } : undefined}>
                      <MessageSquare size={28} style={{ color: sendChannel === option.id ? option.color : '#cbd5e1' }} />
                      <span className="font-black mt-2 text-sm" style={{ color: sendChannel === option.id ? option.color : '#94a3b8' }}>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={20} className="text-[#655ac1]" />
                    <h4 className="font-black text-slate-800">نص الرسالة</h4>
                  </div>
                  <button
                    type="button"
                    title="استعادة النص الافتراضي"
                    onClick={() => setMessageText(dutyData.settings.reminderMessageTemplate || 'نذكركم بمهمة المناوبة اليومية لهذا اليوم.')}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all"
                  >
                    <RefreshCw size={14} className="text-[#655ac1]" />
                  </button>
                </div>
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  rows={5}
                  className="w-full border-2 border-slate-100 rounded-xl p-4 outline-none focus:border-[#655ac1] resize-none text-sm leading-relaxed transition-colors mb-4"
                  placeholder="نص الرسالة..."
                  dir="rtl"
                />
                <button
                  type="button"
                  onClick={onOpenLegacySend}
                  disabled={!hasData}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#655ac1] text-white font-black shadow-md shadow-[#655ac1]/20 hover:bg-[#5046a0] transition-all disabled:opacity-50"
                >
                  <Send size={16} />
                  إرسال عبر {sendChannel === 'whatsapp' ? 'واتساب' : 'الرسائل النصية'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintSendTab;
