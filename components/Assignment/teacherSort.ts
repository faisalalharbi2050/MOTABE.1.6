import { SchoolInfo, Specialization, Teacher } from '../../types';

export const createSpecializationOrderIndex = (
  specializations: Specialization[],
  schoolInfo: Pick<SchoolInfo, 'specializationOrder'>
) => {
  const specIndex = new Map<string, number>();
  const savedOrder = schoolInfo.specializationOrder || [];
  savedOrder.forEach((id, index) => specIndex.set(id, index));

  let nextIndex = savedOrder.length;
  specializations.forEach(spec => {
    if (!specIndex.has(spec.id)) specIndex.set(spec.id, nextIndex++);
  });

  return specIndex;
};

export const compareTeachersByAssignmentOrder = (
  a: Teacher,
  b: Teacher,
  specIndex: Map<string, number>
) => {
  const aSpec = specIndex.get(a.specializationId) ?? Number.MAX_SAFE_INTEGER;
  const bSpec = specIndex.get(b.specializationId) ?? Number.MAX_SAFE_INTEGER;
  if (aSpec !== bSpec) return aSpec - bSpec;

  const aSort = a.sortIndex ?? 0;
  const bSort = b.sortIndex ?? 0;
  if (aSort !== bSort) return aSort - bSort;

  return 0;
};

export const sortTeachersByAssignmentOrder = (
  teachers: Teacher[],
  specializations: Specialization[],
  schoolInfo: Pick<SchoolInfo, 'specializationOrder'>
) => {
  const specIndex = createSpecializationOrderIndex(specializations, schoolInfo);
  return [...teachers].sort((a, b) => compareTeachersByAssignmentOrder(a, b, specIndex));
};

export const sortSpecIdsByAssignmentOrder = (
  specIds: string[],
  specializations: Specialization[],
  schoolInfo: Pick<SchoolInfo, 'specializationOrder'>
) => {
  const specIndex = createSpecializationOrderIndex(specializations, schoolInfo);
  return [...specIds].sort((a, b) => {
    const aSpec = specIndex.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bSpec = specIndex.get(b) ?? Number.MAX_SAFE_INTEGER;
    return aSpec - bSpec;
  });
};
