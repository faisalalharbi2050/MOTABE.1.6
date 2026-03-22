import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
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
  FileText,
  BookOpen,
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
  const [sharedSchoolMode, setSharedSchoolMode] = useState<'separated' | 'merged'>('separated');
  const [activeSchoolId, setActiveSchoolId] = useState<string>('main');
  const [missingDataAlert, setMissingDataAlert] = useState<{title: string, message: string} | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showAbbreviationsModal, setShowAbbreviationsModal] = useState(false);
  
  // NEW: Toolbar Enhancements States
  const [isScheduleLocked, setIsScheduleLocked] = useState(false);
  const [showWaitingSettings, setShowWaitingSettings] = useState(false);
  const [showManageSchedules, setShowManageSchedules] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [showSendSchedule, setShowSendSchedule] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);

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

            // In separated mode, only generate for the active school
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
                (progress) => setGenerationProgress(progress), // Update Progress
                assignments, // Pass the actual assignments
                isBypassingConflicts,
                sharedSchoolMode === 'separated' ? scheduleSettings.timetable : undefined
            );

            // If merging timetable for separated schools, keep existing timetable for other schools
            const existingTimetable = sharedSchoolMode === 'separated' ? (scheduleSettings.timetable || {}) : {};
            const mergedTimetable = { ...existingTimetable, ...timetable };

            // Auto-save new schedule to savedSchedules
            const prevSaved = scheduleSettings.savedSchedules || [];
            const newId = `schedule-${Date.now()}`;
            const autoScheduleNumber = prevSaved.length + 1;
            const newSavedEntry = {
                id: newId,
                name: `جدول رقم ${autoScheduleNumber}`,
                createdAt: new Date().toISOString(),
                createdBy: 'النظام',
                timetable: JSON.parse(JSON.stringify(mergedTimetable)),
            };
            const updatedSaved = [newSavedEntry, ...prevSaved].slice(0, 10);

            setScheduleSettings({
                ...scheduleSettings,
                timetable: mergedTimetable,
                savedSchedules: updatedSaved,
                activeScheduleId: newId,
            });
            setGenerationStatus('success');
            setGenerationProgress(100);
            
            // Auto close after success? Or let user close.
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

        setScheduleSettings({ ...newSettings, timetable: newTimetable });
        showToast("تم إنشاء وتوزيع حصص الانتظار بنجاح", "success");
    } catch (error) {
        console.error("Error distributing waiting:", error);
        showToast("حدث خطأ أثناء إنشاء حصص الانتظار", "error");
    }
  };

  const handleXMLExport = () => {
    const xml = generateExtensionXML(scheduleSettings.timetable || {}, teachers, subjects, classes, schoolInfo);
    downloadFile(xml, `schedule_${schoolInfo.schoolName}.xml`, 'text/xml');
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="space-y-6 pb-20">

      {/* ══════ Header ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>

          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <Calendar size={36} strokeWidth={1.8} className="text-[#655ac1]" />
             إدارة الجدول
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إدارة وإعداد جداول الحصص والانتظار عبر واجهة تفاعلية وسلسة</p>
          
          {hasSharedSchools && (
              <div className="mt-6 flex flex-col md:flex-row items-start md:items-center gap-4 relative z-10 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-700 font-bold">
                      <Share2 size={18} className="text-[#655ac1]" />
                      <span>نظام المدارس المشتركة:</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm shrink-0">
                          <button 
                              onClick={() => setSharedSchoolMode('separated')}
                              className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${sharedSchoolMode === 'separated' ? 'bg-[#655ac1] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                              جدولة مستقلة (ينصح به)
                          </button>
                          <button 
                              onClick={() => setSharedSchoolMode('merged')}
                              className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${sharedSchoolMode === 'merged' ? 'bg-[#655ac1] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                              دمج الجداول
                          </button>
                      </div>
                      
                      {sharedSchoolMode === 'separated' && (
                          <div className="flex-1 min-w-[200px]">
                              <select
                                  value={activeSchoolId}
                                  onChange={(e) => setActiveSchoolId(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#655ac1]/20 focus:border-[#655ac1] transition-all text-sm font-bold text-slate-700"
                              >
                                  <option value="main">{schoolInfo.schoolName || 'المدرسة الرئيسية'}</option>
                                  {schoolInfo.sharedSchools.map(school => (
                                      <option key={school.id} value={school.id}>{school.name}</option>
                                  ))}
                              </select>
                          </div>
                      )}
                  </div>
              </div>
          )}
      </div>

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
                <span>{isGenerating ? 'جاري البناء...' : 'إنشاء الجدول'}</span>
            </button>
            
            <div className="w-px h-6 bg-slate-200 mx-2"></div>
            
            <div className="relative">
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
                            الجدول العام
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
                            معلمين متعددين
                        </button>
                    </div>
                )}
            </div>
            
            <div className="w-px h-6 bg-slate-200 mx-2"></div>
            
             <button 
               title={isScheduleLocked ? "فك الجدول" : "قفل الجدول"}
               onClick={() => setIsScheduleLocked(!isScheduleLocked)}
               className={`flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 px-6 py-3 rounded-xl font-bold transition-all hover:border-[#8779fb] ${isScheduleLocked ? 'text-rose-500' : 'text-slate-700'}`}
             >
               {isScheduleLocked ? <Lock size={18} /> : <Unlock size={18} className="text-rose-500" />}
               <span className="hidden md:inline">{isScheduleLocked ? 'فك الجدول' : 'قفل للجدول'}</span>
             </button>
          </div>

          <div className="flex-1"></div>
        </div>

        {/* Secondary Toolbar (Management and Logs) */}
        <div className="flex justify-between items-center bg-white/60 backdrop-blur-md rounded-2xl py-2 px-3 shadow-sm border border-slate-200">
            <div className="flex gap-2">
                 <button 
                   onClick={() => setShowWaitingSettings(true)}
                   title="إعدادات الانتظار"
                   className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb]"
                 >
                   <Settings size={18} className="text-[#8779fb]" />
                   <span>إعدادات الانتظار</span>
                 </button>
                 
                 <button 
                   onClick={() => {
                       if (!hasSchedule) {
                           setMissingDataAlert({
                               title: "لم يتم إنشاء جدول الحصص",
                               message: "يجب أولاً إنشاء جدول الحصص باستخدام زر \"التوليد الذكي للجدول\"، ثم قفله قبل البدء بإنشاء جدول الانتظار."
                           });
                           return;
                       }
                       if (!isScheduleLocked) {
                           setMissingDataAlert({
                               title: "الجدول غير مقفل",
                               message: "يجب قفل جدول الحصص أولاً قبل إنشاء الانتظار لتجنب أي تعارضات مستقبلية. اضغط على زر \"قفل الجدول\" ثم أعد المحاولة."
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
                       // تنفيذ التوزيع مباشرةً بالإعدادات الحالية
                       handleDistributeWaiting(scheduleSettings.substitution);
                   }}
                   title="إنشاء الانتظار"
                   className="flex items-center gap-2 bg-[#8779fb] hover:bg-[#7668ea] text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-[#8779fb]/20 transition-all hover:scale-105 active:scale-95"
                 >
                   <CalendarClock size={18} />
                   <span>إنشاء الانتظار</span>
                 </button>
            </div>

            <div className="flex gap-2">
                 <button 
                    onClick={() => setShowManageSchedules(true)}
                    title="إدارة الجداول" 
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb]"
                 >
                   <Save size={18} className="text-[#655ac1]" />
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

      {/* ══════ View Selector ══════ */}
      {(() => {
        type DisplayViewType = 'general_teachers' | 'general_classes' | 'general_waiting' | 'individual_teacher' | 'individual_class';
        const viewOptions: Array<{
          id: DisplayViewType;
          title: string;
          icon: React.ReactNode;
        }> = [
          { id: 'general_teachers',  title: 'الجدول العام للمعلمين',  icon: <Users size={20} /> },
          { id: 'general_waiting',   title: 'الجدول العام للانتظار',  icon: <CalendarClock size={20} /> },
          { id: 'individual_teacher', title: 'جدول معلم',               icon: <User size={20} /> },
          { id: 'general_classes',   title: 'الجدول العام للفصول',    icon: <LayoutGrid size={20} /> },
          { id: 'individual_class',   title: 'جدول فصل',               icon: <BookOpen size={20} /> },
        ];

        return (
          <div className="mb-6">
            {/* Header — right-aligned, no box */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Table size={17} className="text-[#655ac1]" />
                <span className="text-base font-black text-slate-700">عرض الجداول</span>
              </div>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Option Cards — rectangular */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {viewOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setActiveDisplayView(opt.id);
                    setSelectedDisplayIds([]);
                    setIndividualSearchQuery('');
                    setShowIndividualDropdown(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 font-bold text-sm transition-all duration-200 ${
                    activeDisplayView === opt.id
                      ? 'border-[#8779fb] bg-white text-[#655ac1] shadow-sm scale-[1.02]'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#8779fb]/50 hover:bg-slate-100 hover:text-[#655ac1]'
                  }`}
                >
                  <span className="shrink-0 text-[#655ac1]">
                    {opt.icon}
                  </span>
                  <span className="text-right leading-tight">{opt.title}</span>
                </button>
              ))}
            </div>

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
                    <div className="w-9 h-9 rounded-xl bg-[#e5e1fe] flex items-center justify-center shrink-0">
                      {isTeacherView ? <User size={18} className="text-[#655ac1]" /> : <BookOpen size={18} className="text-[#655ac1]" />}
                    </div>
                    <div className="flex-1 relative">
                      <p className="text-xs font-black text-slate-500 mb-1.5">
                        {isTeacherView ? 'اختر معلماً أو أكثر لعرض جداولهم' : 'اختر فصلاً أو أكثر لعرض جداولها'}
                      </p>
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
            {(activeDisplayView === 'general_teachers' || activeDisplayView === 'general_waiting') && (
              <div className="mt-3 flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in">
                <div className="w-9 h-9 rounded-xl bg-[#e5e1fe] flex items-center justify-center shrink-0">
                  <Users size={18} className="text-[#655ac1]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-slate-500 mb-2">ترتيب عرض المعلمين</p>
                  <div className="flex gap-2 flex-wrap">
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
              </div>
            )}
          </div>
        );
      })()}

      {/* ══════ Main Content Area ══════ */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[500px] relative">



          {/* State: No Schedule Alert */}
          {!hasSchedule && !isGenerating && !activeDisplayView && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                  <div className="w-full max-w-2xl bg-amber-50 border-r-4 border-amber-500 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-in zoom-in duration-300">
                      <div className="flex items-center gap-4 text-center sm:text-right">
                          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0 mx-auto sm:mx-0">
                              <Sparkles size={24} />
                          </div>
                          <div>
                              <h4 className="text-lg font-black text-slate-800 mb-1">لم يتم إنشاء الجدول بعد</h4>
                              <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                  اضغط على زر "التوليد الذكي للجدول" لبدء عملية التوزيع الآلي للحصص بناءً على القيود والبيانات المدخلة
                              </p>
                          </div>
                      </div>
                      <button 
                          onClick={handleValidation}
                          className="px-6 py-3 bg-[#655ac1] text-white rounded-xl font-bold hover:bg-[#5448a8] shadow-lg shadow-[#655ac1]/20 transition-all active:scale-95 flex items-center gap-2 shrink-0"
                      >
                          <Play size={18} fill="currentColor" />
                          <span>التوليد الذكي للجدول</span>
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
                        : <MonitorPlay size={28} className="text-indigo-400" />}
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
                        />
                      </div>
                    ))}
                  </div>
                );
              }
              return (
                <div className="p-4 h-full">
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
                  />
                </div>
              );
            })()
          )}

          {/* Grid View (default when no display view selected) */}
          {hasSchedule && !activeDisplayView && activeView === 'grid' && (
              <ScheduleGrid 
                  teachers={teachers}
                  subjects={subjects}
                  classes={classes}
                  settings={scheduleSettings}
                  onUpdateSettings={setScheduleSettings}
                  activeSchoolId={sharedSchoolMode === 'separated' ? activeSchoolId : 'main'} 
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
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">تخصيص طريقة التوزيع وسقوف حصص الانتظار</p>
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
                                onChange={s => setScheduleSettings(prev => ({ ...prev, substitution: s }))}
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
            settings={scheduleSettings}
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
        />

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
