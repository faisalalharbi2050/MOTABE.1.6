import React from 'react';
import {
  Teacher, Admin, ClassInfo, Subject, SchoolInfo, ScheduleSettingsData, Specialization,
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
  specializations?: Specialization[];
  onGoToDistribute?: () => void;
}

const RegisterTab: React.FC<Props> = ({ onGoToDistribute, ...rest }) => {
  return <DailyWaiting {...rest} embeddedSection="register" />;
};

export default RegisterTab;
