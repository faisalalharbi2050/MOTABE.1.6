import { 
    Teacher, Admin, ScheduleSettingsData, TimetableData, SubstitutionConfig 
} from '../types';
import { getKey, getEffectiveWaitingQuota } from './scheduleInteractive';

export interface WaitingDistributorOptions {
    activeDays: string[];
    periodsPerDay: number;
    /**
     * عند التفعيل: سقف انتظار كل معلم = نصابه الفردي (waitingQuota) بدل الحد الأقصى العام.
     * مُطفأ افتراضيًا حتى لا يتغيّر سلوك الصفحات القائمة؛ تُفعّله الصفحة المطوّرة.
     */
    respectTeacherQuota?: boolean;
}

export function distributeWaiting(
    timetable: TimetableData,
    teachers: Teacher[],
    admins: Admin[],
    settings: ScheduleSettingsData,
    options: WaitingDistributorOptions
): TimetableData {
    const newTimetable = { ...timetable };
    const { activeDays, periodsPerDay, respectTeacherQuota = false } = options;
    const { maxTotalQuota = 24, maxDailyTotal = 5, method, fixedPerPeriod } = settings.substitution;

    // 1. Identify Empty Slots (Potential Waiting Slots)
    // We iterate Day x Period to find gaps where NO class is assigned to ANYONE?
    // Wait, "Waiting" implies covering a specific need (Absent teacher) or just filling gaps?
    // "حصص ثابتة في الفراغات" -> Fixed slots in empty spaces.
    // "الحد الأقصى (أساسي + انتظار) = 24"
    // The goal is to Assign 'Waiting' duties to teachers during their free time.
    
    // QUESTION: How many waiting slots per period?
    // "طرق التوزيع: 2. محدد: المستخدم يحدد عدداً ثابتاً (مثلاً 5 لكل حصة)."
    // "3. فردي آلي: ملء فراغاته بسياسة التوازن"
    
    // We assume we want to ensure N waiting teachers for EVERY period.
    const targetPerPeriod = method === 'fixed' ? (fixedPerPeriod || 0) : 0; 
    // If 'auto' or 'manual', we might not enforce a global target, but fill individual quotas?
    // "تلقائي: ملء الفراغات حتى الوصول للحد الأقصى لكل معلم"
    
    // Let's implement 'Auto' as: Try to reach Max Quota for everyone by assigning waiting slots uniformly across their free time.
    // 'Fixed' as: Ensure exactly N teachers are on waiting duty each period.
    
    // Combine Teachers and Admins (Admins are "Jokers")
    // Admins usually don't have basic quota, or have 0.
    const candidates = [
        ...teachers.map(t => ({ ...t, type: 'teacher' as const, currentLoad: t.quotaLimit })),
        ...admins.map(a => ({ 
            ...a, 
            type: 'admin' as const, 
            quotaLimit: 0, // usually 0 basic classes
            waitingQuota: a.waitingQuota, // defined in admin settings?
            currentLoad: 0 
        }))
    ];

    // Helper: Check load for a specific candidate
    const getLoad = (id: string) => {
        let load = 0;
        let waiting = 0;
        // Scan timetable
        Object.values(newTimetable).forEach(slot => {
            if (slot.teacherId === id) {
                if (slot.type === 'lesson') load++;
                if (slot.type === 'waiting') waiting++;
            }
        });
        return { basic: load, waiting, total: load + waiting };
    };

    // Helper: Check daily load
    const getDailyLoad = (id: string, day: string) => {
        let count = 0;
        for (let p = 1; p <= periodsPerDay; p++) {
            const key = getKey(id, day, p);
            if (newTimetable[key]?.teacherId === id) count++;
        }
        return count;
    };

    // Helper: هل بلغ المرشّح سقفه؟ (نصابه الفردي عند respectTeacherQuota، وإلا الحد العام)
    const overQuota = (candidate: { id: string; waitingQuota?: number; schools?: Array<{ waiting?: number }> }) => {
        if (respectTeacherQuota) {
            const quota = getEffectiveWaitingQuota(candidate);
            return getLoad(candidate.id).waiting >= quota;
        }
        return getLoad(candidate.id).total >= maxTotalQuota;
    };

    activeDays.forEach(day => {
        for (let p = 1; p <= periodsPerDay; p++) {
            
            // Find candidates who are FREE at this slot.
            const freeCandidates = candidates.filter(c => {
                const key = getKey(c.id, day, p);
                return !newTimetable[key]; // Slot is empty
            });

            // Sort candidates by "Fairness" (Who has least load?)
            freeCandidates.sort((a, b) => {
                const loadA = getLoad(a.id).total;
                const loadB = getLoad(b.id).total;
                return loadA - loadB; // Ascending load
            });

            let assignedCount = 0;
            // Count already assigned waiting (if re-running or incremental)
            candidates.forEach(c => {
                 const key = getKey(c.id, day, p);
                 if (newTimetable[key]?.type === 'waiting') assignedCount++;
            });

            // If Fixed Method: Fill until target
            if (method === 'fixed' && targetPerPeriod > 0) {
                for (const candidate of freeCandidates) {
                    if (assignedCount >= targetPerPeriod) break;
                    
                    const daily = getDailyLoad(candidate.id, day);

                    // Constraints
                    if (overQuota(candidate)) continue;
                    if (daily >= maxDailyTotal) continue;

                    // Assign
                    const key = getKey(candidate.id, day, p);
                    newTimetable[key] = {
                        teacherId: candidate.id,
                        type: 'waiting'
                    };
                    assignedCount++;
                }
            } 
            // If Auto Method: Just fill to maximize usage? 
            // Usually "Auto" means "Fill gaps for everyone up to their limit" 
            // OR "Ensure coverage".
            // Prompt says: "ملء الفراغات حتى الوصول للحد الأقصى لكل معلم" -> Fill ALL gaps up to limit.
            else if (method === 'auto') {
                 for (const candidate of freeCandidates) {
                    const daily = getDailyLoad(candidate.id, day);

                    if (overQuota(candidate)) continue;
                    if (daily >= maxDailyTotal) continue;

                    const key = getKey(candidate.id, day, p);
                    newTimetable[key] = {
                        teacherId: candidate.id,
                        type: 'waiting'
                    };
                 }
            }
        }
    });

    return newTimetable;
}
