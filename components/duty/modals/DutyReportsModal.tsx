import React, { useState, useMemo } from 'react';
import { X, BarChart3, Printer, FileText, Calendar, User, Search, ChevronDown, Check, Clock, AlertTriangle } from 'lucide-react';
import { SchoolInfo, DutyScheduleData, Teacher, Admin } from '../../../types';
import { getDutyStats } from '../../../utils/dutyUtils';

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
  dutyData: DutyScheduleData;
  schoolInfo: SchoolInfo;
  teachers: Teacher[];
  admins: Admin[];
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const DutyReportsModalContent: React.FC<Props> = ({
  isOpen, onClose, dutyData, schoolInfo, teachers = [], admins = [], showToast
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [mainTab, setMainTab] = useState<'performance' | 'daily'>('performance');
  // ── Performance tab state ──
  const [perfFromDate, setPerfFromDate] = useState(todayStr);
  const [perfToDate, setPerfToDate] = useState(todayStr);
  const [perfStaffMode, setPerfStaffMode] = useState<'all' | 'specific'>('all');
  const [selectedStaffSearch, setSelectedStaffSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // ── Daily Reports Hub State ──
  const [dailyFromDate, setDailyFromDate] = useState(todayStr);
  const [dailyToDate, setDailyToDate] = useState(todayStr);
  const [studentSearch, setStudentSearch] = useState('');
  const [dataTabStudents, setDataTabStudents] = useState<'late' | 'violations'>('late');

  if (!isOpen) return null;

  const calendarType = schoolInfo.semesters?.[0]?.calendarType || 'hijri';
  let semesterStartDate = new Date();
  if (schoolInfo.semesters?.[0]?.startDate) {
    const parsed = new Date(schoolInfo.semesters[0].startDate);
    if (!isNaN(parsed.getTime())) {
      semesterStartDate = parsed;
    }
  }
  
  const currentSemester = schoolInfo.semesters?.find(s => s.isCurrent) || schoolInfo.semesters?.[0];
  const totalWeeks = currentSemester?.weeksCount || 12;
  const weeksList = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  // ── Current week/month based on today ───────────────────────────────
  const currentWeekNum = (() => {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - semesterStartDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(Math.max(Math.ceil((diffDays + 1) / 7), 1), totalWeeks);
  })();
  const currentMonthNum = Math.min(Math.floor((currentWeekNum - 1) / 4), Math.floor((totalWeeks - 1) / 4));
  const availableWeeks = Array.from({ length: currentWeekNum }, (_, i) => i + 1);
  
  const getWeekDateRange = (weekNumber: number) => {
    try {
      const start = new Date(semesterStartDate);
      start.setDate(start.getDate() + ((weekNumber - 1) * 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 4); 
      
      const formatter = calendarType === 'hijri' 
        ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long' })
        : new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long' });
        
      return `${formatter.format(start)} - ${formatter.format(end)}`;
    } catch(e) {
      return "تاريخ غير معروف";
    }
  };

  const getWeekDateBounds = (weekNumber: number) => {
    try {
      const start = new Date(semesterStartDate);
      start.setDate(start.getDate() + ((weekNumber - 1) * 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 4); 
      
      const formatYMD = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      return { 
        startStr: formatYMD(start), 
        endStr: formatYMD(end) 
      };
    } catch(e) {
      return { startStr: '', endStr: '' };
    }
  };

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

  const allStaffWithRecords = useMemo(() => {
    const map = new Map<string, string>();
    dutyData?.dayAssignments?.forEach(da => {
      if (da.isDisabled) return;
      da.staffAssignments?.forEach(sa => {
        map.set(sa.staffId, sa.staffName);
      });
    });
    teachers.forEach(t => map.set(t.id, t.name));
    admins.forEach(a => map.set(a.id, a.name));
    
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [dutyData?.dayAssignments, teachers, admins]);

  const filteredStaff = allStaffWithRecords.filter(s => (s.name || '').includes(selectedStaffSearch));

  const disabledDayIds = useMemo(() => {
    return new Set(
      (dutyData?.dayAssignments || [])
        .filter(da => da.isDisabled)
        .flatMap(da => [da.date, da.day].filter(Boolean) as string[])
    );
  }, [dutyData?.dayAssignments]);

  const activeReports = useMemo(
    () => (dutyData?.reports || []).filter(r => !disabledDayIds.has(r.date) && !disabledDayIds.has(r.day)),
    [dutyData?.reports, disabledDayIds]
  );

  const filteredRecords = useMemo(() => {
    let records = activeReports;
    if (perfFromDate) records = records.filter(r => r.date >= perfFromDate);
    if (perfToDate) records = records.filter(r => r.date <= perfToDate);
    if (perfStaffMode === 'specific' && selectedStaffId) {
      records = records.filter(r => r.staffId === selectedStaffId);
    }
    return records;
  }, [activeReports, perfFromDate, perfToDate, perfStaffMode, selectedStaffId]);

  const stats = getDutyStats(filteredRecords);
  const allStats = getDutyStats(activeReports);

  const staffSummary = useMemo(() => {
    const map: Record<string, { name: string; present: number; absent: number; late: number; excused: number; withdrawn: number; submitted: number }> = {};
    filteredRecords.forEach(r => {
      if (!map[r.staffId]) map[r.staffId] = { name: r.staffName, present: 0, absent: 0, late: 0, excused: 0, withdrawn: 0, submitted: 0 };
      map[r.staffId][r.status]++;
      if (r.isSubmitted) map[r.staffId].submitted++;
    });
    return Object.values(map);
  }, [filteredRecords]);

  // ═════ Daily Reports Hub – Computed Data ═════════════════════════════════
  interface EnrichedLate { studentName: string; gradeAndClass: string; exitTime: string; actionTaken: string; notes?: string; date: string; staffName: string; }
  interface EnrichedViolation { studentName: string; gradeAndClass: string; violationType: string; actionTaken: string; notes?: string; date: string; staffName: string; }

  const allEnrichedLate: EnrichedLate[] = activeReports.flatMap(r =>
    (r.lateStudents || []).map(s => ({ ...s, date: r.date, staffName: r.staffName }))
  ).filter(r => r.studentName?.trim());

  const allEnrichedViolations: EnrichedViolation[] = activeReports.flatMap(r =>
    (r.violatingStudents || []).map(s => ({ ...s, date: r.date, staffName: r.staffName }))
  ).filter(r => r.studentName?.trim());

  const computeDailyDateRange = (): { from: string; to: string } => {
    return { from: dailyFromDate, to: dailyToDate };
  };

  const { from: dRangeFrom, to: dRangeTo } = computeDailyDateRange();
  const dailyFilteredLate = allEnrichedLate.filter(r => r.date >= dRangeFrom && r.date <= dRangeTo);
  const dailyFilteredViolations = allEnrichedViolations.filter(r => r.date >= dRangeFrom && r.date <= dRangeTo);
  const dailyUniqueStudents = new Set([
    ...dailyFilteredLate.map(r => r.studentName),
    ...dailyFilteredViolations.map(r => r.studentName)
  ]).size;

  const studentFilteredLate = studentSearch.trim()
    ? allEnrichedLate.filter(r => r.studentName.includes(studentSearch.trim()))
    : [];
  const studentFilteredViolations = studentSearch.trim()
    ? allEnrichedViolations.filter(r => r.studentName.includes(studentSearch.trim()))
    : [];

  const chartByDate: Record<string, { lateCount: number; violationCount: number }> = {};
  dailyFilteredLate.forEach(r => {
    if (!chartByDate[r.date]) chartByDate[r.date] = { lateCount: 0, violationCount: 0 };
    chartByDate[r.date].lateCount++;
  });
  dailyFilteredViolations.forEach(r => {
    if (!chartByDate[r.date]) chartByDate[r.date] = { lateCount: 0, violationCount: 0 };
    chartByDate[r.date].violationCount++;
  });
  const dailyChartDates = Object.entries(chartByDate)
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const toHijriShort = (dateStr: string) => {
    try {
      if (calendarType === 'hijri') return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr));
      return new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr));
    } catch { return dateStr; }
  };

  const handlePrintStudentReport = (name: string, lateRecs: EnrichedLate[], violRecs: EnrichedViolation[]) => {
    const pw = window.open('', '_blank'); if (!pw) return;
    pw.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تقرير الطالب - ${name}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Tajawal',sans-serif;padding:30px;direction:rtl;color:#1e293b;}
    .header{text-align:center;border-bottom:2px solid #e2e8f0;padding-bottom:15px;margin-bottom:20px;}h1{font-size:20px;margin-bottom:4px;}h2{font-size:14px;color:#475569;font-weight:normal;margin-bottom:15px;}
    .sec{font-size:13px;font-weight:bold;margin:15px 0 8px;padding:6px 10px;border-radius:6px;}
    .late-sec{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;}.viol-sec{background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:15px;}th,td{border:1px solid #cbd5e1;padding:8px;text-align:center;}th{font-weight:bold;}
    .late-th{background:#f97316;color:#fff;}.viol-th{background:#7c3aed;color:#fff;}tr:nth-child(even){background:#f8fafc;}
    .footer{margin-top:30px;text-align:center;font-size:11px;color:#94a3b8;}
    @media print{body{padding:0;}@page{margin:1.5cm;}}
    </style></head><body>
    <div class="header"><h1>تقرير الطالب: ${name}</h1><h2>${schoolInfo.schoolName} | ${schoolInfo.academicYear || ''}</h2></div>
    ${lateRecs.length > 0 ? `<div class="sec late-sec">سجلات التأخر (${lateRecs.length})</div>
    <table><thead><tr class="late-th"><th>م</th><th>التاريخ</th><th>الصف</th><th>زمن الوصول</th><th>الإجراء</th><th>ملاحظات</th></tr></thead><tbody>
    ${lateRecs.map((r,i)=>`<tr><td>${i+1}</td><td>${toHijriShort(r.date)}</td><td>${r.gradeAndClass}</td><td>${r.exitTime||'-'}</td><td>${r.actionTaken||'-'}</td><td>${r.notes||'-'}</td></tr>`).join('')}
    </tbody></table>` : ''}
    ${violRecs.length > 0 ? `<div class="sec viol-sec">سجلات المخالفات (${violRecs.length})</div>
    <table><thead><tr class="viol-th"><th>م</th><th>التاريخ</th><th>الصف</th><th>المخالفة</th><th>الإجراء</th><th>ملاحظات</th></tr></thead><tbody>
    ${violRecs.map((r,i)=>`<tr><td>${i+1}</td><td>${toHijriShort(r.date)}</td><td>${r.gradeAndClass}</td><td>${r.violationType}</td><td>${r.actionTaken||'-'}</td><td>${r.notes||'-'}</td></tr>`).join('')}
    </tbody></table>` : ''}
    <div class="footer">إجمالي: ${lateRecs.length} تأخر | ${violRecs.length} مخالفة — طُبع بتاريخ: ${new Date().toLocaleDateString('ar-SA')}</div>
    </body></html>`);
    pw.document.close(); setTimeout(() => pw.print(), 300);
    showToast('تم فتح تقرير الطالب للطباعة', 'success');
  };

  const handlePrintDailyReport = (lateRecs: EnrichedLate[], violRecs: EnrichedViolation[]) => {
    const pw = window.open('', '_blank'); if (!pw) return;
    const periodLabel = dailyFromDate === dailyToDate
      ? toHijriShort(dailyFromDate)
      : `${toHijriShort(dailyFromDate)} – ${toHijriShort(dailyToDate)}`;
    pw.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>التقارير اليومية</title>
    <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:30px;direction:rtl;color:#1e293b;}
    .header{text-align:center;border-bottom:2px solid #e2e8f0;padding-bottom:15px;margin-bottom:20px;}h1{font-size:20px;margin-bottom:4px;}h2{font-size:14px;color:#475569;font-weight:normal;}
    .sec{font-size:13px;font-weight:bold;margin:15px 0 8px;padding:6px 10px;border-radius:6px;}
    .late-sec{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;}.viol-sec{background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:15px;}th,td{border:1px solid #cbd5e1;padding:8px;text-align:center;}th{font-weight:bold;}
    .late-th{background:#f97316;color:#fff;}.viol-th{background:#7c3aed;color:#fff;}tr:nth-child(even){background:#f8fafc;}
    @media print{body{padding:0;}@page{margin:1.5cm;}}
    </style></head><body>
    <div class="header"><h1>${schoolInfo.schoolName}</h1><h2>التقارير اليومية – ${periodLabel} | ${schoolInfo.academicYear || ''}</h2></div>
    ${lateRecs.length > 0 ? `<div class="sec late-sec">المتأخرون (${lateRecs.length})</div>
    <table><thead><tr class="late-th"><th>م</th><th>الطالب</th><th>الصف</th><th>التاريخ</th><th>الزمن</th><th>الإجراء</th></tr></thead><tbody>
    ${lateRecs.map((r,i)=>`<tr><td>${i+1}</td><td style="text-align:right;font-weight:bold;">${r.studentName}</td><td>${r.gradeAndClass}</td><td>${toHijriShort(r.date)}</td><td>${r.exitTime||'-'}</td><td>${r.actionTaken||'-'}</td></tr>`).join('')}
    </tbody></table>` : ''}
    ${violRecs.length > 0 ? `<div class="sec viol-sec">المخالفون (${violRecs.length})</div>
    <table><thead><tr class="viol-th"><th>م</th><th>الطالب</th><th>الصف</th><th>التاريخ</th><th>المخالفة</th><th>الإجراء</th></tr></thead><tbody>
    ${violRecs.map((r,i)=>`<tr><td>${i+1}</td><td style="text-align:right;font-weight:bold;">${r.studentName}</td><td>${r.gradeAndClass}</td><td>${toHijriShort(r.date)}</td><td>${r.violationType}</td><td>${r.actionTaken||'-'}</td></tr>`).join('')}
    </tbody></table>` : ''}
    </body></html>`);
    pw.document.close(); setTimeout(() => pw.print(), 300);
    showToast('تم فتح تقرير الفترة للطباعة', 'success');
  };
  // ══════════════════════════════════════════════════════════════════════
  const handlePrintAttendanceReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const records = filteredRecords;
    const staffMap: Record<string, { name: string; present: number; absent: number; late: number; excused: number; withdrawn: number; submitted: number }> = {};

    records.forEach(r => {
      if (!staffMap[r.staffId]) {
        staffMap[r.staffId] = { name: r.staffName, present: 0, absent: 0, late: 0, excused: 0, withdrawn: 0, submitted: 0 };
      }
      staffMap[r.staffId][r.status]++;
      if (r.isSubmitted) staffMap[r.staffId].submitted++;
    });

    const staffLabel = perfStaffMode === 'specific' && selectedStaffId
      ? allStaffWithRecords.find(s => s.id === selectedStaffId)?.name || 'مناوب محدد'
      : 'جميع المناوبين';
    const reportTitle = `تقرير أداء المناوبة – ${staffLabel}`;
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
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Tajawal', sans-serif; padding: 40px; direction: rtl; color: #1e293b; }
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
    <div class="stat-box"><div class="stat-val" style="color: #10b981;">${stats.present}</div><div class="stat-label">حاضر</div></div>
    <div class="stat-box"><div class="stat-val" style="color: #ef4444;">${stats.absent}</div><div class="stat-label">غائب</div></div>
    <div class="stat-box"><div class="stat-val" style="color: #3b82f6;">${stats.excused}</div><div class="stat-label">مستأذن</div></div>
    <div class="stat-box"><div class="stat-val" style="color: #f97316;">${stats.withdrawn}</div><div class="stat-label">منسحب</div></div>
    <div class="stat-box"><div class="stat-val" style="color: #f59e0b;">${stats.late}</div><div class="stat-label">متأخر</div></div>
    <div class="stat-box"><div class="stat-val" style="color: #6366f1;">${stats.submitted}</div><div class="stat-label">تقرير مُسلّم</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50px;">م</th>
        <th style="text-align: right;">اسم المناوب</th>
        <th>حاضر</th>
        <th>غائب</th>
        <th>متأخر</th>
        <th>مستأذن</th>
        <th>منسحب</th>
        <th>التقارير المسلمة</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(staffMap).map(([_, data], idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="text-align: right; font-weight: bold; color: #334155;">${data.name}</td>
          <td style="color: #10b981; font-weight: bold;">${data.present > 0 ? data.present : '-'}</td>
          <td style="color: #ef4444; font-weight: bold;">${data.absent > 0 ? data.absent : '-'}</td>
          <td style="color: #f59e0b; font-weight: bold;">${data.late > 0 ? data.late : '-'}</td>
          <td style="color: #3b82f6; font-weight: bold;">${data.excused > 0 ? data.excused : '-'}</td>
          <td style="color: #f97316; font-weight: bold;">${data.withdrawn > 0 ? data.withdrawn : '-'}</td>
          <td style="color: #6366f1; font-weight: bold;">${data.submitted > 0 ? data.submitted : '-'}</td>
        </tr>
      `).join('')}
      ${Object.keys(staffMap).length === 0 ? `
        <tr><td colspan="8" style="padding: 30px; color: #64748b; font-weight: bold; text-align: center;">
          المناوب لم يسجل أي حضور / غياب في هذا النطاق الزمني
        </td></tr>
      ` : ''}
    </tbody>
  </table>
  
  <div class="footer" style="justify-content: center;">
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <BarChart3 size={24} className="text-[#655ac1]" />
            <div>
              <h2 className="text-xl font-black text-slate-800">تقارير المناوبة</h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">تقارير الأداء والسلوك والتأخر</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          
          {/* Main Tabs */}
          <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-fit">
            <button
              onClick={() => setMainTab('performance')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                mainTab === 'performance'
                  ? 'bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-[#655ac1]'
              }`}
            >
              <BarChart3 size={18} /> تقارير الأداء للمناوبين
            </button>
            <button
              onClick={() => setMainTab('daily')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                mainTab === 'daily'
                  ? 'bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-[#655ac1]'
              }`}
            >
              <FileText size={18} /> تقرير السلوك والتأخر للطلاب في المناوبة
            </button>
          </div>

          {mainTab === 'performance' && (
            <div className="space-y-5">

              {/* ── ملخص الأداء الكلي (أعلى) ── */}
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                <div className="mb-5">
                  <h3 className="text-base font-black text-slate-800">ملخص الأداء</h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">إحصائيات المناوبة لجميع الأيام المسجلة</p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[
                    { label: 'حاضر', val: allStats.present, color: 'text-green-600' },
                    { label: 'غائب', val: allStats.absent, color: 'text-red-500' },
                    { label: 'متأخر', val: allStats.late, color: 'text-amber-600' },
                    { label: 'مستأذن', val: allStats.excused, color: 'text-blue-500' },
                    { label: 'منسحب', val: allStats.withdrawn, color: 'text-orange-500' },
                    { label: 'تقرير مُسلّم', val: allStats.submitted, color: 'text-violet-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-50 border border-slate-300 rounded-2xl p-4 text-center">
                      <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── الفترة الزمنية ── */}
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

              {/* ── اختيار المناوب ── */}
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                <p className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
                  <User size={17} className="text-[#655ac1]" /> المناوب
                </p>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 w-fit mb-4">
                  <button onClick={() => { setPerfStaffMode('all'); setSelectedStaffId(''); }}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                      perfStaffMode === 'all' ? 'bg-white shadow-sm text-[#655ac1]' : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    جميع المناوبين
                  </button>
                  <button onClick={() => setPerfStaffMode('specific')}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                      perfStaffMode === 'specific' ? 'bg-white shadow-sm text-[#655ac1]' : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    مناوب محدد
                  </button>
                </div>
                {perfStaffMode === 'specific' && (
                  <div className="relative max-w-sm">
                    <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="ابحث عن مناوب..."
                      value={selectedStaffSearch}
                      onChange={e => setSelectedStaffSearch(e.target.value)}
                      onFocus={() => setIsDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                      className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1]/20" />
                    {isDropdownOpen && (
                      <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-100 max-h-52 overflow-y-auto z-[99]">
                        {filteredStaff.length > 0 ? filteredStaff.map(s => (
                          <button key={s.id}
                            onClick={() => { setSelectedStaffId(s.id); setSelectedStaffSearch(''); setIsDropdownOpen(false); }}
                            className="w-full text-right px-4 py-2.5 hover:bg-slate-50 text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0 flex items-center justify-between transition-colors">
                            {s.name}
                            {selectedStaffId === s.id && <Check size={15} className="text-[#655ac1]" />}
                          </button>
                        )) : <div className="p-4 text-center text-sm text-slate-400">لا توجد نتائج</div>}
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

              {/* ── معاينة النتائج ── */}
              {(() => {
                const staffLabel = perfStaffMode === 'specific' && selectedStaffId
                  ? allStaffWithRecords.find(s => s.id === selectedStaffId)?.name || 'مناوب محدد'
                  : 'جميع المناوبين';
                const reportTitle = `تقرير أداء المناوبة – ${staffLabel}`;
                const reportSubtitle = perfFromDate === perfToDate
                  ? `تاريخ: ${toHijriShort(perfFromDate)}`
                  : `من ${toHijriShort(perfFromDate)} إلى ${toHijriShort(perfToDate)}`;
                return (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
                        <Printer size={15} /> طباعة التقرير
                      </button>
                    </div>
                    {staffSummary.length === 0 ? (
                      <div className="py-14 text-center">
                        <BarChart3 size={32} className="mx-auto mb-3 text-slate-200" />
                        <p className="font-bold text-slate-500">لا توجد سجلات في هذا النطاق</p>
                        <p className="text-sm text-slate-400 mt-1">جرّب تغيير الفترة الزمنية أو المناوب المحدد</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-4 py-3 font-black text-slate-500 text-xs w-10">م</th>
                              <th className="px-4 py-3 font-black text-slate-700 text-xs">المناوب</th>
                              <th className="px-4 py-3 font-black text-green-600  text-xs text-center">حاضر</th>
                              <th className="px-4 py-3 font-black text-red-600    text-xs text-center">غائب</th>
                              <th className="px-4 py-3 font-black text-amber-600  text-xs text-center">متأخر</th>
                              <th className="px-4 py-3 font-black text-blue-600   text-xs text-center">مستأذن</th>
                              <th className="px-4 py-3 font-black text-orange-600 text-xs text-center">منسحب</th>
                              <th className="px-4 py-3 font-black text-violet-600 text-xs text-center">التقارير</th>
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
                                <td className="px-4 py-3 text-center font-black text-violet-600">{d.submitted > 0 ? d.submitted : <span className="text-slate-200">—</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          )} {/* end mainTab === performance */}



          {/* ══════ Daily Reports Hub ══════ */}
          {mainTab === 'daily' && (
            <div className="space-y-5">

              {/* ── تحديد الفترة ── */}
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                <p className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
                  <Calendar size={17} className="text-[#655ac1]" /> تحديد الفترة الزمنية
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">من تاريخ</label>
                    <input type="date" value={dailyFromDate} onChange={e => setDailyFromDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-1 focus:border-[#655ac1] bg-slate-50" />
                    {dailyFromDate && <p className="text-xs text-[#655ac1] font-bold mt-1">{toHijriShort(dailyFromDate)}</p>}
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">إلى تاريخ</label>
                    <input type="date" value={dailyToDate} onChange={e => setDailyToDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-1 focus:border-[#655ac1] bg-slate-50" />
                    {dailyToDate && <p className="text-xs text-[#655ac1] font-bold mt-1">{toHijriShort(dailyToDate)}</p>}
                  </div>
                </div>
              </div>

              {/* ── تنبيه عدم وجود بيانات لليوم ──────────────────────────── */}
              {dailyFromDate === dailyToDate && !activeReports.some(r => r.date === dailyFromDate) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-black text-amber-700">لم يتم تعبئة نموذج تقرير المناوبة لهذا اليوم</p>
                    <p className="text-xs text-amber-600/80 mt-0.5">لم يرفع أي مناوب تقريره اليومي بعد لتاريخ {toHijriShort(dailyFromDate)}</p>
                  </div>
                </div>
              )}

              {/* ── Statistics Cards ──────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-300 text-center shadow-sm hover:scale-105 transition-transform max-w-sm sm:max-w-full mx-auto sm:mx-0">
                  <p className="text-4xl font-black text-amber-600 mb-1">{dailyFilteredLate.length}</p>
                  <p className="text-sm font-black text-amber-700">الطلاب المتأخرون</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-300 text-center shadow-sm hover:scale-105 transition-transform max-w-sm sm:max-w-full mx-auto sm:mx-0">
                  <p className="text-4xl font-black text-[#655ac1] mb-1">{dailyFilteredViolations.length}</p>
                  <p className="text-sm font-black text-[#655ac1]">الطلاب المخالفون سلوكيًا</p>
                </div>
                {/* تم حذف بطاقة الطلاب الفريدين بناءً على طلب المستخدم */}
              </div>

              {/* ── Daily Chart ───────────────────────────────────────────── */}
              {dailyChartDates.length > 0 && (
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                  <p className="text-sm font-black text-slate-700 mb-5 flex items-center gap-2">
                    <BarChart3 size={17} className="text-[#655ac1]" /> التوزيع اليومي للبيانات
                  </p>
                  <div className="overflow-x-auto pb-2">
                    <div className="flex gap-3 items-end min-w-min">
                      {dailyChartDates.slice(-14).map(({ date, lateCount, violationCount }) => {
                        const maxVal = Math.max(...dailyChartDates.map(d => d.lateCount + d.violationCount), 1);
                        const lateH = Math.round((lateCount / maxVal) * 64);
                        const violH = Math.round((violationCount / maxVal) * 64);
                        return (
                          <div key={date} className="flex flex-col items-center gap-1 min-w-[44px]">
                            <span className="text-[9px] font-bold text-slate-500">{lateCount + violationCount}</span>
                            <div className="w-8 flex flex-col justify-end gap-0.5" style={{ height: '68px' }}>
                              {violationCount > 0 && <div className="w-full bg-[#655ac1] rounded-sm" style={{ height: `${violH}px` }} title={`مخالفة: ${violationCount}`} />}
                              {lateCount > 0 && <div className="w-full bg-amber-400 rounded-sm" style={{ height: `${lateH}px` }} title={`تأخر: ${lateCount}`} />}
                            </div>
                            <span className="text-[8px] text-slate-400 text-center leading-tight max-w-[44px] break-words">
                              {calendarType === 'hijri'
                                ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'short' }).format(new Date(date))
                                : new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'short' }).format(new Date(date))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-5 mt-3 text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-400 rounded-sm inline-block" /> تأخر</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#655ac1] rounded-sm inline-block" /> مخالفة سلوكية</span>
                  </div>
                </div>
              )}

              {/* ── Student Search ────────────────────────────────────────── */}
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                <p className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
                  <Search size={17} className="text-[#655ac1]" /> البحث عن طالب
                </p>
                <div className="relative mb-4">
                  <Search size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="اكتب اسم الطالب للبحث في السجلات..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="w-full pr-10 pl-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-1 focus:border-[#655ac1] focus:ring-[#655ac1]/30"
                  />
                  {studentSearch && (
                    <button onClick={() => setStudentSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors">
                      <X size={13} className="text-slate-400" />
                    </button>
                  )}
                </div>

                {studentSearch.trim() ? (
                  <div className="space-y-4">
                    {/* Late records for student */}
                    {studentFilteredLate.length > 0 && (
                      <div>
                        <p className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg mb-2 flex items-center gap-2 w-fit">
                          <Clock size={12} /> سجلات التأخر ({studentFilteredLate.length})
                        </p>
                        <div className="overflow-x-auto rounded-xl border border-amber-100">
                          <table className="w-full text-xs">
                            <thead><tr className="bg-amber-500 text-white text-center">
                              <th className="p-2 text-right rounded-tr-lg">الطالب</th><th className="p-2">الصف</th><th className="p-2">التاريخ</th><th className="p-2">الزمن</th><th className="p-2">الإجراء</th><th className="p-2 rounded-tl-lg">ملاحظات</th>
                            </tr></thead>
                            <tbody>
                              {studentFilteredLate.map((r, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}>
                                  <td className="p-2 font-bold text-slate-700">{r.studentName}</td>
                                  <td className="p-2 text-center">{r.gradeAndClass}</td>
                                  <td className="p-2 text-center">{toHijriShort(r.date)}</td>
                                  <td className="p-2 text-center">{r.exitTime || '-'}</td>
                                  <td className="p-2 text-center text-[10px]">{r.actionTaken || '-'}</td>
                                  <td className="p-2 text-center text-slate-400">{r.notes || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {/* Violation records for student */}
                    {studentFilteredViolations.length > 0 && (
                      <div>
                        <p className="text-xs font-black text-[#655ac1] bg-violet-50 border border-violet-100 px-3 py-1.5 rounded-lg mb-2 flex items-center gap-2 w-fit">
                          <AlertTriangle size={12} /> سجلات المخالفات ({studentFilteredViolations.length})
                        </p>
                        <div className="overflow-x-auto rounded-xl border border-violet-100">
                          <table className="w-full text-xs">
                            <thead><tr className="bg-[#7c6ff0] text-white text-center">
                              <th className="p-2 text-right rounded-tr-lg">الطالب</th><th className="p-2">الصف</th><th className="p-2">التاريخ</th><th className="p-2">المخالفة</th><th className="p-2">الإجراء</th><th className="p-2 rounded-tl-lg">ملاحظات</th>
                            </tr></thead>
                            <tbody>
                              {studentFilteredViolations.map((r, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-violet-50/20'}>
                                  <td className="p-2 font-bold text-slate-700">{r.studentName}</td>
                                  <td className="p-2 text-center">{r.gradeAndClass}</td>
                                  <td className="p-2 text-center">{toHijriShort(r.date)}</td>
                                  <td className="p-2 text-center text-[10px]">{r.violationType}</td>
                                  <td className="p-2 text-center text-[10px]">{r.actionTaken || '-'}</td>
                                  <td className="p-2 text-center text-slate-400">{r.notes || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {studentFilteredLate.length === 0 && studentFilteredViolations.length === 0 && (
                      <div className="text-center py-8 text-sm text-slate-400 font-bold">لا توجد سجلات لهذا الطالب في قاعدة البيانات</div>
                    )}
                    {(studentFilteredLate.length > 0 || studentFilteredViolations.length > 0) && (
                      <button
                        onClick={() => handlePrintStudentReport(studentSearch.trim(), studentFilteredLate, studentFilteredViolations)}
                        className="flex items-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#655ac1]/20 transition-all active:scale-95"
                      >
                        <Printer size={15} /> طباعة تقرير الطالب
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-center py-5 text-sm text-slate-400 font-medium">ابحث باسم الطالب لعرض سجله الكامل من التأخرات والمخالفات</p>
                )}
              </div>

              {/* ── Full Period Records ───────────────────────────────────── */}
              {!studentSearch.trim() && (dailyFilteredLate.length > 0 || dailyFilteredViolations.length > 0) && (
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-black text-slate-700 flex items-center gap-2">
                      <FileText size={17} className="text-[#655ac1]" /> جميع السجلات في الفترة
                    </p>
                    <button
                      onClick={() => handlePrintDailyReport(dailyFilteredLate, dailyFilteredViolations)}
                      className="flex items-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm shadow-[#655ac1]/25 transition-all active:scale-95"
                    >
                      <Printer size={13} /> طباعة
                    </button>
                  </div>

                  {/* تبويبات المتأخرين والمخالفين */}
                  <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 mb-5 w-fit">
                    <button
                      onClick={() => setDataTabStudents('late')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        dataTabStudents === 'late'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'text-slate-500 hover:text-amber-600'
                      }`}
                    >
                      <Clock size={13} /> الطلاب المتأخرون ({dailyFilteredLate.length})
                    </button>
                    <button
                      onClick={() => setDataTabStudents('violations')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        dataTabStudents === 'violations'
                          ? 'bg-[#7c6ff0] text-white shadow-sm'
                          : 'text-slate-500 hover:text-[#655ac1]'
                      }`}
                    >
                      <AlertTriangle size={13} /> الطلاب المخالفون سلوكيًا ({dailyFilteredViolations.length})
                    </button>
                  </div>

                  {/* محتوى تبويب المتأخرين */}
                  {dataTabStudents === 'late' && (
                    dailyFilteredLate.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-amber-100">
                        <table className="w-full text-xs">
                          <thead><tr className="bg-amber-500 text-white text-center">
                            <th className="p-2">م</th><th className="p-2 text-right">الطالب</th><th className="p-2">الصف</th><th className="p-2">التاريخ</th><th className="p-2">الزمن</th><th className="p-2">الإجراء</th>
                          </tr></thead>
                          <tbody>
                            {dailyFilteredLate.map((r, i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}>
                                <td className="p-2 text-center text-slate-400">{i + 1}</td>
                                <td className="p-2 font-bold text-slate-700">{r.studentName}</td>
                                <td className="p-2 text-center">{r.gradeAndClass}</td>
                                <td className="p-2 text-center">{toHijriShort(r.date)}</td>
                                <td className="p-2 text-center">{r.exitTime || '-'}</td>
                                <td className="p-2 text-center text-[10px]">{r.actionTaken || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-amber-500 font-bold">لا توجد حالات تأخر في هذه الفترة</div>
                    )
                  )}

                  {/* محتوى تبويب المخالفين */}
                  {dataTabStudents === 'violations' && (
                    dailyFilteredViolations.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-violet-100">
                        <table className="w-full text-xs">
                          <thead><tr className="bg-[#7c6ff0] text-white text-center">
                            <th className="p-2">م</th><th className="p-2 text-right">الطالب</th><th className="p-2">الصف</th><th className="p-2">التاريخ</th><th className="p-2">المخالفة</th><th className="p-2">الإجراء</th>
                          </tr></thead>
                          <tbody>
                            {dailyFilteredViolations.map((r, i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-violet-50/20'}>
                                <td className="p-2 text-center text-slate-400">{i + 1}</td>
                                <td className="p-2 font-bold text-slate-700">{r.studentName}</td>
                                <td className="p-2 text-center">{r.gradeAndClass}</td>
                                <td className="p-2 text-center">{toHijriShort(r.date)}</td>
                                <td className="p-2 text-center text-[10px]">{r.violationType}</td>
                                <td className="p-2 text-center text-[10px]">{r.actionTaken || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-[#655ac1] font-bold">لا توجد مخالفات سلوكية في هذه الفترة</div>
                    )
                  )}
                </div>
              )}

              {/* Empty state */}
              {dailyFilteredLate.length === 0 && dailyFilteredViolations.length === 0 && !studentSearch.trim() && (
                <div className="bg-white rounded-[2rem] p-12 shadow-sm border border-slate-100 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BarChart3 size={32} className="text-slate-300" />
                  </div>
                  <p className="text-base font-black text-slate-600 mb-1">لا توجد بيانات في هذه الفترة</p>
                  <p className="text-sm text-slate-400">لم يتم رصد أي تأخرات أو مخالفات حتى الآن في الفترة المحددة</p>
                </div>
              )}

            </div>
          )}
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

const DutyReportsModal: React.FC<Props> = (props) => {
  if (!props.isOpen) return null;
  return (
    <ErrorBoundary>
      <DutyReportsModalContent {...props} />
    </ErrorBoundary>
  );
};

export default DutyReportsModal;

