import React, { useState, useRef } from 'react';
import { Check, X, Trash2, Plus, ChevronDown, AlertCircle } from 'lucide-react';
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
        className="w-full text-right bg-white border border-slate-300 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:border-[#655ac1] focus:ring-[#655ac1]/30 flex items-center gap-1 relative z-[91] min-h-[28px]"
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
                selected.includes(o) ? 'bg-[#655ac1] border-[#655ac1]' : 'border-slate-300'
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

const emptyLate = (): Omit<DutyStudentLate, 'id'> => ({
  studentName: '', gradeAndClass: '', exitTime: '', actionTaken: '', notes: ''
});
const emptyViolation = (): Omit<DutyStudentViolation, 'id'> => ({
  studentName: '', gradeAndClass: '', violationType: '', actionTaken: '', notes: ''
});

const toHijri = (dateStr: string) => {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(d);
  } catch { return ''; }
};

const printDateAr = () => {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  } catch { return ''; }
};

const DAY_NAMES_AR: Record<string, string> = {
  sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت'
};

const DutyReportEntry: React.FC<Props> = ({
  staffId, staffName, day, date, schoolInfo, onClose, onSubmit, showToast
}) => {
  const [lateRows, setLateRows] = useState<(Omit<DutyStudentLate, 'id'>)[]>([
    ...Array(5).fill(null).map(() => emptyLate())
  ]);
  const [violationRows, setViolationRows] = useState<(Omit<DutyStudentViolation, 'id'>)[]>([
    ...Array(5).fill(null).map(() => emptyViolation())
  ]);

  const [staffNotes, setStaffNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const signatureRef = useRef<SignaturePadRef>(null);

  const hijriDate = toHijri(date);
  const principalName = schoolInfo.principal || (schoolInfo as any).managerName || '';
  const currentSemester = schoolInfo.semesters?.find(s => s.isCurrent)?.name || '';
  const eduAdmin = schoolInfo.educationAdministration
    || (schoolInfo.region ? `الإدارة العامة للتعليم بمنطقة ${schoolInfo.region}` : 'إدارة التعليم');

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

  const cellInput = 'w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:border-[#655ac1] focus:ring-[#655ac1]/30';

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
          className="px-10 py-3.5 bg-[#655ac1] hover:bg-[#5046a0] active:scale-95 text-white rounded-2xl font-black shadow-lg shadow-[#655ac1]/20 transition-all"
        >
          إغلاق
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-100 z-[9999] overflow-y-auto" dir="rtl">
      <div className="max-w-[860px] mx-auto p-4 sm:p-6 pb-28">
        {/* ── Paper container ───────────────────────────────────────────── */}
        <div className="bg-white shadow-md border border-slate-200 rounded-md p-5 sm:p-8 space-y-3">

          {/* Official 3-column header */}
          <div className="grid grid-cols-3 gap-2 items-start pb-2 border-b-2 border-slate-800">
            <div className="text-right text-[10px] sm:text-[11px] font-extrabold text-slate-800 leading-relaxed space-y-0.5">
              <p>المملكة العربية السعودية</p>
              <p>وزارة التعليم</p>
              <p>{eduAdmin}</p>
              <p>مدرسة {schoolInfo.schoolName || '........................'}</p>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              {schoolInfo.logo ? (
                <img src={schoolInfo.logo} alt="شعار المدرسة" className="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-black text-slate-400">شعار</div>
              )}
            </div>
            <div className="text-left text-[10px] sm:text-[11px] font-extrabold text-slate-800 leading-relaxed space-y-0.5">
              <p>العام الدراسي: {schoolInfo.academicYear || ''}</p>
              <p>تاريخ الطباعة: {printDateAr()}</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center font-black text-slate-900 text-lg sm:text-xl pt-1">تقرير المناوبة اليومية</div>

          {/* Day / Date meta */}
          <div className="grid grid-cols-2 gap-2 max-w-[560px] mx-auto">
            <div className="border border-slate-300 rounded-lg px-3 py-2 text-[12px] font-black">
              <span className="text-slate-500 ml-1.5">اليوم:</span>
              <span className="text-slate-800">{DAY_NAMES_AR[day] || day}</span>
            </div>
            <div className="border border-slate-300 rounded-lg px-3 py-2 text-[12px] font-black">
              <span className="text-slate-500 ml-1.5">التاريخ:</span>
              <span className="text-slate-800">{hijriDate}</span>
            </div>
          </div>

          {currentSemester && (
            <p className="text-center text-[11px] text-slate-500 font-bold">{currentSemester}</p>
          )}

          {/* ── أولاً: المناوبون ─────────────────────────────────── */}
          <div className="pt-2">
            <p className="text-[#655ac1] font-black text-[13px] mb-1">أولاً: المناوبون</p>
            <table className="w-full border-collapse text-[11px]" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '8%' }}>م</th>
                  <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '34%' }}>المناوب</th>
                  <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '24%' }}>التوقيع</th>
                  <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '34%' }}>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 text-center font-bold text-slate-600 p-1.5">1</td>
                  <td className="border border-slate-300 text-center font-black text-slate-800 p-1.5">{staffName}</td>
                  <td className="border border-slate-300 p-0">
                    <div className="relative h-[68px] bg-slate-50">
                      <SignaturePad
                        ref={signatureRef}
                        penColor="#1e293b"
                        canvasClassName="w-full h-full"
                      />
                      <button
                        onClick={(e) => { e.preventDefault(); signatureRef.current?.clear(); }}
                        className="absolute top-0.5 left-0.5 p-1 bg-white border border-slate-200 rounded text-slate-400 hover:text-rose-500 z-10"
                        type="button"
                        title="مسح التوقيع"
                      >
                        <Trash2 size={11} />
                      </button>
                      <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-slate-300 pointer-events-none">وقّع هنا</span>
                    </div>
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      className={cellInput}
                      value={staffNotes}
                      onChange={e => setStaffNotes(e.target.value)}
                      placeholder="—"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── ثانيًا: الطلاب المتأخرون ──────────────────────────── */}
          <div className="pt-1">
            <p className="text-[#655ac1] font-black text-[13px] mb-1">ثانيًا: الطلاب المتأخرون</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]" style={{ minWidth: '720px' }}>
                <thead>
                  <tr>
                    <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '7%' }}>م</th>
                    <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '24%' }}>اسم الطالب</th>
                    <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '16%' }}>الصف / الفصل</th>
                    <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '15%' }}>زمن الانصراف</th>
                    <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '18%' }}>الإجراء</th>
                    <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '20%' }}>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {lateRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 text-center font-bold text-slate-500 p-1">
                        <div className="flex items-center justify-center gap-1">
                          <span>{idx + 1}</span>
                          {lateRows.length > 1 && (
                            <button onClick={() => removeLateRow(idx)} className="text-rose-400 hover:text-rose-600" title="حذف">
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="border border-slate-300 p-1">
                        <input className={cellInput} value={row.studentName} onChange={e => updateLateField(idx, 'studentName', e.target.value)} placeholder="الاسم الرباعي" />
                      </td>
                      <td className="border border-slate-300 p-1">
                        <input className={cellInput} value={row.gradeAndClass} onChange={e => updateLateField(idx, 'gradeAndClass', e.target.value)} placeholder="ثالث / ٢" />
                      </td>
                      <td className="border border-slate-300 p-1">
                        <input className={cellInput} type="time" value={row.exitTime} onChange={e => updateLateField(idx, 'exitTime', e.target.value)} />
                      </td>
                      <td className="border border-slate-300 p-1">
                        <MultiSelectDropdown
                          options={LATE_ACTION_OPTIONS}
                          value={row.actionTaken}
                          onChange={v => updateLateField(idx, 'actionTaken', v)}
                        />
                      </td>
                      <td className="border border-slate-300 p-1">
                        <input className={cellInput} value={row.notes || ''} onChange={e => updateLateField(idx, 'notes', e.target.value)} placeholder="ملاحظات" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addLateRow} className="mt-2 w-full py-1.5 border border-dashed border-slate-300 rounded-md text-slate-500 hover:text-[#655ac1] hover:border-[#655ac1] text-[11px] font-bold flex items-center justify-center gap-1 transition-all">
              <Plus size={12} /> إضافة صف
            </button>
          </div>

          {/* ── ثالثًا: الطلاب المخالفون سلوكيًا ─────────────────── */}
          <div className="pt-1">
            <p className="text-[#655ac1] font-black text-[13px] mb-1">ثالثًا: الطلاب المخالفون سلوكيًا</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]" style={{ minWidth: '720px' }}>
                <thead>
                  <tr>
                    <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '7%' }}>م</th>
                    <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '24%' }}>اسم الطالب</th>
                    <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '16%' }}>الصف / الفصل</th>
                    <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '20%' }}>نوع المخالفة</th>
                    <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '16%' }}>الإجراء</th>
                    <th className="border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5" style={{ width: '17%' }}>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {violationRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 text-center font-bold text-slate-500 p-1">
                        <div className="flex items-center justify-center gap-1">
                          <span>{idx + 1}</span>
                          {violationRows.length > 1 && (
                            <button onClick={() => removeViolationRow(idx)} className="text-rose-400 hover:text-rose-600" title="حذف">
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="border border-slate-300 p-1">
                        <input className={cellInput} value={row.studentName} onChange={e => updateViolationField(idx, 'studentName', e.target.value)} placeholder="الاسم الرباعي" />
                      </td>
                      <td className="border border-slate-300 p-1">
                        <input className={cellInput} value={row.gradeAndClass} onChange={e => updateViolationField(idx, 'gradeAndClass', e.target.value)} placeholder="ثالث / ٢" />
                      </td>
                      <td className="border border-slate-300 p-1">
                        <input className={cellInput} value={row.violationType} onChange={e => updateViolationField(idx, 'violationType', e.target.value)} placeholder="كتابة المخالفة..." />
                      </td>
                      <td className="border border-slate-300 p-1">
                        <MultiSelectDropdown
                          options={VIOLATION_ACTION_OPTIONS}
                          value={row.actionTaken}
                          onChange={v => updateViolationField(idx, 'actionTaken', v)}
                        />
                      </td>
                      <td className="border border-slate-300 p-1">
                        <input className={cellInput} value={row.notes || ''} onChange={e => updateViolationField(idx, 'notes', e.target.value)} placeholder="اختياري" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addViolationRow} className="mt-2 w-full py-1.5 border border-dashed border-slate-300 rounded-md text-slate-500 hover:text-[#655ac1] hover:border-[#655ac1] text-[11px] font-bold flex items-center justify-center gap-1 transition-all">
              <Plus size={12} /> إضافة صف
            </button>
          </div>

          {/* ── Notice ────────────────────────────────────────────── */}
          <div className="pt-2 flex items-center gap-2 text-[12px] font-black text-slate-900">
            <span className="w-5 h-5 rounded-full border-[1.5px] border-slate-900 inline-flex items-center justify-center">!</span>
            <span>يُسلَّم هذا النموذج في اليوم التالي لوكيل المدرسة</span>
          </div>

          {/* ── Signatures row ───────────────────────────────────── */}
          <div className="pt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="border border-slate-300 rounded-lg px-3 py-2 text-[12px] font-black min-w-[220px]">
              <span className="text-slate-500 ml-1.5">وكيل المدرسة:</span>
              <span className="text-slate-800">.....................</span>
            </div>
            <div className="border border-slate-200 rounded-2xl px-4 py-3 w-[280px] bg-white">
              <p className="text-[12px] font-black mb-5">
                <span className="text-slate-500 ml-1.5">مدير المدرسة:</span>
                <span className="text-slate-800">{principalName || '....................'}</span>
              </p>
              <div className="border-t border-slate-400 pt-1.5 text-[11px] font-black text-slate-600">التوقيع</div>
            </div>
          </div>
        </div>

        {/* ── Submit bar ──────────────────────────────────────────── */}
        <div className="mt-5">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-[#655ac1] hover:bg-[#5046a0] active:scale-95 text-white py-4 rounded-2xl font-black shadow-lg shadow-[#655ac1]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
          >
            {isSubmitting ? (
              <span className="animate-pulse">جاري الإرسال...</span>
            ) : (
              <><Check size={20} /> إرسال التقرير</>
            )}
          </button>
          <p className="mt-2 text-[11px] font-bold text-slate-400 text-center flex items-center justify-center gap-1">
            <AlertCircle size={11} /> تأكد من توقيع المناوب في خانة التوقيع أعلاه قبل الإرسال
          </p>
        </div>
      </div>
    </div>
  );
};

export default DutyReportEntry;
