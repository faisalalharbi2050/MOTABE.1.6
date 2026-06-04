import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { ClassInfo, ScheduleSettingsData, SchoolInfo, Specialization, Subject, Teacher } from '../../types';
import InlineScheduleView from './InlineScheduleView';
import { APP_STORAGE_KEY } from '../../utils/scheduleShare';

type ScheduleType =
  | 'general_teachers'
  | 'general_waiting'
  | 'general_classes'
  | 'individual_teacher'
  | 'individual_class';

type PrintJob = { type: ScheduleType; label: string; targetIds: string[] };

type PrintRequest = {
  jobs: PrintJob[];
  paperSize: 'A4' | 'A3';
  colorMode: 'color' | 'bw';
  perPage: number;
};

type AppDataShape = {
  schoolInfo?: SchoolInfo;
  scheduleSettings?: ScheduleSettingsData;
  teachers?: Teacher[];
  classes?: ClassInfo[];
  subjects?: Subject[];
  specializations?: Specialization[];
};

export const SCHEDULE_PRINT_REQUEST_PREFIX = 'motabe:schedule_print:';

const buildPrintCSS = (paperSize: 'A4' | 'A3', blackAndWhite: boolean) => `
  @page { size: ${paperSize} landscape; margin: 8mm; }
  @media print {
    html, body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      background: #fff !important;
      font-family: "Tajawal", sans-serif !important;
    }
    body * { visibility: hidden !important; }
    #schedule-print-root, #schedule-print-root * { visibility: visible !important; }
    #schedule-print-root { position: absolute !important; inset: 0 !important; width: 100% !important; background: #fff !important; }
    .no-print { display: none !important; }
    .print-page { break-after: page; page-break-after: always; }
    .print-page:last-child { break-after: auto; page-break-after: auto; }
    .print-grid-item { break-inside: avoid; page-break-inside: avoid; }
    .print-grid-item--flow { break-inside: auto !important; page-break-inside: auto !important; }
    #schedule-print-root thead { display: table-header-group !important; }
    #schedule-print-root thead th, #schedule-print-root tbody td, #schedule-print-root tbody th { position: static !important; }
    #schedule-print-root tbody tr { break-inside: avoid; page-break-inside: avoid; }
    ${blackAndWhite ? '#schedule-print-root { filter: grayscale(100%) !important; }' : ''}
    ${blackAndWhite ? '#schedule-print-root * { box-shadow: none !important; }' : ''}
  }
`;

interface Props {
  token: string;
}

const SchedulePrintPage: React.FC<Props> = ({ token }) => {
  const request = useMemo<PrintRequest | null>(() => {
    try {
      const raw = localStorage.getItem(`${SCHEDULE_PRINT_REQUEST_PREFIX}${token}`);
      return raw ? (JSON.parse(raw) as PrintRequest) : null;
    } catch {
      return null;
    }
  }, [token]);

  const appData = useMemo<AppDataShape | null>(() => {
    try {
      const raw = localStorage.getItem(APP_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const specializationNames = useMemo(
    () => Object.fromEntries((appData?.specializations || []).map(item => [item.id, item.name])),
    [appData?.specializations]
  );

  const ready = Boolean(
    request && appData?.scheduleSettings && appData.teachers && appData.classes && appData.subjects
  );

  const [printed, setPrinted] = useState(false);
  useEffect(() => {
    if (!ready || printed) return;
    const timer = window.setTimeout(() => {
      setPrinted(true);
      try { window.print(); } catch { /* المستخدم يطبع يدويًا عند الحاجة */ }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [ready, printed]);

  if (!ready || !request || !appData) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-slate-100">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-rose-500" />
          </div>
          <h2 className="text-lg font-black text-slate-800 mb-2">تعذّر تجهيز الطباعة</h2>
          <p className="text-sm text-slate-500 font-medium">انتهت صلاحية طلب الطباعة أو لا توجد بيانات. أعد المحاولة من صفحة الجداول.</p>
        </div>
      </div>
    );
  }

  const { jobs, paperSize, colorMode, perPage } = request;
  const blackAndWhite = colorMode === 'bw';
  const { teachers, classes, subjects, scheduleSettings } = appData as Required<AppDataShape>;

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      <style>{buildPrintCSS(paperSize, blackAndWhite)}</style>
      <div id="schedule-print-root" className="bg-white p-6 space-y-8">
        {jobs.map(job => {
          const gridClass = perPage >= 2 ? 'grid-cols-2' : 'grid-cols-1';
          const pages: string[][] =
            job.targetIds.length > 1
              ? Array.from({ length: Math.ceil(job.targetIds.length / perPage) }, (_, index) =>
                  job.targetIds.slice(index * perPage, index * perPage + perPage)
                )
              : [job.targetIds];

          return pages.map((pageIds, pageIndex) => (
            <div key={`${job.type}-${pageIndex}`} className="print-page rounded-[2rem] border border-slate-200 p-4 bg-white">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-800">{job.label}</h3>
                  <p className="text-xs font-bold text-slate-400">
                    {pageIds.length > 1 ? `عدد الجداول في الصفحة: ${pageIds.length}` : 'جدول واحد في الصفحة'}
                  </p>
                </div>
                <div className="text-xs font-black text-[#655ac1] bg-[#f4f2ff] border border-[#ddd7ff] px-3 py-1.5 rounded-full">
                  صفحة {pageIndex + 1}
                </div>
              </div>

              <div className={`grid ${gridClass} gap-4`}>
                {pageIds.map(targetId => {
                  const isGeneralJob = job.type !== 'individual_teacher' && job.type !== 'individual_class';
                  return (
                    <div
                      key={`${job.type}-${targetId || 'all'}`}
                      className={`print-grid-item rounded-2xl border border-slate-100 ${isGeneralJob ? 'print-grid-item--flow' : 'overflow-hidden'}`}
                    >
                      <div className="bg-white p-3">
                        {isGeneralJob ? (
                          <InlineScheduleView
                            type={job.type}
                            settings={scheduleSettings}
                            teachers={teachers}
                            classes={classes}
                            subjects={subjects}
                            specializationNames={specializationNames}
                            showWaitingManagement={false}
                            hideHeaderActionButton
                            hideGeneralFilterToolbar
                            printMode
                          />
                        ) : (
                          <InlineScheduleView
                            type={job.type}
                            settings={scheduleSettings}
                            teachers={teachers}
                            classes={classes}
                            subjects={subjects}
                            specializationNames={specializationNames}
                            targetId={targetId || undefined}
                            compactIndividual={pageIds.length > 1}
                            showWaitingManagement={false}
                            unifiedIndividual
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })}
      </div>
    </div>
  );
};

export default SchedulePrintPage;
