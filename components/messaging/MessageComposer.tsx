import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Send, Users, AlertCircle, Paperclip, Check, X,
  MessageSquare, Plus, Search, ChevronDown, ChevronLeft,
  Clock, Eye, CalendarClock, Smartphone
} from 'lucide-react';
import { SchoolInfo, Teacher, Admin, Student, ClassInfo, Specialization, SubscriptionInfo, MessageComposerDraft, MessageSource } from '../../types';
import { useMessageArchive } from './MessageArchiveContext';
import MessageToast from './MessageToast';
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

const getCurrentSenderName = () => {
  try {
    const profile = JSON.parse(localStorage.getItem('motabe_profile') || 'null');
    if (profile?.name?.trim()) return profile.name.trim();
  } catch {}
  return 'مدير النظام';
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
  const [selectedGroup, setSelectedGroup] = useState<GroupType>('staff');
  const [staffRole, setStaffRole] = useState<'all' | 'teacher' | 'admin'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecId, setSelectedSpecId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Recipient mode: staff (teachers + admins, mixable) OR parents (independent, exclusive)
  const recipientMode: 'staff' | 'parents' = selectedGroup === 'parents' ? 'parents' : 'staff';

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
  const scheduleCalendarType = ((schoolInfo?.calendarType || 'hijri') as CalendarType);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSelectedModal, setShowSelectedModal] = useState(false);
  const [draftMeta, setDraftMeta] = useState<{ source?: MessageSource; senderRole?: string; title?: string; linksByRecipientId?: Record<string, string>; previewUrlByRecipientId?: Record<string, string> } | null>(null);

  // Reset selection when switching recipient group (enforces staff/parents exclusivity)
  useEffect(() => {
    if (applyingDraftRef.current) {
      applyingDraftRef.current = false;
      return;
    }
    setSelectedIds(new Set());
    setSearchQuery('');
    setStaffRole('all');
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
  const activeClasses = useMemo(() => {
    const classIds = new Set(students.map(s => s.classId));
    return classes.filter(c => classIds.has(c.id));
  }, [students, classes]);

  type RecipientItem = { id: string; name: string; subtitle?: string; role: 'teacher' | 'admin' | 'student' | 'guardian'; phone: string; classId?: string; classLabel?: string };

  // Full set for the active group — IGNORES search/role/class filters.
  // Selection & sending are computed from this so filtering never drops a chosen recipient.
  const groupItems = useMemo<RecipientItem[]>(() => {
    const items: RecipientItem[] = [];
    const classLabelById = new Map(classes.map(cls => [cls.id, cls.name || `${cls.grade}-${cls.section}`]));

    if (selectedGroup === 'teachers' || selectedGroup === 'staff') {
      items.push(...teachers.map(t => ({ id: t.id, name: t.name, subtitle: 'معلم', role: 'teacher' as const, phone: t.phone || '' })));
    }
    if (selectedGroup === 'admins' || selectedGroup === 'staff') {
      items.push(...admins.map(a => ({ id: a.id, name: a.name, subtitle: a.role || 'إداري', role: 'admin' as const, phone: a.phone || '' })));
    }
    if (selectedGroup === 'parents') {
      items.push(...students.map(s => ({ id: s.id, name: s.name, subtitle: 'طالب', role: 'guardian' as const, phone: s.parentPhone || '', classId: s.classId, classLabel: classLabelById.get(s.classId) })));
    }
    return items;
  }, [selectedGroup, teachers, admins, students, classes]);

  // Visible (filtered) list for browsing only.
  const displayItems = useMemo<RecipientItem[]>(() => {
    const q = searchQuery.toLowerCase();
    const specById = new Map(teachers.map(t => [t.id, t.specializationId]));
    return groupItems.filter(item => {
      if (q && !item.name.toLowerCase().includes(q)) return false;
      if (item.role === 'teacher') {
        if (staffRole === 'admin') return false;
        if (selectedSpecId !== 'all' && specById.get(item.id) !== selectedSpecId) return false;
      }
      if (item.role === 'admin' && staffRole === 'teacher') return false;
      if (item.role === 'guardian' && selectedClassId !== 'all' && item.classId !== selectedClassId) return false;
      return true;
    });
  }, [groupItems, teachers, searchQuery, staffRole, selectedSpecId, selectedClassId]);

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

  // Final Recipients (must have a phone number) — from the full group, not the filtered view
  const recipientsToSend = useMemo(
    () => groupItems.filter(item => selectedIds.has(item.id) && item.phone),
    [groupItems, selectedIds]
  );

  // Selected recipients across the whole active group (for the preview chips)
  const selectedRecipients = useMemo(
    () => groupItems.filter(item => selectedIds.has(item.id)),
    [groupItems, selectedIds]
  );

  // Unified select-all toggle — operates on the currently visible (filtered) list
  const allDisplayedSelected = displayItems.length > 0 && displayItems.every(item => selectedIds.has(item.id));
  const toggleSelectAll = () => { if (allDisplayedSelected) deselectAll(); else selectAll(); };

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
  const timeFormatted = useMemo(() => new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(new Date()), []);
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
      .replace(/{الوقت}/g, timeFormatted)
      .replace(/{اسم_المدرسة}/g, schoolInfo?.schoolName || 'اسم المدرسة')
      .replace(/{رابط_الجدول}/g, previewScheduleLinks || 'رابط الجدول')
      .replace(/{روابط_الجداول}/g, previewScheduleLinks || 'روابط الجداول');
  }, [messageContent, recipientsToSend, today, dateFormatted, timeFormatted, schoolInfo, previewScheduleLinks]);

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
    const senderName = getCurrentSenderName();
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
        .replace(/{الوقت}/g, timeFormatted)
        .replace(/{اسم_المدرسة}/g, schoolInfo?.schoolName || '')
        .replace(/{رابط_الجدول}/g, draftMeta?.linksByRecipientId?.[rec.id] || '')
        .replace(/{روابط_الجداول}/g, draftMeta?.linksByRecipientId?.[rec.id] || '');

      if (channel === 'sms' && attachment)
        personalizedContent += `\nالمرفق: http://t.ly/mock_link`;

      return {
        batchId,
        senderRole: draftMeta?.senderRole || 'مدير النظام',
        senderName,
        source: draftMeta?.source || 'general' as const,
        recipientId: rec.id,
        recipientName: rec.name,
        recipientPhone: rec.phone,
        recipientRole: rec.role,
        recipientClassLabel: rec.classLabel,
        content: personalizedContent,
        originalContent: messageContent,
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
                    allSelected || someSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent group-hover:border-[#655ac1]'
                  }`}
                >
                  <Check size={12} strokeWidth={3.5} className={someSelected && !allSelected ? 'opacity-50' : ''} />
                </button>
                <span className={`font-bold select-none ${allSelected || someSelected ? 'text-[#655ac1]' : 'text-slate-700'}`}>فصل {className}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
                  {items.filter(i => selectedIds.has(i.id)).length} / {items.length}
                </span>
                {isExpanded ? <ChevronDown size={18} className="text-slate-400 group-hover:text-[#655ac1] transition-colors" /> : <ChevronLeft size={18} className="text-slate-400 group-hover:text-[#655ac1] transition-colors" />}
              </div>
            </div>
            {isExpanded && (
              <div className="p-2 space-y-1 bg-white border-t border-slate-100">
                {items.map(item => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer rounded-xl transition-colors select-none group hover:bg-slate-50"
                    onClick={() => toggleSelection(item.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold ${isSelected ? 'text-[#655ac1]' : 'text-slate-800'}`}>{item.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold text-slate-400">{item.subtitle}</span>
                        {item.phone ? (
                          <span className="flex items-center gap-1">
                            <Smartphone size={13} className="text-[#655ac1] shrink-0" />
                            <span className="text-[13px] text-slate-500" dir="ltr">{item.phone}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-rose-500 font-bold">
                            <Smartphone size={13} className="text-[#655ac1] shrink-0" />
                            بدون رقم جوال
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all shrink-0 ${
                      isSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent group-hover:border-[#655ac1]'
                    }`}>
                      <Check size={12} strokeWidth={3.5} />
                    </span>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      });
    }

    return (
      <div className="space-y-1">
        {displayItems.map(item => {
          const isSelected = selectedIds.has(item.id);
          return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer rounded-xl transition-colors select-none group hover:bg-slate-50"
            onClick={() => toggleSelection(item.id)}
          >
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-bold ${isSelected ? 'text-[#655ac1]' : 'text-slate-800'}`}>{item.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-bold text-slate-400">{item.subtitle}</span>
                {item.phone ? (
                  <span className="flex items-center gap-1">
                    <Smartphone size={13} className="text-[#655ac1] shrink-0" />
                    <span className="text-[13px] text-slate-500" dir="ltr">{item.phone}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-rose-500 font-bold">
                    <Smartphone size={13} className="text-[#655ac1] shrink-0" />
                    بدون رقم جوال
                  </span>
                )}
              </div>
            </div>
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all shrink-0 ${
              isSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent group-hover:border-[#655ac1]'
            }`}>
              <Check size={12} strokeWidth={3.5} />
            </span>
          </div>
          );
        })}
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
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col z-0">
        <h3 className="text-lg font-black shrink-0 text-[#1e293b] mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-[#655ac1]" size={20} />
            اختر المستلمين
          </div>
          {groupItems.length > 0 && (
            <span className="text-sm px-3 py-1 rounded-xl border border-slate-200 bg-transparent font-bold text-slate-600">
              {displayItems.length}
            </span>
          )}
        </h3>

        <div className="space-y-4 mb-4 shrink-0">
          {/* Mode toggle: staff (mixable) vs parents (exclusive) */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => { if (recipientMode !== 'staff') setSelectedGroup('staff'); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
                recipientMode === 'staff' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users size={16} /> الموظفون
            </button>
            <button
              type="button"
              onClick={() => { if (recipientMode !== 'parents') setSelectedGroup('parents'); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
                recipientMode === 'parents' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users size={16} /> أولياء الأمور
            </button>
          </div>

          {/* Search (always visible) */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={recipientMode === 'parents' ? 'بحث باسم الطالب...' : 'بحث باسم الموظف...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl pr-10 pl-4 py-2.5 outline-none focus:border-[#655ac1] hover:bg-slate-50 text-sm font-bold text-slate-600 transition-all"
            />
          </div>

          {/* Staff role chips */}
          {recipientMode === 'staff' && (
            <div className="flex gap-2">
              {([
                { id: 'all', label: 'الكل' },
                { id: 'teacher', label: 'المعلمون' },
                { id: 'admin', label: 'الإداريون' },
              ] as const).map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setStaffRole(chip.id)}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    staffRole === chip.id
                      ? 'border-[#655ac1] text-white bg-[#655ac1]'
                      : 'border-slate-200 text-slate-500 bg-white hover:border-[#655ac1] hover:text-[#655ac1]'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Parents class filter */}
          {recipientMode === 'parents' && (
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

        {/* Single neutral select-all toggle (grey border, purple on hover) */}
        <div className="flex items-center justify-end gap-2 mb-4 border-b border-slate-100 pb-4 shrink-0">
          <button
            onClick={toggleSelectAll}
            disabled={displayItems.length === 0}
            className={`inline-flex items-center gap-2 text-xs font-bold bg-transparent border px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50 ${
              allDisplayedSelected
                ? 'border-[#655ac1] text-[#655ac1]'
                : 'border-slate-200 text-slate-600 hover:border-[#655ac1] hover:text-[#655ac1] disabled:hover:border-slate-200 disabled:hover:text-slate-600'
            }`}
          >
            {allDisplayedSelected ? 'إلغاء الكل' : 'اختيار الكل'}
          </button>
        </div>

        <div className="overflow-y-auto max-h-[500px] min-h-[150px] custom-scrollbar pr-2 -mr-2">
          {renderRecipientList()}
        </div>
      </div>

      {/* ══ Left Column: Settings + Composer ══ */}
      <div className="space-y-6">

        {/* ── Selected Recipients Preview (opens modal) ── */}
        {selectedRecipients.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSelectedModal(true)}
            className="w-full flex items-center justify-between gap-2 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-[#655ac1] transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-black text-[#1e293b]">
              <Users className="text-[#655ac1]" size={18} />
              معاينة المستلمين المحددين
            </span>
            <span className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-slate-600">{selectedRecipients.length}</span>
              <Eye size={16} className="text-[#655ac1]" />
            </span>
          </button>
        )}

        {/* ── Channel Settings Card ── */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
          <h3 className="text-lg font-black text-[#1e293b] flex items-center gap-2 mb-4">
            <Send className="text-[#655ac1]" size={20} />
            اختر طريقة الإرسال المفضلة
          </h3>

          {/* Channel Buttons — neutral selected frame */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setChannel('whatsapp')}
              className={`relative flex items-center gap-3 px-4 py-3 border-2 rounded-xl bg-white transition-all ${
                channel === 'whatsapp'
                  ? 'border-slate-200 bg-slate-50 ring-2 ring-[#655ac1]/15'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={channel === 'whatsapp' ? "#25D366" : "#cbd5e1"} xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd" />
              </svg>
              <span className={`font-black text-sm ${channel === 'whatsapp' ? 'text-[#1d9e4b]' : 'text-slate-400'}`}>واتساب</span>
              {channel === 'whatsapp' && (
                <span className="absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#25D366] text-white shadow-sm">
                  <Check size={12} strokeWidth={3.5} />
                </span>
              )}
            </button>

            <button
              onClick={() => setChannel('sms')}
              className={`relative flex items-center gap-3 px-4 py-3 border-2 rounded-xl bg-white transition-all ${
                channel === 'sms'
                  ? 'border-slate-200 bg-slate-50 ring-2 ring-[#655ac1]/15'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <MessageSquare size={24} className={`shrink-0 ${channel === 'sms' ? 'text-[#007AFF]' : 'text-slate-300'}`} />
              <span className={`font-black text-sm ${channel === 'sms' ? 'text-[#007AFF]' : 'text-slate-400'}`}>النصية SMS</span>
              {channel === 'sms' && (
                <span className="absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#007AFF] text-white shadow-sm">
                  <Check size={12} strokeWidth={3.5} />
                </span>
              )}
            </button>
          </div>

          {/* Insufficient balance warning */}
          {recipientsToSend.length > 0 && !hasEnoughBalance && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl mb-4 text-rose-700 text-xs font-bold">
              <AlertCircle size={14} />
              الرصيد غير كافٍ — تحتاج {recipientsToSend.length} رسالة ولديك {totalBalance}
            </div>
          )}

          <div className="space-y-4">
            {/* Attachment — WhatsApp only */}
            {channel === 'whatsapp' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">المرفقات</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex items-center justify-center gap-2 text-center cursor-pointer hover:bg-slate-50 transition-colors relative">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && setAttachment(e.target.files[0])} />
                  <Paperclip className="text-slate-400 shrink-0" size={18} />
                  <span className="text-sm font-semibold text-slate-600 truncate">
                    {attachment ? attachment.name : 'اسحب أو انقر لإضافة ملف (PDF/صور)'}
                  </span>
                </div>
              </div>
            )}

            {/* Fallback toggle — only for WhatsApp */}
            {channel === 'whatsapp' && (
              <label className="relative flex items-center gap-2.5 p-2.5 border border-rose-300 bg-rose-50/40 rounded-xl cursor-pointer hover:bg-rose-50 transition-colors">
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
                <div className={`relative flex items-center w-10 h-5 shrink-0 rounded-full transition-colors ${fallbackToSms ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`absolute w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all duration-300 ${fallbackToSms ? 'right-1' : 'left-1'}`} />
                </div>
                <span className="text-xs font-bold text-rose-700 select-none leading-relaxed">
                  في حال فشل الواتساب يتم الإرسال عبر الرسائل النصية تلقائيًا
                </span>
              </label>
            )}
          </div>
        </div>

        {/* ── Message Composer Card ── */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
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
            <div className="space-y-2">
              {[
                ['اسم_المعلم', 'اسم_الإداري', 'اسم_الطالب'],
                ['اليوم', 'التاريخ', 'الوقت', 'اسم_المدرسة'],
              ].map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2 flex-wrap">
                  {row.map(variable => (
                    <button
                      key={variable}
                      onClick={() => insertVariable(variable)}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:border-[#655ac1] hover:text-[#655ac1] transition-colors flex items-center gap-1"
                    >
                      <Plus size={12} className="text-[#655ac1]" /> {variable.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
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

      {/* ══ Selected Recipients Modal ══ */}
      {showSelectedModal && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[220] flex items-center justify-center p-4" onClick={() => setShowSelectedModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[82vh] border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <Users className="text-[#655ac1]" size={20} />
                المستلمون المحددون ({selectedRecipients.length})
              </h3>
              <button onClick={() => setShowSelectedModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {selectedRecipients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Users size={40} className="mb-3 opacity-50" />
                  <p className="font-bold text-sm">لم تحدد أي مستلم بعد</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRecipients.map(rec => (
                    <div key={rec.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-sm">{rec.name}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-400">{rec.subtitle}</span>
                          {rec.classLabel && <span className="text-[11px] font-bold text-slate-400">— {rec.classLabel}</span>}
                          {rec.phone ? (
                            <span className="flex items-center gap-1">
                              <Smartphone size={13} className="text-[#655ac1]" />
                              <span className="text-[13px] text-slate-500" dir="ltr">{rec.phone}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-rose-500 font-bold">لا يوجد رقم</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSelection(rec.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors shrink-0"
                      >
                        <X size={13} strokeWidth={3} /> إزالة
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedRecipients.some(r => !r.phone) && (
              <div className="px-4 py-3 border-t border-slate-100 bg-rose-50/60">
                <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                  <AlertCircle size={13} />
                  المستلمون بلا رقم جوال لن تصلهم الرسالة.
                </p>
              </div>
            )}
            <div className="flex justify-end border-t border-slate-100 bg-white p-4">
              <button type="button" onClick={() => setShowSelectedModal(false)} className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                إغلاق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══ Toast Portal (unified) ══ */}
      <MessageToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default MessageComposer;
