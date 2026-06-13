import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronLeft,
  ClipboardList,
  Clock,
  KeyRound,
  ListChecks,
  Lock,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { Admin, Delegate, MessageComposerDraft, ModulePermission, SchoolInfo, Teacher } from '../../types';
import ManageDelegates from './ManageDelegates';
import ActionLogs from './ActionLogs';
import {
  MODULES,
  createFullPermissions,
  getPermissionSummary,
  isFullPermissions,
} from './permissionsConfig';
import { logAction } from './auditLog';

interface RolePermissionsProps {
  teachers: Teacher[];
  admins: Admin[];
  schoolInfo?: SchoolInfo;
  onNavigate?: (tab: 'settings_teachers' | 'settings_admins') => void;
  onPrepareMessageDraft?: (draft: MessageComposerDraft) => void;
}

type StageId = 'build' | 'activate' | 'manage' | 'logs';
type StaffType = 'teacher' | 'admin';

const DELEGATES_STORAGE_KEY = 'motabe_delegates';
const STAGE_STORAGE_KEY = 'motabe:permissions:stage';

const readDelegates = (): Delegate[] => {
  try {
    return JSON.parse(localStorage.getItem(DELEGATES_STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone?: 'primary' | 'green' | 'amber' | 'rose' | 'slate';
}) => {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Icon size={22} className="mt-0.5 shrink-0 text-[#655ac1]" />
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
};

const RolePermissions: React.FC<RolePermissionsProps> = ({ teachers, admins, schoolInfo, onNavigate, onPrepareMessageDraft }) => {
  const [stage, setStage] = useState<StageId>(() => {
    try {
      const saved = localStorage.getItem(STAGE_STORAGE_KEY);
      if (saved === 'build' || saved === 'activate' || saved === 'manage' || saved === 'logs') {
        return saved as StageId;
      }
    } catch {}
    return 'build';
  });

  // ─── Delegation flow state ───
  const [selectedStaffType, setSelectedStaffType] = useState<StaffType>('teacher');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);

  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const refreshDelegates = useCallback(() => setDelegates(readDelegates()), []);

  useEffect(() => {
    refreshDelegates();
    const handleStorage = () => refreshDelegates();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('motabe:delegates-updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('motabe:delegates-updated', handleStorage);
    };
  }, [refreshDelegates]);

  useEffect(() => {
    try { localStorage.setItem(STAGE_STORAGE_KEY, stage); } catch {}
  }, [stage]);

  const summary = useMemo(() => {
    const pending = delegates.filter((delegate) => delegate.isPendingSetup).length;
    const active = delegates.filter((delegate) => delegate.isActive && !delegate.isPendingSetup).length;
    const inactive = delegates.filter((delegate) => !delegate.isActive).length;
    return { pending, active, inactive };
  }, [delegates]);

  const staff = selectedStaffType === 'teacher' ? teachers : admins;
  const selectedStaff = staff.find((item) => item.id === selectedStaffId);
  const filteredStaff = useMemo(() => {
    const query = staffSearch.trim().toLowerCase();
    return staff.filter((item) => !query || item.name.toLowerCase().includes(query) || item.phone?.includes(query));
  }, [staff, staffSearch]);

  const enabledMainModules = permissions.filter((permission) => !permission.moduleId.includes('_')).length;
  const isFullAccess = isFullPermissions(permissions);
  const permissionSummary = getPermissionSummary(permissions);

  // ─── Stage completion ───
  const pendingDelegates = useMemo(
    () => delegates.filter((delegate) => delegate.isPendingSetup),
    [delegates]
  );

  const selectComplete = !!selectedStaff && !!selectedStaff.phone;
  const permissionsComplete = enabledMainModules > 0;
  const buildComplete = selectComplete && permissionsComplete;

  const selectStaffType = (type: StaffType) => {
    setSelectedStaffType(type);
    setSelectedStaffId('');
    setStaffSearch('');
  };

  const handleToggleModule = (moduleId: string) => {
    const exists = permissions.some((permission) => permission.moduleId === moduleId);
    if (exists) {
      setPermissions((prev) =>
        prev.filter((permission) => permission.moduleId !== moduleId && !permission.moduleId.startsWith(`${moduleId}_`))
      );
      return;
    }
    // Turning a section on: include the section itself, and auto-select all its submodules.
    const parent = MODULES.find((module) => module.id === moduleId);
    setPermissions((prev) => {
      const ids = new Set(prev.map((permission) => permission.moduleId));
      const additions: ModulePermission[] = [{ moduleId, level: 'full', allowedActions: [] }];
      parent?.submodules?.forEach((submodule) => {
        const submoduleId = `${parent.id}_${submodule.id}`;
        if (!ids.has(submoduleId)) additions.push({ moduleId: submoduleId, level: 'full', allowedActions: [] });
      });
      return [...prev, ...additions.filter((addition) => !ids.has(addition.moduleId))];
    });
  };

  const resetBuild = () => {
    setSelectedStaffType('teacher');
    setSelectedStaffId('');
    setStaffSearch('');
    setPermissions([]);
  };

  const assignAndProceed = () => {
    if (!selectedStaff) return;

    const existingDelegates = readDelegates();
    const duplicate = existingDelegates.find((delegate) => delegate.linkedStaffId === selectedStaff.id);
    if (duplicate) {
      showToast(`${selectedStaff.name} لديه حساب مفوّض مسجّل بالفعل — أدِره من تبويب المفوضين`, 'warning');
      return;
    }

    const nextPermissions = isFullAccess ? createFullPermissions() : permissions;
    const newDelegate: Delegate = {
      id: crypto.randomUUID(),
      name: selectedStaff.name,
      phone: selectedStaff.phone,
      isPendingSetup: true,
      role: isFullAccess ? 'delegate_full' : 'delegate_custom',
      customPermissions: nextPermissions,
      isActive: true,
      addedAt: new Date().toISOString(),
      linkedStaffId: selectedStaff.id,
      linkedStaffType: selectedStaffType,
      linkedStaffTitle: selectedStaffType === 'admin'
        ? ((selectedStaff as Admin).role || 'إداري')
        : 'معلم',
    };

    localStorage.setItem(DELEGATES_STORAGE_KEY, JSON.stringify([...existingDelegates, newDelegate]));
    window.dispatchEvent(new Event('motabe:delegates-updated'));

    logAction({
      actionType: 'create',
      action: 'إسناد صلاحيات لمفوّض',
      targetDelegateName: selectedStaff.name,
    });

    refreshDelegates();
    resetBuild();
    setStage('activate');
    showToast(`تم إسناد الصلاحيات لـ ${newDelegate.name} — أصدر رمز التفعيل`, 'success');
  };

  const handleIssueOtp = (delegate: Delegate) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const all = readDelegates().map((item) =>
      item.id === delegate.id ? { ...item, otp, isPendingSetup: true } : item
    );
    localStorage.setItem(DELEGATES_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event('motabe:delegates-updated'));

    logAction({
      actionType: 'regenerate_otp',
      action: delegate.otp ? 'إعادة إصدار رمز التفعيل' : 'إصدار رمز التفعيل',
      targetDelegateName: delegate.name,
    });

    refreshDelegates();
    showToast(`تم إصدار رمز التفعيل لـ ${delegate.name}`, 'success');
  };

  const handleSendActivation = (delegate: Delegate) => {
    if (!delegate.otp || !delegate.phone) {
      showToast('لا يوجد رقم جوال صالح لإرسال رمز التفعيل', 'warning');
      return;
    }
    if (!onPrepareMessageDraft) {
      showToast('تعذّر فتح صفحة الرسائل', 'error');
      return;
    }

    const isTeacher = delegate.linkedStaffType === 'teacher';
    const draft: MessageComposerDraft = {
      id: `delegate-activation-${delegate.id}-${Date.now()}`,
      title: 'رمز تفعيل حساب المفوّض',
      group: isTeacher ? 'teachers' : 'admins',
      recipients: [{
        id: delegate.linkedStaffId || delegate.id,
        name: delegate.name,
        phone: delegate.phone,
        role: isTeacher ? 'teacher' : 'admin',
      }],
      content: [
        `المكرم/ ${delegate.name}`,
        `رمز الدخول المؤقت لتفعيل حسابك كمفوّض في المنصة هو: ${delegate.otp}`,
        `يُرجى استخدامه لإكمال إنشاء الحساب.`,
      ].join('\n'),
      channel: 'whatsapp',
      source: 'general',
      senderRole: 'تفعيل صلاحيات المفوّض',
    };

    onPrepareMessageDraft(draft);
  };

  const stages: Array<{
    id: StageId; n: number; label: string; hint: string;
    icon: React.ComponentType<any>; complete: boolean;
  }> = [
    { id: 'build', n: 1, label: 'المفوّض وصلاحياته', hint: 'اختر الموظف ، وحدّد صلاحياته.', icon: UserPlus, complete: buildComplete },
    { id: 'activate', n: 2, label: 'التفعيل والمشاركة', hint: 'إصدار رمز ومشاركته', icon: KeyRound, complete: false },
    { id: 'manage', n: 3, label: 'إدارة المفوضين', hint: 'تعديل - تعطيل - حذف المفوّض', icon: Users, complete: false },
    { id: 'logs', n: 4, label: 'سجل الإجراءات', hint: 'تابع العمليات المنفذّة', icon: ClipboardList, complete: false },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-20 dir-rtl animate-in fade-in duration-500" dir="rtl">
      {/* ══════ Header Card ══════ */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/70">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="flex items-center gap-3 text-xl font-black text-slate-800">
              <Lock size={36} strokeWidth={1.8} className="text-[#655ac1]" />
              الصلاحيات والتفويض
            </h3>
            <p className="mr-12 mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
              امنح صلاحياتك للمعلمين أو الإداريين بخطوات سهلة، مع تتبّع واضح لكل إجراء.
            </p>
          </div>
        </div>
      </div>

      {/* ══════ Stepper ══════ */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-stretch gap-1 overflow-x-auto custom-scrollbar">
          {stages.map((s, i) => {
            const isActive = stage === s.id;
            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => setStage(s.id)}
                  className={`flex min-w-[180px] flex-1 items-center gap-3 rounded-2xl px-4 py-3 text-right transition-all ${
                    isActive ? 'bg-[#655ac1] shadow-md shadow-[#655ac1]/20' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="relative shrink-0">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-all ${
                      isActive ? 'border-white bg-white' : 'border-slate-200 bg-transparent'
                    }`}>
                      <s.icon size={17} className="text-[#655ac1]" />
                    </span>
                    {s.complete && (
                      <span className="absolute -top-1.5 -left-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                        <Check size={9} strokeWidth={4} />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-black leading-tight ${isActive ? 'text-white' : 'text-slate-800'}`}>
                      {s.label}
                    </span>
                    <span className={`mt-0.5 block truncate text-[11px] font-bold ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                      {s.hint}
                    </span>
                  </span>
                </button>
                {i < stages.length - 1 && (
                  <div className="flex shrink-0 items-center px-2">
                    <ChevronLeft size={20} className="text-slate-300" strokeWidth={2.5} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ══════ Stage Content ══════ */}
      <div className="min-h-[400px]">
        {/* ─── Stage 1: Delegate + permissions (combined, side-by-side) ─── */}
        {stage === 'build' && (
          <div className="space-y-5">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
                <UserPlus size={20} className="text-[#655ac1]" />
                اختيار المفوّض وصلاحياته
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-400">
                اختر الموظف ، وحدّد صلاحياته.
              </p>
            </div>

            {selectedStaff && !selectedStaff.phone && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
                <AlertCircle size={16} className="shrink-0" />
                هذا الموظف لا يملك رقم جوال — سجّل رقم جواله أولاً لإصدار الرمز.
              </div>
            )}

            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr]">
                {/* ─── RIGHT: staff picker ─── */}
                <div className="space-y-4 overflow-y-auto bg-slate-50/40 p-5 custom-scrollbar lg:h-[640px] lg:border-l lg:border-slate-100">
                  <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
                    {([
                      { id: 'teacher', label: 'معلم', icon: Users },
                      { id: 'admin', label: 'إداري', icon: UserCog },
                    ] as const).map((option) => {
                      const active = selectedStaffType === option.id;
                      return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => selectStaffType(option.id)}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
                          active
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <option.icon size={16} />
                        {option.label}
                      </button>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={staffSearch}
                      onChange={(event) => setStaffSearch(event.target.value)}
                      placeholder="ابحث بالاسم أو رقم الجوال"
                      className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#8779fb]/20"
                    />
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <span className="text-base font-black text-slate-800">{selectedStaffType === 'teacher' ? 'المعلمون' : 'الإداريون'}</span>
                      {staff.length === 0 && onNavigate ? (
                        <button
                          type="button"
                          onClick={() => onNavigate(selectedStaffType === 'teacher' ? 'settings_teachers' : 'settings_admins')}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-[#655ac1] transition-all hover:bg-[#655ac1] hover:text-white"
                        >
                          إضافة {selectedStaffType === 'teacher' ? 'معلم' : 'إداري'}
                        </button>
                      ) : (
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-[#655ac1]">{filteredStaff.length}</span>
                      )}
                    </div>
                    <div className="max-h-[500px] space-y-1 overflow-y-auto p-2 custom-scrollbar">
                      {filteredStaff.length === 0 ? (
                        <div className="px-3 py-10 text-center">
                          <AlertCircle size={26} className="mx-auto mb-2 text-slate-300" />
                          <p className="text-xs font-bold text-slate-500">
                            {staff.length === 0 ? 'لا توجد بيانات لهذه الفئة' : 'لا توجد نتائج مطابقة'}
                          </p>
                        </div>
                      ) : (
                        filteredStaff.map((item) => {
                          const isSelected = selectedStaffId === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSelectedStaffId(item.id)}
                              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-right transition-all ${
                                isSelected ? 'border-slate-300 bg-white shadow-sm' : 'border-transparent hover:bg-slate-50'
                              }`}
                            >
                              <span className="min-w-0">
                                <span className={`block truncate text-sm font-black ${isSelected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{item.name}</span>
                                <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                  <Smartphone size={14} className="text-[#655ac1]" />
                                  <span dir="ltr">{item.phone || 'بدون رقم جوال'}</span>
                                </span>
                              </span>
                              <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                isSelected ? 'border-[#655ac1] bg-[#655ac1] text-white' : 'border-slate-300 text-transparent'
                              }`}>
                                <Check size={12} strokeWidth={3.5} />
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* ─── LEFT: permissions ─── */}
                <div className="flex min-w-0 flex-col lg:h-[640px]">
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                      <h4 className="flex items-center gap-2 text-base font-black text-slate-800">
                        <ListChecks size={18} className="text-[#655ac1]" />
                        صلاحيات الأقسام
                      </h4>
                      <p className="mt-0.5 truncate text-xs font-bold text-slate-400">
                        {selectedStaff ? `${permissionSummary} — ${selectedStaff.name}` : 'حدّد الأقسام التي يصل إليها المفوّض'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPermissions(isFullAccess ? [] : createFullPermissions())}
                        disabled={!selectedStaff}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-black transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                          isFullAccess
                            ? 'border-[#655ac1] bg-[#655ac1] text-white'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-[#655ac1] hover:bg-[#655ac1] hover:text-white'
                        }`}
                      >
                        {isFullAccess ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                      </button>
                    </div>
                  </div>

                  {!selectedStaff ? (
                    <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                        <Lock size={26} />
                      </div>
                      <p className="mt-4 font-black text-slate-700">اختر الموظف أولاً</p>
                      <p className="mt-1 text-xs font-bold text-slate-400">ستظهر الأقسام القابلة للتفويض هنا فور اختيار الموظف.</p>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-2 overflow-y-auto p-4 custom-scrollbar">
                      {MODULES.map((module) => {
                        const isOn = permissions.some((permission) => permission.moduleId === module.id);
                        const hasSubs = !!module.submodules?.length;
                        return (
                          <div
                            key={module.id}
                            className={`rounded-xl border bg-white transition-all ${
                              isOn ? 'border-slate-300 shadow-sm ring-1 ring-[#655ac1]/15' : 'border-slate-200'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleModule(module.id)}
                              className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-right"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-black text-slate-700">{module.name}</span>
                                {hasSubs && (
                                  <span className="block text-[11px] font-bold text-slate-400">{module.submodules!.length} أقسام فرعية</span>
                                )}
                              </span>
                              <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                isOn ? 'border-[#655ac1] bg-[#655ac1] text-white' : 'border-slate-300 text-transparent'
                              }`}>
                                <Check size={12} strokeWidth={3.5} />
                              </span>
                            </button>

                            {isOn && hasSubs && (
                              <div className="space-y-1.5 border-t border-slate-100 px-3 py-2.5">
                                {module.submodules!.map((submodule) => {
                                  const submoduleId = `${module.id}_${submodule.id}`;
                                  const isSubOn = permissions.some((permission) => permission.moduleId === submoduleId);
                                  return (
                                    <button
                                      key={submoduleId}
                                      type="button"
                                      onClick={() => handleToggleModule(submoduleId)}
                                      className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-right transition-all ${
                                        isSubOn ? 'border-slate-300 shadow-sm ring-1 ring-[#655ac1]/15' : 'border-slate-200'
                                      }`}
                                    >
                                      <span className="text-[13px] font-bold text-slate-600">{submodule.name}</span>
                                      <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                        isSubOn ? 'border-[#655ac1] bg-[#655ac1] text-white' : 'border-slate-300 text-transparent'
                                      }`}>
                                        <Check size={10} strokeWidth={3.5} />
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Card footer: primary action */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-4">
                <p className="text-xs font-bold text-slate-400">
                  {!selectedStaff
                    ? 'اختر موظفًا لبدء التفويض.'
                    : !selectedStaff.phone
                      ? 'سجّل رقم جوال الموظف أولاً لإصدار الرمز.'
                      : !permissionsComplete
                        ? 'فعّل قسمًا واحدًا على الأقل لإكمال هذه المرحلة.'
                        : 'جاهز للانتقال إلى إصدار رمز التفعيل.'}
                </p>
                <button
                  onClick={assignAndProceed}
                  disabled={!buildComplete}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#655ac1] px-8 py-3 font-bold text-white shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  إسناد ومتابعة للتفعيل
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Stage 2: Activate & share (per-delegate cards) ─── */}
        {stage === 'activate' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
                  <KeyRound size={20} className="text-[#655ac1]" />
                  التفعيل والمشاركة
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-400">
                  لكل مفوّض أُسندت له صلاحيات، أصدر رمز التفعيل وشاركه معه.
                </p>
              </div>
              <button
                onClick={() => setStage('build')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#655ac1] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5"
              >
                <UserPlus size={16} />
                إسناد مفوّض جديد
              </button>
            </div>

            {pendingDelegates.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                  <KeyRound size={26} />
                </div>
                <p className="mt-4 font-black text-slate-700">لا يوجد مفوّضون بانتظار التفعيل</p>
                <p className="mt-1 text-sm font-medium text-slate-400">أسند الصلاحيات لموظف من المرحلة الأولى ليظهر هنا.</p>
                <button
                  onClick={() => setStage('build')}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#655ac1] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5"
                >
                  <UserPlus size={16} />
                  بدء الإسناد
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pendingDelegates.map((delegate) => {
                  const isFull = isFullPermissions(delegate.customPermissions) || delegate.role === 'delegate_full';
                  return (
                    <div key={delegate.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center text-[#655ac1]">
                            <ShieldCheck size={26} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-800">{delegate.name}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                              <Smartphone size={12} className="text-[#655ac1]" />
                              <span dir="ltr">{delegate.phone || 'بدون رقم جوال'}</span>
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-[#655ac1]">
                          {isFull ? 'صلاحية كاملة' : 'صلاحية مخصصة'}
                        </span>
                      </div>

                      {delegate.otp ? (
                        <>
                          <div className="mt-5 flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <div className="text-center">
                              <p className="text-[11px] font-black text-slate-500">رمز الدخول المؤقت</p>
                              <p className="mt-1 text-3xl font-black tracking-[0.3em] text-[#655ac1]">{delegate.otp}</p>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                            <button
                              onClick={() => handleSendActivation(delegate)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
                            >
                              <Send size={15} />
                              إرسال التفعيل
                            </button>
                            <button
                              onClick={() => handleIssueOtp(delegate)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-500 transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
                            >
                              <RefreshCw size={15} />
                              إعادة إصدار الرمز
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {!delegate.phone && (
                            <div className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
                              <AlertCircle size={14} />
                              يجب تسجيل رقم جوال قبل إصدار الرمز
                            </div>
                          )}
                          <button
                            onClick={() => handleIssueOtp(delegate)}
                            disabled={!delegate.phone}
                            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#655ac1] px-6 py-3 font-bold text-white shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <KeyRound size={18} />
                            إصدار رمز التفعيل
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Stage 3: Manage delegates ─── */}
        {stage === 'manage' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="إجمالي المفوضين" value={delegates.length} icon={Users} />
              <StatCard label="مفوّض نشط" value={summary.active} icon={ShieldCheck} tone="green" />
              <StatCard label="بانتظار التفعيل" value={summary.pending} icon={Clock} tone="amber" />
              <StatCard label="مفوّض موقوف" value={summary.inactive} icon={Lock} tone="rose" />
            </div>
            <ManageDelegates onDelegatesChange={refreshDelegates} admins={admins} />
          </div>
        )}

        {/* ─── Stage 4: Action logs ─── */}
        {stage === 'logs' && (
          <div className="space-y-5">
            <ActionLogs schoolInfo={schoolInfo} />
          </div>
        )}
      </div>

      {/* ══════ Unified Toast ══════ */}
      {toast && (
        <div className="fixed top-20 left-1/2 z-[9999] -translate-x-1/2 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 rounded-2xl border px-6 py-3.5 text-sm font-bold shadow-xl
            ${toast.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : ''}
            ${toast.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : ''}
            ${toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : ''}
          `}>
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'warning' && <AlertTriangle size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default RolePermissions;
