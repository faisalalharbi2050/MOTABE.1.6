import React, { useState, useRef } from 'react';
import {
  TicketIcon, Clock, AlertCircle, CheckCircle2, XCircle,
  ChevronDown, Upload, X, FileText, Image as ImageIcon,
  Send, PlusCircle, Info, Paperclip,
} from 'lucide-react';
import { useToast } from '../ui/ToastProvider';

// ─── Types ───────────────────────────────────────────────────────────────────
type TicketCategory = 'technical' | 'payment' | 'billing' | 'suggestion' | 'other';
type TicketStatus = 'processing' | 'replied' | 'closed';
type TicketPriority = 'urgent' | 'normal';

interface Attachment {
  name: string;
  type: 'image' | 'pdf' | 'doc';
  size: string;
}

interface Ticket {
  id: string;
  title: string;
  category: TicketCategory;
  categoryLabel: string;
  priority: TicketPriority;
  status: TicketStatus;
  date: string;
  time: string;
  attachments: Attachment[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES: { value: TicketCategory; label: string; urgent: boolean }[] = [
  { value: 'technical', label: 'مشكلة تقنية', urgent: true },
  { value: 'payment',   label: 'مشكلة في الدفع', urgent: true },
  { value: 'billing',   label: 'مشكلة في الفوترة', urgent: false },
  { value: 'suggestion',label: 'اقتراح', urgent: false },
  { value: 'other',     label: 'أخرى', urgent: false },
];

const ACCEPTED_IMAGES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ACCEPTED_DOCS   = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const MOCK_TICKETS: Ticket[] = [
  {
    id: 'TKT-001',
    title: 'مشكلة في تسجيل الدخول',
    category: 'technical',
    categoryLabel: 'مشكلة تقنية',
    priority: 'urgent',
    status: 'replied',
    date: '2026-03-09',
    time: '08:15 ص',
    attachments: [{ name: 'screenshot.png', type: 'image', size: '512 KB' }],
  },
  {
    id: 'TKT-002',
    title: 'استفسار عن الفاتورة الأخيرة',
    category: 'billing',
    categoryLabel: 'مشكلة في الفوترة',
    priority: 'normal',
    status: 'processing',
    date: '2026-03-08',
    time: '11:30 ص',
    attachments: [],
  },
  {
    id: 'TKT-003',
    title: 'مقترح: إضافة تقرير أسبوعي للمناوبة',
    category: 'suggestion',
    categoryLabel: 'اقتراح',
    priority: 'normal',
    status: 'closed',
    date: '2026-03-05',
    time: '09:45 ص',
    attachments: [],
  },
];

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: React.ElementType; bar: number }> = {
  processing: { label: 'قيد المعالجة', color: 'text-yellow-700 bg-yellow-100 border-yellow-200', icon: Clock,         bar: 40 },
  replied:    { label: 'تم الرد',      color: 'text-green-700 bg-green-100 border-green-200',   icon: CheckCircle2,   bar: 80 },
  closed:     { label: 'مغلقة',        color: 'text-slate-600 bg-slate-100 border-slate-200',   icon: XCircle,        bar: 100 },
};

// ─── Helper: file type ────────────────────────────────────────────────────────
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

// ─── WorkingHours sub-component ───────────────────────────────────────────────
const WorkingHoursCard: React.FC = () => {
  // Determine if currently within working hours (Sun–Thu, 08:00–14:30 KSA)
  const now = new Date();
  const day = now.getDay();           // 0=Sun … 4=Thu
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;
  const isWorkday = day >= 0 && day <= 4;
  const isWorkTime = totalMinutes >= 8 * 60 && totalMinutes < 14 * 60 + 30;
  const isAvailable = isWorkday && isWorkTime;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      {/* Status icon — colored by availability, no background */}
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0">
        <Clock size={32} className={isAvailable ? 'text-green-500' : 'text-yellow-500'} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-slate-800 text-base mb-1">أوقات العمل الرسمية</h4>
        <p className="text-sm font-bold text-slate-700">
          الأحد – الخميس &nbsp;|&nbsp; 8:00 ص — 2:30 م
        </p>
        <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
          حيّاك في متابع، يُرجى رفع تذكرتك وسنتواصل معك خلال أوقات العمل. يمكن استخدام المساعد الذكي في أي وقت.
        </p>
      </div>

      {/* Availability badge */}
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

// ─── StatusProgressBar sub-component ─────────────────────────────────────────
const StatusBar: React.FC<{ status: TicketStatus }> = ({ status }) => {
  const steps: TicketStatus[] = ['processing', 'replied', 'closed'];
  const stepIdx = steps.indexOf(status);
  const labels = ['قيد المعالجة', 'تم الرد', 'مغلقة'];
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

// ─── Main Component ───────────────────────────────────────────────────────────
interface TicketSectionProps {
  openFormOnMount?: boolean;
}

const TicketSection: React.FC<TicketSectionProps> = ({ openFormOnMount = false }) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [showForm, setShowForm] = useState(openFormOnMount);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<TicketCategory | ''>('');
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Ticket list
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);

  const selectedCategory = CATEGORIES.find(c => c.value === formCategory);
  const isUrgent = selectedCategory?.urgent ?? false;

  // ── File handling ─────────────────────────────────────────────────────────
  const processFiles = (files: FileList | null) => {
    if (!files) return;
    const allowed = [...ACCEPTED_IMAGES, ...ACCEPTED_DOCS];
    Array.from(files).forEach(file => {
      if (!allowed.includes(file.type)) {
        showToast(`نوع الملف "${file.name}" غير مدعوم`, 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast(`حجم الملف يتجاوز الحد الأقصى (10 MB)`, 'error');
        return;
      }
      setAttachedFiles(prev => [...prev, {
        name: file.name,
        type: getFileType(file.type),
        size: formatSize(file.size),
      }]);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) { showToast('يرجى إدخال عنوان المشكلة', 'error'); return; }
    if (!formCategory)     { showToast('يرجى تحديد تصنيف المشكلة', 'error'); return; }
    if (!formDesc.trim())  { showToast('يرجى كتابة وصف تفصيلي', 'error'); return; }

    const now = new Date();
    const cat = CATEGORIES.find(c => c.value === formCategory)!;
    const newTicket: Ticket = {
      id: `TKT-${String(tickets.length + 1).padStart(3, '0')}`,
      title: formTitle.trim(),
      category: formCategory as TicketCategory,
      categoryLabel: cat.label,
      priority: cat.urgent ? 'urgent' : 'normal',
      status: 'processing',
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      attachments: attachedFiles,
    };
    setTickets(prev => [newTicket, ...prev]);
    setFormTitle(''); setFormDesc(''); setFormCategory(''); setAttachedFiles([]);
    setShowForm(false);
    showToast(`تم رفع التذكرة ${newTicket.id} بنجاح. سيتم التواصل معك خلال أوقات العمل.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Working Hours Banner */}
      <WorkingHoursCard />

      {/* Toggle Form Button */}
      <div className="flex justify-start">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-3 bg-[#8779fb] text-white rounded-xl font-black hover:bg-[#655ac1] hover:-translate-y-0.5 transition-all shadow-md shadow-indigo-200"
        >
          <PlusCircle size={18} />
          رفع تذكرة جديدة
        </button>
      </div>

      {/* Ticket Creation Modal */}
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
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg">
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

              {/* Category + Priority badge */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  تصنيف المشكلة <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3 items-start">
                  <div className="relative flex-1">
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
                  {isUrgent && (
                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl font-black text-sm shrink-0 animate-fade-in">
                      <AlertCircle size={16} />
                      عاجل
                    </div>
                  )}
                </div>
                {isUrgent && (
                  <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1">
                    <Info size={12} />
                    تم تصنيف هذه التذكرة تلقائياً كـ"عاجل" وستُعالَج بأولوية عليا.
                  </p>
                )}
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
                    ${isDragging ? 'border-[#8779fb] bg-[#f0eeff]' : 'border-slate-200 hover:border-[#8779fb]/50 hover:bg-slate-50'}`}
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

                {/* Attached Files List */}
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

      {/* Ticket List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header */}
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
                  <th className="text-right px-5 py-3 font-black text-slate-500 text-xs uppercase tracking-wide">الأولوية</th>
                  <th className="text-right px-5 py-3 font-black text-slate-500 text-xs uppercase tracking-wide">الحالة</th>
                  <th className="text-right px-5 py-3 font-black text-slate-500 text-xs uppercase tracking-wide">التاريخ</th>
                  <th className="text-right px-5 py-3 font-black text-slate-500 text-xs uppercase tracking-wide">الوقت</th>
                  <th className="text-right px-5 py-3 font-black text-slate-500 text-xs uppercase tracking-wide">المرفقات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket) => {
                  const sc = STATUS_CONFIG[ticket.status];
                  const StatusIcon = sc.icon;
                  const dateObj = new Date(ticket.date);
                  const dayName = dateObj.toLocaleDateString('ar-SA', { weekday: 'long' });
                  const dateFormatted = dateObj.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
                  return (
                    <tr key={ticket.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* ID */}
                      <td className="px-5 py-4">
                        <span className="font-black text-[#655ac1] text-sm font-mono">
                          {ticket.id}
                        </span>
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
                      {/* Priority */}
                      <td className="px-5 py-4">
                        {ticket.priority === 'urgent' ? (
                          <span className="flex items-center gap-1.5 text-sm font-black text-red-500 w-fit">
                            <AlertCircle size={14} />
                            عاجل
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-slate-400">عادي</span>
                        )}
                      </td>
                      {/* Status — colored text only, no badge/border */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-sm font-black w-fit
                          ${ticket.status === 'processing' ? 'text-yellow-600' :
                            ticket.status === 'replied'    ? 'text-green-600'  :
                                                             'text-slate-400'}`}>
                          <StatusIcon size={14} />
                          {sc.label}
                        </span>
                      </td>
                      {/* Date (day name + formatted date) */}
                      <td className="px-5 py-4">
                        <p className="text-xs font-black text-slate-700">{dayName}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{dateFormatted}</p>
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
                              <div key={ai} title={att.name}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center
                                  ${att.type === 'image' ? 'bg-blue-50 text-blue-500' : att.type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                <Paperclip size={14} />
                              </div>
                            ))}
                            <span className="text-xs font-bold text-slate-500 mr-1">
                              ({ticket.attachments.length})
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketSection;
