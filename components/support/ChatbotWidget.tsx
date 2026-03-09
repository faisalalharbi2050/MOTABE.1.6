import React, { useState, useRef } from 'react';
import {
  MessageCircle, X, Bot, Send, ChevronDown, Headphones,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  text: string;
  showSupportBtn?: boolean;
}

const KB_ANSWERS: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['تسجيل', 'دخول', 'login', 'كلمة مرور'],
    answer: 'يمكنك إعادة تعيين كلمة المرور من خلال صفحة تسجيل الدخول > "نسيت كلمة المرور". ستصلك رابط التحقق على بريدك الإلكتروني المسجل.',
  },
  {
    keywords: ['اشتراك', 'باقة', 'تجديد', 'فوترة', 'فاتورة'],
    answer: 'يمكنك إدارة اشتراكك من قسم "الاشتراك والفوترة" في القائمة الجانبية. تتوفر باقتان: الأساسية والمتقدمة، مع إمكانية الدفع شهرياً أو فصلياً أو سنوياً.',
  },
  {
    keywords: ['رسالة', 'واتساب', 'sms', 'إرسال'],
    answer: 'يمكنك إرسال رسائل جماعية عبر نظام الرسائل في القائمة الجانبية. يدعم المنصة إرسال رسائل واتساب وSMS. كل باقة تمنحك رصيداً مجانياً شهرياً.',
  },
  {
    keywords: ['معلم', 'استاذ', 'إضافة', 'حذف', 'تعديل'],
    answer: 'تتم إدارة المعلمين من قسم "الإعدادات العامة > المعلمون". يمكنك إضافة معلمين جدد وتحديد تخصصاتهم ومعلوماتهم.',
  },
  {
    keywords: ['جدول', 'إشراف', 'مناوبة', 'انتظار'],
    answer: 'في قسم "الجدول المدرسي" ستجد إدارة: إسناد المواد، الحصص والانتظار، الإشراف اليومي، والمناوبة اليومية. يدعم النظام التوزيع التلقائي والتوزيع اليدوي.',
  },
  {
    keywords: ['صلاحية', 'وكيل', 'مفوض', 'دور'],
    answer: 'يمكنك إدارة صلاحيات المستخدمين من قسم "الصلاحيات" في القائمة الجانبية. يتيح النظام تفويض الوصول بصلاحيات محدودة لمستخدمين آخرين.',
  },
];

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'bot',
    text: 'مرحباً بك في المساعد الذكي لمنصة متابع 👋\nكيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن أي ميزة في المنصة.',
  },
];

interface ChatbotWidgetProps {
  onOpenTicket: () => void;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ onOpenTicket }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const findAnswer = (query: string): { answer: string; found: boolean } => {
    const lowerQuery = query.toLowerCase();
    for (const item of KB_ANSWERS) {
      if (item.keywords.some(kw => lowerQuery.includes(kw))) {
        return { answer: item.answer, found: true };
      }
    }
    return { answer: '', found: false };
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    scrollToBottom();

    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));

    const { answer, found } = findAnswer(text);
    const botMsg: ChatMessage = {
      id: `b-${Date.now()}`,
      role: 'bot',
      text: found
        ? answer
        : 'عذراً، لم أتمكن من العثور على إجابة لسؤالك في قاعدة المعرفة. هل تريد التواصل مع فريق الدعم الفني؟',
      showSupportBtn: !found,
    };
    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
    scrollToBottom();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`fixed bottom-8 left-8 z-[9998] w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 group
          ${isOpen ? 'bg-slate-700 rotate-0' : 'bg-[#655ac1] hover:scale-110 hover:shadow-[#655ac1]/40'}`}
        title="المساعد الذكي"
      >
        {isOpen ? <ChevronDown size={26} className="text-white" /> : <Bot size={26} className="text-white" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-28 left-8 z-[9997] w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in"
          style={{ height: '480px', direction: 'rtl' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-l from-[#655ac1] to-[#8779fb] p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <Bot size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-black text-sm">المساعد الذكي</p>
              <p className="text-white/70 text-xs font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                متصل الآن
              </p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#fcfbff]">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed shadow-sm
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
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-end">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 bg-white">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="اكتب سؤالك هنا..."
                rows={1}
                className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1]/30 transition-all"
                style={{ minHeight: '40px', maxHeight: '100px' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="w-10 h-10 bg-[#655ac1] text-white rounded-xl flex items-center justify-center hover:bg-[#52499d] disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
