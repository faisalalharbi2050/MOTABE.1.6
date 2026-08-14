
import { Teacher, Subject, ClassInfo, Assignment, Phase } from '../types';
import { getClassSubjectPeriods } from './classSubjectPlans';

export const autoDistributeSubjects = (
  teachers: Teacher[],
  allSubjects: Subject[],
  classes: ClassInfo[],
  currentAssignments: Assignment[],
  gradeSubjectMap: Record<string, string[]>,
  schoolPhase: Phase
): { newAssignments: Assignment[], assignedCount: number, unassignedCount: number } => {

  // 1. Create a deep copy of assignments to work with
  const newAssignments = [...currentAssignments];
  
  // 2. Helper to get current load for a teacher
  const getTeacherLoad = (teacherId: string) => {
    return newAssignments
      .filter(a => a.teacherId === teacherId)
      .reduce((total, a) => {
        const sub = allSubjects.find(s => s.id === a.subjectId);
        const cls = classes.find(c => c.id === a.classId);
        return total + (sub && cls ? getClassSubjectPeriods(cls, sub) : 0);
      }, 0);
  };
 
  // Track live loads during the algorithm to avoid recalculating from full array every time
  const teacherLoads: Record<string, number> = {};
  teachers.forEach(t => {
    teacherLoads[t.id] = getTeacherLoad(t.id);
  });

  // 3. Filter classes for the current phase
  const targetClasses = classes.filter(c => c.phase === schoolPhase);

  // 4. Iterate through each class and its subjects
  let assignedCount = 0;
  let unassignedCount = 0;

  targetClasses.forEach(cls => {
    // Determine subjects for this class
    // Priority: Class-specific subjects -> Grade-level map -> Empty list
    let classSubjectIds: string[] = [];
    if (cls.subjectIdsCustomized || (cls.subjectIds && cls.subjectIds.length > 0)) {
      classSubjectIds = cls.subjectIds;
    } else {
      const gradeKey = `${schoolPhase}-${cls.grade}`;
      classSubjectIds = gradeSubjectMap[gradeKey] || [];
    }
    
    // Filter subjects that are relevant (exist in database)
    const classSubjects = allSubjects.filter(s => classSubjectIds.includes(s.id));

    classSubjects.forEach(sub => {
       // Check if already assigned
       const isAssigned = newAssignments.some(a => a.classId === cls.id && a.subjectId === sub.id);
       if (isAssigned) return;

       // Find eligible teachers
       // Criteria 1: Specialization Match
       let eligibleTeachers = teachers.filter(t => 
         sub.specializationIds.includes(t.specializationId) || t.specializationId === '1' // Special case: General/Din often flexible, but let's stick to strict match first
         || (sub.specializationIds.length === 0) // General subjects
       );
       
       // Refine Criteria 1: Strict match preferred
       const strictMatches = eligibleTeachers.filter(t => sub.specializationIds.includes(t.specializationId));
       if (strictMatches.length > 0) eligibleTeachers = strictMatches;

       // Criteria 2: Quota Check
       eligibleTeachers = eligibleTeachers.filter(t => {
         const currentLoad = teacherLoads[t.id];
          return (currentLoad + getClassSubjectPeriods(cls, sub)) <= t.quotaLimit;
       });

       if (eligibleTeachers.length === 0) {
         unassignedCount++;
         return;
       }

       // Criteria 3: Scoring & Sorting
       // We want to prioritize:
       // - Teachers already assigned to this class (reduce # of teachers per class)
       // - Teachers with lowest load ratio (balance)
       
       const scoredTeachers = eligibleTeachers.map(t => {
         let score = 0;
         
         // Bonus: Already teaches this class?
         const teachesClass = newAssignments.some(a => a.classId === cls.id && a.teacherId === t.id);
         if (teachesClass) score += 50;

         // Bonus: Lower load preference (inversely proportional to utilization)
         const loadRatio = teacherLoads[t.id] / t.quotaLimit;
         score += (1 - loadRatio) * 100;

         return { teacher: t, score };
       });

       // Sort descending by score
       scoredTeachers.sort((a, b) => b.score - a.score);

       // Pick winner
       const winner = scoredTeachers[0].teacher;

       // Assign
       newAssignments.push({
         teacherId: winner.id,
         classId: cls.id,
         subjectId: sub.id,
         isDraft: false
       });

       // Update Load Tracking
       teacherLoads[winner.id] += getClassSubjectPeriods(cls, sub);
       assignedCount++;
    });
  });

  return { newAssignments, assignedCount, unassignedCount };
};
