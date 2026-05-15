import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, X, Trash2,
  Search, Shield, Check, BarChart2,
  ClipboardCheck, ClipboardX,
  Eye, PenLine, Hourglass, CircleOff, CalendarCheck2
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
import ConfirmDialog from '../ui/ConfirmDialog';
import LoadingLogo from '../ui/LoadingLogo';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState<string | null>(null);
  const [addPanelMode, setAddPanelMode] = useState<'add' | 'edit'>('add');
  const [editStaffId, setEditStaffId] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState('');
  const [addStaffTab, setAddStaffTab] = useState<'teacher' | 'admin'>('teacher');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [addPanelPosition, setAddPanelPosition] = useState<{ top: number; right: number } | null>(null);
  const [showDistributionReport, setShowDistributionReport] = useState(false);
  const [showStaffDistributionReport, setShowStaffDistributionReport] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: 'warning' | 'danger';
    onConfirm: () => void;
  } | null>(null);
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
    dayAssignments.forEach(da => {
      if (da.isOfficialLeave || da.isDisabled) return;
      da.staffAssignments.forEach(sa => ids.add(sa.staffId));
    });
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

  const applyManualStaffAssignments = (dayId: string) => {
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

      const currentAssignments = addPanelMode === 'edit' && editStaffId
        ? da.staffAssignments.filter(sa => sa.staffId !== editStaffId)
        : da.staffAssignments;
      return { ...da, isDisabled: false, staffAssignments: [...currentAssignments, ...newAssignments] };
    });

    setSelectedStaffIds([]);
    setShowAddPanel(null);
    setAddPanelMode('add');
    setEditStaffId(null);
    setAddSearch('');
    setAddStaffTab('teacher');
    showToast(addPanelMode === 'edit' ? 'تم تعديل المناوب بنجاح' : 'تم إضافة المناوبين بنجاح', 'success');
  };

  const closeAddPanel = () => {
    setShowAddPanel(null);
    setSelectedStaffIds([]);
    setAddSearch('');
    setAddStaffTab('teacher');
    setAddPanelMode('add');
    setEditStaffId(null);
    setAddPanelPosition(null);
  };

  const openAddPanel = (dayId: string, event?: React.MouseEvent<HTMLButtonElement>, staffIdToEdit?: string) => {
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      setAddPanelPosition({
        top: Math.min(rect.bottom + 8, window.innerHeight - 320),
        right: Math.max(window.innerWidth - rect.right, 16),
      });
    }
    const existing = staffIdToEdit ? getDayAssignment(dayId).staffAssignments.find(sa => sa.staffId === staffIdToEdit) : null;
    setShowAddPanel(dayId);
    setAddPanelMode(staffIdToEdit ? 'edit' : 'add');
    setEditStaffId(staffIdToEdit || null);
    setSelectedStaffIds([]);
    setAddStaffTab(existing?.staffType === 'admin' ? 'admin' : 'teacher');
    setAddSearch('');
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

        setTimeout(() => {
          setIsGenerating(false);
          showToast('تم التوزيع الذكي بنجاح بناءً على جدول الحصص الفعلي', 'success');
          setShowDistributionReport(true);
          if (alerts.length > 0) {
            showToast(alerts[0], 'warning');
          }
        }, 2500);
      } catch (err) {
        setIsGenerating(false);
        showToast('حدث خطأ أثناء التوزيع', 'error');
        console.error(err);
      }
    }, 50);
  };

  const resetSchedule = () => {
    setConfirmState({
      title: 'إعادة إنشاء الجدول',
      message: 'سيتم مسح مسودة جدول المناوبة الحالي والبدء من جديد. هل تريد المتابعɿ',
      confirmLabel: 'نعم، إعادة الإنشاء',
      tone: 'danger',
      onConfirm: () => {
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
        setConfirmState(null);
      }
    });
  };

  const saveManualStaffAssignments = (dayId: string) => {
    if (selectedStaffIds.length === 0) {
      closeAddPanel();
      return;
    }
    
    const alreadyAssigned = addPanelMode === 'edit' ? [] : selectedStaffIds.filter(id => assignedStaffIds.has(id));
    if (alreadyAssigned.length > 0) {
      setConfirmState({
        title: 'تنبيه قبل الإضافة',
        message: 'لقد اخترت مناوِبين تم توزيعهم مسبقًا في أيام أخرى. هل تريد إضافتهم أيضًا لهذا اليوم؟',
        confirmLabel: 'نعم، أضفهم',
        tone: 'warning',
        onConfirm: () => {
          applyManualStaffAssignments(dayId);
          setConfirmState(null);
        }
      });
      return;
    }
    
    applyManualStaffAssignments(dayId);
  };


  const toggleStaffSelection = (staffId: string) => {
    if (!showAddPanel) return;

    setSelectedStaffIds(prev => {
      if (addPanelMode === 'edit') return prev.includes(staffId) ? [] : [staffId];
      if (prev.includes(staffId)) return prev.filter(id => id !== staffId);
      return [...prev, staffId];
    });
  };

  const toggleRemoteWork = (dayId: string) => {
    updateDayAssignment(dayId, da => ({
      ...da,
      isRemoteWork: !da.isRemoteWork,
      isDisabled: false,
      isOfficialLeave: false,
      staffAssignments: !da.isRemoteWork ? [] : da.staffAssignments,
    }));
  };

  const toggleDisabledDay = (dayId: string) => {
    updateDayAssignment(dayId, da => ({
      ...da,
      isDisabled: !da.isDisabled,
      isRemoteWork: false,
      staffAssignments: !da.isDisabled ? [] : da.staffAssignments,
    }));
    setDutyData(prev => ({
      ...prev,
      reports: (prev.reports || []).filter(r => r.date !== dayId && r.day !== dayId),
    }));
  };

  /** Toggle official leave for the whole day */
  const toggleOfficialLeave = (dayId: string) => {
    updateDayAssignment(dayId, da => ({
      ...da,
      isOfficialLeave: !da.isOfficialLeave,
      isRemoteWork: false,
      isDisabled: false,
      staffAssignments: !da.isOfficialLeave ? [] : da.staffAssignments,
    }));
  };

  const convertOfficialLeaveToWorkDay = (dayId: string) => {
    setConfirmState({
      title: 'تحويل إلى يوم عمل',
      message: 'سيتم تحويل هذا اليوم من إجازة رسمية إلى يوم عمل وإتاحته لإضافة مناوبين دون إعادة إنشاء الجدول. هل تريد المتابعة؟',
      confirmLabel: 'نعم، حوّل إلى يوم عمل',
      tone: 'warning',
      onConfirm: () => {
        updateDayAssignment(dayId, da => ({
          ...da,
          isOfficialLeave: false,
          officialLeaveText: undefined,
          isRemoteWork: false,
          isDisabled: false,
          staffAssignments: da.staffAssignments || [],
        }));
        setConfirmState(null);
      }
    });
  };

  const removeStaffFromDay = (dayId: string, staffId: string) => {
    const staffName = getDayAssignment(dayId).staffAssignments.find(sa => sa.staffId === staffId)?.staffName || 'المناوب';
    setConfirmState({
      title: 'حذف المناوب',
      message: `هل تريد حذف ${staffName} من مناوبة هذا اليوم؟`,
      confirmLabel: 'نعم، احذف',
      tone: 'danger',
      onConfirm: () => {
        updateDayAssignment(dayId, da => ({
          ...da,
          staffAssignments: da.staffAssignments.filter(sa => sa.staffId !== staffId),
        }));
        setConfirmState(null);
      }
    });
  };

  const deleteDay = (dayId: string) => {
    setConfirmState({
      title: 'حذف اليوم',
      message: 'سيتم حذف هذا اليوم من جدول المناوبة. هل تريد المتابعة؟',
      confirmLabel: 'نعم، احذف',
      tone: 'danger',
      onConfirm: () => {
        setDutyData(prev => ({
          ...prev,
          dayAssignments: prev.dayAssignments.filter(da => (da.date || da.day) !== dayId),
          weekAssignments: prev.weekAssignments?.map(week => ({
            ...week,
            dayAssignments: week.dayAssignments.filter(da => (da.date || da.day) !== dayId),
          })).filter(week => week.dayAssignments.length > 0),
          reports: (prev.reports || []).filter(r => r.date !== dayId && r.day !== dayId),
        }));
        setConfirmState(null);
      }
    });
  };

  const clearDayStaff = (dayId: string) => {
    setConfirmState({
      title: 'حذف مناوبة اليوم',
      message: 'سيتم حذف جميع المناوبين المضافين في هذا اليوم. هل تريد المتابعة؟',
      confirmLabel: 'نعم، احذف',
      tone: 'danger',
      onConfirm: () => {
        updateDayAssignment(dayId, da => ({ ...da, staffAssignments: [] }));
        setConfirmState(null);
      }
    });
  };

  // Report helpers

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

  useEffect(() => {
    const openDistributionReport = () => setShowDistributionReport(true);
    window.addEventListener('motabe:duty_distribution_report', openDistributionReport);
    return () => window.removeEventListener('motabe:duty_distribution_report', openDistributionReport);
  }, []);

  useEffect(() => {
    const openStaffDistributionReport = () => setShowStaffDistributionReport(true);
    window.addEventListener('motabe:duty_staff_distribution_report', openStaffDistributionReport);
    return () => window.removeEventListener('motabe:duty_staff_distribution_report', openStaffDistributionReport);
  }, []);

  // Column headers for duty officers (مناوب 1، مناوب 2، ...)
  const staffColumnHeaders = Array.from({ length: maxStaffPerDay }, (_, i) =>
    maxStaffPerDay === 1 ? 'المناوب' : `مناوب ${i + 1}`
  );

  const calendarType = schoolInfo.semesters?.find(s => s.isCurrent)?.calendarType
    || schoolInfo.semesters?.[0]?.calendarType || 'hijri';

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

  const weeksForReport = dutyData.weekAssignments && dutyData.weekAssignments.length > 0
    ? dutyData.weekAssignments
    : [{ weekId: 'legacy-week', weekName: 'الأسبوع الحالي', startDate: '', endDate: '', dayAssignments }];

  const distributionReportRows = weeksForReport.map(week => {
    const reportDays = week.dayAssignments.filter(da => !da.isOfficialLeave && !da.isDisabled);
    return {
      weekId: week.weekId,
      weekName: week.weekName || 'الأسبوع الحالي',
      assignedCount: reportDays.reduce((acc, da) => acc + da.staffAssignments.length, 0),
      daysWithoutDuty: reportDays.filter(da => da.staffAssignments.length === 0).length,
    };
  });

  const distributionGaps = weeksForReport.flatMap(week =>
    week.dayAssignments
      .filter(da => !da.isOfficialLeave && !da.isDisabled && da.staffAssignments.length === 0)
      .map(da => ({
        weekId: week.weekId,
        weekName: week.weekName || 'الأسبوع الحالي',
        day: da.day,
        date: da.date || '',
      }))
  );

  const distributionGapsByWeek = weeksForReport
    .map(week => ({
      weekId: week.weekId,
      weekName: week.weekName || 'الأسبوع الحالي',
      days: week.dayAssignments
        .filter(da => !da.isOfficialLeave && !da.isDisabled && da.staffAssignments.length === 0)
        .map(da => ({ day: da.day, date: da.date || '' })),
    }))
    .filter(week => week.days.length > 0);

  const totalDutyAssignments = distributionReportRows.reduce((acc, row) => acc + row.assignedCount, 0);
  const totalDaysWithoutDuty = distributionReportRows.reduce((acc, row) => acc + row.daysWithoutDuty, 0);

  const staffAssignmentCounts = useMemo(() => {
    const countMap = new Map<string, number>();
    dayAssignments.forEach(da => {
      if (da.isOfficialLeave || da.isDisabled) return;
      da.staffAssignments.forEach(sa => {
        countMap.set(sa.staffId, (countMap.get(sa.staffId) || 0) + 1);
      });
    });

    return availableStaff
      .map(staff => ({
        id: staff.id,
        name: staff.name,
        type: staff.type === 'teacher' ? 'معلم' : 'إداري',
        count: countMap.get(staff.id) || 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'));
  }, [availableStaff, dayAssignments]);

  const highestStaffAssignmentCount = Math.max(0, ...staffAssignmentCounts.map(staff => staff.count));

  return (
    <div className="space-y-6">
      {isGenerating && (
        <div className="fixed inset-0 z-[100000] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
          <LoadingLogo size="lg" />
          <p className="text-base font-bold text-[#655ac1]">جاري إنشاء جدول المناوبة...</p>
        </div>
      )}
      <ConfirmDialog
        isOpen={!!confirmState}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel}
        tone={confirmState?.tone}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />

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

      {/* Distribution Report Modal Popup */}
      {showDistributionReport && dayAssignments.length > 0 && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowDistributionReport(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center">
                  <BarChart2 size={22} className="text-[#655ac1]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">تقرير توزيع المناوبة</h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">ملخص حالة جدول المناوبة الحالي</p>
                </div>
              </div>
              <button onClick={() => setShowDistributionReport(false)} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                  <p className="text-[11px] font-bold text-slate-500">إجمالي الإسنادات</p>
                  <p className="text-2xl font-black text-[#655ac1] mt-1">{totalDutyAssignments}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                  <p className="text-[11px] font-bold text-slate-500">أيام بلا مناوبين</p>
                  <p className={`text-2xl font-black mt-1 ${totalDaysWithoutDuty > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{totalDaysWithoutDuty}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-black text-slate-800 text-center">تقرير توزيع المناوبة</div>
                <table className="w-full text-xs text-right">
                  <thead className="bg-white border-b border-slate-100 text-[#655ac1]">
                    <tr>
                      <th className="px-3 py-2 font-black text-center">الأسبوع</th>
                      <th className="px-3 py-2 font-black text-center">عدد المناوبون</th>
                      <th className="px-3 py-2 font-black text-center">أيام بلا مناوب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {distributionReportRows.map(row => (
                      <tr key={row.weekId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-bold text-slate-700 text-center">{row.weekName}</td>
                        <td className={`px-3 py-2 font-black text-center ${row.assignedCount === 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{row.assignedCount}</td>
                        <td className={`px-3 py-2 font-black text-center ${row.daysWithoutDuty > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{row.daysWithoutDuty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {distributionGapsByWeek.length > 0 && (
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-black text-slate-800 text-center">بحاجة إلى إسناد</div>
                  <table className="w-full text-xs text-right">
                    <thead className="bg-white border-b border-slate-100 text-[#655ac1]">
                      <tr>
                        <th className="px-3 py-2 font-black text-center w-44">الأسبوع</th>
                        <th className="px-3 py-2 font-black text-center">الأيام والتواريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {distributionGapsByWeek.map(week => (
                        <tr key={week.weekId} className="hover:bg-slate-50">
                          <td className="px-3 py-3 font-bold text-slate-700 text-center">{week.weekName}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              {week.days.map(day => (
                                <span
                                  key={`${week.weekId}-${day.day}-${day.date}`}
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-rose-600"
                                >
                                  <span>{DAY_NAMES[day.day]}</span>
                                  <span>{formatDisplayDate(day.date)}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {distributionGaps.length === 0 && totalDutyAssignments > 0 && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">
                  ✓ التوزيع مكتمل — جميع أيام المناوبة تحتوي على مناوب .
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowDistributionReport(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Distribution Report Modal Popup */}
      {showStaffDistributionReport && dayAssignments.length > 0 && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowStaffDistributionReport(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center">
                  <BarChart2 size={22} className="text-[#655ac1]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">تقرير توزيع المناوبين</h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">نصيب كل مناوب من أيام المناوبة</p>
                </div>
              </div>
              <button onClick={() => setShowStaffDistributionReport(false)} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-black text-slate-800 text-center">تقرير توزيع المناوبين</div>
                <table className="w-full text-xs text-right">
                  <thead className="bg-white border-b border-slate-100 text-[#655ac1]">
                    <tr>
                      <th className="px-3 py-2 font-black text-center w-16">م</th>
                      <th className="px-3 py-2 font-black">المناوب</th>
                      <th className="px-3 py-2 font-black text-center w-32">الصفة</th>
                      <th className="px-3 py-2 font-black text-center w-44">عدد المناوبة المسندة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {staffAssignmentCounts.map((staff, index) => {
                      const isHighest = highestStaffAssignmentCount > 0 && staff.count === highestStaffAssignmentCount;
                      return (
                        <tr key={staff.id} className="hover:bg-slate-50">
                          <td className="px-3 py-3 text-center text-slate-400 font-bold">{index + 1}</td>
                          <td className="px-3 py-3 font-bold text-slate-800">
                            {staff.name}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-[11px] font-bold text-slate-600">
                              {staff.type}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-black text-[#655ac1] ${
                              isHighest ? 'border-2 border-amber-400' : ''
                            }`}>
                              {staff.count}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowStaffDistributionReport(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Layout */}
      <div className="space-y-8">
        {(() => {
          const weeksToRender = dutyData.weekAssignments && dutyData.weekAssignments.length > 0
            ? dutyData.weekAssignments
            : [{ weekId: 'legacy-week', weekName: '', startDate: '', endDate: '', dayAssignments: activeDays.map(day => getDayAssignment(day)) }];

          return weeksToRender.map((week, weekIndex) => (
            <div key={week.weekId} className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                <h4 className="font-black text-[#655ac1] text-lg">الأسبوع {weekIndex + 1}</h4>
              </div>
              <div>
                <table className="w-full text-sm text-right border-collapse table-fixed">
                  <thead>
                    <tr className="border-b border-slate-400 bg-[#a59bf0] text-white">
                      <th className="p-3 font-black w-[16%] border-l border-white/40 text-center">اليوم</th>
                      <th className="p-3 font-black w-[18%] border-l border-white/40 text-center">التاريخ</th>
                      <th className="p-3 font-black w-[48%] border-l border-white/40 text-center">المناوب</th>
                      {/* Signature column */}
                      <th className="hidden p-3 font-black text-white text-center w-[10%] border-l border-white/40">
                        <div className="flex items-center justify-center gap-1.5">
                          <PenLine size={14} className="text-white" />
                          <span>التوقيع</span>
                        </div>
                      </th>
                      {/* Report Form column */}
                      <th className="hidden p-3 font-black text-white text-center border-l border-white/40 print:hidden w-[13%] leading-snug">
                        <span className="block">معاينة وطباعة</span>
                        <span className="block">التقرير اليومي</span>
                      </th>
                      {/* Report Submission status column */}
                      <th className="hidden p-3 font-black text-white w-[18%] text-center border-l border-white/40 print:hidden leading-snug">
                        <span className="block">متابعة تسليم</span>
                        <span className="block">النموذج اليومي</span>
                      </th>
                      {/* Actions column */}
                      <th className="p-3 font-black w-[18%] text-center print:hidden">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.dayAssignments.map(da => {
                      const dayId = da.date || da.day;
                      const staffAssignments = da.staffAssignments;
                      const showAdd = showAddPanel === dayId;
                      const canAddMore = !da.isRemoteWork && !da.isOfficialLeave && !da.isDisabled;

                      return (
                        <tr key={dayId} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors align-top">
                          {/* Day Column */}
                          <td className="p-4 border-l border-slate-200/60 align-middle">
                            <div className="flex flex-col justify-center items-center text-center gap-1">
                              <h4 className="font-black text-slate-900 text-base">{DAY_NAMES[da.day]}</h4>
                            </div>
                          </td>

                          {/* Date Column */}
                          <td className="p-4 border-l border-slate-200/60 align-middle text-center">
                            {da.date ? (
                              <span className="font-bold text-slate-700 text-sm">
                                {formatDisplayDate(da.date)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>

                          {/* Staff Column */}
                          <td className="p-3 border-l border-slate-200/60 align-top">
                            {da.isOfficialLeave ? (
                              <div className="flex items-center justify-center p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                                <span className="font-black text-amber-600 text-sm">{da.officialLeaveText || 'إجازة رسمية'}</span>
                              </div>
                            ) : da.isDisabled ? (
                              <div className="flex items-center justify-center p-3 bg-white border border-slate-200 rounded-xl">
                                <span className="font-black text-slate-500 text-sm">غير مفعل</span>
                              </div>
                            ) : da.isRemoteWork ? (
                              <div className="flex items-center justify-center p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                                <span className="font-black text-emerald-600 text-sm">العمل عن بعد – مدرستي</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {/* Assigned staff */}
                                {staffAssignments.map((sa, idx) => (
                                  <div key={sa.staffId} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm hover:border-[#655ac1]/20 transition-all">
                                    {staffAssignments.length > 1 && (
                                      <span className="w-5 h-5 rounded-full bg-[#e5e1fe] text-[#655ac1] text-[10px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                                    )}
                                    <span className="font-bold text-slate-800 text-sm flex-1 text-right">{sa.staffName}</span>
                                    <button
                                      onClick={() => removeStaffFromDay(dayId, sa.staffId)}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 transition-colors"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                ))}

                                {/* Add button */}
                                {(canAddMore || showAdd) && (
                                  <div className="relative">
                                    {canAddMore && (
                                      <button
                                        onClick={(e) => openAddPanel(dayId, e)}
                                        className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-[#655ac1]/50 rounded-xl text-slate-400 hover:text-[#655ac1] hover:bg-[#e5e1fe]/20 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                                      >
                                        <Plus size={13} /> إضافة مناوب
                                      </button>
                                    )}

                                    {/* Staff picker modal */}
                                    {showAdd && (
                                      <>
                                        <div className="fixed inset-0 z-[9998] bg-black/40" onClick={closeAddPanel} />
                                        <div
                                          className="fixed top-[7vh] right-1/2 translate-x-1/2 w-[min(94vw,46rem)] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200 z-[9999] overflow-hidden flex flex-col"
                                          onClick={e => e.stopPropagation()}
                                        >
                                          <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                                            <div className="flex items-center gap-3">
                                              <Shield size={22} className="text-[#655ac1]" />
                                              <div>
                                                <h3 className="text-base font-black text-slate-800">{addPanelMode === 'edit' ? 'تعديل المناوب' : 'إضافة مناوبين'}</h3>
                                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">{DAY_NAMES[da.day]}</p>
                                              </div>
                                            </div>
                                            <button onClick={closeAddPanel} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                                              <X size={18} />
                                            </button>
                                          </div>
                                          <div className="p-4 border-b border-slate-100 shrink-0 space-y-3">
                                            <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded-xl">
                                              {[
                                                { id: 'teacher' as const, label: 'المعلمون', count: unassignedStaff.filter(s => s.type === 'teacher' && (addPanelMode === 'edit' || !staffAssignments.some(sa => sa.staffId === s.id))).length },
                                                { id: 'admin' as const, label: 'الإداريون', count: unassignedStaff.filter(s => s.type === 'admin' && (addPanelMode === 'edit' || !staffAssignments.some(sa => sa.staffId === s.id))).length },
                                              ].map(tab => (
                                                <button
                                                  key={tab.id}
                                                  onClick={() => setAddStaffTab(tab.id)}
                                                  className={`px-3 py-2 rounded-lg text-sm font-black transition-all ${
                                                    addStaffTab === tab.id ? 'bg-white text-[#655ac1] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                  }`}
                                                >
                                                  {tab.label} ({tab.count})
                                                </button>
                                              ))}
                                            </div>
                                            <div className="relative">
                                              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                              <input type="text" autoFocus value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder={addStaffTab === 'teacher' ? 'بحث عن اسم المعلم...' : 'بحث عن اسم الإداري...'} className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#655ac1]/30" />
                                            </div>
                                          </div>
                                          <div className="flex-1 overflow-y-auto p-4 bg-white">
                                            {(() => {
                                              const filtered = unassignedStaff
                                                .filter(s => addPanelMode === 'edit' || !staffAssignments.some(sa => sa.staffId === s.id))
                                                .filter(s => s.type === addStaffTab)
                                                .filter(s => !addSearch.trim() || s.name.includes(addSearch));
                                              if (filtered.length === 0) {
                                                return (
                                                  <div className="text-center py-6 text-slate-400 text-xs font-bold">
                                                    <Shield size={24} className="mx-auto mb-2 opacity-30" />
                                                    {addSearch.trim() ? 'لا توجد نتائج' : 'لا يوجد مناوبون متاحون'}
                                                  </div>
                                                );
                                              }
                                              return (
                                                <div className="overflow-hidden rounded-2xl border border-slate-200">
                                                  <table className="w-full text-right text-sm">
                                                    <thead className="bg-slate-50 text-[#655ac1]">
                                                      <tr>
                                                        <th className="px-4 py-3 font-black text-center w-16">م</th>
                                                        <th className="px-4 py-3 font-black">الاسم</th>
                                                        <th className="px-4 py-3 font-black w-28">الصفة</th>
                                                        <th className="px-4 py-3 font-black text-center w-28">اختيار / إلغاء</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                      {filtered.map((staff, index) => {
                                                        const isSel = selectedStaffIds.includes(staff.id);
                                                        return (
                                                          <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-3 text-center text-slate-400 font-bold">{index + 1}</td>
                                                            <td className="px-4 py-3 font-bold text-slate-800">{staff.name}</td>
                                                            <td className="px-4 py-3 font-bold text-slate-500">{staff.type === 'teacher' ? 'معلم' : 'إداري'}</td>
                                                            <td className="px-4 py-3">
                                                              <button
                                                                type="button"
                                                                onClick={() => toggleStaffSelection(staff.id)}
                                                                className={`mx-auto w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                                                                  isSel ? 'border-[#655ac1] text-[#655ac1]' : 'border-slate-300 text-transparent hover:border-[#655ac1]/60'
                                                                }`}
                                                              >
                                                                {isSel && <Check size={18} strokeWidth={3} className="text-[#655ac1]" />}
                                                              </button>
                                                            </td>
                                                          </tr>
                                                        );
                                                      })}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              );
                                            })()}
                                          </div>
                                          <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2 shrink-0">
                                            <button onClick={closeAddPanel} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all">
                                              إغلاق
                                            </button>
                                            <button onClick={() => saveManualStaffAssignments(dayId)} className="bg-[#655ac1] hover:bg-[#8779fb] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all">
                                              حفظ{selectedStaffIds.length > 0 ? ` (${selectedStaffIds.length})` : ''}
                                            </button>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}

                                {staffAssignments.length === 0 && !canAddMore && (
                                  <span className="text-xs text-slate-300 text-center py-2">-</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* ── عامود التوقيع الرقمي ── */}
                          <td className="hidden p-2 border-l border-slate-200/60 align-middle text-center">
                            {da.isOfficialLeave || da.isRemoteWork || da.isDisabled ? (
                              <span className="text-xs text-slate-300">-</span>
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
                                  <span className="text-xs text-slate-300">-</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* ── معاينة نموذج التقرير اليومي (قراءة فقط) ── */}
                          <td className="hidden p-2 border-l border-slate-200/60 align-middle print:hidden text-center">
                            {da.isOfficialLeave || da.isRemoteWork || da.isDisabled ? (
                              <span className="text-xs text-slate-300">-</span>
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
                                  <span className="text-xs text-slate-300">-</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* ── NEW: Report Submission Status Column (hidden in print) ── */}
                          <td className="hidden p-2 border-l border-slate-200/60 align-middle print:hidden">
                            {da.isOfficialLeave || da.isRemoteWork || da.isDisabled ? (
                              <span className="text-xs text-slate-300 block text-center">-</span>
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
                                  <span className="text-xs text-slate-300 text-center">-</span>
                                )}
                              </div>
                            )}
                          </td>


                          {/* ── Actions Column (hidden in print) ── */}
                          <td className="p-3 align-middle print:hidden">
                            <div className="flex flex-row gap-2 items-center justify-center">
                              {da.isOfficialLeave && (
                                <div className="relative group">
                                  <button
                                    onClick={() => convertOfficialLeaveToWorkDay(dayId)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-300 bg-white text-emerald-600 shadow-sm transition-all active:scale-95 hover:bg-emerald-50"
                                  >
                                    <CalendarCheck2 size={16} />
                                  </button>
                                  <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.5rem)] -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-50">
                                    تحويل إلى يوم عمل
                                  </span>
                                </div>
                              )}
                              <button
                                onClick={(e) => openAddPanel(dayId, e)}
                                disabled={da.isOfficialLeave || da.isDisabled}
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-[#655ac1] shadow-sm transition-all active:scale-95 hover:bg-[#e5e1fe]/40 hover:border-[#655ac1]/30 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <PenLine size={15} />
                              </button>
                              <div className="relative group">
                                <button
                                  onClick={() => toggleDisabledDay(dayId)}
                                  disabled={da.isOfficialLeave}
                                  className={`w-9 h-9 flex items-center justify-center rounded-xl border shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                                    da.isDisabled
                                      ? 'border-[#655ac1]/30 bg-[#e5e1fe]/40 text-[#655ac1]'
                                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                  }`}
                                >
                                  <CircleOff size={15} />
                                </button>
                                {!da.isOfficialLeave && (
                                  <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.5rem)] -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-50">
                                    تعطيل اليوم
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => clearDayStaff(dayId)}
                                disabled={da.isOfficialLeave || staffAssignments.length === 0}
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-300 bg-white text-rose-600 shadow-sm transition-all active:scale-95 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Trash2 size={15} />
                              </button>
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


