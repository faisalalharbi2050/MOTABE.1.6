import { 
    Subject, Teacher, ClassInfo, ScheduleSettingsData, 
    TimetableData, TimetableSlot, Assignment
} from '../types';

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
    
    classes.forEach(cls => {
        // Skip facility entries — they are constraints, not schedulable classes
        if (cls.grade === 0 && cls.linkedSubjectIds && cls.linkedSubjectIds.length > 0) return;
        activeDays.forEach(day => {
            for (let p = 1; p <= periodsPerDay; p++) {
                slotsToFill.push({ classId: cls.id, day, period: p });
            }
        });
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
    const teacherDayPeriods = new Map<string, Set<number>>(); // "teacherId-day" => periods
    const teacherDailyLoad = new Map<string, number>(); // "teacherId-day" => count
    const teacherWeeklyLoadTarget = new Map<string, number>();
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
    const classSubjectPeriodCounts = new Map<string, number>();

    teachers.forEach(t => teacherWeeklyLoadTarget.set(t.id, 0));
    if (assignments && assignments.length > 0) {
        assignments.forEach(a => {
            const sub = subjects.find(s => s.id === a.subjectId);
            if (!sub) return;
            teacherWeeklyLoadTarget.set(a.teacherId, (teacherWeeklyLoadTarget.get(a.teacherId) || 0) + (sub.periodsPerClass || 0));
        });
    }

    // ── Facility Capacity Constraint ──────────────────────────────────────
    // Identify facility entries (grade === 0 with linkedSubjectIds)
    const facilities = classes.filter(c => c.grade === 0 && c.linkedSubjectIds && c.linkedSubjectIds.length > 0);

    // Build map: subjectId => { capacity, facilityId }[]
    const subjectFacilityMap = new Map<string, { capacity: number; facilityId: string }[]>();
    facilities.forEach(f => {
        const cap = f.capacity ?? 1;
        (f.linkedSubjectIds || []).forEach(sid => {
            if (!subjectFacilityMap.has(sid)) subjectFacilityMap.set(sid, []);
            subjectFacilityMap.get(sid)!.push({ capacity: cap, facilityId: f.id });
        });
    });

    // Track concurrent usage per facility per slot: "facilityId-day-period" => count
    const facilityUsage = new Map<string, number>();
    // ─────────────────────────────────────────────────────────────────────
    
    // Helper to get remaining quota for a subject in a class
    const getRemainingQuota = (cls: ClassInfo, subj: Subject) => {
        const key = `${cls.id}-${subj.id}`;
        const used = classSubjectCounts.get(key) || 0;
        return subj.periodsPerClass - used;
    };

    const getSubjectMaxPerDay = (subj: Subject) =>
        subj.periodsPerClass <= activeDays.length ? 1 : 2;

    const getTeacherIdealDaily = (teacher: Teacher) => {
        const assignedLoad = teacherWeeklyLoadTarget.get(teacher.id) || teacher.quotaLimit || 0;
        return assignedLoad > 0 ? assignedLoad / activeDays.length : 0;
    };

    const subjectConstraintById = new Map(settings.subjectConstraints.map(sc => [sc.subjectId, sc]));
    const teacherConstraintById = new Map(settings.teacherConstraints.map(tc => [tc.teacherId, tc]));

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
        if (cls.subjectIds && cls.subjectIds.length > 0) {
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
            if (!isBypassingConflicts && subjectConstraint?.excludedPeriods?.includes(period)) {
                return Number.POSITIVE_INFINITY;
            }
            const dayCount = classSubjectDayCounts.get(`${classId}-${subj.id}-${day}`) || 0;
            const samePeriodCount = classSubjectPeriodCounts.get(`${classId}-${subj.id}-${period}`) || 0;
            if (!isBypassingConflicts && dayCount >= getSubjectMaxPerDay(subj)) return Number.POSITIVE_INFINITY;
            if (!isBypassingConflicts && samePeriodCount >= 2) return Number.POSITIVE_INFINITY;

            const assignedTeacherId = teacherForSubject.get(`${classId}-${subj.id}`);
            const teacher = assignedTeacherId ? teachers.find(t => t.id === assignedTeacherId) : undefined;
            const teacherLoad = teacher ? (teacherDailyLoad.get(`${teacher.id}-${day}`) || 0) : 0;
            const teacherIdeal = teacher ? getTeacherIdealDaily(teacher) : 0;
            const teacherPenalty = Math.max(0, teacherLoad + 1 - teacherIdeal) * 20;
            const preferredPenalty = subjectConstraint?.preferredPeriods?.length && !subjectConstraint.preferredPeriods.includes(period) ? 18 : 0;

            return (dayCount * 80) + (samePeriodCount * 70) + teacherPenalty + preferredPenalty + teacherLoad - remaining;
        };
        const shuffledSubjects = [...subjectsForClass].sort((a, b) => {
            const diff = getSubjectSlotScore(a) - getSubjectSlotScore(b);
            return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '', 'ar');
        });
        
        for (const subj of shuffledSubjects) {
            const quota = getRemainingQuota(currentClassForSlot, subj);
            
            // DEBUG: Trace first class subject loop
            if (slotIndex === 0) {
                 console.log(`Checking Subject: ${subj.name} (ID: ${subj.id}). Quota: ${quota}/${subj.periodsPerClass}`);
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
            if (!isBypassingConflicts && subjectConstraint?.excludedPeriods?.includes(period)) {
                continue;
            }
            if (!isBypassingConflicts && subjectDayCount >= getSubjectMaxPerDay(subj)) {
                continue;
            }
            if (!isBypassingConflicts && subjectSamePeriodCount >= 2) {
                continue;
            }

            // ── Facility Capacity Check ───────────────────────────────────
            // If this subject is linked to a facility, check that the facility
            // hasn't reached its capacity for this (day, period) slot.
            const linkedFacilities = subjectFacilityMap.get(subj.id);
            if (linkedFacilities && linkedFacilities.length > 0 && !isBypassingConflicts) {
                const facilityFull = linkedFacilities.some(({ capacity, facilityId }) => {
                    const usageKey = `${facilityId}-${day}-${period}`;
                    const used = facilityUsage.get(usageKey) || 0;
                    return used >= capacity;
                });
                if (facilityFull) continue;
            }
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
                    const idealDaily = getTeacherIdealDaily(t);
                    const consecutiveAfterAdding = getConsecutiveRunAfterAdding(t.id, day, period);
                    const teacherBalancePenalty = Math.max(0, currentDailyLoad + 1 - idealDaily) * 20;
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
                    type: 'lesson'
                };
                
                // Update State
                teacherOccupied.add(`${validTeacher.id}-${day}-${period}`);
                // Update shared-teacher global slot tracker
                if (teacherSlots[validTeacher.id]) {
                    teacherSlots[validTeacher.id].add(`${day}-${period}`);
                }
                classSubjectCounts.set(`${classId}-${subj.id}`, (classSubjectCounts.get(`${classId}-${subj.id}`) || 0) + 1);
                classSubjectDayCounts.set(`${classId}-${subj.id}-${day}`, (classSubjectDayCounts.get(`${classId}-${subj.id}-${day}`) || 0) + 1);
                classSubjectPeriodCounts.set(`${classId}-${subj.id}-${period}`, (classSubjectPeriodCounts.get(`${classId}-${subj.id}-${period}`) || 0) + 1);
                const teacherDayKey = `${validTeacher.id}-${day}`;
                if (!teacherDayPeriods.has(teacherDayKey)) teacherDayPeriods.set(teacherDayKey, new Set<number>());
                teacherDayPeriods.get(teacherDayKey)!.add(period);
                teacherDailyLoad.set(`${validTeacher.id}-${day}`, (teacherDailyLoad.get(`${validTeacher.id}-${day}`) || 0) + 1);
                if (period === 1) teacherFirstPeriodCount.set(validTeacher.id, (teacherFirstPeriodCount.get(validTeacher.id) || 0) + 1);
                if (period === periodsPerDay) teacherLastPeriodCount.set(validTeacher.id, (teacherLastPeriodCount.get(validTeacher.id) || 0) + 1);

                // ── Update facility usage counter ─────────────────────────
                const assignedFacilities = subjectFacilityMap.get(subj.id);
                if (assignedFacilities) {
                    assignedFacilities.forEach(({ facilityId }) => {
                        const usageKey = `${facilityId}-${day}-${period}`;
                        facilityUsage.set(usageKey, (facilityUsage.get(usageKey) || 0) + 1);
                    });
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
    
    return timetable;
}
