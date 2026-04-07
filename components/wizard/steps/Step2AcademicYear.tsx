import React from 'react';
import { SchoolInfo } from '../../../types';
import { CalendarDays } from 'lucide-react';
import SemesterManager from '../SemesterManager';

interface Step2Props {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
}

const Step2AcademicYear: React.FC<Step2Props> = ({ schoolInfo, setSchoolInfo }) => {

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSchoolInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const [isStarted, setIsStarted] = React.useState(false);

  const hasData = !!schoolInfo.academicYear || (schoolInfo.semesters && schoolInfo.semesters.length > 0);
  const showForm = isStarted || hasData;

  return (
    <div className="space-y-6 animate-in slide-in-from-left duration-500 pb-20">
       {/* Page Header - Matches Timing Page Style */}
       <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#8779fb]/10 rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>
          
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <CalendarDays size={20} strokeWidth={1.8} className="text-[#8779fb]" />
             العام الدراسي والفصول الدراسية
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">إعداد وتنظيم العام والفصول الدراسية</p>
       </div>

       {/* Content Section */}
       <div className={`bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 ${!showForm ? 'overflow-hidden' : ''}`}>
          
          {!showForm ? (
            <div className="text-center py-12 relative z-10">
                <div className="w-20 h-20 bg-[#8779fb]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <CalendarDays size={32} className="text-[#8779fb]" />
                </div>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                    <span className="text-slate-800 font-black text-lg block mb-2">لنبدأ في التنظيم</span>
                    حدد الفصول الدراسية والتقويم الدراسي
                </p>
                <button 
                    onClick={() => setIsStarted(true)}
                    className="px-8 py-3 bg-[#8779fb] text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-[#7668e5] hover:shadow-xl hover:shadow-indigo-300 transition-all transform hover:-translate-y-1"
                >
                    البدء بالإعداد
                </button>
            </div>
          ) : (
              <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 
                 <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
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
    </div>
  );
};

export default Step2AcademicYear;
