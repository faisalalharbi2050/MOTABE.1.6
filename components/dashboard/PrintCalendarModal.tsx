import React, { useState } from 'react';
import { X, Printer, CheckCircle2, CalendarDays } from 'lucide-react';
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
  defaultSemesterId?: string; // pre-select a specific semester
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
  const end = new Date(endDate + 'T00:00:00');
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
      locale: calendarType === 'hijri' ? arabic_ar : gregorian_ar,
    });
    const dayOfWeek = current.getDay();
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
  const weeks = buildWeeks(semester);
  return weeks.filter(w => w.days.some(d => d.isWorkingDay && !d.isHoliday)).length;
}

function buildPrintHTML(
  semesters: SemesterInfo[],
  selectedIds: string[],
  academicYear: string,
  schoolInfo: SchoolInfo,
  opts: { showDates: boolean; showHolidays: boolean; showHeader: boolean; pageBreak: boolean }
): string {
  const selected = semesters.filter(s => selectedIds.includes(s.id));
  const printDate = new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());

  const semesterBlocks = selected.map((sem, semIdx) => {
    const weeks = buildWeeks(sem);
    const activeWeeksCount = countActiveWeeks(sem);
    const holidayCount = sem.holidays?.length || 0;

    const weekRows = weeks
      .map(week => {
        const activeDays = week.days.filter(d => d.isWorkingDay);
        if (activeDays.length === 0) return '';

        const allHoliday = activeDays.every(d => d.isHoliday);
        const hasAnyHoliday = activeDays.some(d => d.isHoliday);

        const daysHtml = opts.showDates
          ? activeDays.map(d => `
              <td style="padding:6px 8px; text-align:center; border:1px solid #e2e8f0; ${d.isHoliday ? 'background:#fff1f2; color:#be123c;' : 'background:#f8fafc; color:#374151;'}">
                <div style="font-weight:700; font-size:12px;">${d.label}</div>
                ${opts.showDates ? `<div style="font-size:10px; color:${d.isHoliday ? '#be123c' : '#6b7280'}; direction:ltr;">${d.dateObj.format('MM/DD')}</div>` : ''}
                ${d.isHoliday ? `<div style="font-size:9px; color:#be123c; margin-top:2px;">(إجازة رسمية)</div>` : ''}
              </td>`) .join('')
          : '';

        const weekStatus = allHoliday
          ? '<span style="color:#be123c; font-size:10px;">(أسبوع إجازة)</span>'
          : hasAnyHoliday
          ? '<span style="color:#d97706; font-size:10px;">(يحتوي إجازة)</span>'
          : '';

        return `
          <tr>
            <td style="padding:6px 8px; text-align:center; font-weight:700; font-size:12px; border:1px solid #e2e8f0; background:${allHoliday ? '#fff1f2' : '#f0f4ff'}; color:${allHoliday ? '#be123c' : '#4338ca'}; white-space:nowrap;">
              أسبوع ${week.weekNumber} ${weekStatus}
            </td>
            ${daysHtml}
          </tr>`;
      })
      .join('');

    const pageBreakStyle = opts.pageBreak && semIdx > 0 ? 'page-break-before: always;' : '';

    return `
      <div style="${pageBreakStyle} margin-bottom: 32px;">
        <div style="background:#f0f4ff; border:1px solid #c7d2fe; border-radius:8px; padding:10px 16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:15px; font-weight:900; color:#3730a3;">${sem.name}</div>
            <div style="font-size:11px; color:#6366f1; margin-top:2px;">
              ${formatDateDisplay(sem.startDate, sem.calendarType)} — ${formatDateDisplay(sem.endDate, sem.calendarType)}
            </div>
          </div>
          <div style="text-align:left; font-size:11px; color:#6b7280;">
            <div>${activeWeeksCount} أسبوع فعّال</div>
            ${opts.showHolidays ? `<div style="color:#be123c;">${holidayCount} يوم إجازة</div>` : ''}
          </div>
        </div>
        <table style="width:100%; border-collapse:collapse; font-family: 'Tajawal', Arial, sans-serif; direction:rtl;">
          <thead>
            <tr style="background:#e0e7ff;">
              <th style="padding:7px 8px; font-size:11px; font-weight:900; color:#3730a3; border:1px solid #c7d2fe; text-align:center; width:90px;">الأسبوع</th>
              ${opts.showDates ? `<th colspan="10" style="padding:7px 8px; font-size:11px; font-weight:900; color:#3730a3; border:1px solid #c7d2fe; text-align:center;">الأيام الدراسية</th>` : ''}
            </tr>
          </thead>
          <tbody>${weekRows}</tbody>
        </table>
      </div>`;
  }).join('');

  const headerHtml = opts.showHeader ? `
    <div style="text-align:center; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid #e2e8f0;">
      <div style="font-size:18px; font-weight:900; color:#1e293b;">${schoolInfo.schoolName || ''}</div>
      ${schoolInfo.educationAdministration ? `<div style="font-size:12px; color:#64748b; margin-top:4px;">${schoolInfo.educationAdministration}</div>` : ''}
      <div style="font-size:14px; font-weight:700; color:#4338ca; margin-top:8px;">التقويم الدراسي — العام ${academicYear || ''}</div>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>التقويم الدراسي — ${academicYear}</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; background: #fff; color: #1e293b; padding: 24px; font-size: 13px; }
    @media print {
      body { padding: 12px; }
      @page { margin: 1cm; size: A4; }
    }
  </style>
</head>
<body>
  ${headerHtml}
  ${semesterBlocks}
  <div style="margin-top:32px; padding-top:12px; border-top:1px solid #e2e8f0; text-align:center; font-size:10px; color:#94a3b8;">
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
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    defaultSemesterId ? [defaultSemesterId] : semesters.map(s => s.id)
  );
  const [showDates, setShowDates] = useState(true);
  const [showHolidays, setShowHolidays] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [pageBreak, setPageBreak] = useState(true);

  if (!isOpen) return null;

  const toggleSemester = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePrint = () => {
    const html = buildPrintHTML(semesters, selectedIds, academicYear, schoolInfo, {
      showDates,
      showHolidays,
      pageBreak,
      showHeader,
    });
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden"
        style={{ borderRadius: '24px', boxShadow: '0 32px 80px rgba(101,90,193,0.22), 0 8px 24px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8779fb]/10 flex items-center justify-center">
              <Printer size={20} className="text-[#8779fb]" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">طباعة التقويم الدراسي</h3>
              <p className="text-xs font-bold text-slate-400 mt-0.5">اختر الفصول وخيارات العرض</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
          {/* Semester selection */}
          <div>
            <p className="text-xs font-black text-slate-500 mb-3">الفصول الدراسية</p>
            <div className="space-y-2">
              {semesters.map(sem => (
                <label
                  key={sem.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedIds.includes(sem.id)
                      ? 'border-[#8779fb] bg-[#8779fb]/5'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(sem.id)}
                    onChange={() => toggleSemester(sem.id)}
                    className="accent-[#655ac1] w-4 h-4 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{sem.name}</div>
                    <div className="text-xs font-medium text-slate-400 mt-0.5">
                      {formatDateDisplay(sem.startDate, sem.calendarType)} — {formatDateDisplay(sem.endDate, sem.calendarType)}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-[#8779fb] shrink-0">{countActiveWeeks(sem)} أسبوع</div>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <p className="text-xs font-black text-slate-500 mb-3">خيارات الطباعة</p>
            <div className="space-y-2">
              {[
                { key: 'showHeader', label: 'عرض رأس الصفحة (اسم المدرسة)', value: showHeader, set: setShowHeader },
                { key: 'showDates', label: 'عرض التواريخ التفصيلية لكل يوم', value: showDates, set: setShowDates },
                { key: 'showHolidays', label: 'الإشارة إلى أيام الإجازات', value: showHolidays, set: setShowHolidays },
                { key: 'pageBreak', label: 'فصل كل فصل دراسي في صفحة مستقلة', value: pageBreak, set: setPageBreak },
              ].map(opt => (
                <label
                  key={opt.key}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={opt.value}
                    onChange={() => opt.set(!opt.value)}
                    className="accent-[#655ac1] w-4 h-4 shrink-0"
                  />
                  <span className="text-sm font-bold text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-400">
            {selectedIds.length === 0
              ? 'اختر فصلاً واحداً على الأقل'
              : `${selectedIds.length} ${selectedIds.length === 1 ? 'فصل' : 'فصول'} للطباعة`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
            >
              إلغاء
            </button>
            <button
              onClick={handlePrint}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#655ac1] text-white rounded-xl text-sm font-black hover:bg-[#5548b0] transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <Printer size={15} />
              طباعة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintCalendarModal;
