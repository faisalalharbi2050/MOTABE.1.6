/**
 * Daily Duty Utility Functions
 * محرك الإسناد الذكي للمناوبة اليومية
 */

import {
  Teacher,
  Admin,
  SchoolInfo,
  TimingConfig,
  ScheduleSettingsData,
  TimetableData,
  DutyStaffExclusion,
  DutyDayAssignment,
  DutyStaffAssignment,
  DutyScheduleData,
  DutySettings,
  DutyReportRecord,
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

export function hasDutyTimingData(schoolInfo: SchoolInfo): boolean {
  const timing = schoolInfo.timing;
  if (!timing) return false;
  return Boolean(timing.periodCounts);
}

// ===== Staff Management =====

/**
 * Check if admin count (مساعد إداري etc) >= 5
 * to suggest excluding teachers from duty
 */
export function canSuggestExcludeTeachers(admins: Admin[]): boolean {
  const adminAssistants = admins.filter(a => getEligibleDutyAdminRoles().includes(a.role || ''));
  return adminAssistants.length >= 5;
}

/**
 * Get list of available staff (teachers + admins) for duty
 * Excludes vice principals and guards based on settings
 */
export function getAvailableStaffForDuty(
  teachers: Teacher[],
  admins: Admin[],
  exclusions: DutyStaffExclusion[],
  settings: DutySettings
): { id: string; name: string; type: 'teacher' | 'admin'; role?: string; phone?: string }[] {
  const excluded = new Set(exclusions.filter(e => e.isExcluded).map(e => e.staffId));
  const staff: { id: string; name: string; type: 'teacher' | 'admin'; role?: string; phone?: string }[] = [];

  // Add teachers if not automatically excluded by "autoExcludeTeachersWhen5Admins" (unless they are specifically chosen)
  // Or just rely on settings.
  const excludeAllTeachers = settings.autoExcludeTeachersWhen5Admins && canSuggestExcludeTeachers(admins);

  if (!excludeAllTeachers) {
    teachers.forEach(t => {
      if (!excluded.has(t.id)) {
        staff.push({ id: t.id, name: t.name, type: 'teacher', phone: t.phone });
      }
    });
  }

  // Add admins
  const vpRoles = ['وكيل', 'وكيلة', 'وكيل الشؤون التعليمية', 'وكيل الشؤون المدرسية'];
  const guardRoles = ['حارس', 'حارسة'];
  
  admins.forEach(a => {
    if (excluded.has(a.id)) return;
    if (settings.excludeVicePrincipals && vpRoles.some(r => a.role?.includes(r))) return;
    if (settings.excludeGuards && guardRoles.some(r => a.role?.includes(r))) return;
    
    staff.push({ id: a.id, name: a.name, type: 'admin', role: a.role, phone: a.phone });
  });

  return staff;
}

/**
 * Get admin staff eligible for Duty
 */
export function getEligibleDutyAdminRoles(): string[] {
  return ['موجه طلابي', 'رائد نشاط', 'محضر مختبر', 'مساعد إداري'];
}

// ===== Smart Auto-Assignment Engine =====

export interface DutyDateInfo {
  date: string; // YYYY-MM-DD
  dayKey: string; // sunday, monday...
  weekId: string;
  weekName: string;
  isOfficialLeave?: boolean;
}

const DUTY_WEEK_NAMES = [
  'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
  'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر',
  'التاسع عشر', 'العشرون',
];

const getDutyWeekName = (weekNumber: number) => `الأسبوع ${DUTY_WEEK_NAMES[weekNumber - 1] || weekNumber}`;

export function generateDutyDates(
  schoolInfo: SchoolInfo,
  selectedWeeks?: number[],
  options?: { includeOfficialLeaves?: boolean }
): DutyDateInfo[] {
  const timing = getTimingConfig(schoolInfo);
  const activeDays = timing.activeDays || DAYS.slice();
  const currentSemester = schoolInfo.semesters?.find(s => s.isCurrent) || schoolInfo.semesters?.[0];
  const selectedWeekSet = selectedWeeks ? new Set(selectedWeeks) : null;

  const includeOfficialLeaves = options?.includeOfficialLeaves === true;

  if (!currentSemester || !currentSemester.startDate || !currentSemester.endDate) {
    // Fallback: single generic week if no semester dates
    return activeDays.map(day => ({
      date: '',
      dayKey: day,
      weekId: 'week-1',
      weekName: getDutyWeekName(1)
    }));
  }

  const parseGregorianDate = (str: string): Date | null => {
    if (!str) return null;
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      // Sanity-check: if year < 1800, it's likely a Hijri date parsed as Gregorian
      if (d.getFullYear() < 1800) {
        // Estimate Gregorian: Hijri year 1446 = approx 2024-2025
        // Rough conversion: Gregorian = Hijri + 579 years (approx)
        const parts = str.split('-');
        if (parts.length === 3) {
          const hijriYear = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          const gregYear = hijriYear + 579;
          const approx = new Date(gregYear, month - 1, day);
          if (!isNaN(approx.getTime())) return approx;
        }
        return null;
      }
      return d;
    }
    return null;
  };

  let startDate = parseGregorianDate(currentSemester.startDate || '');
  let endDate = parseGregorianDate(currentSemester.endDate || '');

  // If we still can't get valid dates, generate from weeksCount using today as anchor
  if (!startDate || !endDate) {
    const totalWeeks = currentSemester.weeksCount || 18;
    // Start from first Sunday of this month as best estimate
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const daysToSunday = dayOfWeek === 0 ? 0 : (7 - dayOfWeek);
    startDate = new Date(today);
    startDate.setDate(today.getDate() - (7 * Math.floor(totalWeeks / 2))); // center around today
    // Find the next Sunday from startDate
    while (startDate.getDay() !== 0) startDate.setDate(startDate.getDate() + 1);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + totalWeeks * 7);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);


  const holidays = new Set(currentSemester.holidays || []);
  const dates: DutyDateInfo[] = [];
  let currentDate = new Date(startDate);

  let weekCounter = 1;
  let hasProcessedDays = false;
  let safetyCounter = 0; // Prevent infinite loops
  const MAX_DAYS = 365;

  const totalWeeksExpected = currentSemester.weeksCount || 18;


  const getDayKey = (d: Date): string => {
    const daysArr = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return daysArr[d.getDay()];
  };

  while (currentDate <= endDate && safetyCounter < MAX_DAYS) {
    const dayKey = getDayKey(currentDate);
    // Use local string to ensure date doesn't shift backward
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

    // Saudi week starts on Sunday. Increment week counter if it's Sunday and we've already processed previous days.
    if (dayKey === 'sunday' && hasProcessedDays) {
      weekCounter++;
    }

    const isOfficialLeave = holidays.has(dateStr);
    if (activeDays.includes(dayKey) && (!isOfficialLeave || includeOfficialLeaves) && (!selectedWeekSet || selectedWeekSet.has(weekCounter))) {
      dates.push({
        date: dateStr,
        dayKey,
        weekId: `week-${weekCounter}`,
        weekName: getDutyWeekName(weekCounter),
        isOfficialLeave,
      });
      hasProcessedDays = true;
    } else if (dayKey === 'sunday' || dayKey === 'monday' || dayKey === 'tuesday' || dayKey === 'wednesday' || dayKey === 'thursday') {
      // Even if it's a holiday, we mark that we've processed days so week logic doesn't break
      hasProcessedDays = true; 
    }

    currentDate.setDate(currentDate.getDate() + 1);
    safetyCounter++;
  }

  // Safety fallback if loop generated zero valid days but we have a weeksCount
  if (dates.length === 0 && totalWeeksExpected > 0) {
     for (let w = 1; w <= totalWeeksExpected; w++) {
       if (selectedWeekSet && !selectedWeekSet.has(w)) continue;
       activeDays.forEach(day => {
         dates.push({
           date: '',
           dayKey: day,
           weekId: `week-${w}`,
           weekName: getDutyWeekName(w)
         });
       });
     }
  }

  return dates;
}

interface DutyStaffScore {
  staffId: string;
  staffName: string;
  staffType: 'teacher' | 'admin';
  phone?: string;
  day: string;
  score: number; // higher = better candidate
  reasons: string[];
  lastPeriod?: number; 
}

/**
 * Calculate suggested number of duty officers per day
 */
export function getSuggestedDutyCountPerDay(
  availableStaffCount: number,
  activeDaysCount: number = 5
): number {
  if (activeDaysCount === 0) return 0;
  return Math.ceil(availableStaffCount / activeDaysCount);
}

/**
 * Golden Rule Check: Each staff assigned evenly
 */
export function validateDutyGoldenRule(assignments: DutyDayAssignment[]): {
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
 * Detect Early Exit Cases
 */
export function getEarlyExitStaff(
  timetable: TimetableData, 
  teachers: Teacher[], 
  timing: TimingConfig
): { staffId: string; maxPeriodAcrossWeek: number }[] {
  const result: { staffId: string; maxPeriodAcrossWeek: number }[] = [];
  const activeDays = timing.activeDays || DAYS.slice();
  
  teachers.forEach(teacher => {
    let maxPeriod = 0;
    activeDays.forEach(day => {
      const dayMaxPeriod = timing.periodCounts?.[day] || 7;
      for (let p = 1; p <= dayMaxPeriod; p++) {
        const key = `${teacher.id}-${day}-${p}`;
        if (timetable[key]) {
          if (p > maxPeriod) maxPeriod = p;
        }
      }
    });
    
    // Check if the overall max period is significantly earlier than typical end
    const generalMaxPeriod = Math.max(...Object.values(timing.periodCounts || { sunday: 7 }));
    if (maxPeriod > 0 && maxPeriod < generalMaxPeriod - 1) { // Finish 2+ periods early everyday
      result.push({ staffId: teacher.id, maxPeriodAcrossWeek: maxPeriod });
    }
  });
  
  return result;
}

/**
 * Smart Assignment Algorithm for Daily Duty
 * Ranks staff based on:
 * 1. Has class in the final period of that day (HUGE PLUS for duty fairness)
 */
export function generateSmartDutyAssignment(
  teachers: Teacher[],
  admins: Admin[],
  exclusions: DutyStaffExclusion[],
  settings: DutySettings,
  scheduleSettings: ScheduleSettingsData,
  schoolInfo: SchoolInfo,
  existingCounts: Record<string, number> = {},
  countPerDay?: number
): { assignments: DutyDayAssignment[]; weekAssignments: import('../types').DutyWeekAssignment[]; alerts: string[]; newCounts: Record<string, number> } {
  const timing = getTimingConfig(schoolInfo);
  const dates = generateDutyDates(schoolInfo, settings.selectedWeeks, { includeOfficialLeaves: true });
  const availableStaff = getAvailableStaffForDuty(teachers, admins, exclusions, settings);
  // Default to 1 per day if not provided, for across the semester
  const staffPerDay = countPerDay || settings.suggestedCountPerDay || 1;
  const timetable = scheduleSettings.timetable || {};
  const alerts: string[] = [];
  const activeCounts = { ...existingCounts };

  // Check early exit alerts
  const earlyExitStaff = getEarlyExitStaff(timetable, teachers, timing);
  earlyExitStaff.forEach(info => {
    const teacher = teachers.find(t => t.id === info.staffId);
    if (teacher && !exclusions.find(e => e.staffId === teacher.id && e.isExcluded)) {
      alerts.push(`المعلم ${teacher.name} ينتهي جدوله مبكراً جداً طوال الأسبوع (أقصى حصة له هي ${info.maxPeriodAcrossWeek}). يوصى بمراجعة إسناده يدوياً.`);
    }
  });

  const weekAssignmentsMap: Record<string, import('../types').DutyWeekAssignment> = {};
  
  // Group dates by week
  dates.forEach(d => {
    if (!weekAssignmentsMap[d.weekId]) {
      weekAssignmentsMap[d.weekId] = {
        weekId: d.weekId,
        weekName: d.weekName,
        startDate: d.date, // Will be updated
        endDate: d.date,   // Will be updated
        dayAssignments: []
      };
    }
    weekAssignmentsMap[d.weekId].endDate = d.date; // Continuously update to get the last date of the week
  });

  // For each week, we calculate scores dynamically because "Justice Counters" change week by week
  const weekIds = Object.keys(weekAssignmentsMap);

  for (const weekId of weekIds) {
    const weekDates = dates.filter(d => d.weekId === weekId);
    if (weekDates.length === 0) continue;

    weekAssignmentsMap[weekId].startDate = weekDates[0].date;
    weekAssignmentsMap[weekId].endDate = weekDates[weekDates.length - 1].date;

    // Track assigned staff THIS week to avoid duplicates in the same week
    const assignedThisWeek = new Set<string>();

    weekDates.forEach(dateInfo => {
      const dayKey = dateInfo.dayKey;
      let dailyQuota = staffPerDay;

      const dayAssignment: DutyDayAssignment = {
        day: dayKey,
        date: dateInfo.date,
        staffAssignments: [],
        isOfficialLeave: dateInfo.isOfficialLeave,
        officialLeaveText: dateInfo.isOfficialLeave ? 'إجازة رسمية' : undefined,
      };

      if (dateInfo.isOfficialLeave) {
        weekAssignmentsMap[weekId].dayAssignments.push(dayAssignment);
        return;
      }

      // Score all available staff for THIS specific day
      const dailyScores: DutyStaffScore[] = [];

      availableStaff.forEach(staff => {
        // Skip if assigned this week already
        if (assignedThisWeek.has(staff.id)) return;

        let score = 0;
        const reasons: string[] = [];
        const dayMaxPeriod = timing.periodCounts?.[dayKey] || 7;
        let lastPeriodForStaff = 0;

        // Apply Justice Counter Modifier (Negative weight for being assigned too much)
        const pastAssignments = activeCounts[staff.id] || 0;
        // Decrease score heavily for every past assignment
        score -= pastAssignments * 150; 

        if (staff.type === 'teacher') {
           let hasClassInLastPeriod = false;
           
           for (let p = 1; p <= dayMaxPeriod; p++) {
             const key = `${staff.id}-${dayKey}-${p}`;
             if (timetable[key]) {
               lastPeriodForStaff = p;
             }
           }

           if (lastPeriodForStaff === dayMaxPeriod) {
             hasClassInLastPeriod = true;
             score += 100; // Prioritize those who stay till the end naturally
             reasons.push(`ينتهي جدوله في الحصة الأخيرة (${dayMaxPeriod})`);
           } else if (lastPeriodForStaff === dayMaxPeriod - 1) {
             score += 50; 
             reasons.push(`ينتهي جدوله متأخراً (الحصة ${lastPeriodForStaff})`);
           } else if (lastPeriodForStaff > 0) {
             // He has classes, but finishes early. Negative score to save him for manual or specific cases unless needed
             score -= 20;
             reasons.push(`ينتهي مبكراً جداً في هذا اليوم (الحصة ${lastPeriodForStaff})`);
           } else {
             // No classes at all
             score += 5; 
             reasons.push(`ليس لديه حصص هذا اليوم`);
           }
        } else {
           // Admins
           score += 80;
           reasons.push('إداري متواجد لنهاية الدوام');
           lastPeriodForStaff = dayMaxPeriod;
        }

        dailyScores.push({
          staffId: staff.id,
          staffName: staff.name,
          staffType: staff.type,
          phone: staff.phone,
          day: dayKey,
          score,
          reasons,
          lastPeriod: lastPeriodForStaff
        });
      });

      // Sort staff by score for this day
      dailyScores.sort((a, b) => b.score - a.score);

      for (const scoreObj of dailyScores) {
        if (dailyQuota <= 0) break;
        
        assignedThisWeek.add(scoreObj.staffId);
        activeCounts[scoreObj.staffId] = (activeCounts[scoreObj.staffId] || 0) + 1;
        dailyQuota--;
        
        dayAssignment.staffAssignments.push({
          staffId: scoreObj.staffId,
          staffName: scoreObj.staffName,
          staffType: scoreObj.staffType,
          lastPeriod: scoreObj.lastPeriod,
          isManual: false
        });
      }

      weekAssignmentsMap[weekId].dayAssignments.push(dayAssignment);
    });
  }

  // Flatten for older components compatibility, though they should ideally use weekAssignments
  const flatDayAssignments: DutyDayAssignment[] = [];
  Object.values(weekAssignmentsMap).forEach(wa => {
    flatDayAssignments.push(...wa.dayAssignments);
  });

  return { 
    assignments: flatDayAssignments, 
    weekAssignments: Object.values(weekAssignmentsMap),
    alerts,
    newCounts: activeCounts 
  };
}

// ===== Default Data =====
export function getDefaultDutyData(schoolInfo: SchoolInfo): DutyScheduleData {
  return {
    exclusions: [],
    dayAssignments: [],
    reports: [],
    settings: {
      autoExcludeTeachersWhen5Admins: false,
      excludeVicePrincipals: true,
      excludeGuards: true,
      enableAutoAssignment: true,
      sharedSchoolMode: 'unified',
      suggestedCountPerDay: 1,
      reminderMessageTemplate: '',
      assignmentMessageTemplate: '',
      reminderSendTime: '07:00',
      autoSendLinks: false,
      reminderSendChannel: 'whatsapp',
    },
    isApproved: false,
  };
}

export function generateDutyAssignmentMessage(
  staffName: string,
  staffType: 'teacher' | 'admin',
  day: string,
  dateFormatted: string,
  gender: 'بنين' | 'بنات' = 'بنين'
): string {
  const isTeacher = staffType === 'teacher';
  const roleName = isTeacher 
    ? (gender === 'بنين' ? 'المعلم الفاضل' : 'المعلمة الفاضلة')
    : (gender === 'بنين' ? 'الإداري الفاضل' : 'الإدارية الفاضلة');
  
  return `${roleName}/ ${staffName}، نشعركم بإسناد مهمة المناوبة اليومية في يوم ${DAY_NAMES[day] || day} الموافق ${dateFormatted}، نسأل الله لكم العون والتوفيق.`;
}

export function generateDutyReminderMessage(
  staffName: string,
  staffType: 'teacher' | 'admin',
  day: string,
  dateFormatted: string,
  gender: 'بنين' | 'بنات' = 'بنين'
): string {
  const isTeacher = staffType === 'teacher';
  const roleName = isTeacher 
    ? (gender === 'بنين' ? 'المعلم الفاضل' : 'المعلمة الفاضلة')
    : (gender === 'بنين' ? 'الإداري الفاضل' : 'الإدارية الفاضلة');
    
  // Link to be appended later or inserted here
  return `${roleName}/ ${staffName} نذكركم بموعد المناوبة اليومية لهذا اليوم (${DAY_NAMES[day] || day}) الموافق ${dateFormatted}، شاكرين تعاونكم.`;
}

export function getDutyBalanceInfo(dayAssignments: DutyDayAssignment[]): {
  isBalanced: boolean;
  min: number;
  max: number;
  counts: Record<string, number>;
} {
  const counts: Record<string, number> = {};
  dayAssignments.forEach(da => {
    if (da.isOfficialLeave || da.isDisabled) return;
    da.staffAssignments.forEach(sa => {
       counts[sa.staffId] = (counts[sa.staffId] || 0) + 1;
    });
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

// ===== Reporting & Stats =====
export function getTodayDutyReports(
  reports: DutyReportRecord[],
  date: string
): DutyReportRecord[] {
  return reports.filter(r => r.date === date);
}

export function getDutyStats(
  reports: DutyReportRecord[],
  dateRange?: { start: string; end: string }
): {
  total: number;
  present: number;
  absent: number;
  excused: number;
  withdrawn: number;
  late: number;
  submitted: number;
} {
  let filtered = reports;
  if (dateRange) {
    filtered = reports.filter(r => r.date >= dateRange.start && r.date <= dateRange.end);
  }
  return {
    total: filtered.length,
    present: filtered.filter(r => r.status === 'present').length,
    absent: filtered.filter(r => r.status === 'absent').length,
    excused: filtered.filter(r => r.status === 'excused').length,
    withdrawn: filtered.filter(r => r.status === 'withdrawn').length,
    late: filtered.filter(r => r.status === 'late').length,
    submitted: filtered.filter(r => r.isSubmitted).length,
  };
}

// ===== Print/Export Helpers =====
export function getDutyPrintData(
  data: DutyScheduleData,
  schoolInfo: SchoolInfo
): {
  title: string;
  schoolName: string;
  semester: string;
  weeks: {
    weekName: string;
    startDate: string;
    endDate: string;
    days: {
      date: string;
      dayName: string;
      statusText?: string;
      supervisors: { name: string; type: string; lastPeriod?: number; signature: string }[];
    }[];
  }[];
  footerText: string;
} {
  const activeDays = getTimingConfig(schoolInfo).activeDays || DAYS.slice();

  if (data.weekAssignments && data.weekAssignments.length > 0) {
    return {
      title: 'جدول المناوبة اليومية',
      schoolName: schoolInfo.schoolName,
      semester: schoolInfo.semesters?.find(s => s.id === schoolInfo.currentSemesterId)?.name || 'الفصل الدراسي',
      weeks: data.weekAssignments.map(wa => ({
        weekName: wa.weekName,
        startDate: wa.startDate,
        endDate: wa.endDate,
        days: wa.dayAssignments.map(da => ({
          date: da.date || '',
          dayName: DAY_NAMES[da.day],
          statusText: da.isDisabled ? 'غير مفعل' : da.isOfficialLeave ? (da.officialLeaveText || 'إجازة رسمية') : da.isRemoteWork ? 'العمل عن بعد – مدرستي' : undefined,
          supervisors: (da.staffAssignments || []).map(sa => ({
             name: sa.staffName,
             type: sa.staffType === 'teacher' ? 'معلم' : 'إداري',
             lastPeriod: sa.lastPeriod,
             signature: sa.signatureData || '',
          })),
        }))
      })),
      footerText: data.footerText || `يبدأ العمل بهذا الجدول من يوم ${DAY_NAMES[activeDays[0]]} الموافق ${data.effectiveDate || '___/___/______'}`,
    };
  }

  return {
    title: 'جدول المناوبة اليومية',
    schoolName: schoolInfo.schoolName,
    semester: schoolInfo.semesters?.find(s => s.id === schoolInfo.currentSemesterId)?.name || 'الفصل الدراسي',
    weeks: [{
      weekName: '',
      startDate: '',
      endDate: '',
      days: activeDays.map(day => {
        const da = data.dayAssignments.find(d => d.day === day);
        return {
          date: '',
          dayName: DAY_NAMES[day],
          statusText: da?.isDisabled ? 'غير مفعل' : da?.isOfficialLeave ? (da.officialLeaveText || 'إجازة رسمية') : da?.isRemoteWork ? 'العمل عن بعد – مدرستي' : undefined,
          supervisors: (da?.staffAssignments || []).map(sa => ({
             name: sa.staffName,
             type: sa.staffType === 'teacher' ? 'معلم' : 'إداري',
             lastPeriod: sa.lastPeriod,
             signature: sa.signatureData || '',
          })),
        };
      })
    }],
    footerText: data.footerText || `يبدأ العمل بهذا الجدول من يوم ${DAY_NAMES[activeDays[0]]} الموافق ${data.effectiveDate || '___/___/______'}`,
  };
}
