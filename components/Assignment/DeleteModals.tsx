import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Teacher, Subject, ClassInfo, Assignment, Specialization, SchoolInfo } from '../../types';
import { X, Trash2, Check, BookOpen, Users, Search, ChevronDown } from 'lucide-react';
import { createSpecializationOrderIndex, compareTeachersByAssignmentOrder } from './teacherSort';

// قائمة منسدلة بنفس تصميم نافذة حذف الفصول (Step4Classes)
const InlineSelect: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (value: string) => void;
}> = ({ value, options, placeholder, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOut = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 text-sm ${open ? 'ring-2 ring-[#8779fb]/20 border-[#655ac1]/40' : ''}`}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 max-h-60 overflow-y-auto custom-scrollbar">
          {options.length === 0 ? (
            <div className="py-4 text-center text-xs font-bold text-slate-400">لا توجد خيارات</div>
          ) : options.map(opt => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-right px-3 py-2 text-sm font-bold rounded-xl transition-colors flex items-center justify-between gap-3 ${active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}
              >
                <span className="truncate">{opt.label}</span>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                  <Check size={12} strokeWidth={3.5} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
//  حذف إسنادات فصل (فلترة بفصل/مادة ثم تحديد متعدد للحذف)
// ════════════════════════════════════════════════════════════════
interface DeleteBySubjectProps {
  subjects: Subject[];
  classes: ClassInfo[];
  assignments: Assignment[];
  activeSchoolTab: string;
  schoolLabel: string;
  onConfirm: (assignmentIds: string[]) => void;
  onClose: () => void;
}

export const DeleteBySubjectModal: React.FC<DeleteBySubjectProps> = ({
  subjects, classes, assignments, activeSchoolTab, onConfirm, onClose,
}) => {
  const [classChoice, setClassChoice] = useState(''); // '' = كل الفصول
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [subjectSearch, setSubjectSearch] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const isAssignableClass = (c?: Pick<ClassInfo, 'type'> | null) => !!c && (!c.type || c.type === 'class');

  // إسنادات المدرسة الحالية فقط
  const schoolAssignments = useMemo(() =>
    assignments.filter(a => {
      const cls = classes.find(c => c.id === a.classId);
      return isAssignableClass(cls) && (cls?.schoolId || 'main') === activeSchoolTab;
    }), [assignments, classes, activeSchoolTab]);

  const classOptions = useMemo(() => {
    const ids = new Set(schoolAssignments.map(a => a.classId));
    const opts = Array.from(ids)
      .map(id => classes.find(c => c.id === id))
      .filter((c): c is ClassInfo => !!c)
      .map(c => ({ value: c.id, label: c.name }));
    return [{ value: '', label: 'كل الفصول' }, ...opts];
  }, [schoolAssignments, classes]);

  // المواد المتاحة ضمن نطاق الفصل المختار + عدد الإسنادات لكلٍّ منها
  const availableSubjects = useMemo(() => {
    const inScope = classChoice
      ? schoolAssignments.filter(a => a.classId === classChoice)
      : schoolAssignments;
    const counts = new Map<string, number>();
    inScope.forEach(a => counts.set(a.subjectId, (counts.get(a.subjectId) || 0) + 1));
    return Array.from(counts.entries())
      .map(([id, count]) => ({ subject: subjects.find(s => s.id === id)!, count }))
      .filter(x => x.subject)
      .sort((a, b) => b.count - a.count);
  }, [schoolAssignments, subjects, classChoice]);

  // عند تغيير الفصل: إزالة المواد غير المتاحة من التحديد
  useEffect(() => {
    const valid = new Set(availableSubjects.map(x => x.subject.id));
    setSelectedSubjects(prev => {
      const next = new Set<string>();
      prev.forEach(id => { if (valid.has(id)) next.add(id); });
      return next.size === prev.size ? prev : next;
    });
  }, [availableSubjects]);

  const visibleSubjects = useMemo(() => {
    const term = subjectSearch.trim().toLowerCase();
    if (!term) return availableSubjects;
    return availableSubjects.filter(x => x.subject.name.toLowerCase().includes(term));
  }, [availableSubjects, subjectSearch]);

  const allVisibleSelected = visibleSubjects.length > 0 && visibleSubjects.every(x => selectedSubjects.has(x.subject.id));

  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllSubjects = () => {
    setSelectedSubjects(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleSubjects.forEach(x => next.delete(x.subject.id));
      } else {
        visibleSubjects.forEach(x => next.add(x.subject.id));
      }
      return next;
    });
  };

  // الإسنادات التي ستُحذف
  const targetAssignments = useMemo(() => {
    if (selectedSubjects.size === 0) return [];
    return schoolAssignments.filter(a => {
      if (classChoice && a.classId !== classChoice) return false;
      return selectedSubjects.has(a.subjectId);
    });
  }, [schoolAssignments, classChoice, selectedSubjects]);

  const targetCount = targetAssignments.length;
  const classLabel = classChoice
    ? classes.find(c => c.id === classChoice)?.name || ''
    : 'جميع الفصول';

  const handleConfirmDelete = () => {
    if (targetCount === 0) return;
    onConfirm(targetAssignments.map(a => a.id));
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative" onClick={e => e.stopPropagation()}>

        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <Trash2 size={20} className="text-rose-500" />
              حذف إسنادات فصل
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-1">اختر الفصل، ثم حدّد المواد المراد حذف إسنادها.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 shrink-0 border-b border-slate-100 bg-slate-50/40 space-y-3">
          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-1.5">الفصل</label>
            <InlineSelect
              value={classChoice}
              onChange={v => setClassChoice(v)}
              options={classOptions}
              placeholder="كل الفصول"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-1.5">بحث</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={subjectSearch}
                onChange={e => setSubjectSearch(e.target.value)}
                placeholder="ابحث عن مادة"
                className="w-full pr-10 pl-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#655ac1]/20 focus:border-[#655ac1] outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black">
              <span className="text-slate-500">المواد</span>
              <span className="text-slate-800">{visibleSubjects.length}</span>
              <span className="w-px h-4 bg-slate-200" />
              <span className="text-rose-600">المحدد {selectedSubjects.size}</span>
            </div>
            {visibleSubjects.length > 0 && (
              <button
                onClick={toggleAllSubjects}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 text-[11px] font-black transition-colors"
              >
                {allVisibleSelected ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
          {visibleSubjects.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-slate-400">
              {subjectSearch ? 'لا توجد نتائج' : 'لا توجد مواد مسندة في هذا النطاق'}
            </div>
          ) : visibleSubjects.map(({ subject, count }) => {
            const selected = selectedSubjects.has(subject.id);
            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => toggleSubject(subject.id)}
                className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 mb-1 ${selected ? 'border-rose-300' : 'border-transparent hover:bg-slate-50'}`}
              >
                <span className="min-w-0">
                  <span className={`block text-sm font-black truncate ${selected ? 'text-rose-600' : 'text-slate-700'}`}>{subject.name}</span>
                  <span className={`block text-[11px] font-bold truncate ${selected ? 'text-rose-400' : 'text-slate-400'}`}>{count} إسناد</span>
                </span>
                <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 ${selected ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-300 text-transparent'}`}>
                  <Check size={12} strokeWidth={3.5} />
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={() => { if (targetCount === 0) return; setShowConfirm(true); }}
            disabled={targetCount === 0}
            className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-black rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-rose-500/20"
          >
            حذف
          </button>
        </div>

        {showConfirm && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 flex items-start gap-3">
                <Trash2 size={28} className="text-rose-500 mt-0.5" />
                <div>
                  <h2 className="text-xl font-black text-slate-800 mb-2">تأكيد الحذف</h2>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    سيتم حذف {targetCount} إسناد لـ {selectedSubjects.size} مادة في {classLabel}. لا يمكن التراجع.
                  </p>
                </div>
              </div>
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-rose-500/20"
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        )}
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
  schoolInfo: SchoolInfo;
  activeSchoolTab: string;
  schoolLabel: string;
  onConfirm: (teacherIds: string[]) => void;
  onClose: () => void;
}

export const DeleteByTeacherModal: React.FC<DeleteByTeacherProps> = ({
  teachers, subjects, classes, assignments, specializations,
  schoolInfo, activeSchoolTab, onConfirm, onClose,
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
    const specIndex = createSpecializationOrderIndex(specializations, schoolInfo);
    schoolAssignments.forEach(a => {
      counts.set(a.teacherId, (counts.get(a.teacherId) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([id, count]) => ({ teacher: teachers.find(t => t.id === id)!, count }))
      .filter(x => x.teacher)
      .sort((a, b) => compareTeachersByAssignmentOrder(a.teacher, b.teacher, specIndex));
  }, [schoolAssignments, teachers, specializations, schoolInfo.specializationOrder]);

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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative" onClick={e => e.stopPropagation()}>

        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <Trash2 size={20} className="text-rose-500" />
              حذف إسنادات معلم
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-1">حدّد المعلمين الذين تريد حذف كل إسناداتهم.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 shrink-0 border-b border-slate-100 bg-slate-50/40">
          <label className="block text-[10px] font-black text-slate-500 mb-1.5">بحث</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن معلم"
              className="w-full pr-10 pl-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#655ac1]/20 focus:border-[#655ac1] outline-none transition-all"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center justify-between gap-3">
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

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-slate-400">
              {search ? 'لا توجد نتائج' : 'لا يوجد معلمون لديهم إسنادات'}
            </div>
          ) : filtered.map(({ teacher, count }) => {
            const active = selected.has(teacher.id);
            const spec = specializations.find(s => s.id === teacher.specializationId)?.name || '—';
            return (
              <button
                key={teacher.id}
                type="button"
                onClick={() => toggle(teacher.id)}
                className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 mb-1 ${active ? 'border-rose-300' : 'border-transparent hover:bg-slate-50'}`}
              >
                <span className="min-w-0">
                  <span className={`block text-sm font-black truncate ${active ? 'text-rose-600' : 'text-slate-700'}`}>{teacher.name}</span>
                  <span className={`block text-[11px] font-bold truncate ${active ? 'text-rose-400' : 'text-slate-400'}`}>{spec} · {count} إسناد</span>
                </span>
                <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 ${active ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-300 text-transparent'}`}>
                  <Check size={12} strokeWidth={3.5} />
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-black rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-rose-500/20"
          >
            حذف
          </button>
        </div>
      </div>
    </div>
  );
};
