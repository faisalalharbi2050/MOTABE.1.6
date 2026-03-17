import React from 'react';
import { SchoolInfo, Subject, ClassInfo } from '../../types';
import Step1General from './steps/Step1General';

interface BasicDataProps {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  subjects: Subject[];
  classes: ClassInfo[];
  setClasses: React.Dispatch<React.SetStateAction<ClassInfo[]>>;
  gradeSubjectMap: Record<string, string[]>;
  setGradeSubjectMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  onComplete?: () => void;
}

const BasicData: React.FC<BasicDataProps> = ({ 
    schoolInfo, 
    setSchoolInfo, 
    subjects,
    classes, 
    setClasses,
    gradeSubjectMap, 
    setGradeSubjectMap,
    onComplete
}) => {
  const handleComplete = () => {
    // Mark as completed
    setSchoolInfo(prev => ({ ...prev, isWizardCompleted: true }));
    onComplete?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {schoolInfo.isWizardCompleted ? (
          /* Completed State */
          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">تم حفظ المعلومات بنجاح</h3>
            <p className="text-slate-500 mb-6">لقد تم إعداد معلومات المدرسة الأساسية</p>
            <button 
              onClick={() => setSchoolInfo(prev => ({ ...prev, isWizardCompleted: false }))}
              className="px-6 py-2 bg-[#655ac1] text-white rounded-xl font-bold hover:bg-[#5448b0] transition-colors"
            >
              تعديل المعلومات
            </button>
          </div>
        ) : (
          /* Edit State */
          <div>
            <Step1General schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} />
            
            {/* Action Buttons */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mt-6">
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => onComplete?.()}
                  className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleComplete}
                  className="px-8 py-3 bg-[#655ac1] text-white rounded-xl font-bold hover:bg-[#5448b0] transition-colors shadow-lg shadow-[#655ac1]/20"
                >
                  حفظ المعلومات
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BasicData;
