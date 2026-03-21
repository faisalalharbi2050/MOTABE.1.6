/**
 * migrateTeachers.ts
 * تحويل هيكل بيانات المعلمين من النسخ القديمة إلى الهيكل الجديد.
 * تُستدعى مرة واحدة عند تحميل التطبيق قبل أي عرض.
 */

const STORAGE_KEY = 'school_assignment_v4';

export function migrateTeacherStructure(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    const appData = JSON.parse(saved);
    if (!appData.teachers || !Array.isArray(appData.teachers)) return;

    const schoolInfo = appData.schoolInfo || {};
    let mutated = false;

    appData.teachers = appData.teachers.map((teacher: any) => {
      let t = { ...teacher };
      let changed = false;

      // 1. إضافة isShared إذا لم يكن موجوداً
      if (!('isShared' in t)) {
        t.isShared = false;
        changed = true;
      }

      // 2. إضافة idNumber إذا لم يكن موجوداً
      if (!('idNumber' in t)) {
        t.idNumber = null;
        changed = true;
      }

      // 3. تحويل schoolId (نص) → schools (مصفوفة)
      if (!t.schools) {
        const schoolId: string = t.schoolId || 'main';

        let schoolName: string = schoolInfo.schoolName || '';
        if (schoolId !== 'main') {
          const shared = (schoolInfo.sharedSchools || []).find(
            (s: any) => s.id === schoolId
          );
          schoolName = shared?.name || schoolId;
        }

        t.schools = [
          {
            schoolId,
            schoolName,
            subjects: [],
            classes: [],
            lessons: t.quotaLimit  ?? 0,
            waiting: t.waitingQuota ?? 0,
          },
        ];
        changed = true;
      }

      // 4. إضافة constraints.presenceDays إذا لم يكن موجوداً
      if (!t.constraints) {
        t.constraints = { presenceDays: {} };
        changed = true;
      } else if (!t.constraints.presenceDays) {
        t.constraints = { ...t.constraints, presenceDays: {} };
        changed = true;
      }

      if (changed) mutated = true;
      return t;
    });

    if (mutated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    }
  } catch (e) {
    console.error('[migrateTeacherStructure]', e);
  }
}

// ── قالب كائن المعلم الجديد ─────────────────────────────────────────────────
export const NEW_TEACHER_TEMPLATE = {
  id: '',
  name: '',
  specializationId: '',
  assignedSubjectId: '',
  quotaLimit: 0,
  waitingQuota: 0,
  phone: '',
  targetPhase: undefined,
  sortIndex: undefined,
  schoolId: 'main',        // legacy — يبقى للتوافق
  sharedWithSchools: [],   // legacy — يبقى للتوافق
  // ── حقول جديدة ─────────────────────
  isShared: false,
  idNumber: null,
  schools: [
    {
      schoolId: 'main',
      schoolName: '',
      subjects: [],
      classes: [],
      lessons: 0,
      waiting: 0,
    },
  ],
  constraints: {
    consecutiveLessons: undefined,  // موجود مسبقاً
    excludedSlots:      undefined,  // موجود مسبقاً
    firstLastLessons:   undefined,  // موجود مسبقاً
    earlyExit:          undefined,  // موجود مسبقاً
    meetings:           undefined,  // موجود مسبقاً
    presenceDays:       {},         // جديد — لـ isShared = true فقط
  },
};
