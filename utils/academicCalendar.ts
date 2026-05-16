import { SchoolInfo, SemesterInfo } from '../types';

export interface AcademicWeek {
  number: number;
  start: string;
  end: string;
  days: string[];
  holidays: string[];
  hasHoliday: boolean;
}

export const toLocalISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const buildAcademicWeeks = (semester: SemesterInfo | undefined): AcademicWeek[] => {
  if (!semester?.startDate || !semester.endDate || !semester.weeksCount) return [];
  const workStart = semester.workDaysStart ?? 0;
  const workEnd = semester.workDaysEnd ?? 4;
  const holidaySet = new Set(semester.holidays || []);
  const start = new Date(`${semester.startDate}T00:00:00`);
  const end = new Date(`${semester.endDate}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
  const cur = new Date(start);
  while (cur.getDay() !== workStart && cur <= end) cur.setDate(cur.getDate() + 1);
  const weeks: AcademicWeek[] = [];
  let num = 1;
  while (cur <= end && num <= semester.weeksCount) {
    const days: string[] = [];
    const weekHolidays: string[] = [];
    for (let d = workStart; d <= workEnd; d++) {
      const dateStr = toLocalISODate(cur);
      days.push(dateStr);
      if (holidaySet.has(dateStr)) weekHolidays.push(dateStr);
      cur.setDate(cur.getDate() + 1);
    }
    while (cur.getDay() !== workStart && cur <= end) cur.setDate(cur.getDate() + 1);
    weeks.push({
      number: num,
      start: days[0],
      end: days[days.length - 1],
      days,
      holidays: weekHolidays,
      hasHoliday: weekHolidays.length > 0,
    });
    num++;
  }
  return weeks;
};

export const getCurrentAcademicSemester = (schoolInfo: SchoolInfo | null | undefined): SemesterInfo | undefined => {
  const semesters = schoolInfo?.semesters || [];
  if (semesters.length === 0) return undefined;
  return semesters.find(s => s.id === schoolInfo?.currentSemesterId)
    || semesters.find(s => s.isCurrent)
    || semesters[0];
};
