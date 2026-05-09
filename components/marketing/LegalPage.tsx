import React, { useState } from 'react';
import {
  ChevronDown,
  Check,
  Mail,
  Phone,
  MessageCircle,
  Send,
  AlertCircle,
  User,
  School,
  ArrowRight,
  Clock,
  Calendar,
  Sun,
} from 'lucide-react';
import MarketingHeader from './MarketingHeader';
import MarketingFooter from './MarketingFooter';
import { MarketingRoute } from './MarketingApp';

export type LegalPageKey = 'faq' | 'privacy' | 'terms' | 'refund' | 'contact';

interface Props {
  page: LegalPageKey;
  onNavigate: (r: MarketingRoute) => void;
}

const TITLES: Record<LegalPageKey, { title: string; subtitle: string }> = {
  faq: {
    title: 'الأسئلة الشائعة',
    subtitle: 'إجابات للأسئلة الأكثر شيوعاً حول متابع.',
  },
  privacy: {
    title: 'سياسة الخصوصية',
    subtitle:
      'نحن نولي اهتماماً كبيراً لخصوصية بياناتك وأمانها في متابع ونوضح لك كيف نحمي بياناتك ونتعامل معها.',
  },
  terms: {
    title: 'الشروط والأحكام',
    subtitle: 'القواعد والضوابط المنظمة لاستخدام نظام متابع.',
  },
  refund: {
    title: 'سياسة الاسترجاع',
    subtitle: 'سياستنا في استرداد المبالغ المدفوعة.',
  },
  contact: {
    title: 'تواصل معنا',
    subtitle: 'فريقنا في خدمتك — أرسل لنا رسالتك وسنرد عليك في أقرب وقت.',
  },
};

const LegalPage: React.FC<Props> = ({ page, onNavigate }) => {
  const meta = TITLES[page];
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <MarketingHeader onNavigate={onNavigate} />
      <section className="bg-gradient-to-b from-[#fcfbff] to-white pt-6 md:pt-8 pb-16 md:pb-20 border-b border-slate-100">
        {/* Back button — aligned with header CTAs (max-w-[1280px]) */}
        <div className="max-w-[1280px] mx-auto px-5 lg:px-8 mb-12 md:mb-14">
          <div className="flex justify-end">
            <button
              onClick={() => onNavigate('landing')}
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#655ac1] hover:bg-[#52499d] text-white text-sm font-bold shadow-lg shadow-[#655ac1]/25 hover:shadow-[#655ac1]/40 hover:-translate-y-0.5 transition-all"
            >
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              رجوع
            </button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-black text-[#655ac1] mb-4">
              {meta.title}
            </h1>
            <p className="text-slate-800 text-lg leading-relaxed">{meta.subtitle}</p>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-14">
        {page === 'faq' && <FAQContent onNavigate={onNavigate} />}
        {page === 'privacy' && <LegalContent sections={PRIVACY_SECTIONS} onNavigate={onNavigate} />}
        {page === 'terms' && <LegalContent sections={TERMS_SECTIONS} onNavigate={onNavigate} />}
        {page === 'refund' && <LegalContent sections={REFUND_SECTIONS} onNavigate={onNavigate} />}
        {page === 'contact' && <ContactForm />}
      </main>

      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
};

/* ───────────────────────── FAQ ───────────────────────── */
const FAQContent: React.FC<{ onNavigate: (r: MarketingRoute) => void }> = ({ onNavigate }) => {
  const items: { q: string; a: React.ReactNode }[] = [
    {
      q: 'من نحن ؟',
      a: 'نحن فريق تقني متخصص في بناء الحلول الرقمية التعليمية، نسعى لتسهيل العمليات الإدارية والتعليمية في المدارس من خلال متابع.',
    },
    {
      q: 'هل يتطلب النظام تثبيت برامج خاصة ؟',
      a: 'لا، نظام متابع يعمل سحابياً بالكامل، كل ما تحتاجه هو متصفح إنترنت واتصال بالشبكة.',
    },
    {
      q: 'هل يمكن تجربة النظام قبل الاشتراك ؟',
      a: 'نعم، نوفر فترة تجربة مجانية لمدة 10 أيام لتكتشف جميع مزايا النظام بنفسك.',
    },
    {
      q: 'هل البيانات المدخلة آمنة ؟',
      a: (
        <>
          نعم، نستخدم أحدث تقنيات التشفير والحماية لضمان أمان وخصوصية البيانات، ويمكنك الاطلاع على{' '}
          <button
            onClick={() => onNavigate('privacy')}
            className="text-[#655ac1] underline font-bold hover:text-[#52499d] transition-colors"
          >
            سياسة الخصوصية
          </button>{' '}
          و{' '}
          <button
            onClick={() => onNavigate('terms')}
            className="text-[#655ac1] underline font-bold hover:text-[#52499d] transition-colors"
          >
            الشروط والأحكام
          </button>{' '}
          من هنا.
        </>
      ),
    },
    {
      q: 'هل يدعم متابع أكثر من مرحلة ( للمدارس المشتركة ) ؟',
      a: 'نعم، يدعم متابع إضافة مدرسة ثانية ضمن نفس الحساب، مع إمكانية فصل البيانات أو دمجها.',
    },
    {
      q: 'ماذا يحدث بعد انتهاء التجربة المجانية ؟',
      a: 'يتوقف الوصول إلى المميزات، لكن بياناتك تبقى محفوظة لمدة 30 يوماً يمكنك خلالها الاشتراك واستئناف العمل من حيث توقفت.',
    },
    {
      q: 'هل تجديد الاشتراك يتم تلقائيًا ؟',
      a: 'لا. التجديد يتم باختيارك، ونُذكّرك قبل انتهاء اشتراكك بـ 5 أيام لتقرر بنفسك ما إذا كنت تريد التجديد.',
    },
    {
      q: 'ماذا يحدث لبياناتي إذا لم أجدد الاشتراك ؟',
      a: 'تُحفظ بياناتك بأمان لمدة 30 يوماً بعد انتهاء الاشتراك. خلال هذه الفترة يمكنك استئناف الاستخدام بمجرد التجديد، وبعدها تُحذف نهائياً.',
    },
    {
      q: 'هل يمكنني ترقية الاشتراك من الباقة الأساسية إلى المتقدمة ؟',
      a: 'نعم، في أي وقت من قسم الاشتراك والفوترة، حيث يتم احتساب المتبقي من اشتراكك الحالي تلقائياً وخصمه من تكلفة الترقية.',
    },
    {
      q: 'ماهي طرق الدفع المتوفرة ؟',
      a: 'مدى، فيزا، ماستركارد، Apple Pay، وSamsung Pay — جميعها تتم بشكل آمن داخل لوحة التحكم في قسم الاشتراك والفوترة.',
    },
    {
      q: 'هل الرسائل مجانية ضمن الباقة ؟',
      a: 'الرسائل ليست مجانية وفي التجربة المجانية يتم منحك رصيد مجاني للرسائل (واتساب - نصية) لتجربة نظام الرسائل، ويمكنك اختيار باقة الرسائل وفق حاجتك وإضافتها لرصيدك في أي وقت.',
    },
  ];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div
          key={i}
          className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-[#655ac1]/25 transition-colors"
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 p-5 text-right"
          >
            <span className="font-bold text-slate-900 text-base">{it.q}</span>
            <ChevronDown
              className={`w-5 h-5 text-[#655ac1] shrink-0 transition-transform ${
                open === i ? 'rotate-180' : ''
              }`}
            />
          </button>
          {open === i && (
            <div className="px-5 pb-5 text-[#655ac1] text-sm leading-loose border-t border-slate-100 pt-4 font-medium">
              {it.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ───────────────────────── LEGAL CONTENT ───────────────────────── */
type LinkRef = { label: string; route: MarketingRoute };
interface Section {
  heading: string;
  body?: string[];
  list?: string[];
  trailing?: { text: string; link: LinkRef };
}

const LegalContent: React.FC<{
  sections: Section[];
  onNavigate: (r: MarketingRoute) => void;
}> = ({ sections, onNavigate }) => (
  <div className="space-y-6">
    {sections.map((s, i) => (
      <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
        <h2 className="text-xl md:text-2xl font-black text-[#655ac1] mb-4 flex items-center gap-3">
          <span className="w-1 h-7 bg-[#655ac1] rounded-full" />
          {s.heading}
        </h2>
        {s.body?.map((p, j) => (
          <p key={j} className="text-slate-900 leading-loose text-sm md:text-base mb-3">
            {p}
          </p>
        ))}
        {s.list && (
          <ul className="space-y-3 mt-3">
            {s.list.map((li, k) => (
              <li key={k} className="flex items-start gap-3 text-slate-900">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-[#7c6ee0] to-[#655ac1] flex items-center justify-center shadow-sm shadow-[#655ac1]/30 shrink-0">
                  <Check size={12} strokeWidth={3.5} className="text-white" />
                </div>
                <span className="font-bold text-sm leading-relaxed">{li}</span>
              </li>
            ))}
          </ul>
        )}
        {s.trailing && (
          <p className="text-slate-900 leading-loose text-sm md:text-base mt-3">
            {s.trailing.text}{' '}
            <button
              onClick={() => onNavigate(s.trailing!.link.route)}
              className="text-[#655ac1] underline font-bold hover:text-[#52499d] transition-colors"
            >
              {s.trailing.link.label}
            </button>
          </p>
        )}
      </div>
    ))}
  </div>
);

const PRIVACY_SECTIONS: Section[] = [
  {
    heading: 'مقدمة',
    body: [
      'نحن في متابع نلتزم بحماية خصوصية مستخدمي منصتنا، وتوضح هذه السياسة كيفية جمع البيانات واستخدامها وحمايتها وباستخدامك لنظام متابع فإنك توافق على ممارساتنا الموضّحة في هذه السياسة.',
    ],
  },
  {
    heading: 'البيانات التي نجمعها',
    body: ['نجمع البيانات التالية لتقديم خدماتنا:'],
    list: [
      'بيانات التسجيل: الاسم، البريد الإلكتروني، رقم الجوال.',
      'بيانات المدرسة: اسم المدرسة، التوقيت، المواد، الفصول، المعلمون، الإداريون، الطلاب، الجداول بكافة أنواعها، التقارير، الإحصائيات.',
      'بيانات الاستخدام: سجلات الدخول، النشاط داخل المنصة، والمعلومات حول كيفية تفاعلك مع النظام لتحسين تجربتك.',
    ],
  },
  {
    heading: 'كيف نستخدم البيانات',
    body: ['نستخدم بياناتك للأغراض التالية حصراً:'],
    list: [
      'تشغيل النظام وتقديم خدماته.',
      'تحسين أداء النظام بناءً على بيانات الاستخدام المُجمَّعة.',
      'تحسين وتطوير الميزات الجديدة.',
      'إرسال الإشعارات والتذكيرات المتعلقة بالاشتراك.',
      'التواصل معك بخصوص التحديثات والاستفسارات والدعم.',
    ],
  },
  {
    heading: 'حماية البيانات',
    list: [
      'نطبّق إجراءات أمنية تقنية وتنظيمية لحماية بياناتك من الوصول غير المصرّح به أو الفقدان أو التغيير.',
      'البيانات مشفّرة أثناء النقل وفي التخزين، ويُقتصر الوصول إليها على الموظفين المخوّلين فقط.',
    ],
  },
  {
    heading: 'حقوقك',
    body: ['لك الحق في:'],
    list: [
      'الوصول إلى بياناتك الشخصية المخزّنة لدينا.',
      'تصحيح أي بيانات غير صحيحة.',
      'حذف حسابك وجميع البيانات المرتبطة به.',
      'الاعتراض على معالجة بياناتك في حالات معينة.',
    ],
  },
  {
    heading: 'التواصل معنا',
    trailing: {
      text: 'لأي استفسار حول الخصوصية، تواصل معنا من خلال',
      link: { label: 'صفحة تواصل معنا', route: 'contact' },
    },
  },
];

const TERMS_SECTIONS: Section[] = [
  {
    heading: 'قبول الشروط',
    body: [
      'باستخدامك لمنصة متابع، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي منها، يُرجى الامتناع عن التسجيل والامتناع عن استخدام المنصة.',
    ],
  },
  {
    heading: 'الحساب والتسجيل',
    list: [
      'يتعهّد المستخدم بتقديم بيانات صحيحة ودقيقة عند التسجيل، وبالحفاظ على سرية بيانات الدخول.',
      'يتحمّل المستخدم المسؤولية الكاملة عن جميع الأنشطة التي تجري عبر حسابه.',
    ],
  },
  {
    heading: 'الاستخدام المسموح',
    body: ['يلتزم المستخدم بـ:'],
    list: [
      'استخدام النظام لأغراض الإدارة المدرسية المشروعة فقط.',
      'عدم محاولة اختراق النظام أو الإضرار به.',
      'احترام حقوق الملكية الفكرية لمحتوى نظام متابع.',
      'عدم نسخ أو تعديل أو توزيع أي جزء من النظام دون إذن كتابي.',
      'الالتزام بالأنظمة والتشريعات المعمول بها في المملكة العربية السعودية.',
    ],
  },
  {
    heading: 'الاشتراكات والمدفوعات',
    list: [
      'الاشتراكات بمدد محددة (شهري / فصل دراسي / سنوي) ولا تتجدّد تلقائياً.',
      'تُحتسب جميع المبالغ بالريال السعودي وفي حال شمول ضريبة القيمة المضافة سيتم إضافتها على السعر حسب النظام.',
      'في حال انتهاء الاشتراك دون تجديد، يتم تعليق الوصول إلى الميزات المدفوعة.',
    ],
  },
  {
    heading: 'إخلاء المسؤولية',
    list: [
      'يُقدَّم النظام "كما هو" دون ضمانات صريحة أو ضمنية.',
      'لا نتحمّل المسؤولية عن أي خسارة غير مباشرة ناتجة عن استخدام المنصة.',
      'نحرص على توفير النظام بدون انقطاع مالم يكن الأمر خارجًا عن إرادتنا، كما أننا لا نضمن خلوّها التام من الأعطال.',
    ],
  },
  {
    heading: 'إنهاء الخدمة',
    body: [
      'نحتفظ بحق إنهاء أو تعليق حساب أي مستخدم ينتهك هذه الشروط، مع إخطاره بذلك مسبقاً متى أمكن.',
    ],
  },
  {
    heading: 'تعديل الشروط',
    list: [
      'نحتفظ بحق تعديل هذه الشروط في أي وقت مع إشعارك بالتعديل.',
      'يُعتبر استمرار استخدامك للنظام بعد التعديل قبولاً للشروط الجديدة.',
    ],
  },
];

const REFUND_SECTIONS: Section[] = [
  {
    heading: 'مبدأنا في الاسترجاع',
    body: [
      'نسعى في متابع إلى رضا عملائنا، وهو الهدف الأسمى ويمكن طلب استرجاع المبلغ المدفوع في الحالات التالية فقط:',
    ],
  },
  {
    heading: 'الحالات المؤهّلة للاسترداد',
    body: ['يحق لك طلب استرداد المبلغ في الحالات التالية:'],
    list: [
      'خلال أول 7 أيام من بدء اشتراكك المدفوع، إذا لم يتم استخدام المنصة بشكل فعّال (لم تتم إضافة أي بيانات أو إنشاء جداول).',
      'في حال وجود عطل تقني جوهري لم يتمكن فريق الدعم من حله خلال 14 يوم عمل من تاريخ رفع الطلب.',
      'إذا تم خصم المبلغ عن طريق الخطأ من حسابك مرّتين لنفس الاشتراك مع تقديم إيصال الشراء.',
    ],
  },
  {
    heading: 'الحالات غير المؤهّلة للاسترداد',
    body: ['لا يحق طلب الاسترداد في الحالات التالية:'],
    list: [
      'بعد مرور 7 أيام من بدء الاشتراك المدفوع.',
      'إذا تم استخدام المنصة بشكل فعّال (إضافة بيانات، إنشاء جداول، إرسال رسائل).',
      'باقات الرسائل بعد بدء استخدامها (أي رسالة مُرسلة من الباقة).',
    ],
  },
  {
    heading: 'كيفية تقديم طلب الاسترداد',
    body: ['لتقديم طلب استرداد:'],
    list: [
      'تواصل معنا عن طريق قسم الاشتراك والفوترة.',
      'ارفع تذكرة دعم فني ووضّح سبب الطلب، وأرفق الفاتورة.',
      'يقوم فريقنا بمراجعة الطلب والرد خلال 3 إلى 7 أيام عمل.',
    ],
  },
  {
    heading: 'مدة الاسترداد',
    body: [
      'بعد الموافقة على الطلب، يتم رد المبلغ إلى نفس وسيلة الدفع الأصلية خلال 7 أيام إلى 14 يوم عمل، حسب البنك ووسيلة الدفع المستخدمة.',
    ],
  },
];

/* ───────────────────────── CONTACT ───────────────────────── */
const INQUIRY_TYPES: { value: string; label: string }[] = [
  { value: 'inquiry', label: 'استفسار' },
  { value: 'suggestion', label: 'اقتراح' },
  { value: 'tech', label: 'مشكلة تقنية' },
  { value: 'payment', label: 'مشكلة في الدفع' },
  { value: 'complaint', label: 'شكوى' },
  { value: 'other', label: 'أخرى' },
];

const ContactForm: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    schoolName: '',
    type: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const update = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'الاسم مطلوب';
    if (!form.phone.trim()) errs.phone = 'رقم الجوال مطلوب';
    if (!form.type) errs.type = 'يرجى اختيار التصنيف';
    if (!form.message.trim()) errs.message = 'الرسالة مطلوبة';
    else if (form.message.trim().length < 10) errs.message = 'الرسالة قصيرة جداً';
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email))
      errs.email = 'صيغة البريد غير صحيحة';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-gradient-to-b from-green-50 to-white border-2 border-green-200 rounded-3xl p-10 text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
          <Check className="w-8 h-8 text-white" strokeWidth={3} />
        </div>
        <h3 className="text-2xl font-black text-slate-800 mb-3">تم إرسال رسالتك بنجاح</h3>
        <p className="text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
          شكراً لتواصلك مع متابع. سيتواصل معك فريقنا في أقرب وقت ممكن.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm({ name: '', phone: '', email: '', schoolName: '', type: '', message: '' });
          }}
          className="px-6 py-3 bg-[#655ac1] hover:bg-[#52499d] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#655ac1]/25"
        >
          إرسال رسالة أخرى
        </button>
      </div>
    );
  }

  const selectedType = INQUIRY_TYPES.find((t) => t.value === form.type);

  return (
    <div className="space-y-6">
      {/* Work Hours Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
          <Clock size={22} className="text-[#655ac1] shrink-0" />
          <h3 className="font-black text-slate-800 text-base">أوقات العمل لفريق الدعم</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-3">
              <Calendar size={16} className="text-[#655ac1] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#8779fb] mb-1">أيام العمل</p>
                <p className="font-black text-slate-800 text-sm">الأحد — الخميس</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-3">
              <Clock size={16} className="text-[#655ac1] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#8779fb] mb-1">ساعات العمل</p>
                <p className="font-black text-slate-800 text-sm">8:00 ص — 2:30 م</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">بتوقيت مكة المكرمة</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-3">
              <Sun size={16} className="text-[#655ac1] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#8779fb] mb-1">أيام الإجازة</p>
                <p className="font-black text-slate-800 text-sm">الجمعة — السبت</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={submit}
        className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-5"
        noValidate
      >
        <ContactField label="الاسم بالكامل" required icon={User} error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="مثال: عبدالله بن محمد"
            className={inputCls(!!errors.name)}
          />
        </ContactField>

        <ContactField label="رقم الجوال" required icon={Phone} error={errors.phone}>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="05xxxxxxxx"
            className={inputCls(!!errors.phone)}
            dir="ltr"
            style={{ textAlign: 'right' }}
          />
        </ContactField>

        <ContactField label="البريد الإلكتروني" optional icon={Mail} error={errors.email}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="you@motabe.sa"
            className={inputCls(!!errors.email)}
            dir="ltr"
            style={{ textAlign: 'right' }}
          />
        </ContactField>

        <ContactField label="اسم المدرسة" optional icon={School} error={errors.schoolName}>
          <input
            type="text"
            value={form.schoolName}
            onChange={(e) => update('schoolName', e.target.value)}
            placeholder="مدرسة..."
            className={inputCls(!!errors.schoolName)}
          />
        </ContactField>

        {/* Custom Dropdown — radio circle style matching DailySupervision/DailyDuty */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            التصنيف <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setTypeOpen((o) => !o)}
              className={`w-full px-5 py-3 bg-white border-2 ${
                errors.type ? 'border-red-300' : 'border-slate-200'
              } text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2`}
            >
              <span className={`truncate text-sm ${selectedType ? 'text-slate-800' : 'text-slate-400'}`}>
                {selectedType?.label || 'اختر التصنيف'}
              </span>
              <ChevronDown
                size={16}
                className={`text-[#655ac1] transition-transform ${typeOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {typeOpen && (
              <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-30">
                <div className="space-y-1">
                  {INQUIRY_TYPES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        update('type', option.value);
                        setTypeOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                        form.type === option.value
                          ? 'bg-white text-[#655ac1]'
                          : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                      }`}
                    >
                      <span>{option.label}</span>
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                          form.type === option.value
                            ? 'bg-white border-[#655ac1] text-[#655ac1]'
                            : 'bg-white border-slate-300 text-transparent'
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {errors.type && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.type}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            الرسالة <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.message}
            onChange={(e) => update('message', e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            rows={5}
            className={`w-full px-4 py-3 bg-white rounded-xl border-2 text-sm focus:outline-none transition-colors resize-none ${
              errors.message
                ? 'border-red-300 focus:border-red-500'
                : 'border-slate-200 focus:border-[#655ac1]'
            }`}
          />
          {errors.message && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-[#655ac1] hover:bg-[#52499d] text-white rounded-xl font-bold text-base shadow-lg shadow-[#655ac1]/25 hover:shadow-[#655ac1]/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          إرسال
        </button>
      </form>
    </div>
  );
};

const inputCls = (err: boolean) =>
  `w-full pr-11 pl-4 py-3 bg-white rounded-xl border-2 text-sm focus:outline-none transition-colors ${
    err ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-[#655ac1]'
  }`;

const ContactField: React.FC<{
  label: string;
  icon: React.ComponentType<any>;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}> = ({ label, icon: Icon, error, required, optional, children }) => (
  <div>
    <label className="block text-sm font-bold text-slate-700 mb-2">
      {label}{' '}
      {required && <span className="text-red-500">*</span>}
      {optional && <span className="text-slate-900">*</span>}
    </label>
    <div className="relative">
      <Icon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
      {children}
    </div>
    {error && (
      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5" />
        {error}
      </p>
    )}
  </div>
);

export default LegalPage;
