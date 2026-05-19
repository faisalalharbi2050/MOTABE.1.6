import { ClassInfo, SchoolInfo, Phase } from '../types';
import { PHASE_CONFIG } from '../constants';

/**
 * Generate classroom display name in format (grade-section) with LTR handling
 */
export function generateClassroomName(grade: number, section: number): string {
  return `${section}-${grade}`;
}

/**
 * Get the display name for a classroom, using custom name if available
 */
export function getClassroomDisplayName(c: ClassInfo): string {
  if (c.name) return c.name;
  return generateClassroomName(c.grade, c.section);
}

/**
 * Calculate even distribution of classrooms across grades
 * Returns an array of counts per grade
 */
export function calculateDistribution(totalClassrooms: number, totalGrades: number): {
  distribution: number[];
  hasRemainder: boolean;
  remainder: number;
} {
  if (totalGrades <= 0 || totalClassrooms <= 0) {
    return { distribution: Array(Math.max(totalGrades, 0)).fill(0), hasRemainder: false, remainder: 0 };
  }

  const perGrade = Math.floor(totalClassrooms / totalGrades);
  const remainder = totalClassrooms % totalGrades;

  const distribution = Array(totalGrades).fill(perGrade);

  // Distribute remainder starting from first grade
  for (let i = 0; i < remainder; i++) {
    distribution[i]++;
  }

  return {
    distribution,
    hasRemainder: remainder > 0,
    remainder,
  };
}

/**
 * Generate classrooms from a distribution array
 */
export function generateClassroomsFromDistribution(
  distribution: number[],
  phase: Phase,
  gradeSubjectMap: Record<string, string[]>,
  schoolId?: string
): ClassInfo[] {
  const classrooms: ClassInfo[] = [];
  let sortOrder = 0;

  for (let gradeIndex = 0; gradeIndex < distribution.length; gradeIndex++) {
    const grade = gradeIndex + 1;
    const count = distribution[gradeIndex];
    const activeSchoolId = schoolId || 'main';
    const schoolKey = `${activeSchoolId}-${phase}-${grade}`;
    const legacyKey = `${phase}-${grade}`;
    const subjectIds = gradeSubjectMap[schoolKey] || (activeSchoolId === 'main' ? gradeSubjectMap[legacyKey] : undefined) || [];

    for (let section = 1; section <= count; section++) {
      classrooms.push({
        id: `${activeSchoolId}-${phase}-${grade}-${section}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        phase,
        grade,
        section,
        subjectIds: [...subjectIds],
        schoolId: activeSchoolId,
        sortOrder: sortOrder++,
        isManuallyCreated: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return classrooms;
}

/**
 * Get the next available section number for a grade within a phase
 */
export function getNextSectionNumber(
  classes: ClassInfo[],
  phase: Phase,
  grade: number,
  schoolId?: string
): number {
  const gradeClasses = classes.filter(
    c => c.phase === phase && c.grade === grade && (c.schoolId || 'main') === (schoolId || 'main')
  );
  if (gradeClasses.length === 0) return 1;
  return Math.max(...gradeClasses.map(c => c.section)) + 1;
}

/**
 * Group classrooms by grade
 */
export function groupClassesByGrade(classes: ClassInfo[]): Record<number, ClassInfo[]> {
  const grouped: Record<number, ClassInfo[]> = {};
  classes.forEach(c => {
    if (!grouped[c.grade]) grouped[c.grade] = [];
    grouped[c.grade].push(c);
  });

  // Sort each group by sortOrder then section
  Object.keys(grouped).forEach(grade => {
    grouped[Number(grade)].sort((a, b) => {
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      return a.section - b.section;
    });
  });

  return grouped;
}

/**
 * Move a classroom up or down within its grade group
 */
export function reorderClassroom(
  classes: ClassInfo[],
  classId: string,
  direction: 'up' | 'down'
): ClassInfo[] {
  const targetClass = classes.find(c => c.id === classId);
  if (!targetClass) return classes;

  const gradeClasses = classes
    .filter(c => c.phase === targetClass.phase && c.grade === targetClass.grade && (c.schoolId || 'main') === (targetClass.schoolId || 'main'))
    .sort((a, b) => (a.sortOrder ?? a.section) - (b.sortOrder ?? b.section));

  const currentIndex = gradeClasses.findIndex(c => c.id === classId);
  const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (swapIndex < 0 || swapIndex >= gradeClasses.length) return classes;

  // Swap sort orders
  const result = classes.map(c => {
    if (c.id === gradeClasses[currentIndex].id) {
      return { ...c, sortOrder: gradeClasses[swapIndex].sortOrder ?? gradeClasses[swapIndex].section };
    }
    if (c.id === gradeClasses[swapIndex].id) {
      return { ...c, sortOrder: gradeClasses[currentIndex].sortOrder ?? gradeClasses[currentIndex].section };
    }
    return c;
  });

  return result;
}

/**
 * Generate printable HTML for classrooms
 */
export function generatePrintHTML(
  classes: ClassInfo[],
  schoolInfo: SchoolInfo,
  activeSchoolId: string
): string {
  const filteredClasses = classes.filter(
    c => (c.schoolId || 'main') === activeSchoolId
  );
  const grouped = groupClassesByGrade(filteredClasses);
  const grades = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  const schoolName = activeSchoolId === 'second'
    ? (schoolInfo.secondSchoolName || 'المدرسة الثانية')
    : (schoolInfo.schoolName || 'المدرسة');

  const phases = activeSchoolId === 'second'
    ? (schoolInfo.secondSchoolPhases || schoolInfo.phases)
    : schoolInfo.phases;
    
  const phaseDisplay = phases?.join('، ') || '';

  let tableRows = '';
  let totalClassrooms = 0;

  grades.forEach(grade => {
    const gradeClasses = grouped[grade];
    totalClassrooms += gradeClasses.length;

    gradeClasses.forEach((c, index) => {
      const displayName = getClassroomDisplayName(c);
      const hasCustom = c.customPeriodCounts && Object.keys(c.customPeriodCounts).length > 0;

      tableRows += `
        <tr>
          ${index === 0 ? `<td rowspan="${gradeClasses.length}" style="font-weight:bold; background:#f1f5f9; text-align:center; vertical-align:middle; font-size:16px;">الصف ${grade}</td>` : ''}
          <td style="text-align:center; padding:10px;">
            <span dir="ltr" style="font-weight:bold; font-size:15px;">${displayName}</span>
          </td>
          <td style="text-align:center; color:#64748b;">${(c.subjectIds || []).length} مواد</td>
          <td style="text-align:center; color:#64748b;">${hasCustom ? 'مخصص' : 'افتراضي'}</td>
        </tr>
      `;
    });
  });

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>قائمة الفصول - ${schoolName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Tajawal', sans-serif; padding:40px; background:#fff; color:#1e293b; direction:rtl; }
        .header { text-align:center; margin-bottom:30px; padding-bottom:20px; border-bottom:3px solid #4f46e5; }
        .header h1 { font-size:24px; font-weight:800; color:#1e293b; margin-bottom:5px; }
        .header p { font-size:14px; color:#64748b; }
        .meta { display:flex; justify-content:space-between; margin-bottom:20px; font-size:13px; color:#475569; }
        table { width:100%; border-collapse:collapse; margin-bottom:20px; }
        th { background:#4f46e5; color:#fff; padding:12px 16px; font-weight:700; font-size:13px; }
        td { padding:10px 16px; border-bottom:1px solid #e2e8f0; font-size:13px; }
        tr:hover { background:#f8fafc; }
        .footer { text-align:center; margin-top:30px; padding-top:15px; border-top:2px solid #e2e8f0; font-size:11px; color:#94a3b8; }
        .total { text-align:center; background:#f1f5f9; padding:12px; border-radius:8px; font-weight:700; font-size:15px; margin-bottom:20px; }
        @media print {
          body { padding:20px; }
          .no-print { display:none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${schoolName}</h1>
        <p>المرحلة: ${phaseDisplay} | ${schoolInfo.educationAdministration || schoolInfo.region || ''}</p>
      </div>

      <div class="meta">
        <span>العام الدراسي: ${schoolInfo.academicYear || '---'}</span>
        <span>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</span>
      </div>

      <div class="total">إجمالي الفصول: ${totalClassrooms} فصل</div>

      <table>
        <thead>
          <tr>
            <th style="width:20%;">الصف</th>
            <th style="width:30%;">الفصل</th>
            <th style="width:25%;">عدد المواد</th>
            <th style="width:25%;">الحصص</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div class="footer">
        تم التصدير من نظام متابع | ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}
      </div>
    </body>
    </html>
  `;
}

/**
 * Open print window with classroom data
 */
export function printClassrooms(
  classes: ClassInfo[],
  schoolInfo: SchoolInfo,
  activeSchoolId: string
): void {
  const html = generatePrintHTML(classes, schoolInfo, activeSchoolId);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}
