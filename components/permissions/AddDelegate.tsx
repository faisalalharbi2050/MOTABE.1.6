import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Shield, ShieldCheck, Smartphone, KeyRound, AlertCircle, CheckCircle2, Check, MessageSquare, ListChecks, ChevronDown, Search as SearchIcon } from 'lucide-react';
import { Teacher, Admin, Delegate, ModulePermission, PermissionLevel } from '../../types';
import Toast, { useToast } from './Toast';
import { MODULES as MOCK_MODULES, ACTIONS as AVAILABLE_ACTIONS, ALL_ACTION_IDS, createFullPermissions, isFullPermissions } from './permissionsConfig';
import { logAction } from './auditLog';

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

interface AddDelegateProps {
  onSimulateLogin?: () => void;
}

export default function AddDelegate({ onSimulateLogin }: AddDelegateProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const { toast, showToast } = useToast();
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedStaffType, setSelectedStaffType] = useState<'teacher' | 'admin'>('teacher');
  const [customPermissions, setCustomPermissions] = useState<ModulePermission[]>([]);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const staffDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('school_assignment_v4');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.teachers) setTeachers(data.teachers);
        if (data.admins) setAdmins(data.admins);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(event.target as Node)) {
        setShowStaffDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleModule = (moduleId: string) => {
    const exists = customPermissions.find(permission => permission.moduleId === moduleId);
    if (exists) {
      setCustomPermissions(prev =>
        prev.filter(permission => permission.moduleId !== moduleId && !permission.moduleId.startsWith(`${moduleId}_`))
      );
      return;
    }

    setCustomPermissions(prev => [...prev, { moduleId, level: 'full', allowedActions: [] }]);
  };

  const handleToggleAll = (moduleId: string) => {
    const permission = customPermissions.find(item => item.moduleId === moduleId);
    if (!permission) return;

    setCustomPermissions(prev =>
      prev.map(item =>
        item.moduleId === moduleId
          ? { ...item, level: item.level === 'full' ? 'custom' : 'full', allowedActions: [] }
          : item
      )
    );
  };

  const handleActionToggle = (moduleId: string, actionId: typeof ALL_ACTION_IDS[number]) => {
    setCustomPermissions(prev => {
      const existing = prev.find(permission => permission.moduleId === moduleId);
      if (!existing) return prev;

      const baseActions = existing.level === 'full' ? [...ALL_ACTION_IDS] : (existing.allowedActions || []);
      const newActions = baseActions.includes(actionId)
        ? baseActions.filter(action => action !== actionId)
        : [...baseActions, actionId];

      const isAll = ALL_ACTION_IDS.every(id => newActions.includes(id));
      const level: PermissionLevel = isAll ? 'full' : 'custom';

      return prev.map(permission =>
        permission.moduleId === moduleId
          ? { ...permission, level, allowedActions: isAll ? [] : newActions }
          : permission
      );
    });
  };

  const handleEnableAll = () => setCustomPermissions(createFullPermissions());
  const handleResetAll = () => setCustomPermissions([]);

  const currentStaffArray = selectedStaffType === 'teacher' ? teachers : admins;
  const selectedStaffInfo = currentStaffArray.find(staff => staff.id === selectedStaffId);
  const filteredStaff = currentStaffArray.filter(staff => staff.name.includes(staffSearch.trim()));
  const enabledMainModules = customPermissions.filter(permission => !permission.moduleId.includes('_')).length;
  const isFullAccess = isFullPermissions(customPermissions);
  const permissionSummaryLabel = isFullAccess ? 'صلاحية كاملة' : 'صلاحية مخصصة';

  const handleGenerateOtp = () => {
    if (!selectedStaffInfo) return;

    const existingDelegates = localStorage.getItem('motabe_delegates');
    const delegateList: Delegate[] = existingDelegates ? JSON.parse(existingDelegates) : [];
    const duplicate = delegateList.find(delegate => delegate.linkedStaffId === selectedStaffInfo.id);

    if (duplicate) {
      showToast(
        duplicate.isPendingSetup
          ? `${selectedStaffInfo.name} لديه رمز تفعيل معلق بالفعل ويمكنك إعادة إصداره من إدارة المفوضين`
          : `${selectedStaffInfo.name} لديه حساب مفوض نشط بالفعل`,
        'warning'
      );
      setShowReview(false);
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    const newDelegate: Delegate = {
      id: crypto.randomUUID(),
      name: selectedStaffInfo.name,
      phone: selectedStaffInfo.phone,
      isPendingSetup: true,
      otp,
      role: isFullAccess ? 'delegate_full' : 'delegate_custom',
      customPermissions,
      isActive: true,
      addedAt: new Date().toISOString(),
      linkedStaffId: selectedStaffInfo.id,
      linkedStaffType: selectedStaffType,
    };

    localStorage.setItem('motabe_delegates', JSON.stringify([...delegateList, newDelegate]));

    logAction({
      actionType: 'create',
      action: 'إنشاء مفوض جديد',
      targetDelegateName: selectedStaffInfo.name,
      details: isFullAccess ? 'صلاحية كاملة' : `صلاحية مخصصة — ${enabledMainModules} قسم`,
    });
  };

  const ActionsRow = ({ moduleId, indent = false }: { moduleId: string; indent?: boolean }) => {
    const permission = customPermissions.find(item => item.moduleId === moduleId);
    const isAllFull = permission?.level === 'full';
    const activeIds = isAllFull ? ALL_ACTION_IDS : (permission?.allowedActions || []);

    return (
      <tr className="border-b border-slate-100">
        <td
          colSpan={2}
          className={`py-3 bg-[#655ac1]/5 border-r-4 border-[#655ac1]/40 ${indent ? 'pr-14 pl-6' : 'px-6'}`}
        >
          <div className="flex flex-wrap gap-2 items-center">
            <label className="flex items-center gap-1.5 cursor-pointer group">
              <div
                onClick={() => handleToggleAll(moduleId)}
                className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all cursor-pointer ${
                  isAllFull ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 bg-white group-hover:border-[#655ac1]'
                }`}
              >
                {isAllFull && <Check size={11} strokeWidth={3} />}
              </div>
              <span className="text-xs font-black text-[#655ac1]">الكل</span>
            </label>

            <div className="w-px h-4 bg-slate-300 mx-1" />

            {AVAILABLE_ACTIONS.map(action => {
              const isSelected = activeIds.includes(action.id);
              return (
                <label key={action.id} className="flex items-center gap-1.5 cursor-pointer group">
                  <div
                    onClick={() => handleActionToggle(moduleId, action.id)}
                    className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all cursor-pointer ${
                      isSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 bg-white group-hover:border-[#655ac1]'
                    }`}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </div>
                  <span className="text-xs font-bold text-slate-700">{action.label}</span>
                </label>
              );
            })}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserPlus size={20} className="text-[#655ac1]" />
            إضافة مفوض جديد
          </h3>
          {onSimulateLogin && (
            <button
              onClick={onSimulateLogin}
              className="bg-white border text-sm border-slate-200 text-slate-600 hover:text-[#655ac1] hover:border-[#655ac1] hover:bg-white px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              دخول مفوض (للتجربة)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">صفة المفوض</label>
            <div className="relative" ref={typeDropdownRef}>
              <button
                type="button"
                onClick={() => setShowTypeDropdown(prev => !prev)}
                className={`w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-2 rounded-xl font-bold text-slate-700 transition-all shadow-sm ${
                  showTypeDropdown ? 'border-[#655ac1] ring-2 ring-[#655ac1]/15' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <span>{selectedStaffType === 'teacher' ? 'معلم' : 'إداري'}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showTypeDropdown && (
                <div className="absolute z-30 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                  {([
                    { id: 'teacher', label: 'معلم', hint: 'عرض قائمة المعلمين فقط' },
                    { id: 'admin', label: 'إداري', hint: 'عرض قائمة الإداريين فقط' },
                  ] as const).map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSelectedStaffType(option.id);
                        setSelectedStaffId('');
                        setGeneratedOtp(null);
                        setShowReview(false);
                        setStaffSearch('');
                        setShowTypeDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-right transition-colors flex items-center justify-between gap-3 ${
                        selectedStaffType === option.id ? 'bg-[#655ac1]/6 text-[#655ac1]' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-sm">{option.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{option.hint}</p>
                      </div>
                      {selectedStaffType === option.id && (
                        <span className="w-6 h-6 rounded-full bg-[#655ac1] text-white flex items-center justify-center shrink-0">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">اختيار الموظف</label>
            <div className="relative" ref={staffDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  if (currentStaffArray.length === 0) return;
                  setShowStaffDropdown(prev => !prev);
                  setStaffSearch('');
                }}
                className={`w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-2 rounded-xl font-bold text-slate-700 transition-all shadow-sm ${
                  showStaffDropdown ? 'border-[#655ac1] ring-2 ring-[#655ac1]/15' : 'border-slate-100 hover:border-slate-200'
                } ${currentStaffArray.length === 0 ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className={`truncate ${selectedStaffInfo ? 'text-slate-700' : 'text-slate-400'}`}>
                  {selectedStaffInfo ? selectedStaffInfo.name : '-- اختر من القائمة --'}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showStaffDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showStaffDropdown && (
                <div className="absolute z-30 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="p-3 border-b border-slate-100">
                    <div className="relative">
                      <SearchIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={staffSearch}
                        onChange={event => setStaffSearch(event.target.value)}
                        placeholder="ابحث عن موظف..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1]"
                      />
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto p-2">
                    {filteredStaff.length > 0 ? (
                      filteredStaff.map(staff => {
                        const isSelected = selectedStaffId === staff.id;
                        return (
                          <button
                            key={staff.id}
                            type="button"
                            onClick={() => {
                              setSelectedStaffId(staff.id);
                              setGeneratedOtp(null);
                              setShowReview(false);
                              setShowStaffDropdown(false);
                              setStaffSearch('');
                            }}
                            className={`w-full px-3 py-3 rounded-xl text-right transition-colors flex items-center justify-between gap-3 ${
                              isSelected ? 'bg-[#655ac1]/6 text-[#655ac1]' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-sm truncate">{staff.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                <Smartphone size={11} />
                                <span dir="ltr">{staff.phone || 'بدون رقم'}</span>
                              </p>
                            </div>
                            {isSelected && (
                              <span className="w-6 h-6 rounded-full bg-[#655ac1] text-white flex items-center justify-center shrink-0">
                                <Check size={13} strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-6 text-center text-sm text-slate-400">
                        لا توجد نتائج مطابقة
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {currentStaffArray.length === 0 && (
              <p className="text-xs text-rose-500 mt-1">لا يوجد موظفون مسجلون حالياً.</p>
            )}
          </div>
        </div>

        {selectedStaffInfo && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center border border-slate-300 bg-white">
                <ShieldCheck size={22} className="text-[#655ac1]" />
              </div>
              <div>
                <p className="font-bold text-slate-800">{selectedStaffInfo.name}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <Smartphone size={14} />
                  {selectedStaffInfo.phone || 'لا يوجد رقم مسجل'}
                </p>
              </div>
            </div>
            {!selectedStaffInfo.phone && (
              <div className="text-sm text-rose-500 flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                <AlertCircle size={16} />
                يجب تسجيل رقم جوال للموظف
              </div>
            )}
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-l from-slate-50 to-white px-6 py-5 border-b border-slate-200">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <ListChecks size={16} className="text-[#655ac1]" />
                  صلاحيات الأقسام والإجراءات
                </h4>
                <p className="text-xs text-slate-400 mt-1">فعّل القسم ليصبح متاحاً بالكامل، ثم عدّل إجراءاته فقط إذا أردت تخصيصاً أدق</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 shadow-sm ${
                  isFullAccess
                    ? 'border-emerald-200 bg-emerald-50/80'
                    : 'border-[#655ac1]/15 bg-[#655ac1]/6'
                }`}>
                  <p className={`text-[11px] font-bold ${
                    isFullAccess ? 'text-emerald-700' : 'text-[#655ac1]'
                  }`}>
                    حالة التفعيل
                  </p>
                  <p className={`text-sm font-black ${
                    isFullAccess ? 'text-emerald-700' : 'text-slate-800'
                  }`}>
                    {isFullAccess ? 'كامل فعلياً' : `${enabledMainModules} قسم مفعّل`}
                  </p>
                </div>
                <button
                  onClick={handleEnableAll}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-all hover:-translate-y-0.5 hover:border-[#655ac1] hover:bg-[#655ac1] hover:text-white hover:shadow-md hover:shadow-indigo-200"
                >
                  <ShieldCheck size={14} />
                  منح جميع الصلاحيات
                </button>
                <button
                  onClick={handleResetAll}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  <AlertCircle size={14} />
                  إعادة الضبط
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-right">
              <thead>
                <tr className="border-b-2 border-slate-100 bg-white">
                  <th className="px-6 py-3 text-sm font-bold text-slate-400 text-right">القسم</th>
                  <th className="w-24 py-3 px-4 text-center text-sm font-bold text-slate-400">تفعيل</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_MODULES.map(module => {
                  const permission = customPermissions.find(item => item.moduleId === module.id);
                  const isOn = !!permission;

                  return (
                    <React.Fragment key={module.id}>
                      <tr className={`border-b border-slate-100 transition-colors ${isOn ? 'bg-[#655ac1]/5' : 'hover:bg-slate-50/60'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{module.name}</span>
                            {module.submodules && (
                              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {module.submodules.length} فرعية
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleToggleModule(module.id)}
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mx-auto transition-all duration-150 ${
                              isOn
                                ? 'bg-[#655ac1] border-[#655ac1] text-white shadow-md shadow-indigo-200'
                                : 'border-slate-200 bg-white hover:border-[#655ac1]/50 hover:scale-110'
                            }`}
                          >
                            {isOn && <Check size={14} strokeWidth={3} />}
                          </button>
                        </td>
                      </tr>

                      {isOn && !module.submodules && <ActionsRow moduleId={module.id} />}

                      {isOn && module.submodules && module.submodules.map(submodule => {
                        const submoduleId = `${module.id}_${submodule.id}`;
                        const isSubOn = !!customPermissions.find(item => item.moduleId === submoduleId);

                        return (
                          <React.Fragment key={submoduleId}>
                            <tr className={`border-b border-slate-100 transition-colors ${isSubOn ? 'bg-blue-50/20' : 'bg-slate-50/50 hover:bg-slate-50'}`}>
                              <td className="pr-10 pl-6 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 border-r-2 border-b-2 border-slate-300 rounded-br-sm shrink-0" />
                                  <span className="text-sm font-medium text-slate-600">{submodule.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => handleToggleModule(submoduleId)}
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto transition-all duration-150 ${
                                    isSubOn
                                      ? 'bg-[#655ac1] border-[#655ac1] text-white shadow-sm'
                                      : 'border-slate-200 bg-white hover:border-[#655ac1]/50 hover:scale-110'
                                  }`}
                                >
                                  {isSubOn && <Check size={10} strokeWidth={3} />}
                                </button>
                              </td>
                            </tr>
                            {isSubOn && <ActionsRow moduleId={submoduleId} indent />}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {enabledMainModules === 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border-t border-amber-100 px-5 py-3">
              <AlertCircle size={15} className="shrink-0" />
              لم يتم تفعيل أي قسم بعد. فعّل قسماً واحداً على الأقل أو استخدم زر "منح جميع الصلاحيات"
            </div>
          )}
        </div>

        {generatedOtp && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm animate-fade-in">
            <div className="mx-auto mb-4 flex items-center justify-center text-[#655ac1]">
              <CheckCircle2 size={40} />
            </div>
            <h4 className="mb-2 text-lg font-bold text-slate-800">تم إنشاء المفوض بنجاح!</h4>
            <p className="mb-6 font-medium text-slate-500">الرجاء مشاركة رمز الدخول المؤقت مع الموظف لتفعيل الحساب.</p>

            <div className="mb-6 inline-block rounded-2xl border border-slate-300 bg-white px-8 py-4 shadow-sm">
              <p className="mb-2 text-sm font-bold text-[#655ac1]">رمز الدخول المؤقت (OTP)</p>
              <p className="text-4xl font-black tracking-widest text-[#655ac1]">{generatedOtp}</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-center gap-3 flex-wrap">
                <button
                  onClick={() => showToast('تم تجهيز واتساب للإرسال (محاكاة)', 'success')}
                  className="bg-white border-2 border-slate-200 text-slate-700 hover:border-[#25D366] hover:bg-[#25D366]/5 px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2"
                >
                  <WhatsAppIcon size={18} />
                  مشاركة عبر الواتساب
                </button>
                <button
                  onClick={() => showToast('تم فتح تطبيق الرسائل النصية (محاكاة)', 'success')}
                  className="bg-white border-2 border-slate-200 text-slate-700 hover:border-[#007AFF] hover:bg-[#007AFF]/5 px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2"
                >
                  <MessageSquare size={18} className="text-[#007AFF]" />
                  مشاركة عبر الرسائل النصية
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSelectedStaffId('');
                    setGeneratedOtp(null);
                    setCustomPermissions([]);
                  }}
                  className="bg-[#655ac1] border border-[#655ac1] text-white hover:bg-[#655ac1] px-5 py-2.5 rounded-xl font-bold transition-colors"
                >
                  إضافة مفوض آخر
                </button>
              </div>
            </div>
          </div>
        )}

        {!generatedOtp && showReview && selectedStaffInfo && (
          <div className="mt-6 rounded-2xl border-2 border-[#655ac1]/30 overflow-hidden animate-fade-in">
            <div className="bg-white px-6 py-4 flex items-center gap-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-300 bg-white shrink-0">
                <CheckCircle2 size={18} className="text-[#655ac1]" />
              </div>
              <h4 className="font-bold text-slate-800 text-lg">مراجعة قبل التأكيد</h4>
            </div>

            <div className="p-6 space-y-4 bg-white">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center border border-slate-300 bg-white">
                    <ShieldCheck size={22} className="text-[#655ac1]" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{selectedStaffInfo.name}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <Smartphone size={14} />
                      {selectedStaffInfo.phone || 'لا يوجد رقم مسجل'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full shrink-0 ${
                  isFullAccess ? 'bg-[#655ac1] text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {permissionSummaryLabel}
                </span>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-500 mb-3">الأقسام المفعّلة:</p>
                {enabledMainModules === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                    <AlertCircle size={16} className="shrink-0" />
                    لم يتم تفعيل أي قسم — يرجى العودة وتحديد الصلاحيات
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customPermissions
                      .filter(permission => !permission.moduleId.includes('_'))
                      .map(permission => {
                        const module = MOCK_MODULES.find(item => item.id === permission.moduleId);
                        const subPermissions = customPermissions.filter(item =>
                          item.moduleId.startsWith(`${permission.moduleId}_`)
                        );

                        const actionsLabel = (item: ModulePermission) =>
                          item.level === 'full'
                            ? 'جميع الإجراءات'
                            : item.allowedActions?.length
                              ? item.allowedActions.map(actionId => AVAILABLE_ACTIONS.find(action => action.id === actionId)?.label).join('، ')
                              : 'لا إجراءات';

                        return (
                          <div key={permission.moduleId} className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-800">{module?.name}</span>
                              {!module?.submodules && (
                                <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                                  {actionsLabel(permission)}
                                </span>
                              )}
                            </div>
                            {subPermissions.length > 0 && (
                              <div className="mt-2 space-y-1 pr-3 border-r-2 border-[#655ac1]/30">
                                {subPermissions.map(subPermission => {
                                  const subName = module?.submodules?.find(submodule =>
                                    `${permission.moduleId}_${submodule.id}` === subPermission.moduleId
                                  )?.name;

                                  return (
                                    <div key={subPermission.moduleId} className="flex items-center justify-between gap-2 text-xs flex-wrap">
                                      <span className="text-slate-600 font-medium">{subName}</span>
                                      <span className="text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-lg">
                                        {actionsLabel(subPermission)}
                                      </span>
                                    </div>
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

            <div className="flex gap-3 px-6 pb-6 bg-white">
              <button
                onClick={() => setShowReview(false)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                تعديل
              </button>
              <button
                onClick={() => {
                  handleGenerateOtp();
                  setShowReview(false);
                }}
                disabled={enabledMainModules === 0}
                className="flex-1 px-4 py-3 bg-[#655ac1] hover:bg-[#655ac1] text-white rounded-xl font-bold transition-colors shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <KeyRound size={18} />
                تأكيد وإصدار رمز التفعيل
              </button>
            </div>
          </div>
        )}

        {!generatedOtp && !showReview && (
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowReview(true)}
              disabled={!selectedStaffId || !selectedStaffInfo?.phone}
              className="px-8 py-3 bg-[#655ac1] hover:bg-indigo-600 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CheckCircle2 size={20} />
              مراجعة وتأكيد
            </button>
          </div>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  );
}
