
import React from 'react';
import { SchoolInfo, Phase } from '../types';
import { Settings, School, ShieldCheck, Building2, Plus, Trash2, Users, RefreshCcw, AlertCircle, Check } from 'lucide-react';

interface Props {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  onResetAll?: () => void; // دالة إعادة الضبط
}

const GeneralSettings: React.FC<Props> = ({ schoolInfo, setSchoolInfo, onResetAll }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    const arrayFields = ['phases', 'departments', 'secondSchoolPhases'];
    setSchoolInfo(prev => ({
      ...prev,
      [name]: arrayFields.includes(name) ? [val as string] : val
    }));
  };

  const toggleSecondSchool = () => {
    setSchoolInfo(prev => ({
      ...prev,
      hasSecondSchool: !prev.hasSecondSchool,
      secondSchoolName: !prev.hasSecondSchool ? '' : prev.secondSchoolName,
      secondSchoolPhases: !prev.hasSecondSchool ? [Phase.ELEMENTARY] : prev.secondSchoolPhases,
      secondSchoolGender: !prev.hasSecondSchool ? 'بنين' : prev.secondSchoolGender,
      mergeTeachers: !prev.hasSecondSchool ? true : prev.mergeTeachers
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col gap-2">
         <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
           <Settings className="text-primary" size={28} />
           الإعدادات العامة للمدرسة
         </h2>
         <p className="text-slate-400 text-sm">تعبئة البيانات الأساسية للمدرسة لاعتمادها في التقارير والترويسات الرسمية.</p>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-indigo-50/50 p-6 md:p-10 space-y-10">
        {/* Basic Info */}
        <section className="space-y-6">
           <h3 className="text-lg font-bold text-primary flex items-center gap-2 border-b border-accent pb-3">
              <School size={20} /> بيانات المدرسة الأساسية
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InputGroup label="اسم المدرسة" name="schoolName" value={schoolInfo.schoolName} onChange={handleChange} placeholder="أدخل اسم المدرسة" />
              <InputGroup label="الإدارة التعليمية بمنطقة" name="region" value={schoolInfo.region} onChange={handleChange} placeholder="اسم المنطقة التعليمية" />
              
              <SelectGroup label="القسم" name="departments" value={(schoolInfo.departments || [])[0] || ''} onChange={handleChange}>
                <option value="عام">عام</option>
                <option value="تحفيظ">تحفيظ قرآن</option>
                <option value="آخر">آخر</option>
              </SelectGroup>

              <SelectGroup label="المرحلة الدراسية (إلزامي)" name="phases" value={(schoolInfo.phases || [])[0] || ''} onChange={handleChange} isMandatory>
                {Object.values(Phase).map(p => <option key={p} value={p}>{p}</option>)}
              </SelectGroup>

              <SelectGroup label="الجنس" name="gender" value={schoolInfo.gender} onChange={handleChange}>
                <option value="بنين">بنين</option>
                <option value="بنات">بنات</option>
              </SelectGroup>
           </div>
        </section>

        {/* Second School Support */}
        <section className="space-y-6">
           <div className={`flex items-center justify-between ${schoolInfo.hasSecondSchool ? 'border-b border-accent pb-3' : ''}`}>
                <div className="flex items-center gap-2 text-primary">
                    <Building2 size={20} />
                    <span className="font-bold">المبنى المشترك / مدرسة إضافية</span>
                </div>
                {!schoolInfo.hasSecondSchool && (
                  <button 
                      onClick={toggleSecondSchool}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-secondary transition-all font-black text-xs active:scale-95"
                  >
                      <Plus size={16}/> أضف مدرسة أخرى
                  </button>
                )}
           </div>
           
           {schoolInfo.hasSecondSchool && (
             <div className="animate-in slide-in-from-top-2 bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100 relative group">
                <button 
                  onClick={toggleSecondSchool}
                  className="absolute -top-3 -left-3 bg-rose-500 text-white p-2 rounded-full shadow-lg hover:bg-rose-600 transition-colors"
                  title="حذف المدرسة الثانية"
                >
                  <Trash2 size={16}/>
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <InputGroup label="اسم المدرسة الثانية" name="secondSchoolName" value={schoolInfo.secondSchoolName || ''} onChange={handleChange} />
                    <SelectGroup label="مرحلة المدرسة الثانية" name="secondSchoolPhases" value={(schoolInfo.secondSchoolPhases || [])[0] || ''} onChange={handleChange}>
                        {Object.values(Phase).map(p => <option key={p} value={p}>{p}</option>)}
                    </SelectGroup>
                    <SelectGroup label="جنس المدرسة الثانية" name="secondSchoolGender" value={schoolInfo.secondSchoolGender} onChange={handleChange}>
                        <option value="بنين">بنين</option>
                        <option value="بنات">بنات</option>
                    </SelectGroup>
                </div>
                
                {/* خيار دمج المعلمين */}
                <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm w-fit">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Users size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">دمج الهيئة التعليمية</span>
                        <span className="text-[10px] text-slate-400">اعتبار جميع المعلمين طاقم واحد للمدرستين عند الإسناد.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer mr-4">
                        <input 
                            type="checkbox" 
                            name="mergeTeachers"
                            checked={schoolInfo.mergeTeachers} 
                            onChange={handleChange}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
             </div>
           )}
        </section>

        {/* Administration */}
        <section className="space-y-6">
           <h3 className="text-lg font-bold text-primary flex items-center gap-2 border-b border-accent pb-3">
              <ShieldCheck size={20} /> إدارة المدرسة
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InputGroup label="اسم وكيل الشؤون التعليمية" name="educationalAgent" value={schoolInfo.educationalAgent} onChange={handleChange} />
              <InputGroup label="اسم مدير المدرسة" name="principal" value={schoolInfo.principal} onChange={handleChange} />
           </div>
        </section>

      </div>
    </div>
  );
};

const InputGroup = ({ label, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-slate-600 mr-1">{label}</label>
    <input
      {...props}
      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-xs font-bold"
    />
  </div>
);

const SelectGroup = ({ label, children, isMandatory, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-slate-600 mr-1 flex items-center gap-1">
        {label} {isMandatory && <span className="text-rose-500">*</span>}
    </label>
    <select
      {...props}
      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none text-xs font-bold"
    >
      {children}
    </select>
  </div>
);

export default GeneralSettings;
