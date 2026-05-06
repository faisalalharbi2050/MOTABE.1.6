import React from 'react';
import { DutyReportRecord, SchoolInfo } from '../../types';
import { DAY_NAMES } from '../../utils/dutyUtils';

interface Props {
  report: DutyReportRecord;
  schoolInfo: SchoolInfo;
  minLateRows?: number;
  minViolationRows?: number;
}

const formatHijriDate = (date?: string) => {
  if (!date) return '-';
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(parsed);
};

const printDateAr = () => {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  } catch { return ''; }
};

const DutyReportPreview: React.FC<Props> = ({ report, schoolInfo, minLateRows = 7, minViolationRows = 7 }) => {
  const principalName = schoolInfo.principal || (schoolInfo as any).managerName || '';
  const eduAdmin = schoolInfo.educationAdministration
    || (schoolInfo.region ? `الإدارة العامة للتعليم بمنطقة ${schoolInfo.region}` : 'إدارة التعليم');

  const lateRows = report.lateStudents || [];
  const violationRows = report.violatingStudents || [];

  const padded = <T,>(rows: T[], min: number) => {
    const result: (T | null)[] = [...rows];
    while (result.length < min) result.push(null);
    return result;
  };

  const th = 'border border-slate-300 bg-[#a59bf0] text-white font-black p-1.5 text-[11px] text-center';
  const td = 'border border-slate-300 p-1.5 text-[11px] text-center text-slate-700';

  return (
    <div className="bg-white p-5 sm:p-7 rounded-md border border-slate-200 space-y-3" dir="rtl">
      {/* Official 3-column header */}
      <div className="grid grid-cols-3 gap-2 items-start pb-2 border-b-2 border-slate-800">
        <div className="text-right text-[10px] sm:text-[11px] font-extrabold text-slate-800 leading-relaxed space-y-0.5">
          <p>المملكة العربية السعودية</p>
          <p>وزارة التعليم</p>
          <p>{eduAdmin}</p>
          <p>مدرسة {schoolInfo.schoolName || '........................'}</p>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          {schoolInfo.logo ? (
            <img src={schoolInfo.logo} alt="شعار المدرسة" className="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-black text-slate-400">شعار</div>
          )}
        </div>
        <div className="text-left text-[10px] sm:text-[11px] font-extrabold text-slate-800 leading-relaxed space-y-0.5">
          <p>العام الدراسي: {schoolInfo.academicYear || ''}</p>
          <p>تاريخ الطباعة: {printDateAr()}</p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center font-black text-slate-900 text-lg sm:text-xl pt-1">تقرير المناوبة اليومية</div>

      {/* Day / Date */}
      <div className="grid grid-cols-2 gap-2 max-w-[560px] mx-auto">
        <div className="border border-slate-300 rounded-lg px-3 py-2 text-[12px] font-black">
          <span className="text-slate-500 ml-1.5">اليوم:</span>
          <span className="text-slate-800">{DAY_NAMES[report.day] || report.day || '-'}</span>
        </div>
        <div className="border border-slate-300 rounded-lg px-3 py-2 text-[12px] font-black">
          <span className="text-slate-500 ml-1.5">التاريخ:</span>
          <span className="text-slate-800">{formatHijriDate(report.date)}</span>
        </div>
      </div>

      {/* أولاً: المناوبون */}
      <div className="pt-2">
        <p className="text-[#655ac1] font-black text-[13px] mb-1">أولاً: المناوبون</p>
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th className={th} style={{ width: '8%' }}>م</th>
              <th className={th} style={{ width: '34%' }}>المناوب</th>
              <th className={th} style={{ width: '24%' }}>التوقيع</th>
              <th className={th} style={{ width: '34%' }}>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={td}>1</td>
              <td className={`${td} font-black text-slate-800`}>{report.staffName}</td>
              <td className="border border-slate-300 p-1 h-[48px]">
                {report.signature ? (
                  <img src={report.signature} alt="توقيع" className="max-h-9 max-w-[120px] object-contain mx-auto" />
                ) : (
                  <div className="h-full w-full border border-dashed border-slate-300 rounded flex items-center justify-center text-[9px] font-black text-slate-400 bg-slate-50/60">
                    خانة توقيع المناوب
                  </div>
                )}
              </td>
              <td className={td}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ثانيًا: الطلاب المتأخرون */}
      <div className="pt-1">
        <p className="text-[#655ac1] font-black text-[13px] mb-1">ثانيًا: الطلاب المتأخرون</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: '720px' }}>
            <thead>
              <tr>
                <th className={th} style={{ width: '7%' }}>م</th>
                <th className={th} style={{ width: '24%' }}>اسم الطالب</th>
                <th className={th} style={{ width: '16%' }}>الصف / الفصل</th>
                <th className={th} style={{ width: '15%' }}>زمن الانصراف</th>
                <th className={th} style={{ width: '18%' }}>الإجراء</th>
                <th className={th} style={{ width: '20%' }}>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {padded(lateRows, Math.max(minLateRows, lateRows.length)).map((s, i) => (
                <tr key={`late-${i}`}>
                  <td className={td}>{i + 1}</td>
                  <td className={`${td} text-right`}>{s?.studentName || ''}</td>
                  <td className={td}>{s?.gradeAndClass || ''}</td>
                  <td className={td}>{s?.exitTime || ''}</td>
                  <td className={`${td} text-right`}>{s?.actionTaken || ''}</td>
                  <td className={`${td} text-right`}>{s?.notes || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ثالثًا: الطلاب المخالفون سلوكيًا */}
      <div className="pt-1">
        <p className="text-[#655ac1] font-black text-[13px] mb-1">ثالثًا: الطلاب المخالفون سلوكيًا</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: '720px' }}>
            <thead>
              <tr>
                <th className={th} style={{ width: '7%' }}>م</th>
                <th className={th} style={{ width: '24%' }}>اسم الطالب</th>
                <th className={th} style={{ width: '16%' }}>الصف / الفصل</th>
                <th className={th} style={{ width: '20%' }}>نوع المخالفة</th>
                <th className={th} style={{ width: '16%' }}>الإجراء</th>
                <th className={th} style={{ width: '17%' }}>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {padded(violationRows, Math.max(minViolationRows, violationRows.length)).map((s, i) => (
                <tr key={`viol-${i}`}>
                  <td className={td}>{i + 1}</td>
                  <td className={`${td} text-right`}>{s?.studentName || ''}</td>
                  <td className={td}>{s?.gradeAndClass || ''}</td>
                  <td className={`${td} text-right`}>{s?.violationType || ''}</td>
                  <td className={`${td} text-right`}>{s?.actionTaken || ''}</td>
                  <td className={`${td} text-right`}>{s?.notes || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notice */}
      <div className="pt-2 flex items-center gap-2 text-[12px] font-black text-slate-900">
        <span className="w-5 h-5 rounded-full border-[1.5px] border-slate-900 inline-flex items-center justify-center">!</span>
        <span>يُسلَّم هذا النموذج في اليوم التالي لوكيل المدرسة</span>
      </div>

      {/* Signatures row */}
      <div className="pt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="border border-slate-300 rounded-lg px-3 py-2 text-[12px] font-black min-w-[220px]">
          <span className="text-slate-500 ml-1.5">وكيل المدرسة:</span>
          <span className="text-slate-800">.....................</span>
        </div>
        <div className="border border-slate-200 rounded-2xl px-4 py-3 w-[280px] bg-white">
          <p className="text-[12px] font-black mb-5">
            <span className="text-slate-500 ml-1.5">مدير المدرسة:</span>
            <span className="text-slate-800">{principalName || '....................'}</span>
          </p>
          <div className="border-t border-slate-400 pt-1.5 text-[11px] font-black text-slate-600">التوقيع</div>
        </div>
      </div>
    </div>
  );
};

export default DutyReportPreview;
