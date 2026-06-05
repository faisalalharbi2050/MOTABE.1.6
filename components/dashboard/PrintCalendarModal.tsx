import React from 'react';
import { SemesterInfo, SchoolInfo } from '../../types';
import { DateObject } from 'react-multi-date-picker';
import arabic from 'react-date-object/calendars/arabic';
import arabic_ar from 'react-date-object/locales/arabic_ar';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_ar from 'react-date-object/locales/gregorian_ar';

interface PrintCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesters: SemesterInfo[];
  academicYear: string;
  schoolInfo: SchoolInfo;
  defaultSemesterId?: string;
}

const DAYS_OF_WEEK = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function formatDateDisplay(dateStr: string, calendarType: 'hijri' | 'gregorian'): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    if (calendarType === 'hijri') {
      return new DateObject({ date: d, calendar: arabic, locale: arabic_ar }).format('YYYY/MM/DD');
    } else {
      return dateStr.replace(/-/g, '/');
    }
  } catch {
    return dateStr.replace(/-/g, '/');
  }
}

function buildWeeks(semester: SemesterInfo, calendarType: 'hijri' | 'gregorian') {
  const { startDate, endDate, workDaysStart = 0, workDaysEnd = 4, holidays = [] } = semester;
  if (!startDate || !endDate) return [];
  const start = new Date(startDate + 'T00:00:00');
  const end   = new Date(endDate   + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

  type DayEntry = { date: string; dateObj: DateObject; isWorkingDay: boolean; isHoliday: boolean; dayOfWeek: number; label: string };
  const result: { weekNumber: number; days: DayEntry[] }[] = [];
  let current = new Date(start);
  let weekNumber = 1;
  let currentWeekDays: DayEntry[] = [];

  while (current <= end) {
    const dateStr = current.getFullYear() + '-' + String(current.getMonth() + 1).padStart(2, '0') + '-' + String(current.getDate()).padStart(2, '0');
    const dateObj = new DateObject({
      date: current,
      calendar: calendarType === 'hijri' ? arabic : gregorian,
      locale:   calendarType === 'hijri' ? arabic_ar : gregorian_ar,
    });
    const dayOfWeek    = current.getDay();
    const isWorkingDay = workDaysStart <= workDaysEnd
      ? dayOfWeek >= workDaysStart && dayOfWeek <= workDaysEnd
      : dayOfWeek >= workDaysStart || dayOfWeek <= workDaysEnd;
    const isHoliday = holidays.includes(dateStr);

    if (currentWeekDays.length > 0 && dayOfWeek === workDaysStart) {
      result.push({ weekNumber: weekNumber++, days: currentWeekDays });
      currentWeekDays = [];
    }
    currentWeekDays.push({ date: dateStr, dateObj, isWorkingDay, isHoliday, dayOfWeek, label: DAYS_OF_WEEK[dayOfWeek] || '' });
    current.setDate(current.getDate() + 1);
  }
  if (currentWeekDays.length > 0) result.push({ weekNumber, days: currentWeekDays });
  return result;
}

function buildPrintHTML(semester: SemesterInfo, academicYear: string, schoolInfo: SchoolInfo): string {
  const calendarType = schoolInfo.calendarType === 'gregorian' ? 'gregorian' : 'hijri';
  const weeks     = buildWeeks(semester, calendarType);
  const printDate = new Intl.DateTimeFormat(calendarType === 'hijri' ? 'ar-SA-u-ca-islamic-umalqura' : 'ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());

  const renderable   = weeks.filter(w => w.days.some(d => d.isWorkingDay));
  const totalWeeks   = renderable.length;
  const holidayCount = semester.holidays?.length || 0;
  const studyDays    = weeks.reduce((s, w) => s + w.days.filter(d => d.isWorkingDay && !d.isHoliday).length, 0);

  const weekRows = renderable.map(week => {
    const activeDays = week.days.filter(d => d.isWorkingDay);
    const allHoliday = activeDays.length > 0 && activeDays.every(d => d.isHoliday);
    const firstDay   = activeDays[0];
    const lastDay    = activeDays[activeDays.length - 1];

    const daysHtml = activeDays.map(d => `
      <div style="flex:1; border:1px solid ${d.isHoliday ? '#fecaca' : '#e2e8f0'}; border-radius:10px; padding:6px 4px; text-align:center; position:relative; background:#fff; min-height:46px;">
        ${d.isHoliday ? '<span style="position:absolute; top:3px; left:3px; font-size:8px; font-weight:900; color:#dc2626; background:#fee2e2; border-radius:4px; padding:1px 4px; line-height:1;">إجازة</span>' : ''}
        <div style="font-size:11px; font-weight:900; color:#374151;">${d.label}</div>
        <div style="font-size:10px; font-weight:900; color:#655ac1; direction:ltr; margin-top:3px;">${d.dateObj.format('M/D')}</div>
      </div>`).join('');

    return `
      <div style="display:flex; align-items:stretch; padding:8px 10px; border-bottom:1px solid #f1f5f9; ${allHoliday ? 'background:#fff1f2;' : ''} break-inside:avoid;">
        <div style="width:110px; flex-shrink:0; padding-left:10px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:14px; font-weight:900; color:#0f172a;">الأسبوع ${week.weekNumber}</span>
            ${allHoliday ? '<span style="font-size:9px; font-weight:900; color:#dc2626; background:#fee2e2; border-radius:4px; padding:1px 5px; line-height:1.4;">إجازة</span>' : ''}
          </div>
          <div style="font-size:12px; font-weight:900; color:#655ac1; direction:ltr; margin-top:3px;">${firstDay.dateObj.format('M/D')} - ${lastDay.dateObj.format('M/D')}</div>
        </div>
        <div style="width:1px; background:#e2e8f0; margin:0 10px;"></div>
        <div style="flex:1; display:flex; gap:6px;">${daysHtml}</div>
      </div>`;
  }).join('');

  const logoHtml = schoolInfo.logo
    ? `<img src="${schoolInfo.logo}" alt="شعار" style="width:70px; height:70px; object-fit:contain;" />`
    : `<div style="width:70px; height:70px; border:1px dashed #cbd5e1; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:11px;">شعار</div>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>التقويم الدراسي — ${academicYear}</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; background: #fff; color: #1e293b; padding: 20px; font-size: 13px; }
    @media print { body { padding: 10px; } @page { margin: 1cm; size: A4; } }
  </style>
</head>
<body>
  <!-- الترويسة الرسمية -->
  <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #e2e8f0; padding-bottom:12px; margin-bottom:16px;">
    <div style="text-align:right; font-size:12px; line-height:1.9; font-weight:700; color:#1e293b;">
      <div>المملكة العربية السعودية</div>
      <div>وزارة التعليم</div>
      <div>${schoolInfo.region || 'إدارة التعليم بالمنطقة'}</div>
      <div>مدرسة ${schoolInfo.schoolName || '..........'}</div>
    </div>
    <div style="text-align:center;">${logoHtml}</div>
    <div style="text-align:left; font-size:12px; line-height:1.9; font-weight:700; color:#1e293b;">
      <div>التاريخ: ${printDate}</div>
      <div>العام الدراسي: ${academicYear || ''}</div>
    </div>
  </div>

  <!-- العنوان -->
  <div style="text-align:center; margin-bottom:16px;">
    <div style="font-size:22px; font-weight:900; color:#655ac1;">التقويم الدراسي</div>
    <div style="font-size:13px; font-weight:700; color:#475569; margin-top:5px;">العام الدراسي: ${academicYear || ''} — ${semester.name}</div>
  </div>

  <!-- شريط الإحصاءات -->
  <div style="display:flex; justify-content:center; gap:28px; flex-wrap:wrap; border:1px solid #e2e8f0; border-radius:10px; padding:9px 14px; margin-bottom:16px; font-size:12px; font-weight:700; color:#475569;">
    <span>${totalWeeks} أسبوع دراسي</span>
    <span>${holidayCount} يوم إجازة</span>
    <span>الأيام الدراسية: ${studyDays} يوم</span>
  </div>

  <!-- جدول الأسابيع الدراسية -->
  <div style="border:1px solid #e2e8f0; border-radius:14px; overflow:hidden;">
    ${weekRows}
  </div>

  <div style="margin-top:24px; padding-top:10px; border-top:1px solid #e2e8f0; text-align:center; font-size:10px; color:#94a3b8;">
    تاريخ الطباعة: ${printDate}
  </div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;
}

const PrintCalendarModal: React.FC<PrintCalendarModalProps> = ({
  isOpen,
  onClose,
  semesters,
  academicYear,
  schoolInfo,
  defaultSemesterId,
}) => {
  const printedRef = React.useRef(false);

  const semester = semesters.find(s => s.id === defaultSemesterId) ?? semesters[0];

  React.useEffect(() => {
    if (!isOpen || !semester) return;
    if (printedRef.current) return;
    printedRef.current = true;
    const html = buildPrintHTML(semester, academicYear, schoolInfo);
    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.documentElement.innerHTML = html;
    }
    onClose();
  }, [isOpen, semester, academicYear, schoolInfo, onClose]);

  return null;
};

export default PrintCalendarModal;
