import React, { useState, useMemo } from 'react';
import { Teacher, Subject, ClassInfo, Assignment, Specialization } from '../../types';
import { X, Trash2, Check, BookOpen, Users, Search } from 'lucide-react';

// ════════════════════════════════════════════════════════════════
//  حذف حسب المادة
// ════════════════════════════════════════════════════════════════
interface DeleteBySubjectProps {
  subjects: Subject[];
  classes: ClassInfo[];
  assignments: Assignment[];
  activeSchoolTab: string;
  schoolLabel: string;
  onConfirm: (subjectIds: string[]) => void;
  onClose: () => void;
}

export const DeleteBySubjectModal: React.FC<DeleteBySubjectProps> = ({
  subjects, classes, assignments, activeSchoolTab, onConfirm, onClose,
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const isAssignableClass = (c?: Pick<ClassInfo, 'type'> | null) => !!c && (!c.type || c.type === 'class');

  // المواد المُستخدمة في إسنادات المدرسة الحالية فقط
  const schoolAssignments = useMemo(() =>
    assignments.filter(a => {
      const cls = classes.find(c => c.id === a.classId);
      return isAssignableClass(cls) && (cls?.schoolId || 'main') === activeSchoolTab;
    }), [assignments, classes, activeSchoolTab]);

  const usedSubjects = useMemo(() => {
    const counts = new Map<string, number>();
    schoolAssignments.forEach(a => {
      counts.set(a.subjectId, (counts.get(a.subjectId) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([id, count]) => ({ subject: subjects.find(s => s.id === id)!, count }))
      .filter(x => x.subject)
      .sort((a, b) => b.count - a.count);
  }, [schoolAssignments, subjects]);

  const filtered = usedSubjects;

  const toggle = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  };

  const totalToDelete = useMemo(() => {
    return schoolAssignments.filter(a => selected.has(a.subjectId)).length;
  }, [schoolAssignments, selected]);
  const allSelected = filtered.length > 0 && filtered.every(x => selected.has(x.subject.id));

  const handleConfirm = () => {
    if (selected.size === 0) return;
    onConfirm(Array.from(selected));
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

        <div className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl text-rose-600 flex items-center justify-center">
                <BookOpen size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">حذف حسب المادة</h3>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
              <X size={18} />
            </button>
          </div>
          <p className="text-xs font-bold text-slate-500 leading-relaxed">
            حدّد المواد التي تريد حذف كل إسناداتها من جميع المعلمين والفصول
          </p>

          <div className="flex items-center justify-between gap-3 mt-3">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black">
              <span className="text-slate-500">المواد</span>
              <span className="text-slate-800">{filtered.length}</span>
              <span className="w-px h-4 bg-slate-200" />
              <span className="text-rose-600">المحدد {selected.size}</span>
            </div>
            {filtered.length > 0 && (
              <button
                onClick={() => setSelected(allSelected ? new Set() : new Set(filtered.map(x => x.subject.id)))}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 text-[11px] font-black transition-colors"
              >
                {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen size={36} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">لا توجد مواد مسندة</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(({ subject, count }) => {
                const active = selected.has(subject.id);
                return (
                  <button
                    key={subject.id}
                    onClick={() => toggle(subject.id)}
                    className={`w-full text-right px-3 py-3 rounded-xl border transition-all flex items-center justify-between gap-3 bg-white ${active ? 'border-rose-300' : 'border-slate-200 hover:border-rose-200'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-black truncate ${active ? 'text-rose-600' : 'text-slate-800'}`}>{subject.name}</div>
                      <div className="text-[10px] font-bold text-slate-400">{count} إسناد · {subject.periodsPerClass} حصص/فصل</div>
                    </div>
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border-2 shrink-0 bg-white ${active ? 'border-rose-500 text-rose-500' : 'border-slate-300 text-transparent'}`}>
                      <Check size={14} strokeWidth={3.5} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <div className="flex gap-2">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all">إلغاء</button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-500"
            >
              <Trash2 size={14} />
              حذف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
//  حذف حسب المعلم
// ════════════════════════════════════════════════════════════════
interface DeleteByTeacherProps {
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  assignments: Assignment[];
  specializations: Specialization[];
  activeSchoolTab: string;
  schoolLabel: string;
  onConfirm: (teacherIds: string[]) => void;
  onClose: () => void;
}

export const DeleteByTeacherModal: React.FC<DeleteByTeacherProps> = ({
  teachers, subjects, classes, assignments, specializations,
  activeSchoolTab, onConfirm, onClose,
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const isAssignableClass = (c?: Pick<ClassInfo, 'type'> | null) => !!c && (!c.type || c.type === 'class');

  const schoolAssignments = useMemo(() =>
    assignments.filter(a => {
      const cls = classes.find(c => c.id === a.classId);
      return isAssignableClass(cls) && (cls?.schoolId || 'main') === activeSchoolTab;
    }), [assignments, classes, activeSchoolTab]);

  const teachersWithAssignments = useMemo(() => {
    const counts = new Map<string, number>();
    schoolAssignments.forEach(a => {
      counts.set(a.teacherId, (counts.get(a.teacherId) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([id, count]) => ({ teacher: teachers.find(t => t.id === id)!, count }))
      .filter(x => x.teacher)
      .sort((a, b) => b.count - a.count);
  }, [schoolAssignments, teachers]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return teachersWithAssignments;
    return teachersWithAssignments.filter(x => x.teacher.name.toLowerCase().includes(term));
  }, [teachersWithAssignments, search]);

  const toggle = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  };

  const totalToDelete = useMemo(() => {
    return schoolAssignments.filter(a => selected.has(a.teacherId)).length;
  }, [schoolAssignments, selected]);
  const allSelected = filtered.length > 0 && filtered.every(x => selected.has(x.teacher.id));

  const handleConfirm = () => {
    if (selected.size === 0) return;
    onConfirm(Array.from(selected));
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

        <div className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl text-rose-600 flex items-center justify-center">
                <Users size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">حذف حسب المعلم</h3>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
              <X size={18} />
            </button>
          </div>
          <p className="text-xs font-bold text-slate-500 leading-relaxed">
            حدّد المعلمين الذين تريد حذف كل إسناداتهم.
          </p>

          <div className="relative mt-3">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن معلم"
              className="w-full pr-10 pl-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#655ac1]/20 focus:border-[#655ac1] outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-between gap-3 mt-3">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black">
              <span className="text-slate-500">المعلمون</span>
              <span className="text-slate-800">{filtered.length}</span>
              <span className="w-px h-4 bg-slate-200" />
              <span className="text-rose-600">المحدد {selected.size}</span>
            </div>
            {filtered.length > 0 && (
              <button
                onClick={() => setSelected(allSelected ? new Set() : new Set(filtered.map(x => x.teacher.id)))}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 text-[11px] font-black transition-colors"
              >
                {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={36} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">{search ? 'لا توجد نتائج' : 'لا يوجد معلمون لديهم إسنادات'}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(({ teacher, count }) => {
                const active = selected.has(teacher.id);
                const spec = specializations.find(s => s.id === teacher.specializationId)?.name || '—';
                return (
                  <button
                    key={teacher.id}
                    onClick={() => toggle(teacher.id)}
                    className={`w-full text-right px-3 py-3 rounded-xl border transition-all flex items-center justify-between gap-3 bg-white ${active ? 'border-rose-300' : 'border-slate-200 hover:border-rose-200'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-black truncate ${active ? 'text-rose-600' : 'text-slate-800'}`}>{teacher.name}</div>
                      <div className="text-[10px] font-bold text-slate-400">{spec} · {count} إسناد</div>
                    </div>
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border-2 shrink-0 bg-white ${active ? 'border-rose-500 text-rose-500' : 'border-slate-300 text-transparent'}`}>
                      <Check size={14} strokeWidth={3.5} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <div className="flex gap-2">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all">إلغاء</button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-500"
            >
              <Trash2 size={14} />
              حذف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
