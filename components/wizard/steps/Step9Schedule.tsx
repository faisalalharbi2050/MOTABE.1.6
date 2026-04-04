import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar,
  CalendarDays,
  Play,
  Edit, 
  Lock, 
  Unlock,
  Shuffle, 
  Grid, 
  Printer, 
  Share2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  FileDown,
  Sparkles,
  Table,
  History,
  Users,
  User,
  ChevronDown,
  TypeIcon,
  Settings,
  Save,
  Send,
  X,
  CalendarClock,
  LayoutGrid,
  MonitorPlay,
  Eye,
  FileText,
  BookOpen,
  School,
  GripVertical,
  Minus,
  Plus,
  Search,
  Check,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { SchoolInfo, ScheduleSettingsData, Teacher, Subject, ClassInfo, Admin, Assignment } from '../../../types';
import { validateAllConstraints, ValidationWarning } from '../../../utils/scheduleConstraints';
import { generateSchedule } from '../../../utils/scheduleGenerator';
import SubstitutionTab from '../../schedule/SubstitutionTab';
import ConflictModal from '../../schedule/ConflictModal';
import ScheduleGrid from '../../schedule/ScheduleGrid';
import CustomTeacherView from '../../schedule/CustomTeacherView';
import WaitingModal from '../../schedule/WaitingModal';
import InlineScheduleView from '../../schedule/InlineScheduleView';
import GenerationStatusModal from '../../wizard/schedule/GenerationStatusModal';
import AuditLogPanel from '../../schedule/AuditLogPanel';
import SubjectAbbreviationsModal from '../../schedule/SubjectAbbreviationsModal';
import ScheduleManagerModal from '../../schedule/ScheduleManagerModal';
import PrintOptionsModal from '../../schedule/PrintOptionsModal';
import SendScheduleModal from '../../schedule/SendScheduleModal';
import { distributeWaiting } from '../../../utils/waitingDistributor';
import { SubstitutionConfig } from '../../../types';
import { generateExtensionXML, downloadFile } from '../../../utils/scheduleExport';

interface Step9Props {
  schoolInfo: SchoolInfo;
  scheduleSettings: ScheduleSettingsData;
  setScheduleSettings: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  admins: Admin[];
  assignments: Assignment[];
  specializations: { id: string; name: string }[];
}

const Step9Schedule: React.FC<Step9Props> = ({
  schoolInfo,
  scheduleSettings,
  setScheduleSettings,
  teachers,
  subjects,
  classes,
  admins,
  assignments,
  specializations
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConflictReport, setShowConflictReport] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  
  // NEW: Generation Status Modal State
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<'ready' | 'generating' | 'success'>('ready');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStats, setGenerationStats] = useState({
      teachers: 0, classes: 0, assignments: 0, periodsPerDay: 0, activeDays: 0
  });

  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [activeView, setActiveView] = useState<'grid' | 'individual'>('grid');
  const [isBypassingConflicts, setIsBypassingConflicts] = useState(false);
  const generationMode = scheduleSettings.generationMode || 'unified';
  const setGenerationMode = (mode: 'unified' | 'separate') => {
    setScheduleSettings(prev => ({ ...prev, generationMode: mode }));
  };
  // sharedSchoolMode is now derived from generationMode for backward compat
  const sharedSchoolMode = generationMode === 'separate' ? 'separated' : 'merged';
  const [activeSchoolId, setActiveSchoolId] = useState<string>('main');
  const [missingDataAlert, setMissingDataAlert] = useState<{title: string, message: string} | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showAbbreviationsModal, setShowAbbreviationsModal] = useState(false);
  
  // NEW: Toolbar Enhancements States
  const [isScheduleLocked, setIsScheduleLocked] = useState(false);
  const [showWaitingSettings, setShowWaitingSettings] = useState(false);
  const [showMethodChangeConfirm, setShowMethodChangeConfirm] = useState(false);
  const [pendingSubstitutionConfig, setPendingSubstitutionConfig] = useState<any>(null);
  const [hideWaitingAlert, setHideWaitingAlert] = useState(false);
  const [showManageSchedules, setShowManageSchedules] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [showSendSchedule, setShowSendSchedule] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const editMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showEditMenu) return;
    const handler = (e: MouseEvent) => {
      if (editMenuRef.current && !editMenuRef.current.contains(e.target as Node)) {
        setShowEditMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEditMenu]);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [viewDropdownPos, setViewDropdownPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const viewDropdownBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!showViewDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inMenu = viewDropdownRef.current && viewDropdownRef.current.contains(target);
      const inBtn = viewDropdownBtnRef.current && viewDropdownBtnRef.current.contains(target);
      if (!inMenu && !inBtn) setShowViewDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showViewDropdown]);

  // ── Quick-action deep-link from Dashboard ─────────────────────────
  useEffect(() => {
    const handler = () => setShowSendSchedule(true);
    window.addEventListener('motabe:send_schedule', handler);
    return () => window.removeEventListener('motabe:send_schedule', handler);
  }, []);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Manual waiting: compute teachers with incomplete distribution
  const isManualMode = scheduleSettings.substitution?.method === 'manual';
  const incompleteWaitingCount = useMemo(() => {
    if (!isManualMode) return 0;
    return teachers.filter(t => {
      const quota = t.waitingQuota || 0;
      if (quota === 0) return false;
      const placed = Object.values(scheduleSettings.timetable || {}).filter(
        (slot: any) => slot.type === 'waiting' && slot.teacherId === t.id
      ).length;
      return placed < quota;
    }).length;
  }, [isManualMode, teachers, scheduleSettings.timetable]);

  // NEW: Display View State
  type DisplayViewType = 'general_teachers' | 'general_classes' | 'general_waiting' | 'individual_teacher' | 'individual_class';
  const [activeDisplayView, setActiveDisplayView] = useState<DisplayViewType | null>(null);
  const [selectedDisplayIds, setSelectedDisplayIds] = useState<string[]>([]);
  const [individualSearchQuery, setIndividualSearchQuery] = useState('');
  const [showIndividualDropdown, setShowIndividualDropdown] = useState(false);

  // Teacher sort
  type TeacherSortMode = 'alpha' | 'specialization' | 'custom';
  const [teacherSortMode, setTeacherSortMode] = useState<TeacherSortMode>('alpha');
  const [teacherCustomOrder, setTeacherCustomOrder] = useState<string[]>([]);
  const [specializationCustomOrder, setSpecializationCustomOrder] = useState<string[]>([]);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showSpecSortModal, setShowSpecSortModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<string[]>([]);
  const [pendingSpecOrder, setPendingSpecOrder] = useState<string[]>([]);

  const hasSharedSchools = schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0;

  // Mock data for display until real logic is implemented
  const hasSchedule = scheduleSettings.timetable && Object.keys(scheduleSettings.timetable).length > 0;
  const isGeneralTeachersEditing = hasSchedule && activeView === 'grid' && !activeDisplayView;
  const showTeacherSortControls = activeDisplayView === 'general_teachers' || activeDisplayView === 'general_waiting' || isGeneralTeachersEditing;

  const getTimingConfig = () => {
    return schoolInfo.timing || {
        activeDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        periodDuration: 45,
        assemblyTime: '06:45',
        breaks: [],
        prayers: [],
        periodCounts: { sunday: 7, monday: 7, tuesday: 7, wednesday: 7, thursday: 7 }
    };
  };

  const handleValidation = () => {
     const timing = getTimingConfig();
     const weekDays = timing.activeDays.length;
     const periodCountsValues = Object.values(timing.periodCounts || {}) as number[];
     const periodsPerDay = Math.max(...periodCountsValues);

     const warnings = validateAllConstraints(
         scheduleSettings,
         subjects,
         teachers,
         weekDays,
         periodsPerDay,
         timing.activeDays,
         classes.length,
         schoolInfo.sharedSchools
     );

     setValidationWarnings(warnings);

     // Validate Essential Data First
     if (teachers.length === 0 || classes.length === 0 || subjects.length === 0) {
         setMissingDataAlert({
             title: "بيانات أساسية مفقودة",
             message: "لا يمكن بناء الجدول. تأكد من إضافة بيانات المعلمين، المواد، والفصول الدراسية في الخطوات السابقة."
         });
         return;
     }

     // Check strict manual assignment 
     if (!assignments || assignments.length === 0) {
        setMissingDataAlert({
             title: "لم يتم العثور على أي إسناد للمواد",
             message: "بما أن النظام يعمل في وضع 'الإسناد اليدوي الصارم'، فلن يتم إنشاء أي حصص ما لم تقم بإسناد المواد للمعلمين أولاً من قسم 'إسناد المواد'."
         });
        return;
    }

     if (warnings.length > 0) {
         setShowConflictReport(true);
     } else {
         // No conflicts -> Show Ready Modal directly
         openGenerationModal();
     }
  };

  const openGenerationModal = () => {
      // Calculate Stats
      const timing = getTimingConfig();
      const periodCountsValues = Object.values(timing.periodCounts || {}) as number[];
      const periodsPerDay = Math.max(...periodCountsValues);

      // In separated mode, only generate for the active school
      let targetClasses = classes;
      if (hasSharedSchools && sharedSchoolMode === 'separated') {
          targetClasses = classes.filter(c => c.schoolId === activeSchoolId || (!c.schoolId && activeSchoolId === 'main'));
      }

      setGenerationStats({
          teachers: teachers.length,
          classes: targetClasses.length,
          assignments: assignments.length,
          periodsPerDay,
          activeDays: timing.activeDays.length
      });
      setGenerationStatus('ready');
      setGenerationProgress(0);
      setShowGenerationModal(true);
      setShowConflictReport(false); // Close conflict report if open
  };

  const handleContinueWithBypass = (bypass: boolean) => {
      setIsBypassingConflicts(bypass);
      openGenerationModal();
  };

  const handleNavigateTo = (type: 'subject' | 'teacher' | 'general', id?: string) => {
      // In a real app with routing, this would navigate to the respective tab/page.
      // Since this is a wizard, we might need a prop `setActiveTab` or similar to change the Step.
      // For now, an alert guides the user.
      setShowConflictReport(false);
      
      let destination = "";
      if (type === 'subject') destination = "صفحة المواد -> قيود المواد";
      if (type === 'teacher') destination = "صفحة المعلمين -> قيود المعلمون";
      if (type === 'general') destination = "صفحة إعدادات الجدول أو البيانات الأساسية";
      
      alert(`للحل، يرجى الانتقال إلى: ${destination}\n${id ? `\n(تلميح للبحث: ${id})` : ''}`);
  };

  const startGeneration = async () => {
    // This function is now called by the GenerationStatusModal 'OnStart'
    setGenerationStatus('generating');
    setIsGenerating(true);

    // Allow UI to update before heavy lifting
    setTimeout(async () => {
        try {
            const timing = getTimingConfig();
            const periodCountsValues = Object.values(timing.periodCounts || {}) as number[];
            const periodsPerDay = Math.max(...periodCountsValues);

            let finalTimetable: Record<string, any> = {};

            if (hasSharedSchools && generationMode === 'separate') {
                // ── Separate Mode: Generate per school sequentially ──
                // Each school gets its own generation pass, but shared
                // teachers' time-slots are propagated via existingTimetable
                // so the generator's teacherSlots constraint prevents conflicts.
                const schoolIds = ['main', ...(schoolInfo.sharedSchools || []).map(s => s.id)];
                let accumulatedTimetable: Record<string, any> = {};

                for (let i = 0; i < schoolIds.length; i++) {
                    const sid = schoolIds[i];
                    const schoolClasses = classes.filter(c =>
                        c.schoolId === sid || (!c.schoolId && sid === 'main')
                    );

                    const timetable = await generateSchedule(
                        teachers,
                        subjects,
                        schoolClasses,
                        scheduleSettings,
                        {
                            activeDays: timing.activeDays,
                            periodsPerDay: periodsPerDay,
                            weekDays: timing.activeDays.length
                        },
                        (progress) => setGenerationProgress(Math.floor((i * 100 + progress) / schoolIds.length)),
                        assignments,
                        isBypassingConflicts,
                        Object.keys(accumulatedTimetable).length > 0 ? accumulatedTimetable : undefined
                    );

                    accumulatedTimetable = { ...accumulatedTimetable, ...timetable };
                }

                finalTimetable = accumulatedTimetable;
            } else {
                // ── Unified Mode (or no shared schools) ──
                // In separated sharedSchoolMode, only generate for active school
                let targetClasses = classes;
                if (hasSharedSchools && sharedSchoolMode === 'separated') {
                    targetClasses = classes.filter(c => c.schoolId === activeSchoolId || (!c.schoolId && activeSchoolId === 'main'));
                }

                const timetable = await generateSchedule(
                    teachers,
                    subjects,
                    targetClasses,
                    scheduleSettings,
                    {
                        activeDays: timing.activeDays,
                        periodsPerDay: periodsPerDay,
                        weekDays: timing.activeDays.length
                    },
                    (progress) => setGenerationProgress(progress),
                    assignments,
                    isBypassingConflicts,
                    sharedSchoolMode === 'separated' ? scheduleSettings.timetable : undefined
                );

                // If merging timetable for separated schools, keep existing timetable for other schools
                const existingTimetable = sharedSchoolMode === 'separated' ? (scheduleSettings.timetable || {}) : {};
                finalTimetable = { ...existingTimetable, ...timetable };
            }

            // Auto-save new schedule to savedSchedules
            const prevSaved = scheduleSettings.savedSchedules || [];
            const newId = `schedule-${Date.now()}`;
            const autoScheduleNumber = prevSaved.length + 1;
            const newSavedEntry = {
                id: newId,
                name: `جدول رقم ${autoScheduleNumber}`,
                createdAt: new Date().toISOString(),
                createdBy: 'النظام',
                timetable: JSON.parse(JSON.stringify(finalTimetable)),
            };
            const updatedSaved = [newSavedEntry, ...prevSaved].slice(0, 10);

            setScheduleSettings({
                ...scheduleSettings,
                timetable: finalTimetable,
                savedSchedules: updatedSaved,
                activeScheduleId: newId,
                scheduleGenerationCount: (scheduleSettings.scheduleGenerationCount || 0) + 1,
            });
            setGenerationStatus('success');
            setGenerationProgress(100);

            // Auto close after success
            setTimeout(() => {
                setShowGenerationModal(false);
            }, 2000);

        } catch (error) {
            console.error(error);
            setMissingDataAlert({
                title: "خطأ غير متوقع",
                message: "حدث خطأ غير متوقع أثناء بناء الجدول. يرجى المراجعة والمحاولة مرة أخرى."
            });
             setShowGenerationModal(false);
        } finally {
            setIsGenerating(false);
        }
    }, 100);
  };

  const handleDistributeWaiting = (config: SubstitutionConfig) => {
    try {
        // Save config first
        const newSettings = { ...scheduleSettings, substitution: config };
        // updateSettingsWithHistory(newSettings); // Wait, better to batch update
        setShowWaitingModal(false);

        if (!newSettings.timetable) {
            showToast("لا يوجد جدول حصص لتوزيع الانتظار عليه", "error");
            return;
        }

        // Run distribution
        const timing = getTimingConfig();
        const periodCountsValues = Object.values(timing.periodCounts || {}) as number[];
        const periodsPerDay = Math.max(...periodCountsValues);

        const newTimetable = distributeWaiting(
            newSettings.timetable,
            teachers,
            admins,
            newSettings,
            {
                activeDays: timing.activeDays,
                periodsPerDay
            }
        );

        setScheduleSettings({
            ...newSettings,
            timetable: newTimetable,
            waitingGenerationCount: (newSettings.waitingGenerationCount || 0) + 1,
        });
        showToast("تم إنشاء وتوزيع حصص الانتظار بنجاح", "success");
    } catch (error) {
        console.error("Error distributing waiting:", error);
        showToast("حدث خطأ أثناء إنشاء حصص الانتظار", "error");
    }
  };

  // ── Helper: filter timetable entries by schoolId ──
  const getTimetableForSchool = (schoolId: string) => {
    const timetable = scheduleSettings.timetable || {};
    const schoolClassIds = new Set(
      classes
        .filter(c => c.schoolId === schoolId || (!c.schoolId && schoolId === 'main'))
        .map(c => c.id)
    );
    return Object.fromEntries(
      Object.entries(timetable).filter(([, slot]: any) => schoolClassIds.has(slot.classId))
    );
  };

  const getSchoolName = (schoolId: string) => {
    if (schoolId === 'main') return schoolInfo.schoolName || 'المدرسة الرئيسية';
    return schoolInfo.sharedSchools?.find(s => s.id === schoolId)?.name || schoolId;
  };

  // State for school picker in separate mode (print/export/send)
  const [separateSchoolPicker, setSeparateSchoolPicker] = useState<{
    action: 'print' | 'xml' | 'excel' | 'send';
  } | null>(null);
  const [selectedExportSchoolId, setSelectedExportSchoolId] = useState<string>('main');

  const handleXMLExport = () => {
    if (hasSharedSchools && generationMode === 'separate') {
      setSeparateSchoolPicker({ action: 'xml' });
      return;
    }
    const xml = generateExtensionXML(scheduleSettings.timetable || {}, teachers, subjects, classes, schoolInfo);
    downloadFile(xml, `schedule_${schoolInfo.schoolName}.xml`, 'text/xml');
  };

  const handlePrint = () => {
    if (hasSharedSchools && generationMode === 'separate') {
      setSeparateSchoolPicker({ action: 'print' });
      return;
    }
    setShowPrintOptions(true);
  };

  const handleSendSchedule = () => {
    if (hasSharedSchools && generationMode === 'separate') {
      setSeparateSchoolPicker({ action: 'send' });
      return;
    }
    setShowSendSchedule(true);
  };

  const executeSeparateAction = () => {
    if (!separateSchoolPicker) return;
    const schoolId = selectedExportSchoolId;
    const schoolTimetable = getTimetableForSchool(schoolId);
    const name = getSchoolName(schoolId);

    switch (separateSchoolPicker.action) {
      case 'print':
        // Set timetable temporarily for print modal, then open it
        setSeparateSchoolPicker(null);
        setShowPrintOptions(true);
        break;
      case 'xml': {
        const xml = generateExtensionXML(schoolTimetable, teachers, subjects, classes, schoolInfo);
        downloadFile(xml, `schedule_${name}.xml`, 'text/xml');
        setSeparateSchoolPicker(null);
        break;
      }
      case 'excel': {
        // Generate CSV for the selected school
        const headers = ['المعلم', 'المادة', 'الفصل', 'اليوم', 'الحصة'];
        const rows = Object.entries(schoolTimetable).map(([key, slot]: any) => {
          const parts = key.split('-');
          const teacherId = parts.slice(0, parts.length - 2).join('-');
          const day = parts[parts.length - 2];
          const period = parts[parts.length - 1];
          const teacher = teachers.find(t => t.id === teacherId);
          const subject = subjects.find(s => s.id === slot.subjectId);
          const cls = classes.find(c => c.id === slot.classId);
          return [teacher?.name || '', subject?.name || '', cls?.name || '', day, period].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        downloadFile(csv, `schedule_${name}.csv`, 'text/csv');
        setSeparateSchoolPicker(null);
        break;
      }
      case 'send':
        setSeparateSchoolPicker(null);
        setShowSendSchedule(true);
        break;
    }
  };

  return (
    <div className="space-y-6 pb-20">

      {/* ══════ Header ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>

          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <CalendarDays size={36} strokeWidth={1.8} className="text-[#655ac1]" />
            إنشاء وإدارة الجدول
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إنشاء وإدارة جدول الحصص والانتظار عبر واجهة تفاعلية سهلة وسلسة</p>
          
      </div>

      {/* ══════ اختيار نوع الجدول (للمدارس المشتركة) ══════ */}
      {hasSharedSchools && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-2">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Calendar size={20} className="text-[#655ac1] shrink-0" />
            <h4 className="font-black text-slate-800 text-sm shrink-0">نوع الجدول</h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#655ac1] bg-gradient-to-l from-[#f5f3ff] to-[#ede9fe] px-3 py-1.5 rounded-full border border-[#c4b5fd] shadow-sm shadow-[#655ac1]/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[#655ac1] opacity-60 shrink-0"></span>
                {schoolInfo.schoolName || 'المدرسة الرئيسية'}
              </span>
              {schoolInfo.sharedSchools?.map((s) => (
                <React.Fragment key={s.id}>
                  <span className="text-[#c4b5fd] text-xs font-bold">+</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#655ac1] bg-gradient-to-l from-[#f5f3ff] to-[#ede9fe] px-3 py-1.5 rounded-full border border-[#c4b5fd] shadow-sm shadow-[#655ac1]/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#655ac1] opacity-60 shrink-0"></span>
                    {s.name}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setGenerationMode('unified')}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm transition-all border-2 ${
                generationMode === 'unified'
                  ? 'border-[#655ac1] bg-white text-[#655ac1]'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
              }`}
            >
              {generationMode === 'unified' && <Check size={16} className="text-[#655ac1]" />}
              <Grid size={16} />
              جدول موحد
            </button>
            <button
              onClick={() => setGenerationMode('separate')}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm transition-all border-2 ${
                generationMode === 'separate'
                  ? 'border-[#655ac1] bg-white text-[#655ac1]'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
              }`}
            >
              {generationMode === 'separate' && <Check size={16} className="text-[#655ac1]" />}
              <LayoutGrid size={16} />
              جدولان منفصلان
            </button>
          </div>
        </div>
      )}

      {/* ══════ Toolbar ══════ */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Primary Toolbar (Generation & Core Actions) */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Generate Group */}
          <div className="flex items-center gap-3">
            <button
                onClick={handleValidation}
                disabled={isGenerating}
                className="flex items-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
                {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={20} className="animate-pulse" />}
                <span>{isGenerating ? 'جاري البناء...' : 'إنشاء جدول الحصص'}</span>
            </button>
            
            <div className="w-px h-6 bg-slate-200 mx-2"></div>
            
            <div className="relative" ref={editMenuRef}>
                <button
                    onClick={() => setShowEditMenu(!showEditMenu)}
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-bold transition-all hover:border-[#8779fb]"
                >
                    <Edit size={18} className="text-[#8779fb]" />
                    <span>تعديل الجدول</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${showEditMenu ? 'rotate-180' : 'opacity-50'}`} />
                </button>
                
                {showEditMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <button 
                            onClick={() => {
                                setActiveView('grid');
                                setActiveDisplayView(null);
                                setShowEditMenu(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg transition-colors ${activeView === 'grid' && !activeDisplayView ? 'bg-[#e5e1fe] text-[#655ac1]' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Grid size={16} className="-mt-0.5" />
                            العام للمعلمين
                        </button>
                        <button 
                            onClick={() => {
                                setActiveView('individual');
                                setActiveDisplayView('individual_teacher');
                                setShowEditMenu(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg transition-colors mt-1 ${activeView === 'individual' && activeDisplayView === 'individual_teacher' ? 'bg-[#e5e1fe] text-[#655ac1]' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <User size={16} className="-mt-0.5" />
                            جدول معلم
                        </button>
                        <button 
                            onClick={() => {
                                setActiveView('individual');
                                setActiveDisplayView(null);
                                setShowEditMenu(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg transition-colors mt-1 ${activeView === 'individual' && !activeDisplayView ? 'bg-[#e5e1fe] text-[#655ac1]' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Users size={16} className="-mt-0.5" />
                            مقارنة وتعديل
                        </button>
                    </div>
                )}
            </div>
            
            <div className="w-px h-6 bg-slate-200 mx-2"></div>
            
             <button
               title={isScheduleLocked ? "إلغاء القفل" : "قفل الجدول"}
               onClick={() => setIsScheduleLocked(!isScheduleLocked)}
               className={`flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 px-6 py-3 rounded-xl font-bold transition-all hover:border-[#8779fb] ${isScheduleLocked ? 'text-rose-500' : 'text-slate-700'}`}
             >
               {isScheduleLocked ? <Lock size={18} /> : <Unlock size={18} className="text-rose-500" />}
               <span className="hidden md:inline">{isScheduleLocked ? 'إلغاء القفل' : 'قفل الجدول'}</span>
             </button>
          </div>

          <div className="flex-1"></div>
        </div>

        {/* Secondary Toolbar (Management and Logs) */}
        <div className="flex justify-between items-center bg-white/60 backdrop-blur-md rounded-2xl py-3.5 px-3 shadow-sm border border-slate-200">
            <div className="flex gap-2">
                 <button 
                   onClick={() => setShowWaitingSettings(true)}
                   title="إعدادات الانتظار"
                   className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb]"
                 >
                   <Settings size={18} className="text-[#8779fb]" />
                   <span>إعدادات الانتظار</span>
                 </button>
                 
                 <div title={isManualMode ? "التوزيع اليدوي مفعّل — استخدم بطاقات الانتظار في الجدول لتوزيع الحصص يدوياً" : ""}>
                   <button
                     disabled={isManualMode}
                     onClick={() => {
                         if (!hasSchedule) {
                             setMissingDataAlert({
                                 title: "لم يتم إنشاء جدول الحصص",
                                 message: "يجب أولاً إنشاء جدول الحصص باستخدام زر \"إنشاء جدول الحصص\"، ثم قفله قبل البدء بإنشاء جدول الانتظار."
                             });
                             return;
                         }
                         if (!isScheduleLocked) {
                             setMissingDataAlert({
                                 title: "الجدول غير مقفل",
                                 message: "يجب قفل جدول الحصص أولاً قبل إنشاء حصص الانتظار لتجنب أي تعارضات مستقبلية. اضغط على زر \"قفل الجدول\" ثم أعد المحاولة."
                             });
                             return;
                         }
                         if (!scheduleSettings.substitution?.method) {
                             setMissingDataAlert({
                                 title: "إعدادات الانتظار غير مكتملة",
                                 message: "يرجى فتح \"إعدادات الانتظار\" وتحديد طريقة التوزيع (تلقائي / محدد / يدوي) قبل إنشاء جدول الانتظار."
                             });
                             return;
                         }
                         handleDistributeWaiting(scheduleSettings.substitution);
                     }}
                     className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
                       isManualMode
                         ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                         : 'bg-[#655ac1] hover:bg-[#5046a0] text-white shadow-lg shadow-[#655ac1]/20 hover:scale-105 active:scale-95'
                     }`}
                   >
                     <CalendarClock size={18} />
                     <span>إنشاء حصص الانتظار</span>
                   </button>
                 </div>
            </div>

            <div className="flex gap-2">
                 {/* زر عرض الجداول مع قائمة منسدلة */}
                 <div className="relative">
                   <button
                     ref={viewDropdownBtnRef}
                     onClick={() => {
                       if (viewDropdownBtnRef.current) {
                         const rect = viewDropdownBtnRef.current.getBoundingClientRect();
                         setViewDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                       }
                       setShowViewDropdown(v => !v);
                     }}
                     className={`flex items-center gap-2 bg-white hover:bg-slate-50 border px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb] ${activeDisplayView ? 'border-[#8779fb] text-[#655ac1]' : 'border-slate-200 text-slate-700'}`}
                   >
                     <Eye size={18} className="text-[#655ac1]" />
                     <span>
                       {activeDisplayView
                         ? (() => {
                             const labels: Record<string, string> = {
                               general_teachers:  'الجدول العام للمعلمين',
                               general_waiting:   'الجدول العام للانتظار',
                               individual_teacher:'جدول معلم',
                               general_classes:   'الجدول العام للفصول',
                               individual_class:  'جدول فصل',
                             };
                             return labels[activeDisplayView] ?? 'عرض الجداول';
                           })()
                         : 'عرض الجداول'}
                     </span>
                     <ChevronDown size={14} className={`transition-transform duration-200 ${showViewDropdown ? 'rotate-180' : 'opacity-50'}`} />
                   </button>

                   {showViewDropdown && createPortal(
                     <div
                       ref={viewDropdownRef}
                       className="fixed w-60 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-[9999]"
                       style={{ top: viewDropdownPos.top, right: viewDropdownPos.right }}
                     >
                       {/* خيارات العرض */}
                       {([
                         { id: 'general_teachers',   title: 'الجدول العام للمعلمين',  icon: <Users size={16} /> },
                         { id: 'general_waiting',    title: 'الجدول العام للانتظار',  icon: <CalendarClock size={16} /> },
                         { id: 'individual_teacher', title: 'جدول معلم',              icon: <User size={16} /> },
                         { id: 'general_classes',    title: 'الجدول العام للفصول',   icon: <LayoutGrid size={16} /> },
                         { id: 'individual_class',   title: 'جدول فصل',              icon: <LayoutGrid size={16} /> },
                       ] as Array<{ id: string; title: string; icon: React.ReactNode }>).map(opt => (
                         <button
                           key={opt.id}
                           onClick={() => {
                             setActiveDisplayView(opt.id as typeof activeDisplayView);
                             setSelectedDisplayIds([]);
                             setIndividualSearchQuery('');
                             setShowIndividualDropdown(false);
                             setShowViewDropdown(false);
                           }}
                           className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-xl transition-colors mb-0.5 ${
                             activeDisplayView === opt.id
                               ? 'bg-[#e5e1fe] text-[#655ac1]'
                               : 'text-slate-600 hover:bg-slate-50 hover:text-[#655ac1]'
                           }`}
                         >
                           <span className={activeDisplayView === opt.id ? 'text-[#655ac1]' : 'text-slate-400'}>{opt.icon}</span>
                           {opt.title}
                         </button>
                       ))}
                       {/* فاصل + إلغاء العرض */}
                       {activeDisplayView && (
                         <>
                           <div className="h-px bg-slate-100 my-1.5" />
                           <button
                             onClick={() => {
                               setActiveDisplayView(null);
                               setSelectedDisplayIds([]);
                               setShowViewDropdown(false);
                             }}
                             className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                           >
                             <X size={16} />
                             إلغاء العرض
                           </button>
                         </>
                       )}
                     </div>,
                     document.body
                   )}
                 </div>

                 <button
                    onClick={() => setShowManageSchedules(true)}
                    title="إدارة الجداول"
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb]"
                 >
                   <Table size={18} className="text-[#655ac1]" />
                   <span>إدارة الجداول</span>
                 </button>

                 <button 
                    onClick={() => setShowAuditLog(true)}
                    title="سجل التعديلات" 
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb] relative"
                 >
                   <History size={18} className="text-blue-500" />
                   <span>سجل التعديل</span>
                   {scheduleSettings.auditLogs && scheduleSettings.auditLogs.length > 0 && (
                       <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white"></span>
                   )}
                 </button>
            </div>
        </div>
      </div>


      {/* ══════ خيارات العرض الفرعية (تظهر بعد اختيار نوع الجدول أو في وضع تعديل الجدول العام) ══════ */}
      {(activeDisplayView || showTeacherSortControls) && (
        <div className="mb-6 space-y-3">
            {/* Individual Multi-Select */}
            {(activeDisplayView === 'individual_teacher' || activeDisplayView === 'individual_class') && (() => {
              const isTeacherView = activeDisplayView === 'individual_teacher';
              const allItems = isTeacherView
                ? teachers.map(t => ({ id: t.id, label: t.name }))
                : [...classes]
                    .sort((a,b) => a.grade !== b.grade ? a.grade - b.grade : (a.section||0)-(b.section||0))
                    .map(c => ({ id: c.id, label: c.name || `${c.grade}/${c.section}` }));
              const filteredItems = allItems.filter(item =>
                item.label.toLowerCase().includes(individualSearchQuery.toLowerCase())
              );
              return (
                <div className="mt-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2 space-y-3">
                  {/* Row: icon + label + search + dropdown button */}
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      {isTeacherView ? <User size={20} className="text-[#655ac1]" /> : <LayoutGrid size={20} className="text-[#655ac1]" />}
                    </div>
                    <p className="text-xs font-black text-slate-500 shrink-0">
                      {isTeacherView ? 'اختر معلماً أو أكثر لعرض جداولهم' : 'اختر فصلاً أو أكثر لعرض جداولها'}
                    </p>
                    <div className="flex-1 relative">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                          type="text"
                          placeholder={isTeacherView ? 'ابحث عن معلم...' : 'ابحث عن فصل...'}
                          value={individualSearchQuery}
                          onChange={e => { setIndividualSearchQuery(e.target.value); setShowIndividualDropdown(true); }}
                          onFocus={() => setShowIndividualDropdown(true)}
                          onBlur={() => setTimeout(() => setShowIndividualDropdown(false), 180)}
                          className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#8779fb]/30 focus:border-[#655ac1] transition-all"
                        />
                        {showIndividualDropdown && filteredItems.length > 0 && (
                          <div className="absolute top-full right-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                            {/* Select all / Clear all bar */}
                            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                              <button
                                onMouseDown={e => { e.preventDefault(); setSelectedDisplayIds(allItems.map(i => i.id)); }}
                                className="text-xs font-black text-[#655ac1] hover:underline"
                              >
                                اختيار الكل
                              </button>
                              <button
                                onMouseDown={e => { e.preventDefault(); setSelectedDisplayIds([]); }}
                                className="text-xs font-black text-slate-400 hover:text-red-500 hover:underline"
                              >
                                إلغاء الكل
                              </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {filteredItems.map(item => {
                              const isSelected = selectedDisplayIds.includes(item.id);
                              return (
                                <button
                                  key={item.id}
                                  onMouseDown={e => {
                                    e.preventDefault();
                                    if (isSelected) {
                                      setSelectedDisplayIds(prev => prev.filter(id => id !== item.id));
                                    } else {
                                      setSelectedDisplayIds(prev => [...prev, item.id]);
                                    }
                                  }}
                                  className={`w-full text-right px-4 py-2.5 text-sm font-bold transition-colors flex items-center justify-between ${
                                    isSelected
                                      ? 'bg-[#f0edff] text-[#655ac1]'
                                      : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                                  }`}
                                >
                                  <span>{item.label}</span>
                                  <Check size={14} className={`shrink-0 ${ isSelected ? 'opacity-100 text-[#655ac1]' : 'opacity-0' }`} />
                                </button>
                              );
                            })}
                            </div>
                          </div>
                        )}
                        {showIndividualDropdown && filteredItems.length === 0 && (
                          <div className="absolute top-full right-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-3 text-center text-xs text-slate-400 font-medium">
                            {allItems.every(i => selectedDisplayIds.includes(i.id)) ? 'تم اختيار الجميع' : 'لا توجد نتائج مطابقة'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Teacher Sort Controls — shown for teacher views */}
            {showTeacherSortControls && (
              <div className="mt-3 flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in">
                <div className="shrink-0">
                  <Users size={20} className="text-[#655ac1]" />
                </div>
                <p className="text-xs font-black text-slate-500 shrink-0">ترتيب عرض المعلمين</p>
                <div className="flex gap-2 flex-wrap flex-1">
                    {([
                      { id: 'alpha', label: 'أبجدي' },
                      { id: 'specialization', label: 'التخصص' },
                      { id: 'custom', label: 'مخصص' },
                    ] as { id: TeacherSortMode; label: string }[]).map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setTeacherSortMode(opt.id);
                          if (opt.id === 'custom') {
                            const currentOrder = teacherCustomOrder.length > 0
                              ? teacherCustomOrder
                              : teachers.map(t => t.id);
                            setPendingOrder(currentOrder);
                            setShowSortModal(true);
                          } else if (opt.id === 'specialization') {
                            // Filter specializations to only show those used by teachers
                            const usedSpecIds = new Set(teachers.map(t => t.specializationId));
                            const relevantSpecs = specializations.filter(s => usedSpecIds.has(s.id));
                            
                            const currentSpecOrder = specializationCustomOrder.length > 0
                              ? specializationCustomOrder
                              : relevantSpecs.map(s => s.id);
                            
                            // Ensure only valid specs are in the order (in case data changed)
                            const validOrder = currentSpecOrder.filter(id => usedSpecIds.has(id));
                            // Add any missing new ones
                            relevantSpecs.forEach(s => {
                                if(!validOrder.includes(s.id)) validOrder.push(s.id);
                            });

                            setPendingSpecOrder(validOrder);
                            setShowSpecSortModal(true);
                          }
                        }}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${
                          teacherSortMode === opt.id
                            ? 'bg-white border-[#8779fb] text-[#655ac1]'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-[#8779fb]/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                    {teacherSortMode === 'custom' && teacherCustomOrder.length > 0 && (
                      <button
                        onClick={() => { setPendingOrder([...teacherCustomOrder]); setShowSortModal(true); }}
                        className="px-4 py-1.5 rounded-xl text-xs font-black border-2 border-[#655ac1] text-[#655ac1] bg-white hover:bg-[#e5e1fe] transition-all"
                      >
                        تعديل الترتيب
                      </button>
                    )}
                    {teacherSortMode === 'specialization' && specializationCustomOrder.length > 0 && (
                      <button
                        onClick={() => { setPendingSpecOrder([...specializationCustomOrder]); setShowSpecSortModal(true); }}
                        className="px-4 py-1.5 rounded-xl text-xs font-black border-2 border-[#655ac1] text-[#655ac1] bg-white hover:bg-[#e5e1fe] transition-all"
                      >
                        تعديل ترتيب التخصصات
                      </button>
                    )}
                </div>
              </div>
            )}
        </div>
      )}

      {/* ══════ Main Content Area ══════ */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[500px] relative">



          {/* State: No Schedule Alert */}
          {!hasSchedule && !isGenerating && !activeDisplayView && (
              <div className="flex flex-col items-center justify-center h-full min-h-[480px] p-8">
                  <div className="flex flex-col items-center text-center max-w-md animate-in zoom-in duration-300">
                      <CalendarDays size={64} className="text-[#655ac1] mb-7" strokeWidth={1.3} />
                      <h4 className="text-2xl font-black text-slate-800 mb-3">لم يتم إنشاء الجدول بعد</h4>
                      <p className="text-sm font-medium text-slate-500 mb-8 whitespace-nowrap">
                          اضغط على زر <span className="text-[#655ac1] font-bold">إنشاء جدول الحصص</span> لبدء توزيع الحصص بناءً على البيانات والقيود المدخلة
                      </p>
                      <button
                          onClick={handleValidation}
                          className="px-8 py-3.5 bg-[#655ac1] text-white rounded-2xl font-bold hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/30 transition-all active:scale-95 hover:scale-[1.03] flex items-center gap-2.5 text-base"
                      >
                          <Play size={18} fill="currentColor" />
                          <span>إنشاء جدول الحصص</span>
                      </button>
                  </div>
              </div>
          )}

          {/* State: Generating Overlay - REMOVED (Handled by Modal) */}

          {/* Display View: PrintableSchedule inline */}
          {activeDisplayView && (
            (() => {
              const needsId = activeDisplayView === 'individual_teacher' || activeDisplayView === 'individual_class';
              const isReady = !needsId || selectedDisplayIds.length > 0;
              if (!isReady) {
                return (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                      activeDisplayView === 'individual_teacher' ? 'bg-amber-50' : 'bg-indigo-50'
                    }`}>
                      {activeDisplayView === 'individual_teacher'
                        ? <User size={28} className="text-amber-400" />
                        : <LayoutGrid size={28} className="text-[#655ac1]" />}
                    </div>
                    <p className="text-sm font-bold">
                      {activeDisplayView === 'individual_teacher' ? 'ابحث عن معلم واختره من القائمة أعلاه' : 'ابحث عن فصل واختره من القائمة أعلاه'}
                    </p>
                  </div>
                );
              }
              // Build specialization names map
              const specNames: Record<string, string> = {};
              specializations.forEach(s => { specNames[s.id] = s.name; });
              // For individual views — render one table per selected id stacked
              if (needsId) {
                return (
                  <div className="p-4 space-y-6">
                    {selectedDisplayIds.map((id, idx) => (
                      <div key={id} style={{ zoom: 0.8 }}>
                        {idx > 0 && (
                          <div className="flex items-center gap-3 mb-8">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#a59bf0] to-transparent opacity-40"/>
                            <span className="text-xs font-black text-[#a59bf0] px-3 py-1 bg-[#f4f2ff] rounded-full border border-[#e0dcfb]">
                              ▼
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#a59bf0] to-transparent opacity-40"/>
                          </div>
                        )}
                        <InlineScheduleView
                          type={activeDisplayView}
                          settings={scheduleSettings}
                          teachers={teachers}
                          classes={classes}
                          subjects={subjects}
                          targetId={id}
                          teacherSortMode={teacherSortMode}
                          teacherCustomOrder={teacherCustomOrder}
                          specializationCustomOrder={specializationCustomOrder}
                          specializationNames={specNames}
                          onUpdateSettings={setScheduleSettings}
                        />
                      </div>
                    ))}
                  </div>
                );
              }
              return (
                <div className="p-4 h-full">
                  {activeDisplayView === 'general_teachers' && isManualMode && incompleteWaitingCount > 0 && !hideWaitingAlert && (
                    <div
                      onClick={() => setHideWaitingAlert(true)}
                      className="mb-4 flex items-center justify-between gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 cursor-pointer hover:bg-amber-100 transition-all"
                      title="انقر لإخفاء هذا التنبيه"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                        <span className="text-sm font-bold text-amber-700">
                          يوجد {incompleteWaitingCount} {incompleteWaitingCount === 1 ? 'معلم' : 'معلمين'} لم تكتمل حصص انتظارهم — اسحب البطاقات وأفلتها لإكمال التوزيع
                        </span>
                      </div>
                      <span className="text-xs text-amber-400 font-medium shrink-0">انقر للإخفاء</span>
                    </div>
                  )}
                  <InlineScheduleView
                    type={activeDisplayView}
                    settings={scheduleSettings}
                    teachers={teachers}
                    classes={classes}
                    subjects={subjects}
                    targetId={''}
                    teacherSortMode={teacherSortMode}
                    teacherCustomOrder={teacherCustomOrder}
                    specializationCustomOrder={specializationCustomOrder}
                    specializationNames={specNames}
                    onUpdateSettings={setScheduleSettings}
                    onEditRequest={activeDisplayView === 'general_teachers' ? () => {
                      setActiveDisplayView(null);
                      setActiveView('grid');
                    } : undefined}
                  />
                </div>
              );
            })()
          )}

          {/* Grid View (default when no display view selected) */}
          {hasSchedule && !activeDisplayView && activeView === 'grid' && (
              <InlineScheduleView
                  type="general_teachers"
                  settings={scheduleSettings}
                  teachers={teachers}
                  classes={classes}
                  subjects={subjects}
                  teacherSortMode={teacherSortMode}
                  teacherCustomOrder={teacherCustomOrder}
                  specializationCustomOrder={specializationCustomOrder}
                  specializationNames={Object.fromEntries(specializations.map(s => [s.id, s.name]))}
                  onUpdateSettings={setScheduleSettings}
                  interactive
              />
          )}

          {/* Custom Teacher View */}
          {hasSchedule && !activeDisplayView && activeView === 'individual' && (
               <div className="p-6">
                    <CustomTeacherView 
                        teachers={teachers}
                        subjects={subjects}
                        classes={classes}
                        settings={scheduleSettings}
                        onUpdateSettings={setScheduleSettings}
                        activeSchoolId={sharedSchoolMode === 'separated' ? activeSchoolId : 'main'}
                        specializationNames={Object.fromEntries(specializations.map(s => [s.id, s.name]))}
                    />
                </div>
          )}
      </div>

      <SubjectAbbreviationsModal 
          isOpen={showAbbreviationsModal}
          onClose={() => setShowAbbreviationsModal(false)}
          subjects={subjects}
          settings={scheduleSettings}
          onSave={(abbreviations) => {
              setScheduleSettings({
                  ...scheduleSettings,
                  subjectAbbreviations: abbreviations
              });
          }}
      />

      <ConflictModal 
        isOpen={showConflictReport}
        onClose={() => setShowConflictReport(false)}
        warnings={validationWarnings}
        onContinue={handleContinueWithBypass}
        isGenerating={isGenerating}
        onNavigateTo={handleNavigateTo}
      />

      <WaitingModal 
        isOpen={showWaitingModal}
        onClose={() => setShowWaitingModal(false)}
        config={scheduleSettings.substitution}
        onSave={(cfg) => setScheduleSettings(prev => ({ ...prev, substitution: cfg }))}
        onDistribute={handleDistributeWaiting}
      />

      {/* Custom Teacher Sort Modal */}
      {showSortModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#e5e1fe] rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-[#655ac1]" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800">ترتيب المعلمين</h3>
                  <p className="text-xs text-slate-500">اسحب وغير ترتيب المعلمين كما تريد</p>
                </div>
              </div>
              <button onClick={() => setShowSortModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {pendingOrder.map((teacherId, idx) => {
                const teacher = teachers.find(t => t.id === teacherId);
                if (!teacher) return null;
                const specName = specializations.find(s => s.id === teacher.specializationId)?.name || '—';
                return (
                  <div 
                    key={teacherId} 
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', idx.toString());
                        e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'));
                        if (isNaN(sourceIdx) || sourceIdx === idx) return;
                        
                        const newOrder = [...pendingOrder];
                        const [movedItem] = newOrder.splice(sourceIdx, 1);
                        newOrder.splice(idx, 0, movedItem);
                        setPendingOrder(newOrder);
                    }}
                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-[#8779fb] hover:shadow-md transition-all cursor-move group"
                  >
                    <GripVertical size={20} className="text-slate-300 group-hover:text-[#655ac1]" />
                    <span className="w-6 h-6 rounded-lg bg-[#e5e1fe] text-[#655ac1] text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{teacher.name}</p>
                      <p className="text-[10px] text-slate-400">{specName}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowSortModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
              >إلغاء</button>
              <button
                onClick={() => {
                  setTeacherCustomOrder(pendingOrder);
                  setTeacherSortMode('custom');
                  setShowSortModal(false);
                }}
                className="flex-1 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#655ac1]/20 transition-all"
              >اعتماد الترتيب</button>
            </div>
          </div>
        </div>
      )}

      {showSpecSortModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#e5e1fe] rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-[#655ac1]" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800">ترتيب التخصصات</h3>
                  <p className="text-xs text-slate-500">اسحب وغير ترتيب التخصصات كما تريد</p>
                </div>
              </div>
              <button onClick={() => setShowSpecSortModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {pendingSpecOrder.map((specId, idx) => {
                const spec = specializations.find(s => s.id === specId);
                // Even though filtered earlier, ensure display logic handles potentially missing specs gracefully
                if (!spec) return null;
                return (
                  <div 
                    key={specId} 
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', idx.toString());
                        e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'));
                        if (isNaN(sourceIdx) || sourceIdx === idx) return;
                        
                        const newOrder = [...pendingSpecOrder];
                        const [movedItem] = newOrder.splice(sourceIdx, 1);
                        newOrder.splice(idx, 0, movedItem);
                        setPendingSpecOrder(newOrder);
                    }}
                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-[#8779fb] hover:shadow-md transition-all cursor-move group"
                  >
                    <GripVertical size={20} className="text-slate-300 group-hover:text-[#655ac1]" />
                    <span className="w-6 h-6 rounded-lg bg-[#e5e1fe] text-[#655ac1] text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{spec.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowSpecSortModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
              >إلغاء</button>
              <button
                onClick={() => {
                  setSpecializationCustomOrder(pendingSpecOrder);
                  setTeacherSortMode('specialization');
                  setShowSpecSortModal(false);
                }}
                className="flex-1 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#655ac1]/20 transition-all"
              >اعتماد الترتيب</button>
            </div>
          </div>
        </div>
      )}

      <GenerationStatusModal
          isOpen={showGenerationModal}
          onClose={() => setShowGenerationModal(false)}
          onStart={startGeneration}
          status={generationStatus}
          stats={generationStats}
          progress={generationProgress}
      />

      {/* Missing Data Alert Modal */}
      {missingDataAlert && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                          <AlertTriangle size={24} />
                      </div>
                      <div>
                          <h3 className="font-black text-rose-800 text-lg">{missingDataAlert.title}</h3>
                          <p className="text-sm font-medium text-rose-600 mt-1">إجراء مطلوب قبل المتابعة</p>
                      </div>
                  </div>
                  
                  <div className="p-6">
                      <p className="text-slate-600 font-medium leading-relaxed">
                          {missingDataAlert.message}
                      </p>
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
                      <button 
                          onClick={() => setMissingDataAlert(null)}
                          className="px-6 py-2.5 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all shadow-md shadow-rose-200"
                      >
                          حسناً، فهمت
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Audit Log Panel */}
      <AuditLogPanel 
          isOpen={showAuditLog}
          onClose={() => setShowAuditLog(false)}
          logs={scheduleSettings.auditLogs || []}
          onChangeLogs={(auditLogs) => setScheduleSettings(prev => ({ ...prev, auditLogs }))}
          />
          
        {/* Placeholder Modals for New Features */}
        {showWaitingSettings && (() => {
            const timing = getTimingConfig();
            const periodCountsValues = Object.values(timing.periodCounts || {}) as number[];
            const weekDays = timing.activeDays.length;
            const periodsPerDay = Math.max(...periodCountsValues);
            const warnings = validateAllConstraints(
                scheduleSettings,
                subjects,
                teachers,
                weekDays,
                periodsPerDay,
                timing.activeDays,
                classes.length,
                schoolInfo.sharedSchools
            );
            return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-50 rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col relative animate-in zoom-in-95 overflow-hidden max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 bg-white border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-gradient-to-br from-[#655ac1] to-[#8779fb] rounded-2xl flex items-center justify-center shadow-lg shadow-[#655ac1]/30">
                                    <Settings size={22} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">إعدادات الانتظار</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">إعدادات توزيع حصص الانتظار على المعلمين</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowWaitingSettings(false)}
                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        {/* Content */}
                        <div className="overflow-y-auto p-6">
                            <SubstitutionTab
                                teachers={teachers}
                                config={scheduleSettings.substitution}
                                weekDays={weekDays}
                                periodsPerDay={periodsPerDay}
                                warnings={warnings}
                                onChange={s => {
                                    const currentMethod = scheduleSettings.substitution?.method;
                                    const newMethod = s.method;
                                    if (currentMethod === 'manual' && newMethod !== 'manual') {
                                        const hasPlacedWaiting = Object.values(scheduleSettings.timetable || {}).some(
                                            (slot: any) => slot.type === 'waiting'
                                        );
                                        if (hasPlacedWaiting) {
                                            setPendingSubstitutionConfig(s);
                                            setShowMethodChangeConfirm(true);
                                            return;
                                        }
                                    }
                                    setScheduleSettings(prev => ({ ...prev, substitution: s }));
                                }}
                            />
                        </div>
                        {/* Footer */}
                        <div className="p-4 bg-white border-t border-slate-100 shrink-0 flex justify-end">
                            <button
                                onClick={() => setShowWaitingSettings(false)}
                                className="px-8 py-3 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 transition-all"
                            >
                                حفظ وإغلاق
                            </button>
                        </div>
                    </div>
                </div>
            );
        })()}

        <ScheduleManagerModal 
            isOpen={showManageSchedules}
            onClose={() => setShowManageSchedules(false)}
            settings={scheduleSettings}
            onUpdateSettings={setScheduleSettings}
            currentTimetable={scheduleSettings.timetable}
        />

        <PrintOptionsModal
            isOpen={showPrintOptions}
            onClose={() => setShowPrintOptions(false)}
            settings={hasSharedSchools && generationMode === 'separate'
              ? { ...scheduleSettings, timetable: getTimetableForSchool(selectedExportSchoolId) }
              : scheduleSettings
            }
            teachers={teachers}
            classes={classes}
            subjects={subjects}
            schoolInfo={schoolInfo}
        />

        <SendScheduleModal
            isOpen={showSendSchedule}
            onClose={() => setShowSendSchedule(false)}
            teachers={teachers}
            classes={classes}
            schoolName={hasSharedSchools && generationMode === 'separate' ? getSchoolName(selectedExportSchoolId) : undefined}
        />

        {/* ══════ تأكيد تغيير طريقة التوزيع من يدوي ══════ */}
        {showMethodChangeConfirm && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                            <AlertTriangle size={20} className="text-rose-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800">تغيير طريقة التوزيع</h3>
                            <p className="text-xs text-slate-500 mt-0.5">سيتم حذف جميع حصص الانتظار التي تم توزيعها يدوياً</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
                        لديك حصص انتظار موزّعة يدوياً. تغيير الطريقة سيحذفها نهائياً. هل تريد المتابعة؟
                    </p>
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={() => { setShowMethodChangeConfirm(false); setPendingSubstitutionConfig(null); }}
                            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={() => {
                                // حذف جميع حصص الانتظار وتطبيق الطريقة الجديدة
                                const newTimetable = Object.fromEntries(
                                    Object.entries(scheduleSettings.timetable || {}).filter(
                                        ([, slot]: any) => slot.type !== 'waiting'
                                    )
                                );
                                setScheduleSettings(prev => ({
                                    ...prev,
                                    substitution: pendingSubstitutionConfig,
                                    timetable: newTimetable
                                }));
                                setHideWaitingAlert(false);
                                setShowMethodChangeConfirm(false);
                                setPendingSubstitutionConfig(null);
                            }}
                            className="px-5 py-2.5 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all"
                        >
                            حذف والمتابعة
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* ══════ اختيار المدرسة للتصدير/الطباعة/الإرسال (وضع منفصل) ══════ */}
        {separateSchoolPicker && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col animate-in zoom-in-95 overflow-hidden">
                    <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <School size={24} className="text-[#655ac1] shrink-0" />
                            <div>
                                <h3 className="font-black text-slate-800 text-lg">اختر المدرسة</h3>
                                <p className="text-sm font-medium text-slate-500">
                                    {separateSchoolPicker.action === 'print' && 'معاينة وطباعة جدول المدرسة'}
                                    {separateSchoolPicker.action === 'xml' && 'تصدير XML لجدول المدرسة'}
                                    {separateSchoolPicker.action === 'excel' && 'تصدير Excel لجدول المدرسة'}
                                    {separateSchoolPicker.action === 'send' && 'إرسال جدول المدرسة'}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setSeparateSchoolPicker(null)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6 space-y-3">
                        {['main', ...(schoolInfo.sharedSchools || []).map(s => s.id)].map(sid => (
                            <button
                                key={sid}
                                onClick={() => setSelectedExportSchoolId(sid)}
                                className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl border-2 font-bold text-sm transition-all ${
                                    selectedExportSchoolId === sid
                                        ? 'border-[#655ac1] bg-white text-[#655ac1]'
                                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                {selectedExportSchoolId === sid
                                    ? <Check size={18} className="text-[#655ac1] shrink-0" />
                                    : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300 shrink-0" />
                                }
                                {getSchoolName(sid)}
                            </button>
                        ))}
                    </div>
                    <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
                        <button
                            onClick={() => setSeparateSchoolPicker(null)}
                            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-all"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={executeSeparateAction}
                            className="px-6 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 transition-all"
                        >
                            {separateSchoolPicker.action === 'print' && 'معاينة وطباعة'}
                            {separateSchoolPicker.action === 'xml' && 'تصدير XML'}
                            {separateSchoolPicker.action === 'excel' && 'تصدير Excel'}
                            {separateSchoolPicker.action === 'send' && 'إرسال'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* ══════ Toast Notification ══════ */}
        {toast && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4">
                <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl font-bold text-sm ${
                    toast.type === 'success' ? 'bg-emerald-500 text-white' :
                    toast.type === 'error' ? 'bg-rose-500 text-white' :
                    'bg-blue-500 text-white'
                }`}>
                    {toast.type === 'success' ? <CheckCircle size={20} /> :
                     toast.type === 'error' ? <AlertCircle size={20} /> :
                     <Info size={20} />}
                    {toast.message}
                </div>
            </div>
        )}

      </div>
    );
};

export default Step9Schedule;
