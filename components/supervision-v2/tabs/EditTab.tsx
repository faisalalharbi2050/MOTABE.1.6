import React from 'react';
import {
  SchoolInfo, Teacher, Admin, ScheduleSettingsData,
  SupervisionScheduleData,
} from '../../../types';
import SupervisionScheduleBuilder from '../../supervision/SupervisionScheduleBuilder';

interface Props {
  supervisionData: SupervisionScheduleData;
  setSupervisionData: React.Dispatch<React.SetStateAction<SupervisionScheduleData>>;
  teachers: Teacher[];
  admins: Admin[];
  scheduleSettings: ScheduleSettingsData;
  schoolInfo: SchoolInfo;
  suggestedCount: number;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const EditTab: React.FC<Props> = (props) => {
  return (
    <div id="schedule-builder-section">
      <SupervisionScheduleBuilder {...props} />
    </div>
  );
};

export default EditTab;
