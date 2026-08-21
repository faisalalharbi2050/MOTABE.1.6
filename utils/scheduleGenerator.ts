import { 
    Subject, Teacher, ClassInfo, ScheduleSettingsData, 
    TimetableData, TimetableSlot, Assignment
} from '../types';
import { getClassSubjectPeriods } from './classSubjectPlans';

interface GeneratorOptions {
    activeDays: string[];
    periodsPerDay: number;
    weekDays: number;
}

export async function generateSchedule(
    teachers: Teacher[],
    subjects: Subject[],
    classes: ClassInfo[],
    settings: ScheduleSettingsData,
    options: GeneratorOptions,
    onProgress?: (progress: number) => void,
    assignments?: Assignment[],
    isBypassingConflicts?: boolean,
    existingTimetable?: TimetableData
): Promise<TimetableData> {
    
    // 1. Prepare Data Structures
    const timetable: TimetableData = {};
    const domains: Record<string, string[]> = {}; // Variables => Possible Teachers
    
    // We need to schedule: "Lesson for Class X, Subject Y, Occurrence Z"
    // Each of these is a "Task" that needs to be assigned to a (Day, Period) slot
    // constraint: Teacher must be available.
    
    // SIMPLIFIED APPROACH for Phase 2:
    // We iterate through slots (Day, Period) for each Class.
    // For each slot, we try to assign a Subject/Teacher.
    
    const { activeDays, periodsPerDay } = options;
    
    // Flat list of all slots to fill: [ClassId, Day, Period]
    const slotsToFill: { classId: string; day: string; period: number }[] = [];
    
    const schedulableClasses = classes.filter(cls => !(cls.grade === 0 && cls.linkedSubjectIds && cls.linkedSubjectIds.length > 0));
    activeDays.forEach(day => {
        for (let p = 1; p <= periodsPerDay; p++) {
            schedulableClasses.forEach(cls => {
                slotsToFill.push({ classId: cls.id, day, period: p });
            });
        }
    });
    
    // ── Shared Teacher Time-Conflict Prevention ──────────────────────
    // Global map: teacherId => Set of "day-period" slots already occupied
    // across ALL schools. This prevents a shared teacher from being
    // double-booked in the same time slot across different schools.
    const teacherSlots: Record<string, Set<string>> = {};
    teachers.forEach(t => {
        teacherSlots[t.id] = new Set<string>();
    });

    // If we have an existing timetable (separated school generation),
    // seed teacherSlots from it so the new generation respects prior bookings.
    if (existingTimetable) {
        Object.keys(existingTimetable).forEach(key => {
            const parts = key.split('-');
            const period = parts[parts.length - 1];
            const day = parts[parts.length - 2];
            const teacherId = parts.slice(0, parts.length - 2).join('-');
            const slotKey = `${day}-${period}`;
            if (teacherSlots[teacherId]) {
                teacherSlots[teacherId].add(slotKey);
            }
        });
    }
    // ─────────────────────────────────────────────────────────────────

    // Track Teacher Availability (Day-Period => TeacherId[])
    // To avoid double booking.
    const teacherOccupied = new Set<string>(); // "teacherId-day-period"
    const classOccupied = new Set<string>(); // "classId-day-period"
    const teacherDayPeriods = new Map<string, Set<number>>(); // "teacherId-day" => periods
    const teacherDailyLoad = new Map<string, number>(); // "teacherId-day" => count
    const teacherWeeklyLoadTarget = new Map<string, number>();
    const teacherDailyTargets = new Map<string, number>(); // "teacherId-day" => target count
    const teacherFirstPeriodCount = new Map<string, number>(); // teacherId => count
    const teacherLastPeriodCount  = new Map<string, number>(); // teacherId => count
    
    // Initialize with existing timetable if provided (crucial for separated shared schools)
    if (existingTimetable) {
        Object.keys(existingTimetable).forEach(key => {
            teacherOccupied.add(key);
            // key format: "teacherId-day-period"
            const parts = key.split('-');
            const p = parseInt(parts[parts.length - 1]);
            const day = parts[parts.length - 2];
            const tid = parts.slice(0, parts.length - 2).join('-');
            const slot = existingTimetable[key];
            if (slot?.classId) classOccupied.add(`${slot.classId}-${day}-${p}`);
            const dayKey = `${tid}-${day}`;
            if (!teacherDayPeriods.has(dayKey)) teacherDayPeriods.set(dayKey, new Set<number>());
            teacherDayPeriods.get(dayKey)!.add(p);
            teacherDailyLoad.set(dayKey, (teacherDailyLoad.get(dayKey) || 0) + 1);
            if (p === 1) teacherFirstPeriodCount.set(tid, (teacherFirstPeriodCount.get(tid) || 0) + 1);
            if (p === periodsPerDay) teacherLastPeriodCount.set(tid, (teacherLastPeriodCount.get(tid) || 0) + 1);
        });
    }
    
    // Track Subject Quotas per Class
    // "classId-subjectId" => count
    const classSubjectCounts = new Map<string, number>();
    const classSubjectDayCounts = new Map<string, number>();
    const classSubjectDayPeriods = new Map<string, Set<number>>();
    const classSubjectPeriodCounts = new Map<string, number>();
    const subjectDailyTargets = new Map<string, number>(); // "classId-subjectId-day" => target count

    teachers.forEach(t => teacherWeeklyLoadTarget.set(t.id, 0));
    if (assignments && assignments.length > 0) {
        assignments.forEach(a => {
            const sub = subjects.find(s => s.id === a.subjectId);
            const cls = classes.find(c => c.id === a.classId);
            if (!sub || !cls) return;
            teacherWeeklyLoadTarget.set(a.teacherId, (teacherWeeklyLoadTarget.get(a.teacherId) || 0) + getClassSubjectPeriods(cls, sub));
        });
    }
    teachers.forEach(t => {
        const weeklyLoad = teacherWeeklyLoadTarget.get(t.id) || t.quotaLimit || 0;
        const base = Math.floor(weeklyLoad / activeDays.length);
        const extraDays = weeklyLoad % activeDays.length;
        activeDays.forEach((day, index) => {
            teacherDailyTargets.set(`${t.id}-${day}`, base + (index < extraDays ? 1 : 0));
        });
    });

    // ── Facility Capacity Constraint ──────────────────────────────────────
    // Identify facility entries (grade === 0 with linkedSubjectIds)
    const facilities = classes.filter(c => c.grade === 0 && c.linkedSubjectIds && c.linkedSubjectIds.length > 0);

    type FacilityResource = { capacity: number; facilityId: string; linkedClassIds: string[] };

    // Build map: subjectId => facilities that can host the subject.
    const subjectFacilityMap = new Map<string, FacilityResource[]>();
    facilities.forEach(f => {
        const cap = f.capacity ?? 1;
        (f.linkedSubjectIds || []).forEach(sid => {
            if (!subjectFacilityMap.has(sid)) subjectFacilityMap.set(sid, []);
            subjectFacilityMap.get(sid)!.push({
                capacity: cap,
                facilityId: f.id,
                linkedClassIds: f.linkedClassIds || []
            });
        });
    });

    // Track concurrent usage per facility per slot: "facilityId-day-period" => count
    const facilityUsage = new Map<string, number>();

    // undefined: subject has no facility constraint.
    // null: subject has facilities, but none is eligible/available for this class and slot.
    const chooseAvailableFacility = (
        subjectId: string,
        classId: string,
        day: string,
        period: number
    ): FacilityResource | null | undefined => {
        const linkedFacilities = subjectFacilityMap.get(subjectId);
        if (!linkedFacilities || linkedFacilities.length === 0) return undefined;

        const eligibleFacilities = linkedFacilities
            .filter(facility => facility.linkedClassIds.length === 0 || facility.linkedClassIds.includes(classId))
            .map(facility => {
                const usageKey = `${facility.facilityId}-${day}-${period}`;
                return { facility, used: facilityUsage.get(usageKey) || 0 };
            })
            .filter(({ facility, used }) => used < facility.capacity)
            .sort((a, b) => (a.used / a.facility.capacity) - (b.used / b.facility.capacity));

        return eligibleFacilities[0]?.facility || null;
    };
    // ─────────────────────────────────────────────────────────────────────

    const subjectConstraintById = new Map(settings.subjectConstraints.map(sc => [sc.subjectId, sc]));
    const teacherConstraintById = new Map(settings.teacherConstraints.map(tc => [tc.teacherId, tc]));
    
    // Helper to get remaining quota for a subject in a class
    const getRemainingQuota = (cls: ClassInfo, subj: Subject) => {
        const key = `${cls.id}-${subj.id}`;
        const used = classSubjectCounts.get(key) || 0;
        return getClassSubjectPeriods(cls, subj) - used;
    };

    const getSubjectMaxPerDay = (cls: ClassInfo, subj: Subject) =>
        getClassSubjectPeriods(cls, subj) <= activeDays.length ? 1 : 2;

    const getStableDayOffset = (classId: string, subjectId: string) => {
        const value = `${classId}-${subjectId}`;
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
            hash = ((hash << 5) - hash) + value.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) % Math.max(1, activeDays.length);
    };

    const isSubjectExcluded = (constraint: any, day: string, period: number) =>
        Boolean(constraint?.excludedSlots?.[day]?.includes(period) || constraint?.excludedPeriods?.includes(period));
    const hasFixedSlots = (constraint: any) => Boolean(constraint?.fixedSlots && Object.values(constraint.fixedSlots).some((slots: any) => Array.isArray(slots) && slots.length > 0));
    const isSubjectFixedSlot = (constraint: any, day: string, period: number) =>
        Boolean(constraint?.fixedSlots?.[day]?.includes(period));

    const getSubjectDayTarget = (classId: string, subj: Subject, day: string) => {
        const cls = classes.find(item => item.id === classId);
        return subjectDailyTargets.get(`${classId}-${subj.id}-${day}`) ?? (cls ? getSubjectMaxPerDay(cls, subj) : 1);
    };

    const getTeacherDayTarget = (teacher: Teacher, day: string) =>
        teacherDailyTargets.get(`${teacher.id}-${day}`) ?? Math.ceil((teacherWeeklyLoadTarget.get(teacher.id) || teacher.quotaLimit || 0) / activeDays.length);

    const getTeacherDayBalanceScore = (teacher: Teacher, day: string, periodsToAdd = 1) => {
        const current = teacherDailyLoad.get(`${teacher.id}-${day}`) || 0;
        const target = getTeacherDayTarget(teacher, day);
        if (target <= 0) return current + periodsToAdd;
        const after = current + periodsToAdd;
        return after <= target
            ? -(target - current) * 120
            : (after - target) * 180;
    };

    const getMaxConsecutive = (teacher: Teacher) => {
        const configured = teacherConstraintById.get(teacher.id)?.maxConsecutive;
        return Math.max(1, configured ?? 2);
    };

    const getConsecutiveRunAfterAdding = (teacherId: string, day: string, period: number) => {
        const occupied = teacherDayPeriods.get(`${teacherId}-${day}`) || new Set<number>();
        let run = 1;
        for (let p = period - 1; p >= 1 && occupied.has(p); p--) run++;
        for (let p = period + 1; p <= periodsPerDay && occupied.has(p); p++) run++;
        return run;
    };

    // Pre-calculate valid subjects for each class
    // Based on Phase/Grade
    const classSubjectsMap = new Map<string, Subject[]>();
    classes.forEach(cls => {
        // This logic depends on how subjects are linked to classes.
        // Assuming 'Step3Subjects' logic where subjects target grades/phases.
        // Or if 'Step4Classes' saves subjectIds in class.
        if (cls.subjectIdsCustomized || (cls.subjectIds && cls.subjectIds.length > 0)) {
            const valid = subjects.filter(s => cls.subjectIds?.includes(s.id));
            classSubjectsMap.set(cls.id, valid);
        } else {
             // Fallback 1: match by phase/grade if IDs not explicit
             let valid = subjects.filter(s => 
                 s.phases.includes(cls.phase) && (!s.targetGrades || s.targetGrades.includes(cls.grade))
             );
             
             // Fallback 2: Check Assignments! 
             // If manual assignments exist for this class, those subjects MUST be included.
             if (assignments && assignments.length > 0) {
                 const assignedSubjectIds = assignments
                    .filter(a => a.classId === cls.id)
                    .map(a => a.subjectId);
                 
                 const assignedSubjects = subjects.filter(s => assignedSubjectIds.includes(s.id));
                 
                 // Merge unique
                 const combined = [...valid, ...assignedSubjects].filter((v,i,a) => a.findIndex(t => t.id === v.id) === i);
                 valid = combined;
             }

             classSubjectsMap.set(cls.id, valid);
        }
    });

    schedulableClasses.forEach(cls => {
        const subjectsForClass = classSubjectsMap.get(cls.id) || [];
        subjectsForClass.forEach(subj => {
            const weekly = Math.max(0, getClassSubjectPeriods(cls, subj));
            const daysCount = activeDays.length;
            const offset = getStableDayOffset(cls.id, subj.id);
            const selectedExtraDays = new Set<string>();
            const pairCount = Math.min(Math.floor(weekly / 2), Math.max(0, subjectConstraintById.get(subj.id)?.consecutivePairs || 0), daysCount);

            if (pairCount > 0) {
                const targets = new Map<string, number>();
                for (let i = 0; i < pairCount; i++) targets.set(activeDays[(offset + i) % daysCount], 2);
                let remaining = weekly - (pairCount * 2);
                for (let i = 0; i < daysCount && remaining > 0; i++) {
                    const day = activeDays[(offset + pairCount + i) % daysCount];
                    if (!targets.has(day)) { targets.set(day, 1); remaining--; }
                }
                for (let i = 0; i < daysCount && remaining > 0; i++) {
                    const day = activeDays[(offset + i) % daysCount];
                    targets.set(day, (targets.get(day) || 0) + 1); remaining--;
                }
                activeDays.forEach(day => subjectDailyTargets.set(`${cls.id}-${subj.id}-${day}`, targets.get(day) || 0));
                return;
            }

            if (weekly <= daysCount) {
                for (let i = 0; i < weekly; i++) {
                    selectedExtraDays.add(activeDays[(offset + i) % daysCount]);
                }
                activeDays.forEach(day => {
                    subjectDailyTargets.set(`${cls.id}-${subj.id}-${day}`, selectedExtraDays.has(day) ? 1 : 0);
                });
                return;
            }

            const doubleDays = Math.min(daysCount, weekly - daysCount);
            for (let i = 0; i < doubleDays; i++) {
                selectedExtraDays.add(activeDays[(offset + i) % daysCount]);
            }
            activeDays.forEach(day => {
                subjectDailyTargets.set(`${cls.id}-${subj.id}-${day}`, selectedExtraDays.has(day) ? 2 : 1);
            });
        });
    });

    // Helper: Get assigned teacher for a subject
    // In many systems, a subject for a class is assigned to ONE teacher.
    // We need that mapping. "Class X - Subject Y => Teacher Z"
    // In 'Step6Teachers', we have `teacher.assignedSubjectId`.
    // But usually, assignment is "Teacher -> [Classes + Subjects]".
    // We need to build this map from the Teacher data.
    
    // Build Assignment Map: "classId-subjectId" => teacherId
    const teacherForSubject = new Map<string, string>();
    
    if (assignments && assignments.length > 0) {
        assignments.forEach(a => {
            teacherForSubject.set(`${a.classId}-${a.subjectId}`, a.teacherId);
        });
    } else {
        // Fallback (Legacy): Assume teacher.assignedSubjectId is the PRIMARY subject for all classes?
        // This is weak but handles the case if no assignments passed.
        // We will try to scan teachers in potentialTeachers loop if this is empty.
    }
    
    // Sort slots by constraint difficulty? (e.g. Morning assembly, etc.)
    // For now, random/sequential.

    let filledCount = 0;
    const totalSlots = slotsToFill.length;

    // Backtracking function
    // For performance, pure backtracking is too slow for schools.
    // We use a Heuristic Greedy approach with limited backtracking or retry.
    
    // Backtracking function
    
    console.log(`GENERATOR START: Slots to fill: ${slotsToFill.length}`);

    let slotIndex = 0;
    for (const slot of slotsToFill) {
        // DEBUG LOGS
        if (slot === slotsToFill[0]) {
             console.log("Processing First Slot:", JSON.stringify(slot));
             const subjs = classSubjectsMap.get(slot.classId);
             console.log("Subjects for this class:", subjs?.map(s => s.name));
        }
        const { classId, day, period } = slot;
        const subjectsForClass = classSubjectsMap.get(classId) || [];
        
        let assigned = false;
        
        // Try subjects with a fairness score instead of random order.
        const currentClassForSlot = classes.find(c => c.id === classId)!;
        const getSubjectSlotScore = (subj: Subject) => {
            const remaining = getRemainingQuota(currentClassForSlot, subj);
            if (remaining <= 0) return Number.POSITIVE_INFINITY;

            const subjectConstraint = subjectConstraintById.get(subj.id);
            if (!isBypassingConflicts && isSubjectExcluded(subjectConstraint, day, period)) {
                return Number.POSITIVE_INFINITY;
            }
            if (!isBypassingConflicts && hasFixedSlots(subjectConstraint) && !isSubjectFixedSlot(subjectConstraint, day, period)) {
                return Number.POSITIVE_INFINITY;
            }
            const dayCount = classSubjectDayCounts.get(`${classId}-${subj.id}-${day}`) || 0;
            const samePeriodCount = classSubjectPeriodCounts.get(`${classId}-${subj.id}-${period}`) || 0;
            const subjectDayTarget = getSubjectDayTarget(classId, subj, day);
            if (!isBypassingConflicts && subjectDayTarget <= 0) return Number.POSITIVE_INFINITY;
            if (!isBypassingConflicts && dayCount >= subjectDayTarget) return Number.POSITIVE_INFINITY;
            if (!isBypassingConflicts && samePeriodCount >= 2) return Number.POSITIVE_INFINITY;

            const assignedTeacherId = teacherForSubject.get(`${classId}-${subj.id}`);
            const teacher = assignedTeacherId ? teachers.find(t => t.id === assignedTeacherId) : undefined;
            const teacherLoad = teacher ? (teacherDailyLoad.get(`${teacher.id}-${day}`) || 0) : 0;
            const teacherPenalty = teacher ? getTeacherDayBalanceScore(teacher, day) : 0;
            const fixedBonus = isSubjectFixedSlot(subjectConstraint, day, period) ? -500 : 0;

            return ((subjectDayTarget - dayCount) * -120) + (dayCount * 80) + (samePeriodCount * 70) + teacherPenalty + fixedBonus + teacherLoad - remaining;
        };
        const shuffledSubjects = [...subjectsForClass].sort((a, b) => {
            const diff = getSubjectSlotScore(a) - getSubjectSlotScore(b);
            return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '', 'ar');
        });
        
        for (const subj of shuffledSubjects) {
            const quota = getRemainingQuota(currentClassForSlot, subj);
            
            // DEBUG: Trace first class subject loop
            if (slotIndex === 0) {
                 console.log(`Checking Subject: ${subj.name} (ID: ${subj.id}). Quota: ${quota}/${getClassSubjectPeriods(currentClassForSlot, subj)}`);
            }

            if (quota <= 0) {
                if (slotIndex === 0) console.log(`-> Skipped due to 0 quota.`);
                continue;
            }

            const daySubjectKey = `${classId}-${subj.id}-${day}`;
            const periodSubjectKey = `${classId}-${subj.id}-${period}`;
            const subjectDayCount = classSubjectDayCounts.get(daySubjectKey) || 0;
            const subjectSamePeriodCount = classSubjectPeriodCounts.get(periodSubjectKey) || 0;
            const subjectConstraint = subjectConstraintById.get(subj.id);
            const subjectDayTarget = getSubjectDayTarget(classId, subj, day);
            if (!isBypassingConflicts && isSubjectExcluded(subjectConstraint, day, period)) {
                continue;
            }
            if (!isBypassingConflicts && hasFixedSlots(subjectConstraint) && !isSubjectFixedSlot(subjectConstraint, day, period)) {
                continue;
            }
            if (!isBypassingConflicts && subjectDayTarget <= 0) {
                continue;
            }
            if (!isBypassingConflicts && subjectDayCount >= subjectDayTarget) {
                continue;
            }
            if (!isBypassingConflicts && subjectSamePeriodCount >= 2) {
                continue;
            }
            const pairDayKey = `${classId}-${subj.id}-${day}`;
            const existingSubjectPeriods = classSubjectDayPeriods.get(pairDayKey) || new Set<number>();
            if (!isBypassingConflicts && (subjectConstraint?.consecutivePairs || 0) > 0 && subjectDayTarget === 2 && existingSubjectPeriods.size > 0 && ![...existingSubjectPeriods].some(existing => Math.abs(existing - period) === 1)) {
                continue;
            }

            // ── Facility Capacity Check ───────────────────────────────────
            // If this subject is linked to a facility, check that the facility
            // hasn't reached its capacity for this (day, period) slot.
            const selectedFacility = isBypassingConflicts
                ? undefined
                : chooseAvailableFacility(subj.id, classId, day, period);
            if (selectedFacility === null) continue;
            // ─────────────────────────────────────────────────────────────
            
            // Find a teacher
            let potentialTeachers: Teacher[] = [];
            
            // 1. Check Explicit Assignment
            const assignmentKey = `${classId}-${subj.id}`;
            const assignedTeacherId = teacherForSubject.get(assignmentKey);
            
            // DEBUG
            if (slotIndex === 0) console.log(`-> Checking Assignment Key: '${assignmentKey}'. Found Teacher: ${assignedTeacherId}`);
            
            // DEBUG
            // if (i < 5) console.log(`Checking ${classId} - ${subj.name}: Found TeacherID? ${assignedTeacherId}`);
            
            // DEBUG LOG
            // console.log(`Checking ${classId} - ${subj.name}: Assigned to ${assignedTeacherId}`);

            if (assignedTeacherId) {
                const t = teachers.find(t => t.id === assignedTeacherId);
                if (t) {
                    if (slotIndex === 0) console.log(`   -> Teacher Object Found: ${t.name} (ID: ${t.id})`);
                    
                    if (!teacherOccupied.has(`${t.id}-${day}-${period}`)) {
                        potentialTeachers = [t];
                    } else {
                        if (slotIndex === 0) console.log(`   -> REJECTED: Teacher ${t.name} is occupied at ${day}-${period}`);
                    }
                } else {
                     console.warn(`   -> WARNING: Teacher ID ${assignedTeacherId} not found in teacher list!`);
                }
            }
            
            // STRICT MODE: NO FALLBACK.
            // If no teacher is explicitly assigned, this subject slot remains empty.
            
            // Filter by constraints (Teacher max daily, exclusions, etc.)
            // We can use `checkConflicts` logic here but localized.
            
            const validTeachers = potentialTeachers.filter(t => {
                // ── Shared Teacher: Time-Slot Conflict Check ─────────
                // Prevent a teacher from being assigned to the same
                // (day, period) in two different schools.
                const slotKey = `${day}-${period}`;
                if (teacherSlots[t.id] && teacherSlots[t.id].has(slotKey)) {
                    if (slotIndex === 0) console.log(`   -> REJECTED: Shared teacher ${t.name} already occupied at ${slotKey}`);
                    return false;
                }

                // ── Shared Teacher: Presence Days Constraint ─────────
                // If the teacher is shared and has presenceDays defined,
                // only allow scheduling on allowed days for this school.
                if (t.isShared && t.constraints?.presenceDays) {
                    const currentClassObj = classes.find(c => c.id === classId);
                    const currentSchoolId = currentClassObj?.schoolId || 'main';
                    const allowedDays = t.constraints.presenceDays[currentSchoolId];
                    if (allowedDays !== undefined) {
                        if (!allowedDays.includes(day)) {
                            if (slotIndex === 0) console.log(`   -> REJECTED: Shared teacher ${t.name} not allowed on ${day} for school ${currentSchoolId}`);
                            return false;
                        }
                    }
                }
                // ─────────────────────────────────────────────────────

                // Keep daily balance as a scoring priority, not a hard blocker.
                const currentDailyLoad = teacherDailyLoad.get(`${t.id}-${day}`) || 0;
                
                // Daily balance is a scoring priority, not a hard blocker.
                // Hard-blocking it can leave large assignment gaps when constraints are tight.
                if (currentDailyLoad >= periodsPerDay) {
                     return false;
                }
                const dailyTarget = getTeacherDayTarget(t, day);
                if (!isBypassingConflicts && dailyTarget > 0 && currentDailyLoad >= dailyTarget) {
                    return false;
                }

                // Check Excluded Slots
                const constraint = teacherConstraintById.get(t.id);
                if (constraint?.excludedSlots[day]?.includes(period)) {
                    // If bypassing conflicts, we might IGNORE the soft constraints (excluded slots)
                    // if it's the ONLY way to schedule. But greedy single-pass doesn't know it's the only way until it fails.
                    // For now, if bypass is true, we STILL try to respect exclusions, but we COULD drop it.
                    // Let's drop explicit excluded slots if bypassing for immediate resolution.
                    if (isBypassingConflicts) {
                         if (slotIndex === 0) console.log(`   -> BYPASSED: Constraint excludes ${day} period ${period}`);
                    } else {
                         if (slotIndex === 0) console.log(`   -> REJECTED: Constraint excludes ${day} period ${period}`);
                         return false;
                    }
                }

                const consecutiveAfterAdding = getConsecutiveRunAfterAdding(t.id, day, period);
                const maxConsecutive = getMaxConsecutive(t);
                if (!isBypassingConflicts && consecutiveAfterAdding > maxConsecutive) {
                    if (slotIndex === 0) console.log(`   -> REJECTED: Teacher consecutive lessons would become ${consecutiveAfterAdding}/${maxConsecutive}`);
                    return false;
                }

                // Check First/Last Period Limits
                if (!isBypassingConflicts && constraint) {
                    if (period === 1 && constraint.maxFirstPeriods !== undefined) {
                        const used = teacherFirstPeriodCount.get(t.id) || 0;
                        if (used >= constraint.maxFirstPeriods) {
                            if (slotIndex === 0) console.log(`   -> REJECTED: Teacher reached maxFirstPeriods (${constraint.maxFirstPeriods})`);
                            return false;
                        }
                    }
                    if (period === periodsPerDay && constraint.maxLastPeriods !== undefined) {
                        const used = teacherLastPeriodCount.get(t.id) || 0;
                        if (used >= constraint.maxLastPeriods) {
                            if (slotIndex === 0) console.log(`   -> REJECTED: Teacher reached maxLastPeriods (${constraint.maxLastPeriods})`);
                            return false;
                        }
                    }
                }

                return true;
            });
            const validTeacher = validTeachers
                .map(t => {
                    const currentDailyLoad = teacherDailyLoad.get(`${t.id}-${day}`) || 0;
                    const consecutiveAfterAdding = getConsecutiveRunAfterAdding(t.id, day, period);
                    const teacherBalancePenalty = getTeacherDayBalanceScore(t, day);
                    const consecutivePenalty = Math.max(0, consecutiveAfterAdding - 1) * 45;
                    const subjectDayPenalty = subjectDayCount * 40;
                    const subjectSamePeriodPenalty = subjectSamePeriodCount * 35;
                    const remainingPriority = -quota;
                    return {
                        teacher: t,
                        score: teacherBalancePenalty + consecutivePenalty + subjectDayPenalty + subjectSamePeriodPenalty + currentDailyLoad + remainingPriority
                    };
                })
                .sort((a, b) => a.score - b.score)[0]?.teacher;
            
            if (validTeacher) {
                // ASSIGN
                // Use standard key format: teacherId-day-period as per utils/scheduleInteractive
                const key = `${validTeacher.id}-${day}-${period}`;
                
                timetable[key] = {
                    teacherId: validTeacher.id,
                    subjectId: subj.id,
                    classId: classId,
                    facilityId: selectedFacility?.facilityId,
                    type: 'lesson'
                };
                
                // Update State
                teacherOccupied.add(`${validTeacher.id}-${day}-${period}`);
                classOccupied.add(`${classId}-${day}-${period}`);
                // Update shared-teacher global slot tracker
                if (teacherSlots[validTeacher.id]) {
                    teacherSlots[validTeacher.id].add(`${day}-${period}`);
                }
                classSubjectCounts.set(`${classId}-${subj.id}`, (classSubjectCounts.get(`${classId}-${subj.id}`) || 0) + 1);
                classSubjectDayCounts.set(`${classId}-${subj.id}-${day}`, (classSubjectDayCounts.get(`${classId}-${subj.id}-${day}`) || 0) + 1);
                if (!classSubjectDayPeriods.has(`${classId}-${subj.id}-${day}`)) classSubjectDayPeriods.set(`${classId}-${subj.id}-${day}`, new Set<number>());
                classSubjectDayPeriods.get(`${classId}-${subj.id}-${day}`)!.add(period);
                classSubjectPeriodCounts.set(`${classId}-${subj.id}-${period}`, (classSubjectPeriodCounts.get(`${classId}-${subj.id}-${period}`) || 0) + 1);
                const teacherDayKey = `${validTeacher.id}-${day}`;
                if (!teacherDayPeriods.has(teacherDayKey)) teacherDayPeriods.set(teacherDayKey, new Set<number>());
                teacherDayPeriods.get(teacherDayKey)!.add(period);
                teacherDailyLoad.set(`${validTeacher.id}-${day}`, (teacherDailyLoad.get(`${validTeacher.id}-${day}`) || 0) + 1);
                if (period === 1) teacherFirstPeriodCount.set(validTeacher.id, (teacherFirstPeriodCount.get(validTeacher.id) || 0) + 1);
                if (period === periodsPerDay) teacherLastPeriodCount.set(validTeacher.id, (teacherLastPeriodCount.get(validTeacher.id) || 0) + 1);

                // ── Update facility usage counter ─────────────────────────
                if (selectedFacility) {
                    const usageKey = `${selectedFacility.facilityId}-${day}-${period}`;
                    facilityUsage.set(usageKey, (facilityUsage.get(usageKey) || 0) + 1);
                }
                // ─────────────────────────────────────────────────────────
                
                assigned = true;
                break; // Move to next slot
            }
        }
        
        filledCount++;
        slotIndex++; // Increment index
        if (onProgress && filledCount % 10 === 0) {
           onProgress(Math.floor((filledCount / totalSlots) * 100));
           // Allow UI to breathe
           await new Promise(r => setTimeout(r, 0)); 
        }
    }

    const fillRemainingSlots = () => {
        let madeProgress = false;

        for (let relaxation = 0; relaxation <= 2; relaxation++) {
            for (const slot of slotsToFill) {
                const { classId, day, period } = slot;
                if (classOccupied.has(`${classId}-${day}-${period}`)) continue;

                const currentClassForSlot = classes.find(c => c.id === classId);
                if (!currentClassForSlot) continue;

                const candidateSubjects = [...(classSubjectsMap.get(classId) || [])]
                    .filter(subj => getRemainingQuota(currentClassForSlot, subj) > 0)
                    .sort((a, b) => {
                        const getScore = (subj: Subject) => {
                            const assignedTeacherId = teacherForSubject.get(`${classId}-${subj.id}`);
                            const teacher = assignedTeacherId ? teachers.find(t => t.id === assignedTeacherId) : undefined;
                            const balanceScore = teacher ? getTeacherDayBalanceScore(teacher, day) : 0;
                            return balanceScore - getRemainingQuota(currentClassForSlot, subj);
                        };
                        return getScore(a) - getScore(b);
                    });

                for (const subj of candidateSubjects) {
                    const subjectConstraint = subjectConstraintById.get(subj.id);
                    if (!isBypassingConflicts && isSubjectExcluded(subjectConstraint, day, period)) continue;
                    if (!isBypassingConflicts && hasFixedSlots(subjectConstraint) && !isSubjectFixedSlot(subjectConstraint, day, period)) continue;

                    const subjectDayKey = `${classId}-${subj.id}-${day}`;
                    const subjectPeriodKey = `${classId}-${subj.id}-${period}`;
                    const subjectDayCount = classSubjectDayCounts.get(subjectDayKey) || 0;
                    const subjectSamePeriodCount = classSubjectPeriodCounts.get(subjectPeriodKey) || 0;
                    const subjectDayTarget = getSubjectDayTarget(classId, subj, day);
                    const subjectAllowedPerDay = relaxation === 0
                        ? subjectDayTarget
                        : getSubjectMaxPerDay(subj);
                    if (!isBypassingConflicts && subjectAllowedPerDay <= 0) continue;
                    if (!isBypassingConflicts && subjectDayCount >= subjectAllowedPerDay) continue;
                    if (!isBypassingConflicts && subjectSamePeriodCount >= 2) continue;

                    const assignedTeacherId = teacherForSubject.get(`${classId}-${subj.id}`);
                    if (!assignedTeacherId) continue;
                    const teacher = teachers.find(t => t.id === assignedTeacherId);
                    if (!teacher) continue;

                    const slotKey = `${day}-${period}`;
                    if (teacherOccupied.has(`${teacher.id}-${day}-${period}`)) continue;
                    if (teacherSlots[teacher.id] && teacherSlots[teacher.id].has(slotKey)) continue;

                    if (teacher.isShared && teacher.constraints?.presenceDays) {
                        const currentSchoolId = currentClassForSlot.schoolId || 'main';
                        const allowedDays = teacher.constraints.presenceDays[currentSchoolId];
                        if (allowedDays !== undefined && !allowedDays.includes(day)) continue;
                    }

                    const currentDailyLoad = teacherDailyLoad.get(`${teacher.id}-${day}`) || 0;
                    if (currentDailyLoad >= periodsPerDay) continue;
                    const dailyTarget = getTeacherDayTarget(teacher, day);
                    const allowedDailyLoad = relaxation === 0
                        ? dailyTarget
                        : relaxation === 1
                            ? dailyTarget + 1
                            : periodsPerDay;
                    if (!isBypassingConflicts && dailyTarget > 0 && currentDailyLoad >= allowedDailyLoad) continue;

                    const constraint = teacherConstraintById.get(teacher.id);
                    if (!isBypassingConflicts && constraint?.excludedSlots[day]?.includes(period)) continue;

                    const consecutiveAfterAdding = getConsecutiveRunAfterAdding(teacher.id, day, period);
                    if (!isBypassingConflicts && consecutiveAfterAdding > getMaxConsecutive(teacher)) continue;

                    if (!isBypassingConflicts && relaxation === 0 && constraint) {
                        if (period === 1 && constraint.maxFirstPeriods !== undefined && (teacherFirstPeriodCount.get(teacher.id) || 0) >= constraint.maxFirstPeriods) continue;
                        if (period === periodsPerDay && constraint.maxLastPeriods !== undefined && (teacherLastPeriodCount.get(teacher.id) || 0) >= constraint.maxLastPeriods) continue;
                    }

                    const selectedFacility = isBypassingConflicts
                        ? undefined
                        : chooseAvailableFacility(subj.id, classId, day, period);
                    if (selectedFacility === null) continue;

                    const key = `${teacher.id}-${day}-${period}`;
                    timetable[key] = {
                        teacherId: teacher.id,
                        subjectId: subj.id,
                        classId,
                        facilityId: selectedFacility?.facilityId,
                        type: 'lesson'
                    };

                    teacherOccupied.add(key);
                    classOccupied.add(`${classId}-${day}-${period}`);
                    if (teacherSlots[teacher.id]) teacherSlots[teacher.id].add(slotKey);
                    classSubjectCounts.set(`${classId}-${subj.id}`, (classSubjectCounts.get(`${classId}-${subj.id}`) || 0) + 1);
                    classSubjectDayCounts.set(subjectDayKey, subjectDayCount + 1);
                    classSubjectPeriodCounts.set(subjectPeriodKey, subjectSamePeriodCount + 1);
                    const teacherDayKey = `${teacher.id}-${day}`;
                    if (!teacherDayPeriods.has(teacherDayKey)) teacherDayPeriods.set(teacherDayKey, new Set<number>());
                    teacherDayPeriods.get(teacherDayKey)!.add(period);
                    teacherDailyLoad.set(teacherDayKey, currentDailyLoad + 1);
                    if (period === 1) teacherFirstPeriodCount.set(teacher.id, (teacherFirstPeriodCount.get(teacher.id) || 0) + 1);
                    if (period === periodsPerDay) teacherLastPeriodCount.set(teacher.id, (teacherLastPeriodCount.get(teacher.id) || 0) + 1);
                    if (selectedFacility) {
                        const usageKey = `${selectedFacility.facilityId}-${day}-${period}`;
                        facilityUsage.set(usageKey, (facilityUsage.get(usageKey) || 0) + 1);
                    }

                    madeProgress = true;
                    break;
                }
            }
        }

        return madeProgress;
    };

    for (let pass = 0; pass < 4; pass++) {
        if (!fillRemainingSlots()) break;
    }
    
    return timetable;
}
