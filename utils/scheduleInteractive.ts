import { TimetableData, TimetableSlot, Teacher, ScheduleSettingsData, ClassInfo } from '../types';

// Helper to generate key
export const getKey = (teacherId: string, day: string, period: number) => `${teacherId}-${day}-${period}`;

// Arabic day names
const DAY_NAMES_AR: Record<string, string> = {
    sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء', thursday: 'الخميس',
};

const getClassName = (classId: string | undefined, classes?: ClassInfo[]): string => {
    if (!classId) return 'فراغ';
    if (!classes) return classId;
    const cls = classes.find(c => c.id === classId);
    if (!cls) return classId;
    return cls.name || `${cls.grade}/${cls.section}`;
};

const getTeacherName = (teacherId: string, teachers?: Teacher[]): string => {
    if (!teachers) return teacherId;
    return teachers.find(t => t.id === teacherId)?.name || teacherId;
};

const formatSlotAr = (day: string, period: number) =>
    `${DAY_NAMES_AR[day] || day} - الحصة ${period}`;

// Extract day and period from a timetable key safely (key = teacherId-day-period)
const extractDayPeriod = (key: string, teacherId: string): { day: string; period: number } | null => {
    const prefix = teacherId + '-';
    if (!key.startsWith(prefix)) return null;
    const remainder = key.slice(prefix.length); // "day-period"
    const lastDash = remainder.lastIndexOf('-');
    if (lastDash === -1) return null;
    const day = remainder.slice(0, lastDash);
    const period = parseInt(remainder.slice(lastDash + 1), 10);
    if (isNaN(period)) return null;
    return { day, period };
};

// Find which teacher (if any) is teaching classId at day-period, excluding certain keys
const findClassAtTime = (
    timetable: TimetableData,
    classId: string,
    day: string,
    period: number,
    excludeKeys: string[] = []
): { key: string; slot: TimetableSlot } | null => {
    const suffix = `-${day}-${period}`;
    for (const [k, s] of Object.entries(timetable)) {
        if (s.classId === classId && k.endsWith(suffix) && !excludeKeys.includes(k)) {
            return { key: k, slot: s };
        }
    }
    return null;
};

export interface SwapResult {
    success: boolean;
    reason?: string;
    newTimetable?: TimetableData;
    isChain?: boolean;
    chainSteps?: string[];
    relatedTeacherIds?: string[];
}

/**
 * نموذج التبديل الصحيح:
 * - كل خانة (معلم-يوم-حصة) تمثل: ماذا يُدرّس المعلم في هذا الوقت
 * - التبديل البسيط: معلم (أ) ومعلم (ب) يُدرّسان نفس الفصل → يتبادلان الوقت
 *   النتيجة: (أ) ينتقل إلى وقت (ب)، و(ب) ينتقل إلى وقت (أ)
 * - التبديل داخل نفس المعلم: نقل حصة من وقت لآخر في جدوله
 */
export function tryMoveOrSwap(
    timetable: TimetableData,
    source: { teacherId: string; day: string; period: number },
    target: { teacherId: string; day: string; period: number },
    settings: ScheduleSettingsData,
    allTeachers?: Teacher[],
    allClasses?: ClassInfo[]
): SwapResult {
    const sourceKey = getKey(source.teacherId, source.day, source.period);
    const targetKey = getKey(target.teacherId, target.day, target.period);

    if (sourceKey === targetKey) {
        return { success: false, reason: 'المصدر والهدف متطابقان' };
    }

    const sourceSlot = timetable[sourceKey];
    const targetSlot = timetable[targetKey];

    if (!sourceSlot) {
        return { success: false, reason: 'الحصة المصدر غير موجودة' };
    }

    const sameTeacher = source.teacherId === target.teacherId;
    const srcTeacherName = getTeacherName(source.teacherId, allTeachers);
    const tgtTeacherName = getTeacherName(target.teacherId, allTeachers);
    const srcClassName = getClassName(sourceSlot.classId, allClasses);
    const srcSlotAr = formatSlotAr(source.day, source.period);
    const tgtSlotAr = formatSlotAr(target.day, target.period);

    // ══════════════════════════════════════════════════════════════
    // الحالة 1: نفس المعلم — تبديل وقتين في جدوله
    // ══════════════════════════════════════════════════════════════
    if (sameTeacher) {
        const nt = { ...timetable };

        if (targetSlot) {
            // الخانتان مشغولتان: تبديل مكانيهما ضمن نفس المعلم
            nt[sourceKey] = { ...targetSlot, teacherId: source.teacherId };
            nt[targetKey] = { ...sourceSlot, teacherId: source.teacherId };
            const tgtClassName = getClassName(targetSlot.classId, allClasses);
            return {
                success: true,
                newTimetable: nt,
                chainSteps: [
                    `تبديل مكاني: [${srcTeacherName}] فصل (${srcClassName}) في ${srcSlotAr} ↔ فصل (${tgtClassName}) في ${tgtSlotAr}`
                ],
                relatedTeacherIds: [source.teacherId]
            };
        } else {
            // الخانة الهدف فارغة — نقل الحصة مع التحقق من تعارض الفصل
            if (sourceSlot.classId) {
                const conflict = findClassAtTime(timetable, sourceSlot.classId, target.day, target.period, [sourceKey]);
                if (conflict) {
                    // الفصل مشغول في الوقت الهدف مع معلم آخر → اقترح التبديل معه
                    const conflictTeacherId = conflict.slot.teacherId;
                    const conflictNewKey = getKey(conflictTeacherId, source.day, source.period);

                    if (timetable[conflictNewKey]) {
                        // المعلم الآخر مشغول في وقت المصدر → التبديل البسيط غير ممكن
                        return {
                            success: false,
                            reason: `الفصل (${srcClassName}) لديه حصة في ${tgtSlotAr} مع المعلم (${getTeacherName(conflictTeacherId, allTeachers)})، لكنه مشغول في ${srcSlotAr} ولا يمكن التبديل.`
                        };
                    }

                    // تبديل بسيط: (أ) ينتقل إلى وقت (ب)، و(ب) ينتقل إلى وقت (أ)
                    nt[targetKey] = { ...sourceSlot, teacherId: source.teacherId };
                    delete nt[sourceKey];
                    nt[conflictNewKey] = { ...conflict.slot, teacherId: conflictTeacherId };
                    delete nt[conflict.key];

                    return {
                        success: true,
                        newTimetable: nt,
                        chainSteps: [
                            `تبديل بسيط: [${srcTeacherName}] فصل (${srcClassName}) من ${srcSlotAr} → ${tgtSlotAr}`,
                            `[${getTeacherName(conflictTeacherId, allTeachers)}] فصل (${srcClassName}) من ${tgtSlotAr} → ${srcSlotAr}`
                        ],
                        relatedTeacherIds: [source.teacherId, conflictTeacherId]
                    };
                }
            }

            // لا تعارض — نقل مباشر إلى الفراغ
            nt[targetKey] = { ...sourceSlot, teacherId: source.teacherId };
            delete nt[sourceKey];
            return {
                success: true,
                newTimetable: nt,
                chainSteps: [`نقل: [${srcTeacherName}] فصل (${srcClassName}) من ${srcSlotAr} إلى ${tgtSlotAr}`],
                relatedTeacherIds: [source.teacherId]
            };
        }
    }

    // ══════════════════════════════════════════════════════════════
    // الحالة 2: معلمان مختلفان — السحب على خانة فارغة
    // ══════════════════════════════════════════════════════════════
    if (!targetSlot) {
        if (!sourceSlot.classId) {
            return { success: false, reason: 'لا يمكن السحب إلى خانة فارغة لمعلم آخر' };
        }

        // تحقق: هل المعلم (أ) مشغول في الوقت الهدف أصلاً؟
        const aAtTargetKey = getKey(source.teacherId, target.day, target.period);
        if (timetable[aAtTargetKey]) {
            return {
                success: false,
                reason: `المعلم (${srcTeacherName}) لديه حصة بالفعل في ${tgtSlotAr}.`
            };
        }

        // تحقق: هل هناك معلم آخر يُدرّس نفس الفصل في الوقت الهدݿ
        const conflict = findClassAtTime(timetable, sourceSlot.classId, target.day, target.period, [sourceKey]);
        if (conflict) {
            const conflictTeacherId = conflict.slot.teacherId;
            const conflictNewKey = getKey(conflictTeacherId, source.day, source.period);

            if (timetable[conflictNewKey]) {
                return {
                    success: false,
                    reason: `الفصل (${srcClassName}) لديه حصة في ${tgtSlotAr} مع المعلم (${getTeacherName(conflictTeacherId, allTeachers)})، لكنه مشغول في ${srcSlotAr}.`
                };
            }

            // تبديل: (أ) ينتقل إلى الوقت الهدݡ والمعلم الموجود ينتقل إلى وقت (أ)
            const nt = { ...timetable };
            nt[aAtTargetKey] = { ...sourceSlot, teacherId: source.teacherId };
            delete nt[sourceKey];
            nt[conflictNewKey] = { ...conflict.slot, teacherId: conflictTeacherId };
            delete nt[conflict.key];

            return {
                success: true,
                newTimetable: nt,
                chainSteps: [
                    `تبديل بسيط: [${srcTeacherName}] فصل (${srcClassName}) من ${srcSlotAr} → ${tgtSlotAr}`,
                    `[${getTeacherName(conflictTeacherId, allTeachers)}] فصل (${srcClassName}) من ${tgtSlotAr} → ${srcSlotAr}`
                ],
                relatedTeacherIds: [source.teacherId, conflictTeacherId]
            };
        }

        // لا تعارض — نقل مباشر
        const nt = { ...timetable };
        nt[aAtTargetKey] = { ...sourceSlot, teacherId: source.teacherId };
        delete nt[sourceKey];
        return {
            success: true,
            newTimetable: nt,
            chainSteps: [`نقل: [${srcTeacherName}] فصل (${srcClassName}) من ${srcSlotAr} إلى ${tgtSlotAr}`],
            relatedTeacherIds: [source.teacherId]
        };
    }

    // ══════════════════════════════════════════════════════════════
    // الحالة 3: معلمان مختلفان، كلاهما لديه حصة
    // ══════════════════════════════════════════════════════════════

    // شرط أساسي: يجب أن يكونا يُدرّسان نفس الفصل
    if (sourceSlot.classId !== targetSlot.classId) {
        return {
            success: false,
            reason: `لا يمكن التبديل — المعلمان يُدرّسان فصلين مختلفين: (${srcClassName}) و(${getClassName(targetSlot.classId, allClasses)}). التبديل المباشر يكون فقط بين معلمَين يُدرّسان نفس الفصل.`
        };
    }

    // المعلم (أ) سينتقل إلى وقت (ب) → المفتاح الجديد: A-targetDay-targetPeriod
    const newAKey = getKey(source.teacherId, target.day, target.period);
    // المعلم (ب) سينتقل إلى وقت (أ) → المفتاح الجديد: B-sourceDay-sourcePeriod
    const newBKey = getKey(target.teacherId, source.day, source.period);

    // تحقق: هل المعلم (أ) مشغول في وقت (ب) بحصة أخرى؟
    if (newAKey !== sourceKey && timetable[newAKey]) {
        return {
            success: false,
            reason: `المعلم (${srcTeacherName}) لديه حصة أخرى في ${tgtSlotAr} ولا يمكن الانتقال إليها.`
        };
    }

    // تحقق: هل المعلم (ب) مشغول في وقت (أ) بحصة أخرى؟
    if (newBKey !== targetKey && timetable[newBKey]) {
        return {
            success: false,
            reason: `المعلم (${tgtTeacherName}) لديه حصة أخرى في ${srcSlotAr} ولا يمكن الانتقال إليها.`
        };
    }

    // تنفيذ التبديل: كل معلم ينتقل إلى وقت الآخر مع الاحتفاظ بمادته وفصله
    const nt = { ...timetable };

    if (source.day === target.day && source.period === target.period) {
        // نفس الوقʡ معلمان مختلفان → تبديل التكليف فقط
        nt[sourceKey] = { ...targetSlot, teacherId: source.teacherId };
        nt[targetKey] = { ...sourceSlot, teacherId: target.teacherId };
    } else {
        // أوقات مختلفة → كل معلم ينتقل إلى الوقت الجديد
        nt[newAKey] = { ...sourceSlot, teacherId: source.teacherId };
        delete nt[sourceKey];
        nt[newBKey] = { ...targetSlot, teacherId: target.teacherId };
        delete nt[targetKey];
    }

    return {
        success: true,
        newTimetable: nt,
        chainSteps: [
            `تبديل بسيط: [${srcTeacherName}] فصل (${srcClassName}) في ${srcSlotAr} ↔ [${tgtTeacherName}] في ${tgtSlotAr}`
        ],
        relatedTeacherIds: [source.teacherId, target.teacherId]
    };
}

/**
 * البحث عن تبديل مركب (سلسلة) عندما لا يمكن التبديل البسيط
 *
 * السيناريو:
 * - المعلم (أ) يريد الانتقال إلى حصة معلم (ب) في نفس الفصل
 * - المعلم (ب) لا يمكنه الانتقال إلى وقت (أ) لأن لديه فصلاً آخر هناك
 * - نبحث عن معلم (ج) يُدرّس نفس الفصل ويمكنه ملء الفراغ
 *
 * النتيجة: أ → وقت ȡ ب → وقت ̡ ج → وقت أ
 */
export function findChainSwap(
    timetable: TimetableData,
    source: { teacherId: string; day: string; period: number },
    target: { teacherId: string; day: string; period: number },
    allTeachers: Teacher[],
    settings: ScheduleSettingsData,
    allClasses?: ClassInfo[]
): SwapResult | null {
    const sourceKey = getKey(source.teacherId, source.day, source.period);

    const slotA = timetable[sourceKey];
    if (!slotA || !slotA.classId) return null;

    // إذا كانت الخانة الهدف فارغɡ نبحث عن المعلم الذي يُدرّس نفس الفصل في ذلك الوقت
    let effectiveTarget = target;
    let targetKey = getKey(target.teacherId, target.day, target.period);
    let slotB = timetable[targetKey];

    if (!slotB) {
        const conflict = findClassAtTime(timetable, slotA.classId, target.day, target.period, [sourceKey]);
        if (!conflict) return null;
        const dpConflict = extractDayPeriod(conflict.key, conflict.slot.teacherId);
        if (!dpConflict) return null;
        effectiveTarget = { teacherId: conflict.slot.teacherId, day: dpConflict.day, period: dpConflict.period };
        targetKey = conflict.key;
        slotB = conflict.slot;
    }

    // نحتاج كلا المعلمين وأن يكون لديهم نفس الفصل
    if (!slotB || !slotA.classId) return null;
    if (slotA.classId !== slotB.classId) return null;

    const className = getClassName(slotA.classId, allClasses);
    const t1Name = getTeacherName(source.teacherId, allTeachers);
    const t2Name = getTeacherName(effectiveTarget.teacherId, allTeachers);

    // جديد وقت (أ) بعد الانتقال إلى وقت (ب)
    const newAKey = getKey(source.teacherId, effectiveTarget.day, effectiveTarget.period);
    // إذا كان المعلم (أ) مشغول في وقت (ب) → السلسلة غير ممكنة
    if (timetable[newAKey] && newAKey !== sourceKey) return null;

    // ابحث عن معلم (ج) يُدرّس نفس الفصل ويمكنه إتمام السلسلة
    for (const t3 of allTeachers) {
        if (t3.id === source.teacherId || t3.id === effectiveTarget.teacherId) continue;

        // جميع حصص معلم (ج) لنفس الفصل
        for (const [keyC, slotC] of Object.entries(timetable)) {
            if (slotC.teacherId !== t3.id) continue;
            if (slotC.classId !== slotA.classId) continue;

            // استخراج يوم وحصة معلم (ج) بأمان
            const dpC = extractDayPeriod(keyC, t3.id);
            if (!dpC) continue;
            const { day: dayC, period: periodC } = dpC;

            // المعلم (ب) سينتقل إلى وقت (ج) → يجب أن يكون فارغاً له
            const newBKey = getKey(effectiveTarget.teacherId, dayC, periodC);
            if (timetable[newBKey]) continue;

            // المعلم (ج) سينتقل إلى وقت (أ) الأصلي → يجب أن يكون فارغاً له
            const newCKey = getKey(t3.id, source.day, source.period);
            if (timetable[newCKey]) continue;

            // ✓ تم إيجاد سلسلة صالحة: أ → وقت ȡ ب → وقت ̡ ج → وقت أ
            const nt = { ...timetable };

            // أ ينتقل من sourceKey إلى وقت (ب)
            nt[newAKey] = { ...slotA, teacherId: source.teacherId };
            delete nt[sourceKey];

            // ب ينتقل من targetKey إلى وقت (ج)
            nt[newBKey] = { ...slotB, teacherId: effectiveTarget.teacherId };
            delete nt[targetKey];

            // ج ينتقل من keyC إلى وقت (أ) الأصلي
            nt[newCKey] = { ...slotC, teacherId: t3.id };
            delete nt[keyC];

            return {
                success: true,
                isChain: true,
                chainSteps: [
                    `[${t1Name}] فصل (${className}) ينتقل من ${formatSlotAr(source.day, source.period)} إلى ${formatSlotAr(effectiveTarget.day, effectiveTarget.period)}`,
                    `[${t2Name}] فصل (${className}) ينتقل من ${formatSlotAr(effectiveTarget.day, effectiveTarget.period)} إلى ${formatSlotAr(dayC, periodC)}`,
                    `[${t3.name}] فصل (${className}) ينتقل من ${formatSlotAr(dayC, periodC)} إلى ${formatSlotAr(source.day, source.period)}`,
                ],
                newTimetable: nt,
                relatedTeacherIds: [source.teacherId, effectiveTarget.teacherId, t3.id]
            };
        }
    }

    return null;
}
