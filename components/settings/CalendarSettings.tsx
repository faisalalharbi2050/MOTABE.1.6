import React, { useState } from 'react';
import { CalendarDays, Check, ChevronRight, Settings2, CalendarCheck, SlidersHorizontal, MapPin } from 'lucide-react';
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
  const primaryCal = (schoolInfo.calendarType || 'hijri') as 'hijri' | 'gregorian';
  const secondaryCal: 'hijri' | 'gregorian' = primaryCal === 'hijri' ? 'gregorian' : 'hijri';
  // الفصول المعتمَدة من تقويم جاهز تبدأ معرّفاتها بـ preset-
  const isPresetCalendar = !!(schoolInfo.semesters && schoolInfo.semesters.length > 0 && schoolInfo.semesters.every(s => String(s.id).startsWith('preset-')));
  const [screen, setScreen] = useState<Screen>(hasData ? 'manager' : 'choose');
  const [showPrint, setShowPrint] = useState(false);
  const [printDefaultId, setPrintDefaultId] = useState<string | undefined>();

  const applyCalendarType = (calendarType: 'hijri' | 'gregorian') => {
    setSchoolInfo(prev => ({
      ...prev,
      calendarType,
      semesters: (prev.semesters || []).map(semester => ({
        ...semester,
        calendarType,
      })),
    }));
  };

  const handleAdopt = (regionId: string) => {
    if (!latestCalendar) return;
    const region = latestCalendar.regions.find(r => r.id === regionId);
    if (!region) return;

    const newSemesters = region.semesters.map((sem, order) => ({
      ...sem,
      calendarType: primaryCal,
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
          <Settings2 size={20} strokeWidth={1.8} className="text-[#655ac1] shrink-0" />
          صيغة عرض التواريخ
        </h3>
        <p className="text-xs font-medium text-slate-400 mb-4 -mt-2 leading-5">تُطبَّق هذه الصيغة على عرض جميع التواريخ في كل الصفحات.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          {([
            { value: 'hijri', label: 'هجري' },
            { value: 'gregorian', label: 'ميلادي' },
          ] as const).map(option => {
            const active = (schoolInfo.calendarType || 'hijri') === option.value;
            return (
              <button
                key={option.value}
                onClick={() => applyCalendarType(option.value)}
                className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border transition-all flex items-center justify-between ${
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
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays size={24} strokeWidth={1.7} className="text-[#655ac1] shrink-0" />
            <div>
              <h3 className="text-lg font-black text-slate-800">التقويم الدراسي</h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">اعداد التقويم الجاهز أو المخصص لإدارة الفصول الدراسية.</p>
            </div>
          </div>
          {hasData && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#655ac1] bg-white border border-slate-200 px-3 py-1.5 rounded-full">
              {schoolInfo.semesters?.length ?? 0} فصول دراسية
            </span>
          )}
        </div>

        <div className="p-6">
          {screen === 'choose' && (
            <div className="max-w-2xl mx-auto py-4">
              <p className="text-center text-sm font-semibold text-slate-500 mb-6">
                كيف تريد إعداد تقويمك الدراسي؟
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setScreen('preset-region')}
                  className="group flex flex-col items-center gap-3 p-7 rounded-2xl border border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm transition-all duration-200 text-center"
                >
                  <CalendarCheck size={32} strokeWidth={1.6} className="text-[#655ac1]" />
                  <span className="space-y-1">
                    <span className="block text-sm font-black text-slate-800">تقويم جاهز</span>
                    <span className="block text-xs font-medium text-slate-400 leading-relaxed">اختيار المنطقة ثم اعتماد التقويم الدراسي.</span>
                  </span>
                </button>

                <button
                  onClick={() => setScreen('manager')}
                  className="group flex flex-col items-center gap-3 p-7 rounded-2xl border border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm transition-all duration-200 text-center"
                >
                  <SlidersHorizontal size={32} strokeWidth={1.6} className="text-[#655ac1]" />
                  <span className="space-y-1">
                    <span className="block text-sm font-black text-slate-800">تقويم مخصص</span>
                    <span className="block text-xs font-medium text-slate-400 leading-relaxed">إدارة الفصول والتواريخ والأيام الدراسية يدويًا.</span>
                  </span>
                </button>
              </div>
            </div>
          )}

          {screen === 'preset-region' && latestCalendar && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-black text-slate-800">اختر تقويم منطقتك</h4>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">يمكنك تعديل الفصول والإجازات بعد الاعتماد.</p>
                </div>
                <button
                  onClick={() => setScreen(hasData ? 'manager' : 'choose')}
                  className="inline-flex items-center gap-1.5 shrink-0 text-xs font-bold text-slate-600 border border-slate-200 bg-white rounded-xl px-3.5 py-2 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight size={15} />
                  {hasData ? 'رجوع' : 'تغيير الطريقة'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {latestCalendar.regions.map(region => (
                  <div key={region.id} className="group flex flex-col border border-slate-200 bg-white rounded-2xl overflow-hidden transition-all hover:border-slate-300 hover:shadow-md">
                    <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#655ac1]/8 text-[#655ac1] shrink-0">
                        <MapPin size={20} strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 text-base leading-tight">{region.name}</p>
                        <p className="text-xs font-medium text-slate-400 mt-1 leading-relaxed">
                          {region.cities.length > 0 ? region.cities.join(' · ') : 'جميع مناطق المملكة عدا المدن المحددة'}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 py-4 flex-1 space-y-3">
                      {region.semesters.map((sem, idx) => (
                        <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                          <p className="text-xs font-black text-slate-700 mb-2.5">{sem.name}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { lbl: 'البداية', date: sem.startDate },
                              { lbl: 'النهاية', date: sem.endDate },
                            ] as const).map(col => (
                              <div key={col.lbl} className="space-y-0.5">
                                <p className="text-[10px] font-bold text-slate-400">{col.lbl} · {formatDayName(col.date)}</p>
                                <p className="text-xs font-bold text-slate-700 leading-tight">{formatDate(col.date, primaryCal)}</p>
                                <p className="text-[10px] font-medium text-slate-400 leading-tight">{formatDate(col.date, secondaryCal)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="px-5 py-4 border-t border-slate-100 flex justify-center">
                      <button
                        onClick={() => handleAdopt(region.id)}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#655ac1] hover:bg-[#52499d] text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-200 transition-all"
                      >
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1]">
                          <Check size={13} strokeWidth={3.2} className="text-white" />
                        </span>
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
              {!hasData && (
                <button
                  onClick={() => setScreen('choose')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 bg-white rounded-xl px-3.5 py-2 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight size={15} />
                  تغيير الطريقة
                </button>
              )}
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
                calendarType={primaryCal}
                canAddSemester={!isPresetCalendar}
                onPrintSemester={(sem) => {
                  setPrintDefaultId(sem.id);
                  setShowPrint(true);
                }}
              />
            </div>
          )}
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
