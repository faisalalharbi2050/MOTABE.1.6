import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react'; // For the lock UI
import { Phase, Teacher, Specialization, Subject, ClassInfo, Assignment, SchoolInfo, Message, CalendarEvent, DailyScheduleItem, SubscriptionInfo, Student, Admin, ScheduleSettingsData, EntityType } from './types';
import { INITIAL_SPECIALIZATIONS, INITIAL_SUBJECTS } from './constants';
import { migrateTeacherStructure } from './utils/migrateTeachers';
import { MessageArchiveProvider } from './components/messaging/MessageArchiveContext';
import ToastProvider from './components/ui/ToastProvider';

import Dashboard from './components/Dashboard';

import GeneralSettingsWizard from './components/wizard/GeneralSettingsWizard';
import BasicData from './components/wizard/BasicData'; // Import the new simple component
import Step1General from './components/wizard/steps/Step1General';
import Step3Subjects from './components/wizard/steps/Step3Subjects';
import Step4Classes from './components/wizard/steps/Step4Classes';
import Step5Students from './components/wizard/steps/Step5Students';
import Step6Teachers from './components/wizard/steps/Step6Teachers';
import Step7Admins from './components/wizard/steps/Step7Admins';
import Step9Schedule from './components/wizard/steps/Step9Schedule';
import TimingSettings from './components/settings/TimingSettings';
import ScheduleReports from './components/schedule/ScheduleReports';


import ManualAssignment from './components/ManualAssignment';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
// import ClassesAndWaiting from './components/ClassesAndWaiting'; // Removed
import DailySupervision from './components/DailySupervision';
import SupervisionSignaturePage from './components/supervision/SupervisionSignaturePage';
import DutySignaturePage from './components/duty/DutySignaturePage';
import DailyDuty from './components/DailyDuty';
import DailyWaiting from './components/DailyWaiting';
import Messages from './components/Messages';
import RolePermissions from './components/permissions/RolePermissions';
import SubscriptionContainer from './components/subscription/SubscriptionContainer';
import Support from './components/Support';

const App: React.FC = () => {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    entityType: EntityType.SCHOOL,
    schoolName: '',
    region: '',
    departments: [],
    phases: [Phase.ELEMENTARY],
    gender: 'بنين',
    educationalAgent: '',
    principal: '',
    // hasSecondSchool: false, // Removed from type, but checking if it causes issues. Type definition removed it? No, I kept it in type? Let me check type history.
    // sharedSchools: [] // kept
    sharedSchools: []
  });
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>(INITIAL_SPECIALIZATIONS);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [gradeSubjectMap, setGradeSubjectMap] = useState<Record<string, string[]>>({});
  const [phaseDepartmentMap, setPhaseDepartmentMap] = useState<Record<string, string>>({});
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettingsData>({
    subjectConstraints: [],
    teacherConstraints: [],
    meetings: [],
    substitution: { method: 'auto', maxTotalQuota: 24, maxDailyTotal: 5 }
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings_basic' | 'settings_timing' | 'settings_subjects' | 'settings_classes' | 'settings_teachers' | 'settings_students' | 'settings_admins' | 'manual' | 'classes_waiting' | 'schedule_reports' | 'supervision' | 'duty' | 'daily_waiting' | 'messages' | 'permissions' | 'subscription' | 'support'>(() => {
    // If the URL contains duty-report params, open the duty tab immediately (no re-render lag)
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('staffId') && p.get('staffName') && p.get('day') && p.get('date')) return 'duty';
    }
    return 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [subscriptionInitialTab, setSubscriptionInitialTab] = useState<'dashboard' | 'pricing' | 'invoices'>('dashboard');
  const [messagesInitialTab, setMessagesInitialTab] = useState<'compose' | 'archive' | 'templates' | 'dashboard' | 'subscriptions'>('compose');

  // Mock Data for Dashboard
  const [messages] = useState<Message[]>([
    { id: '1', sender: 'مدير المدرسة', recipient: 'المعلمون', content: 'يرجى تسليم الدرجات', timestamp: new Date().toISOString(), type: 'whatsapp', status: 'sent' },
    { id: '2', sender: 'الوكيل للشؤون التعليمية', recipient: 'الإداريون', content: 'اجتماع طارئ', timestamp: new Date(Date.now() - 3600000).toISOString(), type: 'sms', status: 'sent' },
    { id: '3', sender: 'الموجه الطلابي', recipient: 'أولياء الأمور', content: 'اجتماع أولياء الأمور', timestamp: new Date(Date.now() - 7200000).toISOString(), type: 'sms', status: 'sent' },
  ]);
  const [events] = useState<CalendarEvent[]>([]);
  const [todaySchedule] = useState<DailyScheduleItem[]>([
    { id: '1', type: 'absence', name: 'محمد حسن', time: 'طوال اليوم', role: 'معلم رياضيات' },
    { id: '2', type: 'supervision', name: 'سعد القحطاني', time: '06:45 صباحاً', location: 'الساحة الأمامية' },
    { id: '3', type: 'duty', name: 'عبدالله الشهري', time: 'الفسحة الأولى', location: 'المقصف' },
  ]);
  const [tomorrowSchedule] = useState<DailyScheduleItem[]>([
     { id: '1', type: 'supervision', name: 'علي الشهراني', time: '06:45 صباحاً', location: 'الساحة الخلفية' },
     { id: '2', type: 'supervision', name: 'فهد العتيبي', time: 'الفسحة الأولى', location: 'الممرات' },
     { id: '3', type: 'duty', name: 'سلطان العمري', time: 'نهاية الدوام', location: 'البوابة الرئيسية' },
  ]);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(() => {
    const today = new Date();
    const trialEnd = new Date(today);
    trialEnd.setDate(today.getDate() + 10);
    return {
      packageTier: 'advanced',
      isTrial: true,
      trialStartDate: today.toISOString().split('T')[0],
      trialEndDate: trialEnd.toISOString().split('T')[0],
      totalMessages: 0,
      remainingMessages: 0,
      startDate: today.toISOString().split('T')[0],
      endDate: trialEnd.toISOString().split('T')[0],
      planName: 'الباقة المتقدمة (تجريبية)',
      transactions: [],
      freeSmsRemaining: 10,
      freeWaRemaining: 50
    };
  });

  useEffect(() => {
    migrateTeacherStructure(); // تحديث هيكل بيانات المعلمين قبل تحميل الحالة
    const saved = localStorage.getItem('school_assignment_v4');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.schoolInfo) setSchoolInfo(data.schoolInfo);
        setTeachers(data.teachers || []);
        setClasses(data.classes || []);
        setStudents(data.students || []);
        setAdmins(data.admins || []);
        setAssignments(data.assignments || []);
        setGradeSubjectMap(data.gradeSubjectMap || {});
        if (data.phaseDepartmentMap) setPhaseDepartmentMap(data.phaseDepartmentMap);
        if (data.specializations) {
          // Merge: always include all INITIAL_SPECIALIZATIONS (with updated names),
          // then append any custom specializations from saved data that aren't in the defaults
          const merged = [
            ...INITIAL_SPECIALIZATIONS,
            ...data.specializations.filter((s: any) => !INITIAL_SPECIALIZATIONS.some(i => i.id === s.id)),
          ];
          setSpecializations(merged);
        }
        if (data.subjects) setSubjects(data.subjects);
        if (data.scheduleSettings) setScheduleSettings(data.scheduleSettings);
        if (data.subscription) setSubscription(data.subscription);
      } catch (e) { console.error(e); }
    }
  }, []);

  // Migration for Legacy Shared School Data and Sync
  useEffect(() => {
    if (schoolInfo.hasSecondSchool) {
       const legacySchool = {
          id: 'second',
          name: schoolInfo.secondSchoolName || 'المدرسة الثانية',
          phases: schoolInfo.secondSchoolPhases || [Phase.ELEMENTARY], 
          gender: schoolInfo.secondSchoolGender || 'بنين',
          phone: schoolInfo.secondSchoolPhone,
          email: schoolInfo.secondSchoolEmail,
          educationAdministration: schoolInfo.educationAdministration,
          region: schoolInfo.region,
          managerName: '',
          managerMobile: ''
       };

       // Check if we need to sync/migrate
       const existingIndex = schoolInfo.sharedSchools?.findIndex(s => s.id === 'second');
       
       if (existingIndex === -1 || !schoolInfo.sharedSchools) {
          // Add if missing
           setSchoolInfo(prev => ({
             ...prev,
             sharedSchools: [...(prev.sharedSchools || []), legacySchool]
           }));
       } else {
          // Logic for syncing legacy fields can be added here if needed in the future.
       }
    }
  }, [schoolInfo.hasSecondSchool, schoolInfo.secondSchoolName, schoolInfo.secondSchoolPhases]);

  useEffect(() => {
    const data = { schoolInfo, teachers, specializations, subjects, classes, students, admins, assignments, gradeSubjectMap, phaseDepartmentMap, scheduleSettings, subscription, timestamp: Date.now() };
    localStorage.setItem('school_assignment_v4', JSON.stringify(data));
  }, [schoolInfo, teachers, specializations, subjects, classes, students, admins, assignments, gradeSubjectMap, scheduleSettings, subscription]);

  const handleLogout = () => {
    if(confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        setActiveTab('dashboard');
        setIsSidebarOpen(false);
    }
  };

  const resetAllData = () => {
    if (confirm('تحذير: سيتم حذف كافة البيانات والبدء من جديد. هل أنت متأكد؟')) {
      setSchoolInfo({ entityType: EntityType.SCHOOL, schoolName: '', region: '', departments: ['عام'], phases: [Phase.ELEMENTARY], gender: 'بنين', educationalAgent: '', principal: '', hasSecondSchool: false, sharedSchools: [] });
      setTeachers([]); setClasses([]); setAssignments([]); setGradeSubjectMap({}); setSpecializations(INITIAL_SPECIALIZATIONS); setSubjects([]);
      localStorage.removeItem('school_assignment_v4'); setActiveTab('settings_basic');
    }
  };

  const renderContent = () => {
    // Subscription Lock Logic
    const isSubscriptionActive = new Date(subscription.endDate).getTime() >= new Date().getTime();
    const lockedTabs = ['manual', 'classes_waiting', 'supervision', 'duty', 'daily_waiting', 'messages', 'permissions'];
    
    if (!isSubscriptionActive && lockedTabs.includes(activeTab as string)) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-sm border border-red-100 text-center animate-fade-in mt-10 max-w-2xl mx-auto">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 text-red-500 border-4 border-white shadow-xl">
            <ShieldAlert size={48} strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4">عفواً، انتهت صلاحية باقتك</h2>
          <p className="text-slate-500 mb-8 max-w-md text-lg leading-relaxed">
            لديكم عمليات إدارية وجداول موقوفة، يرجى ترقية باقتك للاستمرار في استخدام ميزات المنصة بكفاءة.
          </p>
          <button 
            onClick={() => setActiveTab('subscription')} 
            className="px-8 py-4 bg-[#655ac1] text-white rounded-xl font-bold hover:bg-[#52499d] hover:-translate-y-1 transition-all shadow-lg shadow-indigo-200 text-lg w-full md:w-auto"
          >
            الانتقال لإدارة الباقات والاشتراكات
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} teachers={teachers} classes={classes} messages={messages} events={events} todaySchedule={todaySchedule} tomorrowSchedule={tomorrowSchedule} subscription={subscription} onNavigate={(tab) => {
        if (tab === 'subscription_pricing') { setSubscriptionInitialTab('pricing'); setActiveTab('subscription'); }
        else if (tab === 'messages_subscriptions') { setMessagesInitialTab('subscriptions'); setActiveTab('messages'); }
        else { setSubscriptionInitialTab('dashboard'); setMessagesInitialTab('compose'); setActiveTab(tab as any); }
      }} />;

      // Settings Sub-tabs
      case 'settings_basic': return (
        <BasicData 
            schoolInfo={schoolInfo} 
            setSchoolInfo={setSchoolInfo} 
            subjects={subjects}
            classes={classes}
            setClasses={setClasses}
            gradeSubjectMap={gradeSubjectMap}
            setGradeSubjectMap={setGradeSubjectMap}
            onComplete={() => setActiveTab('dashboard')}
        />
      );
      case 'settings_timing': return <TimingSettings schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} />;
      case 'settings_classes': return <Step4Classes classes={classes} setClasses={setClasses} subjects={subjects} setSubjects={setSubjects} gradeSubjectMap={gradeSubjectMap} setGradeSubjectMap={setGradeSubjectMap} schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} />;
      case 'settings_subjects': return <Step3Subjects subjects={subjects} setSubjects={setSubjects} schoolInfo={schoolInfo} gradeSubjectMap={gradeSubjectMap} setGradeSubjectMap={setGradeSubjectMap} phaseDepartmentMap={phaseDepartmentMap} setPhaseDepartmentMap={setPhaseDepartmentMap} scheduleSettings={scheduleSettings} setScheduleSettings={setScheduleSettings} />;
      case 'settings_students': return <Step5Students classes={classes} students={students} setStudents={setStudents} schoolInfo={schoolInfo} />;
      case 'settings_teachers': return <Step6Teachers teachers={teachers} setTeachers={setTeachers} specializations={specializations} schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} classes={classes} scheduleSettings={scheduleSettings} setScheduleSettings={setScheduleSettings} />;
      case 'settings_admins': return <Step7Admins admins={admins} setAdmins={setAdmins} />;

      // Schedule Section
      case 'manual': return <ManualAssignment teachers={teachers} setTeachers={setTeachers} subjects={subjects} classes={classes} assignments={assignments} setAssignments={setAssignments} specializations={specializations} schoolInfo={schoolInfo} gradeSubjectMap={gradeSubjectMap} />;
      case 'classes_waiting': return <Step9Schedule teachers={teachers} subjects={subjects} classes={classes} specializations={specializations} schoolInfo={schoolInfo} scheduleSettings={scheduleSettings} setScheduleSettings={setScheduleSettings} admins={admins} assignments={assignments} />;
      case 'schedule_reports': return <ScheduleReports schoolInfo={schoolInfo} teachers={teachers} subjects={subjects} classes={classes} assignments={assignments} specializations={specializations} timetable={scheduleSettings.timetable || {}} />;

      // Supervision and Duty
      case 'supervision': return <DailySupervision schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} teachers={teachers} admins={admins} scheduleSettings={scheduleSettings} />;
      case 'duty': return <DailyDuty schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} teachers={teachers} admins={admins} scheduleSettings={scheduleSettings} />;

      // Other Sections
      case 'daily_waiting': return <DailyWaiting teachers={teachers} admins={admins} classes={classes} subjects={subjects} schoolInfo={schoolInfo} scheduleSettings={scheduleSettings} />;
      case 'messages': return <Messages subscription={subscription} setSubscription={setSubscription} initialTab={messagesInitialTab} />;
      case 'permissions': return <RolePermissions />;
      case 'subscription': return <SubscriptionContainer subscription={subscription} setSubscription={setSubscription} initialTab={subscriptionInitialTab} />;
      case 'support': return <Support />;
      default: return (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">الصفحة غير موجودة</h2>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="px-6 py-2 bg-[#655ac1] text-white rounded-xl font-bold"
          >
            العودة للرئيسية
          </button>
        </div>
      );
    }
  };

  // Full-screen supervision signature page (opened via unique link)
  const supervisionSignToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('supervisionSign')
    : null;
  if (supervisionSignToken) {
    return <SupervisionSignaturePage token={supervisionSignToken} />;
  }

  // Full-screen duty signature page (opened via unique link)
  const dutySignToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('dutySign')
    : null;
  if (dutySignToken) {
    return <DutySignaturePage token={dutySignToken} />;
  }

  return (
    <ToastProvider>
    <MessageArchiveProvider>
    <div className="flex h-screen bg-[#fcfbff] overflow-hidden dir-rtl">
       {/* Sidebar - Fixed/Full Height */}
       <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isSidebarOpen={isSidebarOpen} 
          setIsSidebarOpen={setIsSidebarOpen} 
        />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header 
          schoolInfo={schoolInfo}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onNavigate={(tab) => setActiveTab(tab as any)}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          <div className="max-w-7xl mx-auto min-h-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
    </MessageArchiveProvider>
    </ToastProvider>
  );
};



export default App;

