import React, { useState } from 'react';
import { Bell, MapPin, Settings, Users } from 'lucide-react';
import {
  Teacher, Admin, SchoolInfo,
  SupervisionStaffExclusion, SupervisionSettings,
  SupervisionLocation, SupervisionPeriodConfig, SupervisionType,
} from '../../types';
import SupervisionStaffPanel from './SupervisionStaffPanel';
import SupervisionLocationsPanel from './SupervisionLocationsPanel';
import SupervisionTypesPanel from './SupervisionTypesPanel';

interface Props {
  onBack: () => void;
  onSave: () => void;
  teachers: Teacher[];
  admins: Admin[];
  totalStaffCount: number;
  exclusions: SupervisionStaffExclusion[];
  setExclusions: (excs: SupervisionStaffExclusion[] | ((prev: SupervisionStaffExclusion[]) => SupervisionStaffExclusion[])) => void;
  settings: SupervisionSettings;
  setSettings: (s: SupervisionSettings | ((prev: SupervisionSettings) => SupervisionSettings)) => void;
  availableCount: number;
  suggestExclude: boolean;
  locations: SupervisionLocation[];
  setLocations: (locs: SupervisionLocation[] | ((prev: SupervisionLocation[]) => SupervisionLocation[])) => void;
  periods: SupervisionPeriodConfig[];
  setPeriods: (p: SupervisionPeriodConfig[] | ((prev: SupervisionPeriodConfig[]) => SupervisionPeriodConfig[])) => void;
  supervisionTypes: SupervisionType[];
  setSupervisionTypes: (t: SupervisionType[] | ((prev: SupervisionType[]) => SupervisionType[])) => void;
  schoolInfo: SchoolInfo;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
  onNavigateToTiming?: () => void;
}

type TabId = 'settings' | 'locations' | 'staff' | 'reminders';

const TABS: { id: TabId; title: string; icon: React.ElementType }[] = [
  { id: 'settings', title: 'الإعدادات الأساسية', icon: Settings },
  { id: 'locations', title: 'مواعيد ومواقع الإشراف', icon: MapPin },
  { id: 'staff', title: 'المشرفون', icon: Users },
  { id: 'reminders', title: 'الإشعارات', icon: Bell },
];

const SupervisionSettingsPage: React.FC<Props> = ({
  teachers, admins,
  exclusions, setExclusions, settings, setSettings,
  availableCount, suggestExclude,
  locations, setLocations, periods, setPeriods,
  supervisionTypes, setSupervisionTypes,
  schoolInfo, showToast, onNavigateToTiming,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('settings');

  return (
    <div className="space-y-6 pb-6" dir="rtl">
      <div className="bg-white rounded-[2rem] px-4 py-3 shadow-sm border border-slate-100">
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? 'bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20 border-[#655ac1]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200 bg-white'
                }`}
              >
                <Icon size={16} />
                {tab.title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300" key={activeTab}>
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <SupervisionStaffPanel
              teachers={teachers}
              admins={admins}
              exclusions={exclusions}
              setExclusions={setExclusions}
              settings={settings}
              setSettings={setSettings}
              availableCount={availableCount}
              suggestExclude={suggestExclude}
              hasSharedSchools={(schoolInfo.sharedSchools?.length ?? 0) > 0}
              showToast={showToast}
              activeView="settings"
            />
            <SupervisionTypesPanel
              supervisionTypes={supervisionTypes}
              setSupervisionTypes={setSupervisionTypes}
              showToast={showToast}
            />
          </div>
        )}

        {activeTab === 'locations' && (
          <SupervisionLocationsPanel
            locations={locations}
            setLocations={setLocations}
            periods={periods}
            setPeriods={setPeriods}
            schoolInfo={schoolInfo}
            showToast={showToast}
            onNavigateToTiming={onNavigateToTiming}
          />
        )}

        {activeTab === 'staff' && (
          <SupervisionStaffPanel
            teachers={teachers}
            admins={admins}
            exclusions={exclusions}
            setExclusions={setExclusions}
            settings={settings}
            setSettings={setSettings}
            availableCount={availableCount}
            suggestExclude={suggestExclude}
            showToast={showToast}
            activeView="staff"
          />
        )}

        {activeTab === 'reminders' && (
          <SupervisionStaffPanel
            teachers={teachers}
            admins={admins}
            exclusions={exclusions}
            setExclusions={setExclusions}
            settings={settings}
            setSettings={setSettings}
            availableCount={availableCount}
            suggestExclude={suggestExclude}
            showToast={showToast}
            activeView="reminders"
          />
        )}
      </div>
    </div>
  );
};

export default SupervisionSettingsPage;
