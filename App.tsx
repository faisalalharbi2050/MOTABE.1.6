import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react'; // For the lock UI
import { Phase, Teacher, Specialization, Subject, ClassInfo, Assignment, SchoolInfo, Message, CalendarEvent, DailyScheduleItem, SubscriptionInfo, Student, Admin, ScheduleSettingsData, EntityType, MessageComposerDraft } from './types';
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
import TimingSettings from './components/settings/TimingSettings';
import ScheduleV2Container from './components/schedule-v2/ScheduleV2Container';


import ManualAssignment from './components/ManualAssignment';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
// import ClassesAndWaiting from './components/ClassesAndWaiting'; // Removed
import DailySupervision from './components/DailySupervision';
import SupervisionV2Container from './components/supervision-v2/SupervisionV2Container';
import SupervisionSignaturePage from './components/supervision/SupervisionSignaturePage';
import DutySignaturePage from './components/duty/DutySignaturePage';
import ScheduleSignaturePage from './components/schedule/ScheduleSignaturePage';
import ScheduleSharePage from './components/schedule/ScheduleSharePage';
import DailyDuty from './components/DailyDuty';
import DutyV2Container from './components/duty-v2/DutyV2Container';
import DailyWaiting from './components/DailyWaiting';
import WaitingV2Container from './components/waiting-v2/WaitingV2Container';
import Messages from './components/Messages';
import RolePermissions from './components/permissions/RolePermissions';
import SubscriptionContainer from './components/subscription/SubscriptionContainer';
import Support from './components/Support';

const APP_STORAGE_KEY = 'school_assignment_v4';
const APP_STORAGE_BACKUP_KEY = 'school_assignment_v4_backup';
const APP_INDEXED_DB_NAME = 'motabe_persistence';
const APP_INDEXED_DB_STORE = 'app_state';
const APP_INDEXED_DB_RECORD_ID = 'latest';

const createDefaultSchoolInfo = (): SchoolInfo => ({
  entityType: EntityType.SCHOOL,
  schoolName: '',
  region: '',
  departments: [],
  phases: [Phase.ELEMENTARY],
  gender: 'بنين',
  educationalAgent: '',
  principal: '',
  sharedSchools: []
});

const createDefaultSubscription = (): SubscriptionInfo => {
  const today = new Date();
  const semesterEnd = new Date(today);
  semesterEnd.setDate(today.getDate() + 90);

  return {
    packageTier: 'advanced',
    isTrial: false,
    trialStartDate: today.toISOString().split('T')[0],
    trialEndDate: today.toISOString().split('T')[0],
    totalMessages: 0,
    remainingMessages: 0,
    startDate: today.toISOString().split('T')[0],
    endDate: semesterEnd.toISOString().split('T')[0],
    planName: 'ط§ظ„ط¨ط§ظ‚ط© ط§ظ„ظ…طھظ‚ط¯ظ…ط©',
    transactions: [],
    freeSmsRemaining: 10,
    freeWaRemaining: 50
  };
};

const hasMeaningfulAppData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;

  return Boolean(
    data.schoolInfo?.schoolName ||
    data.teachers?.length ||
    data.classes?.length ||
    data.subjects?.length ||
    data.students?.length ||
    data.admins?.length ||
    data.assignments?.length ||
    Object.keys(data.gradeSubjectMap || {}).length ||
    Object.keys(data.phaseDepartmentMap || {}).length ||
    Object.keys(data.scheduleSettings?.timetable || {}).length
  );
};

const parseStoredAppData = (raw: string | null) => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : null;
  } catch {
    return null;
  }
};

const loadStoredAppData = () => {
  if (typeof window === 'undefined') return null;

  const primary = parseStoredAppData(localStorage.getItem(APP_STORAGE_KEY));
  const backup = parseStoredAppData(localStorage.getItem(APP_STORAGE_BACKUP_KEY));

  if (hasMeaningfulAppData(primary)) return primary;
  if (hasMeaningfulAppData(backup)) return backup;
  return primary || backup;
};

const openAppPersistenceDb = (): Promise<IDBDatabase | null> => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const request = window.indexedDB.open(APP_INDEXED_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(APP_INDEXED_DB_STORE)) {
        db.createObjectStore(APP_INDEXED_DB_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
};

const readIndexedDbAppData = async () => {
  const db = await openAppPersistenceDb();
  if (!db) return null;

  return await new Promise((resolve) => {
    const transaction = db.transaction(APP_INDEXED_DB_STORE, 'readonly');
    const store = transaction.objectStore(APP_INDEXED_DB_STORE);
    const request = store.get(APP_INDEXED_DB_RECORD_ID);

    request.onsuccess = () => {
      const payload = request.result?.payload ?? null;
      resolve(typeof payload === 'object' && payload ? payload : null);
    };
    request.onerror = () => resolve(null);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
  });
};

const writeIndexedDbAppData = async (data: any): Promise<boolean> => {
  const db = await openAppPersistenceDb();
  if (!db) return false;

  return await new Promise((resolve) => {
    const transaction = db.transaction(APP_INDEXED_DB_STORE, 'readwrite');
    const store = transaction.objectStore(APP_INDEXED_DB_STORE);
    store.put({ id: APP_INDEXED_DB_RECORD_ID, payload: data, updatedAt: Date.now() });

    transaction.oncomplete = () => {
      db.close();
      resolve(true);
    };
    transaction.onerror = () => {
      db.close();
      resolve(false);
    };
  });
};

const clearIndexedDbAppData = async (): Promise<void> => {
  const db = await openAppPersistenceDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(APP_INDEXED_DB_STORE, 'readwrite');
    const store = transaction.objectStore(APP_INDEXED_DB_STORE);
    store.delete(APP_INDEXED_DB_RECORD_ID);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      resolve();
    };
  });
};

/**
 * حفظ آمن للبيانات: يحمي من
 *   1. امتلاء الذاكرة (QuotaExceeded) — يخبر المستخدم بدل الفشل الصامت.
 *   2. كتابة state فارغ فوق بيانات حقيقية (سبب فقدان البيانات عند التحديث).
 */
let quotaWarningShown = false;
const safeWriteAppData = (data: any): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const existing = parseStoredAppData(localStorage.getItem(APP_STORAGE_KEY));
    // لا تكتب state فارغ فوق بيانات حقيقية محفوظة
    if (!hasMeaningfulAppData(data) && hasMeaningfulAppData(existing)) {
      return false;
    }
    const serialized = JSON.stringify(data);
    localStorage.setItem(APP_STORAGE_KEY, serialized);
    // النسخة الاحتياطية تُكتب فقط للبيانات الحقيقية
    if (hasMeaningfulAppData(data)) {
      try {
        localStorage.setItem(APP_STORAGE_BACKUP_KEY, serialized);
      } catch { /* نسخة الاحتياط غير حرجة */ }
    }
    return true;
  } catch (e: any) {
    console.error('[safeWriteAppData] فشل الحفظ:', e);
    if (!quotaWarningShown && (e?.name === 'QuotaExceededError' || String(e).includes('quota'))) {
      quotaWarningShown = true;
      alert('تحذير: مساحة التخزين في المتصفح ممتلئة، لم يتم حفظ آخر تعديلاتك. يُرجى تصدير البيانات كنسخة احتياطية.');
    }
    return false;
  }
};

const App: React.FC = () => {
  // ── الإصلاح: هجرة البيانات أولاً، ثم تحميلها مباشرة في useState initializers ──
  // بهذا يظهر المستخدم بياناته فوراً في أول render — بدون وميض فارغ وبدون خطر
  // كتابة state فارغ فوق البيانات الحقيقية أثناء التهيئة.
  const initialAppData = React.useMemo(() => {
    try { migrateTeacherStructure(); } catch (e) { console.error('[migrate]', e); }
    return loadStoredAppData();
  }, []);

  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(() => initialAppData?.schoolInfo ?? {
    entityType: EntityType.SCHOOL,
    schoolName: '',
    region: '',
    departments: [],
    phases: [Phase.ELEMENTARY],
    gender: 'بنين',
    educationalAgent: '',
    principal: '',
    sharedSchools: []
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => initialAppData?.teachers ?? []);
  const [specializations, setSpecializations] = useState<Specialization[]>(() => {
    if (initialAppData?.specializations) {
      return [
        ...INITIAL_SPECIALIZATIONS,
        ...initialAppData.specializations.filter((s: any) => !INITIAL_SPECIALIZATIONS.some(i => i.id === s.id)),
      ];
    }
    return INITIAL_SPECIALIZATIONS;
  });
  const [subjects, setSubjects] = useState<Subject[]>(() => initialAppData?.subjects ?? []);
  const [classes, setClasses] = useState<ClassInfo[]>(() => initialAppData?.classes ?? []);
  const [students, setStudents] = useState<Student[]>(() => initialAppData?.students ?? []);
  const [admins, setAdmins] = useState<Admin[]>(() => initialAppData?.admins ?? []);
  const [assignments, setAssignments] = useState<Assignment[]>(() => initialAppData?.assignments ?? []);
  const [gradeSubjectMap, setGradeSubjectMap] = useState<Record<string, string[]>>(() => initialAppData?.gradeSubjectMap ?? {});
  const [phaseDepartmentMap, setPhaseDepartmentMap] = useState<Record<string, string>>(() => initialAppData?.phaseDepartmentMap ?? {});
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettingsData>(() => initialAppData?.scheduleSettings ?? {
    subjectConstraints: [],
    teacherConstraints: [],
    meetings: [],
    substitution: { method: 'auto', maxTotalQuota: 24, maxDailyTotal: 5 }
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings_basic' | 'settings_timing' | 'settings_subjects' | 'settings_classes' | 'settings_teachers' | 'settings_students' | 'settings_admins' | 'manual' | 'schedule_v2' | 'supervision' | 'duty' | 'daily_waiting' | 'messages' | 'permissions' | 'subscription' | 'support' | 'support_help'>(() => {
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
  const [messageComposerDraft, setMessageComposerDraft] = useState<MessageComposerDraft | null>(null);
  const [hasHydratedAppState, setHasHydratedAppState] = useState(false);
  const [hasLoadedPersistentState, setHasLoadedPersistentState] = useState(false);

  // Mock Data for Dashboard
  const [messages] = useState<Message[]>([
    { id: '1', sender: 'مدير المدرسة', recipient: 'المعلمون', content: 'يرجى تسليم الدرجات', timestamp: new Date().toISOString(), type: 'whatsapp', status: 'sent' },
    { id: '2', sender: 'الوكيل للشؤون التعليمية', recipient: 'الإداريون', content: 'اجتماع طارئ', timestamp: new Date(Date.now() - 3600000).toISOString(), type: 'sms', status: 'sent' },
    { id: '3', sender: 'الموجه الطلابي', recipient: 'أولياء الأمور', content: 'اجتماع أولياء الأمور', timestamp: new Date(Date.now() - 7200000).toISOString(), type: 'sms', status: 'sent' },
  ]);
  const [events] = useState<CalendarEvent[]>([]);
  const [todaySchedule] = useState<DailyScheduleItem[]>([
    // غياب (5)
    { id: 't-a1', type: 'absence', name: 'محمد حسن العمري' },
    { id: 't-a2', type: 'absence', name: 'سعد بن فهد القحطاني' },
    { id: 't-a3', type: 'absence', name: 'عبدالعزيز الشهري' },
    { id: 't-a4', type: 'absence', name: 'خالد محمد الدوسري' },
    { id: 't-a5', type: 'absence', name: 'فيصل عبدالله الزهراني' },
    // إشراف (8)
    { id: 't-s1', type: 'supervision', name: 'سعد القحطاني' },
    { id: 't-s2', type: 'supervision', name: 'عمر الغامدي' },
    { id: 't-s3', type: 'supervision', name: 'تركي العتيبي' },
    { id: 't-s4', type: 'supervision', name: 'وليد السبيعي' },
    { id: 't-s5', type: 'supervision', name: 'ناصر الرشيدي' },
    { id: 't-s6', type: 'supervision', name: 'حسن البقمي' },
    { id: 't-s7', type: 'supervision', name: 'أحمد الحربي' },
    { id: 't-s8', type: 'supervision', name: 'يوسف المطيري' },
    // مناوبة (2)
    { id: 't-d1', type: 'duty', name: 'عبدالله الشهري' },
    { id: 't-d2', type: 'duty', name: 'سلطان العمري' },
  ]);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(() => {
    if (initialAppData?.subscription) return initialAppData.subscription;
    const today = new Date();
    const semesterEnd = new Date(today);
    semesterEnd.setDate(today.getDate() + 90);
    return {
      packageTier: 'advanced',
      isTrial: false,
      trialStartDate: today.toISOString().split('T')[0],
      trialEndDate: today.toISOString().split('T')[0],
      totalMessages: 0,
      remainingMessages: 0,
      startDate: today.toISOString().split('T')[0],
      endDate: semesterEnd.toISOString().split('T')[0],
      planName: 'الباقة المتقدمة',
      transactions: [],
      freeSmsRemaining: 10,
      freeWaRemaining: 50
    };
  });

  useEffect(() => {
    let isMounted = true;

    const applyStoredData = (storedData: any) => {
      setSchoolInfo(storedData.schoolInfo ?? createDefaultSchoolInfo());
      setTeachers(storedData.teachers ?? []);
      setSpecializations(
        storedData.specializations
          ? [
              ...INITIAL_SPECIALIZATIONS,
              ...storedData.specializations.filter((s: any) => !INITIAL_SPECIALIZATIONS.some(i => i.id === s.id)),
            ]
          : INITIAL_SPECIALIZATIONS
      );
      setSubjects(storedData.subjects ?? []);
      setClasses(storedData.classes ?? []);
      setStudents(storedData.students ?? []);
      setAdmins(storedData.admins ?? []);
      setAssignments(storedData.assignments ?? []);
      setGradeSubjectMap(storedData.gradeSubjectMap ?? {});
      setPhaseDepartmentMap(storedData.phaseDepartmentMap ?? {});
      setScheduleSettings(storedData.scheduleSettings ?? {
        subjectConstraints: [],
        teacherConstraints: [],
        meetings: [],
        substitution: { method: 'auto', maxTotalQuota: 24, maxDailyTotal: 5 }
      });
      setSubscription(storedData.subscription ?? createDefaultSubscription());
    };

    const hydratePersistentState = async () => {
      const localData = loadStoredAppData();
      const indexedDbData = await readIndexedDbAppData();
      if (!isMounted) return;

      if (!hasMeaningfulAppData(localData) && hasMeaningfulAppData(indexedDbData)) {
        applyStoredData(indexedDbData);
      }

      setHasLoadedPersistentState(true);
      setHasHydratedAppState(true);
    };

    hydratePersistentState();

    return () => {
      isMounted = false;
    };
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
    if (!hasHydratedAppState || !hasLoadedPersistentState) return;
    const data = { schoolInfo, teachers, specializations, subjects, classes, students, admins, assignments, gradeSubjectMap, phaseDepartmentMap, scheduleSettings, subscription, timestamp: Date.now() };
    safeWriteAppData(data);
    void writeIndexedDbAppData(data);
  }, [hasHydratedAppState, hasLoadedPersistentState, schoolInfo, teachers, specializations, subjects, classes, students, admins, assignments, gradeSubjectMap, phaseDepartmentMap, scheduleSettings, subscription]);

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
        localStorage.removeItem(APP_STORAGE_KEY); localStorage.removeItem(APP_STORAGE_BACKUP_KEY);
        void clearIndexedDbAppData();
        setActiveTab('settings_basic');
    }
  };

  const renderContent = () => {
    // Subscription Lock Logic
    const isSubscriptionActive = new Date(subscription.endDate).getTime() >= new Date().getTime();
    const lockedTabs = ['manual', 'schedule_v2', 'supervision', 'duty', 'daily_waiting', 'messages', 'permissions'];
    
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
      case 'dashboard': return <Dashboard schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} teachers={teachers} classes={classes} messages={messages} events={events} todaySchedule={todaySchedule} subscription={subscription} onNavigate={(tab) => {
        if (tab === 'subscription_pricing') { setSubscriptionInitialTab('pricing'); setActiveTab('subscription'); }
        else if (tab === 'messages_subscriptions') { setMessagesInitialTab('subscriptions'); setActiveTab('messages'); }
        else if (tab === 'messages_archive') { setMessagesInitialTab('archive'); setActiveTab('messages'); }
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
      case 'settings_admins': return <Step7Admins admins={admins} setAdmins={setAdmins} schoolInfo={schoolInfo} />;

      // Schedule Section
      case 'manual': return <ManualAssignment teachers={teachers} setTeachers={setTeachers} subjects={subjects} classes={classes} assignments={assignments} setAssignments={setAssignments} specializations={specializations} schoolInfo={schoolInfo} gradeSubjectMap={gradeSubjectMap} />;
      case 'schedule_v2': return <ScheduleV2Container teachers={teachers} subjects={subjects} classes={classes} students={students} specializations={specializations} schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} scheduleSettings={scheduleSettings} setScheduleSettings={setScheduleSettings} admins={admins} assignments={assignments} onOpenMessagesArchive={() => { setMessagesInitialTab('archive'); setActiveTab('messages'); }} onPrepareMessageDraft={(draft) => { setMessageComposerDraft(draft); setMessagesInitialTab('compose'); setActiveTab('messages'); }} />;

      // Supervision and Duty
      case 'supervision': return <SupervisionV2Container schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} teachers={teachers} admins={admins} scheduleSettings={scheduleSettings} onNavigateToTiming={() => setActiveTab('settings_timing')} onOpenMessagesArchive={() => { setMessagesInitialTab('archive'); setActiveTab('messages'); }} />;
      case 'duty': return <DutyV2Container schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} teachers={teachers} admins={admins} scheduleSettings={scheduleSettings} onNavigateToDashboard={() => setActiveTab('dashboard')} onOpenMessagesArchive={() => { setMessagesInitialTab('archive'); setActiveTab('messages'); }} />;

      // Other Sections
      case 'daily_waiting': return <WaitingV2Container teachers={teachers} admins={admins} classes={classes} subjects={subjects} schoolInfo={schoolInfo} scheduleSettings={scheduleSettings} />;
      case 'messages': return <Messages subscription={subscription} setSubscription={setSubscription} initialTab={messagesInitialTab as any} initialDraft={messageComposerDraft} onNavigate={(tab) => {
        if (tab === 'subscription_message_packages') { setSubscriptionInitialTab('message_packages' as any); setActiveTab('subscription'); }
        else { setActiveTab(tab as any); }
      }} />;
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

  // Full-screen schedule signature page (opened via unique link)
  const scheduleSignToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('scheduleSign')
    : null;
  if (scheduleSignToken) {
    return <ScheduleSignaturePage token={scheduleSignToken} />;
  }

  const scheduleShareToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('scheduleShare')
    : null;
  if (scheduleShareToken) {
    return <ScheduleSharePage token={scheduleShareToken} />;
  }

  return (
    <ToastProvider>
    <MessageArchiveProvider>
    <div className="flex h-screen bg-white overflow-hidden dir-rtl">
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
