import { SemesterInfo } from '../types';

export interface CalendarRegion {
  id: string;
  name: string;
  /** قائمة المدن — فارغة تعني "جميع مناطق المملكة عدا المدن الأربع" */
  cities: string[];
  /** ملصقات الإجازات للعرض في واجهة الاختيار */
  holidayLabels: Array<{ label: string; approximate?: boolean }>;
  semesters: Omit<SemesterInfo, 'id'>[];
}

export interface AcademicCalendarData {
  /** للمعالجة الداخلية: "1447" */
  year: string;
  /** للعرض في الواجهة: "1447هـ" */
  yearDisplay: string;
  regions: CalendarRegion[];
}

/**
 * ─────────────────────────────────────────────────────────────────
 *  التقاويم الدراسية الجاهزة
 *  للمشرف على المنصة:
 *    • أضف تقويم العام الجديد في بداية كل عام دراسي بإضافة كائن جديد.
 *    • احذف التقويم الأقدم لتجنب إرباك المستخدمين.
 *    • getLatestCalendar() تُعيد آخر عنصر في المصفوفة دائماً.
 *
 *  إجازات 1447هـ المُدرجة:
 *    ◈ ثابتة:
 *        اليوم الوطني  : 22-23 سبتمبر 2025
 *        يوم التأسيس  : 22 فبراير 2026
 *    ◈ تقريبية (راجع التأكيد الرسمي):
 *        عيد الفطر 1447هـ : 29 مارس – 9 أبريل 2026
 * ─────────────────────────────────────────────────────────────────
 */
export const ACADEMIC_CALENDARS: AcademicCalendarData[] = [
  {
    year: '1447',
    yearDisplay: '1447هـ',
    regions: [
      // ── المنطقة الأولى: المدن الأربع ──────────────────────────────
      {
        id: 'four-cities',
        name: 'المدن الأربع',
        cities: ['مكة المكرمة', 'جدة', 'الطائف', 'المدينة المنورة'],
        holidayLabels: [
          { label: 'اليوم الوطني (22–23 سبتمبر)' },
          { label: 'يوم التأسيس (22 فبراير)' },
          { label: 'عيد الفطر 1447هـ (29 مارس – 9 أبريل)', approximate: true },
        ],
        semesters: [
          {
            name: 'الفصل الدراسي الأول',
            calendarType: 'hijri',
            startDate: '2025-09-14',
            endDate: '2026-01-15',
            weeksCount: 18,
            workDaysStart: 0, // الأحد
            workDaysEnd: 4,   // الخميس
            holidays: [
              '2025-09-22', // اليوم الوطني
              '2025-09-23', // اليوم الوطني
            ],
            isCurrent: false,
          },
          {
            name: 'الفصل الدراسي الثاني',
            calendarType: 'hijri',
            startDate: '2026-02-08',
            endDate: '2026-06-11',
            weeksCount: 18,
            workDaysStart: 0,
            workDaysEnd: 4,
            holidays: [
              '2026-02-22', // يوم التأسيس
              // عيد الفطر 1447هـ (تقريبي — راجع الإعلان الرسمي)
              '2026-03-29', '2026-03-30', '2026-03-31',
              '2026-04-01', '2026-04-02',
              '2026-04-05', '2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09',
            ],
            isCurrent: false,
          },
        ],
      },

      // ── المنطقة الثانية: باقي مناطق المملكة ──────────────────────
      {
        id: 'other-regions',
        name: 'باقي مناطق المملكة',
        cities: [],
        holidayLabels: [
          { label: 'اليوم الوطني (22–23 سبتمبر)' },
          { label: 'يوم التأسيس (22 فبراير)' },
          { label: 'عيد الفطر 1447هـ (29 مارس – 9 أبريل)', approximate: true },
        ],
        semesters: [
          {
            name: 'الفصل الدراسي الأول',
            calendarType: 'hijri',
            startDate: '2025-09-07',
            endDate: '2026-01-08',
            weeksCount: 18,
            workDaysStart: 0,
            workDaysEnd: 4,
            holidays: [
              '2025-09-22',
              '2025-09-23',
            ],
            isCurrent: false,
          },
          {
            name: 'الفصل الدراسي الثاني',
            calendarType: 'hijri',
            startDate: '2026-02-01',
            endDate: '2026-06-04',
            weeksCount: 18,
            workDaysStart: 0,
            workDaysEnd: 4,
            holidays: [
              '2026-02-22',
              // عيد الفطر 1447هـ (تقريبي)
              '2026-03-29', '2026-03-30', '2026-03-31',
              '2026-04-01', '2026-04-02',
              '2026-04-05', '2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09',
            ],
            isCurrent: false,
          },
        ],
      },
    ],
  },
];

/** أحدث تقويم متاح — يُستخدم في الواجهة تلقائياً */
export const getLatestCalendar = (): AcademicCalendarData | undefined =>
  ACADEMIC_CALENDARS[ACADEMIC_CALENDARS.length - 1];
