import React, { useState, useRef } from 'react';
import { SchoolInfo, Subject, ClassInfo, EntityType } from '../../types';
import { CheckCircle, Save, Pencil, AlertCircle, XCircle } from 'lucide-react';
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

  // Notifications: 'saved' | 'no_changes' | 'edit_mode' | 'validation_error' | null
  const [notification, setNotification] = useState<'saved' | 'no_changes' | 'edit_mode' | 'validation_error' | null>(null);
  const [validationMsg, setValidationMsg] = useState('');

  const showNotif = (type: 'saved' | 'no_changes' | 'edit_mode' | 'validation_error', msg?: string) => {
    setNotification(type);
    if (msg !== undefined) setValidationMsg(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const validate = (): string | null => {
    const errors: string[] = [];
    const isSchool = !schoolInfo.entityType || schoolInfo.entityType === EntityType.SCHOOL;
    if (!schoolInfo.schoolName?.trim()) {
      errors.push(isSchool ? 'اسم المدرسة الأساسية' : `اسم ${schoolInfo.entityType || 'الكيان'}`);
    }
    if (isSchool && !(schoolInfo.phases && schoolInfo.phases.length > 0)) {
      errors.push('المرحلة الدراسية للمدرسة الأساسية');
    }
    if (isSchool) {
      (schoolInfo.sharedSchools || []).forEach((s, i) => {
        if (!s.name?.trim()) errors.push(`اسم المدرسة المشتركة (${i + 1})`);
        if (!(s.phases && s.phases.length > 0)) errors.push(`المرحلة الدراسية للمدرسة المشتركة (${i + 1})`);
      });
    }
    return errors.length > 0 ? `يرجى تعبئة: ${errors.join('، ')}` : null;
  };

  const handleSave = () => {
    const validationError = validate();
    if (validationError) {
      showNotif('validation_error', validationError);
      return;
    }
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
          {notification === 'validation_error' && (
            <div className="bg-rose-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-2xl">
              <XCircle size={20} className="shrink-0" />
              <span className="font-bold text-sm">{validationMsg}</span>
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
          <div className="mt-3 mb-8 px-2">
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
