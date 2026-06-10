import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Search, Printer, AlertTriangle, CheckCircle2, XCircle, Users, Eye, X, Download, Archive, Check, ChevronDown, MessageSquare, Trash2, RefreshCw, Clock, Inbox, ListFilter, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { useMessageArchive } from './MessageArchiveContext';
import MessageToast from './MessageToast';
import { CentralMessage, MessageRole, MessageSource } from '../../types';
import DatePicker, { DateObject } from "react-multi-date-picker";
import arabic from "react-date-object/calendars/arabic";
import arabic_ar from "react-date-object/locales/arabic_ar";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_ar from "react-date-object/locales/gregorian_ar";

interface MessageArchiveProps {
  schoolName: string;
  calendarType?: 'hijri' | 'gregorian';
}

const sourceLabels: Record<MessageSource, string> = {
  waiting: 'الانتظار اليومي',
  supervision: 'الإشراف اليومي',
  duty: 'المناوبة اليومية',
  student_affairs: 'شؤون الطلاب',
  general: 'المراسلات العامة',
  shared_school: 'المدارس المشتركة'
};

const roleLabels: Record<MessageRole, string> = {
  all: 'الكل',
  teacher: 'المعلمون',
  admin: 'الإداريون',
  student: 'الطلاب',
  guardian: 'أولياء الأمور'
};

type CalendarType = 'hijri' | 'gregorian';
type DropdownOption = { value: string; label: string };

const parseIsoDate = (date?: string) => {
  if (!date) return undefined;
  const parsed = new Date(`${date}T00:00:00`);
  return isNaN(parsed.getTime()) ? undefined : parsed;
};

const formatIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatPickerDate = (date: DateObject | DateObject[] | null) => {
  if (!date) return '';
  const selected = Array.isArray(date) ? date[0] : date;
  return selected ? formatIsoDate(selected.toDate()) : '';
};

const getCurrentSenderName = () => {
  try {
    const profile = JSON.parse(localStorage.getItem('motabe_profile') || 'null');
    if (profile?.name?.trim()) return profile.name.trim();
  } catch {}
  return 'مدير النظام';
};

const formatRelative = (iso?: string) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return '—';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `قبل ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `قبل ${days} يوم`;
  const months = Math.floor(days / 30);
  return `قبل ${months} شهر`;
};

// Segmented (pill) toggle — faster than a dropdown for short, mutually-exclusive option sets.
// Each option may carry an `activeClass` so the selected pill reflects its own representative colour.
type SegmentedOption = DropdownOption & { activeClass?: string };
const Segmented: React.FC<{
  value: string;
  options: SegmentedOption[];
  onChange: (value: string) => void;
}> = ({ value, options, onChange }) => (
  <div className="flex w-full items-center gap-1 rounded-xl bg-slate-100 p-1">
    {options.map(option => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-black transition-all whitespace-nowrap ${
          value === option.value
            ? `bg-white shadow-sm ${option.activeClass || 'text-[#655ac1]'}`
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const SelectDropdown: React.FC<{
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
}> = ({ value, options, placeholder, onChange }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 });
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const margin = 16;
      const width = Math.min(430, Math.max(260, rect.width));
      const safeWidth = Math.min(width, window.innerWidth - margin * 2);
      setPosition({
        top: rect.bottom + 10,
        left: Math.min(Math.max(margin, rect.left), window.innerWidth - safeWidth - margin),
        width: safeWidth,
      });
    };
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(current => !current)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2"
      >
        <span className="truncate text-[13px] leading-tight">{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={panelRef}
          className="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[130] animate-in slide-in-from-top-2"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                  value === option.value ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                }`}
              >
                <span>{option.label}</span>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                  value === option.value ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                }`}>
                  <Check size={12} strokeWidth={3.5} />
                </span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

interface MessageBatch {
  id: string; // The batchId, or a surrogate ID if single message
  day: string;
  dateStr: string;
  timestamp: string; // the time of the first message
  timeStr: string;
  senderRole: string;
  senderName: string;
  content: string;
  channel: 'whatsapp' | 'sms';
  source: MessageSource;
  status: 'sent' | 'failed' | 'partial'; // partial if some failed, some sent
  totalRecipients: number;
  failureReason?: string;
  recipients: CentralMessage[];
  retryCount?: number;
}

// Summary stat card — unified with the delegation tab StatCard (permissions page)
const SummaryCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}> = ({ label, value, icon, active, onClick }) => {
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm ${
        onClick ? 'transition-all hover:shadow-md cursor-pointer' : ''
      } ${active ? 'ring-2 ring-[#655ac1]/40' : ''}`}
    >
      <span className="mt-0.5 shrink-0 text-[#655ac1]">{icon}</span>
      <span className="min-w-0">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-slate-800">{value}</p>
      </span>
    </Comp>
  );
};

const MessageArchive: React.FC<MessageArchiveProps> = ({ schoolName, calendarType: calendarTypeProp }) => {
  const { messages, resendMessage, deleteMessages } = useMessageArchive();

  // Advanced Search State (UI Only)
  const calendarType = ((calendarTypeProp || 'hijri') as CalendarType);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['all']);
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'sms'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Table State
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());
  const [isResending, setIsResending] = useState<string | null>(null);
  const [viewingRecipients, setViewingRecipients] = useState<CentralMessage[] | null>(null);
  const [viewingMessage, setViewingMessage] = useState<MessageBatch | null>(null);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; count: number; scope: 'selected' | 'all' } | null>(null);

  const showToast = (type: 'error' | 'success' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Format Helpers
  const formatHijriDate = (date: Date) => {
      try {
          return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
      } catch (e) {
          return new Intl.DateTimeFormat('en-US').format(date);
      }
  };

  const formatGregorianDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  };

  const toggleRoleSelection = (role: string) => {
      if (role === 'all') {
          setSelectedRoles(['all']);
      } else if (role === 'staff') {
          setSelectedRoles(['teacher', 'admin']);
      } else {
          const newRoles = selectedRoles.filter(r => r !== 'all');
          if (newRoles.includes(role)) {
              if (newRoles.length === 1) setSelectedRoles(['all']);
              else setSelectedRoles(newRoles.filter(r => r !== role));
          } else {
              setSelectedRoles([...newRoles, role]);
          }
      }
  };

  // Grouping Messages into Batches
  const batchedMessages = useMemo(() => {
     const batches = new Map<string, CentralMessage[]>();
     messages.forEach(msg => {
         const key = msg.batchId || msg.id; // use its own ID if no batch ID
         if (!batches.has(key)) batches.set(key, []);
         batches.get(key)!.push(msg);
     });

     const output: MessageBatch[] = [];
     batches.forEach((msgs, key) => {
         const first = msgs[0];
         const date = new Date(first.timestamp);

         const hasSent = msgs.some(m => m.status === 'sent');
         const hasFailed = msgs.some(m => m.status === 'failed');
         let overallStatus: 'sent' | 'failed' | 'partial' = 'sent';
         if (hasSent && hasFailed) overallStatus = 'partial';
         else if (hasFailed) overallStatus = 'failed';

         output.push({
             id: key,
             day: new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(date),
             dateStr: calendarType === 'hijri' ? formatHijriDate(date) : formatGregorianDate(date),
             timestamp: first.timestamp,
             timeStr: new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(date),
             senderRole: first.senderRole || 'مدير النظام',
             senderName: first.senderName || getCurrentSenderName() || first.senderRole || 'مدير النظام',
             content: first.originalContent || first.content,
             channel: first.channel,
             source: first.source,
             status: overallStatus,
             totalRecipients: msgs.length,
             failureReason: overallStatus === 'failed' ? msgs.find(m => m.failureReason)?.failureReason : undefined,
             recipients: msgs,
             retryCount: Math.max(...msgs.map(m => m.retryCount || 0))
         });
     });

     return output.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [messages]);

  // Overview summary (batch-level)
  const summary = useMemo(() => {
    const total = batchedMessages.length;
    const sent = batchedMessages.filter(b => b.status === 'sent').length;
    const needsAttention = batchedMessages.filter(b => b.status !== 'sent').length;
    const lastTimestamp = batchedMessages[0]?.timestamp;
    return { total, sent, needsAttention, lastTimestamp };
  }, [batchedMessages]);

  // Filtering Batches
  const filteredBatches = useMemo(() => {
    return batchedMessages.filter(b => {
      // 1. Date Range Filter
      if (dateFrom || dateTo) {
          const bDate = new Date(b.timestamp);
          bDate.setHours(0,0,0,0);
          if (dateFrom) {
              const fromDate = new Date(dateFrom);
              fromDate.setHours(0,0,0,0);
              if (bDate < fromDate) return false;
          }
          if (dateTo) {
              const toDate = new Date(dateTo);
              toDate.setHours(23,59,59,999);
              if (bDate > toDate) return false;
          }
      }

      // 2. Role Filter (Check if batch contains ANY recipient matching roles)
      if (!selectedRoles.includes('all')) {
          const hasMatchingRole = b.recipients.some(r => selectedRoles.includes(r.recipientRole));
          if (!hasMatchingRole) return false;
      }

      // 3. Channel Filter
      if (channelFilter !== 'all' && b.channel !== channelFilter) return false;

      // 4. Status Filter (partial counts as failed for "needs attention")
      if (statusFilter !== 'all') {
          if (statusFilter === 'sent' && b.status !== 'sent') return false;
          if (statusFilter === 'failed' && b.status === 'sent') return false;
      }

      // 5. Text Search (Search in Sender, Content, Recipient Name, Recipient Phone)
      const q = searchQuery.trim().toLowerCase();
      if (q) {
          const matchSender = b.senderName.toLowerCase().includes(q) || b.senderRole.toLowerCase().includes(q);
          const matchContent = b.content.toLowerCase().includes(q);
          const matchRecipients = b.recipients.some(r =>
              r.recipientName.toLowerCase().includes(q) ||
              r.recipientPhone.toLowerCase().includes(q)
          );
          if (!matchSender && !matchContent && !matchRecipients) return false;
      }

      return true;
    });
  }, [batchedMessages, dateFrom, dateTo, selectedRoles, channelFilter, statusFilter, searchQuery]);

  const hasActiveFilters = !!(dateFrom || dateTo || searchQuery || channelFilter !== 'all' || statusFilter !== 'all' || !selectedRoles.includes('all'));

  const resetFilters = () => {
    setDateFrom(''); setDateTo('');
    setSelectedRoles(['all']); setChannelFilter('all');
    setStatusFilter('all'); setSearchQuery('');
  };

  const toggleBatchSelection = (id: string) => {
      const next = new Set(selectedBatches);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedBatches(next);
  };

  const selectedBatchObjects = useMemo(
    () => batchedMessages.filter(b => selectedBatches.has(b.id)),
    [batchedMessages, selectedBatches]
  );
  const selectedFailedCount = useMemo(
    () => selectedBatchObjects.reduce((acc, b) => acc + b.recipients.filter(r => r.status === 'failed').length, 0),
    [selectedBatchObjects]
  );

  const handleResendFailed = async (batchId: string) => {
    setIsResending(batchId);
    const batch = batchedMessages.find(b => b.id === batchId);
    if (batch) {
        const failedRecipients = batch.recipients.filter(r => r.status === 'failed');
        for (const r of failedRecipients) {
           await resendMessage(r.id);
        }
        showToast('success', `تمت إعادة محاولة إرسال ${failedRecipients.length} رسالة`);
    }
    setIsResending(null);
  };

  const handleResendSelectedFailed = async () => {
    if (selectedFailedCount === 0) { showToast('info', 'لا توجد رسائل فاشلة ضمن المحدد'); return; }
    setIsResending('bulk');
    let count = 0;
    for (const batch of selectedBatchObjects) {
        for (const r of batch.recipients.filter(r => r.status === 'failed')) {
            await resendMessage(r.id);
            count++;
        }
    }
    setIsResending(null);
    showToast('success', `تمت إعادة محاولة إرسال ${count} رسالة`);
  };

  // Resolve which batches an action should target: the selection, else the filtered view
  const resolveTargetBatches = () =>
    selectedBatches.size > 0
      ? batchedMessages.filter(b => selectedBatches.has(b.id))
      : filteredBatches;

  const handlePrint = () => {
    const b = resolveTargetBatches();
    if (b.length === 0) { showToast('error', 'لا توجد سجلات للطباعة'); return; }
    printMessages(b);
  };

  const handleExport = () => {
    const b = resolveTargetBatches();
    if (b.length === 0) { showToast('error', 'لا توجد سجلات للتصدير'); return; }
    showToast('info', "سيتم التصدير كملف PDF — اختر 'حفظ بتنسيق PDF' عند ظهور نافذة الطباعة");
    setTimeout(() => printMessages(b), 800);
  };

  const requestDeleteSelected = () => {
    if (selectedBatchObjects.length === 0) return;
    const ids = selectedBatchObjects.flatMap(b => b.recipients.map(r => r.id));
    setConfirmDelete({ ids, count: selectedBatchObjects.length, scope: 'selected' });
  };

  const requestClearAll = () => {
    if (batchedMessages.length === 0) { showToast('info', 'الأرشيف فارغ بالفعل'); return; }
    const ids = batchedMessages.flatMap(b => b.recipients.map(r => r.id));
    setConfirmDelete({ ids, count: batchedMessages.length, scope: 'all' });
  };

  const confirmDeletion = () => {
    if (!confirmDelete) return;
    deleteMessages(confirmDelete.ids);
    setSelectedBatches(new Set());
    showToast('success', `تم حذف ${confirmDelete.count} سجل`);
    setConfirmDelete(null);
  };

  // Precision Printing
  const printMessages = (batchesToPrint: MessageBatch[]) => {
      if (batchesToPrint.length === 0) return;

      const w = window.open('', '_blank');
      if (!w) return;

      const printDateStr = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date());
      const printHijri = formatHijriDate(new Date());
      const printGreg = formatGregorianDate(new Date());

      // Generate Table Rows for all recipients in these batches
      let tableRows = '';
      batchesToPrint.forEach(batch => {
          batch.recipients.forEach((rec, idx) => {
              tableRows += `
                 <tr>
                    ${idx === 0 ? `<td rowspan="${batch.recipients.length}" class="v-align">${batch.day}</td>` : ''}
                    ${idx === 0 ? `<td rowspan="${batch.recipients.length}" class="v-align">${formatHijriDate(new Date(batch.timestamp))}<br/><span style="font-size:10px;color:#666">${formatGregorianDate(new Date(batch.timestamp))}</span></td>` : ''}
                    ${idx === 0 ? `<td rowspan="${batch.recipients.length}" class="v-align" dir="ltr" style="text-align:right;color:#655ac1;font-weight:bold;">${batch.timeStr}</td>` : ''}
                    ${idx === 0 ? `<td rowspan="${batch.recipients.length}" class="v-align">${batch.senderName}</td>` : ''}
                    <td><div style="font-weight:bold;">${rec.recipientName}</div><div style="font-size:10px;color:#666;">${roleLabels[rec.recipientRole]}</div></td>
                    <td dir="ltr" style="text-align:right;">${rec.recipientPhone}</td>

                    ${idx === 0 ? `<td rowspan="${batch.recipients.length}" class="v-align" style="font-size:11px; max-width:250px;">${batch.content}</td>` : ''}
                    ${idx === 0 ? `<td rowspan="${batch.recipients.length}" class="v-align">${batch.channel === 'whatsapp' ? 'واتساب' : 'رسالة نصية'}</td>` : ''}

                    <td class="${rec.status === 'sent' ? 'status-sent' : 'status-failed'}">
                      ${rec.status === 'sent' ? 'تم الإرسال' : 'فشل'}
                    </td>
                 </tr>
              `;
          });
      });

      w.document.write(`
        <!DOCTYPE html><html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8"/><title>تقرير الرسائل المرسلة</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
            @page { size: A4 landscape; margin: 15mm; }
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family:'Tajawal', sans-serif; direction:rtl; color:#0f172a; padding: 20px; }

            /* Report Header */
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
            .header-right { text-align: right; line-height: 1.6; font-size: 14px; font-weight: bold; }
            .header-center { text-align: center; flex-grow: 1; }
            .header-left { text-align: left; line-height: 1.6; font-size: 13px; }

            .ministry-logo { width: 100px; height: 100px; background-color: #f1f5f9; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px; border: 2px dashed #cbd5e1; }
            .ministry-logo::after { content: 'شعار الوزارة'; font-size: 12px; color: #64748b; }

            h1 { font-size: 22px; color: #1e293b; margin-top: 10px; font-weight: 900; }

            /* Print Table */
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px 8px; text-align: right; }
            th { background-color: #f8fafc; font-weight: bold; color: #334155; }

            td.v-align { vertical-align: middle; }
            .status-sent { color: #059669; font-weight: bold; }
            .status-failed { color: #dc2626; font-weight: bold; }

          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="header-right">
              <div>إدارة التعليم بمنطقة: الرياض</div>
              <div>المدرسة: ${schoolName}</div>
              <div>الفصل الدراسي: الأول</div>
            </div>
            <div class="header-center">
              <div class="ministry-logo"></div>
              <h1>تقرير الرسائل المرسلة</h1>
            </div>
            <div class="header-left">
              <div>اليوم: ${printDateStr}</div>
              <div>الموافق: ${printHijri} هـ</div>
              <div style="font-size:11px;color:#64748b;">${printGreg} م</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>اليوم</th>
                <th>التاريخ</th>
                <th>الوقت</th>
                <th>المرسل</th>
                <th>المستلم</th>
                <th>رقم الجوال</th>
                <th>نص الرسالة</th>
                <th>الطريقة</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <script>
            window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 500); }
          </script>
        </body></html>
      `);
      w.document.close();
  };

  const handlePrintSpecific = (batchId: string) => {
      const batch = batchedMessages.find(b => b.id === batchId);
      if (batch) printMessages([batch]);
  };

  const recipientSummary = (batch: MessageBatch) => {
    const roles = Array.from(new Set(batch.recipients.map(rec => rec.recipientRole)));
    if (batch.totalRecipients === 1) return batch.recipients[0].recipientName;
    if (roles.length === 1) return roleLabels[roles[0]] || 'مستلمون';
    return 'مستلمون متعددون';
  };

  const recipientButtonLabel = (batch: MessageBatch) => {
    const roles = new Set(batch.recipients.map(rec => rec.recipientRole));
    if (roles.has('guardian')) return 'أولياء الأمور';
    if (roles.has('teacher') && roles.has('admin')) return 'معلمون وإداريون';
    if (roles.has('teacher')) return 'المعلمون';
    if (roles.has('admin')) return 'الإداريون';
    return recipientSummary(batch);
  };

  // Target-category label for the recipients modal (e.g. معلمون / إداريون / أولياء الأمور)
  const recipientsCategoryLabel = (recs: CentralMessage[]) => {
    const roles = new Set(recs.map(rec => rec.recipientRole));
    if (roles.has('guardian')) return 'أولياء الأمور';
    if (roles.has('teacher') && roles.has('admin')) return 'معلمون وإداريون';
    if (roles.has('teacher')) return 'معلمون';
    if (roles.has('admin')) return 'إداريون';
    return 'مستلمون';
  };

  const selectedRoleLabel = selectedRoles.includes('all')
    ? 'الكل'
    : selectedRoles.includes('teacher') && selectedRoles.includes('admin') && selectedRoles.length === 2
      ? 'المعلمون والإداريون'
      : selectedRoles.map(r => roleLabels[r as MessageRole] || r).join(', ');

  const renderChannel = (channel: MessageBatch['channel']) => (
    <span className={`inline-flex items-center gap-1.5 text-xs font-black ${
      channel === 'whatsapp' ? 'text-[#25D366]' : 'text-[#007AFF]'
    }`}>
      {channel === 'whatsapp' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
          <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" />
        </svg>
      ) : <MessageSquare size={16} className="text-[#007AFF]" />}
      {channel === 'whatsapp' ? 'واتساب' : 'رسالة نصية'}
    </span>
  );

  const renderStatusBadge = (batch: MessageBatch) => {
    if (batch.status === 'sent') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600">
          <CheckCircle2 size={14} /> نجح
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-black text-red-600">
        <XCircle size={14} /> فشل
      </span>
    );
  };

  const allSelected = selectedBatches.size === filteredBatches.length && filteredBatches.length > 0;

  return (
    <div className="space-y-5">

      {/* ── Toast Notification (unified) ── */}
      <MessageToast toast={toast} onClose={() => setToast(null)} />

      {/* ── Overview summary strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="إجمالي السجلات"
          value={summary.total}
          icon={<Inbox size={22} />}
        />
        <SummaryCard
          label="رسائل ناجحة"
          value={summary.sent}
          icon={<CheckCircle2 size={22} />}
        />
        <SummaryCard
          label="رسائل فاشلة"
          value={summary.needsAttention}
          icon={<AlertTriangle size={22} />}
          onClick={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')}
        />
        <SummaryCard
          label="آخر إرسال"
          value={<span className="text-base">{formatRelative(summary.lastTimestamp)}</span>}
          icon={<Clock size={22} />}
        />
      </div>

      {/* ── Unified Filter Card (uniform grid) ── */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-black text-slate-700 flex items-center gap-2">
            <ListFilter size={20} className="text-[#655ac1]" /> تصفية السجلات
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 hover:border-slate-300 transition-colors"
            >
              <X size={14} className="text-red-500" /> مسح الفلاتر
            </button>
          )}
        </div>

        {/* Row 1: search (full width) */}
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="البحث النصي: (الاسم، محتوى الرسالة، رقم الجوال)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 rounded-xl py-2.5 pr-12 pl-4 text-sm font-medium outline-none shadow-sm focus:border-[#655ac1] transition-colors"
          />
        </div>

        {/* Row 2: target + date range — three equal columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-500">المستهدف: {selectedRoleLabel}</label>
            <SelectDropdown
              value=""
              onChange={toggleRoleSelection}
              placeholder={`المستهدف: ${selectedRoleLabel}`}
              options={[
                { value: 'all', label: 'الكل' },
                { value: 'teacher', label: 'المعلمون' },
                { value: 'admin', label: 'الإداريون' },
                { value: 'guardian', label: 'أولياء الأمور' },
              ]}
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-500">
              <Calendar size={14} className="text-[#655ac1]" /> من يوم وتاريخ
            </label>
            <DatePicker
              value={parseIsoDate(dateFrom)}
              onChange={(date: DateObject | DateObject[] | null) => setDateFrom(formatPickerDate(date))}
              calendar={calendarType === 'hijri' ? arabic : gregorian}
              locale={calendarType === 'hijri' ? arabic_ar : gregorian_ar}
              containerClassName="w-full"
              inputClass="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors cursor-pointer bg-white"
              placeholder="حدد التاريخ"
              format="dddd - YYYY/MM/DD"
              portal
              portalTarget={document.body}
              editable={false}
              zIndex={99999}
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-500">
              <Calendar size={14} className="text-[#655ac1]" /> إلى يوم وتاريخ
            </label>
            <DatePicker
              value={parseIsoDate(dateTo)}
              onChange={(date: DateObject | DateObject[] | null) => setDateTo(formatPickerDate(date))}
              calendar={calendarType === 'hijri' ? arabic : gregorian}
              locale={calendarType === 'hijri' ? arabic_ar : gregorian_ar}
              containerClassName="w-full"
              inputClass="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors cursor-pointer bg-white"
              placeholder="حدد التاريخ"
              format="dddd - YYYY/MM/DD"
              portal
              portalTarget={document.body}
              editable={false}
              zIndex={99999}
            />
          </div>
        </div>

        {/* Row 3: channel + status — two equal halves */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="mb-1.5 block text-[11px] font-bold text-slate-400">طريقة الإرسال</span>
            <Segmented
              value={channelFilter}
              onChange={value => setChannelFilter(value as any)}
              options={[
                { value: 'all', label: 'الكل', activeClass: 'text-slate-900' },
                { value: 'whatsapp', label: 'واتساب', activeClass: 'text-[#25D366]' },
                { value: 'sms', label: 'نصية', activeClass: 'text-[#007AFF]' },
              ]}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-[11px] font-bold text-slate-400">حالة الإرسال</span>
            <Segmented
              value={statusFilter}
              onChange={value => setStatusFilter(value as any)}
              options={[
                { value: 'all', label: 'الكل', activeClass: 'text-slate-900' },
                { value: 'sent', label: 'ناجح', activeClass: 'text-emerald-600' },
                { value: 'failed', label: 'فاشل', activeClass: 'text-red-600' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Archive Table Card */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        {/* Context-aware action header */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Archive size={20} className="text-[#655ac1]" />
              أرشيف الرسائل
            </h3>
            <p className="text-xs font-bold text-slate-400 mt-1">
              {selectedBatches.size > 0
                ? <><span className="font-black text-[#655ac1]">{selectedBatches.size}</span> سجل محدد</>
                : <><span className="font-black text-[#655ac1]">{filteredBatches.length}</span> سجل مطابق</>}
            </p>
          </div>

          {selectedBatches.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {selectedFailedCount > 0 && (
                <Button variant="primary" size="sm" onClick={handleResendSelectedFailed} disabled={isResending === 'bulk'} className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${isResending === 'bulk' ? 'animate-spin' : ''}`} /> إعادة إرسال الفاشل ({selectedFailedCount})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 border">
                <Printer className="w-4 h-4" /> طباعة
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 border">
                <Download className="w-4 h-4" /> تصدير
              </Button>
              <Button variant="outline" size="sm" onClick={requestDeleteSelected} className="gap-2 border">
                <Trash2 className="w-4 h-4 text-red-500" /> حذف
              </Button>
              <button onClick={() => setSelectedBatches(new Set())} className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors" title="إلغاء التحديد">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 border">
                <Printer className="w-4 h-4" /> طباعة النتائج
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 border">
                <Download className="w-4 h-4" /> تصدير PDF
              </Button>
              <Button variant="outline" size="sm" onClick={requestClearAll} className="gap-2 border">
                <Trash2 className="w-4 h-4 text-red-500" /> حذف الأرشيف
              </Button>
            </div>
          )}
        </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="w-12 px-4 py-4 text-center">
                 <span className="inline-flex items-center justify-center">
                   <button
                     type="button"
                     onClick={() => {
                       if (allSelected) setSelectedBatches(new Set());
                       else setSelectedBatches(new Set(filteredBatches.map(b => b.id)));
                     }}
                     className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                       allSelected ? 'border-[#655ac1] bg-[#655ac1] text-white' : 'border-slate-300 bg-white text-transparent hover:border-[#655ac1]'
                     }`}
                     aria-label="تحديد الكل"
                   >
                     <Check size={12} strokeWidth={3.5} />
                   </button>
                 </span>
              </th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1]">اليوم والتاريخ</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1]">الوقت</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1]">المرسل</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1]">المستلمون</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1]">نص الرسالة</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1]">الطريقة</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center">الحالة</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBatches.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-0 border-none">
                  <div className="flex flex-col items-center justify-center bg-white py-20 w-full gap-4">
                    <div className="flex flex-col items-center gap-3">
                      <Archive size={48} className="text-slate-400" strokeWidth={1.4} />
                      <div className="text-center">
                        <p className="text-base font-black text-slate-700 mb-1">
                          {batchedMessages.length === 0 ? 'لا توجد رسائل في الأرشيف بعد' : 'لا توجد سجلات مطابقة'}
                        </p>
                        <p className="text-sm text-slate-400 font-medium">
                          {batchedMessages.length === 0 ? 'ستظهر هنا الرسائل بعد إرسالها' : 'جرّب تعديل معايير البحث أو توسيع نطاق التاريخ'}
                        </p>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
                filteredBatches.map(batch => {
                  const isSelected = selectedBatches.has(batch.id);
                  const hasFailures = batch.status === 'failed' || batch.status === 'partial';
                  return (
                <tr
                  key={batch.id}
                  className={`transition-colors ${isSelected ? 'bg-[#f8f7ff]' : hasFailures ? 'bg-red-50/30 hover:bg-red-50/50' : 'bg-white hover:bg-slate-50/70'}`}
                >
                  <td className={`px-4 py-4 text-center align-middle ${hasFailures ? 'border-r-2 border-red-300' : ''}`}>
                     <button
                       type="button"
                       onClick={() => toggleBatchSelection(batch.id)}
                       className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                         isSelected ? 'border-[#655ac1] bg-[#655ac1] text-white' : 'border-slate-300 bg-white text-transparent hover:border-[#655ac1]'
                       }`}
                       aria-label="تحديد السجل"
                     >
                       <Check size={12} strokeWidth={3.5} />
                     </button>
                  </td>

                  {/* Day + date */}
                  <td className="px-5 py-4 align-middle min-w-[140px]">
                     <div className="text-sm font-black text-slate-800">{batch.day}</div>
                     <div className="text-[13px] font-bold text-slate-600 mt-0.5">{batch.dateStr}</div>
                  </td>

                  {/* Time (separate column, grey) */}
                  <td className="px-5 py-4 align-middle">
                     <span className="text-[13px] font-bold text-slate-400" dir="ltr">{batch.timeStr}</span>
                  </td>

                  <td className="px-5 py-4 align-middle min-w-[120px]">
                    <div className="text-xs font-black text-slate-800 leading-5">{batch.senderName}</div>
                  </td>

                  {/* Recipients: grey label + purple count in a circular grey frame */}
                  <td className="px-5 py-4 align-middle min-w-[150px]">
                     <button
                       type="button"
                       onClick={() => setViewingRecipients(batch.recipients)}
                       className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-500 hover:border-[#655ac1] hover:bg-[#f8f7ff] transition-colors whitespace-nowrap"
                     >
                       <span>{recipientButtonLabel(batch)}</span>
                       <span className="text-[#655ac1] text-xs font-black">{batch.totalRecipients}</span>
                     </button>
                  </td>

                  <td className="px-5 py-4 align-middle max-w-[260px]">
                    <p className="text-slate-600 line-clamp-2 text-[13px] font-bold leading-relaxed">{batch.content}</p>
                  </td>

                  <td className="px-5 py-4 align-middle">
                     {renderChannel(batch.channel)}
                  </td>

                  <td className="px-5 py-4 align-middle text-center">
                    {renderStatusBadge(batch)}
                  </td>

                  {/* Per-row actions */}
                  <td className="px-5 py-4 align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewingMessage(batch)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-[#655ac1] hover:text-[#655ac1] transition-colors"
                        title="عرض النص"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintSpecific(batch.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-[#655ac1] hover:text-[#655ac1] transition-colors"
                        title="طباعة هذا السجل"
                      >
                        <Printer size={15} />
                      </button>
                      {hasFailures && (
                        <button
                          type="button"
                          onClick={() => handleResendFailed(batch.id)}
                          disabled={isResending === batch.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors disabled:opacity-60"
                          title="إعادة إرسال الفاشل"
                        >
                          <RefreshCw size={15} className={isResending === batch.id ? 'animate-spin' : ''} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
      </div>

      {/* Message Content Popup Modal */}
      {viewingMessage && typeof document !== 'undefined' && ReactDOM.createPortal(
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[220] flex items-center justify-center p-4" onClick={() => setViewingMessage(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[82vh] border border-slate-200" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <h3 className="font-black text-slate-800 flex items-center gap-2">
                          <MessageSquare className="text-[#655ac1]" size={20} />
                          نص الرسالة المرسلة
                      </h3>
                      <button onClick={() => setViewingMessage(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-slate-300 transition-colors">
                          <X size={18} />
                      </button>
                  </div>
                  <div className="p-5 overflow-y-auto custom-scrollbar">
                      {/* Day + date + channel at the top */}
                      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                        <span className="rounded-lg bg-white border border-slate-200 px-3 py-1.5">{viewingMessage.day}</span>
                        <span className="rounded-lg bg-white border border-slate-200 px-3 py-1.5">{viewingMessage.dateStr}</span>
                        <span className="rounded-lg bg-white border border-slate-200 px-3 py-1.5">{renderChannel(viewingMessage.channel)}</span>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-[15px] font-bold leading-8 text-slate-700 whitespace-pre-wrap shadow-sm">
                        {viewingMessage.content}
                      </div>
                  </div>
                  <div className="flex justify-end border-t border-slate-100 bg-white p-4">
                      <button
                        type="button"
                        onClick={() => setViewingMessage(null)}
                        className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                      >
                        إغلاق
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* Recipients Popup Modal */}
      {viewingRecipients && typeof document !== 'undefined' && ReactDOM.createPortal(
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[220] flex items-center justify-center p-4" onClick={() => setViewingRecipients(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[82vh] border border-slate-200" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50">
                      <div>
                          <h3 className="font-black text-slate-800 flex items-center gap-2">
                              <Users className="text-[#655ac1]" size={20} />
                              المستلمون
                          </h3>
                          <span className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-800">
                              {recipientsCategoryLabel(viewingRecipients)}
                              <span className="text-[#655ac1]">{viewingRecipients.length}</span>
                          </span>
                      </div>
                      <button onClick={() => setViewingRecipients(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-slate-300 transition-colors">
                          <X size={18} />
                      </button>
                  </div>
                  <div className="p-4 border-b border-slate-100">
                      <div className="relative">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="text"
                            placeholder="بحث بالاسم أو الجوال..."
                            value={recipientSearch}
                            onChange={e => setRecipientSearch(e.target.value)}
                            className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#655ac1]"
                          />
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                      <div className="space-y-2">
                         {viewingRecipients.filter(r =>
                             r.recipientName.toLowerCase().includes(recipientSearch.toLowerCase()) ||
                             r.recipientPhone.includes(recipientSearch)
                         ).map((rec, i) => (
                             <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                 <div>
                                     <div className="font-bold text-slate-800 text-sm">{rec.recipientName}</div>
                                     {rec.recipientRole === 'guardian' && rec.recipientClassLabel && (
                                       <div className="text-[11px] text-slate-500 font-bold mt-1">الفصل: {rec.recipientClassLabel}</div>
                                     )}
                                     <div className="text-xs text-slate-500 font-mono mt-1" dir="ltr">{rec.recipientPhone}</div>
                                 </div>
                                 <div className="text-center">
                                     {rec.status === 'sent'
                                        ? <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg whitespace-nowrap"><CheckCircle2 size={12} /> تم الإرسال</span>
                                        : <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-lg whitespace-nowrap"><XCircle size={12} /> فشل</span>
                                     }
                                 </div>
                             </div>
                         ))}
                      </div>
                  </div>
                  <div className="flex justify-end border-t border-slate-100 bg-white p-4">
                      <button
                        type="button"
                        onClick={() => setViewingRecipients(null)}
                        className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                      >
                        إغلاق
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && typeof document !== 'undefined' && ReactDOM.createPortal(
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[230] flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
                  <div className="p-6 flex items-start gap-3 text-right">
                      <span className="shrink-0 text-red-600">
                          <AlertTriangle size={28} />
                      </span>
                      <div className="min-w-0">
                          <h3 className="text-lg font-black text-slate-800">
                              {confirmDelete.scope === 'all' ? 'حذف أرشيف الرسائل' : 'حذف السجلات المحددة؟'}
                          </h3>
                          <p className="mt-2 text-sm font-medium text-slate-500 leading-6">
                              سيتم حذف <span className="font-black text-slate-700">{confirmDelete.count}</span> سجل نهائياً ولا يمكن التراجع عن هذا الإجراء.
                          </p>
                      </div>
                  </div>
                  <div className="flex gap-3 border-t border-slate-100 bg-slate-50 p-4">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeletion}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-700 transition-colors"
                      >
                        <Trash2 size={16} /> حذف نهائي
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
};

export default MessageArchive;
