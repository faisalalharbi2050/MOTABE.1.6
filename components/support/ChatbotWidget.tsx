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
  time: string;
  rating: RatingValue;
  showRating: boolean;
}

// ─── Knowledge Base (20 entries) ─────────────────────────────────────────────
const KB_ANSWERS: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['تسجيل', 'دخول', 'login', 'كلمة مرور', 'نسيت', 'كلمة السر'],
    answer: 'يمكنك إعادة تعيين كلمة المرور من صفحة تسجيل الدخول ← "نسيت كلمة المرور". ستصلك رابط التحقق على بريدك الإلكتروني المسجل.',
  },
  {
    keywords: ['اشتراك', 'باقة', 'تجديد', 'انتهى', 'فوترة', 'فاتورة', 'سعر', 'تكلفة', 'رسوم'],
    answer: 'يمكنك إدارة اشتراكك من قسم "الاشتراك والفوترة". تتوفر باقتان: الأساسية والمتقدمة، مع إمكانية الدفع شهرياً أو فصلياً أو سنوياً.',
  },
  {
    keywords: ['رسالة', 'واتساب', 'whatsapp', 'sms', 'إرسال', 'مجموعة', 'جماعية', 'رصيد'],
    answer: 'يمكنك إرسال رسائل جماعية عبر قسم "الرسائل" في القائمة الجانبية. يدعم النظام رسائل واتساب وSMS. كل باقة تمنحك رصيداً شهرياً مجانياً.',
  },
  {
    keywords: ['معلم', 'استاذ', 'أستاذ', 'مدرس', 'موظف', 'إضافة معلم', 'بيانات المعلم'],
    answer: 'تتم إدارة المعلمين والموظفين من قسم "الإعدادات ← المعلمون والموظفون". يمكنك إضافتهم يدوياً أو استيراد بياناتهم من ملف Excel.',
  },
  {
    keywords: ['جدول', 'حصص', 'توزيع حصص', 'إسناد', 'مواد', 'جدول الحصص'],
    answer: 'في قسم "الجدول المدرسي" ستجد أدوات إسناد المواد وتوزيع الحصص والانتظار. يدعم النظام التوزيع الذكي التلقائي والتوزيع اليدوي مع تجنب التعارضات.',
  },
  {
    keywords: ['إشراف', 'فسحة', 'ساحة', 'إشراف يومي'],
    answer: 'يُدار الإشراف اليومي من قسم "الجدول المدرسي ← الإشراف اليومي". يمكن توزيع المعلمين على مواقع الإشراف تلقائياً أو يدوياً مع دعم الطباعة.',
  },
  {
    keywords: ['مناوبة', 'حضور', 'غياب', 'توقيع', 'دوام', 'جدول المناوبة'],
    answer: 'تُدار المناوبة من قسم "المناوبة اليومية". يمكن بناء جدول المناوبة وتسجيل تقارير الدوام اليومية وطباعة كشوف التوقيعات.',
  },
  {
    keywords: ['صلاحية', 'وكيل', 'مفوض', 'دور', 'مسؤول', 'صلاحيات'],
    answer: 'يمكنك إدارة صلاحيات المستخدمين من قسم "الصلاحيات". يتيح النظام تفويض الوصول بصلاحيات محدودة لمستخدمين آخرين كالوكيل أو رئيس القسم.',
  },
  {
    keywords: ['صف', 'فصل', 'شعبة', 'طلاب', 'طالب', 'مرحلة', 'فصول'],
    answer: 'تُدار الفصول والصفوف من "الإعدادات ← الفصول والمراحل". يمكنك إضافة صفوف وشُعَب وتحديد أعداد الطلاب.',
  },
  {
    keywords: ['مادة', 'تخصص', 'منهج', 'curriculum', 'مواد دراسية'],
    answer: 'تُدار المواد الدراسية من "الإعدادات ← المواد الدراسية". يتيح النظام ربط كل مادة بالمعلمين المؤهلين لها تلقائياً.',
  },
  {
    keywords: ['تقرير', 'إحصاء', 'إحصائية', 'ملخص', 'إحصاءات'],
    answer: 'تتوفر تقارير شاملة في لوحة التحكم الرئيسية وأقسام المناوبة والتوزيع. يمكن تصديرها وطباعتها مباشرةً.',
  },
  {
    keywords: ['طباعة', 'تصدير', 'pdf', 'excel', 'استخراج'],
    answer: 'يدعم النظام طباعة وتصدير معظم الجداول والتقارير. ابحث عن أيقونة الطباعة أو زر "تصدير" في الصفحة المطلوبة.',
  },
  {
    keywords: ['إشعار', 'تنبيه', 'notification', 'bell', 'جرس'],
    answer: 'تظهر الإشعارات في أيقونة الجرس أعلى الصفحة. تتضمن تحديثات التذاكر والرسائل الواردة.',
  },
  {
    keywords: ['دعم', 'مساعدة', 'وقت', 'ساعات العمل', 'أوقات', 'متى'],
    answer: 'فريق الدعم متاح الأحد–الخميس من 8:00 ص حتى 2:30 م. يمكنك رفع تذكرة في أي وقت وسيتم الرد خلال أوقات العمل الرسمية.',
  },
  {
    keywords: ['تذكرة', 'شكوى', 'بلاغ', 'رفع تذكرة'],
    answer: 'لرفع تذكرة دعم، انقر على زر "رفع تذكرة جديدة" في هذه الصفحة أو استخدم الزر أدناه. سيتم الرد خلال أوقات العمل الرسمية.',
  },
  {
    keywords: ['مدرسة', 'بيانات المدرسة', 'اسم المدرسة', 'شعار', 'منطقة'],
    answer: 'يمكنك تعديل بيانات المدرسة (الاسم، الشعار، المنطقة...) من "الإعدادات ← الإعدادات الأساسية".',
  },
  {
    keywords: ['خطأ', 'error', 'مشكلة تقنية', 'لا يعمل', 'لا يفتح', 'توقف'],
    answer: 'إذا واجهت خطأً تقنياً:\n1. أعد تحميل الصفحة (F5)\n2. جرّب مسح ذاكرة التخزين المؤقت للمتصفح\n3. إذا استمرت المشكلة، ارفع تذكرة مع وصف تفصيلي وصورة للخطأ.',
  },
  {
    keywords: ['حساب', 'بريد', 'إيميل', 'email', 'بريد إلكتروني'],
    answer: 'يمكن تحديث بيانات حسابك وبريدك الإلكتروني من إعدادات الحساب الشخصي في القائمة العلوية.',
  },
  {
    keywords: ['انتظار', 'حصة انتظار', 'احتياطي', 'حصة احتياطية'],
    answer: 'يُدار توزيع حصص الانتظار من "الجدول المدرسي ← الحصص والانتظار". يتيح النظام توزيعاً عادلاً وتلقائياً لحصص الانتظار بين المعلمين.',
  },
  {
    keywords: ['تقويم', 'إجازة', 'عطلة', 'أحداث', 'مناسبة'],
    answer: 'يمكن الاطلاع على التقويم المدرسي والأحداث القادمة من لوحة التحكم الرئيسية في قسم التقويم.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LS_KEY = 'motabe_chatbot_v1';

const fmt = (): string =>
  new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

const makeWelcome = (): ChatMessage => ({
  id: 'welcome',
  role: 'bot',
  text: 'مرحباً بك في المساعد الذكي لمنصة متابع 👋\nأنا هنا لمساعدتك في أي سؤال عن المنصة، سواء كان عن الجدول المدرسي، المعلمين، الاشتراك، الرسائل، أو أي ميزة أخرى.\nاكتب سؤالك وسأجيبك فوراً!',
  time: fmt(),
  rating: null,
  showRating: false,
});

// ─── Component ────────────────────────────────────────────────────────────────
interface ChatbotWidgetProps {
  onOpenTicket: () => void;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ onOpenTicket }) => {
  // ── State ──────────────────────────────────────────────────────────────────
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

  const [isOpen, setIsOpen]           = useState(false);
  const [input, setInput]             = useState('');
  const [isTyping, setIsTyping]       = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Persist to localStorage ───────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  const scrollToBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);

  // Reset unread when chat opens
  useEffect(() => {
    if (isOpen) { setUnreadCount(0); scrollToBottom(); }
  }, [isOpen]);

  // ── Logic ─────────────────────────────────────────────────────────────────
  const findAnswer = (q: string): string | null => {
    const lower = q.toLowerCase();
    for (const item of KB_ANSWERS) {
      if (item.keywords.some(kw => lower.includes(kw))) return item.answer;
    }
    return null;
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

    await new Promise(r => setTimeout(r, 700 + Math.random() * 600));

    const answer = findAnswer(trimmed);
    const botMsg: ChatMessage = {
      id: `b-${Date.now()}`, role: 'bot',
      text: answer ?? 'عذراً، لم أجد إجابة دقيقة لسؤالك. هل تريد التحدث مع فريق الدعم الفني؟',
      showSupportBtn: !answer,
      time: fmt(), rating: null, showRating: true,
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating Toggle Button ──────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-label="المساعد الذكي"
        className={`fixed bottom-8 left-8 z-[9998] w-[72px] py-2.5 px-2 rounded-2xl shadow-2xl flex flex-col items-center gap-1.5 transition-all duration-300
          ${isOpen
            ? 'bg-slate-700'
            : 'bg-[#655ac1] hover:bg-[#52499d] hover:shadow-lg hover:shadow-[#655ac1]/40 hover:-translate-y-0.5'
          }`}
      >
        {/* Top row: icon + online dot */}
        <div className="flex items-center gap-1.5">
          {isOpen
            ? <X size={22} className="text-white" />
            : <Bot size={22} className="text-white" />
          }
          {!isOpen && (
            <span className="w-2.5 h-2.5 bg-green-400 rounded-full border border-white/40 animate-pulse" />
          )}
        </div>

        {/* Bottom label */}
        <span className="text-white font-black text-[9px] whitespace-nowrap leading-none">
          {isOpen ? 'إغلاق' : 'المساعد الذكي'}
        </span>

        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] bg-red-500 text-white text-xs font-black rounded-full border-2 border-white flex items-center justify-center px-1 shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      {/* ── Chat Window ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed bottom-24 left-8 z-[9997] w-[26rem] sm:w-[32rem] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{
            height: '530px',
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
              <p className="text-white font-black text-sm">المساعد الذكي</p>
              <p className="text-white/70 text-xs font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                متصل دائماً
              </p>
            </div>
            {/* Clear chat */}
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

          {/* Messages area */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fcfbff]"
            style={{ overscrollBehavior: 'contain' }}
          >
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[85%] flex flex-col gap-1">

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed shadow-sm
                      ${msg.role === 'user'
                        ? 'bg-[#655ac1] text-white rounded-br-none'
                        : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                      }`}
                  >
                    <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
                    {msg.showSupportBtn && (
                      <button
                        onClick={() => { setIsOpen(false); onOpenTicket(); }}
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-[#655ac1] text-white text-xs font-bold py-2 px-3 rounded-xl hover:bg-[#52499d] transition-colors"
                      >
                        <Headphones size={14} />
                        التحدث مع فريق الدعم
                      </button>
                    )}
                  </div>

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

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 bg-white">

            {/* Input */}
            <div className="p-3 flex gap-2 items-end">
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
        </div>
      )}

      {/* Slide-up animation keyframes */}
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
