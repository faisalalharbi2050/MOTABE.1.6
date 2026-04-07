import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, BookOpen, HelpCircle, Play, PlayCircle, Clock, X, Video, FileQuestion, Tag, Maximize2, Minimize2, LayoutList, LayoutDashboard, School, LayoutGrid, Users, GraduationCap, UserCog, ClipboardList, CalendarDays, Printer, Eye, ShieldCheck, Lock, MessageSquare, CreditCard } from 'lucide-react';

// ─── Section Icons Map ────────────────────────────────────────────────────────
const SECTION_ICONS: Record<string, React.ElementType> = {
  dashboard:          LayoutDashboard,
  settings_basic:     School,
  settings_timing:    Clock,
  settings_subjects:  BookOpen,
  settings_classes:   LayoutGrid,
  settings_teachers:  Users,
  settings_students:  GraduationCap,
  settings_admins:    UserCog,
  assignment:         ClipboardList,
  schedule:           CalendarDays,
  schedule_reports:   Printer,
  supervision:        Eye,
  duty:               ShieldCheck,
  daily_waiting:      Clock,
  permissions:        Lock,
  messages:           MessageSquare,
  subscription:       CreditCard,
};

interface FAQItem {
  q: string;
  a: string;
}
interface FAQCategory {
  id: string;
  label: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQCategory[] = [
  // ── الرئيسية ──────────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    label: 'الرئيسية',
    items: [
      { q: 'ماذا تعرض الصفحة الرئيسية؟', a: 'تعرض الصفحة الرئيسية ملخصاً شاملاً: إحصائيات المعلمين والفصول، جدول اليوم والغد، آخر الرسائل، مؤشر استهلاك رصيد الرسائل، وروابط سريعة للأقسام الرئيسية.' },
      { q: 'هل يمكن التنقل السريع بين الأقسام من الرئيسية؟', a: 'نعم، توفر الصفحة الرئيسية أزرار وصول سريع للأقسام الأكثر استخداماً كالجدول والرسائل والإشراف والمناوبة.' },
      { q: 'هل تظهر تنبيهات مهمة في الصفحة الرئيسية؟', a: 'نعم، تظهر تنبيهات اقتراب انتهاء الاشتراك، واستهلاك الرصيد المجاني للرسائل، وتذكيرات الجداول اليومية بشكل بارز.' },
    ],
  },
  // ── الإعدادات ─────────────────────────────────────────────────────────────
  {
    id: 'settings_basic',
    label: 'معلومات عامة',
    items: [
      { q: 'كيف أعدّل اسم المدرسة أو شعارها؟', a: 'من "الإعدادات > معلومات عامة" يمكنك تعديل اسم المدرسة والشعار وبقية البيانات الأساسية ثم حفظ التغييرات.' },
      { q: 'كيف أضيف مدرسة مشتركة؟', a: 'من صفحة "معلومات عامة" ابحث عن خيار "المدارس المشتركة" وأدخل بيانات المدرسة الثانية.' },
      { q: 'ما البيانات التي يمكن تعديلها في المعلومات العامة؟', a: 'يمكنك تعديل: اسم المدرسة، الشعار، العنوان، رقم الهاتف، البريد الإلكتروني، والمنطقة التعليمية.' },
    ],
  },
  {
    id: 'settings_timing',
    label: 'التوقيت',
    items: [
      { q: 'كيف أضبط أوقات بداية ونهاية الحصص؟', a: 'من "الإعدادات > التوقيت" أضف الحصص وحدد وقت البداية والنهاية لكل حصة على حدة.' },
      { q: 'كيف أضيف فترة فسحة وأحدد مدتها؟', a: 'من نفس الصفحة انقر "إضافة فسحة" وحدد وقتها ومدتها بالدقائق.' },
      { q: 'هل يمكن تعريف أكثر من فترة زمنية؟', a: 'نعم، يمكنك إضافة عدة حصص وفسحات وترتيبها وفق جدول المدرسة الفعلي.' },
      { q: 'كيف أحذف أو أعدّل وقت حصة موجودة؟', a: 'انقر أيقونة التعديل بجانب الحصة لتغيير وقتها، أو أيقونة الحذف لإزالتها نهائياً.' },
    ],
  },
  {
    id: 'settings_subjects',
    label: 'المواد',
    items: [
      { q: 'كيف أضيف مادة دراسية جديدة؟', a: 'من "الإعدادات > المواد" انقر "إضافة مادة"، أدخل اسمها وحدد الصفوف التي تُدرَّس فيها وعدد حصصها الأسبوعية.' },
      { q: 'كيف أحدد عدد الحصص الأسبوعية لكل مادة؟', a: 'عند إضافة أو تعديل المادة يمكنك تحديد عدد الحصص لكل صف دراسي مرتبط بها.' },
      { q: 'كيف أربط مادة بصف دراسي؟', a: 'من صفحة "المواد" اختر المادة وانقر تعديل، ثم حدد الصفوف الدراسية المرتبطة بها.' },
      { q: 'هل يمكن حذف مادة دراسية؟', a: 'نعم، لكن تأكد من عدم ارتباطها بإسنادات أو جداول نشطة قبل الحذف.' },
    ],
  },
  {
    id: 'settings_classes',
    label: 'الفصول',
    items: [
      { q: 'كيف أضيف فصلاً دراسياً جديداً؟', a: 'من "الإعدادات > الفصول" انقر "إضافة فصل" وحدد الصف والشعبة.' },
      { q: 'كيف أعدّل بيانات فصل موجود؟', a: 'انقر على أيقونة التعديل بجانب اسم الفصل لتحديث بياناته.' },
      { q: 'كيف أحذف فصلاً؟', a: 'انقر أيقونة الحذف بجانب الفصل، مع التأكد من عدم ارتباطه بجدول نشط.' },
      { q: 'هل يمكن نسخ فصل مع إعداداته؟', a: 'نعم، يمكن تكرار الفصل من خيار "نسخ" لإنشاء فصل مشابه بسرعة.' },
    ],
  },
  {
    id: 'settings_teachers',
    label: 'المعلمون',
    items: [
      { q: 'كيف أضيف معلماً جديداً؟', a: 'من "الإعدادات > المعلمون" انقر "إضافة معلم" وأدخل البيانات: الاسم، التخصص، النصاب، ورقم الجوال.' },
      { q: 'هل يمكن استيراد بيانات المعلمين من Excel؟', a: 'نعم، انقر على زر "استيراد" وارفع الملف وفق النموذج المحدد لإضافة عدد كبير دفعة واحدة.' },
      { q: 'كيف أعدّل بيانات معلم موجود؟', a: 'ابحث عن المعلم في القائمة وانقر أيقونة التعديل بجانب اسمه لتحديث بياناته.' },
      { q: 'كيف أحدد النصاب الأسبوعي للمعلم؟', a: 'عند إضافة أو تعديل المعلم يمكنك تحديد الحد الأقصى للحصص الأسبوعية (النصاب).' },
      { q: 'كيف أوقف حساب معلم مؤقتاً؟', a: 'من تعديل بيانات المعلم يمكنك تغيير حالته إلى "غير نشط" لإيقاف ظهوره دون حذفه.' },
    ],
  },
  {
    id: 'settings_students',
    label: 'الطلاب',
    items: [
      { q: 'كيف أضيف طالباً جديداً؟', a: 'من "الطلاب" انقر "إضافة طالب" وأدخل البيانات: الاسم، الفصل، ورقم الهوية.' },
      { q: 'هل يمكن استيراد بيانات الطلاب من Excel؟', a: 'نعم، انقر "استيراد" وارفع ملف Excel وفق النموذج المحدد لإضافة عدد كبير دفعة واحدة.' },
      { q: 'كيف أنقل طالباً من فصل إلى آخر؟', a: 'من تعديل بيانات الطالب غيّر الفصل المرتبط به واحفظ التغييرات.' },
      { q: 'كيف أبحث عن طالب معين؟', a: 'استخدم شريط البحث في أعلى صفحة الطلاب للبحث بالاسم أو رقم الهوية.' },
    ],
  },
  {
    id: 'settings_admins',
    label: 'الإداريون',
    items: [
      { q: 'كيف أضيف حساب إداري جديد؟', a: 'من "الإداريون" انقر "إضافة إداري" وأدخل البيانات: الاسم، الدور، ورقم الجوال.' },
      { q: 'كيف أعدّل بيانات إداري أو دوره؟', a: 'ابحث عن الإداري وانقر أيقونة التعديل لتحديث بياناته أو تغيير دوره.' },
      { q: 'ما الفرق بين الإداري والمعلم في النظام؟', a: 'المعلم مرتبط بالمواد والجداول الدراسية، أما الإداري فيُستخدم في جداول الإشراف والمناوبة دون ارتباط بمواد دراسية.' },
      { q: 'كيف أحذف حساب إداري؟', a: 'انقر أيقونة الحذف بجانب اسم الإداري، مع التأكد من عدم ارتباطه بجداول نشطة.' },
    ],
  },
  // ── الجدول المدرسي ────────────────────────────────────────────────────────
  {
    id: 'assignment',
    label: 'إسناد المواد',
    items: [
      { q: 'كيف أسند مادة لمعلم معين؟', a: 'من صفحة إسناد المواد، اختر المعلم من القائمة ثم انقر على خلية المادة والفصل في شبكة الفصول. يشترط تحديد معلم أولاً قبل البدء بالإسناد.' },
      { q: 'ماذا تعني بطاقات إحصائيات الإسناد؟', a: 'تعرض البطاقات في أعلى الصفحة عدد الحصص غير المسندة، عدد الفصول غير المكتملة، وعدد المواد غير المسندة لمتابعة مدى اكتمال الإسناد.' },
      { q: 'كيف أعرف أن نصاب المعلم سيتجاوز عند الإسناد؟', a: 'يحسب النظام حمل كل معلم تلقائياً، وتظهر رسالة تحذيرية عند محاولة تجاوز النصاب مع إمكانية التأكيد رغم التجاوز.' },
      { q: 'هل يمكن عرض تفاصيل إسنادات معلم معين؟', a: 'نعم، انقر على أيقونة العين بجانب اسم المعلم لعرض جميع المواد والفصول المسندة له مع عدد الحصص.' },
      { q: 'كيف أُلغي إسناد مادة لمعلم؟', a: 'انقر على خلية المادة المسندة وستتحول إلى لون أحمر للتأكيد. ويمكنك حذف جميع إسنادات معلم من زر "حذف إسنادات المعلم".' },
      { q: 'هل يمكن تصفية المعلمين بالتخصص أو بالفصل؟', a: 'نعم، تتوفر فلاتر للتصفية حسب التخصص والاسم من قائمة المعلمين، وحسب الصف والفصل من شبكة الفصول.' },
      { q: 'ما الفرق بين عرض الصف وعرض الفصل؟', a: 'عرض الصف يظهر جميع فصول الصف بجميع موادها، بينما عرض الفصل يركز على فصل واحد فقط. استخدم عرض الصف للنظرة الشاملة وعرض الفصل للإسناد الدقيق.' },
    ],
  },
  {
    id: 'schedule',
    label: 'إنشاء وإدارة الجدول',
    items: [
      { q: 'كيف يعمل نظام إنشاء جدول الحصص؟', a: 'يتم إنشاء الجدول تلقائياً بطريقة ذكية تراعي عدد الحصص المقررة لكل مادة وتخصص المعلم وعدم التعارض في التوقيت. بعد الإنشاء يمكنك التعديل اليدوي حصة بحصة، أو استخدام ميزة "التعديل اليدوي المتعدد" لتبادل حصص أكثر من معلم في آن واحد.' },
      { q: 'هل يمكنني تعديل الجدول بعد إنشائه؟', a: 'نعم، يمكنك تعديل التوزيع في أي وقت. عند إعادة التوزيع التلقائي ستظهر رسالة تحذيرية تُعلمك بأن الجدول السابق سيُحذف.' },
      { q: 'هل يراعي التوزيع التلقائي نصاب المعلم؟', a: 'نعم، يحترم التوزيع الذكي عدد الحصص المقررة لكل مادة وتخصص المعلم، ويتجنب التعارض في التوقيت بين الفصول والمعلمين.' },
      { q: 'هل يمكن تعيين معلم بديل لحصة معينة؟', a: 'نعم، من خلال الإسناد اليدوي يمكنك تعيين معلم بديل لحصة معينة عبر قسم "الإسناد اليدوي" ضمن إعدادات الجدول.' },
    ],
  },
  {
    id: 'schedule_reports',
    label: 'طباعة وتصدير الجدول',
    items: [
      { q: 'كيف أطبع جدول فصل معين؟', a: 'من "طباعة وتصدير الجدول" اختر "جدول الفصل"، حدد الفصل المطلوب ثم انقر "طباعة".' },
      { q: 'كيف أطبع جدول معلم بعينه؟', a: 'اختر "جدول المعلم"، حدد المعلم ثم انقر "طباعة" أو "تصدير PDF".' },
      { q: 'هل يمكن تصدير الجدول بصيغة PDF؟', a: 'نعم، من صفحة الطباعة انقر "تصدير PDF" لحفظ الجدول بصيغة جاهزة للمشاركة.' },
      { q: 'كيف أطبع جدول المدرسة كاملاً؟', a: 'اختر "جدول المدرسة الكامل" وحدد الصف أو الأسبوع ثم انقر طباعة.' },
      { q: 'هل يمكن طباعة جداول متعددة دفعة واحدة؟', a: 'نعم، يمكنك اختيار "طباعة الكل" لطباعة جداول جميع الفصول أو المعلمين معاً.' },
    ],
  },
  // ── الإشراف والمناوبة ─────────────────────────────────────────────────────
  {
    id: 'supervision',
    label: 'الإشراف اليومي',
    items: [
      { q: 'كيف أنشئ جدول الإشراف اليومي؟', a: 'انتقل إلى "الإشراف اليومي" واختر بين التوزيع التلقائي أو اليدوي، حدد الفترة الزمنية ثم اضغط "إنشاء الجدول".' },
      { q: 'كيف أطبع تقرير الإشراف اليومي؟', a: 'من صفحة الإشراف اليومي انقر أيقونة الطباعة في أعلى الصفحة. يمكنك اختيار طباعة جدول اليوم أو الأسبوع.' },
      { q: 'هل يمكن تسجيل التوقيع الرقمي للمشرف؟', a: 'نعم، يتم إرسال رابط التوقيع عبر واتساب أو SMS للمشرف لتوقيعه إلكترونياً.' },
      { q: 'كيف أُرسل إشعار التكليف بالإشراف للمعلم؟', a: 'بعد إنشاء الجدول انقر "إرسال التكليف" وسيتم إرسال رسالة واتساب أو SMS تلقائياً لكل مشرف.' },
      { q: 'هل يمكن استثناء معلم معين من الإشراف؟', a: 'نعم، من إعدادات الجدول يمكنك تحديد المعلمين المُعفَيين وسيتجاهلهم النظام عند التوزيع التلقائي.' },
    ],
  },
  {
    id: 'duty',
    label: 'المناوبة اليومية',
    items: [
      { q: 'كيف أنشئ جدول مناوبة أسبوعي أو شهري؟', a: 'انتقل إلى "المناوبة اليومية" وحدد نطاق الجدول (أسبوع، أسبوعان، شهر) ثم اختر طريقة التوزيع واضغط "إنشاء الجدول".' },
      { q: 'ما هو تقرير المناوبة اليومية؟', a: 'التقرير اليومي يُظهر المعلمين والإداريين المناوبين لكل يوم مع مواقعهم. يمكن طباعته أو إرساله مباشرة.' },
      { q: 'كيف أُصدّر جدول المناوبة أو أطبعه؟', a: 'انقر على زر "طباعة" أو "تصدير PDF" لتحميل الجدول بصيغة جاهزة للطباعة.' },
      { q: 'هل يمكن إرسال تذكير يومي تلقائي للمناوبين؟', a: 'نعم، فعّل خاصية التذكير التلقائي من إعدادات المناوبة وسيُرسَل للمناوبين صباح كل يوم.' },
      { q: 'هل يمكن بناء جدول مناوبة لفصل دراسي كامل؟', a: 'نعم، يتيح النظام إنشاء جداول المناوبة لمدة أسبوع أو أسبوعين أو شهر كامل مع توزيع عادل.' },
    ],
  },
  // ── الانتظار اليومي ───────────────────────────────────────────────────────
  {
    id: 'daily_waiting',
    label: 'الانتظار اليومي',
    items: [
      { q: 'ما هو نظام الانتظار اليومي؟', a: 'يُساعدك على توزيع حصص الغياب على المعلمين المتاحين بشكل عادل، ويحتسب رصيد الانتظار لكل معلم تراكمياً.' },
      { q: 'كيف أُسجل حالات الغياب وأُوزع الحصص؟', a: 'من "الانتظار اليومي" أضف حالات الغياب ثم انقر "توزيع تلقائي" لتوزيع الحصص على المعلمين المتاحين.' },
      { q: 'هل يحتسب النظام رصيد الانتظار تراكمياً؟', a: 'نعم، يتتبع النظام عدد حصص الانتظار لكل معلم ويراعيها عند التوزيع لضمان العدالة.' },
      { q: 'هل يمكن إرسال إشعار الانتظار للمعلم إلكترونياً؟', a: 'نعم، بعد التوزيع يمكنك إرسال إشعار فوري عبر واتساب أو SMS يُعلم المعلم بالفصل والحصة.' },
      { q: 'هل يدعم النظام التوقيع الرقمي لجدول الانتظار؟', a: 'نعم، يمكن للمعلم توقيع الجدول رقمياً عبر الرابط المرسل إليه ويُحفظ في سجل المنصة.' },
    ],
  },
  // ── الصلاحيات ─────────────────────────────────────────────────────────────
  {
    id: 'permissions',
    label: 'الصلاحيات',
    items: [
      { q: 'كيف أُفوِّض صلاحيات لمستخدم آخر؟', a: 'من "الصلاحيات" انقر "إضافة مفوض"، أدخل بيانات المستخدم وحدد الأقسام التي يمكنه الوصول إليها.' },
      { q: 'هل يمكن تخصيص صلاحيات مختلفة لكل مستخدم؟', a: 'نعم، يمكنك منح كل مستخدم صلاحيات محددة كالعرض فقط أو التعديل، مع تحديد الأقسام المسموح بها.' },
      { q: 'كيف أُلغي تفويض مستخدم أو أُعدّل صلاحياته؟', a: 'ابحث عن المستخدم وانقر أيقونة التعديل لتغيير صلاحياته، أو "إلغاء التفويض" لحذف وصوله.' },
      { q: 'هل يمكن للوكيل أو المدير استخدام المنصة بشكل مستقل؟', a: 'نعم، يمكن للمفوَّض تسجيل الدخول والوصول إلى الأقسام المحددة فقط دون الاطلاع على بقية البيانات.' },
    ],
  },
  // ── الرسائل ───────────────────────────────────────────────────────────────
  {
    id: 'messages',
    label: 'الرسائل',
    items: [
      { q: 'كيف أُرسل رسالة جماعية للمعلمين؟', a: 'من "الرسائل" اختر نوع الرسالة (واتساب أو SMS)، حدد المستلمين، اكتب الرسالة واضغط إرسال.' },
      { q: 'ما عدد الرسائل المجانية في كل باقة؟', a: 'تمنحك كل باقة رصيداً مجانياً أولياً يتضمن 10 رسائل SMS و50 رسالة واتساب.' },
      { q: 'هل يمكن جدولة الرسائل لإرسالها في وقت محدد؟', a: 'نعم، فعّل خيار "جدولة الإرسال" عند إنشاء الرسالة وحدد التاريخ والوقت المناسبين.' },
      { q: 'كيف أُنشئ قالب رسالة جاهز لأستخدمه لاحقاً؟', a: 'من "الرسائل > القوالب" انقر "إضافة قالب"، أدخل الاسم والنص وسيكون متاحاً في الرسائل المستقبلية.' },
      { q: 'هل يتم حفظ الرسائل المُرسَلة؟', a: 'نعم، جميع الرسائل محفوظة في "أرشيف الرسائل" مع تاريخ الإرسال وحالة التوصيل.' },
    ],
  },
  // ── الاشتراك والفوترة ─────────────────────────────────────────────────────
  {
    id: 'subscription',
    label: 'الاشتراك والفوترة',
    items: [
      { q: 'ما الباقات المتاحة وأسعارها؟', a: 'تتوفر باقتان: الأساسية والمتقدمة. يمكنك الاطلاع على التفاصيل والأسعار من "الاشتراك والفوترة > الباقات".' },
      { q: 'هل يمكن إلغاء الاشتراك في أي وقت؟', a: 'للإلغاء تواصل مع فريق الدعم الفني. سيظل اشتراكك فعالاً حتى نهاية الفترة المدفوعة.' },
      { q: 'ما وسائل الدفع المدعومة؟', a: 'تدعم المنصة: مدى، فيزا، ماستركارد، Apple Pay، Samsung Pay.' },
      { q: 'كيف أحصل على فاتورة ضريبية؟', a: 'فواتيرك متاحة في "الاشتراك والفوترة > الفواتير" للمعاينة والطباعة أو التحميل بصيغة PDF.' },
      { q: 'ماذا يحدث عند ترقية الباقة أثناء اشتراك نشط؟', a: 'يحتسب النظام الرصيد المتبقي ويخصمه تلقائياً من سعر الباقة الجديدة (Pro-rata).' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO TUTORIALS DATA
// ─────────────────────────────────────────────────────────────────────────────
interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  youtubeId?: string; // undefined = قريباً
  gradient: string;
}

const VIDEO_DATA: VideoTutorial[] = [
  // لوحة التحكم
  {
    id: 'v-dashboard-1',
    title: 'جولة شاملة في لوحة التحكم',
    description: 'تعرّف على جميع مكونات لوحة التحكم الرئيسية وكيفية الاستفادة منها لمتابعة العمل اليومي',
    duration: '4:20',
    category: 'dashboard',
    gradient: 'from-white to-slate-100',
  },
  {
    id: 'v-dashboard-2',
    title: 'الوصول السريع والإحصائيات',
    description: 'كيفية استخدام أزرار الوصول السريع ومؤشرات الإحصائيات في لوحة التحكم',
    duration: '2:45',
    category: 'dashboard',
    gradient: 'from-white to-slate-100',
  },
  // الإعدادات العامة
  {
    id: 'v-settings-1',
    title: 'إعداد بيانات المدرسة',
    description: 'خطوات إعداد بيانات المدرسة الأساسية وإضافة المدارس المشتركة من البداية',
    duration: '6:10',
    category: 'settings',
    gradient: 'from-white to-slate-100',
  },
  {
    id: 'v-settings-2',
    title: 'إضافة المعلمين والإداريين',
    description: 'كيفية إضافة المعلمين والإداريين يدوياً ومن ملف Excel مع تحديد الأدوار والتخصصات',
    duration: '7:30',
    category: 'settings',
    gradient: 'from-white to-slate-100',
  },
  {
    id: 'v-settings-3',
    title: 'إضافة المواد الدراسية والفصول',
    description: 'شرح إنشاء المواد الدراسية وربطها بالصفوف وإعداد الفصول الدراسية',
    duration: '5:15',
    category: 'settings',
    gradient: 'from-white to-slate-100',
  },
  {
    id: 'v-settings-4',
    title: 'ضبط إعدادات الجدول والفترات الزمنية',
    description: 'تحديد أوقات الحصص والفسح وإعداد الفترات الزمنية للعمل اليومي',
    duration: '4:50',
    category: 'settings',
    gradient: 'from-white to-slate-100',
  },
  // جدول الحصص
  {
    id: 'v-schedule-1',
    title: 'إنشاء جدول الحصص تلقائياً',
    description: 'شرح كيفية عمل خوارزمية التوزيع الذكي وإنشاء الجدول بخطوات بسيطة',
    duration: '8:40',
    category: 'schedule',
    gradient: 'from-white to-slate-100',
  },
  {
    id: 'v-schedule-2',
    title: 'التعديل اليدوي على الجدول',
    description: 'كيفية تعديل الحصص يدوياً والتبادل بين المعلمين دون تعارض',
    duration: '6:25',
    category: 'schedule',
    gradient: 'from-white to-slate-100',
  },
  {
    id: 'v-schedule-3',
    title: 'طباعة وتصدير الجدول',
    description: 'خيارات طباعة جدول الفصل والمعلم والمدرسة الكاملة وتصديرها',
    duration: '3:10',
    category: 'schedule',
    gradient: 'from-white to-slate-100',
  },
  // إسناد المواد
  {
    id: 'v-assignment-1',
    title: 'إسناد المواد للمعلمين',
    description: 'دليل كامل لإسناد المواد للمعلمين عبر شبكة الفصول مع مراعاة النصاب',
    duration: '9:05',
    category: 'assignment',
    gradient: 'from-white to-slate-100',
  },
  {
    id: 'v-assignment-2',
    title: 'قراءة تقرير الإسناد',
    description: 'كيفية متابعة إحصائيات الإسناد وطباعة التقرير الكامل',
    duration: '4:40',
    category: 'assignment',
    gradient: 'from-white to-slate-100',
  },
  // الإشراف اليومي
  {
    id: 'v-supervision-1',
    title: 'إنشاء جدول الإشراف اليومي',
    description: 'خطوات إنشاء جدول الإشراف التلقائي واليدوي وإدارة المشرفين',
    duration: '7:20',
    category: 'supervision',
    gradient: 'from-white to-slate-100',
  },
  {
    id: 'v-supervision-2',
    title: 'التوقيع الرقمي وإرسال التكليفات',
    description: 'كيفية إرسال تكليفات الإشراف وتفعيل التوقيع الرقمي الإلكتروني',
    duration: '5:55',
    category: 'supervision',
    gradient: 'from-white to-slate-100',
  },
  // المناوبة اليومية
  {
    id: 'v-duty-1',
    title: 'إنشاء جدول المناوبة',
    description: 'بناء جدول المناوبة الأسبوعي والشهري بالتوزيع العادل بين المعلمين',
    duration: '6:50',
    category: 'duty',
    gradient: 'from-white to-slate-100',
  },
  {
    id: 'v-duty-2',
    title: 'إرسال تكليفات المناوبة والتذكير اليومي',
    description: 'كيفية إرسال تكليفات المناوبة وتفعيل التذكير التلقائي اليومي',
    duration: '4:15',
    category: 'duty',
    gradient: 'from-white to-slate-100',
  },
  // الانتظار اليومي
  {
    id: 'v-waiting-1',
    title: 'توزيع حصص الغياب',
    description: 'كيفية تسجيل حالات الغياب وتوزيع الحصص تلقائياً على المعلمين المتاحين',
    duration: '5:30',
    category: 'daily_waiting',
    gradient: 'from-white to-slate-100',
  },
  {
    id: 'v-waiting-2',
    title: 'متابعة رصيد الانتظار والتوقيع',
    description: 'كيفية متابعة رصيد الانتظار التراكمي لكل معلم والتوقيع الرقمي على الجدول',
    duration: '4:00',
    category: 'daily_waiting',
    gradient: 'from-white to-slate-100',
  },
  // الرسائل
  {
    id: 'v-messages-1',
    title: 'إرسال رسائل جماعية',
    description: 'كيفية إرسال رسائل واتساب وSMS الجماعية للمعلمين والإداريين',
    duration: '5:45',
    category: 'messages',
    gradient: 'from-white to-slate-100',
  },
  {
    id: 'v-messages-2',
    title: 'إنشاء قوالب الرسائل وجدولتها',
    description: 'إنشاء قوالب رسائل جاهزة وجدولة الإرسال في أوقات محددة',
    duration: '4:30',
    category: 'messages',
    gradient: 'from-white to-slate-100',
  },
  // الصلاحيات
  {
    id: 'v-permissions-1',
    title: 'إدارة صلاحيات المستخدمين',
    description: 'كيفية إضافة مستخدمين مفوضين وتخصيص صلاحياتهم لكل قسم في المنصة',
    duration: '6:00',
    category: 'permissions',
    gradient: 'from-white to-slate-100',
  },
  // الاشتراك
  {
    id: 'v-subscription-1',
    title: 'إدارة الاشتراك والباقات',
    description: 'كيفية مقارنة الباقات وترقية الاشتراك والاطلاع على الفواتير الضريبية',
    duration: '5:00',
    category: 'subscription',
    gradient: 'from-white to-slate-100',
  },
];

const VIDEO_CATEGORIES = [
  { id: 'dashboard',        label: 'الرئيسية' },
  { id: 'settings_basic',   label: 'معلومات عامة' },
  { id: 'settings_timing',  label: 'التوقيت' },
  { id: 'settings_subjects',label: 'المواد' },
  { id: 'settings_classes', label: 'الفصول' },
  { id: 'settings_teachers',label: 'المعلمون' },
  { id: 'settings_students',label: 'الطلاب' },
  { id: 'settings_admins',  label: 'الإداريون' },
  { id: 'assignment',       label: 'إسناد المواد' },
  { id: 'schedule',         label: 'إنشاء وإدارة الجدول' },
  { id: 'schedule_reports', label: 'طباعة وتصدير الجدول' },
  { id: 'supervision',      label: 'الإشراف اليومي' },
  { id: 'duty',             label: 'المناوبة اليومية' },
  { id: 'daily_waiting',    label: 'الانتظار اليومي' },
  { id: 'permissions',      label: 'الصلاحيات' },
  { id: 'messages',         label: 'الرسائل' },
  { id: 'subscription',     label: 'الاشتراك والفوترة' },
];

// ─── Video Thumbnail Component ────────────────────────────────────────────────
const VideoCard: React.FC<{ video: VideoTutorial; onPlay: (v: VideoTutorial) => void }> = ({ video, onPlay }) => (
  <div
    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#655ac1]/30 transition-all duration-300 overflow-hidden group cursor-pointer"
    onClick={() => onPlay(video)}
  >
    {/* Thumbnail */}
    <div className={`relative h-28 bg-gradient-to-br ${video.gradient} flex items-center justify-center overflow-hidden`}>
      <div className="absolute inset-0">
        <div className="absolute top-2 right-2 w-16 h-16 rounded-full bg-slate-200/50" />
        <div className="absolute bottom-2 left-2 w-10 h-10 rounded-full bg-slate-200/50" />
        <div className="absolute top-1/2 left-1/3 w-8 h-8 rounded-full bg-slate-200/40" />
      </div>
      {/* Play Button */}
      <div className="relative z-10 w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center border border-slate-200/60 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
        <Play size={22} className="text-[#655ac1] fill-[#655ac1] mr-[-2px]" />
      </div>
      {/* Duration Badge */}
      <div className="absolute bottom-2 left-2 bg-white/90 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
        <Clock size={11} />
        {video.duration}
      </div>
      {/* Coming soon badge */}
      {!video.youtubeId && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-gradient-to-l from-[#8779fb] to-[#a99cf8] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
          قريباً
        </div>
      )}
    </div>
    {/* Content */}
    <div className="p-4">
      <h4 className="font-black text-slate-800 text-sm leading-snug mb-1 group-hover:text-[#655ac1] transition-colors">
        {video.title}
      </h4>
      <p className="text-slate-500 text-xs leading-relaxed font-medium line-clamp-2">
        {video.description}
      </p>
    </div>
  </div>
);

// ─── Video Player Modal ───────────────────────────────────────────────────────
const VideoModal: React.FC<{ video: VideoTutorial | null; onClose: () => void }> = ({ video, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!video) return null;

  const catLabel = VIDEO_CATEGORIES.find(c => c.id === video.category)?.label ?? '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,10,40,0.75)' }}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full overflow-hidden animate-fade-in transition-all duration-300 ${isExpanded ? 'max-w-5xl' : 'max-w-2xl'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="relative h-12 bg-[#8779fb] flex items-center px-5">
          <span className="text-white font-bold text-sm opacity-90">{catLabel}</span>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(v => !v)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
              title={isExpanded ? 'تصغير' : 'تكبير'}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {/* Video area */}
        <div className="relative bg-slate-50 aspect-video flex items-center justify-center border-y border-slate-100">
          {video.youtubeId ? (
            <iframe
              src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center border border-slate-200/60">
                <PlayCircle size={40} className="text-[#8779fb] opacity-80" />
              </div>
              <div className="text-center">
                <p className="text-xl font-black mb-1 text-slate-700">قريباً</p>
                <p className="text-sm font-medium text-slate-500">جارٍ تجهيز هذا الشرح</p>
              </div>
            </div>
          )}
        </div>
        {/* Info */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-800 text-base leading-snug">{video.title}</h3>
              <p className="text-slate-500 text-sm font-medium mt-1 leading-relaxed">{video.description}</p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg">
              <Clock size={13} />
              {video.duration}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface KnowledgeBaseProps {
  initialCategory?: string;
  initialSearch?: string;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  initialCategory = 'dashboard',
  initialSearch = '',
}) => {
  const [section,        setSection]        = useState<'faq' | 'videos'>('faq');
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [videoCategory,  setVideoCategory]  = useState(initialCategory);
  const [openItem,       setOpenItem]       = useState<string | null>(null);
  const [searchQuery,    setSearchQuery]    = useState(initialSearch);

  const [playingVideo, setPlayingVideo] = useState<VideoTutorial | null>(null);

  const isSearching = searchQuery.trim().length > 0;

  // ── Counts ────────────────────────────────────────────────────────────────
  const faqCounts = useMemo(
    () => Object.fromEntries(FAQ_DATA.map(c => [c.id, c.items.length])),
    [],
  );
  const videoCounts = useMemo(
    () => Object.fromEntries(
      VIDEO_CATEGORIES.map(c => [c.id, VIDEO_DATA.filter(v => v.category === c.id).length]),
    ),
    [],
  );

  // ── FAQ items ─────────────────────────────────────────────────────────────
  const faqItems = useMemo(() => {
    if (isSearching) {
      return FAQ_DATA.flatMap(cat =>
        cat.items
          .filter(item => item.q.includes(searchQuery) || item.a.includes(searchQuery))
          .map(item => ({ ...item, categoryLabel: cat.label, catId: cat.id })),
      );
    }
    const cat = FAQ_DATA.find(c => c.id === activeCategory);
    return cat ? cat.items.map(item => ({ ...item, categoryLabel: cat.label, catId: cat.id })) : [];
  }, [searchQuery, activeCategory, isSearching]);

  // ── Video items ───────────────────────────────────────────────────────────
  const videoItems = useMemo(() => {
    if (isSearching) {
      return VIDEO_DATA.filter(
        v => v.title.includes(searchQuery) || v.description.includes(searchQuery),
      );
    }
    return VIDEO_DATA.filter(v => v.category === videoCategory);
  }, [searchQuery, videoCategory, isSearching]);

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const sidebarItems = section === 'faq'
    ? FAQ_DATA.map(c => ({ id: c.id, label: c.label, count: faqCounts[c.id] }))
    : VIDEO_CATEGORIES.map(c => ({ id: c.id, label: c.label, count: videoCounts[c.id] }));

  const activeSidebarId = section === 'faq' ? activeCategory : videoCategory;

  const handleSidebarClick = (id: string) => {
    setSearchQuery('');
    setOpenItem(null);
    if (section === 'faq') setActiveCategory(id);
    else setVideoCategory(id);
  };

  const handleSectionSwitch = (s: 'faq' | 'videos') => {
    setSection(s);
    setSearchQuery('');
    setOpenItem(null);
  };

  const currentCategoryLabel = section === 'faq'
    ? FAQ_DATA.find(c => c.id === activeCategory)?.label
    : VIDEO_CATEGORIES.find(c => c.id === videoCategory)?.label;

  const resultCount = section === 'faq' ? faqItems.length : videoItems.length;

  return (
    <div className="space-y-3">

      {/* ── Section Tabs ─────────────────────────────────────────────────── */}
      <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex gap-1">
        {([
          { id: 'faq'    as const, icon: FileQuestion, label: 'الأسئلة الشائعة' },
          { id: 'videos' as const, icon: Video,        label: 'شروحات الفيديو'  },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => handleSectionSwitch(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-xl font-black text-sm transition-all ${
              section === tab.id
                ? 'bg-[#655ac1] text-white shadow-md shadow-indigo-200'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-5">

        {/* ── Sidebar — دائماً ظاهر ─────────────────────────────────────── */}
        <aside className="w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md sticky top-4 overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-3 pb-2.5 flex items-center gap-2.5 border-b border-slate-100">
              <LayoutList size={17} className="text-[#655ac1]" />
              <span className="text-sm font-black text-slate-700">الأقسام</span>
            </div>
            {/* Items */}
            <div className="py-2">
              {sidebarItems.map(cat => {
                const isActive = cat.id === activeSidebarId && !isSearching;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSidebarClick(cat.id)}
                    className={`relative w-full flex items-center justify-between px-3 py-2 mx-1 rounded-xl text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-white border border-slate-200 text-[#655ac1] shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-[#655ac1]'
                    }`}
                    style={isActive ? { width: 'calc(100% - 8px)' } : {}}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {(() => { const Icon = SECTION_ICONS[cat.id]; return Icon ? <Icon size={15} className={`shrink-0 ${isActive ? 'text-[#655ac1]' : 'text-slate-400'}`} /> : null; })()}
                      <span className="truncate">{cat.label}</span>
                    </div>
                    <span className={`text-xs font-black shrink-0 transition-all min-w-[22px] text-center px-1.5 py-0.5 rounded-full border ${
                      isActive ? 'text-[#655ac1] border-[#c4bef9]' : 'text-slate-400 border-slate-200'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Content Header */}
          <div className="flex items-center gap-3 mb-3 pr-1">
            {isSearching ? (
              <div className="flex items-center gap-2">
                <Search size={14} className="text-slate-400" />
                <span className="text-sm text-slate-500 font-bold">
                  {resultCount} نتيجة لـ «{searchQuery}»
                </span>
              </div>
            ) : (
              <h3 className="font-black text-slate-800 text-lg">{currentCategoryLabel}</h3>
            )}
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full border border-slate-200 text-slate-400 shrink-0">
              {section === 'faq'
                ? resultCount === 1 ? '١ سؤال' : `${resultCount} أسئلة`
                : resultCount === 1 ? '١ مقطع' : `${resultCount} مقاطع`}
            </span>
          </div>

          {/* ── FAQ Content ────────────────────────────────────────────── */}
          {section === 'faq' && (
            <div className="space-y-2.5">
              {faqItems.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                  <HelpCircle size={38} className="mx-auto mb-3 text-slate-200" />
                  <p className="font-bold text-slate-400">لا توجد نتائج</p>
                  <p className="text-xs text-slate-300 mt-1 font-medium">جرّب كلمات بحث مختلفة</p>
                </div>
              ) : (
                faqItems.map((item, idx) => {
                  const key = `${item.catId}-${idx}`;
                  const isOpen = openItem === key;
                  return (
                    <div
                      key={key}
                      className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
                        isOpen ? 'border-[#8779fb]/40' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <button
                        onClick={() => setOpenItem(isOpen ? null : key)}
                        className="w-full flex items-start justify-between px-5 py-4 text-right gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          {isSearching && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#8779fb] bg-[#f0eeff] px-2.5 py-1 rounded-full mb-2">
                              <Tag size={9} />
                              {item.categoryLabel}
                            </span>
                          )}
                          <p className={`font-bold text-sm leading-relaxed ${isOpen ? 'text-[#655ac1]' : 'text-slate-700'}`}>
                            {item.q}
                          </p>
                        </div>
                        <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all mt-0.5 ${
                          isOpen ? 'bg-[#8779fb] text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5">
                          <div className="h-px bg-slate-100 mb-3" />
                          <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Videos Content ─────────────────────────────────────────── */}
          {section === 'videos' && (
            <>
              {videoItems.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <PlayCircle size={38} className="mx-auto mb-3 text-slate-200" />
                  <p className="font-bold text-slate-400">لا توجد نتائج</p>
                  <p className="text-xs text-slate-300 mt-1 font-medium">جرّب كلمات بحث مختلفة</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {videoItems.map(video => (
                    <VideoCard key={video.id} video={video} onPlay={setPlayingVideo} />
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* ── Video Player Modal ──────────────────────────────────────────── */}
      <VideoModal video={playingVideo} onClose={() => setPlayingVideo(null)} />
    </div>
  );
};

export default KnowledgeBase;
