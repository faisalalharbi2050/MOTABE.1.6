
import React from 'react';
import { Teacher, Subject, ClassInfo, Assignment, Specialization, SchoolInfo } from '../types';
import { Printer, FileText, School, Calendar, Layers, ArrowRight } from 'lucide-react';

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
  const getTeacherAssignments = (tId: string) => assignments.filter(a => a.teacherId === tId);
  const getTeacherTotalQuota = (tId: string) => getTeacherAssignments(tId).reduce((total, a) => {
    const sub = subjects.find(s => s.id === a.subjectId);
    return total + (sub?.periodsPerClass || 0);
  }, 0);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── Header Bar ── */}
      <div className="print:hidden bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">تقرير إسناد المواد</h2>
            <p className="text-slate-400 text-sm font-medium">عرض وطباعة تقرير الإسناد للمعلمين</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold text-sm"
            >
              <ArrowRight size={16} />
              عودة
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#655ac1] text-white rounded-xl hover:bg-[#5246a4] transition-all font-bold text-sm shadow-md shadow-[#655ac1]/20"
          >
            <Printer size={16} />
            طباعة التقرير
          </button>
        </div>
      </div>

      {/* ── Report Card ── */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-100 p-10">

        {/* Report Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-8">
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
            <p>المرحلة: {(schoolInfo.phases || [])[0] || ''} {schoolInfo.hasSecondSchool ? `+ ${(schoolInfo.secondSchoolPhases || [])[0] || ''}` : ''}</p>
            {schoolInfo.hasSecondSchool && <p className="text-[10px] text-slate-500">المبنى: {schoolInfo.secondSchoolName}</p>}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600">
                <th className="p-4 border border-slate-200">م</th>
                <th className="p-4 border border-slate-200">اسم المعلم</th>
                <th className="p-4 border border-slate-200">التخصص</th>
                <th className="p-4 border border-slate-200">المواد المسندة</th>
                <th className="p-4 border border-slate-200">الفصول</th>
                <th className="p-4 border border-slate-200">النصاب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map((teacher, index) => {
                const teacherAssns = getTeacherAssignments(teacher.id);
                const subNames = Array.from(new Set(teacherAssns.map(a => subjects.find(s => s.id === a.subjectId)?.name))).join(' - ');
                const load = getTeacherTotalQuota(teacher.id);
                return (
                  <tr key={teacher.id} className="hover:bg-slate-50 transition-colors odd:bg-slate-50/30">
                    <td className="p-4 border border-slate-100 font-bold">{index + 1}</td>
                    <td className="p-4 border border-slate-100 font-black text-slate-800">{teacher.name}</td>
                    <td className="p-4 border border-slate-100 font-bold text-slate-600">{specializations.find(s => s.id === teacher.specializationId)?.name || '-'}</td>
                    <td className="p-4 border border-slate-100 text-slate-500">{subNames || '-'}</td>
                    <td className="p-4 border border-slate-100">
                      <div className="flex flex-wrap gap-1">
                        {teacherAssns.map(a => {
                          const cls = classes.find(c => c.id === a.classId);
                          return (
                            <span key={a.classId + a.subjectId} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black">
                              {cls?.grade}/{cls?.section}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-4 border border-slate-100 text-center font-black">{load} / {teacher.quotaLimit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AssignmentReport;
