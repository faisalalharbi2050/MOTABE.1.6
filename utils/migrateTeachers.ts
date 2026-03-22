/**
 * migrateTeachers.ts
 * تحويل هيكل بيانات المعلمين من النسخ القديمة إلى الهيكل الجديد.
 * تُستدعى مرة واحدة عند تحميل التطبيق قبل أي عرض.
 */

const STORAGE_KEY = 'school_assignment_v4';

// خريطة تطبيع أسماء التخصصات النصية الشائعة إلى معرفاتها الرقمية
const SPEC_NAME_TO_ID: Record<string, string> = {
  'دين': '1', 'الدين': '1', 'دراسات إسلامية': '1', 'الدراسات الإسلامية': '1',
  'تربية إسلامية': '1', 'التربية الإسلامية': '1', 'فقه': '1', 'قرآن': '1',
  'عربي': '2', 'عربية': '2', 'لغة عربية': '2', 'اللغة العربية': '2', 'لغتي': '2',
  'رياضيات': '3', 'الرياضيات': '3',
  'علوم': '4', 'العلوم': '4',
  'انجليزي': '5', 'إنجليزي': '5', 'لغة انجليزية': '5', 'اللغة الإنجليزية': '5',
  'اجتماعيات': '6', 'الاجتماعيات': '6', 'اجتماع': '6',
  'حاسب': '7', 'الحاسب': '7', 'حاسوب': '7', 'تقنية': '7',
  'فنية': '8', 'التربية الفنية': '8', 'فن': '8',
  'بدنية': '9', 'التربية البدنية': '9', 'رياضة': '9',
  'كيمياء': '10', 'الكيمياء': '10',
  'أحياء': '11', 'الأحياء': '11', 'احياء': '11',
  'فيزياء': '12', 'الفيزياء': '12',
  'علوم إدارية': '13', 'العلوم الإدارية': '13', 'إدارة': '13',
  'تربية فكرية': '14', 'التربية الفكرية': '14',
  'صعوبات تعلم': '15', 'صعوبات التعلم': '15',
  'توحد': '16', 'التوحد': '16',
  'مكتبات': '17', 'المكتبات': '17', 'مصادر': '17',
};

export function normalizeSpecializationId(raw: string): string {
  if (!raw) return '99';
  // If already a numeric ID or '99', keep as-is
  if (/^\d+$/.test(raw)) return raw;
  return SPEC_NAME_TO_ID[raw.trim()] ?? '99';
}

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

      // 4. تطبيع specializationId — تحويل الأسماء النصية إلى معرفات رقمية
      if (t.specializationId && !/^\d+$/.test(t.specializationId)) {
        const normalized = normalizeSpecializationId(t.specializationId);
        if (normalized !== t.specializationId) {
          t.specializationId = normalized;
          changed = true;
        }
      }

      // 6. إضافة constraints.presenceDays إذا لم يكن موجوداً
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
