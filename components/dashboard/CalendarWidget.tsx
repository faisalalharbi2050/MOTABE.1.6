import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Plus, Calendar as CalendarIcon, X, Pencil, Trash2 } from 'lucide-react';
import { CalendarEvent } from '../../types';

// ── Task types & helpers ──────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (Gregorian)
  color: 'red' | 'yellow' | 'green' | 'purple';
}

const TASK_COLORS: Record<Task['color'], { bg: string; light: string; text: string; dot: string; label: string }> = {
  red:    { bg: 'bg-rose-500',    light: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'أحمر'    },
  yellow: { bg: 'bg-amber-400',   light: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'أصفر'   },
  green:  { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'أخضر'   },
  purple: { bg: 'bg-violet-500',  light: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500',  label: 'بنفسجي' },
};

const LS_TASKS    = 'motabe_calendar_tasks';
const LS_REMINDER = 'motabe_reminder_date';

const getTodayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const loadTasks = (): Task[] => {
  try { const r = localStorage.getItem(LS_TASKS); return r ? JSON.parse(r) : []; }
  catch { return []; }
};

const persistTasks = (t: Task[]) => localStorage.setItem(LS_TASKS, JSON.stringify(t));

// ── Hijri ↔ Gregorian conversion helpers ─────────────────────────────────────
// Anchor: 1 Muharram 1446 AH = 7 July 2024 Greg
const HIJRI_ANCHOR_MS = Date.UTC(2024, 6, 7);

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
  } catch {
    return { y: 1447, m: 9, d: 10 };
  }
};

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

// ── Component ─────────────────────────────────────────────────────────────────

interface CalendarWidgetProps {
  events: CalendarEvent[];
  onAddEvent: () => void;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ events }) => {
  const [currentDate, setCurrentDate]       = useState(new Date());
  const [calendarType, setCalendarType]     = useState<'gregorian' | 'hijri'>('gregorian');
  const [tasks, setTasks]                   = useState<Task[]>(loadTasks);

  // Modal: add / edit
  const [showModal,   setShowModal]   = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle,   setTaskTitle]   = useState('');
  const [taskDate,    setTaskDate]    = useState('');
  const [taskColor,   setTaskColor]   = useState<Task['color']>('green');

  // Hijri date picker fields (modal)
  const [hijriPickerY, setHijriPickerY] = useState(1447);
  const [hijriPickerM, setHijriPickerM] = useState(1);
  const [hijriPickerD, setHijriPickerD] = useState(1);

  // Gregorian date picker fields (modal — same style as Hijri)
  const [gregPickerY, setGregPickerY] = useState(new Date().getFullYear());
  const [gregPickerM, setGregPickerM] = useState(new Date().getMonth() + 1);
  const [gregPickerD, setGregPickerD] = useState(new Date().getDate());

  // Day detail panel
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  // Reminder on mount
  const [showReminder,  setShowReminder]  = useState(false);
  const [reminderTasks, setReminderTasks] = useState<Task[]>([]);

  useEffect(() => {
    const today = getTodayStr();
    const shown = localStorage.getItem(LS_REMINDER);
    if (shown === today) return;
    const todayTasks = loadTasks().filter(t => t.date === today);
    if (todayTasks.length > 0) {
      setReminderTasks(todayTasks);
      setShowReminder(true);
      localStorage.setItem(LS_REMINDER, today);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Calendar math ─────────────────────────────────────────────────────────

  const daysInMonth     = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const getDateStr = (day: number) =>
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const toHijri = (date: Date) =>
    new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric' }).format(date);

  const monthNames  = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const hijriMonths = ['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];

  const currentMonthLabel = calendarType === 'gregorian'
    ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { month: 'long', year: 'numeric' }).format(currentDate);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // ── Year ranges ───────────────────────────────────────────────────────────
  const thisYear      = new Date().getFullYear();
  const gregYears     = [thisYear - 1, thisYear, thisYear + 1];
  const thisHijriYear = Math.floor((thisYear - 622) * (365.25 / 354.37));
  const hijriYears    = [thisHijriYear - 1, thisHijriYear, thisHijriYear + 1];

  // ── Toolbar nav: derive Hijri page values from currentDate ────────────────────────
  const currentDateFirstStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
  const currentHijri  = gregToHijriParts(currentDateFirstStr);
  const displayMonth  = calendarType === 'gregorian' ? currentDate.getMonth() : (currentHijri.m - 1);
  const displayYear   = calendarType === 'gregorian' ? currentDate.getFullYear() : currentHijri.y;

  const handleMonthChange = (val: number) => {
    if (calendarType === 'gregorian') {
      setCurrentDate(new Date(currentDate.getFullYear(), val, 1));
    } else {
      setCurrentDate(new Date(hijriPartsToGreg(currentHijri.y, val + 1, 1) + 'T00:00:00'));
    }
  };

  const handleYearChange = (val: number) => {
    if (calendarType === 'gregorian') {
      setCurrentDate(new Date(val, currentDate.getMonth(), 1));
    } else {
      setCurrentDate(new Date(hijriPartsToGreg(val, currentHijri.m, 1) + 'T00:00:00'));
    }
  };

  // ── Task actions ──────────────────────────────────────────────────────────

  const syncPickersFromGreg = (gs: string) => {
    const gd = new Date(gs + 'T00:00:00');
    setGregPickerY(gd.getFullYear()); setGregPickerM(gd.getMonth() + 1); setGregPickerD(gd.getDate());
    const hp = gregToHijriParts(gs);
    setHijriPickerY(hp.y); setHijriPickerM(hp.m); setHijriPickerD(hp.d);
  };

  const openAdd = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskColor('green');
    const today = getTodayStr();
    setTaskDate(today);
    syncPickersFromGreg(today);
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDate(task.date);
    setTaskColor(task.color);
    syncPickersFromGreg(task.date);
    setShowModal(true);
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

  const closeModal = () => { setShowModal(false); setEditingTask(null); };

  const saveTask = () => {
    if (!taskTitle.trim()) return;
    const next: Task[] = editingTask
      ? tasks.map(t => t.id === editingTask.id ? { ...t, title: taskTitle.trim(), date: taskDate, color: taskColor } : t)
      : [...tasks, { id: Date.now().toString(), title: taskTitle.trim(), date: taskDate, color: taskColor }];
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
    if (selectedDay &&
        next.filter(t => t.date === selectedDay).length === 0 &&
        events.filter(e => e.date === selectedDay).length === 0) {
      setSelectedDay(null);
    }
  };

  // ── Render days ───────────────────────────────────────────────────────────

  const renderDays = () => {
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`e${i}`} className="h-9 md:h-11" />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date     = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
      const ds       = getDateStr(d);
      const dayTasks = tasks.filter(t => t.date === ds);
      const dayEvts  = events.filter(e => e.date === ds);
      const isToday  = new Date().toDateString() === date.toDateString();
      const isSel    = selectedDay === ds;

      cells.push(
        <div
          key={d}
          onClick={() => setSelectedDay(isSel ? null : ds)}
          className={`h-9 md:h-11 flex flex-col items-center justify-start pt-1 relative rounded-xl transition-all duration-200 cursor-pointer ${
            isSel
              ? 'ring-2 ring-[#8779fb] bg-[#8779fb]/10'
              : isToday
                ? 'ring-2 ring-[#655ac1] bg-[#655ac1]/5'
                : 'hover:bg-slate-50 text-slate-700'
          }`}
        >
          <span className={`text-xs md:text-sm font-bold ${isToday ? 'text-[#655ac1]' : ''} ${isSel ? 'text-[#8779fb]' : ''}`}>
            {calendarType === 'gregorian' ? d : toHijri(date)}
          </span>
          <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
            {dayTasks.map((t, idx) => (
              <div key={idx} className={`w-1.5 h-1.5 rounded-full ${TASK_COLORS[t.color].dot}`} />
            ))}
            {dayEvts.map((e, idx) => (
              <div key={`ev${idx}`} className={`w-1.5 h-1.5 rounded-full ring-1 ring-white ${
                e.type === 'meeting' ? 'bg-blue-400' :
                e.type === 'holiday' ? 'bg-rose-400' :
                e.type === 'exam'    ? 'bg-amber-400' : 'bg-slate-400'
              }`} />
            ))}
          </div>
        </div>
      );
    }
    return cells;
  };

  const selTasks      = selectedDay ? tasks.filter(t => t.date === selectedDay)  : [];
  const selEvents     = selectedDay ? events.filter(e => e.date === selectedDay) : [];
  const hasSelContent = selTasks.length > 0 || selEvents.length > 0;

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow relative">

      {/* ── Row 1: Title + month navigation ──────────────────────────────── */}
      <div className="px-5 pt-4 pb-0 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
          <CalendarIcon size={22} className="text-[#655ac1]" />
          التقويم
        </h3>
        <div className="flex items-center gap-0.5">
          <button
            onClick={prevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <span className="text-xs font-bold text-slate-700 min-w-[9rem] text-center">{currentMonthLabel}</span>
          <button
            onClick={nextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* ── Row 2: Toolbar ────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2.5 flex items-center gap-2 flex-wrap border-b border-slate-100">

        {/* Calendar-type toggle */}
        <div className="flex bg-slate-50 rounded-lg p-0.5 text-sm font-bold">
          <button
            onClick={() => setCalendarType('hijri')}
            className={`px-3 py-1.5 rounded-md transition-all ${calendarType === 'hijri' ? 'bg-white text-[#655ac1] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >هجري</button>
          <button
            onClick={() => setCalendarType('gregorian')}
            className={`px-3 py-1.5 rounded-md transition-all ${calendarType === 'gregorian' ? 'bg-white text-[#655ac1] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >ميلادي</button>
        </div>

        {/* Month select */}
        <select
          value={displayMonth}
          onChange={e => handleMonthChange(+e.target.value)}
          className="bg-slate-50 border-none outline-none text-sm font-bold text-slate-600 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors"
        >
          {(calendarType === 'gregorian' ? monthNames : hijriMonths).map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>

        {/* Year select */}
        <select
          value={displayYear}
          onChange={e => handleYearChange(+e.target.value)}
          className="bg-slate-50 border-none outline-none text-sm font-bold text-slate-600 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors"
        >
          {(calendarType === 'gregorian' ? gregYears : hijriYears).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <div className="flex-1" />

        {/* Add-task button */}
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#8779fb] text-white rounded-xl shadow-sm hover:bg-[#7566ea] transition-colors text-sm font-bold shadow-[#8779fb]/20"
        >
          <Plus size={15} strokeWidth={2.5} />
          إضافة مهمة
        </button>
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-2.5 pb-2 flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-7 text-center text-[9px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-wider">
          {['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'].map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 text-center flex-1 items-start gap-0.5">
          {renderDays()}
        </div>
      </div>

      {/* ── Selected-day popup modal ───────────────────────────────────────── */}
      {selectedDay && hasSelContent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#655ac1]/10 rounded-xl flex items-center justify-center">
                  <CalendarIcon size={16} className="text-[#655ac1]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {new Date(selectedDay + 'T00:00:00').toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  {calendarType === 'hijri' && (
                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(selectedDay + 'T00:00:00'))}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
              >
                <X size={15} />
              </button>
            </div>

            {/* Task / event list */}
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {selTasks.map(task => (
                <div key={task.id} className={`flex items-center justify-between px-3 py-3 rounded-xl ${TASK_COLORS[task.color].light}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${TASK_COLORS[task.color].dot}`} />
                    <span className={`text-sm font-bold truncate ${TASK_COLORS[task.color].text}`}>{task.title}</span>
                  </div>
                  <div className="flex gap-1 shrink-0 mr-1">
                    <button
                      onClick={() => { setSelectedDay(null); openEdit(task); }}
                      className="p-1.5 hover:bg-white/80 rounded-lg transition-colors"
                      title="تعديل"
                    >
                      <Pencil size={13} className="text-slate-500" />
                    </button>
                    <button
                      onClick={() => { setSelectedDay(null); setDeleteTarget(task); }}
                      className="p-1.5 hover:bg-white/80 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={13} className="text-rose-400" />
                    </button>
                  </div>
                </div>
              ))}
              {selEvents.map((e, idx) => (
                <div key={`ev${idx}`} className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-blue-50">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    e.type === 'meeting' ? 'bg-blue-400' :
                    e.type === 'holiday' ? 'bg-rose-400' :
                    e.type === 'exam'    ? 'bg-amber-400' : 'bg-slate-400'
                  }`} />
                  <span className="text-sm font-bold text-blue-700 truncate">{e.title}</span>
                </div>
              ))}
            </div>

            {/* Footer: add more tasks for this day */}
            <button
              onClick={() => { setSelectedDay(null); setTaskDate(selectedDay); setTaskTitle(''); setTaskColor('green'); setEditingTask(null); setShowModal(true); }}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-[#655ac1] bg-[#655ac1]/8 hover:bg-[#655ac1]/15 rounded-xl transition-colors"
            >
              <Plus size={13} /> إضافة مهمة لهذا اليوم
            </button>
          </div>
        </div>
      )}

      {/* ── Add / Edit task modal ──────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">
                {editingTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">

              {/* Title (required) */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">
                  عنوان المهمة <span className="text-rose-500">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveTask()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:border-[#655ac1] focus:bg-white focus:shadow-sm transition-all"
                  placeholder="مثال: اجتماع تخصصي، لجنة التميز، اختبار نافس..."
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">تاريخ المهمة</label>
                {calendarType === 'gregorian' ? (
                  <div className="flex gap-2">
                    <select
                      value={gregPickerD}
                      onChange={e => changeGregDate(gregPickerY, gregPickerM, +e.target.value)}
                      className="w-16 bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 text-sm font-bold text-slate-700 outline-none focus:border-[#8779fb] focus:ring-1 focus:ring-[#8779fb]/25 focus:bg-white transition-all cursor-pointer text-center"
                    >
                      {Array.from({ length: new Date(gregPickerY, gregPickerM, 0).getDate() }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <select
                      value={gregPickerM}
                      onChange={e => changeGregDate(gregPickerY, +e.target.value, gregPickerD)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 text-sm font-bold text-slate-700 outline-none focus:border-[#8779fb] focus:ring-1 focus:ring-[#8779fb]/25 focus:bg-white transition-all cursor-pointer"
                    >
                      {monthNames.map((name, i) => (
                        <option key={i} value={i + 1}>{name}</option>
                      ))}
                    </select>
                    <select
                      value={gregPickerY}
                      onChange={e => changeGregDate(+e.target.value, gregPickerM, gregPickerD)}
                      className="w-20 bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 text-sm font-bold text-slate-700 outline-none focus:border-[#8779fb] focus:ring-1 focus:ring-[#8779fb]/25 focus:bg-white transition-all cursor-pointer text-center"
                    >
                      {gregYears.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={hijriPickerD}
                      onChange={e => changeHijriDate(hijriPickerY, hijriPickerM, +e.target.value)}
                      className="w-16 bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 text-sm font-bold text-slate-700 outline-none focus:border-[#8779fb] focus:ring-1 focus:ring-[#8779fb]/25 focus:bg-white transition-all cursor-pointer text-center"
                    >
                      {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <select
                      value={hijriPickerM}
                      onChange={e => changeHijriDate(hijriPickerY, +e.target.value, hijriPickerD)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 text-sm font-bold text-slate-700 outline-none focus:border-[#8779fb] focus:ring-1 focus:ring-[#8779fb]/25 focus:bg-white transition-all cursor-pointer"
                    >
                      {hijriMonths.map((name, i) => (
                        <option key={i} value={i + 1}>{name}</option>
                      ))}
                    </select>
                    <select
                      value={hijriPickerY}
                      onChange={e => changeHijriDate(+e.target.value, hijriPickerM, hijriPickerD)}
                      className="w-20 bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 text-sm font-bold text-slate-700 outline-none focus:border-[#8779fb] focus:ring-1 focus:ring-[#8779fb]/25 focus:bg-white transition-all cursor-pointer text-center"
                    >
                      {hijriYears.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Color (optional) */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">
                  لون المهمة <span className="text-slate-400 font-medium">(اختياري)</span>
                </label>
                <div className="flex gap-3 items-center">
                  {(Object.keys(TASK_COLORS) as Task['color'][]).map(c => (
                    <button
                      key={c}
                      onClick={() => setTaskColor(c)}
                      title={TASK_COLORS[c].label}
                      className={`w-8 h-8 rounded-full ${TASK_COLORS[c].bg} transition-all duration-200 ${
                        taskColor === c
                          ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                          : 'opacity-50 hover:opacity-80 hover:scale-105'
                      }`}
                    />
                  ))}
                  <span className={`text-xs font-bold ${TASK_COLORS[taskColor].text} mr-1`}>
                    {TASK_COLORS[taskColor].label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >إلغاء</button>
              <button
                onClick={saveTask}
                disabled={!taskTitle.trim()}
                className="flex-1 py-2.5 bg-[#655ac1] text-white rounded-xl font-bold text-sm shadow-md shadow-[#655ac1]/20 hover:bg-[#5448b0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editingTask ? 'حفظ التعديلات' : 'حفظ المهمة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ────────────────────────────────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 text-center animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} className="text-rose-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1.5">تأكيد الحذف</h3>
            <p className="text-xs text-slate-500 mb-4">
              هل أنت متأكد من حذف مهمة<br />
              <span className="font-bold text-slate-700">"{deleteTarget.title}"</span>؟
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >إلغاء</button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors"
              >حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Daily task reminder toast ──────────────────────────────────────── */}
      {showReminder && reminderTasks.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-sm animate-fade-in">
          <div className="bg-gradient-to-l from-[#655ac1] to-[#8779fb] text-white rounded-2xl shadow-2xl shadow-[#655ac1]/30 p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <CalendarIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-extrabold text-white/80 mb-1">تذكير — مهام اليوم 📌</p>
              {reminderTasks.map(t => (
                <p key={t.id} className="text-sm font-bold truncate">• {t.title}</p>
              ))}
            </div>
            <button
              onClick={() => setShowReminder(false)}
              className="text-white/70 hover:text-white shrink-0 mt-0.5 p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CalendarWidget;
