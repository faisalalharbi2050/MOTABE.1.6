import React, { useState, useMemo } from 'react';
import {
  Calendar, MapPin, Plus, X, Copy, Trash2, RotateCcw,
  ChevronDown, Check, AlertTriangle, Search, Shield,
  BarChart3, Users, ClipboardList, SlidersHorizontal, Edit3,
  MapPinned, UserRoundCheck,
} from 'lucide-react';
import {
  SchoolInfo, Teacher, Admin, ScheduleSettingsData,
  SupervisionScheduleData, SupervisionDayAssignment, SupervisionStaffAssignment,
  SupervisionType, SavedSupervisionSchedule,
} from '../../types';
import {
  DAYS, DAY_NAMES, getTimingConfig, getAvailableStaff,
  generateSmartAssignment, isStaffSuitableForCategory,
} from '../../utils/supervisionUtils';
import BuilderEmptyState from './BuilderEmptyState';

interface Props {
  supervisionData: SupervisionScheduleData;
  setSupervisionData: React.Dispatch<React.SetStateAction<SupervisionScheduleData>>;
  teachers: Teacher[];
  admins: Admin[];
  scheduleSettings: ScheduleSettingsData;
  schoolInfo: SchoolInfo;
  suggestedCount: number;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

interface AddPanelContext {
  day: string;
  contextTypeId: string;
  contextLabel: string;
  mode?: 'add' | 'edit';
  editStaffId?: string;
}

const SupervisionScheduleBuilder: React.FC<Props> = ({
  supervisionData, setSupervisionData, teachers, admins,
  scheduleSettings, schoolInfo, showToast,
}) => {
  // ═══════════ State ═══════════
  const [manualStarted, setManualStarted] = useState(false);
  const [addPanel, setAddPanel] = useState<AddPanelContext | null>(null);
  const [addSearch, setAddSearch] = useState('');
  const [addStaffTab, setAddStaffTab] = useState<'teacher' | 'admin'>('teacher');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [showFollowUpPicker, setShowFollowUpPicker] = useState<string | null>(null);
  const [followUpSearch, setFollowUpSearch] = useState('');
  const [followUpTab, setFollowUpTab] = useState<'teacher' | 'admin'>('teacher');
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string>('');
  const [bulkLocationIds, setBulkLocationIds] = useState<string[]>([]);
  const [bulkTargetTypeIds, setBulkTargetTypeIds] = useState<string[]>([]);
  const [bulkStaffLocationIds, setBulkStaffLocationIds] = useState<string[]>([]);
  const [bulkStaffKeys, setBulkStaffKeys] = useState<string[]>([]);
  const [bulkStaffTab, setBulkStaffTab] = useState<'teacher' | 'admin'>('teacher');
  const [bulkStaffSearch, setBulkStaffSearch] = useState('');
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  const [showBulkLocationPicker, setShowBulkLocationPicker] = useState(false);
  const [showBulkStaffLocationPicker, setShowBulkStaffLocationPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  const [locationModalView, setLocationModalView] = useState<'cards' | 'type' | 'staff'>('cards');
  const [showFollowUpMenu, setShowFollowUpMenu] = useState(false);
  const [pendingStaffRemoval, setPendingStaffRemoval] = useState<{ day: string; contextTypeId: string; staffId: string; staffName: string } | null>(null);

  // ═══════════ Derived data ═══════════
  const timing = getTimingConfig(schoolInfo);
  const activeDays = timing.activeDays || DAYS.slice();
  const dayAssignments = supervisionData.dayAssignments;
  const activeLocations = supervisionData.locations.filter(l => l.isActive);
  const showFollowUpSupervisor = supervisionData.settings.enableFollowUpSupervisor !== false;

  const syncActiveSavedSchedule = (
    prev: SupervisionScheduleData,
    next: SupervisionScheduleData
  ): SupervisionScheduleData => {
    const activeId = next.activeScheduleId || prev.activeScheduleId;
    if (!activeId) return next;
    const schedules = next.savedSchedules || prev.savedSchedules || [];
    if (!schedules.some(schedule => schedule.id === activeId)) return next;
    return {
      ...next,
      activeScheduleId: activeId,
      savedSchedules: schedules.map(schedule =>
        schedule.id === activeId ? { ...schedule, dayAssignments: next.dayAssignments } : schedule
      ),
    };
  };

  const buildSavedSchedule = (
    id: string,
    number: number,
    dayAssignmentsValue: SupervisionDayAssignment[]
  ): SavedSupervisionSchedule => ({
    id,
    name: `جدول رقم ${number}`,
    createdAt: new Date().toISOString(),
    dayAssignments: dayAssignmentsValue,
    isApproved: false,
  });

  const getDefaultLocationIdsForType = (typeMeta?: SupervisionType | null): string[] => {
    if (typeMeta?.category !== 'prayer') return [];
    const prayerHall = activeLocations.find(loc => loc.category === 'prayer_hall');
    return prayerHall ? [prayerHall.id] : [];
  };

  // أنواع الإشراف المفعّلة المعروضة ضمن الجدول الرئيسي
  const inlineTypes = useMemo<SupervisionType[]>(() => {
    const types = supervisionData.supervisionTypes || [];
    return types
      .filter(t => t.isEnabled && t.displayMode === 'inline')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [supervisionData.supervisionTypes]);

  // أنواع الإشراف التي تُعرض في جداول مستقلة أسفل الجدول الرئيسي
  const separateTypes = useMemo<SupervisionType[]>(() => {
    const types = supervisionData.supervisionTypes || [];
    return types
      .filter(t => t.isEnabled && t.displayMode === 'separate')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [supervisionData.supervisionTypes]);

  const separateTypeGroups = useMemo(() => {
    const groups = new Map<string, SupervisionType[]>();
    separateTypes.forEach(type => {
      const key = type.tableGroup || `solo-${type.id}`;
      groups.set(key, [...(groups.get(key) || []), type]);
    });
    return Array.from(groups.entries()).map(([id, types]) => ({ id, types }));
  }, [separateTypes]);

  const locationTargetTypes = useMemo(
    () => [...inlineTypes, ...separateTypes].sort((a, b) => a.sortOrder - b.sortOrder),
    [inlineTypes, separateTypes]
  );

  const availableStaff = useMemo(
    () => getAvailableStaff(teachers, admins, supervisionData.exclusions, supervisionData.settings),
    [teachers, admins, supervisionData.exclusions, supervisionData.settings]
  );

  const assignedStaffForBulkLocations = useMemo(() => {
    const staffMap = new Map<string, { key: string; id: string; name: string; type: 'teacher' | 'admin'; count: number }>();
    dayAssignments.forEach(da => {
      da.staffAssignments.forEach(sa => {
        const key = `${sa.staffType}-${sa.staffId}`;
        const existing = staffMap.get(key);
        if (existing) {
          existing.count += 1;
          return;
        }
        staffMap.set(key, {
          key,
          id: sa.staffId,
          name: sa.staffName,
          type: sa.staffType,
          count: 1,
        });
      });
    });
    return Array.from(staffMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [dayAssignments]);

  // ═══════════ Empty state ═══════════
  const hasContent = dayAssignments.some(
    da => da.staffAssignments.length > 0 || !!da.followUpSupervisorId
  );
  const showEmptyState = !hasContent && !manualStarted;
  const hasTimetable = !!scheduleSettings?.timetable
    && Object.keys(scheduleSettings.timetable).length > 0;

  // ═══════════ Cell helpers (day + contextTypeId) ═══════════
  const getDayAssignment = (day: string): SupervisionDayAssignment =>
    dayAssignments.find(d => d.day === day) || { day, staffAssignments: [] };

  /** إرجاع المشرفين المسندين لخانة (يوم + نوع إشراف) */
  const getStaffForCell = (day: string, contextTypeId: string): SupervisionStaffAssignment[] => {
    const da = getDayAssignment(day);
    return da.staffAssignments.filter(sa => sa.contextTypeId === contextTypeId);
  };

  /** كل المعلمين/الإداريين الذين أُسندوا أصلاً لهذه الخانة (للاستثناء من قائمة الإضافة) */
  const getStaffIdsInCell = (day: string, contextTypeId: string): Set<string> =>
    new Set(getStaffForCell(day, contextTypeId).map(sa => sa.staffId));

  const updateDayAssignment = (
    day: string,
    updater: (da: SupervisionDayAssignment) => SupervisionDayAssignment
  ) => {
    setSupervisionData(prev => {
      const existing = prev.dayAssignments.find(d => d.day === day);
      if (existing) {
        const next = {
          ...prev,
          dayAssignments: prev.dayAssignments.map(d => d.day === day ? updater(d) : d),
        };
        return syncActiveSavedSchedule(prev, next);
      }
      const next = {
        ...prev,
        dayAssignments: [...prev.dayAssignments, updater({ day, staffAssignments: [] })],
      };
      return syncActiveSavedSchedule(prev, next);
    });
  };

  // ═══════════ Top-level handlers ═══════════
  const handleAutoGenerate = () => {
    if ((supervisionData.savedSchedules || []).length >= 10) {
      showToast('وصلت للحد الأقصى 10 جداول. احذف أحد الجداول من إدارة الجداول قبل إنشاء جدول جديد.', 'warning');
      return;
    }

    const autoTypes = (supervisionData.supervisionTypes || [])
      .filter(type => type.isEnabled && (type.category === 'break' || type.category === 'prayer'));

    if (autoTypes.length === 0) {
      showToast('التوليد التلقائي متاح لإشراف الفسحة أو إشراف الصلاة فقط', 'warning');
      return;
    }

    const baseResult = generateSmartAssignment(
      teachers, admins,
      supervisionData.exclusions,
      supervisionData.settings,
      scheduleSettings, schoolInfo,
      supervisionData.periods.filter(p => p.isEnabled),
    );

    const result = baseResult.map(dayAssignment => ({
      ...dayAssignment,
      staffAssignments: dayAssignment.staffAssignments.flatMap(assignment =>
        autoTypes.map(type => ({
          ...assignment,
          locationIds: getDefaultLocationIdsForType(type),
          contextCategory: type.category,
          contextTypeId: type.id,
        }))
      ),
    }));

    setSupervisionData(prev => {
      const prevSaved = prev.savedSchedules || [];
      if (prevSaved.length >= 10) return prev;
      const newId = `supervision-schedule-${Date.now()}`;
      const newSavedEntry = buildSavedSchedule(newId, prevSaved.length + 1, result);
      return {
        ...prev,
        dayAssignments: result,
        isApproved: false,
        approvedAt: undefined,
        savedSchedules: [newSavedEntry, ...prevSaved],
        activeScheduleId: newId,
      };
    });
    setManualStarted(false);
    showToast('تم توليد إشراف الفسحة/الصلاة تلقائياً، وباقي الأنواع جاهزة للتعبئة اليدوية', 'success');
  };

  const handleManualStart = () => {
    if ((supervisionData.savedSchedules || []).length >= 10) {
      showToast('وصلت للحد الأقصى 10 جداول. احذف أحد الجداول من إدارة الجداول قبل إنشاء جدول جديد.', 'warning');
      return;
    }
    setSupervisionData(prev => {
      const prevSaved = prev.savedSchedules || [];
      if (prevSaved.length >= 10) return prev;
      const newId = `supervision-schedule-${Date.now()}`;
      const newSavedEntry = buildSavedSchedule(newId, prevSaved.length + 1, []);
      return {
        ...prev,
        dayAssignments: [],
        isApproved: false,
        approvedAt: undefined,
        savedSchedules: [newSavedEntry, ...prevSaved],
        activeScheduleId: newId,
      };
    });
    setManualStarted(true);
  };

  const handleReset = () => {
    setSupervisionData(prev => ({ ...prev, dayAssignments: [], activeScheduleId: undefined, isApproved: false, approvedAt: undefined }));
    setManualStarted(false);
    setShowResetConfirm(false);
    showToast('تم إعادة بدء الجدول — اختر طريقة الإنشاء من جديد', 'success');
  };

  const handleDeleteAll = () => {
    setSupervisionData(prev => {
      const next = {
        ...prev,
        dayAssignments: prev.dayAssignments.map(da => ({
          ...da,
          staffAssignments: [],
          followUpSupervisorId: undefined,
          followUpSupervisorName: undefined,
        })),
      };
      return syncActiveSavedSchedule(prev, next);
    });
    setShowDeleteAllConfirm(false);
    showToast('تم حذف كل الإسنادات', 'success');
  };

  // ═══════════ Staff cell handlers ═══════════
  const openAddPanel = (day: string, contextTypeId: string, contextLabel: string, editStaffId?: string) => {
    const existing = editStaffId
      ? getStaffForCell(day, contextTypeId).find(sa => sa.staffId === editStaffId)
      : null;
    setAddPanel({ day, contextTypeId, contextLabel, mode: editStaffId ? 'edit' : 'add', editStaffId });
    setSelectedStaffIds(editStaffId ? [] : []);
    setAddStaffTab(existing?.staffType === 'admin' ? 'admin' : 'teacher');
    setAddSearch('');
  };

  const closeAddPanel = () => {
    setAddPanel(null);
    setSelectedStaffIds([]);
    setAddSearch('');
    setAddStaffTab('teacher');
  };

  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaffIds(prev => {
      if (addPanel?.mode === 'edit') return prev.includes(staffId) ? [] : [staffId];
      return prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId];
    });
  };

  const saveSelectedStaff = () => {
    if (!addPanel || selectedStaffIds.length === 0) {
      closeAddPanel();
      return;
    }
    const { day, contextTypeId } = addPanel;
    const typeMeta = supervisionData.supervisionTypes.find(t => t.id === contextTypeId);
    if (!typeMeta) return;

    updateDayAssignment(day, da => {
      const newAssignments: SupervisionStaffAssignment[] = selectedStaffIds
        .map(staffId => {
          const staff = availableStaff.find(s => s.id === staffId);
          if (!staff) return null;
          return {
            staffId: staff.id,
            staffName: staff.name,
            staffType: staff.type,
            locationIds: getDefaultLocationIdsForType(typeMeta),
            contextCategory: typeMeta.category,
            contextTypeId: typeMeta.id,
          } as SupervisionStaffAssignment;
        })
        .filter((x): x is SupervisionStaffAssignment => x !== null);
      const currentAssignments = addPanel.mode === 'edit' && addPanel.editStaffId
        ? da.staffAssignments.filter(sa => !(sa.staffId === addPanel.editStaffId && sa.contextTypeId === contextTypeId))
        : da.staffAssignments;
      return { ...da, staffAssignments: [...currentAssignments, ...newAssignments] };
    });

    showToast(addPanel.mode === 'edit' ? 'تم تعديل المشرف بنجاح' : `تم إضافة ${selectedStaffIds.length} مشرف ليوم ${DAY_NAMES[day]}`, 'success');
    closeAddPanel();
  };

  const removeStaffFromCell = (day: string, contextTypeId: string, staffId: string) => {
    updateDayAssignment(day, da => ({
      ...da,
      staffAssignments: da.staffAssignments.filter(
        sa => !(sa.staffId === staffId && sa.contextTypeId === contextTypeId)
      ),
    }));
  };

  const requestRemoveStaffFromCell = (day: string, contextTypeId: string, staff: SupervisionStaffAssignment) => {
    setPendingStaffRemoval({ day, contextTypeId, staffId: staff.staffId, staffName: staff.staffName });
  };

  const confirmRemoveStaffFromCell = () => {
    if (!pendingStaffRemoval) return;
    removeStaffFromCell(pendingStaffRemoval.day, pendingStaffRemoval.contextTypeId, pendingStaffRemoval.staffId);
    setPendingStaffRemoval(null);
  };

  const toggleLocation = (day: string, staffId: string, contextTypeId: string, locationId: string) => {
    updateDayAssignment(day, da => ({
      ...da,
      staffAssignments: da.staffAssignments.map(sa => {
        if (!(sa.staffId === staffId && sa.contextTypeId === contextTypeId)) return sa;
        const has = sa.locationIds.includes(locationId);
        return {
          ...sa,
          locationIds: has ? sa.locationIds.filter(id => id !== locationId) : [...sa.locationIds, locationId],
        };
      }),
    }));
  };

  const getLocationSummary = (locationIds: string[]) => {
    const names = locationIds
      .map(id => activeLocations.find(loc => loc.id === id)?.name || '')
      .filter(Boolean);
    if (names.length === 0) return 'اختر موقع...';
    if (names.length === 1) return names[0];
    return `${names[0]} +${names.length - 1}`;
  };

  // ═══════════ Bulk locations ═══════════
  const toggleBulkLocation = (locationId: string) => {
    setBulkLocationIds(prev =>
      prev.includes(locationId) ? prev.filter(id => id !== locationId) : [...prev, locationId]
    );
  };

  const toggleBulkStaffLocation = (locationId: string) => {
    setBulkStaffLocationIds(prev =>
      prev.includes(locationId) ? prev.filter(id => id !== locationId) : [...prev, locationId]
    );
  };

  const toggleBulkStaff = (staffKey: string) => {
    setBulkStaffKeys(prev =>
      prev.includes(staffKey) ? prev.filter(key => key !== staffKey) : [...prev, staffKey]
    );
  };

  const toggleBulkTargetType = (typeId: string) => {
    setBulkTargetTypeIds(prev => prev[0] === typeId ? [] : [typeId]);
  };

  const getBulkTargetTypeIds = () =>
    bulkTargetTypeIds.length > 0 ? bulkTargetTypeIds : (locationTargetTypes[0] ? [locationTargetTypes[0].id] : []);

  const copyLocationToAllInDay = (day: string) => {
    if (bulkLocationIds.length === 0) {
      showToast('اختر موقعاً واحداً على الأقل', 'warning');
      return;
    }
    const targetTypeIds = getBulkTargetTypeIds();
    updateDayAssignment(day, da => ({
      ...da,
      staffAssignments: da.staffAssignments.map(sa => (
        targetTypeIds.includes(sa.contextTypeId)
          ? { ...sa, locationIds: Array.from(new Set([...sa.locationIds, ...bulkLocationIds])) }
          : sa
      )),
    }));
    showToast(`تم تطبيق المواقع للأعمدة المحددة في ${DAY_NAMES[day]}`, 'success');
  };

  const copyLocationToAllDays = () => {
    if (bulkLocationIds.length === 0) {
      showToast('اختر موقعاً واحداً على الأقل', 'warning');
      return;
    }
    const targetTypeIds = getBulkTargetTypeIds();
    setSupervisionData(prev => {
      const next = {
        ...prev,
        dayAssignments: prev.dayAssignments.map(da => ({
          ...da,
          staffAssignments: da.staffAssignments.map(sa => (
            targetTypeIds.includes(sa.contextTypeId)
              ? { ...sa, locationIds: Array.from(new Set([...sa.locationIds, ...bulkLocationIds])) }
              : sa
          )),
        })),
      };
      return syncActiveSavedSchedule(prev, next);
    });
    showToast('تم تطبيق المواقع على الأعمدة المحددة في كل الأيام', 'success');
  };

  const clearLocations = (day?: string) => {
    const targetTypeIds = getBulkTargetTypeIds();
    setSupervisionData(prev => {
      const next = {
        ...prev,
        dayAssignments: prev.dayAssignments.map(da => {
          if (day && da.day !== day) return da;
          return {
            ...da,
            staffAssignments: da.staffAssignments.map(sa => (
              targetTypeIds.includes(sa.contextTypeId) ? { ...sa, locationIds: [] } : sa
            )),
          };
        }),
      };
      return syncActiveSavedSchedule(prev, next);
    });
    if (!day) {
      setBulkLocationIds([]);
      setShowBulkLocationPicker(false);
      setShowDayDropdown(false);
    }
    showToast(day ? `تم مسح المواقع ليوم ${DAY_NAMES[day]}` : 'تم مسح كل المواقع', 'success');
  };

  const applyLocationsToSelectedStaff = () => {
    if (bulkStaffKeys.length === 0) {
      showToast('اختر مشرفًا واحدًا على الأقل', 'warning');
      return;
    }
    if (bulkStaffLocationIds.length === 0) {
      showToast('اختر موقعًا واحدًا على الأقل', 'warning');
      return;
    }

    const selectedKeys = new Set(bulkStaffKeys);
    setSupervisionData(prev => {
      const next = {
        ...prev,
        dayAssignments: prev.dayAssignments.map(da => ({
          ...da,
          staffAssignments: da.staffAssignments.map(sa => {
            const key = `${sa.staffType}-${sa.staffId}`;
            if (!selectedKeys.has(key)) return sa;
            return {
              ...sa,
              locationIds: Array.from(new Set([...sa.locationIds, ...bulkStaffLocationIds])),
            };
          }),
        })),
      };
      return syncActiveSavedSchedule(prev, next);
    });
    showToast('تم تطبيق المواقع على إسنادات المشرفين المحددين', 'success');
  };

  // ═══════════ Follow-up handlers ═══════════
  const followUpCandidates = useMemo(() => {
    const list: { id: string; name: string; type: 'teacher' | 'admin'; role?: string }[] = [];
    teachers.forEach(t => list.push({ id: t.id, name: t.name, type: 'teacher', role: 'معلم' }));
    admins.forEach(a => list.push({ id: a.id, name: a.name, type: 'admin', role: a.role || 'إداري' }));
    return list;
  }, [admins, teachers]);

  const setFollowUpSupervisor = (day: string, staffId: string, staffName: string) => {
    updateDayAssignment(day, da => ({
      ...da,
      followUpSupervisorId: staffId,
      followUpSupervisorName: staffName,
    }));
    setShowFollowUpPicker(null);
    setSelectedFollowUpId('');
    setFollowUpSearch('');
  };

  const removeFollowUpSupervisor = (day: string) => {
    updateDayAssignment(day, da => ({
      ...da,
      followUpSupervisorId: undefined,
      followUpSupervisorName: undefined,
    }));
  };

  const copyFollowUpToAllDays = (sourceDay: string) => {
    const da = getDayAssignment(sourceDay);
    if (!da.followUpSupervisorId || !da.followUpSupervisorName) return;
    setSupervisionData(prev => {
      const newAssignments = activeDays.map(day => {
        const existing = prev.dayAssignments.find(d => d.day === day) || { day, staffAssignments: [] };
        return {
          ...existing,
          followUpSupervisorId: da.followUpSupervisorId,
          followUpSupervisorName: da.followUpSupervisorName,
        };
      });
      const next = { ...prev, dayAssignments: newAssignments };
      return syncActiveSavedSchedule(prev, next);
    });
    showToast('تم تعيين المشرف المتابع لجميع الأيام', 'success');
  };

  // ═══════════ Empty state ═══════════
  if (showEmptyState) {
    return (
      <BuilderEmptyState
        onAutoGenerate={handleAutoGenerate}
        onManualStart={handleManualStart}
        availableCount={availableStaff.length}
        hasTimetable={hasTimetable}
      />
    );
  }

  // ═══════════ Suitability for current add-panel context ═══════════
  const currentTypeForPanel = addPanel
    ? supervisionData.supervisionTypes.find(t => t.id === addPanel.contextTypeId)
    : null;

  const suitabilityForStaff = (staff: { id: string; type: 'teacher' | 'admin' }) => {
    if (!addPanel || !currentTypeForPanel) return null;
    return isStaffSuitableForCategory(
      staff.type,
      staff.id,
      addPanel.day,
      currentTypeForPanel.category,
      schoolInfo,
      scheduleSettings.timetable || {}
    );
  };

  // كل المشرفين الذين سبق إسنادهم لنفس (يوم + نوع) يُستثنون من قائمة الإضافة
  const excludedInThisCell = addPanel
    ? getStaffIdsInCell(addPanel.day, addPanel.contextTypeId)
    : new Set<string>();

  const cellStaffStats = inlineTypes.length > 0
    ? activeDays.reduce((acc, day) => acc + getStaffForCell(day, inlineTypes[0]?.id || '').length, 0)
    : 0;

  const renderCompactStaffRow = (day: string, type: SupervisionType, sa: SupervisionStaffAssignment) => (
    <div
      key={`${sa.staffId}-${sa.contextTypeId}`}
      className="relative grid grid-cols-[minmax(9rem,1.15fr)_minmax(8rem,1fr)_auto] items-center gap-2 bg-white px-2.5 py-2 border-b border-slate-200/80 last:border-b-0"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold leading-snug text-slate-800 whitespace-normal break-words">{sa.staffName}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
            sa.staffType === 'teacher' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
          }`}>
            {sa.staffType === 'teacher' ? 'معلم' : 'إداري'}
          </span>
        </div>
      </div>

      <div className="relative min-w-0">
        <button
          onClick={() => setShowLocationPicker(prev =>
            prev === `${day}-${sa.staffId}-${type.id}` ? null : `${day}-${sa.staffId}-${type.id}`
          )}
          className="w-full bg-white border border-slate-200 hover:border-[#655ac1]/50 text-[11px] font-bold rounded-lg px-2 py-1.5 text-right flex items-center justify-between gap-1 transition-colors"
        >
          <span className={`flex items-center gap-1 truncate ${sa.locationIds.length > 0 ? 'text-slate-700' : 'text-slate-400'}`}>
            <MapPin size={10} className="shrink-0" />
            <span className="truncate">{getLocationSummary(sa.locationIds)}</span>
          </span>
          <ChevronDown size={11} className="text-slate-400 shrink-0" />
        </button>
        {showLocationPicker === `${day}-${sa.staffId}-${type.id}` && (
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setShowLocationPicker(null)} />
            <div className="absolute top-[calc(100%+0.25rem)] right-0 z-[9999] w-56 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden">
              <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700">المواقع</span>
                <span className="text-[9px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded-full font-bold">{sa.locationIds.length}</span>
              </div>
              <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                {activeLocations.map(loc => {
                  const isSel = sa.locationIds.includes(loc.id);
                  return (
                    <button
                      key={loc.id}
                      onClick={() => toggleLocation(day, sa.staffId, type.id, loc.id)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-right hover:bg-slate-50 transition-colors"
                    >
                      <span className={`text-xs font-bold ${isSel ? 'text-[#655ac1]' : 'text-slate-700'}`}>{loc.name}</span>
                      <div className={`mr-auto w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${isSel ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300'}`}>
                        {isSel && <Check size={10} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => openAddPanel(day, type.id, type.name, sa.staffId)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          title="تعديل"
        >
          <Edit3 size={12} />
        </button>
        <button
          onClick={() => requestRemoveStaffFromCell(day, type.id, sa)}
          className="p-1.5 rounded-lg border border-rose-100 text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
          title="حذف"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );

  // ═══════════ Render ═══════════
  return (
    <div className="space-y-6">
      {/* ═══ Top Toolbar ═══ */}
      <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-200 flex flex-col items-stretch gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5">
          <div className="flex items-center gap-3">
            <SlidersHorizontal size={22} className="text-[#655ac1]" />
            <h3 className="text-base font-black text-slate-800">إجراءات جدول الإشراف اليومي</h3>
          </div>
        </div>
        <div dir="rtl" className="mt-2 pt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 justify-start">
            <button
              onClick={() => setShowLocationsModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-700 hover:border-[#655ac1] hover:bg-white transition-all"
              title="تعيين مواقع الإشراف"
            >
              <MapPin size={16} />
              تعيين مواقع الإشراف
            </button>
            <div className="relative">
              <button
                onClick={() => setShowFollowUpMenu(prev => !prev)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-700 hover:border-[#655ac1] hover:bg-white transition-all"
                title="تعيين المشرف المتابع"
              >
                <Shield size={16} />
                تعيين مشرف متابع
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              {showFollowUpMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFollowUpMenu(false)} />
                  <div className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-44 bg-white border border-slate-200 rounded-2xl overflow-hidden p-1">
                    {[
                      { value: true, label: 'تعيين' },
                      { value: false, label: 'عدم تعيين' },
                    ].map(opt => (
                      <button
                        key={String(opt.value)}
                        onClick={() => {
                          setSupervisionData(prev => ({
                            ...prev,
                            settings: { ...prev.settings, enableFollowUpSupervisor: opt.value },
                          }));
                          setShowFollowUpMenu(false);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-right text-xs font-black text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <span>{opt.label}</span>
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          showFollowUpSupervisor === opt.value ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'
                        }`}>
                          {showFollowUpSupervisor === opt.value && <Check size={10} strokeWidth={3} />}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
            <button
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-700 hover:border-[#655ac1] hover:bg-white transition-all"
              title="عرض تقرير توزيع المشرفين"
            >
              <BarChart3 size={16} />
              تقرير التوزيع
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-700 hover:border-[#655ac1] hover:bg-white transition-all"
              title="إعادة الإنشاء"
            >
              <RotateCcw size={16} />
              إعادة الإنشاء
            </button>
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-rose-200 text-rose-600 hover:border-rose-400 hover:bg-rose-50 transition-all"
              title="حذف كل الإسنادات"
            >
              <Trash2 size={16} />
              حذف الكل
            </button>
          </div>
        </div>
      </div>

      {/* ═══ No inline types warning ═══ */}
      {inlineTypes.length === 0 && separateTypes.length === 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs font-medium text-amber-800 leading-relaxed">
            <span className="font-black">لا توجد أنواع مفعّلة لعرضها في الجدول الرئيسي.</span> اذهب إلى{' '}
            <span className="font-bold">إعدادات الإشراف ← أنواع الإشراف</span> وفعّل الأنواع التي تريد إدارتها هنا، أو غيّر طريقة عرضها إلى «ضمن الجدول الرئيسي».
          </div>
        </div>
      )}

      {/* ═══ Bulk Location Modal ═══ */}
      {showLocationsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => { setShowLocationsModal(false); setLocationModalView('cards'); setShowBulkLocationPicker(false); setShowBulkStaffLocationPicker(false); setShowDayDropdown(false); }}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <MapPin size={24} className="text-[#655ac1]" />
                <div>
                  <h3 className="text-base font-black text-slate-800">تعيين مواقع الإشراف</h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">طبّق المواقع حسب نوع الإشراف أو حسب مجموعة مشرفين</p>
                </div>
              </div>
              <button onClick={() => { setShowLocationsModal(false); setLocationModalView('cards'); }} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          {locationModalView === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <button
                type="button"
                onClick={() => setLocationModalView('type')}
                className="relative rounded-3xl p-6 border-2 bg-white border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-right flex flex-col min-h-[220px]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <MapPinned size={22} strokeWidth={1.8} className="text-[#8779fb] shrink-0" />
                  <h4 className="text-lg font-black text-slate-800">تعيين مواقع الإشراف حسب نوع الإشراف</h4>
                </div>
                <p className="text-xs font-medium text-slate-600 leading-relaxed mb-4">
                  اختر نوع الإشراف ( مثال : الفسحة ) ثم اختر المواقع المطلوب توزيع المشرفين عليها ثم اختر التطبيق على كل الأيام أو أيام محددة.
                </p>
                <span className="mt-auto mx-auto w-full max-w-[230px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#655ac1] text-sm font-bold bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20">
                  تعيين
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLocationModalView('staff')}
                className="relative rounded-3xl p-6 border-2 bg-white border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-right flex flex-col min-h-[220px]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <UserRoundCheck size={22} strokeWidth={1.8} className="text-[#8779fb] shrink-0" />
                  <h4 className="text-lg font-black text-slate-800">تعيين مواقع الإشراف حسب المشرفين</h4>
                </div>
                <p className="text-xs font-medium text-slate-600 leading-relaxed mb-4">
                  اختر مجموعة من المشرفين ، ثم اختر لهم المواقع المناسبة ثم تطبيق.
                </p>
                <span className="mt-auto mx-auto w-full max-w-[230px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#655ac1] text-sm font-bold bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20">
                  تعيين
                </span>
              </button>
            </div>
          )}

          {locationModalView === 'type' && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
            <div className="mb-4">
              <h4 className="text-sm font-black text-slate-800">تعيين مواقع الإشراف حسب نوع الإشراف</h4>
              <p className="text-[11px] font-medium text-slate-500 mt-1">اختر نوع الإشراف ( مثال : الفسحة ) ثم اختر المواقع المطلوب توزيع المشرفين عليها ثم اختر التطبيق على كل الأيام أو أيام محددة.</p>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-4 w-full">
            <div>
              <p className="text-xs font-black text-slate-600 mb-2">أعمدة الإشراف المستهدفة</p>
              <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                {locationTargetTypes.map((type, index) => {
                  const selected = (bulkTargetTypeIds[0] || locationTargetTypes[0]?.id) === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => toggleBulkTargetType(type.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-right hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-sm font-bold text-slate-700">{type.name}</span>
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        selected ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'
                      }`}>
                        {selected && <Check size={14} strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-2">
                اختر نوع إشراف واحد فقط لتطبيق المواقع عليه.
              </p>
            </div>

            <div className="relative w-full">
              <p className="text-xs font-black text-slate-600 mb-2">المواقع المختارة</p>
              <button
                onClick={() => setShowBulkLocationPicker(prev => !prev)}
                className="w-full bg-white border-2 border-slate-300 hover:border-[#655ac1] text-slate-700 text-sm font-bold rounded-xl px-3 py-2.5 transition-all text-right flex items-center justify-between gap-2"
              >
                <span className={bulkLocationIds.length > 0 ? 'text-slate-700' : 'text-slate-400'}>
                  {bulkLocationIds.length > 0 ? getLocationSummary(bulkLocationIds) : 'اختر موقعاً...'}
                </span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>

              {showBulkLocationPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowBulkLocationPicker(false)} />
                  <div className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-full bg-white border border-slate-200 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700">تحديد المواقع</span>
                      <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-bold">
                        {bulkLocationIds.length} محدد
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                      {activeLocations.map(loc => {
                        const isSel = bulkLocationIds.includes(loc.id);
                        return (
                          <button
                            key={loc.id}
                            onClick={() => toggleBulkLocation(loc.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right hover:bg-slate-50 transition-colors"
                          >
                            <span className={`text-sm font-bold ${isSel ? 'text-[#655ac1]' : 'text-slate-700'}`}>{loc.name}</span>
                            <div className={`mr-auto w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${isSel ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300'}`}>
                              {isSel && <Check size={12} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={copyLocationToAllDays}
                disabled={bulkLocationIds.length === 0}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  bulkLocationIds.length > 0
                    ? 'bg-gradient-to-b from-white to-[#f5f3ff] border-[#d7d0ff] text-[#655ac1] shadow-sm hover:border-[#b9afff] hover:-translate-y-0.5'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Calendar size={16} /> لكل الأيام
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowDayDropdown(prev => !prev)}
                  disabled={bulkLocationIds.length === 0}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    bulkLocationIds.length > 0
                      ? 'bg-gradient-to-b from-white to-[#f5f3ff] border-[#d7d0ff] text-[#655ac1] shadow-sm hover:border-[#b9afff] hover:-translate-y-0.5'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <ClipboardList size={16} /> ليوم محدد <ChevronDown size={14} />
                </button>
                {showDayDropdown && bulkLocationIds.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDayDropdown(false)} />
                    <div className="absolute top-[calc(100%+0.5rem)] right-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] overflow-hidden min-w-[140px]">
                      {activeDays.map(day => (
                        <button
                          key={day}
                          onClick={() => { copyLocationToAllInDay(day); setShowDayDropdown(false); }}
                          className="group w-full flex items-center justify-between gap-3 text-right px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-[#e5e1fe] hover:text-[#655ac1] transition-colors"
                        >
                          <span>{DAY_NAMES[day]}</span>
                          <span className="w-5 h-5 rounded-full border border-slate-300 bg-white flex items-center justify-center text-transparent group-hover:border-[#655ac1] group-hover:text-[#655ac1]">
                            <Check size={13} strokeWidth={3} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {dayAssignments.some(da => da.staffAssignments.some(sa => sa.locationIds.length > 0)) && (
                <button
                  onClick={() => clearLocations()}
                  className="p-2.5 bg-white text-rose-600 hover:text-rose-700 rounded-xl border border-rose-200 hover:bg-rose-50 transition-all"
                  title="مسح كل المواقع"
                >
                  <RotateCcw size={18} />
                </button>
              )}
            </div>
          </div>
          )}

          {locationModalView === 'staff' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4">
              <h4 className="text-sm font-black text-slate-800">تعيين مواقع الإشراف حسب المشرفين</h4>
              <p className="text-[11px] font-medium text-slate-500 mt-1">اختر مجموعة من المشرفين ، ثم اختر لهم المواقع المناسبة ثم تطبيق.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] gap-4">
              <div className="min-w-0">
                <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded-xl mb-3">
                  {[
                    { id: 'teacher' as const, label: 'المعلمون', count: assignedStaffForBulkLocations.filter(s => s.type === 'teacher').length },
                    { id: 'admin' as const, label: 'الإداريون', count: assignedStaffForBulkLocations.filter(s => s.type === 'admin').length },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setBulkStaffTab(tab.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-black transition-all ${
                        bulkStaffTab === tab.id ? 'bg-white text-[#655ac1] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>

                <div className="relative mb-3">
                  <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={bulkStaffSearch}
                    onChange={e => setBulkStaffSearch(e.target.value)}
                    placeholder="بحث عن مشرف مسند..."
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#655ac1]/30"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden max-h-64 overflow-y-auto">
                  {assignedStaffForBulkLocations
                    .filter(staff => staff.type === bulkStaffTab)
                    .filter(staff => !bulkStaffSearch.trim() || staff.name.includes(bulkStaffSearch.trim()))
                    .map(staff => {
                      const selected = bulkStaffKeys.includes(staff.key);
                      return (
                        <button
                          key={staff.key}
                          onClick={() => toggleBulkStaff(staff.key)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-right hover:bg-slate-50 transition-colors"
                        >
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            selected ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'
                          }`}>
                            {selected && <Check size={13} strokeWidth={3} />}
                          </span>
                          <span className="flex-1 min-w-0 text-sm font-bold text-slate-700 leading-snug">{staff.name}</span>
                          <span className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                            {staff.count}
                          </span>
                        </button>
                      );
                    })}
                  {assignedStaffForBulkLocations.filter(staff => staff.type === bulkStaffTab).length === 0 && (
                    <div className="p-5 text-center text-xs font-bold text-slate-400">
                      لا توجد إسنادات حالية لهذا النوع
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black text-slate-600 mb-2">المواقع المختارة للمجموعة</p>
                <div className="relative">
                  <button
                    onClick={() => setShowBulkStaffLocationPicker(prev => !prev)}
                    className="w-full bg-white border-2 border-slate-300 hover:border-[#655ac1] text-slate-700 text-sm font-bold rounded-xl px-3 py-2.5 transition-all text-right flex items-center justify-between gap-2 shadow-sm"
                  >
                    <span className={bulkStaffLocationIds.length > 0 ? 'text-slate-700' : 'text-[#655ac1]'}>
                      {bulkStaffLocationIds.length > 0 ? getLocationSummary(bulkStaffLocationIds) : 'اختر موقعاً...'}
                    </span>
                    <ChevronDown size={14} className="text-[#655ac1] shrink-0" />
                  </button>

                  {showBulkStaffLocationPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowBulkStaffLocationPicker(false)} />
                      <div className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-full bg-white border border-slate-200 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] overflow-hidden">
                        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-black text-slate-700">تحديد المواقع</span>
                          <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-bold">
                            {bulkStaffLocationIds.length} محدد
                          </span>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                          {activeLocations.map(loc => {
                            const isSel = bulkStaffLocationIds.includes(loc.id);
                            return (
                              <button
                                key={loc.id}
                                onClick={() => toggleBulkStaffLocation(loc.id)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right hover:bg-slate-50 transition-colors"
                              >
                                <span className={`text-sm font-bold ${isSel ? 'text-[#655ac1]' : 'text-slate-700'}`}>{loc.name}</span>
                                <div className={`mr-auto w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${isSel ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300'}`}>
                                  {isSel && <Check size={12} />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={applyLocationsToSelectedStaff}
                  disabled={bulkStaffKeys.length === 0 || bulkStaffLocationIds.length === 0}
                  className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    bulkStaffKeys.length > 0 && bulkStaffLocationIds.length > 0
                      ? 'bg-[#655ac1] border-[#655ac1] text-white shadow-md shadow-[#655ac1]/20 hover:bg-[#655ac1] hover:border-[#655ac1] hover:-translate-y-0.5'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check size={16} /> تطبيق
                </button>
              </div>
            </div>
          </div>
          )}
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
              {locationModalView !== 'cards' && (
                <button
                  onClick={() => {
                    setLocationModalView('cards');
                    setShowBulkLocationPicker(false);
                    setShowBulkStaffLocationPicker(false);
                    setShowDayDropdown(false);
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
                >
                  عودة
                </button>
              )}
              <button
                onClick={() => { setShowLocationsModal(false); setLocationModalView('cards'); }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
              >
                إغلاق
              </button>
              {locationModalView !== 'cards' && (
                <button
                  onClick={() => { setShowLocationsModal(false); setLocationModalView('cards'); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#655ac1] hover:bg-[#8779fb] text-white shadow-md shadow-[#655ac1]/20 transition-all"
                >
                  حفظ
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ═══ Main Schedule Table ═══ */}
      {inlineTypes.length > 0 && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-400 bg-[#a59bf0] text-white">
                  <th className="p-4 font-black text-center w-28 border-l border-white/40">اليوم</th>
                  {inlineTypes.map(type => (
                    <th key={type.id} className="p-4 font-black text-center border-l border-white/40 min-w-[320px]">
                      {type.name}
                    </th>
                  ))}
                  {showFollowUpSupervisor && (
                    <th className="p-4 font-black text-center w-48">المشرف المتابع</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeDays.map(day => {
                  const da = getDayAssignment(day);
                  return (
                    <tr key={day} className="border-b border-slate-200 hover:bg-slate-50/40 transition-colors">
                      {/* Day cell */}
                      <td className="p-3 border-l border-slate-200/80 align-top bg-slate-50/50 text-center">
                        <h4 className="font-black text-[#655ac1] text-base mt-2">{DAY_NAMES[day]}</h4>
                      </td>

                      {/* Inline types cells */}
                      {inlineTypes.map(type => {
                        const cellStaff = getStaffForCell(day, type.id);
                        return (
                          <td key={type.id} className="p-3 border-l border-slate-200/80 align-top">
                            <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-[inset_0_0_0_1px_rgba(248,250,252,0.9)]">
                              {cellStaff.map(sa => renderCompactStaffRow(day, type, sa))}

                              {/* Add button */}
                              <button
                                onClick={() => openAddPanel(day, type.id, type.name)}
                                className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-[#655ac1]/50 rounded-xl text-slate-400 hover:text-[#655ac1] hover:bg-[#e5e1fe]/20 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                              >
                                <Plus size={12} /> إضافة مشرف
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      {/* Follow-up cell */}
                      {showFollowUpSupervisor && (
                        <td className="p-3 align-top border-l border-slate-200/80">
                          <div className="relative w-full h-full flex flex-col justify-center min-h-[60px]">
                            {da.followUpSupervisorId ? (
                              <div className="bg-[#e5e1fe]/40 border border-[#655ac1]/20 rounded-xl p-3 group relative text-center">
                                <p className="text-[10px] font-bold text-[#655ac1] mb-1 flex items-center justify-center gap-1">
                                  <Shield size={10} /> المشرف المتابع
                                </p>
                                <p className="text-sm font-black text-slate-800 truncate">{da.followUpSupervisorName}</p>
                                <button
                                  onClick={() => {
                                    setShowFollowUpPicker(day);
                                    setSelectedFollowUpId('');
                                    setFollowUpTab('teacher');
                                    setFollowUpSearch('');
                                  }}
                                  className="absolute top-1/2 -translate-y-1/2 right-2 p-1 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                                  title="تعديل"
                                >
                                  <Edit3 size={12} />
                                </button>
                                <button
                                  onClick={() => removeFollowUpSupervisor(day)}
                                  className="absolute top-1/2 -translate-y-1/2 left-2 p-1 bg-white rounded-md text-slate-400 hover:text-rose-500 transition-all shadow-sm"
                                >
                                  <X size={12} />
                                </button>
                                <button
                                  onClick={() => copyFollowUpToAllDays(day)}
                                  className="absolute top-1 right-2 p-1 text-[#655ac1]/70 hover:text-[#655ac1] opacity-0 group-hover:opacity-100 transition-all"
                                  title="نسخ لجميع الأيام"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setShowFollowUpPicker(day);
                                  setSelectedFollowUpId('');
                                  setFollowUpTab('teacher');
                                  setFollowUpSearch('');
                                }}
                                className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-[#655ac1]/50 rounded-xl text-slate-400 hover:text-[#655ac1] hover:bg-[#e5e1fe]/20 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                              >
                                <Plus size={14} /> تعيين مشرف متابع
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Separate Type Tables ═══ */}
      {separateTypeGroups.map(group => (
        <div key={group.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-400 bg-[#a59bf0] text-white flex items-center gap-3">
            <ClipboardList size={18} />
            <h3 className="text-sm font-black">
              جدول الإشراف اليومي
            </h3>
            <span className="text-[10px] font-bold text-[#655ac1] bg-white border border-white/50 px-2 py-0.5 rounded-full">
              {group.id.startsWith('solo-') ? group.types[0].name : group.id}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-400 bg-[#a59bf0] text-white">
                  <th className="p-4 font-black text-center w-28 border-l border-white/40">اليوم</th>
                  {group.types.map(type => (
                    <th key={type.id} className="p-4 font-black text-center border-l border-white/40 min-w-[320px]">{type.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeDays.map(day => {
                  return (
                    <tr key={day} className="border-b border-slate-200 hover:bg-slate-50/40 transition-colors">
                      <td className="p-3 border-l border-slate-200/80 align-top bg-slate-50/50 text-center">
                        <h4 className="font-black text-[#655ac1] text-base mt-2">{DAY_NAMES[day]}</h4>
                      </td>
                      {group.types.map(type => {
                        const cellStaff = getStaffForCell(day, type.id);
                        return (
                          <td key={type.id} className="p-3 border-l border-slate-200/80 align-top">
                            <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-[inset_0_0_0_1px_rgba(248,250,252,0.9)]">
                              {cellStaff.map(sa => renderCompactStaffRow(day, type, sa))}
                              <button
                                onClick={() => openAddPanel(day, type.id, type.name)}
                                className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-[#655ac1]/50 rounded-xl text-slate-400 hover:text-[#655ac1] hover:bg-[#e5e1fe]/20 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                              >
                                <Plus size={12} /> إضافة مشرف
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* ═══ Add Staff Modal ═══ */}
      {addPanel && (
        <>
          <div className="fixed inset-0 z-[9998] bg-black/40" onClick={closeAddPanel} />
          <div className="fixed top-[7vh] right-1/2 translate-x-1/2 w-[min(94vw,46rem)] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200 z-[9999] overflow-hidden flex flex-col">
            <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Shield size={22} className="text-[#655ac1]" />
                <div>
                  <h3 className="text-base font-black text-slate-800">{addPanel.mode === 'edit' ? 'تعديل المشرف' : 'إضافة مشرفين'}</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {DAY_NAMES[addPanel.day]} — {addPanel.contextLabel}
                  </p>
                </div>
              </div>
              <button onClick={closeAddPanel} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100 shrink-0 space-y-3">
              <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded-xl">
                {[
                  { id: 'teacher' as const, label: 'المعلمون', count: availableStaff.filter(s => s.type === 'teacher' && !excludedInThisCell.has(s.id)).length },
                  { id: 'admin' as const, label: 'الإداريون', count: availableStaff.filter(s => s.type === 'admin' && !excludedInThisCell.has(s.id)).length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAddStaffTab(tab.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-black transition-all ${
                      addStaffTab === tab.id ? 'bg-white text-[#655ac1] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" autoFocus
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  placeholder={addStaffTab === 'teacher' ? 'بحث عن اسم المعلم...' : 'بحث عن اسم الإداري...'}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#655ac1]/30"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              {(() => {
                const filtered = availableStaff
                  .filter(s => !excludedInThisCell.has(s.id))
                  .filter(s => s.type === addStaffTab)
                  .filter(s => !addSearch.trim() || s.name.includes(addSearch));

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-6 text-slate-400 text-xs font-bold">
                      <Shield size={24} className="mx-auto mb-2 opacity-30" />
                      {addSearch.trim() ? 'لا توجد نتائج' : 'لا يوجد مشرفون متاحون'}
                    </div>
                  );
                }

                return (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 text-[#655ac1]">
                        <tr>
                          <th className="px-4 py-3 font-black text-center w-16">م</th>
                          <th className="px-4 py-3 font-black">الاسم</th>
                          <th className="px-4 py-3 font-black w-28">الصفة</th>
                          <th className="px-4 py-3 font-black text-center w-24">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map((staff, index) => {
                          const isSel = selectedStaffIds.includes(staff.id);
                          return (
                            <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-center text-slate-400 font-bold">{index + 1}</td>
                              <td className="px-4 py-3 font-bold text-slate-800">{staff.name}</td>
                              <td className="px-4 py-3 font-bold text-slate-500">{staff.type === 'teacher' ? 'معلم' : 'إداري'}</td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => toggleStaffSelection(staff.id)}
                                  className={`mx-auto w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                                    isSel ? 'border-[#655ac1] text-[#655ac1]' : 'border-slate-300 text-transparent hover:border-[#655ac1]/60'
                                  }`}
                                  title="اختيار"
                                >
                                  {isSel && <Check size={18} strokeWidth={3} className="text-[#655ac1]" />}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={closeAddPanel}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
              >
                إغلاق
              </button>
              <button
                onClick={saveSelectedStaff}
                className="bg-[#655ac1] hover:bg-[#8779fb] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all"
              >
                حفظ{selectedStaffIds.length > 0 ? ` (${selectedStaffIds.length})` : ''}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══ Follow-up Supervisor Modal ═══ */}
      {showFollowUpPicker && (
        <>
          <div className="fixed inset-0 z-[9998] bg-black/40" onClick={() => { setShowFollowUpPicker(null); setSelectedFollowUpId(''); setFollowUpSearch(''); }} />
          <div className="fixed top-[7vh] right-1/2 translate-x-1/2 w-[min(94vw,46rem)] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200 z-[9999] overflow-hidden flex flex-col">
            <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Shield size={22} className="text-[#655ac1]" />
                <div>
                  <h3 className="text-base font-black text-slate-800">تعيين مشرف متابع</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">{DAY_NAMES[showFollowUpPicker]}</p>
                </div>
              </div>
              <button onClick={() => { setShowFollowUpPicker(null); setSelectedFollowUpId(''); setFollowUpSearch(''); }} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100 shrink-0 space-y-3">
              <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded-xl">
                {[
                  { id: 'teacher' as const, label: 'المعلمون', count: followUpCandidates.filter(s => s.type === 'teacher').length },
                  { id: 'admin' as const, label: 'الإداريون', count: followUpCandidates.filter(s => s.type === 'admin').length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFollowUpTab(tab.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-black transition-all ${
                      followUpTab === tab.id ? 'bg-white text-[#655ac1] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={followUpSearch}
                  onChange={e => setFollowUpSearch(e.target.value)}
                  placeholder={followUpTab === 'teacher' ? 'بحث عن اسم المعلم...' : 'بحث عن اسم الإداري...'}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#655ac1]/30"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              {(() => {
                const filtered = followUpCandidates
                  .filter(s => s.type === followUpTab)
                  .filter(s => !followUpSearch.trim() || s.name.includes(followUpSearch));

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-6 text-slate-400 text-xs font-bold">
                      <Shield size={24} className="mx-auto mb-2 opacity-30" />
                      {followUpSearch.trim() ? 'لا توجد نتائج' : 'لا يوجد مشرفون متاحون'}
                    </div>
                  );
                }

                return (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 text-[#655ac1]">
                        <tr>
                          <th className="px-4 py-3 font-black text-center w-16">م</th>
                          <th className="px-4 py-3 font-black">الاسم</th>
                          <th className="px-4 py-3 font-black w-28">الصفة</th>
                          <th className="px-4 py-3 font-black text-center w-24">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map((staff, index) => {
                          const isSel = selectedFollowUpId === staff.id;
                          return (
                            <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-center text-slate-400 font-bold">{index + 1}</td>
                              <td className="px-4 py-3 font-bold text-slate-800">{staff.name}</td>
                              <td className="px-4 py-3 font-bold text-slate-500">{staff.type === 'teacher' ? 'معلم' : 'إداري'}</td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => setSelectedFollowUpId(isSel ? '' : staff.id)}
                                  className={`mx-auto w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                                    isSel ? 'border-[#655ac1] text-[#655ac1]' : 'border-slate-300 text-transparent hover:border-[#655ac1]/60'
                                  }`}
                                  title="اختيار"
                                >
                                  {isSel && <Check size={18} strokeWidth={3} className="text-[#655ac1]" />}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => { setShowFollowUpPicker(null); setSelectedFollowUpId(''); setFollowUpSearch(''); }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  const selected = followUpCandidates.find(candidate => candidate.id === selectedFollowUpId);
                  if (!selected) return;
                  setFollowUpSupervisor(showFollowUpPicker, selected.id, selected.name);
                }}
                disabled={!selectedFollowUpId}
                className="bg-[#655ac1] hover:bg-[#8779fb] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                حفظ
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══ Remove Staff Confirm Modal ═══ */}
      {pendingStaffRemoval && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setPendingStaffRemoval(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 size={24} className="text-rose-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800">تأكيد الحذف</h3>
            </div>
            <p className="text-sm text-slate-600 font-medium leading-relaxed mb-5">
              هل أنت متأكد من حذف إسناد المشرف {pendingStaffRemoval.staffName}؟
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingStaffRemoval(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={confirmRemoveStaffFromCell}
                className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Reset Confirm Modal ═══ */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowResetConfirm(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle size={24} className="text-rose-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800">إعادة إنشاء جدول الإشراف</h3>
            </div>
            <p className="text-sm text-slate-600 font-medium leading-relaxed mb-5">
              هل أنت متأكد من إعادة الإنشاء؟ سيتم حذف كل المشرفين المُسندين والمشرف المتابع، والعودة إلى شاشة اختيار طريقة الإنشاء.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleReset}
                className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-all"
              >
                نعم، أعِد الإنشاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Delete All Confirm Modal ═══ */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowDeleteAllConfirm(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 size={24} className="text-rose-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800">حذف كل الإسنادات</h3>
            </div>
            <p className="text-sm text-slate-600 font-medium leading-relaxed mb-5">
              هل أنت متأكد من حذف كل الإسنادات؟ سيتم تفريغ الخانات لكل الأيام؟
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteAll}
                className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-all"
              >
                نعم، احذف الكل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Report Modal ═══ */}
      {showReportModal && (() => {
        const allEnabledTypes = [...inlineTypes, ...separateTypes];
        const totalAssignments = dayAssignments.reduce((acc, da) => acc + da.staffAssignments.length, 0);
        const noLocationCount = dayAssignments.reduce(
          (acc, da) => acc + da.staffAssignments.filter(sa => sa.locationIds.length === 0).length,
          0
        );
        const gaps: { day: string; type: string }[] = [];
        activeDays.forEach(day => {
          allEnabledTypes.forEach(t => {
            if (getStaffForCell(day, t.id).length === 0) gaps.push({ day, type: t.name });
          });
        });
        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowReportModal(false)}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                    <BarChart3 size={20} className="text-[#655ac1]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">تقرير التوزيع</h3>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">ملخص حالة جدول الإشراف الحالي</p>
                  </div>
                </div>
                <button onClick={() => setShowReportModal(false)} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                    <p className="text-[11px] font-bold text-slate-500">إجمالي الإسنادات</p>
                    <p className="text-2xl font-black text-[#655ac1] mt-1">{totalAssignments}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                    <p className="text-[11px] font-bold text-slate-500">خانات بلا مشرف</p>
                    <p className={`text-2xl font-black mt-1 ${gaps.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{gaps.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                    <p className="text-[11px] font-bold text-slate-500">مشرفون بلا مواقع</p>
                    <p className={`text-2xl font-black mt-1 ${noLocationCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{noLocationCount}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-700 text-center">تقرير التوزيع</div>
                  <table className="w-full text-xs text-right">
                    <thead className="bg-white border-b border-slate-100 text-[#655ac1]">
                      <tr>
                        <th className="px-3 py-2 font-black text-center">اليوم</th>
                        {allEnabledTypes.map(t => (
                          <th key={t.id} className="px-3 py-2 font-black text-center">{t.name}</th>
                        ))}
                        <th className="px-3 py-2 font-black text-center">المشرف المتابع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {activeDays.map(day => {
                        const da = getDayAssignment(day);
                        return (
                          <tr key={day} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-bold text-slate-700 text-center">{DAY_NAMES[day]}</td>
                            {allEnabledTypes.map(t => {
                              const c = getStaffForCell(day, t.id).length;
                              return (
                                <td key={t.id} className={`px-3 py-2 font-black text-center ${c === 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{c}</td>
                              );
                            })}
                            <td className="px-3 py-2 text-center">
                              {da.followUpSupervisorName
                                ? <span className="text-[11px] font-bold text-emerald-600">✓</span>
                                : <span className="text-[11px] font-bold text-rose-500">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {gaps.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-700 text-center">بحاجة إلى إسناد</div>
                    <table className="w-full text-xs text-right">
                      <thead className="bg-white border-b border-slate-100 text-[#655ac1]">
                        <tr>
                          <th className="px-3 py-2 font-black text-center">اليوم</th>
                          {allEnabledTypes.map(t => (
                            <th key={t.id} className="px-3 py-2 font-black text-center">{t.name} (1)</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {activeDays.map(day => (
                          <tr key={day} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-bold text-slate-700 text-center">{DAY_NAMES[day]}</td>
                            {allEnabledTypes.map(t => {
                              const needsAssignment = getStaffForCell(day, t.id).length === 0;
                              return (
                                <td key={t.id} className={`px-3 py-2 font-black text-center ${needsAssignment ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {needsAssignment ? 'بحاجة' : 'مكتمل'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {gaps.length === 0 && totalAssignments > 0 && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">
                    ✓ التوزيع مكتمل — جميع خانات الإشراف تحتوي على مشرف واحد على الأقل.
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default SupervisionScheduleBuilder;
