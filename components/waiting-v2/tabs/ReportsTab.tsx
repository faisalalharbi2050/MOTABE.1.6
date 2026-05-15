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
  selectedDate?: string;
  onSelectedDateChange?: (date: string) => void;
  onSectionExit?: () => void;
}

const ReportsTab: React.FC<Props> = (props) => {
  return <DailyWaiting {...props} embeddedSection="reports" />;
};

export default ReportsTab;
