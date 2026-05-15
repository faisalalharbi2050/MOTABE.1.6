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
  activeSchoolTab?: string;
  onGoToPrintSend?: () => void;
}

const DistributeTab: React.FC<Props> = (props) => {
  return <DailyWaiting {...props} embeddedSection="distribute" />;
};

export default DistributeTab;
