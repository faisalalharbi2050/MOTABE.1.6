import React, { useState, useRef, useEffect } from 'react';
import {
  X, Bot, Send, Headphones, Trash2,
  ThumbsUp, ThumbsDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type RatingValue = 'up' | 'down' | null;

interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  text: string;
  showSupportBtn?: boolean;
  suggestions?: string[];
  time: string;
  rating: RatingValue;
  showRating: boolean;
}

// ─── Knowledge Base ───────────────────────────────────────────────────────────
const KB_ANSWERS: { keywords: string[]; answer: string; suggestions?: string[] }[] = [
  {
    keywords: ['تسجيل', 'دخول', 'login', 'كلمة مرور', 'نسيت', 'كلمة السر'],
    answer:
      'لإعادة تعيين كلمة المرور:\n\n' +
      '1. افتح صفحة تسجيل الدخول\n' +
      '2. انقر على «نسيت كلمة المرور؟»\n' +
      '3. أدخل بريدك الإلكتروني المسجّل\n' +
      '4. افتح رسالة التحقق وانقر الرابط\n' +
      '5. أدخل كلمة المرور الجديدة وأكّدها\n\n' +
      'لم تصلك الرسالة؟ تحقق من مجلد البريد غير الهام (Spam).',
    suggestions: ['كيف أحدّث بريدي الإلكتروني؟', 'كيف أرفع تذكرة دعم؟'],
  },
  {
    keywords: ['اشتراك', 'باقة', 'تجديد', 'انتهى', 'فوترة', 'فاتورة', 'سعر', 'تكلفة', 'رسوم'],
    answer:
      'إدارة الاشتراك والباقات:\n\n' +
      'الباقات المتاحة: الأساسية · المتقدمة\n' +
      'دورات الدفع: شهري · فصلي · سنوي\n\n' +
      'للوصول إلى الاشتراك:\n' +
      '1. انتقل إلى «الإعدادات» في القائمة الجانبية\n' +
      '2. اختر «الاشتراك والفوترة»\n' +
      '3. اضغط «تغيير الباقة» أو «تجديد الاشتراك»\n\n' +
      'عند اقتراب انتهاء الاشتراك تظهر تنبيهات في لوحة التحكم.',
    suggestions: ['كم عدد رسائلي المجانية؟', 'كيف أرفع تذكرة دعم؟'],
  },
  {
    keywords: ['رسالة', 'واتساب', 'whatsapp', 'sms', 'إرسال', 'مجموعة', 'جماعية', 'رصيد', 'قالب'],
    answer:
      'لإرسال رسالة جماعية:\n\n' +
      '1. انتقل إلى «الرسائل» من القائمة الجانبية\n' +
      '2. انقر «رسالة جديدة»\n' +
      '3. اختر القناة: واتساب أو SMS\n' +
      '4. حدّد المستلمين (أفراد أو مجموعة كاملة)\n' +
      '5. اكتب النص أو اختر قالباً جاهزاً\n' +
      '6. انقر «إرسال» أو حدد وقت الإرسال للجدولة\n\n' +
      'الرصيد المجاني شهرياً:\n' +
      '• 50 رسالة واتساب\n' +
      '• 10 رسائل SMS',
    suggestions: ['كيف أنشئ قالب رسالة؟', 'كيف أعرض أرشيف الرسائل؟'],
  },
  {
    keywords: ['معلم', 'استاذ', 'أستاذ', 'مدرس', 'موظف', 'إضافة معلم', 'بيانات المعلم', 'استيراد'],
    answer:
      'لإضافة معلم أو موظف:\n\n' +
      '1. انتقل إلى «الإعدادات» ← «المعلمون والموظفون»\n' +
      '2. انقر «إضافة معلم»\n' +
      '3. أدخل البيانات: الاسم، التخصص، الدور\n' +
      '4. انقر «حفظ»\n\n' +
      'طرق الإضافة:\n' +
      '• يدوياً: مستخدم واحد في كل مرة\n' +
      '• استيراد Excel: لإضافة عدد كبير دفعة واحدة\n\n' +
      'بعد الإضافة يمكنك إسناد المواد له مباشرةً.',
    suggestions: ['كيف أسند مادة للمعلم؟', 'كيف أنشئ جدول الحصص؟'],
  },
  {
    keywords: ['جدول', 'حصص', 'توزيع حصص', 'إسناد', 'مواد', 'جدول الحصص', 'إنشاء جدول'],
    answer:
      'لإنشاء جدول الحصص:\n\n' +
      '1. تأكد من اكتمال بيانات المعلمين والمواد والفصول\n' +
      '2. انتقل إلى «الجدول المدرسي» ← «إسناد المواد»\n' +
      '3. أسند كل مادة للمعلم المختص\n' +
      '4. انتقل إلى «توزيع الحصص»\n' +
      '5. اختر «توزيع تلقائي» أو ابدأ التوزيع اليدوي\n' +
      '6. راجع الجدول وعدّله حسب الحاجة\n' +
      '7. انقر «اعتماد الجدول» عند الاكتمال\n\n' +
      'النظام يتجنب تعارضات التوقيت بين المعلمين تلقائياً.',
    suggestions: ['كيف أدير الإشراف اليومي؟', 'كيف أطبع الجدول؟'],
  },
  {
    keywords: ['إشراف', 'فسحة', 'ساحة', 'إشراف يومي', 'تكليف إشراف'],
    answer:
      'لإعداد جدول الإشراف اليومي:\n\n' +
      '1. انتقل إلى «الجدول المدرسي» ← «الإشراف اليومي»\n' +
      '2. حدد الفترة الزمنية (يوم / أسبوع)\n' +
      '3. حدد مواقع الإشراف\n' +
      '4. انقر «توزيع تلقائي» أو وزّع يدوياً\n' +
      '5. انقر «إرسال التكليف» لإشعار المشرفين عبر واتساب\n' +
      '6. انقر أيقونة الطباعة لتصدير الجدول\n\n' +
      'يدعم النظام التوقيع الرقمي للمشرفين.',
    suggestions: ['كيف أنشئ جدول المناوبة؟', 'كيف أدير الانتظار اليومي؟'],
  },
  {
    keywords: ['مناوبة', 'حضور', 'غياب', 'توقيع', 'دوام', 'جدول المناوبة'],
    answer:
      'لإنشاء جدول المناوبة:\n\n' +
      '1. انتقل إلى «المناوبة اليومية»\n' +
      '2. حدد نطاق الجدول: أسبوع / أسبوعان / شهر\n' +
      '3. اختر طريقة التوزيع (تلقائي / يدوي)\n' +
      '4. انقر «إنشاء الجدول»\n' +
      '5. راجع التوزيع وعدّل عند الحاجة\n' +
      '6. فعّل «التذكير التلقائي» لإرسال إشعار للمناوبين صباحاً\n\n' +
      'الصيغ المتاحة: طباعة · تصدير PDF',
    suggestions: ['كيف أدير الإشراف اليومي؟', 'كيف أصدّر التقارير؟'],
  },
  {
    keywords: ['صلاحية', 'وكيل', 'مفوض', 'دور', 'مسؤول', 'صلاحيات', 'تفويض'],
    answer:
      'لتفويض صلاحيات لمستخدم:\n\n' +
      '1. انتقل إلى «الصلاحيات» من القائمة\n' +
      '2. انقر «إضافة مفوض»\n' +
      '3. أدخل بيانات المستخدم (الاسم، الجوال، الدور)\n' +
      '4. حدد الأقسام المسموح بالوصول إليها\n' +
      '5. اختر مستوى الصلاحية: عرض فقط / تعديل\n' +
      '6. انقر «حفظ التفويض»\n\n' +
      'يمكن تعديل الصلاحيات أو إلغاؤها في أي وقت.',
    suggestions: ['كيف أضيف مستخدماً جديداً؟', 'كيف أدير بيانات المدرسة؟'],
  },
  {
    keywords: ['صف', 'فصل', 'شعبة', 'طلاب', 'طالب', 'مرحلة', 'فصول', 'مراحل'],
    answer:
      'لإدارة الفصول والصفوف:\n\n' +
      '1. انتقل إلى «الإعدادات» ← «الفصول والمراحل»\n' +
      '2. انقر «إضافة صف» لإنشاء مرحلة جديدة\n' +
      '3. أضف الشُعَب داخل كل صف\n' +
      '4. حدد عدد الطلاب لكل فصل\n\n' +
      'بعد إنشاء الفصول يمكنك إسناد المواد والمعلمين من قسم الجدول المدرسي.',
    suggestions: ['كيف أضيف مادة دراسية؟', 'كيف أسند معلماً لفصل؟'],
  },
  {
    keywords: ['مادة', 'تخصص', 'منهج', 'مواد دراسية', 'إضافة مادة'],
    answer:
      'لإدارة المواد الدراسية:\n\n' +
      '1. انتقل إلى «الإعدادات» ← «المواد الدراسية»\n' +
      '2. انقر «إضافة مادة»\n' +
      '3. أدخل اسم المادة وعدد الحصص الأسبوعية\n' +
      '4. حدد الصفوف التي تُدرَّس فيها\n' +
      '5. اربطها بالمعلمين المؤهلين\n\n' +
      'يستخدم النظام هذه البيانات تلقائياً عند بناء الجدول.',
    suggestions: ['كيف أسند مادة للمعلم؟', 'كيف أنشئ جدول الحصص؟'],
  },
  {
    keywords: ['تقرير', 'إحصاء', 'إحصائية', 'ملخص', 'إحصاءات'],
    answer:
      'التقارير المتاحة في متابع:\n\n' +
      '• لوحة التحكم: إحصائيات شاملة وملخص يومي\n' +
      '• الجدول المدرسي: تقرير الحصص والإسناد\n' +
      '• المناوبة: تقارير يومية وأسبوعية وشهرية\n' +
      '• الإشراف: تقرير توزيع المشرفين\n' +
      '• الرسائل: أرشيف الرسائل المُرسَلة\n\n' +
      'للوصول: انتقل للقسم المطلوب ← انقر «تقرير» أو أيقونة الطباعة.',
    suggestions: ['كيف أصدّر إلى PDF أو Excel؟'],
  },
  {
    keywords: ['طباعة', 'تصدير', 'pdf', 'excel', 'استخراج', 'تحميل'],
    answer:
      'للطباعة أو تصدير البيانات:\n\n' +
      '1. انتقل للصفحة المطلوبة (جدول، تقرير، إلخ)\n' +
      '2. ابحث عن أيقونة الطباعة أو زر «تصدير»\n' +
      '3. اختر الصيغة: PDF أو Excel\n' +
      '4. انقر «تحميل» أو «طباعة»\n\n' +
      'الصفحات التي تدعم التصدير:\n' +
      '• الجدول المدرسي\n' +
      '• تقرير الإسناد\n' +
      '• جداول المناوبة والإشراف\n' +
      '• كشوف التوقيعات',
    suggestions: ['كيف أعرض التقارير؟'],
  },
  {
    keywords: ['إشعار', 'تنبيه', 'notification', 'bell', 'جرس'],
    answer:
      'نظام الإشعارات في متابع:\n\n' +
      'أنواع الإشعارات:\n' +
      '• اقتراب انتهاء الاشتراك\n' +
      '• استهلاك رصيد الرسائل\n' +
      '• ردود على تذاكر الدعم\n' +
      '• تذكيرات الجداول اليومية\n\n' +
      'للوصول: انقر على أيقونة الجرس 🔔 في شريط التنقل العلوي.\n\n' +
      'التنبيهات المهمة تظهر أيضاً مباشرةً في لوحة التحكم.',
    suggestions: ['كيف أرفع تذكرة دعم؟'],
  },
  {
    keywords: ['دعم', 'مساعدة', 'ساعات العمل', 'أوقات', 'متى', 'توفر الدعم'],
    answer:
      'أوقات عمل فريق الدعم الفني:\n\n' +
      '📅 الأيام: الأحد – الخميس\n' +
      '⏰ الساعات: 8:00 ص – 2:30 م (بتوقيت الرياض)\n' +
      '🏖️ الإجازة: الجمعة والسبت\n\n' +
      'خارج أوقات العمل يمكنك:\n' +
      '• رفع تذكرة — يُرد عليها في يوم العمل التالي\n' +
      '• استخدام هذا المساعد للإجابات الفورية\n' +
      '• تصفح مركز المساعدة',
    suggestions: ['كيف أرفع تذكرة دعم؟', 'كيف أتواصل عبر واتساب؟'],
  },
  {
    keywords: ['تذكرة', 'شكوى', 'بلاغ', 'رفع تذكرة', 'دعم فني'],
    answer:
      'لرفع تذكرة دعم:\n\n' +
      '1. انتقل إلى تبويب «تذاكر الدعم» في هذه الصفحة\n' +
      '2. انقر «رفع تذكرة جديدة»\n' +
      '3. اختر تصنيف المشكلة\n' +
      '4. اكتب عنواناً ووصفاً تفصيلياً للمشكلة\n' +
      '5. أرفق صور أو ملفات توضيحية إن وجدت\n' +
      '6. انقر «إرسال التذكرة»\n\n' +
      'يمكنك متابعة الرد وإجراء المحادثة مباشرةً من التذكرة.',
    suggestions: ['ما أوقات الدعم؟', 'كيف أتواصل عبر واتساب؟'],
  },
  {
    keywords: ['مدرسة', 'بيانات المدرسة', 'اسم المدرسة', 'شعار', 'منطقة', 'بيانات أساسية'],
    answer:
      'لتعديل بيانات المدرسة:\n\n' +
      '1. انتقل إلى «الإعدادات» من القائمة الجانبية\n' +
      '2. اختر «الإعدادات الأساسية»\n' +
      '3. عدّل البيانات المطلوبة\n' +
      '4. انقر «حفظ التغييرات»\n\n' +
      'البيانات القابلة للتعديل:\n' +
      '• اسم المدرسة وشعارها\n' +
      '• المنطقة التعليمية والمرحلة\n' +
      '• المدارس المشتركة\n' +
      '• إعدادات الجدول الزمني',
    suggestions: ['كيف أضيف مدرسة مشتركة؟', 'كيف أدير الصلاحيات؟'],
  },
  {
    keywords: ['خطأ', 'error', 'مشكلة تقنية', 'لا يعمل', 'لا يفتح', 'توقف', 'عطل'],
    answer:
      'خطوات حل الأخطاء التقنية:\n\n' +
      '1. أعد تحميل الصفحة (F5 أو Ctrl+R)\n' +
      '2. امسح ذاكرة المتصفح المؤقتة:\n' +
      '   Ctrl+Shift+Delete ← امسح «الملفات المؤقتة»\n' +
      '3. جرّب متصفحاً مختلفاً (Chrome / Edge)\n' +
      '4. تحقق من استقرار الاتصال بالإنترنت\n\n' +
      'إذا استمرت المشكلة:\n' +
      'ارفع تذكرة دعم مع وصف تفصيلي وصورة للخطأ — يتواصل معك الفريق خلال أوقات العمل.',
    suggestions: ['كيف أرفع تذكرة دعم؟', 'ما أوقات الدعم؟'],
  },
  {
    keywords: ['حساب', 'بريد', 'إيميل', 'email', 'بريد إلكتروني', 'تحديث بيانات'],
    answer:
      'لتحديث بيانات الحساب:\n\n' +
      '1. انقر على اسمك أو صورتك في أعلى الشاشة\n' +
      '2. اختر «إعدادات الحساب»\n' +
      '3. عدّل البيانات المطلوبة:\n' +
      '   • الاسم الكامل\n' +
      '   • البريد الإلكتروني\n' +
      '   • رقم الجوال\n' +
      '   • كلمة المرور\n' +
      '4. انقر «حفظ»\n\n' +
      'عند تغيير البريد الإلكتروني ستصلك رسالة تحقق على البريد الجديد.',
    suggestions: ['مشكلة في تسجيل الدخول؟'],
  },
  {
    keywords: ['انتظار', 'حصة انتظار', 'احتياطي', 'حصة احتياطية', 'انتظار يومي'],
    answer:
      'لإدارة حصص الانتظار اليومي:\n\n' +
      '1. انتقل إلى «الجدول المدرسي» ← «الانتظار اليومي»\n' +
      '2. أضف حالات الغياب للمعلمين\n' +
      '3. انقر «توزيع تلقائي» لتوزيع الحصص بعدالة\n' +
      '4. راجع التوزيع وعدّل يدوياً إن لزم\n' +
      '5. انقر «إرسال الإشعارات» لإبلاغ المعلمين عبر واتساب\n\n' +
      'النظام يحسب رصيد الانتظار لكل معلم ويراعيه في التوزيع.',
    suggestions: ['كيف أدير الإشراف اليومي؟', 'كيف أدير المناوبة؟'],
  },
  {
    keywords: ['تقويم', 'إجازة', 'عطلة', 'أحداث', 'مناسبة'],
    answer:
      'للاطلاع على التقويم المدرسي:\n\n' +
      'يظهر التقويم في لوحة التحكم الرئيسية ويتضمن:\n' +
      '• الأحداث والمناسبات القادمة\n' +
      '• جدول الإجازات الرسمية\n' +
      '• تذكيرات الجداول اليومية\n\n' +
      'يمكن تخصيص التقويم وإضافة أحداث خاصة بمدرستك من إعدادات التقويم.',
    suggestions: ['كيف أعرض لوحة التحكم؟'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LS_KEY = 'motabe_chatbot_v2';

const fmt = (): string =>
  new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

const WELCOME_SUGGESTIONS = [
  'كيف أنشئ جدول الحصص؟',
  'كيف أرسل رسالة جماعية؟',
  'مشكلة في تسجيل الدخول',
  'كيف أضيف معلماً؟',
  'كيف أدير الصلاحيات؟',
  'كيف أرفع تذكرة دعم؟',
];

const makeWelcome = (): ChatMessage => ({
  id: 'welcome',
  role: 'bot',
  text: 'أهلاً! أنا مساعد متابع.\nاسألني عن أي ميزة في المنصة، أو اختر من الموضوعات الشائعة:',
  suggestions: WELCOME_SUGGESTIONS,
  time: fmt(),
  rating: null,
  showRating: false,
});

// ─── Component ────────────────────────────────────────────────────────────────
interface ChatbotWidgetProps {
  onOpenTicket: () => void;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ onOpenTicket }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return [makeWelcome()];
  });

  const [isOpen,       setIsOpen]       = useState(false);
  const [input,        setInput]        = useState('');
  const [isTyping,     setIsTyping]     = useState(false);
  const [unreadCount,  setUnreadCount]  = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  const scrollToBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);

  useEffect(() => {
    if (isOpen) { setUnreadCount(0); scrollToBottom(); }
  }, [isOpen]);

  // ── Logic ──────────────────────────────────────────────────────────────────
  const findEntry = (q: string) => {
    const lower = q.toLowerCase();
    return KB_ANSWERS.find(item => item.keywords.some(kw => lower.includes(kw))) ?? null;
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`, role: 'user', text: trimmed,
      time: fmt(), rating: null, showRating: false,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    scrollToBottom();

    await new Promise(r => setTimeout(r, 600 + Math.random() * 500));

    const entry = findEntry(trimmed);
    const botMsg: ChatMessage = {
      id: `b-${Date.now()}`,
      role: 'bot',
      text: entry?.answer ??
        'لم أجد إجابة مباشرة لسؤالك.\n\nيمكنك تجربة:\n• البحث في تبويب «مركز المساعدة»\n• رفع تذكرة دعم للحصول على مساعدة مخصصة',
      showSupportBtn: !entry,
      suggestions: entry?.suggestions,
      time: fmt(),
      rating: null,
      showRating: true,
    };
    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
    if (!isOpen) setUnreadCount(c => c + 1);
    scrollToBottom();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const clearChat = () => { setMessages([makeWelcome()]); setUnreadCount(0); };

  const rateMessage = (id: string, value: RatingValue) =>
    setMessages(prev => prev.map(m => m.id === id ? { ...m, rating: value } : m));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating Button ─────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-label="مساعد متابع"
        className={`fixed bottom-20 left-8 z-[9998] w-[72px] py-2.5 px-2 rounded-2xl shadow-2xl flex flex-col items-center gap-1.5 transition-all duration-300
          ${isOpen
            ? 'bg-slate-700'
            : 'bg-[#655ac1] hover:bg-[#52499d] hover:shadow-lg hover:shadow-[#655ac1]/40 hover:-translate-y-0.5'
          }`}
      >
        <div className="flex items-center gap-1.5">
          {isOpen ? <X size={22} className="text-white" /> : <Bot size={22} className="text-white" />}
          {!isOpen && (
            <span className="w-2.5 h-2.5 bg-green-400 rounded-full border border-white/40 animate-pulse" />
          )}
        </div>
        <span className="text-white font-black text-[9px] whitespace-nowrap leading-none">
          {isOpen ? 'إغلاق' : 'مساعد متابع'}
        </span>
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] bg-red-500 text-white text-xs font-black rounded-full border-2 border-white flex items-center justify-center px-1 shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      {/* ── Chat Window ──────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed bottom-36 left-8 z-[9997] w-[26rem] sm:w-[32rem] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{
            height: '560px',
            direction: 'rtl',
            animation: 'chatSlideUp 0.22s cubic-bezier(0.34, 1.4, 0.64, 1)',
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-l from-[#655ac1] to-[#8779fb] p-4 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Bot size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm">مساعد متابع</p>
              <p className="text-white/70 text-xs font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                يجيب على أسئلة المنصة فوراً
              </p>
            </div>
            <button
              onClick={clearChat}
              className="text-white/60 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
              title="مسح المحادثة"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fcfbff]"
            style={{ overscrollBehavior: 'contain' }}
          >
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[88%] flex flex-col gap-1.5">

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm font-medium leading-loose shadow-sm
                      ${msg.role === 'user'
                        ? 'bg-[#655ac1] text-white rounded-br-none'
                        : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                      }`}
                  >
                    <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
                    {msg.showSupportBtn && (
                      <button
                        onClick={() => { setIsOpen(false); onOpenTicket(); }}
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-[#655ac1] text-white text-xs font-bold py-2.5 px-3 rounded-xl hover:bg-[#52499d] transition-colors"
                      >
                        <Headphones size={14} />
                        رفع تذكرة دعم
                      </button>
                    )}
                  </div>

                  {/* Suggestion chips */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {msg.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(s)}
                          disabled={isTyping}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl border border-[#c4bef9] text-[#655ac1] bg-white hover:bg-[#f0eeff] hover:border-[#8779fb] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp + rating */}
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-[10px] text-slate-400 font-medium">{msg.time}</span>
                    {msg.showRating && (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => rateMessage(msg.id, msg.rating === 'up' ? null : 'up')}
                          className={`p-0.5 rounded transition-colors ${msg.rating === 'up' ? 'text-green-500' : 'text-slate-300 hover:text-green-400'}`}
                          title="مفيد"
                        >
                          <ThumbsUp size={12} />
                        </button>
                        <button
                          onClick={() => rateMessage(msg.id, msg.rating === 'down' ? null : 'down')}
                          className={`p-0.5 rounded transition-colors ${msg.rating === 'down' ? 'text-red-400' : 'text-slate-300 hover:text-red-300'}`}
                          title="غير مفيد"
                        >
                          <ThumbsDown size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-end">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    <div className="w-2 h-2 rounded-full bg-[#8779fb] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#8779fb] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#8779fb] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-slate-100 bg-white p-3 flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="اكتب سؤالك هنا..."
              rows={1}
              className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1]/30 transition-all"
              style={{ minHeight: '40px', maxHeight: '96px' }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 bg-[#655ac1] text-white rounded-xl flex items-center justify-center hover:bg-[#52499d] disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              aria-label="إرسال"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </>
  );
};

export default ChatbotWidget;
