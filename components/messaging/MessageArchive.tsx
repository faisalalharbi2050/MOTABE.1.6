import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Search, Printer, AlertTriangle, CheckCircle2, Calendar, Users, Eye, X, Download, Settings, Archive, Info, Check, ChevronDown, MessageSquare } from 'lucide-react';
import { useMessageArchive } from './MessageArchiveContext';
import { CentralMessage, MessageRole, MessageSource } from '../../types';
import DatePicker, { DateObject } from "react-multi-date-picker";
import arabic from "react-date-object/calendars/arabic";
import arabic_ar from "react-date-object/locales/arabic_ar";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_ar from "react-date-object/locales/gregorian_ar";

interface MessageArchiveProps {
  schoolName: string;
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

const dayNameForDate = (date?: string) => {
  const parsed = parseIsoDate(date) || new Date();
  return ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][parsed.getDay()] || '';
};

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
                  value === option.value ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'
                }`}>
                  <Check size={12} strokeWidth={3} />
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
  content: string;
  channel: 'whatsapp' | 'sms';
  source: MessageSource;
  status: 'sent' | 'failed' | 'partial'; // partial if some failed, some sent
  totalRecipients: number;
  failureReason?: string;
  recipients: CentralMessage[];
  retryCount?: number;
}

const MessageArchive: React.FC<MessageArchiveProps> = ({ schoolName }) => {
  const { messages, resendMessage, clearArchive } = useMessageArchive();
  
  // Advanced Search State (UI Only)
  const [calendarType, setCalendarType] = useState<CalendarType>('hijri');
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

  const formatDateLabel = (date: string) => date ? `${dayNameForDate(date)} - ${
    calendarType === 'hijri' ? formatHijriDate(new Date(`${date}T12:00:00`)) : formatGregorianDate(new Date(`${date}T12:00:00`))
  }` : 'حدد التاريخ';

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
             dateStr: formatHijriDate(date),
             timestamp: first.timestamp,
             timeStr: new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(date),
             senderRole: first.senderRole || 'مدير النظام',
             content: first.content,
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

      // 4. Status Filter (For partial, consider it sent or failed based on strictness, user wants Sent/Failed)
      if (statusFilter !== 'all') {
          if (statusFilter === 'sent' && b.status === 'failed') return false; // partial is shown in sent
          if (statusFilter === 'failed' && b.status === 'sent') return false; // partial is shown in failed
      }

      // 5. Text Search (Search in Sender, Content, Recipient Name, Recipient Phone)
      const q = searchQuery.trim().toLowerCase();
      if (q) {
          const matchSender = b.senderRole.toLowerCase().includes(q);
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

  const toggleBatchSelection = (id: string) => {
      const next = new Set(selectedBatches);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedBatches(next);
  };

  const handleResendFailed = async (batchId: string) => {
    setIsResending(batchId);
    const batch = batchedMessages.find(b => b.id === batchId);
    if (batch) {
        const failedRecipients = batch.recipients.filter(r => r.status === 'failed');
        for (const r of failedRecipients) {
           await resendMessage(r.id);
        }
    }
    setIsResending(null);
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
                    <td><div style="font-weight:bold;">${rec.recipientName}</div><div style="font-size:10px;color:#666;">${roleLabels[rec.recipientRole]}</div></td>
                    <td dir="ltr" style="text-align:right;">${rec.recipientPhone}</td>
                    
                    ${idx === 0 ? `<td rowspan="${batch.recipients.length}" class="v-align" style="font-size:11px; max-width:250px;">${batch.content}</td>` : ''}
                    ${idx === 0 ? `<td rowspan="${batch.recipients.length}" class="v-align">${batch.channel === 'whatsapp' ? 'واتساب' : 'رسالة نصية'}</td>` : ''}
                    
                    <td class="${rec.status === 'sent' ? 'status-sent' : 'status-failed'}">
                      ${rec.status === 'sent' ? 'تم الإرسال' : 'فشل'}
                    </td>
                    
                    ${idx === 0 ? `<td rowspan="${batch.recipients.length}" class="v-align" dir="ltr" style="text-align:right;">${batch.timeStr}</td>` : ''}
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
                <th>المستلم</th>
                <th>رقم الجوال</th>
                <th>نص الرسالة</th>
                <th>الطريقة</th>
                <th>الحالة</th>
                <th>الوقت</th>
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

  const handleCustomPrint = () => {
      if (selectedBatches.size === 0) { showToast('error', 'الرجاء تحديد رسالة واحدة على الأقل للطباعة المخصصة'); return; }
      const batchesToPrint = batchedMessages.filter(b => selectedBatches.has(b.id));
      printMessages(batchesToPrint);
  };

  const recipientSummary = (batch: MessageBatch) => {
    const roles = Array.from(new Set(batch.recipients.map(rec => rec.recipientRole)));
    if (batch.totalRecipients === 1) return batch.recipients[0].recipientName;
    if (roles.length === 1) return roleLabels[roles[0]] || 'مستلمون';
    return 'مستلمون متعددون';
  };

  const selectedRoleLabel = selectedRoles.includes('all')
    ? 'الكل'
    : selectedRoles.includes('teacher') && selectedRoles.includes('admin') && selectedRoles.length === 2
      ? 'المعلمون والإداريون'
      : selectedRoles.map(r => roleLabels[r as MessageRole] || r).join(', ');

  const renderChannel = (channel: MessageBatch['channel']) => (
    <span className={`inline-flex items-center gap-1.5 text-sm font-black ${
      channel === 'whatsapp' ? 'text-[#128C7E]' : 'text-slate-600'
    }`}>
      {channel === 'whatsapp' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" />
        </svg>
      ) : <MessageSquare size={14} />}
      {channel === 'whatsapp' ? 'واتساب' : 'رسالة نصية'}
    </span>
  );

  return (
    <div className="space-y-5">

      {/* ── Toast Notification ── */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg border text-sm font-bold transition-all animate-fade-in ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700'
          : toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700'
          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : toast.type === 'info' ? <Info size={18} /> : <CheckCircle2 size={18} />}
          {toast.message}
          <button onClick={() => setToast(null)} className="mr-2 opacity-60 hover:opacity-100 transition-opacity">
            <X size={16} />
          </button>
        </div>
      )}
      
      {/* 1. Advanced Search Card */}
      <div className="space-y-5">
        
        {/* Row 1: Date Range */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
           <div className="mb-4 flex items-center gap-2">
             <span className="text-xs font-black text-slate-500">نوع التقويم</span>
             <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5">
               {[
                 { value: 'hijri' as CalendarType, label: 'هجري' },
                 { value: 'gregorian' as CalendarType, label: 'ميلادي' },
               ].map(option => (
                 <button
                   key={option.value}
                   type="button"
                   onClick={() => setCalendarType(option.value)}
                   className={`px-2 py-1 rounded-md text-[10px] font-black transition-all ${
                     calendarType === option.value ? 'bg-[#655ac1] text-white' : 'text-slate-500 hover:text-[#655ac1]'
                   }`}
                 >
                   {option.label}
                 </button>
               ))}
             </div>
           </div>
           <div className="flex flex-wrap gap-4">
             <div className="flex-1 min-w-[200px]">
               <label className="text-xs font-bold text-slate-600 mb-1.5 block">من يوم وتاريخ: {formatDateLabel(dateFrom)}</label>
               <div className="relative">
                 <DatePicker 
                    value={parseIsoDate(dateFrom)}
                    onChange={(date: DateObject | DateObject[] | null) => setDateFrom(formatPickerDate(date))}
                    calendar={calendarType === 'hijri' ? arabic : gregorian}
                    locale={calendarType === 'hijri' ? arabic_ar : gregorian_ar}
                    containerClassName="w-full"
                    inputClass="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors cursor-pointer bg-white"
                    placeholder="حدد التاريخ"
                    format={calendarType === 'hijri' ? 'dddd DD MMMM YYYY' : 'dddd YYYY-MM-DD'}
                    portal
                    portalTarget={document.body}
                    editable={false}
                    zIndex={99999}
                 />
               </div>
             </div>
             <div className="flex-1 min-w-[200px]">
               <label className="text-xs font-bold text-slate-600 mb-1.5 block">إلى يوم وتاريخ: {formatDateLabel(dateTo)}</label>
               <div className="relative">
                 <DatePicker 
                    value={parseIsoDate(dateTo)}
                    onChange={(date: DateObject | DateObject[] | null) => setDateTo(formatPickerDate(date))}
                    calendar={calendarType === 'hijri' ? arabic : gregorian}
                    locale={calendarType === 'hijri' ? arabic_ar : gregorian_ar}
                    containerClassName="w-full"
                    inputClass="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors cursor-pointer bg-white"
                    placeholder="حدد التاريخ"
                    format={calendarType === 'hijri' ? 'dddd DD MMMM YYYY' : 'dddd YYYY-MM-DD'}
                    portal
                    portalTarget={document.body}
                    editable={false}
                    zIndex={99999}
                 />
               </div>
             </div>
           </div>
        </div>

        {/* Actions Card */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-4">
          <p className="text-base font-black text-slate-700 flex items-center gap-2">
            <Settings size={20} className="text-[#655ac1]" /> الإجراءات
          </p>

        {/* Row 2: Target, Channel, Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Target Role Multi-select Simulation */}
          <div className="relative flex flex-col">
            <SelectDropdown
              value=""
              onChange={toggleRoleSelection}
              placeholder={`المستهدف: ${selectedRoleLabel}`}
              options={[
                { value: 'all', label: 'الكل' },
                { value: 'staff', label: 'المعلمون والإداريون' },
                { value: 'teacher', label: 'المعلمون' },
                { value: 'admin', label: 'الإداريون' },
                { value: 'guardian', label: 'أولياء الأمور' },
              ]}
            />
          </div>

          {/* Channel Filter Container */}
          <div>
            <SelectDropdown
              value={channelFilter}
              onChange={value => setChannelFilter(value as any)}
              placeholder="طريقة الإرسال"
              options={[
                { value: 'all', label: 'طريقة الإرسال: الكل' },
                { value: 'whatsapp', label: 'واتساب' },
                { value: 'sms', label: 'رسالة نصية SMS' },
              ]}
            />
          </div>

          {/* Status Filter */}
          <div>
            <SelectDropdown
              value={statusFilter}
              onChange={value => setStatusFilter(value as any)}
              placeholder="حالة الإرسال"
              options={[
                { value: 'all', label: 'حالة الإرسال: الكل' },
                { value: 'sent', label: 'تم الإرسال' },
                { value: 'failed', label: 'فشل الإرسال' },
              ]}
            />
          </div>
        </div>

           {/* Search + Buttons */}
           <div className="flex flex-col lg:flex-row items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 w-full lg:w-auto">
                 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                   type="text" 
                   placeholder="البحث النصي: (الاسم، محتوى الرسالة، رقم الجوال)..."
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-12 pl-4 text-sm font-medium outline-none shadow-sm focus:border-[#655ac1]"
                 />
              </div>
              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
                  <div className="flex gap-2 shrink-0">
                     <button
                       onClick={() => {
                          const b = selectedBatches.size > 0
                                   ? batchedMessages.filter(b => selectedBatches.has(b.id))
                                   : filteredBatches.slice(0, 50);
                          if (b.length > 0) printMessages(b);
                          else showToast('error', 'الرجاء تحديد رسائل للطباعة أو تطبيق بحث يُظهر نتائج');
                       }}
                       className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-[#8779fb] transition-all text-sm font-bold min-w-[120px]"
                     >
                       <Printer size={20} className="text-slate-500" /> طباعة
                     </button>
                     <button
                       onClick={() => {
                          const b = selectedBatches.size > 0
                                   ? batchedMessages.filter(b => selectedBatches.has(b.id))
                                   : filteredBatches.slice(0, 50);
                          if (b.length > 0) {
                              showToast('info', "سيتم التصدير كملف PDF — اختر 'حفظ بتنسيق PDF' عند ظهور نافذة الطباعة");
                              setTimeout(() => printMessages(b), 800);
                          }
                          else showToast('error', 'الرجاء تحديد رسائل للتصدير أو تطبيق بحث يُظهر نتائج');
                       }}
                       className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-[#8779fb] transition-all text-sm font-bold min-w-[120px]"
                     >
                       <Download size={20} className="text-slate-500" /> تصدير
                     </button>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Archive Table Card */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-800">أرشيف الرسائل</h3>
            <p className="text-xs font-bold text-slate-400 mt-1">{filteredBatches.length} سجل مطابق</p>
          </div>
          <span className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-[#655ac1]">
            {selectedBatches.size} محدد
          </span>
        </div>
      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="w-12 px-4 py-4 text-center">
                 <input 
                   type="checkbox" 
                   checked={selectedBatches.size === filteredBatches.length && filteredBatches.length > 0} 
                   onChange={(e) => {
                      if (e.target.checked) setSelectedBatches(new Set(filteredBatches.map(b => b.id)));
                      else setSelectedBatches(new Set());
                   }}
                   className="rounded text-[#655ac1] focus:ring-[#655ac1]" 
                  />
              </th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1]">اليوم</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1]">التاريخ</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1]">المستلم</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center">العدد</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1]">نص الرسالة</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1]">الطريقة</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1]">رقم الجوال</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center">الحالة</th>
              <th className="px-5 py-4 text-xs font-black text-[#655ac1]">الوقت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBatches.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-0 border-none">
                  <div className="flex flex-col items-center justify-center bg-white py-20 w-full gap-4">
                    <div className="flex flex-col items-center gap-3">
                      <Archive size={48} className="text-[#655ac1]" strokeWidth={1.4} />
                      <div className="text-center">
                        <p className="text-base font-black text-slate-700 mb-1">لا توجد سجلات مطابقة</p>
                        <p className="text-sm text-slate-400 font-medium">جرّب تعديل معايير البحث أو توسيع نطاق التاريخ</p>
                      </div>
                      <button
                        onClick={() => {
                          setDateFrom(''); setDateTo('');
                          setSelectedRoles(['all']); setChannelFilter('all');
                          setStatusFilter('all'); setSearchQuery('');
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 border border-[#655ac1] text-[#655ac1] rounded-xl text-sm font-bold hover:bg-[#f0eeff] transition-colors"
                      >
                        <Search size={16} /> إعادة ضبط البحث
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
                filteredBatches.map(batch => (
                <tr key={batch.id} className="hover:bg-slate-50/70 transition-colors bg-white">
                  <td className="px-4 py-4 text-center align-middle">
                     <input 
                       type="checkbox" 
                       checked={selectedBatches.has(batch.id)}
                       onChange={() => toggleBatchSelection(batch.id)}
                       className="rounded text-[#655ac1] focus:ring-[#655ac1] cursor-pointer"
                     />
                  </td>
                  <td className="px-5 py-4 align-middle text-sm font-black text-slate-700 whitespace-nowrap">{batch.day}</td>
                  <td className="px-5 py-4 align-middle text-slate-600 min-w-[150px]">
                     <div className="text-sm font-black text-slate-800">{batch.dateStr}</div>
                     <div className="mt-1 text-sm font-black text-slate-600">{formatGregorianDate(new Date(batch.timestamp))} م</div>
                  </td>
                  
                  <td className="px-5 py-4 align-middle min-w-[140px] max-w-[160px]">
                     <div className="text-xs font-black text-slate-800 leading-5 line-clamp-2">{recipientSummary(batch)}</div>
                     <div className="text-[11px] bg-slate-50 border border-slate-200 inline-block px-2 py-0.5 rounded-full text-slate-500 mt-1 font-bold">
                        {batch.totalRecipients === 1 ? roleLabels[batch.recipients[0].recipientRole] : 'مجموعة'}
                     </div>
                  </td>
                  
                  <td className="px-5 py-4 align-middle text-center">
                     <div className="flex flex-col items-center gap-1">
                        <span className="font-black text-base text-slate-700">{batch.totalRecipients}</span>
                        {batch.totalRecipients > 1 && (
                            <button 
                               onClick={() => setViewingRecipients(batch.recipients)}
                               className="text-[11px] bg-white border border-slate-200 hover:border-[#655ac1] text-slate-600 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 font-bold"
                            >
                               عرض الكل <Eye size={10} />
                            </button>
                        )}
                     </div>
                  </td>

                  <td className="px-5 py-4 align-middle max-w-[240px]">
                    <div className="flex items-center gap-2">
                      <p className="text-slate-600 line-clamp-1 text-[13px] font-bold leading-relaxed flex-1">{batch.content}</p>
                      <button
                        type="button"
                        onClick={() => setViewingMessage(batch)}
                        className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-[#655ac1] hover:text-[#655ac1] transition-colors"
                        title="الاطلاع على نص الرسالة"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                  
                  <td className="px-5 py-4 align-middle">
                     {renderChannel(batch.channel)}
                  </td>

                  <td className="px-5 py-4 align-middle text-slate-600 font-mono text-[13px] font-bold" dir="ltr">
                     {batch.totalRecipients === 1 ? batch.recipients[0].recipientPhone : 'متعدد'}
                  </td>

                  <td className="px-5 py-4 align-middle text-center">
                    {batch.status === 'sent' && <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-black"><CheckCircle2 size={12}/> ناجح</div>}
                    {batch.status === 'failed' && <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-black"><AlertTriangle size={12}/> فشل</div>}
                    {batch.status === 'partial' && (
                        <div className="flex flex-col gap-1 items-center">
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-black whitespace-nowrap"><AlertTriangle size={12}/> جزئي</div>
                            <span className="text-[9px] text-amber-600">{batch.recipients.filter(r=>r.status === 'failed').length} فشل</span>
                        </div>
                    )}
                  </td>

                  <td className="px-5 py-4 align-middle text-[13px] text-slate-600 font-black" dir="ltr">
                    {batch.timeStr}
                  </td>
                </tr>
              ))
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
                      <button onClick={() => setViewingMessage(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                          <X size={20} className="text-slate-500"/>
                      </button>
                  </div>
                  <div className="p-5 overflow-y-auto custom-scrollbar">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-[15px] font-bold leading-8 text-slate-700 whitespace-pre-wrap shadow-sm">
                        {viewingMessage.content}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                        <span className="rounded-lg bg-white border border-slate-200 px-3 py-1.5">{viewingMessage.day}</span>
                        <span className="rounded-lg bg-white border border-slate-200 px-3 py-1.5">{viewingMessage.dateStr}</span>
                        {renderChannel(viewingMessage.channel)}
                      </div>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* 3. Recipients Popup Modal */}
      {viewingRecipients && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingRecipients(null)}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <h3 className="font-black text-slate-800 flex items-center gap-2">
                          <Users className="text-[#655ac1]" size={20} />
                          قائمة المستلمين ({viewingRecipients.length})
                      </h3>
                      <button onClick={() => setViewingRecipients(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                          <X size={20} className="text-slate-500"/>
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
                                     <div className="text-xs text-slate-500 font-mono mt-1" dir="ltr">{rec.recipientPhone}</div>
                                     <div className="text-[10px] bg-slate-100 inline-block px-2 py-0.5 rounded-md text-slate-600 mt-1">{roleLabels[rec.recipientRole]}</div>
                                 </div>
                                 <div className="text-center">
                                     {rec.status === 'sent' 
                                        ? <span className="inline-block px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg whitespace-nowrap">تم الإرسال</span> 
                                        : <span className="inline-block px-2 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-lg whitespace-nowrap">فشل</span>
                                     }
                                 </div>
                             </div>
                         ))}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default MessageArchive;
