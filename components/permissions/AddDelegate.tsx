import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { UserPlus, Shield, Smartphone, KeyRound, AlertCircle, CheckCircle2, Check, MessageSquare, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Teacher, Admin, Delegate, RoleType, ModulePermission, PermissionLevel } from '../../types';

// Official WhatsApp Icon SVG
const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

// Mock data to use if not provided
const MOCK_MODULES = [
  { 
    id: 'settings', 
    name: 'الإعدادات العامة',
    submodules: [
      { id: 'settings_basic', name: 'البيانات الأساسية' },
      { id: 'settings_subjects', name: 'المواد' },
      { id: 'settings_classes', name: 'الفصول' },
      { id: 'settings_students', name: 'الطلاب' },
      { id: 'settings_teachers', name: 'المعلمون' },
      { id: 'settings_admins', name: 'الإداريون' }
    ]
  },
  { 
    id: 'schedule', 
    name: 'الجدول المدرسي',
    submodules: [
      { id: 'manual', name: 'إسناد المواد' },
      { id: 'classes_waiting', name: 'الحصص والانتظار' },
      { id: 'supervision', name: 'الإشراف اليومي' },
      { id: 'duty', name: 'المناوبة اليومية' }
    ]
  },
  { id: 'daily_waiting', name: 'الانتظار اليومي' },
  { id: 'messages', name: 'الرسائل' },
  { id: 'subscriptions', name: 'الاشتراك والفوترة' },
  { id: 'support', name: 'الدعم الفني' }
];

const AVAILABLE_ACTIONS: { id: 'add' | 'edit' | 'delete' | 'print' | 'export', label: string }[] = [
  { id: 'add', label: 'إضافة' },
  { id: 'edit', label: 'تعديل' },
  { id: 'delete', label: 'حذف' },
  { id: 'print', label: 'طباعة' },
  { id: 'export', label: 'تصدير' }
];

interface AddDelegateProps {
  onSimulateLogin?: () => void;
}

export default function AddDelegate({ onSimulateLogin }: AddDelegateProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedStaffType, setSelectedStaffType] = useState<'teacher' | 'admin'>('teacher');
  const [role, setRole] = useState<RoleType>('delegate_full');
  
  const [customPermissions, setCustomPermissions] = useState<ModulePermission[]>([]);
  
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  
  useEffect(() => {
    // Load staff from local storage
    try {
      const saved = localStorage.getItem('school_assignment_v4');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.teachers) setTeachers(data.teachers);
        if (data.admins) setAdmins(data.admins);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handlePermissionChange = (moduleId: string, level: PermissionLevel | 'none') => {
    if (level === 'none') {
      setCustomPermissions(prev => prev.filter(p => p.moduleId !== moduleId));
    } else {
      setCustomPermissions(prev => {
        const existing = prev.find(p => p.moduleId === moduleId);
        if (existing) {
          return prev.map(p => p.moduleId === moduleId ? { ...p, level } : p);
        }
        return [...prev, { moduleId, level, allowedActions: [] }];
      });
    }
  };

  const handleActionToggle = (moduleId: string, actionId: 'add' | 'edit' | 'delete' | 'print' | 'export') => {
    setCustomPermissions(prev => {
      const existing = prev.find(p => p.moduleId === moduleId);
      if (!existing) return prev;
      
      const currentActions = existing.allowedActions || [];
      const newActions = currentActions.includes(actionId) 
        ? currentActions.filter(a => a !== actionId)
        : [...currentActions, actionId];
        
      return prev.map(p => p.moduleId === moduleId ? { ...p, allowedActions: newActions } : p);
    });
  };

  const currentStaffArray = selectedStaffType === 'teacher' ? teachers : admins;
  const selectedStaffInfo = currentStaffArray.find(s => s.id === selectedStaffId);

  const handleGenerateOtp = () => {
    if (!selectedStaffInfo) return;
    
    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    
    // In a real app, save to backend here
    const newDelegate: Delegate = {
      id: crypto.randomUUID(),
      name: selectedStaffInfo.name,
      phone: selectedStaffInfo.phone,
      isPendingSetup: true,
      otp: otp,
      role: role,
      customPermissions: role === 'delegate_custom' ? customPermissions : undefined,
      isActive: true,
      addedAt: new Date().toISOString(),
      linkedStaffId: selectedStaffInfo.id,
      linkedStaffType: selectedStaffType
    };
    
    // Save locally for demo
    const existingDelegatesStr = localStorage.getItem('motabe_delegates');
    const existingDelegates = existingDelegatesStr ? JSON.parse(existingDelegatesStr) : [];
    localStorage.setItem('motabe_delegates', JSON.stringify([...existingDelegates, newDelegate]));
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
              className="bg-white border text-sm border-slate-200 text-slate-600 hover:text-[#655ac1] hover:border-[#655ac1]/30 hover:bg-[#655ac1]/5 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              محاكاة دخول مفوض (للتجربة)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">نوع الموظف</label>
            <select
              value={selectedStaffType}
              onChange={(e) => {
                setSelectedStaffType(e.target.value as any);
                setSelectedStaffId('');
                setGeneratedOtp(null);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1] transition-all"
            >
              <option value="teacher">معلم</option>
              <option value="admin">إداري</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">اختيار الموظف</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1] transition-all"
            >
              <option value="">-- اختر من القائمة --</option>
              {currentStaffArray.map(staff => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
            </select>
            {currentStaffArray.length === 0 && (
              <p className="text-xs text-rose-500 mt-1">لا يوجد موظفين مسجلين حالياً.</p>
            )}
          </div>
        </div>

        {selectedStaffInfo && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-slate-200">
                <Shield size={24} className="text-slate-400" />
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

        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-700 mb-4">نوع الصلاحية</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setRole('delegate_full')}
              className={`p-4 rounded-xl border-2 text-right transition-all flex items-start gap-4 ${
                role === 'delegate_full' 
                  ? 'border-[#655ac1] bg-indigo-50/50' 
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`mt-1 rounded-full p-1 ${role === 'delegate_full' ? 'bg-[#655ac1] text-white' : 'bg-slate-100 text-slate-400'}`}>
                <Shield size={18} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">صلاحية كاملة</h4>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">منح كافة الصلاحيات على النظام</p>
              </div>
            </button>
            
            <button
              onClick={() => setRole('delegate_custom')}
              className={`p-4 rounded-xl border-2 text-right transition-all flex items-start gap-4 ${
                role === 'delegate_custom' 
                  ? 'border-[#655ac1] bg-indigo-50/50' 
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`mt-1 rounded-full p-1 ${role === 'delegate_custom' ? 'bg-[#655ac1] text-white' : 'bg-slate-100 text-slate-400'}`}>
                <KeyRound size={18} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">صلاحية مخصصة</h4>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">منح صلاحية أقسام معينة مع التحكم بمستوى الوصول</p>
              </div>
            </button>
          </div>
        </div>

        {/* Custom Permissions Selector */}
        {role === 'delegate_custom' && (
          <div className="mb-8 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h4 className="font-bold text-slate-800">تخصيص الصلاحيات والأقسام</h4>
            </div>
            <div className="divide-y divide-slate-200">
              {MOCK_MODULES.map(module => {
                const currentPermission = customPermissions.find(p => p.moduleId === module.id)?.level || 'none';
                
                return (
                  <div key={module.id} className="p-4 px-6 border-b last:border-0 border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <span className="font-bold text-slate-700">{module.name}</span>
                      <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm text-sm">
                        <button
                          onClick={() => handlePermissionChange(module.id, 'none')}
                          className={`px-4 py-2 rounded-md font-medium transition-all ${
                            currentPermission === 'none' 
                              ? 'bg-slate-100 text-slate-700 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          لا يوجد وصول
                        </button>
                        <button
                          onClick={() => handlePermissionChange(module.id, 'custom_edit')}
                          className={`px-4 py-2 rounded-md font-medium transition-all ${
                            currentPermission === 'custom_edit' 
                              ? 'bg-blue-50 text-blue-700 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          تحكم مخصص
                        </button>
                        <button
                          onClick={() => handlePermissionChange(module.id, 'full')}
                          className={`px-4 py-2 rounded-md font-medium transition-all ${
                            currentPermission === 'full' 
                              ? 'bg-[#655ac1] text-white shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          تحكم كامل
                        </button>
                      </div>
                    </div>
                    
                    {currentPermission === 'custom_edit' && !module.submodules && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4 bg-slate-100/50 p-4 rounded-xl">
                        <div className="w-full text-sm font-bold text-slate-600 mb-1">تحديد الإجراءات المسموحة:</div>
                        {AVAILABLE_ACTIONS.map(action => {
                          const isSelected = customPermissions.find(p => p.moduleId === module.id)?.allowedActions?.includes(action.id);
                          return (
                            <label key={action.id} className="flex items-center gap-2 cursor-pointer group bg-white px-3 py-2 rounded-lg border border-slate-200 hover:border-[#655ac1] transition-all shadow-sm">
                              <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors border ${isSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 bg-white group-hover:border-[#655ac1]'}`}>
                                {isSelected && <Check size={14} strokeWidth={3} />}
                              </div>
                              <span className="text-sm font-bold text-slate-700">{action.label}</span>
                              <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={!!isSelected}
                                onChange={() => handleActionToggle(module.id, action.id)}
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                    
                    {(currentPermission === 'custom_edit' || currentPermission === 'full') && module.submodules && (
                       <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                         <div className="text-sm font-bold text-slate-600 mb-2">تخصيص الأقسام الفرعية:</div>
                         {module.submodules.map(submodule => {
                           const subId = `${module.id}_${submodule.id}`;
                           const currentSubPermission = customPermissions.find(p => p.moduleId === subId)?.level || (currentPermission === 'full' ? 'full' : 'none');
                           
                           return (
                             <div key={subId} className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col gap-3">
                               <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                 <span className="text-sm font-bold text-slate-700 pr-2 border-r-2 border-[#655ac1]">
                                   {submodule.name}
                                 </span>
                                 
                                 <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm text-xs">
                                   <button
                                     onClick={() => handlePermissionChange(subId, 'none')}
                                     className={`px-3 py-1.5 rounded-md font-medium transition-all ${currentSubPermission === 'none' ? 'bg-slate-100 text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                   >لا يوجد وصول</button>
                                   <button
                                     onClick={() => handlePermissionChange(subId, 'custom_edit')}
                                     className={`px-3 py-1.5 rounded-md font-medium transition-all ${currentSubPermission === 'custom_edit' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                   >تحكم مخصص</button>
                                   <button
                                      onClick={() => handlePermissionChange(subId, 'full')}
                                      className={`px-3 py-1.5 rounded-md font-medium transition-all ${currentSubPermission === 'full' ? 'bg-[#655ac1] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                   >تحكم كامل</button>
                                 </div>
                               </div>
                               
                               {currentSubPermission === 'custom_edit' && (
                                   <div className="w-full mt-2 pt-2 border-t border-t-slate-200 flex flex-wrap gap-2 pr-2 border-r-2 border-r-[#655ac1] bg-white p-2 rounded-lg">
                                     {AVAILABLE_ACTIONS.map(action => {
                                        const isSelected = customPermissions.find(p => p.moduleId === subId)?.allowedActions?.includes(action.id);
                                        return (
                                          <label key={action.id} className="flex items-center gap-1.5 cursor-pointer group bg-slate-50 px-2 py-1.5 rounded-md border border-slate-200 hover:border-[#655ac1] transition-all">
                                            <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${isSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 bg-white group-hover:border-[#655ac1]'}`}>
                                              {isSelected && <Check size={10} strokeWidth={3} />}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{action.label}</span>
                                            <input type="checkbox" className="hidden" checked={!!isSelected} onChange={() => handleActionToggle(subId, action.id)} />
                                          </label>
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
                );
              })}
            </div>
          </div>
        )}

        {/* OTP Generation Result */}
        {generatedOtp && (
          <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="font-bold text-emerald-800 text-lg mb-2">تم إنشاء المفوض بنجاح!</h4>
            <p className="text-emerald-700 mb-6 font-medium">الرجاء مشاركة رمز الدخول المؤقت مع الموظف لتفعيل الحساب.</p>
            
            <div className="bg-white inline-block px-8 py-4 rounded-xl border-2 border-emerald-200 shadow-sm mb-6">
              <p className="text-sm text-slate-500 mb-2 font-bold">رمز الدخول المؤقت (OTP)</p>
              <p className="text-4xl font-black text-emerald-800 tracking-widest">{generatedOtp}</p>
            </div>
            
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => {
                  showToast('تم تجهيز واتساب للإرسال (محاكاة)', 'success');
                }}
                className="bg-white border-2 border-slate-200 text-slate-700 hover:border-[#25D366] hover:bg-[#25D366]/5 px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                <WhatsAppIcon size={18} />
                مشاركة عبر الواتساب
              </button>
              <button 
                onClick={() => {
                  showToast('تم فتح تطبيق الرسائل النصية (محاكاة)', 'success');
                }}
                className="bg-white border-2 border-slate-200 text-slate-700 hover:border-[#007AFF] hover:bg-[#007AFF]/5 px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                <MessageSquare size={18} className="text-[#007AFF]" />
                مشاركة عبر الرسائل النصية
              </button>
              <button 
                onClick={() => {
                  setSelectedStaffId('');
                  setGeneratedOtp(null);
                  setCustomPermissions([]);
                }}
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-6 py-2.5 rounded-xl font-bold transition-colors"
              >
                إضافة مفوض آخر
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        {!generatedOtp && (
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleGenerateOtp}
              disabled={!selectedStaffId || !selectedStaffInfo?.phone}
              className="px-8 py-3 bg-[#655ac1] hover:bg-indigo-600 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <KeyRound size={20} />
              حفظ المفوض وإصدار رمز التفعيل (OTP)
            </button>
          </div>
        )}

      </div>
      
      {/* Toast Notification */}
      {toast && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed z-[9999] pointer-events-none w-full" style={{ top: '82px', left: '50%', transform: 'translateX(-50%)', animation: 'toastIn 0.3s ease-out' }}>
           <style>{`@keyframes toastIn { from { opacity:0; top:64px; } to { opacity:1; top:82px; } }`}</style>
           <div className={`mx-auto max-w-md w-full shadow-lg rounded-2xl p-4 flex items-center gap-3 border pointer-events-auto
             ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
             toast.type === 'error'   ? 'bg-rose-50 border-rose-200 text-rose-800' :
             'bg-amber-50 border-amber-200 text-amber-800'}`}
           >
             <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center
               ${toast.type === 'success' ? 'bg-emerald-100' :
               toast.type === 'error'   ? 'bg-rose-100' : 'bg-amber-100'}`}
             >
               {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-600" />}
               {toast.type === 'error'   && <AlertCircle  size={20} className="text-rose-600" />}
               {toast.type === 'warning' && <AlertTriangle size={20} className="text-amber-600" />}
             </div>
            <p className="font-bold text-sm flex-1 leading-relaxed">{toast.message}</p>
           </div>
        </div>,
        document.body
      )}
    </div>
  );
}
