import React, { useMemo, useState } from 'react';
import { Eye, CalendarDays, SlidersHorizontal, ClipboardList } from 'lucide-react';
import { SchoolInfo, SupervisionScheduleData } from '../../../types';
import {
  DAYS, DAY_NAMES, getTimingConfig,
  getSupervisionTableConfig, MAIN_SUPERVISION_TABLE_ID,
} from '../../../utils/supervisionUtils';

interface Props {
  supervisionData: SupervisionScheduleData;
  schoolInfo: SchoolInfo;
}

const PreviewTab: React.FC<Props> = ({ supervisionData, schoolInfo }) => {
  const activeDays = useMemo(
    () => getTimingConfig(schoolInfo).activeDays || DAYS.slice(),
    [schoolInfo]
  );

  const activeTypes = useMemo(
    () => (supervisionData.supervisionTypes || [])
      .filter(t => t.isEnabled)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    [supervisionData.supervisionTypes]
  );

  // أنواع الإشراف التي لها إسنادات فعلية (لإظهارها في فلتر الأنواع)
  const scheduledTypeIds = useMemo(() => {
    const ids = new Set<string>();
    supervisionData.dayAssignments.forEach(da =>
      da.staffAssignments.forEach(sa => {
        if (sa.contextTypeId) ids.add(sa.contextTypeId);
      })
    );
    return ids;
  }, [supervisionData.dayAssignments]);

  const filterableTypes = useMemo(
    () => activeTypes.filter(t => scheduledTypeIds.has(t.id)),
    [activeTypes, scheduledTypeIds]
  );

  // ─── الفلاتر (فارغ = الكل) ───
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);

  const toggleDay = (day: string) =>
    setSelectedDays(curr => curr.includes(day) ? curr.filter(d => d !== day) : [...curr, day]);
  const toggleType = (id: string) =>
    setSelectedTypeIds(curr => curr.includes(id) ? curr.filter(t => t !== id) : [...curr, id]);

  const visibleDays = selectedDays.length === 0
    ? activeDays
    : activeDays.filter(d => selectedDays.includes(d));
  const isTypeVisible = (id: string) => selectedTypeIds.length === 0 || selectedTypeIds.includes(id);

  // ─── تجميع الجداول: الرئيسي (المدمج) ثم الجداول المنفصلة ───
  const tables = useMemo(() => {
    const inlineTypes = activeTypes.filter(t => t.displayMode === 'inline' && isTypeVisible(t.id));
    const separateGroupsMap = activeTypes
      .filter(t => t.displayMode === 'separate' && isTypeVisible(t.id))
      .reduce((groups, type) => {
        const key = type.tableGroup || `solo-${type.id}`;
        groups.set(key, [...(groups.get(key) || []), type]);
        return groups;
      }, new Map<string, typeof activeTypes>());

    const list: { id: string; name: string; types: typeof activeTypes }[] = [];
    if (inlineTypes.length > 0) {
      list.push({ id: MAIN_SUPERVISION_TABLE_ID, name: 'الجدول الرئيسي', types: inlineTypes });
    }
    Array.from(separateGroupsMap.entries()).forEach(([id, types]) => {
      const isAutoId = id.startsWith('solo-') || /^table-\d+$/.test(id);
      list.push({ id, name: isAutoId ? types.map(t => t.name).join('، ') : id, types });
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTypes, selectedTypeIds]);

  const getDayAssignment = (day: string) =>
    supervisionData.dayAssignments.find(item => item.day === day);
  const getStaffForType = (day: string, typeId: string) =>
    (getDayAssignment(day)?.staffAssignments || []).filter(item => item.contextTypeId === typeId);
  const formatLocations = (locationIds: string[]) => locationIds
    .map(id => supervisionData.locations.find(l => l.id === id)?.name || '')
    .filter(Boolean)
    .join('، ');

  const showTitles = tables.length > 1;
  const hasAnyData = supervisionData.dayAssignments.some(da => da.staffAssignments.length > 0);

  // ─── حالة عدم وجود جدول ───
  if (!hasAnyData) {
    return (
      <div className="bg-white rounded-[2rem] p-12 border border-slate-200 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <ClipboardList size={30} className="text-slate-400" />
        </div>
        <p className="text-base font-black text-slate-700">لا يوجد جدول إشراف للمعاينة</p>
        <p className="text-sm font-medium text-slate-400 mt-2">
          أنشئ الجدول أولاً من مرحلة «تصميم وإنشاء الجدول».
        </p>
      </div>
    );
  }

  const chipBase = 'px-4 py-2 rounded-xl text-sm font-bold border transition-all whitespace-nowrap';
  const chipActive = 'bg-[#655ac1] text-white border-[#655ac1] shadow-sm shadow-[#655ac1]/20';
  const chipIdle = 'bg-white text-slate-600 border-slate-200 hover:border-[#cfc8ff] hover:text-[#655ac1]';

  return (
    <div className="space-y-4" dir="rtl">
      {/* ═══ شريط الفلاتر ═══ */}
      <div className="bg-white rounded-[2rem] p-5 border border-slate-200 shadow-sm space-y-4">
        {/* فلتر اليوم */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <CalendarDays size={15} className="text-[#655ac1]" />
            <span className="text-xs font-black text-slate-500">اليوم</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedDays([])}
              className={`${chipBase} ${selectedDays.length === 0 ? chipActive : chipIdle}`}
            >
              كل الأيام
            </button>
            {activeDays.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`${chipBase} ${selectedDays.includes(day) ? chipActive : chipIdle}`}
              >
                {DAY_NAMES[day] || day}
              </button>
            ))}
          </div>
        </div>

        {/* فلتر نوع الإشراف */}
        {filterableTypes.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2.5">
              <SlidersHorizontal size={15} className="text-[#655ac1]" />
              <span className="text-xs font-black text-slate-500">نوع الإشراف</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedTypeIds([])}
                className={`${chipBase} ${selectedTypeIds.length === 0 ? chipActive : chipIdle}`}
              >
                كل الأنواع
              </button>
              {filterableTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleType(type.id)}
                  className={`${chipBase} ${selectedTypeIds.includes(type.id) ? chipActive : chipIdle}`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ الجداول ═══ */}
      {tables.length === 0 ? (
        <div className="bg-white rounded-[2rem] p-10 border border-slate-200 shadow-sm text-center">
          <p className="text-sm font-bold text-slate-500">لا يوجد نوع إشراف مطابق للفلترة الحالية.</p>
        </div>
      ) : (
        tables.map(table => {
          const cfg = getSupervisionTableConfig(supervisionData, table.id);
          const showFollowUp = cfg.showFollowUp;
          const showLocations = cfg.showLocations;
          return (
            <div key={table.id} className="bg-white rounded-[2rem] p-5 sm:p-6 border border-slate-200 shadow-sm">
              {/* رأس المعاينة */}
              <div className="flex items-center gap-2 mb-4">
                <Eye size={22} className="text-[#655ac1] shrink-0" />
                <h3 className="text-base font-black text-slate-800 leading-tight truncate">
                  {showTitles ? table.name : 'جدول الإشراف اليومي'}
                </h3>
              </div>

              <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-slate-200">
                <table className="w-full border-collapse text-sm text-right">
                  <thead>
                    <tr className="bg-[#a59bf0] text-white border-b border-slate-400">
                      <th className="px-3 py-4 font-black text-center w-[110px] border-l border-white/40">اليوم</th>
                      {table.types.map(type => (
                        <th key={type.id} className="px-3 py-4 font-black text-center border-l border-white/40">
                          {type.name}
                        </th>
                      ))}
                      {showFollowUp && (
                        <th className="px-3 py-4 font-black text-center w-[130px]">المشرف المتابع</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDays.map(day => {
                      const da = getDayAssignment(day);
                      return (
                        <tr key={day} className="border-b-2 border-slate-300 last:border-b-0 hover:bg-slate-50/40 transition-colors">
                          <td className="px-3 py-3 text-center align-middle border-l border-slate-200 bg-slate-50/50">
                            <span className="font-black text-[#655ac1] text-base">{DAY_NAMES[day] || day}</span>
                          </td>
                          {table.types.map(type => {
                            const rows = getStaffForType(day, type.id);
                            return (
                              <td key={type.id} className="px-3 py-3 align-middle text-center border-l border-slate-200">
                                {rows.length === 0 ? (
                                  <span className="text-[11px] font-medium text-slate-300">—</span>
                                ) : (
                                  <div className="divide-y divide-slate-100">
                                    {rows.map((row, i) => {
                                      const locations = showLocations ? formatLocations(row.locationIds) : '';
                                      return (
                                        <div key={i} className="py-2 first:pt-0 last:pb-0 leading-snug">
                                          <div className="text-xs font-bold text-slate-800">{row.staffName}</div>
                                          {showLocations && (
                                            <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                                              {locations || 'بدون موقع محدد'}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          {showFollowUp && (
                            <td className="px-3 py-3 align-middle text-center text-xs font-bold text-slate-800">
                              {da?.followUpSupervisorName || <span className="text-slate-300">—</span>}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default PreviewTab;
