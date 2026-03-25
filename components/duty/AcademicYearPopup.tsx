import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { SchoolInfo } from '../../types';
import { Button } from '../ui/Button';
import SemesterManager from '../wizard/SemesterManager';

interface Props {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
  onOpenAcademicCalendar?: () => void;
}

const AcademicYearPopup: React.FC<Props> = ({ schoolInfo, setSchoolInfo, onClose, onOpenAcademicCalendar }) => {
  const hasData = !!schoolInfo.academicYear || (schoolInfo.semesters && schoolInfo.semesters.length > 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-5 rounded-t-2xl flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <CalendarIcon size={20} className="text-[#655ac1]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">إعداد العام الدراسي</h3>
            <p className="text-xs text-slate-400">أضف بيانات الفصل الدراسي لإنشاء جدول المناوبة بشكل صحيح</p>
          </div>
        </div>

        {/* Info */}
        <div className="px-5 pt-4 shrink-0">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-sm text-indigo-700 font-medium leading-relaxed">
            لإنشاء جدول المناوبة بشكل صحيح يجب إضافة تواريخ بداية ونهاية الفصل الدراسي لتوزيع المناوبين
          </div>
        </div>

        {/* Content - SemesterManager */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
            <div className="flex items-center gap-3 mb-4">
              <CalendarIcon size={20} className="text-[#655ac1]" />
              <h4 className="font-bold text-slate-800">إدارة الفصول الدراسية</h4>
            </div>
            <SemesterManager
              semesters={schoolInfo.semesters || []}
              setSemesters={(semesters) => setSchoolInfo(prev => ({ ...prev, semesters }))}
              currentSemesterId={schoolInfo.currentSemesterId}
              setCurrentSemesterId={(id) => setSchoolInfo(prev => ({ ...prev, currentSemesterId: id }))}
              academicYear={schoolInfo.academicYear || ''}
              onAcademicYearChange={(year) => setSchoolInfo(prev => ({ ...prev, academicYear: year }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 p-5 rounded-b-2xl flex flex-wrap items-center justify-between gap-3 shrink-0">
          {onOpenAcademicCalendar ? (
            <button
              onClick={() => { onClose(); onOpenAcademicCalendar(); }}
              className="text-sm text-[#655ac1] hover:underline underline-offset-2"
            >
              فتح التقويم الدراسي ←
            </button>
          ) : <span />}
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="border">تخطي الآن</Button>
            {hasData && (
              <Button variant="primary" onClick={onClose}>
                حفظ وإغلاق
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AcademicYearPopup;
