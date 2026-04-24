import { ModulePermission, PermissionLevel } from '../../types';

export const MODULES = [
  {
    id: 'settings',
    name: 'الإعدادات',
    submodules: [
      { id: 'settings_basic',    name: 'معلومات عامة'      },
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
      { id: 'manual',           name: 'إسناد المواد'          },
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
