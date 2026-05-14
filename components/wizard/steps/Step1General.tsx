import React, { useState, useRef, useEffect } from 'react';
import { SchoolInfo, Phase, SharedSchool, EntityType } from '../../../types';
import { STUDY_PLANS_CONFIG } from '../../../study_plans_config';
import { School, Building2, Plus, Trash2, MapPin, Phone, Mail, CheckCircle2, Upload, X, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface EntityTypeDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const EntityTypeDropdown: React.FC<EntityTypeDropdownProps> = ({ value, onChange, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  const options = Object.values(EntityType);

  return (
    <div className="relative w-full" ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="truncate text-[13px] leading-tight">{value}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 animate-in slide-in-from-top-2">
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                  value === opt ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                }`}
              >
                <span>{opt}</span>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                  value === opt ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'
                }`}>
                  <Check size={12} strokeWidth={3} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface Step1Props {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  isEditMode?: boolean;
}

const Step1General: React.FC<Step1Props> = ({ schoolInfo, setSchoolInfo, isEditMode = true }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared School State (Inline Mode)
  const [expandedSharedSchoolId, setExpandedSharedSchoolId] = useState<string | null>(null);
  const sharedSchoolFileInputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});

  // Custom delete confirm dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setSchoolInfo(prev => ({
      ...prev,
      [name]: val
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSchoolInfo(prev => ({
          ...prev,
          logo: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Shared Schools Logic (Inline)
  const addSharedSchool = () => {
    const newSchool: SharedSchool = {
      id: Date.now().toString(),
      name: '',
      phases: [Phase.ELEMENTARY],
      gender: 'بنين',
      address: '',
      logo: '',
      phone: '',
      email: '',
      educationAdministration: '',
      region: '',
      managerName: '',
      managerMobile: ''
    };
    
    setSchoolInfo(prev => ({
      ...prev,
      sharedSchools: [...(prev.sharedSchools || []), newSchool]
    }));
    setExpandedSharedSchoolId(newSchool.id);
  };

  const updateSharedSchool = (id: string, field: keyof SharedSchool, value: any) => {
    setSchoolInfo(prev => ({
      ...prev,
      sharedSchools: (prev.sharedSchools || []).map(s => 
        s.id === id ? { ...s, [field]: value } : s
      )
    }));
  };

  // Main School State for Collapsible Card
  const [isMainSchoolExpanded, setIsMainSchoolExpanded] = useState(true);

  const handleSharedSchoolPhaseChange = (id: string, phase: Phase) => {
    setSchoolInfo(prev => ({
      ...prev,
      sharedSchools: (prev.sharedSchools || []).map(s => {
        if (s.id !== id) return s;
        // Single Select Logic: Replace the entire array with just the selected phase
        return {
          ...s,
          phases: [phase]
        };
      })
    }));
  };

  const deleteSharedSchool = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteSharedSchool = () => {
    if (!deleteConfirmId) return;
    setSchoolInfo(prev => ({
      ...prev,
      sharedSchools: (prev.sharedSchools || []).filter(s => s.id !== deleteConfirmId)
    }));
    setDeleteConfirmId(null);
  };

  const handleSharedSchoolLogoUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSharedSchool(id, 'logo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderSchoolForm = () => (
    <div className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isMainSchoolExpanded ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'border-slate-100 shadow-sm hover:border-slate-200'}`}>
         {/* Card Header for Main School */}
         <div 
            className="p-4 flex items-start justify-between cursor-pointer bg-slate-50"
            onClick={() => setIsMainSchoolExpanded(!isMainSchoolExpanded)}
         >
            <div className="flex items-center gap-3">
               <div>
                  <h4 className={`font-bold text-base ${!schoolInfo.schoolName ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                    {schoolInfo.schoolName || 'المدرسة الأساسية'}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">
                       {schoolInfo.phases && schoolInfo.phases.length > 0 ? schoolInfo.phases.join(', ') : 'لا توجد مراحل'}
                     </span>
                     <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 font-bold">
                       الرئيسية
                     </span>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-2">
               {isMainSchoolExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </div>
         </div>

      {isMainSchoolExpanded && (
        <div className="p-6 border-t border-slate-100 bg-white animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-3">
                    <label className="text-sm font-bold text-slate-600">اسم المدرسة <span className="text-rose-500">*</span></label>
                    <input
                        name="schoolName"
                        value={schoolInfo.schoolName}
                        onChange={handleChange}
                        placeholder="أدخل اسم المدرسة"
                        disabled={!isEditMode}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                </div>

                <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-2">
                    <label className="text-sm font-bold text-slate-600 flex items-center gap-1">
                      المرحلة الدراسية <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(Phase).map((p) => {
                        const isSelected = (schoolInfo.phases || [])[0] === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              if (!isEditMode) return;
                              setSchoolInfo(prev => ({
                                ...prev,
                                phases: [p]
                              }));
                            }}
                            disabled={!isEditMode}
                            className={`px-5 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-200 select-none flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed
                              ${isEditMode ? 'active:scale-95' : ''}
                              ${isSelected
                                ? 'border-[#8779fb] bg-white text-[#8779fb] shadow-md shadow-[#8779fb]/10'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-[#8779fb]/40 hover:text-[#8779fb] hover:bg-[#8779fb]/5'
                              }`}
                          >
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#7c6ee0] to-[#655ac1] flex items-center justify-center shadow-sm shadow-[#655ac1]/30 shrink-0">
                                <Check size={12} strokeWidth={3.5} className="text-white" />
                              </span>
                            )}
                            {p}
                          </button>
                        );
                      })}
                    </div>
                    {!(schoolInfo.phases && schoolInfo.phases.length > 0) && (
                      <p className="text-xs text-rose-500 font-medium">يرجى اختيار مرحلة دراسية واحدة</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">نوع المدرسة</label>
                    <select
                        name="gender"
                        value={schoolInfo.gender}
                        onChange={handleChange}
                        disabled={!isEditMode}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <option value="بنين">بنين</option>
                        <option value="بنات">بنات</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">إدارة التعليم</label>
                    <input
                        name="educationAdministration"
                        value={schoolInfo.educationAdministration || ''}
                        onChange={handleChange}
                        placeholder="مثال: الرياض"
                        disabled={!isEditMode}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                </div>
                
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">المنطقة</label>
                    <input
                        name="region"
                        value={schoolInfo.region || ''}
                        onChange={handleChange}
                        placeholder="المنطقة"
                        disabled={!isEditMode}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">العنوان</label>
                    <div className="relative">
                        <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            name="address"
                            value={schoolInfo.address || ''}
                            onChange={handleChange}
                            disabled={!isEditMode}
                            className="w-full p-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">البريد الإلكتروني</label>
                    <div className="relative">
                        <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="email"
                            name="email"
                            value={schoolInfo.email || ''}
                            onChange={handleChange}
                            disabled={!isEditMode}
                            className="w-full p-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                            dir="ltr"
                        />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">هاتف المدرسة</label>
                    <div className="relative">
                        <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="tel"
                            name="phone"
                            value={schoolInfo.phone || ''}
                            onChange={handleChange}
                            disabled={!isEditMode}
                            className="w-full p-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                            dir="ltr"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">مدير المدرسة</label>
                    <input
                        name="principal"
                        value={schoolInfo.principal}
                        onChange={handleChange}
                        disabled={!isEditMode}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="الاسم الثلاثي"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">رقم جوال المدير</label>
                    <div className="relative">
                        <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="tel"
                            name="principalMobile"
                            value={schoolInfo.principalMobile || ''}
                            onChange={handleChange}
                            disabled={!isEditMode}
                            className="w-full p-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder="05xxxxxxxx"
                            dir="ltr"
                        />
                    </div>
                </div>

                {/* Logo Upload - Matches Shared School Design */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3 pt-2">
                    <label className="text-sm font-bold text-slate-600 block mb-2">شعار المدرسة</label>
                    <div className="flex items-center gap-4">
                        <div
                            onClick={() => isEditMode && fileInputRef.current?.click()}
                            className={`px-6 py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors ${isEditMode ? 'cursor-pointer hover:bg-slate-100' : 'opacity-60 cursor-not-allowed'}`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                disabled={!isEditMode}
                            />
                            <Upload size={14} />
                            {schoolInfo.logo ? 'تغيير الشعار' : 'رفع شعار المدرسة'}
                        </div>
                        {schoolInfo.logo && (
                            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold">
                                <CheckCircle2 size={14} />
                                <span>تم الرفع</span>
                                {isEditMode && (
                                  <button
                                      onClick={(e) => { e.stopPropagation(); setSchoolInfo(prev => ({ ...prev, logo: undefined })); }}
                                      className="hover:text-rose-500 mr-2 flex items-center"
                                  >
                                      <X size={14} />
                                  </button>
                                )}
                            </div>
                        )}
                         {schoolInfo.logo && (
                             <img src={schoolInfo.logo} alt="School Logo" className="h-10 w-auto object-contain rounded border border-slate-100 bg-white p-1" />
                         )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );

  const renderNonSchoolForm = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">اسم الكيان <span className="text-rose-500">*</span></label>
              <input
                  name="schoolName"
                  value={schoolInfo.schoolName}
                  onChange={handleChange}
                  placeholder={`أدخل اسم ${schoolInfo.entityType || 'الكيان'}`}
                  disabled={!isEditMode}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              />
          </div>

          <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">الدولة</label>
              <input
                  name="country"
                  value={schoolInfo.country || ''}
                  onChange={handleChange}
                  placeholder="الدولة"
                  disabled={!isEditMode}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              />
          </div>

          <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">المنطقة</label>
              <input
                  name="region"
                  value={schoolInfo.region || ''}
                  onChange={handleChange}
                  placeholder="المنطقة"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
              />
          </div>

          <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">المدينة</label>
              <input
                  name="city"
                  value={schoolInfo.city || ''}
                  onChange={handleChange}
                  placeholder="المدينة"
                  disabled={!isEditMode}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              />
          </div>
           
           <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">البريد الإلكتروني</label>
               <div className="relative">
                 <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input
                     type="email"
                     name="email"
                     value={schoolInfo.email || ''}
                     onChange={handleChange}
                     disabled={!isEditMode}
                     className="w-full p-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                     dir="ltr"
                 />
              </div>
          </div>
          
           

           <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">اسم المدير</label>
               <input
                   name="principal"
                   value={schoolInfo.principal}
                   onChange={handleChange}
                   disabled={!isEditMode}
                   className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
               />
          </div>
           <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">رقم الجوال</label>
               <div className="relative">
                 <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input
                     type="tel"
                     name="principalMobile"
                     value={schoolInfo.principalMobile || ''}
                     onChange={handleChange}
                     disabled={!isEditMode}
                     className="w-full p-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                     placeholder="05xxxxxxxx"
                     dir="ltr"
                 />
               </div>
          </div>

           {/* Logo Upload - compact, beside رقم الجوال */}
           <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">شعار الكيان</label>
              <div className="flex items-center gap-3">
                 <div
                     onClick={() => isEditMode && fileInputRef.current?.click()}
                     className={`flex-1 p-3.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors ${isEditMode ? 'cursor-pointer hover:bg-slate-100' : 'opacity-60 cursor-not-allowed'}`}
                 >
                     <input
                         type="file"
                         ref={fileInputRef}
                         className="hidden"
                         accept="image/*"
                         onChange={handleLogoUpload}
                         disabled={!isEditMode}
                     />
                     <Upload size={14} />
                     {schoolInfo.logo ? 'تغيير الشعار' : 'رفع شعار الكيان'}
                 </div>
                 {schoolInfo.logo && (
                     <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold">
                         <CheckCircle2 size={14} />
                         <span>تم الرفع</span>
                         {isEditMode && (
                           <button
                               onClick={(e) => { e.stopPropagation(); setSchoolInfo(prev => ({ ...prev, logo: undefined })); }}
                               className="hover:text-rose-500 mr-1 flex items-center"
                           >
                               <X size={14} />
                           </button>
                         )}
                     </div>
                 )}
                 {schoolInfo.logo && (
                     <img src={schoolInfo.logo} alt="Logo" className="h-10 w-auto object-contain rounded border border-slate-100 bg-white p-1" />
                 )}
              </div>
          </div>
      </div>
    </>
  );

  const renderSharedSchoolCard = (school: SharedSchool, index: number) => {
    const isExpanded = expandedSharedSchoolId === school.id;
    return (
      <div key={school.id} className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'border-slate-100 shadow-sm hover:border-slate-200'}`}>
         {/* Card Header */}
         <div 
            className="p-4 flex items-start justify-between cursor-pointer bg-slate-50"
            onClick={() => setExpandedSharedSchoolId(isExpanded ? null : school.id)}
         >
            <div className="flex items-center gap-3">
               <div>
                  <h4 className={`font-bold text-base ${!school.name ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                    {school.name || 'مدرسة مشتركة'}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">
                       {school.phases && school.phases.length > 0 ? school.phases.join(', ') : 'لا توجد مراحل'}
                     </span>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <button
                  onClick={(e) => { e.stopPropagation(); deleteSharedSchool(school.id); }}
                  className="p-2 bg-white border border-slate-300 text-rose-500 hover:border-slate-400 rounded-lg transition-colors"
                  title="حذف المدرسة"
               >
                  <Trash2 size={16} />
               </button>
               {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </div>
         </div>

         {/* Card Content (Form) */}
         {isExpanded && (
            <div className="p-6 border-t border-slate-100 bg-white animate-in slide-in-from-top-2 duration-300" onClick={e => e.stopPropagation()}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                   {/* School Name */}
                   <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-3">
                      <label className="text-xs font-bold text-slate-500">اسم المدرسة <span className="text-rose-500">*</span></label>
                      <input
                         value={school.name}
                         onChange={(e) => updateSharedSchool(school.id, 'name', e.target.value)}
                         onClick={(e) => e.stopPropagation()}
                         placeholder="أدخل اسم المدرسة"
                         disabled={!isEditMode}
                         className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                   </div>

                   {/* Phase Selection - Single Select */}
                   <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-2">
                      <label className="text-sm font-bold text-slate-600 flex items-center gap-1">
                        المرحلة الدراسية <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {Object.values(Phase).map((p) => {
                          const isSelected = (school.phases || [])[0] === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (isEditMode) updateSharedSchool(school.id, 'phases', [p]); }}
                              disabled={!isEditMode}
                              className={`px-5 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-200 select-none flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed
                                ${isEditMode ? 'active:scale-95' : ''}
                                ${isSelected
                                  ? 'border-[#8779fb] bg-white text-[#8779fb] shadow-md shadow-[#8779fb]/10'
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-[#8779fb]/40 hover:text-[#8779fb] hover:bg-[#8779fb]/5'
                                }`}
                            >
                              {isSelected && (
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <polyline points="4 10 8 14 14 6" stroke="#8779fb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                </svg>
                              )}
                              {p}
                            </button>
                          );
                        })}
                      </div>
                      {!(school.phases && school.phases.length > 0) && (
                        <p className="text-xs text-rose-500 font-medium">يرجى اختيار مرحلة دراسية واحدة</p>
                      )}
                   </div>

                   {/* Other Fields */}
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">نوع المدرسة</label>
                      <select
                         value={school.gender}
                         onChange={(e) => updateSharedSchool(school.id, 'gender', e.target.value)}
                         disabled={!isEditMode}
                         className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                         <option value="بنين">بنين</option>
                         <option value="بنات">بنات</option>
                      </select>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">إدارة التعليم</label>
                      <input
                         value={school.educationAdministration || ''}
                         onChange={(e) => updateSharedSchool(school.id, 'educationAdministration', e.target.value)}
                         disabled={!isEditMode}
                         className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                   </div>

                   <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500">المنطقة</label>
                       <input
                          value={school.region || ''}
                          onChange={(e) => updateSharedSchool(school.id, 'region', e.target.value)}
                          disabled={!isEditMode}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                       />
                   </div>

                   <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500">العنوان</label>
                       <input
                          value={school.address || ''}
                          onChange={(e) => updateSharedSchool(school.id, 'address', e.target.value)}
                          disabled={!isEditMode}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                       />
                   </div>

                   <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500">البريد الإلكتروني</label>
                       <input
                          value={school.email || ''}
                          onChange={(e) => updateSharedSchool(school.id, 'email', e.target.value)}
                          disabled={!isEditMode}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                          dir="ltr"
                       />
                   </div>

                   <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500">هاتف المدرسة</label>
                       <input
                          value={school.phone || ''}
                          onChange={(e) => updateSharedSchool(school.id, 'phone', e.target.value)}
                          disabled={!isEditMode}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                          dir="ltr"
                       />
                   </div>

                   {/* Logo */}
                   <div className="col-span-1 md:col-span-2 lg:col-span-3 pt-2">
                      <div className="flex items-center gap-4">
                         <div
                             onClick={() => isEditMode && sharedSchoolFileInputRefs.current[school.id]?.click()}
                             className={`px-6 py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors ${isEditMode ? 'cursor-pointer hover:bg-slate-100' : 'opacity-60 cursor-not-allowed'}`}
                         >
                            <input
                               type="file"
                               ref={(el) => { sharedSchoolFileInputRefs.current[school.id] = el; }}
                               className="hidden"
                               accept="image/*"
                               onChange={(e) => handleSharedSchoolLogoUpload(school.id, e)}
                               disabled={!isEditMode}
                            />
                            <Upload size={14} />
                            {school.logo ? 'تغيير الشعار' : 'رفع شعار المدرسة'}
                         </div>
                         {school.logo && (
                            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold">
                               <CheckCircle2 size={14} /> تم الرفع
                               {isEditMode && (
                                 <button
                                   onClick={(e) => { e.stopPropagation(); updateSharedSchool(school.id, 'logo', null); }}
                                   className="hover:text-rose-500 mr-2"
                                 >
                                   <X size={14} />
                                 </button>
                               )}
                            </div>
                         )}
                      </div>
                   </div>
                </div>
            </div>
         )}
      </div>
    );
  };


  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500 pb-20">
      {/* 0. Page Header */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>

          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <School size={36} strokeWidth={1.8} className="text-[#655ac1]" />
             المعلومات العامة
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إدارة البيانات الأساسية</p>
      </div>
      
      {/* 1. Entity Type Selection */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>


          <div className="relative z-10 space-y-6">
               <div className="space-y-2 max-w-md">
                  <label className="text-sm font-bold text-slate-600">نوع الكيان</label>
                  <EntityTypeDropdown
                    value={schoolInfo.entityType || EntityType.SCHOOL}
                    onChange={(v) => setSchoolInfo(prev => ({ ...prev, entityType: v as EntityType }))}
                    disabled={!isEditMode}
                  />
               </div>

               {schoolInfo.entityType && schoolInfo.entityType !== EntityType.SCHOOL ? renderNonSchoolForm() : renderSchoolForm()}
          </div>
      </div>

      {/* 2. Shared Schools Management - Only for Schools */}
      {/* 2. Shared Schools Management - Only for Schools */}
      {(schoolInfo.entityType === EntityType.SCHOOL || !schoolInfo.entityType) && (
        <>
            {schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0 ? (
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden transition-all duration-300">
                    <div className="flex items-center justify-between relative z-10 mb-6">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Building2 size={24} /></div>
                            المدارس المشتركة
                        </h3>
                        <button
                          onClick={addSharedSchool}
                          className="flex items-center gap-2 px-4 py-2 bg-[#655ac1] text-white rounded-xl font-bold text-sm hover:bg-[#52499d] transition-all active:scale-95"
                        >
                          <Plus size={16} /> إضافة مدرسة
                        </button>
                    </div>
            
                    <div className="space-y-4">
                        {schoolInfo.sharedSchools.map((school, idx) => renderSharedSchoolCard(school, idx))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="flex items-center gap-6">
                         <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl"><Building2 size={24} /></div>
                            <div>
                                <h3 className="text-base font-bold text-slate-700">هل تريد إضافة مدرسة مشتركة ؟</h3>
                                <p className="text-xs text-slate-400 mt-1">يمكنك إضافة المدارس المشتركة لإدارتها</p>
                            </div>
                         </div>
                         <button
                            onClick={addSharedSchool}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#655ac1] text-white rounded-xl font-bold text-sm hover:bg-[#52499d] transition-all active:scale-95"
                          >
                            <Plus size={16} /> إضافة مدرسة
                          </button>
                    </div>
                </div>
            )}
        </>
      )}

      {/* ── Custom Delete Confirm Dialog ── */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 size={20} className="text-rose-500" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-base">حذف المدرسة المشتركة</h4>
                <p className="text-slate-400 text-xs mt-0.5">هذه العملية لا يمكن التراجع عنها</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              هل أنت متأكد من حذف هذه المدرسة المشتركة؟ سيتم حذف جميع بياناتها نهائياً.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDeleteSharedSchool}
                className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-all active:scale-95"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step1General;
