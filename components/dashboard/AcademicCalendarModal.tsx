import React, { useState } from 'react';
import { X, Calendar, CalendarDays, CheckCircle2 } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
        style={{
          maxWidth: '896px',
          borderRadius: '28px',
          boxShadow: '0 40px 100px rgba(101,90,193,0.25), 0 12px 32px rgba(0,0,0,0.14)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <CalendarDays size={36} strokeWidth={1.8} className="text-[#8779fb]" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">التقويم الدراسي</h3>
              <p className="text-sm font-bold text-slate-500 mt-0.5">إعداد وتنظيم العام والفصول الدراسية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
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
                className="px-8 py-3 bg-white text-[#655ac1] border border-slate-200 rounded-xl font-bold shadow-sm hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] transition-all"
              >
                البدء بالإعداد
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Clarification Notes - shown at top, hidden after adding year and semesters */}
              {!hideNotes && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  {[
                    { step: 1, text: 'اختر نوع التقويم الهجري أو الميلادي' },
                    { step: 2, text: 'حدد العام الدراسي وأضف فصوله الدراسية' },
                    { step: 3, text: 'أدخل تاريخ بداية ونهاية كل فصل' },
                    { step: 4, text: 'حدد أيام العطل والإجازات الرسمية' },
                  ].map(({ step, text }, i, arr) => (
                    <div key={step} className={`flex items-center gap-3 px-4 py-2.5 ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center">
                          <span className="text-[10px] font-black text-[#655ac1]">{step}</span>
                        </div>
                        {i < arr.length - 1 && <div className="w-px h-3 bg-slate-200 mt-0.5" />}
                      </div>
                      <p className="text-xs font-bold text-slate-600">{text}</p>
                    </div>
                  ))}

                  {/* النتيجة */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-[#f3f0ff] border-t border-[#e5e1fe]">
                    <CheckCircle2 size={14} className="text-[#655ac1] shrink-0" />
                    <p className="text-xs font-black text-[#655ac1]">سيحسب النظام عدد الأسابيع الدراسية تلقائياً</p>
                  </div>
                </div>
              )}

              {/* Semesters Management */}
              <SemesterManager
                semesters={schoolInfo.semesters || []}
                setSemesters={(semesters) => setSchoolInfo(prev => ({ ...prev, semesters }))}
                currentSemesterId={schoolInfo.currentSemesterId}
                setCurrentSemesterId={(id) => setSchoolInfo(prev => ({ ...prev, currentSemesterId: id }))}
                academicYear={schoolInfo.academicYear || ''}
                onAcademicYearChange={(year) => setSchoolInfo(prev => ({ ...prev, academicYear: year }))}
              />
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
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
            >
              إغلاق
            </button>
            {hasData && (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#655ac1] text-white rounded-xl font-black hover:bg-[#5548b0] transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5"
              >
                حفظ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicCalendarModal;
