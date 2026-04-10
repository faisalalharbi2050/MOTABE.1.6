export enum EntityType {
  SCHOOL = 'مدرسة',
  OTHER = 'آخر'
}

export enum Phase {
  KINDERGARTEN = 'رياض أطفال',
  ELEMENTARY = 'الابتدائية',
  MIDDLE = 'المتوسطة',
  HIGH = 'الثانوية',
  OTHER = 'أخرى'
}

// ===== Roles & Permissions (RBAC) Types =====

export type PermissionLevel = 'full' | 'custom';

export interface ModulePermission {
  moduleId: string; // e.g., 'settings', 'schedule', 'daily_waiting', 'messages', 'subscriptions', 'support', 'permissions'
  level: PermissionLevel; 
  allowedActions?: ('view' | 'add' | 'edit' | 'delete' | 'print' | 'export')[];
}

export type RoleType = 'owner' | 'delegate_full' | 'delegate_custom';

export interface Delegate {
  id: string;
  name: string;
  phone: string;
  username?: string; // Created after OTP login
  passwordHash?: string; // Created after OTP login
  isPendingSetup: boolean; // True if hasn't logged in with OTP yet
  otp?: string; // Temporary OTP for first login
  role: RoleType;
  customPermissions?: ModulePermission[];
  isActive: boolean;
  addedAt: string;
  linkedStaffId: string; // ID of the teacher/admin they were linked to
  linkedStaffType: 'teacher' | 'admin';
}

export type LogActionType =
  | 'create'
  | 'edit_permissions'
  | 'activate'
  | 'deactivate'
  | 'delete'
  | 'regenerate_otp'
  | 'reset_account';

export interface ActionLog {
  id: string;
  actorName: string;            // 'المالك' أو اسم المفوض
  targetDelegateName?: string;  // المفوض المتأثر بالعملية
  actionType: LogActionType;
  action: string;               // وصف قابل للقراءة
  module: string;
  timestamp: string;            // ISO string
  details?: string;
}

// ===========================================

export interface SharedSchool {
  id: string;
  name: string;
  phases: Phase[];
  gender: 'بنين' | 'بنات';
  departments?: string[]; // Optional for legacy compatibility
  otherDepartment?: string; // Optional for legacy compatibility
  otherPhase?: string;
  phone?: string;
  email?: string;
  address?: string;
  logo?: string;
  timing?: TimingConfig; // Optional custom timing for this school
  educationAdministration?: string; // Added
  region?: string; // Added
  managerName?: string; // Added - Principal
  managerMobile?: string; // Added - Principal Mobile
  
  // Scheduling Logic
  timetable?: TimetableData; // The schedule of this shared school (for cross-checking)
  teacherIds?: string[]; // List of teacher IDs that belong to this school
}

// Need to import TimetableData to use it here, but TimetableData is likely defined below.
// If TimetableData is defined below, I might need to move SharedSchool down or use 'any' temporarily if circular. 
// However, in TS interfaces are hoisted. Let's check where TimetableData is.
// It is usually near the end. I will use 'any' or 'Record<string, any>' if I can't find it, but let's assume it works or I'll fix it.
// Actually, TimetableData is not imported in types.ts usually, it IS defined in types.ts.
// I will check where TimetableData is defined.

export interface SchoolInfo {
  // Entity Type Configuration
  entityType: EntityType;
  
  // Common Fields
  region: string;
  city?: string;
  country?: string; 
  email?: string;
  logo?: string;
  address?: string;
  phone?: string;

  // School Specific
  schoolName: string; // Used for Entity Name as well if not school
  phases: Phase[];
  gender: 'بنين' | 'بنات';
  educationAdministration?: string;
  
  // Leadership
  principal: string; // Manager Name
  principalMobile?: string; // Manager Mobile
  educationalAgent: string; // Kept for schools

  // Deprecated / Legacy but kept for compatibility or removal
  departments: string[]; 
  otherDepartment?: string;
  otherPhase?: string;

  
  // Shared Schools - Refactored from single second school to array
  sharedSchools: SharedSchool[];

  // Legacy fields (kept optional for migration if needed, or remove if strictly following clean slate)
  // We will migrate data from these to sharedSchools in the wizard or on load
  hasSecondSchool?: boolean;
  secondSchoolName?: string;
  secondSchoolPhases?: Phase[];
  secondSchoolGender?: 'بنين' | 'بنات';
  secondSchoolDepartments?: string[];
  secondSchoolOtherDepartment?: string;
  secondSchoolPhone?: string;
  secondSchoolEmail?: string;

  mergeTeachers?: boolean;
  mergeTiming?: boolean;
  mergeSubjects?: boolean;
  mergeClassesView?: boolean;
  mergeTeachersView?: boolean;
  timing?: TimingConfig;
  secondTiming?: TimingConfig; // For 'separate' or 'copied' mode
  semesters?: SemesterInfo[];
  currentSemesterId?: string;
  academicYear?: string;
  calendarType?: 'hijri' | 'gregorian';
  isWizardCompleted?: boolean;
  
  // Custom/Institute Mode configuration
  customCategories?: { id: number; name: string }[];
}

export interface SemesterInfo {
  id: string;
  name: string;
  calendarType: 'hijri' | 'gregorian';
  startDate: string;
  endDate: string;
  weeksCount: number;
  isCurrent?: boolean;
  holidays?: string[]; // تواريخ الإجازات المستبعدة (YYYY-MM-DD)
  workDaysStart?: number; // 0 = Sunday
  workDaysEnd?: number; // 4 = Thursday
}

export interface BreakInfo {
  id: string;
  name: string;
  duration: number;
  afterPeriod: number;
  targetPhases?: Phase[];
}

export interface PrayerInfo {
  id: string;
  name: string;
  duration: number;
  afterPeriod: number;
  isEnabled: boolean;
}

export interface TimingConfig {
  activeDays: string[]; // ['sunday', 'monday', ..., 'thursday']
  periodCounts: Record<string, number>; // { 'sunday': 7, 'monday': 6 ... }
  
  // Seasonal / Pattern
  season?: 'summer' | 'winter' | 'ramadan';
  
  // Time settings
  assemblyTime: string; // "06:45"
  periodDuration: number; // minutes
  customDurations?: Record<string, number>; // { '1': 45, '2': 40 ... }
  customPeriodNames?: Record<string, string>; // { '1': 'الطابور', '2': 'القرآن' ... }
  customStartTimes?: Record<string, string>; // { 'period-1': '07:00' ... }
  hasAssembly?: boolean;
  notes?: string;

  // Breaks & Prayer
  breaks: BreakInfo[];
  prayers: PrayerInfo[];
  
  // Shared School
  sharedSchoolMode?: 'unified' | 'copied' | 'separate';
  
  // Deprecated but kept for backward compatibility if needed, or can be removed if we migrate fully
  periodCount?: number; 
  breakCount?: number;
  breakDuration?: number;
  dayStartTime?: string;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  grade: number;
  parentPhone?: string;
  schoolId?: string; // 'main' or 'second' for shared schools
  nationalId?: string;
}

export interface Admin {
  id: string;
  name: string;
  role: string;
  phone: string;
  waitingQuota?: number;
  agentType?: string[];
  sortIndex?: number;
}

export interface Specialization {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  specializationIds: string[];
  periodsPerClass: number;
  phases: Phase[];
  targetGrades?: number[]; // مخصص للمرحلة الثانوية والصفوف المحددة (1, 2, 3...)
  department?: 'عام' | 'تحفيظ' | 'آخر' | 'مشترك' | 'حاسب وهندسة' | 'صحة وحياة' | 'إدارة أعمال' | 'شرعي' | 'custom' | string; // القسم التابع له المادة
  customPhaseName?: string; // اسم المرحلة المخصصة (عند اختيار "أخرى")
  customDepartmentName?: string; // اسم القسم المخصص (عند اختيار "أخرى" أو "آخر")
  customPlanName?: string; // اسم الخطة المخصصة (للمواد المضافة يدوياً كخطة)
  semester?: 1 | 2 | 3; // الفصل الدراسي (خاص بالثانوي - نظام 3 فصول)
  targetGradeNames?: string[]; // أسماء الصفوف/المستويات المستهدفة (لرياض الأطفال والمراحل الأخرى)
  isArchived?: boolean;
}

export interface TeacherSchoolEntry {
  schoolId: string;
  schoolName: string;
  subjects: string[];
  classes: string[];
  lessons: number;
  waiting: number;
}

export interface TeacherConstraintMap {
  consecutiveLessons?: number;
  excludedSlots?: Record<string, number[]>;
  firstLastLessons?: { maxFirst?: number; maxLast?: number };
  earlyExit?: Record<string, number>;
  meetings?: string[];
  presenceDays?: Record<string, string[]>; // { [schoolId]: ['sun','mon',...] }
}

export interface Teacher {
  id: string;
  name: string;
  specializationId: string;
  assignedSubjectId: string;
  quotaLimit: number; // نصاب الحصص
  waitingQuota?: number; // نصاب الانتظار
  phone: string;
  targetPhase?: Phase;
  sortIndex?: number;
  schoolId?: string; // 'main' or 'second' — legacy, kept for compatibility
  sharedWithSchools?: string[]; // legacy
  // ── New fields ──────────────────────────────
  isShared?: boolean;                   // هل المعلم مشترك بين مدرستين؟
  idNumber?: string | null;             // رقم الهوية
  schools?: TeacherSchoolEntry[];       // بيانات المعلم لكل مدرسة
  constraints?: TeacherConstraintMap;   // القيود (presenceDays جديد فقط)
}

export interface ClassInfo {
  id: string;
  phase: Phase;
  grade: number;
  section: number;
  name?: string; // Custom name override (default: "1-1" format)
  subjectIds?: string[];
  
  // Customization & Configuration
  schoolId?: string; // 'main' or 'second' for shared schools
  customPeriodCounts?: Record<string, number>; // Override per day: { 'sunday': 6, 'monday': 6 }
  sortOrder?: number; // Manual reordering
  isManuallyCreated?: boolean; // Track creation method
  createdAt?: string; // ISO timestamp
  
  // Advanced Features
  type?: 'class' | 'lab' | 'computer_lab' | 'gym' | 'playground' | 'other';
  customType?: string; // If 'other'
  isMerged?: boolean;
  mergedClassIds?: string[];
  originalSchoolId?: string; // If merged from multiple
  linkedSubjectId?: string; // For linking facility to a subject (e.g., Gym -> PE) - deprecated, use linkedSubjectIds
  linkedSubjectIds?: string[]; // For linking facility to multiple subjects
  capacity?: number; // Facility capacity: 1, 2, or 3 classes
}

export interface Assignment {
  teacherId: string;
  classId: string;
  subjectId: string;
  isDraft?: boolean;
}

export type MessageSource = 'waiting' | 'supervision' | 'duty' | 'student_affairs' | 'general' | 'shared_school';
export type MessageRole = 'teacher' | 'admin' | 'student' | 'guardian' | 'all';

export interface CentralMessage {
  id: string;
  batchId?: string; // To group messages sent together
  senderRole?: string; // To identify who sent the message (e.g. manager, admin)
  source: MessageSource;
  recipientId: string;
  recipientName: string;
  recipientPhone: string;
  recipientRole: MessageRole;
  content: string;
  timestamp: string;
  channel: 'whatsapp' | 'sms';
  status: 'sent' | 'pending' | 'failed';
  failureReason?: string;
  schoolId?: string; // For shared schools
  attachments?: { name: string; url: string; type: string }[];
  isScheduled?: boolean;
  scheduledFor?: string;
  retryCount?: number;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  isSystem: boolean;
  category?: string; // e.g. 'غياب طالب', 'تأخر طالب', 'سلوك طالب', 'أخرى'
}

export interface MessageStats {
  totalSent: number;
  whatsappSent: number;
  smsSent: number;
  failedCount: number;
  balanceSMS: number;
  balanceWhatsApp: number;
  lastUpdated: string;
  activePackageName?: string;
  activePackageWA?: number;
  activePackageSMS?: number;

  // Optional metadata about the الرسائل package subscription
  messagePackageStartDate?: string; // ISO date YYYY-MM-DD
  messagePackageEndDate?: string;   // ISO date YYYY-MM-DD
  messagePackageIsTrial?: boolean;
}

export interface Message {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: string;
  type: 'whatsapp' | 'sms';
  status: 'sent' | 'pending' | 'failed';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string YYYY-MM-DD
  type: 'meeting' | 'holiday' | 'exam' | 'other';
  description?: string;
}

export interface DailyScheduleItem {
  id: string;
  type: 'absence' | 'supervision' | 'duty';
  name: string; // Teacher name or staff name
  role?: string; // e.g. "Supervisor", "Duty Officer"
  time?: string;
  location?: string;
  isTomorrow?: boolean;
  isOfficialLeave?: boolean;
  officialLeaveText?: string;
}

export type PackageTier = 'basic' | 'advanced' | 'premium';
export type PaymentPeriod = 'monthly' | 'semester' | 'yearly';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  packageTier: PackageTier;
  period: PaymentPeriod;
  paymentMethod: string;
  status: 'success' | 'failed' | 'pending';
  invoiceUrl?: string; // Mock PDF url or data
}

export interface SubscriptionInfo {
  totalMessages: number;
  remainingMessages: number;
  startDate: string;
  endDate: string;
  planName: string;
  // New fields for the advanced subscription system
  packageTier: PackageTier;
  isTrial: boolean;
  trialStartDate?: string;
  trialEndDate?: string;
  transactions: Transaction[];
  freeSmsRemaining: number;
  freeWaRemaining: number;
}

// ===== Schedule Settings Types =====

export interface SubjectConstraint {
  subjectId: string;
  excludedPeriods: number[];        // الحصص المستثناة
  preferredPeriods: number[];       // الحصص المفضلة (أولوية)
  enableDoublePeriods: boolean;     // تتابع الحصص (حصتين متتاليتين)
}

export interface TeacherConstraint {
  teacherId: string;
  maxConsecutive: number;           // الحد الأقصى للتتابع (default: 4)
  excludedSlots: Record<string, number[]>; // يوم → أرقام الحصص المستثناة { 'الأحد': [1,7], 'الإثنين': [7] }
  dailyLimits?: Record<string, {
    min: number;
    max: number;
    windowStart?: number; // بداية النافذة الزمنية (مثلاً: 1)
    windowEnd?: number;   // نهاية النافذة الزمنية (مثلاً: 5)
  }>;
  maxLastPeriods?: number;          // الحد الأقصى للحصص الأخيرة أسبوعياً
  maxFirstPeriods?: number;         // الحد الأقصى للحصص الأولى أسبوعياً
  earlyExit?: Record<string, number>; // يوم → آخر حصة مسموحة (الخروج المبكر)
  earlyExitMode?: 'manual' | 'auto';  // نمط الخروج المبكر: يدوي أو تلقائي
  // القيد السادس — أيام تواجد المعلم المشترك لكل مدرسة
  // { schoolId: ['الأحد','الإثنين',...] }
  // تأثير الخوارزمية: إذا كان presenceDays غير فارغ، لا تُسند للمعلم أي حصة
  //   في مدرسة معينة في يوم غير مدرج في presenceDays[schoolId].
  presenceDays?: Record<string, string[]>;
}

export interface SpecializedMeeting {
  id: string;
  specializationId: string;
  day: string;                      // اليوم
  period: number;                   // رقم الحصة
  teacherIds: string[];             // المعلمون المشاركون
}

export interface SubstitutionConfig {
  method: 'auto' | 'fixed' | 'manual';
  maxTotalQuota: number;            // الحد الأقصى للنصاب (أساسي + انتظار) - default: 24
  maxDailyTotal: number;            // الحد الأقصى اليومي (أساسي + انتظار) - default: 5
  fixedPerPeriod?: number;          // عدد المنتظرين لكل حصة (في الطريقة المحددة)
}

export interface TimetableSlot {
  teacherId: string;
  subjectId?: string;
  classId?: string;
  type: 'lesson' | 'waiting';
  isSubstitution?: boolean;
}

export type TimetableData = Record<string, TimetableSlot>;

export interface SavedSchedule {
  id: string;
  name: string;
  createdAt: string; // ISO string
  createdBy: string; // e.g. "النظام" or "المستخدم"
  timetable: TimetableData;
}

export interface ScheduleSettingsData {
  subjectConstraints: SubjectConstraint[];
  teacherConstraints: TeacherConstraint[];
  meetings: SpecializedMeeting[];
  substitution: SubstitutionConfig;
  timetable?: TimetableData;
  auditLogs?: AuditLogEntry[];
  subjectAbbreviations?: Record<string, string>; // subjectId -> abbreviation
  savedSchedules?: SavedSchedule[];
  activeScheduleId?: string; // ID of the currently adopted saved schedule
  generationMode?: 'unified' | 'separate'; // نوع الجدول للمدارس المشتركة
  scheduleGenerationCount?: number; // عداد مرات إنشاء جدول الحصص
  waitingGenerationCount?: number;  // عداد مرات إنشاء جدول الانتظار
}

// ===== Audit Log Types =====

export interface AuditLogEntry {
  id: string;
  timestamp: string;      // ISO string
  user: string;           // "النظام" أو "المستخدم" أو اسم مدير النظام
  actionType: 'swap' | 'move' | 'chain_swap';
  description: string;    // تفاصيل الحركة للقراءة
  sourceKey?: string;     // المفتاح الأساسي "معلم-يوم-حصة"
  targetKey?: string;
  relatedTeacherIds: string[]; // المعنيون بالحركة
  viewType?: 'general' | 'individual'; // نوع العرض: جدول عام أو جدول معلم
  teacherName?: string;   // اسم المعلم الأساسي
}

// ===== Daily Supervision Types =====

export interface SupervisionLocation {
  id: string;
  name: string;
  category: 'canteen' | 'yard_inner' | 'yard_outer' | 'playground' | 'gym' | 'floor' | 'prayer_hall' | 'custom';
  floorNumber?: number; // للأدوار: أرضي=0، أول=1، ثاني=2، ثالث=3، رابع=4
  isActive: boolean;
  sortOrder: number;
  customName?: string;
}

export interface SupervisionPeriodConfig {
  id: string;
  type: 'break' | 'prayer';
  name: string; // فسحة 1، فسحة 2، صلاة
  isEnabled: boolean;
  linkedBreakId?: string; // ربط بمعرف الفسحة من TimingConfig
  linkedPrayerId?: string; // ربط بمعرف الصلاة من TimingConfig
  startTime?: string;
  endTime?: string;
  duration?: number;
}

export interface SupervisionStaffExclusion {
  staffId: string;
  staffType: 'teacher' | 'admin';
  reason?: string;
  isExcluded: boolean;
}

export interface SupervisionDayAssignment {
  day: string; // sunday, monday, etc.
  staffAssignments: SupervisionStaffAssignment[];
  followUpSupervisorId?: string; // المشرف المتابع
  followUpSupervisorName?: string;
  // Digital signature fields for follow-up supervisor
  followUpSignatureData?: string;   // base64 PNG
  followUpSignatureStatus?: 'not-sent' | 'pending' | 'signed';
  followUpSignatureToken?: string;  // unique token for link
}

export interface SupervisionStaffAssignment {
  staffId: string;
  staffType: 'teacher' | 'admin';
  staffName: string;
  locationIds: string[]; // متعدد المواقع
  periodIds: string[]; // الفترات المخصصة (فسحة/صلاة)
  // Digital signature fields
  signatureData?: string;   // base64 PNG
  signatureStatus?: 'not-sent' | 'pending' | 'signed';
  signatureToken?: string;  // unique token for link
}

export type SupervisionAttendanceStatus = 'present' | 'absent' | 'excused' | 'withdrawn' | 'late';

export interface SupervisionAttendanceRecord {
  id: string;
  date: string; // ISO YYYY-MM-DD
  day: string;
  staffId: string;
  staffType: 'teacher' | 'admin';
  staffName: string;
  status: SupervisionAttendanceStatus;
  withdrawalTime?: string;
  lateTime?: string;
  notes?: string;
  recordedAt: string;
  recordedBy?: string;
}

export interface SavedSupervisionSchedule {
  id: string;
  name: string;
  createdAt: string;
  dayAssignments: SupervisionDayAssignment[];
  isApproved: boolean;
}

export interface SupervisionScheduleData {
  locations: SupervisionLocation[];
  periods: SupervisionPeriodConfig[];
  exclusions: SupervisionStaffExclusion[];
  dayAssignments: SupervisionDayAssignment[];
  attendanceRecords: SupervisionAttendanceRecord[];
  settings: SupervisionSettings;
  isApproved: boolean;
  approvedAt?: string;
  effectiveDate?: string;
  footerText?: string;
  schoolId?: string; // لدعم المدارس المشتركة
  savedSchedules?: SavedSupervisionSchedule[];
  activeScheduleId?: string;
}

export interface SupervisionSettings {
  autoExcludeTeachersWhen5Admins: boolean;
  excludeVicePrincipals: boolean;
  suggestedCountPerDay?: number;
  enableAutoAssignment: boolean;
  reminderMessageTemplate?: string;
  assignmentMessageTemplate?: string;
  sharedSchoolMode: 'unified' | 'separate'; // جدول موحد أو منفصل
  autoSendReminder: boolean; // إرسال تذكير تلقائي أم يدوي
  reminderSendTime?: string; // وقت إرسال رسالة التذكير مثال: "07:00"
  reminderSendChannel?: 'whatsapp' | 'sms'; // طريقة الإرسال
}

export interface SupervisionMessage {
  id: string;
  staffId: string;
  staffName: string;
  type: 'assignment' | 'reminder';
  channel: 'whatsapp' | 'sms';
  content: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed';
  day: string;
  locationNames: string[];
}

// ===== Daily Duty Types =====

export interface DutyStaffExclusion {
  staffId: string;
  staffType: 'teacher' | 'admin';
  reason?: string;
  isExcluded: boolean;
}

export interface DutyStaffAssignment {
  staffId: string;
  staffType: 'teacher' | 'admin';
  staffName: string;
  lastPeriod?: number; // The actual last administrative period they end at
  isManual?: boolean;
  signatureData?: string;           // base64 PNG of digital signature
  signatureStatus?: 'not-sent' | 'pending' | 'signed';
  signatureToken?: string;          // unique token used in the sign link
}

export interface DutyWeekAssignment {
  weekId: string;   // e.g. "week-1"
  weekName: string; // e.g. "الأسبوع الأول"
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  dayAssignments: DutyDayAssignment[];
}

export interface DutyDayAssignment {
  day: string; // sunday, monday, etc.
  date?: string; // actual date in YYYY-MM-DD format
  staffAssignments: DutyStaffAssignment[];
  isRemoteWork?: boolean;
  isOfficialLeave?: boolean;   // يوم إجازة رسمية
  officialLeaveText?: string;  // نص الإجازة الرسمية (افتراضي: "إجازة رسمية")
}

export interface DutyStudentViolation {
  id: string;
  studentName: string;
  gradeAndClass: string;
  violationType: string;
  actionTaken: string;
  notes?: string;
}

export interface DutyStudentLate {
  id: string;
  studentName: string;
  gradeAndClass: string;
  exitTime: string;      // زمن الانصراف
  actionTaken: string;   // الإجراء المتخذ
  notes?: string;
}

export interface DutyReportRecord {
  id: string;
  date: string; // ISO YYYY-MM-DD
  day: string;
  staffId: string;
  staffName: string;
  signature?: string; // base64 image
  lateStudents: DutyStudentLate[];
  violatingStudents: DutyStudentViolation[];
  isSubmitted: boolean;
  submittedAt?: string;
  isEmpty?: boolean; // When report is submitted empty (no violations/lates)
  manuallySubmitted?: boolean; // تم التسليم يدوياً (ورقي)
  status: SupervisionAttendanceStatus; // absent, present, etc. from supervision status
  withdrawalTime?: string;
}

export interface SavedDutySchedule {
  id: string;
  name: string;
  createdAt: string;
  dayAssignments: DutyDayAssignment[];
  isApproved: boolean;
}

export interface DutySettings {
  autoExcludeTeachersWhen5Admins: boolean; // قاعدة 5 إداريين
  excludeVicePrincipals: boolean;
  excludeGuards: boolean;
  suggestedCountPerDay: number;
  enableAutoAssignment: boolean;
  reminderMessageTemplate?: string;
  assignmentMessageTemplate?: string;
  reminderSendTime?: string; // Time to send reminder links e.g. "07:00"
  sharedSchoolMode: 'unified' | 'separate';
  includeReportLinkInReminder?: boolean; // تضمين رابط نموذج التقرير في رسائل التذكير
  autoSendLinks: boolean; // إرسال تلقائي دون تدخل
  reminderSendChannel?: 'whatsapp' | 'sms'; // طريقة الإرسال
  autoSendReminder?: boolean; // إرسال تذكير تلقائي
}

export interface DutyScheduleData {
  exclusions: DutyStaffExclusion[];
  dayAssignments: DutyDayAssignment[];
  weekAssignments?: DutyWeekAssignment[]; // Multi-week view grouping
  dutyAssignmentCounts?: Record<string, number>; // Justice counter: staffId -> assignment count
  reports: DutyReportRecord[];
  settings: DutySettings;
  isApproved: boolean;
  approvedAt?: string;
  effectiveDate?: string;
  footerText?: string;
  activeScheduleId?: string;
  savedSchedules?: SavedDutySchedule[];
}

export interface DutyMessage {
  id: string;
  staffId: string;
  staffName: string;
  type: 'assignment' | 'reminder';
  channel: 'whatsapp' | 'sms';
  content: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed';
  day: string;
}
