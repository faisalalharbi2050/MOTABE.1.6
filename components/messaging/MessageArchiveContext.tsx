import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { CentralMessage, MessageTemplate, MessageStats } from '../../types';

// ─── Scheduled Batch Type ───────────────────────────────────────────────────
interface ScheduledBatch {
  id: string;
  scheduledFor: string; // ISO timestamp
  fallbackToSms: boolean;
  messages: Array<Omit<CentralMessage, 'id' | 'timestamp' | 'status' | 'retryCount'>>;
}

// ─── Context Interface ───────────────────────────────────────────────────────
interface MessageArchiveContextType {
  messages: CentralMessage[];
  templates: MessageTemplate[];
  stats: MessageStats;
  scheduledBatches: ScheduledBatch[];
  sendMessage: (msg: Omit<CentralMessage, 'id' | 'timestamp' | 'status' | 'retryCount'>, fallbackToSms?: boolean) => Promise<void>;
  scheduleMessage: (batch: { scheduledFor: string; fallbackToSms: boolean; messages: Array<Omit<CentralMessage, 'id' | 'timestamp' | 'status' | 'retryCount'>> }) => void;
  resendMessage: (id: string) => Promise<void>;
  addTemplate: (template: Omit<MessageTemplate, 'id'>) => void;
  updateTemplate: (template: MessageTemplate) => void;
  deleteTemplate: (id: string) => void;
  restoreSystemTemplate: (id: string) => void;
  clearArchive: () => void;
  rechargeBalance: (amount: number, type: 'whatsapp' | 'sms') => void;
  buyPackage: (pkg: { name: string; wa: number; sms: number }) => void;
}

const MessageArchiveContext = createContext<MessageArchiveContextType | undefined>(undefined);

// ─── Initial Templates ───────────────────────────────────────────────────────
const INITIAL_TEMPLATES: MessageTemplate[] = [
  { id: 't1', title: 'غياب طالب', content: 'المكرم ولي أمر الطالب {اسم_الطالب}، نود إشعاركم بغياب ابنكم اليوم {اليوم} الموافق {التاريخ}.', isSystem: true, category: 'غياب طالب' },
  { id: 't2', title: 'تأخر طالب', content: 'المكرم ولي أمر الطالب {اسم_الطالب}، نود إشعاركم بتأخر ابنكم عن الطابور الصباحي اليوم {اليوم}.', isSystem: true, category: 'تأخر طالب' },
  { id: 't3', title: 'مخالفة سلوكية', content: 'المكرم ولي أمر الطالب {اسم_الطالب}، نشعركم بارتكاب ابنكم لمخالفة سلوكيɡنأمل زيارتكم للمدرسة في يوم (اليوم) وتاريخ (التاريخ)', isSystem: true, category: 'مخالفة سلوكية' },
  { id: 't4', title: 'الانتظار اليومي', content: 'المكرم {اسم_المعلم} ، لديك حصة انتظار يوم{اليوم} ، الحصة{رقم_الحصة} في فصل{الفصل} بدلاً من المعلم الغائب {اسم_المعلم_الغائب}', isSystem: true, category: 'انتظار' },
  { id: 't5', title: 'رسالة التكليف بالإشراف اليومي', content: 'المكرم/ {اسم_المعلم}،{اسم_الإداري} ،نشعركم بإسناد مهمة الإشراف اليومي لكم في يوم{اليوم}.', isSystem: true, category: 'إشراف' },
  { id: 't6', title: 'التذكير بالإشراف اليومي', content: 'تذكير: المكرم/ {اسم_المعلم}،{اسم_الإداري} ، نذكركم بموعد الإشراف اليومي لهذا اليوم{اليوم} ، شاكرين تعاونكم', isSystem: true, category: 'إشراف' },
  { id: 't7', title: 'التكليف بالمناوبة اليومية', content: 'المكرم/ {اسم_المعلم}،{اسم_الإداري} ،نشعركم بإسناد مهمة المناوبة اليومية في يوم{اليوم} الموافق {التاريخ} ، نسأل الله لكم العون والتوفيق.', isSystem: true, category: 'مناوبة' },
  { id: 't8', title: 'التذكير بالمناوبة اليومية', content: 'المكرم / {اسم_المعلم}،{اسم_الإداري} ،نذكركم بموعد المناوبة اليومية لهذا اليوم{اليوم} الموافق{التاريخ} ، شاكرين تعاونكم.', isSystem: true, category: 'مناوبة' },
  { id: 't9', title: 'التعميم الداخلي', content: 'المكرم / {اسم_المعلم}،{اسم_الإداري} ،نحيطكم علماً بالتعميم {عنوان_التعميم} المرفق نأمل الاطلاع وعمل اللازم.', isSystem: true, category: 'تعميم' },
];

// ─── Provider ────────────────────────────────────────────────────────────────
export const MessageArchiveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<CentralMessage[]>(() => {
    try { return JSON.parse(localStorage.getItem('smart_messaging_archive_v1') || '[]'); } catch { return []; }
  });

  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    try {
      let stored: MessageTemplate[] = JSON.parse(localStorage.getItem('smart_messaging_templates_v1') || JSON.stringify(INITIAL_TEMPLATES));
      stored = stored.map(t => (t.id === 't3' ? INITIAL_TEMPLATES[2] : t));
      INITIAL_TEMPLATES.forEach(sysTpl => {
        const idx = stored.findIndex(t => t.id === sysTpl.id);
        if (idx === -1) stored.push(sysTpl);
        else if (['t4', 't5', 't6', 't7', 't8', 't9'].includes(sysTpl.id)) stored[idx] = sysTpl;
      });
      return stored;
    } catch { return INITIAL_TEMPLATES; }
  });

  const [stats, setStats] = useState<MessageStats>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('smart_messaging_stats_v2') || 'null');
      if (stored) {
        return stored;
      }
      const nowIso = new Date().toISOString();
      return {
        totalSent: 0,
        whatsappSent: 0,
        smsSent: 0,
        failedCount: 0,
        balanceSMS: 10,
        balanceWhatsApp: 50,
        lastUpdated: nowIso,
        messagePackageStartDate: undefined,
        messagePackageEndDate: undefined,
        messagePackageIsTrial: undefined,
      };
    } catch {
      const nowIso = new Date().toISOString();
      return {
        totalSent: 0,
        whatsappSent: 0,
        smsSent: 0,
        failedCount: 0,
        balanceSMS: 10,
        balanceWhatsApp: 50,
        lastUpdated: nowIso,
        messagePackageStartDate: undefined,
        messagePackageEndDate: undefined,
        messagePackageIsTrial: undefined,
      };
    }
  });

  const [scheduledBatches, setScheduledBatches] = useState<ScheduledBatch[]>(() => {
    try { return JSON.parse(localStorage.getItem('smart_messaging_scheduled_v1') || '[]'); } catch { return []; }
  });

  // ── Persistence ──────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem('smart_messaging_archive_v1', JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem('smart_messaging_templates_v1', JSON.stringify(templates)); }, [templates]);
  useEffect(() => { localStorage.setItem('smart_messaging_stats_v2', JSON.stringify(stats)); }, [stats]);
  useEffect(() => { localStorage.setItem('smart_messaging_scheduled_v1', JSON.stringify(scheduledBatches)); }, [scheduledBatches]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const updateStats = (channel: 'whatsapp' | 'sms', status: 'sent' | 'failed') => {
    setStats(prev => {
      const isSent = status === 'sent';
      const isWA = channel === 'whatsapp';
      return {
        ...prev,
        totalSent: isSent ? prev.totalSent + 1 : prev.totalSent,
        whatsappSent: isSent && isWA ? prev.whatsappSent + 1 : prev.whatsappSent,
        smsSent: isSent && !isWA ? prev.smsSent + 1 : prev.smsSent,
        failedCount: !isSent ? prev.failedCount + 1 : prev.failedCount,
        balanceWhatsApp: isSent && isWA ? Math.max(0, prev.balanceWhatsApp - 1) : prev.balanceWhatsApp,
        balanceSMS: isSent && !isWA ? Math.max(0, prev.balanceSMS - 1) : prev.balanceSMS,
        lastUpdated: new Date().toISOString()
      };
    });
  };

  const simulateNetworkRequest = (shouldFail: boolean) =>
    new Promise((resolve, reject) =>
      setTimeout(() => (shouldFail ? reject(new Error('Network Failure')) : resolve(true)), 800)
    );

  // ── Core send logic (used by sendMessage + scheduled executor) ───────────
  const sendMessageCore = async (
    msg: Omit<CentralMessage, 'id' | 'timestamp' | 'status' | 'retryCount'>,
    fallbackToSms = false
  ) => {
    const newMessage: CentralMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };

    setMessages(prev => [newMessage, ...prev]);

    let finalChannel = msg.channel;
    let success = false;
    let failureReason = '';

    try {
      // Developer test: include 'failwa' in content to simulate WA failure
      await simulateNetworkRequest(msg.content.includes('failwa'));
      success = true;
    } catch {
      if (msg.channel === 'whatsapp' && fallbackToSms) {
        // Only fall back to SMS when the user explicitly enabled the option
        try {
          finalChannel = 'sms';
          await simulateNetworkRequest(false);
          success = true;
          failureReason = ''; // clear — fallback succeeded
        } catch {
          success = false;
          failureReason = 'فشل الإرسال عبر WhatsApp والرسائل النصية';
        }
      } else {
        success = false;
        failureReason = msg.channel === 'whatsapp'
          ? 'فشل الإرسال عبر WhatsApp'
          : 'خطأ في مزود خدمة SMS';
      }
    }

    const finalStatus = success ? 'sent' : 'failed';

    setMessages(prev =>
      prev.map(m =>
        m.id === newMessage.id
          ? { ...m, status: finalStatus, channel: finalChannel, failureReason: success ? undefined : failureReason }
          : m
      )
    );

    updateStats(finalChannel, finalStatus);
  };

  // Keep a ref so the scheduler interval always calls the latest version
  const sendMessageCoreRef = useRef(sendMessageCore);
  useEffect(() => { sendMessageCoreRef.current = sendMessageCore; });

  // ── Scheduled message executor ───────────────────────────────────────────
  useEffect(() => {
    const checkAndExecute = () => {
      const now = new Date();
      setScheduledBatches(prev => {
        const due = prev.filter(b => new Date(b.scheduledFor) <= now);
        if (due.length === 0) return prev;

        due.forEach(batch => {
          batch.messages.forEach(msg =>
            sendMessageCoreRef.current(msg, batch.fallbackToSms)
          );
        });

        return prev.filter(b => new Date(b.scheduledFor) > now);
      });
    };

    checkAndExecute(); // Run immediately on mount to catch overdue messages
    const interval = setInterval(checkAndExecute, 60_000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // ── Public API ───────────────────────────────────────────────────────────
  const sendMessage = (
    msg: Omit<CentralMessage, 'id' | 'timestamp' | 'status' | 'retryCount'>,
    fallbackToSms = false
  ) => sendMessageCore(msg, fallbackToSms);

  const scheduleMessage = (batch: {
    scheduledFor: string;
    fallbackToSms: boolean;
    messages: Array<Omit<CentralMessage, 'id' | 'timestamp' | 'status' | 'retryCount'>>;
  }) => {
    const newBatch: ScheduledBatch = {
      id: `sched-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...batch,
    };
    setScheduledBatches(prev => [...prev, newBatch]);
  };

  const resendMessage = async (id: string) => {
    const msgToResend = messages.find(m => m.id === id);
    if (!msgToResend || msgToResend.status === 'sent') return;

    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'pending', failureReason: undefined } : m));

    let finalChannel = msgToResend.channel;
    let success = false;
    let failureReason = '';

    try {
      await simulateNetworkRequest(false);
      success = true;
    } catch {
      success = false;
      failureReason = 'فشل المحاولة مرة أخرى';
    }

    const finalStatus = success ? 'sent' : 'failed';

    setMessages(prev =>
      prev.map(m =>
        m.id === id
          ? { ...m, status: finalStatus, channel: finalChannel, failureReason: success ? undefined : failureReason, retryCount: (m.retryCount || 0) + 1 }
          : m
      )
    );

    updateStats(finalChannel, finalStatus);
  };

  const addTemplate = (template: Omit<MessageTemplate, 'id'>) => {
    setTemplates(prev => [...prev, { ...template, id: `tpl-${Date.now()}` }]);
  };

  const updateTemplate = (template: MessageTemplate) => {
    setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const restoreSystemTemplate = (id: string) => {
    const original = INITIAL_TEMPLATES.find(t => t.id === id);
    if (!original) return;
    setTemplates(prev => {
      const exists = prev.some(t => t.id === id);
      if (exists) return prev;
      return [...prev, original];
    });
  };

  const clearArchive = () => {
    if (confirm('هل أنت متأكد من مسح جميع السجلاʿ')) setMessages([]);
  };

  const rechargeBalance = (amount: number, type: 'whatsapp' | 'sms') => {
    setStats(prev => ({
      ...prev,
      balanceWhatsApp: type === 'whatsapp' ? prev.balanceWhatsApp + amount : prev.balanceWhatsApp,
      balanceSMS: type === 'sms' ? prev.balanceSMS + amount : prev.balanceSMS,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const buyPackage = (pkg: { name: string; wa: number; sms: number }) => {
    const start = new Date();
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1); // Validity: 12 months from purchase

    const startDateIso = start.toISOString().slice(0, 10);
    const endDateIso = end.toISOString().slice(0, 10);

    setStats(prev => ({
      ...prev,
      balanceWhatsApp: prev.balanceWhatsApp + pkg.wa,
      balanceSMS: prev.balanceSMS + pkg.sms,
      activePackageName: pkg.name,
      activePackageWA: pkg.wa,
      activePackageSMS: pkg.sms,
      messagePackageStartDate: startDateIso,
      messagePackageEndDate: endDateIso,
      messagePackageIsTrial: false,
      lastUpdated: new Date().toISOString(),
    }));
  };

  return (
    <MessageArchiveContext.Provider value={{
      messages, templates, stats, scheduledBatches,
      sendMessage, scheduleMessage, resendMessage,
      addTemplate, updateTemplate, deleteTemplate, restoreSystemTemplate,
      clearArchive, rechargeBalance, buyPackage,
    }}>
      {children}
    </MessageArchiveContext.Provider>
  );
};

export const useMessageArchive = () => {
  const context = useContext(MessageArchiveContext);
  if (!context) throw new Error('useMessageArchive must be used within MessageArchiveProvider');
  return context;
};
