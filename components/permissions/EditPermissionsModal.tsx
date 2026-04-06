import React, { useState } from 'react';
import { X, ListChecks, Check, AlertCircle, Save, Sparkles, ChevronLeft } from 'lucide-react';
import { Delegate, ModulePermission, PermissionLevel } from '../../types';
import { MODULES, ACTIONS, ALL_ACTION_IDS, createFullPermissions, isFullPermissions } from './permissionsConfig';

interface Props {
  delegate: Delegate;
  onSave: (updated: Partial<Delegate>) => void;
  onClose: () => void;
}

export default function EditPermissionsModal({ delegate, onSave, onClose }: Props) {
  const [permissions, setPermissions] = useState<ModulePermission[]>(
    delegate.customPermissions?.length ? delegate.customPermissions : (delegate.role === 'delegate_full' ? createFullPermissions() : [])
  );

  const handleToggleModule = (moduleId: string) => {
    const exists = permissions.find(permission => permission.moduleId === moduleId);
    if (exists) {
      setPermissions(prev => prev.filter(permission => permission.moduleId !== moduleId && !permission.moduleId.startsWith(`${moduleId}_`)));
      return;
    }

    setPermissions(prev => [...prev, { moduleId, level: 'full', allowedActions: [] }]);
  };

  const handleToggleAll = (moduleId: string) => {
    const permission = permissions.find(item => item.moduleId === moduleId);
    if (!permission) return;

    setPermissions(prev =>
      prev.map(item =>
        item.moduleId === moduleId
          ? { ...item, level: item.level === 'full' ? 'custom' : 'full', allowedActions: [] }
          : item
      )
    );
  };

  const handleActionToggle = (moduleId: string, actionId: typeof ALL_ACTION_IDS[number]) => {
    setPermissions(prev => {
      const existing = prev.find(permission => permission.moduleId === moduleId);
      if (!existing) return prev;

      const baseActions = existing.level === 'full' ? [...ALL_ACTION_IDS] : (existing.allowedActions ?? []);
      const newActions = baseActions.includes(actionId) ? baseActions.filter(action => action !== actionId) : [...baseActions, actionId];
      const isAll = ALL_ACTION_IDS.every(id => newActions.includes(id));
      const level: PermissionLevel = isAll ? 'full' : 'custom';

      return prev.map(permission =>
        permission.moduleId === moduleId
          ? { ...permission, level, allowedActions: isAll ? [] : newActions }
          : permission
      );
    });
  };

  const handleEnableAll = () => setPermissions(createFullPermissions());
  const handleResetAll = () => setPermissions([]);

  const enabledMainModules = permissions.filter(permission => !permission.moduleId.includes('_')).length;
  const isFullAccess = isFullPermissions(permissions);

  const handleSave = () => {
    onSave({
      role: isFullAccess ? 'delegate_full' : 'delegate_custom',
      customPermissions: permissions,
    });
  };

  const ActionsRow = ({ moduleId, indent = false }: { moduleId: string; indent?: boolean }) => {
    const permission = permissions.find(item => item.moduleId === moduleId);
    const isAllFull = permission?.level === 'full';
    const activeIds = isAllFull ? ALL_ACTION_IDS : (permission?.allowedActions ?? []);
    const toggleSize = indent ? 'w-5 h-5' : 'w-6 h-6';
    const checkSize = indent ? 10 : 12;

    return (
      <tr className="border-b border-slate-100">
        <td colSpan={2} className={`py-3 bg-[#655ac1]/5 border-r-4 border-[#655ac1]/40 ${indent ? 'pr-14 pl-6' : 'px-6'}`}>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="flex items-center gap-1.5 cursor-pointer group">
              <div
                onClick={() => handleToggleAll(moduleId)}
                className={`${toggleSize} rounded-full flex items-center justify-center border-2 transition-all cursor-pointer ${
                  isAllFull
                    ? 'bg-[#655ac1] border-[#655ac1] text-white shadow-sm shadow-indigo-200'
                    : 'border-slate-300 bg-white group-hover:border-[#655ac1] group-hover:scale-105'
                }`}
              >
                {isAllFull && <Check size={checkSize} strokeWidth={3} />}
              </div>
              <span className="text-xs font-black text-[#655ac1]">الكل</span>
            </label>
            <div className="w-px h-4 bg-slate-300 mx-1" />
            {ACTIONS.map(action => {
              const isSelected = activeIds.includes(action.id);
              const isMutedByAll = isAllFull && isSelected;
              return (
                <label key={action.id} className="flex items-center gap-1.5 cursor-pointer group">
                  <div
                    onClick={() => handleActionToggle(moduleId, action.id)}
                    className={`${toggleSize} rounded-full flex items-center justify-center border-2 transition-all cursor-pointer ${
                      isMutedByAll
                        ? 'border-[#b7aff3] bg-[#f3f1ff] text-[#655ac1]'
                        : isSelected
                        ? 'bg-[#655ac1] border-[#655ac1] text-white shadow-sm shadow-indigo-200'
                        : 'border-slate-300 bg-white group-hover:border-[#655ac1] group-hover:scale-105'
                    }`}
                  >
                    {isSelected && <Check size={checkSize} strokeWidth={3} />}
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-800">تعديل صلاحيات المفوض</h3>
            <p className="text-sm text-slate-500 mt-0.5">{delegate.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 bg-gradient-to-l from-[#655ac1] to-indigo-600 text-white flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-bold text-white/80 mb-1">لوحة الصلاحيات</p>
                <h4 className="font-black text-lg flex items-center gap-2">
                  <Sparkles size={16} />
                  تعديل صلاحيات الأقسام
                </h4>
                <p className="text-xs text-white/80 mt-1">فعّل القسم ليُمنح كاملاً، ثم عدّل إجراءاته عند الحاجة فقط</p>
              </div>
              <div className="bg-white/12 border border-white/15 rounded-2xl px-3.5 py-2.5 min-w-[155px] backdrop-blur-sm">
                <p className="text-xs font-bold text-white/70">الحالة الحالية</p>
                <p className="text-sm font-black mt-1">{isFullAccess ? 'صلاحية كاملة' : 'صلاحية مخصصة'}</p>
                <p className="text-xs text-white/80 mt-1">{enabledMainModules} قسم مفعّل</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ListChecks size={15} className="text-[#655ac1]" />
                <span className="font-bold text-slate-700 text-sm">الأقسام والإجراءات</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isFullAccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#e5e1fe] text-[#655ac1]'
                }`}>
                  {isFullAccess ? 'كامل فعلياً' : `${enabledMainModules} مفعّل`}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleEnableAll}
                  className="text-xs font-bold text-white bg-[#655ac1] hover:bg-indigo-600 px-2.5 py-1 rounded-full transition-colors shadow-sm"
                >
                  منح جميع الصلاحيات
                </button>
                <button
                  onClick={handleResetAll}
                  className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-full transition-colors"
                >
                  إعادة الضبط
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] text-right">
                <thead>
                  <tr className="border-b-2 border-slate-100 bg-white">
                    <th className="px-5 py-2.5 text-xs font-bold text-slate-400 text-right">القسم</th>
                    <th className="w-20 py-2.5 px-3 text-center text-xs font-bold text-slate-400">تفعيل</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map(module => {
                    const isOn = !!permissions.find(permission => permission.moduleId === module.id);
                    return (
                      <React.Fragment key={module.id}>
                        <tr className={`border-b border-slate-100 transition-colors ${isOn ? 'bg-[#655ac1]/5' : 'hover:bg-slate-50/60'}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">{module.name}</span>
                              {module.submodules && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-400">
                                  <ChevronLeft size={11} className="text-slate-400" />
                                  {module.submodules.length} فرعية
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleToggleModule(module.id)}
                              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mx-auto transition-all ${
                                isOn ? 'bg-[#655ac1] border-[#655ac1] text-white shadow-md shadow-indigo-200' : 'border-slate-200 bg-white hover:border-[#655ac1]/50 hover:scale-110'
                              }`}
                            >
                              {isOn && <Check size={13} strokeWidth={3} />}
                            </button>
                          </td>
                        </tr>
                        {isOn && !module.submodules && <ActionsRow moduleId={module.id} />}
                        {isOn && module.submodules && module.submodules.map(submodule => {
                          const submoduleId = `${module.id}_${submodule.id}`;
                          const isSubOn = !!permissions.find(permission => permission.moduleId === submoduleId);

                          return (
                            <React.Fragment key={submoduleId}>
                              <tr className={`border-b border-slate-100 transition-colors ${isSubOn ? 'bg-blue-50/20' : 'bg-slate-50/50 hover:bg-slate-50'}`}>
                                <td className="pr-9 pl-5 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 border-r-2 border-b-2 border-slate-300 rounded-br-sm shrink-0" />
                                    <span className="text-sm text-slate-600">{submodule.name}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => handleToggleModule(submoduleId)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto transition-all ${
                                      isSubOn ? 'bg-[#655ac1] border-[#655ac1] text-white shadow-sm' : 'border-slate-200 bg-white hover:border-[#655ac1]/50 hover:scale-110'
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
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-[#655ac1] hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
          >
            <Save size={17} /> حفظ التعديلات
          </button>
        </div>
      </div>
    </div>
  );
}
