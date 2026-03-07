import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CentralMessage, MessageTemplate, MessageStats } from '../../types';

interface MessageArchiveContextType {
  messages: CentralMessage[];
  templates: MessageTemplate[];
  stats: MessageStats;
  sendMessage: (msg: Omit<CentralMessage, 'id' | 'timestamp' | 'status' | 'retryCount'>) => Promise<void>;
  resendMessage: (id: string) => Promise<void>;
  addTemplate: (template: Omit<MessageTemplate, 'id'>) => void;
  updateTemplate: (template: MessageTemplate) => void;
  deleteTemplate: (id: string) => void;
  clearArchive: () => void;
  rechargeBalance: (amount: number, type: 'whatsapp' | 'sms') => void;
  buyPackage: (pkg: {name: string, wa: number, sms: number}) => void;
}

const MessageArchiveContext = createContext<MessageArchiveContextType | undefined>(undefined);

const INITIAL_TEMPLATES: MessageTemplate[] = [
  { id: 't1', title: 'غياب طالب', content: 'المكرم ولي أمر الطالب {اسم_الطالب}، نود إشعاركم بغياب ابنكم اليوم {اليوم} الموافق {التاريخ}.', isSystem: true, category: 'غياب طالب' },
  { id: 't2', title: 'تأخر طالب', content: 'المكرم ولي أمر الطالب {اسم_الطالب}، نود إشعاركم بتأخر ابنكم عن الطابور الصباحي اليوم {اليوم}.', isSystem: true, category: 'تأخر طالب' },
  { id: 't3', title: 'مخالفة سلوكية', content: 'المكرم ولي أمر الطالب {اسم_الطالب}، نشعركم بارتكاب ابنكم لمخالفة سلوكية،نأمل زيارتكم للمدرسة في يوم (اليوم) وتاريخ (التاريخ)', isSystem: true, category: 'مخالفة سلوكية' },
];

export const MessageArchiveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<CentralMessage[]>(() => {
    try { return JSON.parse(localStorage.getItem('smart_messaging_archive_v1') || '[]'); } catch { return []; }
  });
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    try { 
      let stored: MessageTemplate[] = JSON.parse(localStorage.getItem('smart_messaging_templates_v1') || JSON.stringify(INITIAL_TEMPLATES));
      // Force update of system templates to reflect code changes
      stored = stored.map(t => {
        if (t.id === 't3') return INITIAL_TEMPLATES[2];
        return t;
      });
      return stored;
    } catch { return INITIAL_TEMPLATES; }
  });
  const [stats, setStats] = useState<MessageStats>(() => {
    try { 
      return JSON.parse(localStorage.getItem('smart_messaging_stats_v1') || 'null') || {
        totalSent: 0, whatsappSent: 0, smsSent: 0, failedCount: 0, balanceSMS: 1000, balanceWhatsApp: 1000, lastUpdated: new Date().toISOString()
      };
    } catch { 
      return { totalSent: 0, whatsappSent: 0, smsSent: 0, failedCount: 0, balanceSMS: 1000, balanceWhatsApp: 1000, lastUpdated: new Date().toISOString() };
    }
  });

  useEffect(() => {
    localStorage.setItem('smart_messaging_archive_v1', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('smart_messaging_templates_v1', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('smart_messaging_stats_v1', JSON.stringify(stats));
  }, [stats]);

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

  const simulateNetworkRequest = (shouldFail: boolean) => new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) reject(new Error('Network Failure'));
      else resolve(true);
    }, 800);
  });

  const sendMessage = async (msg: Omit<CentralMessage, 'id' | 'timestamp' | 'status' | 'retryCount'>) => {
    const newMessage: CentralMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
      batchId: msg.batchId,
      senderRole: msg.senderRole || 'مدير النظام',
    };

    setMessages(prev => [newMessage, ...prev]);

    // Send Logic: Failover
    let finalChannel = msg.channel;
    let success = false;
    let failureReason = '';

    try {
      // If WhatsApp, random chance to fail to show the failover, or based on some keyword
      // Let's say if content includes 'failwa' it fails WhatsApp
      const failWA = msg.content.includes('failwa');
      await simulateNetworkRequest(failWA);
      success = true;
    } catch (e: any) {
      if (msg.channel === 'whatsapp') {
        // Failover to SMS
        try {
          finalChannel = 'sms'; // switch channel
          // SMS might strip attachments practically, but here we just send
          const failSMS = msg.content.includes('failsms');
          await simulateNetworkRequest(failSMS);
          success = true;
        } catch (smsError: any) {
          success = false;
          failureReason = 'فشل الإرسال عبر WhatsApp و SMS';
        }
      } else {
        success = false;
        failureReason = 'خطأ في مزود خدمة SMS';
      }
    }

    const finalStatus = success ? 'sent' : 'failed';
    
    setMessages(prev => prev.map(m => m.id === newMessage.id ? {
      ...m,
      status: finalStatus,
      channel: finalChannel,
      failureReason: success ? undefined : failureReason
    } : m));

    updateStats(finalChannel, finalStatus);
  };

  const resendMessage = async (id: string) => {
    const msgToResend = messages.find(m => m.id === id);
    if (!msgToResend || msgToResend.status === 'sent') return;

    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'pending', failureReason: undefined } : m));

    let finalChannel = msgToResend.channel;
    let success = false;
    let failureReason = '';

    try {
      await simulateNetworkRequest(false); // second try highly likely to succeed in prototype
      success = true;
    } catch {
      success = false;
      failureReason = 'فشل المحاولة مرة أخرى';
    }

    const finalStatus = success ? 'sent' : 'failed';

    setMessages(prev => prev.map(m => m.id === id ? {
      ...m,
      status: finalStatus,
      channel: finalChannel,
      failureReason: success ? undefined : failureReason,
      retryCount: (m.retryCount || 0) + 1
    } : m));

    updateStats(finalChannel, finalStatus);
  };

  const addTemplate = (template: Omit<MessageTemplate, 'id'>) => {
    setTemplates(prev => [...prev, { ...template, id: `tpl-${Date.now()}` }]);
  };

  const updateTemplate = (template: MessageTemplate) => {
    setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id || t.isSystem));
  };

  const clearArchive = () => {
    if (confirm('هل أنت متأكد من مسح جميع السجلات؟')) {
      setMessages([]);
    }
  };

  const rechargeBalance = (amount: number, type: 'whatsapp' | 'sms') => {
    setStats(prev => ({
      ...prev,
      balanceWhatsApp: type === 'whatsapp' ? prev.balanceWhatsApp + amount : prev.balanceWhatsApp,
      balanceSMS: type === 'sms' ? prev.balanceSMS + amount : prev.balanceSMS
    }));
  };

  const buyPackage = (pkg: {name: string, wa: number, sms: number}) => {
    setStats(prev => ({
      ...prev,
      balanceWhatsApp: prev.balanceWhatsApp + pkg.wa,
      balanceSMS: prev.balanceSMS + pkg.sms,
      activePackageName: pkg.name,
      activePackageWA: pkg.wa,
      activePackageSMS: pkg.sms
    }));
  };

  return (
    <MessageArchiveContext.Provider value={{
      messages, templates, stats, sendMessage, resendMessage, addTemplate, updateTemplate, deleteTemplate, clearArchive, rechargeBalance, buyPackage
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
