import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Eye, Settings, Calendar, Download, Send, Printer,
  CheckCircle, AlertTriangle, Shield, Clock, Plus, Trash2, Edit,
  RefreshCw, BarChart3, MessageSquare, ChevronDown, ChevronUp,
  GripVertical, Copy, Search, Filter, X, Save, AlertCircle,
  UserCheck, UserX, Info, Bell, Zap, FileText, Check
} from 'lucide-react';
import {
  SchoolInfo, Teacher, Admin, ScheduleSettingsData, Phase,
  DutyScheduleData, DutySettings, DutyDayAssignment, DutyStaffAssignment,
  DutyStaffExclusion, DutyReportRecord, TimingConfig
} from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

import {
  DAYS, DAY_NAMES,
  getTimingConfig, hasDutyTimingData,
  getAvailableStaffForDuty,
  canSuggestExcludeTeachers, getSuggestedDutyCountPerDay,
  generateSmartDutyAssignment, validateDutyGoldenRule
} from '../utils/dutyUtils';

import DutyScheduleBuilder from './duty/DutyScheduleBuilder';
import AcademicYearPopup from './duty/AcademicYearPopup';
import DutySettingsPage from './duty/DutySettingsPage';
import DutyMonitoringModal from './duty/DutyMonitoring';
import DutyPrintModal from './duty/modals/DutyPrintModal';
import DutyMessagingModal from './duty/modals/DutyMessagingModal';
import DutyReportsModal from './duty/modals/DutyReportsModal';
import DutyManageSchedulesModal from './duty/modals/DutyManageSchedulesModal';
import DutyCreateScheduleModal from './duty/modals/DutyCreateScheduleModal';

// Provide default data if none exists
const getDefaultDutyData = (): DutyScheduleData => ({
  exclusions: [],
  settings: {
    excludeVicePrincipals: true,
    excludeGuards: true,
    autoExcludeTeachersWhen5Admins: false,
    suggestedCountPerDay: 4,
    reminderSendTime: '06:30',
    enableAutoAssignment: true,
    sharedSchoolMode: 'unified',
    autoSendLinks: false
  },
  dayAssignments: [],
  weekAssignments: [],
  reports: [],
  isApproved: false,
  savedSchedules: []
});

interface DailyDutyProps {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  teachers: Teacher[];
  admins: Admin[];
  scheduleSettings: ScheduleSettingsData;
}

const DailyDuty: React.FC<DailyDutyProps> = ({
  schoolInfo, setSchoolInfo, teachers, admins, scheduleSettings
}) => {
  // ===== State =====
  const [showAcademicPopup, setShowAcademicPopup] = useState(false);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
  
  // Modals state
  const [isMonitoringOpen, setIsMonitoringOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isManageSchedulesOpen, setIsManageSchedulesOpen] = useState(false);
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  
  // Confirmation state
  const [showGlobalDeleteConfirm, setShowGlobalDeleteConfirm] = useState(false);

  const [dutyData, setDutyData] = useState<DutyScheduleData>(() => {
    const saved = localStorage.getItem('duty_data_v1');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return {
          ...getDefaultDutyData(),
          ...parsed,
          reports: parsed.reports || [],
          exclusions: parsed.exclusions || [],
          dayAssignments: parsed.dayAssignments || [],
          savedSchedules: parsed.savedSchedules || []
        };
      } catch { /* ignore */ }
    }
    return getDefaultDutyData();
  });

  // ===== Persistence =====
  useEffect(() => {
    localStorage.setItem('duty_data_v1', JSON.stringify(dutyData));
  }, [dutyData]);

  // ===== Academic Year Check =====
  useEffect(() => {
    // Don't show academic popup when page is opened via a duty report reminder link
    const params = new URLSearchParams(window.location.search);
    const isReportLink = params.get('staffId') && params.get('day') && params.get('date');
    if (isReportLink) return;
    // Check if academic year and basic semester details are mapped
    if (!schoolInfo.academicYear || !(schoolInfo.semesters && schoolInfo.semesters.length > 0)) {
       setShowAcademicPopup(true);
    }
  }, [schoolInfo]);

  // ===== Toast =====
  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ===== Computed values =====
  const timing = useMemo(() => getTimingConfig(schoolInfo), [schoolInfo]);
  const availableStaff = useMemo(
    () => getAvailableStaffForDuty(teachers, admins, dutyData.exclusions, dutyData.settings),
    [teachers, admins, dutyData.exclusions, dutyData.settings]
  );
  
  const suggestExcludeTeachers = useMemo(() => canSuggestExcludeTeachers(admins), [admins]);
  const suggestedCount = useMemo(
    () => getSuggestedDutyCountPerDay(availableStaff.length, timing.activeDays?.length || 5),
    [availableStaff.length, timing]
  );
  const goldenRuleCheck = useMemo(
    () => validateDutyGoldenRule(dutyData.dayAssignments),
    [dutyData.dayAssignments]
  );

  // ===== Handlers =====
  const handleAutoAssign = () => {
    try {
      const { assignments, weekAssignments, alerts, newCounts } = generateSmartDutyAssignment(
        teachers, admins, dutyData.exclusions, dutyData.settings,
        scheduleSettings, schoolInfo, dutyData.dutyAssignmentCounts || {}, dutyData.settings.suggestedCountPerDay || suggestedCount
      );
      setDutyData(prev => ({ ...prev, dayAssignments: assignments, weekAssignments, dutyAssignmentCounts: newCounts }));
      showToast('تم التوزيع الذكي بنجاح', 'success');
      if (alerts.length > 0) {
         showToast(alerts[0], 'warning');
      }
    } catch(err) {
      showToast('حدث خطأ أثناء التوزيع', 'error');
    }
  };

  const handleApprove = () => {
    if (!goldenRuleCheck.valid) {
      showToast('يوجد مناوبون مكررون في أكثر من يوم - يُرجى مراجعة التوزيع', 'error');
      return;
    }
    setDutyData(prev => ({
      ...prev,
      isApproved: true,
      approvedAt: new Date().toISOString(),
    }));
    showToast('تم اعتماد جدول المناوبة', 'success');
  };

  const handleDeleteCurrentSchedule = () => {
    setDutyData(prev => ({
      ...prev,
      dayAssignments: [],
      weekAssignments: [],
      dutyAssignmentCounts: {},
      isApproved: false,
      activeScheduleId: undefined,
    }));
    setShowGlobalDeleteConfirm(false);
    showToast('تم حذف الجدول بالكامل', 'success');
  };

  // ===== Settings Page =====
  if (showSettingsPage) {
    return (
      <DutySettingsPage
        onBack={() => setShowSettingsPage(false)}
        teachers={teachers}
        admins={admins}
        totalStaffCount={availableStaff.length}
        exclusions={dutyData.exclusions}
        setExclusions={(excs) => setDutyData(prev => ({
          ...prev,
          exclusions: typeof excs === 'function' ? excs(prev.exclusions) : excs,
        }))}
        settings={dutyData.settings}
        setSettings={(s) => setDutyData(prev => ({
          ...prev,
          settings: typeof s === 'function' ? s(prev.settings) : s,
        }))}
        availableCount={availableStaff.length}
        suggestExclude={suggestExcludeTeachers}
        schoolInfo={schoolInfo}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ══════ Header ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>

        <div className="flex justify-between items-start relative z-10">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-[#e5e1fe] text-[#655ac1] rounded-xl"><Shield size={24} /></div>
              المناوبة اليومية
            </h3>
            <p className="text-slate-500 font-medium mt-2 mr-12 max-w-2xl text-sm leading-relaxed">
              إدارة المناوبة اليومية على الطلاب نهاية اليوم الدراسي بطريقة ذكية.
            </p>
          </div>
        </div>
      </div>

      {/* ══════ Toolbar / Action Bar ══════ */}
      <div className="flex flex-col gap-4 mb-6">
        {/* ROW 1 */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
          {/* Right Side */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSettingsPage(true)}
              className="flex items-center gap-2 bg-[#8779fb] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm shadow-[#8779fb]/20 hover:scale-105 active:scale-95"
            >
              <Settings size={18} className="text-white" />
              <span className="text-white">إعدادات المناوبة</span>
            </button>
            <button
              onClick={() => setIsCreateScheduleOpen(true)}
              className="flex items-center gap-2 bg-[#655ac1] text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-[#655ac1]/20 transition-all hover:scale-105 active:scale-95"
            >
              <Zap size={18} />
              <span>إنشاء الجدول</span>
            </button>
          </div>

          {/* Left Side */}
          <div className="flex flex-wrap items-center gap-2">
          </div>
        </div>

        {/* ROW 2 */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
           {/* Right Side */}
           <div className="flex flex-wrap items-center gap-2">
             <button
               onClick={() => setIsManageSchedulesOpen(true)}
               className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb] hover:text-[#655ac1]"
             >
               <Save size={18} className="text-[#8779fb]" />
               <span>إدارة الجداول</span>
             </button>
             <button
               onClick={() => setIsPrintOpen(true)}
               className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb] hover:text-[#655ac1]"
             >
               <Printer size={18} className="text-[#8779fb]" />
               <span>طباعة المناوبة</span>
             </button>
             <button
               onClick={() => setIsMessagingOpen(true)}
               className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb] hover:text-[#655ac1]"
             >
               <Send size={18} className="text-[#8779fb]" />
               <span>إرسال المناوبة</span>
             </button>
             <button
               onClick={() => setShowGlobalDeleteConfirm(true)}
               className="flex items-center gap-2 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-rose-300"
             >
               <Trash2 size={18} className="text-rose-500" />
               <span>حذف الجدول</span>
             </button>
           </div>

           {/* Left Side */}
           <div className="flex flex-wrap items-center gap-2">
             <button
               onClick={() => setIsMonitoringOpen(true)}
               className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb] hover:text-[#655ac1]"
             >
               <Eye size={18} className="text-[#8779fb]" />
               <span>المتابعة اليومية</span>
             </button>
             <button
               onClick={() => setIsReportsOpen(true)}
               className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#8779fb] hover:text-[#655ac1]"
             >
               <BarChart3 size={18} className="text-[#8779fb]" />
               <span>تقارير المناوبة</span>
             </button>
           </div>
        </div>
      </div>

      {/* Admin Suggestion Banner */}
      {suggestExcludeTeachers && !dutyData.settings.autoExcludeTeachersWhen5Admins && (
        <div className="bg-violet-50/50 border-2 border-[#8779fb]/30 rounded-2xl p-5 mb-6 flex items-start gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 bg-[#8779fb] h-full rounded-r-2xl"></div>
          <div className="w-10 h-10 rounded-xl bg-[#e5e1fe] flex items-center justify-center shrink-0">
            <Info size={22} className="text-[#655ac1]" />
          </div>
          <div className="flex-1">
            <p className="text-base font-black text-slate-800">
              يوجد 5 إداريين أو أكثر - يُقترح استثناء المعلمين من المناوبة
            </p>
            <p className="text-sm font-medium text-slate-500 mt-1">
              لتقليل العبء على المعلمين الممارسين للتدريس، ينصح بتفعيل الاستثناء للوصول إلى إدارة أفضل ومريحة للجميع في المناوبة. يمكنك تفعيل هذا الخيار من إعدادات الاستثناءات.
            </p>
          </div>
          <button
            onClick={() => {
              setDutyData(prev => ({
                ...prev,
                settings: { ...prev.settings, autoExcludeTeachersWhen5Admins: true },
              }));
              showToast('تم تفعيل استثناء المعلمين من المناوبة', 'success');
            }}
            className="shrink-0 px-6 py-2.5 bg-[#8779fb] hover:bg-[#655ac1] text-white text-sm font-bold rounded-xl transition-all shadow-md mt-auto mb-auto hover:scale-105 active:scale-95"
          >
            تفعيل التلقائي
          </button>
        </div>
      )}

      {/* Main Content Area - Schedule Viewer and Builder */}
      <div id="schedule-builder-section" className="mt-2">
         <DutyScheduleBuilder
            dutyData={dutyData}
            setDutyData={setDutyData}
            teachers={teachers}
            admins={admins}
            scheduleSettings={scheduleSettings}
            schoolInfo={schoolInfo}
            showToast={showToast}
          />
      </div>

      {/* ══════ Modals ══════ */}
       <DutyMonitoringModal
         isOpen={isMonitoringOpen}
         onClose={() => setIsMonitoringOpen(false)}
         dutyData={dutyData}
         setDutyData={setDutyData}
         schoolInfo={schoolInfo}
         showToast={showToast}
       />

       <DutyPrintModal
         isOpen={isPrintOpen}
         onClose={() => setIsPrintOpen(false)}
         dutyData={dutyData}
         schoolInfo={schoolInfo}
         showToast={showToast}
       />

       <DutyMessagingModal
         isOpen={isMessagingOpen}
         onClose={() => setIsMessagingOpen(false)}
         dutyData={dutyData}
         setDutyData={setDutyData}
         schoolInfo={schoolInfo}
         teachers={teachers}
         admins={admins}
         showToast={showToast}
       />

       <DutyManageSchedulesModal
         isOpen={isManageSchedulesOpen}
         onClose={() => setIsManageSchedulesOpen(false)}
         dutyData={dutyData}
         setDutyData={setDutyData}
         showToast={showToast}
       />

       <DutyReportsModal
         isOpen={isReportsOpen}
         onClose={() => setIsReportsOpen(false)}
         dutyData={dutyData}
         schoolInfo={schoolInfo}
         teachers={teachers}
         admins={admins}
         showToast={showToast}
       />

       <DutyCreateScheduleModal
         isOpen={isCreateScheduleOpen}
         onClose={() => setIsCreateScheduleOpen(false)}
         dutyData={dutyData}
         setDutyData={setDutyData}
         teachers={teachers}
         admins={admins}
         scheduleSettings={scheduleSettings}
         schoolInfo={schoolInfo}
         suggestedCount={suggestedCount}
         showToast={showToast}
         activeDaysCount={timing.activeDays?.length || 5}
         availableStaffCount={availableStaff.length}
       />

      {/* Academic Year Popup */}
      {showAcademicPopup && (
        <AcademicYearPopup
          schoolInfo={schoolInfo}
          setSchoolInfo={setSchoolInfo}
          onClose={() => setShowAcademicPopup(false)}
          showToast={showToast}
        />
      )}

       {/* Delete Confirmation Modal */}
       {showGlobalDeleteConfirm && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 text-center">
               <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Trash2 size={32} className="text-rose-500" />
               </div>
               <h2 className="text-xl font-black text-slate-800 mb-2">تأكيد حذف الجدول</h2>
               <p className="text-sm font-medium text-slate-500 leading-relaxed">
                 هل أنت متأكد من رغبتك في حذف الجدول الحالي بالكامل؟ سيتم هذا الإجراء ولاتمكن التراجع عنه، وسيتم حذفه من قائمة الجداول المحفوظة إذا كان محفوظاً مسبقاً.
               </p>
             </div>
             <div className="p-6 pt-0 flex gap-3">
               <button
                 onClick={() => setShowGlobalDeleteConfirm(false)}
                 className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
               >
                 تراجع
               </button>
               <button
                 onClick={handleDeleteCurrentSchedule}
                 className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
               >
                 نعم، احذف الجدول
               </button>
             </div>
           </div>
         </div>
       )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-xl border font-bold text-sm
            ${toast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : ''}
            ${toast.type === 'warning' ? 'bg-violet-50/50 text-indigo-800 border-[#e5e1fe]' : ''}
            ${toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : ''}
          `}>
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'warning' && <AlertTriangle size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyDuty;

