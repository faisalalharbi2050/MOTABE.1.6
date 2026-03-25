import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar, Plus, X, Trash2,
  AlertTriangle, Search, Shield, Info, CheckCircle2, Check, BarChart2,
  FileText, CalendarOff, Laptop, ClipboardCheck, ClipboardX,
  Bell, Send, Eye, PenLine, Hourglass
} from 'lucide-react';
import {
  SchoolInfo, Teacher, Admin, ScheduleSettingsData,
  DutyScheduleData, DutyDayAssignment, DutyStaffAssignment, DutyReportRecord
} from '../../types';
import {
  DAYS, DAY_NAMES, getTimingConfig, getAvailableStaffForDuty,
  generateSmartDutyAssignment, validateDutyGoldenRule
} from '../../utils/dutyUtils';
import DutyReportEntry from './DutyReportEntry';
import DutyReportViewModal from './DutyReportViewModal';

interface Props {
  dutyData: DutyScheduleData;
  setDutyData: React.Dispatch<React.SetStateAction<DutyScheduleData>>;
  teachers: Teacher[];
  admins: Admin[];
  scheduleSettings: ScheduleSettingsData;
  schoolInfo: SchoolInfo;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const DutyScheduleBuilder: React.FC<Props> = ({
  dutyData, setDutyData, teachers, admins,
  scheduleSettings, schoolInfo, showToast
}) => {
  const [showAddPanel, setShowAddPanel] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDistributionReport, setShowDistributionReport] = useState(false);
  const [isAutoAssign, setIsAutoAssign] = useState(false);
  const [assignmentBannerDismissed, setAssignmentBannerDismissed] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // State for opening the report entry form (per staff per day)
  // Lazy-init: read URL params synchronously on first render so the form
  // opens immediately without waiting for a useEffect cycle.
  const [reportEntryOpen, setReportEntryOpen] = useState<{
    staffId: string; staffName: string; day: string; date: string;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    const p = new URLSearchParams(window.location.search);
    const staffId   = p.get('staffId');
    const staffName = p.get('staffName');
    const day       = p.get('day');
    const date      = p.get('date');
    return (staffId && staffName && day && date) ? { staffId, staffName, day, date } : null;
  });

  // State for read-only report preview modal
  const [reportViewOpen, setReportViewOpen] = useState<{
    staffId: string; staffName: string; day: string; date: string;
  } | null>(null);

  const timing = getTimingConfig(schoolInfo);
  const activeDays = timing.activeDays || DAYS.slice();
  const dayAssignments = dutyData.dayAssignments;

  const availableStaff = useMemo(
    () => getAvailableStaffForDuty(teachers, admins, dutyData.exclusions, dutyData.settings),
    [teachers, admins, dutyData.exclusions, dutyData.settings]
  );

  const assignedStaffIds = useMemo(() => {
    const ids = new Set<string>();
    dayAssignments.forEach(da => da.staffAssignments.forEach(sa => ids.add(sa.staffId)));
    return ids;
  }, [dayAssignments]);

  const unassignedStaff = useMemo(() => {
    return availableStaff;
  }, [availableStaff]);

  // How many duty columns to show: determined by max staff assigned per day
  const maxStaffPerDay = useMemo(() => {
    let max = dutyData.settings.suggestedCountPerDay || 1;
    dayAssignments.forEach(da => {
      if (da.staffAssignments.length > max) max = da.staffAssignments.length;
    });
    return Math.max(max, 1);
  }, [dayAssignments, dutyData.settings.suggestedCountPerDay]);

  const getDayAssignment = (dayId: string): DutyDayAssignment => {
    return dayAssignments.find(d => (d.date || d.day) === dayId) || { day: dayId, staffAssignments: [] };
  };

  const updateDayAssignment = (dayId: string, updater: (da: DutyDayAssignment) => DutyDayAssignment) => {
    setDutyData(prev => {
      const applyUpdater = (arr: DutyDayAssignment[]) =>
        arr.map(d => (d.date || d.day) === dayId ? updater(d) : d);

      const exists = prev.dayAssignments.some(d => (d.date || d.day) === dayId);
      let newDayAssignments = applyUpdater(prev.dayAssignments);

      if (!exists) {
        newDayAssignments.push(updater({ day: dayId, staffAssignments: [] }));
      }

      const newWeekAssignments = prev.weekAssignments?.map(wa => ({
        ...wa,
        dayAssignments: applyUpdater(wa.dayAssignments)
      }));

      return {
        ...prev,
        dayAssignments: newDayAssignments,
        weekAssignments: newWeekAssignments
      };
    });
  };

  const handleAutoAssign = () => {
    if (availableStaff.length === 0) {
      showToast('لا يوجد موظفين متاحين للتوزيع', 'warning');
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      try {
        const { assignments, weekAssignments, alerts, newCounts } = generateSmartDutyAssignment(
          teachers, admins, dutyData.exclusions, dutyData.settings,
          scheduleSettings, schoolInfo, dutyData.dutyAssignmentCounts || {}, dutyData.settings.suggestedCountPerDay
        );

        setDutyData(prev => ({ ...prev, dayAssignments: assignments, weekAssignments, dutyAssignmentCounts: newCounts }));
        showToast('تم التوزيع الذكي بنجاح بناءً على جدول الحصص الفعلي', 'success');
        setIsAutoAssign(true);
        setShowDistributionReport(true);

        if (alerts.length > 0) {
          showToast(alerts[0], 'warning');
        }
      } catch (err) {
        showToast('حدث خطأ أثناء التوزيع', 'error');
        console.error(err);
      } finally {
        setIsGenerating(false);
      }
    }, 600);
  };

  const resetSchedule = () => {
    if (confirm('هل أنت متأكد من مسح مسودة الجدول الحالي والبدء من جديد؟')) {
      const { assignments, weekAssignments } = generateSmartDutyAssignment(
        teachers, admins, dutyData.exclusions, dutyData.settings,
        scheduleSettings, schoolInfo, dutyData.dutyAssignmentCounts || {}, 0
      );
      setDutyData(prev => ({
        ...prev,
        dayAssignments: assignments,
        weekAssignments: weekAssignments
      }));
      showToast('تم تصفير الجدول', 'success');
    }
  };

  const saveManualStaffAssignments = (dayId: string) => {
    if (selectedStaffIds.length === 0) {
      setShowAddPanel(null);
      return;
    }
    
    // Check if any of the selected staff are already assigned to another day
    const alreadyAssigned = selectedStaffIds.filter(id => assignedStaffIds.has(id));
    if (alreadyAssigned.length > 0) {
      if (!confirm(`تحذير: لقد قمت باختيار مناوبين تم توزيعهم مسبقاً في أيام أخرى. هل أنت متأكد من رغبتك في إضافتهم أيضاً لهذا اليوم؟`)) {
        return;
      }
    }
    
    const daInfo = getDayAssignment(dayId);
    const genericDay = daInfo.day;

    updateDayAssignment(dayId, da => {
      const newAssignments = selectedStaffIds.map(staffId => {
        const staff = availableStaff.find(s => s.id === staffId);
        if (!staff) return null;
        let lastP = 0;
        if (staff.type === 'teacher' && scheduleSettings.timetable) {
          const dayMaxPeriod = timing.periodCounts?.[genericDay] || 7;
          for (let p = 1; p <= dayMaxPeriod; p++) {
            if (scheduleSettings.timetable[`${staff.id}-${genericDay}-${p}`]) lastP = p;
          }
        } else if (staff.type === 'admin') {
          lastP = timing.periodCounts?.[genericDay] || 7;
        }
        return { staffId: staff.id, staffName: staff.name, staffType: staff.type, lastPeriod: lastP, isManual: true };
      }).filter(Boolean) as DutyStaffAssignment[];

      return { ...da, staffAssignments: [...da.staffAssignments, ...newAssignments] };
    });

    setSelectedStaffIds([]);
    setShowAddPanel(null);
    setAddSearch('');
    setIsAutoAssign(false);
    showToast('تم إضافة المناوبين بنجاح', 'success');
  };

  const toggleStaffSelection = (staffId: string) => {
    if (!showAddPanel) return;
    const dayId = showAddPanel;
    const assignedCount = getDayAssignment(dayId).staffAssignments.length;
    const maxCount = dutyData.settings.suggestedCountPerDay || 1;

    setSelectedStaffIds(prev => {
      if (prev.includes(staffId)) return prev.filter(id => id !== staffId);
      if (assignedCount + prev.length >= maxCount) {
        showToast(`تم بلوغ الحد الأقصى للمناوبين (${maxCount})`, 'error');
        return prev;
      }
      return [...prev, staffId];
    });
  };

  const toggleRemoteWork = (dayId: string) => {
    updateDayAssignment(dayId, da => ({
      ...da,
      isRemoteWork: !da.isRemoteWork,
      isOfficialLeave: false,
      staffAssignments: !da.isRemoteWork ? [] : da.staffAssignments,
    }));
  };

  /** Toggle official leave for the whole day */
  const toggleOfficialLeave = (dayId: string) => {
    updateDayAssignment(dayId, da => ({
      ...da,
      isOfficialLeave: !da.isOfficialLeave,
      isRemoteWork: false,
      staffAssignments: !da.isOfficialLeave ? [] : da.staffAssignments,
    }));
  };

  const removeStaffFromDay = (dayId: string, staffId: string) => {
    if (!confirm('هل تريد حذف هذا المناوب من اليوم؟')) return;
    updateDayAssignment(dayId, da => ({
      ...da,
      staffAssignments: da.staffAssignments.filter(sa => sa.staffId !== staffId),
    }));
  };

  // ── Report helpers ──────────────────────────────────────────────────────────

  /** Check if a specific staff member submitted a report for a given day */
  const getStaffReport = (day: string, staffId: string): DutyReportRecord | undefined => {
    return dutyData.reports?.find(r => r.day === day && r.staffId === staffId && r.isSubmitted);
  };

  /** Mark a report as manually submitted (paper submission) */
  const markManualSubmission = (da: DutyDayAssignment, sa: DutyStaffAssignment) => {
    const dayId = da.date || da.day;
    const existing = getStaffReport(da.day, sa.staffId);
    if (existing) {
      showToast('تم التسليم مسبقاً', 'warning');
      return;
    }
    const newReport: DutyReportRecord = {
      id: `manual-${Date.now()}-${sa.staffId}`,
      date: da.date || da.day,
      day: da.day,
      staffId: sa.staffId,
      staffName: sa.staffName,
      lateStudents: [],
      violatingStudents: [],
      isSubmitted: true,
      manuallySubmitted: true,
      status: 'present',
      submittedAt: new Date().toISOString(),
      isEmpty: true,
    };
    setDutyData(prev => ({ ...prev, reports: [...(prev.reports || []), newReport] }));
    showToast('تم تسجيل التسليم الورقي بنجاح', 'success');
  };

  /** Remove a manual (paper) submission — undo */
  const unmarkManualSubmission = (day: string, staffId: string) => {
    setDutyData(prev => ({
      ...prev,
      reports: (prev.reports || []).filter(r => !(r.day === day && r.staffId === staffId && r.manuallySubmitted))
    }));
    showToast('تم التراجع عن التسليم الورقي', 'warning');
  };

  const handleReportSubmit = (report: DutyReportRecord) => {
    setDutyData(prev => ({
      ...prev,
      reports: [...(prev.reports || []).filter(r => !(r.day === report.day && r.staffId === report.staffId)), report]
    }));
  };

  const { valid: isGoldenRuleValid } = validateDutyGoldenRule(dayAssignments);

  // Clean URL params once on mount (after lazy-init already consumed them)
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('staffId')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to report when it appears
  useEffect(() => {
    if (showDistributionReport && reportRef.current) {
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [showDistributionReport]);

  // Build staff count map for distribution report
  const staffCountMap = useMemo(() => {
    const map: Record<string, { name: string; type: string; count: number }> = {};
    dayAssignments.forEach(da => {
      da.staffAssignments.forEach(sa => {
        if (!map[sa.staffId]) {
          map[sa.staffId] = { name: sa.staffName, type: sa.staffType === 'admin' ? 'إداري' : 'معلم', count: 0 };
        }
        map[sa.staffId].count++;
      });
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [dayAssignments]);

  const maxCount = staffCountMap.length > 0 ? staffCountMap[0][1].count : 0;
  const allSame = staffCountMap.every(([, v]) => v.count === maxCount);

  // Column headers for duty officers (مناوب 1، مناوب 2، ...)
  const staffColumnHeaders = Array.from({ length: maxStaffPerDay }, (_, i) =>
    maxStaffPerDay === 1 ? 'المناوب' : `مناوب ${i + 1}`
  );

  return (
    <div className="space-y-6">

      {/* Report Entry Form – full screen overlay (used when filling via in-app link) */}
      {reportEntryOpen && (
        <DutyReportEntry
          staffId={reportEntryOpen.staffId}
          staffName={reportEntryOpen.staffName}
          day={reportEntryOpen.day}
          date={reportEntryOpen.date}
          schoolInfo={schoolInfo}
          onClose={() => setReportEntryOpen(null)}
          onSubmit={(report) => {
            handleReportSubmit(report);
            setReportEntryOpen(null);
          }}
          showToast={showToast}
        />
      )}

      {/* Report View Modal – read-only preview of submitted report */}
      {reportViewOpen && (
        <DutyReportViewModal
          isOpen={true}
          onClose={() => setReportViewOpen(null)}
          report={getStaffReport(reportViewOpen.day, reportViewOpen.staffId) || null}
          staffName={reportViewOpen.staffName}
          day={reportViewOpen.day}
          date={reportViewOpen.date}
          schoolInfo={schoolInfo}
        />
      )}

      {/* ═══ Assignment Notification Banner ═══ */}
      {dayAssignments.some(da => da.staffAssignments.length > 0) && !assignmentBannerDismissed && (
        <div className="bg-gradient-to-l from-[#25D366]/10 via-[#e5e1fe]/20 to-[#007AFF]/10 border border-[#655ac1]/20 rounded-2xl p-4 flex items-center gap-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 shrink-0">
            <Bell size={20} className="text-[#655ac1]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-slate-800 flex items-center gap-2 flex-wrap">
              تم إنشاء جدول المناوبة اليومية
              <span className="text-slate-500 font-medium">يمكنك إشعار المناوبين بتكليفهم عبر زر</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                إرسال
                <span className="inline-flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-[#25D366]/15 rounded-md">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="#25D366">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </span>
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-[#007AFF]/15 rounded-md">
                    <Send size={11} className="text-[#007AFF]" />
                  </span>
                </span>
              </span>
            </p>
          </div>
          <button
            onClick={() => setAssignmentBannerDismissed(true)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            title="إغلاق"
          >
            <X size={16} />
          </button>
        </div>
      )}


      {/* Distribution Report Modal Popup */}
      {showDistributionReport && dayAssignments.length > 0 && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDistributionReport(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-[#e5e1fe] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-l from-[#f3f0ff] to-white rounded-t-[2rem]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#e5e1fe] text-[#655ac1] rounded-xl shadow-sm">
                  <BarChart2 size={20} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-base">تقرير توزيع المناوبة</h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">نصيب كل موظف من أيام المناوبة</p>
                </div>
              </div>
              <button onClick={() => setShowDistributionReport(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Report Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {staffCountMap.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Shield size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold text-sm">لا توجد بيانات توزيع حتى الآن</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr className="bg-[#f3f0ff]">
                          <th className="p-3 font-black text-[#655ac1] rounded-tr-xl">التسلسل</th>
                          <th className="p-3 font-black text-[#655ac1]">الموظف</th>
                          <th className="p-3 font-black text-[#655ac1]">الوظيفة</th>
                          <th className="p-3 font-black text-[#655ac1] text-center rounded-tl-xl">عدد المناوبات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffCountMap.map(([id, info], idx) => {
                          const isHighest = !allSame && info.count === maxCount;
                          return (
                            <tr key={id} className={`border-b border-slate-100 transition-colors ${isHighest ? 'bg-amber-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                              <td className="p-3 font-bold text-slate-500 text-center">{idx + 1}</td>
                              <td className={`p-3 font-bold ${isHighest ? 'text-amber-700' : 'text-slate-800'}`}>
                                {isHighest && <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2"></span>}
                                {info.name}
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                  info.type === 'إداري' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                }`}>{info.type}</span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-base shadow-sm ${
                                  isHighest ? 'bg-amber-400 text-white' : 'bg-[#e5e1fe] text-[#655ac1]'
                                }`}>
                                  {info.count}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {allSame && (
                    <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-emerald-700">
                        توزيع متساوٍ تام: جميع الموظفين لديهم {maxCount} يوم مناوبة.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unassigned staff alert */}
      {unassignedStaff.length > 0 && dayAssignments.some(da => da.staffAssignments.length > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start sm:items-center gap-3 shadow-sm">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl shrink-0 mt-1 sm:mt-0">
            <Info size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-blue-800">يوجد مناوبين متاحين لم يتم تكليفهم</h4>
            <p className="text-xs text-blue-700 font-medium mt-0.5 leading-relaxed">
              يوجد ({unassignedStaff.length}) موظفين متاحين للمناوبة لم يتم إضافتهم للجدول في أي يوم.
            </p>
          </div>
          {dayAssignments.length > 0 && (
            <button
              onClick={() => setShowDistributionReport(v => !v)}
              className="flex items-center gap-2 border border-blue-300 bg-white hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-xl font-bold text-xs transition-all shrink-0"
            >
              <BarChart2 size={14} />
              تقرير التوزيع
            </button>
          )}
        </div>
      )}

      {/* Main Table Layout */}
      <div className="space-y-8">
        {(() => {
          const calendarType = schoolInfo.semesters?.find(s => s.isCurrent)?.calendarType
            || schoolInfo.semesters?.[0]?.calendarType || 'hijri';

          // Helper: format a YYYY-MM-DD date string per the school's calendar preference
          const formatDisplayDate = (dateStr: string) => {
            if (!dateStr) return '';
            try {
              const d = new Date(dateStr);
              if (isNaN(d.getTime())) return dateStr;
              return calendarType === 'hijri'
                ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(d)
                : new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(d);
            } catch { return dateStr; }
          };

          const weeksToRender = dutyData.weekAssignments && dutyData.weekAssignments.length > 0
            ? dutyData.weekAssignments
            : [{ weekId: 'legacy-week', weekName: '', startDate: '', endDate: '', dayAssignments: activeDays.map(day => getDayAssignment(day)) }];

          return weeksToRender.map((week) => (
            <div key={week.weekId} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              {week.weekName && (
                <div className="bg-slate-50/80 border-b border-slate-200 p-5 flex items-center justify-between">
                  <h4 className="font-black text-[#5C50A4] text-xl">{week.weekName}</h4>
                  {week.startDate && (
                    <span className="text-sm font-bold text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                      {formatDisplayDate(week.startDate)} إلى {formatDisplayDate(week.endDate)}
                    </span>
                  )}
                </div>
              )}
              <div>
                <table className="w-full text-sm text-right border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 font-black text-slate-700 w-[8%] border-l border-slate-200/60 text-center">اليوم</th>
                      <th className="p-3 font-black text-slate-700 w-[9%] border-l border-slate-200/60 text-center">التاريخ</th>
                      <th className="p-3 font-black text-slate-700 w-[30%] border-l border-slate-200/60 text-center">المناوب</th>
                      {/* Signature column */}
                      <th className="p-3 font-black text-slate-700 text-center w-[10%] border-l border-slate-200/60">
                        <div className="flex items-center justify-center gap-1.5">
                          <PenLine size={14} className="text-[#655ac1]" />
                          <span>التوقيع</span>
                        </div>
                      </th>
                      {/* Report Form column */}
                      <th className="p-3 font-black text-slate-700 text-center border-l border-slate-200/60 print:hidden w-[13%] leading-snug">
                        <span className="block">معاينة وطباعة</span>
                        <span className="block">التقرير اليومي</span>
                      </th>
                      {/* Report Submission status column */}
                      <th className="p-3 font-black text-slate-700 w-[18%] text-center border-l border-slate-200/60 print:hidden leading-snug">
                        <span className="block">متابعة تسليم</span>
                        <span className="block">النموذج اليومي</span>
                      </th>
                      {/* Actions column */}
                      <th className="p-3 font-black text-slate-700 w-[12%] text-center print:hidden">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.dayAssignments.map(da => {
                      const dayId = da.date || da.day;
                      const staffAssignments = da.staffAssignments;
                      const showAdd = showAddPanel === dayId;
                      const maxPerDay = dutyData.settings.suggestedCountPerDay || 4;
                      const canAddMore = staffAssignments.length < maxPerDay && !da.isRemoteWork && !da.isOfficialLeave;

                      return (
                        <tr key={dayId} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors align-top">
                          {/* Day Column */}
                          <td className="p-4 border-l border-slate-200/60 align-middle bg-gradient-to-br from-indigo-50/20 to-transparent">
                            <div className="flex flex-col justify-center items-center text-center gap-1">
                              <h4 className="font-black text-[#655ac1] text-base">{DAY_NAMES[da.day]}</h4>
                            </div>
                          </td>

                          {/* Date Column */}
                          <td className="p-4 border-l border-slate-200/60 align-middle text-center">
                            {da.date ? (
                              <span className="font-bold text-[#655ac1] text-xs bg-[#e5e1fe]/40 px-2 py-1 rounded-lg border border-[#655ac1]/20 shadow-sm">
                                {formatDisplayDate(da.date)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          {/* Staff Column */}
                          <td className="p-3 border-l border-slate-200/60 align-top">
                            {da.isOfficialLeave ? (
                              <div className="flex items-center justify-center p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                                <span className="font-black text-amber-600 text-sm">{da.officialLeaveText || 'إجازة رسمية'}</span>
                              </div>
                            ) : da.isRemoteWork ? (
                              <div className="flex items-center justify-center p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                                <span className="font-black text-emerald-600 text-sm">العمل عن بعد – مدرستي</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {/* Assigned staff */}
                                {staffAssignments.map((sa, idx) => (
                                  <div key={sa.staffId} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm hover:border-[#655ac1]/20 transition-all group">
                                    <span className="w-5 h-5 rounded-full bg-[#e5e1fe] text-[#655ac1] text-[10px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                                    <span className="font-bold text-slate-800 text-sm flex-1 text-right">{sa.staffName}</span>
                                    {/* Per-staff delete icon */}
                                    <button
                                      onClick={() => removeStaffFromDay(dayId, sa.staffId)}
                                      className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="حذف المناوب"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}

                                {/* Add button */}
                                {canAddMore && (
                                  <div className="relative">
                                    <button
                                      onClick={() => { setShowAddPanel(dayId); setSelectedStaffIds([]); setAddSearch(''); }}
                                      className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:text-[#655ac1] hover:border-[#655ac1]/50 hover:bg-[#e5e1fe]/30 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                                    >
                                      <Plus size={13} /> إضافة مناوب
                                    </button>

                                    {/* Dropdown */}
                                    {showAdd && (
                                      <>
                                        <div className="fixed inset-0 z-[9998]" onClick={() => { setShowAddPanel(null); setSelectedStaffIds([]); setAddSearch(''); }} />
                                        <div className="absolute top-[calc(100%+0.5rem)] right-0 w-72 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-slate-200 z-[9999] overflow-hidden" onClick={e => e.stopPropagation()}>
                                          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-700">تحديد المناوبين</span>
                                            <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-bold">{unassignedStaff.filter(s => !addSearch.trim() || s.name.includes(addSearch)).length} متاح</span>
                                          </div>
                                          <div className="p-2 border-b border-slate-100">
                                            <div className="relative">
                                              <Search size={14} className="absolute right-2.5 top-2.5 text-slate-400" />
                                              <input type="text" autoFocus value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="بحث عن مناوب متاح..." className="w-full pl-2 pr-8 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1]" />
                                            </div>
                                          </div>
                                          <div className="max-h-56 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                            {(() => {
                                              const filtered = unassignedStaff.filter(s => !addSearch.trim() || s.name.includes(addSearch));
                                              if (filtered.length === 0) {
                                                return (
                                                  <div className="text-center py-6 text-slate-400 text-xs font-bold">
                                                    <Shield size={24} className="mx-auto mb-2 opacity-30" />
                                                    {addSearch.trim() ? 'لا نتائج تطابق البحث' : 'جميع الموظفين مخصصون'}
                                                  </div>
                                                );
                                              }
                                              return filtered.map(staff => {
                                                const isSelected = selectedStaffIds.includes(staff.id);
                                                return (
                                                  <button key={staff.id} onClick={() => toggleStaffSelection(staff.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-right transition-all outline-none ${isSelected ? 'bg-[#e5e1fe]/40 border-[#655ac1]/20' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${isSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300'}`}>
                                                      {isSelected && <Check size={11} />}
                                                    </div>
                                                    <div className="flex-1 flex flex-col">
                                                      <span className={`text-sm font-bold ${isSelected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{staff.name}</span>
                                                      <div className="flex items-center gap-1">
                                                        <span className="text-[10px] text-slate-500">{staff.type === 'teacher' ? '(معلم)' : '(إداري)'}</span>
                                                        {assignedStaffIds.has(staff.id) && (
                                                          <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">مسند مسبقاً</span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </button>
                                                );
                                              });
                                            })()}
                                          </div>
                                          <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                                            <button onClick={() => saveManualStaffAssignments(dayId)} className="bg-[#655ac1] hover:bg-[#5046a0] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#655ac1]/20 transition-all">
                                              حفظ المحدد ({selectedStaffIds.length})
                                            </button>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}

                                {staffAssignments.length === 0 && !canAddMore && (
                                  <span className="text-xs text-slate-300 text-center py-2">—</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* ── عامود التوقيع الرقمي ── */}
                          <td className="p-2 border-l border-slate-200/60 align-middle text-center">
                            {da.isOfficialLeave || da.isRemoteWork ? (
                              <span className="text-xs text-slate-300">—</span>
                            ) : (
                              <div className="flex flex-col gap-1.5 items-center">
                                {staffAssignments.map(sa => {
                                  if (sa.signatureData) {
                                    return (
                                      <div key={sa.staffId} className="flex flex-col items-center gap-0.5">
                                        <img
                                          src={sa.signatureData}
                                          alt="توقيع"
                                          className="h-8 max-w-[90px] object-contain border border-emerald-200 rounded bg-white shadow-sm"
                                        />
                                        <span className="text-[9px] text-emerald-600 font-bold">✅ موقّع</span>
                                      </div>
                                    );
                                  } else if (sa.signatureStatus === 'pending') {
                                    return (
                                      <div key={sa.staffId} className="flex flex-col items-center gap-0.5">
                                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center animate-pulse border border-amber-200">
                                          <Hourglass size={14} className="text-amber-500" />
                                        </div>
                                        <span className="text-[9px] text-amber-600 font-bold">بانتظار التوقيع</span>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div key={sa.staffId} className="flex flex-col items-center gap-0.5">
                                        <span className="text-[9px] text-slate-300 font-bold">لم يُرسل</span>
                                      </div>
                                    );
                                  }
                                })}
                                {staffAssignments.length === 0 && (
                                  <span className="text-xs text-slate-300">—</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* ── معاينة نموذج التقرير اليومي (قراءة فقط) ── */}
                          <td className="p-2 border-l border-slate-200/60 align-middle print:hidden text-center">
                            {da.isOfficialLeave || da.isRemoteWork ? (
                              <span className="text-xs text-slate-300">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 justify-center">
                                {staffAssignments.map(sa => {
                                  const submittedReport = getStaffReport(da.day, sa.staffId);
                                  const isSubmitted = !!submittedReport;
                                  return (
                                    <button
                                      key={sa.staffId}
                                      onClick={() => setReportViewOpen({ staffId: sa.staffId, staffName: sa.staffName, day: da.day, date: da.date || da.day })}
                                      title="نموذج التقرير اليومي للمناوبة"
                                      className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all hover:shadow-sm active:scale-95 ${
                                        isSubmitted
                                          ? submittedReport?.manuallySubmitted
                                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-[#e5e1fe]/30 hover:text-[#655ac1] hover:border-[#655ac1]/20'
                                      }`}
                                    >
                                      <Eye size={14} />
                                    </button>
                                  );
                                })}
                                {staffAssignments.length === 0 && (
                                  <span className="text-xs text-slate-300">—</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* ── NEW: Report Submission Status Column (hidden in print) ── */}
                          <td className="p-2 border-l border-slate-200/60 align-middle print:hidden">
                            {da.isOfficialLeave || da.isRemoteWork ? (
                              <span className="text-xs text-slate-300 block text-center">—</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {staffAssignments.map(sa => {
                                  const report = getStaffReport(da.day, sa.staffId);
                                  const isElectronic = report && !report.manuallySubmitted;
                                  const isPaper = report && report.manuallySubmitted;
                                  return (
                                    <div key={sa.staffId} className="flex gap-1">
                                      {/* Electronic badge – always visible, green when active */}
                                      <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${
                                        isElectronic
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-slate-50 text-slate-300 border-slate-200'
                                      }`}>
                                        <ClipboardCheck size={10} />
                                        إلكتروني
                                      </span>
                                      {/* Paper badge – always visible, amber when active with undo */}
                                      {isPaper ? (
                                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                                          <ClipboardCheck size={10} />
                                          ورقي
                                          <button
                                            onClick={() => unmarkManualSubmission(da.day, sa.staffId)}
                                            title="التراجع"
                                            className="hover:text-amber-900 transition-colors"
                                          >
                                            <X size={9} />
                                          </button>
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => markManualSubmission(da, sa)}
                                          title="تسجيل تسليم ورقي"
                                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border bg-slate-50 text-slate-300 border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all"
                                        >
                                          <ClipboardX size={10} />
                                          ورقي
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                                {staffAssignments.length === 0 && (
                                  <span className="text-xs text-slate-300 text-center">—</span>
                                )}
                              </div>
                            )}
                          </td>


                          {/* ── Actions Column (hidden in print) ── */}
                          <td className="p-3 align-middle print:hidden">
                            <div className="flex flex-row gap-2 items-center justify-center">

                              {/* Official Leave toggle */}
                              <div className="relative group">
                                <button
                                  onClick={() => toggleOfficialLeave(dayId)}
                                  className={`w-9 h-9 flex items-center justify-center rounded-xl border shadow-sm transition-all active:scale-95 ${
                                    da.isOfficialLeave
                                      ? 'bg-amber-50 text-amber-600 border-amber-300'
                                      : 'bg-white text-slate-400 border-slate-200 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50'
                                  }`}
                                >
                                  <CalendarOff size={15} />
                                </button>
                                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-lg bg-[#655ac1] px-2.5 py-1.5 text-[11px] font-bold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-50">
                                  {da.isOfficialLeave ? 'إلغاء الإجازة الرسمية' : 'تعيين إجازة رسمية'}
                                </span>
                              </div>

                              {/* Remote Work toggle */}
                              <div className="relative group">
                                <button
                                  onClick={() => toggleRemoteWork(dayId)}
                                  className={`w-9 h-9 flex items-center justify-center rounded-xl border shadow-sm transition-all active:scale-95 ${
                                    da.isRemoteWork
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
                                      : 'bg-white text-slate-400 border-slate-200 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50'
                                  }`}
                                >
                                  <Laptop size={15} />
                                </button>
                                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-lg bg-[#655ac1] px-2.5 py-1.5 text-[11px] font-bold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-50">
                                  {da.isRemoteWork ? 'إلغاء العمل عن بعد' : 'تعيين عمل عن بعد'}
                                </span>
                              </div>

                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          ));
        })()}
      </div>
    </div>
  );
};

export default DutyScheduleBuilder;
