import { ModulePermission, PermissionLevel } from '../../types';

export const MODULES = [
  {
    id: 'settings',
    name: 'الإعدادات والبيانات',
    submodules: [
      { id: 'settings_basic',    name: 'بيانات المدرسة'    },
      { id: 'settings_timing',   name: 'التوقيت'           },
      { id: 'settings_subjects', name: 'المواد'             },
      { id: 'settings_classes',  name: 'الفصول'            },
      { id: 'settings_students', name: 'الطلاب'            },
      { id: 'settings_teachers', name: 'المعلمون'          },
      { id: 'settings_admins',   name: 'الإداريون'         },
    ],
  },
  {
    id: 'schedule',
    name: 'الجدول المدرسي',
    submodules: [
      { id: 'manual_v2',   name: 'إسناد المواد'              },
      { id: 'schedule_v3', name: 'إدارة الحصص والانتظار'     },
    ],
  },
  {
    id: 'supervision_duty',
    name: 'الإشراف والمناوبة',
    submodules: [
      { id: 'supervision',     name: 'الإشراف اليومي'    },
      { id: 'duty',            name: 'المناوبة اليومية'  },
    ],
  },
  { id: 'daily_waiting', name: 'الانتظار اليومي'   },
  { id: 'messages',      name: 'الرسائل'            },
  { id: 'subscriptions', name: 'الاشتراك والفوترة'  },
  { id: 'support',       name: 'الدعم الفني'        },
];

export const ACTIONS: { id: 'view' | 'add' | 'edit' | 'delete' | 'print' | 'export'; label: string }[] = [
  { id: 'view',   label: 'عرض'    },
  { id: 'add',    label: 'إضافة'  },
  { id: 'edit',   label: 'تعديل'  },
  { id: 'delete', label: 'حذف'    },
  { id: 'print',  label: 'طباعة'  },
  { id: 'export', label: 'تصدير'  },
];

export const ALL_ACTION_IDS = ACTIONS.map(a => a.id);

export function createFullPermissions(): ModulePermission[] {
  return MODULES.flatMap(module => [
    { moduleId: module.id, level: 'full' as PermissionLevel, allowedActions: [] },
    ...(module.submodules?.map(submodule => ({
      moduleId: `${module.id}_${submodule.id}`,
      level: 'full' as PermissionLevel,
      allowedActions: [],
    })) ?? []),
  ]);
}

export function isFullPermissions(permissions?: ModulePermission[]): boolean {
  if (!permissions || permissions.length === 0) return false;

  const expected = createFullPermissions();
  const byId = new Map(permissions.map(permission => [permission.moduleId, permission]));

  return expected.every(permission => {
    const existing = byId.get(permission.moduleId);
    return !!existing && existing.level === 'full';
  });
}

export function getPermissionSummary(permissions?: ModulePermission[]): string {
  if (!permissions || permissions.length === 0) return 'لا توجد أقسام مفعلة';
  if (isFullPermissions(permissions)) return 'صلاحية كاملة';

  const mainCount = permissions.filter((permission) => !permission.moduleId.includes('_')).length;
  const customCount = permissions.filter((permission) => permission.level === 'custom').length;

  if (customCount > 0) return `${mainCount} قسم مع تخصيص إجراءات`;
  return `${mainCount} قسم مفعّل`;
}
