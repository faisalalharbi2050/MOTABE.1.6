import React, { useState } from 'react';
import { X, CalendarDays, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { SchoolInfo } from '../../types';
import SemesterManager from '../wizard/SemesterManager';
import PrintCalendarModal from './PrintCalendarModal';
import { getLatestCalendar } from '../../constants/academicCalendars';

interface AcademicCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
}

type Screen = 'choose' | 'preset-region' | 'manager';

const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// اسم اليوم: "الأحد"
function formatDayName(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return DAYS_AR[d.getDay()];
  } catch { return ''; }
}

// التاريخ الهجري: "١٩ صفر ١٤٤٧ هـ" — بأرقام عربية لا تُسبب مشكلة BiDi
function formatHijriDate(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(d);
  } catch { return ''; }
}

// التاريخ الميلادي: "١٤ سبتمبر ٢٠٢٥"
function formatGreg(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(d);
  } catch { return ''; }
}

// ─────────────────────────────────────────────────────────────────────
const AcademicCalendarModal: React.FC<AcademicCalendarModalProps> = ({
  isOpen,
  onClose,
  schoolInfo,
  setSchoolInfo,
}) => {
  const latestCalendar = getLatestCalendar();
  const hasData = !!(schoolInfo.semesters && schoolInfo.semesters.length > 0);

  const [screen, setScreen] = useState<Screen>(hasData ? 'manager' : 'choose');
  const [saved, setSaved]   = useState(false);
  const [showPrint, setShowPrint]           = useState(false);
  const [printDefaultId, setPrintDefaultId] = useState<string | undefined>();

  if (!isOpen) return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

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
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        dir="rtl"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
          style={{
            maxWidth: '860px',
            borderRadius: '28px',
            boxShadow: '0 40px 100px rgba(101,90,193,0.22), 0 12px 32px rgba(0,0,0,0.13)',
          }}
          onClick={e => e.stopPropagation()}
        >

          {/* ══ رأس النافذة ═══════════════════════════════════════ */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-3">
              {/* أيقونة بدون خلفية — أكبر */}
              <CalendarDays size={26} strokeWidth={1.6} className="text-[#8779fb] shrink-0" />
              <div>
                <h3 className="text-lg font-black text-slate-800">التقويم الدراسي</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">إعداد وتنظيم العام والفصول الدراسية</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* ══ المحتوى ═══════════════════════════════════════════ */}
          <div className="p-6 overflow-y-auto flex-1">

            {/* ── شاشة ١: اختيار الطريقة ─────────────────────── */}
            {screen === 'choose' && (
              <div className="max-w-lg mx-auto py-4">
                <p className="text-center text-sm font-bold text-slate-500 mb-5">
                  كيف تريد إعداد تقويمك الدراسي؟
                </p>
                <div className="flex flex-col sm:flex-row gap-4">

                  <button
                    onClick={() => setScreen('preset-region')}
                    className="flex-1 flex flex-col items-center gap-1.5 p-6 rounded-2xl border-2 border-slate-200 bg-white hover:border-[#8779fb] hover:shadow-md transition-all duration-200 text-center"
                  >
                    <p className="text-sm font-black text-slate-800">
                      تقويم دراسي جاهز
                    </p>
                    <p className="text-xs font-bold text-slate-400 leading-relaxed">
                      تقويم جاهز وفق المناطޡ ويمكنك اعتماده أو تعديله
                    </p>
                  </button>

                  <button
                    onClick={() => setScreen('manager')}
                    className="flex-1 flex flex-col items-center gap-1.5 p-6 rounded-2xl border-2 border-slate-200 bg-white hover:border-[#8779fb] hover:shadow-md transition-all duration-200 text-center"
                  >
                    <p className="text-sm font-black text-slate-800">تقويم دراسي مخصص</p>
                    <p className="text-xs font-bold text-slate-400 mt-1 leading-relaxed">
                      إدخال التواريخ والأيام الدراسية يدوياً
                    </p>
                  </button>

                </div>
              </div>
            )}

            {/* ── شاشة ٢: اختيار المنطقة ─────────────────────── */}
            {screen === 'preset-region' && latestCalendar && (
              <div className="space-y-5">

                {/* زر العودة — إطار رمادي + سهم لليمين */}
                <button
                  onClick={() => setScreen(hasData ? 'manager' : 'choose')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 bg-white rounded-xl px-3 py-1.5 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight size={14} />
                  {hasData ? 'العودة للتقويم الحالي' : 'تغيير طريقة الإعداد'}
                </button>

                {/* ملاحظة مرجعية — بنفسجية */}
                <p className="text-center text-xs font-bold text-[#8779fb]">
                  تقويم جاهز لمنطقتك — قابل للتعديل
                </p>

                {/* بطاقات المناطق */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {latestCalendar.regions.map(region => (
                    <div
                      key={region.id}
                      className="flex flex-col border border-slate-200 bg-white rounded-2xl overflow-hidden"
                    >
                      {/* رأس البطاقة */}
                      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                        <p className="font-black text-slate-800 text-base mb-1">{region.name}</p>
                        <p className="text-xs font-bold text-slate-400">
                          {region.cities.length > 0
                            ? region.cities.join('  ·  ')
                            : 'جميع مناطق المملكة عدا المدن الأربع'}
                        </p>
                      </div>

                      {/* الفصول — عرض فقط بدون شيك بوكس */}
                      <div className="px-5 py-4 flex-1">
                        {region.semesters.map((sem, idx) => (
                          <React.Fragment key={idx}>
                            {idx > 0 && (
                              <div className="my-4 flex items-center gap-3">
                                <div className="flex-1 h-px bg-slate-100" />
                                <span className="text-[10px] font-bold text-slate-300 shrink-0">✦</span>
                                <div className="flex-1 h-px bg-slate-100" />
                              </div>
                            )}
                            <div className="text-right">
                              <p className="text-sm font-black text-slate-800">
                                {sem.name}
                              </p>
                              <p className="text-[11px] font-bold text-slate-500 mt-1.5">
                                البداية · {formatDayName(sem.startDate)}
                              </p>
                              <p className="text-xs font-bold text-slate-600">
                                {formatHijriDate(sem.startDate)}
                              </p>
                              <p className="text-xs font-medium text-slate-400">
                                {formatGreg(sem.startDate)}
                              </p>
                              <div className="my-1.5 border-t border-dashed border-slate-100" />
                              <p className="text-[11px] font-bold text-slate-500">
                                النهاية · {formatDayName(sem.endDate)}
                              </p>
                              <p className="text-xs font-bold text-slate-600">
                                {formatHijriDate(sem.endDate)}
                              </p>
                              <p className="text-xs font-medium text-slate-400">
                                {formatGreg(sem.endDate)}
                              </p>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>

                      {/* زر الاعتماد */}
                      <div className="px-5 py-4 border-t border-slate-100">
                        <button
                          onClick={() => handleAdopt(region.id)}
                          className="w-full py-2.5 border border-slate-200 bg-white text-[#655ac1] text-sm font-black rounded-xl transition-all hover:bg-[#655ac1] hover:text-white hover:border-[#655ac1] hover:-translate-y-0.5 active:translate-y-0"
                        >
                          اعتماد التقويم
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* ── شاشة ٣: مدير الفصول ────────────────────────── */}
            {screen === 'manager' && (
              <div className="space-y-4">

                {/* زر تغيير / إضافة — إطار رمادي + سهم لليمين */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setScreen('choose')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 bg-white rounded-xl px-3 py-1.5 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight size={13} />
                    تغيير / إضافة التقويم
                  </button>
                </div>

                <SemesterManager
                  semesters={schoolInfo.semesters || []}
                  setSemesters={(semesters) =>
                    setSchoolInfo(prev => ({ ...prev, semesters }))
                  }
                  currentSemesterId={schoolInfo.currentSemesterId}
                  setCurrentSemesterId={(id) =>
                    setSchoolInfo(prev => ({ ...prev, currentSemesterId: id }))
                  }
                  academicYear={schoolInfo.academicYear || ''}
                  onAcademicYearChange={(year) =>
                    setSchoolInfo(prev => ({ ...prev, academicYear: year }))
                  }
                  onPrintSemester={(sem) => {
                    setPrintDefaultId(sem.id);
                    setShowPrint(true);
                  }}
                />
              </div>
            )}

          </div>

          {/* ══ تذييل النافذة ════════════════════════════════════ */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-between items-center shrink-0">
            <div className="text-xs font-bold text-slate-400">
              {hasData ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block" />
                  {(() => {
                    const n = schoolInfo.semesters?.length ?? 0;
                    if (n === 1) return 'فصل دراسي واحد';
                    if (n === 2) return 'فصلان دراسيان';
                    if (n === 3) return 'ثلاثة فصول دراسية';
                    return `${n} فصول دراسية`;
                  })()}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <AlertCircle size={13} className="text-slate-400" />
                  لم يتم إعداد التقويم الدراسي بعد
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
              >
                إغلاق
              </button>
              {hasData && (
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 shadow-sm hover:-translate-y-0.5 ${
                    saved
                      ? 'bg-emerald-500 text-white scale-105'
                      : 'bg-[#655ac1] text-white hover:bg-[#5548b0]'
                  }`}
                >
                  {saved ? <><CheckCircle2 size={15} />تم الحفظ</> : 'حفظ'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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
    </>
  );
};

export default AcademicCalendarModal;
