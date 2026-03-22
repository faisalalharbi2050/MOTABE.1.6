import { Phase, Specialization, Subject } from "./types";
import { STUDY_PLANS } from './study_plans';

export const INITIAL_SPECIALIZATIONS: Specialization[] = [
  { id: "1",  name: "دين" },
  { id: "2",  name: "عربي" },
  { id: "3",  name: "رياضيات" },
  { id: "4",  name: "علوم" },
  { id: "5",  name: "انجليزي" },
  { id: "6",  name: "الاجتماعيات" },
  { id: "7",  name: "الحاسب" },
  { id: "8",  name: "الفنية" },
  { id: "9",  name: "البدنية" },
  { id: "10", name: "كيمياء" },
  { id: "11", name: "أحياء" },
  { id: "12", name: "فيزياء" },
  { id: "13", name: "علوم إدارية" },
  { id: "14", name: "تربية فكرية" },
  { id: "15", name: "صعوبات تعلم" },
  { id: "16", name: "توحد" },
  { id: "17", name: "المكتبات" },
];

export const DETAILED_TEMPLATES: Record<string, Subject[]> = {
  ...STUDY_PLANS,
};

// دالة مساعدة لجمع جميع المواد من DETAILED_TEMPLATES
function getAllSubjectsFromTemplates(): Subject[] {
  const allSubjects: Subject[] = [];
  const seen = new Set<string>();
  
  // جمع جميع المواد من DETAILED_TEMPLATES
  for (const template of Object.values(DETAILED_TEMPLATES)) {
    if (Array.isArray(template)) {
      for (const subject of template) {
        if (!seen.has(subject.id)) {
          allSubjects.push(subject);
          seen.add(subject.id);
        }
      }
    }
  }
  
  return allSubjects;
}

export const INITIAL_SUBJECTS: Subject[] = getAllSubjectsFromTemplates();

export const PHASE_CONFIG = {
  [Phase.ELEMENTARY]: { grades: 6 },
  [Phase.MIDDLE]: { grades: 3 },
  [Phase.HIGH]: { grades: 3 },
  [Phase.KINDERGARTEN]: { grades: 3 },
  [Phase.OTHER]: { grades: 12 },
};
