import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, BookOpen, HelpCircle, Play, PlayCircle, Clock, X, Video, FileQuestion, Tag, Maximize2, Minimize2 } from 'lucide-react';

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
  {
    id: 'dashboard',
    label: 'لوحة التحكم',
    items: [
      {
        q: 'ماذا تعرض لوحة التحكم الرئيسية؟',
        a: 'تعرض لوحة التحكم ملخصاً شاملاً: إحصائيات المعلمين والفصول، جدول اليوم والغد، آخر الرسائل، مؤشر استهلاك رصيد الرسائل، وروابط سريعة للأقسام الرئيسية.',
      },
      {
        q: 'هل يمكن التنقل السريع بين الأقسام من لوحة التحكم؟',
        a: 'نعم، توفر لوحة التحكم أزرار وصول سريع للأقسام الأكثر استخداماً كالجدول والرسائل والإشراف والمناوبة.',
      },
      {
        q: 'هل تظهر تنبيهات مهمة في لوحة التحكم؟',
        a: 'نعم، تظهر تنبيهات اقتراب انتهاء الاشتراك، واستهلاك الرصيد المجاني للرسائل، وتذكيرات الجداول اليومية بشكل بارز في لوحة التحكم.',
      },
    ],
  },
  {
    id: 'settings',
    label: 'الإعدادات العامة',
    items: [
      {
        q: 'كيف أضيف مدرسة ثانية مشتركة؟',
        a: 'يمكنك إضافة مدرسة مشتركة من قسم "الإعدادات العامة > البيانات الأساسية". ابحث عن خيار "المدارس المشتركة" وقم بإضافة بيانات المدرسة الثانية.',
      },
      {
        q: 'كيف أضيف معلمين وأداريين؟',
        a: 'انتقل إلى "الإعدادات العامة > المعلمون" أو "الإداريون" وانقر على زر "إضافة" لإدخال بيانات كل فرد مع تحديد دوره وتخصصه.',
      },
      {
        q: 'كيف أضيف مواد دراسية وفصول؟',
        a: 'من قسم "المواد" يمكنك إضافة المواد وربطها بالصفوف الدراسية. ومن قسم "الفصول" يمكنك إنشاء وتنظيم الفصول الدراسية.',
      },
      {
        q: 'كيف أُعدّل بيانات المعلم أو الإداري بعد إضافته؟',
        a: 'انتقل إلى قسم "المعلمون" أو "الإداريون"، ابحث عن الشخص المطلوب ثم انقر على أيقونة التعديل بجانب اسمه لتحديث بياناته.',
      },
      {
        q: 'كيف أُحدّد الفترات الزمنية للحصص والفسح؟',
        a: 'من قسم "إعدادات الجدول" يمكنك تخصيص أوقات بداية ونهاية كل حصة وتحديد مدة الفسح بدقة.',
      },
      {
        q: 'هل يمكن استيراد بيانات المعلمين من ملف Excel؟',
        a: 'نعم، تدعم المنصة استيراد بيانات المعلمين من ملف Excel. انتقل إلى "المعلمون" وانقر على زر "استيراد" ثم ارفع الملف وفق النموذج المحدد.',
      },
    ],
  },
  {
    id: 'assignment',
    label: 'إسناد المواد',
    items: [
      {
        q: 'كيف أسند مادة لمعلم معين؟',
        a: 'من صفحة إسناد المواد، اختر المعلم من القائمة اليمنى ثم انقر على خلية المادة والفصل في شبكة الفصول لتسنيدها له. يشترط تحديد معلم أولاً قبل البدء بالإسناد.',
      },
      {
        q: 'ماذا تعني بطاقات إحصائيات الإسناد؟',
        a: 'تعرض البطاقات في أعلى الصفحة عدد الحصص غير المسندة، عدد الفصول غير المكتملة، وعدد المواد غير المسندة. هذه الأرقام تساعدك على متابعة مدى اكتمال الإسناد قبل إنشاء الجدول.',
      },
      {
        q: 'كيف أعرف أن نصاب المعلم سيتجاوز عند الإسناد؟',
        a: 'يحسب النظام حمل كل معلم تلقائياً. عند محاولة إسناد مادة ستتجاوز النصاب ستظهر رسالة تحذيرية تطلب منك تأكيد الإسناد رغم التجاوز، ويظهر الحمل الحالي لكل معلم بجانب اسمه في القائمة.',
      },
      {
        q: 'هل يمكن عرض تفاصيل إسنادات معلم معين؟',
        a: 'نعم، انقر على أيقونة العين بجانب اسم المعلم لعرض نافذة تتضمن جميع المواد والفصول المسندة له مع عدد الحصص لكل منها.',
      },
      {
        q: 'كيف أُلغي إسناد مادة لمعلم؟',
        a: 'انقر على خلية المادة المسندة في شبكة الفصول وستتحول إلى لون أحمر لتأكيد الحذف. ويمكنك أيضاً حذف جميع إسنادات معلم بعينه من خلال زر "حذف إسنادات المعلم" في بطاقته.',
      },
      {
        q: 'هل يمكن تصفية المعلمين بالتخصص أو بالفصل؟',
        a: 'نعم، تتوفر فلاتر تصفية متعددة: يمكن التصفية حسب التخصص وحسب اسم المعلم من جهة قائمة المعلمين، وحسب الصف والفصل من جهة شبكة الفصول.',
      },
      {
        q: 'ما الفرق بين عرض الصف وعرض الفصل؟',
        a: 'عرض الصف يظهر جميع فصول الصف الواحد بجميع موادها، بينما عرض الفصل يسمح لك بالتركيز على فصل واحد فقط مع موادة. استخدم عرض الصف للنظرة الشاملة وعرض الفصل للإسناد الدقيق.',
      },
      {
        q: 'كيف أطبع تقرير الإسناد الكامل؟',
        a: 'انقر على زر "تقرير الإسناد" في أعلى الصفحة. يعرض التقرير جميع المعلمين مع موادهم وفصولهم وعدد الحصص بصيغة قابلة للطباعة.',
      },
    ],
  },
  {
    id: 'schedule',
    label: 'جدول الحصص والانتظار',
    items: [
      {
        q: 'كيف يعمل نظام إنشاء جدول الحصص؟',
        a: 'يتم إنشاء جدول الحصص تلقائياً بطريقة ذكية تراعي عدد الحصص المقررة لكل مادة وتخصص المعلم وعدم التعارض في التوقيت. بعد إنشاء الجدول يمكنك تعديله يدوياً حصة بحصة، كما توفر المنصة ميزة "التعديل اليدوي المتعدد" التي تتيح تعديل جدول أكثر من معلم في نفس الوقت بشرط أن يكون التبادل متاحاً بينهم دون تعارض.',
      },
      {
        q: 'هل يمكنني تعديل الجدول بعد إنشائه؟',
        a: 'نعم، يمكنك تعديل التوزيع في أي وقت. في حالة إعادة التوزيع التلقائي ستظهر رسالة تحذيرية تُعلمك بأن الجدول السابق سيُحذف.',
      },
      {
        q: 'كيف أُطبع جدول الحصص أو أُصدّره؟',
        a: 'من صفحة الجدول انقر على زر "طباعة" أو "تصدير" في أعلى الصفحة. يمكنك اختيار طباعة جدول فصل معين أو جدول معلم بعينه أو جدول المدرسة كاملاً.',
      },
      {
        q: 'هل يراعي التوزيع التلقائي عدد حصص المعلم ومادته؟',
        a: 'نعم، يحترم التوزيع الذكي عدد الحصص المقررة لكل مادة وتخصص المعلم، ويتجنب التعارض في التوقيت بين الفصول والمعلمين.',
      },
      {
        q: 'هل يمكن إسناد مادة لمعلم بديل مؤقتاً؟',
        a: 'نعم، من خلال الإسناد اليدوي يمكنك تعيين معلم بديل لحصة معينة وذلك عبر قسم "الإسناد اليدوي" ضمن إعدادات الجدول.',
      },
    ],
  },
  {
    id: 'supervision',
    label: 'الإشراف اليومي',
    items: [
      {
        q: 'كيف أنشئ جدول الإشراف اليومي؟',
        a: 'انتقل إلى قسم "الإشراف اليومي" من القائمة الجانبية واختر بين التوزيع التلقائي أو اليدوي. حدد الفترة الزمنية ثم اضغط "إنشاء الجدول".',
      },
      {
        q: 'كيف أطبع تقرير الإشراف اليومي؟',
        a: 'من صفحة الإشراف اليومي، انقر على أيقونة الطباعة في أعلى الصفحة. يمكنك اختيار طباعة جدول اليوم أو جدول الأسبوع.',
      },
      {
        q: 'هل يمكن تسجيل التوقيع الرقمي للمشرف؟',
        a: 'نعم، يدعم النظام التوقيع الرقمي للمشرفين. يتم إرسال رابط التوقيع عبر واتساب أو SMS للمشرف لتوقيعه إلكترونياً.',
      },
      {
        q: 'كيف أُرسل إشعار التكليف بالإشراف للمعلم؟',
        a: 'بعد إنشاء جدول الإشراف، انقر على "إرسال التكليف" وسيتم إرسال رسالة واتساب أو SMS تلقائياً لكل مشرف تتضمن موقعه وتوقيته.',
      },
      {
        q: 'هل يمكن عرض جدول الإشراف لأسبوع كامل؟',
        a: 'نعم، يمكنك التبديل بين عرض اليوم والأسبوع من خلال أزرار التنقل في أعلى صفحة الإشراف اليومي.',
      },
      {
        q: 'هل يمكن استثناء معلم معين من جدول الإشراف؟',
        a: 'نعم، من إعدادات الجدول يمكنك تحديد المعلمين المُعفَيين من الإشراف وسيتجاهلهم النظام عند التوزيع التلقائي.',
      },
    ],
  },
  {
    id: 'duty',
    label: 'المناوبة اليومية',
    items: [
      {
        q: 'كيف أنشئ جدول مناوبة أسبوعي أو شهري؟',
        a: 'انتقل إلى "المناوبة اليومية" وحدد نطاق الجدول (أسبوع، أسبوعان، شهر). بعد ذلك اختر طريقة التوزيع واضغط "إنشاء الجدول".',
      },
      {
        q: 'ما هو تقرير المناوبة اليومية؟',
        a: 'التقرير اليومي يُظهر المعلمين والإداريين المناوبين لكل يوم مع مواقعهم. يمكن طباعته أو إرساله مباشرة.',
      },
      {
        q: 'كيف أُصدّر جدول المناوبة أو أطبعه؟',
        a: 'من صفحة المناوبة اليومية انقر على زر "طباعة" أو "تصدير PDF" لتحميل الجدول بصيغة جاهزة للطباعة.',
      },
      {
        q: 'هل يمكن إرسال تذكير يومي تلقائي للمناوبين؟',
        a: 'نعم، يمكنك تفعيل خاصية التذكير التلقائي من إعدادات المناوبة، وسيتم إرسال رسالة للمناوبين صباح كل يوم.',
      },
      {
        q: 'هل يمكن بناء جدول مناوبة لفصل دراسي كامل؟',
        a: 'نعم، يتيح النظام إنشاء جداول المناوبة لمدة أسبوع أو أسبوعين أو شهر كامل دفعة واحدة مع توزيع عادل بين المعلمين.',
      },
    ],
  },
  {
    id: 'daily_waiting',
    label: 'الانتظار اليومي',
    items: [
      {
        q: 'ما هو نظام الانتظار اليومي؟',
        a: 'يُساعدك نظام الانتظار على توزيع حصص الغياب على المعلمين المتاحين. يحسب النظام حصص الانتظار لكل معلم ويوزعها بعدالة.',
      },
      {
        q: 'كيف أُسجل حالات الغياب وأُوزع الحصص؟',
        a: 'من صفحة "الانتظار اليومي"، أضف حالات الغياب ثم انقر "توزيع تلقائي" لتوزيع حصص الغياب على المعلمين المتاحين.',
      },
      {
        q: 'هل يحتسب النظام رصيد الانتظار تراكمياً لكل معلم؟',
        a: 'نعم، يتتبع النظام عدد حصص الانتظار لكل معلم عبر الزمن ويراعيها عند التوزيع التلقائي لضمان العدالة.',
      },
      {
        q: 'هل يمكن إرسال الانتظار للمعلم المنتظر إلكترونياً؟',
        a: 'نعم، بعد التوزيع يمكنك إرسال إشعار فوري عبر واتساب أو SMS للمعلم يُعلمه بالفصل والحصة التي سينتظر فيها.',
      },
      {
        q: 'هل يدعم النظام التوقيع الرقمي لجدول الانتظار؟',
        a: 'نعم، يمكن للمعلم توقيع جدول الانتظار رقمياً عبر الرابط المرسل إليه، ويُحفظ التوقيع في سجل المنصة.',
      },
    ],
  },
  {
    id: 'messages',
    label: 'الرسائل',
    items: [
      {
        q: 'كيف أُرسل رسالة جماعية للمعلمين؟',
        a: 'من قسم "الرسائل"، اختر نوع الرسالة (واتساب أو SMS)، ثم حدد المستلمين من قائمة المعلمين أو الفصول، اكتب الرسالة واضغط إرسال.',
      },
      {
        q: 'ما عدد الرسائل المجانية في كل باقة؟',
        a: 'تمنحك كل باقة رصيداً مجانياً أولياً يتضمن 10 رسائل SMS و50 رسالة واتساب. بعد استهلاكه يتم احتساب الرسائل وفق تعرفة الباقة.',
      },
      {
        q: 'هل يمكن جدولة الرسائل لإرسالها في وقت محدد؟',
        a: 'نعم، عند إنشاء رسالة جديدة يمكنك تفعيل خيار "جدولة الإرسال" وتحديد التاريخ والوقت المناسبين.',
      },
      {
        q: 'كيف أُنشئ نموذج رسالة جاهز لأستخدمه لاحقاً؟',
        a: 'من قسم "الرسائل > القوالب" انقر على "إضافة قالب"، أدخل اسم القالب والنص وسيكون متاحاً عند إنشاء رسائل مستقبلية.',
      },
      {
        q: 'هل يتم حفظ الرسائل المُرسَلة وكيف أستعرضها؟',
        a: 'نعم، جميع الرسائل المُرسَلة محفوظة تلقائياً في قسم "أرشيف الرسائل" مع تاريخ الإرسال وحالة التوصيل.',
      },
    ],
  },
  {
    id: 'permissions',
    label: 'الصلاحيات',
    items: [
      {
        q: 'كيف أُفوِّض صلاحيات لمستخدم آخر؟',
        a: 'من قسم "الصلاحيات"، انقر على "إضافة مفوض"، أدخل بيانات المستخدم وحدد الأقسام التي يمكنه الوصول إليها ثم احفظ التغييرات.',
      },
      {
        q: 'هل يمكن تخصيص صلاحيات مختلفة لكل مستخدم؟',
        a: 'نعم، يمكنك منح كل مستخدم صلاحيات محددة كالعرض فقط أو التعديل، وتحديد الأقسام التي يُسمح له بالوصول إليها.',
      },
      {
        q: 'كيف أُلغي تفويض مستخدم أو أُعدّل صلاحياته؟',
        a: 'من قسم "الصلاحيات"، ابحث عن المستخدم وانقر على أيقونة التعديل لتغيير صلاحياته، أو انقر على "إلغاء التفويض" لحذف وصوله.',
      },
      {
        q: 'هل يمكن للوكيل أو المدير استخدام المنصة بشكل مستقل؟',
        a: 'نعم، يمكن للوكيل أو المدير المُفوَّض تسجيل الدخول والوصول إلى الأقسام المحددة فقط دون الاطلاع على بقية البيانات.',
      },
    ],
  },
  {
    id: 'subscription',
    label: 'الاشتراك والفوترة',
    items: [
      {
        q: 'ما الباقات المتاحة وأسعارها؟',
        a: 'تتوفر باقتان: الأساسية والمتقدمة. يمكنك الاطلاع على التفاصيل والأسعار الدقيقة من قسم "الاشتراك والفوترة > الباقات".',
      },
      {
        q: 'هل يمكن إلغاء الاشتراك في أي وقت؟',
        a: 'للإلغاء يرجى التواصل مع فريق الدعم الفني. سيظل اشتراكك فعالاً حتى نهاية الفترة المدفوعة.',
      },
      {
        q: 'ما وسائل الدفع المدعومة؟',
        a: 'تدعم المنصة: مدى، فيزا، ماستركارد، Apple Pay، Samsung Pay.',
      },
      {
        q: 'كيف أحصل على فاتورة ضريبية؟',
        a: 'جميع فواتيرك متاحة في قسم "الاشتراك والفوترة > الفواتير". يمكنك معاينتها وطباعتها أو تحميلها بصيغة PDF.',
      },
      {
        q: 'ماذا يحدث عند ترقية الباقة أثناء فترة اشتراك نشطة؟',
        a: 'يحتسب النظام الرصيد المتبقي من باقتك الحالية ويخصمه تلقائياً من سعر الباقة الجديدة (Pro-rata) عند إتمام الدفع.',
      },
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
  { id: 'dashboard', label: 'لوحة التحكم' },
  { id: 'settings', label: 'الإعدادات العامة' },
  { id: 'assignment', label: 'إسناد المواد' },
  { id: 'schedule', label: 'جدول الحصص والانتظار' },
  { id: 'supervision', label: 'الإشراف اليومي' },
  { id: 'duty', label: 'المناوبة اليومية' },
  { id: 'daily_waiting', label: 'الانتظار اليومي' },
  { id: 'messages', label: 'الرسائل' },
  { id: 'permissions', label: 'الصلاحيات' },
  { id: 'subscription', label: 'الاشتراك والفوترة' },
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
    <div className="space-y-4">

      {/* ── Unified Search ────────────────────────────────────────────────── */}
      <div className="relative">
        <Search size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder={section === 'faq' ? 'ابحث في الأسئلة الشائعة...' : 'ابحث في شروحات الفيديو...'}
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setOpenItem(null); }}
          className="w-full pr-11 pl-10 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-[#8779fb] focus:ring-1 focus:ring-[#8779fb]/30 text-slate-700 font-medium text-sm bg-white shadow-sm transition-all"
        />
        {isSearching && (
          <button
            onClick={() => { setSearchQuery(''); setOpenItem(null); }}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Section Tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl">
        {([
          { id: 'faq'    as const, icon: FileQuestion, label: 'الأسئلة الشائعة', count: FAQ_DATA.reduce((s, c) => s + c.items.length, 0) },
          { id: 'videos' as const, icon: Video,        label: 'شروحات الفيديو',  count: VIDEO_DATA.length },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => handleSectionSwitch(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-sm transition-all ${
              section === tab.id
                ? 'bg-white text-[#655ac1] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
              section === tab.id ? 'bg-[#ede9ff] text-[#655ac1]' : 'bg-white/80 text-slate-400'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-5">

        {/* ── Sidebar — دائماً ظاهر ─────────────────────────────────────── */}
        <aside className="w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-4">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <BookOpen size={14} className="text-[#8779fb]" />
              <span className="font-black text-slate-700 text-sm">الأقسام</span>
            </div>
            <div className="p-2 space-y-0.5">
              {sidebarItems.map(cat => {
                const isActive = cat.id === activeSidebarId && !isSearching;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSidebarClick(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-[#ede9ff] text-[#655ac1]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-[#655ac1]'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-black shrink-0 ${
                      isActive ? 'bg-[#c4bdf8]/40 text-[#655ac1]' : 'bg-slate-100 text-slate-400'
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
          <div className="flex items-center justify-between mb-4">
            {isSearching ? (
              <div className="flex items-center gap-2">
                <Search size={14} className="text-slate-400" />
                <span className="text-sm text-slate-500 font-bold">
                  {resultCount} نتيجة لـ «{searchQuery}»
                </span>
              </div>
            ) : (
              <h3 className="font-black text-slate-800 text-base">{currentCategoryLabel}</h3>
            )}
            <span className="text-xs text-slate-400 font-bold">
              {section === 'faq' ? `${resultCount} سؤال` : `${resultCount} مقطع`}
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
