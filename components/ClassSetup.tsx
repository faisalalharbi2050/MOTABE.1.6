
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Phase, ClassInfo, Subject, SchoolInfo } from '../types';
import {
  School, ChevronDown, ChevronRight, Plus, MoreHorizontal,
  Trash2, Edit3, BookOpen, Clock, CheckCircle2, X,
  AlertTriangle, Users, Layers, GraduationCap, Settings, Check
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const ARABIC_LETTERS = ['أ','ب','ج','د','هـ','و','ز','ح','ط','ي','ك','ل','م','ن','س','ع','ف','ص','ق','ر','ش','ت','ث','خ','ذ','ض','ظ','غ','ة','ى'];

const GRADE_TEMPLATES: Record<string, string[]> = {
  elementary: ['الأول','الثاني','الثالث','الرابع','الخامس','السادس'],
  middle:     ['الأول المتوسط','الثاني المتوسط','الثالث المتوسط'],
  high:       ['الأول الثانوي','الثاني الثانوي','الثالث الثانوي'],
};

const DAY_LABELS: Record<string, string> = {
  sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت',
};

const PRIMARY       = '#8779fb';
const PRIMARY_LIGHT = '#e5e1fe';

// ─── Types ────────────────────────────────────────────────────────────────────

type NamingMode    = 'numbers' | 'name_number' | 'name_letter';
type PhaseTemplate = 'elementary' | 'middle' | 'high' | 'custom';
interface WizardGrade { id: string; name: string; }

interface DropdownState { classId: string; top: number; right: number; }

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  classes: ClassInfo[];
  setClasses: React.Dispatch<React.SetStateAction<ClassInfo[]>>;
  subjects: Subject[];
  gradeSubjectMap: Record<string, string[]>;
  setGradeSubjectMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  schoolInfo: SchoolInfo;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ClassSetup: React.FC<Props> = ({
  classes, setClasses, subjects, gradeSubjectMap, setGradeSubjectMap, schoolInfo
}) => {

  // ── Phase / tabs ─────────────────────────────────────────────────────────────
  const [activePhase, setActivePhase] = useState<Phase>(
    (schoolInfo.phases || [])[0] || Phase.ELEMENTARY
  );
  const hasSecond = schoolInfo.hasSecondSchool && (schoolInfo.secondSchoolPhases || [])[0];

  // ── Grade label overrides (localStorage) ─────────────────────────────────────
  const [gradeLabelMap, setGradeLabelMap] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('classSetup_gradeLabelMap') || '{}'); }
    catch { return {}; }
  });
  useEffect(() => {
    localStorage.setItem('classSetup_gradeLabelMap', JSON.stringify(gradeLabelMap));
  }, [gradeLabelMap]);

  // ── Expanded grade blocks ──────────────────────────────────────────────────
  const [expandedGrades, setExpandedGrades] = useState<Set<number>>(new Set<number>());

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Portal dropdown ───────────────────────────────────────────────────────
  const [dropdown, setDropdown] = useState<DropdownState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [subjectModal, setSubjectModal]   = useState<{ grade: number } | null>(null);
  const [periodModal,  setPeriodModal]    = useState<{ classId: string } | null>(null);
  const [renameModal,  setRenameModal]    = useState<{ classId: string; value: string } | null>(null);
  const [deleteAllStep, setDeleteAllStep] = useState<0 | 1 | 2>(0);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkRenameOpen,    setBulkRenameOpen]    = useState(false);
  const [bulkRenameValues,  setBulkRenameValues]  = useState<Record<string, string>>({});
  const [bulkPeriodOpen,    setBulkPeriodOpen]    = useState(false);
  const [bulkPeriodCounts,  setBulkPeriodCounts]  = useState<Record<string, number>>({});

  // ── Wizard ────────────────────────────────────────────────────────────────
  const [wizardOpen,     setWizardOpen]     = useState(false);
  const [wizardStep,     setWizardStep]     = useState<1 | 2 | 3>(1);
  const [wizardTemplate, setWizardTemplate] = useState<PhaseTemplate>('elementary');
  const [wizardGrades,   setWizardGrades]   = useState<WizardGrade[]>([]);
  const [wizardCount,    setWizardCount]    = useState(1);
  const [wizardNaming,   setWizardNaming]   = useState<NamingMode>('numbers');

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────
  const currentPhaseClasses = useMemo(
    () => classes.filter(c => c.phase === activePhase),
    [classes, activePhase]
  );

  const classesByGrade = useMemo(() => {
    const map: Record<number, ClassInfo[]> = {};
    currentPhaseClasses.forEach(c => {
      if (!map[c.grade]) map[c.grade] = [];
      map[c.grade].push(c);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => a.section - b.section));
    return map;
  }, [currentPhaseClasses]);

  const gradeNumbers = useMemo(
    () => Object.keys(classesByGrade).map(Number).sort((a, b) => a - b),
    [classesByGrade]
  );

  const timing         = schoolInfo.timing;
  const activeDays     = timing?.activeDays || ['sunday','monday','tuesday','wednesday','thursday'];
  const globalPeriods  = timing?.periodCounts || {};

  // Auto-expand all grades when new ones appear
  useEffect(() => {
    setExpandedGrades(new Set(gradeNumbers));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeNumbers.join(',')]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getGradeLabel     = (grade: number) =>
    gradeLabelMap[`${activePhase}-${grade}`] || `الصف ${grade}`;
  const getClassName      = (c: ClassInfo) => c.name || `${c.grade}/${c.section}`;
  const findClass         = (id: string)   => classes.find(c => c.id === id);
  const getSubjectsForGrade = (grade: number) =>
    subjects.filter(s =>
      !s.isArchived &&
      s.phases.includes(activePhase) &&
      (!s.targetGrades || s.targetGrades.length === 0 || s.targetGrades.includes(grade))
    );

  // ── Toggle grade expand ───────────────────────────────────────────────────
  const toggleGrade = (grade: number) =>
    setExpandedGrades(prev => {
      const n = new Set(prev);
      n.has(grade) ? n.delete(grade) : n.add(grade);
      return n;
    });

  // ── Add class to grade ────────────────────────────────────────────────────
  const addClassToGrade = (grade: number) => {
    const existing   = classesByGrade[grade] || [];
    const maxSection = existing.reduce((m, c) => Math.max(m, c.section), 0);
    const newSection = maxSection + 1;
    const newClass: ClassInfo = {
      id: `${activePhase}-${grade}-${newSection}-${Date.now()}`,
      phase: activePhase,
      grade,
      section: newSection,
      name: `${grade}/${newSection}`,
      subjectIds: gradeSubjectMap[`${activePhase}-${grade}`] || [],
      createdAt: new Date().toISOString(),
    };
    setClasses(prev => [...prev, newClass]);
    setExpandedGrades(prev => new Set([...prev, grade]));
  };

  // ── Delete class ──────────────────────────────────────────────────────────
  const deleteClass = (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    setDropdown(null);
    setDeleteConfirm(null);
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  // ── Delete all ────────────────────────────────────────────────────────────
  const deleteAll = () => {
    setClasses(prev => prev.filter(c => c.phase !== activePhase));
    setSelectedIds(new Set());
    setDeleteAllStep(0);
  };

  // ── Bulk delete ───────────────────────────────────────────────────────────
  const bulkDelete = () => {
    setClasses(prev => prev.filter(c => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
    setBulkDeleteConfirm(false);
  };

  // ── Rename class ──────────────────────────────────────────────────────────
  const renameClass = (id: string, newName: string) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
    setRenameModal(null);
    setDropdown(null);
  };

  // ── Toggle subject for grade ──────────────────────────────────────────────
  const toggleSubject = (grade: number, subId: string) => {
    const key     = `${activePhase}-${grade}`;
    const current = gradeSubjectMap[key] || [];
    const updated = current.includes(subId)
      ? current.filter(id => id !== subId)
      : [...current, subId];
    setGradeSubjectMap({ ...gradeSubjectMap, [key]: updated });
  };

  // ── Update class period count ─────────────────────────────────────────────
  const updateClassPeriod = (classId: string, day: string, count: number) =>
    setClasses(prev => prev.map(c =>
      c.id !== classId ? c : { ...c, customPeriodCounts: { ...(c.customPeriodCounts || {}), [day]: count } }
    ));

  // ── Portal dropdown ───────────────────────────────────────────────────────
  const openDropdown = (e: React.MouseEvent, classId: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDeleteConfirm(null);
    setDropdown({
      classId,
      top:   rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  };

  useEffect(() => {
    if (!dropdown) return;
    const close = () => setDropdown(null);
    document.addEventListener('click', close);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('scroll', close, true);
    };
  }, [dropdown]);

  // ── Bulk rename ───────────────────────────────────────────────────────────
  const openBulkRename = () => {
    const vals: Record<string, string> = {};
    selectedIds.forEach(id => {
      const c = classes.find(x => x.id === id);
      if (c) vals[id] = getClassName(c);
    });
    setBulkRenameValues(vals);
    setBulkRenameOpen(true);
  };
  const applyBulkRename = () => {
    setClasses(prev => prev.map(c =>
      selectedIds.has(c.id) ? { ...c, name: bulkRenameValues[c.id] || c.name } : c
    ));
    setBulkRenameOpen(false);
    setSelectedIds(new Set());
  };

  // ── Bulk period ───────────────────────────────────────────────────────────
  const openBulkPeriod = () => {
    const counts: Record<string, number> = {};
    activeDays.forEach(d => { counts[d] = globalPeriods[d] || 0; });
    setBulkPeriodCounts(counts);
    setBulkPeriodOpen(true);
  };
  const applyBulkPeriod = () => {
    setClasses(prev => prev.map(c =>
      selectedIds.has(c.id)
        ? { ...c, customPeriodCounts: { ...(c.customPeriodCounts || {}), ...bulkPeriodCounts } }
        : c
    ));
    setBulkPeriodOpen(false);
  };

  // ── Wizard helpers ────────────────────────────────────────────────────────
  const selectTemplate = (t: PhaseTemplate) => {
    setWizardTemplate(t);
    const names = t === 'custom' ? ['المستوى الأول'] : (GRADE_TEMPLATES[t] || []);
    setWizardGrades(names.map((name, i) => ({ id: `g-${i}`, name })));
  };

  const openWizard = () => {
    setWizardStep(1);
    setWizardTemplate('elementary');
    setWizardCount(1);
    setWizardNaming('numbers');
    setWizardGrades(GRADE_TEMPLATES.elementary.map((n, i) => ({ id: `g-${i}`, name: n })));
    setWizardOpen(true);
  };

  const previewNames = useMemo((): string[][] =>
    wizardGrades.map((grade, gi) =>
      Array.from({ length: wizardCount }, (_, si) => {
        const sNum = si + 1;
        switch (wizardNaming) {
          case 'numbers':     return `${gi + 1}/${sNum}`;
          case 'name_number': return `${grade.name} / ${sNum}`;
          case 'name_letter': return `${grade.name} / ${ARABIC_LETTERS[si] || sNum}`;
          default:            return `${gi + 1}/${sNum}`;
        }
      })
    ),
    [wizardGrades, wizardCount, wizardNaming]
  );

  const createClasses = () => {
    const newClasses: ClassInfo[] = [];
    const newLabelMap = { ...gradeLabelMap };

    wizardGrades.forEach((grade, gi) => {
      const gradeNum = gi + 1;
      const gradeKey = `${activePhase}-${gradeNum}`;
      newLabelMap[gradeKey] = grade.name;

      for (let si = 0; si < wizardCount; si++) {
        const sNum = si + 1;
        let name: string;
        switch (wizardNaming) {
          case 'numbers':     name = `${gradeNum}/${sNum}`; break;
          case 'name_number': name = `${grade.name} / ${sNum}`; break;
          case 'name_letter': name = `${grade.name} / ${ARABIC_LETTERS[si] || sNum}`; break;
          default:            name = `${gradeNum}/${sNum}`;
        }
        newClasses.push({
          id: `${activePhase}-${gradeNum}-${sNum}-${Date.now()}-${si}`,
          phase: activePhase,
          grade: gradeNum,
          section: sNum,
          name,
          subjectIds: gradeSubjectMap[gradeKey] || [],
          createdAt: new Date().toISOString(),
        });
      }
    });

    setClasses(prev => [...prev.filter(c => c.phase !== activePhase), ...newClasses]);
    setGradeLabelMap(newLabelMap);
    setWizardOpen(false);

    const total = wizardGrades.length * wizardCount;
    setTimeout(() => showToast(`تم إنشاء ${wizardGrades.length} صفوف و${total} فصلاً بنجاح`), 200);
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24" dir="rtl">

      {/* ── Title bar (unchanged) ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">الصفوف والفصول</h2>
          <p className="text-slate-400">إدارة الفصول والصفوف الدراسية للمرحلة المختارة.</p>
        </div>
      </div>

      {/* ── School tabs (unchanged) ────────────────────────────────────────── */}
      {hasSecond && (
        <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200 shadow-inner">
          <button
            onClick={() => setActivePhase((schoolInfo.phases || [])[0] || Phase.ELEMENTARY)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all ${
              activePhase === (schoolInfo.phases || [])[0]
                ? 'bg-white text-primary shadow-md'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <School size={18} /> {schoolInfo.schoolName || 'المدرسة الأساسية'}
          </button>
          <button
            onClick={() => setActivePhase((schoolInfo.secondSchoolPhases || [])[0]!)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all ${
              activePhase === (schoolInfo.secondSchoolPhases || [])[0]
                ? 'bg-white text-primary shadow-md'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <School size={18} /> {schoolInfo.secondSchoolName || 'المدرسة الثانية'}
          </button>
        </div>
      )}

      {/* ── Statistics cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: PRIMARY_LIGHT }}>
            <Layers size={22} style={{ color: PRIMARY }} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold">عدد الصفوف / المستويات</p>
            <p className="text-3xl font-black text-slate-800">{gradeNumbers.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: PRIMARY_LIGHT }}>
            <Users size={22} style={{ color: PRIMARY }} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold">إجمالي الفصول</p>
            <p className="text-3xl font-black text-slate-800">{currentPhaseClasses.length}</p>
          </div>
        </div>
      </div>

      {/* ── Action bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Create classes button */}
        <button
          onClick={openWizard}
          className="flex items-center gap-2 px-5 py-3 text-white text-sm font-black rounded-xl shadow-md transition-all hover:opacity-90"
          style={{ background: PRIMARY }}
        >
          <Plus size={18} /> إنشاء الفصول
        </button>

        {/* Bulk action bar */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <span className="text-xs text-slate-400 font-bold ml-2 pl-2 border-l border-slate-100">
            {selectedIds.size > 0 ? `${selectedIds.size} محدد` : 'إجراءات جماعية'}
          </span>
          <button
            onClick={openBulkRename}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-600"
          >
            <Edit3 size={13} /> تعديل المسمى
          </button>
          <button
            onClick={() => { if (selectedIds.size > 0) openBulkPeriod(); }}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-600"
          >
            <Clock size={13} /> تخصيص حصص
          </button>
          <button
            onClick={() => { if (selectedIds.size > 0) setBulkDeleteConfirm(true); }}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-50 text-rose-500"
          >
            <Trash2 size={13} /> حذف المحدد
          </button>
        </div>

        {/* Delete all */}
        {currentPhaseClasses.length > 0 && (
          <button
            onClick={() => setDeleteAllStep(1)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl border-2 border-rose-200 text-rose-500 hover:bg-rose-50 transition-all mr-auto"
          >
            <Trash2 size={13} /> حذف الكل
          </button>
        )}
      </div>

      {/* ── Grade blocks ──────────────────────────────────────────────────── */}
      {gradeNumbers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
               style={{ background: PRIMARY_LIGHT }}>
            <GraduationCap size={32} style={{ color: PRIMARY }} />
          </div>
          <p className="text-slate-600 font-black text-lg mb-1">لا توجد فصول بعد</p>
          <p className="text-slate-400 text-sm">اضغط على "إنشاء الفصول" للبدء</p>
        </div>
      ) : (
        <div className="space-y-3">
          {gradeNumbers.map(grade => {
            const gradeClasses   = classesByGrade[grade] || [];
            const isExpanded     = expandedGrades.has(grade);
            const gradeLabel     = getGradeLabel(grade);
            const allSelected    = gradeClasses.length > 0 && gradeClasses.every(c => selectedIds.has(c.id));
            const someSelected   = gradeClasses.some(c => selectedIds.has(c.id));

            return (
              <div key={grade} className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">

                {/* Grade header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
                  style={{ background: PRIMARY }}
                  onClick={() => toggleGrade(grade)}
                >
                  <div className="flex items-center gap-3">
                    {/* Grade-level checkbox */}
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        const n = new Set(selectedIds);
                        if (allSelected) gradeClasses.forEach(c => n.delete(c.id));
                        else             gradeClasses.forEach(c => n.add(c.id));
                        setSelectedIds(n);
                      }}
                      className="w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                      style={{
                        background: (allSelected || someSelected) ? 'white' : 'transparent',
                        borderColor: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {(allSelected || someSelected) && (
                        <Check size={12} style={{ color: PRIMARY }} />
                      )}
                    </div>

                    {/* Grade number badge */}
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.2)' }}>
                      {grade}
                    </span>
                    <div>
                      <span className="text-white font-black text-sm">{gradeLabel}</span>
                      <span className="text-white/70 text-xs font-bold mr-2">({gradeClasses.length} فصل)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Add class button — always visible, no hover needed */}
                    <button
                      onClick={e => { e.stopPropagation(); addClassToGrade(grade); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-lg transition-all"
                      style={{ background: 'rgba(255,255,255,0.2)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                    >
                      <Plus size={14} /> إضافة فصل
                    </button>
                    <div className="text-white/80">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                </div>

                {/* Grade content — class table */}
                {isExpanded && (
                  <div className="bg-white">
                    {gradeClasses.length === 0 ? (
                      <div className="py-6 text-center text-sm text-slate-400">
                        لا توجد فصول في هذا الصف
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-50 bg-slate-50/50">
                            <th className="w-10 py-2 px-4" />
                            <th className="py-2 px-4 text-right text-xs text-slate-400 font-bold">اسم الفصل</th>
                            <th className="w-12 py-2 px-4" />
                          </tr>
                        </thead>
                        <tbody>
                          {gradeClasses.map(cls => (
                            <tr
                              key={cls.id}
                              className={`border-b border-slate-50 last:border-0 transition-colors ${
                                selectedIds.has(cls.id) ? 'bg-purple-50/60' : 'hover:bg-slate-50/70'
                              }`}
                            >
                              <td className="py-3 px-4">
                                <div
                                  onClick={() => {
                                    const n = new Set(selectedIds);
                                    n.has(cls.id) ? n.delete(cls.id) : n.add(cls.id);
                                    setSelectedIds(n);
                                  }}
                                  className="w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all"
                                  style={{
                                    background:   selectedIds.has(cls.id) ? PRIMARY : 'transparent',
                                    borderColor:  selectedIds.has(cls.id) ? PRIMARY : '#cbd5e1',
                                  }}
                                >
                                  {selectedIds.has(cls.id) && <Check size={10} className="text-white" />}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm font-bold text-slate-700">{getClassName(cls)}</span>
                              </td>
                              <td className="py-3 px-4 text-left">
                                <button
                                  onClick={e => openDropdown(e, cls.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-all"
                                >
                                  <MoreHorizontal size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
           PORTAL: dropdown (⋯ menu) — single global element
         ════════════════════════════════════════════════════════════════════ */}
      {dropdown && createPortal(
        <div
          className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5"
          style={{ top: dropdown.top, right: dropdown.right, minWidth: 175 }}
          onClick={e => e.stopPropagation()}
        >
          {/* تخصيص المواد */}
          <button
            onClick={() => {
              const cls = findClass(dropdown.classId);
              if (cls) { setSubjectModal({ grade: cls.grade }); setDropdown(null); }
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors"
          >
            <BookOpen size={15} style={{ color: PRIMARY }} /> تخصيص المواد
          </button>

          {/* تخصيص الحصص */}
          <button
            onClick={() => { setPeriodModal({ classId: dropdown.classId }); setDropdown(null); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors"
          >
            <Clock size={15} style={{ color: PRIMARY }} /> تخصيص الحصص
          </button>

          {/* تعديل المسمى */}
          <button
            onClick={() => {
              const cls = findClass(dropdown.classId);
              if (cls) { setRenameModal({ classId: cls.id, value: getClassName(cls) }); setDropdown(null); }
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors"
          >
            <Edit3 size={15} style={{ color: PRIMARY }} /> تعديل المسمى
          </button>

          <div className="border-t border-slate-100 my-1" />

          {/* حذف الفصل */}
          {deleteConfirm === dropdown.classId ? (
            <div className="px-4 py-2.5">
              <p className="text-xs text-rose-600 font-bold mb-2">تأكيد الحذف؟</p>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteClass(dropdown.classId)}
                  className="flex-1 py-1.5 bg-rose-500 text-white text-xs rounded-lg font-black"
                >حذف</button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-lg font-black"
                >إلغاء</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(dropdown.classId)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 font-bold transition-colors"
            >
              <Trash2 size={15} /> حذف الفصل
            </button>
          )}
        </div>,
        document.body
      )}

      {/* ════════════════════════════════════════════════════════════════════
           MODAL: Subject Assignment
         ════════════════════════════════════════════════════════════════════ */}
      {subjectModal && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
          onClick={() => setSubjectModal(null)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-800">تخصيص المواد</h3>
                <p className="text-xs text-slate-400 mt-0.5">{getGradeLabel(subjectModal.grade)}</p>
              </div>
              <button
                onClick={() => setSubjectModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar">
              {getSubjectsForGrade(subjectModal.grade).length === 0 && (
                <p className="text-center text-sm text-slate-400 py-8">لا توجد مواد لهذا الصف</p>
              )}
              {getSubjectsForGrade(subjectModal.grade).map(sub => {
                const key     = `${activePhase}-${subjectModal.grade}`;
                const checked = (gradeSubjectMap[key] || []).includes(sub.id);
                return (
                  <label
                    key={sub.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => toggleSubject(subjectModal.grade, sub.id)}
                  >
                    <div
                      className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background:  checked ? PRIMARY : 'transparent',
                        borderColor: checked ? PRIMARY : '#cbd5e1',
                      }}
                    >
                      {checked && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700">{sub.name}</p>
                      <p className="text-xs text-slate-400">{sub.periodsPerClass} حصص أسبوعياً</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => setSubjectModal(null)}
                className="w-full py-3 rounded-xl font-black text-white text-sm"
                style={{ background: PRIMARY }}
              >حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
           MODAL: Period Assignment (single class)
         ════════════════════════════════════════════════════════════════════ */}
      {periodModal && (() => {
        const cls = findClass(periodModal.classId);
        if (!cls) return null;
        return (
          <div
            className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
            onClick={() => setPeriodModal(null)}
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-6 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-slate-800">تخصيص الحصص</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{getClassName(cls)}</p>
                </div>
                <button
                  onClick={() => setPeriodModal(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activeDays.map(day => {
                    const global = globalPeriods[day] || 0;
                    const custom = cls.customPeriodCounts?.[day];
                    const count  = custom !== undefined ? custom : global;
                    const isCustomized = custom !== undefined && custom !== global;
                    return (
                      <div
                        key={day}
                        className="flex flex-col items-center p-4 rounded-2xl border transition-all"
                        style={{
                          background:   isCustomized ? PRIMARY_LIGHT : '#f8fafc',
                          borderColor:  isCustomized ? PRIMARY : '#e2e8f0',
                        }}
                      >
                        <span
                          className="text-xs font-black mb-3"
                          style={{ color: isCustomized ? PRIMARY : '#475569' }}
                        >
                          {DAY_LABELS[day] || day}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateClassPeriod(cls.id, day, Math.max(0, count - 1))}
                            disabled={count <= 0}
                            className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all font-bold disabled:opacity-40"
                          >−</button>
                          <span className="w-8 text-center text-lg font-black text-slate-800">{count}</span>
                          <button
                            onClick={() => updateClassPeriod(cls.id, day, Math.min(12, count + 1))}
                            disabled={count >= 12}
                            className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:border-primary transition-all font-bold disabled:opacity-40"
                            onMouseEnter={e => (e.currentTarget.style.color = PRIMARY)}
                            onMouseLeave={e => (e.currentTarget.style.color = '')}
                          >+</button>
                        </div>
                        {isCustomized && (
                          <span className="text-[10px] font-bold mt-2" style={{ color: PRIMARY }}>مخصص</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={() => setPeriodModal(null)}
                  className="w-full py-3 rounded-xl font-black text-white text-sm"
                  style={{ background: PRIMARY }}
                >حفظ</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════════════
           MODAL: Rename Class
         ════════════════════════════════════════════════════════════════════ */}
      {renameModal && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
          onClick={() => setRenameModal(null)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-slate-800 mb-4">تعديل مسمى الفصل</h3>
            <input
              autoFocus
              className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none text-sm font-bold text-slate-700 focus:border-primary transition-all"
              value={renameModal.value}
              onChange={e => setRenameModal({ ...renameModal, value: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && renameClass(renameModal.classId, renameModal.value)}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => renameClass(renameModal.classId, renameModal.value)}
                className="flex-1 py-3 rounded-xl font-black text-white text-sm"
                style={{ background: PRIMARY }}
              >حفظ</button>
              <button
                onClick={() => setRenameModal(null)}
                className="flex-1 py-3 rounded-xl font-black text-slate-500 text-sm bg-slate-100 hover:bg-slate-200 transition-all"
              >إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
           MODAL: Bulk Rename
         ════════════════════════════════════════════════════════════════════ */}
      {bulkRenameOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
          onClick={() => setBulkRenameOpen(false)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="font-black text-slate-800">تعديل مسمى الفصول المحددة</h3>
              <button
                onClick={() => setBulkRenameOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar space-y-2">
              {[...selectedIds].map(id => {
                const cls = findClass(id);
                if (!cls) return null;
                return (
                  <div key={id} className="flex items-center gap-3">
                    <span
                      className="text-xs font-black px-2 py-1 rounded-lg flex-shrink-0"
                      style={{ background: PRIMARY_LIGHT, color: PRIMARY }}
                    >
                      {getGradeLabel(cls.grade)}
                    </span>
                    <input
                      className="flex-1 p-2 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-primary transition-all"
                      value={bulkRenameValues[id] || ''}
                      onChange={e => setBulkRenameValues(prev => ({ ...prev, [id]: e.target.value }))}
                    />
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={applyBulkRename}
                className="flex-1 py-3 rounded-xl font-black text-white text-sm"
                style={{ background: PRIMARY }}
              >تطبيق</button>
              <button
                onClick={() => setBulkRenameOpen(false)}
                className="flex-1 py-3 rounded-xl font-black text-slate-500 text-sm bg-slate-100 hover:bg-slate-200 transition-all"
              >إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
           MODAL: Bulk Period Assignment
         ════════════════════════════════════════════════════════════════════ */}
      {bulkPeriodOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
          onClick={() => setBulkPeriodOpen(false)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-800">تخصيص الحصص للفصول المحددة</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedIds.size} فصل محدد</p>
              </div>
              <button
                onClick={() => setBulkPeriodOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activeDays.map(day => {
                  const count = bulkPeriodCounts[day] ?? (globalPeriods[day] || 0);
                  return (
                    <div
                      key={day}
                      className="flex flex-col items-center p-4 bg-slate-50 rounded-2xl border border-slate-100"
                    >
                      <span className="text-xs font-black text-slate-600 mb-3">{DAY_LABELS[day] || day}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setBulkPeriodCounts(p => ({ ...p, [day]: Math.max(0, count - 1) }))}
                          disabled={count <= 0}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all font-bold disabled:opacity-40"
                        >−</button>
                        <span className="w-8 text-center text-lg font-black text-slate-800">{count}</span>
                        <button
                          onClick={() => setBulkPeriodCounts(p => ({ ...p, [day]: Math.min(12, count + 1) }))}
                          disabled={count >= 12}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 transition-all font-bold disabled:opacity-40"
                          onMouseEnter={e => (e.currentTarget.style.color = PRIMARY)}
                          onMouseLeave={e => (e.currentTarget.style.color = '')}
                        >+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={applyBulkPeriod}
                className="flex-1 py-3 rounded-xl font-black text-white text-sm"
                style={{ background: PRIMARY }}
              >تطبيق</button>
              <button
                onClick={() => setBulkPeriodOpen(false)}
                className="flex-1 py-3 rounded-xl font-black text-slate-500 text-sm bg-slate-100 hover:bg-slate-200 transition-all"
              >إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
           MODAL: Bulk Delete Confirm
         ════════════════════════════════════════════════════════════════════ */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-rose-500" />
            </div>
            <h3 className="font-black text-slate-800 mb-2">حذف الفصول المحددة</h3>
            <p className="text-sm text-slate-500 mb-6">
              سيتم حذف <strong>{selectedIds.size}</strong> فصل. لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3">
              <button
                onClick={bulkDelete}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-black text-sm"
              >حذف</button>
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-sm"
              >إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
           MODAL: Delete All — double confirmation
         ════════════════════════════════════════════════════════════════════ */}
      {deleteAllStep > 0 && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-rose-500" />
            </div>

            {deleteAllStep === 1 ? (
              <>
                <h3 className="font-black text-slate-800 mb-2">حذف جميع الفصول</h3>
                <p className="text-sm text-slate-500 mb-1">
                  سيتم حذف <strong>{currentPhaseClasses.length}</strong> فصل
                </p>
                <p className="text-xs text-slate-400 mb-6">من مرحلة: {activePhase}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteAllStep(2)}
                    className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-black text-sm"
                  >متابعة</button>
                  <button
                    onClick={() => setDeleteAllStep(0)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-sm"
                  >إلغاء</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-black text-rose-600 mb-2">تأكيد نهائي للحذف</h3>
                <p className="text-sm text-slate-500 mb-6">
                  هل أنت متأكد تماماً؟ سيتم حذف جميع الفصول ولا يمكن التراجع.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={deleteAll}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-sm"
                  >حذف نهائي</button>
                  <button
                    onClick={() => setDeleteAllStep(0)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-sm"
                  >إلغاء</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
           MODAL: Create Classes Wizard (3 steps)
         ════════════════════════════════════════════════════════════════════ */}
      {wizardOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            {/* Wizard header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-800 text-lg">إنشاء الفصول الدراسية</h3>
                {/* Step indicators */}
                <div className="flex items-center gap-2 mt-2">
                  {([
                    { n: 1, label: 'نوع المرحلة' },
                    { n: 2, label: 'الصفوف والمستويات' },
                    { n: 3, label: 'الفصول والتسمية' },
                  ] as { n: 1|2|3; label: string }[]).map(({ n, label }, idx) => (
                    <React.Fragment key={n}>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                        style={{
                          background: wizardStep >= n ? PRIMARY : '#f1f5f9',
                          color:      wizardStep >= n ? 'white'  : '#94a3b8',
                        }}
                      >
                        {wizardStep > n ? <Check size={13} /> : n}
                      </div>
                      {idx < 2 && (
                        <div
                          className="w-8 h-0.5 rounded-full transition-all"
                          style={{ background: wizardStep > n ? PRIMARY : '#e2e8f0' }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                  <span className="text-xs text-slate-400 font-bold mr-2">
                    {wizardStep === 1 ? 'نوع المرحلة' : wizardStep === 2 ? 'الصفوف والمستويات' : 'الفصول والتسمية'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setWizardOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Wizard body */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

              {/* ── Step 1: Phase template ─────────────────────────────── */}
              {wizardStep === 1 && (
                <div>
                  <p className="text-sm text-slate-500 font-bold mb-5">
                    اختر نوع المرحلة الدراسية لتحميل قالب الصفوف
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {([
                      { id: 'elementary', label: 'ابتدائية',       desc: '6 صفوف: الأول ← السادس',               Icon: GraduationCap },
                      { id: 'middle',     label: 'متوسطة',          desc: '3 صفوف: الأول ← الثالث المتوسط',       Icon: BookOpen      },
                      { id: 'high',       label: 'ثانوية',           desc: '3 صفوف: الأول ← الثالث الثانوي',       Icon: BookOpen      },
                      { id: 'custom',     label: 'مخصص بالكامل',    desc: 'ابدأ بمستوى واحد وأضف ما تريد',         Icon: Settings      },
                    ] as { id: PhaseTemplate; label: string; desc: string; Icon: React.ElementType }[]).map(t => {
                      const active = wizardTemplate === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => selectTemplate(t.id)}
                          className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all text-center"
                          style={{
                            borderColor: active ? PRIMARY : '#e2e8f0',
                            background:  active ? PRIMARY_LIGHT : 'white',
                          }}
                        >
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all"
                            style={{ background: active ? PRIMARY : '#f1f5f9' }}
                          >
                            <t.Icon size={24} style={{ color: active ? 'white' : '#94a3b8' }} />
                          </div>
                          <div>
                            <p className="font-black text-base" style={{ color: active ? PRIMARY : '#334155' }}>
                              {t.label}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Step 2: Grades list ────────────────────────────────── */}
              {wizardStep === 2 && (
                <div>
                  <p className="text-sm text-slate-500 font-bold mb-4">
                    عدّل أسماء الصفوف أو احذف / أضف مستويات جديدة
                  </p>
                  <div className="space-y-2">
                    {wizardGrades.map((grade, i) => (
                      <div key={grade.id} className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                          style={{ background: PRIMARY }}
                        >
                          {i + 1}
                        </span>
                        <input
                          className="flex-1 bg-transparent border-b border-slate-200 focus:border-primary focus:outline-none text-sm font-bold text-slate-700 pb-1 transition-all"
                          value={grade.name}
                          onChange={e => {
                            const updated = [...wizardGrades];
                            updated[i] = { ...grade, name: e.target.value };
                            setWizardGrades(updated);
                          }}
                        />
                        <button
                          onClick={() => setWizardGrades(wizardGrades.filter((_, j) => j !== i))}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-100 text-slate-300 hover:text-rose-400 transition-all flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setWizardGrades([
                      ...wizardGrades,
                      { id: `g-${Date.now()}`, name: `المستوى ${wizardGrades.length + 1}` }
                    ])}
                    className="mt-4 flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl border-2 border-dashed transition-all hover:opacity-80"
                    style={{ borderColor: PRIMARY, color: PRIMARY }}
                  >
                    <Plus size={16} /> إضافة صف / مستوى
                  </button>
                </div>
              )}

              {/* ── Step 3: Count + naming + preview ──────────────────── */}
              {wizardStep === 3 && (
                <div className="space-y-7">
                  {/* Count stepper */}
                  <div>
                    <p className="text-sm font-black text-slate-700 mb-4">عدد الفصول لكل صف</p>
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => setWizardCount(c => Math.max(1, c - 1))}
                        disabled={wizardCount <= 1}
                        className="w-11 h-11 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-rose-300 hover:text-rose-500 font-bold text-2xl transition-all disabled:opacity-40"
                      >−</button>
                      <span
                        className="text-4xl font-black w-14 text-center"
                        style={{ color: PRIMARY }}
                      >{wizardCount}</span>
                      <button
                        onClick={() => setWizardCount(c => Math.min(30, c + 1))}
                        disabled={wizardCount >= 30}
                        className="w-11 h-11 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-500 font-bold text-2xl transition-all disabled:opacity-40"
                        onMouseEnter={e => { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.color = PRIMARY; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.color = ''; }}
                      >+</button>
                      <span className="text-xs text-slate-400 font-bold">الحد الأقصى 30</span>
                    </div>
                  </div>

                  {/* Naming mode */}
                  <div>
                    <p className="text-sm font-black text-slate-700 mb-3">طريقة التسمية</p>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { mode: 'numbers',     label: 'أرقام',      example: '1/1  ،  1/2' },
                        { mode: 'name_number', label: 'اسم + رقم',  example: 'الأول / 1' },
                        { mode: 'name_letter', label: 'اسم + حرف',  example: 'الأول / أ' },
                      ] as { mode: NamingMode; label: string; example: string }[]).map(n => {
                        const active = wizardNaming === n.mode;
                        return (
                          <button
                            key={n.mode}
                            onClick={() => setWizardNaming(n.mode)}
                            className="p-4 rounded-2xl border-2 text-center transition-all"
                            style={{
                              borderColor: active ? PRIMARY : '#e2e8f0',
                              background:  active ? PRIMARY_LIGHT : 'white',
                            }}
                          >
                            <p className="font-black text-sm" style={{ color: active ? PRIMARY : '#334155' }}>
                              {n.label}
                            </p>
                            <p className="text-xs text-slate-400 mt-1 font-bold">{n.example}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live preview */}
                  <div>
                    <p className="text-sm font-black text-slate-700 mb-3">معاينة الأسماء</p>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 max-h-52 overflow-y-auto custom-scrollbar space-y-4">
                      {previewNames.map((gradeNames, gi) => (
                        <div key={gi}>
                          <p className="text-xs font-black mb-2" style={{ color: PRIMARY }}>
                            {wizardGrades[gi]?.name}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {gradeNames.map((name, si) => (
                              <span
                                key={si}
                                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard footer */}
            <div className="p-6 border-t border-slate-100 flex gap-3">
              {wizardStep > 1 && (
                <button
                  onClick={() => setWizardStep(s => (s - 1) as 1 | 2 | 3)}
                  className="px-6 py-3 rounded-xl font-black text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                >رجوع</button>
              )}
              {wizardStep < 3 ? (
                <button
                  onClick={() => setWizardStep(s => (s + 1) as 1 | 2 | 3)}
                  disabled={wizardStep === 2 && wizardGrades.length === 0}
                  className="flex-1 py-3 rounded-xl font-black text-white text-sm transition-all disabled:opacity-50"
                  style={{ background: PRIMARY }}
                >التالي</button>
              ) : (
                <button
                  onClick={createClasses}
                  className="flex-1 py-3 rounded-xl font-black text-white text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ background: PRIMARY }}
                >
                  <CheckCircle2 size={18} /> إنشاء الفصول
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
           PORTAL: Toast notification
         ════════════════════════════════════════════════════════════════════ */}
      {toast && createPortal(
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-white border border-slate-100 shadow-2xl px-6 py-4 rounded-2xl animate-in slide-in-from-bottom-4 duration-300"
          dir="rtl"
        >
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <span className="text-sm font-black text-slate-700">{toast}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-300 hover:text-slate-500 transition-colors mr-2"
          >
            <X size={14} />
          </button>
        </div>,
        document.body
      )}

    </div>
  );
};

export default ClassSetup;
