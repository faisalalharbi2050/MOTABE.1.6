import React, { useMemo, useState } from 'react';
import { CalendarDays, CalendarRange, ClipboardList, ShieldCheck } from 'lucide-react';
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

  const hasAnyData = weeks.some(w => w.days.some(d => d.supervisors.length > 0 || d.statusText));

  const getWeekLabel = (weekName: string | undefined, index: number) => {
    const raw = (weekName || '').trim();
    const match = raw.match(/\d+/);
    return {
      label: 'الأسبوع',
      number: match ? match[0] : String(index + 1),
    };
  };

  const calendarType = schoolInfo.calendarType
    || schoolInfo.semesters?.find(s => s.isCurrent)?.calendarType
    || schoolInfo.semesters?.[0]?.calendarType || 'hijri';

  const formatPreviewDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return calendarType === 'hijri'
        ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(d)
        : new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(d);
    } catch { return dateStr; }
  };

  const WeekBadge: React.FC<{ weekName?: string; index: number; compact?: boolean; active?: boolean }> = ({ weekName, index, compact = false, active = false }) => {
    const weekLabel = getWeekLabel(weekName, index);
    return (
      <span className={`inline-flex items-center justify-center gap-2 font-black ${compact ? 'text-sm' : 'text-base'} ${active ? 'text-white' : 'text-slate-800'}`}>
        <span>{weekLabel.label}</span>
        <span className={`${compact ? 'h-7 min-w-7 text-xs' : 'h-8 min-w-8 text-sm'} inline-flex items-center justify-center rounded-full border bg-transparent px-2 text-[#655ac1] ${active ? 'border-white' : 'border-slate-300'}`}>
          {weekLabel.number}
        </span>
      </span>
    );
  };

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
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setSelectedWeeks([])}
                className={`${chipBase} ${selectedWeeks.length === 0 ? chipActive : chipIdle}`}
              >
                كل الأسابيع
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
              {weeks.map((w, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleWeek(i)}
                  className={`${chipBase} ${selectedWeeks.includes(i) ? chipActive : chipIdle}`}
                >
                  <WeekBadge weekName={w.weekName} index={i} compact active={selectedWeeks.includes(i)} />
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

      {/* ═══ الجداول (كل أسبوع في صف واحد عرضي) ═══ */}
      {visibleWeeks.map((week, wi) => {
        const days = week.days.filter(d => isDayVisible(d.dayName));
        if (days.length === 0) return null;
        return (
          <div key={wi} className="bg-white rounded-[2rem] p-5 sm:p-6 border border-slate-200 shadow-sm">
            {/* رأس المعاينة */}
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={22} className="text-[#655ac1] shrink-0" />
              <WeekBadge weekName={week.weekName} index={wi} />
            </div>

            <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-slate-200">
              <table className="w-full border-collapse text-sm text-right">
                <thead>
                  <tr className="bg-[#a59bf0] text-white border-b border-slate-400">
                    <th className="px-3 py-4 font-black text-center w-[120px] border-l border-white/40">اليوم</th>
                    <th className="px-3 py-4 font-black text-center w-[150px] border-l border-white/40">التاريخ</th>
                    <th className="px-3 py-4 font-black text-center">المناوب</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((day, di) => (
                    <tr key={di} className="border-b-2 border-slate-300 last:border-b-0 hover:bg-slate-50/40 transition-colors">
                      <td className="px-3 py-3 align-middle text-center border-l border-slate-200 bg-slate-50/50">
                        <div className="font-black text-[#655ac1] text-base">{day.dayName}</div>
                      </td>
                      <td className="px-3 py-3 align-middle text-center border-l border-slate-200 bg-slate-50/50">
                        {day.date && (
                          <div className="text-sm font-black text-slate-700 leading-relaxed">{formatPreviewDate(day.date)}</div>
                        )}
                      </td>
                      {day.statusText ? (
                        <td className="px-3 py-3 align-middle text-center">
                          <div className="flex items-center justify-center min-h-[3rem] rounded-xl border-2 border-dashed border-rose-200 bg-rose-50">
                            <span className="font-black text-rose-600 text-sm">{day.statusText}</span>
                          </div>
                        </td>
                      ) : day.supervisors.length === 0 ? (
                        <td className="px-3 py-3 align-middle text-center">
                          <span className="text-[11px] font-medium text-slate-300">—</span>
                        </td>
                      ) : (
                        <td className="px-3 py-3 align-middle text-center">
                          <div className="divide-y divide-slate-100">
                            {day.supervisors.map((s, si) => (
                              <div key={si} className="py-2 first:pt-0 last:pb-0 leading-snug">
                                <span className="text-[13px] font-bold text-slate-800">{s.name}</span>
                              </div>
                            ))}
                          </div>
                        </td>
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
