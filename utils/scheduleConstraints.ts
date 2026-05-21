// Schedule Constraints Engine
// Validation, deadlock detection, and distribution logic

import { Subject, Teacher, SubjectConstraint, TeacherConstraint, ScheduleSettingsData, SharedSchool } from '../types';

export interface ValidationWarning {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  suggestion?: string;
  relatedId?: string;
  type?: 'subject' | 'teacher' | 'general';
}

const getDayArabic = (day: string) => {
  switch(day?.toLowerCase()) {
    case 'sunday': return 'الأحد';
    case 'monday': return 'الإثنين';
    case 'tuesday': return 'الثلاثاء';
    case 'wednesday': return 'الأربعاء';
    case 'thursday': return 'الخميس';
    case 'friday': return 'الجمعة';
    case 'saturday': return 'السبت';
    default: return day;
  }
};

// ======== Subject Auto-Constraints ========

export function getMaxDailyPeriodsForSubject(periodsPerClass: number, weekDays: number): number {
  return periodsPerClass <= weekDays ? 1 : 2;
}

export const MAX_SAME_SLOT_PER_WEEK = 2;

export function calculateQuotaDistribution(periodsPerClass: number, weekDays: number): { singleDays: number; doubleDays: number } {
  if (periodsPerClass <= weekDays) return { singleDays: periodsPerClass, doubleDays: 0 };
  const doubleDays = periodsPerClass - weekDays;
  const singleDays = weekDays - doubleDays;
  return { singleDays: Math.max(0, singleDays), doubleDays: Math.max(0, doubleDays) };
}

export function describeDistribution(periodsPerClass: number, weekDays: number): string {
  const { singleDays, doubleDays } = calculateQuotaDistribution(periodsPerClass, weekDays);
  if (doubleDays === 0) return `${singleDays} أيام × حصة واحدة`;
  const parts: string[] = [];
  if (singleDays > 0) parts.push(`${singleDays} ${singleDays === 1 ? 'يوم' : 'أيام'} × 1`);
  if (doubleDays > 0) parts.push(`${doubleDays} ${doubleDays === 1 ? 'يوم' : 'أيام'} × 2`);
  return parts.join(' + ');
}

// ======== Substitution Balance ========

export function calculateSubstitutionBalance(
  teachers: Teacher[], maxTotalQuota: number, totalWeeklyPeriods: number, fixedPerPeriod: number
): { available: number; required: number; deficit: number; suggestedMax: number } {
  const totalGaps = teachers.reduce((sum, t) => sum + Math.max(0, maxTotalQuota - (t.quotaLimit || 0)), 0);
  const availablePerPeriod = totalWeeklyPeriods > 0 ? Math.floor(totalGaps / totalWeeklyPeriods) : 0;
  return {
    available: availablePerPeriod,
    required: fixedPerPeriod,
    deficit: Math.max(0, fixedPerPeriod - availablePerPeriod),
    suggestedMax: availablePerPeriod
  };
}

// ======== Deadlock Detection ========

export function validateAllConstraints(
  settings: ScheduleSettingsData, subjects: Subject[], teachers: Teacher[],
  weekDays: number, periodsPerDay: number, activeDays: string[], totalClasses: number = 0,
  sharedSchools: SharedSchool[] = []
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // 1. Subject constraints
  for (const sc of settings.subjectConstraints) {
    const subject = subjects.find(s => s.id === sc.subjectId);
    if (!subject) continue;
    const availableSlots = periodsPerDay - sc.excludedPeriods.length;
    const maxDaily = getMaxDailyPeriodsForSubject(subject.periodsPerClass, weekDays);
    if (availableSlots < maxDaily) {
      warnings.push({
        id: `subj-excl-${sc.subjectId}`, level: 'error',
        message: `مادة "${subject.name}": الحصص المتاحة (${availableSlots}) أقل من المطلوب (${maxDaily})`,
        suggestion: `قلّل الاستثناءات إلى ${periodsPerDay - maxDaily} كحد أقصى`,
        relatedId: sc.subjectId,
        type: 'subject'
      });
    }
    if (sc.preferredPeriods.length > 0 && sc.excludedPeriods.some(p => sc.preferredPeriods.includes(p))) {
      warnings.push({
        id: `subj-conflict-${sc.subjectId}`, level: 'warning',
        message: `مادة "${subject.name}": تعارض بين المستثناة والمفضلة`,
        suggestion: 'أزل الحصص المتعارضة', relatedId: sc.subjectId, type: 'subject'
      });
    }
    if (sc.enableDoublePeriods && subject.periodsPerClass % 2 !== 0) {
      warnings.push({
        id: `subj-double-${sc.subjectId}`, level: 'warning',
        message: `مادة "${subject.name}": التتابع مفعّل لكن النصاب (${subject.periodsPerClass}) فردي`,
        suggestion: 'يعمل بشكل أفضل مع النصاب الزوجي', relatedId: sc.subjectId, type: 'subject'
      });
    }
  }

  // 2. Teacher constraints
  let totalMaxLastPeriods = 0;
  let totalMaxFirstPeriods = 0;
  let teachersWithLastConstraint = 0;
  let teachersWithFirstConstraint = 0;

  for (const tc of settings.teacherConstraints) {
    const teacher = teachers.find(t => t.id === tc.teacherId);
    if (!teacher) continue;

    // Track global edge constraints
    if (tc.maxLastPeriods !== undefined) {
      totalMaxLastPeriods += tc.maxLastPeriods;
      teachersWithLastConstraint++;
    } else {
      totalMaxLastPeriods += 5; // Default assumption if not set
    }
    if (tc.maxFirstPeriods !== undefined) {
      totalMaxFirstPeriods += tc.maxFirstPeriods;
      teachersWithFirstConstraint++;
    } else {
      totalMaxFirstPeriods += 5; // Default assumption
    }

    // Shared Slots Calculation
    const sharedBusySlots: Set<string> = new Set();
    if (teacher.sharedWithSchools && teacher.sharedWithSchools.length > 0) {
        teacher.sharedWithSchools.forEach(schId => {
            const sch = sharedSchools.find(s => s.id === schId);
            if (sch && sch.timetable) {
                Object.values(sch.timetable).forEach(slot => {
                    // Assuming teacherId is uniform across system, or we need a mapping. 
                    // For now assuming same ID or Name.
                    // If slot.teacherId === teacher.id ...
                    // Wait, usually IDs differ. But let's assume strict ID match for now as per prompt instructions regarding "Shared School".
                    if (slot.teacherId === teacher.id) {
                         // We need day and period from the key usually, but slot object doesn't have it?
                         // TimetableData is Record<string, Slot>. Key is "teacherId-day-period".
                         // We need to parse keys of sch.timetable.
                    }
                });
                // Optimised loop
                Object.entries(sch.timetable).forEach(([key, slot]) => {
                    if (slot.teacherId === teacher.id) {
                         // key format: "teacherId-day-period"
                         const parts = key.split('-');
                         if (parts.length >= 3) {
                             const day = parts[1];
                             const period = parseInt(parts[2]);
                             sharedBusySlots.add(`${day}-${period}`);
                         }
                    }
                });
            }
        });
    }

    // Calculate real available slots considering Early Exit
    let totalWeeklyAvailable = 0;

    for (const day of activeDays) {
      const excludedSlots = tc.excludedSlots[day] || [];
      const limits = tc.dailyLimits?.[day];
      // Early Exit Logic
      let earlyExitPeriod: number | undefined;
      
      if (tc.earlyExitMode === 'auto') {
          // In auto mode, we don't know the exact day yet, but we know ONE day will have early exit.
          // For validation purposes, we assume the WORST case for this specific day?
          // No, 'auto' means the generator picks the best day.
          // We should validate feasibility globally, not per day here.
          // However, we need to calculate 'dayAvailable' for this specific day loop.
          // If we are just validating constraints, we treat 'auto' as "Potential early exit".
          // BUT, to avoid false positives in daily checks, we act as if there is NO early exit on this specific day
          // unless we are validating the global quota.
          earlyExitPeriod = undefined; 
      } else {
          earlyExitPeriod = tc.earlyExit?.[day];
      }
      
      let dayAvailable = periodsPerDay;

      // 1. Calculate base availability (considering excluded slots)
      // If early exit is set (Manual), periods AFTER earlyExitPeriod are effectively excluded
      
      const effectiveEnd = earlyExitPeriod !== undefined ? Math.min(periodsPerDay, earlyExitPeriod) : periodsPerDay;
      const effectiveStart = 1;

      // Count excluded slots within the effective range
      let excludedInEffectiveRange = excludedSlots.filter(p => p >= effectiveStart && p <= effectiveEnd).length;
      
      // Add Shared School Busy Slots
      // Check for this specific day
      // Valid periods are 1..periodsPerDay
      for (let p = 1; p <= periodsPerDay; p++) {
          if (sharedBusySlots.has(`${day}-${p}`)) {
              // If not already excluded, count it
              if (!excludedSlots.includes(p)) {
                 excludedInEffectiveRange++;
              }
          }
      }
      
      dayAvailable = Math.max(0, effectiveEnd - effectiveStart + 1 - excludedInEffectiveRange);

      // Validation warnings regarding limits vs availability (Skip if auto for now, or check generic feasibility?)
      // If auto, we can't check specific day conflicts easily here without assuming a day.
      
      // Validation: Daily Window (Range)
      if (limits?.windowStart !== undefined && limits?.windowEnd !== undefined) {
          // Intersection of (1..effectiveEnd) and (windowStart..windowEnd)
          const windowStart = Math.max(1, limits.windowStart);
          const windowEnd = Math.min(effectiveEnd, limits.windowEnd);
          
          if (windowStart > windowEnd) {
             dayAvailable = 0;
             if (earlyExitPeriod !== undefined) {
                 warnings.push({
                   id: `window-early-exit-mismatch-${teacher.id}-${day}`, level: 'error',
                   message: `"${teacher.name}" يوم ${getDayArabic(day)}: نافذة التواجد (${limits.windowStart}-${limits.windowEnd}) تتعارض مع الخروج المبكر (بعد الحصة ${earlyExitPeriod})`,
                   suggestion: 'عدل فترة الخروج أو وسّع النافذة', relatedId: tc.teacherId, type: 'teacher'
                 });
             }
          } else {
             const slotsInWindow = windowEnd - windowStart + 1;
             const excludedInWindow = excludedSlots.filter(p => p >= windowStart && p <= windowEnd).length;
             dayAvailable = Math.max(0, slotsInWindow - excludedInWindow);
          }
      }

      totalWeeklyAvailable += dayAvailable;

      // Validation warnings regarding limits vs availability
      if (limits) {
        if (dayAvailable < limits.min) {
            warnings.push({
            id: `teacher-min-${tc.teacherId}-${day}`, level: 'error',
            message: `"${teacher.name}" يوم ${getDayArabic(day)}: الحد الأدنى المطلوب (${limits.min}) أكبر من الحصص المتاحة فعلياً (${dayAvailable})`,
            suggestion: `قلّل الحد الأدنى أو خفف قيود الخروج/النافذة`, relatedId: tc.teacherId, type: 'teacher'
            });
        }
        
        if (limits.min > limits.max) {
             warnings.push({
            id: `teacher-minmax-${tc.teacherId}-${day}`, level: 'error',
            message: `"${teacher.name}" يوم ${getDayArabic(day)}: الحد الأدنى (${limits.min}) أكبر من الأقصى (${limits.max})`,
            suggestion: 'صحّح القيم', relatedId: tc.teacherId, type: 'teacher'
            });
        }
      }
    }

    // Validation: Weekly Quota vs Available
    // For Auto Mode: We need to subtract the potential loss of periods from the BEST possible day.
    // i.e., at least one day will lose (PeriodsPerDay - AutoEarlyExitPeriod) slots.
    // If the remaining total slots < quota, then even Auto mode won't work.
    
    let adjustedWeeklyAvailable = totalWeeklyAvailable;
    if (tc.earlyExitMode === 'auto') {
        const firstDay = Object.keys(tc.earlyExit || {})[0];
        const exitPeriod = firstDay ? tc.earlyExit?.[firstDay] : undefined;
        
        if (exitPeriod !== undefined) {
             const lostSlots = Math.max(0, periodsPerDay - exitPeriod);
             // In auto mode, we lose these slots on ONE day.
             // We haven't subtracted them in the loop because we didn't know which day.
             adjustedWeeklyAvailable -= lostSlots;
        }
    }

    if (adjustedWeeklyAvailable < teacher.quotaLimit) {
      warnings.push({
        id: `quota-conflict-${teacher.id}`, level: 'error',
        message: `"${teacher.name}": النصاب (${teacher.quotaLimit}) > المتاح كلياً (${adjustedWeeklyAvailable}) (بافتراض تطبيق الخروج المبكر التلقائي)`,
        suggestion: 'خفف قيود الخروج المبكر أو الاستثناءات', relatedId: tc.teacherId, type: 'teacher'
      });
    }
    
    if (tc.earlyExitMode !== 'auto' && totalWeeklyAvailable < teacher.quotaLimit) {
        // Fallback for manual mode check (though handled naturally by loop if earlyExitPeriod is set)
        // This block might be redundant if the loop was correct, but good for safety.
         warnings.push({
        id: `quota-conflict-${teacher.id}`, level: 'error',
        message: `"${teacher.name}": النصاب (${teacher.quotaLimit}) > المتاح كلياً (${totalWeeklyAvailable})`,
        suggestion: 'خفف قيود الخروج المبكر أو الاستثناءات', relatedId: tc.teacherId, type: 'teacher'
      });
    }


  // 3. Global Edge Period Validation


    // 3. Global Edge Period Validation (Last Period)
    // Calc total capacity for last periods
    let totalAvailableLastPeriods = 0;
    
    teachers.forEach(t => {
        // Find constraint for this teacher
        const tc = settings.teacherConstraints.find(c => c.teacherId === t.id);
        
        // If NO constraint or 'earlyExit' not set -> Teacher available for all last periods (weekDays)
        if (!tc || !tc.earlyExitMode) { 
            totalAvailableLastPeriods += weekDays;
        } else if (tc.earlyExitMode === 'manual') {
            // Check specific days
            let availableDays = weekDays;
            if (tc.earlyExit) {
                // Count days where earlyExit is BEFORE the last period?
                // Actually constraint.earlyExit[day] = period number.
                // If earlyExit[day] < periodsPerDay, then they CANNOT teach Last Period.
                // If earlyExit[day] >= periodsPerDay (or undefined), they CAN.
                
                // We need to iterate known active days
                availableDays = 0;
                activeDays.forEach(day => {
                    const exit = tc.earlyExit?.[day];
                    if (exit === undefined || exit >= periodsPerDay) {
                        availableDays++;
                    }
                });
            }
            totalAvailableLastPeriods += availableDays;
        } else if (tc.earlyExitMode === 'auto') {
            // Auto means they exit early ONE day (usually).
            totalAvailableLastPeriods += (weekDays - 1); 
        }
    });

    // Check against need
    const totalRequiredLast = totalClasses * weekDays; 
    
    // We only warn if the deficit is severe, or clarify it's "Max Capacity"
    if (totalAvailableLastPeriods < totalRequiredLast * 0.8) { // Allow 20% slack for free periods
       warnings.push({
         id: 'global-last-period', level: 'warning',
         message: `عجز محتمل في الحصص الأخيرة: السعة المتوفرة (${totalAvailableLastPeriods}) < الاحتياج الأقصى (${totalRequiredLast})`,
         suggestion: 'زد أيام تواجد المعلمين في الحصص الأخيرة (الخروج المبكر)',
         type: 'general'
       });
    }
  }

  // 5. Substitution balance
  if (settings.substitution.method === 'fixed' && settings.substitution.fixedPerPeriod) {
    const totalGaps = teachers.reduce((s, t) => s + Math.max(0, settings.substitution.maxTotalQuota - (t.quotaLimit || 0)), 0);
    const totalWeeklyPeriods = weekDays * periodsPerDay;
    const avail = totalWeeklyPeriods > 0 ? Math.floor(totalGaps / totalWeeklyPeriods) : 0;
    if (settings.substitution.fixedPerPeriod > avail) {
      warnings.push({
        id: 'sub-deficit', level: 'warning',
        message: `المنتظرون المطلوبون (${settings.substitution.fixedPerPeriod}) > المتاح (${avail})`,
        suggestion: `الأقرب المتاح: ${avail}`,
        type: 'general'
      });
    }
  }

  // 6. Overall overload
  const totalExclusions = settings.subjectConstraints.reduce((s, c) => s + c.excludedPeriods.length, 0) +
    settings.teacherConstraints.reduce((s, c) => s + Object.values(c.excludedSlots).flat().length, 0);
  const totalSlots = (subjects.length + teachers.length) * periodsPerDay * weekDays;
  if (totalSlots > 0 && totalExclusions / totalSlots > 0.4) {
    warnings.push({
      id: 'general-overload', level: 'error',
      message: 'نسبة القيود مرتفعة جداً — احتمال فشل بناء الجدول',
      suggestion: 'قلّل الاستثناءات العامة',
      type: 'general'
    });
  }

  return warnings;
}
