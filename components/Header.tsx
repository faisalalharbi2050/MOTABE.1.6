
import React, { useState, useEffect, useRef } from 'react';
import {
  LogOut,
  Menu,
  X,
  Bell,
  Clock,
  Calendar,
  User,
  Trash2,
  Edit3,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  Check,
  Info,
  Shield,
  ShieldCheck,
  Send,
  UserPlus,
  CreditCard,
  Sparkles,
  LogIn,
  CheckCheck,
  Settings2,
  ChevronDown,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { SchoolInfo } from '../types';

// ─── localStorage keys ───────────────────────────────────────────────
const LS_PROFILE       = 'motabe_profile';
const LS_EMAIL_CHANGES = 'motabe_email_changes'; // ISO timestamps of email changes
const LS_PHONE_CHANGED = 'motabe_phone_changed';

// Business rule: email can change twice within a rolling 12 months,
// the 3rd change requires support approval.
const EMAIL_CHANGES_PER_YEAR = 2;

type AuthMethod = 'manual' | 'google' | 'apple';

const DEFAULT_PROFILE = {
  name:  'فيصل الحربي',
  phone: '0504777058',
  email: 'faisal_alsobhi2050@gmail.com',
  authMethod: 'manual' as AuthMethod,
  createdAt: '2025-09-01T08:00:00.000Z',
  lastLogin: new Date().toISOString(),
};

function loadProfile() {
  try {
    const raw = localStorage.getItem(LS_PROFILE);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };
  } catch { return { ...DEFAULT_PROFILE }; }
}

// Count email changes within the last rolling 12 months
function getEmailChangesThisYear(): number {
  try {
    const raw = localStorage.getItem(LS_EMAIL_CHANGES);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    return arr.filter(t => new Date(t).getTime() >= yearAgo).length;
  } catch { return 0; }
}
function recordEmailChange() {
  try {
    const raw = localStorage.getItem(LS_EMAIL_CHANGES);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    arr.push(new Date().toISOString());
    localStorage.setItem(LS_EMAIL_CHANGES, JSON.stringify(arr));
  } catch {}
}

const AUTH_LABELS: Record<AuthMethod, string> = {
  manual: 'تسجيل يدوي',
  google: 'حساب Google',
  apple:  'حساب Apple',
};

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  try {
    const parts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-nu-latn', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).formatToParts(new Date(iso));
    const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
    return `${getPart('day')} / ${getPart('month')} / ${getPart('year')}هـ`;
  } catch { return '—'; }
};

// ─── Confirm Modal helper ────────────────────────────────────────────
interface ModalProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel: () => void;
  confirmDanger?: boolean;
}
const ConfirmModal: React.FC<ModalProps> = ({
  title, message, icon, confirmLabel = 'تأكيد', cancelLabel = 'إلغاء',
  onConfirm, onCancel, confirmDanger = false
}) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onCancel}>
    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed mb-5">{message}</p>
      <div className="flex gap-2 justify-center">
        <button onClick={onCancel}
          className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
        >{cancelLabel}</button>
        {onConfirm && (
          <button onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-colors ${confirmDanger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-[#655ac1] hover:bg-[#5448b0]'}`}
          >{confirmLabel}</button>
        )}
      </div>
    </div>
  </div>
);

// ─── Success Toast ───────────────────────────────────────────────────
const Toast: React.FC<{ message: string; visible: boolean }> = ({ message, visible }) => (
  <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 bg-emerald-600 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-xl transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
    <CheckCircle size={16} /> {message}
  </div>
);

// ─── Change Password Modal ───────────────────────────────────────────
interface PasswordModalProps {
  authMethod: AuthMethod;
  onConfirm: () => void;
  onCancel: () => void;
}
const PasswordModal: React.FC<PasswordModalProps> = ({ authMethod, onConfirm, onCancel }) => {
  const isOAuth = authMethod !== 'manual';
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');

  const inputClass = "w-full text-sm font-bold text-slate-700 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#655ac1] transition-colors bg-white pl-10";
  const labelClass = "text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1";

  const submit = () => {
    if (next.length < 8) { setError('كلمة المرور يجب ألا تقل عن 8 أحرف'); return; }
    if (next !== confirm) { setError('كلمتا المرور غير متطابقتين'); return; }
    setError('');
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <KeyRound size={24} className="text-[#655ac1]" />
          <h3 className="text-base font-bold text-slate-800">
            {isOAuth ? 'تعيين كلمة مرور' : 'تغيير كلمة المرور'}
          </h3>
        </div>

        {isOAuth && (
          <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 mb-4 leading-relaxed">
            <Info size={13} className="text-[#655ac1] shrink-0 mt-0.5" />
            <span>أنت تسجّل الدخول عبر <b>{AUTH_LABELS[authMethod]}</b>. يمكنك تعيين كلمة مرور لتفعيل الدخول اليدوي أيضًا.</span>
          </div>
        )}

        <div className="space-y-3 mb-2">
          {!isOAuth && (
            <div>
              <label className={labelClass}><KeyRound size={11} /> كلمة المرور الحالية</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)} className={inputClass} dir="ltr" />
              </div>
            </div>
          )}
          <div>
            <label className={labelClass}><KeyRound size={11} /> كلمة المرور الجديدة</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={next} onChange={e => setNext(e.target.value)} className={inputClass} dir="ltr" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}><KeyRound size={11} /> تأكيد كلمة المرور</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} className={inputClass} dir="ltr" />
            </div>
          </div>
        </div>

        {error && <p className="text-[11px] font-bold text-rose-500 mb-3 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}

        <div className="flex gap-2 mt-4">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">
            إلغاء
          </button>
          <button onClick={submit}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#655ac1] hover:bg-[#5448b0] rounded-xl transition-colors">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1]">
              <Check size={13} strokeWidth={3.2} className="text-white" />
            </span>
            {isOAuth ? 'تعيين' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Account (with reasons) Modal ─────────────────────────────
const DELETE_REASONS = [
  'لم أعد بحاجة للمنصة',
  'انتقلت إلى منصة أخرى',
  'السعر مرتفع',
  'صعوبة في الاستخدام',
  'مشكلات تقنية',
  'انتهاء عملي بالمدرسة',
  'أخرى',
];

interface DeleteReasonsModalProps {
  isPrimaryAdmin: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}
const DeleteReasonsModal: React.FC<DeleteReasonsModalProps> = ({ isPrimaryAdmin, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const [other, setOther]   = useState('');

  const finalReason = reason === 'أخرى' ? (other.trim() || 'أخرى') : reason;
  const canSubmit = !!reason && (reason !== 'أخرى' || other.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <Trash2 size={24} className="text-rose-500" />
          <h3 className="text-base font-bold text-slate-800">طلب حذف الحساب</h3>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
          {isPrimaryAdmin
            ? 'سيتم حذف حساب المدرسة بالكامل وسيتم حذف كامل البيانات، هذا الإجراء لا يمكن التراجع عنه.'
            : 'سيتم حذف وصولك أنت فقط من المنصة. لن تتأثر بيانات المدرسة.'}
        </p>

        <p className="text-[11px] font-bold text-slate-500 mb-2">ما سبب رغبتك في الحذف؟</p>
        <div className="space-y-1.5 mb-3 max-h-56 overflow-y-auto">
          {DELETE_REASONS.map(r => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-right transition-colors hover:border-slate-300 ${
                reason === r ? 'text-rose-600' : 'text-slate-600'
              }`}
            >
              <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${reason === r ? 'border-rose-500' : 'border-slate-300'}`}>
                {reason === r && <span className="w-2 h-2 rounded-full bg-rose-500" />}
              </span>
              {r}
            </button>
          ))}
        </div>

        {reason === 'أخرى' && (
          <textarea
            value={other}
            onChange={e => setOther(e.target.value)}
            placeholder="اكتب السبب..."
            rows={2}
            className="w-full text-sm font-bold text-slate-700 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-rose-400 transition-colors bg-white mb-3 resize-none"
          />
        )}

        <div className="flex gap-2 mt-1">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">
            إلغاء
          </button>
          <button
            onClick={() => canSubmit && onConfirm(finalReason)}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            تأكيد وإرسال الطلب
          </button>
        </div>
      </div>
    </div>
  );
};

interface HeaderProps {
  schoolInfo: SchoolInfo;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  /** true = مستخدم أول (مدير النظام) | false = مستخدم فرعي مفوَّض */
  isPrimaryAdmin?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  schoolInfo,
  isSidebarOpen,
  setIsSidebarOpen,
  onNavigate,
  onLogout,
  isPrimaryAdmin = true,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // ── Notifications state ───────────────────────────────────────────
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [readNotifs, setReadNotifs] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('motabe_read_notifs') || '[]')); }
    catch { return new Set(); }
  });

  const NOTIFICATIONS = [
    { id: 1, icon: LogIn,      color: 'text-emerald-600 bg-emerald-50', title: 'تسجيل الدخول', desc: 'تم تسجيل دخولك بنجاح إلى المنصة', time: 'منذ دقيقتين' },
    { id: 2, icon: UserPlus,   color: 'text-blue-600 bg-blue-50',       title: 'معلم جديد',    desc: 'تمت إضافة معلم جديد إلى المنظومة', time: 'منذ ساعة' },
    { id: 3, icon: CreditCard, color: 'text-amber-600 bg-amber-50',     title: 'الاشتراك',     desc: 'اشتراكك ينتهي خلال 7 أيام، يرجى التجديد', time: 'منذ 3 ساعات' },
    { id: 4, icon: Settings2,  color: 'text-slate-600 bg-slate-100',    title: 'إعدادات المدرسة', desc: 'تم تحديث بيانات المدرسة بنجاح', time: 'أمس' },
    { id: 5, icon: Sparkles,   color: 'text-violet-600 bg-violet-50',   title: 'تحديث المنصة', desc: 'يتوفر تحديث جديد في منصة متابع — الإصدار 1.5', time: 'منذ يومين' },
  ];

  const unreadCount = NOTIFICATIONS.filter(n => !readNotifs.has(n.id)).length;

  const markAllRead = () => {
    const all = new Set(NOTIFICATIONS.map(n => n.id));
    setReadNotifs(all);
    localStorage.setItem('motabe_read_notifs', JSON.stringify([...all]));
  };

  // ── Profile state ──────────────────────────────────────────────────
  const [profile, setProfile]     = useState(loadProfile);
  const [editMode, setEditMode]   = useState(false);
  const [draftName, setDraftName]   = useState(profile.name);
  const [draftEmail, setDraftEmail] = useState(profile.email);

  const phoneChanged     = localStorage.getItem(LS_PHONE_CHANGED) === 'true';
  const emailChangesUsed = getEmailChangesThisYear();
  const emailLocked      = emailChangesUsed >= EMAIL_CHANGES_PER_YEAR;

  // ── Modal state ────────────────────────────────────────────────────
  type ModalKey =
    | 'emailWarn'
    | 'phoneChange'
    | 'passwordChange'
    | 'deleteReasons'
    | null;
  const [modal, setModal] = useState<ModalKey>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg = 'تم الحفظ بنجاح ✓') => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000 * 60); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(currentTime);

  const dayName = new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
  }).format(currentTime);

  const gregorianDate = new Intl.DateTimeFormat('ar-SA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(currentTime);

  const timeString = new Intl.DateTimeFormat('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(currentTime);

  const profileTimeString = new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(currentTime).replace('صباحًا', 'ص').replace('مساءً', 'م');

  const activeSemester = schoolInfo.semesters?.find(s => s.id === schoolInfo.currentSemesterId)
    ?? schoolInfo.semesters?.[0];

  const getCurrentWeek = () => {
    if (!activeSemester) return null;

    const start = new Date(activeSemester.startDate + 'T00:00:00');
    const semesterEnd = new Date(activeSemester.endDate + 'T00:00:00');
    const today = new Date(currentTime);
    today.setHours(0, 0, 0, 0);

    if (today < start) return 1;

    const effectiveEnd = today > semesterEnd ? semesterEnd : today;
    const workDaysStart = activeSemester.workDaysStart ?? 0;
    const workDaysEnd = activeSemester.workDaysEnd ?? 4;
    const holidays = new Set(activeSemester.holidays ?? []);
    const countedWeeks = new Set<string>();

    const toLocalDateKey = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const isWorkingDay = (day: number) => {
      if (workDaysStart <= workDaysEnd) {
        return day >= workDaysStart && day <= workDaysEnd;
      }
      return day >= workDaysStart || day <= workDaysEnd;
    };

    const getWeekStartKey = (date: Date) => {
      const weekStart = new Date(date);
      const offset = (weekStart.getDay() - workDaysStart + 7) % 7;
      weekStart.setDate(weekStart.getDate() - offset);
      return toLocalDateKey(weekStart);
    };

    for (const cursor = new Date(start); cursor <= effectiveEnd; cursor.setDate(cursor.getDate() + 1)) {
      const dateKey = toLocalDateKey(cursor);
      if (!isWorkingDay(cursor.getDay()) || holidays.has(dateKey)) continue;
      countedWeeks.add(getWeekStartKey(cursor));
    }

    return Math.max(1, Math.min(countedWeeks.size || 1, activeSemester.weeksCount));
  };

  const currentWeek = getCurrentWeek();
  const selectedDate = (schoolInfo.calendarType || 'hijri') === 'hijri' ? hijriDate : gregorianDate;

  // ── Edit helpers ────────────────────────────────────────────────────
  const openEditMode = () => {
    setDraftName(profile.name);
    setDraftEmail(profile.email);
    setEditMode(true);
  };

  const cancelEdit = () => setEditMode(false);

  // Username is freely editable (display name only).
  const handleNameChange = (val: string) => setDraftName(val);

  // Email — gated by yearly budget
  const handleEmailChange = (val: string) => {
    if (emailLocked && val !== profile.email) {
      setDraftEmail(profile.email);
      setModal('emailWarn');
    } else {
      setDraftEmail(val);
    }
  };

  // Phone — open change flow
  const handlePhoneEdit = () => {
    if (!editMode) return;
    setModal('phoneChange');
  };

  // Save changes
  const handleSave = () => {
    const newName  = draftName.trim()  || profile.name;
    const newEmail = draftEmail.trim() || profile.email;
    const emailDidChange = newEmail !== profile.email;

    if (emailDidChange) recordEmailChange();

    const updated = { ...profile, name: newName, email: newEmail };
    localStorage.setItem(LS_PROFILE, JSON.stringify(updated));
    setProfile(updated);
    setEditMode(false);
    showToast('تم حفظ التغييرات بنجاح ✓');
  };

  // ── Modal-driven handlers ───────────────────────────────────────────
  const phoneSelfServiceAllowed = !phoneChanged && isPrimaryAdmin;

  const confirmPhoneChange = () => {
    if (phoneSelfServiceAllowed) {
      // First self-service change (front-end placeholder; OTP wired later)
      localStorage.setItem(LS_PHONE_CHANGED, 'true');
      setModal(null);
      showToast('سيتم إرسال رمز التحقق إلى الرقم الجديد');
    } else {
      // Needs support / admin approval
      setModal(null);
      if (isPrimaryAdmin) { setIsProfileOpen(false); onNavigate('support'); }
      else { showToast('تم إرسال الطلب إلى مسؤول النظام ✓'); }
    }
  };

  const confirmDelete = (_reason: string) => {
    setModal(null);
    setIsProfileOpen(false);
    showToast('تم رفع طلب الحذف بنجاح ✓');
  };

  const roleLabel = isPrimaryAdmin ? 'مدير النظام' : 'مستخدم مفوَّض';

  return (
    <>
    {/* ── Global Modals ─────────────────────────────────────────────── */}

    {/* Email budget exhausted */}
    {modal === 'emailWarn' && (
      <ConfirmModal
        title="تجاوزت عدد مرات تغيير البريد"
        message={`يُسمح بتغيير البريد الإلكتروني ${EMAIL_CHANGES_PER_YEAR} مرتين خلال السنة. للتغيير الإضافي يلزم رفع طلب لفريق الدعم الفني.`}
        icon={<AlertCircle size={22} className="text-amber-500 shrink-0" />}
        confirmLabel="الانتقال إلى الدعم"
        cancelLabel="حسناً"
        onCancel={() => setModal(null)}
        onConfirm={() => { setModal(null); setIsProfileOpen(false); onNavigate('support'); }}
      />
    )}

    {/* Phone change */}
    {modal === 'phoneChange' && (
      <ConfirmModal
        title="تغيير رقم الجوال"
        message={
          phoneSelfServiceAllowed
            ? 'يمكنك تغيير رقم الجوال لمرة واحدة بشكل ذاتي عبر التحقق برمز يُرسل إلى الرقم الجديد. هل تريد المتابعة؟'
            : isPrimaryAdmin
              ? 'لقد استخدمت التغيير الذاتي مسبقاً. أي تغيير إضافي يتطلب موافقة فريق الدعم الفني.'
              : 'سيُرسل طلب تغيير رقم الجوال إلى مسؤول النظام (المستخدم الأول) للموافقة عليه.'
        }
        icon={phoneSelfServiceAllowed
          ? <Phone size={22} className="text-[#655ac1] shrink-0" />
          : isPrimaryAdmin ? <Shield size={22} className="text-[#655ac1] shrink-0" /> : <Send size={22} className="text-blue-500 shrink-0" />}
        confirmLabel={phoneSelfServiceAllowed ? 'متابعة' : isPrimaryAdmin ? 'الانتقال إلى الدعم' : 'إرسال الطلب'}
        cancelLabel="إلغاء"
        onCancel={() => setModal(null)}
        onConfirm={confirmPhoneChange}
      />
    )}

    {/* Change / set password */}
    {modal === 'passwordChange' && (
      <PasswordModal
        authMethod={profile.authMethod}
        onCancel={() => setModal(null)}
        onConfirm={() => { setModal(null); showToast('تم تحديث كلمة المرور ✓'); }}
      />
    )}

    {/* Delete account with reasons */}
    {modal === 'deleteReasons' && (
      <DeleteReasonsModal
        isPrimaryAdmin={isPrimaryAdmin}
        onCancel={() => setModal(null)}
        onConfirm={confirmDelete}
      />
    )}

    {/* Toast */}
    <Toast message={toast || 'تم'} visible={!!toast} />

    <header className="sticky top-0 z-40 bg-[#fcfbff] px-4 pt-4 pb-2">
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm px-4 md:px-6 py-3 flex justify-between items-center relative">

          {/* SECTION 1: User Greeting & Mobile Menu (Start/Right) */}
          <div className="flex items-center gap-3 md:gap-4">
             {/* Mobile Menu Button */}
             <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600"
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

             {/* User Info & Profile Popover */}
             <div className="relative" ref={profileRef}>
                <button
                  onClick={() => { setIsProfileOpen(!isProfileOpen); setEditMode(false); }}
                  className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-xl transition-colors text-right"
                >
                    <div className="w-12 h-12 bg-slate-50 rounded-full border border-slate-100 flex items-center justify-center text-[#655ac1]">
                        <User size={24} />
                    </div>
                    <div>
                        <h1 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-1">
                            مرحباً، {profile.name} <ChevronDown size={16} className="text-slate-400 mt-0.5" />
                        </h1>
                    </div>
                </button>

                {/* ── Profile Popover ───────────────────────────────── */}
                {isProfileOpen && (
                  <div className="absolute top-full right-0 mt-2 w-[23rem] bg-white rounded-[1.75rem] shadow-2xl ring-1 ring-slate-200 z-50 overflow-hidden animate-fade-in">

                    {/* Header row — neutral (no purple background) */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[#655ac1] shrink-0">
                          <User size={22} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{profile.name}</p>
                          {/* Role badge */}
                          <span className={`inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isPrimaryAdmin
                              ? 'text-[#655ac1] bg-[#655ac1]/8 border-[#655ac1]/15'
                              : 'text-slate-500 bg-slate-100 border-slate-200'
                          }`}>
                            {isPrimaryAdmin ? <ShieldCheck size={11} /> : <User size={11} />}
                            {roleLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Account info strip */}
                    <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-slate-50/60 border-b border-slate-100">
                      <div className="flex flex-col items-center text-center gap-0.5">
                        <Calendar size={15} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-900">تاريخ الإنشاء</span>
                        <span className="text-[11px] font-bold text-slate-500 leading-tight">{fmtDate(profile.createdAt)}</span>
                      </div>
                      <div className="flex flex-col items-center text-center gap-0.5 border-x border-slate-200/70">
                        <LogIn size={15} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-900">آخر دخول</span>
                        <span className="text-[11px] font-bold text-slate-500 leading-tight">{fmtDate(profile.lastLogin)}</span>
                      </div>
                      <div className="flex flex-col items-center text-center gap-0.5">
                        <Clock size={15} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-900">الوقت</span>
                        <span className="text-[11px] font-bold text-slate-500 leading-tight dir-ltr">{profileTimeString}</span>
                      </div>
                    </div>

                    {/* Fields */}
                    <div className="p-4 space-y-3">

                      {/* ─ Username (free) ─ */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                          <User size={11} /> اسم المستخدم
                        </label>
                        <input
                          type="text"
                          value={editMode ? draftName : profile.name}
                          readOnly={!editMode}
                          onChange={e => handleNameChange(e.target.value)}
                          className={`w-full text-xs font-bold text-slate-700 border rounded-lg px-3 py-2 outline-none transition-colors
                            ${editMode
                              ? 'bg-white border-[#655ac1]/40 focus:border-[#655ac1] shadow-sm'
                              : 'bg-slate-50 border-slate-100 cursor-default'
                            }`}
                        />
                      </div>

                      {/* ─ Phone ─ */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                          <Phone size={11} /> رقم الجوال
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={profile.phone}
                            readOnly
                            dir="ltr"
                            className="w-full text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-right outline-none cursor-default"
                          />
                          {editMode && (
                            <button
                              onClick={handlePhoneEdit}
                              className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#655ac1] hover:underline"
                            >
                              طلب تغيير
                            </button>
                          )}
                        </div>
                        {editMode && (
                          <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                            <Info size={9} />
                            {phoneSelfServiceAllowed
                              ? 'يمكن تغييره ذاتياً مرة واحدة عبر رمز تحقق'
                              : isPrimaryAdmin ? 'التغيير الإضافي يتطلب موافقة الدعم' : 'الطلب يُرسل إلى مسؤول النظام'}
                          </p>
                        )}
                      </div>

                      {/* ─ Email (budget) ─ */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Mail size={11} /> البريد الإلكتروني
                          </label>
                          {emailLocked && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-amber-500 bg-amber-50">
                              يتطلب الدعم
                            </span>
                          )}
                        </div>
                        <input
                          type="email"
                          value={editMode ? draftEmail : profile.email}
                          readOnly={!editMode || emailLocked}
                          onChange={e => handleEmailChange(e.target.value)}
                          dir="ltr"
                          className={`w-full text-xs font-bold text-right border rounded-lg px-3 py-2 outline-none transition-colors
                            ${editMode && !emailLocked
                              ? 'bg-white border-[#655ac1]/40 focus:border-[#655ac1] shadow-sm text-slate-700'
                              : 'bg-slate-50 border-slate-100 cursor-default text-slate-400'
                            }`}
                        />
                      </div>

                      {!editMode && (
                        <button
                          onClick={openEditMode}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors group"
                        >
                          <span className="flex items-center gap-2 text-xs font-bold text-slate-600 group-hover:text-[#655ac1] transition-colors">
                            <Edit3 size={14} className="text-[#655ac1]" />
                            تعديل البيانات
                          </span>
                          <ChevronDown size={14} className="text-slate-400 rotate-90" />
                        </button>
                      )}

                      {/* ─ Password ─ */}
                      <button
                        onClick={() => setModal('passwordChange')}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors group"
                      >
                        <span className="flex items-center gap-2 text-xs font-bold text-slate-600 group-hover:text-[#655ac1] transition-colors">
                          <KeyRound size={14} className="text-[#655ac1]" />
                          {profile.authMethod === 'manual' ? 'تغيير كلمة المرور' : 'تعيين كلمة مرور'}
                        </span>
                        <ChevronDown size={14} className="text-slate-400 rotate-90" />
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
                      {editMode ? (
                        <div className="flex gap-2">
                          <button
                            onClick={cancelEdit}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                          >
                            <X size={13} /> إلغاء
                          </button>
                          <button
                            onClick={handleSave}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-white bg-[#655ac1] hover:bg-[#5448b0] rounded-xl transition-colors shadow-sm"
                          >
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1]">
                              <Check size={13} strokeWidth={3.2} className="text-white" />
                            </span>
                            حفظ
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setModal('deleteReasons')}
                          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200"
                        >
                          <Trash2 size={14} />
                          {isPrimaryAdmin ? 'طلب حذف الحساب' : 'طلب حذف حسابي'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
             </div>
          </div>

          {/* SECTION 2: Date & Time (Center) - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-4 bg-slate-50/80 px-6 py-3 rounded-full border border-slate-100 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-sm">
               {/* Time */}
               <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                   <Clock size={18} className="text-[#655ac1]" />
                   <span className="text-sm font-bold text-slate-600 font-mono pt-0.5 dir-ltr">{timeString}</span>
               </div>
               {/* Date */}
               <div className="flex items-center gap-2">
                   <Calendar size={18} className="text-[#655ac1]" />
                   <span className="text-xs font-bold text-slate-600">{dayName}</span>
                   <span className="text-xs font-bold text-slate-600">{selectedDate}</span>
                   <button
                     onClick={() => onNavigate('settings_calendar')}
                     className={`mr-2 px-2.5 py-1 rounded-full text-[11px] font-black border transition-colors ${
                       currentWeek
                         ? 'bg-[#655ac1] text-white border-[#655ac1] hover:bg-[#5548b0]'
                         : 'bg-white text-[#655ac1] border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                     }`}
                   >
                     {currentWeek ? `الأسبوع ${currentWeek}` : 'إعداد التقويم الدراسي'}
                   </button>
               </div>
          </div>


          {/* SECTION 3: Actions (End/Left) */}
          <div className="flex items-center gap-2 md:gap-3">
               {/* Notification */}
               <div className="relative" ref={notifRef}>
                 <button
                    onClick={() => setIsNotifOpen(v => !v)}
                    className="group relative w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-600 hover:text-[#655ac1] transition-colors"
                    title="الإشعارات"
                 >
                    <Bell size={22} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-black text-white leading-none">
                        {unreadCount}
                      </span>
                    )}
                 </button>

                 {/* ── Notifications Panel ─────────────────────────── */}
                 {isNotifOpen && (
                   <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 z-50 overflow-hidden animate-fade-in">
                     {/* Panel header */}
                     <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                       <div className="flex items-center gap-2">
                         <Bell size={16} className="text-[#655ac1]" />
                         <span className="text-sm font-bold text-slate-800">الإشعارات</span>
                         {unreadCount > 0 && (
                           <span className="text-[10px] font-bold text-white bg-rose-500 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                         )}
                       </div>
                       <div className="flex items-center gap-2">
                         {unreadCount > 0 && (
                           <button
                             onClick={markAllRead}
                             className="flex items-center gap-1 text-[10px] font-bold text-[#655ac1] hover:underline"
                           >
                             <CheckCheck size={11} /> تحديد الكل كمقروء
                           </button>
                         )}
                         <button
                           onClick={() => setIsNotifOpen(false)}
                           className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                           title="إغلاق"
                         >
                           <X size={14} />
                         </button>
                       </div>
                     </div>
                     {/* Notification items */}
                     <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                       {NOTIFICATIONS.map(n => {
                         const isRead = readNotifs.has(n.id);
                         const Icon = n.icon;
                         return (
                           <div
                             key={n.id}
                             onClick={() => {
                               setReadNotifs(prev => {
                                 const next = new Set(prev);
                                 next.add(n.id);
                                 localStorage.setItem('motabe_read_notifs', JSON.stringify([...next]));
                                 return next;
                               });
                             }}
                             className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${isRead ? 'opacity-60' : 'bg-violet-50/30'}`}
                           >
                             <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.color}`}>
                               <Icon size={15} />
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex items-center justify-between gap-2">
                                 <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                                 {!isRead && <span className="w-2 h-2 bg-violet-500 rounded-full shrink-0" />}
                               </div>
                               <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{n.desc}</p>
                               <p className="text-[9px] text-slate-400 mt-1 font-medium">{n.time}</p>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                     {/* Footer */}
                     <div className="p-3 border-t border-slate-100 text-center">
                       <p className="text-[10px] text-slate-400 font-medium">آخر تحديث: اليوم</p>
                     </div>
                   </div>
                 )}
               </div>

               {/* Divider */}
               <div className="h-10 w-px bg-slate-200 mx-1 hidden md:block"></div>

               {/* Logout */}
               <button
                  onClick={onLogout}
                  className="flex items-center gap-2 text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all font-bold text-sm hover:shadow-sm"
                  title="تسجيل الخروج"
               >
                  <span className="hidden md:inline">خروج</span>
                  <LogOut size={20} />
               </button>
          </div>
      </div>
    </header>
    </>
  );
};

export default Header;
