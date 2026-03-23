import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Book, GraduationCap, Building, School, Activity, Star, Check, Printer, Eye, ChevronDown, ChevronLeft, Info, CheckCircle2, Layers } from 'lucide-react';
import { Phase, SchoolInfo } from '../../types';
import { STUDY_PLANS_CONFIG, StudyPlanDepartment, StudyPlanEntry } from '../../study_plans_config';
import { DETAILED_TEMPLATES } from '../../constants';

// ── Print CSS ────────────────────────────────────────────────────────────────
const PRINT_CSS = `
  @page { size: A4 portrait; }
  @media print {
    body * { visibility: hidden !important; }
    #sp-modal-print, #sp-modal-print * { visibility: visible !important; }
    #sp-modal-print {
      position: fixed; inset: 0; padding: 32px;
      background: white; direction: rtl;
      font-family: 'Tajawal', sans-serif;
    }
    .no-print { display: none !important; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    th, td { border: 1px solid #e2e8f0; padding: 9px 14px; text-align: right; }
    th { background: #ede9fe !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight: 900; }
    .print-plan-header { background: #655ac1 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 10px 16px; border-radius: 8px; margin-bottom: 8px; font-weight: 900; }
    .print-block { margin-bottom: 32px; page-break-inside: avoid; }
  }
`;

function injectPrintCSS() {
  if (!document.getElementById('sp-modal-print-css')) {
    const s = document.createElement('style');
    s.id = 'sp-modal-print-css';
    s.textContent = PRINT_CSS;
    document.head.appendChild(s);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function collectAllKeys(dept: StudyPlanDepartment): string[] {
  if (dept.subDepartments?.length) {
    return dept.subDepartments.flatMap(sd => sd.plans.map(p => p.key));
  }
  return dept.plans.map(p => p.key);
}

// semester-tab helpers
function stripSemester(label: string): string {
  return label.replace(/ - ف[١٢]/, '').replace(/ - فصل (أول|ثاني)/, '').trim();
}

const getPhaseIcon = (phase: Phase) => {
  switch (phase) {
    case Phase.ELEMENTARY: return School;
    case Phase.MIDDLE: return Building;
    case Phase.HIGH: return GraduationCap;
    case Phase.KINDERGARTEN: return Activity;
    default: return Star;
  }
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface StudyPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprovePlan: (phase: Phase, departmentId: string, planKeys: string[], periodsOverride?: Record<string, number>) => void;
  schoolPhases: Phase[];
  activeSchoolId: string;
  onSchoolChange: (id: string) => void;
  schoolInfo: SchoolInfo;
}

// ── Component ─────────────────────────────────────────────────────────────────
const StudyPlansModal: React.FC<StudyPlansModalProps> = ({
  isOpen, onClose, onApprovePlan, schoolPhases, activeSchoolId, onSchoolChange, schoolInfo
}) => {
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId]   = useState<string | null>(null);
  const [selectedSubId,  setSelectedSubId]    = useState<string | null>(null);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<'1' | '2' | null>(null);
  const [kgPeriods, setKgPeriods] = useState<Record<string, number>>({});
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) {
      setSelectedPhaseId(null);
      setSelectedDeptId(null);
      setSelectedSubId(null);
      setSelectedPlanKey(null);
      setSelectedSemester(null);
      setKgPeriods({});
    }
  }, [isOpen]);

  const availableCategories = useMemo(() => STUDY_PLANS_CONFIG, [schoolPhases]);

  const selectedCategory   = useMemo(() => STUDY_PLANS_CONFIG.find(c => c.id === selectedPhaseId), [selectedPhaseId]);
  const selectedDepartment = useMemo(() => selectedCategory?.departments.find(d => d.id === selectedDeptId), [selectedCategory, selectedDeptId]);
  const selectedSubDept    = useMemo(() => selectedDepartment?.subDepartments?.find(sd => sd.id === selectedSubId), [selectedDepartment, selectedSubId]);

  // The plans to show as tabs (either from subDept or directly from dept)
  const activePlans: StudyPlanEntry[] = selectedSubDept?.plans ?? selectedDepartment?.plans ?? [];

  // When dept changes, auto-select first sub/plan
  useEffect(() => {
    if (!selectedDepartment) { setSelectedSubId(null); setSelectedPlanKey(null); return; }
    setSelectedSemester(null);
    if (selectedDepartment.subDepartments?.length) {
      const firstSub = selectedDepartment.subDepartments[0];
      setSelectedSubId(firstSub.id);
      setSelectedPlanKey(firstSub.plans[0]?.key ?? null);
    } else {
      setSelectedSubId(null);
      setSelectedPlanKey(selectedDepartment.plans[0]?.key ?? null);
    }
  }, [selectedDeptId]);

  // When subDept changes, auto-select first plan
  useEffect(() => {
    if (selectedSubDept) setSelectedPlanKey(selectedSubDept.plans[0]?.key ?? null);
  }, [selectedSubId]);

  const previewSubjects = selectedPlanKey ? (DETAILED_TEMPLATES[selectedPlanKey] ?? []) : [];
  const totalPeriods = previewSubjects.reduce((s, x) => s + (x.periodsPerClass ?? 0), 0);

  // Whether this is the HS masarat dept that requires semester selection
  const isHSMasarat = selectedDeptId === 'الثانوية_العامة' && selectedCategory?.phase === Phase.HIGH;
  const isKindergarten = selectedCategory?.phase === Phase.KINDERGARTEN;

  // Plans filtered by selected semester (for HS masarat)
  const displayedPlans: StudyPlanEntry[] = isHSMasarat && selectedSemester
    ? (selectedSubDept?.plans ?? selectedDepartment?.plans ?? []).filter(p =>
        p.key.includes(selectedSemester === '1' ? 'الفصل_الأول' : 'الفصل_الثاني')
      )
    : (selectedSubDept?.plans ?? selectedDepartment?.plans ?? []);

  // Auto-select first displayed plan when semester changes
  useEffect(() => {
    if (displayedPlans.length > 0 && !displayedPlans.find(p => p.key === selectedPlanKey)) {
      setSelectedPlanKey(displayedPlans[0].key);
    }
  }, [selectedSemester, selectedSubId]);

  // Initialize kindergarten editable periods
  useEffect(() => {
    if (isKindergarten && previewSubjects.length > 0) {
      setKgPeriods(prev => {
        const next = { ...prev };
        previewSubjects.forEach(s => { if (next[s.id] === undefined) next[s.id] = s.periodsPerClass ?? 0; });
        return next;
      });
    }
  }, [selectedPlanKey, isKindergarten]);

  const kgTotal = isKindergarten ? previewSubjects.reduce((s, x) => s + (kgPeriods[x.id] ?? 0), 0) : totalPeriods;

  const handleSave = () => {
    if (!selectedCategory || !selectedDepartment) return;
    if (isHSMasarat) {
      if (!selectedSemester) {
        alert('يرجى تحديد الفصل الدراسي (الفصل الأول أو الثاني) قبل الاعتماد');
        return;
      }
      const semPattern = selectedSemester === '1' ? 'الفصل_الأول' : 'الفصل_الثاني';
      const keys = collectAllKeys(selectedDepartment).filter(k => k.includes(semPattern));
      onApprovePlan(selectedCategory.phase as Phase, selectedDepartment.id + '_ف' + selectedSemester, keys);
    } else if (isKindergarten) {
      const allKeys = collectAllKeys(selectedDepartment);
      onApprovePlan(selectedCategory.phase as Phase, selectedDepartment.id, allKeys, kgPeriods);
    } else {
      onApprovePlan(selectedCategory.phase as Phase, selectedDepartment.id, collectAllKeys(selectedDepartment));
    }
  };

  const handlePrint = (mode: 'plan' | 'dept') => {
    injectPrintCSS();
    const el = document.getElementById('sp-modal-print');
    if (!el || !selectedCategory || !selectedDepartment) return;

    const TH = 'border:1px solid #e2e8f0;padding:8px 12px;text-align:right;background:#ede9fe;font-weight:900;-webkit-print-color-adjust:exact;print-color-adjust:exact;';
    const TD = 'border:1px solid #e2e8f0;padding:7px 12px;text-align:right;';

    const buildTable = (label: string, subs: { name: string; periodsPerClass?: number }[]) => {
      if (!subs.length) return '';
      const tot = subs.reduce((s, x) => s + (x.periodsPerClass ?? 0), 0);
      const rows = subs.map((s, i) =>
        `<tr><td style="${TD}text-align:center;">${i + 1}</td><td style="${TD}">${s.name}</td><td style="${TD}text-align:center;font-weight:bold;">${s.periodsPerClass || '–'}</td></tr>`
      ).join('');
      return `<div style="margin-bottom:20px;page-break-inside:avoid;"><div style="background:#655ac1;color:white;padding:7px 13px;border-radius:6px;margin-bottom:5px;font-weight:900;font-family:'Tajawal',sans-serif;font-size:.85rem;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${label}</div><table style="border-collapse:collapse;width:100%;"><thead><tr><th style="${TH}width:32px;">#</th><th style="${TH}">المادة الدراسية</th><th style="${TH}width:90px;">الحصص</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="2" style="${TD}font-weight:900;">المجموع</td><td style="${TD}text-align:center;font-weight:900;color:#655ac1;">${tot}</td></tr></tfoot></table></div>`;
    };

    const TITLE = 'color:#3b355a;margin-bottom:10px;font-family:\'Tajawal\',sans-serif;font-size:1.1rem;font-weight:900;';
    const SECTION = 'color:#655ac1;margin:14px 0 4px;font-family:\'Tajawal\',sans-serif;font-size:.9rem;font-weight:900;';
    let content = `<div dir="rtl"><h2 style="${TITLE}">${selectedCategory.name} — ${selectedDepartment.name}</h2>`;

    if (mode === 'plan') {
      if (selectedSubDept) content += `<p style="${SECTION}">${selectedSubDept.name}</p>`;
      content += buildTable(activePlans.find(p => p.key === selectedPlanKey)?.label ?? '', previewSubjects);
    } else {
      if (selectedDepartment.subDepartments?.length) {
        selectedDepartment.subDepartments.forEach(sd => {
          content += `<h3 style="${SECTION}">${sd.name}</h3>`;
          sd.plans.forEach(plan => { content += buildTable(plan.label, DETAILED_TEMPLATES[plan.key] || []); });
        });
      } else {
        selectedDepartment.plans.forEach(plan => { content += buildTable(plan.label, DETAILED_TEMPLATES[plan.key] || []); });
      }
    }
    content += '</div>';

    el.innerHTML = content;
    el.style.display = 'block';
    setTimeout(() => {
      window.print();
      setTimeout(() => { el.style.display = 'none'; }, 500);
    }, 200);
  };

  if (!isOpen) return null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-7xl h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-100">

        {/* ── Header ── */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[#655ac1]">
              <Layers size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">الخطط الدراسية</h3>
              <p className="text-sm text-slate-500 font-medium">معاينة واعتماد الخطط الدراسية</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all no-print">
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* ── School Selector (if shared) ── */}
          {(schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0) && (
            <div className="w-56 border-l border-slate-100 bg-white p-4 overflow-y-auto shrink-0">
              <h4 className="text-xs font-black text-slate-400 mb-2 px-2">المدرسة الأساسية</h4>
              <button
                onClick={() => onSchoolChange('main')}
                className={`w-full flex flex-col items-start gap-1 px-4 py-3 rounded-2xl text-sm font-bold transition-all mb-4 ${activeSchoolId === 'main' ? 'bg-[#655ac1] text-white shadow-lg shadow-[#655ac1]/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <School size={16} className={activeSchoolId === 'main' ? 'text-white' : 'text-slate-400'} />
                  <span className="truncate">{schoolInfo.schoolName || 'المدرسة'}</span>
                </div>
              </button>
              <h4 className="text-xs font-black text-slate-400 mb-2 px-2">مدارس مشتركة</h4>
              <div className="space-y-2">
                {schoolInfo.sharedSchools.map(school => (
                  <button key={school.id} onClick={() => onSchoolChange(school.id)}
                    className={`w-full flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeSchoolId === school.id ? 'bg-[#655ac1] text-white shadow-lg shadow-[#655ac1]/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    <Building size={16} className={activeSchoolId === school.id ? 'text-white' : 'text-slate-400'} />
                    <span className="truncate">{school.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 1: Phase Sidebar ── */}
          <div className="w-56 border-l border-slate-100 bg-[#f8f7ff] p-4 overflow-y-auto shrink-0">
            <h4 className="text-xs font-black text-slate-400 mb-4 px-2">1. المرحلة الدراسية</h4>
            <div className="space-y-2">
              {availableCategories.map(cat => {
                const Icon = getPhaseIcon(cat.phase as Phase);
                const isSelected = selectedPhaseId === cat.id;
                return (
                  <button key={cat.id} onClick={() => { setSelectedPhaseId(cat.id); setSelectedDeptId(null); setSelectedSubId(null); setSelectedPlanKey(null); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isSelected ? 'bg-[#655ac1] text-white shadow-lg shadow-[#655ac1]/20' : 'bg-white text-slate-600 hover:bg-white hover:shadow-md'}`}
                  >
                    <Icon size={18} className={isSelected ? 'text-white' : 'text-slate-400'} />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Main Area ── */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* ════ VIEW A: Department Grid (no dept selected) ════ */}
            {!selectedPhaseId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <School size={64} className="text-slate-300 mb-4" />
                <p className="text-slate-400 font-bold">يرجى اختيار المرحلة أولاً</p>
              </div>
            ) : !selectedDepartment ? (
              <div className="flex-1 p-8 overflow-y-auto bg-white flex flex-col">
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 flex-1">
                  <div>
                    <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#e5e1fe] text-[#655ac1] flex items-center justify-center text-xs font-black">2</div>
                      تحديد القسم/المسار
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedCategory?.departments.map(dept => {
                        const planCount = dept.subDepartments
                          ? dept.subDepartments.reduce((s, sd) => s + sd.plans.length, 0)
                          : dept.plans.length;
                        return (
                          <button
                            key={dept.id}
                            onClick={() => setSelectedDeptId(dept.id)}
                            className="p-4 rounded-2xl border-2 text-right transition-all group relative overflow-hidden border-slate-100 hover:border-[#655ac1]/50 hover:shadow-md"
                          >
                            <h5 className="font-bold mb-1 text-slate-700 group-hover:text-[#655ac1] transition-colors">{dept.name}</h5>
                            <p className="text-xs text-slate-400 line-clamp-2">
                              {dept.subDepartments ? `${dept.subDepartments.length} صفوف · ${planCount} خطة` : `${planCount} خطة دراسية`}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

            ) : (
              /* ════ VIEW B: Plan Preview Inner Page ════ */
              <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">

                {/* ─ Title row: phase/dept + back btn (يسار) ─ */}
                <div className="px-5 pt-4 pb-3 border-b border-slate-100 bg-white shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[11px] text-slate-400 font-black">{selectedCategory?.name}</p>
                      <h4 className="font-black text-slate-800 text-base leading-tight">{selectedDepartment.name}</h4>
                    </div>
                    <button
                      onClick={() => { setSelectedDeptId(null); setSelectedSubId(null); setSelectedPlanKey(null); setSelectedSemester(null); setKgPeriods({}); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-[#655ac1] hover:border-[#655ac1]/40 font-bold text-sm transition-all shadow-sm"
                    >
                      <ChevronLeft size={15} />رجوع
                    </button>
                  </div>

                  {/* Action button bar */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => handlePrint('plan')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all"
                    >
                      <Printer size={13} /> طباعة
                    </button>
                    <button onClick={() => handlePrint('dept')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all"
                    >
                      <Printer size={13} /> طباعة الخطة كاملة
                    </button>
                    <button onClick={handleSave}
                      disabled={isHSMasarat && !selectedSemester}
                      className={`flex items-center gap-1.5 text-white px-5 py-1.5 rounded-xl font-bold text-xs shadow-lg transition-all hover:scale-105 active:scale-95 ${
                        isHSMasarat && !selectedSemester
                          ? 'bg-slate-300 shadow-none cursor-not-allowed'
                          : 'bg-[#7168c8] hover:bg-[#5e56b5] shadow-[#7168c8]/20'
                      }`}
                      title={isHSMasarat && !selectedSemester ? 'اختر الفصل الدراسي أولاً' : undefined}
                    >
                      <Check size={13} /> حفظ واعتماد الخطة
                    </button>
                  </div>
                </div>

                {/* HS Masarat: mandatory semester selector */}
                {isHSMasarat && (
                  <div className="px-5 py-3 bg-amber-50/80 border-b border-amber-100 shrink-0 flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-black text-amber-700 shrink-0">تحديد الفصل:</span>
                    <div className="flex gap-2">
                      {(['1', '2'] as const).map(sem => (
                        <button key={sem}
                          onClick={() => { setSelectedSemester(sem); }}
                          className={`px-4 py-1.5 text-xs font-black rounded-xl border-2 transition-all ${
                            selectedSemester === sem
                              ? 'bg-[#7168c8] text-white border-[#7168c8] shadow-md'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-[#7168c8]/50'
                          }`}
                        >
                          {sem === '1' ? 'الفصل الأول' : 'الفصل الثاني'}
                        </button>
                      ))}
                    </div>
                    {!selectedSemester && (
                      <span className="text-[11px] text-amber-600 font-bold">⚠ يجب تحديد الفصل قبل الحفظ</span>
                    )}
                  </div>
                )}

                {/* Grade tabs (subDepartments): show only when semester chosen or non-masarat */}
                {selectedDepartment.subDepartments && selectedDepartment.subDepartments.length > 0 && (!isHSMasarat || selectedSemester) && (
                  <div className="flex gap-1 px-5 pt-3 pb-0 shrink-0 overflow-x-auto border-b border-slate-100 bg-white">
                    {selectedDepartment.subDepartments.map(sd => (
                      <button key={sd.id} onClick={() => setSelectedSubId(sd.id)}
                        className={`px-4 py-2 text-sm font-bold rounded-t-xl border-b-2 whitespace-nowrap transition-all ${
                          selectedSubId === sd.id
                            ? 'border-[#7168c8] text-[#7168c8] bg-[#f5f3ff]'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {sd.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Plan tabs */}
                {displayedPlans.length > 0 && (!isHSMasarat || selectedSemester) && (
                  <div className="px-5 py-2.5 shrink-0 bg-white border-b border-slate-100">
                    <div className="flex gap-1.5 overflow-x-auto flex-wrap">
                      {displayedPlans.map(plan => (
                        <button key={plan.key} onClick={() => setSelectedPlanKey(plan.key)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border whitespace-nowrap transition-all ${
                            selectedPlanKey === plan.key
                              ? 'bg-[#7168c8] text-white border-[#7168c8] shadow-sm'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#7168c8]/40 hover:bg-[#f5f3ff]'
                          }`}
                        >
                          {isHSMasarat ? stripSemester(plan.label) : plan.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subjects area */}
                <div className="flex-1 overflow-y-auto p-4">
                  {isHSMasarat && !selectedSemester ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-16">
                      <GraduationCap size={52} className="text-slate-300 mb-3" />
                      <p className="text-slate-500 font-black">حدد الفصل الدراسي أولاً</p>
                      <p className="text-slate-400 text-xs mt-1">يجب اختيار الفصل لعرض المواد واعتماد الخطة</p>
                    </div>
                  ) : previewSubjects.length > 0 ? (
                    <div className="space-y-2.5">
                      {/* Summary bar */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-[#7168c8] text-white rounded-2xl shadow-md">
                        <span className="font-black text-xs">
                          {selectedDepartment.subDepartments
                            ? `${selectedSubDept?.name} · ${displayedPlans.find(p => p.key === selectedPlanKey)?.label ?? ''}`
                            : displayedPlans.find(p => p.key === selectedPlanKey)?.label ?? ''}
                        </span>
                        <div className="flex items-center gap-3 text-[11px] font-bold text-white/80">
                          <span>{previewSubjects.length} مادة</span>
                          <span className="w-px h-3.5 bg-white/30" />
                          <span>{kgTotal} حصة/أسبوع</span>
                        </div>
                      </div>

                      {/* Compact subject grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {previewSubjects.map((s) => (
                          <div key={s.id} className="py-2 px-3 bg-white border border-slate-100 rounded-xl shadow-sm flex justify-between items-center gap-2 group hover:border-[#7168c8]/30 transition-all">
                            <span className="font-bold text-slate-800 text-xs leading-tight line-clamp-2 flex-1">{s.name}</span>
                            {isKindergarten ? (
                              <input
                                type="number" min={0} max={30}
                                value={kgPeriods[s.id] ?? 0}
                                onChange={e => setKgPeriods(prev => ({ ...prev, [s.id]: parseInt(e.target.value) || 0 }))}
                                className="w-9 h-8 shrink-0 text-center text-sm font-black text-[#7168c8] border-2 border-[#c4b5fd] rounded-lg outline-none focus:border-[#7168c8] bg-[#f5f3ff]"
                              />
                            ) : (
                              <div className="w-8 h-8 shrink-0 bg-slate-50 rounded-lg flex flex-col items-center justify-center border border-slate-100 group-hover:bg-[#e5e1fe] group-hover:border-[#c4b5fd] transition-all">
                                <span className="text-sm font-black text-[#7168c8] leading-none">{s.periodsPerClass || '–'}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Total row */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-2 border-[#e5e1fe] rounded-xl">
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                          <Info size={13} /> إجمالي المواد: {previewSubjects.length}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg font-black text-[#7168c8]">{kgTotal}</span>
                          <span className="text-xs font-bold text-slate-400">حصة / أسبوع</span>
                        </div>
                      </div>

                      {isKindergarten && (
                        <p className="text-[11px] text-slate-400 text-center">دخّل عدد الحصص لكل مادة ثم اضغط حفظ واعتماد الخطة</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-16">
                      <Eye size={40} className="text-slate-300 mb-3" />
                      <p className="text-slate-400 font-bold text-sm">لا توجد بيانات لهذه الخطة</p>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Hidden Print Area (content injected imperatively by handlePrint) ── */}
      <div id="sp-modal-print" style={{ display: 'none' }} />
    </div>
  );
};

export default StudyPlansModal;
