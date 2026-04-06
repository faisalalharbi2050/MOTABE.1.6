import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Edit2,
  MessageSquare,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react';
import { Delegate } from '../../types';
import Toast, { useToast } from './Toast';
import EditPermissionsModal from './EditPermissionsModal';
import { logAction } from './auditLog';
import { isFullPermissions } from './permissionsConfig';

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

export default function ManageDelegates() {
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editDelegate, setEditDelegate] = useState<Delegate | null>(null);
  const [regenerateModal, setRegenerateModal] = useState<{ delegateId: string; newOtp: string } | null>(null);
  const [resetConfirmId, setResetConfirmId] = useState<string | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<{ id: string; current: boolean } | null>(null);
  const [regenerateConfirmId, setRegenerateConfirmId] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('motabe_delegates');
    if (saved) setDelegates(JSON.parse(saved));
  }, []);

  const save = (updated: Delegate[]) => {
    setDelegates(updated);
    localStorage.setItem('motabe_delegates', JSON.stringify(updated));
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

    const nextPermissions = updated.customPermissions ?? editDelegate.customPermissions ?? [];
    const nextIsFull = isFullPermissions(nextPermissions);

    save(delegates.map((delegate) => (delegate.id === editDelegate.id ? { ...delegate, ...updated } : delegate)));

    logAction({
      actionType: 'edit_permissions',
      action: 'تعديل صلاحيات المفوض',
      targetDelegateName: editDelegate.name,
      details: nextIsFull
        ? 'صلاحية كاملة'
        : `صلاحية مخصصة — ${nextPermissions.filter((permission) => !permission.moduleId.includes('_')).length} قسم`,
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative w-full md:flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="البحث بالاسم أو الجوال أو اسم المستخدم..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2.5 text-sm outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1] transition-all"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              الإجمالي: {delegates.length}
            </span>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Users size={48} className="text-[#655ac1] mx-auto mb-4" />
          {delegates.length === 0 ? (
            <>
              <p className="font-bold text-lg text-slate-600">لا يوجد مفوضون مسجلون بعد</p>
              <p className="text-sm text-slate-400 mt-1">
                ابدأ من تبويب <span className="text-[#655ac1] font-bold">إضافة مفوض</span>
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-lg text-slate-600">لا توجد نتائج مطابقة</p>
              <p className="text-sm text-slate-400 mt-1">جرّب تغيير مصطلح البحث</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {filtered.map((delegate, index) => {
              const isFullAccess = getDerivedRole(delegate) === 'delegate_full';
              const status = getStatusView(delegate);

              return (
                <div key={delegate.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-black text-[#655ac1]">
                          {index + 1}
                        </span>
                        <p className="font-bold text-slate-800">{delegate.name}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {delegate.isPendingSetup
                          ? 'بانتظار إكمال التفعيل'
                          : delegate.isActive
                          ? 'جاهز للاستخدام'
                          : 'الحساب موقوف حاليًا'}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                        isFullAccess ? 'bg-[#655ac1] text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isFullAccess ? 'كاملة' : 'مخصصة'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 px-3 py-2.5 border border-slate-200">
                      <p className="text-[11px] font-bold text-slate-400">صفة المفوض</p>
                      <p className="mt-1 font-bold text-slate-700">
                        {delegate.linkedStaffType === 'teacher' ? 'معلم' : 'إداري'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-2.5 border border-slate-200">
                      <p className="text-[11px] font-bold text-slate-400">الحالة</p>
                      <p className={`mt-1 text-xs font-bold ${status.className}`}>{status.label}</p>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-2.5 border border-slate-200 col-span-2">
                      <p className="text-[11px] font-bold text-slate-400">الجوال</p>
                      <div className="mt-1 flex items-center gap-1.5 text-slate-700">
                        <Smartphone size={13} className="text-slate-400 shrink-0" />
                        <span dir="ltr" className="font-medium">{delegate.phone}</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-2.5 border border-slate-200 col-span-2">
                      <p className="text-[11px] font-bold text-slate-400">اسم المستخدم</p>
                      <p dir="ltr" className="mt-1 font-medium text-slate-700">
                        {delegate.username ? `@${delegate.username}` : 'لم يُنشأ بعد'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 border-t border-slate-100 pt-3">
                    {!delegate.isPendingSetup && (
                      <button
                        onClick={() => setEditDelegate(delegate)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-[#655ac1] hover:border-[#d4cbf9] hover:bg-[#f6f3ff] transition-all"
                        title="تعديل الصلاحيات"
                      >
                        <Edit2 size={15} />
                      </button>
                    )}

                    {delegate.isPendingSetup ? (
                      <button
                        onClick={() => setRegenerateConfirmId(delegate.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#655ac1] hover:border-[#d9d0ff] hover:bg-[#f6f3ff] transition-all"
                        title="إعادة إصدار رمز التفعيل"
                      >
                        <RefreshCw size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={() => setResetConfirmId(delegate.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
                        title="إعادة تهيئة الحساب"
                      >
                        <RotateCcw size={15} />
                      </button>
                    )}

                    <button
                      onClick={() => setToggleConfirm({ id: delegate.id, current: delegate.isActive })}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all border ${
                        delegate.isActive
                          ? 'border-slate-200 bg-white text-rose-600 hover:border-rose-200 hover:bg-rose-50'
                          : 'border-slate-200 bg-white text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50'
                      }`}
                      title={delegate.isActive ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                    >
                      <Power size={15} />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(delegate.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all"
                      title="حذف المفوض"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div>
              <table className="w-full table-fixed text-right">
              <thead className="bg-white border-b text-sm text-[#655ac1]">
                <tr>
                  <th className="px-4 py-4 font-medium w-14 text-center whitespace-nowrap">م</th>
                  <th className="px-4 py-4 font-medium w-[20%] whitespace-nowrap">المفوض</th>
                  <th className="px-4 py-4 font-medium w-24 text-center whitespace-nowrap">صفة المفوض</th>
                  <th className="px-4 py-4 font-medium w-36 text-center whitespace-nowrap">الجوال</th>
                  <th className="px-4 py-4 font-medium w-36 text-center whitespace-nowrap">اسم المستخدم</th>
                  <th className="px-4 py-4 font-medium text-center whitespace-nowrap">الصلاحية</th>
                  <th className="px-4 py-4 font-medium text-center whitespace-nowrap">الحالة</th>
                  <th className="px-4 py-4 font-medium w-[180px] text-center whitespace-nowrap">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y relative text-gray-700">
                {filtered.map((delegate, index) => {
                  const isFullAccess = getDerivedRole(delegate) === 'delegate_full';
                  const status = getStatusView(delegate);

                  return (
                    <tr key={delegate.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-4 text-gray-400 text-sm text-center whitespace-nowrap">{index + 1}</td>
                      <td className="px-4 py-4">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{delegate.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {delegate.isPendingSetup
                              ? 'بانتظار إكمال التفعيل'
                              : delegate.isActive
                              ? 'جاهز للاستخدام'
                              : 'الحساب موقوف حاليًا'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-center whitespace-nowrap">
                        {delegate.linkedStaffType === 'teacher' ? 'معلم' : 'إداري'}
                      </td>
                      <td className="px-4 py-4 text-sm text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 text-slate-600 whitespace-nowrap">
                          <Smartphone size={13} className="text-slate-400 shrink-0" />
                          <span dir="ltr">{delegate.phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-center whitespace-nowrap">
                        <span className="font-medium text-slate-700 whitespace-nowrap" dir="ltr">
                          {delegate.username ? `@${delegate.username}` : 'لم يُنشأ بعد'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                            isFullAccess ? 'bg-[#655ac1] text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isFullAccess ? 'كاملة' : 'مخصصة'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap ${status.className}`}>
                          {delegate.isPendingSetup ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                          {!delegate.isPendingSetup && (
                            <button
                              onClick={() => setEditDelegate(delegate)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-[#655ac1] hover:border-[#d4cbf9] hover:bg-[#f6f3ff] transition-all"
                              title="تعديل الصلاحيات"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}

                          {delegate.isPendingSetup ? (
                            <button
                              onClick={() => setRegenerateConfirmId(delegate.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#655ac1] hover:border-[#d9d0ff] hover:bg-[#f6f3ff] transition-all"
                              title="إعادة إصدار رمز التفعيل"
                            >
                              <RefreshCw size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => setResetConfirmId(delegate.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
                              title="إعادة تهيئة الحساب"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}

                          <button
                            onClick={() => setToggleConfirm({ id: delegate.id, current: delegate.isActive })}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all border ${
                              delegate.isActive
                                ? 'border-slate-200 bg-white text-rose-600 hover:border-rose-200 hover:bg-rose-50'
                                : 'border-slate-200 bg-white text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50'
                            }`}
                            title={delegate.isActive ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                          >
                            <Power size={14} />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(delegate.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all"
                            title="حذف المفوض"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          </div>
        </>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-rose-100">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-xl font-black text-center text-slate-800 mb-2">تأكيد الحذف</h3>
            <p className="text-center text-slate-500 font-medium mb-6">هل أنت متأكد من حذف هذا المفوض نهائيًا؟</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={proceedDelete}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-colors"
              >
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}

      {regenerateConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-[#f6f3ff] text-[#655ac1] rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#e5e1fe]">
              <RefreshCw size={28} />
            </div>
            <h3 className="text-xl font-black text-center text-slate-800 mb-2">إعادة إصدار رمز التفعيل</h3>
            <p className="text-center text-slate-500 font-medium mb-6">سيتم إنشاء رمز تفعيل جديد للمفوض. هل تريد المتابعة؟</p>
            <div className="flex gap-3">
              <button
                onClick={() => setRegenerateConfirmId(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={() => {
                  handleRegenerateOtp(regenerateConfirmId);
                  setRegenerateConfirmId(null);
                }}
                className="flex-1 py-3 bg-[#655ac1] hover:bg-[#655ac1] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-200 text-white rounded-xl font-bold transition-all"
              >
                نعم، أعد الإصدار
              </button>
            </div>
          </div>
        </div>
      )}

      {toggleConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${
              toggleConfirm.current
                ? 'bg-rose-50 text-rose-500 border-rose-100'
                : 'bg-emerald-50 text-emerald-500 border-emerald-100'
            }`}>
              <Power size={28} />
            </div>
            <h3 className="text-xl font-black text-center text-slate-800 mb-2">
              {toggleConfirm.current ? 'إيقاف حساب المفوض' : 'تفعيل حساب المفوض'}
            </h3>
            <p className="text-center text-slate-500 font-medium mb-6">
              {toggleConfirm.current
                ? 'سيتم إيقاف الحساب ومنع المفوض من الدخول حتى إعادة التفعيل. هل تريد المتابعة؟'
                : 'سيتم تفعيل الحساب والسماح للمفوض بالدخول مجددًا. هل تريد المتابعة؟'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setToggleConfirm(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={() => {
                  handleToggleActive(toggleConfirm.id, toggleConfirm.current);
                  setToggleConfirm(null);
                }}
                className={`flex-1 py-3 text-white rounded-xl font-bold transition-colors ${
                  toggleConfirm.current ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {toggleConfirm.current ? 'نعم، أوقف الحساب' : 'نعم، فعّل الحساب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-100">
              <RotateCcw size={28} />
            </div>
            <h3 className="text-xl font-black text-center text-slate-800 mb-2">إعادة تهيئة الحساب</h3>
            <p className="text-center text-slate-500 font-medium mb-6">
              سيتم حذف بيانات الدخول الحالية وإصدار رمز تفعيل جديد. هل تريد المتابعة؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setResetConfirmId(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={() => handleResetAccount(resetConfirmId)}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors"
              >
                نعم، أعد التهيئة
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
