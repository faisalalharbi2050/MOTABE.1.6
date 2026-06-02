import { ClassInfo } from '../types';

export const getClassNumber = (classInfo: Pick<ClassInfo, 'grade' | 'section'>) =>
  `${classInfo.section}/${classInfo.grade}`;

export const getClassLabel = (classInfo: Pick<ClassInfo, 'grade' | 'section'>) =>
  getClassNumber(classInfo);
