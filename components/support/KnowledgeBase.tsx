import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, BookOpen, HelpCircle } from 'lucide-react';

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
    ],
  },
  {
    id: 'schedule',
    label: 'الجدول المدرسي',
    items: [
      {
        q: 'ما الفرق بين التوزيع التلقائي واليدوي؟',
        a: 'التوزيع التلقائي يقوم النظام بإنشاء الجدول بذكاء مراعياً القيود المحددة. أما اليدوي فيتيح لك تعيين كل معلم بنفسك لكل يوم أو فترة.',
      },
      {
        q: 'كيف أنشئ جدول الإشراف اليومي؟',
        a: 'انتقل إلى "الجدول المدرسي > الإشراف اليومي" واختر بين التوزيع التلقائي أو اليدوي. حدد الفترة الزمنية ثم اضغط "إنشاء الجدول".',
      },
      {
        q: 'هل يمكنني تعديل الجدول بعد إنشائه؟',
        a: 'نعم، يمكنك تعديل التوزيع في أي وقت. في حالة إعادة التوزيع التلقائي ستظهر رسالة تحذيرية تُعلمك بأن الجدول السابق سيُحذف.',
      },
    ],
  },
  {
    id: 'supervision',
    label: 'الإشراف اليومي',
    items: [
      {
        q: 'كيف أطبع تقرير الإشراف اليومي؟',
        a: 'من صفحة الإشراف اليومي، انقر على أيقونة الطباعة في أعلى الصفحة. يمكنك اختيار طباعة جدول اليوم أو جدول الأسبوع.',
      },
      {
        q: 'هل يمكن تسجيل التوقيع الرقمي للمشرف؟',
        a: 'نعم، يدعم النظام التوقيع الرقمي للمشرفين. يتم إرسال رابط التوقيع عبر واتساب أو SMS للمشرف لتوقيعه إلكترونياً.',
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
        a: 'يمكنك إيقاف التجديد التلقائي في أي وقت من قسم "إدارة الاشتراك". سيظل اشتراكك فعالاً حتى نهاية الفترة المدفوعة.',
      },
      {
        q: 'ما وسائل الدفع المدعومة؟',
        a: 'تدعم المنصة: مدى، فيزا، ماستركارد، Apple Pay، Samsung Pay.',
      },
    ],
  },
];

const KnowledgeBase: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('settings');
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentCat = FAQ_DATA.find(c => c.id === activeCategory);

  const filteredItems = searchQuery.trim()
    ? FAQ_DATA.flatMap(cat =>
        cat.items
          .filter(item =>
            item.q.includes(searchQuery) || item.a.includes(searchQuery)
          )
          .map(item => ({ ...item, categoryLabel: cat.label }))
      )
    : (currentCat?.items.map(item => ({ ...item, categoryLabel: currentCat.label })) ?? []);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="ابحث في الأسئلة الشائعة..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setOpenItem(null); }}
          className="w-full pr-12 pl-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1]/30 text-slate-700 font-medium text-sm transition-all bg-white shadow-sm"
        />
      </div>

      <div className="flex gap-6">
        {/* Categories Sidebar */}
        {!searchQuery && (
          <aside className="w-56 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-[#f0eeff] border-b border-slate-100">
                <p className="font-black text-sm text-[#655ac1] flex items-center gap-2">
                  <BookOpen size={16} />
                  التصنيفات
                </p>
              </div>
              <div className="py-2">
                {FAQ_DATA.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setOpenItem(null); }}
                    className={`w-full text-right px-4 py-2.5 text-sm font-bold transition-all
                      ${activeCategory === cat.id
                        ? 'bg-[#f0eeff] text-[#655ac1] border-l-2 border-[#655ac1]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* FAQ Items */}
        <div className="flex-1 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
              <HelpCircle size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold">لا توجد نتائج مطابقة</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const key = `${item.q}-${idx}`;
              const isOpen = openItem === key;
              return (
                <div
                  key={key}
                  className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${isOpen ? 'border-[#655ac1]/30' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <button
                    onClick={() => setOpenItem(isOpen ? null : key)}
                    className="w-full flex items-center justify-between px-5 py-4 text-right"
                  >
                    <span className={`font-bold text-sm leading-relaxed ${isOpen ? 'text-[#655ac1]' : 'text-slate-700'}`}>
                      {item.q}
                    </span>
                    <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isOpen ? 'bg-[#655ac1] text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4">
                      <div className="h-px bg-slate-100 mb-3" />
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
