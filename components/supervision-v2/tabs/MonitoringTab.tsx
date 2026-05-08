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
  SchoolInfo, SupervisionAttendanceRecord, SupervisionAttendanceStatus, SupervisionScheduleData,
} from '../../../types';
import { DAY_NAMES } from '../../../utils/supervisionUtils';

interface Props {
  supervisionData: SupervisionScheduleData;
  setSupervisionData: React.Dispatch<React.SetStateAction<SupervisionScheduleData>>;
  schoolInfo: SchoolInfo;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

type InnerTab = 'daily' | 'reports';
type CalendarType = 'hijri' | 'gregorian';

const STATUS_OPTIONS: Array<{ value: SupervisionAttendanceStatus; label: string }> = [
  { value: 'present', label: 'حاضر' },
  { value: 'absent', label: 'غائب' },
  { value: 'excused', label: 'مستأذن' },
  { value: 'late', label: 'متأخر' },
  { value: 'withdrawn', label: 'منسحب' },
];

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
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'long',
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

const pluralSupervisors = (count: number) => {
  if (count === 1) return 'مشرف';
  if (count === 2) return 'مشرفان';
  return 'مشرفين';
};

const CircleCheck: React.FC<{ checked: boolean }> = ({ checked }) => (
  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
    checked ? 'border-[#655ac1] bg-white text-[#655ac1]' : 'border-slate-300 bg-white text-transparent'
  }`}>
    <Check size={12} strokeWidth={3} />
  </span>
);

const CalendarSwitch: React.FC<{ value: CalendarType; onChange: (value: CalendarType) => void }> = ({ value, onChange }) => (
  <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5">
    {[
      { value: 'hijri' as CalendarType, label: 'هجري' },
      { value: 'gregorian' as CalendarType, label: 'ميلادي' },
    ].map(option => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`px-2 py-1 rounded-md text-[10px] font-black transition-all ${
          value === option.value ? 'bg-[#655ac1] text-white' : 'text-slate-500 hover:text-[#655ac1]'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const DateField: React.FC<{
  title?: string;
  label: string;
  value: string;
  calendarType: CalendarType;
  onCalendarTypeChange: (value: CalendarType) => void;
  onChange: (value: string) => void;
  showCalendarSwitch?: boolean;
}> = ({ title, label, value, calendarType, onCalendarTypeChange, onChange, showCalendarSwitch = true }) => (
  <div className="flex-1 min-w-[190px]">
    {title ? <p className="text-xs font-black text-[#655ac1] mb-1.5">{title}</p> : null}
    <label className="block text-xs font-black text-slate-500 mb-1.5">{label}</label>
    <div className="flex items-center gap-2">
      {showCalendarSwitch && <CalendarSwitch value={calendarType} onChange={onCalendarTypeChange} />}
      <DatePicker
        value={parseIsoDate(value)}
        onChange={date => onChange(formatPickerDate(date))}
        calendar={calendarType === 'hijri' ? arabic : gregorian}
        locale={calendarType === 'hijri' ? arabic_ar : gregorian_ar}
        containerClassName="flex-1"
        inputClass="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors cursor-pointer bg-white"
        placeholder="حدد التاريخ"
        format={calendarType === 'hijri' ? 'dddd DD MMMM YYYY' : 'dddd YYYY-MM-DD'}
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

const TypeSelect: React.FC<{
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(open, () => setOpen(false));
  const selected = options.find(option => option.value === value);
  return (
    <div ref={ref} className="relative flex-1 min-w-[220px]">
      <label className="block text-xs font-black text-slate-500 mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2"
      >
        <span className="truncate text-[13px] leading-tight">{selected?.label || 'اختر'}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 w-full rounded-2xl border border-slate-200 bg-white shadow-2xl p-2">
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); }}
                className="w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1] flex items-center justify-between"
              >
                <span>{option.label}</span>
                <CircleCheck checked={value === option.value} />
              </button>
            ))}
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
}> = ({ label, options, value, onChange, emptyLabel = 'كل المشرفين', searchPlaceholder = 'بحث عن مشرف' }) => {
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
    ? 'كل المشرفين'
    : selectedValues.length === 1
      ? options.find(o => o.value === selectedValues[0])?.label || 'مشرف واحد'
      : `${selectedValues.length} مشرفين`;

  return (
    <div ref={ref} className="relative flex-1 min-w-[250px]">
      <label className="block text-xs font-black text-slate-500 mb-2">المشرفون</label>
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
              placeholder="بحث عن مشرف"
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-[#655ac1]"
            />
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1] flex items-center justify-between"
            >
              <span>كل المشرفين</span>
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

const MonitoringTab: React.FC<Props> = ({ supervisionData, setSupervisionData, schoolInfo, showToast }) => {
  const today = useMemo(() => formatIsoDate(new Date()), []);
  const [activeView, setActiveView] = useState<InnerTab>('daily');
  const [selectedDate, setSelectedDate] = useState(today);
  const [dailyCalendarType, setDailyCalendarType] = useState<CalendarType>((schoolInfo.calendarType || 'hijri') as CalendarType);
  const [reportCalendarType, setReportCalendarType] = useState<CalendarType>((schoolInfo.calendarType || 'hijri') as CalendarType);
  const [selectedTypeId, setSelectedTypeId] = useState(supervisionData.supervisionTypes.find(type => type.isEnabled)?.id || '');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reportFrom, setReportFrom] = useState(today);
  const [reportTo, setReportTo] = useState(today);
  const [reportStaffIds, setReportStaffIds] = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const selectedDateObj = parseIsoDate(selectedDate) || new Date();
  const selectedDayKey = DAY_KEYS[selectedDateObj.getDay()] || 'sunday';
  const selectedDayName = DAY_NAMES[selectedDayKey] || dayNameForDate(selectedDate);
  const enabledTypes = supervisionData.supervisionTypes.filter(type => type.isEnabled);
  const selectedType = enabledTypes.find(type => type.id === selectedTypeId) || enabledTypes[0];
  const dayAssignment = supervisionData.dayAssignments.find(day => day.day === selectedDayKey);

  const dayStaffOptions = useMemo(() => {
    const assignments = dayAssignment?.staffAssignments || [];
    const list = assignments.filter(item => !selectedType || item.contextTypeId === selectedType.id);
    const map = new Map<string, string>();
    list.forEach(item => map.set(item.staffId, item.staffName));
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [dayAssignment, selectedType]);

  const effectiveStaffId = selectedStaffId && dayStaffOptions.some(opt => opt.value === selectedStaffId)
    ? selectedStaffId
    : '';

  const dailyRows = useMemo(() => {
    const assignments = dayAssignment?.staffAssignments || [];
    return assignments
      .filter(item => !selectedType || item.contextTypeId === selectedType.id)
      .filter(item => !effectiveStaffId || item.staffId === effectiveStaffId)
      .map(item => {
        const record = supervisionData.attendanceRecords.find(record =>
          record.date === selectedDate &&
          record.staffId === item.staffId &&
          (record.contextTypeId || item.contextTypeId) === item.contextTypeId
        );
        return {
          ...item,
          typeName: supervisionData.supervisionTypes.find(type => type.id === item.contextTypeId)?.name || selectedType?.name || '',
          record,
          status: record?.status || 'present',
        };
      });
  }, [dayAssignment, effectiveStaffId, selectedDate, selectedType, supervisionData]);

  const saveAttendance = (
    staff: typeof dailyRows[number],
    status: SupervisionAttendanceStatus,
    noteOverride?: string
  ) => {
    const noteValue = noteOverride ?? notes[staff.staffId] ?? staff.record?.notes ?? '';
    const record: SupervisionAttendanceRecord = {
      id: `att-${selectedDate}-${staff.contextTypeId}-${staff.staffId}`,
      date: selectedDate,
      day: selectedDayKey,
      staffId: staff.staffId,
      staffType: staff.staffType,
      staffName: staff.staffName,
      contextTypeId: staff.contextTypeId,
      contextTypeName: staff.typeName,
      status,
      notes: noteValue,
      recordedAt: new Date().toISOString(),
    };
    setSupervisionData(prev => {
      const next = prev.attendanceRecords.filter(item =>
        !(item.date === selectedDate && item.staffId === staff.staffId && item.contextTypeId === staff.contextTypeId)
      );
      return { ...prev, attendanceRecords: [...next, record] };
    });
  };

  const markAllPresent = () => {
    dailyRows.forEach(row => saveAttendance(row, 'present'));
    showToast('تم تحديد الكل حاضر', 'success');
  };

  const reportStaffOptions = useMemo(() => {
    const map = new Map<string, string>();
    supervisionData.dayAssignments.forEach(day => {
      day.staffAssignments.forEach(staff => map.set(staff.staffId, staff.staffName));
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [supervisionData.dayAssignments]);

  const reportRows = useMemo(() => {
    const from = reportFrom || '0000-00-00';
    const to = reportTo || '9999-99-99';
    const selected = new Set(reportStaffIds);
    const records = supervisionData.attendanceRecords.filter(record =>
      record.date >= from &&
      record.date <= to &&
      (selected.size === 0 || selected.has(record.staffId))
    );
    const grouped = new Map<string, SupervisionAttendanceRecord[]>();
    records.forEach(record => {
      if (!grouped.has(record.staffId)) grouped.set(record.staffId, []);
      grouped.get(record.staffId)!.push(record);
    });
    return Array.from(grouped.values()).map(items => {
      const first = items[0];
      const counts = STATUS_OPTIONS.reduce((acc, option) => {
        acc[option.value] = items.filter(item => item.status === option.value).length;
        return acc;
      }, {} as Record<SupervisionAttendanceStatus, number>);
      return { staffId: first.staffId, staffName: first.staffName, staffType: first.staffType, total: items.length, counts };
    });
  }, [reportFrom, reportStaffIds, reportTo, supervisionData.attendanceRecords]);

  const printReport = () => {
    const html = printRef.current?.innerHTML || '';
    if (!html) { showToast('لا توجد بيانات للطباعة', 'warning'); return; }
    const win = window.open('', '_blank');
    if (!win) { showToast('تعذر فتح نافذة الطباعة', 'error'); return; }
    win.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
      <title>تقرير أداء الإشراف</title>
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
      </style></head><body>${html}<script>window.print();</script></body></html>`);
    win.document.close();
  };

  const typeOptions = enabledTypes.map(type => ({ value: type.id, label: type.name }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'daily' as InnerTab, label: 'المتابعة اليومية للإشراف', icon: UserCheck },
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
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-black text-slate-500">نوع التقويم</span>
              <CalendarSwitch value={dailyCalendarType} onChange={setDailyCalendarType} />
            </div>
            <div className="flex flex-wrap gap-4 items-end">
              <DateField
                label={`اليوم والتاريخ: ${formatDateLabel(selectedDate, dailyCalendarType)}`}
                value={selectedDate}
                calendarType={dailyCalendarType}
                onCalendarTypeChange={setDailyCalendarType}
                onChange={setSelectedDate}
                showCalendarSwitch={false}
              />
              <TypeSelect
                label="نوع الإشراف"
                value={selectedType?.id || ''}
                options={typeOptions}
                onChange={setSelectedTypeId}
              />
              <StaffSingleSelect
                label="المشرفون"
                options={dayStaffOptions}
                value={effectiveStaffId}
                onChange={setSelectedStaffId}
              />
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-800">جدول متابعة الأداء</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">{selectedDayName} - {formatHijriDate(selectedDate)} - {selectedType?.name || ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-[#655ac1]">
                  <span>{dailyRows.length}</span>
                  <span>{pluralSupervisors(dailyRows.length)}</span>
                </span>
                <button
                  type="button"
                  onClick={markAllPresent}
                  disabled={dailyRows.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black hover:bg-emerald-600 transition-all disabled:opacity-50"
                >
                  <Check size={15} />
                  تحديد الكل حاضر
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center w-14">م</th>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1]">المشرف</th>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1]">الصفة</th>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center">الأداء</th>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1]">الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyRows.map((row, index) => (
                    <tr key={`${row.contextTypeId}-${row.staffId}`} className="hover:bg-[#fbfaff] transition-colors">
                      <td className="px-5 py-4 text-center text-sm font-black text-slate-400">{index + 1}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-800 whitespace-nowrap">{row.staffName}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-500">{row.staffType === 'teacher' ? 'معلم' : 'إداري'}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-center gap-4 min-w-[360px]">
                          {STATUS_OPTIONS.map(option => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => saveAttendance(row, option.value)}
                              className="inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-[#655ac1] transition-colors"
                            >
                              <CircleCheck checked={row.status === option.value} />
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
                            saveAttendance(row, row.status, e.target.value);
                          }}
                          placeholder="ملاحظة..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#655ac1]"
                        />
                      </td>
                    </tr>
                  ))}
                  {dailyRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm font-bold text-slate-400">لا توجد تكليفات مطابقة لهذا اليوم ونوع الإشراف.</td>
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
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-black text-slate-500">نوع التقويم</span>
              <CalendarSwitch value={reportCalendarType} onChange={setReportCalendarType} />
            </div>
            <div className="flex flex-wrap gap-4 items-end">
              <DateField
                label={`من يوم وتاريخ: ${formatDateLabel(reportFrom, reportCalendarType)}`}
                value={reportFrom}
                calendarType={reportCalendarType}
                onCalendarTypeChange={setReportCalendarType}
                onChange={setReportFrom}
                showCalendarSwitch={false}
              />
              <DateField
                label={`إلى يوم وتاريخ: ${formatDateLabel(reportTo, reportCalendarType)}`}
                value={reportTo}
                calendarType={reportCalendarType}
                onCalendarTypeChange={setReportCalendarType}
                onChange={setReportTo}
                showCalendarSwitch={false}
              />
              <StaffMultiSelect options={reportStaffOptions} selectedValues={reportStaffIds} onChange={setReportStaffIds} />
              <button
                type="button"
                onClick={printReport}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#655ac1] text-white text-sm font-black hover:bg-[#5046a0] transition-all"
              >
                <Printer size={16} />
                طباعة التقرير
              </button>
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
                <div>تقرير أداء الإشراف اليومي</div>
              </div>
              <div className="side">
                <div>العام الدراسي: {schoolInfo.academicYear || ''}</div>
                <div>الفصل الدراسي: {schoolInfo.semesters?.find(s => s.id === schoolInfo.currentSemesterId || s.isCurrent)?.name || ''}</div>
              </div>
            </div>
            <h1 className="text-xl font-black text-slate-800 text-right">تقرير أداء الإشراف اليومي</h1>
            <p className="text-right text-sm font-bold text-slate-500 mt-2 mb-5">
              من {formatDateLabel(reportFrom, reportCalendarType)} إلى {formatDateLabel(reportTo, reportCalendarType)}
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-black text-[#655ac1] text-center">م</th>
                    <th className="px-4 py-3 font-black text-[#655ac1]">المشرف</th>
                    <th className="px-4 py-3 font-black text-[#655ac1] text-center">الصفة</th>
                    {STATUS_OPTIONS.map(option => <th key={option.value} className="px-4 py-3 font-black text-[#655ac1] text-center">{option.label}</th>)}
                    <th className="px-4 py-3 font-black text-[#655ac1] text-center">إجمالي الرصد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportRows.map((row, index) => (
                    <tr key={row.staffId}>
                      <td className="px-4 py-3 text-center font-black text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-black text-slate-800">{row.staffName}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-500">{row.staffType === 'teacher' ? 'معلم' : 'إداري'}</td>
                      {STATUS_OPTIONS.map(option => <td key={option.value} className="px-4 py-3 text-center font-bold text-slate-600">{row.counts[option.value]}</td>)}
                      <td className="px-4 py-3 text-center font-black text-slate-700">{row.total}</td>
                    </tr>
                  ))}
                  {reportRows.length === 0 && (
                    <tr><td colSpan={9} className="px-6 py-12 text-center text-sm font-bold text-slate-400">لا توجد بيانات أداء ضمن الفترة المحددة.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringTab;
