import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Teacher, Subject, ClassInfo, Assignment, SchoolInfo, Specialization } from '../../types';
import { X, Printer, Check, ChevronDown } from 'lucide-react';

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

type ScopeKind = 'all' | 'teacher' | 'class' | 'unassigned';

const escapeHtml = (s: string) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const PrintModal: React.FC<Props> = ({
  teachers, subjects, classes, assignments, specializations,
  schoolInfo, gradeSubjectMap, activeSchoolTab, onClose,
}) => {
  const [scope, setScope] = useState<ScopeKind | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [showSignature, setShowSignature] = useState(true);
  const [showWaiting, setShowWaiting] = useState(false);

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

  const schoolAssignments = useMemo(() =>
    assignments.filter(a => {
      const cls = classes.find(c => c.id === a.classId);
      return isAssignableClass(cls) && isClassInCurrentSchool(cls!);
    }), [assignments, classes, activeSchoolTab]);

  const schoolTeachers = useMemo(() =>
    teachers.filter(isTeacherInCurrentSchool), [teachers, activeSchoolTab]);

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
    if (scope !== 'teacher') setSelectedTeacherIds(new Set());
    if (scope !== 'class') setSelectedClassIds(new Set());
  }, [scope]);

  const subjectsForClass = (cls: ClassInfo) => {
    const ids = getGradeSubjectIds(cls);
    let list = subjects.filter(s => !s.isArchived && (ids.includes(s.id) || cls.subjectIds?.includes(s.id)));
    list = Array.from(new Map(list.map(s => [s.id, s])).values());
    return list;
  };

  const canShowExtraCols = scope === 'all' || scope === 'teacher';
  const showSigEffective = canShowExtraCols && showSignature;
  const showWaitEffective = canShowExtraCols && showWaiting;

  const canPrint =
    scope === 'all' ? schoolAssignments.length > 0 :
    scope === 'teacher' ? selectedTeacherIds.size > 0 :
    scope === 'class' ? selectedClassIds.size > 0 :
    scope === 'unassigned' ? true : false;

  // ── print html builders ──
  const renderTeachersBlocksHtml = (teacherIds: string[]): string => {
    const teacherList = teacherIds
      .map(id => teachers.find(t => t.id === id))
      .filter((t): t is Teacher => !!t);
    const specIds: string[] = [];
    teacherList.forEach(t => {
      if (!specIds.includes(t.specializationId)) specIds.push(t.specializationId);
    });

    return specIds.map(specId => {
      const specName = specializations.find(s => s.id === specId)?.name || 'بدون تخصص';
      const inSpec = teacherList.filter(t => t.specializationId === specId);

      const rows = inSpec.map((t, idx) => {
        const list = schoolAssignments.filter(a => a.teacherId === t.id);
        const chips = list.map(a => {
          const s = subjects.find(x => x.id === a.subjectId);
          const c = classes.find(x => x.id === a.classId);
          const p = s?.periodsPerClass || 0;
          return `<span class="chip">${escapeHtml(s?.name || '—')} - ${c ? `${c.section}/${c.grade}` : '—'} - ح${p}</span>`;
        }).join('');
        const totalPeriods = list.reduce((sum, a) => sum + (subjects.find(s => s.id === a.subjectId)?.periodsPerClass || 0), 0);
        const waiting = t.waitingQuota || 0;
        const quota = t.quotaLimit || 0;
        const grand = showWaitEffective ? totalPeriods + waiting : totalPeriods;
        return `
          <tr>
            <td class="ctr">${idx + 1}</td>
            <td class="b">${escapeHtml(t.name)}</td>
            <td class="chips-cell">${chips || '<span class="muted">—</span>'}</td>
            <td class="ctr nums">${quota}</td>
            ${showWaitEffective ? `<td class="ctr nums">${waiting}</td>` : ''}
            <td class="ctr nums b">${grand}</td>
            ${showSigEffective ? `<td class="sig"></td>` : ''}
          </tr>`;
      }).join('');

      return `
        <div class="card">
          <div class="card-head"><h4>${escapeHtml(specName)} <span class="muted">(${inSpec.length})</span></h4></div>
          <table>
            <colgroup>
              <col style="width:34px" />
              <col style="width:150px" />
              <col />
              <col style="width:60px" />
              ${showWaitEffective ? `<col style="width:70px" />` : ''}
              <col style="width:60px" />
              ${showSigEffective ? `<col style="width:130px" />` : ''}
            </colgroup>
            <thead>
              <tr>
                <th class="ctr">م</th>
                <th class="ctr">المعلم</th>
                <th class="ctr">المواد والفصول المسندة</th>
                <th class="ctr">نصاب الحصص</th>
                ${showWaitEffective ? `<th class="ctr">نصاب الانتظار</th>` : ''}
                <th class="ctr">الإجمالي</th>
                ${showSigEffective ? `<th class="ctr">التوقيع</th>` : ''}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join('');
  };

  const renderClassesGroupsHtml = (clsList: ClassInfo[]): string => {
    return clsList.map(cls => {
      const required = subjectsForClass(cls);
      const rowsHtml = required.map((s, idx) => {
        const a = schoolAssignments.find(x => x.classId === cls.id && x.subjectId === s.id);
        const t = a ? teachers.find(x => x.id === a.teacherId) : null;
        return `
          <tr>
            <td class="ctr">${idx + 1}</td>
            <td class="b ctr">${escapeHtml(s.name)}</td>
            <td class="ctr nums">${s.periodsPerClass}</td>
            <td class="ctr">${t ? escapeHtml(t.name) : '<span class="warn-text">غير مسندة</span>'}</td>
          </tr>`;
      }).join('');
      return `
        <div class="card">
          <div class="card-head"><h4>الفصل ${cls.section}/${cls.grade} <span class="muted">(${required.length} مادة)</span></h4></div>
          <table>
            <colgroup>
              <col style="width:34px" />
              <col />
              <col style="width:80px" />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th class="ctr">م</th>
                <th class="ctr">المادة</th>
                <th class="ctr">عدد الحصص</th>
                <th class="ctr">المعلم المسندة له</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
    }).join('');
  };

  const renderUnassignedHtml = (): string => {
    const teacherList = schoolTeachers.filter(t => !schoolAssignments.some(a => a.teacherId === t.id));
    const teacherRows = teacherList.map((t, idx) => {
      const spec = specializations.find(sp => sp.id === t.specializationId)?.name || '—';
      return `
        <tr>
          <td class="ctr">${idx + 1}</td>
          <td class="b warn-text ctr">${escapeHtml(t.name)}</td>
          <td class="ctr">${escapeHtml(spec)}</td>
        </tr>`;
    }).join('');

    type CRow = { className: string; subjects: string[] };
    const classRows: CRow[] = [];
    sortedSchoolClasses.forEach(cls => {
      const required = subjectsForClass(cls);
      const missing = required.filter(s => !schoolAssignments.some(a => a.classId === cls.id && a.subjectId === s.id));
      if (missing.length > 0) {
        classRows.push({ className: `${cls.section}/${cls.grade}`, subjects: missing.map(s => s.name) });
      }
    });
    const classRowsHtml = classRows.map((r, idx) => `
      <tr>
        <td class="ctr">${idx + 1}</td>
        <td class="b warn-text ctr">${r.className}</td>
        <td>
          ${r.subjects.map(sub => `<span class="chip">${escapeHtml(sub)}</span>`).join(' ')}
        </td>
      </tr>`).join('');

    const teacherSection = teacherList.length ? `
      <div class="card">
        <div class="card-head warn-head"><h4>معلمون غير مسندة لهم أي مادة <span class="muted">(${teacherList.length})</span></h4></div>
        <table>
          <colgroup>
            <col style="width:34px" />
            <col style="width:220px" />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th class="ctr">م</th>
              <th class="ctr">المعلم</th>
              <th class="ctr">التخصص</th>
            </tr>
          </thead>
          <tbody>${teacherRows}</tbody>
        </table>
      </div>` : '';

    const classSection = classRows.length ? `
      <div class="card">
        <div class="card-head warn-head"><h4>فصول بها مواد غير مسندة <span class="muted">(${classRows.length})</span></h4></div>
        <table>
          <colgroup>
            <col style="width:34px" />
            <col style="width:120px" />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th class="ctr">م</th>
              <th class="ctr">الفصل</th>
              <th class="ctr">المواد غير المسندة</th>
            </tr>
          </thead>
          <tbody>${classRowsHtml}</tbody>
        </table>
      </div>` : '';

    if (!teacherSection && !classSection) {
      return `<div class="empty">لا توجد عناصر بحاجة إلى إسناد</div>`;
    }
    return teacherSection + classSection;
  };

  const handlePrint = () => {
    if (!scope) return;
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) return;

    let bodyHtml = '';
    if (scope === 'all') {
      const teacherIds = Array.from(new Set(schoolAssignments.map(a => a.teacherId)));
      bodyHtml = teacherIds.length === 0 ? '<div class="empty">لا توجد إسنادات</div>' : renderTeachersBlocksHtml(teacherIds);
    } else if (scope === 'teacher') {
      bodyHtml = renderTeachersBlocksHtml(Array.from(selectedTeacherIds));
    } else if (scope === 'class') {
      const list = sortedSchoolClasses.filter(c => selectedClassIds.has(c.id));
      bodyHtml = list.length === 0 ? '<div class="empty">لم يتم اختيار فصول</div>' : renderClassesGroupsHtml(list);
    } else if (scope === 'unassigned') {
      bodyHtml = renderUnassignedHtml();
    }

    const currentSemester =
      schoolInfo.semesters?.find(s => s.id === schoolInfo.currentSemesterId) ??
      schoolInfo.semesters?.[0];
    const schoolName = schoolInfo.schoolName || '..........';
    const region = schoolInfo.region || 'إدارة التعليم بالمنطقة';
    const academicYear = schoolInfo.academicYear || '';
    const principalName = (schoolInfo as any).managerName || '';
    const logo = schoolInfo.logo
      ? `<img src="${escapeHtml(schoolInfo.logo)}" alt="شعار" />`
      : `<div class="logo-ph">شعار</div>`;

    const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>تقرير الإسناد</title>
<style>
  @page { size: A4 landscape; margin: 12mm 10mm 14mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Tajawal', 'Cairo', Arial, sans-serif; color: #1e293b; padding: 0; margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  .head { display: block; margin-bottom: 14px; color: #1e293b; }
  .head-wrap { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 14px; margin-bottom: 8px; }
  .head-right, .head-left { width: 33%; font-size: 12px; font-weight: 700; line-height: 1.8; color: #1e293b; }
  .head-right p, .head-left p { margin: 0; }
  .head-right { text-align: right; }
  .head-left { text-align: left; }
  .head-center { width: 33%; display: flex; justify-content: center; align-items: center; }
  .head-center img { width: 56px; height: 56px; object-fit: contain; }
  .logo-ph { width: 56px; height: 56px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8; }
  .head h1 { margin: 8px 0 14px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 900; }

  .card { display: block; margin-bottom: 12px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff; }
  .card-head { background: linear-gradient(to left, rgba(248,250,252,0.55), #ffffff); border-bottom: 1px solid #f1f5f9; padding: 10px 14px; }
  .card-head h4 { margin: 0; color: #1e293b; font-size: 14px; font-weight: 900; }
  .card-head .muted { color: #94a3b8; font-weight: 700; font-size: 12px; margin-right: 6px; }
  .card-head.warn-head h4 { color: #be123c; }

  table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; font-size: 11px; }
  thead tr { background: rgba(248,250,252,0.85); }
  th { padding: 8px 6px; color: #655ac1; font-size: 11px; font-weight: 900; line-height: 1.4; border-left: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; background: rgba(248,250,252,0.85); }
  td { padding: 7px 6px; color: #334155; font-size: 11px; font-weight: 700; line-height: 1.45; border-left: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; background: #ffffff; vertical-align: middle; word-wrap: break-word; }
  th:last-child, td:last-child { border-left: 0; }
  tbody tr:last-child td { border-bottom: 0; }
  tr { page-break-inside: avoid; break-inside: avoid; }

  .ctr { text-align: center; }
  .nums { font-variant-numeric: tabular-nums; }
  .b { font-weight: 900; color: #1e293b; }
  .muted { color: #94a3b8; font-weight: 700; }
  .sig { height: 28px; }
  .chips-cell { text-align: center; }
  .chip { display: inline-block; margin: 2px; padding: 3px 7px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 10px; font-weight: 700; color: #334155; }
  .warn-text { color: #be123c !important; font-weight: 900; }
  .ltr-num { direction: ltr; unicode-bidi: isolate; display: inline-block; font-variant-numeric: tabular-nums; }
  .empty { text-align: center; padding: 40px; color: #94a3b8; font-weight: bold; }

  .principal-block { margin-top: 24px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
  .principal-card { min-width: 220px; text-align: center; }
  .principal-card .label { font-size: 12px; font-weight: 900; color: #1e293b; margin-bottom: 4px; }
  .principal-card .name { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 24px; min-height: 14px; }
  .principal-card .sig-line { font-size: 11px; font-weight: 700; color: #334155; border-top: 1px solid #1e293b; padding-top: 4px; }

  .footer { margin-top: 14px; text-align: center; font-size: 10px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="head">
    <div class="head-wrap">
      <div class="head-right">
        <p>المملكة العربية السعودية</p>
        <p>وزارة التعليم</p>
        <p>${escapeHtml(region)}</p>
        <p>مدرسة ${escapeHtml(schoolName)}</p>
        <p>الفصل الدراسي: ${escapeHtml(currentSemester?.name || '')}</p>
      </div>
      <div class="head-center">${logo}</div>
      <div class="head-left">
        <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
        <p>العام الدراسي: ${escapeHtml(academicYear)}</p>
      </div>
    </div>
    <h1>تقرير الإسناد</h1>
  </div>
  ${bodyHtml}
  <div class="principal-block">
    <div class="principal-card">
      <div class="label">مدير المدرسة</div>
      <div class="name">${escapeHtml(principalName)}</div>
      <div class="sig-line">التوقيع</div>
    </div>
  </div>
  <div class="footer">نظام متابع — ${new Date().getFullYear()}</div>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  const scopeOptions: { value: ScopeKind; label: string }[] = [
    { value: 'all', label: 'كل الإسناد' },
    { value: 'teacher', label: 'إسناد معلم' },
    { value: 'class', label: 'إسناد فصل' },
    { value: 'unassigned', label: 'بحاجة إلى إسناد' },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <Printer size={22} className="text-[#655ac1]" />
              طباعة الإسناد
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-1">اختر نطاق الطباعة المطلوب.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="إغلاق">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
          {scopeOptions.map(opt => {
            const active = scope === opt.value;
            return (
              <React.Fragment key={opt.value}>
                <button
                  onClick={() => setScope(active ? null : opt.value)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-black transition-all ${active ? 'border-slate-300 text-[#655ac1] bg-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <span>{opt.label}</span>
                  <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'}`}>
                    <Check size={12} strokeWidth={3.5} />
                  </span>
                </button>

                {opt.value === 'teacher' && active && (
                  <InlineMultiSelect
                    label="المعلمون"
                    items={schoolTeachers.map(t => ({
                      id: t.id,
                      primary: t.name,
                      secondary: specializations.find(s => s.id === t.specializationId)?.name || '—',
                    }))}
                    selectedIds={selectedTeacherIds}
                    onToggle={(id) => setSelectedTeacherIds(prev => {
                      const n = new Set(prev);
                      if (n.has(id)) n.delete(id); else n.add(id);
                      return n;
                    })}
                    placeholder="اختر المعلمين"
                  />
                )}

                {opt.value === 'class' && active && (
                  <InlineMultiSelect
                    label="الفصول"
                    items={sortedSchoolClasses.map(c => ({
                      id: c.id,
                      primary: `الفصل ${c.section}/${c.grade}`,
                      secondary: '',
                    }))}
                    selectedIds={selectedClassIds}
                    onToggle={(id) => setSelectedClassIds(prev => {
                      const n = new Set(prev);
                      if (n.has(id)) n.delete(id); else n.add(id);
                      return n;
                    })}
                    placeholder="اختر الفصول"
                  />
                )}
              </React.Fragment>
            );
          })}

          {canShowExtraCols && (
            <div className="pt-2">
              <div className="text-xs font-black text-slate-600 mb-2 px-1">أضف أعمدة اختيارية قبل الطباعة</div>
              <div className="flex flex-wrap gap-2">
                <OptionalColumnButton
                  active={showSignature}
                  onClick={() => setShowSignature(!showSignature)}
                  label="توقيع المعلم"
                />
                <OptionalColumnButton
                  active={showWaiting}
                  onClick={() => setShowWaiting(!showWaiting)}
                  label="نصاب الانتظار"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors">
            إلغاء
          </button>
          <button
            onClick={handlePrint}
            disabled={!canPrint}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#655ac1] text-white text-sm font-bold rounded-xl hover:bg-[#5448a8] shadow-md shadow-[#655ac1]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Printer size={16} />
            طباعة
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Optional column button — smaller text, smaller checkbox, no icon ──
const OptionalColumnButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
}> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-all flex items-center gap-2 bg-white border-slate-200 hover:border-slate-300 ${active ? 'text-[#655ac1]' : 'text-slate-500'}`}
  >
    <span>{label}</span>
    <span className={`w-4 h-4 rounded-full border-2 inline-flex items-center justify-center transition-colors shrink-0 ${active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
      <Check size={10} strokeWidth={3.5} />
    </span>
  </button>
);

// ── Inline multi-select with count INSIDE the dropdown panel (no select-all) ──
const InlineMultiSelect: React.FC<{
  label: string;
  items: { id: string; primary: string; secondary: string }[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  placeholder: string;
}> = ({ label, items, selectedIds, onToggle, placeholder }) => {
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

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
        className={`w-full px-3 py-2.5 bg-white border-2 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 text-xs ${open ? 'border-[#655ac1]/40 ring-2 ring-[#8779fb]/20' : 'border-slate-200'}`}
      >
        <span className="truncate">
          {selectedIds.size > 0 ? `${label} — المحدد ${selectedIds.size}` : placeholder}
        </span>
        <ChevronDown size={13} className={`text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-top-2">
          {/* Header inside the dropdown: count only */}
          <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
            <div className="inline-flex items-center gap-2 text-[11px] font-black">
              <span className="text-slate-500">{label}</span>
              <span className="text-slate-800">{items.length}</span>
              <span className="w-px h-3.5 bg-slate-200" />
              <span className="text-[#655ac1]">المحدد {selectedIds.size}</span>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto custom-scrollbar p-2">
            {items.length === 0 ? (
              <div className="py-6 text-center text-xs font-bold text-slate-400">لا توجد عناصر</div>
            ) : items.map(it => {
              const active = selectedIds.has(it.id);
              return (
                <button
                  key={it.id}
                  onClick={() => onToggle(it.id)}
                  className={`w-full text-right px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-between gap-2 ${active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{it.primary}</span>
                    {it.secondary && <span className="block text-[10px] text-slate-400 font-bold truncate">{it.secondary}</span>}
                  </span>
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

export default PrintModal;
