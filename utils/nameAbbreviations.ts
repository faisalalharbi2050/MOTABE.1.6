/**
 * مساعدات الأسماء المختصرة الموحَّدة للمعلمين والمواد.
 * مصدر واحد للحقيقة يستخدمه قسم المعلمين/المواد وعرض/تعديل الجدول،
 * كي لا تتباعد منطق الاختصار بين الشاشات.
 */

/** اسم المعلم المختصر: اسمان أو أقل كما هما، وإلا الأول + الأخير. */
export const buildTeacherShortName = (name?: string): string => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 2) return parts.join(' ');
    return `${parts[0]} ${parts[parts.length - 1]}`;
};

/** اختصار اسم المادة: قواعد ثابتة للمواد الشائعة، وإلا أول كلمة دالّة. */
export const generateSubjectAbbreviation = (name: string): string => {
    const words = (name || '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    const exactRules: [string, string][] = [
        ['التربية الفنية', 'الفنية'],
        ['التربية البدنية', 'البدنية'],
        ['المهارات الحياتية', 'الحياتية'],
        ['المهارات الرقمية', 'الرقمية'],
        ['الدراسات الاجتماعية', 'اجتماعيات'],
        ['الدراسات الإسلامية', 'إسلامية'],
        ['قرآن وإسلامية', 'قرآن'],
        ['القرآن الكريم', 'قرآن'],
        ['اللغة الإنجليزية', 'إنجليزي'],
        ['اللغة العربية', 'عربي'],
        ['الرياضيات', 'رياضيات'],
        ['العلوم', 'علوم'],
        ['لغتي', 'لغتي'],
    ];
    const rule = exactRules.find(([needle]) => name.includes(needle));
    if (rule) return rule[1];
    const ignored = new Set(['التربية', 'الدراسات', 'المهارات', 'اللغة', 'مادة']);
    return words.find(word => word.length > 2 && !ignored.has(word.replace(/^ال/, 'ال'))) || words[words.length - 1] || words[0];
};
