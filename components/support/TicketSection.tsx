import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  TicketIcon, Clock, CheckCircle2, XCircle,
  ChevronDown, Upload, X, FileText, Image as ImageIcon,
  Send, PlusCircle, Paperclip, Check, Eye,
  User, Headset, Calendar, Sun,
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

// صيغة التقويم موحّدة من مرتكز الرئيسية (schoolInfo.calendarType) — لا مبدّل مستقل
const getCalendarType = (): 'hijri' | 'gregorian' => {
  try {
    const saved = localStorage.getItem('school_assignment_v4');
    if (saved) {
      const data = JSON.parse(saved);
      if (data?.schoolInfo?.calendarType === 'gregorian') return 'gregorian';
    }
  } catch {}
  return 'hijri';
};

const formatTicketDay = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('ar-SA', { weekday: 'long' });

const formatTicketDate = (iso: string, calendarType: 'hijri' | 'gregorian'): string => {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    if (calendarType === 'gregorian') {
      const g = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
      return `${g} م`;
    }
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  } catch {
    return iso;
  }
};

// ─── WorkingHoursCard — المصدر الموحّد لأوقات العمل + المؤشر الحيّ ──────────────
const WorkingHoursCard: React.FC = () => {
  // إعادة الحساب كل دقيقة حتى يتحدّث مؤشر «متاح الآن/خارج الدوام» تلقائياً
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const now         = getRiyadhTime();
  const day         = now.getDay();           // 0=Sun … 4=Thu
  const totalMin    = now.getHours() * 60 + now.getMinutes();
  const isWorkday   = day >= 0 && day <= 4;
  const isWorkTime  = totalMin >= 8 * 60 && totalMin < 14 * 60 + 30;
  const isAvailable = isWorkday && isWorkTime;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* رأس البطاقة + المؤشر الحيّ */}
      <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
        <h3 className="font-black text-slate-800 text-base flex items-center gap-2 min-w-0">
          <Clock size={20} className="text-[#655ac1] shrink-0" />
          أوقات العمل لفريق الدعم
        </h3>
        <span
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs whitespace-nowrap
            ${isAvailable
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
        >
          <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          {isAvailable ? 'متاح الآن' : 'خارج الدوام'}
        </span>
      </div>

      {/* تفاصيل الدوام */}
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
            <Calendar size={18} className="text-[#655ac1] shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 mb-0.5">أيام العمل</p>
              <p className="font-black text-slate-800 text-sm">الأحد — الخميس</p>
            </div>
          </div>
          <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
            <Clock size={18} className="text-[#655ac1] shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 mb-0.5">ساعات العمل</p>
              <p className="font-black text-slate-800 text-sm">8:00 ص — 2:30 م</p>
            </div>
          </div>
          <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
            <Sun size={18} className="text-[#655ac1] shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 mb-0.5">أيام الإجازة</p>
              <p className="font-black text-slate-800 text-sm">الجمعة — السبت</p>
            </div>
          </div>
        </div>
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
          <div className="flex flex-col items-center gap-1">
            <div className={`w-4 h-4 rounded-full border-2 transition-all
              ${i <= stepIdx ? 'bg-[#655ac1] border-[#655ac1]' : 'bg-white border-slate-300'}`} />
            <span className={`text-[11px] font-bold whitespace-nowrap ${i <= stepIdx ? 'text-[#655ac1]' : 'text-slate-400'}`}>
              {labels[i]}
            </span>
          </div>
          {i < 2 && (
            <div className={`flex-1 h-0.5 rounded-full mb-4 transition-all ${i < stepIdx ? 'bg-[#655ac1]' : 'bg-slate-200'}`} />
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
  const calendarType   = getCalendarType();

  return createPortal((
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-7 py-5 bg-white border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <h3 className="font-black text-slate-800 flex items-center gap-2.5 text-lg min-w-0">
            <TicketIcon size={24} className="text-[#655ac1] shrink-0" />
            <span className="truncate">{ticket.title}</span>
          </h3>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-bold ${sc.color}`}>
              <StatusIcon size={14} />
              {sc.label}
            </span>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── شريط البيانات الوصفية ── */}
        <div className="px-7 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center gap-0 text-[13px] font-medium text-slate-500 shrink-0" dir="rtl">
          <span className="flex items-center gap-1.5 px-3 first:pr-0 font-mono font-bold text-[#655ac1]">
            <TicketIcon size={13} className="text-slate-400" />
            {ticket.id}
          </span>
          <span className="w-px h-3.5 bg-slate-200 mx-1.5" />
          <span className="px-3">{ticket.categoryLabel}</span>
          <span className="w-px h-3.5 bg-slate-200 mx-1.5" />
          <span className="px-3">{formatTicketDay(ticket.date)}</span>
          <span className="w-px h-3.5 bg-slate-200 mx-1.5" />
          <span className="px-3">{formatTicketDate(ticket.date, calendarType)}</span>
          <span className="w-px h-3.5 bg-slate-200 mx-1.5" />
          <span className="px-3">{ticket.time}</span>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto bg-white px-6 py-5 space-y-4 custom-scrollbar" dir="rtl">

          {/* شريط التقدم */}
          <div className="rounded-2xl px-6 py-4 border border-slate-200">
            <StatusBar status={ticket.status} />
          </div>

          {/* ── تفاصيل الطلب ── */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <User size={15} className="text-[#655ac1]" />
                <span className="text-sm font-black text-slate-700">تفاصيل الطلب</span>
              </div>
              <span className="text-xs font-medium text-slate-400">
                {ticket.time} — {formatTicketDate(ticket.date, calendarType)}
              </span>
            </div>
            <div className="px-6 py-5">
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3.5 py-2 text-[13px] font-bold">
                <span className="text-slate-800">رقم الجوال:</span>
                <span dir="ltr" className="font-mono text-[#655ac1]">{formatSaudiMobileForDisplay(ticket.phoneNumber)}</span>
              </div>
              <p className="text-[15px] text-slate-700 leading-loose">{ticket.description}</p>
            </div>
            {ticket.attachments.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100">
                <p className="text-xs font-black text-slate-800 mb-2.5">المرفقات</p>
                <div className="space-y-2">
                  {ticket.attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white border border-slate-200 text-slate-500">
                        {att.type === 'image' ? <ImageIcon size={16} /> : <FileText size={16} />}
                      </div>
                      <span className="text-sm font-bold text-[#655ac1] flex-1 truncate">{att.name}</span>
                      <span className="text-xs font-medium text-slate-400 shrink-0">{att.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── رد فريق الدعم ── */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Headset size={15} className="text-[#655ac1]" />
                <span className="text-sm font-black text-slate-700">رد فريق الدعم</span>
              </div>
              {supportReplies.length > 0 && (
                <span className="text-xs font-medium text-slate-400">
                  {supportReplies[supportReplies.length - 1].time} — {formatTicketDate(supportReplies[supportReplies.length - 1].date, calendarType)}
                </span>
              )}
            </div>

            {supportReplies.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Headset size={40} className="text-[#655ac1]/80 mx-auto mb-3.5" />
                <p className="text-base font-bold text-slate-600">في انتظار رد فريق الدعم</p>
                <p className="text-sm font-medium text-slate-400 mt-1.5">سيتم الرد عليك في أقرب وقت ممكن</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {supportReplies.map((reply, idx) => (
                  <div key={idx} className="px-6 py-5">
                    {supportReplies.length > 1 && (
                      <p className="text-xs font-bold text-slate-400 mb-2">
                        {reply.time} — {formatTicketDate(reply.date, calendarType)}
                      </p>
                    )}
                    <p className="text-[15px] text-slate-700 leading-loose">{reply.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  ), document.body);
};

// ─── Main: TicketSection ──────────────────────────────────────────────────────
const TicketSection: React.FC = () => {
  const { showToast } = useToast();
  const fileInputRef        = useRef<HTMLInputElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // View toggle: نموذج الرفع الحيّ ↔ سجل التذاكر
  const [activeView,           setActiveView]           = useState<'create' | 'list'>('create');
  // Form state
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

  // Ticket list — تبدأ فارغة عند الإطلاق (تُملأ بتذاكر المستخدم الفعلية)
  const [tickets,        setTickets]        = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const calendarType = getCalendarType();


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
    setActiveView('list');

    const msg = `تم رفع التذكرة ${newTicket.id} بنجاح. سيتم التواصل معك خلال أوقات العمل.`;
    showToast(msg, 'success');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Work Hours Card — مصدر موحّد + مؤشر حيّ */}
      <WorkingHoursCard />

      {/* ── Segmented view tabs ── */}
      <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveView('create')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeView === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <PlusCircle size={16} />
          رفع تذكرة
        </button>
        <button
          type="button"
          onClick={() => setActiveView('list')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeView === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <TicketIcon size={16} />
          سجل التذاكر
        </button>
      </div>

      {/* ── Create View — نموذج رفع التذكرة حيًّا داخل الصفحة ── */}
      {activeView === 'create' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <TicketIcon size={20} className="text-[#655ac1]" />
            <h3 className="font-black text-slate-800 text-base">رفع تذكرة دعم جديدة</h3>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
                rows={4}
                placeholder="اشرح مشكلتك بالتفصيل: متى بدأت؟ ما الخطوات التي أدّت إليها؟ وما الرسالة التي ظهرت لك؟"
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
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all
                  ${isDragging
                    ? 'border-[#8779fb] bg-[#f0eeff]'
                    : 'border-slate-200 hover:border-[#8779fb]/50 hover:bg-slate-50'
                  }`}
              >
                <Upload size={24} className={`mx-auto mb-1.5 ${isDragging ? 'text-[#8779fb]' : 'text-slate-400'}`} />
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
                onClick={() => { setFormTitle(''); setFormPhoneNumber(''); setFormDesc(''); setFormCategory(''); setAttachedFiles([]); }}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                تفريغ الحقول
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
      )}

      {/* ── List View — سجل التذاكر (بنفس تصميم سجل العمليات والفواتير) ── */}
      {activeView === 'list' && (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <TicketIcon size={18} className="text-[#655ac1]" />
            <h4 className="text-base font-black text-slate-800">سجل التذاكر</h4>
            <span className="mr-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-black text-[#655ac1]">
              {tickets.length}
            </span>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-5">
              <TicketIcon size={30} strokeWidth={1.8} className="text-[#655ac1]" />
            </div>
            <p className="font-black text-slate-800 text-base mb-1.5">لا توجد تذاكر بعد</p>
            <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-sm mx-auto mb-6">
              عند رفع تذكرة دعم ستظهر هنا مع حالتها وردّ الفريق عليها، لتتابعها في أي وقت.
            </p>
            <button
              onClick={() => setActiveView('create')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#655ac1] text-white rounded-xl font-black text-sm hover:bg-[#5548b0] hover:-translate-y-0.5 transition-all shadow-md shadow-indigo-200"
            >
              <PlusCircle size={16} />
              رفع تذكرة جديدة
            </button>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 p-3 md:hidden">
              {tickets.map((ticket, index) => {
                const sc         = STATUS_CONFIG[ticket.status];
                const dayName    = formatTicketDay(ticket.date);
                const dateFmt    = formatTicketDate(ticket.date, calendarType);
                return (
                  <div key={ticket.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-xs font-bold text-slate-400">
                        {index + 1}
                      </span>
                      <span className="font-mono text-[12px] font-bold text-[#655ac1]">{ticket.id}</span>
                      <span className={`mr-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${sc.color}`}>
                        {sc.label}
                      </span>
                    </div>
                    <p className="mt-3 text-[13px] font-black text-slate-800">{ticket.title}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-400">{ticket.categoryLabel}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[12px] font-bold text-slate-500">{dayName} · {dateFmt} · {ticket.time}</span>
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[#655ac1] transition-colors hover:border-[#655ac1]/40 hover:bg-[#f5f3ff]"
                        title="عرض التذكرة"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden p-4 md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] table-fixed border-separate border-spacing-0 overflow-hidden rounded-2xl border border-slate-100 text-right">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="w-12 px-3 py-4 text-center text-xs font-black text-[#655ac1]">م</th>
                      <th className="w-[12%] px-3 py-4 text-xs font-black text-[#655ac1]">رقم التذكرة</th>
                      <th className="w-[20%] px-3 py-4 text-xs font-black text-[#655ac1]">الموضوع</th>
                      <th className="w-[11%] px-3 py-4 text-xs font-black text-[#655ac1]">التصنيف</th>
                      <th className="w-[12%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">الحالة</th>
                      <th className="w-[9%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">اليوم</th>
                      <th className="w-[11%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">التاريخ</th>
                      <th className="w-[8%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">الوقت</th>
                      <th className="w-[8%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">المرفقات</th>
                      <th className="w-[7%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">عرض</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-50">
                    {tickets.map((ticket, index) => {
                      const sc         = STATUS_CONFIG[ticket.status];
                      const StatusIcon = sc.icon;
                      const dayName    = formatTicketDay(ticket.date);
                      const dateFmt    = formatTicketDate(ticket.date, calendarType);
                      const hasReplies = ticket.replies.some(r => r.from === 'support');

                      return (
                        <tr key={ticket.id} className="transition-colors hover:bg-[#e5e1fe]/10">
                          <td className="px-3 py-3.5 text-center">
                            <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-xs font-bold text-slate-400">
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 align-middle">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[13px] font-bold text-[#655ac1]">{ticket.id}</span>
                              {hasReplies && ticket.status === 'replied' && (
                                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="يوجد رد جديد" />
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3.5 align-middle">
                            <p className="truncate text-[14px] font-black text-slate-800" title={ticket.title}>{ticket.title}</p>
                          </td>
                          <td className="px-3 py-3.5 align-middle">
                            <span className="text-[13px] font-bold text-slate-600">{ticket.categoryLabel}</span>
                          </td>
                          <td className="px-3 py-3.5 text-center align-middle">
                            <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-bold ${sc.color}`}>
                              <StatusIcon size={12} />
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-center align-middle">
                            <span className="text-[13px] font-bold text-slate-600">{dayName}</span>
                          </td>
                          <td className="px-3 py-3.5 text-center align-middle">
                            <span className="text-[13px] font-bold text-slate-600">{dateFmt}</span>
                          </td>
                          <td className="px-3 py-3.5 text-center align-middle">
                            <span className="text-[13px] font-bold text-slate-600">{ticket.time}</span>
                          </td>
                          <td className="px-3 py-3.5 text-center align-middle">
                            {ticket.attachments.length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[13px] font-bold text-slate-600">
                                <Paperclip size={13} className="text-slate-400" />
                                {ticket.attachments.length}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3.5 align-middle">
                            <div className="flex justify-center">
                              <button
                                onClick={() => setSelectedTicket(ticket)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[#655ac1] transition-colors hover:border-[#655ac1]/40 hover:bg-[#f5f3ff]"
                                title="عرض التذكرة"
                              >
                                <Eye size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      )}

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
