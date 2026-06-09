import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Edit2,
  MessageSquare,
  MoreHorizontal,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react';
import { Admin, Delegate } from '../../types';
import Toast, { useToast } from './Toast';
import EditPermissionsModal from './EditPermissionsModal';
import { logAction } from './auditLog';
import { isFullPermissions } from './permissionsConfig';

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

interface ManageDelegatesProps {
  onDelegatesChange?: () => void;
  admins?: Admin[];
}

export default function ManageDelegates({ onDelegatesChange, admins = [] }: ManageDelegatesProps) {
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editDelegate, setEditDelegate] = useState<Delegate | null>(null);
  const [regenerateModal, setRegenerateModal] = useState<{ delegateId: string; newOtp: string } | null>(null);
  const [resetConfirmId, setResetConfirmId] = useState<string | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<{ id: string; current: boolean } | null>(null);
  const [regenerateConfirmId, setRegenerateConfirmId] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const { toast, showToast } = useToast();

  const openActionMenu = (event: React.MouseEvent, id: string) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 240;
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    setActionMenu((prev) => (prev?.id === id ? null : { id, top: rect.bottom + 8, left }));
  };

  useEffect(() => {
    if (!actionMenu) return;
    const close = () => setActionMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [actionMenu]);

  useEffect(() => {
    const saved = localStorage.getItem('motabe_delegates');
    if (saved) setDelegates(JSON.parse(saved));
  }, []);

  const save = (updated: Delegate[]) => {
    setDelegates(updated);
    localStorage.setItem('motabe_delegates', JSON.stringify(updated));
    window.dispatchEvent(new Event('motabe:delegates-updated'));
    onDelegatesChange?.();
  };

  const getDerivedRole = (delegate: Delegate) =>
    isFullPermissions(delegate.customPermissions) || delegate.role === 'delegate_full'
      ? 'delegate_full'
      : 'delegate_custom';

  const handleToggleActive = (id: string, current: boolean) => {
    const target = delegates.find((delegate) => delegate.id === id);
    save(delegates.map((delegate) => (delegate.id === id ? { ...delegate, isActive: !current } : delegate)));

    if (target) {
      logAction({
        actionType: current ? 'deactivate' : 'activate',
        action: current ? 'إيقاف حساب المفوض' : 'تفعيل حساب المفوض',
        targetDelegateName: target.name,
      });
    }

    showToast(current ? 'تم إيقاف حساب المفوض' : 'تم تفعيل حساب المفوض', 'success');
  };

  const handleRegenerateOtp = (id: string) => {
    const target = delegates.find((delegate) => delegate.id === id);
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

    save(delegates.map((delegate) => (delegate.id === id ? { ...delegate, otp: newOtp, isPendingSetup: true } : delegate)));

    if (target) {
      logAction({
        actionType: 'regenerate_otp',
        action: 'إعادة إصدار رمز التفعيل',
        targetDelegateName: target.name,
      });
    }

    setRegenerateModal({ delegateId: id, newOtp });
  };

  const handleResetAccount = (id: string) => {
    const target = delegates.find((delegate) => delegate.id === id);
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

    save(
      delegates.map((delegate) =>
        delegate.id === id
          ? { ...delegate, otp: newOtp, isPendingSetup: true, username: undefined, passwordHash: undefined }
          : delegate
      )
    );

    if (target) {
      logAction({
        actionType: 'reset_account',
        action: 'إعادة تهيئة حساب المفوض',
        targetDelegateName: target.name,
        details: 'تم حذف بيانات الدخول وإصدار رمز تفعيل جديد',
      });
    }

    setResetConfirmId(null);
    setRegenerateModal({ delegateId: id, newOtp });
    showToast('تمت إعادة تهيئة الحساب وإصدار رمز جديد للمفوض', 'success');
  };

  const handleEditSave = (updated: Partial<Delegate>) => {
    if (!editDelegate) return;

    save(delegates.map((delegate) => (delegate.id === editDelegate.id ? { ...delegate, ...updated } : delegate)));

    logAction({
      actionType: 'edit_permissions',
      action: 'تعديل صلاحيات المفوض',
      targetDelegateName: editDelegate.name,
    });

    setEditDelegate(null);
    showToast('تم حفظ تعديلات الصلاحيات بنجاح', 'success');
  };

  const proceedDelete = () => {
    if (!deleteConfirmId) return;

    const target = delegates.find((delegate) => delegate.id === deleteConfirmId);
    save(delegates.filter((delegate) => delegate.id !== deleteConfirmId));

    if (target) {
      logAction({
        actionType: 'delete',
        action: 'حذف المفوض',
        targetDelegateName: target.name,
      });
    }

    showToast('تم حذف المفوض بنجاح', 'success');
    setDeleteConfirmId(null);
  };

  const filtered = delegates.filter((delegate) => {
    const q = searchTerm.toLowerCase();
    return (
      !q ||
      delegate.name.toLowerCase().includes(q) ||
      delegate.phone.includes(q) ||
      (delegate.username ?? '').toLowerCase().includes(q)
    );
  });

  const getStatusView = (delegate: Delegate) => {
    if (delegate.isPendingSetup) {
      return {
        label: 'بانتظار التفعيل',
        className: 'text-orange-500',
      };
    }

    if (delegate.isActive) {
      return {
        label: 'نشط ومفعّل',
        className: 'text-emerald-600',
      };
    }

    return {
      label: 'موقوف',
      className: 'text-orange-500',
    };
  };

  const normalizePhone = (phone?: string) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('00')) return digits.slice(2);
    if (digits.startsWith('0')) return `966${digits.slice(1)}`;
    if (digits.startsWith('966')) return digits;
    if (digits.startsWith('5') && digits.length === 9) return `966${digits}`;
    return digits;
  };

  const handleShareRegeneratedOtpViaWhatsApp = () => {
    if (!regenerateModal) return;

    const delegate = delegates.find((item) => item.id === regenerateModal.delegateId);
    const phone = normalizePhone(delegate?.phone);

    if (!delegate?.phone || !phone) {
      showToast('لا يوجد رقم جوال صالح لفتح واتساب', 'warning');
      return;
    }

    const message = encodeURIComponent(
      `مرحبًا ${delegate.name}\nرمز الدخول المؤقت لتفعيل حساب المفوض هو:\n${regenerateModal.newOtp}`
    );

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1.5 rounded-full bg-[#655ac1]" />
            <h4 className="text-lg font-black text-slate-800">المفوضون</h4>
            <span className="mr-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-black text-[#655ac1]">{filtered.length}</span>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="ابحث بالاسم أو الجوال أو المستخدم"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-3 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={44} className="mx-auto mb-3 text-slate-300" />
            <p className="font-black text-slate-600">{delegates.length === 0 ? 'لا يوجد مفوضون مسجلون بعد' : 'لا توجد نتائج مطابقة'}</p>
            <p className="mt-1 text-sm text-slate-400">{delegates.length === 0 ? 'ابدأ بإسناد الصلاحيات من المرحلة الأولى' : 'جرّب تغيير مصطلح البحث'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed border-separate border-spacing-0 overflow-hidden rounded-2xl border border-slate-100 text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="w-14 px-3 py-4 text-center text-xs font-black text-[#655ac1]">م</th>
                  <th className="w-[24%] px-3 py-4 text-xs font-black text-[#655ac1]">المفوض</th>
                  <th className="w-[15%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">الصفة</th>
                  <th className="w-[15%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">الجوال</th>
                  <th className="w-[15%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">اسم المستخدم</th>
                  <th className="w-28 px-3 py-4 text-center text-xs font-black text-[#655ac1]">الصلاحية</th>
                  <th className="w-32 px-3 py-4 text-center text-xs font-black text-[#655ac1]">الحالة</th>
                  <th className="w-20 px-3 py-4 text-center text-xs font-black text-[#655ac1]">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((delegate, index) => {
                  const isFullAccess = getDerivedRole(delegate) === 'delegate_full';
                  const status = getStatusView(delegate);
                  const liveAdmin = delegate.linkedStaffType === 'admin'
                    ? admins.find((admin) => admin.id === delegate.linkedStaffId)
                    : undefined;
                  const title = delegate.linkedStaffType === 'teacher'
                    ? 'معلم'
                    : (liveAdmin?.role || delegate.linkedStaffTitle || 'إداري');
                  return (
                    <tr key={delegate.id} className="transition-colors hover:bg-[#e5e1fe]/10">
                      <td className="px-3 py-3.5 text-center">
                        <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-xs font-bold text-slate-400">{index + 1}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="truncate font-bold text-slate-700">{delegate.name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {delegate.isPendingSetup
                            ? 'بانتظار إكمال التفعيل'
                            : delegate.isActive
                            ? 'جاهز للاستخدام'
                            : 'الحساب موقوف حاليًا'}
                        </p>
                      </td>
                      <td className="px-3 py-3.5 text-center text-sm font-medium text-slate-600">
                        {title}
                      </td>
                      <td className="px-3 py-3.5 text-center text-sm">
                        <span className="inline-flex items-center justify-center gap-1.5 text-slate-600">
                          <Smartphone size={13} className="shrink-0 text-[#655ac1]" />
                          <span dir="ltr">{delegate.phone}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center text-sm">
                        <span className="font-medium text-slate-600" dir="ltr">
                          {delegate.username ? `@${delegate.username}` : 'لم يُنشأ بعد'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className="text-sm font-black text-[#655ac1]">{isFullAccess ? 'كاملة' : 'مخصصة'}</span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${status.className}`}>
                          {delegate.isPendingSetup ? <Clock size={11} /> : delegate.isActive ? <CheckCircle2 size={11} /> : <Power size={11} />}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <button
                          onClick={(event) => { event.stopPropagation(); openActionMenu(event, delegate.id); }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
                          title="إجراءات"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action menu (portal) */}
      {actionMenu && ReactDOM.createPortal(
        (() => {
          const delegate = delegates.find((item) => item.id === actionMenu.id);
          if (!delegate) return null;
          const itemBase = 'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm font-bold transition-colors';
          const iconWrap = 'flex h-7 w-7 shrink-0 items-center justify-center';
          return (
            <div
              className="fixed z-[9999] w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
              style={{ top: actionMenu.top, left: actionMenu.left, minWidth: 220 }}
              onClick={(event) => event.stopPropagation()}
            >
              {!delegate.isPendingSetup && (
                <button onClick={() => { setEditDelegate(delegate); setActionMenu(null); }} className={`${itemBase} text-slate-700 hover:bg-slate-50`}>
                  <span className={`${iconWrap} text-slate-500`}><Edit2 size={15} /></span>
                  <span className="flex-1 transition-colors group-hover:text-[#655ac1]">تعديل الصلاحيات</span>                </button>
              )}

              {delegate.isPendingSetup ? (
                <button onClick={() => { setRegenerateConfirmId(delegate.id); setActionMenu(null); }} className={`${itemBase} text-slate-700 hover:bg-slate-50`}>
                  <span className={`${iconWrap} text-[#655ac1]`}><RefreshCw size={15} /></span>
                  <span className="flex-1 transition-colors group-hover:text-[#655ac1]">إعادة إصدار الرمز</span>                </button>
              ) : (
                <button onClick={() => { setResetConfirmId(delegate.id); setActionMenu(null); }} className={`${itemBase} text-slate-700 hover:bg-slate-50`}>
                  <span className={`${iconWrap} text-amber-500`}><RotateCcw size={15} /></span>
                  <span className="flex-1 transition-colors group-hover:text-[#655ac1]">إعادة تهيئة الحساب</span>                </button>
              )}

              <button onClick={() => { setToggleConfirm({ id: delegate.id, current: delegate.isActive }); setActionMenu(null); }} className={`${itemBase} text-slate-700 hover:bg-slate-50`}>
                <span className={`${iconWrap} ${delegate.isActive ? 'text-rose-500' : 'text-emerald-500'}`}><Power size={15} /></span>
                <span className="flex-1 transition-colors group-hover:text-[#655ac1]">{delegate.isActive ? 'إيقاف الحساب' : 'تفعيل الحساب'}</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button onClick={() => { setDeleteConfirmId(delegate.id); setActionMenu(null); }} className={`${itemBase} text-rose-600 hover:bg-rose-50`}>
                <span className={`${iconWrap} text-rose-500`}><Trash2 size={15} /></span>
                <span className="flex-1">حذف المفوض</span>
              </button>
            </div>
          );
        })(),
        document.body
      )}

      {editDelegate && (
        <EditPermissionsModal
          delegate={editDelegate}
          onSave={handleEditSave}
          onClose={() => setEditDelegate(null)}
        />
      )}

      {regenerateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="mb-2 flex items-center justify-start gap-2 text-[#655ac1]">
              <RefreshCw size={24} className="shrink-0" />
              <h3 className="text-xl font-black text-slate-800">رمز التفعيل الجديد</h3>
            </div>
            <p className="text-sm text-slate-500 mb-5 text-right">أرسل هذا الرمز للموظف لإتمام التفعيل</p>
            <div className="bg-slate-50 border-2 border-[#655ac1]/20 rounded-2xl px-8 py-5 mb-5 w-full">
              <p className="text-4xl font-black text-[#655ac1] tracking-widest">{regenerateModal.newOtp}</p>
            </div>
            <div className="flex gap-2 justify-center flex-wrap mb-4">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(regenerateModal.newOtp);
                  showToast('تم نسخ الرمز', 'success');
                }}
                className="flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl font-bold text-sm transition-colors"
              >
                <Copy size={14} /> نسخ
              </button>
              <button
                onClick={handleShareRegeneratedOtpViaWhatsApp}
                className="flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-[#25D366] hover:bg-[#25D366]/5 text-slate-700 px-3 py-2 rounded-xl font-bold text-sm transition-colors"
              >
                <WhatsAppIcon size={14} /> واتساب
              </button>
              <button
                onClick={() => showToast('تم فتح الرسائل (محاكاة)', 'success')}
                className="flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-[#007AFF] hover:bg-[#007AFF]/5 text-slate-700 px-3 py-2 rounded-xl font-bold text-sm transition-colors"
              >
                <MessageSquare size={14} className="text-[#007AFF]" /> رسالة
              </button>
            </div>
            <button
              onClick={() => setRegenerateModal(null)}
              className="w-full px-4 py-3 bg-[#655ac1] hover:bg-[#655ac1] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-200 text-white rounded-xl font-bold transition-all"
            >
              تم
            </button>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-start gap-3 p-6">
              <Trash2 size={28} className="mt-0.5 shrink-0 text-rose-500" />
              <div>
                <h3 className="mb-2 text-xl font-black text-slate-800">تأكيد حذف المفوض</h3>
                <p className="text-sm font-medium leading-relaxed text-slate-500">سيتم حذف هذا المفوض نهائياً، ولا يمكن التراجع عن هذا الإجراء.</p>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">إلغاء</button>
              <button onClick={proceedDelete} className="flex-1 rounded-xl bg-rose-500 px-4 py-3 text-sm font-bold text-white shadow-md shadow-rose-500/20 transition-colors hover:bg-rose-600">حذف</button>
            </div>
          </div>
        </div>
      )}

      {regenerateConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-start gap-3 p-6">
              <RefreshCw size={28} className="mt-0.5 shrink-0 text-[#655ac1]" />
              <div>
                <h3 className="mb-2 text-xl font-black text-slate-800">إعادة إصدار رمز التفعيل</h3>
                <p className="text-sm font-medium leading-relaxed text-slate-500">سيتم إنشاء رمز تفعيل جديد للمفوض ومشاركته معه. هل تريد المتابعة؟</p>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setRegenerateConfirmId(null)} className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">إلغاء</button>
              <button
                onClick={() => { handleRegenerateOtp(regenerateConfirmId); setRegenerateConfirmId(null); }}
                className="flex-1 rounded-xl bg-[#655ac1] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#655ac1]/20 transition-colors hover:bg-[#5448b5]"
              >
                إعادة الإصدار
              </button>
            </div>
          </div>
        </div>
      )}

      {toggleConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-start gap-3 p-6">
              <Power size={28} className={`mt-0.5 shrink-0 ${toggleConfirm.current ? 'text-rose-500' : 'text-emerald-500'}`} />
              <div>
                <h3 className="mb-2 text-xl font-black text-slate-800">{toggleConfirm.current ? 'إيقاف حساب المفوض' : 'تفعيل حساب المفوض'}</h3>
                <p className="text-sm font-medium leading-relaxed text-slate-500">
                  {toggleConfirm.current
                    ? 'سيتم إيقاف الحساب ومنع المفوض من الدخول حتى إعادة التفعيل. هل تريد المتابعة؟'
                    : 'سيتم تفعيل الحساب والسماح للمفوض بالدخول مجددًا. هل تريد المتابعة؟'}
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setToggleConfirm(null)} className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">إلغاء</button>
              <button
                onClick={() => { handleToggleActive(toggleConfirm.id, toggleConfirm.current); setToggleConfirm(null); }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-md transition-colors ${
                  toggleConfirm.current ? 'bg-rose-500 shadow-rose-500/20 hover:bg-rose-600' : 'bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600'
                }`}
              >
                {toggleConfirm.current ? 'إيقاف الحساب' : 'تفعيل الحساب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-start gap-3 p-6">
              <AlertTriangle size={28} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <h3 className="mb-2 text-xl font-black text-slate-800">إعادة تهيئة الحساب</h3>
                <p className="text-sm font-medium leading-relaxed text-slate-500">سيتم حذف بيانات الدخول الحالية وإصدار رمز تفعيل جديد. هل تريد المتابعة؟</p>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setResetConfirmId(null)} className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">إلغاء</button>
              <button onClick={() => handleResetAccount(resetConfirmId)} className="flex-1 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-md shadow-amber-500/20 transition-colors hover:bg-amber-600">إعادة التهيئة</button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
