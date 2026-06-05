import React, { useEffect, useMemo, useRef, useState } from 'react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import arabic from 'react-date-object/calendars/arabic';
import arabic_ar from 'react-date-object/locales/arabic_ar';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_ar from 'react-date-object/locales/gregorian_ar';
import {
  BarChart3, Check, ChevronDown, Printer, Search, UserCheck, X,
} from 'lucide-react';
import {
  Admin, SchoolInfo, SupervisionAttendanceRecord, SupervisionAttendanceStatus, SupervisionScheduleData,
} from '../../../types';
import { DAY_NAMES } from '../../../utils/supervisionUtils';

interface Props {
  supervisionData: SupervisionScheduleData;
  setSupervisionData: React.Dispatch<React.SetStateAction<SupervisionScheduleData>>;
  schoolInfo: SchoolInfo;
  admins: Admin[];
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

type InnerTab = 'daily' | 'reports';
type CalendarType = 'hijri' | 'gregorian';

const STATUS_OPTIONS: Array<{ value: SupervisionAttendanceStatus; label: string; textColor: string; dotColor: string }> = [
  { value: 'present', label: 'حاضر', textColor: 'text-green-600', dotColor: 'bg-green-500 border-green-500' },
  { value: 'absent', label: 'غائب', textColor: 'text-red-600', dotColor: 'bg-red-500 border-red-500' },
  { value: 'excused', label: 'مستأذن', textColor: 'text-amber-600', dotColor: 'bg-amber-400 border-amber-400' },
  { value: 'late', label: 'متأخر', textColor: 'text-orange-600', dotColor: 'bg-orange-500 border-orange-500' },
  { value: 'withdrawn', label: 'منسحب', textColor: 'text-slate-500', dotColor: 'bg-slate-400 border-slate-400' },
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

const MonitoringTab: React.FC<Props> = ({ supervisionData, setSupervisionData, schoolInfo, admins, showToast }) => {
  const today = useMemo(() => formatIsoDate(new Date()), []);
  const [activeView, setActiveView] = useState<InnerTab>('daily');
  const [selectedDate, setSelectedDate] = useState(today);
  const dailyCalendarType = ((schoolInfo.calendarType || 'hijri') as CalendarType);
  const reportCalendarType = ((schoolInfo.calendarType || 'hijri') as CalendarType);
  const [selectedTypeId, setSelectedTypeId] = useState(supervisionData.supervisionTypes.find(type => type.isEnabled)?.id || '');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reportFrom, setReportFrom] = useState(today);
  const [reportTo, setReportTo] = useState(today);
  const [reportTypeId, setReportTypeId] = useState<string>('');
  const [reportStaffIds, setReportStaffIds] = useState<string[]>([]);
  const [showMarkAllConfirm, setShowMarkAllConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const selectedDateObj = parseIsoDate(selectedDate) || new Date();
  const selectedDayKey = DAY_KEYS[selectedDateObj.getDay()] || 'sunday';
  const selectedDayName = DAY_NAMES[selectedDayKey] || dayNameForDate(selectedDate);
  const enabledTypes = supervisionData.supervisionTypes.filter(type => type.isEnabled);
  const selectedType = enabledTypes.find(type => type.id === selectedTypeId) || enabledTypes[0];
  const dayAssignment = supervisionData.dayAssignments.find(day => day.day === selectedDayKey);
  const adminRoleById = useMemo(() => {
    const map = new Map<string, string>();
    admins.forEach(admin => map.set(admin.id, admin.role?.trim() || 'إداري'));
    return map;
  }, [admins]);

  const getStaffRoleLabel = (staffType: 'teacher' | 'admin', staffId: string) =>
    staffType === 'teacher' ? 'معلم' : (adminRoleById.get(staffId) || 'إداري');

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
          status: record?.status,
        };
      });
  }, [dayAssignment, effectiveStaffId, selectedDate, selectedType, supervisionData]);

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
    const now = new Date().toISOString();
    const newRecords: SupervisionAttendanceRecord[] = dailyRows.map(row => ({
      id: `att-${selectedDate}-${row.contextTypeId}-${row.staffId}`,
      date: selectedDate,
      day: selectedDayKey,
      staffId: row.staffId,
      staffType: row.staffType,
      staffName: row.staffName,
      contextTypeId: row.contextTypeId,
      contextTypeName: row.typeName,
      status: 'present',
      notes: notes[row.staffId] ?? row.record?.notes ?? '',
      recordedAt: now,
    }));
    setSupervisionData(prev => {
      const markedKeys = new Set(newRecords.map(record => `${record.date}-${record.contextTypeId}-${record.staffId}`));
      const remaining = prev.attendanceRecords.filter(record =>
        !markedKeys.has(`${record.date}-${record.contextTypeId}-${record.staffId}`)
      );
      return { ...prev, attendanceRecords: [...remaining, ...newRecords] };
    });
    setShowMarkAllConfirm(false);
    showToast('تم تحديد الكل حاضر', 'success');
  };

  const clearDailySelections = () => {
    const visibleKeys = new Set(dailyRows.map(row => `${selectedDate}-${row.contextTypeId}-${row.staffId}`));
    setSupervisionData(prev => ({
      ...prev,
      attendanceRecords: prev.attendanceRecords.filter(record =>
        !visibleKeys.has(`${record.date}-${record.contextTypeId}-${record.staffId}`)
      ),
    }));
    setShowClearAllConfirm(false);
    showToast('تم إلغاء كل اختيارات المتابعة الحالية', 'success');
  };

  const reportTypeOptions = useMemo(() => [
    { value: '', label: 'كل أنواع الإشراف' },
    ...enabledTypes.map(type => ({ value: type.id, label: type.name })),
  ], [enabledTypes]);

  const reportStaffOptions = useMemo(() => {
    const map = new Map<string, string>();
    supervisionData.dayAssignments.forEach(day => {
      day.staffAssignments.forEach(staff => {
        if (reportTypeId && staff.contextTypeId !== reportTypeId) return;
        map.set(staff.staffId, staff.staffName);
      });
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [reportTypeId, supervisionData.dayAssignments]);

  useEffect(() => {
    if (reportStaffIds.length === 0) return;
    const availableStaffIds = new Set(reportStaffOptions.map(option => option.value));
    const nextStaffIds = reportStaffIds.filter(id => availableStaffIds.has(id));
    if (nextStaffIds.length !== reportStaffIds.length) setReportStaffIds(nextStaffIds);
  }, [reportStaffIds, reportStaffOptions]);

  const reportRows = useMemo(() => {
    const dates = getDateRange(reportFrom, reportTo);
    const selected = new Set(reportStaffIds);
    const typeOrder = new Map(supervisionData.supervisionTypes.map((type, index) => [type.id, index]));

    const grouped = new Map<string, {
      staffId: string;
      staffName: string;
      staffType: 'teacher' | 'admin';
      contextTypeId: string;
      typeName: string;
      counts: Record<SupervisionAttendanceStatus, number>;
    }>();

    dates.forEach(date => {
      const dayKey = DAY_KEYS[(parseIsoDate(date) || new Date()).getDay()] || 'sunday';
      const day = supervisionData.dayAssignments.find(item => item.day === dayKey);
      day?.staffAssignments.forEach(staff => {
        if (selected.size > 0 && !selected.has(staff.staffId)) return;
        const contextTypeId = staff.contextTypeId || 'unknown';
        if (reportTypeId && contextTypeId !== reportTypeId) return;
        const key = `${staff.staffId}-${contextTypeId}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            staffId: staff.staffId,
            staffName: staff.staffName,
            staffType: staff.staffType,
            contextTypeId,
            typeName: supervisionData.supervisionTypes.find(type => type.id === contextTypeId)?.name || staff.contextTypeId || 'غير محدد',
            counts: STATUS_OPTIONS.reduce((acc, option) => {
              acc[option.value] = 0;
              return acc;
            }, {} as Record<SupervisionAttendanceStatus, number>),
          });
        }
      });
    });

    supervisionData.attendanceRecords.forEach(record => {
      if (!dates.includes(record.date)) return;
      if (selected.size > 0 && !selected.has(record.staffId)) return;
      const contextTypeId = record.contextTypeId || 'unknown';
      if (reportTypeId && contextTypeId !== reportTypeId) return;
      const key = `${record.staffId}-${contextTypeId}`;
      const row = grouped.get(key);
      if (!row) return;
      row.counts[record.status] += 1;
    });

    return Array.from(grouped.values()).map(row => {
      const total = STATUS_OPTIONS.reduce((sum, option) => sum + row.counts[option.value], 0);
      const commitmentRate = total > 0 ? Math.round((row.counts.present / total) * 100) : 0;
      return { ...row, total, commitmentRate };
    }).sort((a, b) =>
      a.staffName.localeCompare(b.staffName, 'ar') ||
      ((typeOrder.get(a.contextTypeId) ?? 999) - (typeOrder.get(b.contextTypeId) ?? 999)) ||
      a.typeName.localeCompare(b.typeName, 'ar')
    );
  }, [reportFrom, reportStaffIds, reportTo, reportTypeId, supervisionData.attendanceRecords, supervisionData.dayAssignments, supervisionData.supervisionTypes]);

  const reportTotals = useMemo(() => {
    const counts = STATUS_OPTIONS.reduce((acc, option) => {
      acc[option.value] = reportRows.reduce((sum, row) => sum + row.counts[option.value], 0);
      return acc;
    }, {} as Record<SupervisionAttendanceStatus, number>);
    const total = reportRows.reduce((sum, row) => sum + row.total, 0);
    const commitmentRate = total > 0 ? Math.round((counts.present / total) * 100) : 0;
    return { counts, total, commitmentRate };
  }, [reportRows]);

  const reportRowGroups = useMemo(() => {
    const groups = new Map<string, {
      staffId: string;
      staffName: string;
      staffType: 'teacher' | 'admin';
      rows: typeof reportRows;
    }>();
    reportRows.forEach(row => {
      if (!groups.has(row.staffId)) {
        groups.set(row.staffId, {
          staffId: row.staffId,
          staffName: row.staffName,
          staffType: row.staffType,
          rows: [],
        });
      }
      groups.get(row.staffId)!.rows.push(row);
    });
    return Array.from(groups.values());
  }, [reportRows]);

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
        table{width:100%;border-collapse:collapse;font-size:10.5px}
        th,td{border:1px solid #cbd5e1;padding:7px;text-align:center}
        th{background:#f1f5f9;color:#655ac1;font-weight:900}
        td:nth-child(2),th:nth-child(2){text-align:right}
        [data-print-hidden]{display:none!important}
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
            <div className="flex flex-wrap gap-4 items-end">
              <DateField
                label="اليوم والتاريخ"
                value={selectedDate}
                calendarType={dailyCalendarType}
                onChange={setSelectedDate}
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
                <h3 className="text-base font-black text-slate-900">جدول متابعة الأداء</h3>
                <p className="text-xs font-bold text-[#655ac1] mt-1">{selectedDayName} - {formatHijriDate(selectedDate)} - {selectedType?.name || ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-[#655ac1]">
                  <span>{dailyRows.length}</span>
                  <span>مشرفين</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-500">
                  لم يُرصد بعد: {dailyStats.unrecorded}
                </span>
                <button
                  type="button"
                  onClick={() => setShowMarkAllConfirm(true)}
                  disabled={dailyRows.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black hover:bg-emerald-600 transition-all disabled:opacity-50"
                >
                  <Check size={15} />
                  تحديد الكل حاضر
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearAllConfirm(true)}
                  disabled={dailyRows.length === 0 || dailyStats.unrecorded === dailyRows.length}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-600 text-xs font-black hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  إلغاء كل الاختيارات
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-b border-slate-100 bg-white">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                {[
                  ...STATUS_OPTIONS.map(option => ({
                    label: option.label,
                    value: dailyStats[option.value],
                    textColor: option.textColor,
                  })),
                  { label: 'لم يُرصد', value: dailyStats.unrecorded, textColor: 'text-slate-400' },
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
                      <td className="px-5 py-4 text-sm font-bold text-slate-500 whitespace-nowrap">{getStaffRoleLabel(row.staffType, row.staffId)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-center gap-4 min-w-[360px]">
                          {STATUS_OPTIONS.map(option => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => saveAttendance(row, option.value)}
                              className={`inline-flex items-center gap-2 text-xs font-black transition-colors ${
                                row.status === option.value ? option.textColor : 'text-slate-600 hover:text-[#655ac1]'
                              }`}
                            >
                              <CircleCheck checked={row.status === option.value} dotColor={option.dotColor} />
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
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(220px,1fr)_minmax(250px,1.2fr)] gap-3 items-end">
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
                <TypeSelect
                  label="نوع الإشراف"
                  value={reportTypeId}
                  options={reportTypeOptions}
                  onChange={setReportTypeId}
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
                <div>تقرير أداء الإشراف اليومي</div>
              </div>
              <div className="side">
                <div>العام الدراسي: {schoolInfo.academicYear || ''}</div>
                <div>الفصل الدراسي: {schoolInfo.semesters?.find(s => s.id === schoolInfo.currentSemesterId || s.isCurrent)?.name || ''}</div>
              </div>
            </div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="text-right">
                <h1 className="text-sm font-black text-slate-900">تقرير أداء الإشراف اليومي</h1>
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
                    <th className="px-3 py-2.5 text-[11px] font-black text-[#655ac1] border-l border-slate-200">المشرف</th>
                    <th className="px-3 py-2.5 text-[11px] font-black text-[#655ac1] text-center border-l border-slate-200">الصفة</th>
                    <th className="px-3 py-2.5 text-[11px] font-black text-[#655ac1] text-center border-l-2 border-slate-300">نوع الإشراف</th>
                    {STATUS_OPTIONS.map(option => <th key={option.value} className={`px-3 py-2.5 text-[11px] font-black text-center border-l border-slate-200 ${option.textColor}`}>{option.label}</th>)}
                    <th className="px-3 py-2.5 text-[11px] font-black text-[#655ac1] text-center border-l-2 border-slate-300">إجمالي الرصد</th>
                    <th className="px-3 py-2.5 text-[11px] font-black text-slate-700 text-center">نسبة الالتزام %</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRowGroups.map((group, groupIndex) =>
                    group.rows.map((row, rowIndex) => (
                      <tr key={`${row.staffId}-${row.contextTypeId}`} className={`${groupIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/45'} border-b border-slate-100`}>
                        {rowIndex === 0 && (
                          <>
                            <td rowSpan={group.rows.length} className="px-3 py-2.5 text-center align-middle font-black text-slate-400 border-l border-slate-200">{groupIndex + 1}</td>
                            <td rowSpan={group.rows.length} className="px-3 py-2.5 align-middle font-black text-slate-800 border-l border-slate-200 whitespace-nowrap">{group.staffName}</td>
                            <td rowSpan={group.rows.length} className="px-3 py-2.5 text-center align-middle font-bold text-slate-500 border-l border-slate-200 whitespace-nowrap">{getStaffRoleLabel(group.staffType, group.staffId)}</td>
                          </>
                        )}
                        <td className="px-3 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap border-l-2 border-slate-300">{row.typeName}</td>
                        {STATUS_OPTIONS.map(option => (
                          <td key={option.value} className={`px-3 py-2.5 text-center font-bold tabular-nums border-l border-slate-200 ${option.textColor}`}>
                            {row.counts[option.value] || <span className="text-slate-300">0</span>}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-center font-black tabular-nums text-slate-700 border-l-2 border-slate-300">{row.total}</td>
                        <td className="px-3 py-2.5 text-center font-black tabular-nums text-slate-700">{row.commitmentRate}%</td>
                      </tr>
                    ))
                  )}
                  {reportRows.length === 0 && (
                    <tr><td colSpan={11} className="px-6 py-12 text-center text-sm font-bold text-slate-400">لا توجد بيانات أداء ضمن الفترة المحددة.</td></tr>
                  )}
                </tbody>
                {reportRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-300">
                      <td className="px-3 py-2.5 font-black text-slate-700 border-l-2 border-slate-300" colSpan={4}>الإجمالي</td>
                      {STATUS_OPTIONS.map(option => (
                        <td key={option.value} className={`px-3 py-2.5 text-center font-black tabular-nums border-l border-slate-200 ${option.textColor}`}>
                          {reportTotals.counts[option.value] || <span className="text-slate-300">0</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-black tabular-nums text-slate-800 border-l-2 border-slate-300">{reportTotals.total}</td>
                      <td className="px-3 py-2.5 text-center font-black tabular-nums text-slate-800">{reportTotals.commitmentRate}%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {showMarkAllConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="p-6 flex items-start gap-3">
              <Check size={28} className="text-[#655ac1] mt-0.5 shrink-0" />
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-2">تأكيد تحديد الكل حاضر</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  سيتم تسجيل جميع المشرفين الظاهرين في جدول المتابعة الحالي بحالة حاضر. هل تريد المتابعة؟
                </p>
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowMarkAllConfirm(false)}
                className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={markAllPresent}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white transition-colors shadow-md bg-[#655ac1] hover:bg-[#5046a0] shadow-[#655ac1]/20"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearAllConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="p-6 flex items-start gap-3">
              <X size={28} className="text-rose-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-2">تأكيد إلغاء الاختيارات</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  سيتم مسح حالات الحضور المختارة للمشرفين الظاهرين في جدول المتابعة الحالي. هل تريد المتابعة؟
                </p>
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowClearAllConfirm(false)}
                className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={clearDailySelections}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white transition-colors shadow-md bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringTab;
