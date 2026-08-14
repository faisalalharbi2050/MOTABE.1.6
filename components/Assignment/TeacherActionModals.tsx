import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Teacher, Subject, ClassInfo, Assignment, SchoolInfo, Specialization } from '../../types';
import { X, ClipboardList, ArrowLeftRight, BookOpen, Check, CheckCircle2, AlertTriangle, Users, ChevronDown, Search } from 'lucide-react';
import { getClassSubjectPeriods } from '../../utils/classSubjectPlans';

const isAssignableClass = (c?: Pick<ClassInfo, 'type'> | null) => !!c && (!c.type || c.type === 'class');

const getTeacherLessonQuota = (teacher: Teacher, schoolId?: string) => {
  const originalSchoolId = teacher.schoolId || 'main';
  if ((teacher.isShared || teacher.schools?.length) && schoolId) {
    const entry = teacher.schools?.find(s => s.schoolId === schoolId);
    if (entry) return schoolId === originalSchoolId ? (entry.lessons || teacher.quotaLimit || 0) : (entry.lessons || 0);
    if (schoolId === originalSchoolId) return teacher.quotaLimit ?? 0;
  }
  if (teacher.schools?.length) {
    const schoolsTotal = teacher.schools
      .filter(s => s.schoolId !== originalSchoolId)
      .reduce((sum, s) => sum + (s.lessons || 0), 0);
    const originalQuota = teacher.schools.find(s => s.schoolId === originalSchoolId)?.lessons || teacher.quotaLimit || 0;
    return originalQuota + schoolsTotal;
  }
  return teacher.quotaLimit ?? 0;
};

const getTeacherLoadForSchool = (
  teacherId: string,
  schoolId: string,
  assignments: Assignment[],
  classes: ClassInfo[],
  subjects: Subject[],
) => assignments.filter(a => {
  if (a.teacherId !== teacherId) return false;
  const cls = classes.find(c => c.id === a.classId);
  return isAssignableClass(cls) && (cls?.schoolId || 'main') === schoolId;
}).reduce((sum, a) => {
  const subject = subjects.find(s => s.id === a.subjectId);
  const cls = classes.find(c => c.id === a.classId);
  return sum + (subject && cls ? getClassSubjectPeriods(cls, subject) : 0);
}, 0);

const getTeacherTotalLoad = (
  teacherId: string,
  assignments: Assignment[],
  classes: ClassInfo[],
  subjects: Subject[],
) => assignments.filter(a => {
  if (a.teacherId !== teacherId) return false;
  const cls = classes.find(c => c.id === a.classId);
  return isAssignableClass(cls);
}).reduce((sum, a) => {
  const sub = subjects.find(s => s.id === a.subjectId);
  const cls = classes.find(c => c.id === a.classId);
  return sum + (sub && cls ? getClassSubjectPeriods(cls, sub) : 0);
}, 0);

const getTeacherEffectiveLoad = (
  teacher: Teacher,
  schoolId: string,
  assignments: Assignment[],
  classes: ClassInfo[],
  subjects: Subject[],
) => teacher.isShared
  ? getTeacherTotalLoad(teacher.id, assignments, classes, subjects)
  : getTeacherLoadForSchool(teacher.id, schoolId, assignments, classes, subjects);

const getTeacherEffectiveQuota = (teacher: Teacher, schoolId: string) => {
  return teacher.isShared ? getTeacherLessonQuota(teacher) : getTeacherLessonQuota(teacher, schoolId);
};

// ═══════════════════════════════════════════════════════════════
//   مودال تفاصيل إسناد المعلم
// ═══════════════════════════════════════════════════════════════
interface DetailsProps {
  teacher: Teacher;
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  assignments: Assignment[];
  specializations: Specialization[];
  schoolInfo: SchoolInfo;
  onClose: () => void;
}

export const TeacherDetailsModal: React.FC<DetailsProps> = ({
  teacher, subjects, classes, assignments, specializations, schoolInfo, onClose,
}) => {
  const sharedSchools = schoolInfo.sharedSchools || [];
  const spec = specializations.find(s => s.id === teacher.specializationId)?.name || 'عام';

  const teacherAssignments = useMemo(
    () => assignments.filter(a => {
      if (a.teacherId !== teacher.id) return false;
      const cls = classes.find(c => c.id === a.classId);
      return isAssignableClass(cls);
    }),
    [assignments, classes, teacher.id]
  );

  const getSchoolName = (sid: string) => {
    if (sid === 'main') return schoolInfo.schoolName || 'المدرسة الرئيسية';
    return sharedSchools.find(s => s.id === sid)?.name || sid;
  };

  const schoolSummaryRows = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    teacherAssignments.forEach(a => {
      const cls = classes.find(c => c.id === a.classId);
      const sid = cls?.schoolId || 'main';
      const arr = map.get(sid) || [];
      arr.push(a);
      map.set(sid, arr);
    });
    const originalSchoolId = teacher.schoolId || 'main';
    const schoolIds = new Set<string>();
    if (teacher.isShared || teacher.schools?.length) {
      schoolIds.add(originalSchoolId);
      (teacher.schools || []).forEach(s => schoolIds.add(s.schoolId));
    }
    map.forEach((_, sid) => schoolIds.add(sid));
    if (schoolIds.size === 0) schoolIds.add(originalSchoolId);

    return Array.from(schoolIds).map(sid => {
      const list = map.get(sid) || [];
      const assigned = list.reduce((sum, a) => {
        const sub = subjects.find(s => s.id === a.subjectId);
        const cls = classes.find(c => c.id === a.classId);
        return sum + (sub && cls ? getClassSubjectPeriods(cls, sub) : 0);
      }, 0);

      return {
        sid,
        schoolName: getSchoolName(sid),
        quota: getTeacherLessonQuota(teacher, sid),
        assigned,
        list,
      };
    });
  }, [teacher, teacherAssignments, classes, subjects, schoolInfo, sharedSchools]);

  const totalPeriods = teacherAssignments.reduce((sum, a) => {
    const sub = subjects.find(s => s.id === a.subjectId);
    const cls = classes.find(c => c.id === a.classId);
    return sum + (sub && cls ? getClassSubjectPeriods(cls, sub) : 0);
  }, 0);

  const totalQuota = teacher.isShared
    ? schoolSummaryRows.reduce((sum, row) => sum + row.quota, 0)
    : (schoolSummaryRows[0]?.quota ?? getTeacherLessonQuota(teacher));

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl mx-4 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

        <div className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl text-[#655ac1] flex items-center justify-center">
                <ClipboardList size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  {teacher.name}
                  {teacher.isShared && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#655ac1] bg-transparent border border-slate-300 px-2 py-0.5 rounded-lg">
                      مشترك
                    </span>
                  )}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-sm font-black text-[#655ac1]">{spec}</p>
                  {!teacher.isShared && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-slate-600 bg-white border border-slate-300 px-2 py-0.5 rounded-lg">
                      <span>المسند</span>
                      <span className="text-[#655ac1]">{totalPeriods}</span>
                      <span>/ نصاب الحصص</span>
                      <span className="text-[#655ac1]">{totalQuota}</span>
                    </span>
                  )}
                </div>
                {teacher.isShared && (
                  <div className="mt-2 flex flex-col items-start gap-1">
                    {schoolSummaryRows.map(row => (
                      <div key={row.sid} className="w-fit inline-flex items-center gap-1 text-[11px] font-black text-slate-600 bg-white border border-slate-300 px-2 py-0.5 rounded-lg">
                        <span className="text-[#655ac1]">{row.schoolName}</span>
                        <span>- المسند</span>
                        <span className="text-[#655ac1]">{row.assigned}</span>
                        <span>/ نصاب الحصص</span>
                        <span className="text-[#655ac1]">{row.quota}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {teacherAssignments.length === 0 && !teacher.isShared ? (
            <div className="py-12 text-center">
              <BookOpen size={36} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-400">لا توجد إسنادات لهذا المعلم بعد</p>
            </div>
          ) : (
            <>
              <h4 className="text-sm font-black text-slate-700">المواد المسندة للمعلم</h4>
              {(() => {
                // تجميع الإسنادات حسب الفصل
                const groupByClass = (list: Assignment[]) => {
                  const map = new Map<string, { cls: typeof classes[number] | undefined; subjects: { name: string; periods: number }[]; totalPeriods: number }>();
                  list.forEach(a => {
                    const cls = classes.find(c => c.id === a.classId);
                    const sub = subjects.find(s => s.id === a.subjectId);
                    if (!cls || !sub) return;
                    const entry = map.get(a.classId) || { cls, subjects: [], totalPeriods: 0 };
                    const periods = getClassSubjectPeriods(cls, sub);
                    entry.subjects.push({ name: sub.name, periods });
                    entry.totalPeriods += periods;
                    map.set(a.classId, entry);
                  });
                  return Array.from(map.values()).sort((a, b) => {
                    const aKey = `${a.cls?.grade ?? 0}-${a.cls?.section ?? ''}`;
                    const bKey = `${b.cls?.grade ?? 0}-${b.cls?.section ?? ''}`;
                    return aKey.localeCompare(bKey);
                  });
                };

                const renderTable = (rows: ReturnType<typeof groupByClass>) => (
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-black">
                      <tr>
                        <th className="px-3 py-2 w-10">م</th>
                        <th className="px-3 py-2 w-24">الفصل</th>
                        <th className="px-3 py-2">المواد</th>
                        <th className="px-3 py-2 w-24 text-center">عدد الحصص</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-slate-400 font-bold">لا توجد إسنادات</td>
                        </tr>
                      ) : rows.map((row, idx) => (
                        <tr key={row.cls?.id || idx} className="text-slate-700 font-bold align-top">
                          <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2 font-black tabular-nums">{row.cls?.section}/{row.cls?.grade}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {row.subjects.map((s, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-black text-slate-700">
                                  <span>{s.name}</span>
                                  <span className="text-slate-400">·</span>
                                  <span className="text-[#655ac1]">{s.periods}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center font-black text-[#655ac1]">{row.totalPeriods}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );

                return teacher.isShared ? (
                  schoolSummaryRows.map(({ sid, schoolName, list }) => (
                    <div key={sid} className="rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                        <span className="text-sm font-black text-[#655ac1]">{schoolName}</span>
                      </div>
                      {renderTable(groupByClass(list))}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    {renderTable(groupByClass(teacherAssignments))}
                  </div>
                );
              })()}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 font-bold text-sm transition-all">إغلاق</button>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
//   مودال نقل إسنادات المعلم لمعلم آخر
// ═══════════════════════════════════════════════════════════════
interface TransferProps {
  sourceTeacher: Teacher;
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  assignments: Assignment[];
  specializations: Specialization[];
  activeSchoolTab: string;
  isTeacherInCurrentSchool: (t: Teacher) => boolean;
  onConfirm: (targetTeacherId: string, selectedKeys: Set<string>) => void;
  onClose: () => void;
}

export const TransferTeacherModal: React.FC<TransferProps> = ({
  sourceTeacher, teachers, subjects, classes, assignments, specializations,
  activeSchoolTab, isTeacherInCurrentSchool, onConfirm, onClose,
}) => {
  const [targetId, setTargetId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [showSubjectDD, setShowSubjectDD] = useState(false);
  const [showClassDD, setShowClassDD] = useState(false);
  const subjectDDRef = useRef<HTMLDivElement>(null);
  const classDDRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (subjectDDRef.current && !subjectDDRef.current.contains(e.target as Node)) setShowSubjectDD(false);
      if (classDDRef.current && !classDDRef.current.contains(e.target as Node)) setShowClassDD(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const sourceAssns = useMemo(() =>
    assignments.filter(a => {
      if (a.teacherId !== sourceTeacher.id) return false;
      const cls = classes.find(c => c.id === a.classId);
      return isAssignableClass(cls) && (cls?.schoolId || 'main') === activeSchoolTab;
    }), [assignments, classes, sourceTeacher.id, activeSchoolTab]);

  // المواد والفصول المتاحة من إسنادات المصدر
  const availableSubjects = useMemo(() => {
    const ids = new Set(sourceAssns.map(a => a.subjectId));
    return subjects.filter(s => ids.has(s.id));
  }, [sourceAssns, subjects]);
  const availableClasses = useMemo(() => {
    const ids = new Set(sourceAssns.map(a => a.classId));
    return classes.filter(c => isAssignableClass(c) && ids.has(c.id));
  }, [sourceAssns, classes]);

  // الإسنادات المختارة فعليًا للنقل
  const filteredSourceAssns = useMemo(() => sourceAssns.filter(a =>
    (selectedSubjectIds.size === 0 || selectedSubjectIds.has(a.subjectId)) &&
    (selectedClassIds.size === 0 || selectedClassIds.has(a.classId))
  ), [sourceAssns, selectedSubjectIds, selectedClassIds]);

  const sourcePeriods = filteredSourceAssns.reduce((sum, a) => {
    const subject = subjects.find(s => s.id === a.subjectId);
    const cls = classes.find(c => c.id === a.classId);
    return sum + (subject && cls ? getClassSubjectPeriods(cls, subject) : 0);
  }, 0);

  const availableTargets = useMemo(() => {
    return teachers.filter(t => t.id !== sourceTeacher.id && isTeacherInCurrentSchool(t));
  }, [teachers, sourceTeacher.id, isTeacherInCurrentSchool]);

  const filteredTargets = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return availableTargets;
    return availableTargets.filter(t => t.name.toLowerCase().includes(term));
  }, [availableTargets, search]);

  const target = teachers.find(t => t.id === targetId);
  const targetCurrentLoad = target ? getTeacherEffectiveLoad(target, activeSchoolTab, assignments, classes, subjects) : 0;
  const targetQuota = target ? getTeacherEffectiveQuota(target, activeSchoolTab) : 0;
  const afterLoad = targetCurrentLoad + sourcePeriods;
  const willOverflow = targetQuota > 0 && afterLoad > targetQuota;

  const toggleSubj = (id: string) => {
    const n = new Set(selectedSubjectIds);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelectedSubjectIds(n);
  };
  const toggleCls = (id: string) => {
    const n = new Set(selectedClassIds);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelectedClassIds(n);
  };
  const allSubjSelected = availableSubjects.length > 0 && availableSubjects.every(s => selectedSubjectIds.has(s.id));
  const allClsSelected = availableClasses.length > 0 && availableClasses.every(c => selectedClassIds.has(c.id));

  const handleSubmit = () => {
    if (!targetId || filteredSourceAssns.length === 0) return;
    const keys = new Set(filteredSourceAssns.map(a => `${a.classId}::${a.subjectId}`));
    onConfirm(targetId, keys);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-xl mx-4 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

        <div className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl text-[#655ac1] flex items-center justify-center">
                <ArrowLeftRight size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">نقل إسنادات المعلم</h3>
                <p className="text-sm font-black text-[#655ac1] mt-0.5">من: {sourceTeacher.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* اختيار المادة والفصل */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="relative" ref={subjectDDRef}>
              <button
                onClick={() => setShowSubjectDD(v => !v)}
                className={`w-full px-3 py-2.5 bg-white border-2 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-between gap-2 text-xs ${showSubjectDD ? 'border-[#655ac1]/40' : 'border-slate-200'}`}
              >
                <span className="truncate">{selectedSubjectIds.size > 0 ? `المواد (${selectedSubjectIds.size})` : 'كل المواد'}</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${showSubjectDD ? 'rotate-180' : ''}`} />
              </button>
              {showSubjectDD && (
                <div className="absolute z-50 top-full mt-2 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2">
                  <button
                    onClick={() => allSubjSelected ? setSelectedSubjectIds(new Set()) : setSelectedSubjectIds(new Set(availableSubjects.map(s => s.id)))}
                    className="w-full py-2 mb-2 rounded-lg text-xs font-black border border-slate-300 text-slate-600 bg-white hover:bg-[#5046a0] hover:text-white hover:border-[#5046a0] transition-all"
                  >
                    {allSubjSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                  </button>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {availableSubjects.map(s => {
                      const active = selectedSubjectIds.has(s.id);
                      return (
                        <button key={s.id} onClick={() => toggleSubj(s.id)} className={`w-full text-right px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-between gap-2 ${active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}>
                          <span className="truncate">{s.name}</span>
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                            <Check size={12} strokeWidth={3.5} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={classDDRef}>
              <button
                onClick={() => setShowClassDD(v => !v)}
                className={`w-full px-3 py-2.5 bg-white border-2 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-between gap-2 text-xs ${showClassDD ? 'border-[#655ac1]/40' : 'border-slate-200'}`}
              >
                <span className="truncate">{selectedClassIds.size > 0 ? `الفصول (${selectedClassIds.size})` : 'كل الفصول'}</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${showClassDD ? 'rotate-180' : ''}`} />
              </button>
              {showClassDD && (
                <div className="absolute z-50 top-full mt-2 left-0 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2">
                  <button
                    onClick={() => allClsSelected ? setSelectedClassIds(new Set()) : setSelectedClassIds(new Set(availableClasses.map(c => c.id)))}
                    className="w-full py-2 mb-2 rounded-lg text-xs font-black border border-slate-300 text-slate-600 bg-white hover:bg-[#5046a0] hover:text-white hover:border-[#5046a0] transition-all"
                  >
                    {allClsSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                  </button>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {availableClasses.map(c => {
                      const active = selectedClassIds.has(c.id);
                      return (
                        <button key={c.id} onClick={() => toggleCls(c.id)} className={`w-full text-right px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-between gap-2 ${active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}>
                          <span className="truncate tabular-nums">فصل {c.section}/{c.grade}</span>
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                            <Check size={12} strokeWidth={3.5} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* بحث عن المعلم البديل */}
          <div className="mt-3 space-y-1.5">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث عن المعلم البديل"
                className="w-full pr-10 pl-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#655ac1]/20 focus:border-[#655ac1] outline-none transition-all"
              />
            </div>
            <p className="text-xs font-bold text-[#655ac1] px-1">إلى المعلم</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {filteredSourceAssns.length === 0 ? (
            <div className="py-12 text-center">
              <ArrowLeftRight size={36} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-400">لا توجد إسنادات مطابقة للنقل</p>
            </div>
          ) : filteredTargets.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={36} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">{search ? 'لا توجد نتائج' : 'لا يوجد معلمون آخرون متاحون'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredTargets.map(t => {
                const tSpec = specializations.find(s => s.id === t.specializationId)?.name || '—';
                const tLoad = getTeacherEffectiveLoad(t, activeSchoolTab, assignments, classes, subjects);
                const tQuota = getTeacherEffectiveQuota(t, activeSchoolTab);
                const newLoad = tLoad + sourcePeriods;
                const overflow = tQuota > 0 && newLoad > tQuota;
                const isSelected = targetId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTargetId(isSelected ? '' : t.id)}
                    className={`w-full text-right px-3 py-2.5 rounded-xl border bg-white transition-all flex items-center justify-between gap-3 ${isSelected ? 'border-slate-300 ring-2 ring-slate-200 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-black truncate ${isSelected ? 'text-[#655ac1]' : 'text-slate-800'}`}>{t.name}</div>
                        <div className={`text-[12px] font-bold truncate ${isSelected ? 'text-slate-500' : 'text-[#655ac1]'}`}>{tSpec}</div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-500">النصاب الحالي: {tLoad}{tQuota > 0 ? `/${tQuota}` : ''}</span>
                        <span className="text-slate-300 text-[10px]">←</span>
                        <span className={`text-[10px] font-black ${overflow ? 'text-rose-600' : 'text-amber-600'}`}>
                          بعد النقل: {newLoad}{tQuota > 0 ? `/${tQuota}` : ''}
                        </span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border-2 shrink-0 ${isSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                      <Check size={14} strokeWidth={3.5} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* شريط التنبيه أعلى الأزرار */}
        {target && (
          <div className="px-6 pt-3">
            <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border ${willOverflow ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center ${willOverflow ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                <AlertTriangle size={13} />
              </div>
              <p className={`text-xs font-black leading-relaxed ${willOverflow ? 'text-rose-700' : 'text-amber-700'}`}>
                انقل الإسناد إلى {target.name} · بعد النقل {afterLoad}{targetQuota > 0 ? `/${targetQuota}` : ''}
              </p>
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 font-bold text-sm transition-all">إلغاء</button>
          <button
            onClick={handleSubmit}
            disabled={!targetId || filteredSourceAssns.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#655ac1] hover:bg-[#5046a0] text-white font-bold text-sm transition-all active:scale-95 shadow-md shadow-[#655ac1]/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#655ac1]"
          >
            <CheckCircle2 size={16} />
            تأكيد النقل
          </button>
        </div>
      </div>
    </div>
  );
};
