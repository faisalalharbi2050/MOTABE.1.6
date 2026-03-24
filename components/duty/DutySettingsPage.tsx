import React, { useState } from 'react';
import { ArrowRight, Users, Settings, Check, Save } from 'lucide-react';
import {
  Teacher, Admin, SchoolInfo,
  DutyStaffExclusion, DutySettings,
} from '../../types';
import DutyStaffPanel from './DutyStaffPanel';

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
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const STEPS = [
  { id: 1, title: 'الإعدادات الأساسية', icon: Settings },
  { id: 2, title: 'إعدادات المناوبين', icon: Users },
];

const DutySettingsPage: React.FC<Props> = ({
  onBack, onSave,
  teachers, admins, totalStaffCount,
  exclusions, setExclusions, settings, setSettings,
  availableCount, suggestExclude,
  schoolInfo, showToast,
}) => {
  const [activeStep, setActiveStep] = useState(1);

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {/* ══════ Page Header ══════ */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all duration-300">
        <div className="absolute top-0 right-0 w-28 h-28 bg-[#e5e1fe] rounded-bl-[3.5rem] -z-0 transition-transform group-hover:scale-110 duration-500" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Settings size={36} strokeWidth={1.8} className="text-[#655ac1]" />
            <div>
              <h3 className="text-xl font-black text-slate-800">إعدادات المناوبة اليومية</h3>
              <p className="text-slate-500 font-medium text-sm mt-0.5">
                تحديد الموظفين وخصائص المناوبة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all hover:border-[#655ac1] hover:text-[#655ac1] shrink-0"
            >
              <ArrowRight size={18} className="text-[#655ac1]" />
              <span>رجوع</span>
            </button>
            <button
              onClick={() => { onSave(); onBack(); }}
              className="flex items-center gap-2 bg-[#655ac1] hover:bg-[#5046a0] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-[#655ac1]/20 hover:scale-105 active:scale-95 shrink-0"
            >
              <Save size={18} />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══════ Horizontal Stepper ══════ */}
      <div className="bg-white rounded-[2rem] p-4 sm:p-6 shadow-sm border border-slate-100 mb-6 flex justify-center custom-scrollbar">
        <div className="flex items-center justify-between w-full max-w-lg relative">
          <div className="absolute top-1/2 left-8 right-8 h-1 bg-gray-100 -translate-y-1/2 rounded-full z-0" />
          
          <div 
            className="absolute top-1/2 right-8 h-1 bg-[#655ac1] -translate-y-1/2 rounded-full z-0 transition-all duration-500"
            style={{ width: `calc(${(activeStep - 1) / (STEPS.length - 1) * 100}% - 2rem)` }}
          />

          {STEPS.map((step) => {
            const isActive = activeStep === step.id;
            const isCompleted = activeStep > step.id;
            const Icon = step.icon;

            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className="relative z-10 flex flex-col items-center gap-2 group focus:outline-none"
              >
                <div 
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 font-bold ${
                    isActive
                      ? 'bg-[#655ac1] text-white shadow-lg shadow-[#655ac1]/30 scale-110'
                      : isCompleted
                      ? 'bg-[#e5e1fe] text-[#655ac1] hover:bg-[#8779fb] hover:text-white'
                      : 'bg-white border-2 border-gray-200 text-gray-400 hover:border-[#8779fb] hover:text-[#8779fb]'
                  }`}
                >
                  {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                </div>
                <span 
                  className={`text-sm font-bold transition-colors ${
                    isActive ? 'text-[#655ac1]' : isCompleted ? 'text-slate-700' : 'text-gray-400'
                  }`}
                >
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════ Active Step Content ══════ */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeStep === 1 && (
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
          />
        )}
        
        {activeStep === 2 && (
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
          />
        )}
      </div>

    </div>
  );
};

export default DutySettingsPage;

