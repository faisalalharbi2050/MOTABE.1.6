import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  KeyRound,
  ListChecks,
  MessageSquare,
  Search,
  ShieldCheck,
  Smartphone,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { Admin, Delegate, ModulePermission, PermissionLevel, Teacher } from '../../types';
import Toast, { useToast } from './Toast';
import {
  ACTIONS,
  ALL_ACTION_IDS,
  MODULES,
  createFullPermissions,
  getPermissionSummary,
  isFullPermissions,
} from './permissionsConfig';
import { logAction } from './auditLog';

const DELEGATES_STORAGE_KEY = 'motabe_delegates';

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

interface AddDelegateProps {
  teachers: Teacher[];
  admins: Admin[];
  onSimulateLogin?: () => void;
  onDelegateCreated?: () => void;
  onNavigate?: (tab: 'settings_teachers' | 'settings_admins') => void;
}

type StaffType = 'teacher' | 'admin';

const readDelegates = (): Delegate[] => {
  try {
    return JSON.parse(localStorage.getItem(DELEGATES_STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
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

export default function AddDelegate({
  teachers,
  admins,
  onSimulateLogin,
  onDelegateCreated,
  onNavigate,
}: AddDelegateProps) {
  const { toast, showToast } = useToast();
  const [selectedStaffType, setSelectedStaffType] = useState<StaffType>('teacher');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  const staff = selectedStaffType === 'teacher' ? teachers : admins;
  const selectedStaff = staff.find((item) => item.id === selectedStaffId);
  const filteredStaff = useMemo(() => {
    const query = staffSearch.trim().toLowerCase();
    return staff.filter((item) => !query || item.name.toLowerCase().includes(query) || item.phone?.includes(query));
  }, [staff, staffSearch]);

  const enabledMainModules = permissions.filter((permission) => !permission.moduleId.includes('_')).length;
  const isFullAccess = isFullPermissions(permissions);
  const permissionSummary = getPermissionSummary(permissions);

  const selectStaffType = (type: StaffType) => {
    setSelectedStaffType(type);
    setSelectedStaffId('');
    setStaffSearch('');
    setShowReview(false);
    setGeneratedOtp(null);
  };

  const handleToggleModule = (moduleId: string) => {
    const exists = permissions.find((permission) => permission.moduleId === moduleId);
    if (exists) {
      setPermissions((prev) =>
        prev.filter((permission) => permission.moduleId !== moduleId && !permission.moduleId.startsWith(`${moduleId}_`))
      );
      return;
    }

    setPermissions((prev) => [...prev, { moduleId, level: 'full', allowedActions: [] }]);
  };

  const handleToggleAll = (moduleId: string) => {
    const permission = permissions.find((item) => item.moduleId === moduleId);
    if (!permission) return;

    setPermissions((prev) =>
      prev.map((item) =>
        item.moduleId === moduleId
          ? { ...item, level: item.level === 'full' ? 'custom' : 'full', allowedActions: [] }
          : item
      )
    );
  };

  const handleActionToggle = (moduleId: string, actionId: typeof ALL_ACTION_IDS[number]) => {
    setPermissions((prev) => {
      const existing = prev.find((permission) => permission.moduleId === moduleId);
      if (!existing) return prev;

      const baseActions = existing.level === 'full' ? [...ALL_ACTION_IDS] : existing.allowedActions ?? [];
      const nextActions = baseActions.includes(actionId)
        ? baseActions.filter((action) => action !== actionId)
        : [...baseActions, actionId];
      const isAll = ALL_ACTION_IDS.every((id) => nextActions.includes(id));
      const level: PermissionLevel = isAll ? 'full' : 'custom';

      return prev.map((permission) =>
        permission.moduleId === moduleId
          ? { ...permission, level, allowedActions: isAll ? [] : nextActions }
          : permission
      );
    });
  };

  const resetForm = () => {
    setSelectedStaffType('teacher');
    setSelectedStaffId('');
    setStaffSearch('');
    setPermissions([]);
    setGeneratedOtp(null);
    setShowReview(false);
  };

  const handleGenerateOtp = () => {
    if (!selectedStaff) return;

    const existingDelegates = readDelegates();
    const duplicate = existingDelegates.find((delegate) => delegate.linkedStaffId === selectedStaff.id);

    if (duplicate) {
      showToast(
        duplicate.isPendingSetup
          ? `${selectedStaff.name} لديه رمز تفعيل معلق بالفعل ويمكن إعادة إصداره من إدارة المفوضين`
          : `${selectedStaff.name} لديه حساب مفوض مسجل بالفعل`,
        'warning'
      );
      setShowReview(false);
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const nextPermissions = isFullAccess ? createFullPermissions() : permissions;

    const newDelegate: Delegate = {
      id: crypto.randomUUID(),
      name: selectedStaff.name,
      phone: selectedStaff.phone,
      isPendingSetup: true,
      otp,
      role: isFullAccess ? 'delegate_full' : 'delegate_custom',
      customPermissions: nextPermissions,
      isActive: true,
      addedAt: new Date().toISOString(),
      linkedStaffId: selectedStaff.id,
      linkedStaffType: selectedStaffType,
    };

    localStorage.setItem(DELEGATES_STORAGE_KEY, JSON.stringify([...existingDelegates, newDelegate]));
    window.dispatchEvent(new Event('motabe:delegates-updated'));
    setGeneratedOtp(otp);
    setShowReview(false);

    logAction({
      actionType: 'create',
      action: 'إنشاء مفوض جديد',
      targetDelegateName: selectedStaff.name,
      details: isFullAccess ? 'صلاحية كاملة' : `صلاحية مخصصة - ${enabledMainModules} قسم`,
    });

    onDelegateCreated?.();
  };

  const handleShareViaWhatsApp = () => {
    if (!generatedOtp || !selectedStaff?.phone) {
      showToast('لا يوجد رقم جوال صالح لإرسال رمز التفعيل', 'warning');
      return;
    }

    const phone = normalizePhone(selectedStaff.phone);
    if (!phone) {
      showToast('رقم الجوال غير صالح لفتح واتساب', 'warning');
      return;
    }

    const message = encodeURIComponent(
      `مرحبًا ${selectedStaff.name}\nرمز الدخول المؤقت لتفعيل حساب المفوض هو:\n${generatedOtp}`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const ActionPills = ({ moduleId, indent = false }: { moduleId: string; indent?: boolean }) => {
    const permission = permissions.find((item) => item.moduleId === moduleId);
    if (!permission) return null;
    const isAllFull = permission.level === 'full';
    const activeIds = isAllFull ? ALL_ACTION_IDS : permission.allowedActions ?? [];

    return (
      <div className={`${indent ? 'mr-7' : ''} mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#655ac1]/10 bg-[#655ac1]/5 px-3 py-3`}>
        <button
          type="button"
          onClick={() => handleToggleAll(moduleId)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black transition-all ${
            isAllFull
              ? 'border-[#655ac1] bg-[#655ac1] text-white'
              : 'border-slate-200 bg-white text-[#655ac1] hover:border-[#655ac1]/40'
          }`}
        >
          <Check size={12} />
          الكل
        </button>

        {ACTIONS.map((action) => {
          const isSelected = activeIds.includes(action.id);
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleActionToggle(moduleId, action.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                isSelected
                  ? 'border-[#655ac1] bg-white text-[#655ac1] shadow-sm'
                  : 'border-slate-200 bg-white/70 text-slate-500 hover:border-[#655ac1]/30 hover:text-[#655ac1]'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-[#655ac1]' : 'bg-slate-300'}`} />
              {action.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
              <UserPlus size={20} className="text-[#655ac1]" />
              إضافة مفوض جديد
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-400">
              اختر معلمًا أو إداريًا، ثم امنحه صلاحية كاملة أو مخصصة قبل إصدار رمز التفعيل.
            </p>
          </div>
          {onSimulateLogin && (
            <button
              onClick={onSimulateLogin}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
            >
              دخول مفوض للتجربة
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-black text-slate-700">صفة المفوض</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'teacher', label: 'معلم', icon: Users, count: teachers.length },
                { id: 'admin', label: 'إداري', icon: UserCog, count: admins.length },
              ] as const).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => selectStaffType(option.id)}
                  className={`rounded-2xl border p-4 text-right transition-all ${
                    selectedStaffType === option.id
                      ? 'border-[#655ac1] bg-white text-[#655ac1] shadow-sm'
                      : 'border-slate-200 bg-white/70 text-slate-600 hover:border-[#655ac1]/30'
                  }`}
                >
                  <option.icon size={20} />
                  <p className="mt-3 font-black">{option.label}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{option.count} مسجل</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-700">اختيار الموظف</p>
              {staff.length === 0 && onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate(selectedStaffType === 'teacher' ? 'settings_teachers' : 'settings_admins')}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#655ac1] transition-all hover:bg-[#655ac1] hover:text-white"
                >
                  إضافة {selectedStaffType === 'teacher' ? 'معلم' : 'إداري'}
                </button>
              )}
            </div>

            <div className="relative mt-3">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={staffSearch}
                onChange={(event) => setStaffSearch(event.target.value)}
                placeholder="ابحث بالاسم أو الجوال..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-9 text-sm font-medium outline-none transition-all focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1]"
              />
            </div>

            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto custom-scrollbar">
              {filteredStaff.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <AlertCircle size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-500">
                    {staff.length === 0 ? 'لا توجد بيانات لهذه الفئة' : 'لا توجد نتائج مطابقة'}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    التفويض متاح للمعلمين والإداريين المسجلين فقط.
                  </p>
                </div>
              ) : (
                filteredStaff.map((item) => {
                  const isSelected = selectedStaffId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedStaffId(item.id);
                        setShowReview(false);
                        setGeneratedOtp(null);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-right transition-all ${
                        isSelected
                          ? 'border-[#655ac1] bg-[#655ac1]/6 text-[#655ac1]'
                          : 'border-slate-200 bg-white hover:border-[#655ac1]/25 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-800">{item.name}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-400">
                          <Smartphone size={11} />
                          <span dir="ltr">{item.phone || 'بدون رقم جوال'}</span>
                        </p>
                      </div>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                          isSelected ? 'border-[#655ac1] bg-[#655ac1] text-white' : 'border-slate-200 bg-white text-transparent'
                        }`}
                      >
                        <Check size={13} strokeWidth={3} />
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {selectedStaff && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#655ac1]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="font-black text-slate-800">{selectedStaff.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {selectedStaffType === 'teacher' ? 'معلم' : 'إداري'} ضمن بيانات المدرسة
                  </p>
                </div>
              </div>
              {!selectedStaff.phone && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
                  <AlertCircle size={14} />
                  يجب تسجيل رقم جوال قبل إصدار الرمز
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
                <ListChecks size={19} className="text-[#655ac1]" />
                صلاحيات الأقسام والإجراءات
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-400">
                فعّل القسم كاملاً، أو خصص إجراءاته عند الحاجة.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl border border-[#655ac1]/15 bg-[#655ac1]/6 px-3 py-2 text-xs font-black text-[#655ac1]">
                {permissionSummary}
              </span>
              <button
                type="button"
                onClick={() => setPermissions(createFullPermissions())}
                className="rounded-xl bg-[#655ac1] px-3 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5"
              >
                منح جميع الصلاحيات
              </button>
              <button
                type="button"
                onClick={() => setPermissions([])}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                إعادة الضبط
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-5 xl:grid-cols-2">
          {MODULES.map((module) => {
            const modulePermission = permissions.find((permission) => permission.moduleId === module.id);
            const isOn = !!modulePermission;

            return (
              <div
                key={module.id}
                className={`rounded-2xl border p-4 transition-all ${
                  isOn ? 'border-[#655ac1]/25 bg-[#fcfbff]' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-800">{module.name}</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">
                      {module.submodules?.length ? `${module.submodules.length} أقسام فرعية` : 'قسم مستقل'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleModule(module.id)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
                      isOn
                        ? 'border-[#655ac1] bg-[#655ac1] text-white shadow-md shadow-indigo-200'
                        : 'border-slate-200 bg-white text-transparent hover:border-[#655ac1]/40'
                    }`}
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                </div>

                {isOn && !module.submodules && <ActionPills moduleId={module.id} />}

                {isOn && module.submodules && (
                  <div className="mt-4 space-y-3">
                    {module.submodules.map((submodule) => {
                      const submoduleId = `${module.id}_${submodule.id}`;
                      const isSubOn = permissions.some((permission) => permission.moduleId === submoduleId);
                      return (
                        <div key={submoduleId} className="rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-slate-300" />
                              <p className="text-sm font-bold text-slate-700">{submodule.name}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleModule(submoduleId)}
                              className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 transition-all ${
                                isSubOn
                                  ? 'border-[#655ac1] bg-[#655ac1] text-white'
                                  : 'border-slate-200 bg-white text-transparent hover:border-[#655ac1]/40'
                              }`}
                            >
                              <Check size={12} strokeWidth={3} />
                            </button>
                          </div>
                          {isSubOn && <ActionPills moduleId={submoduleId} indent />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {enabledMainModules === 0 && (
          <div className="flex items-center gap-2 border-t border-amber-100 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700">
            <AlertCircle size={15} />
            فعّل قسمًا واحدًا على الأقل أو استخدم زر منح جميع الصلاحيات.
          </div>
        )}
      </div>

      {generatedOtp && selectedStaff && (
        <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 text-center shadow-sm">
          <CheckCircle2 size={42} className="mx-auto mb-3 text-emerald-600" />
          <h4 className="text-lg font-black text-slate-800">تم إنشاء المفوض بنجاح</h4>
          <p className="mt-1 text-sm font-medium text-slate-400">
            شارك رمز الدخول المؤقت مع {selectedStaff.name} لإكمال تفعيل الحساب.
          </p>
          <div className="mx-auto mt-5 inline-block rounded-2xl border-2 border-[#655ac1]/20 bg-[#655ac1]/6 px-8 py-4">
            <p className="text-xs font-black text-[#655ac1]">رمز الدخول المؤقت</p>
            <p className="mt-1 text-4xl font-black tracking-widest text-[#655ac1]">{generatedOtp}</p>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              onClick={handleShareViaWhatsApp}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-all hover:border-[#25D366] hover:bg-[#25D366]/5 hover:text-[#128C7E]"
            >
              <WhatsAppIcon size={16} />
              واتساب
            </button>
            <button
              onClick={() => showToast('تم فتح الرسائل النصية (محاكاة)', 'success')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-all hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              <MessageSquare size={16} />
              رسالة نصية
            </button>
            <button
              onClick={resetForm}
              className="rounded-xl bg-[#655ac1] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5"
            >
              إضافة مفوض آخر
            </button>
          </div>
        </div>
      )}

      {!generatedOtp && showReview && selectedStaff && (
        <div className="rounded-[2rem] border-2 border-[#655ac1]/25 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
            <ClipboardCheck size={22} className="text-[#655ac1]" />
            <h4 className="text-lg font-black text-slate-800">مراجعة قبل إصدار رمز التفعيل</h4>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-400">المفوض</p>
              <p className="mt-2 font-black text-slate-800">{selectedStaff.name}</p>
              <p className="mt-1 text-xs font-bold text-slate-400">{selectedStaffType === 'teacher' ? 'معلم' : 'إداري'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-400">الجوال</p>
              <p dir="ltr" className="mt-2 font-black text-slate-800">{selectedStaff.phone || 'غير مسجل'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-400">نوع الصلاحية</p>
              <p className="mt-2 font-black text-[#655ac1]">{isFullAccess ? 'صلاحية كاملة' : 'صلاحية مخصصة'}</p>
              <p className="mt-1 text-xs font-bold text-slate-400">{permissionSummary}</p>
            </div>
          </div>

          <div className="flex gap-3 border-t border-slate-100 px-6 py-5">
            <button
              onClick={() => setShowReview(false)}
              className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-700 transition-colors hover:bg-slate-200"
            >
              تعديل
            </button>
            <button
              onClick={handleGenerateOtp}
              disabled={enabledMainModules === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#655ac1] py-3 font-bold text-white shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <KeyRound size={18} />
              إصدار رمز التفعيل
            </button>
          </div>
        </div>
      )}

      {!generatedOtp && !showReview && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowReview(true)}
            disabled={!selectedStaffId || !selectedStaff?.phone || enabledMainModules === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#655ac1] px-8 py-3 font-bold text-white shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={18} />
            مراجعة وتأكيد
          </button>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
