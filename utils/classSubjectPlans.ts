import { ClassInfo } from '../types';

export const getBaseGradeSubjectIds = (
  cls: { phase: string; grade: number; schoolId?: string },
  gradeSubjectMap: Record<string, string[]>
): string[] => {
  const schoolId = cls.schoolId || 'main';
  return (
    gradeSubjectMap[`${schoolId}-${cls.phase}-${cls.grade}`] ||
    gradeSubjectMap[`${cls.phase}-${cls.grade}`] ||
    []
  );
};

export const getClassSubjectIds = (
  cls: Pick<ClassInfo, 'phase' | 'grade' | 'schoolId' | 'subjectIds' | 'subjectPlanId'>,
  gradeSubjectMap: Record<string, string[]>
): string[] => {
  const baseIds = getBaseGradeSubjectIds(cls, gradeSubjectMap);
  if (!cls.subjectIds || cls.subjectIds.length === 0) return baseIds;
  if (cls.subjectPlanId) return cls.subjectIds;

  const baseKey = [...baseIds].sort().join('|');
  const classKey = [...cls.subjectIds].sort().join('|');
  if (baseIds.length === 0 || baseKey !== classKey) {
    return cls.subjectIds;
  }
  return baseIds;
};
