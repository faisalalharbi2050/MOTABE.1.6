import React, { useState, useRef, useEffect } from 'react';
import { Admin } from '../../../types';
import { Zap, Plus, X, UserCog, Edit, Trash2, Printer, ChevronDown, Check, Save, AlertTriangle, Briefcase, ChevronUp, Users, Shield } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';

interface Step7Props {
  admins: Admin[];
  setAdmins: React.Dispatch<React.SetStateAction<Admin[]>>;
}

const ROLES = [
  'وكيل',
  'موجه طلابي',
  'رائد النشاط',
  'محضر المختبر',
  'مساعد معلم',
  'مساعد إداري',
  'أمين مصادر',
  'موجه صحي',
  'مسجل المعلومات',
  'سكرتير',
  'حارس'
];

const AGENT_TYPES = [
  'وكيل الشؤون التعليمية',
  'وكيل شؤون الطلاب',
  'وكيل الشؤون المدرسية'
];

interface AgentTypeSelectorProps {
    admin: Admin;
    onToggle: (adminId: string, type: string) => void;
}

const AgentTypeSelector: React.FC<AgentTypeSelectorProps> = ({ admin, onToggle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedCount = admin.agentType?.length || 0;

    return (
        <div className="relative" ref={wrapperRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-2 border rounded-lg text-sm flex justify-between items-center ${selectedCount > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
            >
                <span className="truncate">
                    {selectedCount === 0 ? 'اختر الصفة' : `${selectedCount} محدد`}
                </span>
                <ChevronDown size={14} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-100 z-50 p-2 space-y-1">
                    {AGENT_TYPES.map(type => (
                        <div 
                            key={type} 
                            onClick={() => onToggle(admin.id, type)}
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-xs font-bold transition-colors ${admin.agentType?.includes(type) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${admin.agentType?.includes(type) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                {admin.agentType?.includes(type) && <Check size={10} className="text-white" />}
                            </div>
                            {type}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const Step7Admins: React.FC<Step7Props> = ({ admins, setAdmins }) => {
  // State
  const [addCount, setAddCount] = useState<number>(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Bulk Edit / Inline Edit State
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const adminsSnapshot = useRef<string>("");


  // Helpers
  const handleEditToggle = () => {
    if (!isEditMode) {
      // Enter Edit Mode
      adminsSnapshot.current = JSON.stringify(admins);
      setIsEditMode(true);
      setHasChanges(false);
    } else {
      // Save Changes
      setIsEditMode(false);
      setHasChanges(false);
      // Optional: Add a success notification here if needed
    }
  };

  const cancelEdit = () => {
    if (adminsSnapshot.current) {
        setAdmins(JSON.parse(adminsSnapshot.current));
    }
    setIsEditMode(false);
    setHasChanges(false);
  }

  const handleAddAdmins = () => {
    if (addCount < 1) return;
    
    const newAdmins: Admin[] = Array.from({ length: addCount }).map((_, i) => ({
      id: `admin-${Date.now()}-${i}`,
      name: '',
      role: ROLES[0], // Default 'وكيل'
      phone: '',
      waitingQuota: 0,
      sortIndex: (admins.length > 0 ? Math.max(...admins.map(a => a.sortIndex || 0)) : 0) + 1 + i,
      agentType: []
    }));

    setAdmins(prev => [...prev, ...newAdmins]);
    setIsAddModalOpen(false);
    setAddCount(1);
    
    // Automatically enter edit mode if not already
    if (!isEditMode) {
        handleEditToggle();
    }
  };

  const removeAdmin = (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا السجل؟")) {
      setAdmins(prev => prev.filter(a => a.id !== id));
      setHasChanges(true); // Technically a change
    }
  };

  const updateAdmin = (id: string, field: keyof Admin, value: any) => {
    setAdmins(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    setHasChanges(true);
  };

  const toggleAgentType = (adminId: string, type: string) => {
    setAdmins(prev => prev.map(a => {
      if (a.id === adminId) {
        const currentTypes = a.agentType || [];
        const newTypes = currentTypes.includes(type)
          ? currentTypes.filter(t => t !== type)
          : [...currentTypes, type];
        return { ...a, agentType: newTypes };
      }
      return a;
    }));
    setHasChanges(true);
  };


  const handlePrint = () => {
    window.print();
  };
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 print:pb-0 print:space-y-4">
      
      {/* ══════ Header (Hidden in Print) ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6 print:hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>
          
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <UserCog size={36} strokeWidth={1.8} className="text-[#655ac1]" />
             إدارة الإداريين
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إضافة وتعديل بيانات الإداريين</p>
      </div>

       {/* ══════ Print Header (Visible only in Print) ══════ */}
       <div className="hidden print:block text-center mb-8 border-b-2 border-slate-900 pb-4">
          <h2 className="text-2xl font-black text-slate-900 mb-2">قائمة الكادر الإداري</h2>
          <div className="flex justify-center gap-8 text-sm font-bold text-slate-600">
             <span>إجمالي الإداريين: {admins.length}</span>
             <span>التاريخ: {new Date().toLocaleDateString('ar-SA')}</span>
          </div>
      </div>

      {/* ══════ Action Bar (Hidden in Print) ══════ */}
      <div className="flex flex-wrap items-center gap-3 mb-6 print:hidden">
        
        <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#655ac1] text-white rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 hover:bg-[#5448a8] transition-all hover:scale-105 active:scale-95"
        >
            <Plus size={20} />
            إضافة إداري
        </button>


        <div className="flex-1"></div>

        {/* Edit / Save Toggle */}
        <div className="flex items-center gap-2">
            {isEditMode && hasChanges && (
                 <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 animate-in fade-in">
                    <AlertTriangle size={12} />
                    يوجد تعديلات غير محفوظة
                </div>
            )}
            
            {isEditMode ? (
                <>
                    <button 
                        onClick={cancelEdit}
                        className="flex items-center gap-2 px-4 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all"
                    >
                        <X size={20} />
                        إلغاء
                    </button>
                    <button 
                        onClick={handleEditToggle}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white border border-emerald-500 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95"
                    >
                        <Save size={20} />
                        حفظ التعديلات
                    </button>
                </>
            ) : (
                <button 
                    onClick={handleEditToggle}
                    disabled={admins.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:border-[#655ac1] hover:text-[#655ac1] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                    <Edit size={20} />
                    تعديل
                </button>
            )}
        </div>

        <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:border-slate-300 transition-all hover:scale-105 active:scale-95"
        >
            <Printer size={20} />
            طباعة
        </button>
      </div>

      {/* ══════ Admins Table ══════ */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-[#655ac1]/5 overflow-hidden print:shadow-none print:border-2 print:border-slate-800 print:rounded-none">
         {/* Table Header */}
         <div className="bg-white px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-50/50 to-white print:bg-slate-100 print:border-slate-800 print:py-2">
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#655ac1] rounded-full print:bg-slate-900" />
                <h4 className="font-black text-slate-800 text-lg print:text-base">
                    الإداريون
                </h4>
            </div>
            
            <div className="flex items-center gap-3 px-5 py-2 bg-[#e5e1fe]/50 rounded-xl min-w-[140px] cursor-default border border-[#e5e1fe] hover:shadow-sm transition-all h-[52px] print:hidden">
                <div className="p-1.5 bg-white rounded-lg shadow-sm">
                    <Users size={20} className="text-[#655ac1]" />
                </div>
                <div className="flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-400 leading-tight">الإجمالي</span>
                    <span className="text-xl font-black text-[#655ac1] leading-none mt-0.5">{admins.length}</span>
                </div>
             </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead>
                    <tr className="bg-[#f8f7ff] border-b border-slate-100 print:bg-white print:border-slate-800">
                       <th className="p-4 w-16 text-center text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-2">#</th>
                       <th className="p-4 text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-2">الاسم</th>
                       <th className="p-4 text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-2">الدور الوظيفي</th>
                       <th className="p-4 text-xs font-black text-[#655ac1] print:text-slate-900 print:border-l print:border-slate-300 print:p-2">رقم الجوال</th>
                       <th className="p-4 w-24 text-center text-xs font-black text-[#655ac1] print:hidden">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 print:divide-slate-300">
                    {admins.map((admin, idx) => (
                        <tr key={admin.id} className="hover:bg-[#e5e1fe]/10 transition-colors group print:break-inside-avoid">
                            <td className="p-4 text-center relative print:border-l print:border-slate-300 print:p-2">
                                <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 flex items-center justify-center rounded-full print:bg-transparent print:text-slate-900 print:w-auto print:h-auto">{idx + 1}</span>
                            </td>
                            <td className="p-4 font-bold text-slate-700 print:border-l print:border-slate-300 print:p-2">
                                {isEditMode ? (
                                    <input 
                                        value={admin.name} 
                                        onChange={e => updateAdmin(admin.id, 'name', e.target.value)}
                                        className="w-full p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-sm font-bold shadow-sm"
                                        placeholder="اسم الإداري"
                                    />
                                ) : (
                                    <span className="print:text-black">{admin.name || '-'}</span>
                                )}
                            </td>
                            <td className="p-4 print:border-l print:border-slate-300 print:p-2">
                                {isEditMode ? (
                                    <div className="space-y-2">
                                        <select 
                                            value={admin.role} 
                                            onChange={e => updateAdmin(admin.id, 'role', e.target.value)}
                                            className="w-full p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-sm font-bold shadow-sm"
                                        >
                                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        
                                        {admin.role === 'وكيل' && (
                                            <AgentTypeSelector admin={admin} onToggle={toggleAgentType} />
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <Badge variant="neutral" className="bg-slate-100 text-slate-600 border-slate-200 w-fit print:bg-transparent print:text-black print:p-0 print:border-0">
                                            {admin.role}
                                        </Badge>
                                        {admin.role === 'وكيل' && admin.agentType && admin.agentType.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {admin.agentType.map(t => (
                                                    <span key={t} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 print:text-slate-600 print:bg-transparent print:border-0 print:p-0">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </td>
                            <td className="p-4 print:border-l print:border-slate-300 print:p-2">
                                {isEditMode ? (
                                    <input 
                                        value={admin.phone} 
                                        onChange={e => updateAdmin(admin.id, 'phone', e.target.value)}
                                        className="w-full p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-sm font-bold text-center dir-ltr shadow-sm"
                                        placeholder="05xxxxxxxx"
                                    />
                                ) : (
                                    <span className="text-xs font-bold text-slate-500 font-mono print:text-black" dir="ltr">{admin.phone || '-'}</span>
                                )}
                            </td>
                            <td className="p-4 text-center print:hidden">
                                <button 
                                    onClick={() => removeAdmin(admin.id)} 
                                    className="p-2 text-slate-400 bg-slate-50 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                    title="حذف"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </td>
                        </tr>
                    ))}
                    {admins.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-12 text-center text-slate-400">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                        <UserCog size={24} className="text-slate-300" />
                                    </div>
                                    <span className="font-bold">لا يوجد إداريين مضافين</span>
                                    <span className="text-xs">اضغط على "إضافة إداري" للبدء</span>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
         </div>
      </div>

      {/* ══════ Add Modal ══════ */}
      {isAddModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <h3 className="font-black text-lg text-slate-800 mb-4 text-center">ظبط العدد المطلوب</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 text-center">كم عدد الإداريين الذين تريد إضافتهم؟</label>
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={() => setAddCount(Math.max(1, addCount - 1))} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 font-bold">-</button>
                            <span className="text-2xl font-black text-[#655ac1] w-12 text-center">{addCount}</span>
                            <button onClick={() => setAddCount(addCount + 1)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 font-bold">+</button>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1">إلغاء</Button>
                        <Button onClick={handleAddAdmins} className="flex-1 bg-[#655ac1] hover:bg-[#5448a8]">إنشاء الجدول</Button>
                    </div>
                </div>
            </div>
         </div>
      )}


    </div>
  );
};

export default Step7Admins;
