import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Grid, User, Users, AlertTriangle, Sparkles, ArrowLeft,
  History, Search, FileText, Trash2, RotateCcw, ArrowRightLeft, LayoutGrid, X,
  GripVertical
} from 'lucide-react';
import { SchoolInfo, ScheduleSettingsData, Teacher, Subject, ClassInfo, Admin, Assignment, Specialization } from '../../../types';
import InlineScheduleView from '../../schedule/InlineScheduleView';
import CustomTeacherView from '../../schedule/CustomTeacherView';

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

type SubTab = 'general' | 'teacher' | 'compare' | 'audit';
type SortMode = 'alpha' | 'specialization' | 'custom';

const DAY_NAMES_AR: Record<number, string> = {
  0: 'الأحد', 1: 'الإثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtDay = (iso: string) => DAY_NAMES_AR[new Date(iso).getDay()] ?? '';
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fmtStep = (s: string) => s.replace(/↔/g, ' مقابل ').replace(/→/g, ' إلى ');

const EditTab: React.FC<Props> = ({
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
  const [compareSelectedTeacherIds, setCompareSelectedTeacherIds] = useState<string[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [showTeacherSelector, setShowTeacherSelector] = useState(false);
  const [teacherSelectorPos, setTeacherSelectorPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 360 });
  const teacherSelectorButtonRef = useRef<HTMLButtonElement>(null);
  const teacherSelectorPanelRef = useRef<HTMLDivElement>(null);

  const [auditFilter, setAuditFilter] = useState<'all' | 'general' | 'individual'>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ mode: 'all' } | { mode: 'one'; id: string } | null>(null);

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

  const filteredDropdownTeachers = useMemo(
    () => teachers.filter(t => t.name.toLowerCase().includes(teacherSearch.toLowerCase())),
    [teachers, teacherSearch]
  );

  useEffect(() => {
    if (!showTeacherSelector) return;

    const updatePosition = () => {
      if (!teacherSelectorButtonRef.current) return;
      const rect = teacherSelectorButtonRef.current.getBoundingClientRect();
      const margin = 16;
      const width = Math.min(420, Math.max(340, rect.width + 90));
      const safeWidth = Math.min(width, window.innerWidth - margin * 2);
      const centeredLeft = rect.left + rect.width / 2 - safeWidth / 2;
      setTeacherSelectorPos({
        top: rect.bottom + 12,
        left: Math.min(Math.max(margin, centeredLeft), window.innerWidth - safeWidth - margin),
        width: safeWidth,
      });
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inButton = teacherSelectorButtonRef.current?.contains(target);
      const inPanel = teacherSelectorPanelRef.current?.contains(target);
      if (!inButton && !inPanel) setShowTeacherSelector(false);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTeacherSelector]);

  if (!hasSchedule) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm p-12 text-center">
        <AlertTriangle className="mx-auto mb-5 text-[#655ac1]" size={36} />
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
    { id: 'compare', label: 'مقارنة وتعديل', icon: Users },
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
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <User size={20} className="text-[#655ac1] shrink-0" />
                <p className="text-xs font-black text-slate-500 shrink-0">اختر معلماً أو أكثر لعرض جدولهم</p>
                <button
                  ref={teacherSelectorButtonRef}
                  onClick={() => setShowTeacherSelector(current => !current)}
                  className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center gap-2"
                >
                  <Search size={16} className="text-[#655ac1]" />
                  اختيار المعلمين
                </button>
              </div>
            </div>

            {selectedTeacherIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                {teachers.filter(t => selectedTeacherIds.includes(t.id)).map(t => (
                  <div key={t.id} className="flex items-center gap-2 pl-2.5 pr-3.5 py-2 bg-white text-[#655ac1] rounded-xl border border-slate-300 shadow-sm">
                    <span className="text-sm font-bold">{t.name}</span>
                    <button
                      onClick={() => setSelectedTeacherIds(prev => prev.filter(id => id !== t.id))}
                      className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedTeacherIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 text-center text-slate-400">
              <User size={42} className="mb-3 text-[#655ac1]" />
              <p className="text-sm font-bold text-slate-500">قم باختيار المعلم أولاً لعرض جدوله</p>
            </div>
          ) : (
            <div className="space-y-6">
              {selectedTeacherIds.map((id, idx) => (
                <div key={id} style={{ zoom: 0.78 }}>
                  {idx > 0 && <div className="h-px bg-gradient-to-r from-transparent via-[#a59bf0] to-transparent opacity-40 mb-6" />}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-4">
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
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'compare' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-4">
            <CustomTeacherView
              teachers={teachers}
              subjects={subjects}
              classes={classes}
              settings={settingsNoWaiting}
              onUpdateSettings={setScheduleSettings}
              activeSchoolId="main"
              selectedTeacherIds={compareSelectedTeacherIds}
              setSelectedTeacherIds={setCompareSelectedTeacherIds}
              specializationNames={specNames}
            />
          </div>
        </div>
      )}

      {subTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 flex gap-4 border-b border-slate-100">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4">
              <LayoutGrid size={22} className="text-[#655ac1] shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">التعديل على الجدول العام للمعلمين</p>
                <p className="text-2xl font-black leading-none text-[#655ac1]">{generalCount}</p>
              </div>
            </div>
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4">
              <User size={22} className="text-[#655ac1] shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">التعديل على جدول معلم</p>
                <p className="text-2xl font-black leading-none text-[#655ac1]">{individualCount}</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4 min-w-[190px]">
              <History size={22} className="text-[#655ac1] shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">إجمالي التعديلات</p>
                <p className="text-2xl font-black leading-none text-[#655ac1]">{logs.length}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-3 flex items-center gap-3 border-b border-slate-100 bg-white flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {([
                { key: 'all', label: 'الكل', count: logs.length },
                { key: 'general', label: 'الجدول العام', count: generalCount },
                { key: 'individual', label: 'جدول معلم', count: individualCount },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setAuditFilter(tab.key)}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-black transition active:scale-95 flex items-center gap-1.5 ${
                    auditFilter === tab.key
                      ? 'border-[#8779fb] bg-[#8779fb] text-white shadow-sm'
                      : 'border-slate-300 bg-white text-[#655ac1] hover:bg-slate-50'
                  }`}
                >
                  {auditFilter === tab.key && <span className="font-black">✓</span>}
                  {tab.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-black ${
                    auditFilter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#655ac1]'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>
            <div className="flex-1 relative min-w-[180px]">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                placeholder="بحث باسم المعلم أو التفاصيل..."
                className="w-full pr-9 pl-4 py-2 text-sm border border-slate-200 rounded-xl outline-none bg-slate-50 text-slate-700 font-semibold placeholder:text-slate-400"
                dir="rtl"
              />
            </div>
            <button
              onClick={() => setConfirmDelete({ mode: 'all' })}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: '#fecaca', color: '#dc2626', background: '#fff' }}
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
                          <div className="space-y-1">
                            {steps.map((step, si) => (
                              <div key={si} className="flex items-start gap-2 text-xs text-slate-600">
                                {steps.length > 1 && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 mt-0.5" style={{ background: '#f1f5f9', color: '#655ac1' }}>{si + 1}</span>}
                                <span className="font-semibold leading-relaxed">{fmtStep(step)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => setConfirmDelete({ mode: 'one', id: log.id })}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-colors hover:bg-rose-50"
                            style={{ borderColor: '#fecaca', color: '#dc2626', background: '#fff' }}
                          >
                            <Trash2 size={15} />
                          </button>
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
      )}

      {showTeacherSelector && createPortal(
        <div
          ref={teacherSelectorPanelRef}
          className="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[120] animate-in slide-in-from-top-2"
          style={{ top: teacherSelectorPos.top, left: teacherSelectorPos.left, width: teacherSelectorPos.width }}
        >
          <div className="relative mb-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="ابحث عن معلم..."
              value={teacherSearch}
              onChange={e => setTeacherSearch(e.target.value)}
              className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#655ac1]/20 font-medium"
            />
          </div>
          <div className="flex items-center justify-between px-2 py-2 mb-2 border border-slate-100 bg-slate-50 rounded-xl">
            <button onClick={() => setSelectedTeacherIds(teachers.map(t => t.id))} className="text-xs font-black text-[#655ac1] hover:underline">اختيار الكل</button>
            <button onClick={() => setSelectedTeacherIds([])} className="text-xs font-black text-slate-400 hover:text-rose-500 hover:underline">إلغاء الكل</button>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {filteredDropdownTeachers.map(t => {
              const isSelected = selectedTeacherIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTeacherIds(prev =>
                      isSelected ? prev.filter(id => id !== t.id) : [...prev, t.id]
                    );
                  }}
                  className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-white text-[#655ac1] border-[#655ac1] shadow-sm'
                      : 'text-slate-700 border-transparent hover:bg-[#f0edff] hover:text-[#655ac1] hover:border-[#d9d3ff]'
                  }`}
                >
                  {t.name}
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border transition-all ${
                    isSelected
                      ? 'bg-[#655ac1] border-[#655ac1] text-white'
                      : 'border-slate-300 text-transparent'
                  }`}>
                    <span className="text-[11px] font-black">✓</span>
                  </span>
                </button>
              );
            })}
            {filteredDropdownTeachers.length === 0 && (
              <p className="text-center text-xs text-slate-400 font-medium py-3">لا يوجد معلمون مطابقون</p>
            )}
          </div>
        </div>,
        document.body
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-rose-50 text-rose-500"><AlertTriangle size={22} /></div>
                <div>
                  <h3 className="font-black text-xl text-slate-800">تأكيد الحذف</h3>
                  <p className="text-sm font-bold text-slate-500 mt-0.5">{confirmDelete.mode === 'all' ? 'سيتم حذف كامل سجل التعديلات.' : 'سيتم حذف سجل التعديل المحدد.'}</p>
                </div>
              </div>
              <button onClick={() => setConfirmDelete(null)} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"><X size={18} /></button>
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
    </div>
  );
};

export default EditTab;
