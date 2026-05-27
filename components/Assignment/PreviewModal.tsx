import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Teacher, Subject, ClassInfo, Assignment, SchoolInfo, Specialization } from '../../types';
import { X, Eye, Search, Check, ChevronDown } from 'lucide-react';

interface Props {
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  assignments: Assignment[];
  specializations: Specialization[];
  schoolInfo: SchoolInfo;
  gradeSubjectMap?: Record<string, string[]>;
  activeSchoolTab: string;
  onClose: () => void;
}

type ViewMode = 'teachers' | 'classes' | 'unassigned';

// Class label: English digits; source order is section/grade so RTL reading gives grade on the right.
const ClsLabel: React.FC<{ c: { grade: number; section: number }; prefix?: string }> = ({ c, prefix }) => (
  <span className="tabular-nums">{prefix ? `${prefix} ` : ''}{c.section}/{c.grade}</span>
);

const PreviewModal: React.FC<Props> = ({
  teachers, subjects, classes, assignments, specializations,
  schoolInfo, gradeSubjectMap = {}, activeSchoolTab, onClose,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('teachers');
  const [search, setSearch] = useState('');
  const [filterSpecId, setFilterSpecId] = useState<string>('');

  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());

  const sharedSchools = schoolInfo.sharedSchools || [];
  const currentSchoolPhases = activeSchoolTab === 'main'
    ? schoolInfo.phases
    : (sharedSchools.find(s => s.id === activeSchoolTab)?.phases || schoolInfo.phases);

  const isAssignableClass = (c?: Pick<ClassInfo, 'type'> | null) => !!c && (!c.type || c.type === 'class');
  const isClassInCurrentSchool = (c: { schoolId?: string }) => {
    if (activeSchoolTab === 'main') return !c.schoolId || c.schoolId === 'main';
    return c.schoolId === activeSchoolTab;
  };
  const isTeacherInCurrentSchool = (t: Teacher) => {
    if (t.isShared) {
      const originalId = t.schoolId || 'main';
      if (activeSchoolTab === originalId) return true;
      return (t.schools || []).some(s => s.schoolId === activeSchoolTab);
    }
    if (activeSchoolTab === 'main') return !t.schoolId || t.schoolId === 'main';
    return t.schoolId === activeSchoolTab;
  };

  const getGradeSubjectIds = (cls: { phase: string; grade: number; schoolId?: string }): string[] => {
    const schoolId = cls.schoolId || 'main';
    return (
      gradeSubjectMap[`${schoolId}-${cls.phase}-${cls.grade}`] ||
      gradeSubjectMap[`${cls.phase}-${cls.grade}`] ||
      []
    );
  };

  const schoolAssignments = useMemo(() => assignments.filter(a => {
    const cls = classes.find(c => c.id === a.classId);
    return isAssignableClass(cls) && isClassInCurrentSchool(cls!);
  }), [assignments, classes, activeSchoolTab]);

  const schoolTeachers = useMemo(() => teachers.filter(isTeacherInCurrentSchool),
    [teachers, activeSchoolTab]);

  const sortedSchoolClasses = useMemo(() => {
    const list = classes.filter(c => isAssignableClass(c) && currentSchoolPhases.includes(c.phase) && isClassInCurrentSchool(c));
    return [...list].sort((a, b) => {
      const pa = currentSchoolPhases.indexOf(a.phase);
      const pb = currentSchoolPhases.indexOf(b.phase);
      if (pa !== pb) return pa - pb;
      if (a.grade !== b.grade) return a.grade - b.grade;
      return (a.section || 0) - (b.section || 0);
    });
  }, [classes, currentSchoolPhases, activeSchoolTab]);

  useEffect(() => {
    setSelectedTeacherIds(new Set(schoolTeachers.map(t => t.id)));
  }, [schoolTeachers.length, activeSchoolTab]);
  useEffect(() => {
    setSelectedClassIds(new Set(sortedSchoolClasses.map(c => c.id)));
  }, [sortedSchoolClasses.length, activeSchoolTab]);

  const usedSpecIds = useMemo(() => {
    const ids = new Set<string>();
    schoolTeachers.forEach(t => { if (t.specializationId) ids.add(t.specializationId); });
    return Array.from(ids);
  }, [schoolTeachers]);

  const normalize = (s: string) => (s || '').toLowerCase().trim();
  const getSpecName = (id: string) => specializations.find(s => s.id === id)?.name || '—';

  // ── Sidebar teacher list (filtered by search + spec filter) ──
  const sidebarTeachers = useMemo(() => {
    const q = normalize(search);
    return schoolTeachers
      .filter(t => !filterSpecId || t.specializationId === filterSpecId)
      .filter(t => !q || normalize(t.name).includes(q))
      .sort((a, b) => {
        if (a.specializationId !== b.specializationId) {
          return getSpecName(a.specializationId).localeCompare(getSpecName(b.specializationId), 'ar');
        }
        return (a.name || '').localeCompare(b.name || '', 'ar');
      });
  }, [schoolTeachers, search, filterSpecId, specializations]);

  const sidebarClasses = useMemo(() => {
    const q = normalize(search);
    return sortedSchoolClasses.filter(c => {
      if (!q) return true;
      return `${c.section}/${c.grade}`.includes(q);
    });
  }, [sortedSchoolClasses, search]);

  // ── Right panel data (filtered by selection) ──
  const teachersGrouped = useMemo(() => {
    const groups: { specId: string; specName: string; teachers: Teacher[] }[] = [];
    usedSpecIds.forEach(specId => {
      const list = schoolTeachers
        .filter(t => t.specializationId === specId)
        .filter(t => selectedTeacherIds.has(t.id))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
      if (list.length > 0) {
        groups.push({ specId, specName: getSpecName(specId), teachers: list });
      }
    });
    return groups;
  }, [schoolTeachers, usedSpecIds, selectedTeacherIds, specializations]);

  const formatAssignmentChip = (a: Assignment): string => {
    const s = subjects.find(x => x.id === a.subjectId);
    const c = classes.find(x => x.id === a.classId);
    const periods = s?.periodsPerClass || 0;
    // section/grade in source so RTL reading shows grade on the right.
    return `${s?.name || '—'} - ${c ? `${c.section}/${c.grade}` : '—'} - ح${periods}`;
  };

  const teacherTotalPeriods = (tId: string) => schoolAssignments
    .filter(a => a.teacherId === tId)
    .reduce((sum, a) => sum + (subjects.find(s => s.id === a.subjectId)?.periodsPerClass || 0), 0);

  const classesFiltered = useMemo(() =>
    sortedSchoolClasses.filter(c => selectedClassIds.has(c.id)),
    [sortedSchoolClasses, selectedClassIds]);

  const subjectsForClass = (cls: ClassInfo) => {
    const ids = getGradeSubjectIds(cls);
    let list = subjects.filter(s => !s.isArchived && (ids.includes(s.id) || cls.subjectIds?.includes(s.id)));
    list = Array.from(new Map(list.map(s => [s.id, s])).values());
    return list;
  };

  // ── Unassigned (grouped by class) ──
  const unassignedData = useMemo(() => {
    const teacherList = schoolTeachers.filter(t => !schoolAssignments.some(a => a.teacherId === t.id))
      .map(t => ({ teacherName: t.name, teacherSpec: getSpecName(t.specializationId) }));

    const classRows: { className: string; subjects: string[] }[] = [];
    sortedSchoolClasses.forEach(cls => {
      const required = subjectsForClass(cls);
      const missing = required.filter(s => !schoolAssignments.some(a => a.classId === cls.id && a.subjectId === s.id));
      if (missing.length > 0) {
        classRows.push({ className: `${cls.section}/${cls.grade}`, subjects: missing.map(s => s.name) });
      }
    });

    return { teacherRows: teacherList, classRows };
  }, [schoolTeachers, schoolAssignments, sortedSchoolClasses, specializations, subjects]);

  const viewOptions: { id: ViewMode; name: string }[] = [
    { id: 'teachers', name: 'المعلمون' },
    { id: 'classes', name: 'الفصول' },
    { id: 'unassigned', name: 'بحاجة إلى إسناد' },
  ];

  const specFilterOptions = [
    { id: '', name: 'كل التخصصات' },
    ...usedSpecIds.map(id => ({ id, name: getSpecName(id) })),
  ];

  const toggleTeacher = (id: string) => setSelectedTeacherIds(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const toggleClass = (id: string) => setSelectedClassIds(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const allTeachersSelected = sidebarTeachers.length > 0 && sidebarTeachers.every(t => selectedTeacherIds.has(t.id));
  const allClassesSelected = sidebarClasses.length > 0 && sidebarClasses.every(c => selectedClassIds.has(c.id));

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[92vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
            <Eye size={20} className="text-[#655ac1]" />
            معاينة الإسناد
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — sidebar + main */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] min-h-0 flex-1">
          {/* Sidebar */}
          <div className="border-l border-slate-100 p-5 space-y-4 bg-slate-50/40 overflow-y-auto custom-scrollbar">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={viewMode === 'classes' ? 'ابحث عن فصل...' : 'ابحث عن معلم...'}
                className="w-full pr-10 pl-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20"
              />
            </div>

            {/* View dropdown — no icons */}
            <SimpleDropdown
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
              options={viewOptions}
            />

            {/* Spec filter — only for teachers view */}
            {viewMode === 'teachers' && (
              <SimpleDropdown
                value={filterSpecId}
                onChange={setFilterSpecId}
                options={specFilterOptions}
                placeholder="كل التخصصات"
              />
            )}

            {/* Teacher list (data-edit modal style) */}
            {viewMode === 'teachers' && (
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500">المعلمون</span>
                  <div className="flex items-center gap-2">
                    {sidebarTeachers.length > 0 && (
                      <button
                        onClick={() => setSelectedTeacherIds(prev => {
                          if (allTeachersSelected) {
                            const n = new Set(prev);
                            sidebarTeachers.forEach(t => n.delete(t.id));
                            return n;
                          }
                          const n = new Set(prev);
                          sidebarTeachers.forEach(t => n.add(t.id));
                          return n;
                        })}
                        className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-500 hover:border-[#655ac1]/40 hover:bg-[#f0edff] hover:text-[#655ac1] text-[10px] font-black transition-colors"
                      >
                        {allTeachersSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                      </button>
                    )}
                    <span className="text-[11px] font-black text-[#655ac1] border border-slate-200 bg-white px-2.5 py-1 rounded-full">{selectedTeacherIds.size} محدد</span>
                  </div>
                </div>
                <div className="max-h-[360px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {sidebarTeachers.length === 0 ? (
                    <div className="py-8 text-center text-xs font-bold text-slate-400">لا توجد نتائج مطابقة</div>
                  ) : sidebarTeachers.map(teacher => {
                    const selected = selectedTeacherIds.has(teacher.id);
                    return (
                      <button
                        key={teacher.id}
                        type="button"
                        onClick={() => toggleTeacher(teacher.id)}
                        className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${selected ? 'border-slate-300 bg-white' : 'border-transparent hover:bg-slate-50'}`}
                      >
                        <span className="min-w-0">
                          <span className={`block text-sm font-black truncate ${selected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{teacher.name}</span>
                          <span className={`block text-[11px] font-bold truncate ${selected ? 'text-slate-400' : 'text-[#655ac1]'}`}>{getSpecName(teacher.specializationId)}</span>
                        </span>
                        <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 ${selected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'}`}>
                          <Check size={12} strokeWidth={3.5} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Class list (data-edit modal style) */}
            {viewMode === 'classes' && (
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500">الفصول</span>
                  <div className="flex items-center gap-2">
                    {sidebarClasses.length > 0 && (
                      <button
                        onClick={() => setSelectedClassIds(prev => {
                          if (allClassesSelected) {
                            const n = new Set(prev);
                            sidebarClasses.forEach(c => n.delete(c.id));
                            return n;
                          }
                          const n = new Set(prev);
                          sidebarClasses.forEach(c => n.add(c.id));
                          return n;
                        })}
                        className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-500 hover:border-[#655ac1]/40 hover:bg-[#f0edff] hover:text-[#655ac1] text-[10px] font-black transition-colors"
                      >
                        {allClassesSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                      </button>
                    )}
                    <span className="text-[11px] font-black text-[#655ac1] border border-slate-200 bg-white px-2.5 py-1 rounded-full">{selectedClassIds.size} محدد</span>
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {sidebarClasses.length === 0 ? (
                    <div className="py-8 text-center text-xs font-bold text-slate-400">لا توجد فصول مطابقة</div>
                  ) : sidebarClasses.map(cls => {
                    const selected = selectedClassIds.has(cls.id);
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => toggleClass(cls.id)}
                        className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${selected ? 'border-slate-300 bg-white' : 'border-transparent hover:bg-slate-50'}`}
                      >
                        <span className="min-w-0">
                          <span className={`block text-sm font-black truncate ${selected ? 'text-[#655ac1]' : 'text-slate-700'}`}>
                            <ClsLabel c={cls} prefix="الفصل" />
                          </span>
                        </span>
                        <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 ${selected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'}`}>
                          <Check size={12} strokeWidth={3.5} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="min-w-0 overflow-y-auto custom-scrollbar p-6">
            {viewMode === 'teachers' && <TeachersView groups={teachersGrouped} schoolAssignments={schoolAssignments} formatChip={formatAssignmentChip} teacherTotalPeriods={teacherTotalPeriods} />}
            {viewMode === 'classes' && <ClassesView classes={classesFiltered} subjectsForClass={subjectsForClass} schoolAssignments={schoolAssignments} teachers={teachers} />}
            {viewMode === 'unassigned' && <UnassignedView teacherRows={unassignedData.teacherRows} classRows={unassignedData.classRows} />}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end shrink-0 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Simple dropdown — no icons ──
const SimpleDropdown: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
  placeholder?: string;
}> = ({ value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.id === value);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full px-4 py-3 bg-white border-2 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 text-sm ${open ? 'border-[#655ac1]/40 ring-2 ring-[#8779fb]/20' : 'border-slate-200'}`}
      >
        <span className="truncate">{current?.name || placeholder || 'اختر'}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 animate-in slide-in-from-top-2">
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {options.map(opt => {
              const active = opt.id === value;
              return (
                <button
                  key={opt.id}
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center justify-between gap-2 ${active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}
                >
                  <span className="truncate">{opt.name}</span>
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
  );
};

// ── Teachers view ──
const TeachersView: React.FC<{
  groups: { specId: string; specName: string; teachers: Teacher[] }[];
  schoolAssignments: Assignment[];
  formatChip: (a: Assignment) => string;
  teacherTotalPeriods: (tId: string) => number;
}> = ({ groups, schoolAssignments, formatChip, teacherTotalPeriods }) => {
  if (groups.length === 0) return <EmptyState text="لا يوجد معلمون مطابقون" />;
  return (
    <div className="space-y-6">
      {groups.map(group => (
        <div key={group.specId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
            <span className="w-2 h-6 bg-[#655ac1] rounded-full" />
            <h3 className="font-black text-slate-800 text-base">
              {group.specName}
              <span className="text-xs font-bold text-slate-500 mr-2">({group.teachers.length})</span>
            </h3>
          </div>
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-black text-[#655ac1] w-14 text-center">م</th>
                <th className="px-4 py-3 text-xs font-black text-[#655ac1] w-56">المعلم</th>
                <th className="px-4 py-3 text-xs font-black text-[#655ac1]">المواد والفصول المسندة</th>
                <th className="px-4 py-3 text-xs font-black text-[#655ac1] w-24 text-center">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {group.teachers.map((t, idx) => {
                const list = schoolAssignments.filter(a => a.teacherId === t.id);
                const total = teacherTotalPeriods(t.id);
                return (
                  <tr key={t.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-bold text-slate-500 tabular-nums">{idx + 1}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-black text-slate-800">{t.name}</td>
                    <td className="px-4 py-3">
                      {list.length === 0 ? (
                        <span className="text-[11px] font-bold text-slate-400">لا توجد إسنادات</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {list.map((a, i) => (
                            <span key={i} className="inline-flex items-center text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                              {formatChip(a)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-black text-[#655ac1] tabular-nums">{total}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

// ── Classes view ──
const ClassesView: React.FC<{
  classes: ClassInfo[];
  subjectsForClass: (c: ClassInfo) => Subject[];
  schoolAssignments: Assignment[];
  teachers: Teacher[];
}> = ({ classes, subjectsForClass, schoolAssignments, teachers }) => {
  if (classes.length === 0) return <EmptyState text="لا توجد فصول مطابقة" />;
  return (
    <div className="space-y-6">
      {classes.map(cls => {
        const required = subjectsForClass(cls);
        const rows = required.map(s => {
          const a = schoolAssignments.find(x => x.classId === cls.id && x.subjectId === s.id);
          const t = a ? teachers.find(x => x.id === a.teacherId) : null;
          return { subject: s, teacher: t };
        });
        return (
          <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <span className="w-2 h-6 bg-[#655ac1] rounded-full" />
              <h3 className="font-black text-slate-800 text-base">
                <ClsLabel c={cls} prefix="الفصل" />
                <span className="text-xs font-bold text-slate-500 mr-2">({rows.length} مادة)</span>
              </h3>
            </div>
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs font-black text-[#655ac1] w-14 text-center">م</th>
                  <th className="px-4 py-3 text-xs font-black text-[#655ac1]">المادة</th>
                  <th className="px-4 py-3 text-xs font-black text-[#655ac1] w-28 text-center">عدد الحصص</th>
                  <th className="px-4 py-3 text-xs font-black text-[#655ac1]">المعلم المسندة له</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.subject.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-bold text-slate-500 tabular-nums">{idx + 1}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-black text-slate-800">{r.subject.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-black text-[#655ac1] tabular-nums">{r.subject.periodsPerClass}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">
                      {r.teacher ? r.teacher.name : <span className="text-[11px] font-black text-rose-600">غير مسندة</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

// ── Unassigned view (red headers/names, classes grouped) ──
const UnassignedView: React.FC<{
  teacherRows: { teacherName: string; teacherSpec: string }[];
  classRows: { className: string; subjects: string[] }[];
}> = ({ teacherRows, classRows }) => {
  if (teacherRows.length === 0 && classRows.length === 0) {
    return <EmptyState text="لا توجد عناصر بحاجة إلى إسناد" />;
  }
  return (
    <div className="space-y-6">
      {teacherRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
            <span className="w-2 h-6 bg-rose-500 rounded-full" />
            <h3 className="font-black text-rose-600 text-base">
              معلمون غير مسندة لهم أي مادة
              <span className="text-xs font-bold text-rose-400 mr-2">({teacherRows.length})</span>
            </h3>
          </div>
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-black text-[#655ac1] w-14 text-center">م</th>
                <th className="px-4 py-3 text-xs font-black text-[#655ac1]">المعلم</th>
                <th className="px-4 py-3 text-xs font-black text-[#655ac1] w-56">التخصص</th>
              </tr>
            </thead>
            <tbody>
              {teacherRows.map((r, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold text-slate-500 tabular-nums">{idx + 1}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-rose-600">{r.teacherName}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-500">{r.teacherSpec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {classRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
            <span className="w-2 h-6 bg-rose-500 rounded-full" />
            <h3 className="font-black text-rose-600 text-base">
              فصول بها مواد غير مسندة
              <span className="text-xs font-bold text-rose-400 mr-2">({classRows.length})</span>
            </h3>
          </div>
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-black text-[#655ac1] w-14 text-center">م</th>
                <th className="px-4 py-3 text-xs font-black text-[#655ac1] w-32">الفصل</th>
                <th className="px-4 py-3 text-xs font-black text-[#655ac1]">المواد غير المسندة</th>
              </tr>
            </thead>
            <tbody>
              {classRows.map((r, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold text-slate-500 tabular-nums">{idx + 1}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-rose-600">
                    <span className="tabular-nums">{r.className}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.subjects.map((sub, i) => (
                        <span key={i} className="inline-flex items-center text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="py-16 text-center">
    <Eye size={42} className="text-slate-300 mx-auto mb-3" />
    <p className="text-sm font-black text-slate-600">{text}</p>
  </div>
);

export default PreviewModal;
