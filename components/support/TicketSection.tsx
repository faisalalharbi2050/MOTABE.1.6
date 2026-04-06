import React, { useState, useRef, useEffect } from 'react';
import {
  TicketIcon, Clock, CheckCircle2, XCircle,
  ChevronDown, Upload, X, FileText, Image as ImageIcon,
  Send, PlusCircle, Info, Paperclip,
  MessageCircle, User, Headphones,
} from 'lucide-react';
import { useToast } from '../ui/ToastProvider';

// ─── Types ────────────────────────────────────────────────────────────────────
type TicketCategory = 'technical' | 'payment' | 'billing' | 'suggestion' | 'other' | 'delete_account';
type TicketStatus   = 'processing' | 'replied' | 'closed';

interface Attachment {
  name: string;
  type: 'image' | 'pdf' | 'doc';
  size: string;
}

interface TicketReply {
  from: 'user' | 'support';
  text: string;
  date: string;
  time: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  categoryLabel: string;
  status: TicketStatus;
  date: string;
  time: string;
  attachments: Attachment[];
  replies: TicketReply[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'technical',      label: 'مشكلة تقنية'      },
  { value: 'payment',        label: 'مشكلة في الدفع'   },
  { value: 'billing',        label: 'مشكلة في الفوترة' },
  { value: 'suggestion',     label: 'اقتراح'            },
  { value: 'other',          label: 'أخرى'              },
  { value: 'delete_account', label: 'حذف الحساب'        },
];

const ACCEPTED_IMAGES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ACCEPTED_DOCS   = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MOCK_TICKETS: Ticket[] = [
  {
    id: 'TKT-001',
    title: 'مشكلة في تسجيل الدخول',
    description: 'لا أستطيع تسجيل الدخول إلى حسابي منذ الأمس. تظهر رسالة خطأ "بيانات غير صحيحة" رغم أن كلمة المرور صحيحة. جربت إعادة تعيين كلمة المرور لكن الرابط لا يصل إلى البريد.',
    category: 'technical',
    categoryLabel: 'مشكلة تقنية',
    status: 'replied',
    date: '2026-03-09',
    time: '08:15 ص',
    attachments: [{ name: 'screenshot.png', type: 'image', size: '512 KB' }],
    replies: [
      {
        from: 'support',
        text: 'مرحباً، شكراً لتواصلك معنا. تم مراجعة حسابك ووجدنا أن البريد الإلكتروني المسجل لديك يحتوي على حرف مختلف. هل يمكنك التحقق من البريد الذي استخدمته عند التسجيل؟',
        date: '2026-03-09',
        time: '10:30 ص',
      },
      {
        from: 'user',
        text: 'نعم وجدت المشكلة، كنت أستخدم بريداً مختلفاً. شكراً جزيلاً!',
        date: '2026-03-09',
        time: '11:05 ص',
      },
      {
        from: 'support',
        text: 'ممتاز! يسعدنا أن المشكلة حُلّت. إذا احتجت أي مساعدة أخرى نحن في الخدمة دائماً.',
        date: '2026-03-09',
        time: '11:20 ص',
      },
    ],
  },
  {
    id: 'TKT-002',
    title: 'استفسار عن الفاتورة الأخيرة',
    description: 'لاحظت أن مبلغ الفاتورة الأخيرة يختلف عن الباقة المشترك بها. الباقة الأساسية 149 ريال لكن الفاتورة تظهر 189 ريال. أرجو المراجعة والتوضيح.',
    category: 'billing',
    categoryLabel: 'مشكلة في الفوترة',
    status: 'processing',
    date: '2026-03-08',
    time: '11:30 ص',
    attachments: [],
    replies: [],
  },
  {
    id: 'TKT-003',
    title: 'مقترح: إضافة تقرير أسبوعي للمناوبة',
    description: 'أقترح إضافة ميزة تقرير أسبوعي موحّد يجمع جدول المناوبة والإشراف في ملف PDF واحد جاهز للطباعة. هذا سيوفر وقتاً كبيراً كل أسبوع.',
    category: 'suggestion',
    categoryLabel: 'اقتراح',
    status: 'closed',
    date: '2026-03-05',
    time: '09:45 ص',
    attachments: [],
    replies: [
      {
        from: 'support',
        text: 'شكراً على اقتراحك القيّم! تم تسجيل الاقتراح وإحالته لفريق التطوير. سنضعه في اعتبارنا في التحديثات القادمة.',
        date: '2026-03-06',
        time: '09:00 ص',
      },
    ],
  },
];

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: React.ElementType; bar: number }> = {
  processing: { label: 'قيد المعالجة', color: 'text-yellow-700 bg-yellow-100 border-yellow-200', icon: Clock,        bar: 40  },
  replied:    { label: 'تم الرد',      color: 'text-green-700 bg-green-100 border-green-200',   icon: CheckCircle2, bar: 80  },
  closed:     { label: 'مغلقة',        color: 'text-slate-600 bg-slate-100 border-slate-200',   icon: XCircle,      bar: 100 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getFileType = (mime: string): Attachment['type'] => {
  if (ACCEPTED_IMAGES.includes(mime)) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  return 'doc';
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** توقيت الرياض الحالي */
const getRiyadhTime = () => {
  const str = new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' });
  return new Date(str);
};

// ─── WorkingHoursCard ─────────────────────────────────────────────────────────
const WorkingHoursCard: React.FC = () => {
  const now         = getRiyadhTime();
  const day         = now.getDay();           // 0=Sun … 4=Thu
  const totalMin    = now.getHours() * 60 + now.getMinutes();
  const isWorkday   = day >= 0 && day <= 4;
  const isWorkTime  = totalMin >= 8 * 60 && totalMin < 14 * 60 + 30;
  const isAvailable = isWorkday && isWorkTime;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0">
        <Clock size={32} className={isAvailable ? 'text-green-500' : 'text-yellow-500'} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-slate-800 text-base mb-1">أوقات العمل الرسمية</h4>
        <p className="text-sm font-bold text-slate-700">
          الأحد – الخميس &nbsp;|&nbsp; 8:00 ص — 2:30 م
        </p>
        <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
          حيّاك في متابع، يُرجى رفع تذكرتك وسنتواصل معك خلال أوقات العمل. يمكن استخدام المساعد في أي وقت.
        </p>
      </div>
      <div className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs whitespace-nowrap
        ${isAvailable
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-yellow-50 border-yellow-200 text-yellow-700'
        }`}>
        <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
        {isAvailable ? 'متاح الآن' : 'خارج الدوام'}
      </div>
    </div>
  );
};

// ─── StatusBar ────────────────────────────────────────────────────────────────
const StatusBar: React.FC<{ status: TicketStatus }> = ({ status }) => {
  const steps: TicketStatus[] = ['processing', 'replied', 'closed'];
  const stepIdx = steps.indexOf(status);
  const labels  = ['قيد المعالجة', 'تم الرد', 'مغلقة'];
  return (
    <div className="flex items-center gap-1 mt-1">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center gap-0.5">
            <div className={`w-3 h-3 rounded-full border-2 transition-all
              ${i <= stepIdx ? 'bg-[#655ac1] border-[#655ac1]' : 'bg-white border-slate-300'}`} />
            <span className={`text-[9px] font-bold whitespace-nowrap ${i <= stepIdx ? 'text-[#655ac1]' : 'text-slate-400'}`}>
              {labels[i]}
            </span>
          </div>
          {i < 2 && (
            <div className={`flex-1 h-0.5 rounded-full mb-3 transition-all ${i < stepIdx ? 'bg-[#655ac1]' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── TicketDetailModal ────────────────────────────────────────────────────────
interface TicketDetailModalProps {
  ticket: Ticket;
  onClose: () => void;
  onSendReply: (ticketId: string, text: string) => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, onClose, onSendReply }) => {
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sc         = STATUS_CONFIG[ticket.status];
  const StatusIcon = sc.icon;
  const isClosed   = ticket.status === 'closed';

  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [ticket.replies]);

  const handleSend = () => {
    if (!replyText.trim() || isClosed) return;
    onSendReply(ticket.id, replyText.trim());
    setReplyText('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-6 py-4 bg-gradient-to-l from-[#f0eeff] to-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-[#655ac1] font-mono text-base">{ticket.id}</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${sc.color}`}>
              <StatusIcon size={12} />
              {sc.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Status Progress ── */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <StatusBar status={ticket.status} />
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Meta */}
          <div className="px-6 py-3 flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <TicketIcon size={12} className="text-slate-400" />
              {ticket.categoryLabel}
            </span>
            <span className="text-slate-300">|</span>
            <span>
              {new Date(ticket.date).toLocaleDateString('ar-SA', {
                weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
              })}
            </span>
            <span className="text-slate-300">|</span>
            <span>{ticket.time}</span>
          </div>

          {/* Description */}
          <div className="px-6 py-5 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">وصف المشكلة</p>
            <h3 className="font-black text-slate-800 text-base mb-2">{ticket.title}</h3>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              {ticket.description || 'لم يُضف وصف تفصيلي.'}
            </p>
          </div>

          {/* Attachments */}
          {ticket.attachments.length > 0 && (
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">المرفقات</p>
              <div className="flex flex-wrap gap-2">
                {ticket.attachments.map((att, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold
                      ${att.type === 'image'
                        ? 'bg-blue-50 border-blue-200 text-blue-600'
                        : att.type === 'pdf'
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      }`}
                  >
                    {att.type === 'image' ? <ImageIcon size={13} /> : <FileText size={13} />}
                    {att.name}
                    <span className="text-slate-400 font-medium">({att.size})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation */}
          <div className="px-6 py-5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MessageCircle size={12} />
              المحادثة
              {ticket.replies.length > 0 && (
                <span className="bg-[#655ac1] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {ticket.replies.length}
                </span>
              )}
            </p>

            {ticket.replies.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <MessageCircle size={36} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-bold text-slate-500">لا توجد ردود بعد</p>
                <p className="text-xs mt-1 font-medium">سيتواصل معك فريق الدعم خلال أوقات العمل الرسمية</p>
              </div>
            ) : (
              <div className="space-y-4" dir="rtl">
                {ticket.replies.map((reply, i) => (
                  <div
                    key={i}
                    className={`flex items-end gap-2.5 ${reply.from === 'user' ? 'justify-start' : 'justify-end'}`}
                  >
                    {/* Support avatar — shown on the outer left */}
                    {reply.from === 'support' && (
                      <div className="w-8 h-8 rounded-xl bg-[#f0eeff] flex items-center justify-center shrink-0">
                        <Headphones size={15} className="text-[#655ac1]" />
                      </div>
                    )}

                    <div className={`max-w-[72%] flex flex-col gap-1 ${reply.from === 'user' ? 'items-start' : 'items-end'}`}>
                      <span className="text-[10px] font-bold text-slate-400 px-1">
                        {reply.from === 'support' ? 'فريق الدعم' : 'أنت'}
                      </span>
                      <div
                        className={`px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed
                          ${reply.from === 'support'
                            ? 'bg-white border border-slate-200 text-slate-700 shadow-sm rounded-tl-none'
                            : 'bg-[#655ac1] text-white rounded-tr-none'
                          }`}
                      >
                        {reply.text}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium px-1">{reply.time}</span>
                    </div>

                    {/* User avatar */}
                    {reply.from === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <User size={15} className="text-slate-500" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* ── Reply footer ── */}
        {!isClosed ? (
          <div className="shrink-0 border-t border-slate-100 p-4 bg-white">
            <div className="flex gap-3 items-end">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="اكتب ردك هنا..."
                rows={2}
                className="flex-1 resize-none border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#8779fb] focus:ring-1 focus:ring-[#8779fb]/30 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!replyText.trim()}
                className="w-11 h-11 bg-[#655ac1] text-white rounded-xl flex items-center justify-center hover:bg-[#52499d] disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 hover:-translate-y-0.5"
                aria-label="إرسال الرد"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="shrink-0 border-t border-slate-100 p-3 bg-slate-50/80 text-center">
            <p className="text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5">
              <XCircle size={13} />
              هذه التذكرة مغلقة — لا يمكن إضافة ردود جديدة
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main: TicketSection ──────────────────────────────────────────────────────
interface TicketSectionProps {
  openFormOnMount?: boolean;
}

const TicketSection: React.FC<TicketSectionProps> = ({ openFormOnMount = false }) => {
  const { showToast } = useToast();
  const fileInputRef  = useRef<HTMLInputElement>(null);

  // Form state
  const [showForm,      setShowForm]      = useState(openFormOnMount);
  const [formTitle,     setFormTitle]     = useState('');
  const [formDesc,      setFormDesc]      = useState('');
  const [formCategory,  setFormCategory]  = useState<TicketCategory | ''>('');
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const [isDragging,    setIsDragging]    = useState(false);

  // Ticket list
  const [tickets,        setTickets]        = useState<Ticket[]>(MOCK_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);


  // ── File handling ──────────────────────────────────────────────────────────
  const processFiles = (files: FileList | null) => {
    if (!files) return;
    const allowed = [...ACCEPTED_IMAGES, ...ACCEPTED_DOCS];
    Array.from(files).forEach(file => {
      if (!allowed.includes(file.type)) {
        showToast(`نوع الملف "${file.name}" غير مدعوم`, 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('حجم الملف يتجاوز الحد الأقصى (10 MB)', 'error');
        return;
      }
      setAttachedFiles(prev => [
        ...prev,
        { name: file.name, type: getFileType(file.type), size: formatSize(file.size) },
      ]);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim())   { showToast('يرجى إدخال عنوان المشكلة', 'error');    return; }
    if (!formCategory)       { showToast('يرجى تحديد تصنيف المشكلة', 'error');   return; }
    if (!formDesc.trim())    { showToast('يرجى كتابة وصف تفصيلي', 'error');      return; }

    const now = getRiyadhTime();
    const cat = CATEGORIES.find(c => c.value === formCategory)!;
    const newTicket: Ticket = {
      id:            `TKT-${String(tickets.length + 1).padStart(3, '0')}`,
      title:         formTitle.trim(),
      description:   formDesc.trim(),
      category:      formCategory as TicketCategory,
      categoryLabel: cat.label,
      status:        'processing',
      date:          now.toISOString().split('T')[0],
      time:          now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      attachments:   attachedFiles,
      replies:       [],
    };

    setTickets(prev => [newTicket, ...prev]);
    setFormTitle(''); setFormDesc(''); setFormCategory(''); setAttachedFiles([]);
    setShowForm(false);

    const msg = `تم رفع التذكرة ${newTicket.id} بنجاح. سيتم التواصل معك خلال أوقات العمل.`;
    showToast(msg, 'success');
  };

  // ── Reply ──────────────────────────────────────────────────────────────────
  const handleSendReply = (ticketId: string, text: string) => {
    const now = getRiyadhTime();
    const newReply: TicketReply = {
      from: 'user',
      text,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    const updateTicket = (t: Ticket): Ticket =>
      t.id === ticketId
        ? { ...t, replies: [...t.replies, newReply], status: 'processing' }
        : t;

    setTickets(prev => prev.map(updateTicket));
    setSelectedTicket(prev => (prev && prev.id === ticketId ? updateTicket(prev) : prev));
    showToast('تم إرسال ردك بنجاح. سيتواصل معك فريق الدعم قريباً.', 'success');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Working Hours */}
      <WorkingHoursCard />

      {/* New Ticket Button */}
      <div className="flex justify-start">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-3 bg-[#8779fb] text-white rounded-xl font-black hover:bg-[#655ac1] hover:-translate-y-0.5 transition-all shadow-md shadow-indigo-200"
        >
          <PlusCircle size={18} />
          رفع تذكرة جديدة
        </button>
      </div>

      {/* ── Ticket Creation Modal ── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-l from-[#f0eeff] to-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-base">
                <TicketIcon size={18} className="text-[#8779fb]" />
                رفع تذكرة دعم جديدة
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  عنوان المشكلة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="أدخل عنواناً موجزاً يصف مشكلتك..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#8779fb] focus:ring-1 focus:ring-[#8779fb]/30 transition-all"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  تصنيف المشكلة <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as TicketCategory)}
                    className="w-full appearance-none px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-[#8779fb] focus:ring-1 focus:ring-[#8779fb]/30 bg-white transition-all pr-10"
                  >
                    <option value="">-- اختر التصنيف --</option>
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  وصف تفصيلي <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  rows={4}
                  placeholder="اشرح مشكلتك بالتفصيل: متى بدأت؟ ما الخطوات التي أدت إليها؟ ما الرسالة التي ظهرت؟"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#8779fb] focus:ring-1 focus:ring-[#8779fb]/30 resize-none transition-all"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  المرفقات (اختياري)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all
                    ${isDragging
                      ? 'border-[#8779fb] bg-[#f0eeff]'
                      : 'border-slate-200 hover:border-[#8779fb]/50 hover:bg-slate-50'
                    }`}
                >
                  <Upload size={24} className={`mx-auto mb-2 ${isDragging ? 'text-[#8779fb]' : 'text-slate-400'}`} />
                  <p className="font-bold text-sm text-slate-700">اسحب الملف هنا أو انقر للتصفح</p>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    الصور: PNG, JPG, GIF &nbsp;|&nbsp; الملفات: PDF, DOCX &nbsp;|&nbsp; الحجم الأقصى: 10 MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={e => processFiles(e.target.files)}
                />

                {attachedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachedFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                          ${f.type === 'image' ? 'bg-blue-100 text-blue-600' : f.type === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                          {f.type === 'image' ? <ImageIcon size={16} /> : <FileText size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">{f.name}</p>
                          <p className="text-xs text-slate-400 font-medium">{f.size}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#8779fb] text-white rounded-xl font-black hover:bg-[#655ac1] transition-all shadow-sm shadow-indigo-200 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                >
                  <Send size={16} />
                  إرسال التذكرة
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Ticket List ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 flex items-center gap-2 text-base">
            <TicketIcon size={18} className="text-[#655ac1]" />
            سجل التذاكر
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">إجمالي التذاكر</span>
            <div className="flex items-center gap-1.5 bg-[#655ac1] text-white px-3 py-1.5 rounded-xl shadow-sm shadow-indigo-200">
              <TicketIcon size={13} />
              <span className="font-black text-sm">{tickets.length}</span>
            </div>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <TicketIcon size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="font-bold">لا توجد تذاكر بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-right px-5 py-3 font-black text-slate-500 text-xs uppercase tracking-wide">رقم التذكرة</th>
                  <th className="text-right px-5 py-3 font-black text-slate-500 text-xs uppercase tracking-wide">الموضوع</th>
                  <th className="text-right px-5 py-3 font-black text-slate-500 text-xs uppercase tracking-wide">التصنيف</th>
                  <th className="text-right px-5 py-3 font-black text-slate-500 text-xs uppercase tracking-wide">الحالة</th>
                  <th className="text-right px-5 py-3 font-black text-slate-500 text-xs uppercase tracking-wide">التاريخ</th>
                  <th className="text-right px-5 py-3 font-black text-slate-500 text-xs uppercase tracking-wide">الوقت</th>
                  <th className="text-right px-5 py-3 font-black text-slate-500 text-xs uppercase tracking-wide">المرفقات</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map(ticket => {
                  const sc         = STATUS_CONFIG[ticket.status];
                  const StatusIcon = sc.icon;
                  const dateObj    = new Date(ticket.date);
                  const dayName    = dateObj.toLocaleDateString('ar-SA', { weekday: 'long' });
                  const dateFmt    = dateObj.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
                  const hasReplies = ticket.replies.some(r => r.from === 'support');

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      {/* ID + new-reply dot */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[#655ac1] text-sm font-mono">{ticket.id}</span>
                          {hasReplies && ticket.status === 'replied' && (
                            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="يوجد رد جديد" />
                          )}
                        </div>
                      </td>
                      {/* Title */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800 text-sm max-w-[200px] truncate" title={ticket.title}>
                          {ticket.title}
                        </p>
                      </td>
                      {/* Category */}
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-slate-600">{ticket.categoryLabel}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-sm font-black
                          ${ticket.status === 'processing' ? 'text-yellow-600' :
                            ticket.status === 'replied'    ? 'text-green-600'  :
                                                             'text-slate-400'}`}>
                          <StatusIcon size={14} />
                          {sc.label}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="px-5 py-4">
                        <p className="text-xs font-black text-slate-700">{dayName}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{dateFmt}</p>
                      </td>
                      {/* Time */}
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-slate-700">{ticket.time}</span>
                      </td>
                      {/* Attachments */}
                      <td className="px-5 py-4">
                        {ticket.attachments.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            {ticket.attachments.map((att, ai) => (
                              <div
                                key={ai}
                                title={att.name}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center
                                  ${att.type === 'image' ? 'bg-blue-50 text-blue-500' : att.type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}
                              >
                                <Paperclip size={14} />
                              </div>
                            ))}
                            <span className="text-xs font-bold text-slate-500 mr-1">({ticket.attachments.length})</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      {/* Arrow hint */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-[#655ac1] group-hover:text-white text-slate-400 transition-all">
                          <MessageCircle size={13} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Ticket Detail Modal ── */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onSendReply={handleSendReply}
        />
      )}
    </div>
  );
};

export default TicketSection;
