import React, { useState, useMemo } from 'react';
import {
  MapPin, Plus, X, Copy, Trash2, RotateCcw,
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
import LoadingLogo from '../ui/LoadingLogo';

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
  const [isGenerating, setIsGenerating] = useState(false);
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
  const [showLocationPicker, setShowLocationPicker] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  const [locationModalView, setLocationModalView] = useState<'cards' | 'type' | 'staff'>('cards');
  // مسوّدة محلية لمواقع الإشراف — لا تُنفَّذ على البيانات الفعلية إلا بعد الضغط على «حفظ»
  const [locationDraft, setLocationDraft] = useState<SupervisionDayAssignment[] | null>(null);
  // نافذة إدارة المشرف المتابع (بمسوّدة لا تُنفَّذ إلا بالحفظ)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpDraft, setFollowUpDraft] = useState<SupervisionDayAssignment[] | null>(null);
  const [followUpEnabledDraft, setFollowUpEnabledDraft] = useState(true);
  // الأيام المحددة كأهداف للتعيين (يدعم تحديد عدة أيام)
  const [followUpTargetDays, setFollowUpTargetDays] = useState<string[]>([]);
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

    setIsGenerating(true);
    setTimeout(() => {
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
      setTimeout(() => {
        setIsGenerating(false);
        showToast('تم توليد إشراف الفسحة/الصلاة تلقائياً، وباقي الأنواع جاهزة للتعبئة اليدوية', 'success');
      }, 2500);
    }, 50);
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

  // المسوّدة الحالية (إن وُجدت) أو البيانات الفعلية كأساس للقراءة داخل النافذة
  const draftAssignments = locationDraft ?? dayAssignments;

  /** هل المواقع المختارة مطبّقة بالكامل على إسنادات نوع الإشراف المستهدف في يوم معيّن (ضمن المسوّدة)؟ */
  const dayHasSelectedLocations = (day: string): boolean => {
    if (bulkLocationIds.length === 0) return false;
    const targetTypeIds = getBulkTargetTypeIds();
    const da = draftAssignments.find(d => d.day === day);
    if (!da) return false;
    const typeAssignments = da.staffAssignments.filter(sa => targetTypeIds.includes(sa.contextTypeId));
    if (typeAssignments.length === 0) return false;
    return typeAssignments.every(sa => bulkLocationIds.every(id => sa.locationIds.includes(id)));
  };

  // فتح النافذة وتهيئة المسوّدة من البيانات الحالية
  const openLocationsModal = () => {
    setLocationDraft(supervisionData.dayAssignments);
    setLocationModalView('cards');
    setShowLocationsModal(true);
  };

  // إغلاق النافذة وتجاهل المسوّدة دون تنفيذ
  const discardLocationsModal = () => {
    setLocationDraft(null);
    setShowLocationsModal(false);
    setLocationModalView('cards');
  };

  // حفظ المسوّدة وتنفيذها على البيانات الفعلية
  const saveLocationsModal = () => {
    let draft = locationDraft;
    // في وضع «حسب المشرفين» طبّق المواقع على المشرفين المحددين قبل الحفظ مباشرةً
    if (locationModalView === 'staff') {
      if (bulkStaffKeys.length === 0) {
        showToast('اختر مشرفًا واحدًا على الأقل', 'warning');
        return;
      }
      if (bulkStaffLocationIds.length === 0) {
        showToast('اختر موقعًا واحدًا على الأقل', 'warning');
        return;
      }
      const targetTypeIds = getBulkTargetTypeIds();
      const selectedKeys = new Set(bulkStaffKeys);
      let affected = 0;
      draft = (locationDraft ?? dayAssignments).map(da => ({
        ...da,
        staffAssignments: da.staffAssignments.map(sa => {
          const key = `${sa.staffType}-${sa.staffId}`;
          if (!selectedKeys.has(key)) return sa;
          if (!targetTypeIds.includes(sa.contextTypeId)) return sa; // العمود المستهدف فقط
          affected += 1;
          return {
            ...sa,
            locationIds: Array.from(new Set([...sa.locationIds, ...bulkStaffLocationIds])),
          };
        }),
      }));
      if (affected === 0) {
        showToast('لا يوجد للمشرفين المحددين إسناد في العمود المختار', 'warning');
        return;
      }
    }
    setSupervisionData(prev => {
      if (!draft) return prev;
      const next = { ...prev, dayAssignments: draft };
      return syncActiveSavedSchedule(prev, next);
    });
    setLocationDraft(null);
    setShowLocationsModal(false);
    setLocationModalView('cards');
    showToast('تم حفظ مواقع الإشراف', 'success');
  };

  // تبديل تطبيق المواقع المختارة على يوم محدد ضمن المسوّدة (إضافة/إلغاء)
  const toggleLocationForDayDraft = (day: string) => {
    if (bulkLocationIds.length === 0) {
      showToast('اختر المواقع أولاً', 'warning');
      return;
    }
    const targetTypeIds = getBulkTargetTypeIds();
    const applied = dayHasSelectedLocations(day);
    setLocationDraft(prev => (prev ?? dayAssignments).map(da => (
      da.day !== day ? da : {
        ...da,
        staffAssignments: da.staffAssignments.map(sa => {
          if (!targetTypeIds.includes(sa.contextTypeId)) return sa;
          return applied
            ? { ...sa, locationIds: sa.locationIds.filter(id => !bulkLocationIds.includes(id)) }
            : { ...sa, locationIds: Array.from(new Set([...sa.locationIds, ...bulkLocationIds])) };
        }),
      }
    )));
  };

  // الأيام التي تملك إسنادات لنوع الإشراف المستهدف (القابلة لاستقبال المواقع)
  const daysApplicableForTarget = (): string[] => {
    const targetTypeIds = getBulkTargetTypeIds();
    return activeDays.filter(day => {
      const da = draftAssignments.find(d => d.day === day);
      return !!da && da.staffAssignments.some(sa => targetTypeIds.includes(sa.contextTypeId));
    });
  };

  // هل المواقع المختارة مطبّقة على كل الأيام القابلة؟
  const areAllDaysApplied = (): boolean => {
    if (bulkLocationIds.length === 0) return false;
    const applicable = daysApplicableForTarget();
    return applicable.length > 0 && applicable.every(day => dayHasSelectedLocations(day));
  };

  // تبديل تطبيق المواقع المختارة على كل الأيام ضمن المسوّدة (تطبيق/إلغاء من نفس الزر)
  const toggleLocationForAllDaysDraft = () => {
    if (bulkLocationIds.length === 0) {
      showToast('اختر موقعاً واحداً على الأقل', 'warning');
      return;
    }
    const targetTypeIds = getBulkTargetTypeIds();
    const allApplied = areAllDaysApplied();
    setLocationDraft(prev => (prev ?? dayAssignments).map(da => ({
      ...da,
      staffAssignments: da.staffAssignments.map(sa => {
        if (!targetTypeIds.includes(sa.contextTypeId)) return sa;
        return allApplied
          ? { ...sa, locationIds: sa.locationIds.filter(id => !bulkLocationIds.includes(id)) }
          : { ...sa, locationIds: Array.from(new Set([...sa.locationIds, ...bulkLocationIds])) };
      }),
    })));
  };

  // ═══════════ تحديد كل المشرفين الظاهرين في التبويب الحالي ═══════════
  const visibleBulkStaff = () =>
    assignedStaffForBulkLocations
      .filter(staff => staff.type === bulkStaffTab)
      .filter(staff => !bulkStaffSearch.trim() || staff.name.includes(bulkStaffSearch.trim()));

  const allVisibleStaffSelected = () => {
    const vis = visibleBulkStaff();
    return vis.length > 0 && vis.every(staff => bulkStaffKeys.includes(staff.key));
  };

  const toggleSelectAllVisibleStaff = () => {
    const keys = visibleBulkStaff().map(staff => staff.key);
    if (keys.length === 0) return;
    setBulkStaffKeys(prev => {
      const allSel = keys.every(k => prev.includes(k));
      return allSel ? prev.filter(k => !keys.includes(k)) : Array.from(new Set([...prev, ...keys]));
    });
  };

  // ═══════════ Follow-up handlers ═══════════
  const followUpCandidates = useMemo(() => {
    const list: { id: string; name: string; type: 'teacher' | 'admin'; role?: string }[] = [];
    teachers.forEach(t => list.push({ id: t.id, name: t.name, type: 'teacher', role: 'معلم' }));
    admins.forEach(a => list.push({ id: a.id, name: a.name, type: 'admin', role: a.role || 'إداري' }));
    return list;
  }, [admins, teachers]);

  const setFollowUpSupervisor = (day: string, staffId: string, staffName: string) => {
    const cand = followUpCandidates.find(c => c.id === staffId);
    updateDayAssignment(day, da => ({
      ...da,
      followUpSupervisorId: staffId,
      followUpSupervisorName: staffName,
      followUpSupervisors: [{ staffId, staffName, staffType: cand?.type || 'teacher' }],
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
      followUpSupervisors: [],
    }));
  };

  const copyFollowUpToAllDays = (sourceDay: string) => {
    const da = getDayAssignment(sourceDay);
    if (!da.followUpSupervisorId || !da.followUpSupervisorName) return;
    const sourceList = da.followUpSupervisors && da.followUpSupervisors.length > 0
      ? da.followUpSupervisors
      : [{ staffId: da.followUpSupervisorId, staffName: da.followUpSupervisorName, staffType: (followUpCandidates.find(c => c.id === da.followUpSupervisorId)?.type || 'teacher') as 'teacher' | 'admin' }];
    setSupervisionData(prev => {
      const newAssignments = activeDays.map(day => {
        const existing = prev.dayAssignments.find(d => d.day === day) || { day, staffAssignments: [] };
        return {
          ...existing,
          followUpSupervisorId: sourceList[0].staffId,
          followUpSupervisorName: sourceList[0].staffName,
          followUpSupervisors: sourceList,
        };
      });
      const next = { ...prev, dayAssignments: newAssignments };
      return syncActiveSavedSchedule(prev, next);
    });
    showToast('تم تعيين المشرف المتابع لجميع الأيام', 'success');
  };

  // ═══════════ نافذة إدارة المشرف المتابع (مسوّدة + حفظ) ═══════════
  type FollowUpEntry = { staffId: string; staffName: string; staffType: 'teacher' | 'admin' };

  const followUpDraftAssignments = followUpDraft ?? dayAssignments;

  // قراءة قائمة المشرفين المتابعين ليوم (مع الترقية من الحقل المفرد القديم)
  const getDraftFollowUps = (day: string): FollowUpEntry[] => {
    const da = followUpDraftAssignments.find(d => d.day === day);
    if (!da) return [];
    if (da.followUpSupervisors && da.followUpSupervisors.length > 0) return da.followUpSupervisors;
    if (da.followUpSupervisorId && da.followUpSupervisorName) {
      const cand = followUpCandidates.find(c => c.id === da.followUpSupervisorId);
      return [{ staffId: da.followUpSupervisorId, staffName: da.followUpSupervisorName, staffType: cand?.type || 'teacher' }];
    }
    return [];
  };

  // ضمان وجود عنصر لكل يوم فعّال + ترقية الحقل المفرد إلى قائمة
  const normalizeFollowUpDraft = (base: SupervisionDayAssignment[]): SupervisionDayAssignment[] => {
    const map = new Map(base.map(d => [d.day, d]));
    activeDays.forEach(day => { if (!map.has(day)) map.set(day, { day, staffAssignments: [] }); });
    const upgrade = (da: SupervisionDayAssignment): SupervisionDayAssignment => {
      if (da.followUpSupervisors) return da;
      if (da.followUpSupervisorId && da.followUpSupervisorName) {
        const cand = followUpCandidates.find(c => c.id === da.followUpSupervisorId);
        return { ...da, followUpSupervisors: [{ staffId: da.followUpSupervisorId, staffName: da.followUpSupervisorName, staffType: cand?.type || 'teacher' }] };
      }
      return { ...da, followUpSupervisors: [] };
    };
    return Array.from(map.values()).map(upgrade);
  };

  // مزامنة الحقل المفرد القديم مع أول عنصر (للتوافق مع الطباعة/التقارير)
  const syncLegacyFollowUp = (da: SupervisionDayAssignment): SupervisionDayAssignment => {
    const list = da.followUpSupervisors ?? [];
    return { ...da, followUpSupervisorId: list[0]?.staffId, followUpSupervisorName: list[0]?.staffName };
  };

  // إضافة/إزالة مشرف على كل الأيام المحددة (تبديل)
  const toggleFollowUpForTargets = (staff: FollowUpEntry) => {
    if (followUpTargetDays.length === 0) {
      showToast('اختر يوماً واحداً على الأقل من قائمة الأيام', 'warning');
      return;
    }
    setFollowUpDraft(prev => normalizeFollowUpDraft(prev ?? dayAssignments).map(da => {
      if (!followUpTargetDays.includes(da.day)) return da;
      const list = da.followUpSupervisors ?? [];
      const exists = list.some(s => s.staffId === staff.staffId);
      const nextList = exists ? list.filter(s => s.staffId !== staff.staffId) : [...list, staff];
      return syncLegacyFollowUp({ ...da, followUpSupervisors: nextList });
    }));
  };

  // مسح كل المشرفين المتابعين ليوم
  const clearFollowUpDay = (day: string) => {
    setFollowUpDraft(prev => normalizeFollowUpDraft(prev ?? dayAssignments).map(da => (
      da.day === day ? syncLegacyFollowUp({ ...da, followUpSupervisors: [] }) : da
    )));
  };

  const toggleTargetDay = (day: string) =>
    setFollowUpTargetDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const allTargetDaysSelected = activeDays.length > 0 && activeDays.every(d => followUpTargetDays.includes(d));
  const toggleAllTargetDays = () =>
    setFollowUpTargetDays(allTargetDaysSelected ? [] : [...activeDays]);

  const openFollowUpModal = () => {
    setFollowUpDraft(normalizeFollowUpDraft(supervisionData.dayAssignments));
    setFollowUpEnabledDraft(supervisionData.settings.enableFollowUpSupervisor !== false);
    setFollowUpTargetDays([...activeDays]);
    setFollowUpTab('teacher');
    setFollowUpSearch('');
    setShowFollowUpModal(true);
  };

  const discardFollowUpModal = () => {
    setShowFollowUpModal(false);
    setFollowUpDraft(null);
    setFollowUpSearch('');
  };

  const saveFollowUpModal = () => {
    setSupervisionData(prev => {
      const base = (followUpDraft ?? prev.dayAssignments).map(syncLegacyFollowUp);
      const next = {
        ...prev,
        settings: { ...prev.settings, enableFollowUpSupervisor: followUpEnabledDraft },
        dayAssignments: base,
      };
      return syncActiveSavedSchedule(prev, next);
    });
    setShowFollowUpModal(false);
    setFollowUpDraft(null);
    setFollowUpSearch('');
    showToast('تم حفظ إعدادات المشرف المتابع', 'success');
  };

  // ═══════════ Loading overlay (auto-generate) ═══════════
  const loadingOverlay = isGenerating ? (
    <div className="fixed inset-0 z-[100000] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
      <LoadingLogo size="lg" />
      <p className="text-base font-bold text-[#655ac1]">جاري إنشاء جدول الإشراف...</p>
    </div>
  ) : null;

  // ═══════════ Empty state ═══════════
  if (showEmptyState) {
    return (
      <>
        {loadingOverlay}
        <BuilderEmptyState
          onAutoGenerate={handleAutoGenerate}
          onManualStart={handleManualStart}
          availableCount={availableStaff.length}
          hasTimetable={hasTimetable}
        />
      </>
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
                      <div className={`mr-auto w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${isSel ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300'}`}>
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
    <>
      {loadingOverlay}
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
              onClick={openLocationsModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
              title="تعيين مواقع الإشراف"
            >
              <MapPin size={16} />
              تعيين مواقع الإشراف
            </button>
            <button
              onClick={openFollowUpModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
              title="إدارة المشرف المتابع"
            >
              <Shield size={16} />
              المشرف المتابع
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
            <button
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
              title="عرض تقرير توزيع المشرفين"
            >
              <BarChart3 size={16} />
              تقرير التوزيع
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
              title="إعادة الإنشاء"
            >
              <RotateCcw size={16} />
              إعادة الإنشاء
            </button>
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
              title="حذف كل الإسنادات"
            >
              <Trash2 size={16} className="text-rose-600" />
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={discardLocationsModal}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <MapPin size={24} className="text-[#655ac1]" />
                <div>
                  <h3 className="text-base font-black text-slate-800">تعيين مواقع الإشراف</h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">طبّق المواقع حسب نوع الإشراف أو حسب مجموعة مشرفين</p>
                </div>
              </div>
              <button onClick={discardLocationsModal} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
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
                  <MapPinned size={22} strokeWidth={1.8} className="text-[#655ac1] shrink-0" />
                  <h4 className="text-base font-black text-slate-800">تعيين مواقع الإشراف حسب نوع الإشراف</h4>
                </div>
                <div className="mb-4 space-y-2.5 w-full">
                  {[
                    'اختر نوع الإشراف (مثال: الفسحة).',
                    'حدّد المواقع المطلوب توزيع المشرفين عليها.',
                    'طبّق على كل الأيام أو على يوم محدد.',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-right">
                      <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full border border-slate-300 text-slate-500 text-[10px] font-black flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-600 leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
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
                  <UserRoundCheck size={22} strokeWidth={1.8} className="text-[#655ac1] shrink-0" />
                  <h4 className="text-base font-black text-slate-800">تعيين مواقع الإشراف حسب المشرفين</h4>
                </div>
                <div className="mb-4 space-y-2.5 w-full">
                  {[
                    'اختر مجموعة من المشرفين.',
                    'حدّد لهم المواقع المناسبة.',
                    'اضغط «حفظ».',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-right">
                      <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full border border-slate-300 text-slate-500 text-[10px] font-black flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-600 leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
                <span className="mt-auto mx-auto w-full max-w-[230px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#655ac1] text-sm font-bold bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20">
                  تعيين
                </span>
              </button>
            </div>
          )}

          {locationModalView === 'type' && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
            {/* الخطوتان جنباً إلى جنب: نوع الإشراف ثم المواقع */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {/* ① نوع الإشراف المستهدف */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-[#655ac1] text-white text-[11px] font-black flex items-center justify-center shrink-0">1</span>
                  <p className="text-xs font-black text-slate-700">نوع الإشراف المستهدف</p>
                </div>
                <p className="text-[11px] font-medium text-slate-400 mb-2 pr-7">اختر نوع إشراف واحد فقط لتطبيق المواقع عليه.</p>
                <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden max-h-72 overflow-y-auto">
                  {locationTargetTypes.map((type) => {
                    const selected = (bulkTargetTypeIds[0] || locationTargetTypes[0]?.id) === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => toggleBulkTargetType(type.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-right transition-colors hover:bg-slate-50"
                      >
                        <span className={`text-sm font-bold ${selected ? 'text-[#655ac1]' : 'text-slate-700'}`}>{type.name}</span>
                        <span className={`mr-auto w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          selected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                        }`}>
                          {selected && <Check size={14} strokeWidth={3.5} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ② المواقع المراد توزيعها */}
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#655ac1] text-white text-[11px] font-black flex items-center justify-center shrink-0">2</span>
                    <p className="text-xs font-black text-slate-700">المواقع المراد توزيعها</p>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-bold shrink-0">
                    {bulkLocationIds.length} محدد
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-400 mb-2 pr-7">اختر المواقع التي سيوزَّع عليها المشرفون.</p>
                <div className="w-full bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                    {activeLocations.map(loc => {
                      const isSel = bulkLocationIds.includes(loc.id);
                      return (
                        <button
                          key={loc.id}
                          onClick={() => toggleBulkLocation(loc.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right hover:bg-slate-50 transition-colors"
                        >
                          <span className={`text-sm font-bold ${isSel ? 'text-[#655ac1]' : 'text-slate-700'}`}>{loc.name}</span>
                          <div className={`mr-auto w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${isSel ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300'}`}>
                            {isSel && <Check size={12} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ③ تطبيق على الأيام — صف بعرض كامل ليبقى في سطر واحد */}
            <div className="mt-4 sm:mt-5 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#655ac1] text-white text-[11px] font-black flex items-center justify-center shrink-0">3</span>
                  <p className="text-xs font-black text-slate-700">تطبيق على الأيام</p>
                </div>
                <button
                  onClick={toggleLocationForAllDaysDraft}
                  disabled={bulkLocationIds.length === 0}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    bulkLocationIds.length > 0
                      ? 'bg-white border-slate-300 text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {areAllDaysApplied() ? 'إلغاء الكل' : 'تطبيق الكل'}
                </button>
              </div>
              <p className="text-[11px] font-medium text-slate-400 mb-2 pr-7">اضغط على اليوم لتطبيق المواقع عليه، أو «تطبيق الكل» دفعةً واحدة، ثم «حفظ» للتنفيذ.</p>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(92px,1fr))] gap-2">
                {activeDays.map(day => {
                  const applied = dayHasSelectedLocations(day);
                  return (
                    <button
                      key={day}
                      onClick={() => toggleLocationForDayDraft(day)}
                      disabled={bulkLocationIds.length === 0}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-bold border transition-all ${
                        bulkLocationIds.length === 0
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                          : applied
                            ? 'bg-white border-slate-300 text-[#655ac1]'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-[#655ac1]/50 hover:-translate-y-0.5'
                      }`}
                    >
                      <span>{DAY_NAMES[day]}</span>
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        applied ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'border-slate-300 text-transparent'
                      }`}>
                        <Check size={13} strokeWidth={3.5} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          )}

          {locationModalView === 'staff' && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
            {/* ① عمود الإشراف المستهدف */}
            <div className="mb-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-[#655ac1] text-white text-[11px] font-black flex items-center justify-center shrink-0">1</span>
                <p className="text-xs font-black text-slate-700">عمود الإشراف المستهدف</p>
              </div>
              <p className="text-[11px] font-medium text-slate-400 mb-2 pr-7">تُطبَّق المواقع على إسنادات هذا العمود فقط للمشرفين المحددين.</p>
              <div className="flex flex-wrap gap-2 pr-7">
                {locationTargetTypes.map(type => {
                  const selected = (bulkTargetTypeIds[0] || locationTargetTypes[0]?.id) === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => toggleBulkTargetType(type.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        selected
                          ? 'bg-[#655ac1] border-[#655ac1] text-white shadow-sm shadow-[#655ac1]/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-[#655ac1]/50'
                      }`}
                    >
                      {selected && <Check size={12} strokeWidth={3} />}
                      {type.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] gap-4 sm:gap-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="w-5 h-5 rounded-full bg-[#655ac1] text-white text-[11px] font-black flex items-center justify-center shrink-0">2</span>
                  <p className="text-xs font-black text-slate-700">اختيار المشرفين</p>
                  <span className="mr-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                    <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                    الرقم بجانب الاسم = عدد مهام الإشراف المسندة للمشرف.
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-3">
                  {[
                    { id: 'teacher' as const, label: 'المعلمون', count: assignedStaffForBulkLocations.filter(s => s.type === 'teacher').length },
                    { id: 'admin' as const, label: 'الإداريون', count: assignedStaffForBulkLocations.filter(s => s.type === 'admin').length },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setBulkStaffTab(tab.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                        bulkStaffTab === tab.id ? 'bg-white shadow-sm' : 'hover:bg-white/60'
                      }`}
                    >
                      <span className="text-slate-800">{tab.label}</span>
                      <span className="text-[#655ac1]">({tab.count})</span>
                    </button>
                  ))}
                </div>

                <div className="relative mb-3">
                  <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={bulkStaffSearch}
                    onChange={e => setBulkStaffSearch(e.target.value)}
                    placeholder="ابحث"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-[#655ac1]/30"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-black text-slate-600">المشرفون</p>
                  <button
                    onClick={toggleSelectAllVisibleStaff}
                    disabled={visibleBulkStaff().length === 0}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      visibleBulkStaff().length === 0
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-[#655ac1] hover:border-[#655ac1] hover:text-white'
                    }`}
                  >
                    {allVisibleStaffSelected() ? 'إلغاء الكل' : 'اختيار الكل'}
                  </button>
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
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-bold text-slate-700 leading-snug truncate">{staff.name}</span>
                            <span title="عدد مهام الإشراف المسندة" className="shrink-0 text-[10px] font-black text-[#655ac1] bg-transparent border border-slate-300 px-2 py-0.5 rounded-full">
                              {staff.count}
                            </span>
                          </div>
                          <span className={`mr-auto w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            selected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'
                          }`}>
                            {selected && <Check size={13} strokeWidth={3.5} />}
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

              <div className="min-w-0 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#655ac1] text-white text-[11px] font-black flex items-center justify-center shrink-0">3</span>
                    <p className="text-xs font-black text-slate-700">المواقع المخصّصة للمجموعة</p>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-bold shrink-0">
                    {bulkStaffLocationIds.length} محدد
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-400 mb-2 pr-7">حدّد المواقع ثم اضغط «حفظ» لتطبيقها على المشرفين المحددين.</p>
                <div className="w-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="h-full overflow-y-auto p-2 space-y-1">
                    {activeLocations.map(loc => {
                      const isSel = bulkStaffLocationIds.includes(loc.id);
                      return (
                        <button
                          key={loc.id}
                          onClick={() => toggleBulkStaffLocation(loc.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right hover:bg-slate-50 transition-colors"
                        >
                          <span className={`text-sm font-bold ${isSel ? 'text-[#655ac1]' : 'text-slate-700'}`}>{loc.name}</span>
                          <div className={`mr-auto w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${isSel ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300'}`}>
                            {isSel && <Check size={12} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <div>
                {locationModalView !== 'cards' && (
                  <button
                    onClick={() => setLocationModalView('cards')}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    عودة
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={discardLocationsModal}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
                >
                  إغلاق
                </button>
                {locationModalView !== 'cards' && (
                  <button
                    onClick={saveLocationsModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#655ac1] hover:bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20 transition-all"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1]">
                      <Check size={13} strokeWidth={3.2} className="text-white" />
                    </span>
                    حفظ
                  </button>
                )}
              </div>
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
                            {(da.followUpSupervisorId || (da.followUpSupervisors && da.followUpSupervisors.length > 0)) ? (
                              <div className="bg-[#e5e1fe]/40 border border-[#655ac1]/20 rounded-xl p-3 group relative text-center">
                                <p className="text-[10px] font-bold text-[#655ac1] mb-1 flex items-center justify-center gap-1">
                                  <Shield size={10} /> {(da.followUpSupervisors && da.followUpSupervisors.length > 1) ? 'المشرفون المتابعون' : 'المشرف المتابع'}
                                </p>
                                {((da.followUpSupervisors && da.followUpSupervisors.length > 0)
                                  ? da.followUpSupervisors.map(s => s.staffName)
                                  : [da.followUpSupervisorName].filter(Boolean) as string[]
                                ).map((nm, i) => (
                                  <p key={i} className="text-sm font-black text-slate-800 truncate">{nm}</p>
                                ))}
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
              {group.id.startsWith('solo-') || /^table-\d+$/.test(group.id)
                ? group.types.map(t => t.name).join('، ')
                : group.id}
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
                      addStaffTab === tab.id ? 'bg-white shadow-sm' : 'hover:bg-white/60'
                    }`}
                  >
                    <span className="text-slate-900">{tab.label}</span>
                    <span className="text-[#655ac1] mr-1">({tab.count})</span>
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" autoFocus
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  placeholder="ابحث"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-[#655ac1]/30"
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
                    <table className="w-full table-fixed text-right text-sm">
                      <thead className="bg-slate-50 text-[#655ac1]">
                        <tr>
                          <th className="px-4 py-3 font-black text-center w-[12%]">م</th>
                          <th className="px-4 py-3 font-black w-[32%]">الاسم</th>
                          <th className="px-4 py-3 font-black text-center w-[34%]">الصفة</th>
                          <th className="px-4 py-3 font-black text-center w-[22%]">تحديد</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map((staff, index) => {
                          const isSel = selectedStaffIds.includes(staff.id);
                          return (
                            <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-center text-slate-400 font-bold">{index + 1}</td>
                              <td className="px-4 py-3 font-bold text-slate-800 truncate">{staff.name}</td>
                              <td className="px-4 py-3 font-bold text-slate-500 text-center whitespace-nowrap">{staff.type === 'teacher' ? 'معلم' : (staff.role || 'إداري')}</td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => toggleStaffSelection(staff.id)}
                                  className={`mx-auto w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                    isSel ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent hover:border-[#655ac1]/60'
                                  }`}
                                  title="تحديد"
                                >
                                  {isSel && <Check size={13} strokeWidth={3.5} />}
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
                className="inline-flex items-center gap-2 bg-[#655ac1] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1]">
                  <Check size={13} strokeWidth={3.2} className="text-white" />
                </span>
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
                      followUpTab === tab.id ? 'bg-white shadow-sm' : 'hover:bg-white/60'
                    }`}
                  >
                    <span className="text-slate-900">{tab.label}</span>
                    <span className="text-[#655ac1] mr-1">({tab.count})</span>
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
                  placeholder="ابحث"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-[#655ac1]/30"
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
                    <table className="w-full table-fixed text-right text-sm">
                      <thead className="bg-slate-50 text-[#655ac1]">
                        <tr>
                          <th className="px-4 py-3 font-black text-center w-[12%]">م</th>
                          <th className="px-4 py-3 font-black w-[32%]">الاسم</th>
                          <th className="px-4 py-3 font-black text-center w-[34%]">الصفة</th>
                          <th className="px-4 py-3 font-black text-center w-[22%]">تحديد</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map((staff, index) => {
                          const isSel = selectedFollowUpId === staff.id;
                          return (
                            <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-center text-slate-400 font-bold">{index + 1}</td>
                              <td className="px-4 py-3 font-bold text-slate-800 truncate">{staff.name}</td>
                              <td className="px-4 py-3 font-bold text-slate-500 text-center whitespace-nowrap">{staff.type === 'teacher' ? 'معلم' : (staff.role || 'إداري')}</td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => setSelectedFollowUpId(isSel ? '' : staff.id)}
                                  className={`mx-auto w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                    isSel ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent hover:border-[#655ac1]/60'
                                  }`}
                                  title="تحديد"
                                >
                                  {isSel && <Check size={13} strokeWidth={3.5} />}
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
                className="inline-flex items-center gap-2 bg-[#655ac1] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1]">
                  <Check size={13} strokeWidth={3.2} className="text-white" />
                </span>
                حفظ
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══ Follow-up Supervisor Management Modal ═══ */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={discardFollowUpModal}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Shield size={24} className="text-[#655ac1]" />
                <div>
                  <h3 className="text-base font-black text-slate-800">إدارة المشرف المتابع</h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">عيّن المشرف المتابع ليوم محدد أو لجميع الأيام دفعة واحدة</p>
                </div>
              </div>
              <button onClick={discardFollowUpModal} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
              {/* مفتاح إظهار العمود */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
                <div>
                  <p className="text-sm font-black text-slate-800">إظهار عمود المشرف المتابع</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">يتحكم بظهور العمود في جدول الإشراف.</p>
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shrink-0">
                  {[
                    { value: true, label: 'مُفعّل' },
                    { value: false, label: 'مُعطّل' },
                  ].map(opt => (
                    <button
                      key={String(opt.value)}
                      onClick={() => setFollowUpEnabledDraft(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        followUpEnabledDraft === opt.value ? 'bg-[#655ac1] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* تنبيه إرشادي بلون تنبيهي */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800">
                <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                <span>حدّد الأيام (أو «كل الأيام») ثم اضغط على أسماء المشرفين لتعيينهم — يمكن اختيار أكثر من مشرف. لا يُنفَّذ إلا بعد «حفظ».</span>
              </div>

              {/* منطقة المحتوى — يبقى ارتفاعها ثابتًا سواء فُعّل العمود أو عُطّل */}
              <div className="min-h-[420px]">
                {followUpEnabledDraft ? (
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4">
                    {/* قائمة الأيام */}
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-600 mb-2">الأيام</p>
                      <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                        {/* صف كل الأيام — الشيك بوكس يسار */}
                        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                          <button onClick={toggleAllTargetDays} className="flex-1 min-w-0 text-right">
                            <span className={`text-sm font-black ${allTargetDaysSelected ? 'text-[#655ac1]' : 'text-slate-700'}`}>كل الأيام</span>
                          </button>
                          <button onClick={toggleAllTargetDays} title="تحديد كل الأيام"
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${allTargetDaysSelected ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                            <Check size={12} strokeWidth={3.5} />
                          </button>
                        </div>

                        {activeDays.map(day => {
                          const entries = getDraftFollowUps(day);
                          const isTarget = followUpTargetDays.includes(day);
                          return (
                            <div key={day} className="px-3 py-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <button onClick={() => toggleTargetDay(day)} className="flex-1 min-w-0 text-right">
                                  <span className={`text-sm font-bold ${isTarget ? 'text-[#655ac1]' : 'text-slate-700'}`}>{DAY_NAMES[day]}</span>
                                </button>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button onClick={() => toggleTargetDay(day)} title="تحديد"
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${isTarget ? 'bg-[#655ac1] border-[#655ac1] text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                                    <Check size={12} strokeWidth={3.5} />
                                  </button>
                                  {entries.length > 0 && (
                                    <button onClick={() => clearFollowUpDay(day)} title="إلغاء تعيين هذا اليوم"
                                      className="w-5 h-5 rounded-full border border-rose-300 text-rose-500 flex items-center justify-center hover:bg-rose-50 transition-colors">
                                      <X size={12} strokeWidth={3.5} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              {entries.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {entries.map(e => (
                                    <span key={e.staffId} className="inline-flex items-center text-[10px] font-bold text-[#655ac1] bg-transparent border border-slate-300 px-2 py-0.5 rounded-full">
                                      {e.staffName}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] font-bold text-slate-300 mt-1.5">لم يُعيَّن</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* مختار المشرف */}
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-600 mb-2">اختر المشرف المتابع</p>
                      <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded-xl mb-2">
                        {[
                          { id: 'teacher' as const, label: 'المعلمون', count: followUpCandidates.filter(s => s.type === 'teacher').length },
                          { id: 'admin' as const, label: 'الإداريون', count: followUpCandidates.filter(s => s.type === 'admin').length },
                        ].map(tab => (
                          <button key={tab.id} onClick={() => setFollowUpTab(tab.id)} className={`px-3 py-2 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-1.5 ${followUpTab === tab.id ? 'bg-white shadow-sm' : 'hover:bg-white/60'}`}>
                            <span className="text-slate-800">{tab.label}</span>
                            <span className="text-[#655ac1]">({tab.count})</span>
                          </button>
                        ))}
                      </div>
                      <div className="relative mb-2">
                        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={followUpSearch} onChange={e => setFollowUpSearch(e.target.value)} placeholder="ابحث" className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-[#655ac1]/30" />
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden max-h-56 overflow-y-auto">
                        {followUpCandidates
                          .filter(s => s.type === followUpTab)
                          .filter(s => !followUpSearch.trim() || s.name.includes(followUpSearch.trim()))
                          .map(staff => {
                            const inAll = followUpTargetDays.length > 0 && followUpTargetDays.every(day => getDraftFollowUps(day).some(s => s.staffId === staff.id));
                            const inSome = !inAll && followUpTargetDays.some(day => getDraftFollowUps(day).some(s => s.staffId === staff.id));
                            return (
                              <button key={staff.id} onClick={() => toggleFollowUpForTargets({ staffId: staff.id, staffName: staff.name, staffType: staff.type })} className="w-full flex items-center gap-3 px-3 py-2.5 text-right hover:bg-slate-50 transition-colors">
                                <span className="flex-1 min-w-0 text-sm font-bold text-slate-700 leading-snug truncate">{staff.name}</span>
                                <span className={`mr-auto w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${inAll ? 'bg-[#655ac1] border-[#655ac1] text-white' : inSome ? 'bg-white border-[#655ac1]' : 'bg-white border-slate-300 text-transparent'}`}>
                                  {inAll ? <Check size={13} strokeWidth={3.5} /> : inSome ? <span className="w-2 h-2 rounded-full bg-[#655ac1]" /> : null}
                                </span>
                              </button>
                            );
                          })}
                        {followUpCandidates.filter(s => s.type === followUpTab).length === 0 && (
                          <div className="p-5 text-center text-xs font-bold text-slate-400">لا يوجد مشرفون متاحون</div>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-slate-400 mt-2">
                        النقر يضيف/يزيل المشرف على كل الأيام المحددة. يمكن تعيين أكثر من مشرف لليوم نفسه.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-[420px] flex items-center justify-center text-center">
                    <p className="text-sm font-bold text-slate-400">عمود المشرف المتابع مُعطّل — فعّله لإدارة التعيينات.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={discardFollowUpModal} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all">إغلاق</button>
              <button onClick={saveFollowUpModal} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#655ac1] hover:bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20 transition-all">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#655ac1]">
                  <Check size={13} strokeWidth={3.2} className="text-white" />
                </span>
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Remove Staff Confirm Modal ═══ */}
      {pendingStaffRemoval && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setPendingStaffRemoval(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 flex items-center justify-center">
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
              <div className="w-12 h-12 flex items-center justify-center">
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
              <div className="w-12 h-12 flex items-center justify-center">
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
                  <BarChart3 size={24} className="text-[#655ac1]" />
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

                {totalAssignments > 0 && (
                  gaps.length === 0 ? (
                    <div className="rounded-2xl p-4 border border-slate-300 bg-white flex items-start gap-3">
                      <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white shrink-0">
                        <Check size={14} strokeWidth={3.5} />
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-emerald-700">التوزيع مكتمل</p>
                        <p className="text-sm font-medium text-emerald-700/90">
                          جميع خانات الإشراف تحتوي على مشرف واحد على الأقل.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl p-4 border border-slate-300 bg-white flex items-start gap-3">
                      <AlertTriangle size={22} className="mt-0.5 shrink-0 text-rose-500" />
                      <div className="space-y-1">
                        <p className="text-sm font-black text-rose-700">التوزيع غير مكتمل</p>
                        <p className="text-sm font-medium text-rose-600">
                          توجد <span className="font-black text-base">{gaps.length}</span> خانة إشراف بلا مشرف. راجع جدول «بحاجة إلى إسناد» أعلاه وأسند مشرفًا لكل خانة.
                        </p>
                      </div>
                    </div>
                  )
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
    </>
  );
};

export default SupervisionScheduleBuilder;
