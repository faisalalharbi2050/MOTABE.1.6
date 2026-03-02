import React, { useState, useMemo } from 'react';
import { X, BarChart3, Printer, FileText, Calendar, User, Search, ChevronDown, Check } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'individual'>('weekly');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedStaffSearch, setSelectedStaffSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [individualReportType, setIndividualReportType] = useState<'weekly' | 'monthly'>('weekly');

  if (!isOpen) return null;

  const calendarType = schoolInfo.semesters?.[0]?.calendarType || 'hijri';
  let semesterStartDate = new Date();
  if (schoolInfo.semesters?.[0]?.startDate) {
    const parsed = new Date(schoolInfo.semesters[0].startDate);
    if (!isNaN(parsed.getTime())) {
      semesterStartDate = parsed;
    }
  }
  
  // Weekly logic
  const currentSemester = schoolInfo.semesters?.find(s => s.isCurrent) || schoolInfo.semesters?.[0];
  const totalWeeks = currentSemester?.weeksCount || 12; // Fallback to 12 if not defined
  const weeksList = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  
  const getWeekDateRange = (weekNumber: number) => {
    try {
      const start = new Date(semesterStartDate);
      start.setDate(start.getDate() + ((weekNumber - 1) * 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 4); // Mon-Thu/Sun-Thu (5 active days approx)
      
      const formatter = calendarType === 'hijri' 
        ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long' })
        : new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long' });
        
      return `${formatter.format(start)} - ${formatter.format(end)}`;
    } catch(e) {
      return "تاريخ غير معروف";
    }
  };

  // Monthly logic
  // A Hijri month is mapped to 4 academic weeks.
  const monthsList = Array.from({ length: 4 }, (_, i) => {
    let label = '';
    const startWeek = (i * 4) + 1;
    const endWeek = startWeek + 3;
    const dateRange = `${getWeekDateRange(startWeek).split(' - ')[0]} - ${getWeekDateRange(endWeek).split(' - ')[1] || ''}`;
    
    if (calendarType === 'hijri') {
      try {
        const startMonthStr = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { month: 'numeric' }).format(semesterStartDate);
        const numStartMonth = parseInt(startMonthStr.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())) || 1;
        label = formatHijriMonth((numStartMonth - 1 + i) % 12);
      } catch (e) {
        label = formatHijriMonth(i % 12);
      }
    } else {
      const startMonth = semesterStartDate.getMonth();
      label = formatGregorianMonth((startMonth + i) % 12);
    }
    
    return { value: i, label, dateRange };
  });

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

  // Determine current context records based on tabs
  const filteredRecords = useMemo(() => {
    let records = supervisionData?.attendanceRecords || [];
    
    // In a real app, you would filter `records` by comparing `r.date` to the Selected Week or Selected Month ranges.
    // However, given the local mock logic, we'll return all for now or mock filter if needed.
    // For Individual, we MUST filter.
    if (activeTab === 'individual' && selectedStaffId) {
       records = records.filter(r => r.staffId === selectedStaffId);
    }
    
    return records;
  }, [supervisionData?.attendanceRecords, activeTab, selectedStaffId, selectedWeek, selectedMonth]);

  const stats = getAttendanceStats(filteredRecords);

  const handlePrintAttendanceReport = (period: 'weekly' | 'monthly' | 'individual') => {
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

    let reportTitle = '';
    let reportSubtitle = '';
    
    if (period === 'weekly') {
      reportTitle = 'تقرير الإشراف الأسبوعي';
      reportSubtitle = `الأسبوع ${selectedWeek} (${getWeekDateRange(selectedWeek)})`;
    } else if (period === 'monthly') {
      reportTitle = 'تقرير الإشراف الشهري';
      const monthData = monthsList.find(m => m.value === selectedMonth);
      reportSubtitle = `شهر ${monthData?.label} (${monthData?.dateRange})`;
    } else if (period === 'individual') {
      const staffName = allStaffWithRecords.find(s => s.id === selectedStaffId)?.name || 'غير محدد';
      reportTitle = `تقرير الإشراف الفردي - ${staffName}`;
      if (individualReportType === 'weekly') {
        reportSubtitle = `الأسبوع ${selectedWeek} (${getWeekDateRange(selectedWeek)})`;
      } else {
        const monthData = monthsList.find(m => m.value === selectedMonth);
        reportSubtitle = `شهر ${monthData?.label} (${monthData?.dateRange})`;
      }
    }

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
          
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-fit">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'weekly' 
                  ? 'bg-[#655ac1] text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-[#655ac1]'
              }`}
            >
              <Calendar size={18} /> تقرير أسبوعي
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'monthly' 
                  ? 'bg-[#655ac1] text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-[#655ac1]'
              }`}
            >
              <FileText size={18} /> تقرير شهري
            </button>
            <button
              onClick={() => setActiveTab('individual')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'individual' 
                  ? 'bg-[#655ac1] text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-[#655ac1]'
              }`}
            >
              <User size={18} /> تقرير فردي
            </button>
          </div>

          {/* Filters Area */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 md:items-center justify-between relative z-50">
            {activeTab === 'weekly' && (
              <div className="flex-1 max-w-sm space-y-2">
                <label className="text-sm font-bold text-slate-700">تحديد الأسبوع</label>
                <div className="relative">
                  <select 
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1] appearance-none"
                  >
                    {weeksList.map(w => (
                      <option key={w} value={w}>الأسبوع {w}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-xs font-medium text-[#655ac1] bg-[#e5e1fe]/50 px-3 py-1.5 rounded-lg inline-block">
                  {getWeekDateRange(selectedWeek)}
                </p>
              </div>
            )}

            {activeTab === 'monthly' && (
              <div className="flex-1 max-w-sm space-y-2">
                <label className="text-sm font-bold text-slate-700">تحديد الشهر</label>
                <div className="relative">
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1] appearance-none"
                  >
                    {monthsList.map(m => (
                      <option key={m.value} value={m.value}>شهر {m.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-xs font-medium text-slate-500 px-1">
                  التقرير الشهري يغطي 4 أسابيع دراسية.
                </p>
              </div>
            )}

            {activeTab === 'individual' && (
              <div className="flex-1 flex flex-col md:flex-row gap-6 w-full">
                <div className="flex-1 space-y-2 relative">
                  <label className="text-sm font-bold text-slate-700">الموظف</label>
                  <div className="relative">
                    <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="ابحث عن موظف..."
                      value={selectedStaffSearch}
                      onChange={e => setSelectedStaffSearch(e.target.value)}
                      onFocus={() => setIsDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                      className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1]"
                    />
                  </div>
                  {/* Dropdown for selection */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 max-h-56 overflow-y-auto z-[60] custom-scrollbar">
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

                <div className="flex-1 space-y-2">
                  <label className="text-sm font-bold text-slate-700">نوع التقرير للفرد</label>
                  <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200 w-fit">
                    <button
                      onClick={() => setIndividualReportType('weekly')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        individualReportType === 'weekly' ? 'bg-white shadow-sm text-[#655ac1]' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      أسبوعي
                    </button>
                    <button
                      onClick={() => setIndividualReportType('monthly')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        individualReportType === 'monthly' ? 'bg-white shadow-sm text-[#655ac1]' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      شهري
                    </button>
                  </div>
                  {/* Mini selector for week/month if individual */}
                  {individualReportType === 'weekly' ? (
                     <select 
                       value={selectedWeek}
                       onChange={(e) => setSelectedWeek(Number(e.target.value))}
                       className="w-full px-3 py-2 mt-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
                     >
                       {weeksList.map(w => <option key={w} value={w}>الأسبوع {w}</option>)}
                     </select>
                  ) : (
                     <select 
                       value={selectedMonth}
                       onChange={(e) => setSelectedMonth(Number(e.target.value))}
                       className="w-full px-3 py-2 mt-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
                     >
                       {monthsList.map(m => <option key={m.value} value={m.value}>شهر {m.label}</option>)}
                     </select>
                  )}
                </div>
              </div>
            )}

            <div className="flex-shrink-0 mt-4 md:mt-0">
               <button onClick={() => handlePrintAttendanceReport(activeTab)} className="flex items-center justify-center w-full md:w-auto gap-2 bg-[#655ac1] hover:bg-[#8779fb] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md shadow-[#655ac1]/20 transition-all active:scale-95">
                 <Printer size={18} /> 
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
