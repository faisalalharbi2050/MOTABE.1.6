import * as XLSX from 'xlsx';
import { INITIAL_SPECIALIZATIONS } from '../constants';

export interface TeacherData {
  id: string;
  name: string;
  mobile: string;
  specialization: string;
  weeklyQuota: number;
  waitingQuota: number;
  isAdmin: boolean;
  adminRole?: string;
  sortIndex: number;
  idNumber?: string | null; // رقم السجل المدني
}

const normalizeSpecialization = (input: string): string => {
  const s = input.trim();
  
  // Direct match check
  const directMatch = INITIAL_SPECIALIZATIONS.find(spec => spec.name === s);
  if (directMatch) return directMatch.id;

  // Fuzzy Mapping Rules
  if (/اسلام|دين|قرآن|توحيد|فقه|حديث|تفسير/.test(s)) return "1"; // الدراسات الإسلامية
  if (/عرب|لغتي/.test(s)) return "2"; // اللغة العربية
  if (/نجليز|English|E/.test(s)) return "5"; // اللغة الإنجليزية
  if (/اجتماع|تاريخ|جغرافيا|وطنية/.test(s)) return "6"; // الاجتماعيات
  if (/حاسب|رقمي|تقنية/.test(s)) return "7"; // الحاسب الآلي
  if (/فنية|فني/.test(s)) return "8"; // التربية الفنية
  if (/بدني|رياضة/.test(s)) return "9"; // التربية البدنية
  if (/كيمياء/.test(s)) return "10";
  if (/فيزياء/.test(s)) return "12";
  if (/أحياء/.test(s)) return "11";
  if (/علوم/.test(s)) return "4"; // العلوم (if not bio/chem/phys)
  
  if (/رياضيات|جبر|هندسة/.test(s)) return "3"; // الرياضيات
  if (/علوم إدارية|إدارة/.test(s)) return "13"; // الإدارة المالية / علوم إدارية
  if (/مكتب|مصادر/.test(s)) return "24"; // المكتبات
  if (/فكر/.test(s)) return "14"; // تربية فكرية
  if (/صعوب/.test(s)) return "15"; // صعوبات تعلم
  if (/توحد/.test(s)) return "16"; // توحد
  if (/مهار/.test(s)) return "17"; // المهارات الحياتية
  if (/تفكر/.test(s)) return "18"; // التفكير الناقد
  if (/نفس/.test(s)) return "19"; // الدراسات النفسية
  if (/أرض/.test(s)) return "20"; // علم الأرض والفضاء
  
  return "99"; // أخرى
};

export const parseTeachersExcel = (file: File): Promise<TeacherData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet) as any[];

        // Map data - expecting columns: Name, Specialization, Mobile (or Arabic equivalents)
        const teachers: TeacherData[] = json.map((row, index) => {
           // Basic fuzzy matching for column names
           const name = row['الاسم'] || row['Name'] || row['اسم المعلم'] || '';
           const specializationStr = row['التخصص'] || row['Specialization'] || '';
           const mobile = row['الجوال'] || row['Mobile'] || row['رقم الجوال'] || '';
           const quota = row['نصاب الحصص'] || row['Quota'] || 24;
           const idNumber = row['رقم الهوية'] || row['رقم السجل المدني'] || row['idNumber'] || null;

           if (!name) return null; // Skip invalid rows

           return {
             id: `t-${index}-${Date.now()}`,
             name,
             mobile: String(mobile || ''),
             specialization: normalizeSpecialization(specializationStr),
             weeklyQuota: Number(quota) || 24,
             waitingQuota: 0,
             isAdmin: false,
             sortIndex: index,
             idNumber: idNumber ? String(idNumber).trim() : null,
           };
        }).filter(t => t !== null) as TeacherData[];

        resolve(teachers);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
