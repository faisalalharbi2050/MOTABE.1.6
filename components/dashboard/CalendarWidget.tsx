import React, { useState, useEffect } from 'react';
import { Plus, X, Pen, Trash2, Bell, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { CalendarEvent, SchoolInfo } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  date: string;      // YYYY-MM-DD (Gregorian — stored always)
  color: 'red' | 'yellow' | 'green' | 'purple';
  dateType?: 'hijri' | 'gregorian'; // calendar type chosen at creation
}

const TASK_COLORS: Record<
  Task['color'],
  { bg: string; light: string; text: string; dot: string; border: string; label: string }
> = {
  red:    { bg: 'bg-rose-500',    light: 'bg-rose-50',    text: 'text-rose-600',    dot: 'bg-rose-500',    border: 'border-rose-200',    label: 'أحمر'    },
  yellow: { bg: 'bg-amber-400',   light: 'bg-amber-50',   text: 'text-amber-600',   dot: 'bg-amber-400',   border: 'border-amber-200',   label: 'أصفر'   },
  green:  { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', border: 'border-emerald-200', label: 'أخضر'   },
  purple: { bg: 'bg-violet-500',  light: 'bg-violet-50',  text: 'text-violet-600',  dot: 'bg-violet-500',  border: 'border-violet-200',  label: 'بنفسجي' },
};

// ── Storage ───────────────────────────────────────────────────────────────────

const LS_TASKS    = 'motabe_calendar_tasks';
const LS_REMINDER = 'motabe_reminder_date';
const EMPTY_REMINDER = '';

const getTodayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const loadTasks = (): Task[] => {
  try { const r = localStorage.getItem(LS_TASKS); return r ? JSON.parse(r) : []; }
  catch { return []; }
};

const persistTasks = (t: Task[]) => localStorage.setItem(LS_TASKS, JSON.stringify(t));

// ── Hijri helpers (used in modal date picker) ─────────────────────────────────

const gregToHijriParts = (gregStr: string): { y: number; m: number; d: number } => {
  try {
    const date  = new Date(gregStr + 'T12:00:00');
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic', {
      year: 'numeric', month: 'numeric', day: 'numeric',
    }).formatToParts(date);
    return {
      y: +parts.find(p => p.type === 'year')!.value,
      m: +parts.find(p => p.type === 'month')!.value,
      d: +parts.find(p => p.type === 'day')!.value,
    };
  } catch { return { y: 1447, m: 9, d: 10 }; }
};

const HIJRI_ANCHOR_MS = Date.UTC(2024, 6, 7);

const hijriPartsToGreg = (hy: number, hm: number, hd: number): string => {
  const hijriOffset = (hy - 1446) * 354.367 + (hm - 1) * 29.53 + (hd - 1);
  const approx = new Date(HIJRI_ANCHOR_MS + hijriOffset * 86_400_000);
  for (let off = -3; off <= 3; off++) {
    const c     = new Date(approx.getTime() + off * 86_400_000);
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic', {
      year: 'numeric', month: 'numeric', day: 'numeric',
    }).formatToParts(c);
    const cy = +parts.find(p => p.type === 'year')!.value;
    const cm = +parts.find(p => p.type === 'month')!.value;
    const cd = +parts.find(p => p.type === 'day')!.value;
    if (cy === hy && cm === hm && cd === hd)
      return `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`;
  }
  return approx.toISOString().split('T')[0];
};

// ── Date display helper (single line) ────────────────────────────────────────

const getTaskDateDisplay = (
  dateStr: string,
  dateType: 'hijri' | 'gregorian' = 'hijri',
): string => {
  const today  = getTodayStr();
  const taskD  = new Date(dateStr + 'T12:00:00');
  const todayD = new Date(today   + 'T12:00:00');
  const diff   = Math.round((taskD.getTime() - todayD.getTime()) / 86_400_000);

  let label: string;
  if (diff === 0)                  label = 'اليوم';
  else if (diff === 1)             label = 'الغد';
  else if (diff > 1 && diff <= 6) label = taskD.toLocaleDateString('ar-SA', { weekday: 'long' });
  else                             label = taskD.toLocaleDateString('ar-SA', { weekday: 'short' });

  const datePart =
    dateType === 'gregorian'
      ? taskD.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })
      : new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long' }).format(taskD);

  return `${label} · ${datePart}`;
};

// ── Month name lists ──────────────────────────────────────────────────────────

const monthNames  = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const hijriMonths = ['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];

// ── Props ─────────────────────────────────────────────────────────────────────

interface CalendarWidgetProps {
  events: CalendarEvent[];
  onAddEvent: () => void;
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
}

// ── Component ─────────────────────────────────────────────────────────────────

const CalendarWidget: React.FC<CalendarWidgetProps> = () => {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);

  // Add / edit modal
  const [showModal,     setShowModal]     = useState(false);
  const [editingTask,   setEditingTask]   = useState<Task | null>(null);
  const [taskTitles,    setTaskTitles]    = useState<string[]>([EMPTY_REMINDER]);
  const [taskDate,      setTaskDate]      = useState('');
  const [taskColor,     setTaskColor]     = useState<Task['color']>('green');
  const [modalDateType, setModalDateType] = useState<'hijri' | 'gregorian'>('hijri');

  // Hijri date picker fields
  const [hijriPickerY, setHijriPickerY] = useState(1447);
  const [hijriPickerM, setHijriPickerM] = useState(1);
  const [hijriPickerD, setHijriPickerD] = useState(1);

  // Gregorian date picker fields
  const [gregPickerY, setGregPickerY] = useState(new Date().getFullYear());
  const [gregPickerM, setGregPickerM] = useState(new Date().getMonth() + 1);
  const [gregPickerD, setGregPickerD] = useState(new Date().getDate());

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  // Reminder toast
  const [showReminder,  setShowReminder]  = useState(false);
  const [reminderTasks, setReminderTasks] = useState<Task[]>([]);

  // Past tasks toggle
  const [showPast, setShowPast] = useState(false);

  // ── Reminder on mount ───────────────────────────────────────────────────────

  useEffect(() => {
    const today = getTodayStr();
    if (localStorage.getItem(LS_REMINDER) === today) return;
    const todayTasks = loadTasks().filter(t => t.date === today);
    if (todayTasks.length > 0) {
      setReminderTasks(todayTasks);
      setShowReminder(true);
      localStorage.setItem(LS_REMINDER, today);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Task grouping ───────────────────────────────────────────────────────────

  const today        = getTodayStr();
  const todayTasks   = tasks.filter(t => t.date === today);
  const upcomingTasks= tasks.filter(t => t.date > today).sort((a, b) => a.date.localeCompare(b.date));
  const pastTasks    = tasks.filter(t => t.date < today).sort((a, b) => b.date.localeCompare(a.date));

  // ── Year ranges ─────────────────────────────────────────────────────────────

  const thisYear      = new Date().getFullYear();
  const gregYears     = [thisYear - 1, thisYear, thisYear + 1];
  const thisHijriYear = Math.floor((thisYear - 622) * (365.25 / 354.37));
  const hijriYears    = [thisHijriYear - 1, thisHijriYear, thisHijriYear + 1];

  // ── Modal helpers ───────────────────────────────────────────────────────────

  const syncPickersFromGreg = (gs: string) => {
    const gd = new Date(gs + 'T00:00:00');
    setGregPickerY(gd.getFullYear()); setGregPickerM(gd.getMonth() + 1); setGregPickerD(gd.getDate());
    const hp = gregToHijriParts(gs);
    setHijriPickerY(hp.y); setHijriPickerM(hp.m); setHijriPickerD(hp.d);
  };

  const openAdd = () => {
    setEditingTask(null);
    setTaskTitles([EMPTY_REMINDER]);
    setTaskColor('green');
    const t = getTodayStr();
    setTaskDate(t);
    syncPickersFromGreg(t);
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setTaskTitles([task.title]);
    setTaskDate(task.date);
    setTaskColor(task.color);
    syncPickersFromGreg(task.date);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setTaskTitles([EMPTY_REMINDER]);
  };

  const changeGregDate = (y: number, m: number, d: number) => {
    const maxD = new Date(y, m, 0).getDate();
    const safeD = Math.min(d, maxD);
    setGregPickerY(y); setGregPickerM(m); setGregPickerD(safeD);
    setTaskDate(`${y}-${String(m).padStart(2, '0')}-${String(safeD).padStart(2, '0')}`);
  };

  const changeHijriDate = (y: number, m: number, d: number) => {
    setHijriPickerY(y); setHijriPickerM(m); setHijriPickerD(d);
    setTaskDate(hijriPartsToGreg(y, m, d));
  };

  const updateTaskTitle = (index: number, value: string) => {
    setTaskTitles(prev => prev.map((title, i) => (i === index ? value : title)));
  };

  const addTaskTitleField = () => {
    setTaskTitles(prev => [...prev, EMPTY_REMINDER]);
  };

  const removeTaskTitleField = (index: number) => {
    setTaskTitles(prev => (
      prev.length === 1
        ? [EMPTY_REMINDER]
        : prev.filter((_, i) => i !== index)
    ));
  };

  const hasValidTaskTitle = taskTitles.some(title => title.trim());

  const saveTask = () => {
    const trimmedTitles = taskTitles.map(title => title.trim()).filter(Boolean);
    if (trimmedTitles.length === 0) return;

    const next: Task[] = editingTask
      ? tasks.map(t => t.id === editingTask.id
          ? { ...t, title: trimmedTitles[0], date: taskDate, color: taskColor, dateType: modalDateType }
          : t)
      : [
          ...tasks,
          ...trimmedTitles.map((title, index) => ({
            id: `${Date.now()}-${index}`,
            title,
            date: taskDate,
            color: taskColor,
            dateType: modalDateType
          }))
        ];
    setTasks(next);
    persistTasks(next);
    closeModal();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const next = tasks.filter(t => t.id !== deleteTarget.id);
    setTasks(next);
    persistTasks(next);
    setDeleteTarget(null);
  };

  // ── Sub-components ──────────────────────────────────────────────────────────

  const SectionHeader = ({ label, count, accent = false }: { label: string; count: number; accent?: boolean }) => (
    <div className="flex items-center gap-3 mb-2">
      <span className={`text-[11px] font-extrabold uppercase tracking-widest ${accent ? 'text-[#655ac1]' : 'text-slate-400'}`}>
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
        accent ? 'bg-[#655ac1]/10 text-[#655ac1]' : 'bg-slate-100 text-slate-400'
      }`}>
        {count}
      </span>
    </div>
  );

  const TaskItem = ({ task, faded = false }: { task: Task; faded?: boolean }) => {
    const dateLabel = getTaskDateDisplay(task.date, task.dateType ?? 'hijri');
    return (
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-200 ${
        faded
          ? 'bg-white border-slate-100 opacity-50'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}>
        {/* Color dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${TASK_COLORS[task.color].dot}`} />

        {/* Title + date grouped together */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <span className={`text-sm font-bold truncate ${
            faded ? 'line-through text-slate-400' : TASK_COLORS[task.color].text
          }`}>
            {task.title}
          </span>
          <span className="text-slate-200 font-light shrink-0">|</span>
          <span className="text-[11px] font-medium text-slate-500 shrink-0 whitespace-nowrap">
            {dateLabel}
          </span>
        </div>

        {/* Actions — always visible */}
        <div className="flex gap-1 shrink-0">
          {!faded && (
            <button
              onClick={() => openEdit(task)}
              className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
              title="تعديل"
            >
              <Pen size={13} className="text-slate-400 hover:text-slate-600" />
            </button>
          )}
          <button
            onClick={() => setDeleteTarget(task)}
            className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
            title="حذف"
          >
            <Trash2 size={13} className="text-rose-500" />
          </button>
        </div>
      </div>
    );
  };

  const hasAnyTask = tasks.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden h-full max-h-[450px] flex flex-col hover:shadow-md transition-shadow relative">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-6 bg-[#8779fb] rounded-full"></div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base leading-tight">المهام التذكيرية</h3>
            {hasAnyTask && (
              <p className="text-[10px] text-slate-400 font-medium leading-tight">
                {tasks.length} {tasks.length === 1 ? 'مهمة' : 'مهام'}
                {todayTasks.length > 0 && ` · ${todayTasks.length} اليوم`}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-[#655ac1] border border-slate-200 rounded-2xl hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] active:scale-95 transition-all text-sm font-bold"
        >
          <Plus size={15} strokeWidth={2.5} />
          إضافة تذكير
        </button>
      </div>

      {/* ── Task list ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 flex flex-col gap-5 task-scrollbar">

        {!hasAnyTask ? (

          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center select-none">
            <div className="flex items-center justify-center mb-4">
              <ClipboardList size={28} className="text-[#655ac1]" />
            </div>
            <p className="text-sm font-bold text-slate-400">لا توجد مهام تذكيرية بعد</p>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              انقر على إضافة تذكير لتسجيل أول تذكير
            </p>
          </div>

        ) : (
          <>
            {/* Today */}
            {todayTasks.length > 0 && (
              <section>
                <SectionHeader label="اليوم" count={todayTasks.length} accent />
                <div className="flex flex-col gap-2">
                  {todayTasks.map(task => <TaskItem key={task.id} task={task} />)}
                </div>
              </section>
            )}

            {/* Upcoming */}
            {upcomingTasks.length > 0 && (
              <section>
                <SectionHeader label="القادمة" count={upcomingTasks.length} />
                <div className="flex flex-col gap-2">
                  {upcomingTasks.map(task => <TaskItem key={task.id} task={task} />)}
                </div>
              </section>
            )}

            {/* Past — collapsed by default */}
            {pastTasks.length > 0 && (
              <section>
                <button
                  onClick={() => setShowPast(p => !p)}
                  className="flex items-center gap-3 w-full mb-2 group"
                >
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-300 group-hover:text-slate-400 transition-colors">
                    المنتهية
                  </span>
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                    {pastTasks.length}
                  </span>
                  {showPast
                    ? <ChevronUp  size={13} className="text-slate-300 shrink-0" />
                    : <ChevronDown size={13} className="text-slate-300 shrink-0" />
                  }
                </button>
                {showPast && (
                  <div className="flex flex-col gap-2">
                    {pastTasks.map(task => <TaskItem key={task.id} task={task} faded />)}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {/* ── Add / Edit modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <ClipboardList size={22} className="text-[#655ac1]" strokeWidth={1.8} />
                <h3 className="text-base font-extrabold text-slate-800">
                  {editingTask ? 'تعديل التذكير' : 'إضافة تذكير'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">

              {/* Reminder text */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">
                  التذكير <span className="text-rose-400">*</span>
                </label>
                <div className="space-y-2.5">
                  {taskTitles.map((title, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        autoFocus={index === 0}
                        type="text"
                        value={title}
                        onChange={e => updateTaskTitle(index, e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveTask()}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-bold text-slate-800 outline-none focus:border-[#655ac1] focus:bg-white focus:shadow-sm transition-all placeholder:font-normal placeholder:text-slate-300"
                        placeholder="مثال: اجتماع تخصصي، لجنة التميز، اختبار نافس..."
                      />
                      {!editingTask && taskTitles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTaskTitleField(index)}
                          className="shrink-0 p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-colors"
                          title="حذف التذكير"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {!editingTask && (
                    <button
                      type="button"
                      onClick={addTaskTitleField}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#655ac1] hover:text-[#5448b0] transition-colors"
                    >
                      <Plus size={14} strokeWidth={2.4} />
                      إضافة تذكير آخر
                    </button>
                  )}
                </div>
              </div>

              {/* Date type toggle */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">تاريخ التذكير</label>
                <div className="flex bg-slate-50 rounded-2xl p-0.5 text-xs font-bold border border-slate-200 mb-2.5 w-fit">
                  <button
                    onClick={() => setModalDateType('hijri')}
                    className={`px-3 py-1.5 rounded-xl border transition-all ${modalDateType === 'hijri' ? 'bg-white text-[#655ac1] shadow-sm border-slate-200' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}
                  >هجري</button>
                  <button
                    onClick={() => setModalDateType('gregorian')}
                    className={`px-3 py-1.5 rounded-xl border transition-all ${modalDateType === 'gregorian' ? 'bg-white text-[#655ac1] shadow-sm border-slate-200' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}
                  >ميلادي</button>
                </div>

                {/* Weekday badge — inline in same row as selectors */}
                {(() => {
                  const weekday = taskDate
                    ? new Date(taskDate + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'long' })
                    : '';
                  const WeekdayBadge = () => (
                    <span className="shrink-0 text-xs font-extrabold text-[#655ac1] bg-[#655ac1]/8 px-2.5 py-2.5 rounded-2xl border border-[#655ac1]/15 whitespace-nowrap leading-none flex items-center">
                      {weekday}
                    </span>
                  );

                  return modalDateType === 'gregorian' ? (
                    /* Gregorian pickers */
                    <div className="flex gap-2 items-center">
                      <select
                        value={gregPickerD}
                        onChange={e => changeGregDate(gregPickerY, gregPickerM, +e.target.value)}
                        className="w-16 bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-2 text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1] focus:bg-white transition-all cursor-pointer text-center"
                      >
                        {Array.from({ length: new Date(gregPickerY, gregPickerM, 0).getDate() }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <WeekdayBadge />
                      <select
                        value={gregPickerM}
                        onChange={e => changeGregDate(gregPickerY, +e.target.value, gregPickerD)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-2 text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1] focus:bg-white transition-all cursor-pointer"
                      >
                        {monthNames.map((name, i) => (
                          <option key={i} value={i + 1}>{name}</option>
                        ))}
                      </select>
                      <select
                        value={gregPickerY}
                        onChange={e => changeGregDate(+e.target.value, gregPickerM, gregPickerD)}
                        className="w-20 bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-2 text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1] focus:bg-white transition-all cursor-pointer text-center"
                      >
                        {gregYears.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    /* Hijri pickers */
                    <div className="flex gap-2 items-center">
                      <select
                        value={hijriPickerD}
                        onChange={e => changeHijriDate(hijriPickerY, hijriPickerM, +e.target.value)}
                        className="w-16 bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-2 text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1] focus:bg-white transition-all cursor-pointer text-center"
                      >
                        {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <WeekdayBadge />
                      <select
                        value={hijriPickerM}
                        onChange={e => changeHijriDate(hijriPickerY, +e.target.value, hijriPickerD)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-2 text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1] focus:bg-white transition-all cursor-pointer"
                      >
                        {hijriMonths.map((name, i) => (
                          <option key={i} value={i + 1}>{name}</option>
                        ))}
                      </select>
                      <select
                        value={hijriPickerY}
                        onChange={e => changeHijriDate(+e.target.value, hijriPickerM, hijriPickerD)}
                        className="w-20 bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-2 text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1] focus:bg-white transition-all cursor-pointer text-center"
                      >
                        {hijriYears.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
              </div>

              {/* Color */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">
                  لون التذكير <span className="text-slate-300 font-normal">(اختياري)</span>
                </label>
                <div className="flex items-center gap-3">
                  {(Object.keys(TASK_COLORS) as Task['color'][]).map(c => (
                    <button
                      key={c}
                      onClick={() => setTaskColor(c)}
                      title={TASK_COLORS[c].label}
                      className={`w-5 h-5 rounded-full ${TASK_COLORS[c].bg} transition-all duration-200 ${
                        taskColor === c
                          ? 'ring-2 ring-offset-2 ring-slate-400 scale-110 shadow-md'
                          : 'opacity-40 hover:opacity-70 hover:scale-105'
                      }`}
                    />
                  ))}
                  <span className={`text-xs font-bold ${TASK_COLORS[taskColor].text} mr-1 transition-all`}>
                    {TASK_COLORS[taskColor].label}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors"
              >إلغاء</button>
              <button
                onClick={saveTask}
                disabled={!hasValidTaskTitle}
                className="flex-1 py-2.5 bg-[#655ac1] text-white rounded-2xl font-bold text-sm shadow-md shadow-[#655ac1]/20 hover:bg-[#5448b0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editingTask ? 'حفظ التعديلات' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-6 text-center animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} className="text-rose-500" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 mb-1.5">حذف المهمة</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              هل أنت متأكد من حذف<br />
              <span className="font-bold text-slate-700">"{deleteTarget.title}"</span>؟
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors"
              >إلغاء</button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-2xl transition-colors"
              >حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Daily reminder toast (top-center) ──────────────────────────────── */}
      {showReminder && reminderTasks.length > 0 && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-sm animate-fade-in">
          <div className="bg-gradient-to-l from-[#655ac1] to-[#8779fb] text-white rounded-2xl shadow-2xl shadow-[#655ac1]/40 p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
              <Bell size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-extrabold text-white/70 mb-1.5 uppercase tracking-wide">
                تذكير — مهام اليوم
              </p>
              <div className="flex flex-col gap-1">
                {reminderTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${TASK_COLORS[t.color].dot} opacity-80`} />
                    <p className="text-sm font-bold truncate">{t.title}</p>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowReminder(false)}
              className="text-white/60 hover:text-white shrink-0 p-1.5 hover:bg-white/15 rounded-xl transition-colors mt-0.5"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CalendarWidget;
