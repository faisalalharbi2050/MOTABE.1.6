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

const CreateTab: React.FC<Props> = ({
  supervisionData,
  setSupervisionData,
  teachers,
  admins,
  scheduleSettings,
  schoolInfo,
  suggestedCount,
  showToast,
}) => {
  return (
    <div className="space-y-5">
      <SupervisionScheduleBuilder
        supervisionData={supervisionData}
        setSupervisionData={setSupervisionData}
        teachers={teachers}
        admins={admins}
        scheduleSettings={scheduleSettings}
        schoolInfo={schoolInfo}
        suggestedCount={suggestedCount}
        showToast={showToast}
      />
    </div>
  );
};

export default CreateTab;
