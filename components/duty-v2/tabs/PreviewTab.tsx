import React, { useMemo, useState } from 'react';
import { Eye, CalendarDays, CalendarRange, ClipboardList } from 'lucide-react';
import { SchoolInfo, DutyScheduleData } from '../../../types';
import { getDutyPrintData } from '../../../utils/dutyUtils';

interface Props {
  dutyData: DutyScheduleData;
  schoolInfo: SchoolInfo;
}

const PreviewTab: React.FC<Props> = ({ dutyData, schoolInfo }) => {
  const printData = useMemo(
    () => getDutyPrintData(dutyData, schoolInfo),
    [dutyData, schoolInfo]
  );

  const weeks = printData.weeks;
  const hasWeekNames = weeks.length > 1 || !!weeks[0]?.weekName;

  // ─── الفلاتر (فارغ = الكل) ───
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
  const [selectedDayNames, setSelectedDayNames] = useState<string[]>([]);

  const toggleWeek = (i: number) =>
    setSelectedWeeks(curr => curr.includes(i) ? curr.filter(w => w !== i) : [...curr, i]);
  const toggleDayName = (name: string) =>
    setSelectedDayNames(curr => curr.includes(name) ? curr.filter(d => d !== name) : [...curr, name]);

  // أسماء الأيام المتاحة (من أول أسبوع، بترتيبها)
  const dayNameOptions = useMemo(() => {
    const seen: string[] = [];
    weeks.forEach(w => w.days.forEach(d => {
      if (!seen.includes(d.dayName)) seen.push(d.dayName);
    }));
    return seen;
  }, [weeks]);

  const visibleWeeks = selectedWeeks.length === 0
    ? weeks
    : weeks.filter((_, i) => selectedWeeks.includes(i));
  const isDayVisible = (name: string) =>
    selectedDayNames.length === 0 || selectedDayNames.includes(name);

  const hasAnyData = weeks.some(w => w.days.some(d => d.supervisors.length > 0));

  // ─── حالة عدم وجود جدول ───
  if (!hasAnyData) {
    return (
      <div className="bg-white rounded-[2rem] p-12 border border-slate-200 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <ClipboardList size={30} className="text-slate-400" />
        </div>
        <p className="text-base font-black text-slate-700">لا يوجد جدول مناوبة للمعاينة</p>
        <p className="text-sm font-medium text-slate-400 mt-2">
          أنشئ الجدول أولاً من مرحلة «إنشاء الجدول».
        </p>
      </div>
    );
  }

  const chipBase = 'px-4 py-2 rounded-xl text-sm font-bold border transition-all whitespace-nowrap';
  const chipActive = 'bg-[#655ac1] text-white border-[#655ac1] shadow-sm shadow-[#655ac1]/20';
  const chipIdle = 'bg-white text-slate-600 border-slate-200 hover:border-[#cfc8ff] hover:text-[#655ac1]';

  return (
    <div className="space-y-4" dir="rtl">
      {/* ═══ شريط الفلاتر ═══ */}
      <div className="bg-white rounded-[2rem] p-5 border border-slate-200 shadow-sm space-y-4">
        {/* فلتر الأسبوع */}
        {hasWeekNames && weeks.length > 1 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <CalendarRange size={15} className="text-[#655ac1]" />
              <span className="text-xs font-black text-slate-500">الأسبوع</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedWeeks([])}
                className={`${chipBase} ${selectedWeeks.length === 0 ? chipActive : chipIdle}`}
              >
                كل الأسابيع
              </button>
              {weeks.map((w, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleWeek(i)}
                  className={`${chipBase} ${selectedWeeks.includes(i) ? chipActive : chipIdle}`}
                >
                  {w.weekName || `الأسبوع ${i + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* فلتر اليوم */}
        <div className={hasWeekNames && weeks.length > 1 ? 'pt-3 border-t border-slate-100' : ''}>
          <div className="flex items-center gap-2 mb-2.5">
            <CalendarDays size={15} className="text-[#655ac1]" />
            <span className="text-xs font-black text-slate-500">اليوم</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedDayNames([])}
              className={`${chipBase} ${selectedDayNames.length === 0 ? chipActive : chipIdle}`}
            >
              كل الأيام
            </button>
            {dayNameOptions.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => toggleDayName(name)}
                className={`${chipBase} ${selectedDayNames.includes(name) ? chipActive : chipIdle}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ الجداول ═══ */}
      {visibleWeeks.map((week, wi) => {
        const days = week.days.filter(d => isDayVisible(d.dayName));
        if (days.length === 0) return null;
        return (
          <div key={wi} className="bg-white rounded-[2rem] p-5 sm:p-6 border border-slate-200 shadow-sm">
            {/* رأس المعاينة */}
            <div className="flex items-center gap-2 mb-4">
              <Eye size={22} className="text-[#655ac1] shrink-0" />
              <h3 className="text-base font-black text-slate-800 leading-tight truncate">
                {week.weekName ? week.weekName : 'جدول المناوبة اليومية'}
              </h3>
            </div>

            <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-slate-200">
              <table className="w-full border-collapse text-sm text-right">
                <thead>
                  <tr className="bg-[#a59bf0] text-white border-b border-slate-400">
                    <th className="px-3 py-4 font-black text-center w-[120px] border-l border-white/40">اليوم</th>
                    <th className="px-3 py-4 font-black text-center border-l border-white/40">المناوب</th>
                    <th className="px-3 py-4 font-black text-center w-[110px]">آخر حصة</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((day, di) => (
                    <tr key={di} className="border-b-2 border-slate-300 last:border-b-0 hover:bg-slate-50/40 transition-colors">
                      <td className="px-3 py-3 align-middle text-center border-l border-slate-200 bg-slate-50/50">
                        <div className="font-black text-[#655ac1] text-base">{day.dayName}</div>
                        {day.date && (
                          <div className="text-[11px] font-medium text-slate-400 mt-0.5">{day.date}</div>
                        )}
                      </td>
                      {day.statusText ? (
                        <td colSpan={2} className="px-3 py-3 align-middle text-center text-xs font-bold text-slate-400">
                          {day.statusText}
                        </td>
                      ) : day.supervisors.length === 0 ? (
                        <td colSpan={2} className="px-3 py-3 align-middle text-center">
                          <span className="text-[11px] font-medium text-slate-300">—</span>
                        </td>
                      ) : (
                        <>
                          <td className="px-3 py-3 align-middle text-center border-l border-slate-200">
                            <div className="divide-y divide-slate-100">
                              {day.supervisors.map((s, si) => (
                                <div key={si} className="py-2 first:pt-0 last:pb-0 leading-snug">
                                  <span className="text-xs font-bold text-slate-800">{s.name}</span>
                                  <span className="text-[11px] font-medium text-slate-400 mr-1">({s.type})</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-middle text-center">
                            <div className="divide-y divide-slate-100">
                              {day.supervisors.map((s, si) => (
                                <div key={si} className="py-2 first:pt-0 last:pb-0 text-xs font-bold text-slate-800 leading-snug">
                                  {s.lastPeriod ? `الحصة ${s.lastPeriod}` : <span className="text-slate-300">—</span>}
                                </div>
                              ))}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PreviewTab;
