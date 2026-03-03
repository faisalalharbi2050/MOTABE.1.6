import React, { useState, useMemo } from 'react';
import { X, BarChart3, Printer, Calendar, User, Search, Check } from 'lucide-react';
import { SchoolInfo, SupervisionScheduleData } from '../../../types';
import { getAttendanceStats } from '../../../utils/supervisionUtils';

// Utilities for date formatting
const formatHijriMonth = (monthIndex: number) => {
  const months = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
  return months[monthIndex % 12];
};

const formatGregorianMonth = (monthIndex: number) => {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return months[monthIndex % 12];
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supervisionData: SupervisionScheduleData;
  schoolInfo: SchoolInfo;
  teachers: any[]; // Or Teacher[] if imported
  admins: any[]; // Or Admin[] if imported
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const SupervisionReportsModalContent: React.FC<Props> = ({
  isOpen, onClose, supervisionData, schoolInfo, teachers = [], admins = [], showToast
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [perfFromDate, setPerfFromDate] = useState(todayStr);
  const [perfToDate, setPerfToDate] = useState(todayStr);
  const [perfStaffMode, setPerfStaffMode] = useState<'all' | 'specific'>('all');
  const [selectedStaffSearch, setSelectedStaffSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!isOpen) return null;

  const calendarType = schoolInfo.semesters?.[0]?.calendarType || 'hijri';

  // Individual logic
  // We want to extract ALL staff who appear in `dayAssignments` OR `attendanceRecords`, 
  // or simply provide the entire list of teachers and admins for selection.
  const allStaffWithRecords = useMemo(() => {
    const map = new Map<string, string>();
    // Add all assigned staff from the schedule
    supervisionData?.dayAssignments?.forEach(da => {
      da.staffAssignments?.forEach(sa => {
        map.set(sa.staffId, sa.staffName);
      });
    });
    // Fallback: Add all teachers and admins just in case
    teachers.forEach(t => map.set(t.id, t.name));
    admins.forEach(a => map.set(a.id, a.name));
    // Add from attendance records
    supervisionData?.attendanceRecords?.forEach(r => map.set(r.staffId, r.staffName));
    
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [supervisionData?.dayAssignments, supervisionData?.attendanceRecords, teachers, admins]);

  const filteredStaff = allStaffWithRecords.filter(s => (s.name || '').includes(selectedStaffSearch));

  const filteredRecords = useMemo(() => {
    let records = supervisionData?.attendanceRecords || [];
    if (perfFromDate) records = records.filter(r => r.date >= perfFromDate);
    if (perfToDate) records = records.filter(r => r.date <= perfToDate);
    if (perfStaffMode === 'specific' && selectedStaffId) {
      records = records.filter(r => r.staffId === selectedStaffId);
    }
    return records;
  }, [supervisionData?.attendanceRecords, perfFromDate, perfToDate, perfStaffMode, selectedStaffId]);

  const stats = getAttendanceStats(filteredRecords);
  const allStats = getAttendanceStats(supervisionData?.attendanceRecords || []);

  const toHijriShort = (dateStr: string): string => {
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

  const handlePrintAttendanceReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const records = filteredRecords;
    const staffMap: Record<string, { name: string; present: number; absent: number; late: number; excused: number; withdrawn: number }> = {};

    records.forEach(r => {
      if (!staffMap[r.staffId]) {
        staffMap[r.staffId] = { name: r.staffName, present: 0, absent: 0, late: 0, excused: 0, withdrawn: 0 };
      }
      staffMap[r.staffId][r.status]++;
    });

    const staffLabel = perfStaffMode === 'specific' && selectedStaffId
      ? allStaffWithRecords.find(s => s.id === selectedStaffId)?.name || 'مشرف محدد'
      : 'جميع المشرفين';
    const reportTitle = `تقرير أداء الإشراف – ${staffLabel}`;
    const reportSubtitle = perfFromDate === perfToDate
      ? `تاريخ: ${toHijriShort(perfFromDate)}`
      : `من ${toHijriShort(perfFromDate)} إلى ${toHijriShort(perfToDate)}`;

    printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${reportTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, 'Arial', sans-serif; padding: 40px; direction: rtl; color: #1e293b; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
    .header h1 { font-size: 24px; margin-bottom: 8px; color: #0f172a; }
    .header h2 { font-size: 18px; color: #475569; font-weight: normal; }
    .header h3 { font-size: 14px; color: #64748b; margin-top: 5px; font-weight: normal; }
    
    .stats-summary { display: flex; justify-content: space-around; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .stat-box { text-align: center; }
    .stat-val { font-size: 20px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: center; }
    th { background: #f1f5f9; font-weight: bold; color: #334155; }
    tr:nth-child(even) { background: #f8fafc; }
    
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: bold; }
    
    .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 14px; color: #475569; }
    .signature-box { text-align: center; width: 200px; }
    .signature-line { margin-top: 40px; border-top: 1px solid #cbd5e1; }
    
    @media print { 
      body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 2cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${schoolInfo.schoolName}</h1>
    <h2>${reportTitle}</h2>
    <h3>${reportSubtitle}</h3>
  </div>
  
  <div class="stats-summary">
    <div class="stat-box"><div class="stat-val" style="color: #16a34a;">${stats.present}</div><div class="stat-label">حاضر</div></div>
    <div class="stat-box"><div class="stat-val" style="color: #dc2626;">${stats.absent}</div><div class="stat-label">غائب</div></div>
    <div class="stat-box"><div class="stat-val" style="color: #2563eb;">${stats.excused}</div><div class="stat-label">مستأذن</div></div>
    <div class="stat-box"><div class="stat-val" style="color: #ea580c;">${stats.withdrawn}</div><div class="stat-label">منسحب</div></div>
    <div class="stat-box"><div class="stat-val" style="color: #d97706;">${stats.late}</div><div class="stat-label">متأخر</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50px;">م</th>
        <th style="text-align: right;">اسم المشرف</th>
        <th>حاضر</th>
        <th>غائب</th>
        <th>متأخر</th>
        <th>مستأذن</th>
        <th>منسحب</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(staffMap).map(([_, data], idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="text-align: right; font-weight: bold; color: #334155;">${data.name}</td>
          <td style="color: #16a34a; font-weight: bold;">${data.present > 0 ? data.present : '-'}</td>
          <td style="color: #dc2626; font-weight: bold;">${data.absent > 0 ? data.absent : '-'}</td>
          <td style="color: #d97706; font-weight: bold;">${data.late > 0 ? data.late : '-'}</td>
          <td style="color: #2563eb; font-weight: bold;">${data.excused > 0 ? data.excused : '-'}</td>
          <td style="color: #ea580c; font-weight: bold;">${data.withdrawn > 0 ? data.withdrawn : '-'}</td>
        </tr>
      `).join('')}
      ${Object.keys(staffMap).length === 0 ? `
        <tr><td colspan="7" style="padding: 30px; color: #64748b; font-weight: bold; text-align: center;">
          الموظف لم يسجل أي حضور / غياب في هذا النطاق الزمني
        </td></tr>
      ` : ''}
    </tbody>
  </table>
  
  <div class="footer">
    <div class="signature-box">
      <div>المشرف المتابع</div>
      <div class="signature-line"></div>
    </div>
    <div class="signature-box">
      <div>مدير المدرسة</div>
      <div style="margin-top: 10px; font-weight: bold;">${schoolInfo.principal || ''}</div>
      <div class="signature-line"></div>
    </div>
  </div>
</body>
</html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
    showToast('تم فتح تقرير الأداء', 'success');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#e5e1fe] rounded-2xl flex items-center justify-center text-[#655ac1] shadow-sm">
              <BarChart3 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">تقارير الإشراف</h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">تقارير الأداء للمشرفين</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors self-end sm:self-auto">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">

          {/* ── ملخص الأداء الكلي (أعلى) ── */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <div className="mb-5">
              <h3 className="text-base font-black text-slate-800">ملخص الأداء</h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">إحصائيات الإشراف لجميع الأيام المسجلة</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'حاضر', value: allStats.present, color: '#16a34a' },
                { label: 'غائب', value: allStats.absent, color: '#dc2626' },
                { label: 'متأخر', value: allStats.late, color: '#d97706' },
                { label: 'مستأذن', value: allStats.excused, color: '#2563eb' },
                { label: 'منسحب', value: allStats.withdrawn, color: '#ea580c' },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 border border-slate-300 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs font-bold text-slate-600 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── تحديد الفترة ── */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <p className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
              <Calendar size={17} className="text-[#655ac1]" /> تحديد الفترة الزمنية
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">من تاريخ</label>
                <input type="date" value={perfFromDate} onChange={e => setPerfFromDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-1 focus:border-[#655ac1] bg-slate-50" />
                {perfFromDate && <p className="text-xs text-[#655ac1] font-bold mt-1">{toHijriShort(perfFromDate)}</p>}
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">إلى تاريخ</label>
                <input type="date" value={perfToDate} onChange={e => setPerfToDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-1 focus:border-[#655ac1] bg-slate-50" />
                {perfToDate && <p className="text-xs text-[#655ac1] font-bold mt-1">{toHijriShort(perfToDate)}</p>}
              </div>
            </div>
          </div>

          {/* ── فلتر المشرف ── */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <p className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
              <User size={17} className="text-[#655ac1]" /> اختيار المشرف
            </p>
            <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200 w-fit mb-4">
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
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1]"
                />
                {isDropdownOpen && (
                  <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-100 max-h-56 overflow-y-auto z-[99] custom-scrollbar">
                    {filteredStaff.length > 0 ? filteredStaff.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedStaffId(s.id); setSelectedStaffSearch(''); setIsDropdownOpen(false); }}
                        className="w-full text-right px-4 py-2.5 hover:bg-slate-50 text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0 flex items-center justify-between transition-colors"
                      >
                        {s.name}
                        {selectedStaffId === s.id && <Check size={16} className="text-[#655ac1]" />}
                      </button>
                    )) : (
                      <div className="p-4 text-center text-sm text-slate-500">لا توجد نتائج</div>
                    )}
                  </div>
                )}
                {selectedStaffId && !isDropdownOpen && (
                  <div className="text-xs font-bold text-[#655ac1] bg-[#e5e1fe]/50 px-3 py-1.5 rounded-lg flex items-center gap-2 w-max mt-2">
                    <User size={14} />
                    {allStaffWithRecords.find(s => s.id === selectedStaffId)?.name}
                    <button onClick={() => setSelectedStaffId('')} className="mr-2 hover:bg-[#655ac1]/20 p-0.5 rounded-full"><X size={12}/></button>
                  </div>
                )}
              </div>
            )}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={handlePrintAttendanceReport}
                className="flex items-center gap-2 bg-[#655ac1] hover:bg-[#8779fb] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#655ac1]/20 transition-all active:scale-95"
              >
                <Printer size={16} />
                طباعة التقرير
              </button>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col p-10 overflow-auto items-center justify-center shadow-2xl" dir="ltr">
          <div className="w-full max-w-4xl">
            <h1 className="text-3xl text-red-600 font-bold mb-4">React Validation Error Caught!</h1>
            <p className="mb-4 text-slate-600 font-medium">Please copy this error and send it to the AI assistant:</p>
            <pre className="text-left text-sm whitespace-pre-wrap bg-slate-100 p-6 rounded-2xl border-2 border-red-200 text-slate-800 shadow-inner">
              <span className="font-bold text-red-500 block mb-2">{this.state.error?.toString()}</span>
              {this.state.error?.stack}
            </pre>
            <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all">Reload Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const SupervisionReportsModal: React.FC<Props> = (props) => {
  if (!props.isOpen) return null;
  return (
    <ErrorBoundary>
      <SupervisionReportsModalContent {...props} />
    </ErrorBoundary>
  );
};

export default SupervisionReportsModal;
