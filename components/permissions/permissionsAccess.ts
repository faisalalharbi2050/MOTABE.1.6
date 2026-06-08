import { Delegate, ModulePermission } from '../../types';

export type PermissionAction = 'view' | 'add' | 'edit' | 'delete' | 'print' | 'export';

export type AppTabPermissionMap = Record<string, string>;

export const TAB_PERMISSION_MAP: AppTabPermissionMap = {
  settings_basic: 'settings_settings_basic',
  settings_calendar: 'settings_settings_basic',
  settings_timing: 'settings_settings_timing',
  settings_subjects: 'settings_settings_subjects',
  settings_classes: 'settings_settings_classes',
  settings_students: 'settings_settings_students',
  settings_teachers: 'settings_settings_teachers',
  settings_admins: 'settings_settings_admins',
  manual_v2: 'schedule_manual_v2',
  schedule_v3: 'schedule',
  supervision: 'supervision_duty_supervision',
  duty: 'supervision_duty_duty',
  daily_waiting: 'daily_waiting',
  messages: 'messages',
  subscription: 'subscriptions',
  support: 'support',
};

export const OWNER_ACCESS = {
  isOwner: true,
  canViewTab: () => true,
  can: () => true,
};

const getPermission = (permissions: ModulePermission[] | undefined, moduleId: string) =>
  permissions?.find((permission) => permission.moduleId === moduleId);

export function canUsePermission(
  delegate: Delegate | null | undefined,
  moduleId: string,
  action: PermissionAction = 'view'
): boolean {
  if (!delegate) return true;
  if (!delegate.isActive || delegate.isPendingSetup) return false;
  if (delegate.role === 'delegate_full') return true;

  const permission = getPermission(delegate.customPermissions, moduleId);
  if (!permission) return false;
  if (permission.level === 'full') return true;
  return permission.allowedActions?.includes(action) ?? false;
}

export function canViewTab(delegate: Delegate | null | undefined, tab: string): boolean {
  if (!delegate) return true;
  if (tab === 'dashboard') return true;
  if (tab === 'permissions') return false;

  const moduleId = TAB_PERMISSION_MAP[tab];
  if (!moduleId) return true;
  return canUsePermission(delegate, moduleId, 'view');
}
