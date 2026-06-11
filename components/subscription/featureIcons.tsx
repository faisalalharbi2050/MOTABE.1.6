import React from 'react';
import {
  LayoutDashboard, School, ClipboardList, CalendarDays, ShieldCheck, Shuffle, Send,
  FileSignature, Lock, Users, UserCheck, FileSpreadsheet,
} from 'lucide-react';
import { FeatureGroup } from './packages';

/* Maps a FeatureGroup.iconKey to its lucide icon. Shared between the
   pricing cards and the checkout modal so the visual language stays one. */
export const FEATURE_ICONS: Record<FeatureGroup['iconKey'], React.ElementType> = {
  dashboard:   LayoutDashboard,
  school:      School,
  assignment:  ClipboardList,
  schedule:    CalendarDays,
  supervision: ShieldCheck,
  waiting:     Shuffle,
  messaging:   Send,
  signature:   FileSignature,
  permissions: Lock,
  // Advanced (future) groups
  users:       Users,
  student:     UserCheck,
  exam:        FileSpreadsheet,
};
