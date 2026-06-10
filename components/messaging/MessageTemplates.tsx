import React, { useState } from 'react';
import MessageToast from './MessageToast';
import NotificationTemplates from './NotificationTemplates';

// تبويب القوالب = السجل المركزي فقط (قوالب الرسائل والإشعارات بكل مجموعاته)
// القوالب الحرة القديمة وبطاقة الإضافة أُزيلتا — التعديل أصبح عبر النص الافتراضي القابل للتخصيص لكل نوع.
const MessageTemplates: React.FC = () => {
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const showToast = (type: 'error' | 'success', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="animate-fade-in">
      <MessageToast toast={toast} onClose={() => setToast(null)} />
      <NotificationTemplates showToast={showToast} />
    </div>
  );
};

export default MessageTemplates;
