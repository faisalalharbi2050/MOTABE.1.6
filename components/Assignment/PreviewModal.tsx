import React, { useState, useMemo } from 'react';
import { Teacher, Subject, ClassInfo, Assignment, SchoolInfo, Specialization } from '../../types';
import { X, Eye, Users, BookOpen, Award, List, FileSignature, Clock } from 'lucide-react';

interface Props {
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  assignments: Assignment[];
  specializations: Specialization[];
  schoolInfo: SchoolInfo;
  activeSchoolTab: string;
  onClose: () => void;
}

type ViewMode = 'all' | 'teacher' | 'subject' | 'specialization';

const PreviewModal: React.FC<Props> = ({
  teachers, subjects, classes, assignments, specializations,
  schoolInfo, activeSchoolTab, onClose,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showSignature, setShowSignature] = useState(true);
  const [showWaiting, setShowWaiting] = useState(false);

  const sharedSchools = schoolInfo.sharedSchools || [];
  const schoolLabel = activeSchoolTab === 'main'
    ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
    : (sharedSchools.find(s => s.id === activeSchoolTab)?.name || activeSchoolTab);
  const isAssignableClass = (c?: Pick<ClassInfo, 'type'> | null) => !!c && (!c.type || c.type === 'class');

  // ── إسنادات المدرسة الحالية فقط ──
  const schoolAssignments = useMemo(() => {
    return assignments.filter(a => {
      const cls = classes.find(c => c.id === a.classId);
      return isAssignableClass(cls) && (cls?.schoolId || 'main') === activeSchoolTab;
    });
  }, [assignments, classes, activeSchoolTab]);

  const getWaitingQuota = (t: Teacher): number => {
    // نصاب الانتظار من بنية المعلم لو موجود
    return (t as any).waitingQuota || 0;
  };

  const totalPeriods = useMemo(() => {
    return schoolAssignments.reduce((sum, a) => {
      const sub = subjects.find(s => s.id === a.subjectId);
      return sum + (sub?.periodsPerClass || 0);
    }, 0);
  }, [schoolAssignments, subjects]);

  const visibleCols = (showSignature ? 1 : 0) + (showWaiting ? 1 : 0);

  // ── view modes ──
  const renderAll = () => (
    <table className="w-full text-right border-collapse">
      <thead className="bg-slate-50 sticky top-0 z-10">
        <tr>
          <th className="px-4 py-3 text-xs font-black text-slate-600 border-b border-slate-200 text-right">#</th>
          <th className="px-4 py-3 text-xs font-black text-slate-600 border-b border-slate-200 text-right">المعلم</th>
          <th className="px-4 py-3 text-xs font-black text-slate-600 border-b border-slate-200 text-right">التخصص</th>
          <th className="px-4 py-3 text-xs font-black text-slate-600 border-b border-slate-200 text-right">المادة</th>
          <th className="px-4 py-3 text-xs font-black text-slate-600 border-b border-slate-200 text-right">الفصل</th>
          <th className="px-4 py-3 text-xs font-black text-slate-600 border-b border-slate-200 text-center">حصص</th>
          {showWaiting && <th className="px-4 py-3 text-xs font-black text-slate-600 border-b border-slate-200 text-center">نصاب الانتظار</th>}
          {showSignature && <th className="px-4 py-3 text-xs font-black text-slate-600 border-b border-slate-200 text-center">التوقيع</th>}
        </tr>
      </thead>
      <tbody>
        {schoolAssignments.map((a, idx) => {
          const t = teachers.find(x => x.id === a.teacherId);
          const s = subjects.find(x => x.id === a.subjectId);
          const c = classes.find(x => x.id === a.classId);
          const spec = specializations.find(sp => sp.id === t?.specializationId)?.name || '—';
          return (
            <tr key={idx} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 text-xs font-bold text-slate-500 border-b border-slate-100">{idx + 1}</td>
              <td className="px-4 py-3 text-sm font-black text-slate-800 border-b border-slate-100">{t?.name || '—'}</td>
              <td className="px-4 py-3 text-xs font-bold text-slate-500 border-b border-slate-100">{spec}</td>
              <td className="px-4 py-3 text-sm font-bold text-slate-700 border-b border-slate-100">{s?.name || '—'}</td>
              <td className="px-4 py-3 text-xs font-bold text-slate-600 border-b border-slate-100">{c ? `${c.grade}/${c.section}` : '—'}</td>
              <td className="px-4 py-3 text-sm font-black text-[#655ac1] border-b border-slate-100 text-center tabular-nums">{s?.periodsPerClass || 0}</td>
              {showWaiting && <td className="px-4 py-3 text-xs font-bold text-slate-500 border-b border-slate-100 text-center tabular-nums">{t ? getWaitingQuota(t) : 0}</td>}
              {showSignature && <td className="px-4 py-3 border-b border-slate-100"></td>}
            </tr>
          );
        })}
        <tr className="bg-slate-50">
          <td colSpan={5} className="px-4 py-3 text-sm font-black text-slate-700 text-left">الإجمالي</td>
          <td className="px-4 py-3 text-sm font-black text-[#655ac1] text-center tabular-nums">{totalPeriods}</td>
          {visibleCols > 0 && <td colSpan={visibleCols}></td>}
        </tr>
      </tbody>
    </table>
  );

  const renderByTeacher = () => {
    // مجموعة لكل معلم في المدرسة الحالية
    const teacherIds = Array.from(new Set(schoolAssignments.map(a => a.teacherId)));
    return (
      <div className="space-y-4">
        {teacherIds.map(tId => {
          const t = teachers.find(x => x.id === tId);
          if (!t) return null;
          const list = schoolAssignments.filter(a => a.teacherId === tId);
          const total = list.reduce((sum, a) => sum + (subjects.find(s => s.id === a.subjectId)?.periodsPerClass || 0), 0);
          const spec = specializations.find(sp => sp.id === t.specializationId)?.name || '—';
          return (
            <div key={tId} className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-[#655ac1]" />
                  <div>
                    <div className="text-sm font-black text-slate-800">{t.name}</div>
                    <div className="text-[10px] font-bold text-slate-500">{spec}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-lg">{list.length} إسناد</span>
                  <span className="text-[#655ac1] bg-[#f0edff] border border-[#655ac1]/30 px-2 py-1 rounded-lg">{total} حصة</span>
                  {showWaiting && <span className="text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-lg">انتظار: {getWaitingQuota(t)}</span>}
                </div>
              </div>
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-500 text-right">المادة</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-500 text-right">الفصل</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-500 text-center">حصص</th>
                    {showSignature && <th className="px-4 py-2 text-[10px] font-black text-slate-500 text-center">التوقيع</th>}
                  </tr>
                </thead>
                <tbody>
                  {list.map((a, idx) => {
                    const s = subjects.find(x => x.id === a.subjectId);
                    const c = classes.find(x => x.id === a.classId);
                    return (
                      <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 text-xs font-bold text-slate-700">{s?.name}</td>
                        <td className="px-4 py-2 text-xs font-bold text-slate-600">{c ? `${c.grade}/${c.section}` : '—'}</td>
                        <td className="px-4 py-2 text-xs font-black text-[#655ac1] text-center tabular-nums">{s?.periodsPerClass}</td>
                        {showSignature && <td className="px-4 py-2"></td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  const renderBySubject = () => {
    const subjectIds = Array.from(new Set(schoolAssignments.map(a => a.subjectId)));
    return (
      <div className="space-y-4">
        {subjectIds.map(sId => {
          const s = subjects.find(x => x.id === sId);
          if (!s) return null;
          const list = schoolAssignments.filter(a => a.subjectId === sId);
          const total = list.reduce((sum, a) => sum + (s.periodsPerClass || 0), 0);
          // مجموعة حسب المعلم داخل المادة
          const byTeacher = new Map<string, Assignment[]>();
          list.forEach(a => {
            const arr = byTeacher.get(a.teacherId) || [];
            arr.push(a);
            byTeacher.set(a.teacherId, arr);
          });
          return (
            <div key={sId} className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <BookOpen size={18} className="text-[#655ac1]" />
                  <div>
                    <div className="text-sm font-black text-slate-800">{s.name}</div>
                    <div className="text-[10px] font-bold text-slate-500">{s.periodsPerClass} حصص لكل فصل</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-lg">{list.length} فصل</span>
                  <span className="text-[#655ac1] bg-[#f0edff] border border-[#655ac1]/30 px-2 py-1 rounded-lg">{total} حصة</span>
                </div>
              </div>
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-500 text-right">المعلم</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-500 text-right">الفصول</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-500 text-center">إجمالي الحصص</th>
                    {showSignature && <th className="px-4 py-2 text-[10px] font-black text-slate-500 text-center">التوقيع</th>}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(byTeacher.entries()).map(([tId, arr]) => {
                    const t = teachers.find(x => x.id === tId);
                    const classNames = arr.map(a => {
                      const c = classes.find(x => x.id === a.classId);
                      return c ? `${c.grade}/${c.section}` : '—';
                    }).join(' · ');
                    return (
                      <tr key={tId} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 text-xs font-black text-slate-700">{t?.name}</td>
                        <td className="px-4 py-2 text-xs font-bold text-slate-600">{classNames}</td>
                        <td className="px-4 py-2 text-xs font-black text-[#655ac1] text-center tabular-nums">{arr.length * s.periodsPerClass}</td>
                        {showSignature && <td className="px-4 py-2"></td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  const renderBySpec = () => {
    // مجموعة المعلمين حسب التخصص
    const usedSpecIds = Array.from(new Set(
      schoolAssignments
        .map(a => teachers.find(t => t.id === a.teacherId)?.specializationId)
        .filter(Boolean) as string[]
    ));
    return (
      <div className="space-y-4">
        {usedSpecIds.map(spId => {
          const spec = specializations.find(s => s.id === spId);
          const teacherIds = Array.from(new Set(
            teachers
              .filter(t => t.specializationId === spId)
              .map(t => t.id)
              .filter(tId => schoolAssignments.some(a => a.teacherId === tId))
          ));
          const allInSpec = schoolAssignments.filter(a => {
            const t = teachers.find(x => x.id === a.teacherId);
            return t?.specializationId === spId;
          });
          const total = allInSpec.reduce((sum, a) => sum + (subjects.find(s => s.id === a.subjectId)?.periodsPerClass || 0), 0);
          return (
            <div key={spId} className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <Award size={18} className="text-[#655ac1]" />
                  <div className="text-sm font-black text-slate-800">{spec?.name || 'تخصص'}</div>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-lg">{teacherIds.length} معلم</span>
                  <span className="text-[#655ac1] bg-[#f0edff] border border-[#655ac1]/30 px-2 py-1 rounded-lg">{total} حصة</span>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {teacherIds.map(tId => {
                  const t = teachers.find(x => x.id === tId);
                  if (!t) return null;
                  const list = schoolAssignments.filter(a => a.teacherId === tId);
                  const sum = list.reduce((s, a) => s + (subjects.find(x => x.id === a.subjectId)?.periodsPerClass || 0), 0);
                  return (
                    <div key={tId} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-black text-slate-800">{t.name}</div>
                        <span className="text-[10px] font-bold text-[#655ac1] bg-[#f0edff] px-2 py-0.5 rounded-lg">{sum} حصة</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {list.map((a, i) => {
                          const s = subjects.find(x => x.id === a.subjectId);
                          const c = classes.find(x => x.id === a.classId);
                          return (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] font-bold bg-white border border-slate-200 px-2 py-1 rounded-lg">
                              <span className="text-slate-700">{s?.name}</span>
                              <span className="text-slate-400">·</span>
                              <span className="text-slate-500">{c?.grade}/{c?.section}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-6xl mx-4 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#f0edff] text-[#655ac1] flex items-center justify-center">
                <Eye size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">معاينة الإسناد</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">{schoolLabel} · {schoolAssignments.length} إسناد · {totalPeriods} حصة</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* View mode tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {[
              { id: 'all', label: 'الكل', icon: List },
              { id: 'teacher', label: 'حسب المعلم', icon: Users },
              { id: 'subject', label: 'حسب المادة', icon: BookOpen },
              { id: 'specialization', label: 'حسب التخصص', icon: Award },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setViewMode(id as ViewMode)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${viewMode === id ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:border-[#655ac1]'}`}
              >
                <Icon size={14} className={viewMode === id ? 'text-white' : 'text-slate-500'} />
                {label}
              </button>
            ))}
          </div>

          {/* Column toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black text-slate-400">الأعمدة:</span>
            <button
              onClick={() => setShowSignature(!showSignature)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${showSignature ? 'bg-[#f0edff] text-[#655ac1] border-[#655ac1]/40' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
            >
              <FileSignature size={12} />
              التوقيع
              {showSignature && <span className="text-[#655ac1]">✓</span>}
            </button>
            <button
              onClick={() => setShowWaiting(!showWaiting)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${showWaiting ? 'bg-[#f0edff] text-[#655ac1] border-[#655ac1]/40' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
            >
              <Clock size={12} />
              نصاب الانتظار
              {showWaiting && <span className="text-[#655ac1]">✓</span>}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {schoolAssignments.length === 0 ? (
            <div className="py-16 text-center">
              <Eye size={48} className="text-slate-300 mx-auto mb-4" />
              <h4 className="text-base font-black text-slate-700 mb-1">لا توجد إسنادات للمعاينة</h4>
              <p className="text-xs font-bold text-slate-400">ابدأ بإسناد المواد من الصفحة الرئيسية</p>
            </div>
          ) : (
            <>
              {viewMode === 'all' && renderAll()}
              {viewMode === 'teacher' && renderByTeacher()}
              {viewMode === 'subject' && renderBySubject()}
              {viewMode === 'specialization' && renderBySpec()}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
