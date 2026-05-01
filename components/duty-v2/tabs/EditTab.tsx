import React from 'react';
import {
  SchoolInfo, Teacher, Admin, ScheduleSettingsData,
  DutyScheduleData,
} from '../../../types';
import DutyScheduleBuilder from '../../duty/DutyScheduleBuilder';

interface Props {
  dutyData: DutyScheduleData;
  setDutyData: React.Dispatch<React.SetStateAction<DutyScheduleData>>;
  teachers: Teacher[];
  admins: Admin[];
  scheduleSettings: ScheduleSettingsData;
  schoolInfo: SchoolInfo;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const EditTab: React.FC<Props> = (props) => {
  return (
    <div id="schedule-builder-section">
      <DutyScheduleBuilder {...props} />
    </div>
  );
};

export default EditTab;
