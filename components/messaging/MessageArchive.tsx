import React, { useState, useMemo } from 'react';
import { Search, Filter, RefreshCw, Printer, AlertTriangle, CheckCircle2, FileText, Send, Calendar, Users, Eye, X, Download, Settings } from 'lucide-react';
import { useMessageArchive } from './MessageArchiveContext';
import { CentralMessage, MessageRole, MessageSource } from '../../types';
import DatePicker, { DateObject } from "react-multi-date-picker";
import arabic from "react-date-object/calendars/arabic";
import arabic_ar from "react-date-object/locales/arabic_ar";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";

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
  // Assume hijri calendar configuration based on requirements
  const calendarType = 'hijri';
  
  // Advanced Search State (UI Only)
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['all']);
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'sms'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Applied Filter State (Triggers Table Update)
  const [appliedFilters, setAppliedFilters] = useState({
      dateFrom: '',
      dateTo: '',
      selectedRoles: ['all'],
      channelFilter: 'all' as 'all' | 'whatsapp' | 'sms',
      statusFilter: 'all' as 'all' | 'sent' | 'failed',
      searchQuery: ''
  });

  // Table State
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());
  const [isResending, setIsResending] = useState<string | null>(null);
  const [viewingRecipients, setViewingRecipients] = useState<CentralMessage[] | null>(null);
  const [recipientSearch, setRecipientSearch] = useState('');

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
             dateStr: `${formatHijriDate(date)} هـ`, // Default display, can be both
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
      if (appliedFilters.dateFrom || appliedFilters.dateTo) {
          const bDate = new Date(b.timestamp);
          bDate.setHours(0,0,0,0);
          if (appliedFilters.dateFrom) {
              const fromDate = new Date(appliedFilters.dateFrom);
              fromDate.setHours(0,0,0,0);
              if (bDate < fromDate) return false;
          }
          if (appliedFilters.dateTo) {
              const toDate = new Date(appliedFilters.dateTo);
              toDate.setHours(23,59,59,999);
              if (bDate > toDate) return false;
          }
      }

      // 2. Role Filter (Check if batch contains ANY recipient matching roles)
      if (!appliedFilters.selectedRoles.includes('all')) {
          const hasMatchingRole = b.recipients.some(r => appliedFilters.selectedRoles.includes(r.recipientRole));
          if (!hasMatchingRole) return false;
      }

      // 3. Channel Filter
      if (appliedFilters.channelFilter !== 'all' && b.channel !== appliedFilters.channelFilter) return false;

      // 4. Status Filter (For partial, consider it sent or failed based on strictness, user wants Sent/Failed)
      if (appliedFilters.statusFilter !== 'all') {
          if (appliedFilters.statusFilter === 'sent' && b.status === 'failed') return false; // partial is shown in sent
          if (appliedFilters.statusFilter === 'failed' && b.status === 'sent') return false; // partial is shown in failed
      }

      // 5. Text Search (Search in Sender, Content, Recipient Name, Recipient Phone)
      const q = appliedFilters.searchQuery.toLowerCase();
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
  }, [batchedMessages, appliedFilters]);

  // Apply filters to trigger table re-render
  const handleApplyFilters = () => {
      setAppliedFilters({
          dateFrom,
          dateTo,
          selectedRoles,
          channelFilter,
          statusFilter,
          searchQuery
      });
  };

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
                    ${idx === 0 ? `<td rowspan="${batch.recipients.length}" class="v-align">${batch.senderRole}</td>` : ''}
                    
                    <td><div style="font-weight:bold;">${rec.recipientName}</div><div style="font-size:10px;color:#666;">${roleLabels[rec.recipientRole]}</div></td>
                    <td dir="ltr" style="text-align:right;">${rec.recipientPhone}</td>
                    
                    ${idx === 0 ? `<td rowspan="${batch.recipients.length}" class="v-align" style="font-size:11px; max-width:250px;">${batch.content}</td>` : ''}
                    ${idx === 0 ? `<td rowspan="${batch.recipients.length}" class="v-align">${batch.channel.toUpperCase()}</td>` : ''}
                    
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
                <th>المرسل</th>
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
      if (selectedBatches.size === 0) return alert('الرجاء تحديد رسالة واحدة على الأقل للطباعة المخصصة');
      const batchesToPrint = batchedMessages.filter(b => selectedBatches.has(b.id));
      printMessages(batchesToPrint);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
      
      {/* 1. Advanced Search Card */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4 shrink-0">
        
        {/* Row 1: Date Range */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-2">
           <p className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
             <Calendar size={17} className="text-[#655ac1]" /> تحديد الفترة الزمنية
           </p>
           <div className="flex flex-wrap gap-4">
             <div className="flex-1 min-w-[200px]">
               <label className="text-xs font-bold text-slate-600 mb-1.5 block">من تاريخ</label>
               <div className="relative">
                 <DatePicker 
                    value={dateFrom}
                    onChange={(date: DateObject | DateObject[] | null) => {
                        if (!date) { setDateFrom(''); return; }
                        const d = Array.isArray(date) ? date[0] : date;
                        if (d) setDateFrom(d.convert(gregorian, gregorian_en).format("YYYY-MM-DD"));
                        else setDateFrom('');
                    }}
                    calendar={arabic}
                    locale={arabic_ar}
                    containerClassName="w-full"
                    inputClass="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1] transition-all text-right"
                    placeholder="حدد التاريخ"
                 />
               </div>
             </div>
             <div className="flex-1 min-w-[200px]">
               <label className="text-xs font-bold text-slate-600 mb-1.5 block">إلى تاريخ</label>
               <div className="relative">
                 <DatePicker 
                    value={dateTo}
                    onChange={(date: DateObject | DateObject[] | null) => {
                        if (!date) { setDateTo(''); return; }
                        const d = Array.isArray(date) ? date[0] : date;
                        if (d) setDateTo(d.convert(gregorian, gregorian_en).format("YYYY-MM-DD"));
                        else setDateTo('');
                    }}
                    calendar={arabic}
                    locale={arabic_ar}
                    containerClassName="w-full"
                    inputClass="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1] transition-all text-right"
                    placeholder="حدد التاريخ"
                 />
               </div>
             </div>
           </div>
        </div>

        {/* Row 2: Target, Channel, Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Target Role Multi-select Simulation */}
          <div className="relative flex flex-col">
            <div className="relative">
               <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center pointer-events-none">
                  <Users size={16} className="text-slate-400" />
               </div>
               <select 
                 className="w-full bg-white border border-slate-200 rounded-xl py-3 pr-10 pl-4 text-sm font-medium outline-none shadow-sm focus:border-[#655ac1] appearance-none"
                 onChange={e => toggleRoleSelection(e.target.value)}
                 value=""
               >
                 <option value="" disabled>المستهدف: {selectedRoles.includes('all') ? 'الكل' : selectedRoles.map(r => roleLabels[r as MessageRole] || r).join(', ')}</option>
                 <option value="all">الكل</option>
                 <option value="teacher">المعلمون</option>
                 <option value="admin">الإداريون</option>
                 <option value="guardian">أولياء الأمور</option>
               </select>
            </div>
            <div className="mt-2 inline-flex border border-indigo-100 bg-indigo-50 text-indigo-700 text-[10px] font-bold px-3 py-1.5 rounded-lg w-max shadow-sm items-center gap-1.5">
               <span className="text-sm">💡</span> يمكن اختيار المعلمون والإداريون مع بعضهم
            </div>
          </div>

          {/* Channel Filter Container */}
          <div>
            <select 
               className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium outline-none shadow-sm focus:border-[#655ac1] appearance-none"
               value={channelFilter}
               onChange={e => setChannelFilter(e.target.value as any)}
            >
                <option value="all">طريقة الإرسال: الكل</option>
                <option value="whatsapp">واتساب</option>
                <option value="sms">رسالة نصية SMS</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select 
               className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none shadow-sm focus:border-[#655ac1] appearance-none"
               value={statusFilter}
               onChange={e => setStatusFilter(e.target.value as any)}
            >
                <option value="all">حالة الإرسال: الكل</option>
                <option value="sent">تم الإرسال</option>
                <option value="failed">فشل الإرسال</option>
            </select>
          </div>
        </div>

        {/* Row 4: Actions with Search */}
        <div className="bg-white rounded-[1.5rem] px-5 py-4 shadow-sm border border-slate-100 flex flex-col gap-4 mt-2">
           {/* Top: Label */}
           <p className="text-base font-black text-slate-700 flex items-center gap-2">
             <Settings size={20} className="text-[#655ac1]" /> الإجراءات
           </p>
           {/* Bottom: Search + Buttons */}
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
                 <button 
                   onClick={handleApplyFilters} 
                   className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-[#8779fb] transition-all text-sm font-bold min-w-[120px]"
                 >
                   <Search size={20} className="text-[#655ac1]" /> بحث
                 </button>
                 <div className="flex gap-2 shrink-0">
                     <button 
                       onClick={() => {
                          const b = selectedBatches.size > 0 
                                   ? batchedMessages.filter(b => selectedBatches.has(b.id))
                                   : filteredBatches.slice(0, 50);
                          if (b.length > 0) printMessages(b);
                          else alert('الرجاء تحديد رسائل للطباعة');
                       }} 
                       className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-[#8779fb] transition-all text-sm font-bold min-w-[120px]"
                     >
                       <Printer size={20} className="text-[#655ac1]" /> طباعة
                     </button>
                     <button 
                       onClick={() => {
                          const b = selectedBatches.size > 0 
                                   ? batchedMessages.filter(b => selectedBatches.has(b.id))
                                   : filteredBatches.slice(0, 50);
                          if (b.length > 0) {
                              alert("سيتم التصدير كملف PDF باستخدام متصفحك. الرجاء اختيار 'حفظ بتنسيق PDF' عند ظهور نافذة الطباعة.");
                              printMessages(b);
                          }
                          else alert('الرجاء تحديد رسائل للتصدير');
                       }} 
                       className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-[#8779fb] transition-all text-sm font-bold min-w-[120px]"
                     >
                       <Download size={20} className="text-[#655ac1]" /> تصدير
                     </button>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* 2. Full Data Separation Table */}
      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <table className="w-full text-right text-sm">
          <thead className="bg-[#f8fafc] sticky top-0 z-10 shadow-sm border-b border-slate-200">
            <tr>
              <th className="w-12 px-4 py-3 text-center">
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
              <th className="px-4 py-3 font-bold text-[#475569]">اليوم</th>
              <th className="px-4 py-3 font-bold text-[#475569]">التاريخ</th>
              <th className="px-4 py-3 font-bold text-[#475569]">المرسل</th>
              <th className="px-4 py-3 font-bold text-[#475569]">المستلم</th>
              <th className="px-4 py-3 font-bold text-[#475569] text-center">العدد</th>
              <th className="px-4 py-3 font-bold text-[#475569]">نص الرسالة</th>
              <th className="px-4 py-3 font-bold text-[#475569]">الطريقة</th>
              <th className="px-4 py-3 font-bold text-[#475569]">رقم الجوال</th>
              <th className="px-4 py-3 font-bold text-[#475569] text-center">الحالة</th>
              <th className="px-4 py-3 font-bold text-[#475569]">الوقت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBatches.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-0 border-none">
                  <div className="flex flex-col items-center justify-center bg-white py-20 w-full">
                    <Search size={48} className="text-slate-300 xl:mt-4 mb-4" />
                    <p className="text-lg font-bold text-slate-500">لا توجد سجلات مطابقة</p>
                  </div>
                </td>
              </tr>
            ) : (
                filteredBatches.map(batch => (
                <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors bg-white group">
                  <td className="px-4 py-3 text-center align-middle">
                     <input 
                       type="checkbox" 
                       checked={selectedBatches.has(batch.id)}
                       onChange={() => toggleBatchSelection(batch.id)}
                       className="rounded text-[#655ac1] focus:ring-[#655ac1] cursor-pointer"
                     />
                  </td>
                  <td className="px-4 py-3 align-middle font-bold text-slate-700">{batch.day}</td>
                  <td className="px-4 py-3 align-middle text-slate-600">
                     <div>{batch.dateStr}</div>
                     <div className="text-[10px] text-slate-400">{formatGregorianDate(new Date(batch.timestamp))}</div>
                  </td>
                  <td className="px-4 py-3 align-middle text-indigo-700 font-bold bg-indigo-50/30 text-xs rounded">{batch.senderRole}</td>
                  
                  <td className="px-4 py-3 align-middle">
                     {batch.totalRecipients === 1 ? (
                         <div className="font-bold text-slate-800">{batch.recipients[0].recipientName}</div>
                     ) : (
                         <div className="font-bold text-slate-800">عدة مستلمين</div>
                     )}
                     <div className="text-[10px] bg-slate-100 inline-block px-2 py-0.5 rounded-full text-slate-600 mt-1">
                        {batch.totalRecipients === 1 ? roleLabels[batch.recipients[0].recipientRole] : 'مجموعة'}
                     </div>
                  </td>
                  
                  <td className="px-4 py-3 align-middle text-center">
                     <div className="flex flex-col items-center gap-1">
                        <span className="font-black text-lg text-slate-700">{batch.totalRecipients}</span>
                        {batch.totalRecipients > 1 && (
                            <button 
                               onClick={() => setViewingRecipients(batch.recipients)}
                               className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 font-bold"
                            >
                               عرض الكل <Eye size={10} />
                            </button>
                        )}
                     </div>
                  </td>

                  <td className="px-4 py-3 align-middle max-w-[200px]">
                    <p className="text-slate-600 line-clamp-2 text-xs leading-relaxed group-hover:line-clamp-none transition-all">{batch.content}</p>
                  </td>
                  
                  <td className="px-4 py-3 align-middle">
                     <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold text-center ${batch.channel === 'whatsapp' ? 'bg-[#dcf8c6] text-[#075e54]' : 'bg-indigo-100 text-[#655ac1]'}`}>
                        {batch.channel.toUpperCase()}
                     </span>
                  </td>

                  <td className="px-4 py-3 align-middle text-slate-600 font-mono text-xs" dir="ltr">
                     {batch.totalRecipients === 1 ? batch.recipients[0].recipientPhone : 'متعدد'}
                  </td>

                  <td className="px-4 py-3 align-middle text-center">
                    {batch.status === 'sent' && <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold"><CheckCircle2 size={12}/> ناجح</div>}
                    {batch.status === 'failed' && <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold"><AlertTriangle size={12}/> فشل</div>}
                    {batch.status === 'partial' && (
                        <div className="flex flex-col gap-1 items-center">
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold whitespace-nowrap"><AlertTriangle size={12}/> جزئي</div>
                            <span className="text-[9px] text-amber-600">{batch.recipients.filter(r=>r.status === 'failed').length} فشل</span>
                        </div>
                    )}
                  </td>

                  <td className="px-4 py-3 align-middle text-xs text-slate-500 font-bold" dir="ltr">
                    {batch.timeStr}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
