import React, { useState, useRef } from 'react';
import { Shield, Clock, AlertTriangle, Users, Check, X, Edit3, Trash2, Plus, ChevronDown } from 'lucide-react';
import { DutyReportRecord, DutyStudentLate, DutyStudentViolation, SchoolInfo } from '../../types';
import SignaturePad, { SignaturePadRef } from '../ui/SignaturePad';

interface Props {
  staffId: string;
  staffName: string;
  day: string;
  date: string;
  schoolInfo: SchoolInfo;
  onClose: () => void;
  onSubmit: (report: DutyReportRecord) => void;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const LATE_ACTION_OPTIONS = [
  'التواصل مع ولي الأمر',
  'إبلاغ مدير المدرسة',
  'إبلاغ وكيل الشؤون التعليمية',
  'إبلاغ وكيل شؤون الطلاب',
  'إبلاغ وكيل الشؤون المدرسية',
  'إبلاغ الموجه الطلابي',
];
const VIOLATION_ACTION_OPTIONS = [
  'إبلاغ مدير المدرسة',
  'إبلاغ وكيل الشؤون التعليمية',
  'إبلاغ وكيل شؤون الطلاب',
  'إبلاغ وكيل الشؤون المدرسية',
  'إبلاغ الموجه الطلابي',
];

// ── Multi-Select Dropdown ────────────────────────────────────────────────────
const MultiSelectDropdown: React.FC<{
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ options, value, onChange, placeholder = 'اختر الإجراء' }) => {
  const [open, setOpen] = useState(false);
  const selected = value ? value.split(' | ').filter(Boolean) : [];
  const toggle = (o: string) => {
    const ns = selected.includes(o) ? selected.filter(s => s !== o) : [...selected, o];
    onChange(ns.join(' | '));
  };
  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:border-[#8779fb] focus:ring-[#8779fb] flex items-center gap-1 relative z-[91] min-h-[28px]"
      >
        <span className="truncate flex-1 text-right">
          {selected.length === 0
            ? <span className="text-slate-400">{placeholder}</span>
            : <span className="text-slate-700">{selected.join('، ')}</span>
          }
        </span>
        <ChevronDown size={10} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-[99] top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[200px] py-1 right-0">
          {options.map(o => (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className="w-full text-right px-3 py-2 text-xs font-medium hover:bg-violet-50 flex items-center gap-2 transition-colors"
            >
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                selected.includes(o) ? 'bg-[#8779fb] border-[#8779fb]' : 'border-slate-300'
              }`}>
                {selected.includes(o) && <Check size={9} className="text-white" />}
              </span>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── helpers ──────────────────────────────────────────────────────────────────
const emptyLate = (): Omit<DutyStudentLate, 'id'> => ({
  studentName: '', gradeAndClass: '', exitTime: '', actionTaken: '', notes: ''
});
const emptyViolation = (): Omit<DutyStudentViolation, 'id'> => ({
  studentName: '', gradeAndClass: '', violationType: '', actionTaken: '', notes: ''
});

// Hijri date helper (browser-native)
const toHijri = (dateStr: string) => {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(d);
  } catch { return ''; }
};

const DAY_NAMES_AR: Record<string, string> = {
  sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت'
};

const DutyReportEntry: React.FC<Props> = ({
  staffId, staffName, day, date, schoolInfo, onClose, onSubmit, showToast
}) => {
  // ── 5 default (empty) rows for each table ───────────────────────────────
  const [lateRows, setLateRows] = useState<(Omit<DutyStudentLate, 'id'>)[]>([
    ...Array(5).fill(null).map(() => emptyLate())
  ]);
  const [violationRows, setViolationRows] = useState<(Omit<DutyStudentViolation, 'id'>)[]>([
    ...Array(5).fill(null).map(() => emptyViolation())
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const signatureRef = useRef<SignaturePadRef>(null);

  const hijriDate = toHijri(date);

  // ── row updaters ────────────────────────────────────────────────────────
  const updateLateField = (idx: number, field: keyof Omit<DutyStudentLate, 'id'>, value: string) => {
    setLateRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };
  const updateViolationField = (idx: number, field: keyof Omit<DutyStudentViolation, 'id'>, value: string) => {
    setViolationRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addLateRow = () => setLateRows(prev => [...prev, emptyLate()]);
  const addViolationRow = () => setViolationRows(prev => [...prev, emptyViolation()]);

  const removeLateRow = (idx: number) => setLateRows(prev => prev.filter((_, i) => i !== idx));
  const removeViolationRow = (idx: number) => setViolationRows(prev => prev.filter((_, i) => i !== idx));

  // ── submit ─────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (signatureRef.current?.isEmpty()) {
      showToast('يرجى توقيع التقرير أولاً', 'warning');
      return;
    }

    const filledLate = lateRows.filter(r => r.studentName.trim());
    const filledViol = violationRows.filter(r => r.studentName.trim());

    setIsSubmitting(true);
    const signatureImage = signatureRef.current?.getSignature() || undefined;

    const report: DutyReportRecord = {
      id: Date.now().toString(),
      date,
      day,
      staffId,
      staffName,
      lateStudents: filledLate.map((s, i) => ({ ...s, id: `late-${i}` })),
      violatingStudents: filledViol.map((s, i) => ({ ...s, id: `viol-${i}` })),
      status: 'present',
      isSubmitted: true,
      signature: signatureImage || undefined,
      submittedAt: new Date().toISOString(),
      isEmpty: filledLate.length === 0 && filledViol.length === 0,
    };

    setTimeout(() => {
      onSubmit(report);
      setIsSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  // ── shared input style ───────────────────────────────────────────────────
  const inp = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:border-[#8779fb] focus:ring-[#8779fb]';
  const sel = inp + ' cursor-pointer';

  // ── Success Screen ────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="fixed inset-0 bg-slate-50 z-[9999] flex flex-col items-center justify-center gap-6 p-8" dir="rtl">
        <div className="w-28 h-28 rounded-full bg-[#e5e1fe] flex items-center justify-center shadow-xl">
          <Check size={56} className="text-[#655ac1]" strokeWidth={3} />
        </div>
        <div className="text-center space-y-2">
          <p className="text-2xl font-black text-slate-800">تم إرسال التقرير بنجاح</p>
          <p className="text-sm font-medium text-slate-500">تم استلام نموذج تقرير المناوبة اليومية</p>
          <p className="text-sm font-bold text-[#655ac1]">{staffName}</p>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 w-full max-w-sm space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">اليوم</span>
            <span className="font-black text-slate-800">{DAY_NAMES_AR[day] || day}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">حالة التقرير</span>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-3 py-1 rounded-full">✔ مُرسَل</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="px-10 py-3.5 bg-[#8779fb] hover:bg-[#655ac1] active:scale-95 text-white rounded-2xl font-black shadow-lg shadow-[#8779fb]/20 transition-all"
        >
          إغلاق
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 z-[9999] overflow-y-auto flex flex-col animate-in fade-in slide-in-from-bottom-4" dir="rtl">

      <div className="flex-1 w-full max-w-4xl mx-auto p-4 space-y-5 pb-24">

        {/* ── Official Letterhead ────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Three-column header row */}
          <div className="bg-gradient-to-b from-[#f5f3ff] to-white px-5 pt-5 pb-4 border-b border-violet-100">
            <div className="grid grid-cols-3 gap-3 items-start">
              {/* Right: Education Administration + School */}
              <div className="text-right space-y-1">
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed">المملكة العربية السعودية</p>
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed">وزارة التعليم</p>
                {schoolInfo.educationAdministration ? (
                  <p className="text-[11px] font-black text-[#655ac1] leading-relaxed">{schoolInfo.educationAdministration}</p>
                ) : schoolInfo.region ? (
                  <p className="text-[11px] font-black text-[#655ac1] leading-relaxed">الإدارة العامة للتعليم بمنطقة {schoolInfo.region}</p>
                ) : null}
                <p className="text-xs font-black text-slate-800 mt-1 leading-snug">{schoolInfo.schoolName}</p>
              </div>

              {/* Center: Emblem + Title */}
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-16 h-16 rounded-full bg-[#e5e1fe] border-4 border-[#8779fb]/30 flex items-center justify-center shadow-md shrink-0">
                  <Shield size={30} className="text-[#655ac1]" />
                </div>
                <p className="text-[11px] font-black text-slate-800 leading-tight">نموذج تقرير المناوبة اليومية</p>
              </div>

              {/* Left: Year + Semester + Date */}
              <div className="text-left space-y-1">
                <p className="text-[10px] font-bold text-slate-500">العام الدراسي</p>
                <p className="text-xs font-black text-slate-800">{schoolInfo.academicYear || '—'}</p>
                {schoolInfo.semesters?.find(s => s.isCurrent) && (
                  <>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">الفصل الدراسي</p>
                    <p className="text-xs font-black text-slate-800">{schoolInfo.semesters.find(s => s.isCurrent)?.name || '—'}</p>
                  </>
                )}
                <p className="text-[10px] font-bold text-slate-500 mt-1">اليوم / التاريخ</p>
                <p className="text-xs font-black text-slate-800">{DAY_NAMES_AR[day] || day}</p>
                <p className="text-[10px] text-slate-500 font-medium">{hijriDate}</p>
              </div>
            </div>
          </div>

          {/* Supervisor info row */}
          <div className="px-5 py-3 flex items-center gap-3 bg-violet-50/40">
            <div className="w-8 h-8 bg-[#e5e1fe] text-[#655ac1] rounded-xl flex items-center justify-center shrink-0">
              <Shield size={16} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-slate-500">المناوب:</p>
              <p className="text-sm font-black text-[#655ac1]">{staffName}</p>
            </div>
          </div>
        </div>

        {/* ── Late Students Table ──────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 bg-[#655ac1] flex items-center gap-2">
            <Clock size={15} className="text-white" />
            <span className="text-sm font-black text-white">الطلاب المتأخرون</span>
            <span className="mr-auto bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {lateRows.filter(r => r.studentName.trim()).length} طالب
            </span>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#655ac1]/10 text-[#655ac1] text-center">
                  <th className="p-2 rounded-tr-lg w-8">م</th>
                  <th className="p-2">اسم الطالب</th>
                  <th className="p-2">الصف / الفصل</th>
                  <th className="p-2 w-28">زمن الانصراف</th>
                  <th className="p-2 w-36">الإجراء</th>
                  <th className="p-2">ملاحظات</th>
                  <th className="p-2 rounded-tl-lg w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lateRows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="p-1.5 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="p-1.5">
                      <input className={inp} value={row.studentName} onChange={e => updateLateField(idx, 'studentName', e.target.value)} placeholder="الاسم الرباعي" />
                    </td>
                    <td className="p-1.5">
                      <input className={inp} value={row.gradeAndClass} onChange={e => updateLateField(idx, 'gradeAndClass', e.target.value)} placeholder="ثالث / ٢" />
                    </td>
                    <td className="p-1.5">
                      <input className={inp} type="time" value={row.exitTime} onChange={e => updateLateField(idx, 'exitTime', e.target.value)} />
                    </td>
                    <td className="p-1.5">
                      <MultiSelectDropdown
                        options={LATE_ACTION_OPTIONS}
                        value={row.actionTaken}
                        onChange={v => updateLateField(idx, 'actionTaken', v)}
                      />
                    </td>
                    <td className="p-1.5">
                      <textarea
                        className={inp + ' resize-none min-h-[40px] leading-relaxed'}
                        value={row.notes || ''}
                        onChange={e => updateLateField(idx, 'notes', e.target.value)}
                        placeholder="ملاحظات تفصيلية..."
                        rows={2}
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      {lateRows.length > 1 && (
                        <button onClick={() => removeLateRow(idx)} className="w-6 h-6 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg mx-auto transition-colors">
                          <X size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addLateRow} className="mt-3 w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-[#655ac1] hover:border-indigo-300 hover:bg-violet-50/50 text-xs font-bold flex items-center justify-center gap-1 transition-all">
              <Plus size={13} /> إضافة صف
            </button>
          </div>
        </div>

        {/* ── Violations Table ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 bg-[#7c6ff0] flex items-center gap-2">
            <AlertTriangle size={15} className="text-white" />
            <span className="text-sm font-black text-white">الطلاب المخالفون سلوكياً</span>
            <span className="mr-auto bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {violationRows.filter(r => r.studentName.trim()).length} طالب
            </span>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#7c6ff0]/10 text-[#7c6ff0] text-center">
                  <th className="p-2 rounded-tr-lg w-8">م</th>
                  <th className="p-2">اسم الطالب</th>
                  <th className="p-2">الصف / الفصل</th>
                  <th className="p-2 w-32">المخالفة السلوكية</th>
                  <th className="p-2 w-36">الإجراء</th>
                  <th className="p-2">ملاحظات</th>
                  <th className="p-2 rounded-tl-lg w-8"></th>
                </tr>
              </thead>
              <tbody>
                {violationRows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-violet-50/30'}>
                    <td className="p-1.5 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="p-1.5">
                      <input className={inp} value={row.studentName} onChange={e => updateViolationField(idx, 'studentName', e.target.value)} placeholder="الاسم الرباعي" />
                    </td>
                    <td className="p-1.5">
                      <input className={inp} value={row.gradeAndClass} onChange={e => updateViolationField(idx, 'gradeAndClass', e.target.value)} placeholder="ثالث / ٢" />
                    </td>
                    <td className="p-1.5">
                      <input
                        className={inp}
                        value={row.violationType}
                        onChange={e => updateViolationField(idx, 'violationType', e.target.value)}
                        placeholder="كتابة المخالفة..."
                      />
                    </td>
                    <td className="p-1.5">
                      <MultiSelectDropdown
                        options={VIOLATION_ACTION_OPTIONS}
                        value={row.actionTaken}
                        onChange={v => updateViolationField(idx, 'actionTaken', v)}
                      />
                    </td>
                    <td className="p-1.5">
                      <input className={inp} value={row.notes || ''} onChange={e => updateViolationField(idx, 'notes', e.target.value)} placeholder="اختياري" />
                    </td>
                    <td className="p-1.5 text-center">
                      {violationRows.length > 1 && (
                        <button onClick={() => removeViolationRow(idx)} className="w-6 h-6 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg mx-auto transition-colors">
                          <X size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addViolationRow} className="mt-3 w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-[#8779fb] hover:border-violet-300 hover:bg-violet-50/50 text-xs font-bold flex items-center justify-center gap-1 transition-all">
              <Plus size={13} /> إضافة صف
            </button>
          </div>
        </div>

        {/* ── Signature Pad ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-black text-slate-800 text-sm mb-3 flex items-center gap-2">
            <Edit3 size={18} className="text-[#8779fb]" /> التوقيع
          </h3>
          <div className="border-2 border-dashed border-slate-200 rounded-2xl h-40 bg-slate-50 relative overflow-hidden group">
            <SignaturePad
              ref={signatureRef}
              penColor="#1e293b"
              canvasClassName="w-full h-full"
            />
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-40 group-hover:opacity-10 transition-opacity">
              <Edit3 size={32} className="text-slate-400 mb-2" />
              <span className="text-xs font-bold text-slate-400">وقّع هنا داخل المربع</span>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); signatureRef.current?.clear(); }}
              className="absolute top-2 left-2 p-1.5 bg-white shadow-sm border border-slate-200 rounded-lg text-slate-500 hover:text-rose-500 z-10"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="pb-8">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-[#8779fb] hover:bg-[#655ac1] active:scale-95 text-white py-4 rounded-2xl font-black shadow-lg shadow-[#8779fb]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
          >
            {isSubmitting ? (
              <span className="animate-pulse">جاري الإرسال...</span>
            ) : (
              <><Check size={20} /> إرسال التقرير</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DutyReportEntry;
