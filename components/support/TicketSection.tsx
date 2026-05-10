import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  TicketIcon, Clock, CheckCircle2, XCircle,
  ChevronDown, Upload, X, FileText, Image as ImageIcon,
  Send, PlusCircle, Paperclip, Check, Eye,
  User, Headphones, Headset, Calendar, Sun,
} from 'lucide-react';
import { useToast } from '../ui/ToastProvider';

// ─── Types ────────────────────────────────────────────────────────────────────
type TicketCategory = 'technical' | 'payment' | 'billing' | 'suggestion' | 'other';
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
  phoneNumber: string;
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
    phoneNumber: '0501234567',
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
        text: 'نعم وجدت المشكلɡ كنت أستخدم بريداً مختلفاً. شكراً جزيلاً!',
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
    phoneNumber: '0559876543',
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
    phoneNumber: '0531122334',
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
const normalizePhoneDigits = (value: string): string =>
  value
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\s+/g, '');

const isValidSaudiMobile = (value: string): boolean => {
  const normalized = normalizePhoneDigits(value);
  return /^(05\d{8}|9665\d{8}|\+9665\d{8})$/.test(normalized);
};

const formatSaudiMobileForDisplay = (value: string): string => {
  const normalized = normalizePhoneDigits(value);
  if (normalized.startsWith('+966')) return `0${normalized.slice(4)}`;
  if (normalized.startsWith('966')) return `0${normalized.slice(3)}`;
  return normalized;
};

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
      <div className="w-14 h-14 flex items-center justify-center shrink-0">
        <Clock size={32} className="text-[#655ac1]" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-slate-800 text-base mb-1">أوقات العمل الرسمية</h4>
        <p className="text-sm font-bold text-slate-700">
          الأحد – الخميس &nbsp;|&nbsp; 8:00 ص — 2:30 م
        </p>
        <p className="text-xs text-[#8779fb] font-medium mt-1.5 leading-relaxed">
          يهمنا مساعدتߡ يُرجى رفع تذكرتك وسنرد عليك في أقرب وقت.
        </p>
      </div>
      <div className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs whitespace-nowrap
        ${isAvailable
          ? 'bg-white border-slate-200 text-slate-600'
          : 'bg-yellow-50 border-yellow-200 text-yellow-700'
        }`}>
        <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-[#655ac1] animate-pulse' : 'bg-yellow-500'}`} />
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
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, onClose }) => {
  const sc             = STATUS_CONFIG[ticket.status];
  const StatusIcon     = sc.icon;
  const supportReplies = ticket.replies.filter(r => r.from === 'support');

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
        {/* ── Header — نفس هوية نافذة رفع التذكرة تماماً ── */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="font-black text-slate-800 flex items-center gap-2 text-base">
            <TicketIcon size={22} className="text-[#655ac1]" />
            {ticket.title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${sc.color}`}>
              <StatusIcon size={12} />
              {sc.label}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── شريط البيانات الوصفية ── */}
        <div className="px-6 py-2.5 border-b border-slate-100 bg-white flex flex-wrap items-center gap-0 text-xs font-medium text-slate-500 shrink-0" dir="rtl">
          <span className="flex items-center gap-1 px-3 first:pr-0 font-mono font-bold text-[#655ac1]">
            <TicketIcon size={11} className="text-slate-400" />
            {ticket.id}
          </span>
          <span className="w-px h-3 bg-slate-200 mx-1" />
          <span className="px-3">{ticket.categoryLabel}</span>
          <span className="w-px h-3 bg-slate-200 mx-1" />
          <span className="px-3">{new Date(ticket.date).toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          <span className="w-px h-3 bg-slate-200 mx-1" />
          <span className="px-3 text-slate-400">{new Date(ticket.date).toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          <span className="w-px h-3 bg-slate-200 mx-1" />
          <span className="px-3">{ticket.time}</span>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-4 space-y-3" dir="rtl">

          {/* شريط التقدم */}
          <div className="bg-white rounded-xl px-5 py-3 border border-slate-200">
            <StatusBar status={ticket.status} />
          </div>

          {/* ── تفاصيل الطلب ── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={13} className="text-slate-400" />
                <span className="text-xs font-black text-slate-600">تفاصيل الطلب</span>
              </div>
              <span className="text-[10px] font-medium text-slate-400">
                {ticket.time} — {new Date(ticket.date).toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="px-5 py-4">
              <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">
                <span>رقم الجوال:</span>
                <span dir="ltr" className="font-mono text-slate-700">{formatSaudiMobileForDisplay(ticket.phoneNumber)}</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{ticket.description}</p>
            </div>
            {ticket.attachments.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">المرفقات</p>
                <div className="space-y-1.5">
                  {ticket.attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        att.type === 'image' ? 'bg-blue-100 text-blue-600'
                        : att.type === 'pdf'  ? 'bg-red-100 text-red-600'
                        : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {att.type === 'image' ? <ImageIcon size={13} /> : <FileText size={13} />}
                      </div>
                      <span className="text-xs font-bold text-slate-700 flex-1 truncate">{att.name}</span>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">{att.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── رد فريق الدعم ── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headset size={13} className="text-[#655ac1]" />
                <span className="text-xs font-black text-slate-600">رد فريق الدعم</span>
              </div>
              {supportReplies.length > 0 && (
                <span className="text-[10px] font-medium text-slate-400">
                  {supportReplies[supportReplies.length - 1].time} — {new Date(supportReplies[supportReplies.length - 1].date).toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              )}
            </div>

            {supportReplies.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Headset size={36} className="text-[#655ac1] mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600">في انتظار رد فريق الدعم</p>
                <p className="text-xs font-medium text-slate-400 mt-1">سيتم الرد عليك في أقرب وقت ممكن</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {supportReplies.map((reply, idx) => (
                  <div key={idx} className="px-5 py-4">
                    {supportReplies.length > 1 && (
                      <p className="text-[10px] font-bold text-slate-400 mb-1.5">
                        {reply.time} — {new Date(reply.date).toLocaleDateString('ar-SA-u-ca-gregory', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                    <p className="text-sm text-slate-700 leading-relaxed">{reply.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── Main: TicketSection ──────────────────────────────────────────────────────
const TicketSection: React.FC = () => {
  const { showToast } = useToast();
  const fileInputRef        = useRef<HTMLInputElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Form state
  const [showForm,             setShowForm]             = useState(false);
  const [formTitle,            setFormTitle]            = useState('');
  const [formPhoneNumber,      setFormPhoneNumber]      = useState('');
  const [formDesc,             setFormDesc]             = useState('');
  const [formCategory,         setFormCategory]         = useState<TicketCategory | ''>('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [attachedFiles,        setAttachedFiles]        = useState<Attachment[]>([]);
  const [isDragging,           setIsDragging]           = useState(false);

  const handlePhoneNumberChange = (value: string) => {
    const normalized = normalizePhoneDigits(value).replace(/[^\d+]/g, '');
    setFormPhoneNumber(formatSaudiMobileForDisplay(normalized));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (!formPhoneNumber.trim()) { showToast('يرجى إدخال رقم الجوال', 'error'); return; }
    if (!isValidSaudiMobile(formPhoneNumber)) { showToast('يرجى إدخال رقم جوال سعودي صحيح', 'error'); return; }
    if (!formCategory)       { showToast('يرجى تحديد تصنيف المشكلة', 'error');   return; }
    if (!formDesc.trim())    { showToast('يرجى كتابة وصف تفصيلي', 'error');      return; }

    const now = getRiyadhTime();
    const cat = CATEGORIES.find(c => c.value === formCategory)!;
    const normalizedPhoneNumber = normalizePhoneDigits(formPhoneNumber);
    const newTicket: Ticket = {
      id:            `TKT-${String(tickets.length + 1).padStart(3, '0')}`,
      title:         formTitle.trim(),
      phoneNumber:   normalizedPhoneNumber,
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
    setFormTitle(''); setFormPhoneNumber(''); setFormDesc(''); setFormCategory(''); setAttachedFiles([]);
    setShowForm(false);

    const msg = `تم رفع التذكرة ${newTicket.id} بنجاح. سيتم التواصل معك خلال أوقات العمل.`;
    showToast(msg, 'success');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
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

      {/* New Ticket Button */}
      <div className="flex justify-start">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#655ac1] text-white rounded-xl font-black text-sm hover:bg-[#5548b0] hover:-translate-y-0.5 transition-all shadow-md shadow-indigo-200"
        >
          <PlusCircle size={16} />
          رفع تذكرة جديدة
        </button>
      </div>

      {/* ── Ticket Creation Modal ── */}
      {showForm && createPortal(
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[96vh] overflow-y-auto animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-base">
                <TicketIcon size={22} className="text-[#655ac1]" />
                رفع تذكرة دعم جديدة
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                <div className="flex items-start gap-2.5">
                  <Clock size={16} className="text-[#655ac1] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-[#655ac1]">أوقات العمل الرسمية</p>
                    <p className="text-xs font-medium text-[#655ac1] mt-0.5 leading-relaxed">
                      يتم الرد على التذاكر خلال أوقات العمل: الأحد إلى الخميس من 8:00 ص إلى 2:30 م.
                    </p>
                  </div>
                </div>
              </div>

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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#8779fb] focus:ring-1 focus:ring-[#8779fb]/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  رقم الجوال <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  value={formPhoneNumber}
                  onChange={e => handlePhoneNumberChange(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#8779fb] focus:ring-1 focus:ring-[#8779fb]/30 transition-all"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  تصنيف المشكلة <span className="text-red-500">*</span>
                </label>
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(p => !p)}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm font-medium text-right flex items-center justify-between bg-white transition-all ${
                      showCategoryDropdown ? 'border-[#655ac1] ring-1 ring-[#655ac1]/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className={formCategory ? 'text-slate-700' : 'text-slate-400'}>
                      {formCategory ? CATEGORIES.find(c => c.value === formCategory)?.label : '-- اختر التصنيف --'}
                    </span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showCategoryDropdown && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-lg overflow-hidden">
                      {CATEGORIES.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => { setFormCategory(c.value as TicketCategory); setShowCategoryDropdown(false); }}
                          className={`w-full px-4 py-2.5 text-right text-sm flex items-center justify-between gap-3 transition-colors ${
                            formCategory === c.value ? 'bg-[#655ac1]/6 text-[#655ac1]' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="font-bold">{c.label}</span>
                          {formCategory === c.value && (
                            <span className="w-5 h-5 rounded-full bg-[#655ac1] text-white flex items-center justify-center shrink-0">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
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
                  rows={3}
                  placeholder="اشرح مشكلتك بالتفصيل: متى بدأʿ ما الخطوات التي أدت إليهǿ ما الرسالة التي ظهرʿ"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#8779fb] focus:ring-1 focus:ring-[#8779fb]/30 resize-none transition-all"
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
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
                    ${isDragging
                      ? 'border-[#8779fb] bg-[#f0eeff]'
                      : 'border-slate-200 hover:border-[#8779fb]/50 hover:bg-slate-50'
                    }`}
                >
                  <Upload size={22} className={`mx-auto mb-1.5 ${isDragging ? 'text-[#8779fb]' : 'text-slate-400'}`} />
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
                      <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2 border border-slate-200">
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
              <div className="flex gap-3 pt-1 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#655ac1] text-white rounded-xl font-black hover:bg-[#5548b0] transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5"
                >
                  <Send size={16} />
                  إرسال التذكرة
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Ticket List ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 flex items-center gap-2 text-base">
            <TicketIcon size={18} className="text-[#655ac1]" />
            سجل التذاكر
          </h3>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-xs font-bold text-[#8779fb]">إجمالي التذاكر</span>
            <span className="w-px h-3.5 bg-slate-200" />
            <span className="font-black text-sm text-[#655ac1]">{tickets.length}</span>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <TicketIcon size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="font-bold">لا توجد تذاكر بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-white border-b text-sm text-[#655ac1]">
                <tr>
                  <th className="px-6 py-4 font-medium">رقم التذكرة</th>
                  <th className="px-6 py-4 font-medium">الموضوع</th>
                  <th className="px-6 py-4 font-medium">التصنيف</th>
                  <th className="px-6 py-4 font-medium">الحالة</th>
                  <th className="px-6 py-4 font-medium">التاريخ</th>
                  <th className="px-6 py-4 font-medium">الوقت</th>
                  <th className="px-6 py-4 font-medium">المرفقات</th>
                  <th className="px-6 py-4 font-medium">عرض</th>
                </tr>
              </thead>
              <tbody className="divide-y">
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
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      {/* ID + new-reply dot */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[#655ac1] text-sm font-mono">{ticket.id}</span>
                          {hasReplies && ticket.status === 'replied' && (
                            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="يوجد رد جديد" />
                          )}
                        </div>
                      </td>
                      {/* Title */}
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800 text-sm max-w-[200px] truncate" title={ticket.title}>
                          {ticket.title}
                        </p>
                      </td>
                      {/* Category */}
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-600">{ticket.categoryLabel}</span>
                      </td>
                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-sm font-bold
                          ${ticket.status === 'processing' ? 'text-yellow-600' :
                            ticket.status === 'replied'    ? 'text-green-600'  :
                                                             'text-gray-400'}`}>
                          <StatusIcon size={14} />
                          {sc.label}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-gray-700">{dayName}</p>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">{dateFmt}</p>
                      </td>
                      {/* Time */}
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-700">{ticket.time}</span>
                      </td>
                      {/* Attachments */}
                      <td className="px-6 py-4">
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
                            <span className="text-xs font-medium text-gray-500 mr-1">({ticket.attachments.length})</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      {/* Action hint */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-slate-200 text-[#655ac1] hover:bg-[#f5f3ff] transition-all"
                        >
                          <Eye size={13} />
                        </button>
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
        />
      )}
    </div>
  );
};

export default TicketSection;
