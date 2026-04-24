import React, { useState } from 'react';
import { 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Clock, 
  BookOpen, 
  GraduationCap, 
  Users, 
  Save,
  Calendar,
  LayoutGrid,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { SchoolInfo, Subject, ClassInfo, Teacher, Admin, Student, Specialization, ScheduleSettingsData } from '../../types';

import Step1General from './steps/Step1General';
import Step2AcademicYear from './steps/Step2AcademicYear';
import Step2Timing from './steps/Step2Timing';
import Step3Subjects from './steps/Step3Subjects';
import Step4Classes from './steps/Step4Classes';
import Step5Students from './steps/Step5Students';
import Step6Teachers from './steps/Step6Teachers';
import Step7Admins from './steps/Step7Admins';

interface WizardProps {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  classes: ClassInfo[];
  setClasses: React.Dispatch<React.SetStateAction<ClassInfo[]>>;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  specializations: Specialization[];
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  admins: Admin[];
  setAdmins: React.Dispatch<React.SetStateAction<Admin[]>>;
  gradeSubjectMap: Record<string, string[]>;
  setGradeSubjectMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  phaseDepartmentMap: Record<string, string>;
  setPhaseDepartmentMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onComplete: () => void;
  scheduleSettings: ScheduleSettingsData;
  setScheduleSettings: React.Dispatch<React.SetStateAction<ScheduleSettingsData>>;
}

const GeneralSettingsWizard: React.FC<WizardProps> = ({ 
    schoolInfo, setSchoolInfo, 
    subjects, setSubjects,
    classes, setClasses,
    teachers, setTeachers, specializations,
    students, setStudents,
    admins, setAdmins,
    gradeSubjectMap, setGradeSubjectMap,
    phaseDepartmentMap, setPhaseDepartmentMap,
    onComplete,
    scheduleSettings, setScheduleSettings
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isFinished, setIsFinished] = useState(false);
  const totalSteps = 8;

  const steps = [
    { id: 1, title: 'معلومات عامة', icon: Settings },
    { id: 2, title: 'العام الدراسي', icon: Calendar },
    { id: 3, title: 'التوقيت', icon: Clock },
    { id: 4, title: 'المواد الدراسية', icon: BookOpen },
    { id: 5, title: 'الفصول', icon: LayoutGrid },
    { id: 6, title: 'الطلاب', icon: Users },
    { id: 7, title: 'المعلمون', icon: GraduationCap },
    { id: 8, title: 'الإداريون', icon: ShieldCheck },
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      setSchoolInfo(prev => ({ ...prev, isWizardCompleted: true }));
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const progressPercentage = Math.round(((currentStep - 1) / totalSteps) * 100);

  const renderStepContent = () => {
    if (isFinished) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center animate-in zoom-in-95 duration-500 h-full">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-50">
                    <Check size={40} strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">تم الحفظ بنجاح!</h2>
                <p className="text-slate-500 font-medium mb-8">لقد تم الانتهاء من إعداد كافة بيانات المدرسة وتجهيز النظام.</p>
                <button 
                  onClick={() => onComplete?.()}
                  className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-secondary transition-all"
                >
                    انقر هنا للعودة إلى لوحة التحكم
                </button>
            </div>
        );
    }

    switch (currentStep) {
      case 1: return <Step1General schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} />;
      case 2: return <Step2AcademicYear schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} />;
      case 3: return <Step2Timing schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} />;
      case 4: return <Step3Subjects subjects={subjects} setSubjects={setSubjects} schoolInfo={schoolInfo} gradeSubjectMap={gradeSubjectMap} setGradeSubjectMap={setGradeSubjectMap} phaseDepartmentMap={phaseDepartmentMap} setPhaseDepartmentMap={setPhaseDepartmentMap} scheduleSettings={scheduleSettings} setScheduleSettings={setScheduleSettings} />;
      case 5: return <Step4Classes classes={classes} setClasses={setClasses} subjects={subjects} setSubjects={setSubjects} gradeSubjectMap={gradeSubjectMap} setGradeSubjectMap={setGradeSubjectMap} schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} />;
      case 6: return <Step5Students classes={classes} students={students} setStudents={setStudents} schoolInfo={schoolInfo} />;
      case 7: return <Step6Teachers teachers={teachers} setTeachers={setTeachers} specializations={specializations} schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} scheduleSettings={scheduleSettings} setScheduleSettings={setScheduleSettings} classes={classes} />;
      case 8: return <Step7Admins admins={admins} setAdmins={setAdmins} schoolInfo={schoolInfo} />;
      default: return null;
    }
  };

  if (isFinished) {
      return (
        <div className="flex flex-col h-full bg-white rounded-[2rem] border border-slate-50 shadow-xl shadow-indigo-50/50 overflow-hidden">
            {renderStepContent()}
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Wizard Header & Stepper */}
      <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-indigo-50/50 border border-slate-50 relative overflow-hidden">
        
        {/* Header Content */}
        <div className="flex items-center justify-between mb-10 relative z-10">
           <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                     <Settings size={24} />
                  </div>
                  إعداد المدرسة
                </h2>
                <div className="flex items-center gap-3 pr-14 mt-1">
                    <p className="text-sm text-slate-400 font-medium">أكمل الخطوات لتهيئة النظام بشكل صحيح</p>
                </div>
           </div>
           
           <div className="flex items-center gap-4">
                {/* Auto-save Indicator Removed */}

               {schoolInfo.isWizardCompleted && (
                   <button
                       onClick={() => setSchoolInfo(prev => ({ ...prev, isWizardCompleted: false }))}
                       className="flex items-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-200 hover:border-rose-500 rounded-xl text-xs font-black transition-all group shadow-sm"
                   >
                       <RotateCcw size={15} className="group-hover:rotate-180 transition-transform duration-500" />
                       إعادة الضبط
                   </button>
               )}

               <div className="bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-100 flex items-center gap-3">
                   <div className="text-xs font-bold text-slate-500">نسبة الإكمال</div>
                   <div className="h-4 w-px bg-slate-200"></div>
                   <div className="text-xl font-black text-primary">{progressPercentage}%</div>
               </div>
           </div>
        </div>

        {/* Improved Horizontal Stepper */}
        <div className="relative px-4">
            {/* Connecting Line Background */}
            <div className="absolute top-1/2 left-0 w-full h-1.5 bg-slate-100 -translate-y-1/2 rounded-full z-0"></div>
            
            {/* Active Connecting Line */}
            <div 
                className="absolute top-1/2 right-0 h-1.5 bg-gradient-to-l from-primary to-indigo-400 -translate-y-1/2 rounded-full z-0 transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            ></div>

            <div className="relative z-10 flex justify-between items-center w-full gap-4">
                {steps.map((step) => {
                    const isActive = step.id === currentStep;
                    const isCompleted = step.id < currentStep || schoolInfo.isWizardCompleted;
                    const Icon = step.icon;

                    return (
                        <div 
                            key={step.id} 
                            className="flex flex-col items-center gap-3 cursor-pointer group" 
                            onClick={() => setCurrentStep(step.id)}
                        >
                            <div className={`
                                w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-[3px] relative z-10
                                ${isActive 
                                    ? 'bg-primary text-white border-white shadow-xl shadow-primary/30 scale-110 -translate-y-1' 
                                    : isCompleted 
                                        ? 'bg-white text-emerald-500 border-emerald-500 shadow-lg shadow-emerald-100' 
                                        : 'bg-white text-slate-300 border-slate-100 group-hover:border-slate-300 group-hover:text-slate-400'}
                            `}>
                                {isCompleted ? <Check size={22} strokeWidth={3} /> : <Icon size={22} />}
                                
                                {/* Pulse Effect for Active Step */}
                                {isActive && (
                                    <span className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping"></span>
                                )}
                            </div>
                            
                            <span className={`
                                text-[11px] font-bold transition-all duration-300 px-3 py-1 rounded-full
                                ${isActive 
                                    ? 'text-white bg-primary shadow-md shadow-primary/20 -translate-y-1' 
                                    : isCompleted 
                                        ? 'text-emerald-600 bg-emerald-50' 
                                        : 'text-slate-400 group-hover:text-slate-600'}
                            `}>
                                {step.title}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 w-full relative">
          {renderStepContent()}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-auto bg-white/50 backdrop-blur-sm p-4 rounded-t-3xl">
          <button 
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`
                flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all
                ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-sm'}
            `}
          >
             <ChevronRight size={18} /> السابق
          </button>

          <button 
            onClick={handleNext}
            className="flex items-center gap-2 px-10 py-3.5 rounded-xl font-bold text-sm bg-primary text-white hover:bg-secondary shadow-lg shadow-indigo-200 transition-all active:scale-95 group"
          >
             {currentStep === totalSteps ? (
                <>
                    حفظ وإنهاء <Save size={18} className="group-hover:scale-110 transition-transform"/>
                </>
             ) : (
                <>
                    التالي <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform"/>
                </>
             )}
          </button>
      </div>
    </div>
  );
};

export default GeneralSettingsWizard;
