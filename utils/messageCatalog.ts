// ─────────────────────────────────────────────────────────────────────────────
// السجل المركزي لقوالب الإشعارات التلقائية
// مصدر الحقيقة الوحيد لنصوص رسائل صفحات الإرسال الأربع:
// إدارة الحصص والانتظار، الإشراف اليومي، المناوبة اليومية، الانتظار اليومي.
//
// كل إدخال = نوع إشعار واحد بنص افتراضي قابل لتخصيص المستخدم (يُحفظ في localStorage).
// القالب يحوي المقدمة وجملة الغرض والذيل فقط — التفاصيل المولّدة (قوائم المهام،
// الروابط) تُحقن عبر الرموز {…} من منطق كل صفحة، فلا يفقد النظام دقته التلقائية.
// ─────────────────────────────────────────────────────────────────────────────

export type CatalogPageId = 'schedule' | 'supervision' | 'duty' | 'waiting' | 'students' | 'circulars';

export type MessageCatalogEntry = {
  id: string;
  page: CatalogPageId;
  label: string;
  description: string;
  /** الرموز المسموح إدراجها في هذا النوع — تُعرض كشرائح في واجهة التحرير */
  tokens: string[];
  defaultText: string;
};

export const CATALOG_PAGE_LABELS: Record<CatalogPageId, string> = {
  schedule: 'إدارة الحصص والانتظار',
  supervision: 'الإشراف اليومي',
  duty: 'المناوبة اليومية',
  waiting: 'الانتظار اليومي',
  students: 'شؤون الطلاب',
  circulars: 'التعاميم',
};

export const MESSAGE_CATALOG: MessageCatalogEntry[] = [
  // ── إدارة الحصص والانتظار ──────────────────────────────────────────────
  {
    id: 'schedule/send',
    page: 'schedule',
    label: 'رسالة الجدول',
    description: 'إرسال الجداول للعلم والاطلاع.',
    tokens: ['اسم_المستلم', 'اسم_المدرسة', 'اليوم', 'التاريخ', 'الفصل_الدراسي', 'نوع_الجدول', 'روابط_الجداول'],
    defaultText: 'المكرم/ {اسم_المستلم}\nنرفق لكم جدول للعلم والاطلاع.\n\nالمدرسة: {اسم_المدرسة} - اليوم ({اليوم}) - التاريخ ({التاريخ}) - الفصل الدراسي ({الفصل_الدراسي}) - نوع الجدول ({نوع_الجدول}) - رابط الجدول ({روابط_الجداول})',
  },
  {
    id: 'schedule/general',
    page: 'schedule',
    label: 'رسالة عامة',
    description: 'رسالة عامة يرسلها المدير أو الوكيل للمعلمين أو الإداريين أو أولياء الأمور.',
    tokens: ['اسم_المستلم', 'اسم_المعلم', 'اسم_الإداري', 'اسم_الطالب', 'اسم_المدرسة', 'اليوم', 'التاريخ', 'الوقت'],
    defaultText: 'المكرم/ {اسم_المستلم}\nنود إشعاركم بما يلي:\n\n\n\n{اسم_المدرسة} - {اليوم} - {التاريخ}',
  },

  // ── الإشراف اليومي ────────────────────────────────────────────────────
  {
    id: 'supervision/electronic',
    page: 'supervision',
    label: 'تكليف إلكتروني',
    description: 'إسناد مهمة الإشراف مع رابط التوقيع بالعلم',
    tokens: ['اسم_المستلم', 'اسم_المدرسة', 'يوم_التكليف', 'تاريخ_التكليف', 'الفصل_الدراسي', 'رابط_التوقيع'],
    defaultText: 'المكرم/ {اسم_المستلم}\nنشعركم بإسناد مهمة الإشراف اليومي لكم في يوم {يوم_التكليف}، يرجى الدخول على الرابط المرفق والتوقيع بالعلم، شاكرين تعاونكم.\n{اسم_المدرسة} - {يوم_التكليف} - {تاريخ_التكليف} - {الفصل_الدراسي}\nرابط التكليف والتوقيع:\n{رابط_التوقيع}',
  },
  {
    id: 'supervision/text',
    page: 'supervision',
    label: 'تبليغ نصي',
    description: 'إسناد مهمة الإشراف بدون رابط توقيع',
    tokens: ['اسم_المستلم', 'اسم_المدرسة', 'يوم_التكليف', 'تاريخ_التكليف', 'الفصل_الدراسي'],
    defaultText: 'المكرم/ {اسم_المستلم}\nنشعركم بإسناد مهمة الإشراف اليومي لكم في يوم {يوم_التكليف}، شاكرين تعاونكم.\n{اسم_المدرسة} - {يوم_التكليف} - {تاريخ_التكليف} - {الفصل_الدراسي}.',
  },
  {
    id: 'supervision/reminder',
    page: 'supervision',
    label: 'تذكير يومي',
    description: 'تذكير المشرف بموعد إشراف اليوم',
    tokens: ['اسم_المستلم', 'اسم_المدرسة', 'اليوم', 'التاريخ', 'الفصل_الدراسي'],
    defaultText: 'المكرم/ {اسم_المستلم}\nنذكركم بموعد الإشراف اليومي لهذا اليوم {اليوم}، شاكرين تعاونكم.\n{اسم_المدرسة} - {اليوم} - {التاريخ} - {الفصل_الدراسي}.',
  },
  // ── المناوبة اليومية ──────────────────────────────────────────────────
  {
    id: 'duty/electronic',
    page: 'duty',
    label: 'تكليف إلكتروني',
    description: 'إسناد مهمة المناوبة مع رابط التوقيع بالعلم',
    tokens: ['اسم_المستلم', 'أيام_التكليف', 'سطر_المدرسة_والتاريخ', 'رابط_التوقيع'],
    defaultText: 'المكرم/ {اسم_المستلم}\nنشعركم بإسناد مهمة المناوبة اليومية لكم في {أيام_التكليف}، يرجى الدخول على الرابط المرفق والتوقيع بالعلم، شاكرين تعاونكم.\n{سطر_المدرسة_والتاريخ}\n\nرابط التكليف والتوقيع:\n{رابط_التوقيع}',
  },
  {
    id: 'duty/text',
    page: 'duty',
    label: 'تبليغ نصي',
    description: 'إسناد مهمة المناوبة بدون رابط توقيع',
    tokens: ['اسم_المستلم', 'أيام_التكليف', 'سطر_المدرسة_والتاريخ'],
    defaultText: 'المكرم/ {اسم_المستلم}\nنشعركم بإسناد مهمة المناوبة اليومية لكم في {أيام_التكليف}، شاكرين تعاونكم.\n{سطر_المدرسة_والتاريخ}',
  },
  {
    id: 'duty/reminder',
    page: 'duty',
    label: 'تذكير يومي',
    description: 'تذكير المناوب بمهمة اليوم (رابط التقرير يُضاف تلقائياً عند تفعيله)',
    tokens: ['اسم_المستلم', 'اليوم', 'التاريخ', 'سطر_المدرسة_والتاريخ'],
    defaultText: 'المكرم/ {اسم_المستلم}\nنذكركم بمهمة المناوبة اليومية لهذا {اليوم} الموافق {التاريخ}، شاكرين تعاونكم.\n{سطر_المدرسة_والتاريخ}',
  },

  // ── الانتظار اليومي ───────────────────────────────────────────────────
  {
    id: 'waiting/notification',
    page: 'waiting',
    label: 'تبليغ حصة انتظار',
    description: 'إشعار المعلم المنتظر بحصة الانتظار المسندة له',
    tokens: ['اسم_المستلم', 'اليوم', 'رقم_الحصة', 'الفصل', 'المعلم_الغائب', 'اسم_المدرسة', 'التاريخ', 'الفصل_الدراسي'],
    defaultText: 'المكرم/ {اسم_المستلم}\nلديك حصة انتظار يوم {اليوم}، الحصة {رقم_الحصة}، في فصل {الفصل} بدلاً من المعلم {المعلم_الغائب}.\n{اسم_المدرسة} - {اليوم} - {التاريخ} - {الفصل_الدراسي}.',
  },
  {
    id: 'waiting/electronic',
    page: 'waiting',
    label: 'تكليف إلكتروني',
    description: 'تكليف الانتظار مع رابط التوقيع الإلكتروني',
    tokens: ['اسم_المستلم', 'اليوم', 'رقم_الحصة', 'الفصل', 'المعلم_الغائب', 'رابط_التوقيع', 'اسم_المدرسة', 'التاريخ', 'الفصل_الدراسي'],
    defaultText: 'المكرم/ {اسم_المستلم}\nلديك تكليف انتظار يوم {اليوم}، الحصة {رقم_الحصة}، في فصل {الفصل} بدلاً من المعلم {المعلم_الغائب}.\n{اسم_المدرسة} - {اليوم} - {التاريخ} - {الفصل_الدراسي}.\nالرجاء التوقيع إلكترونياً عبر الرابط:\n{رابط_التوقيع}',
  },

  // ── شؤون الطلاب ───────────────────────────────────────────────────────
  {
    id: 'students/absence',
    page: 'students',
    label: 'غياب طالب',
    description: 'إشعار ولي الأمر بغياب ابنه',
    tokens: ['اسم_الطالب', 'اليوم', 'التاريخ', 'اسم_المدرسة'],
    defaultText: 'المكرم ولي أمر الطالب {اسم_الطالب}، نود إشعاركم بغياب ابنكم اليوم {اليوم} الموافق {التاريخ}.',
  },
  {
    id: 'students/late',
    page: 'students',
    label: 'تأخر طالب',
    description: 'إشعار ولي الأمر بتأخر ابنه عن الحضور',
    tokens: ['اسم_الطالب', 'اليوم', 'الوقت', 'اسم_المدرسة'],
    defaultText: 'المكرم ولي أمر الطالب {اسم_الطالب}، نود إشعاركم بتأخر ابنكم هذا اليوم {اليوم} وحضوره في الوقت ( س - د )',
  },
  {
    id: 'students/behavior',
    page: 'students',
    label: 'مخالفة سلوكية',
    description: 'إشعار ولي الأمر بمخالفة سلوكية ودعوته للزيارة',
    tokens: ['اسم_الطالب', 'اليوم', 'التاريخ', 'اسم_المدرسة'],
    defaultText: 'المكرم ولي أمر الطالب {اسم_الطالب}، نشعركم بارتكاب ابنكم لمخالفة سلوكية نأمل زيارتكم للمدرسة في يوم {اليوم} وتاريخ {التاريخ} للمناقشة.',
  },

  // ── التعاميم ──────────────────────────────────────────────────────────
  {
    id: 'circulars/general',
    page: 'circulars',
    label: 'تعميم',
    description: 'تعميم داخلي للمعلمين والإداريين',
    tokens: ['اسم_المعلم', 'اسم_الإداري', 'عنوان_التعميم', 'اليوم', 'التاريخ', 'اسم_المدرسة'],
    defaultText: 'التعميم الداخلي\nالمكرم / {اسم_المعلم}،{اسم_الإداري} ،نحيطكم علماً بالتعميم {عنوان_التعميم} المرفق نأمل الاطلاع والعمل بموجبه.',
  },
];

// ── طبقة تخصيصات المستخدم ────────────────────────────────────────────────
const STORAGE_KEY = 'motabe_message_catalog_overrides';
// حدث داخلي حتى تتزامن الواجهات المفتوحة (صفحة الإرسال + تبويب القوالب) فوراً
const CHANGE_EVENT = 'motabe-message-catalog-change';

type Overrides = Record<string, string>;

const readOverrides = (): Overrides => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeOverrides = (overrides: Overrides) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {}
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
};

export const getCatalogEntry = (id: string): MessageCatalogEntry | undefined =>
  MESSAGE_CATALOG.find(entry => entry.id === id);

/** النص الفعّال: تخصيص المستخدم إن وُجد وإلا الافتراضي */
export const getMessageTemplate = (id: string): string => {
  const custom = readOverrides()[id];
  if (typeof custom === 'string' && custom.trim()) return custom;
  return getCatalogEntry(id)?.defaultText ?? '';
};

export const isTemplateCustomized = (id: string): boolean => {
  const custom = readOverrides()[id];
  return typeof custom === 'string' && custom.trim().length > 0;
};

export const saveMessageTemplate = (id: string, text: string) => {
  const overrides = readOverrides();
  const entry = getCatalogEntry(id);
  // الحفظ بنص مطابق للافتراضي = استعادة الافتراضي
  if (!text.trim() || (entry && text === entry.defaultText)) delete overrides[id];
  else overrides[id] = text;
  writeOverrides(overrides);
};

export const resetMessageTemplate = (id: string) => {
  const overrides = readOverrides();
  delete overrides[id];
  writeOverrides(overrides);
};

export const subscribeToCatalogChanges = (listener: () => void): (() => void) => {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
};

/** تعبئة رموز {…} بقيمها — الرموز غير الممررة تُترك كما هي */
export const fillMessageTemplate = (template: string, values: Record<string, string>): string =>
  template.replace(/\{([^{}]+)\}/g, (match, token: string) =>
    Object.prototype.hasOwnProperty.call(values, token) ? values[token] : match
  );
