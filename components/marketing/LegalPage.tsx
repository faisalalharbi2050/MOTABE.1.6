import React, { useState } from 'react';
import { ChevronDown, Check, Mail, Phone, MessageCircle, Send, AlertCircle, User, School } from 'lucide-react';
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
    subtitle: 'إجابات للأسئلة الأكثر شيوعاً حول منصة متابع.',
  },
  privacy: {
    title: 'سياسة الخصوصية',
    subtitle: 'كيف نحمي بياناتك ونتعامل معها في منصة متابع.',
  },
  terms: {
    title: 'الشروط والأحكام',
    subtitle: 'الشروط التي تحكم استخدام منصة متابع.',
  },
  refund: {
    title: 'سياسة الاسترجاع',
    subtitle: 'سياستنا في استرداد المبالغ المدفوعة.',
  },
  contact: {
    title: 'تواصل معنا',
    subtitle: 'فريقنا في خدمتك — أرسل لنا رسالتك وسنعود إليك سريعاً.',
  },
};

const LegalPage: React.FC<Props> = ({ page, onNavigate }) => {
  const meta = TITLES[page];
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <MarketingHeader onNavigate={onNavigate} />
      <section className="bg-gradient-to-b from-[#fcfbff] to-white py-16 md:py-20 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-black text-slate-800 mb-4">
            {meta.title}
          </h1>
          <p className="text-slate-600 text-lg leading-relaxed">{meta.subtitle}</p>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-14">
        {page === 'faq' && <FAQContent />}
        {page === 'privacy' && <LegalContent sections={PRIVACY_SECTIONS} />}
        {page === 'terms' && <LegalContent sections={TERMS_SECTIONS} />}
        {page === 'refund' && <LegalContent sections={REFUND_SECTIONS} />}
        {page === 'contact' && <ContactForm />}
      </main>

      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
};

/* ───────────────────────── FAQ ───────────────────────── */
const FAQContent: React.FC = () => {
  const items = [
    {
      q: 'ما هي مدة التجربة المجانية؟',
      a: 'تبدأ تجربتك المجانية لمدة 10 أيام كاملة بمجرد إنشاء حسابك، بدون الحاجة لإدخال بيانات بطاقة ائتمان، ومع تفعيل جميع المزايا.',
    },
    {
      q: 'ماذا يحدث بعد انتهاء التجربة المجانية؟',
      a: 'يتوقف الوصول إلى ميزات المنصة، لكن بياناتك تبقى محفوظة لمدة 30 يوماً يمكنك خلالها الاشتراك واستئناف العمل من حيث توقفت.',
    },
    {
      q: 'هل الاشتراك يتجدد تلقائياً؟',
      a: 'لا. التجديد يدوي بالكامل — نُذكّرك قبل انتهاء اشتراكك بـ 7 أيام لتقرر بنفسك ما إذا كنت تريد التجديد.',
    },
    {
      q: 'ماذا يحدث لبياناتي إذا انتهى اشتراكي ولم أُجدّد؟',
      a: 'تُحفظ بياناتك بأمان لمدة 30 يوماً بعد انتهاء الاشتراك. خلال هذه الفترة يمكنك استئناف الاستخدام بمجرد التجديد، وبعدها قد تُحذف نهائياً.',
    },
    {
      q: 'هل يمكنني الترقية من الباقة الأساسية للمتقدمة؟',
      a: 'نعم، في أي وقت من قسم الاشتراك والفوترة. يتم احتساب المتبقي من اشتراكك الحالي تلقائياً وخصمه من تكلفة الترقية.',
    },
    {
      q: 'ما طرق الدفع المتاحة؟',
      a: 'مدى، فيزا، ماستركارد، Apple Pay، وSamsung Pay — جميعها تتم بشكل آمن داخل لوحة التحكم في قسم الاشتراك والفوترة.',
    },
    {
      q: 'هل يمكنني استرداد المبلغ بعد الاشتراك؟',
      a: 'نعم، حسب سياسة الاسترجاع: يمكنك طلب الاسترداد خلال 7 أيام من بدء الاشتراك إذا لم تكن قد استخدمت المنصة بشكل فعّال. للتفاصيل راجع صفحة سياسة الاسترجاع.',
    },
    {
      q: 'هل تدعمون أكثر من مدرسة بحساب واحد؟',
      a: 'نعم، يدعم متابع إدارة مدرسة ثانية ضمن نفس الحساب، مع إمكانية فصل البيانات والصلاحيات.',
    },
    {
      q: 'كيف أضيف رصيد رسائل إضافي؟',
      a: 'من قسم الرسائل في لوحة التحكم، يمكنك اختيار باقة رسائل (أساسية / متقدمة / احترافية) وإضافتها لرصيدك في أي وقت.',
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
            <span className="font-bold text-slate-800 text-base">{it.q}</span>
            <ChevronDown
              className={`w-5 h-5 text-[#655ac1] shrink-0 transition-transform ${
                open === i ? 'rotate-180' : ''
              }`}
            />
          </button>
          {open === i && (
            <div className="px-5 pb-5 text-slate-600 text-sm leading-loose border-t border-slate-100 pt-4">
              {it.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ───────────────────────── LEGAL CONTENT ───────────────────────── */
interface Section {
  heading: string;
  body: string[];
  list?: string[];
}

const LegalContent: React.FC<{ sections: Section[] }> = ({ sections }) => (
  <div className="prose prose-slate max-w-none space-y-8">
    <p className="text-sm text-slate-500">
      آخر تحديث: {new Date().toLocaleDateString('ar-SA')}
    </p>
    {sections.map((s, i) => (
      <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
        <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-4 flex items-center gap-3">
          <span className="w-1 h-7 bg-[#655ac1] rounded-full" />
          {s.heading}
        </h2>
        {s.body.map((p, j) => (
          <p key={j} className="text-slate-700 leading-loose text-sm md:text-base mb-3">
            {p}
          </p>
        ))}
        {s.list && (
          <ul className="space-y-2 mt-3">
            {s.list.map((li, k) => (
              <li key={k} className="flex items-start gap-2 text-sm md:text-base text-slate-700">
                <Check className="w-4 h-4 text-[#655ac1] mt-1 shrink-0" />
                <span className="leading-relaxed">{li}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    ))}
  </div>
);

const PRIVACY_SECTIONS: Section[] = [
  {
    heading: 'مقدمة',
    body: [
      'نحن في مؤسسة متابع التقنية نلتزم بحماية خصوصية مستخدمي منصتنا. توضح هذه السياسة كيفية جمع البيانات واستخدامها وحمايتها.',
      'باستخدامك للمنصة، فإنك توافق على ممارساتنا الموضّحة في هذه السياسة.',
    ],
  },
  {
    heading: 'البيانات التي نجمعها',
    body: ['نجمع البيانات التالية لتقديم خدماتنا:'],
    list: [
      'بيانات التسجيل: الاسم، البريد الإلكتروني، رقم الجوال، اسم المدرسة، المنصب.',
      'بيانات المدرسة: المعلمون، الفصول، الجداول، الإحصائيات.',
      'بيانات الاستخدام: سجلات الدخول، النشاط داخل المنصة، تفضيلات المستخدم.',
    ],
  },
  {
    heading: 'كيف نستخدم البيانات',
    body: ['نستخدم بياناتك للأغراض التالية حصراً:'],
    list: [
      'تشغيل المنصة وتقديم خدماتها.',
      'إرسال الإشعارات والتذكيرات المتعلقة بالاشتراك.',
      'تحسين أداء المنصة بناءً على بيانات الاستخدام المُجمَّعة.',
      'الرد على استفساراتك وطلبات الدعم الفني.',
    ],
  },
  {
    heading: 'حماية البيانات',
    body: [
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
    body: [
      'لأي استفسار حول الخصوصية، تواصل معنا عبر البريد الإلكتروني info@motabe.sa أو من صفحة "تواصل معنا".',
    ],
  },
];

const TERMS_SECTIONS: Section[] = [
  {
    heading: 'قبول الشروط',
    body: [
      'باستخدامك لمنصة متابع، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي منها، يُرجى الامتناع عن استخدام المنصة.',
    ],
  },
  {
    heading: 'الحساب والتسجيل',
    body: [
      'يتعهّد المستخدم بتقديم بيانات صحيحة ودقيقة عند التسجيل، وبالحفاظ على سرية بيانات الدخول.',
      'يتحمّل المستخدم المسؤولية الكاملة عن جميع الأنشطة التي تجري عبر حسابه.',
    ],
  },
  {
    heading: 'الاستخدام المسموح',
    body: ['يلتزم المستخدم بـ:'],
    list: [
      'استخدام المنصة لأغراض الإدارة المدرسية المشروعة فقط.',
      'عدم محاولة اختراق المنصة أو الإضرار بها.',
      'احترام حقوق الملكية الفكرية لمحتوى المنصة.',
      'الالتزام بالأنظمة والتشريعات المعمول بها في المملكة العربية السعودية.',
    ],
  },
  {
    heading: 'الاشتراكات والمدفوعات',
    body: [
      'الاشتراكات بمدد محددة (شهري / فصل دراسي / سنوي) ولا تتجدّد تلقائياً.',
      'تُحتسب جميع المبالغ بالريال السعودي وتشمل ضريبة القيمة المضافة حسب النظام.',
      'في حال انتهاء الاشتراك دون تجديد، يتم تعليق الوصول إلى الميزات المدفوعة.',
    ],
  },
  {
    heading: 'إخلاء المسؤولية',
    body: [
      'تُقدَّم المنصة "كما هي" دون ضمانات صريحة أو ضمنية. لا نتحمّل المسؤولية عن أي خسارة غير مباشرة ناتجة عن استخدام المنصة.',
      'نحرص على توفير المنصة بدون انقطاع، لكننا لا نضمن خلوّها التام من الأعطال.',
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
    body: [
      'نحتفظ بحق تعديل هذه الشروط في أي وقت. يُعتبر استمرار استخدامك للمنصة بعد التعديل قبولاً للشروط الجديدة.',
    ],
  },
];

const REFUND_SECTIONS: Section[] = [
  {
    heading: 'مبدأنا في الاسترجاع',
    body: [
      'نسعى في متابع إلى رضا عملائنا. إذا لم تكن المنصة مناسبة لاحتياجاتك، يحق لك طلب استرداد المبلغ وفق الشروط الموضّحة أدناه.',
    ],
  },
  {
    heading: 'الحالات المؤهّلة للاسترداد',
    body: ['يحق لك طلب استرداد المبلغ في الحالات التالية:'],
    list: [
      'خلال أول 7 أيام من بدء اشتراكك المدفوع، إذا لم يتم استخدام المنصة بشكل فعّال (لم تتم إضافة بيانات أو إنشاء جداول).',
      'في حال وجود عطل تقني جوهري لم يتمكن فريق الدعم من حله خلال 14 يوم عمل.',
      'إذا تم خصم المبلغ بطريق الخطأ من حسابك مرّتين عن نفس الاشتراك.',
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
      'تواصل معنا عبر صفحة "تواصل معنا" أو بريد info@motabe.sa.',
      'وضّح سبب الطلب، وأرفق رقم العملية / الفاتورة.',
      'يقوم فريقنا بمراجعة الطلب والرد خلال 3-5 أيام عمل.',
    ],
  },
  {
    heading: 'مدة الاسترداد',
    body: [
      'بعد الموافقة على الطلب، يتم رد المبلغ إلى نفس وسيلة الدفع الأصلية خلال 7-14 يوم عمل، حسب البنك ووسيلة الدفع المستخدمة.',
    ],
  },
];

/* ───────────────────────── CONTACT ───────────────────────── */
const ContactForm: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    schoolName: '',
    type: 'general',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const update = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'الاسم مطلوب';
    if (!form.email.trim()) errs.email = 'البريد مطلوب';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'صيغة البريد غير صحيحة';
    if (!form.phone.trim()) errs.phone = 'رقم الجوال مطلوب';
    if (!form.message.trim()) errs.message = 'الرسالة مطلوبة';
    else if (form.message.trim().length < 10) errs.message = 'الرسالة قصيرة جداً';
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
          شكراً لتواصلك مع متابع. سيتواصل معك فريقنا خلال 24 ساعة على البريد ورقم الجوال الذي زوّدتنا به.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm({ name: '', email: '', phone: '', schoolName: '', type: 'general', message: '' });
          }}
          className="px-6 py-3 bg-[#655ac1] hover:bg-[#52499d] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#655ac1]/25"
        >
          إرسال رسالة أخرى
        </button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Form */}
      <form
        onSubmit={submit}
        className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-5"
        noValidate
      >
        <ContactField label="الاسم الكامل" icon={User} error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="مثال: عبدالله بن محمد"
            className={inputCls(!!errors.name)}
          />
        </ContactField>

        <div className="grid sm:grid-cols-2 gap-4">
          <ContactField label="البريد الإلكتروني" icon={Mail} error={errors.email}>
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
          <ContactField label="رقم الجوال" icon={Phone} error={errors.phone}>
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
        </div>

        <ContactField label="اسم المدرسة (اختياري)" icon={School} error={errors.schoolName}>
          <input
            type="text"
            value={form.schoolName}
            onChange={(e) => update('schoolName', e.target.value)}
            placeholder="مدرسة..."
            className={inputCls(!!errors.schoolName)}
          />
        </ContactField>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">نوع الاستفسار</label>
          <select
            value={form.type}
            onChange={(e) => update('type', e.target.value)}
            className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-200 focus:border-[#655ac1] focus:outline-none text-sm cursor-pointer"
          >
            <option value="general">استفسار عام</option>
            <option value="support">دعم فني</option>
            <option value="sales">المبيعات والاشتراكات</option>
            <option value="suggestion">اقتراح</option>
            <option value="complaint">شكوى</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">الرسالة</label>
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
          إرسال الرسالة
        </button>
      </form>

      {/* Sidebar */}
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-[#655ac1] to-[#8779fb] rounded-2xl p-6 text-white shadow-lg shadow-[#655ac1]/25">
          <h3 className="font-black text-lg mb-2">طرق التواصل المباشر</h3>
          <p className="text-white/85 text-sm leading-relaxed">
            نحب أن نسمع منك. اختر الوسيلة الأنسب لك:
          </p>
        </div>

        <ContactInfoCard
          icon={MessageCircle}
          color="text-green-600"
          bg="bg-green-50"
          title="واتساب"
          value="0500000000"
          href="https://wa.me/966500000000"
        />
        <ContactInfoCard
          icon={Mail}
          color="text-[#655ac1]"
          bg="bg-[#e5e1fe]/50"
          title="البريد الإلكتروني"
          value="info@motabe.sa"
          href="mailto:info@motabe.sa"
        />
        <ContactInfoCard
          icon={Phone}
          color="text-[#655ac1]"
          bg="bg-[#e5e1fe]/50"
          title="الاتصال المباشر"
          value="920000000"
          href="tel:+966920000000"
        />

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong className="block mb-1">أوقات الدوام:</strong>
            الأحد - الخميس: 8 صباحاً - 5 مساءً
          </p>
        </div>
      </div>
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
  children: React.ReactNode;
}> = ({ label, icon: Icon, error, children }) => (
  <div>
    <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
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

const ContactInfoCard: React.FC<{
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
  title: string;
  value: string;
  href: string;
}> = ({ icon: Icon, color, bg, title, value, href }) => (
  <a
    href={href}
    target={href.startsWith('http') ? '_blank' : undefined}
    rel="noopener noreferrer"
    className="block bg-white border border-slate-200 rounded-2xl p-4 hover:border-[#655ac1]/25 hover:shadow-md transition-all"
  >
    <div className="flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 font-medium">{title}</div>
        <div className="font-bold text-slate-800 text-sm truncate">{value}</div>
      </div>
    </div>
  </a>
);

export default LegalPage;
