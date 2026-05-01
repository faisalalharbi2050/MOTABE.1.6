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
  onGoToDistribute?: () => void;
}

const RegisterTab: React.FC<Props> = ({ onGoToDistribute, ...rest }) => {
  return <DailyWaiting {...rest} embeddedSection="register" />;
};

export default RegisterTab;
