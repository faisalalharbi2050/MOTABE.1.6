import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Copy,
  Link2,
  Loader2,
  MessageCircle,
  Send,
  Share2,
  Users,
  UserCog,
  GraduationCap,
  X,
} from 'lucide-react';
import { Admin, ClassInfo, Student, Teacher, CentralMessage, SchoolInfo } from '../../types';
import { useMessageArchive } from '../messaging/MessageArchiveContext';
import { useToast } from '../ui/ToastProvider';
import {
  buildScheduleShareLink,
  buildScheduleSignatureLink,
  saveScheduleShare,
  saveScheduleSignatureRequest,
  ScheduleShareRequest,
  ShareAudience,
  ShareRecipientRecord,
  ShareScheduleType,
} from '../../utils/scheduleShare';

interface SendScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  admins: Admin[];
  students: Student[];
  classes: ClassInfo[];
  schoolInfo: SchoolInfo;
  schoolName?: string;
  onNavigateToArchive?: () => void;
}

type ChannelType = 'whatsapp' | 'sms';

type LinkRecord = {
  key: string;
  label: string;
  url: string;
  audience: ShareAudience;
  targetId?: string;
  targetLabel: string;
  requestKind: 'share' | 'signature';
};

type DeliveryResult = {
  id: string;
  name: string;
  phone: string;
  roleLabel: string;
  relatedLabel: string;
  channel: ChannelType;
  status: 'sent' | 'failed';
  timestamp: string;
  failureReason?: string;
};

type SelectableRecipient = ShareRecipientRecord & {
  selectionKey: string;
  relatedLabel?: string;
};

const SCHEDULE_OPTIONS: Array<{ id: ShareScheduleType; title: string; description: string }> = [
  { id: 'general_teachers', title: 'الجدول العام للمعلمين', description: 'رابط موحد للجدول العام الخاص بالمعلمين' },
  { id: 'general_classes', title: 'الجدول العام للفصول', description: 'رابط موحد يعرض الجدول العام للفصول' },
  { id: 'general_waiting', title: 'الجدول العام للانتظار', description: 'رابط موحد للانتظار الداخلي دون تفاصيل تشغيلية' },
  { id: 'individual_teacher', title: 'جدول معلم', description: 'رابط مستقل لكل معلم مع نسخة جاهزة للإرسال' },
  { id: 'individual_class', title: 'جدول فصل', description: 'يمكن إرساله للمعلمين أو الإداريين أو أولياء الأمور' },
];

const AUDIENCE_OPTIONS: Array<{ id: ShareAudience; title: string; icon: React.ReactNode }> = [
  { id: 'teachers', title: 'المعلمون', icon: <Users size={18} /> },
  { id: 'admins', title: 'الإداريون', icon: <UserCog size={18} /> },
  { id: 'guardians', title: 'أولياء الأمور', icon: <GraduationCap size={18} /> },
];

const allowedAudiences: Record<ShareScheduleType, ShareAudience[]> = {
  general_teachers: ['teachers', 'admins'],
  general_classes: ['teachers', 'admins', 'guardians'],
  general_waiting: ['teachers', 'admins'],
  individual_teacher: ['teachers', 'admins'],
  individual_class: ['teachers', 'admins', 'guardians'],
};

const targetTitleMap: Record<ShareScheduleType, string> = {
  general_teachers: 'الجدول العام للمعلمين',
  general_classes: 'الجدول العام للفصول',
  general_waiting: 'الجدول العام للانتظار',
  individual_teacher: 'جدول معلم',
  individual_class: 'جدول فصل',
};

const roleLabelMap: Record<ShareRecipientRecord['role'], string> = {
  teacher: 'معلم',
  admin: 'إداري',
  guardian: 'ولي أمر',
};

const sourceBySchedule: Record<ShareScheduleType, CentralMessage['source']> = {
  general_teachers: 'general',
  general_classes: 'general',
  general_waiting: 'waiting',
  individual_teacher: 'general',
  individual_class: 'general',
};

const dayName = () => new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date());
const nowSummary = () => {
  const now = new Date();
  return {
    day: new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(now),
    date: new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(now),
    time: new Intl.DateTimeFormat('ar-SA', { timeStyle: 'short' }).format(now),
  };
};

const SendScheduleModal: React.FC<SendScheduleModalProps> = ({
  isOpen,
  onClose,
  teachers,
  admins,
  students,
  classes,
  schoolInfo,
  schoolName,
  onNavigateToArchive,
}) => {
  const { sendMessage } = useMessageArchive();
  const { showToast } = useToast();

  const [selectedSchedule, setSelectedSchedule] = useState<ShareScheduleType | ''>('');
  const [selectedAudiences, setSelectedAudiences] = useState<ShareAudience[]>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [channel, setChannel] = useState<ChannelType>('whatsapp');
  const [generatedLinks, setGeneratedLinks] = useState<LinkRecord[]>([]);
  const [results, setResults] = useState<DeliveryResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentMoment = useMemo(() => nowSummary(), []);
  const currentSemester = useMemo(
    () => schoolInfo?.semesters?.find(item => item.id === schoolInfo.currentSemesterId) || schoolInfo?.semesters?.[0],
    [schoolInfo]
  );

  useEffect(() => {
    setGeneratedLinks([]);
    setResults([]);
  }, [selectedSchedule, selectedAudiences, selectedTargetIds, selectedRecipientIds, channel]);

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => a.grade !== b.grade ? a.grade - b.grade : (a.section || 0) - (b.section || 0)),
    [classes]
  );
  const sortedTeachers = useMemo(
    () => [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [teachers]
  );
  const sortedAdmins = useMemo(
    () => [...admins].sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [admins]
  );

  const availableAudiences = selectedSchedule ? allowedAudiences[selectedSchedule] : [];
  const selectedAudienceLabels = selectedAudiences
    .map(audience => AUDIENCE_OPTIONS.find(option => option.id === audience)?.title)
    .filter(Boolean)
    .join('، ');
  const needsTargetSelection = selectedSchedule === 'individual_teacher' || selectedSchedule === 'individual_class';

  const targetOptions = useMemo(() => {
    if (selectedSchedule === 'individual_teacher') {
      return sortedTeachers.map(teacher => ({
        id: teacher.id,
        title: teacher.name,
        subtitle: teacher.phone || 'بدون رقم',
      }));
    }

    if (selectedSchedule === 'individual_class') {
      return sortedClasses.map(classItem => ({
        id: classItem.id,
        title: classItem.name || `${classItem.grade}/${classItem.section}`,
        subtitle: `الصف ${classItem.grade}`,
      }));
    }

    return [];
  }, [selectedSchedule, sortedTeachers, sortedClasses]);

  const recipients = useMemo<SelectableRecipient[]>(() => {
    if (selectedAudiences.length === 0) return [];

    const nextRecipients: SelectableRecipient[] = [];

    if (selectedAudiences.includes('teachers')) {
      const base = sortedTeachers.map(teacher => ({
        selectionKey: `teacher:${teacher.id}`,
        id: teacher.id,
        name: teacher.name,
        phone: teacher.phone || '',
        role: 'teacher' as const,
        relatedLabel: teacher.phone || 'بدون رقم',
      }));

      if (selectedSchedule === 'individual_teacher' && selectedTargetIds.length > 0) {
        nextRecipients.push(...base.filter(item => selectedTargetIds.includes(item.id)));
      } else {
        nextRecipients.push(...base);
      }
    }

    if (selectedAudiences.includes('admins')) {
      nextRecipients.push(...sortedAdmins.map(admin => ({
        selectionKey: `admin:${admin.id}`,
        id: admin.id,
        name: admin.name,
        phone: admin.phone || '',
        role: 'admin' as const,
        relatedLabel: admin.role || 'إداري',
      })));
    }

    if (selectedAudiences.includes('guardians')) {
      const guardianBase = students
        .filter(student => student.parentPhone)
        .map(student => {
          const classItem = classes.find(item => item.id === student.classId);
          return {
            selectionKey: `guardian:${student.id}`,
            id: student.id,
            name: student.name,
            phone: student.parentPhone || '',
            role: 'guardian' as const,
            classId: student.classId,
            classLabel: classItem?.name || `${classItem?.grade || ''}/${classItem?.section || ''}`,
            studentName: student.name,
            relatedLabel: classItem?.name || `${classItem?.grade || ''}/${classItem?.section || ''}`,
          };
        });

      if (selectedTargetIds.length > 0 && selectedSchedule === 'individual_class') {
        nextRecipients.push(...guardianBase.filter(item => item.classId && selectedTargetIds.includes(item.classId)));
      } else {
        nextRecipients.push(...guardianBase);
      }
    }

    return nextRecipients;
  }, [selectedAudiences, selectedSchedule, selectedTargetIds, sortedTeachers, sortedAdmins, students, classes]);

  useEffect(() => {
    if (!selectedSchedule) {
      setSelectedAudiences([]);
      setSelectedTargetIds([]);
      setSelectedRecipientIds([]);
      return;
    }

    const allowed = allowedAudiences[selectedSchedule];
    if (selectedAudiences.some(audience => !allowed.includes(audience))) {
      setSelectedAudiences(current => current.filter(audience => allowed.includes(audience)));
      setSelectedRecipientIds([]);
    }

    if (selectedSchedule !== 'individual_teacher' && selectedSchedule !== 'individual_class') {
      setSelectedTargetIds([]);
    }
  }, [selectedSchedule, selectedAudiences]);

  useEffect(() => {
    if (selectedAudiences.length === 0) {
      setSelectedRecipientIds([]);
      return;
    }

    if (selectedSchedule === 'individual_teacher') {
      setSelectedRecipientIds(recipients.map(item => item.selectionKey));
      return;
    }

    setSelectedRecipientIds(recipients.map(item => item.selectionKey));
  }, [selectedAudiences, selectedSchedule, selectedTargetIds, recipients]);

  const selectedRecipients = useMemo(
    () => recipients.filter(item => selectedRecipientIds.includes(item.selectionKey)),
    [recipients, selectedRecipientIds]
  );

  const targetSelectionTitle =
    selectedSchedule === 'individual_teacher' && selectedAudiences.includes('admins') && !selectedAudiences.includes('teachers')
      ? 'الجداول المراد إرسالها'
      : selectedSchedule === 'individual_teacher'
        ? 'المعلمون المراد إرسال جداولهم'
        : 'الفصول المراد إرسالها';

  const isReadyToGenerate = Boolean(
    selectedSchedule &&
    selectedAudiences.length > 0 &&
    (!needsTargetSelection || selectedTargetIds.length > 0)
  );

  const isReadyToSend = isReadyToGenerate && selectedRecipients.length > 0;

  const toggleFromList = (value: string, items: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(items.includes(value) ? items.filter(item => item !== value) : [...items, value]);
  };

  const toggleAllTargets = () => {
    setSelectedTargetIds(selectedTargetIds.length === targetOptions.length ? [] : targetOptions.map(item => item.id));
  };

  const toggleAllRecipients = () => {
    setSelectedRecipientIds(selectedRecipientIds.length === recipients.length ? [] : recipients.map(item => item.selectionKey));
  };

  const toggleAudience = (audience: ShareAudience) => {
    setSelectedAudiences(current =>
      current.includes(audience)
        ? current.filter(item => item !== audience)
        : [...current, audience]
    );
  };

  const getTargetLabel = (targetId?: string) => {
    if (!targetId) return targetTitleMap[selectedSchedule as ShareScheduleType] || 'الجدول';
    const teacher = teachers.find(item => item.id === targetId);
    if (teacher) return teacher.name;
    const classItem = classes.find(item => item.id === targetId);
    return classItem?.name || `${classItem?.grade || ''}/${classItem?.section || ''}` || targetId;
  };

  const createLinks = () => {
    if (!selectedSchedule || selectedAudiences.length === 0 || !isReadyToGenerate) return [];

    const createdAt = new Date().toISOString();
    const origin = `${window.location.origin}${window.location.pathname}`;
    const shareSchoolName = schoolName || schoolInfo.schoolName;
    const currentSemester = schoolInfo.semesters?.find(item => item.id === schoolInfo.currentSemesterId) || schoolInfo.semesters?.[0];

    const targetIds = needsTargetSelection ? selectedTargetIds : ['__general__'];
    const links = targetIds.flatMap(targetId => {
      const targetLabel = targetId === '__general__'
        ? targetTitleMap[selectedSchedule]
        : getTargetLabel(targetId);

      const targetLinks: LinkRecord[] = [];

      if (selectedSchedule === 'individual_teacher' && selectedAudiences.includes('teachers') && targetId !== '__general__') {
        const teacher = teachers.find(item => item.id === targetId);
        const token = `schedule-sign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        saveScheduleSignatureRequest({
          token,
          teacherId: targetId,
          teacherName: teacher?.name || targetLabel,
          createdAt,
          status: 'pending',
        });
        targetLinks.push({
          key: token,
          label: targetLabel,
          url: buildScheduleSignatureLink(origin, token),
          audience: 'teachers',
          targetId,
          targetLabel,
          requestKind: 'signature' as const,
        });
      }

      selectedAudiences.forEach(audience => {
        if (selectedSchedule === 'individual_teacher' && audience === 'teachers' && targetId !== '__general__') return;

        const filteredRecipients = selectedRecipients.filter(item => {
          const matchesAudience =
            (audience === 'teachers' && item.role === 'teacher') ||
            (audience === 'admins' && item.role === 'admin') ||
            (audience === 'guardians' && item.role === 'guardian');

          if (!matchesAudience) return false;

          return audience === 'guardians' && targetId !== '__general__'
            ? item.classId === targetId
            : true;
        });

        if (filteredRecipients.length === 0) return;

        const token = `schedule-share-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const request: ScheduleShareRequest = {
          token,
          type: selectedSchedule,
          audience,
          targetId: targetId === '__general__' ? undefined : targetId,
          targetLabel,
          title: targetId === '__general__' ? targetTitleMap[selectedSchedule] : `${targetTitleMap[selectedSchedule]}: ${targetLabel}`,
          createdAt,
          schoolName: shareSchoolName,
          academicYear: schoolInfo.academicYear,
          semesterName: currentSemester?.name,
          recipients: filteredRecipients,
        };
        saveScheduleShare(request);

        targetLinks.push({
          key: token,
          label: request.title,
          url: buildScheduleShareLink(origin, token),
          audience,
          targetId: request.targetId,
          targetLabel,
          requestKind: 'share' as const,
        });
      });

      return targetLinks;
    });

    setGeneratedLinks(links);
    showToast('تم إنشاء الروابط بنجاح.', 'success');
    return links;
  };

  const createManualShareText = (links: LinkRecord[]) => {
    const intro = [
      `إرسال ${targetTitleMap[selectedSchedule as ShareScheduleType]}`,
      `المدرسة: ${schoolName || schoolInfo.schoolName || 'المدرسة'}`,
      `اليوم: ${currentMoment.day}`,
      `التاريخ: ${currentMoment.date}`,
      `الوقت: ${currentMoment.time}`,
    ].join('\n');
    const lines = links.map(link => `${link.targetLabel}: ${link.url}`);
    return [intro, ...lines].join('\n');
  };

  const copyAllLinks = async () => {
    const links = generatedLinks.length > 0 ? generatedLinks : createLinks();
    if (!links.length) return;
    await navigator.clipboard.writeText(createManualShareText(links));
    showToast('تم نسخ الروابط.', 'success');
  };

  const openManualChannel = (mode: ChannelType) => {
    const links = generatedLinks.length > 0 ? generatedLinks : createLinks();
    if (!links.length) return;
    const content = createManualShareText(links);
    if (mode === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(content)}`, '_blank');
      return;
    }
    window.open(`sms:?&body=${encodeURIComponent(content)}`, '_self');
  };

  const buildMessagePayloads = (links: LinkRecord[], batchId: string) => {
    if (!selectedSchedule || selectedAudiences.length === 0) return [];

    const generalLink = links[0];
    const schoolLabel = schoolName || schoolInfo.schoolName || 'المدرسة';
    const semesterLabel = currentSemester?.name || 'الفصل الدراسي الحالي';
    const academicYearLabel = schoolInfo.academicYear || 'العام الدراسي الحالي';

    return selectedRecipients.map(recipient => {
      let relevantLinks = links;

      if (selectedSchedule === 'individual_teacher' && recipient.role === 'teacher') {
        relevantLinks = links.filter(link => link.targetId === recipient.id);
      } else if (selectedSchedule === 'individual_class' && recipient.role === 'guardian') {
        relevantLinks = links.filter(link => link.targetId === recipient.classId);
      } else if (!needsTargetSelection && generalLink) {
        relevantLinks = links.filter(link => link.audience === (
          recipient.role === 'teacher' ? 'teachers' :
          recipient.role === 'admin' ? 'admins' :
          'guardians'
        ));
      } else {
        relevantLinks = links.filter(link => link.audience === (
          recipient.role === 'teacher' ? 'teachers' :
          recipient.role === 'admin' ? 'admins' :
          'guardians'
        ));
      }

      const firstLink = relevantLinks[0];
      const addressedTarget = firstLink?.targetLabel || targetTitleMap[selectedSchedule];
      const introLine = recipient.role === 'guardian'
        ? `السادة أولياء الأمور، نرفق لكم ${addressedTarget} للاطلاع.`
        : recipient.role === 'teacher'
          ? `عزيزي ${recipient.name}، نرفق لكم ${addressedTarget}.`
          : `نرفق لكم ${addressedTarget}.`;

      const contentLines = [
        introLine,
        `المدرسة: ${schoolLabel}`,
        `العام الدراسي: ${academicYearLabel}`,
        `الفصل الدراسي: ${semesterLabel}`,
        `اليوم: ${currentMoment.day}`,
        `التاريخ: ${currentMoment.date}`,
        `الوقت: ${currentMoment.time}`,
        ...relevantLinks.map(link => `${link.targetLabel}: ${link.url}`),
      ];

      return {
        id: recipient.id,
        name: recipient.name,
        phone: recipient.phone,
        roleLabel: roleLabelMap[recipient.role],
        relatedLabel: recipient.role === 'guardian'
          ? [recipient.studentName, recipient.classLabel].filter(Boolean).join(' - ')
          : (recipient.classLabel || targetTitleMap[selectedSchedule]),
        message: {
          batchId,
          senderRole: 'إرسال الجداول',
          source: sourceBySchedule[selectedSchedule],
          recipientId: recipient.id,
          recipientName: recipient.name,
          recipientPhone: recipient.phone,
          recipientRole: recipient.role,
          content: contentLines.join('\n'),
          channel,
          attachments: relevantLinks.map(link => ({
            name: link.label,
            url: link.url,
            type: link.requestKind === 'signature' ? 'schedule-signature-link' : 'schedule-share-link',
          })),
        } satisfies Omit<CentralMessage, 'id' | 'timestamp' | 'status' | 'retryCount'>,
      };
    });
  };

  const handleSend = async () => {
    if (!selectedSchedule || selectedAudiences.length === 0 || !isReadyToSend) return;

    const links = generatedLinks.length > 0 ? generatedLinks : createLinks();
    if (!links.length) return;

    setIsSubmitting(true);
    const batchId = `schedule-batch-${Date.now()}`;
    const payloads = buildMessagePayloads(links, batchId);
    const nextResults: DeliveryResult[] = [];

    for (const payload of payloads) {
      const response = await sendMessage(payload.message, channel === 'whatsapp');
      nextResults.push({
        id: payload.id,
        name: payload.name,
        phone: payload.phone,
        roleLabel: payload.roleLabel,
        relatedLabel: payload.relatedLabel,
        channel: response.channel,
        status: response.status === 'sent' ? 'sent' : 'failed',
        timestamp: response.timestamp,
        failureReason: response.failureReason,
      });
    }

    setResults(nextResults);
    setIsSubmitting(false);

    const sentCount = nextResults.filter(item => item.status === 'sent').length;
    const failedCount = nextResults.length - sentCount;
    showToast(
      failedCount > 0
        ? `تم الإرسال إلى ${sentCount} وتعذر الإرسال إلى ${failedCount}.`
        : `تم إرسال جميع الجداول بنجاح إلى ${sentCount} مستلمًا.`,
      failedCount > 0 ? 'warning' : 'success'
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] shadow-2xl flex flex-col animate-in zoom-in-95 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#e5e1fe] text-[#655ac1] flex items-center justify-center">
              <Share2 size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-xl">إرسال الجداول</h3>
              <p className="text-sm font-bold text-slate-500">
                تحديد نوع الجدول والجهة المستهدفة وإنشاء الروابط ثم توثيق الإرسال في الأرشيف.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <section className="rounded-[1.75rem] border border-[#e6e0ff] bg-[linear-gradient(135deg,#f8f7ff_0%,#ffffff_65%,#eef2ff_100%)] p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-white bg-white/80 backdrop-blur px-4 py-3">
                <p className="text-xs font-black text-slate-400 mb-1">المدرسة</p>
                <p className="text-sm font-black text-slate-800">{schoolName || schoolInfo.schoolName || 'غير محددة'}</p>
              </div>
              <div className="rounded-2xl border border-white bg-white/80 backdrop-blur px-4 py-3">
                <p className="text-xs font-black text-slate-400 mb-1">اليوم</p>
                <p className="text-sm font-black text-slate-800">{currentMoment.day}</p>
              </div>
              <div className="rounded-2xl border border-white bg-white/80 backdrop-blur px-4 py-3">
                <p className="text-xs font-black text-slate-400 mb-1">التاريخ</p>
                <p className="text-sm font-black text-slate-800">{currentMoment.date}</p>
              </div>
              <div className="rounded-2xl border border-white bg-white/80 backdrop-blur px-4 py-3">
                <p className="text-xs font-black text-slate-400 mb-1">الوقت</p>
                <p className="text-sm font-black text-slate-800">{currentMoment.time}</p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className="rounded-[1.5rem] border border-slate-200 p-5 bg-white space-y-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                <span className="w-7 h-7 rounded-full bg-[#e5e1fe] text-[#655ac1] inline-flex items-center justify-center text-xs">1</span>
                الجدول المراد إرساله
              </div>
              <select
                value={selectedSchedule}
                onChange={(event) => setSelectedSchedule(event.target.value as ShareScheduleType)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#8779fb] focus:bg-white"
              >
                <option value="">اختر نوع الجدول</option>
                {SCHEDULE_OPTIONS.map(option => (
                  <option key={option.id} value={option.id}>{option.title}</option>
                ))}
              </select>
              {selectedSchedule && (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-slate-500">
                  {SCHEDULE_OPTIONS.find(option => option.id === selectedSchedule)?.description}
                </p>
              )}
              <div className="hidden">
                {SCHEDULE_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedSchedule(option.id)}
                    className={`text-right rounded-2xl border-2 p-4 transition-all ${
                      selectedSchedule === option.id
                        ? 'border-[#8779fb] bg-[#f8f7ff] shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-black text-slate-800">{option.title}</p>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-6">{option.description}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200 p-5 bg-white space-y-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                <span className="w-7 h-7 rounded-full bg-[#e5e1fe] text-[#655ac1] inline-flex items-center justify-center text-xs">2</span>
                المرسل إليه
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {AUDIENCE_OPTIONS.filter(option => !selectedSchedule || availableAudiences.includes(option.id)).map(option => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={!selectedSchedule}
                    onClick={() => toggleAudience(option.id)}
                    className={`rounded-2xl border-2 p-4 transition-all text-center disabled:opacity-50 ${
                      selectedAudiences.includes(option.id)
                        ? 'border-[#8779fb] bg-[#f8f7ff] text-[#655ac1]'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-center mb-2">{option.icon}</div>
                    <p className="font-black text-sm">{option.title}</p>
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-700 mb-3">قناة الإرسال</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['whatsapp', 'sms'] as ChannelType[]).map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setChannel(item)}
                      className={`rounded-2xl border px-4 py-3 font-black text-sm transition-all ${
                        channel === item
                          ? 'border-[#8779fb] bg-white text-[#655ac1]'
                          : 'border-slate-200 bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item === 'whatsapp' ? 'واتساب' : 'رسائل نصية'}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {needsTargetSelection && (
              <section className="rounded-[1.5rem] border border-slate-200 p-5 bg-white space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                    <span className="w-7 h-7 rounded-full bg-[#e5e1fe] text-[#655ac1] inline-flex items-center justify-center text-xs">3</span>
                    {targetSelectionTitle}
                  </div>
                  <button type="button" onClick={toggleAllTargets} className="text-xs font-black text-[#655ac1]">
                    {selectedTargetIds.length === targetOptions.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100">
                  {targetOptions.map(option => (
                    <label key={option.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedTargetIds.includes(option.id)}
                        onChange={() => toggleFromList(option.id, selectedTargetIds, setSelectedTargetIds)}
                        className="w-4 h-4 accent-[#655ac1]"
                      />
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 truncate">{option.title}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{option.subtitle}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-[1.5rem] border border-slate-200 p-5 bg-white space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                  <span className="w-7 h-7 rounded-full bg-[#e5e1fe] text-[#655ac1] inline-flex items-center justify-center text-xs">{needsTargetSelection ? '4' : '3'}</span>
                  {selectedAudiences.length === 1 && selectedAudiences.includes('guardians') ? 'الطلاب وأولياء الأمور المرتبطون' : 'المستهدفون'}
                </div>
                {recipients.length > 0 && (
                  <button type="button" onClick={toggleAllRecipients} className="text-xs font-black text-[#655ac1]">
                    {selectedRecipientIds.length === recipients.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100">
                {recipients.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm font-medium text-slate-400">
                    اختر نوع الجدول والجهة المستهدفة{needsTargetSelection ? ' والعناصر المطلوبة' : ''} لعرض المستلمين.
                  </div>
                ) : recipients.map(recipient => (
                  <label key={recipient.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedRecipientIds.includes(recipient.id)}
                      onChange={() => toggleFromList(recipient.id, selectedRecipientIds, setSelectedRecipientIds)}
                      className="w-4 h-4 accent-[#655ac1]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black text-slate-800 truncate">{recipient.name}</p>
                        <span className="text-xs font-black text-slate-400">{roleLabelMap[recipient.role]}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5" dir="ltr">{recipient.phone || 'بدون رقم'}</p>
                      {recipient.relatedLabel && (
                        <p className="text-xs text-slate-400 mt-1">{recipient.relatedLabel}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-[1.5rem] border border-slate-200 p-5 bg-white space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                <span className="w-7 h-7 rounded-full bg-[#e5e1fe] text-[#655ac1] inline-flex items-center justify-center text-xs">{needsTargetSelection ? '5' : '4'}</span>
                الروابط
              </div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={copyAllLinks} disabled={!isReadyToGenerate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-black text-sm disabled:opacity-50">
                  <Copy size={16} />
                  نسخ
                </button>
                <button type="button" onClick={() => openManualChannel('whatsapp')} disabled={!isReadyToGenerate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#25D366] text-white font-black text-sm disabled:opacity-50">
                  <MessageCircle size={16} />
                  واتساب
                </button>
                <button type="button" onClick={() => openManualChannel('sms')} disabled={!isReadyToGenerate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#8779fb] text-white font-black text-sm disabled:opacity-50">
                  <Send size={16} />
                  رسائل نصية
                </button>
                <button type="button" onClick={createLinks} disabled={!isReadyToGenerate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#c4b8f8] bg-[#f8f7ff] text-[#655ac1] font-black text-sm disabled:opacity-50">
                  <Link2 size={16} />
                  إنشاء الروابط
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-400 mb-1">نوع الجدول</p>
                <p className="text-sm font-black text-slate-800">{selectedSchedule ? targetTitleMap[selectedSchedule] : 'غير محدد'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-400 mb-1">الجهة المستهدفة</p>
                <p className="text-sm font-black text-slate-800">{selectedAudienceLabels || 'غير محدد'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-400 mb-1">المستلمون المحددون</p>
                <p className="text-sm font-black text-slate-800">{selectedRecipients.length}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-[#e5e1fe] bg-[#f8f7ff] px-4 py-3 text-sm font-medium text-[#655ac1]">
              أدوات الروابط مهيأة للنسخ والمشاركة السريعة، بينما توثيق النجاح والفشل يتم داخل نتيجة الإرسال وأرشيف الرسائل.
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              {generatedLinks.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm font-medium text-slate-400">
                  بعد إنشاء الروابط ستظهر هنا القائمة الجاهزة للنسخ والمراجعة.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {generatedLinks.map(link => (
                    <div key={link.key} className="px-5 py-4 flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-800">{link.targetLabel}</p>
                        <p className="text-xs text-slate-400 font-bold mt-1">
                          {link.requestKind === 'signature' ? 'بالتوقيع' : 'بدون توقيع'}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-1 break-all" dir="ltr">{link.url}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(link.url).then(() => showToast('تم نسخ الرابط.', 'success'))}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-black"
                      >
                        نسخ الرابط
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 p-5 bg-white space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                <CheckCircle2 size={18} className="text-emerald-500" />
                نتيجة الإرسال
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!isReadyToSend || isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#655ac1] text-white font-black text-sm disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {isSubmitting ? 'جارٍ الإرسال...' : `إرسال عبر ${channel === 'whatsapp' ? 'واتساب' : 'الرسائل النصية'}`}
                </button>
                <button
                  type="button"
                  onClick={onNavigateToArchive}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-black text-sm"
                >
                  <Archive size={16} />
                  أرشيف الرسائل
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-black text-emerald-600 mb-1">نجاح الإرسال</p>
                <p className="text-2xl font-black text-emerald-800">{results.filter(item => item.status === 'sent').length}</p>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <p className="text-xs font-black text-rose-600 mb-1">فشل الإرسال</p>
                <p className="text-2xl font-black text-rose-800">{results.filter(item => item.status === 'failed').length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-500 mb-1">إجمالي النتائج</p>
                <p className="text-2xl font-black text-slate-800">{results.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-500 mb-1">عدد الروابط</p>
                <p className="text-2xl font-black text-slate-800">{generatedLinks.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-500 mb-1">نوع الجدول</p>
                <p className="text-sm font-black text-slate-800">{selectedSchedule ? targetTitleMap[selectedSchedule] : 'غير محدد'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-500 mb-1">الجهة</p>
                <p className="text-sm font-black text-slate-800">{selectedAudienceLabels || 'غير محدد'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-500 mb-1">وقت الإرسال</p>
                <p className="text-sm font-black text-slate-800">
                  {results[0]?.timestamp
                    ? new Intl.DateTimeFormat('ar-SA', { timeStyle: 'short' }).format(new Date(results[0].timestamp))
                    : 'لم يرسل بعد'}
                </p>
              </div>
            </div>
            {results.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                تم حفظ هذه العملية في أرشيف الرسائل مع تفاصيل المستلمين والأرقام والقناة وحالة الإرسال.
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              {results.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm font-medium text-slate-400">
                  بعد تنفيذ الإرسال ستظهر هنا تفاصيل النجاح والفشل بالأسماء وأرقام الجوال.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-right font-black">الاسم</th>
                        <th className="px-4 py-3 text-right font-black">الصفة</th>
                        <th className="px-4 py-3 text-right font-black">البيان المرتبط</th>
                        <th className="px-4 py-3 text-right font-black">رقم الجوال</th>
                        <th className="px-4 py-3 text-right font-black">القناة</th>
                        <th className="px-4 py-3 text-right font-black">الحالة</th>
                        <th className="px-4 py-3 text-right font-black">وقت الإرسال</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(result => (
                        <tr key={result.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-black text-slate-800">{result.name}</td>
                          <td className="px-4 py-3 text-slate-500">{result.roleLabel}</td>
                          <td className="px-4 py-3 text-slate-500">{result.relatedLabel}</td>
                          <td className="px-4 py-3 text-slate-500" dir="ltr">{result.phone || 'بدون رقم'}</td>
                          <td className="px-4 py-3 text-slate-500">{result.channel === 'whatsapp' ? 'واتساب' : 'رسائل نصية'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${
                              result.status === 'sent'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}>
                              {result.status === 'sent' ? 'نجح' : 'فشل'}
                            </span>
                            {result.failureReason && (
                              <p className="text-xs text-rose-500 mt-1">{result.failureReason}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(result.timestamp))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SendScheduleModal;
