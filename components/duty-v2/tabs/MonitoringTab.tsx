import React, { useEffect, useMemo, useRef, useState } from 'react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import arabic from 'react-date-object/calendars/arabic';
import arabic_ar from 'react-date-object/locales/arabic_ar';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_ar from 'react-date-object/locales/gregorian_ar';
import {
  BarChart3, Check, ChevronDown, Printer, Search, UserCheck,
} from 'lucide-react';
import {
  Admin, DutyAttendanceRecord, DutyScheduleData, SchoolInfo, SupervisionAttendanceStatus, Teacher,
} from '../../../types';
import { DAY_NAMES } from '../../../utils/dutyUtils';

interface Props {
  dutyData: DutyScheduleData;
  setDutyData: React.Dispatch<React.SetStateAction<DutyScheduleData>>;
  schoolInfo: SchoolInfo;
  teachers: Teacher[];
  admins: Admin[];
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

type InnerTab = 'daily' | 'reports';
type CalendarType = 'hijri' | 'gregorian';

const STATUS_OPTIONS: Array<{ value: SupervisionAttendanceStatus; label: string; textColor?: string; dotColor?: string }> = [
  { value: 'present', label: 'حاضر' },
  { value: 'absent', label: 'غائب' },
  { value: 'excused', label: 'مستأذن' },
  { value: 'late', label: 'متأخر' },
  { value: 'withdrawn', label: 'منسحب' },
];

const STATUS_STYLES: Record<SupervisionAttendanceStatus, { textColor: string; dotColor: string }> = {
  present: { textColor: 'text-green-600', dotColor: 'bg-green-500 border-green-500' },
  absent: { textColor: 'text-red-600', dotColor: 'bg-red-500 border-red-500' },
  excused: { textColor: 'text-amber-600', dotColor: 'bg-amber-400 border-amber-400' },
  late: { textColor: 'text-orange-600', dotColor: 'bg-orange-500 border-orange-500' },
  withdrawn: { textColor: 'text-slate-500', dotColor: 'bg-slate-400 border-slate-400' },
};

const DAY_KEYS: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

const formatIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseIsoDate = (date?: string) => {
  if (!date) return undefined;
  const parsed = new Date(`${date}T00:00:00`);
  return isNaN(parsed.getTime()) ? undefined : parsed;
};

const getDateRange = (start?: string, end?: string) => {
  const from = parseIsoDate(start);
  const to = parseIsoDate(end);
  if (!from || !to || from > to) return [];
  const dates: string[] = [];
  const current = new Date(from);
  while (current <= to) {
    dates.push(formatIsoDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const formatPickerDate = (date: any) => {
  if (!date) return '';
  if (date instanceof DateObject) return formatIsoDate(date.toDate());
  if (date instanceof Date && !isNaN(date.getTime())) return formatIsoDate(date);
  return '';
};

const dayNameForDate = (date?: string) => {
  const parsed = parseIsoDate(date) || new Date();
  return ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][parsed.getDay()] || '';
};

const formatHijriDate = (date?: string) => {
  const parsed = date ? new Date(`${date}T12:00:00`) : new Date();
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};

const formatGregorianDate = (date?: string) => {
  const parsed = date ? new Date(`${date}T12:00:00`) : new Date();
  return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};

const formatCalendarDate = (date: string, calendarType: CalendarType) =>
  calendarType === 'hijri' ? formatHijriDate(date) : formatGregorianDate(date);

const formatDateLabel = (date: string, calendarType: CalendarType) =>
  `${dayNameForDate(date)} - ${formatCalendarDate(date, calendarType)}`;

const pluralStaff = (count: number) => {
  if (count === 1) return 'مناوب';
  if (count === 2) return 'مناوبان';
  return 'مناوبين';
};

const CircleCheck: React.FC<{ checked: boolean; dotColor?: string }> = ({ checked, dotColor = 'bg-[#655ac1] border-[#655ac1]' }) => (
  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
    checked ? `${dotColor} text-white` : 'bg-white border-slate-300 text-transparent'
  }`}>
    <Check size={12} strokeWidth={3.5} />
  </span>
);

const DateField: React.FC<{
  title?: string;
  label: string;
  value: string;
  calendarType: CalendarType;
  onCalendarTypeChange?: (value: CalendarType) => void;
  onChange: (value: string) => void;
  showCalendarSwitch?: boolean;
}> = ({ title, label, value, calendarType, onChange }) => (
  <div className="flex-1 min-w-[190px]">
    {title ? <p className="text-xs font-black text-[#655ac1] mb-1.5">{title}</p> : null}
    <label className="block text-xs font-black text-slate-500 mb-1.5">{label}</label>
    <div className="flex items-center gap-2">
      <DatePicker
        value={parseIsoDate(value)}
        onChange={date => onChange(formatPickerDate(date))}
        calendar={calendarType === 'hijri' ? arabic : gregorian}
        locale={calendarType === 'hijri' ? arabic_ar : gregorian_ar}
        containerClassName="flex-1"
        inputClass="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors cursor-pointer bg-white"
        placeholder="حدد التاريخ"
        format={calendarType === 'hijri' ? 'dddd YYYY/MM/DD' : 'dddd YYYY-MM-DD'}
        portal
        portalTarget={document.body}
        editable={false}
        zIndex={99999}
      />
    </div>
  </div>
);

const useClickOutside = (open: boolean, onClose: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);
  return ref;
};

const StaffMultiSelect: React.FC<{
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onChange: (values: string[]) => void;
}> = ({ options, selectedValues, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useClickOutside(open, () => setOpen(false));
  const filteredOptions = options.filter(option => option.label.toLowerCase().includes(search.trim().toLowerCase()));
  const selectedLabel = selectedValues.length === 0
    ? 'كل المناوبين'
    : selectedValues.length === 1
      ? options.find(o => o.value === selectedValues[0])?.label || 'مناوب واحد'
      : `${selectedValues.length} مناوبين`;

  return (
    <div ref={ref} className="relative flex-1 min-w-[250px]">
      <label className="block text-xs font-black text-slate-500 mb-2">المناوبون</label>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2"
      >
        <span className="truncate text-[13px] leading-tight">{selectedLabel}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 w-full rounded-2xl border border-slate-200 bg-white shadow-2xl p-2">
          <div className="relative mb-2">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="بحث عن مناوب"
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-[#655ac1]"
            />
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1] flex items-center justify-between"
            >
              <span>كل المناوبين</span>
              <CircleCheck checked={selectedValues.length === 0} />
            </button>
            {filteredOptions.map(option => {
              const checked = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(checked ? selectedValues.filter(v => v !== option.value) : [...selectedValues, option.value])}
                  className="w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1] flex items-center justify-between"
                >
                  <span className="truncate">{option.label}</span>
                  <CircleCheck checked={checked} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const StaffSingleSelect: React.FC<{
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
  searchPlaceholder?: string;
}> = ({ label, options, value, onChange, emptyLabel = 'كل المناوبين', searchPlaceholder = 'بحث عن مناوب' }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useClickOutside(open, () => setOpen(false));
  const filteredOptions = options.filter(option => option.label.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = options.find(option => option.value === value);

  return (
    <div ref={ref} className="relative flex-1 min-w-[220px]">
      <label className="block text-xs font-black text-slate-500 mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2"
      >
        <span className="truncate text-[13px] leading-tight">{selected?.label || emptyLabel}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 w-full rounded-2xl border border-slate-200 bg-white shadow-2xl p-2">
          <div className="relative mb-2">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-[#655ac1]"
            />
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1] flex items-center justify-between"
            >
              <span>{emptyLabel}</span>
              <CircleCheck checked={!value} />
            </button>
            {filteredOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); }}
                className="w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1] flex items-center justify-between"
              >
                <span className="truncate">{option.label}</span>
                <CircleCheck checked={value === option.value} />
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-center text-xs font-bold text-slate-400">لا توجد نتائج</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MonitoringTab: React.FC<Props> = ({ dutyData, setDutyData, schoolInfo, teachers, admins, showToast }) => {
  const today = useMemo(() => formatIsoDate(new Date()), []);
  const [activeView, setActiveView] = useState<InnerTab>('daily');
  const [selectedDate, setSelectedDate] = useState(today);
  const dailyCalendarType = ((schoolInfo.calendarType || 'hijri') as CalendarType);
  const reportCalendarType = ((schoolInfo.calendarType || 'hijri') as CalendarType);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reportFrom, setReportFrom] = useState(today);
  const [reportTo, setReportTo] = useState(today);
  const [reportStaffIds, setReportStaffIds] = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const attendanceRecords = dutyData.attendanceRecords || [];

  const selectedDateObj = parseIsoDate(selectedDate) || new Date();
  const selectedDayKey = DAY_KEYS[selectedDateObj.getDay()] || 'sunday';
  const selectedDayName = DAY_NAMES[selectedDayKey] || dayNameForDate(selectedDate);
  const dayAssignment = dutyData.dayAssignments.find(day => day.day === selectedDayKey);

  const adminRoleById = useMemo(() => {
    const map = new Map<string, string>();
    admins.forEach(a => { if (a.role) map.set(a.id, a.role); });
    return map;
  }, [admins]);

  const getStaffRoleLabel = (staffType: 'teacher' | 'admin', staffId?: string) => {
    if (staffType === 'teacher') return 'معلم';
    return (staffId && adminRoleById.get(staffId)) || 'إداري';
  };

  const dayStaffOptions = useMemo(() => {
    const map = new Map<string, string>();
    (dayAssignment?.staffAssignments || []).forEach(item => map.set(item.staffId, item.staffName));
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [dayAssignment]);

  const effectiveStaffId = selectedStaffId && dayStaffOptions.some(opt => opt.value === selectedStaffId)
    ? selectedStaffId
    : '';

  const dailyRows = useMemo(() => {
    const assignments = dayAssignment?.staffAssignments || [];
    return assignments
      .filter(item => !effectiveStaffId || item.staffId === effectiveStaffId)
      .map(item => {
        const record = attendanceRecords.find(rec =>
          rec.date === selectedDate && rec.staffId === item.staffId
        );
        return {
          ...item,
          record,
          status: record?.status,
        };
      });
  }, [dayAssignment, effectiveStaffId, selectedDate, attendanceRecords]);

  const dailyStats = useMemo(() => {
    const base = STATUS_OPTIONS.reduce((acc, option) => {
      acc[option.value] = dailyRows.filter(row => row.status === option.value).length;
      return acc;
    }, {} as Record<SupervisionAttendanceStatus, number>);
    return {
      ...base,
      unrecorded: dailyRows.filter(row => !row.record).length,
    };
  }, [dailyRows]);

  const saveAttendance = (
    staff: typeof dailyRows[number],
    status: SupervisionAttendanceStatus,
    noteOverride?: string
  ) => {
    const noteValue = noteOverride ?? notes[staff.staffId] ?? staff.record?.notes ?? '';
    const record: DutyAttendanceRecord = {
      id: `duty-att-${selectedDate}-${staff.staffId}`,
      date: selectedDate,
      day: selectedDayKey,
      staffId: staff.staffId,
      staffType: staff.staffType,
      staffName: staff.staffName,
      status,
      notes: noteValue,
      recordedAt: new Date().toISOString(),
    };
    setDutyData(prev => {
      const prevRecords = prev.attendanceRecords || [];
      const next = prevRecords.filter(item =>
        !(item.date === selectedDate && item.staffId === staff.staffId)
      );
      return { ...prev, attendanceRecords: [...next, record] };
    });
  };

  const reportStaffOptions = useMemo(() => {
    const map = new Map<string, string>();
    dutyData.dayAssignments.forEach(day => {
      day.staffAssignments.forEach(staff => map.set(staff.staffId, staff.staffName));
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [dutyData.dayAssignments]);

  const reportRows = useMemo(() => {
    const from = reportFrom || '0000-00-00';
    const to = reportTo || '9999-99-99';
    const selected = new Set(reportStaffIds);

    // Build per-staff aggregates
    type Acc = {
      staffId: string;
      staffName: string;
      staffType: 'teacher' | 'admin';
      total: number; // عدد المناوبات
      counts: Record<SupervisionAttendanceStatus, number>;
      submittedReports: number;
    };
    const byStaff = new Map<string, Acc>();

    const ensure = (staffId: string, staffName: string, staffType: 'teacher' | 'admin') => {
      if (!byStaff.has(staffId)) {
        byStaff.set(staffId, {
          staffId,
          staffName,
          staffType,
          total: 0,
          counts: STATUS_OPTIONS.reduce((acc, opt) => { acc[opt.value] = 0; return acc; }, {} as Record<SupervisionAttendanceStatus, number>),
          submittedReports: 0,
        });
      }
      return byStaff.get(staffId)!;
    };

    // 1) Count actual duty assignments. The dated week schedule (weekAssignments) reflects
    //    the real rotation, so each staff is counted only on the days they actually serve.
    //    Fall back to the weekly template only when no dated schedule exists.
    const weeks = dutyData.weekAssignments && dutyData.weekAssignments.length > 0
      ? dutyData.weekAssignments
      : null;
    if (weeks) {
      weeks.forEach(week => {
        week.dayAssignments.forEach(da => {
          if (!da.date || da.date < from || da.date > to) return;
          if (da.isDisabled || da.isOfficialLeave) return;
          da.staffAssignments.forEach(staff => {
            if (selected.size > 0 && !selected.has(staff.staffId)) return;
            const acc = ensure(staff.staffId, staff.staffName, staff.staffType);
            acc.total += 1;
          });
        });
      });
    } else {
      const fromDate = parseIsoDate(from);
      const toDate = parseIsoDate(to);
      if (fromDate && toDate && fromDate <= toDate) {
        const cursor = new Date(fromDate);
        while (cursor <= toDate) {
          const dayKey = DAY_KEYS[cursor.getDay()];
          const dayAssign = dutyData.dayAssignments.find(d => d.day === dayKey);
          if (dayAssign && !dayAssign.isDisabled && !dayAssign.isOfficialLeave) {
            dayAssign.staffAssignments.forEach(staff => {
              if (selected.size > 0 && !selected.has(staff.staffId)) return;
              const acc = ensure(staff.staffId, staff.staffName, staff.staffType);
              acc.total += 1;
            });
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }

    // 2) Attendance status counts within range
    attendanceRecords.forEach(rec => {
      if (rec.date < from || rec.date > to) return;
      if (selected.size > 0 && !selected.has(rec.staffId)) return;
      const acc = ensure(rec.staffId, rec.staffName, rec.staffType);
      acc.counts[rec.status] += 1;
    });

    // 3) Submitted reports within range
    (dutyData.reports || []).forEach(report => {
      if (!report.isSubmitted) return;
      if (report.date < from || report.date > to) return;
      if (selected.size > 0 && !selected.has(report.staffId)) return;
      const acc = byStaff.get(report.staffId);
      if (acc) {
        acc.submittedReports += 1;
      } else {
        // staff not currently assigned but has a submitted report in range
        const created = ensure(report.staffId, report.staffName, 'teacher');
        created.submittedReports += 1;
      }
    });

    return Array.from(byStaff.values())
      .filter(row => row.total > 0 || row.submittedReports > 0 || Object.values(row.counts).some(v => v > 0))
      .map(row => {
        const recordedTotal = STATUS_OPTIONS.reduce((sum, option) => sum + row.counts[option.value], 0);
        const commitmentRate = recordedTotal > 0 ? Math.round((row.counts.present / recordedTotal) * 100) : 0;
        return { ...row, recordedTotal, commitmentRate };
      })
      .sort((a, b) => a.staffName.localeCompare(b.staffName, 'ar'));
  }, [reportFrom, reportTo, reportStaffIds, dutyData.dayAssignments, dutyData.weekAssignments, dutyData.reports, attendanceRecords]);

  const reportTotals = useMemo(() => {
    const counts = STATUS_OPTIONS.reduce((acc, option) => {
      acc[option.value] = reportRows.reduce((sum, row) => sum + row.counts[option.value], 0);
      return acc;
    }, {} as Record<SupervisionAttendanceStatus, number>);
    const total = reportRows.reduce((sum, row) => sum + row.total, 0);
    const submittedReports = reportRows.reduce((sum, row) => sum + row.submittedReports, 0);
    const recordedTotal = reportRows.reduce((sum, row) => sum + row.recordedTotal, 0);
    const commitmentRate = recordedTotal > 0 ? Math.round((counts.present / recordedTotal) * 100) : 0;
    return { counts, total, submittedReports, recordedTotal, commitmentRate };
  }, [reportRows]);

  const printReport = () => {
    const html = printRef.current?.innerHTML || '';
    if (!html) { showToast('لا توجد بيانات للطباعة', 'warning'); return; }
    const win = window.open('', '_blank');
    if (!win) { showToast('تعذر فتح نافذة الطباعة', 'error'); return; }
    win.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
      <title>تقرير أداء المناوبة اليومية</title>
      <style>
        @page{size:A4;margin:14mm}
        body{font-family:Arial,Tahoma,sans-serif;margin:0;color:#1e293b}
        .official-header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #655ac1;padding-bottom:14px;margin-bottom:18px}
        .official-header .side{font-size:12px;font-weight:800;line-height:1.8;color:#334155}
        .official-header .center{text-align:center;font-size:13px;font-weight:900;color:#655ac1}
        h1{font-size:20px;margin:0 0 8px;text-align:right}
        .meta{text-align:right;color:#64748b;font-weight:700;margin-bottom:18px;font-size:12px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #cbd5e1;padding:9px;text-align:center}
        th{background:#f1f5f9;color:#655ac1;font-weight:900}
        td:nth-child(2),th:nth-child(2){text-align:right}
        [data-print-hidden]{display:none!important}
      </style></head><body>${html}<script>window.print();</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'daily' as InnerTab, label: 'المتابعة اليومية للمناوبة', icon: UserCheck },
          { id: 'reports' as InnerTab, label: 'تقارير الأداء', icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveView(tab.id)}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-black whitespace-nowrap transition-all ${
              activeView === tab.id
                ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-md shadow-[#655ac1]/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-slate-50'
            }`}
          >
            <tab.icon size={17} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeView === 'daily' && (
        <div className="space-y-5">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
            <div className="flex flex-wrap gap-4 items-end">
              <DateField
                label="اليوم والتاريخ"
                value={selectedDate}
                calendarType={dailyCalendarType}
                onChange={setSelectedDate}
              />
              <StaffSingleSelect
                label="المناوبون"
                options={dayStaffOptions}
                value={effectiveStaffId}
                onChange={setSelectedStaffId}
              />
            </div>
          </div>
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">جدول متابعة الأداء</h3>
                <p className="text-xs font-bold text-[#655ac1] mt-1">{selectedDayName} - {formatHijriDate(selectedDate)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-[#655ac1]">
                  <span>{dailyRows.length}</span>
                  <span>{pluralStaff(dailyRows.length)}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-500">
                  لم يرصد بعد: {dailyStats.unrecorded}
                </span>
              </div>
            </div>
            <div className="px-6 py-4 border-b border-slate-100 bg-white">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                {[
                  ...STATUS_OPTIONS.map(option => ({
                    label: option.label,
                    value: dailyStats[option.value],
                    textColor: STATUS_STYLES[option.value].textColor,
                  })),
                  { label: 'لم يرصد', value: dailyStats.unrecorded, textColor: 'text-slate-400' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center">
                    <p className={`text-2xl font-black ${stat.textColor}`}>{stat.value}</p>
                    <p className="mt-1 text-xs font-black text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center w-14">م</th>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1]">المناوب</th>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1]">الصفة</th>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center">الأداء</th>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1]">الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyRows.map((row, index) => (
                    <tr key={row.staffId} className="hover:bg-[#fbfaff] transition-colors">
                      <td className="px-5 py-4 text-center text-sm font-black text-slate-400">{index + 1}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-800 whitespace-nowrap">{row.staffName}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-500 whitespace-nowrap">{getStaffRoleLabel(row.staffType, row.staffId)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-center gap-4 min-w-[360px]">
                          {STATUS_OPTIONS.map(option => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => saveAttendance(row, option.value)}
                              className={`inline-flex items-center gap-2 text-xs font-black transition-colors ${
                                row.status === option.value ? STATUS_STYLES[option.value].textColor : 'text-slate-600 hover:text-[#655ac1]'
                              }`}
                            >
                              <CircleCheck checked={row.status === option.value} dotColor={STATUS_STYLES[option.value].dotColor} />
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 min-w-[240px]">
                        <input
                          value={notes[row.staffId] ?? row.record?.notes ?? ''}
                          onChange={e => {
                            setNotes(prev => ({ ...prev, [row.staffId]: e.target.value }));
                            if (row.status) saveAttendance(row, row.status, e.target.value);
                          }}
                          placeholder="ملاحظة..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#655ac1]"
                        />
                      </td>
                    </tr>
                  ))}
                  {dailyRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm font-bold text-slate-400">لا توجد تكليفات مناوبة لهذا اليوم.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'reports' && (
        <div className="space-y-5">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(250px,1.2fr)] gap-3 items-end">
                <DateField
                  label="من يوم وتاريخ"
                  value={reportFrom}
                  calendarType={reportCalendarType}
                  onChange={setReportFrom}
                />
                <DateField
                  label="إلى يوم وتاريخ"
                  value={reportTo}
                  calendarType={reportCalendarType}
                  onChange={setReportTo}
                />
                <StaffMultiSelect options={reportStaffOptions} selectedValues={reportStaffIds} onChange={setReportStaffIds} />
              </div>
            </div>
          </div>

          <div ref={printRef} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
            <div className="official-header hidden print:flex">
              <div className="side">
                <div>المملكة العربية السعودية</div>
                <div>وزارة التعليم</div>
                <div>{schoolInfo.educationAdministration || ''}</div>
              </div>
              <div className="center">
                <div>{schoolInfo.schoolName || ''}</div>
                <div>تقرير أداء المناوبة اليومية</div>
              </div>
              <div className="side">
                <div>العام الدراسي: {schoolInfo.academicYear || ''}</div>
                <div>الفصل الدراسي: {schoolInfo.semesters?.find(s => s.id === schoolInfo.currentSemesterId || s.isCurrent)?.name || ''}</div>
              </div>
            </div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="text-right">
                <h1 className="text-sm font-black text-slate-900">تقرير أداء المناوبة اليومية</h1>
                <p className="text-[11px] font-bold text-[#655ac1] mt-2">
                  من {formatDateLabel(reportFrom, reportCalendarType)} إلى {formatDateLabel(reportTo, reportCalendarType)}
                </p>
              </div>
              <button
                type="button"
                onClick={printReport}
                data-print-hidden
                className="flex w-fit shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl bg-[#655ac1] text-white text-xs font-black hover:bg-[#5046a0] transition-all"
              >
                <Printer size={16} />
                طباعة التقرير
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-right text-[12px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-[11px] font-black text-[#655ac1] text-center border-l border-slate-200">م</th>
                    <th className="px-3 py-2.5 text-[11px] font-black text-[#655ac1] border-l border-slate-200">المناوب</th>
                    <th className="px-3 py-2.5 text-[11px] font-black text-[#655ac1] text-center border-l-2 border-slate-300">الصفة</th>
                    {STATUS_OPTIONS.map(option => <th key={option.value} className={`px-3 py-2.5 text-[11px] font-black text-center border-l border-slate-200 ${STATUS_STYLES[option.value].textColor}`}>{option.label}</th>)}
                    <th className="px-3 py-2.5 text-[11px] font-black text-[#655ac1] text-center border-l-2 border-slate-300">عدد المناوبات</th>
                    <th className="px-3 py-2.5 text-[11px] font-black text-[#655ac1] text-center border-l border-slate-200">التقارير المسلمة</th>
                    <th className="px-3 py-2.5 text-[11px] font-black text-slate-700 text-center">نسبة الالتزام %</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row, index) => (
                    <tr key={row.staffId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/45'} border-b border-slate-100`}>
                      <td className="px-3 py-2.5 text-center font-black text-slate-400 border-l border-slate-200">{index + 1}</td>
                      <td className="px-3 py-2.5 font-black text-slate-800 border-l border-slate-200 whitespace-nowrap">{row.staffName}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-500 border-l-2 border-slate-300 whitespace-nowrap">{getStaffRoleLabel(row.staffType, row.staffId)}</td>
                      {STATUS_OPTIONS.map(option => (
                        <td key={option.value} className={`px-3 py-2.5 text-center font-bold tabular-nums border-l border-slate-200 ${STATUS_STYLES[option.value].textColor}`}>
                          {row.counts[option.value] || <span className="text-slate-300">0</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-black tabular-nums text-slate-700 border-l-2 border-slate-300">{row.total}</td>
                      <td className="px-3 py-2.5 text-center font-black tabular-nums text-[#655ac1] border-l border-slate-200">{row.submittedReports}</td>
                      <td className="px-3 py-2.5 text-center font-black tabular-nums text-slate-700">{row.commitmentRate}%</td>
                    </tr>
                  ))}
                  {reportRows.length === 0 && (
                    <tr><td colSpan={11} className="px-6 py-12 text-center text-sm font-bold text-slate-400">لا توجد بيانات أداء ضمن الفترة المحددة.</td></tr>
                  )}
                </tbody>
                {reportRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-300">
                      <td className="px-3 py-2.5 font-black text-slate-700 border-l-2 border-slate-300" colSpan={3}>الإجمالي</td>
                      {STATUS_OPTIONS.map(option => (
                        <td key={option.value} className={`px-3 py-2.5 text-center font-black tabular-nums border-l border-slate-200 ${STATUS_STYLES[option.value].textColor}`}>
                          {reportTotals.counts[option.value] || <span className="text-slate-300">0</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-black tabular-nums text-slate-800 border-l-2 border-slate-300">{reportTotals.total}</td>
                      <td className="px-3 py-2.5 text-center font-black tabular-nums text-[#655ac1] border-l border-slate-200">{reportTotals.submittedReports}</td>
                      <td className="px-3 py-2.5 text-center font-black tabular-nums text-slate-800">{reportTotals.commitmentRate}%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringTab;
