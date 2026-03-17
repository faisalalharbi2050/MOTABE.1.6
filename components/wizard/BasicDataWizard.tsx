
import React, { useState, useRef, useEffect } from 'react';
import { 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Save,
  RotateCcw
} from 'lucide-react';
import { SchoolInfo, Subject, ClassInfo } from '../../types';

import Step1General from './steps/Step1General';

interface BasicDataWizardProps {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  subjects: Subject[];
  classes: ClassInfo[];
  setClasses: React.Dispatch<React.SetStateAction<ClassInfo[]>>;
  gradeSubjectMap: Record<string, string[]>;
  setGradeSubjectMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  onComplete?: () => void;
}

const BasicDataWizard: React.FC<BasicDataWizardProps> = ({ 
    schoolInfo, setSchoolInfo, 
    subjects,
    classes, setClasses,
    gradeSubjectMap, setGradeSubjectMap,
    onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isFinished, setIsFinished] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const totalSteps = 1;

  const steps = [
    { id: 1, title: 'معلومات عامة', icon: Settings },
  ];

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else if (currentStep === totalSteps && onComplete) {
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
                <p className="text-slate-500 font-medium mb-8">لقد تم الانتهاء من إعداد البيانات الأساسية للملف الدراسي.</p>
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
      default: return null;
    }
  };

  if (isFinished) {
      return (
        <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {renderStepContent()}
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Wizard Header & Stepper */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative overflow-hidden">
        
        {/* Header Content */}
        <div className="flex items-center justify-between mb-4 relative z-10">
           <div className="flex flex-col gap-1">
               <div className="bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-2">
                   <span className="text-xs font-bold text-indigo-600">الخطوة {currentStep} من {totalSteps}</span>
               </div>
           </div>
           {schoolInfo.isWizardCompleted && (
               <button
                   onClick={() => setSchoolInfo(prev => ({ ...prev, isWizardCompleted: false }))}
                   className="flex items-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-200 hover:border-rose-500 rounded-xl text-xs font-black transition-all group shadow-sm"
               >
                   <RotateCcw size={15} className="group-hover:rotate-180 transition-transform duration-500" />
                   إعادة الضبط
               </button>
           )}
        </div>

        {/* Improved Horizontal Stepper */}
        <div className="relative px-2 max-w-3xl mx-auto">
            {/* Connecting Line Background */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 rounded-full z-0"></div>
            
            {/* Active Connecting Line */}
            <div 
                className="absolute top-1/2 right-0 h-1 bg-primary -translate-y-1/2 rounded-full z-0 transition-all duration-700 ease-out"
                style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            ></div>

            <div className="relative z-10 flex justify-between items-center w-full">
                {steps.map((step) => {
                    const isActive = step.id === currentStep;
                    const isCompleted = step.id < currentStep || schoolInfo.isWizardCompleted;
                    const Icon = step.icon;

                    return (
                        <div 
                            key={step.id} 
                            className="flex flex-col items-center gap-2 cursor-pointer group" 
                            onClick={() => setCurrentStep(step.id)}
                        >
                            <div className={`
                                w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 border-[3px] relative z-10
                                ${isActive 
                                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105' 
                                    : isCompleted 
                                        ? 'bg-white text-emerald-600 border-emerald-500' 
                                        : 'bg-white text-slate-300 border-slate-200 group-hover:border-slate-300 group-hover:text-slate-400'}
                            `}>
                                {isCompleted ? <Check size={22} strokeWidth={3} /> : <Icon size={22} />}
                            </div>
                            
                            <span className={`
                                text-[11px] font-bold transition-all duration-300 px-3 py-1 rounded-md
                                ${isActive 
                                    ? 'text-primary' 
                                    : isCompleted 
                                        ? 'text-emerald-600' 
                                        : 'text-slate-400 group-hover:text-slate-500'}
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
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-1 scroll-smooth"
      >
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
            className={`
                flex items-center gap-2 px-10 py-3.5 rounded-xl font-bold text-sm bg-primary text-white hover:bg-secondary shadow-lg shadow-indigo-200 transition-all active:scale-95 group
            `}
          >
             {currentStep === totalSteps ? (
               <>حفظ وإنهاء <Check size={18} className="group-hover:scale-110 transition-transform"/></>
             ) : (
               <>التالي <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform"/></>
             )}
          </button>
      </div>
    </div>
  );
};

export default BasicDataWizard;
