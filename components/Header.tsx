
import React, { useState, useEffect, useRef } from 'react';
import { 
  LogOut, 
  Menu, 
  X, 
  Bell,
  Clock,
  Calendar,
  User,
  Save,
  Trash2,
  Edit3,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  Info,
  Shield,
  Send,
  UserPlus,
  CreditCard,
  Sparkles,
  LogIn,
  CheckCheck,
  Settings2,
  ChevronDown
} from 'lucide-react';
import { SchoolInfo } from '../types';

// ─── localStorage keys ───────────────────────────────────────────────
const LS_PROFILE      = 'motabe_profile';
const LS_NAME_CHANGED = 'motabe_name_changed';
const LS_EMAIL_CHANGED = 'motabe_email_changed';

const DEFAULT_PROFILE = {
  name:  'فيصل الحربي',
  phone: '0504777058',
  email: 'faisal_alsobhi2050@gmail.com',
};

function loadProfile() {
  try {
    const raw = localStorage.getItem(LS_PROFILE);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };
  } catch { return { ...DEFAULT_PROFILE }; }
}

// ─── Modal helper ────────────────────────────────────────────────────
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
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-fade-in" onClick={e => e.stopPropagation()}>
      {icon && <div className="flex justify-center mb-3">{icon}</div>}
      <h3 className="text-base font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed mb-5">{message}</p>
      <div className="flex gap-2 justify-center">
        <button onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >{cancelLabel}</button>
        {onConfirm && (
          <button onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors ${confirmDanger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-[#655ac1] hover:bg-[#5448b0]'}`}
          >{confirmLabel}</button>
        )}
      </div>
    </div>
  </div>
);

// ─── Success Toast ───────────────────────────────────────────────────
const Toast: React.FC<{ message: string; visible: boolean }> = ({ message, visible }) => (
  <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 bg-emerald-600 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-xl transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
    <CheckCircle size={16} /> {message}
  </div>
);

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
  const [draftPhone, setDraftPhone] = useState(profile.phone);
  const [draftEmail, setDraftEmail] = useState(profile.email);

  const nameChanged  = localStorage.getItem(LS_NAME_CHANGED)  === 'true';
  const emailChanged = localStorage.getItem(LS_EMAIL_CHANGED) === 'true';

  // ── Modal state ────────────────────────────────────────────────────
  type ModalKey =
    | 'nameWarn' | 'emailWarn'
    | 'phoneAdmin' | 'phoneSub'
    | 'deleteAdmin' | 'deleteSub'
    | 'saveSuccess' | null;
  const [modal, setModal] = useState<ModalKey>(null);
  const [toast, setToast] = useState(false);

  const showToast = (msg?: string) => {
    setToast(true);
    setTimeout(() => setToast(false), 3000);
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

  const gregorianDate = new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(currentTime);

  const timeString = new Intl.DateTimeFormat('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(currentTime);

  // ── Edit helpers ────────────────────────────────────────────────────
  const openEditMode = () => {
    setDraftName(profile.name);
    setDraftPhone(profile.phone);
    setDraftEmail(profile.email);
    setEditMode(true);
  };

  const cancelEdit = () => setEditMode(false);

  // Called when user tries to change name field while in edit mode
  const handleNameChange = (val: string) => {
    if (nameChanged && val !== profile.name) {
      // Already changed once — block further changes silently by reverting
      setDraftName(profile.name);
      setModal('nameWarn');
    } else {
      setDraftName(val);
    }
  };

  // Called when user tries to change email field while in edit mode
  const handleEmailChange = (val: string) => {
    if (emailChanged && val !== profile.email) {
      setDraftEmail(profile.email);
      setModal('emailWarn');
    } else {
      setDraftEmail(val);
    }
  };

  // Phone click — open appropriate flow
  const handlePhoneEdit = () => {
    if (!editMode) return;
    if (isPrimaryAdmin) {
      setModal('phoneAdmin');
    } else {
      setModal('phoneSub');
    }
  };

  // Save changes
  const handleSave = () => {
    const updated = {
      name:  draftName.trim()  || profile.name,
      phone: draftPhone.trim() || profile.phone,
      email: draftEmail.trim() || profile.email,
    };

    // Track once-only changes
    if (updated.name  !== profile.name)  localStorage.setItem(LS_NAME_CHANGED,  'true');
    if (updated.email !== profile.email) localStorage.setItem(LS_EMAIL_CHANGED, 'true');

    // Persist
    localStorage.setItem(LS_PROFILE, JSON.stringify(updated));
    setProfile(updated);
    setEditMode(false);
    showToast();
  };

  // Delete account
  const handleDeleteRequest = () => {
    if (isPrimaryAdmin) {
      setModal('deleteAdmin');
    } else {
      setModal('deleteSub');
    }
  };

  return (
    <>
    {/* ── Global Modals ─────────────────────────────────────────────── */}

    {/* Name already changed */}
    {modal === 'nameWarn' && (
      <ConfirmModal
        title="لا يمكن تغيير الاسم مجدداً"
        message="يُسمح بتغيير اسم المستخدم مرة واحدة فقط. لقد استنفدت هذه الميزة مسبقاً."
        icon={<AlertCircle size={36} className="text-amber-500" />}
        onCancel={() => setModal(null)}
        cancelLabel="حسناً، فهمت"
      />
    )}

    {/* Email already changed */}
    {modal === 'emailWarn' && (
      <ConfirmModal
        title="لا يمكن تغيير البريد مجدداً"
        message="يُسمح بتغيير البريد الإلكتروني مرة واحدة فقط. لقد استنفدت هذه الميزة مسبقاً."
        icon={<AlertCircle size={36} className="text-amber-500" />}
        onCancel={() => setModal(null)}
        cancelLabel="حسناً، فهمت"
      />
    )}

    {/* Phone — primary admin needs support */}
    {modal === 'phoneAdmin' && (
      <ConfirmModal
        title="تغيير رقم الجوال"
        message="تغيير رقم جوال مدير النظام يتطلب موافقة فريق الدعم الفني لمنصة متابع. سيتم تحويلك لصفحة الدعم الفني لرفع طلب."
        icon={<Shield size={36} className="text-[#655ac1]" />}
        confirmLabel="انتقل إلى الدعم الفني"
        cancelLabel="إلغاء"
        onCancel={() => setModal(null)}
        onConfirm={() => { setModal(null); setIsProfileOpen(false); onNavigate('support'); }}
      />
    )}

    {/* Phone — sub-user sends request to admin */}
    {modal === 'phoneSub' && (
      <ConfirmModal
        title="إرسال طلب تغيير الجوال"
        message="سيُرسل طلب تغيير رقم الجوال إلى مسؤول النظام (المستخدم الأول) للموافقة عليه. هل تريد إرسال الطلب؟"
        icon={<Send size={36} className="text-blue-500" />}
        confirmLabel="إرسال الطلب"
        cancelLabel="إلغاء"
        onCancel={() => setModal(null)}
        onConfirm={() => { setModal(null); showToast(); }}
      />
    )}

    {/* Delete — primary admin */}
    {modal === 'deleteAdmin' && (
      <ConfirmModal
        title="حذف الحساب"
        message="لا يمكن حذف حساب مدير النظام إلا من خلال فريق الدعم الفني لمنصة متابع. يرجى رفع تذكرة دعم من صفحة الدعم الفني مع توضيح الأسباب."
        icon={<Info size={36} className="text-rose-500" />}
        confirmLabel="انتقل إلى الدعم الفني"
        cancelLabel="إلغاء"
        confirmDanger
        onCancel={() => setModal(null)}
        onConfirm={() => { setModal(null); setIsProfileOpen(false); onNavigate('support'); }}
      />
    )}

    {/* Delete — sub-user */}
    {modal === 'deleteSub' && (
      <ConfirmModal
        title="طلب حذف الحساب"
        message="سيُرسل طلب حذف حسابك إلى مسؤول النظام (المستخدم الأول) للموافقة عليه. هل أنت متأكد؟"
        icon={<Trash2 size={36} className="text-rose-500" />}
        confirmLabel="إرسال طلب الحذف"
        cancelLabel="إلغاء"
        confirmDanger
        onCancel={() => setModal(null)}
        onConfirm={() => { setModal(null); showToast(); }}
      />
    )}

    {/* Toast */}
    <Toast message="تم إرسال الطلب بنجاح ✓" visible={toast} />

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
                  <div className="absolute top-full right-0 mt-2 w-[22rem] bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 z-50 overflow-hidden animate-fade-in">
                    
                    {/* Header row */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#655ac1]/10 flex items-center justify-center text-[#655ac1]">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{profile.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {isPrimaryAdmin ? 'مدير النظام' : 'مستخدم مفوَّض'}
                          </p>
                        </div>
                      </div>
                      {!editMode && (
                        <button
                          onClick={openEditMode}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-[#655ac1] bg-[#655ac1]/8 hover:bg-[#655ac1]/15 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Edit3 size={13} /> تعديل
                        </button>
                      )}
                    </div>

                    {/* Fields */}
                    <div className="p-4 space-y-3">

                      {/* ─ Username ─ */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <User size={11} /> اسم المستخدم
                          </label>
                          {nameChanged && (
                            <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                              لا يمكن تغييره
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={editMode ? draftName : profile.name}
                          readOnly={!editMode || nameChanged}
                          onChange={e => handleNameChange(e.target.value)}
                          className={`w-full text-xs font-bold text-slate-700 border rounded-lg px-3 py-2 outline-none transition-colors
                            ${editMode && !nameChanged
                              ? 'bg-white border-[#655ac1]/40 focus:border-[#655ac1] shadow-sm'
                              : 'bg-slate-50 border-slate-100 cursor-not-allowed text-slate-400'
                            }`}
                        />
                        {editMode && !nameChanged && (
                          <p className="text-[9px] text-amber-600 mt-1 flex items-center gap-1">
                            <AlertCircle size={9} /> يمكن تغيير الاسم مرة واحدة فقط
                          </p>
                        )}
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
                              {isPrimaryAdmin ? 'طلب التغيير' : 'إرسال طلب'}
                            </button>
                          )}
                        </div>
                        {editMode && (
                          <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                            <Info size={9} />
                            {isPrimaryAdmin
                              ? 'التغيير يتطلب موافقة الدعم الفني'
                              : 'الطلب يُرسل إلى مسؤول النظام'}
                          </p>
                        )}
                      </div>

                      {/* ─ Email ─ */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Mail size={11} /> البريد الإلكتروني
                          </label>
                          {emailChanged && (
                            <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                              لا يمكن تغييره
                            </span>
                          )}
                        </div>
                        <input
                          type="email"
                          value={editMode ? draftEmail : profile.email}
                          readOnly={!editMode || emailChanged}
                          onChange={e => handleEmailChange(e.target.value)}
                          dir="ltr"
                          className={`w-full text-xs font-bold text-right border rounded-lg px-3 py-2 outline-none transition-colors
                            ${editMode && !emailChanged
                              ? 'bg-white border-[#655ac1]/40 focus:border-[#655ac1] shadow-sm text-slate-700'
                              : 'bg-slate-50 border-slate-100 cursor-not-allowed text-slate-400'
                            }`}
                        />
                        {editMode && !emailChanged && (
                          <p className="text-[9px] text-amber-600 mt-1 flex items-center gap-1">
                            <AlertCircle size={9} /> يمكن تغيير البريد مرة واحدة فقط
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
                      {editMode ? (
                        <div className="flex gap-2">
                          <button
                            onClick={cancelEdit}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                          >
                            <X size={13} /> إلغاء
                          </button>
                          <button
                            onClick={handleSave}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-[#655ac1] hover:bg-[#5448b0] rounded-xl transition-colors shadow-sm"
                          >
                            <Save size={13} /> حفظ التغييرات
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleDeleteRequest}
                          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-rose-100"
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
                   <Calendar size={18} className="text-slate-400" />
                   <span className="text-xs font-bold text-slate-600">{gregorianDate}</span>
                   <span className="text-xs text-slate-300 mx-1">|</span>
                   <span className="text-xs font-bold text-slate-500">{hijriDate}</span>
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
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-black text-white leading-none">
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
                           <span className="text-[10px] font-bold text-white bg-amber-500 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
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
