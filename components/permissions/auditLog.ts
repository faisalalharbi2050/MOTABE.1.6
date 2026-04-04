import { ActionLog, LogActionType } from '../../types';

const STORAGE_KEY = 'motabe_audit_logs';
const MAX_LOGS    = 500;

export function logAction(params: {
  actionType: LogActionType;
  action: string;
  targetDelegateName?: string;
  details?: string;
}): void {
  const logs: ActionLog[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');

  const entry: ActionLog = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorName: 'المالك',
    targetDelegateName: params.targetDelegateName,
    actionType: params.actionType,
    action: params.action,
    module: 'permissions',
    timestamp: new Date().toISOString(),
    details: params.details,
  };

  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.splice(MAX_LOGS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export function getLogs(): ActionLog[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
}
