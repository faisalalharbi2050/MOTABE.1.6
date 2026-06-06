import React, { useState } from 'react';
import { ListTree, Sparkles, Lightbulb } from 'lucide-react';
import {
  SchoolInfo, Teacher, Admin, ScheduleSettingsData,
  SupervisionScheduleData,
} from '../../../types';
import SupervisionScheduleBuilder from '../../supervision/SupervisionScheduleBuilder';
import SupervisionTypesPanel from '../../supervision/SupervisionTypesPanel';

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

type CreateStep = 'design' | 'build';

const STEPS: { id: CreateStep; title: string; icon: React.ElementType }[] = [
  { id: 'design', title: 'تصميم الجدول', icon: ListTree },
  { id: 'build', title: 'إنشاء الجدول', icon: Sparkles },
];

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
  const [step, setStep] = useState<CreateStep>('design');

  return (
    <div className="space-y-5" dir="rtl">
      {/* ═══ شريط الخطوتين (بنفس تصميم شريط إعدادات الإشراف) ═══ */}
      <div className="bg-white rounded-[2rem] px-4 py-3 shadow-sm border border-slate-100">
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
          {STEPS.map(s => {
            const Icon = s.icon;
            const isActive = step === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? 'bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20 border-[#655ac1]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-700 border-slate-200 bg-white'
                }`}
              >
                <Icon size={16} />
                {s.title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300" key={step}>
        {step === 'design' ? (
          <div className="bg-white rounded-[2rem] p-5 sm:p-6 shadow-sm border border-slate-200">
            <SupervisionTypesPanel
              embedded
              supervisionTypes={supervisionData.supervisionTypes}
              setSupervisionTypes={updater =>
                setSupervisionData(prev => ({
                  ...prev,
                  supervisionTypes:
                    typeof updater === 'function' ? updater(prev.supervisionTypes) : updater,
                }))
              }
              showToast={showToast}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <span className="text-[11px] font-medium text-amber-800 leading-relaxed">
                الإنشاء التلقائي يوزّع إشراف الفسحة وإشراف الصلاة فقط، وأما باقي الأنواع مثل إشراف الأدوار فتظهر خاناتها فارغة للتعبئة اليدوية.
              </span>
            </div>
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
        )}
      </div>
    </div>
  );
};

export default CreateTab;
