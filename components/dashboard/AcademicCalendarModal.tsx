import React, { useState } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { SchoolInfo } from '../../types';
import SemesterManager from '../wizard/SemesterManager';

interface AcademicCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
}

const AcademicCalendarModal: React.FC<AcademicCalendarModalProps> = ({
  isOpen,
  onClose,
  schoolInfo,
  setSchoolInfo
}) => {
  const [isStarted, setIsStarted] = useState(false);
  
  const hasData = !!schoolInfo.academicYear || (schoolInfo.semesters && schoolInfo.semesters.length > 0);
  const showForm = isStarted || hasData;
  const hideNotes = !!(schoolInfo.academicYear && schoolInfo.semesters && schoolInfo.semesters.length > 0);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#655ac1]/5 to-[#8779fb]/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#655ac1]/10 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-[#655ac1]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">التقويم الدراسي</h3>
              <p className="text-sm text-slate-500">إعداد وتنظيم العام والفصول الدراسية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {!showForm ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-[#8779fb]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Calendar size={40} className="text-[#8779fb]" />
              </div>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                حدد الفصول الدراسية والتقويم الدراسي للعام الحالي
              </p>
              <button 
                onClick={() => setIsStarted(true)}
                className="px-8 py-3 bg-[#8779fb] text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-[#7668e5] hover:shadow-xl hover:shadow-indigo-300 transition-all transform hover:-translate-y-1"
              >
                البدء بالإعداد
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Clarification Notes - shown at top, hidden after adding year and semesters */}
              {!hideNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <h5 className="font-bold text-amber-800 text-sm mb-2">توضيح :</h5>
                      <ul className="text-xs text-amber-700 space-y-1.5">
                        <li>• يمكنك اختيار نوع التقويم هجري / ميلادي</li>
                        <li>• يمكنك اختيار العام الدراسي وإضافة الفصول الدراسية</li>
                        <li>• حدد تاريخ البدء والانتهاء لكل فصل دراسي</li>
                        <li>• يمكنك تحديد أيام العطل الرسمية والإجازات بنقرة زر</li>
                        <li>• النظام سيحسب تلقائياً عدد الأسابيع الدراسية</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Semesters Management */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar size={20} className="text-[#655ac1]" />
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
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            {hasData ? (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                تم إعداد {schoolInfo.semesters?.length || 0} فصل دراسي
              </span>
            ) : (
              <span>لم يتم إعداد التقويم الدراسي بعد</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
            >
              إغلاق
            </button>
            {hasData && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-white bg-[#655ac1] hover:bg-[#5448b0] rounded-xl transition-colors shadow-sm"
              >
                حفظ وإغلاق
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicCalendarModal;
