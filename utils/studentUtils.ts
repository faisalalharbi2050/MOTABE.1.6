import { Student, ClassInfo, SchoolInfo, Phase } from '../types';
import { PHASE_CONFIG } from '../constants';
import * as XLSX from 'xlsx';

// ─── Excel Import ───────────────────────────────────────────

export interface ExcelParseResult {
  students: Student[];
  matched: number;
  unmatched: number;
  errors: string[];
}

/**
 * Parse an Excel file and match students to existing classes.
 * Expected columns: اسم الطالب, الصف, الفصل, رقم جوال ولي الأمر
 */
export async function parseStudentExcel(
  file: File,
  classes: ClassInfo[],
  schoolId: string,
  activePhase: Phase
): Promise<ExcelParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const students: Student[] = [];
        let matched = 0;
        let unmatched = 0;
        const errors: string[] = [];

        // Find column names (support various naming conventions)
        const nameKeys = ['اسم الطالب', 'الاسم', 'اسم', 'name', 'الطالب', 'اسم الطالبة', 'اسم الطالب رباعي', 'Student Name'];
        const gradeKeys = ['الصف', 'صف', 'grade', 'المستوى', 'الصف الدراسي', 'Grade', 'Level'];
        const sectionKeys = ['الفصل', 'فصل', 'section', 'class', 'شعبة', 'الشعبة', 'القسم', 'Section', 'Class'];
        const phoneKeys = ['رقم جوال ولي الأمر', 'جوال ولي الأمر', 'رقم الجوال', 'الجوال', 'phone', 'هاتف ولي الأمر', 'جوال', 'رقم ولي الأمر', 'هاتف', 'Phone', 'Mobile'];

        const findKey = (row: any, candidates: string[]): string | null => {
          const rowKeys = Object.keys(row);
          // 1. Exact match
          for (const key of candidates) {
            if (row[key] !== undefined) return key;
          }
          // 2. Trimmed exact match
          for (const candidate of candidates) {
            const found = rowKeys.find(k => k.trim() === candidate.trim());
            if (found) return found;
          }
          // 3. Partial inclusion match (column header contains the candidate OR vice versa)
          for (const candidate of candidates) {
            const found = rowKeys.find(k => {
              const kTrimmed = k.trim();
              const cTrimmed = candidate.trim();
              return kTrimmed.includes(cTrimmed) || cTrimmed.includes(kTrimmed);
            });
            if (found) return found;
          }
          return null;
        };

        if (rows.length === 0) {
          resolve({ students: [], matched: 0, unmatched: 0, errors: ['الملف فارغ'] });
          return;
        }

        const firstRow = rows[0];
        const nameKey = findKey(firstRow, nameKeys);
        const gradeKey = findKey(firstRow, gradeKeys);
        const sectionKey = findKey(firstRow, sectionKeys);
        const phoneKey = findKey(firstRow, phoneKeys);

        // Debug: log detected columns
        console.log('[Student Import] Detected columns:', {
          name: nameKey,
          grade: gradeKey,
          section: sectionKey,
          phone: phoneKey,
          availableColumns: Object.keys(firstRow),
        });

        if (!nameKey) {
          resolve({
            students: [],
            matched: 0,
            unmatched: 0,
            errors: [`لم يتم العثور على عمود اسم الطالب. الأعمدة المتاحة: ${Object.keys(firstRow).join(', ')}`]
          });
          return;
        }

        // Filter classes by school
        const schoolClasses = classes.filter(c =>
          (c.schoolId || 'main') === schoolId && c.phase === activePhase
        );

        console.log('[Student Import] Available classes:', schoolClasses.map(c => `Grade ${c.grade} Section ${c.section}`));

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const name = String(row[nameKey] || '').trim();
          if (!name) continue;

          const gradeRaw = gradeKey ? String(row[gradeKey] || '').trim() : '';
          const sectionRaw = sectionKey ? String(row[sectionKey] || '').trim() : '';
          const phone = phoneKey ? String(row[phoneKey] || '').trim() : '';

          // Extract grade number
          const gradeNum = extractGradeNumber(gradeRaw);
          const sectionNum = sectionRaw ? extractSectionNumber(sectionRaw) : null;

          // Debug first few rows
          if (i < 3) {
            console.log(`[Student Import] Row ${i}: name="${name}", gradeRaw="${gradeRaw}"→${gradeNum}, sectionRaw="${sectionRaw}"→${sectionNum}`);
          }

          // Find matching class
          let matchedClass: ClassInfo | undefined;
          if (gradeNum && sectionNum) {
            matchedClass = schoolClasses.find(c =>
              c.grade === gradeNum && c.section === sectionNum
            );
          }
          if (!matchedClass && gradeNum) {
            // Fallback: match by grade only, take first available
            matchedClass = schoolClasses.find(c => c.grade === gradeNum);
          }

          const student: Student = {
            id: `student-${schoolId}-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
            name,
            classId: matchedClass?.id || '',
            grade: gradeNum || 1,
            parentPhone: phone || undefined,
            schoolId,
          };

          if (matchedClass) {
            matched++;
          } else {
            unmatched++;
            if (gradeRaw) {
              errors.push(`الطالب "${name}" - "${gradeRaw}": لم يتم التعرف على الصف أو لا يوجد فصل مطابق`);
            }
          }

          students.push(student);
        }

        resolve({ students, matched, unmatched, errors });
      } catch (err) {
        reject(new Error('حدث خطأ أثناء قراءة ملف Excel'));
      }
    };
    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsArrayBuffer(file);
  });
}

function extractGradeNumber(raw: string): number | null {
  if (!raw) return null;

  // Clean up the string
  const cleaned = raw.trim();

  // 1. Direct number
  const directNum = parseInt(cleaned);
  if (!isNaN(directNum) && directNum >= 1 && directNum <= 12) return directNum;

  // 2. Arabic ordinals - comprehensive mapping
  const arabicGrades: [RegExp, number][] = [
    [/الأول|أول|اول|الاول|1\s*ابتدائي|أولى|اولى/, 1],
    [/الثاني|ثاني|الثانى|ثانى|2\s*ابتدائي/, 2],
    [/الثالث|ثالث|3\s*ابتدائي/, 3],
    [/الرابع|رابع|4\s*ابتدائي/, 4],
    [/الخامس|خامس|5\s*ابتدائي/, 5],
    [/السادس|سادس|6\s*ابتدائي/, 6],
  ];

  for (const [pattern, grade] of arabicGrades) {
    if (pattern.test(cleaned)) return grade;
  }

  // 3. Also handle "الصف 1" or "صف 3" patterns
  const gradeWithNumber = cleaned.match(/(?:الصف|صف)\s*(\d+)/);
  if (gradeWithNumber) {
    const n = parseInt(gradeWithNumber[1]);
    if (n >= 1 && n <= 12) return n;
  }

  // 4. Handle formats like "1/2" (grade/section) — take the first number as grade
  const slashPattern = cleaned.match(/^(\d+)\s*[/\\-]\s*(\d+)$/);
  if (slashPattern) {
    const n = parseInt(slashPattern[1]);
    if (n >= 1 && n <= 12) return n;
  }

  // 5. Try extracting any number from the string as last resort
  const anyNumber = cleaned.match(/(\d+)/);
  if (anyNumber) {
    const n = parseInt(anyNumber[1]);
    if (n >= 1 && n <= 12) return n;
  }

  return null;
}

function extractSectionNumber(raw: string): number {
  if (!raw) return 1;

  const cleaned = raw.trim();

  // 1. Direct number
  const num = parseInt(cleaned);
  if (!isNaN(num) && num >= 1) return num;

  // 2. Handle "1/2" format — take the second number as section
  const slashPattern = cleaned.match(/^\d+\s*[/\\-]\s*(\d+)$/);
  if (slashPattern) {
    return parseInt(slashPattern[1]) || 1;
  }

  // 3. Arabic letters mapping for sections (common in Saudi schools)
  const arabicSections: Record<string, number> = {
    'أ': 1, 'ا': 1, 'A': 1, 'a': 1,
    'ب': 2, 'B': 2, 'b': 2,
    'ج': 3, 'ت': 3, 'C': 3, 'c': 3,
    'د': 4, 'ث': 4, 'D': 4, 'd': 4,
    'هـ': 5, 'ه': 5, 'E': 5, 'e': 5,
    'و': 6, 'F': 6, 'f': 6,
    'ز': 7, 'G': 7, 'g': 7,
    'ح': 8, 'H': 8, 'h': 8,
  };

  // Check single character
  if (cleaned.length === 1 && arabicSections[cleaned] !== undefined) {
    return arabicSections[cleaned];
  }

  // Check if the string contains a known letter
  for (const [letter, section] of Object.entries(arabicSections)) {
    if (cleaned === letter || cleaned === `(${letter})`) return section;
  }

  // 4. Try extracting any number
  const anyNum = cleaned.match(/(\d+)/);
  if (anyNum) return parseInt(anyNum[1]) || 1;

  return 1;
}

// ─── Promotion / Level-Up ───────────────────────────────────

export interface PromotionResult {
  promoted: Student[];
  archived: Student[];
  summary: { fromGrade: number; toGrade: number; count: number }[];
}

/**
 * Promote all students one grade up. Students in the final grade
 * of their phase are archived (removed from active list).
 */
export function promoteStudents(
  students: Student[],
  phase: Phase,
  schoolId: string
): PromotionResult {
  const maxGrade = PHASE_CONFIG[phase]?.grades || 6;
  const promoted: Student[] = [];
  const archived: Student[] = [];
  const summaryMap = new Map<string, { fromGrade: number; toGrade: number; count: number }>();

  for (const student of students) {
    if ((student.schoolId || 'main') !== schoolId) {
      promoted.push(student); // Not in this school, keep as-is
      continue;
    }

    if (student.grade >= maxGrade) {
      archived.push(student);
      const key = `${student.grade}-archive`;
      const existing = summaryMap.get(key) || { fromGrade: student.grade, toGrade: 0, count: 0 };
      existing.count++;
      summaryMap.set(key, existing);
    } else {
      const newGrade = student.grade + 1;
      promoted.push({
        ...student,
        grade: newGrade,
        classId: '', // Reset class assignment, needs re-placement
      });
      const key = `${student.grade}-${newGrade}`;
      const existing = summaryMap.get(key) || { fromGrade: student.grade, toGrade: newGrade, count: 0 };
      existing.count++;
      summaryMap.set(key, existing);
    }
  }

  return {
    promoted,
    archived,
    summary: Array.from(summaryMap.values()).sort((a, b) => a.fromGrade - b.fromGrade),
  };
}

// ─── Print ──────────────────────────────────────────────────

export function printStudentList(
  students: Student[],
  classes: ClassInfo[],
  schoolInfo: SchoolInfo,
  sortBy: 'grade' | 'class',
  customTitle?: string
) {
  const classMap = new Map(classes.map(c => [c.id, c]));

  const getClassName = (classId: string) => {
    const c = classMap.get(classId);
    if (!c) return 'غير محدد';
    return c.name || `${c.grade}/${c.section}`;
  };

  const sorted = [...students].sort((a, b) => {
    if (sortBy === 'grade') {
      if (a.grade !== b.grade) return a.grade - b.grade;
      const ca = classMap.get(a.classId);
      const cb = classMap.get(b.classId);
      if (ca && cb && ca.section !== cb.section) return ca.section - cb.section;
      return a.name.localeCompare(b.name, 'ar');
    } else {
      const ca = classMap.get(a.classId);
      const cb = classMap.get(b.classId);
      if (ca && cb) {
        if (ca.grade !== cb.grade) return ca.grade - cb.grade;
        if (ca.section !== cb.section) return ca.section - cb.section;
      }
      return a.name.localeCompare(b.name, 'ar');
    }
  });

  // Group students
  const groups = new Map<string, { label: string; rows: Student[] }>();
  for (const s of sorted) {
    const gradeName = `الصف ${s.grade}`;
    const clsName = getClassName(s.classId);
    const key = sortBy === 'grade' ? gradeName : clsName;
    const label = sortBy === 'grade' ? gradeName : `${gradeName} — ${clsName}`;
    if (!groups.has(key)) groups.set(key, { label, rows: [] });
    groups.get(key)!.rows.push(s);
  }

  // Build HTML groups
  let groupsHtml = '';
  for (const { label, rows } of groups.values()) {
    let rowsHtml = '';
    rows.forEach((s, i) => {
      const gradeName = `الصف ${s.grade}`;
      const clsName = getClassName(s.classId);
      const hasMissing = !s.grade || !s.classId || !s.parentPhone;
      rowsHtml += `
        <tr class="${hasMissing ? 'row-warning' : ''}">
          <td class="num">${i + 1}</td>
          <td class="name">${s.name}</td>
          <td class="center"><span class="grade-badge">${gradeName}</span></td>
          <td class="center"><span class="class-badge">${clsName}</span></td>
          <td class="center phone" dir="ltr">${s.parentPhone || '<span class="missing">—</span>'}</td>
        </tr>`;
    });
    groupsHtml += `
      <div class="group-block">
        <div class="group-header">
          <span>${label}</span>
          <span class="group-count">${rows.length} طالب</span>
        </div>
        <table>
          <thead>
            <tr>
              <th class="center" style="width:44px">م</th>
              <th>اسم الطالب</th>
              <th class="center" style="width:80px">الصف</th>
              <th class="center" style="width:110px">الفصل</th>
              <th class="center" style="width:130px">رقم ولي الأمر</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;
  }

  const title = customTitle || `قائمة الطلاب — ${new Date().toLocaleDateString('ar-SA')}`;
  const printDate = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Tajawal', sans-serif; background: #fff; direction: rtl; color: #1e293b; padding: 28px 32px; }

    /* ─── Page Header ─── */
    .page-header { text-align: center; padding-bottom: 18px; border-bottom: 3px solid #655ac1; margin-bottom: 28px; }
    .school-name { font-size: 22px; font-weight: 900; color: #1e293b; }
    .list-title  { font-size: 15px; color: #64748b; font-weight: 500; margin-top: 5px; }
    .meta        { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .total-badge { display: inline-block; background: #655ac1; color: #fff; font-size: 12px; font-weight: 700; padding: 3px 14px; border-radius: 99px; margin-top: 10px; }

    /* ─── Group Block ─── */
    .group-block  { margin-bottom: 24px; }
    .group-header {
      background: linear-gradient(to left, #655ac1, #8779fb);
      color: #fff; padding: 9px 16px; border-radius: 10px 10px 0 0;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 14px; font-weight: 900;
    }
    .group-count { background: rgba(255,255,255,0.22); border-radius: 99px; padding: 2px 10px; font-size: 12px; font-weight: 700; }

    /* ─── Table ─── */
    table { width: 100%; border-collapse: collapse; }
    thead th {
      background: #f8fafc; padding: 9px 12px;
      font-size: 12px; font-weight: 700; color: #64748b;
      border-bottom: 2px solid #e2e8f0; text-align: right;
    }
    thead th.center { text-align: center; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:nth-child(even) { background: #fafafa; }
    tbody tr.row-warning { background: #fffbeb; }
    tbody td { padding: 9px 12px; font-size: 13px; vertical-align: middle; }

    .num   { text-align: center; color: #94a3b8; font-size: 12px; font-weight: 700; }
    .name  { font-weight: 700; color: #1e293b; }
    .center { text-align: center; }
    .grade-badge { display: inline-block; background: #f1f5f9; color: #475569; padding: 3px 10px; border-radius: 8px; font-weight: 700; font-size: 12px; }
    .class-badge { display: inline-block; background: #ede9fe; color: #655ac1; padding: 3px 10px; border-radius: 8px; font-weight: 700; font-size: 12px; }
    .phone { font-family: monospace; font-size: 12px; color: #475569; }
    .missing { color: #cbd5e1; }

    /* ─── Footer ─── */
    .page-footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; }

    /* ─── Print ─── */
    @media print {
      body { padding: 12px 16px; }
      .group-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .class-badge  { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .group-block  { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <div class="school-name">${schoolInfo.schoolName || 'المدرسة'}</div>
    <div class="list-title">${title}</div>
    <div class="meta">${printDate}</div>
    <span class="total-badge">إجمالي الطلاب: ${students.length}</span>
  </div>

  ${groupsHtml}

  <div class="page-footer">تم الإنشاء بواسطة منظومة متابع</div>
</body>
</html>`);
  printWindow.document.close();
  printWindow.print();
}

// ─── Filter & Stats ─────────────────────────────────────────

export interface StudentFilters {
  searchText?: string;
  grade?: number;
  classId?: string;
}

const normalizeArabic = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, ''); // Remove Tashkeel
};

export function filterStudents(students: Student[], filters: StudentFilters): Student[] {
  let result = students;

  if (filters.searchText) {
    const search = normalizeArabic(filters.searchText.toLowerCase().trim());
    result = result.filter(s => normalizeArabic(s.name).toLowerCase().includes(search));
  }
  if (filters.grade) {
    result = result.filter(s => s.grade === filters.grade);
  }
  if (filters.classId) {
    result = result.filter(s => s.classId === filters.classId);
  }

  return result;
}

export function getStudentStats(students: Student[], classes: ClassInfo[]) {
  const gradeMap = new Map<number, number>();
  const classMap = new Map<string, number>();

  for (const s of students) {
    gradeMap.set(s.grade, (gradeMap.get(s.grade) || 0) + 1);
    if (s.classId) {
      classMap.set(s.classId, (classMap.get(s.classId) || 0) + 1);
    }
  }

  return { gradeMap, classMap, total: students.length };
}
