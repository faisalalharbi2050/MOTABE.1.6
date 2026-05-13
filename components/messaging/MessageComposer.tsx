import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Send, Users, AlertCircle, AlertTriangle, Paperclip, CheckCircle2, Check,
  MessageSquare, Plus, Search, X, ChevronDown, ChevronLeft,
  Clock, Eye, Wallet, CalendarClock
} from 'lucide-react';
import { SchoolInfo, Teacher, Admin, Student, ClassInfo, Specialization, SubscriptionInfo, MessageComposerDraft, MessageSource } from '../../types';
import { useMessageArchive } from './MessageArchiveContext';
import DatePicker, { DateObject } from "react-multi-date-picker";
import arabic from "react-date-object/calendars/arabic";
import arabic_ar from "react-date-object/locales/arabic_ar";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_ar from "react-date-object/locales/gregorian_ar";

interface MessageComposerProps {
  schoolInfo: SchoolInfo;
  teachers: Teacher[];
  admins: Admin[];
  students: Student[];
  classes: ClassInfo[];
  specializations: Specialization[];
  subscription: SubscriptionInfo;
  setSubscription: React.Dispatch<React.SetStateAction<SubscriptionInfo>>;
  initialDraft?: MessageComposerDraft | null;
}

type GroupType = 'none' | 'teachers' | 'admins' | 'staff' | 'parents';
type CalendarType = 'hijri' | 'gregorian';

// SMS character limit
const SMS_LIMIT = 160;

type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const useDropdownPosition = (open: boolean, onClose: () => void) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 });

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
      const inButton = triggerRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inButton && !inPanel) onClose();
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  return { triggerRef, panelRef, position };
};

const RecipientSelectDropdown: React.FC<{
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}> = ({ value, options, placeholder, onChange, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const { triggerRef, panelRef, position } = useDropdownPosition(open, () => setOpen(false));
  const selected = options.find(option => option.value === value);

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  return (
    <div className="w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(current => !current)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
                disabled={option.disabled}
                onClick={() => { if (option.disabled) return; onChange(option.value); setOpen(false); }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                  option.disabled ? 'text-slate-300 cursor-not-allowed bg-slate-50/70' :
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

const MessageComposer: React.FC<MessageComposerProps> = ({
  schoolInfo, teachers, admins, students, classes, specializations, subscription, setSubscription, initialDraft
}) => {
  const { sendMessage, scheduleMessage, templates, stats } = useMessageArchive();
  const applyingDraftRef = useRef(false);
  const appliedDraftIdRef = useRef<string | null>(null);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Form State
  const [selectedGroup, setSelectedGroup] = useState<GroupType>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecId, setSelectedSpecId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Selections
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  // Message Content & Settings
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [messageContent, setMessageContent] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [fallbackToSms, setFallbackToSms] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<DateObject | null>(null);
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [scheduleCalendarType, setScheduleCalendarType] = useState<CalendarType>('hijri');
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [draftMeta, setDraftMeta] = useState<{ source?: MessageSource; senderRole?: string; title?: string; linksByRecipientId?: Record<string, string>; previewUrlByRecipientId?: Record<string, string> } | null>(null);

  // Auto-select staff when 'staff' group is chosen
  useEffect(() => {
    if (applyingDraftRef.current) {
      applyingDraftRef.current = false;
      return;
    }
    if (selectedGroup === 'staff') {
      setSelectedIds(new Set([...teachers.map(t => t.id), ...admins.map(a => a.id)]));
    } else {
      setSelectedIds(new Set());
    }
    setSearchQuery('');
  }, [selectedGroup]);

  useEffect(() => {
    if (!initialDraft || appliedDraftIdRef.current === initialDraft.id) return;

    applyingDraftRef.current = true;
    appliedDraftIdRef.current = initialDraft.id;
    setDraftMeta({
      source: initialDraft.source,
      senderRole: initialDraft.senderRole,
      title: initialDraft.title,
      linksByRecipientId: initialDraft.linksByRecipientId,
      previewUrlByRecipientId: initialDraft.previewUrlByRecipientId,
    });
    setSelectedGroup(initialDraft.group);
    setSelectedIds(new Set(initialDraft.recipients.map(recipient => recipient.id)));
    const onlyRecipientId = initialDraft.recipients.length === 1 ? initialDraft.recipients[0]?.id : '';
    const onlyRecipientLinks = onlyRecipientId ? initialDraft.linksByRecipientId?.[onlyRecipientId] : '';
    setMessageContent(
      onlyRecipientLinks
        ? initialDraft.content
            .replace(/{رابط_الجدول}/g, onlyRecipientLinks)
            .replace(/{روابط_الجداول}/g, onlyRecipientLinks)
        : initialDraft.content
    );
    setChannel(initialDraft.channel);
    setSelectedTemplate('');
    setSearchQuery('');
    setSelectedSpecId('all');
    setSelectedClassId('all');
    setAttachment(null);
    setIsScheduled(false);
    setScheduleDate(null);
    setScheduleTime('08:00');
    showToast('تم تجهيز مسودة رسالة الجدول ويمكنك تعديلها قبل الإرسال.', 'success');
  }, [initialDraft]);

  // Derived Data
  const activeSpecs = useMemo(() => {
    const specIds = new Set(teachers.map(t => t.specializationId));
    return specializations.filter(s => specIds.has(s.id));
  }, [teachers, specializations]);

  const activeClasses = useMemo(() => {
    const classIds = new Set(students.map(s => s.classId));
    return classes.filter(c => classIds.has(c.id));
  }, [students, classes]);

  const displayItems = useMemo(() => {
    type Item = { id: string; name: string; subtitle?: string; role: 'teacher' | 'admin' | 'student' | 'guardian'; phone: string; classId?: string };
    const items: Item[] = [];
    const q = searchQuery.toLowerCase();

    if (selectedGroup === 'teachers' || selectedGroup === 'staff') {
      let filtered = teachers;
      if (selectedGroup === 'teachers' && selectedSpecId !== 'all')
        filtered = filtered.filter(t => t.specializationId === selectedSpecId);
      if (q) filtered = filtered.filter(t => t.name.toLowerCase().includes(q));
      items.push(...filtered.map(t => ({ id: t.id, name: t.name, subtitle: 'معلم', role: 'teacher' as const, phone: t.phone || '' })));
    }

    if (selectedGroup === 'admins' || selectedGroup === 'staff') {
      let filtered = admins;
      if (q) filtered = filtered.filter(a => a.name.toLowerCase().includes(q));
      items.push(...filtered.map(a => ({ id: a.id, name: a.name, subtitle: 'إداري', role: 'admin' as const, phone: a.phone || '' })));
    }

    if (selectedGroup === 'parents') {
      let filtered = students;
      if (selectedClassId !== 'all') filtered = filtered.filter(s => s.classId === selectedClassId);
      if (q) filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
      items.push(...filtered.map(s => ({ id: s.id, name: s.name, subtitle: 'ولي أمر', role: 'guardian' as const, phone: s.parentPhone || '', classId: s.classId })));
    }

    return items;
  }, [selectedGroup, teachers, admins, students, searchQuery, selectedSpecId, selectedClassId]);

  // Selection Handlers
  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    const next = new Set(selectedIds);
    displayItems.forEach(item => next.add(item.id));
    setSelectedIds(next);
  };

  const deselectAll = () => {
    const next = new Set(selectedIds);
    displayItems.forEach(item => next.delete(item.id));
    setSelectedIds(next);
  };

  const toggleClassSelection = (classId: string) => {
    const classStudents = displayItems.filter(item => item.classId === classId);
    const allSelected = classStudents.every(s => selectedIds.has(s.id));
    const next = new Set(selectedIds);
    if (allSelected) classStudents.forEach(s => next.delete(s.id));
    else classStudents.forEach(s => next.add(s.id));
    setSelectedIds(next);
  };

  const toggleClassExpand = (classId: string) => {
    const next = new Set(expandedClasses);
    if (next.has(classId)) next.delete(classId); else next.add(classId);
    setExpandedClasses(next);
  };

  // Final Recipients (must have a phone number)
  const recipientsToSend = useMemo(
    () => displayItems.filter(item => selectedIds.has(item.id) && item.phone),
    [displayItems, selectedIds]
  );

  // ── Balance ──────────────────────────────────────────────────────────────
  const freeBalance = channel === 'whatsapp' ? subscription.freeWaRemaining : subscription.freeSmsRemaining;
  const paidBalance = channel === 'whatsapp' ? stats.balanceWhatsApp : stats.balanceSMS;
  const totalBalance = freeBalance + paidBalance;
  const hasEnoughBalance = totalBalance >= recipientsToSend.length;

  // ── SMS character counter ────────────────────────────────────────────────
  const charCount = messageContent.length;
  const smsPages = Math.ceil(charCount / SMS_LIMIT) || 1;

  // ── Live preview ─────────────────────────────────────────────────────────
  const today = useMemo(() => new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date()), []);
  const dateFormatted = useMemo(() => new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()), []);
  const previewRecipientId = recipientsToSend[0]?.id || '';
  const previewScheduleLinks = draftMeta?.linksByRecipientId?.[previewRecipientId] || '';
  const previewScheduleUrl = draftMeta?.previewUrlByRecipientId?.[previewRecipientId] || previewScheduleLinks;

  const previewContent = useMemo(() => {
    const sample = recipientsToSend[0]?.name || 'اسم المستلم';
    return messageContent
      .replace(/{اسم_الطالب}/g, sample)
      .replace(/{اسم_المعلم}/g, sample)
      .replace(/{اسم_الإداري}/g, sample)
      .replace(/{اسم_المستلم}/g, sample)
      .replace(/{اليوم}/g, today)
      .replace(/{التاريخ}/g, dateFormatted)
      .replace(/{اسم_المدرسة}/g, schoolInfo?.schoolName || 'اسم المدرسة')
      .replace(/{رابط_الجدول}/g, previewScheduleLinks || 'رابط الجدول')
      .replace(/{روابط_الجداول}/g, previewScheduleLinks || 'روابط الجداول');
  }, [messageContent, recipientsToSend, today, dateFormatted, schoolInfo, previewScheduleLinks]);

  // ── Template handler ─────────────────────────────────────────────────────
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (!templateId) return;
    const template = templates.find(temp => temp.id === templateId);
    if (template) setMessageContent(template.content);
  };

  const insertVariable = (variable: string) => {
    setMessageContent(prev => prev + `{${variable}}`);
  };

  // ── Build scheduled ISO timestamp ────────────────────────────────────────
  const buildScheduledTimestamp = (): string | null => {
    if (!scheduleDate || !scheduleTime) return null;
    try {
      const gregorianDate = scheduleDate.toDate();
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      gregorianDate.setHours(hours, minutes, 0, 0);
      return gregorianDate.toISOString();
    } catch {
      return null;
    }
  };

  // ── Main Send/Schedule handler ───────────────────────────────────────────
  const handleSend = async () => {
    if (recipientsToSend.length === 0) return showToast('يرجى اختيار مستلمين للرسالة', 'warning');
    if (!messageContent.trim()) return showToast('نص الرسالة فارغ', 'warning');

    if (isScheduled) {
      const scheduledTimestamp = buildScheduledTimestamp();
      if (!scheduledTimestamp) return showToast('يرجى تحديد تاريخ ووقت الإرسال', 'warning');
      if (new Date(scheduledTimestamp) <= new Date()) return showToast('يجب أن يكون وقت الجدولة في المستقبل', 'warning');
    }

    const count = recipientsToSend.length;
    if (!isScheduled) {
      if (channel === 'sms' && subscription.freeSmsRemaining < count && subscription.remainingMessages < count)
        return showToast('رصيدك غير كافٍ لإرسال هذه الرسائل.', 'error');
      if (channel === 'whatsapp' && subscription.freeWaRemaining < count && subscription.remainingMessages < count)
        return showToast('رصيدك غير كافٍ لإرسال هذه الرسائل.', 'error');
    }

    // Build object URL once (will be revoked after use)
    const attachmentUrl = attachment ? URL.createObjectURL(attachment) : null;
    const attachments = attachmentUrl ? [{ name: attachment!.name, url: attachmentUrl, type: attachment!.type }] : [];

    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Personalise message for each recipient
    const messagesToProcess = recipientsToSend.map(rec => {
      const scheduleLinks = draftMeta?.linksByRecipientId?.[rec.id] || '';
      const scheduleAttachments = scheduleLinks
        ? scheduleLinks
            .split('\n')
            .map((line, index) => {
              const trimmed = line.trim();
              const separatorIndex = trimmed.lastIndexOf(': ');
              const hasLabel = separatorIndex > -1 && /^https?:\/\//.test(trimmed.slice(separatorIndex + 2));
              return {
                name: hasLabel ? trimmed.slice(0, separatorIndex) : (draftMeta?.title || `رابط الجدول ${index + 1}`),
                url: hasLabel ? trimmed.slice(separatorIndex + 2) : trimmed,
                type: 'schedule-share-link',
              };
            })
            .filter(item => item.url)
        : [];
      const messageAttachments = [
        ...scheduleAttachments,
        ...(channel === 'whatsapp' ? attachments : []),
      ];
      let personalizedContent = messageContent
        .replace(/{اسم_الطالب}/g, rec.name)
        .replace(/{اسم_المعلم}/g, rec.name)
        .replace(/{اسم_الإداري}/g, rec.name)
        .replace(/{اسم_المستلم}/g, rec.name)
        .replace(/{اليوم}/g, today)
        .replace(/{التاريخ}/g, dateFormatted)
        .replace(/{اسم_المدرسة}/g, schoolInfo?.schoolName || '')
        .replace(/{رابط_الجدول}/g, draftMeta?.linksByRecipientId?.[rec.id] || '')
        .replace(/{روابط_الجداول}/g, draftMeta?.linksByRecipientId?.[rec.id] || '');

      if (channel === 'sms' && attachment)
        personalizedContent += `\nالمرفق: http://t.ly/mock_link`;

      return {
        batchId,
        senderRole: draftMeta?.senderRole || 'مدير النظام',
        source: draftMeta?.source || 'general' as const,
        recipientId: rec.id,
        recipientName: rec.name,
        recipientPhone: rec.phone,
        recipientRole: rec.role,
        content: personalizedContent,
        channel,
        attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
        isScheduled,
        scheduledFor: isScheduled ? (buildScheduledTimestamp() ?? undefined) : undefined,
      };
    });

    // ── Scheduled path ───────────────────────────────────────────────────
    if (isScheduled) {
      const scheduledTimestamp = buildScheduledTimestamp()!;
      scheduleMessage({ scheduledFor: scheduledTimestamp, fallbackToSms, messages: messagesToProcess });

      if (attachmentUrl) URL.revokeObjectURL(attachmentUrl);
      showToast(`تمت جدولة ${count} رسالة بنجاح`, 'success');

      // Reset form
      setMessageContent('');
      setSelectedIds(new Set());
      setSelectedGroup('none');
      setAttachment(null);
      setIsScheduled(false);
      setScheduleDate(null);
      setScheduleTime('08:00');
      return;
    }

    // ── Immediate send path ──────────────────────────────────────────────
    setIsSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const msg of messagesToProcess) {
      try {
        await sendMessage(msg, fallbackToSms);
        successCount++;
      } catch {
        failCount++;
      }
    }

    // Revoke object URL now that all messages are processed
    if (attachmentUrl) URL.revokeObjectURL(attachmentUrl);

    // Update subscription balance
    if (successCount > 0) {
      setSubscription((prev: SubscriptionInfo) => {
        let newSmsFree = prev.freeSmsRemaining;
        let newWaFree = prev.freeWaRemaining;
        let newTotalPaid = prev.remainingMessages;

        const oldSmsPercent = ((10 - prev.freeSmsRemaining) / 10) * 100;
        const oldWaPercent = ((50 - prev.freeWaRemaining) / 50) * 100;

        if (channel === 'sms') {
          if (newSmsFree >= successCount) { newSmsFree -= successCount; }
          else { newTotalPaid -= (successCount - newSmsFree); newSmsFree = 0; }
        } else {
          if (newWaFree >= successCount) { newWaFree -= successCount; }
          else { newTotalPaid -= (successCount - newWaFree); newWaFree = 0; }
        }

        const newSmsPercent = ((10 - newSmsFree) / 10) * 100;
        const newWaPercent = ((50 - newWaFree) / 50) * 100;

        let alert = '';
        if (channel === 'sms') {
          if (newSmsPercent >= 100 && oldSmsPercent < 100) alert = 'تنبيه: استهلكت 100% من رصيد رسائل SMS المجانية!';
          else if (newSmsPercent >= 75 && oldSmsPercent < 75) alert = 'تنبيه: استهلكت 75% من رصيد رسائل SMS المجانية!';
          else if (newSmsPercent >= 50 && oldSmsPercent < 50) alert = 'تنبيه: استهلكت 50% من رصيد رسائل SMS المجانية!';
        } else {
          if (newWaPercent >= 100 && oldWaPercent < 100) alert = 'تنبيه: استهلكت 100% من رصيد رسائل الواتساب المجانية!';
          else if (newWaPercent >= 75 && oldWaPercent < 75) alert = 'تنبيه: استهلكت 75% من رصيد رسائل الواتساب المجانية!';
          else if (newWaPercent >= 50 && oldWaPercent < 50) alert = 'تنبيه: استهلكت 50% من رصيد رسائل الواتساب المجانية!';
        }
        if (alert) setTimeout(() => showToast(alert, 'warning'), 1500);

        return { ...prev, freeSmsRemaining: newSmsFree, freeWaRemaining: newWaFree, remainingMessages: newTotalPaid };
      });
    }

    setIsSending(false);
    setMessageContent('');
    setSelectedIds(new Set());
    setSelectedGroup('none');
    setAttachment(null);

    if (failCount === 0) showToast(`تم إرسال ${successCount} رسالة بنجاح.`);
    else showToast(`تم إرسال ${successCount} رسالة. فشل ${failCount} رسالة. يرجى مراجعة الأرشيف.`, 'error');
  };

  // ── Render recipient list ─────────────────────────────────────────────────
  const renderRecipientList = () => {
    if (selectedGroup === 'none') {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-slate-400">
          <Users size={48} className="mb-4 opacity-50" />
          <p>الرجاء اختيار مجموعة مستلمين للبدء</p>
        </div>
      );
    }

    if (selectedGroup === 'parents') {
      const parentsByClass = displayItems.reduce((acc, item) => {
        const cId = item.classId || 'unknown';
        if (!acc[cId]) acc[cId] = [];
        acc[cId].push(item);
        return acc;
      }, {} as Record<string, typeof displayItems>);

      return Object.entries(parentsByClass).map(([classId, items]) => {
        const classObj = activeClasses.find(c => c.id === classId);
        const className = classObj ? (classObj.name || `${classObj.grade}/${classObj.section}`) : 'غير محدد';
        const isExpanded = expandedClasses.has(classId);
        const allSelected = items.every(s => selectedIds.has(s.id));
        const someSelected = items.some(s => selectedIds.has(s.id));

        return (
          <div key={classId} className="border border-slate-200 rounded-2xl overflow-hidden mb-3 bg-white shadow-sm">
            <div className="bg-white p-3 flex items-center justify-between cursor-pointer group hover:bg-[#f0edff] transition-colors" onClick={() => toggleClassExpand(classId)}>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleClassSelection(classId); }}
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                    allSelected || someSelected ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent group-hover:border-[#655ac1]'
                  }`}
                >
                  <Check size={12} strokeWidth={3} className={someSelected && !allSelected ? 'opacity-50' : ''} />
                </button>
                <span className={`font-bold select-none ${allSelected || someSelected ? 'text-[#655ac1]' : 'text-slate-700'}`}>فصل {className}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
                  {items.filter(i => selectedIds.has(i.id)).length} / {items.length}
                </span>
                {isExpanded ? <ChevronDown size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors" /> : <ChevronLeft size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />}
              </div>
            </div>
            {isExpanded && (
              <div className="p-2 space-y-1 bg-white border-t border-slate-100">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer rounded-xl transition-all select-none group ${
                      selectedIds.has(item.id) ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                    }`}
                    onClick={() => toggleSelection(item.id)}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-bold">{item.name}</div>
                      {item.phone
                        ? <div className="text-xs text-slate-500 font-mono" dir="ltr">{item.phone}</div>
                        : <div className="text-xs text-rose-500">لا يوجد رقم</div>}
                    </div>
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                      selectedIds.has(item.id) ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent group-hover:border-[#655ac1]'
                    }`}>
                      <Check size={12} strokeWidth={3} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      });
    }

    return (
      <div className="space-y-1">
        {displayItems.map(item => (
          <div
            key={item.id}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer rounded-xl transition-all select-none group ${
              selectedIds.has(item.id) ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
            }`}
            onClick={() => toggleSelection(item.id)}
          >
            <div className="flex-1">
              <div className="text-sm font-bold">{item.name}</div>
              <div className="flex gap-3 mt-1">
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">{item.subtitle}</span>
                {item.phone
                  ? <span className="text-xs text-slate-500 font-mono" dir="ltr">{item.phone}</span>
                  : <span className="text-xs text-rose-500">جوال مفقود</span>}
              </div>
            </div>
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
              selectedIds.has(item.id) ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent group-hover:border-[#655ac1]'
            }`}>
              <Check size={12} strokeWidth={3} />
            </span>
          </div>
        ))}
        {displayItems.length === 0 && (
          <div className="flex justify-center p-8 text-slate-400 font-medium text-sm">لا توجد نتائج مطابقة</div>
        )}
      </div>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      {/* ══ Right Column: Recipients ══ */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col z-0">
        <h3 className="text-lg font-black shrink-0 text-[#1e293b] mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-[#655ac1]" size={20} />
            اختر المستلمين
          </div>
          {recipientsToSend.length > 0 && (
            <span className={`text-sm px-3 py-1 rounded-xl shadow-sm border font-bold ${hasEnoughBalance ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
              {recipientsToSend.length} محدد
            </span>
          )}
        </h3>

        <div className="space-y-4 mb-6 shrink-0">
          <RecipientSelectDropdown
            value={selectedGroup}
            onChange={value => setSelectedGroup(value as GroupType)}
            placeholder="-- اختر الفئة المستهدفة --"
            options={[
              { value: 'none', label: '-- اختر الفئة المستهدفة --' },
              { value: 'teachers', label: 'المعلمون' },
              { value: 'admins', label: 'الإداريون' },
              { value: 'staff', label: 'معلمون وإداريون' },
              { value: 'parents', label: 'أولياء الأمور' },
            ]}
          />

          {selectedGroup !== 'none' && (
            <div className="flex gap-2 relative">
              <Search className="absolute right-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="بحث بالاسم..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 border-2 border-slate-200 rounded-xl pr-10 pl-4 py-2.5 outline-none focus:border-[#655ac1]/50 hover:bg-slate-50 text-sm font-bold text-slate-600 transition-all"
              />
            </div>
          )}

          {selectedGroup === 'teachers' && (
            <RecipientSelectDropdown
              value={selectedSpecId}
              onChange={setSelectedSpecId}
              placeholder="كل التخصصات"
              options={[
                { value: 'all', label: 'كل التخصصات' },
                ...activeSpecs.map(s => ({ value: s.id, label: s.name })),
              ]}
            />
          )}

          {selectedGroup === 'parents' && (
            <RecipientSelectDropdown
              value={selectedClassId}
              onChange={setSelectedClassId}
              placeholder="كل الفصول"
              options={[
                { value: 'all', label: 'كل الفصول' },
                ...activeClasses.map(c => ({ value: c.id, label: c.name || `${c.grade}/${c.section}` })),
              ]}
            />
          )}
        </div>

        <div className="flex gap-2 mb-4 border-b border-slate-100 pb-4 shrink-0">
          <button onClick={selectAll} disabled={selectedGroup === 'none'} className="text-xs font-bold text-[#655ac1] bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors">تحديد الكل</button>
          <button onClick={deselectAll} disabled={selectedGroup === 'none'} className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors">إلغاء التحديد</button>
        </div>

        <div className="overflow-y-auto max-h-[500px] min-h-[150px] custom-scrollbar pr-2 -mr-2">
          {renderRecipientList()}
        </div>
      </div>

      {/* ══ Left Column: Settings + Composer ══ */}
      <div className="space-y-6">

        {/* ── Channel Settings Card ── */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-black text-[#1e293b] flex items-center gap-2 mb-4">
            <Wallet className="text-[#655ac1]" size={20} />
            اختر طريقة الإرسال المفضلة
          </h3>

          {/* Channel Buttons */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setChannel('whatsapp')}
              className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${channel === 'whatsapp' ? 'border-[#25D366] bg-white shadow-sm' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill={channel === 'whatsapp' ? "#25D366" : "#cbd5e1"} xmlns="http://www.w3.org/2000/svg" className="mb-2">
                <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd" />
              </svg>
              <span className={`font-black ${channel === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-400'}`}>واتساب</span>
            </button>

            <button
              onClick={() => setChannel('sms')}
              className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${channel === 'sms' ? 'border-[#007AFF] bg-white shadow-sm' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <MessageSquare size={28} className={`mb-2 ${channel === 'sms' ? 'text-[#007AFF]' : 'text-slate-300'}`} />
              <span className={`font-black ${channel === 'sms' ? 'text-[#007AFF]' : 'text-slate-400'}`}>النصية SMS</span>
            </button>
          </div>

          {/* Balance indicator */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 mb-0.5">مجاني</p>
              <p className={`font-black text-sm ${freeBalance === 0 ? 'text-rose-500' : 'text-slate-700'}`}>{freeBalance}</p>
            </div>
            <div className="text-center border-x border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 mb-0.5">مدفوع</p>
              <p className={`font-black text-sm ${paidBalance === 0 ? 'text-rose-500' : 'text-slate-700'}`}>{paidBalance}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 mb-0.5">الإجمالي</p>
              <p className={`font-black text-sm ${hasEnoughBalance ? 'text-emerald-600' : 'text-rose-600'}`}>{totalBalance}</p>
            </div>
          </div>

          {/* Insufficient balance warning */}
          {recipientsToSend.length > 0 && !hasEnoughBalance && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl mb-4 text-rose-700 text-xs font-bold">
              <AlertCircle size={14} />
              الرصيد غير كافٍ — تحتاج {recipientsToSend.length} رسالة ولديك {totalBalance}
            </div>
          )}

          <div className="space-y-4">
            {/* Fallback toggle — only for WhatsApp */}
            {channel === 'whatsapp' && (
              <label className="relative flex items-center gap-3 p-3 border-2 border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={fallbackToSms}
                  onChange={(e) => {
                    setFallbackToSms(e.target.checked);
                    if (e.target.checked)
                      showToast('تم تفعيل الإرسال الاحتياطي عبر الرسائل النصية', 'success');
                  }}
                />
                {/* RTL toggle: dot goes RIGHT when ON */}
                <div className={`relative flex items-center w-12 h-6 shrink-0 rounded-full transition-colors ${fallbackToSms ? 'bg-[#655ac1]' : 'bg-slate-200'}`}>
                  <div className={`absolute w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${fallbackToSms ? 'right-1' : 'left-1'}`} />
                </div>
                <span className="text-sm font-bold text-slate-700 select-none">
                  في حال فشل الواتساب يتم الإرسال عبر الرسائل النصية تلقائياً
                </span>
              </label>
            )}

            {/* Attachment — WhatsApp only */}
            {channel === 'whatsapp' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">المرفقات</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors relative">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && setAttachment(e.target.files[0])} />
                  <Paperclip className="mx-auto text-slate-400 mb-2" size={24} />
                  <span className="text-sm font-semibold text-slate-600">
                    {attachment ? attachment.name : 'اسحب أو انقر لإضافة ملف (PDF/صور)'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Message Composer Card ── */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-lg font-black text-[#1e293b] flex items-center gap-2">
              <MessageSquare className="text-[#655ac1]" size={20} />
              نص الرسالة
            </h3>
            <div className="w-full sm:w-64">
            <RecipientSelectDropdown
              value={selectedTemplate}
              onChange={handleTemplateSelect}
              placeholder="استخدام قالب جاهز"
              options={[
                { value: '', label: 'استخدام قالب جاهز' },
                ...templates.map(t => ({ value: t.id, label: t.title })),
              ]}
            />
            </div>
          </div>

          {/* Variable chips */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 mb-2">إضافة متغيرات تلقائية:</label>
            <div className="flex gap-2 flex-wrap">
              {['اسم_الطالب', 'اسم_المعلم', 'اسم_الإداري', 'اليوم', 'التاريخ', 'اسم_المدرسة'].map(variable => (
                <button
                  key={variable}
                  onClick={() => insertVariable(variable)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:border-[#655ac1] hover:text-[#655ac1] transition-colors flex items-center gap-1"
                >
                  <Plus size={12} className="text-[#655ac1]" /> {variable.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            className="w-full h-40 border-2 border-slate-100 rounded-xl p-4 outline-none focus:border-[#655ac1] resize-none text-sm leading-relaxed"
            placeholder="اكتب نص الرسالة هنا..."
            dir="rtl"
          />

          {draftMeta?.linksByRecipientId && recipientsToSend.length > 0 && (
            <div className="mt-3 rounded-2xl border border-[#e5e1fe] bg-[#f8f7ff] p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-black text-[#655ac1] mb-1">الرابط الفعلي في المعاينة</p>
                  <p className="text-[11px] font-bold text-slate-500">
                    يتم عرض رابط {recipientsToSend[0]?.name || 'أول مستلم'} هنا، وعند الإرسال يستلم كل شخص رابطه الصحيح.
                  </p>
                </div>
                {previewScheduleLinks && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => window.open(previewScheduleUrl, '_blank')}
                      className="px-3 py-2 rounded-xl bg-[#655ac1] text-white text-xs font-black"
                    >
                      فتح النموذج
                    </button>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(previewScheduleUrl).then(() => showToast('تم نسخ رابط المعاينة', 'success'))}
                      className="px-3 py-2 rounded-xl bg-white border border-[#d9d2ff] text-[#655ac1] text-xs font-black"
                    >
                      نسخ الرابط
                    </button>
                  </div>
                )}
              </div>
              <div dir="ltr" className="mt-3 rounded-xl border border-[#d9d2ff] bg-white px-3 py-2 text-xs font-mono text-slate-600 whitespace-pre-wrap break-all">
                {previewScheduleLinks || 'لم يتم العثور على رابط لهذا المستلم.'}
              </div>
            </div>
          )}

          {/* SMS character counter */}
          {channel === 'sms' && messageContent.length > 0 && (
            <div className={`flex justify-between items-center mt-1 text-xs font-bold ${charCount > SMS_LIMIT ? 'text-rose-500' : 'text-slate-400'}`} dir="ltr">
              <span>{charCount > SMS_LIMIT ? `${smsPages} رسائل SMS` : ''}</span>
              <span>{charCount} / {SMS_LIMIT}</span>
            </div>
          )}

          {/* Live preview */}
          {messageContent.trim() && (
            <div className="mt-4">
              <button
                onClick={() => setShowPreview(v => !v)}
                className="flex items-center gap-2 text-xs font-bold text-[#655ac1] hover:text-[#4e42a8] transition-colors mb-2"
              >
                <Eye size={14} />
                {showPreview ? 'إخفاء المعاينة' : 'معاينة الرسالة'}
              </button>
              {showPreview && (
                <div className="p-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl">
                  <p className="text-[10px] font-bold text-emerald-600 mb-2">
                    معاينة — {recipientsToSend[0]?.name ?? 'مستلم تجريبي'}
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{previewContent}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100">
            {/* Scheduling toggle */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock size={16} className="text-[#655ac1]" />
                  <span className="text-sm font-black text-slate-700">جدولة الإرسال لوقت لاحق</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScheduled(current => !current)}
                  className={`relative inline-flex w-10 h-6 rounded-full transition-all ${isScheduled ? 'bg-[#655ac1]' : 'bg-slate-300'}`}
                  role="switch"
                  aria-checked={isScheduled}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isScheduled ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

            {/* Scheduling date + time */}
            {isScheduled && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[30px]">
                    <label className="text-xs font-black text-slate-500">التاريخ</label>
                    <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5">
                      {[
                        { value: 'hijri', label: 'هجري' },
                        { value: 'gregorian', label: 'ميلادي' },
                      ].map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setScheduleCalendarType(option.value as CalendarType)}
                          className={`px-2 py-1 rounded-md text-[10px] font-black transition-all ${
                            scheduleCalendarType === option.value ? 'bg-[#655ac1] text-white' : 'text-slate-500 hover:text-[#655ac1]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <DatePicker
                    value={scheduleDate ? new DateObject(scheduleDate).convert(scheduleCalendarType === 'hijri' ? arabic : gregorian) : null}
                    onChange={setScheduleDate}
                    calendar={scheduleCalendarType === 'hijri' ? arabic : gregorian}
                    locale={scheduleCalendarType === 'hijri' ? arabic_ar : gregorian_ar}
                    containerClassName="w-full"
                    inputClass="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors cursor-pointer bg-white"
                    placeholder="حدد التاريخ"
                    format="YYYY/MM/DD"
                    minDate={new DateObject({ calendar: scheduleCalendarType === 'hijri' ? arabic : gregorian })}
                    portal
                    portalTarget={document.body}
                    editable={false}
                    zIndex={99999}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[30px]">
                    <label className="text-xs font-black text-slate-500">الوقت</label>
                  </div>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors"
                    dir="ltr"
                  />
                </div>
              </div>
            )}
            </div>

            {/* Send / Schedule button */}
            <button
              disabled={
                recipientsToSend.length === 0 ||
                !messageContent.trim() ||
                isSending ||
                (isScheduled && (!scheduleDate || !scheduleTime))
              }
              onClick={handleSend}
              className="w-full bg-gradient-to-r from-[#8779fb] to-[#655ac1] text-white py-4 rounded-xl font-black text-lg hover:shadow-lg hover:shadow-[#655ac1]/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {isSending
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : isScheduled ? <Clock size={20} /> : <Send size={20} />}
              {isSending ? 'جاري الإرسال...' : isScheduled ? 'جدولة الإرسال' : 'إرسال'}
            </button>
          </div>
        </div>

      </div>

      {/* ══ Toast Portal ══ */}
      {toast && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed z-[9999] pointer-events-none w-full" style={{ top: '82px', left: '50%', transform: 'translateX(-50%)', animation: 'toastIn 0.3s ease-out' }}>
          <style>{`@keyframes toastIn { from { opacity:0; top:64px; } to { opacity:1; top:82px; } }`}</style>
          <div className={`mx-auto max-w-md w-[calc(100%-2rem)] flex items-center gap-3 p-4 rounded-xl shadow-lg border pointer-events-auto transition-all ${
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className={`p-2 rounded-lg shrink-0 ${toast.type === 'success' ? 'bg-emerald-100' : toast.type === 'error' ? 'bg-red-100' : 'bg-amber-100'}`}>
              {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-600" />}
              {toast.type === 'error' && <AlertCircle size={20} className="text-red-600" />}
              {toast.type === 'warning' && <AlertTriangle size={20} className="text-amber-600" />}
            </div>
            <p className="font-bold text-sm flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MessageComposer;
