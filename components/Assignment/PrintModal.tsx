import React, { useState, useMemo } from 'react';
import { Teacher, Subject, ClassInfo, Assignment, SchoolInfo, Specialization } from '../../types';
import { X, Printer, FileSignature, Clock, Check } from 'lucide-react';

interface Props {
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  assignments: Assignment[];
  specializations: Specialization[];
  schoolInfo: SchoolInfo;
  gradeSubjectMap: Record<string, string[]>;
  activeSchoolTab: string;
  onClose: () => void;
}

type ScopeKind = 'all' | 'teacher' | 'subject' | 'specialization' | 'unassigned';

const PrintModal: React.FC<Props> = ({
  teachers, subjects, classes, assignments, specializations,
  schoolInfo, gradeSubjectMap, activeSchoolTab, onClose,
}) => {
  const [scope, setScope] = useState<ScopeKind>('all');
  const [scopeTargetId, setScopeTargetId] = useState<string>(''); // id of teacher/subject/spec
  const [showSignature, setShowSignature] = useState(true);
  const [showWaiting, setShowWaiting] = useState(false);

  const sharedSchools = schoolInfo.sharedSchools || [];
  const schoolLabel = activeSchoolTab === 'main'
    ? (schoolInfo.schoolName || 'المدرسة الرئيسية')
    : (sharedSchools.find(s => s.id === activeSchoolTab)?.name || activeSchoolTab);

  const currentSchoolPhases = activeSchoolTab === 'main'
    ? schoolInfo.phases
    : (sharedSchools.find(s => s.id === activeSchoolTab)?.phases || schoolInfo.phases);

  const isClassInCurrentSchool = (c: { schoolId?: string }) => {
    if (activeSchoolTab === 'main') return !c.schoolId || c.schoolId === 'main';
    return c.schoolId === activeSchoolTab;
  };
  const isAssignableClass = (c?: Pick<ClassInfo, 'type'> | null) => !!c && (!c.type || c.type === 'class');

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

  const schoolAssignments = useMemo(() =>
    assignments.filter(a => {
      const cls = classes.find(c => c.id === a.classId);
      return isAssignableClass(cls) && isClassInCurrentSchool(cls);
    }), [assignments, classes, activeSchoolTab]);

  const schoolTeachers = useMemo(() =>
    teachers.filter(isTeacherInCurrentSchool), [teachers, activeSchoolTab]);
  const schoolClasses = useMemo(() =>
    classes.filter(c => isAssignableClass(c) && currentSchoolPhases.includes(c.phase) && isClassInCurrentSchool(c)),
    [classes, currentSchoolPhases, activeSchoolTab]);

  // المواد المستخدمة فعلًا في إسنادات المدرسة الحالية
  const usedSubjects = useMemo(() => {
    const ids = new Set(schoolAssignments.map(a => a.subjectId));
    return subjects.filter(s => ids.has(s.id));
  }, [schoolAssignments, subjects]);

  const usedSpecs = useMemo(() => {
    const ids = new Set(schoolTeachers.map(t => t.specializationId));
    return specializations.filter(s => ids.has(s.id));
  }, [schoolTeachers, specializations]);

  // ── إعداد بيانات الطباعة حسب النطاق ──
  const printData = useMemo(() => {
    if (scope === 'unassigned') {
      // قائمة (الفصل، المادة) غير المسندة
      const rows: { teacherName: string; spec: string; subjectName: string; className: string; periods: number; waiting: number }[] = [];
      schoolClasses.forEach(cls => {
        const relevant = subjects.filter(s =>
          !s.isArchived &&
          (getGradeSubjectIds(cls).includes(s.id) || cls.subjectIds?.includes(s.id))
        );
        const uniq = Array.from(new Map(relevant.map(s => [s.id, s])).values());
        uniq.forEach(s => {
          const exists = schoolAssignments.some(a => a.classId === cls.id && a.subjectId === s.id);
          if (!exists) {
            rows.push({
              teacherName: '—',
              spec: '—',
              subjectName: s.name,
              className: `${cls.grade}/${cls.section}`,
              periods: s.periodsPerClass,
              waiting: 0,
            });
          }
        });
      });
      return rows;
    }

    let filtered = schoolAssignments;
    if (scope === 'teacher' && scopeTargetId) {
      filtered = filtered.filter(a => a.teacherId === scopeTargetId);
    } else if (scope === 'subject' && scopeTargetId) {
      filtered = filtered.filter(a => a.subjectId === scopeTargetId);
    } else if (scope === 'specialization' && scopeTargetId) {
      filtered = filtered.filter(a => {
        const t = teachers.find(x => x.id === a.teacherId);
        return t?.specializationId === scopeTargetId;
      });
    }

    return filtered.map(a => {
      const t = teachers.find(x => x.id === a.teacherId);
      const s = subjects.find(x => x.id === a.subjectId);
      const c = classes.find(x => x.id === a.classId);
      const spec = specializations.find(sp => sp.id === t?.specializationId)?.name || '—';
      return {
        teacherName: t?.name || '—',
        spec,
        subjectName: s?.name || '—',
        className: c ? `${c.grade}/${c.section}` : '—',
        periods: s?.periodsPerClass || 0,
        waiting: (t as any)?.waitingQuota || 0,
      };
    });
  }, [scope, scopeTargetId, schoolAssignments, schoolClasses, teachers, subjects, classes, specializations]);

  const totalPeriods = printData.reduce((sum, r) => sum + r.periods, 0);

  // ── تنفيذ الطباعة ──
  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    const scopeLabel =
      scope === 'all' ? 'كل الإسناد' :
      scope === 'unassigned' ? 'غير المسند فقط' :
      scope === 'teacher' ? `معلم: ${teachers.find(t => t.id === scopeTargetId)?.name || ''}` :
      scope === 'subject' ? `مادة: ${subjects.find(s => s.id === scopeTargetId)?.name || ''}` :
      scope === 'specialization' ? `تخصص: ${specializations.find(s => s.id === scopeTargetId)?.name || ''}` : '';

    const rowsHtml = printData.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.teacherName}</td>
        <td>${r.spec}</td>
        <td>${r.subjectName}</td>
        <td>${r.className}</td>
        <td style="text-align:center">${r.periods}</td>
        ${showWaiting ? `<td style="text-align:center">${r.waiting}</td>` : ''}
        ${showSignature ? `<td></td>` : ''}
      </tr>
    `).join('');

    const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>إسناد المواد — ${schoolLabel}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: 'Tajawal', 'Cairo', Arial, sans-serif; color: #1e293b; padding: 0; margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 2px solid #655ac1; margin-bottom: 16px; }
  .head h1 { font-size: 20px; margin: 0; color: #655ac1; }
  .head .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
  .head .meta { font-size: 11px; color: #64748b; text-align: left; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: right; }
  thead th { background: #f0edff; color: #655ac1; font-weight: 900; font-size: 11px; }
  tfoot td { background: #f8fafc; font-weight: 900; }
  tr:nth-child(even) td { background: #fafafa; }
  .empty { text-align: center; padding: 40px; color: #94a3b8; font-weight: bold; }
  .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <h1>إسناد المواد للمعلمين</h1>
      <div class="sub">${schoolLabel} · ${scopeLabel}</div>
    </div>
    <div class="meta">
      <div>عدد الإسنادات: ${printData.length}</div>
      <div>إجمالي الحصص: ${totalPeriods}</div>
      <div>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</div>
    </div>
  </div>
  ${printData.length === 0 ? `<div class="empty">لا توجد بيانات للطباعة</div>` : `
  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>المعلم</th>
        <th>التخصص</th>
        <th>المادة</th>
        <th>الفصل</th>
        <th style="width:60px;text-align:center">حصص</th>
        ${showWaiting ? `<th style="width:80px;text-align:center">انتظار</th>` : ''}
        ${showSignature ? `<th style="width:150px;text-align:center">التوقيع</th>` : ''}
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr>
        <td colspan="5" style="text-align:left">الإجمالي</td>
        <td style="text-align:center">${totalPeriods}</td>
        ${showWaiting ? `<td></td>` : ''}
        ${showSignature ? `<td></td>` : ''}
      </tr>
    </tfoot>
  </table>`}
  <div class="footer">نظام متابع — ${new Date().getFullYear()}</div>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
    };
  };

  // ── خيارات النطاق المُسانِد ──
  const renderScopeTarget = () => {
    if (scope === 'teacher') {
      return (
        <select
          value={scopeTargetId}
          onChange={e => setScopeTargetId(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl text-sm focus:outline-none focus:border-[#655ac1]"
        >
          <option value="">اختر المعلم</option>
          {schoolTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      );
    }
    if (scope === 'subject') {
      return (
        <select
          value={scopeTargetId}
          onChange={e => setScopeTargetId(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl text-sm focus:outline-none focus:border-[#655ac1]"
        >
          <option value="">اختر المادة</option>
          {usedSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      );
    }
    if (scope === 'specialization') {
      return (
        <select
          value={scopeTargetId}
          onChange={e => setScopeTargetId(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl text-sm focus:outline-none focus:border-[#655ac1]"
        >
          <option value="">اختر التخصص</option>
          {usedSpecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      );
    }
    return null;
  };

  const canPrint = scope === 'all' || scope === 'unassigned' || !!scopeTargetId;

  const ScopeOption: React.FC<{ value: ScopeKind; label: string; desc: string }> = ({ value, label, desc }) => {
    const active = scope === value;
    return (
      <button
        onClick={() => { setScope(value); setScopeTargetId(''); }}
        className={`text-right p-3 rounded-xl border-2 transition-all ${active ? 'bg-[#f0edff] border-[#655ac1]' : 'bg-white border-slate-200 hover:border-[#655ac1]/40'}`}
      >
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-sm font-black ${active ? 'text-[#655ac1]' : 'text-slate-800'}`}>{label}</span>
          {active && <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#655ac1] text-white"><Check size={12} strokeWidth={3.5} /></span>}
        </div>
        <div className="text-[10px] font-bold text-slate-400">{desc}</div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl mx-4 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#f0edff] text-[#655ac1] flex items-center justify-center">
                <Printer size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">خيارات الطباعة</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">{schoolLabel}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">

          {/* النطاق */}
          <div>
            <div className="text-xs font-black text-slate-600 mb-2">النطاق:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ScopeOption value="all" label="كل الإسناد" desc="جميع إسنادات المدرسة الحالية" />
              <ScopeOption value="teacher" label="معلم محدد" desc="إسنادات معلم واحد" />
              <ScopeOption value="subject" label="مادة محددة" desc="إسنادات مادة عبر كل المعلمين" />
              <ScopeOption value="specialization" label="تخصص محدد" desc="كل معلمي تخصص معين" />
              <ScopeOption value="unassigned" label="غير المسند فقط" desc="المواد التي لم تُسند بعد" />
            </div>
            {(scope === 'teacher' || scope === 'subject' || scope === 'specialization') && (
              <div className="mt-3">
                {renderScopeTarget()}
              </div>
            )}
          </div>

          {/* الأعمدة الاختيارية */}
          <div>
            <div className="text-xs font-black text-slate-600 mb-2">أعمدة اختيارية:</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowSignature(!showSignature)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${showSignature ? 'bg-[#f0edff] text-[#655ac1] border-[#655ac1]/40' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                <FileSignature size={14} />
                عمود التوقيع
                {showSignature && <Check size={12} strokeWidth={3.5} className="text-[#655ac1]" />}
              </button>
              <button
                onClick={() => setShowWaiting(!showWaiting)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${showWaiting ? 'bg-[#f0edff] text-[#655ac1] border-[#655ac1]/40' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                <Clock size={14} />
                عمود نصاب الانتظار
                {showWaiting && <Check size={12} strokeWidth={3.5} className="text-[#655ac1]" />}
              </button>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-2">
              {showSignature || showWaiting ? 'عند إلغاء أي عمود اختياري يتوسّع عمود المواد والفصول' : 'يتم تكبير عمود المواد والفصول لاستيعاب المحتوى'}
            </p>
          </div>

          {/* ملخّص */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-black text-slate-600">معاينة سريعة:</div>
              <div className="text-[10px] font-bold text-slate-500 mt-1">
                ستُطبع {printData.length} {scope === 'unassigned' ? 'مادة غير مسندة' : 'إسناد'}
                {scope !== 'unassigned' && ` · ${totalPeriods} حصة`}
              </div>
            </div>
            <Printer size={28} className="text-slate-300" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all">
            إلغاء
          </button>
          <button
            onClick={handlePrint}
            disabled={!canPrint || printData.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#655ac1] text-white font-bold text-sm transition-all hover:bg-[#5046a0] shadow-md shadow-[#655ac1]/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#655ac1]"
          >
            <Printer size={16} />
            طباعة الآن
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;
