import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, X, Trash2,
  Search, Shield, ShieldCheck, Check, BarChart2,
  ClipboardCheck, ClipboardX,
  Eye, PenLine, Hourglass
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
  const [, setEditStaffId] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState('');
  const [addStaffTab, setAddStaffTab] = useState<'teacher' | 'admin'>('teacher');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [deleteSelection, setDeleteSelection] = useState<Record<string, string[]>>({});
  const [deleteSelectionMode, setDeleteSelectionMode] = useState<Record<string, boolean>>({});
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
      const existingById = new Map(da.staffAssignments.map(sa => [sa.staffId, sa]));
      const buildAssignment = (staffId: string): DutyStaffAssignment | null => {
        // المناوب المسند مسبقاً يُبقى كما هو (مع توقيعه وبياناته)
        const existing = existingById.get(staffId);
        if (existing) return existing;
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
      };

      if (addPanelMode === 'edit') {
        // وضع تعديل اليوم: يصبح المناوبون = المحدّدون بالضبط (إضافة/إزالة/استبدال في خطوة واحدة)
        const newAssignments = selectedStaffIds.map(buildAssignment).filter(Boolean) as DutyStaffAssignment[];
        return { ...da, isDisabled: false, staffAssignments: newAssignments };
      }
      // وضع الإضافة: نُلحق المحدّدين الجدد بالموجودين
      const additions = selectedStaffIds
        .filter(id => !existingById.has(id))
        .map(buildAssignment)
        .filter(Boolean) as DutyStaffAssignment[];
      return { ...da, isDisabled: false, staffAssignments: [...da.staffAssignments, ...additions] };
    });

    setSelectedStaffIds([]);
    setShowAddPanel(null);
    setAddPanelMode('add');
    setEditStaffId(null);
    setAddSearch('');
    setAddStaffTab('teacher');
    showToast(addPanelMode === 'edit' ? 'تم تعديل مناوبي اليوم بنجاح' : 'تم إضافة المناوبين بنجاح', 'success');
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

  const openAddPanel = (dayId: string, event?: React.MouseEvent<HTMLButtonElement>, opts?: { editDay?: boolean }) => {
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      setAddPanelPosition({
        top: Math.min(rect.bottom + 8, window.innerHeight - 320),
        right: Math.max(window.innerWidth - rect.right, 16),
      });
    }
    const editDay = !!opts?.editDay;
    // في وضع التعديل: نعرض النافذة والمناوبون الحاليون محدّدون مسبقًا لإلغاء/استبدال من تشاء.
    const current = editDay ? getDayAssignment(dayId).staffAssignments : [];
    setShowAddPanel(dayId);
    setAddPanelMode(editDay ? 'edit' : 'add');
    setEditStaffId(null);
    setSelectedStaffIds(editDay ? current.map(sa => sa.staffId) : []);
    setAddStaffTab(editDay && current[0]?.staffType === 'admin' ? 'admin' : 'teacher');
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
      // في وضع التعديل: إلغاء تحديد الجميع = تفريغ مناوبة اليوم
      if (addPanelMode === 'edit') {
        applyManualStaffAssignments(dayId);
        return;
      }
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
      if (prev.includes(staffId)) return prev.filter(id => id !== staffId);
      return [...prev, staffId];
    });
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
        setDeleteSelection(prev => ({ ...prev, [dayId]: [] }));
        setDeleteSelectionMode(prev => ({ ...prev, [dayId]: false }));
        setConfirmState(null);
      }
    });
  };

  // تبديل تحديد مناوب للحذف (الشيك-بوكس الدائري)
  const toggleDeleteSelect = (dayId: string, staffId: string) => {
    setDeleteSelection(prev => {
      const current = prev[dayId] || [];
      const next = current.includes(staffId) ? current.filter(id => id !== staffId) : [...current, staffId];
      if (next.length === 0) {
        setDeleteSelectionMode(mode => ({ ...mode, [dayId]: false }));
      }
      return {
        ...prev,
        [dayId]: next,
      };
    });
  };

  const handleDeleteForDay = (dayId: string) => {
    const selected = deleteSelection[dayId] || [];
    if (selected.length === 0) {
      if (deleteSelectionMode[dayId]) {
        setDeleteSelectionMode(prev => ({ ...prev, [dayId]: false }));
        return;
      }
      setDeleteSelectionMode(prev => ({ ...prev, [dayId]: true }));
      return;
    }
    setConfirmState({
      title: 'حذف المناوبين المحددين',
      message: `سيتم حذف ${selected.length} مناوب محدّد من مناوبة هذا اليوم. هل تريد المتابعة؟`,
      confirmLabel: 'نعم، احذف',
      tone: 'danger',
      onConfirm: () => {
        updateDayAssignment(dayId, da => ({
          ...da,
          staffAssignments: da.staffAssignments.filter(sa => !selected.includes(sa.staffId)),
        }));
        setDeleteSelection(prev => ({ ...prev, [dayId]: [] }));
        setDeleteSelectionMode(prev => ({ ...prev, [dayId]: false }));
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

  const calendarType = schoolInfo.calendarType
    || schoolInfo.semesters?.find(s => s.isCurrent)?.calendarType
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

  const getWeekLabel = (weekName: string | undefined, index: number) => {
    const raw = (weekName || '').trim();
    const match = raw.match(/\d+/);
    return {
      label: 'الأسبوع',
      number: match ? match[0] : String(index + 1),
    };
  };

  const weeksForReport = dutyData.weekAssignments && dutyData.weekAssignments.length > 0
    ? dutyData.weekAssignments
    : [{ weekId: 'legacy-week', weekName: 'الأسبوع الحالي', startDate: '', endDate: '', dayAssignments }];

  const distributionReportRows = weeksForReport.map(week => {
    const reportDays = week.dayAssignments.filter(da => !da.isOfficialLeave && !da.isDisabled);
    const allInactive = week.dayAssignments.length === 0
      || week.dayAssignments.every(da => da.isOfficialLeave || da.isDisabled);
    return {
      weekId: week.weekId,
      weekName: week.weekName || 'الأسبوع الحالي',
      assignedCount: reportDays.reduce((acc, da) => acc + da.staffAssignments.length, 0),
      daysWithoutDuty: reportDays.filter(da => da.staffAssignments.length === 0).length,
      allInactive,
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
        type: staff.type === 'teacher' ? 'معلم' : ((staff as any).role || 'إداري'),
        count: countMap.get(staff.id) || 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'));
  }, [availableStaff, dayAssignments]);

  const highestStaffAssignmentCount = Math.max(0, ...staffAssignmentCounts.map(staff => staff.count));
  const renderWeekBadge = (weekName: string | undefined, index: number, centered = true) => {
    const weekLabel = getWeekLabel(weekName, index);
    return (
      <span className={`inline-flex items-center gap-2 font-black text-slate-800 ${centered ? 'justify-center' : ''}`}>
        <span>{weekLabel.label}</span>
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-slate-300 bg-slate-50 px-2 text-[#655ac1] text-xs">
          {weekLabel.number}
        </span>
      </span>
    );
  };

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
                        <td className="px-3 py-2 font-bold text-slate-700 text-center">{renderWeekBadge(row.weekName, distributionReportRows.findIndex(item => item.weekId === row.weekId))}</td>
                        <td className={`px-3 py-2 text-base font-black text-center ${row.allInactive || row.assignedCount === 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{row.assignedCount}</td>
                        <td className={`px-3 py-2 text-base font-black text-center ${row.allInactive || row.daysWithoutDuty > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{row.daysWithoutDuty}</td>
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
                          <td className="px-3 py-3 font-bold text-slate-700 text-center">{renderWeekBadge(week.weekName, distributionReportRows.findIndex(item => item.weekId === week.weekId))}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              {week.days.map(day => (
                                <span
                                  key={`${week.weekId}-${day.day}-${day.date}`}
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-rose-600"
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
                <div className="rounded-2xl p-4 border border-slate-300 bg-white flex items-start gap-3">
                  <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white shrink-0">
                    <Check size={14} strokeWidth={3.5} />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-emerald-700">التوزيع مكتمل</p>
                    <p className="text-sm font-medium text-emerald-700/90">جميع أيام المناوبة تحتوي على مناوب.</p>
                  </div>
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
                <table className="w-full table-fixed text-xs text-right">
                  <thead className="bg-white border-b border-slate-100 text-[#655ac1]">
                    <tr>
                      <th className="px-3 py-2 font-black text-center w-[12%]">م</th>
                      <th className="px-3 py-2 font-black text-center w-[38%]">المناوب</th>
                      <th className="px-3 py-2 font-black text-center w-[24%]">الصفة</th>
                      <th className="px-3 py-2 font-black text-center w-[26%]">عدد المناوبة المسندة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {staffAssignmentCounts.map((staff, index) => {
                      const isHighest = highestStaffAssignmentCount > 0 && staff.count === highestStaffAssignmentCount;
                      return (
                        <tr key={staff.id} className="hover:bg-slate-50">
                          <td className="px-3 py-3 text-center">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-xs font-black text-slate-400">
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-bold text-slate-800 text-center">
                            {staff.name}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-[11px] font-bold text-slate-600">
                              {staff.type}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`text-base font-black ${isHighest ? 'text-amber-600' : 'text-[#655ac1]'}`}>
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
      <div className="space-y-6">
        {(() => {
          const weeksToRender = dutyData.weekAssignments && dutyData.weekAssignments.length > 0
            ? dutyData.weekAssignments
            : [{ weekId: 'legacy-week', weekName: '', startDate: '', endDate: '', dayAssignments: activeDays.map(day => getDayAssignment(day)) }];

          return weeksToRender.map((week, weekIndex) => (
            <div key={week.weekId} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                {(() => {
                  const weekLabel = getWeekLabel(week.weekName, weekIndex);
                  return (
                    <h4 className="font-black text-slate-800 text-lg inline-flex items-center gap-2">
                      <ShieldCheck size={21} className="text-[#655ac1]" />
                      <span>{weekLabel.label}</span>
                      <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-50 px-2 text-[#655ac1] text-sm">
                        {weekLabel.number}
                      </span>
                    </h4>
                  );
                })()}
              </div>
              <div>
                <table className="w-full text-sm text-right border-collapse table-fixed">
                  <thead>
                    <tr className="bg-[#a59bf0] text-white border-b border-slate-400">
                      <th className="p-3 font-black w-[18%] border-l border-white/40 text-center">اليوم</th>
                      <th className="p-3 font-black w-[18%] border-l border-white/40 text-center">التاريخ</th>
                      <th className="p-3 font-black w-[44%] border-l border-white/40 text-center">المناوب</th>
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
                      <th className="p-3 font-black w-[20%] text-center print:hidden">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.dayAssignments.map(da => {
                      const dayId = da.date || da.day;
                      const staffAssignments = da.staffAssignments;
                      const showAdd = showAddPanel === dayId;
                      const canAddMore = !da.isRemoteWork && !da.isOfficialLeave && !da.isDisabled;

                      return (
                        <tr key={dayId} className="border-b border-slate-200 hover:bg-slate-50/40 transition-colors align-top">
                          {/* Day Column (with merged date) */}
                          <td className="p-4 border-l border-slate-200/60 align-middle bg-slate-50/50 text-center">
                            <h4 className="font-black text-[#655ac1] text-base">{DAY_NAMES[da.day]}</h4>
                          </td>

                          <td className="p-4 border-l border-slate-200/60 align-middle bg-slate-50/50 text-center">
                            {da.date && (
                              <span className="block font-black text-slate-700 text-sm leading-relaxed">
                                {formatDisplayDate(da.date)}
                              </span>
                            )}
                          </td>

                          {/* Staff Column */}
                          <td className="p-3 border-l border-slate-200/60 align-top">
                            {da.isOfficialLeave ? (
                              <div
                                className="flex items-center justify-center min-h-[3rem] rounded-xl bg-amber-50/40"
                                style={{
                                  backgroundImage:
                                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%23fbbf24' stroke-width='2' stroke-dasharray='8 5'/%3E%3C/svg%3E\")",
                                }}
                              >
                                <span className="font-black text-amber-700 text-sm">{da.officialLeaveText || 'إجازة رسمية'}</span>
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
                                {staffAssignments.map(sa => {
                                  const isMarkedForDelete = (deleteSelection[dayId] || []).includes(sa.staffId);
                                  const isDeleteMode = !!deleteSelectionMode[dayId];
                                  return (
                                    <div key={sa.staffId} className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2 hover:border-[#655ac1]/20 transition-all">
                                      <span className="font-bold text-slate-800 text-sm flex-1 text-right">{sa.staffName}</span>
                                      {isDeleteMode && (
                                        <button
                                          type="button"
                                          onClick={() => toggleDeleteSelect(dayId, sa.staffId)}
                                          title="حدّد للحذف"
                                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                            isMarkedForDelete
                                              ? 'bg-rose-500 border-rose-500 text-white'
                                              : 'bg-white border-slate-300 text-transparent hover:border-rose-400'
                                          }`}
                                        >
                                          <Check size={12} strokeWidth={3.5} />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}

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
                                                <h3 className="text-base font-black text-slate-800">{addPanelMode === 'edit' ? 'تعديل المناوبين' : 'إضافة مناوبين'}</h3>
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
                                                    addStaffTab === tab.id ? 'bg-white shadow-sm' : 'hover:bg-white/60'
                                                  }`}
                                                >
                                                  <span className="text-slate-900">{tab.label}</span>
                                                  <span className="text-[#655ac1] mr-1">({tab.count})</span>
                                                </button>
                                              ))}
                                            </div>
                                            <div className="relative">
                                              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                              <input type="text" autoFocus value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="ابحث" className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-[#655ac1]/30" />
                                            </div>
                                          </div>
                                          <div className="flex-1 overflow-y-auto p-4 bg-white">
                                            {(() => {
                                              const currentDayStaffIds = new Set(staffAssignments.map(sa => sa.staffId));
                                              const filtered = unassignedStaff
                                                .filter(s => addPanelMode === 'edit' || !staffAssignments.some(sa => sa.staffId === s.id))
                                                .filter(s => s.type === addStaffTab)
                                                .filter(s => !addSearch.trim() || s.name.includes(addSearch))
                                                // في وضع التعديل: المناوبون الحاليون لهذا اليوم يظهرون أولاً
                                                .sort((a, b) => (currentDayStaffIds.has(b.id) ? 1 : 0) - (currentDayStaffIds.has(a.id) ? 1 : 0));
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
                                                  <table className="w-full table-fixed text-right text-sm">
                                                    <thead className="bg-slate-50 text-[#655ac1]">
                                                      <tr>
                                                        <th className="px-4 py-3 font-black text-center w-[12%]">م</th>
                                                        <th className="px-4 py-3 font-black w-[32%]">الاسم</th>
                                                        <th className="px-4 py-3 font-black text-center w-[34%]">الصفة</th>
                                                        <th className="px-4 py-3 font-black text-center w-[22%]">تحديد</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                      {filtered.map((staff, index) => {
                                                        const isSel = selectedStaffIds.includes(staff.id);
                                                        return (
                                                          <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-3 text-center text-slate-400 font-bold">{index + 1}</td>
                                                            <td className="px-4 py-3 font-bold text-slate-800 truncate">{staff.name}</td>
                                                            <td className="px-4 py-3 font-bold text-slate-500 text-center whitespace-nowrap">{staff.type === 'teacher' ? 'معلم' : (staff.role || 'إداري')}</td>
                                                            <td className="px-4 py-3">
                                                              <button
                                                                type="button"
                                                                onClick={() => toggleStaffSelection(staff.id)}
                                                                className={`mx-auto w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                                                  isSel ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent hover:border-[#655ac1]/60'
                                                                }`}
                                                                title="تحديد"
                                                              >
                                                                {isSel && <Check size={13} strokeWidth={3.5} />}
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
                                            <button onClick={() => saveManualStaffAssignments(dayId)} className="inline-flex items-center gap-2 bg-[#655ac1] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all">
                                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1]">
                                                <Check size={13} strokeWidth={3.2} className="text-white" />
                                              </span>
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
                              <button
                                onClick={(e) => openAddPanel(dayId, e, { editDay: true })}
                                disabled={da.isOfficialLeave || da.isDisabled}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title="تعديل المناوبين"
                              >
                                <PenLine size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteForDay(dayId)}
                                disabled={da.isOfficialLeave || staffAssignments.length === 0}
                                className="p-1.5 rounded-lg border border-slate-200 bg-transparent text-rose-600 hover:text-rose-700 hover:bg-transparent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title={(deleteSelection[dayId] || []).length > 0 ? 'حذف المناوبين المحددين' : deleteSelectionMode[dayId] ? 'إلغاء تحديد الحذف' : 'تحديد المناوبين للحذف'}
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


