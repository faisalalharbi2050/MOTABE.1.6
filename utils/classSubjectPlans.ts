import { ClassInfo, Subject } from '../types';

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
  cls: Pick<ClassInfo, 'phase' | 'grade' | 'schoolId' | 'subjectIds' | 'subjectPlanId' | 'subjectIdsCustomized'>,
  gradeSubjectMap: Record<string, string[]>
): string[] => {
  const baseIds = getBaseGradeSubjectIds(cls, gradeSubjectMap);
  if (cls.subjectIdsCustomized) return cls.subjectIds || [];
  if (!cls.subjectIds || cls.subjectIds.length === 0) return baseIds;
  if (cls.subjectPlanId) return cls.subjectIds;

  const baseKey = [...baseIds].sort().join('|');
  const classKey = [...cls.subjectIds].sort().join('|');
  if (baseIds.length === 0 || baseKey !== classKey) {
    return cls.subjectIds;
  }
  return baseIds;
};

/** النصاب الأسبوعي الفعلي للمادة داخل فصل محدد، مع الرجوع للخطة الأساسية عند عدم وجود تخصيص. */
export const getClassSubjectPeriods = (
  cls: Pick<ClassInfo, 'subjectPeriodOverrides'>,
  subject: Pick<Subject, 'id' | 'periodsPerClass'>
): number => {
  const override = cls.subjectPeriodOverrides?.[subject.id];
  return Number.isFinite(override) && override! > 0 ? override! : Math.max(0, subject.periodsPerClass || 0);
};

export const hasClassSubjectCustomization = (
  cls: Pick<ClassInfo, 'subjectPeriodOverrides' | 'subjectIdsCustomized'>
): boolean => !!cls.subjectIdsCustomized || Object.keys(cls.subjectPeriodOverrides || {}).length > 0;
