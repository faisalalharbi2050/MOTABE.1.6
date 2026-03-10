import React, { useState } from 'react';
import { MessageSquare, X, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { Message } from '../../types';

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface RecentMessagesProps {
  messages: Message[];
}

const formatHijri = (date: Date) => {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB').format(date);
  }
};

const formatGregorian = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);

const formatDay = (date: Date) =>
  new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(date);

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(date);

const RecentMessages: React.FC<RecentMessagesProps> = ({ messages = [] }) => {
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);

  return (
    <>
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full" dir="rtl">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} className="text-[#8779fb]" strokeWidth={1.8} />
            <h3 className="font-bold text-slate-800 text-lg">آخر الرسائل</h3>
          </div>
          <span className="text-sm font-black text-[#655ac1] bg-white px-3 py-1 rounded-full shadow shadow-slate-300">{messages.length}</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-300">
              <MessageSquare size={36} strokeWidth={1.5} className="mb-2 opacity-50" />
              <p className="text-xs font-bold">لا توجد رسائل</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const date = new Date(msg.timestamp);
              const isWhatsapp = msg.type === 'whatsapp';
              const isSent = msg.status === 'sent';
              return (
                <div
                  key={msg.id || index}
                  onClick={() => setSelectedMsg(msg)}
                  className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-[#8779fb]/30 hover:bg-white hover:shadow-sm transition-all cursor-pointer group"
                >
                  {/* Top row: channel badge + status + time */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center ${isWhatsapp ? 'text-[#25D366]' : 'text-[#655ac1]'}`}>
                        {isWhatsapp ? <WhatsAppIcon size={16} /> : <MessageSquare size={15} strokeWidth={2} />}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSent
                        ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 size={11} /> ناجح</span>
                        : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500"><AlertTriangle size={11} /> فشل</span>
                      }
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold" dir="ltr">
                        <Clock size={11} />
                        {formatTime(date)}
                      </div>
                    </div>
                  </div>

                  {/* Message content preview */}
                  <p className="text-sm font-bold text-slate-700 leading-snug line-clamp-2 mb-2">{msg.content}</p>

                  {/* Bottom row: sender → recipient + date */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="font-bold text-[#655ac1]">{msg.sender}</span>
                      <span className="text-slate-300">←</span>
                      <span className="font-bold text-slate-600 truncate max-w-[80px]">{msg.recipient}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {formatDay(date)} {formatHijri(date)} هـ
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedMsg && (() => {
        const msg = selectedMsg;
        const date = new Date(msg.timestamp);
        const isWhatsapp = msg.type === 'whatsapp';
        const isSent = msg.status === 'sent';

        const rows: { label: string; value: React.ReactNode }[] = [
          { label: 'اليوم',         value: <span className="font-bold text-slate-700">{formatDay(date)}</span> },
          { label: 'التاريخ',       value: (
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-slate-700">{formatHijri(date)} هـ</span>
              <span className="text-[11px] text-slate-400">{formatGregorian(date)} م</span>
            </div>
          )},
          { label: 'الوقت',         value: <span className="font-mono font-bold text-slate-700" dir="ltr">{formatTime(date)}</span> },
          { label: 'المرسل',        value: <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-xs">{msg.sender}</span> },
          { label: 'المستلم',       value: <span className="font-bold text-slate-700">{msg.recipient}</span> },
          { label: 'عدد المرسل لهم', value: <span className="font-black text-lg text-slate-700">1</span> },
          { label: 'نص الرسالة',    value: <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p> },
          { label: 'طريقة الإرسال', value: (
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${isWhatsapp ? 'text-[#075e54]' : 'text-[#655ac1]'}`}>
              {isWhatsapp ? <WhatsAppIcon size={15} /> : <MessageSquare size={14} strokeWidth={2} />}
              {isWhatsapp ? 'واتساب' : 'رسالة نصية'}
            </span>
          )},
          { label: 'رقم الجوال',    value: <span className="font-mono text-slate-600 text-xs" dir="ltr">—</span> },
          { label: 'الحالة',        value: isSent
            ? <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold"><CheckCircle2 size={13} /> تم الإرسال</div>
            : <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold"><AlertTriangle size={13} /> فشل الإرسال</div>
          },
        ];

        return (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedMsg(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#e5e1fe] flex items-center justify-center">
                    <MessageSquare size={16} className="text-[#655ac1]" />
                  </div>
                  <h3 className="font-black text-slate-800">تفاصيل الرسالة</h3>
                </div>
                <button
                  onClick={() => setSelectedMsg(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X size={18} className="text-slate-500" />
                </button>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {rows.map(row => (
                      <tr key={row.label} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3 font-bold text-slate-500 text-xs whitespace-nowrap w-36 bg-slate-50/50">
                          {row.label}
                        </td>
                        <td className="px-5 py-3">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedMsg(null)}
                  className="px-5 py-2 bg-[#655ac1] text-white rounded-xl text-sm font-bold hover:bg-[#564cb3] transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

export default RecentMessages;
