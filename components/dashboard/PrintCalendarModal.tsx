import React from 'react';
import { X, Printer, CalendarCheck, CalendarX2, CalendarDays } from 'lucide-react';
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

function buildWeeks(semester: SemesterInfo) {
  const { startDate, endDate, workDaysStart = 0, workDaysEnd = 4, holidays = [], calendarType } = semester;
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

function countActiveWeeks(semester: SemesterInfo): number {
  return buildWeeks(semester).filter(w => w.days.some(d => d.isWorkingDay && !d.isHoliday)).length;
}

function buildPrintHTML(semester: SemesterInfo, academicYear: string, schoolInfo: SchoolInfo): string {
  const weeks     = buildWeeks(semester);
  const printDate = new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
  const activeWeeksCount = countActiveWeeks(semester);
  const holidayCount     = semester.holidays?.length || 0;

  const weekCards = weeks.map(week => {
    const activeDays    = week.days.filter(d => d.isWorkingDay);
    if (activeDays.length === 0) return '';
    const allHoliday    = activeDays.every(d => d.isHoliday);
    const firstDay      = activeDays[0];
    const lastDay       = activeDays[activeDays.length - 1];

    const cardBorder    = allHoliday ? 'border:2px solid #fca5a5;' : 'border:1px solid #ddd6fe;';
    const headerBg      = allHoliday ? 'background:#fff;' : 'background:linear-gradient(to left, rgba(101,90,193,0.06), rgba(135,121,251,0.10));';
    const weekNumColor  = allHoliday ? '#ef4444' : '#655ac1';
    const dateColor     = allHoliday ? '#f87171' : '#8779fb';

    const holidayBadge  = allHoliday
      ? `<span style="font-size:10px; font-weight:700; color:#ef4444;">إجازة</span>` : '';

    const daysHtml = activeDays.map(d => `
      <div style="font-size:11px; padding:5px 8px; border-radius:8px; border:${d.isHoliday && !allHoliday ? '2px solid #fca5a5' : '1px solid #e2e8f0'}; display:flex; justify-content:space-between; align-items:center; background:#fff; margin-bottom:5px;">
        <span style="font-weight:700; color:#374151; display:flex; align-items:center; gap:4px;">
          ${d.isHoliday && !allHoliday ? '<span style="color:#f87171; font-size:10px;">✕</span>' : ''}
          ${d.label}
        </span>
        <span style="color:#9ca3af; font-size:10px; direction:ltr;">${d.dateObj.format('MM/DD')}</span>
      </div>`).join('');

    return `
      <div style="border-radius:14px; overflow:hidden; ${cardBorder} display:flex; flex-direction:column; break-inside:avoid;">
        <div style="${headerBg} padding:8px 10px; cursor:default;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:18px; font-weight:900; color:${weekNumColor}; line-height:1;">${week.weekNumber}</span>
            ${holidayBadge}
          </div>
          <div style="font-size:12px; font-weight:700; color:${dateColor}; direction:ltr; text-align:right;">
            ${firstDay.dateObj.format('M/D')} — ${lastDay.dateObj.format('M/D')}
          </div>
        </div>
        <div style="padding:6px 8px; flex:1; background:#fafafa;">
          ${daysHtml}
        </div>
      </div>`;
  }).join('');

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
  <!-- رأس الصفحة -->
  <div style="text-align:center; margin-bottom:20px; padding-bottom:14px; border-bottom:2px solid #e2e8f0;">
    <div style="font-size:18px; font-weight:900; color:#1e293b;">${schoolInfo.schoolName || ''}</div>
    ${schoolInfo.educationAdministration ? `<div style="font-size:12px; color:#64748b; margin-top:4px;">${schoolInfo.educationAdministration}</div>` : ''}
    <div style="font-size:14px; font-weight:700; color:#655ac1; margin-top:6px;">التقويم الدراسي — العام ${academicYear || ''}</div>
  </div>

  <!-- معلومات الفصل -->
  <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:10px 14px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
    <div>
      <div style="font-size:15px; font-weight:900; color:#655ac1;">${semester.name}</div>
      <div style="font-size:11px; color:#8779fb; margin-top:3px;">
        ${formatDateDisplay(semester.startDate, semester.calendarType)} — ${formatDateDisplay(semester.endDate, semester.calendarType)}
      </div>
    </div>
    <div style="text-align:left; font-size:11px; color:#6b7280;">
      <div>${activeWeeksCount} أسبوع فعّال</div>
      <div style="color:#f87171; margin-top:2px;">${holidayCount} يوم إجازة</div>
    </div>
  </div>

  <!-- شبكة البطاقات -->
  <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; direction:rtl;">
    ${weekCards}
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
  if (!isOpen) return null;

  const semester = semesters.find(s => s.id === defaultSemesterId) ?? semesters[0];
  if (!semester) return null;

  const activeWeeks  = countActiveWeeks(semester);
  const holidayCount = semester.holidays?.length || 0;

  const handlePrint = () => {
    const html = buildPrintHTML(semester, academicYear, schoolInfo);
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.documentElement.innerHTML = html;
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden"
        style={{ borderRadius: '24px', boxShadow: '0 32px 80px rgba(101,90,193,0.22), 0 8px 24px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <Printer size={22} className="text-[#8779fb]" strokeWidth={1.6} />
            <h3 className="text-base font-black text-slate-800">طباعة التقويم الدراسي</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Semester Info */}
        <div className="p-6 space-y-4">
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-black text-[#655ac1]">{semester.name}</p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <CalendarCheck size={12} className="text-[#8779fb] shrink-0" />
              يبدأ من {formatDateDisplay(semester.startDate, semester.calendarType)}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <CalendarX2 size={12} className="text-[#8779fb] shrink-0" />
              ينتهي في {formatDateDisplay(semester.endDate, semester.calendarType)}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <CalendarDays size={12} className="text-[#8779fb] shrink-0" />
              {activeWeeks} أسبوع فعّال · {holidayCount} يوم إجازة
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#655ac1] text-white rounded-xl text-sm font-black hover:bg-[#5548b0] transition-all shadow-sm hover:-translate-y-0.5"
          >
            <Printer size={15} />
            طباعة
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintCalendarModal;
