import React, { useMemo, useState } from 'react';
import {
  Grid, User, Users, AlertTriangle, Sparkles, ArrowLeft,
  History, Search, FileText, Trash2, RotateCcw, ArrowRightLeft, X,
  GripVertical, Undo2, Check, ChevronDown
} from 'lucide-react';
import { SchoolInfo, ScheduleSettingsData, Teacher, Subject, ClassInfo, Admin, Assignment, Specialization, SwapStepDetail } from '../../../types';
import InlineScheduleView from '../../schedule/InlineScheduleView';
import ConfirmDialog from '../../ui/ConfirmDialog';
import { useToast } from '../../ui/ToastProvider';

interface Props {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  scheduleSettings: ScheduleSettingsData;
  setScheduleSettings: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  admins: Admin[];
  assignments: Assignment[];
  specializations: Specialization[];
  isScheduleLocked?: boolean;
  onNavigate: (tab: 'view' | 'edit' | 'create' | 'waiting') => void;
}

type SubTab = 'general' | 'teacher' | 'audit';
type SortMode = 'alpha' | 'specialization' | 'custom';

const DAY_NAMES_AR: Record<number, string> = {
  0: 'الأحد', 1: 'الإثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtDay = (iso: string) => DAY_NAMES_AR[new Date(iso).getDay()] ?? '';
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fmtStep = (s: string) => s.replace(/↔/g, ' مقابل ').replace(/→/g, ' إلى ');

const PURPLE = '#655ac1';

// خانة وقت "الأحد ح2" مع تمييز رقم الحصة بالبنفسجي
const AuditSlot: React.FC<{ day: string; period: number }> = ({ day, period }) => (
  <span className="whitespace-nowrap font-bold text-slate-700">
    {day} ح<span className="font-black" style={{ color: PURPLE }}>{period}</span>
  </span>
);

// خطوة منظَّمة في عمود التفاصيل (نفس لغة نافذة التبديل)
const AuditStep: React.FC<{ d: SwapStepDetail; num: number; total: number }> = ({ d, num, total }) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
    {total > 1 && (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black" style={{ background: '#f1f5f9', color: PURPLE }}>{num}</span>
    )}
    <span className="font-black text-slate-800">{d.teacher}</span>
    {d.subject && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600">{d.subject}</span>}
    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600">فصل {d.className}</span>
    <span className="inline-flex items-center gap-1">
      <AuditSlot day={d.fromDay} period={d.fromPeriod} />
      <ArrowLeft size={12} className="text-slate-400" />
      <AuditSlot day={d.toDay} period={d.toPeriod} />
    </span>
  </div>
);

// نسخة مطوّرة من تبويب التعديل (schedule_v3): بدون "مقارنة وتعديل" + سجل تعديل مُعاد تصميمه
const EditTabV3: React.FC<Props> = ({
  scheduleSettings, setScheduleSettings,
  teachers, subjects, classes, specializations, onNavigate
}) => {
  const [subTab, setSubTab] = useState<SubTab>('general');

  const [teacherSortMode, setTeacherSortMode] = useState<SortMode>('alpha');
  const [teacherCustomOrder, setTeacherCustomOrder] = useState<string[]>([]);
  const [specCustomOrder, setSpecCustomOrder] = useState<string[]>([]);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showSpecSortModal, setShowSpecSortModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<string[]>([]);
  const [pendingSpecOrder, setPendingSpecOrder] = useState<string[]>([]);

  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherSpecFilter, setTeacherSpecFilter] = useState('');
  const [teacherSpecDropdownOpen, setTeacherSpecDropdownOpen] = useState(false);

  const [auditFilter, setAuditFilter] = useState<'all' | 'general' | 'individual'>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ mode: 'all' } | { mode: 'one'; id: string } | null>(null);
  const [confirmUndoId, setConfirmUndoId] = useState<string | null>(null);
  const { showToast } = useToast();

  const hasSchedule = !!scheduleSettings.timetable && Object.keys(scheduleSettings.timetable).length > 0;
  const specNames = useMemo(
    () => Object.fromEntries(specializations.map(s => [s.id, s.name])),
    [specializations]
  );

  const settingsNoWaiting = useMemo(() => ({
    ...scheduleSettings,
    timetable: Object.fromEntries(
      Object.entries(scheduleSettings.timetable || {}).filter(([, v]: any) => v.type !== 'waiting')
    ),
  }), [scheduleSettings]);

  const logs = scheduleSettings.auditLogs || [];
  const generalCount = useMemo(() => logs.filter(l => (l.viewType ?? 'general') === 'general').length, [logs]);
  const individualCount = useMemo(() => logs.filter(l => l.viewType === 'individual').length, [logs]);
  const filteredLogs = useMemo(() => {
    let r = [...logs].reverse();
    if (auditFilter === 'general') r = r.filter(l => (l.viewType ?? 'general') === 'general');
    if (auditFilter === 'individual') r = r.filter(l => l.viewType === 'individual');
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      r = r.filter(l => (l.teacherName ?? '').toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
    }
    return r;
  }, [logs, auditFilter, auditSearch]);

  const availableSpecializations = useMemo(() => {
    const usedIds = new Set(teachers.map(t => t.specializationId).filter(Boolean));
    return specializations.filter(s => usedIds.has(s.id));
  }, [specializations, teachers]);

  const selectedTeacherSpecName = teacherSpecFilter
    ? availableSpecializations.find(spec => spec.id === teacherSpecFilter)?.name
    : '';

  const filteredDropdownTeachers = useMemo(() => {
    const term = teacherSearch.trim().toLowerCase();
    return teachers
      .filter(t => {
        const matchesSearch = !term
          || (t.name || '').toLowerCase().includes(term);
        const matchesSpec = !teacherSpecFilter || t.specializationId === teacherSpecFilter;
        return matchesSearch && matchesSpec;
      })
      .sort((a, b) => {
        const specCompare = (specNames[a.specializationId] || '').localeCompare(specNames[b.specializationId] || '', 'ar');
        return specCompare || (a.name || '').localeCompare(b.name || '', 'ar');
      });
  }, [teachers, teacherSearch, teacherSpecFilter, specNames]);

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeacherIds(prev =>
      prev.includes(teacherId)
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  if (!hasSchedule) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm p-12 text-center">
        <AlertTriangle className="mx-auto mb-5 text-slate-400" size={36} />
        <h3 className="text-xl font-black text-slate-800 mb-2">لا يوجد جدول للتعديل</h3>
        <p className="text-sm text-slate-500 font-medium mb-6">يجب إنشاء جدول الحصص أولاً قبل أن تتمكن من تعديله</p>
        <button
          onClick={() => onNavigate('create')}
          className="inline-flex items-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 transition-all"
        >
          <Sparkles size={16} /> انتقل لإنشاء الجدول <ArrowLeft size={14} />
        </button>
      </div>
    );
  }

  const renderSortModal = () => (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"><Users size={18} className="text-[#655ac1]" /></div>
            <div>
              <h3 className="font-black text-slate-800">ترتيب المعلمين</h3>
              <p className="text-xs text-slate-500">اسحب وغير ترتيب المعلمين كما تريد</p>
            </div>
          </div>
          <button onClick={() => setShowSortModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {pendingOrder.map((tid, idx) => {
            const t = teachers.find(teacher => teacher.id === tid);
            if (!t) return null;
            const sp = specializations.find(s => s.id === t.specializationId)?.name || '—';
            return (
              <div key={tid} draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', idx.toString())}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const src = parseInt(e.dataTransfer.getData('text/plain'));
                  if (isNaN(src) || src === idx) return;
                  const arr = [...pendingOrder];
                  const [m] = arr.splice(src, 1);
                  arr.splice(idx, 0, m);
                  setPendingOrder(arr);
                }}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-[#8779fb] hover:shadow-md transition-all cursor-move group"
              >
                <GripVertical size={20} className="text-slate-300 group-hover:text-[#655ac1]" />
                <span className="w-6 h-6 rounded-lg border border-slate-300 text-[#655ac1] text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{t.name}</p>
                  <p className="text-xs text-slate-400 truncate">{sp}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button onClick={() => setShowSortModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all">إلغاء</button>
          <button onClick={() => { setTeacherCustomOrder(pendingOrder); setTeacherSortMode('custom'); setShowSortModal(false); }} className="flex-1 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#655ac1]/20 transition-all">اعتماد الترتيب</button>
        </div>
      </div>
    </div>
  );

  const renderSpecSortModal = () => (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"><Users size={18} className="text-[#655ac1]" /></div>
            <div>
              <h3 className="font-black text-slate-800">ترتيب التخصصات</h3>
              <p className="text-xs text-slate-500">اسحب وغير ترتيب التخصصات كما تريد</p>
            </div>
          </div>
          <button onClick={() => setShowSpecSortModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {pendingSpecOrder.map((specId, idx) => {
            const sp = specializations.find(s => s.id === specId);
            if (!sp) return null;
            return (
              <div key={specId} draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', idx.toString())}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const src = parseInt(e.dataTransfer.getData('text/plain'));
                  if (isNaN(src) || src === idx) return;
                  const arr = [...pendingSpecOrder];
                  const [m] = arr.splice(src, 1);
                  arr.splice(idx, 0, m);
                  setPendingSpecOrder(arr);
                }}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-[#8779fb] hover:shadow-md transition-all cursor-move group"
              >
                <GripVertical size={20} className="text-slate-300 group-hover:text-[#655ac1]" />
                <span className="w-6 h-6 rounded-lg border border-slate-300 text-[#655ac1] text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                <p className="text-sm font-bold text-slate-800 truncate">{sp.name}</p>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button onClick={() => setShowSpecSortModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all">إلغاء</button>
          <button onClick={() => { setSpecCustomOrder(pendingSpecOrder); setTeacherSortMode('specialization'); setShowSpecSortModal(false); }} className="flex-1 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#655ac1]/20 transition-all">اعتماد الترتيب</button>
        </div>
      </div>
    </div>
  );

  const subTabs: Array<{ id: SubTab; label: string; icon: React.ComponentType<any> }> = [
    { id: 'general', label: 'الجدول العام للمعلمين', icon: Grid },
    { id: 'teacher', label: 'جدول معلم', icon: User },
    { id: 'audit', label: 'سجل التعديل', icon: History },
  ];
  const subTabButtonClass = (isActive: boolean) => `flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 border ${
    isActive
      ? 'bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20 border-[#655ac1]'
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200 bg-white'
  }`;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-[2rem] px-4 py-3 border border-slate-100 shadow-sm">
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
          {subTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={subTabButtonClass(subTab === t.id)}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'general' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-4">
            <InlineScheduleView
              type="general_teachers"
              settings={settingsNoWaiting}
              teachers={teachers}
              classes={classes}
              subjects={subjects}
              specializationNames={specNames}
              teacherSortMode={teacherSortMode}
              teacherCustomOrder={teacherCustomOrder}
              specializationCustomOrder={specCustomOrder}
              onUpdateSettings={setScheduleSettings}
              interactive
              showInlineGeneralHeader
              showWaitingManagement={false}
            />
          </div>
        </div>
      )}

      {subTab === 'teacher' && (
        <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-4 items-start">
          <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden xl:sticky xl:top-4">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Users size={20} className="text-[#655ac1] shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-800">اختيار المعلمين</h3>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">اختر معلمًا أو أكثر لعرض الجداول</p>
                </div>
              </div>
              <span className="text-[11px] font-black text-[#655ac1] border border-slate-200 bg-white px-2.5 py-1 rounded-full shrink-0">
                {selectedTeacherIds.length} محدد
              </span>
            </div>

            <div className="p-4 space-y-3 bg-slate-50/40">
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث باسم المعلم..."
                  value={teacherSearch}
                  onChange={e => setTeacherSearch(e.target.value)}
                  className="w-full pr-10 pl-9 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20 font-bold placeholder:text-slate-400"
                />
                {teacherSearch && (
                  <button
                    onClick={() => setTeacherSearch('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                    title="مسح البحث"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTeacherSpecDropdownOpen(open => !open)}
                  className={`w-full px-5 py-3.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 text-[13px] ${
                    teacherSpecDropdownOpen ? 'ring-2 ring-[#8779fb]/20 border-[#655ac1]/40' : ''
                  }`}
                >
                  <span className="truncate leading-tight">{selectedTeacherSpecName || 'كل التخصصات'}</span>
                  <ChevronDown size={16} className={`text-[#655ac1] transition-transform shrink-0 ${teacherSpecDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {teacherSpecDropdownOpen && (
                  <div className="absolute z-30 top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5">
                    <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                      {[{ id: '', name: 'كل التخصصات' }, ...availableSpecializations].map(opt => {
                        const active = opt.id === teacherSpecFilter;
                        return (
                          <button
                            key={opt.id || 'all'}
                            type="button"
                            onClick={() => {
                              setTeacherSpecFilter(opt.id);
                              setTeacherSpecDropdownOpen(false);
                            }}
                            className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center justify-between gap-3 ${
                              active ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                            }`}
                          >
                            <span className="whitespace-nowrap">{opt.name}</span>
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${
                              active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                            }`}>
                              <Check size={12} strokeWidth={3.5} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={filteredDropdownTeachers.length === 0}
                onClick={() => {
                  const visibleIds = filteredDropdownTeachers.map(t => t.id);
                  const visibleIdSet = new Set(visibleIds);
                  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedTeacherIds.includes(id));
                  setSelectedTeacherIds(prev =>
                    allVisibleSelected
                      ? prev.filter(id => !visibleIdSet.has(id))
                      : Array.from(new Set([...prev, ...visibleIds]))
                  );
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-500 text-xs font-black transition-all hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {filteredDropdownTeachers.length > 0 && filteredDropdownTeachers.every(t => selectedTeacherIds.includes(t.id)) ? 'إلغاء الكل' : 'اختيار الكل'}
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto custom-scrollbar p-2 space-y-1">
              {filteredDropdownTeachers.length === 0 ? (
                <div className="py-10 text-center text-xs font-bold text-slate-400">لا توجد نتائج مطابقة</div>
              ) : filteredDropdownTeachers.map(teacher => {
                const isSelected = selectedTeacherIds.includes(teacher.id);
                return (
                  <button
                    key={teacher.id}
                    type="button"
                    onClick={() => toggleTeacherSelection(teacher.id)}
                    className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-slate-300 bg-white shadow-sm'
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-black truncate ${isSelected ? 'text-[#655ac1]' : 'text-slate-800'}`}>{teacher.name}</span>
                      <span className={`block text-[11px] font-bold truncate mt-0.5 ${isSelected ? 'text-slate-400' : 'text-[#655ac1]'}`}>
                        {specNames[teacher.specializationId] || 'بدون تخصص'}
                      </span>
                    </span>
                    <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                    }`}>
                      <Check size={12} strokeWidth={3.5} />
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0">
            {selectedTeacherIds.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[420px] text-center text-slate-400 p-8">
                <User size={46} strokeWidth={1.6} className="mb-3 text-slate-300" />
                <p className="text-sm font-black text-slate-600">قم باختيار المعلم أولاً لعرض جدوله</p>
                <p className="text-xs font-bold text-slate-400 mt-1">ستظهر هنا جداول المعلمين المحددين من القائمة الجانبية.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {selectedTeacherIds.map((id, idx) => (
                  <div key={id}>
                    {idx > 0 && <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent mb-5" />}
                    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden p-4">
                      <InlineScheduleView
                        type="individual_teacher"
                        settings={settingsNoWaiting}
                        teachers={teachers}
                        classes={classes}
                        subjects={subjects}
                        targetId={id}
                        specializationNames={specNames}
                        onUpdateSettings={setScheduleSettings}
                        interactive
                        unifiedIndividual
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {subTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-slate-50 bg-white">
            {/* الفلاتر — أزرار مجزّأة بنفس نمط صفحة المعلمين */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 p-1 rounded-xl">
              {([
                { key: 'all', label: 'الكل', count: logs.length },
                { key: 'general', label: 'الجدول العام', count: generalCount },
                { key: 'individual', label: 'جدول معلم', count: individualCount },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setAuditFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center gap-1.5 ${
                    auditFilter === tab.key ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                    auditFilter === tab.key ? 'bg-primary/10 text-primary' : 'bg-slate-200/70 text-slate-500'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>
            {/* شريط البحث — بنفس نمط صفحة المعلمين */}
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                placeholder="بحث باسم المعلم أو التفاصيل..."
                className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-primary transition-all"
                dir="rtl"
              />
            </div>
            {/* حذف كل السجلات — بنمط أزرار صفحة المعلمين (إجراء حذف) */}
            <button
              onClick={() => setConfirmDelete({ mode: 'all' })}
              disabled={logs.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-100 transition-all font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={15} /> حذف كل السجلات
            </button>
          </div>

          <div className="overflow-auto max-h-[60vh]">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-4">
                <FileText size={48} strokeWidth={1.3} className="text-[#655ac1]" />
                <p className="font-bold">{logs.length === 0 ? 'لا توجد تعديلات يدوية مسجلة' : 'لا توجد نتائج تطابق بحثك'}</p>
              </div>
            ) : (
              <table className="w-full text-right text-sm min-w-[980px]" dir="rtl">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center w-14">م</th>
                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] w-24">اليوم</th>
                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] w-28">التاريخ</th>
                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] w-28">الوقت</th>
                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] w-40">المعلم</th>
                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center w-36">نوع التعديل</th>
                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center">تفاصيل التعديل</th>
                    <th className="px-6 py-4 font-black text-[#655ac1] text-[13px] text-center w-24">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLogs.map((log, idx) => {
                    const isChain = log.actionType === 'chain_swap';
                    const isGeneral = (log.viewType ?? 'general') === 'general';
                    const steps = log.description.split(' | ').filter(Boolean);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-all">
                        <td className="px-6 py-3.5 text-center">
                          <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center text-[11px] font-black border border-slate-300 bg-white text-[#655ac1]">
                            {filteredLogs.length - idx}
                          </span>
                        </td>
                        <td className="px-6 py-3.5"><span className="text-[12px] font-bold text-slate-700">{fmtDay(log.timestamp)}</span></td>
                        <td className="px-6 py-3.5"><span className="inline-flex items-center justify-center px-3 py-1 bg-slate-50 rounded-lg text-[12px] font-bold text-slate-700">{fmtDate(log.timestamp)}</span></td>
                        <td className="px-6 py-3.5 whitespace-nowrap"><span className="inline-flex px-3 py-1 bg-slate-50 rounded-lg text-[12px] font-bold text-slate-700">{fmtTime(log.timestamp)}</span></td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          {log.teacherName
                            ? <span className="font-bold text-[13px] text-slate-800 whitespace-nowrap">{log.teacherName}</span>
                            : <span className="text-xs text-slate-400 font-semibold">—</span>}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1 w-max" style={{ background: '#ffffff', color: '#655ac1', border: '1px solid #cbd5e1' }}>
                              {isChain ? <><RotateCcw size={11} /> متعدد</> : <><ArrowRightLeft size={11} /> بسيط</>}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: '#f1f0fb', color: '#7c6dd6' }}>
                              {isGeneral ? 'جدول عام' : 'جدول معلم'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          {log.swapDetails && log.swapDetails.length > 0 ? (
                            <div className="space-y-1.5">
                              {log.swapDetails.map((d, di) => (
                                <AuditStep key={di} d={d} num={di + 1} total={log.swapDetails!.length} />
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {steps.map((step, si) => (
                                <div key={si} className="flex items-start gap-2 text-xs text-slate-600">
                                  {steps.length > 1 && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 mt-0.5" style={{ background: '#f1f5f9', color: '#655ac1' }}>{si + 1}</span>}
                                  <span className="font-semibold leading-relaxed">{fmtStep(step)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {log.revert && Object.keys(log.revert).length > 0 && (
                              <button
                                onClick={() => setConfirmUndoId(log.id)}
                                title="تراجع عن هذا التعديل"
                                className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-300 bg-white text-[#655ac1] transition-colors hover:bg-[#f5f3ff] hover:border-[#c4b5fd]"
                              >
                                <Undo2 size={15} />
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDelete({ mode: 'one', id: log.id })}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-colors hover:bg-rose-50"
                              style={{ borderColor: '#fecaca', color: '#dc2626', background: '#fff' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">عرض {filteredLogs.length} من أصل {logs.length} سجل</span>
          </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center text-rose-500"><AlertTriangle size={22} /></div>
                <div>
                  <h3 className="font-black text-xl text-slate-800">تأكيد الحذف</h3>
                  <p className="text-sm font-bold text-slate-500 mt-0.5">{confirmDelete.mode === 'all' ? 'سيتم حذف كامل سجل التعديلات.' : 'سيتم حذف سجل التعديل المحدد.'}</p>
                </div>
              </div>
              <button onClick={() => setConfirmDelete(null)} className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all"><X size={18} /></button>
            </div>
            <div className="p-6 text-sm font-semibold leading-7 text-slate-600">
              {confirmDelete.mode === 'all' ? 'هذا الإجراء سيحذف جميع سجلات التعديل نهائيًا.' : 'هذا الإجراء سيحذف هذا السجل فقط.'}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-5 py-2.5 rounded-xl text-sm font-black text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">إلغاء</button>
              <button onClick={() => {
                if (confirmDelete.mode === 'all') {
                  setScheduleSettings(prev => ({ ...prev, auditLogs: [] }));
                } else {
                  setScheduleSettings(prev => ({ ...prev, auditLogs: (prev.auditLogs || []).filter(l => l.id !== confirmDelete.id) }));
                }
                setConfirmDelete(null);
              }} className="px-5 py-2.5 rounded-xl text-sm font-black text-white bg-rose-500 hover:bg-rose-600 transition-colors">تأكيد الحذف</button>
            </div>
          </div>
        </div>
      )}

      {showSortModal && renderSortModal()}
      {showSpecSortModal && renderSpecSortModal()}

      <ConfirmDialog
        isOpen={!!confirmUndoId}
        title="التراجع عن التعديل"
        message="سيُعاد الجدول إلى حالته قبل هذا التعديل، ويُزال هذا السطر من السجل. هل تريد المتابعة؟"
        confirmLabel="تراجع"
        cancelLabel="إلغاء"
        tone="warning"
        onCancel={() => setConfirmUndoId(null)}
        onConfirm={() => {
          const entry = logs.find(l => l.id === confirmUndoId);
          if (entry?.revert) {
            const patch = entry.revert;
            setScheduleSettings(prev => {
              const t = { ...(prev.timetable || {}) };
              Object.entries(patch).forEach(([k, v]) => {
                if (v === null || v === undefined) delete t[k];
                else (t as any)[k] = v;
              });
              return { ...prev, timetable: t, auditLogs: (prev.auditLogs || []).filter(l => l.id !== entry.id) };
            });
            showToast('تم التراجع عن التعديل', 'success');
          }
          setConfirmUndoId(null);
        }}
      />
    </div>
  );
};

export default EditTabV3;
