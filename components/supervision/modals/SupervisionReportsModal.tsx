import React, { useState, useMemo } from 'react';
import { X, BarChart3, Printer, Calendar, User, Search, Check, FileText } from 'lucide-react';
import { SchoolInfo, SupervisionScheduleData, Teacher, Admin } from '../../../types';
import { getAttendanceStats } from '../../../utils/supervisionUtils';

const toHijriShort = (dateStr: string, schoolInfo: SchoolInfo): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const calType = schoolInfo?.semesters?.[0]?.calendarType || 'hijri';
    if (calType === 'hijri') {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    } else {
      return new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    }
  } catch { return dateStr; }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supervisionData: SupervisionScheduleData;
  schoolInfo: SchoolInfo;
  teachers: Teacher[];
  admins: Admin[];
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const STATUS_COLORS: Record<string, string> = {
  present:   'text-green-600',
  absent:    'text-red-600',
  late:      'text-amber-600',
  excused:   'text-blue-600',
  withdrawn: 'text-orange-600',
};

const STATUS_LABELS: Record<string, string> = {
  present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'مستأذن', withdrawn: 'منسحب',
};

// ── المحتوى الرئيسي ───────────────────────────────────────────────────────────
const SupervisionReportsModalContent: React.FC<Props> = ({
  isOpen, onClose, supervisionData, schoolInfo, teachers = [], admins = [], showToast
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // ── كل الـ hooks قبل أي return مشروط ─────────────────────────────────────
  const [perfFromDate, setPerfFromDate] = useState(todayStr);
  const [perfToDate,   setPerfToDate]   = useState(todayStr);
  const [perfStaffMode, setPerfStaffMode] = useState<'all' | 'specific'>('all');
  const [selectedStaffSearch, setSelectedStaffSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const allStaffWithRecords = useMemo(() => {
    const map = new Map<string, string>();
    supervisionData?.dayAssignments?.forEach(da =>
      da.staffAssignments?.forEach(sa => map.set(sa.staffId, sa.staffName))
    );
    teachers.forEach(t => map.set(t.id, t.name));
    admins.forEach(a => map.set(a.id, a.name));
    supervisionData?.attendanceRecords?.forEach(r => map.set(r.staffId, r.staffName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [supervisionData?.dayAssignments, supervisionData?.attendanceRecords, teachers, admins]);

  const filteredStaff = useMemo(
    () => allStaffWithRecords.filter(s => (s.name || '').includes(selectedStaffSearch)),
    [allStaffWithRecords, selectedStaffSearch]
  );

  const filteredRecords = useMemo(() => {
    let records = supervisionData?.attendanceRecords || [];
    if (perfFromDate) records = records.filter(r => r.date >= perfFromDate);
    if (perfToDate)   records = records.filter(r => r.date <= perfToDate);
    if (perfStaffMode === 'specific' && selectedStaffId)
      records = records.filter(r => r.staffId === selectedStaffId);
    return records;
  }, [supervisionData?.attendanceRecords, perfFromDate, perfToDate, perfStaffMode, selectedStaffId]);

  // بطاقة واحدة تعكس الفلتر الحالي دائماً
  const stats = useMemo(() => getAttendanceStats(filteredRecords), [filteredRecords]);

  // ملخص الموظفين من السجلات المفلترة
  const staffSummary = useMemo(() => {
    const map: Record<string, { name: string; present: number; absent: number; late: number; excused: number; withdrawn: number }> = {};
    filteredRecords.forEach(r => {
      if (!map[r.staffId]) map[r.staffId] = { name: r.staffName, present: 0, absent: 0, late: 0, excused: 0, withdrawn: 0 };
      map[r.staffId][r.status]++;
    });
    return Object.values(map);
  }, [filteredRecords]);

  // ── early return بعد كل الـ hooks ──────────────────────────────────────────
  if (!isOpen) return null;

  const staffLabel = perfStaffMode === 'specific' && selectedStaffId
    ? allStaffWithRecords.find(s => s.id === selectedStaffId)?.name || 'مشرف محدد'
    : 'جميع المشرفين';

  const reportTitle    = `تقرير أداء الإشراف – ${staffLabel}`;
  const reportSubtitle = perfFromDate === perfToDate
    ? `تاريخ: ${toHijriShort(perfFromDate, schoolInfo)}`
    : `من ${toHijriShort(perfFromDate, schoolInfo)} إلى ${toHijriShort(perfToDate, schoolInfo)}`;

  const handlePrintAttendanceReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${reportTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Tajawal', 'Arial', sans-serif; padding: 40px; direction: rtl; color: #1e293b; }

    .header-wrapper { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px; }
    .header-right { width: 33%; text-align: right; font-weight: bold; font-size: 12px; color: #1e293b; line-height: 1.8; }
    .header-center { width: 33%; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .header-title { font-size: 17px; font-weight: 900; color: #1e293b; margin-top: 8px; margin-bottom: 2px; }
    .header-subtitle { font-size: 13px; color: #475569; font-weight: 500; }
    .header-period { font-size: 11px; color: #64748b; margin-top: 3px; }
    .logo-circle { width: 52px; height: 52px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
    .logo-text { font-size: 9px; color: #94a3b8; }
    .header-left { width: 33%; text-align: left; font-weight: bold; font-size: 12px; color: #1e293b; line-height: 1.8; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: center; }
    th { background: #f1f5f9; font-weight: bold; color: #334155; }
    tr:nth-child(even) { background: #f8fafc; }
    .footer { margin-top: 40px; display: flex; justify-content: flex-end; font-size: 14px; color: #475569; }
    .signature-box { text-align: center; width: 200px; }
    .signature-line { margin-top: 40px; border-top: 1px dotted #cbd5e1; padding-top: 4px; }
    @media print {
      body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header-wrapper { border-bottom: 2px solid #1e293b !important; }
      th { background: #f1f5f9 !important; }
      tr:nth-child(even) { background: #f8fafc !important; }
      @page { margin: 2cm; }
    }
  </style>
</head>
<body>
  <div class="header-wrapper">
    <div class="header-right">
      <p>المملكة العربية السعودية</p>
      <p>وزارة التعليم</p>
      <p>${schoolInfo.region || 'إدارة التعليم بالمنطقة'}</p>
      <p>مدرسة ${schoolInfo.schoolName || '..........'}</p>
      <p>الفصل الدراسي: ${schoolInfo.semesters?.[0]?.name || ''}</p>
    </div>
    <div class="header-center">
      ${schoolInfo.logo
        ? `<img src="${schoolInfo.logo}" style="width:52px;height:52px;object-fit:contain;" />`
        : `<div class="logo-circle"><span class="logo-text">شعار</span></div>`
      }
      <p class="header-title">${reportTitle}</p>
      <p class="header-subtitle">${reportSubtitle}</p>
    </div>
    <div class="header-left">
      <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
      <p>العام الدراسي: ${schoolInfo.academicYear || ''}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:44px">م</th>
        <th style="text-align:right">اسم المشرف</th>
        <th>حاضر</th><th>غائب</th><th>متأخر</th><th>مستأذن</th><th>منسحب</th>
      </tr>
    </thead>
    <tbody>
      ${staffSummary.map((d, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="text-align:right;font-weight:bold;color:#334155">${d.name}</td>
          <td style="color:#16a34a;font-weight:bold">${d.present  > 0 ? d.present  : '-'}</td>
          <td style="color:#dc2626;font-weight:bold">${d.absent   > 0 ? d.absent   : '-'}</td>
          <td style="color:#d97706;font-weight:bold">${d.late     > 0 ? d.late     : '-'}</td>
          <td style="color:#2563eb;font-weight:bold">${d.excused  > 0 ? d.excused  : '-'}</td>
          <td style="color:#ea580c;font-weight:bold">${d.withdrawn> 0 ? d.withdrawn: '-'}</td>
        </tr>`).join('')}
      ${staffSummary.length === 0 ? `
        <tr><td colspan="7" style="padding:28px;color:#64748b;text-align:center">
          لا توجد سجلات في هذا النطاق الزمني
        </td></tr>` : ''}
    </tbody>
  </table>
  <div class="footer">
    <div class="signature-box">
      <div>مدير المدرسة / ${schoolInfo.principal || '......................'}</div>
      <div class="signature-line">التوقيع</div>
    </div>
  </div>
  <script>
    document.fonts.ready.then(() => { window.print(); });
    setTimeout(() => { window.print(); }, 1200);
  </script>
</body>
</html>`);

    printWindow.document.close();
    showToast('تم فتح تقرير الأداء', 'success');
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* الهيدر */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <BarChart3 size={24} className="text-[#655ac1]" />
            <div>
              <h2 className="text-xl font-black text-slate-800">تقارير الإشراف</h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">تقارير الأداء للمشرفين</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── ملخص الأداء ── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-800">ملخص الأداء</h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  {perfStaffMode === 'specific' && selectedStaffId
                    ? allStaffWithRecords.find(s => s.id === selectedStaffId)?.name
                    : 'جميع المشرفين'}
                  {' — '}
                  {perfFromDate === perfToDate
                    ? toHijriShort(perfFromDate, schoolInfo)
                    : `${toHijriShort(perfFromDate, schoolInfo)} إلى ${toHijriShort(perfToDate, schoolInfo)}`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'حاضر',    value: stats.present,   numColor: 'text-green-600'  },
                { label: 'غائب',    value: stats.absent,    numColor: 'text-red-600'    },
                { label: 'متأخر',   value: stats.late,      numColor: 'text-amber-600'  },
                { label: 'مستأذن', value: stats.excused,   numColor: 'text-blue-600'   },
                { label: 'منسحب',  value: stats.withdrawn, numColor: 'text-orange-600' },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  <p className={`text-2xl font-black ${s.numColor}`}>{s.value}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── فلاتر: الفترة + المشرف ── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-5">

            {/* الفترة الزمنية */}
            <div>
              <p className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                <Calendar size={16} className="text-[#655ac1]" /> الفترة الزمنية
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[150px]">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">من تاريخ</label>
                  <input type="date" value={perfFromDate} onChange={e => setPerfFromDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-1 focus:border-[#655ac1] bg-slate-50" />
                  {perfFromDate && <p className="text-xs text-[#655ac1] font-bold mt-1">{toHijriShort(perfFromDate, schoolInfo)}</p>}
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">إلى تاريخ</label>
                  <input type="date" value={perfToDate} onChange={e => setPerfToDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-1 focus:border-[#655ac1] bg-slate-50" />
                  {perfToDate && <p className="text-xs text-[#655ac1] font-bold mt-1">{toHijriShort(perfToDate, schoolInfo)}</p>}
                </div>
              </div>
            </div>

            {/* اختيار المشرف */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                <User size={16} className="text-[#655ac1]" /> المشرف
              </p>
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 w-fit mb-4">
                <button
                  onClick={() => { setPerfStaffMode('all'); setSelectedStaffId(''); }}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                    perfStaffMode === 'all' ? 'bg-white shadow-sm text-[#655ac1]' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >جميع المشرفين</button>
                <button
                  onClick={() => setPerfStaffMode('specific')}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                    perfStaffMode === 'specific' ? 'bg-white shadow-sm text-[#655ac1]' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >مشرف محدد</button>
              </div>

              {perfStaffMode === 'specific' && (
                <div className="relative max-w-sm">
                  <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث عن مشرف..."
                    value={selectedStaffSearch}
                    onChange={e => setSelectedStaffSearch(e.target.value)}
                    onFocus={() => setIsDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1]/20"
                  />
                  {isDropdownOpen && (
                    <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-100 max-h-52 overflow-y-auto z-[99]">
                      {filteredStaff.length > 0 ? filteredStaff.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { setSelectedStaffId(s.id); setSelectedStaffSearch(''); setIsDropdownOpen(false); }}
                          className="w-full text-right px-4 py-2.5 hover:bg-slate-50 text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0 flex items-center justify-between transition-colors"
                        >
                          {s.name}
                          {selectedStaffId === s.id && <Check size={15} className="text-[#655ac1]" />}
                        </button>
                      )) : (
                        <div className="p-4 text-center text-sm text-slate-400">لا توجد نتائج</div>
                      )}
                    </div>
                  )}
                  {selectedStaffId && !isDropdownOpen && (
                    <div className="flex items-center gap-2 mt-2 w-fit px-3 py-1.5 bg-[#f3f0ff] rounded-lg border border-[#655ac1]/20">
                      <User size={13} className="text-[#655ac1]" />
                      <span className="text-xs font-bold text-[#655ac1]">
                        {allStaffWithRecords.find(s => s.id === selectedStaffId)?.name}
                      </span>
                      <button onClick={() => setSelectedStaffId('')} className="hover:bg-[#655ac1]/20 p-0.5 rounded-full transition-colors">
                        <X size={12} className="text-[#655ac1]" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── معاينة النتائج ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* رأس المعاينة مع زر الطباعة */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <FileText size={15} className="text-[#655ac1]" />
                  {reportTitle}
                </p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{reportSubtitle}</p>
              </div>
              <button
                onClick={handlePrintAttendanceReport}
                className="flex items-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#655ac1]/20 transition-all active:scale-95 shrink-0"
              >
                <Printer size={15} />
                طباعة التقرير
              </button>
            </div>

            {/* الجدول */}
            {staffSummary.length === 0 ? (
              <div className="py-14 text-center">
                <BarChart3 size={32} className="mx-auto mb-3 text-slate-200" />
                <p className="font-bold text-slate-500">لا توجد سجلات في هذا النطاق</p>
                <p className="text-sm text-slate-400 mt-1">جرّب تغيير الفترة الزمنية أو المشرف المحدد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 font-black text-slate-500 text-xs w-10">م</th>
                      <th className="px-4 py-3 font-black text-slate-700 text-xs">المشرف</th>
                      <th className="px-4 py-3 font-black text-green-600  text-xs text-center">حاضر</th>
                      <th className="px-4 py-3 font-black text-red-600    text-xs text-center">غائب</th>
                      <th className="px-4 py-3 font-black text-amber-600  text-xs text-center">متأخر</th>
                      <th className="px-4 py-3 font-black text-blue-600   text-xs text-center">مستأذن</th>
                      <th className="px-4 py-3 font-black text-orange-600 text-xs text-center">منسحب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {staffSummary.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-bold text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{d.name}</td>
                        <td className="px-4 py-3 text-center font-black text-green-600">{d.present   > 0 ? d.present   : <span className="text-slate-200">—</span>}</td>
                        <td className="px-4 py-3 text-center font-black text-red-600">{d.absent    > 0 ? d.absent    : <span className="text-slate-200">—</span>}</td>
                        <td className="px-4 py-3 text-center font-black text-amber-600">{d.late      > 0 ? d.late      : <span className="text-slate-200">—</span>}</td>
                        <td className="px-4 py-3 text-center font-black text-blue-600">{d.excused   > 0 ? d.excused   : <span className="text-slate-200">—</span>}</td>
                        <td className="px-4 py-3 text-center font-black text-orange-600">{d.withdrawn > 0 ? d.withdrawn : <span className="text-slate-200">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// ── ErrorBoundary ─────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: unknown }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      const err = this.state.error as Error | null;
      return (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col p-10 overflow-auto items-center justify-center" dir="ltr">
          <div className="w-full max-w-3xl">
            <h1 className="text-2xl text-red-600 font-bold mb-4">خطأ في التقارير</h1>
            <pre className="text-left text-sm whitespace-pre-wrap bg-slate-100 p-5 rounded-2xl border border-red-200 text-slate-700">
              <span className="font-bold text-red-500 block mb-2">{err?.toString()}</span>
              {err?.stack}
            </pre>
            <button onClick={() => window.location.reload()} className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── الـ wrapper ───────────────────────────────────────────────────────────────
const SupervisionReportsModal: React.FC<Props> = (props) => {
  if (!props.isOpen) return null;
  return (
    <ErrorBoundary>
      <SupervisionReportsModalContent {...props} />
    </ErrorBoundary>
  );
};

export default SupervisionReportsModal;
