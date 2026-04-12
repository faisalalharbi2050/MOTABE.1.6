
import React, { useState } from 'react';
import { Teacher, Subject, ClassInfo, Assignment, Specialization, SchoolInfo } from '../types';
import { Printer, FileText, School, Calendar, Layers, ArrowRight, PenLine } from 'lucide-react';

interface Props {
  schoolInfo: SchoolInfo;
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  assignments: Assignment[];
  specializations: Specialization[];
  onClose?: () => void;
}

const AssignmentReport: React.FC<Props> = ({ schoolInfo, teachers, subjects, classes, assignments, specializations, onClose }) => {

  const [showSignature, setShowSignature] = useState(false);

  // ── Helpers ──
  const getTeacherAssignments = (tId: string) => assignments.filter(a => a.teacherId === tId);

  const getAssignedLoad = (tId: string) =>
    getTeacherAssignments(tId).reduce((sum, a) => {
      const sub = subjects.find(s => s.id === a.subjectId);
      return sum + (sub?.periodsPerClass || 0);
    }, 0);

  const formatAssignment = (a: Assignment) => {
    const cls = classes.find(c => c.id === a.classId);
    const sub = subjects.find(s => s.id === a.subjectId);
    if (!cls || !sub) return '';
    return `${sub.name}  (${cls.grade} / ${cls.section})  ${sub.periodsPerClass}ح`;
  };

  const handlePrint = () => window.print();

  // ── Group teachers by specialization ──
  const groups: { name: string; items: Teacher[] }[] = [];

  specializations.forEach(spec => {
    const specTeachers = teachers.filter(t => t.specializationId === spec.id);
    if (specTeachers.length > 0) groups.push({ name: spec.name, items: specTeachers });
  });

  const unassigned = teachers.filter(
    t => !t.specializationId || !specializations.find(s => s.id === t.specializationId)
  );
  if (unassigned.length > 0) groups.push({ name: 'غير محدد', items: unassigned });

  // ── Summary stats ──
  const totalTeachers = teachers.length;
  const totalSpecs    = groups.filter(g => g.name !== 'غير محدد').length;
  const totalPeriods  = teachers.reduce((sum, t) => sum + getAssignedLoad(t.id), 0);

  // Global row counter
  let rowNum = 0;

  // ── Render one specialization group ──
  const renderGroup = (name: string, items: Teacher[]) => {
    const groupQuota    = items.reduce((s, t) => s + (t.quotaLimit || 0), 0);
    const groupAssigned = items.reduce((s, t) => s + getAssignedLoad(t.id), 0);

    return (
      <div key={name} className="mb-6" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>

        {/* Specialization header */}
        <div className="bg-[#8779fb] border border-[#8779fb] border-b-0 text-white px-4 py-2.5 flex items-center justify-between rounded-t-xl print:rounded-none">
          <span className="font-black text-base">{name}</span>
          <span className="text-white/80 text-xs font-bold flex items-center gap-3">
            <span>{items.length} معلمون</span>
            <span className="opacity-40">|</span>
            <span>إجمالي نصاب المادة: {groupQuota} حصة</span>
            <span className="opacity-40">|</span>
            <span>المُسند للمعلمين: {groupAssigned} حصة</span>
          </span>
        </div>

        {/* Table */}
        <table className="w-full text-right border-collapse text-[12px]">
          <thead>
            <tr className="bg-slate-100 text-slate-500">
              <th className="p-3 border border-slate-300 font-black w-8 text-center">م</th>
              <th className="p-3 border border-slate-300 font-black w-40">اسم المعلم</th>
              <th className="p-3 border border-slate-300 font-black w-16 text-center">حصص</th>
              <th className="p-3 border border-slate-300 font-black w-16 text-center">انتظار</th>
              <th className="p-3 border border-slate-300 font-black text-center">المواد والفصول المسندة</th>
              <th className="p-3 border border-slate-300 font-black w-16 text-center">الإجمالي</th>
              {showSignature && (
                <th className="p-3 border border-slate-300 font-black w-28 text-center">التوقيع</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map(teacher => {
              rowNum++;
              const num          = rowNum;
              const teacherAssns = getTeacherAssignments(teacher.id);
              const assigned     = getAssignedLoad(teacher.id);
              const quota        = teacher.quotaLimit || 0;
              const waiting      = Math.max(0, quota - assigned);

              const assignmentParts = teacherAssns.length > 0
                ? teacherAssns.map(formatAssignment).filter(Boolean)
                : null;

              return (
                <tr key={teacher.id} className="odd:bg-white even:bg-slate-50/40">
                  <td className="p-3 border border-slate-300 text-center font-bold text-black">{num}</td>
                  <td className="p-3 border border-slate-300 font-black text-black whitespace-nowrap">{teacher.name}</td>
                  <td className="p-3 border border-slate-300 text-center font-black text-black">{assigned}</td>
                  <td className="p-3 border border-slate-300 text-center font-bold text-black">
                    {waiting > 0 ? waiting : '—'}
                  </td>
                  <td className="p-3 border border-slate-300 text-black leading-loose text-[13px] font-medium">
                    {assignmentParts
                      ? assignmentParts.map((part, i) => (
                          <span key={i}>
                            {part}
                            {i < assignmentParts.length - 1 && (
                              <span className="mx-2 text-slate-400 font-black"> — </span>
                            )}
                          </span>
                        ))
                      : <span className="text-slate-400">—</span>
                    }
                  </td>
                  <td className="p-3 border border-slate-300 text-center font-black text-black">{quota}</td>
                  {showSignature && (
                    <td className="p-3 border border-slate-300 text-center text-slate-300 text-[10px]">
                      {/* حقل فارغ للتوقيع */}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ─────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── شريط العنوان ── */}
      <div className="print:hidden bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[#655ac1] shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">تقرير إسناد المواد</h2>
            <p className="text-slate-400 text-sm font-medium">عرض وطباعة تقرير الإسناد للمعلمين</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm"
          >
            <ArrowRight size={16} />
            عودة
          </button>
        )}
      </div>

      {/* ── شريط الأزرار ── */}
      <div className="print:hidden bg-white rounded-[2rem] border border-slate-100 shadow-sm px-5 py-3.5 flex items-center gap-3" dir="rtl">
        <button
          onClick={() => setShowSignature(v => !v)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border transition-all ${
            showSignature
              ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-md shadow-[#655ac1]/20'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <PenLine size={16} />
          {showSignature ? 'إخفاء حقل التوقيع' : 'إضافة حقل التوقيع'}
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#655ac1] text-white rounded-xl hover:bg-[#5246a4] transition-all font-bold text-sm shadow-md shadow-[#655ac1]/20"
        >
          <Printer size={16} />
          طباعة تقرير الإسناد
        </button>
      </div>

      {/* ── Report body ── */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-100 p-10 print:p-4 print:shadow-none print:rounded-none print:border-0">

        {/* ── Official header ── */}
        <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-6 print:pb-4 print:mb-4">
          <div className="space-y-1 font-bold text-slate-700 text-sm">
            <p>المملكة العربية السعودية</p>
            <p>وزارة التعليم</p>
            <p>{schoolInfo.region || 'إدارة التعليم بالمنطقة'}</p>
            <p>مدرسة {schoolInfo.schoolName || '..........'}</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <School size={30} className="text-slate-500" />
            </div>
            <h1 className="text-xl font-black text-slate-700">تقرير إسناد المواد</h1>
            {schoolInfo.mergeTeachers && (
              <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-emerald-600 font-black px-2 py-0.5 bg-emerald-50 rounded-lg">
                <Layers size={12} /> (هيئة تعليمية مشتركة)
              </div>
            )}
          </div>

          <div className="space-y-1 font-bold text-slate-700 text-sm text-left">
            <p className="flex items-center justify-end gap-2">
              التاريخ: {new Date().toLocaleDateString('ar-SA')} <Calendar size={14} />
            </p>
            <p>
              المرحلة: {(schoolInfo.phases || [])[0] || ''}
              {schoolInfo.hasSecondSchool ? ` + ${(schoolInfo.secondSchoolPhases || [])[0] || ''}` : ''}
            </p>
            {schoolInfo.hasSecondSchool && (
              <p className="text-[10px] text-slate-500">المبنى: {schoolInfo.secondSchoolName}</p>
            )}
          </div>
        </div>

        {/* ── Summary stats ── */}
        <div className="flex items-center justify-center gap-4 mb-8 flex-wrap print:mb-4">
          <div className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 rounded-2xl">
            <span className="text-2xl font-black text-[#655ac1]">{totalTeachers}</span>
            <span className="text-sm font-bold text-[#655ac1]">معلم</span>
          </div>
          <div className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 rounded-2xl">
            <span className="text-2xl font-black text-[#655ac1]">{totalSpecs}</span>
            <span className="text-sm font-bold text-[#655ac1]">تخصصات</span>
          </div>
          <div className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 rounded-2xl">
            <span className="text-2xl font-black text-[#655ac1]">{totalPeriods}</span>
            <span className="text-sm font-bold text-[#655ac1]">إجمالي الحصص</span>
          </div>
        </div>

        {/* ── Per-specialization groups ── */}
        <div className="space-y-6 print:space-y-4">
          {groups.map(g => renderGroup(g.name, g.items))}
        </div>

        {teachers.length === 0 && (
          <div className="py-16 text-center text-slate-400 font-bold">
            لا يوجد معلمون مُضافون بعد.
          </div>
        )}

      </div>

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm 12mm;
          }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { break-inside: auto; }
          thead { display: table-header-group; }
          tr    { break-inside: avoid; page-break-inside: avoid; }
          .mb-6 { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
};

export default AssignmentReport;
