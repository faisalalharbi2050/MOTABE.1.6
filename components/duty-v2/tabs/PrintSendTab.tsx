import React, { useMemo, useState } from 'react';
import {
  Archive, CalendarClock, CheckCircle2, ClipboardCheck, ClipboardList,
  Eye, MessageSquare, Printer, RefreshCw, Send, SlidersHorizontal, Users,
} from 'lucide-react';
import { DutyScheduleData, SchoolInfo } from '../../../types';
import { DAY_NAMES } from '../../../utils/dutyUtils';

interface Props {
  dutyData: DutyScheduleData;
  schoolInfo: SchoolInfo;
  onOpenLegacyPrint: () => void;
  onOpenLegacySend: () => void;
  onOpenArchive?: () => void;
  showToast?: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

type TaskMode = 'print' | 'send';
type PaperSize = 'A4' | 'A3';
type PrintColorMode = 'color' | 'bw';
type PrintSignatureMode = 'with' | 'without';
type SendMode = 'assignment' | 'reminder' | 'report';
type SendChannel = 'whatsapp' | 'sms';

const actionButtonClass = (active: boolean) =>
  `inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-black transition-all ${
    active
      ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-md shadow-[#655ac1]/20'
      : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-slate-50'
  }`;

const FieldSelect: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}> = ({ label, value, onChange, options }) => (
  <div className="flex-1 min-w-[220px]">
    <label className="block text-xs font-black text-slate-500 mb-2">{label}</label>
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all outline-none"
    >
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
);

const PrintSendTab: React.FC<Props> = ({
  dutyData,
  schoolInfo,
  onOpenLegacyPrint,
  onOpenLegacySend,
  onOpenArchive,
  showToast,
}) => {
  const [taskMode, setTaskMode] = useState<TaskMode>('print');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [printColorMode, setPrintColorMode] = useState<PrintColorMode>('color');
  const [printSignatureMode, setPrintSignatureMode] = useState<PrintSignatureMode>('without');
  const [showNotesField, setShowNotesField] = useState(false);
  const [footerText, setFooterText] = useState(dutyData.footerText || '');
  const [sendMode, setSendMode] = useState<SendMode>('assignment');
  const [sendChannel, setSendChannel] = useState<SendChannel>('whatsapp');
  const [isSendScheduled, setIsSendScheduled] = useState(false);
  const [sendScheduleTime, setSendScheduleTime] = useState(dutyData.settings.reminderSendTime || '07:00');
  const [messageText, setMessageText] = useState(dutyData.settings.reminderMessageTemplate || '');
  const [receiptOpen, setReceiptOpen] = useState(false);

  const sendRows = useMemo(() => {
    return dutyData.dayAssignments.flatMap(day =>
      day.staffAssignments.map(staff => ({
        key: `${day.date || day.day}-${staff.staffId}`,
        day: day.day,
        date: day.date || '',
        staffName: staff.staffName,
        staffType: staff.staffType === 'teacher' ? 'معلم' : 'إداري',
        status: staff.signatureData ? 'signed' : staff.signatureStatus === 'pending' ? 'pending' : 'none',
      }))
    );
  }, [dutyData.dayAssignments]);

  const signedCount = sendRows.filter(row => row.status === 'signed').length;
  const pendingCount = sendRows.filter(row => row.status !== 'signed').length;
  const hasData = sendRows.length > 0;

  if (receiptOpen) {
    return (
      <div className="space-y-5" dir="rtl">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-slate-800 text-lg">سجل استلام المناوبة اليومية</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {signedCount} وقّع من أصل {sendRows.length} مناوب
              </p>
            </div>
            <button type="button" onClick={() => setReceiptOpen(false)} className={actionButtonClass(false)}>
              رجوع
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'إجمالي المناوبين', value: String(sendRows.length), icon: Users },
            { label: 'وقّعوا', value: String(signedCount), icon: CheckCircle2 },
            { label: 'لم يوقعوا بعد', value: String(pendingCount), icon: ClipboardList },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl px-4 py-5 flex items-start gap-3 shadow-sm">
              <div className="flex items-center justify-center shrink-0 text-[#655ac1]">
                <s.icon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-400 leading-none">{s.label}</p>
                <p className="mt-1 font-black text-slate-800 text-xl leading-none">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4">
            <p className="text-sm font-black text-slate-800 flex items-center gap-2">
              <ClipboardList size={18} className="text-[#655ac1]" />
              سجل الاستلام
            </p>
            <button type="button" onClick={onOpenLegacySend} className={actionButtonClass(false)}>
              <RefreshCw size={15} />
              فتح نافذة الإرسال
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-right" dir="rtl">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-4 py-3 font-black text-[#655ac1] text-[12px] w-14">م</th>
                  <th className="px-4 py-3 font-black text-[#655ac1] text-[12px]">المناوب</th>
                  <th className="px-4 py-3 font-black text-[#655ac1] text-[12px]">الصفة</th>
                  <th className="px-4 py-3 font-black text-[#655ac1] text-[12px]">اليوم</th>
                  <th className="px-4 py-3 font-black text-[#655ac1] text-[12px]">التاريخ</th>
                  <th className="px-4 py-3 font-black text-[#655ac1] text-[12px] text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sendRows.map((row, index) => (
                  <tr key={row.key} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-[12px] font-bold">{index + 1}</td>
                    <td className="px-4 py-3 font-black text-slate-800 text-[13px]">{row.staffName}</td>
                    <td className="px-4 py-3 text-slate-500 text-[12px]">{row.staffType}</td>
                    <td className="px-4 py-3 text-slate-600 text-[12px] font-bold">{DAY_NAMES[row.day] || row.day}</td>
                    <td className="px-4 py-3 text-slate-500 text-[12px]">{row.date || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${
                        row.status === 'signed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {row.status === 'signed' ? 'وقّع' : 'لم يوقع'}
                      </span>
                    </td>
                  </tr>
                ))}
                {sendRows.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-14 text-center text-sm font-bold text-slate-400">لا توجد طلبات استلام مرسلة بعد.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'print' as TaskMode, label: 'طباعة', icon: Printer },
            { id: 'send' as TaskMode, label: 'إرسال', icon: Send },
          ].map(option => (
            <button key={option.id} type="button" onClick={() => setTaskMode(option.id)}
              className={actionButtonClass(taskMode === option.id)}>
              <option.icon size={17} />
              {option.label}
            </button>
          ))}
          <button type="button" onClick={() => setReceiptOpen(true)} className={actionButtonClass(false)}>
            <ClipboardList size={17} />
            سجل استلام المناوبة اليومية
          </button>
          <button type="button" onClick={onOpenArchive || (() => showToast?.('أرشيف الرسائل متاح من قسم الرسائل', 'warning'))} className={actionButtonClass(false)}>
            <Archive size={17} />
            أرشيف الرسائل
          </button>
        </div>
      </div>

      {taskMode === 'print' && (
        <div className="space-y-4">
          <div className="px-1">
            <h3 className="font-black text-slate-800 text-lg">الطباعة</h3>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-start gap-3 mb-2">
              <SlidersHorizontal size={20} className="text-[#655ac1]" />
              <h4 className="font-black text-slate-800">تخصيص الطباعة</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium text-right mb-5">
              اضبط مقاس الورق والألوان وخانة التوقيع والملاحظات قبل طباعة جدول المناوبة.
            </p>

            <div className="flex flex-wrap items-end gap-4 mb-5">
              <FieldSelect
                label="مقاس الورق"
                value={paperSize}
                onChange={value => setPaperSize(value as PaperSize)}
                options={[{ value: 'A4', label: 'A4' }, { value: 'A3', label: 'A3' }]}
              />
              <FieldSelect
                label="اللون"
                value={printColorMode}
                onChange={value => setPrintColorMode(value as PrintColorMode)}
                options={[{ value: 'color', label: 'ملون' }, { value: 'bw', label: 'أبيض وأسود' }]}
              />
              <FieldSelect
                label="خانة توقيع المناوب"
                value={printSignatureMode}
                onChange={value => setPrintSignatureMode(value as PrintSignatureMode)}
                options={[
                  { value: 'with', label: 'إضافة عامود توقيع لكل مناوب' },
                  { value: 'without', label: 'بدون إضافة عامود توقيع لكل مناوب' },
                ]}
              />
            </div>

            <div className="mb-5">
              <label className="block text-xs font-black text-slate-500 mb-2">الملاحظات</label>
              <p className="text-xs font-bold text-slate-600 mb-3">
                هل تريد إضافة ملاحظات في جدول المناوبة اليومية قبل الطباعة؟{' '}
                <button
                  type="button"
                  onClick={() => setShowNotesField(open => !open)}
                  className="text-[#8779fb] hover:text-[#655ac1] underline underline-offset-4"
                >
                  {showNotesField ? 'إلغاء' : 'انقر هنا'}
                </button>
              </p>
              {showNotesField && (
                <textarea
                  value={footerText}
                  onChange={e => setFooterText(e.target.value)}
                  placeholder="ملاحظات جدول المناوبة..."
                  rows={3}
                  className="w-full border-2 border-slate-100 rounded-xl p-4 outline-none focus:border-[#655ac1] resize-none text-sm leading-relaxed transition-colors"
                  dir="rtl"
                />
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden mb-5">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-black text-[#655ac1]">اليوم</th>
                    <th className="px-4 py-3 font-black text-[#655ac1]">التاريخ</th>
                    <th className="px-4 py-3 font-black text-[#655ac1]">المناوب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sendRows.slice(0, 6).map(row => (
                    <tr key={row.key}>
                      <td className="px-4 py-3 font-bold text-slate-700">{DAY_NAMES[row.day] || row.day}</td>
                      <td className="px-4 py-3 font-bold text-slate-500">{row.date || '-'}</td>
                      <td className="px-4 py-3 font-black text-slate-800">{row.staffName}</td>
                    </tr>
                  ))}
                  {sendRows.length === 0 && (
                    <tr><td colSpan={3} className="px-6 py-10 text-center text-sm font-bold text-slate-400">لا توجد بيانات مناوبة للطباعة.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={onOpenLegacyPrint}
                disabled={!hasData}
                className="inline-flex min-w-[160px] items-center justify-center gap-2 px-10 py-2.5 rounded-xl border border-[#655ac1] bg-[#655ac1] text-white text-sm font-black hover:bg-[#5046a0] transition-all shadow-md shadow-[#655ac1]/20 disabled:opacity-50"
              >
                <Printer size={16} />
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}

      {taskMode === 'send' && (
        <div className="space-y-4">
          <div className="px-1">
            <h3 className="font-black text-slate-800 text-lg">إرسال المناوبة</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-start gap-3 mb-2">
                <ClipboardCheck size={20} className="text-[#655ac1]" />
                <h4 className="font-black text-slate-800">اختر نوع الإشعار والمستلمين</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium text-right mb-5">
                اختر نوع الإشعار ثم تابع معاينة المستلمين وإرسال المناوبة.
              </p>
              <div className="space-y-4">
                <FieldSelect
                  label="نوع الإشعار"
                  value={sendMode}
                  onChange={value => setSendMode(value as SendMode)}
                  options={[
                    { value: 'assignment', label: 'رسالة تكليف بالمناوبة اليومية' },
                    { value: 'reminder', label: 'رسالة تذكير يومية بالمناوبة' },
                    { value: 'report', label: 'إرسال تقرير المناوبة اليومية' },
                  ]}
                />
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarClock size={16} className="text-[#655ac1]" />
                      <span className="text-sm font-black text-slate-700">جدولة الإرسال لوقت لاحق</span>
                    </div>
                    <button type="button" onClick={() => setIsSendScheduled(c => !c)}
                      className={`relative inline-flex w-10 h-6 rounded-full transition-all ${isSendScheduled ? 'bg-[#655ac1]' : 'bg-slate-300'}`}
                      role="switch" aria-checked={isSendScheduled}>
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isSendScheduled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  {isSendScheduled && (
                    <div className="mt-3">
                      <label className="text-xs font-black text-slate-500 block mb-1.5">الوقت</label>
                      <input
                        type="time"
                        value={sendScheduleTime}
                        onChange={event => setSendScheduleTime(event.target.value)}
                        className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#655ac1] transition-colors"
                      />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all"
                >
                  <Users size={15} />
                  معاينة المستلمين ({sendRows.length})
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-start gap-3 mb-4">
                  <MessageSquare size={20} className="text-[#655ac1]" />
                  <h4 className="font-black text-slate-800">طريقة الإرسال المفضلة</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'whatsapp' as SendChannel, label: 'واتساب', color: '#25D366' },
                    { id: 'sms' as SendChannel, label: 'النصية SMS', color: '#007AFF' },
                  ].map(option => (
                    <button key={option.id} type="button" onClick={() => setSendChannel(option.id)}
                      className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${
                        sendChannel === option.id ? 'bg-white shadow-sm' : 'border-slate-100 hover:border-slate-200'
                      }`}
                      style={sendChannel === option.id ? { borderColor: option.color } : undefined}>
                      <MessageSquare size={28} style={{ color: sendChannel === option.id ? option.color : '#cbd5e1' }} />
                      <span className="font-black mt-2 text-sm" style={{ color: sendChannel === option.id ? option.color : '#94a3b8' }}>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={20} className="text-[#655ac1]" />
                    <h4 className="font-black text-slate-800">نص الرسالة</h4>
                  </div>
                  <button
                    type="button"
                    title="استعادة النص الافتراضي"
                    onClick={() => setMessageText(dutyData.settings.reminderMessageTemplate || 'نذكركم بمهمة المناوبة اليومية لهذا اليوم.')}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all"
                  >
                    <RefreshCw size={14} className="text-[#655ac1]" />
                  </button>
                </div>
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  rows={5}
                  className="w-full border-2 border-slate-100 rounded-xl p-4 outline-none focus:border-[#655ac1] resize-none text-sm leading-relaxed transition-colors mb-4"
                  placeholder="نص الرسالة..."
                  dir="rtl"
                />
                <button
                  type="button"
                  onClick={onOpenLegacySend}
                  disabled={!hasData}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#655ac1] text-white font-black shadow-md shadow-[#655ac1]/20 hover:bg-[#5046a0] transition-all disabled:opacity-50"
                >
                  <Send size={16} />
                  إرسال عبر {sendChannel === 'whatsapp' ? 'واتساب' : 'الرسائل النصية'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintSendTab;
