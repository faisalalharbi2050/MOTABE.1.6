import React, { useState } from 'react';
import {
  Users, Settings, Bell,
  ArrowLeft, CalendarDays
} from 'lucide-react';
import {
  Teacher, Admin, SchoolInfo,
  DutyStaffExclusion, DutySettings,
} from '../../types';
import DutyStaffPanel from './DutyStaffPanel';
import DutyWeeksCard from './DutyWeeksCard';
import AcademicCalendarModal from '../dashboard/AcademicCalendarModal';

interface Props {
  onBack: () => void;
  onSave: () => void;
  teachers: Teacher[];
  admins: Admin[];
  totalStaffCount: number;
  exclusions: DutyStaffExclusion[];
  setExclusions: (excs: DutyStaffExclusion[] | ((prev: DutyStaffExclusion[]) => DutyStaffExclusion[])) => void;
  settings: DutySettings;
  setSettings: (s: DutySettings | ((prev: DutySettings) => DutySettings)) => void;
  availableCount: number;
  suggestExclude: boolean;
  schoolInfo: SchoolInfo;
  setSchoolInfo?: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

type TabId = 'calendar' | 'settings' | 'staff' | 'reminders';

const TABS: { id: TabId; title: string; icon: React.ElementType }[] = [
  { id: 'calendar',   title: 'الأسابيع الدراسية',     icon: CalendarDays },
  { id: 'settings',   title: 'الإعدادات الأساسية',  icon: Settings },
  { id: 'staff',      title: 'المناوبون',           icon: Users  },
  { id: 'reminders',  title: 'الإشعارات التلقائية', icon: Bell   },
];

const DutySettingsPage: React.FC<Props> = ({
  teachers, admins,
  exclusions, setExclusions, settings, setSettings,
  availableCount, suggestExclude,
  schoolInfo, setSchoolInfo, showToast,
}) => {
  const hasSharedSchools = (schoolInfo.sharedSchools || []).length > 0;
  const [activeTab, setActiveTab] = useState<TabId>('calendar');
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const currentSemester = schoolInfo.semesters?.find(s => s.id === schoolInfo.currentSemesterId)
    || schoolInfo.semesters?.find(s => s.isCurrent)
    || schoolInfo.semesters?.[0];
  const weeksCount = currentSemester?.weeksCount || 0;
  const hasSelectedCalendar = Boolean(schoolInfo.academicYear && currentSemester?.startDate && currentSemester?.endDate && weeksCount > 0);

  return (
    <div className="space-y-6 pb-6" dir="rtl">

      {/* ══════ Tabs + Actions ══════ */}
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

      {/* ══════ Tab Content ══════ */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300" key={activeTab}>

        {activeTab === 'calendar' && (
          <div className="relative rounded-[2rem] p-5 sm:p-6 bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-start gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center text-[#655ac1] shrink-0">
                <CalendarDays size={22} strokeWidth={2.1} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-slate-800">الأسابيع الدراسية</h3>
                <p className="text-sm font-medium text-slate-500 mt-1 leading-6">الأسابيع الدراسية التي ستوزّع فيها المناوبة اليومية.</p>
              </div>
            </div>

            <div className="space-y-4">
              {!hasSelectedCalendar ? (
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 text-center shadow-sm">
                  <CalendarDays size={34} strokeWidth={1.9} className="mx-auto mb-3 text-[#655ac1]" />
                  <p className="text-base font-black text-slate-800">لم يتم اختيار التقويم الدراسي بعد</p>
                  <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-slate-500">اختر التقويم الدراسي أولًا</p>
                  <button
                    onClick={() => setShowCalendarModal(true)}
                    className="mt-4 inline-flex items-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-[#655ac1]/20"
                  >
                    <span>اختر التقويم الدراسي</span>
                    <ArrowLeft size={14} />
                  </button>
                </div>
              ) : (
                <DutyWeeksCard
                  settings={settings}
                  setSettings={setSettings}
                  schoolInfo={schoolInfo}
                  currentSemester={currentSemester}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <DutyStaffPanel
            teachers={teachers}
            admins={admins}
            exclusions={exclusions}
            setExclusions={setExclusions}
            settings={settings}
            setSettings={setSettings}
            availableCount={availableCount}
            suggestExclude={suggestExclude}
            showToast={showToast}
            activeView="settings"
            hasSharedSchools={hasSharedSchools}
          />
        )}

        {activeTab === 'staff' && (
          <DutyStaffPanel
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
            hasSharedSchools={hasSharedSchools}
          />
        )}

        {activeTab === 'reminders' && (
          <DutyStaffPanel
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
            hasSharedSchools={hasSharedSchools}
            schoolInfo={schoolInfo}
          />
        )}

      </div>

      {/* ══════ Academic Calendar Modal ══════ */}
      {setSchoolInfo && (
        <AcademicCalendarModal
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          schoolInfo={schoolInfo}
          setSchoolInfo={setSchoolInfo}
        />
      )}

    </div>
  );
};

export default DutySettingsPage;
