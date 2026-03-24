/**
 * Supervision Utility Functions
 * محرك الإسناد الذكي للإشراف اليومي
 */

import {
  Teacher,
  Admin,
  SchoolInfo,
  TimingConfig,
  ScheduleSettingsData,
  TimetableData,
  SupervisionLocation,
  SupervisionPeriodConfig,
  SupervisionStaffExclusion,
  SupervisionDayAssignment,
  SupervisionStaffAssignment,
  SupervisionScheduleData,
  SupervisionSettings,
  SupervisionAttendanceRecord,
  Phase,
} from '../types';

// ===== Constants =====
export const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'] as const;
export const DAY_NAMES: Record<string, string> = {
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
};

export const LOCATION_CATEGORIES = [
  { id: 'canteen', name: 'المقصف', icon: '🍽️' },
  { id: 'yard_inner', name: 'الفناء الداخلي', icon: '🏫' },
  { id: 'yard_outer', name: 'الفناء الخارجي', icon: '🌳' },
  { id: 'playground', name: 'الملعب', icon: '⚽' },
  { id: 'gym', name: 'الصالة الرياضية', icon: '🏋️' },
  { id: 'floor', name: 'إشراف الأدوار', icon: '🏢' },
  { id: 'prayer_hall', name: 'المصلى', icon: '🕌' },
  { id: 'custom', name: 'مخصص', icon: '📍' },
] as const;

export const FLOOR_NAMES: Record<number, string> = {
  0: 'الدور الأرضي',
  1: 'الدور الأول',
  2: 'الدور الثاني',
  3: 'الدور الثالث',
  4: 'الدور الرابع',
};

// ===== Default Locations =====
export function getDefaultLocations(): SupervisionLocation[] {
  return [
    { id: 'loc-1', name: 'المقصف', category: 'canteen', isActive: true, sortOrder: 1 },
    { id: 'loc-2', name: 'الفناء الداخلي', category: 'yard_inner', isActive: true, sortOrder: 2 },
    { id: 'loc-3', name: 'الفناء الخارجي', category: 'yard_outer', isActive: true, sortOrder: 3 },
    { id: 'loc-4', name: 'الملعب', category: 'playground', isActive: true, sortOrder: 4 },
    { id: 'loc-5', name: 'الصالة الرياضية', category: 'gym', isActive: true, sortOrder: 5 },
    { id: 'loc-6', name: 'الدور الأرضي', category: 'floor', floorNumber: 0, isActive: true, sortOrder: 6 },
    { id: 'loc-7', name: 'الدور الأول', category: 'floor', floorNumber: 1, isActive: true, sortOrder: 7 },
    { id: 'loc-8', name: 'الدور الثاني', category: 'floor', floorNumber: 2, isActive: true, sortOrder: 8 },
    { id: 'loc-9', name: 'المصلى', category: 'prayer_hall', isActive: true, sortOrder: 9 },
  ];
}

// ===== Timing Integration =====
export function getTimingConfig(schoolInfo: SchoolInfo): TimingConfig {
  return schoolInfo.timing || {
    activeDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    periodDuration: 45,
    assemblyTime: '06:45',
    breaks: [],
    prayers: [],
    periodCounts: { sunday: 7, monday: 7, tuesday: 7, wednesday: 7, thursday: 7 },
  };
}

export function hasTimingData(schoolInfo: SchoolInfo): boolean {
  const timing = schoolInfo.timing;
  if (!timing) return false;
  return (timing.breaks?.length > 0 || timing.prayers?.length > 0);
}

export function getSupervisionPeriods(schoolInfo: SchoolInfo): SupervisionPeriodConfig[] {
  const timing = getTimingConfig(schoolInfo);
  const periods: SupervisionPeriodConfig[] = [];

  // Add breaks as supervision periods
  timing.breaks?.forEach((brk, idx) => {
    periods.push({
      id: `break-${brk.id}`,
      type: 'break',
      name: brk.name || `فسحة ${idx + 1}`,
      isEnabled: true,
      linkedBreakId: brk.id,
      duration: brk.duration,
    });
  });

  // Add prayers as supervision periods
  timing.prayers?.forEach((prayer) => {
    periods.push({
      id: `prayer-${prayer.id}`,
      type: 'prayer',
      name: prayer.name || 'صلاة',
      isEnabled: prayer.isEnabled,
      linkedPrayerId: prayer.id,
      duration: prayer.duration,
    });
  });

  return periods;
}

// ===== Staff Management =====

/**
 * Check if admin count (مساعد إداري) >= 5
 * to suggest excluding teachers from supervision
 */
export function shouldSuggestExcludeTeachers(admins: Admin[]): boolean {
  const adminAssistants = admins.filter(a => a.role === 'مساعد إداري');
  return adminAssistants.length >= 5;
}

/**
 * Get list of available staff (teachers + admins) for supervision
 * Excludes vice principals by default
 */
export function getAvailableStaff(
  teachers: Teacher[],
  admins: Admin[],
  exclusions: SupervisionStaffExclusion[],
  settings: SupervisionSettings
): { id: string; name: string; type: 'teacher' | 'admin'; role?: string; phone?: string }[] {
  const excluded = new Set(exclusions.filter(e => e.isExcluded).map(e => e.staffId));
  const staff: { id: string; name: string; type: 'teacher' | 'admin'; role?: string; phone?: string }[] = [];

  // Add teachers (not excluded)
  teachers.forEach(t => {
    if (!excluded.has(t.id)) {
      staff.push({ id: t.id, name: t.name, type: 'teacher', phone: t.phone });
    }
  });

  // Add admins (not excluded, VP excluded by default)
  const vpRoles = ['وكيل', 'وكيلة', 'وكيل الشؤون التعليمية', 'وكيل الشؤون المدرسية'];
  admins.forEach(a => {
    if (excluded.has(a.id)) return;
    if (settings.excludeVicePrincipals && vpRoles.some(r => a.role?.includes(r))) return;
    staff.push({ id: a.id, name: a.name, type: 'admin', role: a.role, phone: a.phone });
  });

  return staff;
}

/**
 * Get admin staff eligible for supervision (includes: موجه طلابي, رائد نشاط, محضر مختبر, مساعد إداري)
 */
export function getEligibleAdminRoles(): string[] {
  return ['موجه طلابي', 'رائد نشاط', 'محضر مختبر', 'مساعد إداري'];
}

// ===== Smart Auto-Assignment Engine =====

interface StaffScore {
  staffId: string;
  staffName: string;
  staffType: 'teacher' | 'admin';
  phone?: string;
  day: string;
  score: number; // higher = better candidate
  reasons: string[];
}

/**
 * Calculate suggested number of supervisors per day
 * (total available staff / 5 active days)
 */
export function getSuggestedCountPerDay(
  availableStaffCount: number,
  activeDaysCount: number = 5
): number {
  if (activeDaysCount === 0) return 0;
  return Math.ceil(availableStaffCount / activeDaysCount);
}

/**
 * Golden Rule Check: Each staff = 1 fixed day per week
 */
export function validateGoldenRule(assignments: SupervisionDayAssignment[]): {
  valid: boolean;
  duplicates: { staffId: string; staffName: string; days: string[] }[];
} {
  const staffDays: Record<string, { name: string; days: string[] }> = {};

  assignments.forEach(da => {
    da.staffAssignments.forEach(sa => {
      if (!staffDays[sa.staffId]) {
        staffDays[sa.staffId] = { name: sa.staffName, days: [] };
      }
      staffDays[sa.staffId].days.push(da.day);
    });
  });

  const duplicates = Object.entries(staffDays)
    .filter(([_, v]) => v.days.length > 1)
    .map(([id, v]) => ({ staffId: id, staffName: v.name, days: v.days }));

  return { valid: duplicates.length === 0, duplicates };
}

/**
 * Smart Assignment Algorithm
 * Ranks staff for each day based on:
 * 1. Free period adjacent to break/prayer
 * 2. Lowest quota that day
 * 3. Last period teacher for prayer time
 */
export function generateSmartAssignment(
  teachers: Teacher[],
  admins: Admin[],
  exclusions: SupervisionStaffExclusion[],
  settings: SupervisionSettings,
  scheduleSettings: ScheduleSettingsData,
  schoolInfo: SchoolInfo,
  periods: SupervisionPeriodConfig[],
  countPerDay?: number
): SupervisionDayAssignment[] {
  const timing = getTimingConfig(schoolInfo);
  const activeDays = timing.activeDays || DAYS.slice();
  const availableStaff = getAvailableStaff(teachers, admins, exclusions, settings);
  const staffPerDay = countPerDay || getSuggestedCountPerDay(availableStaff.length, activeDays.length);
  const timetable = scheduleSettings.timetable || {};

  // Score each staff for each day
  const allScores: StaffScore[] = [];

  availableStaff.forEach(staff => {
    activeDays.forEach(day => {
      let score = 0;
      const reasons: string[] = [];

      if (staff.type === 'teacher') {
        const teacher = teachers.find(t => t.id === staff.id);
        if (!teacher) return;

        const periodCount = timing.periodCounts?.[day] || 7;

        // Count teacher's lessons this day
        let lessonsThisDay = 0;
        let hasFreePeriods: number[] = [];

        for (let p = 1; p <= periodCount; p++) {
          const key = `${staff.id}-${day}-${p}`;
          if (timetable[key]) {
            lessonsThisDay++;
          } else {
            hasFreePeriods.push(p);
          }
        }

        // 1. Free period adjacent to break/prayer
        const breakAfterPeriods = timing.breaks?.map(b => b.afterPeriod) || [];
        const prayerAfterPeriods = timing.prayers?.filter(p => p.isEnabled).map(p => p.afterPeriod) || [];
        const supervisionPeriods = [...breakAfterPeriods, ...prayerAfterPeriods];

        supervisionPeriods.forEach(afterP => {
          // Check if free before or after the break/prayer period
          if (hasFreePeriods.includes(afterP) || hasFreePeriods.includes(afterP + 1)) {
            score += 30;
            reasons.push('فراغ محيط بالفسحة/الصلاة');
          }
        });

        // 2. Lowest quota = higher score
        const quotaScore = Math.max(0, 10 - lessonsThisDay) * 5;
        score += quotaScore;
        if (lessonsThisDay <= 3) {
          reasons.push('نصاب منخفض');
        }

        // 3. Prayer time: prefer teachers with last period
        const prayerPeriods = timing.prayers?.filter(p => p.isEnabled) || [];
        prayerPeriods.forEach(prayer => {
          const lastPeriodKey = `${staff.id}-${day}-${periodCount}`;
          if (!timetable[lastPeriodKey]) {
            // Teacher has no last period = good for prayer supervision
            score += 15;
            reasons.push('مناسب لإشراف الصلاة');
          }
        });
      } else {
        // Admins get base priority (available any day)
        score += 20;
        reasons.push('إداري متاح');
      }

      allScores.push({
        staffId: staff.id,
        staffName: staff.name,
        staffType: staff.type,
        phone: staff.phone,
        day,
        score,
        reasons,
      });
    });
  });

  // To ensure TRUE equal distribution, we must guarantee we only assign up to 
  // the mathematical limit per day, and everyone gets assigned exactly once.
  const baseQuota = Math.floor(availableStaff.length / activeDays.length);
  const remainder = availableStaff.length % activeDays.length;
  
  // Distribute quotas: first 'remainder' days get baseQuota + 1, rest get baseQuota
  const dailyQuotas: Record<string, number> = {};
  activeDays.forEach((day, index) => {
     dailyQuotas[day] = baseQuota + (index < remainder ? 1 : 0);
  });

  const assigned = new Set<string>();
  const dayAssignments: SupervisionDayAssignment[] = activeDays.map(day => ({
    day,
    staffAssignments: []
  }));

  // Sort scores descending globally
  const sortedScores = allScores.sort((a, b) => b.score - a.score);

  // Greedily pick the highest score combination that doesn't violate rules
  for (const scoreObj of sortedScores) {
    if (assigned.has(scoreObj.staffId)) continue; // Staff already assigned
    if (dailyQuotas[scoreObj.day] <= 0) continue; // Day is full
    
    // Assign
    assigned.add(scoreObj.staffId);
    dailyQuotas[scoreObj.day]--;
    
    const targetDay = dayAssignments.find(d => d.day === scoreObj.day)!;
    targetDay.staffAssignments.push({
      staffId: scoreObj.staffId,
      staffName: scoreObj.staffName,
      staffType: scoreObj.staffType,
      locationIds: [],
      periodIds: periods.filter(p => p.isEnabled).map(p => p.id),
    });
  }

  // Fallback: If any staff somehow remained unassigned (e.g., all their preferred days filled up before their turn)
  // We just put them in the first day that still has quota.
  const unassigned = availableStaff.filter(s => !assigned.has(s.id));
  unassigned.forEach(staff => {
    // Find a day that still has quota
    const availableDay = activeDays.find(day => dailyQuotas[day] > 0);
    // If we miraculously run out of quota (shouldn't happen musically), just put in first day
    const targetDayStr = availableDay || activeDays[0];
    
    if (availableDay) dailyQuotas[availableDay]--;
    
    const targetDay = dayAssignments.find(d => d.day === targetDayStr)!;
    targetDay.staffAssignments.push({
      staffId: staff.id,
      staffName: staff.name,
      staffType: staff.type,
      locationIds: [],
      periodIds: periods.filter(p => p.isEnabled).map(p => p.id),
    });
  });

  return dayAssignments;
}

// ===== Balance Check =====
export function getBalanceInfo(dayAssignments: SupervisionDayAssignment[]): {
  isBalanced: boolean;
  min: number;
  max: number;
  counts: Record<string, number>;
} {
  const counts: Record<string, number> = {};
  dayAssignments.forEach(da => {
    counts[da.day] = da.staffAssignments.length;
  });

  const values = Object.values(counts);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  return {
    isBalanced: max - min <= 1,
    min,
    max,
    counts,
  };
}

// ===== Attendance Helpers =====
export function getTodayAttendance(
  records: SupervisionAttendanceRecord[],
  date: string
): SupervisionAttendanceRecord[] {
  if (!records || !Array.isArray(records)) return [];
  return records.filter(r => r.date === date);
}

export function getAttendanceStats(
  records: SupervisionAttendanceRecord[],
  dateRange?: { start: string; end: string }
): {
  total: number;
  present: number;
  absent: number;
  excused: number;
  withdrawn: number;
  late: number;
} {
  if (!records || !Array.isArray(records)) {
    return { total: 0, present: 0, absent: 0, excused: 0, withdrawn: 0, late: 0 };
  }
  let filtered = records;
  if (dateRange) {
    filtered = records.filter(r => r.date >= dateRange.start && r.date <= dateRange.end);
  }
  return {
    total: filtered.length,
    present: filtered.filter(r => r.status === 'present').length,
    absent: filtered.filter(r => r.status === 'absent').length,
    excused: filtered.filter(r => r.status === 'excused').length,
    withdrawn: filtered.filter(r => r.status === 'withdrawn').length,
    late: filtered.filter(r => r.status === 'late').length,
  };
}

// ===== Message Generation =====
export function generateAssignmentMessage(
  staffName: string,
  staffType: 'teacher' | 'admin',
  day: string,
  locationNames: string[],
  effectiveDate?: string,
  gender: 'بنين' | 'بنات' = 'بنين'
): string {
  const isTeacher = staffType === 'teacher';
  const roleName = isTeacher 
    ? (gender === 'بنين' ? 'المعلم الفاضل' : 'المعلمة الفاضلة')
    : (gender === 'بنين' ? 'الإداري الفاضل' : 'الإدارية الفاضلة');
  
  // New Default Template:
  // المعلم الفاضل/ ( اسم المعلم يظهر هنا ) نشعركم بإسناد مهمة الإشراف اليومي لكم في يوم الأحد ، ونسأل الله لكم العون والتوفيق.
  return `${roleName}/ ${staffName} نشعركم بإسناد مهمة الإشراف اليومي لكم في يوم ${DAY_NAMES[day] || day} ، ونسأل الله لكم العون والتوفيق.`;
}

export function generateReminderMessage(
  staffName: string,
  staffType: 'teacher' | 'admin',
  day: string,
  locationNames: string[],
  gender: 'بنين' | 'بنات' = 'بنين'
): string {
  const isTeacher = staffType === 'teacher';
  const roleName = isTeacher 
    ? (gender === 'بنين' ? 'المعلم الفاضل' : 'المعلمة الفاضلة')
    : (gender === 'بنين' ? 'الإداري الفاضل' : 'الإدارية الفاضلة');
    
  // New Default Template:
  // تذكير: المعلم الفاضل/ ( اسم المعلم يظهر هنا ) ، نذكركم بموعد الإشراف اليومي لهذا اليوم ( اسم اليوم يظهر هنا ) ، شاكرين تعاونكم
  return `تذكير: ${roleName}/ ${staffName} ، نذكركم بموعد الإشراف اليومي لهذا اليوم ( ${DAY_NAMES[day] || day} ) ، شاكرين تعاونكم`;
}

// ===== Print/Export Helpers =====
export function getSupervisionPrintData(
  data: SupervisionScheduleData,
  schoolInfo: SchoolInfo
): {
  title: string;
  schoolName: string;
  semester: string;
  days: {
    dayName: string;
    followUpSupervisor: string;
    supervisors: { name: string; locations: string; signature: string }[];
  }[];
  footerText: string;
} {
  const activeDays = getTimingConfig(schoolInfo).activeDays || DAYS.slice();

  return {
    title: 'جدول الإشراف اليومي',
    schoolName: schoolInfo.schoolName,
    semester: schoolInfo.semesters?.find(s => s.id === schoolInfo.currentSemesterId)?.name || 'الفصل الدراسي',
    days: activeDays.map(day => {
      const da = data.dayAssignments.find(d => d.day === day);
      return {
        dayName: DAY_NAMES[day],
        followUpSupervisor: da?.followUpSupervisorName || '',
        supervisors: (da?.staffAssignments || []).map(sa => ({
          name: sa.staffName,
          locations: sa.locationIds
            .map(lid => data.locations.find(l => l.id === lid)?.name || '')
            .filter(Boolean)
            .join('، '),
          signature: '',
        })),
      };
    }),
    footerText: data.footerText || `يبدأ العمل بهذا الجدول من يوم ${DAY_NAMES[activeDays[0]]} الموافق ${data.effectiveDate || '___/___/______'}`,
  };
}

// ===== Default Supervision Data =====
export function getDefaultSupervisionData(schoolInfo: SchoolInfo): SupervisionScheduleData {
  return {
    locations: getDefaultLocations(),
    periods: getSupervisionPeriods(schoolInfo),
    exclusions: [],
    dayAssignments: [],
    attendanceRecords: [],
    settings: {
      autoExcludeTeachersWhen5Admins: false,
      excludeVicePrincipals: false,
      enableAutoAssignment: true,
      sharedSchoolMode: 'unified',
      reminderMessageTemplate: '',
      assignmentMessageTemplate: '',
      autoSendReminder: false,       // يدوي بشكل افتراضي
      reminderSendTime: '07:00',
      reminderSendChannel: 'whatsapp',
    },
    isApproved: false,
    footerText: '',
  };
}

// ===== Schedule Change Detection =====
export function detectScheduleChanges(
  oldTimetable: TimetableData | undefined,
  newTimetable: TimetableData | undefined,
  dayAssignments: SupervisionDayAssignment[]
): { hasChanges: boolean; affectedStaff: { staffId: string; staffName: string; day: string }[] } {
  if (!oldTimetable || !newTimetable) return { hasChanges: false, affectedStaff: [] };

  const affected: { staffId: string; staffName: string; day: string }[] = [];
  const assignedStaffByDay: Record<string, SupervisionStaffAssignment[]> = {};

  dayAssignments.forEach(da => {
    assignedStaffByDay[da.day] = da.staffAssignments;
  });

  // Check if any assigned supervisor's free periods changed
  DAYS.forEach(day => {
    const staff = assignedStaffByDay[day] || [];
    staff.forEach(sa => {
      if (sa.staffType !== 'teacher') return;
      for (let p = 1; p <= 7; p++) {
        const key = `${sa.staffId}-${day}-${p}`;
        const oldSlot = oldTimetable[key];
        const newSlot = newTimetable[key];
        if ((oldSlot && !newSlot) || (!oldSlot && newSlot)) {
          affected.push({ staffId: sa.staffId, staffName: sa.staffName, day });
          break;
        }
      }
    });
  });

  return { hasChanges: affected.length > 0, affectedStaff: affected };
}
