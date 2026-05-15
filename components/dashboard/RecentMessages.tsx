import React from 'react';
import { MessageSquare, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { Message } from '../../types';
import { useMessageArchive } from '../messaging/MessageArchiveContext';

const WhatsAppIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface RecentMessagesProps {
  messages: Message[];
  onOpenArchive: () => void;
}

const formatHijri = (date: Date) => {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB').format(date);
  }
};

const formatDay = (date: Date) =>
  new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(date);

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(date);

const getCurrentSenderName = () => {
  try {
    const profile = JSON.parse(localStorage.getItem('motabe_profile') || 'null');
    if (profile?.name?.trim()) return profile.name.trim();
  } catch {}
  return 'مدير النظام';
};

const RecentMessages: React.FC<RecentMessagesProps> = ({ messages = [], onOpenArchive }) => {
  const { messages: archivedMessages } = useMessageArchive();
  const displayMessages = React.useMemo<Message[]>(() => {
    if (archivedMessages.length > 0) {
      const batches = new Map<string, typeof archivedMessages>();
      archivedMessages.forEach(msg => {
        const key = msg.batchId || msg.id;
        if (!batches.has(key)) batches.set(key, []);
        batches.get(key)!.push(msg);
      });

      return Array.from(batches.entries())
        .map(([id, batch]) => {
          const first = batch[0];
          const roles = new Set(batch.map(msg => msg.recipientRole));
          const recipient =
            roles.has('guardian') ? 'أولياء الأمور' :
            roles.has('teacher') && roles.has('admin') ? 'معلمون وإداريون' :
            roles.has('teacher') ? 'المعلمون' :
            roles.has('admin') ? 'الإداريون' :
            first.recipientName;

          return {
            id,
            sender: first.senderName || getCurrentSenderName() || first.senderRole,
            recipient,
            content: first.originalContent || first.content,
            timestamp: first.timestamp,
            type: first.channel,
            status: batch.some(msg => msg.status === 'failed') ? 'failed' : first.status,
          };
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
    }

    const fallbackSender = getCurrentSenderName();
    return messages.map(msg => ({ ...msg, sender: fallbackSender }));
  }, [archivedMessages, messages]);

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow" dir="rtl">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-[#8779fb]" strokeWidth={1.8} />
          <h3 className="font-bold text-slate-800 text-lg">آخر الرسائل</h3>
        </div>
        <span className="text-sm font-black text-[#655ac1] bg-white px-3 py-1 rounded-full shadow shadow-slate-300">
          {displayMessages.length}
        </span>
      </div>

      {displayMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-300">
          <MessageSquare size={36} strokeWidth={1.5} className="mb-2 opacity-50" />
          <p className="text-xs font-bold">لا توجد رسائل</p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[11%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[7%]" />
            </colgroup>
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="text-slate-500">
                <th className="px-2 py-3 text-right text-[11px] font-black">اليوم</th>
                <th className="px-2 py-3 text-right text-[11px] font-black">التاريخ</th>
                <th className="px-2 py-3 text-right text-[11px] font-black">الوقت</th>
                <th className="px-2 py-3 text-right text-[11px] font-black">المرسل</th>
                <th className="px-2 py-3 text-right text-[11px] font-black">المستلم</th>
                <th className="px-2 py-3 text-right text-[11px] font-black">الإرسال</th>
                <th className="px-2 py-3 text-right text-[11px] font-black">الحالة</th>
                <th className="px-2 py-3 text-right text-[11px] font-black">عرض</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayMessages.map((msg, index) => {
                const date = new Date(msg.timestamp);
                const isWhatsapp = msg.type === 'whatsapp';
                const isSent = msg.status === 'sent';

                return (
                  <tr key={msg.id || index} className="hover:bg-slate-50/70 transition-colors align-top">
                    <td className="px-2 py-3 text-[11px] font-black text-slate-700 truncate">
                      {formatDay(date)}
                    </td>
                    <td className="px-2 py-3 text-[10px] font-medium text-slate-500 truncate">
                      {formatHijri(date)}
                    </td>
                    <td className="px-2 py-3 text-[11px] font-bold text-[#655ac1] truncate" dir="ltr">
                      {formatTime(date)}
                    </td>
                    <td className="px-2 py-3 text-[11px] font-bold text-[#655ac1] truncate">
                      {msg.sender}
                    </td>
                    <td className="px-2 py-3 text-[11px] font-bold text-slate-600 truncate">
                      {msg.recipient}
                    </td>
                    <td className="px-2 py-3">
                      <span className={`inline-flex max-w-full items-center gap-1 text-[11px] font-bold ${isWhatsapp ? 'text-[#25D366]' : 'text-[#655ac1]'}`}>
                        <span className="shrink-0">{isWhatsapp ? <WhatsAppIcon size={13} /> : <MessageSquare size={13} strokeWidth={2} />}</span>
                        <span className="truncate">{isWhatsapp ? 'واتساب' : 'رسالة نصية'}</span>
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      {isSent ? (
                        <span className="inline-flex max-w-full items-center gap-1 text-emerald-700 text-[10px] font-bold">
                          <CheckCircle2 size={12} />
                          <span className="truncate">تم الإرسال</span>
                        </span>
                      ) : (
                        <span className="inline-flex max-w-full items-center gap-1 text-red-600 text-[10px] font-bold">
                          <AlertTriangle size={12} />
                          <span className="truncate">فشل الإرسال</span>
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={onOpenArchive}
                        className="inline-flex items-center justify-center text-[#655ac1] hover:text-[#5448b0] transition-colors"
                        title="عرض"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentMessages;
