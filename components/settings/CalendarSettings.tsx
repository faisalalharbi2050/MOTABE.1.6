import React, { useState } from 'react';
import { CalendarDays, Check, CheckCircle2, ChevronRight, Settings2 } from 'lucide-react';
import { SchoolInfo } from '../../types';
import SemesterManager from '../wizard/SemesterManager';
import PrintCalendarModal from '../dashboard/PrintCalendarModal';
import { getLatestCalendar } from '../../constants/academicCalendars';

interface CalendarSettingsProps {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
}

type Screen = 'choose' | 'preset-region' | 'manager';

const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const formatDayName = (isoDate: string): string => {
  const d = new Date(isoDate + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? '' : DAYS_AR[d.getDay()];
};

const formatDate = (isoDate: string, calendar: 'hijri' | 'gregorian') => {
  const d = new Date(isoDate + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(
    calendar === 'hijri' ? 'ar-SA-u-ca-islamic-umalqura' : 'ar-SA',
    { day: 'numeric', month: 'long', year: 'numeric' }
  ).format(d);
};

const CalendarSettings: React.FC<CalendarSettingsProps> = ({ schoolInfo, setSchoolInfo }) => {
  const latestCalendar = getLatestCalendar();
  const hasData = !!(schoolInfo.semesters && schoolInfo.semesters.length > 0);
  const [screen, setScreen] = useState<Screen>(hasData ? 'manager' : 'choose');
  const [saved, setSaved] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [printDefaultId, setPrintDefaultId] = useState<string | undefined>();

  const handleAdopt = (regionId: string) => {
    if (!latestCalendar) return;
    const region = latestCalendar.regions.find(r => r.id === regionId);
    if (!region) return;

    const newSemesters = region.semesters.map((sem, order) => ({
      ...sem,
      id: `preset-${Date.now()}-${order}`,
      isCurrent: order === 0,
    }));

    setSchoolInfo(prev => ({
      ...prev,
      academicYear: latestCalendar.year,
      semesters: newSemesters,
      currentSemesterId: newSemesters[0]?.id,
    }));
    setScreen('manager');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  const saveCurrentSettings = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10" dir="rtl">
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <CalendarDays size={36} strokeWidth={1.8} className="text-[#655ac1]" />
              التقويم
            </h3>
            <p className="text-slate-500 font-medium mt-2 mr-12">إعداد صيغة التواريخ والتقويم الدراسي للفصول</p>
          </div>
        </div>
      </div>

      <section className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-4">
          <Settings2 size={20} strokeWidth={1.8} className="text-[#8779fb] shrink-0" />
          صيغة عرض التواريخ
        </h3>
        <p className="text-[11px] font-bold text-slate-400 mb-4 -mt-2 leading-5">تُطبَّق هذه الصيغة على عرض جميع التواريخ في كل الصفحات.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          {([
            { value: 'hijri', label: 'هجري' },
            { value: 'gregorian', label: 'ميلادي' },
          ] as const).map(option => {
            const active = (schoolInfo.calendarType || 'hijri') === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setSchoolInfo(prev => ({ ...prev, calendarType: option.value }))}
                className={`w-full px-4 py-3 rounded-2xl text-sm font-black border transition-all flex items-center justify-between ${
                  active
                    ? 'bg-white text-[#655ac1] border-slate-300 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#cfc8ff] hover:text-[#655ac1]'
                }`}
              >
                {option.label}
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                  active ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                }`}>
                  <Check size={12} strokeWidth={3.5} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <CalendarDays size={26} strokeWidth={1.6} className="text-[#8779fb] shrink-0" />
            <div>
              <h3 className="text-lg font-black text-slate-800">التقويم الدراسي</h3>
              <p className="text-xs font-bold text-slate-400 mt-0.5">إعداد التقويم الجاهز أو المخصص وإدارة الفصول والطباعة.</p>
            </div>
          </div>
          {hasData && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block" />
              {schoolInfo.semesters?.length ?? 0} فصول
            </span>
          )}
        </div>

        <div className="p-6">
          {screen === 'choose' && (
            <div className="max-w-2xl mx-auto py-4">
              <p className="text-center text-sm font-bold text-slate-500 mb-5">
                كيف تريد إعداد تقويمك الدراسي؟
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setScreen('preset-region')}
                  className="flex flex-col items-center gap-1.5 p-6 rounded-2xl border-2 border-slate-200 bg-white hover:border-[#8779fb] hover:shadow-md transition-all duration-200 text-center"
                >
                  <p className="text-sm font-black text-slate-800">تقويم جاهز</p>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed">اختيار المنطقة ثم اعتماد التقويم الدراسي.</p>
                </button>

                <button
                  onClick={() => setScreen('manager')}
                  className="flex flex-col items-center gap-1.5 p-6 rounded-2xl border-2 border-slate-200 bg-white hover:border-[#8779fb] hover:shadow-md transition-all duration-200 text-center"
                >
                  <p className="text-sm font-black text-slate-800">تقويم مخصص</p>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed">إدارة الفصول والتواريخ والأيام الدراسية يدويًا.</p>
                </button>
              </div>
            </div>
          )}

          {screen === 'preset-region' && latestCalendar && (
            <div className="space-y-5">
              <button
                onClick={() => setScreen(hasData ? 'manager' : 'choose')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 bg-white rounded-xl px-3 py-1.5 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight size={14} />
                {hasData ? 'العودة للتقويم الحالي' : 'تغيير طريقة الإعداد'}
              </button>

              <p className="text-center text-xs font-bold text-[#8779fb]">
                تقويم جاهز لمنطقتك، ويمكن تعديله بعد الاعتماد.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {latestCalendar.regions.map(region => (
                  <div key={region.id} className="flex flex-col border border-slate-200 bg-white rounded-2xl overflow-hidden">
                    <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                      <p className="font-black text-slate-800 text-base mb-1">{region.name}</p>
                      <p className="text-xs font-bold text-slate-400">
                        {region.cities.length > 0 ? region.cities.join(' · ') : 'جميع مناطق المملكة عدا المدن المحددة'}
                      </p>
                    </div>

                    <div className="px-5 py-4 flex-1 space-y-4">
                      {region.semesters.map((sem, idx) => (
                        <div key={idx} className="text-right border-b last:border-b-0 border-slate-100 pb-4 last:pb-0">
                          <p className="text-sm font-black text-slate-800">{sem.name}</p>
                          <p className="text-[11px] font-bold text-slate-500 mt-1.5">البداية · {formatDayName(sem.startDate)}</p>
                          <p className="text-xs font-bold text-slate-600">{formatDate(sem.startDate, 'hijri')}</p>
                          <p className="text-xs font-medium text-slate-400">{formatDate(sem.startDate, 'gregorian')}</p>
                          <p className="text-[11px] font-bold text-slate-500 mt-2">النهاية · {formatDayName(sem.endDate)}</p>
                          <p className="text-xs font-bold text-slate-600">{formatDate(sem.endDate, 'hijri')}</p>
                          <p className="text-xs font-medium text-slate-400">{formatDate(sem.endDate, 'gregorian')}</p>
                        </div>
                      ))}
                    </div>

                    <div className="px-5 py-4 border-t border-slate-100">
                      <button
                        onClick={() => handleAdopt(region.id)}
                        className="w-full py-2.5 border border-slate-200 bg-white text-[#655ac1] text-sm font-black rounded-xl transition-all hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1]"
                      >
                        اعتماد التقويم
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {screen === 'manager' && (
            <div className="space-y-4">
              <SemesterManager
                semesters={schoolInfo.semesters || []}
                setSemesters={(semesters) => {
                  setSchoolInfo(prev => ({ ...prev, semesters }));
                  if (semesters.length === 0) setScreen('choose');
                }}
                currentSemesterId={schoolInfo.currentSemesterId}
                setCurrentSemesterId={(id) => setSchoolInfo(prev => ({ ...prev, currentSemesterId: id }))}
                academicYear={schoolInfo.academicYear || ''}
                onAcademicYearChange={(year) => setSchoolInfo(prev => ({ ...prev, academicYear: year }))}
                onPrintSemester={(sem) => {
                  setPrintDefaultId(sem.id);
                  setShowPrint(true);
                }}
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-400">
            {hasData ? 'يمكن تحديد الفصل الحالي وطباعة التقويم من إدارة الفصول.' : 'ابدأ بتقويم جاهز أو تقويم مخصص.'}
          </span>
          <button
            onClick={saveCurrentSettings}
            className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all shadow-sm ${
              saved ? 'bg-emerald-500 text-white' : 'bg-[#655ac1] text-white hover:bg-[#5548b0] shadow-[#655ac1]/20'
            }`}
          >
            <CheckCircle2 size={16} />
            {saved ? 'تم الحفظ' : 'حفظ'}
          </button>
        </div>
      </section>

      {showPrint && (
        <PrintCalendarModal
          isOpen={showPrint}
          onClose={() => { setShowPrint(false); setPrintDefaultId(undefined); }}
          semesters={schoolInfo.semesters || []}
          academicYear={schoolInfo.academicYear || ''}
          schoolInfo={schoolInfo}
          defaultSemesterId={printDefaultId}
        />
      )}
    </div>
  );
};

export default CalendarSettings;
