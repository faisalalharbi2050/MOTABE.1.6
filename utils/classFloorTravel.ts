import { ClassInfo, TimetableData } from '../types';

export const getFloorLabel = (floor?: number) => floor === undefined ? 'غير محدد' : ['الدور الأرضي', 'الدور الأول', 'الدور الثاني', 'الدور الثالث', 'الدور الرابع'][floor] || `الدور ${floor}`;

/** Incremental route cost: replace the old neighboring edge with the two new edges.
 * Unknown locations and facilities break the route; never infer their locations.
 * Consecutive lessons receive extra weight without rewarding empty periods.
 */
export function classroomTravelCost(timetable: TimetableData, classes: Map<string, ClassInfo>, teacherId: string, day: string, period: number, target: ClassInfo): number {
  if (!Number.isInteger(target.floorNumber) || (target.type && target.type !== 'class')) return 0;
  const lessons = Object.entries(timetable).filter(([key, slot]) => slot.teacherId === teacherId && key.slice(0, key.lastIndexOf('-')).endsWith(`-${day}`))
    .map(([key, slot]) => ({ period: Number(key.slice(key.lastIndexOf('-') + 1)), slot })).sort((a, b) => a.period - b.period);
  const before = lessons.filter(x => x.period < period).at(-1);
  const after = lessons.find(x => x.period > period);
  const floor = (entry: typeof before) => {
    if (!entry || entry.slot.facilityId || entry.slot.type !== 'lesson') return undefined;
    const cls = classes.get(entry.slot.classId);
    return cls && (!cls.type || cls.type === 'class') && (cls.schoolId || 'main') === (target.schoolId || 'main') ? cls.floorNumber : undefined;
  };
  const left = floor(before), right = floor(after), here = target.floorNumber!;
  const distance = (a?: number, b?: number) => a === undefined || b === undefined ? 0 : Math.abs(a - b);
  return distance(left, here) + distance(here, right) - distance(left, right)
    + (before?.period === period - 1 ? distance(left, here) * 0.5 : 0)
    + (after?.period === period + 1 ? distance(here, right) * 0.5 : 0);
}
