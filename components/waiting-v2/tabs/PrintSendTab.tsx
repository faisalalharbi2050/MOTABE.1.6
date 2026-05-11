import React from 'react';
import {
  Teacher, Admin, ClassInfo, Subject, SchoolInfo, ScheduleSettingsData,
} from '../../../types';
import DailyWaiting from '../../DailyWaiting';

interface Props {
  teachers: Teacher[];
  admins: Admin[];
  classes: ClassInfo[];
  subjects: Subject[];
  schoolInfo: SchoolInfo;
  scheduleSettings: ScheduleSettingsData;
  onOpenMessagesArchive?: () => void;
}

const PrintSendTab: React.FC<Props> = (props) => {
  return <DailyWaiting {...props} embeddedSection="printsend" />;
};

export default PrintSendTab;
