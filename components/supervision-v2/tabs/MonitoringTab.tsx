import React, { useMemo, useRef, useState } from 'react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import arabic from 'react-date-object/calendars/arabic';
import arabic_ar from 'react-date-object/locales/arabic_ar';
import {
  BarChart3, CalendarDays, Check, ChevronDown, Eye, Printer, Search, UserCheck, Users,
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

const STATUS_OPTIONS: Array<{ value: SupervisionAttendanceStatus; label: string }> = [
  { value: 'present', label: 'حاضر' },
  { value: 'absent', label: 'غائب' },
  { value: 'excused', label: 'مستأذن' },
  { value: 'withdrawn', label: 'منسحب' },
  { value: 'late', label: 'متأخر' },
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

const formatHijriDate = (date?: string) => {
  const parsed = date ? new Date(`${date}T12:00:00`) : new Date();
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
};

const CircleCheck: React.FC<{ checked: boolean }> = ({ checked }) => (
  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
    checked ? 'border-[#655ac1] bg-white text-[#655ac1]' : 'border-slate-300 bg-white text-transparent'
  }`}>
    <Check size={12} strokeWidth={3} />
  </span>
);

const DateField: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
  <div className="flex-1 min-w-[180px]">
    <label className="block text-xs font-black text-slate-500 mb-2">{label}</label>
    <DatePicker
      value={parseIsoDate(value)}
      onChange={date => onChange(formatPickerDate(date))}
      calendar={arabic}
      locale={arabic_ar}
      containerClassName="w-full"
      inputClass="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors cursor-pointer bg-white"
      placeholder="حدد التاريخ"
      portal
      portalTarget={document.body}
      editable={false}
      zIndex={99999}
    />
  </div>
);

const StaffMultiSelect: React.FC<{
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onChange: (values: string[]) => void;
}> = ({ options, selectedValues, onChange }) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = selectedValues.length === 0
    ? 'كل المشرفين'
    : selectedValues.length === 1
      ? options.find(o => o.value === selectedValues[0])?.label || 'مشرف واحد'
      : `${selectedValues.length} مشرفين`;

  return (
    <div className="relative flex-1 min-w-[240px]">
      <label className="block text-xs font-black text-slate-500 mb-2">المشرفون</label>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:border-[#655ac1]/40 transition-all flex items-center justify-between gap-2"
      >
        <span className="truncate text-sm">{selectedLabel}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 w-full rounded-2xl border border-slate-200 bg-white shadow-2xl p-2">
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1] flex items-center justify-between"
            >
              <span>كل المشرفين</span>
              <CircleCheck checked={selectedValues.length === 0} />
            </button>
            {options.map(option => {
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
  const [selectedTypeId, setSelectedTypeId] = useState(
    supervisionData.supervisionTypes.find(type => type.isEnabled)?.id || 'all'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [times, setTimes] = useState<Record<string, string>>({});
  const [reportFrom, setReportFrom] = useState(today);
  const [reportTo, setReportTo] = useState(today);
  const [reportStaffIds, setReportStaffIds] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const selectedDateObj = parseIsoDate(selectedDate) || new Date();
  const selectedDayKey = DAY_KEYS[selectedDateObj.getDay()] || 'sunday';
  const selectedDayName = DAY_NAMES[selectedDayKey] || '';
  const enabledTypes = supervisionData.supervisionTypes.filter(type => type.isEnabled);
  const selectedType = enabledTypes.find(type => type.id === selectedTypeId) || enabledTypes[0];
  const dayAssignment = supervisionData.dayAssignments.find(day => day.day === selectedDayKey);

  const dailyRows = useMemo(() => {
    const assignments = dayAssignment?.staffAssignments || [];
    return assignments
      .filter(item => !selectedType || item.contextTypeId === selectedType.id)
      .filter(item => item.staffName.toLowerCase().includes(searchTerm.trim().toLowerCase()))
      .map(item => {
        const record = supervisionData.attendanceRecords.find(record =>
          record.date === selectedDate &&
          record.staffId === item.staffId &&
          (record.contextTypeId || item.contextTypeId) === item.contextTypeId
        );
        return {
          ...item,
          typeName: supervisionData.supervisionTypes.find(type => type.id === item.contextTypeId)?.name || selectedType?.name || '',
          locations: item.locationIds.map(id => supervisionData.locations.find(loc => loc.id === id)?.name).filter(Boolean) as string[],
          record,
          status: record?.status || 'present',
        };
      });
  }, [dayAssignment, searchTerm, selectedDate, selectedType, supervisionData]);

  const saveAttendance = (
    staff: typeof dailyRows[number],
    status: SupervisionAttendanceStatus,
    overrides?: { notes?: string; time?: string }
  ) => {
    const noteValue = overrides?.notes ?? notes[staff.staffId] ?? staff.record?.notes ?? '';
    const timeValue = overrides?.time ?? times[staff.staffId] ?? staff.record?.lateTime ?? staff.record?.withdrawalTime ?? '';
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
      lateTime: status === 'late' ? timeValue : undefined,
      withdrawalTime: status === 'withdrawn' ? timeValue : undefined,
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
      return { staffId: first.staffId, staffName: first.staffName, staffType: first.staffType, total: items.length, counts, items };
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
        body{font-family:Arial,Tahoma,sans-serif;margin:28px;color:#1e293b}
        h1{font-size:22px;margin:0 0 8px;text-align:center}
        .meta{text-align:center;color:#64748b;font-weight:700;margin-bottom:20px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #cbd5e1;padding:9px;text-align:center}
        th{background:#f1f5f9;color:#655ac1;font-weight:900}
        td:first-child,th:first-child{text-align:right}
      </style></head><body>${html}<script>window.print();</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-3 flex flex-col sm:flex-row gap-2">
        {[
          { id: 'daily' as InnerTab, label: 'المتابعة اليومية للإشراف', icon: UserCheck },
          { id: 'reports' as InnerTab, label: 'تقارير الأداء', icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveView(tab.id)}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition-all ${
              activeView === tab.id ? 'bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20' : 'bg-white text-slate-500 hover:bg-slate-50'
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
              <DateField label={`اليوم والتاريخ: ${selectedDayName} - ${formatHijriDate(selectedDate)}`} value={selectedDate} onChange={setSelectedDate} />
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-black text-slate-500 mb-2">نوع الإشراف</label>
                <select
                  value={selectedType?.id || ''}
                  onChange={e => setSelectedTypeId(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#655ac1] bg-white"
                >
                  {enabledTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-black text-slate-500 mb-2">بحث نصي</label>
                <div className="relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="ابحث عن مشرف"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-bold focus:border-[#655ac1] outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={markAllPresent}
                disabled={dailyRows.length === 0}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-black hover:bg-emerald-600 transition-all disabled:opacity-50"
              >
                <Check size={16} />
                تحديد الكل حاضر
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">جدول متابعة الأداء</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">{selectedDayName} - {formatHijriDate(selectedDate)} - {selectedType?.name || ''}</p>
              </div>
              <span className="text-xs font-black text-[#655ac1] bg-[#f0edff] rounded-full px-3 py-1">{dailyRows.length} مشرف</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1]">المشرف</th>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1]">الصفة</th>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1]">نوع الإشراف</th>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1]">المواقع</th>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center">مستوى الأداء</th>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center">الوقت</th>
                    <th className="px-5 py-4 text-xs font-black text-[#655ac1]">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyRows.map(row => (
                    <tr key={`${row.contextTypeId}-${row.staffId}`} className="hover:bg-[#fbfaff] transition-colors">
                      <td className="px-5 py-4 font-black text-slate-800 whitespace-nowrap">{row.staffName}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-500">{row.staffType === 'teacher' ? 'معلم' : 'إداري'}</td>
                      <td className="px-5 py-4 text-sm font-black text-[#655ac1]">{row.typeName}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {row.locations.length ? row.locations.map(loc => (
                            <span key={loc} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{loc}</span>
                          )) : <span className="text-xs text-slate-300">-</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-center gap-2 min-w-[380px]">
                          {STATUS_OPTIONS.map(option => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => saveAttendance(row, option.value)}
                              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition-all ${
                                row.status === option.value ? 'border-[#655ac1] bg-[#f8f7ff] text-[#655ac1]' : 'border-slate-200 bg-white text-slate-500 hover:border-[#655ac1]/40'
                              }`}
                            >
                              <CircleCheck checked={row.status === option.value} />
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {(row.status === 'late' || row.status === 'withdrawn') ? (
                          <input
                            type="time"
                            value={times[row.staffId] ?? row.record?.lateTime ?? row.record?.withdrawalTime ?? ''}
                            onChange={e => {
                              setTimes(prev => ({ ...prev, [row.staffId]: e.target.value }));
                              saveAttendance(row, row.status, { time: e.target.value });
                            }}
                            className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#655ac1]"
                          />
                        ) : <span className="text-xs font-bold text-slate-300">-</span>}
                      </td>
                      <td className="px-5 py-4 min-w-[220px]">
                        <input
                          value={notes[row.staffId] ?? row.record?.notes ?? ''}
                          onChange={e => {
                            setNotes(prev => ({ ...prev, [row.staffId]: e.target.value }));
                            saveAttendance(row, row.status, { notes: e.target.value });
                          }}
                          placeholder="ملاحظة..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#655ac1]"
                        />
                      </td>
                    </tr>
                  ))}
                  {dailyRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm font-bold text-slate-400">لا توجد تكليفات مطابقة لهذا اليوم ونوع الإشراف.</td>
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
            <div className="flex flex-wrap gap-4 items-end">
              <DateField label="من يوم وتاريخ" value={reportFrom} onChange={setReportFrom} />
              <DateField label="إلى يوم وتاريخ" value={reportTo} onChange={setReportTo} />
              <StaffMultiSelect options={reportStaffOptions} selectedValues={reportStaffIds} onChange={setReportStaffIds} />
              <button type="button" onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:border-[#655ac1] hover:text-[#655ac1] transition-all">
                <Eye size={16} />
                معاينة
              </button>
              <button type="button" onClick={printReport}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#655ac1] text-white text-sm font-black hover:bg-[#5046a0] transition-all">
                <Printer size={16} />
                طباعة التقرير
              </button>
            </div>
          </div>

          <div ref={printRef} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
            <h1 className="text-xl font-black text-slate-800 text-center">تقرير أداء الإشراف اليومي</h1>
            <p className="text-center text-sm font-bold text-slate-500 mt-2 mb-5">
              {schoolInfo.schoolName || ''} - من {formatHijriDate(reportFrom)} إلى {formatHijriDate(reportTo)}
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-black text-[#655ac1]">المشرف</th>
                    <th className="px-4 py-3 font-black text-[#655ac1] text-center">الصفة</th>
                    <th className="px-4 py-3 font-black text-[#655ac1] text-center">إجمالي الرصد</th>
                    {STATUS_OPTIONS.map(option => <th key={option.value} className="px-4 py-3 font-black text-[#655ac1] text-center">{option.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportRows.map(row => (
                    <tr key={row.staffId}>
                      <td className="px-4 py-3 font-black text-slate-800">{row.staffName}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-500">{row.staffType === 'teacher' ? 'معلم' : 'إداري'}</td>
                      <td className="px-4 py-3 text-center font-black text-slate-700">{row.total}</td>
                      {STATUS_OPTIONS.map(option => <td key={option.value} className="px-4 py-3 text-center font-bold text-slate-600">{row.counts[option.value]}</td>)}
                    </tr>
                  ))}
                  {reportRows.length === 0 && (
                    <tr><td colSpan={8} className="px-6 py-12 text-center text-sm font-bold text-slate-400">لا توجد بيانات أداء ضمن الفترة المحددة.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {previewOpen && (
            <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm" dir="rtl">
              <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-white border border-slate-200 shadow-2xl flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BarChart3 size={22} className="text-[#655ac1]" />
                    <h3 className="font-black text-slate-800">معاينة تقرير الأداء</h3>
                  </div>
                  <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50">إغلاق</button>
                </div>
                <div className="overflow-y-auto p-6">
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 font-black text-[#655ac1]">المشرف</th>
                          <th className="px-4 py-3 font-black text-[#655ac1]">التاريخ</th>
                          <th className="px-4 py-3 font-black text-[#655ac1]">نوع الإشراف</th>
                          <th className="px-4 py-3 font-black text-[#655ac1]">الحالة</th>
                          <th className="px-4 py-3 font-black text-[#655ac1]">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportRows.flatMap(row => row.items).map(item => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-bold text-slate-800">{item.staffName}</td>
                            <td className="px-4 py-3 font-bold text-slate-500">{DAY_NAMES[item.day] || item.day} - {formatHijriDate(item.date)}</td>
                            <td className="px-4 py-3 font-bold text-slate-500">{item.contextTypeName || '-'}</td>
                            <td className="px-4 py-3 font-black text-[#655ac1]">{STATUS_OPTIONS.find(option => option.value === item.status)?.label || item.status}</td>
                            <td className="px-4 py-3 font-bold text-slate-500">{item.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MonitoringTab;
