export const APP_STORAGE_KEY = 'school_assignment_v4';
export const SCHEDULE_SHARE_REQUESTS_KEY = 'schedule_share_requests_v1';
export const SCHEDULE_SIGNATURE_REQUESTS_KEY = 'schedule_signature_requests_v1';

export type ShareScheduleType =
  | 'general_teachers'
  | 'general_classes'
  | 'general_waiting'
  | 'individual_teacher'
  | 'individual_class';

export type ShareAudience = 'teachers' | 'admins' | 'guardians';

export interface ShareRecipientRecord {
  id: string;
  name: string;
  phone: string;
  role: 'teacher' | 'admin' | 'guardian';
  classId?: string;
  classLabel?: string;
  studentName?: string;
}

export interface ScheduleShareRequest {
  token: string;
  type: ShareScheduleType;
  audience: ShareAudience;
  targetId?: string;
  targetLabel: string;
  title: string;
  createdAt: string;
  schoolName?: string;
  academicYear?: string;
  semesterName?: string;
  recipients: ShareRecipientRecord[];
}

export interface ScheduleSignatureRequest {
  token: string;
  teacherId: string;
  teacherName: string;
  createdAt: string;
  status: 'pending' | 'signed';
  signedAt?: string;
  signatureData?: string;
}

const safeRead = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeWrite = <T,>(key: string, value: T[]) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const readScheduleShares = (): ScheduleShareRequest[] => safeRead<ScheduleShareRequest>(SCHEDULE_SHARE_REQUESTS_KEY);

export const saveScheduleShare = (request: ScheduleShareRequest) => {
  const requests = readScheduleShares().filter(item => item.token !== request.token);
  requests.unshift(request);
  safeWrite(SCHEDULE_SHARE_REQUESTS_KEY, requests);
};

export const readScheduleSignatureRequests = (): ScheduleSignatureRequest[] =>
  safeRead<ScheduleSignatureRequest>(SCHEDULE_SIGNATURE_REQUESTS_KEY);

export const saveScheduleSignatureRequest = (request: ScheduleSignatureRequest) => {
  const requests = readScheduleSignatureRequests().filter(item => item.token !== request.token);
  requests.unshift(request);
  safeWrite(SCHEDULE_SIGNATURE_REQUESTS_KEY, requests);
};

export const buildScheduleShareLink = (origin: string, token: string) =>
  `${origin}?scheduleShare=${encodeURIComponent(token)}`;

export const buildScheduleSignatureLink = (origin: string, token: string) =>
  `${origin}?scheduleSign=${encodeURIComponent(token)}`;
