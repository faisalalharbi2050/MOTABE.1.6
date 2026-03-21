import React, { useState } from 'react';
import { SchoolInfo, Subject, ClassInfo } from '../../types';
import { CheckCircle } from 'lucide-react';
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
  const [showSaveNotification, setShowSaveNotification] = useState(false);

  const handleComplete = () => {
    setSchoolInfo(prev => ({ ...prev, isWizardCompleted: true }));
    localStorage.setItem('schoolInfo', JSON.stringify(schoolInfo));
    setShowSaveNotification(true);
    setTimeout(() => setShowSaveNotification(false), 3000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Save Notification */}
      {showSaveNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <CheckCircle size={20} />
            <span className="font-bold">تم حفظ المعلومات بنجاح</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div>
          <Step1General schoolInfo={schoolInfo} setSchoolInfo={setSchoolInfo} />

          {/* Action Buttons */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mt-6">
            <div className="flex justify-end gap-4">
              <button
                onClick={handleComplete}
                className="px-8 py-3 bg-[#655ac1] text-white rounded-xl font-bold hover:bg-[#5448b0] transition-colors shadow-lg shadow-[#655ac1]/20"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicData;
