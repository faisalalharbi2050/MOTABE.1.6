import { PackageTier, PaymentPeriod } from '../../types';

export interface PackageFeature {
  name: string;
  includedIn: PackageTier[];
}

export const PACKAGE_FEATURES: PackageFeature[] = [
  { name: 'التوقيت الزمني للفصل واليوم الدراسي', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'خطط المواد الدراسية جاهزة', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إضافة الفصول', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إدارة المعلمين والطلاب وإضافتهم بسهولة', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إدارة الإداريين وإضافتهم بسهولة', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إنشاء جدول الحصص', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إنشاء جدول الانتظار', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إنشاء جدول الإشراف اليومي', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إنشاء جدول المناوبة اليومية', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'الانتظار اليومي', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إدارة ومنح الصلاحيات وتفويض المهام', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'التقارير والإحصائيات', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'الطباعة والتصدير', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إرسال الجداول للمعلمين وأولياء الأمور', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إرسال التكليف بالإشراف اليومي', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إرسال تذكير يومي بالإشراف اليومي', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إرسال التكليف بالمناوبة اليومية', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إرسال تذكير يومي بالمناوبة اليومية', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إرسال الانتظار للمنتظرين الكترونيًا', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'التوقيع الإلكتروني للجداول والانتظار', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'رصيد مجاني للرسائل النصية 10 رسائل', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'رصيد مجاني لرسائل الواتساب 50 رسالة', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'باقات الرسائل حسب احتياجك', includedIn: ['basic', 'advanced', 'premium'] },
  
  // Advanced features
  { name: 'متابعة أعمال المعلمين', includedIn: ['advanced', 'premium'] },
  { name: 'المجتمعات المهنية', includedIn: ['advanced', 'premium'] },
  { name: 'إدارة تأخر الطلاب', includedIn: ['advanced', 'premium'] },
  { name: 'تحويل طالب للموجه الطلابي', includedIn: ['advanced', 'premium'] },
  { name: 'إدارة غياب الطلاب', includedIn: ['advanced', 'premium'] },
  { name: 'إدارة استئذان الطلاب', includedIn: ['advanced', 'premium'] },
  { name: 'رصد السلوك', includedIn: ['advanced', 'premium'] },
  { name: 'إدارة الاختبارات', includedIn: ['advanced', 'premium'] },
  { name: 'تحليل النتائج', includedIn: ['advanced', 'premium'] },
  { name: 'الكشوف الدراسية', includedIn: ['advanced', 'premium'] },
];

/* ──────────────────────────────────────────────────────────────
   Grouped feature catalog — used by the pricing cards & checkout
   modal to present value by theme instead of a flat checklist.
   `iconKey` is mapped to a lucide icon inside the components.
   `tier` marks whether the whole group is part of the base plan
   ('basic') or exclusive to the advanced plan ('advanced').
   ────────────────────────────────────────────────────────────── */
export type FeatureGroupTier = 'basic' | 'advanced';

export interface FeatureGroup {
  id: string;
  title: string;
  iconKey:
    | 'dashboard' | 'school' | 'assignment' | 'schedule' | 'supervision' | 'waiting'
    | 'messaging' | 'signature' | 'permissions'
    | 'users' | 'student' | 'exam';
  tier: FeatureGroupTier;
  /** A short benefit-oriented tagline shown under the title (full page). */
  tagline: string;
  /** A punchy one-line benefit shown on the concise pricing card. */
  cardLine: string;
  features: string[];
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: 'dashboard',
    title: 'لوحة التحكم',
    iconKey: 'dashboard',
    tier: 'basic',
    tagline: 'لوحة ذكية تجمع لك أهم الأحداث اليومية في مكان واحد',
    cardLine: 'متابعة يومك المدرسي من لوحة واحدة',
    features: [
      'ملخص يومي للغياب والإشراف والمناوبة',
      'استعراض حصص الفصول بشكل لحظي',
      'استعراض آخر الرسائل المرسلة',
      'إضافة مهام وتذكيرات سريعة',
      'إحصاءات شاملة للمدرسة: المعلمون، الإداريون، الطلاب، الفصول',
      'متابعة رصيد الرسائل وحالة الاشتراك',
    ],
  },
  {
    id: 'setup',
    title: 'الإعدادات والبيانات للمدرسة',
    iconKey: 'school',
    tier: 'basic',
    tagline: 'إعدادات المدرسة وبياناتها… منظمّة، مرنة، وسهلة الإدارة',
    cardLine: 'إعداد وإدارة بيانات مدرستك بسهولة',
    features: [
      'تقويم مدرسي جاهز وقابل للتخصيص',
      'إدارة توقيت اليوم الدراسي للتوقيت الصيفي والشتوي ورمضان',
      'مواد دراسية جاهزة مع إمكانية الإضافة والتخصيص',
      'إنشاء الفصول وإدارتها بسهولة',
      'إضافة المعلمين أو استيرادهم دفعة واحدة',
      'تطبيق نصاب الحصص والانتظار على الجميع بنقرة واحدة',
      'إدارة قيود المعلمين بمرونة',
      'إضافة الإداريين وتحديد مهامهم وصلاحياتهم',
      'إضافة الطلاب أو استيرادهم بسهولة لتسهيل التواصل المدرسي',
      'إدارة المدارس المشتركة بمرونة كاملة',
      'ربط المعلم المشترك بين المدارس المشتركة بكل سهولة',
    ],
  },
  {
    id: 'assignment',
    title: 'إسناد المواد للمعلمين',
    iconKey: 'assignment',
    tier: 'basic',
    tagline: 'أسند المواد لمعلميك بسهولة، وانقل الإسناد عند الحاجة دون تعقيد',
    cardLine: 'إسناد المواد ونقلها بين المعلمين',
    features: [
      'إسناد المواد للمعلمين بسهولة',
      'نقل الإسناد بين المعلمين عند الحاجة',
      'تقارير الإسناد: الكل، معلم، فصل، وبحاجة إلى إسناد',
      'معاينة و طباعة التقرير',
    ],
  },
  {
    id: 'schedule',
    title: 'جداول الحصص والانتظار',
    iconKey: 'schedule',
    tier: 'basic',
    tagline: 'أنشئ جدولًا مدرسيًا متوازنًا يراعي القيود والأنصبة ويوفّر عليك ساعات من العمل اليدوي',
    cardLine: 'إنشاء آلي لجداول الحصص والانتظار بتوازن',
    features: [
      'إنشاء جداول الحصص تلقائيًا مع مراعاة التوازن والقيود',
      'مراجعة وتعديل الجدول بالسحب والإفلات',
      'إعداد وتوزيع حصص الانتظار ضمن جدول الحصص',
      'توزيع الانتظار آلياً أو محددًا لكل حصة أو بالسحب والإفلات',
      'دعم المدارس المشتركة بجداول موحدة أو منفصلة',
      'معاينة وطباعة وتصدير الجدول باحترافية',
    ],
  },
  {
    id: 'supervision',
    title: 'الإشراف والمناوبة',
    iconKey: 'supervision',
    tier: 'basic',
    tagline: 'صمّم الجداول، وزّع المشرفين والمناوبين بمرونة، وتابع التنفيذ بتقارير واضحة',
    cardLine: 'توزيع الإشراف والمناوبة بطريقة ذكية ومرنة',
    features: [
      'إعداد وتخصيص المشرفين والمناوبين بمرونة',
      'تصميم جداول الإشراف وفق احتياج المدرسة',
      'توزيع المناوبة على الأسابيع الدراسية بسهولة',
      'توزيع المشرفين والمناوبين آليًا أو يدويًا بمرونة',
      'دعم المدارس المشتركة بجداول موحدة أو منفصلة',
      'معاينة وطباعة وإرسال الجداول',
      'متابعة التنفيذ واستخراج التقارير',
    ],
  },
  {
    id: 'waiting',
    title: 'الانتظار اليومي',
    iconKey: 'waiting',
    tier: 'basic',
    tagline: 'غطِّ حصص الغياب بسرعة وعدالة، مع مراعاة نصاب كل معلم ورصيده الأسبوعي',
    cardLine: 'تغطية حصص الغائب بسرعة وعدالة',
    features: [
      'تسجيل الغياب اليومي أو الجزئي',
      'توزيع آلي عادل أو توزيع يدوي مرن',
      'مراعاة نصاب الانتظار لكل معلم',
      'رصيد انتظار أسبوعي لكل منتظر',
      'تقارير تفصيلية للانتظار والتكليفات',
    ],
  },
  {
    id: 'messaging',
    title: 'الرسائل — واتساب و SMS',
    iconKey: 'messaging',
    tier: 'basic',
    tagline: 'تواصل مع المعلمين والإداريين وأولياء الأمور برسائل جاهزة ومجدولة من داخل المنصة',
    cardLine: 'تواصل واتساب و SMS بقوالب وأرشيف',
    features: [
      'إرسال عبر واتساب و SMS',
      'قوالب رسائل جاهزة وقابلة للتعديل',
      'تخصيص الإرسال للمعلمين أو الإداريين أو أولياء الأمور',
      'إرسال الجداول والتكاليف والانتظار إلكترونيًا',
      'أرشيف كامل للرسائل المرسلة',
      'إشعارات تلقائية وجدولة الرسائل لوقت لاحق',
      'متابعة رصيد الرسائل والاستهلاك',
    ],
  },
  {
    id: 'signature',
    title: 'التوقيع الإلكتروني وسجل الاستلام',
    iconKey: 'signature',
    tier: 'basic',
    tagline: 'وثّق الجداول والتكاليف إلكترونيًا، واعرف من استلم ووقّع ومن لم يوقّع',
    cardLine: 'توقيع إلكتروني وسجل استلام موثّق',
    features: [
      'توقيع إلكتروني للجداول والانتظار والتكاليف',
      'سجل استلام موثّق يوضح حالة كل مستلم',
      'معاينة وطباعة احترافية',
      'تصدير المستندات بصيغة PDF',
    ],
  },
  {
    id: 'permissions',
    title: 'الصلاحيات والتفويض',
    iconKey: 'permissions',
    tier: 'basic',
    tagline: 'امنح الصلاحيات، فوّض المهام لإدارة المنصة',
    cardLine: 'منح الصلاحيات والتفويض وتوثيق الإجراءات',
    features: [
      'منح الصلاحيات للمعلمين والإداريين لإدارة المنصة',
      'سجل إجراءات يوثّق كل عملية داخل النظام',
    ],
  },
  {
    id: 'teachers',
    title: 'متابعة المعلمين والمجتمعات المهنية',
    iconKey: 'users',
    tier: 'advanced',
    tagline: 'حوّل المتابعة إلى أداءٍ يرتقي بفريقك',
    cardLine: 'متابعة أعمال المعلمين والمجتمعات المهنية',
    features: [
      'متابعة أعمال المعلمين',
      'المجتمعات المهنية',
    ],
  },
  {
    id: 'students',
    title: 'شؤون الطلاب والسلوك',
    iconKey: 'student',
    tier: 'advanced',
    tagline: 'لا يفوتك أي تفصيل عن أي طالب',
    cardLine: 'متابعة سلوك وشؤون الطلاب',
    features: [
      'إدارة تأخر الطلاب',
      'تحويل طالب للموجه الطلابي',
      'إدارة غياب الطلاب',
      'إدارة استئذان الطلاب',
      'رصد السلوك',
    ],
  },
  {
    id: 'exams',
    title: 'الاختبارات والنتائج',
    iconKey: 'exam',
    tier: 'advanced',
    tagline: 'من رصد الدرجة إلى الكشف الجاهز بنقرة',
    cardLine: 'إدارة الاختبارات وتحليل النتائج والكشوف',
    features: [
      'إدارة الاختبارات',
      'تحليل النتائج',
      'الكشوف الدراسية',
    ],
  },
];

export const PACKAGE_PRICING: Record<PackageTier, Record<PaymentPeriod, number>> = {
  basic: {
    monthly: 89,
    semester: 194,
    yearly: 369,
  },
  advanced: {
    monthly: 149, // Placeholder since user only provided basic pricing and said "جميع مزايا الباقة الأساسية بالاضافة..."
    semester: 299, 
    yearly: 599, 
  },
  premium: {
    monthly: 199,
    semester: 399,
    yearly: 899,
  }
};

export const PACKAGE_NAMES: Record<PackageTier, string> = {
  basic: 'الباقة الأساسية',
  advanced: 'الباقة المتقدمة',
  premium: 'الباقة الشاملة',
};

// Curated highlight lines for the BASIC plan pricing card (flat, benefit-led).
// Hand-picked — intentionally NOT derived from FEATURE_GROUPS — so the card can
// expand/merge modules independently of the full-features page.
export const BASIC_CARD_HIGHLIGHTS: string[] = [
  'لوحة تحكم احترافية لمتابعة الإحصائيات والملخص اليومي',
  'إعدادات مدرسية سهلة ومرنة وجاهزة',
  'إضافة المعلمين والطلاب أو استيرادهم بسهولة',
  'إضافة الإداريين وتحديد مهامهم وصلاحياتهم',
  'إسناد المواد بطريقة مرنة',
  'إنشاء جداول حصص تلقائية تراعي التوازن والقيود',
  'توزيع مرن لحصص الانتظار داخل الجدول',
  'انتظار يومي سريع وعادل لتغطية الغياب',
  'إشراف ومناوبة بتصميم ذكي وتوزيع مرن',
  'تواصل واتساب و SMS بقوالب جاهزة',
  'إرسال إلكتروني للجداول والتكاليف والانتظار',
  'توقيع إلكتروني وسجل استلام موثّق',
  'منح الصلاحيات والتفويض لإدارة المنصة',
];

// One-line description shown on the concise pricing card under the price.
export const PACKAGE_DESCRIPTIONS: Record<PackageTier, string> = {
  basic: 'لإدارة أسهل وأسرع و في مكان واحد',
  advanced: 'مزايا متقدمة تسهل المهام اليومية',
  premium: '',
};

// "Why this package?" — pain points + value, shown inside the full-features modal.
export const PLAN_WHY = {
  title: 'لماذا هذه الباقة؟',
  intro: 'تحصل على منصة تساعدك على:',
  points: [
    'تقليل الوقت والجهد اليومي',
    'تنظيم الجداول المدرسية',
    'توزيع الانتظار بسرعة وسهولة',
    'توثيق الاستلام والتوقيع إلكترونيًا',
    'طباعة نماذج جاهزة ومفرّغة',
    'تسهيل التواصل مع منسوبي المدرسة وأولياء الأمور',
    'متابعة كل شيء من لوحة واحدة واضحة',
  ],
  closing: 'كل ما تحتاجه لإدارة يومك المدرسي من مكان واحد، بوضوح وتنظيم ووقت أقل.',
};

// Returns period in days
export const getPeriodDays = (period: PaymentPeriod): number => {
  switch(period) {
    case 'monthly': return 30;
    case 'semester': return 90;
    case 'yearly': return 365;
  }
};

export const calculateProRata = (
  currentPackage: PackageTier,
  currentPeriod: PaymentPeriod | 'trial', // trial has no cost
  daysRemaining: number,
  newPackage: PackageTier,
  newPeriod: PaymentPeriod
) => {
  let remainingValue = 0;
  
  if (currentPeriod !== 'trial') {
    const currentPrice = PACKAGE_PRICING[currentPackage][currentPeriod];
    const currentTotalDays = getPeriodDays(currentPeriod);
    const dailyRate = currentPrice / currentTotalDays;
    remainingValue = dailyRate * Math.max(0, daysRemaining);
  }
  
  const newPrice = PACKAGE_PRICING[newPackage][newPeriod];
  const finalPrice = Math.max(0, newPrice - remainingValue);
  
  return {
    remainingValue: Math.round(remainingValue * 100) / 100, // round 2 decimals
    newPrice,
    finalPrice: Math.round(finalPrice * 100) / 100
  };
};
