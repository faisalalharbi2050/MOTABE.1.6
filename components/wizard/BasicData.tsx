import React, { useState, useRef } from 'react';
import { SchoolInfo, Subject, ClassInfo } from '../../types';
import { CheckCircle, Save, Pencil, AlertCircle } from 'lucide-react';
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
  const [isEditMode, setIsEditMode] = useState(true);
  const lastSavedRef = useRef(JSON.stringify(schoolInfo));

  // Notifications: 'saved' | 'no_changes' | 'edit_mode' | null
  const [notification, setNotification] = useState<'saved' | 'no_changes' | 'edit_mode' | null>(null);

  const showNotif = (type: 'saved' | 'no_changes' | 'edit_mode') => {
    setNotification(type);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = () => {
    const current = JSON.stringify(schoolInfo);
    if (current === lastSavedRef.current) {
      showNotif('no_changes');
    } else {
      lastSavedRef.current = current;
      setSchoolInfo(prev => ({ ...prev, isWizardCompleted: true }));
      localStorage.setItem('schoolInfo', JSON.stringify(schoolInfo));
      showNotif('saved');
    }
    setIsEditMode(false);
  };

  const handleEdit = () => {
    setIsEditMode(true);
    showNotif('edit_mode');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          {notification === 'saved' && (
            <div className="bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <CheckCircle size={20} />
              <span className="font-bold">تم حفظ المعلومات بنجاح</span>
            </div>
          )}
          {notification === 'no_changes' && (
            <div className="bg-amber-400 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <AlertCircle size={20} />
              <span className="font-bold">لا توجد تعديلات للحفظ</span>
            </div>
          )}
          {notification === 'edit_mode' && (
            <div className="bg-[#8779fb] text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <Pencil size={20} />
              <span className="font-bold">يمكنك التعديل الآن</span>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div>
          <Step1General
            schoolInfo={schoolInfo}
            setSchoolInfo={setSchoolInfo}
            isEditMode={isEditMode}
          />

          {/* Action Buttons */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mt-6">
            <div className="flex justify-end gap-4">
              {isEditMode ? (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-8 py-3 bg-[#655ac1] text-white rounded-xl font-bold hover:bg-[#5448b0] transition-colors shadow-lg shadow-[#655ac1]/20 active:scale-95"
                >
                  <Save size={18} />
                  حفظ
                </button>
              ) : (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm active:scale-95"
                >
                  <Pencil size={18} />
                  تعديل
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicData;
